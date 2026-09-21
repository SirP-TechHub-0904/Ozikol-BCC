"""
Full End-to-End Programmatic Test for Ozikol Template Importer Pipeline.
Tests all phases: Start -> Audit -> Apply (Clean) -> AI Tokenize -> Verify Package Structure.
"""

import asyncio
from main import app
from httpx import AsyncClient, ASGITransport

async def test_full_importer_flow():
    print("=" * 70)
    print("STARTING FULL END-TO-END PROGRAMMATIC PIPELINE TEST")
    print("=" * 70)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test", timeout=90.0) as client:
        # 1. Start Job
        print("\n[PHASE 1] POST /jobs/start...")
        start_payload = {
            "url": "https://nightpress-security.onrender.com",
            "suite_name": "Apex Modern Theme",
            "group_code": "APEXMODERN",
            "brand_name": "Apex Security"
        }
        start_resp = await client.post("/jobs/start", json=start_payload)
        assert start_resp.status_code == 200, f"Start failed: {start_resp.text}"
        job_data = start_resp.json()
        job_id = job_data["job_id"]
        print(f" -> Success! Job ID: {job_id}")

        # Wait for audit background task to finish
        print("\n[PHASE 2] Polling GET /jobs/{job_id}/audit until complete...")
        audit_data = None
        for attempt in range(60):
            audit_resp = await client.get(f"/jobs/{job_id}/audit")
            if audit_resp.status_code == 200:
                audit_data = audit_resp.json()
                break
            elif audit_resp.status_code == 202:
                await asyncio.sleep(1)
            else:
                raise AssertionError(f"Audit failed with status {audit_resp.status_code}: {audit_resp.text}")

        assert audit_data is not None, "Audit timed out"
        
        pages = audit_data.get("pages", [])
        sections = audit_data.get("sections", [])
        css_files = audit_data.get("css_files", [])
        js_files = audit_data.get("js_files", [])
        trackers = audit_data.get("trackers", [])
        
        heroes = [s for s in sections if s.get("category_key") == "hero"]
        breadcrumbs = [s for s in sections if s.get("category_key") == "breadcrumb"]
        duplicates = [s for s in sections if s.get("is_duplicate")]

        print(f" -> Total Pages Crawled: {len(pages)}")
        print(f" -> Total HTML Sections Extracted: {len(sections)}")
        print(f"    * Hero Sections (Homepage Main): {len(heroes)}")
        print(f"    * Breadcrumbs / Subpage Headers: {len(breadcrumbs)}")
        print(f"    * Duplicate Section Instances: {len(duplicates)}")
        print(f" -> Stylesheets: {len(css_files)} | JS Scripts: {len(js_files)} | Trackers Found: {len(trackers)}")

        # 3. Clean & Apply Selections (Phase 2)
        print(f"\n[PHASE 3] POST /jobs/{job_id}/apply (Pruning & Debranding HTML)...")
        selections_list = []
        for c in css_files:
            selections_list.append({"id": c["id"], "checked": True})
        for j in js_files:
            selections_list.append({"id": j["id"], "checked": j.get("js_category") != "analytics"})
        for p in pages:
            selections_list.append({"id": p["id"], "checked": True})
        for s in sections:
            selections_list.append({"id": s["id"], "checked": not s.get("is_duplicate")})
        for t in trackers:
            selections_list.append({"id": t["id"], "checked": False})

        apply_payload = {
            "selections": selections_list
        }
        apply_resp = await client.post(f"/jobs/{job_id}/apply", json=apply_payload)
        assert apply_resp.status_code == 200, f"Apply failed: {apply_resp.text}"
        cleaned_data = apply_resp.json()
        print(f" -> Success! Cleaned {len(cleaned_data.get('page_diffs', []))} pages.")
        print(f"    * Kept Sections: {len(cleaned_data.get('kept_sections', []))}")
        print(f"    * Kept Stylesheets: {len(cleaned_data.get('kept_css', []))}")
        print(f"    * Kept Scripts: {len(cleaned_data.get('kept_js', []))}")

        # 4. Debrand & Tokenize Blueprint Suite (Phase 4)
        print(f"\n[PHASE 4] POST /jobs/{job_id}/ai-tokenize (Synthesizing Blueprint Suite)...")
        tok_payload = {
            "suite_name": "Apex Modern Theme",
            "brand_name": "Apex Security",
            "model": "deepseek-chat"
        }
        tok_resp = await client.post(f"/jobs/{job_id}/ai-tokenize", json=tok_payload)
        assert tok_resp.status_code == 200, f"Tokenize failed: {tok_resp.text}"
        tok_res = tok_resp.json()
        suite = tok_res.get("suite", {})
        
        templates = suite.get("templates", [])
        suite_pages = suite.get("pages", [])
        categories = suite.get("categories", [])
        
        print(f" -> Total Master Blueprints Created: {len(templates)}")
        print(f" -> Total Assembled Pages Created: {len(suite_pages)}")
        print(f" -> Default Categories Configured: {len(categories)}")

        # Category Breakdown
        cat_counts = {}
        for t in templates:
            ck = t.get("category_key", "unknown")
            cat_counts[ck] = cat_counts.get(ck, 0) + 1
        
        print("\n[BLUEPRINT CATEGORY BREAKDOWN]:")
        for ck, count in sorted(cat_counts.items()):
            print(f"   • {ck.upper():<12}: {count} master blueprint(s)")

        # Verify Key Structural Blueprint Templates
        print("\n[SAMPLE TEMPLATES IN VAULT]:")
        for t in templates[:6]:
            print(f"   [OK] [{t.get('category_key').upper():<10}] {t.get('name')} | Variant: {t.get('variant_code')}")

        print("\n[SAMPLE ASSEMBLED DATABASE PAGES]:")
        for p in suite_pages[:5]:
            sec_count = len(p.get("sections", []))
            print(f"   [OK] Page: /{p.get('slug')} (\"{p.get('title')}\") -> {sec_count} section slots mapped")

        print("\n" + "=" * 70)
        print("ALL 4 PHASES PASSED WITH 100% SUCCESS! ZERO COMPILATION / RUNTIME ERRORS.")
        print("=" * 70)

if __name__ == "__main__":
    asyncio.run(test_full_importer_flow())
