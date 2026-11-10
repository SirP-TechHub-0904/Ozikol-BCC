import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { WorkforceService } from '../../../core/services/workforce.service';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { LandingComponent } from '../../landing/landing.component';
import { AuthLayoutComponent } from '../../../layouts/auth-layout/auth-layout.component';

/**
 * Public/Worker Self-Activation Landing Page Component.
 * Route: `/workforce/onboarding?token=...&email=...`
 * 100% Full Width layout.
 * Validates the single-use invitation token, pre-fills Name, Email & Phone from the invitation,
 * dynamically renders the organization's Published Registration Form as the single source of truth
 * across all 4 presentation modes (`single`, `sections`, `stepper`, `pages`),
 * and marks the invitation link as used upon submission.
 */
@Component({
  selector: 'app-workforce-onboarding',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LandingComponent, AuthLayoutComponent],
  template: `
    <!-- Live Single-Source-of-Truth Outer Shell: Website Layout vs. Auth Layout -->
    <app-landing *ngIf="policy.pageShellLayout !== 'auth'"
                 [embeddedShellMode]="true"
                 [embeddedPageTitle]="policy.registrationFormTitle || 'Create Your Account'"
                 [embeddedPageSubtitle]="policy.registrationWelcomeMessage || 'Join our member directory and workspace portal.'">
      <ng-container *ngTemplateOutlet="onboardingContentTpl"></ng-container>
    </app-landing>

    <app-auth-layout *ngIf="policy.pageShellLayout === 'auth'"
                     [embeddedMode]="true">
      <ng-container *ngTemplateOutlet="onboardingContentTpl"></ng-container>
    </app-auth-layout>

    <ng-template #onboardingContentTpl>
    <div class="onboarding-viewport">
      <div class="onboarding-container">
        <!-- Token Verifying State -->
        <div class="state-card" *ngIf="isVerifying">
          <span class="material-symbols-outlined spin">progress_activity</span>
          <p>Verifying your one-time invitation link...</p>
        </div>

        <!-- Token Invalid or Already Used State -->
        <div class="state-card error-card" *ngIf="!isVerifying && !tokenValid">
          <span class="material-symbols-outlined text-danger">gpp_bad</span>
          <h3>Invitation Link Already Used or Invalid</h3>
          <p>{{ verificationError || 'This one-time onboarding link has already been redeemed or has expired.' }}</p>
          <a routerLink="/auth/login" class="btn btn-outline" style="margin-top: 12px;">Go to Sign In</a>
        </div>

        <!-- Exact Published Registration Form (When Token is Valid) -->
        <div class="rf-sim-card" *ngIf="!isVerifying && tokenValid">
          <div class="rf-sim-header">
            <div class="rf-sim-avatar">
              <span class="material-symbols-outlined">how_to_reg</span>
            </div>
            <h3 class="rf-sim-title">{{ policy.registrationFormTitle || 'Create Your Account' }}</h3>
            <p class="rf-sim-sub">{{ policy.registrationWelcomeMessage || 'Join our member directory and workspace portal.' }}</p>
          </div>

          <!-- =============================================================== -->
          <!-- LAYOUT 1: SINGLE PAGE FORM                                      -->
          <!-- =============================================================== -->
          <div *ngIf="policy.formLayoutMode === 'single'" class="rf-sim-form rf-sim-single">
            <div class="rf-sim-stage-badge">SINGLE PAGE STREAM (ALL QUESTIONS)</div>

            <div class="rf-sim-grid-2">
              <div class="rf-sim-group">
                <label class="rf-sim-label">First Name *</label>
                <input type="text" [(ngModel)]="onboardingModel.firstName" class="rf-sim-input" placeholder="e.g. First" />
              </div>
              <div class="rf-sim-group">
                <label class="rf-sim-label">Last Name *</label>
                <input type="text" [(ngModel)]="onboardingModel.lastName" class="rf-sim-input" placeholder="e.g. Last" />
              </div>
            </div>

            <div class="rf-sim-group">
              <label class="rf-sim-label">Email Address (Login Username) *</label>
              <input type="email" [value]="onboardingModel.email" class="rf-sim-input" placeholder="name@company.com" disabled />
            </div>

            <div *ngIf="policy.requirePassword" class="rf-sim-grid-2">
              <div class="rf-sim-group">
                <label class="rf-sim-label">Create Password *</label>
                <input type="password" [(ngModel)]="onboardingModel.password" class="rf-sim-input" placeholder="••••••••••••" />
              </div>
              <div class="rf-sim-group">
                <label class="rf-sim-label">Confirm Password *</label>
                <input type="password" [(ngModel)]="confirmPassword" class="rf-sim-input" placeholder="••••••••••••" />
              </div>
            </div>

            <div *ngIf="isCoreFieldPublished('phone')" class="rf-sim-group">
              <label class="rf-sim-label">Phone Number</label>
              <input type="text" [(ngModel)]="onboardingModel.phoneNumber" class="rf-sim-input" placeholder="e.g. +0 (000) 000-0000" />
            </div>

            <div *ngIf="isCoreFieldPublished('category')" class="rf-sim-group">
              <label class="rf-sim-label">Member Category / Tier</label>
              <select class="rf-sim-input" [(ngModel)]="selectedCategoryId">
                <option [ngValue]="null">Standard Member (No Category Tier)</option>
                <option *ngFor="let cat of categories" [value]="cat.id">{{ cat.name }}</option>
              </select>
            </div>

            <div *ngFor="let f of filteredFields" class="rf-sim-group">
              <label class="rf-sim-label">
                {{ f.label }}
                <span *ngIf="f.isRequired" class="rf-sim-req">*</span>
              </label>
              <input *ngIf="f.fieldType === 'text' || f.fieldType === 'number'"
                     [type]="f.fieldType === 'number' ? 'number' : 'text'"
                     [(ngModel)]="customAttributes[f.fieldKey]"
                     class="rf-sim-input"
                     [placeholder]="f.placeholder || 'e.g. Enter details'" />
              <textarea *ngIf="f.fieldType === 'textarea'"
                        class="rf-sim-input rf-sim-textarea"
                        rows="2"
                        [(ngModel)]="customAttributes[f.fieldKey]"
                        [placeholder]="f.placeholder || 'e.g. Enter notes'"></textarea>
              <select *ngIf="f.fieldType === 'select'" [(ngModel)]="customAttributes[f.fieldKey]" class="rf-sim-input">
                <option value="">{{ f.placeholder || '-- Choose Option --' }}</option>
                <option *ngFor="let opt of f.options" [value]="opt">{{ opt }}</option>
              </select>
              <input *ngIf="f.fieldType === 'date'" type="date" [(ngModel)]="customAttributes[f.fieldKey]" class="rf-sim-input" />
              <label *ngIf="f.fieldType === 'checkbox'" class="rf-sim-checkbox-label">
                <input type="checkbox" [(ngModel)]="customAttributes[f.fieldKey]" />
                <span>{{ f.placeholder || 'I confirm and agree to this policy' }}</span>
              </label>
              <span *ngIf="f.helpText" class="rf-sim-help">{{ f.helpText }}</span>
            </div>

            <!-- Google reCAPTCHA Anti-Bot Protection -->
            <div class="rf-sim-recaptcha-box">
              <div id="g-recaptcha-wf-single" class="g-recaptcha" *ngIf="recaptchaSiteKey"></div>
              <label class="rf-sim-recaptcha-check" style="cursor: pointer; display: flex; align-items: center; gap: 8px; margin-top: 6px;">
                <input type="checkbox" [(ngModel)]="reCaptchaChecked" style="cursor: pointer;" />
                <span class="material-symbols-outlined rf-recaptcha-shield">verified_user</span>
                <span style="font-size: 11.5px; font-weight: 600; color: #334155;">I'm not a robot · Google reCAPTCHA Protected</span>
              </label>
            </div>

            <button type="button" class="rf-sim-btn rf-sim-btn-finish" [disabled]="isSubmitting" (click)="submitOnboarding()">
              <span class="material-symbols-outlined">how_to_reg</span>
              <span>{{ isSubmitting ? 'Activating Account...' : 'Register & Join Portal' }}</span>
            </button>
          </div>

          <!-- =============================================================== -->
          <!-- LAYOUT 2: SINGLE PAGE + CATEGORY SECTIONS                       -->
          <!-- =============================================================== -->
          <div *ngIf="policy.formLayoutMode === 'sections'" class="rf-sim-form rf-sim-sections">
            <div class="rf-sim-section-box">
              <div class="rf-sim-sec-title">
                <span class="material-symbols-outlined">badge</span>
                <span>1. Personal &amp; Account Credentials</span>
              </div>

              <div class="rf-sim-grid-2">
                <div class="rf-sim-group">
                  <label class="rf-sim-label">First Name *</label>
                  <input type="text" [(ngModel)]="onboardingModel.firstName" class="rf-sim-input" placeholder="e.g. First" />
                </div>
                <div class="rf-sim-group">
                  <label class="rf-sim-label">Last Name *</label>
                  <input type="text" [(ngModel)]="onboardingModel.lastName" class="rf-sim-input" placeholder="e.g. Last" />
                </div>
              </div>

              <div class="rf-sim-group">
                <label class="rf-sim-label">Email Address (Login Username) *</label>
                <input type="email" [value]="onboardingModel.email" class="rf-sim-input" placeholder="name@company.com" disabled />
              </div>

              <div *ngIf="policy.requirePassword" class="rf-sim-grid-2">
                <div class="rf-sim-group">
                  <label class="rf-sim-label">Password *</label>
                  <input type="password" [(ngModel)]="onboardingModel.password" class="rf-sim-input" placeholder="••••••••••••" />
                </div>
                <div class="rf-sim-group">
                  <label class="rf-sim-label">Confirm *</label>
                  <input type="password" [(ngModel)]="confirmPassword" class="rf-sim-input" placeholder="••••••••••••" />
                </div>
              </div>

              <div *ngIf="isCoreFieldPublished('phone')" class="rf-sim-group">
                <label class="rf-sim-label">Phone Number</label>
                <input type="text" [(ngModel)]="onboardingModel.phoneNumber" class="rf-sim-input" placeholder="e.g. +0 (000) 000-0000" />
              </div>

              <div *ngIf="isCoreFieldPublished('category')" class="rf-sim-group">
                <label class="rf-sim-label">Category Tier</label>
                <select class="rf-sim-input" [(ngModel)]="selectedCategoryId">
                  <option [ngValue]="null">Standard Member</option>
                  <option *ngFor="let cat of categories" [value]="cat.id">{{ cat.name }}</option>
                </select>
              </div>
            </div>

            <div class="rf-sim-section-box" *ngIf="filteredFields.length > 0">
              <div class="rf-sim-sec-title">
                <span class="material-symbols-outlined">business</span>
                <span>2. Business &amp; Onboarding Profile</span>
              </div>

              <div *ngFor="let f of filteredFields" class="rf-sim-group">
                <label class="rf-sim-label">
                  {{ f.label }}
                  <span *ngIf="f.isRequired" class="rf-sim-req">*</span>
                </label>
                <input *ngIf="f.fieldType === 'text' || f.fieldType === 'number'"
                       [type]="f.fieldType === 'number' ? 'number' : 'text'"
                       [(ngModel)]="customAttributes[f.fieldKey]"
                       class="rf-sim-input"
                       [placeholder]="f.placeholder || 'e.g. Enter details'" />
                <select *ngIf="f.fieldType === 'select'" [(ngModel)]="customAttributes[f.fieldKey]" class="rf-sim-input">
                  <option value="">{{ f.placeholder || '-- Select --' }}</option>
                  <option *ngFor="let opt of f.options" [value]="opt">{{ opt }}</option>
                </select>
                <textarea *ngIf="f.fieldType === 'textarea'" [(ngModel)]="customAttributes[f.fieldKey]" class="rf-sim-input rf-sim-textarea" rows="2" [placeholder]="f.placeholder || 'e.g. Enter notes'"></textarea>
                <input *ngIf="f.fieldType === 'date'" type="date" [(ngModel)]="customAttributes[f.fieldKey]" class="rf-sim-input" />
              </div>
            </div>

            <!-- Google reCAPTCHA Anti-Bot Protection -->
            <div class="rf-sim-recaptcha-box">
              <div id="g-recaptcha-wf-sections" class="g-recaptcha" *ngIf="recaptchaSiteKey"></div>
              <label class="rf-sim-recaptcha-check" style="cursor: pointer; display: flex; align-items: center; gap: 8px; margin-top: 6px;">
                <input type="checkbox" [(ngModel)]="reCaptchaChecked" style="cursor: pointer;" />
                <span class="material-symbols-outlined rf-recaptcha-shield">verified_user</span>
                <span style="font-size: 11.5px; font-weight: 600; color: #334155;">I'm not a robot · Google reCAPTCHA Protected</span>
              </label>
            </div>

            <button type="button" class="rf-sim-btn rf-sim-btn-finish" [disabled]="isSubmitting" (click)="submitOnboarding()">
              <span class="material-symbols-outlined">how_to_reg</span>
              <span>{{ isSubmitting ? 'Activating Account...' : 'Register & Join Portal' }}</span>
            </button>
          </div>

          <!-- =============================================================== -->
          <!-- LAYOUT 3: STEP-BY-STEP STEPPER WIZARD                           -->
          <!-- =============================================================== -->
          <div *ngIf="policy.formLayoutMode === 'stepper'" class="rf-sim-form rf-sim-stepper-view">
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

            <div *ngIf="simStep === 1" class="rf-sim-stage">
              <div class="rf-sim-stage-badge">STAGE 1: ACCOUNT CREDENTIALS</div>
              <div class="rf-sim-grid-2">
                <div class="rf-sim-group">
                  <label class="rf-sim-label">First Name *</label>
                  <input type="text" [(ngModel)]="onboardingModel.firstName" class="rf-sim-input" placeholder="e.g. First" />
                </div>
                <div class="rf-sim-group">
                  <label class="rf-sim-label">Last Name *</label>
                  <input type="text" [(ngModel)]="onboardingModel.lastName" class="rf-sim-input" placeholder="e.g. Last" />
                </div>
              </div>
              <div class="rf-sim-group">
                <label class="rf-sim-label">Email Address *</label>
                <input type="email" [value]="onboardingModel.email" class="rf-sim-input" placeholder="name@company.com" disabled />
              </div>
              <div *ngIf="policy.requirePassword" class="rf-sim-grid-2">
                <div class="rf-sim-group">
                  <label class="rf-sim-label">Password *</label>
                  <input type="password" [(ngModel)]="onboardingModel.password" class="rf-sim-input" placeholder="••••••••••••" />
                </div>
                <div class="rf-sim-group">
                  <label class="rf-sim-label">Confirm *</label>
                  <input type="password" [(ngModel)]="confirmPassword" class="rf-sim-input" placeholder="••••••••••••" />
                </div>
              </div>
              <button type="button" class="rf-sim-btn" (click)="simStep = 2">
                <span>Next: Category &amp; Sector</span>
                <span class="material-symbols-outlined">arrow_forward</span>
              </button>
            </div>

            <div *ngIf="simStep === 2" class="rf-sim-stage">
              <div class="rf-sim-stage-badge">STAGE 2: CATEGORY &amp; SECTOR</div>
              <div *ngIf="isCoreFieldPublished('phone')" class="rf-sim-group">
                <label class="rf-sim-label">Phone Number</label>
                <input type="text" [(ngModel)]="onboardingModel.phoneNumber" class="rf-sim-input" placeholder="e.g. +0 (000) 000-0000" />
              </div>
              <div *ngIf="isCoreFieldPublished('category')" class="rf-sim-group">
                <label class="rf-sim-label">Member Category Tier</label>
                <select class="rf-sim-input" [(ngModel)]="selectedCategoryId">
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

            <div *ngIf="simStep === 3" class="rf-sim-stage">
              <div class="rf-sim-stage-badge">STAGE 3: CUSTOM BUSINESS DETAILS</div>
              <div *ngFor="let f of filteredFields" class="rf-sim-group">
                <label class="rf-sim-label">{{ f.label }} <span *ngIf="f.isRequired" class="rf-sim-req">*</span></label>
                <input *ngIf="f.fieldType === 'text' || f.fieldType === 'number'" [type]="f.fieldType === 'number' ? 'number' : 'text'" [(ngModel)]="customAttributes[f.fieldKey]" class="rf-sim-input" [placeholder]="f.placeholder || 'e.g. Enter details'" />
                <select *ngIf="f.fieldType === 'select'" [(ngModel)]="customAttributes[f.fieldKey]" class="rf-sim-input">
                  <option value="">{{ f.placeholder || '-- Select --' }}</option>
                  <option *ngFor="let opt of f.options" [value]="opt">{{ opt }}</option>
                </select>
                <textarea *ngIf="f.fieldType === 'textarea'" [(ngModel)]="customAttributes[f.fieldKey]" class="rf-sim-input rf-sim-textarea" rows="2" [placeholder]="f.placeholder || 'e.g. Enter notes'"></textarea>
                <input *ngIf="f.fieldType === 'date'" type="date" [(ngModel)]="customAttributes[f.fieldKey]" class="rf-sim-input" />
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

            <div *ngIf="simStep === 4" class="rf-sim-stage">
              <div class="rf-sim-stage-badge">STAGE 4: VERIFY &amp; FINISH</div>
              <div class="rf-sim-sum-box">
                <div style="font-weight: 700; font-size: 11px; margin-bottom: 4px; color: #1e293b;">Application Review</div>
                <div style="font-size: 11px; color: #475569;">Applicant: <strong>{{ onboardingModel.firstName }} {{ onboardingModel.lastName }}</strong></div>
                <div style="font-size: 11px; color: #475569;">Email: <strong>{{ onboardingModel.email }}</strong></div>
              </div>
              <!-- Google reCAPTCHA Anti-Bot Protection -->
              <div class="rf-sim-recaptcha-box">
                <div id="g-recaptcha-wf-stepper" class="g-recaptcha" *ngIf="recaptchaSiteKey"></div>
                <label class="rf-sim-recaptcha-check" style="cursor: pointer; display: flex; align-items: center; gap: 8px; margin-top: 6px;">
                  <input type="checkbox" [(ngModel)]="reCaptchaChecked" style="cursor: pointer;" />
                  <span class="material-symbols-outlined rf-recaptcha-shield">verified_user</span>
                  <span style="font-size: 11.5px; font-weight: 600; color: #334155;">I'm not a robot · Google reCAPTCHA Protected</span>
                </label>
              </div>
              <div class="rf-sim-nav-row">
                <button type="button" class="rf-sim-btn-sub" (click)="simStep = (fields.length > 0 ? 3 : 2)">
                  <span class="material-symbols-outlined">arrow_back</span>
                  <span>Back</span>
                </button>
                <button type="button" class="rf-sim-btn rf-sim-btn-finish" [disabled]="isSubmitting" (click)="submitOnboarding()">
                  <span class="material-symbols-outlined">how_to_reg</span>
                  <span>{{ isSubmitting ? 'Submitting...' : 'Submit Application' }}</span>
                </button>
              </div>
            </div>
          </div>

          <!-- =============================================================== -->
          <!-- LAYOUT 4: PAGE-BY-PAGE MULTI-PAGE FORM                          -->
          <!-- =============================================================== -->
          <div *ngIf="policy.formLayoutMode === 'pages'" class="rf-sim-form rf-sim-pages-view">
            <div class="rf-sim-page-header">
              <div class="rf-sim-page-info">
                <span class="rf-page-badge">Page {{ simStep }} of 3</span>
                <strong class="rf-page-title">{{ simStep === 1 ? 'Personal Credentials' : (simStep === 2 ? 'Category & Questions' : 'Compliance & Finish') }}</strong>
              </div>
              <div class="rf-sim-page-progress">
                <div class="rf-sim-progress-bar" [style.width.%]="(simStep / 3) * 100"></div>
              </div>
            </div>

            <div *ngIf="simStep === 1" class="rf-sim-stage">
              <div class="rf-sim-grid-2">
                <div class="rf-sim-group">
                  <label class="rf-sim-label">First Name *</label>
                  <input type="text" [(ngModel)]="onboardingModel.firstName" class="rf-sim-input" placeholder="e.g. First" />
                </div>
                <div class="rf-sim-group">
                  <label class="rf-sim-label">Last Name *</label>
                  <input type="text" [(ngModel)]="onboardingModel.lastName" class="rf-sim-input" placeholder="e.g. Last" />
                </div>
              </div>
              <div class="rf-sim-group">
                <label class="rf-sim-label">Email Address *</label>
                <input type="email" [value]="onboardingModel.email" class="rf-sim-input" placeholder="name@company.com" disabled />
              </div>
              <div *ngIf="policy.requirePassword" class="rf-sim-grid-2">
                <div class="rf-sim-group">
                  <label class="rf-sim-label">Password *</label>
                  <input type="password" [(ngModel)]="onboardingModel.password" class="rf-sim-input" placeholder="••••••••••••" />
                </div>
                <div class="rf-sim-group">
                  <label class="rf-sim-label">Confirm *</label>
                  <input type="password" [(ngModel)]="confirmPassword" class="rf-sim-input" placeholder="••••••••••••" />
                </div>
              </div>
              <button type="button" class="rf-sim-btn" (click)="simStep = 2">
                <span>Continue to Page 2</span>
                <span class="material-symbols-outlined">arrow_forward</span>
              </button>
            </div>

            <div *ngIf="simStep === 2" class="rf-sim-stage">
              <div *ngIf="isCoreFieldPublished('phone')" class="rf-sim-group">
                <label class="rf-sim-label">Phone Number</label>
                <input type="text" [(ngModel)]="onboardingModel.phoneNumber" class="rf-sim-input" placeholder="e.g. +0 (000) 000-0000" />
              </div>
              <div *ngIf="isCoreFieldPublished('category')" class="rf-sim-group">
                <label class="rf-sim-label">Member Category</label>
                <select class="rf-sim-input" [(ngModel)]="selectedCategoryId">
                  <option [ngValue]="null">Standard Member</option>
                  <option *ngFor="let cat of categories" [value]="cat.id">{{ cat.name }}</option>
                </select>
              </div>
              <div *ngFor="let f of filteredFields" class="rf-sim-group">
                <label class="rf-sim-label">{{ f.label }} <span *ngIf="f.isRequired" class="rf-sim-req">*</span></label>
                <input *ngIf="f.fieldType === 'text' || f.fieldType === 'number'" [type]="f.fieldType === 'number' ? 'number' : 'text'" [(ngModel)]="customAttributes[f.fieldKey]" class="rf-sim-input" [placeholder]="f.placeholder || 'e.g. Details'" />
                <select *ngIf="f.fieldType === 'select'" [(ngModel)]="customAttributes[f.fieldKey]" class="rf-sim-input">
                  <option value="">{{ f.placeholder || '-- Select --' }}</option>
                  <option *ngFor="let opt of f.options" [value]="opt">{{ opt }}</option>
                </select>
                <textarea *ngIf="f.fieldType === 'textarea'" [(ngModel)]="customAttributes[f.fieldKey]" class="rf-sim-input rf-sim-textarea" rows="2"></textarea>
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

            <div *ngIf="simStep === 3" class="rf-sim-stage">
              <div class="rf-sim-sum-box">
                <div style="font-weight: 700; font-size: 11px; margin-bottom: 4px; color: #1e293b;">Final Submission Checklist</div>
                <div style="font-size: 11px; color: #475569;">Applicant: <strong>{{ onboardingModel.firstName }} {{ onboardingModel.lastName }}</strong></div>
                <div style="font-size: 11px; color: #475569;">Email: <strong>{{ onboardingModel.email }}</strong></div>
                <div style="font-size: 11px; color: #64748b;">Ready for submission verification.</div>
              </div>
              <!-- Google reCAPTCHA Anti-Bot Protection -->
              <div class="rf-sim-recaptcha-box">
                <div id="g-recaptcha-wf-pages" class="g-recaptcha" *ngIf="recaptchaSiteKey"></div>
                <label class="rf-sim-recaptcha-check" style="cursor: pointer; display: flex; align-items: center; gap: 8px; margin-top: 6px;">
                  <input type="checkbox" [(ngModel)]="reCaptchaChecked" style="cursor: pointer;" />
                  <span class="material-symbols-outlined rf-recaptcha-shield">verified_user</span>
                  <span style="font-size: 11.5px; font-weight: 600; color: #334155;">I'm not a robot · Google reCAPTCHA Protected</span>
                </label>
              </div>
              <div class="rf-sim-nav-row">
                <button type="button" class="rf-sim-btn-sub" (click)="simStep = 2">
                  <span class="material-symbols-outlined">arrow_back</span>
                  <span>Previous Page</span>
                </button>
                <button type="button" class="rf-sim-btn rf-sim-btn-finish" [disabled]="isSubmitting" (click)="submitOnboarding()">
                  <span class="material-symbols-outlined">how_to_reg</span>
                  <span>{{ isSubmitting ? 'Submitting...' : 'Submit Application' }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </ng-template>
  `,
  styles: [`
    .onboarding-viewport {
      width: 100%;
      max-width: 580px;
      margin: 0 auto;
    }
    .onboarding-container {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .rf-sim-recaptcha-box {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      padding: 12px 14px;
      margin-top: 8px;
    }
    .rf-recaptcha-shield {
      font-size: 18px;
      color: #0050e5;
    }

    /* State Cards */
    .state-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 40px 24px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
    }
    .state-card .material-symbols-outlined {
      font-size: 40px;
      color: #0050e5;
    }
    .error-card .material-symbols-outlined {
      color: #dc2626;
    }
    .state-card h3 {
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
    }
    .state-card p {
      font-size: 13.5px;
      color: #64748b;
      margin: 0;
    }

    /* Exact Registration Form Styles */
    .rf-sim-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 28px 26px;
      color: #0f172a;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
      width: 100%;
    }
    .rf-sim-header { text-align: center; margin-bottom: 20px; }
    .rf-sim-avatar {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: #eff6ff;
      border: 1px solid #dbeafe;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: #0050e5;
      margin-bottom: 8px;
    }
    .rf-sim-title { font-size: 20px; font-weight: 800; margin: 0 0 4px; }
    .rf-sim-sub { font-size: 13px; color: #64748b; margin: 0; }
    .rf-sim-form { display: flex; flex-direction: column; gap: 12px; }
    .rf-sim-stage { display: flex; flex-direction: column; gap: 12px; }
    .rf-sim-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .rf-sim-group { display: flex; flex-direction: column; gap: 4px; }
    .rf-sim-label { font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; }
    .rf-sim-req { color: #dc2626; margin-left: 2px; }
    .rf-sim-input {
      height: 40px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 0 12px;
      font-size: 13.5px;
      color: #0f172a;
      background: #ffffff;
      outline: none;
      box-sizing: border-box;
      width: 100%;
    }
    .rf-sim-input:disabled {
      background: #f1f5f9;
      color: #64748b;
      cursor: not-allowed;
    }
    .rf-sim-textarea { height: auto; padding: 8px 12px; resize: none; }
    .rf-sim-checkbox-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #334155;
      cursor: pointer;
    }
    .rf-sim-help { font-size: 11px; color: #94a3b8; font-style: italic; }
    .rf-sim-stepper {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin: 8px 0 16px;
      padding: 0 4px;
    }
    .rf-sim-step {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
      cursor: pointer;
      user-select: none;
    }
    .rf-sim-step.active { color: #0050e5; }
    .rf-sim-step .step-num {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #f1f5f9;
      border: 1.5px solid #cbd5e1;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 800;
    }
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
      margin: 0 8px 16px;
    }
    .rf-sim-stage-badge {
      font-size: 10.5px;
      font-weight: 800;
      color: #0050e5;
      background: #eff6ff;
      border: 1px solid #dbeafe;
      padding: 4px 10px;
      border-radius: 6px;
      margin-bottom: 10px;
      text-align: center;
      letter-spacing: 0.05em;
    }
    .rf-sim-nav-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-top: 16px;
    }
    .rf-sim-nav-row .rf-sim-btn {
      margin-top: 0 !important;
      flex: 1;
    }
    .rf-sim-btn-sub {
      height: 42px;
      padding: 0 18px;
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
    }
    .rf-sim-sum-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 14px;
      margin-bottom: 8px;
    }
    .rf-sim-btn {
      margin-top: 16px;
      height: 44px;
      background: #0050e5;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      cursor: pointer;
      width: 100%;
    }
    .rf-sim-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .rf-sim-btn-finish {
      background: linear-gradient(135deg, #10b981, #059669) !important;
    }
    .rf-sim-section-box {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .rf-sim-sec-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 800;
      color: #1e293b;
      margin-bottom: 4px;
      padding-bottom: 8px;
      border-bottom: 1px solid #f1f5f9;
    }
    .rf-sim-sec-title span.material-symbols-outlined { font-size: 18px; color: #0050e5; }
    .rf-sim-page-header { margin-bottom: 12px; }
    .rf-sim-page-info {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 6px;
    }
    .rf-page-badge {
      font-size: 11px;
      font-weight: 800;
      color: #0050e5;
      background: #eff6ff;
      padding: 2px 8px;
      border-radius: 4px;
    }
    .rf-page-title { font-size: 12.5px; color: #0f172a; }
    .rf-sim-page-progress {
      height: 5px;
      background: #e2e8f0;
      border-radius: 2px;
      overflow: hidden;
    }
    .rf-sim-progress-bar {
      height: 100%;
      background: #0050e5;
      transition: width 0.25s ease;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      border: 1px solid transparent;
      text-decoration: none;
    }
    .btn-outline {
      background: #ffffff;
      border-color: #cbd5e1;
      color: #334155;
    }
    .text-danger { color: #dc2626; }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    @media (max-width: 768px) {
      .rf-sim-grid-2 { grid-template-columns: 1fr; }
      .onboarding-viewport { padding: 20px 12px 60px 12px; }
    }
  `]
})
export class WorkforceOnboardingComponent implements OnInit, OnDestroy {
  private syncChannel?: BroadcastChannel;
  isVerifying = true;
  tokenValid = false;
  verificationError = '';
  isSubmitting = false;

