"""
Suite Grouper & Section Extraction Coordinator.

Coordinates the multi-page crawling, section slicing, class-based CSS scoping,
Mustache token debranding, and relationship graph construction for the
SectionsBuilder API.
"""

import logging
import re
import uuid
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse

from models.schemas import (
    DiscoveredPageItem,
    ExtractedSectionItem,
    ImportableTagItem,
    JobStatus,
    RawAssetItem,
    RawAssetsInspectRequest,
    RawAssetsInspectResponse,
    SectionsBuilderRequest,
    SectionsBuilderFromSourceRequest,
    SectionsBuilderResponse,
    SliceAndScopeRequest,
)
from pipeline.css_extractor import extract_scoped_css_for_section, _split_css_top_level_blocks
from pipeline.page_crawler import (
    crawl_website_and_discover_pages,
    fetch_stylesheets_authenticated,
    fetch_stylesheets_detailed,
)
from pipeline.section_slicer import slice_page_into_sections
from bs4 import BeautifulSoup
from urllib.parse import urljoin
import httpx

logger = logging.getLogger(__name__)


async def run_sections_builder_pipeline(
    request: SectionsBuilderRequest,
    job_id: Optional[str] = None
) -> SectionsBuilderResponse:
    """
    Executes the end-to-end section-based website extraction pipeline.

    :param request: The extraction configuration (URL, suite name, brand name, crawl options).
    :param job_id: Optional tracking identifier.
    :returns: A complete SectionsBuilderResponse containing modular sections, pages, scoped CSS, and graph.
    """
    active_job_id = job_id or f"sb_{uuid.uuid4().hex[:10]}"
    url = str(request.url).strip()

    # Determine Group Code and Suite Name
    parsed = urlparse(url)
    domain_clean = re.sub(r'[^a-zA-Z0-9]', '_', parsed.netloc.replace("www.", "")).lower().strip('_')
    group_code = f"suite_{domain_clean}" if domain_clean else "suite_extracted"
    suite_name = request.suite_name or f"{domain_clean.replace('_', ' ').title()} Suite"
    brand_name = request.brand_name or "Enterprise Workspace"

    logger.info("Starting SectionsBuilder pipeline for '%s' (Suite: %s, Group: %s)", url, suite_name, group_code)

    # 1. Crawl Homepage and Discover Subpages
    discovered_pages_raw, combined_css, external_fonts = await crawl_website_and_discover_pages(
        start_url=url,
        max_subpages=request.max_subpages if request.crawl_subpages else 0,
        allowed_urls=request.selected_page_urls
    )

    all_sections: List[ExtractedSectionItem] = []
    discovered_pages: List[DiscoveredPageItem] = []
    seen_variant_codes: Dict[str, str] = {}  # variant_code -> section_id (to share Nav/Footer across pages)

    category_counts: Dict[str, int] = {
        "menu": 0, "hero": 0, "body": 0, "footer": 0, "blog": 0, "ecommerce": 0, "breadcrumb": 0
    }

    # Pre-parse CSS structures once for ultra-fast section scoping across all pages
    pre_split_blocks = _split_css_top_level_blocks(combined_css) if combined_css else []
    pre_font_faces: List[str] = []
    pre_root_vars: List[str] = []
    if combined_css:
        pre_font_faces = re.findall(r'@font-face\s*\{[^}]+\}', combined_css, re.DOTALL | re.IGNORECASE)
        root_matches = re.findall(r'(?::root|html|body)\s*\{([^}]+)\}', combined_css, re.DOTALL | re.IGNORECASE)
        for r_content in root_matches:
            var_lines = [line.strip() for line in r_content.split(';') if '--' in line and ':' in line]
            if var_lines:
                pre_root_vars.extend(var_lines)

    # 2. Iterate through each page and slice into sections
    for page_dict in discovered_pages_raw:
        p_slug = page_dict["slug"]
        p_title = page_dict["title"]
        p_html = page_dict["html"]
        p_url = page_dict["url"]

        page_section_ids: List[str] = []

        # Slice DOM into section dictionaries
        raw_sections = slice_page_into_sections(
            html_content=p_html,
            page_url=p_url,
            page_slug=p_slug,
            page_title=p_title
        )

        for sec in raw_sections:
            cat_key = sec["category_key"]
            base_variant = sec["variant_code"]

            # Deduplicate global singleton sections (Nav & Footer) so they are shared across pages
            if cat_key in ("menu", "footer") and base_variant in seen_variant_codes:
                shared_sec_id = seen_variant_codes[base_variant]
                if shared_sec_id not in page_section_ids:
                    page_section_ids.append(shared_sec_id)
                # Link parent slug
                for existing in all_sections:
                    if existing.id == shared_sec_id and p_slug not in existing.parent_page_slugs:
                        existing.parent_page_slugs.append(p_slug)
                continue

            # Generate unique variant code if duplicate exists within body/hero
            variant_code = base_variant
            if variant_code in seen_variant_codes and cat_key not in ("menu", "footer"):
                variant_code = f"{base_variant}_{uuid.uuid4().hex[:4]}"

            sec_id = sec["id"]
            seen_variant_codes[variant_code] = sec_id
            page_section_ids.append(sec_id)

            # 3. Extract Scoped CSS for this section from the full CSS corpus
            raw_node = sec.get("raw_node")
            scoped_css = ""
            if raw_node:
                scoped_css = extract_scoped_css_for_section(
                    raw_node, 
                    combined_css,
                    pre_split_blocks=pre_split_blocks,
                    pre_extracted_root_vars=pre_root_vars,
                    pre_extracted_font_faces=pre_font_faces
                )

            # 4. Tokenize & Debrand Section HTML
            tokenized_html = _tokenize_section_html(sec["html_template"], cat_key, brand_name)

            # Generate mock sample content for preview
            sample_content = _generate_sample_content(cat_key, sec["name"], brand_name)

            # Create ExtractedSectionItem
            section_item = ExtractedSectionItem(
                id=sec_id,
                category_key=cat_key,
                variant_code=variant_code,
                name=sec["name"],
                label=sec["label"],
                description=sec["description"],
                dom_tag=sec["dom_tag"],
                html_template=tokenized_html,
                scoped_css=scoped_css,
                js_script=_extract_inline_interactions(tokenized_html, cat_key),
                sample_content_json=sample_content,
                preview_icon=sec["preview_icon"],
                thumbnail_gradient=sec["thumbnail_gradient"],
                parent_page_slugs=[p_slug],
                sort_order=sec["sort_order"]
            )

            all_sections.append(section_item)
            category_counts[cat_key] = category_counts.get(cat_key, 0) + 1

        discovered_pages.append(DiscoveredPageItem(
            title=p_title,
            slug=p_slug,
            url=p_url,
            is_home=page_dict["is_home"],
            menu_sort_order=page_dict["menu_sort_order"],
            section_ids=page_section_ids
        ))

    # 5. Build Global Code Injections
    code_injections: List[ImportableTagItem] = []
    if request.include_code_injections:
        # Font imports
        for font_url in external_fonts:
            tag_type = "google_fonts" if "fonts.googleapis" in font_url else "link_stylesheet"
            code_injections.append(ImportableTagItem(
                name=f"Web Font ({font_url.split('/')[-1][:20]})",
                zone="head",
                tag_type=tag_type,
                content=f'<link rel="stylesheet" href="{font_url}">',
                sort_order=10
            ))

        # Default standard typography fallback injection
        code_injections.append(ImportableTagItem(
            name="Inter Typography & Icons",
            zone="head",
            tag_type="google_fonts",
            content='<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />',
            sort_order=5
        ))

    logger.info(
        "SectionsBuilder pipeline finished: %d sections, %d pages extracted across suite '%s'",
        len(all_sections), len(discovered_pages), suite_name
    )

    return SectionsBuilderResponse(
        job_id=active_job_id,
        status=JobStatus.COMPLETE,
        group_code=group_code,
        suite_name=suite_name,
        source_url=url,
        total_sections=len(all_sections),
        total_pages=len(discovered_pages),
        pages=discovered_pages,
        sections=all_sections,
        code_injections=code_injections,
        category_breakdown=category_counts,
        message=f"Successfully extracted {len(all_sections)} modular section templates across {len(discovered_pages)} pages."
    )


