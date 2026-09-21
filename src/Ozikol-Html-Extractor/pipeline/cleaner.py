"""
Phase 2 — Apply user selections and clean HTML.

Takes the audit result + user selections, removes everything unchecked,
and returns cleaned HTML for each page.
"""

import logging
import re
from urllib.parse import urlparse

from bs4 import BeautifulSoup, Comment

from models.schemas import (
    ApplySelectionsResult,
    AuditResult,
    JobStatus,
    PageDiff,
    SelectionItem,
)

logger = logging.getLogger(__name__)


# Tags / attributes that are generally safe to strip from clean output
JUNK_ATTRIBUTES = ["data-reactroot", "data-v-", "ng-version"]
JUNK_TAGS = ["noscript"]  # optional; can expand


def apply_selections(
    audit: AuditResult,
    selections: list[SelectionItem],
    job_id: str,
) -> ApplySelectionsResult:
    """
    Apply the user's checked/unchecked selections to all pages.
    Returns cleaned HTML per page and a diff summary.
    """
    # Build lookup: id -> checked
    selection_map: dict[str, bool] = {s.id: s.checked for s in selections}

    # Determine which URLs/ids are kept
    kept_section_ids: set[str] = {
        item.id for item in audit.sections
        if selection_map.get(item.id, item.checked)
    }
    kept_css_urls: set[str] = {
        item.url for item in audit.css_files
        if selection_map.get(item.id, item.checked) and item.url
    }
    kept_js_urls: set[str] = {
        item.url for item in audit.js_files
        if selection_map.get(item.id, item.checked) and item.url
    }
    kept_page_ids: set[str] = {
        item.id for item in audit.pages
        if selection_map.get(item.id, item.checked)
    }
    kept_tracker_ids: set[str] = {
        item.id for item in audit.trackers
        if selection_map.get(item.id, item.checked)
    }
    kept_meta_ids: set[str] = {
        item.id for item in audit.meta_tags
        if selection_map.get(item.id, item.checked)
    }

    # Tracker URLs that are KEPT (not removed)
    kept_tracker_urls: set[str] = {
        item.url for item in audit.trackers
        if item.url and item.id in kept_tracker_ids
    }

    # All tracker URLs (to detect inline code too)
    tracker_url_set: set[str] = {item.url for item in audit.trackers if item.url}

    # Meta tag ids that are removed
    removed_meta_ids: set[str] = {
        item.id for item in audit.meta_tags
        if item.id not in kept_meta_ids
    }
    # Build meta removal map: page_url -> set of tag names to remove
    removed_metas_by_page: dict[str, set[str]] = {}
    for item in audit.meta_tags:
        if item.id in removed_meta_ids:
            removed_metas_by_page.setdefault(item.page_url, set()).add(item.tag_name)

    page_diffs: list[PageDiff] = []
    cleaned_pages: list[dict] = []

    for page in audit.pages:
        if page.id not in kept_page_ids:
            continue  # page was unchecked — skip it entirely

        diff = PageDiff(page_url=page.url or "", page_id=page.id)
        soup = BeautifulSoup(page.html or "", "html.parser")

        # --------------------------------------------------------------------
        # Remove unchecked Sections (tagged with data-oz-section-id)
        # --------------------------------------------------------------------
        for tag in soup.find_all(attrs={"data-oz-section-id": True}):
            sec_id = tag.get("data-oz-section-id")
            if sec_id and sec_id not in kept_section_ids:
                diff.removed_sections.append(sec_id)
                tag.decompose()
            else:
                # Keep section and strip the internal tracking attribute from clean HTML
                del tag["data-oz-section-id"]

        # --------------------------------------------------------------------
        # Remove unchecked CSS <link> tags
        # --------------------------------------------------------------------
        for tag in soup.find_all("link", rel=lambda r: r and "stylesheet" in r):
            href = tag.get("href", "")
            if href and _normalize_url(href, page.url or "") not in kept_css_urls:
                diff.removed_css.append(href)
                tag.decompose()

        # --------------------------------------------------------------------
        # Remove unchecked JS <script src="..."> and tracker inline scripts
        # --------------------------------------------------------------------
        for tag in soup.find_all("script"):
            src = tag.get("src", "")
            inline = tag.string or ""

            if src:
                abs_src = _normalize_url(src, page.url or "")
                # Remove if it's an unchecked tracker or an unchecked js file
                if abs_src in tracker_url_set and abs_src not in kept_tracker_urls:
                    diff.removed_trackers.append(src)
                    tag.decompose()
                    continue
                if abs_src not in kept_js_urls and abs_src not in kept_tracker_urls:
                    diff.removed_js.append(src)
                    tag.decompose()
                    continue
            elif inline.strip():
                # Inline tracker detection
                from pipeline.classifier import is_tracker
                if is_tracker("", inline):
                    diff.removed_trackers.append("inline tracker script")
                    tag.decompose()
                    continue

        # --------------------------------------------------------------------
        # Remove unchecked meta tags
        # --------------------------------------------------------------------
        page_removed_metas = removed_metas_by_page.get(page.url or "", set())
        for tag in soup.find_all("meta"):
            name = (
                tag.get("name") or
                tag.get("property") or
                tag.get("http-equiv") or
                ""
            ).strip()
            if name in page_removed_metas:
                diff.removed_metas.append(name)
                tag.decompose()

        # --------------------------------------------------------------------
        # Fix broken links — links pointing to removed pages
        # --------------------------------------------------------------------
        removed_page_urls: set[str] = {
            p.url for p in audit.pages
            if p.id not in kept_page_ids and p.url
        }
        for a_tag in soup.find_all("a", href=True):
            href = a_tag["href"].strip()
            abs_href = _normalize_url(href, page.url or "")
            if abs_href in removed_page_urls:
                # Replace with # so the link doesn't 404
                a_tag["href"] = "#"
                a_tag["data-removed"] = "true"

        # --------------------------------------------------------------------
        # General HTML cleanup
        # --------------------------------------------------------------------
        _clean_html(soup)

        diff.cleaned_html = str(soup)
        page_diffs.append(diff)
        cleaned_pages.append({
            "page_id": page.id,
            "url": page.url,
            "title": page.title,
            "cleaned_html": str(soup),
        })

    removed_total = (
        sum(len(d.removed_sections) for d in page_diffs) +
        sum(len(d.removed_css) for d in page_diffs) +
        sum(len(d.removed_js) for d in page_diffs) +
        sum(len(d.removed_trackers) for d in page_diffs) +
        sum(len(d.removed_metas) for d in page_diffs)
    )

    return ApplySelectionsResult(
        job_id=job_id,
        status=JobStatus.CLEANED,
        kept_sections=list(kept_section_ids),
        kept_css=list(kept_css_urls),
        kept_js=list(kept_js_urls),
        kept_pages=[p["url"] for p in cleaned_pages],
        removed_total=removed_total,
        page_diffs=page_diffs,
    )


# ---------------------------------------------------------------------------
# HTML cleanup helpers
# ---------------------------------------------------------------------------

def _clean_html(soup: BeautifulSoup) -> None:
    """
    Remove HTML comments, empty tags, unnecessary whitespace,
    and known junk patterns from the soup in-place.
    """
    # Remove HTML comments
    for comment in soup.find_all(string=lambda text: isinstance(text, Comment)):
        comment.extract()

    # Remove <noscript> blocks
    for tag in soup.find_all("noscript"):
        tag.decompose()

    # Remove empty <div>, <span>, <p> with no content and no attributes
    for tag in soup.find_all(["div", "span", "p"]):
        if not tag.get_text(strip=True) and not tag.attrs and not tag.find():
            tag.decompose()


def _normalize_url(href: str, base_url: str) -> str:
    """Resolve a possibly-relative URL to absolute."""
    from urllib.parse import urljoin
    if href.startswith(("http://", "https://", "//")):
        return href.rstrip("/")
    return urljoin(base_url, href).rstrip("/")
