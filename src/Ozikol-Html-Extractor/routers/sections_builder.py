"""
SectionsBuilderFromUrl Router — Modular Section-Based Extraction & Live Preview API.

Endpoints:
- POST /sections-builder-from-url/extract
    Accepts any website URL and extracts modular, classified section templates (Menu, Hero, Body, Footer, Blog),
    with class-matched scoped CSS, JS interactivity, and full page-to-section hierarchy graphs.

- GET /sections-builder-from-url/jobs/{job_id}
    Retrieves the complete extraction result payload for a given job ID.

- GET /sections-builder-from-url/preview/{job_id}/{section_id}
    Renders an independent, standalone HTML sandbox document for a single section with its scoped CSS.

- GET /sections-builder-from-url/preview-page/{job_id}/{page_slug}
    Renders a composite full-page preview assembled from all sections linked to that page.
"""

import logging
from typing import Dict, Optional
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import HTMLResponse

from models.schemas import (
    DiscoverPagesRequest,
    DiscoverPagesResponse,
    DiscoveredPageSummaryItem,
    RawAssetsInspectRequest,
    RawAssetsInspectResponse,
    SectionsBuilderRequest,
    SectionsBuilderFromSourceRequest,
    SectionsBuilderResponse,
    SliceAndScopeRequest,
)
from pipeline.page_crawler import discover_menu_pages_only
from pipeline.preview_builder import (
    build_standalone_page_html,
    build_standalone_section_html,
)
from pipeline.suite_grouper import (
    run_raw_assets_inspect_pipeline,
    run_sections_builder_pipeline,
    run_sections_builder_from_source_pipeline,
    run_slice_and_scope_pipeline,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/sections-builder-from-url",
    tags=["Sections Builder"]
)

# In-memory store for active extraction jobs and preview rendering
SECTIONS_BUILDER_STORE: Dict[str, SectionsBuilderResponse] = {}


# ---------------------------------------------------------------------------
# POST /sections-builder-from-url/discover-pages (Step 1 of 2-Step Flow)
# ---------------------------------------------------------------------------

@router.post(
    "/discover-pages",
    response_model=DiscoverPagesResponse,
    summary="Discover Menu Pages from Website URL",
    description=(
        "Rapidly crawls only the top navigation bar and header menu to discover all internal pages "
        "and subpage links, allowing the administrator to inspect and select specific pages before section extraction."
    )
)
async def discover_menu_pages(body: DiscoverPagesRequest) -> DiscoverPagesResponse:
    """
    Fast discovery endpoint returning all page links in the site's navigation menu.
    """
    url = str(body.url).strip()
    if not url.startswith(("http://", "https://")):
        raise HTTPException(
            status_code=400,
            detail="Target URL must start with http:// or https://"
        )

    try:
        pages_raw = await discover_menu_pages_only(url)
        items = [
            DiscoveredPageSummaryItem(
                title=p["title"],
                slug=p["slug"],
                url=p["url"],
                is_home=p.get("is_home", False),
                menu_sort_order=p.get("menu_sort_order", 10)
            )
            for p in pages_raw
        ]
        return DiscoverPagesResponse(
            source_url=url,
            total_pages=len(items),
            pages=items,
            message=f"Discovered {len(items)} pages in navigation menu."
        )
    except Exception as exc:
        logger.error("Error discovering menu pages for '%s': %s", url, exc)
        raise HTTPException(
            status_code=502,
            detail=f"Failed to crawl website navigation menu: {exc}"
        )


# ---------------------------------------------------------------------------
# POST /sections-builder-from-url/extract (Step 2 of 2-Step Flow)
# ---------------------------------------------------------------------------

