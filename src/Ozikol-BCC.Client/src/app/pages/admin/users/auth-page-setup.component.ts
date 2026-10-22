import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent, PageHeaderButton } from '../../../shared/components/page-header/page-header.component';

/**
 * Enterprise preset background wallpaper definition.
 */
interface WallpaperPreset {
  id: string;
  name: string;
  category: string;
  url: string;
  thumbnailUrl: string;
}

/**
 * Auth Page Setup & Experience Studio Component.
 * Enables tenant administrators to configure:
 * - Authentication Screen Layout (Split Showcase vs Centered Card)
 * - Background Wallpaper (Curated Presets Gallery, Custom URL, or Direct File Upload)
 * - Hero Write-Ups & Narrative (Title, Subtitle, Chip Badge, Compliance Disclaimer, Submit Button Text)
 * - Public Registration Governance (Toggle show/hide 'Register here' link on login card)
 * - Logo Variant Preferences (Standard vs White Contrast Logo)
 * - Live Interactive Mini-Simulator Preview
 */
@Component({
  selector: 'app-auth-page-setup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent],
  template: `
    <div class="auth-setup-page">
      <!-- Standardized Page Header -->
      <app-page-header
        eyebrow="USER MANAGEMENT &amp; ACCESS SUITE"
        icon="branding_watermark"
        title="Auth Page Setup"
        subtitle="Customize authentication screen layouts (Split Showcase vs Centered Card), background wallpapers, hero narrative copy, and member registration links."
        [buttons]="headerButtons"
        [loading]="isLoading || isSaving"
      ></app-page-header>

      <div class="setup-layout" *ngIf="!isLoading">
        <!-- ============================================== -->
        <!-- LEFT COLUMN: CONFIGURATION CONTROLS            -->
        <!-- ============================================== -->
        <div class="controls-column">
          <!-- SECTION 1: LAYOUT ARCHITECTURE -->
          <div class="setup-card">
            <div class="card-header">
              <div class="header-icon-box">
                <span class="material-symbols-outlined">dashboard_customize</span>
              </div>
              <div class="header-text">
                <h3>Screen Layout Architecture</h3>
                <p>Choose between a dual-pane showcase layout or a focused single centered card.</p>
              </div>
            </div>

            <div class="card-body">
              <div class="layout-options-grid">
                <!-- Option 1: Split Screen Showcase -->
                <div 
                  class="layout-option-card" 
                  [class.selected]="brand.loginLayout !== 'centered'"
                  (click)="brand.loginLayout = 'split'"
                >
                  <div class="option-preview split-preview">
                    <div class="prev-left-pane">
                      <div class="prev-bar w-40"></div>
                      <div class="prev-bar w-70"></div>
                      <div class="prev-bar w-50"></div>
                    </div>
                    <div class="prev-right-pane">
                      <div class="prev-card-box">
                        <div class="prev-avatar"></div>
                        <div class="prev-input"></div>
                        <div class="prev-input"></div>
                        <div class="prev-btn"></div>
                      </div>
                    </div>
                  </div>
                  <div class="option-meta">
                    <div class="meta-title-row">
                      <strong class="option-title">Split Screen Showcase</strong>
                      <span class="material-symbols-outlined check-icon" *ngIf="brand.loginLayout !== 'centered'">check_circle</span>
                    </div>
                    <p class="option-desc">Dual-panel experience featuring brand narrative showcase on the left and bright auth form card on the right.</p>
                  </div>
                </div>

                <!-- Option 2: Centered Card (Don't Split) -->
                <div 
                  class="layout-option-card" 
                  [class.selected]="brand.loginLayout === 'centered'"
                  (click)="brand.loginLayout = 'centered'"
                >
                  <div class="option-preview centered-preview">
                    <div class="prev-centered-box">
                      <div class="prev-avatar"></div>
                      <div class="prev-bar w-60" style="margin: 0 auto 6px;"></div>
                      <div class="prev-input"></div>
                      <div class="prev-input"></div>
                      <div class="prev-btn"></div>
                    </div>
                  </div>
                  <div class="option-meta">
                    <div class="meta-title-row">
                      <strong class="option-title">Centered Card (Don't Split)</strong>
                      <span class="material-symbols-outlined check-icon" *ngIf="brand.loginLayout === 'centered'">check_circle</span>
                    </div>
                    <p class="option-desc">Single glass card centered on full-bleed background wallpaper with ambient backdrop blur.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- SECTION 2: BACKGROUND WALLPAPER GALLERY -->
          <div class="setup-card">
            <div class="card-header">
              <div class="header-icon-box">
                <span class="material-symbols-outlined">wallpaper</span>
              </div>
              <div class="header-text">
                <h3>Background Wallpaper &amp; Visuals</h3>
                <p>Select a curated royalty-free enterprise wallpaper, provide a custom image URL, or upload your own.</p>
              </div>
            </div>

            <div class="card-body">
              <!-- Wallpaper Presets Gallery -->
              <label class="section-sublabel">Curated Enterprise Presets</label>
              <div class="presets-grid">
                <div 
                  *ngFor="let preset of wallpaperPresets"
                  class="preset-item"
                  [class.active]="isCurrentWallpaper(preset.url)"
                  (click)="selectPreset(preset)"
                >
                  <div class="preset-img-wrap" [style.background-image]="'url(' + preset.thumbnailUrl + ')'">
                    <span class="preset-badge">{{ preset.category }}</span>
                    <span class="material-symbols-outlined preset-check" *ngIf="isCurrentWallpaper(preset.url)">check_circle</span>
                  </div>
                  <span class="preset-name">{{ preset.name }}</span>
                </div>
              </div>

              <!-- Custom Wallpaper URL & File Upload -->
              <div class="divider-line"></div>
              <div class="custom-bg-section">
                <div class="form-group">
                  <div class="label-with-action">
                    <label class="form-label">Custom Image URL</label>
                    <button 
                      type="button" 
                      class="btn-text-link" 
                      *ngIf="brand.loginBackgroundImageUrl" 
                      (click)="clearWallpaper()"
                    >
                      Reset to Default Wallpaper
                    </button>
                  </div>
                  <div class="input-wrapper">
                    <span class="material-symbols-outlined input-icon">link</span>
                    <input 
                      type="text" 
                      [(ngModel)]="brand.loginBackgroundImageUrl" 
                      placeholder="https://images.unsplash.com/..." 
                      class="form-control"
                    />
                  </div>
                  <span class="field-hint">High-resolution landscape image (1920x1080 recommended for optimal sharpness).</span>
                </div>

                <!-- Drag & Drop Cloud File Upload -->
                <div class="upload-dropzone" (click)="bgFileInput.click()">
                  <input type="file" #bgFileInput (change)="onFileSelected($event)" accept="image/*" style="display:none;" />
                  <div class="dropzone-inner" *ngIf="!isUploading">
                    <span class="material-symbols-outlined dropzone-icon">cloud_upload</span>
                    <div class="dropzone-text">Click to upload or drag &amp; drop custom image</div>
                    <div class="dropzone-sub">PNG, JPG, WebP up to 5MB</div>
                  </div>
                  <div class="dropzone-inner" *ngIf="isUploading">
                    <span class="material-symbols-outlined dropzone-icon rotating-spinner">sync</span>
                    <div class="dropzone-text">Uploading image to cloud storage...</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- SECTION 3: HERO WRITE-UPS & NARRATIVE -->
          <div class="setup-card">
            <div class="card-header">
              <div class="header-icon-box">
                <span class="material-symbols-outlined">edit_note</span>
              </div>
              <div class="header-text">
                <h3>Brand Hero Write-Ups &amp; Narrative</h3>
                <p>Customize the headlines, security tags, greeting copy, and compliance footer shown to users.</p>
              </div>
            </div>

            <div class="card-body">
              <div class="form-grid-2">
                <div class="form-group">
                  <label class="form-label">Hero Badge / Security Chip</label>
                  <div class="input-wrapper">
                    <span class="material-symbols-outlined input-icon">verified_user</span>
                    <input 
                      type="text" 
                      [(ngModel)]="brand.loginNoteTitle" 
                      placeholder="e.g. Enterprise Security Portal" 
                      class="form-control" 
                    />
                  </div>
                  <span class="field-hint">Small pill badge displayed above the main greeting headline.</span>
                </div>

                <div class="form-group">
                  <label class="form-label">Greeting Headline</label>
                  <div class="input-wrapper">
                    <span class="material-symbols-outlined input-icon">title</span>
                    <input 
                      type="text" 
                      [(ngModel)]="brand.loginTitle" 
                      placeholder="e.g. Welcome to your Workspace" 
                      class="form-control" 
                    />
                  </div>
                  <span class="field-hint">Primary headline on the showcase panel or centered card header.</span>
                </div>
              </div>

              <div class="form-group" style="margin-top: 14px;">
                <label class="form-label">Hero Subtitle &amp; Portal Instructions</label>
                <textarea 
                  [(ngModel)]="brand.loginNote" 
                  rows="3" 
                  class="form-control" 
                  placeholder="e.g. Access your unified enterprise workspace, collaborate with your teams, and manage institutional records securely."
                ></textarea>
                <span class="field-hint">Descriptive narrative text detailing portal access guidelines.</span>
              </div>

              <div class="form-grid-2" style="margin-top: 14px;">
                <div class="form-group">
                  <label class="form-label">Sign In Button Text</label>
                  <div class="input-wrapper">
                    <span class="material-symbols-outlined input-icon">login</span>
                    <input 
                      type="text" 
                      [(ngModel)]="brand.loginButtonText" 
                      placeholder="e.g. Sign In to Dashboard" 
                      class="form-control" 
                    />
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label">Compliance Disclaimer / Footer Note</label>
                  <div class="input-wrapper">
                    <span class="material-symbols-outlined input-icon">shield</span>
                    <input 
                      type="text" 
                      [(ngModel)]="brand.loginNoteFooter" 
                      placeholder="e.g. By signing in, you agree to organizational terms and security policies." 
                      class="form-control" 
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- SECTION 4: REGISTRATION & ACCESS PREFERENCES -->
          <div class="setup-card">
            <div class="card-header">
              <div class="header-icon-box">
                <span class="material-symbols-outlined">how_to_reg</span>
              </div>
              <div class="header-text">
                <h3>Member Registration &amp; Brand Toggles</h3>
                <p>Govern public onboarding access and brand contrast variants on authentication screens.</p>
              </div>
            </div>

            <div class="card-body">
              <!-- Public Registration Toggle -->
              <div class="toggle-card" [class.active-toggle]="brand.allowPublicRegistration" (click)="brand.allowPublicRegistration = !brand.allowPublicRegistration">
                <div class="toggle-info">
                  <strong class="toggle-title">Allow Public Member Self-Registration</strong>
                  <p class="toggle-desc">When enabled, the "Need a new account? Register here" link appears on the login card. When disabled, the link is hidden and portal access is strictly invite-only.</p>
                </div>
                <label class="toggle-switch" (click)="$event.stopPropagation()">
                  <input type="checkbox" [(ngModel)]="brand.allowPublicRegistration" />
                  <span class="toggle-slider"></span>
                </label>
              </div>

              <!-- White Contrast Logo Preference -->
              <div class="toggle-card" [class.active-toggle]="brand.useWhiteLogoInLogin" (click)="brand.useWhiteLogoInLogin = !brand.useWhiteLogoInLogin">
                <div class="toggle-info">
                  <strong class="toggle-title">Use White Contrast Logo in Auth Pages</strong>
                  <p class="toggle-desc">Displays the white contrast version of your company logo on authentication screens (recommended for dark wallpapers).</p>
                </div>
                <label class="toggle-switch" (click)="$event.stopPropagation()">
                  <input type="checkbox" [(ngModel)]="brand.useWhiteLogoInLogin" />
                  <span class="toggle-slider"></span>
                </label>
              </div>

              <!-- Header Menu & Footer Link Integration -->
              <div class="form-grid-2" style="margin-top: 12px;">
                <div class="toggle-card mini-toggle" [class.active-toggle]="brand.activateLoginInMenu" (click)="brand.activateLoginInMenu = !brand.activateLoginInMenu">
                  <div class="toggle-info">
                    <strong class="toggle-title" style="font-size: 13px;">Show Login in Header Navbar</strong>
                  </div>
                  <label class="toggle-switch" (click)="$event.stopPropagation()">
                    <input type="checkbox" [(ngModel)]="brand.activateLoginInMenu" />
                    <span class="toggle-slider"></span>
                  </label>
                </div>

                <div class="toggle-card mini-toggle" [class.active-toggle]="brand.activateLoginInFooter" (click)="brand.activateLoginInFooter = !brand.activateLoginInFooter">
                  <div class="toggle-info">
                    <strong class="toggle-title" style="font-size: 13px;">Show Login in Footer Columns</strong>
                  </div>
                  <label class="toggle-switch" (click)="$event.stopPropagation()">
                    <input type="checkbox" [(ngModel)]="brand.activateLoginInFooter" />
                    <span class="toggle-slider"></span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ============================================== -->
        <!-- RIGHT COLUMN: LIVE INTERACTIVE MINI-SIMULATOR  -->
        <!-- ============================================== -->
        <div class="preview-column">
          <div class="preview-sticky-card">
            <div class="preview-card-header">
              <div class="preview-title-wrap">
                <span class="material-symbols-outlined preview-icon">visibility</span>
                <span class="preview-heading">Live Interactive Preview</span>
              </div>
              <span class="mode-indicator">
                {{ brand.loginLayout === 'centered' ? 'Centered Card' : 'Split Showcase' }}
              </span>
            </div>

            <!-- Mini Simulator Canvas -->
            <div 
              class="simulator-canvas" 
              [style.background-image]="'url(' + activeWallpaperUrl + ')'"
              [class.sim-centered]="brand.loginLayout === 'centered'"
            >
              <div class="sim-backdrop-overlay"></div>

              <!-- Split Mode Preview -->
              <div class="sim-split-wrapper" *ngIf="brand.loginLayout !== 'centered'">
                <div class="sim-left-showcase">
                  <div class="sim-brand-row">
                    <img [src]="displayLogo || 'assets/images/ozikol-white.png'" alt="Brand Logo" class="sim-logo" />
                  </div>
                  <div class="sim-hero-narrative">
                    <div class="sim-chip" *ngIf="brand.loginNoteTitle">
                      <span class="material-symbols-outlined" style="font-size: 10px;">verified_user</span>
                      <span>{{ brand.loginNoteTitle }}</span>
                    </div>
                    <h4 class="sim-hero-title">{{ brand.loginTitle || 'Sign In to Workspace' }}</h4>
                    <p class="sim-hero-desc">{{ brand.loginNote || 'Access your unified enterprise workspace.' }}</p>
                  </div>
                  <div class="sim-footer-meta">
                    <span>Powered by <strong>Ozikol</strong></span>
                  </div>
                </div>

                <div class="sim-right-card-wrap">
                  <div class="sim-login-card">
                    <div class="sim-card-head">
                      <div class="sim-card-avatar">
                        <span class="material-symbols-outlined" style="font-size: 14px; color: #0050e5;">lock</span>
                      </div>
                      <span class="sim-card-title">Sign In</span>
                    </div>
                    <div class="sim-form-line">
                      <span class="sim-input-dummy">name&#64;company.com</span>
                    </div>
                    <div class="sim-form-line">
                      <span class="sim-input-dummy">••••••••••••</span>
                    </div>
                    <button type="button" class="sim-submit-btn">
                      {{ brand.loginButtonText || 'Sign In to Dashboard' }}
                    </button>
                    <div class="sim-card-footer" *ngIf="brand.allowPublicRegistration">
                      <span>Need an account? <strong style="color: #0050e5;">Register</strong></span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Centered Mode Preview -->
              <div class="sim-centered-wrapper" *ngIf="brand.loginLayout === 'centered'">
                <div class="sim-centered-home-pill">
                  <span class="material-symbols-outlined" style="font-size: 11px;">arrow_back</span>
                  <span>Return to Home</span>
                </div>
                <div class="sim-centered-card">
                  <div class="sim-brand-row" style="margin-bottom: 8px;">
                    <img [src]="displayLogo || 'assets/images/ozikol.png'" alt="Brand Logo" class="sim-logo" />
                  </div>
                  <h4 class="sim-card-title" style="margin-bottom: 2px;">{{ brand.loginTitle || 'Sign In' }}</h4>
                  <p class="sim-card-subtitle">{{ brand.loginNote || 'Enter your credentials to enter the workspace.' }}</p>

                  <div class="sim-form-line" style="margin-top: 10px;">
                    <span class="sim-input-dummy">name&#64;company.com</span>
                  </div>
                  <div class="sim-form-line">
                    <span class="sim-input-dummy">••••••••••••</span>
                  </div>
                  <button type="button" class="sim-submit-btn">
                    {{ brand.loginButtonText || 'Sign In to Dashboard' }}
                  </button>
                  <div class="sim-card-footer" *ngIf="brand.allowPublicRegistration">
                    <span>Need an account? <strong style="color: #0050e5;">Register</strong></span>
                  </div>
                </div>
                <div class="sim-centered-footer">
                  <span *ngIf="brand.loginNoteFooter" class="sim-footer-note">{{ brand.loginNoteFooter }}</span>
                  <span>Powered by <strong>Ozikol</strong></span>
                </div>
              </div>
            </div>

            <!-- Quick Action Links -->
            <div class="preview-actions">
              <a routerLink="/auth/login" target="_blank" class="btn btn-outline btn-sm w-100">
                <span class="material-symbols-outlined">open_in_new</span>
                <span>Open Live Sign In Page</span>
              </a>
              <a routerLink="/auth/reset-password" target="_blank" class="btn btn-outline btn-sm w-100">
                <span class="material-symbols-outlined">lock_reset</span>
                <span>Open Live Reset Password Page</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-setup-page {
      padding: 0 0 40px;
    }

    .setup-layout {
      display: grid;
      grid-template-columns: 1fr 400px;
      gap: 24px;
      align-items: flex-start;
      margin-top: 24px;
    }

    .controls-column {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    /* Cards */
    .setup-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
      overflow: hidden;
      transition: box-shadow 0.2s ease;

      &:hover {
        box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
      }
    }

    .card-header {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px 24px;
      border-bottom: 1px solid #f1f5f9;
      background: #ffffff;

      .header-icon-box {
        width: 44px;
        height: 44px;
        border-radius: 12px;
        background: #eff6ff;
        border: 1.5px solid #dbeafe;
        color: #0050e5;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;

        .material-symbols-outlined {
          font-size: 24px;
        }
      }

      .header-text {
        h3 {
          font-size: 16px;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 4px;
        }

        p {
          font-size: 13px;
          color: #64748b;
          margin: 0;
          line-height: 1.4;
        }
      }
    }

    .card-body {
      padding: 24px;
    }

    /* Section 1: Layout Options */
    .layout-options-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .layout-option-card {
      border: 2px solid #e2e8f0;
      border-radius: 14px;
      padding: 16px;
      cursor: pointer;
      background: #f8fafc;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      flex-direction: column;
      gap: 14px;

      &:hover {
        border-color: #93c5fd;
        background: #ffffff;
        transform: translateY(-2px);
      }

      &.selected {
        border-color: #0050e5;
        background: #ffffff;
        box-shadow: 0 8px 24px rgba(0, 80, 229, 0.12);
      }

      .option-preview {
        height: 100px;
        border-radius: 10px;
        background: #0f172a;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.1);
        display: flex;
        box-sizing: border-box;

        &.split-preview {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;

          .prev-left-pane {
            padding: 12px;
            display: flex;
            flex-direction: column;
            gap: 6px;
            border-right: 1px solid rgba(255, 255, 255, 0.1);
          }

          .prev-right-pane {
            background: #f8fafc;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 8px;
          }
        }

        &.centered-preview {
          align-items: center;
          justify-content: center;
          padding: 12px;
        }
      }

      .prev-centered-box {
        background: #ffffff;
        border-radius: 8px;
        padding: 8px 12px;
        width: 140px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .prev-card-box {
        background: #ffffff;
        border-radius: 6px;
        padding: 6px 8px;
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 3px;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
      }

      .prev-avatar {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #0050e5;
        margin: 0 auto 2px;
      }

      .prev-input {
        height: 6px;
        border-radius: 2px;
        background: #e2e8f0;
      }

      .prev-btn {
        height: 8px;
        border-radius: 3px;
        background: #0050e5;
        margin-top: 2px;
      }

      .prev-bar {
        height: 4px;
        border-radius: 2px;
        background: rgba(255, 255, 255, 0.3);

        &.w-40 { width: 40%; }
        &.w-50 { width: 50%; }
        &.w-60 { width: 60%; }
        &.w-70 { width: 70%; }
      }

      .option-meta {
        display: flex;
        flex-direction: column;
        gap: 4px;

        .meta-title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;

          .option-title {
            font-size: 14px;
            font-weight: 700;
            color: #0f172a;
          }

          .check-icon {
            font-size: 20px;
            color: #0050e5;
          }
        }

        .option-desc {
          font-size: 12px;
          color: #64748b;
          margin: 0;
          line-height: 1.4;
        }
      }
    }

    /* Section 2: Wallpaper Presets Gallery */
    .section-sublabel {
      font-size: 12px;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: block;
      margin-bottom: 12px;
    }

    .presets-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 14px;
    }

    .preset-item {
      display: flex;
      flex-direction: column;
      gap: 6px;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        transform: translateY(-2px);

        .preset-img-wrap {
          border-color: #0050e5;
          box-shadow: 0 6px 16px rgba(0, 80, 229, 0.2);
        }
      }

      &.active {
        .preset-img-wrap {
          border-color: #0050e5;
          box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.25);
        }

        .preset-name {
          color: #0050e5;
          font-weight: 700;
        }
      }

      .preset-img-wrap {
        height: 84px;
        border-radius: 10px;
        background-size: cover;
        background-position: center;
        border: 2px solid #e2e8f0;
        position: relative;
        overflow: hidden;
        transition: all 0.2s ease;

        .preset-badge {
          position: absolute;
          top: 6px;
          left: 6px;
          padding: 2px 6px;
          border-radius: 4px;
          background: rgba(15, 23, 42, 0.7);
          backdrop-filter: blur(4px);
          color: #ffffff;
          font-size: 9.5px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .preset-check {
          position: absolute;
          top: 6px;
          right: 6px;
          font-size: 18px;
          color: #ffffff;
          background: #0050e5;
          border-radius: 50%;
        }
      }

      .preset-name {
        font-size: 11.5px;
        color: #334155;
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }

    .upload-dropzone {
      margin-top: 14px;
      border: 2px dashed #cbd5e1;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      cursor: pointer;
      background: #f8fafc;
      transition: all 0.2s ease;

      &:hover {
        border-color: #0050e5;
        background: #eff6ff;
      }

      .dropzone-icon {
        font-size: 32px;
        color: #0050e5;
        margin-bottom: 6px;
      }

      .dropzone-text {
        font-size: 13px;
        font-weight: 700;
        color: #0f172a;
      }

      .dropzone-sub {
        font-size: 11.5px;
        color: #64748b;
        margin-top: 2px;
      }
    }

    /* Form Fields */
    .form-grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-label {
      font-size: 11.5px;
      font-weight: 700;
      color: #334155;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .label-with-action {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .input-icon {
      position: absolute;
      left: 12px;
      color: #94a3b8;
      font-size: 20px;
      pointer-events: none;
    }

    .form-control {
      width: 100%;
      background: #f8fafc;
      border: 1.5px solid #cbd5e1;
      border-radius: 10px;
      padding: 10px 14px 10px 40px;
      color: #0f172a;
      font-size: 13.5px;
      outline: none;
      box-sizing: border-box;
      transition: all 0.2s ease;
      font-family: inherit;

      &:focus {
        background: #ffffff;
        border-color: #0050e5;
        box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.12);
      }
    }

    textarea.form-control {
      padding: 12px 14px;
    }

    .field-hint {
      font-size: 11px;
      color: #64748b;
      line-height: 1.4;
    }

    .divider-line {
      height: 1px;
      background: #e2e8f0;
      margin: 20px 0;
    }

    .btn-text-link {
      background: none;
      border: none;
      color: #0050e5;
      font-size: 11.5px;
      font-weight: 700;
      cursor: pointer;
      padding: 0;

      &:hover {
        text-decoration: underline;
      }
    }

    /* Toggles */
    .toggle-card {
      border: 1.5px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px 16px;
      background: #ffffff;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      transition: all 0.2s ease;
      margin-bottom: 12px;

      &:hover {
        border-color: #93c5fd;
      }

      &.active-toggle {
        border-color: #0050e5;
        background: #eff6ff;
      }

      .toggle-info {
        .toggle-title {
          font-size: 13.5px;
          font-weight: 700;
          color: #0f172a;
          display: block;
        }

        .toggle-desc {
          font-size: 12px;
          color: #64748b;
          margin: 3px 0 0;
          line-height: 1.4;
        }
      }

      &.mini-toggle {
        margin-bottom: 0;
      }
    }

    .toggle-switch {
      position: relative;
      display: inline-block;
      width: 44px;
      height: 24px;
      flex-shrink: 0;

      input {
        opacity: 0;
        width: 0;
        height: 0;

        &:checked + .toggle-slider {
          background-color: #0050e5;

          &:before {
            transform: translateX(20px);
          }
        }
      }

      .toggle-slider {
        position: absolute;
        cursor: pointer;
        inset: 0;
        background-color: #cbd5e1;
        transition: .3s;
        border-radius: 24px;

        &:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: .3s;
          border-radius: 50%;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }
      }
    }

    /* ============================================== */
    /* RIGHT COLUMN: PREVIEW STICKY CARD              */
    /* ============================================== */
    .preview-sticky-card {
      position: sticky;
      top: 24px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(15, 23, 42, 0.06);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .preview-card-header {
      padding: 14px 18px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: space-between;

      .preview-title-wrap {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #0f172a;

        .preview-icon {
          font-size: 18px;
          color: #0050e5;
        }

        .preview-heading {
          font-size: 13.5px;
          font-weight: 700;
        }
      }

      .mode-indicator {
        font-size: 11px;
        font-weight: 700;
        padding: 3px 8px;
        border-radius: 6px;
        background: #eff6ff;
        color: #0050e5;
        border: 1px solid #dbeafe;
      }
    }

    /* Simulator Canvas */
    .simulator-canvas {
      position: relative;
      height: 380px;
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
      display: flex;
      overflow: hidden;

      .sim-backdrop-overlay {
        position: absolute;
        inset: 0;
        background: radial-gradient(circle at 15% 25%, rgba(15, 23, 42, 0.72) 0%, rgba(15, 23, 42, 0.9) 100%);
        backdrop-filter: blur(3px);
      }
    }

    /* Sim Split Layout */
    .sim-split-wrapper {
      position: relative;
      z-index: 2;
      width: 100%;
      height: 100%;
      display: grid;
      grid-template-columns: 1fr 1fr;
    }

    .sim-left-showcase {
      padding: 16px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      border-right: 1px solid rgba(255, 255, 255, 0.1);

      .sim-brand-row {
        .sim-logo {
          max-height: 20px;
          max-width: 100px;
          object-fit: contain;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.4));
        }

        .sim-brand-fallback {
          font-size: 12px;
          font-weight: 700;
          color: #ffffff;
        }
      }

      .sim-hero-narrative {
        display: flex;
        flex-direction: column;
        gap: 6px;

        .sim-chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          align-self: flex-start;
          padding: 2px 6px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.12);
          color: #38bdf8;
          font-size: 9px;
          font-weight: 700;
        }

        .sim-hero-title {
          font-size: 13px;
          font-weight: 800;
          color: #ffffff;
          margin: 0;
          line-height: 1.25;
        }

        .sim-hero-desc {
          font-size: 9.5px;
          color: #cbd5e1;
          margin: 0;
          line-height: 1.35;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      }

      .sim-footer-meta {
        font-size: 9px;
        color: #94a3b8;
      }
    }

    .sim-right-card-wrap {
      background: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 12px;
    }

    .sim-login-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 12px;
      width: 100%;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      display: flex;
      flex-direction: column;
      gap: 6px;

      .sim-card-head {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 2px;

        .sim-card-avatar {
          width: 20px;
          height: 20px;
          border-radius: 6px;
          background: #eff6ff;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .sim-card-title {
          font-size: 11px;
          font-weight: 700;
          color: #0f172a;
        }
      }

      .sim-form-line {
        .sim-input-dummy {
          display: block;
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 4px 8px;
          font-size: 9px;
          color: #94a3b8;
        }
      }

      .sim-submit-btn {
        background: #0050e5;
        color: #ffffff;
        border: none;
        border-radius: 6px;
        padding: 5px;
        font-size: 9.5px;
        font-weight: 700;
        cursor: default;
        margin-top: 2px;
      }

      .sim-card-footer {
        font-size: 8.5px;
        text-align: center;
        color: #64748b;
        margin-top: 2px;
      }
    }

    /* Sim Centered Layout */
    .sim-centered-wrapper {
      position: relative;
      z-index: 2;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 14px;
      box-sizing: border-box;

      .sim-centered-home-pill {
        position: absolute;
        top: 10px;
        left: 10px;
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 3px 8px;
        border-radius: 9999px;
        background: rgba(15, 23, 42, 0.7);
        color: #f1f5f9;
        font-size: 9px;
        font-weight: 600;
      }

      .sim-centered-card {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 14px;
        padding: 14px 16px;
        width: 175px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
        display: flex;
        flex-direction: column;
        gap: 6px;
        text-align: center;

        .sim-card-subtitle {
          font-size: 8.5px;
          color: #64748b;
          margin: 0;
          line-height: 1.25;
        }
      }

      .sim-centered-footer {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
        margin-top: 8px;
        font-size: 8.5px;
        color: #cbd5e1;

        .sim-footer-note {
          font-size: 7.5px;
          color: #94a3b8;
        }
      }
    }

    .preview-actions {
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      background: #ffffff;
      border-top: 1px solid #f1f5f9;

      .btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        font-size: 12px;
        padding: 8px 12px;
      }
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .rotating-spinner {
      animation: spin 1s linear infinite;
    }

    @media (max-width: 1100px) {
      .setup-layout {
        grid-template-columns: 1fr;
      }
      .preview-sticky-card {
        position: static;
      }
    }
  `]
})
export class AuthPageSetupComponent implements OnInit {
  isLoading: boolean = false;
  isSaving: boolean = false;
  isUploading: boolean = false;

