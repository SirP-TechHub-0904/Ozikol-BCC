import { Component, OnInit, OnDestroy, HostListener, ElementRef, ViewEncapsulation, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml, Title, Meta } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { CartService } from '../../core/services/cart.service';
import { ToastService } from '../../core/services/toast.service';
import { TemplateHydrationService } from '../admin/content/templates/services/template-hydration.service';
import { ContentHydrationService } from '../admin/content/templates/services/content-hydration.service';
import { HtmlAssemblerService, SectionTemplateUnit, CodeInjectionTag } from '../admin/content/templates/services/html-assembler.service';

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
    private contentHydration: ContentHydrationService,
    private htmlAssembler: HtmlAssemblerService,
    private sanitizer: DomSanitizer,
    private titleService: Title,
    private metaService: Meta,
    private elementRef: ElementRef,
    private cdr: ChangeDetectorRef
  ) {}

  /**
   * Aggregates live database code injections for HtmlAssemblerService zones.
   */
  private get allCodeInjectionsList(): CodeInjectionTag[] {
    const list: CodeInjectionTag[] = [];
    (this.codeInjections.head || []).forEach(t => list.push({ ...t, zone: 'head', isActive: t.isActive !== false }));
    (this.codeInjections.bodyOpen || []).forEach(t => list.push({ ...t, zone: 'body_open', isActive: t.isActive !== false }));
    (this.codeInjections.footer || []).forEach(t => list.push({ ...t, zone: 'footer', isActive: t.isActive !== false }));
    return list;
  }

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
      this.cdr.detectChanges();
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
            const email = data.contactEmail || data.supportEmail || data.email || data.companyEmail || '';
            const phone = data.primaryPhone || data.phoneOne || data.phone || data.companyPhone || '';
            const address = data.address || data.addressOne || data.companyAddress || '';
            const workingHours = data.workingHours || '';
            this.brandInfo = {
              ...this.brandInfo,
              ...data,
              email,
              Email: email,
              phone,
              Phone: phone,
              address,
              Address: address,
              workingHours,
              WorkingHours: workingHours
            };
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
        error: () => {
          this.apiService.get('ContentApi/categories').subscribe({
            next: (cRes: any) => {
              this.categories = cRes?.data || [];
              resolve();
            },
            error: () => resolve()
          });
        }
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
        error: () => {
          this.apiService.get('ContentApi/pages').subscribe({
            next: (pRes: any) => {
              this.publishedPages = pRes?.data || [];
              resolve();
            },
            error: () => resolve()
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
          const loadedPage = res?.data || null;
          // Strictly reject unpublished pages
          if (loadedPage && (loadedPage.publish === false || loadedPage.Publish === false)) {
            this.currentPage = null;
          } else {
            this.currentPage = loadedPage;
          }

          // In-memory fallback if not found via API, strictly enforcing publish === true
          if (!this.currentPage) {
            this.currentPage = this.publishedPages.find(p =>
              p.publish !== false && p.Publish !== false &&
              ((p.directUrl && p.directUrl.toLowerCase().replace(/^\/+/, '') === clean) ||
              (p.slug && p.slug.toLowerCase().replace(/^\/+/, '') === clean) ||
              (p.title && p.title.toLowerCase().replace(/\s+/g, '-') === clean))
            ) || null;
          }
          resolve();
        },
        error: (err) => {
          console.warn(`Could not load page with slug '${slug}':`, err);
          this.currentPage = this.publishedPages.find(p =>
            p.publish !== false && p.Publish !== false &&
            ((p.directUrl && p.directUrl.toLowerCase().replace(/^\/+/, '') === clean) ||
            (p.slug && p.slug.toLowerCase().replace(/^\/+/, '') === clean) ||
            (p.title && p.title.toLowerCase().replace(/\s+/g, '-') === clean))
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

    // 1. Navigation Header Section Unit
    const menuTemplate = this.findActiveTemplate('menu');
    const headerSection: SectionTemplateUnit | undefined = menuTemplate ? {
      id: menuTemplate.id,
      name: menuTemplate.name,
      category: 'menu',
      html: this.hydrateMenu(menuTemplate.htmlTemplate, 'home'),
      css: menuTemplate.cssStyles,
      js: menuTemplate.jsScript
    } : undefined;

    // 2. Hero Section Unit
    const heroTemplate = this.findActiveTemplate('hero');
    const dbHeroSection = this.sections.find(s => 
      s.directUrl === 'home-hero' || 
      (s.templateKey || '').toUpperCase().includes('HERO') || 
      s.homePageSortOrder === 1 || 
      s.pageSortOrder === 1
    );
    const heroSection: SectionTemplateUnit | undefined = heroTemplate ? {
      id: heroTemplate.id,
      name: heroTemplate.name,
      category: 'hero',
      html: this.contentHydration.hydrate(heroTemplate.htmlTemplate, this.buildHeroContext(dbHeroSection), 'hero'),
      css: heroTemplate.cssStyles,
      js: heroTemplate.jsScript
    } : undefined;

    // 3. Modular Body Section Units from database
    const bodySectionsList: SectionTemplateUnit[] = [];
    const bodySections = this.sections.filter(s => 
      s !== dbHeroSection && 
      s.directUrl !== 'home-hero' && 
      !(s.templateKey || '').toUpperCase().includes('HERO')
    );

    for (const sec of bodySections) {
      const secTemplate = this.findTemplateForSection(sec);
      if (secTemplate) {
        const activeHtml = (sec.isCustomized && sec.htmlTemplate) ? sec.htmlTemplate : secTemplate.htmlTemplate;
        const activeCss = (sec.isCustomized && sec.cssStyles) ? sec.cssStyles : secTemplate.cssStyles;
        const activeJs = (sec.isCustomized && sec.jsScript) ? sec.jsScript : secTemplate.jsScript;
        const sectionData = this.buildSectionContext(sec);
        bodySectionsList.push({
          id: sec.id || secTemplate.id,
          name: sec.title || secTemplate.name,
          category: 'body',
          html: this.contentHydration.hydrate(activeHtml, sectionData, 'body'),
          css: activeCss,
          js: activeJs,
          sortOrder: sec.homePageSortOrder ?? sec.pageSortOrder ?? 0
        });
      }
    }

    // 4. Footer Section Unit
    const footerTemplate = this.findActiveTemplate('footer');
    const footerSection: SectionTemplateUnit | undefined = footerTemplate ? {
      id: footerTemplate.id,
      name: footerTemplate.name,
      category: 'footer',
      html: this.hydrateFooter(footerTemplate.htmlTemplate),
      css: footerTemplate.cssStyles,
      js: footerTemplate.jsScript
    } : undefined;

    // 5. Delegate full page synthesis to HtmlAssemblerService
    const pageBundle = this.htmlAssembler.assemblePageBundle({
      pageTitle: `${this.brandName} | Official Website`,
      pageSlug: 'home',
      metaDescription: this.brandInfo?.companyDescription,
      faviconUrl: this.brandInfo?.faviconUrl,
      codeInjections: this.allCodeInjectionsList,
      headerSection,
      heroSection,
      bodySections: bodySectionsList,
      footerSection
    });

    this.finalizeRender(pageBundle.combinedStyles, pageBundle.visualBodyMarkup, pageBundle.combinedScripts);
  }

  /**
   * Assembles a dedicated Content Page:
   * Menu + Breadcrumb Header + Page Sections (or Body Content) + Footer.
   */
  private composeContentPage(): void {
    if (!this.currentPage || this.currentPage.publish === false || this.currentPage.Publish === false) {
      this.composeNotFoundPage();
      return;
    }

    this.titleService.setTitle(`${this.currentPage.title || 'Page'} | ${this.brandName}`);

    // 1. Navigation Header Section Unit
    const menuTemplate = this.findActiveTemplate('menu');
    const headerSection: SectionTemplateUnit | undefined = menuTemplate ? {
      id: menuTemplate.id,
      name: menuTemplate.name,
      category: 'menu',
      html: this.hydrateMenu(menuTemplate.htmlTemplate, this.currentSlug),
      css: menuTemplate.cssStyles,
      js: menuTemplate.jsScript
    } : undefined;

    // 2. Breadcrumb Header Section Unit
    const rawSections: any[] = this.currentPage.pageSections || [];
    const heroSection = rawSections.find(
      (sec: any) => (sec.templateKey || '').toLowerCase() === 'hero_corporatesplit' || sec.pageSortOrder === 1
    );

    const breadcrumbTemplate = this.findActiveTemplate('breadcrumb');
    let breadcrumbSection: SectionTemplateUnit | undefined;
    if (breadcrumbTemplate) {
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
      breadcrumbSection = {
        id: breadcrumbTemplate.id,
        name: breadcrumbTemplate.name,
        category: 'breadcrumb',
        html: this.contentHydration.hydrate(breadcrumbTemplate.htmlTemplate, breadcrumbData, 'breadcrumb'),
        css: breadcrumbTemplate.cssStyles,
        js: breadcrumbTemplate.jsScript
      };
    }

    // 3. Page Layout Sections from database
    const bodySectionsList: SectionTemplateUnit[] = [];
    const pageSections = rawSections.filter(
      (sec: any) => sec !== heroSection && (sec.templateKey || '').toLowerCase() !== 'hero_corporatesplit'
    );

    if (pageSections.length > 0) {
      for (const sec of pageSections) {
        const secTemplate = this.findTemplateForSection(sec);
        if (secTemplate) {
          const activeHtml = (sec.isCustomized && sec.htmlTemplate) ? sec.htmlTemplate : secTemplate.htmlTemplate;
          const activeCss = (sec.isCustomized && sec.cssStyles) ? sec.cssStyles : secTemplate.cssStyles;
          const activeJs = (sec.isCustomized && sec.jsScript) ? sec.jsScript : secTemplate.jsScript;
          const sectionData = this.buildSectionContext(sec);
          bodySectionsList.push({
            id: sec.id || secTemplate.id,
            name: sec.title || secTemplate.name,
            category: 'body',
            html: this.contentHydration.hydrate(activeHtml, sectionData, 'body'),
            css: activeCss,
            js: activeJs,
            sortOrder: sec.pageSortOrder ?? 0
          });
        }
      }
    } else {
      const bodyContent = this.currentPage.fullDescription || this.currentPage.description || '';
      if (bodyContent) {
        bodySectionsList.push({
          name: 'Page Content',
          category: 'body',
          html: `
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
          `
        });
      }
    }

    // 4. Footer Section Unit
    const footerTemplate = this.findActiveTemplate('footer');
    const footerSection: SectionTemplateUnit | undefined = footerTemplate ? {
      id: footerTemplate.id,
      name: footerTemplate.name,
      category: 'footer',
      html: this.hydrateFooter(footerTemplate.htmlTemplate),
      css: footerTemplate.cssStyles,
      js: footerTemplate.jsScript
    } : undefined;

    // 5. Delegate full page synthesis to HtmlAssemblerService
    const pageBundle = this.htmlAssembler.assemblePageBundle({
      pageTitle: `${this.currentPage.title || 'Page'} | ${this.brandName}`,
      pageSlug: this.currentSlug,
      metaDescription: this.currentPage.description || this.brandInfo?.companyDescription,
      faviconUrl: this.brandInfo?.faviconUrl,
      codeInjections: this.allCodeInjectionsList,
      headerSection,
      breadcrumbSection,
      bodySections: bodySectionsList,
      footerSection
    });

    this.finalizeRender(pageBundle.combinedStyles, pageBundle.visualBodyMarkup, pageBundle.combinedScripts);
  }

  /**
   * Assembles the Blog Archive Page:
   * Menu + Breadcrumb Header + Blog Grid + Footer.
   */
  private composeBlogArchive(): void {
    this.titleService.setTitle(`Blog | ${this.brandName}`);

    // 1. Navigation Header Section Unit
    const menuTemplate = this.findActiveTemplate('menu');
    const headerSection: SectionTemplateUnit | undefined = menuTemplate ? {
      id: menuTemplate.id,
      name: menuTemplate.name,
      category: 'menu',
      html: this.hydrateMenu(menuTemplate.htmlTemplate, 'blog'),
      css: menuTemplate.cssStyles,
      js: menuTemplate.jsScript
    } : undefined;

    // 2. Breadcrumb Header Section Unit
    const breadcrumbTemplate = this.findActiveTemplate('breadcrumb');
    let breadcrumbSection: SectionTemplateUnit | undefined;
    if (breadcrumbTemplate) {
      const breadcrumbData = {
        title: 'Blog',
        miniTitle: 'PUBLICATIONS',
        description: '',
        backgroundImageUrl: '',
        breadcrumbTrail: [
          { label: 'Home', url: '/', isActive: false },
          { label: 'Blog', url: '#', isActive: true }
        ]
      };
      breadcrumbSection = {
        id: breadcrumbTemplate.id,
        name: breadcrumbTemplate.name,
        category: 'breadcrumb',
        html: this.contentHydration.hydrate(breadcrumbTemplate.htmlTemplate, breadcrumbData, 'breadcrumb'),
        css: breadcrumbTemplate.cssStyles,
        js: breadcrumbTemplate.jsScript
      };
    }

    // 3. Blog Grid Body Section Unit
    const bodySectionsList: SectionTemplateUnit[] = [];
    const blogTemplate = this.findActiveTemplate('blog') || this.findActiveTemplate('body');
    if (blogTemplate) {
      const articlesList = this.blogs.map(b => ({
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
        title: 'Blog Articles',
        Title: 'Blog Articles',
        miniTitle: '',
        MiniTitle: '',
        description: '',
        Description: '',
        articles: articlesList,
        Articles: articlesList
      };

      bodySectionsList.push({
        id: blogTemplate.id,
        name: blogTemplate.name || 'Blog Grid',
        category: 'body',
        html: this.contentHydration.hydrate(blogTemplate.htmlTemplate, blogContext, 'blog'),
        css: blogTemplate.cssStyles,
        js: blogTemplate.jsScript,
        sortOrder: 1
      });
    }

    // 4. Footer Section Unit
    const footerTemplate = this.findActiveTemplate('footer');
    const footerSection: SectionTemplateUnit | undefined = footerTemplate ? {
      id: footerTemplate.id,
      name: footerTemplate.name,
      category: 'footer',
      html: this.hydrateFooter(footerTemplate.htmlTemplate),
      css: footerTemplate.cssStyles,
      js: footerTemplate.jsScript
    } : undefined;

    // 5. Delegate full page synthesis to HtmlAssemblerService
    const pageBundle = this.htmlAssembler.assemblePageBundle({
      pageTitle: `Blog | ${this.brandName}`,
      pageSlug: 'blog',
      metaDescription: this.brandInfo?.companyDescription,
      faviconUrl: this.brandInfo?.faviconUrl,
      codeInjections: this.allCodeInjectionsList,
      headerSection,
      breadcrumbSection,
      bodySections: bodySectionsList,
      footerSection
    });

    this.finalizeRender(pageBundle.combinedStyles, pageBundle.visualBodyMarkup, pageBundle.combinedScripts);
  }

  /**
   * Assembles a single Blog Article Reader view:
   * Menu + Breadcrumb Header + Article Details + Newsletter + Footer.
   */
  private composeBlogDetail(): void {
    if (!this.currentArticle) {
      this.composeNotFoundPage();
      return;
    }

    this.titleService.setTitle(`${this.currentArticle.title || 'Blog'} | ${this.brandName}`);

    // 1. Navigation Header Section Unit
    const menuTemplate = this.findActiveTemplate('menu');
    const headerSection: SectionTemplateUnit | undefined = menuTemplate ? {
      id: menuTemplate.id,
      name: menuTemplate.name,
      category: 'menu',
      html: this.hydrateMenu(menuTemplate.htmlTemplate, 'blog'),
      css: menuTemplate.cssStyles,
      js: menuTemplate.jsScript
    } : undefined;

    // 2. Breadcrumb Header Section Unit
    const breadcrumbTemplate = this.findActiveTemplate('breadcrumb');
    let breadcrumbSection: SectionTemplateUnit | undefined;
    if (breadcrumbTemplate) {
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
      breadcrumbSection = {
        id: breadcrumbTemplate.id,
        name: breadcrumbTemplate.name,
        category: 'breadcrumb',
        html: this.contentHydration.hydrate(breadcrumbTemplate.htmlTemplate, breadcrumbData, 'breadcrumb'),
        css: breadcrumbTemplate.cssStyles,
        js: breadcrumbTemplate.jsScript
      };
    }

    // 3. Article Reader Body Section Units
    const bodySectionsList: SectionTemplateUnit[] = [];
    bodySectionsList.push({
      name: 'Article Detail',
      category: 'body',
      html: `
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
      `,
      sortOrder: 1
    });

    // 4. Newsletter Section (matching Demo Preview sequence)
    const newsletterTemplate = this.activeTemplates.find(t => (t.templateKey || '').toLowerCase() === 'news_minimalbar') ||
                               this.activeTemplates.find(t => (t.variantCode || '').toLowerCase() === 'news_minimalbar');
    if (newsletterTemplate) {
      const newsContext = {
        title: 'Subscribe to Executive Insights',
        miniTitle: 'NEWSLETTER',
        description: 'Receive weekly briefings, technology advisories, and organization updates directly in your inbox.'
      };
      bodySectionsList.push({
        id: newsletterTemplate.id,
        name: newsletterTemplate.name || 'Newsletter',
        category: 'body',
        html: this.contentHydration.hydrate(newsletterTemplate.htmlTemplate, newsContext, 'body'),
        css: newsletterTemplate.cssStyles,
        js: newsletterTemplate.jsScript,
        sortOrder: 2
      });
    }

    // 5. Footer Section Unit
    const footerTemplate = this.findActiveTemplate('footer');
    const footerSection: SectionTemplateUnit | undefined = footerTemplate ? {
      id: footerTemplate.id,
      name: footerTemplate.name,
      category: 'footer',
      html: this.hydrateFooter(footerTemplate.htmlTemplate),
      css: footerTemplate.cssStyles,
      js: footerTemplate.jsScript
    } : undefined;

    // 6. Synthesize Unified Page Bundle via HtmlAssemblerService
    const pageBundle = this.htmlAssembler.assemblePageBundle({
      pageTitle: `${this.currentArticle.title || 'Blog'} | ${this.brandName}`,
      pageSlug: 'blog',
      metaDescription: this.currentArticle.description || this.brandInfo?.companyDescription,
      faviconUrl: this.brandInfo?.faviconUrl,
      codeInjections: this.allCodeInjectionsList,
      headerSection,
      breadcrumbSection,
      bodySections: bodySectionsList,
      footerSection
    });

    this.finalizeRender(pageBundle.combinedStyles, pageBundle.visualBodyMarkup, pageBundle.combinedScripts);
  }

  /**
   * Fallback 404 handler for missing pages.
   */
  private composeNotFoundPage(): void {
    this.titleService.setTitle(`Page Not Found | ${this.brandName}`);
    const menuTemplate = this.findActiveTemplate('menu');
    const headerSection: SectionTemplateUnit | undefined = menuTemplate ? {
      id: menuTemplate.id,
      name: menuTemplate.name,
      category: 'menu',
      html: this.hydrateMenu(menuTemplate.htmlTemplate, ''),
      css: menuTemplate.cssStyles,
      js: menuTemplate.jsScript
    } : undefined;

    const bodySectionsList: SectionTemplateUnit[] = [{
      name: '404 Not Found',
      category: 'body',
      html: `
        <section class="py-5 text-center bg-white my-5">
          <div class="container py-5">
            <span class="material-symbols-outlined display-1 text-primary opacity-50 mb-3">error_outline</span>
            <h1 class="display-5 fw-bold text-dark mb-3">Page Not Found</h1>
            <p class="lead text-muted mb-4">The page you requested does not exist or may have been relocated.</p>
            <a href="/" class="btn btn-primary px-4 py-2 fw-semibold">Return to Homepage</a>
          </div>
        </section>
      `,
      sortOrder: 1
    }];

    const footerTemplate = this.findActiveTemplate('footer');
    const footerSection: SectionTemplateUnit | undefined = footerTemplate ? {
      id: footerTemplate.id,
      name: footerTemplate.name,
      category: 'footer',
      html: this.hydrateFooter(footerTemplate.htmlTemplate),
      css: footerTemplate.cssStyles,
      js: footerTemplate.jsScript
    } : undefined;

    const pageBundle = this.htmlAssembler.assemblePageBundle({
      pageTitle: `Page Not Found | ${this.brandName}`,
      pageSlug: '404',
      codeInjections: this.allCodeInjectionsList,
      headerSection,
      bodySections: bodySectionsList,
      footerSection
    });

    this.finalizeRender(pageBundle.combinedStyles, pageBundle.visualBodyMarkup, pageBundle.combinedScripts);
  }

  // ========================================================
  // HYDRATION CONTEXT HELPERS
  // ========================================================

  /**
   * Hydrates the active Navbar template with live navigation categories, child links,
   * top menu pages, CTA buttons, and active link highlights via ContentHydrationService.
   */
  private hydrateMenu(rawHtml: string, activeSlug: string): string {
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

    // Helper to normalize zone ('first' | 'middle' | 'last' | 'top')
    const normalizeZone = (val: any): string => {
      if (!val) return 'first';
      const s = String(val).toLowerCase();
      if (s.includes('mid') || s === '2') return 'middle';
      if (s.includes('last') || s === '3' || s.includes('right')) return 'last';
      if (s.includes('top') || s === '4') return 'top';
      return 'first';
    };

    // 1. Build distinct dropdown categories (only those with active child pages)
    const dropdownItems: any[] = [];
    const usedUrls = new Set<string>();

    (this.categories || [])
      .filter(c => c.publish !== false && c.Publish !== false && c.showInMenu !== false && c.ShowInMenu !== false)
      .forEach(c => {
        const catTitle = c.title || c.categoryName || c.name || c.Title || c.CategoryName || 'Menu';
        const rawWebPages = c.webPages || c.WebPages || [];
        const childPages = (rawWebPages && rawWebPages.length > 0)
          ? rawWebPages.filter((p: any) => p.publish !== false && p.Publish !== false && p.showInMenuDropDown !== false && p.ShowInMenuDropDown !== false)
          : (this.publishedPages || []).filter(p => (p.publish !== false && p.Publish !== false) && 
              (p.showInMenuDropDown !== false && p.ShowInMenuDropDown !== false) && 
              (p.pageCategoryId === c.id || p.pageCategoryId === c.Id));

        if (!childPages || childPages.length === 0) return;

        const pagesList = childPages.map((p: any) => {
          const pUrl = `/${(p.directUrl || p.slug || p.DirectUrl || p.Slug || '').replace(/^\/+/, '')}`;
          usedUrls.add(pUrl.toLowerCase());
          return {
            title: p.title || p.Title || p.pageTitle || p.PageTitle || '',
            url: pUrl,
            customClass: p.customClass || p.CustomClass || '',
            sortOrder: p.dropdownSortOrder || p.DropdownSortOrder || p.sortOrder || p.SortOrder || 0
          };
        });

        dropdownItems.push({
          title: catTitle,
          url: '#',
          isDropdown: true,
          publish: true,
          showInMainMenu: true,
          pages: pagesList,
          zone: normalizeZone(c.menuPosition ?? c.MenuPosition ?? 1),
          sortOrder: c.menuSortOrder !== undefined ? c.menuSortOrder : (c.MenuSortOrder !== undefined ? c.MenuSortOrder : (c.sortOrder || 0)),
          customClass: c.customClass || c.CustomClass || ''
        });
      });

    // 2. Build standalone menu items (excluding URLs already contained in dropdowns)
    const standaloneItems: any[] = [];
    (this.publishedPages || [])
      .filter(p => (p.publish !== false && p.Publish !== false) && 
                   (p.showInMainMenu === true || p.ShowInMainMenu === true || p.showInMenu === true || p.ShowInMenu === true) && 
                   !p.isLegal && !p.pageCategoryId && !p.isMenuCTA)
      .forEach(p => {
        const rawUrl = (p.directUrl || p.slug || p.DirectUrl || p.Slug || '').replace(/^\/+/, '');
        const pUrl = (rawUrl === '' || rawUrl.toLowerCase() === 'home') ? '/' : `/${rawUrl}`;
        const pLower = pUrl.toLowerCase();

        // Avoid duplicating if URL is already in a dropdown or already added
        if (pLower !== '/' && usedUrls.has(pLower)) return;
        if (usedUrls.has(pLower)) return;
        usedUrls.add(pLower);

        const pTitle = p.title || p.Title || p.pageTitle || p.PageTitle || '';
        standaloneItems.push({
          title: pTitle,
          url: pUrl,
          isDropdown: false,
          publish: true,
          showInMainMenu: true,
          pages: [],
          zone: normalizeZone(p.menuPosition ?? p.MenuPosition ?? 1),
          sortOrder: (p.mainMenuSortOrder !== undefined && p.mainMenuSortOrder !== 0) ? p.mainMenuSortOrder : ((p.MainMenuSortOrder !== undefined && p.MainMenuSortOrder !== 0) ? p.MainMenuSortOrder : (p.sortOrder !== undefined ? p.sortOrder : (p.SortOrder !== undefined ? p.SortOrder : 0))),
          customClass: p.customClass || p.CustomClass || ''
        });
      });

    // Combine into navigationMenu list
    const navigationMenu = [...standaloneItems, ...dropdownItems].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

    // 3. TopBar Utility Pages
    const topBarPages = (this.publishedPages || [])
      .filter(p => (p.publish !== false && p.Publish !== false) && (normalizeZone(p.menuPosition) === 'top' || p.showInMenuTopBar === true || p.showInTopBar === true))
      .sort((a, b) => (a.topBarSortOrder || a.TopBarSortOrder || a.sortOrder || 0) - (b.topBarSortOrder || b.TopBarSortOrder || b.sortOrder || 0))
      .map(p => ({
        title: p.title || p.Title || '',
        url: `/${(p.directUrl || p.slug || '').replace(/^\/+/, '')}`,
        customClass: p.customClass || ''
      }));

    // 4. CTA Buttons: Live CTA pages or fallback to standard CTA buttons
    const liveCtaButtons = (this.publishedPages || [])
      .filter(p => p.isMenuCTA && p.publish !== false)
      .map(p => ({
        title: p.title || p.Title || '',
        url: `/${(p.directUrl || p.slug || '').replace(/^\/+/, '')}`,
        buttonClass: p.buttonClass || 'oz-btn-primary',
        customClass: p.customClass || ''
      }));

    const menuCtaButtons = liveCtaButtons.length > 0 ? liveCtaButtons : [
      {
        title: loginText,
        url: loginUrl,
        buttonClass: 'oz-btn-ghost',
        customClass: 'oz-login-cta'
      },
      {
        title: 'Get Started',
        url: '/request-service',
        buttonClass: 'oz-btn-primary',
        customClass: ''
      }
    ];

    const channels: any[] = this.brandInfo?.contactChannels || [];
    const defaultEmailChannel = channels.find((c: any) => c.channelType?.toLowerCase() === 'email' && c.isDefault) || channels.find((c: any) => c.channelType?.toLowerCase() === 'email');
    const defaultPhoneChannel = channels.find((c: any) => c.channelType?.toLowerCase() === 'phone' && c.isDefault) || channels.find((c: any) => c.channelType?.toLowerCase() === 'phone');
    const defaultAddressChannel = channels.find((c: any) => c.channelType?.toLowerCase() === 'address' && c.isDefault) || channels.find((c: any) => c.channelType?.toLowerCase() === 'address');
    const defaultHoursChannel = channels.find((c: any) => (c.channelType?.toLowerCase() === 'hours' || c.channelType?.toLowerCase() === 'workinghours') && c.isDefault) || channels.find((c: any) => c.channelType?.toLowerCase() === 'hours' || c.channelType?.toLowerCase() === 'workinghours');
    const socialLinks = channels.filter((c: any) => c.channelType?.toLowerCase() === 'socialmedia');

    const contactEmail = defaultEmailChannel?.value || this.brandInfo?.contactEmail || '';
    const contactPhone = defaultPhoneChannel?.value || this.brandInfo?.primaryPhone || '';
    const contactAddress = defaultAddressChannel?.value || this.brandInfo?.address || '';
    const workingHours = defaultHoursChannel?.value || this.brandInfo?.workingHours || '';
    const hasContactInfo = Boolean(contactEmail || contactPhone || contactAddress || channels.length > 0);
    const hasBrandLogo = Boolean(this.brandLogoUrl && this.brandLogoUrl.trim().length > 0);

    const menuContext: any = {
      navigationMenu,
      NavigationMenu: navigationMenu,
      PageCategories: navigationMenu,
      categories: navigationMenu,
      topBarPages,
      TopBarPages: topBarPages,
      menuCtaButtons,
      MenuCtaButtons: menuCtaButtons,
      cartCount: this.cartService.getItemCount(),
      BrandName: this.brandName,
      brandName: this.brandName,
      CompanyName: this.brandName,
      LogoUrl: this.brandLogoUrl,
      logoUrl: this.brandLogoUrl,
      BrandLogo: this.brandLogoUrl,
      brandLogo: this.brandLogoUrl,
      WhiteLogoUrl: this.brandLogoUrl,
      HasBrandLogo: hasBrandLogo,
      hasBrandLogo: hasBrandLogo,
      HomeUrl: '/',
      WebsiteUrl: '/',
      email: contactEmail,
      Email: contactEmail,
      phone: contactPhone,
      Phone: contactPhone,
      address: contactAddress,
      Address: contactAddress,
      workingHours: workingHours,
      WorkingHours: workingHours,
      hasContactInfo,
      HasContactInfo: hasContactInfo,
      hasTopBar: topBarPages.length > 0 || hasContactInfo || socialLinks.length > 0,
      HasTopBar: topBarPages.length > 0 || hasContactInfo || socialLinks.length > 0,
      socialLinks,
      SocialLinks: socialLinks,
      hasSocialLinks: socialLinks.length > 0,
      HasSocialLinks: socialLinks.length > 0,
      contactItems: channels,
      ContactItems: channels,
      contactChannels: channels,
      ContactChannels: channels,
      IsAuthenticated: authed,
      IsAdmin: isAdmin,
      IsMember: isMember,
      ActivateLoginInMenu: isLoginActive && isLoginInMenu,
      LoginText: loginText,
      LoginUrl: loginUrl
    };

    let html = this.contentHydration.hydrate(rawHtml, menuContext, 'menu');

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
   * and enforces the official Ozikol credit bar via ContentHydrationService.
   */
  private hydrateFooter(rawHtml: string): string {
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

    // Prepare categorized links for footer columns
    const footerCategories = (this.categories || [])
      .filter(c => c.publish !== false && c.showInFooter !== false)
      .map(c => {
        const catTitle = c.title || c.categoryName || c.name || 'Category';
        const displayTitle = c.footerDisplayTitle || catTitle;
        const childPages = (c.webPages && c.webPages.length > 0)
          ? c.webPages.filter((p: any) => p.publish !== false && p.showInFooter !== false)
          : (this.publishedPages || []).filter(p => (p.publish !== false && p.showInFooter !== false) && (p.pageCategoryId === c.id || p.pageCategory?.id === c.id || p.pageCategory?.title === catTitle));

        return {
          name: catTitle,
          title: catTitle,
          displayTitle: displayTitle,
          pages: childPages.map((p: any) => ({
            title: p.title || p.Title || '',
            url: `/${(p.directUrl || p.slug || '').replace(/^\/+/, '')}`
          }))
        };
      });

    const legalPages = (this.publishedPages || [])
      .filter(p => p.isLegal && p.publish !== false)
      .map(p => ({
        title: p.title || p.Title || '',
        url: `/${(p.directUrl || p.slug || '').replace(/^\/+/, '')}`
      }));

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

    const currentYear = new Date().getFullYear().toString();
    const footerChannels: any[] = this.brandInfo?.contactChannels || [];
    const footerEmailChannel = footerChannels.find((c: any) => c.channelType?.toLowerCase() === 'email' && c.isDefault) || footerChannels.find((c: any) => c.channelType?.toLowerCase() === 'email');
    const footerPhoneChannel = footerChannels.find((c: any) => c.channelType?.toLowerCase() === 'phone' && c.isDefault) || footerChannels.find((c: any) => c.channelType?.toLowerCase() === 'phone');
    const footerAddressChannel = footerChannels.find((c: any) => c.channelType?.toLowerCase() === 'address' && c.isDefault) || footerChannels.find((c: any) => c.channelType?.toLowerCase() === 'address');
    const footerSocialLinks = footerChannels.filter((c: any) => c.channelType?.toLowerCase() === 'socialmedia');

    const contactEmail = footerEmailChannel?.value || this.brandInfo?.contactEmail || '';
    const contactPhone = footerPhoneChannel?.value || this.brandInfo?.primaryPhone || '';
    const contactAddress = footerAddressChannel?.value || this.brandInfo?.address || '';

    // Get in Touch column strictly contains Address, Phone, Email
    const contactItems: any[] = [];
    if (contactAddress) {
      contactItems.push({
        title: 'Address',
        content: contactAddress,
        value: contactAddress,
        type: 'address',
        iconClass: 'fa-solid fa-location-dot',
        url: '#'
      });
    }
    if (contactPhone) {
      contactItems.push({
        title: 'Phone',
        content: contactPhone,
        value: contactPhone,
        type: 'phone',
        iconClass: 'fa-solid fa-phone',
        url: `tel:${contactPhone.replace(/[^0-9+]/g, '')}`
      });
    }
    if (contactEmail) {
      contactItems.push({
        title: 'Email',
        content: contactEmail,
        value: contactEmail,
        type: 'email',
        iconClass: 'fa-solid fa-envelope',
        url: `mailto:${contactEmail}`
      });
    }

    // Real published pages tagged with quicklinks for the Quick Links column
    const quickLinkPages = (this.publishedPages || [])
      .filter((p: any) => p.publish !== false && (
        (p.tags && p.tags.toLowerCase().includes('quicklink')) ||
        ['ai-agent', 'machinery', 'machineries', 'career', 'faq', 'contact', 'contact-us'].includes((p.directUrl || p.slug || '').toLowerCase().replace(/^\/+/, ''))
      ))
      .map((p: any) => ({
        title: p.title || p.Title || '',
        url: `/${(p.directUrl || p.slug || '').replace(/^\/+/, '')}`
      }));

    const footerContext: any = {
      BrandName: this.brandName,
      brandName: this.brandName,
      LogoUrl: this.brandLogoUrl,
      logoUrl: this.brandLogoUrl,
      BrandLogo: this.brandLogoUrl,
      Year: currentYear,
      year: currentYear,
      Description: this.brandInfo?.footerDescription || this.brandInfo?.companyDescription || this.brandInfo?.tagline || '',
      description: this.brandInfo?.footerDescription || this.brandInfo?.companyDescription || this.brandInfo?.tagline || '',
      FooterDescription: this.brandInfo?.footerDescription || this.brandInfo?.companyDescription || '',
      footerDescription: this.brandInfo?.footerDescription || this.brandInfo?.companyDescription || '',
      Tagline: this.brandInfo?.tagline || '',
      tagline: this.brandInfo?.tagline || '',
      Email: contactEmail,
      email: contactEmail,
      Phone: contactPhone,
      phone: contactPhone,
      Address: contactAddress,
      address: contactAddress,
      Copyright: `&copy; ${currentYear} ${this.brandName}. All rights reserved.`,
      copyright: `&copy; ${currentYear} ${this.brandName}. All rights reserved.`,
      footerCategories: footerCategories,
      categories: footerCategories,
      legalPages: legalPages,
      socialLinks: footerSocialLinks,
      SocialLinks: footerSocialLinks,
      hasSocialLinks: footerSocialLinks.length > 0,
      HasSocialLinks: footerSocialLinks.length > 0,
      hasContactInfo: contactItems.length > 0,
      HasContactInfo: contactItems.length > 0,
      contactItems: contactItems,
      ContactItems: contactItems,
      contactChannels: contactItems,
      ContactChannels: contactItems,
      taggedPages: {
        quicklinks: quickLinkPages
      },
      TaggedPages: {
        quicklinks: quickLinkPages
      },
      IsAuthenticated: authed,
      IsAdmin: isAdmin,
      IsMember: isMember,
      ActivateLoginInFooter: isLoginActive && isLoginInFooter,
      LoginText: loginText,
      LoginUrl: loginUrl
    };

    let html = this.contentHydration.hydrate(rawHtml, footerContext, 'footer');
    return this.templateHydration.enforceOzikolCredit(html);
  }

  /**
   * Builds Hero hydration data strictly from active database PageSection entity and its child lists.
   */
  private buildHeroContext(dbHeroSection?: any): any {
    const listItems = (dbHeroSection?.pageSectionLists || dbHeroSection?.items || []).map((item: any, idx: number) => ({
      id: item.id,
      title: item.title || '',
      Title: item.title || '',
      miniTitle: item.miniTitle || '',
      MiniTitle: item.miniTitle || '',
      description: item.description || '',
      Description: item.description || '',
      moreDescription: item.moreDescription || '',
      MoreDescription: item.moreDescription || '',
      icon: item.iconText || item.icon || '',
      imageUrl: item.imageUrl || dbHeroSection?.imageUrl || '',
      ImageUrl: item.imageUrl || dbHeroSection?.imageUrl || '',
      buttonText: item.buttonText || '',
      ButtonText: item.buttonText || '',
      buttonLink: item.buttonLink || '#',
      ButtonLink: item.buttonLink || '#',
      secondaryButtonText: item.secondaryButtonText || item.secondButtonText || '',
      SecondaryButtonText: item.secondaryButtonText || item.secondButtonText || '',
      secondaryButtonLink: item.secondaryButtonLink || item.secondButtonLink || '#',
      SecondaryButtonLink: item.secondaryButtonLink || item.secondButtonLink || '#',
      sortOrder: item.sortOrder || idx + 1
    }));

    // If section has no child list items, construct single slide from the parent section
    const childSlides = listItems.length > 0 ? listItems : (dbHeroSection ? [{
      title: dbHeroSection.title || this.brandName,
      Title: dbHeroSection.title || this.brandName,
      miniTitle: dbHeroSection.miniTitle || '',
      MiniTitle: dbHeroSection.miniTitle || '',
      description: dbHeroSection.description || '',
      Description: dbHeroSection.description || '',
      imageUrl: dbHeroSection.imageUrl || '',
      ImageUrl: dbHeroSection.imageUrl || '',
      buttonText: dbHeroSection.buttonText || '',
      ButtonText: dbHeroSection.buttonText || '',
      buttonLink: dbHeroSection.buttonLink || '#',
      ButtonLink: dbHeroSection.buttonLink || '#',
      secondaryButtonText: dbHeroSection.secondaryButtonText || dbHeroSection.secondButtonText || '',
      SecondaryButtonText: dbHeroSection.secondaryButtonText || dbHeroSection.secondButtonText || '',
      secondaryButtonLink: dbHeroSection.secondaryButtonLink || dbHeroSection.secondButtonLink || '#',
      SecondaryButtonLink: dbHeroSection.secondaryButtonLink || dbHeroSection.secondButtonLink || '#'
    }] : []);

    const firstSlide = childSlides[0] || {};
    return {
      title: dbHeroSection?.title || firstSlide.title || '',
      Title: dbHeroSection?.title || firstSlide.title || '',
      miniTitle: dbHeroSection?.miniTitle || firstSlide.miniTitle || '',
      MiniTitle: dbHeroSection?.miniTitle || firstSlide.miniTitle || '',
      description: dbHeroSection?.description || firstSlide.description || '',
      Description: dbHeroSection?.description || firstSlide.description || '',
      imageUrl: dbHeroSection?.imageUrl || firstSlide.imageUrl || '',
      ImageUrl: dbHeroSection?.imageUrl || firstSlide.imageUrl || '',
      buttonText: dbHeroSection?.buttonText || firstSlide.buttonText || '',
      ButtonText: dbHeroSection?.buttonText || firstSlide.buttonText || '',
      buttonLink: dbHeroSection?.buttonLink || firstSlide.buttonLink || '',
      ButtonLink: dbHeroSection?.buttonLink || firstSlide.buttonLink || '',
      secondaryButtonText: dbHeroSection?.secondaryButtonText || dbHeroSection?.secondButtonText || firstSlide.secondaryButtonText || '',
      SecondaryButtonText: dbHeroSection?.secondaryButtonText || dbHeroSection?.secondButtonText || firstSlide.secondaryButtonText || '',
      secondaryButtonLink: dbHeroSection?.secondaryButtonLink || dbHeroSection?.secondButtonLink || firstSlide.secondaryButtonLink || '',
      SecondaryButtonLink: dbHeroSection?.secondaryButtonLink || dbHeroSection?.secondButtonLink || firstSlide.secondaryButtonLink || '',
      items: childSlides,
      pageSectionLists: childSlides,
      slides: childSlides,
      PageSectionLists: childSlides
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
    return this.activeTemplates.find(t => (t.categoryKey || t.category || '').toLowerCase() === category.toLowerCase());
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

      // 2. Smart alias mapping between seeded template keys and installed theme keys
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
          );
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

    // 3. Complete loading and trigger Change Detection so Angular renders [innerHTML] into the DOM
    this.loading = false;
    this.cdr.detectChanges();

    // 4. Inject Full 3-Zone Architecture (Head tags, Body Open tags, Footer scripts, Section scripts)
    // after Angular has mounted the elements into the DOM tree
    setTimeout(() => {
      this.injectCodeTags(combinedJs);
    }, 50);
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
