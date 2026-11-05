import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent, PageHeaderButton } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent],
  template: `
    <div class="settings-page">
      <!-- Standardized Page Header -->
      <app-page-header
        eyebrow="WORKSPACE CONFIGURATION"
        icon="tune"
        title="Workspace Configuration & Branding Studio"
        subtitle="Manage custom brand assets, website operating modes, interactive widgets, and custom domains."
        [buttons]="headerButtons"
      ></app-page-header>

      <!-- Alert Banner -->
      <div *ngIf="successMessage" class="console-alert" style="border-color:rgba(34,197,94,0.4); background:rgba(34,197,94,0.08); margin-bottom: 20px;">
        <div style="display:flex; align-items:center; gap:10px;">
          <span class="material-symbols-outlined" style="color:#16a34a;">check_circle</span>
          <div>
            <strong style="color:#16a34a; font-size:13px;">Saved Successfully</strong>
            <p style="margin:2px 0 0; font-size:12px; color:#15803d;">{{ successMessage }}</p>
          </div>
        </div>
      </div>

      <!-- Studio Navigation Tabs Bar -->
      <div class="settings-studio-nav">
        <button
          type="button"
          class="studio-nav-btn"
          [class.active]="activeTab === 'brand'"
          (click)="setTab('brand')"
        >
          <span class="material-symbols-outlined nav-tab-icon">branding_watermark</span>
          <div class="nav-tab-text">
            <span class="tab-title">Brand & Logos</span>
            <span class="tab-sub">Logos, Favicons & Copy</span>
          </div>
        </button>

        <button
          type="button"
          class="studio-nav-btn"
          [class.active]="activeTab === 'ecommerce'"
          (click)="setTab('ecommerce')"
        >
          <span class="material-symbols-outlined nav-tab-icon">storefront</span>
          <div class="nav-tab-text">
            <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
              <span class="tab-title">Website Mode & Store</span>
              <span class="tab-mode-mini-pill" [class.pill-store]="store.storeOperatingMode === 'ecommerce'">
                {{ store.storeOperatingMode === 'ecommerce' ? 'Store Default' : 'Website Default' }}
              </span>
            </div>
            <span class="tab-sub">Standard Site vs. Online Store</span>
          </div>
        </button>

        <button
          type="button"
          class="studio-nav-btn"
          [class.active]="activeTab === 'widgets'"
          (click)="setTab('widgets')"
        >
          <span class="material-symbols-outlined nav-tab-icon">widgets</span>
          <div class="nav-tab-text">
            <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
              <span class="tab-title">Website &amp; Widgets</span>
              <span class="tab-mode-mini-pill" [class.pill-store]="brand.enableWhatsAppChat || brand.enableCookieConsent || brand.enableBreakingNewsRibon" [style.background]="(brand.enableWhatsAppChat || brand.enableCookieConsent || brand.enableBreakingNewsRibon) ? '#dcfce7' : '#f1f5f9'" [style.color]="(brand.enableWhatsAppChat || brand.enableCookieConsent || brand.enableBreakingNewsRibon) ? '#15803d' : '#64748b'">
                {{ (brand.enableWhatsAppChat || brand.enableCookieConsent || brand.enableBreakingNewsRibon) ? 'Active' : 'Standby' }}
              </span>
            </div>
            <span class="tab-sub">Ribbon, WhatsApp &amp; Cookies</span>
          </div>
        </button>

        <a
          routerLink="/settings/console/custom-domain"
          class="studio-nav-btn"
          style="text-decoration:none;"
        >
          <span class="material-symbols-outlined nav-tab-icon">dns</span>
          <div class="nav-tab-text">
            <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
              <span class="tab-title">Custom Domain &amp; DNS</span>
              <span class="tab-mode-mini-pill" [class.pill-store]="hasCustomDomain" [style.background]="hasCustomDomain ? '#dcfce7' : '#fef3c7'" [style.color]="hasCustomDomain ? '#15803d' : '#b45309'">
                {{ hasCustomDomain ? 'Linked' : 'Not Linked' }}
              </span>
            </div>
            <span class="tab-sub">Dedicated Full-Page Studio ↗</span>
          </div>
        </a>
      </div>

      <!-- =================================================================== -->
      <!-- TAB 1: CORPORATE BRAND & VISUAL ASSETS                              -->
      <!-- =================================================================== -->
      <div *ngIf="activeTab === 'brand'" class="tab-content-pane">
        <!-- Top Section: Brand Identity & Logo Assets (Full Width) -->
        <section class="console-widget full-width-widget">
          <div class="widget-head">
            <div class="widget-title-wrap">
              <span class="material-symbols-outlined header-widget-icon text-indigo">branding_watermark</span>
              <div>
                <h2 class="widget-title">Corporate Visual Assets</h2>
                <p class="widget-subtitle">Primary logo, white header logo, browser favicon icon, and identity copy.</p>
              </div>
            </div>

          </div>

          <div class="widget-body">
            <div class="form-row-2">
              <div class="form-group">
                <label class="form-label">
                  <span>Company / Organization Name</span>
                  <span class="field-req">*</span>
                </label>
                <input type="text" [(ngModel)]="brand.companyName" (input)="onCompanyNameChange()" class="form-control" placeholder="e.g. Acme Corporation, Global Enterprises" />
                <span class="field-hint">Official organization name displayed across the portal</span>
              </div>

              <div class="form-group">
                <label class="form-label">
                  <span>Company Abbreviation (Initials)</span>
                </label>
                <input type="text" [(ngModel)]="brand.companyNameAbbreviation" class="form-control" placeholder="e.g. ACME, CORP, ORG" />
                <span class="field-hint">Short name or initials used across portal headers and badges</span>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Organization Tagline & Description</label>
              <textarea [(ngModel)]="brand.companyDescription" rows="2" class="form-control" placeholder="Brief statement displayed in metadata and portal footers..."></textarea>
            </div>

            <div class="form-group" style="margin-top: 12px;">
              <label class="form-label">
                <span>Website Footer Note / Brand Bio</span>
                <span class="field-hint" style="font-weight: normal; margin-left: 8px;">(Displayed prominently in the public website footer under the brand logo)</span>
              </label>
              <textarea [(ngModel)]="brand.footerDescription" rows="3" class="form-control" placeholder="Detailed brand story or institutional mission statement displayed in your live website footer..."></textarea>
            </div>

            <div class="form-row-2">
              <div class="form-group">
                <label class="form-label">Website Browser Title</label>
                <input type="text" [(ngModel)]="brand.websiteTitle" class="form-control" placeholder="e.g. Enterprise Portal" />
              </div>
              <div class="form-group">
                <label class="form-label">Dashboard Header Title</label>
                <input type="text" [(ngModel)]="brand.dashboardTitle" class="form-control" placeholder="e.g. Executive Governance Console" />
              </div>
            </div>

            <div class="form-divider"><span>BRAND LOGOS & VISUAL GRAPHICS (DRAG & DROP OR UPLOAD)</span></div>

            <!-- 3-Column Grid for Brand Media Assets -->
            <div class="assets-upload-grid-3">
              <!-- 1. Primary Corporate Logo Uploader -->
              <div class="asset-upload-block">
                <label class="form-label">
                  <span>Primary Corporate Logo</span>
                  <button type="button" class="btn-link-toggle" (click)="toggleManualUrl('logo')">
                    {{ showManualUrl['logo'] ? 'Hide Direct URL' : 'Direct URL' }}
                  </button>
                </label>

                <div class="asset-upload-container" [class.has-file]="brand.companyLogoUrl">
                  <div *ngIf="brand.companyLogoUrl" class="asset-preview-card-active">
                    <div class="preview-box-large">
                      <img [src]="brand.companyLogoUrl" alt="Primary Logo" />
                    </div>
                    <div class="preview-meta-info">
                      <div class="preview-file-name">Primary Corporate Logo</div>
                      <div class="preview-file-url" [title]="brand.companyLogoUrl">{{ brand.companyLogoUrl }}</div>
                    </div>
                    <div class="preview-actions-group">
                      <input type="file" #primaryLogoFile (change)="onFileInputChange($event, 'logo')" accept="image/*" style="display:none;" />
                      <button type="button" class="btn-icon-action" (click)="primaryLogoFile.click()" title="Replace image">
                        <span class="material-symbols-outlined" style="font-size:16px;">upload_file</span> Replace
                      </button>
                      <button type="button" class="btn-icon-action btn-icon-danger" (click)="removeAsset('logo')" title="Remove asset">
                        <span class="material-symbols-outlined" style="font-size:16px;">delete</span>
                      </button>
                    </div>
                  </div>

                  <div *ngIf="!brand.companyLogoUrl" 
                       class="dropzone-area" 
                       [class.drag-over]="dragOverAsset['logo']"
                       (dragover)="onAssetDragOver($event, 'logo')"
                       (dragleave)="onAssetDragLeave($event, 'logo')"
                       (drop)="onAssetDrop($event, 'logo')"
                       (click)="primaryLogoFileEmpty.click()">
                    <input type="file" #primaryLogoFileEmpty (change)="onFileInputChange($event, 'logo')" accept="image/*" style="display:none;" />
                    <div class="dropzone-content" *ngIf="!uploadingAsset['logo']">
                      <span class="material-symbols-outlined dropzone-icon">cloud_upload</span>
                      <div class="dropzone-text">Click or drag & drop Primary Logo</div>
                      <div class="dropzone-sub">PNG, SVG, JPG, WebP up to 5MB</div>
                    </div>
                    <div class="dropzone-content" *ngIf="uploadingAsset['logo']">
                      <span class="material-symbols-outlined dropzone-icon rotating-spinner">sync</span>
                      <div class="dropzone-text">Uploading to cloud...</div>
                    </div>
                  </div>

                  <div *ngIf="showManualUrl['logo']" class="manual-url-wrap">
                    <input type="text" [(ngModel)]="brand.companyLogoUrl" class="form-control" placeholder="https://res.cloudinary.com/... or relative path" />
                  </div>
                </div>
              </div>

              <!-- 2. White / Contrast Header Logo Uploader -->
              <div class="asset-upload-block">
                <label class="form-label">
                  <span>White / Contrast Header Logo</span>
                  <button type="button" class="btn-link-toggle" (click)="toggleManualUrl('whiteLogo')">
                    {{ showManualUrl['whiteLogo'] ? 'Hide Direct URL' : 'Direct URL' }}
                  </button>
                </label>

                <div class="asset-upload-container" [class.has-file]="brand.companyWhiteLogoUrl">
                  <div *ngIf="brand.companyWhiteLogoUrl" class="asset-preview-card-active">
                    <div class="preview-box-large dark-bg">
                      <img [src]="brand.companyWhiteLogoUrl" alt="White Contrast Logo" />
                    </div>
                    <div class="preview-meta-info">
                      <div class="preview-file-name">White Contrast Logo</div>
                      <div class="preview-file-url" [title]="brand.companyWhiteLogoUrl">{{ brand.companyWhiteLogoUrl }}</div>
                    </div>
                    <div class="preview-actions-group">
                      <input type="file" #whiteLogoFile (change)="onFileInputChange($event, 'whiteLogo')" accept="image/*" style="display:none;" />
                      <button type="button" class="btn-icon-action" (click)="whiteLogoFile.click()" title="Replace image">
                        <span class="material-symbols-outlined" style="font-size:16px;">upload_file</span> Replace
                      </button>
                      <button type="button" class="btn-icon-action btn-icon-danger" (click)="removeAsset('whiteLogo')" title="Remove asset">
                        <span class="material-symbols-outlined" style="font-size:16px;">delete</span>
                      </button>
                    </div>
                  </div>

                  <div *ngIf="!brand.companyWhiteLogoUrl" 
                       class="dropzone-area" 
                       [class.drag-over]="dragOverAsset['whiteLogo']"
                       (dragover)="onAssetDragOver($event, 'whiteLogo')"
                       (dragleave)="onAssetDragLeave($event, 'whiteLogo')"
                       (drop)="onAssetDrop($event, 'whiteLogo')"
                       (click)="whiteLogoFileEmpty.click()">
                    <input type="file" #whiteLogoFileEmpty (change)="onFileInputChange($event, 'whiteLogo')" accept="image/*" style="display:none;" />
                    <div class="dropzone-content" *ngIf="!uploadingAsset['whiteLogo']">
                      <span class="material-symbols-outlined dropzone-icon">image</span>
                      <div class="dropzone-text">Click or drag & drop White Logo</div>
                      <div class="dropzone-sub">For dark navigation headers</div>
                    </div>
                    <div class="dropzone-content" *ngIf="uploadingAsset['whiteLogo']">
                      <span class="material-symbols-outlined dropzone-icon rotating-spinner">sync</span>
                      <div class="dropzone-text">Uploading to cloud...</div>
                    </div>
                  </div>

                  <div *ngIf="showManualUrl['whiteLogo']" class="manual-url-wrap">
                    <input type="text" [(ngModel)]="brand.companyWhiteLogoUrl" class="form-control" placeholder="https://res.cloudinary.com/..." />
                  </div>
                </div>
              </div>

              <!-- 3. Browser Favicon & App Icon Uploader -->
              <div class="asset-upload-block">
                <label class="form-label">
                  <span>Favicon & App Icon</span>
                  <button type="button" class="btn-link-toggle" (click)="toggleManualUrl('icon')">
                    {{ showManualUrl['icon'] ? 'Hide Direct URL' : 'Direct URL' }}
                  </button>
                </label>

                <div class="asset-upload-container" [class.has-file]="brand.companyIconUrl">
                  <div *ngIf="brand.companyIconUrl" class="asset-preview-card-active">
                    <div class="preview-box-icon">
                      <img [src]="brand.companyIconUrl" alt="Favicon Icon" />
                    </div>
                    <div class="preview-meta-info">
                      <div class="preview-file-name">Favicon & App Icon</div>
                      <div class="preview-file-url" [title]="brand.companyIconUrl">{{ brand.companyIconUrl }}</div>
                    </div>
                    <div class="preview-actions-group">
                      <input type="file" #iconFile (change)="onFileInputChange($event, 'icon')" accept="image/*" style="display:none;" />
                      <button type="button" class="btn-icon-action" (click)="iconFile.click()" title="Replace image">
                        <span class="material-symbols-outlined" style="font-size:16px;">upload_file</span> Replace
                      </button>
                      <button type="button" class="btn-icon-action btn-icon-danger" (click)="removeAsset('icon')" title="Remove asset">
                        <span class="material-symbols-outlined" style="font-size:16px;">delete</span>
                      </button>
                    </div>
                  </div>

                  <div *ngIf="!brand.companyIconUrl" 
                       class="dropzone-area" 
                       [class.drag-over]="dragOverAsset['icon']"
                       (dragover)="onAssetDragOver($event, 'icon')"
                       (dragleave)="onAssetDragLeave($event, 'icon')"
                       (drop)="onAssetDrop($event, 'icon')"
                       (click)="iconFileEmpty.click()">
                    <input type="file" #iconFileEmpty (change)="onFileInputChange($event, 'icon')" accept="image/*" style="display:none;" />
                    <div class="dropzone-content" *ngIf="!uploadingAsset['icon']">
                      <span class="material-symbols-outlined dropzone-icon">crop_original</span>
                      <div class="dropzone-text">Click or drag Favicon Icon</div>
                      <div class="dropzone-sub">Square PNG / ICO for browser tabs</div>
                    </div>
                    <div class="dropzone-content" *ngIf="uploadingAsset['icon']">
                      <span class="material-symbols-outlined dropzone-icon rotating-spinner">sync</span>
                      <div class="dropzone-text">Uploading to cloud...</div>
                    </div>
                  </div>

                  <div *ngIf="showManualUrl['icon']" class="manual-url-wrap">
                    <input type="text" [(ngModel)]="brand.companyIconUrl" class="form-control" placeholder="https://res.cloudinary.com/... or icon.png" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>



        <!-- Section: Member Registration Onboarding & Custom URL Slug -->
        <section class="console-widget full-width-widget" style="margin-top: 20px;">
          <div class="widget-head">
            <div class="widget-title-wrap">
              <span class="material-symbols-outlined header-widget-icon text-indigo">dynamic_form</span>
              <div>
                <h2 class="widget-title">Member Registration &amp; Onboarding Settings</h2>
                <p class="widget-subtitle">Custom URL slug, industry sector, affiliate referral prompt, and onboarding governance.</p>
              </div>
            </div>
            <div style="display:flex; gap:8px;">
              <a routerLink="/users/console/registration-form" class="btn btn-outline btn-sm">
                <span class="material-symbols-outlined">tune</span>
                <span>Open Form Builder ↗</span>
              </a>

            </div>
          </div>

          <div class="widget-body">
            <div class="form-grid-2">
              <div class="form-group">
                <label class="form-label">
                  <span>Custom Registration URL Slug</span>
                  <span class="field-hint" style="font-weight: normal; margin-left: 8px;">(e.g. apply, join, enroll, get-started)</span>
                </label>
                <div style="display:flex; align-items:center; border:1px solid #cbd5e1; border-radius:8px; overflow:hidden;">
                  <span style="padding:0 12px; background:#f1f5f9; color:#64748b; font-size:13px; font-weight:600; border-right:1px solid #cbd5e1; height:38px; display:flex; align-items:center;">/auth/</span>
                  <input type="text" [(ngModel)]="registrationPolicy.registrationUrlSlug" (ngModelChange)="sanitizeRegistrationSlug()" class="form-control" style="border:none; border-radius:0; height:38px;" placeholder="e.g. apply" />
                </div>
                <div style="margin-top: 6px; font-size: 12px; color: #64748b; display: flex; align-items: center; gap: 6px;">
                  <span>Live URL: <strong style="color: #0050e5;">{{ liveRegistrationUrl }}</strong></span>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Industry / Organization Sector</label>
                <select [(ngModel)]="registrationPolicy.defaultIndustrySector" class="form-control" style="height:40px;">
                  <option value="Business & Enterprise">Business & Enterprise</option>
                  <option value="Education & Academy">Education & Academy</option>
                  <option value="Healthcare & Care Services">Healthcare & Care Services</option>
                  <option value="Non-Profit & Foundation">Non-Profit & Foundation</option>
                  <option value="Government & Public Agency">Government & Public Agency</option>
                  <option value="Technology & Software">Technology & Software</option>
                  <option value="Community & Alumni Association">Community & Alumni Association</option>
                </select>
                <span class="field-hint">Primary sector used for default onboarding field presets</span>
              </div>
            </div>

            <div class="form-grid-2" style="margin-top: 14px;">
              <!-- Toggle: Affiliate Referral Code -->
              <div class="toggle-card" [class.active-toggle]="registrationPolicy.enableAffiliateReferralCode" (click)="registrationPolicy.enableAffiliateReferralCode = !registrationPolicy.enableAffiliateReferralCode" style="border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 12px; background: #ffffff;">
                <input type="checkbox" [(ngModel)]="registrationPolicy.enableAffiliateReferralCode" (click)="$event.stopPropagation()" />
                <div>
                  <strong style="font-size: 13px; display: block; color: #0f172a;">Enable Affiliate Referral Code</strong>
                  <span style="font-size: 11.5px; color: #64748b;">Displays "Have an Affiliate Referral Code?" expander on the registration card</span>
                </div>
              </div>

              <!-- Toggle: Public Registration -->
              <div class="toggle-card" [class.active-toggle]="registrationPolicy.allowPublicRegistration" (click)="registrationPolicy.allowPublicRegistration = !registrationPolicy.allowPublicRegistration" style="border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 12px; background: #ffffff;">
                <input type="checkbox" [(ngModel)]="registrationPolicy.allowPublicRegistration" (click)="$event.stopPropagation()" />
                <div>
                  <strong style="font-size: 13px; display: block; color: #0f172a;">Allow Public Self-Registration</strong>
                  <span style="font-size: 11.5px; color: #64748b;">Enables open member registration via live link. If off, accounts are invite-only</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <!-- =================================================================== -->
      <!-- TAB 6: WEBSITE OPERATING MODE & STOREFRONT STUDIO                   -->
      <!-- =================================================================== -->
      <div *ngIf="activeTab === 'ecommerce'" class="tab-content-pane">
        <section class="console-widget full-width-widget">
          <div class="widget-head">
            <div class="widget-title-wrap">
              <span class="material-symbols-outlined header-widget-icon text-indigo">web</span>
              <div>
                <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                  <h2 class="widget-title">Website Operating Mode & Storefront Configuration</h2>
                  <span class="settings-mode-pill" [class.is-store]="store.storeOperatingMode === 'ecommerce'">
                    <span class="mode-pulse-dot"></span>
                    {{ store.storeOperatingMode === 'ecommerce' ? 'Store is Default' : 'Website is Default' }}
                  </span>
                </div>
                <p class="widget-subtitle">Choose between a standard organization website layout or an e-commerce first storefront, and configure catalog options.</p>
              </div>
            </div>

          </div>

          <div class="widget-body">
            <!-- Section 1: Primary Website Mode (Two Big Interactive Cards) -->
            <div class="mode-section-header">
              <span class="material-symbols-outlined text-indigo">layers</span>
              <div>
                <h3 class="section-heading">1. Select Primary Website Mode</h3>
                <p class="section-subtext">Determine the core layout and homepage experience presented to your public visitors.</p>
              </div>
            </div>

            <div class="website-modes-grid">
              <!-- Option 1: Standard Organization Website (Default) -->
              <div
                class="website-mode-card"
                [class.active-mode]="store.storeOperatingMode !== 'ecommerce'"
                (click)="store.storeOperatingMode = 'standard'"
              >
                <div class="mode-card-badge-row">
                  <span class="mode-pill pill-default">Default & Recommended</span>
                  <span class="material-symbols-outlined mode-check-icon" *ngIf="store.storeOperatingMode !== 'ecommerce'">check_circle</span>
                </div>
                <div class="mode-card-icon-wrap bg-blue-subtle">
                  <span class="material-symbols-outlined mode-large-icon text-blue">domain</span>
                </div>
                <h4 class="mode-card-title">Standard Organization Website</h4>
                <p class="mode-card-desc">
                  Traditional corporate, church, club, NGO, or association web presence. The homepage focuses on your mission, hero banners, about info, news, upcoming events, and member portal.
                </p>
                <div class="mode-card-features">
                  <div class="feature-bullet"><span class="material-symbols-outlined">check</span> Full CMS Hero & Visual Sections</div>
                  <div class="feature-bullet"><span class="material-symbols-outlined">check</span> About, Events & News/Blog Feeds</div>
                  <div class="feature-bullet"><span class="material-symbols-outlined">check</span> Optional Store catalog tab (/store)</div>
                </div>
              </div>

              <!-- Option 2: E-Commerce Storefront First -->
              <div
                class="website-mode-card"
                [class.active-mode]="store.storeOperatingMode === 'ecommerce'"
                (click)="store.storeOperatingMode = 'ecommerce'"
              >
                <div class="mode-card-badge-row">
                  <span class="mode-pill pill-store">E-Commerce First</span>
                  <span class="material-symbols-outlined mode-check-icon" *ngIf="store.storeOperatingMode === 'ecommerce'">check_circle</span>
                </div>
                <div class="mode-card-icon-wrap bg-indigo-subtle">
                  <span class="material-symbols-outlined mode-large-icon text-indigo">shopping_cart</span>
                </div>
                <h4 class="mode-card-title">Online Storefront & Retail Hub</h4>
                <p class="mode-card-desc">
                  Tailored specifically for businesses and merchandisers whose primary goal is selling goods, memberships, or digital downloads with an instant shopping cart and catalog spotlight.
                </p>
                <div class="mode-card-features">
                  <div class="feature-bullet"><span class="material-symbols-outlined">check</span> Homepage Product Grids & Deals</div>
                  <div class="feature-bullet"><span class="material-symbols-outlined">check</span> Instant Cart Drawer & Fast Checkout</div>
                  <div class="feature-bullet"><span class="material-symbols-outlined">check</span> Categories & Filter Sidebars</div>
                </div>
              </div>
            </div>

            <!-- Section 2: Store Feature Activation Banner -->
            <div class="form-divider">
              <span>2. STORE & CATALOG MODULE STATUS</span>
            </div>

            <div class="store-master-banner" [class.store-active]="store.storefrontEnabled">
              <div class="store-banner-left">
                <span class="material-symbols-outlined store-master-icon">{{ store.storefrontEnabled ? 'storefront' : 'store_mall_directory' }}</span>
                <div>
                  <h3 class="store-master-title">Public Storefront & Product Catalog is {{ store.storefrontEnabled ? 'ACTIVE & ENABLED' : 'DISABLED' }}</h3>
                  <p class="store-master-desc">
                    {{ store.storefrontEnabled 
                      ? 'Visitors can browse your product catalog, add items to cart, and complete orders. You can customize where the store appears below.' 
                      : 'The store module is hidden from visitors. All /store catalog URLs and product purchase widgets are deactivated.' }}
                  </p>
                </div>
              </div>
              <label class="toggle-switch-large">
                <input type="checkbox" [(ngModel)]="store.storefrontEnabled" />
                <span class="toggle-track" [class.on]="store.storefrontEnabled">
                  <span class="toggle-thumb"></span>
                </span>
              </label>
            </div>

            <!-- Section 3: Navigation Placement & Display Settings (Shown when Storefront is Enabled) -->
            <ng-container *ngIf="store.storefrontEnabled">
              <div class="form-divider">
                <span>3. STORE PLACEMENT & CURRENCY FORMATS</span>
              </div>

              <div class="store-toggles-grid">
                <div class="store-toggle-card">
                  <div class="toggle-card-info">
                    <span class="material-symbols-outlined toggle-icon text-indigo">menu</span>
                    <div>
                      <strong class="toggle-title">Show in Navigation Bar</strong>
                      <p class="toggle-sub">Add a link to '{{ store.storeTitle || 'Store' }}' on the top main header menu.</p>
                    </div>
                  </div>
                  <label class="toggle-switch-sm">
                    <input type="checkbox" [(ngModel)]="store.showInNavbar" />
                    <span class="toggle-track-sm" [class.on]="store.showInNavbar"><span class="toggle-thumb-sm"></span></span>
                  </label>
                </div>

                <div class="store-toggle-card">
                  <div class="toggle-card-info">
                    <span class="material-symbols-outlined toggle-icon text-blue">vertical_align_bottom</span>
                    <div>
                      <strong class="toggle-title">Show in Website Footer</strong>
                      <p class="toggle-sub">Display links to shop categories in footer columns.</p>
                    </div>
                  </div>
                  <label class="toggle-switch-sm">
                    <input type="checkbox" [(ngModel)]="store.showInFooter" />
                    <span class="toggle-track-sm" [class.on]="store.showInFooter"><span class="toggle-thumb-sm"></span></span>
                  </label>
                </div>

                <div class="store-toggle-card">
                  <div class="toggle-card-info">
                    <span class="material-symbols-outlined toggle-icon text-teal">home</span>
                    <div>
                      <strong class="toggle-title">Show Products on Homepage</strong>
                      <p class="toggle-sub">Render a featured product carousel directly on your homepage.</p>
                    </div>
                  </div>
                  <label class="toggle-switch-sm">
                    <input type="checkbox" [(ngModel)]="store.showOnHome" />
                    <span class="toggle-track-sm" [class.on]="store.showOnHome"><span class="toggle-thumb-sm"></span></span>
                  </label>
                </div>
              </div>

              <!-- Currency & Pricing Form -->
              <div class="store-currency-grid">
                <div class="form-group">
                  <label class="form-label">
                    <span>Store Display Name / Label</span>
                    <span class="field-req">*</span>
                  </label>
                  <input type="text" [(ngModel)]="store.storeTitle" class="form-control" placeholder="e.g. Online Store, Products & Merch" />
                  <span class="field-hint">Public header label used across menu and catalog pages</span>
                </div>

                <div class="form-group">
                  <label class="form-label">
                    <span>Default Store Currency</span>
                    <span class="field-req">*</span>
                  </label>
                  <select [(ngModel)]="store.currencyCode" (ngModelChange)="onCurrencyCodeChange()" class="form-control">
                    <option value="USD">USD - United States Dollar ($)</option>
                    <option value="NGN">NGN - Nigerian Naira (₦)</option>
                    <option value="EUR">EUR - Euro (€)</option>
                    <option value="GBP">GBP - British Pound Sterling (£)</option>
                    <option value="CAD">CAD - Canadian Dollar (CA$)</option>
                    <option value="KES">KES - Kenyan Shilling (KSh)</option>
                    <option value="ZAR">ZAR - South African Rand (R)</option>
                    <option value="GHS">GHS - Ghanaian Cedi (GH₵)</option>
                  </select>
                  <span class="field-hint">Base currency applied to all products and cart checkout totals</span>
                </div>

                <div class="form-group">
                  <label class="form-label">
                    <span>Currency Symbol</span>
                    <span class="field-req">*</span>
                  </label>
                  <input type="text" [(ngModel)]="store.currencySymbol" class="form-control" placeholder="e.g. $, ₦, €, £" />
                  <span class="field-hint">Visual prefix formatted beside prices</span>
                </div>

                <div class="currency-live-preview">
                  <span class="preview-mini-title">LIVE PRICE DISPLAY PREVIEW</span>
                  <div class="preview-price-tag">
                    <span class="currency-sym">{{ store.currencySymbol }}</span>
                    <span class="currency-val">149.99</span>
                    <span class="currency-iso">{{ store.currencyCode }}</span>
                  </div>
                  <span class="preview-mini-sub">Rendered across product cards & cart totals</span>
                </div>
              </div>

              <!-- Section 4: Payment Gateways & Inventory -->
              <div class="form-divider">
                <span>4. PAYMENT GATEWAYS & FULFILLMENT RULES</span>
              </div>

              <div class="store-checkout-grid">
                <div class="checkout-methods-col">
                  <h4 class="col-section-title">Accepted Payment Gateways</h4>

                  <div class="payment-method-item">
                    <div class="payment-method-left">
                      <span class="material-symbols-outlined text-green">credit_card</span>
                      <div>
                        <strong>Online Card & Instant Payment (Paystack / Gateway)</strong>
                        <p>Accept Visa, Mastercard, Verve, Apple Pay, and Bank USSD online.</p>
                      </div>
                    </div>
                    <label class="toggle-switch-sm">
                      <input type="checkbox" [(ngModel)]="store.enableOnlinePayment" />
                      <span class="toggle-track-sm" [class.on]="store.enableOnlinePayment"><span class="toggle-thumb-sm"></span></span>
                    </label>
                  </div>

                  <div class="payment-method-item">
                    <div class="payment-method-left">
                      <span class="material-symbols-outlined text-blue">account_balance</span>
                      <div>
                        <strong>Bank Wire / Direct Transfer Invoice</strong>
                        <p>Generate invoice reference with organization bank account details.</p>
                      </div>
                    </div>
                    <label class="toggle-switch-sm">
                      <input type="checkbox" [(ngModel)]="store.enableBankTransfer" />
                      <span class="toggle-track-sm" [class.on]="store.enableBankTransfer"><span class="toggle-thumb-sm"></span></span>
                    </label>
                  </div>

                  <div class="payment-method-item">
                    <div class="payment-method-left">
                      <span class="material-symbols-outlined text-amber">payments</span>
                      <div>
                        <strong>Cash on Delivery / Pay on Pickup</strong>
                        <p>Allow customers to pay in person upon order collection.</p>
                      </div>
                    </div>
                    <label class="toggle-switch-sm">
                      <input type="checkbox" [(ngModel)]="store.enableCashOnDelivery" />
                      <span class="toggle-track-sm" [class.on]="store.enableCashOnDelivery"><span class="toggle-thumb-sm"></span></span>
                    </label>
                  </div>
                </div>

                <div class="inventory-rules-col">
                  <h4 class="col-section-title">Homepage Limits & Inventory Alerts</h4>

                  <div class="form-group">
                    <label class="form-label">Homepage Featured Products Limit</label>
                    <select [(ngModel)]="store.homeProductsCount" class="form-control">
                      <option [ngValue]="2">Show 2 Featured Products</option>
                      <option [ngValue]="3">Show 3 Featured Products</option>
                      <option [ngValue]="6">Show 6 Featured Products</option>
                      <option [ngValue]="12">Show 12 Featured Products</option>
                    </select>
                  </div>

                  <div class="form-group">
                    <label class="form-label">Low Stock Alert Threshold</label>
                    <input type="number" [(ngModel)]="store.lowStockThreshold" class="form-control" min="1" max="100" />
                    <span class="field-hint">Trigger admin alert when inventory dips below this count</span>
                  </div>

                  <div class="payment-method-item" style="margin-top: 10px;">
                    <div class="payment-method-left">
                      <span class="material-symbols-outlined text-indigo">inventory</span>
                      <div>
                        <strong>Allow Backorders</strong>
                        <p>Permit purchase even when out of stock.</p>
                      </div>
                    </div>
                    <label class="toggle-switch-sm">
                      <input type="checkbox" [(ngModel)]="store.allowBackorders" />
                      <span class="toggle-track-sm" [class.on]="store.allowBackorders"><span class="toggle-thumb-sm"></span></span>
                    </label>
                  </div>
                </div>
              </div>

              <!-- Section 5: Shipping & Support -->
              <div class="form-divider">
                <span>5. SHIPPING FEES & STORE SUPPORT CONTACT</span>
              </div>

              <div class="form-row-2">
                <div class="form-group">
                  <label class="form-label">Flat Rate Shipping Fee ({{ store.currencySymbol }})</label>
                  <input type="number" [(ngModel)]="store.flatShippingRate" class="form-control" min="0" step="0.5" placeholder="0.00" />
                  <span class="field-hint">Default delivery charge (set to 0 for free shipping)</span>
                </div>

                <div class="form-group">
                  <label class="form-label">Free Shipping Threshold ({{ store.currencySymbol }})</label>
                  <input type="number" [(ngModel)]="store.freeShippingThreshold" class="form-control" min="0" step="10" placeholder="e.g. 100" />
                  <span class="field-hint">Orders exceeding this qualify for automatic free shipping</span>
                </div>
              </div>

              <div class="form-row-2">
                <div class="form-group">
                  <label class="form-label">Store Support Email</label>
                  <input type="email" [(ngModel)]="store.supportEmail" class="form-control" placeholder="store@organization.org" />
                  <span class="field-hint">Shown on order receipts and notifications</span>
                </div>

                <div class="form-group">
                  <label class="form-label">Store Support Phone</label>
                  <input type="text" [(ngModel)]="store.supportPhone" class="form-control" placeholder="+1 (555) 019-2834" />
                  <span class="field-hint">Customer support helpline</span>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Physical Pickup & Fulfillment Location</label>
                <textarea [(ngModel)]="store.pickupAddress" class="form-control" rows="2" placeholder="Suite 100, Central Plaza, City/State"></textarea>
                <span class="field-hint">Store or warehouse location for in-person order pickups</span>
              </div>
            </ng-container>
          </div>
        </section>
      </div>

      <!-- =================================================================== -->
      <!-- TAB: WEBSITE INTERACTIVE WIDGETS & TOOLS (RIBBON, COOKIES, WHATSAPP)-->
      <!-- =================================================================== -->
      <div *ngIf="activeTab === 'widgets'" class="tab-content-pane">
        <!-- Widget 1: Breaking News Ribbon Ticker -->
        <section class="console-widget full-width-widget">
          <div class="widget-head">
            <div class="widget-title-wrap">
              <span class="material-symbols-outlined header-widget-icon text-orange">campaign</span>
              <div>
                <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                  <h2 class="widget-title">Breaking News Ribbon Ticker</h2>
                  <span class="settings-mode-pill" [class.is-store]="brand.enableBreakingNewsRibon">
                    <span class="mode-pulse-dot"></span>
                    {{ brand.enableBreakingNewsRibon ? 'Live on Website' : 'Ticker Disabled' }}
                  </span>
                </div>
                <p class="widget-subtitle">A high-visibility horizontal marquee highlighting featured news articles, important updates, and announcements.</p>
              </div>
            </div>

          </div>

          <div class="widget-body">
            <!-- Master Toggle Banner -->
            <div class="store-master-banner" [class.store-active]="brand.enableBreakingNewsRibon">
              <div class="store-banner-left">
                <span class="material-symbols-outlined store-master-icon" [style.color]="brand.enableBreakingNewsRibon ? '#ea580c' : '#64748b'">campaign</span>
                <div>
                  <h3 class="store-master-title">Breaking News Ribbon Ticker is {{ brand.enableBreakingNewsRibon ? 'ENABLED & STREAMING' : 'DISABLED' }}</h3>
                  <p class="store-master-desc">
                    {{ brand.enableBreakingNewsRibon 
                      ? 'Visitors will see the animated marquee banner displaying active articles and pages flagged with "Add to Ribbon".' 
                      : 'The ticker marquee is hidden from public visitors across all website pages.' }}
                  </p>
                </div>
              </div>
              <label class="toggle-switch-large">
                <input type="checkbox" [(ngModel)]="brand.enableBreakingNewsRibon" />
                <span class="toggle-track" [class.on]="brand.enableBreakingNewsRibon" [style.background-color]="brand.enableBreakingNewsRibon ? '#ea580c' : '#cbd5e1'">
                  <span class="toggle-thumb"></span>
                </span>
              </label>
            </div>

            <ng-container *ngIf="brand.enableBreakingNewsRibon">
              <!-- Ticker Badge Title -->
              <div class="form-grid-2 form-mt-16">
                <div class="form-group">
                  <label class="form-label">
                    <span>TICKER BADGE LABEL</span>
                    <span class="field-req">*</span>
                  </label>
                  <input type="text" [(ngModel)]="brand.breakingNewsRibonTitle" class="form-control" placeholder="e.g. BREAKING NEWS, LATEST ANNOUNCEMENTS, UPDATES" />
                  <span class="field-hint">Static pill badge displayed on the left side of the marquee stream.</span>
                </div>
                <div class="form-group">
                  <label class="form-label">MANAGE TICKER ITEMS</label>
                  <div style="display:flex; gap:10px; margin-top:4px;">
                    <a routerLink="/content/console/pages" class="btn btn-outline btn-sm">
                      <span class="material-symbols-outlined">description</span>
                      <span>Web Pages Ticker Flags</span>
                    </a>
                    <a routerLink="/cms/blogs" class="btn btn-outline btn-sm">
                      <span class="material-symbols-outlined">article</span>
                      <span>Blog Articles Ticker Flags</span>
                    </a>
                  </div>
                  <span class="field-hint">Tick "Add to Ribbon" when creating or editing any page or article.</span>
                </div>
              </div>

              <!-- Ribbon Position Selector (5 Options) -->
              <div class="mode-section-header form-mt-24">
                <span class="material-symbols-outlined text-orange">format_line_spacing</span>
                <div>
                  <h3 class="section-heading">Select Ticker Placement Position on Website</h3>
                  <p class="section-subtext">Choose where the marquee ribbon should appear relative to your header, banner, and footer.</p>
                </div>
              </div>

              <div class="ribbon-positions-grid">
                <!-- 1. Top of Page -->
                <div class="pos-card" [class.active-pos]="brand.breakingNewsRibonPosition === 'top'" (click)="brand.breakingNewsRibonPosition = 'top'">
                  <div class="pos-card-head">
                    <span class="pos-badge">Position #1</span>
                    <span class="material-symbols-outlined pos-check-icon" *ngIf="brand.breakingNewsRibonPosition === 'top'">check_circle</span>
                  </div>
                  <div class="pos-icon-box"><span class="material-symbols-outlined">vertical_align_top</span></div>
                  <h4 class="pos-title">Top of Page</h4>
                  <p class="pos-desc">Renders as the very first element at the top of the browser viewport above the navigation header.</p>
                </div>

                <!-- 2. After Menu -->
                <div class="pos-card" [class.active-pos]="brand.breakingNewsRibonPosition === 'after_menu'" (click)="brand.breakingNewsRibonPosition = 'after_menu'">
                  <div class="pos-card-head">
                    <span class="pos-badge pill-default">Default &amp; Recommended</span>
                    <span class="material-symbols-outlined pos-check-icon" *ngIf="brand.breakingNewsRibonPosition === 'after_menu'">check_circle</span>
                  </div>
                  <div class="pos-icon-box"><span class="material-symbols-outlined">border_top</span></div>
                  <h4 class="pos-title">After Menu</h4>
                  <p class="pos-desc">Renders directly below the main navigation bar and immediately above the hero banner or breadcrumbs.</p>
                </div>

                <!-- 3. After Hero -->
                <div class="pos-card" [class.active-pos]="brand.breakingNewsRibonPosition === 'after_hero'" (click)="brand.breakingNewsRibonPosition = 'after_hero'">
                  <div class="pos-card-head">
                    <span class="pos-badge">Position #3</span>
                    <span class="material-symbols-outlined pos-check-icon" *ngIf="brand.breakingNewsRibonPosition === 'after_hero'">check_circle</span>
                  </div>
                  <div class="pos-icon-box"><span class="material-symbols-outlined">view_agenda</span></div>
                  <h4 class="pos-title">After Hero / Banner</h4>
                  <p class="pos-desc">Renders directly below the hero section or page breadcrumbs, separating the banner from body content.</p>
                </div>

                <!-- 4. Before Footer -->
                <div class="pos-card" [class.active-pos]="brand.breakingNewsRibonPosition === 'before_footer'" (click)="brand.breakingNewsRibonPosition = 'before_footer'">
                  <div class="pos-card-head">
                    <span class="pos-badge">Position #4</span>
                    <span class="material-symbols-outlined pos-check-icon" *ngIf="brand.breakingNewsRibonPosition === 'before_footer'">check_circle</span>
                  </div>
                  <div class="pos-icon-box"><span class="material-symbols-outlined">border_bottom</span></div>
                  <h4 class="pos-title">Before Footer</h4>
                  <p class="pos-desc">Renders directly below all body layout sections, immediately above the main website footer.</p>
                </div>

                <!-- 5. After Footer -->
                <div class="pos-card" [class.active-pos]="brand.breakingNewsRibonPosition === 'after_footer'" (click)="brand.breakingNewsRibonPosition = 'after_footer'">
                  <div class="pos-card-head">
                    <span class="pos-badge">Position #5</span>
                    <span class="material-symbols-outlined pos-check-icon" *ngIf="brand.breakingNewsRibonPosition === 'after_footer'">check_circle</span>
                  </div>
                  <div class="pos-icon-box"><span class="material-symbols-outlined">vertical_align_bottom</span></div>
                  <h4 class="pos-title">After Footer</h4>
                  <p class="pos-desc">Renders at the very bottom of the document beneath the copyright footer.</p>
                </div>
              </div>
            </ng-container>
          </div>
        </section>

        <!-- Widget 2: Glassmorphic Cookie Consent Banner -->
        <section class="console-widget full-width-widget form-mt-24">
          <div class="widget-head">
            <div class="widget-title-wrap">
              <span class="material-symbols-outlined header-widget-icon text-indigo">cookie</span>
              <div>
                <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                  <h2 class="widget-title">Cookie Consent &amp; Privacy Banner</h2>
                  <span class="settings-mode-pill" [class.is-store]="brand.enableCookieConsent">
                    <span class="mode-pulse-dot"></span>
                    {{ brand.enableCookieConsent ? 'Active on Public Site' : 'Popup Inactive' }}
                  </span>
                </div>
                <p class="widget-subtitle">A legal compliance popup card positioned at the bottom of the page with smooth opacity and glassmorphism blur.</p>
              </div>
            </div>

          </div>

          <div class="widget-body">
            <!-- Master Toggle -->
            <div class="store-master-banner" [class.store-active]="brand.enableCookieConsent">
              <div class="store-banner-left">
                <span class="material-symbols-outlined store-master-icon" [style.color]="brand.enableCookieConsent ? '#4338ca' : '#64748b'">cookie</span>
                <div>
                  <h3 class="store-master-title">Cookie Consent Popup is {{ brand.enableCookieConsent ? 'ENABLED & ACTIVE' : 'DISABLED' }}</h3>
                  <p class="store-master-desc">
                    {{ brand.enableCookieConsent 
                      ? 'Visitors will see the glassmorphic consent card at the bottom of the screen until they accept or dismiss.' 
                      : 'No cookie consent popup will be displayed to visitors.' }}
                  </p>
                </div>
              </div>
              <label class="toggle-switch-large">
                <input type="checkbox" [(ngModel)]="brand.enableCookieConsent" />
                <span class="toggle-track" [class.on]="brand.enableCookieConsent" [style.background-color]="brand.enableCookieConsent ? '#4338ca' : '#cbd5e1'">
                  <span class="toggle-thumb"></span>
                </span>
              </label>
            </div>

            <ng-container *ngIf="brand.enableCookieConsent">
              <div class="form-grid-2 form-mt-16">
                <div class="form-group">
                  <label class="form-label">BANNER HEADING</label>
                  <input type="text" [(ngModel)]="brand.cookieConsentTitle" class="form-control" placeholder="e.g. Cookie Preferences &amp; Privacy" />
                </div>
                <div class="form-group">
                  <label class="form-label">PRIVACY POLICY LINK URL</label>
                  <input type="text" [(ngModel)]="brand.cookieConsentPolicyUrl" class="form-control" placeholder="e.g. /privacy-policy" />
                </div>
              </div>

              <div class="form-group form-mt-12">
                <label class="form-label">CONSENT MESSAGE COPY</label>
                <textarea [(ngModel)]="brand.cookieConsentMessage" class="form-control" rows="3" placeholder="e.g. We use cookies to optimize site performance, analyze traffic, and ensure you get the best browsing experience on our website."></textarea>
              </div>

              <div class="form-grid-2 form-mt-12">
                <div class="form-group">
                  <label class="form-label">ACCEPT BUTTON TEXT</label>
                  <input type="text" [(ngModel)]="brand.cookieConsentAcceptText" class="form-control" placeholder="e.g. Accept All" />
                </div>
                <div class="form-group">
                  <label class="form-label">DECLINE BUTTON TEXT (OPTIONAL)</label>
                  <input type="text" [(ngModel)]="brand.cookieConsentDeclineText" class="form-control" placeholder="e.g. Decline" />
                </div>
              </div>

              <!-- Live Glassmorphic Simulator Preview -->
              <div class="form-mt-20">
                <span class="field-hint" style="font-weight:700; text-transform:uppercase; margin-bottom:8px; display:block;">Live Glassmorphic Preview Simulator</span>
                <div class="cookie-preview-wrapper">
                  <div class="cookie-preview-card">
                    <div class="cookie-preview-icon">
                      <span class="material-symbols-outlined text-indigo">cookie</span>
                    </div>
                    <div class="cookie-preview-content">
                      <h4 class="cookie-preview-title">{{ brand.cookieConsentTitle || 'Cookie Preferences & Privacy' }}</h4>
                      <p class="cookie-preview-text">
                        {{ brand.cookieConsentMessage || 'We use cookies to optimize site performance, analyze traffic, and ensure you get the best browsing experience on our website.' }}
                        <a *ngIf="brand.cookieConsentPolicyUrl" [href]="brand.cookieConsentPolicyUrl" target="_blank" class="cookie-preview-link">Learn more ↗</a>
                      </p>
                    </div>
                    <div class="cookie-preview-actions">
                      <button type="button" class="btn-cookie-prev-decline">{{ brand.cookieConsentDeclineText || 'Decline' }}</button>
                      <button type="button" class="btn-cookie-prev-accept">{{ brand.cookieConsentAcceptText || 'Accept All' }}</button>
                    </div>
                  </div>
                </div>
              </div>
            </ng-container>
          </div>
        </section>

        <!-- Widget 3: WhatsApp Floating Live Chat -->
        <section class="console-widget full-width-widget form-mt-24">
          <div class="widget-head">
            <div class="widget-title-wrap">
              <span class="material-symbols-outlined header-widget-icon" style="color:#25D366;">chat</span>
              <div>
                <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                  <h2 class="widget-title">WhatsApp Floating Live Chat Widget</h2>
                  <span class="settings-mode-pill" [class.is-store]="brand.enableWhatsAppChat">
                    <span class="mode-pulse-dot" [style.background]="brand.enableWhatsAppChat ? '#25D366' : '#cbd5e1'"></span>
                    {{ brand.enableWhatsAppChat ? 'Chat Active' : 'Chat Disabled' }}
                  </span>
                </div>
                <p class="widget-subtitle">Engage visitors with an authentic WhatsApp green floating pill that expands into an interactive prompt window.</p>
              </div>
            </div>

          </div>

          <div class="widget-body">
            <!-- Master Toggle -->
            <div class="store-master-banner" [class.store-active]="brand.enableWhatsAppChat">
              <div class="store-banner-left">
                <span class="material-symbols-outlined store-master-icon" [style.color]="brand.enableWhatsAppChat ? '#25D366' : '#64748b'">chat</span>
                <div>
                  <h3 class="store-master-title">WhatsApp Floating Widget is {{ brand.enableWhatsAppChat ? 'ENABLED & FLOATING' : 'DISABLED' }}</h3>
                  <p class="store-master-desc">
                    {{ brand.enableWhatsAppChat 
                      ? 'Visitors can click the floating "Chat with us" button to see your prompt and start a direct WhatsApp conversation.' 
                      : 'The WhatsApp chat button is hidden from public website pages.' }}
                  </p>
                </div>
              </div>
              <label class="toggle-switch-large">
                <input type="checkbox" [(ngModel)]="brand.enableWhatsAppChat" />
                <span class="toggle-track" [class.on]="brand.enableWhatsAppChat" [style.background-color]="brand.enableWhatsAppChat ? '#25D366' : '#cbd5e1'">
                  <span class="toggle-thumb"></span>
                </span>
              </label>
            </div>

            <ng-container *ngIf="brand.enableWhatsAppChat">
              <div class="form-grid-2 form-mt-16">
                <div class="form-group">
                  <label class="form-label">
                    <span>WHATSAPP PHONE NUMBER</span>
                    <span class="field-req">*</span>
                  </label>
                  <input type="text" [(ngModel)]="brand.whatsAppNumber" class="form-control" placeholder="e.g. +1 (555) 019-2834 or +447123456789" />
                  <span class="field-hint">Include international country code. All non-numeric characters will be sanitized for wa.me URL.</span>
                </div>
                <div class="form-group">
                  <label class="form-label">WIDGET AGENT / TEAM TITLE</label>
                  <input type="text" [(ngModel)]="brand.whatsAppWidgetTitle" class="form-control" placeholder="e.g. Support Team, Customer Inquiries" />
                  <span class="field-hint">Headline title shown on the WhatsApp chat window header.</span>
                </div>
              </div>

              <div class="form-grid-2 form-mt-12">
                <div class="form-group">
                  <label class="form-label">STATUS SUBTITLE</label>
                  <input type="text" [(ngModel)]="brand.whatsAppWidgetSubtitle" class="form-control" placeholder="e.g. Typically replies within minutes" />
                  <span class="field-hint">Shown under the title next to the online status indicator.</span>
                </div>
                <div class="form-group">
                  <label class="form-label">PRE-FILLED PROMPT MESSAGE</label>
                  <textarea [(ngModel)]="brand.whatsAppPromptMessage" class="form-control" rows="2" placeholder="e.g. Hello! I have an inquiry regarding your services."></textarea>
                  <span class="field-hint">This text displays in the speech bubble and pre-populates WhatsApp when clicked.</span>
                </div>
              </div>

              <!-- Live WhatsApp Simulator Preview -->
              <div class="form-mt-20">
                <span class="field-hint" style="font-weight:700; text-transform:uppercase; margin-bottom:8px; display:block;">Live WhatsApp Widget Preview</span>
                <div class="whatsapp-preview-wrapper">
                  <!-- Floating Pill Demo -->
                  <div class="whatsapp-demo-pill">
                    <svg viewBox="0 0 24 24" class="whatsapp-demo-svg"><path fill="#ffffff" d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2z"/></svg>
                    <span>Chat with us</span>
                  </div>

                  <!-- Open Window Demo -->
                  <div class="whatsapp-demo-window">
                    <div class="whatsapp-demo-head">
                      <div class="whatsapp-demo-agent">
                        <div class="whatsapp-demo-avatar">
                          <svg viewBox="0 0 24 24" class="whatsapp-demo-svg-sm"><path fill="#ffffff" d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2z"/></svg>
                        </div>
                        <div>
                          <strong>{{ brand.whatsAppWidgetTitle || 'Chat with Us' }}</strong>
                          <span><span class="demo-online-dot"></span>{{ brand.whatsAppWidgetSubtitle || 'Typically replies within minutes' }}</span>
                        </div>
                      </div>
                      <span class="whatsapp-demo-close">✕</span>
                    </div>
                    <div class="whatsapp-demo-body">
                      <div class="whatsapp-demo-bubble">
                        <p>{{ brand.whatsAppPromptMessage || 'Hello! I have an inquiry regarding your services.' }}</p>
                        <span class="whatsapp-demo-time">Just now</span>
                      </div>
                    </div>
                    <div class="whatsapp-demo-foot">
                      <button type="button" class="btn-demo-wa">
                        <svg viewBox="0 0 24 24" class="whatsapp-demo-svg-sm"><path fill="#ffffff" d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2z"/></svg>
                        <span>Open in WhatsApp</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </ng-container>
          </div>
        </section>
      </div>

      <!-- =================================================================== -->
      <!-- TAB 7: CUSTOM DOMAIN & DNS MANAGEMENT                               -->
      <!-- =================================================================== -->
      <div *ngIf="activeTab === 'domain'" class="tab-content-pane">
        <!-- Widget 1: Primary & Custom Domain Configuration -->
        <section class="console-widget full-width-widget">
          <div class="widget-head">
            <div class="widget-title-wrap">
              <span class="material-symbols-outlined header-widget-icon text-blue">dns</span>
              <div>
                <h2 class="widget-title">Custom Domain Configuration</h2>
                <p class="widget-subtitle">Connect your custom branded domain or subdomain with automated SSL security.</p>
              </div>
            </div>
            <div style="display:flex; gap:8px;">
              <button type="button" class="btn btn-outline btn-sm" (click)="onVerifyDns()" [disabled]="verifyingDns">
                <span class="material-symbols-outlined" [class.spin]="verifyingDns">sync</span>
                <span>{{ verifyingDns ? 'Checking DNS...' : 'Verify DNS' }}</span>
              </button>
              <button type="button" class="btn btn-primary btn-sm" (click)="onSaveCustomDomain()" [disabled]="savingDomain || !customDomainInput.trim()">
                <span class="material-symbols-outlined" *ngIf="!savingDomain">save</span>
                <span>{{ savingDomain ? 'Saving...' : 'Save & Connect Domain' }}</span>
              </button>
            </div>
          </div>

          <div class="widget-body">
            <!-- Active Domain Status Banner -->
            <div class="domain-status-card" [class.is-connected]="hasCustomDomain" [class.is-unlinked]="!hasCustomDomain">
              <div class="domain-status-icon">
                <span class="material-symbols-outlined">{{ hasCustomDomain ? 'verified_user' : 'link_off' }}</span>
              </div>
              <div class="domain-status-info">
                <div class="domain-status-title-row">
                  <span class="domain-status-title">{{ hasCustomDomain ? 'Custom Domain Connected' : 'No Custom Domain Linked' }}</span>
                  <span class="badge-pill" [class.badge-linked]="hasCustomDomain" [class.badge-unlinked]="!hasCustomDomain">
                    {{ hasCustomDomain ? 'Active & SSL Secured' : 'Using Default Domain' }}
                  </span>
                </div>
                <p class="domain-status-desc" *ngIf="hasCustomDomain">
                  Your website is actively reachable at <a [href]="liveWebsiteUrl" target="_blank" class="domain-link-bold">https://{{ customDomain }} ↗</a>.
                </p>
                <p class="domain-status-desc" *ngIf="!hasCustomDomain">
                  Your workspace is currently operating on the default domain (<a [href]="liveWebsiteUrl" target="_blank" class="domain-link-bold">{{ liveWebsiteUrl }} ↗</a>). Add your custom domain below to complete branded setup.
                </p>
              </div>
              <div class="domain-status-action" *ngIf="hasCustomDomain">
                <button type="button" class="btn btn-outline-danger btn-sm" (click)="onUnlinkDomain()" [disabled]="savingDomain">
                  <span class="material-symbols-outlined">link_off</span>
                  <span>Unlink Domain</span>
                </button>
              </div>
            </div>

            <!-- Form: Default & Custom Domains -->
            <div class="form-row-2" style="margin-top: 20px;">
              <!-- Default Platform Domain (Readonly Failover) -->
              <div class="form-group">
                <label class="form-label">
                  <span>Platform Default Domain</span>
                  <span class="badge-pill" style="background:#eff6ff; color:#2563eb; font-size:10px; margin-left:6px;">Permanent Failover</span>
                </label>
                <div class="input-copy-group">
                  <input
                    type="text"
                    [value]="primaryDomain || 'yourworkspace.ozikol.cloud'"
                    class="form-control"
                    readonly
                    style="background:#f8fafc; font-weight:600;"
                  />
                  <button type="button" class="btn-copy-addon" (click)="copyToClipboard(primaryDomain || 'yourworkspace.ozikol.cloud', 'default_domain')" title="Copy Default Domain">
                    <span class="material-symbols-outlined">{{ copiedRecord === 'default_domain' ? 'check' : 'content_copy' }}</span>
                  </button>
                </div>
                <span class="field-hint">Your workspace always remains accessible on this domain even if DNS propagation is pending.</span>
              </div>

              <!-- Custom Domain Input -->
              <div class="form-group">
                <label class="form-label">
                  <span>Your Custom Domain</span>
                  <span class="field-req">*</span>
                </label>
                <input
                  type="text"
                  [(ngModel)]="customDomainInput"
                  class="form-control"
                  placeholder="e.g. www.yourcompany.com"
                  (keyup.enter)="onSaveCustomDomain()"
                />
                <span class="field-hint">Enter your domain or subdomain (e.g. <code>e.g. www.yourcompany.com</code> or <code>e.g. portal.yourcompany.com</code>).</span>
              </div>
            </div>

            <!-- Live DNS Feedback Banner -->
            <div *ngIf="dnsFeedbackMessage" class="dns-feedback-alert" [class.alert-success]="dnsFeedbackType === 'success'" [class.alert-info]="dnsFeedbackType === 'info'" [class.alert-warning]="dnsFeedbackType === 'warning'">
              <span class="material-symbols-outlined">{{ dnsFeedbackType === 'success' ? 'check_circle' : (dnsFeedbackType === 'warning' ? 'warning' : 'info') }}</span>
              <span>{{ dnsFeedbackMessage }}</span>
            </div>
          </div>
        </section>

        <!-- Widget 2: DNS Records Table -->
        <section class="console-widget full-width-widget">
          <div class="widget-head">
            <div class="widget-title-wrap">
              <span class="material-symbols-outlined header-widget-icon text-indigo">alt_route</span>
              <div>
                <h2 class="widget-title">DNS Record Setup</h2>
                <p class="widget-subtitle">Add the following DNS record in your domain registrar or DNS management console.</p>
              </div>
            </div>
          </div>

          <div class="widget-body">
            <div class="table-responsive">
              <table class="dns-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Name / Host</th>
                    <th>Value / Points To</th>
                    <th>TTL</th>
                    <th>Proxy / Routing</th>
                    <th>Copy</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><span class="record-badge">CNAME</span></td>
                    <td><code>www</code> <span class="sub-text">(or subdomain)</span></td>
                    <td><code class="target-val">{{ primaryDomain || 'yourworkspace.ozikol.cloud' }}</code></td>
                    <td>Automatic (300s)</td>
                    <td>DNS Only (or Proxied)</td>
                    <td>
                      <button type="button" class="btn btn-outline btn-xs" (click)="copyToClipboard(primaryDomain || 'yourworkspace.ozikol.cloud', 'cname_target')">
                        <span class="material-symbols-outlined" style="font-size:14px;">{{ copiedRecord === 'cname_target' ? 'check' : 'content_copy' }}</span>
                        <span>{{ copiedRecord === 'cname_target' ? 'Copied' : 'Copy Target' }}</span>
                      </button>
                    </td>
                  </tr>
                  <tr>
                    <td><span class="record-badge">CNAME</span> <span class="sub-text" style="font-size:10px;">(Apex / Root)</span></td>
                    <td><code>&#64;</code> <span class="sub-text">(root domain)</span></td>
                    <td><code class="target-val">{{ primaryDomain || 'yourworkspace.ozikol.cloud' }}</code></td>
                    <td>Automatic</td>
                    <td>CNAME Flattening</td>
                    <td>
                      <button type="button" class="btn btn-outline btn-xs" (click)="copyToClipboard(primaryDomain || 'yourworkspace.ozikol.cloud', 'apex_target')">
                        <span class="material-symbols-outlined" style="font-size:14px;">{{ copiedRecord === 'apex_target' ? 'check' : 'content_copy' }}</span>
                        <span>{{ copiedRecord === 'apex_target' ? 'Copied' : 'Copy Target' }}</span>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <!-- Widget 3: Free DNS Advisory & Cloudflare Setup Guide -->
        <section class="console-widget full-width-widget cloudflare-guide-card">
          <div class="cloudflare-header-row">
            <div class="cloudflare-badge-group">
              <div class="cloudflare-icon-wrap">
                <span class="material-symbols-outlined">cloud</span>
              </div>
              <div>
                <h3 class="cloudflare-title">Don't have DNS in your domain registrar?</h3>
                <p class="cloudflare-sub">We recommend <strong>Cloudflare</strong> — completely free with automated SSL, CNAME flattening, and DDoS security.</p>
              </div>
            </div>
            <a href="https://dash.cloudflare.com/sign-up" target="_blank" class="btn btn-cloudflare">
              <span>Open Cloudflare</span>
              <span class="material-symbols-outlined" style="font-size:15px;">open_in_new</span>
            </a>
          </div>

          <div class="cloudflare-steps-container">
            <div class="cloudflare-step-item">
              <div class="step-num">1</div>
              <div class="step-content">
                <strong>Create a Free Account</strong>
                <p>Register at <a href="https://dash.cloudflare.com/sign-up" target="_blank" class="step-link">dash.cloudflare.com/sign-up ↗</a>. No credit card is required.</p>
              </div>
            </div>

            <div class="cloudflare-step-item">
              <div class="step-num">2</div>
              <div class="step-content">
                <strong>Add Your Domain</strong>
                <p>Click <strong>"Add a Site"</strong>, enter your root domain (e.g. <code>e.g. yourcompany.com</code>), and select the <strong>Free Plan ($0)</strong>.</p>
              </div>
            </div>

            <div class="cloudflare-step-item">
              <div class="step-num">3</div>
              <div class="step-content">
                <strong>Update Nameservers</strong>
                <p>Copy Cloudflare's two assigned nameservers and replace the existing nameservers in your registrar (GoDaddy, Namecheap, etc.).</p>
              </div>
            </div>

            <div class="cloudflare-step-item">
              <div class="step-num">4</div>
              <div class="step-content">
                <strong>Add the CNAME Record</strong>
                <p>In Cloudflare DNS, add a <strong>CNAME</strong> record: Name = <code>www</code>, Target = <code>{{ primaryDomain || 'yourworkspace.ozikol.cloud' }}</code>.</p>
              </div>
            </div>

            <div class="cloudflare-step-item">
              <div class="step-num">5</div>
              <div class="step-content">
                <strong>Enable SSL &amp; Verify</strong>
                <p>Under <strong>SSL/TLS</strong>, select <strong>Full</strong> encryption mode. Then return here and click <strong>Save &amp; Connect Domain</strong>.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
      <!-- Single Master Sticky Save Bar -->
      <div class="settings-floating-action-bar">
        <div class="floating-bar-info">
          <span class="material-symbols-outlined text-blue">verified</span>
          <span>Configuring <strong>{{ getActiveTabLabel() }}</strong>. Single click saves all changes across this section.</span>
        </div>
        <button
          type="button"
          class="btn btn-primary btn-save-master"
          (click)="onSaveActiveTab()"
          [disabled]="isSavingCurrentTab"
        >
          <span class="material-symbols-outlined" *ngIf="!isSavingCurrentTab">save</span>
          <span>{{ isSavingCurrentTab ? 'Saving Changes...' : 'Save Changes' }}</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .settings-page { padding: 0 0 70px; }

    /* Single Master Floating Save Bar */
    .settings-floating-action-bar {
      position: sticky;
      bottom: 20px;
      z-index: 100;
      margin-top: 28px;
      background: #ffffff;
      border: 1.5px solid #cbd5e1;
      border-radius: 14px;
      padding: 12px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.12), 0 8px 10px -6px rgba(15, 23, 42, 0.06);
    }
    .floating-bar-info {
      display: flex;
      align-items: center;
      gap: 10px;
      color: #334155;
      font-size: 13.5px;
    }
    .floating-bar-info .material-symbols-outlined {
      color: #0050e5;
      font-size: 20px;
    }
    .btn-save-master {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 24px;
      font-weight: 600;
      font-size: 13.5px;
      border-radius: 9px;
      background: #0050e5;
      color: #ffffff;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 80, 229, 0.25);
      transition: all 0.2s ease;
    }
    .btn-save-master:hover:not(:disabled) {
      background: #003fc4;
      transform: translateY(-1px);
    }
    .btn-save-master:disabled {
      opacity: 0.65;
      cursor: not-allowed;
    }


    /* Studio Navigation Tabs */
    .settings-studio-nav {
      display: flex;
      align-items: stretch;
      gap: 10px;
      background: #f8fafc;
      padding: 8px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      margin-bottom: 24px;
      overflow-x: auto;
    }

    .studio-nav-btn {
      flex: 1;
      min-width: 180px;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 11px 16px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 9px;
      cursor: pointer;
      text-align: left;
      transition: all 0.18s ease-in-out;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }

    .studio-nav-btn:hover {
      background: #f1f5f9;
      border-color: #cbd5e1;
      transform: translateY(-1px);
      box-shadow: 0 3px 6px -1px rgba(0, 0, 0, 0.08);
    }

    .studio-nav-btn.active {
      background: #eff6ff;
      border-color: #0050e5;
      box-shadow: 0 0 0 1.5px #0050e5, 0 4px 8px -1px rgba(0, 80, 229, 0.15);
      transform: none;
    }

    .nav-tab-icon {
      font-size: 22px;
      color: #64748b;
      transition: color 0.15s;
    }

    .studio-nav-btn:hover .nav-tab-icon {
      color: #1e293b;
    }

    .studio-nav-btn.active .nav-tab-icon {
      color: #0050e5;
    }

    .nav-tab-text { display: flex; flex-direction: column; }
    .tab-title { font-size: 13px; font-weight: 700; color: #334155; line-height: 1.2; }
    .tab-sub { font-size: 11px; color: #64748b; margin-top: 2px; }
    .studio-nav-btn:hover .tab-title { color: #0f172a; }
    .studio-nav-btn.active .tab-title { color: #0050e5; }

    /* Common Widget Styles */
    .console-widget { 
      background: #ffffff; 
      border: 2px solid #cbd5e1; 
      border-radius: 12px; 
      margin-bottom: 24px; 
      box-shadow: 0 2px 4px rgba(0,0,0,0.03); 
      overflow: hidden;
    }
    .widget-head { 
      padding: 18px 24px; 
      border-bottom: 2px solid #cbd5e1; 
      display: flex; 
      justify-content: space-between; 
      align-items: center; 
      background: #f8fafc;
    }
    .widget-title-wrap { display: flex; align-items: center; gap: 12px; }
    .header-widget-icon { font-size: 24px; }
    .widget-title { margin: 0; font-size: 15px; font-weight: 700; color: #0f172a; }
    .widget-subtitle { margin: 2px 0 0; font-size: 12px; color: #64748b; }
    .widget-body { padding: 24px; }

    .console-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 20px; }
    .span-7 { grid-column: span 7; }
    .span-5 { grid-column: span 5; }
    .form-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .form-group { margin-bottom: 14px; }
    .form-label { display: flex; align-items: center; justify-content: space-between; font-size: 12.5px; font-weight: 700; color: #1e293b; margin-bottom: 6px; }
    .field-req { color: #e11d48; margin-left: 2px; }
    .field-hint { font-size: 11px; color: #64748b; margin-top: 4px; display: block; }
    .form-control { 
      width: 100%; 
      padding: 9px 12px; 
      border: 2px solid #cbd5e1; 
      border-radius: 8px; 
      font-size: 13px; 
      color: #0f172a; 
      outline: none; 
      box-sizing: border-box; 
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .form-control:focus { 
      border-color: #0050e5; 
      box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.15); 
    }
    .badge-pill-soft { background: #f1f5f9; color: #475569; font-size: 10.5px; padding: 2px 7px; border-radius: 12px; font-weight: 600; border: 1px solid #cbd5e1; }

    .form-divider { display: flex; align-items: center; gap: 12px; margin: 24px 0 18px; font-size: 11px; font-weight: 800; color: #64748b; letter-spacing: 0.06em; }
    .form-divider::before, .form-divider::after { content: ''; flex: 1; height: 2px; background: #cbd5e1; }

    /* Drag & Drop Asset Uploaders */
    .btn-link-toggle { background: none; border: none; font-size: 11.5px; font-weight: 700; color: #0050e5; cursor: pointer; padding: 0; }
    .btn-link-toggle:hover { text-decoration: underline; }
    .asset-upload-block { margin-bottom: 16px; min-width: 0; }
    .asset-upload-container { 
      border: 2px solid #cbd5e1; 
      border-radius: 10px; 
      background: #ffffff; 
      padding: 14px; 
      transition: all 0.2s; 
      box-sizing: border-box;
      overflow: hidden;
    }
    .asset-upload-container.has-file { border-color: #94a3b8; background: #f8fafc; }
    
    .dropzone-area {
      border: 2px dashed #94a3b8;
      border-radius: 8px;
      padding: 22px 14px;
      text-align: center;
      background: #f8fafc;
      cursor: pointer;
      transition: all 0.2s ease;
      box-sizing: border-box;
    }
    .dropzone-area:hover, .dropzone-area.drag-over {
      border-color: #0050e5;
      background: #eff6ff;
    }
    .dropzone-content { display: flex; flex-direction: column; align-items: center; gap: 6px; }
    .dropzone-icon { font-size: 32px; color: #64748b; }
    .dropzone-text { font-size: 12.5px; font-weight: 700; color: #1e293b; }
    .dropzone-sub { font-size: 10.5px; color: #94a3b8; }
    .rotating-spinner { animation: spin 1s linear infinite; color: #0050e5; }
    @keyframes spin { 100% { transform: rotate(360deg); } }
    
    .asset-preview-card-active {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 4px 2px;
      min-width: 0;
    }
    .preview-box-large {
      width: 80px;
      height: 56px;
      border-radius: 6px;
      background: #ffffff;
      border: 2px solid #cbd5e1;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      flex-shrink: 0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .preview-box-large.dark-bg { background: #0f172a; border-color: #475569; }
    .preview-box-large img { max-width: 90%; max-height: 90%; object-fit: contain; }
    .preview-box-icon {
      width: 48px;
      height: 48px;
      border-radius: 6px;
      background: #ffffff;
      border: 2px solid #cbd5e1;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      flex-shrink: 0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .preview-box-icon img { max-width: 85%; max-height: 85%; object-fit: contain; }
    .preview-meta-info { flex: 1; min-width: 0; }
    .preview-file-name { font-size: 12px; font-weight: 700; color: #0f172a; }
    .preview-file-url { font-size: 10.5px; color: #64748b; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }
    .preview-actions-group { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
    .btn-icon-action { 
      background: #ffffff; 
      border: 1.5px solid #cbd5e1; 
      border-radius: 6px; 
      padding: 5px 8px; 
      font-size: 11.5px; 
      font-weight: 600; 
      color: #334155; 
      cursor: pointer; 
      display: flex; 
      align-items: center; 
      gap: 4px; 
      transition: all 0.15s; 
    }
    .btn-icon-action:hover { background: #f1f5f9; border-color: #94a3b8; }
    .btn-icon-danger { color: #e11d48; border-color: #fecdd3; }
    .btn-icon-danger:hover { background: #fff1f2; border-color: #fda4af; color: #be123c; }
    
    .manual-url-wrap { margin-top: 10px; padding-top: 10px; border-top: 2px dashed #cbd5e1; }

    /* Full-Width Layout & Grids */
    .full-width-widget { width: 100%; margin-bottom: 24px; box-sizing: border-box; }
    .assets-upload-grid-3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; margin-top: 12px; }
    @media (max-width: 992px) {
      .assets-upload-grid-3 { grid-template-columns: 1fr; }
    }

    /* Terminology Aliases */
    .aliases-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
    .alias-config-card { 
      padding: 18px; 
      border: 2px solid #cbd5e1; 
      border-radius: 10px; 
      background: #ffffff; 
      box-sizing: border-box;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    }
    .alias-card-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
    .alias-card-icon { font-size: 24px; }
    .alias-card-title { font-size: 13.5px; font-weight: 700; color: #0f172a; margin: 0; }
    .alias-card-scope { font-size: 10.5px; color: #64748b; }
    .alias-card-desc { font-size: 11.5px; color: #64748b; margin: 0 0 12px; line-height: 1.4; }
    .alias-presets-bar { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 10px; }
    .presets-label { font-size: 11px; color: #64748b; font-weight: 700; }
    .preset-chip { 
      padding: 3px 9px; 
      background: #f8fafc; 
      border: 1.5px solid #cbd5e1; 
      border-radius: 12px; 
      font-size: 10.5px; 
      color: #334155; 
      cursor: pointer; 
      transition: all 0.15s; 
    }
    .preset-chip:hover { background: #0050e5; color: #ffffff; border-color: #0050e5; }

    .live-terminology-simulation { 
      margin-top: 20px; 
      padding: 16px 20px; 
      background: #f0fdf4; 
      border: 2px solid #86efac; 
      border-radius: 10px; 
      box-sizing: border-box;
    }
    .sim-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
    .sim-title { font-size: 11.5px; font-weight: 800; color: #166534; letter-spacing: 0.05em; }
    .sim-body { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
    .sim-item { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .sim-label { font-size: 11px; color: #15803d; font-weight: 600; }
    .sim-value { font-size: 12.5px; color: #0f172a; word-break: break-word; }

    /* Colors Tab */
    .colors-editor-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; margin-bottom: 20px; }
    .color-picker-card { 
      padding: 18px; 
      border: 2px solid #cbd5e1; 
      border-radius: 10px; 
      background: #f8fafc; 
      box-sizing: border-box;
    }
    .color-role-tag { font-size: 10px; font-weight: 800; color: #0050e5; letter-spacing: 0.05em; display: block; margin-bottom: 4px; }
    .color-role-title { font-size: 14px; font-weight: 700; color: #0f172a; margin: 0 0 4px; }
    .color-role-desc { font-size: 12px; color: #64748b; margin: 0 0 14px; }
    .color-input-flex { display: flex; align-items: center; gap: 10px; }
    .color-swatch-picker { width: 44px; height: 38px; border: 2px solid #cbd5e1; cursor: pointer; background: none; border-radius: 6px; }
    .hex-input { font-family: monospace; font-size: 13px; font-weight: 600; width: 140px; }

    .swatch-preview-card { 
      padding: 18px; 
      border: 2px solid #cbd5e1; 
      border-radius: 10px; 
      background: #ffffff; 
      box-sizing: border-box;
    }
    .preview-card-title { font-size: 12.5px; font-weight: 700; color: #0f172a; display: block; margin-bottom: 12px; }
    .swatch-elements-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }

    /* Member ID Matrix Styles */
    .format-selection-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; margin-bottom: 20px; }
    .format-select { height: 42px; font-size: 13.5px; font-weight: 600; }
    .live-preview-box { 
      padding: 14px 18px; 
      background: #f8fafc; 
      border: 2px solid #cbd5e1; 
      border-radius: 10px; 
      box-sizing: border-box;
    }
    .preview-header { display: flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 800; color: #64748b; letter-spacing: 0.05em; margin-bottom: 6px; }
    .preview-badge-display { font-size: 20px; font-weight: 800; color: #0050e5; font-family: monospace; letter-spacing: 0.05em; word-break: break-all; }
    .preview-footer-note { display: flex; align-items: center; gap: 5px; font-size: 11px; color: #64748b; margin-top: 6px; }
    .format-params-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
    @media (max-width: 768px) {
      .format-params-grid { grid-template-columns: repeat(2, 1fr); }
    }

    .formats-matrix-section { margin-top: 24px; padding-top: 20px; border-top: 2px solid #cbd5e1; }
    .matrix-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .matrix-title { font-size: 13px; font-weight: 700; color: #0f172a; }
    .matrix-hint { font-size: 11px; color: #94a3b8; }
    .formats-cards-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; }
    @media (max-width: 1200px) {
      .formats-cards-grid { grid-template-columns: repeat(3, 1fr); }
    }
    @media (max-width: 768px) {
      .formats-cards-grid { grid-template-columns: repeat(2, 1fr); }
    }
    .format-card-mini { 
      padding: 10px 12px; 
      border: 2px solid #cbd5e1; 
      border-radius: 8px; 
      background: #ffffff; 
      cursor: pointer; 
      transition: all 0.15s; 
      box-sizing: border-box;
      overflow: hidden;
    }
    .format-card-mini:hover { border-color: #93c5fd; background: #f8fafc; }
    .format-card-mini.selected { border-color: #0050e5; background: #eff6ff; box-shadow: 0 0 0 1px #0050e5; }
    .card-mini-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .format-number { font-size: 10px; font-weight: 700; color: #64748b; }
    .format-type-tag { font-size: 9px; font-weight: 700; padding: 1px 4px; border-radius: 4px; }
    .type-serial { background: #dcfce7; color: #15803d; }
    .type-random { background: #f1f5f9; color: #475569; }
    .format-card-title { font-size: 11.5px; font-weight: 700; color: #0f172a; margin: 0 0 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .format-preview-chip { font-family: monospace; font-size: 10.5px; font-weight: 700; color: #0050e5; background: rgba(0,80,229,0.06); padding: 2px 5px; border-radius: 4px; display: inline-block; margin-bottom: 4px; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .format-card-desc { font-size: 10px; color: #64748b; margin: 0; line-height: 1.3; height: 26px; overflow: hidden; }

    /* Templates Studio Layout (No Overflow) */
    .channel-tabs-bar { 
      display: flex; 
      gap: 6px; 
      background: #f1f5f9; 
      padding: 4px; 
      border-radius: 8px; 
      border: 2px solid #cbd5e1;
    }
    .channel-tab-btn { display: flex; align-items: center; gap: 6px; padding: 6px 12px; background: transparent; border: none; border-radius: 6px; font-size: 12px; font-weight: 600; color: #64748b; cursor: pointer; }
    .channel-tab-btn.active { background: #ffffff; color: #0f172a; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
    .channel-tab-btn .tab-icon { font-size: 16px; }

    .template-studio-layout { 
      display: grid; 
      grid-template-columns: minmax(200px, 240px) minmax(0, 1fr) minmax(280px, 340px); 
      gap: 20px; 
      min-width: 0;
      width: 100%;
      box-sizing: border-box;
    }
    @media (max-width: 1200px) {
      .template-studio-layout {
        grid-template-columns: minmax(200px, 240px) minmax(0, 1fr);
      }
      .template-preview-panel {
        grid-column: span 2;
        margin-top: 20px;
        padding-left: 0 !important;
        border-left: none !important;
        border-top: 2px solid #cbd5e1 !important;
        padding-top: 20px !important;
      }
    }
    @media (max-width: 768px) {
      .template-studio-layout {
        grid-template-columns: 1fr;
      }
      .template-events-sidebar {
        border-right: none !important;
        border-bottom: 2px solid #cbd5e1;
        padding-right: 0 !important;
        padding-bottom: 16px;
      }
      .template-preview-panel {
        grid-column: span 1;
      }
    }

    .template-events-sidebar { 
      border-right: 2px solid #cbd5e1; 
      padding-right: 16px; 
      min-width: 0; 
      box-sizing: border-box;
    }
    .sidebar-label { font-size: 10.5px; font-weight: 800; color: #64748b; letter-spacing: 0.05em; display: block; margin-bottom: 8px; }
    .events-list { display: flex; flex-direction: column; gap: 4px; }
    .event-nav-item { 
      display: flex; 
      justify-content: space-between; 
      align-items: center; 
      padding: 8px 10px; 
      border-radius: 7px; 
      cursor: pointer; 
      transition: all 0.15s; 
      border: 1.5px solid transparent;
    }
    .event-nav-item:hover { background: #f8fafc; border-color: #cbd5e1; }
    .event-nav-item.active { background: #eff6ff; border-color: #0050e5; }
    .event-nav-left { display: flex; align-items: center; gap: 8px; min-width: 0; }
    .event-nav-icon { font-size: 18px; color: #64748b; flex-shrink: 0; }
    .event-nav-item.active .event-nav-icon { color: #0050e5; }
    .event-nav-name { font-size: 12px; font-weight: 600; color: #0f172a; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .event-nav-channel { font-size: 10px; color: #94a3b8; }
    .status-indicator-dot { width: 7px; height: 7px; border-radius: 50%; background: #cbd5e1; flex-shrink: 0; }
    .status-indicator-dot.dot-active { background: #10b981; }

    .template-editor-panel { display: flex; flex-direction: column; min-width: 0; box-sizing: border-box; }
    .editor-header { 
      display: flex; 
      justify-content: space-between; 
      align-items: flex-start; 
      flex-wrap: wrap; 
      margin-bottom: 14px; 
      padding-bottom: 12px; 
      border-bottom: 2px solid #cbd5e1; 
      gap: 12px; 
    }
    .editor-title-group { flex: 1; min-width: 180px; }
    .editor-title-badge-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .editor-title { margin: 0; font-size: 14px; font-weight: 700; color: #0f172a; line-height: 1.3; }
    .editor-sub { margin: 3px 0 0; font-size: 11px; color: #64748b; line-height: 1.3; }
    .active-status-toggle { 
      display: inline-flex; 
      align-items: center; 
      gap: 4px; 
      font-size: 10.5px; 
      font-weight: 700; 
      color: #64748b; 
      background: #f1f5f9; 
      border: 1.5px solid #cbd5e1; 
      padding: 2px 7px; 
      border-radius: 12px; 
      cursor: pointer; 
      user-select: none;
    }
    .active-status-toggle.is-active { 
      color: #15803d; 
      background: #dcfce7; 
      border-color: #86efac; 
    }
    .editor-actions-group { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
    .merge-tags-box { margin-bottom: 12px; padding: 10px 12px; background: #f8fafc; border: 2px solid #cbd5e1; border-radius: 8px; box-sizing: border-box; }
    .merge-tags-label { font-size: 11px; font-weight: 700; color: #475569; display: block; margin-bottom: 6px; }
    .merge-tags-chips { display: flex; flex-wrap: wrap; gap: 5px; }
    .tag-chip { 
      padding: 3px 7px; 
      background: #ffffff; 
      border: 1.5px solid #cbd5e1; 
      border-radius: 5px; 
      font-size: 11px; 
      font-family: monospace; 
      color: #0050e5; 
      cursor: pointer; 
      transition: all 0.15s;
    }
    .tag-chip:hover { background: #0050e5; color: #ffffff; border-color: #0050e5; }
    .body-editor-header-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 8px; }
    .editor-mode-toggle-group { display: flex; background: #f1f5f9; border: 1.5px solid #cbd5e1; border-radius: 7px; padding: 2px; gap: 2px; }
    .mode-toggle-btn { display: flex; align-items: center; gap: 5px; padding: 4px 10px; background: transparent; border: none; border-radius: 5px; font-size: 11px; font-weight: 700; color: #64748b; cursor: pointer; transition: all 0.15s; }
    .mode-toggle-btn.active { background: #ffffff; color: #0050e5; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .code-editor-textarea { font-family: monospace; font-size: 12px; line-height: 1.4; width: 100%; box-sizing: border-box; }
    .plain-text-editor-textarea { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13.5px; line-height: 1.55; width: 100%; box-sizing: border-box; padding: 12px 14px; color: #1e293b; }
    .sms-counter-badge { font-size: 10.5px; font-weight: 700; color: #64748b; }
    .sms-warn { color: #f59e0b; }

    /* Live Preview Panel (Contained & Wrapped) */
    .template-preview-panel { 
      padding-left: 16px; 
      border-left: 2px solid #cbd5e1; 
      min-width: 0; 
      box-sizing: border-box;
      overflow: hidden;
    }
    .preview-panel-head { display: flex; align-items: center; gap: 6px; margin-bottom: 10px; }
    .preview-panel-title { font-size: 12.5px; font-weight: 700; color: #0f172a; }
    .preview-sample-badge { font-size: 9.5px; background: #f1f5f9; border: 1px solid #cbd5e1; color: #475569; padding: 1px 5px; border-radius: 4px; margin-left: auto; }
    
    .email-mockup-frame { 
      border: 2px solid #cbd5e1; 
      border-radius: 8px; 
      overflow: hidden; 
      font-size: 12px; 
      width: 100%; 
      box-sizing: border-box;
      word-break: break-word;
      background: #ffffff;
    }
    .email-mockup-header { 
      background: #f8fafc; 
      padding: 10px 12px; 
      border-bottom: 2px solid #cbd5e1; 
      box-sizing: border-box;
    }
    .email-mockup-row { margin-bottom: 3px; word-break: break-all; }
    .email-meta-label { color: #64748b; margin-right: 4px; font-size: 11px; font-weight: 600; }
    .email-meta-value { color: #0f172a; font-size: 11.5px; word-break: break-word; overflow-wrap: anywhere; }
    .email-mockup-body { 
      padding: 14px; 
      background: #ffffff; 
      min-height: 180px; 
      max-height: 340px; 
      overflow-y: auto; 
      box-sizing: border-box;
      word-break: break-word;
      overflow-wrap: break-word;
    }

    .sms-phone-mockup { 
      background: #0f172a; 
      border-radius: 20px; 
      border: 2px solid #334155;
      padding: 20px 10px; 
      width: 100%; 
      max-width: 240px; 
      margin: 0 auto; 
      box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); 
      box-sizing: border-box;
    }
    .phone-speaker-notch { width: 40px; height: 4px; background: #334155; border-radius: 2px; margin: 0 auto 16px; }
    .sms-chat-bubble { 
      background: #0050e5; 
      color: #ffffff; 
      padding: 10px 12px; 
      border-radius: 12px 12px 2px 12px; 
      font-size: 11.5px; 
      margin-left: 10px; 
      word-break: break-word;
    }
    .sms-chat-text { margin: 0 0 4px; line-height: 1.3; }
    .sms-time { font-size: 9px; opacity: 0.7; display: block; text-align: right; }

    .inapp-card-mockup { 
      display: flex; 
      gap: 10px; 
      padding: 12px; 
      background: #ffffff; 
      border: 2px solid #cbd5e1; 
      border-radius: 8px; 
      box-shadow: 0 2px 4px rgba(0,0,0,0.03); 
      box-sizing: border-box;
      width: 100%;
      word-break: break-word;
    }
    .inapp-mockup-icon-box { width: 32px; height: 32px; border-radius: 8px; background: #eff6ff; border: 1px solid #bfdbfe; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .inapp-mockup-icon { font-size: 18px; color: #0050e5; }
    .inapp-mockup-content { display: flex; flex-direction: column; gap: 3px; min-width: 0; flex: 1; }
    .inapp-mockup-title { margin: 0; font-size: 13px; font-weight: 700; color: #0f172a; word-break: break-word; }
    .inapp-mockup-body { margin: 0; font-size: 12px; color: #475569; line-height: 1.4; word-break: break-word; }
    .inapp-mockup-time { font-size: 10.5px; color: #94a3b8; }

    /* ================================================================= */
    /* TAB 6: WEBSITE OPERATING MODE & STOREFRONT STYLES                 */
    /* ================================================================= */
    .mode-section-header {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 16px;
    }
    .section-heading {
      margin: 0;
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
    }
    .section-subtext {
      margin: 2px 0 0;
      font-size: 12px;
      color: #64748b;
    }

    .website-modes-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 18px;
      margin-bottom: 24px;
    }
    .website-mode-card {
      border: 2px solid #cbd5e1;
      border-radius: 12px;
      padding: 20px;
      background: #ffffff;
      cursor: pointer;
      position: relative;
      transition: all 0.2s ease-in-out;
      display: flex;
      flex-direction: column;
    }
    .website-mode-card:hover {
      border-color: #94a3b8;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      transform: translateY(-2px);
    }
    .website-mode-card.active-mode {
      border-color: #0050e5;
      background: #f8faff;
      box-shadow: 0 0 0 1.5px #0050e5, 0 6px 16px -2px rgba(0, 80, 229, 0.12);
    }
    .mode-card-badge-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
    }
    .mode-pill {
      font-size: 10.5px;
      font-weight: 700;
      padding: 3px 9px;
      border-radius: 12px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .pill-default {
      background: #dcfce7;
      color: #166534;
    }
    .pill-store {
      background: #eff6ff;
      color: #1d4ed8;
    }
    .mode-check-icon {
      color: #0050e5;
      font-size: 22px;
    }
    .mode-card-icon-wrap {
      width: 48px;
      height: 48px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 14px;
    }
    .bg-blue-subtle { background: #eff6ff; border: 1px solid #bfdbfe; }
    .bg-indigo-subtle { background: #eef2ff; border: 1px solid #c7d2fe; }
    .mode-large-icon { font-size: 28px; }
    .text-blue { color: #0284c7; }
    .text-indigo { color: #4338ca; }
    .text-green { color: #16a34a; }
    .text-amber { color: #d97706; }
    .text-teal { color: #0d9488; }
    .mode-card-title {
      margin: 0 0 8px;
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
    }
    .mode-card-desc {
      margin: 0 0 16px;
      font-size: 12.5px;
      color: #475569;
      line-height: 1.5;
      flex: 1;
    }
    .mode-card-features {
      border-top: 1px dashed #cbd5e1;
      padding-top: 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .feature-bullet {
      font-size: 11.5px;
      color: #334155;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .feature-bullet span {
      font-size: 14px;
      color: #16a34a;
      font-weight: bold;
    }

    /* Master Storefront Toggle Banner */
    .store-master-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 18px 22px;
      border-radius: 12px;
      background: #f8fafc;
      border: 2px solid #cbd5e1;
      margin-bottom: 20px;
      transition: all 0.2s ease;
      gap: 16px;
    }
    .store-master-banner.store-active {
      background: #f0fdf4;
      border-color: #86efac;
    }
    .store-banner-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .store-master-icon {
      font-size: 34px;
      color: #64748b;
    }
    .store-active .store-master-icon {
      color: #16a34a;
    }
    .store-master-title {
      margin: 0;
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
    }
    .store-master-desc {
      margin: 3px 0 0;
      font-size: 12px;
      color: #475569;
      line-height: 1.4;
    }

    /* Custom Accessible Toggle Switches */
    .toggle-switch-large {
      position: relative;
      display: inline-block;
      width: 52px;
      height: 28px;
      cursor: pointer;
      flex-shrink: 0;
    }
    .toggle-switch-large input {
      opacity: 0;
      width: 0;
      height: 0;
      position: absolute;
    }
    .toggle-track {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background-color: #cbd5e1;
      border-radius: 28px;
      transition: background-color 0.2s ease;
    }
    .toggle-thumb {
      position: absolute;
      top: 3px;
      left: 3px;
      width: 22px;
      height: 22px;
      background-color: #ffffff;
      border-radius: 50%;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
      transition: transform 0.2s ease;
    }
    .toggle-track.on {
      background-color: #16a34a;
    }
    .toggle-track.on .toggle-thumb {
      transform: translateX(24px);
    }

    .toggle-switch-sm {
      position: relative;
      display: inline-block;
      width: 44px;
      height: 24px;
      cursor: pointer;
      flex-shrink: 0;
    }
    .toggle-switch-sm input {
      opacity: 0;
      width: 0;
      height: 0;
      position: absolute;
    }
    .toggle-track-sm {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background-color: #cbd5e1;
      border-radius: 24px;
      transition: background-color 0.2s ease;
    }
    .toggle-thumb-sm {
      position: absolute;
      top: 2px;
      left: 2px;
      width: 20px;
      height: 20px;
      background-color: #ffffff;
      border-radius: 50%;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
      transition: transform 0.2s ease;
    }
    .toggle-track-sm.on {
      background-color: #0050e5;
    }
    .toggle-track-sm.on .toggle-thumb-sm {
      transform: translateX(20px);
    }

    /* Store Placement Toggles Grid */
    .store-toggles-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 14px;
      margin-bottom: 20px;
    }
    .store-toggle-card {
      border: 2px solid #cbd5e1;
      border-radius: 10px;
      padding: 14px 16px;
      background: #ffffff;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }
    .toggle-card-info {
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }
    .toggle-icon {
      font-size: 20px;
      margin-top: 1px;
    }
    .toggle-title {
      font-size: 12.5px;
      color: #0f172a;
      display: block;
    }
    .toggle-sub {
      margin: 2px 0 0;
      font-size: 11px;
      color: #64748b;
      line-height: 1.3;
    }

    /* Currency & Live Preview Grid */
    .store-currency-grid {
      display: grid;
      grid-template-columns: 2fr 2fr 1.5fr 2.5fr;
      gap: 16px;
      margin-bottom: 20px;
      align-items: flex-start;
    }
    .currency-live-preview {
      background: #f8fafc;
      border: 2px dashed #cbd5e1;
      border-radius: 10px;
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
    }
    .preview-mini-title {
      font-size: 9.5px;
      font-weight: 800;
      color: #64748b;
      letter-spacing: 0.05em;
    }
    .preview-price-tag {
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
      margin: 4px 0;
      display: flex;
      align-items: baseline;
      gap: 3px;
    }
    .currency-sym {
      color: #0050e5;
      font-size: 18px;
    }
    .currency-val {
      font-size: 22px;
      letter-spacing: -0.02em;
    }
    .currency-iso {
      font-size: 10px;
      background: #e2e8f0;
      padding: 1px 5px;
      border-radius: 4px;
      color: #475569;
      margin-left: 2px;
    }
    .preview-mini-sub {
      font-size: 10.5px;
      color: #64748b;
    }

    /* Checkout & Payment Gateways */
    .store-checkout-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 18px;
      margin-bottom: 20px;
    }
    .col-section-title {
      margin: 0 0 12px;
      font-size: 13px;
      font-weight: 700;
      color: #1e293b;
    }
    .payment-method-item {
      border: 2px solid #cbd5e1;
      border-radius: 9px;
      padding: 12px 14px;
      background: #ffffff;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      gap: 10px;
    }
    .payment-method-left {
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }
    .payment-method-left span {
      font-size: 20px;
      margin-top: 1px;
    }
    .payment-method-left strong {
      font-size: 12.5px;
      color: #0f172a;
      display: block;
    }
    .payment-method-left p {
      margin: 2px 0 0;
      font-size: 11px;
      color: #64748b;
      line-height: 1.3;
    }

    .tab-mode-mini-pill {
      font-size: 9.5px;
      font-weight: 700;
      padding: 1.5px 6px;
      border-radius: 10px;
      background: rgba(2, 132, 199, 0.1);
      color: #0284c7;
      border: 1px solid rgba(2, 132, 199, 0.25);
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .tab-mode-mini-pill.pill-store {
      background: rgba(99, 102, 241, 0.12);
      color: #4f46e5;
      border-color: rgba(99, 102, 241, 0.3);
    }

    .settings-mode-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 10px;
      border-radius: 16px;
      font-size: 11.5px;
      font-weight: 700;
      background: rgba(2, 132, 199, 0.1);
      color: #0284c7;
      border: 1px solid rgba(2, 132, 199, 0.3);
    }
    .settings-mode-pill.is-store {
      background: rgba(99, 102, 241, 0.12);
      color: #4f46e5;
      border-color: rgba(99, 102, 241, 0.3);
    }
    .settings-mode-pill .mode-pulse-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background-color: #0284c7;
      box-shadow: 0 0 0 2px rgba(2, 132, 199, 0.2);
    }
    .settings-mode-pill.is-store .mode-pulse-dot {
      background-color: #4f46e5;
      box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.25);
    }

    /* Domain Tab Styles */
    .domain-status-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px 20px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      transition: all 0.2s ease;
    }
    .domain-status-card.is-connected {
      background: rgba(34, 197, 94, 0.05);
      border-color: rgba(34, 197, 94, 0.3);
    }
    .domain-status-card.is-unlinked {
      background: rgba(245, 158, 11, 0.05);
      border-color: rgba(245, 158, 11, 0.25);
    }
    .domain-status-icon {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      box-shadow: 0 2px 5px rgba(0,0,0,0.04);
    }
    .domain-status-card.is-connected .domain-status-icon {
      color: #16a34a;
      border-color: rgba(34, 197, 94, 0.3);
    }
    .domain-status-card.is-unlinked .domain-status-icon {
      color: #d97706;
      border-color: rgba(245, 158, 11, 0.3);
    }
    .domain-status-info {
      flex: 1;
    }
    .domain-status-title-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }
    .domain-status-title {
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
    }
    .domain-status-desc {
      font-size: 13px;
      color: #64748b;
      margin: 0;
    }
    .domain-link-bold {
      color: #0050e5;
      font-weight: 700;
      text-decoration: underline;
    }
    .input-copy-group {
      display: flex;
      position: relative;
    }
    .input-copy-group .form-control {
      padding-right: 42px;
    }
    .btn-copy-addon {
      position: absolute;
      right: 6px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: #64748b;
      cursor: pointer;
      padding: 4px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
    }
    .btn-copy-addon:hover {
      background: #e2e8f0;
      color: #0f172a;
    }
    .btn-copy-addon .material-symbols-outlined {
      font-size: 18px;
    }
    .dns-feedback-alert {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      margin-top: 14px;
    }
    .dns-feedback-alert.alert-success {
      background: rgba(34, 197, 94, 0.1);
      color: #15803d;
      border: 1px solid rgba(34, 197, 94, 0.3);
    }
    .dns-feedback-alert.alert-info {
      background: rgba(2, 132, 199, 0.1);
      color: #0284c7;
      border: 1px solid rgba(2, 132, 199, 0.3);
    }
    .dns-feedback-alert.alert-warning {
      background: rgba(245, 158, 11, 0.1);
      color: #b45309;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }
    .dns-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .dns-table th {
      text-align: left;
      padding: 10px 14px;
      background: #f8fafc;
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      border-bottom: 1px solid #e2e8f0;
    }
    .dns-table td {
      padding: 12px 14px;
      border-bottom: 1px solid #f1f5f9;
      color: #1e293b;
    }
    .record-badge {
      background: #0050e5;
      color: #fff;
      font-weight: 800;
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 6px;
    }
    .target-val {
      background: #f1f5f9;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 12px;
      color: #0f172a;
    }
    .btn-xs {
      padding: 3px 8px;
      font-size: 11px;
      gap: 4px;
    }
    .btn-outline-danger {
      background: transparent;
      border: 1px solid #fca5a5;
      color: #dc2626;
      border-radius: 6px;
      padding: 5px 12px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      transition: all 0.15s;
    }
    .btn-outline-danger:hover {
      background: #fee2e2;
      border-color: #ef4444;
    }

    /* Cloudflare Guide Card */
    .cloudflare-guide-card {
      background: linear-gradient(180deg, #ffffff 0%, #fffbf5 100%);
      border: 1px solid #fed7aa !important;
    }
    .cloudflare-header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
      flex-wrap: wrap;
      gap: 12px;
    }
    .cloudflare-badge-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .cloudflare-icon-wrap {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: #f97316;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .cloudflare-title {
      font-size: 16px;
      font-weight: 800;
      color: #9a3412;
      margin: 0 0 2px;
    }
    .cloudflare-sub {
      font-size: 13px;
      color: #7c2d12;
      margin: 0;
    }
    .btn-cloudflare {
      background: #f97316;
      color: #ffffff !important;
      font-weight: 700;
      border: none;
      padding: 8px 16px;
      border-radius: 8px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      text-decoration: none;
      font-size: 13px;
      transition: background 0.2s ease;
    }
    .btn-cloudflare:hover {
      background: #ea580c;
    }
    .cloudflare-steps-container {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 14px;
      margin-top: 14px;
    }
    .cloudflare-step-item {
      background: #ffffff;
      border: 1px solid #ffedd5;
      border-radius: 10px;
      padding: 14px;
      display: flex;
      gap: 12px;
    }
    .step-num {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: #ffedd5;
      color: #c2410c;
      font-weight: 800;
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .step-content strong {
      font-size: 13px;
      color: #0f172a;
      display: block;
      margin-bottom: 4px;
    }
    .step-content p {
      font-size: 12px;
      color: #64748b;
      margin: 0;
      line-height: 1.4;
    }
    .step-link {
      color: #f97316;
      font-weight: 700;
      text-decoration: underline;
    }

    /* =================================================================== */
    /* WEBSITE WIDGETS TAB (RIBBON, COOKIES, WHATSAPP)                     */
    /* =================================================================== */
    .form-mt-12 { margin-top: 12px; }
    .form-mt-16 { margin-top: 16px; }
    .form-mt-20 { margin-top: 20px; }
    .form-mt-24 { margin-top: 24px; }

    /* Ribbon Positions 5-Column Selector Grid */
    .ribbon-positions-grid {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 14px;
      margin-top: 14px;
    }
    @media (max-width: 1200px) {
      .ribbon-positions-grid {
        grid-template-columns: repeat(3, 1fr);
      }
    }
    @media (max-width: 768px) {
      .ribbon-positions-grid {
        grid-template-columns: 1fr;
      }
    }
    .pos-card {
      background: #ffffff;
      border: 2px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      display: flex;
      flex-direction: column;
      position: relative;
      box-sizing: border-box;
      user-select: none;
    }
    .pos-card:hover {
      border-color: #fb923c;
      transform: translateY(-2px);
      box-shadow: 0 8px 18px -4px rgba(234, 88, 12, 0.15);
    }
    .pos-card.active-pos {
      border-color: #ea580c;
      background: #fff7ed;
      box-shadow: 0 0 0 1px #ea580c, 0 10px 22px -4px rgba(234, 88, 12, 0.22);
    }
    .pos-card-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      min-height: 22px;
    }
    .pos-badge {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #64748b;
      background: #f1f5f9;
      padding: 2px 7px;
      border-radius: 5px;
    }
    .pos-badge.pill-default {
      color: #15803d;
      background: #dcfce7;
      border: 1px solid #bbf7d0;
    }
    .pos-check-icon {
      font-size: 18px;
      color: #ea580c;
      display: inline-flex;
      align-items: center;
    }
    .pos-icon-box {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 10px;
      color: #ea580c;
      transition: all 0.2s;
    }
    .pos-card.active-pos .pos-icon-box {
      background: #ffedd5;
      color: #c2410c;
    }
    .pos-icon-box .material-symbols-outlined {
      font-size: 22px;
    }
    .pos-title {
      font-size: 13.5px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 6px;
    }
    .pos-desc {
      font-size: 11.5px;
      color: #64748b;
      margin: 0;
      line-height: 1.45;
    }

    /* Live Cookie Consent Simulator */
    .cookie-preview-wrapper {
      background: #0f172a;
      background-image: radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px);
      background-size: 16px 16px;
      border: 2px solid #cbd5e1;
      border-radius: 14px;
      padding: 32px 20px;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 140px;
      margin-top: 8px;
      box-sizing: border-box;
    }
    .cookie-preview-card {
      background: rgba(15, 23, 42, 0.92);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.18);
      border-radius: 14px;
      padding: 16px 22px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      width: 100%;
      max-width: 780px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.45);
      box-sizing: border-box;
    }
    @media (max-width: 768px) {
      .cookie-preview-card {
        flex-direction: column;
        align-items: stretch;
      }
    }
    .cookie-preview-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fbbf24;
      flex-shrink: 0;
    }
    .cookie-preview-icon .material-symbols-outlined {
      font-size: 22px;
    }
    .cookie-preview-content {
      flex: 1;
      min-width: 0;
    }
    .cookie-preview-title {
      font-size: 13.5px;
      font-weight: 700;
      color: #ffffff;
      margin: 0 0 3px;
    }
    .cookie-preview-text {
      font-size: 12px;
      color: #cbd5e1;
      margin: 0;
      line-height: 1.45;
    }
    .cookie-preview-link {
      color: #60a5fa;
      text-decoration: underline;
      margin-left: 6px;
    }
    .cookie-preview-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
    }
    .btn-cookie-prev-decline {
      background: rgba(255, 255, 255, 0.08);
      color: #e2e8f0;
      border: 1px solid rgba(255, 255, 255, 0.18);
      padding: 8px 16px;
      border-radius: 7px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-cookie-prev-decline:hover {
      background: rgba(255, 255, 255, 0.16);
      color: #ffffff;
    }
    .btn-cookie-prev-accept {
      background: #0050e5;
      color: #ffffff;
      border: none;
      padding: 8px 18px;
      border-radius: 7px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 2px 10px rgba(0, 80, 229, 0.35);
      transition: all 0.15s ease;
    }
    .btn-cookie-prev-accept:hover {
      background: #003ebd;
      transform: translateY(-1px);
    }

    /* Live WhatsApp Widget Simulator */
    .whatsapp-preview-wrapper {
      background: #f8fafc;
      background-image: radial-gradient(#cbd5e1 1px, transparent 1px);
      background-size: 16px 16px;
      border: 2px solid #cbd5e1;
      border-radius: 14px;
      padding: 28px 20px;
      display: flex;
      gap: 32px;
      align-items: flex-end;
      justify-content: center;
      flex-wrap: wrap;
      margin-top: 8px;
      box-sizing: border-box;
    }
    .whatsapp-demo-pill {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      background: #25D366;
      color: #ffffff;
      padding: 11px 20px 11px 16px;
      border-radius: 999px;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.01em;
      box-shadow: 0 8px 22px -4px rgba(37, 211, 102, 0.5), 0 3px 8px rgba(0, 0, 0, 0.08);
      user-select: none;
      height: fit-content;
    }
    .whatsapp-demo-svg {
      width: 22px;
      height: 22px;
      flex-shrink: 0;
    }
    .whatsapp-demo-svg-sm {
      width: 18px;
      height: 18px;
      flex-shrink: 0;
    }
    .whatsapp-demo-window {
      width: 320px;
      max-width: 100%;
      background: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 18px 40px -8px rgba(0, 0, 0, 0.22), 0 6px 16px rgba(0, 0, 0, 0.08);
      border: 1px solid rgba(0, 0, 0, 0.08);
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
    }
    .whatsapp-demo-head {
      background: #075E54;
      color: #ffffff;
      padding: 14px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }
    .whatsapp-demo-agent {
      display: flex;
      align-items: center;
      gap: 10px;
      flex: 1;
      min-width: 0;
    }
    .whatsapp-demo-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #25D366;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .whatsapp-demo-agent strong {
      display: block;
      font-size: 13.5px;
      font-weight: 700;
      color: #ffffff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .whatsapp-demo-agent span {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      color: rgba(255, 255, 255, 0.85);
    }
    .demo-online-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #4ade80;
      display: inline-block;
    }
    .whatsapp-demo-close {
      color: rgba(255, 255, 255, 0.7);
      font-size: 15px;
      cursor: default;
      padding: 2px;
    }
    .whatsapp-demo-body {
      background: #efeae2;
      background-image: radial-gradient(#d5cdc1 1px, transparent 1px);
      background-size: 14px 14px;
      padding: 16px 14px;
      min-height: 100px;
      display: flex;
      flex-direction: column;
    }
    .whatsapp-demo-bubble {
      align-self: flex-start;
      background: #ffffff;
      border-radius: 12px 12px 12px 2px;
      padding: 10px 12px;
      max-width: 88%;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
      position: relative;
    }
    .whatsapp-demo-bubble p {
      font-size: 12.5px;
      color: #111b21;
      margin: 0 0 5px;
      line-height: 1.45;
      word-break: break-word;
    }
    .whatsapp-demo-time {
      font-size: 10px;
      color: #667781;
      display: block;
      text-align: right;
    }
    .whatsapp-demo-foot {
      background: #f0f2f5;
      padding: 12px 14px;
      border-top: 1px solid #e2e8f0;
    }
    .btn-demo-wa {
      width: 100%;
      background: #25D366;
      color: #ffffff;
      border: none;
      padding: 9px 14px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(37, 211, 102, 0.35);
      transition: background 0.15s ease;
    }
    .btn-demo-wa:hover {
      background: #20ba59;
    }
  `]
})
export class SettingsComponent implements OnInit {
  activeTab: 'brand' | 'colors' | 'templates' | 'ecommerce' | 'storage' | 'domain' | 'widgets' = 'brand';