  brand: any = {
    companyName: 'Workspace',
    companyLogoUrl: '',
    companyWhiteLogoUrl: '',
    useNormalLogoInLogin: true,
    useWhiteLogoInLogin: false,
    loginBackgroundImageUrl: '',
    loginBackgroundImageKey: '',
    loginLayout: 'centered',
    allowPublicRegistration: true,
    loginTitle: '',
    loginNoteTitle: '',
    loginNote: '',
    loginNoteFooter: '',
    activateLogin: true,
    activateLoginInMenu: true,
    activateLoginInFooter: true,
    loginButtonText: 'Sign In'
  };

  readonly defaultWallpaper: string = 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1920&q=85';

  readonly wallpaperPresets: WallpaperPreset[] = [
    {
      id: 'preset-glass-arch',
      name: 'Modern Glass Architecture',
      category: 'Enterprise',
      url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1920&q=85',
      thumbnailUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=300&q=75'
    },
    {
      id: 'preset-dark-tech',
      name: 'Obsidian Deep Tech',
      category: 'Cyber',
      url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1920&q=85',
      thumbnailUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=300&q=75'
    },
    {
      id: 'preset-blue-mesh',
      name: 'Royal Blue Mesh',
      category: 'BCC Brand',
      url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1920&q=85',
      thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=75'
    },
    {
      id: 'preset-clean-studio',
      name: 'Minimalist Slate Studio',
      category: 'Minimal',
      url: 'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=1920&q=85',
      thumbnailUrl: 'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=300&q=75'
    },
    {
      id: 'preset-cyber-slate',
      name: 'Matrix Data Grid',
      category: 'Security',
      url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1920&q=85',
      thumbnailUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=300&q=75'
    },
    {
      id: 'preset-warm-ambient',
      name: 'Ambient Warm Light',
      category: 'Warm',
      url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1920&q=85',
      thumbnailUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=300&q=75'
    }
  ];

