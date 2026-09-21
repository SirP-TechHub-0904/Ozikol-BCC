"""
Phase 4 — AI-Powered Debranding and Ozikol Template Tokenization Engine.

Takes the cleaned & Cloudinary-uploaded HTML/CSS assets from Phase 3,
invokes the DeepSeek LLM (deepseek-chat) with Ozikol's full token dictionary,
debrands the markup, decomposes the DOM into modular Ozikol template sections
(menu, hero, body features, footers), and outputs a complete ImportableSuitePackage.
"""

import json
import logging
import re
from typing import Any, Optional
from urllib.parse import urlparse
from bs4 import BeautifulSoup
import httpx

from config import settings
from models.schemas import (
    ApplySelectionsResult,
    AuditResult,
    AuditSectionItem,
    ImportableCategoryItem,
    ImportablePageItem,
    ImportablePageSectionItem,
    ImportableSuitePackage,
    ImportableTagItem,
    ImportableTemplateItem,
    UploadResult,
)

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an elite Frontend Architect and UI Component Engineer specializing in the Ozikol BCC CMS Component Engine.
Your task is to analyze the provided cleaned webpage HTML & CSS, debrand all proprietary company names, and decompose the DOM into modular Ozikol section blueprints with dynamic CMS template tokens.

### OZIKOL CMS TOKEN DICTIONARY:

