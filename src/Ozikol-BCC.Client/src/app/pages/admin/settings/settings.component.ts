import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent, PageHeaderButton } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent],
  template: `
    <div class="settings-page">
      <!-- Standardized Page Header -->
      <app-page-header
        eyebrow="WORKSPACE CONFIGURATION"
        icon="tune"
        title="Workspace Configuration & Branding Studio"
        subtitle="Manage custom brand assets, system-wide terminology aliases, color aesthetics, security policies, and communication templates."
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
          [class.active]="activeTab === 'aliases'"
          (click)="setTab('aliases')"
        >
          <span class="material-symbols-outlined nav-tab-icon">label</span>
          <div class="nav-tab-text">
            <span class="tab-title">Terminology & Aliases</span>
            <span class="tab-sub">Departments, Committees, etc.</span>
          </div>
        </button>


        <button
          type="button"
          class="studio-nav-btn"
          [class.active]="activeTab === 'member-id'"
          (click)="setTab('member-id')"
        >
          <span class="material-symbols-outlined nav-tab-icon">badge</span>
          <div class="nav-tab-text">
            <span class="tab-title">Member ID & Security</span>
            <span class="tab-sub">10 Formats & Auth Rules</span>
          </div>
        </button>

        <button
          type="button"
          class="studio-nav-btn"
          [class.active]="activeTab === 'templates'"
          (click)="setTab('templates')"
        >
          <span class="material-symbols-outlined nav-tab-icon">dynamic_feed</span>
          <div class="nav-tab-text">
            <span class="tab-title">Message Templates</span>
            <span class="tab-sub">Email, SMS & Push Studio</span>
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
          [class.active]="activeTab === 'storage'"
          (click)="setTab('storage')"
        >
          <span class="material-symbols-outlined nav-tab-icon">cloud_sync</span>
          <div class="nav-tab-text">
            <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
              <span class="tab-title">Media &amp; Cloud Storage</span>
              <span class="tab-mode-mini-pill" [class.pill-store]="storageSettings.useCustomStorage" [style.background]="storageSettings.useCustomStorage ? '#dcfce7' : '#eff6ff'" [style.color]="storageSettings.useCustomStorage ? '#15803d' : '#2563eb'">
                {{ storageSettings.useCustomStorage ? 'Custom Cloudinary' : 'Platform Default' }}
              </span>
            </div>
            <span class="tab-sub">BYOS Cloudinary Credentials</span>
          </div>
        </button>
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
            <button type="button" class="btn btn-primary btn-sm" (click)="onSaveBrandSettings()" [disabled]="savingBrand">
              <span class="material-symbols-outlined" *ngIf="!savingBrand">save</span>
              <span>{{ savingBrand ? 'Saving...' : 'Save Brand' }}</span>
            </button>
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

        <!-- Bottom Section: Authentication Screen Customization (Full Width, Below) -->
        <section class="console-widget full-width-widget">
          <div class="widget-head">
            <div class="widget-title-wrap">
              <span class="material-symbols-outlined header-widget-icon text-blue">lock_open</span>
              <div>
                <h2 class="widget-title">Authentication Screen Customization</h2>
                <p class="widget-subtitle">Custom login background image, greeting headline, instructions, and live sign-in frame preview.</p>
              </div>
            </div>
            <button type="button" class="btn btn-primary btn-sm" (click)="onSaveBrandSettings()" [disabled]="savingBrand">
              <span class="material-symbols-outlined" *ngIf="!savingBrand">save</span>
              <span>{{ savingBrand ? 'Saving...' : 'Save Brand' }}</span>
            </button>
          </div>

          <div class="widget-body">
            <!-- Login Background Image Drag & Drop Uploader -->
            <div class="asset-upload-block" style="margin-top:0; margin-bottom: 16px;">
              <label class="form-label">
                <span>Login Background Image</span>
                <button type="button" class="btn-link-toggle" (click)="toggleManualUrl('bg')">
                  {{ showManualUrl['bg'] ? 'Hide Direct URL' : 'Direct URL' }}
                </button>
              </label>

              <div class="asset-upload-container" [class.has-file]="brand.loginBackgroundImageUrl">
                <div *ngIf="brand.loginBackgroundImageUrl" class="asset-preview-card-active">
                  <div class="preview-box-large">
                    <img [src]="brand.loginBackgroundImageUrl" alt="Login Background" />
                  </div>
                  <div class="preview-meta-info">
                    <div class="preview-file-name">Login Background Image</div>
                    <div class="preview-file-url" [title]="brand.loginBackgroundImageUrl">{{ brand.loginBackgroundImageUrl }}</div>
                  </div>
                  <div class="preview-actions-group">
                    <input type="file" #bgFile (change)="onFileInputChange($event, 'bg')" accept="image/*" style="display:none;" />
                    <button type="button" class="btn-icon-action" (click)="bgFile.click()" title="Replace image">
                      <span class="material-symbols-outlined" style="font-size:16px;">upload_file</span> Replace
                    </button>
                    <button type="button" class="btn-icon-action btn-icon-danger" (click)="removeAsset('bg')" title="Remove asset">
                      <span class="material-symbols-outlined" style="font-size:16px;">delete</span>
                    </button>
                  </div>
                </div>

                <div *ngIf="!brand.loginBackgroundImageUrl" 
                     class="dropzone-area" 
                     [class.drag-over]="dragOverAsset['bg']"
                     (dragover)="onAssetDragOver($event, 'bg')"
                     (dragleave)="onAssetDragLeave($event, 'bg')"
                     (drop)="onAssetDrop($event, 'bg')"
                     (click)="bgFileEmpty.click()">
                  <input type="file" #bgFileEmpty (change)="onFileInputChange($event, 'bg')" accept="image/*" style="display:none;" />
                  <div class="dropzone-content" *ngIf="!uploadingAsset['bg']">
                    <span class="material-symbols-outlined dropzone-icon">wallpaper</span>
                    <div class="dropzone-text">Click or drag & drop background image</div>
                    <div class="dropzone-sub">High-resolution banner (1920x1080) for the login screen</div>
                  </div>
                  <div class="dropzone-content" *ngIf="uploadingAsset['bg']">
                    <span class="material-symbols-outlined dropzone-icon rotating-spinner">sync</span>
                    <div class="dropzone-text">Uploading to cloud...</div>
                  </div>
                </div>

                <div *ngIf="showManualUrl['bg']" class="manual-url-wrap">
                  <input type="text" [(ngModel)]="brand.loginBackgroundImageUrl" class="form-control" placeholder="https://images.unsplash.com/..." />
                </div>
              </div>
            </div>

            <!-- Login Copy Fields: 2-Column Grid for Headings, Full-Width for Note -->
            <div class="form-grid-2" style="margin-bottom: 14px;">
              <div class="form-group">
                <label class="form-label">Login Screen Greeting Headline</label>
                <input type="text" [(ngModel)]="brand.loginTitle" class="form-control" placeholder="Welcome back to your workspace" />
              </div>

              <div class="form-group">
                <label class="form-label">Login Notice Subtitle</label>
                <input type="text" [(ngModel)]="brand.loginNoteTitle" class="form-control" placeholder="Authorized Personnel Only" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Login Instructions & Help Note Body</label>
              <textarea [(ngModel)]="brand.loginNote" rows="3" class="form-control" placeholder="Please sign in with your institutional credentials or single sign-on..."></textarea>
            </div>

            <div class="form-group" style="margin-top: 14px;">
              <label class="form-label">Login Screen Footer Note & Compliance Disclaimer</label>
              <textarea [(ngModel)]="brand.loginNoteFooter" rows="2" class="form-control" placeholder="By accessing this portal, you agree to the organizational terms of use and information security standards."></textarea>
              <span class="field-hint">Displayed at the base of the authentication screen below the forms</span>
            </div>

            <!-- Brand Logo Preference for Auth Screen -->
            <div class="form-divider" style="margin: 20px 0 16px;"><span>AUTHENTICATION SCREEN BRAND LOGO PREFERENCE</span></div>
            <div class="form-grid-2" style="margin-bottom: 14px;">
              <div class="toggle-card" [class.active-toggle]="brand.useNormalLogoInLogin" (click)="brand.useNormalLogoInLogin = true; brand.useWhiteLogoInLogin = false;" style="border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 12px; background: #ffffff;">
                <input type="radio" name="loginLogoPref" [checked]="brand.useNormalLogoInLogin" />
                <div>
                  <strong style="font-size: 13px; display: block; color: #0f172a;">Use Standard Logo</strong>
                  <span style="font-size: 11.5px; color: #64748b;">Displays the primary corporate logo on authentication screens</span>
                </div>
              </div>

              <div class="toggle-card" [class.active-toggle]="brand.useWhiteLogoInLogin" (click)="brand.useWhiteLogoInLogin = true; brand.useNormalLogoInLogin = false;" style="border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 12px; background: #ffffff;">
                <input type="radio" name="loginLogoPref" [checked]="brand.useWhiteLogoInLogin" />
                <div>
                  <strong style="font-size: 13px; display: block; color: #0f172a;">Use White Contrast Logo</strong>
                  <span style="font-size: 11.5px; color: #64748b;">Displays the white contrast logo (recommended for dark wallpapers)</span>
                </div>
              </div>
            </div>

          </div>
        </section>
      </div>

      <!-- =================================================================== -->
      <!-- TAB 2: SYSTEM TERMINOLOGY & INSTITUTIONAL ALIASES                    -->
      <!-- =================================================================== -->
      <div *ngIf="activeTab === 'aliases'" class="tab-content-pane">
        <section class="console-widget">
          <div class="widget-head">
            <div class="widget-title-wrap">
              <span class="material-symbols-outlined header-widget-icon text-green">label</span>
              <div>
                <h2 class="widget-title">System-Wide Nomenclature & Terminology Aliases</h2>
                <p class="widget-subtitle">Rename core platform modules (Categories, Groups, Sub-Categories, Alumni) to match your organization's exact institutional structure.</p>
              </div>
            </div>
            <button type="button" class="btn btn-primary btn-sm" (click)="onSaveAliases()" [disabled]="savingAliases">
              <span class="material-symbols-outlined" *ngIf="!savingAliases">save</span>
              <span>{{ savingAliases ? 'Applying...' : 'Save Terminology' }}</span>
            </button>
          </div>

          <div class="widget-body">
            <div class="aliases-grid">
              <!-- Category Alias Card -->
              <div class="alias-config-card">
                <div class="alias-card-head">
                  <span class="material-symbols-outlined alias-card-icon text-blue">folder_open</span>
                  <div>
                    <h3 class="alias-card-title">User Category Title</h3>
                    <span class="alias-card-scope">Default Concept: "User Category"</span>
                  </div>
                </div>
                <p class="alias-card-desc">How member divisions or organisational departments are titled across user management, menus, and filters.</p>
                <div class="form-group">
                  <label class="form-label">Custom Terminology (Singular / Plural)</label>
                  <input type="text" [(ngModel)]="aliases.categoryAlias" class="form-control" placeholder="e.g. Department" />
                </div>
                <div class="alias-presets-bar">
                  <span class="presets-label">Quick Presets:</span>
                  <button type="button" class="preset-chip" (click)="aliases.categoryAlias = 'Department'">Department</button>
                  <button type="button" class="preset-chip" (click)="aliases.categoryAlias = 'Faculty'">Faculty</button>
                  <button type="button" class="preset-chip" (click)="aliases.categoryAlias = 'Staff Cadre'">Staff Cadre</button>
                  <button type="button" class="preset-chip" (click)="aliases.categoryAlias = 'Directorate'">Directorate</button>
                  <button type="button" class="preset-chip" (click)="aliases.categoryAlias = 'Branch'">Branch</button>
                  <button type="button" class="preset-chip" (click)="aliases.categoryAlias = 'Membership Tier'">Tier</button>
                </div>
              </div>

              <!-- Sub-Category Alias Card -->
              <div class="alias-config-card">
                <div class="alias-card-head">
                  <span class="material-symbols-outlined alias-card-icon text-indigo">account_tree</span>
                  <div>
                    <h3 class="alias-card-title">Sub-Category Title</h3>
                    <span class="alias-card-scope">Default Concept: "Sub-Category"</span>
                  </div>
                </div>
                <p class="alias-card-desc">How secondary branches or operational teams under a parent category are titled.</p>
                <div class="form-group">
                  <label class="form-label">Custom Terminology</label>
                  <input type="text" [(ngModel)]="aliases.subCategoryAlias" class="form-control" placeholder="e.g. Unit" />
                </div>
                <div class="alias-presets-bar">
                  <span class="presets-label">Quick Presets:</span>
                  <button type="button" class="preset-chip" (click)="aliases.subCategoryAlias = 'Unit'">Unit</button>
                  <button type="button" class="preset-chip" (click)="aliases.subCategoryAlias = 'Sub-Department'">Sub-Department</button>
                  <button type="button" class="preset-chip" (click)="aliases.subCategoryAlias = 'Team'">Team</button>
                  <button type="button" class="preset-chip" (click)="aliases.subCategoryAlias = 'Division'">Division</button>
                  <button type="button" class="preset-chip" (click)="aliases.subCategoryAlias = 'Section'">Section</button>
                </div>
              </div>

              <!-- Group Alias Card -->
              <div class="alias-config-card">
                <div class="alias-card-head">
                  <span class="material-symbols-outlined alias-card-icon text-amber">groups</span>
                  <div>
                    <h3 class="alias-card-title">Groups & Communities Title</h3>
                    <span class="alias-card-scope">Default Concept: "Group / Community"</span>
                  </div>
                </div>
                <p class="alias-card-desc">How collaborative spaces, channels, and working bodies are named across the sidebar, chat, and hub.</p>
                <div class="form-group">
                  <label class="form-label">Custom Terminology</label>
                  <input type="text" [(ngModel)]="aliases.groupAlias" class="form-control" placeholder="e.g. Committee" />
                </div>
                <div class="alias-presets-bar">
                  <span class="presets-label">Quick Presets:</span>
                  <button type="button" class="preset-chip" (click)="aliases.groupAlias = 'Committees'">Committees</button>
                  <button type="button" class="preset-chip" (click)="aliases.groupAlias = 'Chapters'">Chapters</button>
                  <button type="button" class="preset-chip" (click)="aliases.groupAlias = 'Guilds'">Guilds</button>
                  <button type="button" class="preset-chip" (click)="aliases.groupAlias = 'Working Groups'">Working Groups</button>
                  <button type="button" class="preset-chip" (click)="aliases.groupAlias = 'Clubs'">Clubs</button>
                  <button type="button" class="preset-chip" (click)="aliases.groupAlias = 'Units'">Units</button>
                </div>
              </div>

              <!-- Alumni Alias Card -->
              <div class="alias-config-card">
                <div class="alias-card-head">
                  <span class="material-symbols-outlined alias-card-icon text-teal">school</span>
                  <div>
                    <h3 class="alias-card-title">Alumni Network Title</h3>
                    <span class="alias-card-scope">Default Concept: "Alumni"</span>
                  </div>
                </div>
                <p class="alias-card-desc">How past graduates, honorary fellows, or former members are designated.</p>
                <div class="form-group">
                  <label class="form-label">Custom Terminology</label>
                  <input type="text" [(ngModel)]="aliases.alumniAlias" class="form-control" placeholder="e.g. Past Members" />
                </div>
                <div class="alias-presets-bar">
                  <span class="presets-label">Quick Presets:</span>
                  <button type="button" class="preset-chip" (click)="aliases.alumniAlias = 'Past Members'">Past Members</button>
                  <button type="button" class="preset-chip" (click)="aliases.alumniAlias = 'Alumni Network'">Alumni Network</button>
                  <button type="button" class="preset-chip" (click)="aliases.alumniAlias = 'Fellows'">Fellows</button>
                  <button type="button" class="preset-chip" (click)="aliases.alumniAlias = 'Emeritus Members'">Emeritus</button>
                </div>
              </div>
            </div>

            <!-- Dynamic UI Simulation Box -->
            <div class="live-terminology-simulation">
              <div class="sim-header">
                <span class="material-symbols-outlined text-green">preview</span>
                <span class="sim-title">LIVE NAVIGATION & LABEL PREVIEW SIMULATION</span>
              </div>
              <div class="sim-body">
                <div class="sim-item">
                  <span class="sim-label">Sidebar Menu Item:</span>
                  <strong class="sim-value">Manage {{ aliases.categoryAlias || 'User Categories' }}</strong>
                </div>
                <div class="sim-item">
                  <span class="sim-label">Communities Hub Header:</span>
                  <strong class="sim-value">Active {{ aliases.groupAlias || 'Groups & Communities' }}</strong>
                </div>
                <div class="sim-item">
                  <span class="sim-label">Member Filter Dropdown:</span>
                  <strong class="sim-value">Filter by {{ aliases.categoryAlias || 'Category' }} / {{ aliases.subCategoryAlias || 'Unit' }}</strong>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>



      <!-- =================================================================== -->
      <!-- TAB 4: MEMBER ID CODING RULES & 10 FORMAT SELECTOR                  -->
      <!-- =================================================================== -->
      <div *ngIf="activeTab === 'member-id'" class="tab-content-pane">
        <section class="console-widget member-id-widget">
          <div class="widget-head">
            <div class="widget-title-wrap">
              <span class="material-symbols-outlined header-widget-icon text-blue">badge</span>
              <div>
                <h2 class="widget-title">Member ID Auto-Generation & Security Rules</h2>
                <p class="widget-subtitle">Select from 10 standard institutional coding formats and configure authentication policies.</p>
              </div>
            </div>
            <button type="button" class="btn btn-primary btn-sm" (click)="onSaveMemberIdConfig()" [disabled]="savingIdConfig">
              <span class="material-symbols-outlined" *ngIf="!savingIdConfig">save</span>
              <span>{{ savingIdConfig ? 'Applying...' : 'Save Format Rule' }}</span>
            </button>
          </div>

          <div class="widget-body">
            <!-- Top Row: Dropdown Selector & Dynamic Live Preview -->
            <div class="format-selection-grid">
              <div class="form-group format-dropdown-group">
                <label class="form-label">
                  <span>Select Member ID Format (10 Standard Formats)</span>
                  <span class="badge-pill-soft">Immediate Effect</span>
                </label>
                <select [(ngModel)]="idConfig.activeFormat" (ngModelChange)="onFormatParamChange()" class="form-control format-select">
                  <option *ngFor="let f of idConfig.previews; let i = index" [value]="f.key">
                    Format {{ i + 1 }}: {{ f.name }} (e.g. {{ f.previewExample }})
                  </option>
                </select>
                <span class="field-hint">{{ getActiveFormatDescription() }}</span>
              </div>

              <!-- Dynamic Live Preview Box -->
              <div class="live-preview-box">
                <div class="preview-header">
                  <span class="material-symbols-outlined preview-icon">visibility</span>
                  <span class="preview-label">NEXT GENERATED MEMBER ID PREVIEW</span>
                </div>
                <div class="preview-badge-display">
                  <span class="preview-id-text">{{ getActivePreviewSample() }}</span>
                </div>
                <div class="preview-footer-note">
                  <span class="material-symbols-outlined" style="font-size:14px; color:#10b981;">check_circle</span>
                  <span>{{ isCurrentFormatSequential() ? 'Strict Serial Auto-Incrementing Sequence (1, 2, 3...)' : 'Cryptographic Random Secure Format' }}</span>
                </div>
              </div>
            </div>

            <!-- Configuration Controls: Prefix, Starting Counter, Padding, Delimiter -->
            <div class="format-params-grid">
              <div class="form-group">
                <label class="form-label">Custom Prefix Code</label>
                <input type="text" [(ngModel)]="idConfig.prefix" (ngModelChange)="onFormatParamChange()" class="form-control" placeholder="e.g. CC, BCC, MEM, ORG" />
                <span class="field-hint">Organization code prepended to ID</span>
              </div>

              <div class="form-group">
                <label class="form-label">Next Serial Counter Number</label>
                <input type="number" [(ngModel)]="idConfig.nextNumber" (ngModelChange)="onFormatParamChange()" class="form-control" placeholder="1" min="1" />
                <span class="field-hint">Current sequential auto-increment value</span>
              </div>

              <div class="form-group">
                <label class="form-label">Zero Padding Length</label>
                <select [(ngModel)]="idConfig.padding" (ngModelChange)="onFormatParamChange()" class="form-control">
                  <option [ngValue]="3">3 Digits (e.g. 001)</option>
                  <option [ngValue]="4">4 Digits (e.g. 0001)</option>
                  <option [ngValue]="5">5 Digits (e.g. 00001)</option>
                  <option [ngValue]="6">6 Digits (e.g. 000001)</option>
                </select>
                <span class="field-hint">Leading zeros for serial numbers</span>
              </div>

              <div class="form-group">
                <label class="form-label">Delimiter Separator</label>
                <select [(ngModel)]="idConfig.delimiter" (ngModelChange)="onFormatParamChange()" class="form-control">
                  <option value="-">- Dash (e.g. CC-2026-0001)</option>
                  <option value="/">/ Slash (e.g. CC/2026/0001)</option>
                  <option value=".">. Dot (e.g. CC.2026.0001)</option>
                </select>
                <span class="field-hint">Separator between tokens</span>
              </div>
            </div>

            <!-- Security & Access Policy 1: Email Confirmation -->
            <div class="security-policy-box" style="margin-top: 16px; padding: 14px 18px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; display: flex; align-items: center; justify-content: space-between; gap: 16px;">
              <div style="display: flex; align-items: flex-start; gap: 12px;">
                <span class="material-symbols-outlined" style="font-size: 22px; color: #0050e5; margin-top: 2px;">verified_user</span>
                <div>
                  <strong style="font-size: 13px; color: #0f172a; display: block;">Enforce Email Verification Before Login</strong>
                  <p style="margin: 2px 0 0; font-size: 12px; color: #64748b;">
                    When enabled, members cannot sign into the workspace until their email address is confirmed via the 6-digit OTP code.
                  </p>
                </div>
              </div>
              <label class="toggle-switch" style="position: relative; display: inline-block; width: 44px; height: 24px; flex-shrink: 0;">
                <input type="checkbox" [(ngModel)]="idConfig.requireConfirmedEmailToLogin" style="opacity: 0; width: 0; height: 0;" />
                <span class="toggle-slider" [class.toggle-on]="idConfig.requireConfirmedEmailToLogin" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #cbd5e1; transition: .2s; border-radius: 24px;"></span>
              </label>
            </div>

            <!-- Security & Access Policy 2: Allow User Account Deletion -->
            <div class="security-policy-box" style="margin-top: 12px; padding: 14px 18px; background: #fff5f5; border: 1px solid #fed7d7; border-radius: 10px; display: flex; align-items: center; justify-content: space-between; gap: 16px;">
              <div style="display: flex; align-items: flex-start; gap: 12px;">
                <span class="material-symbols-outlined" style="font-size: 22px; color: #e53e3e; margin-top: 2px;">person_remove</span>
                <div>
                  <strong style="font-size: 13px; color: #9b2c2c; display: block;">Allow Administrator User Account Deletion</strong>
                  <p style="margin: 2px 0 0; font-size: 12px; color: #742a2a;">
                    When enabled, administrators are permitted to permanently delete user accounts from the portal.
                  </p>
                </div>
              </div>
              <label class="toggle-switch" style="position: relative; display: inline-block; width: 44px; height: 24px; flex-shrink: 0;">
                <input type="checkbox" [(ngModel)]="idConfig.enableUserDeletion" style="opacity: 0; width: 0; height: 0;" />
                <span class="toggle-slider" [class.toggle-on]="idConfig.enableUserDeletion" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #cbd5e1; transition: .2s; border-radius: 24px;"></span>
              </label>
            </div>

            <!-- All 10 Formats Overview Grid -->
            <div class="formats-matrix-section">
              <div class="matrix-header">
                <span class="matrix-title">All 10 Available Format Patterns Quick Reference</span>
                <span class="matrix-hint">Click any card below to instantly select that format</span>
              </div>

              <div class="formats-cards-grid">
                <div
                  class="format-card-mini"
                  *ngFor="let f of idConfig.previews; let idx = index"
                  [class.selected]="idConfig.activeFormat === f.key"
                  (click)="selectFormat(f.key)"
                >
                  <div class="card-mini-top">
                    <span class="format-number">Format {{ idx + 1 }}</span>
                    <span class="format-type-tag" [class.type-serial]="f.isSequential" [class.type-random]="!f.isSequential">
                      {{ f.isSequential ? 'Serial (1,2,3..)' : 'Random' }}
                    </span>
                  </div>
                  <h4 class="format-card-title">{{ f.name }}</h4>
                  <div class="format-preview-chip">{{ f.previewExample }}</div>
                  <p class="format-card-desc">{{ f.description }}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <!-- =================================================================== -->
      <!-- TAB 5: MULTI-CHANNEL MESSAGE TEMPLATES (Email, SMS & In-App)        -->
      <!-- =================================================================== -->
      <div *ngIf="activeTab === 'templates'" class="tab-content-pane">
        <section class="console-widget message-templates-widget">
          <div class="widget-head">
            <div class="widget-title-wrap">
              <span class="material-symbols-outlined header-widget-icon text-indigo">dynamic_feed</span>
              <div>
                <h2 class="widget-title">Multi-Channel Communication & Message Templates</h2>
                <p class="widget-subtitle">Customize copy, HTML layouts, and dynamic merge tags for Email, SMS, and In-App Notifications.</p>
              </div>
            </div>

            <!-- Channel Filter Tabs -->
            <div class="channel-tabs-bar">
              <button
                type="button"
                class="channel-tab-btn"
                [class.active]="activeChannel === 0"
                (click)="setChannel(0)"
              >
                <span class="material-symbols-outlined tab-icon">mail</span>
                <span>Email Templates</span>
              </button>
              <button
                type="button"
                class="channel-tab-btn"
                [class.active]="activeChannel === 1"
                (click)="setChannel(1)"
              >
                <span class="material-symbols-outlined tab-icon">sms</span>
                <span>SMS Templates</span>
              </button>
              <button
                type="button"
                class="channel-tab-btn"
                [class.active]="activeChannel === 2"
                (click)="setChannel(2)"
              >
                <span class="material-symbols-outlined tab-icon">notifications_active</span>
                <span>In-App Notifications</span>
              </button>
            </div>
          </div>

          <div class="widget-body">
            <div *ngIf="loadingTemplates" style="text-align:center; padding:32px; color:#64748b;">
              <span class="material-symbols-outlined" style="font-size:32px; animation:spin 1s linear infinite;">sync</span>
              <p style="margin-top:8px; font-size:13px;">Loading templates...</p>
            </div>

            <div class="template-studio-layout" *ngIf="!loadingTemplates && selectedTemplate">
              <!-- Left Panel: Event List -->
              <div class="template-events-sidebar">
                <span class="sidebar-label">Select System Trigger Event</span>
                <div class="events-list">
                  <div
                    class="event-nav-item"
                    *ngFor="let t of getTemplatesForActiveChannel()"
                    [class.active]="selectedTemplate?.id === t.id"
                    (click)="selectTemplate(t)"
                  >
                    <div class="event-nav-left">
                      <span class="material-symbols-outlined event-nav-icon">{{ getEventIcon(t.eventType) }}</span>
                      <div>
                        <strong class="event-nav-name">{{ getEventCleanName(t.eventType) }}</strong>
                        <span class="event-nav-channel">{{ t.channel === 0 ? 'Rich HTML Email' : (t.channel === 1 ? 'SMS Message' : 'In-App Banner') }}</span>
                      </div>
                    </div>
                    <span class="status-indicator-dot" [class.dot-active]="t.isActive"></span>
                  </div>
                </div>
              </div>

              <!-- Middle Panel: Template Editor -->
              <div class="template-editor-panel">
                <div class="editor-header">
                  <div class="editor-title-group">
                    <div class="editor-title-badge-row">
                      <h3 class="editor-title">{{ selectedTemplate.name }}</h3>
                      <label class="active-status-toggle" [class.is-active]="selectedTemplate.isActive">
                        <input type="checkbox" [(ngModel)]="selectedTemplate.isActive" (ngModelChange)="generatePreview()" />
                        <span>{{ selectedTemplate.isActive ? 'Active' : 'Inactive' }}</span>
                      </label>
                    </div>
                    <p class="editor-sub">{{ getEventDescription(selectedTemplate.eventType) }}</p>
                  </div>
                  <div class="editor-actions-group">
                    <button type="button" class="btn btn-outline btn-sm" (click)="resetCurrentTemplate()" title="Reset to default copy">
                      <span class="material-symbols-outlined">restart_alt</span>
                      <span>Reset</span>
                    </button>
                    <button type="button" class="btn btn-primary btn-sm" (click)="saveCurrentTemplate()" [disabled]="savingTemplate">
                      <span class="material-symbols-outlined">save</span>
                      <span>{{ savingTemplate ? 'Saving...' : 'Save' }}</span>
                    </button>
                  </div>
                </div>

                <!-- Subject Line (Email & In-App) -->
                <div class="form-group" *ngIf="selectedTemplate.channel !== 1" style="margin-bottom:12px;">
                  <label class="form-label">
                    <span>{{ selectedTemplate.channel === 0 ? 'Email Subject Line' : 'Notification Title' }}</span>
                    <span class="field-hint">Supports merge tags</span>
                  </label>
                  <input
                    type="text"
                    [(ngModel)]="selectedTemplate.subjectTemplate"
                    (ngModelChange)="generatePreview()"
                    class="form-control"
                    [placeholder]="'e.g. Welcome to {{OrganizationName}}'"
                  />
                </div>

                <!-- Merge Tag Chips Inserter -->
                <div class="merge-tags-box">
                  <span class="merge-tags-label">Available Merge Tags (Click to Insert):</span>
                  <div class="merge-tags-chips">
                    <button
                      type="button"
                      class="tag-chip"
                      *ngFor="let tag of getPlaceholdersList(selectedTemplate.availablePlaceholders)"
                      (click)="insertPlaceholder(tag)"
                    >
                      {{ tag }}
                    </button>
                  </div>
                </div>

                <!-- Body Editor (Dual-Mode: Plain Text Copy vs Raw HTML) -->
                <div class="form-group">
                  <div class="body-editor-header-bar">
                    <label class="form-label" style="margin-bottom:0;">
                      <span>{{ selectedTemplate.channel === 0 ? (templateEditorMode === 'text' ? 'Email Message Copy (Plain Text)' : 'Email HTML Source Code') : (selectedTemplate.channel === 1 ? 'SMS Message Body' : 'In-App Notification Body') }}</span>
                    </label>

                    <!-- Plain Text vs HTML Mode Switcher (Email Only) -->
                    <div *ngIf="selectedTemplate.channel === 0" class="editor-mode-toggle-group">
                      <button
                        type="button"
                        class="mode-toggle-btn"
                        [class.active]="templateEditorMode === 'text'"
                        (click)="setEditorMode('text')"
                        title="Edit readable text copy without HTML tags"
                      >
                        <span class="material-symbols-outlined" style="font-size:15px;">text_fields</span>
                        <span>Plain Text</span>
                      </button>
                      <button
                        type="button"
                        class="mode-toggle-btn"
                        [class.active]="templateEditorMode === 'html'"
                        (click)="setEditorMode('html')"
                        title="Edit raw HTML source code and inline styles"
                      >
                        <span class="material-symbols-outlined" style="font-size:15px;">code</span>
                        <span>HTML Code</span>
                      </button>
                    </div>

                    <!-- SMS Character & Segment Counter -->
                    <span *ngIf="selectedTemplate.channel === 1" class="sms-counter-badge" [class.sms-warn]="selectedTemplate.bodyTemplate.length > 160">
                      {{ selectedTemplate.bodyTemplate.length }} chars ({{ getSmsSegmentCount(selectedTemplate.bodyTemplate.length) }} SMS segment)
                    </span>
                  </div>

                  <!-- 1. Plain Text Editor (For Easy Human Editing) -->
                  <textarea
                    *ngIf="selectedTemplate.channel === 0 && templateEditorMode === 'text'"
                    [(ngModel)]="plainTextBody"
                    (ngModelChange)="onPlainTextChange()"
                    rows="10"
                    class="form-control plain-text-editor-textarea"
                    placeholder="Type your plain email message copy here (paragraphs will format automatically)..."
                  ></textarea>

                  <!-- 2. Raw HTML / SMS / In-App Editor -->
                  <textarea
                    *ngIf="selectedTemplate.channel !== 0 || templateEditorMode === 'html'"
                    [(ngModel)]="selectedTemplate.bodyTemplate"
                    (ngModelChange)="generatePreview()"
                    rows="10"
                    class="form-control code-editor-textarea"
                    placeholder="Write your template copy with dynamic tags here..."
                  ></textarea>
                </div>
              </div>

              <!-- Right Panel: Live Visual Simulator / Previewer -->
              <div class="template-preview-panel">
                <div class="preview-panel-head">
                  <span class="material-symbols-outlined text-blue" style="font-size:18px;">visibility</span>
                  <span class="preview-panel-title">Live Preview Simulator</span>
                  <span class="preview-sample-badge">Sample Data</span>
                </div>

                <!-- EMAIL SIMULATOR -->
                <div *ngIf="selectedTemplate.channel === 0" class="email-mockup-frame">
                  <div class="email-mockup-header">
                    <div class="email-mockup-row">
                      <span class="email-meta-label">Subject:</span>
                      <strong class="email-meta-value">{{ previewData.subject || 'No Subject' }}</strong>
                    </div>
                    <div class="email-mockup-row">
                      <span class="email-meta-label">To:</span>
                      <span class="email-meta-value">Dr. Alexander Wright &lt;alexander.wright&#64;company.com&gt;</span>
                    </div>
                  </div>
                  <div class="email-mockup-body" [innerHTML]="previewData.body"></div>
                </div>

                <!-- SMS SIMULATOR -->
                <div *ngIf="selectedTemplate.channel === 1" class="sms-phone-mockup">
                  <div class="phone-speaker-notch"></div>
                  <div class="sms-chat-bubble">
                    <p class="sms-chat-text">{{ previewData.body || 'No SMS body entered.' }}</p>
                    <span class="sms-time">Now · SMS</span>
                  </div>
                </div>

                <!-- IN-APP NOTIFICATION SIMULATOR -->
                <div *ngIf="selectedTemplate.channel === 2" class="inapp-card-mockup">
                  <div class="inapp-mockup-icon-box">
                    <span class="material-symbols-outlined inapp-mockup-icon">{{ getEventIcon(selectedTemplate.eventType) }}</span>
                  </div>
                  <div class="inapp-mockup-content">
                    <h5 class="inapp-mockup-title">{{ previewData.subject || 'Notification Title' }}</h5>
                    <p class="inapp-mockup-body">{{ previewData.body || 'Notification message content...' }}</p>
                    <span class="inapp-mockup-time">Just now</span>
                  </div>
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
            <button type="button" class="btn btn-primary btn-sm" (click)="onSaveStoreSettings()" [disabled]="savingStore">
              <span class="material-symbols-outlined" *ngIf="!savingStore">save</span>
              <span>{{ savingStore ? 'Saving...' : 'Save Configuration' }}</span>
            </button>
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
      <!-- TAB 6: MEDIA & CLOUD STORAGE (BYOS CLOUDINARY)                     -->
      <!-- =================================================================== -->
      <div *ngIf="activeTab === 'storage'" class="tab-content-pane">
        <section class="console-widget full-width-widget">
          <div class="widget-head">
            <div class="widget-title-wrap">
              <span class="material-symbols-outlined header-widget-icon text-indigo">cloud_sync</span>
              <div>
                <h2 class="widget-title">Media &amp; Cloud Storage Configuration</h2>
                <p class="widget-subtitle">
                  By default, your uploads use our high-speed Platform Cloudinary storage. You can optionally connect your own free Cloudinary account.
                </p>
              </div>
            </div>
            <div style="display:flex; gap:10px; align-items:center;">
              <button
                *ngIf="storageSettings.useCustomStorage"
                type="button"
                class="btn btn-outline-secondary btn-sm"
                (click)="revertToPlatformStorage()"
                [disabled]="connectingStorage"
                title="Switch back to the Platform Default Cloudinary storage"
              >
                <span class="material-symbols-outlined">restart_alt</span>
                <span>Revert to Platform Default</span>
              </button>
              <button
                type="button"
                class="btn btn-primary btn-sm"
                (click)="onConnectCustomStorage()"
                [disabled]="connectingStorage"
              >
                <span class="material-symbols-outlined" *ngIf="!connectingStorage">verified_user</span>
                <span>{{ connectingStorage ? 'Verifying &amp; Saving...' : 'Test &amp; Connect Storage' }}</span>
              </button>
            </div>
          </div>

          <div class="widget-body">
            <!-- Active Status Banner -->
            <div
              style="padding:16px 20px; border-radius:12px; margin-bottom:24px; display:flex; align-items:center; justify-content:space-between; gap:16px;"
              [style.background]="storageSettings.useCustomStorage ? 'rgba(34,197,94,0.08)' : 'rgba(59,130,246,0.08)'"
              [style.border]="storageSettings.useCustomStorage ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(59,130,246,0.3)'"
            >
              <div style="display:flex; align-items:center; gap:14px;">
                <span
                  class="material-symbols-outlined"
                  style="font-size:28px;"
                  [style.color]="storageSettings.useCustomStorage ? '#16a34a' : '#2563eb'"
                >
                  {{ storageSettings.useCustomStorage ? 'check_circle' : 'cloud_done' }}
                </span>
                <div>
                  <div style="font-weight:700; font-size:14px;" [style.color]="storageSettings.useCustomStorage ? '#15803d' : '#1d4ed8'">
                    Current Storage Mode: {{ storageSettings.useCustomStorage ? 'Custom Cloudinary Account (Connected)' : 'Platform Master Cloudinary (Default)' }}
                  </div>
                  <p style="margin:2px 0 0; font-size:12px; color:#64748b;">
                    {{ storageSettings.useCustomStorage
                        ? 'All website images, logos, and media files for your portal are stored directly inside your own Cloudinary bucket (' + storageSettings.customCloudName + ').'
                        : 'Your portal is currently using our high-speed platform Cloudinary storage. You can start uploading right away or connect your own account below.' }}
                  </p>
                </div>
              </div>
              <span
                style="font-size:12px; font-weight:700; padding:6px 12px; border-radius:20px; white-space:nowrap;"
                [style.background]="storageSettings.useCustomStorage ? '#dcfce7' : '#dbeafe'"
                [style.color]="storageSettings.useCustomStorage ? '#166534' : '#1e40af'"
              >
                {{ storageSettings.useCustomStorage ? 'BYOS ACTIVE' : 'DEFAULT ACTIVE' }}
              </span>
            </div>

            <!-- Explanatory Guide Box -->
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:16px; margin-bottom:24px;">
              <h4 style="margin:0 0 8px; font-size:13px; font-weight:700; color:#1e293b; display:flex; align-items:center; gap:6px;">
                <span class="material-symbols-outlined" style="font-size:18px; color:#f59e0b;">info</span>
                <span>Why connect your own free Cloudinary storage?</span>
              </h4>
              <p style="margin:0; font-size:12px; line-height:1.6; color:#475569;">
                Cloudinary offers a generous <strong>free plan with 25 GB of CDN storage and transformations</strong> every month. By connecting your own account, all media assets remain under your full ownership and direct control.
                <a href="https://cloudinary.com/users/register_free" target="_blank" rel="noopener noreferrer" style="color:#2563eb; font-weight:600; text-decoration:underline; margin-left:4px;">
                  Create a Free Cloudinary Account &rarr;
                </a>
              </p>
            </div>

            <!-- Credentials Form -->
            <div class="form-row-2">
              <div class="form-group">
                <label class="form-label">
                  <span>Cloudinary Cloud Name</span>
                  <span class="field-req">*</span>
                </label>
                <input
                  type="text"
                  [(ngModel)]="customStorageForm.cloudName"
                  class="form-control"
                  placeholder="e.g. dxyz123ab"
                />
                <span class="field-hint">Found at the top of your Cloudinary Dashboard.</span>
              </div>

              <div class="form-group">
                <label class="form-label">
                  <span>API Key</span>
                  <span class="field-req">*</span>
                </label>
                <input
                  type="text"
                  [(ngModel)]="customStorageForm.apiKey"
                  class="form-control"
                  placeholder="e.g. 123456789012345"
                />
                <span class="field-hint" *ngIf="storageSettings.maskedApiKey">
                  Current: {{ storageSettings.maskedApiKey }}
                </span>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">
                <span>API Secret</span>
                <span class="field-req">*</span>
              </label>
              <input
                type="password"
                [(ngModel)]="customStorageForm.apiSecret"
                class="form-control"
                placeholder="Enter your Cloudinary API Secret"
              />
              <span class="field-hint">Encrypted securely; never exposed in client responses.</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  `,
  styles: [`
    .settings-page { padding: 0 0 40px; }

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
    .auth-config-grid { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr); gap: 28px; }
    @media (max-width: 992px) {
      .auth-config-grid { grid-template-columns: 1fr; }
    }
    .auth-inputs-column { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
    .auth-preview-column { display: flex; flex-direction: column; gap: 6px; min-width: 0; overflow: hidden; }

    /* Login Mini Mockup */
    .login-preview-mini { 
      padding: 36px 20px; 
      background: #0f172a; 
      border-radius: 12px; 
      border: 2px solid #cbd5e1; 
      min-height: 380px; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      position: relative; 
      overflow: hidden; 
      box-shadow: inset 0 0 40px rgba(0,0,0,0.3); 
      box-sizing: border-box;
      width: 100%;
    }
    .login-mini-card { 
      background: #ffffff; 
      padding: 24px 20px; 
      border-radius: 10px; 
      border: 2px solid #cbd5e1;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.25); 
      text-align: center; 
      width: 100%; 
      max-width: 320px; 
      z-index: 2; 
      box-sizing: border-box;
      overflow: hidden;
      word-break: break-word;
    }
    .login-mini-logo { max-height: 32px; max-width: 160px; margin: 0 auto 12px; object-fit: contain; }
    .login-mini-title { font-size: 14px; font-weight: 700; color: #0f172a; margin: 0; }
    .login-mini-sub { font-size: 11.5px; color: #64748b; margin: 4px 0 14px; }
    .login-mini-mock-inputs { display: flex; flex-direction: column; gap: 8px; }
    .mock-input { background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 5px; padding: 8px 10px; font-size: 11px; color: #94a3b8; text-align: left; }
    .mock-btn { background: #0050e5; color: #ffffff; border-radius: 5px; padding: 8px 10px; font-size: 11.5px; font-weight: 700; cursor: pointer; }
    .login-mini-note { margin-top: 14px; padding: 8px 10px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 10.5px; color: #64748b; line-height: 1.4; text-align: left; word-break: break-word; }

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
  `]
})
export class SettingsComponent implements OnInit {
  activeTab: 'brand' | 'aliases' | 'colors' | 'member-id' | 'templates' | 'ecommerce' | 'storage' = 'brand';

