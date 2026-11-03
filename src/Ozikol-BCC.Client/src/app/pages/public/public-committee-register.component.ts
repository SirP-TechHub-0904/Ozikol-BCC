import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CommitteesService } from '../../core/services/committees.service';
import { ApiService } from '../../core/services/api.service';
import { TemplateHydrationService } from '../admin/content/templates/services/template-hydration.service';
import { ContentHydrationService } from '../admin/content/templates/services/content-hydration.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';

/**
 * Public Committee & Sub-Group External Registration Portal
 * Routes: /join-committee, /join-committee/:tenantSlug, /join-committee/:tenantSlug/:groupSlug
 * Integrates natively with the website layout:
 * - Top: Live CMS Studio Navbar template from 'my-templates' (or clean responsive brand navbar fallback).
 * - Breadcrumb: Live CMS Studio Breadcrumb template from 'my-templates'.
 * - Body: Centered single registration card containing committee context and form fields (zero member count clutter).
 * - Bottom: Live CMS Studio Footer template from 'my-templates' (or clean responsive brand footer fallback).
 */
@Component({
  selector: 'app-public-committee-register',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TranslatePipe],
  template: `
    <div class="pub-site-shell">
      <!-- 1. FULL-WIDTH WEBSITE NAVBAR / HEADER (LIVE CMS ACTIVE TEMPLATE OR CLEAN BRAND FALLBACK) -->
      <header class="pub-cms-header" *ngIf="safeHeaderHtml" [innerHTML]="safeHeaderHtml"></header>
      <header class="pub-site-header" *ngIf="!safeHeaderHtml">
        <div class="pub-site-header-inner">
          <a routerLink="/" class="pub-site-brand">
            <img *ngIf="brand?.logoUrl" [src]="brand.logoUrl" [alt]="brand.brandName" class="pub-site-logo" />
            <div class="pub-logo-fallback" *ngIf="!brand?.logoUrl">
              <span class="material-symbols-outlined">diversity_3</span>
            </div>
            <div class="pub-site-brand-meta">
              <span class="pub-site-brand-title">{{ brand?.brandName || 'Organization Workspace' }}</span>
              <span class="pub-site-brand-sub">{{ aliases.aliasPlural }} Registration</span>
            </div>
          </a>

          <div class="pub-site-nav-actions">
            <a routerLink="/" class="pub-nav-link">
              <span class="material-symbols-outlined">home</span>
              <span>Home</span>
            </a>
            <a routerLink="/login" class="pub-btn-header-signin" *ngIf="!signedInMember">
              <span class="material-symbols-outlined">login</span>
              <span>Sign In</span>
            </a>
            <a routerLink="/committees/workspace/my" class="pub-btn-header-signin" *ngIf="signedInMember">
              <span class="material-symbols-outlined">space_dashboard</span>
              <span>Workspace</span>
            </a>
          </div>
        </div>
      </header>

      <!-- 2. LIVE CMS STUDIO BREADCRUMB TEMPLATE -->
      <div class="pub-cms-breadcrumb" *ngIf="safeBreadcrumbHtml" [innerHTML]="safeBreadcrumbHtml"></div>

      <!-- 3. MAIN WEBSITE BODY (CENTERED REGISTRATION FORM) -->
      <main class="pub-site-main">
        <div class="pub-main-centered-wrap">

          <!-- Loading State -->
          <div class="pub-card-state" *ngIf="loading">
            <span class="material-symbols-outlined spin">progress_activity</span>
            <p>Loading registration portal...</p>
          </div>

          <!-- Error State -->
          <div class="pub-card-state" *ngIf="!loading && loadError">
            <span class="material-symbols-outlined err-icon">error</span>
            <h2>Registration Unavailable</h2>
            <p>{{ loadError }}</p>
            <a routerLink="/" class="pub-btn-primary" style="margin-top: 14px;">Return to Home</a>
          </div>

          <!-- Success State -->
          <div class="pub-card-state success" *ngIf="!loading && submittedSuccess">
            <div class="pub-success-icon-wrap">
              <span class="material-symbols-outlined">verified</span>
            </div>
            <h2>{{ submissionStatus === 'Approved' ? 'You Are Enrolled!' : 'Application Submitted' }}</h2>
            <p>{{ submissionMessage }}</p>
            <div class="pub-success-actions">
              <a *ngIf="signedInMember" routerLink="/committees/workspace/my" class="pub-btn-primary">
                Open My {{ aliases.aliasPlural }}
              </a>
              <button *ngIf="!signedInMember && directoryMode" type="button" class="pub-btn-secondary" (click)="resetForAnother()">
                Register for Another {{ aliases.aliasSingular }}
              </button>
              <a *ngIf="!signedInMember && !directoryMode" routerLink="/" class="pub-btn-secondary">
                Return to Website
              </a>
            </div>
          </div>

          <!-- Active Centered Registration Card -->
          <div class="pub-card-form" *ngIf="!loading && !loadError && !submittedSuccess && activeCommittee">

            <!-- Directory Selector Dropdown if multiple committees are open -->
            <div class="pub-dir-select-bar" *ngIf="directoryMode && openCommittees.length > 1">
              <label>Select {{ aliases.aliasSingular }} / {{ aliases.subGroupAliasSingular }} to Join:</label>
              <select [ngModel]="activeCommittee?.id" (ngModelChange)="onDirectoryChange($event)" class="pub-dir-dropdown">
                <option *ngFor="let c of openCommittees" [value]="c.id">
                  {{ c.name }} ({{ c.parentCommitteeName ? ('Under ' + c.parentCommitteeName) : (c.categoryTag || aliases.aliasSingular) }})
                </option>
              </select>
            </div>

            <!-- Card Header: Badge, Title, Description, Meeting Schedule (Zero Member Count!) -->
            <div class="pub-card-header">
              <div class="pub-badge-schedule-row">
                <span class="pub-category-badge">{{ activeCommittee.parentCommitteeId ? aliases.subGroupAliasSingular : aliases.aliasSingular }}</span>
                <span class="pub-schedule-badge" *ngIf="activeCommittee.meetingSchedule">
                  <span class="material-symbols-outlined">event_repeat</span>
                  <span>{{ activeCommittee.meetingSchedule }}</span>
                </span>
              </div>
              <h1 class="pub-form-title">{{ activeCommittee.name }}</h1>
              <p class="pub-form-desc">{{ activeCommittee.description || activeCommittee.missionStatement || 'Complete the registration form below to join.' }}</p>
            </div>

            <!-- Form Validation Alert -->
            <div class="pub-alert error" *ngIf="formError">
              <span class="material-symbols-outlined">error</span>
              <span>{{ formError }}</span>
            </div>

            <!-- Form Body Fields -->
            <form (ngSubmit)="submitRegistration()" class="pub-form-body">

              <!-- Personal Identity Grid (First Name & Last Name) -->
              <div class="pub-form-row two-cols">
                <div class="pub-field">
                  <label>First Name <span class="req">*</span></label>
                  <input
                    type="text"
                    [(ngModel)]="firstName"
                    name="firstName"
                    placeholder="e.g. First Name"
                    required
                    autocomplete="given-name"
                  />
                </div>
                <div class="pub-field">
                  <label>Last Name <span class="req">*</span></label>
                  <input
                    type="text"
                    [(ngModel)]="lastName"
                    name="lastName"
                    placeholder="e.g. Last Name"
                    required
                    autocomplete="family-name"
                  />
                </div>
              </div>

              <!-- Contact Grid (Email & Phone Number) -->
              <div class="pub-form-row two-cols">
                <div class="pub-field">
                  <label>Email Address <span class="req">*</span></label>
                  <input
                    type="email"
                    [(ngModel)]="email"
                    name="email"
                    placeholder="name@company.com"
                    required
                    autocomplete="email"
                  />
                </div>
                <div class="pub-field">
                  <label>Phone Number (Optional)</label>
                  <input
                    type="tel"
                    [(ngModel)]="phoneNumber"
                    name="phoneNumber"
                    placeholder="e.g. +0 (000) 000-0000"
                    autocomplete="tel"
                  />
                </div>
              </div>

              <!-- Dynamic Extra Intake Questions -->
              <div class="pub-extra-section" *ngIf="activeCommittee.intakeFormSchema?.questions?.length > 0">
                <div class="pub-extra-head">
                  <h4>Intake Questions</h4>
                  <p>Please provide the additional information requested by the {{ aliases.aliasSingular.toLowerCase() }} leadership.</p>
                </div>

                <div class="pub-field" *ngFor="let q of activeCommittee.intakeFormSchema.questions">
                  <label>
                    {{ q.label }}
                    <span class="req" *ngIf="q.required">*</span>
                  </label>

                  <!-- Text input -->
                  <input
                    *ngIf="q.type === 'text'"
                    type="text"
                    [name]="q.key"
                    [(ngModel)]="extraAnswers[q.key]"
                    [placeholder]="q.placeholder || 'e.g. Your answer'"
                    [required]="q.required"
                  />

                  <!-- Textarea -->
                  <textarea
                    *ngIf="q.type === 'textarea'"
                    [name]="q.key"
                    rows="3"
                    [(ngModel)]="extraAnswers[q.key]"
                    [placeholder]="q.placeholder || 'e.g. Provide details here'"
                    [required]="q.required"
                  ></textarea>

                  <!-- Number input -->
                  <input
                    *ngIf="q.type === 'number'"
                    type="number"
                    [name]="q.key"
                    [(ngModel)]="extraAnswers[q.key]"
                    placeholder="e.g. 0"
                    [required]="q.required"
                  />

                  <!-- Date input -->
                  <input
                    *ngIf="q.type === 'date'"
                    type="date"
                    [name]="q.key"
                    [(ngModel)]="extraAnswers[q.key]"
                    [required]="q.required"
                  />

                  <!-- Single Select Dropdown -->
                  <select
                    *ngIf="q.type === 'select'"
                    [name]="q.key"
                    [(ngModel)]="extraAnswers[q.key]"
                    [required]="q.required"
                  >
                    <option value="">-- Choose Option --</option>
                    <option *ngFor="let opt of q.options" [value]="opt">{{ opt }}</option>
                  </select>

                  <!-- Multi-select Checkboxes -->
                  <div class="pub-checks" *ngIf="q.type === 'multi_select'">
                    <label class="pub-check" *ngFor="let opt of q.options">
                      <input
                        type="checkbox"
                        [checked]="hasMulti(q.key, opt)"
                        (change)="toggleMulti(q.key, opt, $event)"
                      />
                      <span>{{ opt }}</span>
                    </label>
                  </div>

                  <!-- File / Document Upload -->
                  <div class="pub-file-wrap" *ngIf="q.type === 'file'">
                    <input type="file" (change)="onFileUpload($event, q.key)" [disabled]="uploadingFile" />
                    <span class="pub-uploaded" *ngIf="extraAnswers[q.key]">Uploaded: {{ extraAnswers[q.key] }}</span>
                  </div>

                  <span class="pub-hint" *ngIf="q.helpText">{{ q.helpText }}</span>
                </div>
              </div>

              <!-- Submit Action Button -->
              <div class="pub-form-actions">
                <button type="submit" class="pub-btn-primary" [disabled]="submitting || uploadingFile">
                  <span class="material-symbols-outlined" *ngIf="!submitting">how_to_reg</span>
                  <span class="material-symbols-outlined spin" *ngIf="submitting">progress_activity</span>
                  <span>{{ submitting ? 'Submitting Registration...' : ('Complete ' + aliases.aliasSingular + ' Registration') }}</span>
                </button>
              </div>

              <!-- Footer CTA to Sign In if already a member -->
              <div class="pub-form-footer">
                <span>Already a member of this workspace?</span>
                <a routerLink="/login">Sign in to your member portal</a>
              </div>
            </form>
          </div>
        </div>
      </main>

      <!-- 4. FULL-WIDTH WEBSITE FOOTER (LIVE CMS ACTIVE TEMPLATE OR CLEAN BRAND FALLBACK) -->
      <footer class="pub-cms-footer" *ngIf="safeFooterHtml" [innerHTML]="safeFooterHtml"></footer>
      <footer class="pub-site-footer" *ngIf="!safeFooterHtml">
        <div class="pub-site-footer-inner">
          <div class="pub-footer-brand-col">
            <span class="pub-footer-brand-title">{{ brand?.brandName || 'Organization Workspace' }}</span>
            <span class="pub-footer-copy">&copy; {{ currentYear }} {{ brand?.brandName || 'Organization' }}. All rights reserved.</span>
          </div>
          <div class="pub-footer-nav-col">
            <a routerLink="/" class="pub-footer-link">Home</a>
            <a routerLink="/login" class="pub-footer-link">Workspace Login</a>
          </div>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    .pub-site-shell {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background: #f8fafc;
      color: #0f172a;
      font-family: inherit;
    }
    .pub-cms-header, .pub-cms-breadcrumb, .pub-cms-footer {
      width: 100%;
    }
    .pub-site-header {
      background: #ffffff;
      border-bottom: 1px solid #e2e8f0;
      position: sticky;
      top: 0;
      z-index: 100;
      width: 100%;
    }
    .pub-site-header-inner {
      max-width: 1200px;
      margin: 0 auto;
      padding: 14px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
    }
    .pub-site-brand {
      display: flex;
      align-items: center;
      gap: 12px;
      text-decoration: none;
      color: inherit;
    }
    .pub-site-logo {
      height: 40px;
      width: auto;
      object-fit: contain;
    }
    .pub-logo-fallback {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: #0050e5;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .pub-site-brand-meta {
      display: flex;
      flex-direction: column;
    }
    .pub-site-brand-title {
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.2;
    }
    .pub-site-brand-sub {
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
    }
    .pub-site-nav-actions {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .pub-nav-link {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 13.5px;
      font-weight: 600;
      color: #475569;
      text-decoration: none;
      padding: 6px 12px;
      border-radius: 8px;
      transition: all 0.15s ease;
    }
    .pub-nav-link:hover {
      background: #f1f5f9;
      color: #0f172a;
    }
    .pub-btn-header-signin {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #0050e5;
      color: #ffffff;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      text-decoration: none;
      transition: background 0.15s ease;
    }
    .pub-btn-header-signin:hover {
      background: #003ebd;
    }
    .pub-site-main {
      flex: 1 0 auto;
      width: 100%;
      padding: 32px 16px 56px;
    }
    .pub-main-centered-wrap {
      max-width: 660px;
      margin: 0 auto;
      width: 100%;
    }
    .pub-card-state {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 40px 24px;
      text-align: center;
      box-shadow: 0 4px 16px rgba(15, 23, 42, 0.05);
    }
    .pub-card-state.success {
      border-color: rgba(16, 185, 129, 0.3);
    }
    .pub-card-state h2 {
      margin: 12px 0 6px;
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
    }
    .pub-card-state p {
      margin: 0 0 16px;
      font-size: 14px;
      color: #64748b;
    }
    .pub-card-form {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 18px;
      padding: 32px 36px;
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
    }
    @media (max-width: 640px) {
      .pub-card-form {
        padding: 24px 18px;
      }
    }
    .pub-dir-select-bar {
      margin-bottom: 22px;
      padding: 12px 16px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
    }
    .pub-dir-select-bar label {
      display: block;
      font-size: 12px;
      font-weight: 700;
      color: #475569;
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .pub-dir-dropdown {
      width: 100%;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 9px 12px;
      font-size: 13.5px;
      font-weight: 600;
      color: #0f172a;
      background: #ffffff;
    }
    .pub-card-header {
      margin-bottom: 24px;
      padding-bottom: 18px;
      border-bottom: 1px solid #f1f5f9;
    }
    .pub-badge-schedule-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 10px;
    }
    .pub-category-badge {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 3px 9px;
      border-radius: 6px;
      background: rgba(0, 80, 229, 0.1);
      color: #0050e5;
    }
    .pub-schedule-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      font-weight: 600;
      color: #059669;
      background: rgba(16, 185, 129, 0.1);
      padding: 3px 9px;
      border-radius: 6px;
    }
    .pub-schedule-badge .material-symbols-outlined { font-size: 14px; }
    .pub-form-title {
      font-size: 24px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 6px;
      line-height: 1.25;
    }
    .pub-form-desc {
      font-size: 14px;
      color: #64748b;
      margin: 0;
      line-height: 1.5;
    }
    .pub-form-body {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .pub-form-row.two-cols {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    @media (max-width: 580px) {
      .pub-form-row.two-cols {
        grid-template-columns: 1fr;
      }
    }
    .pub-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .pub-field label {
      font-size: 13px;
      font-weight: 700;
      color: #334155;
    }
    .pub-field .req { color: #dc2626; }
    .pub-field input[type="text"], .pub-field input[type="email"], .pub-field input[type="tel"],
    .pub-field input[type="number"], .pub-field input[type="date"], .pub-field input[type="url"],
    .pub-field textarea, .pub-field select {
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      padding: 11px 14px;
      font-size: 14px;
      font-family: inherit;
      color: #0f172a;
      background: #ffffff;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }
    .pub-field input:focus, .pub-field textarea:focus, .pub-field select:focus {
      outline: none;
      border-color: #0050e5;
      box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.12);
    }
    .pub-extra-section {
      border-top: 1px solid #f1f5f9;
      padding-top: 18px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .pub-extra-head h4 {
      margin: 0;
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
    }
    .pub-extra-head p {
      margin: 3px 0 0;
      font-size: 13px;
      color: #64748b;
    }
    .pub-checks { display: flex; flex-direction: column; gap: 8px; }
    .pub-check { display: inline-flex; align-items: center; gap: 8px; font-size: 13.5px; cursor: pointer; }
    .pub-hint { font-size: 12px; color: #64748b; }
    .pub-uploaded { font-size: 12px; color: #0050e5; font-weight: 600; }
    .pub-btn-primary {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: #0050e5;
      color: #ffffff;
      border: none;
      border-radius: 10px;
      padding: 13px 22px;
      font-size: 14.5px;
      font-weight: 700;
      font-family: inherit;
      cursor: pointer;
      text-decoration: none;
      width: 100%;
      box-shadow: 0 4px 12px rgba(0, 80, 229, 0.25);
      transition: background 0.15s ease, transform 0.1s ease;
    }
    .pub-btn-primary:hover:not(:disabled) {
      background: #003ebd;
      transform: translateY(-1px);
    }
    .pub-btn-primary:disabled {
      opacity: 0.65;
      cursor: not-allowed;
    }
    .pub-btn-secondary {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      background: #f1f5f9;
      color: #334155;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      padding: 10px 18px;
      font-size: 13.5px;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
    }
    .pub-btn-secondary:hover {
      background: #e2e8f0;
      color: #0f172a;
    }
    .pub-alert.error {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 11px 14px;
      border-radius: 10px;
      background: rgba(220, 38, 38, 0.08);
      color: #dc2626;
      font-size: 13px;
      font-weight: 600;
    }
    .pub-form-footer {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: #64748b;
      padding-top: 6px;
      border-top: 1px solid #f1f5f9;
    }
    .pub-form-footer a {
      color: #0050e5;
      font-weight: 700;
      text-decoration: none;
    }
    .pub-form-footer a:hover { text-decoration: underline; }
    .pub-success-icon-wrap {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: rgba(16, 185, 129, 0.12);
      color: #059669;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto;
    }
    .pub-success-icon-wrap .material-symbols-outlined { font-size: 34px; }
    .pub-success-actions { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-top: 8px; }
    .err-icon { font-size: 42px; color: #dc2626; }
    .spin { animation: pubSpin 1s linear infinite; font-size: 36px; color: #0050e5; }
    @keyframes pubSpin { to { transform: rotate(360deg); } }
    .pub-site-footer {
      background: #ffffff;
      border-top: 1px solid #e2e8f0;
      margin-top: auto;
      width: 100%;
    }
    .pub-site-footer-inner {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }
    .pub-footer-brand-col {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .pub-footer-brand-title {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
    }
    .pub-footer-copy {
      font-size: 12px;
      color: #64748b;
    }
    .pub-footer-nav-col {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .pub-footer-link {
      font-size: 13px;
      font-weight: 600;
      color: #475569;
      text-decoration: none;
      transition: color 0.15s ease;
    }
    .pub-footer-link:hover { color: #0050e5; }
  `]
})
export class PublicCommitteeRegisterComponent implements OnInit, OnDestroy {
  tenantSlug = '';
  groupSlug = '';
  inviteToken = '';

