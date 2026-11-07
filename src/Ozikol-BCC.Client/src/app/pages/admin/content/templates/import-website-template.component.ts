import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { DomSanitizer, SafeResourceUrl, SafeHtml } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
import { ToastService } from '../../../../core/services/toast.service';
import { ApiService } from '../../../../core/services/api.service';
import { environment } from '../../../../../environments/environment';

export interface AuditItem {
  id: string;
  type: string;
  url?: string;
  label: string;
  title?: string;
  checked: boolean;
  size_bytes?: number;
  preview_url?: string;
  page_url?: string;
  page_id?: string;
  category_key?: string;
  heading?: string;
  css_selector?: string;
  dom_tag?: string;
  preview_snippet?: string;
  child_card_count?: number;
  is_duplicate?: boolean;
  appearance_count?: number;
  extra?: any;
}

export interface AuditResult {
  job_id: string;
  source_url: string;
  status: string;
  sections?: AuditItem[];
  css_files: AuditItem[];
  js_files: AuditItem[];
  fonts: AuditItem[];
  pages: AuditItem[];
  broken_links: AuditItem[];
  meta_tags: AuditItem[];
  trackers: AuditItem[];
  external_resources: AuditItem[];
  total_pages: number;
  total_assets: number;
}

export interface ImportableTemplateItem {
  template_key: string;
  category_key: string;
  name: string;
  variant_code: string;
  description?: string;
  html_template: string;
  css_styles?: string;
  js_script?: string;
  default_content_json?: string;
}

export interface ImportableTagItem {
  name: string;
  zone: string;
  tag_type: string;
  content: string;
  sort_order: number;
}

export interface ImportableCategoryItem {
  title: string;
  description?: string;
  menu_sort_order: number;
  show_in_menu_drop_down: boolean;
  show_in_footer: boolean;
  footer_display_title?: string;
}

export interface ImportablePageItem {
  title: string;
  slug: string;
  summary?: string;
  category_title?: string;
  show_in_main_menu: boolean;
  show_in_menu_drop_down: boolean;
  show_in_footer: boolean;
  is_legal: boolean;
  is_menu_cta: boolean;
  sort_order: number;
  sections?: any[];
}

export interface ImportableSuitePackage {
  job_id: string;
  suite_name: string;
  group_code: string;
  source_url: string;
  templates: ImportableTemplateItem[];
  code_injections: ImportableTagItem[];
  categories: ImportableCategoryItem[];
  pages: ImportablePageItem[];
}

@Component({
  selector: 'app-import-website-template',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './import-website-template.component.html',
  styleUrl: './import-website-template.component.scss'
})
export class ImportWebsiteTemplateComponent implements OnInit, OnDestroy {
  // Wizard Steps: 1 = URL & Config, 2 = Audit Checklist, 3 = Cleaned Preview, 4 = AI Tokenize, 5 = Blueprint Review & Import
  currentStep: number = 1;

  // Step 1: Configuration Form
  targetUrl: string = '';
  suiteName: string = 'Apex Modern Theme';
  brandName: string = localStorage.getItem('tenant_name') || localStorage.getItem('tenant_company_name') || 'Enterprise Workspace';
  extractorBaseUrl: string = environment.htmlExtractorApiUrl || 'http://localhost:8001';
  aiApiKey: string = '';
  overrideExistingTemplates: boolean = true;

  // Step 1 Loading & Job Tracking
  crawling: boolean = false;
  crawlProgressMessage: string = '';
  jobId: string = '';
  pollInterval: any = null;

  // Step 2: Audit Checklist
  auditResult: AuditResult | null = null;
  activeAuditTab: 'sections' | 'css' | 'js' | 'fonts' | 'pages' | 'meta' | 'trackers' = 'sections';
  auditSearchQuery: string = '';

  // Step 3: Cleaned Sandbox Preview
  cleaning: boolean = false;
  selectedPreviewPageId: string = '';
  previewViewport: 'desktop' | 'tablet' | 'mobile' = 'desktop';
  safePreviewUrl: SafeResourceUrl | null = null;
  rawCleanedHtml: string = '';

  // Step 4: Debranding & Blueprint Generation
  tokenizing: boolean = false;
  tokenizationProgressStep: number = 1;
  tokenizationStatusText: string = 'Initializing debranding engine...';

