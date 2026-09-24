"""
Page Crawler & Navigation Tree Discovery Engine.

Discovers internal linked pages from website navigation menus and footers,
resolves relative paths, and fetches HTML documents and stylesheets for
multi-page section decomposition.
"""

import asyncio
import logging
import re
from typing import Dict, List, Optional, Set, Tuple
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup
import httpx

logger = logging.getLogger(__name__)

# Headers mimicking modern desktop browser
BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1"
}


def is_cloudflare_or_bot_challenge(status_code: int, html_or_title: str) -> bool:
    """
    Detects if the response is a Cloudflare Under Attack / Turnstile / DDoS challenge page.
    """
    if status_code in (403, 503):
        return True
    low = html_or_title.lower()
    challenge_signatures = [
        "checking your browser",
        "just a moment...",
        "cf-browser-verification",
        "challenge-platform",
        "turnstile",
        "cloudflare ray id",
        "enable javascript and cookies to continue"
    ]
    return any(sig in low for sig in challenge_signatures)


def _fetch_html_playwright_sync(url: str, timeout_seconds: float = 35.0) -> Tuple[str, str, List[str]]:
    """
    Synchronous Playwright execution executed in an isolated worker thread.
    Immune to Windows asyncio event loop selector/proactor NotImplementedError conflicts.
    """
    import time
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        try:
            browser = p.chromium.launch(channel="chrome", headless=True)
        except Exception:
            browser = p.chromium.launch(headless=True)

        context = browser.new_context(
            user_agent=BROWSER_HEADERS["User-Agent"],
            viewport={"width": 1920, "height": 1080}
        )
        page = context.new_page()
        try:
            try:
                page.goto(url, wait_until="commit", timeout=int(timeout_seconds * 1000))
            except Exception as nav_err:
                logger.warning("page.goto commit warning for '%s': %s", url, nav_err)

            # 1. Wait for Cloudflare challenge redirect / solver
            for _ in range(25):
                time.sleep(0.5)
                try:
                    title = page.title()
                    if not is_cloudflare_or_bot_challenge(200, title):
                        break
                except Exception:
                    pass

            # 2. Wait for destination page DOM to stabilize after challenge redirect
            try:
                page.wait_for_load_state("domcontentloaded", timeout=12000)
            except Exception:
                pass

            time.sleep(1.0)

            # 3. Retry guard for page.content() to prevent mid-navigation errors
            html = ""
            for attempt in range(8):
                try:
                    html = page.content()
                    if html and len(html) > 500:
                        break
                except Exception as content_err:
                    logger.debug("Attempt %s page.content() caught navigating: %s. Retrying...", attempt + 1, content_err)
                    time.sleep(0.8)

            final_url = page.url

            # 4. Extract and download all stylesheets via context.request (inherits Cloudflare session cookies)
            css_snippets: List[str] = []
            try:
                soup = BeautifulSoup(html, "lxml")
                css_links = []
                for link in soup.find_all("link", rel=True):
                    rel = " ".join(link["rel"]) if isinstance(link["rel"], list) else link["rel"]
                    if "stylesheet" in str(rel).lower():
                        href = link.get("href", "").strip()
                        if href and not ("fonts.googleapis.com" in href or "use.typekit.net" in href):
                            css_links.append(urljoin(final_url, href))

                for l_url in css_links[:12]:
                    try:
                        r = context.request.get(l_url, timeout=10000)
                        if r.status == 200:
                            css_snippets.append(r.text())
                    except Exception:
                        pass
            except Exception as e:
                logger.warning("Could not download stylesheets via Playwright context: %s", e)

            return html, final_url, css_snippets
        finally:
            browser.close()


async def fetch_html_playwright(url: str, timeout_seconds: float = 35.0) -> Tuple[str, str, List[str]]:
    """
    Asynchronous bridge that offloads Playwright browser execution to a dedicated OS thread.
    """
    return await asyncio.to_thread(_fetch_html_playwright_sync, url, timeout_seconds)


