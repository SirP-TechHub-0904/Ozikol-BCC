import { Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ApiService } from './api.service';
import { CartService } from './cart.service';
import { HtmlAssemblerService, SectionTemplateUnit, PageAssemblyBundle, CodeInjectionTag } from '../../pages/admin/content/templates/services/html-assembler.service';
import { ContentHydrationService } from '../../pages/admin/content/templates/services/content-hydration.service';
import { TemplateHydrationService } from '../../pages/admin/content/templates/services/template-hydration.service';

/**
 * Options for assembling an external public page with the official Landing Page shell.
 */
export interface PublicShellOptions {
  pageTitle: string;
  pageSlug?: string;
  breadcrumb?: {
    title: string;
    parentTitle?: string;
    parentUrl?: string;
    backgroundImageUrl?: string;
  };
  bodySections: SectionTemplateUnit[];
}

/**
 * Shared Public Page Shell Service.
 * Provides the official Landing Page layout (Navbar + Breadcrumb + Injected Body + Footer)
 * for all external public feature pages with 100% token and visual parity.
 */
@Injectable({
  providedIn: 'root'
})
export class PublicPageShellService {
  private brandInfo: any = null;
  private brandName = 'Organization Workspace';
  private brandLogoUrl = '';
  private activeTemplates: any[] = [];
  private categories: any[] = [];
  private publishedPages: any[] = [];
  private codeInjections: CodeInjectionTag[] = [];
  private isLoaded = false;

  constructor(
    private apiService: ApiService,
    private cartService: CartService,
    private htmlAssembler: HtmlAssemblerService,
    private contentHydration: ContentHydrationService,
    private templateHydration: TemplateHydrationService,
    private titleService: Title
  ) {}

  /**
   * Loads and caches website theme metadata, categories, pages, and templates.
   */
  async loadSiteThemeData(forceRefresh = false): Promise<void> {
    if (this.isLoaded && !forceRefresh) return;

    await Promise.all([
      this.fetchBrandSettings(),
      this.fetchActiveTemplates(),
      this.fetchCategories(),
      this.fetchPublishedPages(),
      this.fetchCodeInjections()
    ]);

    this.isLoaded = true;
  }