async def run_sections_builder_from_source_pipeline(
    request: SectionsBuilderFromSourceRequest,
    job_id: Optional[str] = None
) -> SectionsBuilderResponse:
    """
    Executes instant section slicing and CSS scoping directly from raw HTML page source.
    Bypasses headless browser crawling, ensuring zero latency and 100% immunity to anti-bot challenges.
    """
    active_job_id = job_id or f"sb_src_{uuid.uuid4().hex[:10]}"
    raw_html = request.html_source or ""
    # Sanitize any markdown-formatted link snippets (e.g. href="[assets/css/style.css](https://...)")
    html_source = re.sub(r'\[([^\]]*)\]\((https?://[^\)]+)\)', r'\2', raw_html)
    base_url = (request.base_url or "https://source.local").strip()
    brand_name = request.brand_name or "Enterprise Workspace"

    # 1. Parse DOM and discover page meta
    soup = BeautifulSoup(html_source, "lxml")
    title_tag = soup.find("title")
    extracted_title = title_tag.get_text().strip() if title_tag else "Custom Page"
    page_title = request.page_title or extracted_title
    page_slug = request.page_slug or re.sub(r'[^a-zA-Z0-9]+', '-', page_title.lower()).strip('-') or "home"

    parsed_base = urlparse(base_url)
    clean_host = parsed_base.netloc.replace("www.", "").split(".")[0].upper() if parsed_base.netloc else "SOURCE"
    group_code = f"SUITE_{clean_host}_{uuid.uuid4().hex[:4].upper()}"
    suite_name = request.suite_name or f"{clean_host.title()} Source Suite"

    logger.info("Starting SectionsBuilderFromSource for slug '%s' (Suite: %s)", page_slug, suite_name)

    # 2. Collect CSS from inline <style>, custom_css, and remote stylesheets
    css_snippets: List[str] = []
    if request.custom_css:
        css_snippets.append(request.custom_css)

    for style_tag in soup.find_all("style"):
        if style_tag.string:
            css_snippets.append(style_tag.string)

    external_fonts: List[str] = []
    stylesheet_links: List[str] = []
    for link in soup.find_all("link", rel=True):
        rel = link.get("rel")
        rel_str = " ".join(rel).lower() if isinstance(rel, list) else str(rel).lower()
        href = link.get("href", "").strip()
        if not href:
            continue
        abs_href = urljoin(base_url, href)
        if "fonts.googleapis.com" in abs_href or "use.typekit.net" in abs_href or "cdnjs.cloudflare.com/ajax/libs/font-awesome" in abs_href:
            external_fonts.append(abs_href)
            continue
        if "stylesheet" in rel_str:
            stylesheet_links.append(abs_href)

    if request.css_urls:
        for c_url in request.css_urls:
            if c_url not in stylesheet_links:
                stylesheet_links.append(c_url)

    # Download external stylesheets with session authentication to bypass anti-bot / Cloudflare 403 blocks
    if stylesheet_links and (base_url.startswith("http") or any(s.startswith("http") for s in stylesheet_links)):
        try:
            downloaded = await fetch_stylesheets_authenticated(base_url, stylesheet_links)
            if downloaded:
                css_snippets.extend(downloaded)
        except Exception as exc:
            logger.warning("Authenticated stylesheet download warning: %s", exc)

    combined_css = "\n\n".join(css_snippets)

    # Pre-parse CSS structures once
    pre_split_blocks = _split_css_top_level_blocks(combined_css) if combined_css else []
    pre_font_faces: List[str] = []
    pre_root_vars: List[str] = []
    if combined_css:
        pre_font_faces = re.findall(r'@font-face\s*\{[^}]+\}', combined_css, re.DOTALL | re.IGNORECASE)
        root_matches = re.findall(r'(?::root|html|body)\s*\{([^}]+)\}', combined_css, re.DOTALL | re.IGNORECASE)
        for r_content in root_matches:
            var_lines = [line.strip() for line in r_content.split(';') if '--' in line and ':' in line]
            if var_lines:
                pre_root_vars.extend(var_lines)

    # 3. Slice HTML into modular sections
    raw_sections = slice_page_into_sections(
        html_content=html_source,
        page_url=base_url,
        page_slug=page_slug,
        page_title=page_title
    )

    all_sections: List[ExtractedSectionItem] = []
    category_counts: Dict[str, int] = {
        "menu": 0, "hero": 0, "body": 0, "footer": 0, "blog": 0, "ecommerce": 0, "breadcrumb": 0
    }
    seen_variants: Set[str] = set()
    section_ids: List[str] = []

    for sec in raw_sections:
        cat_key = sec["category_key"]
        base_variant = sec["variant_code"]
        variant_code = base_variant
        if variant_code in seen_variants:
            variant_code = f"{base_variant}_{uuid.uuid4().hex[:4]}"
        seen_variants.add(variant_code)

        sec_id = sec["id"]
        section_ids.append(sec_id)
        category_counts[cat_key] = category_counts.get(cat_key, 0) + 1

        # Extract Scoped CSS
        raw_node = sec.get("raw_node")
        scoped_css = ""
        if raw_node:
            scoped_css = extract_scoped_css_for_section(
                raw_node,
                combined_css,
                pre_split_blocks=pre_split_blocks,
                pre_extracted_root_vars=pre_root_vars,
                pre_extracted_font_faces=pre_font_faces
            )

        tokenized_html = _tokenize_section_html(sec["html_template"], cat_key, brand_name)
        sample_content = _generate_sample_content(cat_key, sec["name"], brand_name)

        section_item = ExtractedSectionItem(
            id=sec_id,
            category_key=cat_key,
            variant_code=variant_code,
            name=sec["name"],
            label=sec["label"],
            description=sec["description"],
            dom_tag=sec["dom_tag"],
            html_template=tokenized_html,
            scoped_css=scoped_css,
            js_script=_extract_inline_interactions(tokenized_html, cat_key),
            sample_content_json=sample_content,
            preview_icon=sec["preview_icon"],
            thumbnail_gradient=sec["thumbnail_gradient"],
            parent_page_slugs=[page_slug],
            sort_order=sec["sort_order"]
        )
        all_sections.append(section_item)

    discovered_page = DiscoveredPageItem(
        title=page_title,
        slug=page_slug,
        url=base_url,
        is_home=True,
        menu_sort_order=10,
        section_ids=section_ids
    )

    code_injections: List[ImportableTagItem] = []
    if request.include_code_injections:
        for font_url in list(dict.fromkeys(external_fonts)):
            code_injections.append(ImportableTagItem(
                id=f"font_{uuid.uuid4().hex[:6]}",
                tag_type="link",
                html=f'<link rel="stylesheet" href="{font_url}" />',
                placement="head",
                purpose="typography"
            ))

    return SectionsBuilderResponse(
        job_id=active_job_id,
        status=JobStatus.COMPLETE,
        group_code=group_code,
        suite_name=suite_name,
        source_url=base_url,
        total_sections=len(all_sections),
        total_pages=1,
        pages=[discovered_page],
        sections=all_sections,
        code_injections=code_injections,
        category_breakdown=category_counts,
        message=f"Successfully extracted {len(all_sections)} modular section templates directly from page source in < 0.2s."
    )


