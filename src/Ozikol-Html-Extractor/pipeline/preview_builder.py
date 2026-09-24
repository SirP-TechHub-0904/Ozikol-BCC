"""
Independent Standalone Preview Document Builder.

Generates complete, self-contained HTML envelopes for any individual section
or full composite page. Guarantees that extracted sections render and run
interactively in isolation with their own scoped CSS, web fonts, icon suites,
and sandboxed JavaScript.
"""

import logging
import re
from typing import Any, List, Optional

logger = logging.getLogger(__name__)


def build_standalone_section_html(
    section_html: str,
    scoped_css: str = "",
    js_script: Optional[str] = None,
    page_title: str = "Section Live Preview",
    external_fonts: Optional[List[str]] = None,
    external_scripts: Optional[List[str]] = None,
    dark_mode: bool = False
) -> str:
    """
    Constructs an independent, fully rendered HTML document for a single section.

    :param section_html: The HTML markup of the section.
    :param scoped_css: The extracted scoped CSS properties.
    :param js_script: Optional JavaScript interaction handlers.
    :param page_title: Title for the document header.
    :param external_fonts: Optional list of external font/CSS stylesheet URLs.
    :param external_scripts: Optional list of vendor script URLs.
    :param dark_mode: Whether to initialize background in dark canvas mode.
    :returns: A standalone HTML5 document string.
    """
    fonts_html = ""
    default_fonts = [
        '<link rel="preconnect" href="https://fonts.googleapis.com">',
        '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
        '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">',
        '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />',
        '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />'
    ]

    if external_fonts:
        for f in external_fonts:
            if f and f.startswith("http"):
                default_fonts.append(f'<link rel="stylesheet" href="{f}">')

    fonts_html = "\n    ".join(default_fonts)

    scripts_html = ""
    if external_scripts:
        for s in external_scripts:
            if s and s.startswith("http"):
                scripts_html += f'\n    <script src="{s}"></script>'

    bg_color = "#0b0f19" if dark_mode else "#ffffff"
    text_color = "#f8fafc" if dark_mode else "#0f172a"

    inline_js = ""
    if js_script and js_script.strip():
        inline_js = f"""
    <script>
      (function() {{
        try {{
          {js_script}
        }} catch(err) {{
          console.warn('[Ozikol Preview] Section script notice:', err);
        }}
      }})();
    </script>"""

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{page_title}</title>
    {fonts_html}
    {scripts_html}
    <style>
        /* Base Preview Environment Reset */
        *, *::before, *::after {{
            box-sizing: border-box;
        }}
        html, body {{
            margin: 0;
            padding: 0;
            width: 100%;
            min-height: 100%;
            background-color: {bg_color};
            color: {text_color};
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }}
        img, svg, video {{
            max-width: 100%;
            height: auto;
            display: inline-block;
        }}
        a {{
            color: inherit;
            text-decoration: none;
        }}

        /* Extracted Scoped Section Styles */
        {scoped_css}
    </style>
</head>
<body>
    <div id="ozikol-section-sandbox" class="oz-section-isolated-wrapper">
        {section_html}
    </div>
    {inline_js}
</body>
</html>"""


def build_standalone_page_html(
    sections_list: List[dict[str, Any]],
    page_title: str = "Page Composite Live Preview",
    external_fonts: Optional[List[str]] = None,
    external_scripts: Optional[List[str]] = None
) -> str:
    """
    Assembles a full page document composed of multiple ordered sections.

    :param sections_list: Ordered list of section dictionaries with html_template and scoped_css.
    :param page_title: Title for the browser window/preview tab.
    :returns: A standalone composite HTML document string.
    """
    combined_html = []
    combined_css = []
    combined_js = []

    for s in sections_list:
        combined_html.append(f"<!-- Section: {s.get('name', 'Section')} ({s.get('variant_code', '')}) -->")
        combined_html.append(s.get("html_template", ""))
        if s.get("scoped_css"):
            combined_css.append(f"/* === {s.get('variant_code', 'Section')} === */\n" + s.get("scoped_css"))
        if s.get("js_script"):
            combined_js.append(s.get("js_script"))

    full_html_body = "\n\n".join(combined_html)
    full_css_body = "\n\n".join(combined_css)
    full_js_body = "\n\n".join(combined_js)

    return build_standalone_section_html(
        section_html=full_html_body,
        scoped_css=full_css_body,
        js_script=full_js_body if full_js_body.strip() else None,
        page_title=page_title,
        external_fonts=external_fonts,
        external_scripts=external_scripts
    )
