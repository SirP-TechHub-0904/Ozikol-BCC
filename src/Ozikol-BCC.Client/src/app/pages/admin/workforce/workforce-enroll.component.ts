import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { WorkforceService } from '../../../core/services/workforce.service';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { LandingComponent } from '../../landing/landing.component';
import { AuthLayoutComponent } from '../../../layouts/auth-layout/auth-layout.component';

/**
 * Dedicated Page Component for Enrolling Workforce Staff Members.
 * Route: `/workforce/console/enroll`
 * 100% Full Width layout.
 * Left Side: Simple One-Time Invitation (Full Name, Email, Phone Number, Job Role, Staff Type).
 * Right Side: Exact 1-to-1 Real-Time Mirror of the Active & Published Registration Form (`/users/console/registration-form`),
 * supporting all 4 presentation modes (`single`, `sections`, `stepper`, `pages`) with identical margins and styles.
 */
@Component({
  selector: 'app-workforce-enroll',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LandingComponent, AuthLayoutComponent],
  template: `
    <div class="bcp-page-container">
      <!-- 1. Breadcrumbs & Header -->
      <div class="page-header">
        <div class="header-left">
          <div class="breadcrumb">
            <a routerLink="/admin/dashboard">Command Center</a>
            <span class="sep">/</span>
            <span>Workforce &amp; Shifts</span>
            <span class="sep">/</span>
            <a routerLink="/workforce/console/analytics">Staff Roster &amp; Directory</a>
            <span class="sep">/</span>
            <span class="current">Enroll Member</span>
          </div>
          <div class="title-row">
            <h1>Enroll Workforce Member</h1>
            <span class="badge-suite">Suite: Workforce &amp; Shifts</span>
          </div>
          <p class="subtitle">
            Send a one-time invitation link so the member completes your active Registration Form.
          </p>
        </div>
        <div class="header-actions">
          <a routerLink="/users/console/registration-form" class="btn btn-outline" title="Modify the Registration Form">
            <span class="material-symbols-outlined">edit_document</span>
            <span>Modify Registration Form</span>
          </a>
          <a routerLink="/workforce/console/analytics" class="btn btn-outline">
            <span class="material-symbols-outlined">arrow_back</span>
            <span>Back to Roster</span>
          </a>
        </div>
      </div>

      <!-- 2. ONE-TIME INVITATION (LEFT) + EXACT LIVE PUBLISHED REGISTRATION FORM (RIGHT) -->
      <div class="tab-pane-content">
        <div class="invite-form-grid">
          <!-- Left Column: Simple One-Time Invitation Inputs -->
          <div class="cms-card">
            <div class="card-header">
              <div class="card-title-group">
                <span class="material-symbols-outlined text-blue">mail</span>
                <div>
                  <h3>One-Time Invitation Details</h3>
                  <p class="card-subtitle">Enter basic contact details to send a single-use onboarding link.</p>
                </div>
              </div>
            </div>

            <div class="card-body">
              <div class="form-group">
                <label class="form-label">Full Name <span class="required">*</span></label>
                <input
                  type="text"
                  class="form-control"
                  [(ngModel)]="inviteModel.fullName"
                  (ngModelChange)="syncInviteToPreview()"
                  placeholder="e.g. First Last"
                  required
                />
              </div>

              <div class="form-group">
                <label class="form-label">Email Address <span class="required">*</span></label>
                <input
                  type="email"
                  class="form-control"
                  [(ngModel)]="inviteModel.email"
                  (ngModelChange)="syncInviteToPreview()"
                  placeholder="name@company.com"
                  required
                />
              </div>

              <div class="form-group">
                <label class="form-label">Phone Number <span class="required">*</span></label>
                <input
                  type="tel"
                  class="form-control"
                  [(ngModel)]="inviteModel.phoneNumber"
                  (ngModelChange)="syncInviteToPreview()"
                  placeholder="e.g. +0 (000) 000-0000"
                  required
                />
              </div>

              <div class="form-row-dual">
                <!-- Designated Job Title (Empty until user adds, with (i) info popover) -->
                <div class="form-group">
                  <div class="label-with-link">
                    <div class="label-info-wrap">
                      <label class="form-label">Designated Job Title</label>
                      <button
                        type="button"
                        class="info-icon-btn"
                        (click)="showJobTitleInfo = !showJobTitleInfo"
                        title="Click for Job Title examples & info"
                      >
                        <span class="material-symbols-outlined">info</span>
                      </button>
                    </div>
                    <a routerLink="/workforce/console/settings" class="mini-link" title="Add or manage Job Titles">+ Add Job Title</a>
                  </div>

                  <!-- (i) Contextual Info Popover for Job Title -->
                  <div class="field-info-popover" *ngIf="showJobTitleInfo">
                    <div class="popover-head">
                      <strong>Designated Job Title Guide</strong>
                      <button type="button" class="popover-close" (click)="showJobTitleInfo = false">&times;</button>
                    </div>
                    <p><strong>Purpose:</strong> Defines the staff member's operational role and default pay rate.</p>
                    <p><strong>Examples you can add:</strong> Operations Supervisor, Security Officer, Registered Nurse, Care Assistant, Receptionist, Field Technician, or Office Administrator.</p>
                    <p>Click <strong>+ Add Job Title</strong> to create your organization's roles in Workforce Settings.</p>
                  </div>

                  <select class="form-control" [(ngModel)]="inviteModel.jobTitle" (change)="onJobRoleChange()">
                    <option value="">-- Select Job Title ({{ jobRoles.length === 0 ? 'None added yet' : 'Optional' }}) --</option>
                    <option *ngFor="let role of jobRoles" [value]="role.title">
                      {{ role.title }} ({{ role.code }})
                    </option>
                  </select>
                </div>

                <!-- Staff Classification Type (Empty until user adds, with (i) info popover) -->
                <div class="form-group">
                  <div class="label-with-link">
                    <div class="label-info-wrap">
                      <label class="form-label">Staff Classification Type</label>
                      <button
                        type="button"
                        class="info-icon-btn"
                        (click)="showStaffTypeInfo = !showStaffTypeInfo"
                        title="Click for Staff Classification Type examples & info"
                      >
                        <span class="material-symbols-outlined">info</span>
                      </button>
                    </div>
                    <a routerLink="/workforce/console/settings" class="mini-link" title="Add or manage Staff Types">+ Add Staff Type</a>
                  </div>

                  <!-- (i) Contextual Info Popover for Staff Classification Type -->
                  <div class="field-info-popover" *ngIf="showStaffTypeInfo">
                    <div class="popover-head">
                      <strong>Staff Classification Type Guide</strong>
                      <button type="button" class="popover-close" (click)="showStaffTypeInfo = false">&times;</button>
                    </div>
                    <p><strong>Purpose:</strong> Determines employment contract category and baseline weekly working hours.</p>
                    <p><strong>Examples you can add:</strong> Full-Time Permanent (40 hrs/wk), Part-Time (20 hrs/wk), Casual / Zero-Hours, Agency Contractor, or Shift Relief.</p>
                    <p>Click <strong>+ Add Staff Type</strong> to define your contract classifications in Workforce Settings.</p>
                  </div>

                  <select class="form-control" [(ngModel)]="inviteModel.staffTypeId" (change)="onStaffTypeChange(inviteModel)">
                    <option value="">-- Select Staff Type ({{ staffTypes.length === 0 ? 'None added yet' : 'Optional' }}) --</option>
                    <option *ngFor="let st of staffTypes" [value]="st.id">
                      {{ st.name }} &bull; {{ st.defaultContractedHours }} hrs/wk
                    </option>
                  </select>
                </div>
              </div>

              <div class="form-row-dual">
                <div class="form-group">
                  <label class="form-label">Default Hourly Rate ({{ currencySymbol }})</label>
                  <input
                    type="number"
                    step="0.25"
                    class="form-control"
                    [(ngModel)]="inviteModel.defaultHourlyRate"
                    placeholder="e.g. 15.00"
                  />
                </div>
                <div class="form-group">
                  <label class="form-label">Contracted Hours / Week</label>
                  <input
                    type="number"
                    class="form-control"
                    [(ngModel)]="inviteModel.contractedWeeklyHours"
                    placeholder="e.g. 40"
                  />
                </div>
              </div>

              <div class="form-row-dual">
                <div class="form-group">
                  <label class="form-label">Preferred Working Time</label>
                  <select class="form-control" [(ngModel)]="inviteModel.preferredWorkingTime">
                    <option value="Any">Any Shift (Day &amp; Night)</option>
                    <option value="Day">Day Shifts Only</option>
                    <option value="Night">Night Shifts Only</option>
                  </select>
                  <span class="field-hint">Day or Night preference for rota assignment.</span>
                </div>

                <div class="form-group">
                  <label class="form-label">Working Availability</label>
                  <select class="form-control" [(ngModel)]="inviteModel.workingAvailability">
                    <option value="Available">Available (Full Availability)</option>
                    <option value="Full-Time">Full-Time (Standard Rota)</option>
                    <option value="Part-Time">Part-Time (Flexible Rota)</option>
                    <option value="Weekdays">Weekdays Only (Mon - Fri)</option>
                    <option value="Weekends">Weekends Only (Sat - Sun)</option>
                  </select>
                  <span class="field-hint">Initial availability baseline tied to user account.</span>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Welcome Note (Optional)</label>
                <textarea
                  class="form-control"
                  rows="2"
                  [(ngModel)]="inviteModel.welcomeNote"
                  placeholder="Welcome to the team! Please use this one-time link to complete your registration..."
                ></textarea>
              </div>

              <div class="invite-summary-box">
                <span class="material-symbols-outlined text-blue">verified_user</span>
                <div>
                  <strong>Single-Use Invitation Link</strong>
                  <p>This link works once. As soon as the invited member submits the registration form, the link automatically becomes invalid.</p>
                </div>
              </div>

              <div class="card-actions-row">
                <button
                  type="button"
                  class="btn btn-primary full-width"
                  (click)="sendInvite()"
                  [disabled]="isSubmitting"
                >
                  <span class="material-symbols-outlined" *ngIf="!isSubmitting">send</span>
                  <span class="material-symbols-outlined spin" *ngIf="isSubmitting">sync</span>
                  <span>{{ isSubmitting ? 'Sending...' : 'Send Invitation Link' }}</span>
                </button>
              </div>

              <!-- Generated One-Time Link Display -->
              <div class="generated-link-box" *ngIf="generatedOnboardingUrl">
                <div class="generated-link-head">
                  <span class="material-symbols-outlined text-green">check_circle</span>
                  <strong>One-Time Invitation Link Generated</strong>
                </div>
                <div class="generated-link-row">
                  <input type="text" class="form-control" [value]="generatedOnboardingUrl" readonly />
                  <button type="button" class="btn btn-outline" (click)="copyGeneratedLink()">
                    <span class="material-symbols-outlined">content_copy</span>
                    <span>Copy</span>
                  </button>
                  <a [href]="generatedOnboardingUrl" target="_blank" class="btn btn-primary">
                    <span class="material-symbols-outlined">open_in_new</span>
                    <span>Open</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          <!-- ============================================================= -->
          <!-- RIGHT COLUMN: EXACT 1-TO-1 LIVE SIMULATION FROM FORM BUILDER  -->
          <!-- ============================================================= -->
          <div class="rf-column-preview">
            <div class="rf-preview-card">
              <div class="rf-preview-bar">
                <div class="rf-preview-indicator">
                  <span class="rf-pulse-dot"></span>
                  <span>INTERACTIVE "GET STARTED" SANDBOX</span>
                </div>
                <div class="rf-preview-bar-actions">
                  <button type="button" (click)="showFullScreenPreview = true"
                          style="background:#0050E5;color:#ffffff;border:none;border-radius:6px;padding:4px 10px;font-size:11px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:4px;box-shadow:0 2px 6px rgba(0,80,229,0.25);">
                    <span class="material-symbols-outlined" style="font-size:14px;">open_in_full</span>
                    <span>View Full Screen</span>
                  </button>
                  <button type="button" class="rf-btn-sim-autofill" (click)="autoFillSimulation()" title="Auto-fill sandbox with realistic test data">
                    <span class="material-symbols-outlined">magic_button</span>
                    <span>Auto-Fill Sample</span>
                  </button>
                  <button type="button" class="rf-btn-sim-reset" (click)="loadPublishedRegistrationSchema(true)" title="Sync latest changes from Registration Form Builder">
                    <span class="material-symbols-outlined">sync</span>
                    <span>Sync Live</span>
                  </button>
                  <span class="rf-preview-mode-tag">{{ policy.pageShellLayout === 'auth' ? 'Auth Layout' : 'Website Layout' }} · {{ getLayoutTitle(policy.formLayoutMode) }}</span>
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
                    <ng-container *ngTemplateOutlet="enrollPreviewForm"></ng-container>
                  </div>
                </app-landing>

                <app-auth-layout *ngIf="policy.pageShellLayout === 'auth'"
                                 [embeddedMode]="true"
                                 [previewMode]="true">
                  <ng-container *ngTemplateOutlet="enrollPreviewForm"></ng-container>
                </app-auth-layout>
              </div>

              <!-- Simulated Public Registration Screen (Exact 1-to-1 with /users/console/registration-form) -->
              <ng-template #enrollPreviewForm>
              <div class="rf-sim-card">

                <!-- Draft Saved Toast/Alert -->
                <div *ngIf="simDraftSaved" class="rf-sim-alert-draft">
                  <span class="material-symbols-outlined">bookmark_added</span>
                  <span>Test Mode: Draft saved! In production, a secure resumption link is sent to {{ simModel.email || 'the applicant email' }}.</span>
                </div>

                <!-- INTERACTIVE FORM -->
                <div>
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
                      <a href="javascript:void(0)" class="rf-save-link" (click)="simDraftSaved = true">
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
                    <button type="button" class="rf-sim-btn rf-sim-btn-finish">
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
                      <a href="javascript:void(0)" class="rf-save-link" (click)="simDraftSaved = true">
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

                    <button type="button" class="rf-sim-btn rf-sim-btn-finish">
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
                          <option value="Business & Enterprise">Business &amp; Enterprise</option>
                          <option value="Education & Academy">Education &amp; Academy</option>
                          <option value="Healthcare & Care Services">Healthcare &amp; Care Services</option>
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
                        <div style="font-size: 11px; color: #475569;">Applicant: <strong>{{ simModel.firstName ? (simModel.firstName + ' ' + simModel.lastName) : 'e.g. First Last' }}</strong></div>
                        <div style="font-size: 11px; color: #475569;">Email: <strong>{{ simModel.email || 'name@company.com' }}</strong></div>
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
                        <a href="javascript:void(0)" class="rf-save-link" (click)="simDraftSaved = true">
                          <span class="material-symbols-outlined">bookmark</span>
                          <span>Save Draft &amp; Continue Later</span>
                        </a>
                      </div>
                      <div class="rf-sim-nav-row">
                        <button type="button" class="rf-sim-btn-sub" (click)="simStep = (fields.length > 0 ? 3 : 2)">
                          <span class="material-symbols-outlined">arrow_back</span>
                          <span>Back</span>
                        </button>
                        <button type="button" class="rf-sim-btn rf-sim-btn-finish">
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
                        <a href="javascript:void(0)" class="rf-save-link" (click)="simDraftSaved = true">
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
                        <a href="javascript:void(0)" class="rf-save-link" (click)="simDraftSaved = true">
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
                        <div style="font-size: 11px; color: #475569;">Applicant: <strong>{{ simModel.firstName ? (simModel.firstName + ' ' + simModel.lastName) : 'e.g. First Last' }}</strong></div>
                        <div style="font-size: 11px; color: #475569;">Email: <strong>{{ simModel.email || 'name@company.com' }}</strong></div>
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
                        <button type="button" class="rf-sim-btn rf-sim-btn-finish">
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
              {{ policy.pageShellLayout === 'auth' ? 'Auth Layout' : 'Website Layout' }} · {{ getLayoutTitle(policy.formLayoutMode) }}
            </span>
          </div>

          <div style="display:flex;align-items:center;gap:10px;">
            <div style="display:inline-flex;background:#1e293b;border:1px solid #334155;border-radius:8px;padding:3px;gap:4px;">
              <button type="button" (click)="policy.pageShellLayout = 'website'"
                      [style.background]="policy.pageShellLayout !== 'auth' ? '#0050E5' : 'transparent'"
                      [style.color]="policy.pageShellLayout !== 'auth' ? '#ffffff' : '#cbd5e1'"
                      style="border:none;border-radius:6px;padding:5px 12px;font-size:12px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px;">
                <span class="material-symbols-outlined" style="font-size:15px;">language</span>
                <span>Website Layout</span>
              </button>
              <button type="button" (click)="policy.pageShellLayout = 'auth'"
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
              <ng-container *ngTemplateOutlet="enrollPreviewForm"></ng-container>
            </div>
          </app-landing>

          <app-auth-layout *ngIf="policy.pageShellLayout === 'auth'"
                           [embeddedMode]="true">
            <ng-container *ngTemplateOutlet="enrollPreviewForm"></ng-container>
          </app-auth-layout>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .bcp-page-container {
      display: flex;
      flex-direction: column;
      gap: 24px;
      padding: 0 4px 40px 4px;
      width: 100%;
    }

    /* Page Header */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      flex-wrap: wrap;
    }
    .header-left {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #64748b;
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
      color: #cbd5e1;
    }
    .breadcrumb .current {
      color: #0f172a;
      font-weight: 600;
    }
    .title-row {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .title-row h1 {
      font-size: 26px;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
      letter-spacing: -0.02em;
    }
    .badge-suite {
      font-size: 11px;
      font-weight: 700;
      background: #eff6ff;
      color: #0050e5;
      padding: 3px 10px;
      border-radius: 999px;
      border: 1px solid #bfdbfe;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .subtitle {
      font-size: 14px;
      color: #64748b;
      margin: 0;
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    /* Main Split Grid (Matches Registration Form Builder split proportions) */
    .invite-form-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
      gap: 24px;
      align-items: start;
    }
    .rf-column-preview {
      min-width: 0;
      max-width: 100%;
      overflow: hidden;
    }

    /* CMS Card */
    .cms-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
    }
    .card-header {
      padding: 18px 24px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .card-title-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .card-title-group .material-symbols-outlined {
      font-size: 24px;
    }
    .card-title-group h3 {
      font-size: 15.5px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 2px 0;
    }
    .card-subtitle {
      font-size: 12px;
      color: #64748b;
      margin: 0;
    }
    .card-body {
      padding: 22px 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    /* Form Fields */
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
      position: relative;
    }
    .label-with-link {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .label-info-wrap {
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }
    .info-icon-btn {
      background: none;
      border: none;
      padding: 0;
      color: #64748b;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      transition: color 0.15s;
    }
    .info-icon-btn:hover {
      color: #0050e5;
    }
    .info-icon-btn .material-symbols-outlined {
      font-size: 16px;
    }
    .field-info-popover {
      background: #f8fafc;
      border: 1px solid #bfdbfe;
      border-left: 3px solid #0050e5;
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 12px;
      color: #334155;
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-bottom: 4px;
    }
    .popover-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: #0f172a;
      font-size: 12.5px;
    }
    .popover-close {
      background: none;
      border: none;
      font-size: 16px;
      line-height: 1;
      color: #64748b;
      cursor: pointer;
    }
    .field-info-popover p {
      margin: 0;
      line-height: 1.4;
    }
    .mini-link {
      font-size: 11.5px;
      font-weight: 700;
      color: #0050e5;
      text-decoration: none;
    }
    .mini-link:hover {
      text-decoration: underline;
    }
    .form-row-dual {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }
    .form-label {
      font-size: 12.5px;
      font-weight: 700;
      color: #334155;
    }
    .form-label .required {
      color: #ef4444;
    }
    .form-control {
      padding: 10px 14px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 13.5px;
      color: #0f172a;
      outline: none;
      transition: all 0.2s;
      font-family: inherit;
      background: #ffffff;
    }
    .form-control:focus {
      border-color: #0050e5;
      box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.12);
    }

    /* =========================================================================
       EXACT 1-TO-1 STYLES FROM REGISTRATION FORM BUILDER (.rf-column-preview)
       ========================================================================= */
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
      gap: 8px;
      flex-wrap: wrap;
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
      flex-wrap: wrap;
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
      font-size: 10px;
      font-weight: 800;
      color: #0050e5;
      background: #eff6ff;
      border: 1px solid #dbeafe;
      padding: 2px 8px;
      border-radius: 6px;
      letter-spacing: 0.04em;
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
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      padding: 8px 10px;
      font-size: 11px;
      color: #1e40af;
      margin-bottom: 10px;
    }
    .rf-sim-alert-passwordless span.material-symbols-outlined {
      font-size: 16px;
      color: #0050e5;
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
    .rf-sim-stage { display: flex; flex-direction: column; gap: 10px; }
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
    .rf-sim-section-box {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px;
      margin-bottom: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .rf-sim-sec-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11.5px;
      font-weight: 800;
      color: #1e293b;
      margin-bottom: 4px;
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

    /* Invite Info & Actions */
    .invite-summary-box {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 10px;
      padding: 12px 14px;
    }
    .invite-summary-box .material-symbols-outlined {
      color: #0050e5;
      font-size: 20px;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .invite-summary-box strong {
      display: block;
      font-size: 12.5px;
      color: #1e40af;
      margin-bottom: 2px;
    }
    .invite-summary-box p {
      font-size: 11.5px;
      color: #1e3a8a;
      margin: 0;
      line-height: 1.4;
    }

    .generated-link-box {
      margin-top: 8px;
      padding: 14px;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 10px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .generated-link-head {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #166534;
    }
    .generated-link-row {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .generated-link-row .form-control {
      flex: 1;
      font-family: monospace;
      font-size: 12.5px;
    }

    .card-actions-row {
      margin-top: 4px;
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 13.5px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
      border: 1px solid transparent;
      text-decoration: none;
    }
    .btn-primary {
      background: #0050e5;
      color: #ffffff;
    }
    .btn-primary:hover:not(:disabled) {
      background: #003ebd;
    }
    .btn-outline {
      background: #ffffff;
      border-color: #cbd5e1;
      color: #334155;
    }
    .btn-outline:hover:not(:disabled) {
      background: #f8fafc;
      border-color: #94a3b8;
    }
    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .full-width {
      width: 100%;
    }

    .text-blue { color: #0050e5; }
    .text-green { color: #16a34a; }

    .spin {
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    @media (max-width: 1024px) {
      .invite-form-grid {
        grid-template-columns: 1fr;
      }
      .form-row-dual, .rf-sim-grid-2 {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class WorkforceEnrollComponent implements OnInit, OnDestroy {
  private syncChannel?: BroadcastChannel;
  private syncTimer?: any;
  isSubmitting = false;
  currencySymbol = '₦';
  staffTypes: any[] = [];
  jobRoles: any[] = [];
  generatedOnboardingUrl = '';

  showJobTitleInfo = false;
  showStaffTypeInfo = false;
  showFullScreenPreview = false;

  // Exact Registration Form Builder State (`policy`, `fields`, `categories`, `simModel`, `simStep`)
  policy = {
    allowPublicRegistration: true,
    requireApprovalBeforeLogin: false,
    registrationFormTitle: 'Create Your Account',
    registrationWelcomeMessage: 'Join our member directory and workspace portal.',
    registrationSuccessMessage: 'Registration successful! Welcome to the portal.',
    registrationUrlSlug: 'register',
    enableAffiliateReferralCode: true,
    defaultIndustrySector: 'Business & Enterprise',
    pageShellLayout: 'website' as 'website' | 'auth',
    formLayoutMode: 'single' as 'single' | 'sections' | 'stepper' | 'pages',
    requirePassword: true,
    allowSaveAndContinue: false,
    unpublishedCoreFields: [] as string[],
    customSections: [] as string[]
  };
  fields: any[] = [];
  categories: any[] = [];

  simStep = 1;
  simulatedCategoryId: string | null = null;
  simDraftSaved = false;
  simModel = {
    firstName: '',
    lastName: '',
    email: '',
    password: '••••••••••••',
    confirmPassword: '••••••••••••',
    phone: '',
    customAnswers: {} as Record<string, any>,
    uploadedMockFiles: {} as Record<string, string>,
    reCaptchaChecked: true
  };

  inviteModel = {
    fullName: '',
    email: '',
    phoneNumber: '',
    jobTitle: '',
    staffTypeId: '',
    staffTypeName: '',
    defaultHourlyRate: 0,
    contractedWeeklyHours: 0,
    preferredWorkingTime: 'Any',
    workingAvailability: 'Available',
    welcomeNote: ''
  };

  constructor(
    private readonly workforceService: WorkforceService,
    private readonly api: ApiService,
    private readonly toast: ToastService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.loadPublishedRegistrationSchema(false);

    // Subscribe to real-time BroadcastChannel updates from /users/console/registration-form
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        this.syncChannel = new BroadcastChannel('ozikol_reg_form_sync');
        this.syncChannel.onmessage = (event) => {
          if (event?.data?.policy) {
            this.policy = { ...this.policy, ...event.data.policy };
          }
          this.loadPublishedRegistrationSchema(false);
        };
      }
    } catch {}

    this.workforceService.getTenantCurrency().subscribe({
      next: (res: any) => {
        if (res?.data?.currencySymbol) {
          this.currencySymbol = res.data.currencySymbol;
        }
      },
      error: () => {}
    });

    this.workforceService.getJobRoles().subscribe({
      next: (res: any) => {
        this.jobRoles = Array.isArray(res?.data) ? res.data : [];
      },
      error: () => {}
    });

    this.workforceService.getStaffTypes().subscribe({
      next: (res: any) => {
        this.staffTypes = Array.isArray(res?.data) ? res.data : [];
      },
      error: () => {}
    });
  }

  ngOnDestroy(): void {
    if (this.syncChannel) {
      this.syncChannel.close();
    }
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
  }

  /**
   * Automatically refreshes the Registration Form schema whenever localStorage signals an update from another tab.
   */
  @HostListener('window:storage', ['$event'])
  onStorageChange(event: StorageEvent): void {
    if (event.key === 'ozikol_reg_form_updated_at') {
      this.loadPublishedRegistrationSchema(false);
    }
  }

  /**
   * Automatically refreshes the Registration Form schema whenever the browser tab/window regains focus
   * so edits made in `/users/console/registration-form` appear immediately in real time.
   */
  @HostListener('window:focus')
  onWindowFocus(): void {
    this.loadPublishedRegistrationSchema(false);
  }

  /**
   * Loads the active & published Registration Form policy, categories, and fields in real time.
   * Queries both `RegistrationFormApi/policy` + `RegistrationFormApi/fields` (exact endpoints used by the Builder)
   * and `RegistrationFormApi/public-schema` so changes reflect immediately.
   * @param showToast Whether to show a confirmation toast after syncing.
   */
  loadPublishedRegistrationSchema(showToast = false): void {
    const ts = Date.now();

    // 1. Load live policy directly from the same endpoint as RegistrationFormBuilderComponent
    this.api.get<any>(`RegistrationFormApi/policy?t=${ts}`).subscribe({
      next: (res: any) => {
        if (res?.data) {
          this.policy = { ...this.policy, ...res.data };
        }
      },
      error: () => {}
    });

    // 2. Load public schema (fields + categories + fallback policy)
    this.api.get<any>(`RegistrationFormApi/public-schema?t=${ts}`).subscribe({
      next: (res: any) => {
        const schema = res?.data || res;
        if (schema) {
          this.policy.registrationFormTitle = schema.formTitle || this.policy.registrationFormTitle || 'Create Your Account';
          this.policy.registrationWelcomeMessage = schema.welcomeMessage || this.policy.registrationWelcomeMessage || 'Join our member directory and workspace portal.';
          this.policy.pageShellLayout = schema.pageShellLayout || this.policy.pageShellLayout || 'website';
          this.policy.formLayoutMode = schema.formLayoutMode || this.policy.formLayoutMode || 'single';
          this.policy.requirePassword = schema.requirePassword ?? true;
          this.policy.allowSaveAndContinue = schema.allowSaveAndContinue ?? false;
          this.policy.defaultIndustrySector = schema.defaultIndustrySector || 'Business & Enterprise';
          this.policy.unpublishedCoreFields = schema.unpublishedCoreFields || [];
          this.policy.customSections = schema.customSections || [];
          this.categories = schema.categories || [];

          const rawFields: any[] = schema.fields || [];
          this.fields = rawFields.filter(f => f.isActive !== false).map(f => {
            let options: string[] = [];
            if (f.options && Array.isArray(f.options)) {
              options = f.options;
            } else if (f.optionsJson) {
              try {
                const parsed = JSON.parse(f.optionsJson);
                if (Array.isArray(parsed)) {
                  options = parsed.map((item: any) => typeof item === 'string' ? item : (item?.label || item?.value || ''));
                }
              } catch {
                options = f.optionsJson.split(',').map((s: string) => s.trim());
              }
            }
            return { ...f, isActive: true, options };
          });

          if (showToast) {
            this.toast.success('Synced latest Registration Form layout and questions.');
          }
        }
      },
      error: () => {}
    });
  }

  /**
   * Returns active custom fields filtered by the currently simulated category tier.
   */
  get filteredSimFields(): any[] {
    return this.fields.filter(f => {
      if (f.isActive === false) return false;
      if (!f.bcpUserCategoryId) return true;
      return f.bcpUserCategoryId === this.simulatedCategoryId;
    });
  }

  /**
   * Synchronizes the left-side invitation inputs into the right-side registration form preview in real time.
   */
  syncInviteToPreview(): void {
    const full = (this.inviteModel.fullName || '').trim();
    if (full) {
      const parts = full.split(' ');
      this.simModel.firstName = parts[0] || '';
      this.simModel.lastName = parts.length > 1 ? parts.slice(1).join(' ') : '';
    } else {
      this.simModel.firstName = '';
      this.simModel.lastName = '';
    }
    this.simModel.email = this.inviteModel.email || '';
    this.simModel.phone = this.inviteModel.phoneNumber || '';
  }

  /**
   * Populates the sandbox preview with sample test values.
   */
  autoFillSimulation(): void {
    this.simModel.firstName = this.simModel.firstName || 'First';
    this.simModel.lastName = this.simModel.lastName || 'Last';
    this.simModel.email = this.simModel.email || 'name@company.com';
    this.simModel.phone = this.simModel.phone || '+0 (000) 000-0000';
  }

  /**
   * Simulates uploading a file for a file-type registration question.
   */
  simulateFileUpload(fieldKey: string, event: Event): void {
    event.stopPropagation();
    this.simModel.uploadedMockFiles[fieldKey] = `${fieldKey}_verified_doc.pdf`;
  }

  /**
   * Checks whether a built-in core field (phone or category) is published on the registration form.
   */
  isCoreFieldPublished(key: string): boolean {
    if (!this.policy.unpublishedCoreFields) return true;
    return !this.policy.unpublishedCoreFields.includes(key);
  }

  /**
   * Resolves the concise badge title for the live simulation preview bar (identical to RegistrationFormBuilderComponent).
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
   * Resolves the human-readable category name for the stepper verification summary.
   */
  getSimCategoryName(): string {
    if (!this.simulatedCategoryId) return 'Standard Member';
    const cat = this.categories.find(c => c.id === this.simulatedCategoryId);
    return cat ? cat.name : 'Standard Member';
  }

  onJobRoleChange(): void {
    const selected = this.jobRoles.find(r => r.title === this.inviteModel.jobTitle);
    if (selected && selected.defaultHourlyRate !== undefined) {
      this.inviteModel.defaultHourlyRate = selected.defaultHourlyRate;
    }
  }

  onStaffTypeChange(model: any): void {
    const selected = this.staffTypes.find(t => t.id === model.staffTypeId);
    if (selected) {
      model.staffTypeId = selected.id;
      model.staffTypeName = selected.name;
      if (selected.defaultContractedHours !== undefined) {
        model.contractedWeeklyHours = selected.defaultContractedHours;
      }
    }
  }

  sendInvite(): void {
    if (!this.inviteModel.fullName?.trim() || !this.inviteModel.email?.trim() || !this.inviteModel.phoneNumber?.trim()) {
      this.toast.warning('Full Name, Email Address, and Phone Number are mandatory.');
      return;
    }

    this.isSubmitting = true;
    this.workforceService.inviteMember(this.inviteModel).subscribe({
      next: (res: any) => {
        this.isSubmitting = false;
        const relUrl = res?.data?.onboardingUrl || '';
        this.generatedOnboardingUrl = relUrl && typeof window !== 'undefined'
          ? `${window.location.origin}${relUrl}`
          : relUrl;
        if (res?.data?.emailSent) {
          this.toast.success(`Invitation email sent to ${this.inviteModel.email} and single-use link generated.`);
        } else {
          this.toast.info(res?.message || `Single-use invitation link generated. Copy the link below or configure Email in Central Settings.`);
        }
      },
      error: (err: any) => {
        this.isSubmitting = false;
        this.toast.error(err?.error?.message || 'Failed to dispatch invitation.');
      }
    });
  }

  copyGeneratedLink(): void {
    if (!this.generatedOnboardingUrl) return;
    navigator.clipboard.writeText(this.generatedOnboardingUrl);
    this.toast.success('One-time invitation link copied to clipboard.');
  }
}