async def run_raw_assets_inspect_pipeline(
    request: RawAssetsInspectRequest,
    job_id: Optional[str] = None
) -> RawAssetsInspectResponse:
    """
    Step 2: Fetches and inspects all raw HTML markup, external CSS stylesheets,
    JavaScript files, and typography fonts for the Code & Asset Workbench.
    """
    active_job_id = job_id or f"sb_insp_{uuid.uuid4().hex[:10]}"
    raw_html = request.html_source or ""
    html_source = re.sub(r'\[([^\]]*)\]\((https?://[^\)]+)\)', r'\2', raw_html)
    base_url = (request.base_url or "").strip()

    # Auto-extract original base URL from browser "saved from url" comment if missing or relative
    saved_url_match = re.search(r'<!--\s*saved from url=\(\d+\)(https?://[^\s>]+)\s*-->', raw_html, re.I)
    if saved_url_match:
        extracted_saved_url = saved_url_match.group(1).strip()
        if not base_url or base_url.startswith("https://source.local") or "source.local" in base_url:
            base_url = extracted_saved_url
        logger.info("Auto-detected browser saved-from URL: %s", extracted_saved_url)

    if not base_url:
        base_url = "https://source.local"

    brand_name = request.brand_name or "Enterprise Workspace"
    suite_name = request.suite_name or "Inspected Suite"

    soup = BeautifulSoup(html_source, "lxml")
    title_tag = soup.find("title")
    extracted_title = title_tag.get_text().strip() if title_tag else "Custom Page"
    page_slug = re.sub(r'[^a-zA-Z0-9]+', '-', extracted_title.lower()).strip('-') or "home"

    # 1. Discover external stylesheets and fonts
    external_fonts: List[str] = []
    stylesheet_links: List[str] = []
    for link in soup.find_all("link", rel=True):
        rel = link.get("rel")
        rel_str = " ".join(rel).lower() if isinstance(rel, list) else str(rel).lower()
        href = link.get("href", "").strip()
        if not href:
            continue
        abs_href = urljoin(base_url, href)
        if "fonts.googleapis.com" in abs_href or "use.typekit.net" in abs_href or "cdnjs.cloudflare.com/ajax/libs/font-awesome" in abs_href:
            if abs_href not in external_fonts:
                external_fonts.append(abs_href)
            continue
        if "stylesheet" in rel_str and abs_href not in stylesheet_links:
            stylesheet_links.append(abs_href)

    # 2. Download external stylesheets with detailed metadata
    raw_stylesheets: List[RawAssetItem] = []
    if stylesheet_links and (base_url.startswith("http") or any(s.startswith("http") for s in stylesheet_links)):
        try:
            detailed = await fetch_stylesheets_detailed(base_url, stylesheet_links)
            for item in detailed:
                raw_stylesheets.append(RawAssetItem(
                    name=item["name"],
                    url=item["url"],
                    asset_type="css",
                    size_kb=item["size_kb"],
                    content=item["content"]
                ))
        except Exception as exc:
            logger.warning("Detailed stylesheet download warning: %s", exc)

    # 3. Include inline <style> tags
    inline_idx = 1
    for style_tag in soup.find_all("style"):
        style_text = style_tag.string or ""
        if style_text.strip():
            raw_stylesheets.append(RawAssetItem(
                name=f"inline-style-{inline_idx}.css",
                url="",
                asset_type="css",
                size_kb=round(len(style_text.encode('utf-8')) / 1024, 1),
                content=style_text
            ))
            inline_idx += 1

    # 4. Discover remote & inline scripts
    raw_scripts: List[RawAssetItem] = []
    script_idx = 1
    for script_tag in soup.find_all("script"):
        src = script_tag.get("src", "").strip()
        if src:
            abs_src = urljoin(base_url, src)
            file_name = abs_src.split('/')[-1].split('?')[0] or f"script-{script_idx}.js"
            raw_scripts.append(RawAssetItem(
                name=file_name,
                url=abs_src,
                asset_type="js",
                size_kb=0.0,
                content=f"// Remote Script: {abs_src}"
            ))
            script_idx += 1
        elif script_tag.string and script_tag.string.strip():
            script_text = script_tag.string.strip()
            raw_scripts.append(RawAssetItem(
                name=f"inline-script-{script_idx}.js",
                url="",
                asset_type="js",
                size_kb=round(len(script_text.encode('utf-8')) / 1024, 1),
                content=script_text
            ))
            script_idx += 1

    total_css_kb = sum(s.size_kb for s in raw_stylesheets)
    total_js_kb = sum(s.size_kb for s in raw_scripts)

    return RawAssetsInspectResponse(
        job_id=active_job_id,
        base_url=base_url,
        suite_name=suite_name,
        brand_name=brand_name,
        page_title=extracted_title,
        page_slug=page_slug,
        html_source=html_source,
        stylesheets=raw_stylesheets,
        scripts=raw_scripts,
        fonts=external_fonts,
        total_css_kb=round(total_css_kb, 1),
        total_js_kb=round(total_js_kb, 1),
        message=f"Successfully fetched {len(raw_stylesheets)} stylesheets ({round(total_css_kb, 1)} KB) and {len(raw_scripts)} scripts."
    )


