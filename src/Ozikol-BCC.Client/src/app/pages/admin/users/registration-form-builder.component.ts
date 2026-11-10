import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { LandingComponent } from '../../landing/landing.component';
import { AuthLayoutComponent } from '../../../layouts/auth-layout/auth-layout.component';

interface RegistrationField {
  id: string;
  fieldKey: string;
  label: string;
  placeholder?: string;
  fieldType: string;
  options: string[];
  isRequired: boolean;
  sortOrder: number;
  isActive: boolean;
  bcpUserCategoryId?: string | null;
  categoryName?: string | null;
  helpText?: string;
  showInWorkspaceProfile: boolean;
  // Validation rules & layout grouping
  sectionName?: string;
  minLength?: number | null;
  maxLength?: number | null;
  patternRegex?: string;
  customErrorMessage?: string;
}

interface UserCategory {
  id: string;
  name: string;
  colorCode?: string;
  icon?: string;
}

interface RegistrationPolicy {
  allowPublicRegistration: boolean;
  requireApprovalBeforeLogin: boolean;
  registrationWelcomeMessage: string;
  registrationFormTitle?: string;
  registrationSuccessMessage: string;
  registrationUrlSlug?: string;
  enableAffiliateReferralCode?: boolean;
  defaultIndustrySector?: string;
  // Presentation & Flow Architecture (Card 3)
  pageShellLayout?: 'website' | 'auth';
  formLayoutMode: 'single' | 'sections' | 'stepper' | 'pages';
  requirePassword: boolean;
  allowSaveAndContinue: boolean;
  unpublishedCoreFields: string[];
  customSections: string[];
}

interface IndustryTemplate {
  key: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  bgColor: string;
  fieldCount: number;
  sampleQuestions: { label: string; type: string; required: boolean; options?: string[]; placeholder?: string }[];
  layoutMode: 'single' | 'sections' | 'stepper' | 'pages';
  layoutName: string;
  layoutReason: string;
  layoutBadge?: string;
}

/**
 * Administrative Registration Form Builder component.
 * Allows workspace administrators to configure custom onboarding and registration fields
 * for their organization, manage public self-registration policies, and preview the live
 * "Get Started" form in real time.
 */
