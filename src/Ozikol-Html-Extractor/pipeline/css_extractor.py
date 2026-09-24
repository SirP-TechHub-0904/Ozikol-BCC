"""
CSS Extraction & Precision Scoping Engine.

Analyzes the DOM tree of an extracted section, inventories all HTML tags, classes,
IDs, and data attributes, and parses full stylesheet ASTs to extract ONLY the matching
CSS rules, keyframes, CSS variables (:root), and media queries strictly required to render
the section in complete isolation. Automatically detects typography and icon fonts and
injects official CDN @import statements at the top of the scoped CSS.
"""

import logging
import re
from typing import Dict, List, Optional, Set, Tuple
from bs4 import BeautifulSoup, Tag

logger = logging.getLogger(__name__)

COMMON_SYSTEM_FONTS = {
    'sans-serif', 'serif', 'monospace', 'cursive', 'fantasy', 'system-ui',
    '-apple-system', 'blinkmacsystemfont', 'segoe ui', 'roboto', 'helvetica neue',
    'arial', 'helvetica', 'times new roman', 'times', 'georgia', 'courier new',
    'courier', 'inherit', 'initial', 'unset', 'none'
}


def extract_classes_and_ids_from_dom(soup_node: Tag) -> Tuple[Set[str], Set[str], Set[str]]:
    """
    Scans a BeautifulSoup DOM node and extracts all CSS classes, IDs, and tag names.

    :param soup_node: The BeautifulSoup element representing the section.
    :returns: Tuple of (classes_set, ids_set, tags_set).
    """
    classes: Set[str] = set()
    ids: Set[str] = set()
    tags: Set[str] = set()

    elements = [soup_node] + list(soup_node.find_all(True))
    for el in elements:
        if not isinstance(el, Tag):
            continue

        # Tag name
        tags.add(el.name.lower())

        # Classes
        class_attr = el.get("class")
        if class_attr:
            if isinstance(class_attr, list):
                for c in class_attr:
                    classes.add(c.strip())
            elif isinstance(class_attr, str):
                for c in class_attr.split():
                    classes.add(c.strip())

        # ID
        id_attr = el.get("id")
        if id_attr and isinstance(id_attr, str):
            ids.add(id_attr.strip())

    return classes, ids, tags


def _is_single_selector_matching(
    single_sel: str,
    section_classes: Set[str],
    section_ids: Set[str],
    section_tags: Set[str]
) -> bool:
    """
    Precision check if a single CSS selector (without commas) matches the section.
    For compound or descendant selectors (e.g. '.h11-service-item .title'),
    ALL class and ID requirements in the selector chain MUST exist in the section.
    """
    sel = single_sel.strip()
    if not sel:
        return False

    # Extract all .class names required by this selector
    sel_classes = set(re.findall(r'\.([a-zA-Z0-9_-]+)', sel))
    
    # Extract all #id names required by this selector
    sel_ids = set(re.findall(r'#([a-zA-Z0-9_-]+)', sel))

    # If selector specifies classes, ALL classes must be present in the section DOM
    if sel_classes:
        if not sel_classes.issubset(section_classes):
            return False
        return True

    # If selector specifies IDs, ALL IDs must be present in the section DOM
    if sel_ids:
        if not sel_ids.issubset(section_ids):
            return False
        return True

    # If selector has no classes or IDs (pure tag selector like 'h1', 'p', 'table')
    clean_sel = re.sub(r'::?[a-zA-Z0-9_-]+(\([^\)]*\))?', '', sel).strip()
    sel_tags = set(re.findall(r'\b([a-z0-9]+)\b', clean_sel.lower()))
    
    ignored_keywords = {'hover', 'active', 'focus', 'before', 'after', 'root', 'is', 'where', 'not'}
    sel_tags = sel_tags - ignored_keywords

    if sel_tags:
        if sel_tags.issubset(section_tags):
            return True

    return False


