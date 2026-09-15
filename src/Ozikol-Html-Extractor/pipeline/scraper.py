"""
Phase 1 — Full site crawl and audit.

Crawls all pages on the same domain starting from the given URL.
Returns a complete AuditResult with CSS, JS, fonts, pages, broken links,
meta tags, trackers, and external resources.
"""

import hashlib
import logging
from collections import defaultdict
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

from models.schemas import (
    AuditResult,
    BrokenLinkItem,
    CssItem,
    ExternalItem,
    FontItem,
    JsCategory,
    JsItem,
    MetaTagItem,
    PageItem,
    TrackerItem,
)
from pipeline.classifier import (
    classify_font_provider,
    classify_js,
    classify_tracker,
    is_external,
    is_font_url,
    is_tracker,
)

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )
}

MAX_PAGES = 100  # safety cap


def _make_id(prefix: str, value: str) -> str:
    return prefix + "_" + hashlib.md5(value.encode()).hexdigest()[:10]


def _normalize(url: str) -> str:
    """Strip fragment and trailing slash for deduplication."""
    parsed = urlparse(url)
    normalized = parsed._replace(fragment="").geturl()
    return normalized.rstrip("/")


def _is_same_domain(url: str, base_netloc: str) -> bool:
    try:
        netloc = urlparse(url).netloc.lower()
        return netloc == base_netloc or netloc == "www." + base_netloc or \
               "www." + netloc == base_netloc
    except Exception:
        return False


def _absolute(href: str, base: str) -> str:
    return urljoin(base, href)