def _fetch_stylesheets_authenticated_sync(base_url: str, stylesheet_links: List[str]) -> List[str]:
    """
    Downloads external stylesheets using Playwright's authenticated session context.
    Bypasses Cloudflare anti-bot 403 Forbidden blocks on external asset CDNs and theme demos.
    """
    import time
    from playwright.sync_api import sync_playwright

    if not stylesheet_links:
        return []

    with sync_playwright() as p:
        try:
            browser = p.chromium.launch(channel="chrome", headless=True)
        except Exception:
            browser = p.chromium.launch(headless=True)

        context = browser.new_context(
            user_agent=BROWSER_HEADERS["User-Agent"],
            viewport={"width": 1920, "height": 1080}
        )
        page = context.new_page()
        try:
            if base_url and base_url.startswith("http"):
                try:
                    page.goto(base_url, wait_until="commit", timeout=15000)
                    for _ in range(15):
                        time.sleep(0.3)
                        try:
                            title = page.title()
                            if not is_cloudflare_or_bot_challenge(200, title):
                                break
                        except Exception:
                            pass
                except Exception as exc:
                    logger.debug("Page goto in stylesheet fetcher: %s", exc)

            downloaded_css: List[str] = []
            for s_url in stylesheet_links[:25]:
                file_name = s_url.split('/')[-1].split('?')[0]
                candidates = [s_url]
                if base_url and base_url.startswith("http"):
                    candidates.append(urljoin(base_url, f"assets/css/{file_name}"))
                    candidates.append(urljoin(base_url, f"css/{file_name}"))
                    candidates.append(urljoin(base_url, f"assets/{file_name}"))
                    candidates.append(urljoin(base_url, file_name))

                for cand_url in list(dict.fromkeys(candidates)):
                    try:
                        r = context.request.get(cand_url, timeout=7000)
                        if r.status == 200:
                            downloaded_css.append(r.text())
                            break
                    except Exception:
                        pass

            return downloaded_css
        finally:
            browser.close()


def _fetch_stylesheets_detailed_sync(base_url: str, stylesheet_links: List[str]) -> List[dict]:
    """
    Downloads external stylesheets and returns structured metadata (name, url, size_kb, content).
    Automatically resolves candidate paths for browser-saved HTML files (e.g. `_files/` folders).
    """
    import time
    from playwright.sync_api import sync_playwright

    if not stylesheet_links:
        return []

    with sync_playwright() as p:
        try:
            browser = p.chromium.launch(channel="chrome", headless=True)
        except Exception:
            browser = p.chromium.launch(headless=True)

        context = browser.new_context(
            user_agent=BROWSER_HEADERS["User-Agent"],
            viewport={"width": 1920, "height": 1080}
        )
        page = context.new_page()
        try:
            if base_url and base_url.startswith("http"):
                try:
                    page.goto(base_url, wait_until="commit", timeout=15000)
                    for _ in range(15):
                        time.sleep(0.3)
                        try:
                            title = page.title()
                            if not is_cloudflare_or_bot_challenge(200, title):
                                break
                        except Exception:
                            pass
                except Exception as exc:
                    logger.debug("Page goto in detailed stylesheet fetcher: %s", exc)

            results: List[dict] = []
            seen_files: Set[str] = set()

            for s_url in stylesheet_links[:30]:
                file_name = s_url.split('/')[-1].split('?')[0] or "stylesheet.css"
                if file_name in seen_files:
                    continue

                candidates = [s_url]
                if base_url and base_url.startswith("http"):
                    candidates.append(urljoin(base_url, f"assets/css/{file_name}"))
                    candidates.append(urljoin(base_url, f"css/{file_name}"))
                    candidates.append(urljoin(base_url, f"assets/{file_name}"))
                    candidates.append(urljoin(base_url, file_name))

                downloaded = False
                for cand_url in list(dict.fromkeys(candidates)):
                    try:
                        r = context.request.get(cand_url, timeout=7000)
                        if r.status == 200:
                            text_content = r.text()
                            size_kb = round(len(text_content.encode('utf-8')) / 1024, 1)
                            results.append({
                                "name": file_name,
                                "url": cand_url,
                                "asset_type": "css",
                                "size_kb": size_kb,
                                "content": text_content
                            })
                            seen_files.add(file_name)
                            downloaded = True
                            break
                    except Exception as exc:
                        logger.debug("Could not download candidate '%s': %s", cand_url, exc)

                if not downloaded:
                    logger.warning("Could not download stylesheet '%s' from any candidate path", s_url)

            return results
        finally:
            browser.close()