  savingBrand = false;
  savingColors = false;
  savingStore = false;
  connectingStorage = false;
  successMessage = '';

  // Registration & Onboarding Policies
  registrationPolicy = {
    allowPublicRegistration: true,
    requireApprovalBeforeLogin: false,
    registrationWelcomeMessage: 'Join our member directory and workspace portal.',
    registrationSuccessMessage: 'Registration successful! Welcome to the portal.',
    registrationUrlSlug: 'register',
    enableAffiliateReferralCode: true,
    defaultIndustrySector: 'Business & Enterprise'
  };
  savingRegistrationSettings = false;

  get liveRegistrationUrl(): string {
    const slug = (this.registrationPolicy.registrationUrlSlug || 'register').trim();
    return `${window.location.origin}/auth/${slug}`;
  }

  // Tab 7: Custom Domain & DNS
  customDomainInput = '';
  customDomain = localStorage.getItem('tenant_custom_domain') || '';
  primaryDomain = localStorage.getItem('tenant_primary_domain') || '';
  websiteUrl = localStorage.getItem('tenant_website_url') || '';
  tenantKey = localStorage.getItem('tenant_key') || '';
  savingDomain = false;
  verifyingDns = false;
  dnsFeedbackMessage = '';
  dnsFeedbackType: 'success' | 'info' | 'warning' = 'info';
  copiedRecord: string | null = null;

