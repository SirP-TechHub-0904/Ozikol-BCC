import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { ApiService } from '../../../../core/services/api.service';
import { ToastService } from '../../../../core/services/toast.service';

import { MenuVisualComponent } from './visual-categories/menu-visual/menu-visual.component';
import { HeroVisualComponent } from './visual-categories/hero-visual/hero-visual.component';
import { BreadcrumbVisualComponent } from './visual-categories/breadcrumb-visual/breadcrumb-visual.component';
import { BodyVisualComponent } from './visual-categories/body-visual/body-visual.component';
import { FooterVisualComponent } from './visual-categories/footer-visual/footer-visual.component';
import { BlogVisualComponent } from './visual-categories/blog-visual/blog-visual.component';
import { BlogDetailVisualComponent } from './visual-categories/blog-detail-visual/blog-detail-visual.component';

/**
 * Dropdown option descriptor representing a target category or concrete template.
 */
export interface CategoryDropdownOption {
  /** Unique option identifier. */
  id: string;
  /** Category taxonomy key. */
  categoryKey: 'menu' | 'hero' | 'breadcrumb' | 'body' | 'footer' | 'blog' | 'blog_detail';
  /** Human-readable category label. */
  categoryLabel: string;
  /** Whether selecting this option engages edit mode. */
  isEditMode: boolean;
  /** Specific template identifier when editing an existing template. */
  templateId?: string;
  /** Name of the template being edited. */
  templateName?: string;
  /** Formatted display label rendered inside the selector. */
  displayLabel: string;
  /** Google Material Symbol icon identifier. */
  icon: string;
}

/**
 * Category definition descriptor used to populate category navigation tabs.
 */
export interface CategoryTabDef {
  /** Category taxonomy key. */
  key: 'menu' | 'hero' | 'breadcrumb' | 'body' | 'footer' | 'blog' | 'blog_detail';
  /** Display label for the category. */
  label: string;
  /** Google Material Symbol icon. */
  icon: string;
  /** Brief description of category purpose. */
  description: string;
}

/**
 * Landing hub component for CMS Template Visual Studio.
 * Serves as the central coordinator managing the smart category dropdown, database template detection
 * (distinguishing Create vs Edit modes), route synchronization, and hosting dedicated category visual editors.
 */