async def fetch_stylesheets_authenticated(base_url: str, stylesheet_links: List[str]) -> List[str]:
    """
    Asynchronous bridge for downloading stylesheets with Playwright session authentication.
    """
    return await asyncio.to_thread(_fetch_stylesheets_authenticated_sync, base_url, stylesheet_links)


async def fetch_stylesheets_detailed(base_url: str, stylesheet_links: List[str]) -> List[dict]:
    """
    Asynchronous bridge for downloading detailed stylesheets with file metadata.
    """
    return await asyncio.to_thread(_fetch_stylesheets_detailed_sync, base_url, stylesheet_links)



async def fetch_page_resilient(
    url: str, 
    client: httpx.AsyncClient, 
    timeout_seconds: float = 30.0
) -> Tuple[str, str, List[str]]:
    """
    Attempts high-speed HTTPX retrieval first. If Cloudflare/Anti-bot challenge is encountered,
    seamlessly escalates to Playwright headless browser to solve the challenge and download stylesheets.
    """
    try:
        resp = await client.get(url, timeout=8.0)
        html = resp.text
        if not is_cloudflare_or_bot_challenge(resp.status_code, html):
            return html, str(resp.url), []
        logger.info("Cloudflare challenge encountered on '%s' (HTTP %s). Escalating to headless browser solver...", url, resp.status_code)
    except Exception as exc:
        logger.warning("HTTPX fetch failed for '%s': %s. Attempting headless browser fallback...", url, exc)

    return await fetch_html_playwright(url, timeout_seconds=timeout_seconds)


async def discover_menu_pages_only(
    start_url: str,
    timeout_seconds: float = 35.0
) -> List[dict]:
    """
    Fast discovery: Fetches the homepage DOM, inspects navigation menus (<header>, <nav>, topbars),
    and returns the list of discovered page links without downloading stylesheets or slicing sections.
    """
    start_url = start_url.strip()
    parsed_base = urlparse(start_url)
    base_domain = parsed_base.netloc.lower()

    pages: List[dict] = []
    seen_urls: Set[str] = set()

    async with httpx.AsyncClient(headers=BROWSER_HEADERS, timeout=timeout_seconds, follow_redirects=True) as client:
        try:
            html, final_url, _ = await fetch_page_resilient(start_url, client, timeout_seconds=timeout_seconds)
        except Exception as exc:
            err_msg = str(exc).strip() or exc.__class__.__name__
            logger.error("Failed to fetch URL for menu discovery '%s': %s", start_url, err_msg)
            raise ValueError(f"Unable to access URL: {err_msg}")

        norm_home = _normalize_url(final_url)
        seen_urls.add(norm_home)

        soup = BeautifulSoup(html, "lxml")
        home_title = _extract_page_title(soup) or "Home"

        pages.append({
            "title": home_title,
            "slug": "home",
            "url": final_url,
            "is_home": True,
            "menu_sort_order": 10
        })

        candidate_links = _extract_navigation_links(soup, final_url, base_domain)
        order = 20
        for link_title, link_url in candidate_links:
            norm = _normalize_url(link_url)
            if norm in seen_urls:
                continue
            seen_urls.add(norm)
            slug = _generate_slug(link_title, link_url)
            pages.append({
                "title": link_title,
                "slug": slug,
                "url": link_url,
                "is_home": False,
                "menu_sort_order": order
            })
            order += 10

    return pages


