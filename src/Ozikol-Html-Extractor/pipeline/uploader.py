"""
Phase 3 — Upload kept assets to Cloudinary and rewrite URLs in HTML.

Fetches each kept CSS/JS/font file, uploads to Cloudinary,
then rewrites every reference in the cleaned page HTML.
"""

import logging
import re
import tempfile
import os
from urllib.parse import urlparse

import cloudinary
import cloudinary.uploader
import httpx

from config import settings
from models.schemas import ApplySelectionsResult, AuditResult, CdnAsset, JobStatus, UploadResult

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )
}


def _configure_cloudinary() -> None:
    cloudinary.config(
        cloud_name=settings.cloudinary_cloud_name,
        api_key=settings.cloudinary_api_key,
        api_secret=settings.cloudinary_api_secret,
        secure=True,
    )


def _url_to_public_id(url: str, job_id: str) -> str:
    """Create a stable Cloudinary public_id from a URL."""
    parsed = urlparse(url)
    path = parsed.path.lstrip("/").replace("/", "_")
    # Cloudinary doesn't support dots in folder names easily, replace with dash
    path = re.sub(r"[^\w\-.]", "_", path)
    return f"ozikol/{job_id}/{path}"


from bs4 import BeautifulSoup
from urllib.parse import urljoin

async def run_upload(
    audit: AuditResult,
    cleaned: ApplySelectionsResult,
    job_id: str,
) -> UploadResult:
    """
    Upload all kept CSS/JS/font/image assets to Cloud CDN,
    rewrite URLs in cleaned page HTML, return UploadResult.
    """
    _configure_cloudinary()

    # Collect assets to upload: CSS + JS that were kept
    assets_to_upload: list[str] = list(cleaned.kept_css) + list(cleaned.kept_js)

    # Add fonts from audit that are self-hosted (external font CDNs stay as-is)
    for font in audit.fonts:
        if font.url and font.font_provider == "self-hosted":
            assets_to_upload.append(font.url)

    # Collect all image URLs from cleaned page HTMLs
    image_urls: set[str] = set()
    for diff in cleaned.page_diffs:
        p_html = diff.cleaned_html or ""
        p_soup = BeautifulSoup(p_html, "html.parser")
        p_base = diff.page_url

        # 1. <img> and <source>
        for tag in p_soup.find_all(["img", "source"]):
            src = tag.get("src") or tag.get("data-src")
            if src and not src.startswith(("data:", "blob:", "javascript:")):
                abs_url = urljoin(p_base, src)
                image_urls.add(abs_url)
            srcset = tag.get("srcset")
            if srcset:
                for part in srcset.split(","):
                    chunk = part.strip().split(" ")[0]
                    if chunk and not chunk.startswith(("data:", "blob:")):
                        image_urls.add(urljoin(p_base, chunk))

        # 2. background-image in inline styles
        bg_matches = re.findall(r'url\s*\(\s*[\'"]?([^\'")]+)[\'"]?\s*\)', p_html, re.I)
        for bg in bg_matches:
            if bg and not bg.startswith(("data:", "blob:", "#")):
                if not any(bg.endswith(ext) for ext in (".css", ".js", ".json")):
                    image_urls.add(urljoin(p_base, bg))

    assets_to_upload.extend(list(image_urls))

    cdn_assets: list[CdnAsset] = []
    url_map: dict[str, str] = {}  # original_url -> cdn_url

    async with httpx.AsyncClient(headers=HEADERS, follow_redirects=True, timeout=30, verify=False) as client:
        for asset_url in assets_to_upload:
            cdn_url = await _upload_asset(client, asset_url, job_id)
            if cdn_url:
                url_map[asset_url] = cdn_url
                asset_type = _detect_type(asset_url)
                cdn_assets.append(CdnAsset(
                    original_url=asset_url,
                    cdn_url=cdn_url,
                    asset_type=asset_type,
                    public_id=_url_to_public_id(asset_url, job_id),
                ))

    # Rewrite URLs in each cleaned page
    final_pages: list[dict] = []
    for diff in cleaned.page_diffs:
        html = diff.cleaned_html or ""
        for orig_url, cdn_url in url_map.items():
            html = html.replace(orig_url, cdn_url)
            # Also replace relative versions
            parsed_orig = urlparse(orig_url)
            if parsed_orig.path:
                html = html.replace(parsed_orig.path, cdn_url)
                html = html.replace(parsed_orig.path.lstrip("/"), cdn_url)

        final_pages.append({
            "page_id": diff.page_id,
            "url": diff.page_url,
            "final_html": html,
        })

    return UploadResult(
        job_id=job_id,
        status=JobStatus.COMPLETE,
        cdn_assets=cdn_assets,
        pages=final_pages,
    )


async def _upload_asset(client: httpx.AsyncClient, url: str, job_id: str) -> str | None:
    """Download an asset and upload it to Cloudinary. Returns CDN URL or None."""
    try:
        resp = await client.get(url)
        resp.raise_for_status()
        content = resp.content

        # Write to a temp file so Cloudinary SDK can upload it
        suffix = _get_suffix(url)
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        try:
            public_id = _url_to_public_id(url, job_id)
            detected = _detect_type(url)
            resource_type = "image" if detected == "image" else "raw"

            result = cloudinary.uploader.upload(
                tmp_path,
                public_id=public_id,
                resource_type=resource_type,
                overwrite=True,
                use_filename=False,
            )
            cdn_url: str = result.get("secure_url", "")
            logger.info("Uploaded %s -> %s", url, cdn_url)
            return cdn_url
        finally:
            os.unlink(tmp_path)

    except Exception as exc:
        logger.warning("Failed to upload %s: %s", url, exc)
        return None


def _detect_type(url: str) -> str:
    lower = url.lower()
    if any(lower.endswith(ext) or ext in lower for ext in (".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif", ".ico", ".avif")):
        return "image"
    if ".css" in lower:
        return "css"
    if ".js" in lower:
        return "js"
    if any(lower.endswith(ext) for ext in (".woff", ".woff2", ".ttf", ".otf", ".eot")):
        return "font"
    return "raw"


def _get_suffix(url: str) -> str:
    parsed = urlparse(url)
    path = parsed.path
    if "." in path.split("/")[-1]:
        return "." + path.split("/")[-1].split(".")[-1]
    return ".bin"