@Component({
  selector: 'app-registration-form-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LandingComponent, AuthLayoutComponent],
  template: `
    <div class="rf-builder-container">
      <!-- Page Header -->
      <div class="rf-header">
        <div class="rf-header-left">
          <div class="rf-eyebrow">
            <span class="material-symbols-outlined">how_to_reg</span>
            <span>USER MANAGEMENT &amp; ONBOARDING</span>
          </div>
          <h1 class="rf-title">Registration Form Builder</h1>
          <p class="rf-subtitle">
            Configure custom onboarding questions, field types, and registration rules for your business.
            Unlike CMS inquiry forms, questions configured here extend authenticated member accounts.
          </p>
        </div>
        <div class="rf-header-actions">
          <a routerLink="/auth/register" target="_blank" class="rf-btn rf-btn-outline">
            <span class="material-symbols-outlined">open_in_new</span>
            <span>Live "Get Started" Page</span>
          </a>
          <button type="button" class="rf-btn rf-btn-primary" (click)="openCreateModal()">
            <span class="material-symbols-outlined">add_circle</span>
            <span>Add Custom Question</span>
          </button>
        </div>
      </div>

      <!-- Master Policy Configuration Card (Compact & Modern) -->
      <div class="rf-policy-card">
        <div class="rf-policy-header">
          <div class="rf-policy-title-wrap">
            <span class="material-symbols-outlined rf-policy-icon">policy</span>
            <div>
              <h3 class="rf-policy-heading">Self-Registration &amp; Approval Governance</h3>
              <p class="rf-policy-sub">Global onboarding policies, URL slug routing, and welcome messaging.</p>
            </div>
          </div>
          <button type="button" class="rf-btn rf-btn-sm rf-btn-save" (click)="savePolicy()" [disabled]="savingPolicy">
            <span class="material-symbols-outlined">{{ savingPolicy ? 'hourglass_top' : 'save' }}</span>
            <span>{{ savingPolicy ? 'Saving...' : 'Save Policies' }}</span>
          </button>
        </div>

        <!-- 3-Column Sleek Toggle Row -->
        <div class="rf-policy-grid">
          <!-- Toggle 1: Allow Public Registration -->
          <div class="rf-toggle-box" [class.active]="policy.allowPublicRegistration">
            <div class="rf-toggle-info">
              <span class="rf-toggle-label">Public "Get Started"</span>
              <span class="rf-toggle-desc">
                {{ policy.allowPublicRegistration ? 'Open self-registration active.' : 'Invite-only registration.' }}
              </span>
            </div>
            <label class="rf-switch">
              <input type="checkbox" [(ngModel)]="policy.allowPublicRegistration" />
              <span class="rf-slider"></span>
            </label>
          </div>

          <!-- Toggle 2: Require Admin Approval -->
          <div class="rf-toggle-box" [class.active]="policy.requireApprovalBeforeLogin">
            <div class="rf-toggle-info">
              <span class="rf-toggle-label">Require Admin Approval</span>
              <span class="rf-toggle-desc">
                {{ policy.requireApprovalBeforeLogin ? 'Accounts start in Pending status.' : 'Instant activation on signup.' }}
              </span>
            </div>
            <label class="rf-switch">
              <input type="checkbox" [(ngModel)]="policy.requireApprovalBeforeLogin" />
              <span class="rf-slider"></span>
            </label>
          </div>

          <!-- Toggle 3: Affiliate Referral Code -->
          <div class="rf-toggle-box" [class.active]="policy.enableAffiliateReferralCode !== false">
            <div class="rf-toggle-info">
              <span class="rf-toggle-label">Affiliate Promo Code</span>
              <span class="rf-toggle-desc">
                {{ policy.enableAffiliateReferralCode !== false ? 'Referral promo prompt shown.' : 'Referral input hidden.' }}
              </span>
            </div>
            <label class="rf-switch">
              <input type="checkbox" [(ngModel)]="policy.enableAffiliateReferralCode" />
              <span class="rf-slider"></span>
            </label>
          </div>
        </div>

        <!-- Custom URL Slug & Industry Sector Inputs -->
        <div class="rf-copy-grid" style="margin-top: 10px;">
          <div class="rf-form-group">
            <label class="rf-form-label">REGISTRATION URL SLUG</label>
            <div class="rf-slug-input-wrap">
              <span class="rf-slug-prefix">/auth/</span>
              <input type="text" [(ngModel)]="policy.registrationUrlSlug" (ngModelChange)="sanitizeSlug()" class="rf-input" placeholder="e.g. register, apply, join" />
            </div>
            <div class="rf-live-url-pill">
              <span class="material-symbols-outlined">link</span>
              <span>Live: <strong>{{ liveRegistrationUrl }}</strong></span>
              <button type="button" class="rf-chip-btn" (click)="copyLiveUrl()" title="Copy Link">
                <span class="material-symbols-outlined">content_copy</span>
              </button>
              <a [href]="liveRegistrationUrl" target="_blank" class="rf-chip-btn" title="Open Link">
                <span class="material-symbols-outlined">open_in_new</span>
              </a>
            </div>
          </div>

          <div class="rf-form-group">
            <label class="rf-form-label">DEFAULT INDUSTRY SECTOR</label>
            <select [(ngModel)]="policy.defaultIndustrySector" class="rf-select">
              <option value="">-- Select Default Industry Sector (None) --</option>
              <option value="Business & Enterprise">Business & Enterprise</option>
              <option value="Education & Academy">Education & Academy</option>
              <option value="Healthcare & Care Services">Healthcare & Care Services</option>
              <option value="Non-Profit & Foundation">Non-Profit & Foundation</option>
              <option value="Government & Public Agency">Government & Public Agency</option>
              <option value="Technology & Software">Technology & Software</option>
              <option value="Community & Alumni Association">Community & Alumni Association</option>
            </select>
            <span class="field-hint">Classification &amp; default questions preset</span>
          </div>
        </div>

        <!-- Custom Copy Inputs & Form Properties -->
        <div class="rf-copy-grid rf-copy-grid-3" style="margin-top: 8px;">
          <div class="rf-form-group">
            <label class="rf-form-label">REGISTRATION FORM TITLE</label>
            <input type="text" [(ngModel)]="policy.registrationFormTitle" class="rf-input" placeholder="e.g. Create Your Account" />
            <span class="field-hint">Primary card heading &amp; tab title</span>
          </div>
          <div class="rf-form-group">
            <label class="rf-form-label">WELCOME SUBTITLE</label>
            <input type="text" [(ngModel)]="policy.registrationWelcomeMessage" class="rf-input" placeholder="e.g. Join our member directory and workspace portal." />
            <span class="field-hint">Subtitle beneath form title</span>
          </div>
          <div class="rf-form-group">
            <label class="rf-form-label">SUCCESS CONFIRMATION MESSAGE</label>
            <input type="text" [(ngModel)]="policy.registrationSuccessMessage" class="rf-input" placeholder="e.g. Registration successful! Welcome to the portal." />
            <span class="field-hint">Confirmation on completion</span>
          </div>
        </div>
      </div>

      <!-- 1-Click Industry Templates Gallery (Compact 1-Line Horizontal Scroll) -->
      <div class="rf-templates-banner">
        <div class="rf-tpl-head">
          <div class="rf-tpl-head-left">
            <div class="rf-tpl-eyebrow">
              <span class="material-symbols-outlined">auto_awesome</span>
              <span>1-CLICK ONBOARDING TEMPLATES</span>
            </div>
            <h3 class="rf-tpl-title">Pre-Configured Sector Templates</h3>
            <p class="rf-tpl-desc">Choose an archetype to instantly scaffold registration questions for your business.</p>
          </div>
          <!-- Horizontal Scroll Arrows -->
          <div class="rf-tpl-nav-arrows">
            <button type="button" class="rf-tpl-arrow-btn" (click)="scrollTemplates(tplScrollContainer, 'left')" title="Scroll Left">
              <span class="material-symbols-outlined">chevron_left</span>
            </button>
            <button type="button" class="rf-tpl-arrow-btn" (click)="scrollTemplates(tplScrollContainer, 'right')" title="Scroll Right">
              <span class="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>

        <!-- 1-Line Horizontal Scroll Track -->
        <div class="rf-tpl-scroll-row" #tplScrollContainer>
          <div class="rf-tpl-card" *ngFor="let tpl of industryTemplates" (click)="openTemplatePreview(tpl)">
            <div class="rf-tpl-top-row">
              <div class="rf-tpl-icon" [style.background]="tpl.bgColor" [style.color]="tpl.color">
                <span class="material-symbols-outlined">{{ tpl.icon }}</span>
              </div>
              <div class="rf-tpl-badges">
                <span class="rf-tpl-field-count">{{ tpl.fieldCount }} fields</span>
                <span class="rf-tpl-layout-pill" [class]="'pill-' + tpl.layoutMode">{{ tpl.layoutBadge || tpl.layoutName }}</span>
              </div>
            </div>
            <div class="rf-tpl-info">
              <h4>{{ tpl.name }}</h4>
              <p>{{ tpl.description }}</p>
            </div>
            <button type="button" class="rf-btn-tpl-apply" (click)="openTemplatePreview(tpl); $event.stopPropagation()">
              <span>Preview &amp; Apply</span>
              <span class="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Main Split Screen Workspace -->
      <div class="rf-split-workspace">
        <!-- LEFT COLUMN: Form Schema & Field List -->
        <div class="rf-column-fields">
          
          <!-- ============================================================= -->
          <!-- CARD 3: FORM ARCHITECTURE, PRESENTATION & QUESTION HIERARCHY  -->
          <!-- ============================================================= -->
          <div class="rf-section-card rf-card-3">
            <div class="rf-section-head">
              <div class="rf-section-title">
                <span class="material-symbols-outlined rf-sec-icon text-indigo">architecture</span>
                <div>
                  <h3 class="rf-card3-heading">Card 3: Presentation Layout, Security &amp; Question Flow</h3>
                  <p class="rf-section-desc">Select how applicants experience your registration workflow. Choose between single-page velocity or staged progressive wizards.</p>
                </div>
              </div>
              <button type="button" class="rf-btn rf-btn-sm rf-btn-save" (click)="savePolicy()" [disabled]="savingPolicy" title="Save Layout & Security Settings">
                <span class="material-symbols-outlined">{{ savingPolicy ? 'hourglass_top' : 'save' }}</span>
                <span>{{ savingPolicy ? 'Saving...' : 'Save Layout & Policies' }}</span>
              </button>
            </div>

            <!-- =========================================================== -->
            <!-- ROW 0: PAGE SHELL LAYOUT (WEBSITE LAYOUT VS. AUTH LAYOUT)    -->
            <!-- =========================================================== -->
            <div class="rf-builder-row">
              <div class="rf-row-header">
                <span class="rf-row-num">SHELL</span>
                <span class="rf-row-title">PAGE SHELL LAYOUT (WEBSITE LAYOUT VS. AUTH LAYOUT)</span>
                <span class="rf-row-hint">Choose which live master layout wraps your registration &amp; workforce onboarding form</span>
              </div>

              <div class="rf-layout-grid" style="grid-template-columns: repeat(2, 1fr);">
                <!-- Shell Option 1: Website Layout -->
                <div class="rf-layout-card"
                     [class.selected]="policy.pageShellLayout !== 'auth'"
                     (click)="selectPageShellLayout('website')">
                  <div class="rf-layout-radio">
                    <span class="material-symbols-outlined rf-radio-dot">{{ policy.pageShellLayout !== 'auth' ? 'radio_button_checked' : 'radio_button_unchecked' }}</span>
                    <span class="rf-layout-badge badge-blue">Live Website Shell</span>
                  </div>
                  <div class="rf-layout-main">
                    <div class="rf-layout-icon-wrap bg-blue-subtle">
                      <span class="material-symbols-outlined text-blue">language</span>
                    </div>
                    <h4 class="rf-layout-title">Website Layout (Header, Menu &amp; Footer)</h4>
                    <p class="rf-layout-desc">Injects the registration form directly inside your active public Website Layout between the live navigation bar, breadcrumb banner, and footer.</p>
                  </div>
                  <div class="rf-layout-footer" style="justify-content: flex-end;">
                    <button type="button" class="rf-btn-view-sample" (click)="openFullScreenPreview('website', $event)">
                      <span class="material-symbols-outlined">open_in_full</span>
                      <span>View Full Screen</span>
                    </button>
                  </div>
                </div>

                <!-- Shell Option 2: Auth Layout -->
                <div class="rf-layout-card"
                     [class.selected]="policy.pageShellLayout === 'auth'"
                     (click)="selectPageShellLayout('auth')">
                  <div class="rf-layout-radio">
                    <span class="material-symbols-outlined rf-radio-dot">{{ policy.pageShellLayout === 'auth' ? 'radio_button_checked' : 'radio_button_unchecked' }}</span>
                    <span class="rf-layout-badge badge-purple">Live Auth Split Shell</span>
                  </div>
                  <div class="rf-layout-main">
                    <div class="rf-layout-icon-wrap bg-purple-subtle">
                      <span class="material-symbols-outlined text-purple">dock_to_left</span>
                    </div>
                    <h4 class="rf-layout-title">Auth Layout (Brand Showcase &amp; Form Split)</h4>
                    <p class="rf-layout-desc">Injects the registration form directly into your official Auth Layout beside the dark brand showcase panel, feature highlights, and trust footer.</p>
                  </div>
                  <div class="rf-layout-footer" style="justify-content: flex-end;">
                    <button type="button" class="rf-btn-view-sample" (click)="openFullScreenPreview('auth', $event)">
                      <span class="material-symbols-outlined">open_in_full</span>
                      <span>View Full Screen</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- =========================================================== -->
            <!-- ROW 1: TYPE OF FORM (PRESENTATION EXPERIENCE)               -->
            <!-- =========================================================== -->
            <div class="rf-builder-row">
              <div class="rf-row-header">
                <span class="rf-row-num">ROW 1</span>
                <span class="rf-row-title">TYPE OF FORM (PRESENTATION EXPERIENCE)</span>
                <span class="rf-row-hint">Choose how questions are grouped and transitioned for public registrants</span>
              </div>

              <div class="rf-layout-grid">
                <!-- Option 1: Single Page Form -->
                <div class="rf-layout-card"
                     [class.selected]="policy.formLayoutMode === 'single'"
                     (click)="selectLayoutMode('single')">
                  <div class="rf-layout-radio">
                    <span class="material-symbols-outlined rf-radio-dot">{{ policy.formLayoutMode === 'single' ? 'radio_button_checked' : 'radio_button_unchecked' }}</span>
                    <span class="rf-layout-badge badge-green">High Velocity</span>
                  </div>
                  <div class="rf-layout-main">
                    <div class="rf-layout-icon-wrap bg-blue-subtle">
                      <span class="material-symbols-outlined text-blue">view_agenda</span>
                    </div>
                    <h4 class="rf-layout-title">Single Page Form</h4>
                    <p class="rf-layout-desc">All questions in a clean vertical stream with a single submit action.</p>
                  </div>
                  <div class="rf-layout-footer">
                    <button type="button" class="rf-btn-info-icon" (click)="toggleTooltip('single', $event)" title="Show Details">
                      <span class="material-symbols-outlined">info</span>
                    </button>
                    <button type="button" class="rf-btn-view-sample" (click)="openLayoutSample('single', $event)">
                      <span class="material-symbols-outlined">visibility</span>
                      <span>View Sample</span>
                    </button>
                  </div>
                  <!-- Inline Tooltip Details Popover -->
                  <div *ngIf="activeTooltip === 'single'" class="rf-tooltip-popover" (click)="$event.stopPropagation()">
                    <div class="rf-tt-head">
                      <strong>Single Page Velocity</strong>
                      <button type="button" (click)="activeTooltip = null">×</button>
                    </div>
                    <p>Best for quick, high-conversion signups (1-5 questions). Keeps friction low and lets users complete registration in under 60 seconds.</p>
                  </div>
                </div>

                <!-- Option 2: Single Page with Category Sections -->
                <div class="rf-layout-card"
                     [class.selected]="policy.formLayoutMode === 'sections'"
                     (click)="selectLayoutMode('sections')">
                  <div class="rf-layout-radio">
                    <span class="material-symbols-outlined rf-radio-dot">{{ policy.formLayoutMode === 'sections' ? 'radio_button_checked' : 'radio_button_unchecked' }}</span>
                    <span class="rf-layout-badge badge-purple">Grouped Cards</span>
                  </div>
                  <div class="rf-layout-main">
                    <div class="rf-layout-icon-wrap bg-purple-subtle">
                      <span class="material-symbols-outlined text-purple">dashboard_customize</span>
                    </div>
                    <h4 class="rf-layout-title">Single Page + Categories</h4>
                    <p class="rf-layout-desc">Group related questions into categorized cards with clear dividers.</p>
                  </div>
                  <div class="rf-layout-footer">
                    <button type="button" class="rf-btn-info-icon" (click)="toggleTooltip('sections', $event)" title="Show Details">
                      <span class="material-symbols-outlined">info</span>
                    </button>
                    <button type="button" class="rf-btn-view-sample" (click)="openLayoutSample('sections', $event)">
                      <span class="material-symbols-outlined">visibility</span>
                      <span>View Sample</span>
                    </button>
                  </div>
                  <div *ngIf="activeTooltip === 'sections'" class="rf-tooltip-popover" (click)="$event.stopPropagation()">
                    <div class="rf-tt-head">
                      <strong>Categorized Fieldsets</strong>
                      <button type="button" (click)="activeTooltip = null">×</button>
                    </div>
                    <p>Best for medium forms (6-15 questions). Organizes fields into distinct visual cards (e.g. Personal Details, Corporate Info, Verification) on a single scrollable page.</p>
                  </div>
                </div>

                <!-- Option 3: Step-by-Step Stepper Wizard -->
                <div class="rf-layout-card"
                     [class.selected]="policy.formLayoutMode === 'stepper'"
                     (click)="selectLayoutMode('stepper')">
                  <div class="rf-layout-radio">
                    <span class="material-symbols-outlined rf-radio-dot">{{ policy.formLayoutMode === 'stepper' ? 'radio_button_checked' : 'radio_button_unchecked' }}</span>
                    <span class="rf-layout-badge badge-blue">Guided Stepper</span>
                  </div>
                  <div class="rf-layout-main">
                    <div class="rf-layout-icon-wrap bg-indigo-subtle">
                      <span class="material-symbols-outlined text-indigo">linear_scale</span>
                    </div>
                    <h4 class="rf-layout-title">Step-by-Step Wizard</h4>
                    <p class="rf-layout-desc">Numbered interactive wizard stepper (1-2-3-4) with animated progress bar.</p>
                  </div>
                  <div class="rf-layout-footer">
                    <button type="button" class="rf-btn-info-icon" (click)="toggleTooltip('stepper', $event)" title="Show Details">
                      <span class="material-symbols-outlined">info</span>
                    </button>
                    <button type="button" class="rf-btn-view-sample" (click)="openLayoutSample('stepper', $event)">
                      <span class="material-symbols-outlined">visibility</span>
                      <span>View Sample</span>
                    </button>
                  </div>
                  <div *ngIf="activeTooltip === 'stepper'" class="rf-tooltip-popover" (click)="$event.stopPropagation()">
                    <div class="rf-tt-head">
                      <strong>Multi-Stage Stepper Flow</strong>
                      <button type="button" (click)="activeTooltip = null">×</button>
                    </div>
                    <p>Best for detailed onboarding (8-20+ questions). Reduces cognitive overload by focusing applicant attention on one phase at a time with Next / Back milestones.</p>
                  </div>
                </div>

                <!-- Option 4: Page-by-Page Multi-Page Form -->
                <div class="rf-layout-card"
                     [class.selected]="policy.formLayoutMode === 'pages'"
                     (click)="selectLayoutMode('pages')">
                  <div class="rf-layout-radio">
                    <span class="material-symbols-outlined rf-radio-dot">{{ policy.formLayoutMode === 'pages' ? 'radio_button_checked' : 'radio_button_unchecked' }}</span>
                    <span class="rf-layout-badge badge-amber">Multi-Page</span>
                  </div>
                  <div class="rf-layout-main">
                    <div class="rf-layout-icon-wrap bg-amber-subtle">
                      <span class="material-symbols-outlined text-amber">auto_stories</span>
                    </div>
                    <h4 class="rf-layout-title">Page-by-Page Form</h4>
                    <p class="rf-layout-desc">Distinct multi-page pagination experience (Page 1 of N) with dedicated submit stages.</p>
                  </div>
                  <div class="rf-layout-footer">
                    <button type="button" class="rf-btn-info-icon" (click)="toggleTooltip('pages', $event)" title="Show Details">
                      <span class="material-symbols-outlined">info</span>
                    </button>
                    <button type="button" class="rf-btn-view-sample" (click)="openLayoutSample('pages', $event)">
                      <span class="material-symbols-outlined">visibility</span>
                      <span>View Sample</span>
                    </button>
                  </div>
                  <div *ngIf="activeTooltip === 'pages'" class="rf-tooltip-popover" (click)="$event.stopPropagation()">
                    <div class="rf-tt-head">
                      <strong>Page-by-Page Pagination</strong>
                      <button type="button" (click)="activeTooltip = null">×</button>
                    </div>
                    <p>Best for comprehensive application portals (e.g. Academy admissions, vendor KYC, grant applications). Isolates sections into dedicated browser page views.</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- =========================================================== -->
            <!-- ROW 2: SECURITY & SESSION CONTINUITY POLICIES              -->
            <!-- =========================================================== -->
            <div class="rf-builder-row">
              <div class="rf-row-header">
                <span class="rf-row-num">ROW 2</span>
                <span class="rf-row-title">SECURITY &amp; SESSION CONTINUITY POLICIES</span>
                <span class="rf-row-hint">Set credential requirements and session resume capability</span>
              </div>

              <div class="rf-row2-grid">
                <!-- Toggle 1: Require Password Creation -->
                <div class="rf-toggle-box rf-row2-box" [class.active]="policy.requirePassword">
                  <div class="rf-toggle-info">
                    <div class="rf-toggle-label-wrap">
                      <span class="rf-toggle-label">Require Password Creation</span>
                      <button type="button" class="rf-btn-inline-info" (click)="toggleTooltip('pwd', $event)" title="Policy Details">
                        <span class="material-symbols-outlined">info</span>
                      </button>
                    </div>
                    <span class="rf-toggle-desc">
                      {{ policy.requirePassword
                        ? 'Applicants must set and confirm an account password during registration.'
                        : 'Passwordless registration. Applicant is sent an instant email magic link to set credentials later.' }}
                    </span>
                  </div>
                  <label class="rf-switch">
                    <input type="checkbox" [(ngModel)]="policy.requirePassword" (change)="savePolicy(false)" />
                    <span class="rf-slider"></span>
                  </label>
                  <div *ngIf="activeTooltip === 'pwd'" class="rf-tooltip-popover" (click)="$event.stopPropagation()">
                    <div class="rf-tt-head">
                      <strong>Password Requirement Policy</strong>
                      <button type="button" (click)="activeTooltip = null">×</button>
                    </div>
                    <p>When enabled, users create a secure password immediately. When disabled, users register with just their email/phone and activate via a one-time secure email link.</p>
                  </div>
                </div>

                <!-- Toggle 2: Require Continue Later -->
                <div class="rf-toggle-box rf-row2-box" [class.active]="policy.allowSaveAndContinue">
                  <div class="rf-toggle-info">
                    <div class="rf-toggle-label-wrap">
                      <span class="rf-toggle-label">Allow "Save &amp; Continue Later"</span>
                      <button type="button" class="rf-btn-inline-info" (click)="toggleTooltip('continue', $event)" title="Policy Details">
                        <span class="material-symbols-outlined">info</span>
                      </button>
                    </div>
                    <span class="rf-toggle-desc">
                      {{ policy.allowSaveAndContinue
                        ? 'Applicants can save partial progress and receive an emailed secure resume link to finish later.'
                        : 'Applicants must complete and submit registration in a single continuous session.' }}
                    </span>
                  </div>
                  <label class="rf-switch">
                    <input type="checkbox" [(ngModel)]="policy.allowSaveAndContinue" (change)="savePolicy(false)" />
                    <span class="rf-slider"></span>
                  </label>
                  <div *ngIf="activeTooltip === 'continue'" class="rf-tooltip-popover" (click)="$event.stopPropagation()">
                    <div class="rf-tt-head">
                      <strong>Session Continuity &amp; Drafts</strong>
                      <button type="button" (click)="activeTooltip = null">×</button>
                    </div>
                    <p>Crucial for long multi-stage questionnaires or academic forms. Saves applicant entries as an encrypted draft and emails a resumption token.</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- =========================================================== -->
            <!-- ROW 3: CATEGORY / STEP HIERARCHY & ONBOARDING QUESTIONS     -->
            <!-- =========================================================== -->
            <div class="rf-builder-row">
              <div class="rf-row-header">
                <span class="rf-row-num">ROW 3</span>
                <span class="rf-row-title">CATEGORY / STEP HIERARCHY &amp; ONBOARDING QUESTIONS</span>
                <span class="rf-row-hint">Manage core credentials and organize business questions into sections</span>
              </div>

              <!-- Default Permanent Category / Step: Personal & Account Credentials -->
              <div class="rf-category-block rf-default-category">
                <div class="rf-cat-head">
                  <div class="rf-cat-title-wrap">
                    <div class="rf-cat-badge-icon">
                      <span class="material-symbols-outlined text-blue">shield_person</span>
                    </div>
                    <div>
                      <div class="rf-cat-title-row">
                        <h4 class="rf-cat-title">Default Category 1: Personal &amp; Account Credentials</h4>
                        <span class="rf-badge-system-locked">
                          <span class="material-symbols-outlined">lock</span>
                          <span>System Protected (Cannot Delete)</span>
                        </span>
                      </div>
                      <p class="rf-cat-subtitle">Built-in identity fields required for authentication and member profiles. You can unpublish (hide) optional fields, but cannot delete them.</p>
                    </div>
                  </div>
                </div>

                <!-- Core Built-in Fields List -->
                <div class="rf-core-table">
                  <!-- First & Last Name -->
                  <div class="rf-core-row">
                    <div class="rf-core-info">
                      <span class="material-symbols-outlined rf-core-icon">person</span>
                      <div>
                        <strong>First &amp; Last Name</strong>
                        <span class="rf-core-hint">Stored in member Profile.FirstName &amp; Profile.LastName</span>
                      </div>
                    </div>
                    <div class="rf-core-controls">
                      <span class="rf-badge-req">Mandatory</span>
                      <span class="rf-badge-published">Published</span>
                      <span class="rf-lock-badge" title="System Locked: Core account identity attribute cannot be deleted">
                        <span class="material-symbols-outlined">lock</span>
                        <span>Locked</span>
                      </span>
                    </div>
                  </div>

                  <!-- Email Address (Login Username) -->
                  <div class="rf-core-row">
                    <div class="rf-core-info">
                      <span class="material-symbols-outlined rf-core-icon">mail</span>
                      <div>
                        <strong>Email Address (Login Username)</strong>
                        <span class="rf-core-hint">Primary login credential and transactional communication address</span>
                      </div>
                    </div>
                    <div class="rf-core-controls">
                      <span class="rf-badge-req">Mandatory</span>
                      <span class="rf-badge-published">Published</span>
                      <span class="rf-lock-badge" title="System Locked: Core authentication identifier cannot be deleted">
                        <span class="material-symbols-outlined">lock</span>
                        <span>Locked</span>
                      </span>
                    </div>
                  </div>

                  <!-- Password & Confirm -->
                  <div class="rf-core-row">
                    <div class="rf-core-info">
                      <span class="material-symbols-outlined rf-core-icon">key</span>
                      <div>
                        <strong>Account Password &amp; Confirm</strong>
                        <span class="rf-core-hint">
                          {{ policy.requirePassword
                            ? 'Active — Applicants will specify a secure password during registration.'
                            : 'Bypassed — Passwordless signup active; applicant will receive an activation email link.' }}
                        </span>
                      </div>
                    </div>
                    <div class="rf-core-controls">
                      <span [class]="policy.requirePassword ? 'rf-badge-req' : 'rf-badge-opt'">
                        {{ policy.requirePassword ? 'Required' : 'Bypassed' }}
                      </span>
                      <span [class]="policy.requirePassword ? 'rf-badge-published' : 'rf-badge-unpub'">
                        {{ policy.requirePassword ? 'Published' : 'Unpublished' }}
                      </span>
                      <span class="rf-lock-badge" title="System Locked: Governed by Require Password switch above">
                        <span class="material-symbols-outlined">lock</span>
                        <span>Locked</span>
                      </span>
                    </div>
                  </div>

                  <!-- Phone Number (Unpublishable) -->
                  <div class="rf-core-row">
                    <div class="rf-core-info">
                      <span class="material-symbols-outlined rf-core-icon">phone</span>
                      <div>
                        <strong>Phone Number</strong>
                        <span class="rf-core-hint">Used for SMS alerts, two-factor authentication, and contact phone book</span>
                      </div>
                    </div>
                    <div class="rf-core-controls">
                      <span [class]="isCoreFieldPublished('phone') ? 'rf-badge-opt' : 'rf-badge-unpub'">
                        {{ isCoreFieldPublished('phone') ? 'Optional' : 'Hidden' }}
                      </span>
                      <!-- Unpublish / Publish Toggle Switch -->
                      <button type="button"
                              class="rf-btn-unpub"
                              [class.is-active]="isCoreFieldPublished('phone')"
                              (click)="toggleCoreFieldPublish('phone')">
                        <span class="material-symbols-outlined">{{ isCoreFieldPublished('phone') ? 'visibility' : 'visibility_off' }}</span>
                        <span>{{ isCoreFieldPublished('phone') ? 'Published' : 'Unpublished' }}</span>
                      </button>
                      <span class="rf-lock-badge" title="System Field: Cannot be deleted, but can be hidden">
                        <span class="material-symbols-outlined">lock</span>
                        <span>No Delete</span>
                      </span>
                    </div>
                  </div>

                  <!-- Category Tier Selector (Unpublishable) -->
                  <div class="rf-core-row">
                    <div class="rf-core-info">
                      <span class="material-symbols-outlined rf-core-icon">category</span>
                      <div>
                        <strong>Member Category Tier Selector</strong>
                        <span class="rf-core-hint">Allows applicants to select their tier (e.g. Student, Executive, Affiliate)</span>
                      </div>
                    </div>
                    <div class="rf-core-controls">
                      <span [class]="isCoreFieldPublished('category') ? 'rf-badge-opt' : 'rf-badge-unpub'">
                        {{ isCoreFieldPublished('category') ? 'Optional' : 'Hidden' }}
                      </span>
                      <button type="button"
                              class="rf-btn-unpub"
                              [class.is-active]="isCoreFieldPublished('category')"
                              (click)="toggleCoreFieldPublish('category')">
                        <span class="material-symbols-outlined">{{ isCoreFieldPublished('category') ? 'visibility' : 'visibility_off' }}</span>
                        <span>{{ isCoreFieldPublished('category') ? 'Published' : 'Unpublished' }}</span>
                      </button>
                      <span class="rf-lock-badge" title="System Field: Cannot be deleted, but can be hidden">
                        <span class="material-symbols-outlined">lock</span>
                        <span>No Delete</span>
                      </span>
                    </div>
                  </div>

                  <!-- Industry Sector / Organization Domain (Unpublishable) -->
                  <div class="rf-core-row">
                    <div class="rf-core-info">
                      <span class="material-symbols-outlined rf-core-icon">apartment</span>
                      <div>
                        <strong>Industry / Organization Sector</strong>
                        <span class="rf-core-hint">Allows applicants to specify their industry vertical. Can be unpublished to hide from registration.</span>
                      </div>
                    </div>
                    <div class="rf-core-controls">
                      <span [class]="isCoreFieldPublished('organizationType') ? 'rf-badge-opt' : 'rf-badge-unpub'">
                        {{ isCoreFieldPublished('organizationType') ? 'Published' : 'Hidden' }}
                      </span>
                      <button type="button"
                              class="rf-btn-unpub"
                              [class.is-active]="isCoreFieldPublished('organizationType')"
                              (click)="toggleCoreFieldPublish('organizationType')">
                        <span class="material-symbols-outlined">{{ isCoreFieldPublished('organizationType') ? 'visibility' : 'visibility_off' }}</span>
                        <span>{{ isCoreFieldPublished('organizationType') ? 'Published' : 'Unpublished' }}</span>
                      </button>
                      <span class="rf-lock-badge" title="System Field: Cannot be deleted, but can be hidden">
                        <span class="material-symbols-outlined">lock</span>
                        <span>No Delete</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- ======================================================= -->
              <!-- CUSTOM CATEGORIES / STEPS ORGANIZER                     -->
              <!-- ======================================================= -->
              <div class="rf-custom-hierarchy-wrap">
                
                <!-- Action Bar for Custom Categories / Steps -->
                <div class="rf-hierarchy-toolbar">
                  <div class="rf-hierarchy-title">
                    <span class="material-symbols-outlined">view_cozy</span>
                    <span *ngIf="policy.formLayoutMode === 'single'">Unified Question Stream ({{ fields.length }} Questions)</span>
                    <span *ngIf="policy.formLayoutMode === 'sections'">Category Sections Hierarchy ({{ (policy.customSections.length || 0) + 1 }} Sections)</span>
                    <span *ngIf="policy.formLayoutMode === 'stepper' || policy.formLayoutMode === 'pages'">Staged Flow Sequence ({{ (policy.customSections.length || 0) + 1 }} Stages)</span>
                  </div>

                  <div class="rf-hierarchy-actions">
                    <!-- In Sections Mode: Add Category Section -->
                    <button *ngIf="policy.formLayoutMode === 'sections'"
                            type="button"
                            class="rf-btn rf-btn-sm rf-btn-outline"
                            (click)="promptAddSection()">
                      <span class="material-symbols-outlined">library_add</span>
                      <span>+ Add Category Section</span>
                    </button>

                    <!-- In Stepper / Pages Mode: Add Step Stage -->
                    <button *ngIf="policy.formLayoutMode === 'stepper' || policy.formLayoutMode === 'pages'"
                            type="button"
                            class="rf-btn rf-btn-sm rf-btn-outline"
                            (click)="promptAddSection()">
                      <span class="material-symbols-outlined">playlist_add</span>
                      <span>+ Add Step Stage</span>
                    </button>

                    <!-- Primary Add Question Button -->
                    <button type="button" class="rf-btn rf-btn-sm rf-btn-primary" (click)="openCreateModal()">
                      <span class="material-symbols-outlined">add_circle</span>
                      <span>Add Custom Question</span>
                    </button>
                  </div>
                </div>

                <!-- Empty State -->
                <div *ngIf="!loadingFields && fields.length === 0" class="rf-empty-fields">
                  <span class="material-symbols-outlined rf-empty-icon">playlist_add</span>
                  <h4>No Custom Questions Added Yet</h4>
                  <p>Your "Get Started" page is currently using standard personal credentials. Add questions like Student ID, Department, Company Name, or Document Uploads.</p>
                  <button type="button" class="rf-btn rf-btn-primary" (click)="openCreateModal()">
                    <span class="material-symbols-outlined">add_circle</span>
                    <span>Add First Custom Question</span>
                  </button>
                </div>

                <!-- Section / Step Cards (if sections or stepper/pages mode) -->
                <div *ngIf="policy.formLayoutMode !== 'single' && policy.customSections && policy.customSections.length > 0" class="rf-sections-deck">
                  <div *ngFor="let sec of policy.customSections; let secIdx = index" class="rf-section-group-box">
                    <div class="rf-sec-group-header">
                      <div class="rf-sec-group-title">
                        <span class="rf-sec-badge-num">{{ policy.formLayoutMode === 'sections' ? 'Category ' + (secIdx + 2) : 'Step ' + (secIdx + 2) }}</span>
                        <input type="text"
                               [(ngModel)]="policy.customSections[secIdx]"
                               class="rf-inline-sec-input"
                               placeholder="e.g. Academic Background, Corporate Details" />
                      </div>
                      <div class="rf-sec-group-actions">
                        <button type="button" class="rf-btn-sec-del" (click)="removeCategorySection(secIdx)" title="Remove Section">
                          <span class="material-symbols-outlined">delete</span>
                        </button>
                        <button type="button" class="rf-btn rf-btn-sm rf-btn-outline" (click)="openCreateModalForSection(sec)">
                          <span class="material-symbols-outlined">add</span>
                          <span>Add to this {{ policy.formLayoutMode === 'sections' ? 'Category' : 'Step' }}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Fields List with Validation Rules -->
                <div *ngIf="!loadingFields && fields.length > 0" class="rf-fields-list">
                  <div *ngFor="let field of fields; let i = index" class="rf-field-item" [class.inactive]="!field.isActive">
                    <div class="rf-field-reorder">
                      <button type="button" class="rf-order-btn" (click)="moveFieldUp(i)" [disabled]="i === 0" title="Move Up">
                        <span class="material-symbols-outlined">expand_less</span>
                      </button>
                      <span class="rf-order-index">#{{ i + 1 }}</span>
                      <button type="button" class="rf-order-btn" (click)="moveFieldDown(i)" [disabled]="i === fields.length - 1" title="Move Down">
                        <span class="material-symbols-outlined">expand_more</span>
                      </button>
                    </div>

                    <div class="rf-field-body">
                      <div class="rf-field-top">
                        <span class="rf-field-type-pill" [attr.data-type]="field.fieldType">
                          <span class="material-symbols-outlined">{{ getFieldTypeIcon(field.fieldType) }}</span>
                          <span>{{ getFieldTypeLabel(field.fieldType) }}</span>
                        </span>
                        
                        <!-- Active / Disabled Soft Status -->
                        <span *ngIf="field.isActive" class="rf-badge-active">Active</span>
                        <span *ngIf="!field.isActive" class="rf-badge-disabled" title="Disabled: Question is hidden from new signups. Historical member answers are preserved.">Disabled (Hidden)</span>

                        <!-- Validation Rule Badges -->
                        <span *ngIf="field.isRequired" class="rf-badge-req">Required</span>
                        <span *ngIf="!field.isRequired" class="rf-badge-opt">Optional</span>
                        
                        <span *ngIf="field.minLength || field.maxLength" class="rf-badge-val">
                          Len: {{ field.minLength || 0 }}-{{ field.maxLength || '∞' }}
                        </span>
                        <span *ngIf="field.patternRegex" class="rf-badge-val" title="Regex: {{ field.patternRegex }}">
                          Regex
                        </span>

                        <span *ngIf="field.categoryName" class="rf-badge-cat">
                          <span class="material-symbols-outlined">sell</span>
                          <span>{{ field.categoryName }}</span>
                        </span>
                        <span *ngIf="!field.categoryName" class="rf-badge-all">All Categories</span>

                        <span *ngIf="field.sectionName" class="rf-badge-section">
                          <span class="material-symbols-outlined">folder</span>
                          <span>{{ field.sectionName }}</span>
                        </span>
                      </div>

                      <h4 class="rf-field-label">{{ field.label }}</h4>
                      <div class="rf-field-meta">
                        <code>{{ field.fieldKey }}</code>
                        <span *ngIf="field.placeholder" class="rf-meta-placeholder">Placeholder: "{{ field.placeholder }}"</span>
                        <span *ngIf="field.options && field.options.length > 0" class="rf-meta-opts">{{ field.options.length }} options</span>
                        <span *ngIf="field.customErrorMessage" class="rf-meta-err">Custom Error Set</span>
                      </div>
                      <p *ngIf="field.helpText" class="rf-field-help">{{ field.helpText }}</p>
                    </div>

                    <div class="rf-field-actions">
                      <button type="button"
                              class="rf-action-btn rf-btn-toggle-active"
                              [class.is-active]="field.isActive"
                              (click)="toggleFieldActive(field)"
                              [title]="field.isActive ? 'Disable Question (Soft-hide from new applicants without losing historical data)' : 'Enable Question (Publish on registration form)'">
                        <span class="material-symbols-outlined">{{ field.isActive ? 'visibility' : 'visibility_off' }}</span>
                      </button>
                      <button type="button" class="rf-action-btn" (click)="openEditModal(field)" title="Edit Question &amp; Validation">
                        <span class="material-symbols-outlined">edit</span>
                      </button>
                      <button type="button" class="rf-action-btn rf-btn-del" (click)="deleteField(field)" title="Delete Question">
                        <span class="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

        <!-- ============================================================= -->
        <!-- RIGHT COLUMN: INTERACTIVE LIVE SIMULATION                     -->
        <!-- ============================================================= -->
        <div class="rf-column-preview">
          <div class="rf-preview-card">
            <div class="rf-preview-bar">
              <div class="rf-preview-indicator">
                <span class="rf-pulse-dot"></span>
                <span>INTERACTIVE "GET STARTED" SANDBOX</span>
              </div>
              <div class="rf-preview-bar-actions">
                <div style="display:inline-flex;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:8px;padding:2px;gap:2px;">
                  <button type="button" (click)="selectPageShellLayout('website')"
                          [style.background]="policy.pageShellLayout !== 'auth' ? '#0050E5' : 'transparent'"
                          [style.color]="policy.pageShellLayout !== 'auth' ? '#ffffff' : '#475569'"
                          style="border:none;border-radius:6px;padding:3px 9px;font-size:10.5px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:4px;">
                    <span class="material-symbols-outlined" style="font-size:13px;">language</span>
                    <span>Website Layout</span>
                  </button>
                  <button type="button" (click)="selectPageShellLayout('auth')"
                          [style.background]="policy.pageShellLayout === 'auth' ? '#0050E5' : 'transparent'"
                          [style.color]="policy.pageShellLayout === 'auth' ? '#ffffff' : '#475569'"
                          style="border:none;border-radius:6px;padding:3px 9px;font-size:10.5px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:4px;">
                    <span class="material-symbols-outlined" style="font-size:13px;">dock_to_left</span>
                    <span>Auth Layout</span>
                  </button>
                </div>
                <button type="button" (click)="showFullScreenPreview = true"
                        style="background:#0050E5;color:#ffffff;border:none;border-radius:6px;padding:4px 10px;font-size:11px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:4px;box-shadow:0 2px 6px rgba(0,80,229,0.25);">
                  <span class="material-symbols-outlined" style="font-size:14px;">open_in_full</span>
                  <span>View Full Screen</span>
                </button>
                <button type="button" class="rf-btn-sim-autofill" (click)="autoFillSimulation()" title="Auto-fill sandbox with realistic test data">
                  <span class="material-symbols-outlined">magic_button</span>
                  <span>Auto-Fill Sample</span>
                </button>
                <button type="button" class="rf-btn-sim-reset" (click)="resetSimulation()" title="Reset Sandbox Input">
                  <span class="material-symbols-outlined">restart_alt</span>
                  <span>Reset Test</span>
                </button>
                <span class="rf-preview-mode-tag">{{ getLayoutTitle(policy.formLayoutMode) }}</span>
              </div>
            </div>

            <!-- Active Shell Indicator Banner in Narrow Sidebar Preview -->
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 14px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-size:11.5px;color:#334155;">
              <div style="display:flex;align-items:center;gap:6px;">
                <span class="material-symbols-outlined" style="font-size:16px;color:#0050E5;">{{ policy.pageShellLayout === 'auth' ? 'dock_to_left' : 'language' }}</span>
                <span>Active Page Shell: <strong style="color:#0f172a;">{{ policy.pageShellLayout === 'auth' ? 'Auth Layout (Split Screen)' : 'Website Layout (Header & Footer)' }}</strong></span>
              </div>
              <button type="button" (click)="showFullScreenPreview = true"
                      style="background:#eff6ff;color:#0050E5;border:1px solid #bfdbfe;border-radius:6px;padding:3px 8px;font-size:11px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:4px;">
                <span class="material-symbols-outlined" style="font-size:13px;">open_in_full</span>
                <span>Preview Full Desktop Layout</span>
              </button>
            </div>

            <!-- Live Injected Outer Layout Shell in Sidebar -->
            <div style="width:100%;max-height:780px;overflow-y:auto;overflow-x:hidden;border-radius:12px;border:1px solid #334155;background:#f8fafc;">
              <app-landing *ngIf="policy.pageShellLayout !== 'auth'"
                           [embeddedShellMode]="true"
                           [previewMode]="true"
                           [embeddedPageTitle]="policy.registrationFormTitle || 'Create Your Account'"
                           [embeddedPageSubtitle]="policy.registrationWelcomeMessage || 'Join our member directory and workspace portal.'">
                <div style="max-width: 580px; margin: 0 auto;">
                  <ng-container *ngTemplateOutlet="liveSimFormCard"></ng-container>
                </div>
              </app-landing>

              <app-auth-layout *ngIf="policy.pageShellLayout === 'auth'"
                               [embeddedMode]="true"
                               [previewMode]="true">
                <ng-container *ngTemplateOutlet="liveSimFormCard"></ng-container>
              </app-auth-layout>
            </div>

            <!-- Simulated Public Registration Form Card Template -->
            <ng-template #liveSimFormCard>
            <div class="rf-sim-card">
              
              <!-- Draft Saved Toast/Alert -->
              <div *ngIf="simDraftSaved" class="rf-sim-alert-draft">
                <span class="material-symbols-outlined">bookmark_added</span>
                <span>Test Mode: Draft saved! In production, a secure resumption link is sent to {{ simModel.email || 'the applicant email' }}.</span>
              </div>

              <!-- SIMULATION TEST SUCCESS CARD (When Test Submitted) -->
              <div *ngIf="simSubmitted" class="rf-sim-success-card">
                <div class="rf-sim-success-badge">
                  <span class="material-symbols-outlined">verified</span>
                </div>
                <h3 class="rf-sim-success-title">Simulation Test Passed!</h3>
                <p class="rf-sim-success-msg">{{ policy.registrationSuccessMessage || 'Registration successful! Welcome to the portal.' }}</p>

                <!-- Captured Test Data Summary -->
                <div class="rf-sim-result-box">
                  <div class="rf-sim-res-head">
                    <span class="material-symbols-outlined">assignment_turned_in</span>
                    <span>TEST CAPTURED DATA BREAKDOWN</span>
                  </div>
                  <div class="rf-sim-res-row">
                    <span>Applicant Name:</span>
                    <strong>{{ simModel.firstName }} {{ simModel.lastName }}</strong>
                  </div>
                  <div class="rf-sim-res-row">
                    <span>Login Username / Email:</span>
                    <strong>{{ simModel.email }}</strong>
                  </div>
                  <div class="rf-sim-res-row" *ngIf="isCoreFieldPublished('phone') && simModel.phone">
                    <span>Phone Number:</span>
                    <strong>{{ simModel.phone }}</strong>
                  </div>
                  <div class="rf-sim-res-row" *ngIf="isCoreFieldPublished('category')">
                    <span>Category Tier:</span>
                    <strong>{{ getSimCategoryName() }}</strong>
                  </div>
                  <div class="rf-sim-res-row">
                    <span>Industry Sector:</span>
                    <strong>{{ policy.defaultIndustrySector }}</strong>
                  </div>
                  <div class="rf-sim-res-row">
                    <span>Authentication Method:</span>
                    <strong>{{ policy.requirePassword ? 'Account Password Set' : 'Magic Link Activation Dispatched' }}</strong>
                  </div>
                  <div class="rf-sim-res-row" *ngIf="getFilledAttributesCount() > 0">
                    <span>Custom Onboarding Answers:</span>
                    <strong>{{ getFilledAttributesCount() }} fields completed</strong>
                  </div>
                </div>

                <div class="rf-sim-notice-test">
                  <span class="material-symbols-outlined">science</span>
                  <span>Interactive Test: Zero real accounts created. Testing form flow only.</span>
                </div>

                <div class="rf-sim-success-actions">
                  <button type="button" class="rf-btn rf-btn-primary" (click)="resetSimulation()">
                    <span class="material-symbols-outlined">restart_alt</span>
                    <span>Test Form Again</span>
                  </button>
                  <button type="button" class="rf-btn rf-btn-outline" (click)="simSubmitted = false">
                    <span class="material-symbols-outlined">edit</span>
                    <span>Modify Test Inputs</span>
                  </button>
                </div>
              </div>

              <!-- INTERACTIVE FORM (When !simSubmitted) -->
              <div *ngIf="!simSubmitted">
                <div class="rf-sim-header">
                  <div class="rf-sim-avatar">
                    <span class="material-symbols-outlined">how_to_reg</span>
                  </div>
                  <h3 class="rf-sim-title">{{ policy.registrationFormTitle || 'Create Your Account' }}</h3>
                  <p class="rf-sim-sub">{{ policy.registrationWelcomeMessage || 'Join our member directory and workspace portal.' }}</p>
                </div>

                <!-- SIMULATION LAYOUT 1: SINGLE PAGE FORM -->
                <div *ngIf="policy.formLayoutMode === 'single'" class="rf-sim-form rf-sim-single">
                  <div class="rf-sim-stage-badge">SINGLE PAGE STREAM (ALL QUESTIONS)</div>

                  <!-- Core Name -->
                  <div class="rf-sim-grid-2">
                    <div class="rf-sim-group">
                      <label class="rf-sim-label">First Name *</label>
                      <input type="text" [(ngModel)]="simModel.firstName" class="rf-sim-input" placeholder="e.g. First" />
                    </div>
                    <div class="rf-sim-group">
                      <label class="rf-sim-label">Last Name *</label>
                      <input type="text" [(ngModel)]="simModel.lastName" class="rf-sim-input" placeholder="e.g. Last" />
                    </div>
                  </div>

                  <!-- Core Email -->
                  <div class="rf-sim-group">
                    <label class="rf-sim-label">Email Address (Login Username) *</label>
                    <input type="email" [(ngModel)]="simModel.email" class="rf-sim-input" placeholder="name@company.com" />
                  </div>

                  <!-- Core Password -->
                  <div *ngIf="policy.requirePassword" class="rf-sim-grid-2">
                    <div class="rf-sim-group">
                      <label class="rf-sim-label">Create Password *</label>
                      <input type="password" [(ngModel)]="simModel.password" class="rf-sim-input" placeholder="••••••••••••" />
                    </div>
                    <div class="rf-sim-group">
                      <label class="rf-sim-label">Confirm Password *</label>
                      <input type="password" [(ngModel)]="simModel.confirmPassword" class="rf-sim-input" placeholder="••••••••••••" />
                    </div>
                  </div>
                  <div *ngIf="!policy.requirePassword" class="rf-sim-alert-passwordless">
                    <span class="material-symbols-outlined">magic_button</span>
                    <span>Passwordless Signup: Magic activation link will be sent to your email.</span>
                  </div>

                  <!-- Core Phone -->
                  <div *ngIf="isCoreFieldPublished('phone')" class="rf-sim-group">
                    <label class="rf-sim-label">Phone Number (Optional)</label>
                    <input type="text" [(ngModel)]="simModel.phone" class="rf-sim-input" placeholder="e.g. +0 (000) 000-0000" />
                  </div>

                  <!-- Core Category -->
                  <div *ngIf="isCoreFieldPublished('category')" class="rf-sim-group">
                    <label class="rf-sim-label">Member Category / Tier</label>
                    <select class="rf-sim-input" [(ngModel)]="simulatedCategoryId">
                      <option [ngValue]="null">Standard Member (No Category Tier)</option>
                      <option *ngFor="let cat of categories" [value]="cat.id">{{ cat.name }}</option>
                    </select>
                  </div>

                  <!-- Custom Dynamic Questions -->
                  <div *ngFor="let f of filteredSimFields" class="rf-sim-group">
                    <label class="rf-sim-label">
                      {{ f.label }}
                      <span *ngIf="f.isRequired" class="rf-sim-req">*</span>
                    </label>
                    <input *ngIf="f.fieldType === 'text' || f.fieldType === 'number'"
                           [type]="f.fieldType === 'number' ? 'number' : 'text'"
                           [(ngModel)]="simModel.customAnswers[f.fieldKey]"
                           class="rf-sim-input"
                           [placeholder]="f.placeholder || 'e.g. Enter details'" />
                    <textarea *ngIf="f.fieldType === 'textarea'"
                              class="rf-sim-input rf-sim-textarea"
                              rows="2"
                              [(ngModel)]="simModel.customAnswers[f.fieldKey]"
                              [placeholder]="f.placeholder || 'e.g. Enter notes'"></textarea>
                    <select *ngIf="f.fieldType === 'select'" [(ngModel)]="simModel.customAnswers[f.fieldKey]" class="rf-sim-input">
                      <option value="">{{ f.placeholder || '-- Choose Option --' }}</option>
                      <option *ngFor="let opt of f.options" [value]="opt">{{ opt }}</option>
                    </select>
                    <input *ngIf="f.fieldType === 'date'" type="date" [(ngModel)]="simModel.customAnswers[f.fieldKey]" class="rf-sim-input" />
                    <div *ngIf="f.fieldType === 'file'"
                         class="rf-sim-file-drop"
                         [class.has-file]="simModel.uploadedMockFiles[f.fieldKey]"
                         (click)="simulateFileUpload(f.fieldKey, $event)">
                      <span class="material-symbols-outlined">{{ simModel.uploadedMockFiles[f.fieldKey] ? 'task' : 'cloud_upload' }}</span>
                      <span>{{ simModel.uploadedMockFiles[f.fieldKey] ? ('Uploaded: ' + simModel.uploadedMockFiles[f.fieldKey]) : 'Click to simulate uploading document' }}</span>
                    </div>
                    <label *ngIf="f.fieldType === 'checkbox'" class="rf-sim-checkbox-label">
                      <input type="checkbox" [(ngModel)]="simModel.customAnswers[f.fieldKey]" />
                      <span>{{ f.placeholder || 'I confirm and agree to this policy' }}</span>
                    </label>
                    <span *ngIf="f.helpText" class="rf-sim-help">{{ f.helpText }}</span>
                  </div>

                  <!-- Save & Continue Later Link -->
                  <div *ngIf="policy.allowSaveAndContinue" class="rf-sim-save-continue">
                    <a href="javascript:void(0)" class="rf-save-link" (click)="testSaveDraftSimulation()">
                      <span class="material-symbols-outlined">bookmark</span>
                      <span>Save &amp; Continue Later</span>
                    </a>
                  </div>

                  <!-- Google reCAPTCHA Anti-Bot Protection -->
                  <div class="rf-sim-recaptcha-box">
                    <label class="rf-sim-recaptcha-check" style="cursor: pointer; display: flex; align-items: center; gap: 8px;">
                      <input type="checkbox" [(ngModel)]="simModel.reCaptchaChecked" style="cursor: pointer;" />
                      <span class="material-symbols-outlined rf-recaptcha-shield">verified_user</span>
                      <span style="font-size: 11px; font-weight: 600; color: #334155;">I'm not a robot · Google reCAPTCHA Protected</span>
                    </label>
                  </div>

                  <!-- Single Submit Button -->
                  <button type="button" class="rf-sim-btn rf-sim-btn-finish" (click)="testSubmitSimulation()">
                    <span class="material-symbols-outlined">how_to_reg</span>
                    <span>Register &amp; Join Portal</span>
                  </button>
                </div>

                <!-- SIMULATION LAYOUT 2: SINGLE PAGE + CATEGORY SECTIONS -->
                <div *ngIf="policy.formLayoutMode === 'sections'" class="rf-sim-form rf-sim-sections">
                  <!-- Section 1 Card: Personal Credentials -->
                  <div class="rf-sim-section-box">
                    <div class="rf-sim-sec-title">
                      <span class="material-symbols-outlined">badge</span>
                      <span>1. Personal &amp; Account Credentials</span>
                    </div>

                    <div class="rf-sim-grid-2">
                      <div class="rf-sim-group">
                        <label class="rf-sim-label">First Name *</label>
                        <input type="text" [(ngModel)]="simModel.firstName" class="rf-sim-input" placeholder="e.g. First" />
                      </div>
                      <div class="rf-sim-group">
                        <label class="rf-sim-label">Last Name *</label>
                        <input type="text" [(ngModel)]="simModel.lastName" class="rf-sim-input" placeholder="e.g. Last" />
                      </div>
                    </div>

                    <div class="rf-sim-group">
                      <label class="rf-sim-label">Email Address (Login Username) *</label>
                      <input type="email" [(ngModel)]="simModel.email" class="rf-sim-input" placeholder="name@company.com" />
                    </div>

                    <div *ngIf="policy.requirePassword" class="rf-sim-grid-2">
                      <div class="rf-sim-group">
                        <label class="rf-sim-label">Password *</label>
                        <input type="password" [(ngModel)]="simModel.password" class="rf-sim-input" placeholder="••••••••••••" />
                      </div>
                      <div class="rf-sim-group">
                        <label class="rf-sim-label">Confirm *</label>
                        <input type="password" [(ngModel)]="simModel.confirmPassword" class="rf-sim-input" placeholder="••••••••••••" />
                      </div>
                    </div>

                    <div *ngIf="isCoreFieldPublished('phone')" class="rf-sim-group">
                      <label class="rf-sim-label">Phone Number</label>
                      <input type="text" [(ngModel)]="simModel.phone" class="rf-sim-input" placeholder="e.g. +0 (000) 000-0000" />
                    </div>

                    <div *ngIf="isCoreFieldPublished('category')" class="rf-sim-group">
                      <label class="rf-sim-label">Category Tier</label>
                      <select class="rf-sim-input" [(ngModel)]="simulatedCategoryId">
                        <option [ngValue]="null">Standard Member</option>
                        <option *ngFor="let cat of categories" [value]="cat.id">{{ cat.name }}</option>
                      </select>
                    </div>
                  </div>

                  <!-- Section 2 Card: Custom Business Questions -->
                  <div class="rf-sim-section-box">
                    <div class="rf-sim-sec-title">
                      <span class="material-symbols-outlined">business</span>
                      <span>2. Business &amp; Onboarding Profile</span>
                    </div>

                    <div *ngIf="filteredSimFields.length === 0" style="padding: 10px 0; font-size: 11px; color: #94a3b8;">
                      No custom business questions mapped yet. Add questions in the builder.
                    </div>

                    <div *ngFor="let f of filteredSimFields" class="rf-sim-group">
                      <label class="rf-sim-label">
                        {{ f.label }}
                        <span *ngIf="f.isRequired" class="rf-sim-req">*</span>
                      </label>
                      <input *ngIf="f.fieldType === 'text' || f.fieldType === 'number'"
                             [type]="f.fieldType === 'number' ? 'number' : 'text'"
                             [(ngModel)]="simModel.customAnswers[f.fieldKey]"
                             class="rf-sim-input"
                             [placeholder]="f.placeholder || 'e.g. Enter details'" />
                      <select *ngIf="f.fieldType === 'select'" [(ngModel)]="simModel.customAnswers[f.fieldKey]" class="rf-sim-input">
                        <option value="">{{ f.placeholder || '-- Select --' }}</option>
                        <option *ngFor="let opt of f.options" [value]="opt">{{ opt }}</option>
                      </select>
                      <textarea *ngIf="f.fieldType === 'textarea'" [(ngModel)]="simModel.customAnswers[f.fieldKey]" class="rf-sim-input rf-sim-textarea" rows="2" [placeholder]="f.placeholder || 'e.g. Enter notes'"></textarea>
                      <div *ngIf="f.fieldType === 'file'"
                           class="rf-sim-file-drop"
                           [class.has-file]="simModel.uploadedMockFiles[f.fieldKey]"
                           (click)="simulateFileUpload(f.fieldKey, $event)">
                        <span class="material-symbols-outlined">{{ simModel.uploadedMockFiles[f.fieldKey] ? 'task' : 'cloud_upload' }}</span>
                        <span>{{ simModel.uploadedMockFiles[f.fieldKey] ? ('Uploaded: ' + simModel.uploadedMockFiles[f.fieldKey]) : 'Click to simulate uploading document' }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Save & Continue Later Link -->
                  <div *ngIf="policy.allowSaveAndContinue" class="rf-sim-save-continue">
                    <a href="javascript:void(0)" class="rf-save-link" (click)="testSaveDraftSimulation()">
                      <span class="material-symbols-outlined">bookmark</span>
                      <span>Save &amp; Continue Later</span>
                    </a>
                  </div>

                  <!-- Google reCAPTCHA Anti-Bot Protection -->
                  <div class="rf-sim-recaptcha-box">
                    <label class="rf-sim-recaptcha-check" style="cursor: pointer; display: flex; align-items: center; gap: 8px;">
                      <input type="checkbox" [(ngModel)]="simModel.reCaptchaChecked" style="cursor: pointer;" />
                      <span class="material-symbols-outlined rf-recaptcha-shield">verified_user</span>
                      <span style="font-size: 11px; font-weight: 600; color: #334155;">I'm not a robot · Google reCAPTCHA Protected</span>
                    </label>
                  </div>

                  <button type="button" class="rf-sim-btn rf-sim-btn-finish" (click)="testSubmitSimulation()">
                    <span class="material-symbols-outlined">how_to_reg</span>
                    <span>Register &amp; Join Portal</span>
                  </button>
                </div>

                <!-- SIMULATION LAYOUT 3: STEP-BY-STEP STEPPER WIZARD -->
                <div *ngIf="policy.formLayoutMode === 'stepper'" class="rf-sim-form rf-sim-stepper-view">
                  <!-- Interactive Stepper Track -->
                  <div class="rf-sim-stepper">
                    <div class="rf-sim-step" [class.active]="simStep === 1" (click)="simStep = 1">
                      <span class="step-num">1</span>
                      <span>Account</span>
                    </div>
                    <div class="rf-sim-step-line"></div>
                    <div class="rf-sim-step" [class.active]="simStep === 2" (click)="simStep = 2">
                      <span class="step-num">2</span>
                      <span>Category</span>
                    </div>
                    <div class="rf-sim-step-line" *ngIf="fields.length > 0"></div>
                    <div class="rf-sim-step" *ngIf="fields.length > 0" [class.active]="simStep === 3" (click)="simStep = 3">
                      <span class="step-num">3</span>
                      <span>Details</span>
                    </div>
                    <div class="rf-sim-step-line"></div>
                    <div class="rf-sim-step" [class.active]="simStep === (fields.length > 0 ? 4 : 3)" (click)="simStep = (fields.length > 0 ? 4 : 3)">
                      <span class="step-num">{{ fields.length > 0 ? '4' : '3' }}</span>
                      <span>Verify</span>
                    </div>
                  </div>

                  <!-- Stepper Stage 1: Account -->
                  <div *ngIf="simStep === 1" class="rf-sim-stage">
                    <div class="rf-sim-stage-badge">STAGE 1: ACCOUNT CREDENTIALS</div>
                    <div class="rf-sim-grid-2">
                      <div class="rf-sim-group">
                        <label class="rf-sim-label">First Name *</label>
                        <input type="text" [(ngModel)]="simModel.firstName" class="rf-sim-input" placeholder="e.g. First" />
                      </div>
                      <div class="rf-sim-group">
                        <label class="rf-sim-label">Last Name *</label>
                        <input type="text" [(ngModel)]="simModel.lastName" class="rf-sim-input" placeholder="e.g. Last" />
                      </div>
                    </div>
                    <div class="rf-sim-group">
                      <label class="rf-sim-label">Email Address *</label>
                      <input type="email" [(ngModel)]="simModel.email" class="rf-sim-input" placeholder="name@company.com" />
                    </div>
                    <div *ngIf="policy.requirePassword" class="rf-sim-grid-2">
                      <div class="rf-sim-group">
                        <label class="rf-sim-label">Password *</label>
                        <input type="password" [(ngModel)]="simModel.password" class="rf-sim-input" placeholder="••••••••••••" />
                      </div>
                      <div class="rf-sim-group">
                        <label class="rf-sim-label">Confirm *</label>
                        <input type="password" [(ngModel)]="simModel.confirmPassword" class="rf-sim-input" placeholder="••••••••••••" />
                      </div>
                    </div>
                    <div *ngIf="!policy.requirePassword" class="rf-sim-alert-passwordless">
                      <span class="material-symbols-outlined">magic_button</span>
                      <span>Passwordless: Activation link will be emailed.</span>
                    </div>
                    <button type="button" class="rf-sim-btn" (click)="simStep = 2">
                      <span>Next: Category &amp; Sector</span>
                      <span class="material-symbols-outlined">arrow_forward</span>
                    </button>
                  </div>

                  <!-- Stepper Stage 2: Category & Sector -->
                  <div *ngIf="simStep === 2" class="rf-sim-stage">
                    <div class="rf-sim-stage-badge">STAGE 2: CATEGORY &amp; SECTOR</div>
                    <div class="rf-sim-group">
                      <label class="rf-sim-label">Industry Sector</label>
                      <select class="rf-sim-input" [(ngModel)]="policy.defaultIndustrySector">
                        <option value="">-- Select Industry Sector --</option>
                        <option value="Business & Enterprise">Business & Enterprise</option>
                        <option value="Education & Academy">Education & Academy</option>
                        <option value="Healthcare & Care Services">Healthcare & Care Services</option>
                      </select>
                    </div>
                    <div *ngIf="isCoreFieldPublished('phone')" class="rf-sim-group">
                      <label class="rf-sim-label">Phone Number (Optional)</label>
                      <input type="text" [(ngModel)]="simModel.phone" class="rf-sim-input" placeholder="e.g. +0 (000) 000-0000" />
                    </div>
                    <div *ngIf="isCoreFieldPublished('category')" class="rf-sim-group">
                      <label class="rf-sim-label">Member Category Tier</label>
                      <select class="rf-sim-input" [(ngModel)]="simulatedCategoryId">
                        <option [ngValue]="null">Standard Member</option>
                        <option *ngFor="let cat of categories" [value]="cat.id">{{ cat.name }}</option>
                      </select>
                    </div>
                    <div class="rf-sim-nav-row">
                      <button type="button" class="rf-sim-btn-sub" (click)="simStep = 1">
                        <span class="material-symbols-outlined">arrow_back</span>
                        <span>Back</span>
                      </button>
                      <button type="button" class="rf-sim-btn" (click)="simStep = (fields.length > 0 ? 3 : 4)">
                        <span>{{ fields.length > 0 ? 'Next: Questions' : 'Next: Verify' }}</span>
                        <span class="material-symbols-outlined">arrow_forward</span>
                      </button>
                    </div>
                  </div>

                  <!-- Stepper Stage 3: Custom Details -->
                  <div *ngIf="simStep === 3" class="rf-sim-stage">
                    <div class="rf-sim-stage-badge">STAGE 3: CUSTOM BUSINESS DETAILS</div>
                    <div *ngFor="let f of filteredSimFields" class="rf-sim-group">
                      <label class="rf-sim-label">{{ f.label }} <span *ngIf="f.isRequired" class="rf-sim-req">*</span></label>
                      <input *ngIf="f.fieldType === 'text' || f.fieldType === 'number'" [type]="f.fieldType === 'number' ? 'number' : 'text'" [(ngModel)]="simModel.customAnswers[f.fieldKey]" class="rf-sim-input" [placeholder]="f.placeholder || 'e.g. Enter details'" />
                      <select *ngIf="f.fieldType === 'select'" [(ngModel)]="simModel.customAnswers[f.fieldKey]" class="rf-sim-input">
                        <option value="">{{ f.placeholder || '-- Select --' }}</option>
                        <option *ngFor="let opt of f.options" [value]="opt">{{ opt }}</option>
                      </select>
                      <textarea *ngIf="f.fieldType === 'textarea'" [(ngModel)]="simModel.customAnswers[f.fieldKey]" class="rf-sim-input rf-sim-textarea" rows="2" [placeholder]="f.placeholder || 'e.g. Enter notes'"></textarea>
                      <div *ngIf="f.fieldType === 'file'"
                           class="rf-sim-file-drop"
                           [class.has-file]="simModel.uploadedMockFiles[f.fieldKey]"
                           (click)="simulateFileUpload(f.fieldKey, $event)">
                        <span class="material-symbols-outlined">{{ simModel.uploadedMockFiles[f.fieldKey] ? 'task' : 'cloud_upload' }}</span>
                        <span>{{ simModel.uploadedMockFiles[f.fieldKey] ? ('Uploaded: ' + simModel.uploadedMockFiles[f.fieldKey]) : 'Click to simulate uploading document' }}</span>
                      </div>
                    </div>
                    <div class="rf-sim-nav-row">
                      <button type="button" class="rf-sim-btn-sub" (click)="simStep = 2">
                        <span class="material-symbols-outlined">arrow_back</span>
                        <span>Back</span>
                      </button>
                      <button type="button" class="rf-sim-btn" (click)="simStep = 4">
                        <span>Next: Verify</span>
                        <span class="material-symbols-outlined">arrow_forward</span>
                      </button>
                    </div>
                  </div>

                  <!-- Stepper Stage 4: Finish & Submit -->
                  <div *ngIf="simStep === 4" class="rf-sim-stage">
                    <div class="rf-sim-stage-badge">STAGE 4: VERIFY &amp; FINISH</div>
                    <div class="rf-sim-sum-box">
                      <div style="font-weight: 700; font-size: 11px; margin-bottom: 4px; color: #1e293b;">Application Review</div>
                      <div style="font-size: 11px; color: #475569;">Applicant: <strong>{{ simModel.firstName ? (simModel.firstName + ' ' + simModel.lastName) : 'Jane Doe (Sample)' }}</strong></div>
                      <div style="font-size: 11px; color: #475569;">Email: <strong>{{ simModel.email || 'jane@company.com' }}</strong></div>
                      <div style="font-size: 11px; color: #64748b;">Sector: {{ policy.defaultIndustrySector }}</div>
                      <div style="font-size: 11px; color: #64748b;">Category: {{ getSimCategoryName() }}</div>
                    </div>
                    <div class="rf-sim-recaptcha-box">
                      <label class="rf-sim-recaptcha-check" style="cursor: pointer; display: flex; align-items: center; gap: 8px;">
                        <input type="checkbox" [(ngModel)]="simModel.reCaptchaChecked" style="cursor: pointer;" />
                        <span class="material-symbols-outlined rf-recaptcha-shield">verified_user</span>
                        <span style="font-size: 11px; font-weight: 600; color: #334155;">I'm not a robot (Test Protection)</span>
                      </label>
                      <span style="font-size: 10px; color: #94a3b8;">Bot Defense</span>
                    </div>
                    <div *ngIf="policy.allowSaveAndContinue" class="rf-sim-save-continue">
                      <a href="javascript:void(0)" class="rf-save-link" (click)="testSaveDraftSimulation()">
                        <span class="material-symbols-outlined">bookmark</span>
                        <span>Save Draft &amp; Continue Later</span>
                      </a>
                    </div>
                    <div class="rf-sim-nav-row">
                      <button type="button" class="rf-sim-btn-sub" (click)="simStep = (fields.length > 0 ? 3 : 2)">
                        <span class="material-symbols-outlined">arrow_back</span>
                        <span>Back</span>
                      </button>
                      <button type="button" class="rf-sim-btn rf-sim-btn-finish" (click)="testSubmitSimulation()">
                        <span class="material-symbols-outlined">how_to_reg</span>
                        <span>Submit Application</span>
                      </button>
                    </div>
                  </div>
                </div>

                <!-- SIMULATION LAYOUT 4: PAGE-BY-PAGE MULTI-PAGE FORM -->
                <div *ngIf="policy.formLayoutMode === 'pages'" class="rf-sim-form rf-sim-pages-view">
                  <!-- Page Indicator Header -->
                  <div class="rf-sim-page-header">
                    <div class="rf-sim-page-info">
                      <span class="rf-page-badge">Page {{ simStep }} of 3</span>
                      <strong class="rf-page-title">{{ simStep === 1 ? 'Personal Credentials' : (simStep === 2 ? 'Category & Questions' : 'Compliance & Finish') }}</strong>
                    </div>
                    <div class="rf-sim-page-progress">
                      <div class="rf-sim-progress-bar" [style.width.%]="(simStep / 3) * 100"></div>
                    </div>
                  </div>

                  <!-- Page 1 Content -->
                  <div *ngIf="simStep === 1" class="rf-sim-stage">
                    <div class="rf-sim-grid-2">
                      <div class="rf-sim-group">
                        <label class="rf-sim-label">First Name *</label>
                        <input type="text" [(ngModel)]="simModel.firstName" class="rf-sim-input" placeholder="e.g. First" />
                      </div>
                      <div class="rf-sim-group">
                        <label class="rf-sim-label">Last Name *</label>
                        <input type="text" [(ngModel)]="simModel.lastName" class="rf-sim-input" placeholder="e.g. Last" />
                      </div>
                    </div>
                    <div class="rf-sim-group">
                      <label class="rf-sim-label">Email Address *</label>
                      <input type="email" [(ngModel)]="simModel.email" class="rf-sim-input" placeholder="name@company.com" />
                    </div>
                    <div *ngIf="policy.requirePassword" class="rf-sim-grid-2">
                      <div class="rf-sim-group">
                        <label class="rf-sim-label">Password *</label>
                        <input type="password" [(ngModel)]="simModel.password" class="rf-sim-input" placeholder="••••••••••••" />
                      </div>
                      <div class="rf-sim-group">
                        <label class="rf-sim-label">Confirm *</label>
                        <input type="password" [(ngModel)]="simModel.confirmPassword" class="rf-sim-input" placeholder="••••••••••••" />
                      </div>
                    </div>
                    <div *ngIf="policy.allowSaveAndContinue" class="rf-sim-save-continue">
                      <a href="javascript:void(0)" class="rf-save-link" (click)="testSaveDraftSimulation()">
                        <span class="material-symbols-outlined">bookmark</span>
                        <span>Save &amp; Continue Later</span>
                      </a>
                    </div>
                    <button type="button" class="rf-sim-btn" (click)="simStep = 2">
                      <span>Continue to Page 2</span>
                      <span class="material-symbols-outlined">arrow_forward</span>
                    </button>
                  </div>

                  <!-- Page 2 Content -->
                  <div *ngIf="simStep === 2" class="rf-sim-stage">
                    <div *ngIf="isCoreFieldPublished('phone')" class="rf-sim-group">
                      <label class="rf-sim-label">Phone Number</label>
                      <input type="text" [(ngModel)]="simModel.phone" class="rf-sim-input" placeholder="e.g. +0 (000) 000-0000" />
                    </div>
                    <div *ngIf="isCoreFieldPublished('category')" class="rf-sim-group">
                      <label class="rf-sim-label">Member Category</label>
                      <select class="rf-sim-input" [(ngModel)]="simulatedCategoryId">
                        <option [ngValue]="null">Standard Member</option>
                        <option *ngFor="let cat of categories" [value]="cat.id">{{ cat.name }}</option>
                      </select>
                    </div>
                    <div *ngFor="let f of filteredSimFields" class="rf-sim-group">
                      <label class="rf-sim-label">{{ f.label }} <span *ngIf="f.isRequired" class="rf-sim-req">*</span></label>
                      <input *ngIf="f.fieldType === 'text' || f.fieldType === 'number'" [type]="f.fieldType === 'number' ? 'number' : 'text'" [(ngModel)]="simModel.customAnswers[f.fieldKey]" class="rf-sim-input" [placeholder]="f.placeholder || 'e.g. Details'" />
                      <select *ngIf="f.fieldType === 'select'" [(ngModel)]="simModel.customAnswers[f.fieldKey]" class="rf-sim-input">
                        <option value="">{{ f.placeholder || '-- Select --' }}</option>
                        <option *ngFor="let opt of f.options" [value]="opt">{{ opt }}</option>
                      </select>
                      <textarea *ngIf="f.fieldType === 'textarea'" [(ngModel)]="simModel.customAnswers[f.fieldKey]" class="rf-sim-input rf-sim-textarea" rows="2"></textarea>
                    </div>
                    <div *ngIf="policy.allowSaveAndContinue" class="rf-sim-save-continue">
                      <a href="javascript:void(0)" class="rf-save-link" (click)="testSaveDraftSimulation()">
                        <span class="material-symbols-outlined">bookmark</span>
                        <span>Save &amp; Continue Later</span>
                      </a>
                    </div>
                    <div class="rf-sim-nav-row">
                      <button type="button" class="rf-sim-btn-sub" (click)="simStep = 1">
                        <span class="material-symbols-outlined">arrow_back</span>
                        <span>Previous Page</span>
                      </button>
                      <button type="button" class="rf-sim-btn" (click)="simStep = 3">
                        <span>Continue to Page 3</span>
                        <span class="material-symbols-outlined">arrow_forward</span>
                      </button>
                    </div>
                  </div>

                  <!-- Page 3 Content -->
                  <div *ngIf="simStep === 3" class="rf-sim-stage">
                    <div class="rf-sim-sum-box">
                      <div style="font-weight: 700; font-size: 11px; margin-bottom: 4px; color: #1e293b;">Final Submission Checklist</div>
                      <div style="font-size: 11px; color: #475569;">Applicant: <strong>{{ simModel.firstName ? (simModel.firstName + ' ' + simModel.lastName) : 'Jane Doe (Sample)' }}</strong></div>
                      <div style="font-size: 11px; color: #475569;">Email: <strong>{{ simModel.email || 'jane@company.com' }}</strong></div>
                      <div style="font-size: 11px; color: #64748b;">Ready for submission verification.</div>
                    </div>
                    <div class="rf-sim-recaptcha-box">
                      <label class="rf-sim-recaptcha-check" style="cursor: pointer; display: flex; align-items: center; gap: 8px;">
                        <input type="checkbox" [(ngModel)]="simModel.reCaptchaChecked" style="cursor: pointer;" />
                        <span class="material-symbols-outlined rf-recaptcha-shield">verified_user</span>
                        <span style="font-size: 11px; font-weight: 600; color: #334155;">Google reCAPTCHA Protected</span>
                      </label>
                    </div>
                    <div class="rf-sim-nav-row">
                      <button type="button" class="rf-sim-btn-sub" (click)="simStep = 2">
                        <span class="material-symbols-outlined">arrow_back</span>
                        <span>Previous Page</span>
                      </button>
                      <button type="button" class="rf-sim-btn rf-sim-btn-finish" (click)="testSubmitSimulation()">
                        <span class="material-symbols-outlined">how_to_reg</span>
                        <span>Submit Application</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </ng-template>
          </div>
        </div>
      </div>
    </div>

      <!-- =============================================================== -->
      <!-- MODAL 1: CREATE / EDIT QUESTION DRAWER WITH VALIDATION RULES     -->
      <!-- =============================================================== -->
      <div *ngIf="showModal" class="rf-modal-overlay" (click)="closeModal()">
        <div class="rf-modal-card" (click)="$event.stopPropagation()">
          <div class="rf-modal-head">
            <div class="rf-modal-title-wrap">
              <span class="material-symbols-outlined rf-modal-icon">{{ editingFieldId ? 'edit' : 'add_circle' }}</span>
              <div>
                <h3 class="rf-modal-title">{{ editingFieldId ? 'Edit Onboarding Question &amp; Validation' : 'Add Custom Onboarding Question' }}</h3>
                <p class="rf-modal-sub">Define the prompt, input type, assigned category/step, and strict validation rules.</p>
              </div>
            </div>
            <button type="button" class="rf-modal-close" (click)="closeModal()">×</button>
          </div>

          <div class="rf-modal-body">
            <div class="rf-form-group">
              <label class="rf-form-label">QUESTION / FIELD LABEL *</label>
              <input type="text" [(ngModel)]="modalField.label" (input)="onLabelChange()" class="rf-input" placeholder="e.g. Matriculation / Student ID" />
            </div>

            <div class="rf-form-grid-2">
              <div class="rf-form-group">
                <label class="rf-form-label">FIELD KEY (ALPHANUMERIC SLUG)</label>
                <input type="text" [(ngModel)]="modalField.fieldKey" class="rf-input rf-code-input" placeholder="e.g. student_id" />
                <span class="rf-input-hint">Used as internal profile attribute JSON key</span>
              </div>

              <div class="rf-form-group">
                <label class="rf-form-label">INPUT CONTROL TYPE *</label>
                <select [(ngModel)]="modalField.fieldType" class="rf-select">
                  <option value="text">Short Text (e.g. Student ID, License No)</option>
                  <option value="number">Number (e.g. Graduation Year, Age)</option>
                  <option value="select">Dropdown Select (Predefined Options)</option>
                  <option value="date">Date Picker (e.g. Admission Date)</option>
                  <option value="textarea">Multiline Text (e.g. Bio, Background)</option>
                  <option value="file">File / Photo Upload (e.g. ID Card, Certificate)</option>
                  <option value="checkbox">Single Checkbox (e.g. Terms Agreement)</option>
                </select>
              </div>
            </div>

            <div class="rf-form-grid-2">
              <div class="rf-form-group">
                <label class="rf-form-label">PLACEHOLDER TEXT</label>
                <input type="text" [(ngModel)]="modalField.placeholder" class="rf-input" placeholder="e.g. e.g. STU-2026-0042" />
              </div>

              <div class="rf-form-group">
                <label class="rf-form-label">ASSIGNED CATEGORY TIER</label>
                <select [(ngModel)]="modalField.bcpUserCategoryId" class="rf-select">
                  <option [ngValue]="null">Applies to All Categories (Global)</option>
                  <option *ngFor="let cat of categories" [value]="cat.id">{{ cat.name }} Only</option>
                </select>
              </div>
            </div>

            <!-- Dynamic Dropdown Options Manager (if type == 'select') -->
            <div *ngIf="modalField.fieldType === 'select'" class="rf-options-box">
              <label class="rf-form-label">DROPDOWN OPTIONS</label>
              <div class="rf-opts-add-row">
                <input type="text" [(ngModel)]="newOptionText" (keydown.enter)="addOption()" class="rf-input" placeholder="e.g. Computer Science" />
                <button type="button" class="rf-btn rf-btn-sm rf-btn-primary" (click)="addOption()">Add Option</button>
              </div>
              <div class="rf-opts-pills" *ngIf="modalField.options.length > 0">
                <div *ngFor="let opt of modalField.options; let optIdx = index" class="rf-opt-pill">
                  <span>{{ opt }}</span>
                  <button type="button" class="rf-opt-remove" (click)="removeOption(optIdx)">×</button>
                </div>
              </div>
            </div>

            <!-- ========================================================= -->
            <!-- VALIDATION RULES PANEL (Required, Min/Max, Regex, Error)   -->
            <!-- ========================================================= -->
            <div class="rf-validation-box">
              <div class="rf-val-header">
                <span class="material-symbols-outlined text-indigo">rule</span>
                <span class="rf-val-title">VALIDATION RULES &amp; CONSTRAINTS</span>
              </div>

              <div class="rf-form-grid-2">
                <div class="rf-form-group">
                  <label class="rf-form-label">MIN LENGTH / VALUE</label>
                  <input type="number" [(ngModel)]="modalField.minLength" class="rf-input" placeholder="e.g. 3" />
                </div>
                <div class="rf-form-group">
                  <label class="rf-form-label">MAX LENGTH / VALUE</label>
                  <input type="number" [(ngModel)]="modalField.maxLength" class="rf-input" placeholder="e.g. 50" />
                </div>
              </div>

              <div class="rf-form-group" style="margin-top: 8px;">
                <label class="rf-form-label">REGEX PATTERN (OPTIONAL)</label>
                <input type="text" [(ngModel)]="modalField.patternRegex" class="rf-input rf-code-input" placeholder="e.g. ^[A-Z]{3}-[0-9]{4}$" />
                <span class="rf-input-hint">Ensures exact format for national IDs, license plates, or codes</span>
              </div>

              <div class="rf-form-group" style="margin-top: 8px;">
                <label class="rf-form-label">CUSTOM VALIDATION ERROR MESSAGE</label>
                <input type="text" [(ngModel)]="modalField.customErrorMessage" class="rf-input" placeholder="e.g. Please enter a valid Student ID format (e.g. STU-2026-0042)" />
              </div>
            </div>

            <div class="rf-form-group">
              <label class="rf-form-label">HELPER GUIDANCE / PRIVACY TEXT (OPTIONAL)</label>
              <input type="text" [(ngModel)]="modalField.helpText" class="rf-input" placeholder="e.g. Enter your official institutional registration code." />
            </div>

            <div class="rf-toggles-row">
              <label class="rf-check-box">
                <input type="checkbox" [(ngModel)]="modalField.isRequired" />
                <span>Mark as Required Field</span>
              </label>
              <label class="rf-check-box">
                <input type="checkbox" [(ngModel)]="modalField.showInWorkspaceProfile" />
                <span>Show on Member's Profile</span>
              </label>
              <label class="rf-check-box">
                <input type="checkbox" [(ngModel)]="modalField.isActive" />
                <span>Active on Public Form</span>
              </label>
            </div>
          </div>

          <div class="rf-modal-footer">
            <button type="button" class="rf-btn rf-btn-outline" (click)="closeModal()">Cancel</button>
            <button type="button" class="rf-btn rf-btn-primary" (click)="saveField()" [disabled]="savingField">
              <span class="material-symbols-outlined">{{ savingField ? 'hourglass_top' : 'check_circle' }}</span>
              <span>{{ savingField ? 'Saving Question...' : (editingFieldId ? 'Update Question' : 'Save Question') }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- =============================================================== -->
      <!-- MODAL 2: INDUSTRY TEMPLATE PREVIEW MODAL (80% SPLIT SCREEN)     -->
      <!-- =============================================================== -->
      <div *ngIf="showTemplateModal && selectedTemplate" class="rf-modal-overlay" (click)="closeTemplateModal()">
        <div class="rf-modal-card rf-tpl-modal" (click)="$event.stopPropagation()">
          
          <!-- Modal Header -->
          <div class="rf-modal-head rf-tpl-head-bar">
            <div class="rf-modal-title-wrap">
              <div class="rf-tpl-icon" [style.background]="selectedTemplate.bgColor" [style.color]="selectedTemplate.color">
                <span class="material-symbols-outlined">{{ selectedTemplate.icon }}</span>
              </div>
              <div>
                <div class="rf-tpl-modal-headline">
                  <h3 class="rf-modal-title">{{ selectedTemplate.name }} Archetype</h3>
                  <span class="rf-badge-layout-tag" [class]="'tag-' + selectedTemplate.layoutMode">
                    <span class="material-symbols-outlined">auto_awesome</span>
                    <span>Optimized: {{ selectedTemplate.layoutName }}</span>
                  </span>
                </div>
                <p class="rf-modal-sub">{{ selectedTemplate.description }}</p>
              </div>
            </div>
            <button type="button" class="rf-modal-close" (click)="closeTemplateModal()">×</button>
          </div>

          <!-- 2-Column Split Body (80% Screen Width) -->
          <div class="rf-tpl-split-body">
            
            <!-- LEFT COLUMN: Template Breakdown, Questions & Application Rules -->
            <div class="rf-tpl-col-sidebar">
              
              <!-- Recommended Layout Reason Card -->
              <div class="rf-tpl-strategy-box">
                <div class="rf-tpl-strat-head">
                  <span class="material-symbols-outlined text-indigo">design_services</span>
                  <strong>RECOMMENDED FLOW STRATEGY</strong>
                </div>
                <div class="rf-tpl-strat-title">{{ selectedTemplate.layoutName }}</div>
                <p class="rf-tpl-strat-desc">{{ selectedTemplate.layoutReason }}</p>
              </div>

              <!-- Included Questions List -->
              <div class="rf-tpl-questions-list">
                <div class="rf-tpl-q-head">
                  <span>INCLUDED ONBOARDING QUESTIONS ({{ selectedTemplate.sampleQuestions.length }})</span>
                </div>
                <div class="rf-tpl-q-item" *ngFor="let q of selectedTemplate.sampleQuestions; let qi = index">
                  <div class="rf-tpl-q-num">{{ qi + 1 }}</div>
                  <div class="rf-tpl-q-text">
                    <div class="rf-tpl-q-title">
                      <span>{{ q.label }}</span>
                      <span class="rf-tpl-req" *ngIf="q.required">Required</span>
                    </div>
                    <span class="rf-tpl-type-pill">{{ getFieldTypeLabel(q.type) }}</span>
                  </div>
                </div>
              </div>

              <!-- Application Mode Options -->
              <div class="rf-tpl-mode-box">
                <label class="rf-tpl-mode-label">APPLICATION STRATEGY</label>
                <div class="rf-tpl-modes">
                  <label class="rf-radio-card" [class.selected]="applyTemplateMode === 'replace'">
                    <input type="radio" [(ngModel)]="applyTemplateMode" value="replace" name="applyMode" />
                    <div>
                      <strong>Replace Current</strong>
                      <p>Clears existing questions and applies this fresh sector archetype.</p>
                    </div>
                  </label>
                  <label class="rf-radio-card" [class.selected]="applyTemplateMode === 'append'">
                    <input type="radio" [(ngModel)]="applyTemplateMode" value="append" name="applyMode" />
                    <div>
                      <strong>Append to Existing</strong>
                      <p>Adds these sector questions after your current onboarding fields.</p>
                    </div>
                  </label>
                </div>
              </div>

              <!-- Layout Synchronization Toggle -->
              <div class="rf-tpl-sync-toggle">
                <label class="rf-check-box">
                  <input type="checkbox" [(ngModel)]="applyTemplateLayout" />
                  <span>Also switch form layout to <strong>{{ selectedTemplate.layoutName }}</strong> (Recommended)</span>
                </label>
              </div>

              <!-- Sidebar Actions -->
              <div class="rf-tpl-sidebar-actions">
                <button type="button" class="rf-btn rf-btn-primary rf-btn-apply-full" (click)="applyIndustryTemplate()" [disabled]="applyingTemplate">
                  <span class="material-symbols-outlined">{{ applyingTemplate ? 'hourglass_top' : 'bolt' }}</span>
                  <span>{{ applyingTemplate ? 'Applying Archetype...' : 'Apply ' + selectedTemplate.name + ' Template' }}</span>
                </button>
                <button type="button" class="rf-btn rf-btn-outline" (click)="closeTemplateModal()">Cancel</button>
              </div>
            </div>

            <!-- RIGHT COLUMN: REALISTIC FORM PREVIEW (WHAT USERS WILL SEE) -->
            <div class="rf-tpl-col-preview">
              <div class="rf-tpl-canvas-bar">
                <div class="rf-tpl-canvas-left">
                  <span class="rf-pulse-dot"></span>
                  <span>LIVE FORM EXPERIENCE PREVIEW</span>
                  <span class="rf-tpl-canvas-mode-pill">{{ selectedTemplate.layoutName }}</span>
                </div>
                <div class="rf-tpl-canvas-actions">
                  <button type="button" class="rf-btn-tpl-autofill" (click)="autoFillTplTest()" title="Auto-fill preview with realistic sample answers">
                    <span class="material-symbols-outlined">magic_button</span>
                    <span>Auto-Fill Sample</span>
                  </button>
                  <button type="button" class="rf-btn-tpl-reset" (click)="resetTplTest()" title="Reset preview">
                    <span class="material-symbols-outlined">restart_alt</span>
                    <span>Reset</span>
                  </button>
                </div>
              </div>

              <!-- REAL FORM CARD CONTAINER -->
              <div class="rf-tpl-canvas-scroll">
                <div class="rf-tpl-live-card">
                  
                  <!-- Form Card Header -->
                  <div class="rf-tpl-card-head">
                    <div class="rf-tpl-card-avatar" [style.background]="selectedTemplate.bgColor" [style.color]="selectedTemplate.color">
                      <span class="material-symbols-outlined">{{ selectedTemplate.icon }}</span>
                    </div>
                    <h3 class="rf-tpl-card-title">Create Your Account</h3>
                    <p class="rf-tpl-card-sub">{{ policy.registrationWelcomeMessage || 'Join our member directory and workspace portal.' }}</p>
                  </div>

                  <!-- Simulated Test Success Card -->
                  <div *ngIf="tplTestSubmitted" class="rf-sim-success-card">
                    <div class="rf-sim-success-avatar">
                      <span class="material-symbols-outlined">task_alt</span>
                    </div>
                    <h3 class="rf-sim-success-title">Registration Successful!</h3>
                    <p class="rf-sim-success-sub">{{ policy.registrationSuccessMessage || 'Registration successful! Welcome to the portal.' }}</p>
                    
                    <div class="rf-sim-success-box">
                      <div class="rf-sim-success-badge">SIMULATION TEST CAPTURED</div>
                      <div class="rf-sim-success-row">
                        <span class="lbl">Applicant Name</span>
                        <strong class="val">{{ tplTestModel.firstName }} {{ tplTestModel.lastName }}</strong>
                      </div>
                      <div class="rf-sim-success-row">
                        <span class="lbl">Email Account</span>
                        <strong class="val">{{ tplTestModel.email }}</strong>
                      </div>
                      <div class="rf-sim-success-row">
                        <span class="lbl">Sector Archetype</span>
                        <strong class="val">{{ selectedTemplate.name }}</strong>
                      </div>
                      <div class="rf-sim-success-row">
                        <span class="lbl">Applied Flow</span>
                        <span class="rf-badge-layout-tag" [class]="'tag-' + selectedTemplate.layoutMode">{{ selectedTemplate.layoutName }}</span>
                      </div>
                    </div>

                    <button type="button" class="rf-sim-btn rf-sim-btn-reset" (click)="resetTplTest()" style="margin-top: 24px;">
                      <span class="material-symbols-outlined">restart_alt</span>
                      <span>Test Another Scenario</span>
                    </button>
                  </div>

                  <!-- ======================================================= -->
                  <!-- PREVIEW ARCHETYPE 1: SINGLE PAGE FORM                   -->
                  <!-- ======================================================= -->
                  <div *ngIf="!tplTestSubmitted && selectedTemplate.layoutMode === 'single'" class="rf-tpl-form-flow">
                    <div class="rf-tpl-stage-indicator">SINGLE PAGE VELOCITY ONBOARDING</div>
                    
                    <div class="rf-sim-grid-2">
                      <div class="rf-sim-group">
                        <label class="rf-sim-label">First Name *</label>
                        <input type="text" [(ngModel)]="tplTestModel.firstName" class="rf-sim-input" placeholder="e.g. First" />
                      </div>
                      <div class="rf-sim-group">
                        <label class="rf-sim-label">Last Name *</label>
                        <input type="text" [(ngModel)]="tplTestModel.lastName" class="rf-sim-input" placeholder="e.g. Last" />
                      </div>
                    </div>

                    <div class="rf-sim-group">
                      <label class="rf-sim-label">Email Address (Login Username) *</label>
                      <input type="email" [(ngModel)]="tplTestModel.email" class="rf-sim-input" placeholder="name@company.com" />
                    </div>

                    <div class="rf-sim-grid-2">
                      <div class="rf-sim-group">
                        <label class="rf-sim-label">Password *</label>
                        <input type="password" [(ngModel)]="tplTestModel.password" class="rf-sim-input" placeholder="••••••••••••" />
                      </div>
                      <div class="rf-sim-group">
                        <label class="rf-sim-label">Confirm *</label>
                        <input type="password" [(ngModel)]="tplTestModel.confirmPassword" class="rf-sim-input" placeholder="••••••••••••" />
                      </div>
                    </div>

                    <!-- Template Questions -->
                    <div *ngFor="let q of selectedTemplate.sampleQuestions" class="rf-sim-group">
                      <label class="rf-sim-label">
                        {{ q.label }} <span *ngIf="q.required" class="rf-sim-req">*</span>
                      </label>
                      <input *ngIf="q.type === 'text' || q.type === 'number'" [type]="q.type === 'number' ? 'number' : 'text'" [(ngModel)]="tplTestModel.answers[q.label]" class="rf-sim-input" [placeholder]="q.placeholder || 'e.g. Enter details'" />
                      <select *ngIf="q.type === 'select'" [(ngModel)]="tplTestModel.answers[q.label]" class="rf-sim-input">
                        <option value="">{{ q.placeholder || '-- Select Option --' }}</option>
                        <option *ngFor="let opt of (q.options || ['Standard Tier', 'Executive', 'Enterprise'])" [value]="opt">{{ opt }}</option>
                      </select>
                      <textarea *ngIf="q.type === 'textarea'" [(ngModel)]="tplTestModel.answers[q.label]" class="rf-sim-input rf-sim-textarea" rows="2" [placeholder]="q.placeholder || 'e.g. Additional information...'"></textarea>
                      <label *ngIf="q.type === 'checkbox'" class="rf-sim-checkbox-label">
                        <input type="checkbox" [(ngModel)]="tplTestModel.answers[q.label]" />
                        <span>{{ q.label }}</span>
                      </label>
                    </div>

                    <button type="button" class="rf-sim-btn rf-sim-btn-finish" style="margin-top: 24px;" (click)="simulateTplSubmit()">
                      <span class="material-symbols-outlined">how_to_reg</span>
                      <span>Register &amp; Join Portal</span>
                    </button>
                  </div>

                  <!-- ======================================================= -->
                  <!-- PREVIEW ARCHETYPE 2: SINGLE PAGE + CATEGORY SECTIONS    -->
                  <!-- ======================================================= -->
                  <div *ngIf="!tplTestSubmitted && selectedTemplate.layoutMode === 'sections'" class="rf-tpl-form-flow">
                    <!-- Section 1 Card -->
                    <div class="rf-sim-section-box">
                      <div class="rf-sim-sec-title">
                        <span class="material-symbols-outlined">badge</span>
                        <span>1. Personal &amp; Account Credentials</span>
                      </div>
                      <div class="rf-sim-grid-2">
                        <div class="rf-sim-group">
                          <label class="rf-sim-label">First Name *</label>
                          <input type="text" [(ngModel)]="tplTestModel.firstName" class="rf-sim-input" placeholder="e.g. First" />
                        </div>
                        <div class="rf-sim-group">
                          <label class="rf-sim-label">Last Name *</label>
                          <input type="text" [(ngModel)]="tplTestModel.lastName" class="rf-sim-input" placeholder="e.g. Last" />
                        </div>
                      </div>
                      <div class="rf-sim-group">
                        <label class="rf-sim-label">Email Address *</label>
                        <input type="email" [(ngModel)]="tplTestModel.email" class="rf-sim-input" placeholder="name@company.com" />
                      </div>
                      <div class="rf-sim-grid-2">
                        <div class="rf-sim-group">
                          <label class="rf-sim-label">Password *</label>
                          <input type="password" [(ngModel)]="tplTestModel.password" class="rf-sim-input" placeholder="••••••••••••" />
                        </div>
                        <div class="rf-sim-group">
                          <label class="rf-sim-label">Confirm *</label>
                          <input type="password" [(ngModel)]="tplTestModel.confirmPassword" class="rf-sim-input" placeholder="••••••••••••" />
                        </div>
                      </div>
                    </div>

                    <!-- Section 2 Card -->
                    <div class="rf-sim-section-box">
                      <div class="rf-sim-sec-title">
                        <span class="material-symbols-outlined">{{ selectedTemplate.icon }}</span>
                        <span>2. {{ selectedTemplate.name }} Profile</span>
                      </div>
                      <div *ngFor="let q of selectedTemplate.sampleQuestions" class="rf-sim-group">
                        <label class="rf-sim-label">
                          {{ q.label }} <span *ngIf="q.required" class="rf-sim-req">*</span>
                        </label>
                        <input *ngIf="q.type === 'text' || q.type === 'number'" [type]="q.type === 'number' ? 'number' : 'text'" [(ngModel)]="tplTestModel.answers[q.label]" class="rf-sim-input" [placeholder]="q.placeholder || 'e.g. Enter details'" />
                        <select *ngIf="q.type === 'select'" [(ngModel)]="tplTestModel.answers[q.label]" class="rf-sim-input">
                          <option value="">{{ q.placeholder || '-- Select Option --' }}</option>
                          <option *ngFor="let opt of (q.options || ['Standard Tier', 'Executive', 'Enterprise'])" [value]="opt">{{ opt }}</option>
                        </select>
                        <textarea *ngIf="q.type === 'textarea'" [(ngModel)]="tplTestModel.answers[q.label]" class="rf-sim-input rf-sim-textarea" rows="2" [placeholder]="q.placeholder || 'e.g. Enter notes...'"></textarea>
                        <label *ngIf="q.type === 'checkbox'" class="rf-sim-checkbox-label">
                          <input type="checkbox" [(ngModel)]="tplTestModel.answers[q.label]" />
                          <span>{{ q.label }}</span>
                        </label>
                      </div>
                    </div>

                    <button type="button" class="rf-sim-btn rf-sim-btn-finish" style="margin-top: 24px;" (click)="simulateTplSubmit()">
                      <span class="material-symbols-outlined">how_to_reg</span>
                      <span>Register &amp; Join Portal</span>
                    </button>
                  </div>

                  <!-- ======================================================= -->
                  <!-- PREVIEW ARCHETYPE 3: STEP-BY-STEP STEPPER WIZARD        -->
                  <!-- ======================================================= -->
                  <div *ngIf="!tplTestSubmitted && selectedTemplate.layoutMode === 'stepper'" class="rf-tpl-form-flow">
                    <!-- Interactive Stepper Track -->
                    <div class="rf-sim-stepper">
                      <div class="rf-sim-step" [class.active]="tplPreviewStep === 1" (click)="tplPreviewStep = 1">
                        <span class="step-num">1</span>
                        <span>Account</span>
                      </div>
                      <div class="rf-sim-step-line"></div>
                      <div class="rf-sim-step" [class.active]="tplPreviewStep === 2" (click)="tplPreviewStep = 2">
                        <span class="step-num">2</span>
                        <span>{{ selectedTemplate.name.split(' ')[0] }}</span>
                      </div>
                      <div class="rf-sim-step-line"></div>
                      <div class="rf-sim-step" [class.active]="tplPreviewStep === 3" (click)="tplPreviewStep = 3">
                        <span class="step-num">3</span>
                        <span>Verify</span>
                      </div>
                    </div>

                    <!-- Step 1: Account -->
                    <div *ngIf="tplPreviewStep === 1" class="rf-sim-stage">
                      <div class="rf-sim-stage-badge">STAGE 1: ACCOUNT CREDENTIALS</div>
                      <div class="rf-sim-grid-2">
                        <div class="rf-sim-group">
                          <label class="rf-sim-label">First Name *</label>
                          <input type="text" [(ngModel)]="tplTestModel.firstName" class="rf-sim-input" placeholder="e.g. First" />
                        </div>
                        <div class="rf-sim-group">
                          <label class="rf-sim-label">Last Name *</label>
                          <input type="text" [(ngModel)]="tplTestModel.lastName" class="rf-sim-input" placeholder="e.g. Last" />
                        </div>
                      </div>
                      <div class="rf-sim-group">
                        <label class="rf-sim-label">Email Address *</label>
                        <input type="email" [(ngModel)]="tplTestModel.email" class="rf-sim-input" placeholder="name@company.com" />
                      </div>
                      <div class="rf-sim-grid-2">
                        <div class="rf-sim-group">
                          <label class="rf-sim-label">Password *</label>
                          <input type="password" [(ngModel)]="tplTestModel.password" class="rf-sim-input" placeholder="••••••••••••" />
                        </div>
                        <div class="rf-sim-group">
                          <label class="rf-sim-label">Confirm *</label>
                          <input type="password" [(ngModel)]="tplTestModel.confirmPassword" class="rf-sim-input" placeholder="••••••••••••" />
                        </div>
                      </div>
                      <button type="button" class="rf-sim-btn" style="margin-top: 24px;" (click)="tplPreviewStep = 2">
                        <span>Next: {{ selectedTemplate.name.split(' ')[0] }} Details</span>
                        <span class="material-symbols-outlined">arrow_forward</span>
                      </button>
                    </div>

                    <!-- Step 2: Sector Questions -->
                    <div *ngIf="tplPreviewStep === 2" class="rf-sim-stage">
                      <div class="rf-sim-stage-badge">STAGE 2: {{ selectedTemplate.name.toUpperCase() }} ATTRIBUTES</div>
                      <div *ngFor="let q of selectedTemplate.sampleQuestions" class="rf-sim-group">
                        <label class="rf-sim-label">{{ q.label }} <span *ngIf="q.required" class="rf-sim-req">*</span></label>
                        <input *ngIf="q.type === 'text' || q.type === 'number'" [type]="q.type === 'number' ? 'number' : 'text'" [(ngModel)]="tplTestModel.answers[q.label]" class="rf-sim-input" [placeholder]="q.placeholder || 'e.g. Details'" />
                        <select *ngIf="q.type === 'select'" [(ngModel)]="tplTestModel.answers[q.label]" class="rf-sim-input">
                          <option value="">{{ q.placeholder || '-- Select Option --' }}</option>
                          <option *ngFor="let opt of (q.options || ['Undergraduate', 'Postgraduate', 'Faculty Staff'])" [value]="opt">{{ opt }}</option>
                        </select>
                        <textarea *ngIf="q.type === 'textarea'" [(ngModel)]="tplTestModel.answers[q.label]" class="rf-sim-input rf-sim-textarea" rows="2" [placeholder]="q.placeholder || 'e.g. Additional details'"></textarea>
                        <label *ngIf="q.type === 'checkbox'" class="rf-sim-checkbox-label">
                          <input type="checkbox" [(ngModel)]="tplTestModel.answers[q.label]" />
                          <span>{{ q.label }}</span>
                        </label>
                      </div>
                      <div class="rf-sim-nav-row" style="margin-top: 24px;">
                        <button type="button" class="rf-sim-btn-sub" (click)="tplPreviewStep = 1">
                          <span class="material-symbols-outlined">arrow_back</span>
                          <span>Back</span>
                        </button>
                        <button type="button" class="rf-sim-btn" (click)="tplPreviewStep = 3">
                          <span>Next: Verify &amp; Finish</span>
                          <span class="material-symbols-outlined">arrow_forward</span>
                        </button>
                      </div>
                    </div>

                    <!-- Step 3: Verify -->
                    <div *ngIf="tplPreviewStep === 3" class="rf-sim-stage">
                      <div class="rf-sim-stage-badge">STAGE 3: APPLICATION VERIFICATION</div>
                      <div class="rf-sim-sum-box">
                        <div style="font-weight: 700; font-size: 11px; margin-bottom: 4px; color: #1e293b;">Application Summary</div>
                        <div style="font-size: 11px; color: #475569;">Applicant: <strong>{{ tplTestModel.firstName }} {{ tplTestModel.lastName }}</strong></div>
                        <div style="font-size: 11px; color: #475569;">Email: <strong>{{ tplTestModel.email }}</strong></div>
                        <div style="font-size: 11px; color: #64748b;">Archetype: {{ selectedTemplate.name }} ({{ selectedTemplate.sampleQuestions.length }} fields configured)</div>
                      </div>
                      <div class="rf-sim-nav-row" style="margin-top: 24px;">
                        <button type="button" class="rf-sim-btn-sub" (click)="tplPreviewStep = 2">
                          <span class="material-symbols-outlined">arrow_back</span>
                          <span>Back</span>
                        </button>
                        <button type="button" class="rf-sim-btn rf-sim-btn-finish" (click)="simulateTplSubmit()">
                          <span class="material-symbols-outlined">how_to_reg</span>
                          <span>Submit Application</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <!-- ======================================================= -->
                  <!-- PREVIEW ARCHETYPE 4: PAGE-BY-PAGE MULTI-PAGE FORM       -->
                  <!-- ======================================================= -->
                  <div *ngIf="!tplTestSubmitted && selectedTemplate.layoutMode === 'pages'" class="rf-tpl-form-flow">
                    <div class="rf-sim-page-header">
                      <div class="rf-sim-page-info">
                        <span class="rf-page-badge">Page {{ tplPreviewStep }} of 2</span>
                        <strong class="rf-page-title">{{ tplPreviewStep === 1 ? 'Personal Account Credentials' : selectedTemplate.name + ' Verification' }}</strong>
                      </div>
                      <div class="rf-sim-page-progress">
                        <div class="rf-sim-progress-bar" [style.width.%]="(tplPreviewStep / 2) * 100"></div>
                      </div>
                    </div>

                    <!-- Page 1 -->
                    <div *ngIf="tplPreviewStep === 1" class="rf-sim-stage">
                      <div class="rf-sim-grid-2">
                        <div class="rf-sim-group">
                          <label class="rf-sim-label">First Name *</label>
                          <input type="text" [(ngModel)]="tplTestModel.firstName" class="rf-sim-input" placeholder="e.g. First" />
                        </div>
                        <div class="rf-sim-group">
                          <label class="rf-sim-label">Last Name *</label>
                          <input type="text" [(ngModel)]="tplTestModel.lastName" class="rf-sim-input" placeholder="e.g. Last" />
                        </div>
                      </div>
                      <div class="rf-sim-group">
                        <label class="rf-sim-label">Email Address *</label>
                        <input type="email" [(ngModel)]="tplTestModel.email" class="rf-sim-input" placeholder="name@company.com" />
                      </div>
                      <div class="rf-sim-grid-2">
                        <div class="rf-sim-group">
                          <label class="rf-sim-label">Password *</label>
                          <input type="password" [(ngModel)]="tplTestModel.password" class="rf-sim-input" placeholder="••••••••••••" />
                        </div>
                        <div class="rf-sim-group">
                          <label class="rf-sim-label">Confirm *</label>
                          <input type="password" [(ngModel)]="tplTestModel.confirmPassword" class="rf-sim-input" placeholder="••••••••••••" />
                        </div>
                      </div>
                      <button type="button" class="rf-sim-btn" style="margin-top: 24px;" (click)="tplPreviewStep = 2">
                        <span>Continue to Page 2</span>
                        <span class="material-symbols-outlined">arrow_forward</span>
                      </button>
                    </div>

                    <!-- Page 2 -->
                    <div *ngIf="tplPreviewStep === 2" class="rf-sim-stage">
                      <div *ngFor="let q of selectedTemplate.sampleQuestions" class="rf-sim-group">
                        <label class="rf-sim-label">{{ q.label }} <span *ngIf="q.required" class="rf-sim-req">*</span></label>
                        <input *ngIf="q.type === 'text' || q.type === 'number'" [type]="q.type === 'number' ? 'number' : 'text'" [(ngModel)]="tplTestModel.answers[q.label]" class="rf-sim-input" [placeholder]="q.placeholder || 'e.g. Details'" />
                        <select *ngIf="q.type === 'select'" [(ngModel)]="tplTestModel.answers[q.label]" class="rf-sim-input">
                          <option value="">{{ q.placeholder || '-- Select --' }}</option>
                          <option *ngFor="let opt of (q.options || ['Option A', 'Option B', 'Option C'])" [value]="opt">{{ opt }}</option>
                        </select>
                        <textarea *ngIf="q.type === 'textarea'" [(ngModel)]="tplTestModel.answers[q.label]" class="rf-sim-input rf-sim-textarea" rows="2" [placeholder]="q.placeholder || 'Enter notes...'"></textarea>
                        <label *ngIf="q.type === 'checkbox'" class="rf-sim-checkbox-label">
                          <input type="checkbox" [(ngModel)]="tplTestModel.answers[q.label]" />
                          <span>{{ q.label }}</span>
                        </label>
                      </div>
                      <div class="rf-sim-nav-row" style="margin-top: 24px;">
                        <button type="button" class="rf-sim-btn-sub" (click)="tplPreviewStep = 1">
                          <span class="material-symbols-outlined">arrow_back</span>
                          <span>Previous Page</span>
                        </button>
                        <button type="button" class="rf-sim-btn rf-sim-btn-finish" (click)="simulateTplSubmit()">
                          <span class="material-symbols-outlined">how_to_reg</span>
                          <span>Submit Application</span>
                        </button>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      <!-- =============================================================== -->
      <!-- MODAL 3: WIREFRAME SAMPLE MODAL WITH 1-CLICK APPLY BUTTON      -->
      <!-- =============================================================== -->
      <div *ngIf="showLayoutModal" class="rf-modal-overlay" (click)="closeLayoutModal()">
        <div class="rf-modal-card rf-sample-modal" (click)="$event.stopPropagation()">
          <div class="rf-modal-head">
            <div class="rf-modal-title-wrap">
              <span class="material-symbols-outlined rf-modal-icon">preview</span>
              <div>
                <h3 class="rf-modal-title">Registration Layout Wireframe Samples</h3>
                <p class="rf-modal-sub">Compare visual wireframes, user experience flow, and apply directly to your form.</p>
              </div>
            </div>
            <button type="button" class="rf-modal-close" (click)="closeLayoutModal()">×</button>
          </div>

          <!-- Tab Bar between 4 Layout Types -->
          <div class="rf-sample-tabs">
            <button type="button"
                    class="rf-sample-tab"
                    [class.active]="activeSampleTab === 'single'"
                    (click)="activeSampleTab = 'single'">
              <span class="material-symbols-outlined">view_agenda</span>
              <span>1. Single Page</span>
            </button>
            <button type="button"
                    class="rf-sample-tab"
                    [class.active]="activeSampleTab === 'sections'"
                    (click)="activeSampleTab = 'sections'">
              <span class="material-symbols-outlined">dashboard_customize</span>
              <span>2. Single Page + Categories</span>
            </button>
            <button type="button"
                    class="rf-sample-tab"
                    [class.active]="activeSampleTab === 'stepper'"
                    (click)="activeSampleTab = 'stepper'">
              <span class="material-symbols-outlined">linear_scale</span>
              <span>3. Step-by-Step Stepper</span>
            </button>
            <button type="button"
                    class="rf-sample-tab"
                    [class.active]="activeSampleTab === 'pages'"
                    (click)="activeSampleTab = 'pages'">
              <span class="material-symbols-outlined">auto_stories</span>
              <span>4. Page-by-Page</span>
            </button>
          </div>

          <div class="rf-modal-body rf-sample-body">
            
            <!-- Visual Wireframe Container (Mock Browser) -->
            <div class="rf-wireframe-browser">
              <!-- Browser Header -->
              <div class="rf-wireframe-chrome">
                <div class="rf-chrome-dots">
                  <span class="dot red"></span>
                  <span class="dot yellow"></span>
                  <span class="dot green"></span>
                </div>
                <div class="rf-chrome-url">
                  <span class="material-symbols-outlined lock-icon">lock</span>
                  <span>https://yourcompany.ozikol.cloud/auth/{{ policy.registrationUrlSlug || 'register' }}</span>
                </div>
              </div>

              <!-- Wireframe Canvas Content -->
              <div class="rf-wireframe-screen">
                
                <!-- WIREFRAME 1: SINGLE PAGE -->
                <div *ngIf="activeSampleTab === 'single'" class="rf-wf-content">
                  <div class="rf-wf-header">
                    <div class="rf-wf-avatar"></div>
                    <div class="rf-wf-title-bar"></div>
                    <div class="rf-wf-sub-bar"></div>
                  </div>
                  <div class="rf-wf-card">
                    <div class="rf-wf-field-label">Full Name</div>
                    <div class="rf-wf-input"></div>
                    <div class="rf-wf-field-label">Email Address</div>
                    <div class="rf-wf-input"></div>
                    <div class="rf-wf-field-label">Password</div>
                    <div class="rf-wf-input"></div>
                    <div class="rf-wf-field-label">Matriculation / Institutional ID</div>
                    <div class="rf-wf-input"></div>
                    <div class="rf-wf-field-label">Department / Faculty</div>
                    <div class="rf-wf-input"></div>
                    <div class="rf-wf-btn-primary">REGISTER &amp; JOIN PORTAL</div>
                  </div>
                </div>

                <!-- WIREFRAME 2: SINGLE PAGE + SECTIONS -->
                <div *ngIf="activeSampleTab === 'sections'" class="rf-wf-content">
                  <div class="rf-wf-header">
                    <div class="rf-wf-title-bar"></div>
                  </div>
                  <!-- Section Box 1 -->
                  <div class="rf-wf-card rf-wf-sec-card">
                    <div class="rf-wf-sec-header">
                      <span class="rf-wf-sec-num">1</span>
                      <span class="rf-wf-sec-title">Personal Credentials</span>
                    </div>
                    <div class="rf-wf-input"></div>
                    <div class="rf-wf-input"></div>
                  </div>
                  <!-- Section Box 2 -->
                  <div class="rf-wf-card rf-wf-sec-card">
                    <div class="rf-wf-sec-header">
                      <span class="rf-wf-sec-num">2</span>
                      <span class="rf-wf-sec-title">Corporate &amp; Professional</span>
                    </div>
                    <div class="rf-wf-input"></div>
                    <div class="rf-wf-input"></div>
                  </div>
                  <div class="rf-wf-btn-primary">REGISTER &amp; JOIN PORTAL</div>
                </div>

                <!-- WIREFRAME 3: STEP-BY-STEP STEPPER -->
                <div *ngIf="activeSampleTab === 'stepper'" class="rf-wf-content">
                  <!-- Stepper Bar -->
                  <div class="rf-wf-stepper-bar">
                    <div class="rf-wf-step-node active">1. Account</div>
                    <div class="rf-wf-step-line"></div>
                    <div class="rf-wf-step-node">2. Category</div>
                    <div class="rf-wf-step-line"></div>
                    <div class="rf-wf-step-node">3. Details</div>
                    <div class="rf-wf-step-line"></div>
                    <div class="rf-wf-step-node">4. Finish</div>
                  </div>
                  <div class="rf-wf-card">
                    <div class="rf-wf-sec-title">STAGE 1 OF 4: ACCOUNT CREDENTIALS</div>
                    <div class="rf-wf-field-label">Name &amp; Username</div>
                    <div class="rf-wf-input"></div>
                    <div class="rf-wf-input"></div>
                    <div class="rf-wf-nav-row">
                      <div class="rf-wf-btn-back">‹ Back</div>
                      <div class="rf-wf-btn-next">Next: Category ›</div>
                    </div>
                  </div>
                </div>

                <!-- WIREFRAME 4: PAGE-BY-PAGE -->
                <div *ngIf="activeSampleTab === 'pages'" class="rf-wf-content">
                  <div class="rf-wf-pages-indicator">
                    <span>Page 2 of 4: Organization Details</span>
                    <div class="rf-wf-page-bar"><div class="fill" style="width: 50%;"></div></div>
                  </div>
                  <div class="rf-wf-card">
                    <div class="rf-wf-field-label">Company Registration No.</div>
                    <div class="rf-wf-input"></div>
                    <div class="rf-wf-field-label">Industry Classification</div>
                    <div class="rf-wf-input"></div>
                    <div class="rf-wf-save-draft">💾 Save &amp; Continue Later</div>
                    <div class="rf-wf-nav-row">
                      <div class="rf-wf-btn-back">‹ Previous Page</div>
                      <div class="rf-wf-btn-next">Continue to Page 3 ›</div>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            <!-- Wireframe Insights & Advantages -->
            <div class="rf-sample-insights">
              <div class="rf-insight-item">
                <span class="material-symbols-outlined text-blue">check_circle</span>
                <div>
                  <strong>Best Used For</strong>
                  <p *ngIf="activeSampleTab === 'single'">Rapid lead capture, newsletter-to-member signups, and simple SaaS portals.</p>
                  <p *ngIf="activeSampleTab === 'sections'">SME registrations, client onboarding, and memberships requiring distinct categorized data clusters.</p>
                  <p *ngIf="activeSampleTab === 'stepper'">Corporate accounts, community registries, multi-stage KYC onboarding, and detailed questionnaires.</p>
                  <p *ngIf="activeSampleTab === 'pages'">Universities, academic admissions, vendor compliance portals, and grant or scholarship applications.</p>
                </div>
              </div>

              <div class="rf-insight-item">
                <span class="material-symbols-outlined text-green">speed</span>
                <div>
                  <strong>Applicant Experience</strong>
                  <p *ngIf="activeSampleTab === 'single'">Zero navigation clicks; quick 60-second fill-and-submit experience.</p>
                  <p *ngIf="activeSampleTab === 'sections'">Clear cognitive chunks without needing multi-page navigation.</p>
                  <p *ngIf="activeSampleTab === 'stepper'">Guided progression with visual milestones that encourage completion.</p>
                  <p *ngIf="activeSampleTab === 'pages'">Focused, distraction-free screens per category; ideal when paired with "Save &amp; Continue Later".</p>
                </div>
              </div>
            </div>

          </div>

          <!-- Modal Footer with Apply Button -->
          <div class="rf-modal-footer rf-sample-footer">
            <div class="rf-sample-active-notice">
              <span>Active Selection: <strong>{{ getLayoutName(activeSampleTab) }}</strong></span>
            </div>
            <div class="rf-sample-btn-wrap">
              <button type="button" class="rf-btn rf-btn-outline" (click)="closeLayoutModal()">Close</button>
              <button type="button"
                      class="rf-btn rf-btn-primary"
                      (click)="applyLayoutFromSample(activeSampleTab)">
                <span class="material-symbols-outlined">auto_awesome</span>
                <span>Apply This Layout to My Form</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ============================================================= -->
      <!-- FULL-SCREEN LIVE DESKTOP LAYOUT PREVIEW MODAL POPUP           -->
      <!-- ============================================================= -->
      <div *ngIf="showFullScreenPreview"
           style="position:fixed;inset:0;z-index:99999;background:#0f172a;display:flex;flex-direction:column;overflow:hidden;">
        <!-- Top Full-Screen Preview Control Bar -->
        <div style="height:56px;min-height:56px;background:#0f172a;border-bottom:1px solid #1e293b;padding:0 24px;display:flex;align-items:center;justify-content:space-between;gap:16px;color:#ffffff;">
          <div style="display:flex;align-items:center;gap:12px;">
            <span class="rf-pulse-dot"></span>
            <strong style="font-size:13px;letter-spacing:0.04em;text-transform:uppercase;">Full-Screen Desktop Preview (Single Source of Truth)</strong>
            <span style="background:#1e293b;color:#93c5fd;border:1px solid #334155;border-radius:6px;padding:3px 10px;font-size:11.5px;font-weight:700;">
              {{ getLayoutTitle(policy.formLayoutMode) }}
            </span>
          </div>

          <div style="display:flex;align-items:center;gap:10px;">
            <!-- Switch between Website Layout & Auth Layout live -->
            <div style="display:inline-flex;background:#1e293b;border:1px solid #334155;border-radius:8px;padding:3px;gap:4px;">
              <button type="button" (click)="selectPageShellLayout('website')"
                      [style.background]="policy.pageShellLayout !== 'auth' ? '#0050E5' : 'transparent'"
                      [style.color]="policy.pageShellLayout !== 'auth' ? '#ffffff' : '#cbd5e1'"
                      style="border:none;border-radius:6px;padding:5px 12px;font-size:12px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px;">
                <span class="material-symbols-outlined" style="font-size:15px;">language</span>
                <span>Website Layout</span>
              </button>
              <button type="button" (click)="selectPageShellLayout('auth')"
                      [style.background]="policy.pageShellLayout === 'auth' ? '#0050E5' : 'transparent'"
                      [style.color]="policy.pageShellLayout === 'auth' ? '#ffffff' : '#cbd5e1'"
                      style="border:none;border-radius:6px;padding:5px 12px;font-size:12px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px;">
                <span class="material-symbols-outlined" style="font-size:15px;">dock_to_left</span>
                <span>Auth Layout</span>
              </button>
            </div>

            <button type="button" class="rf-btn-sim-autofill" (click)="autoFillSimulation()" style="height:34px;padding:0 12px;font-size:12px;">
              <span class="material-symbols-outlined" style="font-size:15px;">magic_button</span>
              <span>Auto-Fill Sample</span>
            </button>

            <button type="button" class="rf-btn-sim-reset" (click)="resetSimulation()" style="height:34px;padding:0 12px;font-size:12px;">
              <span class="material-symbols-outlined" style="font-size:15px;">restart_alt</span>
              <span>Reset Test</span>
            </button>

            <button type="button" (click)="showFullScreenPreview = false"
                    style="background:#ef4444;color:#ffffff;border:none;border-radius:8px;height:34px;padding:0 14px;font-size:12.5px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px;">
              <span class="material-symbols-outlined" style="font-size:16px;">close_fullscreen</span>
              <span>Exit Full Screen</span>
            </button>
          </div>
        </div>

        <!-- Full-Viewport Desktop Layout Canvas -->
        <div style="flex:1;overflow-y:auto;background:#f8fafc;width:100%;">
          <app-landing *ngIf="policy.pageShellLayout !== 'auth'"
                       [embeddedShellMode]="true"
                       [previewMode]="true"
                       [embeddedPageTitle]="policy.registrationFormTitle || 'Create Your Account'"
                       [embeddedPageSubtitle]="policy.registrationWelcomeMessage || 'Join our member directory and workspace portal.'">
            <div style="max-width: 580px; margin: 0 auto;">
              <ng-container *ngTemplateOutlet="liveSimFormCard"></ng-container>
            </div>
          </app-landing>

          <app-auth-layout *ngIf="policy.pageShellLayout === 'auth'"
                           [embeddedMode]="true">
            <ng-container *ngTemplateOutlet="liveSimFormCard"></ng-container>
          </app-auth-layout>
        </div>
      </div>

  `,
  styles: [`
    .rf-builder-container {
      padding: 24px 32px 60px;
      font-family: inherit;
      color: #0f172a;
      max-width: 1480px;
      margin: 0 auto;
    }

    /* Header */
    .rf-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 24px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }
    .rf-eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11.5px;
      font-weight: 800;
      color: #0050e5;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 6px;
    }
    .rf-eyebrow span { font-size: 16px; }
    .rf-title {
      font-size: 26px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 6px;
      letter-spacing: -0.02em;
    }
    .rf-subtitle {
      font-size: 13.5px;
      color: #64748b;
      margin: 0;
      max-width: 780px;
      line-height: 1.5;
    }
    .rf-header-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    /* Buttons */
    .rf-btn {
      height: 36px;
      padding: 0 14px;
      border-radius: 8px;
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      text-decoration: none;
      transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
      border: 1px solid transparent;
      box-sizing: border-box;
      white-space: nowrap;
    }
    .rf-btn span.material-symbols-outlined { font-size: 17px; }
    .rf-btn-sm { height: 32px; padding: 0 12px; font-size: 11.5px; font-weight: 600; }
    .rf-btn-sm span.material-symbols-outlined { font-size: 15px; }
    .rf-btn-primary {
      background: #0050e5;
      color: #ffffff;
      box-shadow: 0 1px 3px rgba(0, 80, 229, 0.2);
    }
    .rf-btn-primary:hover:not(:disabled) {
      background: #0043c0;
      box-shadow: 0 2px 6px rgba(0, 80, 229, 0.3);
      transform: translateY(-1px);
    }
    .rf-btn-outline {
      background: #ffffff;
      color: #334155;
      border-color: #cbd5e1;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    }
    .rf-btn-outline:hover {
      background: #f8fafc;
      color: #0f172a;
      border-color: #94a3b8;
    }
    .rf-btn-save {
      background: #10b981;
      color: #ffffff;
      box-shadow: 0 1px 3px rgba(16, 185, 129, 0.2);
    }
    .rf-btn-save:hover:not(:disabled) { background: #059669; }

    /* Policy Card (Compact & Modern) */
    .rf-policy-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px 18px;
      margin-bottom: 16px;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.03);
    }
    .rf-policy-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      flex-wrap: wrap;
      gap: 10px;
    }
    .rf-policy-title-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .rf-policy-icon {
      font-size: 20px;
      color: #0050e5;
      background: #eff6ff;
      padding: 6px;
      border-radius: 8px;
    }
    .rf-policy-heading {
      font-size: 14px;
      font-weight: 800;
      margin: 0 0 2px;
    }
    .rf-policy-sub {
      font-size: 11.5px;
      color: #64748b;
      margin: 0;
    }
    .rf-policy-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-bottom: 10px;
    }
    @media (max-width: 900px) { .rf-policy-grid { grid-template-columns: 1fr; } }
    .rf-toggle-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 8px 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      transition: all 0.2s ease;
    }
    .rf-toggle-box.active {
      background: #f0fdf4;
      border-color: #bbf7d0;
    }
    .rf-toggle-info { flex: 1; min-width: 0; }
    .rf-toggle-label {
      display: block;
      font-size: 12px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .rf-toggle-desc {
      font-size: 10.5px;
      color: #64748b;
      line-height: 1.35;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .rf-switch {
      position: relative;
      display: inline-block;
      width: 34px;
      height: 18px;
      flex-shrink: 0;
    }
    .rf-switch input { opacity: 0; width: 0; height: 0; }
    .rf-slider {
      position: absolute;
      cursor: pointer;
      top: 0; left: 0; right: 0; bottom: 0;
      background-color: #cbd5e1;
      border-radius: 18px;
      transition: 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .rf-slider:before {
      position: absolute;
      content: "";
      height: 14px;
      width: 14px;
      left: 2px;
      bottom: 2px;
      background-color: white;
      border-radius: 50%;
      transition: 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .rf-switch input:checked + .rf-slider { background-color: #10b981; }
    .rf-switch input:checked + .rf-slider:before { transform: translateX(16px); }

    .rf-copy-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .rf-copy-grid.rf-copy-grid-3 {
      grid-template-columns: 1fr 1fr 1fr;
    }
    @media (max-width: 900px) { .rf-copy-grid.rf-copy-grid-3 { grid-template-columns: 1fr; } }
    @media (max-width: 768px) { .rf-copy-grid { grid-template-columns: 1fr; } }
    .rf-form-group { display: flex; flex-direction: column; gap: 2px; }
    .rf-form-label {
      font-size: 10px;
      font-weight: 800;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .rf-input, .rf-select {
      height: 32px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 0 10px;
      font-size: 12px;
      color: #0f172a;
      background: #ffffff;
      outline: none;
      transition: all 0.15s ease;
      box-sizing: border-box;
    }
    .rf-input:hover, .rf-select:hover {
      border-color: #94a3b8;
    }
    .rf-input:focus, .rf-select:focus {
      border-color: #0050e5;
      box-shadow: 0 0 0 2px rgba(0, 80, 229, 0.12);
    }
    .rf-select {
      cursor: pointer;
      appearance: none;
      -webkit-appearance: none;
      -moz-appearance: none;
      padding-right: 32px;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 10px center;
      background-size: 14px 14px;
      width: 100%;
    }
    .rf-code-input { font-family: monospace; font-size: 12px; }
    .field-hint { font-size: 10px; color: #94a3b8; margin-top: 2px; }

    /* Split Workspace */
    .rf-split-workspace {
      display: grid;
      grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
      gap: 24px;
      align-items: start;
    }
    .rf-column-basic, .rf-column-preview {
      min-width: 0;
      max-width: 100%;
    }
    @media (max-width: 1024px) { .rf-split-workspace { grid-template-columns: 1fr; } }

    /* Section Cards */
    .rf-section-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 22px 24px;
      margin-bottom: 20px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
    }
    .rf-section-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }
    .rf-section-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 15px;
      font-weight: 800;
      color: #0f172a;
    }
    .rf-sec-icon { font-size: 20px; }
    .text-blue { color: #0050e5; }
    .text-indigo { color: #4f46e5; }
    .rf-section-desc {
      font-size: 12px;
      color: #64748b;
      margin: 0 0 16px;
    }
    .rf-badge-locked {
      background: #f1f5f9;
      color: #475569;
      font-size: 10.5px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
      text-transform: uppercase;
    }

    /* Core Items */
    .rf-core-items {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .rf-core-pill {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      color: #334155;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .rf-core-pill span { font-size: 16px; color: #64748b; }
    .pill-req {
      background: #eff6ff;
      color: #0050e5;
      font-size: 9.5px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      text-transform: uppercase;
    }
    .pill-opt {
      background: #f1f5f9;
      color: #64748b;
      font-size: 9.5px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      text-transform: uppercase;
    }

    /* Fields List */
    .rf-fields-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .rf-field-item {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 12px 14px;
      display: flex;
      align-items: center;
      gap: 14px;
      transition: all 0.15s ease;
    }
    .rf-field-item:hover {
      border-color: #cbd5e1;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
    }
    .rf-field-reorder {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
    }
    .rf-order-btn {
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 0;
      color: #94a3b8;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .rf-order-btn:hover:not(:disabled) { color: #0050e5; }
    .rf-order-btn:disabled { opacity: 0.3; cursor: not-allowed; }
    .rf-order-index {
      font-size: 10.5px;
      font-weight: 800;
      color: #64748b;
    }
    .rf-field-body { flex: 1; min-width: 0; }
    .rf-field-top {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
      flex-wrap: wrap;
    }
    .rf-field-type-pill {
      background: #f1f5f9;
      color: #334155;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .rf-field-type-pill span { font-size: 14px; }
    .rf-field-type-pill[data-type="select"] { background: #ede9fe; color: #6d28d9; }
    .rf-field-type-pill[data-type="file"] { background: #e0f2fe; color: #0369a1; }
    .rf-field-type-pill[data-type="date"] { background: #fef3c7; color: #b45309; }
    .rf-field-type-pill[data-type="number"] { background: #fce7f3; color: #be185d; }
    .rf-badge-req {
      background: #fee2e2;
      color: #dc2626;
      font-size: 10px;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 4px;
      text-transform: uppercase;
    }
    .rf-badge-opt {
      background: #f1f5f9;
      color: #64748b;
      font-size: 10px;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 4px;
      text-transform: uppercase;
    }
    .rf-badge-cat {
      background: #eff6ff;
      color: #1d4ed8;
      font-size: 10px;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 4px;
      display: inline-flex;
      align-items: center;
      gap: 3px;
    }
    .rf-badge-cat span { font-size: 12px; }
    .rf-badge-all {
      background: #f8fafc;
      color: #64748b;
      font-size: 10px;
      font-weight: 600;
      padding: 1px 6px;
      border-radius: 4px;
    }
    .rf-field-label {
      font-size: 13.5px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 2px;
    }
    .rf-field-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      color: #64748b;
      flex-wrap: wrap;
    }
    .rf-field-meta code {
      background: #f1f5f9;
      color: #0f172a;
      padding: 1px 4px;
      border-radius: 4px;
    }
    .rf-field-help {
      font-size: 11.5px;
      color: #94a3b8;
      margin: 4px 0 0;
      font-style: italic;
    }
    .rf-field-actions {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .rf-action-btn {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      background: #ffffff;
      color: #475569;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .rf-action-btn:hover { background: #f8fafc; color: #0050e5; border-color: #cbd5e1; }
    .rf-btn-toggle-active { color: #94a3b8; }
    .rf-btn-toggle-active.is-active { color: #10b981; background: #ecfdf5; border-color: #a7f3d0; }
    .rf-btn-toggle-active:hover { border-color: #10b981; color: #10b981; }
    .rf-btn-del:hover { background: #fef2f2; color: #dc2626; border-color: #fecaca; }
    .rf-badge-active {
      background: #dcfce7;
      color: #166534;
      font-size: 10px;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 4px;
      text-transform: uppercase;
    }
    .rf-badge-disabled {
      background: #f1f5f9;
      color: #94a3b8;
      font-size: 10px;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 4px;
      text-transform: uppercase;
      border: 1px dashed #cbd5e1;
    }

    /* Empty state */
    .rf-empty-fields {
      text-align: center;
      padding: 40px 20px;
      background: #f8fafc;
      border-radius: 12px;
      border: 1.5px dashed #cbd5e1;
    }
    .rf-empty-icon { font-size: 48px; color: #94a3b8; margin-bottom: 8px; }
    .rf-empty-fields h4 { font-size: 16px; font-weight: 800; color: #0f172a; margin: 0 0 4px; }
    .rf-empty-fields p { font-size: 12.5px; color: #64748b; max-width: 440px; margin: 0 auto 18px; line-height: 1.45; }

    /* Preview Column */
    .rf-column-preview {
      position: sticky;
      top: 24px;
    }
    .rf-preview-card {
      background: #0f172a;
      border-radius: 20px;
      padding: 24px;
      box-shadow: 0 20px 45px -10px rgba(15, 23, 42, 0.25);
    }
    .rf-preview-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 18px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding-bottom: 12px;
    }
    .rf-preview-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      font-weight: 800;
      color: #4ade80;
      letter-spacing: 0.05em;
    }
    .rf-pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #4ade80;
      box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.7);
      animation: rfPulse 2s infinite;
    }
    @keyframes rfPulse {
      0% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.7); }
      70% { box-shadow: 0 0 0 6px rgba(74, 222, 128, 0); }
      100% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0); }
    }
    .rf-preview-bar-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .rf-btn-sim-autofill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px;
      background: rgba(16, 185, 129, 0.2);
      border: 1px solid rgba(16, 185, 129, 0.45);
      border-radius: 6px;
      color: #6ee7b7;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .rf-btn-sim-autofill:hover {
      background: rgba(16, 185, 129, 0.35);
      color: #ffffff;
      border-color: rgba(16, 185, 129, 0.65);
    }
    .rf-btn-sim-autofill .material-symbols-outlined {
      font-size: 14px;
    }
    .rf-btn-sim-reset {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 6px;
      color: #cbd5e1;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .rf-btn-sim-reset:hover {
      background: rgba(255, 255, 255, 0.2);
      color: #ffffff;
      border-color: rgba(255, 255, 255, 0.35);
    }
    .rf-btn-sim-reset .material-symbols-outlined {
      font-size: 14px;
    }
    .rf-preview-mode-tag {
      background: rgba(0, 80, 229, 0.25);
      border: 1px solid rgba(59, 130, 246, 0.4);
      color: #93c5fd;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: 0.03em;
    }

    /* Sim Card Inside Preview */
    .rf-sim-card {
      background: #ffffff;
      border-radius: 16px;
      padding: 24px 22px;
      color: #0f172a;
    }
    .rf-sim-alert-draft {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #1e40af;
      padding: 10px 12px;
      border-radius: 8px;
      font-size: 11.5px;
      font-weight: 600;
      margin-bottom: 14px;
    }
    .rf-sim-alert-draft .material-symbols-outlined {
      font-size: 18px;
      color: #2563eb;
    }
    .rf-sim-alert-passwordless {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #fdf4ff;
      border: 1px solid #f5d0fe;
      color: #86198f;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 600;
      margin-top: 4px;
    }
    .rf-sim-alert-passwordless .material-symbols-outlined {
      font-size: 16px;
      color: #c026d3;
    }
    .rf-sim-success-card {
      text-align: center;
      padding: 16px 8px;
    }
    .rf-sim-success-badge {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: #dcfce7;
      border: 2px solid #86efac;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: #16a34a;
      margin: 0 auto 12px;
    }
    .rf-sim-success-badge .material-symbols-outlined {
      font-size: 32px;
    }
    .rf-sim-success-title {
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 4px;
    }
    .rf-sim-success-msg {
      font-size: 12.5px;
      color: #64748b;
      margin: 0 0 16px;
    }
    .rf-sim-result-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px 14px;
      text-align: left;
      margin-bottom: 14px;
    }
    .rf-sim-res-head {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 10.5px;
      font-weight: 800;
      color: #0050e5;
      letter-spacing: 0.04em;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 8px;
      margin-bottom: 8px;
    }
    .rf-sim-res-head .material-symbols-outlined {
      font-size: 15px;
    }
    .rf-sim-res-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 0;
      font-size: 11.5px;
      color: #475569;
      border-bottom: 1px dashed #f1f5f9;
    }
    .rf-sim-res-row:last-child {
      border-bottom: none;
    }
    .rf-sim-res-row strong {
      color: #0f172a;
      font-weight: 700;
      text-align: right;
      max-width: 55%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .rf-sim-notice-test {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      background: #fffbeb;
      border: 1px solid #fef3c7;
      color: #92400e;
      border-radius: 6px;
      padding: 6px 10px;
      font-size: 11px;
      font-weight: 600;
      margin-bottom: 16px;
    }
    .rf-sim-notice-test .material-symbols-outlined {
      font-size: 15px;
      color: #d97706;
    }
    .rf-sim-success-actions {
      display: flex;
      gap: 8px;
      justify-content: center;
    }
    .rf-sim-success-actions .rf-btn {
      padding: 8px 16px;
      font-size: 12px;
    }
    .rf-sim-header { text-align: center; margin-bottom: 18px; }
    .rf-sim-avatar {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: #eff6ff;
      border: 1px solid #dbeafe;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: #0050e5;
      margin-bottom: 8px;
    }
    .rf-sim-title { font-size: 17px; font-weight: 800; margin: 0 0 2px; }
    .rf-sim-sub { font-size: 11.5px; color: #64748b; margin: 0; }
    .rf-sim-form { display: flex; flex-direction: column; gap: 10px; }
    .rf-sim-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .rf-sim-group { display: flex; flex-direction: column; gap: 3px; }
    .rf-sim-label { font-size: 10.5px; font-weight: 700; color: #475569; text-transform: uppercase; }
    .rf-sim-req { color: #dc2626; margin-left: 2px; }
    .rf-sim-input {
      height: 34px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 0 10px;
      font-size: 12px;
      color: #0f172a;
      background: #ffffff;
      outline: none;
      box-sizing: border-box;
      width: 100%;
    }
    select.rf-sim-input {
      cursor: pointer;
      appearance: none;
      -webkit-appearance: none;
      -moz-appearance: none;
      padding-right: 28px;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 8px center;
      background-size: 14px 14px;
    }
    .rf-sim-textarea { height: auto; padding: 6px 10px; resize: none; }
    .rf-sim-file-drop {
      border: 1.5px dashed #cbd5e1;
      border-radius: 8px;
      padding: 10px;
      text-align: center;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      color: #64748b;
      font-size: 11px;
      background: #f8fafc;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .rf-sim-file-drop:hover {
      border-color: #0050e5;
      background: #eff6ff;
      color: #0050e5;
    }
    .rf-sim-file-drop.has-file {
      border-color: #10b981;
      background: #f0fdf4;
      color: #065f46;
    }
    .rf-sim-file-drop.has-file .material-symbols-outlined {
      color: #10b981;
    }
    .rf-sim-checkbox-label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11.5px;
      color: #334155;
      cursor: pointer;
    }
    .rf-sim-help { font-size: 10px; color: #94a3b8; font-style: italic; }
    .rf-sim-divider {
      text-align: center;
      position: relative;
      margin: 8px 0;
    }
    .rf-sim-divider:before {
      content: "";
      position: absolute;
      top: 50%; left: 0; right: 0;
      height: 1px;
      background: #e2e8f0;
      z-index: 1;
    }
    .rf-sim-divider span {
      position: relative;
      z-index: 2;
      background: #ffffff;
      padding: 0 8px;
      font-size: 9.5px;
      font-weight: 800;
      color: #64748b;
      letter-spacing: 0.05em;
    }
    .rf-sim-stepper {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin: 8px 0 14px;
      padding: 0 4px;
    }
    .rf-sim-step {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
      font-size: 9.5px;
      font-weight: 700;
      color: #64748b;
      cursor: pointer;
      user-select: none;
      transition: all 0.15s ease;
    }
    .rf-sim-step:hover { color: #0050e5; }
    .rf-sim-step.active { color: #0050e5; }
    .rf-sim-step .step-num {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #f1f5f9;
      border: 1.5px solid #cbd5e1;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: 800;
      transition: all 0.15s ease;
    }
    .rf-sim-step:hover .step-num { border-color: #0050e5; }
    .rf-sim-step.active .step-num {
      background: #0050e5;
      color: #ffffff;
      border-color: #0050e5;
      box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.2);
    }
    .rf-sim-step-line {
      flex: 1;
      height: 2px;
      background: #e2e8f0;
      margin: 0 4px 14px;
    }
    .rf-sim-stage-badge {
      font-size: 9.5px;
      font-weight: 800;
      color: #0050e5;
      background: #eff6ff;
      border: 1px solid #dbeafe;
      padding: 3px 8px;
      border-radius: 6px;
      margin-bottom: 12px;
      text-align: center;
      letter-spacing: 0.05em;
    }
    .rf-sim-nav-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-top: 20px;
    }
    .rf-sim-nav-row .rf-sim-btn {
      margin-top: 0 !important;
      flex: 1;
    }
    .rf-sim-btn-sub {
      height: 38px;
      padding: 0 14px;
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .rf-sim-btn-sub:hover { background: #e2e8f0; color: #0f172a; }
    .rf-sim-sum-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 12px;
      margin-bottom: 8px;
    }
    .rf-sim-recaptcha-box {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 8px 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin: 8px 0;
    }
    .rf-sim-recaptcha-check {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .rf-recaptcha-shield {
      color: #0050e5;
      font-size: 18px;
    }
    .rf-sim-btn {
      margin-top: 20px;
      height: 40px;
      background: #0050e5;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      cursor: pointer;
      width: 100%;
      box-shadow: 0 2px 6px rgba(0, 80, 229, 0.2);
      transition: all 0.15s ease;
      box-sizing: border-box;
    }
    .rf-sim-btn:hover {
      background: #0043c0;
      box-shadow: 0 4px 10px rgba(0, 80, 229, 0.3);
      transform: translateY(-1px);
    }
    .rf-sim-btn span { font-size: 16px; }
    .rf-sim-btn-finish {
      background: linear-gradient(135deg, #10b981, #059669) !important;
      box-shadow: 0 2px 6px rgba(16, 185, 129, 0.25) !important;
    }
    .rf-sim-btn-finish:hover {
      background: linear-gradient(135deg, #059669, #047857) !important;
      box-shadow: 0 4px 10px rgba(16, 185, 129, 0.35) !important;
      transform: translateY(-1px);
    }

    /* Modal Overlay & Drawer */
    .rf-modal-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(4px);
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .rf-modal-card {
      background: #ffffff;
      border-radius: 18px;
      width: 100%;
      max-width: 620px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      border: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
    }
    .rf-modal-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      border-bottom: 1px solid #e2e8f0;
    }
    .rf-modal-title-wrap {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .rf-modal-icon {
      font-size: 26px;
      color: #0050e5;
      background: #eff6ff;
      padding: 6px;
      border-radius: 8px;
    }
    .rf-modal-title { font-size: 16.5px; font-weight: 800; color: #0f172a; margin: 0 0 2px; }
    .rf-modal-sub { font-size: 11.5px; color: #64748b; margin: 0; }
    .rf-modal-close {
      background: transparent;
      border: none;
      font-size: 24px;
      color: #94a3b8;
      cursor: pointer;
      line-height: 1;
    }
    .rf-modal-close:hover { color: #0f172a; }
    .rf-modal-body {
      padding: 22px 24px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .rf-form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .rf-input-hint { font-size: 10px; color: #94a3b8; }
    .rf-options-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px;
    }
    .rf-opts-add-row {
      display: flex;
      gap: 8px;
      margin-top: 6px;
    }
    .rf-opts-add-row .rf-input { flex: 1; }
    .rf-opts-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 10px;
    }
    .rf-opt-pill {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 11.5px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-weight: 600;
    }
    .rf-opt-remove {
      background: transparent;
      border: none;
      color: #dc2626;
      cursor: pointer;
      font-size: 14px;
      line-height: 1;
      padding: 0;
    }
    .rf-toggles-row {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 6px;
    }
    .rf-check-box {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12.5px;
      font-weight: 600;
      color: #334155;
      cursor: pointer;
    }
    .rf-modal-footer {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 10px;
      padding: 16px 24px;
      border-top: 1px solid #e2e8f0;
      background: #f8fafc;
      border-radius: 0 0 18px 18px;
    }

    /* Templates Banner (Compact 1-Line Horizontal Scroll) */
    .rf-templates-banner {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 12px 16px;
      margin-bottom: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
    }
    .rf-tpl-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: 10px;
      gap: 12px;
    }
    .rf-tpl-head-left { flex: 1; min-width: 0; }
    .rf-tpl-eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 9.5px;
      font-weight: 800;
      color: #7c3aed;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 2px;
    }
    .rf-tpl-eyebrow span { font-size: 13px; }
    .rf-tpl-title { font-size: 14px; font-weight: 800; color: #0f172a; margin: 0 0 2px; }
    .rf-tpl-desc { font-size: 11px; color: #64748b; margin: 0; }
    
    .rf-tpl-nav-arrows {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }
    .rf-tpl-arrow-btn {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      color: #334155;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s ease;
      padding: 0;
    }
    .rf-tpl-arrow-btn:hover {
      background: #f1f5f9;
      color: #0050e5;
      border-color: #94a3b8;
    }
    .rf-tpl-arrow-btn span { font-size: 18px; }

    /* 1-Line Horizontal Scroll Track */
    .rf-tpl-scroll-row {
      display: flex;
      flex-direction: row;
      flex-wrap: nowrap;
      overflow-x: auto;
      overflow-y: hidden;
      gap: 10px;
      padding: 2px 2px 8px 2px;
      scroll-snap-type: x mandatory;
      scroll-behavior: smooth;
      -webkit-overflow-scrolling: touch;
    }
    .rf-tpl-scroll-row::-webkit-scrollbar {
      height: 4px;
    }
    .rf-tpl-scroll-row::-webkit-scrollbar-track {
      background: #f1f5f9;
      border-radius: 999px;
    }
    .rf-tpl-scroll-row::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 999px;
    }
    .rf-tpl-scroll-row::-webkit-scrollbar-thumb:hover {
      background: #94a3b8;
    }

    /* Compact Sector Card */
    .rf-tpl-card {
      flex: 0 0 195px;
      min-width: 195px;
      max-width: 195px;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      cursor: pointer;
      background: #ffffff;
      box-sizing: border-box;
      scroll-snap-align: start;
      transition: all 0.15s ease;
    }
    .rf-tpl-card:hover {
      border-color: #0050e5;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 80, 229, 0.08);
    }
    .rf-tpl-top-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .rf-tpl-icon {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .rf-tpl-icon span { font-size: 16px; }
    .rf-tpl-info h4 {
      font-size: 12px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .rf-tpl-info p {
      font-size: 10.5px;
      color: #64748b;
      margin: 0;
      line-height: 1.35;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      height: 28px;
    }
    .rf-tpl-field-count {
      font-size: 9px;
      font-weight: 700;
      color: #0050e5;
      background: #eff6ff;
      padding: 2px 6px;
      border-radius: 9999px;
    }
    .rf-btn-tpl-apply {
      margin-top: auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 5px 8px;
      border-radius: 6px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      color: #334155;
      font-size: 10.5px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .rf-btn-tpl-apply span.material-symbols-outlined { font-size: 13px; }
    .rf-tpl-card:hover .rf-btn-tpl-apply {
      background: #0050e5;
      border-color: #0050e5;
      color: #ffffff;
    }
    /* Slug & Referral Styles */
    .rf-slug-input-wrap {
      display: flex;
      align-items: center;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      overflow: hidden;
      background: #ffffff;
    }
    .rf-slug-prefix {
      padding: 0 12px;
      background: #f1f5f9;
      color: #64748b;
      font-size: 13px;
      font-weight: 600;
      border-right: 1px solid #cbd5e1;
      height: 40px;
      display: flex;
      align-items: center;
    }
    .rf-slug-input-wrap .rf-input {
      border: none !important;
      border-radius: 0 !important;
      box-shadow: none !important;
    }
    .rf-live-url-pill {
      margin-top: 8px;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #eff6ff;
      border: 1px solid #dbeafe;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 12px;
      color: #1e40af;
    }
    .rf-chip-btn {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 2px 6px;
      color: #475569;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      font-size: 13px;
      text-decoration: none;
    }
    .rf-chip-btn:hover { background: #f8fafc; color: #0f172a; }
    .rf-sim-ref-wrap {
      margin: 10px 0 4px;
      text-align: left;
    }
    .rf-sim-ref-link {
      font-size: 12.5px;
      color: #dc2626;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
    }
    .rf-sim-ref-box { margin-top: 6px; }
    /* Template Preview Modal */
    /* 1-Click Sector Template Horizontal Scroll Badges */
    .rf-tpl-badges {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }
    .rf-tpl-layout-pill {
      font-size: 9.5px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      background: #eff6ff;
      color: #0050e5;
      border: 1px solid #bfdbfe;
    }
    .rf-tpl-layout-pill.pill-single { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; }
    .rf-tpl-layout-pill.pill-sections { background: #fdf2f8; color: #be185d; border-color: #fbcfe8; }
    .rf-tpl-layout-pill.pill-stepper { background: #ecfdf5; color: #047857; border-color: #a7f3d0; }
    .rf-tpl-layout-pill.pill-pages { background: #f5f3ff; color: #6d28d9; border-color: #ddd6fe; }

    /* ======================================================== */
    /* TEMPLATE PREVIEW MODAL (80% SCREEN SPLIT-SCREEN STUDIO)  */
    /* ======================================================== */
    .rf-tpl-modal {
      width: 80vw !important;
      max-width: 1220px !important;
      min-width: 780px !important;
      height: 80vh !important;
      max-height: 80vh !important;
      display: flex !important;
      flex-direction: column !important;
      overflow: hidden !important;
      padding: 0 !important;
      border-radius: 18px !important;
      background: #ffffff !important;
      box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.45) !important;
    }
    .rf-tpl-head-bar {
      padding: 16px 24px;
      border-bottom: 1px solid #e2e8f0;
      background: #ffffff;
      flex-shrink: 0;
    }
    .rf-tpl-modal-headline {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .rf-badge-layout-tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.02em;
    }
    .rf-badge-layout-tag.tag-single { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
    .rf-badge-layout-tag.tag-sections { background: #fdf2f8; color: #be185d; border: 1px solid #fbcfe8; }
    .rf-badge-layout-tag.tag-stepper { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
    .rf-badge-layout-tag.tag-pages { background: #f5f3ff; color: #6d28d9; border: 1px solid #ddd6fe; }
    .rf-badge-layout-tag .material-symbols-outlined { font-size: 13px; }

    /* 2-Column Split Body */
    .rf-tpl-split-body {
      display: grid;
      grid-template-columns: 380px 1fr;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }
    @media (max-width: 980px) {
      .rf-tpl-split-body { grid-template-columns: 1fr; }
    }

    /* Left Sidebar */
    .rf-tpl-col-sidebar {
      background: #f8fafc;
      border-right: 1px solid #e2e8f0;
      padding: 18px 20px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .rf-tpl-strategy-box {
      background: #ffffff;
      border: 1px solid #dbeafe;
      border-radius: 10px;
      padding: 12px 14px;
    }
    .rf-tpl-strat-head {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 10px;
      font-weight: 800;
      color: #0050e5;
      letter-spacing: 0.05em;
      margin-bottom: 4px;
    }
    .rf-tpl-strat-head span { font-size: 14px; }
    .rf-tpl-strat-title {
      font-size: 13px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 4px;
    }
    .rf-tpl-strat-desc {
      font-size: 11px;
      color: #64748b;
      margin: 0;
      line-height: 1.45;
    }
    .rf-tpl-questions-list {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px;
      max-height: 200px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .rf-tpl-q-head { font-size: 10px; font-weight: 800; color: #475569; margin-bottom: 2px; letter-spacing: 0.04em; }
    .rf-tpl-q-item {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 6px 10px;
    }
    .rf-tpl-q-num {
      width: 18px;
      height: 18px;
      border-radius: 4px;
      background: #e2e8f0;
      color: #475569;
      font-size: 10px;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .rf-tpl-q-text { flex: 1; display: flex; justify-content: space-between; align-items: center; gap: 8px; }
    .rf-tpl-q-title { display: flex; align-items: center; gap: 4px; font-size: 11.5px; font-weight: 600; color: #1e293b; }
    .rf-tpl-req { font-size: 9px; color: #dc2626; font-weight: 700; background: #fee2e2; padding: 1px 4px; border-radius: 3px; }
    .rf-tpl-type-pill { font-size: 10px; color: #64748b; background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-weight: 600; }
    .rf-tpl-mode-box { display: flex; flex-direction: column; gap: 6px; }
    .rf-tpl-mode-label { font-size: 10px; font-weight: 800; color: #475569; letter-spacing: 0.04em; }
    .rf-tpl-modes { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .rf-radio-card {
      border: 1.5px solid #cbd5e1;
      border-radius: 8px;
      padding: 8px 10px;
      display: flex;
      align-items: flex-start;
      gap: 6px;
      cursor: pointer;
      background: #ffffff;
      transition: all 0.15s ease;
    }
    .rf-radio-card.selected { border-color: #0050e5; background: #eff6ff; }
    .rf-radio-card strong { display: block; font-size: 11px; color: #0f172a; }
    .rf-radio-card p { font-size: 10px; color: #64748b; margin: 1px 0 0; line-height: 1.3; }
    .rf-tpl-sync-toggle {
      background: #ffffff;
      border: 1px dashed #cbd5e1;
      border-radius: 8px;
      padding: 8px 10px;
      font-size: 11px;
    }
    .rf-tpl-sync-toggle .rf-check-box { font-size: 11px; }
    .rf-tpl-sidebar-actions {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: auto;
      padding-top: 10px;
    }
    .rf-btn-apply-full {
      width: 100%;
      height: 40px;
      font-size: 12.5px;
      font-weight: 700;
      justify-content: center;
      border-radius: 8px;
    }

    /* Right Preview Canvas (Realistic Form Preview) */
    .rf-tpl-col-preview {
      background: #0f172a;
      display: flex;
      flex-direction: column;
      min-height: 0;
      overflow: hidden;
    }
    .rf-tpl-canvas-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 20px;
      background: #090d16;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      flex-shrink: 0;
    }
    .rf-tpl-canvas-left {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 10.5px;
      font-weight: 800;
      color: #4ade80;
      letter-spacing: 0.05em;
    }
    .rf-tpl-canvas-mode-pill {
      background: rgba(0, 80, 229, 0.3);
      border: 1px solid rgba(59, 130, 246, 0.4);
      color: #93c5fd;
      padding: 2px 8px;
      border-radius: 5px;
      font-size: 10px;
      font-weight: 700;
    }
    .rf-tpl-canvas-hint {
      font-size: 10.5px;
      color: #94a3b8;
    }
    .rf-tpl-canvas-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .rf-btn-tpl-autofill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 10px;
      background: rgba(16, 185, 129, 0.2);
      border: 1px solid rgba(16, 185, 129, 0.45);
      border-radius: 6px;
      color: #6ee7b7;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .rf-btn-tpl-autofill:hover {
      background: rgba(16, 185, 129, 0.35);
      color: #ffffff;
      border-color: rgba(16, 185, 129, 0.65);
    }
    .rf-btn-tpl-autofill .material-symbols-outlined {
      font-size: 14px;
    }
    .rf-btn-tpl-reset {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 9px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.18);
      border-radius: 6px;
      color: #cbd5e1;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .rf-btn-tpl-reset:hover {
      background: rgba(255, 255, 255, 0.18);
      color: #ffffff;
      border-color: rgba(255, 255, 255, 0.3);
    }
    .rf-btn-tpl-reset .material-symbols-outlined {
      font-size: 14px;
    }
    .rf-tpl-canvas-scroll {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
      display: flex;
      justify-content: center;
      align-items: flex-start;
    }
    .rf-tpl-live-card {
      background: #ffffff;
      border-radius: 16px;
      padding: 26px 24px;
      width: 100%;
      max-width: 520px;
      box-shadow: 0 20px 45px -10px rgba(0, 0, 0, 0.4);
      color: #0f172a;
    }
    .rf-tpl-card-head { text-align: center; margin-bottom: 16px; }
    .rf-tpl-card-avatar {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 8px;
    }
    .rf-tpl-card-avatar span { font-size: 24px; }
    .rf-tpl-card-title { font-size: 17px; font-weight: 800; margin: 0 0 2px; }
    .rf-tpl-card-sub { font-size: 11.5px; color: #64748b; margin: 0; }
    .rf-tpl-form-flow { display: flex; flex-direction: column; gap: 10px; }
    .rf-tpl-stage-indicator {
      font-size: 9.5px;
      font-weight: 800;
      color: #0050e5;
      background: #eff6ff;
      border: 1px solid #dbeafe;
      padding: 3px 8px;
      border-radius: 6px;
      margin-bottom: 10px;
      text-align: center;
      letter-spacing: 0.05em;
    }
    .rf-sim-success-card {
      text-align: center;
      padding: 12px 4px;
      animation: fadeIn 0.2s ease-out;
    }
    .rf-sim-success-avatar {
      width: 58px;
      height: 58px;
      border-radius: 50%;
      background: #ecfdf5;
      color: #059669;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 12px;
      box-shadow: 0 4px 12px rgba(5, 150, 105, 0.15);
    }
    .rf-sim-success-avatar span { font-size: 34px; }
    .rf-sim-success-title {
      font-size: 19px;
      font-weight: 800;
      color: #065f46;
      margin: 0 0 4px;
    }
    .rf-sim-success-sub {
      font-size: 12px;
      color: #64748b;
      margin: 0 0 16px;
      line-height: 1.45;
    }
    .rf-sim-success-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px 16px;
      text-align: left;
      display: flex;
      flex-direction: column;
      gap: 9px;
    }
    .rf-sim-success-badge {
      font-size: 9.5px;
      font-weight: 800;
      color: #0050e5;
      letter-spacing: 0.05em;
      margin-bottom: 2px;
    }
    .rf-sim-success-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
    }
    .rf-sim-success-row .lbl { color: #64748b; font-weight: 600; }
    .rf-sim-success-row .val { color: #0f172a; font-weight: 700; }
    .rf-sim-btn-reset {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      color: #334155;
      width: 100%;
      justify-content: center;
    }
    .rf-sim-btn-reset:hover {
      background: #f1f5f9;
      color: #0f172a;
    }

    /* ======================================================== */
    /* CARD 3 ARCHITECTURE, LAYOUT MODES & HIERARCHY STYLES     */
    /* ======================================================== */
    .rf-card-3 {
      border: 1.5px solid #dbeafe;
      background: #ffffff;
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 4px 16px rgba(0, 80, 229, 0.04);
    }
    .rf-card3-heading {
      font-size: 17px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 2px;
      letter-spacing: -0.01em;
    }
    .rf-builder-row {
      margin-top: 24px;
      padding-top: 20px;
      border-top: 1px solid #f1f5f9;
      position: relative;
    }
    .rf-row-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 14px;
      flex-wrap: wrap;
    }
    .rf-row-num {
      background: #0050e5;
      color: #ffffff;
      font-size: 10px;
      font-weight: 800;
      padding: 2px 8px;
      border-radius: 6px;
      letter-spacing: 0.05em;
    }
    .rf-row-title {
      font-size: 12px;
      font-weight: 800;
      color: #1e293b;
      letter-spacing: 0.04em;
    }
    .rf-row-hint {
      font-size: 11.5px;
      color: #94a3b8;
      margin-left: auto;
    }

    /* Row 1 Layout Cards Grid */
    .rf-layout-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
    }
    @media (max-width: 1200px) {
      .rf-layout-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 600px) {
      .rf-layout-grid { grid-template-columns: 1fr; }
    }
    .rf-layout-card {
      background: #f8fafc;
      border: 1.5px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px 14px 12px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .rf-layout-card:hover {
      border-color: #93c5fd;
      background: #ffffff;
      transform: translateY(-2px);
      box-shadow: 0 6px 14px rgba(0, 80, 229, 0.06);
    }
    .rf-layout-card.selected {
      background: #f0f7ff;
      border-color: #0050e5;
      box-shadow: 0 0 0 1.5px #0050e5, 0 8px 18px rgba(0, 80, 229, 0.1);
    }
    .rf-layout-radio {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
    }
    .rf-radio-dot {
      font-size: 20px;
      color: #cbd5e1;
    }
    .rf-layout-card.selected .rf-radio-dot {
      color: #0050e5;
    }
    .rf-layout-badge {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 6px;
      letter-spacing: 0.02em;
    }
    .badge-green { background: #dcfce7; color: #166534; }
    .badge-purple { background: #f3e8ff; color: #6b21a8; }
    .badge-blue { background: #dbeafe; color: #1e40af; }
    .badge-amber { background: #fef3c7; color: #92400e; }
    .rf-layout-main { flex: 1; margin-bottom: 12px; }
    .rf-layout-icon-wrap {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 8px;
    }
    .bg-blue-subtle { background: #eff6ff; }
    .bg-purple-subtle { background: #faf5ff; }
    .bg-indigo-subtle { background: #eef2ff; }
    .bg-amber-subtle { background: #fffbeb; }
    .text-blue { color: #0050e5; }
    .text-purple { color: #9333ea; }
    .text-indigo { color: #4f46e5; }
    .text-amber { color: #d97706; }
    .text-green { color: #10b981; }
    .rf-layout-title {
      font-size: 13.5px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 4px;
    }
    .rf-layout-desc {
      font-size: 11.5px;
      color: #64748b;
      margin: 0;
      line-height: 1.4;
    }
    .rf-layout-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      padding-top: 10px;
      border-top: 1px dashed #e2e8f0;
    }
    .rf-btn-view-sample {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 0 10px;
      height: 28px;
      font-size: 11px;
      font-weight: 600;
      color: #334155;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .rf-btn-view-sample span.material-symbols-outlined { font-size: 14px; color: #0050e5; }
    .rf-btn-view-sample:hover {
      background: #eff6ff;
      border-color: #93c5fd;
      color: #0050e5;
    }
    .rf-btn-info-icon {
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      display: flex;
      align-items: center;
      padding: 4px;
      border-radius: 50%;
      transition: all 0.15s ease;
    }
    .rf-btn-info-icon:hover { color: #0050e5; background: #eff6ff; }
    .rf-btn-info-icon span { font-size: 18px; }

    /* Tooltip Popover */
    .rf-tooltip-popover {
      position: absolute;
      bottom: calc(100% + 8px);
      left: 8px;
      right: 8px;
      background: #0f172a;
      color: #ffffff;
      border-radius: 10px;
      padding: 10px 12px;
      font-size: 11px;
      z-index: 50;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
      line-height: 1.45;
    }
    .rf-tt-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
      color: #93c5fd;
      font-size: 11px;
    }
    .rf-tt-head button {
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 14px;
      cursor: pointer;
      padding: 0;
      line-height: 1;
    }
    .rf-tt-head button:hover { color: #ffffff; }

    /* Row 2 Policies Grid */
    .rf-row2-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }
    @media (max-width: 768px) {
      .rf-row2-grid { grid-template-columns: 1fr; }
    }
    .rf-row2-box {
      position: relative;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
    }
    .rf-row2-box.active {
      background: #f0fdf4;
      border-color: #bbf7d0;
    }
    .rf-toggle-label-wrap {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 2px;
    }
    .rf-btn-inline-info {
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      padding: 0;
    }
    .rf-btn-inline-info span { font-size: 15px; }
    .rf-btn-inline-info:hover { color: #0050e5; }

    /* Row 3 Default Category Block */
    .rf-default-category {
      background: #f8fafc;
      border: 1.5px solid #e2e8f0;
      border-radius: 14px;
      padding: 16px 18px;
      margin-bottom: 18px;
    }
    .rf-cat-head { margin-bottom: 12px; }
    .rf-cat-title-wrap {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }
    .rf-cat-badge-icon {
      background: #eff6ff;
      border-radius: 8px;
      padding: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .rf-cat-title-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 3px;
      flex-wrap: wrap;
    }
    .rf-cat-title {
      font-size: 14px;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
    }
    .rf-badge-system-locked {
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #cbd5e1;
      font-size: 10.5px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .rf-badge-system-locked span { font-size: 13px; }
    .rf-cat-subtitle {
      font-size: 12px;
      color: #64748b;
      margin: 0;
    }

    /* Core Built-in Table */
    .rf-core-table {
      display: flex;
      flex-direction: column;
      gap: 8px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 6px 12px;
    }
    .rf-core-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 9px 0;
      border-bottom: 1px solid #f1f5f9;
    }
    .rf-core-row:last-child { border-bottom: none; }
    .rf-core-info {
      display: flex;
      align-items: center;
      gap: 10px;
      flex: 1;
    }
    .rf-core-icon {
      color: #0050e5;
      font-size: 20px;
      background: #eff6ff;
      padding: 5px;
      border-radius: 6px;
    }
    .rf-core-info strong {
      display: block;
      font-size: 12.5px;
      color: #0f172a;
      font-weight: 700;
    }
    .rf-core-hint {
      display: block;
      font-size: 11px;
      color: #94a3b8;
    }
    .rf-core-controls {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .rf-badge-published {
      background: #dcfce7;
      color: #166534;
      font-size: 10.5px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 6px;
    }
    .rf-badge-unpub {
      background: #f1f5f9;
      color: #94a3b8;
      font-size: 10.5px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 6px;
    }
    .rf-btn-unpub {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 0 8px;
      height: 26px;
      font-size: 11px;
      font-weight: 600;
      color: #475569;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .rf-btn-unpub.is-active {
      background: #eff6ff;
      border-color: #93c5fd;
      color: #0050e5;
    }
    .rf-btn-unpub span.material-symbols-outlined { font-size: 13px; }
    .rf-lock-badge {
      background: #f8fafc;
      color: #94a3b8;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 2px 6px;
      font-size: 10px;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      gap: 3px;
    }
    .rf-lock-badge span.material-symbols-outlined { font-size: 12px; }

    /* Custom Hierarchy & Actions */
    .rf-custom-hierarchy-wrap { margin-top: 14px; }
    .rf-hierarchy-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 12px;
      flex-wrap: wrap;
    }
    .rf-hierarchy-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 800;
      color: #0f172a;
    }
    .rf-hierarchy-title span.material-symbols-outlined { color: #0050e5; font-size: 18px; }
    .rf-hierarchy-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .rf-sections-deck {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 14px;
    }
    .rf-section-group-box {
      background: #f8fafc;
      border: 1px dashed #cbd5e1;
      border-radius: 10px;
      padding: 10px 14px;
    }
    .rf-sec-group-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }
    .rf-sec-group-title {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
    }
    .rf-sec-badge-num {
      background: #0050e5;
      color: #ffffff;
      font-size: 10px;
      font-weight: 800;
      padding: 2px 7px;
      border-radius: 5px;
    }
    .rf-inline-sec-input {
      height: 30px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 0 8px;
      font-size: 12px;
      font-weight: 700;
      color: #0f172a;
      flex: 1;
      max-width: 320px;
    }
    .rf-sec-group-actions { display: flex; align-items: center; gap: 6px; }
    .rf-btn-sec-del {
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      padding: 4px;
    }
    .rf-btn-sec-del:hover { color: #dc2626; }
    .rf-btn-sec-del span { font-size: 18px; }

    /* Validation Badges on Field Item */
    .rf-badge-val {
      background: #e0e7ff;
      color: #3730a3;
      font-size: 10px;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 4px;
      letter-spacing: 0.02em;
    }
    .rf-badge-section {
      background: #f1f5f9;
      color: #334155;
      font-size: 10.5px;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 4px;
      display: inline-flex;
      align-items: center;
      gap: 3px;
    }
    .rf-badge-section span { font-size: 12px; }
    .rf-meta-err {
      color: #d97706;
      font-size: 10.5px;
      font-weight: 600;
      background: #fffbeb;
      padding: 1px 5px;
      border-radius: 4px;
    }

    /* Validation Box in Modal */
    .rf-validation-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px;
      margin: 4px 0;
    }
    .rf-val-header {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 10px;
    }
    .rf-val-header span.material-symbols-outlined { font-size: 18px; }
    .rf-val-title {
      font-size: 11px;
      font-weight: 800;
      color: #334155;
      letter-spacing: 0.05em;
    }

    /* Simulation Header Mode Tag */
    .rf-preview-mode-tag {
      font-size: 10px;
      font-weight: 800;
      color: #0050e5;
      background: #eff6ff;
      border: 1px solid #dbeafe;
      padding: 2px 8px;
      border-radius: 6px;
      letter-spacing: 0.04em;
    }

    /* Simulation Layout Styles */
    .rf-sim-section-box {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px;
      margin-bottom: 12px;
    }
    .rf-sim-sec-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11.5px;
      font-weight: 800;
      color: #1e293b;
      margin-bottom: 10px;
      padding-bottom: 6px;
      border-bottom: 1px solid #f1f5f9;
    }
    .rf-sim-sec-title span.material-symbols-outlined { font-size: 16px; color: #0050e5; }
    .rf-sim-save-continue {
      text-align: center;
      margin: 10px 0 4px;
    }
    .rf-save-link {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: #64748b;
      font-size: 11.5px;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .rf-save-link:hover { color: #0050e5; text-decoration: underline; }
    .rf-save-link span { font-size: 14px; }
    .rf-sim-alert-passwordless {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      padding: 8px 10px;
      font-size: 11px;
      color: #1e40af;
      margin-bottom: 10px;
    }
    .rf-sim-alert-passwordless span.material-symbols-outlined { font-size: 16px; color: #0050e5; }
    .rf-sim-page-header {
      margin-bottom: 12px;
    }
    .rf-sim-page-info {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 6px;
    }
    .rf-page-badge {
      font-size: 10px;
      font-weight: 800;
      color: #0050e5;
      background: #eff6ff;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .rf-page-title {
      font-size: 11.5px;
      color: #0f172a;
    }
    .rf-sim-page-progress {
      height: 4px;
      background: #e2e8f0;
      border-radius: 2px;
      overflow: hidden;
    }
    .rf-sim-progress-bar {
      height: 100%;
      background: #0050e5;
      transition: width 0.25s ease;
    }

    /* ======================================================== */
    /* WIREFRAME SAMPLE PREVIEW MODAL STYLES                     */
    /* ======================================================== */
    .rf-sample-modal {
      max-width: 740px !important;
    }
    .rf-sample-tabs {
      display: flex;
      gap: 4px;
      padding: 8px 24px 0;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      overflow-x: auto;
    }
    .rf-sample-tab {
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      padding: 10px 14px;
      font-size: 12px;
      font-weight: 700;
      color: #64748b;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
      white-space: nowrap;
    }
    .rf-sample-tab span.material-symbols-outlined { font-size: 16px; }
    .rf-sample-tab:hover { color: #0050e5; }
    .rf-sample-tab.active {
      color: #0050e5;
      border-bottom-color: #0050e5;
      background: #ffffff;
      border-radius: 8px 8px 0 0;
    }
    .rf-sample-body {
      padding: 20px 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .rf-wireframe-browser {
      background: #f8fafc;
      border: 1.5px solid #cbd5e1;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }
    .rf-wireframe-chrome {
      background: #e2e8f0;
      padding: 8px 14px;
      display: flex;
      align-items: center;
      gap: 14px;
      border-bottom: 1px solid #cbd5e1;
    }
    .rf-chrome-dots {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .dot {
      width: 9px;
      height: 9px;
      border-radius: 50%;
    }
    .dot.red { background: #ef4444; }
    .dot.yellow { background: #f59e0b; }
    .dot.green { background: #10b981; }
    .rf-chrome-url {
      flex: 1;
      background: #ffffff;
      border-radius: 6px;
      padding: 3px 10px;
      font-size: 11px;
      font-family: monospace;
      color: #475569;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .lock-icon { font-size: 13px; color: #10b981; }
    .rf-wireframe-screen {
      padding: 20px;
      background: #ffffff;
      min-height: 220px;
    }
    .rf-wf-content {
      max-width: 440px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .rf-wf-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      margin-bottom: 6px;
    }
    .rf-wf-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #dbeafe;
    }
    .rf-wf-title-bar {
      width: 140px;
      height: 12px;
      background: #0f172a;
      border-radius: 4px;
    }
    .rf-wf-sub-bar {
      width: 200px;
      height: 8px;
      background: #cbd5e1;
      border-radius: 4px;
    }
    .rf-wf-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .rf-wf-field-label {
      font-size: 9.5px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
    }
    .rf-wf-input {
      height: 26px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 5px;
    }
    .rf-wf-btn-primary {
      margin-top: 16px;
      height: 32px;
      background: #0050e5;
      color: #ffffff;
      font-size: 11px;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      letter-spacing: 0.04em;
    }
    .rf-wf-sec-card {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      margin-bottom: 6px;
    }
    .rf-wf-sec-header {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 6px;
    }
    .rf-wf-sec-num {
      width: 18px;
      height: 18px;
      border-radius: 4px;
      background: #0050e5;
      color: #ffffff;
      font-size: 9px;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .rf-wf-sec-title {
      font-size: 10.5px;
      font-weight: 800;
      color: #1e293b;
    }
    .rf-wf-stepper-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 4px;
      font-size: 10px;
      font-weight: 700;
      color: #94a3b8;
    }
    .rf-wf-step-node {
      padding: 3px 8px;
      border-radius: 6px;
      background: #f1f5f9;
    }
    .rf-wf-step-node.active {
      background: #0050e5;
      color: #ffffff;
    }
    .rf-wf-step-line {
      flex: 1;
      height: 2px;
      background: #e2e8f0;
    }
    .rf-wf-nav-row {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      margin-top: 14px;
    }
    .rf-wf-btn-back {
      flex: 1;
      height: 28px;
      background: #f1f5f9;
      color: #475569;
      border-radius: 5px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10.5px;
      font-weight: 700;
    }
    .rf-wf-btn-next {
      flex: 2;
      height: 28px;
      background: #0050e5;
      color: #ffffff;
      border-radius: 5px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10.5px;
      font-weight: 700;
    }
    .rf-wf-pages-indicator {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 10.5px;
      font-weight: 700;
      color: #0f172a;
    }
    .rf-wf-page-bar {
      height: 4px;
      background: #e2e8f0;
      border-radius: 2px;
      overflow: hidden;
    }
    .rf-wf-page-bar .fill {
      height: 100%;
      background: #0050e5;
    }
    .rf-wf-save-draft {
      font-size: 10.5px;
      font-weight: 600;
      color: #64748b;
      text-align: center;
      margin: 4px 0;
    }

    /* Insights Box */
    .rf-sample-insights {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px 16px;
    }
    .rf-insight-item {
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }
    .rf-insight-item span.material-symbols-outlined { font-size: 18px; }
    .rf-insight-item strong {
      display: block;
      font-size: 11px;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      margin-bottom: 2px;
      letter-spacing: 0.04em;
    }
    .rf-insight-item p {
      font-size: 11.5px;
      color: #64748b;
      margin: 0;
      line-height: 1.4;
    }

    /* Sample Modal Footer */
    .rf-sample-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      flex-wrap: wrap;
    }
    .rf-sample-active-notice {
      font-size: 12px;
      color: #475569;
    }
    .rf-sample-active-notice strong { color: #0050e5; }
    .rf-sample-btn-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
    }
  `]
})
export class RegistrationFormBuilderComponent implements OnInit {
  fields: RegistrationField[] = [];
  categories: UserCategory[] = [];
  loadingFields = false;