def _crawl_all_pages_playwright_sync(
    start_url: str,
    max_subpages: int = 5,
    allowed_urls: Optional[List[str]] = None,
    timeout_seconds: float = 35.0
) -> Tuple[List[dict], str, List[str]]:
    """
    Crawls home and all subpages within a single authenticated Playwright browser session.
    Reuses the Cloudflare clearance cookie across all subpages for fast (0.5s) crawl speeds.
    """
    import time
    from playwright.sync_api import sync_playwright

    start_url = start_url.strip()
    parsed_base = urlparse(start_url)
    base_domain = parsed_base.netloc.lower()

    discovered_pages: List[dict] = []
    external_fonts: List[str] = []
    combined_css_parts: List[str] = []
    visited_urls: Set[str] = set()

    allowed_norm_set: Optional[Set[str]] = None
    if allowed_urls is not None and len(allowed_urls) > 0:
        allowed_norm_set = {_normalize_url(u) for u in allowed_urls}

    with sync_playwright() as p:
        try:
            browser = p.chromium.launch(channel="chrome", headless=True)
        except Exception:
            browser = p.chromium.launch(headless=True)

        context = browser.new_context(
            user_agent=BROWSER_HEADERS["User-Agent"],
            viewport={"width": 1920, "height": 1080}
        )
        page = context.new_page()
        try:
            # 1. Fetch Primary Page (Home) & Solve Challenge
            try:
                page.goto(start_url, wait_until="commit", timeout=int(timeout_seconds * 1000))
            except Exception as e:
                logger.warning("Home page.goto warning: %s", e)

            for _ in range(25):
                time.sleep(0.5)
                try:
                    title = page.title()
                    if not is_cloudflare_or_bot_challenge(200, title):
                        break
                except Exception:
                    pass

            try:
                page.wait_for_load_state("domcontentloaded", timeout=12000)
            except Exception:
                pass
            time.sleep(1.0)

            home_html = ""
            for _ in range(6):
                try:
                    home_html = page.content()
                    if home_html and len(home_html) > 500:
                        break
                except Exception:
                    time.sleep(0.5)

            final_home_url = page.url
            norm_home = _normalize_url(final_home_url)
            visited_urls.add(norm_home)

            home_soup = BeautifulSoup(home_html, "lxml")
            home_title = _extract_page_title(home_soup) or "Home"

            # Initialize CSS cache across the browser session
            css_cache: Dict[str, str] = {}

            # Extract Stylesheets from Home Page
            home_css, home_fonts, _ = _extract_css_and_fonts_sync(home_soup, final_home_url, context, css_cache=css_cache)
            if home_css:
                combined_css_parts.append(home_css)
            external_fonts.extend(home_fonts)

            if allowed_norm_set is None or norm_home in allowed_norm_set:
                discovered_pages.append({
                    "title": home_title,
                    "slug": "home",
                    "url": final_home_url,
                    "html": home_html,
                    "is_home": True,
                    "menu_sort_order": 10
                })

            # 2. Discover links from navigation
            candidate_links = _extract_navigation_links(home_soup, final_home_url, base_domain)

            # If user provided explicit page URLs, ensure all are included
            if allowed_urls is not None:
                for a_url in allowed_urls:
                    norm_a = _normalize_url(a_url)
                    if norm_a != norm_home and not any(_normalize_url(cl[1]) == norm_a for cl in candidate_links):
                        p_slug = _generate_slug("Page", a_url)
                        candidate_links.append((p_slug.title(), a_url))

            # 3. Fast crawl subpages in the same session
            fetched_count = 0
            menu_order = 20

            for link_title, link_url in candidate_links:
                norm_url = _normalize_url(link_url)
                if norm_url in visited_urls:
                    continue

                if allowed_norm_set is not None:
                    if norm_url not in allowed_norm_set:
                        continue
                else:
                    if fetched_count >= max_subpages:
                        continue

                visited_urls.add(norm_url)
                slug = _generate_slug(link_title, link_url)

                try:
                    page.goto(link_url, wait_until="domcontentloaded", timeout=10000)
                    time.sleep(0.3)

                    sub_html = page.content()
                    sub_final_url = page.url
                    sub_soup = BeautifulSoup(sub_html, "lxml")
                    sub_title = _extract_page_title(sub_soup) or link_title

                    sub_css, sub_fonts, _ = _extract_css_and_fonts_sync(sub_soup, sub_final_url, context, css_cache=css_cache)
                    if sub_css:
                        combined_css_parts.append(sub_css)
                    if sub_fonts:
                        external_fonts.extend(sub_fonts)

                    discovered_pages.append({
                        "title": sub_title,
                        "slug": slug,
                        "url": sub_final_url,
                        "html": sub_html,
                        "is_home": False,
                        "menu_sort_order": menu_order
                    })
                    menu_order += 10
                    fetched_count += 1
                except Exception as sub_exc:
                    logger.warning("Could not crawl subpage '%s': %s", link_url, sub_exc)

        finally:
            browser.close()

    combined_css = "\n\n".join(combined_css_parts)
    unique_fonts = list(dict.fromkeys(external_fonts))
    return discovered_pages, combined_css, unique_fonts