@Component({
  selector: 'app-template-visuals',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MenuVisualComponent,
    HeroVisualComponent,
    BreadcrumbVisualComponent,
    BodyVisualComponent,
    FooterVisualComponent,
    BlogVisualComponent,
    BlogDetailVisualComponent
  ],
  template: `
    <div class="visuals-studio-page">
      <!-- Top Studio Header -->
      <div class="studio-header-card">
        <div class="header-main-row">
          <div class="header-left">
            <div class="breadcrumb-trail">
              <a routerLink="/admin/dashboard" class="bc-link">Console</a>
              <span class="bc-sep">/</span>
              <a routerLink="/content/console" class="bc-link">CMS Studio</a>
              <span class="bc-sep">/</span>
              <a routerLink="/content/console/templates" class="bc-link">My Templates</a>
              <span class="bc-sep">/</span>
              <span class="bc-current">Visual Studio</span>
            </div>

            <div class="title-with-icon">
              <div class="header-icon-box">
                <span class="material-symbols-outlined">palette</span>
              </div>
              <div class="title-text-wrap">
                <div class="title-heading-row">
                  <h1 class="page-title">CMS Template Visual Studio</h1>
                  <span class="mode-badge" [class.badge-edit]="isEditMode" [class.badge-create]="!isEditMode">
                    <span class="material-symbols-outlined">{{ isEditMode ? 'edit_note' : 'add_circle' }}</span>
                    {{ isEditMode ? 'EDIT MODE' : 'CREATE MODE' }}
                  </span>
                </div>
                <p class="page-subtitle">
                  Configure, code, and simulate modular section visuals with real-time responsive rendering,
                  Monaco code folding, and live tenant tokens.
                </p>
              </div>
            </div>
          </div>

          <div class="header-actions">
            <a routerLink="/content/console/templates" class="btn-back">
              <span class="material-symbols-outlined">arrow_back</span>
              Back to Templates
            </a>
          </div>
        </div>

        <!-- Smart Category Selector Bar -->
        <div class="category-coordinator-bar">
          <div class="selector-field-wrap">
            <label class="selector-label">
              <span class="material-symbols-outlined label-icon">tune</span>
              ACTIVE CATEGORY &amp; BLUEPRINT
            </label>
            <div class="custom-select-box">
              <select
                class="form-select smart-dropdown"
                [(ngModel)]="selectedDropdownOptionId"
                (ngModelChange)="onDropdownOptionChange($event)"
              >
                <optgroup *ngFor="let group of groupedOptions" [label]="group.categoryLabel">
                  <option *ngFor="let opt of group.options" [value]="opt.id">
                    {{ opt.displayLabel }}
                  </option>
                </optgroup>
              </select>
              <span class="material-symbols-outlined dropdown-arrow">expand_more</span>
            </div>
          </div>

          <!-- Quick Category Tab Pills -->
          <div class="category-tabs-strip">
            <button
              type="button"
              *ngFor="let tab of categoryTabs"
              class="category-tab-btn"
              [class.active]="selectedCategory === tab.key"
              (click)="onSelectCategoryTab(tab.key)"
              [title]="tab.description"
            >
              <span class="material-symbols-outlined tab-icon">{{ tab.icon }}</span>
              <span class="tab-label">{{ tab.label }}</span>
              <span
                class="tab-count-pill"
                *ngIf="getCategoryTemplateCount(tab.key) > 0"
              >
                {{ getCategoryTemplateCount(tab.key) }}
              </span>
            </button>
          </div>
        </div>
      </div>

      <!-- Active Category Visual Editor Host -->
      <div class="category-host-container">
        <!-- Navigation Menu Visual -->
        <app-menu-visual
          *ngIf="selectedCategory === 'menu'"
          [isEditMode]="isEditMode"
          [existingTemplateId]="currentTemplateId"
          [editorTokens]="editorTokens"
          (templateSaved)="onTemplateSaved($event)"
        ></app-menu-visual>

        <!-- Hero Showcase Visual -->
        <app-hero-visual
          *ngIf="selectedCategory === 'hero'"
          [isEditMode]="isEditMode"
          [existingTemplateId]="currentTemplateId"
          [editorTokens]="editorTokens"
          (templateSaved)="onTemplateSaved($event)"
        ></app-hero-visual>

        <!-- Breadcrumb Visual -->
        <app-breadcrumb-visual
          *ngIf="selectedCategory === 'breadcrumb'"
          [isEditMode]="isEditMode"
          [existingTemplateId]="currentTemplateId"
          [editorTokens]="editorTokens"
          (templateSaved)="onTemplateSaved($event)"
        ></app-breadcrumb-visual>

        <!-- Body Section Visual -->
        <app-body-visual
          *ngIf="selectedCategory === 'body'"
          [isEditMode]="isEditMode"
          [existingTemplateId]="currentTemplateId"
          [editorTokens]="editorTokens"
          (templateSaved)="onTemplateSaved($event)"
        ></app-body-visual>

        <!-- Footer Visual -->
        <app-footer-visual
          *ngIf="selectedCategory === 'footer'"
          [isEditMode]="isEditMode"
          [existingTemplateId]="currentTemplateId"
          [editorTokens]="editorTokens"
          (templateSaved)="onTemplateSaved($event)"
        ></app-footer-visual>

        <!-- Blog Feed Visual -->
        <app-blog-visual
          *ngIf="selectedCategory === 'blog'"
          [isEditMode]="isEditMode"
          [existingTemplateId]="currentTemplateId"
          [editorTokens]="editorTokens"
          (templateSaved)="onTemplateSaved($event)"
        ></app-blog-visual>

        <!-- Blog Detail Visual -->
        <app-blog-detail-visual
          *ngIf="selectedCategory === 'blog_detail'"
          [isEditMode]="isEditMode"
          [existingTemplateId]="currentTemplateId"
          [editorTokens]="editorTokens"
          (templateSaved)="onTemplateSaved($event)"
        ></app-blog-detail-visual>
      </div>
    </div>
  `,
  styles: [`
    .visuals-studio-page {
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding: 24px;
      background: #f8fafc;
      min-height: 100vh;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .studio-header-card {
      background: #ffffff;
      border: 1.5px solid #e2e8f0;
      border-radius: 16px;
      padding: 24px 28px;
      box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .header-main-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 24px;
      flex-wrap: wrap;
    }

    .header-left {
      display: flex;
      flex-direction: column;
      gap: 12px;
      flex: 1;
      min-width: 300px;
    }

    .breadcrumb-trail {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12.5px;
      font-weight: 600;
    }

    .bc-link {
      color: #64748b;
      text-decoration: none;
      transition: color 0.15s ease;
    }

    .bc-link:hover {
      color: #0050e5;
    }

    .bc-sep {
      color: #cbd5e1;
      font-size: 11px;
    }

    .bc-current {
      color: #0f172a;
      font-weight: 700;
    }

    .title-with-icon {
      display: flex;
      align-items: flex-start;
      gap: 16px;
    }

    .header-icon-box {
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, #0050e5 0%, #3b82f6 100%);
      color: #ffffff;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0, 80, 229, 0.25);
      flex-shrink: 0;
    }

    .header-icon-box .material-symbols-outlined {
      font-size: 26px;
    }

    .title-text-wrap {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .title-heading-row {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .page-title {
      font-size: 24px;
      font-weight: 900;
      color: #0f172a;
      margin: 0;
      letter-spacing: -0.02em;
    }

    .mode-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.6px;
    }

    .mode-badge .material-symbols-outlined {
      font-size: 14px;
    }

    .badge-edit {
      background: #ecfdf5;
      color: #059669;
      border: 1px solid #a7f3d0;
    }

    .badge-create {
      background: #eef2ff;
      color: #0050e5;
      border: 1px solid #c7d2fe;
    }

    .page-subtitle {
      font-size: 13.5px;
      color: #64748b;
      margin: 0;
      line-height: 1.5;
      max-width: 780px;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .btn-back {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      height: 40px;
      padding: 0 16px;
      border: 1.5px solid #e2e8f0;
      border-radius: 10px;
      background: #ffffff;
      color: #475569;
      font-size: 13px;
      font-weight: 700;
      text-decoration: none;
      transition: all 0.2s ease;
    }

    .btn-back:hover {
      background: #f8fafc;
      color: #0f172a;
      border-color: #cbd5e1;
    }

    .btn-back .material-symbols-outlined {
      font-size: 18px;
    }

    .category-coordinator-bar {
      display: flex;
      align-items: flex-end;
      gap: 20px;
      padding-top: 18px;
      border-top: 1.5px solid #f1f5f9;
      flex-wrap: wrap;
    }

    .selector-field-wrap {
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 320px;
    }

    .selector-label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 800;
      color: #64748b;
      letter-spacing: 0.6px;
      margin: 0;
    }

    .label-icon {
      font-size: 15px;
      color: #0050e5;
    }

    .custom-select-box {
      position: relative;
      width: 100%;
    }

    .smart-dropdown {
      width: 100%;
      height: 42px;
      padding: 0 36px 0 14px;
      border: 1.5px solid #cbd5e1;
      border-radius: 10px;
      font-size: 13.5px;
      font-weight: 700;
      color: #0f172a;
      background: #f8fafc;
      appearance: none;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .smart-dropdown:focus {
      outline: none;
      border-color: #0050e5;
      background: #ffffff;
      box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.15);
    }

    .dropdown-arrow {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      pointer-events: none;
      color: #64748b;
      font-size: 20px;
    }

    .category-tabs-strip {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      flex: 1;
      align-items: center;
    }

    .category-tab-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 42px;
      padding: 0 14px;
      border: 1.5px solid #e2e8f0;
      border-radius: 10px;
      background: #ffffff;
      color: #64748b;
      font-size: 12.5px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .category-tab-btn:hover {
      background: #f8fafc;
      color: #0f172a;
      border-color: #cbd5e1;
    }

    .category-tab-btn.active {
      background: #eef2ff;
      color: #0050e5;
      border-color: #0050e5;
      box-shadow: 0 2px 8px rgba(0, 80, 229, 0.12);
    }

    .tab-icon {
      font-size: 17px;
    }

    .tab-count-pill {
      font-size: 10.5px;
      font-weight: 800;
      background: #e2e8f0;
      color: #475569;
      padding: 1px 6px;
      border-radius: 10px;
    }

    .category-tab-btn.active .tab-count-pill {
      background: #0050e5;
      color: #ffffff;
    }

    .category-host-container {
      width: 100%;
    }

    @media (max-width: 900px) {
      .visuals-studio-page {
        padding: 16px;
      }
      .header-main-row {
        flex-direction: column;
      }
      .category-coordinator-bar {
        flex-direction: column;
        align-items: stretch;
      }
      .selector-field-wrap {
        min-width: 100%;
      }
    }
  `]
})
export class TemplateVisualsComponent implements OnInit {
  /** Taxonomy key of the currently active category. */
  selectedCategory: 'menu' | 'hero' | 'breadcrumb' | 'body' | 'footer' | 'blog' | 'blog_detail' = 'menu';