  policy: RegistrationPolicy = {
    allowPublicRegistration: true,
    requireApprovalBeforeLogin: false,
    registrationFormTitle: 'Create Your Account',
    registrationWelcomeMessage: 'Join our member directory and workspace portal.',
    registrationSuccessMessage: 'Registration successful! Welcome to the portal.',
    registrationUrlSlug: 'register',
    enableAffiliateReferralCode: true,
    defaultIndustrySector: 'Business & Enterprise',
    pageShellLayout: 'website',
    formLayoutMode: 'single',
    requirePassword: true,
    allowSaveAndContinue: false,
    unpublishedCoreFields: [],
    customSections: ['Business & Professional Details']
  };
  savingPolicy = false;

  // Card 3 State: Layout Modes & Samples
  activeSampleTab: 'single' | 'sections' | 'stepper' | 'pages' = 'single';
  showLayoutModal = false;
  showFullScreenPreview = false;
  activeTooltip: string | null = null;
  newSectionName = '';

  // Live simulation & interactive sandbox testing state
  simStep: number = 1;
  simulatedCategoryId: string | null = null;
  simShowReferral = false;
  simModel = {
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    customAnswers: {} as Record<string, any>,
    uploadedMockFiles: {} as Record<string, string>,
    reCaptchaChecked: true
  };
  simSubmitted = false;
  simDraftSaved = false;