1. NAVIGATION / MENU (CategoryKey: "menu"):
   - Brand logo/text: {{ BrandIdentity }} or {{ BrandName }} or <img src="{{ LogoUrl }}" alt="{{ BrandName }}" />
   - Top-level menu links:
     {{#each MainMenuItems}}
       <li class="nav-item"><a class="nav-link" href="{{ Url }}">{{ Title }}</a></li>
     {{/each}}
   - Multi-level dropdowns:
     {{#each MenuDropdowns}}
       <div class="nav-item dropdown">
         <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown">{{ Title }}</a>
         <ul class="dropdown-menu">
           {{#each Pages}}
             <li><a class="dropdown-item" href="{{ Url }}">{{ Title }}</a></li>
           {{/each}}
         </ul>
       </div>
     {{/each}}
   - CTA Buttons:
     {{#each MenuCtaButtons}}
       <a href="{{ Url }}" class="btn btn-primary nav-cta-btn">{{ Title }}</a>
     {{/each}}
   - Dynamic Portal/Login Button: {{ LoginButton }} or <a href="{{ LoginUrl }}" class="btn-portal">{{ LoginText }}</a>

2. HERO SLIDERS & BANNERS (CategoryKey: "hero"):
   - Headline: {{ Title }}
   - Eyebrow badge / pill tag: {{ MiniTitle }}
   - Narrative copy / subtext: {{ Text }} (or {{ Description }})
   - Primary action: {{ ButtonText }} / {{ ButtonLink }}
   - Secondary / Video action: {{ VideoButtonText }} / {{ VideoLink }}
   - Visual media: {{ Url }} (slide image), {{ SecondUrl }} (mockup/graphic), {{ YoutubeVideo }}

3. BODY SECTIONS & FEATURE REPEATERS (CategoryKey: "body"):
   - Section Headline: {{ Title }}, {{ MiniTitle }}, {{ Description }}
   - Repeating Cards / Features / Services / Testimonials / Stats / FAQs:
     {{#each PageSectionLists}}
       <div class="col-lg-4 col-md-6 feature-card">
         <div class="feature-icon"><span class="material-symbols-outlined">{{ IconText }}</span></div>
         <span class="feature-tag">{{ MiniTitle }}</span>
         <h3 class="feature-title">{{ Title }}</h3>
         <p class="feature-desc">{{ Description }}</p>
         <img src="{{ ImageUrl }}" alt="{{ Title }}" class="feature-thumb" />
         <a href="{{ ButtonLink }}" class="feature-link">{{ ButtonText }}</a>
       </div>
     {{/each}}

4. FOOTERS (CategoryKey: "footer"):
   - Brand summary: {{ BrandName }}, {{ Description }}, {{ Email }}, {{ Phone }}
   - Category page links:
     {{#each CategoryPages "Services"}}
       <li><a href="{{ Url }}">{{ Title }}</a></li>
     {{/each}}
   - Tagged pages:
     {{#each TaggedPages "quick-links"}}
       <li><a href="{{ Url }}">{{ Title }}</a></li>
     {{/each}}
   - Legal Compliance Links:
     {{#each LegalPages}}
       <li><a href="{{ Url }}">{{ Title }}</a></li>
     {{/each}}
   - Dynamic Copyright: {{ Copyright }}

5. FORMS (Embedded in sections):
   - Replace contact/subscribe form forms with: {{ Form "Contact_Us" }} or {{ Form "Newsletter_Subscribe" }}

### STYLES & CSS RULES (<style> Tags & Custom Classes):
- If a section relies on unique custom CSS rules found in page <style> tags, keyframe animations, or inline styles, extract and preserve those CSS rules inside that template's "css_styles" property.
- Global site-wide CSS in <head> will be injected into SiteCodeInjectionTags.

### DEBRANDING & PLACEHOLDER RULES:
- Identify any original company names, trademarks, or proprietary URLs in the HTML text and replace them with {{ BrandName }} or clean generic placeholders (e.g. "Enterprise Workspace", "Global Platform").
- For email addresses and phone numbers in text or sample content, DO NOT invent custom tokens: always use standard clean placeholders: email as "email@domain.com" (or "name@company.com") and phone as "+0 (000) 000-0000" (or "0000000000").
- Keep CSS classes, layout containers, and styling intact.
- Output MUST be valid JSON conforming strictly to the requested schema.
"""


def _build_cdn_map(upload: Optional[UploadResult]) -> dict[str, str]:
    """Map original URLs and relative paths to Cloudinary CDN URLs."""
    cdn_map: dict[str, str] = {}
    if not upload or not upload.cdn_assets:
        return cdn_map

    for asset in upload.cdn_assets:
        if asset.original_url and asset.cdn_url:
            orig = asset.original_url
            cdn = asset.cdn_url
            cdn_map[orig] = cdn
            parsed = urlparse(orig)
            if parsed.path:
                cdn_map[parsed.path] = cdn
                cdn_map[parsed.path.lstrip("/")] = cdn
    return cdn_map


def _apply_cdn_rewrites(html_str: str, cdn_map: dict[str, str]) -> str:
    """Rewrite any original asset URLs in HTML string to Cloudinary CDN URLs."""
    if not html_str or not cdn_map:
        return html_str
    out = html_str
    for orig, cdn in cdn_map.items():
        out = out.replace(orig, cdn)
    return out


async def run_ai_tokenization(
    audit: AuditResult,
    cleaned: ApplySelectionsResult,
    upload: Optional[UploadResult],
    job_id: str,
    suite_name: str = "Imported Modern Suite",
    brand_name: str = "Enterprise Workspace",
    custom_api_key: Optional[str] = None,
) -> ImportableSuitePackage:
    """
    Orchestrate DeepSeek AI tokenization, debranding, and suite packaging.
    Falls back to high-fidelity heuristic tokenization on actual extracted HTML.
    """
    api_key = custom_api_key or settings.deepseek_api_key
    base_url = settings.deepseek_base_url.rstrip("/")

    cdn_map = _build_cdn_map(upload)

    # Collect cleaned/final HTML
    pages_html: list[dict[str, str]] = []
    if upload and upload.pages:
        for p in upload.pages:
            pages_html.append({
                "page_id": p.get("page_id", ""),
                "url": p.get("url", ""),
                "html": p.get("final_html", "")
            })
    elif cleaned and cleaned.page_diffs:
        for d in cleaned.page_diffs:
            pages_html.append({
                "page_id": d.page_id,
                "url": d.page_url,
                "html": _apply_cdn_rewrites(d.cleaned_html or "", cdn_map)
            })

    # Prepare head tags from audit using Cloudinary CDN URLs
    code_injections: list[ImportableTagItem] = []
    for css in audit.css_files:
        if css.checked and css.url:
            final_css_url = cdn_map.get(css.url, css.url)
            code_injections.append(ImportableTagItem(
                name=f"Style - {css.label[:30]}",
                zone="head",
                tag_type="link_stylesheet",
                content=f'<link rel="stylesheet" href="{final_css_url}" />',
                sort_order=10
            ))

    # Add kept JS files using Cloudinary CDN URLs
    for js in audit.js_files:
        if js.checked and js.url and js.js_category.value != "analytics":
            final_js_url = cdn_map.get(js.url, js.url)
            code_injections.append(ImportableTagItem(
                name=f"Script - {js.label[:30]}",
                zone="footer",
                tag_type="script",
                content=f'<script src="{final_js_url}"></script>',
                sort_order=10
            ))

    # Add web fonts
    for font in audit.fonts:
        if font.url:
            final_font_url = cdn_map.get(font.url, font.url)
            code_injections.append(ImportableTagItem(
                name=f"Font - {font.label[:30]}",
                zone="head",
                tag_type="google_fonts" if font.font_provider == "google" else "link_stylesheet",
                content=f'<link rel="stylesheet" href="{final_font_url}" />',
                sort_order=5
            ))

    # Extract all embedded <style> tags from page heads & bodies
    seen_styles: set[str] = set()
    style_index = 1
    for p in pages_html:
        soup_page = BeautifulSoup(p.get("html", ""), "html.parser")
        for st_tag in soup_page.find_all("style"):
            css_text = st_tag.string or st_tag.get_text() or ""
            clean_css = _apply_cdn_rewrites(css_text.strip(), cdn_map)
            if clean_css and clean_css not in seen_styles:
                seen_styles.add(clean_css)
                code_injections.append(ImportableTagItem(
                    name=f"Inline Head Style {style_index}",
                    zone="head",
                    tag_type="raw_html",
                    content=f"<style>\n{clean_css}\n</style>",
                    sort_order=20 + style_index
                ))
                style_index += 1

    group_code = "SUITE_" + re.sub(r"[^A-Z0-9]", "", suite_name.upper())[:10]
    if len(group_code) <= 6:
        group_code += "_PRO"

    # Attempt DeepSeek LLM Debranding & Slicing
    if api_key:
        try:
            logger.info("Executing DeepSeek AI Tokenization for job %s...", job_id)
            suite = await _call_deepseek_tokenizer(
                api_key=api_key,
                base_url=base_url,
                model=settings.deepseek_model,
                pages_html=pages_html,
                source_url=audit.source_url,
                suite_name=suite_name,
                brand_name=brand_name,
                job_id=job_id,
                group_code=group_code,
                base_injections=code_injections,
            )
            if suite and suite.templates:
                return suite
        except Exception as exc:
            logger.exception("DeepSeek LLM tokenization encountered an error: %s. Falling back to authentic heuristic tokenizer.", exc)

    # Fallback to authentic heuristic tokenizer operating on real extracted HTML
    logger.info("Running authentic heuristic tokenization for job %s with %d audit sections", job_id, len(audit.sections if audit else []))
    return _heuristic_tokenization(
        pages_html=pages_html,
        source_url=audit.source_url if audit else "",
        suite_name=suite_name,
        brand_name=brand_name,
        job_id=job_id,
        group_code=group_code,
        base_injections=code_injections,
        audit=audit,
        cdn_map=cdn_map,
    )


async def _call_deepseek_tokenizer(
    api_key: str,
    base_url: str,
    model: str,
    pages_html: list[dict[str, str]],
    source_url: str,
    suite_name: str,
    brand_name: str,
    job_id: str,
    group_code: str,
    base_injections: list[ImportableTagItem],
) -> Optional[ImportableSuitePackage]:
    """Call DeepSeek Chat Completions API with structured schema instructions."""
    primary_html = pages_html[0]["html"] if pages_html else ""
    sample_html = primary_html[:45000]

    user_prompt = f"""
TARGET WEBSITE: {source_url}
SUITE NAME: {suite_name}
NEW TENANT BRAND NAME: {brand_name}
GROUP CODE: {group_code}

PAGE HTML:
```html
{sample_html}
```

Instructions:
1. Debrand: Replace all instances of the original website's company name/branding with {{{{ BrandName }}}} or {{{{ BrandIdentity }}}}.
2. Decompose the page into modular Ozikol template blocks:
   - "menu": The header/navbar with dynamic tokens ({{{{#each MainMenuItems}}}}, {{{{#each MenuDropdowns}}}}, {{{{ BrandIdentity }}}})
   - "hero": The top banner/slider with ({{{{ Title }}}}, {{{{ MiniTitle }}}}, {{{{ Text }}}}, {{{{ ButtonText }}}}, {{{{ Url }}}})
   - "body": distinct feature/content sections with ({{{{ Title }}}}, {{{{ MiniTitle }}}}, {{{{ Description }}}}, {{{{#each PageSectionLists}}}})
   - "footer": The footer with ({{{{#each CategoryPages "..."}}}}, {{{{#each LegalPages}}}}, {{{{ Copyright }}}})
3. Return a strictly valid JSON response adhering to the JSON schema.
"""

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model or "deepseek-chat",
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.2,
        "response_format": {"type": "json_object"},
    }

    async with httpx.AsyncClient(timeout=90.0) as client:
        endpoint = f"{base_url}/chat/completions"
        if not endpoint.startswith("http"):
            endpoint = f"https://api.deepseek.com/v1/chat/completions"
            
        resp = await client.post(endpoint, headers=headers, json=payload)
        resp.raise_for_status()
        data = resp.json()
        raw_content = data["choices"][0]["message"]["content"]
        
        parsed = json.loads(raw_content)
        
        templates = [ImportableTemplateItem(**t) for t in parsed.get("templates", [])]
        categories = [ImportableCategoryItem(**c) for c in parsed.get("categories", [])]
        pages = [ImportablePageItem(**p) for p in parsed.get("pages", [])]

        return ImportableSuitePackage(
            job_id=job_id,
            suite_name=suite_name,
            group_code=group_code,
            source_url=source_url,
            templates=templates,
            code_injections=base_injections,
            categories=categories,
            pages=pages,
        )


def _heuristic_tokenization(
    pages_html: list[dict[str, str]],
    source_url: str,
    suite_name: str,
    brand_name: str,
    job_id: str,
    group_code: str,
    base_injections: list[ImportableTagItem],
    audit: Optional[AuditResult] = None,
    cdn_map: Optional[dict[str, str]] = None,
) -> ImportableSuitePackage:
    """
    Authentic deterministic HTML parser & tokenizer.
    Takes the actual raw HTML of audited sections, rewrites asset URLs to Cloudinary CDN,
    and inserts Ozikol CMS tokens while preserving 100% of the site's authentic markup and styles.
    """
    cdn_map = cdn_map or {}
    templates: list[ImportableTemplateItem] = []

    # Gather unique, checked sections from audit
    unique_sections: list[AuditSectionItem] = []
    if audit and audit.sections:
        for s in audit.sections:
            if s.checked and not s.is_duplicate:
                unique_sections.append(s)

    # 1. Navigation / Menu templates
    menu_sections = [s for s in unique_sections if s.category_key == "menu"]
    if not menu_sections:
        menu_sections = [AuditSectionItem(
            id="sec_menu_default",
            type="section",
            label="Header Navigation",
            page_url=source_url,
            page_id="page_default",
            category_key="menu",
            heading="Site Navigation",
            raw_html="""<header class="site-header sticky-top">
  <div class="container d-flex align-items-center justify-content-between py-3">
    <a class="navbar-brand" href="/">{{ BrandIdentity }}</a>
    <nav class="d-none d-lg-flex align-items-center gap-4">
      <ul class="navbar-nav d-flex flex-row gap-3 list-unstyled mb-0">
        {{#each MainMenuItems}}
          <li class="nav-item"><a class="nav-link" href="{{ Url }}">{{ Title }}</a></li>
        {{/each}}
      </ul>
      <div class="d-flex align-items-center gap-2">
        {{#each MenuCtaButtons}}
          <a href="{{ Url }}" class="btn btn-primary btn-sm">{{ Title }}</a>
        {{/each}}
        {{ LoginButton }}
      </div>
    </nav>
  </div>
</header>""",
            checked=True
        )]

    for idx, msec in enumerate(menu_sections):
        suffix = f"_{idx+1}" if len(menu_sections) > 1 else ""
        t_key = f"Menu_{group_code}_Nav{suffix}"
        t_name = f"{suite_name} Navigation{suffix}"
        
        raw_html = _apply_cdn_rewrites(msec.raw_html or "", cdn_map)
        soup = BeautifulSoup(raw_html, "html.parser")
        
        # Replace brand logo / identity
        brand_el = soup.find(class_=re.compile(r'brand|logo', re.I)) or soup.find("a", href=re.compile(r'^/|index\.html'))
        if brand_el:
            brand_el.clear()
            brand_el.append("{{ BrandIdentity }}")
            
        # Replace menu items loop inside nav / ul
        nav_ul = soup.find("ul", class_=re.compile(r'nav|menu|list', re.I)) or soup.find("nav")
        if nav_ul:
            nav_ul.clear()
            nav_ul_markup = """
        {{#each MainMenuItems}}
          <li class="nav-item"><a class="nav-link" href="{{ Url }}">{{ Title }}</a></li>
        {{/each}}
        {{#each MenuDropdowns}}
          <li class="nav-item dropdown">
            <a class="nav-link dropdown-toggle" href="#" data-bs-toggle="dropdown">{{ Title }}</a>
            <ul class="dropdown-menu">
              {{#each Pages}}
                <li><a class="dropdown-item" href="{{ Url }}">{{ Title }}</a></li>
              {{/each}}
            </ul>
          </li>
        {{/each}}"""
            nav_ul.append(BeautifulSoup(nav_ul_markup, "html.parser"))
            
        nav_template = str(soup) if str(soup).strip() else raw_html
        
        templates.append(ImportableTemplateItem(
            template_key=t_key,
            category_key="menu",
            name=t_name,
            variant_code=f"MENU_{group_code}_NAV{suffix}",
            description="Authentic responsive header navigation with dynamic Ozikol brand and menu loops.",
            html_template=nav_template,
            css_styles="",
            default_content_json=json.dumps({"brandName": brand_name})
        ))

    # 2. Hero template (Authentic extracted Hero Showcase)
    hero_sections = [s for s in unique_sections if s.category_key == "hero"]
    hero_sec = hero_sections[0] if hero_sections else None
    
    t_key = f"Hero_{group_code}_Banner"
    t_name = f"{suite_name} Hero Showcase"
    
    if hero_sec and hero_sec.raw_html:
        raw_hero_html = _apply_cdn_rewrites(hero_sec.raw_html, cdn_map)
        soup_hero = BeautifulSoup(raw_hero_html, "html.parser")
        
        # Extract existing authentic texts for default content
        h_tag = soup_hero.find(["h1", "h2", "h3"])
        extracted_title = h_tag.get_text(strip=True) if h_tag else (hero_sec.heading or f"Welcome to {brand_name}")
        
        sub_tag = soup_hero.find(class_=re.compile(r'badge|tag|subtitle|pill', re.I))
        extracted_mini = sub_tag.get_text(strip=True) if sub_tag else "OFFICIAL"
        
        p_tag = soup_hero.find(["p", "div"], class_=re.compile(r'desc|lead|text|paragraph', re.I)) or soup_hero.find("p")
        extracted_text = p_tag.get_text(strip=True) if p_tag else (hero_sec.preview_snippet or "")
        
        btn_tag = soup_hero.find(["a", "button"], class_=re.compile(r'btn|button', re.I))
        extracted_btn_text = btn_tag.get_text(strip=True) if btn_tag else "Learn More"
        extracted_btn_link = btn_tag.get("href") if btn_tag and btn_tag.get("href") else "/services"
        
        img_tag = soup_hero.find("img")
        extracted_img = img_tag.get("src") if img_tag and img_tag.get("src") else ""
        
        # Tokenize tags in soup
        if h_tag:
            h_tag.clear()
            h_tag.append("{{ Title }}")
        if sub_tag:
            sub_tag.clear()
            sub_tag.append("{{ MiniTitle }}")
        if p_tag:
            p_tag.clear()
            p_tag.append("{{ Text }}")
        if btn_tag:
            btn_tag.clear()
            btn_tag.append("{{ ButtonText }}")
            btn_tag["href"] = "{{ ButtonLink }}"
        if img_tag:
            img_tag["src"] = "{{ Url }}"
            
        hero_template = str(soup_hero)
        default_hero_content = {
            "title": extracted_title,
            "miniTitle": extracted_mini,
            "text": extracted_text,
            "buttonText": extracted_btn_text,
            "buttonLink": extracted_btn_link,
            "url": extracted_img or "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80"
        }
    else:
        hero_template = """<section class="oz-hero-showcase py-5">
  <div class="container">
    <div class="row align-items-center gy-4">
      <div class="col-lg-7">
        <span class="badge bg-primary-subtle text-primary mb-3 px-3 py-2 rounded-pill fw-bold">{{ MiniTitle }}</span>
        <h1 class="display-4 fw-bold mb-3">{{ Title }}</h1>
        <p class="lead text-muted mb-4">{{ Text }}</p>
        <div class="d-flex flex-wrap gap-3">
          <a href="{{ ButtonLink }}" class="btn btn-primary btn-lg">{{ ButtonText }}</a>
        </div>
      </div>
      <div class="col-lg-5 text-center">
        <img src="{{ Url }}" alt="{{ Title }}" class="img-fluid rounded-4 shadow-lg" />
      </div>
    </div>
  </div>
</section>"""
        default_hero_content = {
            "title": f"Welcome to {brand_name}",
            "miniTitle": "OFFICIAL",
            "text": "Professional enterprise solutions and high performance services.",
            "buttonText": "Explore Solutions",
            "buttonLink": "/services",
            "url": "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80"
        }

    templates.append(ImportableTemplateItem(
        template_key=t_key,
        category_key="hero",
        name=t_name,
        variant_code=f"HERO_{group_code}_SPLIT",
        description="Authentic hero showcase banner with extracted layout, headline, action button, and media.",
        html_template=hero_template,
        css_styles="",
        default_content_json=json.dumps(default_hero_content)
    ))

    # 2b. Breadcrumb & Subpage Banner template
    bc_key = f"Breadcrumb_{group_code}_Trail"
    bc_name = f"{suite_name} Page Header & Breadcrumbs"
    bc_sections = [s for s in unique_sections if s.category_key == "breadcrumb"]
    if bc_sections and bc_sections[0].raw_html:
        raw_bc = _apply_cdn_rewrites(bc_sections[0].raw_html, cdn_map)
        soup_bc = BeautifulSoup(raw_bc, "html.parser")
        h_bc = soup_bc.find(["h1", "h2", "h3"])
        if h_bc:
            h_bc.clear()
            h_bc.append("{{ Title }}")
        bc_template = str(soup_bc)
    else:
        bc_template = """<section class="oz-breadcrumb-banner py-4 bg-light border-bottom">
  <div class="container d-flex align-items-center justify-content-between">
    <div>
      <h1 class="h3 fw-bold mb-1">{{ Title }}</h1>
      <p class="text-muted mb-0 small">{{ Description }}</p>
    </div>
    <nav aria-label="breadcrumb">
      <ol class="breadcrumb mb-0">
        <li class="breadcrumb-item"><a href="/" class="text-decoration-none">Home</a></li>
        <li class="breadcrumb-item active" aria-current="page">{{ Title }}</li>
      </ol>
    </nav>
  </div>
</section>"""

    templates.append(ImportableTemplateItem(
        template_key=bc_key,
        category_key="breadcrumb",
        name=bc_name,
        variant_code=f"BREADCRUMB_{group_code}_TRAIL",
        description="Authentic subpage banner and breadcrumb navigational trail.",
        html_template=bc_template,
        css_styles="",
        default_content_json=json.dumps({
            "title": "Page Title",
            "description": "Overview of page capabilities and information."
        })
    ))

    # 3. Dynamic Modular Body Content Sections
    body_sections = [s for s in unique_sections if s.category_key == "body"]
    for idx, bsec in enumerate(body_sections):
        safe_slug = re.sub(r'[^a-zA-Z0-9]+', '', (bsec.heading or f"Section{idx+1}").title())[:20] or f"Block{idx+1}"
        b_key = f"Body_{group_code}_{safe_slug}_{idx+1}"
        b_name = f"{suite_name} {bsec.heading or 'Content Section'} ({idx+1})"
        
        raw_body_html = _apply_cdn_rewrites(bsec.raw_html or "", cdn_map)
        soup_body = BeautifulSoup(raw_body_html, "html.parser")
        
        # Extract headings
        sec_h = soup_body.find(["h1", "h2", "h3", "h4"])
        sec_title = sec_h.get_text(strip=True) if sec_h else (bsec.heading or "Key Capabilities")
        
        sec_sub = soup_body.find(class_=re.compile(r'subtitle|tag|badge|mini', re.I))
        sec_mini = sec_sub.get_text(strip=True) if sec_sub else "CAPABILITIES"
        
        sec_p = soup_body.find("p")
        sec_desc = sec_p.get_text(strip=True) if sec_p else (bsec.preview_snippet or "")
        
        # Check for repeating card items
        cards = soup_body.find_all(class_=re.compile(r'col-|card|item|slide|member|service|feature|box', re.I))
        extracted_items = []
        
        if len(cards) >= 2:
            card_sample = cards[0]
            parent_container = card_sample.parent
            
            # Extract sample data from cards
            for c_idx, c in enumerate(cards[:6]):
                c_title_tag = c.find(["h3", "h4", "h5", "h6", "strong", "a"])
                c_title = c_title_tag.get_text(strip=True) if c_title_tag else f"Service #{c_idx+1}"
                c_p = c.find("p")
                c_desc = c_p.get_text(strip=True) if c_p else ""
                c_img = c.find("img")
                c_img_src = c_img.get("src") if c_img and c_img.get("src") else ""
                c_link = c.find("a")
                c_btn_text = c_link.get_text(strip=True) if c_link else "Learn More"
                c_btn_url = c_link.get("href") if c_link and c_link.get("href") else "#"
                
                extracted_items.append({
                    "title": c_title,
                    "miniTitle": "FEATURE",
                    "description": c_desc,
                    "imageUrl": c_img_src,
                    "buttonText": c_btn_text or "Learn More",
                    "buttonLink": c_btn_url or "#"
                })
            
            # Tokenize single card template
            card_soup = BeautifulSoup(str(card_sample), "html.parser")
            c_h = card_soup.find(["h3", "h4", "h5", "h6", "strong"])
            if c_h:
                c_h.clear()
                c_h.append("{{ Title }}")
            c_p_tag = card_soup.find("p")
            if c_p_tag:
                c_p_tag.clear()
                c_p_tag.append("{{ Description }}")
            c_img_tag = card_soup.find("img")
            if c_img_tag:
                c_img_tag["src"] = "{{ ImageUrl }}"
                c_img_tag["alt"] = "{{ Title }}"
            c_a_tag = card_soup.find("a")
            if c_a_tag:
                c_a_tag.clear()
                c_a_tag.append("{{ ButtonText }}")
                c_a_tag["href"] = "{{ ButtonLink }}"
                
            # Replace cards with {{#each PageSectionLists}} in parent
            loop_markup = f"""
{{{{#each PageSectionLists}}}}
{str(card_soup)}
{{{{/each}}}}"""
            for c in cards:
                c.decompose()
            if parent_container:
                parent_container.append(BeautifulSoup(loop_markup, "html.parser"))
                
        # Tokenize main section header
        if sec_h:
            sec_h.clear()
            sec_h.append("{{ Title }}")
        if sec_sub:
            sec_sub.clear()
            sec_sub.append("{{ MiniTitle }}")
            
        body_template = str(soup_body) if str(soup_body).strip() else raw_body_html
        
        templates.append(ImportableTemplateItem(
            template_key=b_key,
            category_key="body",
            name=b_name,
            variant_code=f"BODY_{group_code}_{safe_slug.upper()[:8]}_{idx+1}",
            description=f"Authentic {bsec.heading or 'content'} section with dynamic Ozikol CMS bindings.",
            html_template=body_template,
            css_styles="",
            default_content_json=json.dumps({
                "title": sec_title,
                "miniTitle": sec_mini,
                "description": sec_desc,
                "items": extracted_items
            })
        ))

    # 4. Footer templates (Authentic extracted footer)
    footer_sections = [s for s in unique_sections if s.category_key == "footer"]
    for idx, fsec in enumerate(footer_sections):
        suffix = f"_{idx+1}" if len(footer_sections) > 1 else ""
        ft_key = f"Footer_{group_code}_Corporate{suffix}"
        ft_name = f"{suite_name} Footer{suffix}"
        
        raw_footer_html = _apply_cdn_rewrites(fsec.raw_html or "", cdn_map)
        soup_footer = BeautifulSoup(raw_footer_html, "html.parser")
        
        # Replace copyright
        copy_el = soup_footer.find(string=re.compile(r'©|\bcopyright\b|all rights reserved', re.I))
        if copy_el and copy_el.parent:
            copy_el.parent.string = "{{ Copyright }}"
            
        footer_template = str(soup_footer) if str(soup_footer).strip() else raw_footer_html
        
        templates.append(ImportableTemplateItem(
            template_key=ft_key,
            category_key="footer",
            name=ft_name,
            variant_code=f"FOOTER_{group_code}_CORP{suffix}",
            description="Authentic footer layout with dynamic navigation loops, legal links, and brand copyright.",
            html_template=footer_template,
            css_styles="",
            default_content_json=json.dumps({
                "brandName": brand_name,
                "description": f"Empowering modern organizations with strategic solutions.",
                "email": "email@domain.com",
                "phone": "+0 (000) 000-0000"
            })
        ))

    # Categories
    categories = [
        ImportableCategoryItem(title="Services", description="Core capabilities and offerings", menu_sort_order=10, show_in_menu_drop_down=True, show_in_footer=True),
        ImportableCategoryItem(title="Company", description="Organization background and leadership", menu_sort_order=20, show_in_menu_drop_down=True, show_in_footer=True)
    ]

    # Pages
    pages: list[ImportablePageItem] = []
    menu_key = templates[0].template_key if templates else "Menu_Nav"
    hero_key = f"Hero_{group_code}_Banner"
    bc_key = f"Breadcrumb_{group_code}_Trail"
    footer_key = [t.template_key for t in templates if t.category_key == "footer"]
    active_footer_key = footer_key[0] if footer_key else "Footer_Corp"

    source_pages = audit.pages if audit and audit.pages else []
    if source_pages:
        for p_idx, p in enumerate(source_pages):
            if not p.checked:
                continue
            
            p_url = p.url or ""
            p_title = p.title or p.label or f"Page {p_idx+1}"
            raw_slug = p_url.rstrip("/").split("/")[-1].lower() if p_url else ""
            if not raw_slug or raw_slug in ["http:", "https:", urlparse(source_url).netloc.lower()]:
                slug = "home"
                is_home = True
            else:
                slug = re.sub(r'[^a-z0-9\-]+', '-', raw_slug).strip("-") or f"page-{p_idx+1}"
                is_home = False

            # Find all sections belonging to this page
            page_sec_items: list[ImportablePageSectionItem] = []
            matching_audit_secs = [s for s in (audit.sections or []) if s.page_url == p_url and s.checked]
            
            for s_order, s in enumerate(matching_audit_secs):
                matched_t = next((t for t in templates if t.name.endswith(f"({s_order+1})") or t.category_key == s.category_key), None)
                target_key = matched_t.template_key if matched_t else (hero_key if is_home and s_order == 1 else active_footer_key)
                
                page_sec_items.append(ImportablePageSectionItem(
                    template_key=target_key,
                    title=s.heading or f"Section {s_order+1}",
                    show_in_home=is_home,
                    page_sort_order=s_order + 1
                ))

            if not page_sec_items:
                page_sec_items = [
                    ImportablePageSectionItem(template_key=menu_key, title="Header", show_in_home=is_home, page_sort_order=1),
                    ImportablePageSectionItem(template_key=hero_key if is_home else bc_key, title="Hero" if is_home else "Banner", show_in_home=is_home, page_sort_order=2),
                    ImportablePageSectionItem(template_key=active_footer_key, title="Footer", show_in_home=is_home, page_sort_order=3),
                ]

            is_legal = any(k in slug for k in ["privacy", "terms", "cookie", "policy", "legal", "gdpr", "disclaimer"])
            is_contact = any(k in slug for k in ["contact", "get-in-touch", "reach-us", "request-service"])
            
            pages.append(ImportablePageItem(
                title=p_title,
                slug=slug,
                summary=f"Imported {p_title} page",
                show_in_main_menu=is_home or (p_idx < 5 and not is_legal),
                show_in_menu_drop_down=not is_home and not is_legal,
                show_in_footer=True,
                is_legal=is_legal,
                is_menu_cta=is_contact,
                sort_order=(p_idx + 1) * 10,
                sections=page_sec_items
            ))

    return ImportableSuitePackage(
        job_id=job_id,
        suite_name=suite_name,
        group_code=group_code,
        source_url=source_url,
        templates=templates,
        code_injections=base_injections,
        categories=categories,
        pages=pages
    )