def _filter_rule_selectors(
    selectors_str: str,
    section_classes: Set[str],
    section_ids: Set[str],
    section_tags: Set[str]
) -> str:
    """
    Splits comma-separated selectors and keeps ONLY the selector branches that match the section.
    """
    parts = [p.strip() for p in selectors_str.split(',') if p.strip()]
    matched_parts = []

    for part in parts:
        if _is_single_selector_matching(part, section_classes, section_ids, section_tags):
            matched_parts.append(part)

    return ", ".join(matched_parts)


def resolve_font_imports_for_section(
    matching_css: str,
    full_css_corpus: str,
    html_markup: str = ""
) -> List[str]:
    """
    Detects all typography and icon fonts referenced by the section and generates
    official CDN @import statements to guarantee pixel-perfect rendering across any domain.
    """
    import_statements: List[str] = []
    seen_imports: Set[str] = set()

    # 1. Capture direct Google Font @import rules present in the source CSS
    source_imports = re.findall(r'@import\s+url\([\'"]?(https?://fonts\.googleapis\.com/[^\'")]+)[\'"]?\)\s*;?', full_css_corpus, re.IGNORECASE)
    for g_url in source_imports:
        stmt = f'@import url("{g_url}");'
        if stmt not in seen_imports:
            seen_imports.add(stmt)
            import_statements.append(stmt)

    # 2. Discover referenced font families in the section's CSS rules
    font_families: Set[str] = set()
    for match in re.findall(r'font-family\s*:\s*([^;!]+)', matching_css, re.IGNORECASE):
        first_part = match.split(',')[0].strip().strip('\'"')
        if first_part and not first_part.lower().startswith('var(') and first_part.lower() not in COMMON_SYSTEM_FONTS:
            # Clean up any residual quotes or punctuation
            clean_name = re.sub(r'[^a-zA-Z0-9\s-]', '', first_part).strip()
            if clean_name and len(clean_name) > 1:
                font_families.add(clean_name)

    # Convert valid font families to Google Fonts CDN imports if not already imported
    for fam in font_families:
        fam_clean = fam.strip()
        fam_slug = fam_clean.replace(' ', '+')
        if not fam_clean.lower().startswith('font awesome') and not fam_clean.lower().startswith('bootstrap-icons') and not fam_clean.lower().startswith('bexon-icons'):
            g_import = f'@import url("https://fonts.googleapis.com/css2?family={fam_slug}:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400;1,700&display=swap");'
            if g_import not in seen_imports and not any(fam_slug.lower() in imp.lower() for imp in seen_imports):
                seen_imports.add(g_import)
                import_statements.append(g_import)

    # 3. Detect Icon Font Libraries (Font Awesome, Bootstrap Icons, Material Symbols)
    combined_markup = (html_markup + " " + matching_css).lower()
    
    if re.search(r'\b(fa|fas|far|fab|fal|fat|fad|fa-solid|fa-regular|fa-brands|font-awesome|font-awesome-pro)\b', combined_markup):
        fa_import = '@import url("https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css");'
        if fa_import not in seen_imports:
            seen_imports.add(fa_import)
            import_statements.append(fa_import)

    if re.search(r'\b(bi|bi-[a-z0-9-]+|bootstrap-icons)\b', combined_markup):
        bi_import = '@import url("https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css");'
        if bi_import not in seen_imports:
            seen_imports.add(bi_import)
            import_statements.append(bi_import)

    if re.search(r'\b(material-symbols|material-icons)\b', combined_markup):
        mat_import = '@import url("https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200");'
        if mat_import not in seen_imports:
            seen_imports.add(mat_import)
            import_statements.append(mat_import)

    return import_statements