  // Industry Template Gallery & Modal
  showTemplateModal = false;
  selectedTemplate: IndustryTemplate | null = null;
  applyTemplateMode: 'replace' | 'append' = 'replace';
  applyTemplateLayout = true;
  applyingTemplate = false;
  tplPreviewStep: number = 1;

  // Interactive sandbox test model for the template preview form
  tplTestSubmitted = false;
  tplTestModel = {
    firstName: 'Alex',
    lastName: 'Morgan',
    email: 'alex.morgan@company.com',
    password: 'Password123!',
    confirmPassword: 'Password123!',
    answers: {} as Record<string, any>
  };

  industryTemplates: IndustryTemplate[] = [
    {
      key: 'corporate',
      name: 'Corporate & Enterprise',
      description: 'Capture company details, job titles, organization size, and tax ID.',
      icon: 'apartment',
      color: '#0050e5',
      bgColor: '#eff6ff',
      fieldCount: 5,
      layoutMode: 'sections',
      layoutBadge: 'Category Sections',
      layoutName: 'Category Sections Flow',
      layoutReason: 'Splits personal credentials and corporate compliance into structured category cards.',
      sampleQuestions: [
        { label: 'Company / Organization Name', type: 'text', required: true, placeholder: 'e.g. Acme Global Corporation' },
        { label: 'Job Title / Role', type: 'text', required: true, placeholder: 'e.g. Managing Director' },
        { label: 'Organization Size', type: 'select', required: true, options: ['1-10 employees', '11-50 employees', '51-200 employees', '201-1000 employees', '1000+ employees'] },
        { label: 'Industry Sector', type: 'select', required: true, options: ['Technology & Software', 'Financial Services', 'Manufacturing', 'Consulting', 'Healthcare', 'Retail'] },
        { label: 'Company Registration / Tax ID', type: 'text', required: false, placeholder: 'e.g. RC-1234567' }
      ]
    },
    {
      key: 'education',
      name: 'Education & Academies',
      description: 'Student / Matriculation IDs, academic department, and study levels.',
      icon: 'school',
      color: '#059669',
      bgColor: '#ecfdf5',
      fieldCount: 5,
      layoutMode: 'stepper',
      layoutBadge: 'Step Stepper',
      layoutName: 'Step-by-Step Stepper Wizard',
      layoutReason: 'Guided step-by-step onboarding from department selection to guardian contacts.',
      sampleQuestions: [
        { label: 'Student / Matriculation ID', type: 'text', required: true, placeholder: 'e.g. STU-2026-0042' },
        { label: 'Level of Study', type: 'select', required: true, options: ['Undergraduate', 'Postgraduate (Master\'s)', 'Doctorate (Ph.D.)', 'Professional Diploma'] },
        { label: 'Faculty / Major Department', type: 'text', required: true, placeholder: 'e.g. Faculty of Engineering' },
        { label: 'Enrollment Academic Year', type: 'number', required: true, placeholder: 'e.g. 2026' },
        { label: 'Parent / Guardian Contact Phone', type: 'text', required: false, placeholder: 'e.g. +0 (000) 000-0000' }
      ]
    },
    {
      key: 'healthcare',
      name: 'Healthcare & Fitness',
      description: 'Emergency contacts, medical disclosures, blood group, and waiver.',
      icon: 'health_and_safety',
      color: '#dc2626',
      bgColor: '#fef2f2',
      fieldCount: 6,
      layoutMode: 'pages',
      layoutBadge: 'Multi-Page',
      layoutName: 'Page-by-Page Multi-Page Form',
      layoutReason: 'Dedicates clean pages for sensitive medical disclosures, blood group, and liability consent.',
      sampleQuestions: [
        { label: 'Emergency Contact Full Name', type: 'text', required: true, placeholder: 'e.g. First Last' },
        { label: 'Emergency Contact Phone', type: 'text', required: true, placeholder: 'e.g. +0 (000) 000-0000' },
        { label: 'Date of Birth', type: 'date', required: true },
        { label: 'Blood Group', type: 'select', required: false, options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
        { label: 'Medical Conditions / Disclosures', type: 'textarea', required: false, placeholder: 'List any allergies or medical history...' },
        { label: 'Health & Safety Liability Waiver', type: 'checkbox', required: true, placeholder: 'I agree to the liability waiver and safety guidelines' }
      ]
    },
    {
      key: 'alumni',
      name: 'Alumni & Communities',
      description: 'Graduation class year, qualification earned, city, and LinkedIn.',
      icon: 'groups',
      color: '#7c3aed',
      bgColor: '#f5f3ff',
      fieldCount: 5,
      layoutMode: 'sections',
      layoutBadge: 'Category Sections',
      layoutName: 'Category Sections Flow',
      layoutReason: 'Organizes academic graduating pedigree, professional roles, and mentorship networking.',
      sampleQuestions: [
        { label: 'Graduation Class Year', type: 'number', required: true, placeholder: 'e.g. 2022' },
        { label: 'Degree / Qualification Earned', type: 'text', required: true, placeholder: 'e.g. B.Sc. Mechanical Engineering' },
        { label: 'Current Chapter / City', type: 'text', required: true, placeholder: 'e.g. London / United Kingdom' },
        { label: 'LinkedIn Profile URL', type: 'text', required: false, placeholder: 'e.g. https://linkedin.com/in/username' },
        { label: 'Alumni Mentorship Participation', type: 'select', required: true, options: ['Open to Mentoring Students', 'Seeking a Mentor', 'Networking Only', 'Not at this time'] }
      ]
    },
    {
      key: 'events',
      name: 'Events & Conferences',
      description: 'Attendance mode, dietary preferences, swag size, and institution.',
      icon: 'confirmation_number',
      color: '#d97706',
      bgColor: '#fffbeb',
      fieldCount: 4,
      layoutMode: 'stepper',
      layoutBadge: 'Step Stepper',
      layoutName: 'Step-by-Step Stepper Wizard',
      layoutReason: 'Sequences ticket credentials, conference swag preferences, and dietary requirements.',
      sampleQuestions: [
        { label: 'Organization / Institution Affiliation', type: 'text', required: true, placeholder: 'e.g. TechHub Summit Team' },
        { label: 'Attendance Mode', type: 'select', required: true, options: ['In-Person Delegate', 'Virtual / Livestream Access', 'Speaker / Panelist', 'VIP Guest'] },
        { label: 'Dietary Preferences', type: 'select', required: true, options: ['Standard / No Restrictions', 'Vegetarian', 'Vegan', 'Halal', 'Kosher', 'Gluten-Free'] },
        { label: 'Conference T-Shirt Size', type: 'select', required: false, options: ['Small (S)', 'Medium (M)', 'Large (L)', 'Extra Large (XL)', '2XL'] }
      ]
    },
    {
      key: 'nonprofit',
      name: 'Non-Profit & Volunteers',
      description: 'Volunteer program areas, weekly availability, and skills.',
      icon: 'volunteer_activism',
      color: '#db2777',
      bgColor: '#fdf2f8',
      fieldCount: 3,
      layoutMode: 'single',
      layoutBadge: 'Single Page',
      layoutName: 'Single Page Velocity Stream',
      layoutReason: 'Welcoming, frictionless volunteer intake on a single engaging page.',
      sampleQuestions: [
        { label: 'Preferred Volunteer Program Area', type: 'select', required: true, options: ['Community Outreach & Relief', 'Youth Education & Tutoring', 'Event Coordination', 'Fundraising & Donor Care'] },
        { label: 'Weekly Availability', type: 'select', required: true, options: ['1-3 hours / week', '4-8 hours / week', 'Weekends Only', 'Ad-hoc / On-Call'] },
        { label: 'Special Skills & Certifications', type: 'textarea', required: false, placeholder: 'e.g. First Aid Certified, Spanish Fluency, Graphic Design' }
      ]
    },
    {
      key: 'saas',
      name: 'Technology & SaaS Startups',
      description: 'Developer role, cloud provider, programming stack, and workspace team size.',
      icon: 'code',
      color: '#0284c7',
      bgColor: '#f0f9ff',
      fieldCount: 4,
      layoutMode: 'single',
      layoutBadge: 'Single Page',
      layoutName: 'Single Page Velocity Stream',
      layoutReason: 'High-velocity developer signups with zero friction in a single stream.',
      sampleQuestions: [
        { label: 'Developer / Engineering Role', type: 'select', required: true, options: ['Full-Stack Engineer', 'Frontend Engineer', 'Backend / Systems Engineer', 'DevOps / Cloud Architect', 'Product Manager / Designer'] },
        { label: 'Primary Programming Stack', type: 'text', required: true, placeholder: 'e.g. TypeScript, Node.js, C#, Python' },
        { label: 'Cloud Infrastructure Provider', type: 'select', required: true, options: ['Amazon Web Services (AWS)', 'Google Cloud Platform (GCP)', 'Microsoft Azure', 'Cloudflare / Edge'] },
        { label: 'Engineering Team Size', type: 'select', required: false, options: ['Solo Founder / Dev', '2-5 Engineers', '6-20 Engineers', '20+ Engineers'] }
      ]
    },
    {
      key: 'realestate',
      name: 'Real Estate & Properties',
      description: 'Brokerage license, coverage territories, agency affiliation, and MLS board.',
      icon: 'real_estate_agent',
      color: '#0d9488',
      bgColor: '#f0fdfa',
      fieldCount: 4,
      layoutMode: 'pages',
      layoutBadge: 'Multi-Page',
      layoutName: 'Page-by-Page Multi-Page Form',
      layoutReason: 'Vets realtor licenses, regional territory, and brokerage affiliation across sequential pages.',
      sampleQuestions: [
        { label: 'Realtor / Broker License Number', type: 'text', required: true, placeholder: 'e.g. RE-LIC-984210' },
        { label: 'Agency / Brokerage Firm', type: 'text', required: true, placeholder: 'e.g. Skyline Realty Partners' },
        { label: 'Primary Geographic Territory', type: 'text', required: true, placeholder: 'e.g. Greater Metropolitan Area' },
        { label: 'Real Estate Specialty', type: 'select', required: false, options: ['Residential Sales', 'Commercial & Industrial', 'Property Management', 'Luxury Real Estate'] }
      ]
    }
  ];

  /**
   * Scrolls the horizontal 1-line industry templates container smoothly.
   * @param container HTML scroll container element.
   * @param direction Scroll direction ('left' or 'right').
   */
  scrollTemplates(container: HTMLElement, direction: 'left' | 'right'): void {
    if (!container) return;
    const delta = direction === 'left' ? -220 : 220;
    container.scrollBy({ left: delta, behavior: 'smooth' });
  }

  get liveRegistrationUrl(): string {
    const slug = (this.policy.registrationUrlSlug || 'register').trim();
    return `${window.location.origin}/auth/${slug}`;
  }

  sanitizeSlug(): void {
    if (!this.policy.registrationUrlSlug) return;
    this.policy.registrationUrlSlug = this.policy.registrationUrlSlug
      .toLowerCase()
      .replace(/[\/\\]/g, '')
      .replace(/\s+/g, '-');
  }

  copyLiveUrl(): void {
    navigator.clipboard.writeText(this.liveRegistrationUrl).then(() => {
      this.toast.success(`Copied live link to clipboard!`);
    });
  }

  openTemplatePreview(tpl: IndustryTemplate): void {
    this.selectedTemplate = tpl;
    this.applyTemplateMode = 'replace';
    this.applyTemplateLayout = true;
    this.tplPreviewStep = 1;
    this.tplTestSubmitted = false;
    const domain = tpl.key === 'education' ? 'institution.edu'
      : tpl.key === 'healthcare' ? 'care.health'
      : tpl.key === 'saas' ? 'techstart.io'
      : tpl.key === 'realestate' ? 'primeprop.com'
      : tpl.key === 'fitness' ? 'fitclub.org'
      : tpl.key === 'legal' ? 'legalpartners.law'
      : 'company.com';
    this.tplTestModel = {
      firstName: 'Alex',
      lastName: 'Morgan',
      email: `alex.morgan@${domain}`,
      password: 'Password123!',
      confirmPassword: 'Password123!',
      answers: {}
    };
    // Pre-populate sample answers for the archetype questions automatically
    this.autoFillTplTest(false);
    this.showTemplateModal = true;
  }

  /**
   * Auto-fills the template preview modal with realistic sample answers
   * tailored to the chosen industry sector archetype.
   * @param showToast Whether to display an inline feedback toast notification.
   */
  autoFillTplTest(showToast: boolean = true): void {
    if (!this.selectedTemplate) return;

    const domain = this.selectedTemplate.key === 'education' ? 'institution.edu'
      : this.selectedTemplate.key === 'healthcare' ? 'care.health'
      : this.selectedTemplate.key === 'saas' ? 'techstart.io'
      : this.selectedTemplate.key === 'realestate' ? 'primeprop.com'
      : this.selectedTemplate.key === 'fitness' ? 'fitclub.org'
      : this.selectedTemplate.key === 'legal' ? 'legalpartners.law'
      : 'company.com';

    this.tplTestModel.firstName = 'Alex';
    this.tplTestModel.lastName = 'Morgan';
    this.tplTestModel.email = `alex.morgan@${domain}`;
    this.tplTestModel.password = 'Password123!';
    this.tplTestModel.confirmPassword = 'Password123!';

    if (!this.tplTestModel.answers) {
      this.tplTestModel.answers = {};
    }

    for (const q of this.selectedTemplate.sampleQuestions) {
      if (q.type === 'select') {
        this.tplTestModel.answers[q.label] = (q.options && q.options.length > 0)
          ? q.options[0]
          : 'Standard Tier';
      } else if (q.type === 'checkbox') {
        this.tplTestModel.answers[q.label] = true;
      } else if (q.type === 'number') {
        this.tplTestModel.answers[q.label] = 50;
      } else if (q.type === 'textarea') {
        this.tplTestModel.answers[q.label] = `Sample ${q.label} verification description for member profile.`;
      } else {
        this.tplTestModel.answers[q.label] = q.placeholder ? q.placeholder.replace(/^e\.g\.\s*/i, '') : `Sample ${q.label}`;
      }
    }

    if (showToast) {
      this.toast.success(`Auto-filled sample answers for ${this.selectedTemplate.name}!`);
    }
  }

  closeTemplateModal(): void {
    this.showTemplateModal = false;
    this.selectedTemplate = null;
    this.tplPreviewStep = 1;
    this.tplTestSubmitted = false;
  }

  /**
   * Simulates form submission inside the template preview studio so the administrator
   * can experience the exact verification, confirmation, and success screen.
   */
  simulateTplSubmit(): void {
    if (!this.tplTestModel.firstName.trim()) {
      this.toast.warning('Test Validation: Please enter a First Name.');
      return;
    }
    if (!this.tplTestModel.lastName.trim()) {
      this.toast.warning('Test Validation: Please enter a Last Name.');
      return;
    }
    if (!this.tplTestModel.email.trim() || !this.tplTestModel.email.includes('@')) {
      this.toast.warning('Test Validation: Please enter a valid email address.');
      return;
    }
    this.tplTestSubmitted = true;
    this.toast.success(`Simulation test passed for ${this.selectedTemplate?.name}!`);
  }

  /**
   * Resets the template preview interactive test sandbox back to initial form state.
   */
  resetTplTest(): void {
    this.tplTestSubmitted = false;
    this.tplPreviewStep = 1;
    this.tplTestModel.firstName = '';
    this.tplTestModel.lastName = '';
    this.tplTestModel.email = '';
    this.tplTestModel.answers = {};
    this.toast.info('Test form reset. You can test entering details or auto-fill again.');
  }

  applyIndustryTemplate(): void {
    if (!this.selectedTemplate) return;

    this.applyingTemplate = true;
    this.api.post<any>('RegistrationFormApi/apply-template', {
      templateKey: this.selectedTemplate.key,
      mode: this.applyTemplateMode,
      layoutMode: this.selectedTemplate.layoutMode,
      applyLayoutMode: this.applyTemplateLayout
    }).subscribe({
      next: (res) => {
        this.applyingTemplate = false;
        if (this.applyTemplateLayout && this.selectedTemplate) {
          this.policy.formLayoutMode = this.selectedTemplate.layoutMode;
        }
        this.toast.success(`Applied ${this.selectedTemplate?.name} template & ${this.selectedTemplate?.layoutName} layout successfully!`);
        this.closeTemplateModal();
        this.loadFields();
        this.loadPolicy();
        this.broadcastFormUpdate();
      },
      error: (err) => {
        this.applyingTemplate = false;
        this.toast.error(err?.error?.message || 'Failed to apply industry template.');
      }
    });
  }

  // Modal State
  showModal = false;
  editingFieldId: string | null = null;
  savingField = false;
  newOptionText = '';

  modalField = {
    label: '',
    fieldKey: '',
    placeholder: '',
    fieldType: 'text',
    options: [] as string[],
    isRequired: false,
    sortOrder: 0,
    isActive: true,
    bcpUserCategoryId: null as string | null,
    helpText: '',
    showInWorkspaceProfile: true,
    sectionName: '',
    minLength: null as number | null,
    maxLength: null as number | null,
    patternRegex: '',
    customErrorMessage: ''
  };

  constructor(
    private api: ApiService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.loadPolicy();
    this.loadCategories();
    this.loadFields();
  }

  loadPolicy(): void {
    this.api.get<any>('RegistrationFormApi/policy').subscribe({
      next: (res) => {
        if (res?.data) {
          this.policy = { ...this.policy, ...res.data };
        }
      },
      error: () => {}
    });
  }

  /**
   * Switches the outer Page Shell Layout ('website' | 'auth') and persists it immediately.
   * @param shell Target outer shell layout ('website' | 'auth').
   */
  selectPageShellLayout(shell: 'website' | 'auth'): void {
    if ((this.policy.pageShellLayout || 'website') === shell) return;
    this.policy.pageShellLayout = shell;
    this.savePolicy(true);
  }

  /**
   * Switches the form presentation layout mode and persists it to the tenant database immediately.
   * @param mode Target layout presentation format ('single' | 'sections' | 'stepper' | 'pages').
   */
  selectLayoutMode(mode: 'single' | 'sections' | 'stepper' | 'pages'): void {
    if (this.policy.formLayoutMode === mode) return;
    this.policy.formLayoutMode = mode;
    this.savePolicy(true);
  }

  /**
   * Persists onboarding policy configuration, layout mode, and security rules to the database.
   * @param fromLayoutClick Flag indicating whether save was triggered by clicking a layout card.
   */
  savePolicy(fromLayoutClick = false): void {
    this.savingPolicy = true;
    this.api.put<any>('RegistrationFormApi/policy', this.policy).subscribe({
      next: () => {
        this.savingPolicy = false;
        this.broadcastFormUpdate();
        if (fromLayoutClick) {
          const names: Record<string, string> = {
            single: 'Single Page Form',
            sections: 'Single Page + Categories',
            stepper: 'Step-by-Step Wizard',
            pages: 'Page-by-Page Form'
          };
          this.toast.success(`Form layout switched to "${names[this.policy.formLayoutMode] || this.policy.formLayoutMode}" and saved live.`);
        } else {
          this.toast.success('Registration policies and layout saved successfully.');
        }
      },
      error: (err) => {
        this.savingPolicy = false;
        this.toast.error(err?.error?.message || 'Could not save policy settings.');
      }
    });
  }

  loadCategories(): void {
    this.api.get<any>('UsersApi/categories').subscribe({
      next: (res) => {
        this.categories = res?.data || [];
      },
      error: () => {}
    });
  }

  loadFields(): void {
    this.loadingFields = true;
    this.api.get<any>('RegistrationFormApi/fields').subscribe({
      next: (res) => {
        this.loadingFields = false;
        this.fields = res?.data || [];
      },
      error: (err) => {
        this.loadingFields = false;
        this.toast.error(err?.error?.message || 'Could not load registration form fields.');
      }
    });
  }

  get filteredSimFields(): RegistrationField[] {
    return this.fields.filter(f => {
      if (!f.isActive) return false;
      if (!f.bcpUserCategoryId) return true; // Global field
      return f.bcpUserCategoryId === this.simulatedCategoryId;
    });
  }

  openCreateModal(): void {
    this.editingFieldId = null;
    this.modalField = {
      label: '',
      fieldKey: '',
      placeholder: '',
      fieldType: 'text',
      options: [],
      isRequired: false,
      sortOrder: this.fields.length + 1,
      isActive: true,
      bcpUserCategoryId: null,
      helpText: '',
      showInWorkspaceProfile: true,
      sectionName: '',
      minLength: null,
      maxLength: null,
      patternRegex: '',
      customErrorMessage: ''
    };
    this.newOptionText = '';
    this.showModal = true;
  }

  openEditModal(field: RegistrationField): void {
    this.editingFieldId = field.id;
    this.modalField = {
      label: field.label,
      fieldKey: field.fieldKey,
      placeholder: field.placeholder || '',
      fieldType: field.fieldType,
      options: field.options ? [...field.options] : [],
      isRequired: field.isRequired,
      sortOrder: field.sortOrder,
      isActive: field.isActive,
      bcpUserCategoryId: field.bcpUserCategoryId || null,
      helpText: field.helpText || '',
      showInWorkspaceProfile: field.showInWorkspaceProfile,
      sectionName: field.sectionName || '',
      minLength: field.minLength ?? null,
      maxLength: field.maxLength ?? null,
      patternRegex: field.patternRegex || '',
      customErrorMessage: field.customErrorMessage || ''
    };
    this.newOptionText = '';
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  onLabelChange(): void {
    if (!this.editingFieldId && this.modalField.label) {
      this.modalField.fieldKey = this.modalField.label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
    }
  }

  addOption(): void {
    const opt = (this.newOptionText || '').trim();
    if (opt && !this.modalField.options.includes(opt)) {
      this.modalField.options.push(opt);
      this.newOptionText = '';
    }
  }

  removeOption(idx: number): void {
    this.modalField.options.splice(idx, 1);
  }

  saveField(): void {
    if (!this.modalField.label.trim()) {
      this.toast.error('Question Label is required.');
      return;
    }

    this.savingField = true;
    if (this.editingFieldId) {
      this.api.put<any>(`RegistrationFormApi/fields/${this.editingFieldId}`, this.modalField).subscribe({
        next: () => {
          this.savingField = false;
          this.toast.success('Question updated successfully.');
          this.closeModal();
          this.loadFields();
          this.broadcastFormUpdate();
        },
        error: (err) => {
          this.savingField = false;
          this.toast.error(err?.error?.message || 'Could not update question.');
        }
      });
    } else {
      this.api.post<any>('RegistrationFormApi/fields', this.modalField).subscribe({
        next: () => {
          this.savingField = false;
          this.toast.success('Custom question added to registration form.');
          this.closeModal();
          this.loadFields();
          this.broadcastFormUpdate();
        },
        error: (err) => {
          this.savingField = false;
          this.toast.error(err?.error?.message || 'Could not create question.');
        }
      });
    }
  }

  /**
   * Soft-toggles question active state without deleting historical registrant answers.
   * When deactivated, the question is excluded from public registration for new applicants,
   * while all existing member answers remain safely preserved in their account profiles.
   */
  toggleFieldActive(field: RegistrationField): void {
    const previousState = field.isActive;
    const newState = !previousState;
    field.isActive = newState;

    const payload = {
      label: field.label,
      fieldKey: field.fieldKey,
      placeholder: field.placeholder || '',
      fieldType: field.fieldType,
      options: field.options ? [...field.options] : [],
      isRequired: field.isRequired,
      sortOrder: field.sortOrder,
      isActive: newState,
      bcpUserCategoryId: field.bcpUserCategoryId || null,
      helpText: field.helpText || '',
      showInWorkspaceProfile: field.showInWorkspaceProfile,
      sectionName: field.sectionName || '',
      minLength: field.minLength ?? null,
      maxLength: field.maxLength ?? null,
      patternRegex: field.patternRegex || '',
      customErrorMessage: field.customErrorMessage || ''
    };

    this.api.put<any>(`RegistrationFormApi/fields/${field.id}`, payload).subscribe({
      next: () => {
        this.broadcastFormUpdate();
        this.toast.success(
          newState
            ? `Question "${field.label}" is now active and visible to new registrants.`
            : `Question "${field.label}" is disabled. Hidden from new applicants while preserving historical member records.`
        );
      },
      error: (err) => {
        field.isActive = previousState;
        this.toast.error(err?.error?.message || 'Could not update question status.');
      }
    });
  }

  deleteField(field: RegistrationField): void {
    if (confirm(`Are you sure you want to remove the question "${field.label}" from the registration form?`)) {
      this.api.delete<any>(`RegistrationFormApi/fields/${field.id}`).subscribe({
        next: () => {
          this.toast.success('Question removed.');
          this.loadFields();
          this.broadcastFormUpdate();
        },
        error: (err) => {
          this.toast.error(err?.error?.message || 'Could not remove question.');
        }
      });
    }
  }

  moveFieldUp(index: number): void {
    if (index <= 0) return;
    const temp = this.fields[index];
    this.fields[index] = this.fields[index - 1];
    this.fields[index - 1] = temp;
    this.persistOrder();
  }

  moveFieldDown(index: number): void {
    if (index >= this.fields.length - 1) return;
    const temp = this.fields[index];
    this.fields[index] = this.fields[index + 1];
    this.fields[index + 1] = temp;
    this.persistOrder();
  }

  private persistOrder(): void {
    const orders = this.fields.map((f, idx) => ({
      fieldId: f.id,
      sortOrder: idx + 1
    }));
    this.api.put<any>('RegistrationFormApi/fields/reorder', orders).subscribe({
      next: () => {
        this.broadcastFormUpdate();
      },
      error: () => {}
    });
  }

  /**
   * Broadcasts a real-time notification across tabs/components whenever the registration form policy,
   * layout style, or fields are updated so live previews (e.g. Workforce Enroll) refresh immediately.
   */
  private broadcastFormUpdate(): void {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('ozikol_reg_form_updated_at', Date.now().toString());
        if ('BroadcastChannel' in window) {
          const ch = new BroadcastChannel('ozikol_reg_form_sync');
          ch.postMessage({ updatedAt: Date.now(), policy: this.policy });
          ch.close();
        }
      }
    } catch {}
  }