  /**
   * Assembles a complete public page wrapped in the official Landing Page shell.
   */
  assemblePageWithBody(options: PublicShellOptions): PageAssemblyBundle {
    this.ensurePublicWebsiteMode();

    const menuTemplate = this.findActiveTemplate('menu');
    const headerSection: SectionTemplateUnit | undefined = menuTemplate ? {
      id: menuTemplate.id,
      name: menuTemplate.name,
      category: 'menu',
      html: this.hydrateMenu(menuTemplate.htmlTemplate, options.pageSlug || ''),
      css: menuTemplate.cssStyles,
      js: menuTemplate.jsScript
    } : undefined;

    let breadcrumbSection: SectionTemplateUnit | undefined;
    if (options.breadcrumb) {
      const bcTemplate = this.findActiveTemplate('breadcrumb');
      if (bcTemplate) {
        breadcrumbSection = {
          id: bcTemplate.id,
          name: bcTemplate.name,
          category: 'breadcrumb',
          html: this.hydrateBreadcrumb(bcTemplate.htmlTemplate, options.breadcrumb),
          css: bcTemplate.cssStyles,
          js: bcTemplate.jsScript
        };
      }
    }

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
      pageTitle: `${options.pageTitle} | ${this.brandName}`,
      pageSlug: options.pageSlug || 'page',
      codeInjections: this.codeInjections,
      headerSection,
      breadcrumbSection,
      bodySections: options.bodySections,
      footerSection
    });

    this.applyDynamicStyles(pageBundle.combinedStyles);
    this.titleService.setTitle(`${options.pageTitle} | ${this.brandName}`);

    return pageBundle;
  }

  /**
   * Assembles the standard Not Available screen wrapped in the official Landing Page shell.
   */
  assembleNotAvailable(customTitle = 'Not Available'): PageAssemblyBundle {
    const notAvailableSection: SectionTemplateUnit = {
      name: 'Not Available',
      category: 'body',
      sortOrder: 1,
      html: `
        <section class="oz-not-available-section">
          <div class="oz-not-available-box">
            <div class="oz-na-badge">404</div>
            <h1 class="oz-na-title">Not Available</h1>
            <div class="oz-na-actions">
              <a href="/" class="oz-na-btn">Return to Home</a>
            </div>
          </div>
        </section>
      `,
      css: `
        .oz-not-available-section {
          min-height: 420px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 80px 24px;
          background: #ffffff;
          width: 100%;
          box-sizing: border-box;
        }
        .oz-not-available-box {
          max-width: 440px;
          width: 100%;
          margin: 0 auto;
          text-align: center;
        }
        .oz-na-badge {
          display: inline-block;
          padding: 4px 14px;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: #dc2626;
          background: rgba(220, 38, 38, 0.08);
          border-radius: 9999px;
          margin-bottom: 16px;
        }
        .oz-na-title {
          font-size: 32px;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 24px 0;
          letter-spacing: -0.02em;
        }
        .oz-na-actions {
          display: flex;
          justify-content: center;
        }
        .oz-na-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 24px;
          border-radius: 8px;
          background: #0050e5;
          color: #ffffff !important;
          font-size: 14px;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.2s ease;
        }
        .oz-na-btn:hover {
          background: #003db3;
          transform: translateY(-1px);
        }
      `
    };

    return this.assemblePageWithBody({
      pageTitle: customTitle,
      pageSlug: '404',
      bodySections: [notAvailableSection]
    });
  }

  /**
   * Cleans up dynamic styles and unlocks viewport when leaving public pages.
   */
  destroyPublicShell(): void {
    if (typeof document !== 'undefined') {
      document.body.classList.remove('public-website-mode');
      document.getElementById('tenant-dynamic-theme-styles')?.remove();
    }
  }

  // =========================================================================
  // INTERNAL LANDING PAGE SHELL ENGINE (1-to-1 Parity with LandingComponent)
  // =========================================================================

  private ensurePublicWebsiteMode(): void {
    if (typeof document !== 'undefined') {
      document.body.classList.add('public-website-mode');
    }
  }

  private applyDynamicStyles(css: string): void {
    if (typeof document === 'undefined') return;
    let styleTag = document.getElementById('tenant-dynamic-theme-styles') as HTMLStyleElement;
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'tenant-dynamic-theme-styles';
      document.head.appendChild(styleTag);
    }
    styleTag.textContent = (css || '').replace(/<\/?style[^>]*>/gi, '').trim();
  }

  private findActiveTemplate(category: string): any {
    const cat = (category || '').toLowerCase();
    return this.activeTemplates.find(t =>
      (t.category || t.categoryKey || '').toLowerCase() === cat && (t.isActive !== false)
    );
  }

  private fetchBrandSettings(): Promise<void> {
    return new Promise((resolve) => {
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
          }
          this.apiService.get('SettingsApi/brand').subscribe({
            next: (brandRes: any) => {
              if (brandRes?.data) {
                const bData = brandRes.data;
                this.brandInfo = { ...this.brandInfo, ...bData };
                if (bData.companyName) this.brandName = bData.companyName;
                if (bData.companyLogoUrl) this.brandLogoUrl = bData.companyLogoUrl;
              }
              resolve();
            },
            error: () => resolve()
          });
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

  private fetchCategories(): Promise<void> {
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
          const list: CodeInjectionTag[] = [];
          if (res?.data) {
            const data = res.data;
            (data.head || []).forEach((t: any) => list.push({ ...t, zone: 'head', isActive: t.isActive !== false }));
            (data.bodyOpen || []).forEach((t: any) => list.push({ ...t, zone: 'body_open', isActive: t.isActive !== false }));
            (data.footer || []).forEach((t: any) => list.push({ ...t, zone: 'footer', isActive: t.isActive !== false }));
          }
          this.codeInjections = list;
          resolve();
        },
        error: () => resolve()
      });
    });
  }

  /**
   * Hydrates the active Navbar template (Exact parity with LandingComponent).
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

    const normalizeZone = (val: any): string => {
      if (!val) return 'first';
      const s = String(val).toLowerCase();
      if (s.includes('mid') || s === '2') return 'middle';
      if (s.includes('last') || s === '3' || s.includes('right')) return 'last';
      if (s.includes('top') || s === '4') return 'top';
      return 'first';
    };

    const navigationMenu: any[] = [];
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

        navigationMenu.push({
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

    (this.publishedPages || [])
      .filter(p => p.publish !== false && p.Publish !== false && (p.showInMainMenu || p.ShowInMainMenu))
      .forEach(p => {
        const pUrl = `/${(p.directUrl || p.slug || p.DirectUrl || p.Slug || '').replace(/^\/+/, '')}`;
        if (usedUrls.has(pUrl.toLowerCase())) return;

        navigationMenu.push({
          title: p.title || p.Title || '',
          url: pUrl,
          isDropdown: false,
          publish: true,
          showInMainMenu: true,
          pages: [],
          zone: normalizeZone(p.menuPosition ?? p.MenuPosition ?? 1),
          sortOrder: p.sortOrder || p.SortOrder || 0,
          customClass: p.customClass || p.CustomClass || ''
        });
      });

    const topBarPages = (this.publishedPages || [])
      .filter(p => p.publish !== false && (p.showInTopBar || p.ShowInTopBar))
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
      .map(p => ({
        title: p.title || p.Title || '',
        url: `/${(p.directUrl || p.slug || '').replace(/^\/+/, '')}`,
        customClass: p.customClass || ''
      }));

    const menuCtaButtons = (this.publishedPages || [])
      .filter(p => (p.isMenuCTA || p.IsMenuCTA || p.isCtaButton || p.IsCtaButton) && p.publish !== false && p.Publish !== false)
      .sort((a, b) => (a.sortOrder || a.SortOrder || 0) - (b.sortOrder || b.SortOrder || 0))
      .map(p => {
        const isAuthDirect = (p.directUrl || p.slug || '').toLowerCase().includes('login') || (p.title || '').toLowerCase().includes('sign in');
        const ctaTitle = isAuthDirect && authed ? (isAdmin ? 'Admin Console' : 'Member Portal') : (p.menuCtaText || p.MenuCtaText || p.ctaButtonText || p.title || p.Title || 'Get Started');
        const ctaUrl = isAuthDirect && authed ? (isAdmin ? '/dashboard/console' : '/dashboard/workspace') : (p.menuCtaUrl || p.MenuCtaUrl || p.ctaButtonUrl || `/${(p.directUrl || p.slug || '').replace(/^\/+/, '')}`);
        const ctaStyle = p.menuCtaStyle || p.MenuCtaStyle || p.buttonClass || (isAuthDirect ? 'oz-btn-ghost' : 'oz-btn-primary');
        return {
          title: ctaTitle,
          Title: ctaTitle,
          text: ctaTitle,
          Text: ctaTitle,
          url: ctaUrl,
          Url: ctaUrl,
          buttonClass: ctaStyle,
          ButtonClass: ctaStyle,
          style: ctaStyle,
          customClass: ctaStyle
        };
      });

    const channels: any[] = this.brandInfo?.contactChannels || [];
    const emailCh = channels.find((c: any) => c.channelType?.toLowerCase() === 'email' && c.isDefault) || channels.find((c: any) => c.channelType?.toLowerCase() === 'email');
    const phoneCh = channels.find((c: any) => c.channelType?.toLowerCase() === 'phone' && c.isDefault) || channels.find((c: any) => c.channelType?.toLowerCase() === 'phone');
    const addrCh = channels.find((c: any) => c.channelType?.toLowerCase() === 'address' && c.isDefault) || channels.find((c: any) => c.channelType?.toLowerCase() === 'address');
    const socialLinks = channels.filter((c: any) => c.channelType?.toLowerCase() === 'socialmedia');

    const contactEmail = emailCh?.value || this.brandInfo?.contactEmail || '';
    const contactPhone = phoneCh?.value || this.brandInfo?.primaryPhone || '';
    const contactAddress = addrCh?.value || this.brandInfo?.address || '';
    const workingHours = this.brandInfo?.workingHours || '';
    const hasContactInfo = Boolean(contactEmail || contactPhone || contactAddress);
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
      isAuthenticated: authed,
      IsAdmin: isAdmin,
      isAdmin: isAdmin,
      IsMember: isMember,
      isMember: isMember,
      ActivateLoginInMenu: isLoginActive && isLoginInMenu,
      activateLoginInMenu: isLoginActive && isLoginInMenu,
      LoginText: loginText,
      loginText: loginText,
      LoginUrl: loginUrl,
      loginUrl: loginUrl,
      homeUrl: '/',
      websiteUrl: '/'
    };

    let html = this.contentHydration.hydrate(rawHtml, menuContext, 'menu');
    if (activeSlug) {
      const activeNormalized = activeSlug === 'home' ? '/' : `/${activeSlug}`;
      const regex = new RegExp(`(<a\\s+[^>]*href=["']${activeNormalized}["'][^>]*class=["'][^"']*)(["'])`, 'gi');
      html = html.replace(regex, '$1 active fw-bold$2');
    }
    return html;
  }

  /**
   * Hydrates Breadcrumb section.
   */
  private hydrateBreadcrumb(rawHtml: string, bc: { title: string, parentTitle?: string, parentUrl?: string, backgroundImageUrl?: string }): string {
    const trails = [
      { label: 'Home', url: '/', isActive: false }
    ];
    if (bc.parentTitle) {
      trails.push({ label: bc.parentTitle, url: bc.parentUrl || '#', isActive: false });
    }
    trails.push({ label: bc.title, url: '#', isActive: true });

    const context: any = {
      title: bc.title,
      Title: bc.title,
      pageTitle: bc.title,
      backgroundImageUrl: bc.backgroundImageUrl || '',
      imageUrl: bc.backgroundImageUrl || '',
      breadcrumbTrail: trails,
      breadcrumbs: trails
    };

    return this.contentHydration.hydrate(rawHtml, context, 'breadcrumb');
  }

  /**
   * Hydrates the active Footer template (Exact 1-to-1 parity with LandingComponent).
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

    const footerBottomPages = (this.publishedPages || [])
      .filter(p => (p.showInFooterBottom || p.ShowInFooterBottom || p.isLegal || p.IsLegal) && p.publish !== false && p.Publish !== false)
      .sort((a, b) => (a.footerBottomSortOrder || a.FooterBottomSortOrder || a.sortOrder || a.SortOrder || 0) - (b.footerBottomSortOrder || b.FooterBottomSortOrder || b.sortOrder || b.SortOrder || 0))
      .map(p => {
        const isAuthDirect = (p.directUrl || p.slug || '').toLowerCase().includes('login') || (p.title || '').toLowerCase().includes('sign in');
        const itemTitle = isAuthDirect && authed ? (isAdmin ? 'Admin Console' : 'Member Portal') : (p.title || p.Title || '');
        const itemUrl = isAuthDirect && authed ? (isAdmin ? '/dashboard/console' : '/dashboard/workspace') : `/${(p.directUrl || p.slug || '').replace(/^\/+/, '')}`;
        return {
          title: itemTitle,
          url: itemUrl,
          customClass: p.customClass || p.CustomClass || ''
        };
      });

    const legalPages = footerBottomPages;
    const currentYear = new Date().getFullYear().toString();
    const footerChannels: any[] = this.brandInfo?.contactChannels || [];
    const footerEmailChannel = footerChannels.find((c: any) => c.channelType?.toLowerCase() === 'email' && c.isDefault) || footerChannels.find((c: any) => c.channelType?.toLowerCase() === 'email');
    const footerPhoneChannel = footerChannels.find((c: any) => c.channelType?.toLowerCase() === 'phone' && c.isDefault) || footerChannels.find((c: any) => c.channelType?.toLowerCase() === 'phone');
    const footerAddressChannel = footerChannels.find((c: any) => c.channelType?.toLowerCase() === 'address' && c.isDefault) || footerChannels.find((c: any) => c.channelType?.toLowerCase() === 'address');
    const footerSocialLinks = footerChannels.filter((c: any) => c.channelType?.toLowerCase() === 'socialmedia');

    const contactEmail = footerEmailChannel?.value || this.brandInfo?.contactEmail || '';
    const contactPhone = footerPhoneChannel?.value || this.brandInfo?.primaryPhone || '';
    const contactAddress = footerAddressChannel?.value || this.brandInfo?.address || '';

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

    // Exact parity: strictly tags "quicklink" + specific system slugs
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
      LegalPages: legalPages,
      footerBottomPages: footerBottomPages,
      FooterBottomPages: footerBottomPages,
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
}

