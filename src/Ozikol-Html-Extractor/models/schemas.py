"""
Pydantic models for all request/response schemas.
"""

from enum import Enum
from typing import Any, Optional
from pydantic import BaseModel


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class JobStatus(str, Enum):
    PENDING   = "pending"
    AUDITING  = "auditing"
    AUDITED   = "audited"
    CLEANING  = "cleaning"
    CLEANED   = "cleaned"
    UPLOADING = "uploading"
    COMPLETE  = "complete"
    FAILED    = "failed"


class AssetType(str, Enum):
    CSS      = "css"
    JS       = "js"
    FONT     = "font"
    PAGE     = "page"
    LINK     = "link"
    META_TAG = "meta_tag"
    TRACKER  = "tracker"
    EXTERNAL = "external"


class TrackerCategory(str, Enum):
    GOOGLE_ANALYTICS  = "google_analytics"
    GOOGLE_TAG_MANAGER = "google_tag_manager"
    FACEBOOK_PIXEL    = "facebook_pixel"
    HOTJAR            = "hotjar"
    INTERCOM          = "intercom"
    LIVE_CHAT         = "live_chat"
    BOOT_SCRIPT       = "boot_script"
    UNKNOWN           = "unknown"


class JsCategory(str, Enum):
    ANALYTICS  = "analytics"
    CHAT       = "chat"
    ESSENTIAL  = "essential"
    FRAMEWORK  = "framework"
    UNKNOWN    = "unknown"


# ---------------------------------------------------------------------------
# Audit item — every scraped asset/page/tag gets one of these
# ---------------------------------------------------------------------------

class AuditItem(BaseModel):
    id: str                          # unique stable id for this item
    type: AssetType
    url: Optional[str] = None        # absolute URL (for css/js/font/page/link)
    label: str                       # human-readable label
    checked: bool = True             # default keep; user unchecks to delete
    size_bytes: Optional[int] = None
    preview_url: Optional[str] = None  # API endpoint to preview this item
    extra: Optional[dict[str, Any]] = None  # catch-all for type-specific data


class CssItem(AuditItem):
    type: AssetType = AssetType.CSS


class JsItem(AuditItem):
    type: AssetType = AssetType.JS
    js_category: JsCategory = JsCategory.UNKNOWN


class FontItem(AuditItem):
    type: AssetType = AssetType.FONT
    font_provider: Optional[str] = None   # "google", "adobe", "self-hosted"


class PageItem(AuditItem):
    type: AssetType = AssetType.PAGE
    title: Optional[str] = None
    html: Optional[str] = None           # full raw HTML


class BrokenLinkItem(AuditItem):
    type: AssetType = AssetType.LINK
    checked: bool = False               # broken links default to unchecked
    found_on_page: Optional[str] = None  # which page contained this link
    reason: Optional[str] = None         # why it is broken


class MetaTagItem(AuditItem):
    type: AssetType = AssetType.META_TAG
    page_url: str                        # which page this meta belongs to
    tag_name: str                        # e.g. "og:title", "description"
    content: Optional[str] = None


class TrackerItem(AuditItem):
    type: AssetType = AssetType.TRACKER
    checked: bool = False               # trackers default to unchecked (delete)
    tracker_category: TrackerCategory = TrackerCategory.UNKNOWN
    found_on_pages: list[str] = []


class ExternalItem(AuditItem):
    type: AssetType = AssetType.EXTERNAL
    domain: Optional[str] = None


# ---------------------------------------------------------------------------
# Audit result — full Phase 1 response
# ---------------------------------------------------------------------------

class AuditResult(BaseModel):
    job_id: str
    source_url: str
    status: JobStatus = JobStatus.AUDITED

    css_files:     list[CssItem]      = []
    js_files:      list[JsItem]       = []
    fonts:         list[FontItem]     = []
    pages:         list[PageItem]     = []
    broken_links:  list[BrokenLinkItem] = []
    meta_tags:     list[MetaTagItem]  = []
    trackers:      list[TrackerItem]  = []
    external_resources: list[ExternalItem] = []

    total_pages:   int = 0
    total_assets:  int = 0


# ---------------------------------------------------------------------------
# Selection — what the user sends back in Phase 2
# ---------------------------------------------------------------------------

class SelectionItem(BaseModel):
    id: str
    checked: bool


class ApplySelectionsRequest(BaseModel):
    selections: list[SelectionItem]


class PageDiff(BaseModel):
    page_url: str
    page_id: str
    removed_css:   list[str] = []
    removed_js:    list[str] = []
    removed_metas: list[str] = []
    removed_trackers: list[str] = []
    cleaned_html:  Optional[str] = None


class ApplySelectionsResult(BaseModel):
    job_id: str
    status: JobStatus = JobStatus.CLEANED
    kept_css:      list[str] = []
    kept_js:       list[str] = []
    kept_pages:    list[str] = []
    removed_total: int = 0
    page_diffs:    list[PageDiff] = []


# ---------------------------------------------------------------------------
# Upload — Phase 3
# ---------------------------------------------------------------------------

class CdnAsset(BaseModel):
    original_url: str
    cdn_url: str
    asset_type: str
    public_id: str


class UploadResult(BaseModel):
    job_id: str
    status: JobStatus = JobStatus.COMPLETE
    cdn_assets: list[CdnAsset] = []
    pages:      list[dict[str, Any]] = []   # { url, final_html }


# ---------------------------------------------------------------------------
# Generic responses
# ---------------------------------------------------------------------------

class StartJobRequest(BaseModel):
    url: str


class StartJobResponse(BaseModel):
    job_id: str
    status: JobStatus = JobStatus.PENDING
    message: str = "Job started. Poll /jobs/{job_id}/audit for results."


class JobStatusResponse(BaseModel):
    job_id: str
    status: JobStatus
    message: Optional[str] = None


class ErrorResponse(BaseModel):
    detail: str