  getFieldTypeIcon(type: string): string {
    switch (type) {
      case 'select': return 'arrow_drop_down_circle';
      case 'file': return 'attach_file';
      case 'date': return 'calendar_month';
      case 'number': return 'pin';
      case 'textarea': return 'notes';
      case 'checkbox': return 'check_box';
      default: return 'edit_note';
    }
  }

  getFieldTypeLabel(type: string): string {
    switch (type) {
      case 'select': return 'Select Dropdown';
      case 'file': return 'File Upload';
      case 'date': return 'Date Picker';
      case 'number': return 'Numeric Input';
      case 'textarea': return 'Multiline Text';
      case 'checkbox': return 'Checkbox';
      default: return 'Short Text';
    }
  }

  /**
   * Toggles the inline contextual tooltip popover for a specific presentation or security card.
   * @param key Identifier for the tooltip card ('single', 'sections', 'stepper', 'pages', 'pwd', 'continue').
   * @param event DOM click event to halt bubbling.
   */
  toggleTooltip(key: string, event: Event): void {
    event.stopPropagation();
    this.activeTooltip = this.activeTooltip === key ? null : key;
  }

  /**
   * Opens the interactive wireframe sample preview modal pre-selected to the given layout mode.
   * @param mode Target layout presentation format to inspect.
   * @param event Optional DOM event to prevent event propagation.
   */
  openLayoutSample(mode: 'single' | 'sections' | 'stepper' | 'pages', event?: Event): void {
    if (event) event.stopPropagation();
    this.activeSampleTab = mode;
    this.showLayoutModal = true;
  }

