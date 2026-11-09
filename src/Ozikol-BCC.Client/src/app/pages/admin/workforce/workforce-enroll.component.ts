import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { WorkforceService } from '../../../core/services/workforce.service';
import { ToastService } from '../../../core/services/toast.service';

/**
 * Dedicated Page Component for Enrolling Workforce Staff Members.
 * Route: `/workforce/console/enroll`
 * Supports two distinct onboarding paths:
 * 1. Self-Service Invite Link: Worker completes compliance details & sets password.
 * 2. Direct Admin Pre-Enrollment: Admin fills full identity, credentials, emergency contact & bank info upfront.
 */
@Component({
  selector: 'app-workforce-enroll',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
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
            Onboard security officers, guards, and healthcare workers via self-registration invite or direct credential provisioning.
          </p>
        </div>
        <div class="header-actions">
          <a routerLink="/workforce/console/analytics" class="btn btn-outline">
            <span class="material-symbols-outlined">arrow_back</span>
            <span>Back to Roster</span>
          </a>
        </div>
      </div>

      <!-- 2. Dual Tab Mode Selector -->
      <div class="enroll-tabs-bar">
        <button
          type="button"
          class="enroll-tab"
          [class.active]="activeTab === 'invite'"
          (click)="activeTab = 'invite'"
        >
          <span class="material-symbols-outlined">send</span>
          <div class="tab-text">
            <strong>Send Self-Registration Invite</strong>
            <small>Worker fills compliance details &amp; sets password</small>
          </div>
        </button>

        <button
          type="button"
          class="enroll-tab"
          [class.active]="activeTab === 'direct'"
          (click)="activeTab = 'direct'"
        >
          <span class="material-symbols-outlined">how_to_reg</span>
          <div class="tab-text">
            <strong>Direct Admin Pre-Enrollment</strong>
            <small>Admin provisions complete profile &amp; temporary credentials</small>
          </div>
        </button>
      </div>

      <!-- 3. TAB 1: SELF-REGISTRATION INVITATION -->
      <div class="tab-pane-content" *ngIf="activeTab === 'invite'">
        <div class="invite-form-grid">
          <!-- Left Column: Essential Invitation Details -->
          <div class="cms-card">
            <div class="card-header">
              <div class="card-title-group">
                <span class="material-symbols-outlined text-blue">mail</span>
                <div>
                  <h3>Invitation Parameters</h3>
                  <p class="card-subtitle">Essential details to generate a secure, 7-day worker onboarding link.</p>
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
                  placeholder="e.g. First Last"
                  required
                />
                <span class="field-hint">Worker's legal or professional name.</span>
              </div>

              <div class="form-group">
                <label class="form-label">Email Address <span class="required">*</span></label>
                <input
                  type="email"
                  class="form-control"
                  [(ngModel)]="inviteModel.email"
                  placeholder="name@company.com"
                  required
                />
                <span class="field-hint">The invitation and secure access token will be dispatched to this inbox.</span>
              </div>

              <div class="form-row-dual">
                <div class="form-group">
                  <label class="form-label">Designated Job Title <span class="required">*</span></label>
                  <select class="form-control" [(ngModel)]="inviteModel.jobTitle">
                    <option *ngFor="let role of (jobRoles.length ? jobRoles : fallbackJobRoles)" [value]="role.title">
                      {{ role.title }} ({{ role.code }})
                    </option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Staff Classification Type <span class="required">*</span></label>
                  <select class="form-control" [(ngModel)]="inviteModel.staffTypeId" (change)="onStaffTypeChange(inviteModel)">
                    <option *ngFor="let st of staffTypes" [value]="st.id">
                      {{ st.name }} {{ st.isCompulsory ? '(Compulsory)' : '' }} &bull; {{ st.defaultContractedHours }} hrs/wk
                    </option>
                  </select>
                  <span class="field-hint">Defines baseline duty capacity and rota contract rules.</span>
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

              <div class="form-group">
                <label class="form-label">Personalized Welcome Note (Optional)</label>
                <textarea
                  class="form-control"
                  rows="3"
                  [(ngModel)]="inviteModel.welcomeNote"
                  placeholder="Welcome to the team! Please complete your onboarding details and upload your credentials..."
                ></textarea>
              </div>
            </div>
          </div>

          <!-- Right Column: Mandatory Information Checklist -->
          <div class="cms-card">
            <div class="card-header">
              <div class="card-title-group">
                <span class="material-symbols-outlined text-purple">checklist</span>
                <div>
                  <h3>Worker Self-Registration Requirements</h3>
                  <p class="card-subtitle">Decide what compliance details your staff must submit before activating.</p>
                </div>
              </div>
            </div>

            <div class="card-body">
              <div class="requirement-item">
                <div class="req-checkbox">
                  <input type="checkbox" id="reqSia" [(ngModel)]="inviteModel.requireSiaLicense" />
                </div>
                <label for="reqSia" class="req-label">
                  <strong>Professional License / Registration Credential</strong>
                  <p>Worker must submit their regulatory credential/license number and valid expiry date.</p>
                </label>
              </div>

              <div class="requirement-item">
                <div class="req-checkbox">
                  <input type="checkbox" id="reqNok" [(ngModel)]="inviteModel.requireEmergencyContact" />
                </div>
                <label for="reqNok" class="req-label">
                  <strong>Emergency Contact / Next of Kin</strong>
                  <p>Worker must provide an emergency contact name, relationship, and 24/7 phone number.</p>
                </label>
              </div>

              <div class="requirement-item">
                <div class="req-checkbox">
                  <input type="checkbox" id="reqBank" [(ngModel)]="inviteModel.requireBankDetails" />
                </div>
                <label for="reqBank" class="req-label">
                  <strong>Payroll Banking &amp; Sort Code</strong>
                  <p>Worker must submit their Bank Name, Sort Code (00-00-00), and 8-digit Account Number.</p>
                </label>
              </div>

              <div class="requirement-item">
                <div class="req-checkbox">
                  <input type="checkbox" id="reqRtw" [(ngModel)]="inviteModel.requireRightToWork" />
                </div>
                <label for="reqRtw" class="req-label">
                  <strong>Right to Work / Passport Verification</strong>
                  <p>Worker must verify legal right to work or submit an immigration share code.</p>
                </label>
              </div>

              <div class="requirement-item">
                <div class="req-checkbox">
                  <input type="checkbox" id="reqPoa" [(ngModel)]="inviteModel.requireProofOfAddress" />
                </div>
                <label for="reqPoa" class="req-label">
                  <strong>Proof of Address</strong>
                  <p>Worker must provide residential address and recent proof of address documentation.</p>
                </label>
              </div>

              <div class="invite-summary-box">
                <span class="material-symbols-outlined text-blue">verified_user</span>
                <div>
                  <strong>7-Day Cryptographic Token</strong>
                  <p>The worker receives a secure, one-time link valid for 7 days. Once submitted, their account activates instantly.</p>
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
                  <span>{{ isSubmitting ? 'Dispatching...' : 'Dispatch Invitation Email' }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 4. TAB 2: DIRECT ADMIN PRE-ENROLLMENT -->
      <div class="tab-pane-content" *ngIf="activeTab === 'direct'">
        <div class="direct-enroll-layout">
          <!-- Section 1: Account Identity & Login -->
          <div class="cms-card">
            <div class="card-header">
              <div class="card-title-group">
                <span class="material-symbols-outlined text-blue">account_circle</span>
                <div>
                  <h3>1. Identity &amp; Account Credentials</h3>
                  <p class="card-subtitle">Personal contact and login provisioning.</p>
                </div>
              </div>
            </div>

            <div class="card-body">
              <div class="form-row-dual">
                <div class="form-group">
                  <label class="form-label">First Name <span class="required">*</span></label>
                  <input
                    type="text"
                    class="form-control"
                    [(ngModel)]="directModel.firstName"
                    placeholder="e.g. First Name"
                    required
                  />
                </div>
                <div class="form-group">
                  <label class="form-label">Last Name <span class="required">*</span></label>
                  <input
                    type="text"
                    class="form-control"
                    [(ngModel)]="directModel.lastName"
                    placeholder="e.g. Last Name"
                    required
                  />
                </div>
              </div>

              <div class="form-row-dual">
                <div class="form-group">
                  <label class="form-label">Email Address <span class="required">*</span></label>
                  <input
                    type="email"
                    class="form-control"
                    [(ngModel)]="directModel.email"
                    placeholder="name@company.com"
                    required
                  />
                </div>
                <div class="form-group">
                  <label class="form-label">Mobile Phone Number</label>
                  <input
                    type="tel"
                    class="form-control"
                    [(ngModel)]="directModel.phoneNumber"
                    placeholder="e.g. +44 20 7946 0000"
                  />
                </div>
              </div>

              <div class="form-row-dual">
                <div class="form-group">
                  <label class="form-label">Initial Password</label>
                  <input
                    type="password"
                    class="form-control"
                    [(ngModel)]="directModel.password"
                    placeholder="Leave blank to auto-generate temporary password"
                  />
                </div>
                <div class="form-group" style="justify-content: center;">
                  <label class="checkbox-label" style="margin-top: 24px;">
                    <input type="checkbox" [(ngModel)]="directModel.mustChangePassword" />
                    <span>Force password change on first sign-in (Recommended)</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <!-- Section 2: Employment & Rates -->
          <div class="cms-card">
            <div class="card-header">
              <div class="card-title-group">
                <span class="material-symbols-outlined text-green">work</span>
                <div>
                  <h3>2. Employment Role &amp; Wage Baselines</h3>
                  <p class="card-subtitle">Job designation and rota contracted capacity.</p>
                </div>
              </div>
            </div>

            <div class="card-body">
              <div class="form-row-triple">
                <div class="form-group">
                  <label class="form-label">Designated Job Title <span class="required">*</span></label>
                  <select class="form-control" [(ngModel)]="directModel.jobTitle">
                    <option *ngFor="let role of (jobRoles.length ? jobRoles : fallbackJobRoles)" [value]="role.title">
                      {{ role.title }} ({{ role.code }})
                    </option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Staff Classification Type <span class="required">*</span></label>
                  <select class="form-control" [(ngModel)]="directModel.staffTypeId" (change)="onStaffTypeChange(directModel)">
                    <option *ngFor="let st of staffTypes" [value]="st.id">
                      {{ st.name }} {{ st.isCompulsory ? '(Compulsory)' : '' }}
                    </option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Default Hourly Pay Rate ({{ currencySymbol }}) <span class="required">*</span></label>
                  <input
                    type="number"
                    step="0.25"
                    class="form-control"
                    [(ngModel)]="directModel.defaultHourlyRate"
                    placeholder="e.g. 15.00"
                    required
                  />
                </div>
              </div>

              <div class="form-row-dual">
                <div class="form-group">
                  <label class="form-label">Contracted Weekly Hours</label>
                  <input
                    type="number"
                    class="form-control"
                    [(ngModel)]="directModel.contractedWeeklyHours"
                    placeholder="e.g. 40"
                  />
                  <span class="field-hint">Hours assigned before overtime flags are triggered.</span>
                </div>
                <div class="form-group">
                  <label class="form-label">National Insurance / Tax ID</label>
                  <input
                    type="text"
                    class="form-control"
                    [(ngModel)]="directModel.nationalInsuranceNumber"
                    placeholder="e.g. Tax / ID Number"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Section 3: Compliance Credential & Professional License -->
          <div class="cms-card">
            <div class="card-header">
              <div class="card-title-group">
                <span class="material-symbols-outlined text-purple">badge</span>
                <div>
                  <h3>3. Compliance Credential &amp; Professional License</h3>
                  <p class="card-subtitle">Mandatory licensing sector, qualification badge, or statutory registration.</p>
                </div>
              </div>
            </div>

            <div class="card-body">
              <div class="form-row-triple">
                <div class="form-group">
                  <label class="form-label">Credential / Document Category</label>
                  <select class="form-control" [(ngModel)]="directModel.siaLicenseSector">
                    <option *ngFor="let cat of (documentCategories.length ? documentCategories : fallbackCategories)" [value]="cat.name">
                      {{ cat.name }} ({{ cat.code }})
                    </option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">License / Reference Number</label>
                  <input
                    type="text"
                    class="form-control"
                    [(ngModel)]="directModel.siaLicenseNumber"
                    placeholder="e.g. License #, Certificate ID, or Registration code"
                  />
                </div>
                <div class="form-group">
                  <label class="form-label">Expiration Date</label>
                  <input
                    type="date"
                    class="form-control"
                    [(ngModel)]="directModel.siaLicenseExpiryDate"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Section 4: Next of Kin / Emergency Contact -->
          <div class="cms-card">
            <div class="card-header">
              <div class="card-title-group">
                <span class="material-symbols-outlined text-orange">emergency</span>
                <div>
                  <h3>4. Next of Kin &amp; Emergency Contact</h3>
                  <p class="card-subtitle">Designated contact for duty emergencies or incidents.</p>
                </div>
              </div>
            </div>

            <div class="card-body">
              <div class="form-row-triple">
                <div class="form-group">
                  <label class="form-label">Contact Full Name</label>
                  <input
                    type="text"
                    class="form-control"
                    [(ngModel)]="directModel.emergencyContactName"
                    placeholder="e.g. First Last"
                  />
                </div>
                <div class="form-group">
                  <label class="form-label">Relationship</label>
                  <input
                    type="text"
                    class="form-control"
                    [(ngModel)]="directModel.emergencyContactRelationship"
                    placeholder="e.g. Spouse / Parent"
                  />
                </div>
                <div class="form-group">
                  <label class="form-label">Emergency Phone (24/7)</label>
                  <input
                    type="tel"
                    class="form-control"
                    [(ngModel)]="directModel.emergencyContactPhone"
                    placeholder="e.g. +44 20 7946 0000"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Section 5: Payroll & Bank Details -->
          <div class="cms-card">
            <div class="card-header">
              <div class="card-title-group">
                <span class="material-symbols-outlined text-green">account_balance</span>
                <div>
                  <h3>5. Payroll &amp; Banking Details</h3>
                  <p class="card-subtitle">Direct deposit credentials for automated wage disbursements.</p>
                </div>
              </div>
            </div>

            <div class="card-body">
              <div class="form-row-dual">
                <div class="form-group">
                  <label class="form-label">Bank Name</label>
                  <input
                    type="text"
                    class="form-control"
                    [(ngModel)]="directModel.bankName"
                    placeholder="e.g. Bank Name"
                  />
                </div>
                <div class="form-group">
                  <label class="form-label">Account Holder Name</label>
                  <input
                    type="text"
                    class="form-control"
                    [(ngModel)]="directModel.accountHolderName"
                    placeholder="e.g. First Last"
                  />
                </div>
              </div>

              <div class="form-row-dual">
                <div class="form-group">
                  <label class="form-label">Sort Code (6 Digits)</label>
                  <input
                    type="text"
                    class="form-control"
                    [(ngModel)]="directModel.sortCode"
                    placeholder="e.g. 20-00-00"
                    maxlength="8"
                  />
                </div>
                <div class="form-group">
                  <label class="form-label">Account Number (8 Digits)</label>
                  <input
                    type="text"
                    class="form-control"
                    [(ngModel)]="directModel.accountNumber"
                    placeholder="e.g. 12345678"
                    maxlength="10"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Bottom Action Bar -->
          <div class="bottom-action-bar">
            <div class="action-info">
              <span class="material-symbols-outlined text-blue">info</span>
              <span>All 5 sections will be stored and a welcome email dispatched to the member.</span>
            </div>
            <div class="action-buttons">
              <a routerLink="/workforce/console/analytics" class="btn btn-outline">Cancel</a>
              <button
                type="button"
                class="btn btn-primary"
                (click)="submitDirectEnroll()"
                [disabled]="isSubmitting"
              >
                <span class="material-symbols-outlined" *ngIf="!isSubmitting">how_to_reg</span>
                <span class="material-symbols-outlined spin" *ngIf="isSubmitting">sync</span>
                <span>{{ isSubmitting ? 'Enrolling...' : 'Enroll & Create Account' }}</span>
              </button>
            </div>
          </div>
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
      max-width: 1200px;
      margin: 0 auto;
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

    /* Dual Tab Bar */
    .enroll-tabs-bar {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .enroll-tab {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 16px 20px;
      background: #ffffff;
      border: 2px solid #e2e8f0;
      border-radius: 14px;
      cursor: pointer;
      transition: all 0.2s ease;
      text-align: left;
    }
    .enroll-tab:hover {
      border-color: #cbd5e1;
      background: #f8fafc;
    }
    .enroll-tab.active {
      border-color: #0050e5;
      background: #f0f6ff;
      box-shadow: 0 4px 15px rgba(0, 80, 229, 0.08);
    }
    .enroll-tab .material-symbols-outlined {
      font-size: 28px;
      color: #64748b;
    }
    .enroll-tab.active .material-symbols-outlined {
      color: #0050e5;
    }
    .tab-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .tab-text strong {
      font-size: 14.5px;
      color: #0f172a;
    }
    .enroll-tab.active .tab-text strong {
      color: #0050e5;
    }
    .tab-text small {
      font-size: 12px;
      color: #64748b;
    }

    /* Tab Content Layouts */
    .invite-form-grid {
      display: grid;
      grid-template-columns: 1.1fr 1fr;
      gap: 24px;
      align-items: start;
    }
    .direct-enroll-layout {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    /* CMS Card */
    .cms-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 15px rgba(0,0,0,0.02);
    }
    .card-header {
      padding: 18px 22px;
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
      padding: 22px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    /* Form Fields */
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .form-row-dual {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }
    .form-row-triple {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 12px;
    }
    .form-label {
      font-size: 13px;
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
    .field-hint {
      font-size: 11.5px;
      color: #64748b;
    }
    .checkbox-label {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 600;
      color: #334155;
      cursor: pointer;
    }

    /* Checklist Items (Tab 1) */
    .requirement-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      transition: background 0.15s;
    }
    .requirement-item:hover {
      background: #f1f5f9;
    }
    .req-checkbox {
      margin-top: 2px;
    }
    .req-label {
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .req-label strong {
      font-size: 13px;
      color: #0f172a;
    }
    .req-label p {
      font-size: 11.5px;
      color: #64748b;
      margin: 0;
      line-height: 1.35;
    }

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

    .card-actions-row {
      margin-top: 8px;
    }

    /* Bottom Action Bar */
    .bottom-action-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 16px 22px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.02);
      flex-wrap: wrap;
      gap: 12px;
    }
    .action-info {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #64748b;
    }
    .action-info .material-symbols-outlined {
      font-size: 18px;
    }
    .action-buttons {
      display: flex;
      align-items: center;
      gap: 12px;
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

    /* Text Colors */
    .text-blue { color: #0050e5; }
    .text-purple { color: #7c3aed; }
    .text-green { color: #16a34a; }
    .text-orange { color: #d97706; }

    .spin {
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    /* Responsive */
    @media (max-width: 900px) {
      .enroll-tabs-bar {
        grid-template-columns: 1fr;
      }
      .invite-form-grid {
        grid-template-columns: 1fr;
      }
      .form-row-dual, .form-row-triple {
        grid-template-columns: 1fr;
      }
      .bottom-action-bar {
        flex-direction: column;
        align-items: stretch;
      }
      .action-buttons {
        justify-content: flex-end;
      }
    }
  `]
})
export class WorkforceEnrollComponent implements OnInit {
  activeTab: 'invite' | 'direct' = 'invite';
  isSubmitting = false;
  currencySymbol = '₦';
  staffTypes: any[] = [];
  jobRoles: any[] = [];
  documentCategories: any[] = [];

  fallbackJobRoles = [
    { title: 'Operations Supervisor', code: 'OPS' },
    { title: 'Shift Specialist', code: 'SPEC' },
    { title: 'General Staff Member', code: 'STAFF' }
  ];

  fallbackCategories = [
    { name: 'Professional License / Registration', code: 'LIC' },
    { name: 'Right to Work / Passport', code: 'RTW' },
    { name: 'Background Check / DBS', code: 'DBS' },
    { name: 'Training & Certifications', code: 'TRN' }
  ];

  inviteModel = {
    fullName: '',
    email: '',
    jobTitle: 'Operations Supervisor',
    staffTypeId: '',
    staffTypeName: 'Permanent',
    defaultHourlyRate: 15.0,
    contractedWeeklyHours: 40,
    welcomeNote: '',
    requireSiaLicense: true,
    requireEmergencyContact: true,
    requireBankDetails: true,
    requireRightToWork: false,
    requireProofOfAddress: false
  };

  directModel = {
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    password: '',
    mustChangePassword: true,
    jobTitle: 'Operations Supervisor',
    staffTypeId: '',
    staffTypeName: 'Permanent',
    defaultHourlyRate: 15.0,
    contractedWeeklyHours: 40,
    nationalInsuranceNumber: '',
    siaLicenseNumber: '',
    siaLicenseSector: 'Professional License / Registration',
    siaLicenseExpiryDate: '',
    emergencyContactName: '',
    emergencyContactRelationship: '',
    emergencyContactPhone: '',
    bankName: '',
    accountHolderName: '',
    sortCode: '',
    accountNumber: ''
  };

  constructor(
    private readonly workforceService: WorkforceService,
    private readonly toast: ToastService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
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
        if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
          this.jobRoles = res.data;
          this.inviteModel.jobTitle = this.jobRoles[0].title;
          this.directModel.jobTitle = this.jobRoles[0].title;
          if (this.jobRoles[0].defaultHourlyRate) {
            this.inviteModel.defaultHourlyRate = this.jobRoles[0].defaultHourlyRate;
            this.directModel.defaultHourlyRate = this.jobRoles[0].defaultHourlyRate;
          }
        }
      },
      error: () => {}
    });

    this.workforceService.getDocumentCategories().subscribe({
      next: (res: any) => {
        if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
          this.documentCategories = res.data;
          const expCat = this.documentCategories.find((c: any) => c.requiresExpiryDate) || this.documentCategories[0];
          this.directModel.siaLicenseSector = expCat.name;
        }
      },
      error: () => {}
    });

    this.workforceService.getStaffTypes().subscribe({
      next: (res: any) => {
        this.staffTypes = res?.data || [];
        const defaultType = this.staffTypes.find(t => t.code === 'permanent') || this.staffTypes[0];
        if (defaultType) {
          if (!this.inviteModel.staffTypeId) {
            this.inviteModel.staffTypeId = defaultType.id;
            this.inviteModel.staffTypeName = defaultType.name;
            this.inviteModel.contractedWeeklyHours = defaultType.defaultContractedHours;
          }
          if (!this.directModel.staffTypeId) {
            this.directModel.staffTypeId = defaultType.id;
            this.directModel.staffTypeName = defaultType.name;
            this.directModel.contractedWeeklyHours = defaultType.defaultContractedHours;
          }
        }
      },
      error: () => {}
    });
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
    if (!this.inviteModel.fullName?.trim() || !this.inviteModel.email?.trim()) {
      this.toast.warning('Full Name and Email Address are mandatory.');
      return;
    }

    this.isSubmitting = true;
    this.workforceService.inviteMember(this.inviteModel).subscribe({
      next: (res: any) => {
        this.isSubmitting = false;
        this.toast.success(`Invitation successfully dispatched to ${this.inviteModel.email}.`);
        this.router.navigate(['/workforce/console/analytics']);
      },
      error: (err: any) => {
        this.isSubmitting = false;
        this.toast.error(err?.error?.message || 'Failed to dispatch invitation.');
      }
    });
  }

  submitDirectEnroll(): void {
    if (!this.directModel.firstName?.trim() || !this.directModel.lastName?.trim() || !this.directModel.email?.trim()) {
      this.toast.warning('First Name, Last Name, and Email Address are mandatory.');
      return;
    }

    if (!this.directModel.defaultHourlyRate || this.directModel.defaultHourlyRate <= 0) {
      this.toast.warning('Please specify a valid default hourly rate.');
      return;
    }

    this.isSubmitting = true;
    this.workforceService.directEnrollMember(this.directModel).subscribe({
      next: (res: any) => {
        this.isSubmitting = false;
        this.toast.success('Staff member successfully enrolled into workforce system.');
        this.router.navigate(['/workforce/console/analytics']);
      },
      error: (err: any) => {
        this.isSubmitting = false;
        this.toast.error(err?.error?.message || 'Failed to enroll member.');
      }
    });
  }
}
