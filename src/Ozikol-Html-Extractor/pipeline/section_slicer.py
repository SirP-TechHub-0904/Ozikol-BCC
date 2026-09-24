"""
Semantic Section Slicing & DOM Decomposition Engine.

Splits an entire web page DOM into modular, classified section blocks:
- Navigation & Topbar (Category: menu)
- Hero & Sliders (Category: hero)
- Labeled Body Sections (Features, Stats, Pricing, Testimonials, Contact, CTA, FAQ, Team) (Category: body)
- Blogs & News (Category: blog)
- Breadcrumbs & Page Headers (Category: breadcrumb)
- E-Commerce (Category: ecommerce)
- Footers (Category: footer)
"""

import logging
import re
import uuid
from typing import Any, List, Optional, Tuple
from bs4 import BeautifulSoup, Tag

logger = logging.getLogger(__name__)


def slice_page_into_sections(
    html_content: str,
    page_url: str = "",
    page_slug: str = "home",
    page_title: str = "Home Page"
) -> List[dict[str, Any]]:
    """
    Decomposes an HTML page into independent, semantically classified section dictionaries.

    :param html_content: Raw or cleaned HTML markup.
    :param page_url: The source URL of the page.
    :param page_slug: Short slug identifying the parent page (e.g. 'home', 'about', 'contact').
    :param page_title: Human-readable title of the parent page.
    :returns: A list of classified section dictionaries ready for CSS extraction and tokenization.
    """
    soup = BeautifulSoup(html_content, "lxml")

    # Remove non-rendering tags
    for tag in soup(["script", "style", "noscript", "iframe"]):
        tag.decompose()

    body = soup.body or soup
    sections_out: List[dict[str, Any]] = []

    # -------------------------------------------------------------------------
    # 1. Extract Navigation / Topbar (Category: menu)
    # -------------------------------------------------------------------------
    nav_node = _find_and_extract_nav(body)
    if nav_node:
        sections_out.append(_build_section_record(
            soup_node=nav_node,
            category_key="menu",
            variant_code="Menu_HeaderNavbar",
            name=f"{page_title} - Header Navigation & Brand Bar",
            label="Navigation Bar",
            description="Header navigation bar with logo branding, menu items, and portal action link.",
            preview_icon="menu",
            thumbnail_gradient="linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
            page_slug=page_slug,
            sort_order=10,
            page_url=page_url
        ))

    # -------------------------------------------------------------------------
    # 2. Extract Footer (Category: footer)
    # -------------------------------------------------------------------------
    footer_node = _find_and_extract_footer(body)
    footer_record = None
    if footer_node:
        footer_record = _build_section_record(
            soup_node=footer_node,
            category_key="footer",
            variant_code="Footer_CorporateMultiCol",
            name=f"{page_title} - Corporate Multi-Column Footer",
            label="Corporate Footer",
            description="Multi-column footer layout with quick navigation links, contact information, and legal copyright.",
            preview_icon="dock_to_bottom",
            thumbnail_gradient="linear-gradient(135deg, #0f172a 0%, #1e1e24 100%)",
            page_slug=page_slug,
            sort_order=999,
            page_url=page_url
        )

    # -------------------------------------------------------------------------
    # 3. Extract Hero / Breadcrumb / Banner
    # -------------------------------------------------------------------------
    hero_node = _find_and_extract_hero(body, page_slug)
    if hero_node:
        is_inner_page = page_slug not in ("home", "index", "")
        cat_key = "breadcrumb" if is_inner_page else "hero"
        v_code = "Breadcrumb_PageHeader" if is_inner_page else "Hero_MainSlider"
        v_label = "Breadcrumb Header" if is_inner_page else "Hero Showcase"
        v_icon = "linear_scale" if is_inner_page else "view_carousel"
        v_grad = "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)" if is_inner_page else "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)"

        sections_out.append(_build_section_record(
            soup_node=hero_node,
            category_key=cat_key,
            variant_code=v_code,
            name=f"{page_title} - {v_label}",
            label=v_label,
            description="Above-the-fold hero section with headline, supporting copy, and primary call-to-action.",
            preview_icon=v_icon,
            thumbnail_gradient=v_grad,
            page_slug=page_slug,
            sort_order=20,
            page_url=page_url
        ))

    # -------------------------------------------------------------------------
    # 4. Extract Remaining Body Sections
    # -------------------------------------------------------------------------
    body_nodes = _discover_body_sections(body)
    current_sort = 30

    for idx, b_node in enumerate(body_nodes, start=1):
        # Classify the specific type of body section (Features, Pricing, Stats, Contact, Blog, etc.)
        cat_key, v_code, label, icon, grad, desc = _classify_body_node(b_node, idx, page_slug)

        sections_out.append(_build_section_record(
            soup_node=b_node,
            category_key=cat_key,
            variant_code=v_code,
            name=f"{page_title} - {label}",
            label=label,
            description=desc,
            preview_icon=icon,
            thumbnail_gradient=grad,
            page_slug=page_slug,
            sort_order=current_sort,
            page_url=page_url
        ))
        current_sort += 10

    # Append footer at the end of the section flow
    if footer_record:
        sections_out.append(footer_record)

    return sections_out