  /** Selected option ID in the smart dropdown. */
  selectedDropdownOptionId: string = 'menu_create';

  /** Whether the active category view is editing an existing template. */
  isEditMode: boolean = false;

  /** Database ID of the template currently undergoing edits. */
  currentTemplateId?: string;

  /** Dynamic tenant token catalog passed down to active editors. */
  editorTokens: any = {};

  /** Cache of installed template blueprints loaded from the backend API. */
  installedTemplates: any[] = [];

  /** Flattened list of dropdown options. */
  dropdownOptions: CategoryDropdownOption[] = [];

  /** Grouped dropdown options for optical select rendering. */
  groupedOptions: Array<{ categoryLabel: string; options: CategoryDropdownOption[] }> = [];

  /** Registered category tab definitions. */
  readonly categoryTabs: CategoryTabDef[] = [
    { key: 'menu', label: 'Menu', icon: 'menu', description: 'Top navigation bar with 3-zone menus and CTA actions' },
    { key: 'hero', label: 'Hero', icon: 'view_headline', description: 'Hero banner showcases with headlines and action buttons' },
    { key: 'breadcrumb', label: 'Breadcrumb', icon: 'linear_scale', description: 'Page hierarchy trails and sub-banners' },
    { key: 'body', label: 'Body Sections', icon: 'dashboard_customize', description: 'Multi-column feature grids and modular content sections' },
    { key: 'footer', label: 'Footer', icon: 'dock', description: 'Sovereign footers, legal compliance, and social channels' },
    { key: 'blog', label: 'Blog Feed', icon: 'rss_feed', description: 'Article cards grid with authors, dates, and categories' },
    { key: 'blog_detail', label: 'Blog Detail', icon: 'article', description: 'In-depth article layout with author bio card and related dispatches' }
  ];

