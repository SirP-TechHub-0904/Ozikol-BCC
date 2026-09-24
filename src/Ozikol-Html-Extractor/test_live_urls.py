"""
Live URL Extraction Test Script for SectionsBuilderFromUrl.

Tests extraction on:
1. https://themejunction.net/html/edunex/demo/
2. https://themejunction.net/html/bexon/demo/index-2.html
3. https://orisa-html-demo.pages.dev/index-dark
"""

import asyncio
import json
import logging
from models.schemas import SectionsBuilderRequest
from pipeline.suite_grouper import run_sections_builder_pipeline

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

TEST_URLS = [
    ("Edunex Education", "https://themejunction.net/html/edunex/demo/"),
    ("Bexon Corporate", "https://themejunction.net/html/bexon/demo/index-2.html"),
    ("Orisa Dark SaaS", "https://orisa-html-demo.pages.dev/index-dark")
]


async def run_test():
    for name, url in TEST_URLS:
        print("\n" + "=" * 80)
        print(f"[*] TESTING LIVE URL EXTRACTION: {name}")
        print(f"[*] Target: {url}")
        print("=" * 80)

        req = SectionsBuilderRequest(
            url=url,
            suite_name=name,
            crawl_subpages=True,
            max_subpages=3
        )

        try:
            res = await run_sections_builder_pipeline(req)
            print(f"\n[+] EXTRACTION SUCCESSFUL for {name}!")
            print(f"[+] Group Code: {res.group_code}")
            print(f"[+] Total Discovered Pages: {res.total_pages}")
            for p in res.pages:
                print(f"   - [{p.slug}] '{p.title}' (is_home: {p.is_home}, sections: {len(p.section_ids)}) -> {p.url}")

            print(f"\n[+] Total Extracted Sections: {res.total_sections}")
            print(f"[+] Category Breakdown: {res.category_breakdown}")

            print("\n[+] Section Inventory:")
            for i, sec in enumerate(res.sections, start=1):
                css_size = len(sec.scoped_css)
                html_size = len(sec.html_template)
                print(f"   {i}. [{sec.category_key.upper()}] '{sec.name}' ({sec.variant_code})")
                print(f"      Label: {sec.label} | DomTag: <{sec.dom_tag}> | HTML: {html_size} bytes | Scoped CSS: {css_size} bytes")
                print(f"      Pages: {sec.parent_page_slugs}")

        except Exception as exc:
            print(f"\n[-] ERROR extracting {name}: {exc}")
            import traceback
            traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(run_test())