def extract_scoped_css_for_section(
    section_node: Tag,
    full_css_corpus: str,
    section_prefix_class: str = "",
    pre_split_blocks: Optional[List[str]] = None,
    pre_extracted_root_vars: Optional[List[str]] = None,
    pre_extracted_font_faces: Optional[List[str]] = None
) -> str:
    """
    Extracts a self-contained stylesheet for a given section from a global CSS corpus.
    Captures only rules strictly matching the section's classes, tags, IDs, associated
    CSS variables (:root), referenced @keyframes, and media queries. Automatically
    resolves and prepends official CDN font @import statements.
    """
    if not full_css_corpus:
        return ""

    classes, ids, tags = extract_classes_and_ids_from_dom(section_node)
    if not classes and not ids and not tags:
        return ""

    matching_rules: List[str] = []
    root_variables: List[str] = list(pre_extracted_root_vars) if pre_extracted_root_vars is not None else []
    keyframes_blocks: List[str] = []
    font_face_blocks: List[str] = list(pre_extracted_font_faces) if pre_extracted_font_faces is not None else []
    media_query_blocks: List[str] = []
    used_var_names: Set[str] = set()
    used_animations: Set[str] = set()

    # 1. Capture @font-face rules if not pre-extracted
    if pre_extracted_font_faces is None:
        font_face_matches = re.findall(r'@font-face\s*\{[^}]+\}', full_css_corpus, re.DOTALL | re.IGNORECASE)
        font_face_blocks.extend(font_face_matches)

    # 2. Capture :root and CSS Custom Properties if not pre-extracted
    if pre_extracted_root_vars is None:
        root_matches = re.findall(r'(?::root|html|body)\s*\{([^}]+)\}', full_css_corpus, re.DOTALL | re.IGNORECASE)
        for r_content in root_matches:
            var_lines = [line.strip() for line in r_content.split(';') if '--' in line and ':' in line]
            if var_lines:
                root_variables.extend(var_lines)

    # 3. Clean and tokenize CSS into balanced top-level blocks
    css_blocks = pre_split_blocks if pre_split_blocks is not None else _split_css_top_level_blocks(full_css_corpus)

    for block in css_blocks:
        block = block.strip()
        if not block:
            continue

        # Handle @keyframes
        if block.lower().startswith('@keyframes') or block.lower().startswith('@-webkit-keyframes'):
            keyframes_blocks.append(block)
            continue

        # Handle @media queries
        if block.lower().startswith('@media'):
            media_matched, media_vars, media_anims = _filter_media_query_block_precision(block, classes, ids, tags)
            if media_matched:
                media_query_blocks.append(media_matched)
                used_var_names.update(media_vars)
                used_animations.update(media_anims)
            continue

        # Handle standard rule: selector { declarations }
        match = re.match(r'^([^{]+)\{(.+)\}$', block, re.DOTALL)
        if match:
            selectors_str = match.group(1).strip()
            declarations = match.group(2).strip()

            filtered_selectors = _filter_rule_selectors(selectors_str, classes, ids, tags)
            if filtered_selectors:
                matching_rules.append(f"{filtered_selectors} {{\n  {declarations}\n}}")

                # Detect referenced CSS variables: var(--xyz)
                for var_ref in re.findall(r'var\(\s*(--[a-zA-Z0-9_-]+)', declarations):
                    used_var_names.add(var_ref)

                # Detect if any keyframe animations are referenced
                anim_match = re.findall(r'animation(?:-name)?\s*:\s*([^;!]+)', declarations, re.IGNORECASE)
                for a in anim_match:
                    tokens = a.strip().split()
                    if tokens:
                        used_animations.add(tokens[0].strip())

    # Filter :root variables down to relevant ones
    relevant_root_vars: List[str] = []
    if root_variables:
        for v_line in root_variables:
            var_name = v_line.split(':')[0].strip()
            if var_name in used_var_names or any(brand_prefix in var_name for brand_prefix in ('--tj-', '--bs-primary', '--bs-secondary', '--bs-font', '--theme', '--color-primary', '--primary')):
                relevant_root_vars.append(v_line)

    # 4. Resolve typography and icon font CDN @import statements
    raw_section_html = str(section_node)
    all_matched_css = "\n".join(matching_rules + media_query_blocks)
    font_imports = resolve_font_imports_for_section(all_matched_css, full_css_corpus, raw_section_html)

    # Build final scoped CSS document
    output_parts: List[str] = []

    # Output CDN Font Imports at the very top
    if font_imports:
        output_parts.append("/* CDN Typography & Icon Fonts */\n" + "\n".join(font_imports))

    # Output Font Faces if any
    if font_face_blocks:
        output_parts.append("/* Web Fonts */\n" + "\n\n".join(font_face_blocks[:6]))

    # Output Root Variables if any
    if relevant_root_vars:
        unique_vars = list(dict.fromkeys(relevant_root_vars))[:30]
        output_parts.append(":root {\n  " + ";\n  ".join(unique_vars) + ";\n}")

    # Output Core Section Rules
    if matching_rules:
        output_parts.append("/* Section Scoped Styles */\n" + "\n\n".join(matching_rules))

    # Output Matching Media Queries
    if media_query_blocks:
        output_parts.append("/* Responsive Breakpoints */\n" + "\n\n".join(media_query_blocks))

    # Output Referenced Keyframes
    if keyframes_blocks and used_animations:
        relevant_keyframes = []
        for kf in keyframes_blocks:
            for anim_name in used_animations:
                if re.search(r'@(?:-webkit-)?keyframes\s+' + re.escape(anim_name) + r'\b', kf, re.IGNORECASE):
                    relevant_keyframes.append(kf)
                    break
        if relevant_keyframes:
            output_parts.append("/* Keyframe Animations */\n" + "\n\n".join(relevant_keyframes[:8]))

    return "\n\n".join(output_parts)