async def run_slice_and_scope_pipeline(
    request: SliceAndScopeRequest,
    job_id: Optional[str] = None
) -> SectionsBuilderResponse:
    """
    Step 3 & 4: Slices confirmed/edited HTML source and stylesheets into modular
    sections with precision scoped CSS, font CDN imports, and sandboxed JS scripts.
    """
    active_job_id = job_id or f"sb_slice_{uuid.uuid4().hex[:10]}"
    raw_html = request.html_source or ""
    html_source = re.sub(r'\[([^\]]*)\]\((https?://[^\)]+)\)', r'\2', raw_html)
    base_url = (request.base_url or "https://source.local").strip()
    brand_name = request.brand_name or "Enterprise Workspace"
    suite_name = request.suite_name or "Source Suite"
    page_title = request.page_title or "Custom Page"
    page_slug = request.page_slug or "custom-page"

    # Assemble full CSS corpus from combined_css, stylesheets list, and custom_css
    css_pieces: List[str] = []
    if request.combined_css:
        css_pieces.append(request.combined_css)
    if request.stylesheets:
        for s in request.stylesheets:
            if s.content:
                css_pieces.append(s.content)
    if request.custom_css:
        css_pieces.append(request.custom_css)

    full_css = "\n\n".join(css_pieces)

    # Delegate to section slicer and precision CSS extractor
    raw_sections = slice_page_into_sections(
        html_content=html_source,
        page_url=base_url,
        page_slug=page_slug,
        page_title=page_title
    )

    # Pre-parse CSS structures once
    pre_split_blocks = _split_css_top_level_blocks(full_css) if full_css else []
    pre_font_faces: List[str] = []
    pre_root_vars: List[str] = []
    if full_css:
        pre_font_faces = re.findall(r'@font-face\s*\{[^}]+\}', full_css, re.DOTALL | re.IGNORECASE)
        root_matches = re.findall(r'(?::root|html|body)\s*\{([^}]+)\}', full_css, re.DOTALL | re.IGNORECASE)
        for r_content in root_matches:
            var_lines = [line.strip() for line in r_content.split(';') if '--' in line and ':' in line]
            if var_lines:
                pre_root_vars.extend(var_lines)

    all_sections: List[ExtractedSectionItem] = []
    category_counts: Dict[str, int] = {
        "menu": 0, "hero": 0, "body": 0, "footer": 0, "blog": 0, "ecommerce": 0, "breadcrumb": 0
    }
    seen_variants: set[str] = set()
    section_ids: List[str] = []

    for sec in raw_sections:
        cat_key = sec["category_key"]
        base_variant = sec["variant_code"]
        variant_code = base_variant
        if variant_code in seen_variants:
            variant_code = f"{base_variant}_{uuid.uuid4().hex[:4]}"
        seen_variants.add(variant_code)

        sec_id = sec["id"]
        section_ids.append(sec_id)
        category_counts[cat_key] = category_counts.get(cat_key, 0) + 1

        raw_node = sec.get("raw_node")
        scoped_css = ""
        if raw_node:
            scoped_css = extract_scoped_css_for_section(
                raw_node,
                full_css,
                pre_split_blocks=pre_split_blocks,
                pre_extracted_root_vars=pre_root_vars,
                pre_extracted_font_faces=pre_font_faces
            )

        tokenized_html = _tokenize_section_html(sec["html_template"], cat_key, brand_name)
        sample_content = _generate_sample_content(cat_key, sec["name"], brand_name)

        section_item = ExtractedSectionItem(
            id=sec_id,
            category_key=cat_key,
            variant_code=variant_code,
            name=sec["name"],
            label=sec["label"],
            description=sec["description"],
            dom_tag=sec["dom_tag"],
            html_template=tokenized_html,
            scoped_css=scoped_css,
            js_script=_extract_inline_interactions(tokenized_html, cat_key),
            sample_content_json=sample_content,
            preview_icon=sec["preview_icon"],
            thumbnail_gradient=sec["thumbnail_gradient"],
            parent_page_slugs=[page_slug],
            sort_order=sec["sort_order"]
        )
        all_sections.append(section_item)

    parsed_base = urlparse(base_url)
    clean_host = parsed_base.netloc.replace("www.", "").split(".")[0].upper() if parsed_base.netloc else "SOURCE"
    group_code = f"SUITE_{clean_host}_{uuid.uuid4().hex[:4].upper()}"

    discovered_page = DiscoveredPageItem(
        title=page_title,
        slug=page_slug,
        url=base_url,
        is_home=True,
        menu_sort_order=10,
        section_ids=section_ids
    )

    return SectionsBuilderResponse(
        job_id=active_job_id,
        status=JobStatus.COMPLETE,
        group_code=group_code,
        suite_name=suite_name,
        source_url=base_url,
        total_sections=len(all_sections),
        total_pages=1,
        pages=[discovered_page],
        sections=all_sections,
        code_injections=[],
        category_breakdown=category_counts,
        message=f"Successfully sliced and scoped {len(all_sections)} modular section templates."
    )