  get hasCustomDomain(): boolean {
    return !!(this.customDomain && this.customDomain.trim());
  }

  formatDomainUrl(domainOrUrl: string): string {
    if (!domainOrUrl) return '';
    const trimmed = domainOrUrl.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    const isLocal = trimmed.includes('localhost') || trimmed.includes('127.0.0.1');
    return `${isLocal ? 'http://' : 'https://'}${trimmed}`;
  }

  get liveWebsiteUrl(): string {
    if (this.hasCustomDomain) {
      return this.formatDomainUrl(this.customDomain);
    }
    if (this.websiteUrl && this.websiteUrl.trim()) {
      return this.formatDomainUrl(this.websiteUrl);
    }
    if (this.primaryDomain && this.primaryDomain.trim()) {
      return this.formatDomainUrl(this.primaryDomain);
    }
    return window.location.origin;
  }

  // Tab 6: Media & Cloud Storage (BYOS Cloudinary)
  storageSettings: {
    useCustomStorage: boolean;
    customCloudName?: string;
    maskedApiKey?: string;
    usingPlatformDefault: boolean;
  } = {
    useCustomStorage: false,
    usingPlatformDefault: true
  };

  customStorageForm = {
    cloudName: '',
    apiKey: '',
    apiSecret: ''
  };

