import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { WorkforceService } from '../../../core/services/workforce.service';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { PhoneInputComponent } from '../../../shared/components/phone-input/phone-input.component';

/**
 * In-House Full Staff Registration Component (`/workforce/console/staff/create`).
 * Enables administrators to register a staff member completely in-house—including
 * personal identity, workforce contract classification, and all custom onboarding form fields—
 * without requiring a password or CAPTCHA, and even when the public Registration Form is disabled.
 * Upon creation, the staff member receives a branded email guiding them to reset/set their password and sign in.
 */
@Component({
  selector: 'app-workforce-staff-create',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PhoneInputComponent],
  template: `
    <div class="bcp-page-container">
      <!-- 1. Page Header -->
      <div class="page-header">
        <div class="header-left">
          <div class="breadcrumb">
            <a routerLink="/admin/dashboard">Command Center</a>
            <span class="sep">/</span>
            <span>Staff Rota &amp; Shifts</span>
            <span class="sep">/</span>
            <a routerLink="/workforce/console/staff">Staff Manager</a>
            <span class="sep">/</span>
            <span class="current">Full Staff Registration</span>
          </div>
          <div class="title-row">
            <h1>Full Staff Registration (In-House)</h1>
            <span class="badge-suite">Suite: Workforce &amp; Shifts</span>
          </div>
          <p class="subtitle">
            Complete the staff member's registration in-house. No password or CAPTCHA is required—the staff member will receive an email to set their password and log in.
          </p>
        </div>
        <div class="header-actions">
          <a routerLink="/workforce/console/enroll" class="btn btn-outline">
            <span class="material-symbols-outlined">mail</span>
            <span>Switch to Invitation Link</span>
          </a>
          <a routerLink="/workforce/console/staff" class="btn btn-outline">
            <span class="material-symbols-outlined">arrow_back</span>
            <span>Back to Staff Manager</span>
          </a>
        </div>
      </div>

      <!-- 2. Info Banner -->
      <div class="inhouse-info-banner">
        <span class="material-symbols-outlined">verified_user</span>
        <div class="banner-content">
          <strong>In-House Admin Registration (Works Even When Public Form is Disabled):</strong>
          Fill out the staff member's personal, contract, and onboarding questions below. Upon saving, their account is provisioned immediately and an automated email is dispatched instructing them to set their password via the Forgot Password portal.
        </div>
      </div>

      <!-- 3. Registration Form Grid -->
      <div class="form-grid-2">
        <!-- Card 1: Personal & Account Credentials (No Password / No Captcha) -->
        <div class="cms-card">
          <div class="card-header">
            <div class="card-title-group">
              <span class="material-symbols-outlined text-blue">badge</span>
              <div>
                <h3>1. Personal &amp; Contact Information</h3>
                <p class="card-subtitle">Primary identity and login email for the staff member.</p>
              </div>
            </div>
          </div>

          <div class="card-body">
            <div class="field-row-2">
              <div class="form-group">
                <label class="form-label">First Name <span class="required">*</span></label>
                <input
                  type="text"
                  class="form-control"
                  [(ngModel)]="model.firstName"
                  placeholder="e.g. First"
                />
              </div>

              <div class="form-group">
                <label class="form-label">Last Name <span class="required">*</span></label>
                <input
                  type="text"
                  class="form-control"
                  [(ngModel)]="model.lastName"
                  placeholder="e.g. Last"
                />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Email Address (Login Username) <span class="required">*</span></label>
              <input
                type="email"
                class="form-control"
                [(ngModel)]="model.email"
                placeholder="name@company.com"
              />
            </div>

            <div class="form-group">
              <label class="form-label">Phone Number <span class="required">*</span></label>
              <app-phone-input [(phoneNumber)]="model.phoneNumber"></app-phone-input>
            </div>

            <div class="form-group" *ngIf="categories.length > 0 && isCoreFieldPublished('category')">
              <label class="form-label">Member Category / Tier</label>
              <select class="form-control" [(ngModel)]="selectedCategoryId">
                <option [ngValue]="null">Standard Member</option>
                <option *ngFor="let cat of categories" [value]="cat.id">{{ cat.name }}</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Card 2: Workforce Contract & Shift Assignment -->
        <div class="cms-card">
          <div class="card-header">
            <div class="card-title-group">
              <span class="material-symbols-outlined text-blue">work</span>
              <div>
                <h3>2. Workforce Role &amp; Contract Terms</h3>
                <p class="card-subtitle">Job designation, pay rate, contracted hours, and shift availability.</p>
              </div>
            </div>
          </div>

          <div class="card-body">
            <div class="field-row-2">
              <!-- Designated Job Title -->
              <div class="form-group">
                <div class="label-with-action">
                  <label class="form-label">Designated Job Title</label>
                  <button type="button" class="btn-inline-add" (click)="showQuickAddRole = !showQuickAddRole">
                    {{ showQuickAddRole ? 'Cancel' : '+ Add Job Title' }}
                  </button>
                </div>
                <select
                  *ngIf="!showQuickAddRole"
                  class="form-control"
                  [(ngModel)]="model.jobTitle"
                  (ngModelChange)="onJobRoleSelected($event)"
                >
                  <option value="">-- Select Job Title --</option>
                  <option *ngFor="let r of jobRoles" [value]="r.name">{{ r.name }}</option>
                </select>
                <div *ngIf="showQuickAddRole" class="inline-create-box">
                  <input type="text" class="form-control" [(ngModel)]="newRoleName" placeholder="e.g. Static Security Guard" />
                  <button type="button" class="btn btn-primary btn-sm" (click)="quickCreateJobRole()" [disabled]="isCreatingRole">
                    {{ isCreatingRole ? 'Saving...' : 'Save' }}
                  </button>
                </div>
              </div>

              <!-- Staff Classification Type -->
              <div class="form-group">
                <div class="label-with-action">
                  <label class="form-label">Staff Classification Type</label>
                  <button type="button" class="btn-inline-add" (click)="showQuickAddType = !showQuickAddType">
                    {{ showQuickAddType ? 'Cancel' : '+ Add Staff Type' }}
                  </button>
                </div>
                <select
                  *ngIf="!showQuickAddType"
                  class="form-control"
                  [(ngModel)]="model.staffTypeId"
                  (ngModelChange)="onStaffTypeSelected($event)"
                >
                  <option value="">-- Select Staff Type --</option>
                  <option *ngFor="let t of staffTypes" [value]="t.id">{{ t.name }}</option>
                </select>
                <div *ngIf="showQuickAddType" class="inline-create-box">
                  <input type="text" class="form-control" [(ngModel)]="newTypeName" placeholder="e.g. Full-Time Permanent" />
                  <button type="button" class="btn btn-primary btn-sm" (click)="quickCreateStaffType()" [disabled]="isCreatingType">
                    {{ isCreatingType ? 'Saving...' : 'Save' }}
                  </button>
                </div>
              </div>
            </div>

            <div class="field-row-2">
              <div class="form-group">
                <label class="form-label">Default Hourly Rate ({{ currencySymbol }})</label>
                <input type="number" class="form-control" [(ngModel)]="model.defaultHourlyRate" min="0" step="0.5" />
              </div>

              <div class="form-group">
                <label class="form-label">Contracted Hours / Week</label>
                <input type="number" class="form-control" [(ngModel)]="model.contractedWeeklyHours" min="0" step="1" />
              </div>
            </div>

            <div class="field-row-2">
              <div class="form-group">
                <label class="form-label">Preferred Working Time</label>
                <select class="form-control" [(ngModel)]="model.preferredWorkingTime">
                  <option value="Any">Any Shift (Day &amp; Night)</option>
                  <option value="Day">Day Shift Only</option>
                  <option value="Night">Night Shift Only</option>
                  <option value="Weekend">Weekends Only</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Working Availability</label>
                <select class="form-control" [(ngModel)]="model.workingAvailability">
                  <option value="Available">Available (Full Availability)</option>
                  <option value="Partial">Partial Availability</option>
                  <option value="Unavailable">Unavailable / On Leave</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 4. Card 3: Custom Registration Form Questions (If any configured in Form Builder) -->
      <div class="cms-card" *ngIf="filteredFields.length > 0">
        <div class="card-header">
          <div class="card-title-group">
            <span class="material-symbols-outlined text-blue">assignment</span>
            <div>
              <h3>3. Onboarding &amp; Compliance Form Questions</h3>
              <p class="card-subtitle">Complete your organization's custom registration form fields on behalf of the staff member.</p>
            </div>
          </div>
        </div>

        <div class="card-body">
          <div class="custom-fields-grid">
            <div *ngFor="let f of filteredFields" class="form-group">
              <label class="form-label">
                {{ f.label }}
                <span *ngIf="f.isRequired" class="required">*</span>
              </label>

              <input
                *ngIf="f.fieldType === 'text' || f.fieldType === 'number' || f.fieldType === 'email' || f.fieldType === 'phone'"
                [type]="f.fieldType === 'number' ? 'number' : 'text'"
                class="form-control"
                [(ngModel)]="customAttributes[f.fieldKey]"
                [placeholder]="f.placeholder || 'e.g. Enter details'"
              />

              <select
                *ngIf="f.fieldType === 'select'"
                class="form-control"
                [(ngModel)]="customAttributes[f.fieldKey]"
              >
                <option value="">{{ f.placeholder || '-- Select Option --' }}</option>
                <option *ngFor="let opt of f.options" [value]="opt">{{ opt }}</option>
              </select>

              <textarea
                *ngIf="f.fieldType === 'textarea'"
                class="form-control"
                rows="2"
                [(ngModel)]="customAttributes[f.fieldKey]"
                [placeholder]="f.placeholder || 'e.g. Enter details'"
              ></textarea>

              <input
                *ngIf="f.fieldType === 'date'"
                type="date"
                class="form-control"
                [(ngModel)]="customAttributes[f.fieldKey]"
              />

              <label *ngIf="f.fieldType === 'checkbox'" class="checkbox-inline">
                <input type="checkbox" [(ngModel)]="customAttributes[f.fieldKey]" />
                <span>{{ f.placeholder || f.label }}</span>
              </label>

              <span class="field-hint" *ngIf="f.helpText">{{ f.helpText }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 5. Submit Footer Bar -->
      <div class="submit-footer-card">
        <div class="footer-note">
          <span class="material-symbols-outlined text-green">mark_email_read</span>
          <span>
            Upon submission, an automated welcome email will be sent to <strong>{{ model.email || 'the staff member' }}</strong> with instructions to reset their password and log in.
          </span>
        </div>
        <div class="footer-actions">
          <a routerLink="/workforce/console/staff" class="btn btn-outline">Cancel</a>
          <button
            type="button"
            class="btn btn-primary btn-lg"
            [disabled]="isSubmitting"
            (click)="submitRegistration()"
          >
            <span class="material-symbols-outlined" *ngIf="!isSubmitting">how_to_reg</span>
            <span class="material-symbols-outlined spin" *ngIf="isSubmitting">sync</span>
            <span>{{ isSubmitting ? 'Registering Staff & Sending Email...' : 'Register Staff & Send Password Reset Email' }}</span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .bcp-page-container { display: flex; flex-direction: column; gap: 20px; padding: 0 4px 40px 4px; width: 100%; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
    .header-left { display: flex; flex-direction: column; gap: 6px; }
    .breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #64748b; }
    .breadcrumb a { color: #0050e5; text-decoration: none; font-weight: 500; }
    .breadcrumb .current { color: #0f172a; font-weight: 600; }
    .title-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .title-row h1 { margin: 0; font-size: 24px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; }
    .subtitle { margin: 0; font-size: 13.5px; color: #64748b; }
    .badge-suite { background: #eff6ff; color: #0050e5; border: 1px solid #bfdbfe; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 999px; text-transform: uppercase; }
    .header-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

    .inhouse-info-banner { display: flex; align-items: center; gap: 14px; background: #eff6ff; border: 1px solid #bfdbfe; color: #1e3a8a; padding: 14px 18px; border-radius: 12px; font-size: 13.5px; line-height: 1.5; }
    .inhouse-info-banner .material-symbols-outlined { font-size: 24px; color: #0050e5; flex-shrink: 0; }

    .form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: start; }
    @media (max-width: 960px) { .form-grid-2 { grid-template-columns: 1fr; } }

    .cms-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
    .card-header { padding: 18px 22px; border-bottom: 1px solid #f1f5f9; background: #fafbfc; display: flex; align-items: center; justify-content: space-between; }
    .card-title-group { display: flex; align-items: center; gap: 12px; }
    .card-title-group h3 { margin: 0; font-size: 15.5px; font-weight: 700; color: #0f172a; }
    .card-subtitle { margin: 2px 0 0; font-size: 12px; color: #64748b; }
    .card-body { padding: 22px; display: flex; flex-direction: column; gap: 16px; }

    .field-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    @media (max-width: 640px) { .field-row-2 { grid-template-columns: 1fr; } }

    .custom-fields-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }

    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-label { font-size: 12px; font-weight: 700; color: #334155; }
    .required { color: #dc2626; margin-left: 2px; }
    .form-control { height: 42px; padding: 0 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13.5px; color: #0f172a; background: #ffffff; outline: none; transition: border-color 0.15s ease; width: 100%; box-sizing: border-box; }
    textarea.form-control { height: auto; padding: 10px 12px; }
    .form-control:focus { border-color: #0050e5; box-shadow: 0 0 0 3px rgba(0,80,229,0.1); }
    .field-hint { font-size: 11.5px; color: #64748b; }

    .label-with-action { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .btn-inline-add { background: none; border: none; color: #0050e5; font-size: 11.5px; font-weight: 700; cursor: pointer; padding: 0; }
    .btn-inline-add:hover { text-decoration: underline; }
    .inline-create-box { display: flex; align-items: center; gap: 8px; }

    .checkbox-inline { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #1e293b; cursor: pointer; margin-top: 6px; }

    .submit-footer-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px 22px; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
    .footer-note { display: flex; align-items: center; gap: 10px; font-size: 13px; color: #334155; flex: 1 1 320px; }
    .footer-actions { display: flex; align-items: center; gap: 12px; }

    .btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; text-decoration: none; border: 1px solid transparent; transition: all 0.15s ease; }
    .btn-primary { background: #0050e5; color: #ffffff; }
    .btn-primary:hover { background: #003bb5; }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-outline { background: #ffffff; color: #334155; border-color: #cbd5e1; }
    .btn-outline:hover { background: #f8fafc; }
    .btn-sm { padding: 8px 12px; font-size: 12px; height: 42px; }
    .btn-lg { padding: 11px 22px; font-size: 14px; }

    .text-blue { color: #0050e5; }
    .text-green { color: #16a34a; }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { 100% { transform: rotate(360deg); } }
  `]
})
export class WorkforceStaffCreateComponent implements OnInit {
  currencySymbol = '£';
  jobRoles: any[] = [];
  staffTypes: any[] = [];
  fields: any[] = [];
  categories: any[] = [];
  unpublishedCoreFields: string[] = [];
  deletedCoreFields: string[] = [];
  selectedCategoryId: string | null = null;
  customAttributes: Record<string, any> = {};

