import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ApiService } from '../../../../core/services/api.service';
import { ToastService } from '../../../../core/services/toast.service';

import { MenuVisualComponent } from './visual-categories/menu-visual/menu-visual.component';
import { HeroVisualComponent } from './visual-categories/hero-visual/hero-visual.component';
import { BreadcrumbVisualComponent } from './visual-categories/breadcrumb-visual/breadcrumb-visual.component';
import { BodyVisualComponent } from './visual-categories/body-visual/body-visual.component';
import { FooterVisualComponent } from './visual-categories/footer-visual/footer-visual.component';
import { BlogVisualComponent } from './visual-categories/blog-visual/blog-visual.component';
import { BlogDetailVisualComponent } from './visual-categories/blog-detail-visual/blog-detail-visual.component';
import { UniversalPreviewModalComponent } from './universal-preview-modal/universal-preview-modal.component';

/**
 * Definition descriptor for supported template categories in CMS Template Visual Studio.
 */
export interface CategoryPresetItem {
  /** Canonical category identifier. */
  id: 'menu' | 'hero' | 'breadcrumb' | 'body' | 'footer' | 'blog' | 'blog_detail';
  /** Human-readable category display name. */
  name: string;
  /** Descriptive role or tagline explaining category purpose. */
  tagline: string;
}