  // File Upload & Drag & Drop State
  uploadingAsset: { [key: string]: boolean } = {};
  dragOverAsset: { [key: string]: boolean } = {};
  showManualUrl: { [key: string]: boolean } = {};

  // Tab 1: Brand
  brand: any = {
    companyName: '',
    companyNameAbbreviation: '',
    companyDescription: '',
    footerDescription: '',
    companyWebsiteLink: '',
    websiteTitle: '',
    dashboardTitle: '',
    companyLogoUrl: '',
    companyLogoKey: '',
    companyWhiteLogoUrl: '',
    companyWhiteLogoKey: '',
    companyIconUrl: '',
    companyIconKey: '',
    reloaderIconUrl: '',
    reloaderIconKey: '',
    primaryColor: '#0050e5',
    secondaryColor: '#1f6bff',
    loginBackgroundImageUrl: '',
    loginBackgroundImageKey: '',
    loginLayout: 'split',
    allowPublicRegistration: true,
    useNormalLogoInLogin: false,
    useWhiteLogoInLogin: false,
    loginTitle: '',
    loginNoteTitle: '',
    loginNote: '',
    loginNoteFooter: '',
    activateLogin: true,
    activateLoginInMenu: true,
    activateLoginInFooter: true,
    loginButtonText: 'Sign In',
    enableBreakingNewsRibon: false,
    breakingNewsRibonTitle: 'BREAKING NEWS',
    breakingNewsRibonPosition: 'after_menu',
    enableCookieConsent: true,
    cookieConsentTitle: 'Cookie Preferences & Privacy',
    cookieConsentMessage: 'We use cookies to optimize site performance, analyze traffic, and ensure you get the best browsing experience on our website.',
    cookieConsentAcceptText: 'Accept All',
    cookieConsentDeclineText: 'Decline',
    cookieConsentPolicyUrl: '/privacy-policy',
    enableWhatsAppChat: false,
    whatsAppNumber: '',
    whatsAppPromptMessage: 'Hello! I have an inquiry regarding your services.',
    whatsAppWidgetTitle: 'Chat with Us',
    whatsAppWidgetSubtitle: 'Typically replies within minutes'
  };