@router.post(
    "/extract",
    response_model=SectionsBuilderResponse,
    summary="Extract Modular Section Templates from URL",
    description=(
        "Crawls a webpage and selected menu-linked subpages, decomposes the DOM into modular "
        "classified sections (Navigation, Hero Sliders, Body Features, Footers, Blogs, Breadcrumbs), "
        "extracts isolated scoped CSS and JS matching only the classes used in each section, "
        "and returns a unified suite package with page-to-section relationship graphs."
    )
)
async def extract_sections_from_url(body: SectionsBuilderRequest) -> SectionsBuilderResponse:
    """
    Main extraction endpoint.
    
    :param body: Request payload containing the target URL, suite name, brand name, and crawl depth.
    :returns: SectionsBuilderResponse with all extracted sections, discovered pages, and scoped CSS.
    """
    url = str(body.url).strip()
    if not url.startswith(("http://", "https://")):
        raise HTTPException(
            status_code=400,
            detail="Invalid URL format. URL must start with http:// or https://"
        )

    try:
        response = await run_sections_builder_pipeline(body)
        SECTIONS_BUILDER_STORE[response.job_id] = response
        return response
    except Exception as exc:
        logger.exception("SectionsBuilder extraction failed for '%s'", url)
        raise HTTPException(status_code=500, detail=str(exc))


# ---------------------------------------------------------------------------
# POST /sections-builder-from-url/extract-from-source (Instant Page Source Mode)
# ---------------------------------------------------------------------------

@router.post(
    "/extract-from-source",
    response_model=SectionsBuilderResponse,
    summary="Extract Modular Section Templates from Raw HTML Page Source",
    description=(
        "Instantly slices raw HTML page source (from View Source / Ctrl+U) into classified modular sections "
        "with scoped CSS in < 0.2s without requiring headless browser crawling or triggering anti-bot challenges."
    )
)
async def extract_sections_from_source(body: SectionsBuilderFromSourceRequest) -> SectionsBuilderResponse:
    """
    Direct page source extraction endpoint.
    
    :param body: Request payload containing the raw HTML source, optional base URL, and suite name.
    :returns: SectionsBuilderResponse with all extracted sections, pages, and scoped CSS.
    """
    if not body.html_source or not body.html_source.strip():
        raise HTTPException(
            status_code=400,
            detail="HTML page source cannot be empty."
        )

    try:
        response = await run_sections_builder_from_source_pipeline(body)
        SECTIONS_BUILDER_STORE[response.job_id] = response
        return response
    except Exception as exc:
        logger.exception("SectionsBuilder page source extraction failed")
        raise HTTPException(status_code=500, detail=str(exc))


# ---------------------------------------------------------------------------
# POST /sections-builder-from-url/inspect-assets (Step 2: Workbench Inspector)
# ---------------------------------------------------------------------------

@router.post(
    "/inspect-assets",
    response_model=RawAssetsInspectResponse,
    summary="Step 2: Fetch and Inspect Raw Code & Assets",
    description=(
        "Downloads all external CSS stylesheets, scripts, and fonts referenced in the HTML page source "
        "and returns them with individual file metadata (name, URL, size, and content) for inspection."
    )
)
async def inspect_raw_assets(body: RawAssetsInspectRequest) -> RawAssetsInspectResponse:
    """
    Step 2 Workbench endpoint.
    """
    if not body.html_source or not body.html_source.strip():
        raise HTTPException(status_code=400, detail="HTML page source cannot be empty.")

    try:
        return await run_raw_assets_inspect_pipeline(body)
    except Exception as exc:
        logger.exception("Raw asset inspection failed")
        raise HTTPException(status_code=500, detail=str(exc))


# ---------------------------------------------------------------------------
# POST /sections-builder-from-url/slice-and-scope (Step 3 & 4: Slicer & Scoper)
# ---------------------------------------------------------------------------

@router.post(
    "/slice-and-scope",
    response_model=SectionsBuilderResponse,
    summary="Step 3 & 4: Slice Modular Sections with Precision Scoped CSS",
    description=(
        "Slices confirmed/edited HTML source and stylesheets into modular sections, computing precision "
        "scoped CSS, font CDN imports, and interactive JS for live sandbox preview."
    )
)
async def slice_and_scope_sections(body: SliceAndScopeRequest) -> SectionsBuilderResponse:
    """
    Step 3 & 4 Slicing and scoping endpoint.
    """
    if not body.html_source or not body.html_source.strip():
        raise HTTPException(status_code=400, detail="HTML page source cannot be empty.")

    try:
        response = await run_slice_and_scope_pipeline(body)
        SECTIONS_BUILDER_STORE[response.job_id] = response
        return response
    except Exception as exc:
        logger.exception("Slice and scope execution failed")
        raise HTTPException(status_code=500, detail=str(exc))


