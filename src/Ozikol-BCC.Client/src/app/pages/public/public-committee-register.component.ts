import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommitteesService } from '../../core/services/committees.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';

/**
 * Public Committee & Sub-Group External Registration Portal
 * Routes: /join-committee, /join-committee/:tenantSlug, /join-committee/:tenantSlug/:groupSlug
 * Integrates natively with the website layout:
 * - Top: Full-width public website navigation bar with brand identity, home link, and portal sign-in CTA.
 * - Body: Centered single registration card containing committee context and form fields (zero member count clutter).
 * - Bottom: Full-width public website footer with copyright and sitemap links.
 */
@Component({
  selector: 'app-public-committee-register',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TranslatePipe],
  template: `
    <div class="pub-site-shell">
      <!-- 1. FULL-WIDTH WEBSITE NAVBAR / HEADER -->
      <header class="pub-site-header">
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

      <!-- 2. MAIN WEBSITE BODY (CENTERED REGISTRATION FORM) -->
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

            <!-- Path A: Signed-In Workspace Member Notice -->
            <div class="pub-signedin-banner" *ngIf="signedInMember">
              <span class="material-symbols-outlined">verified_user</span>
              <div>
                <strong>Signed in as {{ signedInMember.firstName }} {{ signedInMember.lastName }}</strong>
                <p>{{ signedInMember.email }} • Workspace profile verified. Only supplemental fields below are required.</p>
              </div>
            </div>

            <!-- Path B: External Visitor Core Identity Fields (Canonical Format Placeholders per Rule 4) -->
            <div class="pub-identity-grid" *ngIf="!signedInMember">
              <div class="pub-field">
                <label>First Name <span class="req">*</span></label>
                <input type="text" [(ngModel)]="firstName" placeholder="e.g. First Name" />
              </div>
              <div class="pub-field">
                <label>Last Name <span class="req">*</span></label>
                <input type="text" [(ngModel)]="lastName" placeholder="e.g. Last Name" />
              </div>
              <div class="pub-field">
                <label>Email Address <span class="req">*</span></label>
                <input type="email" [(ngModel)]="email" placeholder="name@company.com" />
              </div>
              <div class="pub-field">
                <label>Phone Number</label>
                <input type="tel" [(ngModel)]="phoneNumber" placeholder="e.g. +0 (000) 000-0000" />
              </div>
            </div>

            <!-- Dynamic Extra-Info Form Questions -->
            <div class="pub-extra-section" *ngIf="(activeCommittee.extraInfoForm?.fields || []).length > 0">
              <div class="pub-extra-head">
                <h4>{{ activeCommittee.extraInfoForm.title || ('Additional ' + aliases.aliasSingular + ' Questions') }}</h4>
                <p *ngIf="activeCommittee.extraInfoForm.description">{{ activeCommittee.extraInfoForm.description }}</p>
              </div>

              <div class="pub-field" *ngFor="let f of activeCommittee.extraInfoForm.fields">
                <label>
                  {{ f.label }}
                  <span class="req" *ngIf="f.required">*</span>
                </label>

                <input
                  *ngIf="f.type === 'text' || f.type === 'number' || f.type === 'date' || f.type === 'url'"
                  [type]="f.type === 'url' ? 'url' : f.type"
                  [(ngModel)]="extraAnswers[f.key]"
                  [placeholder]="f.placeholder || ('e.g. Enter ' + f.label)"
                />

                <textarea
                  *ngIf="f.type === 'textarea'"
                  rows="3"
                  [(ngModel)]="extraAnswers[f.key]"
                  [placeholder]="f.placeholder || ('e.g. Enter ' + f.label)"
                ></textarea>

                <select *ngIf="f.type === 'select'" [(ngModel)]="extraAnswers[f.key]">
                  <option value="">-- Select an option --</option>
                  <option *ngFor="let opt of f.options || []" [value]="opt">{{ opt }}</option>
                </select>

                <div class="pub-checks" *ngIf="f.type === 'multiselect'">
                  <label class="pub-check" *ngFor="let opt of f.options || []">
                    <input type="checkbox" [checked]="hasMulti(f.key, opt)" (change)="toggleMulti(f.key, opt)" />
                    <span>{{ opt }}</span>
                  </label>
                </div>

                <label class="pub-check" *ngIf="f.type === 'checkbox'">
                  <input type="checkbox" [(ngModel)]="extraAnswers[f.key]" />
                  <span>{{ f.placeholder || 'Yes, I agree' }}</span>
                </label>

                <div class="pub-file-row" *ngIf="f.type === 'file'">
                  <input type="file" (change)="uploadPublicFile($event, f.key)" [disabled]="uploadingFile" />
                  <small class="pub-uploaded" *ngIf="extraAnswers[f.key]">Document attached</small>
                </div>

                <small class="pub-hint" *ngIf="f.helpText">{{ f.helpText }}</small>
              </div>
            </div>

            <!-- Submit Action Button -->
            <button
              type="button"
              class="pub-btn-primary full"
              [disabled]="submitting || uploadingFile"
              (click)="submitRegistration()"
            >
              <span class="material-symbols-outlined">how_to_reg</span>
              <span>{{ submitting ? 'Submitting...' : ('Complete ' + aliases.aliasSingular + ' Registration') }}</span>
            </button>

            <!-- Footer Sign-In Prompt -->
            <div class="pub-form-footer" *ngIf="!signedInMember">
              <span>Already a member of this workspace?</span>
              <a routerLink="/login">Sign in here</a>
            </div>
          </div>
        </div>
      </main>

      <!-- 3. FULL-WIDTH WEBSITE FOOTER -->
      <footer class="pub-site-footer">
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
      letter-spacing: -0.2px;
    }
    .pub-site-brand-sub {
      font-size: 11px;
      font-weight: 600;
      color: #0050e5;
      text-transform: uppercase;
      letter-spacing: 0.6px;
    }
    .pub-site-nav-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .pub-nav-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: #475569;
      text-decoration: none;
      font-size: 13.5px;
      font-weight: 600;
      padding: 7px 12px;
      border-radius: 8px;
      transition: all 0.15s ease;
    }
    .pub-nav-link:hover {
      color: #0050e5;
      background: rgba(0, 80, 229, 0.05);
    }
    .pub-btn-header-signin {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #0050e5;
      color: #ffffff;
      text-decoration: none;
      font-size: 13px;
      font-weight: 700;
      padding: 8px 16px;
      border-radius: 8px;
      transition: background 0.15s ease;
    }
    .pub-btn-header-signin:hover {
      background: #003db3;
    }
    .pub-site-main {
      flex: 1 0 auto;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      padding: 48px 16px;
      width: 100%;
      box-sizing: border-box;
    }
    .pub-main-centered-wrap {
      width: 100%;
      max-width: 660px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .pub-card-form {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      padding: 32px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.04);
      display: flex;
      flex-direction: column;
      gap: 22px;
    }
    @media (max-width: 640px) {
      .pub-card-form { padding: 22px 18px; border-radius: 16px; }
      .pub-site-main { padding: 24px 12px; }
    }
    .pub-card-state {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      padding: 56px 24px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.04);
    }
    .pub-card-header {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding-bottom: 18px;
      border-bottom: 1px solid #f1f5f9;
    }
    .pub-badge-schedule-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .pub-category-badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 999px;
      background: rgba(0, 80, 229, 0.1);
      color: #0050e5;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .pub-schedule-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
      background: #f1f5f9;
      padding: 3px 10px;
      border-radius: 999px;
    }
    .pub-schedule-badge .material-symbols-outlined { font-size: 15px; color: #0050e5; }
    .pub-form-title {
      margin: 0;
      font-size: 24px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.3px;
    }
    .pub-form-desc {
      margin: 0;
      font-size: 14px;
      color: #64748b;
      line-height: 1.55;
    }
    .pub-dir-select-bar {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding-bottom: 16px;
      border-bottom: 1px solid #f1f5f9;
    }
    .pub-dir-select-bar label {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
      letter-spacing: 0.5px;
    }
    .pub-dir-dropdown {
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      padding: 10px 14px;
      font-size: 14px;
      background: #ffffff;
      color: #0f172a;
      font-weight: 600;
    }
    .pub-identity-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 16px;
    }
    .pub-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .pub-field label {
      font-size: 13px;
      font-weight: 600;
      color: #1e293b;
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
      cursor: pointer;
      text-decoration: none;
      transition: background 0.15s ease;
    }
    .pub-btn-primary:hover { background: #003db3; }
    .pub-btn-primary.full { width: 100%; }
    .pub-btn-secondary {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: rgba(0, 80, 229, 0.08);
      color: #0050e5;
      border: none;
      border-radius: 10px;
      padding: 11px 20px;
      font-size: 13.5px;
      font-weight: 700;
      text-decoration: none;
      cursor: pointer;
    }
    .pub-signedin-banner {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      padding: 14px 16px;
      border-radius: 12px;
      background: rgba(0, 80, 229, 0.07);
      border-left: 3px solid #0050e5;
    }
    .pub-signedin-banner .material-symbols-outlined { color: #0050e5; font-size: 22px; }
    .pub-signedin-banner p { margin: 2px 0 0; font-size: 12.5px; color: #475569; }
    .pub-alert.error {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 14px;
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
      width: 100%;
      margin-top: auto;
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
      gap: 2px;
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
      color: #64748b;
      text-decoration: none;
      transition: color 0.15s ease;
    }
    .pub-footer-link:hover { color: #0050e5; }
  `]
})
export class PublicCommitteeRegisterComponent implements OnInit {
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
    private committeesService: CommitteesService
  ) {}

  ngOnInit(): void {
    this.tenantSlug = this.route.snapshot.paramMap.get('tenantSlug') || '';
    this.groupSlug = this.route.snapshot.paramMap.get('groupSlug') || '';
    this.inviteToken = this.route.snapshot.queryParamMap.get('token') || '';

    if (this.groupSlug) {
      this.directoryMode = false;
      this.loadSingleGroup();
    } else {
      this.directoryMode = true;
      this.loadDirectory();
    }
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
  }

  hasMulti(key: string, opt: string): boolean {
    return Array.isArray(this.extraAnswers[key]) && this.extraAnswers[key].includes(opt);
  }

  toggleMulti(key: string, opt: string): void {
    const cur = Array.isArray(this.extraAnswers[key]) ? [...this.extraAnswers[key]] : [];
    const idx = cur.indexOf(opt);
    if (idx >= 0) cur.splice(idx, 1);
    else cur.push(opt);
    this.extraAnswers[key] = cur;
  }

  uploadPublicFile(event: Event, key: string): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.uploadingFile = true;
    this.committeesService.uploadAttachment(file, this.tenantSlug || undefined).subscribe({
      next: (res: any) => {
        this.uploadingFile = false;
        const url = res?.data?.secureUrl || res?.data?.url || res?.data;
        if (url) {
          this.extraAnswers[key] = url;
          this.attachmentUrls.push(url);
        }
      },
      error: (err: any) => {
        this.uploadingFile = false;
        this.formError = err?.error?.message || 'File upload failed. Please try again.';
      }
    });
  }

  submitRegistration(): void {
    this.formError = '';

    if (!this.activeCommittee) {
      this.formError = `Please select an eligible ${this.aliases.aliasSingular.toLowerCase()}.`;
      return;
    }

    if (!this.signedInMember) {
      if (!this.firstName.trim() || !this.lastName.trim() || !this.email.trim()) {
        this.formError = 'Please provide your first name, last name, and a valid email address.';
        return;
      }
    }

    const fields: any[] = this.activeCommittee.extraInfoForm?.fields || [];
    for (const f of fields) {
      if (f.required) {
        const val = this.extraAnswers[f.key];
        const empty = val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0);
        if (empty) {
          this.formError = `"${f.label}" is required.`;
          return;
        }
      }
    }

    this.submitting = true;
    const payload = {
      committeeId: this.activeCommittee.id,
      inviteToken: this.inviteToken || undefined,
      firstName: this.signedInMember ? this.signedInMember.firstName : this.firstName.trim(),
      lastName: this.signedInMember ? this.signedInMember.lastName : this.lastName.trim(),
      email: this.signedInMember ? this.signedInMember.email : this.email.trim(),
      phoneNumber: this.signedInMember ? this.signedInMember.phoneNumber : (this.phoneNumber.trim() || undefined),
      extraInfoResponses: this.extraAnswers,
      attachmentUrls: this.attachmentUrls
    };

    this.committeesService.submitPublicRegistration(payload, this.tenantSlug || undefined).subscribe({
      next: (res: any) => {
        this.submitting = false;
        if (res?.isSuccess) {
          this.submittedSuccess = true;
          this.submissionStatus = res.data?.status || 'Pending';
          this.submissionMessage =
            res.data?.status === 'Approved'
              ? `Welcome aboard! You have been enrolled directly into ${this.activeCommittee.name}.`
              : `Your application to join ${this.activeCommittee.name} has been received and is awaiting committee leader / administrator review.`;
        } else {
          this.formError = res?.message || 'Registration could not be completed.';
        }
      },
      error: (err: any) => {
        this.submitting = false;
        this.formError = err?.error?.message || 'Registration failed. Please check your submission and try again.';
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