# -----------------------------------------------------------------------------
# DOM Discovery & Extraction Helpers
# -----------------------------------------------------------------------------

def _find_and_extract_nav(body: Tag) -> Optional[Tag]:
    """Finds and detaches the main header/nav element."""
    # Priority selectors for navigation
    candidates = body.find_all(["header", "nav"], recursive=True)
    if candidates:
        first = candidates[0]
        # Return the topmost ancestor if wrapped in a header
        header_parent = first.find_parent("header")
        node_to_extract = header_parent if header_parent else first
        node_to_extract.extract()
        return node_to_extract

    # Class-based fallback
    class_candidates = body.find_all(attrs={"class": re.compile(r'navbar|site-header|main-header|header-wrapper|top-bar', re.I)})
    if class_candidates:
        first = class_candidates[0]
        first.extract()
        return first

    return None


def _find_and_extract_footer(body: Tag) -> Optional[Tag]:
    """Finds and detaches the main footer element."""
    candidates = body.find_all("footer", recursive=True)
    if candidates:
        last = candidates[-1]
        last.extract()
        return last

    class_candidates = body.find_all(attrs={"class": re.compile(r'site-footer|main-footer|footer-wrapper|page-footer', re.I)})
    if class_candidates:
        last = class_candidates[-1]
        last.extract()
        return last

    return None


def _find_and_extract_hero(body: Tag, page_slug: str) -> Optional[Tag]:
    """
    Finds and detaches the specific top hero / slider / breadcrumb block without
    accidentally extracting outer full-page wrapper containers.
    """
    hero_selectors = re.compile(r'hero|banner|slider|intro|masthead|page-header|breadcrumb|jumbotron', re.I)
    wrapper_classes = re.compile(r'wrapper|site-wrap|page-wrap|body-wrap|main-wrap|layout|content-wrap', re.I)

    # 1. Look for direct section tags matching hero
    direct_hero = body.find(lambda el: el.name in ("section", "div", "header") and 
                                  hero_selectors.search(" ".join(el.get("class", []))) and
                                  not wrapper_classes.search(" ".join(el.get("class", []))))
    if direct_hero:
        direct_hero.extract()
        return direct_hero

    # 2. Check immediate top children
    for child in body.find_all(recursive=False):
        if not isinstance(child, Tag):
            continue
        c_class = " ".join(child.get("class", [])) if child.get("class") else ""
        if wrapper_classes.search(c_class):
            continue
        if hero_selectors.search(c_class) or child.find(["h1", "h2"]):
            child.extract()
            return child

    # 3. Deep search for specific hero section
    deep_hero = body.find(attrs={"class": hero_selectors})
    if deep_hero:
        # If deep_hero is already a section or specific block
        c_class = " ".join(deep_hero.get("class", [])) if deep_hero.get("class") else ""
        if not wrapper_classes.search(c_class):
            deep_hero.extract()
            return deep_hero

    return None