  /**
   * Opens the full-screen desktop preview popup modal for the selected page shell layout.
   * @param shell Optional shell layout ('website' | 'auth') to select before opening.
   * @param event Optional DOM event to stop propagation.
   */
  openFullScreenPreview(shell?: 'website' | 'auth', event?: Event): void {
    if (event) event.stopPropagation();
    if (shell) {
      this.selectPageShellLayout(shell);
    }
    this.showFullScreenPreview = true;
  }

  /**
   * Closes the interactive wireframe layout sample modal.
   */
  closeLayoutModal(): void {
    this.showLayoutModal = false;
  }

  /**
   * Applies the selected wireframe layout mode directly to the organization's registration policy.
   * @param mode Selected presentation layout mode.
   */
  applyLayoutFromSample(mode: 'single' | 'sections' | 'stepper' | 'pages'): void {
    this.policy.formLayoutMode = mode;
    this.closeLayoutModal();
    this.savePolicy();
    this.toast.success(`Applied ${this.getLayoutName(mode)} layout to your registration flow.`);
  }

  /**
   * Resolves the human-readable display name for a layout mode key.
   * @param mode Layout mode key ('single' | 'sections' | 'stepper' | 'pages').
   * @returns Friendly title of the presentation layout.
   */
  getLayoutName(mode: string): string {
    switch (mode) {
      case 'sections': return 'Single Page with Category Sections';
      case 'stepper': return 'Step-by-Step Stepper Wizard';
      case 'pages': return 'Page-by-Page Multi-Page Form';
      default: return 'Single Page Form';
    }
  }