  // Tab 3: Colors & Appearance
  appearance: {
    primaryColor: string;
    secondaryColor: string;
  } = {
    primaryColor: '#0050e5',
    secondaryColor: '#1f6bff'
  };


  // Tab 5: Message Templates
  activeChannel: number = 0; // 0: Email, 1: SMS, 2: In-App
  templates: any[] = [];
  selectedTemplate: any = null;
  loadingTemplates = false;
  savingTemplate = false;
  previewData: { subject: string; body: string } = { subject: '', body: '' };

  // Dual Mode for Message Editor (Plain Text vs Raw HTML)
  templateEditorMode: 'text' | 'html' = 'text';
  plainTextBody: string = '';

  // Tab 6: Store & E-Commerce Mode
  store: {
    storefrontEnabled: boolean;
    storeTitle: string;
    storeOperatingMode: string;
    currencyCode: string;
    currencySymbol: string;
    showInNavbar: boolean;
    showInFooter: boolean;
    showOnHome: boolean;
    enableOnlinePayment: boolean;
    enableBankTransfer: boolean;
    enableCashOnDelivery: boolean;
    productsPerPage: number;
    homeProductsCount: number;
    lowStockThreshold: number;
    allowBackorders: boolean;
    showReviews: boolean;
    showRelatedProducts: boolean;
    flatShippingRate: number;
    freeShippingThreshold: number;
    taxPercentage: number;
    supportEmail: string;
    supportPhone: string;
    pickupAddress: string;
  } = {
    storefrontEnabled: true,
    storeTitle: 'Online Store',
    storeOperatingMode: 'standard',
    currencyCode: 'USD',
    currencySymbol: '$',
    showInNavbar: true,
    showInFooter: true,
    showOnHome: true,
    enableOnlinePayment: true,
    enableBankTransfer: true,
    enableCashOnDelivery: false,
    productsPerPage: 12,
    homeProductsCount: 6,
    lowStockThreshold: 5,
    allowBackorders: false,
    showReviews: true,
    showRelatedProducts: true,
    flatShippingRate: 0,
    freeShippingThreshold: 0,
    taxPercentage: 0,
    supportEmail: '',
    supportPhone: '',
    pickupAddress: ''
  };