def _tokenize_section_html(raw_html: str, category_key: str, brand_name: str) -> str:
    """
    Substitutes hardcoded branding with standard dynamic Ozikol Mustache tokens.
    """
    html = raw_html

    if category_key == "menu":
        # Replace brand logo alt or logo text
        html = re.sub(r'alt="[^"]*logo[^"]*"', f'alt="{brand_name}"', html, flags=re.I)
        # Ensure login button token or portal links have standard classes
        html = re.sub(r'href="[^"]*(?:login|signin|portal)[^"]*"', 'href="/Account/Login"', html, flags=re.I)

    elif category_key == "footer":
        # Replace dynamic copyright year
        html = re.sub(r'©\s*\d{4}[^<]*', f'© {brand_name}. All rights reserved.', html, flags=re.I)

    return html


def _extract_inline_interactions(html: str, category_key: str) -> Optional[str]:
    """
    Provides standard lightweight sandboxed scripts for interactive components.
    """
    scripts: list[str] = []

    if category_key == "menu":
        scripts.append("""// Mobile Navigation Drawer Toggle
document.querySelectorAll('.navbar-toggler, .oz-mobile-toggle, [data-bs-toggle="collapse"], .menu_bar').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
        var nav = this.closest('nav, header') || document.querySelector('nav, header, .tj-offcanvas-area');
        if (nav) nav.classList.toggle('active-mobile-menu');
    });
});""")

    if "swiper" in html.lower() or "slider" in html.lower():
        scripts.append("""// Swiper / Banner Slider Initialization
if (typeof Swiper !== 'undefined') {
    document.querySelectorAll('.swiper, .hero-slider, .project-slider, .testimonial-slider-2, .blog-slider').forEach(function(el) {
        new Swiper(el, {
            loop: true,
            autoplay: { delay: 4000 },
            pagination: { el: el.querySelector('.swiper-pagination') || '.swiper-pagination-area', clickable: true },
            navigation: {
                nextEl: el.querySelector('.slider-next') || '.slider-next',
                prevEl: el.querySelector('.slider-prev') || '.slider-prev'
            }
        });
    });
}""")

    if "faq" in html.lower() or "accordion" in html.lower():
        scripts.append("""// FAQ Accordion Toggle
document.querySelectorAll('.accordion-header, .faq-question, .accordion-button').forEach(function(item) {
    item.addEventListener('click', function() {
        var collapse = this.nextElementSibling;
        if (collapse) collapse.classList.toggle('show');
    });
});""")

    return "\n\n".join(scripts) if scripts else None



