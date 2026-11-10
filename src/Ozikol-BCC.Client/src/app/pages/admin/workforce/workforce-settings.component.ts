import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { WorkforceService } from '../../../core/services/workforce.service';
import { ToastService } from '../../../core/services/toast.service';

interface StaffTypeItem {
  id: string;
  name: string;
  code: string;
  description: string;
  defaultContractedHours: number;
  isCompulsory: boolean;
  isActive: boolean;
  sortOrder: number;
  enrolledStaffCount: number;
}

interface DocumentCategoryItem {
  id: string;
  name: string;
  code: string;
  description?: string;
  isMandatory: boolean;
  requiresExpiryDate: boolean;
  isActive: boolean;
  sortOrder: number;
  uploadedDocumentsCount: number;
}

interface JobRoleItem {
  id: string;
  title: string;
  code: string;
  description?: string;
  defaultHourlyRate: number;
  billingChargeRate: number;
  mandatorySiaSector?: string;
  badgeColor?: string;
  isActive: boolean;
  sortOrder: number;
  assignedStaffCount: number;
}

interface WorkforcePolicies {
  id?: string;
  standardWeeklyHours: number;
  maxPermissibleWeeklyHours: number;
  maxConsecutiveWorkingDays: number;
  enforce48HourWeeklyCap: boolean;
  dayShiftStart: string;
  dayShiftEnd: string;
  nightShiftStart: string;
  nightShiftEnd: string;
  nightPremiumHourlyAllowance: number;
  enableNightPremium: boolean;
  breakMinutesFor6Hours: number;
  breakMinutesFor8Hours: number;
  breakMinutesFor12Hours: number;
  isBreakPaid: boolean;
  breakLoggingMode: string;
  requireUniformSizes: boolean;
  requireDrivingLicense: boolean;
  requireMedicalAllergies: boolean;
  requireDbsCriminalDisclosure: boolean;
  customOnboardingQuestionsJson?: string;
}