  constructor(
    private api: ApiService,
    private toast: ToastService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  /**
   * Component lifecycle initializer.
   * Loads installed templates, resolves live tenant tokens, and evaluates route parameters.
   */
  ngOnInit(): void {
    this.fetchEditorTokens();
    this.loadInstalledTemplates();
  }

  /**
   * Fetches tenant token catalog from ContentApi/templates/editor-tokens.
   */
  fetchEditorTokens(): void {
    this.api.get<any>('ContentApi/templates/editor-tokens').subscribe({
      next: (res) => {
        this.editorTokens = res?.data || res || {};
      },
      error: () => {
        // Fallback silently if tokens are unavailable
        this.editorTokens = {};
      }
    });
  }

  /**
   * Queries installed templates from ContentApi/templates/installed to populate smart options.
   */
  loadInstalledTemplates(): void {
    this.api.get<any>('ContentApi/templates/installed').subscribe({
      next: (res) => {
        const raw = res?.data || res || [];
        this.installedTemplates = Array.isArray(raw) ? raw : [];
        this.rebuildDropdownOptions();
        this.evaluateRouteParams();
      },
      error: () => {
        this.installedTemplates = [];
        this.rebuildDropdownOptions();
        this.evaluateRouteParams();
      }
    });
  }

  /**
   * Evaluates route path parameter `:id` or query parameter `category`.
   */
  evaluateRouteParams(): void {
    const routeId = this.route.snapshot.paramMap.get('id');
    const queryCat = this.route.snapshot.queryParamMap.get('category');

    if (routeId) {
      // Find template matching route id
      const found = this.installedTemplates.find(t => (t.id || t.dbId) === routeId);
      if (found) {
        const catKey = this.normalizeCategoryKey(found.category || found.categoryKey);
        this.selectedCategory = catKey;
        this.isEditMode = true;
        this.currentTemplateId = found.id || found.dbId;
        const matchingOpt = this.dropdownOptions.find(o => o.templateId === this.currentTemplateId);
        if (matchingOpt) {
          this.selectedDropdownOptionId = matchingOpt.id;
        }
        return;
      }
    }

    if (queryCat) {
      const normalizedCat = this.normalizeCategoryKey(queryCat);
      this.onSelectCategoryTab(normalizedCat);
    } else {
      // Default to first available option
      if (this.dropdownOptions.length > 0) {
        const firstOpt = this.dropdownOptions[0];
        this.selectedDropdownOptionId = firstOpt.id;
        this.applySelectedOption(firstOpt);
      }
    }
  }

  /**
   * Constructs the grouped and flat options list for the smart dropdown based on installed templates.
   */
  rebuildDropdownOptions(): void {
    const options: CategoryDropdownOption[] = [];
    const grouped: Array<{ categoryLabel: string; options: CategoryDropdownOption[] }> = [];

    for (const tab of this.categoryTabs) {
      const groupOptions: CategoryDropdownOption[] = [];
      const matchingTemplates = this.installedTemplates.filter(t => {
        const cat = this.normalizeCategoryKey(t.category || t.categoryKey);
        return cat === tab.key;
      });

      if (tab.key === 'body') {
        // Body sections can have multiple templates installed
        // 1. Create New option
        groupOptions.push({
          id: 'body_create_new',
          categoryKey: 'body',
          categoryLabel: tab.label,
          isEditMode: false,
          displayLabel: '+ Create New Body Section',
          icon: 'add_circle'
        });

        // 2. Existing installed body templates
        for (const tmpl of matchingTemplates) {
          const tmplId = tmpl.id || tmpl.dbId;
          groupOptions.push({
            id: `body_edit_${tmplId}`,
            categoryKey: 'body',
            categoryLabel: tab.label,
            isEditMode: true,
            templateId: tmplId,
            templateName: tmpl.name,
            displayLabel: `Edit: ${tmpl.name}`,
            icon: 'edit'
          });
        }
      } else {
        // Singleton categories: Menu, Hero, Breadcrumbs, Footer, Blog, Blog Detail
        if (matchingTemplates.length > 0) {
          const tmpl = matchingTemplates[0];
          const tmplId = tmpl.id || tmpl.dbId;
          groupOptions.push({
            id: `${tab.key}_edit_${tmplId}`,
            categoryKey: tab.key,
            categoryLabel: tab.label,
            isEditMode: true,
            templateId: tmplId,
            templateName: tmpl.name,
            displayLabel: `${tab.label} (Edit - ${tmpl.name})`,
            icon: 'edit_note'
          });
        } else {
          groupOptions.push({
            id: `${tab.key}_create`,
            categoryKey: tab.key,
            categoryLabel: tab.label,
            isEditMode: false,
            displayLabel: `${tab.label} (Create New)`,
            icon: 'add_circle'
          });
        }
      }

      options.push(...groupOptions);
      grouped.push({
        categoryLabel: tab.label,
        options: groupOptions
      });
    }

    this.dropdownOptions = options;
    this.groupedOptions = grouped;
  }

  /**
   * Handles user selection from the smart dropdown.
   * @param optionId Identifier of the selected dropdown option.
   */
  onDropdownOptionChange(optionId: string): void {
    const selected = this.dropdownOptions.find(o => o.id === optionId);
    if (!selected) return;
    this.applySelectedOption(selected);
  }

  /**
   * Applies selected dropdown option state to the component.
   * @param option The selected category dropdown option.
   */
  applySelectedOption(option: CategoryDropdownOption): void {
    this.selectedCategory = option.categoryKey;
    this.isEditMode = option.isEditMode;
    this.currentTemplateId = option.templateId;
  }

  /**
   * Handles user clicking one of the top quick category tab pills.
   * Automatically selects the first option belonging to that category in the dropdown.
   * @param catKey Target category taxonomy key.
   */
  onSelectCategoryTab(catKey: 'menu' | 'hero' | 'breadcrumb' | 'body' | 'footer' | 'blog' | 'blog_detail'): void {
    this.selectedCategory = catKey;
    const catOptions = this.dropdownOptions.filter(o => o.categoryKey === catKey);
    if (catOptions.length > 0) {
      // Prefer edit option if exists, otherwise create
      const opt = catOptions.find(o => o.isEditMode) || catOptions[0];
      this.selectedDropdownOptionId = opt.id;
      this.applySelectedOption(opt);
    } else {
      this.isEditMode = false;
      this.currentTemplateId = undefined;
    }
  }

  /**
   * Counts how many installed templates exist for the given category key.
   * @param catKey Category taxonomy key.
   * @returns Count of matching installed templates.
   */
  getCategoryTemplateCount(catKey: string): number {
    return this.installedTemplates.filter(t => {
      const cat = this.normalizeCategoryKey(t.category || t.categoryKey);
      return cat === catKey;
    }).length;
  }

  /**
   * Normalizes incoming category strings to canonical taxonomy keys.
   * @param cat Raw category key or name.
   * @returns Canonical taxonomy key.
   */
  normalizeCategoryKey(cat: string): 'menu' | 'hero' | 'breadcrumb' | 'body' | 'footer' | 'blog' | 'blog_detail' {
    const lower = (cat || '').toLowerCase().trim();
    if (lower === 'navigation' || lower === 'nav' || lower === 'menu') return 'menu';
    if (lower === 'hero' || lower === 'heros') return 'hero';
    if (lower === 'breadcrumb' || lower === 'breadcrumbs') return 'breadcrumb';
    if (lower === 'footer' || lower === 'footers') return 'footer';
    if (lower === 'blog_detail' || lower === 'article' || lower === 'blogdetail') return 'blog_detail';
    if (lower === 'blog' || lower === 'blogs' || lower === 'articles') return 'blog';
    return 'body';
  }

  /**
   * Callback invoked whenever any child category visual component saves a template.
   * Refreshes installed templates list to keep dropdown options synchronized.
   * @param savedData Payload received from child component save event.
   */
  onTemplateSaved(savedData: any): void {
    this.toast.success(`Template saved. Refreshing blueprint registry...`);
    this.loadInstalledTemplates();
  }
}