  savingBrand = false;
  savingAliases = false;
  savingColors = false;
  savingIdConfig = false;
  savingStore = false;
  connectingStorage = false;
  successMessage = '';

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
    useNormalLogoInLogin: false,
    useWhiteLogoInLogin: false,
    loginTitle: '',
    loginNoteTitle: '',
    loginNote: '',
    loginNoteFooter: '',
    activateLogin: true,
    activateLoginInMenu: true,
    activateLoginInFooter: true,
    loginButtonText: 'Sign In'
  };

  // Tab 2: Terminology Aliases
  aliases: {
    categoryAlias: string;
    subCategoryAlias: string;
    groupAlias: string;
    alumniAlias: string;
  } = {
    categoryAlias: 'Department',
    subCategoryAlias: 'Unit',
    groupAlias: 'Committees',
    alumniAlias: 'Past Members'
  };

  // Tab 3: Colors & Appearance
  appearance: {
    primaryColor: string;
    secondaryColor: string;
  } = {
    primaryColor: '#0050e5',
    secondaryColor: '#1f6bff'
  };

  // Tab 4: Member ID & Security
  idConfig: {
    activeFormat: string;
    prefix: string;
    nextNumber: number;
    padding: number;
    delimiter: string;
    requireConfirmedEmailToLogin: boolean;
    enableUserDeletion: boolean;
    previews: any[];
  } = {
    activeFormat: 'PrefixYearMonthRandom',
    prefix: 'CC',
    nextNumber: 1,
    padding: 4,
    delimiter: '-',
    requireConfirmedEmailToLogin: false,
    enableUserDeletion: false,
    previews: []
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
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.loadBrandSettings();
    this.loadAliases();
    this.loadAppearance();
    this.loadMemberIdConfig();
    this.loadTemplates();
    this.loadStoreSettings();
    this.loadStorageSettings();
  }

  setTab(tab: 'brand' | 'aliases' | 'colors' | 'member-id' | 'templates' | 'ecommerce' | 'storage'): void {
    this.activeTab = tab;
    this.updateHeaderButtonText();
  }

  updateHeaderButtonText(): void {
    let btnText = 'Save Brand Settings';
    if (this.activeTab === 'aliases') btnText = 'Save Terminology';
    else if (this.activeTab === 'colors') btnText = 'Save Colors';
    else if (this.activeTab === 'member-id') btnText = 'Save Format Rule';
    else if (this.activeTab === 'templates') btnText = 'Save Template';
    else if (this.activeTab === 'ecommerce') btnText = 'Save Store Settings';
    else if (this.activeTab === 'storage') btnText = 'Test & Connect Storage';

    this.headerButtons = [
      {
        text: btnText,
        icon: 'save',
        isPrimary: true,
        action: () => { this.onSaveActiveTab(); }
      }
    ];
  }

  onSaveActiveTab(): void {
    if (this.activeTab === 'brand') this.onSaveBrandSettings();
    else if (this.activeTab === 'aliases') this.onSaveAliases();
    else if (this.activeTab === 'colors') this.onSaveAppearance();
    else if (this.activeTab === 'member-id') this.onSaveMemberIdConfig();
    else if (this.activeTab === 'templates') this.saveCurrentTemplate();
    else if (this.activeTab === 'ecommerce') this.onSaveStoreSettings();
    else if (this.activeTab === 'storage') this.onConnectCustomStorage();
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
      error: () => {}
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
        }
      },
      error: () => {
        this.uploadingAsset[assetKey] = false;
        this.toast.warning('Image loaded locally. Click "Save Brand" to persist.');
      }
    });
  }

  removeAsset(assetKey: string): void {
    if (assetKey === 'logo') { this.brand.companyLogoUrl = ''; this.brand.companyLogoKey = ''; }
    else if (assetKey === 'whiteLogo') { this.brand.companyWhiteLogoUrl = ''; this.brand.companyWhiteLogoKey = ''; }
    else if (assetKey === 'icon') { this.brand.companyIconUrl = ''; this.brand.companyIconKey = ''; }
    else if (assetKey === 'bg') { this.brand.loginBackgroundImageUrl = ''; this.brand.loginBackgroundImageKey = ''; }
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
      error: () => {}
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

  loadAliases(): void {
    this.api.get<any>('SettingsApi/aliases').subscribe({
      next: (res) => {
        if (res?.data) {
          this.aliases = {
            categoryAlias: res.data.categoryAlias || 'Department',
            subCategoryAlias: res.data.subCategoryAlias || 'Unit',
            groupAlias: res.data.groupAlias || 'Committees',
            alumniAlias: res.data.alumniAlias || 'Past Members'
          };
          localStorage.setItem('alias_category', this.aliases.categoryAlias);
          localStorage.setItem('alias_subcategory', this.aliases.subCategoryAlias);
          localStorage.setItem('alias_group', this.aliases.groupAlias);
          localStorage.setItem('alias_alumni', this.aliases.alumniAlias);
        }
      },
      error: () => {}
    });
  }

  onSaveAliases(): void {
    this.savingAliases = true;
    this.successMessage = '';

    this.api.put<any>('SettingsApi/aliases', this.aliases).subscribe({
      next: () => {
        this.savingAliases = false;
        localStorage.setItem('alias_category', this.aliases.categoryAlias);
        localStorage.setItem('alias_subcategory', this.aliases.subCategoryAlias);
        localStorage.setItem('alias_group', this.aliases.groupAlias);
        localStorage.setItem('alias_alumni', this.aliases.alumniAlias);
        window.dispatchEvent(new CustomEvent('brand_settings_updated'));
        this.toast.success('Terminology aliases applied system-wide!');
        this.successMessage = 'System-wide nomenclature aliases updated.';
        setTimeout(() => this.successMessage = '', 4000);
      },
      error: (err) => {
        this.savingAliases = false;
        this.toast.error(err?.error?.message || 'Failed to update terminology aliases.');
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
      error: () => {}
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

  loadMemberIdConfig(): void {
    this.api.get<any>('UsersApi/member-id-config').subscribe({
      next: (res) => {
        if (res?.data) {
          this.idConfig = {
            activeFormat: res.data.activeFormat || 'PrefixYearMonthRandom',
            prefix: res.data.prefix || 'CC',
            nextNumber: res.data.nextNumber || 1,
            padding: res.data.padding || 4,
            delimiter: res.data.delimiter || '-',
            requireConfirmedEmailToLogin: res.data.requireConfirmedEmailToLogin === true,
            enableUserDeletion: res.data.enableUserDeletion === true,
            previews: res.data.previews || []
          };
        }
      },
      error: () => {
        this.toast.error('Failed to load Member ID configuration.');
      }
    });
  }

  onFormatParamChange(): void {
    const params = `prefix=${encodeURIComponent(this.idConfig.prefix || 'CC')}&startNumber=${this.idConfig.nextNumber || 1}&padding=${this.idConfig.padding || 4}&delimiter=${encodeURIComponent(this.idConfig.delimiter || '-')}`;
    this.api.get<any>(`UsersApi/member-id-config/preview?${params}`).subscribe({
      next: (res) => {
        if (res?.data) {
          this.idConfig.previews = res.data;
        }
      },
      error: () => {}
    });
  }

  selectFormat(formatKey: string): void {
    this.idConfig.activeFormat = formatKey;
  }

  getActivePreviewSample(): string {
    const active = this.idConfig.previews.find(p => p.key === this.idConfig.activeFormat);
    return active ? active.previewExample : `${this.idConfig.prefix}${this.idConfig.delimiter}0001`;
  }

  getActiveFormatDescription(): string {
    const active = this.idConfig.previews.find(p => p.key === this.idConfig.activeFormat);
    return active ? active.description : 'Standard organizational member coding format.';
  }

  isCurrentFormatSequential(): boolean {
    const active = this.idConfig.previews.find(p => p.key === this.idConfig.activeFormat);
    return active ? active.isSequential : true;
  }

  onSaveMemberIdConfig(): void {
    this.savingIdConfig = true;
    const payload = {
      activeFormat: this.idConfig.activeFormat,
      prefix: this.idConfig.prefix,
      nextNumber: this.idConfig.nextNumber,
      padding: this.idConfig.padding,
      delimiter: this.idConfig.delimiter,
      requireConfirmedEmailToLogin: this.idConfig.requireConfirmedEmailToLogin,
      enableUserDeletion: this.idConfig.enableUserDeletion
    };

    this.api.put<any>('UsersApi/member-id-config', payload).subscribe({
      next: (res) => {
        this.savingIdConfig = false;
        if (res?.data?.previews) {
          this.idConfig.previews = res.data.previews;
        }
        this.toast.success('Member ID & verification policies applied successfully!');
        this.successMessage = 'Member ID format and verification policies updated.';
        setTimeout(() => this.successMessage = '', 4000);
      },
      error: (err) => {
        this.savingIdConfig = false;
        this.toast.error(err?.error?.message || 'Failed to save configuration.');
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
      error: () => {
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
      CategoryName: this.aliases.categoryAlias || 'Senior Management',
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
      error: () => {}
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
