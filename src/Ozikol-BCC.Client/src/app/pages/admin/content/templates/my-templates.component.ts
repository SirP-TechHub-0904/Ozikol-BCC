import { Component, OnInit, OnDestroy, HostListener, ViewChild, ElementRef } from '@angular/core';
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
  groupCode?: string;
  groupName?: string;
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
  defaultContentJson?: string;
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
                  Your component vault. Installed templates can be assigned to pages in CMS Studio or previewed together in a live simulated website demo.
                </p>
              </div>
            </div>
          </div>

          <div class="header-actions">
            <a
              routerLink="/content/console/templates/create"
              class="btn btn-add-custom-template"
              title="Create a custom section template directly with HTML placeholders"
            >
              <span class="material-symbols-outlined btn-icon">add_circle</span>
              <span>Create Custom Section</span>
            </a>
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

        <!-- Theme Suite Filter Bar -->
        <div class="theme-suite-filter-bar">
          <div class="suite-filter-label">
            <span class="material-symbols-outlined suite-icon">inventory_2</span>
            <span>Theme Suite:</span>
          </div>
          <div class="suite-chips">
            <button
              type="button"
              class="suite-chip"
              [class.active]="selectedGroup === 'all'"
              (click)="selectedGroup = 'all'; applyFilters()"
            >
              All Suites
            </button>
            <button
              type="button"
              class="suite-chip"
              [class.active]="selectedGroup === 'apex-commerce'"
              (click)="selectedGroup = 'apex-commerce'; applyFilters()"
            >
              <i class="fa-solid fa-cube me-1 text-primary"></i> Apex Commerce Pro
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
                <div class="title-with-suite-badge">
                  <h3 class="card-title">{{ item.name }}</h3>
                  <span class="theme-suite-badge">
                    <span class="material-symbols-outlined suite-badge-icon">inventory_2</span>
                    {{ item.groupName || 'Apex Commerce Pro' }}
                  </span>
                </div>
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
                (click)="openUninstallModal(item)"
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
                        (click)="openUninstallModal(item)"
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
                      <button type="button" class="btn-tbl-action delete" (click)="openDeleteTagModal(tag)" title="Delete Tag">
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

          <!-- Mode Tabs: Preview, Sample Content, HTML, CSS, JS -->
          <div class="modal-view-mode-tabs">
            <button
              type="button"
              class="modal-mode-tab-btn"
              [class.active]="previewModalTab === 'preview'"
              (click)="setPreviewModalTab('preview')"
            >
              <span class="material-symbols-outlined">visibility</span>
              <span>Preview</span>
            </button>
            <button
              type="button"
              class="modal-mode-tab-btn"
              [class.active]="previewModalTab === 'content'"
              (click)="setPreviewModalTab('content')"
            >
              <span class="material-symbols-outlined">edit_note</span>
              <span>Sample Content</span>
            </button>
            <button
              type="button"
              class="modal-mode-tab-btn"
              [class.active]="previewModalTab === 'html'"
              (click)="setPreviewModalTab('html')"
            >
              <span class="material-symbols-outlined">html</span>
              <span>HTML</span>
            </button>
            <button
              type="button"
              class="modal-mode-tab-btn"
              [class.active]="previewModalTab === 'css'"
              (click)="setPreviewModalTab('css')"
            >
              <span class="material-symbols-outlined">css</span>
              <span>CSS</span>
            </button>
            <button
              type="button"
              class="modal-mode-tab-btn"
              [class.active]="previewModalTab === 'js'"
              (click)="setPreviewModalTab('js')"
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

        <!-- Page View Simulation Bar (active for menu templates in visual preview mode) -->
        <div class="page-sim-toolbar" *ngIf="previewModalTab === 'preview' && activePreviewItem?.category === 'menu'">
          <div class="sim-brand-badge">
            <span class="material-symbols-outlined fs-6">web</span>
            <span>Page Simulation:</span>
          </div>
          <div class="sim-pills-wrap">
            <button type="button" class="sim-pill-btn" [class.active]="modalPreviewPageSlug === 'isolated'" (click)="setModalPreviewPage('isolated')">
              <span class="material-symbols-outlined fs-6">crop_free</span>
              <span>Isolated Navbar</span>
            </button>
            <button type="button" class="sim-pill-btn" [class.active]="modalPreviewPageSlug === 'home'" (click)="setModalPreviewPage('home')">
              <span>Home Page</span>
            </button>
            <button type="button" class="sim-pill-btn" [class.active]="modalPreviewPageSlug === 'about'" (click)="setModalPreviewPage('about')">
              <span>About Us</span>
            </button>
            <button type="button" class="sim-pill-btn" [class.active]="modalPreviewPageSlug === 'services'" (click)="setModalPreviewPage('services')">
              <span>Services</span>
            </button>
            <button type="button" class="sim-pill-btn" [class.active]="modalPreviewPageSlug === 'request-service'" (click)="setModalPreviewPage('request-service')">
              <span>Request a Service</span>
            </button>
            <button type="button" class="sim-pill-btn" [class.active]="modalPreviewPageSlug === 'contact'" (click)="setModalPreviewPage('contact')">
              <span>Contact Us</span>
            </button>
            <button type="button" class="sim-pill-btn" [class.active]="modalPreviewPageSlug === 'blog'" (click)="setModalPreviewPage('blog')">
              <span>Blog</span>
            </button>
          </div>
        </div>

        <!-- Mode 1: Rendered Visual Canvas -->
        <div *ngIf="previewModalTab === 'preview'" class="preview-modal-body" [class.viewport-mobile]="previewViewport === 'mobile'" [class.viewport-tablet]="previewViewport === 'tablet'">
          <div class="preview-canvas-wrapper">
            <iframe class="full-demo-iframe" [srcdoc]="safeSinglePreviewSrcDoc" title="Single Template Visual Preview"></iframe>
          </div>
        </div>

        <!-- Mode: Interactive Sample Content Editor -->
        <div *ngIf="previewModalTab === 'content'" class="content-editor-container">
          <div class="content-editor-header">
            <div class="content-editor-title-wrap">
              <span class="material-symbols-outlined editor-head-icon">tune</span>
              <div>
                <h4 class="editor-head-title">Dynamic Preview Content Replacements</h4>
                <p class="editor-head-sub">Type custom titles, descriptions, and list cards below. The preview updates instantly!</p>
              </div>
            </div>
            <div class="content-editor-actions">
              <button type="button" class="btn-reset-content" (click)="resetPreviewContent()">
                <span class="material-symbols-outlined">restart_alt</span>
                <span>Reset Defaults</span>
              </button>
              <button type="button" class="btn btn-primary" (click)="setPreviewModalTab('preview')">
                <span class="material-symbols-outlined">visibility</span>
                <span>Return to Preview</span>
              </button>
            </div>
          </div>

          <div class="content-editor-body" [ngSwitch]="activePreviewItem.category">
            <!-- MENU CATEGORY -->
            <div class="custom-tpl-form-grid" *ngSwitchCase="'menu'">
              <div class="form-group">
                <label class="form-lbl" [innerText]="'BRAND NAME ({{ BrandName }})'"></label>
                <input type="text" [(ngModel)]="previewMenuContent.brandName" (ngModelChange)="onPreviewContentChange()" class="form-ctrl" placeholder="e.g. Acme Global" />
              </div>
              <div class="form-group">
                <label class="form-lbl" [innerText]="'LOGO IMAGE URL ({{ LogoUrl }})'"></label>
                <div style="display: flex; gap: 8px;">
                  <input type="text" [(ngModel)]="previewMenuContent.logoUrl" (ngModelChange)="onPreviewContentChange()" class="form-ctrl" style="flex: 1;" placeholder="https://... (or leave empty to show text business name)" />
                  <button *ngIf="previewMenuContent.logoUrl" type="button" class="btn btn-outline" style="white-space: nowrap; padding: 4px 10px; font-size: 11.5px;" (click)="previewMenuContent.logoUrl = ''; onPreviewContentChange()" title="Clear logo to test business name text fallback">Clear Logo</button>
                </div>
              </div>

              <!-- Brand Identity Explanatory Tip -->
              <div class="form-group full-width" style="background: rgba(56, 189, 248, 0.05); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 8px; padding: 10px 14px; font-size: 12px; color: #475569;">
                <i class="fa-solid fa-circle-info text-primary me-1"></i>
                <strong>Logo-First Fallback:</strong> <code [innerText]="'{{ BrandIdentity }}'"></code> automatically renders the uploaded logo image if Logo URL is present. If null or empty, it seamlessly displays the business name text without leaving broken image tags.
              </div>

              <!-- Top Navigation Links -->
              <div class="form-group full-width">
                <div class="lbl-with-note">
                  <label class="form-lbl" [innerText]="'TOP NAVIGATION LINKS ({{#each MainMenuItems}})'"></label>
                  <button type="button" class="btn-add-subitem" (click)="addTopMenuItem()">+ Add Nav Link</button>
                </div>
                <div class="subitems-list">
                  <div class="subitem-card-row" *ngFor="let item of previewMenuContent.topMenuItems; let idx = index">
                    <span class="subitem-badge">#{{ idx + 1 }}</span>
                    <div class="subitem-inputs">
                      <input type="text" [(ngModel)]="item.title" (ngModelChange)="onPreviewContentChange()" class="form-ctrl subitem-title" placeholder="Link Title" />
                      <input type="text" [(ngModel)]="item.url" (ngModelChange)="onPreviewContentChange()" class="form-ctrl subitem-desc" placeholder="/slug or #anchor" />
                    </div>
                    <button type="button" class="btn-del-subitem" (click)="removeTopMenuItem(idx)" title="Remove item">
                      <span class="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Dropdown Menus with Nested Pages -->
              <div class="form-group full-width">
                <div class="lbl-with-note">
                  <label class="form-lbl" [innerText]="'DROPDOWN MENUS ({{#each MenuDropdowns}} with nested {{#each Pages}})'"></label>
                  <button type="button" class="btn-add-subitem" (click)="addMenuDropdown()">+ Add Dropdown Menu</button>
                </div>
                <div class="subitems-list">
                  <div class="subitem-card-row mb-3" *ngFor="let dd of previewMenuContent.dropdowns; let ddIdx = index" style="flex-direction: column; align-items: stretch;">
                    <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 8px;">
                      <span class="subitem-badge">Dropdown #{{ ddIdx + 1 }}</span>
                      <input type="text" [(ngModel)]="dd.title" (ngModelChange)="onPreviewContentChange()" class="form-ctrl" placeholder="Dropdown Title (e.g. Services, Solutions)" />
                      <button type="button" class="btn-del-subitem" (click)="removeMenuDropdown(ddIdx)" title="Remove Dropdown">
                        <span class="material-symbols-outlined">delete</span>
                      </button>
                    </div>

                    <!-- Inner Child Pages -->
                    <div style="margin-left: 24px; padding-left: 12px; border-left: 2px solid #e2e8f0;">
                      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                        <span style="font-size: 11.5px; font-weight: 700; color: #64748b;">Dropdown Sub-Links:</span>
                        <button type="button" class="btn-add-subitem" style="padding: 2px 8px; font-size: 11px;" (click)="addMenuDropdownPage(ddIdx)">+ Add Sub-Link</button>
                      </div>
                      <div style="display: flex; flex-direction: column; gap: 6px;">
                        <div style="display: flex; gap: 8px; align-items: center;" *ngFor="let p of dd.pages; let pIdx = index">
                          <input type="text" [(ngModel)]="p.title" (ngModelChange)="onPreviewContentChange()" class="form-ctrl" style="flex: 1;" placeholder="Sub-Link Title (e.g. Commercial Cleaning)" />
                          <input type="text" [(ngModel)]="p.url" (ngModelChange)="onPreviewContentChange()" class="form-ctrl" style="flex: 1;" placeholder="/services/commercial-cleaning" />
                          <button type="button" class="btn-del-subitem" (click)="removeMenuDropdownPage(ddIdx, pIdx)" title="Remove Link">
                            <span class="material-symbols-outlined">close</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Header CTA Action Buttons -->
              <div class="form-group full-width">
                <div class="lbl-with-note">
                  <label class="form-lbl" [innerText]="'HEADER CTA BUTTONS ({{#each MenuCtaButtons}} — dynamically populated from pages where IsMenuCTA is enabled)'"></label>
                  <button type="button" class="btn-add-subitem" (click)="addMenuCtaButton()">+ Add CTA Button</button>
                </div>
                <div class="subitems-list">
                  <div class="subitem-card-row" *ngFor="let cta of previewMenuContent.menuCtaButtons; let cIdx = index">
                    <span class="subitem-badge">#{{ cIdx + 1 }}</span>
                    <div class="subitem-inputs">
                      <input type="text" [(ngModel)]="cta.title" (ngModelChange)="onPreviewContentChange()" class="form-ctrl subitem-title" placeholder="Button Text (e.g. Request a Service)" />
                      <input type="text" [(ngModel)]="cta.url" (ngModelChange)="onPreviewContentChange()" class="form-ctrl subitem-desc" placeholder="/target-page" />
                    </div>
                    <button type="button" class="btn-del-subitem" (click)="removeMenuCtaButton(cIdx)" title="Remove CTA">
                      <span class="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- HERO CATEGORY (SLIDER MODEL) -->
            <div class="custom-tpl-form-grid" *ngSwitchCase="'hero'">
              <div class="form-group full-width">
                <label class="form-lbl" [innerText]="'SLIDER MAIN HEADLINE ({{ Title }})'"></label>
                <input type="text" [(ngModel)]="previewHeroContent.title" (ngModelChange)="onPreviewContentChange()" class="form-ctrl fw-bold" placeholder="e.g. Innovating the Future of Community Empowerment" />
              </div>
              <div class="form-group">
                <label class="form-lbl" [innerText]="'MINI TITLE / EYEBROW ({{ MiniTitle }})'"></label>
                <input type="text" [(ngModel)]="previewHeroContent.miniTitle" (ngModelChange)="onPreviewContentChange()" class="form-ctrl" placeholder="e.g. OFFICIAL PORTAL" />
              </div>
              <div class="form-group">
                <label class="form-lbl" [innerText]="'PRIMARY SLIDE IMAGE URL ({{ Url }})'"></label>
                <input type="text" [(ngModel)]="previewHeroContent.url" (ngModelChange)="onPreviewContentChange()" class="form-ctrl" placeholder="https://res.cloudinary.com/... or https://images.unsplash.com/..." />
              </div>
              <div class="form-group full-width">
                <label class="form-lbl" [innerText]="'SLIDE TEXT / SUMMARY ({{ Text }})'"></label>
                <textarea [(ngModel)]="previewHeroContent.text" (ngModelChange)="onPreviewContentChange()" class="form-ctrl" rows="3" placeholder="Brief supportive summary..."></textarea>
              </div>
              <div class="form-group">
                <label class="form-lbl" [innerText]="'PRIMARY BUTTON TEXT ({{ ButtonText }})'"></label>
                <input type="text" [(ngModel)]="previewHeroContent.buttonText" (ngModelChange)="onPreviewContentChange()" class="form-ctrl" placeholder="e.g. Learn More" />
              </div>
              <div class="form-group">
                <label class="form-lbl" [innerText]="'PRIMARY BUTTON LINK ({{ ButtonLink }})'"></label>
                <input type="text" [(ngModel)]="previewHeroContent.buttonLink" (ngModelChange)="onPreviewContentChange()" class="form-ctrl" placeholder="/services or https://..." />
              </div>
              <div class="form-group">
                <label class="form-lbl" [innerText]="'VIDEO BUTTON TEXT ({{ VideoButtonText }})'"></label>
                <input type="text" [(ngModel)]="previewHeroContent.videoButtonText" (ngModelChange)="onPreviewContentChange()" class="form-ctrl" placeholder="e.g. Watch Video" />
              </div>
              <div class="form-group">
                <label class="form-lbl" [innerText]="'POPUP VIDEO LINK ({{ VideoLink }})'"></label>
                <input type="text" [(ngModel)]="previewHeroContent.videoLink" (ngModelChange)="onPreviewContentChange()" class="form-ctrl" placeholder="https://youtube.com/watch?v=..." />
              </div>
              <div class="form-group">
                <label class="form-lbl" [innerText]="'SECONDARY IMAGE URL ({{ SecondUrl }})'"></label>
                <input type="text" [(ngModel)]="previewHeroContent.secondUrl" (ngModelChange)="onPreviewContentChange()" class="form-ctrl" placeholder="https://... (optional overlapping graphic)" />
              </div>
              <div class="form-group">
                <label class="form-lbl" [innerText]="'YOUTUBE VIDEO EMBED ({{ YoutubeVideo }})'"></label>
                <input type="text" [(ngModel)]="previewHeroContent.youtubeVideo" (ngModelChange)="onPreviewContentChange()" class="form-ctrl" placeholder="https://www.youtube.com/embed/..." />
              </div>
            </div>

            <!-- BLOG & ARTICLES CATEGORY -->
            <div class="custom-tpl-form-grid" *ngSwitchCase="'blog'">
              <div class="form-group">
                <label class="form-lbl" [innerText]="'SECTION TITLE ({{ Title }})'"></label>
                <input type="text" [(ngModel)]="previewBlogContent.title" (ngModelChange)="onPreviewContentChange()" class="form-ctrl" placeholder="e.g. Platform Insights & Case Studies" />
              </div>
              <div class="form-group">
                <label class="form-lbl" [innerText]="'MINI TITLE / EYEBROW ({{ MiniTitle }})'"></label>
                <input type="text" [(ngModel)]="previewBlogContent.miniTitle" (ngModelChange)="onPreviewContentChange()" class="form-ctrl" placeholder="e.g. LATEST KNOWLEDGE" />
              </div>
              <div class="form-group full-width">
                <label class="form-lbl" [innerText]="'SECTION DESCRIPTION ({{ Description }})'"></label>
                <textarea [(ngModel)]="previewBlogContent.description" (ngModelChange)="onPreviewContentChange()" class="form-ctrl" rows="2"></textarea>
              </div>
              <div class="form-group">
                <label class="form-lbl" [innerText]="'VIEW ALL BUTTON TEXT ({{ ButtonText }})'"></label>
                <input type="text" [(ngModel)]="previewBlogContent.viewAllButtonText" (ngModelChange)="onPreviewContentChange()" class="form-ctrl" placeholder="Browse All Articles →" />
              </div>
              <div class="form-group">
                <label class="form-lbl" [innerText]="'VIEW ALL BUTTON LINK ({{ ButtonLink }})'"></label>
                <input type="text" [(ngModel)]="previewBlogContent.viewAllButtonLink" (ngModelChange)="onPreviewContentChange()" class="form-ctrl" placeholder="/blog" />
              </div>

              <!-- Blog Articles Repeater -->
              <div class="form-group full-width">
                <div class="lbl-with-note">
                  <label class="form-lbl" [innerText]="'BLOG ARTICLES GRID ({{#each Articles}})'"></label>
                  <button type="button" class="btn-add-subitem" (click)="addBlogArticle()">+ Add Article</button>
                </div>
                <div class="subitems-list">
                  <div class="subitem-card-row mb-2" *ngFor="let art of previewBlogContent.articles; let aIdx = index" style="flex-direction: column; align-items: stretch;">
                    <div style="display: flex; gap: 10px; align-items: center;">
                      <span class="subitem-badge">#{{ aIdx + 1 }}</span>
                      <input type="text" [(ngModel)]="art.title" (ngModelChange)="onPreviewContentChange()" class="form-ctrl" style="flex: 2;" placeholder="Article Title" />
                      <input type="text" [(ngModel)]="art.category" (ngModelChange)="onPreviewContentChange()" class="form-ctrl" style="flex: 1;" placeholder="Category" />
                      <button type="button" class="btn-del-subitem" (click)="removeBlogArticle(aIdx)" title="Remove Article">
                        <span class="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                    <div style="display: flex; gap: 10px; align-items: center; margin-top: 6px;">
                      <input type="text" [(ngModel)]="art.summary" (ngModelChange)="onPreviewContentChange()" class="form-ctrl" style="flex: 2;" placeholder="Short summary..." />
                      <input type="text" [(ngModel)]="art.coverImageUrl" (ngModelChange)="onPreviewContentChange()" class="form-ctrl" style="flex: 1;" placeholder="Cover Image URL" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- BLOG DETAIL CATEGORY -->
            <div class="custom-tpl-form-grid" *ngSwitchCase="'blog_detail'">
              <div class="form-group full-width" style="background: rgba(0, 80, 229, 0.04); border: 1px solid rgba(0, 80, 229, 0.15); border-radius: 8px; padding: 16px;">
                <h5 style="margin: 0 0 6px 0; color: #0050e5; font-size: 14px; font-weight: 700;">
                  <i class="fa-solid fa-file-lines me-2"></i>Dynamic Blog Article Detail Template
                </h5>
                <p style="margin: 0; font-size: 12.5px; color: #475569; line-height: 1.5;">
                  This template renders individual blog posts dynamically from your CMS database. Real article content is managed under <strong>Blog &rarr; Articles</strong>. Sidebar widgets dynamically pull from <strong>RecentArticles</strong>, <strong>BlogCategories</strong>, and <strong>ArticleTags</strong>.
                </p>
              </div>
            </div>

            <!-- FOOTER-SPECIFIC CONTENT EDITOR -->
            <div class="custom-tpl-form-grid" *ngSwitchCase="'footer'">
              <div class="form-group">
                <label class="form-lbl" [innerText]="'BRAND NAME ({{ BrandName }})'"></label>
                <input type="text" [(ngModel)]="previewFooterContent.brandName" (ngModelChange)="onPreviewContentChange()" class="form-ctrl" placeholder="e.g. Acme Global" />
              </div>

              <!-- Note: Email, phone, and address are directly edited in HTML without placeholders -->
              <div class="form-group full-width" style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 10px 14px; font-size: 12px; color: #64748b;">
                <i class="fa-solid fa-circle-info text-primary me-1"></i>
                <strong>Direct HTML Philosophy:</strong> Email, phone numbers, office addresses, and narrative descriptions are typed directly into the footer HTML source (not placeholder variables), providing zero layout friction.
              </div>

              <!-- Footer Columns & Page Links -->
              <div class="form-group full-width">
                <div class="lbl-with-note">
                  <label class="form-lbl" [innerText]="'FOOTER COLUMNS & PAGE LINKS ({{#each CategoryPages}} & {{#each FooterCategories}})'"></label>
                  <button type="button" class="btn-add-subitem" (click)="addFooterCategory()">+ Add Column</button>
                </div>

                <div class="subitems-list">
                  <div class="subitem-card-row mb-3" *ngFor="let col of previewFooterContent.categories; let cIdx = index" style="flex-direction: column; align-items: stretch;">
                    <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 8px;">
                      <span class="subitem-badge">Col #{{ cIdx + 1 }}</span>
                      <input type="text" [(ngModel)]="col.name" (ngModelChange)="onPreviewContentChange()" class="form-ctrl font-mono" style="max-width: 180px;" placeholder="Category (e.g. Services)" title="Identifier matching CategoryPages 'Name'" />
                      <input type="text" [(ngModel)]="col.displayTitle" (ngModelChange)="onPreviewContentChange()" class="form-ctrl" placeholder="Column Title (e.g. Solutions)" />
                      <button type="button" class="btn-del-subitem" (click)="removeFooterCategory(cIdx)" title="Remove Column">
                        <span class="material-symbols-outlined">delete</span>
                      </button>
                    </div>

                    <!-- Inner Page Links -->
                    <div style="margin-left: 24px; padding-left: 12px; border-left: 2px solid #e2e8f0;">
                      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                        <span style="font-size: 11.5px; font-weight: 700; color: #64748b;">Page Links in this Column:</span>
                        <button type="button" class="btn-add-subitem" style="padding: 2px 8px; font-size: 11px;" (click)="addFooterCategoryPage(cIdx)">+ Add Link</button>
                      </div>
                      <div style="display: flex; flex-direction: column; gap: 6px;">
                        <div style="display: flex; gap: 8px; align-items: center;" *ngFor="let p of col.pages; let pIdx = index">
                          <input type="text" [(ngModel)]="p.title" (ngModelChange)="onPreviewContentChange()" class="form-ctrl" style="flex: 1;" placeholder="Link Title" />
                          <input type="text" [(ngModel)]="p.url" (ngModelChange)="onPreviewContentChange()" class="form-ctrl" style="flex: 1;" placeholder="/route or #anchor" />
                          <button type="button" class="btn-del-subitem" (click)="removeFooterCategoryPage(cIdx, pIdx)" title="Remove Link">
                            <span class="material-symbols-outlined">close</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Legal Pages -->
              <div class="form-group full-width">
                <div class="lbl-with-note">
                  <label class="form-lbl" [innerText]="'LEGAL COMPLIANCE PAGES ({{#each LegalPages}})'"></label>
                  <button type="button" class="btn-add-subitem" (click)="addFooterLegalPage()">+ Add Policy Link</button>
                </div>
                <div class="subitems-list">
                  <div class="subitem-card-row" *ngFor="let lp of previewFooterContent.legalPages; let lIdx = index">
                    <span class="subitem-badge">#{{ lIdx + 1 }}</span>
                    <div class="subitem-inputs">
                      <input type="text" [(ngModel)]="lp.title" (ngModelChange)="onPreviewContentChange()" class="form-ctrl subitem-title" placeholder="Policy Title" />
                      <input type="text" [(ngModel)]="lp.url" (ngModelChange)="onPreviewContentChange()" class="form-ctrl subitem-desc" placeholder="/policy-slug" />
                    </div>
                    <button type="button" class="btn-del-subitem" (click)="removeFooterLegalPage(lIdx)" title="Remove Policy">
                      <span class="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- DEFAULT SECTION CONTENT EDITOR (FOR HERO, BODY, ECOMMERCE, ETC.) -->
            <div class="custom-tpl-form-grid" *ngSwitchDefault>
              <div class="form-group">
                <label class="form-lbl" [innerText]="'MAIN TITLE ({{ Title }})'"></label>
                <input type="text" [(ngModel)]="previewContent.title" (ngModelChange)="onPreviewContentChange()" class="form-ctrl" placeholder="e.g. Empowering Modern Organizations" />
              </div>

              <div class="form-group">
                <label class="form-lbl" [innerText]="'MINI TITLE / EYEBROW ({{ MiniTitle }})'"></label>
                <input type="text" [(ngModel)]="previewContent.miniTitle" (ngModelChange)="onPreviewContentChange()" class="form-ctrl" placeholder="e.g. CORE CAPABILITIES" />
              </div>

              <div class="form-group full-width">
                <label class="form-lbl" [innerText]="'SECTION DESCRIPTION ({{ Description }})'"></label>
                <textarea [(ngModel)]="previewContent.description" (ngModelChange)="onPreviewContentChange()" class="form-ctrl" rows="3" placeholder="Overview narrative..."></textarea>
              </div>

              <div class="form-group">
                <label class="form-lbl" [innerText]="'PRIMARY IMAGE URL ({{ ImageUrl }})'"></label>
                <input type="text" [(ngModel)]="previewContent.imageUrl" (ngModelChange)="onPreviewContentChange()" class="form-ctrl" placeholder="https://..." />
              </div>

              <div class="form-group">
                <div style="display: flex; gap: 10px;">
                  <div style="flex: 1;">
                    <label class="form-lbl" [innerText]="'BUTTON TEXT ({{ ButtonText }})'"></label>
                    <input type="text" [(ngModel)]="previewContent.buttonText" (ngModelChange)="onPreviewContentChange()" class="form-ctrl" placeholder="e.g. Get Started" />
                  </div>
                  <div style="flex: 1;">
                    <label class="form-lbl" [innerText]="'BUTTON LINK ({{ ButtonLink }})'"></label>
                    <input type="text" [(ngModel)]="previewContent.buttonLink" (ngModelChange)="onPreviewContentChange()" class="form-ctrl" placeholder="# or /page" />
                  </div>
                </div>
              </div>

              <!-- Repeatable Card Loop (PageSectionLists) -->
              <div class="form-group full-width">
                <div class="lbl-with-note">
                  <label class="form-lbl">REPEATABLE CARDS / SUB-ITEMS (PageSectionLists Loop)</label>
                  <button type="button" class="btn-add-subitem" (click)="addPreviewSubItem()">+ Add Card Item</button>
                </div>

                <div class="subitems-list">
                  <div class="subitem-card-row" *ngFor="let item of previewContent.items; let i = index">
                    <span class="subitem-badge">#{{ i + 1 }}</span>
                    <div class="subitem-inputs">
                      <input type="text" [(ngModel)]="item.title" (ngModelChange)="onPreviewContentChange()" class="form-ctrl subitem-title" placeholder="Card Title" />
                      <input type="text" [(ngModel)]="item.description" (ngModelChange)="onPreviewContentChange()" class="form-ctrl subitem-desc" placeholder="Card Description" />
                    </div>
                    <button type="button" class="btn-del-subitem" (click)="removePreviewSubItem(i)" title="Remove item">
                      <span class="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Mode 2: HTML Source Code with Interactive Token Ribbon Bar -->
        <div *ngIf="previewModalTab === 'html'" class="code-view-container">
          <div class="code-view-toolbar">
            <div class="code-badge-title">
              <span class="material-symbols-outlined">code</span>
              <span>HTML Template Markup</span>
              <span *ngIf="activePreviewItem?.category" class="badge-category-tag font-mono text-uppercase">
                {{ activePreviewItem.category }}
              </span>
              <div class="editor-syntax-legend" ngNonBindable>
                <span class="syntax-chip chip-tag" title="HTML Tags (div, nav, header, a, etc.)">&lt;div&gt;</span>
                <span class="syntax-chip chip-class" title="Class Attributes & CSS Selectors">class="hero-title"</span>
                <span class="syntax-chip chip-token" title="Dynamic CMS Data Placeholders">&#123;&#123; BrandIdentity &#125;&#125;</span>
                <span class="syntax-chip chip-block" title="Template Loops & Conditional Blocks">&#123;&#123;#each ...&#125;&#125;</span>
                <span class="syntax-chip chip-content" title="Normal Content & Plain Text">Normal Content</span>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <button type="button" class="btn-save-template-code" (click)="saveTemplateHtml()" [disabled]="savingTemplateHtml" title="Save HTML modifications to this installed template">
                <span class="material-symbols-outlined" *ngIf="!savingTemplateHtml">save</span>
                <span class="spinner-border spinner-border-sm text-light" *ngIf="savingTemplateHtml"></span>
                <span>{{ savingTemplateHtml ? 'Saving...' : 'Save Template Changes' }}</span>
              </button>
              <a [routerLink]="['/content/console/templates/create']" [queryParams]="{ editCode: activePreviewItem.variantCode, category: activePreviewItem.category }" class="btn-open-studio" title="Open full studio editor">
                <span class="material-symbols-outlined">open_in_new</span>
                <span>Open Full Studio</span>
              </a>
              <button type="button" class="btn-copy-code" (click)="copyCode(activePreviewItem.htmlTemplate, 'HTML')">
                <span class="material-symbols-outlined">content_copy</span>
                <span>Copy HTML</span>
              </button>
            </div>
          </div>

          <!-- Interactive Token Ribbon Bar for Rapid Insertion -->
          <div class="modal-token-ribbon">
            <span class="ribbon-label">
              <span class="material-symbols-outlined">data_object</span>
              <span>Insert Tokens:</span>
            </span>

            <!-- Menu Category Ribbon -->
            <ng-container *ngIf="activePreviewItem?.category === 'menu'">
              <span class="token-chip-wrap">
                <button type="button" class="token-chip chip-core" (click)="insertTokenAtModalCursor('{{ BrandIdentity }}')" title="Renders uploaded logo image, or falls back to business name text">
                  <span class="material-symbols-outlined chip-icon">storefront</span>
                  <span [innerText]="'+ {{ BrandIdentity }}'"></span>
                </button>
                <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDocModal('BrandIdentity', $event)" (mouseleave)="hideTokenDocModal()" (click)="toggleTokenDocModal('BrandIdentity', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
              </span>
              <span class="token-chip-wrap">
                <button type="button" class="token-chip chip-core" (click)="insertTokenAtModalCursor('{{ BrandName }}')" [innerText]="'+ {{ BrandName }}'"></button>
                <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDocModal('BrandName', $event)" (mouseleave)="hideTokenDocModal()" (click)="toggleTokenDocModal('BrandName', $event)" title="Information"><span class="material-symbols-outlined">info</span></button>
              </span>
              <span class="token-chip-wrap">
                <button type="button" class="token-chip chip-media" (click)="insertTokenAtModalCursor('{{ LogoUrl }}')" [innerText]="'+ {{ LogoUrl }}'"></button>
                <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDocModal('LogoUrl', $event)" (mouseleave)="hideTokenDocModal()" (click)="toggleTokenDocModal('LogoUrl', $event)" title="Information"><span class="material-symbols-outlined">info</span></button>
              </span>
              <span class="token-chip-wrap">
                <button type="button" class="token-chip chip-repeater" (click)="insertMainMenuItemsLoopAtModalCursor()" title="Inserts loop for top menu pages">
                  <span class="material-symbols-outlined chip-icon">link</span>
                  <span>+ Main Menu Items Loop</span>
                </button>
                <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDocModal('MainMenuItems', $event)" (mouseleave)="hideTokenDocModal()" (click)="toggleTokenDocModal('MainMenuItems', $event)" title="Information"><span class="material-symbols-outlined">info</span></button>
              </span>
              <span class="token-chip-wrap">
                <button type="button" class="token-chip chip-repeater" (click)="insertMenuDropdownsLoopAtModalCursor()" title="Inserts dropdown navigation with nested child pages">
                  <span class="material-symbols-outlined chip-icon">account_tree</span>
                  <span>+ Dropdowns Loop (with nested Pages)</span>
                </button>
                <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDocModal('MenuDropdowns', $event)" (mouseleave)="hideTokenDocModal()" (click)="toggleTokenDocModal('MenuDropdowns', $event)" title="Information"><span class="material-symbols-outlined">info</span></button>
              </span>
              <span class="token-chip-wrap">
                <button type="button" class="token-chip chip-repeater" (click)="insertMenuCtaButtonsLoopAtModalCursor()" title="Inserts dynamic CTA buttons from IsMenuCTA pages">
                  <span class="material-symbols-outlined chip-icon">smart_button</span>
                  <span>+ Menu CTA Buttons Loop</span>
                </button>
                <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDocModal('MenuCtaButtons', $event)" (mouseleave)="hideTokenDocModal()" (click)="toggleTokenDocModal('MenuCtaButtons', $event)" title="Information"><span class="material-symbols-outlined">info</span></button>
              </span>
            </ng-container>

            <!-- Hero Category Ribbon (Slider Model) -->
            <ng-container *ngIf="activePreviewItem?.category === 'hero'">
              <span class="token-chip-wrap">
                <button type="button" class="token-chip chip-core" (click)="insertTokenAtModalCursor('{{ Title }}')" [innerText]="'+ {{ Title }}'"></button>
                <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDocModal('Title', $event)" (mouseleave)="hideTokenDocModal()" (click)="toggleTokenDocModal('Title', $event)" title="Information"><span class="material-symbols-outlined">info</span></button>
              </span>
              <span class="token-chip-wrap">
                <button type="button" class="token-chip chip-core" (click)="insertTokenAtModalCursor('{{ MiniTitle }}')" [innerText]="'+ {{ MiniTitle }}'"></button>
                <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDocModal('MiniTitle', $event)" (mouseleave)="hideTokenDocModal()" (click)="toggleTokenDocModal('MiniTitle', $event)" title="Information"><span class="material-symbols-outlined">info</span></button>
              </span>
              <span class="token-chip-wrap">
                <button type="button" class="token-chip chip-core" (click)="insertTokenAtModalCursor('{{ Text }}')" [innerText]="'+ {{ Text }}'"></button>
                <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDocModal('Text', $event)" (mouseleave)="hideTokenDocModal()" (click)="toggleTokenDocModal('Text', $event)" title="Information"><span class="material-symbols-outlined">info</span></button>
              </span>
              <span class="token-chip-wrap">
                <button type="button" class="token-chip chip-core" (click)="insertTokenAtModalCursor('{{ ButtonText }}')" [innerText]="'+ {{ ButtonText }}'"></button>
                <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDocModal('ButtonText', $event)" (mouseleave)="hideTokenDocModal()" (click)="toggleTokenDocModal('ButtonText', $event)" title="Information"><span class="material-symbols-outlined">info</span></button>
              </span>
              <span class="token-chip-wrap">
                <button type="button" class="token-chip chip-core" (click)="insertTokenAtModalCursor('{{ ButtonLink }}')" [innerText]="'+ {{ ButtonLink }}'"></button>
                <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDocModal('ButtonLink', $event)" (mouseleave)="hideTokenDocModal()" (click)="toggleTokenDocModal('ButtonLink', $event)" title="Information"><span class="material-symbols-outlined">info</span></button>
              </span>
              <span class="token-chip-wrap">
                <button type="button" class="token-chip chip-core" (click)="insertTokenAtModalCursor('{{ VideoButtonText }}')" [innerText]="'+ {{ VideoButtonText }}'"></button>
                <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDocModal('VideoButtonText', $event)" (mouseleave)="hideTokenDocModal()" (click)="toggleTokenDocModal('VideoButtonText', $event)" title="Information"><span class="material-symbols-outlined">info</span></button>
              </span>
              <span class="token-chip-wrap">
                <button type="button" class="token-chip chip-core" (click)="insertTokenAtModalCursor('{{ VideoLink }}')" [innerText]="'+ {{ VideoLink }}'"></button>
                <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDocModal('VideoLink', $event)" (mouseleave)="hideTokenDocModal()" (click)="toggleTokenDocModal('VideoLink', $event)" title="Information"><span class="material-symbols-outlined">info</span></button>
              </span>
              <span class="token-chip-wrap">
                <button type="button" class="token-chip chip-media" (click)="insertTokenAtModalCursor('{{ Url }}')" [innerText]="'+ {{ Url }}'"></button>
                <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDocModal('Url', $event)" (mouseleave)="hideTokenDocModal()" (click)="toggleTokenDocModal('Url', $event)" title="Information"><span class="material-symbols-outlined">info</span></button>
              </span>
              <span class="token-chip-wrap">
                <button type="button" class="token-chip chip-media" (click)="insertTokenAtModalCursor('{{ SecondUrl }}')" [innerText]="'+ {{ SecondUrl }}'"></button>
                <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDocModal('SecondUrl', $event)" (mouseleave)="hideTokenDocModal()" (click)="toggleTokenDocModal('SecondUrl', $event)" title="Information"><span class="material-symbols-outlined">info</span></button>
              </span>
              <span class="token-chip-wrap">
                <button type="button" class="token-chip chip-media" (click)="insertTokenAtModalCursor('{{ YoutubeVideo }}')" [innerText]="'+ {{ YoutubeVideo }}'"></button>
                <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDocModal('YoutubeVideo', $event)" (mouseleave)="hideTokenDocModal()" (click)="toggleTokenDocModal('YoutubeVideo', $event)" title="Information"><span class="material-symbols-outlined">info</span></button>
              </span>
              <span class="token-chip-wrap">
                <button type="button" class="token-chip chip-repeater" (click)="insertHeroDualCtaSnippetAtModalCursor()" title="Inserts dual action button pair">
                  <span class="material-symbols-outlined chip-icon">smart_button</span>
                  <span>+ Dual Action Buttons</span>
                </button>
                <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDocModal('VideoButtonText', $event)" (mouseleave)="hideTokenDocModal()" (click)="toggleTokenDocModal('VideoButtonText', $event)" title="Information"><span class="material-symbols-outlined">info</span></button>
              </span>
            </ng-container>

            <!-- Footer Category Ribbon -->
            <ng-container *ngIf="activePreviewItem?.category === 'footer'">
              <span class="token-chip-wrap">
                <button type="button" class="token-chip chip-core" (click)="insertTokenAtModalCursor('{{ BrandIdentity }}')" title="Renders uploaded logo image, or falls back to business name text">
                  <span class="material-symbols-outlined chip-icon">storefront</span>
                  <span [innerText]="'+ {{ BrandIdentity }}'"></span>
                </button>
                <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDocModal('BrandIdentity', $event)" (mouseleave)="hideTokenDocModal()" (click)="toggleTokenDocModal('BrandIdentity', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
              </span>
              <span class="token-chip-wrap">
                <button type="button" class="token-chip chip-core" (click)="insertTokenAtModalCursor('{{ BrandName }}')" [innerText]="'+ {{ BrandName }}'"></button>
                <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDocModal('BrandName', $event)" (mouseleave)="hideTokenDocModal()" (click)="toggleTokenDocModal('BrandName', $event)" title="Information"><span class="material-symbols-outlined">info</span></button>
              </span>
              <span class="token-chip-wrap">
                <button type="button" class="token-chip chip-media" (click)="insertTokenAtModalCursor('{{ LogoUrl }}')" [innerText]="'+ {{ LogoUrl }}'"></button>
                <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDocModal('LogoUrl', $event)" (mouseleave)="hideTokenDocModal()" (click)="toggleTokenDocModal('LogoUrl', $event)" title="Information"><span class="material-symbols-outlined">info</span></button>
              </span>
              <span class="token-chip-wrap">
                <button type="button" class="token-chip chip-core" (click)="insertTokenAtModalCursor('{{ Copyright }}')" [innerText]="'+ {{ Copyright }}'"></button>
                <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDocModal('Copyright', $event)" (mouseleave)="hideTokenDocModal()" (click)="toggleTokenDocModal('Copyright', $event)" title="Information"><span class="material-symbols-outlined">info</span></button>
              </span>
              <span class="token-chip-wrap">
                <button type="button" class="token-chip chip-repeater" (click)="insertCategoryPagesLoopSnippet()" title="Loop published pages in a named category enabled for footer">
                  <span class="material-symbols-outlined chip-icon">folder</span>
                  <span>+ Category Pages Loop</span>
                </button>
                <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDocModal('CategoryPages', $event)" (mouseleave)="hideTokenDocModal()" (click)="toggleTokenDocModal('CategoryPages', $event)" title="Information"><span class="material-symbols-outlined">info</span></button>
              </span>
              <span class="token-chip-wrap">
                <button type="button" class="token-chip chip-repeater" (click)="insertTaggedPagesLoopSnippet()" title="Loop published pages with a specific tag (ShowInFooter=true)">
                  <span class="material-symbols-outlined chip-icon">sell</span>
                  <span>+ Tagged Pages Loop</span>
                </button>
                <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDocModal('TaggedPages', $event)" (mouseleave)="hideTokenDocModal()" (click)="toggleTokenDocModal('TaggedPages', $event)" title="Information"><span class="material-symbols-outlined">info</span></button>
              </span>
              <span class="token-chip-wrap">
                <button type="button" class="token-chip chip-repeater" (click)="insertLegalPagesLoopSnippet()" title="Loop published legal compliance documents (ShowInFooter=true)">
                  <span class="material-symbols-outlined chip-icon">gavel</span>
                  <span>+ Legal Pages Loop</span>
                </button>
                <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDocModal('LegalPages', $event)" (mouseleave)="hideTokenDocModal()" (click)="toggleTokenDocModal('LegalPages', $event)" title="Information"><span class="material-symbols-outlined">info</span></button>
              </span>
              <span class="token-chip-wrap">
                <button type="button" class="token-chip chip-form" (click)="insertFooterFormSnippet()" title="Embed an active published form (e.g. newsletter subscribe)">
                  <span class="material-symbols-outlined chip-icon">dynamic_form</span>
                  <span>+ Form Embed</span>
                </button>
                <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDocModal('Form', $event)" (mouseleave)="hideTokenDocModal()" (click)="toggleTokenDocModal('Form', $event)" title="Information"><span class="material-symbols-outlined">info</span></button>
              </span>
            </ng-container>

            <!-- Other Categories Ribbon -->
            <ng-container *ngIf="activePreviewItem?.category !== 'menu' && activePreviewItem?.category !== 'hero' && activePreviewItem?.category !== 'footer'">
              <span class="token-chip-wrap">
                <button type="button" class="token-chip chip-core" (click)="insertTokenAtModalCursor('{{ Title }}')" [innerText]="'+ {{ Title }}'"></button>
                <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDocModal('Title', $event)" (mouseleave)="hideTokenDocModal()" (click)="toggleTokenDocModal('Title', $event)"><span class="material-symbols-outlined">info</span></button>
              </span>
              <span class="token-chip-wrap">
                <button type="button" class="token-chip chip-core" (click)="insertTokenAtModalCursor('{{ MiniTitle }}')" [innerText]="'+ {{ MiniTitle }}'"></button>
                <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDocModal('MiniTitle', $event)" (mouseleave)="hideTokenDocModal()" (click)="toggleTokenDocModal('MiniTitle', $event)"><span class="material-symbols-outlined">info</span></button>
              </span>
              <span class="token-chip-wrap">
                <button type="button" class="token-chip chip-core" (click)="insertTokenAtModalCursor('{{ Description }}')" [innerText]="'+ {{ Description }}'"></button>
                <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDocModal('Description', $event)" (mouseleave)="hideTokenDocModal()" (click)="toggleTokenDocModal('Description', $event)"><span class="material-symbols-outlined">info</span></button>
              </span>
              <span class="token-chip-wrap">
                <button type="button" class="token-chip chip-media" (click)="insertTokenAtModalCursor('{{ ImageUrl }}')" [innerText]="'+ {{ ImageUrl }}'"></button>
                <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDocModal('ImageUrl', $event)" (mouseleave)="hideTokenDocModal()" (click)="toggleTokenDocModal('ImageUrl', $event)"><span class="material-symbols-outlined">info</span></button>
              </span>
              <span class="token-chip-wrap">
                <button type="button" class="token-chip chip-core" (click)="insertTokenAtModalCursor('{{ ButtonText }}')" [innerText]="'+ {{ ButtonText }}'"></button>
                <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDocModal('ButtonText', $event)" (mouseleave)="hideTokenDocModal()" (click)="toggleTokenDocModal('ButtonText', $event)"><span class="material-symbols-outlined">info</span></button>
              </span>
              <span class="token-chip-wrap">
                <button type="button" class="token-chip chip-core" (click)="insertTokenAtModalCursor('{{ ButtonLink }}')" [innerText]="'+ {{ ButtonLink }}'"></button>
                <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDocModal('ButtonLink', $event)" (mouseleave)="hideTokenDocModal()" (click)="toggleTokenDocModal('ButtonLink', $event)"><span class="material-symbols-outlined">info</span></button>
              </span>
            </ng-container>
          </div>

          <!-- Real-Time Interactive Template Editor with Monaco Code Folding -->
          <div class="monaco-host-wrap">
            <div *ngIf="loadingMonaco" class="monaco-loading-overlay">
              <span class="spinner-border spinner-border-sm text-info me-2"></span>
              <span>Loading Monaco editor with code folding...</span>
            </div>
            <div #monacoHtmlContainer class="monaco-editor-canvas" [style.display]="monacoReady ? 'block' : 'none'"></div>
            <textarea
              *ngIf="!monacoReady && !loadingMonaco"
              #modalHtmlEditor
              class="modal-code-textarea"
              [(ngModel)]="activePreviewItem.htmlTemplate"
              (ngModelChange)="onModalHtmlChange()"
              spellcheck="false"
              placeholder="Edit HTML template source..."
            ></textarea>
          </div>
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
          <div class="monaco-host-wrap">
            <div #monacoCssContainer class="monaco-editor-canvas" [style.display]="monacoReady ? 'block' : 'none'"></div>
            <pre *ngIf="!monacoReady" class="code-block-pre"><code class="code-content">{{ activePreviewItem.cssStyles }}</code></pre>
          </div>
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
          <div class="monaco-host-wrap" *ngIf="activePreviewItem.jsScript">
            <div #monacoJsContainer class="monaco-editor-canvas" [style.display]="monacoReady ? 'block' : 'none'"></div>
            <pre *ngIf="!monacoReady" class="code-block-pre"><code class="code-content">{{ activePreviewItem.jsScript }}</code></pre>
          </div>
          <div class="code-empty-state" *ngIf="!activePreviewItem.jsScript">
            <span class="material-symbols-outlined empty-code-icon">data_object</span>
            <p>This template is pure HTML/CSS and does not require an external JavaScript bundle.</p>
          </div>
        </div>

        <!-- Footer -->
        <!-- Footer -->
        <div class="preview-modal-footer">
          <span class="footer-hint">
            <i class="fa-solid fa-lightbulb text-warning me-1"></i> This is a live preview rendering the exact scoped HTML and CSS bundle.
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

        <!-- Floating Token Documentation Popover -->
        <div
          class="token-doc-popover"
          *ngIf="activeTokenDoc"
          [style.top.px]="popoverTop"
          [style.left.px]="popoverLeft"
          (mouseenter)="cancelPopoverLeaveTimer()"
          (mouseleave)="hideTokenDocModal()"
          (click)="$event.stopPropagation()"
        >
          <div class="popover-header">
            <div class="popover-title-row">
              <span class="material-symbols-outlined popover-icon">info</span>
              <span class="popover-token-code" [innerText]="activeTokenDoc.token"></span>
            </div>
            <button type="button" class="popover-close-btn" (click)="closeTokenDoc()">✕</button>
          </div>
          <div class="popover-body">
            <div class="popover-field">
              <label class="popover-label">Purpose</label>
              <p class="popover-value">{{ activeTokenDoc.description }}</p>
            </div>
            <div class="popover-field">
              <label class="popover-label">Managed In CMS</label>
              <p class="popover-value font-mono-subtle">{{ activeTokenDoc.cmsPath }}</p>
            </div>
            <div class="popover-field" *ngIf="activeTokenDoc.example">
              <label class="popover-label">Syntax Example</label>
              <pre class="popover-code"><code>{{ activeTokenDoc.example }}</code></pre>
            </div>
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
              <h3 class="full-demo-title">Simulated Multi-Page Live Theme Demo</h3>
              <span class="full-demo-subtitle">
                Assemble and test your website's home and inner pages interactively.
              </span>
            </div>
          </div>

          <div class="full-demo-header-actions" style="display: flex; align-items: center; gap: 14px;">
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

            <button type="button" class="btn-close-modal" (click)="closeFullSiteDemoModal()" title="Close Live Demo">✕</button>
          </div>
        </div>

        <!-- Rendered Full Page Canvas -->
        <div class="full-demo-body" [class.viewport-mobile]="fullDemoViewport === 'mobile'" [class.viewport-tablet]="fullDemoViewport === 'tablet'">
          <div class="full-demo-canvas-wrapper">
            <iframe class="full-demo-iframe" [srcdoc]="safeFullDemoSrcDoc" title="Full-Site Demo Canvas"></iframe>
          </div>
        </div>

        <!-- Footer -->
        <div class="full-demo-footer">
          <span class="demo-count-info">
            <i class="fa-solid fa-layer-group text-primary me-1"></i> Simulated website composed of {{ getFullDemoBlockCount() }} modular installed blocks.
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
              <ng-container *ngFor="let p of availablePages">
                <option *ngIf="(p.directUrl || p.slug) !== 'home'" [value]="p.directUrl || p.slug || p.id">{{ p.title }} ( /{{ p.directUrl || p.slug }} )</option>
              </ng-container>
              <option value="about" *ngIf="availablePages.length === 0">About Us ( /about )</option>
              <option value="services" *ngIf="availablePages.length === 0">Services & Solutions ( /services )</option>
              <option value="contact" *ngIf="availablePages.length === 0">Contact Us ( /contact )</option>
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

            <div class="form-group" [class.full-width]="tagForm.tagType !== 'meta_tag'">
              <label class="form-lbl">TAG CATEGORY / TYPE *</label>
              <select [(ngModel)]="tagForm.tagType" class="form-ctrl" (change)="onTagTypeChanged()">
                <!-- Header Zone Types -->
                <ng-container *ngIf="tagFormZone === 'head'">
                  <option value="meta_tag">SEO / Social Meta Tag (&lt;meta&gt;)</option>
                  <option value="link_stylesheet">External Stylesheet (&lt;link rel="stylesheet"&gt;) / Upload CSS</option>
                  <option value="inline_css">Inline Custom CSS (&lt;style&gt;)</option>
                  <option value="google_fonts">Google Fonts Link &amp; Preconnect</option>
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

            <!-- Meta & Icon Preset Dropdown (Shown when meta_tag is selected) -->
            <div class="form-group" *ngIf="tagForm.tagType === 'meta_tag'">
              <label class="form-lbl">META TAG &amp; ICON PRESET TEMPLATE (DROPDOWN)</label>
              <select [(ngModel)]="selectedMetaPreset" class="form-ctrl" (change)="onMetaPresetChanged()">
                <option value="full_suite">Comprehensive SEO, Social &amp; Icons Suite (All-In-One)</option>
                <option value="favicons_icons">Favicons, Web App Icons &amp; Manifest (.ico, .png, .svg)</option>
                <option value="open_graph">Open Graph Protocol Suite (Facebook, LinkedIn, Discord)</option>
                <option value="twitter">Twitter / X Card Suite (Large Summary Image)</option>
                <option value="seo_core">Search Engine Crawlers &amp; Canonical (Google, Bing, Robots)</option>
                <option value="mobile_pwa">Mobile PWA &amp; Theme Color (Viewport, Theme Color)</option>
                <option value="custom">Custom Meta Tag (Manual Entry)</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-lbl">SORT ORDER (EXECUTION PRIORITY)</label>
              <input type="number" [(ngModel)]="tagForm.sortOrder" class="form-ctrl" placeholder="10" />
              <small class="form-hint">Lower numbers execute first (e.g. 1 before 10).</small>
            </div>

            <div class="form-group">
              <label class="toggle-card" style="height: 100%; box-sizing: border-box;">
                <input type="checkbox" [(ngModel)]="tagForm.isActive" />
                <span class="toggle-card-txt">
                  <strong>Active / Enabled</strong>
                  <small>Inject this snippet live into the document</small>
                </span>
              </label>
            </div>

            <!-- Custom Meta Tag Builder (Shown when custom is selected) -->
            <div class="form-group full-width" *ngIf="selectedMetaPreset === 'custom' && tagForm.tagType === 'meta_tag'">
              <div class="custom-meta-builder-card">
                <div class="custom-meta-builder-header">
                  <span class="material-symbols-outlined icon-sm">tune</span>
                  <strong>Custom Meta Tag Builder (Add Mine Myself)</strong>
                </div>
                <div class="custom-meta-builder-grid">
                  <div>
                    <label class="form-lbl-xs">ATTRIBUTE TYPE</label>
                    <select [(ngModel)]="customMetaAttrType" class="form-ctrl form-ctrl-sm">
                      <option value="name">name="..."</option>
                      <option value="property">property="..."</option>
                      <option value="http-equiv">http-equiv="..."</option>
                    </select>
                  </div>
                  <div>
                    <label class="form-lbl-xs">ATTRIBUTE KEY</label>
                    <input type="text" [(ngModel)]="customMetaAttrName" class="form-ctrl form-ctrl-sm" placeholder="e.g. fb:app_id, geo.region, referrer" />
                  </div>
                  <div>
                    <label class="form-lbl-xs">CONTENT / VALUE</label>
                    <input type="text" [(ngModel)]="customMetaAttrContent" class="form-ctrl form-ctrl-sm" placeholder="e.g. 123456 or placeholder" />
                  </div>
                  <div class="btn-insert-wrap">
                    <button type="button" class="btn-add-meta-item" (click)="insertCustomMetaTag()">
                      <span class="material-symbols-outlined">add</span>
                      <span>Insert Custom Tag</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- CSS File Upload & Link Studio (Shown when stylesheet or css is selected in head) -->
            <div class="form-group full-width" *ngIf="tagFormZone === 'head' && (tagForm.tagType === 'link_stylesheet' || tagForm.tagType === 'inline_css')">
              <div class="css-upload-studio-card">
                <div class="css-upload-header">
                  <div class="css-upload-title-box">
                    <div class="css-icon-badge">
                      <span class="material-symbols-outlined">upload_file</span>
                    </div>
                    <div>
                      <strong>Upload Custom CSS File &amp; Link It</strong>
                      <small>Select a .css file from your computer to host and link via &lt;link rel="stylesheet"&gt; or embed inline.</small>
                    </div>
                  </div>
                  <input type="file" #cssFileInput accept=".css" (change)="onCssFileSelected($event)" style="display: none;" />
                  <button type="button" class="btn-choose-css" (click)="cssFileInput.click()">
                    <span class="material-symbols-outlined">folder_open</span>
                    <span>Choose .CSS File</span>
                  </button>
                </div>

                <div class="css-file-status-bar" *ngIf="selectedCssFileName">
                  <div class="css-file-info">
                    <span class="material-symbols-outlined icon-file">css</span>
                    <span class="css-filename">{{ selectedCssFileName }}</span>
                    <span class="css-filesize">({{ selectedCssFileSize }})</span>
                  </div>
                  <div class="css-action-buttons">
                    <button type="button" class="btn-action-link-css" (click)="uploadAndLinkCssFile()" [disabled]="uploadingCss">
                      <span class="material-symbols-outlined">{{ uploadingCss ? 'sync' : 'link' }}</span>
                      <span>{{ uploadingCss ? 'Uploading...' : 'Upload &amp; Link (&lt;link rel="stylesheet"&gt;)' }}</span>
                    </button>
                    <button type="button" class="btn-action-import-css" (click)="importCssAsInlineStyle()" [disabled]="uploadingCss">
                      <span class="material-symbols-outlined">code</span>
                      <span>Import as Inline CSS (&lt;style&gt;)</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Placeholder Tokens Quick Ribbon -->
          <div class="token-quick-ribbon" style="margin-top: 14px;">
            <div class="token-ribbon-heading">
              <span class="material-symbols-outlined icon-token">token</span>
              <span>Available Placeholders (Click to insert):</span>
            </div>
            <div class="token-chips-scroll">
              <button type="button" class="tag-token-chip" (click)="insertPlaceholderIntoTag('{{ Title }}')" [innerText]="'{{ Title }}'"></button>
              <button type="button" class="tag-token-chip" (click)="insertPlaceholderIntoTag('{{ Description }}')" [innerText]="'{{ Description }}'"></button>
              <button type="button" class="tag-token-chip" (click)="insertPlaceholderIntoTag('{{ Keywords }}')" [innerText]="'{{ Keywords }}'"></button>
              <button type="button" class="tag-token-chip" (click)="insertPlaceholderIntoTag('{{ CanonicalUrl }}')" [innerText]="'{{ CanonicalUrl }}'"></button>
              <button type="button" class="tag-token-chip" (click)="insertPlaceholderIntoTag('{{ ImageUrl }}')" [innerText]="'{{ ImageUrl }}'"></button>
              <button type="button" class="tag-token-chip" (click)="insertPlaceholderIntoTag('{{ FaviconUrl }}')" [innerText]="'{{ FaviconUrl }}'"></button>
              <button type="button" class="tag-token-chip" (click)="insertPlaceholderIntoTag('{{ AppleTouchIconUrl }}')" [innerText]="'{{ AppleTouchIconUrl }}'"></button>
              <button type="button" class="tag-token-chip" (click)="insertPlaceholderIntoTag('{{ BrandName }}')" [innerText]="'{{ BrandName }}'"></button>
              <button type="button" class="tag-token-chip" (click)="insertPlaceholderIntoTag('{{ Author }}')" [innerText]="'{{ Author }}'"></button>
              <button type="button" class="tag-token-chip" (click)="insertPlaceholderIntoTag('{{ ThemeColor }}')" [innerText]="'{{ ThemeColor }}'"></button>
              <button type="button" class="tag-token-chip" (click)="insertPlaceholderIntoTag('{{ DomainName }}')" [innerText]="'{{ DomainName }}'"></button>
            </div>
          </div>

          <div class="form-group" style="margin-top: 10px;">
            <div class="lbl-with-note">
              <label class="form-lbl">TAG / SCRIPT CODE CONTENT *</label>
              <span class="note-pill"><i class="fa-solid fa-bolt text-warning me-1"></i> Auto-generated sample boilerplate with placeholders. Customize as needed!</span>
            </div>
            <textarea [(ngModel)]="tagForm.content" class="form-ctrl code-editor" rows="9" placeholder="Paste your HTML, script, or link snippet here..."></textarea>
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

    <!-- ============================================== -->
    <!-- MODAL 6: MODERN UNINSTALL CONFIRMATION MODAL   -->
    <!-- ============================================== -->
    <div class="modal-backdrop" *ngIf="showUninstallModal && itemToUninstall" (click)="closeUninstallModal()">
      <div class="modal-card confirm-modal-card" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="confirm-modal-header">
          <div class="confirm-danger-badge">
            <span class="material-symbols-outlined confirm-icon">delete_forever</span>
          </div>
          <button type="button" class="btn-close-modal" (click)="closeUninstallModal()">✕</button>
        </div>

        <!-- Body -->
        <div class="confirm-modal-body">
          <h3 class="confirm-modal-title">Uninstall Template Blueprint?</h3>
          <p class="confirm-modal-subtitle">
            Are you sure you want to uninstall this template from your library?
          </p>

          <!-- Highlight Preview Card -->
          <div class="confirm-item-preview-card">
            <div class="confirm-item-icon" [style.background]="itemToUninstall.thumbnailGradient">
              <span class="material-symbols-outlined">{{ itemToUninstall.previewIcon }}</span>
            </div>
            <div class="confirm-item-info">
              <strong class="confirm-item-name">{{ itemToUninstall.name }}</strong>
              <div class="confirm-item-meta">
                <span class="confirm-category-badge">{{ getCategoryName(itemToUninstall.category) }}</span>
                <code class="confirm-variant-code">{{ itemToUninstall.variantCode }}</code>
              </div>
            </div>
          </div>

          <!-- Safe Note Alert -->
          <div class="confirm-warning-box">
            <span class="material-symbols-outlined warn-icon">shield</span>
            <span>
              <strong>Safe Removal:</strong> This removes the blueprint from your active vault. Any pages where this section has already been published or added will remain completely intact.
            </span>
          </div>
        </div>

        <!-- Footer -->
        <div class="confirm-modal-footer">
          <button type="button" class="btn btn-outline" (click)="closeUninstallModal()">
            Cancel
          </button>
          <button type="button" class="btn btn-danger-action" (click)="confirmUninstallTemplate()" [disabled]="uninstallingTemplate">
            <span class="material-symbols-outlined">delete</span>
            <span>{{ uninstallingTemplate ? 'Uninstalling...' : 'Yes, Uninstall Template' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ============================================== -->
    <!-- MODAL 7: MODERN DELETE TAG CONFIRMATION MODAL  -->
    <!-- ============================================== -->
    <div class="modal-backdrop" *ngIf="showDeleteTagModal && tagToDelete" (click)="closeDeleteTagModal()">
      <div class="modal-card confirm-modal-card" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="confirm-modal-header">
          <div class="confirm-danger-badge">
            <span class="material-symbols-outlined confirm-icon">delete_forever</span>
          </div>
          <button type="button" class="btn-close-modal" (click)="closeDeleteTagModal()">✕</button>
        </div>

        <!-- Body -->
        <div class="confirm-modal-body">
          <h3 class="confirm-modal-title">Remove Code Injection Tag?</h3>
          <p class="confirm-modal-subtitle">
            Are you sure you want to delete this script / stylesheet tag?
          </p>

          <div class="confirm-item-preview-card">
            <div class="confirm-item-icon" style="background: #0f172a; color: #38bdf8;">
              <span class="material-symbols-outlined">{{ getZoneIcon(tagToDelete.zone) }}</span>
            </div>
            <div class="confirm-item-info">
              <strong class="confirm-item-name">{{ tagToDelete.name }}</strong>
              <div class="confirm-item-meta">
                <span class="confirm-category-badge">{{ getZoneShortTitle(tagToDelete.zone) }} Zone</span>
                <span class="tag-type-badge">{{ getTagTypeLabel(tagToDelete.tagType) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="confirm-modal-footer">
          <button type="button" class="btn btn-outline" (click)="closeDeleteTagModal()">
            Cancel
          </button>
          <button type="button" class="btn btn-danger-action" (click)="confirmDeleteTag()" [disabled]="deletingTag">
            <span class="material-symbols-outlined">delete</span>
            <span>{{ deletingTag ? 'Deleting...' : 'Delete Tag' }}</span>
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
      background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
      border-radius: 14px;
      padding: 20px 24px;
      margin-bottom: 20px;
      color: #0f172a;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
      border: 1px solid #e2e8f0;
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
      color: #2563eb;
    }
    .blueprint-title {
      font-size: 15px;
      font-weight: 800;
      margin: 0;
      color: #0f172a;
      letter-spacing: -0.01em;
    }
    .blueprint-sub {
      font-size: 11.5px;
      color: #64748b;
    }
    .blueprint-stats {
      display: flex;
      align-items: center;
    }
    .blueprint-stat-pill {
      background: #eff6ff;
      color: #2563eb;
      border: 1px solid #bfdbfe;
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
      background: #ffffff;
      border: 1.5px solid #e2e8f0;
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
      border-color: #2563eb;
      background: #f8fafc;
      box-shadow: 0 2px 8px rgba(37, 99, 235, 0.08);
    }
    .pipeline-slot.slot-empty {
      border-style: dashed;
      border-color: #cbd5e1;
      background: #f8fafc;
    }
    .slot-badge {
      font-size: 8.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
    }
    .slot-icon-wrap {
      width: 24px;
      height: 24px;
      border-radius: 5px;
      background: #eff6ff;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #2563eb;
    }
    .slot-icon-wrap .material-symbols-outlined { font-size: 14px; }
    .slot-info { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
    .slot-role { font-size: 9.5px; color: #64748b; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .slot-name {
      font-size: 11px;
      font-weight: 700;
      color: #0f172a;
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
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #2563eb;
      border-radius: 4px;
      padding: 2px 6px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
    }
    .btn-slot-preview:hover { background: #2563eb; color: #ffffff; }
    .btn-slot-preview .material-symbols-outlined { font-size: 13px; }
    .btn-slot-add {
      color: #64748b;
      font-size: 10px;
      font-weight: 700;
      text-decoration: none;
      padding: 2px 5px;
      border-radius: 4px;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
    }
    .btn-slot-add:hover { color: #2563eb; background: #eff6ff; }

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
      z-index: 2;
    }
    .templates-search,
    input.templates-search.form-control {
      width: 100%;
      height: 42px;
      padding-left: 44px !important;
      padding-right: 40px !important;
      padding-top: 8px;
      padding-bottom: 8px;
      border: 1.5px solid #cbd5e1;
      border-radius: 9px;
      font-size: 13.5px;
      background: #ffffff;
      color: #0f172a;
      box-sizing: border-box;
    }
    .templates-search:focus,
    input.templates-search.form-control:focus {
      outline: none;
      border-color: #2563eb;
      background: #ffffff;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
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

    /* Theme Suite Filter Bar */
    .theme-suite-filter-bar {
      display: flex;
      align-items: center;
      gap: 10px;
      padding-bottom: 10px;
      border-bottom: 1px solid #f1f5f9;
      flex-wrap: wrap;
    }
    .suite-filter-label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .suite-icon { font-size: 16px; color: #2563eb; }
    .suite-chips { display: flex; gap: 6px; flex-wrap: wrap; }
    .suite-chip {
      background: #f8fafc;
      border: 1.5px solid #e2e8f0;
      border-radius: 20px;
      padding: 4px 12px;
      font-size: 12px;
      font-weight: 700;
      color: #475569;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      transition: all 0.15s ease;
    }
    .suite-chip:hover {
      border-color: #cbd5e1;
      color: #0f172a;
    }
    .suite-chip.active {
      background: #eff6ff;
      border-color: #2563eb;
      color: #2563eb;
      box-shadow: 0 2px 6px rgba(37, 99, 235, 0.15);
    }

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
      background: rgba(255, 255, 255, 0.88);
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 12px;
      backdrop-filter: blur(6px);
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04);
    }
    .wireframe-header-line {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-bottom: 8px;
      padding-bottom: 6px;
      border-bottom: 1px solid #f1f5f9;
    }
    .wire-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #cbd5e1;
    }
    .wire-title-pill {
      font-family: monospace;
      font-size: 10px;
      color: #2563eb;
      margin-left: auto;
      font-weight: 700;
    }
    .wireframe-body {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .wire-icon-wrap {
      width: 32px;
      height: 32px;
      background: #eff6ff;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #2563eb;
    }
    .wire-icon-wrap .material-symbols-outlined { font-size: 18px; }
    .wire-text-col { display: flex; flex-direction: column; }
    .wire-sub { font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 600; }
    .wire-h { font-size: 12px; color: #0f172a; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 220px; }

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
    .title-with-suite-badge {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .theme-suite-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
      border-radius: 12px;
      padding: 2px 8px;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.03em;
      width: fit-content;
    }
    .suite-badge-icon { font-size: 12px; }
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
    .preview-modal-card { width: 98vw; max-width: 1720px; height: 95vh; margin: auto; }
    .full-demo-modal-card { width: 98%; max-width: 1400px; height: 94vh; }
    .assign-modal-card { width: 100%; max-width: 520px; }

    /* Page Simulation Toolbar (Menu Preview) */
    .page-sim-toolbar {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 24px;
      background: #f8fafc;
      border-bottom: 1.5px solid #e2e8f0;
      flex-wrap: wrap;
      width: 100%;
      box-sizing: border-box;
      flex-shrink: 0;
    }
    .sim-brand-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11.5px;
      font-weight: 800;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .sim-pills-wrap {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }
    .sim-pill-btn {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 4px 12px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      color: #334155;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .sim-pill-btn:hover {
      background: #f1f5f9;
      border-color: #94a3b8;
    }
    .sim-pill-btn.active {
      background: #0050e5;
      border-color: #0050e5;
      color: #ffffff;
      box-shadow: 0 1px 3px rgba(0, 80, 229, 0.25);
    }

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
      max-width: 100%;
      background: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 20px 40px rgba(0,0,0,0.4);
      transition: max-width 0.3s ease;
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
    .full-demo-iframe {
      width: 100%;
      height: 75vh;
      min-height: 550px;
      border: none;
      background: #ffffff;
      display: block;
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
    .editor-syntax-legend {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-left: 12px;
      padding-left: 12px;
      border-left: 1px solid #334155;
    }
    .syntax-chip {
      font-family: 'Fira Code', Consolas, 'Courier New', monospace;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 4px;
      line-height: 1.25;
      user-select: none;
      letter-spacing: 0.02em;
    }
    .syntax-chip.chip-tag {
      background: rgba(56, 189, 248, 0.12);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.4);
    }
    .syntax-chip.chip-class {
      background: rgba(52, 211, 153, 0.12);
      color: #34d399;
      border: 1px solid rgba(52, 211, 153, 0.4);
    }
    .syntax-chip.chip-token {
      background: rgba(232, 121, 249, 0.12);
      color: #e879f9;
      border: 1px solid rgba(232, 121, 249, 0.4);
    }
    .syntax-chip.chip-block {
      background: rgba(244, 63, 94, 0.12);
      color: #f43f5e;
      border: 1px solid rgba(244, 63, 94, 0.4);
    }
    .syntax-chip.chip-content {
      background: rgba(255, 255, 255, 0.08);
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.28);
    }
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

    /* Modal Token Ribbon Bar & Real-Time Code Editor */
    .badge-category-tag {
      background: rgba(56, 189, 248, 0.15);
      border: 1px solid rgba(56, 189, 248, 0.35);
      color: #38bdf8;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      letter-spacing: 0.05em;
    }
    .modal-token-ribbon {
      background: #0b1120;
      border-bottom: 1px solid #1e293b;
      padding: 7px 16px;
      display: flex;
      align-items: center;
      gap: 6px;
      overflow-x: auto;
      white-space: nowrap;
    }
    .ribbon-label {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      color: #94a3b8;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-right: 4px;
      flex-shrink: 0;
    }
    .ribbon-label span.material-symbols-outlined { font-size: 14px; color: #38bdf8; }
    .modal-code-textarea {
      flex: 1;
      width: 100%;
      min-height: 440px;
      background: #090d16;
      color: #e2e8f0;
      font-family: 'Fira Code', 'Consolas', 'Courier New', monospace;
      font-size: 13px;
      line-height: 1.6;
      padding: 18px 20px;
      border: none;
      outline: none;
      resize: none;
      box-sizing: border-box;
    }
    .modal-code-textarea:focus {
      box-shadow: inset 0 0 0 1px rgba(56, 189, 248, 0.35);
    }
    .monaco-host-wrap {
      flex: 1;
      width: 100%;
      height: 100%;
      min-height: 460px;
      position: relative;
      background: #1e1e1e;
      display: flex;
      flex-direction: column;
    }
    .monaco-editor-canvas {
      flex: 1;
      width: 100%;
      height: 100%;
      min-height: 460px;
    }
    .monaco-loading-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: #1e1e1e;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #94a3b8;
      font-size: 13px;
      font-weight: 600;
      gap: 10px;
    }
    .btn-save-template-code {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 14px;
      border-radius: 6px;
      background: #10b981;
      border: 1px solid #059669;
      color: #ffffff;
      font-size: 11.5px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-save-template-code:hover:not(:disabled) {
      background: #059669;
    }
    .btn-save-template-code:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-open-studio {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 5px 12px;
      border-radius: 6px;
      background: rgba(99, 102, 241, 0.15);
      border: 1px solid rgba(99, 102, 241, 0.4);
      color: #818cf8;
      font-size: 11.5px;
      font-weight: 700;
      text-decoration: none;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-open-studio:hover {
      background: #6366f1;
      color: #ffffff;
    }
    .token-chip-wrap {
      display: inline-flex;
      align-items: stretch;
      margin-right: 4px;
      border-radius: 6px;
      overflow: hidden;
      flex-shrink: 0;
    }
    .token-chip {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 9px;
      font-size: 11.5px;
      font-weight: 600;
      font-family: 'Fira Code', 'Consolas', monospace;
      border: none;
      cursor: pointer;
      transition: all 0.15s ease;
      background: #1e293b;
      color: #cbd5e1;
    }
    .token-chip:hover { filter: brightness(1.2); }
    .token-chip.chip-core { background: rgba(56, 189, 248, 0.15); color: #38bdf8; }
    .token-chip.chip-media { background: rgba(168, 85, 247, 0.15); color: #c084fc; }
    .token-chip.chip-repeater { background: rgba(16, 185, 129, 0.15); color: #34d399; }
    .token-chip.chip-accent { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
    .token-info-icon-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0 6px;
      background: rgba(0, 0, 0, 0.3);
      border: none;
      color: #64748b;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .token-info-icon-btn:hover { color: #f8fafc; background: rgba(255, 255, 255, 0.15); }
    .token-info-icon-btn span { font-size: 13px; }
    .token-doc-popover {
      position: fixed;
      z-index: 10500;
      width: 360px;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 8px;
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.45);
      padding: 14px 16px;
      color: #f1f5f9;
      font-size: 12.5px;
      animation: fadeInPopover 0.15s ease-out;
    }
    .popover-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      border-bottom: 1px solid #1e293b;
      padding-bottom: 6px;
    }
    .popover-title-row {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .popover-icon { font-size: 16px; color: #38bdf8; }
    .popover-token-code { font-family: 'Fira Code', monospace; font-weight: 700; color: #38bdf8; font-size: 12px; }
    .popover-close-btn {
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      font-size: 13px;
    }
    .popover-close-btn:hover { color: #ffffff; }
    .popover-field { margin-bottom: 8px; }
    .popover-label {
      display: block;
      font-size: 10px;
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.05em;
      color: #64748b;
      margin-bottom: 2px;
    }
    .popover-value { margin: 0; color: #cbd5e1; font-size: 12px; line-height: 1.4; }
    .font-mono-subtle { font-family: monospace; color: #93c5fd; font-size: 11px; }
    .popover-code {
      margin: 4px 0 0 0;
      padding: 6px 10px;
      background: #020617;
      border-radius: 4px;
      color: #a7f3d0;
      font-family: 'Fira Code', monospace;
      font-size: 11px;
      overflow-x: auto;
    }
    @keyframes fadeInPopover {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }

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

    /* Confirmation Modal Styles */
    .confirm-modal-card {
      width: 100%;
      max-width: 480px;
      border-radius: 18px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      box-shadow: 0 25px 60px rgba(15, 23, 42, 0.25);
    }
    .confirm-modal-header {
      padding: 24px 24px 0 24px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .confirm-danger-badge {
      width: 52px;
      height: 52px;
      border-radius: 14px;
      background: #fef2f2;
      border: 1.5px solid #fee2e2;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ef4444;
      box-shadow: 0 4px 14px rgba(239, 68, 68, 0.15);
    }
    .confirm-danger-badge .confirm-icon {
      font-size: 28px;
    }
    .confirm-modal-body {
      padding: 16px 24px 20px 24px;
    }
    .confirm-modal-title {
      font-size: 19px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 6px 0;
      letter-spacing: -0.01em;
    }
    .confirm-modal-subtitle {
      font-size: 13.5px;
      color: #64748b;
      margin: 0 0 18px 0;
      line-height: 1.5;
    }
    .confirm-item-preview-card {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px;
      background: #f8fafc;
      border: 1.5px solid #e2e8f0;
      border-radius: 12px;
      margin-bottom: 16px;
    }
    .confirm-item-icon {
      width: 42px;
      height: 42px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      flex-shrink: 0;
    }
    .confirm-item-icon .material-symbols-outlined {
      font-size: 22px;
    }
    .confirm-item-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
      overflow: hidden;
    }
    .confirm-item-name {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .confirm-item-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .confirm-category-badge {
      background: #eff6ff;
      color: #0050e5;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 5px;
    }
    .confirm-variant-code {
      background: #0f172a;
      color: #38bdf8;
      font-size: 11px;
      padding: 2px 6px;
      border-radius: 5px;
      font-family: monospace;
    }
    .confirm-warning-box {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 10px;
      padding: 12px 14px;
      display: flex;
      align-items: flex-start;
      gap: 10px;
      font-size: 12px;
      color: #166534;
      line-height: 1.45;
    }
    .confirm-warning-box .warn-icon {
      font-size: 18px;
      color: #16a34a;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .confirm-modal-footer {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 10px;
      padding: 16px 24px 20px 24px;
      background: #ffffff;
      border-top: 1.5px solid #f1f5f9;
    }
    .btn-danger-action {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      color: #ffffff;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 13px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(220, 38, 38, 0.25);
      transition: all 0.15s ease;
    }
    .btn-danger-action:hover:not(:disabled) {
      background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
      transform: translateY(-1px);
      box-shadow: 0 6px 18px rgba(220, 38, 38, 0.35);
    }
    .btn-danger-action:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

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
      background: #0050e5;
      color: #ffffff;
      box-shadow: 0 4px 12px rgba(0, 80, 229, 0.25);
    }
    .tab-count-pill {
      background: rgba(255, 255, 255, 0.2);
      padding: 2px 7px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 700;
    }
    .main-tab-item:not(.active) .tab-count-pill {
      background: #e2e8f0;
      color: #475569;
    }
    .btn-add-custom-template {
      height: 42px;
      padding: 0 18px;
      border-radius: 10px;
      background: #ffffff;
      color: #0f172a;
      border: 1.5px solid #cbd5e1;
      font-weight: 700;
      font-size: 13px;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
      transition: all 0.2s ease;
    }
    .btn-add-custom-template .btn-icon {
      color: #0050e5;
      font-size: 20px;
    }
    .btn-add-custom-template:hover {
      background: #f8fafc;
      border-color: #0050e5;
      color: #0050e5;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 80, 229, 0.12);
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

    /* Custom Meta Tag Builder */
    .custom-meta-builder-card {
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      border: 1.5px dashed #93c5fd;
      border-radius: 10px;
      padding: 14px 16px;
    }
    .custom-meta-builder-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
      color: #1e40af;
      font-size: 13px;
    }
    .custom-meta-builder-header .icon-sm {
      font-size: 18px;
      color: #0050e5;
    }
    .custom-meta-builder-grid {
      display: grid;
      grid-template-columns: 140px 1fr 1fr auto;
      gap: 10px;
      align-items: flex-end;
    }
    @media (max-width: 768px) {
      .custom-meta-builder-grid {
        grid-template-columns: 1fr;
      }
    }
    .form-lbl-xs {
      display: block;
      font-size: 10px;
      font-weight: 800;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 4px;
    }
    .form-ctrl-sm {
      height: 34px !important;
      padding: 0 10px !important;
      font-size: 12px !important;
      border-radius: 6px !important;
      border: 1.5px solid #cbd5e1 !important;
      background: #ffffff !important;
    }
    .btn-insert-wrap {
      display: flex;
      align-items: flex-end;
    }
    .btn-add-meta-item {
      height: 34px;
      background: #0050e5;
      color: #ffffff;
      border: none;
      border-radius: 6px;
      padding: 0 14px;
      font-size: 12px;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s ease;
    }
    .btn-add-meta-item:hover {
      background: #003bb5;
      transform: translateY(-1px);
    }
    .btn-add-meta-item .material-symbols-outlined {
      font-size: 16px;
    }

    /* CSS File Upload Studio */
    .css-upload-studio-card {
      background: #f0fdf4;
      border: 1.5px solid #86efac;
      border-radius: 10px;
      padding: 14px 16px;
    }
    .css-upload-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 14px;
      flex-wrap: wrap;
    }
    .css-upload-title-box {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .css-icon-badge {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: #dcfce7;
      color: #16a34a;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .css-icon-badge .material-symbols-outlined {
      font-size: 20px;
    }
    .css-upload-title-box strong {
      display: block;
      font-size: 13px;
      color: #14532d;
    }
    .css-upload-title-box small {
      display: block;
      font-size: 11px;
      color: #166534;
      margin-top: 1px;
    }
    .btn-choose-css {
      height: 36px;
      background: #ffffff;
      border: 1.5px solid #16a34a;
      color: #15803d;
      border-radius: 8px;
      padding: 0 14px;
      font-size: 12px;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-choose-css:hover {
      background: #16a34a;
      color: #ffffff;
    }
    .btn-choose-css .material-symbols-outlined {
      font-size: 18px;
    }
    .css-file-status-bar {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px dashed #bbf7d0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }
    .css-file-info {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .icon-file {
      font-size: 20px;
      color: #0284c7;
    }
    .css-filename {
      font-family: 'Fira Code', monospace;
      font-size: 12.5px;
      font-weight: 700;
      color: #0f172a;
    }
    .css-filesize {
      font-size: 11px;
      color: #64748b;
    }
    .css-action-buttons {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .btn-action-link-css {
      height: 32px;
      background: #0284c7;
      color: #ffffff;
      border: none;
      border-radius: 6px;
      padding: 0 12px;
      font-size: 11.5px;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-action-link-css:hover:not(:disabled) {
      background: #0369a1;
    }
    .btn-action-link-css:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .btn-action-link-css .material-symbols-outlined {
      font-size: 16px;
    }
    .btn-action-import-css {
      height: 32px;
      background: #ffffff;
      color: #334155;
      border: 1.5px solid #cbd5e1;
      border-radius: 6px;
      padding: 0 12px;
      font-size: 11.5px;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-action-import-css:hover:not(:disabled) {
      background: #f1f5f9;
      color: #0f172a;
    }
    .btn-action-import-css:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .btn-action-import-css .material-symbols-outlined {
      font-size: 16px;
    }

    /* Token Quick Ribbon */
    .token-quick-ribbon {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 12px;
    }
    .token-ribbon-heading {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 8px;
    }
    .icon-token {
      font-size: 15px;
      color: #0050e5;
    }
    .token-chips-scroll {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .tag-token-chip {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      color: #0284c7;
      font-family: 'Fira Code', monospace;
      font-size: 11px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 5px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .tag-token-chip:hover {
      background: #0050e5;
      color: #ffffff;
      border-color: #0050e5;
      transform: translateY(-1px);
    }

    /* Interactive Sample Content Live Editor */
    .content-editor-container {
      background: #ffffff;
      padding: 24px;
      max-height: calc(85vh - 140px);
      overflow-y: auto;
    }
    .content-editor-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 16px;
      margin-bottom: 20px;
      border-bottom: 1.5px solid #e2e8f0;
      flex-wrap: wrap;
      gap: 12px;
    }
    .content-editor-title-wrap {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .editor-head-icon {
      font-size: 28px;
      color: #0050e5;
    }
    .editor-head-title {
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
    }
    .editor-head-sub {
      font-size: 12px;
      color: #64748b;
      margin: 2px 0 0 0;
    }
    .content-editor-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .btn-reset-content {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      background: #f1f5f9;
      color: #475569;
      border: 1.5px solid #cbd5e1;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-reset-content:hover {
      background: #e2e8f0;
      color: #0f172a;
    }
    .btn-add-subitem {
      background: #eef2ff;
      color: #4f46e5;
      border: 1px solid #c7d2fe;
      border-radius: 6px;
      padding: 4px 10px;
      font-size: 11.5px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-add-subitem:hover {
      background: #4f46e5;
      color: #ffffff;
    }
    .subitems-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 8px;
    }
    .subitem-card-row {
      display: flex;
      align-items: center;
      gap: 10px;
      background: #f8fafc;
      border: 1.5px solid #e2e8f0;
      border-radius: 10px;
      padding: 10px 12px;
    }
    .subitem-badge {
      font-size: 11px;
      font-weight: 800;
      background: #0f172a;
      color: #38bdf8;
      padding: 4px 8px;
      border-radius: 6px;
      flex-shrink: 0;
      font-family: monospace;
    }
    .subitem-inputs {
      flex: 1;
      display: grid;
      grid-template-columns: 1fr 2fr;
      gap: 10px;
    }
    @media (max-width: 650px) {
      .subitem-inputs { grid-template-columns: 1fr; }
    }
    .subitem-title { font-weight: 700; }
    .btn-del-subitem {
      background: none;
      border: none;
      color: #ef4444;
      cursor: pointer;
      padding: 6px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s;
    }
    .btn-del-subitem:hover {
      background: #fee2e2;
    }
  `]
})
export class MyTemplatesComponent implements OnInit, OnDestroy {
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
    { id: 'breadcrumb', name: 'Breadcrumbs & Page Headers', icon: 'linear_scale' }
  ];

  selectedGroup: string = 'all';
  previewActivePageSlug: 'home' | 'about' | 'services' | 'request-service' | 'blog' | 'contact' = 'home';
  previewCartCount: number = 0;
  currentTenantBrandName: string = localStorage.getItem('tenant_name') || localStorage.getItem('tenant_company_name') || 'Enterprise Workspace';
  currentTenantSubdomain: string = localStorage.getItem('tenant_key') || localStorage.getItem('tenant_subdomain') || 'portal';

  // Active Main Tab
  activeMainTab: 'vault' | 'head' | 'body_open' | 'footer' = 'vault';
  headTags: CodeInjectionTag[] = [];
  bodyOpenTags: CodeInjectionTag[] = [];
  footerTags: CodeInjectionTag[] = [];
  loadingTags: boolean = false;
  loadingTemplates: boolean = false;

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

  // Comprehensive Meta & Icon Presets State
  selectedMetaPreset: string = 'full_suite';
  customMetaAttrType: 'name' | 'property' | 'http-equiv' = 'name';
  customMetaAttrName: string = '';
  customMetaAttrContent: string = '';

  // CSS File Upload State
  selectedCssFile: File | null = null;
  selectedCssFileName: string = '';
  selectedCssFileSize: string = '';
  uploadingCss: boolean = false;
  uploadedCssUrl: string = '';

  readonly metaPresets: Record<string, { name: string; icon: string; content: string }> = {
    full_suite: {
      name: 'Full SEO & Social Meta Suite (All-In-One with Placeholders)',
      icon: 'auto_awesome',
      content: `<!-- Primary SEO Meta Tags -->
<title>{{ Title }} | {{ BrandName }}</title>
<meta name="title" content="{{ Title }} | {{ BrandName }}" />
<meta name="description" content="{{ Description }}" />
<meta name="keywords" content="{{ Keywords }}" />
<meta name="author" content="{{ Author }}" />
<meta name="robots" content="index, follow" />
<link rel="canonical" href="{{ CanonicalUrl }}" />

<!-- Open Graph Protocol (Facebook, LinkedIn, Discord) -->
<meta property="og:type" content="website" />
<meta property="og:url" content="{{ CanonicalUrl }}" />
<meta property="og:title" content="{{ Title }} | {{ BrandName }}" />
<meta property="og:description" content="{{ Description }}" />
<meta property="og:image" content="{{ ImageUrl }}" />
<meta property="og:site_name" content="{{ BrandName }}" />

<!-- Twitter / X Cards -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:url" content="{{ CanonicalUrl }}" />
<meta name="twitter:title" content="{{ Title }} | {{ BrandName }}" />
<meta name="twitter:description" content="{{ Description }}" />
<meta name="twitter:image" content="{{ ImageUrl }}" />
<meta name="twitter:site" content="@{{ BrandName }}" />

<!-- Favicon & Web App Icons -->
<link rel="shortcut icon" href="{{ FaviconUrl }}" type="image/x-icon" />
<link rel="icon" type="image/x-icon" href="{{ FaviconUrl }}" />
<link rel="icon" type="image/png" sizes="32x32" href="{{ Icon32Url }}" />
<link rel="icon" type="image/png" sizes="16x16" href="{{ Icon16Url }}" />
<link rel="apple-touch-icon" sizes="180x180" href="{{ AppleTouchIconUrl }}" />
<meta name="theme-color" content="{{ ThemeColor }}" />`
    },
    favicons_icons: {
      name: 'Favicons, Web App Icons & Manifest (.ico, .png, .svg, Apple Touch)',
      icon: 'star',
      content: `<!-- Standard Web Favicons -->
<link rel="shortcut icon" href="{{ FaviconUrl }}" type="image/x-icon" />
<link rel="icon" type="image/x-icon" href="{{ FaviconUrl }}" />
<link rel="icon" type="image/png" sizes="32x32" href="{{ Icon32Url }}" />
<link rel="icon" type="image/png" sizes="16x16" href="{{ Icon16Url }}" />

<!-- Apple Touch Icon (iOS Home Screen) -->
<link rel="apple-touch-icon" sizes="180x180" href="{{ AppleTouchIconUrl }}" />

<!-- Android Chrome / PWA Web Manifest -->
<link rel="manifest" href="/site.webmanifest" />

<!-- Safari Pinned Tab Icon -->
<link rel="mask-icon" href="{{ SafariPinnedTabUrl }}" color="{{ ThemeColor }}" />
<meta name="msapplication-TileColor" content="{{ ThemeColor }}" />
<meta name="theme-color" content="{{ ThemeColor }}" />`
    },
    open_graph: {
      name: 'Open Graph Protocol (Facebook, LinkedIn, Discord)',
      icon: 'share',
      content: `<!-- Open Graph / Social Media Sharing -->
<meta property="og:type" content="website" />
<meta property="og:site_name" content="{{ BrandName }}" />
<meta property="og:url" content="{{ CanonicalUrl }}" />
<meta property="og:title" content="{{ Title }}" />
<meta property="og:description" content="{{ Description }}" />
<meta property="og:image" content="{{ ImageUrl }}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:locale" content="en_US" />`
    },
    twitter: {
      name: 'Twitter / X Card Suite (Large Summary Image)',
      icon: 'campaign',
      content: `<!-- Twitter / X Card Metadata -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:domain" content="{{ DomainName }}" />
<meta name="twitter:url" content="{{ CanonicalUrl }}" />
<meta name="twitter:title" content="{{ Title }}" />
<meta name="twitter:description" content="{{ Description }}" />
<meta name="twitter:image" content="{{ ImageUrl }}" />
<meta name="twitter:site" content="@{{ BrandName }}" />
<meta name="twitter:creator" content="@{{ Author }}" />`
    },
    seo_core: {
      name: 'Core SEO & Search Bots (Keywords, Description, Robots, Canonical)',
      icon: 'search',
      content: `<!-- Core Search Engine Optimization -->
<title>{{ Title }} | {{ BrandName }}</title>
<meta name="description" content="{{ Description }}" />
<meta name="keywords" content="{{ Keywords }}" />
<meta name="author" content="{{ Author }}" />
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
<meta name="googlebot" content="index, follow" />
<link rel="canonical" href="{{ CanonicalUrl }}" />`
    },
    mobile_pwa: {
      name: 'Mobile PWA & Browser Theme (Viewport, Theme Color, Web App)',
      icon: 'smartphone',
      content: `<!-- Mobile & PWA Device Configuration -->
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover" />
<meta name="theme-color" content="{{ ThemeColor }}" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="{{ BrandName }}" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="format-detection" content="telephone=no" />`
    },
    custom: {
      name: 'Custom Meta Tag (Add Mine Myself)',
      icon: 'tune',
      content: `<!-- Custom Meta Tags -->
<meta name="custom-name" content="{{ CustomValue }}" />`
    }
  };

  private readonly tagBoilerplates: Record<string, string> = {
    // Head zone
    link_stylesheet: '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />',
    inline_css: '<style>\n  /* Custom CSS Overrides */\n  :root {\n    --theme-accent: #0050e5;\n  }\n</style>',
    google_fonts: '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">',
    meta_tag: `<!-- Primary SEO Meta Tags -->
<title>{{ Title }} | {{ BrandName }}</title>
<meta name="title" content="{{ Title }} | {{ BrandName }}" />
<meta name="description" content="{{ Description }}" />
<meta name="keywords" content="{{ Keywords }}" />
<meta name="author" content="{{ Author }}" />
<meta name="robots" content="index, follow" />
<link rel="canonical" href="{{ CanonicalUrl }}" />

<!-- Open Graph Protocol (Facebook, LinkedIn, Discord) -->
<meta property="og:type" content="website" />
<meta property="og:url" content="{{ CanonicalUrl }}" />
<meta property="og:title" content="{{ Title }} | {{ BrandName }}" />
<meta property="og:description" content="{{ Description }}" />
<meta property="og:image" content="{{ ImageUrl }}" />
<meta property="og:site_name" content="{{ BrandName }}" />

<!-- Twitter / X Cards -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:url" content="{{ CanonicalUrl }}" />
<meta name="twitter:title" content="{{ Title }} | {{ BrandName }}" />
<meta name="twitter:description" content="{{ Description }}" />
<meta name="twitter:image" content="{{ ImageUrl }}" />
<meta name="twitter:site" content="@{{ BrandName }}" />

<!-- Favicon & Web App Icons -->
<link rel="shortcut icon" href="{{ FaviconUrl }}" type="image/x-icon" />
<link rel="icon" type="image/x-icon" href="{{ FaviconUrl }}" />
<link rel="icon" type="image/png" sizes="32x32" href="{{ Icon32Url }}" />
<link rel="icon" type="image/png" sizes="16x16" href="{{ Icon16Url }}" />
<link rel="apple-touch-icon" sizes="180x180" href="{{ AppleTouchIconUrl }}" />
<meta name="theme-color" content="{{ ThemeColor }}" />`,
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
  previewModalTab: 'preview' | 'content' | 'html' | 'css' | 'js' = 'preview';
  modalPreviewPageSlug: 'isolated' | 'home' | 'about' | 'services' | 'request-service' | 'contact' | 'blog' = 'isolated';
  safeSinglePreviewHtml: SafeHtml = '';
  safeSinglePreviewSrcDoc: SafeHtml | string = '';

  // Interactive Test / Sample Content Replacements
  previewContent = {
    title: 'Empowering Modern Organizations',
    miniTitle: 'NEXT-GENERATION PLATFORM',
    description: 'Streamline administrative workflows, automate financial governance, and deliver seamless digital experiences across sovereign systems.',
    imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
    buttonText: 'Explore Platform Solutions →',
    buttonLink: '#',
    items: [
      { title: 'Real-Time Sync', description: 'Instantaneous WebSocket state propagation across all connected devices with zero polling latency.' },
      { title: 'Granular Governance', description: 'Fine-grained permission matrices, committee chair controls, and audit verification.' },
      { title: 'Cloud Asset Vault', description: 'High-performance media streaming and document management for all organization tiers.' }
    ]
  };

  // Dedicated Footer Sample Content Replacements
  previewFooterContent: {
    brandName: string;
    description: string;
    email: string;
    phone: string;
    categories: Array<{
      name: string;
      displayTitle?: string;
      pages: Array<{ title: string; url: string }>;
    }>;
    legalPages: Array<{ title: string; url: string }>;
  } = {
    brandName: 'Organization Portal',
    description: 'Empowering enterprises and modern organizations with strategic advisory, integrated solutions, and high-performance operations.',
    email: 'contact@organization.com',
    phone: '+1 (555) 019-2834',
    categories: [
      {
        name: 'Services',
        displayTitle: 'Solutions',
        pages: [
          { title: 'Strategic Consulting', url: '/strategic-advisory' },
          { title: 'Systems Modernization', url: '/systems-modernization' },
          { title: 'Performance & Scale', url: '/performance-scale' },
          { title: 'Enterprise Advisory', url: '/enterprise-governance' }
        ]
      },
      {
        name: 'Company',
        displayTitle: 'Company',
        pages: [
          { title: 'About Us', url: '/about' },
          { title: 'Request a Service', url: '/request-service' },
          { title: 'Contact Us', url: '/contact' }
        ]
      }
    ],
    legalPages: [
      { title: 'Privacy Policy', url: '/privacy-policy' },
      { title: 'Terms & Conditions', url: '/terms-and-conditions' },
      { title: 'Cookie Policy', url: '/cookie-policy' }
    ]
  };

  // Dedicated Menu Sample Content Replacements
  previewMenuContent: {
    brandName: string;
    logoUrl: string;
    topMenuItems: Array<{ title: string; url: string }>;
    dropdowns: Array<{ title: string; pages: Array<{ title: string; url: string }> }>;
    menuCtaButtons: Array<{ title: string; url: string }>;
  } = {
    brandName: 'Acme Global',
    logoUrl: '',
    topMenuItems: [
      { title: 'Home', url: '/' },
      { title: 'About Us', url: '/about' },
      { title: 'Blog', url: '/blog' },
      { title: 'Contact', url: '/contact' }
    ],
    dropdowns: [
      {
        title: 'Services',
        pages: [
          { title: 'Commercial Cleaning', url: '/services/commercial-cleaning' },
          { title: 'Residential Cleaning', url: '/services/residential-cleaning' },
          { title: 'Deep Sanitization', url: '/services/deep-sanitization' }
        ]
      },
      {
        title: 'Company',
        pages: [
          { title: 'About Us', url: '/about' },
          { title: 'Request a Service', url: '/request-service' },
          { title: 'Contact Us', url: '/contact' }
        ]
      }
    ],
    menuCtaButtons: [
      { title: 'Sign In', url: '/login' },
      { title: 'Request a Service', url: '/request-service' }
    ]
  };

  /** Dedicated Hero Sample Content Replacements (strictly isolated from menu & footer) */
  previewHeroContent: {
    title: string;
    miniTitle: string;
    text: string;
    buttonText: string;
    buttonLink: string;
    videoButtonText: string;
    videoLink: string;
    url: string;
    secondUrl: string;
    youtubeVideo: string;
    // Backward compatibility aliases
    description?: string;
    imageUrl?: string;
    badgeText?: string;
    secondaryButtonText?: string;
    secondaryButtonLink?: string;
  } = {
    title: 'Next-Generation Infrastructure for Forward-Thinking Organizations',
    miniTitle: 'OFFICIAL PORTAL',
    text: 'Empower your institution with resilient cloud infrastructure, automated governance, secure e-voting, and real-time operational telemetry in one unified workspace.',
    buttonText: 'Explore Solutions',
    buttonLink: '/services',
    videoButtonText: '',
    videoLink: '',
    url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&auto=format&fit=crop&q=80',
    secondUrl: '',
    youtubeVideo: ''
  };

  // Interactive Modal Code Editor Reference & Saving State
  @ViewChild('modalHtmlEditor') modalHtmlEditorRef?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('monacoHtmlContainer') monacoHtmlContainer?: ElementRef<HTMLDivElement>;
  @ViewChild('monacoCssContainer') monacoCssContainer?: ElementRef<HTMLDivElement>;
  @ViewChild('monacoJsContainer') monacoJsContainer?: ElementRef<HTMLDivElement>;

  monacoInstanceHtml?: any;
  monacoInstanceCss?: any;
  monacoInstanceJs?: any;
  loadingMonaco: boolean = false;
  monacoReady: boolean = false;
  savingTemplateHtml: boolean = false;

  // Live Database Tokens (Brand, Menus, Dropdowns, CTAs, Forms, Legal)
  editorTokens: any = {
    brand: {},
    topMenuItems: [],
    menuDropdowns: [],
    menuCtaButtons: [],
    footerCategories: [],
    legalPages: [],
    forms: []
  };

  // Floating Token Documentation Popover State
  activeTokenDoc: any = null;
  popoverTop: number = 0;
  popoverLeft: number = 0;
  popoverLeaveTimer: any = null;

  tokenDocMap: Record<string, { name: string; token: string; description: string; cmsPath: string; example?: string }> = {
    BrandIdentity: {
      name: 'Brand Logo or Name',
      token: '{{ BrandIdentity }}',
      description: 'Renders uploaded brand logo image if present; automatically falls back to business name text if no logo exists.',
      cmsPath: 'Admin Console > Settings > Tenant Brand Settings > Company Logo',
      example: '<a class="navbar-brand" href="/">{{ BrandIdentity }}</a>'
    },
    BrandName: {
      name: 'Brand Name',
      token: '{{ BrandName }}',
      description: 'Tenant organization brand name.',
      cmsPath: 'Admin Console > Settings > General / Branding',
      example: '<span>{{ BrandName }}</span>'
    },
    LogoUrl: {
      name: 'Logo Image URL',
      token: '{{ LogoUrl }}',
      description: 'Direct absolute or relative URL to the uploaded company logo.',
      cmsPath: 'Admin Console > Settings > Tenant Brand Settings',
      example: '<img src="{{ LogoUrl }}" alt="Logo" />'
    },
    MainMenuItems: {
      name: 'Main Menu Items Loop',
      token: '{{#each MainMenuItems}}...{{/each}}',
      description: 'Iterates through published top-level navigation pages with {{ Title }} and {{ Url }}.',
      cmsPath: 'Admin Console > Content Console > Pages (IsPublished = true)',
      example: '{{#each MainMenuItems}}<li class="nav-item"><a class="nav-link" href="{{ Url }}">{{ Title }}</a></li>{{/each}}'
    },
    MenuDropdowns: {
      name: 'Menu Dropdowns Loop',
      token: '{{#each MenuDropdowns}}...{{/each}}',
      description: 'Iterates multi-level categories and their child pages using nested {{#each Pages}}.',
      cmsPath: 'Admin Console > Content Console > Page Categories & Pages',
      example: '{{#each MenuDropdowns}}<div class="dropdown"><button>{{ Title }}</button><ul class="dropdown-menu">{{#each Pages}}<li><a href="{{ Url }}">{{ Title }}</a></li>{{/each}}</ul></div>{{/each}}'
    },
    MenuCtaButtons: {
      name: 'Menu CTA Buttons Loop',
      token: '{{#each MenuCtaButtons}}...{{/each}}',
      description: 'Dynamic header call-to-action buttons configured on published pages with IsMenuCTA enabled.',
      cmsPath: 'Admin Console > Web Pages > Edit Page > Enable "Show as Menu CTA"',
      example: '{{#each MenuCtaButtons}}<a href="{{ Url }}" class="btn btn-primary">{{ Title }}</a>{{/each}}'
    },
    Title: {
      name: 'Headline / Title',
      token: '{{ Title }}',
      description: 'Primary headline of the slider or section.',
      cmsPath: 'Admin Console > Content Console > Sliders > Edit Slider > Headline',
      example: '<h1>{{ Title }}</h1>'
    },
    MiniTitle: {
      name: 'Mini Title / Eyebrow',
      token: '{{ MiniTitle }}',
      description: 'Sub-tag or eyebrow pill badge displayed above main headline.',
      cmsPath: 'Admin Console > Content Console > Sliders > Edit Slider > Mini Title',
      example: '<span class="badge">{{ MiniTitle }}</span>'
    },
    Text: {
      name: 'Slide Text / Summary',
      token: '{{ Text }}',
      description: 'Supportive summary narrative or descriptive text.',
      cmsPath: 'Admin Console > Content Console > Sliders > Edit Slider > Slide Text',
      example: '<p>{{ Text }}</p>'
    },
    Description: {
      name: 'Description (Alias to Text)',
      token: '{{ Description }}',
      description: 'Summary narrative or introductory body copy.',
      cmsPath: 'Admin Console > Content Console > Sliders > Edit Slider > Slide Text',
      example: '<p>{{ Description }}</p>'
    },
    ButtonText: {
      name: 'Primary Action Text',
      token: '{{ ButtonText }}',
      description: 'Label text for primary call to action.',
      cmsPath: 'Admin Console > Content Console > Sliders > Edit Slider > Button Text',
      example: '<a href="{{ ButtonLink }}" class="btn btn-primary">{{ ButtonText }}</a>'
    },
    ButtonLink: {
      name: 'Primary Action Destination',
      token: '{{ ButtonLink }}',
      description: 'Route, hash, or external URL destination.',
      cmsPath: 'Admin Console > Content Console > Sliders > Edit Slider > Button Link',
      example: '<a href="{{ ButtonLink }}">{{ ButtonText }}</a>'
    },
    VideoButtonText: {
      name: 'Video Button Text',
      token: '{{ VideoButtonText }}',
      description: 'Text label for secondary/video trigger button.',
      cmsPath: 'Admin Console > Content Console > Sliders > Edit Slider > Video Button Text',
      example: '<a href="{{ VideoLink }}" class="oz-btn-sec">{{ VideoButtonText }}</a>'
    },
    VideoLink: {
      name: 'Video Popup Link',
      token: '{{ VideoLink }}',
      description: 'Target popup video URL or destination route.',
      cmsPath: 'Admin Console > Content Console > Sliders > Edit Slider > Popup Video Link',
      example: '<a href="{{ VideoLink }}">{{ VideoButtonText }}</a>'
    },
    Url: {
      name: 'Primary Slide Image URL',
      token: '{{ Url }}',
      description: 'High-resolution primary slide background or feature graphic.',
      cmsPath: 'Admin Console > Content Console > Sliders > Edit Slider > Primary Slide Image',
      example: '<img src="{{ Url }}" alt="{{ Title }}" />'
    },
    ImageUrl: {
      name: 'Image URL (Alias to Url)',
      token: '{{ ImageUrl }}',
      description: 'Slide visual or banner background graphic.',
      cmsPath: 'Admin Console > Content Console > Sliders > Edit Slider > Primary Slide Image',
      example: '<img src="{{ ImageUrl }}" alt="{{ Title }}" />'
    },
    SecondUrl: {
      name: 'Secondary Image URL',
      token: '{{ SecondUrl }}',
      description: 'Secondary overlapping visual asset for split mockups or floating cards.',
      cmsPath: 'Admin Console > Content Console > Sliders > Edit Slider > Second Image',
      example: '<img src="{{ SecondUrl }}" />'
    },
    YoutubeVideo: {
      name: 'YouTube Video Embed Link',
      token: '{{ YoutubeVideo }}',
      description: 'YouTube embed URL for background or modal video playback.',
      cmsPath: 'Admin Console > Content Console > Sliders > Edit Slider > YouTube Video',
      example: '<iframe src="{{ YoutubeVideo }}"></iframe>'
    },
    Copyright: {
      name: 'Copyright Notice',
      token: '{{ Copyright }}',
      description: 'Auto-generated copyright statement with current year and brand name.',
      cmsPath: 'Admin Console > Settings > General / Branding',
      example: '<p>{{ Copyright }}</p>'
    },
    CategoryPages: {
      name: 'Category Pages Loop',
      token: '{{#each CategoryPages "CategoryName"}}...{{/each}}',
      description: 'Iterates through published pages assigned to a specific category where ShowInFooter is enabled.',
      cmsPath: 'Admin Console > Content Console > Pages (ShowInFooter = true)',
      example: '{{#each CategoryPages "Services"}}<li><a href="{{ Url }}">{{ Title }}</a></li>{{/each}}'
    },
    TaggedPages: {
      name: 'Tagged Pages Loop',
      token: '{{#each TaggedPages "tag-name"}}...{{/each}}',
      description: 'Iterates through published pages assigned a specific tag where ShowInFooter is enabled.',
      cmsPath: 'Admin Console > Content Console > Pages > Edit Page > Page Tags',
      example: '{{#each TaggedPages "quick-links"}}<li><a href="{{ Url }}">{{ Title }}</a></li>{{/each}}'
    },
    LegalPages: {
      name: 'Legal Pages Loop',
      token: '{{#each LegalPages}}...{{/each}}',
      description: 'Iterates through published legal compliance documents (Privacy Policy, Terms, etc.) where ShowInFooter is enabled.',
      cmsPath: 'Admin Console > Content Console > Pages > Edit Page > Is Legal Document',
      example: '{{#each LegalPages}}<li><a href="{{ Url }}">{{ Title }}</a></li>{{/each}}'
    },
    Form: {
      name: 'Embedded Form',
      token: '{{ Form "FormKey" }}',
      description: 'Embeds an active published form component by key (e.g. newsletter subscribe or contact).',
      cmsPath: 'Admin Console > Content Console > Forms',
      example: '{{ Form "Newsletter_Subscribe" }}'
    }
  };

  // Dedicated Blog Sample Content Replacements
  previewBlogContent = {
    title: 'Platform Insights & Case Studies',
    miniTitle: 'LATEST KNOWLEDGE',
    description: 'Deep dives, architectural benchmarks, and best practices curated by our systems engineering team.',
    viewAllButtonText: 'Browse All Articles →',
    viewAllButtonLink: '/blog',
    articles: [
      {
        title: 'Architecting Resilient Multi-Tenant Cloud Ecosystems',
        summary: 'Explore proven patterns for high-throughput tenant isolation, schema partitioning, and real-time synchronization.',
        coverImageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80',
        category: 'Engineering & Architecture',
        authorName: 'Alex Rivera',
        authorRole: 'Chief Architect',
        publishedDate: 'Sep 12, 2026',
        url: '/blog/architecting-resilient-multi-tenant-cloud-ecosystems'
      },
      {
        title: 'The Shift to Zero-Downtime Migration Pipelines',
        summary: 'How leading enterprise engineering teams execute petabyte-scale database cutovers without dropping a single active transaction.',
        coverImageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&auto=format&fit=crop&q=80',
        category: 'DevOps & Reliability',
        authorName: 'Sarah Chen',
        authorRole: 'Head of Infrastructure',
        publishedDate: 'Sep 08, 2026',
        url: '/blog/zero-downtime-migration-pipelines'
      },
      {
        title: 'Next-Gen Identity & Granular Role Governance',
        summary: 'Integrating decentralized identity tokens with high-compliance RBAC structures across distributed micro-services.',
        coverImageUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&auto=format&fit=crop&q=80',
        category: 'Cybersecurity',
        authorName: 'Marcus Vance',
        authorRole: 'Security Lead',
        publishedDate: 'Aug 29, 2026',
        url: '/blog/next-gen-identity-governance'
      }
    ]
  };

  // Full-Site Demo Modal
  showFullSiteDemoModal: boolean = false;
  fullDemoViewport: 'desktop' | 'tablet' | 'mobile' = 'desktop';
  safeFullDemoHtml: SafeHtml = '';
  safeFullDemoSrcDoc: SafeHtml | string = '';

  // Assign to Page Modal
  showAssignModal: boolean = false;
  selectedAssignItem: InstalledTemplateItem | null = null;
  targetPageSlug: string = 'home';
  insertPosition: 'top' | 'bottom' = 'bottom';
  availablePages: any[] = [];
  loadingPages: boolean = false;

  // Modern Confirmation Modal States
  showUninstallModal: boolean = false;
  itemToUninstall: InstalledTemplateItem | null = null;
  uninstallingTemplate: boolean = false;

  showDeleteTagModal: boolean = false;
  tagToDelete: CodeInjectionTag | null = null;
  deletingTag: boolean = false;

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
    this.cleanupLeakedStyles();
    const savedView = localStorage.getItem('oz_templates_view_mode') as 'grid' | 'table';
    if (savedView) this.viewMode = savedView;

    // Resolve active tenant business name and portal subdomain dynamically
    this.api.get<any>('SettingsApi/brand').subscribe({
      next: (res) => {
        if (res?.data) {
          const brandName = res.data.companyName || res.data.organizationDisplayName || res.data.siteTitle;
          if (brandName) {
            this.currentTenantBrandName = brandName;
            localStorage.setItem('tenant_name', brandName);
          }
        }
      },
      error: () => {}
    });

    this.loadInstalledTemplates();
    this.loadAllCodeInjections();
    this.loadAvailablePages();
    this.loadEditorTokens();
  }

  ngOnDestroy(): void {
    this.cleanupLeakedStyles();
    this.disposeMonacoEditors();
  }

  private cleanupLeakedStyles(): void {
    const s1 = document.getElementById('oz-template-single-preview-css');
    if (s1) s1.remove();
    const s2 = document.getElementById('oz-full-demo-preview-css');
    if (s2) s2.remove();
    const s3 = document.getElementById('oz-marketplace-preview-style');
    if (s3) s3.remove();
  }

  @HostListener('window:message', ['$event'])
  onIframeMessage(event: MessageEvent): void {
    if (!event.data || typeof event.data !== 'object') return;
    if (event.data.type === 'DEMO_NAV') {
      const href = (event.data.href || '').trim().toLowerCase();
      const text = (event.data.text || '').trim().toLowerCase();
      if (!href || href === '#' || href.startsWith('javascript:')) return;
      let targetSlug: 'home' | 'about' | 'services' | 'request-service' | 'blog' | 'contact' = 'home';

      if (href.includes('request') || text.includes('request')) {
        targetSlug = 'request-service';
      } else if (href.includes('about') || text.includes('about')) {
        targetSlug = 'about';
      } else if (href.includes('services') || text.includes('service') || text.includes('solution')) {
        targetSlug = 'services';
      } else if (href.includes('blog') || text.includes('blog') || text.includes('news') || text.includes('article')) {
        targetSlug = 'blog';
      } else if (href.includes('contact') || text.includes('contact')) {
        targetSlug = 'contact';
      } else if (href.includes('home') || text.includes('home')) {
        targetSlug = 'home';
      }

      if (this.showSinglePreviewModal && this.activePreviewItem?.category === 'menu') {
        this.setModalPreviewPage(targetSlug);
        this.toast.info(`Switched preview simulation to ${targetSlug.replace('-', ' ').toUpperCase()} page.`);
      } else {
        this.setPreviewPage(targetSlug);
        this.toast.info(`Navigated to ${targetSlug.replace('-', ' ').toUpperCase()} in live preview.`);
      }
    }
  }

  loadAvailablePages(): void {
    this.loadingPages = true;
    this.api.get<any>('ContentApi/pages').subscribe({
      next: (res) => {
        this.loadingPages = false;
        if (res?.data && Array.isArray(res.data)) {
          this.availablePages = res.data;
        }
      },
      error: () => {
        this.loadingPages = false;
      }
    });
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
    if (this.tagForm.tagType === 'meta_tag') {
      this.selectedMetaPreset = 'full_suite';
      this.tagForm.content = this.metaPresets['full_suite'].content;
      if (!this.tagForm.name || this.tagForm.name === 'SEO / Social Meta Tag') {
        this.tagForm.name = 'Primary SEO, Social & Favicon Meta Suite';
      }
      return;
    }

    if (this.tagBoilerplates[this.tagForm.tagType]) {
      this.tagForm.content = this.tagBoilerplates[this.tagForm.tagType];
    }
  }

  /**
   * Switches the active meta boilerplate when the user changes the meta preset dropdown.
   */
  onMetaPresetChanged(): void {
    if (this.metaPresets[this.selectedMetaPreset]) {
      this.tagForm.content = this.metaPresets[this.selectedMetaPreset].content;
      this.tagForm.name = `Meta: ${this.metaPresets[this.selectedMetaPreset].name.split('(')[0].trim()}`;
      this.toast.info(`Loaded ${this.metaPresets[this.selectedMetaPreset].name.split('(')[0].trim()} preset.`);
    }
  }

  /**
   * Inserts a custom meta tag built via the interactive "Add Mine Myself" builder.
   */
  insertCustomMetaTag(): void {
    if (!this.customMetaAttrName?.trim()) {
      this.toast.error('Please enter a meta attribute name (e.g. fb:app_id, geo.region, referrer).');
      return;
    }
    const val = this.customMetaAttrContent?.trim() || '';
    const tag = `\n<meta ${this.customMetaAttrType}="${this.customMetaAttrName.trim()}" content="${val}" />`;
    this.tagForm.content = (this.tagForm.content || '').trimEnd() + tag;
    this.toast.success(`Inserted <meta ${this.customMetaAttrType}="${this.customMetaAttrName.trim()}">`);
    this.customMetaAttrName = '';
    this.customMetaAttrContent = '';
  }

  /**
   * Inserts a dynamic placeholder token directly into the tag code textarea.
   */
  insertPlaceholderIntoTag(placeholder: string): void {
    this.tagForm.content = (this.tagForm.content || '').trimEnd() + ' ' + placeholder;
    this.toast.info(`Inserted ${placeholder}`);
  }

  /**
   * Handles local CSS file selection.
   */
  onCssFileSelected(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.css')) {
      this.toast.error('Please select a valid CSS file (.css).');
      return;
    }
    this.selectedCssFile = file;
    this.selectedCssFileName = file.name;
    this.selectedCssFileSize = (file.size / 1024).toFixed(1) + ' KB';
    this.toast.info(`Selected CSS file: ${file.name}`);
  }

  /**
   * Uploads the selected CSS file to the backend and links it via <link rel="stylesheet">.
   */
  uploadAndLinkCssFile(): void {
    if (!this.selectedCssFile) {
      this.toast.error('Please choose a .css file first.');
      return;
    }

    this.uploadingCss = true;
    const formData = new FormData();
    formData.append('file', this.selectedCssFile);

    this.api.post<any>('ContentApi/upload-css', formData).subscribe({
      next: (res) => {
        this.uploadingCss = false;
        const url = res?.data?.url;
        if (url) {
          this.uploadedCssUrl = url;
          this.tagForm.content = `<link rel="stylesheet" href="${url}" />`;
          this.tagForm.name = `Stylesheet: ${this.selectedCssFileName}`;
          this.tagForm.tagType = 'link_stylesheet';
          this.toast.success('CSS uploaded and stylesheet link generated successfully!');
        } else {
          this.toast.error('Failed to resolve uploaded CSS URL.');
        }
      },
      error: () => {
        this.uploadingCss = false;
        this.toast.warning('Remote upload failed. Automatically importing as inline <style> directly.');
        this.importCssAsInlineStyle();
      }
    });
  }

  /**
   * Reads the selected CSS file and embeds its raw contents into an inline <style> tag.
   */
  importCssAsInlineStyle(): void {
    if (!this.selectedCssFile) {
      this.toast.error('Please choose a .css file first.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const cssText = reader.result as string;
      this.tagForm.content = `<style>\n  /* Source: ${this.selectedCssFileName} */\n${cssText}\n</style>`;
      this.tagForm.name = `Custom CSS: ${this.selectedCssFileName}`;
      this.tagForm.tagType = 'inline_css';
      this.toast.success(`Imported ${this.selectedCssFileName} into inline <style>!`);
    };
    reader.onerror = () => {
      this.toast.error('Failed to read CSS file from disk.');
    };
    reader.readAsText(this.selectedCssFile);
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

  openDeleteTagModal(tag: CodeInjectionTag): void {
    this.tagToDelete = tag;
    this.showDeleteTagModal = true;
  }

  closeDeleteTagModal(): void {
    this.showDeleteTagModal = false;
    this.tagToDelete = null;
    this.deletingTag = false;
  }

  confirmDeleteTag(): void {
    if (!this.tagToDelete) return;
    const tag = this.tagToDelete;
    this.deletingTag = true;

    this.api.delete<any>(`ContentApi/code-injections/${tag.id}`).subscribe({
      next: () => {
        this.deletingTag = false;
        this.toast.success(`Tag '${tag.name}' deleted.`);
        this.closeDeleteTagModal();
        this.loadAllCodeInjections();
      },
      error: () => {
        this.deletingTag = false;
        this.toast.error('Failed to delete tag.');
        this.closeDeleteTagModal();
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

    const payload = {
      ...this.customTemplateForm,
      defaultContentJson: JSON.stringify(this.previewContent)
    };

    this.api.post<any>('ContentApi/templates/custom', payload).subscribe({
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
          installedUtc: new Date().toISOString(),
          defaultContentJson: payload.defaultContentJson
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

  /**
   * Loads installed templates dynamically from the tenant database via ContentApi.
   * Multi-tenant architecture: The database is the sole authority; no templates or content are hardcoded in the client.
   */
  loadInstalledTemplates(): void {
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

    this.loadingTemplates = true;

    // Fetch strictly from tenant database via backend API
    this.api.get<any>('ContentApi/templates/installed').subscribe({
      next: (res) => {
        this.loadingTemplates = false;
        if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
          this.installedTemplates = res.data.map((apiT: any) => this.mapApiToItem(apiT));

          // Set active layout references from database isActive flags
          res.data.forEach((apiT: any) => {
            const cat = apiT.categoryKey?.toLowerCase();
            const itemId = apiT.templateKey || apiT.variantCode || apiT.id;
            if (apiT.isActive) {
              if (cat === 'menu') { this.activeMenuId = itemId; localStorage.setItem('oz_active_menu_id', itemId); }
              if (cat === 'hero') { this.activeHeroId = itemId; localStorage.setItem('oz_active_hero_id', itemId); }
              if (cat === 'newsletter') { this.activeNewsletterId = itemId; localStorage.setItem('oz_active_newsletter_id', itemId); }
              if (cat === 'footer') { this.activeFooterId = itemId; localStorage.setItem('oz_active_footer_id', itemId); }
              if (cat === 'blog') { this.activeBlogId = itemId; localStorage.setItem('oz_active_blog_id', itemId); }
              if (cat === 'breadcrumb') { this.activeBreadcrumbId = itemId; localStorage.setItem('oz_active_breadcrumb_id', itemId); }
              if (cat === 'ecommerce') { this.activeEcommerceId = itemId; localStorage.setItem('oz_active_ecommerce_id', itemId); }
            }
          });

          this.applyFilters();
        } else {
          this.installedTemplates = [];
          this.applyFilters();
        }
      },
      error: () => {
        this.loadingTemplates = false;
        this.toast.error('Failed to load installed templates from database.');
        this.installedTemplates = [];
        this.applyFilters();
      }
    });
  }

  saveInstalledTemplates(): void {
    // Pure multi-tenant mode: Domain templates are persisted strictly in the tenant database, not in localStorage.
  }

  private mapApiToItem(apiT: any): InstalledTemplateItem {
    const cat = (apiT.categoryKey || 'body').toLowerCase();
    const meta = this.getCategoryVisualMeta(cat);

    return {
      id: apiT.templateKey || apiT.variantCode || apiT.id,
      dbId: apiT.id,
      name: apiT.name || 'Untitled Template',
      category: cat,
      variantCode: apiT.variantCode || apiT.templateKey || 'Section_Custom',
      badge: apiT.isActive ? 'Active' : meta.badge,
      tag: cat,
      groupCode: 'apex-corporate',
      groupName: 'Corporate Suite',
      description: apiT.description || `${apiT.name} component blueprint installed in tenant database.`,
      thumbnailGradient: meta.gradient,
      previewIcon: meta.icon,
      previewSubtitle: meta.subtitle,
      previewTitle: apiT.name,
      previewBody: apiT.description || 'Tenant component template block.',
      htmlTemplate: apiT.htmlTemplate || '',
      cssStyles: apiT.cssStyles || '',
      jsScript: apiT.jsScript || '',
      version: apiT.installedVersion || '1.0.0',
      installedUtc: apiT.installedUtc || new Date().toISOString(),
      isCustomized: apiT.isCustomized,
      defaultContentJson: apiT.defaultContentJson
    };
  }

  private getCategoryVisualMeta(cat: string): { icon: string; gradient: string; badge: string; subtitle: string } {
    switch (cat) {
      case 'menu':
        return { icon: 'menu', gradient: 'linear-gradient(135deg, #0050e5 0%, #1e40af 100%)', badge: 'Navbar', subtitle: 'Navigation' };
      case 'hero':
        return { icon: 'view_carousel', gradient: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)', badge: 'Hero', subtitle: 'Hero Banner' };
      case 'footer':
        return { icon: 'dock_to_bottom', gradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', badge: 'Footer', subtitle: 'Page Footer' };
      case 'newsletter':
        return { icon: 'mail', gradient: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', badge: 'Newsletter', subtitle: 'Subscription Bar' };
      case 'contact':
        return { icon: 'contact_mail', gradient: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)', badge: 'Intake', subtitle: 'Contact Form' };
      case 'blog':
        return { icon: 'newspaper', gradient: 'linear-gradient(135deg, #fef9c3 0%, #fef08a 100%)', badge: 'Articles', subtitle: 'News & Insights' };
      case 'ecommerce':
        return { icon: 'shopping_bag', gradient: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)', badge: 'Storefront', subtitle: 'Products Grid' };
      case 'breadcrumb':
        return { icon: 'linear_scale', gradient: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)', badge: 'Header', subtitle: 'Page Header' };
      default:
        return { icon: 'view_quilt', gradient: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', badge: 'Section', subtitle: 'Content Block' };
    }
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
    if (this.selectedGroup !== 'all') {
      list = list.filter(t => (t.groupCode || 'apex-commerce') === this.selectedGroup);
    }
    if (this.searchQuery && this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.variantCode.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        (t.groupName && t.groupName.toLowerCase().includes(q))
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

    // Populate initial sample content from template's unique DefaultContentJson if available
    let hydratedFromBlueprint = false;
    if (item.defaultContentJson) {
      try {
        const parsed = JSON.parse(item.defaultContentJson);
        if (parsed && typeof parsed === 'object') {
          if (parsed.title) this.previewContent.title = parsed.title;
          if (parsed.miniTitle) this.previewContent.miniTitle = parsed.miniTitle;
          if (parsed.description) this.previewContent.description = parsed.description;
          if (parsed.imageUrl) this.previewContent.imageUrl = parsed.imageUrl;
          if (parsed.buttonText) this.previewContent.buttonText = parsed.buttonText;
          if (parsed.buttonLink) this.previewContent.buttonLink = parsed.buttonLink;
          if (parsed.items && Array.isArray(parsed.items) && parsed.items.length > 0) {
            this.previewContent.items = parsed.items;
          }
          hydratedFromBlueprint = true;
        }
      } catch (e) {}
    }

    if (item.category === 'hero') {
      let defaultHeroData: any = null;
      if (item.defaultContentJson) {
        try {
          defaultHeroData = JSON.parse(item.defaultContentJson);
        } catch (e) {}
      }
      this.previewHeroContent = {
        title: defaultHeroData?.title || defaultHeroData?.Title || item.previewTitle || item.name || 'Innovating the Future of Community Empowerment',
        miniTitle: defaultHeroData?.miniTitle || defaultHeroData?.MiniTitle || defaultHeroData?.badgeText || item.previewSubtitle || 'OFFICIAL PORTAL',
        text: defaultHeroData?.text || defaultHeroData?.Text || defaultHeroData?.description || item.previewBody || item.description || 'Empower your institution with resilient cloud infrastructure, automated governance, secure e-voting, and real-time operational telemetry in one unified workspace.',
        buttonText: defaultHeroData?.buttonText || defaultHeroData?.ButtonText || 'Explore Solutions',
        buttonLink: defaultHeroData?.buttonLink || defaultHeroData?.ButtonLink || '/services',
        videoButtonText: defaultHeroData?.videoButtonText || defaultHeroData?.VideoButtonText || '',
        videoLink: defaultHeroData?.videoLink || defaultHeroData?.VideoLink || '',
        url: defaultHeroData?.url || defaultHeroData?.Url || defaultHeroData?.imageUrl || defaultHeroData?.ImageUrl || 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&auto=format&fit=crop&q=80',
        secondUrl: defaultHeroData?.secondUrl || defaultHeroData?.SecondUrl || '',
        youtubeVideo: defaultHeroData?.youtubeVideo || defaultHeroData?.YoutubeVideo || ''
      };
    }

    if (item.category === 'footer') {
      let defaultFooterData: any = null;
      if (item.defaultContentJson) {
        try {
          defaultFooterData = JSON.parse(item.defaultContentJson);
        } catch(e) {}
      }
      this.previewFooterContent = {
        brandName: defaultFooterData?.brandName || this.currentTenantBrandName || 'Organization Portal',
        description: defaultFooterData?.description || item.description || 'Empowering modern organizations with strategic solutions.',
        email: defaultFooterData?.email || 'contact@organization.com',
        phone: defaultFooterData?.phone || '+1 (555) 019-2834',
        categories: (defaultFooterData?.categories && Array.isArray(defaultFooterData.categories)) ? defaultFooterData.categories : [
          {
            name: 'Services',
            displayTitle: 'Solutions',
            pages: [
              { title: 'Strategic Consulting', url: '/strategic-advisory' },
              { title: 'Systems Modernization', url: '/systems-modernization' },
              { title: 'Performance & Scale', url: '/performance-scale' },
              { title: 'Enterprise Advisory', url: '/enterprise-governance' }
            ]
          },
          {
            name: 'Company',
            displayTitle: 'Company',
            pages: [
              { title: 'About Us', url: '/about' },
              { title: 'Request a Service', url: '/request-service' },
              { title: 'Contact Us', url: '/contact' }
            ]
          }
        ],
        legalPages: (defaultFooterData?.legalPages && Array.isArray(defaultFooterData.legalPages)) ? defaultFooterData.legalPages : [
          { title: 'Privacy Policy', url: '/privacy-policy' },
          { title: 'Terms & Conditions', url: '/terms-and-conditions' },
          { title: 'Cookie Policy', url: '/cookie-policy' }
        ]
      };
    }

    if (item.category === 'menu') {
      const brand = this.editorTokens?.brand;
      this.previewMenuContent = {
        brandName: brand?.name || this.currentTenantBrandName || 'Acme Global',
        logoUrl: brand?.logoUrl || '',
        topMenuItems: (this.editorTokens?.topMenuItems && this.editorTokens.topMenuItems.length > 0)
          ? JSON.parse(JSON.stringify(this.editorTokens.topMenuItems))
          : [
              { title: 'Home', url: '/' },
              { title: 'About Us', url: '/about' },
              { title: 'Blog', url: '/blog' },
              { title: 'Contact', url: '/contact' }
            ],
        dropdowns: (this.editorTokens?.menuDropdowns && this.editorTokens.menuDropdowns.length > 0)
          ? JSON.parse(JSON.stringify(this.editorTokens.menuDropdowns))
          : [
              {
                title: 'Services',
                pages: [
                  { title: 'Commercial Cleaning', url: '/services/commercial-cleaning' },
                  { title: 'Residential Cleaning', url: '/services/residential-cleaning' },
                  { title: 'Deep Sanitization', url: '/services/deep-sanitization' }
                ]
              },
              {
                title: 'Company',
                pages: [
                  { title: 'About Us', url: '/about' },
                  { title: 'Request a Service', url: '/request-service' },
                  { title: 'Contact Us', url: '/contact' }
                ]
              }
            ],
        menuCtaButtons: (this.editorTokens?.menuCtaButtons && this.editorTokens.menuCtaButtons.length > 0)
          ? JSON.parse(JSON.stringify(this.editorTokens.menuCtaButtons)).map((b: any) => ({ title: b.title, url: b.url }))
          : [
              { title: 'Sign In', url: '/login' },
              { title: 'Request a Service', url: '/request-service' }
            ]
      };
    }

    if (!hydratedFromBlueprint) {
      if (item.previewTitle) this.previewContent.title = item.previewTitle;
      else if (item.name) this.previewContent.title = item.name;

      if (item.previewBody) this.previewContent.description = item.previewBody;
      else if (item.description) this.previewContent.description = item.description;

      if (item.previewSubtitle) this.previewContent.miniTitle = item.previewSubtitle.toUpperCase();
    }

    this.previewModalTab = 'preview';
    this.disposeMonacoEditors();
    this.modalPreviewPageSlug = 'isolated';
    this.updateSinglePreviewHtml();
    this.showSinglePreviewModal = true;
  }

  /**
   * Sets the active page preview simulation inside the Single Preview Modal for Menu components.
   * @param slug Target page slug or 'isolated' for standalone navigation bar.
   */
  setModalPreviewPage(slug: 'isolated' | 'home' | 'about' | 'services' | 'request-service' | 'contact' | 'blog'): void {
    this.modalPreviewPageSlug = slug;
    this.updateSinglePreviewHtml();
  }

  updateSinglePreviewHtml(): void {
    if (!this.activePreviewItem) return;

    let combinedStyles = '';
    let combinedHtml = '';
    let combinedJs = '';

    if (this.activePreviewItem.category === 'menu' && this.modalPreviewPageSlug !== 'isolated') {
      const dataContext = { ...this.previewContent, ...this.previewMenuContent };
      const sim = this.composePageSimulation(this.modalPreviewPageSlug, this.activePreviewItem, dataContext);
      combinedStyles = sim.combinedStyles;
      combinedHtml = sim.combinedHtml;
      combinedJs = sim.combinedJs;
    } else {
      const dataContext = (this.activePreviewItem.category === 'footer')
        ? { ...this.previewContent, ...this.previewFooterContent }
        : (this.activePreviewItem.category === 'menu')
        ? { ...this.previewContent, ...this.previewMenuContent }
        : (this.activePreviewItem.category === 'hero')
        ? { ...this.previewContent, ...this.previewHeroContent }
        : (this.activePreviewItem.category === 'blog' || this.activePreviewItem.category === 'blog_detail')
        ? { ...this.previewContent, ...this.previewBlogContent }
        : this.previewContent;
      let hydrated = this.hydrateTemplate(this.activePreviewItem.htmlTemplate, dataContext);
      if (this.activePreviewItem.category === 'footer') {
        hydrated = this.enforceOzikolCredit(hydrated);
      }
      combinedStyles = this.activePreviewItem.cssStyles || '';
      combinedHtml = hydrated;
      combinedJs = this.activePreviewItem.jsScript || '';
    }

    const combined = `<style>${combinedStyles}</style>\n${combinedHtml}`;
    this.safeSinglePreviewHtml = this.sanitizer.bypassSecurityTrustHtml(combined);

    const singleIframeDoc = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap">
  <style>
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }
    .dropdown {
      position: relative !important;
    }
    .dropdown-menu.show {
      display: block !important;
      position: absolute !important;
      top: 100% !important;
      left: 0 !important;
      z-index: 9999 !important;
      min-width: 13rem !important;
      margin-top: 4px !important;
      opacity: 1 !important;
      visibility: visible !important;
      background-color: #ffffff !important;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1) !important;
    }
    .dropdown-item {
      cursor: pointer;
    }
    ${combinedStyles}
  </style>
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
  <script>
    document.addEventListener('click', function(e) {
      // 1. Dropdown Toggle Click Handler
      var dropdownToggle = e.target.closest('.dropdown-toggle, [data-bs-toggle="dropdown"]');
      if (dropdownToggle) {
        e.preventDefault();
        e.stopPropagation();
        var parentDropdown = dropdownToggle.closest('.dropdown');
        var menu = parentDropdown ? parentDropdown.querySelector('.dropdown-menu') : null;
        if (menu) {
          var isAlreadyOpen = menu.classList.contains('show');
          // Close any open dropdowns first
          document.querySelectorAll('.dropdown-menu.show').forEach(function(m) {
            m.classList.remove('show');
            m.removeAttribute('data-bs-popper');
          });
          document.querySelectorAll('.dropdown-toggle[aria-expanded="true"]').forEach(function(t) {
            t.setAttribute('aria-expanded', 'false');
          });
          if (!isAlreadyOpen) {
            menu.classList.add('show');
            menu.setAttribute('data-bs-popper', 'static');
            dropdownToggle.setAttribute('aria-expanded', 'true');
          }
        }
        return;
      }

      // 2. Click Outside Closes Dropdown
      if (!e.target.closest('.dropdown-menu')) {
        document.querySelectorAll('.dropdown-menu.show').forEach(function(m) {
          m.classList.remove('show');
          m.removeAttribute('data-bs-popper');
        });
        document.querySelectorAll('.dropdown-toggle[aria-expanded="true"]').forEach(function(t) {
          t.setAttribute('aria-expanded', 'false');
        });
      }

      // 3. Regular Navigation Links
      var a = e.target.closest('a');
      if (a) {
        var href = (a.getAttribute('href') || '').trim();
        if (!href || href === '#' || href.startsWith('javascript:')) {
          e.preventDefault();
          return;
        }
        e.preventDefault();
        window.parent.postMessage({ type: 'DEMO_NAV', href: href, text: a.textContent || '' }, '*');
        return;
      }

      // 4. Cart / Add Buttons
      var btn = e.target.closest('button, .btn');
      if (btn) {
        var txt = (btn.textContent || '').toLowerCase();
        if (txt.includes('cart') || txt.includes('add')) {
          e.preventDefault();
          window.parent.postMessage({ type: 'DEMO_CART' }, '*');
        }
      }
    });
  <\/script>
</head>
<body>
  ${combinedHtml}
  ${combinedJs ? `\n  <script>\n    ${combinedJs}\n  <\/script>` : ''}
</body>
</html>`;
    this.safeSinglePreviewSrcDoc = this.sanitizer.bypassSecurityTrustHtml(singleIframeDoc);
  }

  onPreviewContentChange(): void {
    this.updateSinglePreviewHtml();
  }

  addPreviewSubItem(): void {
    const nextIdx = this.previewContent.items.length + 1;
    this.previewContent.items.push({
      title: `Feature Pillar ${nextIdx}`,
      description: 'Comprehensive capability designed to streamline leadership operations.'
    });
    this.onPreviewContentChange();
    this.toast.success(`Added Card #${nextIdx} to preview list.`);
  }

  removePreviewSubItem(index: number): void {
    if (this.previewContent.items.length <= 1) {
      this.toast.warning('At least one item is recommended for loop preview.');
      return;
    }
    this.previewContent.items.splice(index, 1);
    this.onPreviewContentChange();
  }

  // Footer Category Column Actions
  addFooterCategory(): void {
    const nextIdx = this.previewFooterContent.categories.length + 1;
    this.previewFooterContent.categories.push({
      name: `Category ${nextIdx}`,
      displayTitle: `Column ${nextIdx}`,
      pages: [
        { title: `Link ${nextIdx}.1`, url: '#' }
      ]
    });
    this.onPreviewContentChange();
  }

  removeFooterCategory(index: number): void {
    if (this.previewFooterContent.categories.length <= 1) {
      this.toast.warning('Keep at least one category column for the footer preview.');
      return;
    }
    this.previewFooterContent.categories.splice(index, 1);
    this.onPreviewContentChange();
  }

  addFooterCategoryPage(catIndex: number): void {
    const cat = this.previewFooterContent.categories[catIndex];
    if (!cat) return;
    const nextIdx = cat.pages.length + 1;
    cat.pages.push({
      title: `New Link ${nextIdx}`,
      url: '#'
    });
    this.onPreviewContentChange();
  }

  removeFooterCategoryPage(catIndex: number, pageIndex: number): void {
    const cat = this.previewFooterContent.categories[catIndex];
    if (!cat) return;
    if (cat.pages.length <= 1) {
      this.toast.warning('Keep at least one link in this column.');
      return;
    }
    cat.pages.splice(pageIndex, 1);
    this.onPreviewContentChange();
  }

  addFooterLegalPage(): void {
    const nextIdx = this.previewFooterContent.legalPages.length + 1;
    this.previewFooterContent.legalPages.push({
      title: `Policy ${nextIdx}`,
      url: '#'
    });
    this.onPreviewContentChange();
  }

  removeFooterLegalPage(index: number): void {
    if (this.previewFooterContent.legalPages.length <= 1) {
      this.toast.warning('Keep at least one legal policy link.');
      return;
    }
    this.previewFooterContent.legalPages.splice(index, 1);
    this.onPreviewContentChange();
  }

  addTopMenuItem(): void {
    const nextIdx = this.previewMenuContent.topMenuItems.length + 1;
    this.previewMenuContent.topMenuItems.push({
      title: `Navigation Link ${nextIdx}`,
      url: `/page-${nextIdx}`
    });
    this.onPreviewContentChange();
  }

  removeTopMenuItem(index: number): void {
    if (this.previewMenuContent.topMenuItems.length <= 1) {
      this.toast.warning('Keep at least one navigation link.');
      return;
    }
    this.previewMenuContent.topMenuItems.splice(index, 1);
    this.onPreviewContentChange();
  }

  addMenuCtaButton(): void {
    const nextIdx = this.previewMenuContent.menuCtaButtons.length + 1;
    this.previewMenuContent.menuCtaButtons.push({
      title: `Action CTA ${nextIdx}`,
      url: `/action-${nextIdx}`
    });
    this.onPreviewContentChange();
  }

  removeMenuCtaButton(index: number): void {
    if (this.previewMenuContent.menuCtaButtons.length <= 1) {
      this.toast.warning('Keep at least one CTA button.');
      return;
    }
    this.previewMenuContent.menuCtaButtons.splice(index, 1);
    this.onPreviewContentChange();
  }

  // Menu Dropdown Menus Actions
  addMenuDropdown(): void {
    const nextIdx = (this.previewMenuContent.dropdowns?.length || 0) + 1;
    if (!this.previewMenuContent.dropdowns) this.previewMenuContent.dropdowns = [];
    this.previewMenuContent.dropdowns.push({
      title: `Dropdown Menu ${nextIdx}`,
      pages: [
        { title: `Child Link ${nextIdx}.1`, url: '#' },
        { title: `Child Link ${nextIdx}.2`, url: '#' }
      ]
    });
    this.onPreviewContentChange();
    this.toast.success(`Added Dropdown #${nextIdx}`);
  }

  removeMenuDropdown(index: number): void {
    if (this.previewMenuContent.dropdowns?.length <= 1) {
      this.toast.warning('Keep at least one dropdown menu for preview.');
      return;
    }
    this.previewMenuContent.dropdowns.splice(index, 1);
    this.onPreviewContentChange();
  }

  addMenuDropdownPage(ddIndex: number): void {
    const dd = this.previewMenuContent.dropdowns?.[ddIndex];
    if (!dd) return;
    const nextIdx = dd.pages.length + 1;
    dd.pages.push({
      title: `Sub-Link ${nextIdx}`,
      url: '#'
    });
    this.onPreviewContentChange();
  }

  removeMenuDropdownPage(ddIndex: number, pageIndex: number): void {
    const dd = this.previewMenuContent.dropdowns?.[ddIndex];
    if (!dd) return;
    if (dd.pages.length <= 1) {
      this.toast.warning('Keep at least one sub-link in this dropdown.');
      return;
    }
    dd.pages.splice(pageIndex, 1);
    this.onPreviewContentChange();
  }

  // Live Token Fetching
  loadEditorTokens(): void {
    this.api.get<any>('ContentApi/templates/editor-tokens').subscribe({
      next: (res: any) => {
        if (res?.data) {
          this.editorTokens = res.data;
          if (res.data.brand?.name) {
            this.currentTenantBrandName = res.data.brand.name;
          }
        }
      },
      error: (err) => console.warn('Could not load editor tokens:', err)
    });
  }

  /**
   * Switches the active preview modal tab, releasing orphaned Monaco Editor instances as needed
   * and initializing fresh editors when navigating to code tabs.
   * Disposing instances when switching away prevents Angular's *ngIf from leaving stale DOM bindings.
   * @param tab The selected preview modal tab.
   */
  setPreviewModalTab(tab: 'preview' | 'content' | 'html' | 'css' | 'js'): void {
    // Dispose orphaned Monaco editor instances when switching away from code tabs
    if (this.previewModalTab === 'html' && tab !== 'html') {
      if (this.monacoInstanceHtml) {
        this.monacoInstanceHtml.dispose();
        this.monacoInstanceHtml = null;
      }
    }
    if (this.previewModalTab === 'css' && tab !== 'css') {
      if (this.monacoInstanceCss) {
        this.monacoInstanceCss.dispose();
        this.monacoInstanceCss = null;
      }
    }
    if (this.previewModalTab === 'js' && tab !== 'js') {
      if (this.monacoInstanceJs) {
        this.monacoInstanceJs.dispose();
        this.monacoInstanceJs = null;
      }
    }

    this.previewModalTab = tab;
    if (tab === 'html') {
      this.initMonacoHtmlEditor();
    } else if (tab === 'css') {
      this.initMonacoCssEditor();
    } else if (tab === 'js') {
      this.initMonacoJsEditor();
    }
  }

  /**
   * Registers custom Monarch syntax tokenization rules and theme styling for Monaco Editor.
   * Deliberately differentiates:
   * 1. HTML Tags / Divs in vibrant Electric Cyan (#38bdf8, bold)
   * 2. Class attributes in Violet (#c084fc) and class values in Bright Emerald Green (#34d399, bold)
   * 3. Placeholders in Neon Fuchsia (#e879f9) and Rose loop blocks (#f43f5e)
   * 4. Normal content / plain text in Crisp White (#ffffff)
   * 5. Other attributes in Amber (#fbbf24) and Coral (#fb923c)
   * @param monaco The global monaco instance loaded via AMD.
   */
  private registerOzikolMonacoLanguageAndTheme(monaco: any): void {
    if (!monaco || (monaco as any).__ozikolThemeRegistered) return;
    (monaco as any).__ozikolThemeRegistered = true;

    try {
      // 1. Set custom Monarch tokens provider for 'html' to isolate tags, classes, placeholders, and normal content
      monaco.languages.setMonarchTokensProvider('html', {
        defaultToken: '',
        tokenPostfix: '.html',
        ignoreCase: true,
        tokenizer: {
          root: [
            // Handlebars template comments: {{!-- ... --}} or {{! ... }}
            [/\{\{!--[\s\S]*?--\}\}/, 'comment.block'],
            [/\{\{!.*?\}\}/, 'comment.doc'],
            [/<!--/, 'comment', '@comment'],

            // Handlebars template loop/conditional blocks: {{#each ...}}, {{/each}}, {{#if ...}}, {{/if}}, {{else}}
            [/\{\{\s*[#\/^][\w\s\.\-_]+\}\}/, 'custom-placeholder-block'],
            [/\{\{\s*else\s*\}\}/, 'custom-placeholder-block'],

            // Handlebars variable placeholders: {{ BrandIdentity }}, {{ Url }}, {{ Title }}
            [/\{\{\s*[\w\s\.\-_]+\}\}/, 'custom-placeholder-token'],

            // Doctype
            [/<!DOCTYPE/i, 'metatag', '@doctype'],

            // HTML Opening and Closing Tags (<div, </div, <header, </header, etc.)
            [/(<\/)([a-zA-Z][\w\-]*)/, ['custom-tag-delimiter', { token: 'custom-tag-name', next: '@tag' }]],
            [/(<)([a-zA-Z][\w\-]*)/, ['custom-tag-delimiter', { token: 'custom-tag-name', next: '@tag' }]],

            // Tag delimiter
            [/</, 'custom-tag-delimiter'],

            // Normal content / plain text between tags
            [/[^<{]+/, 'custom-content'],
            [/\{/, 'custom-content']
          ],

          doctype: [
            [/[^>]+/, 'metatag.content'],
            [/>/, 'metatag', '@pop']
          ],

          comment: [
            [/-->/, 'comment', '@pop'],
            [/[^-]+/, 'comment'],
            [/./, 'comment']
          ],

          tag: [
            // Tag self-close or close: > or />
            [/\/?>/, 'custom-tag-delimiter', '@pop'],

            // Handlebars placeholders inside tag attributes
            [/\{\{\s*[#\/^][\w\s\.\-_]+\}\}/, 'custom-placeholder-block'],
            [/\{\{\s*[\w\s\.\-_]+\}\}/, 'custom-placeholder-token'],

            // Class attributes: class="..." or class='...'
            [/(class)(\s*=\s*)(")/i, ['custom-attr-class', 'custom-tag-delimiter', { token: 'custom-class-quote', next: '@classValueDouble' }]],
            [/(class)(\s*=\s*)(')/i, ['custom-attr-class', 'custom-tag-delimiter', { token: 'custom-class-quote', next: '@classValueSingle' }]],

            // Other attribute names: id="...", href="...", data-*="..."
            [/([a-zA-Z\-:]+)(\s*=\s*)(")/, ['custom-attr-name', 'custom-tag-delimiter', { token: 'custom-attr-quote', next: '@attrValueDouble' }]],
            [/([a-zA-Z\-:]+)(\s*=\s*)(')/, ['custom-attr-name', 'custom-tag-delimiter', { token: 'custom-attr-quote', next: '@attrValueSingle' }]],

            // Boolean or standalone attributes
            [/[\w\-]+/, 'custom-attr-name'],

            // Delimiters
            [/=/, 'custom-tag-delimiter'],

            // Whitespace
            [/[ \t\r\n]+/, '']
          ],

          classValueDouble: [
            [/\{\{\s*[\w\s\.\-_]+\}\}/, 'custom-placeholder-token'],
            [/[^"{}]+/, 'custom-class-value'],
            [/"/, 'custom-class-quote', '@pop']
          ],

          classValueSingle: [
            [/\{\{\s*[\w\s\.\-_]+\}\}/, 'custom-placeholder-token'],
            [/[^'{}]+/, 'custom-class-value'],
            [/'/, 'custom-class-quote', '@pop']
          ],

          attrValueDouble: [
            [/\{\{\s*[\w\s\.\-_]+\}\}/, 'custom-placeholder-token'],
            [/[^"{}]+/, 'custom-attr-value'],
            [/"/, 'custom-attr-quote', '@pop']
          ],

          attrValueSingle: [
            [/\{\{\s*[\w\s\.\-_]+\}\}/, 'custom-placeholder-token'],
            [/[^'{}]+/, 'custom-attr-value'],
            [/'/, 'custom-attr-quote', '@pop']
          ]
        }
      });

      // 2. Define custom theme with rich color separation
      monaco.editor.defineTheme('ozikol-studio-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          // 1. Tags / Divs: Vibrant Electric Cyan Blue
          { token: 'custom-tag-name', foreground: '38bdf8', fontStyle: 'bold' },
          { token: 'tag', foreground: '38bdf8', fontStyle: 'bold' },
          { token: 'tag.html', foreground: '38bdf8', fontStyle: 'bold' },

          // 2. Classes: Violet Attribute & Vivid Emerald Class Names
          { token: 'custom-attr-class', foreground: 'c084fc', fontStyle: 'bold' },
          { token: 'custom-class-value', foreground: '34d399', fontStyle: 'bold' },
          { token: 'custom-class-quote', foreground: '6ee7b7' },

          // Other standard attributes: Amber & Coral
          { token: 'custom-attr-name', foreground: 'fbbf24' },
          { token: 'attribute.name', foreground: 'fbbf24' },
          { token: 'custom-attr-value', foreground: 'fb923c' },
          { token: 'attribute.value', foreground: 'fb923c' },
          { token: 'custom-attr-quote', foreground: 'fcd34d' },

          // 3. Placeholders: High-Contrast Neon Fuchsia & Rose Loop Blocks
          { token: 'custom-placeholder-token', foreground: 'e879f9', fontStyle: 'bold' },
          { token: 'custom-placeholder-block', foreground: 'f43f5e', fontStyle: 'bold' },

          // 4. Normal Content: Crisp Bright Pure White
          { token: 'custom-content', foreground: 'ffffff' },

          // Delimiters: Cool Slate
          { token: 'custom-tag-delimiter', foreground: '94a3b8' },
          { token: 'delimiter', foreground: '94a3b8' },
          { token: 'delimiter.html', foreground: '94a3b8' },

          // Comments: Muted Slate Italic
          { token: 'comment', foreground: '64748b', fontStyle: 'italic' },
          { token: 'comment.block', foreground: '64748b', fontStyle: 'italic' },
          { token: 'comment.doc', foreground: '64748b', fontStyle: 'italic' }
        ],
        colors: {
          'editor.background': '#090d16',
          'editor.foreground': '#ffffff',
          'editorLineNumber.foreground': '#475569',
          'editorLineNumber.activeForeground': '#38bdf8',
          'editorCursor.foreground': '#38bdf8',
          'editor.selectionBackground': '#1e293b',
          'editor.inactiveSelectionBackground': '#0f172a',
          'editorIndentGuide.background': '#1e293b',
          'editorIndentGuide.activeBackground': '#334155',
          'editorGutter.foldingControlForeground': '#38bdf8'
        }
      });

      monaco.editor.setTheme('ozikol-studio-dark');
    } catch (e) {
      console.warn('Could not customize Monaco tokens or theme:', e);
    }
  }

  /**
   * Dynamically loads the Monaco Editor AMD loader script from CDN.
   * Once loaded, configures Monaco AMD paths, registers the Ozikol studio theme, and resolves with the global monaco object.
   * @returns A promise resolving to the monaco namespace.
   */
  loadMonaco(): Promise<any> {
    if ((window as any).monaco) {
      this.registerOzikolMonacoLanguageAndTheme((window as any).monaco);
      return Promise.resolve((window as any).monaco);
    }
    return new Promise((resolve, reject) => {
      const scriptId = 'monaco-amd-loader-script';
      let script = document.getElementById(scriptId) as HTMLScriptElement;

      const onAmdLoaded = () => {
        const amdRequire = (window as any).require;
        if (!amdRequire) {
          reject(new Error('Monaco AMD loader require function not available.'));
          return;
        }
        amdRequire.config({
          paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' }
        });
        amdRequire(['vs/editor/editor.main'], () => {
          if ((window as any).monaco) {
            this.registerOzikolMonacoLanguageAndTheme((window as any).monaco);
            resolve((window as any).monaco);
          } else {
            reject(new Error('Monaco namespace failed to initialize.'));
          }
        });
      };

      if (!script) {
        script = document.createElement('script');
        script.id = scriptId;
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs/loader.min.js';
        script.onload = () => onAmdLoaded();
        script.onerror = (err) => reject(err);
        document.head.appendChild(script);
      } else {
        if ((window as any).require) {
          onAmdLoaded();
        } else {
          script.addEventListener('load', () => onAmdLoaded());
        }
      }
    });
  }

  /**
   * Initializes or updates the Monaco Editor instance for editing HTML templates with code folding.
   */
  initMonacoHtmlEditor(): void {
    if (!this.activePreviewItem) return;
    this.loadingMonaco = !this.monacoReady;

    setTimeout(() => {
      const container = this.monacoHtmlContainer?.nativeElement;
      if (!container || !container.isConnected) return;

      this.loadMonaco().then((monaco) => {
        this.loadingMonaco = false;
        this.monacoReady = true;

        if (this.monacoInstanceHtml) {
          const domNode = this.monacoInstanceHtml.getDomNode?.();
          if (!domNode || !domNode.isConnected || domNode.parentElement !== container) {
            this.monacoInstanceHtml.dispose();
            this.monacoInstanceHtml = null;
          } else {
            const currentVal = this.monacoInstanceHtml.getValue();
            const targetVal = this.activePreviewItem?.htmlTemplate || '';
            if (currentVal !== targetVal) {
              this.monacoInstanceHtml.setValue(targetVal);
            }
            this.monacoInstanceHtml.layout();
            return;
          }
        }

        this.monacoInstanceHtml = monaco.editor.create(container, {
          value: this.activePreviewItem?.htmlTemplate || '',
          language: 'html',
          theme: 'ozikol-studio-dark',
          automaticLayout: true,
          folding: true,
          foldingStrategy: 'auto',
          showFoldingControls: 'always',
          matchBrackets: 'always',
          autoClosingBrackets: 'always',
          autoClosingQuotes: 'always',
          lineNumbers: 'on',
          minimap: { enabled: true },
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          fontSize: 13,
          fontFamily: "'Fira Code', 'Cascadia Code', Consolas, 'Courier New', monospace",
          renderWhitespace: 'selection',
          tabSize: 2
        });

        this.monacoInstanceHtml.onDidChangeModelContent(() => {
          const val = this.monacoInstanceHtml.getValue();
          if (this.activePreviewItem && this.activePreviewItem.htmlTemplate !== val) {
            this.activePreviewItem.htmlTemplate = val;
            this.onModalHtmlChange();
          }
        });
      }).catch((err) => {
        console.warn('Monaco failed to load from CDN, falling back to textarea editor:', err);
        this.loadingMonaco = false;
        this.monacoReady = false;
      });
    }, 60);
  }

  /**
   * Initializes or updates the Monaco Editor instance for inspecting scoped CSS with code folding.
   */
  initMonacoCssEditor(): void {
    if (!this.activePreviewItem) return;
    setTimeout(() => {
      const container = this.monacoCssContainer?.nativeElement;
      if (!container || !container.isConnected) return;

      this.loadMonaco().then((monaco) => {
        this.monacoReady = true;
        if (this.monacoInstanceCss) {
          const domNode = this.monacoInstanceCss.getDomNode?.();
          if (!domNode || !domNode.isConnected || domNode.parentElement !== container) {
            this.monacoInstanceCss.dispose();
            this.monacoInstanceCss = null;
          } else {
            this.monacoInstanceCss.setValue(this.activePreviewItem?.cssStyles || '');
            this.monacoInstanceCss.layout();
            return;
          }
        }

        this.monacoInstanceCss = monaco.editor.create(container, {
          value: this.activePreviewItem?.cssStyles || '',
          language: 'css',
          theme: 'ozikol-studio-dark',
          readOnly: false,
          automaticLayout: true,
          folding: true,
          foldingStrategy: 'auto',
          showFoldingControls: 'always',
          lineNumbers: 'on',
          minimap: { enabled: true },
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          fontSize: 13,
          fontFamily: "'Fira Code', 'Cascadia Code', Consolas, 'Courier New', monospace",
          tabSize: 2
        });

        this.monacoInstanceCss.onDidChangeModelContent(() => {
          const val = this.monacoInstanceCss.getValue();
          if (this.activePreviewItem && this.activePreviewItem.cssStyles !== val) {
            this.activePreviewItem.cssStyles = val;
            this.updateSinglePreviewHtml();
          }
        });
      }).catch((err) => {
        console.warn('Monaco CSS editor load error:', err);
      });
    }, 60);
  }

  /**
   * Initializes or updates the Monaco Editor instance for inspecting JavaScript logic with code folding.
   */
  initMonacoJsEditor(): void {
    if (!this.activePreviewItem || !this.activePreviewItem.jsScript) return;
    setTimeout(() => {
      const container = this.monacoJsContainer?.nativeElement;
      if (!container || !container.isConnected) return;

      this.loadMonaco().then((monaco) => {
        this.monacoReady = true;
        if (this.monacoInstanceJs) {
          const domNode = this.monacoInstanceJs.getDomNode?.();
          if (!domNode || !domNode.isConnected || domNode.parentElement !== container) {
            this.monacoInstanceJs.dispose();
            this.monacoInstanceJs = null;
          } else {
            this.monacoInstanceJs.setValue(this.activePreviewItem?.jsScript || '');
            this.monacoInstanceJs.layout();
            return;
          }
        }

        this.monacoInstanceJs = monaco.editor.create(container, {
          value: this.activePreviewItem?.jsScript || '',
          language: 'javascript',
          theme: 'ozikol-studio-dark',
          readOnly: false,
          automaticLayout: true,
          folding: true,
          foldingStrategy: 'auto',
          showFoldingControls: 'always',
          lineNumbers: 'on',
          minimap: { enabled: true },
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          fontSize: 13,
          fontFamily: "'Fira Code', 'Cascadia Code', Consolas, 'Courier New', monospace",
          tabSize: 2
        });

        this.monacoInstanceJs.onDidChangeModelContent(() => {
          const val = this.monacoInstanceJs.getValue();
          if (this.activePreviewItem && this.activePreviewItem.jsScript !== val) {
            this.activePreviewItem.jsScript = val;
            this.updateSinglePreviewHtml();
          }
        });
      }).catch((err) => {
        console.warn('Monaco JS editor load error:', err);
      });
    }, 60);
  }

  /**
   * Disposes of all active Monaco editor instances to release DOM and worker memory.
   */
  disposeMonacoEditors(): void {
    if (this.monacoInstanceHtml) {
      this.monacoInstanceHtml.dispose();
      this.monacoInstanceHtml = null;
    }
    if (this.monacoInstanceCss) {
      this.monacoInstanceCss.dispose();
      this.monacoInstanceCss = null;
    }
    if (this.monacoInstanceJs) {
      this.monacoInstanceJs.dispose();
      this.monacoInstanceJs = null;
    }
  }

  // Modal Code Editor Token Ribbon Insertion
  insertTokenAtModalCursor(token: string): void {
    if (!this.activePreviewItem) return;

    if (this.monacoInstanceHtml) {
      const selection = this.monacoInstanceHtml.getSelection();
      const op = { range: selection, text: token, forceMoveMarkers: true };
      this.monacoInstanceHtml.executeEdits('token-insert', [op]);
      this.monacoInstanceHtml.focus();
      const val = this.monacoInstanceHtml.getValue();
      this.activePreviewItem.htmlTemplate = val;
      this.onModalHtmlChange();
      return;
    }

    const textarea = this.modalHtmlEditorRef?.nativeElement;
    if (!textarea) {
      this.activePreviewItem.htmlTemplate = (this.activePreviewItem.htmlTemplate || '') + token;
      this.onModalHtmlChange();
      return;
    }
    const start = textarea.selectionStart ?? this.activePreviewItem.htmlTemplate.length;
    const end = textarea.selectionEnd ?? start;
    const current = this.activePreviewItem.htmlTemplate || '';
    this.activePreviewItem.htmlTemplate = current.substring(0, start) + token + current.substring(end);
    this.onModalHtmlChange();
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + token.length, start + token.length);
    }, 0);
  }

  insertMainMenuItemsLoopAtModalCursor(): void {
    const loopSnippet = `{{#each MainMenuItems}}
<li class="nav-item">
  <a class="nav-link" href="{{ Url }}">{{ Title }}</a>
</li>
{{/each}}`;
    this.insertTokenAtModalCursor(loopSnippet);
  }

  insertMenuDropdownsLoopAtModalCursor(): void {
    const loopSnippet = `{{#each MenuDropdowns}}
<li class="nav-item dropdown">
  <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
    {{ Title }}
  </a>
  <ul class="dropdown-menu shadow-sm border-0 py-2">
    {{#each Pages}}
    <li><a class="dropdown-item py-2 px-3 fw-medium" href="{{ Url }}">{{ Title }}</a></li>
    {{/each}}
  </ul>
</li>
{{/each}}`;
    this.insertTokenAtModalCursor(loopSnippet);
  }

  insertMenuCtaButtonsLoopAtModalCursor(): void {
    const loopSnippet = `{{#each MenuCtaButtons}}
<a href="{{ Url }}" class="btn btn-primary rounded-pill px-3 py-2 fw-semibold shadow-sm">{{ Title }}</a>
{{/each}}`;
    this.insertTokenAtModalCursor(loopSnippet);
  }

  /**
   * Inserts a standardized dual call-to-action button pair (primary button + video popup button) at the active editor cursor.
   */
  insertHeroDualCtaSnippetAtModalCursor(): void {
    const ctaSnippet = `<div class="oz-hero-actions d-flex gap-3 flex-wrap align-items-center">
  <a href="{{ ButtonLink }}" class="btn btn-primary px-4 py-2 rounded-pill fw-bold shadow-sm">{{ ButtonText }}</a>
  <a href="{{ VideoLink }}" class="btn btn-outline-secondary px-4 py-2 rounded-pill fw-bold"><i class="fa-solid fa-play me-1"></i> {{ VideoButtonText }}</a>
</div>`;
    this.insertTokenAtModalCursor(ctaSnippet);
  }

  /**
   * Inserts a self-contained footer column iterating through published pages in a named category.
   * Resolves the first available category name from loaded editor tokens or preview context,
   * defaulting to "Services".
   */
  insertCategoryPagesLoopSnippet(): void {
    let catName = 'Services';
    if (this.editorTokens?.footerGroups && this.editorTokens.footerGroups.length > 0) {
      const first = this.editorTokens.footerGroups[0];
      if (first?.categoryName || first?.title) {
        catName = first.categoryName || first.title || 'Services';
      }
    } else if (this.previewFooterContent?.categories && this.previewFooterContent.categories.length > 0) {
      const first = this.previewFooterContent.categories[0];
      if (first?.name || first?.displayTitle) {
        catName = first.name || first.displayTitle || 'Services';
      }
    }

    const snippet = `<div class="oz-footer-col">
  <h4 class="oz-footer-col-title">${catName}</h4>
  <ul class="oz-footer-col-links">
    {{#each CategoryPages "${catName}"}}
    <li><a href="{{ Url }}">{{ Title }}</a></li>
    {{/each}}
  </ul>
</div>`;
    this.insertTokenAtModalCursor(snippet);
  }

  /**
   * Inserts a self-contained footer column iterating through published pages with a specific tag.
   * Resolves the first active tag from loaded editor tokens if available, defaulting to "quick-links".
   */
  insertTaggedPagesLoopSnippet(): void {
    let tagName = 'quick-links';
    if (this.editorTokens?.taggedPages && this.editorTokens.taggedPages.length > 0) {
      const first = this.editorTokens.taggedPages[0];
      if (first?.tag) {
        tagName = first.tag || 'quick-links';
      }
    }

    const displayTitle = tagName.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const snippet = `<div class="oz-footer-col">
  <h4 class="oz-footer-col-title">${displayTitle}</h4>
  <ul class="oz-footer-col-links">
    {{#each TaggedPages "${tagName}"}}
    <li><a href="{{ Url }}">{{ Title }}</a></li>
    {{/each}}
  </ul>
</div>`;
    this.insertTokenAtModalCursor(snippet);
  }

  /**
   * Inserts a standardized legal documents loop snippet for compliance links (Privacy, Terms, Cookies).
   */
  insertLegalPagesLoopSnippet(): void {
    const snippet = `<ul class="oz-footer-legal-links">
  {{#each LegalPages}}
  <li><a href="{{ Url }}">{{ Title }}</a></li>
  {{/each}}
</ul>`;
    this.insertTokenAtModalCursor(snippet);
  }

  /**
   * Inserts an embedded form component snippet for the footer (e.g. newsletter subscribe).
   */
  insertFooterFormSnippet(): void {
    const snippet = `<div class="oz-footer-newsletter">
  <h4 class="oz-footer-col-title">Stay Connected</h4>
  <p class="oz-footer-desc">Subscribe to our newsletter for the latest updates.</p>
  {{ Form "Newsletter_Subscribe" }}
</div>`;
    this.insertTokenAtModalCursor(snippet);
  }

  /**
   * Replaces a balanced Handlebars block {{#each BlockName}}...{{/each}}, properly
   * tracking depth to prevent premature truncation when nested {{#each ...}} loops exist.
   * @param template The raw HTML template string.
   * @param blockName The target block name (e.g. 'MenuDropdowns').
   * @param replacer Callback receiving the true balanced inner template string.
   * @returns The transformed HTML string.
   */
  replaceBalancedBlock(template: string, blockName: string, replacer: (inner: string) => string): string {
    if (!template) return '';
    const openPattern = new RegExp(`\\{\\{#each\\s+${blockName}\\}\\}`, 'i');
    let result = '';
    let remaining = template;

    while (true) {
      const match = remaining.match(openPattern);
      if (!match || match.index === undefined) {
        result += remaining;
        break;
      }

      const startIndex = match.index;
      result += remaining.slice(0, startIndex);
      const contentStart = startIndex + match[0].length;
      let depth = 1;
      let pos = contentStart;

      while (pos < remaining.length && depth > 0) {
        const nextOpen = remaining.indexOf('{{#each', pos);
        const nextClose = remaining.indexOf('{{/each}}', pos);

        if (nextClose === -1) {
          break; // Unclosed block
        }

        if (nextOpen !== -1 && nextOpen < nextClose) {
          depth++;
          pos = nextOpen + '{{#each'.length;
        } else {
          depth--;
          if (depth === 0) {
            const innerContent = remaining.substring(contentStart, nextClose);
            result += replacer(innerContent);
            remaining = remaining.substring(nextClose + '{{/each}}'.length);
            break;
          }
          pos = nextClose + '{{/each}}'.length;
        }
      }

      if (depth > 0) {
        // Unclosed fallback
        result += remaining.slice(startIndex, contentStart);
        remaining = remaining.substring(contentStart);
      }
    }

    return result;
  }

  showTokenDocModal(tKey: string, event: MouseEvent): void {
    this.cancelPopoverLeaveTimer();
    const doc = this.tokenDocMap[tKey];
    if (!doc) return;
    this.activeTokenDoc = doc;

    const target = event.currentTarget as HTMLElement;
    if (target && target.getBoundingClientRect) {
      const rect = target.getBoundingClientRect();
      let top = rect.bottom + 8;
      let left = rect.left;

      const popoverWidth = 360;
      if (left + popoverWidth > window.innerWidth - 20) {
        left = window.innerWidth - popoverWidth - 20;
      }
      if (left < 20) left = 20;

      this.popoverTop = top;
      this.popoverLeft = left;
    }
  }

  hideTokenDocModal(): void {
    this.cancelPopoverLeaveTimer();
    this.popoverLeaveTimer = setTimeout(() => {
      this.closeTokenDoc();
    }, 280);
  }

  toggleTokenDocModal(tKey: string, event: MouseEvent): void {
    event.stopPropagation();
    if (this.activeTokenDoc && this.activeTokenDoc.token.includes(tKey)) {
      this.closeTokenDoc();
    } else {
      this.showTokenDocModal(tKey, event);
    }
  }

  closeTokenDoc(): void {
    this.activeTokenDoc = null;
    this.cancelPopoverLeaveTimer();
  }

  cancelPopoverLeaveTimer(): void {
    if (this.popoverLeaveTimer) {
      clearTimeout(this.popoverLeaveTimer);
      this.popoverLeaveTimer = null;
    }
  }

  onModalHtmlChange(): void {
    this.updateSinglePreviewHtml();
  }

  saveTemplateHtml(): void {
    if (!this.activePreviewItem) return;
    this.savingTemplateHtml = true;

    const payload = {
      name: this.activePreviewItem.name,
      categoryKey: this.activePreviewItem.category,
      variantCode: this.activePreviewItem.variantCode,
      templateKey: this.activePreviewItem.id || this.activePreviewItem.variantCode,
      htmlTemplate: this.activePreviewItem.htmlTemplate,
      cssStyles: this.activePreviewItem.cssStyles,
      jsScript: this.activePreviewItem.jsScript,
      defaultContentJson: this.activePreviewItem.defaultContentJson,
      installedVersion: this.activePreviewItem.version || '1.0.0'
    };

    this.api.post<any>('ContentApi/templates/custom', payload).subscribe({
      next: (_res: any) => {
        this.savingTemplateHtml = false;
        this.activePreviewItem!.isCustomized = true;
        this.toast.success(`Template '${this.activePreviewItem!.name}' changes saved successfully!`);
        this.updateSinglePreviewHtml();
      },
      error: (err: any) => {
        this.savingTemplateHtml = false;
        const errMsg = err?.error?.message || 'Failed to save template changes.';
        this.toast.error(errMsg);
      }
    });
  }

  addBlogArticle(): void {
    const nextIdx = this.previewBlogContent.articles.length + 1;
    this.previewBlogContent.articles.push({
      title: `Enterprise Case Study #${nextIdx}`,
      summary: 'Comprehensive analysis on infrastructure modernization and real-time transaction processing.',
      coverImageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&auto=format&fit=crop&q=80',
      category: 'Case Studies',
      authorName: 'Alex Rivera',
      authorRole: 'Chief Architect',
      publishedDate: 'Sep 2026',
      url: '#'
    });
    this.onPreviewContentChange();
  }

  removeBlogArticle(index: number): void {
    if (this.previewBlogContent.articles.length <= 1) {
      this.toast.warning('Keep at least one article.');
      return;
    }
    this.previewBlogContent.articles.splice(index, 1);
    this.onPreviewContentChange();
  }

  resetPreviewContent(): void {
    if (this.activePreviewItem?.category === 'hero') {
      this.previewHeroContent = {
        title: this.activePreviewItem?.previewTitle || this.activePreviewItem?.name || 'Innovating the Future of Community Empowerment',
        miniTitle: 'OFFICIAL PORTAL',
        text: this.activePreviewItem?.previewBody || this.activePreviewItem?.description || 'Empower your institution with resilient cloud infrastructure, automated governance, secure e-voting, and real-time operational telemetry in one unified workspace.',
        buttonText: 'Explore Solutions',
        buttonLink: '/services',
        videoButtonText: '',
        videoLink: '',
        url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&auto=format&fit=crop&q=80',
        secondUrl: '',
        youtubeVideo: ''
      };
      this.onPreviewContentChange();
      this.toast.info('Hero slider sample content restored to defaults.');
      return;
    }

    if (this.activePreviewItem?.defaultContentJson) {
      try {
        const parsed = JSON.parse(this.activePreviewItem.defaultContentJson);
        if (parsed && typeof parsed === 'object') {
          this.previewContent = {
            title: parsed.title || this.activePreviewItem.name,
            miniTitle: parsed.miniTitle || '',
            description: parsed.description || this.activePreviewItem.description,
            imageUrl: parsed.imageUrl || 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
            buttonText: parsed.buttonText || 'Explore Platform Solutions →',
            buttonLink: parsed.buttonLink || '#',
            items: (parsed.items && Array.isArray(parsed.items) && parsed.items.length > 0) ? parsed.items : [
              { title: 'Real-Time Sync', description: 'Instantaneous WebSocket state propagation.' },
              { title: 'Granular Governance', description: 'Fine-grained permission matrices.' }
            ]
          };
          this.onPreviewContentChange();
          this.toast.info('Sample content restored to template blueprint defaults.');
          return;
        }
      } catch (e) {}
    }

    this.previewContent = {
      title: this.activePreviewItem?.previewTitle || this.activePreviewItem?.name || 'Empowering Modern Enterprises',
      miniTitle: this.activePreviewItem?.previewSubtitle?.toUpperCase() || 'CORE BUSINESS CAPABILITIES',
      description: this.activePreviewItem?.previewBody || this.activePreviewItem?.description || 'Streamline business workflows, optimize operations, and deliver seamless client experiences.',
      imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
      buttonText: 'Explore Business Solutions →',
      buttonLink: '#',
      items: [
        { title: 'Strategic Advisory', description: 'Tailored market insights and operational guidance to accelerate organizational growth.' },
        { title: 'Data Security & Privacy', description: 'Industry-standard encryption, privacy protocols, and secure collaboration channels.' },
        { title: 'Operational Efficiency', description: 'Modern automated workflows engineered to eliminate friction and elevate productivity.' }
      ]
    };
    this.onPreviewContentChange();
    this.toast.info('Sample content reset to defaults.');
  }

  hydrateTemplate(rawHtml: string, data?: any): string {
    if (!rawHtml) return '';
    const ctx = data || this.previewContent;

    let output = rawHtml;

    // 0a. Loop over {{#each MainMenuItems}}...{{/each}}
    const mainMenuItemsRegex = /\{\{#each\s+MainMenuItems\}\}([\s\S]*?)\{\{\/each\}\}/gi;
    output = output.replace(mainMenuItemsRegex, (_match, innerTemplate) => {
      const items = ctx.topMenuItems || this.previewMenuContent.topMenuItems || [
        { title: 'Home', url: '/' },
        { title: 'About Us', url: '/about' },
        { title: 'Blog', url: '/blog' },
        { title: 'Contact', url: '/contact' }
      ];
      return items.map((item: any) => {
        let rendered = innerTemplate;
        rendered = rendered.replace(/\{\{\s*Title\s*\}\}/gi, item.title || '');
        rendered = rendered.replace(/\{\{\s*Url\s*\}\}/gi, item.url || item.slug || '#');
        return rendered;
      }).join('\n');
    });

    // 0b. Loop over {{#each MenuCtaButtons}}...{{/each}}
    const menuCtaRegex = /\{\{#each\s+MenuCtaButtons\}\}([\s\S]*?)\{\{\/each\}\}/gi;
    output = output.replace(menuCtaRegex, (_match, innerTemplate) => {
      const ctas = ctx.menuCtaButtons || this.previewMenuContent.menuCtaButtons || (this.editorTokens?.menuCtaButtons?.length ? this.editorTokens.menuCtaButtons : [
        { title: 'Sign In', url: '/login' },
        { title: 'Request a Service', url: '/request-service' }
      ]);
      return ctas.map((cta: any) => {
        let rendered = innerTemplate;
        rendered = rendered.replace(/\{\{\s*(?:ButtonText|Title)\s*\}\}/gi, cta.title || '');
        rendered = rendered.replace(/\{\{\s*(?:ButtonLink|Url)\s*\}\}/gi, cta.url || '#');
        rendered = rendered.replace(/\{\{\s*CustomClass\s*\}\}/gi, '');
        return rendered;
      }).join('\n');
    });

    // 0c. Loop over {{#each MenuDropdowns}}...{{/each}} with nested {{#each Pages}} using balanced block parsing
    output = this.replaceBalancedBlock(output, 'MenuDropdowns', (outerTemplate) => {
      const dropdowns = ctx.dropdowns || this.previewMenuContent.dropdowns || (this.editorTokens?.menuDropdowns?.length ? this.editorTokens.menuDropdowns : [
        {
          title: 'Services',
          pages: [
            { title: 'Commercial Cleaning', url: '/services/commercial-cleaning' },
            { title: 'Residential Cleaning', url: '/services/residential-cleaning' },
            { title: 'Deep Sanitization', url: '/services/deep-sanitization' }
          ]
        },
        {
          title: 'Company',
          pages: [
            { title: 'About Us', url: '/about' },
            { title: 'Request a Service', url: '/request-service' },
            { title: 'Contact Us', url: '/contact' }
          ]
        }
      ]);

      if (!Array.isArray(dropdowns) || dropdowns.length === 0) return '';

      return dropdowns.map((dd: any, ddIdx: number) => {
        let renderedDd = outerTemplate;

        // FIRST resolve nested {{#each Pages}} so child {{ Title }} is NOT replaced by parent category title
        const pagesRegex = /\{\{#each\s+Pages\}\}([\s\S]*?)\{\{\/each\}\}/gi;
        renderedDd = renderedDd.replace(pagesRegex, (_pMatch: string, pageTemplate: string) => {
          const pages = dd.pages || [];
          if (!Array.isArray(pages) || pages.length === 0) return '';
          return pages.map((page: any) => {
            let renderedPage = pageTemplate;
            renderedPage = renderedPage.replace(/\{\{\s*Title\s*\}\}/gi, page.title || '');
            renderedPage = renderedPage.replace(/\{\{\s*Url\s*\}\}/gi, page.url || page.slug || '#');
            return renderedPage;
          }).join('\n');
        });

        // THEN resolve parent dropdown tokens on outer element
        renderedDd = renderedDd.replace(/\{\{\s*CategoryName\s*\}\}/gi, dd.title || dd.categoryName || `Menu ${ddIdx + 1}`);
        renderedDd = renderedDd.replace(/\{\{\s*Title\s*\}\}/gi, dd.title || dd.categoryName || `Menu ${ddIdx + 1}`);
        renderedDd = renderedDd.replace(/\{\{\s*Index\s*\}\}/gi, (ddIdx + 1).toString());

        return renderedDd;
      }).join('\n');
    });

    // 1. Loop over {{#each PageSectionLists}}...{{/each}}
    const eachRegex = /\{\{#each\s+PageSectionLists\}\}([\s\S]*?)\{\{\/each\}\}/gi;
    output = output.replace(eachRegex, (_match, innerTemplate) => {
      if (!ctx.items || !Array.isArray(ctx.items) || ctx.items.length === 0) {
        return '';
      }
      return ctx.items.map((item: any, idx: number) => {
        let renderedItem = innerTemplate;
        const icon = (item.iconText && item.iconText.trim().length > 0)
          ? item.iconText.trim()
          : ((item.icon && item.icon.trim().length > 0) ? item.icon.trim() : '');

        renderedItem = renderedItem.replace(/\{\{\s*IconText\s*\}\}/gi, icon);
        renderedItem = renderedItem.replace(/\{\{\s*Icon\s*\}\}/gi, icon);
        renderedItem = renderedItem.replace(/\{\{\s*Title\s*\}\}/gi, item.title || `Item ${idx + 1}`);
        renderedItem = renderedItem.replace(/\{\{\s*MiniTitle\s*\}\}/gi, item.miniTitle || ctx.miniTitle || '');
        renderedItem = renderedItem.replace(/\{\{\s*Description\s*\}\}/gi, item.description || '');
        renderedItem = renderedItem.replace(/\{\{\s*ImageUrl\s*\}\}/gi, item.imageUrl || ctx.imageUrl || '');
        renderedItem = renderedItem.replace(/\{\{\s*ButtonText\s*\}\}/gi, item.buttonText || ctx.buttonText || '');
        renderedItem = renderedItem.replace(/\{\{\s*ButtonLink\s*\}\}/gi, item.buttonLink || ctx.buttonLink || '#');
        return renderedItem;
      }).join('\n');
    });

    // 2. Loop over {{#each CategoryPages "Name"}}...{{/each}}
    const catPagesRegex = /\{\{#each\s+CategoryPages\s+"([^"]+)"\}\}([\s\S]*?)\{\{\/each\}\}/gi;
    output = output.replace(catPagesRegex, (_match, catName, innerTemplate) => {
      let pages: any[] = [];
      const normalized = (catName || '').toLowerCase().trim();

      const categories = ctx.categories || this.editorTokens?.footerGroups || this.previewFooterContent.categories;
      const found = categories?.find((c: any) =>
        (c.name && c.name.toLowerCase() === normalized) ||
        (c.displayTitle && c.displayTitle.toLowerCase() === normalized) ||
        (c.categoryName && c.categoryName.toLowerCase() === normalized) ||
        (c.title && c.title.toLowerCase() === normalized)
      );

      if (found?.pages && found.pages.length > 0) {
        // Enforce strict visibility rules: must be published and enabled for footer display
        pages = found.pages.filter((p: any) =>
          (p.publish === undefined || p.publish === true) &&
          (p.showInFooter === undefined || p.showInFooter === true)
        );
      } else if (this.availablePages && Array.isArray(this.availablePages)) {
        pages = this.availablePages.filter((p: any) =>
          p.publish !== false &&
          p.showInFooter !== false &&
          (p.pageCategory && p.pageCategory.toLowerCase().trim() === normalized)
        );
      } else if (normalized.includes('service') || normalized.includes('solution')) {
        pages = [
          { title: 'Strategic Consulting', url: '/strategic-advisory' },
          { title: 'Systems Modernization', url: '/systems-modernization' },
          { title: 'Performance & Scale', url: '/performance-scale' },
          { title: 'Enterprise Advisory', url: '/enterprise-governance' }
        ];
      } else if (normalized.includes('company') || normalized.includes('about')) {
        pages = [
          { title: 'About Us', url: '/about' },
          { title: 'Leadership & Team', url: '/about' },
          { title: 'Insights & News', url: '/blog' },
          { title: 'Request a Service', url: '/request-service' }
        ];
      }

      return pages.map((p: any) => {
        let rendered = innerTemplate;
        rendered = rendered.replace(/\{\{\s*Title\s*\}\}/gi, p.title || '');
        rendered = rendered.replace(/\{\{\s*Url\s*\}\}/gi, p.url || p.slug || '#');
        return rendered;
      }).join('\n');
    });

    // 2b. Loop over {{#each TaggedPages "TagName"}}...{{/each}}
    const taggedPagesRegex = /\{\{#each\s+TaggedPages\s+"([^"]+)"\}\}([\s\S]*?)\{\{\/each\}\}/gi;
    output = output.replace(taggedPagesRegex, (_match, tag, innerTemplate) => {
      const normalized = (tag || '').toLowerCase().trim();
      let pages: any[] = [];

      // 1. Check live loaded tokens from GET /api/content/template-editor-tokens (already filtered by Publish && ShowInFooter)
      if (this.editorTokens?.taggedPages && Array.isArray(this.editorTokens.taggedPages)) {
        const found = this.editorTokens.taggedPages.find((g: any) => (g.tag || '').toLowerCase() === normalized);
        if (found?.pages && Array.isArray(found.pages) && found.pages.length > 0) {
          pages = found.pages;
        }
      }

      // 2. Fallback to availablePages with strict visibility enforcement
      if (pages.length === 0 && this.availablePages && Array.isArray(this.availablePages)) {
        pages = this.availablePages.filter((p: any) => {
          const isPublished = p.publish !== false && p.isPublished !== false;
          const isFooter = p.showInFooter !== false;
          if (!isPublished || !isFooter || !p.tags) return false;

          const tagsList = p.tags.toLowerCase().split(/[,;]/).map((t: string) => t.trim());
          return tagsList.includes(normalized);
        });
      }

      // 3. Fallback sample items for realistic preview display if tenant has no tagged pages yet
      if (pages.length === 0) {
        const displayTag = tag ? (tag.charAt(0).toUpperCase() + tag.slice(1)) : 'Resource';
        pages = [
          { title: `${displayTag} Overview`, url: '#' },
          { title: `${displayTag} Documentation`, url: '#' }
        ];
      }

      return pages.map((p: any) => {
        let rendered = innerTemplate;
        rendered = rendered.replace(/\{\{\s*Title\s*\}\}/gi, p.title || '');
        rendered = rendered.replace(/\{\{\s*Url\s*\}\}/gi, p.url || p.slug || '#');
        return rendered;
      }).join('\n');
    });

    // 3. Loop over {{#each FooterCategories}}...{{/each}}
    const footerCatsRegex = /\{\{#each\s+FooterCategories\}\}([\s\S]*?)\{\{\/each\}\}/gi;
    output = output.replace(footerCatsRegex, (_match, innerTemplate) => {
      const groups = ctx.categories || this.previewFooterContent.categories;
      return groups.map((g: any) => {
        let colHtml = innerTemplate;
        colHtml = colHtml.replace(/\{\{\s*(?:DisplayTitle|Title|CategoryTitle)\s*\}\}/gi, g.displayTitle || g.name || 'Column');

        const pagesLoopRegex = /\{\{#each\s+Pages\}\}([\s\S]*?)\{\{\/each\}\}/gi;
        colHtml = colHtml.replace(pagesLoopRegex, (_pMatch: string, pTemplate: string) => {
          const pages = g.pages || [];
          return pages.map((p: any) => {
            let pRendered = pTemplate;
            pRendered = pRendered.replace(/\{\{\s*Title\s*\}\}/gi, p.title || '');
            pRendered = pRendered.replace(/\{\{\s*Url\s*\}\}/gi, p.url || p.slug || '#');
            return pRendered;
          }).join('\n');
        });

        return colHtml;
      }).join('\n');
    });

    // 4. Loop over {{#each LegalPages}}...{{/each}}
    const legalRegex = /\{\{#each\s+LegalPages\}\}([\s\S]*?)\{\{\/each\}\}/gi;
    output = output.replace(legalRegex, (_match, innerTemplate) => {
      let pages: any[] = [];
      const legals = ctx.legalPages || this.editorTokens?.legalPages || this.previewFooterContent.legalPages;
      if (legals && Array.isArray(legals) && legals.length > 0) {
        pages = legals.filter((lp: any) =>
          (lp.publish === undefined || lp.publish === true) &&
          (lp.showInFooter === undefined || lp.showInFooter === true)
        );
      } else if (this.availablePages && Array.isArray(this.availablePages)) {
        pages = this.availablePages.filter((p: any) =>
          p.publish !== false &&
          p.showInFooter !== false &&
          p.isLegal === true
        );
      }

      if (pages.length === 0) {
        pages = [
          { title: 'Privacy Policy', url: '/privacy-policy' },
          { title: 'Terms of Service', url: '/terms-and-conditions' },
          { title: 'Cookie Policy', url: '/cookie-policy' }
        ];
      }

      return pages.map((lp: any) => {
        let rendered = innerTemplate;
        rendered = rendered.replace(/\{\{\s*Title\s*\}\}/gi, lp.title || '');
        rendered = rendered.replace(/\{\{\s*Url\s*\}\}/gi, lp.url || '#');
        return rendered;
      }).join('\n');
    });

    // 5. Loop over {{#each SocialLinks}}...{{/each}}
    const socialRegex = /\{\{#each\s+SocialLinks\}\}([\s\S]*?)\{\{\/each\}\}/gi;
    output = output.replace(socialRegex, (_match, innerTemplate) => {
      const socials = [
        { platform: 'LinkedIn', url: 'https://linkedin.com', iconClass: 'fa-brands fa-linkedin-in' },
        { platform: 'Twitter / X', url: 'https://x.com', iconClass: 'fa-brands fa-x-twitter' },
        { platform: 'Facebook', url: 'https://facebook.com', iconClass: 'fa-brands fa-facebook-f' },
        { platform: 'Instagram', url: 'https://instagram.com', iconClass: 'fa-brands fa-instagram' },
        { platform: 'YouTube', url: 'https://youtube.com', iconClass: 'fa-brands fa-youtube' }
      ];

      return socials.map((s: any) => {
        let rendered = innerTemplate;
        rendered = rendered.replace(/\{\{\s*Platform\s*\}\}/gi, s.platform);
        rendered = rendered.replace(/\{\{\s*Url\s*\}\}/gi, s.url);
        rendered = rendered.replace(/\{\{\s*IconClass\s*\}\}/gi, s.iconClass);
        return rendered;
      }).join('\n');
    });

    // 6. Dynamic Form Embeds: {{ Form "Key" }} or {{ FormEmbed }}
    const formRegex = /\{\{\s*Form\s+"([^"]+)"\s*\}\}|\{\{\s*FormEmbed\s*\}\}/gi;
    output = output.replace(formRegex, (_match: string, formKey?: string) => {
      const key = formKey || 'FormEmbed';
      const isNewsletter = /newsletter|subscribe/i.test(key);

      if (isNewsletter) {
        return `<form class="oz-dynamic-form oz-form-newsletter d-flex gap-2" onsubmit="event.preventDefault();">
          <input type="email" class="form-control form-control-sm rounded-pill px-3" placeholder="Your work email..." required />
          <button type="submit" class="btn btn-sm btn-primary rounded-pill px-3 fw-bold">Join</button>
        </form>`;
      }

      return `<div class="oz-form-embed-preview p-2 border rounded bg-white text-center small text-muted">
        <i class="fa-solid fa-file-lines text-primary me-1"></i> Form: <strong>${key}</strong>
      </div>`;
    });

    // 6b. Articles Loop ({{#each Articles}}...{{/each}})
    const articlesRegex = /\{\{#each\s+Articles\}\}([\s\S]*?)\{\{\/each\}\}/gi;
    output = output.replace(articlesRegex, (_match, innerTemplate) => {
      const articles = ctx.articles || this.previewBlogContent.articles || [
        {
          title: 'Architecting Resilient Multi-Tenant Cloud Ecosystems',
          summary: 'Explore proven patterns for high-throughput tenant isolation, schema partitioning, and real-time synchronization.',
          coverImageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80',
          category: 'Engineering & Architecture',
          authorName: 'Alex Rivera',
          authorRole: 'Chief Architect',
          publishedDate: 'Sep 12, 2026',
          url: '/blog/architecting-resilient-multi-tenant-cloud-ecosystems'
        },
        {
          title: 'The Shift to Zero-Downtime Migration Pipelines',
          summary: 'How leading enterprise engineering teams execute petabyte-scale database cutovers without dropping a single active transaction.',
          coverImageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&auto=format&fit=crop&q=80',
          category: 'DevOps & Reliability',
          authorName: 'Sarah Chen',
          authorRole: 'Head of Infrastructure',
          publishedDate: 'Sep 08, 2026',
          url: '/blog/zero-downtime-migration-pipelines'
        }
      ];

      return articles.map((art: any) => {
        let rendered = innerTemplate;
        rendered = rendered.replace(/\{\{\s*Title\s*\}\}/gi, art.title);
        rendered = rendered.replace(/\{\{\s*Summary\s*\}\}/gi, art.summary);
        rendered = rendered.replace(/\{\{\s*(?:CoverImageUrl|ImageUrl)\s*\}\}/gi, art.coverImageUrl);
        rendered = rendered.replace(/\{\{\s*Category\s*\}\}/gi, art.category);
        rendered = rendered.replace(/\{\{\s*AuthorName\s*\}\}/gi, art.authorName);
        rendered = rendered.replace(/\{\{\s*AuthorRole\s*\}\}/gi, art.authorRole);
        rendered = rendered.replace(/\{\{\s*PublishedDate\s*\}\}/gi, art.publishedDate);
        rendered = rendered.replace(/\{\{\s*Url\s*\}\}/gi, art.url || '#');
        return rendered;
      }).join('\n');
    });

    // 6c. RecentArticles Loop ({{#each RecentArticles}}...{{/each}})
    const recentArticlesRegex = /\{\{#each\s+RecentArticles\}\}([\s\S]*?)\{\{\/each\}\}/gi;
    output = output.replace(recentArticlesRegex, (_match, innerTemplate) => {
      const recents = [
        { title: 'Architecting Resilient Multi-Tenant Cloud Ecosystems', publishedDate: 'Sep 12, 2026', coverImageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=300&auto=format&fit=crop&q=80', url: '/blog/architecting-resilient-multi-tenant-cloud-ecosystems' },
        { title: 'The Shift to Zero-Downtime Migration Pipelines', publishedDate: 'Sep 08, 2026', coverImageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=300&auto=format&fit=crop&q=80', url: '/blog/zero-downtime-migration-pipelines' }
      ];
      return recents.map((r: any) => {
        let rendered = innerTemplate;
        rendered = rendered.replace(/\{\{\s*Title\s*\}\}/gi, r.title);
        rendered = rendered.replace(/\{\{\s*PublishedDate\s*\}\}/gi, r.publishedDate);
        rendered = rendered.replace(/\{\{\s*(?:CoverImageUrl|ImageUrl)\s*\}\}/gi, r.coverImageUrl);
        rendered = rendered.replace(/\{\{\s*Url\s*\}\}/gi, r.url);
        return rendered;
      }).join('\n');
    });

    // 6d. BlogCategories Loop ({{#each BlogCategories}}...{{/each}})
    const blogCatsRegex = /\{\{#each\s+BlogCategories\}\}([\s\S]*?)\{\{\/each\}\}/gi;
    output = output.replace(blogCatsRegex, (_match, innerTemplate) => {
      const cats = [
        { name: 'Engineering & Architecture', postCount: 14, url: '/blog?category=engineering' },
        { name: 'DevOps & Reliability', postCount: 9, url: '/blog?category=devops' },
        { name: 'Cybersecurity', postCount: 7, url: '/blog?category=cybersecurity' }
      ];
      return cats.map((c: any) => {
        let rendered = innerTemplate;
        rendered = rendered.replace(/\{\{\s*(?:Name|Title|CategoryTitle)\s*\}\}/gi, c.name);
        rendered = rendered.replace(/\{\{\s*PostCount\s*\}\}/gi, String(c.postCount));
        rendered = rendered.replace(/\{\{\s*Url\s*\}\}/gi, c.url);
        return rendered;
      }).join('\n');
    });

    // 6e. ArticleTags Loop ({{#each ArticleTags}}...{{/each}})
    const tagsRegex = /\{\{#each\s+ArticleTags\}\}([\s\S]*?)\{\{\/each\}\}/gi;
    output = output.replace(tagsRegex, (_match, innerTemplate) => {
      const tags = [
        { name: 'Multi-Tenancy', url: '/blog?tag=multi-tenancy' },
        { name: 'Cloud Architecture', url: '/blog?tag=cloud-architecture' },
        { name: 'DevOps', url: '/blog?tag=devops' }
      ];
      return tags.map((t: any) => {
        let rendered = innerTemplate;
        rendered = rendered.replace(/\{\{\s*(?:Name|Tag|Title)\s*\}\}/gi, t.name);
        rendered = rendered.replace(/\{\{\s*Url\s*\}\}/gi, t.url);
        return rendered;
      }).join('\n');
    });

    // 6f. Article Detail Scalars ({{ Article.Title }}, {{ Article.Body }}, etc.)
    output = output.replace(/\{\{\s*Article\.Title\s*\}\}/gi, 'Architecting Resilient Multi-Tenant Cloud Ecosystems');
    output = output.replace(/\{\{\s*Article\.Category\s*\}\}/gi, 'Engineering & Architecture');
    output = output.replace(/\{\{\s*Article\.PublishedDate\s*\}\}/gi, 'September 12, 2026');
    output = output.replace(/\{\{\s*Article\.AuthorName\s*\}\}/gi, 'Alex Rivera');
    output = output.replace(/\{\{\s*Article\.AuthorRole\s*\}\}/gi, 'Chief Architect & Head of Platform Engineering');
    output = output.replace(/\{\{\s*Article\.CoverImageUrl\s*\}\}/gi, 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop&q=80');
    output = output.replace(/\{\{\s*Article\.Summary\s*\}\}/gi, 'A comprehensive guide on building scalable, isolated, multi-tenant cloud ecosystems with robust zero-trust policies.');
    output = output.replace(/\{\{\s*Article\.Body\s*\}\}/gi, `
      <p class="lead">Modern enterprise cloud systems require strict multi-tenant isolation, ultra-fast database scaling, and zero-compromise security models.</p>
      <p>Our hybrid persistence layer splits the master tenant catalog from individual tenant SQL databases, ensuring that noisy neighbors never impact cross-tenant performance.</p>
    `);

    // 6g. Handlebars {{#if Property}}...{{/if}} and {{#unless Property}}...{{/unless}} Conditionals
    const ifRegex = /\{\{#if\s+([\w\.]+)\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))?\{\{\/if\}\}/gi;
    output = output.replace(ifRegex, (_match, prop, ifBody, elseBody) => {
      const p = prop.trim();
      const key = Object.keys(ctx).find(k => k.toLowerCase() === p.toLowerCase());
      const val = key ? ctx[key] : undefined;
      const isTruthy = (val !== null && val !== undefined && val !== false && val !== '' && (typeof val !== 'string' || val.trim().length > 0));
      return isTruthy ? ifBody : (elseBody || '');
    });

    const unlessRegex = /\{\{#unless\s+([\w\.]+)\}\}([\s\S]*?)\{\{\/unless\}\}/gi;
    output = output.replace(unlessRegex, (_match, prop, body) => {
      const p = prop.trim();
      const key = Object.keys(ctx).find(k => k.toLowerCase() === p.toLowerCase());
      const val = key ? ctx[key] : undefined;
      const isFalsy = (val === null || val === undefined || val === false || val === '' || (typeof val === 'string' && val.trim().length === 0));
      return isFalsy ? body : '';
    });

    // 7. Scalar placeholders & Slider model tokens (leave unused fields blank)
    output = output.replace(/\{\{\s*Title\s*\}\}/gi, ctx.title || '');
    output = output.replace(/\{\{\s*MiniTitle\s*\}\}/gi, ctx.miniTitle || '');
    output = output.replace(/\{\{\s*Text\s*\}\}/gi, ctx.text || ctx.description || '');
    output = output.replace(/\{\{\s*Description\s*\}\}/gi, ctx.description || ctx.text || '');
    output = output.replace(/\{\{\s*Url\s*\}\}/gi, ctx.url || ctx.imageUrl || '');
    output = output.replace(/\{\{\s*ImageUrl\s*\}\}/gi, ctx.imageUrl || ctx.url || '');
    output = output.replace(/\{\{\s*SecondUrl\s*\}\}/gi, ctx.secondUrl || '');
    output = output.replace(/\{\{\s*YoutubeVideo\s*\}\}/gi, ctx.youtubeVideo || ctx.videoUrl || '');
    output = output.replace(/\{\{\s*ButtonText\s*\}\}/gi, ctx.buttonText || '');
    output = output.replace(/\{\{\s*ButtonLink\s*\}\}/gi, ctx.buttonLink || '#');
    output = output.replace(/\{\{\s*VideoButtonText\s*\}\}/gi, ctx.videoButtonText || ctx.secondaryButtonText || '');
    output = output.replace(/\{\{\s*VideoLink\s*\}\}/gi, ctx.videoLink || ctx.secondaryButtonLink || '');
    output = output.replace(/\{\{\s*SecondaryButtonText\s*\}\}/gi, ctx.secondaryButtonText || ctx.videoButtonText || '');
    output = output.replace(/\{\{\s*SecondaryButtonLink\s*\}\}/gi, ctx.secondaryButtonLink || ctx.videoLink || '');
    output = output.replace(/\{\{\s*Subtitle\s*\}\}/gi, ctx.subtitle || ctx.text || ctx.description || '');
    output = output.replace(/\{\{\s*BackgroundImageUrl\s*\}\}/gi, ctx.url || ctx.imageUrl || '');
    output = output.replace(/\{\{\s*VideoUrl\s*\}\}/gi, ctx.youtubeVideo || ctx.videoUrl || '');
    output = output.replace(/\{\{\s*(?:BadgeText|Badge|PillText)\s*\}\}/gi, ctx.miniTitle || ctx.badgeText || '');
    output = output.replace(/\{\{\s*IconText\s*\}\}/gi, ctx.iconText || '');
    output = output.replace(/\{\{\s*Icon\s*\}\}/gi, ctx.icon || '');
    const faviconUrl = ctx.FaviconUrl || ctx.faviconUrl || '/favicon.ico';
    output = output.replace(/\{\{\s*FaviconUrl\s*\}\}/gi, faviconUrl);

    // Legal URLs
    output = output.replace(/\{\{\s*PrivacyUrl\s*\}\}/gi, '/privacy-policy');
    output = output.replace(/\{\{\s*TermsUrl\s*\}\}/gi, '/terms-and-conditions');
    output = output.replace(/\{\{\s*CookiesUrl\s*\}\}/gi, '/cookie-policy');

    // Corporate Identity Fields (Logo-First with Business Name fallback)
    const brandName = ctx.BrandName || ctx.brandName || this.currentTenantBrandName || this.editorTokens?.brand?.name || 'Organization Portal';
    const logoUrl = ctx.LogoUrl || ctx.logoUrl || this.editorTokens?.brand?.logoUrl || '';
    const brandIdentityHtml = (logoUrl && logoUrl.trim().length > 0)
      ? `<img src="${logoUrl}" alt="${brandName}" class="navbar-brand-logo" style="max-height: 40px; width: auto; object-fit: contain;" />`
      : `<span class="fw-bolder text-dark fs-4 tracking-tight">${brandName}</span>`;

    output = output.replace(/\{\{\s*(?:BrandIdentity|BrandLogoOrName)\s*\}\}/gi, brandIdentityHtml);
    output = output.replace(/\{\{\s*LogoUrl\s*\}\}/gi, logoUrl);
    const currentYear = ctx.Year || new Date().getFullYear().toString();
    output = output.replace(/\{\{\s*BrandName\s*\}\}/gi, brandName);
    output = output.replace(/\{\{\s*Year\s*\}\}/gi, currentYear);
    output = output.replace(/\{\{\s*Email\s*\}\}/gi, ctx.email || 'contact@organization.com');
    output = output.replace(/\{\{\s*Phone\s*\}\}/gi, ctx.phone || '+1 (555) 019-2834');
    output = output.replace(/\{\{\s*Address\s*\}\}/gi, ctx.address || 'Administrative Headquarters');
    output = output.replace(/\{\{\s*Copyright\s*\}\}/gi, ctx.copyright || `&copy; ${currentYear} ${brandName}. All rights reserved.`);
    output = output.replace(/\{\{\s*PoweredBy\s*\}\}/gi, ctx.poweredBy || 'Powered by <a href="https://ozikol.cloud" target="_blank" rel="noopener noreferrer" style="color: #0050e5 !important; font-weight: 700; text-decoration: none;">Ozikol</a>');

    // Clean up any remaining unhandled {{#each ...}} loops and leftover {{ Token }} placeholders to prevent visual leakage
    output = output.replace(/\{\{#each[\s\S]*?\{\{\/each\}\}/gi, '');
    output = output.replace(/\{\{[#\/]?[\w\s\.\,\-\_]+\}\}/g, '');

    return output;
  }

  /**
   * Enforces the official 'Powered by Ozikol.' credit link in all footers.
   * If a powered-by credit is present, normalizes its destination to https://ozikol.cloud.
   * If the footer has no room or omitted it, injects an adaptive non-intrusive bottom strip.
   */
  enforceOzikolCredit(html: string): string {
    if (!html) return '';
    const standardCredit = `Powered by <a href="https://ozikol.cloud" target="_blank" rel="noopener noreferrer" class="text-primary fw-bold text-decoration-none" style="color: #0050e5 !important; font-weight: 700; text-decoration: none;">Ozikol</a>.`;

    // 1. If an existing "Powered by..." line exists in any form, replace the credit container
    if (/powered\s+by/i.test(html)) {
      return html.replace(/powered\s+by\s+(?:<a[^>]*>)?(?:[^<]+(?:<\/a>)?)?(\.|\s*)?/gi, `${standardCredit} `);
    }

    // 2. If the footer has a bottom row with justify-content-between, inject credit inside it on the right
    if (/justify-content-between/i.test(html)) {
      const match = html.match(/(<div[^>]*class=["'][^"']*justify-content-between[^"']*["'][^>]*>[\s\S]*?<div>[^<]*&copy;[\s\S]*?<\/div>)([\s\S]*?<\/div>)/i);
      if (match) {
        return html.replace(/(<div[^>]*class=["'][^"']*justify-content-between[^"']*["'][^>]*>[\s\S]*?<div>[^<]*&copy;[\s\S]*?<\/div>)([\s\S]*?<\/div>)/i, `$1\n      <div>${standardCredit}</div>$2`);
      }
    }

    // 3. If no powered-by line exists at all, inject an adaptive bottom strip right before </footer> or at the end
    const strip = `\n<div class="ozikol-enforced-credit-bar" style="border-top: 1px solid rgba(150,150,150,0.15); padding: 14px 20px; text-align: center; font-size: 11.5px; opacity: 0.85; letter-spacing: 0.02em;">${standardCredit}</div>\n`;

    if (/<\/footer>/i.test(html)) {
      return html.replace(/<\/footer>/i, `${strip}</footer>`);
    }
    return html + strip;
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
    this.safeSinglePreviewSrcDoc = '';
    const styleEl = document.getElementById('oz-template-single-preview-css');
    if (styleEl) styleEl.remove();
    this.disposeMonacoEditors();
  }

  // Full-Site Demo Modal & Multi-Page Engine
  setPreviewPage(slug: 'home' | 'about' | 'services' | 'request-service' | 'blog' | 'contact'): void {
    this.previewActivePageSlug = slug;
    this.renderFullSitePreview();
  }

  openFullSiteDemoModal(): void {
    this.fullDemoViewport = 'desktop';
    this.previewActivePageSlug = 'home';
    this.showFullSiteDemoModal = true;
    this.renderFullSitePreview();
  }

  /**
   * Composes a complete simulated page containing Menu, Hero/Breadcrumbs, Body sections, Blog/Contact/Request-Service, and Footer.
   * Enables 100% sample-content fidelity and live navigation simulation across all pages.
   * @param pageSlug The target route slug ('home' | 'about' | 'services' | 'request-service' | 'contact' | 'blog').
   * @param menuBlockOverride Optional menu template item to override the active installed menu (used in modal preview).
   * @param menuContextOverride Optional menu data context to override sample data.
   * @returns An object containing combined CSS styles and combined HTML markup.
   */
  composePageSimulation(
    pageSlug: 'home' | 'about' | 'services' | 'request-service' | 'contact' | 'blog',
    menuBlockOverride?: InstalledTemplateItem,
    menuContextOverride?: any
  ): { combinedStyles: string; combinedHtml: string; combinedJs: string } {
    const menuBlock = menuBlockOverride || this.getActiveMenu();
    const heroBlock = this.getActiveHero();
    const allBodyBlocks = this.getAllBodyBlocks();
    const newsBlock = this.getActiveNewsletter();
    const footerBlock = this.getActiveFooter();

    const breadcrumbBlock = this.installedTemplates.find(t => t.category === 'breadcrumb') || this.installedTemplates.find(t => t.variantCode === 'Breadcrumb_PageHeader');
    const blogBlock = this.installedTemplates.find(t => t.category === 'blog') || this.installedTemplates.find(t => t.variantCode === 'Blog_CardGrid3');
    const contactBlock = this.installedTemplates.find(t => t.variantCode === 'Contact_SplitDetails') || this.installedTemplates.find(t => t.category === 'contact');
    const requestServiceBlock = this.installedTemplates.find(t => t.variantCode === 'Body_RequestService');

    let activeBlocks: { block: InstalledTemplateItem; contextOverride?: any }[] = [];

    if (pageSlug === 'home') {
      if (menuBlock) activeBlocks.push({ block: menuBlock, contextOverride: menuContextOverride });
      if (heroBlock) activeBlocks.push({ block: heroBlock });
      allBodyBlocks.forEach(b => activeBlocks.push({ block: b }));
      if (blogBlock) activeBlocks.push({ block: blogBlock });
      if (newsBlock) activeBlocks.push({ block: newsBlock });
      if (footerBlock) activeBlocks.push({ block: footerBlock });
    } else if (pageSlug === 'about') {
      if (menuBlock) activeBlocks.push({ block: menuBlock, contextOverride: menuContextOverride });
      if (breadcrumbBlock) {
        activeBlocks.push({
          block: breadcrumbBlock,
          contextOverride: {
            title: 'About Our Organization',
            miniTitle: 'MISSION & LEADERSHIP',
            description: 'Founded on principles of integrity, innovation, and client excellence, dedicated to delivering measurable value and long-term partnerships.'
          }
        });
      }
      const missionBlock = allBodyBlocks.find(b => b.variantCode === 'Body_MissionSplit') || allBodyBlocks[0];
      const metricBlock = allBodyBlocks.find(b => b.variantCode === 'Body_MetricsCounter');
      const testBlock = allBodyBlocks.find(b => b.variantCode === 'Body_Testimonials');
      const ctaBlock = allBodyBlocks.find(b => b.variantCode === 'Body_CtaBanner');
      if (missionBlock) activeBlocks.push({ block: missionBlock });
      if (metricBlock) activeBlocks.push({ block: metricBlock });
      if (testBlock) activeBlocks.push({ block: testBlock });
      if (ctaBlock) activeBlocks.push({ block: ctaBlock });
      if (footerBlock) activeBlocks.push({ block: footerBlock });
    } else if (pageSlug === 'services') {
      if (menuBlock) activeBlocks.push({ block: menuBlock, contextOverride: menuContextOverride });
      if (breadcrumbBlock) {
        activeBlocks.push({
          block: breadcrumbBlock,
          contextOverride: {
            title: 'Our Enterprise Services & Solutions',
            miniTitle: 'SERVICES & CAPABILITIES',
            description: 'Comprehensive institutional capabilities designed for seamless governance, compliance, and growth.'
          }
        });
      }
      const featureBlock = allBodyBlocks.find(b => b.variantCode === 'Body_FeatureGrid3') || allBodyBlocks[0];
      const missionBlock = allBodyBlocks.find(b => b.variantCode === 'Body_MissionSplit');
      const metricBlock = allBodyBlocks.find(b => b.variantCode === 'Body_MetricsCounter');
      const faqBlock = allBodyBlocks.find(b => b.variantCode === 'Body_FaqAccordion');
      if (featureBlock) activeBlocks.push({ block: featureBlock });
      if (missionBlock) activeBlocks.push({ block: missionBlock });
      if (metricBlock) activeBlocks.push({ block: metricBlock });
      if (faqBlock) activeBlocks.push({ block: faqBlock });
      if (newsBlock) activeBlocks.push({ block: newsBlock });
      if (footerBlock) activeBlocks.push({ block: footerBlock });
    } else if (pageSlug === 'request-service') {
      if (menuBlock) activeBlocks.push({ block: menuBlock, contextOverride: menuContextOverride });
      if (breadcrumbBlock) {
        activeBlocks.push({
          block: breadcrumbBlock,
          contextOverride: {
            title: 'Request a Service & Consultation',
            miniTitle: 'SERVICE INTAKE',
            description: 'Submit your project specifications to initiate a formal strategic consultation with our enterprise advisory team.'
          }
        });
      }
      if (requestServiceBlock) {
        activeBlocks.push({ block: requestServiceBlock });
      } else if (contactBlock) {
        activeBlocks.push({ block: contactBlock });
      }
      const faqBlock = allBodyBlocks.find(b => b.variantCode === 'Body_FaqAccordion');
      if (faqBlock) activeBlocks.push({ block: faqBlock });
      if (footerBlock) activeBlocks.push({ block: footerBlock });
    } else if (pageSlug === 'blog') {
      if (menuBlock) activeBlocks.push({ block: menuBlock, contextOverride: menuContextOverride });
      if (breadcrumbBlock) {
        activeBlocks.push({
          block: breadcrumbBlock,
          contextOverride: {
            title: 'Newsroom & Insights',
            miniTitle: 'DISPATCHES',
            description: 'Read the latest updates, event reports, policy releases, and organizational announcements.'
          }
        });
      }
      if (blogBlock) activeBlocks.push({ block: blogBlock });
      if (newsBlock) activeBlocks.push({ block: newsBlock });
      if (footerBlock) activeBlocks.push({ block: footerBlock });
    } else if (pageSlug === 'contact') {
      if (menuBlock) activeBlocks.push({ block: menuBlock, contextOverride: menuContextOverride });
      if (breadcrumbBlock) {
        activeBlocks.push({
          block: breadcrumbBlock,
          contextOverride: {
            title: 'Contact Administrative Headquarters',
            miniTitle: 'HELP & SUPPORT',
            description: 'Reach our executive secretariat, membership registrar, and technical support team.'
          }
        });
      }
      if (contactBlock) activeBlocks.push({ block: contactBlock });
      const faqBlock = allBodyBlocks.find(b => b.variantCode === 'Body_FaqAccordion');
      if (faqBlock) activeBlocks.push({ block: faqBlock });
      if (footerBlock) activeBlocks.push({ block: footerBlock });
    }

    let combinedStyles = `
      @import url('https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css');
      @import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css');
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

      .full-demo-canvas-wrapper {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        background: #ffffff;
      }
      .full-demo-canvas-wrapper a {
        text-decoration: none;
        cursor: pointer;
      }
      .full-demo-canvas-wrapper button {
        cursor: pointer;
      }
      /* Active Navigation Link Highlighting */
      .oz-nav-header .nav-link.active {
        color: #0050e5 !important;
        font-weight: 700 !important;
      }
      .oz-nav-header .nav-link:not(.active) {
        color: #64748b !important;
        font-weight: 500 !important;
      }
      .oz-nav-header .btn.active {
        box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.4) !important;
        transform: translateY(-1px);
      }
    `;

    let combinedHtml = '';
    let combinedJs = '';

    activeBlocks.forEach(({ block: b, contextOverride }) => {
      combinedStyles += `\n/* Block: ${b.name} (${b.variantCode}) */\n${b.cssStyles || ''}\n`;
      let ctx: any = {
        title: contextOverride?.title || b.previewTitle || b.name,
        miniTitle: contextOverride?.miniTitle || b.previewSubtitle?.toUpperCase() || b.category.toUpperCase(),
        description: contextOverride?.description || b.previewBody || b.description,
        imageUrl: this.previewContent.imageUrl,
        buttonText: this.previewContent.buttonText,
        buttonLink: this.previewContent.buttonLink,
        items: this.previewContent.items,
        BrandName: this.currentTenantBrandName,
        Year: new Date().getFullYear().toString()
      };

      if (b.category === 'menu') {
        if (contextOverride) {
          ctx = { ...ctx, ...contextOverride };
        } else {
          ctx = { ...ctx, ...this.previewMenuContent };
        }
      } else if (b.category === 'hero') {
        ctx = {
          ...ctx,
          ...this.previewHeroContent,
          title: contextOverride?.title || this.previewHeroContent.title || b.previewTitle || b.name,
          miniTitle: contextOverride?.miniTitle || this.previewHeroContent.miniTitle || b.previewSubtitle?.toUpperCase() || 'OFFICIAL PORTAL',
          text: contextOverride?.description || this.previewHeroContent.text || b.previewBody || b.description,
          buttonText: this.previewHeroContent.buttonText,
          buttonLink: this.previewHeroContent.buttonLink,
          videoButtonText: this.previewHeroContent.videoButtonText,
          videoLink: this.previewHeroContent.videoLink,
          url: this.previewHeroContent.url,
          secondUrl: this.previewHeroContent.secondUrl,
          youtubeVideo: this.previewHeroContent.youtubeVideo
        };
      } else if (b.category === 'footer') {
        ctx = {
          ...ctx,
          categories: this.previewFooterContent.categories,
          legalPages: this.previewFooterContent.legalPages,
          email: this.previewFooterContent.email,
          phone: this.previewFooterContent.phone,
          brandName: this.previewFooterContent.brandName || this.currentTenantBrandName
        };

        if (b.defaultContentJson) {
          try {
            const parsed = JSON.parse(b.defaultContentJson);
            if (parsed?.categories) ctx.categories = parsed.categories;
            if (parsed?.legalPages) ctx.legalPages = parsed.legalPages;
            if (parsed?.email) ctx.email = parsed.email;
            if (parsed?.phone) ctx.phone = parsed.phone;
            if (parsed?.description) ctx.description = parsed.description;
          } catch (e) {}
        }
      }

      let hydratedBlockHtml = this.hydrateTemplate(b.htmlTemplate, ctx);
      hydratedBlockHtml = hydratedBlockHtml.replace(/\{\{\s*BrandName\s*\}\}/g, this.currentTenantBrandName);
      hydratedBlockHtml = hydratedBlockHtml.replace(/\{\{\s*Year\s*\}\}/g, new Date().getFullYear().toString());

      if (b.category === 'menu') {
        hydratedBlockHtml = hydratedBlockHtml.replace(
          /badge rounded-pill bg-primary">0<\/span>/g,
          `badge rounded-pill bg-primary">${this.previewCartCount}</span>`
        );

        // Dynamically synchronize active navbar link highlighting with the current page slug
        const activeSlug = pageSlug;

        // 1. Strip hardcoded active / text-dark classes from all nav-links
        hydratedBlockHtml = hydratedBlockHtml
          .replace(/\bnav-link\b([^"]*?)\bactive\b/g, 'nav-link$1')
          .replace(/\bnav-link\b([^"]*?)\btext-dark\b/g, 'nav-link$1text-secondary');

        // 2. Set active class on current matching page
        if (activeSlug === 'request-service') {
          hydratedBlockHtml = hydratedBlockHtml.replace(
            /(href=["']#request-service["'][^>]*class=["'][^"']*btn\b[^"']*)(["'])/i,
            '$1 active$2'
          );
        } else {
          // Check for link matching target slug
          const slugRegex = new RegExp(`(<a\\s+[^>]*class=["'][^"']*nav-link)([^"']*)(["'][^>]*href=["'](?:#|\\/)?${activeSlug}["'])`, 'i');
          if (slugRegex.test(hydratedBlockHtml)) {
            hydratedBlockHtml = hydratedBlockHtml.replace(slugRegex, (match, p1, p2, p3) => {
              const clean = p2.replace(/\btext-secondary\b/g, '').replace(/\s+/g, ' ');
              return `${p1}${clean} text-dark active"${p3.substring(1)}`;
            });
          } else {
            const revRegex = new RegExp(`(<a\\s+[^>]*href=["'](?:#|\\/)?${activeSlug}["'][^>]*class=["'][^"']*nav-link[^"']*)(["'])`, 'i');
            hydratedBlockHtml = hydratedBlockHtml.replace(revRegex, (match, prefix, quote) => {
              const clean = prefix.replace(/\btext-secondary\b/g, '').replace(/\s+/g, ' ');
              return `${clean} text-dark active${quote}`;
            });
          }
        }
      }

      if (b.category === 'footer') {
        hydratedBlockHtml = this.enforceOzikolCredit(hydratedBlockHtml);
      }

      if (b.jsScript && b.jsScript.trim()) {
        combinedJs += `\n/* Section: ${b.name} (${b.category}) */\n${b.jsScript}\n`;
      }

      combinedHtml += `\n<!-- Section: ${b.name} (${b.category}) -->\n${hydratedBlockHtml}\n`;
    });

    return { combinedStyles, combinedHtml, combinedJs };
  }

  renderFullSitePreview(): void {
    const sim = this.composePageSimulation(this.previewActivePageSlug);
    const combinedStyles = sim.combinedStyles;
    const combinedHtml = sim.combinedHtml;
    const combinedJs = sim.combinedJs;

    this.safeFullDemoHtml = this.sanitizer.bypassSecurityTrustHtml(`<style>${combinedStyles}</style>\n${combinedHtml}`);

    const iframeHtmlDoc = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap">
  <style>
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }
    .dropdown {
      position: relative !important;
    }
    .dropdown-menu.show {
      display: block !important;
      position: absolute !important;
      top: 100% !important;
      left: 0 !important;
      z-index: 9999 !important;
      min-width: 13rem !important;
      margin-top: 4px !important;
      opacity: 1 !important;
      visibility: visible !important;
      background-color: #ffffff !important;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1) !important;
    }
    .dropdown-item {
      cursor: pointer;
    }
    ${combinedStyles}
  </style>
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
  <script>
    document.addEventListener('click', function(e) {
      // 1. Dropdown Toggle Click Handler
      var dropdownToggle = e.target.closest('.dropdown-toggle, [data-bs-toggle="dropdown"]');
      if (dropdownToggle) {
        e.preventDefault();
        e.stopPropagation();
        var parentDropdown = dropdownToggle.closest('.dropdown');
        var menu = parentDropdown ? parentDropdown.querySelector('.dropdown-menu') : null;
        if (menu) {
          var isAlreadyOpen = menu.classList.contains('show');
          // Close any open dropdowns first
          document.querySelectorAll('.dropdown-menu.show').forEach(function(m) {
            m.classList.remove('show');
            m.removeAttribute('data-bs-popper');
          });
          document.querySelectorAll('.dropdown-toggle[aria-expanded="true"]').forEach(function(t) {
            t.setAttribute('aria-expanded', 'false');
          });
          if (!isAlreadyOpen) {
            menu.classList.add('show');
            menu.setAttribute('data-bs-popper', 'static');
            dropdownToggle.setAttribute('aria-expanded', 'true');
          }
        }
        return;
      }

      // 2. Click Outside Closes Dropdown
      if (!e.target.closest('.dropdown-menu')) {
        document.querySelectorAll('.dropdown-menu.show').forEach(function(m) {
          m.classList.remove('show');
          m.removeAttribute('data-bs-popper');
        });
        document.querySelectorAll('.dropdown-toggle[aria-expanded="true"]').forEach(function(t) {
          t.setAttribute('aria-expanded', 'false');
        });
      }

      // 3. Regular Navigation Links
      var a = e.target.closest('a');
      if (a) {
        var href = (a.getAttribute('href') || '').trim();
        if (!href || href === '#' || href.startsWith('javascript:')) {
          e.preventDefault();
          return;
        }
        e.preventDefault();
        window.parent.postMessage({ type: 'DEMO_NAV', href: href, text: a.textContent || '' }, '*');
        return;
      }

      // 4. Cart / Add Buttons
      var btn = e.target.closest('button, .btn');
      if (btn) {
        var txt = (btn.textContent || '').toLowerCase();
        if (txt.includes('cart') || txt.includes('add')) {
          e.preventDefault();
          window.parent.postMessage({ type: 'DEMO_CART' }, '*');
        }
      }
    });
  <\/script>
</head>
<body>
  ${combinedHtml}
  ${combinedJs ? `\n  <script>\n    ${combinedJs}\n  <\/script>` : ''}
</body>
</html>`;

    this.safeFullDemoSrcDoc = this.sanitizer.bypassSecurityTrustHtml(iframeHtmlDoc);
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
    const anchor = target?.closest('a') as HTMLAnchorElement | null;
    const button = target?.closest('button') as HTMLButtonElement | null;

    if (anchor) {
      event.preventDefault();
      event.stopPropagation();
      const href = (anchor.getAttribute('href') || '').toLowerCase();
      const text = (anchor.textContent || '').toLowerCase();

      if (href.includes('request') || text.includes('request')) {
        this.setPreviewPage('request-service');
        this.toast.info('Navigated to Request a Service in live preview.');
      } else if (href.includes('about') || text.includes('about')) {
        this.setPreviewPage('about');
        this.toast.info('Navigated to About Us in live preview.');
      } else if (href.includes('services') || text.includes('service') || text.includes('solution')) {
        this.setPreviewPage('services');
        this.toast.info('Navigated to Services & Solutions in live preview.');
      } else if (href.includes('blog') || text.includes('blog') || text.includes('news') || text.includes('article')) {
        this.setPreviewPage('blog');
        this.toast.info('Navigated to News & Insights in live preview.');
      } else if (href.includes('contact') || text.includes('contact')) {
        this.setPreviewPage('contact');
        this.toast.info('Navigated to Contact Headquarters in live preview.');
      } else if (href.includes('home') || text.includes('home') || anchor.classList.contains('navbar-brand')) {
        this.setPreviewPage('home');
        this.toast.info('Navigated to Home in live preview.');
      }
    } else if (button) {
      const btnText = (button.textContent || '').toLowerCase();
      if (btnText.includes('add') || btnText.includes('cart') || button.classList.contains('btn-primary')) {
        if (btnText.includes('add') || btnText.includes('cart')) {
          event.preventDefault();
          event.stopPropagation();
          this.previewCartCount++;
          this.toast.success(`Item added to cart! (${this.previewCartCount} items in cart)`);
          this.renderFullSitePreview();
        }
      }
    }
  }

  closeFullSiteDemoModal(): void {
    this.showFullSiteDemoModal = false;
    this.safeFullDemoHtml = '';
    this.safeFullDemoSrcDoc = '';
    const styleEl = document.getElementById('oz-full-demo-preview-css');
    if (styleEl) styleEl.remove();
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

    const payload = {
      templateId: item.dbId || null,
      templateKey: item.id,
      variantCode: item.variantCode,
      targetPageSlug: this.targetPageSlug,
      insertPosition: this.insertPosition,
      customContentJson: JSON.stringify(this.previewContent)
    };

    this.api.post<any>('ContentApi/templates/assign-to-page', payload).subscribe({
      next: () => {
        this.toast.success(`'${item.name}' inserted into ${this.targetPageSlug.toUpperCase()} page with showcase content!`);
        this.closeAssignModal();
        this.router.navigate(['/content/console']);
      },
      error: (err) => {
        const msg = err?.error?.message || 'Failed to insert section into page.';
        this.toast.error(msg);
      }
    });
  }

  openUninstallModal(item: InstalledTemplateItem): void {
    this.itemToUninstall = item;
    this.showUninstallModal = true;
  }

  closeUninstallModal(): void {
    this.showUninstallModal = false;
    this.itemToUninstall = null;
    this.uninstallingTemplate = false;
  }

  confirmUninstallTemplate(): void {
    if (!this.itemToUninstall) return;
    const item = this.itemToUninstall;
    this.uninstallingTemplate = true;

    this.installedTemplates = this.installedTemplates.filter(t => t.id !== item.id);
    this.saveInstalledTemplates();
    this.applyFilters();

    if (item.dbId) {
      this.api.delete<any>(`ContentApi/templates/installed/${item.dbId}`).subscribe({
        next: () => {
          this.uninstallingTemplate = false;
          this.toast.success(`Template '${item.name}' uninstalled.`);
          this.closeUninstallModal();
        },
        error: () => {
          this.uninstallingTemplate = false;
          this.toast.success(`Template '${item.name}' uninstalled from local library.`);
          this.closeUninstallModal();
        }
      });
    } else {
      this.uninstallingTemplate = false;
      this.toast.success(`Template '${item.name}' uninstalled.`);
      this.closeUninstallModal();
    }
  }
}
