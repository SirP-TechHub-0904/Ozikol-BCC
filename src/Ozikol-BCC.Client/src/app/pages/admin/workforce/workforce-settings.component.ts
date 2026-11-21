import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { WorkforceService } from '../../../core/services/workforce.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';

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
  compensationBasis?: 'Hourly' | 'Monthly';
  monthlySalary?: number;
  contractedWeeklyHours?: number;
  defaultHourlyRate: number;
  billingChargeRate: number;
  mandatorySiaSector?: string;
  badgeColor?: string;
  isActive: boolean;
  sortOrder: number;
  assignedStaffCount: number;
}

export interface EmergencyCategoryItem {
  id: string;
  name: string;
  icon: string;
  materialIcon: string;
  severity: 'Critical' | 'High' | 'Medium';
  description: string;
  isActive: boolean;
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
  emergencyCategoriesJson?: string;
}

@Component({
  selector: 'app-workforce-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="settings-page">
      <!-- Canonical Dashboard Page Header -->
      <div class="page-header">
        <div class="header-left">
          <nav class="breadcrumb-nav">
            <a routerLink="/admin/dashboard" class="crumb-root" style="color: #0050e5; text-decoration: none; font-weight: 600;">Command Center</a>
            <span class="crumb-sep">/</span>
            <span class="crumb-parent">Workforce &amp; Shifts</span>
            <span class="crumb-sep">/</span>
            <span class="crumb-active">Rota Settings</span>
          </nav>
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
          <a routerLink="/workforce/console/schedule" class="btn btn-outline" title="Back to Rota & Shift Management">
            <span class="material-symbols-outlined">arrow_back</span>
            <span>Back to Rota</span>
          </a>
          <button type="button" class="btn btn-outline" (click)="loadAllData()">
            <span class="material-symbols-outlined" [class.spin]="isLoading">refresh</span> Refresh
          </button>
          <button
            type="button"
            class="btn btn-primary"
            *ngIf="activeTab === 'roles'"
            (click)="openRoleModal()"
          >
            <span class="material-symbols-outlined">add</span> Add Job Role
          </button>
          <button
            type="button"
            class="btn btn-primary"
            *ngIf="activeTab === 'staff-types'"
            (click)="openStaffTypeModal()"
          >
            <span class="material-symbols-outlined">add</span> Add Staff Classification
          </button>
          <button
            type="button"
            class="btn btn-primary"
            *ngIf="activeTab === 'documents'"
            (click)="openCategoryModal()"
          >
            <span class="material-symbols-outlined">add</span> Add Document Category
          </button>
          <button
            type="button"
            class="btn btn-primary"
            *ngIf="activeTab === 'breaks'"
            (click)="savePolicies()"
            [disabled]="isSavingPolicies"
          >
            <span class="material-symbols-outlined" *ngIf="!isSavingPolicies">save</span>
            <span class="material-symbols-outlined spin" *ngIf="isSavingPolicies">sync</span>
            {{ isSavingPolicies ? 'Saving...' : 'Save Policies' }}
          </button>
          <button
            type="button"
            class="btn btn-primary"
            *ngIf="activeTab === 'emergency'"
            (click)="openEmergencyCategoryModal()"
          >
            <span class="material-symbols-outlined">add</span> Add Incident Category
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
          <span>Job Roles</span>
          <span class="tab-count">{{ jobRoles.length }}</span>
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

        <button
          type="button"
          class="tab-btn"
          [class.active]="activeTab === 'emergency'"
          (click)="activeTab = 'emergency'"
        >
          <span class="material-symbols-outlined" style="color: #dc2626;">e911</span>
          <span>Emergency SOS Protocols</span>
          <span class="tab-count">{{ emergencyCategories.length }}</span>
        </button>
      </div>

      <!-- ========================================================================= -->
      <!-- TAB 1: JOB ROLES -->
      <!-- ========================================================================= -->
      <div class="tab-pane" *ngIf="activeTab === 'roles'">
        <div class="content-card">
          <div class="card-header-bar">
            <div class="header-bar-left">
              <span class="material-symbols-outlined text-blue">work</span>
              <div>
                <h3 class="card-heading">Configured Job Roles</h3>
                <p class="card-sub">Roles available for staff assignment across client sites and shifts.</p>
              </div>
            </div>
          </div>

          <div class="table-responsive">
            <table class="settings-table">
              <thead>
                <tr>
                  <th style="width: 70px;">S/N</th>
                  <th>Job Role Title</th>
                  <th style="text-align: right; width: 140px;">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let r of jobRoles; let i = index">
                  <td>
                    <span class="sn-badge">{{ i + 1 }}</span>
                  </td>
                  <td>
                    <div class="title-cell">
                      <strong>{{ r.title }}</strong>
                    </div>
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
                  <td colspan="3" class="empty-state">
                    No job roles configured yet. Click "+ Add Job Role" to create your first operational role.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ========================================================================= -->
      <!-- TAB 2: MEAL & REST BREAKS -->
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
      <!-- TAB 5: EMERGENCY SOS PROTOCOLS & SECURITY INCIDENT TAXONOMY -->
      <!-- ========================================================================= -->
      <div class="tab-pane" *ngIf="activeTab === 'emergency'">
        <div class="content-card">
          <div class="card-header-bar">
            <div class="header-bar-left">
              <span class="material-symbols-outlined" style="color: #dc2626;">e911</span>
              <div>
                <h3 class="card-heading">Emergency &amp; Security Incident Protocols</h3>
                <p class="card-sub">
                  Dynamic emergency categories for your business. When staff trigger Emergency SOS on duty, these categories appear in real-time.
                </p>
              </div>
            </div>
            <div class="header-bar-right d-flex gap-2">
              <button type="button" class="btn btn-outline btn-sm" (click)="resetEmergencyCategoriesToDefault()" title="Restore platform baseline categories">
                <span class="material-symbols-outlined">restart_alt</span> Reset to Baseline
              </button>
              <button type="button" class="btn btn-primary btn-sm" (click)="openEmergencyCategoryModal()">
                <span class="material-symbols-outlined">add</span> Add Incident Category
              </button>
            </div>
          </div>

          <!-- Explanatory Banner -->
          <div class="alert-box mb-4" style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 14px 16px; display: flex; align-items: flex-start; gap: 12px;">
            <span class="material-symbols-outlined" style="color: #dc2626; font-size: 24px; flex-shrink: 0;">security_update_warning</span>
            <div style="font-size: 13px; line-height: 1.5; color: #991b1b;">
              <strong>Multi-Industry Operational Emergency Taxonomies:</strong> Different businesses (corporate security, hospital/care facilities, hospitality, logistics, event stewarding) have unique emergency incident types. Staff on active duty can trigger Emergency SOS from their active shift; doing so immediately broadcasts high-urgency alerts across <strong>SMS, Email, WhatsApp, and Web Push notifications</strong> to administrators and dispatch controllers.
            </div>
          </div>

          <div class="table-responsive">
            <table class="settings-table">
              <thead>
                <tr>
                  <th style="width: 50px;">Icon</th>
                  <th>Category Name</th>
                  <th>Severity</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th style="text-align: right; width: 140px;">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let cat of emergencyCategories">
                  <td>
                    <span style="font-size: 22px;">{{ cat.icon || '🚨' }}</span>
                  </td>
                  <td>
                    <strong>{{ cat.name }}</strong>
                  </td>
                  <td>
                    <span class="status-badge" [ngClass]="cat.severity === 'Critical' ? 'status-danger' : (cat.severity === 'High' ? 'status-warning' : 'status-info')">
                      {{ cat.severity }}
                    </span>
                  </td>
                  <td style="color: #64748b; font-size: 13px; max-width: 320px;">
                    {{ cat.description }}
                  </td>
                  <td>
                    <button type="button" class="status-toggle-btn" (click)="toggleEmergencyCategory(cat)" [class.active]="cat.isActive" style="background: none; border: none; cursor: pointer; padding: 0;">
                      <span class="status-badge" [ngClass]="cat.isActive ? 'active' : 'idle'">
                        {{ cat.isActive ? 'Active' : 'Disabled' }}
                      </span>
                    </button>
                  </td>
                  <td style="text-align: right;">
                    <button type="button" class="action-btn" (click)="openEmergencyCategoryModal(cat)" title="Edit Category">
                      <span class="material-symbols-outlined">edit</span>
                    </button>
                    <button type="button" class="action-btn text-danger" (click)="deleteEmergencyCategory(cat.id)" title="Delete Category">
                      <span class="material-symbols-outlined">delete</span>
                    </button>
                  </td>
                </tr>
                <tr *ngIf="emergencyCategories.length === 0">
                  <td colspan="6" class="empty-state-cell">
                    <p>No emergency incident categories configured. Click "+ Add Incident Category" or "Reset to Baseline".</p>
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
        <div class="modal-card" style="max-width: 480px;" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div class="modal-title-group">
              <span class="material-symbols-outlined text-blue">work</span>
              <div>
                <h3>{{ isEditingRole ? 'Edit Job Role' : 'Add New Job Role' }}</h3>
                <p class="modal-subtitle">Enter the operational job role title.</p>
              </div>
            </div>
            <button type="button" class="btn-close" (click)="closeRoleModal()">&times;</button>
          </div>

          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Role Title <span class="required">*</span></label>
              <input
                type="text"
                class="form-control"
                [(ngModel)]="roleForm.title"
                placeholder="e.g. Security Officer, Supervisor, Receptionist"
                required
              />
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-outline" (click)="closeRoleModal()">Cancel</button>
            <button type="button" class="btn btn-primary" (click)="saveRole()" [disabled]="isSavingRole || !roleForm.title?.trim()">
              <span class="material-symbols-outlined" *ngIf="!isSavingRole">save</span>
              <span class="material-symbols-outlined spin" *ngIf="isSavingRole">sync</span>
              {{ isSavingRole ? 'Saving...' : (isEditingRole ? 'Update Role' : 'Save Job Role') }}
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
                placeholder="e.g. Permanent Staff, Temporal Staff, Contract Staff, Student"
                required
              />
            </div>

            <div class="form-group">
              <label class="form-label">Code</label>
              <input
                type="text"
                class="form-control"
                [(ngModel)]="staffTypeForm.code"
                placeholder="e.g. PERM, TEMP, CONT, STU"
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
                  placeholder="e.g. Professional License"
                  required
                />
              </div>

              <div class="form-group">
                <label class="form-label">Short Code <span class="required">*</span></label>
                <input
                  type="text"
                  class="form-control text-uppercase"
                  [(ngModel)]="categoryForm.code"
                  placeholder="e.g. LIC, RTW, DBS"
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
                <div class="checkbox-row">
                  <input type="checkbox" id="catMandatory" [(ngModel)]="categoryForm.isMandatory" />
                  <label for="catMandatory">Required before staff deployment</label>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Track Expiration &amp; Alerts</label>
                <div class="checkbox-row">
                  <input type="checkbox" id="catExpiry" [(ngModel)]="categoryForm.requiresExpiryDate" />
                  <label for="catExpiry">Alert managers before document expires</label>
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
                <div class="checkbox-row">
                  <input type="checkbox" id="catActive" [(ngModel)]="categoryForm.isActive" />
                  <label for="catActive">Active for selection</label>
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
      <!-- MODAL: ADD / EDIT EMERGENCY SOS CATEGORY -->
      <!-- ========================================================================= -->
      <div class="modal-backdrop" *ngIf="showEmergencyModal" (click)="closeEmergencyCategoryModal()">
        <div class="modal-card" style="max-width: 520px;" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div class="modal-title-group">
              <span class="material-symbols-outlined" style="color: #dc2626;">e911</span>
              <div>
                <h3>{{ isEditingEmergencyCategory ? 'Edit Emergency Category' : 'Add Incident Category' }}</h3>
                <p class="modal-subtitle">Define emergency classifications for staff SOS panic dispatches.</p>
              </div>
            </div>
            <button type="button" class="btn-close" (click)="closeEmergencyCategoryModal()">&times;</button>
          </div>

          <div class="modal-body">
            <div class="form-row-dual">
              <div class="form-group" style="max-width: 120px;">
                <label class="form-label">Emoji Icon <span class="required">*</span></label>
                <input
                  type="text"
                  class="form-control text-center"
                  style="font-size: 20px;"
                  [(ngModel)]="emergencyForm.icon"
                  placeholder="e.g. 🚨"
                  maxlength="4"
                  required
                />
              </div>

              <div class="form-group" style="flex: 1;">
                <label class="form-label">Category Name <span class="required">*</span></label>
                <input
                  type="text"
                  class="form-control"
                  [(ngModel)]="emergencyForm.name"
                  placeholder="e.g. Intruder / Unauthorized Access"
                  required
                />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Quick Icon Selection</label>
              <div class="d-flex gap-2 flex-wrap">
                <button
                  type="button"
                  *ngFor="let ic of ['🚨', '⚠️', '🩺', '🔥', '💣', '🚪', '⚡', '💧', '☣️']"
                  class="btn btn-outline btn-sm px-2 py-1"
                  [style.border-color]="emergencyForm.icon === ic ? '#dc2626' : '#e2e8f0'"
                  [style.background]="emergencyForm.icon === ic ? '#fee2e2' : '#ffffff'"
                  (click)="emergencyForm.icon = ic"
                >
                  {{ ic }}
                </button>
              </div>
            </div>

            <div class="form-row-dual">
              <div class="form-group">
                <label class="form-label">Severity Level</label>
                <select class="form-control" [(ngModel)]="emergencyForm.severity">
                  <option value="Critical">Critical (Immediate Response)</option>
                  <option value="High">High (Urgent Escalation)</option>
                  <option value="Medium">Medium (Prompt Intervention)</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Status</label>
                <div class="checkbox-row" style="margin-top: 10px;">
                  <input type="checkbox" id="emActive" [(ngModel)]="emergencyForm.isActive" />
                  <label for="emActive">Active for staff SOS selection</label>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Description &amp; Operational Instructions</label>
              <textarea
                class="form-control"
                rows="3"
                [(ngModel)]="emergencyForm.description"
                placeholder="e.g. Unidentified individual or trespasser trespassing inside secure boundary."
              ></textarea>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-outline" (click)="closeEmergencyCategoryModal()">Cancel</button>
            <button
              type="button"
              class="btn btn-primary"
              (click)="saveEmergencyCategory()"
              [disabled]="isSavingEmergencyCategory || !emergencyForm.name?.trim()"
            >
              <span class="material-symbols-outlined" *ngIf="!isSavingEmergencyCategory">save</span>
              <span class="material-symbols-outlined spin" *ngIf="isSavingEmergencyCategory">sync</span>
              {{ isSavingEmergencyCategory ? 'Saving...' : (isEditingEmergencyCategory ? 'Update Category' : 'Save Category') }}
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
              <p>Job roles eliminate free-text discrepancies. When you allocate a staff member under a role, their base hourly pay automatically inherits these configured defaults.</p>
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
      align-items: center;
      flex-wrap: wrap;
      background: #ffffff;
      padding: 18px 22px;
      border-radius: 14px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02);
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
      flex-shrink: 0;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      height: 40px;
      padding: 0 1rem;
      font-size: 0.875rem;
      font-weight: 600;
      line-height: 1;
      white-space: nowrap;
      text-decoration: none;
      box-sizing: border-box;
      border-radius: 0.5rem;
      border: 1px solid transparent;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn .material-symbols-outlined {
      font-size: 18px;
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

    .sn-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      background: #f8fafc;
      color: #334155;
      font-weight: 700;
      font-size: 12px;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
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
      gap: 1.25rem;
      width: 100%;
      box-sizing: border-box;
    }

    @media (max-width: 640px) {
      .form-row-dual {
        grid-template-columns: 1fr;
      }
    }

    /* Mobile & Tablet Responsive Layout (header stacks, actions wrap, tables scroll horizontally) */
    @media (max-width: 768px) {
      .settings-page {
        padding: 1rem 0.75rem;
      }
      .breadcrumb-nav {
        flex-wrap: wrap;
        row-gap: 0.25rem;
        font-size: 0.75rem;
      }
      .page-header {
        flex-direction: column;
        align-items: stretch;
        gap: 1rem;
      }
      .header-left {
        min-width: 0;
      }
      .title-row {
        flex-wrap: wrap;
        gap: 0.5rem;
      }
      .page-title {
        font-size: 1.3rem;
      }
      .suite-pill {
        white-space: nowrap;
      }
      .page-subtitle {
        font-size: 0.8125rem;
      }
      .header-actions {
        width: 100%;
        justify-content: stretch;
        gap: 0.5rem;
      }
      .header-actions .btn {
        flex: 1 1 calc(50% - 0.5rem);
        min-width: 0;
        padding: 0 0.75rem;
      }
      .header-actions .btn-primary {
        flex-basis: 100%;
      }
      .tab-btn {
        flex-shrink: 0;
        white-space: nowrap;
        padding: 0.65rem 0.9rem;
      }
      .card-header-bar {
        flex-wrap: wrap;
        gap: 0.75rem;
        padding: 1rem !important;
      }
      .header-bar-left {
        min-width: 0;
      }
      .table-responsive {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
      }
      .settings-table {
        min-width: 720px;
      }
      .settings-table th {
        white-space: nowrap;
      }
      .settings-table td {
        vertical-align: middle;
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

    /* Form Builder Redirect Box */
    .form-builder-redirect-card {
      padding: 2.5rem 2rem;
      background: #f8fafc;
      border: 1px dashed #cbd5e1;
      border-radius: 0.75rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 1.5rem;
      margin: 1rem 0;
    }

    .redirect-icon-wrapper {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: #eff6ff;
      color: #0050e5;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .redirect-icon-wrapper span {
      font-size: 2.25rem;
    }

    .redirect-info-text h4 {
      font-size: 1.125rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 0.5rem 0;
    }

    .redirect-info-text p {
      font-size: 0.875rem;
      color: #475569;
      max-width: 580px;
      margin: 0 auto 0.5rem auto;
      line-height: 1.5;
    }

    .redirect-info-text .redirect-sub {
      font-size: 0.8125rem;
      color: #64748b;
      margin-top: 0.25rem;
    }

    .redirect-action-box {
      margin-top: 0.5rem;
    }

    .btn-lg {
      padding: 0.75rem 1.75rem;
      font-size: 0.9375rem;
      font-weight: 600;
      gap: 0.625rem;
      border-radius: 0.5rem;
    }

    /* Radio Tab Toggle for Compensation Basis */
    .radio-tab-toggle {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
      background: #f1f5f9;
      padding: 0.25rem;
      border-radius: 0.5rem;
    }

    .toggle-choice-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.625rem 1rem;
      border: none;
      background: transparent;
      border-radius: 0.375rem;
      font-size: 0.8125rem;
      font-weight: 600;
      color: #64748b;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .toggle-choice-btn.active {
      background: #ffffff;
      color: #0050e5;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .wage-tag.salary {
      background-color: #f5f3ff;
      color: #7c3aed;
      border: 1px solid #ddd6fe;
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
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .modal-body .form-group {
      margin-bottom: 0;
    }

    .checkbox-row {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      min-height: 38px;
    }

    .checkbox-row input[type="checkbox"] {
      width: 18px;
      height: 18px;
      accent-color: #0050e5;
      cursor: pointer;
      margin: 0;
      flex-shrink: 0;
    }

    .checkbox-row label {
      margin: 0;
      color: #334155;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      line-height: 1.25;
      user-select: none;
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
  activeTab: 'roles' | 'breaks' | 'forms' | 'staff-types' | 'documents' | 'emergency' = 'roles';
  isLoading = false;

  currencyCode = 'NGN';
  currencySymbol = '₦';

  // Emergency SOS Incident Categories State
  emergencyCategories: EmergencyCategoryItem[] = [];
  showEmergencyModal = false;
  isEditingEmergencyCategory = false;
  isSavingEmergencyCategory = false;
  emergencyForm: Partial<EmergencyCategoryItem> = {
    id: '',
    name: '',
    icon: '🚨',
    materialIcon: 'warning',
    severity: 'Critical',
    description: '',
    isActive: true
  };

  // Job Roles State
  jobRoles: JobRoleItem[] = [];
  showRoleModal = false;
  isEditingRole = false;
  isSavingRole = false;
  roleForm: Partial<JobRoleItem> = {
    title: '',
    code: '',
    description: '',
    compensationBasis: 'Hourly',
    monthlySalary: undefined,
    contractedWeeklyHours: 40,
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
    private toast: ToastService,
    private confirmDialog: ConfirmDialogService
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
      compensationBasis: 'Hourly',
      contractedWeeklyHours: 40,
      defaultHourlyRate: 0,
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
    if (!this.roleForm.title?.trim()) {
      this.toast.error('Please enter a Role Title.');
      return;
    }

    if (!this.roleForm.code?.trim()) {
      const words = this.roleForm.title.trim().split(/\s+/);
      const code = words.length > 1
        ? (words[0][0] + words[1][0] + (words[2] ? words[2][0] : '')).toUpperCase()
        : this.roleForm.title.trim().substring(0, 4).toUpperCase();
      this.roleForm.code = code || 'ROLE';
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

  async deleteRole(role: JobRoleItem): Promise<void> {
    const ok = await this.confirmDialog.confirm({
      title: 'Delete Job Role?',
      message: `Are you sure you want to delete role '${role.title}'? This role will no longer be available for assignment.`,
      confirmLabel: 'Delete Role',
      cancelLabel: 'Cancel',
      isDestructive: true
    });
    if (!ok) return;

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
          if (this.policies.emergencyCategoriesJson) {
            try {
              const parsed = JSON.parse(this.policies.emergencyCategoriesJson);
              this.emergencyCategories = Array.isArray(parsed) && parsed.length > 0 ? parsed : this.getDefaultEmergencyCategories();
            } catch {
              this.emergencyCategories = this.getDefaultEmergencyCategories();
            }
          } else {
            this.emergencyCategories = this.getDefaultEmergencyCategories();
          }
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

  async deleteStaffType(type: StaffTypeItem): Promise<void> {
    if (type.isCompulsory) {
      this.toast.error(`Classification '${type.name}' is compulsory and cannot be deleted.`);
      return;
    }
    const ok = await this.confirmDialog.confirm({
      title: 'Delete Staff Classification?',
      message: `Are you sure you want to delete classification '${type.name}'?`,
      confirmLabel: 'Delete Classification',
      cancelLabel: 'Cancel',
      isDestructive: true
    });
    if (!ok) return;

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

  async deleteCategory(cat: DocumentCategoryItem): Promise<void> {
    const ok = await this.confirmDialog.confirm({
      title: 'Delete Document Category?',
      message: `Are you sure you want to delete category '${cat.name}'?`,
      confirmLabel: 'Delete Category',
      cancelLabel: 'Cancel',
      isDestructive: true
    });
    if (!ok) return;

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

  // --- EMERGENCY SOS PROTOCOLS LOGIC ---
  getDefaultEmergencyCategories(): EmergencyCategoryItem[] {
    return [
      { id: 'cat-intruder', name: 'Intruder / Unauthorized Access', icon: '🚨', materialIcon: 'sensor_occupied', severity: 'Critical', description: 'Unidentified individual or trespasser trespassing inside secure boundary.', isActive: true },
      { id: 'cat-violence', name: 'Violence / Threat of Assault', icon: '⚠️', materialIcon: 'personal_injury', severity: 'Critical', description: 'Physical altercation, verbal intimidation, or imminent threat of physical assault.', isActive: true },
      { id: 'cat-medical', name: 'Medical Emergency / Officer Down', icon: '🩺', materialIcon: 'emergency', severity: 'Critical', description: 'Unresponsive person, severe injury, collapse, or medical distress requiring ambulance.', isActive: true },
      { id: 'cat-fire', name: 'Fire / Chemical / Environmental Hazard', icon: '🔥', materialIcon: 'local_fire_department', severity: 'Critical', description: 'Smoke, active fire outbreak, gas smell, chemical spill, or structural danger.', isActive: true },
      { id: 'cat-suspicious', name: 'Suspicious Package / Behavior', icon: '💣', materialIcon: 'package_2', severity: 'High', description: 'Unattended bag, anomalous vehicle, or perimeter reconnaissance behavior.', isActive: true },
      { id: 'cat-burglary', name: 'Forced Entry / Burglary / Theft', icon: '🚪', materialIcon: 'door_sensor', severity: 'High', description: 'Compromised locks, broken windows, alarm activation, or property theft.', isActive: true }
    ];
  }

  openEmergencyCategoryModal(cat?: EmergencyCategoryItem): void {
    if (cat) {
      this.isEditingEmergencyCategory = true;
      this.emergencyForm = { ...cat };
    } else {
      this.isEditingEmergencyCategory = false;
      this.emergencyForm = {
        id: 'cat-' + Math.random().toString(36).substring(2, 9),
        name: '',
        icon: '🚨',
        materialIcon: 'warning',
        severity: 'Critical',
        description: '',
        isActive: true
      };
    }
    this.showEmergencyModal = true;
  }

  closeEmergencyCategoryModal(): void {
    this.showEmergencyModal = false;
  }

  saveEmergencyCategory(): void {
    if (!this.emergencyForm.name?.trim()) return;

    this.isSavingEmergencyCategory = true;
    const catItem: EmergencyCategoryItem = {
      id: this.emergencyForm.id || ('cat-' + Math.random().toString(36).substring(2, 9)),
      name: this.emergencyForm.name.trim(),
      icon: this.emergencyForm.icon || '🚨',
      materialIcon: this.emergencyForm.materialIcon || 'warning',
      severity: this.emergencyForm.severity || 'Critical',
      description: this.emergencyForm.description?.trim() || '',
      isActive: this.emergencyForm.isActive ?? true
    };

    if (this.isEditingEmergencyCategory) {
      const idx = this.emergencyCategories.findIndex(c => c.id === catItem.id);
      if (idx !== -1) {
        this.emergencyCategories[idx] = catItem;
      }
    } else {
      this.emergencyCategories.push(catItem);
    }

    this.persistEmergencyCategories('Emergency incident category saved.');
  }

  toggleEmergencyCategory(cat: EmergencyCategoryItem): void {
    cat.isActive = !cat.isActive;
    this.persistEmergencyCategories(`Category '${cat.name}' ${cat.isActive ? 'activated' : 'disabled'}.`);
  }

  async deleteEmergencyCategory(id: string): Promise<void> {
    const target = this.emergencyCategories.find(c => c.id === id);
    const ok = await this.confirmDialog.confirm({
      title: 'Delete Incident Category?',
      message: `Are you sure you want to delete category '${target?.name || id}'?`,
      confirmLabel: 'Delete Category',
      cancelLabel: 'Cancel',
      isDestructive: true
    });
    if (!ok) return;

    this.emergencyCategories = this.emergencyCategories.filter(c => c.id !== id);
    this.persistEmergencyCategories('Category deleted successfully.');
  }

  async resetEmergencyCategoriesToDefault(): Promise<void> {
    const ok = await this.confirmDialog.confirm({
      title: 'Reset to Baseline Defaults?',
      message: 'Restore standard baseline emergency categories (Intruder, Violence, Medical, Fire, Suspicious Package, Forced Entry)? Custom additions will be overwritten.',
      confirmLabel: 'Reset Defaults',
      cancelLabel: 'Cancel'
    });
    if (!ok) return;

    this.emergencyCategories = this.getDefaultEmergencyCategories();
    this.persistEmergencyCategories('Emergency protocols reset to baseline defaults.');
  }

  private persistEmergencyCategories(successMessage: string): void {
    this.policies.emergencyCategoriesJson = JSON.stringify(this.emergencyCategories);
    this.workforceService.updateWorkforcePolicies(this.policies).subscribe({
      next: () => {
        this.isSavingEmergencyCategory = false;
        this.showEmergencyModal = false;
        this.toast.success(successMessage);
      },
      error: (err: any) => {
        this.isSavingEmergencyCategory = false;
        this.toast.error(err?.error?.message || 'Failed to persist emergency protocols.');
      }
    });
  }
}
