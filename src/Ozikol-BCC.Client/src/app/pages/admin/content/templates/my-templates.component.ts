import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ToastService } from '../../../../core/services/toast.service';
import { ApiService } from '../../../../core/services/api.service';

export interface InstalledTemplateItem {
  id: string;
  dbId?: string;
  name: string;
  category: string;
  variantCode: string;
  badge?: string;
  tag: string;
  description: string;
  thumbnailGradient: string;
  previewIcon: string;
  previewSubtitle: string;
  previewTitle: string;
  previewBody: string;
  htmlTemplate: string;
  cssStyles: string;
  jsScript?: string;
  version: string;
  installedUtc: string;
  isCustomized?: boolean;
}

export interface CodeInjectionTag {
  id: string;
  name: string;
  zone: 'head' | 'body_open' | 'footer';
  tagType: string;
  content: string;
  sortOrder: number;
  isActive: boolean;
  createdAtUtc?: string;
}

@Component({
  selector: 'app-my-templates',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="my-templates-container">
      <!-- Top Page Header -->
      <div class="page-header-card">
        <div class="header-main-row">
          <div class="header-left">
            <div class="breadcrumb-trail">
              <a routerLink="/admin/dashboard">Console</a>
              <span class="sep">/</span>
              <a routerLink="/content/console">CMS Studio</a>
              <span class="sep">/</span>
              <span class="current">My Templates</span>
            </div>

            <div class="title-with-icon">
              <div class="header-icon-box">
                <span class="material-symbols-outlined">layers</span>
              </div>
              <div class="title-text-wrap">
                <div class="title-row">
                  <h1 class="page-title">My Installed Templates</h1>
                  <span class="badge-total-count">{{ installedTemplates.length }} Active</span>
                </div>
                <p class="page-subtitle">
                  Your tenant's component vault. Installed templates can be assigned to pages in CMS Studio or previewed together in a live simulated website demo.
                </p>
              </div>
            </div>
          </div>

          <div class="header-actions">
            <button
              type="button"
              class="btn btn-add-custom-template"
              (click)="openCreateCustomTemplateModal()"
              title="Create a custom section template directly with HTML placeholders"
            >
              <span class="material-symbols-outlined btn-icon">add_circle</span>
              <span>Create Custom Section</span>
            </button>
            <button
              type="button"
              class="btn btn-full-demo-hero"
              (click)="openFullSiteDemoModal()"
              [disabled]="installedTemplates.length === 0"
              title="Preview a simulated full website theme from your installed templates"
            >
              <span class="material-symbols-outlined btn-icon">public</span>
              <span>Preview Full Site Demo</span>
            </button>
            <a routerLink="/content/console/marketplace" class="btn btn-primary-market" title="Browse and install more section components">
              <span class="material-symbols-outlined btn-icon">add_shopping_cart</span>
              <span>Explore Marketplace (36+)</span>
            </a>
          </div>
        </div>
      </div>

      <!-- Main Navigation Tabs: Section Vault vs 3-Zone Injections -->
      <div class="mytemplates-main-tabs">
        <button type="button" class="main-tab-item" [class.active]="activeMainTab === 'vault'" (click)="activeMainTab = 'vault'">
          <span class="material-symbols-outlined">layers</span>
          <span>Section Templates</span>
          <span class="tab-count-pill">{{ installedTemplates.length }}</span>
        </button>
        <button type="button" class="main-tab-item" [class.active]="activeMainTab === 'head'" (click)="activeMainTab = 'head'">
          <span class="material-symbols-outlined">code</span>
          <span>Header Tags (&lt;head&gt;)</span>
          <span class="tab-count-pill">{{ headTags.length }}</span>
        </button>
        <button type="button" class="main-tab-item" [class.active]="activeMainTab === 'body_open'" (click)="activeMainTab = 'body_open'">
          <span class="material-symbols-outlined">transit_enterexit</span>
          <span>Body Open (&lt;body&gt;)</span>
          <span class="tab-count-pill">{{ bodyOpenTags.length }}</span>
        </button>
        <button type="button" class="main-tab-item" [class.active]="activeMainTab === 'footer'" (click)="activeMainTab = 'footer'">
          <span class="material-symbols-outlined">dock_to_bottom</span>
          <span>Footer Scripts (&lt;/body&gt;)</span>
          <span class="tab-count-pill">{{ footerTags.length }}</span>
        </button>
      </div>

      <!-- Tab 1: Section Templates Vault Pane -->
      <div class="vault-tab-pane" *ngIf="activeMainTab === 'vault'">
        <!-- Active Theme Blueprint Pipeline Banner -->
        <div class="theme-blueprint-card" *ngIf="installedTemplates.length > 0">
        <div class="blueprint-header">
          <div class="blueprint-title-wrap">
            <span class="material-symbols-outlined blueprint-icon">tune</span>
            <div>
              <h2 class="blueprint-title">Active Website Theme Blueprint</h2>
              <span class="blueprint-sub">Visual assembly order for your public website layout</span>
            </div>
          </div>
          <div class="blueprint-stats">
            <span class="blueprint-stat-pill">
              <strong>{{ getBlueprintFilledCount() }}</strong> / 6 Layers Configured
            </span>
          </div>
        </div>

        <div class="blueprint-pipeline">
          <!-- Step 1: Navbar -->
          <div class="pipeline-slot" [class.slot-active]="getActiveMenu()" [class.slot-empty]="!getActiveMenu()">
            <div class="slot-badge">Layer 1</div>
            <div class="slot-icon-wrap">
              <span class="material-symbols-outlined">menu</span>
            </div>
            <div class="slot-info">
              <span class="slot-role">Navigation Menu</span>
              <strong class="slot-name">{{ getActiveMenu()?.name || 'No Menu Installed' }}</strong>
            </div>
            <div class="slot-action">
              <button *ngIf="getActiveMenu()" class="btn-slot-preview" (click)="openSinglePreviewModal(getActiveMenu()!)" title="Preview Active Menu">
                <span class="material-symbols-outlined">visibility</span>
              </button>
              <a *ngIf="!getActiveMenu()" routerLink="/content/console/marketplace" class="btn-slot-add" title="Browse Navbars">+ Add</a>
            </div>
          </div>

          <!-- Step 2: Hero -->
          <div class="pipeline-slot" [class.slot-active]="getActiveHero()" [class.slot-empty]="!getActiveHero()">
            <div class="slot-badge">Layer 2</div>
            <div class="slot-icon-wrap">
              <span class="material-symbols-outlined">view_carousel</span>
            </div>
            <div class="slot-info">
              <span class="slot-role">Hero Showcase</span>
              <strong class="slot-name">{{ getActiveHero()?.name || 'No Hero Installed' }}</strong>
            </div>
            <div class="slot-action">
              <button *ngIf="getActiveHero()" class="btn-slot-preview" (click)="openSinglePreviewModal(getActiveHero()!)" title="Preview Hero Banner">
                <span class="material-symbols-outlined">visibility</span>
              </button>
              <a *ngIf="!getActiveHero()" routerLink="/content/console/marketplace" class="btn-slot-add" title="Browse Hero Banners">+ Add</a>
            </div>
          </div>

          <!-- Step 3: Body Features -->
          <div class="pipeline-slot" [class.slot-active]="getActiveBody()" [class.slot-empty]="!getActiveBody()">
            <div class="slot-badge">Layer 3</div>
            <div class="slot-icon-wrap">
              <span class="material-symbols-outlined">view_quilt</span>
            </div>
            <div class="slot-info">
              <span class="slot-role">Body Features</span>
              <strong class="slot-name">{{ getActiveBody()?.name || 'No Feature Block' }}</strong>
            </div>
            <div class="slot-action">
              <button *ngIf="getActiveBody()" class="btn-slot-preview" (click)="openSinglePreviewModal(getActiveBody()!)" title="Preview Feature Block">
                <span class="material-symbols-outlined">visibility</span>
              </button>
              <a *ngIf="!getActiveBody()" routerLink="/content/console/marketplace" class="btn-slot-add" title="Browse Feature Blocks">+ Add</a>
            </div>
          </div>

          <!-- Step 4: Newsletter -->
          <div class="pipeline-slot" [class.slot-active]="getActiveNewsletter()" [class.slot-empty]="!getActiveNewsletter()">
            <div class="slot-badge">Layer 4</div>
            <div class="slot-icon-wrap">
              <span class="material-symbols-outlined">mail</span>
            </div>
            <div class="slot-info">
              <span class="slot-role">Lead / Newsletter</span>
              <strong class="slot-name">{{ getActiveNewsletter()?.name || 'No Form Block' }}</strong>
            </div>
            <div class="slot-action">
              <button *ngIf="getActiveNewsletter()" class="btn-slot-preview" (click)="openSinglePreviewModal(getActiveNewsletter()!)" title="Preview Newsletter">
                <span class="material-symbols-outlined">visibility</span>
              </button>
              <a *ngIf="!getActiveNewsletter()" routerLink="/content/console/marketplace" class="btn-slot-add" title="Browse Newsletter Forms">+ Add</a>
            </div>
          </div>

          <!-- Step 5: Footer -->
          <div class="pipeline-slot" [class.slot-active]="getActiveFooter()" [class.slot-empty]="!getActiveFooter()">
            <div class="slot-badge">Layer 5</div>
            <div class="slot-icon-wrap">
              <span class="material-symbols-outlined">dock_to_bottom</span>
            </div>
            <div class="slot-info">
              <span class="slot-role">Footer Bar</span>
              <strong class="slot-name">{{ getActiveFooter()?.name || 'No Footer Installed' }}</strong>
            </div>
            <div class="slot-action">
              <button *ngIf="getActiveFooter()" class="btn-slot-preview" (click)="openSinglePreviewModal(getActiveFooter()!)" title="Preview Footer">
                <span class="material-symbols-outlined">visibility</span>
              </button>
              <a *ngIf="!getActiveFooter()" routerLink="/content/console/marketplace" class="btn-slot-add" title="Browse Footers">+ Add</a>
            </div>
          </div>

          <!-- Step 6: Storefront Theme -->
          <div class="pipeline-slot" [class.slot-active]="getActiveEcommerce()" [class.slot-empty]="!getActiveEcommerce()">
            <div class="slot-badge">Store</div>
            <div class="slot-icon-wrap">
              <span class="material-symbols-outlined">storefront</span>
            </div>
            <div class="slot-info">
              <span class="slot-role">Storefront Theme</span>
              <strong class="slot-name">{{ getActiveEcommerce()?.name || 'No Storefront Suite' }}</strong>
            </div>
            <div class="slot-action">
              <button *ngIf="getActiveEcommerce()" class="btn-slot-preview" (click)="openSinglePreviewModal(getActiveEcommerce()!)" title="Preview Storefront">
                <span class="material-symbols-outlined">visibility</span>
              </button>
              <a *ngIf="!getActiveEcommerce()" routerLink="/content/console/marketplace" class="btn-slot-add" title="Browse Storefronts">+ Add</a>
            </div>
          </div>
        </div>
      </div>

      <!-- Toolbar: Search, Filters & View Mode Switcher -->
      <div class="templates-toolbar">
        <div class="toolbar-top-row">
          <div class="search-input-wrap">
            <span class="material-symbols-outlined search-icon">search</span>
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (input)="applyFilters()"
              class="form-control templates-search"
              placeholder="Search installed templates by title, variant code, or role..."
            />
            <button *ngIf="searchQuery" (click)="searchQuery = ''; applyFilters()" class="btn-clear-search">✕</button>
          </div>

          <div class="view-mode-toggle">
            <button
              type="button"
              class="toggle-btn"
              [class.active]="viewMode === 'grid'"
              (click)="setViewMode('grid')"
              title="Visual Card Grid View"
            >
              <span class="material-symbols-outlined">grid_view</span>
              <span>Cards</span>
            </button>
            <button
              type="button"
              class="toggle-btn"
              [class.active]="viewMode === 'table'"
              (click)="setViewMode('table')"
              title="Compact Table Matrix View"
            >
              <span class="material-symbols-outlined">view_list</span>
              <span>Table</span>
            </button>
          </div>
        </div>

        <div class="category-filter-chips">
          <button
            type="button"
            class="filter-chip"
            [class.active]="selectedCategory === 'all'"
            (click)="setCategory('all')"
          >
            All ({{ installedTemplates.length }})
          </button>
          <button
            type="button"
            class="filter-chip"
            *ngFor="let cat of categories"
            [class.active]="selectedCategory === cat.id"
            (click)="setCategory(cat.id)"
          >
            <span class="material-symbols-outlined chip-icon">{{ cat.icon }}</span>
            <span>{{ cat.name }}</span>
            <span class="chip-count">{{ getCategoryCount(cat.id) }}</span>
          </button>
        </div>
      </div>

      <!-- Main Content: Visual Card Grid Mode -->
      <div class="templates-content" *ngIf="viewMode === 'grid' && filteredTemplates.length > 0">
        <div class="templates-cards-grid">
          <div class="template-card" *ngFor="let item of filteredTemplates">
            <!-- Visual Mock Thumbnail Header -->
            <div class="card-visual-banner" [style.background]="item.thumbnailGradient">
              <div class="banner-top-tags">
                <span class="category-tag">
                  <span class="material-symbols-outlined tag-cat-icon">{{ getCategoryIcon(item.category) }}</span>
                  {{ getCategoryName(item.category) }}
                </span>
                <span class="active-badge" *ngIf="isActiveSingleton(item)">
                  ✓ Active {{ getSingletonLabel(item.category) }}
                </span>
                <span class="version-tag" *ngIf="!isActiveSingleton(item)">
                  v{{ item.version }}
                </span>
              </div>

              <!-- Stylized Mini Wireframe Preview -->
              <div class="wireframe-mock-box">
                <div class="wireframe-header-line">
                  <span class="wire-dot"></span>
                  <span class="wire-dot"></span>
                  <span class="wire-dot"></span>
                  <span class="wire-title-pill">{{ item.variantCode }}</span>
                </div>
                <div class="wireframe-body">
                  <div class="wire-icon-wrap">
                    <span class="material-symbols-outlined">{{ item.previewIcon }}</span>
                  </div>
                  <div class="wire-text-col">
                    <span class="wire-sub">{{ item.previewSubtitle }}</span>
                    <strong class="wire-h">{{ item.previewTitle }}</strong>
                  </div>
                </div>
              </div>
            </div>

            <!-- Card Content Body -->
            <div class="card-body">
              <div class="card-title-row">
                <h3 class="card-title">{{ item.name }}</h3>
                <span class="badge-tag" *ngIf="item.badge">{{ item.badge }}</span>
              </div>
              <p class="card-desc">{{ item.description }}</p>

              <div class="card-meta-row">
                <div class="meta-item">
                  <span class="meta-label">Code:</span>
                  <code class="meta-code">{{ item.variantCode }}</code>
                </div>
                <div class="meta-item">
                  <span class="meta-label">Scoped CSS:</span>
                  <span class="meta-check">✓ Isolated</span>
                </div>
              </div>
            </div>

            <!-- Card Action Footer -->
            <div class="card-footer">
              <button
                type="button"
                class="btn btn-card-preview"
                (click)="openSinglePreviewModal(item)"
                title="Preview section component"
              >
                <span class="material-symbols-outlined btn-icon">visibility</span>
                <span>Preview</span>
              </button>

              <button
                *ngIf="isSingletonCategory(item.category) && !isActiveSingleton(item)"
                type="button"
                class="btn btn-card-activate"
                (click)="activateTemplate(item)"
                [title]="'Set as active ' + getSingletonLabel(item.category)"
              >
                <span class="material-symbols-outlined btn-icon">check_circle</span>
                <span>Set Active</span>
              </button>

              <button
                *ngIf="!isSingletonCategory(item.category)"
                type="button"
                class="btn btn-card-assign"
                (click)="openAssignModal(item)"
                title="Insert this block into a page in CMS Studio"
              >
                <span class="material-symbols-outlined btn-icon">post_add</span>
                <span>Use in Page</span>
              </button>

              <button
                type="button"
                class="btn btn-card-uninstall"
                (click)="uninstallTemplate(item)"
                title="Uninstall from library"
              >
                <span class="material-symbols-outlined">delete_outline</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Content: Compact Table View Mode -->
      <div class="templates-content" *ngIf="viewMode === 'table' && filteredTemplates.length > 0">
        <div class="installed-table-card">
          <div class="table-responsive">
            <table class="table-modern">
              <thead>
                <tr>
                  <th style="width: 320px;">Template Block</th>
                  <th>Category</th>
                  <th>Variant Code</th>
                  <th>Role / Status</th>
                  <th>Version</th>
                  <th style="text-align: right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of filteredTemplates">
                  <td>
                    <div class="block-info-cell">
                      <div class="block-icon-thumb" [style.background]="item.thumbnailGradient">
                        <span class="material-symbols-outlined">{{ item.previewIcon }}</span>
                      </div>
                      <div class="block-details">
                        <div class="block-name-row">
                          <strong class="block-name">{{ item.name }}</strong>
                          <span class="badge-tag" *ngIf="item.badge">{{ item.badge }}</span>
                        </div>
                        <span class="block-desc">{{ item.description }}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div class="category-cell-wrap">
                      <span class="category-pill">
                        <span class="material-symbols-outlined cat-pill-icon">{{ getCategoryIcon(item.category) }}</span>
                        {{ getCategoryName(item.category) }}
                      </span>
                    </div>
                  </td>
                  <td>
                    <code class="variant-code-badge">{{ item.variantCode }}</code>
                  </td>
                  <td>
                    <span class="status-pill active" *ngIf="isActiveSingleton(item)">
                      ✓ Active {{ getSingletonLabel(item.category) }}
                    </span>
                    <span class="status-pill ready" *ngIf="!isActiveSingleton(item)">
                      {{ isSingletonCategory(item.category) ? 'Inactive' : 'Ready to Use' }}
                    </span>
                  </td>
                  <td>
                    <span class="version-tag">v{{ item.version }}</span>
                  </td>
                  <td style="text-align: right;">
                    <div class="table-actions">
                      <button
                        type="button"
                        class="btn-tbl-action preview"
                        (click)="openSinglePreviewModal(item)"
                        title="Preview"
                      >
                        <span class="material-symbols-outlined">visibility</span>
                        Preview
                      </button>
                      <button
                        *ngIf="isSingletonCategory(item.category) && !isActiveSingleton(item)"
                        type="button"
                        class="btn-tbl-action activate"
                        (click)="activateTemplate(item)"
                        title="Set Active"
                      >
                        Set Active
                      </button>
                      <button
                        *ngIf="!isSingletonCategory(item.category)"
                        type="button"
                        class="btn-tbl-action assign"
                        (click)="openAssignModal(item)"
                        title="Use in Page"
                      >
                        Use in Page
                      </button>
                      <button
                        type="button"
                        class="btn-tbl-action delete"
                        (click)="uninstallTemplate(item)"
                        title="Uninstall"
                      >
                        <span class="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div class="empty-installed-state" *ngIf="filteredTemplates.length === 0">
        <div class="empty-icon-circle">
          <span class="material-symbols-outlined">layers_clear</span>
        </div>
        <h3 class="empty-title">
          {{ searchQuery ? 'No matching templates found' : 'No templates installed in this category' }}
        </h3>
        <p class="empty-desc">
          {{ searchQuery ? 'Try adjusting your search query or switching categories.' : 'Browse the UI Marketplace to install high-performance, responsive section blocks.' }}
        </p>
        <div class="empty-actions">
          <button *ngIf="searchQuery" (click)="searchQuery = ''; selectedCategory = 'all'; applyFilters()" class="btn btn-outline">
            Clear Filters
          </button>
          <a routerLink="/content/console/marketplace" class="btn btn-primary">
            <span class="material-symbols-outlined">storefront</span>
            <span>Browse UI Marketplace</span>
          </a>
        </div>
      </div>
      </div> <!-- End Tab 1: vault-tab-pane -->

      <!-- ============================================== -->
      <!-- TAB CONTENT: 3-ZONE CODE INJECTIONS MANAGER    -->
      <!-- ============================================== -->
      <div class="injections-zone-pane" *ngIf="activeMainTab !== 'vault'">
        <div class="zone-banner-card">
          <div class="zone-banner-left">
            <div class="zone-icon-box">
              <span class="material-symbols-outlined">{{ getZoneIcon(activeMainTab) }}</span>
            </div>
            <div>
              <h2 class="zone-title">{{ getZoneTitle(activeMainTab) }}</h2>
              <p class="zone-desc">{{ getZoneDescription(activeMainTab) }}</p>
            </div>
          </div>
          <div class="zone-banner-actions">
            <button type="button" class="btn btn-primary" (click)="openCreateTagModal(activeMainTab)">
              <span class="material-symbols-outlined">add</span>
              <span>Add {{ getZoneShortTitle(activeMainTab) }} Tag</span>
            </button>
          </div>
        </div>

        <!-- Tags List Table -->
        <div class="installed-table-card" *ngIf="getActiveZoneTags().length > 0">
          <div class="table-responsive">
            <table class="table-modern">
              <thead>
                <tr>
                  <th style="width: 80px;">Order</th>
                  <th style="width: 240px;">Name</th>
                  <th style="width: 170px;">Type</th>
                  <th>Code Snippet Preview</th>
                  <th style="width: 110px;">Status</th>
                  <th style="text-align: right; width: 140px;">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let tag of getActiveZoneTags()">
                  <td>
                    <span class="order-pill">#{{ tag.sortOrder }}</span>
                  </td>
                  <td>
                    <strong class="tag-name-cell">{{ tag.name }}</strong>
                  </td>
                  <td>
                    <span class="tag-type-badge">{{ getTagTypeLabel(tag.tagType) }}</span>
                  </td>
                  <td>
                    <code class="code-preview-cell">{{ tag.content | slice:0:110 }}{{ tag.content.length > 110 ? '...' : '' }}</code>
                  </td>
                  <td>
                    <button
                      type="button"
                      class="btn-status-toggle"
                      [class.active]="tag.isActive"
                      (click)="toggleTag(tag)"
                      [title]="tag.isActive ? 'Click to disable tag' : 'Click to enable tag'"
                    >
                      <span class="material-symbols-outlined">{{ tag.isActive ? 'toggle_on' : 'toggle_off' }}</span>
                      <span>{{ tag.isActive ? 'Active' : 'Disabled' }}</span>
                    </button>
                  </td>
                  <td>
                    <div class="table-actions">
                      <button type="button" class="btn-tbl-action preview" (click)="openEditTagModal(tag)" title="Edit Tag">
                        <span class="material-symbols-outlined">edit</span>
                      </button>
                      <button type="button" class="btn-tbl-action delete" (click)="deleteTag(tag)" title="Delete Tag">
                        <span class="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Empty Zone State -->
        <div class="empty-installed-state" *ngIf="getActiveZoneTags().length === 0">
          <div class="empty-icon-circle">
            <span class="material-symbols-outlined">{{ getZoneIcon(activeMainTab) }}</span>
          </div>
          <h3 class="empty-title">No {{ getZoneShortTitle(activeMainTab) }} tags configured yet</h3>
          <p class="empty-desc">Add stylesheets, tracking codes, or custom scripts into this zone. Items will be injected in ascending sort order.</p>
          <div class="empty-actions">
            <button type="button" class="btn btn-primary" (click)="openCreateTagModal(activeMainTab)">
              <span class="material-symbols-outlined">add</span>
              <span>Add First {{ getZoneShortTitle(activeMainTab) }} Tag</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ============================================== -->
    <!-- MODAL 1: SINGLE SECTION RESPONSIVE PREVIEW     -->
    <!-- ============================================== -->
    <div class="modal-backdrop" *ngIf="showSinglePreviewModal && activePreviewItem" (click)="closeSinglePreviewModal()">
      <div class="modal-card preview-modal-card" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="preview-modal-header">
          <div class="preview-title-info">
            <span class="material-symbols-outlined preview-modal-badge-icon">{{ activePreviewItem.previewIcon }}</span>
            <div>
              <h3 class="preview-modal-name">{{ activePreviewItem.name }}</h3>
              <span class="preview-modal-sub">
                {{ getCategoryName(activePreviewItem.category) }} • Code: <code>{{ activePreviewItem.variantCode }}</code> • Scoped CSS
              </span>
            </div>
          </div>

          <!-- Mode Tabs: Preview, HTML, CSS, JS -->
          <div class="modal-view-mode-tabs">
            <button
              type="button"
              class="modal-mode-tab-btn"
              [class.active]="previewModalTab === 'preview'"
              (click)="previewModalTab = 'preview'"
            >
              <span class="material-symbols-outlined">visibility</span>
              <span>Preview</span>
            </button>
            <button
              type="button"
              class="modal-mode-tab-btn"
              [class.active]="previewModalTab === 'html'"
              (click)="previewModalTab = 'html'"
            >
              <span class="material-symbols-outlined">html</span>
              <span>HTML</span>
            </button>
            <button
              type="button"
              class="modal-mode-tab-btn"
              [class.active]="previewModalTab === 'css'"
              (click)="previewModalTab = 'css'"
            >
              <span class="material-symbols-outlined">css</span>
              <span>CSS</span>
            </button>
            <button
              type="button"
              class="modal-mode-tab-btn"
              [class.active]="previewModalTab === 'js'"
              (click)="previewModalTab = 'js'"
            >
              <span class="material-symbols-outlined">javascript</span>
              <span>JS</span>
            </button>
          </div>

          <!-- Viewport Toggle (Visible only when in Preview mode) -->
          <div class="viewport-toggle-group" *ngIf="previewModalTab === 'preview'">
            <button
              type="button"
              class="viewport-btn"
              [class.active]="previewViewport === 'desktop'"
              (click)="previewViewport = 'desktop'"
            >
              <span class="material-symbols-outlined">desktop_windows</span>
              <span>Desktop</span>
            </button>
            <button
              type="button"
              class="viewport-btn"
              [class.active]="previewViewport === 'tablet'"
              (click)="previewViewport = 'tablet'"
            >
              <span class="material-symbols-outlined">tablet_mac</span>
              <span>Tablet (768px)</span>
            </button>
            <button
              type="button"
              class="viewport-btn"
              [class.active]="previewViewport === 'mobile'"
              (click)="previewViewport = 'mobile'"
            >
              <span class="material-symbols-outlined">smartphone</span>
              <span>Mobile (375px)</span>
            </button>
          </div>

          <button type="button" class="btn-close-modal" (click)="closeSinglePreviewModal()">✕</button>
        </div>

        <!-- Mode 1: Rendered Visual Canvas -->
        <div *ngIf="previewModalTab === 'preview'" class="preview-modal-body" [class.viewport-mobile]="previewViewport === 'mobile'" [class.viewport-tablet]="previewViewport === 'tablet'">
          <div class="preview-canvas-wrapper" (click)="onPreviewCanvasClick($event)" [innerHTML]="safeSinglePreviewHtml"></div>
        </div>

        <!-- Mode 2: HTML Source Code -->
        <div *ngIf="previewModalTab === 'html'" class="code-view-container">
          <div class="code-view-toolbar">
            <div class="code-badge-title">
              <span class="material-symbols-outlined">code</span>
              <span>HTML Template Markup</span>
            </div>
            <button type="button" class="btn-copy-code" (click)="copyCode(activePreviewItem.htmlTemplate, 'HTML')">
              <span class="material-symbols-outlined">content_copy</span>
              <span>Copy HTML</span>
            </button>
          </div>
          <pre class="code-block-pre"><code class="code-content">{{ activePreviewItem.htmlTemplate }}</code></pre>
        </div>

        <!-- Mode 3: Scoped CSS Stylesheet -->
        <div *ngIf="previewModalTab === 'css'" class="code-view-container">
          <div class="code-view-toolbar">
            <div class="code-badge-title">
              <span class="material-symbols-outlined">style</span>
              <span>Scoped CSS Stylesheet</span>
            </div>
            <button type="button" class="btn-copy-code" (click)="copyCode(activePreviewItem.cssStyles, 'CSS')">
              <span class="material-symbols-outlined">content_copy</span>
              <span>Copy CSS</span>
            </button>
          </div>
          <pre class="code-block-pre"><code class="code-content">{{ activePreviewItem.cssStyles }}</code></pre>
        </div>

        <!-- Mode 4: JavaScript Logic -->
        <div *ngIf="previewModalTab === 'js'" class="code-view-container">
          <div class="code-view-toolbar">
            <div class="code-badge-title">
              <span class="material-symbols-outlined">terminal</span>
              <span>JavaScript Logic Script</span>
            </div>
            <button type="button" class="btn-copy-code" (click)="copyCode(activePreviewItem.jsScript || '', 'JavaScript')" [disabled]="!activePreviewItem.jsScript">
              <span class="material-symbols-outlined">content_copy</span>
              <span>Copy JS</span>
            </button>
          </div>
          <pre class="code-block-pre" *ngIf="activePreviewItem.jsScript"><code class="code-content">{{ activePreviewItem.jsScript }}</code></pre>
          <div class="code-empty-state" *ngIf="!activePreviewItem.jsScript">
            <span class="material-symbols-outlined empty-code-icon">data_object</span>
            <p>This template is pure HTML/CSS and does not require an external JavaScript bundle.</p>
          </div>
        </div>

        <!-- Footer -->
        <!-- Footer -->
        <div class="preview-modal-footer">
          <span class="footer-hint">
            💡 This is a live preview rendering the exact scoped HTML and CSS bundle.
          </span>
          <div class="preview-footer-btns">
            <!-- Active Singleton Badge -->
            <span *ngIf="isSingletonCategory(activePreviewItem.category) && isActiveSingleton(activePreviewItem)" class="active-badge-preview">
              <span class="material-symbols-outlined">check_circle</span>
              <span>Currently Active Website {{ getSingletonLabel(activePreviewItem.category) }}</span>
            </span>

            <!-- Replace / Set Active Singleton Button -->
            <button
              *ngIf="isSingletonCategory(activePreviewItem.category) && !isActiveSingleton(activePreviewItem)"
              type="button"
              class="btn btn-primary"
              (click)="activateTemplate(activePreviewItem); closeSinglePreviewModal();"
            >
              <span class="material-symbols-outlined">published_with_changes</span>
              <span>Replace Active {{ getSingletonLabel(activePreviewItem.category) }}</span>
            </button>

            <!-- Additive Section: Insert into CMS Page -->
            <button
              *ngIf="!isSingletonCategory(activePreviewItem.category)"
              type="button"
              class="btn btn-primary"
              (click)="closeSinglePreviewModal(); openAssignModal(activePreviewItem);"
            >
              <span class="material-symbols-outlined">post_add</span>
              <span>Use in CMS Page</span>
            </button>

            <button type="button" class="btn btn-outline" (click)="closeSinglePreviewModal()">Close</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ============================================== -->
    <!-- MODAL 2: FULL-SITE SIMULATED DEMO PREVIEW      -->
    <!-- ============================================== -->
    <div class="modal-backdrop" *ngIf="showFullSiteDemoModal" (click)="closeFullSiteDemoModal()">
      <div class="modal-card full-demo-modal-card" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="full-demo-header">
          <div class="full-demo-title-wrap">
            <span class="material-symbols-outlined full-demo-icon">public</span>
            <div>
              <h3 class="full-demo-title">Simulated Full-Site Live Theme Demo</h3>
              <span class="full-demo-subtitle">
                All installed template layers assembled into a seamless responsive web experience.
              </span>
            </div>
          </div>

          <div class="viewport-toggle-group">
            <button
              type="button"
              class="viewport-btn"
              [class.active]="fullDemoViewport === 'desktop'"
              (click)="fullDemoViewport = 'desktop'"
            >
              <span class="material-symbols-outlined">desktop_windows</span>
              <span>Desktop</span>
            </button>
            <button
              type="button"
              class="viewport-btn"
              [class.active]="fullDemoViewport === 'tablet'"
              (click)="fullDemoViewport = 'tablet'"
            >
              <span class="material-symbols-outlined">tablet_mac</span>
              <span>Tablet (768px)</span>
            </button>
            <button
              type="button"
              class="viewport-btn"
              [class.active]="fullDemoViewport === 'mobile'"
              (click)="fullDemoViewport = 'mobile'"
            >
              <span class="material-symbols-outlined">smartphone</span>
              <span>Mobile (375px)</span>
            </button>
          </div>

          <button type="button" class="btn-close-modal" (click)="closeFullSiteDemoModal()">✕</button>
        </div>

        <!-- Rendered Full Page Canvas -->
        <div class="full-demo-body" [class.viewport-mobile]="fullDemoViewport === 'mobile'" [class.viewport-tablet]="fullDemoViewport === 'tablet'">
          <div class="full-demo-canvas-wrapper" (click)="onPreviewCanvasClick($event)" [innerHTML]="safeFullDemoHtml"></div>
        </div>

        <!-- Footer -->
        <div class="full-demo-footer">
          <span class="demo-count-info">
            ✨ Simulated website composed of {{ getFullDemoBlockCount() }} modular installed blocks.
          </span>
          <div class="demo-footer-btns">
            <a routerLink="/content/console" (click)="closeFullSiteDemoModal()" class="btn btn-primary">
              <span class="material-symbols-outlined">edit_note</span>
              <span>Open CMS Studio Editor</span>
            </a>
            <button type="button" class="btn btn-outline" (click)="closeFullSiteDemoModal()">Close Preview</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ============================================== -->
    <!-- MODAL 3: ASSIGN TO PAGE MODAL                  -->
    <!-- ============================================== -->
    <div class="modal-backdrop" *ngIf="showAssignModal && selectedAssignItem" (click)="closeAssignModal()">
      <div class="modal-card assign-modal-card" (click)="$event.stopPropagation()">
        <div class="assign-modal-header">
          <div class="assign-title-wrap">
            <span class="material-symbols-outlined assign-icon">post_add</span>
            <div>
              <h3 class="assign-title">Insert Block into CMS Page</h3>
              <span class="assign-sub">{{ selectedAssignItem.name }} ({{ selectedAssignItem.variantCode }})</span>
            </div>
          </div>
          <button type="button" class="btn-close-modal" (click)="closeAssignModal()">✕</button>
        </div>

        <div class="assign-modal-body">
          <div class="form-group mb-3">
            <label class="form-label"><strong>Select Target Page:</strong></label>
            <select class="form-control" [(ngModel)]="targetPageSlug">
              <option value="home">Home Page ( / )</option>
              <option value="about">About Us ( /about )</option>
              <option value="services">Services & Solutions ( /services )</option>
              <option value="contact">Contact Us ( /contact )</option>
              <option value="custom">Create New Page...</option>
            </select>
          </div>

          <div class="form-group mb-3">
            <label class="form-label"><strong>Insertion Position:</strong></label>
            <div class="radio-options-row">
              <label class="radio-card">
                <input type="radio" name="insertPos" value="bottom" [(ngModel)]="insertPosition" />
                <span>Append to Bottom</span>
              </label>
              <label class="radio-card">
                <input type="radio" name="insertPos" value="top" [(ngModel)]="insertPosition" />
                <span>Insert at Top (under Navbar)</span>
              </label>
            </div>
          </div>

          <div class="assign-info-box">
            <span class="material-symbols-outlined info-icon">info</span>
            <span>
              This will create a new dynamic section on <strong>{{ targetPageSlug }}</strong> populated with this template's scoped HTML, CSS, and starter content.
            </span>
          </div>
        </div>

        <div class="assign-modal-footer">
          <button type="button" class="btn btn-outline" (click)="closeAssignModal()">Cancel</button>
          <button type="button" class="btn btn-primary" (click)="confirmAssignToPage()">
            <span class="material-symbols-outlined">check</span>
            <span>Insert Section into Page</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ============================================== -->
    <!-- MODAL 4: CREATE CUSTOM SECTION TEMPLATE        -->
    <!-- ============================================== -->
    <div class="modal-backdrop" *ngIf="showCustomTemplateModal" (click)="closeCustomTemplateModal()">
      <div class="modal-card custom-tpl-modal-card" (click)="$event.stopPropagation()">
        <div class="preview-modal-header">
          <div class="preview-title-info">
            <span class="material-symbols-outlined preview-modal-badge-icon">add_circle</span>
            <div>
              <h3 class="preview-modal-name">Create Custom Section Template</h3>
              <span class="preview-modal-sub">Craft a standalone HTML section with CMS tokens. CSS is optional if using a global theme stylesheet.</span>
            </div>
          </div>
          <button type="button" class="btn-close-modal" (click)="closeCustomTemplateModal()">✕</button>
        </div>

        <div class="custom-tpl-modal-body">
          <div class="custom-tpl-form-grid">
            <div class="form-group">
              <label class="form-lbl">TEMPLATE NAME *</label>
              <input type="text" [(ngModel)]="customTemplateForm.name" class="form-ctrl" placeholder="e.g. 4-Column Service Grid" />
            </div>

            <div class="form-group">
              <label class="form-lbl">SECTION ROLE / CATEGORY *</label>
              <select [(ngModel)]="customTemplateForm.categoryKey" class="form-ctrl" (change)="onCustomCategoryChange()">
                <option value="menu">Navigation Menu (Navbar)</option>
                <option value="hero">Hero / Showcase Banner</option>
                <option value="body">Body Section / Features / About</option>
                <option value="footer">Footer Bar</option>
                <option value="newsletter">Newsletter / Lead Capture</option>
                <option value="contact">Contact Us Block</option>
                <option value="blog">Blog / News Layout</option>
                <option value="ecommerce">E-Commerce Showcase</option>
                <option value="faq">FAQ Section</option>
                <option value="marquee">Marquee / Logo Ribbon</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-lbl">VARIANT CODE / KEY</label>
              <input type="text" [(ngModel)]="customTemplateForm.variantCode" class="form-ctrl" placeholder="e.g. Body_ServiceGrid4 (auto-generated if blank)" />
            </div>

            <div class="form-group">
              <label class="form-lbl">DESCRIPTION</label>
              <input type="text" [(ngModel)]="customTemplateForm.description" class="form-ctrl" placeholder="Brief explanation of this section design..." />
            </div>
          </div>

          <!-- Token Insertion Toolbar -->
          <div class="placeholder-toolbar">
            <span class="toolbar-hint"><span class="material-symbols-outlined icon-mini">toll</span> Click to insert CMS token:</span>
            <div class="token-btn-group">
              <button type="button" class="btn-token" (click)="insertNamedToken('Title')" [innerText]="'+ {{ Title }}'"></button>
              <button type="button" class="btn-token" (click)="insertNamedToken('MiniTitle')" [innerText]="'+ {{ MiniTitle }}'"></button>
              <button type="button" class="btn-token" (click)="insertNamedToken('Description')" [innerText]="'+ {{ Description }}'"></button>
              <button type="button" class="btn-token" (click)="insertNamedToken('ImageUrl')" [innerText]="'+ {{ ImageUrl }}'"></button>
              <button type="button" class="btn-token" (click)="insertNamedToken('ButtonText')" [innerText]="'+ {{ ButtonText }}'"></button>
              <button type="button" class="btn-token" (click)="insertNamedToken('ButtonLink')" [innerText]="'+ {{ ButtonLink }}'"></button>
              <button type="button" class="btn-token token-loop" (click)="insertNamedToken('PageSectionLists')">+ Card Loop (PageSectionLists)</button>
            </div>
          </div>

          <!-- HTML Template Textarea -->
          <div class="form-group" style="margin-top: 14px;">
            <label class="form-lbl">SEMANTIC HTML MARKUP *</label>
            <textarea [(ngModel)]="customTemplateForm.htmlTemplate" class="form-ctrl code-editor" rows="8" placeholder="<section class=&quot;my-custom-section&quot;>\n  <h2>Heading</h2>\n  <p>Description text</p>\n</section>"></textarea>
          </div>

          <!-- Scoped CSS Styles Textarea -->
          <div class="form-group" style="margin-top: 14px;">
            <div class="lbl-with-note">
              <label class="form-lbl">SCOPED CSS STYLES (OPTIONAL)</label>
              <span class="note-pill">💡 Leave empty if you loaded your CSS via Header Tags!</span>
            </div>
            <textarea [(ngModel)]="customTemplateForm.cssStyles" class="form-ctrl code-editor" rows="5" placeholder="/* Optional section-scoped CSS */\n.my-custom-section {\n  padding: 60px 20px;\n}"></textarea>
          </div>
        </div>

        <div class="preview-modal-footer">
          <button type="button" class="btn btn-outline" (click)="closeCustomTemplateModal()">Cancel</button>
          <button type="button" class="btn btn-primary" (click)="saveCustomTemplate()" [disabled]="savingCustomTemplate">
            <span class="material-symbols-outlined">save</span>
            <span>{{ savingCustomTemplate ? 'Saving...' : 'Save to Template Vault' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ============================================== -->
    <!-- MODAL 5: CODE INJECTION TAG (ADD / EDIT)       -->
    <!-- ============================================== -->
    <div class="modal-backdrop" *ngIf="showTagModal" (click)="closeTagModal()">
      <div class="modal-card tag-modal-card" (click)="$event.stopPropagation()">
        <div class="preview-modal-header">
          <div class="preview-title-info">
            <span class="material-symbols-outlined preview-modal-badge-icon">{{ getZoneIcon(tagFormZone) }}</span>
            <div>
              <h3 class="preview-modal-name">{{ isEditingTag ? 'Edit' : 'Add' }} {{ getZoneTitle(tagFormZone) }} Tag</h3>
              <span class="preview-modal-sub">Target browser zone: <code>&lt;{{ getZoneHtmlTag(tagFormZone) }}&gt;</code> • Execution priority by Sort Order</span>
            </div>
          </div>
          <button type="button" class="btn-close-modal" (click)="closeTagModal()">✕</button>
        </div>

        <div class="custom-tpl-modal-body">
          <div class="custom-tpl-form-grid">
            <div class="form-group full-width">
              <label class="form-lbl">TAG / SCRIPT NAME *</label>
              <input type="text" [(ngModel)]="tagForm.name" class="form-ctrl" placeholder="e.g. Google Tag Manager Head, Bootstrap 5.3 CDN, Theme Init" />
            </div>

            <div class="form-group">
              <label class="form-lbl">TAG CATEGORY / TYPE *</label>
              <select [(ngModel)]="tagForm.tagType" class="form-ctrl" (change)="onTagTypeChanged()">
                <!-- Header Zone Types -->
                <ng-container *ngIf="tagFormZone === 'head'">
                  <option value="link_stylesheet">External Stylesheet (&lt;link rel="stylesheet"&gt;)</option>
                  <option value="inline_css">Inline Custom CSS (&lt;style&gt;)</option>
                  <option value="google_fonts">Google Fonts Link &amp; Preconnect</option>
                  <option value="meta_tag">SEO / Social Meta Tag (&lt;meta&gt;)</option>
                  <option value="script_url">External Head Script (&lt;script src="" async&gt;)</option>
                  <option value="inline_script">Inline Head Script (&lt;script&gt;)</option>
                  <option value="raw_html">Raw Custom HTML Snippet</option>
                </ng-container>

                <!-- Body Open Zone Types -->
                <ng-container *ngIf="tagFormZone === 'body_open'">
                  <option value="gtm_noscript">Google Tag Manager (&lt;noscript&gt; iframe)</option>
                  <option value="pixel_noscript">Meta / Facebook Pixel (&lt;noscript&gt; img)</option>
                  <option value="page_loader">Page Splash / Preloader Screen</option>
                  <option value="svg_sprites">SVG Icon Sprite Sheet (&lt;symbol&gt;)</option>
                  <option value="raw_html">Raw HTML / Code Snippet</option>
                </ng-container>

                <!-- Footer Zone Types -->
                <ng-container *ngIf="tagFormZone === 'footer'">
                  <option value="script_url">External Vendor JS (&lt;script src="" defer&gt;)</option>
                  <option value="inline_script">Inline JavaScript (&lt;script&gt; DOMContentLoaded)</option>
                  <option value="live_chat">Live Chat / Helpdesk Widget</option>
                  <option value="raw_html">Raw HTML / Footer Snippet</option>
                </ng-container>
              </select>
            </div>

            <div class="form-group">
              <label class="form-lbl">SORT ORDER (EXECUTION PRIORITY)</label>
              <input type="number" [(ngModel)]="tagForm.sortOrder" class="form-ctrl" placeholder="10" />
              <small class="form-hint">Lower numbers execute first (e.g. 1 before 10).</small>
            </div>

            <div class="form-group full-width">
              <label class="toggle-card">
                <input type="checkbox" [(ngModel)]="tagForm.isActive" />
                <span class="toggle-card-txt">
                  <strong>Active / Enabled</strong>
                  <small>Inject this snippet live into the document</small>
                </span>
              </label>
            </div>
          </div>

          <div class="form-group" style="margin-top: 14px;">
            <div class="lbl-with-note">
              <label class="form-lbl">TAG / SCRIPT CODE CONTENT *</label>
              <span class="note-pill">⚡ Auto-generated sample boilerplate. Customize as needed!</span>
            </div>
            <textarea [(ngModel)]="tagForm.content" class="form-ctrl code-editor" rows="8" placeholder="Paste your HTML, script, or link snippet here..."></textarea>
          </div>
        </div>

        <div class="preview-modal-footer">
          <button type="button" class="btn btn-outline" (click)="closeTagModal()">Cancel</button>
          <button type="button" class="btn btn-primary" (click)="saveTag()" [disabled]="savingTag">
            <span class="material-symbols-outlined">save</span>
            <span>{{ savingTag ? 'Saving...' : (isEditingTag ? 'Update Tag' : 'Save & Inject Tag') }}</span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .my-templates-container {
      padding: 24px;
      background: #f8fafc;
      min-height: calc(100vh - 70px);
      font-family: Inter, system-ui, sans-serif;
    }

    /* Top Page Header */
    .page-header-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 20px 24px;
      margin-bottom: 20px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }
    .header-main-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 20px;
    }
    .breadcrumb-trail {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11.5px;
      font-weight: 600;
      color: #64748b;
      margin-bottom: 8px;
    }
    .breadcrumb-trail a { color: #64748b; text-decoration: none; }
    .breadcrumb-trail a:hover { color: #0050e5; }
    .breadcrumb-trail .sep { color: #cbd5e1; }
    .breadcrumb-trail .current { color: #0f172a; font-weight: 700; }

    .title-with-icon {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .header-icon-box {
      width: 44px;
      height: 44px;
      background: #eef2ff;
      color: #4f46e5;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .header-icon-box .material-symbols-outlined { font-size: 26px; }

    .title-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .page-title {
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
      letter-spacing: -0.02em;
    }
    .badge-total-count {
      background: #eef2ff;
      color: #4f46e5;
      font-size: 11.5px;
      font-weight: 800;
      padding: 3px 10px;
      border-radius: 20px;
      border: 1px solid #c7d2fe;
    }
    .page-subtitle {
      font-size: 12.5px;
      color: #64748b;
      margin: 4px 0 0 0;
      max-width: 680px;
      line-height: 1.4;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .btn-full-demo-hero {
      height: 42px;
      padding: 0 18px;
      border-radius: 10px;
      background: #4f46e5;
      color: #ffffff;
      font-size: 13px;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);
      transition: all 0.2s ease;
    }
    .btn-full-demo-hero:hover:not(:disabled) {
      background: #4338ca;
      box-shadow: 0 6px 18px rgba(79, 70, 229, 0.35);
      transform: translateY(-1px);
    }
    .btn-full-demo-hero:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .btn-primary-market {
      height: 42px;
      padding: 0 18px;
      border-radius: 10px;
      background: #0050e5;
      color: #ffffff;
      font-size: 13px;
      font-weight: 700;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 4px 12px rgba(0, 80, 229, 0.25);
      transition: all 0.2s ease;
    }
    .btn-primary-market:hover {
      background: #0041ba;
      box-shadow: 0 6px 18px rgba(0, 80, 229, 0.35);
      transform: translateY(-1px);
    }

    /* Active Theme Blueprint Banner */
    .theme-blueprint-card {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      border-radius: 14px;
      padding: 20px 24px;
      margin-bottom: 20px;
      color: #ffffff;
      box-shadow: 0 10px 25px rgba(15, 23, 42, 0.15);
      border: 1px solid #334155;
    }
    .blueprint-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      flex-wrap: wrap;
      gap: 12px;
    }
    .blueprint-title-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .blueprint-icon {
      font-size: 22px;
      color: #38bdf8;
    }
    .blueprint-title {
      font-size: 15px;
      font-weight: 800;
      margin: 0;
      color: #f8fafc;
      letter-spacing: -0.01em;
    }
    .blueprint-sub {
      font-size: 11.5px;
      color: #94a3b8;
    }
    .blueprint-stats {
      display: flex;
      align-items: center;
    }
    .blueprint-stat-pill {
      background: rgba(56, 189, 248, 0.15);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.3);
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 11.5px;
      font-weight: 700;
    }

    .blueprint-pipeline {
      display: grid;
      grid-template-columns: repeat(6, minmax(0, 1fr));
      gap: 8px;
      align-items: stretch;
    }
    @media (max-width: 1100px) {
      .blueprint-pipeline { grid-template-columns: repeat(3, 1fr); }
    }
    @media (max-width: 700px) {
      .blueprint-pipeline { grid-template-columns: 1fr; }
    }
    .pipeline-slot {
      background: rgba(30, 41, 59, 0.6);
      border: 1.5px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      padding: 8px 10px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      position: relative;
      transition: all 0.2s ease;
      min-width: 0;
    }
    .pipeline-slot.slot-active {
      border-color: #38bdf8;
      background: rgba(56, 189, 248, 0.08);
    }
    .pipeline-slot.slot-empty {
      border-style: dashed;
      border-color: rgba(255, 255, 255, 0.2);
    }
    .slot-badge {
      font-size: 8.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #94a3b8;
    }
    .slot-icon-wrap {
      width: 24px;
      height: 24px;
      border-radius: 5px;
      background: rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #38bdf8;
    }
    .slot-icon-wrap .material-symbols-outlined { font-size: 14px; }
    .slot-info { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
    .slot-role { font-size: 9.5px; color: #94a3b8; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .slot-name {
      font-size: 11px;
      font-weight: 700;
      color: #f8fafc;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      display: block;
    }
    .slot-action {
      margin-top: 2px;
      display: flex;
      justify-content: flex-end;
    }
    .btn-slot-preview {
      background: rgba(255, 255, 255, 0.1);
      border: none;
      color: #38bdf8;
      border-radius: 4px;
      padding: 2px 6px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
    }
    .btn-slot-preview:hover { background: #38bdf8; color: #0f172a; }
    .btn-slot-preview .material-symbols-outlined { font-size: 13px; }
    .btn-slot-add {
      color: #94a3b8;
      font-size: 10px;
      font-weight: 700;
      text-decoration: none;
      padding: 2px 5px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.05);
    }
    .btn-slot-add:hover { color: #ffffff; background: rgba(255, 255, 255, 0.15); }

    /* Toolbar */
    .templates-toolbar {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 16px 20px;
      margin-bottom: 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .toolbar-top-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }
    .search-input-wrap {
      position: relative;
      flex: 1;
      min-width: 260px;
    }
    .search-icon {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      color: #94a3b8;
      font-size: 18px;
      pointer-events: none;
    }
    .templates-search {
      width: 100%;
      height: 40px;
      padding-left: 40px;
      padding-right: 36px;
      border: 1.5px solid #cbd5e1;
      border-radius: 8px;
      font-size: 13px;
      background: #f8fafc;
      color: #0f172a;
      box-sizing: border-box;
    }
    .templates-search:focus {
      outline: none;
      border-color: #0050e5;
      background: #ffffff;
      box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.12);
    }
    .btn-clear-search {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: #94a3b8;
      cursor: pointer;
    }

    .view-mode-toggle {
      display: flex;
      background: #f1f5f9;
      padding: 3px;
      border-radius: 8px;
      gap: 2px;
    }
    .toggle-btn {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 6px 12px;
      border: none;
      background: none;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      color: #64748b;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .toggle-btn.active {
      background: #ffffff;
      color: #0f172a;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    }
    .toggle-btn .material-symbols-outlined { font-size: 16px; }

    .category-filter-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .filter-chip {
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 7px;
      padding: 5px 12px;
      font-size: 12px;
      font-weight: 600;
      color: #475569;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: 0.15s ease;
    }
    .filter-chip:hover {
      background: #e2e8f0;
      color: #0f172a;
    }
    .filter-chip.active {
      background: #0050e5;
      color: #ffffff;
      border-color: #0050e5;
    }
    .chip-icon { font-size: 15px; }
    .chip-count {
      background: rgba(0,0,0,0.08);
      padding: 1px 5px;
      border-radius: 10px;
      font-size: 10px;
    }
    .filter-chip.active .chip-count {
      background: rgba(255,255,255,0.25);
    }

    /* Cards Grid View */
    .templates-cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 20px;
    }
    .template-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
      display: flex;
      flex-direction: column;
      transition: all 0.2s ease;
    }
    .template-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 10px 24px rgba(0, 0, 0, 0.08);
      border-color: #cbd5e1;
    }

    .card-visual-banner {
      padding: 16px 18px;
      color: #ffffff;
      position: relative;
    }
    .banner-top-tags {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .category-tag {
      background: rgba(0, 0, 0, 0.3);
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      backdrop-filter: blur(4px);
    }
    .tag-cat-icon { font-size: 14px; }
    .active-badge {
      background: #10b981;
      color: #ffffff;
      padding: 3px 9px;
      border-radius: 20px;
      font-size: 10.5px;
      font-weight: 800;
    }
    .version-tag {
      background: rgba(255, 255, 255, 0.2);
      padding: 2px 7px;
      border-radius: 12px;
      font-size: 10.5px;
      font-weight: 700;
    }

    /* Stylized Wireframe Mock */
    .wireframe-mock-box {
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      padding: 10px 12px;
      backdrop-filter: blur(6px);
    }
    .wireframe-header-line {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-bottom: 8px;
      padding-bottom: 6px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    .wire-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.3);
    }
    .wire-title-pill {
      font-family: monospace;
      font-size: 10px;
      color: #93c5fd;
      margin-left: auto;
    }
    .wireframe-body {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .wire-icon-wrap {
      width: 32px;
      height: 32px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #38bdf8;
    }
    .wire-icon-wrap .material-symbols-outlined { font-size: 18px; }
    .wire-text-col { display: flex; flex-direction: column; }
    .wire-sub { font-size: 10px; color: #94a3b8; text-transform: uppercase; }
    .wire-h { font-size: 12px; color: #ffffff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 220px; }

    /* Card Content */
    .card-body {
      padding: 16px 18px;
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .card-title-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 6px;
    }
    .card-title {
      font-size: 14px;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
      line-height: 1.3;
    }
    .badge-tag {
      background: #fef3c7;
      color: #d97706;
      font-size: 10px;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .card-desc {
      font-size: 12px;
      color: #64748b;
      line-height: 1.5;
      margin: 0 0 14px 0;
      flex: 1;
    }
    .card-meta-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 10px;
      border-top: 1px solid #f1f5f9;
      font-size: 11px;
    }
    .meta-item { display: flex; align-items: center; gap: 4px; }
    .meta-label { color: #94a3b8; }
    .meta-code {
      background: #f1f5f9;
      padding: 2px 5px;
      border-radius: 4px;
      font-size: 10.5px;
      color: #334155;
    }
    .meta-check { color: #10b981; font-weight: 700; }

    /* Card Footer */
    .card-footer {
      padding: 12px 18px;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .btn-card-preview {
      flex: 1;
      height: 34px;
      background: #ffffff;
      border: 1.5px solid #cbd5e1;
      border-radius: 7px;
      color: #0f172a;
      font-size: 12px;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-card-preview:hover {
      background: #f1f5f9;
      border-color: #94a3b8;
    }
    .btn-card-activate {
      flex: 1;
      height: 34px;
      background: #10b981;
      border: none;
      border-radius: 7px;
      color: #ffffff;
      font-size: 12px;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-card-activate:hover { background: #059669; }
    .btn-card-assign {
      flex: 1;
      height: 34px;
      background: #0050e5;
      border: none;
      border-radius: 7px;
      color: #ffffff;
      font-size: 12px;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-card-assign:hover { background: #0041ba; }
    .btn-card-uninstall {
      width: 34px;
      height: 34px;
      background: #ffffff;
      border: 1.5px solid #cbd5e1;
      border-radius: 7px;
      color: #ef4444;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-card-uninstall:hover {
      background: #fef2f2;
      border-color: #fca5a5;
    }
    .btn-card-uninstall .material-symbols-outlined { font-size: 17px; }

    /* Table View */
    .installed-table-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }
    .table-responsive { width: 100%; overflow-x: auto; }
    .table-modern {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 12.5px;
    }
    .table-modern th {
      background: #f8fafc;
      padding: 12px 18px;
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      border-bottom: 1.5px solid #e2e8f0;
    }
    .table-modern td {
      padding: 14px 18px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
      color: #334155;
    }
    .table-modern tr:hover td { background: #f8fafc; }

    .block-info-cell {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .block-icon-thumb {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      flex-shrink: 0;
    }
    .block-icon-thumb .material-symbols-outlined { font-size: 20px; }
    .block-details { display: flex; flex-direction: column; gap: 2px; }
    .block-name-row { display: flex; align-items: center; gap: 6px; }
    .block-name { font-size: 13px; font-weight: 700; color: #0f172a; }
    .block-desc { font-size: 11.5px; color: #64748b; line-height: 1.3; max-width: 240px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .category-pill {
      background: #f1f5f9;
      color: #334155;
      padding: 4px 9px;
      border-radius: 6px;
      font-size: 11.5px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }
    .cat-pill-icon { font-size: 14px; color: #0050e5; }
    .variant-code-badge {
      background: #0f172a;
      color: #38bdf8;
      padding: 3px 7px;
      border-radius: 5px;
      font-size: 11px;
      font-family: monospace;
    }

    .status-pill {
      display: inline-flex;
      align-items: center;
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 700;
    }
    .status-pill.active {
      background: #ecfdf5;
      color: #059669;
      border: 1px solid #a7f3d0;
    }
    .status-pill.ready {
      background: #f8fafc;
      color: #64748b;
      border: 1px solid #e2e8f0;
    }

    .table-actions {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 6px;
    }
    .btn-tbl-action {
      padding: 5px 10px;
      border-radius: 6px;
      font-size: 11.5px;
      font-weight: 700;
      border: none;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      transition: 0.15s ease;
    }
    .btn-tbl-action.preview {
      background: #f1f5f9;
      color: #0f172a;
      border: 1px solid #cbd5e1;
    }
    .btn-tbl-action.preview:hover { background: #e2e8f0; }
    .btn-tbl-action.preview .material-symbols-outlined { font-size: 14px; }
    .btn-tbl-action.activate {
      background: #10b981;
      color: #ffffff;
    }
    .btn-tbl-action.activate:hover { background: #059669; }
    .btn-tbl-action.assign {
      background: #0050e5;
      color: #ffffff;
    }
    .btn-tbl-action.assign:hover { background: #0041ba; }
    .btn-tbl-action.delete {
      background: none;
      color: #ef4444;
      padding: 5px 6px;
    }
    .btn-tbl-action.delete:hover { background: #fef2f2; }
    .btn-tbl-action.delete .material-symbols-outlined { font-size: 16px; }

    /* Empty State */
    .empty-installed-state {
      background: #ffffff;
      border: 2px dashed #cbd5e1;
      border-radius: 14px;
      padding: 60px 20px;
      text-align: center;
      margin-top: 10px;
    }
    .empty-icon-circle {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: #f1f5f9;
      color: #94a3b8;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 14px;
    }
    .empty-icon-circle .material-symbols-outlined { font-size: 30px; }
    .empty-title { font-size: 16px; font-weight: 800; color: #0f172a; margin: 0 0 6px 0; }
    .empty-desc { font-size: 13px; color: #64748b; margin: 0 0 20px 0; }
    .empty-actions { display: flex; justify-content: center; gap: 10px; }

    /* Modals */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(8px);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .modal-card {
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 25px 60px rgba(0,0,0,0.4);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: modalSlideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes modalSlideUp {
      from { transform: translateY(20px) scale(0.98); opacity: 0; }
      to { transform: translateY(0) scale(1); opacity: 1; }
    }
    .preview-modal-card { width: 95%; max-width: 1280px; height: 90vh; }
    .full-demo-modal-card { width: 98%; max-width: 1400px; height: 94vh; }
    .assign-modal-card { width: 100%; max-width: 520px; }

    .preview-modal-header, .full-demo-header, .assign-modal-header {
      padding: 16px 24px;
      border-bottom: 1.5px solid #e2e8f0;
      background: #ffffff;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .preview-title-info, .full-demo-title-wrap, .assign-title-wrap {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .preview-modal-badge-icon, .full-demo-icon, .assign-icon {
      font-size: 24px;
      color: #0050e5;
      background: #eff6ff;
      padding: 6px;
      border-radius: 8px;
    }
    .preview-modal-name, .full-demo-title, .assign-title { font-size: 15px; font-weight: 800; color: #0f172a; margin: 0; }
    .preview-modal-sub, .full-demo-subtitle, .assign-sub { font-size: 11.5px; color: #64748b; font-weight: 600; }

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
      gap: 5px;
      padding: 5px 12px;
      border-radius: 6px;
      border: none;
      background: none;
      font-size: 11.5px;
      font-weight: 700;
      color: #475569;
      cursor: pointer;
      transition: 0.15s ease;
    }
    .viewport-btn.active {
      background: #ffffff;
      color: #0f172a;
      box-shadow: 0 1px 4px rgba(0,0,0,0.1);
    }
    .btn-close-modal {
      background: none;
      border: none;
      font-size: 18px;
      font-weight: 700;
      color: #64748b;
      cursor: pointer;
    }
    .btn-close-modal:hover { color: #0f172a; }

    .preview-modal-body, .full-demo-body {
      flex: 1;
      overflow-y: auto;
      background: #0f172a;
      padding: 24px;
      display: flex;
      align-items: flex-start;
      justify-content: center;
    }
    .preview-canvas-wrapper, .full-demo-canvas-wrapper {
      width: 100%;
      max-width: 1200px;
      background: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 20px 40px rgba(0,0,0,0.4);
      transition: max-width 0.3s ease;
    }
    .preview-canvas-wrapper nav a,
    .full-demo-canvas-wrapper nav a,
    .preview-canvas-wrapper .oz-nav-links a,
    .full-demo-canvas-wrapper .oz-nav-links a,
    .preview-canvas-wrapper .oz-btn-nav,
    .full-demo-canvas-wrapper .oz-btn-nav,
    .preview-canvas-wrapper nav button,
    .full-demo-canvas-wrapper nav button,
    .preview-canvas-wrapper .oz-brand-link,
    .full-demo-canvas-wrapper .oz-brand-link {
      pointer-events: none !important;
      cursor: default !important;
      user-select: none !important;
    }
    .preview-modal-body.viewport-mobile .preview-canvas-wrapper,
    .full-demo-body.viewport-mobile .full-demo-canvas-wrapper {
      max-width: 375px;
      border-radius: 32px;
      border: 8px solid #334155;
    }
    .preview-modal-body.viewport-tablet .preview-canvas-wrapper,
    .full-demo-body.viewport-tablet .full-demo-canvas-wrapper {
      max-width: 768px;
      border-radius: 20px;
      border: 6px solid #334155;
    }

    /* Modal Code Inspection Tabs & Panes */
    .modal-view-mode-tabs {
      display: flex;
      background: #0f172a;
      padding: 3px;
      border-radius: 8px;
      border: 1px solid #334155;
      gap: 2px;
    }
    .modal-mode-tab-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 5px 12px;
      border-radius: 6px;
      border: none;
      background: none;
      color: #94a3b8;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .modal-mode-tab-btn:hover {
      color: #f8fafc;
      background: rgba(255, 255, 255, 0.05);
    }
    .modal-mode-tab-btn.active {
      background: #0050e5;
      color: #ffffff;
      box-shadow: 0 2px 6px rgba(0, 80, 229, 0.3);
    }
    .modal-mode-tab-btn span { font-size: 15px; }

    .code-view-container {
      background: #090d16;
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 480px;
      max-height: 68vh;
      overflow: hidden;
    }
    .code-view-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 18px;
      background: #0f172a;
      border-bottom: 1px solid #1e293b;
    }
    .code-badge-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12.5px;
      font-weight: 700;
      color: #38bdf8;
    }
    .code-badge-title span { font-size: 16px; }
    .btn-copy-code {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 12px;
      border-radius: 6px;
      background: rgba(56, 189, 248, 0.1);
      border: 1px solid rgba(56, 189, 248, 0.3);
      color: #38bdf8;
      font-size: 11.5px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-copy-code:hover:not(:disabled) {
      background: #38bdf8;
      color: #090d16;
    }
    .btn-copy-code:disabled { opacity: 0.4; cursor: not-allowed; }
    .btn-copy-code span { font-size: 14px; }
    .code-block-pre {
      margin: 0;
      padding: 20px;
      background: #090d16;
      color: #e2e8f0;
      font-family: 'Fira Code', 'Consolas', 'Courier New', monospace;
      font-size: 13px;
      line-height: 1.6;
      overflow: auto;
      flex: 1;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .code-empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      color: #64748b;
      text-align: center;
      flex: 1;
    }
    .empty-code-icon { font-size: 44px; margin-bottom: 12px; color: #475569; }

    .preview-modal-footer, .full-demo-footer, .assign-modal-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 24px;
      background: #ffffff;
      border-top: 1.5px solid #e2e8f0;
    }
    .footer-hint, .demo-count-info { font-size: 11.5px; color: #64748b; font-weight: 600; }
    .preview-footer-btns, .demo-footer-btns { display: flex; gap: 8px; }

    /* Assign Modal Body */
    .assign-modal-body {
      padding: 20px 24px;
    }
    .form-group { margin-bottom: 16px; }
    .form-label { display: block; font-size: 12.5px; color: #334155; margin-bottom: 6px; }
    .form-control {
      width: 100%;
      height: 38px;
      border: 1.5px solid #cbd5e1;
      border-radius: 7px;
      padding: 0 12px;
      font-size: 13px;
      box-sizing: border-box;
    }
    .radio-options-row { display: flex; gap: 12px; }
    .radio-card {
      flex: 1;
      border: 1.5px solid #cbd5e1;
      border-radius: 8px;
      padding: 10px 12px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      background: #f8fafc;
    }
    .radio-card input { cursor: pointer; }
    .assign-info-box {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      padding: 10px 14px;
      display: flex;
      gap: 10px;
      font-size: 11.5px;
      color: #1e40af;
      line-height: 1.4;
    }
    .assign-info-box .info-icon { font-size: 18px; color: #0050e5; flex-shrink: 0; }

    .btn {
      padding: 8px 16px;
      border-radius: 7px;
      font-size: 12.5px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border: none;
      text-decoration: none;
    }
    .btn-primary { background: #0050e5; color: #ffffff; }
    .btn-primary:hover { background: #0041ba; }
    .btn-outline { background: #ffffff; border: 1.5px solid #cbd5e1; color: #334155; }
    .btn-outline:hover { background: #f8fafc; }

    /* Main Tabs Bar */
    .mytemplates-main-tabs {
      display: flex;
      gap: 10px;
      margin-bottom: 24px;
      background: #ffffff;
      padding: 6px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
      overflow-x: auto;
    }
    .main-tab-item {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      border-radius: 8px;
      border: none;
      background: transparent;
      color: #64748b;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
    }
    .main-tab-item:hover {
      background: #f1f5f9;
      color: #0f172a;
    }
    .main-tab-item.active {
      background: #0f172a;
      color: #38bdf8;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.2);
    }
    .tab-count-pill {
      background: rgba(255, 255, 255, 0.15);
      padding: 2px 7px;
      border-radius: 12px;
      font-size: 11px;
    }
    .main-tab-item:not(.active) .tab-count-pill {
      background: #e2e8f0;
      color: #475569;
    }
    .btn-add-custom-template {
      background: #0f172a;
      color: #38bdf8;
      border: 1.5px solid #38bdf8;
      padding: 9px 18px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 12.5px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-add-custom-template:hover {
      background: #1e293b;
      color: #7dd3fc;
      border-color: #7dd3fc;
      transform: translateY(-1px);
    }

    /* 3-Zone Injections Styles */
    .zone-banner-card {
      background: #0f172a;
      border-radius: 14px;
      padding: 24px 28px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      color: #ffffff;
      box-shadow: 0 4px 20px rgba(15, 23, 42, 0.15);
    }
    .zone-banner-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .zone-icon-box {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: rgba(56, 189, 248, 0.15);
      border: 1px solid rgba(56, 189, 248, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #38bdf8;
    }
    .zone-icon-box .material-symbols-outlined { font-size: 26px; }
    .zone-title { font-size: 18px; font-weight: 800; color: #ffffff; margin: 0 0 4px 0; }
    .zone-desc { font-size: 13px; color: #94a3b8; margin: 0; }

    .order-pill {
      background: #f1f5f9;
      color: #0f172a;
      font-weight: 800;
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 6px;
      font-family: monospace;
    }
    .tag-name-cell { font-size: 13px; color: #0f172a; }
    .tag-type-badge {
      background: rgba(0, 80, 229, 0.08);
      color: #0050e5;
      border: 1px solid rgba(0, 80, 229, 0.2);
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
    }
    .code-preview-cell {
      background: #0f172a;
      color: #38bdf8;
      padding: 4px 8px;
      border-radius: 6px;
      font-family: monospace;
      font-size: 11px;
      display: inline-block;
      max-width: 320px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .btn-status-toggle {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      border-radius: 20px;
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      color: #64748b;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-status-toggle.active {
      background: #ecfdf5;
      color: #059669;
      border-color: #a7f3d0;
    }
    .btn-status-toggle .material-symbols-outlined { font-size: 16px; }

    /* Modals & Forms */
    .custom-tpl-modal-card, .tag-modal-card {
      width: 100%;
      max-width: 820px;
      background: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
    }
    .custom-tpl-modal-body {
      padding: 24px;
      max-height: calc(85vh - 140px);
      overflow-y: auto;
    }
    .custom-tpl-form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }
    .form-group.full-width { grid-column: 1 / -1; }
    .form-lbl {
      display: block;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.05em;
      color: #475569;
      margin-bottom: 6px;
    }
    .form-ctrl {
      width: 100%;
      padding: 9px 12px;
      border: 1.5px solid #cbd5e1;
      border-radius: 8px;
      font-size: 13px;
      color: #0f172a;
      box-sizing: border-box;
      outline: none;
      transition: border-color 0.15s;
    }
    .form-ctrl:focus { border-color: #0050e5; }
    .form-hint { font-size: 11px; color: #94a3b8; margin-top: 3px; display: block; }
    .code-editor {
      font-family: 'Fira Code', monospace;
      font-size: 12.5px;
      line-height: 1.5;
      background: #0f172a;
      color: #38bdf8;
      tab-size: 2;
    }
    .code-editor:focus { border-color: #38bdf8; }

    .placeholder-toolbar {
      margin-top: 14px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 14px;
    }
    .toolbar-hint {
      font-size: 11.5px;
      font-weight: 700;
      color: #475569;
      display: flex;
      align-items: center;
      gap: 4px;
      margin-bottom: 8px;
    }
    .token-btn-group {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .btn-token {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      color: #0050e5;
      font-size: 11px;
      font-weight: 700;
      padding: 4px 9px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-token:hover {
      background: #0050e5;
      color: #ffffff;
      border-color: #0050e5;
    }
    .btn-token.token-loop {
      background: #fdf2f8;
      border-color: #f472b6;
      color: #db2777;
    }
    .btn-token.token-loop:hover {
      background: #db2777;
      color: #ffffff;
    }

    .lbl-with-note {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }
    .note-pill {
      font-size: 11px;
      font-weight: 600;
      color: #0284c7;
      background: #f0f9ff;
      padding: 2px 8px;
      border-radius: 12px;
      border: 1px solid #bae6fd;
    }

    .toggle-card {
      display: flex;
      align-items: center;
      gap: 10px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 14px;
      cursor: pointer;
    }
    .toggle-card input { width: 18px; height: 18px; cursor: pointer; }
    .toggle-card-txt { display: flex; flex-direction: column; }
    .toggle-card-txt strong { font-size: 12.5px; color: #0f172a; }
    .toggle-card-txt small { font-size: 11px; color: #64748b; }
  `]
})
export class MyTemplatesComponent implements OnInit {
  installedTemplates: InstalledTemplateItem[] = [];
  filteredTemplates: InstalledTemplateItem[] = [];
  searchQuery: string = '';
  selectedCategory: string = 'all';
  viewMode: 'grid' | 'table' = 'grid';

  categories = [
    { id: 'menu', name: 'Navigation', icon: 'menu' },
    { id: 'hero', name: 'Hero Sliders', icon: 'view_carousel' },
    { id: 'body', name: 'Body Features', icon: 'view_quilt' },
    { id: 'footer', name: 'Footers', icon: 'dock_to_bottom' },
    { id: 'newsletter', name: 'Newsletter', icon: 'mail' },
    { id: 'contact', name: 'Contact', icon: 'contact_mail' },
    { id: 'blog', name: 'Blogs', icon: 'newspaper' },
    { id: 'ecommerce', name: 'E-Commerce', icon: 'shopping_bag' },
    { id: 'breadcrumb', name: 'Breadcrumbs', icon: 'linear_scale' }
  ];

  // Active Main Tab
  activeMainTab: 'vault' | 'head' | 'body_open' | 'footer' = 'vault';
  headTags: CodeInjectionTag[] = [];
  bodyOpenTags: CodeInjectionTag[] = [];
  footerTags: CodeInjectionTag[] = [];
  loadingTags: boolean = false;

  // Custom Template Modal State
  showCustomTemplateModal: boolean = false;
  savingCustomTemplate: boolean = false;
  customTemplateForm = {
    name: '',
    categoryKey: 'body',
    variantCode: '',
    description: '',
    htmlTemplate: '',
    cssStyles: '',
    jsScript: ''
  };

  // Code Injection Modal State
  showTagModal: boolean = false;
  isEditingTag: boolean = false;
  tagFormZone: 'head' | 'body_open' | 'footer' = 'head';
  tagForm: CodeInjectionTag = {
    id: '',
    name: '',
    zone: 'head',
    tagType: 'link_stylesheet',
    content: '',
    sortOrder: 10,
    isActive: true
  };
  savingTag: boolean = false;

  private readonly tagBoilerplates: Record<string, string> = {
    // Head zone
    link_stylesheet: '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />',
    inline_css: '<style>\n  /* Custom CSS Overrides */\n  :root {\n    --theme-accent: #0050e5;\n  }\n</style>',
    google_fonts: '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">',
    meta_tag: '<meta name="keywords" content="sovereign cloud, enterprise bcc, ozikol" />\n<meta property="og:type" content="website" />',
    script_url: '<script src="https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.21/lodash.min.js" async></script>',
    inline_script: '<script>\n  // Google Tag Manager / Analytics Head Snippet\n  window.dataLayer = window.dataLayer || [];\n  function gtag(){dataLayer.push(arguments);}\n</script>',
    // Body open zone
    gtm_noscript: '<!-- Google Tag Manager (noscript) -->\n<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXXXX"\nheight="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>\n<!-- End Google Tag Manager (noscript) -->',
    pixel_noscript: '<!-- Meta Pixel (noscript) -->\n<noscript><img height="1" width="1" style="display:none"\nsrc="https://www.facebook.com/tr?id=YOUR_PIXEL_ID&ev=PageView&noscript=1"/></noscript>',
    page_loader: '<div id="oz-site-preloader" style="position:fixed;inset:0;background:#0f172a;z-index:99999;display:flex;align-items:center;justify-content:center;transition:opacity 0.5s;">\n  <div style="width:40px;height:40px;border:3px solid rgba(56,189,248,0.2);border-top-color:#38bdf8;border-radius:50%;animation:ozSpin 0.8s linear infinite;"></div>\n</div>\n<script>window.addEventListener(\'load\',function(){var p=document.getElementById(\'oz-site-preloader\');if(p){p.style.opacity=\'0\';setTimeout(function(){p.remove();},500);}});</script>',
    svg_sprites: '<svg xmlns="http://www.w3.org/2000/svg" style="display: none;">\n  <symbol id="icon-check" viewBox="0 0 24 24"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></symbol>\n</svg>',
    // Footer zone
    footer_script_url: '<script src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js" defer></script>',
    footer_inline_script: '<script>\n  document.addEventListener(\'DOMContentLoaded\', function() {\n    // Initialize theme animations & carousels\n    console.log(\'Theme scripts initialized successfully.\');\n  });\n</script>',
    live_chat: '<!-- Live Chat Widget -->\n<script>\n  window.$ozikolChat = { tenantId: \'workspace-default\' };\n</script>',
    raw_html: '<!-- Custom Snippet -->\n'
  };

  // Single Preview Modal
  showSinglePreviewModal: boolean = false;
  activePreviewItem: InstalledTemplateItem | null = null;
  previewViewport: 'desktop' | 'tablet' | 'mobile' = 'desktop';
  previewModalTab: 'preview' | 'html' | 'css' | 'js' = 'preview';
  safeSinglePreviewHtml: SafeHtml = '';

  // Full-Site Demo Modal
  showFullSiteDemoModal: boolean = false;
  fullDemoViewport: 'desktop' | 'tablet' | 'mobile' = 'desktop';
  safeFullDemoHtml: SafeHtml = '';

  // Assign to Page Modal
  showAssignModal: boolean = false;
  selectedAssignItem: InstalledTemplateItem | null = null;
  targetPageSlug: string = 'home';
  insertPosition: 'top' | 'bottom' = 'bottom';

  // Active Singletons state (menu, hero, newsletter, footer, blog, breadcrumb = 1 active each; body, contact = additive)
  activeMenuId: string = 'menu-01';
  activeHeroId: string = 'hero-01';
  activeNewsletterId: string = '';
  activeFooterId: string = 'footer-01';
  activeBlogId: string = '';
  activeBreadcrumbId: string = '';
  activeEcommerceId: string = 'ecom-01';
  singletonCategories: string[] = ['menu', 'hero', 'newsletter', 'footer', 'blog', 'breadcrumb', 'ecommerce'];

  constructor(
    private router: Router,
    private api: ApiService,
    private toast: ToastService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    const savedView = localStorage.getItem('oz_templates_view_mode') as 'grid' | 'table';
    if (savedView) this.viewMode = savedView;
    this.loadInstalledTemplates();
    this.loadAllCodeInjections();
  }

  setViewMode(mode: 'grid' | 'table'): void {
    this.viewMode = mode;
    localStorage.setItem('oz_templates_view_mode', mode);
  }

  // ==========================================
  // CODE INJECTION ZONE HELPERS & CRUD
  // ==========================================
  getZoneIcon(zone: string): string {
    switch (zone) {
      case 'head': return 'code';
      case 'body_open': return 'vertical_align_top';
      case 'footer': return 'dock_to_bottom';
      default: return 'code';
    }
  }

  getZoneTitle(zone: string): string {
    switch (zone) {
      case 'head': return 'Header (<head>)';
      case 'body_open': return 'Body Open (<body>)';
      case 'footer': return 'Footer (</body>)';
      default: return 'Code Injection';
    }
  }

  getZoneShortTitle(zone: string): string {
    switch (zone) {
      case 'head': return 'Header';
      case 'body_open': return 'Body Open';
      case 'footer': return 'Footer';
      default: return 'Tag';
    }
  }

  getZoneHtmlTag(zone: string): string {
    switch (zone) {
      case 'head': return 'head';
      case 'body_open': return 'body - immediately after opening';
      case 'footer': return 'body - before closing';
      default: return 'head';
    }
  }

  getZoneDescription(zone: string): string {
    switch (zone) {
      case 'head': return 'Injected inside document <head>. Ideal for external stylesheets, web fonts, favicon links, and SEO meta tags.';
      case 'body_open': return 'Injected immediately after the opening <body> tag. Essential for GTM noscript fallbacks, Facebook Pixel noscript, and site loaders.';
      case 'footer': return 'Injected just prior to the closing </body> tag. Perfect for vendor JavaScript bundles, analytics trackers, and live chat widgets.';
      default: return '';
    }
  }

  getActiveZoneTags(): CodeInjectionTag[] {
    if (this.activeMainTab === 'head') return this.headTags;
    if (this.activeMainTab === 'body_open') return this.bodyOpenTags;
    if (this.activeMainTab === 'footer') return this.footerTags;
    return [];
  }

  getTagTypeLabel(tagType: string): string {
    const labels: Record<string, string> = {
      link_stylesheet: 'CSS Stylesheet Link',
      inline_css: 'Inline CSS Style',
      google_fonts: 'Google Fonts',
      meta_tag: 'Meta Tag',
      script_url: 'External Script',
      inline_script: 'Inline Script',
      gtm_noscript: 'GTM (noscript)',
      pixel_noscript: 'Pixel (noscript)',
      page_loader: 'Page Preloader',
      svg_sprites: 'SVG Sprite Sheet',
      live_chat: 'Live Chat Widget',
      raw_html: 'Raw Snippet'
    };
    return labels[tagType] || tagType;
  }

  loadAllCodeInjections(): void {
    this.loadingTags = true;
    const cached = localStorage.getItem('oz_code_injections_cache');
    if (cached) {
      try {
        const parsed: CodeInjectionTag[] = JSON.parse(cached);
        this.headTags = parsed.filter(t => t.zone === 'head').sort((a, b) => a.sortOrder - b.sortOrder);
        this.bodyOpenTags = parsed.filter(t => t.zone === 'body_open').sort((a, b) => a.sortOrder - b.sortOrder);
        this.footerTags = parsed.filter(t => t.zone === 'footer').sort((a, b) => a.sortOrder - b.sortOrder);
      } catch (e) {}
    }

    this.api.get<any>('ContentApi/code-injections').subscribe({
      next: (res) => {
        this.loadingTags = false;
        if (res?.data && Array.isArray(res.data)) {
          const tags: CodeInjectionTag[] = res.data;
          this.headTags = tags.filter(t => t.zone === 'head').sort((a, b) => a.sortOrder - b.sortOrder);
          this.bodyOpenTags = tags.filter(t => t.zone === 'body_open').sort((a, b) => a.sortOrder - b.sortOrder);
          this.footerTags = tags.filter(t => t.zone === 'footer').sort((a, b) => a.sortOrder - b.sortOrder);
          localStorage.setItem('oz_code_injections_cache', JSON.stringify(tags));
        }
      },
      error: () => {
        this.loadingTags = false;
      }
    });
  }

  openCreateTagModal(zone?: 'head' | 'body_open' | 'footer' | string): void {
    this.isEditingTag = false;
    const targetZone: 'head' | 'body_open' | 'footer' =
      (zone === 'head' || zone === 'body_open' || zone === 'footer')
        ? zone
        : (this.activeMainTab === 'vault' ? 'head' : this.activeMainTab);

    let defaultType = 'link_stylesheet';
    if (targetZone === 'body_open') defaultType = 'gtm_noscript';
    if (targetZone === 'footer') defaultType = 'script_url';

    const currentCount = (targetZone === 'head' ? this.headTags : targetZone === 'body_open' ? this.bodyOpenTags : this.footerTags).length;

    this.tagFormZone = targetZone;
    this.tagForm = {
      id: '',
      name: '',
      zone: targetZone,
      tagType: defaultType,
      content: this.tagBoilerplates[defaultType] || '',
      sortOrder: (currentCount + 1) * 10,
      isActive: true
    };
    this.showTagModal = true;
  }

  openEditTagModal(tag: CodeInjectionTag): void {
    this.isEditingTag = true;
    this.tagFormZone = tag.zone;
    this.tagForm = { ...tag };
    this.showTagModal = true;
  }

  closeTagModal(): void {
    this.showTagModal = false;
  }

  onTagTypeChanged(): void {
    if (this.tagBoilerplates[this.tagForm.tagType]) {
      this.tagForm.content = this.tagBoilerplates[this.tagForm.tagType];
    }
  }

  saveTag(): void {
    if (!this.tagForm.name?.trim() || !this.tagForm.content?.trim()) {
      this.toast.error('Please enter a tag name and snippet content.');
      return;
    }

    this.savingTag = true;
    this.tagForm.zone = this.tagFormZone;

    if (this.isEditingTag) {
      this.api.put<any>(`ContentApi/code-injections/${this.tagForm.id}`, this.tagForm).subscribe({
        next: () => {
          this.savingTag = false;
          this.toast.success(`Tag '${this.tagForm.name}' updated.`);
          this.closeTagModal();
          this.loadAllCodeInjections();
        },
        error: () => {
          this.savingTag = false;
          this.toast.error('Failed to update tag. Please check your network.');
        }
      });
    } else {
      this.api.post<any>('ContentApi/code-injections', this.tagForm).subscribe({
        next: () => {
          this.savingTag = false;
          this.toast.success(`Tag '${this.tagForm.name}' injected into ${this.getZoneShortTitle(this.tagFormZone)}.`);
          this.closeTagModal();
          this.loadAllCodeInjections();
        },
        error: () => {
          this.savingTag = false;
          this.toast.error('Failed to save tag. Please check your network.');
        }
      });
    }
  }

  toggleTag(tag: CodeInjectionTag): void {
    tag.isActive = !tag.isActive;
    this.api.post<any>(`ContentApi/code-injections/${tag.id}/toggle`, {}).subscribe({
      next: () => {
        this.toast.success(`Tag '${tag.name}' is now ${tag.isActive ? 'Active' : 'Disabled'}.`);
        this.loadAllCodeInjections();
      },
      error: () => {
        tag.isActive = !tag.isActive;
        this.toast.error('Failed to toggle tag status.');
      }
    });
  }

  deleteTag(tag: CodeInjectionTag): void {
    if (!confirm(`Are you sure you want to remove tag '${tag.name}'?`)) return;

    this.api.delete<any>(`ContentApi/code-injections/${tag.id}`).subscribe({
      next: () => {
        this.toast.success(`Tag '${tag.name}' deleted.`);
        this.loadAllCodeInjections();
      },
      error: () => {
        this.toast.error('Failed to delete tag.');
      }
    });
  }

  // ==========================================
  // CUSTOM SECTION TEMPLATE BUILDER METHODS
  // ==========================================
  openCreateCustomTemplateModal(): void {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    this.customTemplateForm = {
      name: '',
      categoryKey: 'body',
      variantCode: `Body_Custom_${randomSuffix}`,
      description: '',
      htmlTemplate: `<section class="oz-custom-section">\n  <div class="oz-container">\n    <h2>{{ Title }}</h2>\n    <p>{{ Description }}</p>\n  </div>\n</section>`,
      cssStyles: `/* Optional Scoped CSS (Leave blank if styling via Header Tags) */\n.oz-custom-section {\n  padding: 60px 24px;\n  background: #f8fafc;\n  font-family: Inter, sans-serif;\n}`,
      jsScript: ''
    };
    this.showCustomTemplateModal = true;
  }

  closeCustomTemplateModal(): void {
    this.showCustomTemplateModal = false;
  }

  onCustomCategoryChange(): void {
    const cat = this.customTemplateForm.categoryKey || 'body';
    const prefixMap: Record<string, string> = {
      menu: 'Menu_Custom',
      hero: 'Hero_Custom',
      body: 'Body_Custom',
      footer: 'Footer_Custom',
      newsletter: 'Newsletter_Custom',
      contact: 'Contact_Custom',
      blog: 'Blog_Custom',
      ecommerce: 'Ecom_Custom',
      faq: 'Faq_Custom',
      marquee: 'Marquee_Custom'
    };
    const pfx = prefixMap[cat] || 'Section_Custom';
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    this.customTemplateForm.variantCode = `${pfx}_${randomSuffix}`;
  }

  insertPlaceholder(token: string): void {
    this.customTemplateForm.htmlTemplate = (this.customTemplateForm.htmlTemplate || '') + '\n' + token;
    this.toast.info(`Inserted token: ${token.split('\n')[0]}`);
  }

  insertNamedToken(tokenName: string): void {
    let token = `{{ ${tokenName} }}`;
    if (tokenName === 'PageSectionLists') {
      token = '{{#each PageSectionLists}}\n  <div class="item">\n    <h4>{{ Title }}</h4>\n    <p>{{ Description }}</p>\n  </div>\n{{/each}}';
    }
    this.insertPlaceholder(token);
  }

  saveCustomTemplate(): void {
    if (!this.customTemplateForm.name?.trim()) {
      this.toast.error('Please enter a template name.');
      return;
    }
    if (!this.customTemplateForm.htmlTemplate?.trim()) {
      this.toast.error('Please provide the HTML markup for this section.');
      return;
    }
    if (!this.customTemplateForm.variantCode?.trim()) {
      this.onCustomCategoryChange();
    }

    this.savingCustomTemplate = true;

    this.api.post<any>('ContentApi/templates/custom', this.customTemplateForm).subscribe({
      next: (res) => {
        this.savingCustomTemplate = false;
        const newDbItem = res?.data;
        const newTemplate: InstalledTemplateItem = {
          id: this.customTemplateForm.variantCode,
          dbId: newDbItem?.id,
          name: this.customTemplateForm.name,
          category: this.customTemplateForm.categoryKey,
          variantCode: this.customTemplateForm.variantCode,
          tag: 'custom',
          badge: 'Custom',
          description: this.customTemplateForm.description || 'Custom crafted section template',
          thumbnailGradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          previewIcon: this.getCategoryIcon(this.customTemplateForm.categoryKey),
          previewSubtitle: this.getCategoryName(this.customTemplateForm.categoryKey),
          previewTitle: this.customTemplateForm.name,
          previewBody: 'Custom section component',
          htmlTemplate: this.customTemplateForm.htmlTemplate,
          cssStyles: this.customTemplateForm.cssStyles,
          jsScript: this.customTemplateForm.jsScript,
          version: '1.0.0',
          installedUtc: new Date().toISOString()
        };

        this.installedTemplates.unshift(newTemplate);
        this.saveInstalledTemplates();
        this.applyFilters();
        this.closeCustomTemplateModal();
        this.toast.success(`Custom template '${newTemplate.name}' created and added to your library!`);
      },
      error: () => {
        this.savingCustomTemplate = false;
        this.toast.error('Failed to create custom template. Please verify API connection.');
      }
    });
  }

  loadInstalledTemplates(): void {
    const stored = localStorage.getItem('oz_installed_templates');
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

    if (stored) {
      try {
        this.installedTemplates = JSON.parse(stored);
        const menuObj = this.installedTemplates.find(t => t.category === 'menu');
        if (menuObj && !storedMenu) this.activeMenuId = menuObj.id;
        const heroObj = this.installedTemplates.find(t => t.category === 'hero');
        if (heroObj && !storedHero) this.activeHeroId = heroObj.id;
        const newsletterObj = this.installedTemplates.find(t => t.category === 'newsletter');
        if (newsletterObj && !storedNewsletter) this.activeNewsletterId = newsletterObj.id;
        const footerObj = this.installedTemplates.find(t => t.category === 'footer');
        if (footerObj && !storedFooter) this.activeFooterId = footerObj.id;
        const blogObj = this.installedTemplates.find(t => t.category === 'blog');
        if (blogObj && !storedBlog) this.activeBlogId = blogObj.id;
        const breadcrumbObj = this.installedTemplates.find(t => t.category === 'breadcrumb');
        if (breadcrumbObj && !storedBreadcrumb) this.activeBreadcrumbId = breadcrumbObj.id;
        const ecomObj = this.installedTemplates.find(t => t.category === 'ecommerce');
        if (ecomObj && !storedEcommerce) this.activeEcommerceId = ecomObj.id;
      } catch (e) {
        this.installedTemplates = [];
      }
    } else {
      this.installedTemplates = this.getInitialInstalledTemplates();
      this.saveInstalledTemplates();
    }
    this.applyFilters();

    // Fetch from backend API
    this.api.get<any>('ContentApi/templates/installed').subscribe({
      next: (res) => {
        if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
          const apiTemplates: any[] = res.data;
          apiTemplates.forEach(apiT => {
            const existing = this.installedTemplates.find(t => t.id === apiT.templateKey || t.variantCode === apiT.variantCode);
            if (existing) {
              existing.dbId = apiT.id;
              const cat = apiT.categoryKey?.toLowerCase();
              if (cat === 'menu' && apiT.isActive) { this.activeMenuId = existing.id; localStorage.setItem('oz_active_menu_id', existing.id); }
              if (cat === 'hero' && apiT.isActive) { this.activeHeroId = existing.id; localStorage.setItem('oz_active_hero_id', existing.id); }
              if (cat === 'newsletter' && apiT.isActive) { this.activeNewsletterId = existing.id; localStorage.setItem('oz_active_newsletter_id', existing.id); }
              if (cat === 'footer' && apiT.isActive) { this.activeFooterId = existing.id; localStorage.setItem('oz_active_footer_id', existing.id); }
              if (cat === 'blog' && apiT.isActive) { this.activeBlogId = existing.id; localStorage.setItem('oz_active_blog_id', existing.id); }
              if (cat === 'breadcrumb' && apiT.isActive) { this.activeBreadcrumbId = existing.id; localStorage.setItem('oz_active_breadcrumb_id', existing.id); }
              if (cat === 'ecommerce' && apiT.isActive) { this.activeEcommerceId = existing.id; localStorage.setItem('oz_active_ecommerce_id', existing.id); }
            } else {
              this.installedTemplates.push({
                id: apiT.templateKey || apiT.variantCode,
                dbId: apiT.id,
                name: apiT.name,
                category: apiT.categoryKey,
                variantCode: apiT.variantCode,
                tag: 'custom',
                description: 'Installed template blueprint from Master catalog.',
                thumbnailGradient: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                previewIcon: 'widgets',
                previewSubtitle: apiT.categoryKey,
                previewTitle: apiT.name,
                previewBody: 'Installed component block',
                htmlTemplate: apiT.htmlTemplate,
                cssStyles: apiT.cssStyles,
                jsScript: apiT.jsScript,
                version: apiT.installedVersion || '1.0.0',
                installedUtc: apiT.installedUtc || new Date().toISOString()
              });
            }
          });
          this.saveInstalledTemplates();
          this.applyFilters();
        }
      },
      error: () => {}
    });
  }

  saveInstalledTemplates(): void {
    localStorage.setItem('oz_installed_templates', JSON.stringify(this.installedTemplates));
  }

  // Active Blueprint Helpers
  getActiveMenu(): InstalledTemplateItem | undefined {
    return this.installedTemplates.find(t => t.category === 'menu' && this.activeMenuId === t.id) ||
           this.installedTemplates.find(t => t.category === 'menu');
  }

  getActiveHero(): InstalledTemplateItem | undefined {
    return this.installedTemplates.find(t => t.category === 'hero' && this.activeHeroId === t.id) ||
           this.installedTemplates.find(t => t.category === 'hero');
  }

  getActiveBody(): InstalledTemplateItem | undefined {
    return this.installedTemplates.find(t => t.category === 'body');
  }

  getAllBodyBlocks(): InstalledTemplateItem[] {
    const singletonIds = new Set<string>();
    const menu = this.getActiveMenu();
    const hero = this.getActiveHero();
    const news = this.getActiveNewsletter();
    const footer = this.getActiveFooter();
    if (menu) singletonIds.add(menu.id);
    if (hero) singletonIds.add(hero.id);
    if (news) singletonIds.add(news.id);
    if (footer) singletonIds.add(footer.id);

    return this.installedTemplates.filter(t => 
      !singletonIds.has(t.id) &&
      t.category !== 'menu' &&
      t.category !== 'hero' &&
      t.category !== 'newsletter' &&
      t.category !== 'footer'
    );
  }

  getActiveNewsletter(): InstalledTemplateItem | undefined {
    return this.installedTemplates.find(t => t.category === 'newsletter' && this.activeNewsletterId === t.id) ||
           this.installedTemplates.find(t => t.category === 'newsletter');
  }

  getActiveFooter(): InstalledTemplateItem | undefined {
    return this.installedTemplates.find(t => t.category === 'footer' && this.activeFooterId === t.id) ||
           this.installedTemplates.find(t => t.category === 'footer');
  }

  getActiveEcommerce(): InstalledTemplateItem | undefined {
    return this.installedTemplates.find(t => t.category === 'ecommerce' && this.activeEcommerceId === t.id) ||
           this.installedTemplates.find(t => t.category === 'ecommerce');
  }

  getBlueprintFilledCount(): number {
    let count = 0;
    if (this.getActiveMenu()) count++;
    if (this.getActiveHero()) count++;
    if (this.getActiveBody()) count++;
    if (this.getActiveNewsletter()) count++;
    if (this.getActiveFooter()) count++;
    if (this.getActiveEcommerce()) count++;
    return count;
  }

  isSingletonCategory(cat: string): boolean {
    return this.singletonCategories.includes(cat);
  }

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

  isActiveMenu(item: InstalledTemplateItem): boolean {
    return item.category === 'menu' && this.activeMenuId === item.id;
  }

  isActiveHero(item: InstalledTemplateItem): boolean {
    return item.category === 'hero' && this.activeHeroId === item.id;
  }

  isActiveNewsletter(item: InstalledTemplateItem): boolean {
    return item.category === 'newsletter' && this.activeNewsletterId === item.id;
  }

  isActiveFooter(item: InstalledTemplateItem): boolean {
    return item.category === 'footer' && this.activeFooterId === item.id;
  }

  isActiveBlog(item: InstalledTemplateItem): boolean {
    return item.category === 'blog' && this.activeBlogId === item.id;
  }

  isActiveBreadcrumb(item: InstalledTemplateItem): boolean {
    return item.category === 'breadcrumb' && this.activeBreadcrumbId === item.id;
  }

  isActiveEcommerce(item: InstalledTemplateItem): boolean {
    return item.category === 'ecommerce' && this.activeEcommerceId === item.id;
  }

  isActiveSingleton(item: InstalledTemplateItem): boolean {
    return this.isActiveMenu(item) || this.isActiveHero(item) || this.isActiveNewsletter(item) || this.isActiveFooter(item) || this.isActiveBlog(item) || this.isActiveBreadcrumb(item) || this.isActiveEcommerce(item);
  }

  activateTemplate(item: InstalledTemplateItem): void {
    if (item.category === 'menu') { this.activeMenuId = item.id; localStorage.setItem('oz_active_menu_id', item.id); }
    if (item.category === 'hero') { this.activeHeroId = item.id; localStorage.setItem('oz_active_hero_id', item.id); }
    if (item.category === 'newsletter') { this.activeNewsletterId = item.id; localStorage.setItem('oz_active_newsletter_id', item.id); }
    if (item.category === 'footer') { this.activeFooterId = item.id; localStorage.setItem('oz_active_footer_id', item.id); }
    if (item.category === 'blog') { this.activeBlogId = item.id; localStorage.setItem('oz_active_blog_id', item.id); }
    if (item.category === 'breadcrumb') { this.activeBreadcrumbId = item.id; localStorage.setItem('oz_active_breadcrumb_id', item.id); }
    if (item.category === 'ecommerce') { this.activeEcommerceId = item.id; localStorage.setItem('oz_active_ecommerce_id', item.id); }

    if (item.dbId) {
      this.api.post<any>(`ContentApi/templates/${item.dbId}/set-active`, {}).subscribe({
        next: () => {},
        error: () => {}
      });
    }

    this.applyFilters();
    this.toast.success(`'${item.name}' is now your active website ${this.getSingletonLabel(item.category).toLowerCase()}!`);
  }

  applyFilters(): void {
    let list = [...this.installedTemplates];
    if (this.selectedCategory !== 'all') {
      list = list.filter(t => t.category === this.selectedCategory);
    }
    if (this.searchQuery && this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.variantCode.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
      );
    }
    this.filteredTemplates = list;
  }

  setCategory(catId: string): void {
    this.selectedCategory = catId;
    this.applyFilters();
  }

  getCategoryCount(catId: string): number {
    return this.installedTemplates.filter(t => t.category === catId).length;
  }

  getCategoryName(catId: string): string {
    const found = this.categories.find(c => c.id === catId);
    return found ? found.name : catId;
  }

  getCategoryIcon(catId: string): string {
    const found = this.categories.find(c => c.id === catId);
    return found ? found.icon : 'widgets';
  }

  // Single Preview Modal
  openSinglePreviewModal(item: InstalledTemplateItem): void {
    this.activePreviewItem = item;
    this.previewViewport = 'desktop';
    this.previewModalTab = 'preview';

    const combined = `<style>${item.cssStyles}</style>\n${item.htmlTemplate}`;
    this.safeSinglePreviewHtml = this.sanitizer.bypassSecurityTrustHtml(combined);

    let styleEl = document.getElementById('oz-template-single-preview-css') as HTMLStyleElement;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'oz-template-single-preview-css';
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = item.cssStyles;

    this.showSinglePreviewModal = true;
  }

  copyCode(content: string, type: string): void {
    if (!content) return;
    navigator.clipboard.writeText(content).then(() => {
      this.toast.success(`${type} code copied to clipboard!`);
    }).catch(() => {
      this.toast.info('Please select and copy manually.');
    });
  }

  closeSinglePreviewModal(): void {
    this.showSinglePreviewModal = false;
    this.activePreviewItem = null;
    this.safeSinglePreviewHtml = '';
    const styleEl = document.getElementById('oz-template-single-preview-css');
    if (styleEl) styleEl.textContent = '';
  }

  // Full-Site Demo Modal
  openFullSiteDemoModal(): void {
    this.fullDemoViewport = 'desktop';

    const menuBlock = this.getActiveMenu();
    const heroBlock = this.getActiveHero();
    const allBodyBlocks = this.getAllBodyBlocks();
    const newsBlock = this.getActiveNewsletter();
    const footerBlock = this.getActiveFooter();

    const activeBlocks: InstalledTemplateItem[] = [];
    if (menuBlock) activeBlocks.push(menuBlock);
    if (heroBlock) activeBlocks.push(heroBlock);
    activeBlocks.push(...allBodyBlocks);
    if (newsBlock) activeBlocks.push(newsBlock);
    if (footerBlock) activeBlocks.push(footerBlock);

    let combinedStyles = `
      /* Demo Canvas Navigation Sample-Only Styles */
      .full-demo-canvas-wrapper nav a,
      .full-demo-canvas-wrapper .oz-nav-classic a,
      .full-demo-canvas-wrapper .oz-nav-links a,
      .full-demo-canvas-wrapper .oz-btn-nav,
      .full-demo-canvas-wrapper nav button,
      .full-demo-canvas-wrapper .oz-brand-link {
        pointer-events: none !important;
        cursor: default !important;
        user-select: none !important;
      }
    `;
    let combinedHtml = '';

    activeBlocks.forEach(b => {
      combinedStyles += `\n/* Block: ${b.name} (${b.variantCode}) */\n${b.cssStyles}\n`;
      combinedHtml += `\n<!-- Section: ${b.name} (${b.category}) -->\n${b.htmlTemplate}\n`;
    });

    this.safeFullDemoHtml = this.sanitizer.bypassSecurityTrustHtml(`<style>${combinedStyles}</style>\n${combinedHtml}`);

    let styleEl = document.getElementById('oz-full-demo-preview-css') as HTMLStyleElement;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'oz-full-demo-preview-css';
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = combinedStyles;

    this.showFullSiteDemoModal = true;
  }

  getFullDemoBlockCount(): number {
    let count = 0;
    if (this.getActiveMenu()) count++;
    if (this.getActiveHero()) count++;
    count += this.getAllBodyBlocks().length;
    if (this.getActiveNewsletter()) count++;
    if (this.getActiveFooter()) count++;
    return count;
  }

  onPreviewCanvasClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const anchor = target?.closest('a');
    const button = target?.closest('button');
    if (anchor || button) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  closeFullSiteDemoModal(): void {
    this.showFullSiteDemoModal = false;
    this.safeFullDemoHtml = '';
    const styleEl = document.getElementById('oz-full-demo-preview-css');
    if (styleEl) styleEl.textContent = '';
  }

  // Assign to Page Modal
  openAssignModal(item: InstalledTemplateItem): void {
    this.selectedAssignItem = item;
    this.targetPageSlug = 'home';
    this.insertPosition = 'bottom';
    this.showAssignModal = true;
  }

  closeAssignModal(): void {
    this.showAssignModal = false;
    this.selectedAssignItem = null;
  }

  confirmAssignToPage(): void {
    if (!this.selectedAssignItem) return;
    const item = this.selectedAssignItem;
    this.toast.success(`'${item.name}' added to ${this.targetPageSlug.toUpperCase()} page!`);
    this.closeAssignModal();
    this.router.navigate(['/content/console']);
  }

  uninstallTemplate(item: InstalledTemplateItem): void {
    if (confirm(`Are you sure you want to uninstall '${item.name}' (${item.variantCode}) from your template library?`)) {
      this.installedTemplates = this.installedTemplates.filter(t => t.id !== item.id);
      this.saveInstalledTemplates();
      this.applyFilters();

      if (item.dbId) {
        this.api.delete<any>(`ContentApi/templates/installed/${item.dbId}`).subscribe({
          next: () => {},
          error: () => {}
        });
      }

      this.toast.success(`Template '${item.name}' uninstalled.`);
    }
  }

  private getInitialInstalledTemplates(): InstalledTemplateItem[] {
    return [
      {
        id: 'menu-01',
        name: 'Classic Corporate Navbar',
        category: 'menu',
        variantCode: 'Menu_Classic',
        badge: 'Popular',
        tag: 'corporate',
        description: 'Standard corporate left logo, centered navigation links, and right Get Started CTA button.',
        thumbnailGradient: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        previewIcon: 'menu',
        previewSubtitle: 'Header Navigation',
        previewTitle: 'Acme Enterprise Solutions',
        previewBody: 'Features • Solutions • Pricing • Company • Contact',
        version: '1.0.0',
        installedUtc: new Date().toISOString(),
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
              <a href="#">Overview</a><a href="#">Solutions</a><a href="#">Products</a><a href="#">Pricing</a><a href="#">Contact</a>
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
          .oz-nav-links a { color: #475569; text-decoration: none; font-size: 13.5px; font-weight: 600; }
          .oz-nav-links a:hover { color: #0050e5; }
          .oz-btn-nav { background: #0050e5; color: #fff; padding: 8px 16px; border-radius: 7px; text-decoration: none; font-size: 13px; font-weight: 700; display: inline-block; }

          @media(max-width: 768px), (max-width: 100%) {
            .viewport-mobile .oz-nav-classic { flex-direction: column; align-items: stretch; padding: 16px 20px; }
            .viewport-mobile .oz-nav-brand-row { width: 100%; }
            .viewport-mobile .oz-mobile-toggle { display: flex; }
            .viewport-mobile .oz-nav-links { display: flex; flex-direction: column; gap: 12px; padding: 16px 0 10px 0; border-top: 1px solid #f1f5f9; margin-top: 14px; }
            .viewport-mobile .oz-nav-cta { width: 100%; margin-top: 8px; }
            .viewport-mobile .oz-btn-nav { display: block; text-align: center; }
          }
        `
      },
      {
        id: 'hero-01',
        name: 'Split Product Showcase with CTA',
        category: 'hero',
        variantCode: 'Hero_SplitProduct',
        badge: 'Popular',
        tag: 'modern',
        description: 'High-conversion split hero with left bold typography, value proposition chips, dual action buttons, and right 3D card showcase.',
        thumbnailGradient: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
        previewIcon: 'view_carousel',
        previewSubtitle: 'Split Screen Hero',
        previewTitle: 'Next-Gen Business Governance',
        previewBody: 'Empower committee leadership with automated financial controls.',
        version: '1.0.0',
        installedUtc: new Date().toISOString(),
        htmlTemplate: `
          <section class="oz-hero-split">
            <div class="oz-hero-content">
              <span class="oz-pill">✦ NEXT-GEN GOVERNANCE PLATFORM</span>
              <h1 class="oz-hero-h1">The Operating System for Modern Organizations</h1>
              <p class="oz-hero-lead">Automate financial dues, manage committees, verify voter ballots, and streamline membership workflows in one centralized hub.</p>
              <div class="oz-hero-btns">
                <a href="#" class="oz-btn-primary">Start Free Trial →</a>
                <a href="#" class="oz-btn-ghost">Watch 2-Min Demo</a>
              </div>
            </div>
            <div class="oz-hero-media">
              <div class="oz-mock-card">
                <div class="oz-card-stat">
                  <span class="oz-stat-num">$1.4M+</span>
                  <span class="oz-stat-lbl">Processed Dues</span>
                </div>
                <div class="oz-card-graph"></div>
              </div>
            </div>
          </section>
        `,
        cssStyles: `
          .oz-hero-split { display: flex; align-items: center; justify-content: space-between; padding: 70px 48px; background: #0f172a; color: #ffffff; font-family: Inter, sans-serif; gap: 40px; }
          .oz-hero-content { flex: 1; max-width: 580px; }
          .oz-pill { background: rgba(79, 70, 229, 0.3); color: #818cf8; padding: 6px 14px; border-radius: 20px; font-size: 11.5px; font-weight: 800; display: inline-block; margin-bottom: 16px; border: 1px solid rgba(129, 140, 248, 0.3); }
          .oz-hero-h1 { font-size: 38px; font-weight: 900; line-height: 1.15; margin: 0 0 16px 0; letter-spacing: -0.02em; }
          .oz-hero-lead { font-size: 15px; color: #94a3b8; line-height: 1.6; margin: 0 0 28px 0; }
          .oz-hero-btns { display: flex; gap: 14px; }
          .oz-btn-primary { background: #0050e5; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 13.5px; }
          .oz-btn-ghost { background: rgba(255,255,255,0.08); color: #fff; border: 1px solid rgba(255,255,255,0.2); padding: 12px 22px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 13.5px; }
          .oz-hero-media { flex: 1; display: flex; justify-content: center; }
          .oz-mock-card { width: 100%; max-width: 380px; background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 32px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); backdrop-filter: blur(10px); }
          .oz-stat-num { font-size: 32px; font-weight: 900; color: #38bdf8; display: block; }
          .oz-stat-lbl { font-size: 13px; color: #94a3b8; }
          .oz-card-graph { height: 70px; margin-top: 20px; background: linear-gradient(90deg, rgba(56, 189, 248, 0.2), rgba(79, 70, 229, 0.4)); border-radius: 8px; border: 1px dashed rgba(56, 189, 248, 0.4); }

          @media(max-width: 768px), (max-width: 100%) {
            .viewport-mobile .oz-hero-split { flex-direction: column; padding: 40px 20px; text-align: center; }
            .viewport-mobile .oz-hero-btns { flex-direction: column; }
            .viewport-mobile .oz-hero-h1 { font-size: 26px; }
          }
        `
      },
      {
        id: 'body-01',
        name: '3-Column Modern Feature Grid',
        category: 'body',
        variantCode: 'Body_FeatureGrid3',
        badge: 'Popular',
        tag: 'modern',
        description: '3-Column card matrix highlighting primary platform pillars with modern hover lifts and border accents.',
        thumbnailGradient: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
        previewIcon: 'view_quilt',
        previewSubtitle: '3-Column Cards',
        previewTitle: 'Engineered for Performance & Scale',
        previewBody: 'Real-time sync, zero trust security, and automated multi-tenant provisioning.',
        version: '1.0.0',
        installedUtc: new Date().toISOString(),
        htmlTemplate: `
          <section class="oz-feat3">
            <div class="oz-feat-head">
              <span class="oz-pill-sub">CORE CAPABILITIES</span>
              <h2>Engineered for Performance & Scale</h2>
              <p>Experience enterprise reliability, real-time socket events, and bank-grade data sovereignty.</p>
            </div>
            <div class="oz-feat3-grid">
              <div class="oz-feat3-card">
                <div class="oz-feat-icon">⚡</div>
                <h3>Real-Time Sync</h3>
                <p>Instantaneous SignalR WebSocket state propagation across all devices with zero polling latency.</p>
              </div>
              <div class="oz-feat3-card">
                <div class="oz-feat-icon">🛡️</div>
                <h3>Granular RBAC</h3>
                <p>Fine-grained permission matrices for committee chairs, financial auditors, and general members.</p>
              </div>
              <div class="oz-feat3-card">
                <div class="oz-feat-icon">☁️</div>
                <h3>Cloud Vault</h3>
                <p>Fully compliant Cloudinary digital asset streaming and secure document vaults.</p>
              </div>
            </div>
          </section>
        `,
        cssStyles: `
          .oz-feat3 { padding: 80px 48px; background: #ffffff; font-family: Inter, sans-serif; }
          .oz-feat-head { text-align: center; max-width: 650px; margin: 0 auto 50px auto; }
          .oz-pill-sub { color: #0050e5; font-weight: 800; font-size: 12px; letter-spacing: 0.08em; }
          .oz-feat-head h2 { font-size: 32px; font-weight: 900; color: #0f172a; margin: 8px 0 12px 0; }
          .oz-feat-head p { color: #64748b; font-size: 14.5px; line-height: 1.6; margin: 0; }
          .oz-feat3-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px; max-width: 1100px; margin: 0 auto; }
          .oz-feat3-card { background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 32px 24px; transition: transform 0.2s, border-color 0.2s; }
          .oz-feat3-card:hover { transform: translateY(-4px); border-color: #0050e5; }
          .oz-feat-icon { font-size: 32px; margin-bottom: 16px; }
          .oz-feat3-card h3 { font-size: 18px; font-weight: 800; color: #0f172a; margin: 0 0 10px 0; }
          .oz-feat3-card p { font-size: 13.5px; color: #64748b; line-height: 1.6; margin: 0; }

          @media(max-width: 768px), (max-width: 100%) {
            .viewport-mobile .oz-feat3-grid { grid-template-columns: 1fr; }
            .viewport-mobile .oz-feat3 { padding: 40px 20px; }
          }
        `
      },
      {
        id: 'footer-01',
        name: '4-Column Corporate Footer with Newsletter',
        category: 'footer',
        variantCode: 'Footer_4ColCorporate',
        badge: 'Popular',
        tag: 'corporate',
        description: 'Comprehensive footer with brand overview, product links, company resources, legal disclaimers, and inline newsletter subscription.',
        thumbnailGradient: 'linear-gradient(135deg, #0f172a 0%, #020617 100%)',
        previewIcon: 'dock_to_bottom',
        previewSubtitle: '4-Column Footer',
        previewTitle: 'Acme Enterprise Corporation',
        previewBody: 'Product, Solutions, Legal links and copyright bar.',
        version: '1.0.0',
        installedUtc: new Date().toISOString(),
        htmlTemplate: `
          <footer class="oz-footer-4col">
            <div class="oz-footer-top">
              <div class="oz-foot-brand">
                <a href="#" class="oz-brand-link">
                  <img src="https://res.cloudinary.com/dsmclttal/image/upload/v1718000000/branding/brand-logo-light.svg"
                       onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 160 40\\' fill=\\'none\\'><rect width=\\'38\\' height=\\'38\\' rx=\\'9\\' fill=\\'%2338BDF8\\'/><path d=\\'M13 25V13L25 25V13\\' stroke=\\'%230F172A\\' stroke-width=\\'3\\' stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\'/><text x=\\'48\\' y=\\'25\\' font-family=\\'system-ui, -apple-system, sans-serif\\' font-size=\\'16\\' font-weight=\\'800\\' fill=\\'%23FFFFFF\\' letter-spacing=\\'0.5\\'>OZIKOL<tspan fill=\\'%2338BDF8\\'>.BCC</tspan></text></svg>'"
                       alt="Brand Logo" class="oz-brand-logo-img" style="margin-bottom: 14px;" />
                </a>
                <p>Empowering leadership teams with automated governance, financial integrity, and member engagement.</p>
              </div>
              <div class="oz-foot-col">
                <h4>Solutions</h4>
                <a href="#">Committees</a><a href="#">E-Voting</a><a href="#">Dues & Wallets</a><a href="#">Recruitment</a>
              </div>
              <div class="oz-foot-col">
                <h4>Company</h4>
                <a href="#">About Us</a><a href="#">Leadership</a><a href="#">Careers</a><a href="#">Contact Support</a>
              </div>
              <div class="oz-foot-col">
                <h4>Stay Updated</h4>
                <p style="font-size: 12.5px; color: #94a3b8; margin: 0 0 10px 0;">Subscribe for platform updates.</p>
                <div class="oz-foot-sub-box"><input type="email" placeholder="Enter email" /><button>Join</button></div>
              </div>
            </div>
            <div class="oz-foot-bottom">
              <span>© 2026 Workspace Corporation. All rights reserved.</span>
              <div class="oz-foot-links"><a href="#">Privacy Policy</a><a href="#">Terms of Service</a><a href="#">Security</a></div>
            </div>
          </footer>
        `,
        cssStyles: `
          .oz-footer-4col { background: #090d16; color: #cbd5e1; padding: 60px 48px 30px 48px; font-family: Inter, sans-serif; border-top: 1px solid #1e293b; }
          .oz-footer-top { display: grid; grid-template-columns: 2fr 1fr 1fr 1.5fr; gap: 40px; max-width: 1100px; margin: 0 auto 50px auto; }
          .oz-brand-link { display: inline-flex; align-items: center; text-decoration: none; }
          .oz-brand-logo-img { height: 32px; max-height: 38px; width: auto; object-fit: contain; display: block; }
          .oz-foot-brand p { font-size: 13px; color: #94a3b8; line-height: 1.6; margin-top: 12px; max-width: 280px; }
          .oz-foot-col h4 { font-size: 13.5px; font-weight: 800; color: #fff; margin: 0 0 16px 0; text-transform: uppercase; letter-spacing: 0.05em; }
          .oz-foot-col a { display: block; color: #94a3b8; text-decoration: none; font-size: 13px; margin-bottom: 10px; transition: color 0.15s; }
          .oz-foot-col a:hover { color: #38bdf8; }
          .oz-foot-sub-box { display: flex; gap: 6px; }
          .oz-foot-sub-box input { background: #1e293b; border: 1px solid #334155; border-radius: 6px; padding: 8px 10px; font-size: 12px; color: #fff; flex: 1; }
          .oz-foot-sub-box button { background: #0050e5; color: #fff; border: none; border-radius: 6px; padding: 8px 14px; font-weight: 700; font-size: 12px; cursor: pointer; }
          .oz-foot-bottom { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #1e293b; padding-top: 24px; max-width: 1100px; margin: 0 auto; font-size: 12px; color: #64748b; }
          .oz-foot-links { display: flex; gap: 20px; }
          .oz-foot-links a { color: #64748b; text-decoration: none; }
          .oz-foot-links a:hover { color: #cbd5e1; }

          @media(max-width: 768px), (max-width: 100%) {
            .viewport-mobile .oz-footer-top { grid-template-columns: 1fr; gap: 30px; }
            .viewport-mobile .oz-foot-bottom { flex-direction: column; gap: 14px; text-align: center; }
            .viewport-mobile .oz-footer-4col { padding: 40px 20px; }
          }
        `
      }
    ];
  }
}