# ---------------------------------------------------------------------------
# GET /sections-builder-from-url/jobs/{job_id}
# ---------------------------------------------------------------------------

@router.get(
    "/jobs/{job_id}",
    response_model=SectionsBuilderResponse,
    summary="Get Section Extraction Job Result",
    description="Retrieves the structured extraction response and sections graph for a previously processed job."
)
async def get_sections_builder_job(job_id: str) -> SectionsBuilderResponse:
    """
    Retrieves stored extraction results.
    
    :param job_id: Unique job identifier.
    :returns: The complete SectionsBuilderResponse.
    """
    job = SECTIONS_BUILDER_STORE.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Extraction job '{job_id}' not found.")
    return job


# ---------------------------------------------------------------------------
# GET /sections-builder-from-url/preview/{job_id}/{section_id}
# ---------------------------------------------------------------------------

@router.get(
    "/preview/{job_id}/{section_id}",
    response_class=HTMLResponse,
    summary="Live Standalone Section Preview Sandbox",
    description=(
        "Renders an independent, self-contained HTML5 sandbox document for a single section. "
        "Runs completely isolated with its own scoped CSS, web fonts, icon suites, and interactive JS."
    )
)
async def preview_single_section(
    job_id: str,
    section_id: str,
    dark_mode: bool = Query(False, description="Preview on dark canvas background")
) -> HTMLResponse:
    """
    Renders an isolated preview for a single section template.
    
    :param job_id: Job identifier containing the extracted section.
    :param section_id: Unique section identifier (e.g. sec_menu_..., sec_body_...).
    :param dark_mode: Optional boolean to toggle dark canvas preview.
    :returns: Standalone HTML5 document with scoped styles.
    """
    job = SECTIONS_BUILDER_STORE.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Extraction job '{job_id}' not found.")

    target_section = next((s for s in job.sections if s.id == section_id), None)
    if not target_section:
        raise HTTPException(status_code=404, detail=f"Section '{section_id}' not found in job '{job_id}'.")

    # Collect font URLs from code injections
    font_urls = [
        tag.content.split('href="')[1].split('"')[0]
        for tag in job.code_injections
        if 'href="' in tag.content
    ]

    html_document = build_standalone_section_html(
        section_html=target_section.html_template,
        scoped_css=target_section.scoped_css,
        js_script=target_section.js_script,
        page_title=f"{target_section.name} - Live Preview",
        external_fonts=font_urls,
        dark_mode=dark_mode
    )

    return HTMLResponse(content=html_document, status_code=200)


# ---------------------------------------------------------------------------
# GET /sections-builder-from-url/preview-page/{job_id}/{page_slug}
# ---------------------------------------------------------------------------

@router.get(
    "/preview-page/{job_id}/{page_slug}",
    response_class=HTMLResponse,
    summary="Live Composite Page Preview Sandbox",
    description=(
        "Renders a full composite page preview assembled from all modular sections "
        "assigned to that specific page slug in order."
    )
)
async def preview_composite_page(job_id: str, page_slug: str) -> HTMLResponse:
    """
    Renders a composite multi-section page preview.
    
    :param job_id: Job identifier.
    :param page_slug: The slug of the page to preview (e.g. 'home', 'about', 'services').
    :returns: Standalone composite HTML5 document.
    """
    job = SECTIONS_BUILDER_STORE.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Extraction job '{job_id}' not found.")

    target_page = next((p for p in job.pages if p.slug == page_slug), None)
    if not target_page:
        raise HTTPException(status_code=404, detail=f"Page '{page_slug}' not found in job '{job_id}'.")

    # Resolve ordered sections for this page
    section_map = {s.id: s for s in job.sections}
    page_sections = [
        section_map[sid].model_dump()
        for sid in target_page.section_ids
        if sid in section_map
    ]

    if not page_sections:
        raise HTTPException(status_code=400, detail=f"No sections linked to page '{page_slug}'.")

    font_urls = [
        tag.content.split('href="')[1].split('"')[0]
        for tag in job.code_injections
        if 'href="' in tag.content
    ]

    html_document = build_standalone_page_html(
        sections_list=page_sections,
        page_title=f"{target_page.title} - Full Page Preview",
        external_fonts=font_urls
    )

    return HTMLResponse(content=html_document, status_code=200)
