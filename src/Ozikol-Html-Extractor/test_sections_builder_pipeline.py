"""
Comprehensive Test Suite for SectionsBuilderFromUrl Engine.

Validates:
1. Semantic Section Slicing and DOM Decomposition.
2. Class-Matched Scoped CSS Extraction.
3. Standalone Independent HTML Sandbox Preview Generation.
4. FastAPI Router Endpoints via HTTP TestClient.
"""

import sys
import unittest
from bs4 import BeautifulSoup
from fastapi.testclient import TestClient

from main import app
from pipeline.css_extractor import extract_classes_and_ids_from_dom, extract_scoped_css_for_section
from pipeline.preview_builder import build_standalone_page_html, build_standalone_section_html
from pipeline.section_slicer import slice_page_into_sections
from pipeline.suite_grouper import _tokenize_section_html

# Sample Full Webpage HTML with Multiple Realistic Sections & CSS
SAMPLE_HTML = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Apex Cloud Infrastructure | Enterprise</title>
    <style>
        :root {
            --primary: #0050e5;
            --dark: #0f172a;
            --gray: #64748b;
        }
        body { font-family: Inter, sans-serif; margin: 0; background: #fff; }
        .navbar-main { display: flex; justify-content: space-between; padding: 20px 40px; background: #fff; }
        .brand-logo { font-size: 24px; font-weight: 800; color: var(--dark); }
        .nav-links { display: flex; gap: 20px; }
        .btn-portal { background: var(--primary); color: #fff; padding: 10px 20px; border-radius: 6px; }

        .hero-section { padding: 80px 40px; background: #f8fafc; text-align: center; }
        .hero-badge { display: inline-block; padding: 4px 12px; background: #e0e7ff; color: #4338ca; border-radius: 20px; }
        .hero-title { font-size: 48px; font-weight: 900; color: var(--dark); margin: 20px 0; }
        .hero-subtext { font-size: 18px; color: var(--gray); max-width: 600px; margin: 0 auto 30px; }

        .feature-grid-section { padding: 60px 40px; }
        .feature-card { border: 1px solid #e2e8f0; padding: 24px; border-radius: 12px; margin-bottom: 20px; }
        .feature-icon { font-size: 32px; color: var(--primary); }
        .feature-title { font-size: 20px; font-weight: 700; margin-top: 10px; }

        .pricing-section { padding: 60px 40px; background: #fafafa; }
        .pricing-card { background: #fff; border: 2px solid #0050e5; padding: 30px; border-radius: 16px; }
        .pricing-price { font-size: 36px; font-weight: 800; color: #0050e5; }

        .contact-section { padding: 60px 40px; }
        .contact-form { max-width: 500px; margin: 0 auto; }
        .form-input { width: 100%; padding: 12px; margin-bottom: 16px; border: 1px solid #cbd5e1; }

        .footer-main { background: #0f172a; color: #94a3b8; padding: 60px 40px 20px; }
        .footer-cols { display: grid; grid-template-columns: repeat(4, 1fr); gap: 40px; }
        .copyright-text { text-align: center; margin-top: 40px; font-size: 13px; }

        @media (max-width: 768px) {
            .navbar-main { flex-direction: column; }
            .hero-title { font-size: 32px; }
            .footer-cols { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <header class="navbar-main">
        <a href="/" class="brand-logo">Apex Cloud</a>
        <nav class="nav-links">
            <a href="/">Home</a>
            <a href="/about">About Us</a>
            <a href="/services">Services</a>
            <a href="/pricing">Pricing</a>
            <a href="/contact">Contact</a>
        </nav>
        <a href="/login" class="btn-portal">Client Login</a>
    </header>

    <main>
        <section class="hero-section">
            <span class="hero-badge">Cloud Architecture 2026</span>
            <h1 class="hero-title">Next-Gen Distributed Compute Platform</h1>
            <p class="hero-subtext">Scale applications seamlessly across high-performance edge clusters with zero downtime.</p>
            <a href="/register" class="btn-portal">Start 14-Day Free Trial</a>
        </section>

        <section class="feature-grid-section">
            <h2>Core Platform Capabilities</h2>
            <div class="feature-card">
                <div class="feature-icon">bolt</div>
                <h3 class="feature-title">Ultra Low Latency</h3>
                <p>Edge execution with sub-millisecond roundtrips globally.</p>
            </div>
            <div class="feature-card">
                <div class="feature-icon">shield</div>
                <h3 class="feature-title">Enterprise Security</h3>
                <p>End-to-end encrypted tenant partitions and SOC2 compliance.</p>
            </div>
        </section>

        <section class="pricing-section">
            <h2>Transparent Subscription Plans</h2>
            <div class="pricing-card">
                <h3>Pro Tier</h3>
                <div class="pricing-price">$99/mo</div>
                <p>Includes unlimited edge routing, custom domains, and 24/7 dedicated support.</p>
                <a href="/checkout" class="btn-portal">Subscribe Now</a>
            </div>
        </section>

        <section class="contact-section">
            <h2>Get In Touch with Field Engineers</h2>
            <form class="contact-form">
                <input type="text" class="form-input" placeholder="Your Full Name" />
                <input type="email" class="form-input" placeholder="work@company.com" />
                <button type="submit" class="btn-portal">Send Message</button>
            </form>
        </section>
    </main>

    <footer class="footer-main">
        <div class="footer-cols">
            <div>
                <h4>About Apex</h4>
                <p>Pioneering distributed cloud computing infrastructure for global enterprises.</p>
            </div>
            <div>
                <h4>Solutions</h4>
                <p>Edge Compute<br>Cloud Storage<br>Managed Telemetry</p>
            </div>
            <div>
                <h4>Company</h4>
                <p>About Us<br>Careers<br>Newsroom</p>
            </div>
            <div>
                <h4>Legal</h4>
                <p>Privacy Policy<br>Terms of Service</p>
            </div>
        </div>
        <div class="copyright-text">
            © 2026 Apex Cloud Inc. All rights reserved.
        </div>
    </footer>
</body>
</html>
"""


class TestSectionsBuilderPipeline(unittest.TestCase):

    def test_01_section_slicing(self):
        """Validates that DOM is sliced into classified sections (Menu, Hero, Features, Pricing, Contact, Footer)."""
        sections = slice_page_into_sections(SAMPLE_HTML, page_url="https://apexcloud.io", page_slug="home", page_title="Home")
        
        categories = [s["category_key"] for s in sections]
        self.assertIn("menu", categories, "Should extract Menu / Navigation section")
        self.assertIn("hero", categories, "Should extract Hero Banner section")
        self.assertIn("body", categories, "Should extract Body Feature sections")
        self.assertIn("footer", categories, "Should extract Footer section")

        # Verify variant codes and labels
        labels = [s["label"] for s in sections]
        self.assertTrue(any("Pricing" in l for l in labels), "Should identify Pricing Table section")
        self.assertTrue(any("Contact" in l for l in labels), "Should identify Contact section")
        print(f"[TEST 1 PASS] Successfully sliced HTML into {len(sections)} modular sections: {categories}")

    def test_02_css_extraction_and_scoping(self):
        """Validates class-based CSS extraction for isolated sections."""
        soup = BeautifulSoup(SAMPLE_HTML, "lxml")
        hero_node = soup.find(attrs={"class": "hero-section"})
        self.assertIsNotNone(hero_node)

        # Full CSS string from sample
        style_content = soup.find("style").string

        scoped_hero_css = extract_scoped_css_for_section(hero_node, style_content)
        self.assertIn(".hero-section", scoped_hero_css, "Should retain .hero-section rule")
        self.assertIn(".hero-title", scoped_hero_css, "Should retain .hero-title rule")
        self.assertIn(":root", scoped_hero_css, "Should retain :root variables")
        self.assertNotIn(".footer-cols", scoped_hero_css, "Should NOT leak unrelated .footer-cols rule")
        self.assertNotIn(".pricing-price", scoped_hero_css, "Should NOT leak unrelated .pricing-price rule")
        print("[TEST 2 PASS] Scoped CSS accurately captured matching classes and variables without leaking unrelated rules.")

    def test_03_independent_preview_generation(self):
        """Validates that standalone HTML document renders with scoped CSS and mock content."""
        section_html = '<section class="hero-section"><h1>Live Title</h1></section>'
        scoped_css = '.hero-section { background: #0050e5; color: white; }'
        
        doc = build_standalone_section_html(
            section_html=section_html,
            scoped_css=scoped_css,
            page_title="Test Live Preview",
            dark_mode=False
        )
        self.assertIn("<!DOCTYPE html>", doc)
        self.assertIn(".hero-section { background: #0050e5;", doc)
        self.assertIn('<div id="ozikol-section-sandbox"', doc)
        print("[TEST 3 PASS] Generated standalone independent preview document successfully.")

    def test_04_fastapi_endpoints(self):
        """Validates FastAPI OpenAPI and SectionsBuilder router integration."""
        client = TestClient(app)

        # 1. Health check
        health_res = client.get("/health")
        self.assertEqual(health_res.status_code, 200)

        # 2. Extract validation with invalid URL
        bad_res = client.post("/sections-builder-from-url/extract", json={"url": "not-a-valid-url"})
        self.assertEqual(bad_res.status_code, 400)

        # 3. Test Preview endpoint with mock data in store
        from routers.sections_builder import SECTIONS_BUILDER_STORE
        from models.schemas import ExtractedSectionItem, SectionsBuilderResponse, JobStatus

        mock_sec = ExtractedSectionItem(
            id="sec_menu_test123",
            category_key="menu",
            variant_code="Menu_Test",
            name="Test Navbar",
            label="Navigation",
            html_template="<nav class='test-nav'>Logo</nav>",
            scoped_css=".test-nav { color: blue; }",
            parent_page_slugs=["home"]
        )

        mock_resp = SectionsBuilderResponse(
            job_id="test_job_999",
            status=JobStatus.COMPLETE,
            group_code="suite_test",
            suite_name="Test Suite",
            source_url="https://test.local",
            total_sections=1,
            total_pages=1,
            sections=[mock_sec]
        )
        SECTIONS_BUILDER_STORE["test_job_999"] = mock_resp

        preview_res = client.get("/sections-builder-from-url/preview/test_job_999/sec_menu_test123")
        self.assertEqual(preview_res.status_code, 200)
        self.assertIn("text/html", preview_res.headers["content-type"])
        self.assertIn(".test-nav { color: blue; }", preview_res.text)

        print("[TEST 4 PASS] FastAPI endpoints & live preview sandbox responded with 200 OK.")


if __name__ == "__main__":
    unittest.main()
