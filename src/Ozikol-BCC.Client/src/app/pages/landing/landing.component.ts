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
import {
  CANONICAL_CORPORATE_TEMPLATES,
  DEFAULT_SHOWCASE_SECTIONS,
  DEFAULT_PAGE_BLUEPRINTS,
  DEFAULT_SAMPLE_BLOGS
} from './corporate-suite-defaults';

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
    this.routeSub = this.route.paramMap.subscribe(params => {
      // 1. Check direct slug parameter
      let slugParam = (params.get('slug') || '').trim().toLowerCase();

      // 2. Fallback to route URL segments (e.g. /blog, /blog/123, /about)
      const urlSegments = this.route.snapshot.url.map(s => s.path.toLowerCase());
      if (!slugParam && urlSegments.length > 0) {
        slugParam = urlSegments[0];
      }

      this.currentSlug = slugParam;

      // Check if viewing blog by ID or slug
      const blogIdParam = params.get('id') || (urlSegments[0] === 'blog' && urlSegments[1] ? urlSegments[1] : null);
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
      // 1. Fetch public UI settings (always accessible anonymously)
      this.apiService.get('WebsiteContentApi/ui-settings').subscribe({
        next: (uiRes: any) => {
          if (uiRes?.data) {
            const data = uiRes.data;
            this.brandInfo = { ...this.brandInfo, ...data };
            this.brandName = data.brandName || data.companyName || data.siteTitle || this.brandName;
            this.brandLogoUrl = data.logoUrl || data.companyLogoUrl || data.whiteLogoUrl || this.brandLogoUrl;
            this.applyFavicon(data.faviconUrl || data.companyIconUrl);
          }
          // 2. Also attempt to fetch full SettingsApi/brand if available
          this.apiService.get('SettingsApi/brand').subscribe({
            next: (brandRes: any) => {
              if (brandRes?.data) {
                const bData = brandRes.data;
                this.brandInfo = { ...this.brandInfo, ...bData };
                if (bData.companyName) this.brandName = bData.companyName;
                if (bData.companyLogoUrl) this.brandLogoUrl = bData.companyLogoUrl;
                this.applyFavicon(bData.companyIconUrl);
              }
              resolve();
            },
            error: () => resolve()
          });
        },
        error: () => {
          this.apiService.get('SettingsApi/brand').subscribe({
            next: (brandRes: any) => {
              if (brandRes?.data) {
                const bData = brandRes.data;
                this.brandInfo = { ...this.brandInfo, ...bData };
                if (bData.companyName) this.brandName = bData.companyName;
                if (bData.companyLogoUrl) this.brandLogoUrl = bData.companyLogoUrl;
                this.applyFavicon(bData.companyIconUrl);
              }
              resolve();
            },
            error: () => resolve()
          });
        }
      });
    });
  }

  private applyFavicon(rawIcon?: string): void {
    const activeIcon = (rawIcon && rawIcon !== '/favicon.ico') ? rawIcon : '';
    const favicons = document.querySelectorAll("link[rel*='icon']");
    if (favicons.length > 0) {
      favicons.forEach(el => (el as HTMLLinkElement).href = activeIcon || 'data:,');
    } else if (activeIcon) {
      const link = document.createElement('link');
      link.rel = 'shortcut icon';
      link.type = 'image/x-icon';
      link.href = activeIcon;
      document.head.appendChild(link);
    }
  }

  private fetchActiveTemplates(): Promise<void> {
    return new Promise((resolve) => {
      this.apiService.get('WebsiteContentApi/theme/active-templates').subscribe({
        next: (res: any) => {
          this.activeTemplates = res?.data || [];
          if (!this.activeTemplates || this.activeTemplates.length === 0) {
            this.activeTemplates = [...CANONICAL_CORPORATE_TEMPLATES];
          }
          resolve();
        },
        error: () => {
          // Fallback to installed templates if admin endpoint exists
          this.apiService.get('ContentApi/templates/installed').subscribe({
            next: (adminRes: any) => {
              const all = adminRes?.data || [];
              this.activeTemplates = all.filter((t: any) => t.isActive);
              if (!this.activeTemplates || this.activeTemplates.length === 0) {
                this.activeTemplates = [...CANONICAL_CORPORATE_TEMPLATES];
              }
              resolve();
            },
            error: () => {
              this.activeTemplates = [...CANONICAL_CORPORATE_TEMPLATES];
              resolve();
            }
          });
        }
      });
    });
  }

  private fetchNavigationCategories(): Promise<void> {
    return new Promise((resolve) => {
      const applyFallback = () => {
        if (!this.categories || this.categories.length === 0) {
          this.categories = [
            {
              id: 'cat-services',
              title: 'Services',
              categoryName: 'Services',
              publish: true,
              showInFooter: true,
              menuSortOrder: 2,
              menuPosition: 2,
              webPages: [
                { title: 'Enterprise Advisory', directUrl: 'services', publish: true },
                { title: 'Cloud Infrastructure', directUrl: 'services', publish: true },
                { title: 'Security & Governance', directUrl: 'services', publish: true }
              ]
            }
          ];
        }
      };

      this.apiService.get('WebsiteContentApi/categories').subscribe({
        next: (res: any) => {
          this.categories = res?.data || [];
          applyFallback();
          resolve();
        },
        error: () => {
          this.apiService.get('ContentApi/categories').subscribe({
            next: (cRes: any) => {
              this.categories = cRes?.data || [];
              applyFallback();
              resolve();
            },
            error: () => {
              applyFallback();
              resolve();
            }
          });
        }
      });
    });
  }

  private fetchPublishedPages(): Promise<void> {
    return new Promise((resolve) => {
      const applyFallback = () => {
        if (!this.publishedPages || this.publishedPages.length === 0) {
          this.publishedPages = [
            { title: 'Home', directUrl: '/', showInMainMenu: true, sortOrder: 0, publish: true, menuPosition: 1 },
            { title: 'About Us', directUrl: 'about', showInMainMenu: true, sortOrder: 1, publish: true, menuPosition: 1 },
            { title: 'Services', directUrl: 'services', showInMainMenu: true, sortOrder: 2, publish: true, menuPosition: 2 },
            { title: 'Contact', directUrl: 'contact', showInMainMenu: true, sortOrder: 3, publish: true, menuPosition: 2 },
            { title: 'Blog', directUrl: 'blog', showInMainMenu: true, sortOrder: 4, publish: true, menuPosition: 3 },
            { title: 'Request Service', directUrl: 'request-service', showInMainMenu: true, isMenuCTA: true, sortOrder: 5, publish: true },
            { title: 'Privacy Policy', directUrl: 'privacy-policy', isLegal: true, publish: true },
            { title: 'Terms & Conditions', directUrl: 'terms-and-conditions', isLegal: true, publish: true }
          ];
        }
      };

      this.apiService.get('WebsiteContentApi/pages').subscribe({
        next: (res: any) => {
          this.publishedPages = res?.data || [];
          applyFallback();
          resolve();
        },
        error: () => {
          this.apiService.get('ContentApi/pages').subscribe({
            next: (pRes: any) => {
              this.publishedPages = pRes?.data || [];
              applyFallback();
              resolve();
            },
            error: () => {
              applyFallback();
              resolve();
            }
          });
        }
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
          this.blogs = (res?.data && res.data.length > 0) ? res.data : [...DEFAULT_SAMPLE_BLOGS];
          resolve();
        },
        error: () => {
          this.blogs = [...DEFAULT_SAMPLE_BLOGS];
          resolve();
        }
      });
    });
  }

  private fetchAllBlogs(): Promise<void> {
    return new Promise((resolve) => {
      this.apiService.get('WebsiteContentApi/blogs').subscribe({
        next: (res: any) => {
          this.blogs = (res?.data && res.data.length > 0) ? res.data : [...DEFAULT_SAMPLE_BLOGS];
          resolve();
        },
        error: () => {
          this.blogs = [...DEFAULT_SAMPLE_BLOGS];
          resolve();
        }
      });
    });
  }

  private fetchSingleBlog(id: string): Promise<void> {
    return new Promise((resolve) => {
      this.apiService.get(`WebsiteContentApi/blogs/${id}`).subscribe({
        next: (res: any) => {
          this.currentArticle = res?.data || DEFAULT_SAMPLE_BLOGS.find(b => b.id === id) || DEFAULT_SAMPLE_BLOGS[0];
          resolve();
        },
        error: () => {
          this.currentArticle = DEFAULT_SAMPLE_BLOGS.find(b => b.id === id) || DEFAULT_SAMPLE_BLOGS[0];
          resolve();
        }
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

    const menuTemplate = this.findActiveTemplate('menu') || CANONICAL_CORPORATE_TEMPLATES.find(t => t.categoryKey === 'menu');
    const heroTemplate = this.findActiveTemplate('hero') || CANONICAL_CORPORATE_TEMPLATES.find(t => t.categoryKey === 'hero');
    const footerTemplate = this.findActiveTemplate('footer') || CANONICAL_CORPORATE_TEMPLATES.find(t => t.categoryKey === 'footer');

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
    let bodySections = this.sections.filter(s => s !== dbHeroSection && s.directUrl !== 'home-hero');
    if (bodySections.length === 0) {
      // Use turnkey canonical Corporate Suite showcase sections
      bodySections = DEFAULT_SHOWCASE_SECTIONS;
    }

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
    const cleanSlug = (this.currentSlug || '').trim().toLowerCase().replace(/^\/+/, '');

    if (!this.currentPage) {
      const blueprint = DEFAULT_PAGE_BLUEPRINTS[cleanSlug] ||
                        (cleanSlug.includes('about') ? DEFAULT_PAGE_BLUEPRINTS['about'] : null) ||
                        (cleanSlug.includes('service') && !cleanSlug.includes('request') ? DEFAULT_PAGE_BLUEPRINTS['services'] : null) ||
                        (cleanSlug.includes('request') ? DEFAULT_PAGE_BLUEPRINTS['request-service'] : null) ||
                        (cleanSlug.includes('contact') ? DEFAULT_PAGE_BLUEPRINTS['contact'] : null) ||
                        (cleanSlug.includes('privacy') ? DEFAULT_PAGE_BLUEPRINTS['privacy-policy'] : null) ||
                        (cleanSlug.includes('term') ? DEFAULT_PAGE_BLUEPRINTS['terms-and-conditions'] : null);

      if (blueprint) {
        this.currentPage = {
          title: blueprint.title,
          miniTitle: blueprint.miniTitle,
          description: blueprint.description,
          headerImageUrl: blueprint.headerImageUrl,
          fullDescription: blueprint.fullDescription,
          pageSections: blueprint.sections || []
        };
      } else {
        this.composeNotFoundPage();
        return;
      }
    }

    this.titleService.setTitle(`${this.currentPage.title || 'Page'} | ${this.brandName}`);

    const menuTemplate = this.findActiveTemplate('menu') || CANONICAL_CORPORATE_TEMPLATES.find(t => t.categoryKey === 'menu');
    const breadcrumbTemplate = this.findActiveTemplate('breadcrumb') || CANONICAL_CORPORATE_TEMPLATES.find(t => t.categoryKey === 'breadcrumb');
    const footerTemplate = this.findActiveTemplate('footer') || CANONICAL_CORPORATE_TEMPLATES.find(t => t.categoryKey === 'footer');

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
    let rawSections: any[] = this.currentPage.pageSections || [];
    if (rawSections.length === 0) {
      const blueprint = DEFAULT_PAGE_BLUEPRINTS[cleanSlug] ||
                        (cleanSlug.includes('about') ? DEFAULT_PAGE_BLUEPRINTS['about'] : null) ||
                        (cleanSlug.includes('service') && !cleanSlug.includes('request') ? DEFAULT_PAGE_BLUEPRINTS['services'] : null) ||
                        (cleanSlug.includes('request') ? DEFAULT_PAGE_BLUEPRINTS['request-service'] : null) ||
                        (cleanSlug.includes('contact') ? DEFAULT_PAGE_BLUEPRINTS['contact'] : null);
      if (blueprint?.sections) {
        rawSections = blueprint.sections;
      }
    }

    const heroSection = rawSections.find(
      (sec: any) => (sec.templateKey || '').toLowerCase() === 'hero_corporatesplit' || sec.pageSortOrder === 1
    );

    if (breadcrumbTemplate) {
      combinedStyles += `\n${breadcrumbTemplate.cssStyles || ''}\n`;
      const breadcrumbData = {
        title: heroSection?.title || this.currentPage.title || '',
        miniTitle: heroSection?.miniTitle || this.currentPage.pageCategory?.categoryName || this.currentPage.pageCategory?.title || this.currentPage.miniTitle || '',
        description: heroSection?.description || this.currentPage.description || '',
        backgroundImageUrl: heroSection?.imageUrl || this.currentPage.headerImageUrl || '',
        breadcrumbTrail: [
          { label: 'Home', url: '/', isActive: false },
          { label: this.currentPage.title || '', url: '#', isActive: true }
        ]
      };
      const breadcrumbHtml = this.templateHydration.hydrateTemplate(breadcrumbTemplate.htmlTemplate, breadcrumbData, this.getHydrationOptions());
      combinedHtml += `<!-- Breadcrumb Header -->\n${breadcrumbHtml}\n`;
      if (breadcrumbTemplate.jsScript) combinedJs += `\n${breadcrumbTemplate.jsScript}\n`;
    }

    // 3. Page Layout Sections (excluding hero consumed as breadcrumb header banner)
    const pageSections = rawSections.filter(
      (sec: any) => sec !== heroSection && (sec.templateKey || '').toLowerCase() !== 'hero_corporatesplit'
    );
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
      const bodyContent = this.currentPage.fullDescription || this.currentPage.description || '';
      if (bodyContent) {
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
    }

    // 4. Newsletter Bar (Corporate Suite signature footer bridge)
    const newsletterTemplate = this.findTemplateForSection({ templateKey: 'News_MinimalBar' });
    if (newsletterTemplate && !pageSections.some(s => (s.templateKey || '').toLowerCase() === 'news_minimalbar')) {
      if (!combinedStyles.includes(newsletterTemplate.cssStyles)) combinedStyles += `\n${newsletterTemplate.cssStyles || ''}\n`;
      const newsContext = {
        title: 'Subscribe to Executive Insights',
        miniTitle: 'NEWSLETTER',
        description: 'Receive weekly briefings, technology advisories, and organization updates directly in your inbox.'
      };
      combinedHtml += `<!-- Section: Newsletter -->\n` + this.templateHydration.hydrateTemplate(newsletterTemplate.htmlTemplate, newsContext, this.getHydrationOptions()) + `\n`;
      if (newsletterTemplate.jsScript) combinedJs += `\n${newsletterTemplate.jsScript}\n`;
    }

    // 5. Footer
    if (footerTemplate) {
      combinedStyles += `\n${footerTemplate.cssStyles || ''}\n`;
      const footerHtml = this.hydrateFooter(footerTemplate.htmlTemplate);
      combinedHtml += `<!-- Footer -->\n${footerHtml}\n`;
      if (footerTemplate.jsScript) combinedJs += `\n${footerTemplate.jsScript}\n`;
    }

    this.finalizeRender(combinedStyles, combinedHtml, combinedJs);
  }

  /**
   * Assembles the Blog Archive Page:
   * Menu + Breadcrumb Header + Blog Grid + Footer.
   */
  private composeBlogArchive(): void {
    this.titleService.setTitle(`Blog | ${this.brandName}`);

    const menuTemplate = this.findActiveTemplate('menu') || CANONICAL_CORPORATE_TEMPLATES.find(t => t.categoryKey === 'menu');
    const breadcrumbTemplate = this.findActiveTemplate('breadcrumb') || CANONICAL_CORPORATE_TEMPLATES.find(t => t.categoryKey === 'breadcrumb');
    const blogTemplate = this.findActiveTemplate('blog') || CANONICAL_CORPORATE_TEMPLATES.find(t => t.categoryKey === 'blog');
    const footerTemplate = this.findActiveTemplate('footer') || CANONICAL_CORPORATE_TEMPLATES.find(t => t.categoryKey === 'footer');

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
        miniTitle: 'CORPORATE JOURNAL',
        description: 'In-depth perspectives on modern architecture, technology governance, and digital scale.',
        backgroundImageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&auto=format&fit=crop&q=80',
        breadcrumbTrail: [
          { label: 'Home', url: '/', isActive: false },
          { label: 'Blog', url: '#', isActive: true }
        ]
      };
      combinedHtml += `<!-- Breadcrumb Header -->\n` + this.templateHydration.hydrateTemplate(breadcrumbTemplate.htmlTemplate, breadcrumbData, this.getHydrationOptions()) + `\n`;
      if (breadcrumbTemplate.jsScript) combinedJs += `\n${breadcrumbTemplate.jsScript}\n`;
    }

    // Render Blog Grid from database or default sample insights
    const activeBlogList = (this.blogs && this.blogs.length > 0) ? this.blogs : DEFAULT_SAMPLE_BLOGS;
    const articlesList = activeBlogList.map(b => ({
      id: b.id,
      title: b.title || '',
      Title: b.title || '',
      excerpt: b.description || '',
      Excerpt: b.description || '',
      category: b.blogCategory?.categoryName || b.categoryName || '',
      Category: b.blogCategory?.categoryName || b.categoryName || '',
      date: b.date ? new Date(b.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '',
      Date: b.date ? new Date(b.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '',
      author: b.author || '',
      Author: b.author || '',
      imageUrl: b.imageUrl || '',
      ImageUrl: b.imageUrl || '',
      directUrl: `/blog/${b.id}`,
      DirectUrl: `/blog/${b.id}`
    }));

    const blogContext = {
      title: 'Latest News & Briefings',
      Title: 'Latest News & Briefings',
      miniTitle: 'OUR WRITINGS',
      MiniTitle: 'OUR WRITINGS',
      description: 'Explore analyses and field reports published by our cross-functional teams.',
      Description: 'Explore analyses and field reports published by our cross-functional teams.',
      articles: articlesList,
      Articles: articlesList
    };

    if (blogTemplate) {
      if (!combinedStyles.includes(blogTemplate.cssStyles)) combinedStyles += `\n${blogTemplate.cssStyles || ''}\n`;
      combinedHtml += `<!-- Blog Grid -->\n` + this.templateHydration.hydrateTemplate(blogTemplate.htmlTemplate, blogContext, this.getHydrationOptions()) + `\n`;
      if (blogTemplate.jsScript) combinedJs += `\n${blogTemplate.jsScript}\n`;
    }

    // Newsletter Bar
    const newsletterTemplate = this.findTemplateForSection({ templateKey: 'News_MinimalBar' });
    if (newsletterTemplate) {
      if (!combinedStyles.includes(newsletterTemplate.cssStyles)) combinedStyles += `\n${newsletterTemplate.cssStyles || ''}\n`;
      const newsContext = {
        title: 'Subscribe to Executive Insights',
        miniTitle: 'NEWSLETTER',
        description: 'Receive weekly briefings, technology advisories, and organization updates directly in your inbox.'
      };
      combinedHtml += `<!-- Section: Newsletter -->\n` + this.templateHydration.hydrateTemplate(newsletterTemplate.htmlTemplate, newsContext, this.getHydrationOptions()) + `\n`;
      if (newsletterTemplate.jsScript) combinedJs += `\n${newsletterTemplate.jsScript}\n`;
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

    this.titleService.setTitle(`${this.currentArticle.title || 'Blog'} | ${this.brandName}`);

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
        title: this.currentArticle.title || '',
        miniTitle: this.currentArticle.blogCategory?.categoryName || this.currentArticle.categoryName || '',
        description: this.currentArticle.date ? `Published on ${new Date(this.currentArticle.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}` : '',
        backgroundImageUrl: this.currentArticle.imageUrl || '',
        breadcrumbTrail: [
          { label: 'Home', url: '/', isActive: false },
          { label: 'Blog', url: '/blog', isActive: false },
          { label: this.currentArticle.title || '', url: '#', isActive: true }
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

    // Newsletter Section (matching Demo Preview sequence)
    const newsletterTemplate = this.activeTemplates.find(t => (t.templateKey || '').toLowerCase() === 'news_minimalbar') ||
                               this.activeTemplates.find(t => (t.variantCode || '').toLowerCase() === 'news_minimalbar');
    if (newsletterTemplate) {
      if (!combinedStyles.includes(newsletterTemplate.cssStyles)) combinedStyles += `\n${newsletterTemplate.cssStyles || ''}\n`;
      const newsContext = {
        title: 'Subscribe to Executive Insights',
        miniTitle: 'NEWSLETTER',
        description: 'Receive weekly briefings, technology advisories, and organization updates directly in your inbox.'
      };
      combinedHtml += `<!-- Section: Newsletter -->\n` + this.templateHydration.hydrateTemplate(newsletterTemplate.htmlTemplate, newsContext, this.getHydrationOptions()) + `\n`;
      if (newsletterTemplate.jsScript) combinedJs += `\n${newsletterTemplate.jsScript}\n`;
    }

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
  /**
   * Hydrates the active Navbar template with live navigation categories, child links,
   * top menu pages, CTA buttons, and active link highlights.
   */
  private hydrateMenu(rawHtml: string, activeSlug: string): string {
    // Helper to safely parse and normalize MenuPosition values (1 = First, 2 = Middle, 3 = Last, 4 = Top)
    const normalizeMenuPosition = (val: any): number => {
      if (val === null || val === undefined) return 1;
      if (typeof val === 'number') return isNaN(val) ? 1 : val;
      const str = String(val).toLowerCase().trim();
      if (str.includes('first') || str === '1' || str === 'left') return 1;
      if (str.includes('middle') || str === '2' || str === 'center' || str === 'second') return 2;
      if (str.includes('last') || str === '3' || str === 'right' || str === 'third') return 3;
      if (str.includes('top') || str === '4') return 4;
      const num = Number(val);
      return isNaN(num) ? 1 : num;
    };

    // 1. Unified PageCategories list supporting both Standalone Pages and Nested Dropdown Categories
    const unifiedPageCategories: any[] = [];

    // Standalone pages (e.g. About Us, Contact Us)
    this.publishedPages
      .filter(p => (p.publish !== false && p.Publish !== false) && p.showInMainMenu && !p.isLegal && !p.pageCategoryId && !p.isMenuCTA && p.directUrl !== 'home' && p.directUrl !== '')
      .forEach(p => {
        const url = `/${(p.directUrl || p.slug || p.DirectUrl || p.Slug || '').replace(/^\/+/, '')}`;
        const pTitle = p.title || p.Title || p.pageTitle || p.PageTitle || '';
        unifiedPageCategories.push({
          title: pTitle,
          Title: pTitle,
          pageTitle: pTitle,
          PageTitle: pTitle,
          name: pTitle,
          Name: pTitle,
          url: url,
          Url: url,
          pageUrl: url,
          PageUrl: url,
          directUrl: url,
          DirectUrl: url,
          link: url,
          Link: url,
          hasChildren: false,
          HasChildren: false,
          isDropdown: false,
          IsDropdown: false,
          pages: [],
          Pages: [],
          sortOrder: p.sortOrder !== undefined ? p.sortOrder : (p.SortOrder !== undefined ? p.SortOrder : 0),
          menuPosition: normalizeMenuPosition(p.menuPosition ?? p.MenuPosition ?? 1),
          customClass: p.customClass || p.CustomClass || '',
          CustomClass: p.customClass || p.CustomClass || ''
        });
      });

    // Dropdown Categories (e.g. Services -> Real Estate)
    this.categories
      .filter(c => c.publish !== false && c.Publish !== false)
      .forEach(c => {
        const catTitle = c.title || c.categoryName || c.name || c.Title || c.CategoryName || 'Menu';
        const rawWebPages = c.webPages || c.WebPages || [];
        const childPages = (rawWebPages && rawWebPages.length > 0)
          ? rawWebPages.filter((p: any) => p.publish !== false && p.Publish !== false)
          : this.publishedPages.filter(p => (p.publish !== false && p.Publish !== false) && (p.pageCategoryId === c.id || p.pageCategoryId === c.Id || p.pageCategory?.id === c.id || p.pageCategory?.Id === c.id || p.pageCategory?.title === catTitle || p.pageCategory?.name === catTitle));

        const pagesList = childPages.map((p: any) => {
          const pUrl = `/${(p.directUrl || p.slug || p.DirectUrl || p.Slug || '').replace(/^\/+/, '')}`;
          const pTitle = p.title || p.Title || p.pageTitle || p.PageTitle || '';
          return {
            title: pTitle,
            Title: pTitle,
            pageTitle: pTitle,
            PageTitle: pTitle,
            name: pTitle,
            Name: pTitle,
            url: pUrl,
            Url: pUrl,
            pageUrl: pUrl,
            PageUrl: pUrl,
            directUrl: pUrl,
            DirectUrl: pUrl,
            link: pUrl,
            Link: pUrl,
            customClass: p.customClass || p.CustomClass || '',
            CustomClass: p.customClass || p.CustomClass || '',
            pageImage: p.imageUrl || p.pageImage || p.ImageUrl || p.PageImage || '',
            PageImage: p.imageUrl || p.pageImage || p.ImageUrl || p.PageImage || '',
            pageDescription: p.description || p.pageDescription || p.Description || p.PageDescription || '',
            PageDescription: p.description || p.pageDescription || p.Description || p.PageDescription || '',
            sortOrder: p.sortOrder || p.SortOrder || 0
          };
        });

        unifiedPageCategories.push({
          title: catTitle,
          Title: catTitle,
          pageTitle: catTitle,
          PageTitle: catTitle,
          name: catTitle,
          Name: catTitle,
          categoryName: catTitle,
          CategoryName: catTitle,
          url: '#',
          Url: '#',
          directUrl: '#',
          DirectUrl: '#',
          link: '#',
          Link: '#',
          hasChildren: pagesList.length > 0,
          HasChildren: pagesList.length > 0,
          isDropdown: true,
          IsDropdown: true,
          pages: pagesList,
          Pages: pagesList,
          sortOrder: c.menuSortOrder !== undefined ? c.menuSortOrder : (c.MenuSortOrder !== undefined ? c.MenuSortOrder : 0),
          menuPosition: normalizeMenuPosition(c.menuPosition ?? c.MenuPosition ?? 2),
          customClass: c.customClass || c.CustomClass || '',
          CustomClass: c.customClass || c.CustomClass || ''
        });
      });

    // Ensure 'Home' is the first navigation item if not already present
    if (!unifiedPageCategories.some(m => m.url === '/' || m.directUrl === '/')) {
      unifiedPageCategories.unshift({
        title: 'Home',
        Title: 'Home',
        pageTitle: 'Home',
        PageTitle: 'Home',
        name: 'Home',
        Name: 'Home',
        url: '/',
        Url: '/',
        pageUrl: '/',
        PageUrl: '/',
        directUrl: '/',
        DirectUrl: '/',
        link: '/',
        Link: '/',
        hasChildren: false,
        HasChildren: false,
        isDropdown: false,
        IsDropdown: false,
        pages: [],
        Pages: [],
        sortOrder: -1,
        menuPosition: 1,
        customClass: '',
        CustomClass: ''
      });
    }

    // Top menu items (standalone pages)
    const topMenuItems = this.publishedPages
      .filter(p => (p.publish !== false && p.Publish !== false) && p.showInMainMenu && !p.isLegal && !p.pageCategoryId && !p.isMenuCTA && p.directUrl !== 'home' && p.directUrl !== '')
      .map(p => ({
        title: p.title || p.Title || '',
        Title: p.title || p.Title || '',
        name: p.title || p.Title || '',
        Name: p.title || p.Title || '',
        url: `/${(p.directUrl || p.slug || p.DirectUrl || p.Slug || '').replace(/^\/+/, '')}`,
        Url: `/${(p.directUrl || p.slug || p.DirectUrl || p.Slug || '').replace(/^\/+/, '')}`,
        directUrl: `/${(p.directUrl || p.slug || p.DirectUrl || p.Slug || '').replace(/^\/+/, '')}`,
        DirectUrl: `/${(p.directUrl || p.slug || p.DirectUrl || p.Slug || '').replace(/^\/+/, '')}`,
        link: `/${(p.directUrl || p.slug || p.DirectUrl || p.Slug || '').replace(/^\/+/, '')}`,
        Link: `/${(p.directUrl || p.slug || p.DirectUrl || p.Slug || '').replace(/^\/+/, '')}`,
        sortOrder: p.sortOrder !== undefined ? p.sortOrder : (p.SortOrder !== undefined ? p.SortOrder : 0),
        menuPosition: normalizeMenuPosition(p.menuPosition ?? p.MenuPosition ?? 1),
        customClass: p.customClass || p.CustomClass || '',
        CustomClass: p.customClass || p.CustomClass || '',
        isDropdown: false,
        IsDropdown: false,
        hasChildren: false,
        HasChildren: false,
        pages: [],
        Pages: []
      }));

    if (!topMenuItems.some(m => m.url === '/')) {
      topMenuItems.unshift({
        title: 'Home',
        Title: 'Home',
        name: 'Home',
        Name: 'Home',
        url: '/',
        Url: '/',
        directUrl: '/',
        DirectUrl: '/',
        link: '/',
        Link: '/',
        sortOrder: -1,
        menuPosition: 1,
        customClass: '',
        CustomClass: '',
        isDropdown: false,
        IsDropdown: false,
        hasChildren: false,
        HasChildren: false,
        pages: [],
        Pages: []
      });
    }
    if (!topMenuItems.some(m => m.url === '/blog') && this.blogs.length > 0) {
      topMenuItems.push({
        title: 'Blog',
        Title: 'Blog',
        name: 'Blog',
        Name: 'Blog',
        url: '/blog',
        Url: '/blog',
        directUrl: '/blog',
        DirectUrl: '/blog',
        link: '/blog',
        Link: '/blog',
        sortOrder: 99,
        menuPosition: 3,
        customClass: '',
        CustomClass: '',
        isDropdown: false,
        IsDropdown: false,
        hasChildren: false,
        HasChildren: false,
        pages: [],
        Pages: []
      });
    }

    // Dropdowns
    const dropdowns = this.categories
      .filter(c => c.publish !== false && c.Publish !== false)
      .map(c => {
        const catTitle = c.title || c.categoryName || c.name || c.Title || c.CategoryName || 'Menu';
        const rawWebPages = c.webPages || c.WebPages || [];
        const childPages = (rawWebPages && rawWebPages.length > 0)
          ? rawWebPages.filter((p: any) => p.publish !== false && p.Publish !== false)
          : this.publishedPages.filter(p => (p.publish !== false && p.Publish !== false) && (p.pageCategoryId === c.id || p.pageCategoryId === c.Id || p.pageCategory?.id === c.id || p.pageCategory?.Id === c.id || p.pageCategory?.title === catTitle || p.pageCategory?.name === catTitle));

        const pagesList = childPages.map((p: any) => {
          const pUrl = `/${(p.directUrl || p.slug || p.DirectUrl || p.Slug || '').replace(/^\/+/, '')}`;
          const pTitle = p.title || p.Title || p.pageTitle || p.PageTitle || '';
          return {
            title: pTitle,
            Title: pTitle,
            pageTitle: pTitle,
            PageTitle: pTitle,
            name: pTitle,
            Name: pTitle,
            url: pUrl,
            Url: pUrl,
            pageUrl: pUrl,
            PageUrl: pUrl,
            directUrl: pUrl,
            DirectUrl: pUrl,
            link: pUrl,
            Link: pUrl,
            customClass: p.customClass || p.CustomClass || '',
            CustomClass: p.customClass || p.CustomClass || '',
            pageImage: p.imageUrl || p.pageImage || p.ImageUrl || p.PageImage || '',
            PageImage: p.imageUrl || p.pageImage || p.ImageUrl || p.PageImage || '',
            pageDescription: p.description || p.pageDescription || p.Description || p.PageDescription || '',
            PageDescription: p.description || p.pageDescription || p.Description || p.PageDescription || '',
            sortOrder: p.sortOrder || p.SortOrder || 0
          };
        });

        return {
          title: catTitle,
          Title: catTitle,
          name: catTitle,
          Name: catTitle,
          categoryName: catTitle,
          CategoryName: catTitle,
          url: '#',
          Url: '#',
          directUrl: '#',
          DirectUrl: '#',
          link: '#',
          Link: '#',
          sortOrder: c.menuSortOrder !== undefined ? c.menuSortOrder : (c.MenuSortOrder !== undefined ? c.MenuSortOrder : 0),
          menuPosition: normalizeMenuPosition(c.menuPosition ?? c.MenuPosition ?? 2),
          customClass: c.customClass || c.CustomClass || '',
          CustomClass: c.customClass || c.CustomClass || '',
          isDropdown: true,
          IsDropdown: true,
          hasChildren: pagesList.length > 0,
          HasChildren: pagesList.length > 0,
          pages: pagesList,
          Pages: pagesList
        };
      });

    // Combined Unified NavItems (Direct Pages + Dropdowns, deduplicated)
    const categoryTitles = new Set(dropdowns.map(d => (d.title || d.Title || '').toLowerCase().trim()));
    const filteredTopMenuItems = topMenuItems.filter(t => !categoryTitles.has((t.title || t.Title || '').toLowerCase().trim()));
    const allNavItems: any[] = [...filteredTopMenuItems, ...dropdowns];
    
    // Bucket into Multi-Zone Groups with combined SortOrder sorting
    const navItemsFirst = allNavItems
      .filter(item => normalizeMenuPosition(item.menuPosition) === 1)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

    const navItemsMiddle = allNavItems
      .filter(item => normalizeMenuPosition(item.menuPosition) === 2)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

    const navItemsLast = allNavItems
      .filter(item => normalizeMenuPosition(item.menuPosition) === 3)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

    const navItems = [...allNavItems].sort((a, b) => {
      const posA = normalizeMenuPosition(a.menuPosition);
      const posB = normalizeMenuPosition(b.menuPosition);
      if (posA !== posB) return posA - posB;
      return (a.sortOrder || 0) - (b.sortOrder || 0);
    });

    // TopBar Utility Pages (MenuPosition.Top == 4 or showInMenuTopBar == true)
    const topBarPages = this.publishedPages
      .filter(p => p.publish && (normalizeMenuPosition(p.menuPosition) === 4 || p.showInMenuTopBar === true))
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
      .map(p => ({
        title: p.title,
        url: `/${(p.directUrl || p.slug || '').replace(/^\/+/, '')}`,
        customClass: p.customClass || ''
      }));

    // 3. CTA Buttons (pages with isMenuCTA = true)
    const menuCtaButtons: Array<{ title: string; url: string; customClass?: string }> = this.publishedPages
      .filter(p => p.isMenuCTA)
      .map(p => ({
        title: p.title,
        url: `/${(p.directUrl || p.slug || '').replace(/^\/+/, '')}`,
        customClass: p.customClass || ''
      }));

    // Dynamic Live Sign-In Button in Navigation Menu
    const isLoginActive = this.brandInfo?.activateLogin !== false;
    const isLoginInMenu = this.brandInfo?.activateLoginInMenu !== false;
    const authed = this.isUserAuthenticated();
    const isAdmin = authed && this.isUserAdmin();
    const isMember = authed && !isAdmin;

    const loginText = !authed 
      ? (this.brandInfo?.loginButtonText || 'Sign In') 
      : (isAdmin ? 'Console' : 'My Workspace');
    const loginUrl = !authed 
      ? '/auth/login' 
      : (isAdmin ? '/dashboard/console' : '/dashboard/workspace');
    const loginIcon = !authed 
      ? 'fa-solid fa-arrow-right-to-bracket' 
      : (isAdmin ? 'fa-solid fa-gauge-high' : 'fa-solid fa-user');

    const loginButtonHtml = (isLoginActive && isLoginInMenu)
      ? `<a href="${loginUrl}" class="btn btn-sm ${authed ? 'btn-primary' : 'btn-outline-primary'} rounded-pill px-3 fw-bold d-inline-flex align-items-center gap-2 oz-login-btn"><i class="${loginIcon}"></i> <span>${loginText}</span></a>`
      : '';

    const hasBrandLogo = Boolean(this.brandLogoUrl && this.brandLogoUrl.trim().length > 0);
    const hasContactInfo = Boolean(this.brandInfo?.phone || this.brandInfo?.email || this.brandInfo?.address);

    const menuContext = {
      PageCategories: unifiedPageCategories,
      pageCategories: unifiedPageCategories,
      NavigationMenu: unifiedPageCategories,
      navigationMenu: unifiedPageCategories,
      categories: unifiedPageCategories,
      topMenuItems,
      dropdowns,
      menuCtaButtons,
      navItems,
      navItemsFirst,
      navItemsMiddle,
      navItemsLast,
      topBarPages,
      mainMenuItemsTop: topBarPages,
      cartCount: this.cartService.getItemCount(),
      BrandName: this.brandName,
      brandName: this.brandName,
      CompanyName: this.brandName,
      companyName: this.brandName,
      'Brand.Name': this.brandName,
      LogoUrl: this.brandLogoUrl,
      logoUrl: this.brandLogoUrl,
      BrandLogo: this.brandLogoUrl,
      brandLogo: this.brandLogoUrl,
      CompanyLogo: this.brandLogoUrl,
      companyLogo: this.brandLogoUrl,
      WhiteLogoUrl: this.brandLogoUrl,
      whiteLogoUrl: this.brandLogoUrl,
      'Brand.LogoUrl': this.brandLogoUrl,
      'Brand.WhiteLogoUrl': this.brandLogoUrl,
      'Brand.WebsiteUrl': '/',
      'Brand.LoginButtonText': loginText,
      HasBrandLogo: hasBrandLogo,
      hasBrandLogo: hasBrandLogo,
      HomeUrl: '/',
      homeUrl: '/',
      WebsiteUrl: '/',
      websiteUrl: '/',
      // Multi-zone conditional flags for defensive DOM rendering
      HasNavItemsFirst: navItemsFirst.length > 0,
      hasNavItemsFirst: navItemsFirst.length > 0,
      NavItemsFirst: navItemsFirst.length > 0,
      HasNavItemsMiddle: navItemsMiddle.length > 0,
      hasNavItemsMiddle: navItemsMiddle.length > 0,
      NavItemsMiddle: navItemsMiddle.length > 0,
      HasNavItemsLast: navItemsLast.length > 0,
      hasNavItemsLast: navItemsLast.length > 0,
      NavItemsLast: navItemsLast.length > 0,
      HasNavItems: navItems.length > 0,
      hasNavItems: navItems.length > 0,
      HasTopBar: topBarPages.length > 0 || hasContactInfo,
      hasTopBar: topBarPages.length > 0 || hasContactInfo,
      HasTopBarPages: topBarPages.length > 0,
      hasTopBarPages: topBarPages.length > 0,
      HasMenuCtaButtons: menuCtaButtons.length > 0,
      hasMenuCtaButtons: menuCtaButtons.length > 0,
      HasContactInfo: hasContactInfo,
      hasContactInfo: hasContactInfo,
      HasPhone: Boolean(this.brandInfo?.phone),
      hasPhone: Boolean(this.brandInfo?.phone),
      HasEmail: Boolean(this.brandInfo?.email),
      hasEmail: Boolean(this.brandInfo?.email),
      HasAddress: Boolean(this.brandInfo?.address),
      hasAddress: Boolean(this.brandInfo?.address),
      email: this.brandInfo?.email || '',
      Email: this.brandInfo?.email || '',
      phone: this.brandInfo?.phone || '',
      Phone: this.brandInfo?.phone || '',
      address: this.brandInfo?.address || '',
      Address: this.brandInfo?.address || '',
      // Authentication & Role Tokens for Menu templates
      IsAuthenticated: authed,
      IsAdmin: isAdmin,
      IsMember: isMember,
      ActivateLoginInMenu: isLoginActive && isLoginInMenu,
      ShowLogin: isLoginActive && isLoginInMenu,
      LoginText: loginText,
      LoginTitle: loginText,
      LoginUrl: loginUrl,
      LoginButtonHtml: loginButtonHtml,
      LoginButton: loginButtonHtml,
      LoginLink: loginButtonHtml
    };

    let html = this.templateHydration.hydrateTemplate(rawHtml, menuContext, this.getHydrationOptions());

    // Highlight active link matching activeSlug
    if (activeSlug) {
      const activeNormalized = activeSlug === 'home' ? '/' : `/${activeSlug}`;
      const regex = new RegExp(`(<a\\s+[^>]*href=["']${activeNormalized}["'][^>]*class=["'][^"']*)(["'])`, 'gi');
      html = html.replace(regex, '$1 active fw-bold$2');
    }

    return html;
  }

  /**
   * Helper to check if the current browser session has an active, unexpired JWT token.
   */
  private isUserAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    const token = localStorage.getItem('access_token');
    if (!token) return false;
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        return !!payload.exp && Date.now() < payload.exp * 1000;
      }
    } catch {}
    return false;
  }

  /**
   * Helper to check if the current user possesses administrative roles
   * (SuperAdmin, Admin, IdentityManager, CmsManager, SystemAdministrator).
   */
  private isUserAdmin(): boolean {
    if (typeof window === 'undefined') return false;
    const rolesJson = localStorage.getItem('user_roles');
    if (!rolesJson) return false;
    try {
      const roles = JSON.parse(rolesJson);
      if (Array.isArray(roles)) {
        const adminRoles = ['superadmin', 'admin', 'identitymanager', 'cmsmanager', 'systemadministrator'];
        return roles.some((r: any) => typeof r === 'string' && adminRoles.includes(r.toLowerCase()));
      }
    } catch {}
    return false;
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

    // Dynamic Live Sign-In Button in Website Footer
    const isLoginActive = this.brandInfo?.activateLogin !== false;
    const isLoginInFooter = this.brandInfo?.activateLoginInFooter !== false;
    const authed = this.isUserAuthenticated();
    const isAdmin = authed && this.isUserAdmin();
    const isMember = authed && !isAdmin;

    const loginText = !authed 
      ? (this.brandInfo?.loginButtonText || 'Sign In') 
      : (isAdmin ? 'Console' : 'My Workspace');
    const loginUrl = !authed 
      ? '/auth/login' 
      : (isAdmin ? '/dashboard/console' : '/dashboard/workspace');
    const loginIcon = !authed 
      ? 'fa-solid fa-arrow-right-to-bracket' 
      : (isAdmin ? 'fa-solid fa-gauge-high' : 'fa-solid fa-user');

    const loginButtonHtml = (isLoginActive && isLoginInFooter)
      ? `<a href="${loginUrl}" class="btn btn-sm ${authed ? 'btn-primary' : 'btn-outline-primary'} rounded-pill px-3 fw-bold d-inline-flex align-items-center gap-2 oz-login-btn"><i class="${loginIcon}"></i> <span>${loginText}</span></a>`
      : '';

    if (isLoginActive && isLoginInFooter) {
      legalPages.push({
        title: loginText,
        url: loginUrl
      });
      if (footerCategories.length > 0) {
        footerCategories[footerCategories.length - 1].pages.push({
          title: loginText,
          url: loginUrl
        });
      }
    }

    const footerContext = {
      BrandName: this.brandName,
      LogoUrl: this.brandLogoUrl,
      Year: new Date().getFullYear().toString(),
      Description: this.brandInfo?.companyDescription || '',
      Email: this.brandInfo?.companyEmail || this.brandInfo?.email || '',
      Phone: this.brandInfo?.companyPhone || this.brandInfo?.phone || '',
      Address: this.brandInfo?.companyAddress || this.brandInfo?.address || '',
      Copyright: `&copy; ${new Date().getFullYear()} ${this.brandName}. All rights reserved.`,
      categories: footerCategories,
      legalPages: legalPages,
      // Authentication & Role Tokens for Footer templates
      IsAuthenticated: authed,
      IsAdmin: isAdmin,
      IsMember: isMember,
      ActivateLoginInFooter: isLoginActive && isLoginInFooter,
      LoginText: loginText,
      LoginTitle: loginText,
      LoginUrl: loginUrl,
      LoginButtonHtml: loginButtonHtml,
      LoginButton: loginButtonHtml,
      LoginLink: loginButtonHtml
    };

    let html = this.templateHydration.hydrateTemplate(rawHtml, footerContext, this.getHydrationOptions());
    return this.templateHydration.enforceOzikolCredit(html);
  }

  /**
   * Builds Hero hydration data from active DB section or sliders.
   */
  private buildHeroContext(dbHeroSection?: any): any {
    if (dbHeroSection) {
      return {
        title: dbHeroSection.title || `Engineering Sovereign Solutions for ${this.brandName}`,
        Title: dbHeroSection.title || `Engineering Sovereign Solutions for ${this.brandName}`,
        miniTitle: dbHeroSection.miniTitle || 'ENTERPRISE PLATFORM',
        MiniTitle: dbHeroSection.miniTitle || 'ENTERPRISE PLATFORM',
        description: dbHeroSection.description || 'Deploy turnkey organizational websites, interactive service intake forms, and sovereign tenant infrastructure with zero technical debt.',
        Description: dbHeroSection.description || 'Deploy turnkey organizational websites, interactive service intake forms, and sovereign tenant infrastructure with zero technical debt.',
        imageUrl: dbHeroSection.imageUrl || 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
        ImageUrl: dbHeroSection.imageUrl || 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
        buttonText: dbHeroSection.buttonText || 'Explore Solutions',
        ButtonText: dbHeroSection.buttonText || 'Explore Solutions',
        buttonLink: dbHeroSection.buttonLink || '/services',
        ButtonLink: dbHeroSection.buttonLink || '/services',
        secondaryButtonText: dbHeroSection.secondaryButtonText || dbHeroSection.secondButtonText || 'Request Intake',
        SecondaryButtonText: dbHeroSection.secondaryButtonText || dbHeroSection.secondButtonText || 'Request Intake',
        secondaryButtonLink: dbHeroSection.secondaryButtonLink || dbHeroSection.secondButtonLink || '/request-service',
        SecondaryButtonLink: dbHeroSection.secondaryButtonLink || dbHeroSection.secondButtonLink || '/request-service'
      };
    }

    if (this.sliders && this.sliders.length > 0) {
      const activeSlider = this.sliders[0];
      return {
        title: activeSlider.title || `Engineering Sovereign Solutions for ${this.brandName}`,
        Title: activeSlider.title || `Engineering Sovereign Solutions for ${this.brandName}`,
        miniTitle: activeSlider.miniTitle || 'ENTERPRISE PLATFORM',
        MiniTitle: activeSlider.miniTitle || 'ENTERPRISE PLATFORM',
        description: activeSlider.description || 'Deploy turnkey organizational websites, interactive service intake forms, and sovereign tenant infrastructure with zero technical debt.',
        Description: activeSlider.description || 'Deploy turnkey organizational websites, interactive service intake forms, and sovereign tenant infrastructure with zero technical debt.',
        imageUrl: activeSlider.imageUrl || 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
        ImageUrl: activeSlider.imageUrl || 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
        buttonText: activeSlider.buttonText || 'Explore Solutions',
        ButtonText: activeSlider.buttonText || 'Explore Solutions',
        buttonLink: activeSlider.buttonLink || '/services',
        ButtonLink: activeSlider.buttonLink || '/services',
        secondaryButtonText: activeSlider.secondaryButtonText || activeSlider.secondButtonText || 'Request Intake',
        SecondaryButtonText: activeSlider.secondaryButtonText || activeSlider.secondButtonText || 'Request Intake',
        secondaryButtonLink: activeSlider.secondaryButtonLink || activeSlider.secondButtonLink || '/request-service',
        SecondaryButtonLink: activeSlider.secondaryButtonLink || activeSlider.secondButtonLink || '/request-service'
      };
    }

    return {
      title: `Engineering Sovereign Solutions for ${this.brandName}`,
      Title: `Engineering Sovereign Solutions for ${this.brandName}`,
      miniTitle: 'MODULAR ENTERPRISE ARCHITECTURE',
      MiniTitle: 'MODULAR ENTERPRISE ARCHITECTURE',
      description: 'Deploy turnkey organizational websites, interactive service intake forms, and sovereign tenant infrastructure with zero technical debt.',
      Description: 'Deploy turnkey organizational websites, interactive service intake forms, and sovereign tenant infrastructure with zero technical debt.',
      imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
      ImageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
      buttonText: 'Explore Solutions',
      ButtonText: 'Explore Solutions',
      buttonLink: '/services',
      ButtonLink: '/services',
      secondaryButtonText: 'Request Intake',
      SecondaryButtonText: 'Request Intake',
      secondaryButtonLink: '/request-service',
      SecondaryButtonLink: '/request-service'
    };
  }

  /**
   * Formats a PageSection database entity into the token context expected by TemplateHydrationService.
   */
  private buildSectionContext(sec: any): any {
    const listItems = (sec.pageSectionLists || sec.items || []).map((item: any, idx: number) => ({
      id: item.id,
      title: item.title || '',
      Title: item.title || '',
      miniTitle: item.miniTitle || '',
      MiniTitle: item.miniTitle || '',
      description: item.description || '',
      Description: item.description || '',
      moreDescription: item.moreDescription || '',
      MoreDescription: item.moreDescription || '',
      iconText: item.iconText || item.icon || '',
      IconText: item.iconText || item.icon || '',
      icon: item.iconText || item.icon || '',
      imageUrl: item.imageUrl || '',
      ImageUrl: item.imageUrl || '',
      secondImageUrl: item.secondImageUrl || '',
      SecondImageUrl: item.secondImageUrl || '',
      buttonText: item.buttonText || '',
      ButtonText: item.buttonText || '',
      buttonLink: item.buttonLink || '',
      ButtonLink: item.buttonLink || '',
      directUrl: item.directUrl || '',
      DirectUrl: item.directUrl || '',
      sortOrder: item.sortOrder || idx + 1
    }));

    return {
      title: sec.title || '',
      Title: sec.title || '',
      miniTitle: sec.miniTitle || '',
      MiniTitle: sec.miniTitle || '',
      qoute: sec.qoute || sec.quote || '',
      Qoute: sec.qoute || sec.quote || '',
      quote: sec.quote || sec.qoute || '',
      Quote: sec.quote || sec.qoute || '',
      description: sec.description || '',
      Description: sec.description || '',
      fullDescription: sec.fullDescription || sec.description || '',
      FullDescription: sec.fullDescription || sec.description || '',
      imageUrl: sec.imageUrl || '',
      ImageUrl: sec.imageUrl || '',
      secondImageUrl: sec.secondImageUrl || '',
      SecondImageUrl: sec.secondImageUrl || '',
      videoUrl: sec.videoUrl || '',
      VideoUrl: sec.videoUrl || '',
      youtubeUrlLink: sec.youtubeUrlLink || sec.videoUrl || '',
      YoutubeUrlLink: sec.youtubeUrlLink || sec.videoUrl || '',
      iconText: sec.iconText || '',
      IconText: sec.iconText || '',
      buttonText: sec.buttonText || '',
      ButtonText: sec.buttonText || '',
      buttonLink: sec.buttonLink || '#',
      ButtonLink: sec.buttonLink || '#',
      secondButtonText: sec.secondButtonText || sec.secondaryButtonText || '',
      SecondButtonText: sec.secondButtonText || sec.secondaryButtonText || '',
      secondaryButtonText: sec.secondButtonText || sec.secondaryButtonText || '',
      SecondaryButtonText: sec.secondButtonText || sec.secondaryButtonText || '',
      secondButtonLink: sec.secondButtonLink || sec.secondaryButtonLink || '',
      SecondButtonLink: sec.secondButtonLink || sec.secondaryButtonLink || '',
      secondaryButtonLink: sec.secondButtonLink || sec.secondaryButtonLink || '',
      SecondaryButtonLink: sec.secondButtonLink || sec.secondaryButtonLink || '',
      directUrl: sec.directUrl || '',
      DirectUrl: sec.directUrl || '',
      customClass: sec.customClass || '',
      CustomClass: sec.customClass || '',
      backgroundColor: sec.backgroundColor || '',
      BackgroundColor: sec.backgroundColor || '',
      formKey: sec.formKey || (sec.pageForm ? sec.pageForm.formKey : ''),
      FormKey: sec.formKey || (sec.pageForm ? sec.pageForm.formKey : ''),
      pageSectionLists: listItems,
      PageSectionLists: listItems,
      items: listItems
    };
  }

  private findActiveTemplate(category: string): any {
    const found = this.activeTemplates.find(t => (t.categoryKey || t.category || '').toLowerCase() === category.toLowerCase());
    if (found) return found;
    return CANONICAL_CORPORATE_TEMPLATES.find(t => (t.categoryKey || t.category || '').toLowerCase() === category.toLowerCase());
  }

  private findTemplateForSection(sec: any): any {
    const rawKey = sec.templateKey || sec.variantCode || sec.directUrl || '';
    if (rawKey) {
      const normalizedKey = rawKey.toLowerCase();
      // 1. Exact match in activeTemplates
      const exactMatch = this.activeTemplates.find(t => 
        (t.templateKey || '').toLowerCase() === normalizedKey ||
        (t.variantCode || '').toLowerCase() === normalizedKey
      );
      if (exactMatch) return exactMatch;

      // 2. Exact match in CANONICAL_CORPORATE_TEMPLATES
      const canonicalExact = CANONICAL_CORPORATE_TEMPLATES.find(t => 
        (t.templateKey || '').toLowerCase() === normalizedKey ||
        (t.variantCode || '').toLowerCase() === normalizedKey
      );
      if (canonicalExact) return canonicalExact;

      // 3. Smart alias mapping between seeded template keys and installed theme keys
      const keyAliases: { [key: string]: string[] } = {
        'body_splitshowcase': ['body_missionsplit', 'body_featuregrid3'],
        'split-media-showcase': ['body_missionsplit', 'body_featuregrid3'],
        'body_statscounters': ['body_statscounters', 'body_metricscounter', 'body_statscounter4'],
        'stats-counter': ['body_statscounters', 'body_metricscounter'],
        'body_metricscounter': ['body_statscounters', 'body_metricscounter'],
        'body_processsteps': ['body_processsteps', 'body_missionsplit', 'body_featuregrid3'],
        'process-steps': ['body_processsteps', 'body_missionsplit'],
        'body_missionsplit': ['body_missionsplit'],
        'body_ctasplit': ['body_ctasplit', 'body_ctabanner', 'body_ctabannerfull'],
        'cta-banner': ['body_ctasplit', 'body_ctabanner'],
        'body_ctabanner': ['body_ctasplit', 'body_ctabanner'],
        'news_minimalbar': ['news_minimalbar'],
        'newsletter-bar': ['news_minimalbar'],
        'contact_splitdetails': ['contact_splitdetails'],
        'contact-split': ['contact_splitdetails'],
        'body_requestservice': ['body_requestservice'],
        'request-service': ['body_requestservice'],
        'body_featuregrid3': ['body_featuregrid3'],
        'features-3col': ['body_featuregrid3'],
        'feature-cards-grid': ['body_featuregrid3'],
        'body_testimonials': ['body_testimonials'],
        'testimonials': ['body_testimonials'],
        'testimonials-grid': ['body_testimonials'],
        'body_faqaccordion': ['body_faqaccordion'],
        'faq': ['body_faqaccordion'],
        'faq-accordion': ['body_faqaccordion'],
        'team-grid': ['body_featuregrid3']
      };

      const aliases = keyAliases[normalizedKey];
      if (aliases) {
        for (const alias of aliases) {
          const aliasMatch = this.activeTemplates.find(t => 
            (t.templateKey || '').toLowerCase() === alias ||
            (t.variantCode || '').toLowerCase() === alias
          ) || CANONICAL_CORPORATE_TEMPLATES.find(t => 
            (t.templateKey || '').toLowerCase() === alias ||
            (t.variantCode || '').toLowerCase() === alias
          );
          if (aliasMatch) return aliasMatch;
        }
      }
    }
    // Fallback to active body template or canonical feature grid
    return this.findActiveTemplate('body') || CANONICAL_CORPORATE_TEMPLATES.find(t => t.templateKey === 'Body_FeatureGrid3');
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
   * Injects code tags strictly from the database according to CMS architecture:
   * - Zone 1: <head> -> external CSS stylesheets, meta tags, Google Fonts, OpenGraph, JSON-LD, Favicons
   * - Zone 2: <body> -> immediately after opening body tag
   * - Zone 3: </body> -> immediately before closing body tag (vendor JavaScript, section scripts)
   */
  private injectCodeTags(combinedJs?: string): void {
    // Clean up previously injected dynamic tags
    document.querySelectorAll('.ozikol-injected-tag').forEach(el => el.remove());

    // 1. Inject CMS Header Tags (<head>) strictly from DB in sort order
    if (this.codeInjections.head && this.codeInjections.head.length > 0) {
      for (const tag of this.codeInjections.head) {
        if (!tag.content) continue;
        this.appendHtmlToContainer(document.head, tag.content, 'head');
      }
    }

    // 2. Inject CMS Body Open Tags (immediately after <body>) strictly from DB
    if (this.codeInjections.bodyOpen && this.codeInjections.bodyOpen.length > 0) {
      for (const tag of this.codeInjections.bodyOpen) {
        if (!tag.content) continue;
        this.prependHtmlToBody(tag.content);
      }
    }

    // 3. Inject CMS Footer Scripts (right before </body>) strictly from DB in sort order
    if (this.codeInjections.footer && this.codeInjections.footer.length > 0) {
      for (const tag of this.codeInjections.footer) {
        if (!tag.content) continue;
        this.appendHtmlToContainer(document.body, tag.content, 'footer');
      }
    }

    // 4. Section JavaScript Execution
    if (combinedJs && combinedJs.trim()) {
      const script = document.createElement('script');
      script.className = 'ozikol-injected-tag ozikol-section-scripts';
      const cleanJs = combinedJs.replace(/<\/?script[^>]*>/gi, '').trim();
      script.textContent = `
        try {
          ${cleanJs}
        } catch (e) {
          console.error('[Ozikol Theme Script Error]:', e);
        }
      `;
      document.body.appendChild(script);
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
      // Check if this anchor is a toggle button or modal/drawer trigger
      const isThemeToggle = anchor.getAttribute('data-bs-toggle') !== null ||
                            anchor.getAttribute('data-toggle') !== null ||
                            anchor.hasAttribute('data-bs-target') ||
                            anchor.hasAttribute('data-target') ||
                            anchor.classList.contains('toggle-btn') ||
                            anchor.classList.contains('menu-toggle');

      const href = (anchor.getAttribute('href') || '').trim();

      if (isThemeToggle || href === '#' || href === '' || href.startsWith('javascript:')) {
        // Allow theme's JS handler to manage offcanvas / modal / drawer toggling without Angular router hijacking
        return;
      }

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