  showQuickAddRole = false;
  newRoleName = '';
  isCreatingRole = false;

  showQuickAddType = false;
  newTypeName = '';
  isCreatingType = false;

  isSubmitting = false;

  model = {
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    jobTitle: '',
    staffTypeId: '',
    staffTypeName: '',
    defaultHourlyRate: 0,
    contractedWeeklyHours: 40,
    preferredWorkingTime: 'Any',
    workingAvailability: 'Available'
  };

  constructor(
    private readonly workforceService: WorkforceService,
    private readonly api: ApiService,
    private readonly toast: ToastService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.loadLookups();
    this.loadRegistrationFields();
  }

  loadLookups(): void {
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

  loadRegistrationFields(): void {
    this.api.get<any>(`RegistrationFormApi/public-schema?t=${Date.now()}`).subscribe({
      next: (res: any) => {
        const schema = res?.data || res;
        if (schema) {
          this.unpublishedCoreFields = schema.unpublishedCoreFields || [];
          this.deletedCoreFields = schema.deletedCoreFields || [];
          this.categories = schema.categories || [];
          const rawFields: any[] = schema.fields || [];
          this.fields = rawFields.filter(f => f.isActive !== false);
        }
      },
      error: () => {}
    });
  }

  isCoreFieldPublished(key: string): boolean {
    const unpublished = Array.isArray(this.unpublishedCoreFields) && this.unpublishedCoreFields.includes(key);
    const deleted = Array.isArray(this.deletedCoreFields) && this.deletedCoreFields.includes(key);
    return !unpublished && !deleted;
  }

  get filteredFields(): any[] {
    return this.fields.filter(f => {
      if (!f.bcpUserCategoryId) return true;
      return f.bcpUserCategoryId === this.selectedCategoryId;
    });
  }

  onJobRoleSelected(roleName: string): void {
    const found = this.jobRoles.find(r => r.name === roleName);
    if (found && found.defaultHourlyRate !== undefined) {
      this.model.defaultHourlyRate = found.defaultHourlyRate;
    }
  }

  onStaffTypeSelected(typeId: string): void {
    const found = this.staffTypes.find(t => t.id === typeId);
    if (found) {
      this.model.staffTypeName = found.name;
      if (found.defaultContractedHours !== undefined) {
        this.model.contractedWeeklyHours = found.defaultContractedHours;
      }
    }
  }

  quickCreateJobRole(): void {
    const name = this.newRoleName.trim();
    if (!name) return;
    this.isCreatingRole = true;
    this.workforceService.createJobRole({ name, defaultHourlyRate: this.model.defaultHourlyRate || 0, isActive: true }).subscribe({
      next: (res: any) => {
        this.isCreatingRole = false;
        const created = res?.data || { name };
        this.jobRoles.push(created);
        this.model.jobTitle = created.name || name;
        this.newRoleName = '';
        this.showQuickAddRole = false;
        this.toast.success(`Job title "${name}" added.`);
      },
      error: () => {
        this.isCreatingRole = false;
        this.toast.error('Could not create job title.');
      }
    });
  }

  quickCreateStaffType(): void {
    const name = this.newTypeName.trim();
    if (!name) return;
    this.isCreatingType = true;
    this.workforceService.createStaffType({ name, defaultContractedHours: this.model.contractedWeeklyHours || 40 }).subscribe({
      next: (res: any) => {
        this.isCreatingType = false;
        const created = res?.data;
        if (created) {
          this.staffTypes.push(created);
          this.model.staffTypeId = created.id;
          this.model.staffTypeName = created.name;
        }
        this.newTypeName = '';
        this.showQuickAddType = false;
        this.toast.success(`Staff classification "${name}" added.`);
      },
      error: () => {
        this.isCreatingType = false;
        this.toast.error('Could not create staff classification.');
      }
    });
  }

  submitRegistration(): void {
    if (!this.model.firstName.trim() || !this.model.lastName.trim()) {
      this.toast.warning('First Name and Last Name are required.');
      return;
    }
    if (!this.model.email.trim()) {
      this.toast.warning('Email Address is required.');
      return;
    }
    if (!this.model.phoneNumber.trim()) {
      this.toast.warning('Phone Number is required.');
      return;
    }

    // Validate required custom fields
    for (const f of this.filteredFields) {
      if (f.isRequired) {
        const val = this.customAttributes[f.fieldKey];
        if (val === undefined || val === null || String(val).trim() === '') {
          this.toast.warning(`Please fill out the required field: "${f.label}".`);
          return;
        }
      }
    }

    this.isSubmitting = true;
    const payload = {
      firstName: this.model.firstName.trim(),
      lastName: this.model.lastName.trim(),
      email: this.model.email.trim(),
      phoneNumber: this.model.phoneNumber.trim(),
      jobTitle: this.model.jobTitle || 'Staff Member',
      staffTypeId: this.model.staffTypeId || null,
      staffTypeName: this.model.staffTypeName || 'Permanent',
      defaultHourlyRate: this.model.defaultHourlyRate || 0,
      contractedWeeklyHours: this.model.contractedWeeklyHours || 0,
      preferredWorkingTime: this.model.preferredWorkingTime || 'Any',
      workingAvailability: this.model.workingAvailability || 'Available',
      mustChangePassword: true,
      customAttributes: this.customAttributes
    };

    this.workforceService.directEnrollMember(payload).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.toast.success(`Staff account created for ${payload.firstName} ${payload.lastName}. A password setup email has been dispatched.`);
        this.router.navigate(['/workforce/console/staff']);
      },
      error: (err: any) => {
        this.isSubmitting = false;
        this.toast.error(err?.error?.message || 'Failed to register staff member.');
      }
    });
  }
}