  loading = true;
  loadError = '';
  directoryMode = true;
  currentYear = new Date().getFullYear();

  brand: any = null;
  aliases: any = {
    aliasSingular: 'Committee',
    aliasPlural: 'Committees',
    subGroupAliasSingular: 'Sub-Group',
    subGroupAliasPlural: 'Sub-Groups'
  };
  signedInMember: any = null;
  openCommittees: any[] = [];
  activeCommittee: any = null;

  // Live CMS Studio Rendered Layout Units (from 'my-templates')
  safeHeaderHtml: SafeHtml | null = null;
  safeBreadcrumbHtml: SafeHtml | null = null;
  safeFooterHtml: SafeHtml | null = null;
  private rawActiveTemplates: any[] = [];

  firstName = '';
  lastName = '';
  email = '';
  phoneNumber = '';
  extraAnswers: Record<string, any> = {};
  attachmentUrls: string[] = [];

  uploadingFile = false;
  submitting = false;
  formError = '';
  submittedSuccess = false;
  submissionStatus = '';
  submissionMessage = '';

  constructor(
    private route: ActivatedRoute,
    private committeesService: CommitteesService,
    private apiService: ApiService,
    private templateHydration: TemplateHydrationService,
    private contentHydration: ContentHydrationService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.tenantSlug = this.route.snapshot.paramMap.get('tenantSlug') || '';
    this.groupSlug = this.route.snapshot.paramMap.get('groupSlug') || '';
    this.inviteToken = this.route.snapshot.queryParamMap.get('token') || '';

    // Fetch the live CMS Studio templates (menu, breadcrumb, footer) from active-templates
    this.loadCmsActiveTemplates();

    if (this.groupSlug) {
      this.directoryMode = false;
      this.loadSingleGroup();
    } else {
      this.directoryMode = true;
      this.loadDirectory();
    }
  }

