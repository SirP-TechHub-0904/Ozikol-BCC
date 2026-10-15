import { Component, OnInit, AfterViewInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { environment } from '../../../../environments/environment';

/**
 * Interface representing dynamic registration form field schema from backend.
 */
interface RegistrationFormField {
  id: string;
  fieldKey: string;
  label: string;
  placeholder?: string;
  fieldType: 'text' | 'number' | 'select' | 'date' | 'textarea' | 'checkbox' | 'file';
  optionsJson?: string;
  optionsList?: string[];
  isRequired: boolean;
  sortOrder: number;
  isActive: boolean;
  bcpUserCategoryId?: string | null;
  helpText?: string;
  showInWorkspaceProfile: boolean;
}

/**
 * Interface representing a staged form wizard step.
 */
interface WizardStep {
  id: number;
  key: string;
  title: string;
  subtitle: string;
  icon: string;
}

/**
 * Dedicated Standalone Member Onboarding & Registration Suite.
 * Renders outside the split-screen authentication shell as a dedicated, focused full-page experience.
 * Dynamically synthesizes the layout mode configured in the Registration Form Builder:
 * - 'single': Single Page Form Flow (One continuous stream with single submit - default)
 * - 'sections': Category Sections Flow (Grouped card sections)
 * - 'stepper': Step-by-Step Stepper Wizard (Guided multi-stage wizard)
 * - 'pages': Page-by-Page Multi-Page Form (Distinct sequential page transitions)
 */
@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="oz-onboarding-shell">
      <!-- Dedicated Standalone Top Navigation Bar -->
      <header class="oz-onboarding-topbar">
        <div class="topbar-inner">
          <a routerLink="/" class="topbar-brand" [title]="brandName + ' - Return to Home'">
            <!-- Official Brand Logo: When a tenant has uploaded their brand logo, render it cleanly with no duplicate text -->
            <img 
              *ngIf="logoUrl" 
              [src]="logoUrl" 
              [alt]="brandName" 
              class="brand-logo-img" 
            />
            <!-- Fallback: Render badge icon + organization name when no logo image exists -->
            <div *ngIf="!logoUrl" class="brand-fallback-wrap">
              <div class="brand-badge-icon">
                <span class="material-symbols-outlined">how_to_reg</span>
              </div>
              <div class="brand-text-col">
                <span class="brand-name">{{ brandName || 'Workspace' }}</span>
                <span class="brand-badge">Member Registration</span>
              </div>
            </div>
          </a>

          <div class="topbar-right">
            <span class="signin-hint">Already have an account?</span>
            <a routerLink="/auth/login" class="btn-signin-link">
              <span>Sign In</span>
              <span class="material-symbols-outlined">arrow_forward</span>
            </a>
          </div>
        </div>
      </header>

      <!-- Main Centered Onboarding Body -->
      <main class="oz-onboarding-body">
        <div class="register-container">
          <div class="register-card" [class.wide-card]="policy.formLayoutMode === 'single' || policy.formLayoutMode === 'sections'">
            
            <!-- Hero Header -->
            <div class="card-hero-header">
              <div class="hero-avatar">
                <span class="material-symbols-outlined">person_add</span>
              </div>
              <h1 class="hero-title">{{ policy.formTitle || 'Create Your Account' }}</h1>
              <p class="hero-subtitle" *ngIf="!policy.welcomeMessage">Join our member directory and workspace portal.</p>
              <div class="hero-welcome-badge" *ngIf="policy.welcomeMessage">
                <span class="material-symbols-outlined icon-chip">info</span>
                <span>{{ policy.welcomeMessage }}</span>
              </div>
            </div>

            <!-- Public Registration Disabled Notice -->
            <div *ngIf="!isLoadingSchema && policy.allowPublicRegistration === false" class="disabled-state-card fade-in">
              <div class="disabled-icon-wrap">
                <span class="material-symbols-outlined">lock_clock</span>
              </div>
              <h3>Registration Closed</h3>
              <p>Public member onboarding is currently disabled by the administration for this organization.</p>
              <p class="sub-tip">If you have an invitation code or existing account, you may sign in below.</p>
              <a routerLink="/auth/login" class="btn-signin-redirect">
                <span class="material-symbols-outlined">login</span>
                <span>Go to Member Sign In</span>
              </a>
            </div>

            <!-- Pending Approval State Card -->
            <div *ngIf="registrationSuccess && isPendingApproval" class="approval-state-card fade-in">
              <div class="approval-icon-wrap">
                <span class="material-symbols-outlined">hourglass_top</span>
              </div>
              <span class="status-pill">Pending Verification</span>
              <h3>Application Received!</h3>
              <p class="approval-message">{{ successNotice }}</p>
              <div class="member-meta-box">
                <div class="meta-row">
                  <span class="meta-label">Applicant:</span>
                  <span class="meta-val">{{ registeredName }}</span>
                </div>
                <div class="meta-row">
                  <span class="meta-label">Email:</span>
                  <span class="meta-val">{{ registeredEmail }}</span>
                </div>
                <div class="meta-row" *ngIf="model.organizationType">
                  <span class="meta-label">Sector:</span>
                  <span class="meta-val">{{ model.organizationType }}</span>
                </div>
              </div>
              <p class="sub-tip">You will receive an automated email confirmation once an administrator reviews and approves your account.</p>
              <div class="approval-actions">
                <a routerLink="/auth/login" class="btn-signin-redirect">
                  <span class="material-symbols-outlined">login</span>
                  <span>Back to Sign In</span>
                </a>
                <a routerLink="/" class="back-link">
                  <span class="material-symbols-outlined">arrow_back</span>
                  <span>Return to Home</span>
                </a>
              </div>
            </div>

            <!-- Instant Activation / Success Confirmation State Card -->
            <div *ngIf="registrationSuccess && !isPendingApproval" class="approval-state-card success-state-card fade-in">
              <div class="approval-icon-wrap success-icon-wrap">
                <span class="material-symbols-outlined">verified</span>
              </div>
              <span class="status-pill status-pill-success">Account Activated</span>
              <h3>Registration Complete!</h3>
              <p class="approval-message">{{ successNotice || policy.successMessage || 'Welcome to our workspace! Your account has been registered and verified successfully.' }}</p>
              <div class="member-meta-box">
                <div class="meta-row">
                  <span class="meta-label">Member:</span>
                  <span class="meta-val">{{ registeredName }}</span>
                </div>
                <div class="meta-row">
                  <span class="meta-label">Email:</span>
                  <span class="meta-val">{{ registeredEmail }}</span>
                </div>
                <div class="meta-row" *ngIf="model.organizationType">
                  <span class="meta-label">Sector:</span>
                  <span class="meta-val">{{ model.organizationType }}</span>
                </div>
              </div>
              <div class="approval-actions">
                <a [routerLink]="directLoginToken ? '/users/workspace' : '/auth/login'" class="btn-signin-redirect">
                  <span class="material-symbols-outlined">{{ directLoginToken ? 'rocket_launch' : 'login' }}</span>
                  <span>{{ directLoginToken ? 'Launch Member Workspace' : 'Sign In to Portal' }}</span>
                </a>
                <a routerLink="/" class="back-link">
                  <span class="material-symbols-outlined">arrow_back</span>
                  <span>Return to Home</span>
                </a>
              </div>
            </div>

            <!-- Loading Skeleton State -->
            <div *ngIf="isLoadingSchema" class="loading-state-box">
              <div class="spinner-large"></div>
              <p>Preparing registration form schema...</p>
            </div>

            <!-- Active Registration Form Container -->
            <div *ngIf="!isLoadingSchema && policy.allowPublicRegistration !== false && !registrationSuccess">
              
              <!-- Alert Error Banner -->
              <div *ngIf="errorMessage" class="error-banner fade-in">
                <span class="material-symbols-outlined">error</span>
                <span>{{ errorMessage }}</span>
              </div>

              <!-- Draft Restored Banner -->
              <div *ngIf="draftRestored" class="draft-banner fade-in">
                <div class="draft-info">
                  <span class="material-symbols-outlined draft-icon">bookmark_added</span>
                  <span>Draft restored from your previous session.</span>
                </div>
                <div class="draft-actions">
                  <button type="button" class="btn-clear-draft" (click)="clearDraft()" title="Discard draft and start fresh">
                    <span class="material-symbols-outlined">restart_alt</span>
                    <span>Start Fresh</span>
                  </button>
                </div>
              </div>

              <!-- =================================================================== -->
              <!-- MODE 1: SINGLE PAGE FORM FLOW (Continuous Stream - Matches Preview) -->
              <!-- =================================================================== -->
              <form *ngIf="policy.formLayoutMode === 'single'" class="register-form single-mode-stream" novalidate>
                
                <!-- Section 1: Account Credentials -->
                <div class="stream-section">
                  <div class="section-divider">
                    <span class="divider-title">Account Credentials</span>
                  </div>

                  <div class="form-grid-2">
                    <div class="form-group">
                      <label for="s_firstName" class="form-label">First Name <span class="req-star">*</span></label>
                      <div class="input-wrapper">
                        <span class="material-symbols-outlined input-icon">person</span>
                        <input
                          id="s_firstName"
                          type="text"
                          [(ngModel)]="model.firstName"
                          name="firstName"
                          placeholder="e.g. First Name"
                          class="form-input"
                          required
                        />
                      </div>
                    </div>

                    <div class="form-group">
                      <label for="s_lastName" class="form-label">Last Name <span class="req-star">*</span></label>
                      <div class="input-wrapper">
                        <span class="material-symbols-outlined input-icon">person</span>
                        <input
                          id="s_lastName"
                          type="text"
                          [(ngModel)]="model.lastName"
                          name="lastName"
                          placeholder="e.g. Last Name"
                          class="form-input"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div class="form-group">
                    <label for="s_email" class="form-label">Work / Primary Email Address <span class="req-star">*</span></label>
                    <div class="input-wrapper">
                      <span class="material-symbols-outlined input-icon">mail</span>
                      <input
                        id="s_email"
                        type="email"
                        [(ngModel)]="model.email"
                        name="email"
                        placeholder="name@company.com"
                        class="form-input"
                        required
                        autocomplete="email"
                      />
                    </div>
                  </div>

                  <!-- Password & Confirm Password (If required) -->
                  <div *ngIf="isPasswordRequired" class="form-grid-2">
                    <div class="form-group">
                      <div class="label-split-row">
                        <label for="s_password" class="form-label" style="margin-bottom: 0;">Password <span class="req-star">*</span></label>
                        <button type="button" class="btn-toggle-text" (click)="showPassword = !showPassword">
                          <span class="material-symbols-outlined" style="font-size: 15px;">{{ showPassword ? 'visibility_off' : 'visibility' }}</span>
                          <span>{{ showPassword ? 'Hide' : 'Show' }}</span>
                        </button>
                      </div>
                      <div class="input-wrapper">
                        <span class="material-symbols-outlined input-icon">key</span>
                        <input
                          id="s_password"
                          [type]="showPassword ? 'text' : 'password'"
                          [(ngModel)]="model.password"
                          (input)="onPasswordInput(model.password)"
                          name="password"
                          placeholder="Create a strong password"
                          class="form-input"
                          required
                        />
                      </div>
                      <!-- Password Strength Meter Bar -->
                      <div class="strength-bar-wrap" *ngIf="model.password">
                        <div class="strength-meter-track">
                          <div class="strength-meter-fill" [style.width.%]="passwordStrength" [style.background-color]="passwordStrengthColor"></div>
                        </div>
                        <div class="strength-meta-row">
                          <span class="strength-text" [style.color]="passwordStrengthColor">{{ passwordStrengthLabel }}</span>
                          <span class="strength-hint">Min 6 chars with mixed symbols</span>
                        </div>
                      </div>
                    </div>

                    <div class="form-group">
                      <label for="s_confirmPassword" class="form-label">Confirm Password <span class="req-star">*</span></label>
                      <div class="input-wrapper">
                        <span class="material-symbols-outlined input-icon">check_circle</span>
                        <input
                          id="s_confirmPassword"
                          [type]="showPassword ? 'text' : 'password'"
                          [(ngModel)]="model.confirmPassword"
                          name="confirmPassword"
                          placeholder="Re-enter password to confirm"
                          class="form-input"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Section 2: Profile & Sector -->
                <div class="stream-section">
                  <div class="section-divider">
                    <span class="divider-title">Profile & Sector</span>
                  </div>

                  <div class="form-grid-2">
                    <div class="form-group" *ngIf="!isCoreFieldUnpublished('organizationType')">
                      <label for="s_organizationType" class="form-label">Industry / Organization Sector <span class="req-star">*</span></label>
                      <div class="input-wrapper">
                        <span class="material-symbols-outlined input-icon">apartment</span>
                        <select
                          id="s_organizationType"
                          [(ngModel)]="model.organizationType"
                          name="organizationType"
                          class="form-select"
                          required
                        >
                          <option value="" disabled selected>-- Select Industry / Sector --</option>
                          <option *ngFor="let sec of industrySectors" [value]="sec">{{ sec }}</option>
                        </select>
                      </div>
                    </div>

                    <div class="form-group" *ngIf="!isCoreFieldUnpublished('phoneNumber')">
                      <label for="s_phoneNumber" class="form-label">Phone Number <span class="optional-tag">(Optional)</span></label>
                      <div class="input-wrapper">
                        <span class="material-symbols-outlined input-icon">phone</span>
                        <input
                          id="s_phoneNumber"
                          type="text"
                          [(ngModel)]="model.phoneNumber"
                          name="phoneNumber"
                          placeholder="e.g. +0 (000) 000-0000"
                          class="form-input"
                        />
                      </div>
                    </div>
                  </div>

                  <!-- Member Category / Tier Selector -->
                  <div class="form-group category-picker-group" *ngIf="categories.length > 0 && !isCoreFieldUnpublished('category')">
                    <label class="form-label">Select Member Category / Tier</label>
                    <div class="category-cards-grid">
                      <div
                        *ngFor="let cat of categories"
                        class="category-card"
                        [class.selected]="model.bcpUserCategoryId === cat.id"
                        (click)="selectCategory(cat.id)"
                      >
                        <div class="cat-radio-badge">
                          <span class="material-symbols-outlined" *ngIf="model.bcpUserCategoryId === cat.id">check</span>
                        </div>
                        <div class="cat-card-body">
                          <strong class="cat-card-title">{{ cat.name }}</strong>
                          <p class="cat-card-desc" *ngIf="cat.description">{{ cat.description }}</p>
                        </div>
                      </div>
                    </div>

                    <!-- Dropdown fallback -->
                    <div class="cat-dropdown-fallback">
                      <span class="sub-label">Or select from dropdown:</span>
                      <div class="input-wrapper">
                        <span class="material-symbols-outlined input-icon">category</span>
                        <select
                          id="s_categoryDropdown"
                          [(ngModel)]="model.bcpUserCategoryId"
                          name="bcpUserCategoryId"
                          (change)="onCategoryChanged()"
                          class="form-select"
                        >
                          <option [ngValue]="null">-- Select Category Tier (or Standard Member) --</option>
                          <option *ngFor="let c of categories" [value]="c.id">{{ c.name }}</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Section 3: Dynamic Onboarding Questions -->
                <div class="stream-section" *ngIf="visibleDynamicFields.length > 0">
                  <div class="section-divider">
                    <span class="divider-title">Onboarding Information</span>
                  </div>
                  <p class="section-subnote">Please complete the required details configured for your membership profile.</p>

                  <div class="dynamic-fields-grid">
                    <div
                      *ngFor="let field of visibleDynamicFields"
                      class="dynamic-field-item"
                      [class.full-width]="field.fieldType === 'textarea' || field.fieldType === 'file'"
                    >
                      <!-- Text / Number / Date -->
                      <div class="form-group" *ngIf="field.fieldType === 'text' || field.fieldType === 'number' || field.fieldType === 'date'">
                        <label [for]="'dyn_' + field.fieldKey" class="form-label">
                          {{ field.label }} <span *ngIf="field.isRequired" class="req-star">*</span>
                        </label>
                        <div class="input-wrapper">
                          <span class="material-symbols-outlined input-icon">
                            {{ field.fieldType === 'date' ? 'calendar_today' : (field.fieldType === 'number' ? 'tag' : 'edit_note') }}
                          </span>
                          <input
                            [id]="'dyn_' + field.fieldKey"
                            [type]="field.fieldType"
                            [(ngModel)]="customAttributes[field.fieldKey]"
                            [name]="field.fieldKey"
                            [placeholder]="field.placeholder || ('e.g. ' + field.label)"
                            class="form-input"
                            [required]="field.isRequired"
                          />
                        </div>
                        <span class="help-text" *ngIf="field.helpText">{{ field.helpText }}</span>
                      </div>

                      <!-- Select Dropdown -->
                      <div class="form-group" *ngIf="field.fieldType === 'select'">
                        <label [for]="'dyn_' + field.fieldKey" class="form-label">
                          {{ field.label }} <span *ngIf="field.isRequired" class="req-star">*</span>
                        </label>
                        <div class="input-wrapper">
                          <span class="material-symbols-outlined input-icon">list</span>
                          <select
                            [id]="'dyn_' + field.fieldKey"
                            [(ngModel)]="customAttributes[field.fieldKey]"
                            [name]="field.fieldKey"
                            class="form-select"
                            [required]="field.isRequired"
                          >
                            <option value="" disabled selected>{{ field.placeholder || '-- Select an option --' }}</option>
                            <option *ngFor="let opt of field.optionsList" [value]="opt">{{ opt }}</option>
                          </select>
                        </div>
                        <span class="help-text" *ngIf="field.helpText">{{ field.helpText }}</span>
                      </div>

                      <!-- Textarea -->
                      <div class="form-group" *ngIf="field.fieldType === 'textarea'">
                        <label [for]="'dyn_' + field.fieldKey" class="form-label">
                          {{ field.label }} <span *ngIf="field.isRequired" class="req-star">*</span>
                        </label>
                        <textarea
                          [id]="'dyn_' + field.fieldKey"
                          [(ngModel)]="customAttributes[field.fieldKey]"
                          [name]="field.fieldKey"
                          rows="3"
                          class="custom-textarea"
                          [placeholder]="field.placeholder || ('Provide ' + field.label + ' details...')"
                          [required]="field.isRequired"
                        ></textarea>
                        <span class="help-text" *ngIf="field.helpText">{{ field.helpText }}</span>
                      </div>

                      <!-- Checkbox -->
                      <div class="checkbox-form-group" *ngIf="field.fieldType === 'checkbox'">
                        <label class="custom-checkbox-wrap">
                          <input
                            type="checkbox"
                            [(ngModel)]="customAttributes[field.fieldKey]"
                            [name]="field.fieldKey"
                            [required]="field.isRequired"
                          />
                          <span class="checkbox-mark"></span>
                          <span class="checkbox-label-text">
                            {{ field.label }} <span *ngIf="field.isRequired" class="req-star">*</span>
                          </span>
                        </label>
                        <span class="help-text" *ngIf="field.helpText">{{ field.helpText }}</span>
                      </div>

                      <!-- File Upload -->
                      <div class="form-group" *ngIf="field.fieldType === 'file'">
                        <label class="form-label">
                          {{ field.label }} <span *ngIf="field.isRequired" class="req-star">*</span>
                        </label>
                        <div class="file-upload-box" [class.has-file]="!!customAttributes[field.fieldKey]">
                          <input
                            type="file"
                            (change)="onFileSelected($event, field.fieldKey)"
                            [id]="'dyn_' + field.fieldKey"
                            class="hidden-file-input"
                          />
                          <label [for]="'dyn_' + field.fieldKey" class="file-drop-area">
                            <span class="material-symbols-outlined upload-icon">
                              {{ customAttributes[field.fieldKey] ? 'task_alt' : 'cloud_upload' }}
                            </span>
                            <div class="file-text-col">
                              <span class="file-title">
                                {{ customAttributes[field.fieldKey] ? 'File Attached (Click to change)' : (field.placeholder || 'Choose or drag document / photo') }}
                              </span>
                              <span class="file-sub" *ngIf="field.helpText">{{ field.helpText }}</span>
                            </div>
                          </label>
                          <button
                            *ngIf="customAttributes[field.fieldKey]"
                            type="button"
                            class="clear-file-btn"
                            (click)="customAttributes[field.fieldKey] = null"
                            title="Remove file"
                          >
                            <span class="material-symbols-outlined">delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Section 4: Referral & Verification -->
                <div class="stream-section">
                  <!-- Affiliate Referral Code Link & Expander -->
                  <div class="referral-code-wrap" *ngIf="policy.enableAffiliateReferralCode !== false">
                    <a href="javascript:void(0)" (click)="showReferralInput = !showReferralInput" class="referral-toggle-link">
                      <span class="material-symbols-outlined">confirmation_number</span>
                      <span>Have an Affiliate Referral Code?</span>
                    </a>
                    <div *ngIf="showReferralInput" class="referral-input-box fade-in">
                      <input
                        type="text"
                        [(ngModel)]="model.referralCode"
                        name="referralCode"
                        placeholder="e.g. REF-XXXX"
                        class="form-input ref-input"
                      />
                    </div>
                  </div>

                  <!-- Google reCAPTCHA Verification Widget Container -->
                  <div class="oz-recaptcha-wrap" *ngIf="recaptchaSiteKey">
                    <div id="g-recaptcha-reg" class="g-recaptcha"></div>
                  </div>

                  <!-- Terms & Agreement Note -->
                  <p class="terms-note">
                    By clicking Register, you agree to our workspace terms of service, acceptable use policies, and privacy statement.
                  </p>

                  <!-- Inline Error Banner -->
                  <div *ngIf="errorMessage" class="error-banner fade-in" style="margin-top: 14px; margin-bottom: 14px;">
                    <span class="material-symbols-outlined">error</span>
                    <span>{{ errorMessage }}</span>
                  </div>

                  <!-- Primary Submission Action Button -->
                  <div class="single-submit-bar">
                    <button 
                      type="button" 
                      (click)="onRegister()" 
                      [disabled]="loading" 
                      class="btn-auth-submit btn-finish btn-full-width"
                    >
                      <span *ngIf="loading" class="spinner"></span>
                      <span *ngIf="!loading" class="material-symbols-outlined">how_to_reg</span>
                      <span>{{ loading ? 'Processing Registration...' : 'Register & Join Portal' }}</span>
                    </button>

                    <button 
                      *ngIf="policy.allowSaveAndContinue" 
                      type="button" 
                      class="btn-auth-save" 
                      (click)="saveDraft(true)" 
                      [disabled]="loading" 
                      title="Save progress and resume later"
                    >
                      <span class="material-symbols-outlined">bookmark</span>
                      <span>Save Draft</span>
                    </button>
                  </div>
                </div>
              </form>

              <!-- =================================================================== -->
              <!-- MODE 2: CATEGORY SECTIONS FLOW (Grouped Cards)                      -->
              <!-- =================================================================== -->
              <form *ngIf="policy.formLayoutMode === 'sections'" class="register-form sections-mode-stream" novalidate>
                <!-- Card Section 1: Credentials -->
                <div class="section-card-box">
                  <div class="section-card-header">
                    <div class="sec-badge-num">1</div>
                    <div class="sec-header-meta">
                      <h3>Account Credentials</h3>
                      <p>Enter your primary account identity and secure access password.</p>
                    </div>
                  </div>
                  <div class="section-card-body">
                    <div class="form-grid-2">
                      <div class="form-group">
                        <label class="form-label">First Name <span class="req-star">*</span></label>
                        <div class="input-wrapper">
                          <span class="material-symbols-outlined input-icon">person</span>
                          <input type="text" [(ngModel)]="model.firstName" name="sec_firstName" placeholder="e.g. First Name" class="form-input" required />
                        </div>
                      </div>
                      <div class="form-group">
                        <label class="form-label">Last Name <span class="req-star">*</span></label>
                        <div class="input-wrapper">
                          <span class="material-symbols-outlined input-icon">person</span>
                          <input type="text" [(ngModel)]="model.lastName" name="sec_lastName" placeholder="e.g. Last Name" class="form-input" required />
                        </div>
                      </div>
                    </div>
                    <div class="form-group">
                      <label class="form-label">Email Address <span class="req-star">*</span></label>
                      <div class="input-wrapper">
                        <span class="material-symbols-outlined input-icon">mail</span>
                        <input type="email" [(ngModel)]="model.email" name="sec_email" placeholder="name@company.com" class="form-input" required />
                      </div>
                    </div>
                    <div *ngIf="isPasswordRequired" class="form-grid-2">
                      <div class="form-group">
                        <label class="form-label">Password <span class="req-star">*</span></label>
                        <div class="input-wrapper">
                          <span class="material-symbols-outlined input-icon">key</span>
                          <input [type]="showPassword ? 'text' : 'password'" [(ngModel)]="model.password" (input)="onPasswordInput(model.password)" name="sec_pwd" placeholder="Password" class="form-input" required />
                        </div>
                      </div>
                      <div class="form-group">
                        <label class="form-label">Confirm Password <span class="req-star">*</span></label>
                        <div class="input-wrapper">
                          <span class="material-symbols-outlined input-icon">check_circle</span>
                          <input [type]="showPassword ? 'text' : 'password'" [(ngModel)]="model.confirmPassword" name="sec_cpwd" placeholder="Confirm Password" class="form-input" required />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Card Section 2: Sector & Tier -->
                <div class="section-card-box">
                  <div class="section-card-header">
                    <div class="sec-badge-num">2</div>
                    <div class="sec-header-meta">
                      <h3>Sector & Member Category</h3>
                      <p>Select your organization domain and applicable membership tier.</p>
                    </div>
                  </div>
                  <div class="section-card-body">
                    <div class="form-grid-2">
                      <div class="form-group" *ngIf="!isCoreFieldUnpublished('organizationType')">
                        <label class="form-label">Industry Sector <span class="req-star">*</span></label>
                        <div class="input-wrapper">
                          <span class="material-symbols-outlined input-icon">apartment</span>
                          <select [(ngModel)]="model.organizationType" name="sec_orgType" class="form-select" required>
                            <option value="" disabled selected>-- Select Industry / Sector --</option>
                            <option *ngFor="let sec of industrySectors" [value]="sec">{{ sec }}</option>
                          </select>
                        </div>
                      </div>
                      <div class="form-group" *ngIf="!isCoreFieldUnpublished('phoneNumber')">
                        <label class="form-label">Phone Number</label>
                        <div class="input-wrapper">
                          <span class="material-symbols-outlined input-icon">phone</span>
                          <input type="text" [(ngModel)]="model.phoneNumber" name="sec_phone" placeholder="e.g. +0 (000) 000-0000" class="form-input" />
                        </div>
                      </div>
                    </div>

                    <!-- Category Selector -->
                    <div class="form-group category-picker-group" *ngIf="categories.length > 0 && !isCoreFieldUnpublished('category')">
                      <label class="form-label">Member Tier</label>
                      <div class="category-cards-grid">
                        <div *ngFor="let cat of categories" class="category-card" [class.selected]="model.bcpUserCategoryId === cat.id" (click)="selectCategory(cat.id)">
                          <div class="cat-radio-badge"><span class="material-symbols-outlined" *ngIf="model.bcpUserCategoryId === cat.id">check</span></div>
                          <div class="cat-card-body"><strong class="cat-card-title">{{ cat.name }}</strong></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Card Section 3: Onboarding Questions -->
                <div class="section-card-box" *ngIf="visibleDynamicFields.length > 0">
                  <div class="section-card-header">
                    <div class="sec-badge-num">3</div>
                    <div class="sec-header-meta">
                      <h3>Onboarding Information</h3>
                      <p>Custom questions requested by the organization administrator.</p>
                    </div>
                  </div>
                  <div class="section-card-body">
                    <div class="dynamic-fields-grid">
                      <div *ngFor="let field of visibleDynamicFields" class="dynamic-field-item" [class.full-width]="field.fieldType === 'textarea' || field.fieldType === 'file'">
                        <div class="form-group" *ngIf="field.fieldType === 'text' || field.fieldType === 'number' || field.fieldType === 'date'">
                          <label class="form-label">{{ field.label }} <span *ngIf="field.isRequired" class="req-star">*</span></label>
                          <input [type]="field.fieldType" [(ngModel)]="customAttributes[field.fieldKey]" [name]="'sec_' + field.fieldKey" [placeholder]="field.placeholder || field.label" class="form-input" [required]="field.isRequired" />
                        </div>
                        <div class="form-group" *ngIf="field.fieldType === 'select'">
                          <label class="form-label">{{ field.label }} <span *ngIf="field.isRequired" class="req-star">*</span></label>
                          <select [(ngModel)]="customAttributes[field.fieldKey]" [name]="'sec_' + field.fieldKey" class="form-select" [required]="field.isRequired">
                            <option value="" disabled selected>{{ field.placeholder || '-- Select an option --' }}</option>
                            <option *ngFor="let opt of field.optionsList" [value]="opt">{{ opt }}</option>
                          </select>
                        </div>
                        <div class="form-group" *ngIf="field.fieldType === 'textarea'">
                          <label class="form-label">{{ field.label }} <span *ngIf="field.isRequired" class="req-star">*</span></label>
                          <textarea [(ngModel)]="customAttributes[field.fieldKey]" [name]="'sec_' + field.fieldKey" rows="3" class="custom-textarea" [placeholder]="field.placeholder || field.label" [required]="field.isRequired"></textarea>
                        </div>
                        <div class="checkbox-form-group" *ngIf="field.fieldType === 'checkbox'">
                          <label class="custom-checkbox-wrap">
                            <input type="checkbox" [(ngModel)]="customAttributes[field.fieldKey]" [name]="'sec_' + field.fieldKey" [required]="field.isRequired" />
                            <span class="checkbox-mark"></span>
                            <span class="checkbox-label-text">{{ field.label }} <span *ngIf="field.isRequired" class="req-star">*</span></span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Google reCAPTCHA Verification Widget Container -->
                <div class="oz-recaptcha-wrap" *ngIf="recaptchaSiteKey">
                  <div id="g-recaptcha-reg-sec" class="g-recaptcha"></div>
                </div>

                <!-- Inline Error Banner -->
                <div *ngIf="errorMessage" class="error-banner fade-in" style="margin-top: 14px; margin-bottom: 14px;">
                  <span class="material-symbols-outlined">error</span>
                  <span>{{ errorMessage }}</span>
                </div>

                <!-- Submit Button -->
                <div class="single-submit-bar">
                  <button type="button" (click)="onRegister()" [disabled]="loading" class="btn-auth-submit btn-finish btn-full-width">
                    <span *ngIf="loading" class="spinner"></span>
                    <span *ngIf="!loading" class="material-symbols-outlined">how_to_reg</span>
                    <span>{{ loading ? 'Processing Registration...' : 'Register & Join Portal' }}</span>
                  </button>
                </div>
              </form>

              <!-- =================================================================== -->
              <!-- MODE 3: STEP-BY-STEP STEPPER WIZARD                                 -->
              <!-- =================================================================== -->
              <div *ngIf="policy.formLayoutMode === 'stepper'" class="stepper-mode-container">
                <!-- Stepper Progress Bar -->
                <div class="wizard-stepper">
                  <div class="stepper-track">
                    <div class="stepper-fill" [style.width.%]="stepperProgressPercent"></div>
                  </div>
                  <div class="stepper-nodes">
                    <div
                      *ngFor="let s of availableSteps"
                      class="step-node"
                      [class.active]="currentStep === s.id"
                      [class.completed]="currentStep > s.id"
                      (click)="onStepNodeClicked(s.id)"
                      [title]="s.title"
                    >
                      <div class="step-circle">
                        <span *ngIf="currentStep > s.id" class="material-symbols-outlined check-icon">check</span>
                        <span *ngIf="currentStep <= s.id" class="step-num">{{ s.id }}</span>
                      </div>
                      <div class="step-label">
                        <span class="step-title">{{ s.title }}</span>
                        <span class="step-sub">{{ s.subtitle }}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <form class="register-form" novalidate>
                  <!-- Stage 1: Account -->
                  <div *ngIf="currentStep === 1" class="stage-section fade-in">
                    <div class="section-divider"><span>Account Credentials</span></div>
                    <div class="form-grid-2">
                      <div class="form-group">
                        <label class="form-label">First Name <span class="req-star">*</span></label>
                        <input type="text" [(ngModel)]="model.firstName" name="st_fn" placeholder="e.g. First Name" class="form-input" required />
                      </div>
                      <div class="form-group">
                        <label class="form-label">Last Name <span class="req-star">*</span></label>
                        <input type="text" [(ngModel)]="model.lastName" name="st_ln" placeholder="e.g. Last Name" class="form-input" required />
                      </div>
                    </div>
                    <div class="form-group">
                      <label class="form-label">Email Address <span class="req-star">*</span></label>
                      <input type="email" [(ngModel)]="model.email" name="st_em" placeholder="name@company.com" class="form-input" required />
                    </div>
                    <div *ngIf="isPasswordRequired" class="form-grid-2">
                      <div class="form-group">
                        <label class="form-label">Password <span class="req-star">*</span></label>
                        <input [type]="showPassword ? 'text' : 'password'" [(ngModel)]="model.password" (input)="onPasswordInput(model.password)" name="st_pw" placeholder="Password" class="form-input" required />
                      </div>
                      <div class="form-group">
                        <label class="form-label">Confirm Password <span class="req-star">*</span></label>
                        <input [type]="showPassword ? 'text' : 'password'" [(ngModel)]="model.confirmPassword" name="st_cpw" placeholder="Confirm Password" class="form-input" required />
                      </div>
                    </div>
                    <div class="wizard-actions">
                      <button type="button" class="btn-auth-submit" (click)="goToNextStep()">
                        <span>Continue</span>
                        <span class="material-symbols-outlined">arrow_forward</span>
                      </button>
                    </div>
                  </div>

                  <!-- Stage 2: Profile & Category -->
                  <div *ngIf="currentStep === 2" class="stage-section fade-in">
                    <div class="section-divider"><span>Profile & Sector</span></div>
                    <div class="form-grid-2">
                      <div class="form-group" *ngIf="!isCoreFieldUnpublished('organizationType')">
                        <label class="form-label">Sector <span class="req-star">*</span></label>
                        <select [(ngModel)]="model.organizationType" name="st_sec" class="form-select" required>
                          <option value="" disabled selected>-- Select Industry / Sector --</option>
                          <option *ngFor="let sec of industrySectors" [value]="sec">{{ sec }}</option>
                        </select>
                      </div>
                      <div class="form-group" *ngIf="!isCoreFieldUnpublished('phoneNumber')">
                        <label class="form-label">Phone Number <span class="optional-tag">(Optional)</span></label>
                        <input type="text" [(ngModel)]="model.phoneNumber" name="st_ph" placeholder="e.g. +0 (000) 000-0000" class="form-input" />
                      </div>
                    </div>
                    <div class="form-group category-picker-group" *ngIf="categories.length > 0 && !isCoreFieldUnpublished('category')">
                      <label class="form-label">Select Category</label>
                      <div class="category-cards-grid">
                        <div *ngFor="let cat of categories" class="category-card" [class.selected]="model.bcpUserCategoryId === cat.id" (click)="selectCategory(cat.id)">
                          <div class="cat-radio-badge"><span class="material-symbols-outlined" *ngIf="model.bcpUserCategoryId === cat.id">check</span></div>
                          <div class="cat-card-body"><strong class="cat-card-title">{{ cat.name }}</strong></div>
                        </div>
                      </div>
                    </div>

                    <!-- Affiliate Referral Code Link & Expander -->
                    <div class="referral-code-wrap" *ngIf="policy.enableAffiliateReferralCode !== false" style="margin-top: 14px;">
                      <a href="javascript:void(0)" (click)="showReferralInput = !showReferralInput" class="referral-toggle-link">
                        <span class="material-symbols-outlined">confirmation_number</span>
                        <span>Have an Affiliate Referral Code?</span>
                      </a>
                      <div *ngIf="showReferralInput" class="referral-input-box fade-in">
                        <input
                          type="text"
                          [(ngModel)]="model.referralCode"
                          name="st_referralCode"
                          placeholder="e.g. REF-XXXX"
                          class="form-input ref-input"
                        />
                      </div>
                    </div>

                    <div class="wizard-actions">
                      <button type="button" class="btn-auth-secondary" (click)="goToPreviousStep()"><span class="material-symbols-outlined">arrow_back</span><span>Previous</span></button>
                      <button type="button" class="btn-auth-submit" (click)="goToNextStep()"><span>Continue</span><span class="material-symbols-outlined">arrow_forward</span></button>
                    </div>
                  </div>

                  <!-- Stage 3: Dynamic Questions -->
                  <div *ngIf="currentStep === 3 && visibleDynamicFields.length > 0" class="stage-section fade-in">
                    <div class="section-divider">
                      <span class="divider-title">Onboarding Information</span>
                    </div>
                    <p class="section-subnote">Please complete the required details configured for your membership profile.</p>
                    <div class="dynamic-fields-grid">
                      <div *ngFor="let field of visibleDynamicFields" class="dynamic-field-item" [class.full-width]="field.fieldType === 'textarea' || field.fieldType === 'file'">
                        <div class="form-group" *ngIf="field.fieldType === 'text' || field.fieldType === 'number' || field.fieldType === 'date'">
                          <label class="form-label">{{ field.label }} <span *ngIf="field.isRequired" class="req-star">*</span></label>
                          <input [type]="field.fieldType" [(ngModel)]="customAttributes[field.fieldKey]" [name]="'st_' + field.fieldKey" [placeholder]="field.placeholder || ('e.g. ' + field.label)" class="form-input" [required]="field.isRequired" />
                          <span class="help-text" *ngIf="field.helpText">{{ field.helpText }}</span>
                        </div>
                        <div class="form-group" *ngIf="field.fieldType === 'select'">
                          <label class="form-label">{{ field.label }} <span *ngIf="field.isRequired" class="req-star">*</span></label>
                          <select [(ngModel)]="customAttributes[field.fieldKey]" [name]="'st_' + field.fieldKey" class="form-select" [required]="field.isRequired">
                            <option value="" disabled selected>{{ field.placeholder || '-- Select an option --' }}</option>
                            <option *ngFor="let opt of field.optionsList" [value]="opt">{{ opt }}</option>
                          </select>
                          <span class="help-text" *ngIf="field.helpText">{{ field.helpText }}</span>
                        </div>
                        <div class="form-group" *ngIf="field.fieldType === 'textarea'">
                          <label class="form-label">{{ field.label }} <span *ngIf="field.isRequired" class="req-star">*</span></label>
                          <textarea [(ngModel)]="customAttributes[field.fieldKey]" [name]="'st_' + field.fieldKey" rows="3" class="custom-textarea" [placeholder]="field.placeholder || ('Provide ' + field.label + ' details...')" [required]="field.isRequired"></textarea>
                          <span class="help-text" *ngIf="field.helpText">{{ field.helpText }}</span>
                        </div>
                        <div class="checkbox-form-group" *ngIf="field.fieldType === 'checkbox'">
                          <label class="custom-checkbox-wrap">
                            <input type="checkbox" [(ngModel)]="customAttributes[field.fieldKey]" [name]="'st_' + field.fieldKey" [required]="field.isRequired" />
                            <span class="checkbox-mark"></span>
                            <span class="checkbox-label-text">{{ field.label }} <span *ngIf="field.isRequired" class="req-star">*</span></span>
                          </label>
                        </div>
                        <div class="form-group" *ngIf="field.fieldType === 'file'">
                          <label class="form-label">{{ field.label }} <span *ngIf="field.isRequired" class="req-star">*</span></label>
                          <div class="file-upload-box" [class.has-file]="!!customAttributes[field.fieldKey]">
                            <input type="file" (change)="onFileSelected($event, field.fieldKey)" [id]="'st_dyn_' + field.fieldKey" class="hidden-file-input" />
                            <label [for]="'st_dyn_' + field.fieldKey" class="file-drop-area">
                              <span class="material-symbols-outlined upload-icon">{{ customAttributes[field.fieldKey] ? 'task_alt' : 'cloud_upload' }}</span>
                              <div class="file-text-col">
                                <span class="file-title">{{ customAttributes[field.fieldKey] ? 'File Attached (Click to change)' : (field.placeholder || 'Choose or drag document / photo') }}</span>
                                <span class="file-sub" *ngIf="field.helpText">{{ field.helpText }}</span>
                              </div>
                            </label>
                            <button *ngIf="customAttributes[field.fieldKey]" type="button" class="clear-file-btn" (click)="customAttributes[field.fieldKey] = null" title="Remove file"><span class="material-symbols-outlined">delete</span></button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div *ngIf="errorMessage" class="error-banner fade-in" style="margin-top: 14px; margin-bottom: 0;">
                      <span class="material-symbols-outlined">error</span>
                      <span>{{ errorMessage }}</span>
                    </div>
                    <div class="wizard-actions">
                      <button type="button" class="btn-auth-secondary" (click)="goToPreviousStep()"><span class="material-symbols-outlined">arrow_back</span><span>Previous</span></button>
                      <button type="button" class="btn-auth-submit" (click)="goToNextStep()"><span>Review & Finish</span><span class="material-symbols-outlined">arrow_forward</span></button>
                    </div>
                  </div>

                  <!-- Stage 4 / Final: Review & Submit -->
                  <div *ngIf="isFinalStep" class="stage-section fade-in">
                    <div class="section-divider">
                      <span class="divider-title">Verification & Finish</span>
                    </div>
                    <div class="review-summary-card">
                      <div class="summary-header">
                        <span class="material-symbols-outlined">verified_user</span>
                        <span>Registration Summary</span>
                      </div>
                      <div class="summary-grid">
                        <div class="sum-row"><span class="sum-lbl">Applicant:</span><strong class="sum-val">{{ model.firstName }} {{ model.lastName }}</strong></div>
                        <div class="sum-row"><span class="sum-lbl">Email:</span><span class="sum-val">{{ model.email }}</span></div>
                        <div class="sum-row" *ngIf="model.phoneNumber"><span class="sum-lbl">Phone Number:</span><span class="sum-val">{{ model.phoneNumber }}</span></div>
                        <div class="sum-row"><span class="sum-lbl">Industry Sector:</span><span class="sum-val">{{ model.organizationType }}</span></div>
                        <div class="sum-row" *ngIf="selectedCategoryName"><span class="sum-lbl">Membership Category:</span><span class="sum-val category-chip">{{ selectedCategoryName }}</span></div>
                        <div class="sum-row" *ngIf="model.referralCode"><span class="sum-lbl">Referral Code:</span><span class="sum-val">{{ model.referralCode }}</span></div>

                        <!-- Dynamic Questions & Custom Sector Attributes -->
                        <ng-container *ngFor="let field of visibleDynamicFields">
                          <div class="sum-row" [class.full-width]="field.fieldType === 'textarea' || field.fieldType === 'checkbox' || field.fieldType === 'file'">
                            <span class="sum-lbl">{{ field.label }}:</span>
                            <span class="sum-val" *ngIf="field.fieldType !== 'checkbox' && field.fieldType !== 'file'">
                              {{ (customAttributes[field.fieldKey] !== undefined && customAttributes[field.fieldKey] !== null && customAttributes[field.fieldKey] !== '') ? customAttributes[field.fieldKey] : 'Not specified' }}
                            </span>
                            <span class="sum-val" *ngIf="field.fieldType === 'checkbox'">
                              <span class="material-symbols-outlined" [style.color]="customAttributes[field.fieldKey] ? '#16a34a' : '#94a3b8'" style="font-size: 15px; vertical-align: -2px; margin-right: 2px;">
                                {{ customAttributes[field.fieldKey] ? 'check_circle' : 'cancel' }}
                              </span>
                              {{ customAttributes[field.fieldKey] ? 'Agreed / Confirmed' : 'Not confirmed' }}
                            </span>
                            <span class="sum-val" *ngIf="field.fieldType === 'file'">
                              <span class="material-symbols-outlined" [style.color]="customAttributes[field.fieldKey] ? '#16a34a' : '#94a3b8'" style="font-size: 15px; vertical-align: -2px; margin-right: 2px;">
                                {{ customAttributes[field.fieldKey] ? 'task_alt' : 'cloud_off' }}
                              </span>
                              {{ customAttributes[field.fieldKey] ? 'Document Attached' : 'No document attached' }}
                            </span>
                          </div>
                        </ng-container>
                      </div>
                    </div>

                    <!-- Google reCAPTCHA Verification Widget Container -->
                    <div class="oz-recaptcha-wrap" *ngIf="recaptchaSiteKey">
                      <div id="g-recaptcha-reg-stp" class="g-recaptcha"></div>
                    </div>

                    <div *ngIf="errorMessage" class="error-banner fade-in" style="margin-top: 14px; margin-bottom: 14px;">
                      <span class="material-symbols-outlined">error</span>
                      <span>{{ errorMessage }}</span>
                    </div>
                    <p class="terms-note">By clicking Register, you agree to our workspace terms of service and acceptable use policies.</p>
                    <div class="wizard-actions">
                      <button type="button" class="btn-auth-secondary" (click)="goToPreviousStep()"><span class="material-symbols-outlined">arrow_back</span><span>Previous</span></button>
                      <button type="button" (click)="onRegister()" [disabled]="loading" class="btn-auth-submit btn-finish">
                        <span *ngIf="loading" class="spinner"></span>
                        <span *ngIf="!loading" class="material-symbols-outlined">how_to_reg</span>
                        <span>{{ loading ? 'Processing...' : 'Register & Join Portal' }}</span>
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              <!-- =================================================================== -->
              <!-- MODE 4: PAGE-BY-PAGE MULTI-PAGE FORM                                -->
              <!-- =================================================================== -->
              <div *ngIf="policy.formLayoutMode === 'pages'" class="pages-mode-container">
                <div class="page-progress-header">
                  <div class="page-meta-row">
                    <span class="page-counter">Page {{ currentStep }} of {{ totalSteps }}</span>
                    <span class="page-step-name">{{ currentStepTitle }}</span>
                  </div>
                  <div class="page-progress-bar">
                    <div class="page-progress-fill" [style.width.%]="(currentStep / totalSteps) * 100"></div>
                  </div>
                </div>

                <form class="register-form" novalidate>
                  <!-- Page 1: Credentials -->
                  <div *ngIf="currentStep === 1" class="page-content fade-in">
                    <div class="form-grid-2">
                      <div class="form-group">
                        <label class="form-label">First Name <span class="req-star">*</span></label>
                        <input type="text" [(ngModel)]="model.firstName" name="pg_fn" placeholder="e.g. First Name" class="form-input" required />
                      </div>
                      <div class="form-group">
                        <label class="form-label">Last Name <span class="req-star">*</span></label>
                        <input type="text" [(ngModel)]="model.lastName" name="pg_ln" placeholder="e.g. Last Name" class="form-input" required />
                      </div>
                    </div>
                    <div class="form-group">
                      <label class="form-label">Email Address <span class="req-star">*</span></label>
                      <input type="email" [(ngModel)]="model.email" name="pg_em" placeholder="name@company.com" class="form-input" required />
                    </div>
                    <div *ngIf="isPasswordRequired" class="form-grid-2">
                      <div class="form-group">
                        <label class="form-label">Password <span class="req-star">*</span></label>
                        <input [type]="showPassword ? 'text' : 'password'" [(ngModel)]="model.password" (input)="onPasswordInput(model.password)" name="pg_pw" placeholder="••••••••" class="form-input" required />
                      </div>
                      <div class="form-group">
                        <label class="form-label">Confirm Password <span class="req-star">*</span></label>
                        <input [type]="showPassword ? 'text' : 'password'" [(ngModel)]="model.confirmPassword" name="pg_cpw" placeholder="••••••••" class="form-input" required />
                      </div>
                    </div>
                    <div class="wizard-actions">
                      <button type="button" class="btn-auth-submit" (click)="goToNextStep()"><span>Next Page</span><span class="material-symbols-outlined">arrow_forward</span></button>
                    </div>
                  </div>

                  <!-- Page 2: Sector & Member Tier -->
                  <div *ngIf="currentStep === 2" class="page-content fade-in">
                    <div class="form-group" *ngIf="!isCoreFieldUnpublished('organizationType')">
                      <label class="form-label">Industry Sector <span class="req-star">*</span></label>
                      <select [(ngModel)]="model.organizationType" name="pg_sec" class="form-select" required>
                        <option value="" disabled selected>-- Select Industry / Sector --</option>
                        <option *ngFor="let sec of industrySectors" [value]="sec">{{ sec }}</option>
                      </select>
                    </div>
                    <div class="form-group" *ngIf="!isCoreFieldUnpublished('phoneNumber')">
                      <label class="form-label">Phone Number <span class="optional-tag">(Optional)</span></label>
                      <input type="text" [(ngModel)]="model.phoneNumber" name="pg_ph" placeholder="e.g. +0 (000) 000-0000" class="form-input" />
                    </div>
                    <div class="form-group category-picker-group" *ngIf="categories.length > 0 && !isCoreFieldUnpublished('category')">
                      <label class="form-label">Member Category / Tier</label>
                      <div class="category-cards-grid">
                        <div *ngFor="let cat of categories" class="category-card" [class.selected]="model.bcpUserCategoryId === cat.id" (click)="selectCategory(cat.id)">
                          <div class="cat-radio-badge"><span class="material-symbols-outlined" *ngIf="model.bcpUserCategoryId === cat.id">check</span></div>
                          <div class="cat-card-body">
                            <strong class="cat-card-title">{{ cat.name }}</strong>
                            <p class="cat-card-desc" *ngIf="cat.description">{{ cat.description }}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Affiliate Referral Code Link & Expander -->
                    <div class="referral-code-wrap" *ngIf="policy.enableAffiliateReferralCode !== false" style="margin-top: 14px;">
                      <a href="javascript:void(0)" (click)="showReferralInput = !showReferralInput" class="referral-toggle-link">
                        <span class="material-symbols-outlined">confirmation_number</span>
                        <span>Have an Affiliate Referral Code?</span>
                      </a>
                      <div *ngIf="showReferralInput" class="referral-input-box fade-in">
                        <input
                          type="text"
                          [(ngModel)]="model.referralCode"
                          name="pg_referralCode"
                          placeholder="e.g. REF-XXXX"
                          class="form-input ref-input"
                        />
                      </div>
                    </div>

                    <div class="wizard-actions">
                      <button type="button" class="btn-auth-secondary" (click)="goToPreviousStep()"><span class="material-symbols-outlined">arrow_back</span><span>Previous</span></button>
                      <button type="button" class="btn-auth-submit" (click)="goToNextStep()"><span>Next Page</span><span class="material-symbols-outlined">arrow_forward</span></button>
                    </div>
                  </div>

                  <!-- Page 3: Dynamic Onboarding Questions (When configured by tenant) -->
                  <div *ngIf="currentStep === 3 && visibleDynamicFields.length > 0" class="page-content fade-in">
                    <div class="section-divider">
                      <span class="divider-title">Onboarding Information</span>
                    </div>
                    <p class="section-subnote">Please complete the details configured for your membership profile.</p>
                    <div class="dynamic-fields-grid">
                      <div *ngFor="let field of visibleDynamicFields" class="dynamic-field-item" [class.full-width]="field.fieldType === 'textarea' || field.fieldType === 'file'">
                        <div class="form-group" *ngIf="field.fieldType === 'text' || field.fieldType === 'number' || field.fieldType === 'date'">
                          <label class="form-label">{{ field.label }} <span *ngIf="field.isRequired" class="req-star">*</span></label>
                          <input [type]="field.fieldType" [(ngModel)]="customAttributes[field.fieldKey]" [name]="'pg_' + field.fieldKey" [placeholder]="field.placeholder || ('e.g. ' + field.label)" class="form-input" [required]="field.isRequired" />
                          <span class="help-text" *ngIf="field.helpText">{{ field.helpText }}</span>
                        </div>
                        <div class="form-group" *ngIf="field.fieldType === 'select'">
                          <label class="form-label">{{ field.label }} <span *ngIf="field.isRequired" class="req-star">*</span></label>
                          <select [(ngModel)]="customAttributes[field.fieldKey]" [name]="'pg_' + field.fieldKey" class="form-select" [required]="field.isRequired">
                            <option value="" disabled selected>{{ field.placeholder || '-- Select an option --' }}</option>
                            <option *ngFor="let opt of field.optionsList" [value]="opt">{{ opt }}</option>
                          </select>
                          <span class="help-text" *ngIf="field.helpText">{{ field.helpText }}</span>
                        </div>
                        <div class="form-group" *ngIf="field.fieldType === 'textarea'">
                          <label class="form-label">{{ field.label }} <span *ngIf="field.isRequired" class="req-star">*</span></label>
                          <textarea [(ngModel)]="customAttributes[field.fieldKey]" [name]="'pg_' + field.fieldKey" rows="3" class="custom-textarea" [placeholder]="field.placeholder || ('Provide ' + field.label + ' details...')" [required]="field.isRequired"></textarea>
                          <span class="help-text" *ngIf="field.helpText">{{ field.helpText }}</span>
                        </div>
                        <div class="checkbox-form-group" *ngIf="field.fieldType === 'checkbox'">
                          <label class="custom-checkbox-wrap">
                            <input type="checkbox" [(ngModel)]="customAttributes[field.fieldKey]" [name]="'pg_' + field.fieldKey" [required]="field.isRequired" />
                            <span class="checkbox-mark"></span>
                            <span class="checkbox-label-text">{{ field.label }} <span *ngIf="field.isRequired" class="req-star">*</span></span>
                          </label>
                        </div>
                        <div class="form-group" *ngIf="field.fieldType === 'file'">
                          <label class="form-label">{{ field.label }} <span *ngIf="field.isRequired" class="req-star">*</span></label>
                          <div class="file-upload-box" [class.has-file]="!!customAttributes[field.fieldKey]">
                            <input type="file" (change)="onFileSelected($event, field.fieldKey)" [id]="'pg_dyn_' + field.fieldKey" class="hidden-file-input" />
                            <label [for]="'pg_dyn_' + field.fieldKey" class="file-drop-area">
                              <span class="material-symbols-outlined upload-icon">{{ customAttributes[field.fieldKey] ? 'task_alt' : 'cloud_upload' }}</span>
                              <div class="file-text-col">
                                <span class="file-title">{{ customAttributes[field.fieldKey] ? 'File Attached (Click to change)' : (field.placeholder || 'Choose or drag document / photo') }}</span>
                                <span class="file-sub" *ngIf="field.helpText">{{ field.helpText }}</span>
                              </div>
                            </label>
                            <button *ngIf="customAttributes[field.fieldKey]" type="button" class="clear-file-btn" (click)="customAttributes[field.fieldKey] = null" title="Remove file"><span class="material-symbols-outlined">delete</span></button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div *ngIf="errorMessage" class="error-banner fade-in" style="margin-top: 14px; margin-bottom: 0;">
                      <span class="material-symbols-outlined">error</span>
                      <span>{{ errorMessage }}</span>
                    </div>
                    <div class="wizard-actions">
                      <button type="button" class="btn-auth-secondary" (click)="goToPreviousStep()"><span class="material-symbols-outlined">arrow_back</span><span>Previous</span></button>
                      <button type="button" class="btn-auth-submit" (click)="goToNextStep()"><span>Next: Verification</span><span class="material-symbols-outlined">arrow_forward</span></button>
                    </div>
                  </div>

                  <!-- Final Page: Verification, Review & Finish -->
                  <div *ngIf="isFinalStep" class="page-content fade-in">
                    <div class="section-divider">
                      <span class="divider-title">Verification & Finish</span>
                    </div>
                    <div class="review-summary-card">
                      <div class="summary-header">
                        <span class="material-symbols-outlined">verified_user</span>
                        <span>Application Summary</span>
                      </div>
                      <div class="summary-grid">
                        <div class="sum-row"><span class="sum-lbl">Applicant:</span><strong class="sum-val">{{ model.firstName }} {{ model.lastName }}</strong></div>
                        <div class="sum-row"><span class="sum-lbl">Email:</span><span class="sum-val">{{ model.email }}</span></div>
                        <div class="sum-row" *ngIf="model.phoneNumber"><span class="sum-lbl">Phone Number:</span><span class="sum-val">{{ model.phoneNumber }}</span></div>
                        <div class="sum-row"><span class="sum-lbl">Industry Sector:</span><span class="sum-val">{{ model.organizationType }}</span></div>
                        <div class="sum-row" *ngIf="selectedCategoryName"><span class="sum-lbl">Membership Category:</span><span class="sum-val category-chip">{{ selectedCategoryName }}</span></div>
                        <div class="sum-row" *ngIf="model.referralCode"><span class="sum-lbl">Referral Code:</span><span class="sum-val">{{ model.referralCode }}</span></div>

                        <!-- Dynamic Questions & Custom Onboarding Form Fields -->
                        <ng-container *ngFor="let field of visibleDynamicFields">
                          <div class="sum-row" [class.full-width]="field.fieldType === 'textarea' || field.fieldType === 'checkbox' || field.fieldType === 'file'">
                            <span class="sum-lbl">{{ field.label }}:</span>
                            <span class="sum-val" *ngIf="field.fieldType !== 'checkbox' && field.fieldType !== 'file'">
                              {{ (customAttributes[field.fieldKey] !== undefined && customAttributes[field.fieldKey] !== null && customAttributes[field.fieldKey] !== '') ? customAttributes[field.fieldKey] : 'Not specified' }}
                            </span>
                            <span class="sum-val" *ngIf="field.fieldType === 'checkbox'">
                              <span class="material-symbols-outlined" [style.color]="customAttributes[field.fieldKey] ? '#16a34a' : '#94a3b8'" style="font-size: 15px; vertical-align: -2px; margin-right: 2px;">
                                {{ customAttributes[field.fieldKey] ? 'check_circle' : 'cancel' }}
                              </span>
                              {{ customAttributes[field.fieldKey] ? 'Agreed / Confirmed' : 'Not confirmed' }}
                            </span>
                            <span class="sum-val" *ngIf="field.fieldType === 'file'">
                              <span class="material-symbols-outlined" [style.color]="customAttributes[field.fieldKey] ? '#16a34a' : '#94a3b8'" style="font-size: 15px; vertical-align: -2px; margin-right: 2px;">
                                {{ customAttributes[field.fieldKey] ? 'task_alt' : 'cloud_off' }}
                              </span>
                              {{ customAttributes[field.fieldKey] ? 'Document Attached' : 'No document attached' }}
                            </span>
                          </div>
                        </ng-container>
                      </div>
                    </div>

                    <!-- Google reCAPTCHA Verification Widget Container -->
                    <div class="oz-recaptcha-wrap" *ngIf="recaptchaSiteKey">
                      <div id="g-recaptcha-reg-pg" class="g-recaptcha"></div>
                    </div>

                    <!-- Inline Error Banner -->
                    <div *ngIf="errorMessage" class="error-banner fade-in" style="margin-top: 14px; margin-bottom: 14px;">
                      <span class="material-symbols-outlined">error</span>
                      <span>{{ errorMessage }}</span>
                    </div>

                    <p class="terms-note">By clicking Register, you agree to our workspace terms of service and acceptable use policies.</p>
                    <div class="wizard-actions">
                      <button type="button" class="btn-auth-secondary" (click)="goToPreviousStep()"><span class="material-symbols-outlined">arrow_back</span><span>Previous</span></button>
                      <button type="button" (click)="onRegister()" [disabled]="loading" class="btn-auth-submit btn-finish">
                        <span *ngIf="loading" class="spinner"></span>
                        <span *ngIf="!loading" class="material-symbols-outlined">how_to_reg</span>
                        <span>{{ loading ? 'Processing...' : 'Register & Join Portal' }}</span>
                      </button>
                    </div>
                  </div>
                </form>
              </div>

            </div>
          </div>
        </div>
      </main>

      <!-- Clean Onboarding Footer -->
      <footer class="oz-onboarding-footer">
        <div class="footer-inner">
          <span class="copyright-text">&copy; {{ currentYear }} {{ brandName || 'Workspace' }}. All rights reserved.</span>
          <span class="powered-by-tag">
            Powered by <a href="https://ozikol.cloud" target="_blank" rel="noopener noreferrer">Ozikol</a>
          </span>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      flex: 1 1 100%;
      min-height: 100vh;
      box-sizing: border-box;
      background: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }

    .oz-onboarding-shell {
      display: flex;
      flex-direction: column;
      width: 100%;
      min-height: 100vh;
      background: linear-gradient(180deg, #f8fafc 0%, #edf2f7 100%);
    }

    /* Top Navigation Bar */
    .oz-onboarding-topbar {
      width: 100%;
      background: #ffffff;
      border-bottom: 1px solid #e2e8f0;
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
    }
    .topbar-inner {
      max-width: 1200px;
      margin: 0 auto;
      padding: 14px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    .topbar-brand {
      display: flex;
      align-items: center;
      gap: 12px;
      text-decoration: none;
      color: inherit;
    }
    .brand-logo-img {
      height: 38px;
      max-width: 240px;
      object-fit: contain;
      display: block;
    }
    .brand-fallback-wrap {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand-badge-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: #eff6ff;
      border: 1px solid #dbeafe;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #0050e5;
    }
    .brand-badge-icon span { font-size: 22px; }
    .brand-text-col {
      display: flex;
      flex-direction: column;
    }
    .brand-name {
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.01em;
    }
    .brand-badge {
      font-size: 10.5px;
      font-weight: 700;
      color: #0050e5;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .topbar-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .signin-hint {
      font-size: 13px;
      color: #64748b;
    }
    .btn-signin-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border-radius: 8px;
      background: #eff6ff;
      color: #0050e5;
      font-size: 13px;
      font-weight: 700;
      text-decoration: none;
      transition: all 0.2s ease;
      border: 1px solid #dbeafe;
    }
    .btn-signin-link:hover {
      background: #0050e5;
      color: #ffffff;
      border-color: #0050e5;
    }
    .btn-signin-link span.material-symbols-outlined { font-size: 16px; }

    /* Onboarding Body & Centered Card */
    .oz-onboarding-body {
      flex: 1 0 auto;
      width: 100%;
      padding: 40px 20px 60px;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      box-sizing: border-box;
    }
    .register-container {
      width: 100%;
      max-width: 820px;
      margin: 0 auto;
    }
    .register-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      padding: 40px 44px;
      box-shadow: 0 20px 45px -12px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04);
      color: #0f172a;
      box-sizing: border-box;
    }
    .register-card.wide-card {
      max-width: 820px;
    }

    /* Hero Header */
    .card-hero-header {
      text-align: center;
      margin-bottom: 28px;
    }
    .hero-avatar {
      width: 58px;
      height: 58px;
      border-radius: 16px;
      background: #eff6ff;
      border: 1.5px solid #dbeafe;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 14px;
      box-shadow: 0 4px 14px rgba(0, 80, 229, 0.08);
      overflow: hidden;
    }
    .hero-avatar span { font-size: 28px; color: #0050e5; }
    .hero-avatar-brand-img {
      width: 38px;
      height: 38px;
      object-fit: contain;
      border-radius: 8px;
    }
    .hero-title {
      font-size: 26px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 6px;
      letter-spacing: -0.02em;
    }
    .hero-subtitle {
      font-size: 14px;
      color: #64748b;
      margin: 0;
      line-height: 1.5;
    }
    .hero-welcome-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #1e40af;
      padding: 8px 16px;
      border-radius: 9999px;
      font-size: 12.5px;
      font-weight: 600;
      margin-top: 12px;
      text-align: left;
    }
    .hero-welcome-badge span.icon-chip { font-size: 16px; color: #0050e5; }

    /* Section Dividers */
    .stream-section {
      margin-bottom: 28px;
    }
    .section-divider {
      display: flex;
      align-items: center;
      margin-bottom: 16px;
      position: relative;
    }
    .section-divider::before {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      height: 1px;
      background: #e2e8f0;
      z-index: 1;
    }
    .divider-title, .section-divider span {
      background: #ffffff;
      padding: 0 14px;
      font-size: 11.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #0050e5;
      position: relative;
      z-index: 2;
      border-radius: 4px;
    }
    .section-subnote {
      font-size: 12.5px;
      color: #64748b;
      margin: 4px 0 16px;
      display: block;
      clear: both;
      line-height: 1.5;
    }

    /* Form Fields & Grids */
    .form-grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .form-group {
      margin-bottom: 18px;
    }
    .form-label {
      display: block;
      font-size: 13px;
      font-weight: 700;
      color: #334155;
      margin-bottom: 6px;
    }
    .req-star { color: #ef4444; font-weight: 800; }
    .optional-tag { font-size: 11px; font-weight: 500; color: #94a3b8; }
    .label-split-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 6px;
    }
    .btn-toggle-text {
      background: none;
      border: none;
      padding: 0;
      font-size: 11.5px;
      font-weight: 600;
      color: #0050e5;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
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
      font-size: 18px;
      pointer-events: none;
    }
    .form-input, .form-select {
      width: 100%;
      height: 44px;
      padding: 0 14px;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      font-size: 13.5px;
      color: #0f172a;
      background: #ffffff;
      box-sizing: border-box;
      transition: all 0.2s ease;
      outline: none;
    }
    .form-select {
      cursor: pointer;
      appearance: none;
      -webkit-appearance: none;
      -moz-appearance: none;
      padding-right: 36px;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 14px center;
      background-size: 16px 16px;
    }
    .custom-textarea {
      width: 100%;
      height: auto;
      padding: 10px 14px;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      font-size: 13.5px;
      color: #0f172a;
      background: #ffffff;
      box-sizing: border-box;
      transition: all 0.2s ease;
      outline: none;
      line-height: 1.5;
    }
    /* When an icon is present, apply left padding */
    .input-wrapper .input-icon + .form-input,
    .input-wrapper .input-icon + .form-select,
    .input-wrapper .input-icon ~ .form-input,
    .input-wrapper .input-icon ~ .form-select,
    .input-wrapper:has(.input-icon) .form-input,
    .input-wrapper:has(.input-icon) .form-select {
      padding-left: 38px;
    }
    .form-input:focus, .form-select:focus, .custom-textarea:focus {
      border-color: #0050e5;
      box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.12);
    }
    .help-text {
      display: block;
      font-size: 11.5px;
      color: #64748b;
      margin-top: 4px;
    }
    .form-input.ng-invalid.ng-touched,
    .form-select.ng-invalid.ng-touched,
    .custom-textarea.ng-invalid.ng-touched {
      border-color: #ef4444;
      background-color: #fffbfb;
    }
    .form-input.ng-invalid.ng-touched:focus,
    .form-select.ng-invalid.ng-touched:focus,
    .custom-textarea.ng-invalid.ng-touched:focus {
      border-color: #ef4444;
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
    }

    /* Password Strength */
    .strength-bar-wrap {
      margin-top: 6px;
    }
    .strength-meter-track {
      height: 4px;
      background: #e2e8f0;
      border-radius: 2px;
      overflow: hidden;
    }
    .strength-meter-fill {
      height: 100%;
      transition: width 0.3s ease, background-color 0.3s ease;
    }
    .strength-meta-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10.5px;
      margin-top: 3px;
    }
    .strength-text { font-weight: 700; }
    .strength-hint { color: #94a3b8; }

    /* Category Cards Grid */
    .category-cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 12px;
      margin-bottom: 12px;
    }
    .category-card {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px 14px;
      border: 1.5px solid #e2e8f0;
      border-radius: 10px;
      background: #f8fafc;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .category-card:hover {
      border-color: #bfdbfe;
      background: #eff6ff;
    }
    .category-card.selected {
      border-color: #0050e5;
      background: #eff6ff;
      box-shadow: 0 0 0 2px rgba(0, 80, 229, 0.15);
    }
    .cat-radio-badge {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border: 1.5px solid #cbd5e1;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 2px;
      background: #ffffff;
      color: #0050e5;
    }
    .category-card.selected .cat-radio-badge {
      border-color: #0050e5;
      background: #0050e5;
      color: #ffffff;
    }
    .cat-radio-badge span { font-size: 13px; font-weight: 800; }
    .cat-card-title {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
      display: block;
    }
    .cat-card-desc {
      font-size: 11.5px;
      color: #64748b;
      margin: 2px 0 0;
      line-height: 1.35;
    }
    .cat-dropdown-fallback {
      margin-top: 10px;
    }
    .cat-dropdown-fallback .sub-label {
      display: block;
      font-size: 11px;
      color: #94a3b8;
      margin-bottom: 4px;
    }

    /* Dynamic Questions Grid */
    .dynamic-fields-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .dynamic-field-item.full-width {
      grid-column: 1 / -1;
    }

    /* Checkbox & File Upload */
    .checkbox-form-group {
      margin-bottom: 14px;
    }
    .custom-checkbox-wrap {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      color: #334155;
    }
    .custom-checkbox-wrap input[type="checkbox"] {
      width: 18px;
      height: 18px;
      accent-color: #0050e5;
      cursor: pointer;
    }
    .hidden-file-input { display: none; }
    .file-upload-box {
      border: 1.5px dashed #cbd5e1;
      border-radius: 10px;
      padding: 12px;
      background: #f8fafc;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .file-upload-box.has-file {
      border-color: #10b981;
      background: #ecfdf5;
    }
    .file-drop-area {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      width: 100%;
    }
    .upload-icon { font-size: 26px; color: #0050e5; }
    .file-upload-box.has-file .upload-icon { color: #10b981; }
    .file-text-col { display: flex; flex-direction: column; }
    .file-title { font-size: 12.5px; font-weight: 700; color: #0f172a; }
    .file-sub { font-size: 11px; color: #64748b; }
    .clear-file-btn {
      background: none;
      border: none;
      color: #ef4444;
      cursor: pointer;
      padding: 4px;
    }

    /* Referral Code Link */
    .referral-code-wrap {
      margin: 16px 0;
    }
    .referral-toggle-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12.5px;
      font-weight: 700;
      color: #0050e5;
      text-decoration: none;
    }
    .referral-toggle-link span.material-symbols-outlined { font-size: 16px; }
    .referral-input-box {
      margin-top: 8px;
      max-width: 320px;
    }

    /* reCAPTCHA & Terms */
    .oz-recaptcha-wrap {
      margin: 16px 0;
      display: flex;
      justify-content: center;
    }
    .terms-note {
      font-size: 11.5px;
      color: #64748b;
      line-height: 1.5;
      text-align: center;
      margin: 16px 0 20px;
    }

    /* Single Mode Submit Bar */
    .single-submit-bar {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 10px;
    }
    .btn-full-width {
      width: 100%;
    }

    /* Category Sections Mode Styles */
    .section-card-box {
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      background: #ffffff;
      margin-bottom: 20px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
    }
    .section-card-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 20px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
    }
    .sec-badge-num {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #0050e5;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 800;
      flex-shrink: 0;
    }
    .sec-header-meta h3 {
      font-size: 14.5px;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
    }
    .sec-header-meta p {
      font-size: 12px;
      color: #64748b;
      margin: 2px 0 0;
    }
    .section-card-body {
      padding: 20px;
    }

    /* Stepper Wizard Styles */
    .wizard-stepper {
      position: relative;
      margin-bottom: 28px;
      padding: 0 10px;
    }
    .stepper-track {
      position: absolute;
      top: 16px;
      left: 30px;
      right: 30px;
      height: 3px;
      background: #e2e8f0;
      z-index: 1;
      border-radius: 2px;
    }
    .stepper-fill {
      height: 100%;
      background: #0050e5;
      transition: width 0.3s ease;
      border-radius: 2px;
    }
    .stepper-nodes {
      position: relative;
      display: flex;
      justify-content: space-between;
      z-index: 2;
    }
    .step-node {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      user-select: none;
    }
    .step-circle {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #ffffff;
      border: 2px solid #cbd5e1;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 700;
      color: #64748b;
      transition: all 0.2s ease;
    }
    .step-node.active .step-circle {
      border-color: #0050e5;
      background: #0050e5;
      color: #ffffff;
      box-shadow: 0 0 0 4px rgba(0, 80, 229, 0.15);
    }
    .step-node.completed .step-circle {
      border-color: #10b981;
      background: #10b981;
      color: #ffffff;
    }
    .check-icon { font-size: 18px; font-weight: 800; }
    .step-label {
      text-align: center;
      display: flex;
      flex-direction: column;
    }
    .step-title {
      font-size: 11.5px;
      font-weight: 700;
      color: #475569;
    }
    .step-sub {
      font-size: 10px;
      color: #94a3b8;
    }
    .step-node.active .step-title { color: #0050e5; }
    .step-node.completed .step-title { color: #10b981; }

    /* Page-by-Page Header */
    .page-progress-header {
      margin-bottom: 24px;
    }
    .page-meta-row {
      display: flex;
      justify-content: space-between;
      font-size: 12.5px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .page-counter { color: #0050e5; }
    .page-step-name { color: #475569; }
    .page-progress-bar {
      height: 6px;
      background: #e2e8f0;
      border-radius: 3px;
      overflow: hidden;
    }
    .page-progress-fill {
      height: 100%;
      background: #0050e5;
      transition: width 0.3s ease;
    }

    /* Common Buttons & Actions */
    .wizard-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-top: 24px;
    }
    .btn-auth-submit {
      height: 44px;
      padding: 0 24px;
      border-radius: 10px;
      background: #0050e5;
      color: #ffffff;
      border: none;
      font-size: 14px;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(0, 80, 229, 0.25);
      transition: all 0.2s ease;
    }
    .btn-auth-submit:hover:not(:disabled) {
      background: #0041b8;
      box-shadow: 0 6px 18px rgba(0, 80, 229, 0.35);
      transform: translateY(-1px);
    }
    .btn-auth-submit:disabled {
      opacity: 0.65;
      cursor: not-allowed;
    }
    .btn-auth-secondary {
      height: 44px;
      padding: 0 18px;
      border-radius: 10px;
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #cbd5e1;
      font-size: 13.5px;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .btn-auth-secondary:hover {
      background: #e2e8f0;
      color: #0f172a;
    }
    .btn-auth-save {
      height: 40px;
      padding: 0 16px;
      border-radius: 10px;
      background: #ffffff;
      color: #64748b;
      border: 1px solid #cbd5e1;
      font-size: 12.5px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .btn-auth-save:hover {
      border-color: #94a3b8;
      color: #0f172a;
    }

    /* Banners & States */
    .error-banner {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 10px;
      padding: 12px 14px;
      color: #991b1b;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 20px;
    }
    .draft-banner {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 10px;
      padding: 10px 14px;
      color: #166534;
      font-size: 12.5px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
    }
    .draft-info { display: flex; align-items: center; gap: 8px; }
    .btn-clear-draft {
      background: none;
      border: none;
      color: #166534;
      font-size: 11.5px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .loading-state-box {
      text-align: center;
      padding: 60px 20px;
      color: #64748b;
      font-size: 13.5px;
    }
    .spinner-large {
      width: 36px;
      height: 36px;
      border: 3px solid #e2e8f0;
      border-top-color: #0050e5;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 16px;
    }
    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.4);
      border-top-color: #ffffff;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Approval & Disabled Cards */
    .approval-state-card, .disabled-state-card {
      text-align: center;
      padding: 20px 10px;
    }
    .approval-icon-wrap, .disabled-icon-wrap {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      margin: 0 auto 16px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .approval-icon-wrap { background: #fef3c7; color: #d97706; }
    .approval-icon-wrap.success-icon-wrap { background: #dcfce7; color: #16a34a; }
    .disabled-icon-wrap { background: #fee2e2; color: #dc2626; }
    .approval-icon-wrap span, .disabled-icon-wrap span { font-size: 32px; }
    .status-pill {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 9999px;
      background: #fef3c7;
      color: #92400e;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 8px;
    }
    .status-pill.status-pill-success {
      background: #dcfce7;
      color: #166534;
    }
    .approval-state-card h3, .disabled-state-card h3 {
      font-size: 22px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 8px;
    }
    .approval-message {
      font-size: 14px;
      color: #475569;
      line-height: 1.5;
      max-width: 520px;
      margin: 0 auto 20px;
    }
    .member-meta-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px 20px;
      max-width: 420px;
      margin: 0 auto 20px;
      text-align: left;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      padding: 4px 0;
    }
    .meta-label { color: #64748b; }
    .meta-val { font-weight: 700; color: #0f172a; }
    .sub-tip { font-size: 12.5px; color: #94a3b8; margin-bottom: 24px; }
    .btn-signin-redirect {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 22px;
      border-radius: 10px;
      background: #0050e5;
      color: #ffffff;
      font-size: 13.5px;
      font-weight: 700;
      text-decoration: none;
      box-shadow: 0 4px 14px rgba(0, 80, 229, 0.25);
    }
    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 600;
      color: #64748b;
      text-decoration: none;
      margin-left: 14px;
    }

    /* Review Summary Card (Stepper / Pages) */
    .review-summary-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px 20px;
      margin-bottom: 20px;
    }
    .summary-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 800;
      color: #0050e5;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .sum-row {
      display: flex;
      flex-direction: column;
      font-size: 12.5px;
    }
    .sum-row.full-width {
      grid-column: 1 / -1;
    }
    .sum-lbl { color: #64748b; }
    .sum-val {
      color: #0f172a;
      font-weight: 600;
      word-break: break-word;
    }
    .category-chip {
      background: #eff6ff;
      color: #0050e5;
      padding: 2px 8px;
      border-radius: 6px;
      font-weight: 700;
      display: inline-block;
      width: fit-content;
      margin-top: 2px;
    }

    /* Onboarding Footer */
    .oz-onboarding-footer {
      border-top: 1px solid #e2e8f0;
      background: #ffffff;
      padding: 16px 24px;
    }
    .footer-inner {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 12px;
      color: #94a3b8;
    }
    .powered-by-tag a {
      color: #0050e5;
      text-decoration: none;
      font-weight: 600;
    }

    /* Animations & Responsive */
    .fade-in {
      animation: fadeIn 0.25s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @media (max-width: 768px) {
      .register-card {
        padding: 24px 18px;
        border-radius: 16px;
      }
      .form-grid-2, .dynamic-fields-grid, .summary-grid {
        grid-template-columns: 1fr;
      }
      .category-cards-grid {
        grid-template-columns: 1fr;
      }
      .topbar-inner {
        padding: 12px 16px;
      }
      .signin-hint { display: none; }
      .hero-title { font-size: 22px; }
    }
  `]
})
export class RegisterComponent implements OnInit, AfterViewInit, OnDestroy {
  /**
   * Primary registration account payload sent to auth/register.
   */
  model: any = {
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    organizationType: '',
    bcpUserCategoryId: null,
    password: '',
    confirmPassword: '',
    referralCode: '',
    recaptchaToken: ''
  };

  /**
   * Industry / Organization Sectors matching canonical catalog.
   */
  industrySectors: string[] = [
    'Business & Enterprise',
    'Non-Profit & Foundation',
    'Healthcare & Care Services',
    'Education & Academy',
    'Government & Public Agency',
    'Technology & Software',
    'Other / Specialized Sector'
  ];

  /**
   * Multi-stage wizard step management (used in stepper and pages modes).
   */
  currentStep: number = 1;

  /**
   * Dynamic custom attributes dictionary (fieldKey -> value).
   */
  customAttributes: { [key: string]: any } = {};

  categories: any[] = [];
  dynamicFields: RegistrationFormField[] = [];
  visibleDynamicFields: RegistrationFormField[] = [];

  policy = {
    allowPublicRegistration: true,
    requireApprovalBeforeLogin: false,
    formTitle: 'Create Your Account',
    welcomeMessage: '',
    successMessage: '',
    enableAffiliateReferralCode: true,
    defaultIndustrySector: 'Business & Enterprise',
    registrationUrlSlug: 'register',
    formLayoutMode: 'single' as 'single' | 'sections' | 'stepper' | 'pages',
    requirePassword: true,
    allowSaveAndContinue: false,
    unpublishedCoreFields: [] as string[],
    customSections: [] as string[],
    customCss: ''
  };

  brandName: string = 'Workspace';
  logoUrl: string = '';
  faviconUrl: string = '';
  siteTitle: string = '';
  tagline: string = '';
  companyDescription: string = '';
  currentYear: number = new Date().getFullYear();

  // Google reCAPTCHA
  recaptchaSiteKey: string = '';
  recaptchaWidgetId: any = null;
  recaptchaLoaded: boolean = false;

  showReferralInput = false;
  isLoadingSchema = true;
  showPassword = false;
  loading = false;
  errorMessage = '';

  // Password Strength State
  passwordStrength = 0;
  passwordStrengthLabel = '';
  passwordStrengthColor = '#cbd5e1';

  // Post-submission state
  registrationSuccess = false;
  isPendingApproval = false;
  successNotice = '';
  registeredName = '';
  registeredEmail = '';
  /** Direct bearer login token if granted immediately on registration without approval gate. */
  directLoginToken = '';

  // Draft & Resume State
  draftRestored = false;

  constructor(
    private api: ApiService,
    private toast: ToastService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private titleService: Title,
    private metaService: Meta,
    private location: Location
  ) {}

  ngOnInit(): void {
    if (typeof document !== 'undefined') {
      document.body.classList.add('public-website-mode');
    }
    this.loadRegistrationSchema();
    this.loadBrandSettings();
    this.loadSiteCodeInjections();
    this.tryRestoreDraft();
  }

  ngOnDestroy(): void {
    if (typeof document !== 'undefined') {
      document.body.classList.remove('public-website-mode');
      document.querySelectorAll('.oz-reg-injected-tag').forEach(el => el.remove());
      const customCssEl = document.getElementById('oz-reg-custom-css');
      if (customCssEl) customCssEl.remove();
    }
  }

  ngAfterViewInit(): void {
    if (this.recaptchaSiteKey && (this.isFinalStep || this.policy.formLayoutMode === 'single' || this.policy.formLayoutMode === 'sections')) {
      setTimeout(() => this.initRecaptcha(), 200);
    }
  }

  /**
   * Checks whether password is required by policy.
   */
  get isPasswordRequired(): boolean {
    return this.policy.requirePassword !== false;
  }

  /**
   * Determines if a core form field has been toggled to unpublished/hidden in the builder.
   */
  isCoreFieldUnpublished(fieldKey: string): boolean {
    return Array.isArray(this.policy.unpublishedCoreFields) && this.policy.unpublishedCoreFields.includes(fieldKey);
  }

  /**
   * Computes dynamic stages based on whether the tenant has custom onboarding questions.
   */
  get availableSteps(): WizardStep[] {
    const steps: WizardStep[] = [
      { id: 1, key: 'account', title: 'Account', subtitle: 'Credentials', icon: 'person' },
      { id: 2, key: 'category', title: 'Profile', subtitle: 'Sector & Tier', icon: 'apartment' }
    ];

    if (this.visibleDynamicFields.length > 0) {
      steps.push({ id: 3, key: 'questions', title: 'Details', subtitle: 'Questions', icon: 'edit_note' });
      steps.push({ id: 4, key: 'finish', title: 'Finish', subtitle: 'Verification', icon: 'check_circle' });
    } else {
      steps.push({ id: 3, key: 'finish', title: 'Finish', subtitle: 'Verification', icon: 'check_circle' });
    }

    return steps;
  }

  get totalSteps(): number {
    return this.availableSteps.length;
  }

  get currentStepTitle(): string {
    const step = this.availableSteps[this.currentStep - 1];
    return step ? step.title : '';
  }

  get isFinalStep(): boolean {
    return this.currentStep === this.totalSteps;
  }

  get stepperProgressPercent(): number {
    if (this.totalSteps <= 1) return 100;
    return ((this.currentStep - 1) / (this.totalSteps - 1)) * 100;
  }

  get selectedCategoryName(): string {
    if (!this.model.bcpUserCategoryId) return '';
    const found = this.categories.find(c => c.id === this.model.bcpUserCategoryId);
    return found ? found.name : '';
  }

  /**
   * Evaluates password strength dynamically as the applicant types.
   */
  onPasswordInput(pwd: string): void {
    if (!pwd) {
      this.passwordStrength = 0;
      this.passwordStrengthLabel = '';
      this.passwordStrengthColor = '#cbd5e1';
      return;
    }

    let score = 0;
    if (pwd.length >= 6) score += 25;
    if (pwd.length >= 10) score += 15;
    if (/[A-Z]/.test(pwd)) score += 20;
    if (/[0-9]/.test(pwd)) score += 20;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 20;

    this.passwordStrength = Math.min(score, 100);

    if (this.passwordStrength < 40) {
      this.passwordStrengthLabel = 'Weak';
      this.passwordStrengthColor = '#ef4444';
    } else if (this.passwordStrength < 70) {
      this.passwordStrengthLabel = 'Fair';
      this.passwordStrengthColor = '#f59e0b';
    } else if (this.passwordStrength < 90) {
      this.passwordStrengthLabel = 'Good';
      this.passwordStrengthColor = '#10b981';
    } else {
      this.passwordStrengthLabel = 'Strong';
      this.passwordStrengthColor = '#059669';
    }
  }

  /**
   * Category card selection helper.
   */
  selectCategory(catId: string | null): void {
    this.model.bcpUserCategoryId = catId;
    this.onCategoryChanged();
  }

  /**
   * Filters custom fields based on category tier selection.
   */
  onCategoryChanged(): void {
    this.filterVisibleDynamicFields();
  }

  private filterVisibleDynamicFields(): void {
    const selectedCatId = this.model.bcpUserCategoryId;
    this.visibleDynamicFields = this.dynamicFields.filter(f => {
      if (!f.bcpUserCategoryId) return true;
      return f.bcpUserCategoryId === selectedCatId;
    });
  }

  /**
   * Evaluates password complexity rules matching backend identity screening.
   * Enforces min length, uppercase, lowercase, digit, special character, and blacklist.
   */
  validatePasswordComplexity(password: string, confirmPassword?: string): { valid: boolean; message?: string } {
    if (!password) {
      return { valid: false, message: 'Please enter an account password.' };
    }
    if (password.length < 6) {
      return { valid: false, message: 'Password must be at least 6 characters long.' };
    }
    if (!/[A-Z]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one uppercase letter (A-Z).' };
    }
    if (!/[a-z]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one lowercase letter (a-z).' };
    }
    if (!/[0-9]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one numeric digit (0-9).' };
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one special symbol character (e.g. !@#$%^&*).' };
    }
    const compromised = ['123456', 'password', 'password123', 'qwerty', 'admin123'];
    if (compromised.includes(password.toLowerCase())) {
      return { valid: false, message: 'This password is on the security blacklist due to high risk. Choose a more secure password.' };
    }
    if (confirmPassword !== undefined && password !== confirmPassword) {
      return { valid: false, message: 'Passwords do not match. Please verify your password confirmation.' };
    }
    return { valid: true };
  }

  /**
   * Helper to focus the first matching DOM input element across layout modes.
   */
  private focusInputField(...ids: string[]): void {
    if (typeof document === 'undefined') return;
    setTimeout(() => {
      for (const id of ids) {
        const el = document.getElementById(id) as HTMLInputElement | null;
        if (el) {
          el.focus();
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          break;
        }
      }
    }, 100);
  }

  /**
   * Validates a specific wizard step or page before allowing forward navigation.
   * Returns true if step inputs are valid; false and sets errorMessage/toast if invalid.
   */
  validateStep(stepNumber: number): boolean {
    this.errorMessage = '';

    // Step 1: Account Credentials
    if (stepNumber === 1) {
      if (!this.model.firstName?.trim()) {
        this.errorMessage = 'Please enter your first name.';
        this.toast.error(this.errorMessage);
        this.focusInputField('s_firstName', 'st_fn', 'pg_fn', 'sec_firstName');
        return false;
      }
      if (this.model.firstName.trim().length < 2) {
        this.errorMessage = 'First name must be at least 2 characters.';
        this.toast.error(this.errorMessage);
        this.focusInputField('s_firstName', 'st_fn', 'pg_fn', 'sec_firstName');
        return false;
      }

      if (!this.model.lastName?.trim()) {
        this.errorMessage = 'Please enter your last name.';
        this.toast.error(this.errorMessage);
        this.focusInputField('s_lastName', 'st_ln', 'pg_ln', 'sec_lastName');
        return false;
      }
      if (this.model.lastName.trim().length < 2) {
        this.errorMessage = 'Last name must be at least 2 characters.';
        this.toast.error(this.errorMessage);
        this.focusInputField('s_lastName', 'st_ln', 'pg_ln', 'sec_lastName');
        return false;
      }

      if (!this.model.email?.trim()) {
        this.errorMessage = 'Please enter your work or primary email address.';
        this.toast.error(this.errorMessage);
        this.focusInputField('s_email', 'st_em', 'pg_em', 'sec_email');
        return false;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(this.model.email.trim())) {
        this.errorMessage = 'Please enter a valid email address (e.g. name@company.com).';
        this.toast.error(this.errorMessage);
        this.focusInputField('s_email', 'st_em', 'pg_em', 'sec_email');
        return false;
      }

      if (this.isPasswordRequired) {
        const pwdRes = this.validatePasswordComplexity(this.model.password, this.model.confirmPassword);
        if (!pwdRes.valid) {
          this.errorMessage = pwdRes.message || 'Please provide a valid, secure password.';
          this.toast.error(this.errorMessage);
          this.focusInputField('s_password', 'st_pw', 'pg_pw', 'sec_pwd');
          return false;
        }
      }
      return true;
    }

    // Step 2: Sector & Member Tier
    if (stepNumber === 2) {
      if (!this.isCoreFieldUnpublished('organizationType') && !this.model.organizationType?.trim()) {
        this.errorMessage = 'Please select your industry or organization sector.';
        this.toast.error(this.errorMessage);
        this.focusInputField('s_organizationType', 'st_sec', 'pg_sec', 'sec_orgType');
        return false;
      }

      if (!this.isCoreFieldUnpublished('phoneNumber') && this.model.phoneNumber?.trim()) {
        const phoneDigits = this.model.phoneNumber.replace(/\D/g, '');
        if (phoneDigits.length < 5) {
          this.errorMessage = 'Please enter a valid contact phone number.';
          this.toast.error(this.errorMessage);
          this.focusInputField('s_phoneNumber', 'st_ph', 'pg_ph', 'sec_phone');
          return false;
        }
      }
      return true;
    }

    // Step 3: Dynamic Onboarding Questions
    if (stepNumber === 3 && this.visibleDynamicFields.length > 0) {
      for (const field of this.visibleDynamicFields) {
        const val = this.customAttributes[field.fieldKey];
        if (field.isRequired) {
          if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
            this.errorMessage = `Please complete the required field: ${field.label}`;
            this.toast.error(this.errorMessage);
            this.focusInputField('dyn_' + field.fieldKey, 'st_dyn_' + field.fieldKey, 'pg_dyn_' + field.fieldKey);
            return false;
          }
        }
      }
      return true;
    }

    return true;
  }

  /**
   * Step navigation forward with strict validation before advancing.
   */
  goToNextStep(): void {
    this.errorMessage = '';

    if (!this.validateStep(this.currentStep)) {
      return;
    }

    // Advance
    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
      this.saveDraft(false);
      if (this.isFinalStep) {
        setTimeout(() => this.initRecaptcha(), 100);
      }
    }
  }

  goToPreviousStep(): void {
    this.errorMessage = '';
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  onStepNodeClicked(targetStepId: number): void {
    if (targetStepId < this.currentStep) {
      this.errorMessage = '';
      this.currentStep = targetStepId;
      return;
    }

    // When attempting to jump forward, validate all intermediate steps first
    for (let s = this.currentStep; s < targetStepId; s++) {
      if (!this.validateStep(s)) {
        return;
      }
    }

    this.errorMessage = '';
    this.currentStep = targetStepId;
    this.saveDraft(false);
    if (this.isFinalStep) {
      setTimeout(() => this.initRecaptcha(), 100);
    }
  }

  /**
   * Loads the public registration schema containing active categories,
   * tenant-specific custom fields, reCAPTCHA site key, and onboarding governance policy.
   */
  loadRegistrationSchema(): void {
    this.isLoadingSchema = true;
    this.api.get<any>('RegistrationFormApi/public-schema').subscribe({
      next: (res) => {
        this.isLoadingSchema = false;
        const schema = res?.data || res;
        if (schema) {
          this.policy.allowPublicRegistration = schema.allowPublicRegistration ?? true;
          this.policy.requireApprovalBeforeLogin = schema.requireApprovalBeforeLogin ?? false;
          this.policy.formTitle = schema.formTitle || 'Create Your Account';
          this.policy.welcomeMessage = schema.welcomeMessage || '';
          this.policy.successMessage = schema.successMessage || '';
          this.policy.enableAffiliateReferralCode = schema.enableAffiliateReferralCode ?? true;
          this.policy.defaultIndustrySector = schema.defaultIndustrySector || 'Business & Enterprise';
          this.policy.registrationUrlSlug = schema.registrationUrlSlug || 'register';
          this.policy.formLayoutMode = (schema.formLayoutMode as any) || 'single';
          this.policy.requirePassword = schema.requirePassword ?? true;
          this.policy.allowSaveAndContinue = schema.allowSaveAndContinue ?? false;
          this.policy.unpublishedCoreFields = schema.unpublishedCoreFields || [];
          this.policy.customSections = schema.customSections || [];
          this.policy.customCss = schema.customCss || '';

          if (schema.customCss && typeof document !== 'undefined') {
            let styleTag = document.getElementById('oz-reg-custom-css') as HTMLStyleElement;
            if (!styleTag) {
              styleTag = document.createElement('style');
              styleTag.id = 'oz-reg-custom-css';
              document.head.appendChild(styleTag);
            }
            styleTag.textContent = schema.customCss;
          }

          this.brandName = schema.brandName || 'Workspace';
          this.logoUrl = schema.logoUrl || '';
          this.faviconUrl = schema.faviconUrl || '';
          this.siteTitle = schema.siteTitle || '';
          this.tagline = schema.tagline || '';
          this.companyDescription = schema.companyDescription || '';
          this.applyHeadMetaAndFavicon();

          // Seamlessly forward browser URL bar to custom vanity slug if user entered via universal alias (/register)
          if (typeof window !== 'undefined' && this.policy.registrationUrlSlug && this.policy.registrationUrlSlug !== 'register') {
            const currentPath = window.location.pathname.toLowerCase();
            if (currentPath === '/register' || currentPath === '/auth/register') {
              this.location.replaceState(`/auth/${this.policy.registrationUrlSlug}`);
            }
          }

          this.recaptchaSiteKey = schema.recaptchaSiteKey || environment.recaptchaSiteKey || '';
          this.model.organizationType = this.policy.defaultIndustrySector;
          this.categories = schema.categories || [];

          const rawFields: any[] = schema.fields || [];
          this.dynamicFields = rawFields.map(f => {
            let optionsList: string[] = [];
            if (f.options && Array.isArray(f.options)) {
              optionsList = f.options;
            } else if (f.optionsJson) {
              try {
                const parsed = JSON.parse(f.optionsJson);
                if (Array.isArray(parsed)) {
                  optionsList = parsed.map(item => typeof item === 'string' ? item : (item?.label || item?.value || ''));
                }
              } catch {
                optionsList = f.optionsJson.split(',').map((s: string) => s.trim());
              }
            }
            return {
              ...f,
              optionsList
            };
          });

          this.filterVisibleDynamicFields();

          if (this.recaptchaSiteKey) {
            this.loadRecaptchaScript();
            if (this.isFinalStep || this.policy.formLayoutMode === 'single' || this.policy.formLayoutMode === 'sections') {
              setTimeout(() => this.initRecaptcha(), 250);
            }
          }
        }
      },
      error: () => {
        this.isLoadingSchema = false;
        this.api.get<any>('PortalUsersApi/categories').subscribe({
          next: (catRes) => {
            this.categories = catRes?.data || catRes || [];
          },
          error: () => {}
        });
      }
    });
  }

  /**
   * Fetches official brand settings from SettingsApi/brand to ensure tenant
   * favicon icon, brand logo, and company identity are populated even if schema returned partial data.
   */
  loadBrandSettings(): void {
    this.api.get<any>('SettingsApi/brand').subscribe({
      next: (res) => {
        if (res?.data) {
          const bData = res.data;
          if (bData.companyName && (!this.brandName || this.brandName === 'Workspace')) {
            this.brandName = bData.companyName;
          }
          if (bData.companyLogoUrl && !this.logoUrl) {
            this.logoUrl = bData.companyLogoUrl;
          }
          const rawIcon = bData.companyIconUrl || bData.companyLogoUrl;
          if (rawIcon && (!this.faviconUrl || this.faviconUrl === '/favicon.ico')) {
            this.faviconUrl = rawIcon;
          }
          if (bData.websiteTitle && !this.siteTitle) {
            this.siteTitle = bData.websiteTitle;
          }
          if (bData.companyDescription && !this.companyDescription) {
            this.companyDescription = bData.companyDescription;
          }
          this.applyHeadMetaAndFavicon();
        }
      },
      error: () => {}
    });
  }

  /**
   * Dynamically synchronizes document title, SEO metadata, and browser tab icon (favicon)
   * in the document <head> based on the tenant organization's branding.
   */
  private applyHeadMetaAndFavicon(): void {
    const brand = this.brandName || 'Workspace';
    const formTitle = this.policy.formTitle || 'Create Your Account';
    const pageTitle = this.siteTitle 
      ? `${formTitle} | ${this.siteTitle}`
      : `${formTitle} | ${brand}`;
    
    // Set Browser Document Title
    this.titleService.setTitle(pageTitle);

    // Set SEO & Social Meta Tags
    const metaDesc = this.companyDescription || this.policy.welcomeMessage || `Register for an account on ${brand}.`;
    this.metaService.updateTag({ name: 'description', content: metaDesc });
    this.metaService.updateTag({ property: 'og:title', content: pageTitle });
    this.metaService.updateTag({ property: 'og:description', content: metaDesc });
    this.metaService.updateTag({ property: 'og:type', content: 'website' });

    // Crisp high-resolution SVG fallback icon so the browser tab is never iconless
    const defaultIconSvg = `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 rx=%2222%22 fill=%22%230050e5%22/><path d=%22M50 24a14 14 0 1 0 0 28 14 14 0 0 0 0-28zm0 35c-15.5 0-30 8-30 20v3h60v-3c0-12-14.5-20-30-20z%22 fill=%22%23ffffff%22/></svg>`;

    const iconUrl = this.faviconUrl || this.logoUrl || defaultIconSvg;
    if (this.faviconUrl || this.logoUrl) {
      this.metaService.updateTag({ property: 'og:image', content: this.faviconUrl || this.logoUrl });
    }
    this.updateFavicon(iconUrl);
  }

  /**
   * Sets or replaces the browser tab page icon (<link rel="icon">) in the document head.
   * Cleanses previous links and mounts new HTMLLinkElements so modern browsers (Chromium/Firefox/Safari)
   * immediately re-fetch and render the tab favicon.
   * @param iconUrl Web URL or data URI of the tenant's brand icon or favicon.
   */
  private updateFavicon(iconUrl: string): void {
    if (typeof document === 'undefined' || !iconUrl) return;

    try {
      // 1. Remove all pre-existing icon and shortcut icon elements to force the browser to invalidate cached blank icons
      const existingIcons = document.querySelectorAll("link[rel*='icon']");
      existingIcons.forEach(el => el.parentNode?.removeChild(el));

      // 2. Create fresh primary icon link
      const iconLink = document.createElement('link');
      iconLink.rel = 'icon';
      iconLink.href = iconUrl;
      if (iconUrl.startsWith('data:image/svg+xml') || iconUrl.endsWith('.svg')) {
        iconLink.type = 'image/svg+xml';
      } else if (iconUrl.endsWith('.png')) {
        iconLink.type = 'image/png';
      } else {
        iconLink.type = 'image/x-icon';
      }
      document.head.appendChild(iconLink);

      // 3. Create fresh shortcut icon link for older engines
      const shortcutLink = document.createElement('link');
      shortcutLink.rel = 'shortcut icon';
      shortcutLink.type = iconLink.type;
      shortcutLink.href = iconUrl;
      document.head.appendChild(shortcutLink);
    } catch {
      // Non-blocking in case of browser security restrictions
    }
  }

  /**
   * Dynamically appends Google reCAPTCHA script to the document if not present.
   */
  private loadRecaptchaScript(): void {
    if (typeof document === 'undefined') return;

    if ((window as any).grecaptcha) {
      this.recaptchaLoaded = true;
      this.initRecaptcha();
      return;
    }

    if (document.getElementById('oz-recaptcha-script')) {
      this.recaptchaLoaded = true;
      return;
    }

    const script = document.createElement('script');
    script.id = 'oz-recaptcha-script';
    script.src = 'https://www.google.com/recaptcha/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      this.recaptchaLoaded = true;
      this.initRecaptcha();
    };
    document.head.appendChild(script);
  }

  /**
   * Resolves the active reCAPTCHA DOM container element across all layout modes.
   */
  private getRecaptchaContainer(): HTMLElement | null {
    if (typeof document === 'undefined') return null;
    return document.getElementById('g-recaptcha-reg-pg')
      || document.getElementById('g-recaptcha-reg-stp')
      || document.getElementById('g-recaptcha-reg-sec')
      || document.getElementById('g-recaptcha-reg')
      || (document.querySelector('.oz-recaptcha-wrap .g-recaptcha') as HTMLElement | null);
  }

  /**
   * Renders the Google reCAPTCHA widget in the DOM container.
   */
  private initRecaptcha(): void {
    if (!this.recaptchaSiteKey) {
      if (environment.recaptchaSiteKey) {
        this.recaptchaSiteKey = environment.recaptchaSiteKey;
      } else {
        return;
      }
    }

    const container = this.getRecaptchaContainer();
    if (!container) return;

    const grecaptcha = (window as any).grecaptcha;
    if (grecaptcha && grecaptcha.render) {
      try {
        if (container.children.length > 0 && this.recaptchaWidgetId !== null) {
          try {
            grecaptcha.reset(this.recaptchaWidgetId);
          } catch {
            container.innerHTML = '';
            this.recaptchaWidgetId = grecaptcha.render(container, {
              sitekey: this.recaptchaSiteKey,
              callback: (token: string) => {
                this.model.recaptchaToken = token;
                this.errorMessage = '';
              },
              'expired-callback': () => {
                this.model.recaptchaToken = '';
              }
            });
          }
        } else {
          container.innerHTML = '';
          this.recaptchaWidgetId = grecaptcha.render(container, {
            sitekey: this.recaptchaSiteKey,
            callback: (token: string) => {
              this.model.recaptchaToken = token;
              this.errorMessage = '';
            },
            'expired-callback': () => {
              this.model.recaptchaToken = '';
            }
          });
        }
      } catch (err) {
        console.warn('reCAPTCHA render notice:', err);
      }
    } else {
      this.loadRecaptchaScript();
      setTimeout(() => this.initRecaptcha(), 300);
    }
  }

  /**
   * Restores previously saved registration progress from local storage or route query params.
   */
  tryRestoreDraft(): void {
    try {
      // 1. Restore temporary password from sessionStorage (scoped to this active browser tab)
      try {
        const sessionPwd = sessionStorage.getItem('oz_reg_pwd_session');
        if (sessionPwd) {
          this.model.password = sessionPwd;
          this.model.confirmPassword = sessionPwd;
        }
      } catch {}

      const savedJson = localStorage.getItem('oz_registration_draft');
      if (savedJson) {
        const draft = JSON.parse(savedJson);
        if (draft && draft.model) {
          this.model.firstName = draft.model.firstName || this.model.firstName;
          this.model.lastName = draft.model.lastName || this.model.lastName;
          this.model.email = draft.model.email || this.model.email;
          this.model.phoneNumber = draft.model.phoneNumber || this.model.phoneNumber;
          this.model.organizationType = draft.model.organizationType || this.model.organizationType;
          if (draft.model.bcpUserCategoryId !== undefined) {
            this.model.bcpUserCategoryId = draft.model.bcpUserCategoryId;
          }
          this.model.referralCode = draft.model.referralCode || this.model.referralCode;

          if (draft.customAttributes) {
            this.customAttributes = { ...draft.customAttributes };
          }

          if (draft.currentStep && draft.currentStep > 1) {
            // Verify prior steps pass validation before placing user on a restored later step
            let safeStep = 1;
            for (let s = 1; s < draft.currentStep; s++) {
              if (this.validateStep(s)) {
                safeStep = s + 1;
              } else {
                break;
              }
            }
            this.currentStep = safeStep;
            if (safeStep < draft.currentStep) {
              this.toast.info('Draft restored. Please review and complete your credentials to proceed.');
            }
          }

          this.draftRestored = true;
          this.filterVisibleDynamicFields();

          if (this.isFinalStep) {
            setTimeout(() => this.initRecaptcha(), 300);
          }
        }
      }

      const resumeParam = this.route.snapshot.queryParams['resume'];
      const targetStep = Number(this.route.snapshot.queryParams['step']);
      if (resumeParam === 'true' && targetStep && targetStep > 1) {
        this.currentStep = targetStep;
        this.draftRestored = true;
        if (this.isFinalStep) {
          setTimeout(() => this.initRecaptcha(), 300);
        }
      }
    } catch (e) {
      console.warn('Failed to parse registration draft:', e);
    }
  }

  /**
   * Persists form progress to local storage so applicants can safely leave and resume.
   */
  saveDraft(showToast: boolean = false): void {
    try {
      // Safely preserve password in sessionStorage for active browser tab refreshes
      if (this.model.password) {
        try {
          sessionStorage.setItem('oz_reg_pwd_session', this.model.password);
        } catch {}
      }

      const draftPayload = {
        model: {
          firstName: this.model.firstName,
          lastName: this.model.lastName,
          email: this.model.email,
          phoneNumber: this.model.phoneNumber,
          organizationType: this.model.organizationType,
          bcpUserCategoryId: this.model.bcpUserCategoryId,
          referralCode: this.model.referralCode
        },
        customAttributes: this.customAttributes,
        currentStep: this.currentStep,
        savedAt: new Date().toISOString()
      };

      localStorage.setItem('oz_registration_draft', JSON.stringify(draftPayload));
      this.draftRestored = true;

      if (showToast) {
        this.toast.success('Registration progress saved! You can resume anytime.');
      }
    } catch (e) {
      console.warn('Failed to save registration draft:', e);
    }
  }

  /**
   * Clears saved draft and resets the registration wizard.
   */
  clearDraft(): void {
    localStorage.removeItem('oz_registration_draft');
    try {
      sessionStorage.removeItem('oz_reg_pwd_session');
    } catch {}
    this.draftRestored = false;
    this.model.password = '';
    this.model.confirmPassword = '';
    this.currentStep = 1;
    this.errorMessage = '';
    this.toast.info('Draft cleared. Starting fresh registration.');
  }

  /**
   * Handles client-side file selection and converts to a base64 DataURL.
   */
  onFileSelected(event: any, fieldKey: string): void {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      this.errorMessage = `File size must not exceed 5MB.`;
      this.toast.error(this.errorMessage);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.customAttributes[fieldKey] = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  /**
   * Submits the registration request with custom attributes, referral code, and reCAPTCHA.
   */
  onRegister(): void {
    this.errorMessage = '';

    // Validate all wizard stages before submitting
    for (let s = 1; s <= this.totalSteps; s++) {
      if (!this.validateStep(s)) {
        if (this.policy.formLayoutMode === 'stepper' || this.policy.formLayoutMode === 'pages') {
          this.currentStep = s;
        }
        return;
      }
    }

    // 3. reCAPTCHA token check (safely wrapped to never throw uncaught client error)
    if (this.recaptchaSiteKey && (window as any).grecaptcha) {
      try {
        if (this.recaptchaWidgetId !== null) {
          const responseToken = (window as any).grecaptcha.getResponse(this.recaptchaWidgetId);
          if (responseToken) {
            this.model.recaptchaToken = responseToken;
          }
        } else {
          const defaultToken = (window as any).grecaptcha.getResponse();
          if (defaultToken) {
            this.model.recaptchaToken = defaultToken;
          }
        }
      } catch (captchaErr) {
        console.warn('reCAPTCHA getResponse check:', captchaErr);
      }

      if (!this.model.recaptchaToken) {
        this.errorMessage = 'Please complete the Google reCAPTCHA verification to continue.';
        this.toast.warning(this.errorMessage);
        return;
      }
    }

    this.loading = true;
    this.errorMessage = '';

    const payload = {
      ...this.model,
      customAttributes: this.customAttributes
    };

    this.api.post<any>('auth/register', payload).subscribe({
      next: (res) => {
        this.loading = false;
        this.registrationSuccess = true;
        this.registeredName = `${this.model.firstName} ${this.model.lastName}`.trim();
        this.registeredEmail = this.model.email;

        // Clear draft & session storage on successful registration
        localStorage.removeItem('oz_registration_draft');
        try {
          sessionStorage.removeItem('oz_reg_pwd_session');
        } catch {}
        this.draftRestored = false;

        // Check if tenant requires administrator approval before login
        if (res?.data?.requiresApproval === true) {
          this.isPendingApproval = true;
          this.successNotice = res.message || this.policy.successMessage || 'Your registration has been submitted and is currently pending administrator approval.';
          this.toast.info('Application submitted. Awaiting administrator review.');
          return;
        }

        this.isPendingApproval = false;
        this.successNotice = res?.message || this.policy.successMessage || 'Registration successful! Your account is active.';

        if (res?.data?.token) {
          this.directLoginToken = res.data.token;
          localStorage.setItem('access_token', res.data.token);
          if (res.data.fullName) localStorage.setItem('user_name', res.data.fullName);
          if (res.data.email) localStorage.setItem('user_email', res.data.email);
        }

        this.toast.success(res?.message || 'Registration successful! Welcome to the portal.');
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = this.extractErrorMessage(err);
        this.toast.error(this.errorMessage);

        // Smart step routing on backend validation failure
        const lower = this.errorMessage.toLowerCase();
        if (lower.includes('password') || lower.includes('email') || lower.includes('name') || lower.includes('credential')) {
          if (this.policy.formLayoutMode === 'stepper' || this.policy.formLayoutMode === 'pages') {
            this.currentStep = 1;
            if (lower.includes('password')) {
              this.focusInputField('s_password', 'st_pw', 'pg_pw', 'sec_pwd');
            } else if (lower.includes('email')) {
              this.focusInputField('s_email', 'st_em', 'pg_em', 'sec_email');
            }
          }
        } else if (lower.includes('sector') || lower.includes('phone') || lower.includes('category')) {
          if (this.policy.formLayoutMode === 'stepper' || this.policy.formLayoutMode === 'pages') {
            this.currentStep = 2;
          }
        } else if (this.visibleDynamicFields.some(f => lower.includes(f.label.toLowerCase()))) {
          if (this.policy.formLayoutMode === 'stepper' || this.policy.formLayoutMode === 'pages') {
            this.currentStep = 3;
          }
        }

        if (this.recaptchaSiteKey && (window as any).grecaptcha && this.recaptchaWidgetId !== null) {
          try {
            (window as any).grecaptcha.reset(this.recaptchaWidgetId);
          } catch { }
        }
      }
    });
  }

  /**
   * Extracts detailed human-readable error messages from HTTP error response payloads.
   */
  private extractErrorMessage(err: any): string {
    if (!err) return 'An unexpected error occurred. Please try again.';
    if (typeof err === 'string') return err;
    if (typeof err?.error === 'string') return err.error;

    // Check camelCase or PascalCase message
    if (err?.error?.message) return err.error.message;
    if (err?.error?.Message) return err.error.Message;

    // Check errors collection
    if (Array.isArray(err?.error?.errors) && err.error.errors.length > 0) {
      return err.error.errors.join(' ');
    }
    if (Array.isArray(err?.error?.Errors) && err.error.Errors.length > 0) {
      return err.error.Errors.join(' ');
    }
    if (err?.error?.errors && typeof err.error.errors === 'object') {
      const msgs = Object.values(err.error.errors).flat().filter(Boolean);
      if (msgs.length > 0) return msgs.join(' ');
    }

    // Check title or statusText
    if (err?.error?.title) return err.error.title;
    if (err?.message) return err.message;
    if (err?.statusText && err.statusText !== 'OK') return err.statusText;

    return 'Failed to complete registration. Please verify details and try again.';
  }

  /**
   * Loads public tenant head code injections (custom CSS, Google Fonts, theme stylesheets)
   * configured under Website Templates > Custom Assets.
   */
  private loadSiteCodeInjections(): void {
    if (typeof document === 'undefined') return;

    this.api.get<any>('WebsiteContentApi/code-injections').subscribe({
      next: (res) => {
        const headTags: any[] = res?.data?.head || [];
        if (headTags && headTags.length > 0) {
          headTags.forEach(tag => {
            if (tag.content) {
              this.appendHeadTag(tag.content);
            }
          });
        }
      },
      error: () => {}
    });
  }

  private appendHeadTag(htmlString: string): void {
    if (typeof document === 'undefined' || !htmlString) return;
    try {
      const temp = document.createElement('div');
      temp.innerHTML = htmlString.trim();
      Array.from(temp.childNodes).forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement;
          el.classList.add('oz-reg-injected-tag');
          if (el.tagName.toLowerCase() === 'script') {
            const s = document.createElement('script');
            s.className = 'oz-reg-injected-tag';
            Array.from(el.attributes).forEach(attr => s.setAttribute(attr.name, attr.value));
            s.textContent = el.textContent;
            document.head.appendChild(s);
          } else {
            document.head.appendChild(el);
          }
        }
      });
    } catch {}
  }
}