def _extract_css_and_fonts_sync(
    soup: BeautifulSoup, 
    page_url: str, 
    context,
    css_cache: Optional[Dict[str, str]] = None
) -> Tuple[str, List[str], List[str]]:
    """Synchronous CSS and font extractor that uses the authenticated browser context with caching."""
    css_snippets: List[str] = []
    font_urls: List[str] = []
    stylesheet_links: List[str] = []

    for style_tag in soup.find_all("style"):
        if style_tag.string:
            css_snippets.append(style_tag.string)

    for link in soup.find_all("link", rel=True):
        rel = link.get("rel")
        if isinstance(rel, list):
            rel = " ".join(rel).lower()
        else:
            rel = str(rel).lower()

        href = link.get("href", "").strip()
        if not href:
            continue

        abs_href = urljoin(page_url, href)

        if "fonts.googleapis.com" in abs_href or "use.typekit.net" in abs_href or "cdnjs.cloudflare.com/ajax/libs/font-awesome" in abs_href:
            font_urls.append(abs_href)
            continue

        if "stylesheet" in rel:
            stylesheet_links.append(abs_href)

    for s_url in stylesheet_links[:12]:
        if css_cache is not None and s_url in css_cache:
            css_snippets.append(css_cache[s_url])
            continue

        try:
            r = context.request.get(s_url, timeout=6000)
            if r.status == 200:
                css_text = r.text()
                if css_cache is not None:
                    css_cache[s_url] = css_text
                css_snippets.append(css_text)
        except Exception:
            pass

    return "\n\n".join(css_snippets), font_urls, stylesheet_links


async def crawl_website_and_discover_pages(
    start_url: str,
    max_subpages: int = 5,
    allowed_urls: Optional[List[str]] = None,
    timeout_seconds: float = 35.0
) -> Tuple[List[dict], str, List[str]]:
    """
    Crawls the target homepage and discovers all internal pages in the navigation menu.
    Uses thread-safe single-session browser crawling for fast, authenticated retrieval.
    """
    return await asyncio.to_thread(
        _crawl_all_pages_playwright_sync,
        start_url,
        max_subpages,
        allowed_urls,
        timeout_seconds
    )