  ngOnDestroy(): void {
    document.getElementById('committee-cms-theme-styles')?.remove();
  }

  /**
   * Fetches active templates from CMS Studio (my-templates) and hydrates the live
   * Website Navbar, Breadcrumb, and Footer so that /join-committee renders within
   * the exact live website theme.
   */
  private loadCmsActiveTemplates(): void {
    this.apiService.get('WebsiteContentApi/theme/active-templates').subscribe({
      next: (res: any) => {
        this.rawActiveTemplates = res?.data || [];
        this.hydrateCmsLayout();
      },
      error: () => {
        // Fallback to installed templates if admin endpoint exists
        this.apiService.get('ContentApi/templates/installed').subscribe({
          next: (adminRes: any) => {
            const all = adminRes?.data || [];
            this.rawActiveTemplates = all.filter((t: any) => t.isActive);
            this.hydrateCmsLayout();
          },
          error: () => {
            // Clean fallback brand layout is already in place
          }
        });
      }
    });
  }

  private hydrateCmsLayout(): void {
    if (!this.rawActiveTemplates || this.rawActiveTemplates.length === 0) return;

    const menuTpl = this.rawActiveTemplates.find((t: any) => (t.category || '').toLowerCase() === 'menu');
    const breadcrumbTpl = this.rawActiveTemplates.find((t: any) => (t.category || '').toLowerCase() === 'breadcrumb');
    const footerTpl = this.rawActiveTemplates.find((t: any) => (t.category || '').toLowerCase() === 'footer');

    // Collect and inject all CSS styles into document head
    const allCss = [menuTpl?.cssStyles, breadcrumbTpl?.cssStyles, footerTpl?.cssStyles].filter(Boolean).join('\n');
    if (allCss) {
      let styleEl = document.getElementById('committee-cms-theme-styles');
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'committee-cms-theme-styles';
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = allCss;
    }

    // Hydrate Navigation / Menu
    if (menuTpl?.htmlTemplate) {
      const navContext = this.buildNavigationContext();
      const hydratedNav = this.contentHydration.hydrate(menuTpl.htmlTemplate, navContext, 'menu');
      this.safeHeaderHtml = this.sanitizer.bypassSecurityTrustHtml(hydratedNav);
    }

    // Hydrate Breadcrumb
    if (breadcrumbTpl?.htmlTemplate) {
      const breadcrumbContext = this.buildBreadcrumbContext();
      const hydratedBreadcrumb = this.contentHydration.hydrate(breadcrumbTpl.htmlTemplate, breadcrumbContext, 'breadcrumb');
      this.safeBreadcrumbHtml = this.sanitizer.bypassSecurityTrustHtml(hydratedBreadcrumb);
    }

    // Hydrate Footer
    if (footerTpl?.htmlTemplate) {
      const footerContext = this.buildFooterContext();
      const hydratedFooter = this.contentHydration.hydrate(footerTpl.htmlTemplate, footerContext, 'footer');
      const finalFooter = this.templateHydration.enforceOzikolCredit(hydratedFooter);
      this.safeFooterHtml = this.sanitizer.bypassSecurityTrustHtml(finalFooter);
    }
  }

