"""
Phase 1 — Full site crawl and audit.

Crawls all pages on the same domain starting from the given URL.
Returns a complete AuditResult with CSS, JS, fonts, pages, broken links,
meta tags, trackers, and external resources.
"""

import asyncio
import hashlib
import logging
from collections import defaultdict
from urllib.parse import urljoin, urlparse

import httpx
import re
from bs4 import BeautifulSoup

from models.schemas import (
    AuditResult,
    AuditSectionItem,
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
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
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


async def _fetch_with_retry(client: httpx.AsyncClient, target_url: str, max_retries: int = 4) -> httpx.Response:
    """
    Fetches a URL with automatic retry and exponential backoff for transient server
    errors (503 Service Unavailable, 502 Bad Gateway, 504 Gateway Timeout, 429 Too Many Requests)
    such as sleeping cloud containers (Render, Heroku, Fly.io, Railway) waking up.
    """
    last_exc = None
    for attempt in range(1, max_retries + 1):
        try:
            resp = await client.get(target_url)
            # If server returned 503/502/504/429, retry with backoff unless last attempt
            if resp.status_code in (503, 502, 504, 429) and attempt < max_retries:
                wait_secs = attempt * 3  # 3s, 6s, 9s
                logger.warning(
                    "Target %s returned HTTP %s (service may be waking up/spinning up). Retrying in %ss (attempt %s/%s)...",
                    target_url, resp.status_code, wait_secs, attempt, max_retries
                )
                await asyncio.sleep(wait_secs)
                continue

            resp.raise_for_status()
            return resp
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code in (503, 502, 504, 429) and attempt < max_retries:
                last_exc = exc
                wait_secs = attempt * 3
                logger.warning(
                    "Target %s returned HTTP %s (service may be waking up/spinning up). Retrying in %ss (attempt %s/%s)...",
                    target_url, exc.response.status_code, wait_secs, attempt, max_retries
                )
                await asyncio.sleep(wait_secs)
            else:
                raise
        except (httpx.ConnectError, httpx.TimeoutException) as exc:
            last_exc = exc
            if attempt < max_retries:
                wait_secs = attempt * 3
                logger.warning(
                    "Transient connection error fetching %s (%s). Retrying in %ss (attempt %s/%s)...",
                    target_url, exc, wait_secs, attempt, max_retries
                )
                await asyncio.sleep(wait_secs)
            else:
                raise
        except Exception:
            raise

    if last_exc:
        raise last_exc
    raise RuntimeError(f"Failed to fetch {target_url} after {max_retries} attempts.")


async def run_audit(url: str, job_id: str) -> AuditResult:
    """
    Crawl the site starting at `url` and return a full AuditResult.
    """
    parsed_start = urlparse(url)
    base_netloc = parsed_start.netloc.lower()
    base_domain = base_netloc.lstrip("www.")

    visited_pages: dict[str, PageItem] = {}   # normalized_url -> PageItem
    sections_list: list[AuditSectionItem] = []
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
        timeout=30,
        verify=False,
    ) as client:

        while queue and len(visited_pages) < MAX_PAGES:
            current_url = queue.pop(0)

            # ----------------------------------------------------------------
            # Fetch page
            # ----------------------------------------------------------------
            try:
                resp = await _fetch_with_retry(client, current_url)
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

            content_type = resp.headers.get("content-type", "").lower()
            html_content = resp.text
            is_probably_html = (
                "html" in content_type
                or "text" in content_type
                or "xml" in content_type
                or "<!doctype" in html_content[:400].lower()
                or "<html" in html_content[:400].lower()
            )
            if not is_probably_html:
                continue

            soup = BeautifulSoup(html_content, "html.parser")
            page_title = soup.title.string.strip() if soup.title and soup.title.string else current_url

            page_id = _make_id("page", current_url)

            # ----------------------------------------------------------------
            # Extract and Tag Page Sections (Menu, Hero, Body, Footer)
            # ----------------------------------------------------------------
            page_sections = _extract_page_sections(soup, current_url, page_id)
            sections_list.extend(page_sections)

            # Save soup with data-oz-section-id attributes injected
            tagged_html = str(soup)

            visited_pages[current_url] = PageItem(
                id=page_id,
                url=current_url,
                label=page_title,
                title=page_title,
                html=tagged_html,
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

    if not visited_pages:
        fail_reason = broken_links[0].reason if broken_links else "No HTML content could be retrieved from the target URL"
        raise RuntimeError(
            f"Failed to crawl target website '{url}': {fail_reason}. "
            f"Please verify that the website is online, publicly accessible, and not blocking automated requests."
        )

    pages_list = list(visited_pages.values())
    total_assets = (
        len(css_map) + len(js_map) + len(font_map) +
        len(tracker_map) + len(external_map)
    )

    # ----------------------------------------------------------------
    # Cross-Page Section Duplicate Detection
    # ----------------------------------------------------------------
    seen_section_fingerprints: dict[str, list[AuditSectionItem]] = defaultdict(list)
    for sec in sections_list:
        clean_selector = (sec.css_selector or "").strip().lower()
        clean_heading = (sec.heading or "").strip().lower()
        fingerprint = f"{sec.category_key}::{clean_selector}::{clean_heading}"
        seen_section_fingerprints[fingerprint].append(sec)

    for fingerprint, sec_group in seen_section_fingerprints.items():
        total_count = len(sec_group)
        for idx, sec in enumerate(sec_group):
            sec.appearance_count = total_count
            if idx > 0:
                sec.is_duplicate = True

    return AuditResult(
        job_id=job_id,
        source_url=url,
        sections=sections_list,
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
# Section Extraction Helper (Phase 1)
# ---------------------------------------------------------------------------

def _extract_page_sections(soup: BeautifulSoup, page_url: str, page_id: str) -> list[AuditSectionItem]:
    """
    Scans the DOM for all structural section containers (<header>, <nav>, <section>,
    <footer>, <article>, and section-like <div> elements).
    Assigns unique tracking IDs (data-oz-section-id) and categorizes each block.
    """
    sections: list[AuditSectionItem] = []
    candidates = []

    # 1. Structural semantic tags
    for tag_name in ["header", "nav", "section", "article", "footer"]:
        for el in soup.find_all(tag_name):
            if el not in candidates and not any(el in c.descendants for c in candidates):
                candidates.append(el)

    # 2. Section-like <div> elements
    section_pattern = re.compile(
        r'(?:^|\s|-|_)(section|hero|banner|about|service|feature|pricing|team|testimonial|contact|footer|cta|portfolio|gallery|counter|slider|header|navbar)(?:$|\s|-|_)',
        re.I
    )
    for div in soup.find_all("div", class_=section_pattern):
        if div not in candidates and not any(div in c.descendants for c in candidates):
            if not any(c in div.parents for c in candidates):
                candidates.append(div)

    # 3. Fallback: direct top-level children of <main> or <body>
    if not candidates:
        container = soup.find("main") or soup.find("body")
        if container:
            for child in container.find_all(recursive=False):
                if child.name and child.name not in ["script", "style", "svg", "noscript", "meta", "link", "template"]:
                    candidates.append(child)

    for idx, el in enumerate(candidates):
        sec_id = f"sec_{page_id}_{idx}"
        el["data-oz-section-id"] = sec_id

        # Determine category with strict tag precedence
        tag_name = el.name.lower() if el.name else "div"
        classes = " ".join(el.get("class", [])) if isinstance(el.get("class"), list) else str(el.get("class", ""))
        el_id = str(el.get("id", ""))
        combined_meta = f"{tag_name} {classes} {el_id}".lower()
        is_subpage = urlparse(page_url).path.strip("/") != "" and urlparse(page_url).path.strip("/") != "index.html"
        
        is_explicit_breadcrumb = (
            bool(el.find(class_=re.compile(r'\bbreadcrumb\b|\bbread-crumb\b', re.I)))
            or bool(el.find("ol", class_=re.compile(r'breadcrumb', re.I)))
            or bool(el.find("nav", attrs={"aria-label": re.compile(r'breadcrumb', re.I)}))
            or ("breadcrumb" in combined_meta and tag_name not in ["header", "footer"])
        )

        # 1. Strict Footer Detection
        if tag_name == "footer" or any(k in combined_meta for k in ["main-footer", "site-footer", "footer-area", "footer-section", "socket", "copyright"]):
            category_key = "footer"
        # 2. Strict Menu / Navigation Header Detection
        elif (tag_name in ["header", "nav"] or any(k in combined_meta for k in ["navbar", "main-header", "site-header", "page-header", "header-area", "navigation", "top-nav"])) and not is_explicit_breadcrumb:
            category_key = "menu"
        # 3. Breadcrumb / Inner Page Header Detection
        elif is_explicit_breadcrumb or (is_subpage and idx <= 2 and any(k in combined_meta for k in ["page-title", "inner-banner", "page-banner", "sub-banner", "title-area", "breadcrumb-area"])):
            category_key = "breadcrumb"
        # 4. Hero Showcase / Masthead Slider Detection
        elif (not is_subpage and (idx <= 1 or any(k in combined_meta for k in ["hero", "slider", "banner", "carousel", "intro", "masthead", "main-banner"]))) or any(k in combined_meta for k in ["hero-section", "main-hero", "hero-slider", "banner-slider"]):
            category_key = "hero"
        # 5. Modular Body Content Section
        else:
            category_key = "body"

        # Determine heading
        heading = None
        for h in el.find_all(["h1", "h2", "h3", "h4", "h5", "h6", "span"], class_=re.compile(r'title|heading|subtitle', re.I)):
            text = h.get_text(strip=True)
            if text and len(text) > 2:
                heading = text[:80]
                break
        if not heading:
            for h in el.find_all(["h1", "h2", "h3", "h4", "h5", "h6"]):
                text = h.get_text(strip=True)
                if text and len(text) > 2:
                    heading = text[:80]
                    break
        if not heading:
            if category_key == "menu":
                heading = "Site Navigation & Header"
            elif category_key == "hero":
                heading = "Hero Showcase Banner"
            elif category_key == "breadcrumb":
                heading = "Page Title & Breadcrumb Trail"
            elif category_key == "footer":
                heading = "Website Footer & Links"
            else:
                clean_cls = classes.replace("sis-", "").replace("-section", "").replace("section-", "").replace("container", "").strip()
                heading = f"{clean_cls.title() or 'Content Block'} Section"

        # CSS Selector signature
        css_sel = tag_name
        if el_id:
            css_sel += f"#{el_id}"
        if el.get("class"):
            cls_list = el.get("class") if isinstance(el.get("class"), list) else [el.get("class")]
            css_sel += "." + ".".join(cls_list[:2])

        # Count child repeating items / cards
        child_cards = len(el.find_all(class_=re.compile(r'col-|card|item|slide|member|service|feature', re.I)))

        # Text snippet
        text_snippet = " ".join(el.get_text(separator=" ", strip=True).split())[:160]

        sections.append(AuditSectionItem(
            id=sec_id,
            url=page_url,
            label=heading,
            page_url=page_url,
            page_id=page_id,
            category_key=category_key,
            heading=heading,
            css_selector=css_sel,
            dom_tag=tag_name,
            preview_snippet=text_snippet,
            child_card_count=child_cards,
            raw_html=str(el),
            checked=True
        ))

    return sections


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