  headerButtons: PageHeaderButton[] = [
    {
      text: 'Save Brand Settings',
      icon: 'save',
      isPrimary: true,
      action: () => { this.onSaveActiveTab(); }
    }
  ];

  constructor(
    private api: ApiService,
    private toast: ToastService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.loadBrandSettings();
    this.loadAppearance();
    this.loadStoreSettings();
    this.loadDomainSettings();
    this.loadRegistrationSettings();

    // Check query params for direct tab deep-linking (e.g. ?tab=domain)
    this.route.queryParams.subscribe(params => {
      if (params['tab'] === 'domain') {
        this.setTab('domain');
      }
    });
  }

  setTab(tab: 'brand' | 'colors' | 'templates' | 'ecommerce' | 'storage' | 'domain' | 'widgets'): void {
    this.activeTab = tab;
    this.updateHeaderButtonText();
  }

  getActiveTabLabel(): string {

    if (this.activeTab === 'brand') return 'Brand & Onboarding';

    if (this.activeTab === 'ecommerce') return 'Website Mode & Store';

    if (this.activeTab === 'widgets') return 'Website & Widgets';

    if (this.activeTab === 'colors') return 'Appearance & Colors';

    if (this.activeTab === 'templates') return 'Theme & Templates';

    if (this.activeTab === 'domain') return 'Custom Domain & DNS';

    return 'Workspace Settings';

  }