  private buildNavigationContext(): any {
    const brandName = this.brand?.brandName || 'Organization Workspace';
    const logoUrl = this.brand?.logoUrl || '';
    return {
      brandName,
      BrandName: brandName,
      logoUrl,
      LogoUrl: logoUrl,
      brandLogo: logoUrl,
      BrandLogo: logoUrl,
      topMenuItems: [
        { title: 'Home', Title: 'Home', url: '/', Url: '/', isExternal: false }
      ],
      menuDropdowns: [],
      menuCtaButtons: [
        { label: this.signedInMember ? 'My Workspace' : 'Sign In', url: this.signedInMember ? '/committees/workspace/my' : '/login', isPrimary: true }
      ],
      activateLoginInMenu: true,
      loginUrl: this.signedInMember ? '/committees/workspace/my' : '/login',
      loginText: this.signedInMember ? 'My Workspace' : 'Sign In',
      ctaLabel: this.signedInMember ? 'Workspace' : 'Sign In',
      ctaUrl: this.signedInMember ? '/committees/workspace/my' : '/login'
    };
  }

  private buildBreadcrumbContext(): any {
    const committeeName = this.activeCommittee?.name || 'Registration';
    const parentName = this.activeCommittee?.parentCommitteeName;
    const trails = [
      { label: 'Home', url: '/', isActive: false },
      { label: this.aliases.aliasPlural, url: '/join-committee', isActive: false }
    ];
    if (parentName) {
      trails.push({ label: parentName, url: '#', isActive: false });
    }
    trails.push({ label: committeeName, url: '#', isActive: true });

    return {
      title: committeeName,
      Title: committeeName,
      pageTitle: committeeName,
      miniTitle: this.activeCommittee?.parentCommitteeId ? this.aliases.subGroupAliasSingular : this.aliases.aliasSingular,
      description: this.activeCommittee?.description || this.activeCommittee?.missionStatement || 'Complete the registration form to enroll.',
      breadcrumbTrail: trails,
      breadcrumbs: trails
    };
  }