  get tokenizationPercentage(): number {
    if (this.tokenizationProgressStep === 1) return 35;
    if (this.tokenizationProgressStep === 2) return 75;
    if (this.tokenizationProgressStep >= 3) return 100;
    return 15;
  }

  // Step 5: Final Blueprint Review & DB Import
  generatedSuite: ImportableSuitePackage | null = null;
  activeBlueprintCategory: string = 'all';
  importingToDatabase: boolean = false;
  cardActiveTabs: { [variantCode: string]: 'html' | 'content' } = {};

  getCardTab(variantCode: string): 'html' | 'content' {
    return this.cardActiveTabs[variantCode] || 'html';
  }

  setCardTab(variantCode: string, tab: 'html' | 'content'): void {
    this.cardActiveTabs[variantCode] = tab;
  }

  getTemplateContentInstances(template: ImportableTemplateItem): Array<{
    pageTitle: string;
    pageSlug: string;
    isHome: boolean;
    title: string;
    miniTitle?: string;
    description?: string;
    buttonText?: string;
    buttonLink?: string;
    items?: any[];
    rawJson?: string;
  }> {
    const instances: Array<{
      pageTitle: string;
      pageSlug: string;
      isHome: boolean;
      title: string;
      miniTitle?: string;
      description?: string;
      buttonText?: string;
      buttonLink?: string;
      items?: any[];
      rawJson?: string;
    }> = [];

    const tKey = template.template_key;
    const vCode = template.variant_code;

    // Search across generatedSuite pages for sections utilizing this template
    if (this.generatedSuite?.pages) {
      for (const page of this.generatedSuite.pages) {
        if (page.sections) {
          for (const sec of page.sections) {
            if (sec.template_key === tKey || sec.template_key === vCode) {
              instances.push({
                pageTitle: page.title || 'Untitled Page',
                pageSlug: page.slug || 'home',
                isHome: page.slug === 'home',
                title: sec.title || template.name,
                miniTitle: sec.mini_title,
                description: sec.description,
                buttonText: sec.button_text,
                buttonLink: sec.button_link,
                items: sec.items || []
              });
            }
          }
        }
      }
    }

    // If no explicit page sections mapped or to provide the default fallback instance
    if (instances.length === 0 && template.default_content_json) {
      try {
        const parsed = JSON.parse(template.default_content_json);
        instances.push({
          pageTitle: 'Default Starter Content',
          pageSlug: 'default',
          isHome: true,
          title: parsed.title || parsed.brandName || template.name,
          miniTitle: parsed.miniTitle,
          description: parsed.description || parsed.text,
          buttonText: parsed.buttonText,
          buttonLink: parsed.buttonLink,
          items: parsed.items || [],
          rawJson: template.default_content_json
        });
      } catch {
        instances.push({
          pageTitle: 'Default Starter Content',
          pageSlug: 'default',
          isHome: true,
          title: template.name,
          description: template.description,
          rawJson: template.default_content_json
        });
      }
    }

    return instances;
  }

