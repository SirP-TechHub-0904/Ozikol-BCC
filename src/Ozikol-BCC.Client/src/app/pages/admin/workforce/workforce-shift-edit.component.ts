import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { WorkforceService, ClientSite } from '../../../core/services/workforce.service';
import { ToastService } from '../../../core/services/toast.service';

/**
 * Interface representing a job role with compensation basis.
 */
interface JobRole {
  id: string;
  title: string;
  code: string;
  description?: string;
  compensationBasis?: 'Hourly' | 'Monthly';
  monthlySalary?: number;
  contractedWeeklyHours?: number;
  defaultHourlyRate?: number;
  billingChargeRate?: number;
  badgeColor?: string;
}

/**
 * Interface representing an enrolled workforce staff member.
 */
interface StaffMember {
  userId: string;
  fullName: string;
  jobTitle?: string;
  defaultHourlyRate?: number;
  contractedWeeklyHours?: number;
  preferredWorkingTime?: string;
  workingAvailability?: string;
}

/**
 * Dedicated Page Component for Creating & Editing Work Schedules, Recurring Routines, and Shifts.
 * Route: `/workforce/console/schedule/create` and `/workforce/console/schedule/edit/:id`
 * Supports:
 * - Regular Daily Routines (e.g., 8:00 AM - 5:00 PM Mon-Fri across date ranges)
 * - Rotational Shift Patterns (Day/Night windows, cross-midnight overnight logic)
 * - Single / Ad-Hoc Shifts
 * - Multi-industry universal terminology for hourly and monthly salaried staff.
 */
