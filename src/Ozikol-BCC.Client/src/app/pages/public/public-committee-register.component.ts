import { Component, OnInit, OnDestroy, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DomSanitizer, SafeHtml, Title } from '@angular/platform-browser';
import { CommitteesService } from '../../core/services/committees.service';
import { ApiService } from '../../core/services/api.service';
import { TemplateHydrationService } from '../admin/content/templates/services/template-hydration.service';
import { ContentHydrationService } from '../admin/content/templates/services/content-hydration.service';
import { HtmlAssemblerService, SectionTemplateUnit, CodeInjectionTag } from '../admin/content/templates/services/html-assembler.service';

/**
 * Public Committee & Sub-Group Registration Portal
 * Routes: /join-committee, /join-committee/:tenantSlug, /join-committee/:tenantSlug/:groupSlug
 * Compiles the entire page using the canonical CMS Section Assembler (HtmlAssemblerService):
 * - Navbar (live menu template hydrated via ContentHydrationService)
 * - Breadcrumb Banner (live breadcrumb template hydrated via ContentHydrationService)
 * - Body Section (Committee Registration Card or Standard 404 Signal Lost Section)
 * - Footer (live footer template hydrated with enforced Ozikol compliance)
 * - Scoped CSS and 3-zone script injection
 */
@Component({
  selector: 'app-public-committee-register',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="public-dynamic-site-wrapper">
      <!-- Loading State -->
      <div *ngIf="loading" class="pub-site-loader">
        <div class="loader-inner">
          <span class="material-symbols-outlined spin">progress_activity</span>
          <p>Loading portal...</p>
        </div>
      </div>

      <!-- CMS Section Assembler Output: Complete Assembled Document (Menu + Breadcrumb + Body + Footer) -->
      <main *ngIf="!loading" class="dynamic-rendered-content" [innerHTML]="safeRenderedHtml"></main>
    </div>
  `,
  styles: [`
    .public-dynamic-site-wrapper {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      width: 100%;
      background: #f8fafc;
    }
    .pub-site-loader {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 60vh;
      width: 100%;
    }
    .loader-inner {
      text-align: center;
      color: #64748b;
    }
    .loader-inner .material-symbols-outlined {
      font-size: 36px;
      color: #0050e5;
    }
    .loader-inner p {
      margin-top: 10px;
      font-size: 14px;
      font-weight: 600;
    }
    .spin {
      animation: pubSpin 1s linear infinite;
    }
    @keyframes pubSpin {
      100% { transform: rotate(360deg); }
    }
  `]
})
export class PublicCommitteeRegisterComponent implements OnInit, OnDestroy {
  tenantSlug = '';
  groupSlug = '';
  inviteToken = '';

  loading = true;
  isNotFound = false;
  directoryMode = true;

  brand: any = null;
  brandInfo: any = null;
  brandName = '';
  brandLogoUrl = '';

  aliases: any = {
    aliasSingular: 'Committee',
    aliasPlural: 'Committees',
    subGroupAliasSingular: 'Sub-Group',
    subGroupAliasPlural: 'Sub-Groups'
  };
  signedInMember: any = null;
  openCommittees: any[] = [];
  activeCommittee: any = null;

  safeRenderedHtml: SafeHtml | null = null;
  private rawActiveTemplates: any[] = [];
  private publishedPages: any[] = [];
  private navigationCategories: any[] = [];
  private rawCodeInjections: CodeInjectionTag[] = [];

  extraAnswers: Record<string, any> = {};
  attachmentUrls: string[] = [];
  uploadingFile = false;
  submitting = false;
  formError = '';
  submittedSuccess = false;
  submissionStatus = '';
  submissionMessage = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private committeesService: CommitteesService,
    private apiService: ApiService,
    private templateHydration: TemplateHydrationService,
    private contentHydration: ContentHydrationService,
    private htmlAssembler: HtmlAssemblerService,
    private sanitizer: DomSanitizer,
    private titleService: Title,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.tenantSlug = this.route.snapshot.paramMap.get('tenantSlug') || '';
    this.groupSlug = this.route.snapshot.paramMap.get('groupSlug') || '';
    this.inviteToken = this.route.snapshot.queryParamMap.get('token') || '';

    this.loadSiteThemeData();

    if (this.groupSlug) {
      this.directoryMode = false;
      this.loadSingleGroup();
    } else {
      this.directoryMode = true;
      this.loadDirectory();
    }
  }

  ngOnDestroy(): void {
    document.getElementById('tenant-dynamic-theme-styles')?.remove();
  }

  /**
   * Global click listener handling link navigation, form submissions, and dynamic interactive triggers
   * rendered inside the assembled document.
   */
  @HostListener('click', ['$event'])
  onGlobalClick(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    if (!target) return;

    // 1. Submit Action Handler
    const submitBtn = target.closest('button[type="submit"], .pub-submit-trigger') as HTMLElement;
    if (submitBtn) {
      e.preventDefault();
      const form = submitBtn.closest('form') as HTMLFormElement;
      if (form) {
        this.handleFormSubmit(form);
      }
      return;
    }

    // 2. Upload Action Handler
    const uploadBtn = target.closest('.pub-btn-upload') as HTMLElement;
    if (uploadBtn) {
      e.preventDefault();
      const targetId = uploadBtn.getAttribute('data-target-input');
      if (targetId) {
        const input = document.getElementById(targetId) as HTMLInputElement;
        input?.click();
      }
      return;
    }

    // 3. Reset Action Handler (Register for another)
    const resetBtn = target.closest('.pub-btn-reset-trigger') as HTMLElement;
    if (resetBtn) {
      e.preventDefault();
      this.resetRegistration();
      return;
    }

    // 4. Link Navigation Handler (SPA routing)
    const anchor = target.closest('a') as HTMLAnchorElement;
    if (anchor && !anchor.classList.contains('dropdown-toggle') && !anchor.classList.contains('oz-dropdown-toggle')) {
      const isThemeToggle = anchor.getAttribute('data-bs-toggle') !== null ||
                            anchor.getAttribute('data-toggle') !== null ||
                            anchor.hasAttribute('data-bs-target') ||
                            anchor.hasAttribute('data-target') ||
                            anchor.classList.contains('toggle-btn') ||
                            anchor.classList.contains('menu-toggle');

      const href = (anchor.getAttribute('href') || '').trim();
      if (isThemeToggle || href === '#' || href === '' || href.startsWith('javascript:')) {
        return;
      }

      if (href && !href.startsWith('http') && !href.startsWith('mailto:') && !href.startsWith('tel:') && !href.startsWith('javascript:')) {
        if (href.startsWith('#')) {
          e.preventDefault();
          const element = document.querySelector(href);
          element?.scrollIntoView({ behavior: 'smooth' });
          return;
        }

        e.preventDefault();
        document.querySelectorAll('.dropdown-menu.show').forEach(m => m.classList.remove('show'));
        this.router.navigateByUrl(href);
      }
    }
  }

  /**
   * Global change listener handling directory switcher and file uploads.
   */
  @HostListener('change', ['$event'])
  onGlobalChange(e: Event): void {
    const target = e.target as HTMLElement;
    if (!target) return;

    // File input change
    if (target instanceof HTMLInputElement && target.type === 'file') {
      const fieldName = target.getAttribute('data-field-name') || '';
      if (fieldName && target.files && target.files.length > 0) {
        this.handleFileUpload(target.files[0], fieldName);
      }
      return;
    }

    // Directory selection change
    if (target instanceof HTMLSelectElement && target.classList.contains('pub-dir-dropdown')) {
      const selectedId = target.value;
      const found = this.openCommittees.find(c => c.id === selectedId);
      if (found) {
        this.activeCommittee = found;
        this.extraAnswers = {};
        this.attachmentUrls = [];
        this.formError = '';
        this.assembleLayout(false);
      }
    }
  }

  /**
   * Loads live website templates, navigation categories, published pages, and code injections.
   */
  private loadSiteThemeData(): void {
    Promise.all([
      this.fetchBrandSettings(),
      this.fetchActiveTemplates(),
      this.fetchPublishedPages(),
      this.fetchCategories(),
      this.fetchCodeInjections()
    ]).then(() => {
      this.assembleLayout(this.isNotFound);
    });
  }

  private fetchBrandSettings(): Promise<void> {
    return new Promise((resolve) => {
      this.apiService.get('WebsiteContentApi/ui-settings').subscribe({
        next: (uiRes: any) => {
          if (uiRes?.data) {
            const data = uiRes.data;
            this.brandInfo = data;
            this.brandName = data.brandName || data.companyName || data.siteTitle || '';
            this.brandLogoUrl = data.logoUrl || data.companyLogoUrl || data.whiteLogoUrl || '';
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
          this.rawActiveTemplates = res?.data || [];
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

  private fetchCategories(): Promise<void> {
    return new Promise((resolve) => {
      this.apiService.get('WebsiteContentApi/categories').subscribe({
        next: (res: any) => {
          this.navigationCategories = res?.data || [];
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
          const list: CodeInjectionTag[] = [];
          if (res?.data) {
            const data = res.data;
            (data.head || []).forEach((t: any) => list.push({ ...t, zone: 'head', isActive: t.isActive !== false }));
            (data.bodyOpen || []).forEach((t: any) => list.push({ ...t, zone: 'body_open', isActive: t.isActive !== false }));
            (data.footer || []).forEach((t: any) => list.push({ ...t, zone: 'footer', isActive: t.isActive !== false }));
          }
          this.rawCodeInjections = list;
          resolve();
        },
        error: () => resolve()
      });
    });
  }

  /**
   * Invokes the Section Assembler to assemble the full document:
   * Navbar + Breadcrumb + Injected Body + Footer.
   */
  private assembleLayout(is404: boolean): void {
    if (!this.rawActiveTemplates || this.rawActiveTemplates.length === 0) return;

    const brandDisplay = this.brandName || this.brand?.brandName || 'Organization Workspace';
    const committeeDisplay = this.activeCommittee?.name || 'Registration';

    // 1. Navbar Section Unit
    const menuTpl = this.rawActiveTemplates.find((t: any) => (t.category || t.categoryKey || '').toLowerCase() === 'menu');
    const headerSection: SectionTemplateUnit | undefined = menuTpl?.htmlTemplate ? {
      id: menuTpl.id,
      name: menuTpl.name,
      category: 'menu',
      html: this.hydrateMenu(menuTpl.htmlTemplate),
      css: menuTpl.cssStyles,
      js: menuTpl.jsScript
    } : undefined;

    // 2. Breadcrumb Section Unit (omitted when 404)
    let breadcrumbSection: SectionTemplateUnit | undefined;
    const breadcrumbTpl = this.rawActiveTemplates.find((t: any) => (t.category || t.categoryKey || '').toLowerCase() === 'breadcrumb');
    if (!is404 && breadcrumbTpl?.htmlTemplate) {
      const breadcrumbContext = this.buildBreadcrumbContext();
      breadcrumbSection = {
        id: breadcrumbTpl.id,
        name: breadcrumbTpl.name,
        category: 'breadcrumb',
        html: this.contentHydration.hydrate(breadcrumbTpl.htmlTemplate, breadcrumbContext, 'breadcrumb'),
        css: breadcrumbTpl.cssStyles,
        js: breadcrumbTpl.jsScript
      };
    }

    // 3. Body Section Unit (404 Signal Lost OR Registration Form Card)
    const bodySection: SectionTemplateUnit = {
      name: is404 ? '404 Not Found' : 'Committee Registration Body',
      category: 'body',
      html: is404 ? this.render404SignalLostHtml() : this.renderRegistrationCardHtml(),
      css: this.getBodyStyles(),
      sortOrder: 1
    };

    // 4. Footer Section Unit
    const footerTpl = this.rawActiveTemplates.find((t: any) => (t.category || t.categoryKey || '').toLowerCase() === 'footer');
    const footerSection: SectionTemplateUnit | undefined = footerTpl?.htmlTemplate ? {
      id: footerTpl.id,
      name: footerTpl.name,
      category: 'footer',
      html: this.hydrateFooter(footerTpl.htmlTemplate),
      css: footerTpl.cssStyles,
      js: footerTpl.jsScript
    } : undefined;

    // 5. Assemble unified page bundle via HtmlAssemblerService
    const pageBundle = this.htmlAssembler.assemblePageBundle({
      pageTitle: is404 ? `Page Not Found | ${brandDisplay}` : `${committeeDisplay} | ${brandDisplay}`,
      pageSlug: is404 ? '404' : 'join-committee',
      metaDescription: is404 ? 'Page Not Found' : (this.activeCommittee?.description || this.brandInfo?.companyDescription),
      faviconUrl: this.brandInfo?.faviconUrl,
      codeInjections: this.rawCodeInjections,
      headerSection,
      breadcrumbSection,
      bodySections: [bodySection],
      footerSection
    });

    // 6. Inject Scoped CSS into document head
    let styleTag = document.getElementById('tenant-dynamic-theme-styles') as HTMLStyleElement;
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'tenant-dynamic-theme-styles';
      document.head.appendChild(styleTag);
    }
    const cleanStyles = (pageBundle.combinedStyles || '').replace(/<\/?style[^>]*>/gi, '').trim();
    styleTag.textContent = cleanStyles;

    this.safeRenderedHtml = this.sanitizer.bypassSecurityTrustHtml(pageBundle.visualBodyMarkup);
    this.titleService.setTitle(is404 ? `Page Not Found | ${brandDisplay}` : `${committeeDisplay} | ${brandDisplay}`);
    this.cdr.detectChanges();
  }

  /**
   * Assembles the live Navbar using real database navigation tokens.
   */
  private hydrateMenu(rawHtml: string): string {
    const authed = !!this.signedInMember || !!localStorage.getItem('token') || !!sessionStorage.getItem('token');
    const isAdmin = authed && (localStorage.getItem('user_role')?.includes('Admin') || this.signedInMember?.role === 'Admin');

    const loginText = !authed 
      ? (this.brandInfo?.loginButtonText || 'Sign In') 
      : (isAdmin ? 'Console' : 'My Workspace');
    const loginUrl = !authed 
      ? '/login' 
      : (isAdmin ? '/billing/features' : '/committees/workspace/my');

    const normalizeZone = (val: any): string => {
      if (!val) return 'first';
      const s = String(val).toLowerCase();
      if (s.includes('mid') || s === '2') return 'middle';
      if (s.includes('last') || s === '3' || s.includes('right')) return 'last';
      if (s.includes('top') || s === '4') return 'top';
      return 'first';
    };

    const dropdownItems: any[] = [];
    const usedUrls = new Set<string>();

    (this.navigationCategories || [])
      .filter((c: any) => c.publish !== false && c.Publish !== false && c.showInMenu !== false && c.ShowInMenu !== false)
      .forEach((c: any) => {
        const catTitle = c.title || c.categoryName || c.name || c.Title || c.CategoryName || 'Menu';
        const rawWebPages = c.webPages || c.WebPages || [];
        const childPages = (rawWebPages && rawWebPages.length > 0)
          ? rawWebPages.filter((p: any) => p.publish !== false && p.Publish !== false && p.showInMenuDropDown !== false && p.ShowInMenuDropDown !== false)
          : (this.publishedPages || []).filter((p: any) => (p.publish !== false && p.Publish !== false) && 
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

    const standaloneItems: any[] = [];
    (this.publishedPages || [])
      .filter((p: any) => (p.publish !== false && p.Publish !== false) && 
                   (p.showInMainMenu === true || p.ShowInMainMenu === true || p.showInMenu === true || p.ShowInMenu === true) && 
                   !p.isLegal && !p.pageCategoryId && !p.isMenuCTA)
      .forEach((p: any) => {
        const rawUrl = (p.directUrl || p.slug || p.DirectUrl || p.Slug || '').replace(/^\/+/, '');
        const pUrl = (rawUrl === '' || rawUrl.toLowerCase() === 'home') ? '/' : `/${rawUrl}`;
        const pLower = pUrl.toLowerCase();

        if (pLower !== '/' && usedUrls.has(pLower)) return;
        if (usedUrls.has(pLower)) return;
        usedUrls.add(pLower);

        standaloneItems.push({
          title: p.title || p.Title || p.pageTitle || p.PageTitle || '',
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

    const navigationMenu = [...standaloneItems, ...dropdownItems].sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

    const topBarPages = (this.publishedPages || [])
      .filter((p: any) => (p.publish !== false && p.Publish !== false) && (normalizeZone(p.menuPosition) === 'top' || p.showInMenuTopBar === true || p.showInTopBar === true))
      .sort((a: any, b: any) => (a.topBarSortOrder || a.TopBarSortOrder || a.sortOrder || 0) - (b.topBarSortOrder || b.TopBarSortOrder || b.sortOrder || 0))
      .map((p: any) => ({
        title: p.title || p.Title || '',
        url: `/${(p.directUrl || p.slug || '').replace(/^\/+/, '')}`,
        customClass: p.customClass || ''
      }));

    const menuCtaButtons = (this.publishedPages || [])
      .filter((p: any) => (p.isMenuCTA || p.IsMenuCTA) && p.publish !== false && p.Publish !== false)
      .sort((a: any, b: any) => (a.sortOrder || a.SortOrder || 0) - (b.sortOrder || b.SortOrder || 0))
      .map((p: any) => {
        const isAuthDirect = (p.directUrl || p.slug || '').toLowerCase().includes('login') || (p.title || '').toLowerCase().includes('sign in');
        const ctaTitle = isAuthDirect && authed ? (isAdmin ? 'Admin Console' : 'Member Portal') : (p.menuCtaText || p.MenuCtaText || p.title || p.Title || '');
        const ctaUrl = isAuthDirect && authed ? (isAdmin ? '/billing/features' : '/committees/workspace/my') : (p.menuCtaUrl || p.MenuCtaUrl || `/${(p.directUrl || p.slug || '').replace(/^\/+/, '')}`);
        const ctaStyle = p.menuCtaStyle || p.MenuCtaStyle || p.buttonClass || (isAuthDirect ? 'oz-btn-ghost' : 'oz-btn-primary');
        return {
          title: ctaTitle,
          url: ctaUrl,
          buttonClass: ctaStyle.startsWith('oz-btn-') ? ctaStyle : `oz-btn-${ctaStyle}`,
          customClass: p.customClass || p.CustomClass || (isAuthDirect ? 'oz-login-cta' : '')
        };
      });

    const channels: any[] = this.brandInfo?.contactChannels || [];
    const defaultEmail = channels.find((c: any) => c.channelType?.toLowerCase() === 'email' && c.isDefault) || channels.find((c: any) => c.channelType?.toLowerCase() === 'email');
    const defaultPhone = channels.find((c: any) => c.channelType?.toLowerCase() === 'phone' && c.isDefault) || channels.find((c: any) => c.channelType?.toLowerCase() === 'phone');
    const defaultAddress = channels.find((c: any) => c.channelType?.toLowerCase() === 'address' && c.isDefault) || channels.find((c: any) => c.channelType?.toLowerCase() === 'address');
    const defaultHours = channels.find((c: any) => (c.channelType?.toLowerCase() === 'hours' || c.channelType?.toLowerCase() === 'workinghours') && c.isDefault) || channels.find((c: any) => c.channelType?.toLowerCase() === 'hours' || c.channelType?.toLowerCase() === 'workinghours');
    const socialLinks = channels.filter((c: any) => c.channelType?.toLowerCase() === 'socialmedia');

    const contactEmail = defaultEmail?.value || this.brandInfo?.contactEmail || '';
    const contactPhone = defaultPhone?.value || this.brandInfo?.primaryPhone || '';
    const contactAddress = defaultAddress?.value || this.brandInfo?.address || '';
    const workingHours = defaultHours?.value || this.brandInfo?.workingHours || '';
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
      cartCount: 0,
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
      socialLinks: socialLinks,
      SocialLinks: socialLinks,
      hasContactInfo: hasContactInfo,
      HasContactInfo: hasContactInfo,
      activateLogin: this.brandInfo?.activateLogin !== false,
      ActivateLogin: this.brandInfo?.activateLogin !== false,
      activateLoginInMenu: this.brandInfo?.activateLoginInMenu !== false,
      ActivateLoginInMenu: this.brandInfo?.activateLoginInMenu !== false,
      loginText: loginText,
      LoginText: loginText,
      loginUrl: loginUrl,
      LoginUrl: loginUrl,
      isUserAuthenticated: authed,
      IsAuthenticated: authed,
      isUserAdmin: isAdmin,
      IsAdmin: isAdmin
    };

    return this.contentHydration.hydrate(rawHtml, menuContext, 'menu');
  }

  /**
   * Assembles the live Footer using real database navigation tokens.
   */
  private hydrateFooter(rawHtml: string): string {
    const authed = !!this.signedInMember || !!localStorage.getItem('token') || !!sessionStorage.getItem('token');
    const isAdmin = authed && (localStorage.getItem('user_role')?.includes('Admin') || this.signedInMember?.role === 'Admin');

    const loginText = !authed 
      ? (this.brandInfo?.loginButtonText || 'Sign In') 
      : (isAdmin ? 'Console' : 'My Workspace');
    const loginUrl = !authed 
      ? '/login' 
      : (isAdmin ? '/billing/features' : '/committees/workspace/my');

    const footerCategories = (this.navigationCategories || [])
      .filter((c: any) => c.publish !== false && c.showInFooter !== false)
      .map((c: any) => {
        const catTitle = c.title || c.categoryName || c.name || 'Category';
        const displayTitle = c.footerDisplayTitle || catTitle;
        const childPages = (c.webPages && c.webPages.length > 0)
          ? c.webPages.filter((p: any) => p.publish !== false && p.showInFooter !== false)
          : (this.publishedPages || []).filter((p: any) => (p.publish !== false && p.showInFooter !== false) && (p.pageCategoryId === c.id || p.pageCategory?.id === c.id || p.pageCategory?.title === catTitle));

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
      .filter((p: any) => (p.showInFooterBottom || p.ShowInFooterBottom || p.isLegal || p.IsLegal) && p.publish !== false && p.Publish !== false)
      .sort((a: any, b: any) => (a.footerBottomSortOrder || a.FooterBottomSortOrder || a.sortOrder || a.SortOrder || 0) - (b.footerBottomSortOrder || b.FooterBottomSortOrder || b.sortOrder || b.SortOrder || 0))
      .map((p: any) => {
        const isAuthDirect = (p.directUrl || p.slug || '').toLowerCase().includes('login') || (p.title || '').toLowerCase().includes('sign in');
        const itemTitle = isAuthDirect && authed ? (isAdmin ? 'Admin Console' : 'Member Portal') : (p.title || p.Title || '');
        const itemUrl = isAuthDirect && authed ? (isAdmin ? '/billing/features' : '/committees/workspace/my') : `/${(p.directUrl || p.slug || '').replace(/^\/+/, '')}`;
        return {
          title: itemTitle,
          url: itemUrl,
          customClass: p.customClass || p.CustomClass || ''
        };
      });

    const currentYear = new Date().getFullYear().toString();
    const footerChannels: any[] = this.brandInfo?.contactChannels || [];
    const footerEmail = footerChannels.find((c: any) => c.channelType?.toLowerCase() === 'email' && c.isDefault) || footerChannels.find((c: any) => c.channelType?.toLowerCase() === 'email');
    const footerPhone = footerChannels.find((c: any) => c.channelType?.toLowerCase() === 'phone' && c.isDefault) || footerChannels.find((c: any) => c.channelType?.toLowerCase() === 'phone');
    const footerAddress = footerChannels.find((c: any) => c.channelType?.toLowerCase() === 'address' && c.isDefault) || footerChannels.find((c: any) => c.channelType?.toLowerCase() === 'address');
    const footerSocialLinks = footerChannels.filter((c: any) => c.channelType?.toLowerCase() === 'socialmedia');

    const contactEmail = footerEmail?.value || this.brandInfo?.contactEmail || '';
    const contactPhone = footerPhone?.value || this.brandInfo?.primaryPhone || '';
    const contactAddress = footerAddress?.value || this.brandInfo?.address || '';

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

    const quickLinkPages = (this.publishedPages || [])
      .filter((p: any) => p.publish !== false && (
        (p.tags && p.tags.toLowerCase().includes('quicklink')) ||
        p.showInFooter === true ||
        p.ShowInFooter === true
      ))
      .slice(0, 8)
      .map((p: any) => ({
        title: p.title || p.Title || '',
        url: `/${(p.directUrl || p.slug || '').replace(/^\/+/, '')}`
      }));

    const footerContext: any = {
      brandName: this.brandName,
      BrandName: this.brandName,
      companyName: this.brandName,
      CompanyName: this.brandName,
      logoUrl: this.brandLogoUrl,
      LogoUrl: this.brandLogoUrl,
      BrandLogo: this.brandLogoUrl,
      brandLogo: this.brandLogoUrl,
      WhiteLogoUrl: this.brandLogoUrl,
      hasBrandLogo: Boolean(this.brandLogoUrl && this.brandLogoUrl.trim().length > 0),
      HasBrandLogo: Boolean(this.brandLogoUrl && this.brandLogoUrl.trim().length > 0),
      footerCategories: footerCategories,
      FooterCategories: footerCategories,
      categories: footerCategories,
      Categories: footerCategories,
      footerBottomPages: footerBottomPages,
      FooterBottomPages: footerBottomPages,
      legalPages: footerBottomPages,
      LegalPages: footerBottomPages,
      quickLinks: quickLinkPages,
      QuickLinks: quickLinkPages,
      contactItems: contactItems,
      ContactItems: contactItems,
      socialLinks: footerSocialLinks,
      SocialLinks: footerSocialLinks,
      channels: footerChannels,
      Channels: footerChannels,
      address: contactAddress,
      Address: contactAddress,
      phone: contactPhone,
      Phone: contactPhone,
      email: contactEmail,
      Email: contactEmail,
      year: currentYear,
      Year: currentYear,
      currentYear: currentYear,
      CurrentYear: currentYear,
      companyDescription: this.brandInfo?.companyDescription || '',
      CompanyDescription: this.brandInfo?.companyDescription || '',
      activateLogin: this.brandInfo?.activateLogin !== false,
      ActivateLogin: this.brandInfo?.activateLogin !== false,
      activateLoginInFooter: this.brandInfo?.activateLoginInFooter !== false,
      ActivateLoginInFooter: this.brandInfo?.activateLoginInFooter !== false,
      loginText: loginText,
      LoginText: loginText,
      loginUrl: loginUrl,
      LoginUrl: loginUrl,
      isUserAuthenticated: authed,
      IsAuthenticated: authed,
      isUserAdmin: isAdmin,
      IsAdmin: isAdmin
    };

    const hydrated = this.contentHydration.hydrate(rawHtml, footerContext, 'footer');
    return this.templateHydration.enforceOzikolCredit(hydrated);
  }

  private buildBreadcrumbContext(): any {
    const committeeName = this.activeCommittee?.name || 'Registration';
    const parentName = this.activeCommittee?.parentCommitteeName;
    const trails = [
      { label: 'Home', url: '/', isActive: false },
      { label: this.aliases.aliasPlural, url: '/join-committee', isActive: false }
    ];
    if (parentName) {
      trails.push({ label: parentName, url: '#', isActive: false });
    }
    trails.push({ label: committeeName, url: '#', isActive: true });

    const effectiveBg = this.activeCommittee?.coverBannerUrl || this.activeCommittee?.imageUrl || '';

    return {
      title: committeeName,
      Title: committeeName,
      pageTitle: committeeName,
      miniTitle: this.activeCommittee?.parentCommitteeId ? this.aliases.subGroupAliasSingular : this.aliases.aliasSingular,
      description: this.activeCommittee?.description || this.activeCommittee?.missionStatement || 'Complete the registration form to enroll.',
      backgroundImageUrl: effectiveBg,
      imageUrl: effectiveBg,
      breadcrumbTrail: trails,
      breadcrumbs: trails
    };
  }

  /**
   * Renders the canonical 404 Signal Lost Section.
   */
  private render404SignalLostHtml(): string {
    return `
      <section class="oz-404-section">
        <div class="oz-404-wrapper">
          <div class="oz-404-badge">
            <span class="oz-404-badge-dot"></span>
            <span class="oz-404-badge-text">ERROR 404 &bull; SIGNAL LOST</span>
          </div>

          <div class="oz-404-graphic">
            <svg viewBox="0 0 500 340" fill="none" xmlns="http://www.w3.org/2000/svg" class="oz-404-svg" aria-label="Page Not Found Illustration">
              <defs>
                <linearGradient id="ozGlobeGrad" x1="130" y1="100" x2="290" y2="260" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stop-color="#38bdf8"/>
                  <stop offset="50%" stop-color="#2563eb"/>
                  <stop offset="100%" stop-color="#1e40af"/>
                </linearGradient>
                <radialGradient id="ozGlobeHalo" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.35"/>
                  <stop offset="100%" stop-color="#38bdf8" stop-opacity="0"/>
                </radialGradient>
                <linearGradient id="ozVisorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#38bdf8"/>
                  <stop offset="100%" stop-color="#0284c7"/>
                </linearGradient>
                <linearGradient id="ozSuitGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stop-color="#ffffff"/>
                  <stop offset="100%" stop-color="#e2e8f0"/>
                </linearGradient>
              </defs>

              <g class="oz-stars-group">
                <polygon points="70,60 72,66 78,68 72,70 70,76 68,70 62,68 68,66" fill="#38bdf8" class="oz-star oz-anim-star-1"/>
                <polygon points="430,75 432,79 436,80 432,81 430,85 428,81 424,80 428,79" fill="#818cf8" class="oz-star oz-anim-star-2"/>
                <polygon points="100,240 101,244 105,245 101,246 100,250 99,246 95,245 99,244" fill="#60a5fa" class="oz-star oz-anim-star-3"/>
                <circle cx="55" cy="160" r="2.5" fill="#cbd5e1" class="oz-star oz-anim-star-2"/>
                <circle cx="445" cy="190" r="3" fill="#38bdf8" class="oz-star oz-anim-star-1"/>
                <circle cx="150" cy="50" r="2" fill="#94a3b8" class="oz-star oz-anim-star-3"/>
                <circle cx="365" cy="270" r="2.5" fill="#60a5fa" class="oz-star oz-anim-star-2"/>
                <circle cx="270" cy="45" r="2" fill="#38bdf8" class="oz-star oz-anim-star-1"/>
              </g>

              <circle cx="210" cy="175" r="115" fill="url(#ozGlobeHalo)" class="oz-anim-pulse"/>
              <circle cx="210" cy="175" r="110" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="5 7" opacity="0.4" class="oz-anim-radar-1" fill="none"/>
              <circle cx="210" cy="175" r="135" stroke="#60a5fa" stroke-width="1" stroke-dasharray="3 5" opacity="0.25" class="oz-anim-radar-2" fill="none"/>
              <circle cx="210" cy="175" r="82" fill="url(#ozGlobeGrad)"/>
              <ellipse cx="210" cy="175" rx="82" ry="28" stroke="#bae6fd" stroke-width="1.5" stroke-opacity="0.55" fill="none"/>
              <ellipse cx="210" cy="175" rx="82" ry="58" stroke="#bae6fd" stroke-width="1.5" stroke-opacity="0.55" fill="none"/>
              <ellipse cx="210" cy="175" rx="40" ry="82" stroke="#bae6fd" stroke-width="1.5" stroke-opacity="0.55" fill="none"/>
              <line x1="210" y1="93" x2="210" y2="257" stroke="#bae6fd" stroke-width="1.5" stroke-opacity="0.55"/>

              <g transform="rotate(-18 210 175)">
                <ellipse cx="210" cy="175" rx="120" ry="42" stroke="#38bdf8" stroke-width="1.75" stroke-dasharray="6 6" fill="none" opacity="0.6"/>
                <g transform="translate(328, 175)">
                  <circle cx="0" cy="0" r="5" fill="#38bdf8"/>
                  <circle cx="0" cy="0" r="8" stroke="#38bdf8" stroke-width="1.5" opacity="0.5" class="oz-anim-pulse"/>
                </g>
              </g>

              <g class="oz-anim-man">
                <rect x="300" y="112" width="28" height="64" rx="8" fill="#64748b"/>
                <rect x="302" y="118" width="10" height="18" rx="3" fill="#94a3b8"/>
                <path d="M312 128 C298 138 298 162 312 172" stroke="#38bdf8" stroke-width="3" fill="none" stroke-linecap="round"/>

                <rect x="318" y="122" width="48" height="62" rx="16" fill="url(#ozSuitGrad)" stroke="#cbd5e1" stroke-width="2"/>
                <rect x="330" y="136" width="24" height="18" rx="4" fill="#0f172a"/>
                <circle cx="336" cy="145" r="2" fill="#ef4444"/>
                <circle cx="342" cy="145" r="2" fill="#10b981"/>
                <circle cx="348" cy="145" r="2" fill="#38bdf8"/>

                <path d="M318 135 L288 146 L274 140" stroke="#f1f5f9" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
                <rect x="260" y="130" width="16" height="22" rx="4" fill="#1e293b" transform="rotate(-12 260 130)"/>
                <rect x="263" y="133" width="11" height="13" rx="2" fill="#38bdf8" transform="rotate(-12 260 130)"/>
                <path d="M251 134 C247 137 247 143 251 146" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" fill="none" class="oz-anim-pulse"/>

                <rect x="332" y="176" width="16" height="42" rx="8" fill="url(#ozSuitGrad)" stroke="#cbd5e1" stroke-width="2"/>
                <rect x="328" y="212" width="22" height="12" rx="4" fill="#334155"/>
                <rect x="350" y="176" width="16" height="40" rx="8" fill="url(#ozSuitGrad)" stroke="#cbd5e1" stroke-width="2" transform="rotate(-10 350 176)"/>
                <rect x="352" y="210" width="22" height="12" rx="4" fill="#334155" transform="rotate(-10 352 210)"/>

                <circle cx="342" cy="100" r="26" fill="url(#ozSuitGrad)" stroke="#cbd5e1" stroke-width="2"/>
                <rect x="324" y="88" width="36" height="22" rx="10" fill="url(#ozVisorGrad)" stroke="#0284c7" stroke-width="1.5"/>
                <ellipse cx="334" cy="94" rx="6" ry="3" fill="#ffffff" opacity="0.6"/>
              </g>
            </svg>
          </div>

          <h1 class="oz-404-title">Coordinates Uncharted</h1>
          <p class="oz-404-description">The page or module you are attempting to access does not exist, is not installed, or has been relocated within the workspace grid.</p>

          <div class="oz-404-actions">
            <a href="/" class="oz-404-btn oz-404-btn-primary">
              <span class="material-symbols-outlined">home</span>
              <span>Return to Home</span>
            </a>
            <a href="javascript:history.back()" class="oz-404-btn oz-404-btn-secondary">
              <span class="material-symbols-outlined">arrow_back</span>
              <span>Go Back</span>
            </a>
          </div>

          <div class="oz-404-footer-hint">
            <span>Need navigation assistance?</span>
            <a href="/contact" class="oz-404-link">Contact Support &rarr;</a>
          </div>
        </div>
      </section>
    `;
  }

  /**
   * Renders the dynamic Committee Registration Body card.
   */
  private renderRegistrationCardHtml(): string {
    if (this.submittedSuccess) {
      return `
        <div class="pub-main-centered-wrap">
          <div class="pub-card-state success">
            <div class="pub-success-icon-wrap">
              <span class="material-symbols-outlined">verified</span>
            </div>
            <h2>${this.submissionStatus === 'Approved' ? 'You Are Enrolled!' : 'Application Submitted'}</h2>
            <p>${this.submissionMessage}</p>
            <div class="pub-success-actions">
              ${this.signedInMember ? `<a href="/committees/workspace/my" class="pub-btn-primary">Open My ${this.aliases.aliasPlural}</a>` : ''}
              ${!this.signedInMember && this.directoryMode ? `<button type="button" class="pub-btn-secondary pub-btn-reset-trigger">Register for Another ${this.aliases.aliasSingular}</button>` : ''}
              ${!this.signedInMember && !this.directoryMode ? `<a href="/" class="pub-btn-secondary">Return to Website</a>` : ''}
            </div>
          </div>
        </div>
      `;
    }

    if (!this.activeCommittee) {
      return this.render404SignalLostHtml();
    }

    const c = this.activeCommittee;
    const isSubGroup = !!c.parentCommitteeId;
    const catBadge = isSubGroup ? this.aliases.subGroupAliasSingular : this.aliases.aliasSingular;

    // Dropdown selector if multiple committees exist in directory
    let dirSelectorHtml = '';
    if (this.directoryMode && this.openCommittees.length > 1) {
      const optionsHtml = this.openCommittees.map(item => `
        <option value="${item.id}" ${item.id === c.id ? 'selected' : ''}>
          ${item.name} (${item.parentCommitteeName ? 'Under ' + item.parentCommitteeName : (item.categoryTag || this.aliases.aliasSingular)})
        </option>
      `).join('');

      dirSelectorHtml = `
        <div class="pub-dir-select-bar">
          <label>Select ${this.aliases.aliasSingular} / ${this.aliases.subGroupAliasSingular} to Join:</label>
          <select class="pub-dir-dropdown">
            ${optionsHtml}
          </select>
        </div>
      `;
    }

    // Extra-Info Form Fields
    let extraFieldsHtml = '';
    const fields: any[] = c.extraInfoForm?.fields || [];
    if (fields.length > 0) {
      const fieldsMarkup = fields.map(f => {
        const reqStar = f.isRequired ? '<span class="req">*</span>' : '';
        const reqAttr = f.isRequired ? 'required' : '';
        let inputMarkup = '';

        if (f.fieldType === 'textarea') {
          inputMarkup = `<textarea name="${f.fieldName}" rows="3" placeholder="${f.placeholder || 'e.g. Provide details here'}" ${reqAttr}>${this.extraAnswers[f.fieldName] || ''}</textarea>`;
        } else if (f.fieldType === 'number') {
          inputMarkup = `<input type="number" name="${f.fieldName}" value="${this.extraAnswers[f.fieldName] || ''}" placeholder="e.g. 0" ${reqAttr} />`;
        } else if (f.fieldType === 'date') {
          inputMarkup = `<input type="date" name="${f.fieldName}" value="${this.extraAnswers[f.fieldName] || ''}" ${reqAttr} />`;
        } else if (f.fieldType === 'select') {
          const opts = (f.options || []).map((o: string) => `<option value="${o}" ${this.extraAnswers[f.fieldName] === o ? 'selected' : ''}>${o}</option>`).join('');
          inputMarkup = `
            <select name="${f.fieldName}" ${reqAttr}>
              <option value="">-- Select an option --</option>
              ${opts}
            </select>
          `;
        } else if (f.fieldType === 'file') {
          inputMarkup = `
            <div class="pub-file-wrap">
              <input type="file" id="file-${f.fieldName}" data-field-name="${f.fieldName}" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp" style="display: none;" />
              <button type="button" class="pub-btn-upload" data-target-input="file-${f.fieldName}">
                <span class="material-symbols-outlined">upload_file</span>
                <span>${this.extraAnswers[f.fieldName] ? 'Replace Attached File' : (f.placeholder || 'Upload Document (PDF, Word, Image)')}</span>
              </button>
              ${this.extraAnswers[f.fieldName] ? `<div class="pub-uploaded-preview"><span class="material-symbols-outlined">attachment</span><a href="${this.extraAnswers[f.fieldName]}" target="_blank" rel="noopener">View Uploaded Document</a></div>` : ''}
            </div>
          `;
        } else {
          inputMarkup = `<input type="text" name="${f.fieldName}" value="${this.extraAnswers[f.fieldName] || ''}" placeholder="${f.placeholder || 'e.g. Your response'}" ${reqAttr} />`;
        }

        return `
          <div class="pub-field">
            <label>${f.label} ${reqStar}</label>
            ${inputMarkup}
            ${f.helpText ? `<small class="pub-hint">${f.helpText}</small>` : ''}
          </div>
        `;
      }).join('');

      extraFieldsHtml = `
        <div class="pub-extra-form-section">
          <div class="pub-section-divider">
            <h4>${c.extraInfoForm.title || 'Supplemental Information'}</h4>
            ${c.extraInfoForm.description ? `<p>${c.extraInfoForm.description}</p>` : ''}
          </div>
          ${fieldsMarkup}
        </div>
      `;
    }

    const errorAlertHtml = this.formError ? `
      <div class="pub-alert error">
        <span class="material-symbols-outlined">error</span>
        <span>${this.formError}</span>
      </div>
    ` : '';

    return `
      <div class="pub-main-centered-wrap">
        <div class="pub-card-form">
          ${dirSelectorHtml}

          <div class="pub-card-header">
            <div class="pub-badge-schedule-row">
              <span class="pub-category-badge">${catBadge}</span>
              ${c.meetingSchedule ? `<span class="pub-schedule-badge"><span class="material-symbols-outlined">event_repeat</span><span>${c.meetingSchedule}</span></span>` : ''}
            </div>
            <h1 class="pub-form-title">${c.name}</h1>
            <p class="pub-form-desc">${c.description || c.missionStatement || 'Complete the registration form below to join.'}</p>
          </div>

          ${errorAlertHtml}

          <form class="pub-form-body">
            <div class="pub-form-row two-cols">
              <div class="pub-field">
                <label>First Name <span class="req">*</span></label>
                <input type="text" name="firstName" placeholder="e.g. First Name" required autocomplete="given-name" />
              </div>
              <div class="pub-field">
                <label>Last Name <span class="req">*</span></label>
                <input type="text" name="lastName" placeholder="e.g. Last Name" required autocomplete="family-name" />
              </div>
            </div>

            <div class="pub-form-row two-cols">
              <div class="pub-field">
                <label>Email Address <span class="req">*</span></label>
                <input type="email" name="email" placeholder="name@company.com" required autocomplete="email" />
              </div>
              <div class="pub-field">
                <label>Phone Number</label>
                <input type="tel" name="phoneNumber" placeholder="e.g. +0 (000) 000-0000" autocomplete="tel" />
              </div>
            </div>

            ${extraFieldsHtml}

            <div class="pub-form-actions">
              <button type="submit" class="pub-btn-primary pub-submit-trigger" ${this.submitting ? 'disabled' : ''}>
                <span class="material-symbols-outlined">${this.submitting ? 'progress_activity' : 'how_to_reg'}</span>
                <span>${this.submitting ? 'Submitting Registration...' : ('Complete ' + this.aliases.aliasSingular + ' Registration')}</span>
              </button>
            </div>

            <div class="pub-form-footer">
              <span>Already a member of this workspace?</span>
              <a href="/login">Sign in to your member portal</a>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  /**
   * Scoped CSS styles for the dynamic body section.
   */
  private getBodyStyles(): string {
    return `
      .pub-main-centered-wrap {
        max-width: 680px;
        width: 100%;
        margin: 40px auto 60px auto;
        padding: 0 20px;
        box-sizing: border-box;
      }
      .pub-card-form {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 16px;
        padding: 36px 32px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);
      }
      .pub-dir-select-bar {
        margin-bottom: 24px;
        padding-bottom: 20px;
        border-bottom: 1px dashed #e2e8f0;
      }
      .pub-dir-select-bar label {
        display: block;
        font-size: 13px;
        font-weight: 700;
        color: #475569;
        margin-bottom: 8px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .pub-dir-dropdown {
        width: 100%;
        padding: 10px 14px;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        font-size: 15px;
        background: #ffffff;
        color: #0f172a;
        outline: none;
      }
      .pub-card-header {
        margin-bottom: 28px;
      }
      .pub-badge-schedule-row {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 12px;
        flex-wrap: wrap;
      }
      .pub-category-badge {
        display: inline-block;
        font-size: 11px;
        font-weight: 800;
        color: #0050e5;
        background: rgba(0, 80, 229, 0.08);
        padding: 4px 10px;
        border-radius: 6px;
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }
      .pub-schedule-badge {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-size: 12px;
        font-weight: 600;
        color: #475569;
        background: #f1f5f9;
        padding: 4px 10px;
        border-radius: 6px;
      }
      .pub-schedule-badge .material-symbols-outlined {
        font-size: 15px;
        color: #0050e5;
      }
      .pub-form-title {
        font-size: 26px;
        font-weight: 800;
        color: #0f172a;
        margin: 0 0 8px 0;
        line-height: 1.25;
      }
      .pub-form-desc {
        font-size: 14px;
        color: #64748b;
        margin: 0;
        line-height: 1.6;
      }
      .pub-alert.error {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 16px;
        background: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 8px;
        color: #991b1b;
        font-size: 13px;
        margin-bottom: 20px;
      }
      .pub-form-body {
        display: flex;
        flex-direction: column;
        gap: 18px;
      }
      .pub-form-row.two-cols {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }
      @media (max-width: 600px) {
        .pub-form-row.two-cols {
          grid-template-columns: 1fr;
        }
      }
      .pub-field {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .pub-field label {
        font-size: 13px;
        font-weight: 700;
        color: #334155;
      }
      .pub-field label .req {
        color: #ef4444;
        margin-left: 2px;
      }
      .pub-field input[type="text"],
      .pub-field input[type="email"],
      .pub-field input[type="tel"],
      .pub-field input[type="number"],
      .pub-field input[type="date"],
      .pub-field select,
      .pub-field textarea {
        padding: 11px 14px;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        font-size: 14px;
        color: #0f172a;
        background: #ffffff;
        outline: none;
        box-sizing: border-box;
        width: 100%;
      }
      .pub-field input:focus,
      .pub-field select:focus,
      .pub-field textarea:focus {
        border-color: #0050e5;
        box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.12);
      }
      .pub-extra-form-section {
        margin-top: 10px;
        padding-top: 20px;
        border-top: 1px solid #e2e8f0;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .pub-section-divider h4 {
        font-size: 16px;
        font-weight: 700;
        color: #0f172a;
        margin: 0 0 4px 0;
      }
      .pub-section-divider p {
        font-size: 13px;
        color: #64748b;
        margin: 0;
      }
      .pub-btn-upload {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 10px 16px;
        border: 1px dashed #cbd5e1;
        background: #f8fafc;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        color: #475569;
        cursor: pointer;
      }
      .pub-btn-upload:hover {
        background: #f1f5f9;
        border-color: #0050e5;
        color: #0050e5;
      }
      .pub-uploaded-preview {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        color: #0050e5;
        margin-top: 4px;
      }
      .pub-uploaded-preview a {
        color: #0050e5;
        font-weight: 600;
        text-decoration: underline;
      }
      .pub-hint {
        font-size: 12px;
        color: #94a3b8;
      }
      .pub-form-actions {
        margin-top: 14px;
      }
      .pub-btn-primary {
        width: 100%;
        padding: 13px 24px;
        background: #0050e5;
        color: #ffffff !important;
        border: none;
        border-radius: 10px;
        font-size: 15px;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 80, 229, 0.25);
      }
      .pub-btn-primary:hover:not(:disabled) {
        background: #003ebd;
        transform: translateY(-1px);
        box-shadow: 0 6px 16px rgba(0, 80, 229, 0.35);
      }
      .pub-form-footer {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        font-size: 13px;
        color: #64748b;
        margin-top: 14px;
        text-align: center;
      }
      .pub-form-footer a {
        color: #0050e5;
        font-weight: 700;
        text-decoration: none;
      }
      .pub-card-state {
        text-align: center;
        padding: 60px 20px;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 16px;
      }
      .pub-card-state.success {
        padding: 48px 24px;
      }
      .pub-success-icon-wrap {
        width: 64px;
        height: 64px;
        border-radius: 50%;
        background: #dcfce7;
        color: #16a34a;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 18px auto;
      }
      .pub-success-icon-wrap .material-symbols-outlined {
        font-size: 36px;
      }
      .pub-card-state h2 {
        font-size: 22px;
        font-weight: 800;
        color: #0f172a;
        margin: 0 0 10px 0;
      }
      .pub-card-state p {
        font-size: 15px;
        color: #64748b;
        margin: 0 auto 24px auto;
        max-width: 460px;
        line-height: 1.6;
      }
      .pub-success-actions {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        flex-wrap: wrap;
      }
      .pub-btn-secondary {
        padding: 11px 20px;
        background: #ffffff;
        color: #334155;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        text-decoration: none;
      }
      .pub-btn-secondary:hover {
        background: #f8fafc;
        border-color: #94a3b8;
      }

      /* Standardized 404 Signal Lost Styles */
      .oz-404-section {
        min-height: calc(80vh - 120px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 60px 24px;
        background: radial-gradient(circle at 50% 25%, rgba(56, 189, 248, 0.08) 0%, rgba(255, 255, 255, 0) 70%), #ffffff;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        color: #0f172a;
        box-sizing: border-box;
        width: 100%;
      }
      .oz-404-wrapper {
        max-width: 600px;
        width: 100%;
        margin: 0 auto;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .oz-404-badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 6px 16px;
        border-radius: 9999px;
        background: rgba(239, 68, 68, 0.08);
        border: 1px solid rgba(239, 68, 68, 0.22);
        margin-bottom: 20px;
      }
      .oz-404-badge-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background-color: #ef4444;
        box-shadow: 0 0 8px rgba(239, 68, 68, 0.6);
        animation: ozDotPulse 1.8s infinite ease-in-out;
      }
      .oz-404-badge-text {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.1em;
        color: #dc2626;
        text-transform: uppercase;
      }
      .oz-404-graphic {
        width: 100%;
        max-width: 440px;
        margin: 0 auto 24px auto;
        position: relative;
      }
      .oz-404-svg {
        width: 100%;
        height: auto;
        display: block;
        overflow: visible;
      }
      .oz-404-title {
        font-size: 32px;
        font-weight: 800;
        color: #0f172a;
        margin: 0 0 12px 0;
        line-height: 1.25;
        letter-spacing: -0.02em;
      }
      .oz-404-description {
        font-size: 16px;
        color: #64748b;
        margin: 0 0 32px 0;
        line-height: 1.6;
        max-width: 480px;
      }
      .oz-404-actions {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: center;
        gap: 14px;
        margin-bottom: 28px;
      }
      .oz-404-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 12px 26px;
        font-size: 15px;
        font-weight: 600;
        border-radius: 10px;
        text-decoration: none;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        cursor: pointer;
        box-sizing: border-box;
      }
      .oz-404-btn-primary {
        background: linear-gradient(135deg, #0050e5 0%, #003ebd 100%);
        color: #ffffff !important;
        border: 1px solid transparent;
        box-shadow: 0 4px 14px rgba(0, 80, 229, 0.3);
      }
      .oz-404-btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 22px rgba(0, 80, 229, 0.42);
        background: linear-gradient(135deg, #003ebd 0%, #002d8f 100%);
      }
      .oz-404-btn-secondary {
        background: #ffffff;
        color: #334155 !important;
        border: 1px solid #e2e8f0;
      }
      .oz-404-btn-secondary:hover {
        transform: translateY(-2px);
        background: #f8fafc;
        border-color: #cbd5e1;
        color: #0f172a !important;
      }
      .oz-404-footer-hint {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        font-size: 14px;
        color: #94a3b8;
      }
      .oz-404-link {
        color: #0050e5;
        font-weight: 600;
        text-decoration: none;
      }
      .oz-404-link:hover {
        color: #003ebd;
        text-decoration: underline;
      }
      .oz-anim-man {
        animation: ozFloat 5s ease-in-out infinite;
        transform-origin: 340px 170px;
      }
      .oz-anim-pulse {
        animation: ozPulse 3s ease-in-out infinite;
        transform-origin: 210px 175px;
      }
      .oz-anim-radar-1 {
        animation: ozRadar 3.5s ease-out infinite;
        transform-origin: 210px 175px;
      }
      .oz-anim-radar-2 {
        animation: ozRadar 3.5s ease-out infinite 1.2s;
        transform-origin: 210px 175px;
      }
      .oz-anim-star-1 {
        animation: ozTwinkle 2.5s ease-in-out infinite;
      }
      .oz-anim-star-2 {
        animation: ozTwinkle 3.2s ease-in-out infinite 0.8s;
      }
      .oz-anim-star-3 {
        animation: ozTwinkle 2.8s ease-in-out infinite 1.5s;
      }
      @keyframes ozFloat {
        0%, 100% { transform: translateY(0px) rotate(0deg); }
        50% { transform: translateY(-12px) rotate(2deg); }
      }
      @keyframes ozPulse {
        0%, 100% { transform: scale(0.96); opacity: 0.25; }
        50% { transform: scale(1.05); opacity: 0.55; }
      }
      @keyframes ozRadar {
        0% { transform: scale(0.85); opacity: 0.8; }
        100% { transform: scale(1.25); opacity: 0; }
      }
      @keyframes ozTwinkle {
        0%, 100% { opacity: 0.25; transform: scale(0.8); }
        50% { opacity: 1; transform: scale(1.2); }
      }
      @keyframes ozDotPulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.3); opacity: 0.6; }
      }
    `;
  }

  private loadDirectory(): void {
    this.loading = true;
    this.committeesService.getPublicDirectory(this.tenantSlug || undefined).subscribe({
      next: (res: any) => {
        if (res?.isSuccess && res.data) {
          this.isNotFound = false;
          this.brand = res.data.brand;
          this.aliases = { ...this.aliases, ...(res.data.aliases || {}) };
          this.signedInMember = res.data.signedInMember;
          this.openCommittees = res.data.committees || [];
          if (this.openCommittees.length > 0) {
            this.activeCommittee = this.openCommittees[0];
          } else {
            this.isNotFound = true;
          }
          this.assembleLayout(this.isNotFound);
        } else {
          this.isNotFound = true;
          this.assembleLayout(true);
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.isNotFound = true;
        this.assembleLayout(true);
      }
    });
  }

  private loadSingleGroup(): void {
    this.loading = true;
    this.committeesService
      .getPublicCommitteeBySlug(this.groupSlug, this.inviteToken || undefined, this.tenantSlug || undefined)
      .subscribe({
        next: (res: any) => {
          if (res?.isSuccess && res.data) {
            this.isNotFound = false;
            this.brand = res.data.brand;
            this.aliases = { ...this.aliases, ...(res.data.aliases || {}) };
            this.signedInMember = res.data.signedInMember;
            this.activeCommittee = res.data.committee;
            this.assembleLayout(false);
          } else {
            this.isNotFound = true;
            this.assembleLayout(true);
          }
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.isNotFound = true;
          this.assembleLayout(true);
        }
      });
  }

  private handleFormSubmit(form: HTMLFormElement): void {
    this.formError = '';
    const firstName = (form.querySelector<HTMLInputElement>('[name="firstName"]')?.value || '').trim();
    const lastName = (form.querySelector<HTMLInputElement>('[name="lastName"]')?.value || '').trim();
    const email = (form.querySelector<HTMLInputElement>('[name="email"]')?.value || '').trim();
    const phoneNumber = (form.querySelector<HTMLInputElement>('[name="phoneNumber"]')?.value || '').trim();

    if (!firstName || !lastName) {
      this.formError = 'Please enter your first and last name.';
      this.assembleLayout(false);
      return;
    }
    if (!email) {
      this.formError = 'Please enter a valid email address.';
      this.assembleLayout(false);
      return;
    }

    // Collect supplemental extra answers
    const extra: Record<string, any> = { ...this.extraAnswers };
    const inputs = form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input, textarea, select');
    inputs.forEach(inp => {
      const name = inp.getAttribute('name');
      if (name && !['firstName', 'lastName', 'email', 'phoneNumber'].includes(name)) {
        if (inp instanceof HTMLInputElement && (inp.type === 'checkbox' || inp.type === 'radio')) {
          if (inp.checked) extra[name] = inp.value;
        } else {
          extra[name] = inp.value;
        }
      }
    });

    // Check mandatory extra questions
    const fields: any[] = this.activeCommittee?.extraInfoForm?.fields || [];
    for (const f of fields) {
      if (f.isRequired) {
        const val = extra[f.fieldName];
        if (val === undefined || val === null || val === '') {
          this.formError = `Please complete the mandatory field: "${f.label}".`;
          this.assembleLayout(false);
          return;
        }
      }
    }

    this.submitting = true;
    this.assembleLayout(false);

    const payload = {
      committeeId: this.activeCommittee.id,
      tenantKey: this.tenantSlug || undefined,
      inviteToken: this.inviteToken || undefined,
      firstName,
      lastName,
      email,
      phoneNumber,
      extraAnswers: extra,
      attachmentUrls: this.attachmentUrls
    };

    this.committeesService.submitPublicRegistration(payload, this.tenantSlug || undefined).subscribe({
      next: (res: any) => {
        this.submitting = false;
        if (res?.isSuccess) {
          this.submittedSuccess = true;
          this.submissionStatus = res.data?.status || 'Pending';
          this.submissionMessage = res.message || 'Your registration has been submitted.';
          this.assembleLayout(false);
        } else {
          this.formError = res?.message || 'Registration could not be completed. Please try again.';
          this.assembleLayout(false);
        }
      },
      error: (err: any) => {
        this.submitting = false;
        this.formError = err?.error?.message || 'An error occurred during registration. Please review and try again.';
        this.assembleLayout(false);
      }
    });
  }

  private handleFileUpload(file: File, fieldName: string): void {
    this.uploadingFile = true;
    this.formError = '';

    this.committeesService.uploadPublicAttachment(file, this.tenantSlug || undefined).subscribe({
      next: (res: any) => {
        this.uploadingFile = false;
        if (res?.isSuccess && res.data?.fileUrl) {
          this.extraAnswers[fieldName] = res.data.fileUrl;
          if (!this.attachmentUrls.includes(res.data.fileUrl)) {
            this.attachmentUrls.push(res.data.fileUrl);
          }
          this.assembleLayout(false);
        } else {
          this.formError = res?.message || 'Attachment upload failed.';
          this.assembleLayout(false);
        }
      },
      error: (err: any) => {
        this.uploadingFile = false;
        this.formError = err?.error?.message || 'Attachment upload failed.';
        this.assembleLayout(false);
      }
    });
  }

  private resetRegistration(): void {
    this.submittedSuccess = false;
    this.submissionStatus = '';
    this.submissionMessage = '';
    this.extraAnswers = {};
    this.attachmentUrls = [];
    this.formError = '';
    this.assembleLayout(false);
  }
}