  copyCode(code: string, event: Event): void {
    event.stopPropagation();
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      this.toastService.success('Template code copied to clipboard.');
    });
  }

  constructor(
    private http: HttpClient,
    private apiService: ApiService,
    private toastService: ToastService,
    private router: Router,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef
  ) {}

  @HostListener('window:beforeunload', ['$event'])
  preventAccidentalReload($event: any): void {
    if (this.tokenizing || this.crawling || this.cleaning || this.importingToDatabase) {
      $event.returnValue = true;
    }
  }

  ngOnInit(): void {
    // Check if custom brand name exists in tenant config
    const tenantBrand = localStorage.getItem('tenant_name') || localStorage.getItem('tenant_company_name');
    if (tenantBrand) {
      this.brandName = tenantBrand;
    }
  }

  ngOnDestroy(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }

  // =========================================================================
  // STEP 1: START CRAWL & AUDIT
  // =========================================================================

  startCrawl(): void {
    const url = this.targetUrl.trim();
    if (!url) {
      this.toastService.error('Please enter a valid website URL starting with http:// or https://');
      return;
    }
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      this.toastService.error('Target URL must start with http:// or https://');
      return;
    }

    this.crawling = true;
    this.crawlProgressMessage = 'Connecting to Extractor API and launching Phase 1 crawler...';

    const baseUrl = this.extractorBaseUrl.replace(/\/+$/, '');
    this.http.post<any>(`${baseUrl}/jobs/start`, { url: url }).subscribe({
      next: (resp) => {
        this.jobId = resp.job_id;
        this.crawlProgressMessage = `Crawl started (Job #${this.jobId.substring(0, 8)}). Auditing CSS, JS, fonts, pages, and trackers...`;
        this.pollAuditResults();
      },
      error: (err) => {
        this.crawling = false;
        const msg = err.error?.detail || err.message || 'Failed to connect to Extractor API.';
        this.toastService.error(`Crawl initiation failed: ${msg}. Check that the extractor is running at ${this.extractorBaseUrl}`);
      }
    });
  }

  private pollAuditResults(): void {
    const baseUrl = this.extractorBaseUrl.replace(/\/+$/, '');
    let pollCount = 0;

    this.pollInterval = setInterval(() => {
      pollCount++;
      this.crawlProgressMessage = `Auditing website assets and scanning DOM (attempt ${pollCount})...`;

      this.http.get<any>(`${baseUrl}/jobs/${this.jobId}/audit`, { observe: 'response' }).subscribe({
        next: (response) => {
          // If 202 Accepted or if payload is in progress (no css_files yet), continue polling
          if (response.status === 202 || !response.body || response.body.status === 'auditing' || !response.body.css_files) {
            return;
          }

          clearInterval(this.pollInterval);
          this.pollInterval = null;
          this.crawling = false;
          const audit: AuditResult = response.body;

          if (!audit.pages || audit.pages.length === 0 || audit.total_pages === 0) {
            this.toastService.error('Crawl returned 0 pages: The target website could not be retrieved or returned an empty response. Please check the URL.');
            this.cdr.markForCheck();
            return;
          }

          this.auditResult = audit;
          if (audit.pages && audit.pages.length > 0) {
            this.selectedPreviewPageId = audit.pages[0].id;
          }

          this.toastService.success(`Audit complete! Discovered ${audit.total_pages} pages and ${audit.total_assets} assets.`);
          this.currentStep = 2;
          this.cdr.detectChanges();
        },
        error: (err) => {
          if (err.status === 202) {
            // Still auditing, continue polling
            return;
          }
          clearInterval(this.pollInterval);
          this.pollInterval = null;
          this.crawling = false;
          const msg = err.error?.detail || err.message || 'Audit polling failed.';
          this.toastService.error(`Audit failed: ${msg}`);
          this.cdr.detectChanges();
        }
      });
    }, 2000);
  }

  // =========================================================================
  // STEP 2: AUDIT CHECKLIST CONTROLS
  // =========================================================================

  toggleAllInTab(checked: boolean): void {
    const list = this.getCurrentTabList();
    list.forEach(item => item.checked = checked);
  }

  getCurrentTabList(): AuditItem[] {
    if (!this.auditResult) return [];
    switch (this.activeAuditTab) {
      case 'sections': return this.auditResult.sections || [];
      case 'css': return this.auditResult.css_files || [];
      case 'js': return this.auditResult.js_files || [];
      case 'fonts': return this.auditResult.fonts || [];
      case 'pages': return this.auditResult.pages || [];
      case 'meta': return this.auditResult.meta_tags || [];
      case 'trackers': return this.auditResult.trackers || [];
      default: return [];
    }
  }

  getFilteredTabList(): AuditItem[] {
    const list = this.getCurrentTabList();
    if (!this.auditSearchQuery.trim()) return list;
    const q = this.auditSearchQuery.toLowerCase();
    return list.filter(item => 
      (item.label && item.label.toLowerCase().includes(q)) || 
      (item.heading && item.heading.toLowerCase().includes(q)) ||
      (item.css_selector && item.css_selector.toLowerCase().includes(q)) ||
      (item.url && item.url.toLowerCase().includes(q))
    );
  }

  getTabCount(tab: string): number {
    if (!this.auditResult) return 0;
    switch (tab) {
      case 'sections': return (this.auditResult.sections || []).length;
      case 'css': return (this.auditResult.css_files || []).length;
      case 'js': return (this.auditResult.js_files || []).length;
      case 'fonts': return (this.auditResult.fonts || []).length;
      case 'pages': return (this.auditResult.pages || []).length;
      case 'meta': return (this.auditResult.meta_tags || []).length;
      case 'trackers': return (this.auditResult.trackers || []).length;
      default: return 0;
    }
  }

  getCheckedCount(tab: string): number {
    if (!this.auditResult) return 0;
    switch (tab) {
      case 'sections': return (this.auditResult.sections || []).filter(i => i.checked).length;
      case 'css': return (this.auditResult.css_files || []).filter(i => i.checked).length;
      case 'js': return (this.auditResult.js_files || []).filter(i => i.checked).length;
      case 'fonts': return (this.auditResult.fonts || []).filter(i => i.checked).length;
      case 'pages': return (this.auditResult.pages || []).filter(i => i.checked).length;
      case 'meta': return (this.auditResult.meta_tags || []).filter(i => i.checked).length;
      case 'trackers': return (this.auditResult.trackers || []).filter(i => i.checked).length;
      default: return 0;
    }
  }

  getSectionCategoryIcon(categoryKey?: string): string {
    switch (categoryKey?.toLowerCase()) {
      case 'menu': return 'menu';
      case 'hero': return 'view_carousel';
      case 'breadcrumb': return 'conversion_path';
      case 'footer': return 'dock_to_bottom';
      case 'body':
      default:
        return 'view_quilt';
    }
  }

  getSectionCategoryLabel(categoryKey?: string): string {
    switch (categoryKey?.toLowerCase()) {
      case 'menu': return 'Navigation Header';
      case 'hero': return 'Hero Showcase Banner';
      case 'breadcrumb': return 'Breadcrumb Navigation';
      case 'footer': return 'Website Footer';
      case 'body':
      default:
        return 'Modular Content Section';
    }
  }

  getPageSections(pageUrl?: string): AuditItem[] {
    if (!this.auditResult || !this.auditResult.sections || !pageUrl) return [];
    return this.auditResult.sections.filter(s => s.page_url === pageUrl);
  }

  getPageBodySectionCount(pageUrl?: string): number {
    if (!this.auditResult || !this.auditResult.sections || !pageUrl) return 0;
    return this.auditResult.sections.filter(s => s.page_url === pageUrl && (!s.category_key || s.category_key.toLowerCase() === 'body')).length;
  }

  hasPageStructuralElement(pageUrl: string | undefined, category: string): boolean {
    if (!this.auditResult || !this.auditResult.sections || !pageUrl) return false;
    return this.auditResult.sections.some(s => s.page_url === pageUrl && s.category_key?.toLowerCase() === category.toLowerCase());
  }

  getTotalBodySectionsCount(): number {
    if (!this.auditResult || !this.auditResult.sections) return 0;
    return this.auditResult.sections.filter(s => !s.category_key || s.category_key.toLowerCase() === 'body').length;
  }

  getTotalCheckedPagesBodySectionsCount(): number {
    if (!this.auditResult || !this.auditResult.pages || !this.auditResult.sections) return 0;
    const checkedPageUrls = new Set(this.auditResult.pages.filter(p => p.checked).map(p => p.url));
    return this.auditResult.sections.filter(s => checkedPageUrls.has(s.page_url) && (!s.category_key || s.category_key.toLowerCase() === 'body')).length;
  }

  applySelectionsAndPreview(): void {
    if (!this.auditResult) return;

    this.cleaning = true;
    const baseUrl = this.extractorBaseUrl.replace(/\/+$/, '');

    // Collect all item selections including sections
    const selections: Array<{ id: string; checked: boolean }> = [];
    const allItems = [
      ...(this.auditResult.sections || []),
      ...(this.auditResult.css_files || []),
      ...(this.auditResult.js_files || []),
      ...(this.auditResult.fonts || []),
      ...(this.auditResult.pages || []),
      ...(this.auditResult.meta_tags || []),
      ...(this.auditResult.trackers || [])
    ];

    allItems.forEach(item => {
      selections.push({ id: item.id, checked: item.checked });
    });

    this.http.post<any>(`${baseUrl}/jobs/${this.jobId}/apply`, { selections }).subscribe({
      next: (cleanResult) => {
        this.cleaning = false;
        this.toastService.success(`Selections applied! Kept ${cleanResult.kept_sections?.length || 0} sections and ${cleanResult.kept_pages.length} pages.`);
        this.updateCleanedPreview();
        this.currentStep = 3;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.cleaning = false;
        const msg = err.error?.detail || err.message || 'Clean operation failed.';
        this.toastService.error(`Apply selections failed: ${msg}`);
        this.cdr.markForCheck();
      }
    });
  }

  // =========================================================================
  // STEP 3: CLEANED SANDBOX PREVIEW
  // =========================================================================

  updateCleanedPreview(): void {
    if (!this.selectedPreviewPageId) {
      if (this.auditResult && this.auditResult.pages && this.auditResult.pages.length > 0) {
        this.selectedPreviewPageId = this.auditResult.pages[0].id;
      }
    }
    const baseUrl = this.extractorBaseUrl.replace(/\/+$/, '');
    const previewUrl = `${baseUrl}/jobs/${this.jobId}/preview/cleaned/${this.selectedPreviewPageId}`;
    this.safePreviewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(previewUrl);
    this.cdr.markForCheck();
  }

  // =========================================================================
  // STEP 4: DEBRANDING & BLUEPRINT GENERATION
  // =========================================================================

  startAiTokenization(): void {
    this.currentStep = 4;
    this.tokenizing = true;
    this.tokenizationProgressStep = 1;
    this.tokenizationStatusText = 'Uploading retained assets, stylesheets, and fonts to CDN...';
    this.cdr.markForCheck();

    const baseUrl = this.extractorBaseUrl.replace(/\/+$/, '');

    // 1. Upload assets to Cloudinary (Phase 3)
    this.http.post<any>(`${baseUrl}/jobs/${this.jobId}/upload`, {}).subscribe({
      next: (uploadResult) => {
        this.tokenizationProgressStep = 2;
        this.tokenizationStatusText = 'Scrubbing brand references, logos, and preparing workspace identity...';
        this.cdr.markForCheck();

        // 2. Invoke Tokenizer & Blueprint Generator (Phase 4)
        const tokenizePayload = {
          suite_name: this.suiteName,
          brand_name: this.brandName,
          api_key: this.aiApiKey || undefined
        };

        this.http.post<any>(`${baseUrl}/jobs/${this.jobId}/ai-tokenize`, tokenizePayload).subscribe({
          next: (aiResult) => {
            this.tokenizationProgressStep = 3;
            this.tokenizationStatusText = 'Assembling modular section blueprints and page hierarchy...';
            this.cdr.markForCheck();

            setTimeout(() => {
              this.tokenizing = false;
              this.generatedSuite = aiResult.suite;
              this.toastService.success(`Debranding complete! Generated ${aiResult.suite.templates.length} modular blueprints.`);
              this.currentStep = 5;
              this.cdr.markForCheck();
            }, 1000);
          },
          error: (err) => {
            this.tokenizing = false;
            const msg = err.error?.detail || err.message || 'Debranding failed.';
            this.toastService.error(`Debranding failed: ${msg}`);
            this.currentStep = 3;
            this.cdr.markForCheck();
          }
        });
      },
      error: (err) => {
        // If Cloudinary is not configured on local extractor, proceed directly with debranding on cleaned HTML
        this.tokenizationProgressStep = 2;
        this.tokenizationStatusText = 'Asset upload bypassed (using direct assets). Debranding HTML markup...';
        this.cdr.markForCheck();

        const tokenizePayload = {
          suite_name: this.suiteName,
          brand_name: this.brandName,
          api_key: this.aiApiKey || undefined
        };

        this.http.post<any>(`${baseUrl}/jobs/${this.jobId}/ai-tokenize`, tokenizePayload).subscribe({
          next: (aiResult) => {
            this.tokenizing = false;
            this.generatedSuite = aiResult.suite;
            this.toastService.success(`Debranding complete! Generated ${aiResult.suite.templates.length} modular blueprints.`);
            this.currentStep = 5;
            this.cdr.markForCheck();
          },
          error: (err2) => {
            this.tokenizing = false;
            const msg = err2.error?.detail || err2.message || 'Debranding failed.';
            this.toastService.error(`Debranding failed: ${msg}`);
            this.currentStep = 3;
            this.cdr.markForCheck();
          }
        });
      }
    });
  }

  // =========================================================================
  // STEP 5: BLUEPRINT REVIEW & 1-CLICK VAULT ADOPTION
  // =========================================================================

  getFilteredTemplates(): ImportableTemplateItem[] {
    if (!this.generatedSuite || !this.generatedSuite.templates) return [];
    if (this.activeBlueprintCategory === 'all') return this.generatedSuite.templates;
    return this.generatedSuite.templates.filter(t => t.category_key === this.activeBlueprintCategory);
  }

  getCategoryCount(categoryKey: string): number {
    if (!this.generatedSuite || !this.generatedSuite.templates) return 0;
    if (categoryKey === 'all') return this.generatedSuite.templates.length;
    return this.generatedSuite.templates.filter(t => t.category_key === categoryKey).length;
  }

  getCategoryIcon(categoryKey: string): string {
    switch (categoryKey) {
      case 'menu': return 'menu';
      case 'hero': return 'view_carousel';
      case 'body': return 'view_quilt';
      case 'footer': return 'dock_to_bottom';
      case 'blog': return 'newspaper';
      case 'ecommerce': return 'shopping_bag';
      case 'breadcrumb': return 'signpost';
      default: return 'layers';
    }
  }

  importSuiteToDatabase(): void {
    if (!this.generatedSuite) return;

    this.importingToDatabase = true;

    // Transform generated suite into C# ImportWebsiteSuiteRequest payload
    const payload = {
      suiteName: this.generatedSuite.suite_name,
      groupCode: this.generatedSuite.group_code,
      sourceUrl: this.generatedSuite.source_url,
      overrideExisting: this.overrideExistingTemplates,
      templates: this.generatedSuite.templates.map(t => ({
        templateKey: t.template_key,
        categoryKey: t.category_key,
        name: t.name,
        variantCode: t.variant_code,
        description: t.description,
        htmlTemplate: t.html_template,
        cssStyles: t.css_styles,
        jsScript: t.js_script,
        defaultContentJson: t.default_content_json
      })),
      codeInjections: (this.generatedSuite.code_injections || []).map(tag => ({
        name: tag.name,
        zone: tag.zone,
        tagType: tag.tag_type,
        content: tag.content,
        sortOrder: tag.sort_order
      })),
      categories: (this.generatedSuite.categories || []).map(cat => ({
        title: cat.title,
        description: cat.description,
        menuSortOrder: cat.menu_sort_order,
        showInMenuDropDown: cat.show_in_menu_drop_down,
        showInFooter: cat.show_in_footer,
        footerDisplayTitle: cat.footer_display_title
      })),
      pages: (this.generatedSuite.pages || []).map(p => ({
        title: p.title,
        slug: p.slug,
        summary: p.summary,
        categoryTitle: p.category_title,
        showInMainMenu: p.show_in_main_menu,
        showInMenuDropDown: p.show_in_menu_drop_down,
        showInFooter: p.show_in_footer,
        isLegal: p.is_legal,
        isMenuCTA: p.is_menu_cta,
        sortOrder: p.sort_order,
        sections: (p.sections || []).map((s: any) => ({
          templateKey: s.template_key,
          title: s.title,
          miniTitle: s.mini_title,
          description: s.description,
          imageUrl: s.image_url,
          buttonText: s.button_text,
          buttonLink: s.button_link,
          showInHome: s.show_in_home,
          pageSortOrder: s.page_sort_order,
          items: s.items || []
        }))
      }))
    };

    this.apiService.post<any>('/ContentApi/templates/import-website-suite', payload).subscribe({
      next: (resp) => {
        this.importingToDatabase = false;
        const resData = resp.data || resp;
        const targetGroupCode = this.generatedSuite?.group_code
          ? 'suite_' + this.generatedSuite.group_code.replace(/^SUITE_/i, '').toLowerCase()
          : 'suite_corporate';
        this.toastService.success(`Success! Adopted ${this.generatedSuite?.suite_name || 'theme suite'} with ${resData?.templatesImported ?? this.generatedSuite?.templates?.length} templates and live page layouts.`);
        this.router.navigate(['/content/console/templates'], { queryParams: { suite: targetGroupCode } });
      },
      error: (err) => {
        this.importingToDatabase = false;
        const msg = err.error?.message || err.message || 'Template save failed.';
        this.toastService.error(`Import failed: ${msg}`);
        this.cdr.markForCheck();
      }
    });
  }
}