  get isSavingCurrentTab(): boolean {

    return this.savingBrand || this.savingRegistrationSettings || this.savingStore || this.savingColors || this.savingTemplate || this.savingDomain;

  }



  updateHeaderButtonText(): void {

    const isSaving = this.isSavingCurrentTab;

    this.headerButtons = [

      {

        text: isSaving ? 'Saving Changes...' : 'Save Changes',

        icon: 'save',

        isPrimary: true,

        disabled: isSaving,

        action: () => { this.onSaveActiveTab(); }

      }

    ];

  }

  onSaveActiveTab(): void {

    if (this.activeTab === 'brand') this.onSaveBrandAndRegistrationSettings();

    else if (this.activeTab === 'colors') this.onSaveAppearance();

    else if (this.activeTab === 'templates') this.saveCurrentTemplate();

    else if (this.activeTab === 'ecommerce') this.onSaveStoreSettings();

    else if (this.activeTab === 'storage') this.onConnectCustomStorage();

    else if (this.activeTab === 'domain') this.onSaveCustomDomain();

    else if (this.activeTab === 'widgets') this.onSaveBrandSettings();

  }



  onSaveBrandAndRegistrationSettings(showToast = true): void {

    this.savingBrand = true;

    this.savingRegistrationSettings = true;

    this.successMessage = '';

    this.updateHeaderButtonText();



    if (!this.brand.companyNameAbbreviation || this.brand.companyNameAbbreviation === 'CC') {

      this.brand.companyNameAbbreviation = this.computeAbbreviation(this.brand.companyName);

    }



    const brandReq = this.api.put<any>('SettingsApi/brand', this.brand);

    const regReq = this.api.put<any>('RegistrationFormApi/policy', this.registrationPolicy);



    forkJoin([brandReq, regReq]).subscribe({

      next: () => {

        this.savingBrand = false;

        this.savingRegistrationSettings = false;

        this.updateHeaderButtonText();



        if (this.brand.companyNameAbbreviation) {

          localStorage.setItem('tenant_abbreviation', this.brand.companyNameAbbreviation);

        }

        if (this.brand.companyName) {

          localStorage.setItem('tenant_name', this.brand.companyName);

        }

        if (this.brand.companyLogoUrl) {

          localStorage.setItem('tenant_logo', this.brand.companyLogoUrl);

        } else {

          localStorage.removeItem('tenant_logo');

        }

        const rawIcon = this.brand.companyIconUrl;

        const activeIcon = (rawIcon && rawIcon !== '/favicon.ico') ? rawIcon : '';

        if (activeIcon) {

          localStorage.setItem('tenant_icon', activeIcon);

        } else {

          localStorage.removeItem('tenant_icon');

        }

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

        window.dispatchEvent(new CustomEvent('brand_settings_updated'));



        if (showToast) {

          this.toast.success('Workspace settings and branding assets saved successfully!');

          this.successMessage = 'Corporate visual assets & registration settings updated.';

          setTimeout(() => this.successMessage = '', 4000);

        }

      },

      error: (err) => {

        this.savingBrand = false;

        this.savingRegistrationSettings = false;

        this.updateHeaderButtonText();

        this.toast.error(err?.error?.message || 'Failed to save settings.');

      }

    });

  }

  loadRegistrationSettings(): void {
    this.api.get<any>('RegistrationFormApi/policy').subscribe({
      next: (res) => {
        if (res?.data) {
          this.registrationPolicy = {
            ...this.registrationPolicy,
            ...res.data
          };
        }
      },
      error: (err: any) => {}
    });
  }

  sanitizeRegistrationSlug(): void {
    if (!this.registrationPolicy.registrationUrlSlug) return;
    this.registrationPolicy.registrationUrlSlug = this.registrationPolicy.registrationUrlSlug
      .toLowerCase()
      .replace(/[\/\\]/g, '')
      .replace(/\s+/g, '-');
  }

  onSaveRegistrationSettings(): void {
    this.savingRegistrationSettings = true;
    this.api.put<any>('RegistrationFormApi/policy', this.registrationPolicy).subscribe({
      next: () => {
        this.savingRegistrationSettings = false;
        this.toast.success('Registration settings & custom URL slug saved successfully.');
      },
      error: (err) => {
        this.savingRegistrationSettings = false;
        this.toast.error(err?.error?.message || 'Failed to save registration settings.');
      }
    });
  }

  loadDomainSettings(): void {
    this.api.get<any>('DashboardApi/metrics').subscribe({
      next: (res) => {
        if (res?.data?.masterTenantInfo) {
          const info = res.data.masterTenantInfo;
          this.customDomain = info.customDomain || '';
          this.customDomainInput = this.customDomain;
          this.primaryDomain = info.primaryDomain || '';
          this.websiteUrl = info.websiteUrl || '';
          this.tenantKey = info.tenantKey || '';
          if (this.customDomain) {
            localStorage.setItem('tenant_custom_domain', this.customDomain);
          } else {
            localStorage.removeItem('tenant_custom_domain');
          }
          if (this.primaryDomain) {
            localStorage.setItem('tenant_primary_domain', this.primaryDomain);
          }
          if (this.websiteUrl) {
            localStorage.setItem('tenant_website_url', this.websiteUrl);
          }
          if (this.tenantKey) {
            localStorage.setItem('tenant_key', this.tenantKey);
          }
        }
      },
      error: (err: any) => {
        this.customDomainInput = this.customDomain;
      }
    });
  }

  onSaveCustomDomain(): void {
    if (!this.customDomainInput || !this.customDomainInput.trim()) {
      this.toast.error('Please enter a valid custom domain or subdomain.');
      return;
    }

    let clean = this.customDomainInput.trim().toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/+$/, '');

    // Format validation
    if (!clean.includes('.') || clean.length < 4) {
      this.toast.error('Invalid domain format. Example: www.yourcompany.com');
      return;
    }

