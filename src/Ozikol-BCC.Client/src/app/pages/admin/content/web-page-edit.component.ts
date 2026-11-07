import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';

/**
 * System page descriptor representing built-in application routes.
 */
interface SystemPageOption {
  title: string;
  slug: string;
  icon: string;
  desc: string;
}

/**
 * Unified Full-Width 8-Row Card Studio for Creating and Editing WebPages.
 * Follows the sequential card architecture:
 * - Row 1: Title & Auto-Generated Direct URL (https:// preview & collision auto-increment)
 * - Row 2: Category & Hierarchy (Dropdown Group & Parent Page)
 * - Row 3: Navigation Placements & Positions (Zones, Header, Dropdown, Footer, Top Bar, CTA)
 * - Row 4: Page Destination Type (Modular Section Page vs. Built-in System Page vs. Direct URL)
 * - Row 5: Page Breadcrumb & Header Banner Background Image (Custom breadcrumb background)
 * - Row 6: Publishing, Access & Styling (Publish, Home Page, Security, Legal, Custom CSS)
 * - Row 7: SEO & Meta Information (Meta Title, Description, Keywords, Tags)
 * - Row 8: [Edit Mode Only] Audit Metadata & Jump to Section Builder
 */
@Component({
  selector: 'app-web-page-edit',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="cms-page-container">
      <!-- Full-Width Page Header -->
      <div class="page-header">
        <div class="header-titles">
          <div class="breadcrumb">
            <a routerLink="/content/console">CMS Studio</a>
            <span class="sep">/</span>
            <a routerLink="/content/console/pages">All Web Pages</a>
            <span class="sep">/</span>
            <span class="current">{{ isEditMode ? 'Edit Web Page' : 'Create Web Page' }}</span>
          </div>
          <h1>{{ isEditMode ? ('Edit Page: ' + (page?.title || '')) : 'Create Dynamic Web Page' }}</h1>
          <p class="subtitle">
            {{ isEditMode 
              ? 'Complete configuration of SEO parameters, multi-zone navigation visibility, direct routing, and banner assets.' 
              : 'Add a new navigable webpage, configure URL routing, and set navigation placements.' }}
          </p>
        </div>
        <div class="header-actions">
          <a *ngIf="isEditMode" [href]="livePageUrl" target="_blank" class="btn btn-outline" title="Open live published page in a new browser tab">
            <span class="material-symbols-outlined">open_in_new</span>
            <span>View Live Page ↗</span>
          </a>
          <a *ngIf="isEditMode" [routerLink]="['/content/console/pages/details', pageId]" class="btn btn-outline">
            <span class="material-symbols-outlined">layers</span>
            <span>Manage Sections</span>
          </a>
          <a routerLink="/content/console/pages" class="btn btn-outline">
            <span class="material-symbols-outlined">arrow_back</span>
            <span>Back to Pages</span>
          </a>
          <button type="button" class="btn btn-primary" (click)="savePage()" [disabled]="saving || loading">
            <span class="material-symbols-outlined">save</span>
            <span *ngIf="!saving">{{ isEditMode ? 'Save Page Changes' : 'Create Web Page' }}</span>
            <span *ngIf="saving">Saving...</span>
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div class="loading-box" *ngIf="loading">
        <span class="material-symbols-outlined spin">progress_activity</span>
        <p>Loading page details...</p>
      </div>

      <!-- Form Cards Layout: Sequential Card Architecture -->
      <div class="cards-stack" *ngIf="!loading && page">

        <!-- ======================================================== -->
        <!-- ROW 1: Page Title & Auto-Generated Direct URL (Slug)     -->
        <!-- ======================================================== -->
        <div class="row-card">
          <div class="row-card-header">
            <div class="row-num-tag">1</div>
            <div class="row-title-box">
              <div class="row-title-heading">
                <h3>Page Title &amp; Direct URL Slug</h3>
                <button type="button" class="btn-info-pop" [class.active]="isDescOpen(1)" (click)="toggleDesc(1)" title="Click to view explanation for this section">
                  <span class="material-symbols-outlined">info</span>
                </button>
              </div>
              <div class="row-desc-drawer" *ngIf="isDescOpen(1)">
                <span class="material-symbols-outlined desc-info-icon">lightbulb</span>
                <span>Primary naming and browser address path for visitors.</span>
              </div>
            </div>
            <span class="badge-status" [class.published]="page.publish" [class.draft]="!page.publish">
              {{ page.publish ? 'Published' : 'Draft / Offline' }}
            </span>
          </div>

          <div class="row-card-body">
            <!-- AI Auto-Pilot Switch -->
            <div style="display: flex; align-items: flex-start; gap: 12px; padding: 12px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 16px;">
              <input type="checkbox" id="disableAiAutoFill" [(ngModel)]="page.disableAiAutoFill" name="disableAiAutoFill" style="cursor: pointer; width: 18px; height: 18px; margin-top: 2px;">
              <div style="flex: 1;">
                <label for="disableAiAutoFill" style="font-size: 13px; font-weight: 700; color: #0f172a; cursor: pointer; display: block; margin-bottom: 2px;">
                  Disable AI Auto-Fill &amp; Continuous SEO Updates
                </label>
                <div style="font-size: 12px; color: #64748b;">
                  When unchecked (default: false), AI automatically synthesizes and optimizes your Meta Title, Description, and Keywords from page layout content. Check this to lock and manually manage SEO metadata.
                </div>
              </div>
            </div>

            <div class="form-grid-2">
              <!-- Page Title -->
              <div class="form-group">
                <label class="form-label">
                  PAGE TITLE <span class="req">*</span>
                </label>
                <div class="input-with-icon">
                  <span class="material-symbols-outlined input-icon">title</span>
                  <input 
                    type="text" 
                    [(ngModel)]="page.title" 
                    (input)="onTitleInput()" 
                    class="form-control" 
                    placeholder="e.g. About Our Mission"
                  />
                </div>
                <small class="help-text">Human-readable label shown in menus, page banners, and search lists.</small>
              </div>

              <!-- Direct URL Slug -->
              <div class="form-group">
                <label class="form-label">
                  DIRECT URL SLUG <span class="req">*</span>
                </label>
                <div class="url-input-addon-group">
                  <span class="addon-prefix">https://{{ activeHost }}</span>
                  <input 
                    type="text" 
                    [(ngModel)]="page.directUrl" 
                    (input)="onSlugManualEdit()"
                    class="form-control url-input-control" 
                    placeholder="/about-our-mission"
                  />
                </div>
                <small class="help-text">
                  Auto-generated from title. Checks existing pages and appends <code>-1</code>, <code>-2</code> if a collision is found.
                </small>
              </div>
            </div>

            <!-- Live URL Preview Pill -->
            <div class="live-url-banner">
              <div class="url-meta">
                <span class="material-symbols-outlined text-blue">link</span>
                <span class="url-label">Live Visitor URL:</span>
                <code class="url-value">{{ livePageUrl }}</code>
              </div>
              <div class="url-badges">
                <a *ngIf="isEditMode" [href]="livePageUrl" target="_blank" class="btn-live-link" title="Open live page in a new browser tab">
                  <span class="material-symbols-outlined icon-sm">open_in_new</span>
                  <span>View Page ↗</span>
                </a>
                <span class="pill pill-success" *ngIf="!slugHasCollision && page.directUrl">
                  <span class="material-symbols-outlined icon-sm">check_circle</span> Unique URL
                </span>
                <span class="pill pill-warning" *ngIf="slugHasCollision">
                  <span class="material-symbols-outlined icon-sm">auto_fix</span> Auto-Incremented Collision Free
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- ======================================================== -->
        <!-- ROW 2: Category & Hierarchy                              -->
        <!-- ======================================================== -->
        <div class="row-card">
          <div class="row-card-header">
            <div class="row-num-tag">2</div>
            <div class="row-title-box">
              <div class="row-title-heading">
                <h3>Menu Category &amp; Page Hierarchy</h3>
                <button type="button" class="btn-info-pop" [class.active]="isDescOpen(2)" (click)="toggleDesc(2)" title="Click to view explanation for this section">
                  <span class="material-symbols-outlined">info</span>
                </button>
              </div>
              <div class="row-desc-drawer" *ngIf="isDescOpen(2)">
                <span class="material-symbols-outlined desc-info-icon">lightbulb</span>
                <span>Group this page inside a dropdown menu or nest it beneath a parent page.</span>
              </div>
            </div>
          </div>

          <div class="row-card-body">
            <div class="form-grid-2">
              <!-- Menu Category -->
              <div class="form-group">
                <label class="form-label">MENU CATEGORY (DROPDOWN GROUP)</label>
                <div class="input-with-icon">
                  <span class="material-symbols-outlined input-icon">folder</span>
                  <select [(ngModel)]="page.pageCategoryId" class="form-control">
                    <option [ngValue]="null">None (Standalone Page)</option>
                    <option *ngFor="let cat of categories" [ngValue]="cat.id">{{ cat.title }}</option>
                  </select>
                </div>
                <small class="help-text">Assign to a parent dropdown category (e.g. "Company", "Services") in the navbar.</small>
              </div>

              <!-- Parent Page -->
              <div class="form-group">
                <label class="form-label">PARENT PAGE (SUB-PAGE HIERARCHY)</label>
                <div class="input-with-icon">
                  <span class="material-symbols-outlined input-icon">account_tree</span>
                  <select [(ngModel)]="page.mainPageId" class="form-control">
                    <option [ngValue]="null">None (Top-Level Page)</option>
                    <option *ngFor="let p of otherPages" [ngValue]="p.id">{{ p.title }} ({{ p.directUrl || p.slug }})</option>
                  </select>
                </div>
                <small class="help-text">Enables nested breadcrumbs and multi-level hierarchical site maps.</small>
              </div>
            </div>
          </div>
        </div>

        <!-- ======================================================== -->
        <!-- ROW 3: Positions & Navigation Placements                 -->
        <!-- ======================================================== -->
        <div class="row-card">
          <div class="row-card-header">
            <div class="row-num-tag">3</div>
            <div class="row-title-box">
              <div class="row-title-heading">
                <h3>Navigation Placements &amp; Positions</h3>
                <button type="button" class="btn-info-pop" [class.active]="isDescOpen(3)" (click)="toggleDesc(3)" title="Click to view explanation for this section">
                  <span class="material-symbols-outlined">info</span>
                </button>
              </div>
              <div class="row-desc-drawer" *ngIf="isDescOpen(3)">
                <span class="material-symbols-outlined desc-info-icon">lightbulb</span>
                <span>Select which zones and website headers/footers will render this page link.</span>
              </div>
            </div>
          </div>

          <div class="row-card-body">
            <!-- Menu Zone Position Selector -->
            <div class="form-group zone-selector-group">
              <label class="form-label">HEADER NAVIGATION ZONE POSITION</label>
              <div class="zone-options-grid">
                <label class="zone-option-card" [class.selected]="page.menuPosition === 1">
                  <input type="radio" name="menuZone" [value]="1" [(ngModel)]="page.menuPosition">
                  <div class="zone-card-content">
                    <span class="zone-title">First Zone (Left / Start)</span>
                    <span class="zone-desc">Rendered at the beginning of the primary navbar.</span>
                  </div>
                </label>

                <label class="zone-option-card" [class.selected]="page.menuPosition === 2">
                  <input type="radio" name="menuZone" [value]="2" [(ngModel)]="page.menuPosition">
                  <div class="zone-card-content">
                    <span class="zone-title">Middle Zone (Center)</span>
                    <span class="zone-desc">Rendered in the center section of split navbars.</span>
                  </div>
                </label>

                <label class="zone-option-card" [class.selected]="page.menuPosition === 3">
                  <input type="radio" name="menuZone" [value]="3" [(ngModel)]="page.menuPosition">
                  <div class="zone-card-content">
                    <span class="zone-title">Last Zone (Right / End)</span>
                    <span class="zone-desc">Rendered at the trailing end near the search/auth buttons.</span>
                  </div>
                </label>

                <label class="zone-option-card" [class.selected]="page.menuPosition === 4">
                  <input type="radio" name="menuZone" [value]="4" [(ngModel)]="page.menuPosition">
                  <div class="zone-card-content">
                    <span class="zone-title">Top Utility Bar</span>
                    <span class="zone-desc">Rendered in the upper auxiliary strip above main navbar.</span>
                  </div>
                </label>
              </div>
            </div>

            <!-- Placements Grid -->
            <div class="placements-grid">
              <!-- 1. Main Header Navbar -->
              <div class="placement-toggle-box" [class.active]="page.showInMainMenu">
                <div class="toggle-row">
                  <label class="toggle-label">
                    <input type="checkbox" [(ngModel)]="page.showInMainMenu">
                    <span class="toggle-text">
                      <strong>Main Header Navbar</strong>
                      <small>Top-level navigation link in the header.</small>
                    </span>
                  </label>
                  <div class="sort-input-box" *ngIf="page.showInMainMenu">
                    <label>Order:</label>
                    <input type="number" [(ngModel)]="page.mainMenuSortOrder" class="sm-sort" placeholder="0">
                  </div>
                </div>
              </div>

              <!-- 2. Inside Category Dropdown -->
              <div class="placement-toggle-box" [class.active]="page.showInMenuDropDown" [class.disabled-box]="!page.pageCategoryId">
                <div class="toggle-row">
                  <label class="toggle-label">
                    <input type="checkbox" [(ngModel)]="page.showInMenuDropDown" [disabled]="!page.pageCategoryId">
                    <span class="toggle-text">
                      <strong>Inside Category Dropdown</strong>
                      <small *ngIf="page.pageCategoryId">Nested inside the selected Category dropdown.</small>
                      <small *ngIf="!page.pageCategoryId" class="text-warn">Requires a Category selected in Row 2.</small>
                    </span>
                  </label>
                  <div class="sort-input-box" *ngIf="page.showInMenuDropDown && page.pageCategoryId">
                    <label>Order:</label>
                    <input type="number" [(ngModel)]="page.dropdownSortOrder" class="sm-sort" placeholder="0">
                  </div>
                </div>
              </div>

              <!-- 3. Footer Column -->
              <div class="placement-toggle-box" [class.active]="page.showInFooter">
                <div class="toggle-row">
                  <label class="toggle-label">
                    <input type="checkbox" [(ngModel)]="page.showInFooter">
                    <span class="toggle-text">
                      <strong>Website Footer Column</strong>
                      <small>Displays in website footer link columns.</small>
                    </span>
                  </label>
                  <div class="sort-input-box" *ngIf="page.showInFooter">
                    <label>Order:</label>
                    <input type="number" [(ngModel)]="page.footerSortOrder" class="sm-sort" placeholder="0">
                  </div>
                </div>
              </div>

              <!-- 4. Top Utility Bar -->
              <div class="placement-toggle-box" [class.active]="page.showInTopBar">
                <div class="toggle-row">
                  <label class="toggle-label">
                    <input type="checkbox" [(ngModel)]="page.showInTopBar">
                    <span class="toggle-text">
                      <strong>Top Utility Bar</strong>
                      <small>Displays beside telephone &amp; contact info strip.</small>
                    </span>
                  </label>
                  <div class="sort-input-box" *ngIf="page.showInTopBar">
                    <label>Order:</label>
                    <input type="number" [(ngModel)]="page.topBarSortOrder" class="sm-sort" placeholder="0">
                  </div>
                </div>
              </div>

              <!-- 5. Footer Bottom Compliance Bar -->
              <div class="placement-toggle-box" [class.active]="page.showInFooterBottom">
                <div class="toggle-row">
                  <label class="toggle-label">
                    <input type="checkbox" [(ngModel)]="page.showInFooterBottom">
                    <span class="toggle-text">
                      <strong>Footer Bottom Bar (Compliance)</strong>
                      <small>Displays in the legal bar beside copyright notice.</small>
                    </span>
                  </label>
                  <div class="sort-input-box" *ngIf="page.showInFooterBottom">
                    <label>Order:</label>
                    <input type="number" [(ngModel)]="page.footerBottomSortOrder" class="sm-sort" placeholder="0">
                  </div>
                </div>
              </div>

              <!-- 6. Menu CTA Action Button -->
              <div class="placement-toggle-box cta-toggle-box" [class.active]="page.isMenuCTA">
                <div class="toggle-row">
                  <label class="toggle-label">
                    <input type="checkbox" [(ngModel)]="page.isMenuCTA">
                    <span class="toggle-text">
                      <strong>Header Action CTA Button</strong>
                      <small>Renders as a prominent call-to-action button in the menu.</small>
                    </span>
                  </label>
                </div>

                <div class="cta-expanded-fields" *ngIf="page.isMenuCTA">
                  <div class="form-grid-3">
                    <div class="form-group">
                      <label class="form-label">CTA BUTTON TEXT</label>
                      <input type="text" [(ngModel)]="page.menuCtaText" class="form-control" placeholder="e.g. Get Started">
                    </div>
                    <div class="form-group">
                      <label class="form-label">CTA DESTINATION URL</label>
                      <input type="text" [(ngModel)]="page.menuCtaUrl" list="ctaDestOptions" class="form-control" placeholder="e.g. /register or /login">
                      <datalist id="ctaDestOptions">
                        <option [value]="registrationSlug">Member Registration ("Get Started") — Configured in User Manager > Form Builder</option>
                        <option value="/login">Member &amp; Staff Login (Auto-routes by role)</option>
                        <option value="/contact">Contact &amp; Inquiries</option>
                      </datalist>
                    </div>
                    <div class="form-group">
                      <label class="form-label">CTA BUTTON STYLE</label>
                      <select [(ngModel)]="page.menuCtaStyle" class="form-control">
                        <option value="primary">Primary (Solid Brand)</option>
                        <option value="outline">Outline (Subtle Border)</option>
                        <option value="accent">Accent (High Contrast)</option>
                        <option value="gradient">Gradient (Vibrant)</option>
                      </select>
                    </div>
                  </div>
                  <!-- Quick Preset Pills for CTA Route -->
                  <div class="cta-quick-pills">
                    <span class="quick-pill-label">Quick Action:</span>
                    <button type="button" class="cta-pill-btn" (click)="setCtaDestination(registrationSlug, 'Get Started')">
                      <span class="material-symbols-outlined">how_to_reg</span>
                      <span>Register / Get Started ({{ registrationSlug }})</span>
                    </button>
                    <button type="button" class="cta-pill-btn" (click)="setCtaDestination('/login', 'Sign In')">
                      <span class="material-symbols-outlined">login</span>
                      <span>Member Login (/login)</span>
                    </button>
                    <button type="button" class="cta-pill-btn" (click)="setCtaDestination('/contact', 'Contact Us')">
                      <span class="material-symbols-outlined">mail</span>
                      <span>Contact (/contact)</span>
                    </button>
                  </div>

                  <!-- Contextual notice when CTA points to registration -->
                  <div *ngIf="page.menuCtaUrl === registrationSlug || page.menuCtaUrl === '/register'" class="cta-reg-hint-banner">
                    <div class="cta-hint-left">
                      <span class="material-symbols-outlined hint-icon">tune</span>
                      <div>
                        <strong>Dynamic Onboarding Form Connected</strong>
                        <p>This button routes to your live onboarding form configured in <strong>User Manager &gt; Registration Form Builder</strong>. If you want to change questions, required fields, or presentation layout, adjust it in the form builder.</p>
                      </div>
                    </div>
                    <a routerLink="/admin/users/registration-form" target="_blank" class="btn-jump-form-builder-sm">
                      <span class="material-symbols-outlined">edit_document</span>
                      <span>Adjust in Form Builder</span>
                      <span class="material-symbols-outlined jump-arrow">open_in_new</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ======================================================== -->
        <!-- ROW 4: Destination Type (Section vs. System vs. Direct)  -->
        <!-- ======================================================== -->
        <div class="row-card">
          <div class="row-card-header">
            <div class="row-num-tag">4</div>
            <div class="row-title-box">
              <div class="row-title-heading">
                <h3>Page Destination &amp; Content Type</h3>
                <button type="button" class="btn-info-pop" [class.active]="isDescOpen(4)" (click)="toggleDesc(4)" title="Click to view explanation for this section">
                  <span class="material-symbols-outlined">info</span>
                </button>
              </div>
              <div class="row-desc-drawer" *ngIf="isDescOpen(4)">
                <span class="material-symbols-outlined desc-info-icon">lightbulb</span>
                <span>Choose if this is a custom CMS section page, a built-in system app (login, blog, store), or a direct URL.</span>
              </div>
            </div>
          </div>

          <div class="row-card-body">
            <!-- 3-Way Choice Cards -->
            <div class="dest-type-grid">
              <!-- Type 1: Modular Section Page -->
              <div 
                class="dest-card" 
                [class.selected]="destinationType === 'section'"
                (click)="setDestinationType('section')"
              >
                <div class="dest-icon-box bg-blue">
                  <span class="material-symbols-outlined">view_quilt</span>
                </div>
                <div class="dest-card-content">
                  <h4>Modular Section Page</h4>
                  <p>Build custom content with hero blocks, feature grids, media showcases, and forms.</p>
                  <span class="dest-badge">CMS Page Builder</span>
                </div>
                <span class="radio-indicator"></span>
              </div>

              <!-- Type 2: Built-in System Feature Page -->
              <div 
                class="dest-card" 
                [class.selected]="destinationType === 'system'"
                (click)="setDestinationType('system')"
              >
                <div class="dest-icon-box bg-purple">
                  <span class="material-symbols-outlined">apps</span>
                </div>
                <div class="dest-card-content">
                  <h4>Built-in System Page</h4>
                  <p>Link directly to core apps like Blog, Storefront, Member Login, or Registration.</p>
                  <span class="dest-badge bg-purple-light">Ready-Made App</span>
                </div>
                <span class="radio-indicator"></span>
              </div>

              <!-- Type 3: Direct URL / External Redirect -->
              <div 
                class="dest-card" 
                [class.selected]="destinationType === 'direct'"
                (click)="setDestinationType('direct')"
              >
                <div class="dest-icon-box bg-amber">
                  <span class="material-symbols-outlined">open_in_new</span>
                </div>
                <div class="dest-card-content">
                  <h4>Direct URL / External Link</h4>
                  <p>Direct navigation to an external website or custom standalone route.</p>
                  <span class="dest-badge bg-amber-light">Direct Route</span>
                </div>
                <span class="radio-indicator"></span>
              </div>
            </div>

            <!-- Dynamic Settings for System Page -->
            <div class="sub-config-box" *ngIf="destinationType === 'system'">
              <div class="form-group">
                <label class="form-label">
                  SELECT BUILT-IN SYSTEM FEATURE <span class="req">*</span>
                </label>
                <div class="system-page-select-wrapper">
                  <select 
                    class="form-control select-lg" 
                    [(ngModel)]="selectedSystemPage" 
                    (change)="onSystemPageSelect(selectedSystemPage)"
                  >
                    <option *ngFor="let sp of systemPages" [value]="sp.slug">
                      {{ sp.title }} ({{ sp.slug }}) — {{ sp.desc }}
                    </option>
                  </select>
                </div>
                <small class="help-text">
                  Selecting a system feature auto-populates the direct route and sets up seamless client-side routing.
                </small>

                <!-- Registration Form Builder Notice & Direct Adjustment Link -->
                <div *ngIf="selectedSystemPage === registrationSlug || selectedSystemPage === '/register'" class="system-page-hint-banner">
                  <div class="hint-banner-left">
                    <span class="material-symbols-outlined hint-icon">tune</span>
                    <div>
                      <strong>Dynamic Onboarding Form Connected</strong>
                      <p>This page automatically renders the live onboarding form configured in <strong>User Manager &gt; Registration Form Builder</strong>. If you want to customize questions, required fields, sector archetypes, or presentation layout, adjust it in the form builder.</p>
                    </div>
                  </div>
                  <a routerLink="/admin/users/registration-form" target="_blank" class="btn-jump-form-builder">
                    <span class="material-symbols-outlined">edit_document</span>
                    <span>Adjust in Form Builder</span>
                    <span class="material-symbols-outlined jump-arrow">open_in_new</span>
                  </a>
                </div>
              </div>
            </div>

            <!-- Dynamic Settings for Direct URL -->
            <div class="sub-config-box" *ngIf="destinationType === 'direct'">
              <div class="form-group">
                <label class="form-label">
                  CUSTOM DIRECT / EXTERNAL URL <span class="req">*</span>
                </label>
                <input 
                  type="text" 
                  [(ngModel)]="page.directUrl" 
                  class="form-control" 
                  placeholder="https://example.com/resource or /custom-route"
                />
                <small class="help-text">
                  Enter full external URL starting with <code>https://</code> or relative path (e.g. <code>/downloads</code>).
                </small>
              </div>
            </div>
          </div>
        </div>

        <!-- ======================================================== -->
        <!-- ROW 5: Page Breadcrumb & Header Banner Background Image  -->
        <!-- ======================================================== -->
        <div class="row-card">
          <div class="row-card-header">
            <div class="row-num-tag bg-purple-tag">5</div>
            <div class="row-title-box">
              <div class="row-title-heading">
                <h3>Page Breadcrumb &amp; Header Banner Background Image</h3>
                <button type="button" class="btn-info-pop" [class.active]="isDescOpen(5)" (click)="toggleDesc(5)" title="Click to view explanation for this section">
                  <span class="material-symbols-outlined">info</span>
                </button>
              </div>
              <div class="row-desc-drawer" *ngIf="isDescOpen(5)">
                <span class="material-symbols-outlined desc-info-icon">lightbulb</span>
                <span>Custom background image rendered behind the page title and breadcrumb navigation trail across the top of this page.</span>
              </div>
            </div>
          </div>

          <div class="row-card-body">
            <div class="form-group">
              <label class="form-label">BREADCRUMB HEADER BANNER IMAGE</label>
              <div class="input-with-upload">
                <input 
                  type="text" 
                  [(ngModel)]="page.imageUrl" 
                  class="form-control" 
                  placeholder="e.g. https://yourdomain.com/banners/about-banner.jpg"
                />
                <label class="btn-upload" [class.uploading]="uploading">
                  <input type="file" (change)="uploadImage($event)" accept="image/*" style="display:none">
                  <span class="material-symbols-outlined">cloud_upload</span>
                  <span>{{ uploading ? 'Uploading...' : 'Upload Image' }}</span>
                </label>
              </div>
              <small class="help-text">
                This image is loaded by the theme's Breadcrumb Hero section behind the title and navigation path. Recommended resolution: <strong>1920 &times; 450 px</strong>. If left blank, the template's default breadcrumb background is used.
              </small>
            </div>

            <!-- Live Breadcrumb Hero Preview Overlay -->
            <div class="breadcrumb-live-preview-card" *ngIf="page.imageUrl">
              <div class="breadcrumb-preview-backdrop" [style.background-image]="'url(' + page.imageUrl + ')'">
                <div class="breadcrumb-preview-overlay">
                  <span class="preview-badge">Live Breadcrumb Header Preview</span>
                  <h2 class="preview-page-title">{{ page.title || 'Page Title' }}</h2>
                  <div class="preview-crumbs">
                    <span>Home</span>
                    <span class="crumb-sep">/</span>
                    <span class="crumb-current">{{ page.title || 'Current Page' }}</span>
                  </div>
                </div>
                <button type="button" class="btn-remove-banner" (click)="page.imageUrl = ''; page.imageKey = ''" title="Remove custom background image and revert to template default">
                  <span class="material-symbols-outlined">delete</span>
                  <span>Remove Image (Revert to Default)</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- ======================================================== -->
        <!-- ROW 6: Publishing, Access & Styling Checkboxes           -->
        <!-- ======================================================== -->
        <div class="row-card">
          <div class="row-card-header">
            <div class="row-num-tag">6</div>
            <div class="row-title-box">
              <div class="row-title-heading">
                <h3>Publishing, Access &amp; Styling</h3>
                <button type="button" class="btn-info-pop" [class.active]="isDescOpen(6)" (click)="toggleDesc(6)" title="Click to view explanation for this section">
                  <span class="material-symbols-outlined">info</span>
                </button>
              </div>
              <div class="row-desc-drawer" *ngIf="isDescOpen(6)">
                <span class="material-symbols-outlined desc-info-icon">lightbulb</span>
                <span>Control live visitor availability, access control permissions, and custom CSS styling.</span>
              </div>
            </div>
          </div>

          <div class="row-card-body">
            <div class="checkbox-row-grid">
              <!-- Publish Page -->
              <label class="toggle-card-item" [class.checked]="page.publish">
                <input type="checkbox" [(ngModel)]="page.publish">
                <div class="toggle-card-details">
                  <strong>Publish Page</strong>
                  <p>Make this page active, live, and publicly visible to visitors.</p>
                </div>
              </label>

              <!-- Website Root Home Page -->
              <label class="toggle-card-item" [class.checked]="page.isHomePage">
                <input type="checkbox" [(ngModel)]="page.isHomePage">
                <div class="toggle-card-details">
                  <strong>Website Root Landing Page (/)</strong>
                  <p>When enabled, acts as the primary root homepage of your tenant domain.</p>
                </div>
              </label>

              <!-- Security Protected Page -->
              <label class="toggle-card-item" [class.checked]="page.securityPage">
                <input type="checkbox" [(ngModel)]="page.securityPage">
                <div class="toggle-card-details">
                  <strong>Security Protected Page</strong>
                  <p>Requires authenticated member / staff login credentials to view.</p>
                </div>
              </label>

              <!-- Legal & Compliance Document -->
              <label class="toggle-card-item" [class.checked]="page.isLegal">
                <input type="checkbox" [(ngModel)]="page.isLegal">
                <div class="toggle-card-details">
                  <strong>Legal &amp; Compliance Document</strong>
                  <p>Flags page as Privacy Policy, Terms of Service, or Cookie Policy.</p>
                </div>
              </label>
            </div>

            <!-- Custom CSS Class & Sort Order -->
            <div class="form-grid-2 form-mt-16">
              <div class="form-group">
                <label class="form-label">CUSTOM CSS CLASS</label>
                <div class="input-with-icon">
                  <span class="material-symbols-outlined input-icon">css</span>
                  <input 
                    type="text" 
                    [(ngModel)]="page.customClass" 
                    class="form-control" 
                    placeholder="e.g. nav-highlight, text-gradient, badge-hot"
                  />
                </div>
                <small class="help-text">Injected into menu link tags and page container wrappers.</small>
              </div>

              <div class="form-group">
                <label class="form-label">GENERAL PEER SORT ORDER</label>
                <div class="input-with-icon">
                  <span class="material-symbols-outlined input-icon">reorder</span>
                  <input 
                    type="number" 
                    [(ngModel)]="page.sortOrder" 
                    class="form-control" 
                    placeholder="0"
                  />
                </div>
                <small class="help-text">Default sequence among peer pages.</small>
              </div>
            </div>

            <!-- Breaking News Ribbon Ticker Placement -->
            <div class="ribbon-ticker-config-card form-mt-16">
              <div class="ribbon-ticker-header">
                <div class="ribbon-title-wrap">
                  <span class="material-symbols-outlined text-orange">campaign</span>
                  <div>
                    <strong>Breaking News Ribbon Ticker</strong>
                    <p>Feature this webpage in the live marquee ribbon on the public website</p>
                  </div>
                </div>
                <label class="toggle-card-item ribbon-toggle" [class.checked]="page.addToRibon">
                  <input type="checkbox" [(ngModel)]="page.addToRibon">
                  <span>Add to Ribbon</span>
                </label>
              </div>

              <div class="form-grid-2 form-mt-16" *ngIf="page.addToRibon">
                <div class="form-group">
                  <label class="form-label">CUSTOM TICKER HEADLINE (OPTIONAL)</label>
                  <div class="input-with-icon">
                    <span class="material-symbols-outlined input-icon">title</span>
                    <input 
                      type="text" 
                      [(ngModel)]="page.ribonCustomDisplayTitle" 
                      class="form-control" 
                      placeholder="e.g. Special Announcement: Annual Registration Now Open"
                    />
                  </div>
                  <small class="help-text">Overrides the standard page title in the live marquee ticker.</small>
                </div>

                <div class="form-group">
                  <label class="form-label">TICKER SORT ORDER</label>
                  <div class="input-with-icon">
                    <span class="material-symbols-outlined input-icon">sort</span>
                    <input 
                      type="number" 
                      [(ngModel)]="page.ribonSortOrder" 
                      class="form-control" 
                      placeholder="0"
                    />
                  </div>
                  <small class="help-text">Order sequence relative to other ticker items (0 = first).</small>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ======================================================== -->
        <!-- ROW 7: SEO & Meta Information                            -->
        <!-- ======================================================== -->
        <div class="row-card">
          <div class="row-card-header">
            <div class="row-num-tag">7</div>
            <div class="row-title-box">
              <div class="row-title-heading" style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <h3>SEO Meta Information &amp; Tags</h3>
                  <button type="button" class="btn-info-pop" [class.active]="isDescOpen(7)" (click)="toggleDesc(7)" title="Click to view explanation for this section">
                    <span class="material-symbols-outlined">info</span>
                  </button>
                </div>
                <button type="button" (click)="generateSeoWithAi()" [disabled]="isGeneratingSeo || page.disableAiAutoFill" class="btn btn-sm" style="display: inline-flex; align-items: center; gap: 6px; font-weight: 700; font-size: 12px; padding: 5px 12px; border-radius: 6px; border: 1px solid #0050e5; color: #0050e5; background: #eff6ff; cursor: pointer;">
                  <span class="material-symbols-outlined" style="font-size: 16px;">{{ isGeneratingSeo ? 'sync' : 'auto_awesome' }}</span>
                  <span>{{ isGeneratingSeo ? 'Analyzing...' : '⚡ Auto-Generate with AI' }}</span>
                </button>
              </div>
              <div class="row-desc-drawer" *ngIf="isDescOpen(7)">
                <span class="material-symbols-outlined desc-info-icon">lightbulb</span>
                <span>Optimize for Google indexing, browser tab title, search snippets, and page grouping tags.</span>
              </div>
            </div>
          </div>

          <div class="row-card-body">
            <div class="form-grid-2">
              <!-- Meta Title -->
              <div class="form-group">
                <label class="form-label">META TITLE (BROWSER TAB / GOOGLE)</label>
                <input 
                  type="text" 
                  [(ngModel)]="page.metaTitle" 
                  class="form-control" 
                  placeholder="e.g. About Our Mission | My Company"
                />
                <small class="help-text">Renders in the HTML &lt;title&gt; tag for search engines and browser tabs.</small>
              </div>

              <!-- Meta Keywords -->
              <div class="form-group">
                <label class="form-label">META KEYWORDS</label>
                <input 
                  type="text" 
                  [(ngModel)]="page.metaKeywords" 
                  class="form-control" 
                  placeholder="e.g. consulting, enterprise, cloud, logistics"
                />
                <small class="help-text">Comma-separated keywords for search engine crawler indexing.</small>
              </div>
            </div>

            <!-- Meta Description -->
            <div class="form-group form-mt-12">
              <label class="form-label">META DESCRIPTION</label>
              <textarea 
                rows="3" 
                [(ngModel)]="page.metaDescription" 
                class="form-control" 
                placeholder="Brief 150-160 character description of this page for Google snippets..."
              ></textarea>
              <small class="help-text">Appears in Google search result previews below the page title.</small>
            </div>

            <!-- Page Tags & Grouping Shelf -->
            <div class="form-group form-mt-16">
              <label class="form-label">PAGE TAGS &amp; GROUPS</label>
              <div class="tags-chips-container" *ngIf="tagsList.length > 0">
                <span class="tag-badge" *ngFor="let t of tagsList">
                  #{{ t }}
                  <button type="button" class="tag-remove-btn" (click)="removeTag(t)" title="Remove tag">&times;</button>
                </span>
              </div>

              <div class="tag-input-group">
                <span class="material-symbols-outlined tag-icon">label</span>
                <input
                  type="text"
                  [(ngModel)]="newTagInput"
                  (keydown.enter)="addTag($event)"
                  (keydown.comma)="addTag($event)"
                  (input)="filterTags()"
                  placeholder="Type tag name & press Enter..."
                  class="tag-text-input"
                />
                <button type="button" class="btn-add-tag" (click)="addTag($event)" [disabled]="!newTagInput.trim()">
                  + Add
                </button>
              </div>

              <!-- Tag Suggestions -->
              <div class="available-tags-shelf" *ngIf="unselectedAvailableTags.length > 0">
                <small class="shelf-label">Existing site tags:</small>
                <div class="shelf-chips">
                  <span class="shelf-chip" *ngFor="let at of unselectedAvailableTags" (click)="selectTag(at)">
                    + {{ at }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ======================================================== -->
        <!-- ROW 8: [EDIT MODE ONLY] Audit Metadata & Section Builder -->
        <!-- ======================================================== -->
        <div class="row-card row-card-audit" *ngIf="isEditMode">
          <div class="row-card-header">
            <div class="row-num-tag bg-green-tag">8</div>
            <div class="row-title-box">
              <div class="row-title-heading">
                <h3>Lifecycle Audit &amp; Layout Sections</h3>
                <button type="button" class="btn-info-pop" [class.active]="isDescOpen(8)" (click)="toggleDesc(8)" title="Click to view explanation for this section">
                  <span class="material-symbols-outlined">info</span>
                </button>
              </div>
              <div class="row-desc-drawer" *ngIf="isDescOpen(8)">
                <span class="material-symbols-outlined desc-info-icon">lightbulb</span>
                <span>Creation and modification timestamps, cumulative view traffic, and direct builder access.</span>
              </div>
            </div>
            <div class="audit-action-group">
              <a [href]="livePageUrl" target="_blank" class="btn btn-outline" title="Open live published page in a new browser tab">
                <span class="material-symbols-outlined">open_in_new</span>
                <span>View Live Page ↗</span>
              </a>
              <a [routerLink]="['/content/console/pages/details', pageId]" class="btn btn-primary btn-manage-sections">
                <span class="material-symbols-outlined">layers</span>
                <span>Manage &amp; Build Layout Sections</span>
              </a>
            </div>
          </div>

          <div class="row-card-body">
            <div class="audit-stats-grid">
              <!-- Stat 1: Date Created -->
              <div class="audit-stat-card">
                <div class="audit-stat-icon bg-blue-light">
                  <span class="material-symbols-outlined text-blue">calendar_today</span>
                </div>
                <div class="audit-stat-info">
                  <span class="stat-label">DATE CREATED</span>
                  <strong class="stat-value">{{ page.createdAtUtc | date:'medium' }}</strong>
                </div>
              </div>

              <!-- Stat 2: Last Updated -->
              <div class="audit-stat-card">
                <div class="audit-stat-icon bg-purple-light">
                  <span class="material-symbols-outlined text-purple">update</span>
                </div>
                <div class="audit-stat-info">
                  <span class="stat-label">LAST UPDATED</span>
                  <strong class="stat-value">{{ page.updatedAtUtc ? (page.updatedAtUtc | date:'medium') : 'Never modified' }}</strong>
                </div>
              </div>

              <!-- Stat 3: Layout Sections Count -->
              <div class="audit-stat-card">
                <div class="audit-stat-icon bg-amber-light">
                  <span class="material-symbols-outlined text-amber">view_agenda</span>
                </div>
                <div class="audit-stat-info">
                  <span class="stat-label">LAYOUT SECTIONS</span>
                  <strong class="stat-value">{{ (page.pageSections?.length || 0) }} Sections Active</strong>
                </div>
              </div>

              <!-- Stat 4: Cumulative Views -->
              <div class="audit-stat-card">
                <div class="audit-stat-icon bg-green-light">
                  <span class="material-symbols-outlined text-green">visibility</span>
                </div>
                <div class="audit-stat-info">
                  <span class="stat-label">CUMULATIVE TRAFFIC</span>
                  <strong class="stat-value">{{ page.viewCount || 0 }} visits</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- Sticky Save Actions Bar at Bottom of Form -->
      <div class="bottom-action-bar" *ngIf="!loading && page">
        <a routerLink="/content/console/pages" class="btn btn-outline">
          <span class="material-symbols-outlined">arrow_back</span>
          <span>Cancel &amp; Back</span>
        </a>
        <div class="action-buttons-right">
          <a *ngIf="isEditMode" [href]="livePageUrl" target="_blank" class="btn btn-outline" title="Open live published page in a new browser tab">
            <span class="material-symbols-outlined">open_in_new</span>
            <span>View Live Page ↗</span>
          </a>
          <a *ngIf="isEditMode" [routerLink]="['/content/console/pages/details', pageId]" class="btn btn-outline">
            <span class="material-symbols-outlined">layers</span>
            <span>Jump to Section Builder</span>
          </a>
          <button type="button" class="btn btn-primary btn-save-lg" (click)="savePage()" [disabled]="saving || loading">
            <span class="material-symbols-outlined">save</span>
            <span>{{ saving ? 'Saving Changes...' : (isEditMode ? 'Save Page Changes' : 'Create Web Page') }}</span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .cms-page-container {
      display: flex;
      flex-direction: column;
      gap: 24px;
      width: 100%;
      box-sizing: border-box;
      padding-bottom: 40px;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #ffffff;
      padding: 20px 28px;
      border-radius: 16px;
      border: 1px solid #e2e8f0;
      width: 100%;
      box-sizing: border-box;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.02);
      gap: 20px;
    }
    .header-titles {
      flex: 1;
      min-width: 0;
    }
    .breadcrumb {
      font-size: 13px;
      color: #64748b;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .breadcrumb a {
      color: #0050e5;
      text-decoration: none;
      font-weight: 500;
    }
    .breadcrumb a:hover {
      text-decoration: underline;
    }
    .breadcrumb .sep {
      color: #94a3b8;
    }
    .breadcrumb .current {
      color: #334155;
      font-weight: 500;
    }
    .page-header h1 {
      font-size: 24px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 4px;
    }
    .subtitle {
      color: #64748b;
      font-size: 13.5px;
      margin: 0;
      line-height: 1.4;
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
      white-space: nowrap;
    }
    .header-actions .btn {
      margin-left: 6px;
    }
    .header-actions .btn:first-child {
      margin-left: 0;
    }
    .header-actions .btn-primary {
      margin-left: 14px;
    }

    /* Cards Stack Layout */
    .cards-stack {
      display: flex;
      flex-direction: column;
      gap: 20px;
      width: 100%;
    }

    .row-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.02);
      overflow: hidden;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }
    .row-card:hover {
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.04);
    }
    .row-card-audit {
      border-color: #86efac;
      background: linear-gradient(to bottom, #ffffff, #f0fdf4);
    }

    .row-card-header {
      padding: 18px 24px;
      border-bottom: 1px solid #f1f5f9;
      background: #fafbfc;
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .row-num-tag {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: #0050e5;
      color: #ffffff;
      font-size: 14px;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .bg-green-tag {
      background: #16a34a !important;
    }
    .bg-purple-tag {
      background: #7c3aed !important;
    }
    .row-title-box {
      flex: 1;
    }
    .row-title-heading {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .row-title-box h3 {
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }
    .btn-info-pop {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: transparent;
      border: 1px solid transparent;
      color: #94a3b8;
      cursor: pointer;
      padding: 0;
      transition: all 0.15s ease;
      flex-shrink: 0;
    }
    .btn-info-pop .material-symbols-outlined {
      font-size: 17px;
    }
    .btn-info-pop:hover {
      background: #eff6ff;
      border-color: #bfdbfe;
      color: #0050e5;
    }
    .btn-info-pop.active {
      background: #0050e5;
      border-color: #0050e5;
      color: #ffffff;
      box-shadow: 0 2px 6px rgba(0, 80, 229, 0.25);
    }
    .row-desc-drawer {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 8px;
      padding: 7px 12px;
      background: #f1f5f9;
      border-left: 3px solid #0050e5;
      border-radius: 6px;
      font-size: 12px;
      color: #334155;
      line-height: 1.4;
      animation: fadeIn 0.15s ease;
    }
    .row-desc-drawer .desc-info-icon {
      font-size: 15px;
      color: #0050e5;
      flex-shrink: 0;
    }
    .row-title-box p {
      font-size: 12px;
      color: #64748b;
      margin: 2px 0 0;
    }
    .row-card-body {
      padding: 24px;
    }

    /* Grids */
    .form-grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    .form-grid-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }
    @media (max-width: 860px) {
      .form-grid-2, .form-grid-3 {
        grid-template-columns: 1fr;
      }
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .form-label {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #475569;
    }
    .req { color: #dc2626; }
    .help-text {
      font-size: 12px;
      color: #64748b;
      line-height: 1.4;
    }
    .help-text code {
      background: #f1f5f9;
      color: #0050e5;
      padding: 2px 5px;
      border-radius: 4px;
      font-family: monospace;
    }

    .form-control {
      width: 100%;
      padding: 10px 14px;
      font-size: 14px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      color: #0f172a;
      background: #ffffff;
      outline: none;
      box-sizing: border-box;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }
    .form-control:focus {
      border-color: #0050e5;
      box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.1);
    }

    .input-with-icon {
      position: relative;
      display: flex;
      align-items: center;
    }
    .input-icon {
      position: absolute;
      left: 12px;
      font-size: 18px;
      color: #94a3b8;
      pointer-events: none;
    }
    .input-with-icon .form-control {
      padding-left: 38px;
    }

    /* URL Input Addon */
    .url-input-addon-group {
      display: flex;
      align-items: stretch;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      overflow: hidden;
      background: #ffffff;
    }
    .url-input-addon-group:focus-within {
      border-color: #0050e5;
      box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.1);
    }
    .addon-prefix {
      background: #f8fafc;
      border-right: 1px solid #cbd5e1;
      padding: 10px 14px;
      font-size: 13px;
      font-weight: 600;
      color: #64748b;
      display: flex;
      align-items: center;
      white-space: nowrap;
    }
    .url-input-control {
      border: none !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      padding: 10px 14px !important;
      font-weight: 600;
      color: #0050e5;
    }

    /* Live URL Banner */
    .live-url-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 14px;
      padding: 10px 16px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      flex-wrap: wrap;
      gap: 10px;
    }
    .url-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
    }
    .url-label {
      color: #64748b;
      font-weight: 600;
    }
    .url-value {
      font-weight: 700;
      color: #0050e5;
      background: #eff6ff;
      padding: 2px 8px;
      border-radius: 4px;
    }
    .pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
    }
    .pill-success { background: #dcfce7; color: #15803d; }
    .pill-warning { background: #fef3c7; color: #b45309; }
    .icon-sm { font-size: 14px; }

    .url-badges {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .btn-live-link {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 5px 12px;
      background: #0050e5;
      color: #ffffff;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      text-decoration: none;
      transition: all 0.15s ease;
      box-shadow: 0 1px 3px rgba(0, 80, 229, 0.25);
    }
    .btn-live-link:hover {
      background: #003eb3;
      transform: translateY(-1px);
      box-shadow: 0 3px 6px rgba(0, 80, 229, 0.35);
      color: #ffffff;
    }

    /* Zone Selector Cards */
    .zone-options-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 12px;
      margin-top: 6px;
    }
    .zone-option-card {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px 14px;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      cursor: pointer;
      background: #ffffff;
      transition: all 0.15s ease;
    }
    .zone-option-card:hover {
      border-color: #0050e5;
      background: #f8fafc;
    }
    .zone-option-card.selected {
      border-color: #0050e5;
      background: #eff6ff;
    }
    .zone-card-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .zone-title {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
    }
    .zone-desc {
      font-size: 11px;
      color: #64748b;
      line-height: 1.3;
    }

    /* Placements Grid */
    .placements-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 14px;
      margin-top: 18px;
    }
    .placement-toggle-box {
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px 16px;
      background: #ffffff;
      display: flex;
      flex-direction: column;
      gap: 10px;
      transition: all 0.15s ease;
    }
    .placement-toggle-box.active {
      border-color: #93c5fd;
      background: #f8fafc;
    }
    .disabled-box {
      opacity: 0.65;
    }
    .cta-toggle-box {
      grid-column: 1 / -1;
      background: #faf5ff;
      border-color: #e9d5ff;
    }
    .cta-toggle-box.active {
      border-color: #c084fc;
      background: #faf5ff;
    }
    .toggle-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }
    .toggle-label {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      cursor: pointer;
      flex: 1;
    }
    .toggle-text strong {
      display: block;
      font-size: 13px;
      color: #0f172a;
    }
    .toggle-text small {
      display: block;
      font-size: 11px;
      color: #64748b;
      margin-top: 2px;
    }
    .text-warn { color: #d97706 !important; }
    .sort-input-box {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 700;
      color: #475569;
    }
    .sm-sort {
      width: 55px;
      padding: 4px 6px;
      font-size: 12px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      text-align: center;
    }
    .cta-expanded-fields {
      padding-top: 12px;
      border-top: 1px dashed #e9d5ff;
      margin-top: 4px;
    }
    .cta-quick-pills {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 10px;
      padding-top: 8px;
      border-top: 1px dotted #e9d5ff;
    }
    .quick-pill-label {
      font-size: 11px;
      font-weight: 700;
      color: #6b21a8;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .cta-pill-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 10px;
      background: #ffffff;
      border: 1px solid #d8b4fe;
      border-radius: 20px;
      font-size: 11.5px;
      font-weight: 600;
      color: #6b21a8;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .cta-pill-btn:hover {
      background: #f3e8ff;
      border-color: #a855f7;
      color: #581c87;
      transform: translateY(-1px);
    }
    .cta-pill-btn span.material-symbols-outlined {
      font-size: 14px;
    }
    .cta-reg-hint-banner {
      margin-top: 14px;
      padding: 10px 14px;
      background: #faf5ff;
      border: 1px solid #e9d5ff;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      animation: fadeIn 0.2s ease-out;
    }
    .cta-hint-left {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      flex: 1;
      min-width: 240px;
    }
    .cta-hint-left .hint-icon {
      font-size: 20px;
      color: #7c3aed;
      margin-top: 1px;
    }
    .cta-hint-left strong {
      display: block;
      font-size: 12.5px;
      font-weight: 700;
      color: #581c87;
      margin-bottom: 2px;
    }
    .cta-hint-left p {
      font-size: 11px;
      color: #7e22ce;
      margin: 0;
      line-height: 1.4;
    }
    .btn-jump-form-builder-sm {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 6px;
      background: #7c3aed;
      color: #ffffff;
      font-size: 11.5px;
      font-weight: 700;
      text-decoration: none;
      box-shadow: 0 1px 4px rgba(124, 58, 237, 0.25);
      transition: all 0.15s ease;
      white-space: nowrap;
    }
    .btn-jump-form-builder-sm:hover {
      background: #6d28d9;
      transform: translateY(-1px);
      box-shadow: 0 3px 8px rgba(124, 58, 237, 0.35);
      color: #ffffff;
    }
    .btn-jump-form-builder-sm .material-symbols-outlined { font-size: 14px; }
    .btn-jump-form-builder-sm .jump-arrow { font-size: 12px; opacity: 0.85; }

    /* Row 4: Destination Type Grid */
    .dest-type-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }
    @media (max-width: 860px) {
      .dest-type-grid { grid-template-columns: 1fr; }
    }
    .dest-card {
      border: 2px solid #e2e8f0;
      border-radius: 12px;
      padding: 18px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: #ffffff;
      position: relative;
      transition: all 0.15s ease;
    }
    .dest-card:hover {
      border-color: #0050e5;
      transform: translateY(-2px);
    }
    .dest-card.selected {
      border-color: #0050e5;
      background: #eff6ff;
    }
    .dest-icon-box {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
    }
    .bg-blue { background: #0050e5; }
    .bg-purple { background: #7c3aed; }
    .bg-amber { background: #d97706; }
    .dest-card-content h4 {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 4px;
    }
    .dest-card-content p {
      font-size: 12px;
      color: #64748b;
      margin: 0 0 10px;
      line-height: 1.4;
    }
    .dest-badge {
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 6px;
      background: #dbeafe;
      color: #1d4ed8;
      display: inline-block;
    }
    .bg-purple-light { background: #f3e8ff; color: #7c3aed; }
    .bg-amber-light { background: #fef3c7; color: #b45309; }
    .sub-config-box {
      margin-top: 18px;
      padding: 16px 20px;
      background: #fafbfc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      animation: fadeIn 0.2s ease-out;
    }
    .select-lg {
      font-size: 14px;
      padding: 12px 14px;
    }
    .system-page-hint-banner {
      margin-top: 14px;
      padding: 12px 16px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }
    .hint-banner-left {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      flex: 1;
      min-width: 260px;
    }
    .hint-icon {
      font-size: 22px;
      color: #0050e5;
      background: #ffffff;
      padding: 6px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0, 80, 229, 0.12);
    }
    .hint-banner-left strong {
      display: block;
      font-size: 13px;
      font-weight: 800;
      color: #1e3a8a;
      margin-bottom: 2px;
    }
    .hint-banner-left p {
      font-size: 11.5px;
      color: #3b82f6;
      margin: 0;
      line-height: 1.45;
    }
    .btn-jump-form-builder {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: 8px;
      background: #0050e5;
      color: #ffffff;
      font-size: 12px;
      font-weight: 700;
      text-decoration: none;
      box-shadow: 0 2px 6px rgba(0, 80, 229, 0.25);
      transition: all 0.15s ease;
      white-space: nowrap;
    }
    .btn-jump-form-builder:hover {
      background: #0043c0;
      transform: translateY(-1px);
      box-shadow: 0 4px 10px rgba(0, 80, 229, 0.35);
      color: #ffffff;
    }
    .btn-jump-form-builder .material-symbols-outlined { font-size: 16px; }
    .btn-jump-form-builder .jump-arrow { font-size: 13px; opacity: 0.85; }

    /* Row 5: Breadcrumb Live Preview */
    .breadcrumb-live-preview-card {
      margin-top: 18px;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid #cbd5e1;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.04);
    }
    .breadcrumb-preview-backdrop {
      background-size: cover;
      background-position: center;
      min-height: 170px;
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 20px 24px;
    }
    .breadcrumb-preview-overlay {
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(3px);
      padding: 16px 20px;
      border-radius: 10px;
      display: inline-flex;
      flex-direction: column;
      gap: 6px;
      max-width: 440px;
    }
    .preview-badge {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #93c5fd;
    }
    .preview-page-title {
      font-size: 20px;
      font-weight: 800;
      color: #ffffff;
      margin: 0;
    }
    .preview-crumbs {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #cbd5e1;
    }
    .crumb-sep { color: #94a3b8; }
    .crumb-current { color: #60a5fa; font-weight: 600; }
    .btn-remove-banner {
      align-self: flex-start;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: rgba(220, 38, 38, 0.9);
      color: #ffffff;
      border: none;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 10px;
      transition: background 0.15s ease;
    }
    .btn-remove-banner:hover {
      background: #dc2626;
    }
    .btn-remove-banner .material-symbols-outlined { font-size: 14px; }

    /* Row 6: Checkboxes Grid */
    .checkbox-row-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 12px;
    }
    .toggle-card-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 14px 16px;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      background: #ffffff;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .toggle-card-item:hover {
      border-color: #93c5fd;
      background: #f8fafc;
    }
    .toggle-card-item.checked {
      border-color: #86efac;
      background: #f0fdf4;
    }
    .toggle-card-details strong {
      display: block;
      font-size: 13px;
      color: #0f172a;
    }
    .toggle-card-details p {
      font-size: 11px;
      color: #64748b;
      margin: 2px 0 0;
      line-height: 1.3;
    }
    .form-mt-12 { margin-top: 12px; }
    .form-mt-16 { margin-top: 16px; }

    /* Ribbon Ticker Card inside Row 6 */
    .ribbon-ticker-config-card {
      border: 1px solid #fed7aa;
      background: #fffaf5;
      border-radius: 12px;
      padding: 16px 20px;
    }
    .ribbon-ticker-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
    }
    .ribbon-title-wrap {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .ribbon-title-wrap strong {
      font-size: 13.5px;
      color: #0f172a;
      display: block;
    }
    .ribbon-title-wrap p {
      font-size: 11.5px;
      color: #64748b;
      margin: 2px 0 0;
    }
    .ribbon-toggle {
      flex: 0 0 auto !important;
      padding: 8px 14px !important;
      border-radius: 8px !important;
      display: flex !important;
      align-items: center !important;
      gap: 8px !important;
      cursor: pointer !important;
      font-size: 12.5px !important;
      font-weight: 600 !important;
      color: #1e293b !important;
      background: #ffffff !important;
      border: 1px solid #cbd5e1 !important;
      margin: 0 !important;
    }
    .ribbon-toggle.checked {
      background: #ffedd5 !important;
      border-color: #fb923c !important;
      color: #9a3412 !important;
    }
    .text-orange { color: #ea580c !important; }

    /* Row 8: Audit Actions & Stats */
    .audit-action-group {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-left: auto;
      flex-shrink: 0;
    }
    .audit-action-group .btn {
      white-space: nowrap;
      font-weight: 500;
    }
    .audit-action-group .btn-manage-sections {
      margin-left: 10px;
      font-weight: 500 !important;
    }

    /* Row 8: Audit Stats Grid */
    .audit-stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
    }
    @media (max-width: 860px) {
      .audit-stats-grid { grid-template-columns: 1fr 1fr; }
    }
    .audit-stat-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .audit-stat-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .bg-blue-light { background: #eff6ff; }
    .bg-purple-light { background: #faf5ff; }
    .bg-amber-light { background: #fffbeb; }
    .bg-green-light { background: #f0fdf4; }
    .text-blue { color: #0050e5; }
    .text-purple { color: #7c3aed; }
    .text-amber { color: #d97706; }
    .text-green { color: #16a34a; }
    .audit-stat-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .stat-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
    }
    .stat-value {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
    }

    /* Tag Chips */
    .tags-chips-container {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 10px;
    }
    .tag-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #eff6ff;
      color: #0050e5;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
    }
    .tag-remove-btn {
      background: none;
      border: none;
      color: #0050e5;
      cursor: pointer;
      font-size: 14px;
      padding: 0;
      line-height: 1;
    }
    .tag-input-group {
      display: flex;
      align-items: center;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 2px 4px 2px 10px;
      background: #ffffff;
    }
    .tag-icon {
      font-size: 18px;
      color: #94a3b8;
      margin-right: 6px;
    }
    .tag-text-input {
      border: none;
      outline: none;
      flex: 1;
      font-size: 13px;
      padding: 8px 0;
    }
    .btn-add-tag {
      background: #0050e5;
      color: #ffffff;
      border: none;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-add-tag:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .available-tags-shelf {
      margin-top: 10px;
    }
    .shelf-label {
      font-size: 11px;
      color: #64748b;
      font-weight: 600;
      display: block;
      margin-bottom: 6px;
    }
    .shelf-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .shelf-chip {
      background: #f1f5f9;
      color: #334155;
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 4px;
      cursor: pointer;
    }
    .shelf-chip:hover {
      background: #0050e5;
      color: #ffffff;
    }

    /* Media Upload */
    .input-with-upload {
      display: flex;
      gap: 8px;
    }
    .btn-upload {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 10px 16px;
      background: #eff6ff;
      color: #0050e5;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s ease;
    }
    .btn-upload:hover {
      background: #dbeafe;
    }

    /* Sticky Bottom Actions Bar */
    .bottom-action-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 18px 24px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
      margin-top: 8px;
    }
    .action-buttons-right {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .action-buttons-right .btn-save-lg {
      margin-left: 12px;
    }
    .btn-save-lg {
      padding: 0 24px !important;
      height: 40px !important;
      font-size: 13.5px !important;
      font-weight: 500 !important;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      padding: 0 16px;
      height: 38px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      white-space: nowrap;
      flex-shrink: 0;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.15s ease;
      box-sizing: border-box;
      line-height: 1;
    }
    .btn span {
      white-space: nowrap;
      font-weight: 500;
    }
    .btn .material-symbols-outlined {
      font-size: 18px;
      font-weight: 400;
      flex-shrink: 0;
    }
    .btn-primary {
      background: #0050e5;
      color: #ffffff;
      border: 1px solid #0050e5;
      font-weight: 500;
      box-shadow: 0 1px 3px rgba(0, 80, 229, 0.18);
    }
    .btn-primary:hover:not(:disabled) {
      background: #0043c7;
      border-color: #0043c7;
      box-shadow: 0 2px 6px rgba(0, 80, 229, 0.25);
    }
    .btn-outline {
      background: #ffffff;
      color: #334155;
      border: 1px solid #cbd5e1;
      font-weight: 500;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
    }
    .btn-outline:hover:not(:disabled) {
      background: #f8fafc;
      border-color: #94a3b8;
      color: #0f172a;
    }
    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .badge-status {
      padding: 4px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
    }
    .badge-status.published {
      background: #dcfce7;
      color: #15803d;
    }
    .badge-status.draft {
      background: #f1f5f9;
      color: #64748b;
    }

    .loading-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px;
      color: #64748b;
      background: #ffffff;
      border-radius: 16px;
      border: 1px solid #e2e8f0;
    }
    .spin {
      animation: spin 1s linear infinite;
      font-size: 32px;
      color: #0050e5;
      margin-bottom: 12px;
    }
    @keyframes spin {
      100% { transform: rotate(360deg); }
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class WebPageEditComponent implements OnInit {
  pageId = '';
  isEditMode = false;
  isGeneratingSeo = false;
  page: any = null;
  categories: any[] = [];
  allPages: any[] = [];
  allAvailableTags: string[] = [];

  loading = false;
  saving = false;
  uploading = false;

  // Interactive Row Description Popups
  openRowDescs: { [row: number]: boolean } = {};

  toggleDesc(row: number): void {
    this.openRowDescs[row] = !this.openRowDescs[row];
  }

  isDescOpen(row: number): boolean {
    return !!this.openRowDescs[row];
  }

  // Destination Type & System Pages
  destinationType: 'section' | 'system' | 'direct' = 'section';
  selectedSystemPage: string = '/register';
  slugHasCollision: boolean = false;
  isSlugAutoGenerated: boolean = true;
  registrationSlug: string = '/register';

  systemPages: SystemPageOption[] = [
    { title: 'Member Registration ("Get Started")', slug: '/register', icon: 'how_to_reg', desc: 'Configured in User Manager > Form Builder (adjust questions & layout there)' },
    { title: 'Member / Staff Login', slug: '/login', icon: 'login', desc: 'Authentication and sign-in portal' },
    { title: 'Blog & Articles Feed', slug: '/blog', icon: 'article', desc: 'Editorial article archive and categories' },
    { title: 'Store Catalog', slug: '/store', icon: 'storefront', desc: 'E-commerce products and pricing catalog' },
    { title: 'Shopping Cart', slug: '/store/cart', icon: 'shopping_cart', desc: 'Customer checkout shopping cart' }
  ];

  // Tag chip editor state
  tagsList: string[] = [];
  newTagInput = '';
  filteredTags: string[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'create') {
      this.pageId = idParam;
      this.isEditMode = true;
      this.loadPage();
    } else {
      this.isEditMode = false;
      this.initDefaultPage();
    }

    this.loadCategories();
    this.loadAllPages();
    this.loadAllTags();
    this.loadRegistrationPolicy();
  }

  get activeHost(): string {
    const custom = localStorage.getItem('tenant_custom_domain');
    if (custom && custom.trim()) return custom.trim().replace(/^https?:\/\//i, '').split('/')[0];
    const primary = localStorage.getItem('tenant_primary_domain');
    if (primary && primary.trim()) return primary.trim().replace(/^https?:\/\//i, '').split('/')[0];
    return window.location.host;
  }

  get protocol(): string {
    if (typeof window !== 'undefined' && window.location.protocol) {
      return window.location.protocol;
    }
    return 'https:';
  }

  get livePageUrl(): string {
    if (!this.page?.directUrl) return `${this.protocol}//${this.activeHost}/`;
    const val = this.page.directUrl.trim();
    if (val.startsWith('http://') || val.startsWith('https://')) {
      return val;
    }
    const clean = val.replace(/^\/+/, '');
    return `${this.protocol}//${this.activeHost}/${clean}`;
  }

  get fullLiveUrl(): string {
    return this.livePageUrl;
  }

  initDefaultPage(): void {
    this.page = {
      title: '',
      directUrl: '',
      enableDirectUrl: false,
      isHomePage: false,
      publish: false,
      securityPage: false,
      pageCategoryId: null,
      mainPageId: null,
      menuPosition: 1, // First
      sortOrder: 0,
      showInTopBar: false,
      topBarSortOrder: 0,
      showInMainMenu: true,
      mainMenuSortOrder: 0,
      showInMenuDropDown: true,
      dropdownSortOrder: 0,
      showInFooter: true,
      footerSortOrder: 0,
      showInFooterBottom: false,
      footerBottomSortOrder: 0,
      isLegal: false,
      isMenuCTA: false,
      menuCtaText: '',
      menuCtaUrl: '',
      menuCtaStyle: 'primary',
      tags: '',
      customClass: '',
      imageUrl: '',
      imageKey: '',
      metaTitle: '',
      metaDescription: '',
      metaKeywords: '',
      disableAiAutoFill: false,
      homeSortFrom: 0,
      addToRibon: false,
      ribonCustomDisplayTitle: '',
      ribonSortOrder: 0
    };
    this.tagsList = [];
    this.destinationType = 'section';
  }

  generateSeoWithAi(): void {
    if (!this.page?.title?.trim()) {
      this.toast.error("Please enter a Page Title first so AI can analyze your content.");
      return;
    }

    if (this.isEditMode && this.pageId) {
      this.isGeneratingSeo = true;
      this.api.post("ContentApi/pages/" + this.pageId + "/generate-seo", {}).subscribe({
        next: (res: any) => {
          this.isGeneratingSeo = false;
          if (res?.data) {
            this.page.metaTitle = res.data.metaTitle || this.page.metaTitle;
            this.page.metaDescription = res.data.metaDescription || this.page.metaDescription;
            this.page.metaKeywords = res.data.metaKeywords || this.page.metaKeywords;
            this.toast.success("SEO Meta Information synthesized successfully with AI.");
          }
        },
        error: (err: any) => {
          this.isGeneratingSeo = false;
          this.toast.error(err?.error?.message || "Failed to synthesize SEO with AI.");
        }
      });
    } else {
      this.isGeneratingSeo = true;
      const prompt = "Synthesize high-CTR SEO metadata for a web page titled: \"" + this.page.title + "\", Category: \"" + (this.page.category || "General") + "\", Headline: \"" + (this.page.headline || "") + "\". Return JSON with keys: \"metaTitle\" (50-60 chars max), \"metaDescription\" (150-160 chars max), \"metaKeywords\" (6-10 keywords). Only valid JSON.";

      this.api.post("AiAssistApi/completion", {
        systemInstruction: "You are an expert SEO copywriter. Always return strictly valid JSON with metaTitle, metaDescription, metaKeywords.",
        prompt: prompt,
        temperature: 0.3,
        maxTokens: 500
      }).subscribe({
        next: (res: any) => {
          this.isGeneratingSeo = false;
          try {
            let raw = (res?.data?.content || "").trim();
            if (raw.startsWith("```json")) raw = raw.substring(7);
            if (raw.startsWith("```")) raw = raw.substring(3);
            if (raw.endsWith("```")) raw = raw.substring(0, raw.length - 3);
            const parsed = JSON.parse(raw.trim());
            if (parsed.metaTitle) this.page.metaTitle = parsed.metaTitle;
            if (parsed.metaDescription) this.page.metaDescription = parsed.metaDescription;
            if (parsed.metaKeywords) this.page.metaKeywords = parsed.metaKeywords;
            this.toast.success("SEO Meta Information pre-populated with AI.");
          } catch (e) {
            this.toast.info("AI generated response, review and save.");
          }
        },
        error: (err: any) => {
          this.isGeneratingSeo = false;
          this.toast.error(err?.error?.message || "Failed to generate SEO with AI.");
        }
      });
    }
  }

    onTitleInput(): void {
    if (!this.page?.title?.trim()) {
      return;
    }
    // Only auto-generate slug in create mode or when destination is section
    if (!this.isEditMode || !this.page.directUrl || this.destinationType === 'section') {
      this.generateUniqueSlug(this.page.title);
    }
  }

  generateUniqueSlug(title: string): void {
    let base = this.slugify(title);
    if (!base) base = 'page';

    // Disallow collision with existing pages
    const existingSlugs = new Set(
      this.otherPages
        .map(p => (p.directUrl || p.slug || '').toLowerCase().replace(/^https?:\/\/[^\/]+/i, '').replace(/^\/+/, '').trim())
        .filter(s => !!s)
    );

    let candidate = base;
    let counter = 1;
    while (existingSlugs.has(candidate)) {
      candidate = `${base}-${counter}`;
      counter++;
    }

    this.page.directUrl = '/' + candidate;
    this.isSlugAutoGenerated = true;
    this.slugHasCollision = (candidate !== base);
  }

  onSlugManualEdit(): void {
    this.isSlugAutoGenerated = false;
    this.slugHasCollision = false;
    if (this.page.directUrl && !this.page.directUrl.startsWith('http')) {
      if (!this.page.directUrl.startsWith('/')) {
        this.page.directUrl = '/' + this.page.directUrl;
      }
    }
  }

  setDestinationType(type: 'section' | 'system' | 'direct'): void {
    this.destinationType = type;
    if (type === 'section') {
      this.page.enableDirectUrl = false;
      if (!this.page.directUrl || this.isSystemSlug(this.page.directUrl)) {
        this.generateUniqueSlug(this.page.title || 'new-page');
      }
    } else if (type === 'system') {
      this.page.enableDirectUrl = true;
      if (!this.selectedSystemPage) {
        this.selectedSystemPage = '/blog';
      }
      this.onSystemPageSelect(this.selectedSystemPage);
    } else if (type === 'direct') {
      this.page.enableDirectUrl = true;
      if (!this.page.directUrl || this.isSystemSlug(this.page.directUrl)) {
        this.page.directUrl = 'https://';
      }
    }
  }

  onSystemPageSelect(slug: string): void {
    this.selectedSystemPage = slug;
    this.page.directUrl = slug;
    const match = this.systemPages.find(s => s.slug === slug);
    if (match && (!this.page.title || this.systemPages.some(s => s.title === this.page.title))) {
      this.page.title = match.title;
    }
  }

  /**
   * Quick-populates the Header Action CTA destination route and suggested button text.
   * @param url Destination route (e.g. /register).
   * @param text Optional suggested button label.
   */
  setCtaDestination(url: string, text?: string): void {
    this.page.menuCtaUrl = url;
    if (text && (!this.page.menuCtaText || this.page.menuCtaText === 'Get Started' || this.page.menuCtaText === 'Register' || this.page.menuCtaText === 'Sign In')) {
      this.page.menuCtaText = text;
    }
  }

  /**
   * Fetches the organization's registration policy to dynamically reflect the public onboarding slug.
   */
  loadRegistrationPolicy(): void {
    this.api.get<any>('RegistrationFormApi/policy').subscribe({
      next: (res) => {
        if (res?.data) {
          const rawSlug = res.data.registrationUrlSlug || 'register';
          this.registrationSlug = '/' + rawSlug.trim().toLowerCase().replace(/^\/+/, '');
          
          const regItem = this.systemPages.find(s => s.icon === 'how_to_reg' || s.slug === '/register' || s.slug === this.registrationSlug);
          if (regItem) {
            regItem.slug = this.registrationSlug;
          }
        }
      },
      error: () => {}
    });
  }

  isSystemSlug(slug: string): boolean {
    const clean = (slug || '').trim().toLowerCase();
    return this.systemPages.some(s => s.slug.toLowerCase() === clean) ||
           clean === '/register' ||
           clean === (this.registrationSlug || '').toLowerCase();
  }

  private slugify(text: string): string {
    return (text || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  loadPage(): void {
    this.loading = true;
    this.api.get<any>(`ContentApi/pages/${this.pageId}`).subscribe({
      next: (res) => {
        this.loading = false;
        this.page = res?.data;
        if (this.page) {
          // Detect destination type
          const direct = (this.page.directUrl || '').trim();
          if (this.isSystemSlug(direct)) {
            this.destinationType = 'system';
            this.selectedSystemPage = direct;
          } else if (this.page.enableDirectUrl || direct.startsWith('http://') || direct.startsWith('https://')) {
            this.destinationType = 'direct';
          } else {
            this.destinationType = 'section';
          }

          this.tagsList = (this.page.tags || '')
            .split(',')
            .map((t: string) => t.trim().toLowerCase())
            .filter((t: string) => !!t);
        }
      },
      error: (err) => {
        this.loading = false;
        this.toast.error(err?.error?.message || 'Failed to load page details.');
      }
    });
  }

  loadCategories(): void {
    this.api.get<any>('ContentApi/categories').subscribe({
      next: (res) => {
        this.categories = res?.data || [];
      }
    });
  }

  loadAllPages(): void {
    this.api.get<any>('ContentApi/pages').subscribe({
      next: (res) => {
        this.allPages = res?.data || [];
        if (!this.isEditMode && (!this.page.sortOrder || this.page.sortOrder <= 0)) {
          const maxSort = this.allPages.reduce((max: number, p: any) => Math.max(max, p.sortOrder || 0), 0);
          this.page.sortOrder = maxSort + 10;
        }
      }
    });
  }

  loadAllTags(): void {
    this.api.get<any>('ContentApi/page-tags').subscribe({
      next: (res) => {
        this.allAvailableTags = res?.data || [];
      }
    });
  }

  get otherPages(): any[] {
    if (!this.pageId) return this.allPages;
    return this.allPages.filter(p => p.id && p.id.toLowerCase() !== this.pageId.toLowerCase());
  }

  get unselectedAvailableTags(): string[] {
    return this.allAvailableTags.filter(t => !this.tagsList.includes(t));
  }

  filterTags(): void {
    const q = this.newTagInput.trim().toLowerCase();
    if (!q) {
      this.filteredTags = [];
      return;
    }
    this.filteredTags = this.allAvailableTags.filter(
      t => t.includes(q) && !this.tagsList.includes(t)
    );
  }

  selectTag(tag: string): void {
    const clean = tag.trim().toLowerCase();
    if (clean && !this.tagsList.includes(clean)) {
      this.tagsList.push(clean);
      this.syncTags();
    }
    this.newTagInput = '';
    this.filteredTags = [];
  }

  addTag(event: any): void {
    event.preventDefault();
    const raw = this.newTagInput.replace(/,/g, '').trim().toLowerCase();
    if (raw && !this.tagsList.includes(raw)) {
      this.tagsList.push(raw);
      this.syncTags();
    }
    this.newTagInput = '';
    this.filteredTags = [];
  }

  removeTag(tag: string): void {
    this.tagsList = this.tagsList.filter(t => t !== tag);
    this.syncTags();
  }

  syncTags(): void {
    if (this.page) {
      this.page.tags = this.tagsList.join(',');
    }
  }

  uploadImage(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;

    this.uploading = true;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'bcp-cms/pages');

    this.api.post<any>('ContentApi/upload-media', formData).subscribe({
      next: (res) => {
        this.uploading = false;
        if (res?.data?.url) {
          this.page.imageUrl = res.data.url;
        }
        if (res?.data?.key) {
          this.page.imageKey = res.data.key;
        }
        this.toast.success('Breadcrumb header banner uploaded successfully!');
      },
      error: (err) => {
        this.uploading = false;
        this.toast.error(err?.error?.message || 'Media upload failed.');
      }
    });
  }

  savePage(): void {
    this.syncTags();

    if (!this.page?.title?.trim()) {
      this.toast.warning('Page Title is required.');
      return;
    }

    if (!this.page?.directUrl?.trim()) {
      this.toast.warning('Direct URL Slug is required.');
      return;
    }

    // Set enableDirectUrl accordingly
    if (this.destinationType === 'system' || this.destinationType === 'direct') {
      this.page.enableDirectUrl = true;
    } else {
      this.page.enableDirectUrl = false;
    }

    this.saving = true;

    if (this.isEditMode) {
      this.api.put<any>(`ContentApi/pages/${this.pageId}`, this.page).subscribe({
        next: (res) => {
          this.saving = false;
          this.toast.success(res?.message || 'Web page updated successfully!');
          this.router.navigate(['/content/console/pages']);
        },
        error: (err) => {
          this.saving = false;
          this.toast.error(err?.error?.message || 'Failed to update web page.');
        }
      });
    } else {
      this.api.post<any>('ContentApi/pages', this.page).subscribe({
        next: (res) => {
          this.saving = false;
          this.toast.success(res?.message || 'Web page created successfully!');
          this.router.navigate(['/content/console/pages']);
        },
        error: (err) => {
          this.saving = false;
          this.toast.error(err?.error?.message || 'Failed to create web page.');
        }
      });
    }
  }
}