def _extract_navigation_links(soup: BeautifulSoup, base_url: str, base_domain: str) -> List[Tuple[str, str]]:
    """
    Extracts navigation links from <header>, <nav>, and top menu bars.
    """
    links: List[Tuple[str, str]] = []
    seen_urls: Set[str] = set()

    # Search in header or nav first
    nav_nodes = soup.find_all(["header", "nav"]) or [soup]

    for node in nav_nodes:
        for a_tag in node.find_all("a", href=True):
            raw_href = a_tag["href"].strip()
            title = a_tag.get_text(" ", strip=True)

            if not raw_href or raw_href.startswith(("#", "javascript:", "mailto:", "tel:")):
                continue

            abs_url = urljoin(base_url, raw_href)
            parsed = urlparse(abs_url)

            # Keep only same-domain HTTP/HTTPS links
            if parsed.netloc.lower() == base_domain and parsed.scheme in ("http", "https"):
                norm = _normalize_url(abs_url)
                if norm not in seen_urls and norm != _normalize_url(base_url):
                    seen_urls.add(norm)
                    display_title = title if len(title) > 1 else (parsed.path.strip("/").replace("-", " ").title() or "Page")
                    links.append((display_title, abs_url))

    return links


async def _extract_css_and_fonts(
    soup: BeautifulSoup,
    page_url: str,
    client: httpx.AsyncClient
) -> Tuple[str, List[str], List[str]]:
    """
    Extracts all inline <style> content, downloads external <link rel="stylesheet"> files,
    and identifies web font links (Google Fonts, Adobe Typekit, FontAwesome).
    """
    css_snippets: List[str] = []
    font_urls: List[str] = []
    stylesheet_links: List[str] = []

    # 1. Inline styles
    for style_tag in soup.find_all("style"):
        if style_tag.string:
            css_snippets.append(style_tag.string)

    # 2. External stylesheets and font links
    for link in soup.find_all("link", rel=True):
        rel = link.get("rel")
        if isinstance(rel, list):
            rel = " ".join(rel).lower()
        else:
            rel = str(rel).lower()

        href = link.get("href", "").strip()
        if not href:
            continue

        abs_href = urljoin(page_url, href)

        if "fonts.googleapis.com" in abs_href or "use.typekit.net" in abs_href or "cdnjs.cloudflare.com/ajax/libs/font-awesome" in abs_href:
            font_urls.append(abs_href)
            continue

        if "stylesheet" in rel:
            stylesheet_links.append(abs_href)

    # Download external stylesheets concurrently (up to 8 sheets)
    async def _fetch_sheet(url: str) -> Optional[str]:
        try:
            resp = await client.get(url, timeout=8.0)
            if resp.status_code == 200:
                return resp.text
        except Exception:
            pass
        return None

    tasks = [_fetch_sheet(u) for u in stylesheet_links[:8]]
    if tasks:
        results = await asyncio.gather(*tasks)
        for r in results:
            if r:
                css_snippets.append(r)

    return "\n\n".join(css_snippets), font_urls, stylesheet_links


def _extract_page_title(soup: BeautifulSoup) -> Optional[str]:
    """Extracts a clean title from <title> or <h1> tag."""
    if soup.title and soup.title.string:
        t = soup.title.string.strip()
        # Strip common site name separators like " | Acme Corp" or " - Welcome"
        t = re.split(r'[\-|•–—]\s*', t)[0].strip()
        if t:
            return t
    h1 = soup.find("h1")
    if h1:
        return h1.get_text(" ", strip=True)[:60]
    return None


def _generate_slug(title: str, url: str) -> str:
    """Generates a clean URL slug from title or path."""
    parsed = urlparse(url)
    path_part = parsed.path.strip("/").split("/")[-1]
    if path_part and not path_part.endswith((".html", ".htm", ".php", ".aspx")):
        slug = re.sub(r'[^a-zA-Z0-9_-]', '', path_part).lower()
        if slug:
            return slug

    clean_t = re.sub(r'[^a-zA-Z0-9\s_-]', '', title).strip().lower()
    return re.sub(r'[\s_]+', '-', clean_t)[:30] or "page"


def _normalize_url(url: str) -> str:
    """Removes trailing slash and fragment for deduplication."""
    parsed = urlparse(url)
    path = parsed.path.rstrip("/")
    return f"{parsed.scheme}://{parsed.netloc}{path}"