  private buildFooterContext(): any {
    const brandName = this.brand?.brandName || 'Organization Workspace';
    const logoUrl = this.brand?.logoUrl || '';
    const currentYear = new Date().getFullYear();
    return {
      brandName,
      BrandName: brandName,
      logoUrl,
      LogoUrl: logoUrl,
      BrandLogo: logoUrl,
      year: currentYear,
      Year: currentYear,
      copyright: `&copy; ${currentYear} ${brandName}. All rights reserved.`,
      Copyright: `&copy; ${currentYear} ${brandName}. All rights reserved.`,
      footerCategories: [],
      legalPages: [],
      socialLinks: [],
      IsAuthenticated: !!this.signedInMember
    };
  }

  onDirectoryChange(committeeId: string): void {
    const found = this.openCommittees.find(c => c.id === committeeId);
    if (found) {
      this.selectCommittee(found);
    }
  }

  private loadDirectory(): void {
    this.loading = true;
    this.committeesService.getPublicDirectory(this.tenantSlug || undefined).subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res?.isSuccess && res.data) {
          this.brand = res.data.brand;
          this.aliases = { ...this.aliases, ...(res.data.aliases || {}) };
          this.signedInMember = res.data.signedInMember;
          this.openCommittees = res.data.committees || [];
          if (this.openCommittees.length > 0) {
            this.selectCommittee(this.openCommittees[0]);
          } else {
            this.loadError = `No ${this.aliases.aliasPlural.toLowerCase()} are currently open for external registration.`;
          }
          this.hydrateCmsLayout();
        } else {
          this.loadError = res?.message || 'Unable to load registration directory.';
        }
      },
      error: (err: any) => {
        this.loading = false;
        this.loadError = err?.error?.message || 'External registration is unavailable for this workspace.';
      }
    });
  }

  private loadSingleGroup(): void {
    this.loading = true;
    this.committeesService
      .getPublicCommitteeBySlug(this.groupSlug, this.tenantSlug || undefined, this.inviteToken || undefined)
      .subscribe({
        next: (res: any) => {
          this.loading = false;
          if (res?.isSuccess && res.data) {
            this.brand = res.data.brand;
            this.aliases = { ...this.aliases, ...(res.data.aliases || {}) };
            this.signedInMember = res.data.signedInMember;
            this.activeCommittee = res.data.committee;
            this.hydrateCmsLayout();
          } else {
            this.loadError = res?.message || 'Registration link is inactive.';
          }
        },
        error: (err: any) => {
          this.loading = false;
          this.loadError = err?.error?.message || 'This registration link is invalid or requires a private invitation.';
        }
      });
  }

  selectCommittee(c: any): void {
    this.activeCommittee = c;
    this.extraAnswers = {};
    this.attachmentUrls = [];
    this.formError = '';
    // Refresh breadcrumbs for the selected committee
    this.hydrateCmsLayout();
  }

  hasMulti(key: string, opt: string): boolean {
    const list = this.extraAnswers[key];
    return Array.isArray(list) && list.includes(opt);
  }

  toggleMulti(key: string, opt: string, evt: Event): void {
    const target = evt.target as HTMLInputElement;
    const current: string[] = Array.isArray(this.extraAnswers[key]) ? [...this.extraAnswers[key]] : [];
    if (target.checked) {
      if (!current.includes(opt)) current.push(opt);
    } else {
      const idx = current.indexOf(opt);
      if (idx >= 0) current.splice(idx, 1);
    }
    this.extraAnswers[key] = current;
  }

  onFileUpload(evt: Event, key: string): void {
    const input = evt.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    this.uploadingFile = true;
    this.formError = '';

    this.committeesService.uploadPublicIntakeFile(file, this.tenantSlug || undefined).subscribe({
      next: (res: any) => {
        this.uploadingFile = false;
        if (res?.isSuccess && res.data?.fileUrl) {
          this.extraAnswers[key] = res.data.fileUrl;
          if (!this.attachmentUrls.includes(res.data.fileUrl)) {
            this.attachmentUrls.push(res.data.fileUrl);
          }
        } else {
          this.formError = res?.message || 'Failed to upload intake document.';
        }
      },
      error: (err: any) => {
        this.uploadingFile = false;
        this.formError = err?.error?.message || 'File upload failed. Check file size and format.';
      }
    });
  }

  submitRegistration(): void {
    if (!this.activeCommittee) return;
    this.formError = '';

    const first = this.firstName.trim();
    const last = this.lastName.trim();
    const mail = this.email.trim();

    if (!first) {
      this.formError = 'First Name is required.';
      return;
    }
    if (!last) {
      this.formError = 'Last Name is required.';
      return;
    }
    if (!mail || !mail.includes('@')) {
      this.formError = 'A valid email address is required.';
      return;
    }

    // Validate required dynamic schema questions
    const questions = this.activeCommittee.intakeFormSchema?.questions || [];
    for (const q of questions) {
      if (q.required) {
        const val = this.extraAnswers[q.key];
        const isEmpty = val === undefined || val === null || (typeof val === 'string' && !val.trim()) || (Array.isArray(val) && val.length === 0);
        if (isEmpty) {
          this.formError = `Please answer: "${q.label}"`;
          return;
        }
      }
    }

    this.submitting = true;
    const payload = {
      committeeId: this.activeCommittee.id,
      tenantSlug: this.tenantSlug || undefined,
      inviteToken: this.inviteToken || undefined,
      firstName: first,
      lastName: last,
      email: mail,
      phoneNumber: this.phoneNumber.trim() || undefined,
      extraInfoAnswers: this.extraAnswers,
      attachmentUrls: this.attachmentUrls
    };

    this.committeesService.submitPublicRegistration(payload).subscribe({
      next: (res: any) => {
        this.submitting = false;
        if (res?.isSuccess && res.data) {
          this.submittedSuccess = true;
          this.submissionStatus = res.data.enrollmentStatus || 'PendingApproval';
          this.submissionMessage = res.message || 'Thank you! Your registration has been submitted.';
        } else {
          this.formError = res?.message || 'Could not complete registration. Please try again.';
        }
      },
      error: (err: any) => {
        this.submitting = false;
        this.formError = err?.error?.message || 'Failed to submit registration. Please verify your details.';
      }
    });
  }

  resetForAnother(): void {
    this.submittedSuccess = false;
    this.submissionStatus = '';
    this.submissionMessage = '';
    this.firstName = '';
    this.lastName = '';
    this.email = '';
    this.phoneNumber = '';
    this.extraAnswers = {};
    this.attachmentUrls = [];
    this.formError = '';
    if (this.openCommittees.length > 0) {
      this.selectCommittee(this.openCommittees[0]);
    }
  }
}