@Component({
  selector: 'app-workforce-shift-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="bcp-page-container">
      <!-- 1. Breadcrumbs & Page Header -->
      <div class="page-header">
        <div class="header-left">
          <div class="breadcrumb">
            <a routerLink="/admin/dashboard">Command Center</a>
            <span class="sep">/</span>
            <span>Workforce &amp; Shifts</span>
            <span class="sep">/</span>
            <a routerLink="/workforce/console/schedule">Staff Rota &amp; Schedule</a>
            <span class="sep">/</span>
            <span class="current">{{ isEditMode ? 'Edit Shift' : 'Create Work Schedule' }}</span>
          </div>
          <div class="title-row">
            <h1>{{ isEditMode ? ('Edit Shift: ' + shiftCode) : 'Create Work Schedule &amp; Assignment' }}</h1>
            <button
              type="button"
              class="info-badge-btn"
              (click)="showInfoModal = true"
              title="Click to view work schedule patterns and guide"
            >
              <span class="material-symbols-outlined">info</span>
            </button>
            <span class="badge-suite">Suite: Workforce &amp; Shifts</span>
          </div>
          <p class="subtitle">
            Configure daily routines, recurring shifts, or ad-hoc duty assignments for both hourly and salaried staff across all industries.
          </p>
        </div>
        <div class="header-actions">
          <a routerLink="/workforce/console/schedule" class="btn btn-outline" title="Return to master rota grid">
            <span class="material-symbols-outlined">arrow_back</span>
            <span>Back to Rota</span>
          </a>
          <button
            type="button"
            class="btn btn-primary"
            (click)="saveSchedule()"
            [disabled]="isSaving || isLoading"
          >
            <span class="material-symbols-outlined" *ngIf="!isSaving">save</span>
            <span class="material-symbols-outlined spin" *ngIf="isSaving">sync</span>
            <span>{{ isSaving ? 'Saving...' : (isEditMode ? 'Update Shift' : 'Generate & Assign Schedule') }}</span>
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div class="cms-loading-card" *ngIf="isLoading">
        <span class="material-symbols-outlined spin">progress_activity</span>
        <p>Loading schedule configuration and work locations...</p>
      </div>

      <!-- Main Form Layout (2 Columns Responsive) -->
      <form (ngSubmit)="saveSchedule()" *ngIf="!isLoading" class="schedule-form-layout">
        <!-- Left Column: Pattern, Times, Location & Personnel -->
        <div class="form-column">
          <!-- Card 1: Schedule Pattern Selector (Create Mode Only) -->
          <div class="cms-card" *ngIf="!isEditMode">
            <div class="card-header">
              <div class="card-title-group">
                <span class="material-symbols-outlined text-blue">event_repeat</span>
                <div>
                  <h3>Work Schedule Pattern &amp; Frequency</h3>
                  <p class="card-subtitle">Select the working arrangement that matches your operational needs.</p>
                </div>
              </div>
            </div>

            <div class="card-body">
              <div class="pattern-selector-grid">
                <!-- Pattern 1: Regular Daily Routine -->
                <div
                  class="pattern-card"
                  [class.selected]="schedulePattern === 'Daily'"
                  (click)="setPattern('Daily')"
                >
                  <div class="pattern-icon-box">
                    <span class="material-symbols-outlined">business</span>
                  </div>
                  <div class="pattern-details">
                    <span class="pattern-title">Regular Daily Routine</span>
                    <span class="pattern-desc">Fixed daily working hours (e.g. 8:00 AM - 5:00 PM Mon to Fri) across weeks or months.</span>
                  </div>
                  <span class="pattern-radio"></span>
                </div>

                <!-- Pattern 2: Shift / Rota Pattern -->
                <div
                  class="pattern-card"
                  [class.selected]="schedulePattern === 'ShiftRota'"
                  (click)="setPattern('ShiftRota')"
                >
                  <div class="pattern-icon-box">
                    <span class="material-symbols-outlined">sync_alt</span>
                  </div>
                  <div class="pattern-details">
                    <span class="pattern-title">Shift / Rota Pattern</span>
                    <span class="pattern-desc">Rotating day, evening, or overnight windows (e.g. 12h shifts, 24/7 care or facilities).</span>
                  </div>
                  <span class="pattern-radio"></span>
                </div>

                <!-- Pattern 3: Single / Ad-Hoc Shift -->
                <div
                  class="pattern-card"
                  [class.selected]="schedulePattern === 'AdHoc'"
                  (click)="setPattern('AdHoc')"
                >
                  <div class="pattern-icon-box">
                    <span class="material-symbols-outlined">bolt</span>
                  </div>
                  <div class="pattern-details">
                    <span class="pattern-title">Single / Ad-Hoc Shift</span>
                    <span class="pattern-desc">A one-off specific shift, emergency cover, or event assignment.</span>
                  </div>
                  <span class="pattern-radio"></span>
                </div>
              </div>
            </div>
          </div>

          <!-- Card 2: Schedule Working Hours & Calendar Dates -->
          <div class="cms-card">
            <div class="card-header">
              <div class="card-title-group">
                <span class="material-symbols-outlined text-blue">schedule</span>
                <div>
                  <h3>Working Hours &amp; Calendar Range</h3>
                  <p class="card-subtitle">Specify active operational dates, daily work times, and break allowances.</p>
                </div>
              </div>
            </div>

            <div class="card-body">
              <!-- Regular Daily Pattern Settings -->
              <ng-container *ngIf="!isEditMode && schedulePattern === 'Daily'">
                <div class="form-row-dual">
                  <div class="form-group">
                    <label class="form-label">Effective Start Date <span class="required">*</span></label>
                    <input
                      type="date"
                      class="form-control"
                      [(ngModel)]="startDate"
                      name="startDate"
                      (change)="recalculateScheduleMetrics()"
                      required
                    />
                    <span class="field-hint">First date of recurring schedule.</span>
                  </div>

                  <div class="form-group">
                    <label class="form-label">Effective End Date <span class="required">*</span></label>
                    <input
                      type="date"
                      class="form-control"
                      [(ngModel)]="endDate"
                      name="endDate"
                      (change)="recalculateScheduleMetrics()"
                      required
                    />
                    <span class="field-hint">Concludes the recurring batch.</span>
                  </div>
                </div>

                <!-- Days of Week Selector -->
                <div class="form-group">
                  <div class="label-with-action">
                    <label class="form-label">Active Working Days <span class="required">*</span></label>
                    <div class="quick-day-actions">
                      <button type="button" class="btn-text-sm" (click)="setWeekdaysOnly()">Mon - Fri</button>
                      <button type="button" class="btn-text-sm" (click)="toggleWeekends()">Include Weekends</button>
                      <button type="button" class="btn-text-sm" (click)="selectAllDays()">All 7 Days</button>
                    </div>
                  </div>

                  <div class="days-chips-row">
                    <button
                      type="button"
                      *ngFor="let d of daysOfWeekList"
                      class="day-chip"
                      [class.active]="selectedDays.includes(d.id)"
                      (click)="toggleDay(d.id)"
                    >
                      {{ d.label }}
                    </button>
                  </div>
                </div>

                <!-- Daily Times -->
                <div class="form-row-dual">
                  <div class="form-group">
                    <label class="form-label">Daily Work Start Time <span class="required">*</span></label>
                    <input
                      type="time"
                      class="form-control"
                      [(ngModel)]="dailyStartTime"
                      name="dailyStartTime"
                      (change)="recalculateScheduleMetrics()"
                      required
                    />
                    <span class="field-hint">e.g. 08:00 AM</span>
                  </div>

                  <div class="form-group">
                    <label class="form-label">Daily Work End Time <span class="required">*</span></label>
                    <input
                      type="time"
                      class="form-control"
                      [(ngModel)]="dailyEndTime"
                      name="dailyEndTime"
                      (change)="recalculateScheduleMetrics()"
                      required
                    />
                    <span class="field-hint">e.g. 17:00 (5:00 PM)</span>
                  </div>
                </div>
              </ng-container>

              <!-- Shift Rota Pattern Settings -->
              <ng-container *ngIf="!isEditMode && schedulePattern === 'ShiftRota'">
                <div class="preset-windows-bar">
                  <span class="preset-label">Shift Presets:</span>
                  <button type="button" class="btn-preset" (click)="applyPreset('Day')">Day (08:00 - 20:00)</button>
                  <button type="button" class="btn-preset" (click)="applyPreset('Night')">Night (20:00 - 08:00)</button>
                  <button type="button" class="btn-preset" (click)="applyPreset('Morning')">Morning (07:00 - 15:30)</button>
                  <button type="button" class="btn-preset" (click)="applyPreset('Evening')">Evening (15:00 - 23:00)</button>
                </div>

                <div class="form-row-dual">
                  <div class="form-group">
                    <label class="form-label">Schedule Start Date <span class="required">*</span></label>
                    <input
                      type="date"
                      class="form-control"
                      [(ngModel)]="startDate"
                      name="startDate"
                      (change)="recalculateScheduleMetrics()"
                      required
                    />
                  </div>

                  <div class="form-group">
                    <label class="form-label">Schedule End Date <span class="required">*</span></label>
                    <input
                      type="date"
                      class="form-control"
                      [(ngModel)]="endDate"
                      name="endDate"
                      (change)="recalculateScheduleMetrics()"
                      required
                    />
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label">Shift Duty Days</label>
                  <div class="days-chips-row">
                    <button
                      type="button"
                      *ngFor="let d of daysOfWeekList"
                      class="day-chip"
                      [class.active]="selectedDays.includes(d.id)"
                      (click)="toggleDay(d.id)"
                    >
                      {{ d.label }}
                    </button>
                  </div>
                </div>

                <div class="form-row-dual">
                  <div class="form-group">
                    <label class="form-label">Shift Start Time <span class="required">*</span></label>
                    <input
                      type="time"
                      class="form-control"
                      [(ngModel)]="dailyStartTime"
                      name="dailyStartTime"
                      (change)="recalculateScheduleMetrics()"
                      required
                    />
                  </div>

                  <div class="form-group">
                    <label class="form-label">Shift End Time <span class="required">*</span></label>
                    <input
                      type="time"
                      class="form-control"
                      [(ngModel)]="dailyEndTime"
                      name="dailyEndTime"
                      (change)="recalculateScheduleMetrics()"
                      required
                    />
                  </div>
                </div>
              </ng-container>

              <!-- Single / Ad-Hoc Shift or Edit Mode -->
              <ng-container *ngIf="isEditMode || schedulePattern === 'AdHoc'">
                <div class="form-row-dual">
                  <div class="form-group">
                    <label class="form-label">Duty Start Date &amp; Time (Local) <span class="required">*</span></label>
                    <input
                      type="datetime-local"
                      class="form-control"
                      [(ngModel)]="singleStartDateTime"
                      name="singleStartDateTime"
                      (change)="recalculateScheduleMetrics()"
                      required
                    />
                  </div>

                  <div class="form-group">
                    <label class="form-label">Duty End Date &amp; Time (Local) <span class="required">*</span></label>
                    <input
                      type="datetime-local"
                      class="form-control"
                      [(ngModel)]="singleEndDateTime"
                      name="singleEndDateTime"
                      (change)="recalculateScheduleMetrics()"
                      required
                    />
                  </div>
                </div>
              </ng-container>

              <!-- Break Deduction & Overtime Settings -->
              <div class="form-row-dual">
                <div class="form-group">
                  <label class="form-label">Unpaid Break Deduction (Minutes)</label>
                  <input
                    type="number"
                    min="0"
                    max="180"
                    step="5"
                    class="form-control"
                    [(ngModel)]="breakMinutes"
                    name="breakMinutes"
                    (change)="recalculateScheduleMetrics()"
                    placeholder="e.g. 60"
                  />
                  <span class="field-hint">Deducted from gross duration for billable/payroll hours.</span>
                </div>

                <div class="form-group">
                  <label class="form-label">Overtime Tracking</label>
                  <div class="toggle-control-box">
                    <label class="switch">
                      <input
                        type="checkbox"
                        [(ngModel)]="trackOvertime"
                        name="trackOvertime"
                      />
                      <span class="slider round"></span>
                    </label>
                    <div class="toggle-text">
                      <strong>{{ trackOvertime ? 'Overtime Flagged' : 'Standard Working Time' }}</strong>
                      <span>{{ trackOvertime ? 'Hours exceeding standard shift threshold earn overtime allowance.' : 'Standard remuneration applied.' }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Card 3: Work Location & Facility Details -->
          <div class="cms-card">
            <div class="card-header">
              <div class="card-title-group">
                <span class="material-symbols-outlined text-blue">location_on</span>
                <div>
                  <h3>Work Location &amp; Venue Details</h3>
                  <p class="card-subtitle">Operational branch, company facility, or client premises.</p>
                </div>
              </div>
            </div>

            <div class="card-body">
              <div class="form-row-dual">
                <div class="form-group">
                  <label class="form-label">Work Location <span class="required">*</span></label>
                  <select
                    class="form-control"
                    [(ngModel)]="selectedSiteId"
                    name="selectedSiteId"
                    (change)="onSiteChange()"
                    required
                  >
                    <option value="">Select work location...</option>
                    <option *ngFor="let s of sites" [value]="s.id">{{ s.siteName }} ({{ s.siteCode }})</option>
                  </select>
                  <span class="field-hint">Designated company branch or client premises.</span>
                </div>

                <div class="form-group">
                  <label class="form-label">Branch / Facility / Venue Name</label>
                  <input
                    type="text"
                    class="form-control"
                    [(ngModel)]="facilityName"
                    name="facilityName"
                    placeholder="e.g. Downtown Office, Branch #3, Main Facility"
                  />
                </div>
              </div>

              <div class="form-row-dual">
                <div class="form-group">
                  <label class="form-label">Street Address</label>
                  <input
                    type="text"
                    class="form-control"
                    [(ngModel)]="address"
                    name="address"
                    placeholder="e.g. 45 Business Park Way"
                  />
                </div>

                <div class="form-group">
                  <label class="form-label">Postal Code</label>
                  <input
                    type="text"
                    class="form-control"
                    [(ngModel)]="postCode"
                    name="postCode"
                    placeholder="e.g. EC1A 1BB"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Column: Role, Compensation, Personnel & Live Summary -->
        <div class="form-column">
          <!-- Card 4: Job Role & Compensation Model -->
          <div class="cms-card">
            <div class="card-header">
              <div class="card-title-group">
                <span class="material-symbols-outlined text-blue">badge</span>
                <div>
                  <h3>Job Role &amp; Compensation Model</h3>
                  <p class="card-subtitle">Determines hourly wage or monthly salaried status.</p>
                </div>
              </div>
            </div>

            <div class="card-body">
              <div class="form-group">
                <label class="form-label">Job Role / Position <span class="required">*</span></label>
                <select
                  class="form-control"
                  [(ngModel)]="selectedRoleId"
                  name="selectedRoleId"
                  (change)="onRoleChange()"
                  required
                >
                  <option value="">Select job position...</option>
                  <option *ngFor="let r of jobRoles" [value]="r.id">{{ r.title }} ({{ r.code }})</option>
                </select>
              </div>

              <!-- Position Title Override -->
              <div class="form-group">
                <label class="form-label">Designated Duty Title / Post Name <span class="required">*</span></label>
                <input
                  type="text"
                  class="form-control"
                  [(ngModel)]="postName"
                  name="postName"
                  placeholder="e.g. Front Desk Officer, Project Lead, Duty Supervisor"
                  required
                />
              </div>

              <!-- Compensation Status Notice Card -->
              <div class="compensation-info-banner" *ngIf="selectedRole">
                <div class="banner-top">
                  <span class="material-symbols-outlined">
                    {{ selectedRole.compensationBasis === 'Monthly' ? 'calendar_today' : 'payments' }}
                  </span>
                  <div>
                    <strong>{{ selectedRole.compensationBasis === 'Monthly' ? 'Monthly Salaried Position' : 'Hourly Wage Position' }}</strong>
                    <p *ngIf="selectedRole.compensationBasis === 'Monthly'">
                      Staff member receives fixed base salary of <strong>₦{{ (selectedRole.monthlySalary || 0) | number:'1.0-0' }}/month</strong>. Scheduled hours track toward monthly contracted target ({{ selectedRole.contractedWeeklyHours || 40 }} hrs/wk).
                    </p>
                    <p *ngIf="selectedRole.compensationBasis !== 'Monthly'">
                      Staff member is compensated per billable hour worked. Default rate: <strong>₦{{ (selectedRole.defaultHourlyRate || 0) | number:'1.2-2' }}/hr</strong>.
                    </p>
                  </div>
                </div>
              </div>

              <!-- Hourly Pay Rate (Editable when hourly) -->
              <div class="form-group" *ngIf="!selectedRole || selectedRole.compensationBasis !== 'Monthly'">
                <label class="form-label">Hourly Pay Rate (₦/hr)</label>
                <input
                  type="number"
                  step="0.25"
                  class="form-control"
                  [(ngModel)]="hourlyPayRate"
                  name="hourlyPayRate"
                  placeholder="e.g. 15.00"
                />
              </div>
            </div>
          </div>

          <!-- Card 5: Personnel Assignment & Hardware Station -->
          <div class="cms-card">
            <div class="card-header">
              <div class="card-title-group">
                <span class="material-symbols-outlined text-blue">person_add</span>
                <div>
                  <h3>Personnel Assignment</h3>
                  <p class="card-subtitle">Assign a qualified team member or publish as an Open Shift for claim.</p>
                </div>
              </div>
            </div>

            <div class="card-body">
              <div class="form-group">
                <label class="form-label">Assigned Staff Member</label>
                <select
                  class="form-control"
                  [(ngModel)]="assignedUserId"
                  name="assignedUserId"
                  (change)="onStaffChange()"
                >
                  <option value="">Leave unassigned (Open Shift / Board)</option>
                  <option *ngFor="let m of staffMembers" [value]="m.userId">
                    {{ m.fullName }} ({{ m.jobTitle || 'General Staff' }}) &bull; [{{ m.preferredWorkingTime || 'Any' }} Shift] &bull; {{ m.workingAvailability || 'Available' }}
                  </option>
                </select>
                <span class="field-hint">If left unassigned, this schedule appears on the Open Shift Claim Board.</span>
              </div>

              <div class="form-row-dual" *ngIf="isEditMode">
                <div class="form-group">
                  <label class="form-label">Shift Status</label>
                  <select class="form-control" [(ngModel)]="shiftStatus" name="shiftStatus">
                    <option value="Scheduled">Scheduled</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="InProgress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">Acceptance Deadline</label>
                  <input
                    type="datetime-local"
                    class="form-control"
                    [(ngModel)]="acceptanceDeadlineLocal"
                    name="acceptanceDeadlineLocal"
                  />
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Designated Workstation (Optional)</label>
                <input
                  type="text"
                  class="form-control"
                  [(ngModel)]="requiredWorkspaceStationName"
                  name="requiredWorkspaceStationName"
                  placeholder="e.g. Reception PC #1, Main Workstation"
                />
                <span class="field-hint">Hardware terminal locked to this shift for automated login validation.</span>
              </div>

              <div class="form-group">
                <label class="form-label">Duty Notes &amp; Shift Instructions</label>
                <textarea
                  class="form-control"
                  rows="3"
                  [(ngModel)]="dutyNotes"
                  name="dutyNotes"
                  placeholder="Specific duty instructions, key handover steps, and briefing notes..."
                ></textarea>
              </div>
            </div>
          </div>

          <!-- Card 6: Live Schedule Impact & Summary Widget -->
          <div class="summary-card">
            <div class="summary-header">
              <span class="material-symbols-outlined">analytics</span>
              <h4>Schedule Impact &amp; Calculation Summary</h4>
            </div>

            <div class="summary-metrics-grid">
              <div class="summary-metric">
                <span class="metric-num">{{ calculatedTotalDays }}</span>
                <span class="metric-txt">Scheduled Days</span>
              </div>

              <div class="summary-metric">
                <span class="metric-num">{{ calculatedDailyHours | number:'1.1-1' }}h</span>
                <span class="metric-txt">Net Daily Hours</span>
              </div>

              <div class="summary-metric">
                <span class="metric-num">{{ calculatedTotalHours | number:'1.1-1' }}h</span>
                <span class="metric-txt">Total Net Hours</span>
              </div>
            </div>

            <div class="summary-details-list">
              <div class="detail-row" *ngIf="isOvernightShift">
                <span class="badge-overnight">
                  <span class="material-symbols-outlined">bedtime</span> Overnight Window (Crosses Midnight)
                </span>
              </div>

              <div class="detail-row">
                <span class="detail-label">Compensation Basis:</span>
                <span class="detail-value">
                  {{ selectedRole?.compensationBasis === 'Monthly' ? 'Monthly Salaried' : 'Hourly Wage' }}
                </span>
              </div>

              <div class="detail-row" *ngIf="selectedRole?.compensationBasis !== 'Monthly' && (hourlyPayRate || 0) > 0">
                <span class="detail-label">Est. Scheduled Gross Wage:</span>
                <span class="detail-value font-bold text-success">
                  ₦{{ ((hourlyPayRate || 0) * calculatedTotalHours) | number:'1.2-2' }}
                </span>
              </div>

              <div class="detail-row" *ngIf="selectedRole?.compensationBasis === 'Monthly'">
                <span class="detail-label">Monthly Fixed Salary:</span>
                <span class="detail-value font-bold text-primary">
                  ₦{{ (selectedRole?.monthlySalary || 0) | number:'1.0-0' }}/mo
                </span>
              </div>

              <div class="detail-row" *ngIf="assignedStaffName">
                <span class="detail-label">Assigned Member:</span>
                <span class="detail-value text-blue">{{ assignedStaffName }}</span>
              </div>
            </div>

            <button
              type="button"
              class="btn btn-primary btn-block btn-generate"
              (click)="saveSchedule()"
              [disabled]="isSaving || isLoading"
            >
              <span class="material-symbols-outlined" *ngIf="!isSaving">save</span>
              <span class="material-symbols-outlined spin" *ngIf="isSaving">sync</span>
              <span>{{ isSaving ? 'Saving...' : (isEditMode ? 'Update Shift' : 'Generate & Assign Schedule') }}</span>
            </button>
          </div>
        </div>
      </form>

      <!-- Explanatory Info Modal -->
      <div class="modal-backdrop" *ngIf="showInfoModal" (click)="showInfoModal = false">
        <div class="modal-card modal-info" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div class="modal-title-group">
              <span class="material-symbols-outlined text-blue">help</span>
              <div>
                <h3>Work Schedule &amp; Shift System Guide</h3>
                <p class="modal-subtitle">Universal multi-industry scheduling standards across Ozikol BCC.</p>
              </div>
            </div>
            <button type="button" class="btn-close" (click)="showInfoModal = false">&times;</button>
          </div>

          <div class="modal-body info-guide-content">
            <h4>1. Work Schedule Patterns</h4>
            <p>
              Ozikol BCC supports all operational structures across diverse sectors (corporate offices, healthcare, security, hospitality, logistics):
            </p>
            <ul>
              <li><strong>Regular Daily Routine:</strong> For standard 8:00 AM – 5:00 PM staff working Monday through Friday with weekend and overtime options.</li>
              <li><strong>Shift / Rota Pattern:</strong> For 24/7 operations, hospitals, care homes, and rotational duty teams requiring day/night windows.</li>
              <li><strong>Single / Ad-Hoc Shift:</strong> For one-off events, ad-hoc coverage, or immediate replacement dispatches.</li>
            </ul>

            <h4 class="mt-3">2. Hourly Wage vs. Monthly Salaried Personnel</h4>
            <p>
              Job Roles configure the compensation model. Hourly workers accumulate wages according to exact net clocked hours. Salaried personnel log attendance against their contracted monthly target hours (e.g. 40 hrs/wk) with automatic overtime threshold tracking.
            </p>

            <h4 class="mt-3">3. Work Locations &amp; Branches</h4>
            <p>
              Locations represent branch offices, company headquarters, client facilities, or event venues with GPS geofence zones for mobile clock-in verification.
            </p>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-primary" (click)="showInfoModal = false">Understood</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .bcp-page-container {
      padding: 1.5rem 2rem;
      background-color: #f8fafc;
      min-height: calc(100vh - 70px);
      box-sizing: border-box;
    }

    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8125rem;
      color: #64748b;
      margin-bottom: 0.75rem;
    }

    .breadcrumb a {
      color: #64748b;
      text-decoration: none;
      transition: color 0.15s ease;
    }

    .breadcrumb a:hover {
      color: #0050e5;
    }

    .sep {
      color: #cbd5e1;
    }

    .current {
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

    .title-row h1 {
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

    .badge-suite {
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      color: #0050e5;
      background-color: #eff6ff;
      border: 1px solid #bfdbfe;
      padding: 0.2rem 0.6rem;
      border-radius: 9999px;
      text-transform: uppercase;
    }

    .subtitle {
      font-size: 0.875rem;
      color: #64748b;
      margin: 0;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      font-weight: 600;
      border-radius: 0.5rem;
      border: 1px solid transparent;
      cursor: pointer;
      transition: all 0.15s ease;
      text-decoration: none;
    }

    .btn-outline {
      background: #ffffff;
      border-color: #cbd5e1;
      color: #334155;
    }

    .btn-outline:hover {
      background: #f1f5f9;
      color: #0f172a;
    }

    .btn-primary {
      background-color: #0050e5;
      color: #ffffff;
    }

    .btn-primary:hover:not(:disabled) {
      background-color: #003fc4;
    }

    .btn-primary:disabled {
      opacity: 0.65;
      cursor: not-allowed;
    }

    .btn-block {
      width: 100%;
      justify-content: center;
    }

    .spin {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .cms-loading-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
      padding: 3rem;
      text-align: center;
      color: #64748b;
    }

    .cms-loading-card span {
      font-size: 2.5rem;
      color: #0050e5;
      margin-bottom: 0.5rem;
    }

    /* 2-Column Responsive Layout */
    .schedule-form-layout {
      display: grid;
      grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
      gap: 1.5rem;
      align-items: start;
    }

    @media (max-width: 1024px) {
      .schedule-form-layout {
        grid-template-columns: 1fr;
      }
    }

    .form-column {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .cms-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      overflow: hidden;
    }

    .card-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #f1f5f9;
      background: #ffffff;
    }

    .card-title-group {
      display: flex;
      align-items: center;
      gap: 0.875rem;
    }

    .card-title-group h3 {
      font-size: 1rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }

    .card-subtitle {
      font-size: 0.8125rem;
      color: #64748b;
      margin: 0.15rem 0 0 0;
    }

    .text-blue {
      color: #0050e5;
    }

    .card-body {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    /* Pattern Cards */
    .pattern-selector-grid {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .pattern-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem 1.25rem;
      border: 2px solid #e2e8f0;
      border-radius: 0.625rem;
      background: #f8fafc;
      cursor: pointer;
      transition: all 0.15s ease;
      position: relative;
    }

    .pattern-card:hover {
      border-color: #cbd5e1;
      background: #ffffff;
    }

    .pattern-card.selected {
      border-color: #0050e5;
      background: #eff6ff;
    }

    .pattern-icon-box {
      width: 44px;
      height: 44px;
      border-radius: 0.5rem;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      color: #0050e5;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .pattern-card.selected .pattern-icon-box {
      background: #0050e5;
      color: #ffffff;
      border-color: #0050e5;
    }

    .pattern-details {
      flex: 1;
      min-width: 0;
    }

    .pattern-title {
      display: block;
      font-size: 0.9375rem;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 0.15rem;
    }

    .pattern-desc {
      display: block;
      font-size: 0.8125rem;
      color: #64748b;
      line-height: 1.4;
    }

    .pattern-radio {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border: 2px solid #cbd5e1;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .pattern-card.selected .pattern-radio {
      border-color: #0050e5;
      background: #0050e5;
      box-shadow: inset 0 0 0 3px #ffffff;
    }

    /* Form Fields */
    .form-row-dual {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.25rem;
    }

    @media (max-width: 640px) {
      .form-row-dual {
        grid-template-columns: 1fr;
      }
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    .form-label {
      font-size: 0.8125rem;
      font-weight: 600;
      color: #334155;
    }

    .required {
      color: #ef4444;
    }

    .form-control {
      width: 100%;
      padding: 0.625rem 0.875rem;
      border: 1px solid #cbd5e1;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      color: #0f172a;
      background-color: #ffffff;
      outline: none;
      box-sizing: border-box;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }

    .form-control:focus {
      border-color: #0050e5;
      box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.12);
    }

    .field-hint {
      font-size: 0.75rem;
      color: #64748b;
    }

    /* Days of Week Chips */
    .label-with-action {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .quick-day-actions {
      display: flex;
      gap: 0.5rem;
    }

    .btn-text-sm {
      background: none;
      border: none;
      color: #0050e5;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      padding: 0;
    }

    .btn-text-sm:hover {
      text-decoration: underline;
    }

    .days-chips-row {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      margin-top: 0.25rem;
    }

    .day-chip {
      padding: 0.45rem 0.875rem;
      border-radius: 0.375rem;
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      font-size: 0.8125rem;
      font-weight: 600;
      color: #475569;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .day-chip:hover {
      background: #f1f5f9;
      border-color: #94a3b8;
    }

    .day-chip.active {
      background: #0050e5;
      border-color: #0050e5;
      color: #ffffff;
    }

    /* Shift Presets */
    .preset-windows-bar {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
      padding: 0.75rem 1rem;
      background: #f8fafc;
      border-radius: 0.5rem;
      border: 1px solid #e2e8f0;
      margin-bottom: 0.25rem;
    }

    .preset-label {
      font-size: 0.8125rem;
      font-weight: 600;
      color: #475569;
    }

    .btn-preset {
      padding: 0.35rem 0.65rem;
      border-radius: 0.375rem;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      font-size: 0.75rem;
      font-weight: 600;
      color: #334155;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-preset:hover {
      background: #eff6ff;
      border-color: #93c5fd;
      color: #0050e5;
    }

    /* Toggle Box */
    .toggle-control-box {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.625rem 0.875rem;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 0.5rem;
      min-height: 42px;
    }

    .toggle-text {
      display: flex;
      flex-direction: column;
    }

    .toggle-text strong {
      font-size: 0.8125rem;
      color: #0f172a;
    }

    .toggle-text span {
      font-size: 0.6875rem;
      color: #64748b;
    }

    .switch {
      position: relative;
      display: inline-block;
      width: 36px;
      height: 20px;
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
      height: 14px;
      width: 14px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: 0.2s;
    }

    input:checked + .slider {
      background-color: #0050e5;
    }

    input:checked + .slider:before {
      transform: translateX(16px);
    }

    .slider.round {
      border-radius: 20px;
    }

    .slider.round:before {
      border-radius: 50%;
    }

    /* Compensation Banner */
    .compensation-info-banner {
      padding: 1rem 1.25rem;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 0.5rem;
    }

    .banner-top {
      display: flex;
      gap: 0.75rem;
      align-items: flex-start;
    }

    .banner-top span {
      font-size: 1.5rem;
      color: #0050e5;
    }

    .banner-top strong {
      display: block;
      font-size: 0.875rem;
      color: #0f172a;
      margin-bottom: 0.15rem;
    }

    .banner-top p {
      font-size: 0.8125rem;
      color: #334155;
      margin: 0;
      line-height: 1.4;
    }

    /* Summary Card */
    .summary-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
      padding: 1.5rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .summary-header {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      color: #0050e5;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 0.875rem;
    }

    .summary-header h4 {
      font-size: 0.9375rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }

    .summary-metrics-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.75rem;
      text-align: center;
    }

    .summary-metric {
      padding: 0.875rem 0.5rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
    }

    .metric-num {
      display: block;
      font-size: 1.375rem;
      font-weight: 800;
      color: #0050e5;
      letter-spacing: -0.02em;
    }

    .metric-txt {
      display: block;
      font-size: 0.6875rem;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      margin-top: 0.25rem;
    }

    .summary-details-list {
      display: flex;
      flex-direction: column;
      gap: 0.625rem;
      padding: 0.875rem 0;
      border-top: 1px dashed #e2e8f0;
      border-bottom: 1px dashed #e2e8f0;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.8125rem;
    }

    .detail-label {
      color: #64748b;
    }

    .detail-value {
      color: #0f172a;
      font-weight: 600;
    }

    .font-bold {
      font-weight: 700;
    }

    .text-success {
      color: #059669;
    }

    .text-primary {
      color: #7c3aed;
    }

    .badge-overnight {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.25rem 0.5rem;
      background: #f5f3ff;
      border: 1px solid #ddd6fe;
      color: #6d28d9;
      border-radius: 0.375rem;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .btn-generate {
      padding: 0.75rem 1.25rem;
      font-size: 0.9375rem;
    }

    /* Modal */
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
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
      width: 100%;
      max-width: 580px;
      overflow: hidden;
    }

    .modal-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .modal-title-group {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .modal-title-group h3 {
      font-size: 1.125rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }

    .modal-subtitle {
      font-size: 0.8125rem;
      color: #64748b;
      margin: 0.15rem 0 0 0;
    }

    .btn-close {
      background: none;
      border: none;
      font-size: 1.5rem;
      color: #94a3b8;
      cursor: pointer;
    }

    .modal-body {
      padding: 1.5rem;
      color: #334155;
      font-size: 0.875rem;
      line-height: 1.5;
    }

    .info-guide-content h4 {
      font-size: 0.9375rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 0.35rem 0;
    }

    .info-guide-content ul {
      margin: 0.5rem 0;
      padding-left: 1.25rem;
    }

    .info-guide-content li {
      margin-bottom: 0.35rem;
    }

    .modal-footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: flex-end;
      background: #f8fafc;
    }
  `]
})
export class WorkforceShiftEditComponent implements OnInit {
  isEditMode = false;
  shiftId: string | null = null;
  shiftCode = '';
  isLoading = false;
  isSaving = false;
  showInfoModal = false;

  // Reference Data
  sites: ClientSite[] = [];
  jobRoles: JobRole[] = [];
  staffMembers: StaffMember[] = [];

  // Pattern Selector: 'Daily' | 'ShiftRota' | 'AdHoc'
  schedulePattern: 'Daily' | 'ShiftRota' | 'AdHoc' = 'Daily';

  // Schedule Dates & Times
  startDate = '';
  endDate = '';
  dailyStartTime = '08:00';
  dailyEndTime = '17:00';
  singleStartDateTime = '';
  singleEndDateTime = '';
  breakMinutes = 60;
  trackOvertime = false;

  // Selected Days of Week for Recurring (1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 0=Sun)
  selectedDays: number[] = [1, 2, 3, 4, 5];
  daysOfWeekList = [
    { id: 1, label: 'Mon' },
    { id: 2, label: 'Tue' },
    { id: 3, label: 'Wed' },
    { id: 4, label: 'Thu' },
    { id: 5, label: 'Fri' },
    { id: 6, label: 'Sat' },
    { id: 0, label: 'Sun' }
  ];

  // Location Fields
  selectedSiteId = '';
  facilityName = '';
  address = '';
  postCode = '';

  // Role & Compensation
  selectedRoleId = '';
  selectedRole: JobRole | null = null;
  postName = 'General Assignment';
  hourlyPayRate: number | null = 15.0;
  hourlyChargeRate: number | null = 22.5;

  // Personnel & Station
  assignedUserId = '';
  assignedStaffName = '';
  shiftStatus = 'Scheduled';
  acceptanceDeadlineLocal = '';
  requiredWorkspaceStationName = '';
  dutyNotes = '';

  // Live Calculated Metrics
  calculatedTotalDays = 0;
  calculatedDailyHours = 8.0;
  calculatedTotalHours = 0;
  isOvernightShift = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private workforceService: WorkforceService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.initDefaultDates();
    this.loadReferenceData();

    this.route.params.subscribe((params) => {
      if (params['id']) {
        this.isEditMode = true;
        this.shiftId = params['id'];
        this.loadShiftDetails(this.shiftId!);
      }
    });
  }

  private initDefaultDates(): void {
    const today = new Date();
    const future = new Date();
    future.setDate(today.getDate() + 30); // Default 1 month ahead

    this.startDate = this.formatDate(today);
    this.endDate = this.formatDate(future);

    // Single shift defaults (tomorrow 8am - 5pm)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startIso = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 8, 0);
    const endIso = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 17, 0);
    this.singleStartDateTime = this.formatDateTimeLocal(startIso);
    this.singleEndDateTime = this.formatDateTimeLocal(endIso);

    this.recalculateScheduleMetrics();
  }

  private loadReferenceData(): void {
    this.isLoading = true;

    // Load Work Locations
    this.workforceService.getSites().subscribe({
      next: (res: any) => {
        this.sites = (res && res.data) ? res.data : (Array.isArray(res) ? res : []);
      },
      error: () => {}
    });

    // Load Job Roles
    this.workforceService.getJobRoles().subscribe({
      next: (res: any) => {
        this.jobRoles = (res && res.data) ? res.data : (Array.isArray(res) ? res : []);
        if (this.jobRoles.length > 0 && !this.selectedRoleId) {
          this.selectedRoleId = this.jobRoles[0].id;
          this.onRoleChange();
        }
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });

    // Load Staff Members
    this.workforceService.getMembers().subscribe({
      next: (res: any) => {
        this.staffMembers = (res && res.data) ? res.data : (Array.isArray(res) ? res : []);
      },
      error: () => {}
    });
  }

  private loadShiftDetails(id: string): void {
    this.isLoading = true;
    this.workforceService.getShift(id).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        const s = res?.data || res;
        if (!s) return;

        this.shiftCode = s.shiftCode;
        this.selectedSiteId = s.clientSiteId;
        this.facilityName = s.facilityName || '';
        this.address = s.address || '';
        this.postCode = s.postCode || '';
        this.postName = s.postName || 'General Assignment';
        this.assignedUserId = s.assignedUserId || '';
        this.assignedStaffName = s.assignedUserName || '';
        this.hourlyPayRate = s.hourlyPayRate;
        this.hourlyChargeRate = s.hourlyChargeRate;
        this.breakMinutes = s.breakMinutes || 0;
        this.requiredWorkspaceStationName = s.requiredWorkspaceStationName || '';
        this.shiftStatus = s.status || 'Scheduled';
        this.dutyNotes = s.notes || '';

        if (s.startsAtUtc) {
          const st = new Date(s.startsAtUtc);
          this.singleStartDateTime = this.formatDateTimeLocal(st);
        }
        if (s.endsAtUtc) {
          const et = new Date(s.endsAtUtc);
          this.singleEndDateTime = this.formatDateTimeLocal(et);
        }
        if (s.acceptanceDeadlineUtc) {
          const ad = new Date(s.acceptanceDeadlineUtc);
          this.acceptanceDeadlineLocal = this.formatDateTimeLocal(ad);
        }

        this.recalculateScheduleMetrics();
      },
      error: (err) => {
        this.isLoading = false;
        this.toast.error(err?.error?.message || 'Failed to load shift details.');
      }
    });
  }

  setPattern(pattern: 'Daily' | 'ShiftRota' | 'AdHoc'): void {
    this.schedulePattern = pattern;
    if (pattern === 'Daily') {
      this.dailyStartTime = '08:00';
      this.dailyEndTime = '17:00';
      this.breakMinutes = 60;
      this.selectedDays = [1, 2, 3, 4, 5];
    } else if (pattern === 'ShiftRota') {
      this.dailyStartTime = '08:00';
      this.dailyEndTime = '20:00';
      this.breakMinutes = 60;
    }
    this.recalculateScheduleMetrics();
  }

  applyPreset(preset: 'Day' | 'Night' | 'Morning' | 'Evening'): void {
    if (preset === 'Day') {
      this.dailyStartTime = '08:00';
      this.dailyEndTime = '20:00';
      this.breakMinutes = 60;
    } else if (preset === 'Night') {
      this.dailyStartTime = '20:00';
      this.dailyEndTime = '08:00';
      this.breakMinutes = 60;
    } else if (preset === 'Morning') {
      this.dailyStartTime = '07:00';
      this.dailyEndTime = '15:30';
      this.breakMinutes = 30;
    } else if (preset === 'Evening') {
      this.dailyStartTime = '15:00';
      this.dailyEndTime = '23:00';
      this.breakMinutes = 30;
    }
    this.recalculateScheduleMetrics();
  }

  toggleDay(dayId: number): void {
    const idx = this.selectedDays.indexOf(dayId);
    if (idx >= 0) {
      if (this.selectedDays.length > 1) {
        this.selectedDays.splice(idx, 1);
      } else {
        this.toast.warning('At least one working day must be selected.');
      }
    } else {
      this.selectedDays.push(dayId);
    }
    this.recalculateScheduleMetrics();
  }

  setWeekdaysOnly(): void {
    this.selectedDays = [1, 2, 3, 4, 5];
    this.recalculateScheduleMetrics();
  }

  toggleWeekends(): void {
    const hasWeekends = this.selectedDays.includes(6) && this.selectedDays.includes(0);
    if (hasWeekends) {
      this.selectedDays = this.selectedDays.filter((d) => d !== 6 && d !== 0);
    } else {
      if (!this.selectedDays.includes(6)) this.selectedDays.push(6);
      if (!this.selectedDays.includes(0)) this.selectedDays.push(0);
    }
    this.recalculateScheduleMetrics();
  }

  selectAllDays(): void {
    this.selectedDays = [1, 2, 3, 4, 5, 6, 0];
    this.recalculateScheduleMetrics();
  }

  onSiteChange(): void {
    const site = this.sites.find((s) => s.id === this.selectedSiteId);
    if (site) {
      this.facilityName = site.siteName;
      this.address = site.address;
      this.postCode = site.postalCode;
    }
  }

  onRoleChange(): void {
    this.selectedRole = this.jobRoles.find((r) => r.id === this.selectedRoleId) || null;
    if (this.selectedRole) {
      this.postName = this.selectedRole.title;
      if (this.selectedRole.compensationBasis === 'Monthly') {
        this.hourlyPayRate = null;
        this.hourlyChargeRate = this.selectedRole.billingChargeRate || 25.0;
      } else {
        this.hourlyPayRate = this.selectedRole.defaultHourlyRate || 15.0;
        this.hourlyChargeRate = this.selectedRole.billingChargeRate || 22.5;
      }
    }
    this.recalculateScheduleMetrics();
  }

  onStaffChange(): void {
    const member = this.staffMembers.find((m) => m.userId === this.assignedUserId);
    this.assignedStaffName = member ? member.fullName : '';
  }

  recalculateScheduleMetrics(): void {
    if (this.isEditMode || this.schedulePattern === 'AdHoc') {
      if (this.singleStartDateTime && this.singleEndDateTime) {
        const start = new Date(this.singleStartDateTime);
        const end = new Date(this.singleEndDateTime);
        const diffMs = end.getTime() - start.getTime();
        const grossHours = Math.max(0, diffMs / (1000 * 60 * 60));
        const netHours = Math.max(0, grossHours - (this.breakMinutes / 60));

        this.calculatedTotalDays = 1;
        this.calculatedDailyHours = Math.round(netHours * 10) / 10;
        this.calculatedTotalHours = this.calculatedDailyHours;
        this.isOvernightShift = end.getDate() !== start.getDate();
      }
      return;
    }

    // Daily & Shift Rota calculation
    if (this.dailyStartTime && this.dailyEndTime) {
      const [sh, sm] = this.dailyStartTime.split(':').map(Number);
      const [eh, em] = this.dailyEndTime.split(':').map(Number);
      let grossHours = (eh + em / 60) - (sh + sm / 60);
      if (grossHours <= 0) {
        grossHours += 24; // Cross-midnight
        this.isOvernightShift = true;
      } else {
        this.isOvernightShift = false;
      }

      const netHours = Math.max(0, grossHours - (this.breakMinutes / 60));
      this.calculatedDailyHours = Math.round(netHours * 10) / 10;
    }

    if (this.startDate && this.endDate) {
      const start = new Date(this.startDate);
      const end = new Date(this.endDate);
      let count = 0;
      const cur = new Date(start);

      while (cur <= end) {
        if (this.selectedDays.includes(cur.getDay())) {
          count++;
        }
        cur.setDate(cur.getDate() + 1);
      }

      this.calculatedTotalDays = count;
      this.calculatedTotalHours = Math.round((this.calculatedDailyHours * count) * 10) / 10;
    }
  }

  saveSchedule(): void {
    if (!this.selectedSiteId) {
      this.toast.error('Please select a Work Location.');
      return;
    }

    if (!this.postName) {
      this.toast.error('Please specify a Job Role or Duty Title.');
      return;
    }

    this.isSaving = true;

    if (this.isEditMode && this.shiftId) {
      // Single shift update
      const payload = {
        clientSiteId: this.selectedSiteId,
        assignedUserId: this.assignedUserId || null,
        assignedUserName: this.assignedStaffName || null,
        postName: this.postName,
        facilityName: this.facilityName,
        address: this.address,
        postCode: this.postCode,
        startsAtUtc: new Date(this.singleStartDateTime).toISOString(),
        endsAtUtc: new Date(this.singleEndDateTime).toISOString(),
        breakMinutes: this.breakMinutes,
        hourlyPayRate: this.hourlyPayRate,
        hourlyChargeRate: this.hourlyChargeRate,
        status: this.shiftStatus,
        requiredWorkspaceStationName: this.requiredWorkspaceStationName,
        acceptanceDeadlineUtc: this.acceptanceDeadlineLocal ? new Date(this.acceptanceDeadlineLocal).toISOString() : null,
        notes: this.dutyNotes
      };

      this.workforceService.updateShift(this.shiftId, payload).subscribe({
        next: () => {
          this.isSaving = false;
          this.toast.success('Shift updated successfully.');
          this.router.navigate(['/workforce/console/schedule']);
        },
        error: (err) => {
          this.isSaving = false;
          this.toast.error(err?.error?.message || 'Failed to update shift.');
        }
      });
      return;
    }

    // Create Single Shift
    if (this.schedulePattern === 'AdHoc') {
      const singlePayload = {
        clientSiteId: this.selectedSiteId,
        assignedUserId: this.assignedUserId || null,
        assignedUserName: this.assignedStaffName || null,
        postName: this.postName,
        facilityName: this.facilityName,
        address: this.address,
        postCode: this.postCode,
        startsAtUtc: new Date(this.singleStartDateTime).toISOString(),
        endsAtUtc: new Date(this.singleEndDateTime).toISOString(),
        breakMinutes: this.breakMinutes,
        hourlyPayRate: this.hourlyPayRate,
        hourlyChargeRate: this.hourlyChargeRate,
        requiredWorkspaceStationName: this.requiredWorkspaceStationName,
        notes: this.dutyNotes
      };

      this.workforceService.createShift(singlePayload).subscribe({
        next: () => {
          this.isSaving = false;
          this.toast.success('Single shift created successfully.');
          this.router.navigate(['/workforce/console/schedule']);
        },
        error: (err) => {
          this.isSaving = false;
          this.toast.error(err?.error?.message || 'Failed to create shift.');
        }
      });
      return;
    }

    // Create Batch Recurring Schedule (Daily Routine or Shift Rota)
    const batchPayload = {
      clientSiteId: this.selectedSiteId,
      assignedUserId: this.assignedUserId || null,
      assignedUserName: this.assignedStaffName || null,
      postName: this.postName,
      facilityName: this.facilityName,
      address: this.address,
      postCode: this.postCode,
      eventTag: this.schedulePattern,
      notes: this.dutyNotes,
      schedulePattern: this.schedulePattern,
      startDate: this.startDate,
      endDate: this.endDate,
      startTime: this.dailyStartTime,
      endTime: this.dailyEndTime,
      selectedDaysOfWeek: this.selectedDays,
      breakMinutes: this.breakMinutes,
      compensationBasis: this.selectedRole?.compensationBasis || 'Hourly',
      hourlyPayRate: this.hourlyPayRate,
      hourlyChargeRate: this.hourlyChargeRate,
      monthlySalary: this.selectedRole?.monthlySalary,
      trackOvertime: this.trackOvertime,
      requiredWorkspaceStationName: this.requiredWorkspaceStationName
    };

    this.workforceService.batchCreateShifts(batchPayload).subscribe({
      next: (res: any) => {
        this.isSaving = false;
        const count = res?.data?.length || this.calculatedTotalDays;
        this.toast.success(`Successfully generated ${count} scheduled shifts.`);
        this.router.navigate(['/workforce/console/schedule']);
      },
      error: (err) => {
        this.isSaving = false;
        this.toast.error(err?.error?.message || 'Failed to generate schedule.');
      }
    });
  }

  private formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private formatDateTimeLocal(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day}T${h}:${min}`;
  }
}