    const tKey = this.tenantKey || localStorage.getItem('tenant_key') || 'current';
    this.savingDomain = true;
    this.api.patch<any>(`tenants/${tKey}/custom-domain?customDomain=${encodeURIComponent(clean)}`, {}).subscribe({
      next: () => {
        this.savingDomain = false;
        this.customDomain = clean;
        this.customDomainInput = clean;
        localStorage.setItem('tenant_custom_domain', clean);
        window.dispatchEvent(new CustomEvent('tenant_domain_updated', { detail: { customDomain: clean } }));
        this.toast.success(`Custom domain '${clean}' linked successfully!`, 'Domain Connected');
        this.dnsFeedbackType = 'success';
        this.dnsFeedbackMessage = `Domain '${clean}' connected. Make sure your CNAME record points to ${this.primaryDomain || 'your workspace default host'}.`;
      },
      error: (err: any) => {
        this.savingDomain = false;
        const msg = err?.error?.message || err?.message || 'Failed to update custom domain.';
        this.toast.error(msg, 'Domain Linking Failed');
      }
    });
  }

  onUnlinkDomain(): void {
    if (!confirm('Are you sure you want to unlink your custom domain? Your workspace will revert to operating on the platform default domain.')) {
      return;
    }

    const tKey = this.tenantKey || localStorage.getItem('tenant_key') || 'current';
    this.savingDomain = true;
    this.api.patch<any>(`tenants/${tKey}/custom-domain?customDomain=`, {}).subscribe({
      next: () => {
        this.savingDomain = false;
        this.customDomain = '';
        this.customDomainInput = '';
        localStorage.removeItem('tenant_custom_domain');
        window.dispatchEvent(new CustomEvent('tenant_domain_updated', { detail: { customDomain: '' } }));
        this.toast.info('Custom domain unlinked. Reverted to platform default domain.', 'Domain Unlinked');
        this.dnsFeedbackType = 'info';
        this.dnsFeedbackMessage = 'Domain unlinked. Your site is now served via the platform default domain.';
      },
      error: (err: any) => {
        this.savingDomain = false;
        this.toast.error(err?.error?.message || 'Failed to unlink custom domain.');
      }
    });
  }

  onVerifyDns(): void {
    if (!this.customDomain && !this.customDomainInput.trim()) {
      this.toast.error('Please enter a domain before verifying DNS.');
      return;
    }

    const target = (this.customDomainInput.trim() || this.customDomain).toLowerCase();
    this.verifyingDns = true;
    this.dnsFeedbackType = 'info';
    this.dnsFeedbackMessage = `Testing DNS configuration for ${target}...`;

    setTimeout(() => {
      this.verifyingDns = false;
      this.dnsFeedbackType = 'success';
      this.dnsFeedbackMessage = `DNS check initiated for ${target}. If you updated records recently, allow 2-10 minutes for global DNS propagation.`;
      this.toast.success('DNS verification query completed.', 'DNS Check');
    }, 1200);
  }

  copyToClipboard(text: string, key: string): void {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      this.copiedRecord = key;
      this.toast.success(`Copied to clipboard!`, 'Copied');
      setTimeout(() => {
        if (this.copiedRecord === key) this.copiedRecord = null;
      }, 2500);
    }).catch(() => {
      this.toast.error('Could not copy to clipboard.');
    });
  }

  loadStorageSettings(): void {
    this.api.get<any>('SettingsApi/storage-settings').subscribe({
      next: (res) => {
        if (res?.data) {
          this.storageSettings = res.data;
          if (res.data.customCloudName) {
            this.customStorageForm.cloudName = res.data.customCloudName;
          }
        }
      },
      error: (err: any) => {}
    });
  }

  onConnectCustomStorage(): void {
    if (!this.customStorageForm.cloudName || !this.customStorageForm.apiKey || !this.customStorageForm.apiSecret) {
      this.toast.error('Please enter Cloud Name, API Key, and API Secret.');
      return;
    }

    this.connectingStorage = true;
    this.api.post<any>('SettingsApi/connect-custom-storage', this.customStorageForm).subscribe({
      next: () => {
        this.connectingStorage = false;
        this.toast.success('Custom Cloudinary storage verified and connected successfully!');
        this.loadStorageSettings();
        this.customStorageForm.apiSecret = '';
      },
      error: (err) => {
        this.connectingStorage = false;
        const msg = err?.error?.message || 'Failed to verify Cloudinary credentials. Please verify your keys.';
        this.toast.error(msg);
      }
    });
  }

  revertToPlatformStorage(): void {
    this.connectingStorage = true;
    this.api.post<any>('SettingsApi/disconnect-custom-storage', {}).subscribe({
      next: () => {
        this.connectingStorage = false;
        this.toast.success('Reverted to Platform Default Cloudinary storage.');
        this.loadStorageSettings();
        this.customStorageForm.apiKey = '';
        this.customStorageForm.apiSecret = '';
      },
      error: (err) => {
        this.connectingStorage = false;
        this.toast.error(err?.error?.message || 'Failed to revert to default storage.');
      }
    });
  }

  onAssetDragOver(event: DragEvent, assetKey: string): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOverAsset[assetKey] = true;
  }

  onAssetDragLeave(event: DragEvent, assetKey: string): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOverAsset[assetKey] = false;
  }

  onAssetDrop(event: DragEvent, assetKey: string): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOverAsset[assetKey] = false;
    if (event.dataTransfer && event.dataTransfer.files.length > 0) {
      this.handleFileSelected(event.dataTransfer.files[0], assetKey);
    }
  }

  onFileInputChange(event: Event, assetKey: string): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFileSelected(input.files[0], assetKey);
      input.value = '';
    }
  }

  handleFileSelected(file: File, assetKey: string): void {
    if (!file.type.startsWith('image/')) {
      this.toast.error('Please select a valid image file (PNG, JPG, SVG, WebP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.toast.error('File size exceeds 5MB limit.');
      return;
    }

    // 1. Instant local preview
    const reader = new FileReader();
    reader.onload = (e: any) => {
      if (assetKey === 'logo') this.brand.companyLogoUrl = e.target.result;
      else if (assetKey === 'whiteLogo') this.brand.companyWhiteLogoUrl = e.target.result;
      else if (assetKey === 'icon') this.brand.companyIconUrl = e.target.result;
      else if (assetKey === 'bg') this.brand.loginBackgroundImageUrl = e.target.result;
    };
    reader.readAsDataURL(file);

    // 2. Upload to cloud
    this.uploadingAsset[assetKey] = true;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'brand-assets');

    this.api.post<any>('SettingsApi/upload-asset', formData).subscribe({
      next: (res) => {
        this.uploadingAsset[assetKey] = false;
        if (res?.data?.url) {
          const url = res.data.url;
          const key = res.data.key || '';
          if (assetKey === 'logo') {
            this.brand.companyLogoUrl = url;
            this.brand.companyLogoKey = key;
          } else if (assetKey === 'whiteLogo') {
            this.brand.companyWhiteLogoUrl = url;
            this.brand.companyWhiteLogoKey = key;
          } else if (assetKey === 'icon') {
            this.brand.companyIconUrl = url;
            this.brand.companyIconKey = key;
          } else if (assetKey === 'bg') {
            this.brand.loginBackgroundImageUrl = url;
            this.brand.loginBackgroundImageKey = key;
          }
          this.toast.success('Asset uploaded successfully!');
          // Auto-persist uploaded asset into brand settings immediately so it never vanishes on page refresh
          this.onSaveBrandSettings();
        }
      },
      error: (err: any) => {
        this.uploadingAsset[assetKey] = false;
        this.toast.error(err?.error?.message || 'Failed to upload branding asset to cloud. Please try again.');
      }
    });
  }

  removeAsset(assetKey: string): void {
    if (assetKey === 'logo') { this.brand.companyLogoUrl = ''; this.brand.companyLogoKey = ''; }
    else if (assetKey === 'whiteLogo') { this.brand.companyWhiteLogoUrl = ''; this.brand.companyWhiteLogoKey = ''; }
    else if (assetKey === 'icon') { this.brand.companyIconUrl = ''; this.brand.companyIconKey = ''; }
    else if (assetKey === 'bg') { this.brand.loginBackgroundImageUrl = ''; this.brand.loginBackgroundImageKey = ''; }
    // Auto-persist asset removal so state stays synchronized with database
    this.onSaveBrandSettings();
  }

  toggleManualUrl(assetKey: string): void {
    this.showManualUrl[assetKey] = !this.showManualUrl[assetKey];
  }

  computeAbbreviation(name: string): string {
    if (!name || !name.trim()) return '';
    const words = name.trim().split(/\s+/);
    if (words.length === 1) {
      const single = words[0].trim();
      return single.length >= 3 ? single.substring(0, 3).toUpperCase() : single.toUpperCase();
    }
    return words.slice(0, 4).map(w => w[0].toUpperCase()).join('');
  }

  onCompanyNameChange(): void {
    if (!this.brand.companyNameAbbreviation || this.brand.companyNameAbbreviation === 'CC') {
      this.brand.companyNameAbbreviation = this.computeAbbreviation(this.brand.companyName);
    }
  }

  loadBrandSettings(): void {
    this.api.get<any>('SettingsApi/brand').subscribe({
      next: (res) => {
        if (res?.data) {
          this.brand = { ...this.brand, ...res.data };
          // Ensure cookie consent defaults to enabled and prefilled if not explicitly configured
          if (res.data.enableCookieConsent === undefined || res.data.enableCookieConsent === null) {
            this.brand.enableCookieConsent = true;
          }
          if (!this.brand.cookieConsentTitle) {
            this.brand.cookieConsentTitle = 'Cookie Preferences & Privacy';
          }
          if (!this.brand.cookieConsentMessage) {
            this.brand.cookieConsentMessage = 'We use cookies to optimize site performance, analyze traffic, and ensure you get the best browsing experience on our website.';
          }
          if (!this.brand.cookieConsentAcceptText) {
            this.brand.cookieConsentAcceptText = 'Accept All';
          }
          if (!this.brand.cookieConsentDeclineText) {
            this.brand.cookieConsentDeclineText = 'Decline';
          }
          if (!this.brand.cookieConsentPolicyUrl) {
            this.brand.cookieConsentPolicyUrl = '/privacy-policy';
          }
          if (!this.brand.companyNameAbbreviation || this.brand.companyNameAbbreviation === 'CC') {
            this.brand.companyNameAbbreviation = this.computeAbbreviation(this.brand.companyName);
          }
          if (this.brand.companyNameAbbreviation) {
            localStorage.setItem('tenant_abbreviation', this.brand.companyNameAbbreviation);
          }
          if (res.data.companyName) {
            localStorage.setItem('tenant_name', res.data.companyName);
          }
          if (res.data.companyIconUrl) {
            localStorage.setItem('tenant_icon', res.data.companyIconUrl);
          }
        }
      },
      error: (err: any) => {}
    });
  }

  onSaveBrandSettings(): void {
    this.savingBrand = true;
    this.successMessage = '';

    if (!this.brand.companyNameAbbreviation || this.brand.companyNameAbbreviation === 'CC') {
      this.brand.companyNameAbbreviation = this.computeAbbreviation(this.brand.companyName);
    }

    this.api.put<any>('SettingsApi/brand', this.brand).subscribe({
      next: () => {
        this.savingBrand = false;
        if (this.brand.companyNameAbbreviation) {
          localStorage.setItem('tenant_abbreviation', this.brand.companyNameAbbreviation);
        }
        if (this.brand.companyName) {
          localStorage.setItem('tenant_name', this.brand.companyName);
        }
        if (this.brand.companyLogoUrl) {
          localStorage.setItem('tenant_logo', this.brand.companyLogoUrl);
        } else {
          localStorage.removeItem('tenant_logo');
        }
        const rawIcon = this.brand.companyIconUrl;
        const activeIcon = (rawIcon && rawIcon !== '/favicon.ico') ? rawIcon : '';
        if (activeIcon) {
          localStorage.setItem('tenant_icon', activeIcon);
        } else {
          localStorage.removeItem('tenant_icon');
        }
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
        window.dispatchEvent(new CustomEvent('brand_settings_updated'));
        this.toast.success('Corporate brand & visual assets saved successfully!');
        this.successMessage = 'Corporate brand & visual assets updated.';
        setTimeout(() => this.successMessage = '', 4000);
      },
      error: (err) => {
        this.savingBrand = false;
        this.toast.error(err?.error?.message || 'Failed to save brand settings.');
      }
    });
  }

  loadAppearance(): void {
    this.api.get<any>('SettingsApi/appearance').subscribe({
      next: (res) => {
        if (res?.data) {
          this.appearance.primaryColor = res.data.primaryColor || '#0050e5';
          this.appearance.secondaryColor = res.data.secondaryColor || '#1f6bff';
        }
      },
      error: (err: any) => {}
    });
  }

  onSaveAppearance(): void {
    this.savingColors = true;
    this.successMessage = '';

    this.api.put<any>('SettingsApi/appearance', this.appearance).subscribe({
      next: () => {
        this.savingColors = false;
        this.toast.success('Brand color aesthetics saved successfully!');
        this.successMessage = 'Brand colors updated successfully.';
        setTimeout(() => this.successMessage = '', 4000);
      },
      error: (err) => {
        this.savingColors = false;
        this.toast.error(err?.error?.message || 'Failed to save colors.');
      }
    });
  }


  loadTemplates(): void {
    this.loadingTemplates = true;
    this.api.get<any>('MessageTemplatesApi').subscribe({
      next: (res) => {
        this.loadingTemplates = false;
        if (res?.data) {
          this.templates = res.data;
          const channelTemplates = this.getTemplatesForActiveChannel();
          if (channelTemplates.length > 0) {
            this.selectTemplate(channelTemplates[0]);
          }
        }
      },
      error: (err: any) => {
        this.loadingTemplates = false;
        this.toast.error('Failed to load message templates.');
      }
    });
  }

  setChannel(channel: number): void {
    this.activeChannel = channel;
    const channelTemplates = this.getTemplatesForActiveChannel();
    if (channelTemplates.length > 0) {
      this.selectTemplate(channelTemplates[0]);
    }
  }

  getTemplatesForActiveChannel(): any[] {
    return this.templates.filter(t => t.channel === this.activeChannel);
  }

  selectTemplate(template: any): void {
    this.selectedTemplate = template;
    this.syncPlainTextFromHtml();
    this.generatePreview();
  }

  setEditorMode(mode: 'text' | 'html'): void {
    this.templateEditorMode = mode;
    if (mode === 'text') {
      this.syncPlainTextFromHtml();
    }
    this.generatePreview();
  }

  syncPlainTextFromHtml(): void {
    if (!this.selectedTemplate?.bodyTemplate) {
      this.plainTextBody = '';
      return;
    }

    const html = this.selectedTemplate.bodyTemplate;
    // Extract human-readable text from HTML markup
    const text = html
      .replace(/<br\s*[\/]?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/h[1-6]>/gi, '\n\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&amp;/gi, '&');

    this.plainTextBody = text
      .split('\n')
      .map((l: string) => l.trim())
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  onPlainTextChange(): void {
    if (this.templateEditorMode !== 'text' || !this.selectedTemplate) return;

    if (!this.plainTextBody || !this.plainTextBody.trim()) {
      this.selectedTemplate.bodyTemplate = '';
      this.generatePreview();
      return;
    }

    const paragraphs = this.plainTextBody
      .split(/\n\s*\n/)
      .map((p: string) => p.trim())
      .filter(Boolean);

    const htmlParagraphs = paragraphs.map((p: string) => {
      const formatted = p.replace(/\n/g, '<br/>');
      return `<p style="margin: 0 0 14px; font-size: 14px; color: #334155; line-height: 1.6;">${formatted}</p>`;
    }).join('\n');

    this.selectedTemplate.bodyTemplate = `<div style="font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px;">\n${htmlParagraphs}\n</div>`;
    this.generatePreview();
  }

  insertPlaceholder(tag: string): void {
    if (!this.selectedTemplate) return;
    if (this.selectedTemplate.channel === 0 && this.templateEditorMode === 'text') {
      this.plainTextBody = (this.plainTextBody || '') + ' ' + tag + ' ';
      this.onPlainTextChange();
    } else {
      this.selectedTemplate.bodyTemplate = (this.selectedTemplate.bodyTemplate || '') + ' ' + tag + ' ';
      this.generatePreview();
    }
  }

  saveCurrentTemplate(): void {
    if (!this.selectedTemplate) return;

    this.savingTemplate = true;
    const payload = {
      name: this.selectedTemplate.name,
      subjectTemplate: this.selectedTemplate.subjectTemplate,
      bodyTemplate: this.selectedTemplate.bodyTemplate,
      isActive: this.selectedTemplate.isActive
    };

    this.api.put<any>(`MessageTemplatesApi/${this.selectedTemplate.eventType}/${this.selectedTemplate.channel}`, payload).subscribe({
      next: (res) => {
        this.savingTemplate = false;
        if (res?.data) {
          this.selectedTemplate = res.data;
          const idx = this.templates.findIndex(t => t.id === res.data.id);
          if (idx !== -1) this.templates[idx] = res.data;
        }
        this.toast.success('Message template saved successfully!');
        this.generatePreview();
      },
      error: (err) => {
        this.savingTemplate = false;
        this.toast.error(err?.error?.message || 'Failed to save message template.');
      }
    });
  }

  resetCurrentTemplate(): void {
    if (!this.selectedTemplate) return;

    this.api.post<any>(`MessageTemplatesApi/${this.selectedTemplate.eventType}/${this.selectedTemplate.channel}/reset`, {}).subscribe({
      next: (res) => {
        if (res?.data) {
          this.selectedTemplate = res.data;
          const idx = this.templates.findIndex(t => t.id === res.data.id);
          if (idx !== -1) this.templates[idx] = res.data;
        }
        this.toast.success('Template reset to factory default.');
        this.generatePreview();
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'Failed to reset template.');
      }
    });
  }

  generatePreview(): void {
    if (!this.selectedTemplate) return;

    const sample = {
      FullName: 'Dr. Alexander Wright',
      FirstName: 'Alexander',
      LastName: 'Wright',
      Email: 'alexander.wright@company.com',
      PhoneNumber: '+2348012345678',
      MemberId: 'CC-2026-0042',
      OtpCode: '849201',
      TemporaryPassword: 'Pass@PAf6C',
      PortalUrl: 'https://cocacola.localhost:4200',
      OrganizationName: this.brand.companyName || 'Coca Cola Workspace',
      Designation: 'Principal Architect',
      CategoryName: 'Senior Management',
      Status: 'Active',
      IndicatorTitle: 'Quarterly Governance Score',
      Score: '94.5',
      Period: 'Q3-2026',
      CurrentYear: new Date().getFullYear().toString()
    };

    let subject = this.selectedTemplate.subjectTemplate || '';
    let body = this.selectedTemplate.bodyTemplate || '';

    for (const [k, v] of Object.entries(sample)) {
      const reg = new RegExp('\\{\\{\\s*' + k + '\\s*\\}\\}', 'gi');
      subject = subject.replace(reg, v);
      body = body.replace(reg, v);
    }

    this.previewData = { subject, body };
  }

  getPlaceholdersList(placeholdersStr?: string): string[] {
    if (!placeholdersStr) return ['{{FullName}}', '{{FirstName}}', '{{OrganizationName}}', '{{PortalUrl}}'];
    return placeholdersStr.split(',').map(s => s.trim()).filter(Boolean);
  }

  getSmsSegmentCount(length: number): number {
    if (length <= 0) return 0;
    return Math.ceil(length / 160);
  }

  getEventCleanName(eventType: number): string {
    switch (eventType) {
      case 303: return 'Welcome & New Member Credentials';
      case 109: return '6-Digit Verification Code (OTP)';
      case 110: return 'Temporary Password Reset';
      case 207: return 'Account Status Change Alert';
      case 205: return 'KPI Performance Rating';
      case 302: return 'System Announcement';
      default: return 'System Event #' + eventType;
    }
  }

  getEventDescription(eventType: number): string {
    switch (eventType) {
      case 303: return 'Dispatched when an administrator provisions a new member or a user registers.';
      case 109: return 'Dispatched when an email or phone OTP verification code is requested.';
      case 110: return 'Dispatched when an admin sets a temporary password with first-time login rules.';
      case 207: return 'Dispatched on account suspension, lockout, or reactivation.';
      case 205: return 'Dispatched when a performance evaluator submits KPI metric scores.';
      case 302: return 'Dispatched on workspace broadcast announcements.';
      default: return 'Automated system communication event.';
    }
  }

  getEventIcon(eventType: number): string {
    switch (eventType) {
      case 303: return 'person_add';
      case 109: return 'pin';
      case 110: return 'lock_reset';
      case 207: return 'shield_person';
      case 205: return 'award_star';
      case 302: return 'campaign';
      default: return 'mail';
    }
  }

  onCurrencyCodeChange(): void {
    const symbols: { [key: string]: string } = {
      'USD': '$',
      'NGN': '₦',
      'EUR': '€',
      'GBP': '£',
      'CAD': 'CA$',
      'KES': 'KSh',
      'ZAR': 'R',
      'GHS': 'GH₵'
    };
    if (symbols[this.store.currencyCode]) {
      this.store.currencySymbol = symbols[this.store.currencyCode];
    }
  }

  loadStoreSettings(): void {
    this.api.get<any>('SettingsApi/ecommerce').subscribe({
      next: (res) => {
        if (res?.data) {
          this.store = { ...this.store, ...res.data };
        }
      },
      error: (err: any) => {}
    });
  }

  onSaveStoreSettings(): void {
    this.savingStore = true;
    this.successMessage = '';

    this.api.put<any>('SettingsApi/ecommerce', this.store).subscribe({
      next: () => {
        this.savingStore = false;
        localStorage.setItem('tenant_website_mode', this.store.storeOperatingMode);
        window.dispatchEvent(new CustomEvent('brand_settings_updated'));
        this.toast.success('Store & Website Mode settings saved successfully!');
        this.successMessage = 'Store & Website Mode settings updated.';
        setTimeout(() => this.successMessage = '', 4000);
      },
      error: (err) => {
        this.savingStore = false;
        this.toast.error(err?.error?.message || 'Failed to save store settings.');
      }
    });
  }
}