  headerButtons: PageHeaderButton[] = [];

  constructor(
    private api: ApiService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.updateHeaderButtons();
    this.loadBrandSettings();
  }

  private updateHeaderButtons(): void {
    this.headerButtons = [
      {
        text: 'Preview Live Page ↗',
        icon: 'open_in_new',
        isPrimary: false,
        action: () => window.open('/auth/login', '_blank')
      },
      {
        text: 'Save Configuration',
        icon: 'save',
        isPrimary: true,
        action: () => this.saveSettings(),
        loading: this.isSaving
      }
    ];
  }

  loadBrandSettings(): void {
    this.isLoading = true;
    this.api.get<any>('SettingsApi/brand').subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res?.data) {
          this.brand = { ...this.brand, ...res.data };
          // Normalise defaults
          if (!this.brand.loginLayout) {
            this.brand.loginLayout = 'centered';
          }
          if (this.brand.allowPublicRegistration === undefined) {
            this.brand.allowPublicRegistration = true;
          }
          if (!this.brand.loginButtonText) {
            this.brand.loginButtonText = 'Sign In';
          }
        }
      },
      error: () => {
        this.isLoading = false;
        this.toast.error('Failed to load authentication page configuration.');
      }
    });
  }

  saveSettings(): void {
    this.isSaving = true;
    this.updateHeaderButtons();

    // Map logo preference
    if (this.brand.useWhiteLogoInLogin) {
      this.brand.useNormalLogoInLogin = false;
    }

    this.api.put<any>('SettingsApi/brand', this.brand).subscribe({
      next: () => {
        this.isSaving = false;
        this.updateHeaderButtons();
        this.toast.success('Authentication page setup saved successfully!');
      },
      error: (err) => {
        this.isSaving = false;
        this.updateHeaderButtons();
        this.toast.error(err?.error?.message || 'Failed to save settings.');
      }
    });
  }

  selectPreset(preset: WallpaperPreset): void {
    this.brand.loginBackgroundImageUrl = preset.url;
    this.brand.loginBackgroundImageKey = preset.id;
    this.toast.info(`Selected ${preset.name} wallpaper preset.`);
  }

  isCurrentWallpaper(url: string): boolean {
    return this.brand.loginBackgroundImageUrl === url;
  }

  clearWallpaper(): void {
    this.brand.loginBackgroundImageUrl = '';
    this.brand.loginBackgroundImageKey = '';
    this.toast.info('Reverted to platform default wallpaper.');
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      if (!file.type.startsWith('image/')) {
        this.toast.error('Please select a valid image file (PNG, JPG, WebP).');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        this.toast.error('File size exceeds 5MB limit.');
        return;
      }

      // Local preview immediately
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.brand.loginBackgroundImageUrl = e.target.result;
      };
      reader.readAsDataURL(file);

      // Cloud upload
      this.isUploading = true;
      const formData = new FormData();
      formData.append('file', file);
      this.api.post<any>('SettingsApi/upload-asset?assetType=bg', formData).subscribe({
        next: (res) => {
          this.isUploading = false;
          const url = res?.data?.url || res?.url;
          const key = res?.data?.key || res?.key;
          if (url) {
            this.brand.loginBackgroundImageUrl = url;
            this.brand.loginBackgroundImageKey = key;
          }
          this.toast.success('Custom wallpaper uploaded to cloud storage!');
        },
        error: () => {
          this.isUploading = false;
          this.toast.warning('Image loaded locally. Click "Save Configuration" to persist.');
        }
      });
      input.value = '';
    }
  }

  get activeWallpaperUrl(): string {
    return this.brand.loginBackgroundImageUrl?.trim() || this.defaultWallpaper;
  }

  get displayLogo(): string {
    if (this.brand.useWhiteLogoInLogin && this.brand.companyWhiteLogoUrl) {
      return this.brand.companyWhiteLogoUrl;
    }
    return this.brand.companyLogoUrl || this.brand.companyWhiteLogoUrl || '';
  }
}
