import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { WorkforceService } from '../../../core/services/workforce.service';
import { ToastService } from '../../../core/services/toast.service';

/**
 * Public/Worker Self-Activation Landing Page Component.
 * Route: `/workforce/onboarding?token=...&email=...`
 * Validates the cryptographic token, allows the invited officer/staff member to set their password,
 * and submit mandatory SIA license, next of kin, and banking details.
 */
@Component({
  selector: 'app-workforce-onboarding',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="onboarding-viewport">
      <div class="onboarding-container">
        <!-- Brand / Header -->
        <div class="onboarding-header">
          <div class="brand-badge">
            <span class="material-symbols-outlined">shield_person</span>
            <span>Workforce Command Center</span>
          </div>
          <h1>Complete Your Staff Onboarding</h1>
          <p class="subtitle">
            Welcome to the team. Please verify your details, set your permanent password, and submit mandatory regulatory compliance information.
          </p>
        </div>

        <!-- Token Verifying State -->
        <div class="state-card" *ngIf="isVerifying">
          <span class="material-symbols-outlined spin">progress_activity</span>
          <p>Verifying your invitation token...</p>
        </div>

        <!-- Token Invalid State -->
        <div class="state-card error-card" *ngIf="!isVerifying && !tokenValid">
          <span class="material-symbols-outlined text-danger">gpp_bad</span>
          <h3>Invitation Link Expired or Invalid</h3>
          <p>{{ verificationError || 'This onboarding link is no longer valid or has expired after 7 days.' }}</p>
          <a routerLink="/auth/login" class="btn btn-outline" style="margin-top: 12px;">Go to Sign In</a>
        </div>

        <!-- Main Form (When Token is Valid) -->
        <form (ngSubmit)="submitOnboarding()" *ngIf="!isVerifying && tokenValid" class="onboarding-form">
          <!-- Step 1: Security & Password Setup -->
          <div class="form-section-card">
            <div class="section-title">
              <span class="material-symbols-outlined text-blue">lock</span>
              <div>
                <h3>1. Account Password</h3>
                <p>Create a secure password to access your rota schedules, confirm shifts, and clock in.</p>
              </div>
            </div>

            <div class="form-row-dual">
              <div class="form-group">
                <label class="form-label">Email Address (Invited)</label>
                <input
                  type="email"
                  class="form-control"
                  [value]="onboardingModel.email"
                  disabled
                />
              </div>

              <div class="form-group">
                <label class="form-label">Phone Number <span class="required">*</span></label>
                <input
                  type="tel"
                  class="form-control"
                  [(ngModel)]="onboardingModel.phoneNumber"
                  name="phoneNumber"
                  placeholder="e.g. +44 20 7946 0000"
                  required
                />
              </div>
            </div>

            <div class="form-row-dual">
              <div class="form-group">
                <label class="form-label">Set Permanent Password <span class="required">*</span></label>
                <input
                  type="password"
                  class="form-control"
                  [(ngModel)]="onboardingModel.password"
                  name="password"
                  placeholder="Minimum 6 characters"
                  required
                />
              </div>

              <div class="form-group">
                <label class="form-label">Confirm Password <span class="required">*</span></label>
                <input
                  type="password"
                  class="form-control"
                  [(ngModel)]="confirmPassword"
                  name="confirmPassword"
                  placeholder="Re-enter password"
                  required
                />
              </div>
            </div>
          </div>

          <!-- Step 2: Personal Identity -->
          <div class="form-section-card">
            <div class="section-title">
              <span class="material-symbols-outlined text-blue">badge</span>
              <div>
                <h3>2. Full Legal Name</h3>
                <p>Official name matching your photographic identification.</p>
              </div>
            </div>

            <div class="form-row-dual">
              <div class="form-group">
                <label class="form-label">First Name <span class="required">*</span></label>
                <input
                  type="text"
                  class="form-control"
                  [(ngModel)]="onboardingModel.firstName"
                  name="firstName"
                  placeholder="e.g. First Name"
                  required
                />
              </div>

              <div class="form-group">
                <label class="form-label">Last Name <span class="required">*</span></label>
                <input
                  type="text"
                  class="form-control"
                  [(ngModel)]="onboardingModel.lastName"
                  name="lastName"
                  placeholder="e.g. Last Name"
                  required
                />
              </div>
            </div>
          </div>

          <!-- Step 3: SIA License & Regulatory Compliance -->
          <div class="form-section-card">
            <div class="section-title">
              <span class="material-symbols-outlined text-purple">verified_user</span>
              <div>
                <h3>3. SIA License &amp; Security Badge</h3>
                <p>Official Security Industry Authority licensing details for regulatory shift dispatch.</p>
              </div>
            </div>

            <div class="form-row-triple">
              <div class="form-group">
                <label class="form-label">SIA License Number (16 Digits) <span class="required">*</span></label>
                <input
                  type="text"
                  class="form-control"
                  [(ngModel)]="onboardingModel.siaLicenseNumber"
                  name="siaLicenseNumber"
                  placeholder="e.g. 1000200030004000"
                  maxlength="16"
                  required
                />
              </div>

              <div class="form-group">
                <label class="form-label">License Sector <span class="required">*</span></label>
                <select class="form-control" [(ngModel)]="onboardingModel.siaLicenseSector" name="siaLicenseSector" required>
                  <option value="Door Supervision">Door Supervision</option>
                  <option value="Security Guarding">Security Guarding</option>
                  <option value="CCTV (Public Space Surveillance)">CCTV (Public Space Surveillance)</option>
                  <option value="Close Protection">Close Protection</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">License Expiry Date <span class="required">*</span></label>
                <input
                  type="date"
                  class="form-control"
                  [(ngModel)]="onboardingModel.siaLicenseExpiryDate"
                  name="siaLicenseExpiryDate"
                  required
                />
              </div>
            </div>
          </div>

          <!-- Step 4: Next of Kin / Emergency Contact -->
          <div class="form-section-card">
            <div class="section-title">
              <span class="material-symbols-outlined text-orange">emergency</span>
              <div>
                <h3>4. Emergency Contact / Next of Kin</h3>
                <p>Designated contact in the event of an operational duty emergency or incident.</p>
              </div>
            </div>

            <div class="form-row-triple">
              <div class="form-group">
                <label class="form-label">Contact Full Name <span class="required">*</span></label>
                <input
                  type="text"
                  class="form-control"
                  [(ngModel)]="onboardingModel.emergencyContactName"
                  name="emergencyContactName"
                  placeholder="e.g. First Last"
                  required
                />
              </div>

              <div class="form-group">
                <label class="form-label">Relationship <span class="required">*</span></label>
                <input
                  type="text"
                  class="form-control"
                  [(ngModel)]="onboardingModel.emergencyContactRelationship"
                  name="emergencyContactRelationship"
                  placeholder="e.g. Spouse / Parent / Sibling"
                  required
                />
              </div>

              <div class="form-group">
                <label class="form-label">Emergency Phone (24/7) <span class="required">*</span></label>
                <input
                  type="tel"
                  class="form-control"
                  [(ngModel)]="onboardingModel.emergencyContactPhone"
                  name="emergencyContactPhone"
                  placeholder="e.g. +44 20 7946 0000"
                  required
                />
              </div>
            </div>
          </div>

          <!-- Step 5: Payroll & Banking -->
          <div class="form-section-card">
            <div class="section-title">
              <span class="material-symbols-outlined text-green">account_balance</span>
              <div>
                <h3>5. Direct Deposit Banking &amp; Tax ID</h3>
                <p>Remittance details for bi-weekly / monthly rota wage disbursements.</p>
              </div>
            </div>

            <div class="form-row-dual">
              <div class="form-group">
                <label class="form-label">Bank Name <span class="required">*</span></label>
                <input
                  type="text"
                  class="form-control"
                  [(ngModel)]="onboardingModel.bankName"
                  name="bankName"
                  placeholder="e.g. Bank Name"
                  required
                />
              </div>

              <div class="form-group">
                <label class="form-label">Account Holder Name <span class="required">*</span></label>
                <input
                  type="text"
                  class="form-control"
                  [(ngModel)]="onboardingModel.accountHolderName"
                  name="accountHolderName"
                  placeholder="e.g. First Last"
                  required
                />
              </div>
            </div>

            <div class="form-row-triple">
              <div class="form-group">
                <label class="form-label">Sort Code (6 Digits) <span class="required">*</span></label>
                <input
                  type="text"
                  class="form-control"
                  [(ngModel)]="onboardingModel.sortCode"
                  name="sortCode"
                  placeholder="e.g. 20-00-00"
                  maxlength="8"
                  required
                />
              </div>

              <div class="form-group">
                <label class="form-label">Account Number (8 Digits) <span class="required">*</span></label>
                <input
                  type="text"
                  class="form-control"
                  [(ngModel)]="onboardingModel.accountNumber"
                  name="accountNumber"
                  placeholder="e.g. 12345678"
                  maxlength="10"
                  required
                />
              </div>

              <div class="form-group">
                <label class="form-label">National Insurance Number</label>
                <input
                  type="text"
                  class="form-control"
                  [(ngModel)]="onboardingModel.nationalInsuranceNumber"
                  name="nationalInsuranceNumber"
                  placeholder="e.g. QQ123456C"
                />
              </div>
            </div>
          </div>

          <!-- Submit Action -->
          <div class="submit-action-card">
            <button
              type="submit"
              class="btn btn-primary btn-large full-width"
              [disabled]="isSubmitting"
            >
              <span class="material-symbols-outlined" *ngIf="!isSubmitting">check_circle</span>
              <span class="material-symbols-outlined spin" *ngIf="isSubmitting">sync</span>
              <span>{{ isSubmitting ? 'Activating Account...' : 'Complete Onboarding & Access Portal' }}</span>
            </button>
            <p class="disclaimer">
              By submitting, you confirm that the SIA license number, banking details, and personal records provided are accurate and authentic.
            </p>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .onboarding-viewport {
      min-height: 100vh;
      background: #f8fafc;
      padding: 40px 16px 80px 16px;
      display: flex;
      justify-content: center;
      font-family: inherit;
    }
    .onboarding-container {
      width: 100%;
      max-width: 860px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    /* Header */
    .onboarding-header {
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
    }
    .brand-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #0050e5;
      padding: 6px 14px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 700;
    }
    .brand-badge .material-symbols-outlined {
      font-size: 18px;
    }
    .onboarding-header h1 {
      font-size: 28px;
      font-weight: 900;
      color: #0f172a;
      margin: 0;
      letter-spacing: -0.02em;
    }
    .subtitle {
      font-size: 14px;
      color: #64748b;
      max-width: 620px;
      margin: 0;
      line-height: 1.5;
    }

    /* State Cards */
    .state-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 48px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      color: #64748b;
    }
    .error-card {
      border-color: #fecaca;
      background: #fff5f5;
    }
    .error-card h3 {
      color: #991b1b;
      margin: 0;
      font-size: 18px;
    }
    .error-card p {
      color: #b91c1c;
      margin: 0;
      font-size: 14px;
    }

    /* Form Section Cards */
    .onboarding-form {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .form-section-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.02);
    }
    .section-title {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding-bottom: 14px;
      border-bottom: 1px solid #f1f5f9;
    }
    .section-title .material-symbols-outlined {
      font-size: 24px;
      margin-top: 2px;
    }
    .section-title h3 {
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 2px 0;
    }
    .section-title p {
      font-size: 12px;
      color: #64748b;
      margin: 0;
    }

    /* Grid Form Controls */
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .form-row-dual {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .form-row-triple {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
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
    .form-control:disabled {
      background: #f1f5f9;
      color: #64748b;
      cursor: not-allowed;
    }

    /* Submit Action */
    .submit-action-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      align-items: center;
      text-align: center;
    }
    .btn-large {
      padding: 14px 28px;
      font-size: 15px;
    }
    .disclaimer {
      font-size: 11.5px;
      color: #64748b;
      margin: 0;
      max-width: 540px;
    }

    /* Buttons */
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
    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .full-width {
      width: 100%;
    }

    .text-blue { color: #0050e5; }
    .text-purple { color: #7c3aed; }
    .text-green { color: #16a34a; }
    .text-orange { color: #d97706; }
    .text-danger { color: #dc2626; }

    .spin {
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    @media (max-width: 768px) {
      .form-row-dual, .form-row-triple {
        grid-template-columns: 1fr;
      }
      .onboarding-viewport {
        padding: 20px 12px 60px 12px;
      }
    }
  `]
})
export class WorkforceOnboardingComponent implements OnInit {
  isVerifying = true;
  tokenValid = false;
  verificationError = '';
  isSubmitting = false;

  token = '';
  confirmPassword = '';

  onboardingModel = {
    token: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    jobTitle: 'SIA Door Supervisor',
    siaLicenseNumber: '',
    siaLicenseSector: 'Door Supervision',
    siaLicenseExpiryDate: '',
    emergencyContactName: '',
    emergencyContactRelationship: '',
    emergencyContactPhone: '',
    bankName: '',
    accountHolderName: '',
    sortCode: '',
    accountNumber: '',
    nationalInsuranceNumber: ''
  };

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly workforceService: WorkforceService,
    private readonly toast: ToastService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.token = params['token'] || '';
      const email = params['email'] || '';
      this.onboardingModel.token = this.token;
      this.onboardingModel.email = email;

      if (!this.token) {
        this.isVerifying = false;
        this.tokenValid = false;
        this.verificationError = 'Missing invitation token in the link.';
        return;
      }

      this.verifyToken();
    });
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
        } else {
          this.tokenValid = false;
          this.verificationError = res?.message || 'Invalid or expired token.';
        }
      },
      error: (err: any) => {
        this.isVerifying = false;
        this.tokenValid = false;
        this.verificationError = err?.error?.message || 'The invitation token could not be verified.';
      }
    });
  }

  submitOnboarding(): void {
    if (!this.onboardingModel.password || this.onboardingModel.password.length < 6) {
      this.toast.warning('Password must be at least 6 characters.');
      return;
    }

    if (this.onboardingModel.password !== this.confirmPassword) {
      this.toast.warning('Passwords do not match. Please re-enter.');
      return;
    }

    if (!this.onboardingModel.firstName?.trim() || !this.onboardingModel.lastName?.trim()) {
      this.toast.warning('First Name and Last Name are required.');
      return;
    }

    if (!this.onboardingModel.phoneNumber?.trim()) {
      this.toast.warning('Mobile Phone Number is required for duty dispatch.');
      return;
    }

    this.isSubmitting = true;
    this.workforceService.completeOnboarding(this.onboardingModel).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.toast.success('Your workforce account is activated! You may now sign in.');
        this.router.navigate(['/auth/login'], { queryParams: { email: this.onboardingModel.email } });
      },
      error: (err: any) => {
        this.isSubmitting = false;
        this.toast.error(err?.error?.message || 'Failed to complete onboarding.');
      }
    });
  }
}

