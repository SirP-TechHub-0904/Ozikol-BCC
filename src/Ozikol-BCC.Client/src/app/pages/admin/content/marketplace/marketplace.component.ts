import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ApiService } from '../../../../core/services/api.service';
import { ToastService } from '../../../../core/services/toast.service';

export interface MarketCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export interface MarketComponentItem {
  id: string;
  name: string;
  category: string;
  variantCode: string;
  groupCode?: string;
  groupName?: string;
  badge?: string;
  tag: string;
  description: string;
  thumbnailGradient: string;
  previewIcon: string;
  previewSubtitle: string;
  previewTitle: string;
  previewBody: string;
  previewBtnText?: string;
  previewBtnUrl?: string;
  previewImageUrl?: string;
  sectionLists?: { title: string; subtitle?: string; body: string; icon?: string; imageUrl?: string; price?: string; badge?: string }[];
  htmlTemplate: string;
  cssStyles: string;
  jsScript?: string;
}

@Component({
  selector: 'app-marketplace',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="marketplace-page">
      <!-- ========================================================================= -->
      <!-- 1. COMING SOON VIEW (ACTIVE WHEN isComingSoon IS TRUE)                   -->
      <!-- ========================================================================= -->
      <ng-container *ngIf="isComingSoon">
        <!-- Breadcrumb Strip -->
        <div class="page-header-card">
          <div class="breadcrumb-strip">
            <a routerLink="/admin/dashboard">Console</a>
            <span class="sep">/</span>
            <a routerLink="/content/console">CMS Studio</a>
            <span class="sep">/</span>
            <span class="current">UI Marketplace</span>
          </div>
        </div>

        <!-- Main Coming Soon Showcase Hero -->
        <div class="marketplace-coming-soon-hero">
          <div class="cs-content-wrap">
            <!-- Pulsing Beacon Badge -->
            <div class="cs-badge">
              <span class="cs-beacon"></span>
              <span class="material-symbols-outlined cs-badge-icon">widgets</span>
              <span>Coming Soon &bull; UI Marketplace</span>
            </div>

            <!-- Main Bold Heading -->
            <h1 class="cs-main-title">
              COMING SOON
            </h1>
            <h2 class="cs-sub-title">
              Modular Page Blueprints &amp; <span class="cs-gradient-text">Ecosystem Marketplace</span>
            </h2>

            <p class="cs-lead-text">
              We are building a unified ecosystem of customizable page section blueprints, 1-click cloud workspace hydration, and creator monetization. The official marketplace will be launching soon.
            </p>

            <!-- 3 Feature Pillar Cards (Icons Only - No Emojis) -->
            <div class="cs-cards-grid">
              <div class="cs-card">
                <div class="cs-card-icon-box cs-icon--rose">
                  <span class="material-symbols-outlined">palette</span>
                </div>
                <h3 class="cs-card-title">Modular Page Blueprints</h3>
                <p class="cs-card-desc">
                  Pre-designed, tokenized navigation headers, responsive split heroes, pricing tables, bento grids, and multi-column footers with zero CSS collisions.
                </p>
              </div>

              <div class="cs-card">
                <div class="cs-card-icon-box cs-icon--amber">
                  <span class="material-symbols-outlined">bolt</span>
                </div>
                <h3 class="cs-card-title">1-Click Tenant Hydration</h3>
                <p class="cs-card-desc">
                  Instant installation into tenant workspaces with automated brand color inheritance, typography matching, and dark mode support.
                </p>
              </div>

              <div class="cs-card">
                <div class="cs-card-icon-box cs-icon--emerald">
                  <span class="material-symbols-outlined">monetization_on</span>
                </div>
                <h3 class="cs-card-title">Creator Revenue Share</h3>
                <p class="cs-card-desc">
                  Design agencies and UI engineers can publish custom sectional blueprints and earn recurring monthly revenue across cloud tenant organizations.
                </p>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="cs-actions-row">
              <a routerLink="/content/console/templates" class="btn btn-primary-cs" title="View your installed section templates">
                <span class="material-symbols-outlined">layers</span>
                <span>Browse My Templates</span>
                <span class="material-symbols-outlined arrow">arrow_forward</span>
              </a>
              <a routerLink="/content/console" class="btn btn-secondary-cs" title="Return to CMS Studio Dashboard">
                <span class="material-symbols-outlined">dashboard</span>
                <span>Return to CMS Studio</span>
              </a>
            </div>
          </div>
        </div>
      </ng-container>

      <!-- ========================================================================= -->
      <!-- 2. FULL LIVE MARKETPLACE (ACTIVE WHEN isComingSoon IS FALSE)             -->
      <!-- ========================================================================= -->
      <ng-container *ngIf="!isComingSoon">
        <!-- Top Header & AI Magic Actions -->
        <div class="page-header-card">
          <div class="header-main-row">
          <div class="header-left">
            <div class="breadcrumb-strip">
              <a routerLink="/admin/dashboard">Console</a>
              <span class="sep">/</span>
              <a routerLink="/content/console">CMS Studio</a>
              <span class="sep">/</span>
              <span class="current">UI Marketplace</span>
            </div>
            
            <div class="title-with-icon">
              <div class="header-icon-box">
                <span class="material-symbols-outlined">widgets</span>
              </div>
              <div class="title-text-wrap">
                <div class="title-row">
                  <h1 class="page-title">UI Component & Template Marketplace</h1>
                  <span class="badge-total-count">{{ totalComponentsCount }}+ Blocks</span>
                </div>
                <p class="page-subtitle">
                  Explore 9 modular website block categories. Mix, match, and install responsive pre-built components into your template library.
                </p>
              </div>
            </div>
          </div>

          <div class="header-actions">
            <a routerLink="/content/console/templates" class="btn btn-my-templates" title="View your installed section templates library">
              <span class="material-symbols-outlined btn-icon">layers</span>
              <span class="btn-label">My Templates</span>
              <span class="btn-count-pill">{{ installedTemplateIds.size }} Installed</span>
              <span class="material-symbols-outlined arrow-icon">arrow_forward</span>
            </a>
          </div>
        </div>
      </div>

      <!-- Search & Filters Toolbar -->
      <div class="marketplace-toolbar">
        <div class="search-input-wrap">
          <span class="material-symbols-outlined search-icon">search</span>
          <input
            type="text"
            [(ngModel)]="searchQuery"
            (input)="onSearchChange()"
            class="form-control marketplace-search"
            placeholder="Search 36+ modular blocks across 9 categories (e.g., hero, pricing, e-commerce, contact)..."
          />
          <button *ngIf="searchQuery" (click)="searchQuery = ''; onSearchChange()" class="btn-clear-search">✕</button>
        </div>

        <div class="filter-controls">
          <select [(ngModel)]="selectedStyleFilter" (change)="onFilterChange()" class="form-select filter-select">
            <option value="all">All Styles</option>
            <option value="modern">Modern & Clean</option>
            <option value="dark">Dark & Sleek</option>
            <option value="ecommerce">E-Commerce</option>
            <option value="corporate">Enterprise Corporate</option>
          </select>
        </div>
      </div>

      <!-- Category Navigation Tabs -->
      <div class="categories-nav-scroll">
        <button
          type="button"
          class="category-pill"
          [class.active]="selectedCategory === 'all'"
          (click)="setCategory('all')"
        >
          <span class="material-symbols-outlined cat-icon">apps</span>
          <span class="cat-name">All Categories</span>
          <span class="cat-count">{{ allComponents.length }}</span>
        </button>

        <button
          type="button"
          *ngFor="let cat of categories"
          class="category-pill"
          [class.active]="selectedCategory === cat.id"
          (click)="setCategory(cat.id)"
        >
          <span class="material-symbols-outlined cat-icon">{{ cat.icon }}</span>
          <span class="cat-name">{{ cat.name }}</span>
          <span class="cat-count">{{ getCategoryCount(cat.id) }}</span>
        </button>
      </div>

      <!-- Main Marketplace Grid -->
      <div class="marketplace-content">
        <div class="category-header-banner" *ngIf="activeCategoryObj">
          <div class="banner-icon-box">
            <span class="material-symbols-outlined">{{ activeCategoryObj.icon }}</span>
          </div>
          <div>
            <h3 class="banner-title">{{ activeCategoryObj.name }} Catalog</h3>
            <p class="banner-desc">{{ activeCategoryObj.description }} — {{ filteredComponents.length }} production-ready designs available.</p>
          </div>
        </div>

        <!-- Component Cards Grid (3 Columns) -->
        <div class="components-grid" *ngIf="filteredComponents.length > 0">
          <div class="component-card" *ngFor="let item of filteredComponents">
            <!-- Card Micro-Preview Box -->
            <div class="card-preview-container" [style.background]="item.thumbnailGradient">
              <div class="preview-mini-content">
                <span class="material-symbols-outlined preview-watermark">{{ item.previewIcon }}</span>
                <span class="preview-tag" *ngIf="item.badge">{{ item.badge }}</span>
                <div class="mini-mockup-wrapper">
                  <div class="mini-header-sub">{{ item.previewSubtitle }}</div>
                  <div class="mini-header-title">{{ item.previewTitle }}</div>
                  <div class="mini-header-body">{{ item.previewBody }}</div>
                  
                  <!-- List item pills if component has child list items -->
                  <div class="mini-items-row" *ngIf="item.sectionLists && item.sectionLists.length > 0">
                    <div class="mini-chip" *ngFor="let listItem of item.sectionLists.slice(0, 3)">
                      <span class="material-symbols-outlined mini-chip-icon" *ngIf="listItem.icon">{{ listItem.icon }}</span>
                      <span>{{ listItem.title }}</span>
                    </div>
                    <span class="mini-chip-more" *ngIf="item.sectionLists.length > 3">+{{ item.sectionLists.length - 3 }} more</span>
                  </div>
                </div>
              </div>

              <!-- Hover Overlay Actions -->
              <div class="card-hover-overlay" (click)="openPreviewModal(item)">
                <button type="button" class="btn btn-sm btn-overlay-preview">
                  <span class="material-symbols-outlined">{{ getCardButtonIcon(item) }}</span>
                  <span>{{ getCardButtonText(item) }}</span>
                </button>
              </div>
            </div>

            <!-- Card Meta Info -->
            <div class="card-meta-wrap">
              <div class="card-meta-top">
                <span class="card-category-badge">{{ getCategoryName(item.category) }}</span>
                <span class="card-code-tag">{{ item.variantCode }}</span>
              </div>
              <h4 class="card-name" (click)="openPreviewModal(item)">
                {{ item.name }}
                <span class="theme-suite-badge" *ngIf="item.groupName">[{{ item.groupName }}]</span>
              </h4>
              <p class="card-desc">{{ item.description }}</p>

              <div class="card-footer-actions">
                <button type="button" class="btn-card-action" [ngClass]="getCardButtonClass(item)" (click)="openPreviewModal(item)" title="Preview Template">
                  <span class="material-symbols-outlined">{{ getCardButtonIcon(item) }}</span>
                  <span>{{ getCardButtonText(item) }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty Search / Filter State -->
        <div class="empty-state-card" *ngIf="filteredComponents.length === 0">
          <span class="material-symbols-outlined empty-icon">search_off</span>
          <h3>No matching components found</h3>
          <p>Try searching for a different keyword or select another category from the top tabs.</p>
          <button type="button" class="btn btn-outline-primary" (click)="setCategory('all'); searchQuery = ''">Reset Filters</button>
        </div>
      </div>

      <!-- ================================================================= -->
      <!-- MODAL 1: INTERACTIVE DESKTOP & MOBILE LIVE PREVIEW MODAL           -->
      <!-- ================================================================= -->
      <div class="modal-backdrop" *ngIf="showPreviewModal && activePreviewComponent">
        <div class="modal-card preview-modal-card">
          <div class="preview-modal-header">
            <div class="preview-title-info">
              <span class="material-symbols-outlined preview-modal-badge-icon">widgets</span>
              <div>
                <h3 class="preview-modal-name">{{ activePreviewComponent.name }}</h3>
                <span class="preview-modal-sub">{{ getCategoryName(activePreviewComponent.category) }} • Variant {{ activePreviewComponent.variantCode }}</span>
              </div>
            </div>

            <!-- View Mode Switcher: Visual, HTML, CSS, JS -->
            <div class="view-mode-toggle-group">
              <button
                type="button"
                class="view-mode-btn"
                [class.active]="previewTab === 'visual'"
                (click)="previewTab = 'visual'"
              >
                <span class="material-symbols-outlined">visibility</span>
                <span>Visual</span>
              </button>
              <button
                type="button"
                class="view-mode-btn"
                [class.active]="previewTab === 'html'"
                (click)="previewTab = 'html'"
              >
                <span class="material-symbols-outlined">code</span>
                <span>HTML</span>
              </button>
              <button
                type="button"
                class="view-mode-btn"
                [class.active]="previewTab === 'css'"
                (click)="previewTab = 'css'"
              >
                <span class="material-symbols-outlined">css</span>
                <span>CSS</span>
              </button>
              <button
                type="button"
                class="view-mode-btn"
                [class.active]="previewTab === 'js'"
                (click)="previewTab = 'js'"
              >
                <span class="material-symbols-outlined">javascript</span>
                <span>JS</span>
              </button>
            </div>

            <!-- Viewport Switcher (Only visible on Visual Preview Tab) -->
            <div class="viewport-toggle-group" *ngIf="previewTab === 'visual'">
              <button
                type="button"
                class="viewport-btn"
                [class.active]="previewViewport === 'desktop'"
                (click)="previewViewport = 'desktop'"
                title="Desktop View (1200px)"
              >
                <span class="material-symbols-outlined">desktop_windows</span>
                <span>Desktop</span>
              </button>
              <button
                type="button"
                class="viewport-btn"
                [class.active]="previewViewport === 'mobile'"
                (click)="previewViewport = 'mobile'"
                title="Mobile View (375px)"
              >
                <span class="material-symbols-outlined">smartphone</span>
                <span>Mobile</span>
              </button>
            </div>

            <div class="preview-header-right">
              <button type="button" class="btn btn-outline-sm" *ngIf="previewTab !== 'visual'" (click)="copyCodeToClipboard()">
                <span class="material-symbols-outlined">content_copy</span>
                <span>Copy Code</span>
              </button>
              <button type="button" class="btn btn-sm" [ngClass]="getButtonClass(activePreviewComponent)" (click)="installTemplate(activePreviewComponent)" [disabled]="isInstalling">
                <span class="material-symbols-outlined">{{ getButtonIcon(activePreviewComponent) }}</span>
                <span>{{ isInstalling ? 'Installing...' : getButtonText(activePreviewComponent) }}</span>
              </button>
              <button type="button" class="btn-close-modal" (click)="closePreviewModal()">✕</button>
            </div>
          </div>

          <!-- Preview Frame Body -->
          <div class="preview-modal-body" [class.viewport-mobile]="previewViewport === 'mobile' && previewTab === 'visual'" [class.code-mode-body]="previewTab !== 'visual'">
            <!-- TAB 1: Visual Interactive Component Preview -->
            <div class="preview-canvas-wrapper" [class.mobile-device-frame]="previewViewport === 'mobile'" *ngIf="previewTab === 'visual'">
              <div class="rendered-component-box" [ngClass]="activePreviewComponent.variantCode">
                <div class="component-rendered-html" [innerHTML]="safePreviewHtml"></div>
              </div>
            </div>

            <!-- TAB 2: HTML Template Code View -->
            <div class="code-view-container" *ngIf="previewTab === 'html'">
              <div class="code-view-header">
                <span><i class="fa-solid fa-code me-2"></i> Semantic HTML5 Template (with Dynamic Placeholders)</span>
                <span class="code-badge">HTML5</span>
              </div>
              <pre class="code-block"><code>{{ activePreviewComponent.htmlTemplate }}</code></pre>
            </div>

            <!-- TAB 3: Scoped CSS Styles Code View -->
            <div class="code-view-container" *ngIf="previewTab === 'css'">
              <div class="code-view-header">
                <span><i class="fa-solid fa-palette me-2"></i> Scoped CSS Properties (Zero Global Collisions)</span>
                <span class="code-badge">CSS3</span>
              </div>
              <pre class="code-block"><code>{{ activePreviewComponent.cssStyles }}</code></pre>
            </div>

            <!-- TAB 4: Sandboxed JavaScript Code View -->
            <div class="code-view-container" *ngIf="previewTab === 'js'">
              <div class="code-view-header">
                <span><i class="fa-solid fa-bolt me-2 text-warning"></i> Sandboxed JavaScript Execution Hook</span>
                <span class="code-badge">ES6+</span>
              </div>
              <pre class="code-block"><code>{{ activePreviewComponent.jsScript || '// No custom JavaScript required for this lightweight CSS/HTML block.' }}</code></pre>
            </div>
          </div>

          <!-- Preview Modal Footer Bar -->
          <div class="preview-modal-footer">
            <div class="preview-features-info" *ngIf="!isInstalling">
              <span class="feature-tag"><i class="fa-solid fa-check text-success me-1"></i> Pure Scoped CSS & HTML</span>
              <span class="feature-tag"><i class="fa-solid fa-check text-success me-1"></i> Pre-bundled Mock Data</span>
              <span class="feature-tag" *ngIf="activePreviewComponent.sectionLists?.length">
                <i class="fa-solid fa-check text-success me-1"></i> {{ activePreviewComponent.sectionLists?.length }} Sub-Items
              </span>
            </div>

            <!-- Animated 2-Second Install Progress Bar -->
            <div class="install-progress-box" *ngIf="isInstalling">
              <div class="progress-labels">
                <span class="progress-status-msg">
                  <span class="pulse-dot"></span>
                  {{ installStatusMsg }}
                </span>
                <span class="progress-pct">{{ installProgress }}%</span>
              </div>
              <div class="progress-track">
                <div class="progress-fill" [style.width.%]="installProgress"></div>
              </div>
            </div>

            <div class="preview-footer-actions" *ngIf="!isInstalling">
              <button type="button" class="btn btn-outline" (click)="closePreviewModal()">Close</button>
              <button type="button" class="btn" [ngClass]="getButtonClass(activePreviewComponent)" (click)="installTemplate(activePreviewComponent)">
                <span class="material-symbols-outlined">{{ getButtonIcon(activePreviewComponent) }}</span>
                <span>{{ getButtonText(activePreviewComponent) }}</span>
              </button>
              <a routerLink="/content/console/templates" class="btn btn-view-templates" *ngIf="isInstalled(activePreviewComponent.id)" (click)="closePreviewModal()">
                <span class="material-symbols-outlined">layers</span>
                <span>View in My Templates</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- ================================================================= -->
      <!-- MODAL 2: INSERT COMPONENT INTO TARGET PAGE MODAL                   -->
      <!-- ================================================================= -->
      <div class="modal-backdrop" *ngIf="showInsertModal && activeInsertComponent">
        <div class="modal-card insert-modal-card">
          <div class="modal-head">
            <div class="modal-title-wrap">
              <span class="material-symbols-outlined text-indigo">add_to_photos</span>
              <div>
                <h3 class="modal-title">Insert Block into Page</h3>
                <p class="modal-sub">Attach <strong>{{ activeInsertComponent.name }}</strong> to a published or draft web page.</p>
              </div>
            </div>
            <button type="button" class="btn-close-modal" (click)="closeInsertModal()">✕</button>
          </div>

          <div class="modal-body-form">
            <div class="form-group">
              <label class="form-label">Target Web Page</label>
              <select [(ngModel)]="targetPageId" class="form-select">
                <option *ngFor="let page of availablePages" [value]="page.id">{{ page.title }} ({{ page.slug || 'Home' }})</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Placement Position</label>
              <select [(ngModel)]="targetPosition" class="form-select">
                <option value="bottom">Append to Bottom of Page</option>
                <option value="top">Insert at Top of Page (After Hero)</option>
                <option value="hero">Set as Primary Page Hero</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Custom Section Title (Optional)</label>
              <input type="text" [(ngModel)]="customInsertTitle" class="form-control" [placeholder]="activeInsertComponent.previewTitle" />
            </div>

            <div class="insert-summary-card">
              <div class="summary-row">
                <span>Selected Component:</span>
                <strong>{{ activeInsertComponent.name }} ({{ activeInsertComponent.variantCode }})</strong>
              </div>
              <div class="summary-row">
                <span>Category:</span>
                <strong>{{ getCategoryName(activeInsertComponent.category) }}</strong>
              </div>
              <div class="summary-row" *ngIf="activeInsertComponent.sectionLists?.length">
                <span>Child Items:</span>
                <strong>{{ activeInsertComponent.sectionLists?.length }} default items will be created</strong>
              </div>
            </div>
          </div>

          <div class="modal-foot">
            <button type="button" class="btn btn-outline" (click)="closeInsertModal()">Cancel</button>
            <button type="button" class="btn btn-primary" (click)="confirmInsertIntoPage()" [disabled]="inserting">
              <span class="material-symbols-outlined" *ngIf="!inserting">check_circle</span>
              <span>{{ inserting ? 'Inserting Block...' : 'Confirm & Add to Page' }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- ================================================================= -->
      <!-- MODAL 3: MULTIMODAL VISION AI (SCREENSHOT-TO-COMPONENT) MODAL      -->
      <!-- ================================================================= -->
      <div class="modal-backdrop" *ngIf="showAiVisionModal">
        <div class="modal-card ai-tool-modal-card">
          <div class="modal-head">
            <div class="modal-title-wrap">
              <span class="material-symbols-outlined text-purple">photo_camera</span>
              <div>
                <h3 class="modal-title">Clone Layout from Screenshot (Vision AI)</h3>
                <p class="modal-sub">Paste or upload an image of any website section. Vision AI will generate the responsive HTML, scoped CSS, and optimize asset media.</p>
              </div>
            </div>
            <button type="button" class="btn-close-modal" (click)="showAiVisionModal = false">✕</button>
          </div>

          <div class="modal-body-form">
            <!-- Image Dropzone Area -->
            <div class="ai-dropzone-box" (click)="aiFileInput.click()">
              <input type="file" #aiFileInput (change)="onAiImageSelected($event)" accept="image/*" style="display:none;" />
              <div *ngIf="!aiScreenshotPreview" class="dropzone-empty-content">
                <span class="material-symbols-outlined dropzone-large-icon text-purple">add_photo_alternate</span>
                <h4>Click or Drag & Drop Screenshot Here</h4>
                <p>PNG, JPG, WebP up to 10MB (Screenshots of Hero banners, Pricing tables, Feature cards, etc.)</p>
              </div>
              <div *ngIf="aiScreenshotPreview" class="dropzone-selected-preview">
                <img [src]="aiScreenshotPreview" alt="Screenshot" class="ai-uploaded-img" />
                <button type="button" class="btn-change-img" (click)="aiScreenshotPreview = ''; $event.stopPropagation()">Change Image</button>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Target Category</label>
              <select [(ngModel)]="aiVisionCategory" class="form-select">
                <option *ngFor="let cat of categories" [value]="cat.id">{{ cat.name }}</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Special Instructions / Custom Copy (Optional)</label>
              <input type="text" [(ngModel)]="aiVisionInstructions" class="form-control" placeholder="e.g., Use dark theme, change heading to 'Our Core Solutions', use 4 columns..." />
            </div>
          </div>

          <div class="modal-foot">
            <button type="button" class="btn btn-outline" (click)="showAiVisionModal = false">Cancel</button>
            <button type="button" class="btn btn-primary-ai" (click)="executeVisionAiGeneration()" [disabled]="aiGenerating || !aiScreenshotPreview">
              <span class="material-symbols-outlined" *ngIf="!aiGenerating">auto_awesome</span>
              <span>{{ aiGenerating ? 'AI Analyzing Layout & Sourcing Assets...' : 'Clone & Save to Marketplace' }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- ================================================================= -->
      <!-- MODAL 4: NATURAL LANGUAGE PROMPT-TO-SECTION AI MODAL               -->
      <!-- ================================================================= -->
      <div class="modal-backdrop" *ngIf="showAiPromptModal">
        <div class="modal-card ai-tool-modal-card">
          <div class="modal-head">
            <div class="modal-title-wrap">
              <span class="material-symbols-outlined text-indigo">auto_awesome</span>
              <div>
                <h3 class="modal-title">Generate Section with AI Prompt</h3>
                <p class="modal-sub">Describe what section you need in plain English. The AI engine will create HTML, scoped CSS, copy, and visual media.</p>
              </div>
            </div>
            <button type="button" class="btn-close-modal" (click)="showAiPromptModal = false">✕</button>
          </div>

          <div class="modal-body-form">
            <div class="form-group">
              <label class="form-label">Category</label>
              <select [(ngModel)]="aiPromptCategory" class="form-select">
                <option *ngFor="let cat of categories" [value]="cat.id">{{ cat.name }}</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Prompt Description</label>
              <textarea
                [(ngModel)]="aiPromptText"
                rows="4"
                class="form-control"
                placeholder="e.g., Create a high-converting 3-column pricing section for an enterprise SaaS platform with monthly/yearly billing toggle, checkmark feature list, and popular badge on tier 2..."
              ></textarea>
            </div>

            <div class="ai-prompt-chips">
              <span class="chips-label">Quick Ideas:</span>
              <button type="button" class="prompt-chip" (click)="aiPromptText = 'Modern 4-column e-commerce product showcase with price badges and hover zoom'">E-Commerce 4-Col</button>
              <button type="button" class="prompt-chip" (click)="aiPromptText = 'Split video hero banner with high-contrast text and dual CTA buttons'">Split Video Hero</button>
              <button type="button" class="prompt-chip" (click)="aiPromptText = 'Interactive multi-office contact section with live status badges'">Office Contact Grid</button>
            </div>
          </div>

          <div class="modal-foot">
            <button type="button" class="btn btn-outline" (click)="showAiPromptModal = false">Cancel</button>
            <button type="button" class="btn btn-primary-ai" (click)="executePromptAiGeneration()" [disabled]="aiGenerating || !aiPromptText">
              <span class="material-symbols-outlined" *ngIf="!aiGenerating">magic_button</span>
              <span>{{ aiGenerating ? 'Generating Section & Copy...' : 'Generate & Add to Marketplace' }}</span>
            </button>
          </div>
        </div>
      </div>
      </ng-container>
    </div>
  `,
  styles: [`
    /* Coming Soon Hero Screen */
    .marketplace-coming-soon-hero {
      background: radial-gradient(circle at 50% 10%, rgba(0, 80, 229, 0.12) 0%, rgba(15, 23, 42, 0.98) 70%),
                  linear-gradient(135deg, #090d16 0%, #0f172a 50%, #1e1b4b 100%);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 70px 24px 80px 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
      position: relative;
      overflow: hidden;
      margin-top: 8px;
    }

    .cs-content-wrap {
      max-width: 960px;
      margin: 0 auto;
      text-align: center;
      position: relative;
      z-index: 2;
    }

    .cs-badge {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      background: rgba(0, 80, 229, 0.18);
      border: 1px solid rgba(0, 80, 229, 0.5);
      border-radius: 9999px;
      padding: 8px 22px;
      margin-bottom: 24px;
      font-size: 13px;
      font-weight: 700;
      color: #60a5fa;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      box-shadow: 0 0 25px rgba(0, 80, 229, 0.3);
    }

    .cs-badge-icon {
      font-size: 18px;
    }

    .cs-beacon {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #3b82f6;
      box-shadow: 0 0 12px #60a5fa;
      animation: csPulse 1.8s infinite ease-in-out;
    }

    @keyframes csPulse {
      0%, 100% {
        transform: scale(1);
        opacity: 0.8;
      }
      50% {
        transform: scale(1.6);
        opacity: 1;
      }
    }

    .cs-main-title {
      font-size: 54px;
      font-weight: 900;
      letter-spacing: -0.03em;
      line-height: 1.1;
      margin: 0 0 12px 0;
      color: #ffffff;
      text-shadow: 0 2px 20px rgba(0, 80, 229, 0.4);
    }

    .cs-sub-title {
      font-size: 26px;
      font-weight: 700;
      line-height: 1.3;
      margin: 0 0 20px 0;
      color: #94a3b8;
    }

    .cs-gradient-text {
      background: linear-gradient(135deg, #60a5fa 0%, #a855f7 50%, #f43f5e 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .cs-lead-text {
      font-size: 16.5px;
      line-height: 1.65;
      color: #cbd5e1;
      max-width: 720px;
      margin: 0 auto 48px auto;
    }

    .cs-cards-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 22px;
      margin-bottom: 48px;
      text-align: left;
    }

    .cs-card {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.09);
      border-radius: 14px;
      padding: 26px 22px;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
    }

    .cs-card:hover {
      transform: translateY(-4px);
      border-color: rgba(96, 165, 250, 0.5);
      background: rgba(255, 255, 255, 0.07);
    }

    .cs-card-icon-box {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;
    }

    .cs-card-icon-box .material-symbols-outlined {
      font-size: 26px;
    }

    .cs-icon--rose {
      background: rgba(244, 63, 94, 0.15);
      border: 1px solid rgba(244, 63, 94, 0.35);
      color: #fb7185;
    }

    .cs-icon--amber {
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid rgba(245, 158, 11, 0.35);
      color: #fbbf24;
    }

    .cs-icon--emerald {
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.35);
      color: #34d399;
    }

    .cs-card-title {
      font-size: 17px;
      font-weight: 700;
      color: #ffffff;
      margin: 0 0 8px 0;
    }

    .cs-card-desc {
      font-size: 13.5px;
      line-height: 1.55;
      color: #94a3b8;
      margin: 0;
    }

    .cs-actions-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      flex-wrap: wrap;
    }

    .btn-primary-cs {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      background: linear-gradient(135deg, #0050e5 0%, #2563eb 100%);
      color: #ffffff;
      border: none;
      border-radius: 10px;
      padding: 13px 26px;
      font-size: 14.5px;
      font-weight: 600;
      text-decoration: none;
      box-shadow: 0 4px 16px rgba(0, 80, 229, 0.4);
      transition: all 0.2s ease;
    }

    .btn-primary-cs:hover {
      background: linear-gradient(135deg, #003bb5 0%, #1d4ed8 100%);
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0, 80, 229, 0.5);
      color: #ffffff;
    }

    .btn-secondary-cs {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      background: rgba(255, 255, 255, 0.08);
      color: #e2e8f0;
      border: 1px solid rgba(255, 255, 255, 0.18);
      border-radius: 10px;
      padding: 13px 24px;
      font-size: 14.5px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s ease;
    }

    .btn-secondary-cs:hover {
      background: rgba(255, 255, 255, 0.14);
      border-color: rgba(255, 255, 255, 0.35);
      color: #ffffff;
      transform: translateY(-2px);
    }

    .btn-primary-cs .arrow {
      font-size: 18px;
      transition: transform 0.15s ease;
    }

    .btn-primary-cs:hover .arrow {
      transform: translateX(3px);
    }

    .marketplace-page {
      padding: 24px 32px 64px 32px;
      max-width: 1600px;
      margin: 0 auto;
      box-sizing: border-box;
    }

    /* Header Card */
    .page-header-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 22px 26px;
      margin-bottom: 22px;
      box-shadow: 0 2px 10px rgba(15, 23, 42, 0.04);
    }
    .header-main-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 24px;
      flex-wrap: wrap;
    }
    .header-left {
      flex: 1;
      min-width: 320px;
    }
    .breadcrumb-strip {
      display: flex;
      align-items: center;
      gap: 7px;
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
      margin-bottom: 10px;
    }
    .breadcrumb-strip a { color: #64748b; text-decoration: none; transition: color 0.15s ease; }
    .breadcrumb-strip a:hover { color: #0050e5; }
    .breadcrumb-strip .sep { color: #cbd5e1; }
    .breadcrumb-strip .current { color: #0f172a; font-weight: 700; }

    .title-with-icon {
      display: flex;
      align-items: flex-start;
      gap: 14px;
    }
    .header-icon-box {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%);
      color: #4f46e5;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: inset 0 1px 1px rgba(255,255,255,0.8), 0 2px 6px rgba(79, 70, 229, 0.12);
    }
    .header-icon-box .material-symbols-outlined {
      font-size: 24px;
    }
    .title-text-wrap {
      flex: 1;
    }
    .title-row {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      margin-bottom: 4px;
    }
    .page-title {
      font-size: 21px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.02em;
      margin: 0;
    }
    .badge-total-count {
      font-size: 11.5px;
      font-weight: 700;
      background: #eff6ff;
      color: #0050e5;
      padding: 3px 9px;
      border-radius: 20px;
      border: 1px solid #bfdbfe;
      letter-spacing: 0.02em;
    }
    .page-subtitle {
      font-size: 13px;
      color: #64748b;
      margin: 0;
      line-height: 1.5;
      max-width: 760px;
    }

    /* Actions Bar */
    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .btn-my-templates {
      height: 46px;
      padding: 0 20px;
      border-radius: 12px;
      background: linear-gradient(135deg, #0050e5 0%, #1d4ed8 100%);
      border: 1px solid #1e40af;
      color: #ffffff !important;
      font-size: 14px;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
      transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 4px 14px rgba(0, 80, 229, 0.35);
      cursor: pointer;
    }
    .btn-my-templates:hover {
      background: linear-gradient(135deg, #0041ba 0%, #1e40af 100%);
      box-shadow: 0 6px 22px rgba(0, 80, 229, 0.5);
      transform: translateY(-2px);
      color: #ffffff !important;
    }
    .btn-my-templates:active {
      transform: translateY(0);
      box-shadow: 0 2px 8px rgba(0, 80, 229, 0.3);
    }
    .btn-label {
      letter-spacing: -0.01em;
    }
    .btn-count-pill {
      background: rgba(255, 255, 255, 0.22);
      color: #ffffff;
      font-size: 11.5px;
      font-weight: 800;
      padding: 3px 9px;
      border-radius: 20px;
      border: 1px solid rgba(255, 255, 255, 0.35);
      text-align: center;
      line-height: 1.3;
      backdrop-filter: blur(4px);
    }
    .btn-my-templates:hover .btn-count-pill {
      background: #ffffff;
      color: #0050e5;
      border-color: #ffffff;
    }
    .btn-icon {
      font-size: 21px;
      color: #93c5fd;
    }
    .btn-my-templates:hover .btn-icon {
      color: #ffffff;
    }
    .arrow-icon {
      font-size: 18px;
      margin-left: 2px;
      transition: transform 0.2s ease;
      color: #bfdbfe;
    }
    .btn-my-templates:hover .arrow-icon {
      transform: translateX(3px);
      color: #ffffff;
    }

    /* Toolbar */
    .marketplace-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      margin-bottom: 20px;
      background: #ffffff;
      padding: 14px 18px;
      border-radius: 12px;
      border: 1.5px solid #e2e8f0;
      box-shadow: 0 2px 8px rgba(0,0,0,0.03);
    }
    .search-input-wrap {
      position: relative;
      flex: 1;
      display: flex;
      align-items: center;
    }
    .search-icon {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      color: #94a3b8;
      font-size: 20px;
      pointer-events: none;
      z-index: 2;
    }
    .marketplace-search,
    input.marketplace-search.form-control {
      width: 100%;
      height: 42px;
      padding-left: 44px !important;
      padding-right: 40px !important;
      padding-top: 8px;
      padding-bottom: 8px;
      border: 1.5px solid #cbd5e1;
      border-radius: 9px;
      font-size: 13.5px;
      color: #0f172a;
      background: #ffffff;
      box-sizing: border-box;
    }
    .marketplace-search:focus,
    input.marketplace-search.form-control:focus {
      outline: none;
      border-color: #0050e5;
      box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.15);
    }
    .btn-clear-search {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      background: #f1f5f9;
      border: none;
      color: #64748b;
      cursor: pointer;
      font-size: 12px;
      font-weight: 800;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2;
      transition: 0.15s ease;
    }
    .btn-clear-search:hover {
      background: #e2e8f0;
      color: #0f172a;
    }
    .filter-select {
      padding: 10px 14px;
      border: 1.5px solid #cbd5e1;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      color: #0f172a;
      background: #ffffff;
      cursor: pointer;
    }

    /* Category Navigation Scrollable Pills */
    .categories-nav-scroll {
      display: flex;
      gap: 10px;
      overflow-x: auto;
      padding-bottom: 12px;
      margin-bottom: 24px;
    }
    .categories-nav-scroll::-webkit-scrollbar { height: 5px; }
    .categories-nav-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
    .category-pill {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      border-radius: 10px;
      border: 1.5px solid #e2e8f0;
      background: #ffffff;
      color: #475569;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
      transition: 0.15s ease;
    }
    .category-pill:hover {
      border-color: #cbd5e1;
      background: #f8fafc;
      color: #0f172a;
    }
    .category-pill.active {
      background: #4f46e5;
      color: #ffffff;
      border-color: #4f46e5;
      box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);
    }
    .cat-icon { font-size: 18px; }
    .cat-count {
      font-size: 11px;
      font-weight: 800;
      background: rgba(0,0,0,0.06);
      padding: 2px 7px;
      border-radius: 12px;
    }
    .category-pill.active .cat-count {
      background: rgba(255,255,255,0.25);
      color: #ffffff;
    }

    /* Category Banner */
    .category-header-banner {
      display: flex;
      align-items: center;
      gap: 14px;
      background: #f8fafc;
      border: 1.5px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px 20px;
      margin-bottom: 20px;
    }
    .banner-icon-box {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      background: #eef2ff;
      color: #4f46e5;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .banner-icon-box .material-symbols-outlined { font-size: 24px; }
    .banner-title { font-size: 15px; font-weight: 800; color: #0f172a; margin: 0 0 2px 0; }
    .banner-desc { font-size: 12.5px; color: #64748b; margin: 0; }

    /* 3-Column Components Grid */
    .components-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 24px;
    }
    @media (max-width: 1200px) {
      .components-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media (max-width: 768px) {
      .components-grid { grid-template-columns: 1fr; }
    }

    /* Component Card */
    .component-card {
      background: #ffffff;
      border: 1.5px solid #e2e8f0;
      border-radius: 14px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 4px 16px rgba(0,0,0,0.03);
      transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
    }
    .component-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 28px rgba(0,0,0,0.08);
      border-color: #cbd5e1;
    }

    /* Card Preview Box */
    .card-preview-container {
      height: 200px;
      position: relative;
      padding: 16px;
      box-sizing: border-box;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .preview-watermark {
      position: absolute;
      right: 12px;
      bottom: 12px;
      font-size: 72px;
      opacity: 0.12;
      color: #ffffff;
      pointer-events: none;
    }
    .preview-tag {
      position: absolute;
      top: 12px;
      right: 12px;
      background: rgba(0,0,0,0.65);
      color: #ffffff;
      font-size: 10.5px;
      font-weight: 800;
      padding: 3px 8px;
      border-radius: 6px;
      backdrop-filter: blur(4px);
    }
    .mini-mockup-wrapper {
      background: rgba(255,255,255,0.94);
      backdrop-filter: blur(8px);
      border-radius: 10px;
      padding: 14px 16px;
      width: 90%;
      box-shadow: 0 8px 20px rgba(0,0,0,0.15);
      text-align: left;
      border: 1px solid rgba(255,255,255,0.8);
    }
    .mini-header-sub {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      color: #4f46e5;
      letter-spacing: 0.05em;
    }
    .mini-header-title {
      font-size: 13px;
      font-weight: 800;
      color: #0f172a;
      margin: 2px 0 4px 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .mini-header-body {
      font-size: 11px;
      color: #64748b;
      line-height: 1.35;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .mini-items-row {
      display: flex;
      gap: 6px;
      margin-top: 8px;
      flex-wrap: wrap;
    }
    .mini-chip {
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 2px 6px;
      font-size: 9.5px;
      font-weight: 700;
      color: #334155;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .mini-chip-icon { font-size: 11px; color: #4f46e5; }
    .mini-chip-more { font-size: 9.5px; color: #94a3b8; font-weight: 700; align-self: center; }

    /* Hover Overlay */
    .card-hover-overlay {
      position: absolute;
      inset: 0;
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(3px);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      opacity: 0;
      transition: opacity 0.2s ease;
      z-index: 5;
    }
    .component-card:hover .card-hover-overlay { opacity: 1; }
    .btn-overlay-preview {
      background: #ffffff;
      color: #0f172a;
      border: none;
      border-radius: 8px;
      padding: 8px 16px;
      font-size: 12.5px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      transition: transform 0.15s ease;
    }
    .btn-overlay-preview:hover { transform: scale(1.04); }
    .btn-overlay-insert {
      background: #4f46e5;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      padding: 8px 16px;
      font-size: 12.5px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      transition: transform 0.15s ease;
    }
    .btn-overlay-insert:hover { transform: scale(1.04); background: #4338ca; }

    /* Card Meta */
    .card-meta-wrap {
      padding: 16px;
      display: flex;
      flex-direction: column;
      flex: 1;
    }
    .card-meta-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }
    .card-category-badge {
      font-size: 11px;
      font-weight: 700;
      color: #4f46e5;
      background: #eef2ff;
      padding: 2px 8px;
      border-radius: 6px;
    }
    .card-code-tag {
      font-size: 10.5px;
      font-weight: 700;
      color: #94a3b8;
      font-family: monospace;
    }
    .theme-suite-badge {
      display: inline-block;
      font-size: 0.6875rem;
      font-weight: 700;
      color: #0284c7;
      background: #e0f2fe;
      padding: 1px 6px;
      border-radius: 4px;
      letter-spacing: 0.02em;
      margin-left: 6px;
      vertical-align: middle;
    }
    .card-name {
      font-size: 14.5px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 6px 0;
      cursor: pointer;
    }
    .card-name:hover { color: #4f46e5; }
    .card-desc {
      font-size: 12px;
      color: #64748b;
      margin: 0 0 16px 0;
      line-height: 1.4;
      flex: 1;
    }
    .card-footer-actions {
      display: flex;
      gap: 8px;
      border-top: 1px solid #f1f5f9;
      padding-top: 12px;
    }
    .btn-card-action {
      width: 100%;
      height: 38px;
      border: 1.5px solid #e2e8f0;
      border-radius: 8px;
      background: #ffffff;
      color: #475569;
      font-size: 12.5px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-card-action:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.06);
    }
    .btn-card-primary {
      background: #ecfdf5;
      color: #059669;
      border-color: #a7f3d0;
    }
    .btn-card-primary:hover {
      background: #10b981;
      color: #ffffff;
      border-color: #10b981;
    }
    .btn-card-replace {
      background: #f5f3ff;
      color: #4f46e5;
      border-color: #c7d2fe;
    }
    .btn-card-replace:hover {
      background: #4f46e5;
      color: #ffffff;
      border-color: #4f46e5;
    }
    .btn-card-installed {
      background: #d1fae5;
      color: #047857;
      border-color: #6ee7b7;
    }
    .btn-card-installed:hover {
      background: #059669;
      color: #ffffff;
      border-color: #059669;
    }

    /* Empty State */
    .empty-state-card {
      text-align: center;
      padding: 60px 20px;
      background: #ffffff;
      border: 1.5px dashed #cbd5e1;
      border-radius: 14px;
      margin-top: 20px;
    }
    .empty-icon { font-size: 48px; color: #94a3b8; margin-bottom: 12px; }
    .empty-state-card h3 { font-size: 18px; font-weight: 800; color: #0f172a; margin: 0 0 6px 0; }
    .empty-state-card p { font-size: 13.5px; color: #64748b; margin: 0 0 16px 0; }

    /* Modals Common */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.7);
      backdrop-filter: blur(4px);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      box-sizing: border-box;
    }
    .modal-card {
      background: #ffffff;
      border-radius: 16px;
      width: 100%;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.35);
      display: flex;
      flex-direction: column;
      max-height: 90vh;
      overflow: hidden;
      animation: modalSlide 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes modalSlide {
      from { transform: translateY(12px) scale(0.98); opacity: 0; }
      to { transform: translateY(0) scale(1); opacity: 1; }
    }

    /* Live Preview Modal (Large) */
    .preview-modal-card {
      max-width: 1300px;
      height: 88vh;
    }
    .preview-modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 20px;
      border-bottom: 1.5px solid #e2e8f0;
      background: #f8fafc;
      gap: 16px;
    }
    .preview-title-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .preview-modal-badge-icon {
      font-size: 26px;
      color: #4f46e5;
      background: #eef2ff;
      padding: 6px;
      border-radius: 8px;
    }
    .preview-modal-name { font-size: 16px; font-weight: 800; color: #0f172a; margin: 0; }
    .preview-modal-sub { font-size: 12px; color: #64748b; font-weight: 600; }

    /* View Mode Tabs (Visual, HTML, CSS, JS) */
    .view-mode-toggle-group {
      display: flex;
      background: #e2e8f0;
      padding: 3px;
      border-radius: 8px;
      gap: 2px;
    }
    .view-mode-btn {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 6px 12px;
      border-radius: 6px;
      border: none;
      background: none;
      font-size: 12px;
      font-weight: 700;
      color: #475569;
      cursor: pointer;
      transition: 0.15s ease;
    }
    .view-mode-btn.active {
      background: #4f46e5;
      color: #ffffff;
      box-shadow: 0 2px 6px rgba(79, 70, 229, 0.3);
    }
    .view-mode-btn .material-symbols-outlined { font-size: 16px; }

    /* Viewport Switcher */
    .viewport-toggle-group {
      display: flex;
      background: #e2e8f0;
      padding: 3px;
      border-radius: 8px;
      gap: 2px;
    }
    .viewport-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 6px;
      border: none;
      background: none;
      font-size: 12px;
      font-weight: 700;
      color: #475569;
      cursor: pointer;
      transition: 0.15s ease;
    }
    .viewport-btn.active {
      background: #ffffff;
      color: #0f172a;
      box-shadow: 0 2px 6px rgba(0,0,0,0.1);
    }
    .btn-outline-sm {
      background: #ffffff;
      border: 1.5px solid #cbd5e1;
      color: #0f172a;
      border-radius: 7px;
      padding: 6px 12px;
      font-size: 12px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
    }
    .btn-outline-sm:hover { background: #f1f5f9; }
    .preview-header-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .btn-close-modal {
      background: none;
      border: none;
      font-size: 20px;
      font-weight: 700;
      color: #64748b;
      cursor: pointer;
    }
    .btn-close-modal:hover { color: #0f172a; }

    /* Code View Mode */
    .preview-modal-body.code-mode-body {
      background: #090d16;
      padding: 20px 30px;
      display: block;
    }
    .code-view-container {
      max-width: 1100px;
      margin: 0 auto;
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 20px 40px rgba(0,0,0,0.4);
    }
    .code-view-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #1e293b;
      padding: 10px 18px;
      font-size: 12px;
      font-weight: 700;
      color: #94a3b8;
    }
    .code-badge {
      background: #334155;
      color: #38bdf8;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-family: monospace;
      font-weight: 800;
    }
    .code-block {
      margin: 0;
      padding: 20px;
      background: #0f172a;
      color: #e2e8f0;
      font-family: 'Fira Code', Consolas, Monaco, monospace;
      font-size: 12.5px;
      line-height: 1.6;
      max-height: 55vh;
      overflow-y: auto;
      white-space: pre-wrap;
      word-break: break-all;
    }

    /* Preview Canvas Area */
    .preview-modal-body {
      flex: 1;
      overflow-y: auto;
      background: #0f172a;
      padding: 30px;
      display: flex;
      align-items: flex-start;
      justify-content: center;
    }
    .preview-canvas-wrapper {
      width: 100%;
      max-width: 1200px;
      background: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 20px 40px rgba(0,0,0,0.4);
      transition: width 0.3s ease;
    }
    .preview-modal-body.viewport-mobile .preview-canvas-wrapper {
      max-width: 375px;
      border-radius: 32px;
      border: 8px solid #334155;
    }
    .rendered-component-box { width: 100%; box-sizing: border-box; }

    /* Preview Modal Footer */
    .preview-modal-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 20px;
      background: #ffffff;
      border-top: 1.5px solid #e2e8f0;
    }
    .preview-features-info {
      display: flex;
      gap: 12px;
    }
    .feature-tag {
      font-size: 11.5px;
      font-weight: 700;
      color: #166534;
      background: #dcfce7;
      padding: 3px 8px;
      border-radius: 6px;
    }
    .preview-footer-actions {
      display: flex;
      gap: 10px;
    }

    /* Insert & AI Modals */
    .insert-modal-card, .ai-tool-modal-card { max-width: 540px; }
    .modal-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 18px 24px;
      border-bottom: 1px solid #e2e8f0;
    }
    .modal-title-wrap { display: flex; align-items: center; gap: 12px; }
    .modal-title { font-size: 16px; font-weight: 800; color: #0f172a; margin: 0 0 2px 0; }
    .modal-sub { font-size: 12.5px; color: #64748b; margin: 0; }
    .modal-body-form {
      padding: 20px 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      overflow-y: auto;
    }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-label { font-size: 12.5px; font-weight: 700; color: #334155; }
    .form-control, .form-select {
      padding: 10px 12px;
      border: 1.5px solid #cbd5e1;
      border-radius: 8px;
      font-size: 13.5px;
      color: #0f172a;
      box-sizing: border-box;
    }
    .form-control:focus, .form-select:focus {
      outline: none;
      border-color: #4f46e5;
      box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15);
    }
    .insert-summary-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 12px;
    }
    .summary-row { display: flex; justify-content: space-between; color: #64748b; }
    .summary-row strong { color: #0f172a; }
    .modal-foot {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding: 14px 24px;
      border-top: 1px solid #e2e8f0;
      background: #f8fafc;
    }

    /* AI Dropzone Box */
    .ai-dropzone-box {
      border: 2px dashed #c084fc;
      background: #faf5ff;
      border-radius: 12px;
      padding: 28px 20px;
      text-align: center;
      cursor: pointer;
      transition: 0.15s ease;
    }
    .ai-dropzone-box:hover {
      background: #f3e8ff;
      border-color: #a855f7;
    }
    .dropzone-large-icon { font-size: 40px; margin-bottom: 8px; }
    .ai-dropzone-box h4 { font-size: 14px; font-weight: 800; color: #581c87; margin: 0 0 4px 0; }
    .ai-dropzone-box p { font-size: 11.5px; color: #7e22ce; margin: 0; }
    .ai-uploaded-img { max-height: 160px; max-width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .btn-change-img {
      margin-top: 10px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 4px 10px;
      font-size: 11.5px;
      font-weight: 700;
      cursor: pointer;
    }

    /* AI Prompt Chips */
    .ai-prompt-chips {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }
    .chips-label { font-size: 11.5px; font-weight: 700; color: #64748b; }
    .prompt-chip {
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      padding: 4px 10px;
      font-size: 11px;
      font-weight: 700;
      color: #334155;
      cursor: pointer;
      transition: 0.15s ease;
    }
    .prompt-chip:hover { background: #eef2ff; color: #4f46e5; border-color: #c7d2fe; }

    /* Common Buttons */
    .btn {
      padding: 9px 18px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border: none;
    }
    .btn-primary { background: #0050e5; color: #ffffff; }
    .btn-primary:hover { background: #0041ba; }
    .btn-outline { background: #ffffff; border: 1.5px solid #cbd5e1; color: #334155; }
    .btn-outline:hover { background: #f8fafc; border-color: #94a3b8; }
    .btn-outline-primary { background: #ffffff; border: 1.5px solid #4f46e5; color: #4f46e5; }
    .btn-outline-primary:hover { background: #4f46e5; color: #ffffff; }

    /* My Templates Link Button in Header */
    .btn-outline-templates {
      background: #ffffff;
      border: 1.5px solid #4f46e5;
      color: #4f46e5;
      padding: 9px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: 0.15s ease;
    }
    .btn-outline-templates:hover { background: #4f46e5; color: #ffffff; }

    /* Installed Button State (Green) */
    .btn-installed {
      background: #10b981 !important;
      color: #ffffff !important;
      border-color: #10b981 !important;
    }
    .btn-installed:hover { background: #059669 !important; }

    /* Replace Active Singleton (Menu / Footer) Button State */
    .btn-replace {
      background: #4f46e5 !important;
      color: #ffffff !important;
      border-color: #4f46e5 !important;
    }
    .btn-replace:hover { background: #4338ca !important; }

    .btn-view-templates {
      background: #eef2ff;
      color: #4f46e5;
      border: 1.5px solid #c7d2fe;
      padding: 9px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn-view-templates:hover { background: #4f46e5; color: #fff; }

    /* Animated 2-Second Install Progress Bar in Modal */
    .install-progress-box {
      flex: 1;
      max-width: 550px;
      padding: 6px 0;
    }
    .progress-labels {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .progress-status-msg {
      font-size: 12.5px;
      font-weight: 700;
      color: #4f46e5;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .pulse-dot {
      width: 8px;
      height: 8px;
      background: #4f46e5;
      border-radius: 50%;
      display: inline-block;
      animation: pulseAnim 1s infinite alternate;
    }
    @keyframes pulseAnim {
      from { transform: scale(0.8); opacity: 0.5; }
      to { transform: scale(1.3); opacity: 1; }
    }
    .progress-pct {
      font-size: 12.5px;
      font-weight: 800;
      color: #0f172a;
      font-family: monospace;
    }
    .progress-track {
      width: 100%;
      height: 10px;
      background: #e2e8f0;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #4f46e5 0%, #0050e5 50%, #10b981 100%);
      border-radius: 20px;
      transition: width 0.06s ease;
    }
  `]
})
export class MarketplaceComponent implements OnInit, OnDestroy {
  /**
   * When true, displays the high-impact Coming Soon screen.
   * When false, renders the full interactive component & template marketplace catalog.
   */
  isComingSoon: boolean = true;

  // Category Definitions
  categories: MarketCategory[] = [
    { id: 'menu', name: 'Navigation & Menu', icon: 'menu', description: 'Header navigation bars, responsive mobile drawers, and megamenus' },
    { id: 'hero', name: 'Hero & Sliders', icon: 'view_carousel', description: 'Above-the-fold dynamic hero units, video banners, and split product showcases' },
    { id: 'body', name: 'Body Sections & Lists', icon: 'view_quilt', description: 'Feature grids, company story, milestone counters, and pricing matrices' },
    { id: 'footer', name: 'Footers', icon: 'dock_to_bottom', description: 'Multi-column corporate footers, minimal dark bars, and newsletter footers' },
    { id: 'newsletter', name: 'Newsletter & Forms', icon: 'mail', description: 'Lead magnets, inline subscribe bars, and high-conversion signup forms' },
    { id: 'contact', name: 'Contact Us Blocks', icon: 'contact_mail', description: 'Map + form split blocks, multi-office cards, and inquiry forms' },
    { id: 'blog', name: 'Blogs & News', icon: 'newspaper', description: '3-column article cards, masonry layouts, and featured post heroes' },
    { id: 'ecommerce', name: 'E-Commerce Showcase', icon: 'shopping_bag', description: '4-column product grids, deal carousels, and category tiles' },
    { id: 'breadcrumb', name: 'Breadcrumbs & Headers', icon: 'linear_scale', description: 'Inner page title banners, minimal breadcrumbs, and dark headers' }
  ];

  selectedCategory: string = 'all';
  searchQuery: string = '';
  selectedStyleFilter: string = 'all';

  // 36 Starter Test Components (4 for each of the 9 categories)
  allComponents: MarketComponentItem[] = [
    // -------------------------------------------------------------
    // 1. Navigation & Menu (4 Starter Blocks)
    // -------------------------------------------------------------
    {
      id: 'menu-01',
      name: 'Classic Light Corporate Navbar',
      category: 'menu',
      variantCode: 'Menu_Classic',
      groupCode: 'apex-commerce',
      groupName: 'Apex Commerce Pro',
      badge: 'Popular',
      tag: 'corporate',
      description: 'Clean light corporate navbar with brand logo, centered navigation links, and right Get Started CTA button.',
      thumbnailGradient: 'linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%)',
      previewIcon: 'menu',
      previewSubtitle: 'Header Navigation',
      previewTitle: 'Apex Corporate Navbar',
      previewBody: 'Features • Solutions • Pricing • Company • Contact',
      htmlTemplate: `
        <nav class="oz-nav-classic">
          <div class="oz-nav-brand-row">
            <a href="#" class="oz-brand-link">
              <img src="https://res.cloudinary.com/dsmclttal/image/upload/v1718000000/branding/brand-logo-dark.svg"
                   onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 160 40\\' fill=\\'none\\'><rect width=\\'38\\' height=\\'38\\' rx=\\'9\\' fill=\\'%230050E5\\'/><path d=\\'M13 25V13L25 25V13\\' stroke=\\'white\\' stroke-width=\\'3\\' stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\'/><text x=\\'48\\' y=\\'25\\' font-family=\\'system-ui, -apple-system, sans-serif\\' font-size=\\'16\\' font-weight=\\'800\\' fill=\\'%230F172A\\' letter-spacing=\\'0.5\\'>OZIKOL<tspan fill=\\'%230050E5\\'>.BCC</tspan></text></svg>'"
                   alt="Brand Logo" class="oz-brand-logo-img" />
            </a>
            <button type="button" class="oz-mobile-toggle" onclick="this.closest('.oz-nav-classic').classList.toggle('oz-menu-open')">
              <span class="oz-toggle-bar"></span>
              <span class="oz-toggle-bar"></span>
              <span class="oz-toggle-bar"></span>
            </button>
          </div>
          <div class="oz-nav-links">
            <a href="#">Overview</a>
            <a href="#">Solutions</a>
            <a href="#">Products</a>
            <a href="#">Pricing</a>
            <a href="#">Contact</a>
          </div>
          <div class="oz-nav-cta">
            <a href="#" class="oz-btn-nav">Get Started</a>
          </div>
        </nav>
      `,
      cssStyles: `
        .oz-nav-classic { display: flex; justify-content: space-between; align-items: center; padding: 16px 32px; background: #ffffff; border-bottom: 1px solid #e2e8f0; font-family: Inter, sans-serif; position: relative; }
        .oz-nav-brand-row { display: flex; justify-content: space-between; align-items: center; }
        .oz-brand-link { display: inline-flex; align-items: center; text-decoration: none; }
        .oz-brand-logo-img { height: 36px; max-height: 38px; width: auto; object-fit: contain; display: block; }
        .oz-mobile-toggle { display: none; background: none; border: none; cursor: pointer; padding: 6px; flex-direction: column; gap: 5px; }
        .oz-toggle-bar { display: block; width: 22px; height: 2px; background: #0f172a; border-radius: 2px; }
        .oz-nav-links { display: flex; gap: 24px; }
        .oz-nav-links a { color: #475569; text-decoration: none; font-size: 13.5px; font-weight: 600; transition: color 0.15s; }
        .oz-nav-links a:hover { color: #0050e5; }
        .oz-btn-nav { background: #0050e5; color: #fff; padding: 8px 16px; border-radius: 7px; text-decoration: none; font-size: 13px; font-weight: 700; display: inline-block; }

        /* Mobile Viewport & Screen Breakpoint */
        @media(max-width: 768px), (max-width: 100%) {
          .viewport-mobile .oz-nav-classic,
          .oz-nav-classic.oz-mobile-preview {
            flex-direction: column;
            align-items: stretch;
            padding: 16px 20px;
          }
          .viewport-mobile .oz-nav-brand-row,
          .oz-nav-classic.oz-mobile-preview .oz-nav-brand-row {
            width: 100%;
          }
          .viewport-mobile .oz-mobile-toggle,
          .oz-nav-classic.oz-mobile-preview .oz-mobile-toggle {
            display: flex;
          }
          .viewport-mobile .oz-nav-links,
          .oz-nav-classic.oz-mobile-preview .oz-nav-links {
            display: flex;
            flex-direction: column;
            gap: 12px;
            padding: 16px 0 10px 0;
            border-top: 1px solid #f1f5f9;
            margin-top: 14px;
          }
          .viewport-mobile .oz-nav-cta,
          .oz-nav-classic.oz-mobile-preview .oz-nav-cta {
            width: 100%;
            margin-top: 8px;
          }
          .viewport-mobile .oz-btn-nav,
          .oz-nav-classic.oz-mobile-preview .oz-btn-nav {
            display: block;
            text-align: center;
          }
        }
      `
    },
    {
      id: 'menu-02',
      name: 'Centered Logo Split Menu',
      category: 'menu',
      variantCode: 'Menu_Centered',
      groupCode: 'apex-commerce',
      groupName: 'Apex Commerce Pro',
      tag: 'modern',
      description: 'Centered brand logo with split menu items left and right, plus mobile hamburger drawer.',
      thumbnailGradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
      previewIcon: 'view_headline',
      previewSubtitle: 'Split Navigation',
      previewTitle: 'Minimal Centered Brand',
      previewBody: 'Products & Shop | [ LOGO ] | About & Support',
      htmlTemplate: `
        <nav class="oz-nav-centered">
          <div class="oz-nav-split-row">
            <div class="oz-nav-half oz-left-links">
              <a href="#">Catalog</a>
              <a href="#">Collections</a>
              <a href="#">Stories</a>
            </div>
            <div class="oz-nav-center-brand">
              <a href="#" class="oz-brand-link">
                <img src="https://res.cloudinary.com/dsmclttal/image/upload/v1718000000/branding/brand-logo-light.svg"
                     onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 160 40\\' fill=\\'none\\'><rect width=\\'38\\' height=\\'38\\' rx=\\'9\\' fill=\\'%2338BDF8\\'/><path d=\\'M13 25V13L25 25V13\\' stroke=\\'%230F172A\\' stroke-width=\\'3\\' stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\'/><text x=\\'48\\' y=\\'25\\' font-family=\\'system-ui, -apple-system, sans-serif\\' font-size=\\'16\\' font-weight=\\'800\\' fill=\\'%23FFFFFF\\' letter-spacing=\\'0.5\\'>OZIKOL<tspan fill=\\'%2338BDF8\\'>.BCC</tspan></text></svg>'"
                     alt="Brand Logo" class="oz-brand-logo-img" />
              </a>
            </div>
            <button type="button" class="oz-mobile-toggle-dark" onclick="this.closest('.oz-nav-centered').classList.toggle('oz-menu-open')">
              <span class="oz-toggle-bar-dark"></span>
              <span class="oz-toggle-bar-dark"></span>
              <span class="oz-toggle-bar-dark"></span>
            </button>
            <div class="oz-nav-half oz-right-links">
              <a href="#">Account</a>
              <a href="#">Search</a>
              <a href="#" class="oz-cart-link">Cart (0)</a>
            </div>
          </div>
        </nav>
      `,
      cssStyles: `
        .oz-nav-centered { padding: 16px 32px; background: #0f172a; color: #fff; font-family: Inter, sans-serif; }
        .oz-nav-split-row { display: flex; justify-content: space-between; align-items: center; width: 100%; }
        .oz-nav-half { display: flex; gap: 20px; align-items: center; }
        .oz-nav-half a { color: #94a3b8; text-decoration: none; font-size: 13px; font-weight: 600; transition: color 0.15s; }
        .oz-nav-half a:hover { color: #ffffff; }
        .oz-nav-center-brand { display: flex; align-items: center; justify-content: center; }
        .oz-brand-link { display: inline-flex; align-items: center; text-decoration: none; }
        .oz-brand-logo-img { height: 36px; max-height: 38px; width: auto; object-fit: contain; display: block; }
        .oz-mobile-toggle-dark { display: none; background: none; border: none; cursor: pointer; padding: 6px; flex-direction: column; gap: 5px; }
        .oz-toggle-bar-dark { display: block; width: 22px; height: 2px; background: #ffffff; border-radius: 2px; }

        /* Mobile Viewport */
        .viewport-mobile .oz-nav-centered { padding: 16px 20px; }
        .viewport-mobile .oz-nav-split-row { justify-content: space-between; }
        .viewport-mobile .oz-mobile-toggle-dark { display: flex; }
        .viewport-mobile .oz-nav-half { display: flex; flex-direction: column; gap: 10px; padding-top: 12px; }
        .viewport-mobile .oz-left-links { order: 2; border-top: 1px solid #1e293b; margin-top: 12px; width: 100%; }
        .viewport-mobile .oz-right-links { order: 3; width: 100%; }
        .viewport-mobile .oz-nav-split-row { flex-wrap: wrap; }
      `
    },
    {
      id: 'menu-03',
      name: 'Floating Glassmorphic Navbar',
      category: 'menu',
      variantCode: 'Menu_Glassmorphic',
      groupCode: 'apex-commerce',
      groupName: 'Apex Commerce Pro',
      badge: 'Trending',
      tag: 'modern',
      description: 'Floating rounded translucent header with glassmorphism backdrop blur.',
      thumbnailGradient: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
      previewIcon: 'blur_on',
      previewSubtitle: 'Glass Header',
      previewTitle: 'Floating Island Menu',
      previewBody: 'Semi-transparent background with frosted glass blur',
      htmlTemplate: `
        <div style="padding: 20px; background: #0f172a;">
          <nav class="oz-nav-glass">
            <div class="oz-glass-logo">
              <a href="#" class="oz-brand-link">
                <img src="https://res.cloudinary.com/dsmclttal/image/upload/v1718000000/branding/brand-logo-light.svg"
                     onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 160 40\\' fill=\\'none\\'><rect width=\\'38\\' height=\\'38\\' rx=\\'9\\' fill=\\'%23A855F7\\'/><path d=\\'M13 25V13L25 25V13\\' stroke=\\'white\\' stroke-width=\\'3\\' stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\'/><text x=\\'48\\' y=\\'25\\' font-family=\\'system-ui, -apple-system, sans-serif\\' font-size=\\'16\\' font-weight=\\'800\\' fill=\\'%23FFFFFF\\' letter-spacing=\\'0.5\\'>PRISM<tspan fill=\\'%23A855F7\\'>.UI</tspan></text></svg>'"
                     alt="Brand Logo" class="oz-brand-logo-img" />
              </a>
            </div>
            <button type="button" class="oz-glass-toggle">☰</button>
            <div class="oz-glass-links"><a href="#">Platform</a><a href="#">Showcase</a><a href="#">Docs</a></div>
            <a href="#" class="oz-glass-btn">Launch App</a>
          </nav>
        </div>
      `,
      cssStyles: `
        .oz-nav-glass { display: flex; justify-content: space-between; align-items: center; padding: 10px 24px; background: rgba(255,255,255,0.08); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.15); border-radius: 50px; max-width: 900px; margin: 0 auto; color: #fff; font-family: Inter, sans-serif; }
        .oz-glass-logo { display: flex; align-items: center; }
        .oz-brand-link { display: inline-flex; align-items: center; text-decoration: none; }
        .oz-brand-logo-img { height: 32px; max-height: 36px; width: auto; object-fit: contain; display: block; }
        .oz-glass-links { display: flex; gap: 20px; align-items: center; }
        .oz-glass-links a { color: #cbd5e1; text-decoration: none; font-size: 13px; font-weight: 600; }
        .oz-glass-btn { background: #ffffff; color: #0f172a; padding: 7px 16px; border-radius: 20px; text-decoration: none; font-size: 12.5px; font-weight: 700; }
        .oz-glass-toggle { display: none; background: none; border: none; color: #fff; font-size: 20px; cursor: pointer; }

        .viewport-mobile .oz-nav-glass { flex-direction: column; border-radius: 20px; padding: 16px; gap: 12px; }
        .viewport-mobile .oz-glass-links { flex-direction: column; text-align: center; gap: 10px; width: 100%; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px; }
        .viewport-mobile .oz-glass-btn { width: 100%; text-align: center; box-sizing: border-box; }
      `
    },
    {
      id: 'menu-04',
      name: 'E-Commerce Mega Navbar',
      category: 'menu',
      variantCode: 'Menu_MegaCommerce',
      groupCode: 'apex-commerce',
      groupName: 'Apex Commerce Pro',
      tag: 'ecommerce',
      description: 'E-Commerce header with category drawer dropdown, live search input, and cart badge.',
      thumbnailGradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
      previewIcon: 'shopping_cart',
      previewSubtitle: 'Store Header',
      previewTitle: 'Mega Store Navigation',
      previewBody: 'Categories Drawer • Live Search • Wishlist • Cart',
      htmlTemplate: `
        <div class="oz-ecom-nav">
          <div class="oz-ecom-top">
            <div class="oz-ecom-logo">
              <a href="#" class="oz-brand-link">
                <img src="https://res.cloudinary.com/dsmclttal/image/upload/v1718000000/branding/brand-logo-dark.svg"
                     onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 160 40\\' fill=\\'none\\'><rect width=\\'38\\' height=\\'38\\' rx=\\'9\\' fill=\\'%23059669\\'/><path d=\\'M13 25V13L25 25V13\\' stroke=\\'white\\' stroke-width=\\'3\\' stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\'/><text x=\\'48\\' y=\\'25\\' font-family=\\'system-ui, -apple-system, sans-serif\\' font-size=\\'16\\' font-weight=\\'800\\' fill=\\'%230F172A\\' letter-spacing=\\'0.5\\'>STORE<tspan fill=\\'%23059669\\'>FRONT</tspan></text></svg>'"
                     alt="Brand Logo" class="oz-brand-logo-img" />
              </a>
            </div>
            <div class="oz-ecom-search"><input type="text" placeholder="Search 10,000+ products..." /></div>
            <div class="oz-ecom-icons"><span><i class="fa-solid fa-heart text-danger me-1"></i> Wishlist</span><span class="oz-cart-pill"><i class="fa-solid fa-cart-shopping me-1"></i> Cart (3)</span></div>
          </div>
          <div class="oz-ecom-cats">
            <a href="#"><i class="fa-solid fa-fire text-danger me-1"></i> Deals</a><a href="#">Electronics</a><a href="#">Fashion</a><a href="#">Home</a><a href="#">Beauty</a><a href="#">Clearance</a>
          </div>
        </div>
      `,
      cssStyles: `
        .oz-ecom-nav { background: #ffffff; border-bottom: 2px solid #e2e8f0; font-family: Inter, sans-serif; }
        .oz-ecom-top { display: flex; justify-content: space-between; align-items: center; padding: 12px 32px; gap: 20px; }
        .oz-ecom-logo { display: flex; align-items: center; }
        .oz-brand-link { display: inline-flex; align-items: center; text-decoration: none; }
        .oz-brand-logo-img { height: 34px; max-height: 38px; width: auto; object-fit: contain; display: block; }
        .oz-ecom-search { flex: 1; max-width: 500px; }
        .oz-ecom-search input { width: 100%; padding: 8px 14px; border: 1.5px solid #cbd5e1; border-radius: 6px; font-size: 12.5px; box-sizing: border-box; }
        .oz-ecom-icons { display: flex; gap: 16px; font-size: 12.5px; font-weight: 700; color: #475569; align-items: center; }
        .oz-cart-pill { background: #059669; color: #fff; padding: 4px 10px; border-radius: 20px; }
        .oz-ecom-cats { display: flex; gap: 24px; padding: 10px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12.5px; font-weight: 700; }
        .oz-ecom-cats a { color: #334155; text-decoration: none; }

        .viewport-mobile .oz-ecom-top { flex-direction: column; align-items: stretch; padding: 14px; gap: 10px; }
        .viewport-mobile .oz-ecom-search { max-width: 100%; }
        .viewport-mobile .oz-ecom-icons { justify-content: space-between; }
        .viewport-mobile .oz-ecom-cats { overflow-x: auto; padding: 10px 14px; gap: 14px; white-space: nowrap; }
      `
    },

    // -------------------------------------------------------------
    // 2. Hero & Sliders (4 Starter Blocks)
    // -------------------------------------------------------------
    {
      id: 'hero-01',
      name: 'Modern Light Split Hero',
      category: 'hero',
      variantCode: 'Hero_SplitProduct',
      groupCode: 'apex-commerce',
      groupName: 'Apex Commerce Pro',
      badge: 'Popular',
      tag: 'modern',
      description: 'Left headline, subtitle, and dual action buttons + Right clean light interactive product dashboard card.',
      thumbnailGradient: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
      previewIcon: 'space_dashboard',
      previewSubtitle: 'Light Product Hero',
      previewTitle: 'Next-Gen Operations Management',
      previewBody: 'Supercharge your team productivity with real-time analytics and governance tools.',
      htmlTemplate: `
        <section class="oz-hero-split">
          <div class="oz-hero-left">
            <span class="oz-hero-pill"><i class="fa-solid fa-bolt text-warning me-1"></i> {{ MiniTitle }}</span>
            <h1 class="oz-hero-h1">{{ Title }}</h1>
            <p class="oz-hero-p">{{ Text }}</p>
            <div class="oz-hero-btns">
              <a href="{{ ButtonLink }}" class="oz-btn-pri">{{ ButtonText }}</a>
              {{#if VideoButtonText}}
              <a href="{{ VideoLink }}" class="oz-btn-sec"><i class="fa-solid fa-play me-1"></i> {{ VideoButtonText }}</a>
              {{/if}}
            </div>
          </div>
          <div class="oz-hero-right">
            <img src="{{ Url }}" alt="{{ Title }}" class="oz-hero-main-img" onerror="this.style.display='none'" />
            {{#if SecondUrl}}
            <img src="{{ SecondUrl }}" alt="Secondary Graphic" class="oz-hero-sec-img" onerror="this.style.display='none'" />
            {{/if}}
          </div>
        </section>
      `,
      cssStyles: `
        .oz-hero-split { display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 48px; padding: 80px 48px; background: radial-gradient(circle at 85% 20%, rgba(59, 130, 246, 0.08) 0%, transparent 45%), linear-gradient(180deg, #ffffff 0%, #f8fafc 100%); color: #0f172a; align-items: center; font-family: Inter, system-ui, -apple-system, sans-serif; border-bottom: 1px solid #e2e8f0; }
        .oz-hero-pill { background: #eff6ff; color: #2563eb; font-size: 11px; font-weight: 800; padding: 5px 12px; border-radius: 20px; border: 1px solid #bfdbfe; display: inline-block; letter-spacing: 0.04em; }
        .oz-hero-h1 { font-size: 40px; font-weight: 900; line-height: 1.2; margin: 16px 0; color: #0f172a; letter-spacing: -0.02em; }
        .oz-hero-p { font-size: 16px; color: #475569; line-height: 1.6; margin-bottom: 28px; }
        .oz-hero-btns { display: flex; gap: 14px; flex-wrap: wrap; }
        .oz-btn-pri { background: #2563eb; color: #ffffff; padding: 13px 26px; border-radius: 10px; font-weight: 700; text-decoration: none; font-size: 14px; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.25); transition: background 0.15s ease; display: inline-flex; align-items: center; justify-content: center; }
        .oz-btn-pri:hover { background: #1d4ed8; }
        .oz-btn-sec { background: #ffffff; color: #334155; padding: 13px 22px; border-radius: 10px; font-weight: 700; text-decoration: none; font-size: 14px; border: 1.5px solid #cbd5e1; transition: all 0.15s ease; display: inline-flex; align-items: center; justify-content: center; gap: 6px; }
        .oz-btn-sec:hover { background: #f8fafc; border-color: #94a3b8; }
        .oz-hero-right { position: relative; display: flex; align-items: center; justify-content: center; }
        .oz-hero-main-img { width: 100%; max-height: 420px; object-fit: cover; border-radius: 16px; box-shadow: 0 20px 45px -10px rgba(15, 23, 42, 0.15), 0 0 0 1px rgba(15, 23, 42, 0.05); }
        .oz-hero-sec-img { position: absolute; bottom: -20px; left: -20px; width: 50%; max-height: 180px; object-fit: cover; border-radius: 12px; box-shadow: 0 15px 30px -5px rgba(15, 23, 42, 0.18); border: 3px solid #ffffff; }
        @media(max-width: 850px) { .oz-hero-split { grid-template-columns: 1fr; padding: 48px 24px; } .oz-hero-sec-img { position: static; width: 100%; margin-top: 14px; } }
      `
    },
    {
      id: 'hero-02',
      name: 'Cinematic Video Background Hero',
      category: 'hero',
      variantCode: 'Hero_FullscreenVideo',
      groupCode: 'apex-commerce',
      groupName: 'Apex Commerce Pro',
      tag: 'dark',
      description: 'Dark cinematic full-width hero unit with glowing badge, play video button, and responsive layout.',
      thumbnailGradient: 'linear-gradient(135deg, #475569 0%, #0f172a 100%)',
      previewIcon: 'smart_display',
      previewSubtitle: 'Cinematic Hero',
      previewTitle: 'Experience High Performance',
      previewBody: 'Full-bleed atmospheric hero with video play trigger',
      htmlTemplate: `
        <section class="oz-hero-video" style="background-image: linear-gradient(rgba(15,23,42,0.85), rgba(15,23,42,0.95)), url('{{ Url }}'); background-size: cover; background-position: center;">
          <span class="oz-badge-glow"><i class="fa-solid fa-star me-1"></i> {{ MiniTitle }}</span>
          <h1 class="oz-video-h1">{{ Title }}</h1>
          <p class="oz-video-sub">{{ Text }}</p>
          <div class="oz-video-action">
            <a href="{{ ButtonLink }}" class="oz-play-btn">{{ ButtonText }}</a>
            <a href="{{ VideoLink }}" class="oz-video-sec-btn"><i class="fa-solid fa-circle-play me-1"></i> {{ VideoButtonText }}</a>
          </div>
        </section>
      `,
      cssStyles: `
        .oz-hero-video { padding: 90px 40px; text-align: center; color: #fff; font-family: Inter, sans-serif; background-color: #0f172a; }
        .oz-badge-glow { background: #4338ca; color: #e0e7ff; padding: 5px 14px; border-radius: 20px; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; display: inline-block; }
        .oz-video-h1 { font-size: 36px; font-weight: 900; max-width: 750px; margin: 18px auto; line-height: 1.25; }
        .oz-video-sub { font-size: 14.5px; color: #94a3b8; max-width: 600px; margin: 0 auto 28px; line-height: 1.5; }
        .oz-video-action { display: flex; justify-content: center; gap: 14px; flex-wrap: wrap; }
        .oz-play-btn { display: inline-flex; align-items: center; gap: 8px; background: #ffffff; color: #0f172a; padding: 12px 28px; border-radius: 50px; font-weight: 800; font-size: 14px; text-decoration: none; transition: transform 0.15s ease; }
        .oz-play-btn:hover { transform: scale(1.03); color: #0f172a; }
        .oz-video-sec-btn { display: inline-flex; align-items: center; background: rgba(255, 255, 255, 0.12); color: #ffffff; border: 1px solid rgba(255, 255, 255, 0.3); padding: 12px 24px; border-radius: 50px; font-weight: 700; font-size: 14px; text-decoration: none; backdrop-filter: blur(8px); transition: background 0.15s ease; }
        .oz-video-sec-btn:hover { background: rgba(255, 255, 255, 0.22); color: #fff; }
      `
    },
    {
      id: 'hero-03',
      name: 'Minimal Clean Typography Hero',
      category: 'hero',
      variantCode: 'Hero_MinimalClean',
      groupCode: 'apex-commerce',
      groupName: 'Apex Commerce Pro',
      tag: 'corporate',
      description: 'Clean typography with animated gradient text, pill tag, and action buttons.',
      thumbnailGradient: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      previewIcon: 'format_align_center',
      previewSubtitle: 'Minimal Hero',
      previewTitle: 'Simplicity Meets Speed',
      previewBody: 'Light clean centered layout with primary button and video link',
      htmlTemplate: `
        <section class="oz-hero-minimal">
          <span class="oz-mini-badge">{{ MiniTitle }}</span>
          <h1 class="oz-mini-h1">{{ Title }}</h1>
          <p class="oz-mini-p">{{ Text }}</p>
          <div class="oz-mini-actions">
            <a href="{{ ButtonLink }}" class="oz-mini-btn">{{ ButtonText }}</a>
            <a href="{{ VideoLink }}" class="oz-mini-sec-btn"><i class="fa-solid fa-play me-1"></i> {{ VideoButtonText }}</a>
          </div>
          <div class="oz-mini-visual">
            <img src="{{ Url }}" alt="{{ Title }}" class="oz-mini-img" onerror="this.style.display='none'" />
          </div>
        </section>
      `,
      cssStyles: `
        .oz-hero-minimal { padding: 80px 40px; background: #ffffff; text-align: center; font-family: Inter, sans-serif; }
        .oz-mini-badge { color: #0050e5; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; display: inline-block; }
        .oz-mini-h1 { font-size: 36px; font-weight: 900; color: #0f172a; margin: 14px auto; max-width: 680px; line-height: 1.25; }
        .oz-mini-p { font-size: 15px; color: #64748b; margin-bottom: 26px; max-width: 580px; margin-left: auto; margin-right: auto; line-height: 1.5; }
        .oz-mini-actions { display: flex; justify-content: center; gap: 12px; margin-bottom: 30px; flex-wrap: wrap; }
        .oz-mini-btn { background: #0050e5; color: #fff; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 700; text-decoration: none; font-size: 13.5px; display: inline-flex; align-items: center; }
        .oz-mini-sec-btn { background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; padding: 12px 20px; border-radius: 8px; font-weight: 700; text-decoration: none; font-size: 13.5px; display: inline-flex; align-items: center; }
        .oz-mini-img { max-width: 720px; width: 100%; border-radius: 12px; box-shadow: 0 15px 35px rgba(0,0,0,0.08); margin: 0 auto; }
      `
    },
    {
      id: 'hero-04',
      name: 'E-Commerce Deal Hero Banner',
      category: 'hero',
      variantCode: 'Hero_EcommerceCarousel',
      groupCode: 'apex-commerce',
      groupName: 'Apex Commerce Pro',
      tag: 'ecommerce',
      description: 'Rotating product showcase with discount banner, star reviews, and Shop Now button.',
      thumbnailGradient: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
      previewIcon: 'local_mall',
      previewSubtitle: 'Store Hero',
      previewTitle: 'Summer Collection 2026',
      previewBody: 'Up to 40% Off on Selected Merchandise and Corporate Kits',
      htmlTemplate: `
        <section class="oz-hero-ecom">
          <div class="oz-ecom-left">
            <span class="oz-ecom-badge"><i class="fa-solid fa-fire me-1"></i> {{ MiniTitle }}</span>
            <h1 class="oz-ecom-title">{{ Title }}</h1>
            <p class="oz-ecom-sub">{{ Text }}</p>
            <div class="oz-ecom-btns">
              <a href="{{ ButtonLink }}" class="oz-ecom-btn">{{ ButtonText }}</a>
              <a href="{{ VideoLink }}" class="oz-ecom-sec-btn">{{ VideoButtonText }}</a>
            </div>
          </div>
          <div class="oz-ecom-right">
            <div class="oz-product-hero-card">
              <img src="{{ Url }}" alt="{{ Title }}" class="oz-prod-img" onerror="this.style.display='none'" />
              <img src="{{ SecondUrl }}" alt="Secondary Graphic" class="oz-prod-sec-img" onerror="this.style.display='none'" />
            </div>
          </div>
        </section>
      `,
      cssStyles: `
        .oz-hero-ecom { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 30px; padding: 60px 40px; background: #fff7ed; border-radius: 12px; align-items: center; font-family: Inter, sans-serif; }
        .oz-ecom-badge { background: #ea580c; color: #fff; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 20px; display: inline-block; }
        .oz-ecom-title { font-size: 32px; font-weight: 900; color: #7c2d12; margin: 12px 0; line-height: 1.25; }
        .oz-ecom-sub { font-size: 14px; color: #9a3412; margin-bottom: 22px; line-height: 1.5; }
        .oz-ecom-btns { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; }
        .oz-ecom-btn { background: #ea580c; color: #fff; padding: 12px 24px; border-radius: 8px; font-weight: 800; text-decoration: none; display: inline-flex; align-items: center; }
        .oz-ecom-sec-btn { background: #ffffff; color: #7c2d12; border: 1.5px solid #fed7aa; padding: 12px 20px; border-radius: 8px; font-weight: 700; text-decoration: none; display: inline-flex; align-items: center; }
        .oz-product-hero-card { background: #fff; padding: 24px; border-radius: 12px; text-align: center; border: 1.5px solid #fed7aa; box-shadow: 0 10px 25px rgba(234, 88, 12, 0.1); position: relative; }
        .oz-prod-img { max-width: 100%; max-height: 180px; object-fit: contain; border-radius: 8px; }
        .oz-prod-sec-img { max-width: 100%; max-height: 140px; object-fit: contain; border-radius: 8px; margin-top: 10px; }
        @media(max-width: 850px) { .oz-hero-ecom { grid-template-columns: 1fr; padding: 40px 24px; } }
      `
    },

    // -------------------------------------------------------------
    // 3. Body Sections & Lists (4 Starter Blocks)
    // -------------------------------------------------------------
    {
      id: 'body-01',
      name: '3-Column Modern Feature Grid',
      category: 'body',
      variantCode: 'Body_FeatureGrid3',
      groupCode: 'apex-commerce',
      groupName: 'Apex Commerce Pro',
      badge: 'Core Section',
      tag: 'modern',
      description: '3-column feature cards with hover lift animation, icon header, and child SectionList items.',
      thumbnailGradient: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
      previewIcon: 'grid_view',
      previewSubtitle: 'Core Capabilities',
      previewTitle: 'Everything you need to succeed',
      previewBody: 'Our platform delivers robust capabilities engineered for modern performance.',
      sectionLists: [
        { title: 'Identity & Access', body: 'Granular role-based authorization matrix and session control.', icon: 'shield' },
        { title: 'Collaboration Hub', body: 'Real-time group chat, channels, and member direct messaging.', icon: 'forum' },
        { title: 'E-Voting & Polls', body: 'Tamper-proof real-time electoral polling with instant audits.', icon: 'how_to_vote' }
      ],
      htmlTemplate: `
        <section class="oz-sec-feat3">
          <div class="oz-sec-head">
            <span class="oz-sec-pill">Core Features</span>
            <h2>Powerful tools built for high-performing teams</h2>
            <p>Experience seamless administration and collaborative power.</p>
          </div>
          <div class="oz-feat-grid">
            <div class="oz-feat-card">
              <div class="oz-feat-icon"><i class="fa-solid fa-shield-halved text-primary"></i></div>
              <h3>Identity & Access</h3>
              <p>Granular role-based authorization matrix, session control, and two-factor authentication.</p>
            </div>
            <div class="oz-feat-card">
              <div class="oz-feat-icon"><i class="fa-solid fa-comments text-info"></i></div>
              <h3>Collaboration Hub</h3>
              <p>Real-time group chat channels, direct messaging, and multimedia sharing.</p>
            </div>
            <div class="oz-feat-card">
              <div class="oz-feat-icon"><i class="fa-solid fa-check-to-slot text-success"></i></div>
              <h3>E-Voting & Polls</h3>
              <p>Tamper-proof real-time electoral polling with automated tally audits.</p>
            </div>
          </div>
        </section>
      `,
      cssStyles: `
        .oz-sec-feat3 { padding: 60px 40px; background: #ffffff; font-family: Inter, sans-serif; }
        .oz-sec-head { text-align: center; max-width: 600px; margin: 0 auto 40px; }
        .oz-sec-pill { color: #4f46e5; font-size: 11px; font-weight: 800; text-transform: uppercase; }
        .oz-sec-head h2 { font-size: 26px; font-weight: 900; color: #0f172a; margin: 8px 0; }
        .oz-sec-head p { font-size: 13.5px; color: #64748b; margin: 0; }
        .oz-feat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; max-width: 1100px; margin: 0 auto; }
        .oz-feat-card { padding: 28px 24px; background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 12px; transition: 0.2s ease; }
        .oz-feat-card:hover { transform: translateY(-4px); border-color: #c7d2fe; box-shadow: 0 10px 25px rgba(79,70,229,0.08); }
        .oz-feat-icon { font-size: 32px; margin-bottom: 12px; }
        .oz-feat-card h3 { font-size: 16px; font-weight: 800; color: #0f172a; margin: 0 0 6px 0; }
        .oz-feat-card p { font-size: 12.5px; color: #64748b; line-height: 1.45; margin: 0; }
        @media(max-width: 768px) { .oz-feat-grid { grid-template-columns: 1fr; } }
      `
    },
    {
      id: 'body-02',
      name: 'Split Story & Mission Section',
      category: 'body',
      variantCode: 'Body_AboutStory',
      groupCode: 'apex-commerce',
      groupName: 'Apex Commerce Pro',
      tag: 'corporate',
      description: 'Split layout with company mission story, 4 checkmark bullet points, and high-resolution photo.',
      thumbnailGradient: 'linear-gradient(135deg, #0d9488 0%, #115e59 100%)',
      previewIcon: 'auto_stories',
      previewSubtitle: 'Our Story',
      previewTitle: 'Empowering Communities Worldwide',
      previewBody: 'Two decades of proven governance innovation and trusted platform excellence.',
      htmlTemplate: `
        <section class="oz-sec-story">
          <div class="oz-story-left">
            <span class="oz-sec-pill">About Our Organization</span>
            <h2>Two decades of innovation and trusted leadership</h2>
            <p>We are dedicated to building digital bridges that empower member organizations, alumni networks, and corporate governing bodies with transparent tools.</p>
            <ul class="oz-check-list">
              <li><i class="fa-solid fa-check text-success me-1"></i> Bank-grade cryptographic security and audit trails</li>
              <li><i class="fa-solid fa-check text-success me-1"></i> Optimized media asset delivery and global caching speed</li>
              <li><i class="fa-solid fa-check text-success me-1"></i> 24/7 dedicated support team and institutional SLAs</li>
            </ul>
          </div>
          <div class="oz-story-right">
            <div class="oz-story-img-box"><i class="fa-solid fa-building-columns me-2"></i> Institutional Leadership</div>
          </div>
        </section>
      `,
      cssStyles: `
        .oz-sec-story { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 40px; padding: 60px 40px; background: #f8fafc; align-items: center; font-family: Inter, sans-serif; }
        .oz-story-left h2 { font-size: 26px; font-weight: 900; color: #0f172a; margin: 10px 0 14px 0; }
        .oz-story-left p { font-size: 13.5px; color: #475569; line-height: 1.5; margin-bottom: 20px; }
        .oz-check-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; }
        .oz-check-list li { font-size: 13px; font-weight: 700; color: #0f172a; }
        .oz-story-img-box { background: #e2e8f0; border-radius: 12px; height: 220px; display: flex; align-items: center; justify-content: center; font-weight: 800; color: #64748b; }
      `
    },
    {
      id: 'body-03',
      name: '4-Column Animated Milestone Counters',
      category: 'body',
      variantCode: 'Body_MilestoneCounters',
      groupCode: 'apex-commerce',
      groupName: 'Apex Commerce Pro',
      tag: 'modern',
      description: '4-column animated statistic counters (e.g. 50k+ Active Members, 99.9% Uptime, $10M+ Raised).',
      thumbnailGradient: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
      previewIcon: 'speed',
      previewSubtitle: 'By The Numbers',
      previewTitle: 'Proven Scale & Proven Results',
      previewBody: '50k+ Members • 99.99% Uptime • 120+ Communities • $15M+ Volume',
      htmlTemplate: `
        <section class="oz-sec-counters">
          <div class="oz-counter-item">
            <div class="oz-count-num">50k+</div>
            <div class="oz-count-label">Active Members</div>
          </div>
          <div class="oz-counter-item">
            <div class="oz-count-num">99.99%</div>
            <div class="oz-count-label">Platform Uptime</div>
          </div>
          <div class="oz-counter-item">
            <div class="oz-count-num">120+</div>
            <div class="oz-count-label">Global Groups</div>
          </div>
          <div class="oz-counter-item">
            <div class="oz-count-num">$15M+</div>
            <div class="oz-count-label">Processed Capital</div>
          </div>
        </section>
      `,
      cssStyles: `
        .oz-sec-counters { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; padding: 40px; background: #0f172a; text-align: center; font-family: Inter, sans-serif; }
        .oz-count-num { font-size: 34px; font-weight: 900; color: #38bdf8; margin-bottom: 4px; }
        .oz-count-label { font-size: 12px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
        @media(max-width: 768px) { .oz-sec-counters { grid-template-columns: repeat(2, 1fr); } }
      `
    },
    {
      id: 'body-04',
      name: '3-Tier Modern Pricing Matrix',
      category: 'body',
      variantCode: 'Body_PricingCards',
      groupCode: 'apex-commerce',
      groupName: 'Apex Commerce Pro',
      badge: 'High Conversion',
      tag: 'modern',
      description: '3-tier pricing matrix with monthly/yearly toggle and featured "Most Popular" highlight card.',
      thumbnailGradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
      previewIcon: 'payments',
      previewSubtitle: 'Transparent Plans',
      previewTitle: 'Predictable pricing for any size',
      previewBody: 'Starter ($29/mo) • Professional ($79/mo) • Enterprise ($199/mo)',
      htmlTemplate: `
        <section class="oz-sec-pricing">
          <div class="oz-pricing-grid">
            <div class="oz-price-card">
              <h4>Starter</h4>
              <div class="oz-price-val">$29<span>/mo</span></div>
              <p>Ideal for emerging chapters and small committee groups.</p>
              <button class="oz-btn-price">Select Plan</button>
            </div>
            <div class="oz-price-card oz-featured">
              <span class="oz-pop-badge">MOST POPULAR</span>
              <h4>Professional</h4>
              <div class="oz-price-val">$79<span>/mo</span></div>
              <p>Full suite with e-voting, chat channels, and branded domains.</p>
              <button class="oz-btn-price oz-btn-pop">Select Plan</button>
            </div>
            <div class="oz-price-card">
              <h4>Enterprise</h4>
              <div class="oz-price-val">$199<span>/mo</span></div>
              <p>Unlimited members, dedicated SLA, and white-label mobile app.</p>
              <button class="oz-btn-price">Contact Sales</button>
            </div>
          </div>
        </section>
      `,
      cssStyles: `
        .oz-sec-pricing { padding: 60px 40px; background: #f8fafc; font-family: Inter, sans-serif; }
        .oz-pricing-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; max-width: 1000px; margin: 0 auto; align-items: center; }
        .oz-price-card { background: #fff; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 32px 24px; text-align: center; position: relative; }
        .oz-price-card.oz-featured { border-color: #8b5cf6; box-shadow: 0 12px 30px rgba(139, 92, 246, 0.15); transform: scale(1.04); }
        .oz-pop-badge { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: #8b5cf6; color: #fff; font-size: 10px; font-weight: 800; padding: 3px 10px; border-radius: 20px; }
        .oz-price-val { font-size: 32px; font-weight: 900; color: #0f172a; margin: 12px 0; }
        .oz-price-val span { font-size: 14px; color: #64748b; font-weight: 600; }
        .oz-btn-price { width: 100%; padding: 10px; border: 1.5px solid #cbd5e1; border-radius: 7px; background: #fff; font-weight: 700; font-size: 13px; cursor: pointer; }
        .oz-btn-pop { background: #8b5cf6; color: #fff; border: none; }
        @media(max-width: 768px) { .oz-pricing-grid { grid-template-columns: 1fr; } }
      `
    },

    // -------------------------------------------------------------
    // 4. Footers (4 Starter Blocks)
    // -------------------------------------------------------------
    {
      id: 'footer-01',
      name: 'Clean Light Corporate Footer',
      category: 'footer',
      variantCode: 'Footer_Corporate4Col',
      groupCode: 'apex-commerce',
      groupName: 'Apex Commerce Pro',
      tag: 'corporate',
      description: '4-column clean light corporate footer with brand biography, quick links, solutions, and newsletter.',
      thumbnailGradient: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      previewIcon: 'table_rows',
      previewSubtitle: 'Light Footer',
      previewTitle: '4-Column Multi-Menu',
      previewBody: 'Company Bio • Platform • Solutions • Legal & Newsletter',
      htmlTemplate: `
        <footer class="oz-foot-4col">
          <div class="oz-foot-grid">
            <div class="oz-foot-brand-col">
              <a href="#" class="oz-brand-link">
                <img src="https://res.cloudinary.com/dsmclttal/image/upload/v1718000000/branding/brand-logo-dark.svg"
                     onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 160 40\\' fill=\\'none\\'><rect width=\\'38\\' height=\\'38\\' rx=\\'9\\' fill=\\'%232563EB\\'/><path d=\\'M13 25V13L25 25V13\\' stroke=\\'white\\' stroke-width=\\'3\\' stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\'/><text x=\\'48\\' y=\\'25\\' font-family=\\'system-ui, -apple-system, sans-serif\\' font-size=\\'16\\' font-weight=\\'800\\' fill=\\'%230F172A\\' letter-spacing=\\'0.5\\'>OZIKOL<tspan fill=\\'%232563EB\\'>.BCC</tspan></text></svg>'"
                     alt="Brand Logo" class="oz-brand-logo-img" style="margin-bottom: 14px;" />
              </a>
              <p>The enterprise platform for governance, member collaboration, and digital identity.</p>
            </div>
            <div>
              <h4>Solutions</h4>
              <p>E-Voting<br>Member IDs<br>Alumni Suite<br>Storefront</p>
            </div>
            <div>
              <h4>Company</h4>
              <p>About Us<br>Careers<br>Security<br>Press</p>
            </div>
            <div>
              <h4>Newsletter</h4>
              <p>Stay updated with our weekly briefings.</p>
            </div>
          </div>
        </footer>
      `,
      cssStyles: `
        .oz-foot-4col { background: #f8fafc; color: #475569; padding: 50px 40px; font-family: Inter, sans-serif; font-size: 12.5px; border-top: 1px solid #e2e8f0; }
        .oz-foot-grid { display: grid; grid-template-columns: 1.4fr 1fr 1fr 1fr; gap: 30px; max-width: 1100px; margin: 0 auto; }
        .oz-foot-brand-col p { line-height: 1.6; color: #64748b; }
        .oz-brand-link { display: inline-flex; align-items: center; text-decoration: none; }
        .oz-brand-logo-img { height: 32px; max-height: 38px; width: auto; object-fit: contain; display: block; }
        .oz-foot-grid h4 { color: #0f172a; margin-bottom: 12px; font-size: 14px; font-weight: 800; }
        .oz-foot-grid p { line-height: 1.6; color: #64748b; }
        @media(max-width: 768px) { .oz-foot-grid { grid-template-columns: 1fr 1fr; } }
      `
    },
    {
      id: 'footer-02',
      name: 'Minimal Centered Footer',
      category: 'footer',
      variantCode: 'Footer_MinimalCentered',
      groupCode: 'apex-commerce',
      groupName: 'Apex Commerce Pro',
      tag: 'modern',
      description: 'Centered logo, inline navigation menu, social media icons, and copyright disclaimer.',
      thumbnailGradient: 'linear-gradient(135deg, #334155 0%, #1e293b 100%)',
      previewIcon: 'align_horizontal_center',
      previewSubtitle: 'Clean Footer',
      previewTitle: 'Minimal Centered Strip',
      previewBody: 'Centered Logo • Inline Links • Social Handles • © 2026',
      htmlTemplate: `
        <footer class="oz-foot-centered">
          <div class="oz-foot-c-logo">
            <a href="#" class="oz-brand-link">
              <img src="https://res.cloudinary.com/dsmclttal/image/upload/v1718000000/branding/brand-logo-dark.svg"
                   onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 160 40\\' fill=\\'none\\'><rect width=\\'38\\' height=\\'38\\' rx=\\'9\\' fill=\\'%230050E5\\'/><path d=\\'M13 25V13L25 25V13\\' stroke=\\'white\\' stroke-width=\\'3\\' stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\'/><text x=\\'48\\' y=\\'25\\' font-family=\\'system-ui, -apple-system, sans-serif\\' font-size=\\'16\\' font-weight=\\'800\\' fill=\\'%230F172A\\' letter-spacing=\\'0.5\\'>OZIKOL<tspan fill=\\'%230050E5\\'>.BCC</tspan></text></svg>'"
                   alt="Brand Logo" class="oz-brand-logo-img" />
            </a>
          </div>
          <div class="oz-foot-c-links"><a href="#">Home</a><a href="#">About</a><a href="#">Services</a><a href="#">Privacy</a><a href="#">Terms</a></div>
          <div class="oz-foot-c-copy">© 2026 Ozikol Enterprise. All rights reserved.</div>
        </footer>
      `,
      cssStyles: `
        .oz-foot-centered { background: #ffffff; border-top: 1px solid #e2e8f0; padding: 40px 20px; text-align: center; font-family: Inter, sans-serif; }
        .oz-foot-c-logo { display: flex; justify-content: center; margin-bottom: 14px; }
        .oz-brand-link { display: inline-flex; align-items: center; text-decoration: none; }
        .oz-brand-logo-img { height: 32px; max-height: 36px; width: auto; object-fit: contain; display: block; }
        .oz-foot-c-links { display: flex; justify-content: center; gap: 20px; margin-bottom: 14px; font-size: 13px; }
        .oz-foot-c-links a { color: #64748b; text-decoration: none; }
        .oz-foot-c-links a:hover { color: #0050e5; }
        .oz-foot-c-copy { font-size: 11.5px; color: #94a3b8; }
      `
    },
    {
      id: 'footer-03',
      name: 'Dark Slate High-Contrast Footer',
      category: 'footer',
      variantCode: 'Footer_DarkHighContrast',
      groupCode: 'apex-commerce',
      groupName: 'Apex Commerce Pro',
      tag: 'dark',
      description: 'Dark slate footer with app store download badges, security seals, and localized copyright.',
      thumbnailGradient: 'linear-gradient(135deg, #020617 0%, #0f172a 100%)',
      previewIcon: 'contrast',
      previewSubtitle: 'Dark Slate Footer',
      previewTitle: 'Security & App Downloads',
      previewBody: 'High-contrast footer featuring app store links and ISO security badges',
      htmlTemplate: `
        <footer class="oz-foot-dark">
          <div class="oz-foot-d-top">
            <div class="oz-foot-d-brand">
              <a href="#" class="oz-brand-link">
                <img src="https://res.cloudinary.com/dsmclttal/image/upload/v1718000000/branding/brand-logo-light.svg"
                     onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 160 40\\' fill=\\'none\\'><rect width=\\'38\\' height=\\'38\\' rx=\\'9\\' fill=\\'%2338BDF8\\'/><path d=\\'M13 25V13L25 25V13\\' stroke=\\'%230F172A\\' stroke-width=\\'3\\' stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\'/><text x=\\'48\\' y=\\'25\\' font-family=\\'system-ui, -apple-system, sans-serif\\' font-size=\\'16\\' font-weight=\\'800\\' fill=\\'%23FFFFFF\\' letter-spacing=\\'0.5\\'>OZIKOL<tspan fill=\\'%2338BDF8\\'>.BCC</tspan></text></svg>'"
                     alt="Brand Logo" class="oz-brand-logo-img" />
              </a>
              <span class="oz-sec-tag"><i class="fa-solid fa-lock me-1"></i> Protected by 256-bit Encryption</span>
            </div>
            <div class="oz-app-badges"><span><i class="fa-brands fa-apple me-1"></i> App Store</span><span><i class="fa-brands fa-google-play me-1"></i> Google Play</span></div>
          </div>
        </footer>
      `,
      cssStyles: `
        .oz-foot-dark { background: #020617; color: #fff; padding: 32px 40px; border-top: 1px solid #1e293b; font-family: Inter, sans-serif; }
        .oz-foot-d-top { display: flex; justify-content: space-between; align-items: center; max-width: 1000px; margin: 0 auto; font-size: 13px; }
        .oz-foot-d-brand { display: flex; align-items: center; gap: 16px; }
        .oz-brand-link { display: inline-flex; align-items: center; text-decoration: none; }
        .oz-brand-logo-img { height: 28px; max-height: 32px; width: auto; object-fit: contain; display: block; }
        .oz-sec-tag { font-size: 12px; color: #94a3b8; }
        .oz-app-badges { display: flex; gap: 12px; font-weight: 700; background: #0f172a; padding: 8px 14px; border-radius: 8px; font-size: 12px; }
        @media(max-width: 768px) { .oz-foot-d-top { flex-direction: column; gap: 16px; text-align: center; } }
      `
    },
    {
      id: 'footer-04',
      name: 'Single-Line Minimalist Footer',
      category: 'footer',
      variantCode: 'Footer_SimpleBar',
      groupCode: 'apex-commerce',
      groupName: 'Apex Commerce Pro',
      tag: 'modern',
      description: 'Single-line minimalist footer strip with copyright and terms/privacy links.',
      thumbnailGradient: 'linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 100%)',
      previewIcon: 'border_bottom',
      previewSubtitle: 'Minimal Strip',
      previewTitle: 'Single Line Bottom Bar',
      previewBody: 'Compact 40px height bar with copyright and privacy link',
      htmlTemplate: `
        <footer class="oz-foot-bar">
          <div class="oz-foot-bar-left">
            <a href="#" class="oz-brand-link">
              <img src="https://res.cloudinary.com/dsmclttal/image/upload/v1718000000/branding/brand-logo-dark.svg"
                   onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 160 40\\' fill=\\'none\\'><rect width=\\'38\\' height=\\'38\\' rx=\\'9\\' fill=\\'%230050E5\\'/><path d=\\'M13 25V13L25 25V13\\' stroke=\\'white\\' stroke-width=\\'3\\' stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\'/><text x=\\'48\\' y=\\'25\\' font-family=\\'system-ui, -apple-system, sans-serif\\' font-size=\\'16\\' font-weight=\\'800\\' fill=\\'%230F172A\\' letter-spacing=\\'0.5\\'>OZIKOL<tspan fill=\\'%230050E5\\'>.BCC</tspan></text></svg>'"
                   alt="Brand Logo" class="oz-brand-logo-img" style="height: 22px;" />
            </a>
            <span>© 2026 Organization Portal. All rights reserved.</span>
          </div>
          <div><a href="#">Terms of Use</a> • <a href="#">Privacy Policy</a></div>
        </footer>
      `,
      cssStyles: `
        .oz-foot-bar { display: flex; justify-content: space-between; align-items: center; padding: 14px 40px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; font-family: Inter, sans-serif; }
        .oz-foot-bar-left { display: flex; align-items: center; gap: 12px; }
        .oz-brand-link { display: inline-flex; align-items: center; text-decoration: none; }
        .oz-brand-logo-img { height: 22px; width: auto; object-fit: contain; display: block; }
        .oz-foot-bar a { color: #64748b; text-decoration: none; }
        .oz-foot-bar a:hover { color: #0050e5; }
        @media(max-width: 768px) { .oz-foot-bar { flex-direction: column; gap: 10px; text-align: center; } }
      `
    },

    // -------------------------------------------------------------
    // 5. Newsletter & Forms (4 Starter Blocks)
    // -------------------------------------------------------------
    {
      id: 'newsletter-01',
      name: 'Horizontal Inline Subscribe Bar',
      category: 'newsletter',
      variantCode: 'Form_InlineBar',
      groupCode: 'apex-commerce',
      groupName: 'Apex Commerce Pro',
      tag: 'modern',
      description: 'Horizontal lead capture bar with email input, submit button, and privacy disclaimer.',
      thumbnailGradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      previewIcon: 'mail',
      previewSubtitle: 'Subscribe Bar',
      previewTitle: 'Stay in the loop with updates',
      previewBody: 'Clean single-row email capture widget with instant feedback',
      htmlTemplate: `
        <section class="oz-form-inline">
          <div class="oz-inline-wrap">
            <h3>Subscribe to our member newsletter</h3>
            <div class="oz-inline-input">
              <input type="email" placeholder="Enter your email address..." />
              <button>Subscribe</button>
            </div>
          </div>
        </section>
      `,
      cssStyles: `
        .oz-form-inline { padding: 40px 20px; background: #eff6ff; font-family: Inter, sans-serif; }
        .oz-inline-wrap { max-width: 700px; margin: 0 auto; text-align: center; }
        .oz-inline-wrap h3 { font-size: 20px; font-weight: 800; color: #1e3a8a; margin-bottom: 14px; }
        .oz-inline-input { display: flex; gap: 8px; max-width: 460px; margin: 0 auto; }
        .oz-inline-input input { flex: 1; padding: 10px 14px; border: 1.5px solid #bfdbfe; border-radius: 8px; font-size: 13px; }
        .oz-inline-input button { background: #2563eb; color: #fff; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 700; cursor: pointer; }
      `
    },
    {
      id: 'newsletter-02',
      name: 'Split Card with Lead Magnet Image',
      category: 'newsletter',
      variantCode: 'Form_SplitCard',
      groupCode: 'apex-commerce',
      groupName: 'Apex Commerce Pro',
      tag: 'corporate',
      description: 'Visual container with free guide/ebook cover on left, headline & email form on right.',
      thumbnailGradient: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
      previewIcon: 'card_membership',
      previewSubtitle: 'Lead Magnet',
      previewTitle: 'Download the 2026 Industry Report',
      previewBody: 'High-conversion split card with resource preview and direct form',
      htmlTemplate: `
        <section class="oz-form-split">
          <div class="oz-form-box">
            <div class="oz-form-l"><i class="fa-solid fa-book-open me-1"></i> FREE REPORT 2026</div>
            <div class="oz-form-r">
              <h3>Get the Executive Governance Playbook</h3>
              <p>Discover how leading institutions optimize voting, compliance, and member engagement.</p>
              <input type="email" placeholder="work@organization.com" />
              <button>Send Free PDF →</button>
            </div>
          </div>
        </section>
      `,
      cssStyles: `
        .oz-form-split { padding: 50px 20px; background: #f8fafc; font-family: Inter, sans-serif; }
        .oz-form-box { display: grid; grid-template-columns: 0.8fr 1.2fr; background: #fff; border: 1.5px solid #e2e8f0; border-radius: 14px; max-width: 800px; margin: 0 auto; overflow: hidden; }
        .oz-form-l { background: #4f46e5; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 18px; padding: 30px; }
        .oz-form-r { padding: 30px; }
        .oz-form-r h3 { font-size: 18px; font-weight: 800; color: #0f172a; margin: 0 0 6px 0; }
        .oz-form-r p { font-size: 12.5px; color: #64748b; line-height: 1.4; margin-bottom: 14px; }
        .oz-form-r input { width: 100%; padding: 10px 12px; border: 1.5px solid #cbd5e1; border-radius: 7px; margin-bottom: 8px; box-sizing: border-box; }
        .oz-form-r button { width: 100%; background: #4f46e5; color: #fff; border: none; padding: 10px; border-radius: 7px; font-weight: 700; cursor: pointer; }
      `
    },
    {
      id: 'newsletter-03',
      name: 'Vibrant Gradient Banner Form',
      category: 'newsletter',
      variantCode: 'Form_GradientBanner',
      groupCode: 'apex-commerce',
      groupName: 'Apex Commerce Pro',
      tag: 'modern',
      description: 'Vibrant gradient container with headline, guarantee pill, and 1-click submit.',
      thumbnailGradient: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
      previewIcon: 'gradient',
      previewSubtitle: 'Gradient Banner',
      previewTitle: 'Join 50,000+ Decision Makers',
      previewBody: 'Vibrant full-bleed gradient with centered single-line capture',
      htmlTemplate: `
        <section class="oz-form-grad">
          <h2>Join 50,000+ Decision Makers</h2>
          <p>Get exclusive executive insights delivered to your inbox every Thursday morning.</p>
          <div class="oz-grad-input">
            <input type="email" placeholder="Enter your email address..." />
            <button>Join Free</button>
          </div>
        </section>
      `,
      cssStyles: `
        .oz-form-grad { padding: 60px 40px; background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: #fff; text-align: center; font-family: Inter, sans-serif; }
        .oz-form-grad h2 { font-size: 28px; font-weight: 900; margin: 0 0 8px 0; }
        .oz-form-grad p { font-size: 13.5px; opacity: 0.9; margin-bottom: 20px; }
        .oz-grad-input { display: flex; gap: 8px; max-width: 440px; margin: 0 auto; }
        .oz-grad-input input { flex: 1; padding: 12px 14px; border: none; border-radius: 8px; font-size: 13px; }
        .oz-grad-input button { background: #0f172a; color: #fff; border: none; padding: 12px 20px; border-radius: 8px; font-weight: 800; cursor: pointer; }
      `
    },
    {
      id: 'newsletter-04',
      name: 'Dark Glassmorphism Subscriber Box',
      category: 'newsletter',
      variantCode: 'Form_DarkMinimal',
      groupCode: 'apex-commerce',
      groupName: 'Apex Commerce Pro',
      tag: 'dark',
      description: 'Dark glassmorphism subscriber card with privacy guarantee tag.',
      thumbnailGradient: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
      previewIcon: 'mark_email_read',
      previewSubtitle: 'Dark Subscriber',
      previewTitle: 'Private Intelligence Feed',
      previewBody: 'No spam. Unsubscribe anytime with 1 click.',
      htmlTemplate: `
        <section class="oz-form-dark">
          <div class="oz-dark-box">
            <h3><i class="fa-solid fa-shield-check me-2"></i> Verified Member Newsletter</h3>
            <p>Access embargoed policy updates and committee announcements.</p>
            <div class="oz-dark-row">
              <input type="email" placeholder="user@organization.com" />
              <button>Subscribe</button>
            </div>
          </div>
        </section>
      `,
      cssStyles: `
        .oz-form-dark { padding: 50px 20px; background: #0f172a; font-family: Inter, sans-serif; }
        .oz-dark-box { background: rgba(255,255,255,0.05); border: 1.5px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 30px; max-width: 600px; margin: 0 auto; text-align: center; color: #fff; }
        .oz-dark-box h3 { font-size: 20px; font-weight: 800; margin: 0 0 6px 0; }
        .oz-dark-box p { font-size: 13px; color: #94a3b8; margin-bottom: 16px; }
        .oz-dark-row { display: flex; gap: 8px; max-width: 400px; margin: 0 auto; }
        .oz-dark-row input { flex: 1; padding: 10px 12px; border: 1px solid #334155; background: #1e293b; color: #fff; border-radius: 6px; }
        .oz-dark-row button { background: #38bdf8; color: #0f172a; border: none; padding: 10px 18px; border-radius: 6px; font-weight: 800; cursor: pointer; }
      `
    },

    // -------------------------------------------------------------
    // 6. Contact Us Blocks (4 Starter Blocks)
    // -------------------------------------------------------------
    {
      id: 'contact-01',
      name: 'Split Map & Direct Inquiry Form',
      category: 'contact',
      variantCode: 'Contact_SplitMapForm',
      groupCode: 'apex-commerce',
      groupName: 'Apex Commerce Pro',
      badge: 'Popular',
      tag: 'corporate',
      description: 'Left embedded interactive map/address cards + Right direct inquiry messaging form.',
      thumbnailGradient: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
      previewIcon: 'map',
      previewSubtitle: 'Location & Form',
      previewTitle: 'Get in Touch with our Team',
      previewBody: 'Headquarters Address • Phone • Full Message Form',
      htmlTemplate: `
        <section class="oz-con-split">
          <div class="oz-con-left">
            <span class="oz-sec-pill">Contact Us</span>
            <h2>We would love to hear from you</h2>
            <p>Our team is available Monday through Friday to answer your governance inquiries.</p>
            <div class="oz-con-info">
              <div><i class="fa-solid fa-location-dot me-2 text-primary"></i> 100 Enterprise Way, Suite 400</div>
              <div><i class="fa-solid fa-phone me-2 text-success"></i> +1 (800) 555-0199</div>
              <div><i class="fa-solid fa-envelope me-2 text-warning"></i> support&#64;workspace.org</div>
            </div>
          </div>
          <div class="oz-con-right">
            <form class="oz-con-form">
              <input type="text" placeholder="Your Full Name" />
              <input type="email" placeholder="Your Email Address" />
              <textarea rows="3" placeholder="How can we assist your organization?"></textarea>
              <button type="button">Send Message →</button>
            </form>
          </div>
        </section>
      `,
      cssStyles: `
        .oz-con-split { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; padding: 60px 40px; background: #ffffff; font-family: Inter, sans-serif; }
        .oz-con-left h2 { font-size: 26px; font-weight: 900; color: #0f172a; margin: 8px 0 12px 0; }
        .oz-con-left p { font-size: 13.5px; color: #64748b; line-height: 1.5; margin-bottom: 20px; }
        .oz-con-info { display: flex; flex-direction: column; gap: 8px; font-size: 13px; font-weight: 700; color: #334155; }
        .oz-con-form { display: flex; flex-direction: column; gap: 10px; background: #f8fafc; padding: 24px; border-radius: 12px; border: 1.5px solid #e2e8f0; }
        .oz-con-form input, .oz-con-form textarea { padding: 10px 12px; border: 1.5px solid #cbd5e1; border-radius: 7px; font-size: 13px; font-family: inherit; }
        .oz-con-form button { background: #0050e5; color: #fff; border: none; padding: 11px; border-radius: 7px; font-weight: 800; cursor: pointer; }
      `
    },
    {
      id: 'contact-02',
      name: '3-Column Direct Contact Cards',
      category: 'contact',
      variantCode: 'Contact_Cards3Col',
      groupCode: 'apex-commerce',
      groupName: 'Apex Commerce Pro',
      tag: 'modern',
      description: '3 quick contact info cards (Phone & WhatsApp, Email Support, Headquarters Office).',
      thumbnailGradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      previewIcon: 'call',
      previewSubtitle: 'Direct Cards',
      previewTitle: 'Reach Our Global Support Desks',
      previewBody: 'Phone & WhatsApp • Official Email • Regional Headquarters',
      htmlTemplate: `
        <section class="oz-con-3cards">
          <div class="oz-c-card">
            <span class="material-symbols-outlined oz-c-icon">call</span>
            <h4>Phone & WhatsApp</h4>
            <p>Mon-Fri from 9am to 6pm</p>
            <strong>+1 (888) 450-2026</strong>
          </div>
          <div class="oz-c-card">
            <span class="material-symbols-outlined oz-c-icon">mail</span>
            <h4>Direct Email</h4>
            <p>Average response within 2 hours</p>
            <strong>contact&#64;workspace.org</strong>
          </div>
          <div class="oz-c-card">
            <span class="material-symbols-outlined oz-c-icon">location_on</span>
            <h4>Headquarters</h4>
            <p>London & New York Offices</p>
            <strong>75 Broadway, NY 10006</strong>
          </div>
        </section>
      `,
      cssStyles: `
        .oz-con-3cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; padding: 50px 40px; background: #f8fafc; font-family: Inter, sans-serif; text-align: center; }
        .oz-c-card { background: #fff; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 30px 20px; }
        .oz-c-icon { font-size: 32px; color: #10b981; margin-bottom: 8px; }
        .oz-c-card h4 { font-size: 16px; font-weight: 800; color: #0f172a; margin: 0 0 4px 0; }
        .oz-c-card p { font-size: 12px; color: #64748b; margin: 0 0 10px 0; }
        .oz-c-card strong { color: #0f172a; font-size: 13.5px; }
      `
    },
    {
      id: 'contact-03',
      name: 'Clean Centered Contact Form',
      category: 'contact',
      variantCode: 'Contact_SimpleForm',
      groupCode: 'apex-commerce',
      groupName: 'Apex Commerce Pro',
      tag: 'corporate',
      description: 'Clean centered contact card with Name, Email, Subject, and Message textarea.',
      thumbnailGradient: 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
      previewIcon: 'contact_page',
      previewSubtitle: 'Simple Form',
      previewTitle: 'Send a Message',
      previewBody: 'Centered clean message form with required field validation',
      htmlTemplate: `
        <section class="oz-con-centered">
          <div class="oz-centered-box">
            <h2>Send Us a Message</h2>
            <p>Fill out the form below and an account specialist will follow up shortly.</p>
            <div class="oz-form-grid-2">
              <input type="text" placeholder="First Name" />
              <input type="text" placeholder="Last Name" />
            </div>
            <input type="email" placeholder="Email Address" class="oz-full-input" />
            <textarea rows="3" placeholder="Message content..." class="oz-full-input"></textarea>
            <button class="oz-btn-send">Submit Inquiry</button>
          </div>
        </section>
      `,
      cssStyles: `
        .oz-con-centered { padding: 50px 20px; background: #ffffff; font-family: Inter, sans-serif; }
        .oz-centered-box { max-width: 540px; margin: 0 auto; text-align: center; }
        .oz-centered-box h2 { font-size: 24px; font-weight: 900; color: #0f172a; margin: 0 0 6px 0; }
        .oz-centered-box p { font-size: 13px; color: #64748b; margin-bottom: 20px; }
        .oz-form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
        .oz-form-grid-2 input, .oz-full-input { width: 100%; padding: 10px 12px; border: 1.5px solid #cbd5e1; border-radius: 7px; font-size: 13px; box-sizing: border-box; margin-bottom: 10px; }
        .oz-btn-send { width: 100%; background: #0f172a; color: #fff; border: none; padding: 12px; border-radius: 7px; font-weight: 800; cursor: pointer; }
      `
    },
    {
      id: 'contact-04',
      name: 'Office Hours & Emergency Desk',
      category: 'contact',
      variantCode: 'Contact_OfficeHours',
      groupCode: 'apex-commerce',
      groupName: 'Apex Commerce Pro',
      tag: 'modern',
      description: 'Contact info block with live business hours status indicator ("Open Now").',
      thumbnailGradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      previewIcon: 'schedule',
      previewSubtitle: 'Live Office Status',
      previewTitle: 'Operating Hours & Direct Lines',
      previewBody: 'Live status indicator with regional working schedules',
      htmlTemplate: `
        <section class="oz-con-hours">
          <div class="oz-hours-box">
            <span class="oz-status-pill"><i class="fa-solid fa-circle text-success me-1" style="font-size:8px;"></i> Operating Live Now (09:00 - 18:00 EST)</span>
            <h2>Connect with our Executive Help Desk</h2>
            <div class="oz-hours-grid">
              <div><strong>Monday – Friday:</strong> 08:00 AM – 06:00 PM</div>
              <div><strong>Saturday:</strong> 10:00 AM – 02:00 PM</div>
              <div><strong>Sunday:</strong> Emergency Hotline Only</div>
            </div>
          </div>
        </section>
      `,
      cssStyles: `
        .oz-con-hours { padding: 50px 20px; background: #fffbeb; font-family: Inter, sans-serif; }
        .oz-hours-box { max-width: 650px; margin: 0 auto; text-align: center; }
        .oz-status-pill { background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 20px; font-size: 11.5px; font-weight: 800; }
        .oz-hours-box h2 { font-size: 22px; font-weight: 900; color: #78350f; margin: 12px 0 16px 0; }
        .oz-hours-grid { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: #92400e; }
      `
    },

    // -------------------------------------------------------------
    // 7. Blogs & News (4 Starter Blocks)
    // -------------------------------------------------------------
    {
      id: 'blog-01',
      name: '3-Column Magazine Article Grid',
      category: 'blog',
      variantCode: 'Blog_3ColGrid',
      groupCode: 'apex-commerce',
      groupName: 'Apex Commerce Pro',
      badge: 'Popular',
      tag: 'modern',
      description: '3-column article cards with thumbnail image, category badge, date, and read time.',
      thumbnailGradient: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
      previewIcon: 'article',
      previewSubtitle: 'Latest News',
      previewTitle: 'Insights, Governance & Best Practices',
      previewBody: '3-column card grid with thumbnail previews and author tags',
      htmlTemplate: `
        <section class="oz-blog-3col">
          <div class="oz-blog-head">
            <span class="oz-sec-pill">Articles & News</span>
            <h2>Latest Executive Insights</h2>
          </div>
          <div class="oz-b-grid">
            <div class="oz-b-card">
              <div class="oz-b-thumb"><i class="fa-solid fa-newspaper me-1"></i> Strategic Governance</div>
              <div class="oz-b-body">
                <span class="oz-b-cat">GOVERNANCE</span>
                <h4>How AI is Transforming Modern Board Elections</h4>
                <p>An in-depth look at secure cryptographic vote tallies and transparency.</p>
              </div>
            </div>
            <div class="oz-b-card">
              <div class="oz-b-thumb"><i class="fa-solid fa-chart-line me-1"></i> Member Metrics</div>
              <div class="oz-b-body">
                <span class="oz-b-cat">ANALYTICS</span>
                <h4>Top 5 KPIs for Measuring Alumni Engagement</h4>
                <p>Tracking cohort retention and committee participation rates effectively.</p>
              </div>
            </div>
            <div class="oz-b-card">
              <div class="oz-b-thumb"><i class="fa-solid fa-user-shield me-1"></i> Identity Security</div>
              <div class="oz-b-body">
                <span class="oz-b-cat">SECURITY</span>
                <h4>Implementing Zero-Trust in Community Portals</h4>
                <p>Best practices for multi-factor authentication and token management.</p>
              </div>
            </div>
          </div>
        </section>
      `,
      cssStyles: `
        .oz-blog-3col { padding: 50px 40px; background: #ffffff; font-family: Inter, sans-serif; }
        .oz-blog-head { text-align: center; margin-bottom: 30px; }
        .oz-blog-head h2 { font-size: 24px; font-weight: 900; color: #0f172a; margin: 6px 0; }
        .oz-b-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; max-width: 1100px; margin: 0 auto; }
        .oz-b-card { border: 1.5px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #fff; }
        .oz-b-thumb { height: 130px; background: #f1f5f9; display: flex; align-items: center; justify-content: center; font-weight: 800; color: #475569; }
        .oz-b-body { padding: 16px; }
        .oz-b-cat { font-size: 10px; font-weight: 800; color: #4f46e5; }
        .oz-b-body h4 { font-size: 15px; font-weight: 800; color: #0f172a; margin: 4px 0 6px 0; }
        .oz-b-body p { font-size: 12px; color: #64748b; line-height: 1.4; margin: 0; }
      `
    },
    {
      id: 'blog-02',
      name: 'Featured Hero Article + Compact List',
      category: 'blog',
      variantCode: 'Blog_FeaturedHighlight',
      groupCode: 'apex-commerce',
      groupName: 'Apex Commerce Pro',
      tag: 'corporate',
      description: '1 large featured hero article on left + 3 compact articles on right.',
      thumbnailGradient: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
      previewIcon: 'auto_stories',
      previewSubtitle: 'Featured Highlight',
      previewTitle: 'Hero Story + Sidebar Stream',
      previewBody: 'Split layout giving prominent weight to the headline editorial',
      htmlTemplate: `
        <section class="oz-blog-feat">
          <div class="oz-bf-left">
            <span class="oz-b-cat">FEATURED REPORT</span>
            <h2>2026 Global Association Benchmarking Survey Results</h2>
            <p>Over 1,200 member institutions participated in this year's comprehensive study on digital governance.</p>
          </div>
          <div class="oz-bf-right">
            <div class="oz-bf-item"><strong>Annual Conference Dates Announced</strong> • 3 min read</div>
            <div class="oz-bf-item"><strong>New Member Portal v2.0 Rollout</strong> • 2 min read</div>
            <div class="oz-bf-item"><strong>E-Voting Security Standards Whitepaper</strong> • 5 min read</div>
          </div>
        </section>
      `,
      cssStyles: `
        .oz-blog-feat { display: grid; grid-template-columns: 1.4fr 1fr; gap: 30px; padding: 50px 40px; background: #f8fafc; font-family: Inter, sans-serif; }
        .oz-bf-left { background: #fff; padding: 30px; border-radius: 12px; border: 1.5px solid #e2e8f0; }
        .oz-bf-left h2 { font-size: 22px; font-weight: 900; color: #0f172a; margin: 8px 0; }
        .oz-bf-left p { font-size: 13px; color: #64748b; }
        .oz-bf-right { display: flex; flex-direction: column; gap: 12px; justify-content: center; }
        .oz-bf-item { background: #fff; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 13px; color: #334155; }
      `
    },
    {
      id: 'blog-03',
      name: 'Modern Masonry Tagged Cards',
      category: 'blog',
      variantCode: 'Blog_MasonryCards',
      groupCode: 'apex-commerce',
      groupName: 'Apex Commerce Pro',
      tag: 'modern',
      description: 'Staggered dynamic card layout with author avatars and pill tags.',
      thumbnailGradient: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)',
      previewIcon: 'dashboard_customize',
      previewSubtitle: 'Masonry Cards',
      previewTitle: 'Dynamic Community Posts',
      previewBody: 'Flexible Pinterest-style card blocks with category filters',
      htmlTemplate: `<section style="padding:40px; background:#fff; text-align:center; font-family:Inter,sans-serif;"><h3>Masonry Article Stream</h3><p>Dynamic cards with author avatars</p></section>`,
      cssStyles: `.oz-placeholder { font-family: Inter, sans-serif; }`
    },
    {
      id: 'blog-04',
      name: 'Clean Horizontal Article List',
      category: 'blog',
      variantCode: 'Blog_MinimalList',
      groupCode: 'apex-commerce',
      groupName: 'Apex Commerce Pro',
      tag: 'corporate',
      description: 'Clean text-first horizontal article list with arrow hover transitions.',
      thumbnailGradient: 'linear-gradient(135deg, #475569 0%, #334155 100%)',
      previewIcon: 'format_list_bulleted',
      previewSubtitle: 'Minimal List',
      previewTitle: 'Text-First Article Index',
      previewBody: 'High-density article list ideal for archives and announcements',
      htmlTemplate: `<section style="padding:40px; background:#f8fafc; font-family:Inter,sans-serif;"><h3>Latest Dispatches & Circulars</h3></section>`,
      cssStyles: `.oz-placeholder { font-family: Inter, sans-serif; }`
    },

    // -------------------------------------------------------------
    // 8. E-Commerce Storefront Themes (4 Complete Store Suites)
    // -------------------------------------------------------------
    {
      id: 'ecom-01',
      name: 'Modern Retail Storefront Suite',
      category: 'ecommerce',
      variantCode: 'Ecom_ModernRetail',
      groupCode: 'apex-commerce',
      groupName: 'Apex Commerce Pro',
      badge: 'Popular',
      tag: 'ecommerce',
      description: 'Complete high-conversion storefront: 4-column responsive merchandise catalog, category filter pills, stock badges, and slide-cart trigger.',
      thumbnailGradient: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
      previewIcon: 'storefront',
      previewSubtitle: 'Storefront Suite',
      previewTitle: 'Modern Retail & Merch Catalog',
      previewBody: 'Product catalog grid, department filter pills, and instant cart drawer',
      sectionLists: [
        { title: 'Executive Blazer', price: '$140.00', badge: 'New', body: 'Official wool tailored blazer.' },
        { title: 'Member Lapel Pin', price: '$25.00', badge: 'Hot', body: 'Gold-plated official emblem.' },
        { title: 'Conference Tote Bag', price: '$35.00', body: 'Eco-friendly canvas carrying bag.' },
        { title: 'Leather Portfolio', price: '$65.00', body: 'Embossed organizational folder.' }
      ],
      htmlTemplate: `
        <section class="oz-ecom-suite">
          <div class="oz-es-top-bar">
            <div>
              <span class="oz-sec-pill">Official Storefront</span>
              <h2>Member Merchandise & Supplies</h2>
            </div>
            <div class="oz-es-cart-pill">
              <span class="material-symbols-outlined" style="font-size:18px;">shopping_bag</span>
              <span>Cart (3 items) • $230.00</span>
            </div>
          </div>
          <div class="oz-es-cats">
            <button class="active">All Products</button>
            <button>Apparel & Wear</button>
            <button>Pins & Medallions</button>
            <button>Conference Bags</button>
            <button>Stationery</button>
          </div>
          <div class="oz-eg-cards">
            <div class="oz-eg-card">
              <div class="oz-eg-badge">NEW</div>
              <div class="oz-eg-img"><i class="fa-solid fa-shirt fa-2x text-secondary"></i></div>
              <h4>Executive Blazer</h4>
              <p class="oz-eg-desc">Tailored navy blazer with subtle logo crest</p>
              <div class="oz-eg-bottom">
                <div class="oz-eg-price">$140.00</div>
                <button class="oz-eg-btn">Add to Cart</button>
              </div>
            </div>
            <div class="oz-eg-card">
              <div class="oz-eg-badge hot">HOT SELLER</div>
              <div class="oz-eg-img"><i class="fa-solid fa-award fa-2x text-warning"></i></div>
              <h4>Member Lapel Pin</h4>
              <p class="oz-eg-desc">24K gold-plated official fellowship pin</p>
              <div class="oz-eg-bottom">
                <div class="oz-eg-price">$25.00</div>
                <button class="oz-eg-btn">Add to Cart</button>
              </div>
            </div>
            <div class="oz-eg-card">
              <div class="oz-eg-img"><i class="fa-solid fa-bag-shopping fa-2x text-info"></i></div>
              <h4>Conference Tote Bag</h4>
              <p class="oz-eg-desc">Heavyweight eco canvas with inner zipper</p>
              <div class="oz-eg-bottom">
                <div class="oz-eg-price">$35.00</div>
                <button class="oz-eg-btn">Add to Cart</button>
              </div>
            </div>
            <div class="oz-eg-card">
              <div class="oz-eg-img"><i class="fa-solid fa-folder-open fa-2x text-primary"></i></div>
              <h4>Executive Leather Folio</h4>
              <p class="oz-eg-desc">Handcrafted top-grain leather document folder</p>
              <div class="oz-eg-bottom">
                <div class="oz-eg-price">$65.00</div>
                <button class="oz-eg-btn">Add to Cart</button>
              </div>
            </div>
          </div>
        </section>
      `,
      cssStyles: `
        .oz-ecom-suite { padding: 48px 40px; background: #ffffff; font-family: Inter, sans-serif; }
        .oz-es-top-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .oz-es-top-bar h2 { font-size: 24px; font-weight: 900; color: #0f172a; margin: 4px 0 0 0; }
        .oz-es-cart-pill { display: flex; align-items: center; gap: 8px; background: #0f172a; color: #fff; padding: 8px 16px; border-radius: 20px; font-size: 12.5px; font-weight: 700; }
        .oz-es-cats { display: flex; gap: 8px; margin-bottom: 28px; border-bottom: 1px solid #e2e8f0; padding-bottom: 14px; }
        .oz-es-cats button { background: none; border: 1px solid #e2e8f0; padding: 6px 14px; border-radius: 20px; font-size: 12.5px; font-weight: 600; color: #64748b; cursor: pointer; }
        .oz-es-cats button.active { background: #059669; color: #fff; border-color: #059669; }
        .oz-eg-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; max-width: 1200px; }
        .oz-eg-card { position: relative; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 18px; text-align: center; background: #fff; transition: 0.15s ease; }
        .oz-eg-card:hover { border-color: #059669; transform: translateY(-3px); box-shadow: 0 10px 25px -5px rgba(5,150,105,0.1); }
        .oz-eg-badge { position: absolute; top: 12px; left: 12px; background: #059669; color: #fff; font-size: 9px; font-weight: 800; padding: 3px 7px; border-radius: 4px; }
        .oz-eg-badge.hot { background: #ea580c; }
        .oz-eg-img { font-size: 44px; margin: 12px 0 8px 0; }
        .oz-eg-card h4 { font-size: 14.5px; font-weight: 800; color: #0f172a; margin: 0 0 4px 0; }
        .oz-eg-desc { font-size: 11.5px; color: #64748b; margin: 0 0 14px 0; line-height: 1.3; }
        .oz-eg-bottom { display: flex; align-items: center; justify-content: space-between; padding-top: 10px; border-top: 1px solid #f1f5f9; }
        .oz-eg-price { font-size: 15px; font-weight: 900; color: #059669; }
        .oz-eg-btn { background: #0f172a; color: #fff; border: none; padding: 7px 14px; border-radius: 6px; font-weight: 700; font-size: 12px; cursor: pointer; }
        .oz-eg-btn:hover { background: #059669; }
        @media(max-width: 900px) { .oz-eg-cards { grid-template-columns: repeat(2, 1fr); } }
      `
    },
    {
      id: 'ecom-02',
      name: 'Tech & Digital Boutique Suite',
      category: 'ecommerce',
      variantCode: 'Ecom_TechBoutique',
      groupCode: 'apex-commerce',
      groupName: 'Apex Commerce Pro',
      tag: 'dark',
      description: 'Sleek dark mode storefront with flash deal countdown timer, digital license picker, and cyber glow accents.',
      thumbnailGradient: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
      previewIcon: 'devices',
      previewSubtitle: 'Dark Boutique',
      previewTitle: 'Digital Licenses & Tech Hardware',
      previewBody: 'Flash deal countdown header with neon spec badges and digital delivery cards',
      htmlTemplate: `
        <section class="oz-ecom-dark">
          <div class="oz-ed-banner">
            <div><i class="fa-solid fa-bolt text-warning me-1"></i> FLASH SALE ENDS IN: <span class="oz-ed-clock">03h : 22m : 45s</span></div>
            <span class="oz-ed-disc">SAVE 30% SITEWIDE</span>
          </div>
          <div class="oz-ed-head">
            <h2>Digital Software & Hardware Lab</h2>
            <p>Instant activation keys and enterprise hardware credentials</p>
          </div>
          <div class="oz-ed-grid">
            <div class="oz-ed-card">
              <span class="oz-ed-tag">ENTERPRISE</span>
              <h3>BCC Security Key v2</h3>
              <p>FIDO2 biometric authentication hardware token</p>
              <div class="oz-ed-price">$89.00 <del>$120.00</del></div>
              <button class="oz-ed-btn">Order Key →</button>
            </div>
            <div class="oz-ed-card highlight">
              <span class="oz-ed-tag">SOFTWARE</span>
              <h3>Annual Cloud Pass</h3>
              <p>Unlimited storage and multi-team collaboration license</p>
              <div class="oz-ed-price">$199.00/yr <del>$299.00</del></div>
              <button class="oz-ed-btn">Subscribe Now →</button>
            </div>
          </div>
        </section>
      `,
      cssStyles: `
        .oz-ecom-dark { padding: 40px; background: #0b0f19; color: #fff; font-family: Inter, sans-serif; }
        .oz-ed-banner { display: flex; justify-content: space-between; align-items: center; background: #4338ca; padding: 10px 20px; border-radius: 8px; font-weight: 700; font-size: 13px; margin-bottom: 30px; }
        .oz-ed-clock { background: #312e81; padding: 3px 8px; border-radius: 4px; letter-spacing: 1px; }
        .oz-ed-disc { background: #22c55e; color: #000; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 900; }
        .oz-ed-head h2 { font-size: 24px; font-weight: 900; margin: 0 0 4px 0; }
        .oz-ed-head p { font-size: 13px; color: #94a3b8; margin: 0 0 24px 0; }
        .oz-ed-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .oz-ed-card { background: #111827; border: 1.5px solid #1f2937; border-radius: 12px; padding: 24px; }
        .oz-ed-card.highlight { border-color: #6366f1; box-shadow: 0 0 20px rgba(99,102,241,0.2); }
        .oz-ed-tag { font-size: 10px; font-weight: 800; color: #818cf8; letter-spacing: 0.5px; }
        .oz-ed-card h3 { font-size: 18px; font-weight: 800; margin: 6px 0; color: #f8fafc; }
        .oz-ed-card p { font-size: 12px; color: #94a3b8; line-height: 1.4; margin-bottom: 14px; }
        .oz-ed-price { font-size: 18px; font-weight: 900; color: #22c55e; margin-bottom: 14px; }
        .oz-ed-price del { font-size: 13px; color: #64748b; margin-left: 6px; }
        .oz-ed-btn { width: 100%; background: #6366f1; color: #fff; border: none; padding: 10px; border-radius: 6px; font-weight: 800; font-size: 13px; cursor: pointer; }
      `
    },
    {
      id: 'ecom-03',
      name: 'Minimalist Luxury Boutique Suite',
      category: 'ecommerce',
      variantCode: 'Ecom_MinimalLuxury',
      groupCode: 'apex-commerce',
      groupName: 'Apex Commerce Pro',
      tag: 'corporate',
      description: 'High-end editorial aesthetics with generous whitespace, serif headings, and department image tiles.',
      thumbnailGradient: 'linear-gradient(135deg, #18181b 0%, #27272a 100%)',
      previewIcon: 'diamond',
      previewSubtitle: 'Luxury Boutique',
      previewTitle: 'Curated Exclusive Collection',
      previewBody: 'Editorial typography with full-width showcase tiles and minimalist checkout',
      htmlTemplate: `
        <section class="oz-ecom-lux">
          <div class="oz-el-head">
            <span class="oz-el-edition">AUTUMN / WINTER 2026</span>
            <h2>The Signature Collection</h2>
            <p>Crafted exclusively for certified fellowship patrons</p>
          </div>
          <div class="oz-el-grid">
            <div class="oz-el-tile">
              <div class="oz-el-ph">⌚</div>
              <h4>Heritage Chronograph</h4>
              <span>$450.00</span>
            </div>
            <div class="oz-el-tile">
              <div class="oz-el-ph"><i class="fa-solid fa-pen-nib fa-2x text-dark"></i></div>
              <h4>Sterling Fountain Pen</h4>
              <span>$180.00</span>
            </div>
            <div class="oz-el-tile">
              <div class="oz-el-ph"><i class="fa-solid fa-gem fa-2x text-danger"></i></div>
              <h4>Cashmere Travel Wrap</h4>
              <span>$220.00</span>
            </div>
          </div>
        </section>
      `,
      cssStyles: `
        .oz-ecom-lux { padding: 60px 40px; background: #fafafa; font-family: Inter, sans-serif; text-align: center; }
        .oz-el-edition { font-size: 11px; font-weight: 700; letter-spacing: 2px; color: #a1a1aa; }
        .oz-el-head h2 { font-size: 30px; font-weight: 800; font-family: Georgia, serif; color: #18181b; margin: 8px 0; }
        .oz-el-head p { font-size: 13px; color: #71717a; margin-bottom: 40px; }
        .oz-el-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; max-width: 1000px; margin: 0 auto; }
        .oz-el-tile { background: #fff; padding: 30px 20px; border: 1px solid #e4e4e7; transition: 0.2s ease; }
        .oz-el-tile:hover { border-color: #18181b; transform: translateY(-4px); }
        .oz-el-ph { font-size: 48px; margin-bottom: 16px; }
        .oz-el-tile h4 { font-size: 15px; font-weight: 700; color: #18181b; margin: 0 0 6px 0; }
        .oz-el-tile span { font-size: 14px; color: #71717a; font-weight: 600; }
      `
    },
    {
      id: 'ecom-04',
      name: 'High-Volume Wholesale & Catalog Suite',
      category: 'ecommerce',
      variantCode: 'Ecom_SupermarketGrid',
      groupCode: 'apex-commerce',
      groupName: 'Apex Commerce Pro',
      tag: 'modern',
      description: 'High-density multi-department catalog with quick quantity steppers, bulk pricing tiers, and fast checkout.',
      thumbnailGradient: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
      previewIcon: 'format_list_bulleted',
      previewSubtitle: 'Wholesale Catalog',
      previewTitle: 'High-Volume Bulk Inventory',
      previewBody: '5-column high-density item stream with instant quantity steppers',
      htmlTemplate: `
        <section class="oz-ecom-whole">
          <div class="oz-ew-top">
            <h3><i class="fa-solid fa-building me-2"></i> Association Bulk Supply Catalog</h3>
            <span class="oz-ew-tier">Tier 1 Member Wholesale Active</span>
          </div>
          <table class="oz-ew-table">
            <thead>
              <tr><th>Item Name</th><th>SKU</th><th>Stock</th><th>Unit Price</th><th>Bulk Tier (10+)</th><th>Order Qty</th></tr>
            </thead>
            <tbody>
              <tr><td><strong>Custom Lanyards (Pack of 50)</strong></td><td>LY-50-BLU</td><td>In Stock</td><td>$75.00</td><td>$60.00 /pk</td><td><input type="number" value="1" style="width:50px; text-align:center;" /></td></tr>
              <tr><td><strong>Official Certificates (100 pcs)</strong></td><td>CERT-100</td><td>In Stock</td><td>$120.00</td><td>$95.00 /pk</td><td><input type="number" value="1" style="width:50px; text-align:center;" /></td></tr>
            </tbody>
          </table>
        </section>
      `,
      cssStyles: `
        .oz-ecom-whole { padding: 40px; background: #fff; font-family: Inter, sans-serif; }
        .oz-ew-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 12px; }
        .oz-ew-top h3 { margin: 0; font-size: 18px; font-weight: 800; color: #0f172a; }
        .oz-ew-tier { background: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 12px; font-size: 11.5px; font-weight: 700; }
        .oz-ew-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .oz-ew-table th { text-align: left; padding: 10px 12px; background: #f8fafc; border-bottom: 2px solid #e2e8f0; color: #475569; font-weight: 700; }
        .oz-ew-table td { padding: 12px; border-bottom: 1px solid #f1f5f9; color: #334155; }
      `
    },

    // -------------------------------------------------------------
    // 9. Breadcrumbs & Headers (4 Starter Blocks)
    // -------------------------------------------------------------
    {
      id: 'breadcrumb-01',
      name: 'Clean Minimal Breadcrumb Strip',
      category: 'breadcrumb',
      variantCode: 'Breadcrumb_CleanMinimal',
      groupCode: 'apex-commerce',
      groupName: 'Apex Commerce Pro',
      tag: 'modern',
      description: 'Simple horizontal breadcrumb navigation strip (Home > Pages > Detail).',
      thumbnailGradient: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      previewIcon: 'linear_scale',
      previewSubtitle: 'Minimal Strip',
      previewTitle: 'Home / Categories / Detail',
      previewBody: 'Light compact 32px path strip with arrow separators',
      htmlTemplate: `
        <div class="oz-bread-strip">
          <a href="#">Home</a> <span>/</span> <a href="#">Workspace Solutions</a> <span>/</span> <strong>Current Page</strong>
        </div>
      `,
      cssStyles: `
        .oz-bread-strip { display: flex; align-items: center; gap: 8px; padding: 14px 40px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; font-size: 12.5px; color: #64748b; font-family: Inter, sans-serif; }
        .oz-bread-strip a { color: #64748b; text-decoration: none; font-weight: 600; }
        .oz-bread-strip a:hover { color: #0050e5; }
        .oz-bread-strip strong { color: #0f172a; font-weight: 700; }
      `
    },
    {
      id: 'breadcrumb-02',
      name: 'Dark Background Banner Header',
      category: 'breadcrumb',
      variantCode: 'Breadcrumb_DarkBanner',
      groupCode: 'apex-commerce',
      groupName: 'Apex Commerce Pro',
      tag: 'dark',
      description: 'Dark background header with page title, subtitle, and breadcrumb path.',
      thumbnailGradient: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
      previewIcon: 'subtitles',
      previewSubtitle: 'Dark Banner',
      previewTitle: 'Executive Governance Framework',
      previewBody: 'Home / Governance / Framework',
      htmlTemplate: `
        <header class="oz-bread-dark">
          <div class="oz-bd-path"><a href="#">Home</a> / <a href="#">Governance</a> / <span>Framework</span></div>
          <h1>Executive Governance Framework</h1>
          <p>Comprehensive guidelines for member elections, board voting, and policy audits.</p>
        </header>
      `,
      cssStyles: `
        .oz-bread-dark { padding: 40px 40px; background: #0f172a; color: #fff; font-family: Inter, sans-serif; }
        .oz-bd-path { font-size: 11.5px; color: #94a3b8; margin-bottom: 10px; }
        .oz-bd-path a { color: #38bdf8; text-decoration: none; }
        .oz-bread-dark h1 { font-size: 26px; font-weight: 900; margin: 0 0 6px 0; }
        .oz-bread-dark p { font-size: 13.5px; color: #94a3b8; margin: 0; }
      `
    },
    {
      id: 'breadcrumb-03',
      name: 'Rich Photo Background Header',
      category: 'breadcrumb',
      variantCode: 'Breadcrumb_ImageOverlay',
      groupCode: 'apex-commerce',
      groupName: 'Apex Commerce Pro',
      tag: 'corporate',
      description: 'Rich photo background with dark overlay and centered headline title.',
      thumbnailGradient: 'linear-gradient(135deg, #0284c7 0%, #0f172a 100%)',
      previewIcon: 'wallpaper',
      previewSubtitle: 'Photo Banner',
      previewTitle: 'About Our Global Fellowship',
      previewBody: 'Photo background with atmospheric gradient overlay',
      htmlTemplate: `<header style="padding:50px; background:#0f172a; color:#fff; text-align:center; font-family:Inter,sans-serif;"><h1>About Our Global Fellowship</h1></header>`,
      cssStyles: `.oz-placeholder { font-family: Inter, sans-serif; }`
    },
    {
      id: 'breadcrumb-04',
      name: 'Split Header with Page Actions',
      category: 'breadcrumb',
      variantCode: 'Breadcrumb_SplitAction',
      groupCode: 'apex-commerce',
      groupName: 'Apex Commerce Pro',
      tag: 'modern',
      description: 'Left breadcrumb path + title, Right page action buttons (e.g. Export, Share).',
      thumbnailGradient: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
      previewIcon: 'splitscreen',
      previewSubtitle: 'Action Header',
      previewTitle: 'Member Directory & Roster',
      previewBody: 'Left Title + Right Export / Share Buttons',
      htmlTemplate: `<header style="display:flex; justify-content:space-between; align-items:center; padding:24px 40px; background:#fff; border-bottom:1px solid #e2e8f0; font-family:Inter,sans-serif;"><h2>Member Directory</h2><button style="padding:8px 16px; background:#0050e5; color:#fff; border:none; border-radius:6px; font-weight:700;">Export Roster</button></header>`,
      cssStyles: `.oz-placeholder { font-family: Inter, sans-serif; }`
    }
  ];

  filteredComponents: MarketComponentItem[] = [];
  totalComponentsCount: number = 36;

  // Installation state & keys
  installedTemplateIds: Set<string> = new Set<string>();
  activeMenuId: string = 'menu-01';
  activeHeroId: string = 'hero-01';
  activeNewsletterId: string = '';
  activeFooterId: string = 'footer-01';
  activeBlogId: string = '';
  activeBreadcrumbId: string = '';
  activeEcommerceId: string = 'ecom-01';

  // Singleton categories — only one active at a time (menu, hero, newsletter, footer, blog, breadcrumb, ecommerce)
  // Body and Contact are additive categories that support multiple instances
  singletonCategories: string[] = ['menu', 'hero', 'newsletter', 'footer', 'blog', 'breadcrumb', 'ecommerce'];
  isInstalling: boolean = false;
  installProgress: number = 0;
  installStatusMsg: string = '';

  // Modals state
  showPreviewModal: boolean = false;
  activePreviewComponent: MarketComponentItem | null = null;
  previewViewport: 'desktop' | 'mobile' = 'desktop';
  previewTab: 'visual' | 'html' | 'css' | 'js' = 'visual';
  renderedHtmlPreview: string = '';
  safePreviewHtml: SafeHtml = '';

  showInsertModal: boolean = false;
  activeInsertComponent: MarketComponentItem | null = null;
  targetPageId: string = 'page-home';
  targetPosition: string = 'bottom';
  customInsertTitle: string = '';
  inserting: boolean = false;

  availablePages: { id: string; title: string; slug: string }[] = [
    { id: 'page-home', title: 'Home Page', slug: 'home' },
    { id: 'page-about', title: 'About Us', slug: 'about' },
    { id: 'page-services', title: 'Services & Solutions', slug: 'services' },
    { id: 'page-contact', title: 'Contact Us', slug: 'contact' },
    { id: 'page-store', title: 'Official Store', slug: 'store' }
  ];

  // AI Tool Modals
  showAiVisionModal: boolean = false;
  aiScreenshotPreview: string = '';
  aiVisionCategory: string = 'body';
  aiVisionInstructions: string = '';
  aiGenerating: boolean = false;

  showAiPromptModal: boolean = false;
  aiPromptCategory: string = 'body';
  aiPromptText: string = '';

  constructor(
    private api: ApiService,
    private toast: ToastService,
    private router: Router,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    const el = document.getElementById('oz-marketplace-preview-style');
    if (el) el.remove();
    this.totalComponentsCount = this.allComponents.length;
    this.loadInstalledTemplateKeys();
    this.applyFilters();
  }

  ngOnDestroy(): void {
    const el = document.getElementById('oz-marketplace-preview-style');
    if (el) el.remove();
  }

  loadInstalledTemplateKeys(): void {
    const storedMenu = localStorage.getItem('oz_active_menu_id');
    const storedHero = localStorage.getItem('oz_active_hero_id');
    const storedNewsletter = localStorage.getItem('oz_active_newsletter_id');
    const storedFooter = localStorage.getItem('oz_active_footer_id');
    const storedBlog = localStorage.getItem('oz_active_blog_id');
    const storedBreadcrumb = localStorage.getItem('oz_active_breadcrumb_id');
    const storedEcommerce = localStorage.getItem('oz_active_ecommerce_id');

    if (storedMenu) this.activeMenuId = storedMenu;
    if (storedHero) this.activeHeroId = storedHero;
    if (storedNewsletter) this.activeNewsletterId = storedNewsletter;
    if (storedFooter) this.activeFooterId = storedFooter;
    if (storedBlog) this.activeBlogId = storedBlog;
    if (storedBreadcrumb) this.activeBreadcrumbId = storedBreadcrumb;
    if (storedEcommerce) this.activeEcommerceId = storedEcommerce;

    this.installedTemplateIds.clear();

    // Query installed templates from the tenant database API
    this.api.get<any>('ContentApi/templates/installed').subscribe({
      next: (res) => {
        if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
          const apiTemplates = res.data;
          apiTemplates.forEach((t: any) => {
            const match = this.allComponents.find(c => c.variantCode === t.variantCode || c.id === t.templateKey);
            if (match) {
              this.installedTemplateIds.add(match.id);
              const cat = t.categoryKey?.toLowerCase();
              if (cat === 'menu' && t.isActive) { this.activeMenuId = match.id; localStorage.setItem('oz_active_menu_id', match.id); }
              if (cat === 'hero' && t.isActive) { this.activeHeroId = match.id; localStorage.setItem('oz_active_hero_id', match.id); }
              if (cat === 'newsletter' && t.isActive) { this.activeNewsletterId = match.id; localStorage.setItem('oz_active_newsletter_id', match.id); }
              if (cat === 'footer' && t.isActive) { this.activeFooterId = match.id; localStorage.setItem('oz_active_footer_id', match.id); }
              if (cat === 'blog' && t.isActive) { this.activeBlogId = match.id; localStorage.setItem('oz_active_blog_id', match.id); }
              if (cat === 'breadcrumb' && t.isActive) { this.activeBreadcrumbId = match.id; localStorage.setItem('oz_active_breadcrumb_id', match.id); }
              if (cat === 'ecommerce' && t.isActive) { this.activeEcommerceId = match.id; localStorage.setItem('oz_active_ecommerce_id', match.id); }
            }
          });
        }
      },
      error: () => {}
    });
  }

  isInstalled(id: string): boolean {
    return this.installedTemplateIds.has(id);
  }

  isSingletonCategory(cat: string): boolean {
    return this.singletonCategories.includes(cat);
  }

  isActiveMenu(item: MarketComponentItem | null): boolean {
    if (!item) return false;
    return item.category === 'menu' && this.isInstalled(item.id) && this.activeMenuId === item.id;
  }

  isActiveHero(item: MarketComponentItem | null): boolean {
    if (!item) return false;
    return item.category === 'hero' && this.isInstalled(item.id) && this.activeHeroId === item.id;
  }

  isActiveNewsletter(item: MarketComponentItem | null): boolean {
    if (!item) return false;
    return item.category === 'newsletter' && this.isInstalled(item.id) && this.activeNewsletterId === item.id;
  }

  isActiveFooter(item: MarketComponentItem | null): boolean {
    if (!item) return false;
    return item.category === 'footer' && this.isInstalled(item.id) && this.activeFooterId === item.id;
  }

  isActiveBlog(item: MarketComponentItem | null): boolean {
    if (!item) return false;
    return item.category === 'blog' && this.isInstalled(item.id) && this.activeBlogId === item.id;
  }

  isActiveBreadcrumb(item: MarketComponentItem | null): boolean {
    if (!item) return false;
    return item.category === 'breadcrumb' && this.isInstalled(item.id) && this.activeBreadcrumbId === item.id;
  }

  isActiveEcommerce(item: MarketComponentItem | null): boolean {
    if (!item) return false;
    return item.category === 'ecommerce' && this.isInstalled(item.id) && this.activeEcommerceId === item.id;
  }

  isActiveSingleton(item: MarketComponentItem | null): boolean {
    return this.isActiveMenu(item) || this.isActiveHero(item) || this.isActiveNewsletter(item) || this.isActiveFooter(item) || this.isActiveBlog(item) || this.isActiveBreadcrumb(item) || this.isActiveEcommerce(item);
  }

  hasDifferentActiveMenu(item: MarketComponentItem | null): boolean {
    if (!item) return false;
    return item.category === 'menu' && !!this.activeMenuId && this.isInstalled(this.activeMenuId) && this.activeMenuId !== item.id;
  }

  hasDifferentActiveHero(item: MarketComponentItem | null): boolean {
    if (!item) return false;
    return item.category === 'hero' && !!this.activeHeroId && this.isInstalled(this.activeHeroId) && this.activeHeroId !== item.id;
  }

  hasDifferentActiveNewsletter(item: MarketComponentItem | null): boolean {
    if (!item) return false;
    return item.category === 'newsletter' && !!this.activeNewsletterId && this.isInstalled(this.activeNewsletterId) && this.activeNewsletterId !== item.id;
  }

  hasDifferentActiveFooter(item: MarketComponentItem | null): boolean {
    if (!item) return false;
    return item.category === 'footer' && !!this.activeFooterId && this.isInstalled(this.activeFooterId) && this.activeFooterId !== item.id;
  }

  hasDifferentActiveBlog(item: MarketComponentItem | null): boolean {
    if (!item) return false;
    return item.category === 'blog' && !!this.activeBlogId && this.isInstalled(this.activeBlogId) && this.activeBlogId !== item.id;
  }

  hasDifferentActiveBreadcrumb(item: MarketComponentItem | null): boolean {
    if (!item) return false;
    return item.category === 'breadcrumb' && !!this.activeBreadcrumbId && this.isInstalled(this.activeBreadcrumbId) && this.activeBreadcrumbId !== item.id;
  }

  hasDifferentActiveEcommerce(item: MarketComponentItem | null): boolean {
    if (!item) return false;
    return item.category === 'ecommerce' && !!this.activeEcommerceId && this.isInstalled(this.activeEcommerceId) && this.activeEcommerceId !== item.id;
  }

  hasDifferentActiveSingleton(item: MarketComponentItem | null): boolean {
    return this.hasDifferentActiveMenu(item) || this.hasDifferentActiveHero(item) || this.hasDifferentActiveNewsletter(item) || this.hasDifferentActiveFooter(item) || this.hasDifferentActiveBlog(item) || this.hasDifferentActiveBreadcrumb(item) || this.hasDifferentActiveEcommerce(item);
  }

  // Card Actions (Always opens Preview Modal first)
  // --- Singleton label helpers ---
  getSingletonLabel(cat: string): string {
    if (cat === 'menu') return 'Navbar';
    if (cat === 'hero') return 'Hero Section';
    if (cat === 'newsletter') return 'Newsletter';
    if (cat === 'footer') return 'Footer';
    if (cat === 'blog') return 'Blog Layout';
    if (cat === 'breadcrumb') return 'Breadcrumb Header';
    if (cat === 'ecommerce') return 'Storefront Theme';
    return 'Template';
  }

  getCardButtonText(item: MarketComponentItem | null): string {
    if (!item) return 'Preview & Install';

    // Singleton categories: menu, hero, newsletter, footer
    if (this.isActiveSingleton(item)) return `Active ${this.getSingletonLabel(item.category)} (Preview)`;
    if (this.hasDifferentActiveSingleton(item)) return `Preview / Replace Active ${this.getSingletonLabel(item.category)}`;
    if (this.isSingletonCategory(item.category)) return `Preview & Install ${this.getSingletonLabel(item.category)}`;

    // Body (additive) — can have many
    return this.isInstalled(item.id) ? 'Preview (Installed)' : 'Preview & Install';
  }

  getCardButtonIcon(item: MarketComponentItem | null): string {
    if (!item) return 'visibility';
    if (this.isActiveSingleton(item)) return 'verified';
    if (this.hasDifferentActiveSingleton(item)) return 'published_with_changes';
    if (this.isInstalled(item.id)) return 'visibility';
    return 'visibility';
  }

  getCardButtonClass(item: MarketComponentItem | null): string {
    if (!item) return 'btn-card-primary';
    if (this.isActiveSingleton(item)) return 'btn-card-installed';
    if (this.hasDifferentActiveSingleton(item)) return 'btn-card-replace';
    return 'btn-card-primary';
  }

  // Modal Actions (Triggers actual installation with 2-second progress bar)
  getButtonText(item: MarketComponentItem | null): string {
    if (!item) return 'Install Template';

    // Singleton categories
    if (this.isActiveSingleton(item)) return `Active ${this.getSingletonLabel(item.category)}`;
    if (this.hasDifferentActiveSingleton(item)) return `Replace Active ${this.getSingletonLabel(item.category)}`;
    if (this.isSingletonCategory(item.category)) return `Install ${this.getSingletonLabel(item.category)}`;

    // Body (additive)
    return this.isInstalled(item.id) ? 'Installed in Library' : 'Install Template';
  }

  getButtonIcon(item: MarketComponentItem | null): string {
    if (!item) return 'download';
    if (this.isActiveSingleton(item)) return 'verified';
    if (this.hasDifferentActiveSingleton(item)) return 'published_with_changes';
    if (this.isInstalled(item.id)) return 'check_circle';
    return 'download';
  }

  getButtonClass(item: MarketComponentItem | null): string {
    if (!item) return 'btn-primary';
    if (this.isActiveSingleton(item) || (!this.isSingletonCategory(item.category) && this.isInstalled(item.id))) {
      return 'btn-installed';
    }
    if (this.hasDifferentActiveSingleton(item)) {
      return 'btn-replace';
    }
    return 'btn-primary';
  }

  installTemplate(item: MarketComponentItem | null): void {
    if (!item || this.isInstalling) return;

    this.isInstalling = true;
    this.installProgress = 0;

    const isReplacingSingleton = this.hasDifferentActiveSingleton(item);
    const singletonLabel = this.getSingletonLabel(item.category);

    let step1Msg = 'Connecting to Master Marketplace...';
    let step2Msg = 'Fetching HTML markup & scoped CSS...';
    let step3Msg = 'Saving to Database...';
    let finalMsg = `Template '${item.name}' installed to My Templates!`;

    if (isReplacingSingleton) {
      step1Msg = `Switching website active ${singletonLabel.toLowerCase()} to ${item.name}...`;
      step2Msg = `Configuring responsive ${singletonLabel.toLowerCase()} layout...`;
      step3Msg = 'Updating layout pointer in database...';
      finalMsg = `Active ${singletonLabel} Replaced with ${item.name}!`;
    }

    this.installStatusMsg = step1Msg;

    const intervalTime = 40; // 40ms * 50 ticks = 2000ms
    const totalTicks = 50;
    let currentTick = 0;

    const timer = setInterval(() => {
      currentTick++;
      this.installProgress = Math.min(100, Math.round((currentTick / totalTicks) * 100));

      if (this.installProgress <= 30) {
        this.installStatusMsg = step1Msg;
      } else if (this.installProgress <= 70) {
        this.installStatusMsg = step2Msg;
      } else if (this.installProgress < 100) {
        this.installStatusMsg = step3Msg;
      } else {
        this.installStatusMsg = finalMsg;
      }

      if (currentTick >= totalTicks) {
        clearInterval(timer);
        this.installProgress = 100;
        this.installStatusMsg = finalMsg;

        setTimeout(() => {
          this.isInstalling = false;

          // Singleton updates — menu, hero, newsletter, footer are 1-active-at-a-time
          if (this.isSingletonCategory(item.category)) {
            // Remove all previous installed of this singleton category
            this.allComponents.filter(c => c.category === item.category).forEach(c => this.installedTemplateIds.delete(c.id));
            this.installedTemplateIds.add(item.id);

            // Set active ID for this singleton category
            if (item.category === 'menu') { this.activeMenuId = item.id; localStorage.setItem('oz_active_menu_id', item.id); }
            if (item.category === 'hero') { this.activeHeroId = item.id; localStorage.setItem('oz_active_hero_id', item.id); }
            if (item.category === 'newsletter') { this.activeNewsletterId = item.id; localStorage.setItem('oz_active_newsletter_id', item.id); }
            if (item.category === 'footer') { this.activeFooterId = item.id; localStorage.setItem('oz_active_footer_id', item.id); }
            if (item.category === 'blog') { this.activeBlogId = item.id; localStorage.setItem('oz_active_blog_id', item.id); }
            if (item.category === 'breadcrumb') { this.activeBreadcrumbId = item.id; localStorage.setItem('oz_active_breadcrumb_id', item.id); }
            if (item.category === 'ecommerce') { this.activeEcommerceId = item.id; localStorage.setItem('oz_active_ecommerce_id', item.id); }
          } else {
            // Body/additive — can have many
            this.installedTemplateIds.add(item.id);
          }

          // Send to tenant DB API
          this.api.post<any>('ContentApi/templates/install', {
            templateKey: item.id,
            categoryKey: item.category,
            name: item.name,
            variantCode: item.variantCode,
            groupCode: (item as any).groupCode || 'apex-commerce',
            groupName: (item as any).groupName || 'Apex Commerce Pro',
            htmlTemplate: item.htmlTemplate,
            cssStyles: item.cssStyles,
            jsScript: item.jsScript,
            installedVersion: '1.0.0'
          }).subscribe({
            next: () => {},
            error: () => {}
          });

          this.toast.success(finalMsg);
        }, 300);
      }
    }, intervalTime);
  }

  get activeCategoryObj(): MarketCategory | undefined {
    return this.categories.find(c => c.id === this.selectedCategory);
  }

  setCategory(catId: string): void {
    this.selectedCategory = catId;
    this.applyFilters();
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  applyFilters(): void {
    let result = [...this.allComponents];

    if (this.selectedCategory !== 'all') {
      result = result.filter(c => c.category === this.selectedCategory);
    }

    if (this.selectedStyleFilter !== 'all') {
      result = result.filter(c => c.tag === this.selectedStyleFilter);
    }

    if (this.searchQuery && this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      result = result.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.variantCode.toLowerCase().includes(q) ||
        c.tag.toLowerCase().includes(q)
      );
    }

    this.filteredComponents = result;
  }

  getCategoryCount(catId: string): number {
    return this.allComponents.filter(c => c.category === catId).length;
  }

  getCategoryName(catId: string): string {
    const found = this.categories.find(c => c.id === catId);
    return found ? found.name : catId;
  }

  openPreviewModal(item: MarketComponentItem): void {
    this.activePreviewComponent = item;
    this.previewViewport = 'desktop';
    this.previewTab = 'visual';
    this.isInstalling = false;
    this.installProgress = 0;
    this.installStatusMsg = '';

    // Combine scoped CSS and HTML with bypassSecurityTrustHtml so Angular will not strip styles
    const combined = `<style>${item.cssStyles}</style>\n${item.htmlTemplate}`;
    this.safePreviewHtml = this.sanitizer.bypassSecurityTrustHtml(combined);

    // Direct DOM stylesheet injection to guarantee 100% style rendering in all browsers
    let styleEl = document.getElementById('oz-marketplace-preview-style') as HTMLStyleElement;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'oz-marketplace-preview-style';
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = item.cssStyles;

    this.showPreviewModal = true;
  }

  copyCodeToClipboard(): void {
    if (!this.activePreviewComponent) return;
    let code = '';
    if (this.previewTab === 'html') code = this.activePreviewComponent.htmlTemplate;
    else if (this.previewTab === 'css') code = this.activePreviewComponent.cssStyles;
    else if (this.previewTab === 'js') code = this.activePreviewComponent.jsScript || '';

    navigator.clipboard.writeText(code).then(() => {
      this.toast.success(`${this.previewTab.toUpperCase()} code copied to clipboard!`);
    });
  }

  closePreviewModal(): void {
    this.showPreviewModal = false;
    this.activePreviewComponent = null;
    this.isInstalling = false;
    this.installProgress = 0;
    this.installStatusMsg = '';
    this.safePreviewHtml = '';
    const styleEl = document.getElementById('oz-marketplace-preview-style');
    if (styleEl) styleEl.remove();
  }

  openInsertModal(item: MarketComponentItem): void {
    this.activeInsertComponent = item;
    this.customInsertTitle = item.previewTitle;
    this.showInsertModal = true;
  }

  closeInsertModal(): void {
    this.showInsertModal = false;
    this.activeInsertComponent = null;
  }

  confirmInsertIntoPage(): void {
    if (!this.activeInsertComponent) return;
    this.inserting = true;

    // Simulate API call to attach section to page in DB
    setTimeout(() => {
      this.inserting = false;
      this.toast.success(`"${this.activeInsertComponent?.name}" successfully inserted into selected page!`);
      this.closeInsertModal();
      this.closePreviewModal();
    }, 800);
  }

  openAiVisionModal(): void {
    this.showAiVisionModal = true;
  }

  onAiImageSelected(event: any): void {
    const file = event.target?.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.aiScreenshotPreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  executeVisionAiGeneration(): void {
    this.aiGenerating = true;
    setTimeout(() => {
      this.aiGenerating = false;
      this.showAiVisionModal = false;
      this.aiScreenshotPreview = '';
      this.toast.success('Vision AI analyzed screenshot, generated HTML/CSS & configured section assets!');
    }, 1500);
  }

  openAiPromptModal(): void {
    this.showAiPromptModal = true;
  }

  executePromptAiGeneration(): void {
    this.aiGenerating = true;
    setTimeout(() => {
      this.aiGenerating = false;
      this.showAiPromptModal = false;
      this.aiPromptText = '';
      this.toast.success('AI successfully generated new section block with responsive copy & media assets!');
    }, 1500);
  }
}