def _generate_sample_content(category_key: str, section_name: str, brand_name: str) -> str:
    """
    Generates realistic JSON sample data for immediate preview hydration.
    """
    import json
    mock = {
        "BrandName": brand_name,
        "Title": section_name,
        "MiniTitle": "Modular Capability",
        "Description": f"Deliver enterprise-grade cloud capabilities with {brand_name}'s high-availability infrastructure.",
        "ButtonText": "Get Started Now",
        "ButtonLink": "/Auth/Register",
        "ImageUrl": "https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&q=80",
        "PageSectionLists": [
            {
                "Title": "High Scalability",
                "MiniTitle": "Performance",
                "Description": "Engineered for 99.99% uptime with global distributed edge routing.",
                "IconText": "rocket_launch",
                "ButtonText": "Learn More",
                "ButtonLink": "/capabilities"
            },
            {
                "Title": "Security & Isolation",
                "MiniTitle": "Compliance",
                "Description": "Zero-trust architecture with end-to-end encrypted tenant partitions.",
                "IconText": "shield",
                "ButtonText": "Learn More",
                "ButtonLink": "/capabilities"
            },
            {
                "Title": "Real-time Telemetry",
                "MiniTitle": "Analytics",
                "Description": "Instant monitoring and proactive health alerts across all services.",
                "IconText": "monitoring",
                "ButtonText": "Learn More",
                "ButtonLink": "/capabilities"
            }
        ]
    }
    return json.dumps(mock, indent=2)