async def run_audit(url: str, job_id: str) -> AuditResult:
    """
    Crawl the site starting at `url` and return a full AuditResult.
    """
    parsed_start = urlparse(url)
    base_netloc = parsed_start.netloc.lower()
    base_domain = base_netloc.lstrip("www.")

    visited_pages: dict[str, PageItem] = {}   # normalized_url -> PageItem
    css_map: dict[str, CssItem] = {}
    js_map: dict[str, JsItem] = {}
    font_map: dict[str, FontItem] = {}
    tracker_map: dict[str, TrackerItem] = {}
    external_map: dict[str, ExternalItem] = {}
    meta_tags: list[MetaTagItem] = []
    all_links: set[str] = set()        # every href found
    broken_links: list[BrokenLinkItem] = []

    queue: list[str] = [_normalize(url)]
    seen: set[str] = set(queue)

    async with httpx.AsyncClient(
        headers=HEADERS,
        follow_redirects=True,
        timeout=20,
        verify=False,
    ) as client:

        while queue and len(visited_pages) < MAX_PAGES:
            current_url = queue.pop(0)

            # ----------------------------------------------------------------
            # Fetch page
            # ----------------------------------------------------------------
            try:
                resp = await client.get(current_url)
                resp.raise_for_status()
            except Exception as exc:
                logger.warning("Failed to fetch %s: %s", current_url, exc)
                broken_links.append(BrokenLinkItem(
                    id=_make_id("broken", current_url),
                    url=current_url,
                    label=current_url,
                    reason=str(exc),
                    found_on_page=None,
                ))
                continue

            content_type = resp.headers.get("content-type", "")
            if "html" not in content_type:
                continue

            html = resp.text
            soup = BeautifulSoup(html, "html.parser")
            page_title = soup.title.string.strip() if soup.title and soup.title.string else current_url

            page_id = _make_id("page", current_url)
            visited_pages[current_url] = PageItem(
                id=page_id,
                url=current_url,
                label=page_title,
                title=page_title,
                html=html,
                preview_url=f"/jobs/{job_id}/preview/page/{page_id}",
            )

            # ----------------------------------------------------------------
            # CSS  <link rel="stylesheet">
            # ----------------------------------------------------------------
            for tag in soup.find_all("link", rel=lambda r: r and "stylesheet" in r):
                href = tag.get("href", "")
                if not href:
                    continue
                abs_href = _absolute(href, current_url)
                norm = _normalize(abs_href)
                if norm not in css_map:
                    css_id = _make_id("css", norm)
                    size = await _fetch_size(client, norm)
                    css_map[norm] = CssItem(
                        id=css_id,
                        url=norm,
                        label=norm.split("/")[-1] or norm,
                        size_bytes=size,
                        preview_url=f"/jobs/{job_id}/preview/css/{css_id}",
                    )

            # ----------------------------------------------------------------
            # JS  <script src="...">
            # ----------------------------------------------------------------
            for tag in soup.find_all("script"):
                src = tag.get("src", "")
                inline_code = tag.string or ""

                if src:
                    abs_src = _absolute(src, current_url)
                    norm = _normalize(abs_src)

                    if is_font_url(norm):
                        pass  # handled in fonts section
                    elif is_tracker(norm, inline_code):
                        _register_tracker(tracker_map, job_id, norm, inline_code, current_url)
                    else:
                        if norm not in js_map:
                            js_id = _make_id("js", norm)
                            size = await _fetch_size(client, norm)
                            js_cat = classify_js(norm)
                            js_map[norm] = JsItem(
                                id=js_id,
                                url=norm,
                                label=norm.split("/")[-1] or norm,
                                size_bytes=size,
                                js_category=js_cat,
                                preview_url=f"/jobs/{job_id}/preview/js/{js_id}",
                            )
                elif inline_code.strip():
                    if is_tracker("", inline_code):
                        _register_tracker(tracker_map, job_id, "", inline_code, current_url)

            # ----------------------------------------------------------------
            # Fonts  <link> with font in href or @import in CSS
            # ----------------------------------------------------------------
            for tag in soup.find_all("link"):
                href = tag.get("href", "")
                if not href:
                    continue
                abs_href = _absolute(href, current_url)
                if is_font_url(abs_href):
                    norm = _normalize(abs_href)
                    if norm not in font_map:
                        font_id = _make_id("font", norm)
                        font_map[norm] = FontItem(
                            id=font_id,
                            url=norm,
                            label=norm.split("/")[-1] or norm,
                            font_provider=classify_font_provider(norm),
                            preview_url=None,
                        )

            # ----------------------------------------------------------------
            # Meta tags
            # ----------------------------------------------------------------
            for tag in soup.find_all("meta"):
                name = (
                    tag.get("name") or
                    tag.get("property") or
                    tag.get("http-equiv") or
                    ""
                ).strip()
                content = tag.get("content", "").strip()
                if name:
                    meta_id = _make_id("meta", current_url + name)
                    meta_tags.append(MetaTagItem(
                        id=meta_id,
                        url=current_url,
                        label=f"{name}: {content[:60]}",
                        page_url=current_url,
                        tag_name=name,
                        content=content,
                    ))

            # ----------------------------------------------------------------
            # External resources (images, iframes, embeds from other domains)
            # ----------------------------------------------------------------
            for attr, tags in [("src", ["img", "iframe", "embed", "source"]),
                                ("href", ["link"])]:
                for tag in soup.find_all(tags):
                    val = tag.get(attr, "")
                    if val and is_external(val, base_domain):
                        abs_val = _absolute(val, current_url)
                        norm = _normalize(abs_val)
                        if norm not in external_map:
                            ext_id = _make_id("ext", norm)
                            ext_domain = urlparse(norm).netloc
                            external_map[norm] = ExternalItem(
                                id=ext_id,
                                url=norm,
                                label=norm,
                                domain=ext_domain,
                            )

            # ----------------------------------------------------------------
            # Collect links for crawling + broken link detection
            # ----------------------------------------------------------------
            for a_tag in soup.find_all("a", href=True):
                href = a_tag["href"].strip()
                if not href or href.startswith(("mailto:", "tel:", "javascript:", "#")):
                    continue
                abs_href = _absolute(href, current_url)
                norm_href = _normalize(abs_href)
                all_links.add(norm_href)

                if _is_same_domain(norm_href, base_netloc) and norm_href not in seen:
                    seen.add(norm_href)
                    queue.append(norm_href)

        # ----------------------------------------------------------------
        # Broken links — links found but not in visited pages
        # ----------------------------------------------------------------
        scraped_urls = set(visited_pages.keys())
        for link in all_links:
            if _is_same_domain(link, base_netloc) and link not in scraped_urls:
                # Check if it's already registered as a fetch error
                already = any(b.url == link for b in broken_links)
                if not already:
                    broken_links.append(BrokenLinkItem(
                        id=_make_id("broken", link),
                        url=link,
                        label=link,
                        reason="Page not found in crawl (may be broken or excluded)",
                        found_on_page=None,
                    ))

    pages_list = list(visited_pages.values())
    total_assets = (
        len(css_map) + len(js_map) + len(font_map) +
        len(tracker_map) + len(external_map)
    )

    return AuditResult(
        job_id=job_id,
        source_url=url,
        css_files=list(css_map.values()),
        js_files=list(js_map.values()),
        fonts=list(font_map.values()),
        pages=pages_list,
        broken_links=broken_links,
        meta_tags=meta_tags,
        trackers=list(tracker_map.values()),
        external_resources=list(external_map.values()),
        total_pages=len(pages_list),
        total_assets=total_assets,
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _fetch_size(client: httpx.AsyncClient, url: str) -> int:
    """HEAD request to get content-length. Returns 0 on failure."""
    try:
        r = await client.head(url, timeout=5)
        cl = r.headers.get("content-length", "0")
        return int(cl)
    except Exception:
        return 0


def _register_tracker(
    tracker_map: dict,
    job_id: str,
    src: str,
    inline_code: str,
    page_url: str,
) -> None:
    key = src if src else f"inline::{hashlib.md5(inline_code[:200].encode()).hexdigest()}"
    category = classify_tracker(src, inline_code)
    if key not in tracker_map:
        tracker_id = _make_id("tracker", key)
        tracker_map[key] = TrackerItem(
            id=tracker_id,
            url=src if src else None,
            label=src.split("/")[-1] if src else f"Inline {category.value} script",
            tracker_category=category,
            found_on_pages=[page_url],
            checked=False,  # trackers default to unchecked
            preview_url=f"/jobs/{job_id}/preview/js/{tracker_id}" if src else None,
        )
    else:
        if page_url not in tracker_map[key].found_on_pages:
            tracker_map[key].found_on_pages.append(page_url)
