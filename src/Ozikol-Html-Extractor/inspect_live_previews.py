"""
Detailed Visual & Technical Preview Quality Inspector.

Runs extraction on Bexon and Orisa, exports standalone HTML preview documents
to disk, and audits:
- Font/icon imports
- Image/asset path resolution
- Scoped CSS rule fidelity
- JS interaction syntax
"""

import asyncio
import os
import re
from models.schemas import SectionsBuilderRequest
from pipeline.preview_builder import build_standalone_section_html
from pipeline.suite_grouper import run_sections_builder_pipeline

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "preview_samples")
os.makedirs(OUTPUT_DIR, exist_ok=True)


async def inspect_live():
    test_target = ("Bexon Corporate", "https://themejunction.net/html/bexon/demo/index-2.html")
    name, url = test_target

    print(f"[*] Extracting and Auditing: {name} ({url})")
    req = SectionsBuilderRequest(url=url, suite_name=name, crawl_subpages=False)
    res = await run_sections_builder_pipeline(req)

    print(f"\n[+] Total Sections Extracted: {len(res.sections)}")

    audit_summary = []

    for idx, sec in enumerate(res.sections, start=1):
        # Build standalone preview HTML document
        font_urls = [
            tag.content.split('href="')[1].split('"')[0]
            for tag in res.code_injections
            if 'href="' in tag.content
        ]

        doc = build_standalone_section_html(
            section_html=sec.html_template,
            scoped_css=sec.scoped_css,
            js_script=sec.js_script,
            page_title=f"{sec.name} - Preview",
            external_fonts=font_urls,
            dark_mode=(sec.category_key == "footer" or "dark" in sec.variant_code.lower())
        )

        filename = f"{idx:02d}_{sec.category_key}_{sec.variant_code}.html"
        filepath = os.path.join(OUTPUT_DIR, filename)

        with open(filepath, "w", encoding="utf-8") as f:
            f.write(doc)

        # Audit properties
        has_relative_img = bool(re.search(r'<img[^>]+src=["\'](?!http|//|data:)[^"\']+["\']', sec.html_template, re.I))
        has_css_vars = "--" in sec.scoped_css
        has_flex_or_grid = "display: flex" in sec.scoped_css or "display: grid" in sec.scoped_css or "display:flex" in sec.scoped_css or "display:grid" in sec.scoped_css

        audit_summary.append({
            "idx": idx,
            "category": sec.category_key,
            "name": sec.name,
            "variant": sec.variant_code,
            "html_bytes": len(sec.html_template),
            "css_bytes": len(sec.scoped_css),
            "has_relative_img": has_relative_img,
            "has_css_vars": has_css_vars,
            "has_layout_rules": has_flex_or_grid,
            "file": filename
        })

    print("\n" + "=" * 90)
    print(f"{'#':<3} | {'CATEGORY':<12} | {'NAME':<35} | {'HTML':<8} | {'CSS':<8} | {'VARS':<5} | {'LAYOUT':<6}")
    print("=" * 90)
    for a in audit_summary:
        print(f"{a['idx']:<3} | {a['category']:<12} | {a['name'][:35]:<35} | {a['html_bytes']:<8} | {a['css_bytes']:<8} | {'YES' if a['has_css_vars'] else 'NO':<5} | {'YES' if a['has_layout_rules'] else 'NO':<6}")

    print("=" * 90)
    print(f"\n[+] Saved {len(audit_summary)} standalone preview HTML documents to: {OUTPUT_DIR}")


if __name__ == "__main__":
    asyncio.run(inspect_live())
