"""
Classifier — detects tracking scripts, JS categories, font providers,
broken links, and external resources from scraped data.
"""

import re
from urllib.parse import urlparse
from models.schemas import TrackerCategory, JsCategory

# ---------------------------------------------------------------------------
# Tracker patterns  (url fragment or inline code signature)
# ---------------------------------------------------------------------------

TRACKER_PATTERNS: list[tuple[TrackerCategory, list[str]]] = [
    (TrackerCategory.GOOGLE_ANALYTICS, [
        "google-analytics.com/analytics.js",
        "google-analytics.com/ga.js",
        "googletagmanager.com/gtag",
        "gtag(",
        "ga(",
        "UA-",
        "G-",
    ]),
    (TrackerCategory.GOOGLE_TAG_MANAGER, [
        "googletagmanager.com/gtm.js",
        "GTM-",
        "dataLayer",
    ]),
    (TrackerCategory.FACEBOOK_PIXEL, [
        "connect.facebook.net",
        "fbq(",
        "facebook-pixel",
        "_fbq",
    ]),
    (TrackerCategory.HOTJAR, [
        "hotjar.com",
        "hjSetting",
        "hj(",
        "hotjar",
    ]),
    (TrackerCategory.INTERCOM, [
        "intercom.io",
        "intercomSettings",
        "Intercom(",
    ]),
    (TrackerCategory.LIVE_CHAT, [
        "tawk.to",
        "crisp.chat",
        "livechat",
        "zopim",
        "freshchat",
        "drift.com",
        "olark.com",
        "tidio",
        "smartsupp",
    ]),
    (TrackerCategory.BOOT_SCRIPT, [
        "cdn.boot",
        "bootcdn",
        "bootstrapcdn",
    ]),
]

# JS url patterns that indicate the file is a framework/essential lib
ESSENTIAL_JS_PATTERNS = [
    r"jquery[.\-][\d.]+",
    r"react[.\-][\d.]+",
    r"vue[.\-][\d.]+",
    r"angular[.\-][\d.]+",
    r"lodash",
    r"moment",
    r"axios",
    r"bootstrap[.\-][\d.]+",
]

ANALYTICS_JS_PATTERNS = [
    r"analytics",
    r"gtag",
    r"gtm",
    r"pixel",
    r"tracking",
    r"hotjar",
    r"segment",
    r"mixpanel",
    r"heap",
    r"amplitude",
]

CHAT_JS_PATTERNS = [
    r"chat",
    r"intercom",
    r"drift",
    r"crisp",
    r"tawk",
    r"zopim",
    r"tidio",
]


def classify_tracker(src: str, inline_code: str = "") -> TrackerCategory:
    """Return the tracker category for a script src or inline code block."""
    text = (src + " " + inline_code).lower()
    for category, patterns in TRACKER_PATTERNS:
        for p in patterns:
            if p.lower() in text:
                return category
    return TrackerCategory.UNKNOWN


def is_tracker(src: str, inline_code: str = "") -> bool:
    """Return True if the script matches any known tracker pattern."""
    return classify_tracker(src, inline_code) != TrackerCategory.UNKNOWN


def classify_js(url: str) -> JsCategory:
    """Classify a JS file URL into a category."""
    lower = url.lower()
    for pattern in ANALYTICS_JS_PATTERNS:
        if re.search(pattern, lower):
            return JsCategory.ANALYTICS
    for pattern in CHAT_JS_PATTERNS:
        if re.search(pattern, lower):
            return JsCategory.CHAT
    for pattern in ESSENTIAL_JS_PATTERNS:
        if re.search(pattern, lower):
            return JsCategory.FRAMEWORK
    return JsCategory.UNKNOWN


def classify_font_provider(url: str) -> str:
    """Return the font provider name from a URL."""
    lower = url.lower()
    if "fonts.googleapis.com" in lower or "fonts.gstatic.com" in lower:
        return "google"
    if "use.typekit.net" in lower or "typekit.com" in lower:
        return "adobe"
    if "use.fontawesome.com" in lower or "fontawesome" in lower:
        return "fontawesome"
    if "fonts.bunny.net" in lower:
        return "bunny"
    return "self-hosted"


def is_external(asset_url: str, base_domain: str) -> bool:
    """Return True if asset_url is from a different domain than base_domain."""
    try:
        parsed = urlparse(asset_url)
        asset_domain = parsed.netloc.lower().lstrip("www.")
        base = base_domain.lower().lstrip("www.")
        return bool(parsed.scheme) and asset_domain != base and asset_domain != ""
    except Exception:
        return False


def is_font_url(url: str) -> bool:
    """Detect font URLs by extension or known font CDN domains."""
    lower = url.lower()
    font_extensions = (".woff", ".woff2", ".ttf", ".otf", ".eot")
    font_domains = ("fonts.googleapis.com", "fonts.gstatic.com", "use.typekit.net",
                    "use.fontawesome.com", "fonts.bunny.net")
    return (
        any(lower.endswith(ext) for ext in font_extensions) or
        any(d in lower for d in font_domains)
    )
