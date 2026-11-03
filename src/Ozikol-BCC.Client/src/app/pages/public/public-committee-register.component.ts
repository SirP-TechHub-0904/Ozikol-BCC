import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommitteesService } from '../../core/services/committees.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';

/**
 * Standalone External Registration Portal (P1 — /join-committee, /join-committee/:tenantSlug, /join-committee/:tenantSlug/:groupSlug).
 * Implements the Smart Two-Path Onboarding Flow:
 * - Path A (Signed-in Workspace Member): Skips FirstName/LastName/Email/Phone and shows ONLY supplemental Extra-Info fields.
 * - Path B (External / Unauthenticated Visitor): Captures canonical core identity + supplemental Extra-Info fields.
 */
@Component({
  selector: 'app-public-committee-register',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TranslatePipe],
  template: `
    <div class="pub-page">
      <div class="pub-container">
        <!-- Brand Header -->
        <header class="pub-brand-bar">
          <div class="pub-brand-id">
            <img *ngIf="brand?.logoUrl" [src]="brand.logoUrl" [alt]="brand.brandName" class="pub-logo" />
            <div class="pub-logo-fallback" *ngIf="!brand?.logoUrl">
              <span class="material-symbols-outlined">diversity_3</span>
            </div>
            <div>
              <span class="pub-kicker">{{ brand?.brandName || 'Organization Workspace' }}</span>
              <h1>{{ aliases.aliasPlural }} Registration Portal</h1>
            </div>
          </div>
          <a routerLink="/login" class="pub-signin-link" *ngIf="!signedInMember">
            <span class="material-symbols-outlined">login</span>
            <span>Already a member? Sign in</span>
          </a>
        </header>

        <!-- Loading -->
        <div class="pub-card center" *ngIf="loading">
          <span class="material-symbols-outlined spin">progress_activity</span>
          <p>Loading registration portal...</p>
        </div>

        <!-- Error State -->
        <div class="pub-card center" *ngIf="!loading && loadError">
          <span class="material-symbols-outlined err-icon">error</span>
          <h2>Registration Unavailable</h2>
          <p>{{ loadError }}</p>
        </div>

        <!-- Success Confirmation State -->
        <div class="pub-card center" *ngIf="!loading && submittedSuccess">
          <div class="pub-success-badge">
            <span class="material-symbols-outlined">verified</span>
          </div>
          <h2>{{ submissionStatus === 'Approved' ? 'You Are Enrolled!' : 'Application Received' }}</h2>
          <p>{{ submissionMessage }}</p>
          <div class="pub-success-actions">
            <a *ngIf="signedInMember" routerLink="/committees/workspace/my" class="pub-btn-primary">
              Go to My {{ aliases.aliasPlural }}
            </a>
            <button *ngIf="!signedInMember && directoryMode" type="button" class="pub-btn-secondary" (click)="resetForAnother()">
              Register for Another {{ aliases.aliasSingular }}
            </button>
          </div>
        </div>

        <!-- Main Registration Form -->
        <div class="pub-layout" *ngIf="!loading && !loadError && !submittedSuccess">
          <!-- Left Column: Directory / Group Summary -->
          <aside class="pub-side-card">
            <div *ngIf="directoryMode && openCommittees.length > 0" class="pub-dir-picker">
              <label>Select {{ aliases.aliasSingular }} / {{ aliases.subGroupAliasSingular }}</label>
              <div
                class="pub-group-option"
                *ngFor="let c of openCommittees"
                [class.selected]="activeCommittee?.id === c.id"
                (click)="selectCommittee(c)"
              >
                <span class="material-symbols-outlined">{{ c.iconName || 'diversity_3' }}</span>
                <div>
                  <strong>{{ c.name }}</strong>
                  <small>{{ c.parentCommitteeName ? ('Under ' + c.parentCommitteeName) : (c.categoryTag || aliases.aliasSingular) }}</small>
                </div>
              </div>
            </div>

            <div class="pub-group-summary" *ngIf="activeCommittee">
              <span class="pub-badge">{{ activeCommittee.parentCommitteeId ? aliases.subGroupAliasSingular : aliases.aliasSingular }}</span>
              <h2>{{ activeCommittee.name }}</h2>
              <p>{{ activeCommittee.description || activeCommittee.missionStatement || 'Complete the form to register.' }}</p>
              <div class="pub-meta">
                <div *ngIf="activeCommittee.meetingSchedule">
                  <span class="material-symbols-outlined">event_repeat</span>
                  <span>{{ activeCommittee.meetingSchedule }}</span>
                </div>
                <div>
                  <span class="material-symbols-outlined">groups</span>
                  <span>{{ activeCommittee.memberCount || 0 }} Active Members</span>
                </div>
              </div>
            </div>
          </aside>

          <!-- Right Column: Smart Identity + Extra-Info Form -->
          <section class="pub-card" *ngIf="activeCommittee">
            <h3>Register for {{ activeCommittee.name }}</h3>

            <div class="pub-alert error" *ngIf="formError">
              <span class="material-symbols-outlined">error</span>
              <span>{{ formError }}</span>
            </div>

            <!-- Path A: Signed-In Workspace Member Banner -->
            <div class="pub-signedin-banner" *ngIf="signedInMember">
              <span class="material-symbols-outlined">verified_user</span>
              <div>
                <strong>{{ signedInMember.firstName }} {{ signedInMember.lastName }} ({{ signedInMember.email }})</strong>
                <p>{{ 'committees.public_already_signed_in' | translate:'Signed in with your workspace profile — only supplemental fields below are required.' }}</p>
              </div>
            </div>

            <!-- Path B: External Visitor Core Identity Fields (Canonical Placeholders per Rule 4) -->
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

            <!-- Dynamic Extra-Info Form Fields -->
            <div class="pub-extra-block" *ngIf="(activeCommittee.extraInfoForm?.fields || []).length > 0">
              <div class="pub-extra-head">
                <h4>{{ activeCommittee.extraInfoForm.title || ('Additional ' + aliases.aliasSingular + ' Details') }}</h4>
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
                  [placeholder]="f.placeholder || 'Enter response'"
                />

                <textarea
                  *ngIf="f.type === 'textarea'"
                  rows="3"
                  [(ngModel)]="extraAnswers[f.key]"
                  [placeholder]="f.placeholder || 'Enter details'"
                ></textarea>

                <select *ngIf="f.type === 'select'" [(ngModel)]="extraAnswers[f.key]">
                  <option value="">Select an option</option>
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
                  <span>{{ f.placeholder || 'Yes' }}</span>
                </label>

                <div *ngIf="f.type === 'file'">
                  <input type="file" (change)="uploadPublicFile($event, f.key)" />
                  <small class="pub-uploaded" *ngIf="extraAnswers[f.key]">Document attached</small>
                </div>

                <small class="pub-hint" *ngIf="f.helpText">{{ f.helpText }}</small>
              </div>
            </div>

            <button
              type="button"
              class="pub-btn-primary full"
              [disabled]="submitting || uploadingFile"
              (click)="submitRegistration()"
            >
              <span class="material-symbols-outlined">how_to_reg</span>
              <span>{{ submitting ? 'Submitting...' : ('Complete ' + aliases.aliasSingular + ' Registration') }}</span>
            </button>
          </section>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .pub-page { min-height: 100vh; background: #f8fafc; padding: 32px 16px; color: #0f172a; }
    .pub-container { max-width: 1080px; margin: 0 auto; display: flex; flex-direction: column; gap: 22px; }
    .pub-brand-bar {
      background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 18px 24px;
      display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap;
    }
    .pub-brand-id { display: flex; align-items: center; gap: 14px; }
    .pub-logo { height: 44px; width: auto; object-fit: contain; }
    .pub-logo-fallback {
      width: 46px; height: 46px; border-radius: 12px; background: #0050e5; color: #ffffff;
      display: flex; align-items: center; justify-content: center;
    }
    .pub-kicker { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.7px; color: #0050e5; }
    .pub-brand-id h1 { margin: 2px 0 0; font-size: 20px; font-weight: 800; }
    .pub-signin-link {
      display: inline-flex; align-items: center; gap: 6px; color: #0050e5; text-decoration: none;
      font-size: 13px; font-weight: 600; padding: 8px 14px; border-radius: 10px; background: rgba(0, 80, 229, 0.08);
    }
    .pub-layout { display: grid; grid-template-columns: 340px 1fr; gap: 20px; align-items: start; }
    @media (max-width: 860px) { .pub-layout { grid-template-columns: 1fr; } }
    .pub-side-card, .pub-card {
      background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px;
      display: flex; flex-direction: column; gap: 16px;
    }
    .pub-card.center { align-items: center; text-align: center; padding: 52px 24px; }
    .pub-dir-picker { display: flex; flex-direction: column; gap: 8px; padding-bottom: 16px; border-bottom: 1px solid #e2e8f0; }
    .pub-dir-picker label { font-size: 12px; font-weight: 700; text-transform: uppercase; color: #64748b; }
    .pub-group-option {
      display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: 1px solid #e2e8f0;
      border-radius: 10px; cursor: pointer; transition: all 0.15s;
    }
    .pub-group-option.selected { border-color: #0050e5; background: rgba(0, 80, 229, 0.06); }
    .pub-group-option .material-symbols-outlined { color: #0050e5; }
    .pub-group-option div { display: flex; flex-direction: column; }
    .pub-group-option small { font-size: 11.5px; color: #64748b; }
    .pub-badge { display: inline-block; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 999px; background: rgba(0, 80, 229, 0.1); color: #0050e5; }
    .pub-group-summary h2 { margin: 8px 0 6px; font-size: 20px; }
    .pub-group-summary p { margin: 0 0 12px; font-size: 13.5px; color: #475569; line-height: 1.55; }
    .pub-meta { display: flex; flex-direction: column; gap: 8px; font-size: 13px; color: #64748b; }
    .pub-meta div { display: flex; align-items: center; gap: 6px; }
    .pub-meta .material-symbols-outlined { font-size: 17px; color: #0050e5; }
    .pub-signedin-banner {
      display: flex; gap: 12px; align-items: flex-start; padding: 14px 16px; border-radius: 12px;
      background: rgba(0, 80, 229, 0.07); border-left: 3px solid #0050e5;
    }
    .pub-signedin-banner .material-symbols-outlined { color: #0050e5; font-size: 22px; }
    .pub-signedin-banner p { margin: 4px 0 0; font-size: 13px; color: #475569; }
    .pub-identity-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; }
    .pub-field { display: flex; flex-direction: column; gap: 6px; }
    .pub-field label { font-size: 13px; font-weight: 600; color: #1e293b; }
    .pub-field .req { color: #dc2626; }
    .pub-field input[type="text"], .pub-field input[type="email"], .pub-field input[type="tel"],
    .pub-field input[type="number"], .pub-field input[type="date"], .pub-field input[type="url"],
    .pub-field textarea, .pub-field select {
      border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px 12px; font-size: 14px; font-family: inherit;
    }
    .pub-extra-block { border-top: 1px solid #e2e8f0; padding-top: 16px; display: flex; flex-direction: column; gap: 14px; }
    .pub-extra-head h4 { margin: 0; font-size: 15.5px; }
    .pub-extra-head p { margin: 4px 0 0; font-size: 13px; color: #64748b; }
    .pub-checks { display: flex; flex-direction: column; gap: 6px; }
    .pub-check { display: inline-flex; align-items: center; gap: 8px; font-size: 13.5px; }
    .pub-hint { font-size: 12px; color: #64748b; }
    .pub-uploaded { font-size: 12px; color: #0050e5; font-weight: 600; }
    .pub-btn-primary, .pub-btn-secondary {
      display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      padding: 12px 20px; border-radius: 10px; font-size: 14px; font-weight: 700; text-decoration: none; cursor: pointer; border: none;
    }
    .pub-btn-primary { background: #0050e5; color: #ffffff; }
    .pub-btn-primary.full { width: 100%; margin-top: 6px; }
    .pub-btn-secondary { background: rgba(0, 80, 229, 0.1); color: #0050e5; }
    .pub-alert.error {
      display: flex; align-items: center; gap: 8px; padding: 12px 14px; border-radius: 10px;
      background: rgba(220, 38, 38, 0.08); color: #dc2626; font-size: 13px; font-weight: 600;
    }
    .pub-success-badge {
      width: 60px; height: 60px; border-radius: 50%; background: rgba(16, 185, 129, 0.14); color: #059669;
      display: flex; align-items: center; justify-content: center;
    }
    .pub-success-badge .material-symbols-outlined { font-size: 32px; }
    .err-icon { font-size: 42px; color: #dc2626; }
    .spin { animation: pubSpin 1s linear infinite; font-size: 36px; color: #0050e5; }
    @keyframes pubSpin { to { transform: rotate(360deg); } }
  `]
})
export class PublicCommitteeRegisterComponent implements OnInit {
  tenantSlug = '';
  groupSlug = '';
  inviteToken = '';