def _discover_body_sections(body: Tag) -> List[Tag]:
    """
    Discovers granular modular section nodes inside the remaining body/main,
    drilling through page wrapper divs to find individual <section> and content blocks.
    """
    wrapper_classes = re.compile(r'wrapper|site-wrap|page-wrap|body-wrap|main-wrap|layout|app-root', re.I)

    # Search for all semantic <section> or <article> tags
    all_sections = body.find_all(["section", "article"], recursive=True)
    if all_sections:
        # Filter out nested sections to keep top-level section blocks
        top_sections = []
        for s in all_sections:
            if not s.find_parent(["section", "article"]):
                if len(s.get_text(strip=True)) >= 20:
                    top_sections.append(s)
        if top_sections:
            return top_sections

    # Fallback to direct div children excluding wrappers
    valid_divs = []
    for el in body.find_all("div", recursive=True):
        c_class = " ".join(el.get("class", [])) if el.get("class") else ""
        if wrapper_classes.search(c_class):
            continue
        # Check if it has section-like classes or substantial content
        if "section" in c_class.lower() or "block" in c_class.lower() or "area" in c_class.lower():
            if not el.find_parent(lambda p: p != body and ("section" in " ".join(p.get("class", [])).lower() or "area" in " ".join(p.get("class", [])).lower())):
                if len(el.get_text(strip=True)) >= 25:
                    valid_divs.append(el)

    if valid_divs:
        return valid_divs

    # Ultimate fallback: return non-empty direct elements
    return [c for c in body.find_all(recursive=False) if isinstance(c, Tag) and len(c.get_text(strip=True)) >= 20]


def _classify_body_node(
    node: Tag,
    index: int,
    page_slug: str
) -> Tuple[str, str, str, str, str, str]:
    """
    Analyzes content signatures (headings, keywords, form inputs, card counts)
    to classify the section and produce its metadata.

    :returns: (category_key, variant_code, label, icon, thumbnail_gradient, description)
    """
    text_corpus = node.get_text(" ", strip=True).lower()
    classes_corpus = " ".join(node.get("class", [])).lower() if node.get("class") else ""
    id_corpus = str(node.get("id", "")).lower()
    combined_sig = f"{classes_corpus} {id_corpus} {text_corpus[:300]}"

    # Check Pricing Table
    if any(k in combined_sig for k in ("pricing", "plan", "subscription", "per month", "$", "€", "£", "/mo", "tier")):
        return (
            "body",
            f"Body_PricingTable_{index}",
            "Pricing & Subscription Tiers",
            "payments",
            "linear_gradient(135deg, #10b981 0%, #059669 100%)",
            "Modular pricing matrix comparing tiers, features, and call-to-action subscription buttons."
        )

    # Check Contact / Office Form
    if node.find("form") or any(k in combined_sig for k in ("contact", "get in touch", "send message", "inquiry", "reach us", "office location")):
        return (
            "body",
            f"Contact_InquiryBlock_{index}",
            "Contact & Inquiry Form",
            "contact_mail",
            "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
            "Interactive contact form layout with input fields, message area, and office address details."
        )

    # Check Statistics / Milestones / Numbers
    if any(k in combined_sig for k in ("stats", "counter", "milestones", "kpi", "metrics", "+", "%")) and len(node.find_all(text=re.compile(r'\d+[\+%kM]?'))) >= 3:
        return (
            "body",
            f"Body_StatsCounter_{index}",
            "Metrics & Growth Statistics",
            "monitoring",
            "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
            "Data metrics and key performance indicators highlighting milestones and company scale."
        )

    # Check Testimonials / Reviews
    if any(k in combined_sig for k in ("testimonial", "review", "what our clients say", "feedback", "rating", "trustpilot")):
        return (
            "body",
            f"Body_Testimonials_{index}",
            "Client Testimonials & Reviews",
            "reviews",
            "linear-gradient(135deg, #ec4899 0%, #db2777 100%)",
            "Social proof testimonial showcase highlighting customer quotes, avatar portraits, and ratings."
        )

    # Check Blog / News Card Grid
    if any(k in combined_sig for k in ("blog", "article", "news", "insights", "latest posts", "read more")) or page_slug in ("blog", "news"):
        # Check if single detail article vs card list
        if node.find("article") or "detail" in combined_sig or page_slug in ("blog-detail", "article"):
            return (
                "blog",
                f"Blog_ArticleDetail_{index}",
                "Article Detail with Sticky Sidebar",
                "article",
                "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                "Full-length publication layout with hero header, rich prose styling, and widget sidebar."
            )
        return (
            "blog",
            f"Blog_CardGrid_{index}",
            "News & Editorial Card Grid",
            "newspaper",
            "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
            "Responsive multi-column article grid with thumbnails, publication metadata, and read links."
        )

    # Check E-Commerce / Products
    if any(k in combined_sig for k in ("product", "shop", "cart", "add to cart", "catalog", "store", "deal")):
        return (
            "ecommerce",
            f"Ecommerce_ProductShowcase_{index}",
            "E-Commerce Product Showcase",
            "shopping_bag",
            "linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)",
            "E-Commerce product tiles with pricing badges, product imagery, and quick-add actions."
        )

    # Check FAQ / Accordion
    if any(k in combined_sig for k in ("faq", "frequently asked", "accordion", "question", "answers")):
        return (
            "body",
            f"Body_FaqAccordion_{index}",
            "FAQ & Knowledge Accordion",
            "quiz",
            "linear-gradient(135deg, #64748b 0%, #475569 100%)",
            "Expandable accordion component answering common questions and knowledge topics."
        )

    # Check Team / Leadership
    if any(k in combined_sig for k in ("team", "leadership", "executives", "advisors", "our people", "founders")):
        return (
            "body",
            f"Body_TeamGrid_{index}",
            "Leadership & Team Grid",
            "badge",
            "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
            "Professional personnel grid showcasing executive headshots, job titles, and bios."
        )

    # Check Call to Action (CTA)
    if any(k in combined_sig for k in ("ready to get started", "join today", "start your free trial", "call to action", "subscribe today")):
        return (
            "body",
            f"Body_CtaBanner_{index}",
            "Call To Action Conversion Banner",
            "campaign",
            "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)",
            "High-impact call-to-action banner driving user conversion, demo requests, or registrations."
        )

    # Default Feature / Content Block
    heading_el = node.find(["h1", "h2", "h3", "h4"])
    label_name = heading_el.get_text(strip=True)[:40] if heading_el else f"Features Block {index}"
    return (
        "body",
        f"Body_FeatureBlock_{index}",
        f"Feature Block - {label_name}",
        "view_quilt",
        "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
        "Modular content block showcasing capabilities, descriptive narratives, and icon features."
    )


