import { Component, OnInit, OnDestroy, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CommitteesService } from '../../core/services/committees.service';
import { PublicPageShellService } from '../../core/services/public-page-shell.service';

/**
 * Public Committee & Sub-Group Registration Portal
 * Routes: /join-committee, /join-committee/:tenantSlug, /join-committee/:tenantSlug/:groupSlug
 * Wraps custom committee registration body into the official Landing Page shell via PublicPageShellService.
 */
@Component({
  selector: 'app-public-committee-register',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="public-dynamic-site-wrapper">
      <!-- Loading State -->
      <div *ngIf="loading" class="pub-site-loader">
        <div class="loader-inner">
          <span class="material-symbols-outlined spin">progress_activity</span>
          <p>Loading portal...</p>
        </div>
      </div>

      <!-- Assembled Landing Page Shell: Menu + Breadcrumb + Injected Registration Body + Footer -->
      <main *ngIf="!loading" class="dynamic-rendered-content" [innerHTML]="safeRenderedHtml"></main>
    </div>
  `,
  styles: [`
    .public-dynamic-site-wrapper {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      width: 100%;
      background: #f8fafc;
    }
    .pub-site-loader {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 60vh;
      width: 100%;
    }
    .loader-inner {
      text-align: center;
      color: #64748b;
    }
    .loader-inner .material-symbols-outlined {
      font-size: 36px;
      color: #0050e5;
    }
    .loader-inner p {
      margin-top: 10px;
      font-size: 14px;
      font-weight: 600;
    }
    .spin {
      animation: pubSpin 1s linear infinite;
    }
    @keyframes pubSpin {
      100% { transform: rotate(360deg); }
    }
  `]
})
export class PublicCommitteeRegisterComponent implements OnInit, OnDestroy {
  tenantSlug = '';
  groupSlug = '';
  inviteToken = '';

  loading = true;
  isNotFound = false;
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

  safeRenderedHtml: SafeHtml | null = null;

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
    private router: Router,
    private committeesService: CommitteesService,
    private publicShell: PublicPageShellService,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    const paramTenant = this.route.snapshot.paramMap.get('tenantSlug') || '';
    const paramGroup = this.route.snapshot.paramMap.get('groupSlug') || '';
    this.inviteToken = this.route.snapshot.queryParamMap.get('token') || '';

    const hostTenant = this.extractHostTenant();
    const localTenant = localStorage.getItem('tenant_key') || '';
    const inferredTenant = hostTenant || localTenant;

    if (paramTenant && paramGroup) {
      // Direct two-segment route: e.g. /join-committee/rozzy-touchxz/feed
      this.tenantSlug = paramTenant;
      this.groupSlug = paramGroup;
    } else if (paramTenant && !paramGroup) {
      // Single-segment route: e.g. /join-committee/feed on a tenant subdomain, OR /join-committee/rozzy-touchxz on main domain
      if (inferredTenant && paramTenant.toLowerCase() !== inferredTenant.toLowerCase()) {
        this.tenantSlug = inferredTenant;
        this.groupSlug = paramTenant;
      } else {
        this.tenantSlug = paramTenant;
        this.groupSlug = '';
      }
    } else {
      // No segments in path: e.g. /join-committee
      this.tenantSlug = inferredTenant;
      this.groupSlug = '';
    }

    // Load official Landing Page shell metadata
    await this.publicShell.loadSiteThemeData();

    if (this.groupSlug) {
      this.directoryMode = false;
      this.loadSingleGroup();
    } else {
      this.directoryMode = true;
      this.loadDirectory();
    }
  }

  /**
   * Helper extracting the tenant identifier from the browser hostname when on a subdomain (e.g. rozzy-touchxz.localhost:4200).
   */
  private extractHostTenant(): string {
    const host = window.location.hostname.toLowerCase();
    const parts = host.split('.');
    if (parts.length > 1 && !['localhost', '127.0.0.1', 'www', 'api', 'central', 'admin'].includes(parts[0])) {
      return parts[0];
    }
    return '';
  }

  ngOnDestroy(): void {
    this.publicShell.destroyPublicShell();
  }

  /**
   * Global click listener handling link navigation, form submissions, and dynamic interactive triggers
   * rendered inside the assembled document.
   */
  @HostListener('click', ['$event'])
  onGlobalClick(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    if (!target) return;

    // 1. Submit Action Handler
    const submitBtn = target.closest('button[type="submit"], .pub-submit-trigger') as HTMLElement;
    if (submitBtn) {
      e.preventDefault();
      const form = submitBtn.closest('form') as HTMLFormElement;
      if (form) {
        this.handleFormSubmit(form);
      }
      return;
    }

    // 2. Upload Action Handler
    const uploadBtn = target.closest('.pub-btn-upload') as HTMLElement;
    if (uploadBtn) {
      e.preventDefault();
      const targetId = uploadBtn.getAttribute('data-target-input');
      if (targetId) {
        const input = document.getElementById(targetId) as HTMLInputElement;
        input?.click();
      }
      return;
    }

    // 3. Reset Action Handler (Register for another)
    const resetBtn = target.closest('.pub-btn-reset-trigger') as HTMLElement;
    if (resetBtn) {
      e.preventDefault();
      this.resetRegistration();
      return;
    }

    // 4. Link Navigation Handler (SPA routing)
    const anchor = target.closest('a') as HTMLAnchorElement;
    if (anchor && !anchor.classList.contains('dropdown-toggle') && !anchor.classList.contains('oz-dropdown-toggle')) {
      const isThemeToggle = anchor.getAttribute('data-bs-toggle') !== null ||
                            anchor.getAttribute('data-toggle') !== null ||
                            anchor.hasAttribute('data-bs-target') ||
                            anchor.hasAttribute('data-target') ||
                            anchor.classList.contains('toggle-btn') ||
                            anchor.classList.contains('menu-toggle');

      const href = (anchor.getAttribute('href') || '').trim();
      if (isThemeToggle || href === '#' || href === '' || href.startsWith('javascript:')) {
        return;
      }

      if (href && !href.startsWith('http') && !href.startsWith('mailto:') && !href.startsWith('tel:') && !href.startsWith('javascript:')) {
        if (href.startsWith('#')) {
          e.preventDefault();
          const element = document.querySelector(href);
          element?.scrollIntoView({ behavior: 'smooth' });
          return;
        }

        e.preventDefault();
        document.querySelectorAll('.dropdown-menu.show').forEach(m => m.classList.remove('show'));
        this.router.navigateByUrl(href);
      }
    }
  }

  /**
   * Global change listener handling directory switcher and file uploads.
   */
  @HostListener('change', ['$event'])
  onGlobalChange(e: Event): void {
    const target = e.target as HTMLElement;
    if (!target) return;

    // File input change
    if (target instanceof HTMLInputElement && target.type === 'file') {
      const fieldName = target.getAttribute('data-field-name') || '';
      if (fieldName && target.files && target.files.length > 0) {
        this.handleFileUpload(target.files[0], fieldName);
      }
      return;
    }

    // Directory selection change
    if (target instanceof HTMLSelectElement && target.classList.contains('pub-dir-dropdown')) {
      const selectedId = target.value;
      const found = this.openCommittees.find(c => c.id === selectedId);
      if (found) {
        this.activeCommittee = found;
        this.extraAnswers = {};
        this.attachmentUrls = [];
        this.formError = '';
        this.assembleLayout(false);
      }
    }
  }



  /**
   * Invokes PublicPageShellService to wrap the dynamic body into the Landing Page shell.
   */
  private assembleLayout(is404: boolean): void {
    if (is404) {
      const bundle = this.publicShell.assembleNotAvailable('Page Not Found');
      this.safeRenderedHtml = this.sanitizer.bypassSecurityTrustHtml(bundle.visualBodyMarkup);
      this.cdr.detectChanges();
      return;
    }

    const c = this.activeCommittee;
    const committeeName = c?.name || 'Registration';
    const parentName = c?.parentCommitteeName;

    const bundle = this.publicShell.assemblePageWithBody({
      pageTitle: committeeName,
      pageSlug: 'join-committee',
      breadcrumb: {
        title: committeeName,
        parentTitle: parentName || this.aliases.aliasPlural,
        parentUrl: parentName ? '#' : '/join-committee',
        backgroundImageUrl: c?.coverBannerUrl || c?.imageUrl || ''
      },
      bodySections: [{
        name: 'Committee Registration Body',
        category: 'body',
        html: this.renderRegistrationCardHtml(),
        css: this.getBodyStyles(),
        sortOrder: 1
      }]
    });

    this.safeRenderedHtml = this.sanitizer.bypassSecurityTrustHtml(bundle.visualBodyMarkup);
    this.cdr.detectChanges();
  }

  /**
   * Renders the dynamic Committee Registration Body card.
   */
  private renderRegistrationCardHtml(): string {
    if (this.submittedSuccess) {
      return `
        <div class="pub-main-centered-wrap">
          <div class="pub-card-state success">
            <div class="pub-success-icon-wrap">
              <span class="material-symbols-outlined">verified</span>
            </div>
            <h2>${this.submissionStatus === 'Approved' ? 'You Are Enrolled!' : 'Application Submitted'}</h2>
            <p>${this.submissionMessage}</p>
            <div class="pub-success-actions">
              ${this.signedInMember ? `<a href="/committees/workspace/my" class="pub-btn-primary">Open My ${this.aliases.aliasPlural}</a>` : ''}
              ${!this.signedInMember && this.directoryMode ? `<button type="button" class="pub-btn-secondary pub-btn-reset-trigger">Register for Another ${this.aliases.aliasSingular}</button>` : ''}
              ${!this.signedInMember && !this.directoryMode ? `<a href="/" class="pub-btn-secondary">Return to Website</a>` : ''}
            </div>
          </div>
        </div>
      `;
    }

    if (!this.activeCommittee) {
      return `
        <section class="oz-not-available-section">
          <div class="oz-not-available-box">
            <div class="oz-na-badge">404</div>
            <h1 class="oz-na-title">Not Available</h1>
            <div class="oz-na-actions">
              <a href="/" class="oz-na-btn">Return to Home</a>
            </div>
          </div>
        </section>
      `;
    }

    const c = this.activeCommittee;
    const isSubGroup = !!c.parentCommitteeId;
    const catBadge = isSubGroup ? this.aliases.subGroupAliasSingular : this.aliases.aliasSingular;

    // Dropdown selector if multiple committees exist in directory
    let dirSelectorHtml = '';
    if (this.directoryMode && this.openCommittees.length > 1) {
      const optionsHtml = this.openCommittees.map(item => `
        <option value="${item.id}" ${item.id === c.id ? 'selected' : ''}>
          ${item.name} (${item.parentCommitteeName ? 'Under ' + item.parentCommitteeName : (item.categoryTag || this.aliases.aliasSingular)})
        </option>
      `).join('');

      dirSelectorHtml = `
        <div class="pub-dir-select-bar">
          <label>Select ${this.aliases.aliasSingular} / ${this.aliases.subGroupAliasSingular} to Join:</label>
          <select class="pub-dir-dropdown">
            ${optionsHtml}
          </select>
        </div>
      `;
    }

    // Extra-Info Form Fields
    let extraFieldsHtml = '';
    const fields: any[] = c.extraInfoForm?.fields || [];
    if (fields.length > 0) {
      const fieldsMarkup = fields.map(f => {
        const reqStar = f.isRequired ? '<span class="req">*</span>' : '';
        const reqAttr = f.isRequired ? 'required' : '';
        let inputMarkup = '';

        if (f.fieldType === 'textarea') {
          inputMarkup = `<textarea name="${f.fieldName}" rows="3" placeholder="${f.placeholder || 'e.g. Provide details here'}" ${reqAttr}>${this.extraAnswers[f.fieldName] || ''}</textarea>`;
        } else if (f.fieldType === 'number') {
          inputMarkup = `<input type="number" name="${f.fieldName}" value="${this.extraAnswers[f.fieldName] || ''}" placeholder="e.g. 0" ${reqAttr} />`;
        } else if (f.fieldType === 'date') {
          inputMarkup = `<input type="date" name="${f.fieldName}" value="${this.extraAnswers[f.fieldName] || ''}" ${reqAttr} />`;
        } else if (f.fieldType === 'select') {
          const opts = (f.options || []).map((o: string) => `<option value="${o}" ${this.extraAnswers[f.fieldName] === o ? 'selected' : ''}>${o}</option>`).join('');
          inputMarkup = `
            <select name="${f.fieldName}" ${reqAttr}>
              <option value="">-- Select an option --</option>
              ${opts}
            </select>
          `;
        } else if (f.fieldType === 'file') {
          inputMarkup = `
            <div class="pub-file-wrap">
              <input type="file" id="file-${f.fieldName}" data-field-name="${f.fieldName}" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp" style="display: none;" />
              <button type="button" class="pub-btn-upload" data-target-input="file-${f.fieldName}">
                <span class="material-symbols-outlined">upload_file</span>
                <span>${this.extraAnswers[f.fieldName] ? 'Replace Attached File' : (f.placeholder || 'Upload Document (PDF, Word, Image)')}</span>
              </button>
              ${this.extraAnswers[f.fieldName] ? `<div class="pub-uploaded-preview"><span class="material-symbols-outlined">attachment</span><a href="${this.extraAnswers[f.fieldName]}" target="_blank" rel="noopener">View Uploaded Document</a></div>` : ''}
            </div>
          `;
        } else {
          inputMarkup = `<input type="text" name="${f.fieldName}" value="${this.extraAnswers[f.fieldName] || ''}" placeholder="${f.placeholder || 'e.g. Your response'}" ${reqAttr} />`;
        }

        return `
          <div class="pub-field">
            <label>${f.label} ${reqStar}</label>
            ${inputMarkup}
            ${f.helpText ? `<small class="pub-hint">${f.helpText}</small>` : ''}
          </div>
        `;
      }).join('');

      extraFieldsHtml = `
        <div class="pub-extra-form-section">
          <div class="pub-section-divider">
            <h4>${c.extraInfoForm.title || 'Supplemental Information'}</h4>
            ${c.extraInfoForm.description ? `<p>${c.extraInfoForm.description}</p>` : ''}
          </div>
          ${fieldsMarkup}
        </div>
      `;
    }

    const errorAlertHtml = this.formError ? `
      <div class="pub-alert error">
        <span class="material-symbols-outlined">error</span>
        <span>${this.formError}</span>
      </div>
    ` : '';

    return `
      <div class="pub-main-centered-wrap">
        <div class="pub-card-form">
          ${dirSelectorHtml}

          <div class="pub-card-header">
            <div class="pub-badge-schedule-row">
              <span class="pub-category-badge">${catBadge}</span>
              ${c.meetingSchedule ? `<span class="pub-schedule-badge"><span class="material-symbols-outlined">event_repeat</span><span>${c.meetingSchedule}</span></span>` : ''}
            </div>
            <h1 class="pub-form-title">${c.name}</h1>
            <p class="pub-form-desc">${c.description || c.missionStatement || 'Complete the registration form below to join.'}</p>
          </div>

          ${errorAlertHtml}

          <form class="pub-form-body">
            <div class="pub-form-row two-cols">
              <div class="pub-field">
                <label>First Name <span class="req">*</span></label>
                <input type="text" name="firstName" placeholder="e.g. First Name" required autocomplete="given-name" />
              </div>
              <div class="pub-field">
                <label>Last Name <span class="req">*</span></label>
                <input type="text" name="lastName" placeholder="e.g. Last Name" required autocomplete="family-name" />
              </div>
            </div>

            <div class="pub-form-row two-cols">
              <div class="pub-field">
                <label>Email Address <span class="req">*</span></label>
                <input type="email" name="email" placeholder="name@company.com" required autocomplete="email" />
              </div>
              <div class="pub-field">
                <label>Phone Number</label>
                <input type="tel" name="phoneNumber" placeholder="e.g. +0 (000) 000-0000" autocomplete="tel" />
              </div>
            </div>

            ${extraFieldsHtml}

            <div class="pub-form-actions">
              <button type="submit" class="pub-btn-primary pub-submit-trigger" ${this.submitting ? 'disabled' : ''}>
                <span class="material-symbols-outlined">${this.submitting ? 'progress_activity' : 'how_to_reg'}</span>
                <span>${this.submitting ? 'Submitting Registration...' : ('Complete ' + this.aliases.aliasSingular + ' Registration')}</span>
              </button>
            </div>

            <div class="pub-form-footer">
              <span>Already a member of this workspace?</span>
              <a href="/login">Sign in to your member portal</a>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  /**
   * Scoped CSS styles for the dynamic body section.
   */
  private getBodyStyles(): string {
    return `
      .pub-main-centered-wrap {
        max-width: 680px;
        width: 100%;
        margin: 40px auto 60px auto;
        padding: 0 20px;
        box-sizing: border-box;
      }
      .pub-card-form {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 16px;
        padding: 36px 32px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);
      }
      .pub-dir-select-bar {
        margin-bottom: 24px;
        padding-bottom: 20px;
        border-bottom: 1px dashed #e2e8f0;
      }
      .pub-dir-select-bar label {
        display: block;
        font-size: 13px;
        font-weight: 700;
        color: #475569;
        margin-bottom: 8px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .pub-dir-dropdown {
        width: 100%;
        padding: 10px 14px;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        font-size: 15px;
        background: #ffffff;
        color: #0f172a;
        outline: none;
      }
      .pub-card-header {
        margin-bottom: 28px;
      }
      .pub-badge-schedule-row {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 12px;
        flex-wrap: wrap;
      }
      .pub-category-badge {
        display: inline-block;
        font-size: 11px;
        font-weight: 800;
        color: #0050e5;
        background: rgba(0, 80, 229, 0.08);
        padding: 4px 10px;
        border-radius: 6px;
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }
      .pub-schedule-badge {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-size: 12px;
        font-weight: 600;
        color: #475569;
        background: #f1f5f9;
        padding: 4px 10px;
        border-radius: 6px;
      }
      .pub-schedule-badge .material-symbols-outlined {
        font-size: 15px;
        color: #0050e5;
      }
      .pub-form-title {
        font-size: 26px;
        font-weight: 800;
        color: #0f172a;
        margin: 0 0 8px 0;
        line-height: 1.25;
      }
      .pub-form-desc {
        font-size: 14px;
        color: #64748b;
        margin: 0;
        line-height: 1.6;
      }
      .pub-alert.error {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 16px;
        background: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 8px;
        color: #991b1b;
        font-size: 13px;
        margin-bottom: 20px;
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
      @media (max-width: 600px) {
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
      .pub-field label .req {
        color: #ef4444;
        margin-left: 2px;
      }
      .pub-field input[type="text"],
      .pub-field input[type="email"],
      .pub-field input[type="tel"],
      .pub-field input[type="number"],
      .pub-field input[type="date"],
      .pub-field select,
      .pub-field textarea {
        padding: 11px 14px;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        font-size: 14px;
        color: #0f172a;
        background: #ffffff;
        outline: none;
        box-sizing: border-box;
        width: 100%;
      }
      .pub-field input:focus,
      .pub-field select:focus,
      .pub-field textarea:focus {
        border-color: #0050e5;
        box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.12);
      }
      .pub-extra-form-section {
        margin-top: 10px;
        padding-top: 20px;
        border-top: 1px solid #e2e8f0;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .pub-section-divider h4 {
        font-size: 16px;
        font-weight: 700;
        color: #0f172a;
        margin: 0 0 4px 0;
      }
      .pub-section-divider p {
        font-size: 13px;
        color: #64748b;
        margin: 0;
      }
      .pub-btn-upload {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 10px 16px;
        border: 1px dashed #cbd5e1;
        background: #f8fafc;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        color: #475569;
        cursor: pointer;
      }
      .pub-btn-upload:hover {
        background: #f1f5f9;
        border-color: #0050e5;
        color: #0050e5;
      }
      .pub-uploaded-preview {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        color: #0050e5;
        margin-top: 4px;
      }
      .pub-uploaded-preview a {
        color: #0050e5;
        font-weight: 600;
        text-decoration: underline;
      }
      .pub-hint {
        font-size: 12px;
        color: #94a3b8;
      }
      .pub-form-actions {
        margin-top: 14px;
      }
      .pub-btn-primary {
        width: 100%;
        padding: 13px 24px;
        background: #0050e5;
        color: #ffffff !important;
        border: none;
        border-radius: 10px;
        font-size: 15px;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 80, 229, 0.25);
      }
      .pub-btn-primary:hover:not(:disabled) {
        background: #003ebd;
        transform: translateY(-1px);
        box-shadow: 0 6px 16px rgba(0, 80, 229, 0.35);
      }
      .pub-form-footer {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        font-size: 13px;
        color: #64748b;
        margin-top: 14px;
        text-align: center;
      }
      .pub-form-footer a {
        color: #0050e5;
        font-weight: 700;
        text-decoration: none;
      }
      .pub-card-state {
        text-align: center;
        padding: 60px 20px;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 16px;
      }
      .pub-card-state.success {
        padding: 48px 24px;
      }
      .pub-success-icon-wrap {
        width: 64px;
        height: 64px;
        border-radius: 50%;
        background: #dcfce7;
        color: #16a34a;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 18px auto;
      }
      .pub-success-icon-wrap .material-symbols-outlined {
        font-size: 36px;
      }
      .pub-card-state h2 {
        font-size: 22px;
        font-weight: 800;
        color: #0f172a;
        margin: 0 0 10px 0;
      }
      .pub-card-state p {
        font-size: 15px;
        color: #64748b;
        margin: 0 auto 24px auto;
        max-width: 460px;
        line-height: 1.6;
      }
      .pub-success-actions {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        flex-wrap: wrap;
      }
      .pub-btn-secondary {
        padding: 11px 20px;
        background: #ffffff;
        color: #334155;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        text-decoration: none;
      }
      .pub-btn-secondary:hover {
        background: #f8fafc;
        border-color: #94a3b8;
      }

      /* Clean Not Available Status Styles */
      .oz-not-available-section {
        min-height: 420px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 80px 24px;
        background: #ffffff;
        width: 100%;
        box-sizing: border-box;
      }
      .oz-not-available-box {
        max-width: 440px;
        width: 100%;
        margin: 0 auto;
        text-align: center;
      }
      .oz-na-badge {
        display: inline-block;
        padding: 4px 14px;
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 0.08em;
        color: #dc2626;
        background: rgba(220, 38, 38, 0.08);
        border-radius: 9999px;
        margin-bottom: 16px;
      }
      .oz-na-title {
        font-size: 32px;
        font-weight: 800;
        color: #0f172a;
        margin: 0 0 24px 0;
        letter-spacing: -0.02em;
      }
      .oz-na-actions {
        display: flex;
        justify-content: center;
      }
      .oz-na-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 10px 24px;
        border-radius: 8px;
        background: #0050e5;
        color: #ffffff !important;
        font-size: 14px;
        font-weight: 600;
        text-decoration: none;
        transition: all 0.2s ease;
      }
      .oz-na-btn:hover {
        background: #003db3;
        transform: translateY(-1px);
      }
    `;
  }

  private loadDirectory(): void {
    this.loading = true;
    this.committeesService.getPublicDirectory(this.tenantSlug || undefined).subscribe({
      next: (res: any) => {
        if (res?.isSuccess && res.data) {
          this.isNotFound = false;
          this.brand = res.data.brand;
          this.aliases = { ...this.aliases, ...(res.data.aliases || {}) };
          this.signedInMember = res.data.signedInMember;
          this.openCommittees = res.data.committees || [];
          if (this.openCommittees.length > 0) {
            this.activeCommittee = this.openCommittees[0];
          } else {
            this.isNotFound = true;
          }
          this.assembleLayout(this.isNotFound);
        } else {
          this.isNotFound = true;
          this.assembleLayout(true);
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.isNotFound = true;
        this.assembleLayout(true);
      }
    });
  }

  private loadSingleGroup(): void {
    this.loading = true;
    this.committeesService
      .getPublicCommitteeBySlug(this.groupSlug, this.tenantSlug || undefined, this.inviteToken || undefined)
      .subscribe({
        next: (res: any) => {
          if (res?.isSuccess && res.data) {
            this.isNotFound = false;
            this.brand = res.data.brand;
            this.aliases = { ...this.aliases, ...(res.data.aliases || {}) };
            this.signedInMember = res.data.signedInMember;
            this.activeCommittee = res.data.committee;
            this.assembleLayout(false);
          } else {
            this.isNotFound = true;
            this.assembleLayout(true);
          }
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.isNotFound = true;
          this.assembleLayout(true);
        }
      });
  }

  private handleFormSubmit(form: HTMLFormElement): void {
    this.formError = '';
    const firstName = (form.querySelector<HTMLInputElement>('[name="firstName"]')?.value || '').trim();
    const lastName = (form.querySelector<HTMLInputElement>('[name="lastName"]')?.value || '').trim();
    const email = (form.querySelector<HTMLInputElement>('[name="email"]')?.value || '').trim();
    const phoneNumber = (form.querySelector<HTMLInputElement>('[name="phoneNumber"]')?.value || '').trim();

    if (!firstName || !lastName) {
      this.formError = 'Please enter your first and last name.';
      this.assembleLayout(false);
      return;
    }
    if (!email) {
      this.formError = 'Please enter a valid email address.';
      this.assembleLayout(false);
      return;
    }

    // Collect supplemental extra answers
    const extra: Record<string, any> = { ...this.extraAnswers };
    const inputs = form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input, textarea, select');
    inputs.forEach(inp => {
      const name = inp.getAttribute('name');
      if (name && !['firstName', 'lastName', 'email', 'phoneNumber'].includes(name)) {
        if (inp instanceof HTMLInputElement && (inp.type === 'checkbox' || inp.type === 'radio')) {
          if (inp.checked) extra[name] = inp.value;
        } else {
          extra[name] = inp.value;
        }
      }
    });

    // Check mandatory extra questions
    const fields: any[] = this.activeCommittee?.extraInfoForm?.fields || [];
    for (const f of fields) {
      if (f.isRequired) {
        const val = extra[f.fieldName];
        if (val === undefined || val === null || val === '') {
          this.formError = `Please complete the mandatory field: "${f.label}".`;
          this.assembleLayout(false);
          return;
        }
      }
    }

    this.submitting = true;
    this.assembleLayout(false);

    const payload = {
      committeeId: this.activeCommittee.id,
      tenantKey: this.tenantSlug || undefined,
      inviteToken: this.inviteToken || undefined,
      firstName,
      lastName,
      email,
      phoneNumber,
      extraAnswers: extra,
      attachmentUrls: this.attachmentUrls
    };

    this.committeesService.submitPublicRegistration(payload, this.tenantSlug || undefined).subscribe({
      next: (res: any) => {
        this.submitting = false;
        if (res?.isSuccess) {
          this.submittedSuccess = true;
          this.submissionStatus = res.data?.status || 'Pending';
          this.submissionMessage = res.message || 'Your registration has been submitted.';
          this.assembleLayout(false);
        } else {
          this.formError = res?.message || 'Registration could not be completed. Please try again.';
          this.assembleLayout(false);
        }
      },
      error: (err: any) => {
        this.submitting = false;
        this.formError = err?.error?.message || 'An error occurred during registration. Please review and try again.';
        this.assembleLayout(false);
      }
    });
  }

  private handleFileUpload(file: File, fieldName: string): void {
    this.uploadingFile = true;
    this.formError = '';

    this.committeesService.uploadPublicAttachment(file, this.tenantSlug || undefined).subscribe({
      next: (res: any) => {
        this.uploadingFile = false;
        if (res?.isSuccess && res.data?.fileUrl) {
          this.extraAnswers[fieldName] = res.data.fileUrl;
          if (!this.attachmentUrls.includes(res.data.fileUrl)) {
            this.attachmentUrls.push(res.data.fileUrl);
          }
          this.assembleLayout(false);
        } else {
          this.formError = res?.message || 'Attachment upload failed.';
          this.assembleLayout(false);
        }
      },
      error: (err: any) => {
        this.uploadingFile = false;
        this.formError = err?.error?.message || 'Attachment upload failed.';
        this.assembleLayout(false);
      }
    });
  }

  private resetRegistration(): void {
    this.submittedSuccess = false;
    this.submissionStatus = '';
    this.submissionMessage = '';
    this.extraAnswers = {};
    this.attachmentUrls = [];
    this.formError = '';
    this.assembleLayout(false);
  }
}