  token = '';
  confirmPassword = '';
  simStep = 1;
  selectedCategoryId: string | null = null;
  recaptchaSiteKey = '';
  reCaptchaChecked = false;

  policy = {
    registrationFormTitle: 'Create Your Account',
    registrationWelcomeMessage: 'Join our member directory and workspace portal.',
    pageShellLayout: 'website' as 'website' | 'auth',
    formLayoutMode: 'single' as 'single' | 'sections' | 'stepper' | 'pages',
    requirePassword: true,
    unpublishedCoreFields: [] as string[],
    customSections: [] as string[]
  };
  fields: any[] = [];
  categories: any[] = [];
  customAttributes: { [key: string]: any } = {};

  onboardingModel = {
    token: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    jobTitle: 'Staff Member',
    customAttributes: {} as { [key: string]: any }
  };

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly workforceService: WorkforceService,
    private readonly api: ApiService,
    private readonly toast: ToastService
  ) {}

  ngOnInit(): void {
    this.loadPublishedRegistrationSchema();

    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        this.syncChannel = new BroadcastChannel('ozikol_reg_form_sync');
        this.syncChannel.onmessage = (event) => {
          if (event?.data?.policy) {
            this.policy = { ...this.policy, ...event.data.policy };
          }
          this.loadPublishedRegistrationSchema();
        };
      }
    } catch {}

    const pathToken = this.route.snapshot.paramMap.get('token') || '';
    this.route.queryParams.subscribe(params => {
      const routeParamToken = this.route.snapshot.paramMap.get('token') || pathToken;
      this.token = routeParamToken || params['token'] || '';
      const email = params['email'] || '';
      this.onboardingModel.token = this.token;
      if (email) {
        this.onboardingModel.email = email;
      }

      if (!this.token) {
        this.isVerifying = false;
        this.tokenValid = false;
        this.verificationError = 'Missing invitation token in the link.';
        return;
      }

      this.verifyToken();
    });
  }

  ngOnDestroy(): void {
    if (this.syncChannel) {
      this.syncChannel.close();
    }
  }

  @HostListener('window:storage', ['$event'])
  onStorageChange(event: StorageEvent): void {
    if (event.key === 'ozikol_reg_form_updated_at') {
      this.loadPublishedRegistrationSchema();
    }
  }

  @HostListener('window:focus')
  onWindowFocus(): void {
    this.loadPublishedRegistrationSchema();
  }

  private loadPublishedRegistrationSchema(): void {
    this.api.get<any>(`RegistrationFormApi/public-schema?t=${Date.now()}`).subscribe({
      next: (res: any) => {
        const schema = res?.data || res;
        if (schema) {
          this.policy.registrationFormTitle = schema.formTitle || 'Create Your Account';
          this.policy.registrationWelcomeMessage = schema.welcomeMessage || 'Join our member directory and workspace portal.';
          this.policy.pageShellLayout = schema.pageShellLayout || 'website';
          this.policy.formLayoutMode = schema.formLayoutMode || 'single';
          this.policy.requirePassword = schema.requirePassword ?? true;
          this.policy.unpublishedCoreFields = schema.unpublishedCoreFields || [];
          this.policy.customSections = schema.customSections || [];
          this.recaptchaSiteKey = schema.recaptchaSiteKey || '';
          this.categories = schema.categories || [];
          this.initRecaptcha();

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
        }
      },
      error: () => {}
    });
  }

  get filteredFields(): any[] {
    return this.fields.filter(f => {
      if (f.isActive === false) return false;
      if (!f.bcpUserCategoryId) return true;
      return f.bcpUserCategoryId === this.selectedCategoryId;
    });
  }

  isCoreFieldPublished(key: string): boolean {
    if (!this.policy.unpublishedCoreFields) return true;
    return !this.policy.unpublishedCoreFields.includes(key);
  }

  private verifyToken(): void {
    this.isVerifying = true;
    this.workforceService.verifyOnboardingToken(this.token, this.onboardingModel.email).subscribe({
      next: (res: any) => {
        this.isVerifying = false;
        if (res && res.data && res.data.isValid) {
          this.tokenValid = true;
          if (res.data.email) {
            this.onboardingModel.email = res.data.email;
          }
          if (res.data.phoneNumber) {
            this.onboardingModel.phoneNumber = res.data.phoneNumber;
          }
          if (res.data.fullName) {
            const parts = String(res.data.fullName).trim().split(' ');
            this.onboardingModel.firstName = parts[0] || '';
            this.onboardingModel.lastName = parts.length > 1 ? parts.slice(1).join(' ') : '';
          }
        } else {
          this.tokenValid = false;
          this.verificationError = res?.message || 'Invalid or expired token.';
        }
      },
      error: (err: any) => {
        this.isVerifying = false;
        this.tokenValid = false;
        this.verificationError = err?.error?.message || 'This invitation link has already been used or is invalid.';
      }
    });
  }

  private initRecaptcha(): void {
    if (typeof document === 'undefined' || !this.recaptchaSiteKey) return;
    if (!document.getElementById('google-recaptcha-script')) {
      const script = document.createElement('script');
      script.id = 'google-recaptcha-script';
      script.src = 'https://www.google.com/recaptcha/api.js';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    setTimeout(() => {
      try {
        const grecaptcha = (window as any).grecaptcha;
        if (grecaptcha && typeof grecaptcha.render === 'function') {
          ['g-recaptcha-wf-single', 'g-recaptcha-wf-sections', 'g-recaptcha-wf-stepper', 'g-recaptcha-wf-pages'].forEach(id => {
            const el = document.getElementById(id);
            if (el && el.children.length === 0) {
              try {
                grecaptcha.render(el, {
                  sitekey: this.recaptchaSiteKey,
                  callback: () => { this.reCaptchaChecked = true; }
                });
              } catch {}
            }
          });
        }
      } catch {}
    }, 350);
  }

  submitOnboarding(): void {
    const grecaptcha = typeof window !== 'undefined' ? (window as any).grecaptcha : null;
    const widgetToken = grecaptcha && typeof grecaptcha.getResponse === 'function' ? grecaptcha.getResponse() : '';
    if (!this.reCaptchaChecked && !widgetToken) {
      this.toast.warning('Please complete the Google reCAPTCHA anti-bot verification before submitting.');
      return;
    }

    if (this.policy.requirePassword) {
      if (!this.onboardingModel.password || this.onboardingModel.password.length < 6) {
        this.toast.warning('Password must be at least 6 characters.');
        return;
      }

      if (this.onboardingModel.password !== this.confirmPassword) {
        this.toast.warning('Passwords do not match. Please re-enter.');
        return;
      }
    }

    if (!this.onboardingModel.firstName?.trim() || !this.onboardingModel.lastName?.trim()) {
      this.toast.warning('First Name and Last Name are required.');
      return;
    }

    this.isSubmitting = true;
    const payload = {
      ...this.onboardingModel,
      customAttributes: this.customAttributes
    };

    this.workforceService.completeOnboarding(payload).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.toast.success('Registration complete! Your one-time invitation link has now been redeemed.');
        this.router.navigate(['/auth/login']);
      },
      error: (err: any) => {
        this.isSubmitting = false;
        this.toast.error(err?.error?.message || 'Could not complete registration.');
      }
    });
  }
}