from urllib.parse import urljoin

def _rewrite_relative_assets(soup_node: Tag, page_url: str) -> None:
    """Resolves relative img src, data-src, srcset, and inline background-image to absolute URLs."""
    if not page_url:
        return

    for img in soup_node.find_all(["img", "source", "video"]):
        for attr in ("src", "data-src", "poster"):
            val = img.get(attr)
            if val and isinstance(val, str) and not val.startswith(("http://", "https://", "data:", "//", "#")):
                img[attr] = urljoin(page_url, val)

        srcset = img.get("srcset")
        if srcset and isinstance(srcset, str):
            parts = []
            for part in srcset.split(","):
                tokens = part.strip().split()
                if tokens:
                    url_t = tokens[0]
                    if not url_t.startswith(("http://", "https://", "data:", "//")):
                        tokens[0] = urljoin(page_url, url_t)
                    parts.append(" ".join(tokens))
            img["srcset"] = ", ".join(parts)

    for el in soup_node.find_all(attrs={"style": True}):
        style_val = el["style"]
        if "url(" in style_val:
            def _replace_url(match):
                raw_u = match.group(1).strip("'\"")
                if not raw_u.startswith(("http://", "https://", "data:", "//")):
                    return f"url('{urljoin(page_url, raw_u)}')"
                return match.group(0)
            el["style"] = re.sub(r'url\(([^)]+)\)', _replace_url, style_val, flags=re.I)


def _build_section_record(
    soup_node: Tag,
    category_key: str,
    variant_code: str,
    name: str,
    label: str,
    description: str,
    preview_icon: str,
    thumbnail_gradient: str,
    page_slug: str,
    sort_order: int,
    page_url: str = ""
) -> dict[str, Any]:
    """Assembles the section dictionary record with absolute asset URLs."""
    sec_id = f"sec_{category_key}_{uuid.uuid4().hex[:8]}"

    # Rewrite relative asset paths to absolute
    if page_url:
        _rewrite_relative_assets(soup_node, page_url)

    # Prettify the HTML markup
    raw_html = soup_node.prettify()

    return {
        "id": sec_id,
        "category_key": category_key,
        "variant_code": variant_code,
        "name": name,
        "label": label,
        "description": description,
        "dom_tag": soup_node.name or "section",
        "html_template": raw_html,
        "raw_node": soup_node,
        "preview_icon": preview_icon,
        "thumbnail_gradient": thumbnail_gradient,
        "parent_page_slugs": [page_slug],
        "sort_order": sort_order
    }