  /**
   * Resolves a concise badge title for the live simulation preview bar.
   * @param mode Layout mode key.
   * @returns Short subtitle for the active simulation header.
   */
  getLayoutTitle(mode: string): string {
    switch (mode) {
      case 'sections': return 'Categories / Sections Flow';
      case 'stepper': return 'Step-by-Step Wizard Flow';
      case 'pages': return 'Page-by-Page Sequence';
      default: return 'Single Page Velocity Flow';
    }
  }

  /**
   * Checks whether a built-in core field (phone or category) is currently published on the public form.
   * @param key Core field key to test ('phone' | 'category').
   * @returns True if the field is published; false if hidden by the workspace administrator.
   */
  isCoreFieldPublished(key: string): boolean {
    if (!this.policy.unpublishedCoreFields) return true;
    return !this.policy.unpublishedCoreFields.includes(key);
  }

  /**
   * Toggles the published/unpublished visibility state of an optional core identity field.
   * System-protected fields cannot be deleted from the database schema, but can be hidden from registrants.
   * @param key Core field key to toggle ('phone' | 'category').
   */
  toggleCoreFieldPublish(key: string): void {
    if (!this.policy.unpublishedCoreFields) {
      this.policy.unpublishedCoreFields = [];
    }
    const idx = this.policy.unpublishedCoreFields.indexOf(key);
    if (idx >= 0) {
      // Re-publish the field
      this.policy.unpublishedCoreFields.splice(idx, 1);
      this.toast.success(`Published core field "${key}".`);
    } else {
      // Unpublish (hide) the field
      this.policy.unpublishedCoreFields.push(key);
      this.toast.info(`Unpublished (hidden) core field "${key}".`);
    }
    // Persist updated policy to backend
    this.savePolicy();
  }

