"""
Preview routes — serve raw content for inspection before committing.

GET /jobs/{job_id}/preview/page/{page_id}       Full page HTML (raw)
GET /jobs/{job_id}/preview/page/{page_id}/render Rendered page in browser
GET /jobs/{job_id}/preview/css/{css_id}         Raw CSS content
GET /jobs/{job_id}/preview/js/{js_id}           Raw JS content
GET /jobs/{job_id}/preview/cleaned/{page_id}    Cleaned HTML after Phase 2
"""

import logging
import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse, PlainTextResponse, Response

import store.job_store as job_store
from models.schemas import AuditResult, ApplySelectionsResult

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/jobs", tags=["Preview"])

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )
}


# ---------------------------------------------------------------------------
# GET /jobs/{job_id}/preview/page/{page_id}  — raw original HTML
# ---------------------------------------------------------------------------

@router.get(
    "/{job_id}/preview/page/{page_id}",
    summary="Preview original page HTML (raw text)",
)
async def preview_page_raw(job_id: str, page_id: str):
    page = _find_page(job_id, page_id)
    return PlainTextResponse(page.get("html", ""), media_type="text/plain; charset=utf-8")


# ---------------------------------------------------------------------------
# GET /jobs/{job_id}/preview/page/{page_id}/render  — rendered in browser
# ---------------------------------------------------------------------------

@router.get(
    "/{job_id}/preview/page/{page_id}/render",
    response_class=HTMLResponse,
    summary="Render original page HTML in browser",
)
async def preview_page_render(job_id: str, page_id: str):
    job = _get_job_or_404(job_id)
    page = _find_page(job_id, page_id)
    raw_html = page.get("html", "<p>No HTML available.</p>")
    source_url = job.get("url") or ""
    html = _inject_base_tag(raw_html, source_url)
    return HTMLResponse(content=html)


# ---------------------------------------------------------------------------
# GET /jobs/{job_id}/preview/css/{css_id}  — raw CSS
# ---------------------------------------------------------------------------

@router.get(
    "/{job_id}/preview/css/{css_id}",
    summary="Preview CSS file content",
)
async def preview_css(job_id: str, css_id: str):
    job = _get_job_or_404(job_id)
    audit_data = job.get("audit")
    if not audit_data:
        raise HTTPException(status_code=404, detail="Audit not ready.")

    audit = AuditResult(**audit_data)
    css_item = next((c for c in audit.css_files if c.id == css_id), None)

    # Also check trackers (some tracker scripts have preview_url)
    if not css_item:
        raise HTTPException(status_code=404, detail=f"CSS item '{css_id}' not found.")

    content = await _fetch_text(css_item.url)
    return PlainTextResponse(content, media_type="text/css; charset=utf-8")


# ---------------------------------------------------------------------------
# GET /jobs/{job_id}/preview/js/{js_id}  — raw JS
# ---------------------------------------------------------------------------

@router.get(
    "/{job_id}/preview/js/{js_id}",
    summary="Preview JS file content",
)
async def preview_js(job_id: str, js_id: str):
    job = _get_job_or_404(job_id)
    audit_data = job.get("audit")
    if not audit_data:
        raise HTTPException(status_code=404, detail="Audit not ready.")

    audit = AuditResult(**audit_data)

    # Search in both js_files and trackers
    item_url = None
    for js in audit.js_files:
        if js.id == js_id:
            item_url = js.url
            break
    if not item_url:
        for tracker in audit.trackers:
            if tracker.id == js_id and tracker.url:
                item_url = tracker.url
                break

    if not item_url:
        raise HTTPException(status_code=404, detail=f"JS item '{js_id}' not found.")

    content = await _fetch_text(item_url)
    return PlainTextResponse(content, media_type="application/javascript; charset=utf-8")


# ---------------------------------------------------------------------------
# GET /jobs/{job_id}/preview/cleaned/{page_id}  — cleaned HTML after Phase 2
# ---------------------------------------------------------------------------

@router.get(
    "/{job_id}/preview/cleaned/{page_id}",
    response_class=HTMLResponse,
    summary="Preview cleaned page HTML after Phase 2 apply",
)
async def preview_cleaned_page(job_id: str, page_id: str):
    job = _get_job_or_404(job_id)
    cleaned_data = job.get("cleaned")
    if not cleaned_data:
        raise HTTPException(
            status_code=400,
            detail="Phase 2 not completed yet. Call POST /jobs/{job_id}/apply first.",
        )

    cleaned = ApplySelectionsResult(**cleaned_data)
    diff = next((d for d in cleaned.page_diffs if d.page_id == page_id), None)
    if not diff:
        raise HTTPException(status_code=404, detail=f"Cleaned page '{page_id}' not found.")

    raw_html = diff.cleaned_html or "<p>No cleaned HTML available.</p>"
    source_url = job.get("url") or ""
    html = _inject_base_tag(raw_html, source_url)
    return HTMLResponse(content=html)


# ---------------------------------------------------------------------------
# GET /jobs/{job_id}/preview/final/{page_id}  — final HTML after Phase 3
# ---------------------------------------------------------------------------

@router.get(
    "/{job_id}/preview/final/{page_id}",
    response_class=HTMLResponse,
    summary="Preview final page HTML after Phase 3 CDN upload",
)
async def preview_final_page(job_id: str, page_id: str):
    job = _get_job_or_404(job_id)
    upload_data = job.get("upload")
    if not upload_data:
        raise HTTPException(
            status_code=400,
            detail="Phase 3 not completed yet. Call POST /jobs/{job_id}/upload first.",
        )

    pages = upload_data.get("pages", [])
    page = next((p for p in pages if p.get("page_id") == page_id), None)
    if not page:
        raise HTTPException(status_code=404, detail=f"Final page '{page_id}' not found.")

    return HTMLResponse(content=page.get("final_html", "<p>No HTML.</p>"))


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _inject_base_tag(html: str, base_url: str) -> str:
    """Inject a <base href="..."> tag into <head> so relative assets resolve properly in iframe sandbox."""
    if not base_url:
        return html
    if not base_url.endswith("/"):
        base_url += "/"

    base_tag = f'<base href="{base_url}">'

    # If <base already exists in html, don't duplicate
    if "<base " in html.lower():
        return html

    # Inject right after <head>
    if "<head>" in html:
        return html.replace("<head>", f"<head>\n    {base_tag}", 1)
    elif "<head " in html:
        import re
        return re.sub(r"(<head[^>]*>)", r"\1\n    " + base_tag, html, count=1, flags=re.IGNORECASE)
    else:
        return f"{base_tag}\n{html}"


def _get_job_or_404(job_id: str) -> dict:
    job = job_store.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")
    return job


def _find_page(job_id: str, page_id: str) -> dict:
    job = _get_job_or_404(job_id)
    audit_data = job.get("audit")
    if not audit_data:
        raise HTTPException(status_code=404, detail="Audit not ready.")

    audit = AuditResult(**audit_data)
    page = next((p for p in audit.pages if p.id == page_id), None)
    if not page:
        raise HTTPException(status_code=404, detail=f"Page '{page_id}' not found.")
    return page.model_dump()


async def _fetch_text(url: str) -> str:
    """Fetch a remote text resource (CSS/JS) and return its content."""
    try:
        async with httpx.AsyncClient(headers=HEADERS, follow_redirects=True, timeout=15, verify=False) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            return resp.text
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Could not fetch {url}: {exc}")