def _split_css_top_level_blocks(css_text: str) -> List[str]:
    """
    Splits CSS text into balanced top-level blocks, correctly respecting nested braces.
    """
    clean_css = re.sub(r'/\*.*?\*/', '', css_text, flags=re.DOTALL)

    blocks = []
    buffer = []
    depth = 0

    for char in clean_css:
        buffer.append(char)
        if char == '{':
            depth += 1
        elif char == '}':
            depth -= 1
            if depth == 0:
                block_str = "".join(buffer).strip()
                if block_str:
                    blocks.append(block_str)
                buffer = []

    if buffer:
        trailing = "".join(buffer).strip()
        if trailing:
            blocks.append(trailing)

    return blocks


def _filter_media_query_block_precision(
    media_block: str,
    classes: Set[str],
    ids: Set[str],
    tags: Set[str]
) -> Tuple[str, Set[str], Set[str]]:
    """
    Filters rules inside an @media query block with precision selector matching.
    Returns (filtered_media_css, used_vars_set, used_animations_set).
    """
    match = re.match(r'^(@media[^{]+)\{(.+)\}$', media_block, re.DOTALL | re.IGNORECASE)
    if not match:
        return "", set(), set()

    media_header = match.group(1).strip()
    inner_css = match.group(2).strip()

    inner_blocks = _split_css_top_level_blocks(inner_css)
    matched_inner_rules = []
    used_vars: Set[str] = set()
    used_anims: Set[str] = set()

    for block in inner_blocks:
        rule_match = re.match(r'^([^{]+)\{(.+)\}$', block.strip(), re.DOTALL)
        if rule_match:
            selectors_str = rule_match.group(1).strip()
            declarations = rule_match.group(2).strip()

            filtered_selectors = _filter_rule_selectors(selectors_str, classes, ids, tags)
            if filtered_selectors:
                matched_inner_rules.append(f"  {filtered_selectors} {{\n    {declarations}\n  }}")

                for var_ref in re.findall(r'var\(\s*(--[a-zA-Z0-9_-]+)', declarations):
                    used_vars.add(var_ref)

                anim_match = re.findall(r'animation(?:-name)?\s*:\s*([^;!]+)', declarations, re.IGNORECASE)
                for a in anim_match:
                    tokens = a.strip().split()
                    if tokens:
                        used_anims.add(tokens[0].strip())

    if not matched_inner_rules:
        return "", set(), set()

    return f"{media_header} {{\n" + "\n\n".join(matched_inner_rules) + "\n}", used_vars, used_anims