  /**
   * Displays an interactive browser prompt to add a new category section or step stage.
   */
  promptAddSection(): void {
    if (!this.policy.customSections) {
      this.policy.customSections = [];
    }
    const nextNum = this.policy.customSections.length + 2;
    const defaultLabel = this.policy.formLayoutMode === 'sections'
      ? `Category ${nextNum}: Additional Information`
      : `Step ${nextNum}: Additional Stage`;
    const label = prompt('Enter title for new category section or step:', defaultLabel);
    if (label && label.trim()) {
      this.policy.customSections.push(label.trim());
      this.savePolicy();
      this.toast.success(`Added "${label.trim()}" to form hierarchy.`);
    }
  }

  /**
   * Removes a custom category section or step stage from the policy hierarchy.
   * @param index Zero-based index of the custom section to remove.
   */
  removeCategorySection(index: number): void {
    if (!this.policy.customSections || index < 0 || index >= this.policy.customSections.length) return;
    const name = this.policy.customSections[index];
    if (confirm(`Remove "${name}"? Any questions assigned to this section will remain in the form as unassigned.`)) {
      this.policy.customSections.splice(index, 1);
      this.savePolicy();
      this.toast.info(`Removed "${name}".`);
    }
  }

  /**
   * Opens the question creator drawer with the section name pre-populated.
   * @param secName Name of the section or step stage to pre-fill.
   */
  openCreateModalForSection(secName: string): void {
    this.openCreateModal();
    this.modalField.sectionName = secName;
  }

  /**
   * Resolves the human-readable display name for the currently selected category in the simulation.
   * @returns Friendly category tier label or default standard tier.
   */
  getSimCategoryName(): string {
    if (!this.simulatedCategoryId) return 'Standard Member';
    const cat = this.categories.find(c => c.id === this.simulatedCategoryId);
    return cat ? cat.name : 'Standard Member';
  }

  /**
   * Computes the number of custom dynamic fields that have been answered in the simulation test.
   * @returns Count of completed custom attributes.
   */
  getFilledAttributesCount(): number {
    let count = 0;
    if (this.simModel.customAnswers) {
      for (const key of Object.keys(this.simModel.customAnswers)) {
        const val = this.simModel.customAnswers[key];
        if (val !== undefined && val !== null && val !== '') {
          count++;
        }
      }
    }
    if (this.simModel.uploadedMockFiles) {
      count += Object.keys(this.simModel.uploadedMockFiles).length;
    }
    return count;
  }

  /**
   * Simulates a successful applicant file upload without hitting physical cloud storage.
   * Stores a mock document reference in the local simulation test model.
   * @param fieldKey Unique key of the file question field.
   * @param event Optional DOM event.
   */
  simulateFileUpload(fieldKey: string, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (this.simModel.uploadedMockFiles[fieldKey]) {
      delete this.simModel.uploadedMockFiles[fieldKey];
      this.toast.info('Removed simulated document.');
    } else {
      const mockFileName = `applicant_document_${fieldKey.substring(0, 8)}.pdf`;
      this.simModel.uploadedMockFiles[fieldKey] = mockFileName;
      this.toast.success(`Simulated upload attached: ${mockFileName}`);
    }
  }

  /**
   * Simulates form submission for test/preview purposes without creating accounts in the database.
   * Validates mandatory inputs and transitions the simulation preview to the celebratory test result card.
   */
  testSubmitSimulation(): void {
    // Basic client-side test validation
    if (!this.simModel.firstName.trim()) {
      this.toast.warning('Test Validation: Please enter a First Name.');
      return;
    }
    if (!this.simModel.lastName.trim()) {
      this.toast.warning('Test Validation: Please enter a Last Name.');
      return;
    }
    if (!this.simModel.email.trim() || !this.simModel.email.includes('@')) {
      this.toast.warning('Test Validation: Please provide a valid email address.');
      return;
    }
    if (this.policy.requirePassword && !this.simModel.password) {
      this.toast.warning('Test Validation: Please enter a password.');
      return;
    }
    if (this.policy.requirePassword && this.simModel.password !== this.simModel.confirmPassword) {
      this.toast.warning('Test Validation: Passwords do not match.');
      return;
    }

    this.simDraftSaved = false;
    this.simSubmitted = true;
    this.toast.success('Simulation test passed! Review the captured onboarding summary.');
  }

  /**
   * Simulates saving the registration application as a draft for later resumption.
   */
  testSaveDraftSimulation(): void {
    this.simDraftSaved = true;
    this.toast.info('Simulated Draft: Application state captured. In production, a resumption link is sent via email.');
  }

  /**
   * Auto-fills the interactive sandbox preview with realistic sample applicant data
   * and custom questions so the administrator can test the complete end-to-end flow
   * with 1 click without manually typing mock inputs.
   */
  autoFillSimulation(): void {
    this.simModel = {
      firstName: 'Jordan',
      lastName: 'Taylor',
      email: 'jordan.taylor@company.com',
      password: 'SecurePass123!',
      confirmPassword: 'SecurePass123!',
      phone: '+1 (555) 349-2041',
      customAnswers: {},
      uploadedMockFiles: {},
      reCaptchaChecked: true
    };

    if (this.categories && this.categories.length > 0) {
      this.simulatedCategoryId = this.categories[0].id;
    }

    // Populate realistic answers for all custom questions in the builder
    for (const f of this.fields) {
      if (f.fieldType === 'select') {
        this.simModel.customAnswers[f.fieldKey] = (f.options && f.options.length > 0)
          ? f.options[0]
          : 'Executive Option';
      } else if (f.fieldType === 'checkbox') {
        this.simModel.customAnswers[f.fieldKey] = true;
      } else if (f.fieldType === 'date') {
        this.simModel.customAnswers[f.fieldKey] = '2026-10-15';
      } else if (f.fieldType === 'number') {
        this.simModel.customAnswers[f.fieldKey] = 250;
      } else if (f.fieldType === 'textarea') {
        this.simModel.customAnswers[f.fieldKey] = 'Sample operational statement providing required business background.';
      } else if (f.fieldType === 'file') {
        this.simModel.uploadedMockFiles[f.fieldKey] = `applicant_document_${f.fieldKey.substring(0, 8)}.pdf`;
      } else {
        this.simModel.customAnswers[f.fieldKey] = f.placeholder ? f.placeholder.replace(/^e\.g\.\s*/i, '') : `Sample ${f.label}`;
      }
    }

    this.simSubmitted = false;
    this.simDraftSaved = false;
    this.toast.success('Auto-filled sandbox preview with sample test data! You can test submission.');
  }

  /**
   * Resets all entered simulation test values back to initial empty sandbox state.
   */
  resetSimulation(): void {
    this.simModel = {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      phone: '',
      customAnswers: {},
      uploadedMockFiles: {},
      reCaptchaChecked: true
    };
    this.simStep = 1;
    this.simSubmitted = false;
    this.simDraftSaved = false;
    this.toast.info('Interactive sandbox preview reset.');
  }
}
