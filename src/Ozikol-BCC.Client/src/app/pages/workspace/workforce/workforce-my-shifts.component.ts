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

        <!-- 5. Upcoming Assigned Shifts Cards -->
        <div class="section-title-bar mb-3 d-flex justify-content-between align-items-center">
          <div>
            <h4 class="m-0 fw-bold">Upcoming Assigned Rota Duties</h4>
            <p class="text-muted small m-0">Review venue post requirements, SIA sector authorizations, and confirm duty attendance.</p>
          </div>
          <button class="btn btn-sm btn-outline-primary" (click)="switchTab('open-shifts')">
            <span class="material-symbols-outlined fs-6 align-middle">add_circle</span> Browse Extra Open Shifts
          </button>
        </div>
        <div class="empty-state text-center p-5 bg-white rounded shadow-sm" *ngIf="shifts.length === 0">
          <span class="material-symbols-outlined display-4 text-muted mb-3">event_available</span>
          <h5>No shifts assigned</h5>
          <p class="text-muted">You have no upcoming shifts assigned on your rota schedule.</p>
          <button class="btn btn-primary mt-2" (click)="switchTab('open-shifts')">
            Browse Open Shifts
          </button>
        </div>

        <div class="row g-3" *ngIf="shifts.length > 0">
          <div class="col-md-6 col-xl-4" *ngFor="let s of shifts">
            <div class="card h-100 border-0 shadow-sm shift-card" [class.border-start-overnight]="s.isOvernight">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-start mb-2">
                  <div>
                    <span class="badge bg-light text-dark font-monospace">{{ s.shiftCode }}</span>
                    <span class="badge bg-purple ms-1" *ngIf="s.isOvernight">24/7 Overnight</span>
                  </div>
                  <span class="badge" [ngClass]="getStatusBadge(s)">{{ s.status }}</span>
                </div>

                <h5 class="card-title mb-1 text-primary">{{ s.facilityName || s.siteName }}</h5>
                <p class="text-muted small mb-2">
                  <span class="material-symbols-outlined align-middle fs-6">place</span> 
                  {{ s.address || s.siteAddress }} <span *ngIf="s.postCode" class="fw-bold">({{ s.postCode }})</span>
                </p>

                <div class="border rounded p-2 bg-light mb-3">
                  <div class="d-flex justify-content-between small">
                    <span class="text-muted">Role / Post:</span>
                    <span class="fw-semibold">{{ s.postName }}</span>
                  </div>
                  <div class="d-flex justify-content-between small mt-1">
                    <span class="text-muted">Starts:</span>
                    <span class="fw-semibold">{{ s.startsAtUtc | date:'dd MMM, HH:mm' }}</span>
                  </div>
                  <div class="d-flex justify-content-between small mt-1">
                    <span class="text-muted">Ends:</span>
                    <span class="fw-semibold">{{ s.endsAtUtc | date:'dd MMM, HH:mm' }}</span>
                  </div>
                  <div class="d-flex justify-content-between small mt-1">
                    <span class="text-muted">Duration:</span>
                    <span>{{ s.plannedDurationHours }} hrs (break: {{ s.breakMinutes }}m)</span>
                  </div>
                  <div class="d-flex justify-content-between small mt-1">
                    <span class="text-muted">Pay Rate:</span>
                    <span class="fw-bold text-success">{{ s.hourlyPayRate ? currencySymbol + s.hourlyPayRate + '/hr' : (currencySymbol + '10.00/hr') }}</span>
                  </div>
                  <div class="d-flex justify-content-between small mt-1" *ngIf="s.requiredWorkspaceStationName">
                    <span class="text-muted">Workstation:</span>
                    <span class="badge bg-info text-dark">{{ s.requiredWorkspaceStationName }}</span>
                  </div>
                </div>

                <!-- Live Acceptance Countdown Alert -->
                <div class="acceptance-countdown-box p-2 rounded mb-3" *ngIf="!s.isConfirmedByGuard">
                  <div class="d-flex align-items-center justify-content-between small">
                    <span class="fw-bold d-flex align-items-center gap-1" [ngClass]="isShiftExpired(s) ? 'text-danger' : 'text-primary'">
                      <span class="material-symbols-outlined fs-6">{{ isShiftExpired(s) ? 'timer_off' : 'timer' }}</span>
                      {{ isShiftExpired(s) ? 'Acceptance Expired' : 'Acceptance Deadline' }}
                    </span>
                    <span class="font-monospace fw-bold" [ngClass]="isShiftExpired(s) ? 'text-danger' : 'text-dark'">
                      {{ getCountdown(s) }}
                    </span>
                  </div>
                  <div class="small text-muted mt-1" *ngIf="!isShiftExpired(s)">
                    Please confirm before the timer lapses to secure this shift.
                  </div>
                  <div class="small text-danger mt-1" *ngIf="isShiftExpired(s)">
                    This assignment has expired and may be reclaimed by other team members.
                  </div>
                </div>

                <div class="site-briefing-alert p-2 rounded mb-3 small" *ngIf="s.siteAssignmentInstructions">
                  <div class="fw-semibold text-dark d-flex align-items-center gap-1 mb-1">
                    <span class="material-symbols-outlined fs-6 text-warning">info</span> Site Assignment Instructions (SIs)
                  </div>
                  <div class="text-secondary">{{ s.siteAssignmentInstructions }}</div>
                </div>

                <div class="d-flex gap-2">
                  <button
                    class="btn btn-sm btn-outline-success flex-fill"
                    *ngIf="!s.isConfirmedByGuard"
                    (click)="confirmShift(s)"
                    [disabled]="isActionLoading || isShiftExpired(s)">
                    Confirm Shift
                  </button>
                  <button
                    class="btn btn-sm btn-outline-secondary flex-fill"
                    (click)="openSwapModal(s)">
                    Request Swap
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 2: OPEN SHIFTS (CLAIM BOARD) -->
      <div *ngIf="activeTab === 'open-shifts' && !isLoading">
        <div class="d-flex align-items-center justify-content-between mb-3">
          <div>
            <h5 class="fw-bold m-0 text-dark">Available Open Shifts</h5>
            <p class="text-muted small m-0">Claim extra venue shifts directly. Shifts are confirmed upon claiming.</p>
          </div>
          <button class="btn btn-sm btn-outline-primary" (click)="loadOpenShifts()">
            <span class="material-symbols-outlined fs-6 align-middle me-1">refresh</span> Refresh
          </button>
        </div>

        <div class="empty-state text-center p-5 bg-white rounded shadow-sm" *ngIf="openShifts.length === 0">
          <span class="material-symbols-outlined display-4 text-muted mb-3">event_busy</span>
          <h5>No open shifts available</h5>
          <p class="text-muted">All venue shifts are currently assigned. Check back later for open duty calls.</p>
        </div>

        <div class="row g-3" *ngIf="openShifts.length > 0">
          <div class="col-md-6 col-xl-4" *ngFor="let os of openShifts">
            <div class="card h-100 border-0 shadow-sm shift-card">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-start mb-2">
                  <span class="badge bg-light text-dark font-monospace">{{ os.shiftCode }}</span>
                  <span class="badge bg-success">Open to Claim</span>
                </div>

                <h5 class="card-title mb-1 text-primary">{{ os.facilityName || os.siteName }}</h5>
                <p class="text-muted small mb-2">
                  <span class="material-symbols-outlined align-middle fs-6">place</span>
                  {{ os.address || os.siteAddress }} <span *ngIf="os.postCode" class="fw-bold">({{ os.postCode }})</span>
                </p>

                <div class="border rounded p-2 bg-light mb-3">
                  <div class="d-flex justify-content-between small">
                    <span class="text-muted">Post / Role:</span>
                    <span class="fw-semibold">{{ os.postName }}</span>
                  </div>
                  <div class="d-flex justify-content-between small mt-1">
                    <span class="text-muted">Starts:</span>
                    <span class="fw-semibold">{{ os.startsAtUtc | date:'dd MMM, HH:mm' }}</span>
                  </div>
                  <div class="d-flex justify-content-between small mt-1">
                    <span class="text-muted">Ends:</span>
                    <span class="fw-semibold">{{ os.endsAtUtc | date:'dd MMM, HH:mm' }}</span>
                  </div>
                  <div class="d-flex justify-content-between small mt-1">
                    <span class="text-muted">Duration:</span>
                    <span>{{ os.plannedDurationHours }} hrs (break: {{ os.breakMinutes }}m)</span>
                  </div>
                  <div class="d-flex justify-content-between small mt-1">
                    <span class="text-muted">Pay Rate:</span>
                    <span class="fw-bold text-success">{{ os.hourlyPayRate ? currencySymbol + os.hourlyPayRate + '/hr' : (currencySymbol + '10.00/hr') }}</span>
                  </div>
                </div>

                <div class="site-briefing-alert p-2 rounded mb-3 small" *ngIf="os.siteAssignmentInstructions">
                  <div class="fw-semibold text-dark d-flex align-items-center gap-1 mb-1">
                    <span class="material-symbols-outlined fs-6 text-warning">info</span> Site Instructions
                  </div>
                  <div class="text-secondary">{{ os.siteAssignmentInstructions }}</div>
                </div>

                <button class="btn btn-primary w-100 d-flex align-items-center justify-content-center gap-1"
                        (click)="claimOpenShiftDirect(os)" [disabled]="isActionLoading">
                  <span class="material-symbols-outlined fs-6">how_to_reg</span> Apply &amp; Claim Shift
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 3: TIMESHEETS (DUTY HOURS & PAY SUMMARY) -->
      <div *ngIf="activeTab === 'timesheets' && !isLoading">
        <!-- 4 KPI Summary Cards -->
        <div class="row g-3 mb-4">
          <div class="col-6 col-lg-3">
            <div class="card p-3 border-0 shadow-sm h-100">
              <span class="text-muted small fw-semibold text-uppercase">Completed Duties</span>
              <div class="h3 fw-bold text-dark mt-2 mb-0">{{ timesheetList.length }}</div>
              <small class="text-muted mt-1">Recorded shifts</small>
            </div>
          </div>
          <div class="col-6 col-lg-3">
            <div class="card p-3 border-0 shadow-sm h-100">
              <span class="text-muted small fw-semibold text-uppercase">Total Worked Hours</span>
              <div class="h3 fw-bold text-primary mt-2 mb-0">{{ getTotalTimesheetHours() }} hrs</div>
              <small class="text-muted mt-1">Logged duty time</small>
            </div>
          </div>
          <div class="col-6 col-lg-3">
            <div class="card p-3 border-0 shadow-sm h-100">
              <span class="text-muted small fw-semibold text-uppercase">Gross Earnings</span>
              <div class="h3 fw-bold text-success mt-2 mb-0">{{ currencySymbol }}{{ getTotalGrossPay() | number:'1.2-2' }}</div>
              <small class="text-muted mt-1">Pre-deductions</small>
            </div>
          </div>
          <div class="col-6 col-lg-3">
            <div class="card p-3 border-0 shadow-sm h-100">
              <span class="text-muted small fw-semibold text-uppercase">Net Remuneration</span>
              <div class="h3 fw-bold text-dark mt-2 mb-0">{{ currencySymbol }}{{ getTotalNetPay() | number:'1.2-2' }}</div>
              <small class="text-muted mt-1">After fine deductions</small>
            </div>
          </div>
        </div>

        <!-- Timesheet History Table -->
        <div class="card p-3 border-0 shadow-sm">
          <div class="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
            <h5 class="fw-bold m-0 text-dark">Duty History &amp; Attendance Logs</h5>
            <button class="btn btn-sm btn-outline-primary" (click)="loadTimesheets()">
              <span class="material-symbols-outlined fs-6 align-middle me-1">refresh</span> Refresh
            </button>
          </div>

          <div class="empty-state text-center p-5 text-muted" *ngIf="timesheetList.length === 0">
            <span class="material-symbols-outlined display-4 text-muted mb-2">receipt_long</span>
            <h6>No timesheet records found</h6>
            <p class="small text-muted">Completed shifts with attendance logs will appear here for payroll calculation.</p>
          </div>

          <div class="table-responsive" *ngIf="timesheetList.length > 0">
            <table class="table table-hover align-middle mb-0">
              <thead class="table-light small">
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
                    <div class="fw-bold text-primary">{{ t.siteName }}</div>
                    <div class="small text-muted font-monospace">{{ t.shiftCode }} &bull; {{ t.postName }}</div>
                  </td>
                  <td class="small fw-semibold">{{ t.startsAtUtc | date:'dd MMM yyyy' }}</td>
                  <td class="small">{{ t.startsAtUtc | date:'HH:mm' }} - {{ t.endsAtUtc | date:'HH:mm' }}</td>
                  <td class="small">
                    <span *ngIf="t.clockInUtc" class="text-success fw-semibold">{{ t.clockInUtc | date:'HH:mm' }}</span>
                    <span *ngIf="!t.clockInUtc" class="text-muted">—</span>
                    to
                    <span *ngIf="t.clockOutUtc" class="text-success fw-semibold">{{ t.clockOutUtc | date:'HH:mm' }}</span>
                    <span *ngIf="!t.clockOutUtc" class="text-muted">—</span>
                  </td>
                  <td class="small">{{ t.actualDurationHours || t.plannedDurationHours }} hrs</td>
                  <td class="small text-muted">{{ currencySymbol }}{{ t.hourlyPayRate || 10 }}/hr</td>
                  <td>
                    <span *ngIf="t.fineAttached" class="badge bg-danger">
                      -{{ currencySymbol }}{{ t.fineAmount || 0 }} ({{ t.fineReason || 'Fine' }})
                    </span>
                    <span *ngIf="!t.fineAttached" class="badge bg-light text-muted">None</span>
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
        <div class="row g-4">
          <div class="col-md-5">
            <div class="card p-3 shadow-sm border-0">
              <h5 class="fw-bold mb-3 text-primary">Request Time Off</h5>
              <div class="mb-3">
                <label class="form-label">Leave Type *</label>
                <select class="form-select" [(ngModel)]="leaveType">
                  <option value="Annual">Annual Leave</option>
                  <option value="Sick">Sick Leave</option>
                  <option value="Compassionate">Compassionate / Emergency</option>
                  <option value="Unpaid">Unpaid Leave</option>
                </select>
              </div>
              <div class="row g-2 mb-3">
                <div class="col-6">
                  <label class="form-label">Start Date *</label>
                  <input type="date" class="form-control" [(ngModel)]="leaveStartDate" />
                </div>
                <div class="col-6">
                  <label class="form-label">End Date *</label>
                  <input type="date" class="form-control" [(ngModel)]="leaveEndDate" />
                </div>
              </div>
              <div class="mb-3">
                <label class="form-label">Reason / Notes</label>
                <textarea class="form-control" rows="3" [(ngModel)]="leaveReason" placeholder="Describe the reason for your leave request"></textarea>
              </div>
              <button class="btn btn-primary w-100" (click)="submitLeave()" [disabled]="!leaveStartDate || !leaveEndDate">
                Submit Leave Request
              </button>
            </div>
          </div>

          <div class="col-md-7">
            <div class="card p-3 shadow-sm border-0">
              <div class="d-flex align-items-center justify-content-between mb-3">
                <h5 class="fw-bold m-0 text-dark">My Leave Requests</h5>
                <button class="btn btn-sm btn-outline-primary" (click)="loadLeaveRequests()">
                  <span class="material-symbols-outlined fs-6 align-middle me-1">refresh</span> Refresh
                </button>
              </div>

              <div class="table-responsive" *ngIf="leaveList.length > 0">
                <table class="table table-hover align-middle">
                  <thead class="table-light small">
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
                      <td class="fw-semibold">{{ l.leaveType }}</td>
                      <td class="small">{{ l.startDate | date:'dd MMM' }} - {{ l.endDate | date:'dd MMM yyyy' }}</td>
                      <td class="small">{{ l.totalDays }} day(s)</td>
                      <td>
                        <span class="badge" [class.bg-warning]="l.status === 'Pending'" [class.bg-success]="l.status === 'Approved'" [class.bg-danger]="l.status === 'Rejected'" [class.text-dark]="l.status === 'Pending'">
                          {{ l.status }}
                        </span>
                      </td>
                      <td class="small text-muted">{{ l.reason || '—' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="empty-state text-center p-4 text-muted" *ngIf="leaveList.length === 0">
                No leave requests logged yet.
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 5: COMPLIANCE VAULT -->
      <div *ngIf="activeTab === 'documents' && !isLoading">
        <div class="row g-4">
          <div class="col-md-5">
            <div class="card p-3 shadow-sm border-0">
              <h5 class="fw-bold mb-3 text-primary">Upload Document</h5>
              <div class="mb-3">
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
              <div class="mb-3">
                <label class="form-label">Document Name *</label>
                <input type="text" class="form-control" [(ngModel)]="docForm.documentName" placeholder="e.g. SIA Door Supervisor Badge #1002" />
              </div>
              <div class="mb-3">
                <label class="form-label">Expiry Date</label>
                <input type="date" class="form-control" [(ngModel)]="docForm.expiryDateUtc" />
              </div>
              <div class="mb-3">
                <label class="form-label">Document / File URL *</label>
                <input type="text" class="form-control" [(ngModel)]="docForm.fileUrl" placeholder="https://..." />
              </div>
              <button class="btn btn-primary w-100" (click)="saveDocument()" [disabled]="!docForm.documentName || !docForm.fileUrl">
                Upload to Vault
              </button>
            </div>
          </div>
          <div class="col-md-7">
            <div class="card p-3 shadow-sm border-0">
              <h5 class="fw-bold mb-3 text-dark">Verified Documents</h5>
              <div class="table-responsive" *ngIf="docList.length > 0">
                <table class="table table-hover align-middle">
                  <thead class="table-light small">
                    <tr>
                      <th>Document</th>
                      <th>Type</th>
                      <th>Expiry</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let d of docList">
                      <td class="fw-bold">{{ d.documentName }}</td>
                      <td><span class="badge bg-light text-dark border">{{ d.documentType }}</span></td>
                      <td class="small">{{ d.expiryDateUtc ? (d.expiryDateUtc | date:'shortDate') : 'No Expiry' }}</td>
                      <td><span class="badge bg-success">Verified</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="empty-state text-center p-4 text-muted" *ngIf="docList.length === 0">
                No documents uploaded yet.
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 6: MY AVAILABILITY -->
      <div *ngIf="activeTab === 'availability' && !isLoading">
        <div class="row g-4">
          <div class="col-md-5">
            <div class="card p-3 shadow-sm border-0">
              <h5 class="fw-bold mb-3 text-primary">Log My Availability</h5>
              <div class="mb-3">
                <label class="form-label">Target Date *</label>
                <input type="date" class="form-control" [(ngModel)]="availForm.targetDate" />
              </div>
              <div class="mb-3">
                <label class="form-label">Availability State *</label>
                <select class="form-select" [(ngModel)]="availForm.state">
                  <option value="Available">Available (Full Day)</option>
                  <option value="Unavailable">Unavailable (All Day)</option>
                  <option value="PartlyUnavailable">Partly Unavailable (Time Slots)</option>
                </select>
              </div>
              <div class="row g-2 mb-3" *ngIf="availForm.state === 'PartlyUnavailable'">
                <div class="col-6">
                  <label class="form-label">From Time</label>
                  <input type="time" class="form-control" [(ngModel)]="availForm.unavailableFromTime" />
                </div>
                <div class="col-6">
                  <label class="form-label">To Time</label>
                  <input type="time" class="form-control" [(ngModel)]="availForm.unavailableToTime" />
                </div>
              </div>
              <div class="mb-3">
                <label class="form-label">Reason / Notes</label>
                <textarea class="form-control" rows="2" [(ngModel)]="availForm.reason" placeholder="e.g. University lectures, family commitment"></textarea>
              </div>
              <button class="btn btn-primary w-100" (click)="saveAvailability()" [disabled]="!availForm.targetDate">
                Save Availability
              </button>
            </div>
          </div>
          <div class="col-md-7">
            <div class="card p-3 shadow-sm border-0">
              <h5 class="fw-bold mb-3 text-dark">Upcoming Availability Logs</h5>
              <div class="table-responsive" *ngIf="availList.length > 0">
                <table class="table table-hover align-middle">
                  <thead class="table-light">
                    <tr>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Window</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let a of availList">
                      <td class="fw-bold">{{ a.targetDate | date:'dd MMM yyyy' }}</td>
                      <td>
                        <span class="badge" [class.bg-success]="a.state === 'Available'" [class.bg-danger]="a.state === 'Unavailable'" [class.bg-warning]="a.state === 'PartlyUnavailable'" [class.text-dark]="a.state === 'PartlyUnavailable'">
                          {{ a.state }}
                        </span>
                      </td>
                      <td class="small">{{ a.unavailableFromTime ? a.unavailableFromTime + ' - ' + a.unavailableToTime : 'Full Day' }}</td>
                      <td class="small text-muted">{{ a.reason || '—' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="empty-state text-center p-4 text-muted" *ngIf="availList.length === 0">
                No availability logs recorded yet.
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 7: SHIFT REMINDERS -->
      <div *ngIf="activeTab === 'reminders' && !isLoading">
        <div class="card p-4 shadow-sm border-0" style="max-width: 700px; margin: 0 auto;">
          <h5 class="fw-bold text-primary mb-2">Shift Readiness &amp; Departure Reminders</h5>
          <p class="text-muted small mb-4">
            Customize notification intervals before each shift. Choose the channels that ensure you never miss duty call.
          </p>
          <div class="row g-3 mb-4">
            <div class="col-md-4">
              <label class="form-label fw-bold">Slot 1 Reminder</label>
              <select class="form-select" [(ngModel)]="reminderPrefs.reminderSlot1Minutes">
                <option [ngValue]="1440">24 hours before</option>
                <option [ngValue]="720">12 hours before</option>
                <option [ngValue]="360">6 hours before</option>
                <option [ngValue]="0">Disabled</option>
              </select>
            </div>
            <div class="col-md-4">
              <label class="form-label fw-bold">Slot 2 Reminder</label>
              <select class="form-select" [(ngModel)]="reminderPrefs.reminderSlot2Minutes">
                <option [ngValue]="240">4 hours before</option>
                <option [ngValue]="120">2 hours before</option>
                <option [ngValue]="60">1 hour before</option>
                <option [ngValue]="0">Disabled</option>
              </select>
            </div>
            <div class="col-md-4">
              <label class="form-label fw-bold">Slot 3 Reminder</label>
              <select class="form-select" [(ngModel)]="reminderPrefs.reminderSlot3Minutes">
                <option [ngValue]="45">45 mins before</option>
                <option [ngValue]="30">30 mins before</option>
                <option [ngValue]="15">15 mins before</option>
                <option [ngValue]="0">Disabled</option>
              </select>
            </div>
          </div>

          <div class="mb-4">
            <label class="form-label fw-bold mb-2">Delivery Channels</label>
            <div class="form-check form-switch mb-2">
              <input class="form-check-input" type="checkbox" id="prefInApp" [(ngModel)]="reminderPrefs.allowInApp" />
              <label class="form-check-label" for="prefInApp">In-App Notification Alerts</label>
            </div>
            <div class="form-check form-switch mb-2">
              <input class="form-check-input" type="checkbox" id="prefEmail" [(ngModel)]="reminderPrefs.allowEmail" />
              <label class="form-check-label" for="prefEmail">Email Departure Alerts</label>
            </div>
            <div class="form-check form-switch">
              <input class="form-check-input" type="checkbox" id="prefWhatsApp" [(ngModel)]="reminderPrefs.allowWhatsApp" />
              <label class="form-check-label" for="prefWhatsApp">WhatsApp Dispatch Reminders</label>
            </div>
          </div>

          <button class="btn btn-primary" (click)="saveReminderPreferences()">
            Save Preferences
          </button>
        </div>
      </div>

      <!-- Swap Modal -->
      <div class="modal fade show d-block" *ngIf="showSwapModal" style="background: rgba(0,0,0,0.5)">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Request Shift Swap / Cover</h5>
              <button type="button" class="btn-close" (click)="showSwapModal = false"></button>
            </div>
            <div class="modal-body">
              <p class="small text-muted mb-3">
                Request a swap for your shift at <strong>{{ selectedShift?.siteName }}</strong> on {{ selectedShift?.startsAtUtc | date:'mediumDate' }}.
              </p>
              <div class="mb-3">
                <label class="form-label">Reason for Swap</label>
                <textarea class="form-control" rows="3" [(ngModel)]="swapReason" placeholder="e.g. Family emergency, university exam"></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-outline-secondary" (click)="showSwapModal = false">Cancel</button>
              <button class="btn btn-primary" (click)="submitSwap()" [disabled]="!swapReason">Submit Swap Request</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Leave Request Modal -->
      <div class="modal fade show d-block" *ngIf="showLeaveModal" style="background: rgba(0,0,0,0.5)">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Submit Leave Request</h5>
              <button type="button" class="btn-close" (click)="showLeaveModal = false"></button>
            </div>
            <div class="modal-body">
              <div class="mb-3">
                <label class="form-label">Leave Type</label>
                <select class="form-select" [(ngModel)]="leaveType">
                  <option value="Annual">Annual Leave</option>
                  <option value="Sick">Sick Leave</option>
                  <option value="Compassionate">Compassionate Leave</option>
                  <option value="Unpaid">Unpaid Leave</option>
                </select>
              </div>
              <div class="row">
                <div class="col-6 mb-3">
                  <label class="form-label">Start Date</label>
                  <input type="date" class="form-control" [(ngModel)]="leaveStartDate">
                </div>
                <div class="col-6 mb-3">
                  <label class="form-label">End Date</label>
                  <input type="date" class="form-control" [(ngModel)]="leaveEndDate">
                </div>
              </div>
              <div class="mb-3">
                <label class="form-label">Reason</label>
                <textarea class="form-control" rows="3" [(ngModel)]="leaveReason" placeholder="Optional notes for supervisor"></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-outline-secondary" (click)="showLeaveModal = false">Cancel</button>
              <button class="btn btn-primary" (click)="submitLeave()" [disabled]="!leaveStartDate || !leaveEndDate">Submit Request</button>
            </div>
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

    /* Cards */
    .card {
      background: #ffffff;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 2px 8px rgba(0,0,0,0.02);
    }
    .shift-card {
      transition: transform 0.15s ease-in-out;
      display: flex;
      flex-direction: column;
    }
    .shift-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.06);
    }
    .card-body {
      display: flex;
      flex-direction: column;
      flex: 1;
      padding: 18px;
    }
    .border-start-overnight {
      border-left: 4px solid #9333ea !important;
    }
    .site-briefing-alert {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 16px;
    }

    /* Badges */
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
    }
    .bg-primary { background: #0050e5 !important; color: #ffffff !important; }
    .bg-success { background: #16a34a !important; color: #ffffff !important; }
    .bg-warning { background: #f59e0b !important; color: #ffffff !important; }
    .bg-danger { background: #ef4444 !important; color: #ffffff !important; }
    .bg-light { background: #f1f5f9 !important; color: #475569 !important; }
    .bg-purple { background: #9333ea !important; color: #ffffff !important; }
    .text-primary { color: #0050e5; }
    .text-dark { color: #0f172a; }
    .font-monospace { font-family: monospace; }
    .fw-bold { font-weight: 700; }
    .fw-semibold { font-weight: 600; }
    .fs-6 { font-size: 16px; }
    .small { font-size: 12px; }
    .border { border: 1px solid #e2e8f0; }
    .rounded { border-radius: 8px; }
    .shadow-sm { box-shadow: 0 1px 3px rgba(0,0,0,0.04); }

    /* Forms */
    .form-label {
      display: block;
      font-size: 12px;
      font-weight: 600;
      color: #475569;
      margin-bottom: 6px;
    }
    .form-control,
    .form-select {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 13px;
      color: #0f172a;
      background: #ffffff;
      transition: all 0.15s;
    }
    .form-control:focus,
    .form-select:focus {
      outline: none;
      border-color: #0050e5;
      box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.1);
    }

    /* Tables */
    .table {
      width: 100%;
      border-collapse: collapse;
    }
    .table th,
    .table td {
      padding: 10px 14px;
      border-bottom: 1px solid #f1f5f9;
    }
    .table-light {
      background: #f8fafc;
      color: #475569;
      font-weight: 600;
      font-size: 12px;
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
