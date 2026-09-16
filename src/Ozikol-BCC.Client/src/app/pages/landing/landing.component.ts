import { Component, OnInit, OnDestroy, HostListener, ElementRef, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml, Title, Meta } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { CartService } from '../../core/services/cart.service';
import { ToastService } from '../../core/services/toast.service';
import { TemplateHydrationService } from '../admin/content/templates/services/template-hydration.service';

/**
 * Public dynamic website orchestration component.
 * Faithfully implements the full web architecture:
 * 1. Header Tags (<head>): Active SEO meta tags, Google Fonts, OpenGraph, Twitter cards, Favicons, and Bootstrap/FA CSS.
 * 2. Body Open Tags (<body>): Injected immediately after <body> opening tag.
 * 3. Modular Sections: Navbar (menu), Hero (hero) or Breadcrumb, ordered PageSections (body), and Footer (footer).
 * 4. Footer Scripts (</body>): Injected immediately before </body> closing tag (Bootstrap JS bundle, section scripts).
 * 5. Full Document Scrolling: Native responsive browser scrolling without viewport lock.
 */
@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <!-- Top Progress / Loader -->
    <div *ngIf="loading" class="public-site-loader">
      <div class="loader-inner">
        <div class="spinner-ring"></div>
        <p class="loader-text">Loading {{ brandName || 'Website' }}...</p>
      </div>
    </div>

    <!-- Error State -->
    <div *ngIf="error && !loading" class="public-site-error-container">
      <div class="error-card">
        <span class="material-symbols-outlined error-icon">cloud_off</span>
        <h2>Website Under Construction</h2>
        <p>{{ errorMessage || 'The website content is currently being initialized. Please check back shortly.' }}</p>
        <div class="error-actions">
          <button type="button" (click)="loadSiteData()" class="btn-retry">Retry Connection</button>
          <a routerLink="/auth/login" class="btn-login-shortcut">Portal Sign In</a>
        </div>
      </div>
    </div>

    <!-- Dynamic Live Hydrated Site -->
    <div *ngIf="!loading && !error" class="public-dynamic-site-wrapper" [class.mobile-menu-active]="mobileMenuOpen">
      <!-- Rendered HTML Blocks (Menu, Hero/Breadcrumb, Sections, Footer) -->
      <main class="dynamic-rendered-content" [innerHTML]="safeRenderedHtml"></main>
    </div>
  `,
  styles: [`
    /* Universal Host and Reset */
    :host {
      display: block;
      width: 100%;
      min-height: 100vh;
      background-color: #ffffff;
      color: #1e293b;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }

    /* Modern Minimalist Preloader */
    .public-site-loader {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: #ffffff;
    }
    .loader-inner {
      text-align: center;
    }
    .spinner-ring {
      display: inline-block;
      width: 46px;
      height: 46px;
      border: 3.5px solid #e2e8f0;
      border-top-color: #0050e5;
      border-radius: 50%;
      animation: spin 0.85s linear infinite;
      margin-bottom: 16px;
    }
    .loader-text {
      color: #64748b;
      font-size: 14.5px;
      font-weight: 500;
      letter-spacing: -0.01em;
      margin: 0;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Error / Offline State */
    .public-site-error-container {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 30px 20px;
      background: #f8fafc;
    }
    .error-card {
      max-width: 480px;
      background: #ffffff;
      border-radius: 16px;
      padding: 40px 32px;
      text-align: center;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.03);
      border: 1px solid #e2e8f0;
    }
    .error-icon {
      font-size: 54px;
      color: #64748b;
      margin-bottom: 16px;
    }
    .error-card h2 {
      font-size: 22px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 10px;
    }
    .error-card p {
      color: #64748b;
      font-size: 14px;
      line-height: 1.6;
      margin: 0 0 24px;
    }
    .error-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
    }
    .btn-retry {
      background: #0050e5;
      color: #ffffff;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 13.5px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .btn-retry:hover {
      background: #003ebd;
    }
    .btn-login-shortcut {
      background: transparent;
      color: #475569;
      border: 1px solid #cbd5e1;
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 13.5px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.15s ease;
    }
    .btn-login-shortcut:hover {
      background: #f1f5f9;
      color: #0f172a;
    }

    /* Core Public Layout & Interactive Dropdown Styles */
    .public-dynamic-site-wrapper {
      position: relative;
      width: 100%;
      min-height: 100vh;
    }

    /* Navbar Dropdowns */
    .dropdown {
      position: relative !important;
    }
    .dropdown-menu {
      display: none;
    }
    .dropdown-menu.show {
      display: block !important;
      position: absolute !important;
      top: 100% !important;
      left: 0 !important;
      z-index: 99999 !important;
      min-width: 15rem !important;
      margin-top: 8px !important;
      opacity: 1 !important;
      visibility: visible !important;
      background-color: #ffffff !important;
      border: 1px solid #e2e8f0 !important;
      border-radius: 10px !important;
      box-shadow: 0 12px 28px -4px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08) !important;
      padding: 8px 0 !important;
      animation: fadeInDropdown 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes fadeInDropdown {
      from { opacity: 0; transform: translateY(-6px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .dropdown-item {
      cursor: pointer;
      display: block !important;
      padding: 9px 18px !important;
      font-size: 14px !important;
      font-weight: 500 !important;
      color: #334155 !important;
      text-decoration: none !important;
      transition: background 0.15s ease, color 0.15s ease !important;
    }
    .dropdown-item:hover {
      background-color: #f1f5f9 !important;
      color: #0050e5 !important;
    }

    /* Dynamic Form Input Focus & Styling */
    .dynamic-rendered-content form .form-control:focus,
    .dynamic-rendered-content form .form-select:focus {
      border-color: #0050e5 !important;
      box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.15) !important;
    }
    .dynamic-rendered-content form button[type="submit"]:disabled {
      opacity: 0.65;
      cursor: not-allowed;
    }
  `]
})
export class LandingComponent implements OnInit, OnDestroy {
  // State Flags
  loading: boolean = true;
  error: boolean = false;
  errorMessage: string = '';
  mobileMenuOpen: boolean = false;

  // Active Routing Context
  currentSlug: string = '';
  activeBlogId: string | null = null;

  // Tenant Live Content & Theme Architecture
  brandName: string = 'Organization';
  brandLogoUrl: string = '';
  brandInfo: any = {};
  activeTemplates: any[] = [];
  categories: any[] = [];
  publishedPages: any[] = [];
  sections: any[] = [];
  sliders: any[] = [];
  blogs: any[] = [];
  codeInjections: { head: any[]; bodyOpen: any[]; footer: any[] } = { head: [], bodyOpen: [], footer: [] };

  // Page Specific Resolution
  currentPage: any = null;
  currentArticle: any = null;

  // Render Pipeline
  renderedStyles: string = '';
  safeRenderedHtml: SafeHtml | null = null;

  private routeSub: Subscription | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService,
    public cartService: CartService,
    private toastService: ToastService,
    private templateHydration: TemplateHydrationService,
    private sanitizer: DomSanitizer,
    private titleService: Title,
    private metaService: Meta,
    private elementRef: ElementRef
  ) {}

  ngOnInit(): void {
    // Unlock native document scrolling for public website mode
    document.body.classList.add('public-website-mode');

    // Listen to route changes (slug changes) to support instant in-app navigation
    this.routeSub = this.route.params.subscribe(params => {
      const slugParam = (params['slug'] || '').trim().toLowerCase();
      this.currentSlug = slugParam;

      // Check if viewing blog by ID or slug
      const blogIdParam = this.route.snapshot.paramMap.get('id');
      this.activeBlogId = blogIdParam;

      this.loadSiteData();
    });
  }

  ngOnDestroy(): void {
    // Re-lock or restore default dashboard mode
    document.body.classList.remove('public-website-mode');

    // Clean up dynamic tags injected into head and body
    document.querySelectorAll('.ozikol-injected-tag').forEach(el => el.remove());
    document.getElementById('tenant-dynamic-theme-styles')?.remove();

    if (this.routeSub) {
      this.routeSub.unsubscribe();
    }
  }

  /**
   * Main data coordination pipeline:
   * 1. Fetches active templates, categories, published pages, and branding from backend APIs.
   * 2. Fetches page-specific sections or blog articles depending on activeSlug.
   * 3. Executes TemplateHydrationService to assemble and sanitize the final HTML document.
   */
  loadSiteData(): void {
    this.loading = true;
    this.error = false;

    // Concurrently fetch foundational website metadata
    Promise.all([
      this.fetchBrandSettings(),
      this.fetchActiveTemplates(),
      this.fetchNavigationCategories(),
      this.fetchPublishedPages(),
      this.fetchCodeInjections()
    ])
    .then(async () => {
      // Route dispatch based on active slug
      if (!this.currentSlug || this.currentSlug === 'home') {
        // 1. Homepage Rendering
        await Promise.all([
          this.fetchHomeSections(),
          this.fetchSliders(),
          this.fetchRecentBlogs()
        ]);
        this.composeHomepage();
      } else if (this.currentSlug === 'blog') {
        // 2. Blog Archive or Single Article
        if (this.activeBlogId) {
          await this.fetchSingleBlog(this.activeBlogId);
          this.composeBlogDetail();
        } else {
          await this.fetchAllBlogs();
          this.composeBlogArchive();
        }
      } else {
        // 3. Dynamic Page by Slug (e.g., about, request-service, privacy-policy, contact-us, etc.)
        await this.fetchPageBySlug(this.currentSlug);
        this.composeContentPage();
      }

      this.loading = false;
      this.recordTelemetry();
    })
    .catch((err) => {
      console.error('Failed to load website runtime:', err);
      this.loading = false;
      this.error = true;
      this.errorMessage = err?.message || 'Could not connect to website delivery services.';
    });
  }

  // ========================================================
  // BACKEND API DATA RETRIEVAL
  // ========================================================

  private fetchBrandSettings(): Promise<void> {
    return new Promise((resolve) => {
      this.apiService.get('SettingsApi/brand').subscribe({
        next: (res: any) => {
          if (res?.data) {
            this.brandInfo = res.data;
            this.brandName = res.data.companyName || res.data.websiteTitle || 'Acme Global';
            this.brandLogoUrl = res.data.companyLogoUrl || '';
          }
          resolve();
        },
        error: () => resolve()
      });
    });
  }

  private fetchActiveTemplates(): Promise<void> {
    return new Promise((resolve) => {
      this.apiService.get('WebsiteContentApi/theme/active-templates').subscribe({
        next: (res: any) => {
          this.activeTemplates = res?.data || [];
          resolve();
        },
        error: () => {
          // Fallback to installed templates if admin endpoint exists
          this.apiService.get('ContentApi/templates/installed').subscribe({
            next: (adminRes: any) => {
              const all = adminRes?.data || [];
              this.activeTemplates = all.filter((t: any) => t.isActive);
              resolve();
            },
            error: () => resolve()
          });
        }
      });
    });
  }

  private fetchNavigationCategories(): Promise<void> {
    return new Promise((resolve) => {
      this.apiService.get('WebsiteContentApi/categories').subscribe({
        next: (res: any) => {
          this.categories = res?.data || [];
          resolve();
        },
        error: () => resolve()
      });
    });
  }

  private fetchPublishedPages(): Promise<void> {
    return new Promise((resolve) => {
      this.apiService.get('WebsiteContentApi/pages').subscribe({
        next: (res: any) => {
          this.publishedPages = res?.data || [];
          resolve();
        },
        error: () => resolve()
      });
    });
  }

  private fetchCodeInjections(): Promise<void> {
    return new Promise((resolve) => {
      this.apiService.get('WebsiteContentApi/code-injections').subscribe({
        next: (res: any) => {
          const data = res?.data || {};
          this.codeInjections = {
            head: data.head || [],
            bodyOpen: data.bodyOpen || [],
            footer: data.footer || []
          };
          resolve();
        },
        error: () => resolve()
      });
    });
  }

  private fetchHomeSections(): Promise<void> {
    return new Promise((resolve) => {
      this.apiService.get('WebsiteContentApi/sections?pageSet=home').subscribe({
        next: (res: any) => {
          this.sections = res?.data || [];
          resolve();
        },
        error: () => resolve()
      });
    });
  }

  private fetchSliders(): Promise<void> {
    return new Promise((resolve) => {
      this.apiService.get('WebsiteContentApi/sliders').subscribe({
        next: (res: any) => {
          this.sliders = res?.data || [];
          resolve();
        },
        error: () => resolve()
      });
    });
  }

  private fetchRecentBlogs(): Promise<void> {
    return new Promise((resolve) => {
      this.apiService.get('WebsiteContentApi/blogs?limit=3').subscribe({
        next: (res: any) => {
          this.blogs = res?.data || [];
          resolve();
        },
        error: () => resolve()
      });
    });
  }

  private fetchAllBlogs(): Promise<void> {
    return new Promise((resolve) => {
      this.apiService.get('WebsiteContentApi/blogs').subscribe({
        next: (res: any) => {
          this.blogs = res?.data || [];
          resolve();
        },
        error: () => resolve()
      });
    });
  }

  private fetchSingleBlog(id: string): Promise<void> {
    return new Promise((resolve) => {
      this.apiService.get(`WebsiteContentApi/blogs/${id}`).subscribe({
        next: (res: any) => {
          this.currentArticle = res?.data || null;
          resolve();
        },
        error: () => resolve()
      });
    });
  }

  private fetchPageBySlug(slug: string): Promise<void> {
    return new Promise((resolve) => {
      const clean = (slug || '').trim().toLowerCase().replace(/^\/+/, '');
      this.apiService.get(`WebsiteContentApi/pages/slug/${clean}`).subscribe({
        next: (res: any) => {
          this.currentPage = res?.data || null;
          // In-memory fallback if not found via API
          if (!this.currentPage) {
            this.currentPage = this.publishedPages.find(p =>
              (p.directUrl && p.directUrl.toLowerCase().replace(/^\/+/, '') === clean) ||
              (p.slug && p.slug.toLowerCase().replace(/^\/+/, '') === clean) ||
              (p.title && p.title.toLowerCase().replace(/\s+/g, '-') === clean)
            ) || null;
          }
          resolve();
        },
        error: (err) => {
          console.warn(`Could not load page with slug '${slug}':`, err);
          this.currentPage = this.publishedPages.find(p =>
            (p.directUrl && p.directUrl.toLowerCase().replace(/^\/+/, '') === clean) ||
            (p.slug && p.slug.toLowerCase().replace(/^\/+/, '') === clean) ||
            (p.title && p.title.toLowerCase().replace(/\s+/g, '-') === clean)
          ) || null;
          resolve();
        }
      });
    });
  }

  // ========================================================
  // COMPOSITION & TEMPLATE HYDRATION PIPELINE
  // ========================================================

  /**
   * Assembles the Homepage:
   * Menu + Hero + Home Body Sections in Order (without duplicate Hero) + Footer.
   */
  private composeHomepage(): void {
    this.titleService.setTitle(`${this.brandName} | Official Website`);

    const menuTemplate = this.findActiveTemplate('menu');
    const heroTemplate = this.findActiveTemplate('hero');
    const footerTemplate = this.findActiveTemplate('footer');

    let combinedStyles = '';
    let combinedHtml = '';
    let combinedJs = '';

    // 1. Menu Section
    if (menuTemplate) {
      combinedStyles += `\n${menuTemplate.cssStyles || ''}\n`;
      const menuHtml = this.hydrateMenu(menuTemplate.htmlTemplate, 'home');
      combinedHtml += `<!-- Navbar -->\n${menuHtml}\n`;
      if (menuTemplate.jsScript) combinedJs += `\n${menuTemplate.jsScript}\n`;
    }

    // 2. Hero Section
    // Locate if a hero section was seeded in DB (directUrl == 'home-hero' or homePageSortOrder == 1)
    const dbHeroSection = this.sections.find(s => s.directUrl === 'home-hero' || s.homePageSortOrder === 1);
    if (heroTemplate) {
      combinedStyles += `\n${heroTemplate.cssStyles || ''}\n`;
      const heroData = this.buildHeroContext(dbHeroSection);
      const heroHtml = this.templateHydration.hydrateTemplate(heroTemplate.htmlTemplate, heroData, this.getHydrationOptions());
      combinedHtml += `<!-- Hero -->\n${heroHtml}\n`;
      if (heroTemplate.jsScript) combinedJs += `\n${heroTemplate.jsScript}\n`;
    }

    // 3. Modular Body Sections (exclude section consumed as Hero to prevent duplicate display)
    const bodySections = this.sections.filter(s => s !== dbHeroSection && s.directUrl !== 'home-hero');
    for (const sec of bodySections) {
      const secTemplate = this.findTemplateForSection(sec);
      if (secTemplate) {
        const activeCss = (sec.isCustomized && sec.cssStyles) ? sec.cssStyles : (secTemplate.cssStyles || '');
        if (activeCss && !combinedStyles.includes(activeCss)) {
          combinedStyles += `\n${activeCss}\n`;
        }
        const activeHtml = (sec.isCustomized && sec.htmlTemplate) ? sec.htmlTemplate : secTemplate.htmlTemplate;
        const sectionData = this.buildSectionContext(sec);
        const sectionHtml = this.templateHydration.hydrateTemplate(activeHtml, sectionData, this.getHydrationOptions());
        combinedHtml += `<!-- Section: ${sec.title || secTemplate.name} -->\n${sectionHtml}\n`;
        const activeJs = (sec.isCustomized && sec.jsScript) ? sec.jsScript : (secTemplate.jsScript || '');
        if (activeJs && !combinedJs.includes(activeJs)) {
          combinedJs += `\n${activeJs}\n`;
        }
      }
    }

    // 4. Footer Section
    if (footerTemplate) {
      combinedStyles += `\n${footerTemplate.cssStyles || ''}\n`;
      const footerHtml = this.hydrateFooter(footerTemplate.htmlTemplate);
      combinedHtml += `<!-- Footer -->\n${footerHtml}\n`;
      if (footerTemplate.jsScript) combinedJs += `\n${footerTemplate.jsScript}\n`;
    }

    this.finalizeRender(combinedStyles, combinedHtml, combinedJs);
  }

  /**
   * Assembles a dedicated Content Page:
   * Menu + Breadcrumb Header + Page Sections (or Body Content) + Footer.
   */
  private composeContentPage(): void {
    if (!this.currentPage) {
      this.composeNotFoundPage();
      return;
    }

    this.titleService.setTitle(`${this.currentPage.title || 'Page'} | ${this.brandName}`);

    const menuTemplate = this.findActiveTemplate('menu');
    const breadcrumbTemplate = this.findActiveTemplate('breadcrumb');
    const footerTemplate = this.findActiveTemplate('footer');

    let combinedStyles = '';
    let combinedHtml = '';
    let combinedJs = '';

    // 1. Menu
    if (menuTemplate) {
      combinedStyles += `\n${menuTemplate.cssStyles || ''}\n`;
      const menuHtml = this.hydrateMenu(menuTemplate.htmlTemplate, this.currentSlug);
      combinedHtml += `<!-- Navbar -->\n${menuHtml}\n`;
      if (menuTemplate.jsScript) combinedJs += `\n${menuTemplate.jsScript}\n`;
    }

    // 2. Breadcrumb Header
    if (breadcrumbTemplate) {
      combinedStyles += `\n${breadcrumbTemplate.cssStyles || ''}\n`;
      const breadcrumbData = {
        title: this.currentPage.title,
        miniTitle: this.currentPage.pageCategory?.categoryName || 'Organization Overview',
        description: this.currentPage.description || '',
        backgroundImageUrl: this.currentPage.headerImageUrl || 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1600&q=80',
        breadcrumbTrail: [
          { label: 'Home', url: '/', isActive: false },
          { label: this.currentPage.title, url: '#', isActive: true }
        ]
      };
      const breadcrumbHtml = this.templateHydration.hydrateTemplate(breadcrumbTemplate.htmlTemplate, breadcrumbData, this.getHydrationOptions());
      combinedHtml += `<!-- Breadcrumb Header -->\n${breadcrumbHtml}\n`;
      if (breadcrumbTemplate.jsScript) combinedJs += `\n${breadcrumbTemplate.jsScript}\n`;
    }

    // 3. Page Layout Sections
    const pageSections = this.currentPage.pageSections || [];
    if (pageSections.length > 0) {
      for (const sec of pageSections) {
        const secTemplate = this.findTemplateForSection(sec);
        if (secTemplate) {
          const activeCss = (sec.isCustomized && sec.cssStyles) ? sec.cssStyles : (secTemplate.cssStyles || '');
          if (activeCss && !combinedStyles.includes(activeCss)) {
            combinedStyles += `\n${activeCss}\n`;
          }
          const activeHtml = (sec.isCustomized && sec.htmlTemplate) ? sec.htmlTemplate : secTemplate.htmlTemplate;
          const sectionData = this.buildSectionContext(sec);
          const sectionHtml = this.templateHydration.hydrateTemplate(activeHtml, sectionData, this.getHydrationOptions());
          combinedHtml += `<!-- Section: ${sec.title || secTemplate.name} -->\n${sectionHtml}\n`;
          const activeJs = (sec.isCustomized && sec.jsScript) ? sec.jsScript : (secTemplate.jsScript || '');
          if (activeJs && !combinedJs.includes(activeJs)) {
            combinedJs += `\n${activeJs}\n`;
          }
        }
      }
    } else {
      // Fallback clean article content wrapper (including turnkey legal compliance content for legal pages)
      const bodyContent = this.currentPage.fullDescription ||
                          this.currentPage.description ||
                          this.getTurnkeyLegalContent(this.currentSlug, this.currentPage.title);

      combinedHtml += `
        <section class="py-5 bg-white border-bottom">
          <div class="container py-4">
            <div class="row justify-content-center">
              <div class="col-lg-9">
                <article class="prose-content fs-5 leading-relaxed text-secondary">
                  ${bodyContent}
                </article>
              </div>
            </div>
          </div>
        </section>
      `;
    }

    // 4. Footer
    if (footerTemplate) {
      combinedStyles += `\n${footerTemplate.cssStyles || ''}\n`;
      const footerHtml = this.hydrateFooter(footerTemplate.htmlTemplate);
      combinedHtml += `<!-- Footer -->\n${footerHtml}\n`;
      if (footerTemplate.jsScript) combinedJs += `\n${footerTemplate.jsScript}\n`;
    }

    this.finalizeRender(combinedStyles, combinedHtml, combinedJs);
  }

  /**
   * Generates turnkey corporate compliance text for legal pages when no custom CMS sections exist.
   */
  private getTurnkeyLegalContent(slug: string, pageTitle?: string): string {
    const norm = (slug || '').toLowerCase().trim();

    if (norm.includes('privacy')) {
      return `
        <div class="legal-document">
          <div class="mb-4 pb-3 border-bottom">
            <span class="badge bg-primary-subtle text-primary border px-3 py-1 rounded-pill fw-bold text-uppercase">Legal & Compliance</span>
            <h2 class="fw-bold text-dark mt-2 mb-1">Privacy & Data Governance Policy</h2>
            <span class="text-muted small">Effective Date: January 1, 2026 &bull; Last Revised: September 2026</span>
          </div>
          <p class="lead text-secondary mb-4">
            This Privacy Policy explains how <strong>${this.brandName}</strong> collects, processes, stores, and safeguards personal data and institutional information when accessing our platform, services, and client portals.
          </p>
          <h4 class="fw-bold text-dark mt-4 mb-3">1. Information We Collect</h4>
          <p>We collect information necessary to deliver enterprise services, authenticate authorized personnel, and maintain platform security:</p>
          <ul class="mb-4">
            <li><strong>Account Identification:</strong> Full name, professional work email, corporate phone number, job title, and organization affiliation.</li>
            <li><strong>Technical Telemetry:</strong> IP address, device telemetry, browser specifications, operating system parameters, and session access timestamps.</li>
            <li><strong>Transactional & Service Inquiries:</strong> Engagement records, support ticket correspondence, service requests, and authorized billing profiles.</li>
          </ul>
          <h4 class="fw-bold text-dark mt-4 mb-3">2. How We Use Information</h4>
          <p>We process collected data exclusively under legitimate business interests, contractual commitments, and legal obligations:</p>
          <ul class="mb-4">
            <li>To initialize, configure, and maintain sovereign tenant environments and user permissions.</li>
            <li>To provide responsive technical support, incident escalation, and operational communications.</li>
            <li>To monitor system resilience, prevent fraudulent access, and enforce SOC2/ISO 27001 compliance standards.</li>
          </ul>
          <h4 class="fw-bold text-dark mt-4 mb-3">3. Data Retention & Sovereign Storage</h4>
          <p class="mb-4">Personal and institutional data is encrypted in transit via TLS 1.3 and at rest via AES-256 standards. Records are retained strictly for the duration of the commercial agreement plus standard statutory compliance periods.</p>
          <h4 class="fw-bold text-dark mt-4 mb-3">4. Individual Rights & Inquiries</h4>
          <p class="mb-4">Depending on applicable jurisdictions (including GDPR and CCPA), individuals hold rights to request access, rectification, portability, or erasure of their personal data. Inquiries may be directed to our Privacy Officer at <code>${this.brandInfo?.companyEmail || 'privacy@organization.com'}</code>.</p>
        </div>
      `;
    }

    if (norm.includes('terms') || norm.includes('condition')) {
      return `
        <div class="legal-document">
          <div class="mb-4 pb-3 border-bottom">
            <span class="badge bg-primary-subtle text-primary border px-3 py-1 rounded-pill fw-bold text-uppercase">Legal & Governance</span>
            <h2 class="fw-bold text-dark mt-2 mb-1">Terms & Conditions of Service</h2>
            <span class="text-muted small">Effective Date: January 1, 2026 &bull; Last Revised: September 2026</span>
          </div>
          <p class="lead text-secondary mb-4">
            These Terms & Conditions govern access to and use of digital products, enterprise services, and web portals operated by <strong>${this.brandName}</strong>.
          </p>
          <h4 class="fw-bold text-dark mt-4 mb-3">1. Acceptance of Terms</h4>
          <p class="mb-4">By accessing our website or subscribing to our services, you confirm that you have read, understood, and agreed to be legally bound by these terms.</p>
          <h4 class="fw-bold text-dark mt-4 mb-3">2. Authorized Use & Account Governance</h4>
          <p class="mb-4">Users are responsible for maintaining the confidentiality of their credentials and all activities executed under their authorized profiles. Unauthorized access, system reverse-engineering, or automated scraping is strictly prohibited.</p>
          <h4 class="fw-bold text-dark mt-4 mb-3">3. Intellectual Property Rights</h4>
          <p class="mb-4">All trademarks, service designs, proprietary codebases, templates, and multimedia content hosted across this portal remain the exclusive intellectual property of <strong>${this.brandName}</strong> or its licensed ecosystem partners.</p>
          <h4 class="fw-bold text-dark mt-4 mb-3">4. Limitation of Liability</h4>
          <p class="mb-4">To the maximum extent permitted by applicable law, <strong>${this.brandName}</strong> and its affiliates shall not be liable for indirect, incidental, or consequential damages arising from service disruption or data loss.</p>
        </div>
      `;
    }

    if (norm.includes('cookie')) {
      return `
        <div class="legal-document">
          <div class="mb-4 pb-3 border-bottom">
            <span class="badge bg-primary-subtle text-primary border px-3 py-1 rounded-pill fw-bold text-uppercase">Cookies & Tracking</span>
            <h2 class="fw-bold text-dark mt-2 mb-1">Cookie & Tracking Technologies Policy</h2>
            <span class="text-muted small">Effective Date: January 1, 2026 &bull; Last Revised: September 2026</span>
          </div>
          <p class="lead text-secondary mb-4">
            This policy outlines how <strong>${this.brandName}</strong> utilizes cookies and analogous tracking technologies to provide seamless, secure website navigation.
          </p>
          <h4 class="fw-bold text-dark mt-4 mb-3">1. Essential Operational Cookies</h4>
          <p class="mb-4">These cookies are strictly required to ensure core portal security, tenant subdomain routing, authentication state management, and shopping cart persistence.</p>
          <h4 class="fw-bold text-dark mt-4 mb-3">2. Analytics & Performance Cookies</h4>
          <p class="mb-4">We aggregate anonymized navigation metrics to understand visitor engagement, optimize page load speed, and improve overall content quality.</p>
          <h4 class="fw-bold text-dark mt-4 mb-3">3. Managing Your Cookie Preferences</h4>
          <p class="mb-4">You can modify or disable browser cookies at any time via your browser settings. Note that disabling essential cookies may impact system functionality.</p>
        </div>
      `;
    }

    return `
      <div class="general-page-content">
        <p class="lead text-secondary mb-4">Welcome to <strong>${pageTitle || 'Page'}</strong> at <strong>${this.brandName}</strong>.</p>
        <p class="text-muted">Content for this page is managed directly through the CMS Studio. Please check back shortly for upcoming publications, modules, and announcements.</p>
      </div>
    `;
  }

  /**
   * Assembles the Blog Archive Page:
   * Menu + Breadcrumb Header + Blog Grid + Footer.
   */
  private composeBlogArchive(): void {
    this.titleService.setTitle(`Blog & Enterprise Insights | ${this.brandName}`);

    const menuTemplate = this.findActiveTemplate('menu');
    const breadcrumbTemplate = this.findActiveTemplate('breadcrumb');
    const blogTemplate = this.findActiveTemplate('blog') || this.findActiveTemplate('body');
    const footerTemplate = this.findActiveTemplate('footer');

    let combinedStyles = '';
    let combinedHtml = '';
    let combinedJs = '';

    if (menuTemplate) {
      combinedStyles += `\n${menuTemplate.cssStyles || ''}\n`;
      combinedHtml += this.hydrateMenu(menuTemplate.htmlTemplate, 'blog');
      if (menuTemplate.jsScript) combinedJs += `\n${menuTemplate.jsScript}\n`;
    }

    if (breadcrumbTemplate) {
      combinedStyles += `\n${breadcrumbTemplate.cssStyles || ''}\n`;
      const breadcrumbData = {
        title: 'Insights & Publications',
        miniTitle: 'Thought Leadership',
        description: 'Latest research, corporate perspectives, and industry transformation analyses.',
        backgroundImageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1600&q=80',
        breadcrumbTrail: [
          { label: 'Home', url: '/', isActive: false },
          { label: 'Blog & Insights', url: '#', isActive: true }
        ]
      };
      combinedHtml += this.templateHydration.hydrateTemplate(breadcrumbTemplate.htmlTemplate, breadcrumbData, this.getHydrationOptions());
      if (breadcrumbTemplate.jsScript) combinedJs += `\n${breadcrumbTemplate.jsScript}\n`;
    }

    // Render Blog Grid
    const blogContext = {
      title: 'Latest Publications & Strategic Thinking',
      miniTitle: 'Executive Insights',
      description: 'Explore our latest releases and corporate updates directly from our research desks.',
      articles: this.blogs.map(b => ({
        id: b.id,
        title: b.title,
        excerpt: b.description || 'Comprehensive strategic analysis and insights.',
        category: b.blogCategory?.categoryName || 'Strategy & Advisory',
        date: new Date(b.date || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        author: 'Executive Advisory Desk',
        imageUrl: b.imageUrl || 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80',
        directUrl: `/blog/${b.id}`
      }))
    };

    if (blogTemplate) {
      if (!combinedStyles.includes(blogTemplate.cssStyles)) combinedStyles += `\n${blogTemplate.cssStyles || ''}\n`;
      combinedHtml += this.templateHydration.hydrateTemplate(blogTemplate.htmlTemplate, blogContext, this.getHydrationOptions());
      if (blogTemplate.jsScript) combinedJs += `\n${blogTemplate.jsScript}\n`;
    }

    if (footerTemplate) {
      combinedStyles += `\n${footerTemplate.cssStyles || ''}\n`;
      combinedHtml += this.hydrateFooter(footerTemplate.htmlTemplate);
      if (footerTemplate.jsScript) combinedJs += `\n${footerTemplate.jsScript}\n`;
    }

    this.finalizeRender(combinedStyles, combinedHtml, combinedJs);
  }

  /**
   * Assembles a single Blog Article Reader view:
   * Menu + Breadcrumb Header + Article Details + Footer.
   */
  private composeBlogDetail(): void {
    if (!this.currentArticle) {
      this.composeNotFoundPage();
      return;
    }

    this.titleService.setTitle(`${this.currentArticle.title} | ${this.brandName}`);

    const menuTemplate = this.findActiveTemplate('menu');
    const breadcrumbTemplate = this.findActiveTemplate('breadcrumb');
    const footerTemplate = this.findActiveTemplate('footer');

    let combinedStyles = '';
    let combinedHtml = '';
    let combinedJs = '';

    if (menuTemplate) {
      combinedStyles += `\n${menuTemplate.cssStyles || ''}\n`;
      combinedHtml += this.hydrateMenu(menuTemplate.htmlTemplate, 'blog');
      if (menuTemplate.jsScript) combinedJs += `\n${menuTemplate.jsScript}\n`;
    }

    if (breadcrumbTemplate) {
      combinedStyles += `\n${breadcrumbTemplate.cssStyles || ''}\n`;
      const breadcrumbData = {
        title: this.currentArticle.title,
        miniTitle: this.currentArticle.blogCategory?.categoryName || 'Strategic Advisory',
        description: `Published on ${new Date(this.currentArticle.date || Date.now()).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
        backgroundImageUrl: this.currentArticle.imageUrl || 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1600&q=80',
        breadcrumbTrail: [
          { label: 'Home', url: '/', isActive: false },
          { label: 'Blog', url: '/blog', isActive: false },
          { label: this.currentArticle.title, url: '#', isActive: true }
        ]
      };
      combinedHtml += this.templateHydration.hydrateTemplate(breadcrumbTemplate.htmlTemplate, breadcrumbData, this.getHydrationOptions());
      if (breadcrumbTemplate.jsScript) combinedJs += `\n${breadcrumbTemplate.jsScript}\n`;
    }

    // Article Reader Layout
    combinedHtml += `
      <section class="py-5 bg-white">
        <div class="container py-4">
          <div class="row justify-content-center">
            <div class="col-lg-8">
              ${this.currentArticle.imageUrl ? `
                <div class="mb-5 rounded-4 overflow-hidden shadow-sm">
                  <img src="${this.currentArticle.imageUrl}" alt="${this.currentArticle.title}" class="w-100 object-fit-cover" style="max-height: 440px;" />
                </div>
              ` : ''}

              <div class="article-body fs-5 text-secondary leading-relaxed mb-5">
                ${this.currentArticle.fullDescription || this.currentArticle.description || '<p>Full publication content pending release.</p>'}
              </div>

              <div class="p-4 rounded-3 bg-light border d-flex align-items-center justify-content-between">
                <div>
                  <span class="text-muted small d-block">Published under</span>
                  <span class="badge bg-primary fs-6 mt-1">${this.currentArticle.blogCategory?.categoryName || 'General Insights'}</span>
                </div>
                <a href="/blog" class="btn btn-outline-primary btn-sm px-3">Back to All Articles</a>
              </div>
            </div>
          </div>
        </div>
      </section>
    `;

    if (footerTemplate) {
      combinedStyles += `\n${footerTemplate.cssStyles || ''}\n`;
      combinedHtml += this.hydrateFooter(footerTemplate.htmlTemplate);
      if (footerTemplate.jsScript) combinedJs += `\n${footerTemplate.jsScript}\n`;
    }

    this.finalizeRender(combinedStyles, combinedHtml, combinedJs);
  }

  /**
   * Fallback 404 handler for missing pages.
   */
  private composeNotFoundPage(): void {
    this.titleService.setTitle(`Page Not Found | ${this.brandName}`);
    const menuTemplate = this.findActiveTemplate('menu');
    const footerTemplate = this.findActiveTemplate('footer');

    let combinedStyles = '';
    let combinedHtml = '';

    if (menuTemplate) {
      combinedStyles += `\n${menuTemplate.cssStyles || ''}\n`;
      combinedHtml += this.hydrateMenu(menuTemplate.htmlTemplate, '');
    }

    combinedHtml += `
      <section class="py-5 text-center bg-white my-5">
        <div class="container py-5">
          <span class="material-symbols-outlined display-1 text-primary opacity-50 mb-3">error_outline</span>
          <h1 class="display-5 fw-bold text-dark mb-3">Page Not Found</h1>
          <p class="lead text-muted mb-4">The page you requested does not exist or may have been relocated.</p>
          <a href="/" class="btn btn-primary px-4 py-2 fw-semibold">Return to Homepage</a>
        </div>
      </section>
    `;

    if (footerTemplate) {
      combinedStyles += `\n${footerTemplate.cssStyles || ''}\n`;
      combinedHtml += this.hydrateFooter(footerTemplate.htmlTemplate);
    }

    this.finalizeRender(combinedStyles, combinedHtml);
  }

  // ========================================================
  // HYDRATION CONTEXT HELPERS
  // ========================================================

  /**
   * Hydrates the active Navbar template with live navigation categories, child links,
   * top menu pages, CTA buttons, and active link highlights.
   */
  private hydrateMenu(rawHtml: string, activeSlug: string): string {
    // 1. Top menu items (strictly pages configured for main menu, published, not legal, not category child, not CTA, and not home)
    const topMenuItems = this.publishedPages
      .filter(p => p.showInMainMenu && !p.isLegal && !p.pageCategoryId && !p.isMenuCTA && p.directUrl !== 'home' && p.directUrl !== '')
      .map(p => ({
        title: p.title,
        url: `/${p.directUrl || p.slug}`
      }));

    // Ensure Home, Blog, and Contact exist if not already present
    if (!topMenuItems.some(m => m.url === '/')) {
      topMenuItems.unshift({ title: 'Home', url: '/' });
    }
    if (!topMenuItems.some(m => m.url === '/blog') && this.blogs.length > 0) {
      topMenuItems.push({ title: 'Blog', url: '/blog' });
    }

    // 2. Navigation Dropdowns (PageCategories with their published child WebPages)
    const dropdowns = this.categories
      .filter(c => c.publish)
      .map(c => {
        const catTitle = c.title || c.categoryName || c.name || 'Menu';
        const childPages = (c.webPages && c.webPages.length > 0)
          ? c.webPages.filter((p: any) => p.publish)
          : this.publishedPages.filter(p => p.publish && (p.pageCategoryId === c.id || p.pageCategory?.id === c.id || p.pageCategory?.title === catTitle));

        return {
          title: catTitle,
          categoryName: catTitle,
          pages: childPages.map((p: any) => ({
            title: p.title,
            url: `/${p.directUrl || p.slug}`
          }))
        };
      });

    // 3. CTA Buttons (pages with isMenuCTA = true)
    const menuCtaButtons = this.publishedPages
      .filter(p => p.isMenuCTA)
      .map(p => ({
        title: p.title,
        url: `/${p.directUrl || p.slug}`
      }));

    if (menuCtaButtons.length === 0) {
      menuCtaButtons.push({ title: 'Request a Service', url: '/request-service' });
    }

    const menuContext = {
      topMenuItems,
      dropdowns,
      menuCtaButtons,
      cartCount: this.cartService.getItemCount(),
      BrandName: this.brandName,
      LogoUrl: this.brandLogoUrl
    };

    let html = this.templateHydration.hydrateTemplate(rawHtml, menuContext, this.getHydrationOptions());

    // Highlight active link matching activeSlug
    if (activeSlug) {
      const activeNormalized = activeSlug === 'home' ? '/' : `/${activeSlug}`;
      // Highlight exact match href
      const regex = new RegExp(`(<a\\s+[^>]*href=["']${activeNormalized}["'][^>]*class=["'][^"']*)(["'])`, 'gi');
      html = html.replace(regex, '$1 active fw-bold$2');
    }

    return html;
  }

  /**
   * Hydrates the active Footer template with legal pages, categorized links, brand details,
   * and enforces the official Ozikol credit bar.
   */
  private hydrateFooter(rawHtml: string): string {
    // Prepare categorized links for footer columns
    const footerCategories = this.categories
      .filter(c => c.publish && c.showInFooter !== false)
      .map(c => {
        const catTitle = c.title || c.categoryName || c.name || 'Category';
        const displayTitle = c.footerDisplayTitle || catTitle;
        const childPages = (c.webPages && c.webPages.length > 0)
          ? c.webPages.filter((p: any) => p.publish && p.showInFooter !== false)
          : this.publishedPages.filter(p => p.publish && p.showInFooter !== false && (p.pageCategoryId === c.id || p.pageCategory?.id === c.id || p.pageCategory?.title === catTitle));

        return {
          name: catTitle,
          title: catTitle,
          displayTitle: displayTitle,
          pages: childPages.map((p: any) => ({
            title: p.title,
            url: `/${p.directUrl || p.slug || ''}`
          }))
        };
      });

    const legalPages = this.publishedPages
      .filter(p => p.isLegal)
      .map(p => ({
        title: p.title,
        url: `/${p.directUrl || p.slug}`
      }));

    const footerContext = {
      BrandName: this.brandName,
      LogoUrl: this.brandLogoUrl,
      Year: new Date().getFullYear().toString(),
      Description: this.brandInfo?.companyDescription || 'Empowering enterprises and modern organizations with strategic advisory, integrated solutions, and high-performance operations.',
      Email: this.brandInfo?.companyEmail || 'contact@organization.com',
      Phone: this.brandInfo?.companyPhone || '+1 (555) 019-2834',
      Address: this.brandInfo?.companyAddress || 'Corporate Headquarters',
      Copyright: `&copy; ${new Date().getFullYear()} ${this.brandName}. All rights reserved.`,
      categories: footerCategories,
      legalPages: legalPages
    };

    let html = this.templateHydration.hydrateTemplate(rawHtml, footerContext, this.getHydrationOptions());
    return this.templateHydration.enforceOzikolCredit(html);
  }

  /**
   * Builds Hero hydration data from active DB section or sliders or defaults.
   */
  private buildHeroContext(dbHeroSection?: any): any {
    if (dbHeroSection) {
      return {
        title: dbHeroSection.title || 'Driving Next-Generation Enterprise Growth',
        miniTitle: dbHeroSection.miniTitle || 'Strategic Modernization',
        description: dbHeroSection.description || 'Empowering institutional leaders with mission-critical systems and advisory.',
        imageUrl: dbHeroSection.imageUrl || 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1400&q=80',
        buttonText: dbHeroSection.buttonText || 'Explore Services',
        buttonLink: dbHeroSection.buttonLink || '/services',
        secondaryButtonText: 'Schedule Consultation',
        secondaryButtonLink: '/contact-us'
      };
    }

    if (this.sliders && this.sliders.length > 0) {
      const activeSlider = this.sliders[0];
      return {
        title: activeSlider.title || 'Driving Next-Generation Enterprise Growth',
        miniTitle: activeSlider.miniTitle || 'Strategic Modernization',
        description: activeSlider.description || 'Empowering institutional leaders with mission-critical systems and advisory.',
        imageUrl: activeSlider.imageUrl || 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1400&q=80',
        buttonText: activeSlider.buttonText || 'Explore Services',
        buttonLink: activeSlider.buttonLink || '/services',
        secondaryButtonText: activeSlider.secondaryButtonText || 'Schedule Consultation',
        secondaryButtonLink: activeSlider.secondaryButtonLink || '/contact-us'
      };
    }

    return {
      title: 'Pioneering Scalable Enterprise Infrastructure & Solutions',
      miniTitle: 'Next-Generation Technology & Consulting',
      description: 'We orchestrate robust operational frameworks, modern digital architecture, and resilient systems for global industry leaders.',
      imageUrl: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1400&q=80',
      buttonText: 'Explore Services',
      buttonLink: '/services',
      secondaryButtonText: 'Schedule Consultation',
      secondaryButtonLink: '/contact-us'
    };
  }

  /**
   * Formats a PageSection database entity into the token context expected by TemplateHydrationService.
   */
  private buildSectionContext(sec: any): any {
    return {
      title: sec.title || '',
      miniTitle: sec.miniTitle || '',
      description: sec.description || '',
      moreDescription: sec.moreDescription || '',
      imageUrl: sec.imageUrl || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1000&q=80',
      buttonText: sec.buttonText || 'Explore Details',
      buttonLink: sec.buttonLink || '#',
      secondaryButtonText: sec.secondaryButtonText || 'Contact Our Team',
      secondaryButtonLink: sec.secondaryButtonLink || '/contact-us',
      videoUrl: sec.videoUrl || '',
      pageSectionLists: (sec.pageSectionLists || []).map((item: any, idx: number) => ({
        id: item.id,
        title: item.title || `Capability ${idx + 1}`,
        miniTitle: item.miniTitle || '',
        description: item.description || '',
        moreDescription: item.moreDescription || '',
        iconText: item.iconText || item.icon || 'fa-solid fa-arrow-right',
        icon: item.iconText || item.icon || 'fa-solid fa-arrow-right',
        imageUrl: item.imageUrl || '',
        buttonText: item.buttonText || '',
        buttonLink: item.buttonLink || '#',
        sortOrder: item.sortOrder || idx + 1
      }))
    };
  }

  private findActiveTemplate(category: string): any {
    return this.activeTemplates.find(t => (t.categoryKey || t.category || '').toLowerCase() === category.toLowerCase());
  }

  private findTemplateForSection(sec: any): any {
    if (sec.templateKey) {
      // 1. Exact match
      const exactMatch = this.activeTemplates.find(t => (t.templateKey || '').toLowerCase() === sec.templateKey.toLowerCase());
      if (exactMatch) return exactMatch;

      // 2. Smart alias mapping between seeded template keys and installed theme keys
      const keyAliases: { [key: string]: string[] } = {
        'body_splitshowcase': ['body_missionsplit', 'body_featuregrid3'],
        'body_statscounters': ['body_metricscounter', 'body_statscounter4'],
        'body_processsteps': ['body_featuregrid3', 'body_missionsplit', 'body_processsteps4'],
        'body_ctasplit': ['body_ctabanner', 'body_ctabannerfull'],
        'news_minimalbar': ['news_minimalbar'],
        'contact_splitdetails': ['contact_splitdetails'],
        'body_requestservice': ['body_requestservice']
      };

      const normalizedKey = sec.templateKey.toLowerCase();
      const aliases = keyAliases[normalizedKey];
      if (aliases) {
        for (const alias of aliases) {
          const aliasMatch = this.activeTemplates.find(t => (t.templateKey || '').toLowerCase() === alias);
          if (aliasMatch) return aliasMatch;
        }
      }
    }
    // Fallback to active body template
    return this.findActiveTemplate('body');
  }

  private getHydrationOptions(): any {
    return {
      currentTenantBrandName: this.brandName,
      availablePages: this.publishedPages
    };
  }

  /**
   * Finalizes document rendering by:
   * 1. Injecting CSS styles into <head> via a dedicated style tag.
   * 2. Sanitizing HTML for Angular DOM rendering.
   * 3. Executing the complete 3-zone tag injection pipeline (head, body_open, footer) + section scripts.
   */
  private finalizeRender(styles: string, html: string, combinedJs?: string): void {
    // 1. Inject Scoped Template CSS into <head>
    let styleTag = document.getElementById('tenant-dynamic-theme-styles') as HTMLStyleElement;
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'tenant-dynamic-theme-styles';
      document.head.appendChild(styleTag);
    }
    // Defensively strip any accidental <style> or </style> wrappers so pure CSS is injected
    const cleanStyles = (styles || '').replace(/<\/?style[^>]*>/gi, '').trim();
    styleTag.textContent = cleanStyles;

    // 2. Set Safe HTML for main page layout
    this.safeRenderedHtml = this.sanitizer.bypassSecurityTrustHtml(html);

    // 3. Inject Full 3-Zone Architecture (Head tags, Body Open tags, Footer scripts, Section scripts)
    this.injectCodeTags(combinedJs);
  }

  /**
   * Injects code tags into all 3 document zones according to CMS architecture:
   * - Zone 1: <head> -> external CSS stylesheets, meta tags, Google Fonts, OpenGraph, JSON-LD, Favicons
   * - Zone 2: <body> -> immediately after opening body tag
   * - Zone 3: </body> -> immediately before closing body tag (Bootstrap JS bundle, section scripts)
   */
  private injectCodeTags(combinedJs?: string): void {
    // Clean up previously injected dynamic tags
    document.querySelectorAll('.ozikol-injected-tag').forEach(el => el.remove());

    // 1. Guaranteed Baseline Head Assets (Bootstrap 5.3 CSS, FA 6, Google Fonts)
    this.ensureBaselineHeadTags();

    // 2. Inject CMS Header Tags (<head>)
    if (this.codeInjections.head && this.codeInjections.head.length > 0) {
      for (const tag of this.codeInjections.head) {
        if (!tag.content) continue;
        this.appendHtmlToContainer(document.head, tag.content, 'head');
      }
    }

    // 3. Inject CMS Body Open Tags (immediately after <body>)
    if (this.codeInjections.bodyOpen && this.codeInjections.bodyOpen.length > 0) {
      for (const tag of this.codeInjections.bodyOpen) {
        if (!tag.content) continue;
        this.prependHtmlToBody(tag.content);
      }
    }

    // 4. Inject CMS Footer Scripts (right before </body>)
    if (this.codeInjections.footer && this.codeInjections.footer.length > 0) {
      for (const tag of this.codeInjections.footer) {
        if (!tag.content) continue;
        this.appendHtmlToContainer(document.body, tag.content, 'footer');
      }
    }

    // 5. Guaranteed Baseline Footer Scripts (Bootstrap 5.3 JS Bundle)
    this.ensureBootstrapJsScript();

    // 6. Section JavaScript Execution
    if (combinedJs && combinedJs.trim()) {
      const script = document.createElement('script');
      script.className = 'ozikol-injected-tag ozikol-section-scripts';
      // Defensively strip any accidental <script> or </script> tags to ensure valid pure JS execution
      const cleanJs = combinedJs.replace(/<\/?script[^>]*>/gi, '').trim();
      script.textContent = cleanJs;
      document.body.appendChild(script);
    }
  }

  private ensureBaselineHeadTags(): void {
    if (!document.querySelector('link[href*="bootstrap"]')) {
      const bsCss = document.createElement('link');
      bsCss.rel = 'stylesheet';
      bsCss.href = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css';
      bsCss.className = 'ozikol-injected-tag';
      document.head.appendChild(bsCss);
    }
    if (!document.querySelector('link[href*="font-awesome"]')) {
      const faCss = document.createElement('link');
      faCss.rel = 'stylesheet';
      faCss.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css';
      faCss.className = 'ozikol-injected-tag';
      document.head.appendChild(faCss);
    }
  }

  private ensureBootstrapJsScript(): void {
    if (!document.querySelector('script[src*="bootstrap"]')) {
      const bsJs = document.createElement('script');
      bsJs.src = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js';
      bsJs.className = 'ozikol-injected-tag';
      document.body.appendChild(bsJs);
    }
  }

  private appendHtmlToContainer(container: HTMLElement, htmlString: string, zone: string): void {
    const temp = document.createElement('div');
    temp.innerHTML = htmlString.trim();

    Array.from(temp.children).forEach(child => {
      const el = child as HTMLElement;
      el.classList.add('ozikol-injected-tag', `ozikol-zone-${zone}`);

      if (el.tagName.toLowerCase() === 'script') {
        const script = document.createElement('script');
        script.className = el.className;
        Array.from(el.attributes).forEach(attr => script.setAttribute(attr.name, attr.value));
        script.textContent = el.textContent || '';
        container.appendChild(script);
      } else {
        container.appendChild(el);
      }
    });
  }

  private prependHtmlToBody(htmlString: string): void {
    const temp = document.createElement('div');
    temp.innerHTML = htmlString.trim();

    Array.from(temp.children).reverse().forEach(child => {
      const el = child as HTMLElement;
      el.classList.add('ozikol-injected-tag', 'ozikol-zone-body-open');
      if (document.body.firstChild) {
        document.body.insertBefore(el, document.body.firstChild);
      } else {
        document.body.appendChild(el);
      }
    });
  }

  private recordTelemetry(): void {
    try {
      this.apiService.post('WebsiteContentApi/track-view', {
        pageUrl: window.location.pathname || '/',
        pageTitle: this.titleService.getTitle() || this.brandName
      }).subscribe({
        next: () => {},
        error: () => {}
      });
    } catch {
      // Telemetry failures are non-blocking
    }
  }

  // ========================================================
  // INTERACTIVE EVENT DELEGATION (Dropdowns, Links, Forms)
  // ========================================================

  @HostListener('click', ['$event'])
  onGlobalClick(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    if (!target) return;

    // 1. Dropdown Toggle Click Handler
    const dropdownToggle = target.closest('.dropdown-toggle, [data-bs-toggle="dropdown"]') as HTMLElement;
    if (dropdownToggle) {
      e.preventDefault();
      e.stopPropagation();

      const parentDropdown = dropdownToggle.closest('.dropdown');
      const menu = parentDropdown?.querySelector('.dropdown-menu');

      if (menu) {
        const isAlreadyOpen = menu.classList.contains('show');
        document.querySelectorAll('.dropdown-menu.show').forEach(m => m.classList.remove('show'));
        document.querySelectorAll('.dropdown-toggle[aria-expanded="true"]').forEach(t => t.setAttribute('aria-expanded', 'false'));

        if (!isAlreadyOpen) {
          menu.classList.add('show');
          dropdownToggle.setAttribute('aria-expanded', 'true');
        }
      }
      return;
    }

    // 2. Click Outside Closes All Dropdowns
    if (!target.closest('.dropdown')) {
      document.querySelectorAll('.dropdown-menu.show').forEach(m => m.classList.remove('show'));
      document.querySelectorAll('.dropdown-toggle[aria-expanded="true"]').forEach(t => t.setAttribute('aria-expanded', 'false'));
    }

    // 3. Dropdown Items & Internal Navigation Links
    const anchor = target.closest('a') as HTMLAnchorElement;
    if (anchor && !anchor.classList.contains('dropdown-toggle')) {
      const href = (anchor.getAttribute('href') || '').trim();

      if (href && !href.startsWith('http') && !href.startsWith('mailto:') && !href.startsWith('tel:') && !href.startsWith('javascript:')) {
        if (href.startsWith('#')) {
          e.preventDefault();
          const element = document.querySelector(href);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
          }
          return;
        }

        // Seamless In-App Routing via Angular Router
        e.preventDefault();
        document.querySelectorAll('.dropdown-menu.show').forEach(m => m.classList.remove('show'));
        this.router.navigateByUrl(href);
        return;
      }
    }

    // 4. Dynamic Form Submit Button Delegator
    const submitBtn = target.closest('button[type="submit"], input[type="submit"]') as HTMLElement;
    if (submitBtn) {
      const form = submitBtn.closest('form') as HTMLFormElement;
      if (form) {
        e.preventDefault();
        this.submitDynamicForm(form, submitBtn);
      }
    }
  }

  /**
   * Submits a public interactive form (e.g., Contact Us, Newsletter, Service Request)
   * to WebsiteContentApi/forms/{formKey}/submit.
   */
  private submitDynamicForm(form: HTMLFormElement, submitBtn: HTMLElement): void {
    const formKey = form.getAttribute('data-form-key') || form.id || 'contact-us';
    const formData = new FormData(form);
    const dataPayload: Record<string, any> = {};

    formData.forEach((value, key) => {
      dataPayload[key] = value;
    });

    const originalText = submitBtn.innerHTML;
    submitBtn.setAttribute('disabled', 'true');
    submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span> Submitting...`;

    this.apiService.post(`WebsiteContentApi/forms/${formKey}/submit`, {
      data: dataPayload,
      sourcePageUrl: window.location.pathname
    }).subscribe({
      next: (res: any) => {
        submitBtn.removeAttribute('disabled');
        submitBtn.innerHTML = originalText;
        const successMsg = res?.message || 'Thank you! Your submission has been received.';
        this.toastService.success(successMsg);
        form.reset();
      },
      error: (err: any) => {
        submitBtn.removeAttribute('disabled');
        submitBtn.innerHTML = originalText;
        const errorMsg = err?.error?.message || 'Unable to submit your request. Please check all fields.';
        this.toastService.error(errorMsg);
      }
    });
  }
}