  loading = true;
  loadError = '';
  directoryMode = true;

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
    this.committeesService.uploadPublicAttachment(file, this.tenantSlug || undefined).subscribe({
      next: (res: any) => {
        this.uploadingFile = false;
        if (res?.isSuccess && res.data?.fileUrl) {
          this.extraAnswers[key] = res.data.fileUrl;
          this.attachmentUrls.push(res.data.fileUrl);
        }
      },
      error: () => {
        this.uploadingFile = false;
      }
    });
  }

  submitRegistration(): void {
    if (!this.activeCommittee) return;
    this.formError = '';

    if (!this.signedInMember) {
      if (!this.firstName.trim() || !this.email.trim()) {
        this.formError = 'First name and email address are required.';
        return;
      }
    }

    const fields: any[] = this.activeCommittee.extraInfoForm?.fields || [];
    for (const f of fields) {
      if (f.required) {
        const val = this.extraAnswers[f.key];
        if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
          this.formError = `Please complete required field: ${f.label}`;
          return;
        }
      }
    }

    this.submitting = true;
    this.committeesService
      .submitPublicRegistration(
        {
          committeeId: this.activeCommittee.id,
          inviteToken: this.inviteToken || undefined,
          firstName: this.firstName.trim(),
          lastName: this.lastName.trim(),
          email: this.email.trim(),
          phoneNumber: this.phoneNumber.trim(),
          extraInfoResponses: this.extraAnswers,
          attachmentUrls: this.attachmentUrls
        },
        this.tenantSlug || undefined
      )
      .subscribe({
        next: (res: any) => {
          this.submitting = false;
          if (res?.isSuccess) {
            this.submittedSuccess = true;
            this.submissionStatus = res.data?.status || 'Pending';
            this.submissionMessage = res.message || 'Your registration has been submitted.';
          } else {
            this.formError = res?.message || 'Submission could not be completed.';
          }
        },
        error: (err: any) => {
          this.submitting = false;
          this.formError = err?.error?.message || 'Unable to submit registration.';
        }
      });
  }

  resetForAnother(): void {
    this.submittedSuccess = false;
    this.extraAnswers = {};
    this.attachmentUrls = [];
  }
}