@Component({
  selector: 'app-workforce-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="settings-page">
      <!-- Breadcrumb Header -->
      <nav class="breadcrumb-nav">
        <span class="crumb-root">Command Center</span>
        <span class="crumb-sep">/</span>
        <span class="crumb-parent">Workforce &amp; Shifts</span>
        <span class="crumb-sep">/</span>
        <span class="crumb-active">Workforce &amp; Shift Settings Hub</span>
      </nav>

      <!-- Main Title Bar -->
      <div class="page-header">
        <div class="header-left">
          <div class="title-row">
            <h1 class="page-title">Workforce &amp; Shift Settings</h1>
            <button
              type="button"
              class="info-badge-btn"
              (click)="showInfoModal = true"
              title="Click to view explanation and policy rules"
            >
              <span class="material-symbols-outlined">info</span>
            </button>
            <span class="suite-pill">SUITE: WORKFORCE &amp; SHIFTS</span>
          </div>
          <p class="page-subtitle">
            Configure job roles, pay &amp; billing charge rates, day/night shift windows, break deduction policies, and custom onboarding questionnaires.
          </p>
        </div>
        <div class="header-actions">
          <button type="button" class="btn btn-outline" (click)="loadAllData()">
            <span class="material-symbols-outlined" [class.spin]="isLoading">refresh</span> Refresh
          </button>
          <button
            type="button"
            class="btn btn-primary"
            *ngIf="activeTab === 'roles'"
            (click)="openRoleModal()"
          >
            <span class="material-symbols-outlined">add</span> + Add Job Role
          </button>
          <button
            type="button"
            class="btn btn-primary"
            *ngIf="activeTab === 'staff-types'"
            (click)="openStaffTypeModal()"
          >
            <span class="material-symbols-outlined">add</span> + Add Staff Type
          </button>
          <button
            type="button"
            class="btn btn-primary"
            *ngIf="activeTab === 'documents'"
            (click)="openCategoryModal()"
          >
            <span class="material-symbols-outlined">add</span> + Add Document Category
          </button>
          <button
            type="button"
            class="btn btn-primary"
            *ngIf="activeTab === 'hours' || activeTab === 'breaks' || activeTab === 'forms'"
            (click)="savePolicies()"
            [disabled]="isSavingPolicies"
          >
            <span class="material-symbols-outlined" *ngIf="!isSavingPolicies">save</span>
            <span class="material-symbols-outlined spin" *ngIf="isSavingPolicies">sync</span>
            {{ isSavingPolicies ? 'Saving...' : 'Save Policies' }}
          </button>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="settings-tabs-bar">
        <button
          type="button"
          class="tab-btn"
          [class.active]="activeTab === 'roles'"
          (click)="activeTab = 'roles'"
        >
          <span class="material-symbols-outlined">badge</span>
          <span>Job Roles &amp; Pay Rates</span>
          <span class="tab-count">{{ jobRoles.length }}</span>
        </button>

        <button
          type="button"
          class="tab-btn"
          [class.active]="activeTab === 'hours'"
          (click)="activeTab = 'hours'"
        >
          <span class="material-symbols-outlined">schedule</span>
          <span>Working Hours &amp; Shift Windows</span>
        </button>

        <button
          type="button"
          class="tab-btn"
          [class.active]="activeTab === 'breaks'"
          (click)="activeTab = 'breaks'"
        >
          <span class="material-symbols-outlined">coffee</span>
          <span>Meal &amp; Rest Breaks</span>
        </button>

        <button
          type="button"
          class="tab-btn"
          [class.active]="activeTab === 'forms'"
          (click)="activeTab = 'forms'"
        >
          <span class="material-symbols-outlined">fact_check</span>
          <span>Custom Forms &amp; Onboarding</span>
        </button>

        <button
          type="button"
          class="tab-btn"
          [class.active]="activeTab === 'staff-types'"
          (click)="activeTab = 'staff-types'"
        >
          <span class="material-symbols-outlined">groups</span>
          <span>Staff Classifications</span>
          <span class="tab-count">{{ staffTypes.length }}</span>
        </button>

        <button
          type="button"
          class="tab-btn"
          [class.active]="activeTab === 'documents'"
          (click)="activeTab = 'documents'"
        >
          <span class="material-symbols-outlined">folder_shared</span>
          <span>Document Categories &amp; Credentials</span>
          <span class="tab-count">{{ documentCategories.length }}</span>
        </button>
      </div>

      <!-- ========================================================================= -->
      <!-- TAB 1: JOB ROLES & PAY RATES -->
      <!-- ========================================================================= -->
      <div class="tab-pane" *ngIf="activeTab === 'roles'">
        <!-- Metrics Grid -->
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="card-icon bg-blue">
              <span class="material-symbols-outlined">badge</span>
            </div>
            <div class="metric-body">
              <div class="metric-val">{{ jobRoles.length }}</div>
              <div class="metric-label">Operational Job Roles</div>
            </div>
          </div>

          <div class="metric-card">
            <div class="card-icon bg-emerald">
              <span class="material-symbols-outlined">payments</span>
            </div>
            <div class="metric-body">
              <div class="metric-val">{{ currencySymbol }}{{ averageHourlyWage | number:'1.2-2' }}</div>
              <div class="metric-label">Average Base Hourly Wage</div>
            </div>
          </div>

          <div class="metric-card">
            <div class="card-icon bg-purple">
              <span class="material-symbols-outlined">price_check</span>
            </div>
            <div class="metric-body">
              <div class="metric-val">{{ currencySymbol }}{{ averageChargeRate | number:'1.2-2' }}</div>
              <div class="metric-label">Average Client Billing Rate</div>
            </div>
          </div>
        </div>

        <div class="content-card">
          <div class="card-header-bar">
            <div class="header-bar-left">
              <span class="material-symbols-outlined text-blue">work</span>
              <div>
                <h3 class="card-heading">Configured Job Roles &amp; Charging Matrix</h3>
                <p class="card-sub">Roles dictate default wage disbursements, client billing charge rates, and required credential categories.</p>
              </div>
            </div>
            <button type="button" class="btn btn-primary btn-sm" (click)="openRoleModal()">
              <span class="material-symbols-outlined">add</span> + Add Role
            </button>
          </div>

          <div class="table-responsive">
            <table class="settings-table">
              <thead>
                <tr>
                  <th style="width: 50px;">Color</th>
                  <th>Role Title</th>
                  <th>Code</th>
                  <th>Base Wage Rate</th>
                  <th>Client Charge Rate</th>
                  <th>Required Qualification</th>
                  <th>Assigned Staff</th>
                  <th>Status</th>
                  <th style="text-align: right; width: 140px;">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let r of jobRoles">
                  <td>
                    <span class="color-dot" [style.backgroundColor]="r.badgeColor || '#0050E5'"></span>
                  </td>
                  <td>
                    <div class="title-cell">
                      <strong>{{ r.title }}</strong>
                      <span class="desc-muted" *ngIf="r.description">{{ r.description }}</span>
                    </div>
                  </td>
                  <td>
                    <span class="code-badge">{{ r.code }}</span>
                  </td>
                  <td>
                    <span class="wage-tag">{{ currencySymbol }}{{ r.defaultHourlyRate | number:'1.2-2' }}/hr</span>
                  </td>
                  <td>
                    <span class="charge-tag">{{ currencySymbol }}{{ r.billingChargeRate | number:'1.2-2' }}/hr</span>
                  </td>
                  <td>
                    <span class="sia-badge" [class.none]="!r.mandatorySiaSector || r.mandatorySiaSector === 'None'">
                      {{ r.mandatorySiaSector || 'None' }}
                    </span>
                  </td>
                  <td>
                    <span class="staff-count-pill">{{ r.assignedStaffCount }} staff</span>
                  </td>
                  <td>
                    <span class="status-pill active" *ngIf="r.isActive">Active</span>
                    <span class="status-pill disabled" *ngIf="!r.isActive">Inactive</span>
                  </td>
                  <td style="text-align: right;">
                    <button type="button" class="action-btn" (click)="editRole(r)" title="Edit Role">
                      <span class="material-symbols-outlined">edit</span>
                    </button>
                    <button type="button" class="action-btn text-danger" (click)="deleteRole(r)" title="Delete Role">
                      <span class="material-symbols-outlined">delete</span>
                    </button>
                  </td>
                </tr>
                <tr *ngIf="jobRoles.length === 0 && !isLoading">
                  <td colspan="9" class="empty-state">
                    No job roles configured yet. Click "+ Add Job Role" to create your first operational role.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ========================================================================= -->
      <!-- TAB 2: WORKING HOURS & SHIFT WINDOWS -->
      <!-- ========================================================================= -->
      <div class="tab-pane" *ngIf="activeTab === 'hours'">
        <div class="policy-grid">
          <!-- Standard Working Hours Card -->
          <div class="content-card">
            <div class="card-header-bar">
              <div class="header-bar-left">
                <span class="material-symbols-outlined text-blue">timer</span>
                <div>
                  <h3 class="card-heading">Standard Company Working Hours</h3>
                  <p class="card-sub">Baseline hours applied across the rota. Individual staff profiles can override this default.</p>
                </div>
              </div>
            </div>

            <div class="policy-form">
              <div class="form-row-dual">
                <div class="form-group">
                  <label class="form-label">Standard Full-Time Week (Hours) <span class="required">*</span></label>
                  <input
                    type="number"
                    class="form-control"
                    [(ngModel)]="policies.standardWeeklyHours"
                    name="standardWeeklyHours"
                    placeholder="e.g. 40"
                    min="1"
                    max="80"
                  />
                  <span class="field-hint">Default contracted target for full-time personnel (e.g. 37.5 or 40.0 hrs).</span>
                </div>

                <div class="form-group">
                  <label class="form-label">Max Permissible Weekly Hours <span class="required">*</span></label>
                  <input
                    type="number"
                    class="form-control"
                    [(ngModel)]="policies.maxPermissibleWeeklyHours"
                    name="maxPermissibleWeeklyHours"
                    placeholder="e.g. 48"
                    min="10"
                    max="100"
                  />
                  <span class="field-hint">Statutory ceiling (e.g. 48 hrs under UK Working Time Regulations).</span>
                </div>
              </div>

              <div class="form-row-dual">
                <div class="form-group">
                  <label class="form-label">Max Consecutive Working Days <span class="required">*</span></label>
                  <input
                    type="number"
                    class="form-control"
                    [(ngModel)]="policies.maxConsecutiveWorkingDays"
                    name="maxConsecutiveWorkingDays"
                    placeholder="e.g. 6"
                    min="1"
                    max="14"
                  />
                  <span class="field-hint">Triggers fatigue burnout warnings when auto-scheduling.</span>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Working Time Regulations Enforcement</label>
                <div class="toggle-card">
                  <label class="switch">
                    <input
                      type="checkbox"
                      [(ngModel)]="policies.enforce48HourWeeklyCap"
                      name="enforce48HourWeeklyCap"
                    />
                    <span class="slider round"></span>
                  </label>
                  <div class="toggle-info">
                    <strong>Enforce 48-Hour Weekly Cap</strong>
                    <span>Warn or block allocations exceeding 48h unless opt-out signed.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Day Shift vs Night Shift Windows Card -->
          <div class="content-card">
            <div class="card-header-bar">
              <div class="header-bar-left">
                <span class="material-symbols-outlined text-blue">bedtime</span>
                <div>
                  <h3 class="card-heading">Day Shift vs. Night Shift Windows</h3>
                  <p class="card-sub">Shift classification boundaries and nocturnal pay differentials.</p>
                </div>
              </div>
            </div>

            <div class="policy-form">
              <div class="form-group">
                <label class="form-label">Day Shift Window <span class="required">*</span></label>
                <div class="time-range-group">
                  <input
                    type="time"
                    class="form-control"
                    [(ngModel)]="policies.dayShiftStart"
                    name="dayShiftStart"
                  />
                  <span class="time-sep">to</span>
                  <input
                    type="time"
                    class="form-control"
                    [(ngModel)]="policies.dayShiftEnd"
                    name="dayShiftEnd"
                  />
                </div>
                <span class="field-hint">Standard daytime hours (e.g. 07:00 to 19:00).</span>
              </div>

              <div class="form-group">
                <label class="form-label">Night Shift Window <span class="required">*</span></label>
                <div class="time-range-group">
                  <input
                    type="time"
                    class="form-control"
                    [(ngModel)]="policies.nightShiftStart"
                    name="nightShiftStart"
                  />
                  <span class="time-sep">to</span>
                  <input
                    type="time"
                    class="form-control"
                    [(ngModel)]="policies.nightShiftEnd"
                    name="nightShiftEnd"
                  />
                </div>
                <span class="field-hint">Overnight window spanning midnight (e.g. 19:00 to 07:00).</span>
              </div>

              <div class="night-premium-box">
                <div class="toggle-card">
                  <label class="switch">
                    <input
                      type="checkbox"
                      [(ngModel)]="policies.enableNightPremium"
                      name="enableNightPremium"
                    />
                    <span class="slider round"></span>
                  </label>
                  <div class="toggle-info">
                    <strong>Enable Night Premium Differential</strong>
                    <span>Apply extra hourly allowance when a shift falls inside the night window.</span>
                  </div>
                </div>

                <div class="form-group mt-3" *ngIf="policies.enableNightPremium">
                  <label class="form-label">Night Premium Hourly Allowance ({{ currencySymbol }}/hr)</label>
                  <input
                    type="number"
                    step="0.50"
                    class="form-control"
                    [(ngModel)]="policies.nightPremiumHourlyAllowance"
                    name="nightPremiumHourlyAllowance"
                    placeholder="e.g. 1.50"
                  />
                  <span class="field-hint">Added automatically to gross wages for hours worked within night window.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ========================================================================= -->
      <!-- TAB 3: MEAL & REST BREAKS -->
      <!-- ========================================================================= -->
      <div class="tab-pane" *ngIf="activeTab === 'breaks'">
        <div class="policy-grid">
          <!-- Break Duration Matrix Card -->
          <div class="content-card">
            <div class="card-header-bar">
              <div class="header-bar-left">
                <span class="material-symbols-outlined text-blue">free_breakfast</span>
                <div>
                  <h3 class="card-heading">Break Duration Matrix</h3>
                  <p class="card-sub">Automatic break allocations based on scheduled shift duration.</p>
                </div>
              </div>
            </div>

            <div class="policy-form">
              <div class="break-tier-row">
                <div class="tier-label">
                  <strong>Shifts &ge; 6 Hours</strong>
                  <span>Short shift break entitlement</span>
                </div>
                <div class="tier-input">
                  <input
                    type="number"
                    class="form-control text-center"
                    [(ngModel)]="policies.breakMinutesFor6Hours"
                    name="breakMinutesFor6Hours"
                    min="0"
                    max="120"
                    placeholder="e.g. 30"
                  />
                  <span class="input-suffix">minutes</span>
                </div>
              </div>

              <div class="break-tier-row">
                <div class="tier-label">
                  <strong>Shifts &ge; 8 Hours</strong>
                  <span>Standard 8-hour shift rest break</span>
                </div>
                <div class="tier-input">
                  <input
                    type="number"
                    class="form-control text-center"
                    [(ngModel)]="policies.breakMinutesFor8Hours"
                    name="breakMinutesFor8Hours"
                    min="0"
                    max="120"
                    placeholder="e.g. 45"
                  />
                  <span class="input-suffix">minutes</span>
                </div>
              </div>

              <div class="break-tier-row">
                <div class="tier-label">
                  <strong>Shifts &ge; 12 Hours</strong>
                  <span>Extended 12-hour / overnight post break</span>
                </div>
                <div class="tier-input">
                  <input
                    type="number"
                    class="form-control text-center"
                    [(ngModel)]="policies.breakMinutesFor12Hours"
                    name="breakMinutesFor12Hours"
                    min="0"
                    max="180"
                    placeholder="e.g. 60"
                  />
                  <span class="input-suffix">minutes</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Break Payment & Logging Policy Card -->
          <div class="content-card">
            <div class="card-header-bar">
              <div class="header-bar-left">
                <span class="material-symbols-outlined text-blue">policy</span>
                <div>
                  <h3 class="card-heading">Remuneration &amp; Logging Policy</h3>
                  <p class="card-sub">Control whether breaks are paid and how timesheets account for rest time.</p>
                </div>
              </div>
            </div>

            <div class="policy-form">
              <div class="toggle-card">
                <label class="switch">
                  <input
                    type="checkbox"
                    [(ngModel)]="policies.isBreakPaid"
                    name="isBreakPaid"
                  />
                  <span class="slider round"></span>
                </label>
                <div class="toggle-info">
                  <strong>Paid Break Policy</strong>
                  <span>{{ policies.isBreakPaid ? 'Breaks are PAID (no deduction from gross wages).' : 'Breaks are UNPAID (break minutes are deducted from billable hours).' }}</span>
                </div>
              </div>

              <div class="form-group mt-4">
                <label class="form-label">Timesheet Break Logging Mode <span class="required">*</span></label>
                <div class="radio-card-group">
                  <label class="radio-card" [class.selected]="policies.breakLoggingMode === 'AutomaticDeduction'">
                    <input
                      type="radio"
                      name="breakLoggingMode"
                      value="AutomaticDeduction"
                      [(ngModel)]="policies.breakLoggingMode"
                    />
                    <div class="radio-content">
                      <span class="material-symbols-outlined">auto_mode</span>
                      <div>
                        <strong>Automatic Timesheet Deduction</strong>
                        <p>Deducts matrix break duration automatically from shift length.</p>
                      </div>
                    </div>
                  </label>

                  <label class="radio-card" [class.selected]="policies.breakLoggingMode === 'GuardClocking'">
                    <input
                      type="radio"
                      name="breakLoggingMode"
                      value="GuardClocking"
                      [(ngModel)]="policies.breakLoggingMode"
                    />
                    <div class="radio-content">
                      <span class="material-symbols-outlined">touch_app</span>
                      <div>
                        <strong>In-App Guard Clocking</strong>
                        <p>Staff members tap "Start Break" and "End Break" on the mobile/web terminal.</p>
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ========================================================================= -->
      <!-- TAB 4: CUSTOM FORMS & ONBOARDING -->
      <!-- ========================================================================= -->
      <div class="tab-pane" *ngIf="activeTab === 'forms'">
        <div class="content-card">
          <div class="card-header-bar">
            <div class="header-bar-left">
              <span class="material-symbols-outlined text-blue">dynamic_form</span>
              <div>
                <h3 class="card-heading">Mandatory Onboarding Questionnaire Fields</h3>
                <p class="card-sub">Decide what information your staff members must provide during self-enrollment or profile completion.</p>
              </div>
            </div>
          </div>

          <div class="policy-form">
            <div class="custom-fields-list">
              <div class="field-item-card">
                <div class="field-item-left">
                  <span class="material-symbols-outlined text-blue">apparel</span>
                  <div>
                    <strong>Uniform &amp; PPE Sizing</strong>
                    <p>Collects Jacket Size (S-XXL), Trouser Waist/Inseam, and Safety Boot Shoe Size.</p>
                  </div>
                </div>
                <label class="switch">
                  <input
                    type="checkbox"
                    [(ngModel)]="policies.requireUniformSizes"
                    name="requireUniformSizes"
                  />
                  <span class="slider round"></span>
                </label>
              </div>

              <div class="field-item-card">
                <div class="field-item-left">
                  <span class="material-symbols-outlined text-blue">directions_car</span>
                  <div>
                    <strong>Driving License &amp; Vehicle Access</strong>
                    <p>Checks if the staff member holds a valid driving license and has access to a vehicle for mobile patrol shifts.</p>
                  </div>
                </div>
                <label class="switch">
                  <input
                    type="checkbox"
                    [(ngModel)]="policies.requireDrivingLicense"
                    name="requireDrivingLicense"
                  />
                  <span class="slider round"></span>
                </label>
              </div>

              <div class="field-item-card">
                <div class="field-item-left">
                  <span class="material-symbols-outlined text-blue">medical_information</span>
                  <div>
                    <strong>Emergency Medical Conditions &amp; Allergies</strong>
                    <p>Captures critical health disclosures so dispatchers can respond appropriately in an emergency.</p>
                  </div>
                </div>
                <label class="switch">
                  <input
                    type="checkbox"
                    [(ngModel)]="policies.requireMedicalAllergies"
                    name="requireMedicalAllergies"
                  />
                  <span class="slider round"></span>
                </label>
              </div>

              <div class="field-item-card">
                <div class="field-item-left">
                  <span class="material-symbols-outlined text-blue">shield_person</span>
                  <div>
                    <strong>DBS Criminal Record &amp; Vetting Disclosure</strong>
                    <p>Standard security screening questions in compliance with BS 7858 security vetting standards.</p>
                  </div>
                </div>
                <label class="switch">
                  <input
                    type="checkbox"
                    [(ngModel)]="policies.requireDbsCriminalDisclosure"
                    name="requireDbsCriminalDisclosure"
                  />
                  <span class="slider round"></span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ========================================================================= -->
      <!-- TAB 5: STAFF CLASSIFICATIONS (STAFF TYPES) -->
      <!-- ========================================================================= -->
      <div class="tab-pane" *ngIf="activeTab === 'staff-types'">
        <div class="content-card">
          <div class="card-header-bar">
            <div class="header-bar-left">
              <span class="material-symbols-outlined text-blue">groups</span>
              <div>
                <h3 class="card-heading">Staff Employment Classifications</h3>
                <p class="card-sub">Permanent, Temporary, and Contractor tiers. Compulsory types cannot be deleted to ensure data integrity.</p>
              </div>
            </div>
            <button type="button" class="btn btn-primary btn-sm" (click)="openStaffTypeModal()">
              <span class="material-symbols-outlined">add</span> + Add Classification
            </button>
          </div>

          <div class="table-responsive">
            <table class="settings-table">
              <thead>
                <tr>
                  <th>Classification Name</th>
                  <th>Code</th>
                  <th>Contracted Target</th>
                  <th>Compulsory</th>
                  <th>Enrolled Staff</th>
                  <th>Status</th>
                  <th style="text-align: right; width: 140px;">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let t of staffTypes">
                  <td>
                    <div class="title-cell">
                      <strong>{{ t.name }}</strong>
                      <span class="desc-muted" *ngIf="t.description">{{ t.description }}</span>
                    </div>
                  </td>
                  <td>
                    <span class="code-badge">{{ t.code }}</span>
                  </td>
                  <td>
                    <span class="hours-chip">{{ t.defaultContractedHours }} hrs/wk</span>
                  </td>
                  <td>
                    <span class="compulsory-badge" *ngIf="t.isCompulsory">
                      <span class="material-symbols-outlined">lock</span> Compulsory
                    </span>
                    <span class="optional-badge" *ngIf="!t.isCompulsory">Custom</span>
                  </td>
                  <td>
                    <span class="staff-count-pill">{{ t.enrolledStaffCount }} staff</span>
                  </td>
                  <td>
                    <span class="status-pill active" *ngIf="t.isActive">Active</span>
                    <span class="status-pill disabled" *ngIf="!t.isActive">Inactive</span>
                  </td>
                  <td style="text-align: right;">
                    <button type="button" class="action-btn" (click)="editStaffType(t)" title="Edit Classification">
                      <span class="material-symbols-outlined">edit</span>
                    </button>
                    <button
                      type="button"
                      class="action-btn text-danger"
                      *ngIf="!t.isCompulsory"
                      (click)="deleteStaffType(t)"
                      title="Delete Classification"
                    >
                      <span class="material-symbols-outlined">delete</span>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ========================================================================= -->
      <!-- TAB 6: DOCUMENT CATEGORIES & COMPLIANCE VAULT -->
      <!-- ========================================================================= -->
      <div class="tab-pane" *ngIf="activeTab === 'documents'">
        <div class="content-card">
          <div class="card-header-bar">
            <div class="header-bar-left">
              <span class="material-symbols-outlined text-blue">folder_shared</span>
              <div>
                <h3 class="card-heading">Compliance Document Categories &amp; Regulatory Policies</h3>
                <p class="card-sub">Define the specific compliance credentials, certificates, and ID documents your staff must provide.</p>
              </div>
            </div>
            <button type="button" class="btn btn-primary btn-sm" (click)="openCategoryModal()">
              <span class="material-symbols-outlined">add</span> + Add Category
            </button>
          </div>

          <div class="table-responsive">
            <table class="settings-table">
              <thead>
                <tr>
                  <th>Category Name</th>
                  <th>Code</th>
                  <th>Purpose / Description</th>
                  <th>Mandatory</th>
                  <th>Expiry Tracking</th>
                  <th>Status</th>
                  <th>Filed Records</th>
                  <th style="text-align: right; width: 140px;">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let c of documentCategories">
                  <td>
                    <div class="title-cell">
                      <strong>{{ c.name }}</strong>
                    </div>
                  </td>
                  <td>
                    <span class="code-badge">{{ c.code }}</span>
                  </td>
                  <td>
                    <span class="desc-muted">{{ c.description || 'No description provided.' }}</span>
                  </td>
                  <td>
                    <span class="status-badge" [ngClass]="c.isMandatory ? 'active' : 'idle'">
                      {{ c.isMandatory ? 'Mandatory' : 'Optional' }}
                    </span>
                  </td>
                  <td>
                    <span class="status-badge" [ngClass]="c.requiresExpiryDate ? 'warning' : 'idle'">
                      {{ c.requiresExpiryDate ? 'Expiry Tracked' : 'No Expiry' }}
                    </span>
                  </td>
                  <td>
                    <span class="status-badge" [ngClass]="c.isActive ? 'active' : 'idle'">
                      {{ c.isActive ? 'Active' : 'Inactive' }}
                    </span>
                  </td>
                  <td>
                    <span class="staff-count-pill">{{ c.uploadedDocumentsCount }} records</span>
                  </td>
                  <td style="text-align: right;">
                    <button type="button" class="action-btn" (click)="editCategory(c)" title="Edit Category">
                      <span class="material-symbols-outlined">edit</span>
                    </button>
                    <button
                      type="button"
                      class="action-btn text-danger"
                      (click)="deleteCategory(c)"
                      title="Delete Category"
                    >
                      <span class="material-symbols-outlined">delete</span>
                    </button>
                  </td>
                </tr>
                <tr *ngIf="documentCategories.length === 0">
                  <td colspan="8" class="empty-state-cell">
                    <p>No compliance document categories configured yet. Click "+ Add Category" to create one.</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ========================================================================= -->
      <!-- MODAL: ADD / EDIT JOB ROLE -->
      <!-- ========================================================================= -->
      <div class="modal-backdrop" *ngIf="showRoleModal" (click)="closeRoleModal()">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div class="modal-title-group">
              <span class="material-symbols-outlined text-blue">badge</span>
              <div>
                <h3>{{ isEditingRole ? 'Edit Job Role' : 'Add New Job Role' }}</h3>
                <p class="modal-subtitle">Specify role title, base wage, billing charge rate, and qualification requirements.</p>
              </div>
            </div>
            <button type="button" class="btn-close" (click)="closeRoleModal()">&times;</button>
          </div>

          <div class="modal-body">
            <div class="form-row-dual">
              <div class="form-group">
                <label class="form-label">Role Title <span class="required">*</span></label>
                <input
                  type="text"
                  class="form-control"
                  [(ngModel)]="roleForm.title"
                  placeholder="e.g. Operations Supervisor"
                  required
                />
              </div>

              <div class="form-group">
                <label class="form-label">Role Code <span class="required">*</span></label>
                <input
                  type="text"
                  class="form-control"
                  [(ngModel)]="roleForm.code"
                  placeholder="e.g. OPS"
                  required
                />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Description</label>
              <textarea
                class="form-control"
                rows="2"
                [(ngModel)]="roleForm.description"
                placeholder="Brief summary of duties and responsibilities..."
              ></textarea>
            </div>

            <div class="form-row-dual">
              <div class="form-group">
                <label class="form-label">Default Hourly Wage Rate ({{ currencySymbol }}/hr) <span class="required">*</span></label>
                <input
                  type="number"
                  step="0.25"
                  class="form-control"
                  [(ngModel)]="roleForm.defaultHourlyRate"
                  placeholder="e.g. 15.00"
                  required
                />
              </div>

              <div class="form-group">
                <label class="form-label">Client Billing Charge Rate ({{ currencySymbol }}/hr) <span class="required">*</span></label>
                <input
                  type="number"
                  step="0.25"
                  class="form-control"
                  [(ngModel)]="roleForm.billingChargeRate"
                  placeholder="e.g. 22.50"
                  required
                />
              </div>
            </div>

            <div class="form-row-dual">
              <div class="form-group">
                <label class="form-label">Required Qualification / Credential</label>
                <select class="form-control" [(ngModel)]="roleForm.mandatorySiaSector">
                  <option value="None">None (Unrestricted / General Duty)</option>
                  <option *ngFor="let cat of documentCategories" [value]="cat.name">
                    {{ cat.name }} ({{ cat.code }})
                  </option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Badge Color Identifier</label>
                <div class="color-picker-row">
                  <input
                    type="color"
                    class="color-input"
                    [(ngModel)]="roleForm.badgeColor"
                  />
                  <input
                    type="text"
                    class="form-control"
                    [(ngModel)]="roleForm.badgeColor"
                    placeholder="#0050E5"
                  />
                </div>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-outline" (click)="closeRoleModal()">Cancel</button>
            <button type="button" class="btn btn-primary" (click)="saveRole()" [disabled]="isSavingRole">
              <span class="material-symbols-outlined" *ngIf="!isSavingRole">save</span>
              <span class="material-symbols-outlined spin" *ngIf="isSavingRole">sync</span>
              {{ isSavingRole ? 'Saving...' : 'Save Job Role' }}
            </button>
          </div>
        </div>
      </div>

      <!-- ========================================================================= -->
      <!-- MODAL: ADD / EDIT STAFF TYPE -->
      <!-- ========================================================================= -->
      <div class="modal-backdrop" *ngIf="showStaffTypeModal" (click)="closeStaffTypeModal()">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div class="modal-title-group">
              <span class="material-symbols-outlined text-blue">groups</span>
              <div>
                <h3>{{ isEditingStaffType ? 'Edit Classification' : 'Add Staff Classification' }}</h3>
                <p class="modal-subtitle">Configure contract type and default weekly hours.</p>
              </div>
            </div>
            <button type="button" class="btn-close" (click)="closeStaffTypeModal()">&times;</button>
          </div>

          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Classification Name <span class="required">*</span></label>
              <input
                type="text"
                class="form-control"
                [(ngModel)]="staffTypeForm.name"
                placeholder="e.g. Subcontractor Specialist"
                required
              />
            </div>

            <div class="form-group">
              <label class="form-label">Code</label>
              <input
                type="text"
                class="form-control"
                [(ngModel)]="staffTypeForm.code"
                placeholder="e.g. SUB"
              />
            </div>

            <div class="form-group">
              <label class="form-label">Default Contracted Weekly Hours</label>
              <input
                type="number"
                class="form-control"
                [(ngModel)]="staffTypeForm.defaultContractedHours"
                placeholder="e.g. 40"
              />
            </div>

            <div class="form-group">
              <label class="form-label">Description</label>
              <textarea
                class="form-control"
                rows="2"
                [(ngModel)]="staffTypeForm.description"
                placeholder="Operational purpose of this classification..."
              ></textarea>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-outline" (click)="closeStaffTypeModal()">Cancel</button>
            <button type="button" class="btn btn-primary" (click)="saveStaffType()" [disabled]="isSavingStaffType">
              <span class="material-symbols-outlined" *ngIf="!isSavingStaffType">save</span>
              <span class="material-symbols-outlined spin" *ngIf="isSavingStaffType">sync</span>
              {{ isSavingStaffType ? 'Saving...' : 'Save Classification' }}
            </button>
          </div>
        </div>
      </div>

      <!-- ========================================================================= -->
      <!-- MODAL: ADD / EDIT DOCUMENT CATEGORY -->
      <!-- ========================================================================= -->
      <div class="modal-backdrop" *ngIf="showCategoryModal" (click)="closeCategoryModal()">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div class="modal-title-group">
              <span class="material-symbols-outlined text-blue">folder_shared</span>
              <div>
                <h3>{{ isEditingCategory ? 'Edit Document Category' : 'Add Document Category' }}</h3>
                <p class="modal-subtitle">Configure compliance document category, mandatory requirements, and expiration tracking.</p>
              </div>
            </div>
            <button type="button" class="btn-close" (click)="closeCategoryModal()">&times;</button>
          </div>

          <div class="modal-body">
            <div class="form-row-dual">
              <div class="form-group">
                <label class="form-label">Category Name <span class="required">*</span></label>
                <input
                  type="text"
                  class="form-control"
                  [(ngModel)]="categoryForm.name"
                  placeholder="e.g. Professional License / Registration"
                  required
                />
              </div>

              <div class="form-group">
                <label class="form-label">Short Code <span class="required">*</span></label>
                <input
                  type="text"
                  class="form-control text-uppercase"
                  [(ngModel)]="categoryForm.code"
                  placeholder="e.g. LIC, RTW, DBS, CSCS"
                  maxlength="20"
                  required
                />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Compliance Purpose &amp; Accepted Documents</label>
              <textarea
                class="form-control"
                rows="2"
                [(ngModel)]="categoryForm.description"
                placeholder="Explain why this document is required and which official proofs are accepted..."
              ></textarea>
            </div>

            <div class="form-row-dual">
              <div class="form-group">
                <label class="form-label">Mandatory for Staff Onboarding</label>
                <div class="checkbox-row" style="margin-top: 8px;">
                  <input type="checkbox" id="catMandatory" [(ngModel)]="categoryForm.isMandatory" />
                  <label for="catMandatory" style="cursor: pointer; font-size: 0.875rem;">Required before staff deployment</label>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Track Expiration &amp; Alerts</label>
                <div class="checkbox-row" style="margin-top: 8px;">
                  <input type="checkbox" id="catExpiry" [(ngModel)]="categoryForm.requiresExpiryDate" />
                  <label for="catExpiry" style="cursor: pointer; font-size: 0.875rem;">Alert managers before document expires</label>
                </div>
              </div>
            </div>

            <div class="form-row-dual">
              <div class="form-group">
                <label class="form-label">Display Sort Order</label>
                <input
                  type="number"
                  class="form-control"
                  [(ngModel)]="categoryForm.sortOrder"
                  min="0"
                />
              </div>

              <div class="form-group">
                <label class="form-label">Status</label>
                <div class="checkbox-row" style="margin-top: 8px;">
                  <input type="checkbox" id="catActive" [(ngModel)]="categoryForm.isActive" />
                  <label for="catActive" style="cursor: pointer; font-size: 0.875rem;">Active for selection</label>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-outline" (click)="closeCategoryModal()">Cancel</button>
            <button
              type="button"
              class="btn btn-primary"
              (click)="saveCategory()"
              [disabled]="isSavingCategory"
            >
              <span class="material-symbols-outlined" *ngIf="!isSavingCategory">save</span>
              <span class="material-symbols-outlined spin" *ngIf="isSavingCategory">sync</span>
              {{ isSavingCategory ? 'Saving...' : (isEditingCategory ? 'Update Category' : 'Create Category') }}
            </button>
          </div>
        </div>
      </div>

      <!-- ========================================================================= -->
      <!-- MODAL: INFO GUIDE (i) -->
      <!-- ========================================================================= -->
      <div class="modal-backdrop" *ngIf="showInfoModal" (click)="showInfoModal = false">
        <div class="modal-card modal-large" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div class="modal-title-group">
              <span class="material-symbols-outlined text-blue">info</span>
              <div>
                <h3>Workforce Operational Policies Guide</h3>
                <p class="modal-subtitle">How job roles, day/night windows, and break policies interact with the live rota.</p>
              </div>
            </div>
            <button type="button" class="btn-close" (click)="showInfoModal = false">&times;</button>
          </div>

          <div class="modal-body info-guide-body">
            <div class="info-guide-section">
              <h4><span class="material-symbols-outlined text-blue">badge</span> Job Roles &amp; Pay Scales</h4>
              <p>Job roles eliminate free-text discrepancies. When you allocate a staff member under a role, their base hourly pay and client billing charge automatically inherit these configured defaults.</p>
            </div>

            <div class="info-guide-section">
              <h4><span class="material-symbols-outlined text-blue">schedule</span> Working Hours &amp; 48-Hour Cap</h4>
              <p>In accordance with UK Working Time Regulations, personnel cannot exceed 48 hours per week unless they have signed an individual 48-Hour Opt-Out Agreement recorded on their staff profile.</p>
            </div>

            <div class="info-guide-section">
              <h4><span class="material-symbols-outlined text-blue">coffee</span> Break Deduction Matrix</h4>
              <p>Automatic break deduction recalculates net billable hours during timesheet approval, preventing overpayments while ensuring full rest compliance.</p>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-primary" (click)="showInfoModal = false">Close Guide</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .settings-page {
      padding: 1.5rem 2rem;
      background-color: #f8fafc;
      min-height: calc(100vh - 70px);
      overflow-x: hidden;
      max-width: 100%;
      box-sizing: border-box;
    }

    .breadcrumb-nav {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8125rem;
      color: #64748b;
      margin-bottom: 0.75rem;
    }

    .crumb-sep {
      color: #cbd5e1;
    }

    .crumb-active {
      color: #0f172a;
      font-weight: 600;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.5rem;
      gap: 1.5rem;
    }

    .title-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.25rem;
    }

    .page-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: -0.02em;
      margin: 0;
    }

    .info-badge-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: #64748b;
      padding: 2px;
      display: flex;
      align-items: center;
      border-radius: 50%;
      transition: color 0.15s ease;
    }

    .info-badge-btn:hover {
      color: #0050e5;
    }

    .suite-pill {
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      color: #0050e5;
      background-color: #eff6ff;
      border: 1px solid #dbeafe;
      padding: 0.2rem 0.55rem;
      border-radius: 9999px;
    }

    .page-subtitle {
      font-size: 0.875rem;
      color: #64748b;
      margin: 0;
    }

    .header-actions {
      display: flex;
      gap: 0.75rem;
      align-items: center;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.55rem 1rem;
      font-size: 0.875rem;
      font-weight: 600;
      border-radius: 0.5rem;
      border: 1px solid transparent;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-outline {
      background: #ffffff;
      border-color: #cbd5e1;
      color: #334155;
    }

    .btn-outline:hover {
      background: #f1f5f9;
      border-color: #94a3b8;
    }

    .btn-primary {
      background: #0050e5;
      color: #ffffff;
    }

    .btn-primary:hover {
      background: #003ebd;
    }

    .btn-sm {
      padding: 0.4rem 0.75rem;
      font-size: 0.8125rem;
    }

    /* Tabs Bar */
    .settings-tabs-bar {
      display: flex;
      gap: 0.5rem;
      border-bottom: 2px solid #e2e8f0;
      margin-bottom: 1.5rem;
      overflow-x: auto;
      scrollbar-width: none;
      -ms-overflow-style: none;
      &::-webkit-scrollbar {
        display: none;
      }
    }

    .tab-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.25rem;
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      margin-bottom: -2px;
      font-size: 0.875rem;
      font-weight: 600;
      color: #64748b;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s ease;
    }

    .tab-btn:hover {
      color: #0f172a;
    }

    .tab-btn.active {
      color: #0050e5;
      border-bottom-color: #0050e5;
    }

    .tab-count {
      font-size: 0.6875rem;
      background: #e2e8f0;
      color: #475569;
      padding: 0.1rem 0.45rem;
      border-radius: 9999px;
      font-weight: 700;
    }

    .tab-btn.active .tab-count {
      background: #eff6ff;
      color: #0050e5;
    }

    /* Metrics Grid */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .metric-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
      padding: 1.25rem;
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .card-icon {
      width: 44px;
      height: 44px;
      border-radius: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .bg-blue { background: #eff6ff; color: #0050e5; }
    .bg-emerald { background: #ecfdf5; color: #059669; }
    .bg-purple { background: #faf5ff; color: #7c3aed; }

    .metric-val {
      font-size: 1.35rem;
      font-weight: 700;
      color: #0f172a;
      line-height: 1.2;
    }

    .metric-label {
      font-size: 0.75rem;
      color: #64748b;
      margin-top: 0.15rem;
    }

    /* Content Card */
    .content-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
      overflow: hidden;
      margin-bottom: 1.5rem;
    }

    .card-header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #f1f5f9;
      background: #ffffff;
    }

    .header-bar-left {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .card-heading {
      font-size: 1rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }

    .card-sub {
      font-size: 0.8125rem;
      color: #64748b;
      margin: 0.15rem 0 0 0;
    }

    /* Table Styles */
    .table-responsive {
      overflow-x: auto;
    }

    .settings-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }

    .settings-table th {
      background: #f8fafc;
      padding: 0.75rem 1.25rem;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
      border-bottom: 1px solid #e2e8f0;
      text-align: left;
    }

    .settings-table td {
      padding: 1rem 1.25rem;
      border-bottom: 1px solid #f1f5f9;
      color: #1e293b;
      vertical-align: middle;
    }

    .settings-table tr:hover {
      background: #f8fafc;
    }

    .color-dot {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      display: inline-block;
      box-shadow: 0 0 0 2px #ffffff, 0 0 0 3px #cbd5e1;
    }

    .title-cell strong {
      display: block;
      color: #0f172a;
      font-weight: 600;
    }

    .desc-muted {
      font-size: 0.75rem;
      color: #64748b;
      margin-top: 0.15rem;
      display: block;
    }

    .code-badge {
      font-family: monospace;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.15rem 0.45rem;
      background: #f1f5f9;
      border-radius: 0.35rem;
      color: #475569;
    }

    .wage-tag {
      font-weight: 700;
      color: #059669;
    }

    .charge-tag {
      font-weight: 700;
      color: #0050e5;
    }

    .sia-badge {
      display: inline-flex;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.2rem 0.5rem;
      border-radius: 0.35rem;
      background: #f0fdf4;
      color: #15803d;
      border: 1px solid #bbf7d0;
    }

    .sia-badge.none {
      background: #f8fafc;
      color: #94a3b8;
      border-color: #e2e8f0;
    }

    .compulsory-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.2rem 0.5rem;
      border-radius: 0.35rem;
      background: #eff6ff;
      color: #0050e5;
      border: 1px solid #bfdbfe;
    }

    .compulsory-badge .material-symbols-outlined {
      font-size: 13px;
    }

    .optional-badge {
      font-size: 0.75rem;
      color: #64748b;
      background: #f1f5f9;
      padding: 0.2rem 0.5rem;
      border-radius: 0.35rem;
    }

    .hours-chip {
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.2rem 0.5rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 0.35rem;
      color: #334155;
    }

    .staff-count-pill {
      font-size: 0.75rem;
      color: #475569;
      background: #f1f5f9;
      padding: 0.2rem 0.55rem;
      border-radius: 9999px;
    }

    .status-pill {
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.15rem 0.45rem;
      border-radius: 9999px;
    }

    .status-pill.active {
      background: #dcfce7;
      color: #15803d;
    }

    .status-pill.disabled {
      background: #fee2e2;
      color: #b91c1c;
    }

    .action-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: #64748b;
      padding: 0.3rem;
      border-radius: 0.35rem;
      transition: all 0.15s ease;
    }

    .action-btn:hover {
      background: #f1f5f9;
      color: #0f172a;
    }

    .action-btn.text-danger:hover {
      background: #fee2e2;
      color: #ef4444;
    }

    /* Policy Forms Layout */
    .policy-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 1.5rem;
      max-width: 100%;
    }

    @media (max-width: 1024px) {
      .policy-grid {
        grid-template-columns: 1fr;
      }
      .metrics-grid {
        grid-template-columns: 1fr;
      }
    }

    .policy-form {
      padding: 1.5rem;
    }

    .form-group {
      margin-bottom: 1.25rem;
    }

    .form-label {
      display: block;
      font-size: 0.8125rem;
      font-weight: 600;
      color: #334155;
      margin-bottom: 0.4rem;
    }

    .form-control {
      width: 100%;
      min-width: 0;
      box-sizing: border-box;
      padding: 0.55rem 0.85rem;
      font-size: 0.875rem;
      border: 1px solid #cbd5e1;
      border-radius: 0.5rem;
      background: #ffffff;
      color: #0f172a;
      transition: border-color 0.15s ease;
    }

    .form-control:focus {
      outline: none;
      border-color: #0050e5;
      box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.1);
    }

    .field-hint {
      font-size: 0.75rem;
      color: #64748b;
      margin-top: 0.3rem;
      display: block;
    }

    .form-row-dual {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 1rem;
      width: 100%;
      box-sizing: border-box;
    }

    @media (max-width: 640px) {
      .form-row-dual {
        grid-template-columns: 1fr;
      }
    }

    .time-range-group {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      width: 100%;
      box-sizing: border-box;
    }

    .time-range-group .form-control {
      flex: 1 1 0;
      min-width: 0;
    }

    .time-sep {
      font-size: 0.8125rem;
      color: #64748b;
      font-weight: 600;
      flex-shrink: 0;
    }

    .toggle-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
    }

    .toggle-info strong {
      display: block;
      font-size: 0.875rem;
      color: #0f172a;
    }

    .toggle-info span {
      font-size: 0.75rem;
      color: #64748b;
    }

    /* Switch */
    .switch {
      position: relative;
      display: inline-block;
      width: 44px;
      height: 24px;
      flex-shrink: 0;
    }

    .switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #cbd5e1;
      transition: 0.2s;
    }

    .slider:before {
      position: absolute;
      content: "";
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: 0.2s;
    }

    input:checked + .slider {
      background-color: #0050e5;
    }

    input:checked + .slider:before {
      transform: translateX(20px);
    }

    .slider.round {
      border-radius: 34px;
    }

    .slider.round:before {
      border-radius: 50%;
    }

    /* Break Matrix */
    .break-tier-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      border-bottom: 1px solid #f1f5f9;
    }

    .break-tier-row:last-child {
      border-bottom: none;
    }

    .tier-label strong {
      display: block;
      font-size: 0.875rem;
      color: #0f172a;
    }

    .tier-label span {
      font-size: 0.75rem;
      color: #64748b;
    }

    .tier-input {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      width: 150px;
    }

    .input-suffix {
      font-size: 0.8125rem;
      color: #64748b;
    }

    /* Radio Cards */
    .radio-card-group {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .radio-card {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 1rem;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .radio-card.selected {
      border-color: #0050e5;
      background: #eff6ff;
    }

    .radio-content {
      display: flex;
      gap: 0.75rem;
    }

    .radio-content strong {
      display: block;
      font-size: 0.875rem;
      color: #0f172a;
    }

    .radio-content p {
      font-size: 0.75rem;
      color: #64748b;
      margin: 0.15rem 0 0 0;
    }

    /* Custom Fields */
    .custom-fields-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .field-item-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.25rem;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      background: #f8fafc;
    }

    .field-item-left {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .field-item-left strong {
      display: block;
      font-size: 0.875rem;
      color: #0f172a;
    }

    .field-item-left p {
      font-size: 0.75rem;
      color: #64748b;
      margin: 0.15rem 0 0 0;
    }

    /* Modals */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.45);
      backdrop-filter: blur(4px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }

    .modal-card {
      background: #ffffff;
      border-radius: 0.75rem;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      width: 100%;
      max-width: 580px;
      overflow: hidden;
      box-sizing: border-box;
    }

    .modal-large {
      max-width: 720px;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #e2e8f0;
    }

    .modal-title-group {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .modal-title-group h3 {
      font-size: 1.1rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }

    .modal-subtitle {
      font-size: 0.75rem;
      color: #64748b;
      margin: 0.1rem 0 0 0;
    }

    .btn-close {
      background: none;
      border: none;
      font-size: 1.5rem;
      color: #94a3b8;
      cursor: pointer;
      line-height: 1;
    }

    .btn-close:hover {
      color: #0f172a;
    }

    .modal-body {
      padding: 1.5rem;
      max-height: 70vh;
      overflow-y: auto;
      overflow-x: hidden;
      box-sizing: border-box;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1rem 1.5rem;
      border-top: 1px solid #e2e8f0;
      background: #f8fafc;
    }

    .color-picker-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      width: 100%;
      box-sizing: border-box;
    }

    .color-input {
      width: 40px;
      height: 38px;
      border: 1px solid #cbd5e1;
      border-radius: 0.35rem;
      cursor: pointer;
      padding: 2px;
      background: #ffffff;
      flex-shrink: 0;
    }

    .color-picker-row .form-control {
      flex: 1 1 0;
      min-width: 0;
    }

    .info-guide-body {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .info-guide-section h4 {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.95rem;
      color: #0f172a;
      margin: 0 0 0.35rem 0;
    }

    .info-guide-section p {
      font-size: 0.8125rem;
      color: #475569;
      line-height: 1.5;
      margin: 0;
    }

    .spin {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }
  `]
})
export class WorkforceSettingsComponent implements OnInit {
  activeTab: 'roles' | 'hours' | 'breaks' | 'forms' | 'staff-types' | 'documents' = 'roles';
  isLoading = false;

  currencyCode = 'NGN';
  currencySymbol = '₦';

  // Job Roles State
  jobRoles: JobRoleItem[] = [];
  showRoleModal = false;
  isEditingRole = false;
  isSavingRole = false;
  roleForm: Partial<JobRoleItem> = {
    title: '',
    code: '',
    description: '',
    defaultHourlyRate: 15.0,
    billingChargeRate: 22.5,
    mandatorySiaSector: 'None',
    badgeColor: '#0050E5',
    isActive: true
  };

  // Document Categories State
  documentCategories: DocumentCategoryItem[] = [];
  showCategoryModal = false;
  isEditingCategory = false;
  isSavingCategory = false;
  categoryForm: Partial<DocumentCategoryItem> = {
    name: '',
    code: '',
    description: '',
    isMandatory: false,
    requiresExpiryDate: true,
    isActive: true,
    sortOrder: 0
  };

  // Workforce Policies State
  policies: WorkforcePolicies = {
    standardWeeklyHours: 40.0,
    maxPermissibleWeeklyHours: 48.0,
    maxConsecutiveWorkingDays: 6,
    enforce48HourWeeklyCap: true,
    dayShiftStart: '07:00',
    dayShiftEnd: '19:00',
    nightShiftStart: '19:00',
    nightShiftEnd: '07:00',
    nightPremiumHourlyAllowance: 1.50,
    enableNightPremium: false,
    breakMinutesFor6Hours: 30,
    breakMinutesFor8Hours: 45,
    breakMinutesFor12Hours: 60,
    isBreakPaid: false,
    breakLoggingMode: 'AutomaticDeduction',
    requireUniformSizes: true,
    requireDrivingLicense: true,
    requireMedicalAllergies: true,
    requireDbsCriminalDisclosure: true
  };
  isSavingPolicies = false;

  // Staff Types State
  staffTypes: StaffTypeItem[] = [];
  showStaffTypeModal = false;
  isEditingStaffType = false;
  isSavingStaffType = false;
  staffTypeForm: Partial<StaffTypeItem> = {
    name: '',
    code: '',
    description: '',
    defaultContractedHours: 40,
    isActive: true
  };

  showInfoModal = false;

  constructor(
    private workforceService: WorkforceService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.loadAllData();
  }

  get averageHourlyWage(): number {
    if (this.jobRoles.length === 0) return 0;
    const total = this.jobRoles.reduce((sum, r) => sum + (r.defaultHourlyRate || 0), 0);
    return total / this.jobRoles.length;
  }

  get averageChargeRate(): number {
    if (this.jobRoles.length === 0) return 0;
    const total = this.jobRoles.reduce((sum, r) => sum + (r.billingChargeRate || 0), 0);
    return total / this.jobRoles.length;
  }

  loadAllData(): void {
    this.isLoading = true;
    this.loadCurrency();
    this.loadJobRoles();
    this.loadPolicies();
    this.loadStaffTypes();
    this.loadDocumentCategories();
  }

  loadCurrency(): void {
    this.workforceService.getTenantCurrency().subscribe({
      next: (res: any) => {
        if (res && res.data) {
          this.currencyCode = res.data.currencyCode || 'NGN';
          this.currencySymbol = res.data.currencySymbol || '₦';
        }
      },
      error: () => {}
    });
  }

  // --- JOB ROLES LOGIC ---
  loadJobRoles(): void {
    this.workforceService.getJobRoles().subscribe({
      next: (res: any) => {
        this.isLoading = false;
        if (res && res.data) {
          this.jobRoles = res.data;
        }
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  openRoleModal(): void {
    this.isEditingRole = false;
    this.roleForm = {
      title: '',
      code: '',
      description: '',
      defaultHourlyRate: 15.0,
      billingChargeRate: 22.5,
      mandatorySiaSector: 'None',
      badgeColor: '#0050E5',
      isActive: true
    };
    this.showRoleModal = true;
  }

  editRole(role: JobRoleItem): void {
    this.isEditingRole = true;
    this.roleForm = { ...role };
    this.showRoleModal = true;
  }

  closeRoleModal(): void {
    this.showRoleModal = false;
  }

  saveRole(): void {
    if (!this.roleForm.title || !this.roleForm.code) {
      this.toast.error('Please specify both Role Title and Role Code.');
      return;
    }

    this.isSavingRole = true;
    if (this.isEditingRole && this.roleForm.id) {
      this.workforceService.updateJobRole(this.roleForm.id, this.roleForm).subscribe({
        next: () => {
          this.isSavingRole = false;
          this.showRoleModal = false;
          this.toast.success('Job role updated successfully.');
          this.loadJobRoles();
        },
        error: (err) => {
          this.isSavingRole = false;
          this.toast.error(err?.error?.message || 'Failed to update job role.');
        }
      });
    } else {
      this.workforceService.createJobRole(this.roleForm).subscribe({
        next: () => {
          this.isSavingRole = false;
          this.showRoleModal = false;
          this.toast.success('New job role created successfully.');
          this.loadJobRoles();
        },
        error: (err) => {
          this.isSavingRole = false;
          this.toast.error(err?.error?.message || 'Failed to create job role.');
        }
      });
    }
  }

  deleteRole(role: JobRoleItem): void {
    if (!confirm(`Are you sure you want to delete role '${role.title}'?`)) return;
    this.workforceService.deleteJobRole(role.id).subscribe({
      next: () => {
        this.toast.success(`Role '${role.title}' deleted.`);
        this.loadJobRoles();
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'Failed to delete role.');
      }
    });
  }

  // --- POLICIES LOGIC ---
  loadPolicies(): void {
    this.workforceService.getWorkforcePolicies().subscribe({
      next: (res: any) => {
        if (res && res.data) {
          this.policies = { ...this.policies, ...res.data };
        }
      },
      error: () => {}
    });
  }

  savePolicies(): void {
    this.isSavingPolicies = true;
    this.workforceService.updateWorkforcePolicies(this.policies).subscribe({
      next: () => {
        this.isSavingPolicies = false;
        this.toast.success('Workforce operational policies saved successfully.');
      },
      error: (err) => {
        this.isSavingPolicies = false;
        this.toast.error(err?.error?.message || 'Failed to save policies.');
      }
    });
  }

  // --- STAFF TYPES LOGIC ---
  loadStaffTypes(): void {
    this.workforceService.getStaffTypes().subscribe({
      next: (res: any) => {
        if (res && res.data) {
          this.staffTypes = res.data;
        }
      },
      error: () => {}
    });
  }

  openStaffTypeModal(): void {
    this.isEditingStaffType = false;
    this.staffTypeForm = {
      name: '',
      code: '',
      description: '',
      defaultContractedHours: 40,
      isActive: true
    };
    this.showStaffTypeModal = true;
  }

  editStaffType(type: StaffTypeItem): void {
    this.isEditingStaffType = true;
    this.staffTypeForm = { ...type };
    this.showStaffTypeModal = true;
  }

  closeStaffTypeModal(): void {
    this.showStaffTypeModal = false;
  }

  saveStaffType(): void {
    if (!this.staffTypeForm.name) {
      this.toast.error('Please enter a classification name.');
      return;
    }

    this.isSavingStaffType = true;
    if (this.isEditingStaffType && this.staffTypeForm.id) {
      this.workforceService.updateStaffType(this.staffTypeForm.id, this.staffTypeForm as any).subscribe({
        next: () => {
          this.isSavingStaffType = false;
          this.showStaffTypeModal = false;
          this.toast.success('Classification updated successfully.');
          this.loadStaffTypes();
        },
        error: (err) => {
          this.isSavingStaffType = false;
          this.toast.error(err?.error?.message || 'Failed to update classification.');
        }
      });
    } else {
      this.workforceService.createStaffType(this.staffTypeForm as any).subscribe({
        next: () => {
          this.isSavingStaffType = false;
          this.showStaffTypeModal = false;
          this.toast.success('New classification added.');
          this.loadStaffTypes();
        },
        error: (err) => {
          this.isSavingStaffType = false;
          this.toast.error(err?.error?.message || 'Failed to add classification.');
        }
      });
    }
  }

  deleteStaffType(type: StaffTypeItem): void {
    if (type.isCompulsory) {
      this.toast.error(`Classification '${type.name}' is compulsory and cannot be deleted.`);
      return;
    }
    if (!confirm(`Are you sure you want to delete classification '${type.name}'?`)) return;

    this.workforceService.deleteStaffType(type.id).subscribe({
      next: () => {
        this.toast.success(`Classification '${type.name}' removed.`);
        this.loadStaffTypes();
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'Failed to delete classification.');
      }
    });
  }

  // --- DOCUMENT CATEGORIES LOGIC ---
  loadDocumentCategories(): void {
    this.workforceService.getDocumentCategories().subscribe({
      next: (res: any) => {
        if (res && res.data) {
          this.documentCategories = res.data;
        }
      },
      error: () => {}
    });
  }

  openCategoryModal(): void {
    this.isEditingCategory = false;
    this.categoryForm = {
      name: '',
      code: '',
      description: '',
      isMandatory: false,
      requiresExpiryDate: true,
      isActive: true,
      sortOrder: this.documentCategories.length + 1
    };
    this.showCategoryModal = true;
  }

  editCategory(cat: DocumentCategoryItem): void {
    this.isEditingCategory = true;
    this.categoryForm = { ...cat };
    this.showCategoryModal = true;
  }

  closeCategoryModal(): void {
    this.showCategoryModal = false;
  }

  saveCategory(): void {
    if (!this.categoryForm.name?.trim()) {
      this.toast.error('Please enter a document category name.');
      return;
    }

    this.isSavingCategory = true;
    if (this.isEditingCategory && this.categoryForm.id) {
      this.workforceService.updateDocumentCategory(this.categoryForm.id, this.categoryForm).subscribe({
        next: () => {
          this.isSavingCategory = false;
          this.showCategoryModal = false;
          this.toast.success('Document category updated successfully.');
          this.loadDocumentCategories();
        },
        error: (err: any) => {
          this.isSavingCategory = false;
          this.toast.error(err?.error?.message || 'Failed to update document category.');
        }
      });
    } else {
      this.workforceService.createDocumentCategory(this.categoryForm).subscribe({
        next: () => {
          this.isSavingCategory = false;
          this.showCategoryModal = false;
          this.toast.success('New document category created.');
          this.loadDocumentCategories();
        },
        error: (err: any) => {
          this.isSavingCategory = false;
          this.toast.error(err?.error?.message || 'Failed to create document category.');
        }
      });
    }
  }

  deleteCategory(cat: DocumentCategoryItem): void {
    if (!confirm(`Are you sure you want to delete category '${cat.name}'?`)) return;

    this.workforceService.deleteDocumentCategory(cat.id).subscribe({
      next: () => {
        this.toast.success(`Category '${cat.name}' removed.`);
        this.loadDocumentCategories();
      },
      error: (err: any) => {
        this.toast.error(err?.error?.message || 'Failed to delete category.');
      }
    });
  }
}
