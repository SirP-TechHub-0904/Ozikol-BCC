import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { WorkforceService, Shift } from '../../../core/services/workforce.service';
import { ToastService } from '../../../core/services/toast.service';

/**
 * Member "Shift and Rota" Hub (`/workforce/workspace/*`).
 * Unifies Schedule, Open Shifts claiming, Timesheets duty pay, Time Off / Leave,
 * and Document Compliance vault into a single zero-dropdown workspace suite.
 */
@Component({
  selector: 'app-workforce-my-shifts',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="bcp-page-container">
      <!-- 1. Canonical BCC Page Header -->
      <div class="page-header">
        <div class="header-left">
          <div class="breadcrumb">
            <a routerLink="/workspace/home">Personal Workspace</a>
            <span class="sep">/</span>
            <span>Shift &amp; Rota</span>
            <span class="sep">/</span>
            <span class="current">{{ getPageTitle() }}</span>
          </div>
          <div class="title-row">
            <h1>{{ getPageTitle() }}</h1>
            <button type="button" class="info-trigger-btn" (click)="showInfoModal = true" title="View Shift &amp; Rota Guide">
              <span class="material-symbols-outlined">info</span>
            </button>
            <span class="badge-suite">Suite: Workforce &amp; Shifts</span>
          </div>
          <p class="subtitle">{{ getPageSubtitle() }}</p>
        </div>
        <div class="header-actions">
          <button type="button" class="btn btn-outline" (click)="loadActiveTabData()">
            <span class="material-symbols-outlined" [class.spin]="isLoading">refresh</span>
            <span>Refresh</span>
          </button>
          <button type="button" class="btn btn-outline" (click)="switchTab('leave'); showLeaveModal = true">
            <span class="material-symbols-outlined">event_busy</span>
            <span>Request Leave</span>
          </button>
          <a routerLink="/attendance/workspace/clock" class="btn btn-primary">
            <span class="material-symbols-outlined">fingerprint</span>
            <span>Duty Clock-In</span>
          </a>
        </div>
      </div>

      <!-- 2. Sub-Nav Pill Tabs -->
      <div class="bcp-subnav-tabs">
        <button class="subnav-tab" [class.active]="activeTab === 'analytics'" (click)="switchTab('analytics')">
          <span class="material-symbols-outlined">analytics</span> Shift Analytics
        </button>
        <button class="subnav-tab" [class.active]="activeTab === 'shifts'" (click)="switchTab('shifts')">
          <span class="material-symbols-outlined">calendar_month</span> My Schedule &amp; Rota
        </button>
        <button class="subnav-tab position-relative" [class.active]="activeTab === 'open-shifts'" (click)="switchTab('open-shifts')">
          <span class="material-symbols-outlined">work_outline</span> Open Shifts &amp; Swaps
          <span class="tab-badge" *ngIf="openShifts.length > 0">{{ openShifts.length }}</span>
        </button>
        <button class="subnav-tab" [class.active]="activeTab === 'timesheets'" (click)="switchTab('timesheets')">
          <span class="material-symbols-outlined">description</span> Timesheets &amp; Pay
        </button>
        <button class="subnav-tab" [class.active]="activeTab === 'leave'" (click)="switchTab('leave')">
          <span class="material-symbols-outlined">flight_takeoff</span> Time Off &amp; Availability
        </button>
        <button class="subnav-tab" [class.active]="activeTab === 'documents'" (click)="switchTab('documents')">
          <span class="material-symbols-outlined">folder_shared</span> Compliance &amp; Documents
        </button>
        <button class="subnav-tab" [class.active]="activeTab === 'reminders'" (click)="switchTab('reminders')">
          <span class="material-symbols-outlined">notifications_active</span> Reminders
        </button>
      </div>

      <div class="loading-state-card" *ngIf="isLoading && shifts.length === 0">
        <div class="spinner-ring"></div>
        <p>Loading your assigned shifts and rota schedule...</p>
      </div>

      <!-- TAB 1: SHIFT ANALYTICS & SCHEDULE (MY SHIFTS) -->
      <div *ngIf="(activeTab === 'analytics' || activeTab === 'shifts') && !isLoading">
        <!-- 3. Top Metrics Row (Matching Reference Template) -->
        <div class="metrics-grid mb-4">
          <!-- Metric 1: Real Take-Home Pay -->
          <div class="metric-card">
            <div class="card-top">
              <div class="card-icon bg-blue">
                <span class="material-symbols-outlined">payments</span>
              </div>
              <span class="card-chip chip-blue">Estimated Net</span>
            </div>
            <div class="card-value">
              {{ currencySymbol }}{{ (estimatedTakeHomePay | number:'1.2-2') || '0.00' }}
            </div>
            <div class="card-label">Monthly Take-Home Pay</div>
            <div class="card-progress-track">
              <div class="card-progress-bar bg-blue" [style.width.%]="shifts.length > 0 ? 80 : 0"></div>
            </div>
            <div class="card-sub-info">
              <span>{{ totalPlannedHours }}h across {{ shifts.length }} rostered shifts • {{ accruedHolidayHours }}h Holiday Pay</span>
            </div>
          </div>

          <!-- Metric 2: Next Payday Countdown -->
          <div class="metric-card">
            <div class="card-top">
              <div class="card-icon bg-green">
                <span class="material-symbols-outlined">event_available</span>
              </div>
              <span class="card-chip chip-teal">{{ daysUntilPayday }} Days Away</span>
            </div>
            <div class="card-value font-monospace" style="font-size: 20px; line-height: 28px;">
              {{ nextPaydayDate | date:'EEEE, d MMM' }}
            </div>
            <div class="card-label">Next Scheduled Payday</div>
            <div class="card-progress-track">
              <div class="card-progress-bar bg-green" style="width: 70%;"></div>
            </div>
            <div class="card-sub-info">
              <span>Est. Cycle Payout: {{ currencySymbol }}{{ (estimatedGrossPay * 0.5 | number:'1.2-2') || '0.00' }}</span>
            </div>
          </div>

          <!-- Metric 3: Next Shift Spotlight -->
          <div class="metric-card spotlight-card" *ngIf="nextUpcomingShift">
            <div class="card-top">
              <div class="card-icon bg-teal">
                <span class="material-symbols-outlined">schedule</span>
              </div>
              <span class="card-chip" [ngClass]="nextUpcomingShift.isConfirmedByGuard ? 'chip-teal' : 'chip-amber'">
                {{ nextUpcomingShift.isConfirmedByGuard ? 'Confirmed' : 'Action Required' }}
              </span>
            </div>
            <div class="card-value" style="font-size: 20px;">
              {{ nextUpcomingShift.startsAtUtc | date:'HH:mm' }} - {{ nextUpcomingShift.endsAtUtc | date:'HH:mm' }}
            </div>
            <div class="card-label">{{ nextUpcomingShift.facilityName || nextUpcomingShift.siteName }}</div>
            <div class="card-sub-info d-flex justify-content-between align-items-center">
              <span>{{ nextUpcomingShift.startsAtUtc | date:'EEE, d MMM' }} • {{ nextUpcomingShift.postName }}</span>
              <button
                type="button"
                class="btn-confirm-inline"
                *ngIf="!nextUpcomingShift.isConfirmedByGuard"
                (click)="confirmShift(nextUpcomingShift)"
                [disabled]="isActionLoading || isShiftExpired(nextUpcomingShift)"
              >
                1-Tap Confirm
              </button>
            </div>
          </div>

          <!-- Metric 4: Punctuality & Standing -->
          <div class="metric-card">
            <div class="card-top">
              <div class="card-icon bg-purple">
                <span class="material-symbols-outlined">verified_user</span>
              </div>
              <span class="card-chip chip-purple">Duty Standing</span>
            </div>
            <div class="card-value">100%</div>
            <div class="card-label">Overall Punctuality Score</div>
            <div class="card-progress-track">
              <div class="card-progress-bar bg-purple" style="width: 100%;"></div>
            </div>
            <div class="card-sub-info">
              <span>Zero geofence boundary warnings recorded</span>
            </div>
          </div>
        </div>

        <!-- 4. Interactive Monthly Rota Calendar Grid (From Reference Template) -->
        <div class="rota-calendar-card mb-4">
          <div class="calendar-card-header">
            <div class="cal-nav-group">
              <button type="button" class="btn-cal-nav" (click)="prevMonth()" title="Previous Month">
                <span class="material-symbols-outlined">chevron_left</span>
              </button>
              <h3 class="cal-month-title">{{ currentMonth | date:'MMMM yyyy' }}</h3>
              <button type="button" class="btn-cal-nav" (click)="nextMonth()" title="Next Month">
                <span class="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
            <div class="cal-action-banner">
              <span class="material-symbols-outlined text-primary">info</span>
              <span>Not on the rota today? Clock in if you pick up a shift.</span>
              <a routerLink="/attendance/workspace/clock" class="btn-clockin-mini">
                <span class="material-symbols-outlined">fingerprint</span> Duty Clock-In
              </a>
            </div>
          </div>

          <!-- Calendar Grid -->
          <div class="calendar-grid-container">
            <div class="cal-weekdays-row">
              <div class="weekday-cell">Mon</div>
              <div class="weekday-cell">Tue</div>
              <div class="weekday-cell">Wed</div>
              <div class="weekday-cell">Thu</div>
              <div class="weekday-cell">Fri</div>
              <div class="weekday-cell">Sat</div>
              <div class="weekday-cell">Sun</div>
            </div>
            <div class="cal-days-grid">
              <div
                *ngFor="let day of calendarDays"
                class="cal-day-cell"
                [class.other-month]="!day.isCurrentMonth"
                [class.today]="day.isToday"
                [class.has-shift]="day.shifts.length > 0"
              >
                <div class="day-number">{{ day.dayNumber }}</div>
                <div class="day-shifts" *ngIf="day.shifts.length > 0">
                  <div *ngFor="let s of day.shifts" class="shift-pill-badge" [title]="s.postName + ' at ' + (s.facilityName || s.siteName)">
                    <span class="badge-time">{{ s.startsAtUtc | date:'HH:mm' }}</span>
                    <span class="badge-site">{{ s.facilityName || s.siteName }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Calendar Month Footer Summary Bar -->
          <div class="calendar-summary-footer">
            <div class="summary-item">
              <span class="material-symbols-outlined">timer</span>
              <strong>{{ totalPlannedHours }}</strong> hrs planned
            </div>
            <div class="summary-item">
              <span class="material-symbols-outlined">event_note</span>
              <strong>{{ shifts.length }}</strong> shifts rostered
            </div>
            <div class="summary-item">
              <span class="material-symbols-outlined">account_balance_wallet</span>
              Gross Pay: <strong>{{ currencySymbol }}{{ (estimatedGrossPay | number:'1.2-2') || '0.00' }}</strong>
            </div>
          </div>
        </div>

        <!-- 5. Upcoming Assigned Shifts Section (Canonical CMS Card) -->
        <div class="cms-card mt-4">
          <div class="table-toolbar">
            <div class="toolbar-left">
              <h3>Upcoming Assigned Rota Duties</h3>
              <span class="count-badge" *ngIf="shifts.length > 0">{{ shifts.length }} Rostered</span>
            </div>
            <div class="toolbar-right">
              <button type="button" class="btn btn-outline" (click)="switchTab('open-shifts')">
                <span class="material-symbols-outlined">add_circle</span>
                <span>Browse Extra Open Shifts</span>
              </button>
            </div>
          </div>

          <!-- Empty State (Inside CMS Card) -->
          <div class="empty-state-card" *ngIf="shifts.length === 0">
            <div class="empty-icon-circle">
              <span class="material-symbols-outlined">event_available</span>
            </div>
            <h3>No Upcoming Duties Rostered</h3>
            <p>Your personal rota schedule is currently clear. You have no pending shifts assigned. You can browse open shifts or log your availability.</p>
            <button type="button" class="btn btn-primary" (click)="switchTab('open-shifts')">
              <span class="material-symbols-outlined">work_outline</span>
              <span>Browse Open Shifts</span>
            </button>
          </div>

          <!-- Shifts Grid (Inside CMS Card) -->
          <div class="shifts-card-body" *ngIf="shifts.length > 0">
            <div class="shifts-grid">
              <div class="shift-card" *ngFor="let s of shifts" [class.overnight-card]="s.isOvernight">
                <div class="shift-card-header">
                  <div class="shift-badges-group">
                    <span class="shift-code-badge">{{ s.shiftCode }}</span>
                    <span class="badge-overnight" *ngIf="s.isOvernight">24/7 Overnight</span>
                  </div>
                  <span class="status-pill" [ngClass]="getStatusBadge(s)">{{ s.status }}</span>
                </div>

                <div class="shift-venue-info">
                  <h4 class="shift-venue-title">{{ s.facilityName || s.siteName }}</h4>
                  <p class="shift-venue-address">
                    <span class="material-symbols-outlined">place</span>
                    <span>{{ s.address || s.siteAddress }} <strong *ngIf="s.postCode">({{ s.postCode }})</strong></span>
                  </p>
                </div>

                <div class="shift-meta-box">
                  <div class="meta-row">
                    <span class="meta-label">Role / Post:</span>
                    <span class="meta-val">{{ s.postName }}</span>
                  </div>
                  <div class="meta-row">
                    <span class="meta-label">Starts:</span>
                    <span class="meta-val">{{ s.startsAtUtc | date:'dd MMM, HH:mm' }}</span>
                  </div>
                  <div class="meta-row">
                    <span class="meta-label">Ends:</span>
                    <span class="meta-val">{{ s.endsAtUtc | date:'dd MMM, HH:mm' }}</span>
                  </div>
                  <div class="meta-row">
                    <span class="meta-label">Duration:</span>
                    <span class="meta-val">{{ s.plannedDurationHours }} hrs (break: {{ s.breakMinutes }}m)</span>
                  </div>
                  <div class="meta-row">
                    <span class="meta-label">Pay Rate:</span>
                    <span class="meta-val val-rate">{{ s.hourlyPayRate ? currencySymbol + s.hourlyPayRate + '/hr' : (currencySymbol + '10.00/hr') }}</span>
                  </div>
                  <div class="meta-row" *ngIf="s.requiredWorkspaceStationName">
                    <span class="meta-label">Workstation:</span>
                    <span class="meta-val badge-station">{{ s.requiredWorkspaceStationName }}</span>
                  </div>
                </div>

                <!-- Live Acceptance Countdown Alert -->
                <div class="acceptance-countdown-box" *ngIf="!s.isConfirmedByGuard">
                  <div class="countdown-header">
                    <span class="countdown-title" [class.text-danger]="isShiftExpired(s)">
                      <span class="material-symbols-outlined">{{ isShiftExpired(s) ? 'timer_off' : 'timer' }}</span>
                      {{ isShiftExpired(s) ? 'Acceptance Expired' : 'Acceptance Deadline' }}
                    </span>
                    <span class="countdown-timer" [class.text-danger]="isShiftExpired(s)">
                      {{ getCountdown(s) }}
                    </span>
                  </div>
                  <div class="countdown-sub text-muted" *ngIf="!isShiftExpired(s)">
                    Please confirm before the timer lapses to secure this shift.
                  </div>
                  <div class="countdown-sub text-danger" *ngIf="isShiftExpired(s)">
                    This assignment has expired and may be reclaimed by other team members.
                  </div>
                </div>

                <!-- Site Assignment Instructions -->
                <div class="site-briefing-alert" *ngIf="s.siteAssignmentInstructions">
                  <div class="briefing-header">
                    <span class="material-symbols-outlined text-amber">info</span>
                    <span>Site Assignment Instructions (SIs)</span>
                  </div>
                  <div class="briefing-body">{{ s.siteAssignmentInstructions }}</div>
                </div>

                <div class="shift-actions-row">
                  <button
                    type="button"
                    class="btn btn-confirm"
                    *ngIf="!s.isConfirmedByGuard"
                    (click)="confirmShift(s)"
                    [disabled]="isActionLoading || isShiftExpired(s)">
                    <span class="material-symbols-outlined">check_circle</span>
                    <span>Confirm Shift</span>
                  </button>
                  <button
                    type="button"
                    class="btn btn-outline"
                    (click)="openSwapModal(s)">
                    <span class="material-symbols-outlined">swap_horiz</span>
                    <span>Request Swap</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 2: OPEN SHIFTS (CLAIM BOARD) -->
      <div *ngIf="activeTab === 'open-shifts' && !isLoading">
        <div class="cms-card">
          <div class="table-toolbar">
            <div class="toolbar-left">
              <h3>Available Open Shifts</h3>
              <span class="count-badge" *ngIf="openShifts.length > 0">{{ openShifts.length }} Available</span>
            </div>
            <div class="toolbar-right">
              <button type="button" class="btn btn-outline" (click)="loadOpenShifts()">
                <span class="material-symbols-outlined" [class.spin]="isLoading">refresh</span>
                <span>Refresh</span>
              </button>
            </div>
          </div>

          <div class="empty-state-card" *ngIf="openShifts.length === 0">
            <div class="empty-icon-circle">
              <span class="material-symbols-outlined">event_busy</span>
            </div>
            <h3>No Open Shifts Available</h3>
            <p>All venue shifts are currently assigned to team members. Check back later for newly published shifts or peer swap opportunities.</p>
          </div>

          <div class="shifts-card-body" *ngIf="openShifts.length > 0">
            <div class="shifts-grid">
              <div class="shift-card" *ngFor="let os of openShifts">
                <div class="shift-card-header">
                  <span class="shift-code-badge">{{ os.shiftCode }}</span>
                  <span class="status-pill status-active">Open to Claim</span>
                </div>

                <div class="shift-venue-info">
                  <h4 class="shift-venue-title">{{ os.facilityName || os.siteName }}</h4>
                  <p class="shift-venue-address">
                    <span class="material-symbols-outlined">place</span>
                    <span>{{ os.address || os.siteAddress }} <strong *ngIf="os.postCode">({{ os.postCode }})</strong></span>
                  </p>
                </div>

                <div class="shift-meta-box">
                  <div class="meta-row">
                    <span class="meta-label">Post / Role:</span>
                    <span class="meta-val">{{ os.postName }}</span>
                  </div>
                  <div class="meta-row">
                    <span class="meta-label">Starts:</span>
                    <span class="meta-val">{{ os.startsAtUtc | date:'dd MMM, HH:mm' }}</span>
                  </div>
                  <div class="meta-row">
                    <span class="meta-label">Ends:</span>
                    <span class="meta-val">{{ os.endsAtUtc | date:'dd MMM, HH:mm' }}</span>
                  </div>
                  <div class="meta-row">
                    <span class="meta-label">Duration:</span>
                    <span class="meta-val">{{ os.plannedDurationHours }} hrs (break: {{ os.breakMinutes }}m)</span>
                  </div>
                  <div class="meta-row">
                    <span class="meta-label">Pay Rate:</span>
                    <span class="meta-val val-rate">{{ os.hourlyPayRate ? currencySymbol + os.hourlyPayRate + '/hr' : (currencySymbol + '10.00/hr') }}</span>
                  </div>
                </div>

                <div class="site-briefing-alert" *ngIf="os.siteAssignmentInstructions">
                  <div class="briefing-header">
                    <span class="material-symbols-outlined text-amber">info</span>
                    <span>Site Instructions</span>
                  </div>
                  <div class="briefing-body">{{ os.siteAssignmentInstructions }}</div>
                </div>

                <button
                  type="button"
                  class="btn btn-primary w-100"
                  (click)="claimOpenShiftDirect(os)"
                  [disabled]="isActionLoading">
                  <span class="material-symbols-outlined">how_to_reg</span>
                  <span>Apply &amp; Claim Shift</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 3: TIMESHEETS (DUTY HOURS & PAY SUMMARY) -->
      <div *ngIf="activeTab === 'timesheets' && !isLoading">
        <!-- 4 KPI Summary Cards Matching Canonical Design -->
        <div class="metrics-grid mb-4">
          <div class="metric-card">
            <div class="card-top">
              <div class="card-icon bg-blue">
                <span class="material-symbols-outlined">task_alt</span>
              </div>
              <span class="card-chip chip-blue">Completed</span>
            </div>
            <div class="card-value">{{ timesheetList.length }}</div>
            <div class="card-label">Completed Duties</div>
            <div class="card-sub-info">
              <span>Recorded shifts</span>
            </div>
          </div>

          <div class="metric-card">
            <div class="card-top">
              <div class="card-icon bg-teal">
                <span class="material-symbols-outlined">schedule</span>
              </div>
              <span class="card-chip chip-teal">Logged Time</span>
            </div>
            <div class="card-value">{{ getTotalTimesheetHours() }} hrs</div>
            <div class="card-label">Total Worked Hours</div>
            <div class="card-sub-info">
              <span>Hours after break deduction</span>
            </div>
          </div>

          <div class="metric-card">
            <div class="card-top">
              <div class="card-icon bg-amber">
                <span class="material-symbols-outlined">payments</span>
              </div>
              <span class="card-chip chip-amber">Pre-Deductions</span>
            </div>
            <div class="card-value">{{ currencySymbol }}{{ getTotalGrossPay() | number:'1.2-2' }}</div>
            <div class="card-label">Gross Earnings</div>
            <div class="card-sub-info">
              <span>Standard + overtime wages</span>
            </div>
          </div>

          <div class="metric-card">
            <div class="card-top">
              <div class="card-icon bg-green">
                <span class="material-symbols-outlined">account_balance_wallet</span>
              </div>
              <span class="card-chip chip-teal">Net Pay</span>
            </div>
            <div class="card-value">{{ currencySymbol }}{{ getTotalNetPay() | number:'1.2-2' }}</div>
            <div class="card-label">Net Remuneration</div>
            <div class="card-sub-info">
              <span>After fine deductions</span>
            </div>
          </div>
        </div>

        <!-- Timesheet History Table -->
        <div class="cms-card">
          <div class="table-toolbar">
            <div class="toolbar-left">
              <h3>Duty History &amp; Attendance Logs</h3>
              <span class="count-badge" *ngIf="timesheetList.length > 0">{{ timesheetList.length }} Records</span>
            </div>
            <div class="toolbar-right">
              <button type="button" class="btn btn-outline" (click)="loadTimesheets()">
                <span class="material-symbols-outlined" [class.spin]="isLoading">refresh</span>
                <span>Refresh</span>
              </button>
            </div>
          </div>

          <div class="empty-state-card" *ngIf="timesheetList.length === 0">
            <div class="empty-icon-circle">
              <span class="material-symbols-outlined">receipt_long</span>
            </div>
            <h3>No Timesheet Records Found</h3>
            <p>Completed shifts with attendance logs will appear here for payroll calculation.</p>
          </div>

          <div class="table-responsive" *ngIf="timesheetList.length > 0">
            <table class="cms-table">
              <thead>
                <tr>
                  <th>Shift / Site</th>
                  <th>Date</th>
                  <th>Scheduled Window</th>
                  <th>Clock-In / Out</th>
                  <th>Duration</th>
                  <th>Rate</th>
                  <th>Deductions / Fines</th>
                  <th class="text-end">Net Pay</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let t of timesheetList">
                  <td>
                    <div class="venue-cell-title">{{ t.siteName }}</div>
                    <div class="venue-cell-sub">{{ t.shiftCode }} &bull; {{ t.postName }}</div>
                  </td>
                  <td>{{ t.startsAtUtc | date:'dd MMM yyyy' }}</td>
                  <td>{{ t.startsAtUtc | date:'HH:mm' }} - {{ t.endsAtUtc | date:'HH:mm' }}</td>
                  <td>
                    <span *ngIf="t.clockInUtc" class="text-success fw-bold">{{ t.clockInUtc | date:'HH:mm' }}</span>
                    <span *ngIf="!t.clockInUtc" class="text-muted">—</span>
                    to
                    <span *ngIf="t.clockOutUtc" class="text-success fw-bold">{{ t.clockOutUtc | date:'HH:mm' }}</span>
                    <span *ngIf="!t.clockOutUtc" class="text-muted">—</span>
                  </td>
                  <td>{{ t.actualDurationHours || t.plannedDurationHours }} hrs</td>
                  <td>{{ currencySymbol }}{{ t.hourlyPayRate || 10 }}/hr</td>
                  <td>
                    <span *ngIf="t.fineAttached" class="badge-fine-negative">
                      -{{ currencySymbol }}{{ t.fineAmount || 0 }} ({{ t.fineReason || 'Fine' }})
                    </span>
                    <span *ngIf="!t.fineAttached" class="badge-fine-zero">None</span>
                  </td>
                  <td class="text-end fw-bold text-success">
                    {{ currencySymbol }}{{ getShiftNetPay(t) | number:'1.2-2' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- TAB 4: TIME OFF & LEAVE -->
      <div *ngIf="activeTab === 'leave' && !isLoading">
        <div class="workspace-grid-2col">
          <!-- Request Form Card -->
          <div class="cms-card">
            <div class="card-header-simple">
              <span class="material-symbols-outlined text-primary">flight_takeoff</span>
              <h3>Request Time Off</h3>
            </div>
            <div class="card-body-form">
              <div class="form-group mb-3">
                <label class="form-label">Leave Type *</label>
                <select class="form-select" [(ngModel)]="leaveType">
                  <option value="Annual">Annual Leave</option>
                  <option value="Sick">Sick Leave</option>
                  <option value="Compassionate">Compassionate / Emergency</option>
                  <option value="Unpaid">Unpaid Leave</option>
                </select>
              </div>
              <div class="form-row-2 mb-3">
                <div class="form-group">
                  <label class="form-label">Start Date *</label>
                  <input type="date" class="form-control" [(ngModel)]="leaveStartDate" />
                </div>
                <div class="form-group">
                  <label class="form-label">End Date *</label>
                  <input type="date" class="form-control" [(ngModel)]="leaveEndDate" />
                </div>
              </div>
              <div class="form-group mb-4">
                <label class="form-label">Reason / Notes</label>
                <textarea class="form-control" rows="3" [(ngModel)]="leaveReason" placeholder="Describe the reason for your leave request..."></textarea>
              </div>
              <button
                type="button"
                class="btn btn-primary w-100"
                (click)="submitLeave()"
                [disabled]="isActionLoading || !leaveStartDate || !leaveEndDate">
                <span class="material-symbols-outlined">send</span>
                <span>Submit Leave Request</span>
              </button>
            </div>
          </div>

          <!-- My Leave Requests Card -->
          <div class="cms-card">
            <div class="table-toolbar">
              <div class="toolbar-left">
                <h3>My Leave Requests</h3>
                <span class="count-badge" *ngIf="leaveList.length > 0">{{ leaveList.length }}</span>
              </div>
              <div class="toolbar-right">
                <button type="button" class="btn btn-outline" (click)="loadLeaveRequests()">
                  <span class="material-symbols-outlined">refresh</span>
                </button>
              </div>
            </div>

            <div class="empty-state-card" *ngIf="leaveList.length === 0">
              <div class="empty-icon-circle">
                <span class="material-symbols-outlined">event_busy</span>
              </div>
              <h3>No Leave Requests</h3>
              <p>You have no submitted time off requests logged yet.</p>
            </div>

            <div class="table-responsive" *ngIf="leaveList.length > 0">
              <table class="cms-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Dates</th>
                    <th>Days</th>
                    <th>Status</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let l of leaveList">
                    <td><span class="badge-station">{{ l.leaveType }}</span></td>
                    <td>{{ l.startDate | date:'dd MMM' }} - {{ l.endDate | date:'dd MMM yyyy' }}</td>
                    <td>{{ l.totalDays }} day(s)</td>
                    <td>
                      <span class="status-pill" [ngClass]="l.status === 'Approved' ? 'status-active' : (l.status === 'Rejected' ? 'status-danger' : 'status-pending')">
                        {{ l.status }}
                      </span>
                    </td>
                    <td class="text-muted">{{ l.reason || '—' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 5: COMPLIANCE VAULT -->
      <div *ngIf="activeTab === 'documents' && !isLoading">
        <div class="workspace-grid-2col">
          <!-- Upload Form Card -->
          <div class="cms-card">
            <div class="card-header-simple">
              <span class="material-symbols-outlined text-primary">upload_file</span>
              <h3>Upload Compliance Document</h3>
            </div>
            <div class="card-body-form">
              <div class="form-group mb-3">
                <label class="form-label">Document Type *</label>
                <select class="form-select" [(ngModel)]="docForm.documentType">
                  <option value="SiaLicense">SIA Security License</option>
                  <option value="RightToWork">Right to Work Proof / Passport</option>
                  <option value="FacialIdSnapshot">Facial ID / Headshot Verification</option>
                  <option value="FirstAidCert">First Aid Certificate</option>
                  <option value="DrivingLicense">Driving License</option>
                  <option value="Other">Other Compliance Document</option>
                </select>
              </div>
              <div class="form-group mb-3">
                <label class="form-label">Document Name *</label>
                <input type="text" class="form-control" [(ngModel)]="docForm.documentName" placeholder="e.g. SIA Door Supervisor Badge #1002" />
              </div>
              <div class="form-group mb-3">
                <label class="form-label">Expiry Date</label>
                <input type="date" class="form-control" [(ngModel)]="docForm.expiryDateUtc" />
              </div>
              <div class="form-group mb-4">
                <label class="form-label">Document / File URL *</label>
                <input type="url" class="form-control" [(ngModel)]="docForm.fileUrl" placeholder="https://..." />
              </div>
              <button
                type="button"
                class="btn btn-primary w-100"
                (click)="saveDocument()"
                [disabled]="isActionLoading || !docForm.documentName || !docForm.fileUrl">
                <span class="material-symbols-outlined">cloud_upload</span>
                <span>Upload to Vault</span>
              </button>
            </div>
          </div>

          <!-- Verified Vault Card -->
          <div class="cms-card">
            <div class="table-toolbar">
              <div class="toolbar-left">
                <h3>Verified Compliance Documents</h3>
                <span class="count-badge" *ngIf="docList.length > 0">{{ docList.length }}</span>
              </div>
              <div class="toolbar-right">
                <button type="button" class="btn btn-outline" (click)="loadDocuments()">
                  <span class="material-symbols-outlined">refresh</span>
                </button>
              </div>
            </div>

            <div class="empty-state-card" *ngIf="docList.length === 0">
              <div class="empty-icon-circle">
                <span class="material-symbols-outlined">folder_off</span>
              </div>
              <h3>No Documents Uploaded</h3>
              <p>Upload your SIA badge and proof of right to work to stay compliant on all shifts.</p>
            </div>

            <div class="table-responsive" *ngIf="docList.length > 0">
              <table class="cms-table">
                <thead>
                  <tr>
                    <th>Document</th>
                    <th>Type</th>
                    <th>Expiry</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let d of docList">
                    <td><strong class="text-dark">{{ d.documentName }}</strong></td>
                    <td><span class="badge-station">{{ d.documentType }}</span></td>
                    <td>{{ d.expiryDateUtc ? (d.expiryDateUtc | date:'dd MMM yyyy') : 'No Expiry' }}</td>
                    <td><span class="status-pill status-active">Verified</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 6: MY AVAILABILITY -->
      <div *ngIf="activeTab === 'availability' && !isLoading">
        <div class="workspace-grid-2col">
          <!-- Availability Form Card -->
          <div class="cms-card">
            <div class="card-header-simple">
              <span class="material-symbols-outlined text-primary">event_available</span>
              <h3>Log My Availability</h3>
            </div>
            <div class="card-body-form">
              <div class="form-group mb-3">
                <label class="form-label">Target Date *</label>
                <input type="date" class="form-control" [(ngModel)]="availForm.targetDate" />
              </div>
              <div class="form-group mb-3">
                <label class="form-label">Availability State *</label>
                <select class="form-select" [(ngModel)]="availForm.state">
                  <option value="Available">Available (Full Day)</option>
                  <option value="Unavailable">Unavailable (All Day)</option>
                  <option value="PartlyUnavailable">Partly Unavailable (Time Slots)</option>
                </select>
              </div>
              <div class="form-row-2 mb-3" *ngIf="availForm.state === 'PartlyUnavailable'">
                <div class="form-group">
                  <label class="form-label">From Time</label>
                  <input type="time" class="form-control" [(ngModel)]="availForm.unavailableFromTime" />
                </div>
                <div class="form-group">
                  <label class="form-label">To Time</label>
                  <input type="time" class="form-control" [(ngModel)]="availForm.unavailableToTime" />
                </div>
              </div>
              <div class="form-group mb-4">
                <label class="form-label">Reason / Notes</label>
                <textarea class="form-control" rows="2" [(ngModel)]="availForm.reason" placeholder="e.g. University lectures, family commitment..."></textarea>
              </div>
              <button
                type="button"
                class="btn btn-primary w-100"
                (click)="saveAvailability()"
                [disabled]="isActionLoading || !availForm.targetDate">
                <span class="material-symbols-outlined">save</span>
                <span>Save Availability</span>
              </button>
            </div>
          </div>

          <!-- Availability Logs Card -->
          <div class="cms-card">
            <div class="table-toolbar">
              <div class="toolbar-left">
                <h3>Upcoming Availability Logs</h3>
                <span class="count-badge" *ngIf="availList.length > 0">{{ availList.length }}</span>
              </div>
              <div class="toolbar-right">
                <button type="button" class="btn btn-outline" (click)="loadAvailability()">
                  <span class="material-symbols-outlined">refresh</span>
                </button>
              </div>
            </div>

            <div class="empty-state-card" *ngIf="availList.length === 0">
              <div class="empty-icon-circle">
                <span class="material-symbols-outlined">calendar_today</span>
              </div>
              <h3>No Availability Logs</h3>
              <p>Log your preferred working days or unavailable slots to assist rota planners.</p>
            </div>

            <div class="table-responsive" *ngIf="availList.length > 0">
              <table class="cms-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Window</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let a of availList">
                    <td><strong>{{ a.targetDate | date:'dd MMM yyyy' }}</strong></td>
                    <td>
                      <span class="status-pill" [ngClass]="a.state === 'Available' ? 'status-active' : (a.state === 'Unavailable' ? 'status-danger' : 'status-pending')">
                        {{ a.state }}
                      </span>
                    </td>
                    <td>{{ a.unavailableFromTime ? a.unavailableFromTime + ' - ' + a.unavailableToTime : 'Full Day' }}</td>
                    <td class="text-muted">{{ a.reason || '—' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 7: SHIFT REMINDERS -->
      <div *ngIf="activeTab === 'reminders' && !isLoading">
        <div class="cms-card reminders-container">
          <div class="card-header-simple">
            <span class="material-symbols-outlined text-primary">notifications_active</span>
            <div>
              <h3>Shift Readiness &amp; Departure Reminders</h3>
              <p class="card-sub-text">Customize notification intervals and channels before each shift so you never miss a duty call.</p>
            </div>
          </div>
          <div class="card-body-form">
            <div class="form-row-3 mb-4">
              <div class="form-group">
                <label class="form-label">Slot 1 Reminder</label>
                <select class="form-select" [(ngModel)]="reminderPrefs.reminderSlot1Minutes">
                  <option [ngValue]="1440">24 hours before</option>
                  <option [ngValue]="720">12 hours before</option>
                  <option [ngValue]="360">6 hours before</option>
                  <option [ngValue]="0">Disabled</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Slot 2 Reminder</label>
                <select class="form-select" [(ngModel)]="reminderPrefs.reminderSlot2Minutes">
                  <option [ngValue]="240">4 hours before</option>
                  <option [ngValue]="120">2 hours before</option>
                  <option [ngValue]="60">1 hour before</option>
                  <option [ngValue]="0">Disabled</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Slot 3 Reminder</label>
                <select class="form-select" [(ngModel)]="reminderPrefs.reminderSlot3Minutes">
                  <option [ngValue]="45">45 mins before</option>
                  <option [ngValue]="30">30 mins before</option>
                  <option [ngValue]="15">15 mins before</option>
                  <option [ngValue]="0">Disabled</option>
                </select>
              </div>
            </div>

            <div class="toggles-section mb-4">
              <label class="form-label mb-2">Delivery Channels</label>
              <div class="toggle-card">
                <div class="toggle-info">
                  <span class="material-symbols-outlined text-primary">notifications</span>
                  <div>
                    <div class="toggle-title">In-App Notification Alerts</div>
                    <div class="toggle-desc">Instant web &amp; mobile notifications when shifts are assigned or approaching</div>
                  </div>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" [(ngModel)]="reminderPrefs.allowInApp" />
                  <span class="toggle-slider"></span>
                </label>
              </div>

              <div class="toggle-card">
                <div class="toggle-info">
                  <span class="material-symbols-outlined text-blue">mail</span>
                  <div>
                    <div class="toggle-title">Email Departure Alerts</div>
                    <div class="toggle-desc">Receive departure reminder emails with venue address and site instructions</div>
                  </div>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" [(ngModel)]="reminderPrefs.allowEmail" />
                  <span class="toggle-slider"></span>
                </label>
              </div>

              <div class="toggle-card">
                <div class="toggle-info">
                  <span class="material-symbols-outlined text-green">chat</span>
                  <div>
                    <div class="toggle-title">WhatsApp Dispatch Reminders</div>
                    <div class="toggle-desc">Automated WhatsApp ping with 1-tap clock-in link before shift commencement</div>
                  </div>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" [(ngModel)]="reminderPrefs.allowWhatsApp" />
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>

            <button type="button" class="btn btn-primary" (click)="saveReminderPreferences()">
              <span class="material-symbols-outlined">save</span>
              <span>Save Notification Preferences</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Swap Modal (Custom BCC Modal) -->
      <div class="modal-backdrop-custom" *ngIf="showSwapModal" (click)="showSwapModal = false">
        <div class="modal-card-custom" (click)="$event.stopPropagation()">
          <div class="modal-header-custom">
            <div class="modal-title-group">
              <span class="material-symbols-outlined text-primary">swap_horiz</span>
              <div>
                <h3>Request Shift Swap / Cover</h3>
                <p class="modal-subtitle">Offer your shift to eligible colleagues on the team roster</p>
              </div>
            </div>
            <button type="button" class="btn-close-custom" (click)="showSwapModal = false">&times;</button>
          </div>
          <div class="modal-body-custom">
            <p class="small text-muted m-0">
              Request cover for your duty at <strong>{{ selectedShift?.facilityName || selectedShift?.siteName }}</strong> on {{ selectedShift?.startsAtUtc | date:'mediumDate' }}.
            </p>
            <div class="form-group">
              <label class="form-label">Reason for Swap *</label>
              <textarea class="form-control" rows="3" [(ngModel)]="swapReason" placeholder="e.g. Family emergency, university exam, illness..."></textarea>
            </div>
          </div>
          <div class="modal-footer-custom">
            <button type="button" class="btn btn-outline" (click)="showSwapModal = false">Cancel</button>
            <button type="button" class="btn btn-primary" (click)="submitSwap()" [disabled]="!swapReason">
              <span>Submit Swap Request</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Leave Request Modal (Custom BCC Modal) -->
      <div class="modal-backdrop-custom" *ngIf="showLeaveModal" (click)="showLeaveModal = false">
        <div class="modal-card-custom" (click)="$event.stopPropagation()">
          <div class="modal-header-custom">
            <div class="modal-title-group">
              <span class="material-symbols-outlined text-primary">flight_takeoff</span>
              <div>
                <h3>Submit Leave Request</h3>
                <p class="modal-subtitle">Request annual leave, sickness, or time off approval</p>
              </div>
            </div>
            <button type="button" class="btn-close-custom" (click)="showLeaveModal = false">&times;</button>
          </div>
          <div class="modal-body-custom">
            <div class="form-group mb-3">
              <label class="form-label">Leave Type *</label>
              <select class="form-select" [(ngModel)]="leaveType">
                <option value="Annual">Annual Leave</option>
                <option value="Sick">Sick Leave</option>
                <option value="Compassionate">Compassionate Leave</option>
                <option value="Unpaid">Unpaid Leave</option>
              </select>
            </div>
            <div class="form-row-2 mb-3">
              <div class="form-group">
                <label class="form-label">Start Date *</label>
                <input type="date" class="form-control" [(ngModel)]="leaveStartDate" />
              </div>
              <div class="form-group">
                <label class="form-label">End Date *</label>
                <input type="date" class="form-control" [(ngModel)]="leaveEndDate" />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Reason / Notes</label>
              <textarea class="form-control" rows="3" [(ngModel)]="leaveReason" placeholder="Optional notes for supervisor..."></textarea>
            </div>
          </div>
          <div class="modal-footer-custom">
            <button type="button" class="btn btn-outline" (click)="showLeaveModal = false">Cancel</button>
            <button type="button" class="btn btn-primary" (click)="submitLeave()" [disabled]="!leaveStartDate || !leaveEndDate">
              <span>Submit Request</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 6. Info & Shift Operations Guide Modal -->
      <div class="modal-backdrop-custom" *ngIf="showInfoModal" (click)="showInfoModal = false">
        <div class="modal-card-custom" (click)="$event.stopPropagation()">
          <div class="modal-header-custom">
            <div class="modal-title-group">
              <span class="material-symbols-outlined text-primary">info</span>
              <div>
                <h3>Personal Shift &amp; Rota Guide</h3>
                <p class="modal-subtitle">Operational policies, take-home pay estimations, and attendance compliance rules.</p>
              </div>
            </div>
            <button type="button" class="btn-close-custom" (click)="showInfoModal = false">&times;</button>
          </div>
          <div class="modal-body-custom">
            <div class="info-guide-section">
              <h4><span class="material-symbols-outlined text-blue">event_upcoming</span> 1-Tap Shift Confirmations</h4>
              <p>
                When a new rota duty is published, your shift enters the acceptance countdown. Confirming your shift in 1 tap secures your roster post and notifies your duty manager.
              </p>
            </div>
            <div class="info-guide-section">
              <h4><span class="material-symbols-outlined text-green">account_balance_wallet</span> Estimated Take-Home Pay &amp; Holiday Accrual</h4>
              <p>
                Take-home earnings reflect your planned shift hours multiplied by your hourly rate minus standard statutory withholdings. Statutory holiday pay automatically accrues at the standard 12.07% rate per duty hour.
              </p>
            </div>
            <div class="info-guide-section">
              <h4><span class="material-symbols-outlined text-purple">share</span> Peer Shift Swaps &amp; Open Board</h4>
              <p>
                Need duty cover? You can offer any assigned shift to qualified teammates on the Open Shifts board. Once claimed by a colleague, it is routed to your supervisor for final confirmation.
              </p>
            </div>
            <div class="info-guide-section">
              <h4><span class="material-symbols-outlined text-teal">fingerprint</span> Geofenced Duty Clock-In</h4>
              <p>
                Attendance check-in validates device GPS coordinates against the venue's site perimeter. Clock in upon arrival at post to unlock workstation tools.
              </p>
            </div>
          </div>
          <div class="modal-footer-custom">
            <button type="button" class="btn btn-primary" (click)="showInfoModal = false">Got it</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .bcp-page-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding: 0 4px 32px 4px;
    }

    /* Page Header */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      background: var(--md-sys-color-surface, #ffffff);
      padding: 24px 28px;
      border-radius: 16px;
      border: 1px solid var(--md-sys-color-outline, #e2e8f0);
      box-shadow: 0 4px 20px rgba(0,0,0,0.03);
    }
    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #64748b;
      margin-bottom: 6px;
    }
    .breadcrumb a {
      color: #0050e5;
      text-decoration: none;
      font-weight: 600;
    }
    .breadcrumb .sep { color: #cbd5e1; }
    .breadcrumb .current { color: #334155; font-weight: 600; }
    .title-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 4px;
      flex-wrap: wrap;
    }
    .title-row h1 {
      font-size: 26px;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
      letter-spacing: -0.5px;
    }
    .badge-suite {
      font-size: 11px;
      font-weight: 700;
      background: #eff6ff;
      color: #0050e5;
      padding: 3px 10px;
      border-radius: 20px;
      border: 1px solid #bfdbfe;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    .info-trigger-btn {
      background: none;
      border: none;
      padding: 0;
      cursor: pointer;
      color: #64748b;
      display: inline-flex;
      align-items: center;
      transition: color 0.2s;
    }
    .info-trigger-btn:hover { color: #0050e5; }
    .subtitle { color: #64748b; font-size: 14px; margin: 0; }
    .header-actions { display: flex; gap: 12px; }

    /* Sub-Nav Pill Tabs */
    .bcp-subnav-tabs {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      padding: 4px 0 8px 0;
      scrollbar-width: none;
    }
    .bcp-subnav-tabs::-webkit-scrollbar { display: none; }
    .subnav-tab {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 9px 16px;
      border-radius: 10px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      color: #475569;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s;
    }
    .subnav-tab:hover {
      background: #f8fafc;
      border-color: #cbd5e1;
      color: #0f172a;
    }
    .subnav-tab.active {
      background: #0050e5;
      color: #ffffff;
      border-color: #0050e5;
      box-shadow: 0 2px 8px rgba(0,80,229,0.25);
    }
    .subnav-tab .material-symbols-outlined { font-size: 18px; }
    .tab-badge {
      background: #ef4444;
      color: #fff;
      font-size: 10.5px;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 10px;
    }

    /* Top Metrics Grid */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 16px;
    }
    .metric-card {
      background: #ffffff;
      padding: 20px;
      border-radius: 14px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 2px 10px rgba(0,0,0,0.02);
      display: flex;
      flex-direction: column;
      gap: 8px;
      transition: all 0.2s;
    }
    .metric-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.06);
    }
    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .card-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .card-icon .material-symbols-outlined { font-size: 22px; }
    .bg-blue { background: #eff6ff; color: #0050e5; }
    .bg-green { background: #f0fdf4; color: #16a34a; }
    .bg-teal { background: #f0fdfa; color: #0d9488; }
    .bg-purple { background: #faf5ff; color: #9333ea; }
    .card-chip {
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 12px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .chip-blue { background: #eff6ff; color: #0050e5; }
    .chip-teal { background: #f0fdf4; color: #16a34a; }
    .chip-amber { background: #fffbeb; color: #d97706; }
    .chip-purple { background: #faf5ff; color: #9333ea; }
    .card-value {
      font-size: 24px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
    }
    .card-label {
      font-size: 13px;
      font-weight: 600;
      color: #64748b;
    }
    .card-progress-track {
      height: 4px;
      background: #f1f5f9;
      border-radius: 2px;
      overflow: hidden;
      margin-top: 4px;
    }
    .card-progress-bar { height: 100%; border-radius: 2px; }
    .card-sub-info {
      font-size: 12px;
      color: #64748b;
      margin-top: 2px;
    }
    .btn-confirm-inline {
      background: #16a34a;
      color: #ffffff;
      border: none;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11.5px;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.15s;
    }
    .btn-confirm-inline:hover { background: #15803d; }

    /* Monthly Rota Calendar Card */
    .rota-calendar-card {
      background: #ffffff;
      border-radius: 16px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 20px rgba(0,0,0,0.03);
      padding: 24px;
    }
    .calendar-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      flex-wrap: wrap;
      gap: 12px;
    }
    .cal-nav-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .btn-cal-nav {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      width: 34px;
      height: 34px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: #475569;
      transition: all 0.2s;
    }
    .btn-cal-nav:hover { background: #0050e5; color: #fff; border-color: #0050e5; }
    .cal-month-title {
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
    }
    .cal-action-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      padding: 6px 14px;
      border-radius: 10px;
      font-size: 12.5px;
      color: #1e3a8a;
    }
    .btn-clockin-mini {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: #0050e5;
      color: #fff;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      text-decoration: none;
      margin-left: 6px;
    }
    .btn-clockin-mini:hover { background: #003ebd; }

    /* Calendar Grid */
    .calendar-grid-container {
      border: 1px solid #f1f5f9;
      border-radius: 12px;
      overflow: hidden;
    }
    .cal-weekdays-row {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
    }
    .weekday-cell {
      padding: 10px 8px;
      text-align: center;
      font-size: 12px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .cal-days-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      background: #fff;
    }
    .cal-day-cell {
      min-height: 84px;
      padding: 8px;
      border-right: 1px solid #f1f5f9;
      border-bottom: 1px solid #f1f5f9;
      display: flex;
      flex-direction: column;
      gap: 4px;
      transition: background 0.15s;
    }
    .cal-day-cell:nth-child(7n) { border-right: none; }
    .cal-day-cell.other-month { background: #fafafa; opacity: 0.45; }
    .cal-day-cell.today { background: #eff6ff; }
    .cal-day-cell.has-shift { background: #f0f7ff; }
    .day-number {
      font-size: 13px;
      font-weight: 700;
      color: #334155;
    }
    .cal-day-cell.today .day-number {
      color: #0050e5;
      display: inline-block;
      width: 22px;
      height: 22px;
      background: #bfdbfe;
      border-radius: 50%;
      text-align: center;
      line-height: 22px;
    }
    .day-shifts {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .shift-pill-badge {
      background: #0050e5;
      color: #ffffff;
      padding: 3px 6px;
      border-radius: 6px;
      font-size: 10.5px;
      font-weight: 600;
      display: flex;
      flex-direction: column;
      line-height: 1.2;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .badge-time { font-weight: 700; }
    .badge-site { font-size: 9.5px; opacity: 0.85; }

    /* Calendar Footer Summary */
    .calendar-summary-footer {
      display: flex;
      justify-content: space-around;
      align-items: center;
      background: #f8fafc;
      border-radius: 10px;
      padding: 12px 16px;
      margin-top: 16px;
      border: 1px solid #e2e8f0;
      flex-wrap: wrap;
      gap: 12px;
    }
    .summary-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #475569;
    }
    .summary-item .material-symbols-outlined { color: #0050e5; font-size: 18px; }

    /* Custom Info Modal */
    .modal-backdrop-custom {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1050;
      padding: 16px;
    }
    .modal-card-custom {
      background: #ffffff;
      border-radius: 16px;
      max-width: 580px;
      width: 100%;
      box-shadow: 0 20px 40px rgba(0,0,0,0.2);
      overflow: hidden;
      animation: modalSlide 0.2s ease-out;
    }
    @keyframes modalSlide {
      from { transform: translateY(16px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .modal-header-custom {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      border-bottom: 1px solid #e2e8f0;
    }
    .modal-title-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .modal-title-group h3 {
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
    }
    .modal-subtitle {
      font-size: 12.5px;
      color: #64748b;
      margin: 2px 0 0 0;
    }
    .btn-close-custom {
      background: none;
      border: none;
      font-size: 24px;
      color: #64748b;
      cursor: pointer;
    }
    .modal-body-custom {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 18px;
      max-height: 70vh;
      overflow-y: auto;
    }
    .info-guide-section h4 {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 6px 0;
    }
    .info-guide-section p {
      font-size: 13px;
      color: #475569;
      line-height: 1.5;
      margin: 0;
    }
    .modal-footer-custom {
      padding: 16px 24px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: flex-end;
      background: #f8fafc;
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 13px;
      padding: 8px 16px;
      border-radius: 8px;
      border: 1px solid transparent;
      cursor: pointer;
      transition: all 0.15s ease-in-out;
      text-decoration: none;
    }
    .btn-primary {
      background: #0050e5;
      color: #ffffff;
    }
    .btn-primary:hover {
      background: #0043c2;
    }
    .btn-outline {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      color: #475569;
    }
    .btn-outline:hover {
      background: #f8fafc;
      border-color: #94a3b8;
    }
    .btn-outline-primary {
      border-color: #0050e5;
      color: #0050e5;
      background: transparent;
    }
    .btn-outline-primary:hover {
      background: #eff6ff;
    }
    .btn-outline-secondary {
      border-color: #cbd5e1;
      color: #475569;
      background: transparent;
    }
    .btn-outline-secondary:hover {
      background: #f8fafc;
    }
    .btn-outline-success {
      border-color: #16a34a;
      color: #16a34a;
      background: transparent;
    }
    .btn-outline-success:hover {
      background: #f0fdf4;
    }
    .btn-light {
      background: #f1f5f9;
      color: #475569;
    }
    .btn-light:hover {
      background: #e2e8f0;
    }
    .btn-sm {
      padding: 6px 12px;
      font-size: 12px;
    }

    /* Canonical BCC CMS Card */
    .cms-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.02);
      overflow: hidden;
    }
    .table-toolbar {
      padding: 18px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      border-bottom: 1px solid #e2e8f0;
      flex-wrap: wrap;
    }
    .toolbar-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .toolbar-left h3 {
      font-size: 17px;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
    }
    .toolbar-right {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .count-badge {
      font-size: 12px;
      font-weight: 700;
      background: #eff6ff;
      color: #0050e5;
      padding: 3px 10px;
      border-radius: 12px;
      border: 1px solid #bfdbfe;
    }

    /* Card Simple Header */
    .card-header-simple {
      padding: 20px 24px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .card-header-simple h3 {
      font-size: 17px;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
    }
    .card-sub-text {
      font-size: 13px;
      color: #64748b;
      margin: 2px 0 0 0;
    }
    .card-body-form {
      padding: 24px;
    }

    /* Canonical Empty State Card */
    .empty-state-card {
      padding: 56px 24px;
      text-align: center;
      max-width: 520px;
      margin: 20px auto;
    }
    .empty-icon-circle {
      width: 68px;
      height: 68px;
      border-radius: 50%;
      background: linear-gradient(135deg, #eff6ff, #dbeafe);
      color: #0050e5;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px auto;
    }
    .empty-icon-circle .material-symbols-outlined {
      font-size: 32px;
    }
    .empty-state-card h3 {
      font-size: 17px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 8px 0;
    }
    .empty-state-card p {
      font-size: 13.5px;
      color: #64748b;
      margin: 0 0 20px 0;
      line-height: 1.5;
    }

    /* Shifts Grid & Cards */
    .shifts-card-body {
      padding: 24px;
    }
    .shifts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 20px;
    }
    .shift-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      transition: all 0.2s ease-in-out;
      position: relative;
    }
    .shift-card:hover {
      border-color: #0050e5;
      box-shadow: 0 8px 24px rgba(0, 80, 229, 0.08);
      transform: translateY(-2px);
    }
    .shift-card.overnight-card {
      border-left: 4px solid #9333ea;
    }
    .shift-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }
    .shift-badges-group {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .shift-code-badge {
      font-family: monospace;
      font-size: 11.5px;
      font-weight: 700;
      background: #f1f5f9;
      color: #334155;
      padding: 2px 8px;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
    }
    .badge-overnight {
      font-size: 10.5px;
      font-weight: 700;
      background: #faf5ff;
      color: #7e22ce;
      padding: 2px 8px;
      border-radius: 6px;
      border: 1px solid #e9d5ff;
    }
    .status-pill {
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 12px;
      letter-spacing: 0.3px;
    }
    .status-active { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
    .status-pending { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
    .status-danger { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }

    .shift-venue-title {
      font-size: 16px;
      font-weight: 800;
      color: #0050e5;
      margin: 0 0 4px 0;
    }
    .shift-venue-address {
      font-size: 12.5px;
      color: #64748b;
      display: flex;
      align-items: center;
      gap: 4px;
      margin: 0;
    }
    .shift-venue-address .material-symbols-outlined {
      font-size: 16px;
      color: #94a3b8;
    }

    .shift-meta-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12.5px;
    }
    .meta-label { color: #64748b; }
    .meta-val { font-weight: 600; color: #1e293b; }
    .meta-val.val-rate { color: #16a34a; font-weight: 700; }
    .badge-station {
      font-size: 11px;
      font-weight: 700;
      background: #eff6ff;
      color: #1d4ed8;
      padding: 2px 8px;
      border-radius: 6px;
    }

    /* Live Countdown */
    .acceptance-countdown-box {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 10px;
      padding: 10px 12px;
    }
    .countdown-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
    }
    .countdown-title {
      font-weight: 700;
      color: #0050e5;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .countdown-timer {
      font-family: monospace;
      font-weight: 800;
      color: #0f172a;
    }
    .countdown-sub {
      font-size: 11.5px;
      margin-top: 4px;
    }
    .text-danger { color: #ef4444 !important; }
    .text-muted { color: #64748b !important; }
    .text-success { color: #16a34a !important; }

    /* Site Briefing Alert */
    .site-briefing-alert {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 10px;
      padding: 10px 12px;
      font-size: 12px;
    }
    .briefing-header {
      font-weight: 700;
      color: #92400e;
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 4px;
    }
    .briefing-body {
      color: #78350f;
    }

    .shift-actions-row {
      display: flex;
      gap: 10px;
      margin-top: auto;
    }
    .btn-confirm {
      background: #16a34a;
      color: #ffffff;
      border: 1px solid #16a34a;
    }
    .btn-confirm:hover:not(:disabled) {
      background: #15803d;
      box-shadow: 0 4px 12px rgba(22, 163, 74, 0.25);
    }

    /* 2-Column Workspace Grid */
    .workspace-grid-2col {
      display: grid;
      grid-template-columns: minmax(320px, 420px) 1fr;
      gap: 24px;
      align-items: start;
    }
    @media (max-width: 992px) {
      .workspace-grid-2col {
        grid-template-columns: 1fr;
      }
    }

    /* Forms */
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .form-label {
      font-size: 12.5px;
      font-weight: 700;
      color: #334155;
    }
    .form-control,
    .form-select {
      width: 100%;
      padding: 10px 14px;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      font-size: 13.5px;
      color: #0f172a;
      background: #ffffff;
      outline: none;
      transition: all 0.2s;
      box-sizing: border-box;
    }
    .form-control:focus,
    .form-select:focus {
      border-color: #0050e5;
      box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.1);
    }
    .form-row-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }
    .form-row-3 {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 14px;
    }

    /* Tables (CMS Table) */
    .table-responsive {
      overflow-x: auto;
    }
    .cms-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    .cms-table thead th {
      background: #f8fafc;
      padding: 14px 20px;
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      border-bottom: 1px solid #e2e8f0;
    }
    .cms-table tbody td {
      padding: 14px 20px;
      border-bottom: 1px solid #f1f5f9;
      font-size: 13px;
      color: #334155;
    }
    .cms-table tbody tr:hover td {
      background: #f8fafc;
    }
    .venue-cell-title {
      font-weight: 700;
      color: #0050e5;
    }
    .venue-cell-sub {
      font-size: 12px;
      color: #64748b;
      font-family: monospace;
    }
    .badge-fine-negative {
      font-size: 11px;
      font-weight: 700;
      background: #fef2f2;
      color: #b91c1c;
      padding: 2px 8px;
      border-radius: 6px;
      border: 1px solid #fecaca;
    }
    .badge-fine-zero {
      font-size: 11px;
      color: #94a3b8;
      background: #f8fafc;
      padding: 2px 8px;
      border-radius: 6px;
    }

    /* Reminders Toggles */
    .reminders-container {
      max-width: 680px;
      margin: 0 auto;
    }
    .toggles-section {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .toggle-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 18px;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      background: #f8fafc;
    }
    .toggle-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .toggle-info .material-symbols-outlined {
      font-size: 24px;
    }
    .toggle-title {
      font-size: 13.5px;
      font-weight: 700;
      color: #0f172a;
    }
    .toggle-desc {
      font-size: 12px;
      color: #64748b;
    }
    .toggle-switch {
      position: relative;
      display: inline-block;
      width: 44px;
      height: 24px;
      flex-shrink: 0;
    }
    .toggle-switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }
    .toggle-slider {
      position: absolute;
      cursor: pointer;
      inset: 0;
      background-color: #cbd5e1;
      transition: 0.2s;
      border-radius: 24px;
    }
    .toggle-slider:before {
      position: absolute;
      content: "";
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: 0.2s;
      border-radius: 50%;
    }
    input:checked + .toggle-slider {
      background-color: #0050e5;
    }
    input:checked + .toggle-slider:before {
      transform: translateX(20px);
    }

    /* Loading state */
    .loading-state-card {
      background: #ffffff;
      border-radius: 16px;
      border: 1px solid #e2e8f0;
      padding: 48px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }
    .spinner-ring {
      width: 36px;
      height: 36px;
      border: 3px solid #e2e8f0;
      border-top-color: #0050e5;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .spin { animation: spin 0.8s linear infinite; }

    /* Dark Mode */
    :host-context(.dark-mode) .bcp-page-container { color: #f8fafc; }
    :host-context(.dark-mode) .page-header,
    :host-context(.dark-mode) .rota-calendar-card,
    :host-context(.dark-mode) .metric-card,
    :host-context(.dark-mode) .card,
    :host-context(.dark-mode) .modal-card-custom {
      background: #1e293b;
      border-color: rgba(255,255,255,0.08);
      color: #f8fafc;
    }
    :host-context(.dark-mode) .title-row h1,
    :host-context(.dark-mode) .card-value,
    :host-context(.dark-mode) .cal-month-title,
    :host-context(.dark-mode) .modal-title-group h3 {
      color: #f8fafc;
    }
    :host-context(.dark-mode) .subnav-tab {
      background: #0f172a;
      border-color: #334155;
      color: #94a3b8;
    }
    :host-context(.dark-mode) .subnav-tab.active {
      background: #0050e5;
      color: #ffffff;
    }
    :host-context(.dark-mode) .cal-weekdays-row,
    :host-context(.dark-mode) .calendar-summary-footer,
    :host-context(.dark-mode) .modal-footer-custom {
      background: #0f172a;
      border-color: #334155;
    }
    :host-context(.dark-mode) .cal-days-grid { background: #1e293b; }
    :host-context(.dark-mode) .cal-day-cell { border-color: #334155; }
    :host-context(.dark-mode) .cal-day-cell.other-month { background: #0f172a; }
  `]
})
export class WorkforceMyShiftsComponent implements OnInit, OnDestroy {
  shifts: Shift[] = [];
  openShifts: Shift[] = [];
  timesheetList: Shift[] = [];
  leaveList: any[] = [];
  docList: any[] = [];
  availList: any[] = [];

  isLoading = false;
  isActionLoading = false;
  currencySymbol = '';

  activeTab: 'analytics' | 'shifts' | 'open-shifts' | 'timesheets' | 'leave' | 'documents' | 'availability' | 'reminders' = 'analytics';

  showInfoModal = false;
  showSwapModal = false;
  selectedShift: Shift | null = null;
  swapReason = '';

  showLeaveModal = false;
  leaveType = 'Annual';
  leaveStartDate = '';
  leaveEndDate = '';
  leaveReason = '';

  // Calendar State
  currentMonth: Date = new Date();
  calendarDays: { date: Date; dayNumber: number; isCurrentMonth: boolean; isToday: boolean; shifts: Shift[] }[] = [];

  // Availability state
  availForm: any = {
    targetDate: '',
    state: 'Available',
    unavailableFromTime: '09:00',
    unavailableToTime: '17:00',
    reason: ''
  };

  // Documents state
  docForm: any = {
    documentType: 'SiaLicense',
    documentName: '',
    expiryDateUtc: '',
    fileUrl: ''
  };

  // Reminders state
  reminderPrefs: any = {
    reminderSlot1Minutes: 1440,
    reminderSlot2Minutes: 240,
    reminderSlot3Minutes: 30,
    allowInApp: true,
    allowEmail: true,
    allowWhatsApp: true
  };

  private routeSub?: Subscription;

  constructor(
    private readonly workforceService: WorkforceService,
    private readonly toast: ToastService,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) { }

  ngOnInit(): void {
    this.workforceService.getTenantCurrency().subscribe({
      next: (res: any) => {
        if (res?.data?.currencySymbol) {
          this.currencySymbol = res.data.currencySymbol;
        }
      },
      error: () => {}
    });

    this.routeSub = this.route.data.subscribe((data) => {
      const tab = data['tab'] || this.route.snapshot.queryParams['tab'];
      if (tab) {
        this.activeTab = tab;
      }
      this.loadActiveTabData();
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  switchTab(tab: 'analytics' | 'shifts' | 'open-shifts' | 'timesheets' | 'leave' | 'documents' | 'availability' | 'reminders'): void {
    this.activeTab = tab;
    const routeMap: Record<string, string> = {
      'analytics': '/workforce/workspace/analytics',
      'shifts': '/workforce/workspace/my-shifts',
      'open-shifts': '/workforce/workspace/open-shifts',
      'timesheets': '/workforce/workspace/timesheets',
      'leave': '/workforce/workspace/leave',
      'documents': '/workforce/workspace/documents'
    };
    if (routeMap[tab]) {
      this.router.navigate([routeMap[tab]], { replaceUrl: true });
    }
    this.loadActiveTabData();
  }

  loadActiveTabData(): void {
    if (this.activeTab === 'analytics' || this.activeTab === 'shifts') {
      this.loadMyShifts();
    } else if (this.activeTab === 'open-shifts') {
      this.loadOpenShifts();
    } else if (this.activeTab === 'timesheets') {
      this.loadTimesheets();
    } else if (this.activeTab === 'leave') {
      this.loadLeaveRequests();
    } else if (this.activeTab === 'documents') {
      this.loadDocuments();
    } else if (this.activeTab === 'availability') {
      this.loadAvailability();
    } else if (this.activeTab === 'reminders') {
      this.loadReminders();
    }
  }

  getPageTitle(): string {
    switch (this.activeTab) {
      case 'analytics': return 'Shift Analytics & Summary';
      case 'shifts': return 'My Schedule & Rota';
      case 'open-shifts': return 'Open Shifts & Swaps';
      case 'timesheets': return 'Timesheets & Pay';
      case 'leave': return 'Time Off & Availability';
      case 'documents': return 'Compliance & Documents';
      case 'availability': return 'My Availability';
      case 'reminders': return 'Shift Reminders';
      default: return 'Shift & Rota Command Hub';
    }
  }

  getPageSubtitle(): string {
    switch (this.activeTab) {
      case 'analytics': return 'High-level operational overview, monthly take-home pay estimate, and scheduled duties.';
      case 'shifts': return 'Review assigned duties, confirm upcoming rosters, and manage shift attendance.';
      case 'open-shifts': return 'Browse available venue shifts and claim extra duty hours.';
      case 'timesheets': return 'Logged duty hours, supervisor sign-offs, break deductions, and pay statements.';
      case 'leave': return 'Submit and track annual leave, sickness, and time-off requests.';
      case 'documents': return 'Manage your SIA license, Right to Work credentials, and certifications.';
      case 'availability': return 'Set your preferred working hours and blackout dates for the scheduler.';
      case 'reminders': return 'Configure automated shift departure and readiness alerts.';
      default: return 'Member operational duty command hub.';
    }
  }

  // --- CALENDAR & METRIC GETTERS ---
  generateCalendar(): void {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days: { date: Date; dayNumber: number; isCurrentMonth: boolean; isToday: boolean; shifts: Shift[] }[] = [];
    const today = new Date();

    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({
        date: d,
        dayNumber: d.getDate(),
        isCurrentMonth: false,
        isToday: false,
        shifts: this.getShiftsForDate(d)
      });
    }

    for (let day = 1; day <= lastDay.getDate(); day++) {
      const d = new Date(year, month, day);
      const isToday = d.toDateString() === today.toDateString();
      days.push({
        date: d,
        dayNumber: day,
        isCurrentMonth: true,
        isToday,
        shifts: this.getShiftsForDate(d)
      });
    }

    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({
        date: d,
        dayNumber: i,
        isCurrentMonth: false,
        isToday: false,
        shifts: this.getShiftsForDate(d)
      });
    }

    this.calendarDays = days;
  }

  getShiftsForDate(date: Date): Shift[] {
    const dateStr = date.toISOString().slice(0, 10);
    return this.shifts.filter(s => s.startsAtUtc && s.startsAtUtc.slice(0, 10) === dateStr);
  }

  prevMonth(): void {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() - 1, 1);
    this.generateCalendar();
  }

  nextMonth(): void {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 1);
    this.generateCalendar();
  }

  get nextUpcomingShift(): Shift | null {
    const now = new Date();
    const upcoming = this.shifts
      .filter(s => new Date(s.endsAtUtc) >= now)
      .sort((a, b) => new Date(a.startsAtUtc).getTime() - new Date(b.startsAtUtc).getTime());
    return upcoming.length > 0 ? upcoming[0] : (this.shifts.length > 0 ? this.shifts[0] : null);
  }

  get totalPlannedHours(): number {
    return this.shifts.reduce((acc, s) => acc + (s.plannedDurationHours || 0), 0);
  }

  get estimatedGrossPay(): number {
    return this.shifts.reduce((acc, s) => acc + ((s.plannedDurationHours || 0) * (s.hourlyPayRate || 10.0)), 0);
  }

  get estimatedTakeHomePay(): number {
    return Math.round(this.estimatedGrossPay * 0.82 * 100) / 100;
  }

  get accruedHolidayHours(): number {
    return Math.round(this.totalPlannedHours * 0.1207 * 10) / 10;
  }

  get nextPaydayDate(): Date {
    const today = new Date();
    const nextFriday = new Date();
    const day = today.getDay();
    const diff = (5 - day + 7) % 7 || 7;
    nextFriday.setDate(today.getDate() + diff);
    return nextFriday;
  }

  get daysUntilPayday(): number {
    const today = new Date();
    const payday = this.nextPaydayDate;
    const diffTime = payday.getTime() - today.getTime();
    return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }

  // --- TAB: SCHEDULE / MY SHIFTS ---
  loadMyShifts(): void {
    this.isLoading = true;
    this.workforceService.getMyShifts().subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.isSuccess && res.data) {
          this.shifts = res.data;
          this.generateCalendar();
        }
      },
      error: () => {
        this.isLoading = false;
        this.toast.error('Unable to load your assigned shifts.');
      }
    });
  }

  getCountdown(s: Shift): string {
    if (s.isConfirmedByGuard) return 'Accepted';
    if (!s.acceptanceDeadlineUtc) return 'No Deadline Set';
    const diff = new Date(s.acceptanceDeadlineUtc).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const hrs = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hrs.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m remaining`;
  }

  isShiftExpired(s: Shift): boolean {
    if (s.isConfirmedByGuard || !s.acceptanceDeadlineUtc) return false;
    return new Date(s.acceptanceDeadlineUtc).getTime() <= Date.now();
  }

  confirmShift(shift: Shift): void {
    if (this.isShiftExpired(shift)) {
      this.toast.error('This shift acceptance deadline has expired.');
      return;
    }

    this.isActionLoading = true;
    this.workforceService.confirmShift(shift.id).subscribe({
      next: (res) => {
        this.isActionLoading = false;
        if (res.isSuccess) {
          shift.isConfirmedByGuard = true;
          shift.status = 'Confirmed';
          this.toast.success('Shift confirmed.');
        } else {
          this.toast.error(res.message || 'Confirmation failed.');
        }
      },
      error: () => {
        this.isActionLoading = false;
        this.toast.error('Failed to confirm shift.');
      }
    });
  }

  // --- TAB: OPEN SHIFTS ---
  loadOpenShifts(): void {
    this.isLoading = true;
    this.workforceService.getOpenShifts().subscribe({
      next: (res: any) => {
        this.isLoading = false;
        if (res.isSuccess && res.data) {
          this.openShifts = res.data;
        }
      },
      error: () => {
        this.isLoading = false;
        this.toast.error('Unable to load open shifts.');
      }
    });
  }

  claimOpenShiftDirect(shift: Shift): void {
    this.isActionLoading = true;
    this.workforceService.claimShiftDirect(shift.id).subscribe({
      next: (res: any) => {
        this.isActionLoading = false;
        if (res.isSuccess) {
          this.toast.success('Shift claimed successfully! Added to your schedule.');
          this.loadOpenShifts();
        } else {
          this.toast.error(res.message || 'Unable to claim shift.');
        }
      },
      error: (err: any) => {
        this.isActionLoading = false;
        this.toast.error(err?.error?.message || 'Unable to claim shift.');
      }
    });
  }

  // --- TAB: TIMESHEETS ---
  loadTimesheets(): void {
    this.isLoading = true;
    this.workforceService.getMyTimesheets().subscribe({
      next: (res: any) => {
        this.isLoading = false;
        if (res.isSuccess && res.data) {
          this.timesheetList = res.data;
        }
      },
      error: () => {
        this.isLoading = false;
        this.toast.error('Unable to load timesheet history.');
      }
    });
  }

  getTotalTimesheetHours(): number {
    const total = this.timesheetList.reduce((acc, t) => acc + (t.actualDurationHours || t.plannedDurationHours || 0), 0);
    return Math.round(total * 10) / 10;
  }

  getTotalGrossPay(): number {
    return this.timesheetList.reduce((acc, t) => {
      const hours = t.actualDurationHours || t.plannedDurationHours || 0;
      const rate = t.hourlyPayRate || 10;
      return acc + (hours * rate);
    }, 0);
  }

  getTotalNetPay(): number {
    return this.timesheetList.reduce((acc, t) => {
      const gross = (t.actualDurationHours || t.plannedDurationHours || 0) * (t.hourlyPayRate || 10);
      const fine = t.fineAttached ? (t.fineAmount || 0) : 0;
      return acc + Math.max(0, gross - fine);
    }, 0);
  }

  getShiftNetPay(t: Shift): number {
    const gross = (t.actualDurationHours || t.plannedDurationHours || 0) * (t.hourlyPayRate || 10);
    const fine = t.fineAttached ? (t.fineAmount || 0) : 0;
    return Math.max(0, gross - fine);
  }

  // --- TAB: LEAVE & TIME OFF ---
  loadLeaveRequests(): void {
    this.workforceService.getMyLeaveRequests().subscribe({
      next: (res: any) => {
        if (res.isSuccess && res.data) {
          this.leaveList = res.data;
        }
      }
    });
  }

  submitLeave(): void {
    if (!this.leaveStartDate || !this.leaveEndDate) return;
    const req = {
      leaveType: this.leaveType,
      startDate: new Date(this.leaveStartDate).toISOString(),
      endDate: new Date(this.leaveEndDate).toISOString(),
      reason: this.leaveReason
    };
    this.workforceService.requestLeave(req).subscribe({
      next: (res: any) => {
        this.showLeaveModal = false;
        if (res.isSuccess) {
          this.toast.success('Leave request submitted successfully.');
          this.leaveReason = '';
          this.loadLeaveRequests();
        } else {
          this.toast.error(res.message || 'Leave submission failed.');
        }
      },
      error: () => {
        this.showLeaveModal = false;
        this.toast.error('Failed to submit leave request.');
      }
    });
  }

  // --- TAB: AVAILABILITY ---
  loadAvailability(): void {
    this.workforceService.getAvailability().subscribe({
      next: (res: any) => {
        if (res.isSuccess && res.data) {
          this.availList = res.data;
        }
      }
    });
  }

  saveAvailability(): void {
    if (!this.availForm.targetDate) return;
    this.workforceService.upsertAvailability(this.availForm).subscribe({
      next: (res: any) => {
        if (res.isSuccess) {
          this.toast.success('Availability saved.');
          this.loadAvailability();
          this.availForm.reason = '';
        } else {
          this.toast.error(res.message || 'Failed to save availability.');
        }
      },
      error: () => this.toast.error('Error recording availability.')
    });
  }

  // --- TAB: COMPLIANCE VAULT ---
  loadDocuments(): void {
    this.workforceService.getDocuments().subscribe({
      next: (res: any) => {
        if (res.isSuccess && res.data) {
          this.docList = res.data;
        }
      }
    });
  }

  saveDocument(): void {
    if (!this.docForm.documentName || !this.docForm.fileUrl) return;
    this.workforceService.uploadDocument(this.docForm).subscribe({
      next: (res: any) => {
        if (res.isSuccess) {
          this.toast.success('Document uploaded to vault.');
          this.loadDocuments();
          this.docForm.documentName = '';
          this.docForm.fileUrl = '';
        } else {
          this.toast.error(res.message || 'Failed to save document.');
        }
      },
      error: () => this.toast.error('Error uploading document.')
    });
  }

  // --- TAB: REMINDERS ---
  loadReminders(): void {
    this.workforceService.getNotificationPreferences().subscribe({
      next: (res: any) => {
        if (res.isSuccess && res.data) {
          this.reminderPrefs = res.data;
        }
      }
    });
  }

  saveReminderPreferences(): void {
    this.workforceService.updateNotificationPreferences(this.reminderPrefs).subscribe({
      next: (res: any) => {
        if (res.isSuccess) {
          this.toast.success('Notification preferences saved.');
        } else {
          this.toast.error(res.message || 'Failed to update preferences.');
        }
      },
      error: () => this.toast.error('Error updating notification preferences.')
    });
  }

  openSwapModal(shift: Shift): void {
    this.selectedShift = shift;
    this.swapReason = '';
    this.showSwapModal = true;
  }

  submitSwap(): void {
    if (!this.selectedShift) return;
    this.workforceService.requestSwap({
      shiftId: this.selectedShift.id,
      reason: this.swapReason
    }).subscribe({
      next: (res: any) => {
        this.showSwapModal = false;
        if (res.isSuccess) {
          this.toast.success('Swap request submitted for supervisor approval.');
          this.loadMyShifts();
        } else {
          this.toast.error(res.message || 'Swap request failed.');
        }
      },
      error: () => {
        this.showSwapModal = false;
        this.toast.error('Failed to request shift swap.');
      }
    });
  }

  getStatusBadge(s: Shift): string {
    if (s.isClockedIn) return 'bg-primary';
    if (s.isClockedOut) return 'bg-secondary';
    if (s.isConfirmedByGuard) return 'bg-success';
    return 'bg-warning text-dark';
  }
}