/**
 * Landing coordinator component for CMS Template Visual Studio.
 * Presents a focused Category Selection dropdown on entry and dynamically reveals
 * the corresponding visual category editor workspace once a category is selected.
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
    BlogDetailVisualComponent,
    UniversalPreviewModalComponent
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
                  <span class="mode-badge" *ngIf="selectedCategory" [class.badge-edit]="isEditMode" [class.badge-create]="!isEditMode">
                    <span class="material-symbols-outlined">{{ isEditMode ? 'edit_note' : 'add_circle' }}</span>
                    {{ isEditMode ? 'EDIT MODE' : 'CREATE MODE' }}
                  </span>
                </div>
                <p class="page-subtitle">
                  Configure, code, and simulate modular section visuals with real-time responsive rendering,
                  code folding, and live tokens.
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
      </div>

      <!-- Step 1: Category Selection Card (Always Visible) -->
      <div class="category-selection-card">
        <div class="category-field-header">
          <div class="category-title-wrap">
            <span class="step-badge">1. SECTION CATEGORY</span>
            <label class="config-label mb-0">CHOOSE SECTION ROLE / CATEGORY <span class="required">*</span></label>
          </div>
          <span class="category-field-hint" *ngIf="!isEditMode">Select a category below to reveal template configuration</span>
          <div class="category-lock-actions" *ngIf="isEditMode">
            <span class="lock-status-badge">
              <span class="material-symbols-outlined lock-icon">lock</span>
              Editing Template (Locked)
            </span>
            <button
              type="button"
              class="btn-change-category"
              (click)="unlockCategory()"
              title="Unlock and select a different category"
            >
              <span class="material-symbols-outlined btn-change-icon">swap_horiz</span>
              <span>Change Category</span>
            </button>
          </div>
        </div>
        <div class="custom-select-box">
          <select
            [(ngModel)]="selectedCategory"
            (ngModelChange)="onCategoryChange($event)"
            class="form-select category-select-styled"
            [disabled]="isEditMode"
          >
            <option value="" disabled selected>-- Select Category (Navigation, Hero Sliders, Body Sections, Footers, Blogs...) --</option>
            <option *ngFor="let cat of categoryPresets" [value]="cat.id">
              {{ cat.name }} — {{ cat.tagline }}
            </option>
          </select>
          <span class="material-symbols-outlined dropdown-arrow">expand_more</span>
        </div>
      </div>

      <!-- Active Category Visual Editor Host (Revealed ONLY when selectedCategory is set) -->
      <div class="category-host-container" *ngIf="selectedCategory">
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

      <!-- Universal Centralized Template Preview Modal -->
      <app-universal-preview-modal></app-universal-preview-modal>
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

    /* Step 1 Category Selection Card */
    .category-selection-card {
      background: #ffffff;
      border: 1.5px solid #e2e8f0;
      border-radius: 14px;
      padding: 20px 24px;
      box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .category-field-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
    }

    .category-title-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .step-badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 800;
      background: #eff6ff;
      color: #0050e5;
      border: 1px solid #bfdbfe;
      padding: 3px 10px;
      border-radius: 6px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    .config-label {
      font-size: 13px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: 0.5px;
      margin: 0;
    }

    .required {
      color: #ef4444;
      font-weight: 900;
      margin-left: 2px;
    }

    .category-field-hint {
      font-size: 12.5px;
      color: #64748b;
    }

    .category-lock-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .lock-status-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 12px;
      font-weight: 700;
      color: #059669;
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      padding: 4px 10px;
      border-radius: 6px;
    }

    .lock-icon {
      font-size: 15px;
    }

    .btn-change-category {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 32px;
      padding: 0 12px;
      border: 1.5px solid #cbd5e1;
      border-radius: 8px;
      background: #ffffff;
      color: #1e293b;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-change-category:hover {
      background: #f1f5f9;
      border-color: #0050e5;
      color: #0050e5;
      box-shadow: 0 2px 6px rgba(0, 80, 229, 0.1);
    }

    .btn-change-icon {
      font-size: 16px;
    }

    .custom-select-box {
      position: relative;
      width: 100%;
    }

    .category-select-styled {
      width: 100%;
      height: 48px;
      padding: 0 40px 0 16px;
      border: 1.5px solid #cbd5e1;
      border-radius: 10px;
      font-size: 13.5px;
      font-weight: 600;
      color: #0f172a;
      background: #f8fafc;
      appearance: none;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .category-select-styled:focus {
      outline: none;
      border-color: #0050e5;
      background: #ffffff;
      box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.15);
    }

    .category-select-styled:disabled {
      background-color: #f1f5f9;
      color: #94a3b8;
      cursor: not-allowed;
      border-color: #e2e8f0;
    }

    .dropdown-arrow {
      position: absolute;
      right: 14px;
      top: 50%;
      transform: translateY(-50%);
      pointer-events: none;
      color: #64748b;
      font-size: 22px;
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
    }
  `]
})
export class TemplateVisualsComponent implements OnInit {
  /** Taxonomy key of the currently active category. Empty string when no category is selected. */
  selectedCategory: 'menu' | 'hero' | 'breadcrumb' | 'body' | 'footer' | 'blog' | 'blog_detail' | '' = '';

  /** Whether the active category view is editing an existing template. */
  isEditMode: boolean = false;

  /** Database ID of the template currently undergoing edits. */
  currentTemplateId?: string;

  /** Dynamic tenant token catalog passed down to active editors. */
  editorTokens: any = {};

  /** Cache of installed template blueprints loaded from the backend API. */
  installedTemplates: any[] = [];

  /**
   * The official system categories supported in CMS Template Visual Studio.
   */
  readonly categoryPresets: CategoryPresetItem[] = [
    {
      id: 'menu',
      name: 'Navigation',
      tagline: 'Sticky light corporate navbar with dynamic logo/brand identity, dropdowns, and CTA buttons'
    },
    {
      id: 'hero',
      name: 'Hero Sliders',
      tagline: 'High-impact landing hero loop slider with bold headline, dual CTAs, badge, graphic layout, and Swiper controls'
    },
    {
      id: 'breadcrumb',
      name: 'Breadcrumbs',
      tagline: 'Page hierarchy trails and sub-banners'
    },
    {
      id: 'body',
      name: 'Body Sections',
      tagline: 'Multi-column feature grids, stats, process steps, and modular content sections'
    },
    {
      id: 'footer',
      name: 'Footers',
      tagline: 'Sovereign footers, legal compliance, and social channels'
    },
    {
      id: 'blog',
      name: 'Blog Feed',
      tagline: 'Article cards grid with authors, dates, and categories'
    },
    {
      id: 'blog_detail',
      name: 'Blog Detail',
      tagline: 'In-depth article layout with author bio card and related dispatches'
    }
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
        this.evaluateRouteParams();
      },
      error: () => {
        this.installedTemplates = [];
        this.evaluateRouteParams();
      }
    });
  }

  /**
   * Evaluates route path parameter `:id` or query parameter `category`.
   * If no parameter is provided, leaves category empty so only the Category Selection dropdown is visible.
   */
  evaluateRouteParams(): void {
    const routeId = this.route.snapshot.paramMap.get('id');
    const queryCat = this.route.snapshot.queryParamMap.get('category');

    if (routeId) {
      const normalizedRouteId = routeId.trim().toLowerCase();
      // Match against id, dbId, variantCode, or templateKey
      const found = this.installedTemplates.find(t => {
        const tid = (t.id || '').toString().toLowerCase();
        const tdbId = (t.dbId || '').toString().toLowerCase();
        const tVariant = (t.variantCode || '').toString().toLowerCase();
        const tKey = (t.templateKey || '').toString().toLowerCase();
        return tid === normalizedRouteId || tdbId === normalizedRouteId || tVariant === normalizedRouteId || tKey === normalizedRouteId;
      });

      if (found) {
        const catKey = this.normalizeCategoryKey(found.category || found.categoryKey);
        this.selectedCategory = catKey;
        this.isEditMode = true;
        this.currentTemplateId = found.dbId || found.id || found.variantCode;
        return;
      }

      // If not found in the initial array, directly query backend API by routeId (Guid, VariantCode, or TemplateKey)
      this.api.get<any>(`ContentApi/templates/${encodeURIComponent(routeId)}`).subscribe({
        next: (res) => {
          const t = res?.data || res;
          if (t) {
            const catKey = this.normalizeCategoryKey(t.category || t.categoryKey);
            this.selectedCategory = catKey;
            this.isEditMode = true;
            this.currentTemplateId = t.id || t.dbId || t.variantCode || routeId;
          }
        },
        error: () => {
          if (queryCat) {
            const normalizedCat = this.normalizeCategoryKey(queryCat);
            this.onCategoryChange(normalizedCat);
          }
        }
      });
      return;
    }

    if (queryCat) {
      const normalizedCat = this.normalizeCategoryKey(queryCat);
      this.onCategoryChange(normalizedCat);
    } else {
      // Keep empty: initially only the Category Selection dropdown is shown
      this.selectedCategory = '';
      this.isEditMode = false;
      this.currentTemplateId = undefined;
    }
  }

  /**
   * Handles user selecting a category from the Category Selection dropdown.
   * Reveals the corresponding visual editor workspace and binds any existing installed template.
   * @param catId Selected category key.
   */
  onCategoryChange(catId: string): void {
    if (!catId) {
      this.selectedCategory = '';
      this.currentTemplateId = undefined;
      this.isEditMode = false;
      return;
    }

    const normalized = this.normalizeCategoryKey(catId);
    this.selectedCategory = normalized;

    // Check if an installed template exists for this category
    const matchingTemplate = this.installedTemplates.find(t => {
      const c = this.normalizeCategoryKey(t.category || t.categoryKey);
      return c === normalized;
    });

    if (matchingTemplate) {
      this.currentTemplateId = matchingTemplate.id || matchingTemplate.dbId;
      this.isEditMode = true;
    } else {
      this.currentTemplateId = undefined;
      this.isEditMode = false;
    }
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
    if (lower === 'body' || lower === 'bodysections' || lower === 'section' || lower === 'sections' || lower === 'cards' || lower === 'features' || lower === 'faq') return 'body';
    return 'body';
  }

  /**
   * Unlocks category selection from edit mode and resets the visual studio to the category picker.
   */
  unlockCategory(): void {
    this.selectedCategory = '';
    this.isEditMode = false;
    this.currentTemplateId = undefined;
  }

  /**
   * Callback invoked whenever any child category visual component saves a template.
   * Redirects user back to My Templates page.
   * @param savedData Payload received from child component save event.
   */
  onTemplateSaved(savedData: any): void {
    this.router.navigate(['/content/console/templates']);
  }
}
