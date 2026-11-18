import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Chart, registerables } from 'chart.js';
import { WorkforceService, Shift } from '../../../core/services/workforce.service';
import { ToastService } from '../../../core/services/toast.service';

Chart.register(...registerables);

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

      <!-- 2. Sub-Nav Pill Tabs (Touch Responsive with Visual Scroll Cues) -->
      <div class="subnav-scroll-wrapper">
        <button
          type="button"
          class="subnav-arrow-btn left"
          *ngIf="canScrollLeft"
          (click)="scrollTabs(-1)"
          aria-label="Scroll tabs left">
          <span class="material-symbols-outlined">chevron_left</span>
        </button>

        <div
          class="bcp-subnav-tabs"
          #subnavTabs
          (scroll)="checkScrollArrows()">
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

        <button
          type="button"
          class="subnav-arrow-btn right"
          *ngIf="canScrollRight"
          (click)="scrollTabs(1)"
          aria-label="Scroll tabs right">
          <span class="material-symbols-outlined">chevron_right</span>
        </button>

        <!-- Visual Scroll Cue on Mobile/Desktop -->
        <div class="scroll-edge-glow right" *ngIf="canScrollRight" (click)="scrollTabs(1)">
          <span class="material-symbols-outlined scroll-cue-chevron">chevron_right</span>
        </div>
        <div class="scroll-edge-glow left" *ngIf="canScrollLeft" (click)="scrollTabs(-1)">
          <span class="material-symbols-outlined scroll-cue-chevron">chevron_left</span>
        </div>
      </div>

      <div class="loading-state-card" *ngIf="isLoading && shifts.length === 0">
        <div class="spinner-ring"></div>
        <p>Loading your assigned shifts and rota schedule...</p>
      </div>

      <!-- TAB 1: SHIFT ANALYTICS (DEDICATED PERFORMANCE DASHBOARD) -->
      <div *ngIf="activeTab === 'analytics' && !isLoading">
        <!-- Date Range Filter Bar -->
        <div class="analytics-filter-card mb-4">
          <div class="filter-card-header">
            <div class="filter-title-group">
              <span class="material-symbols-outlined text-primary">date_range</span>
              <div>
                <h4 class="filter-heading">Analytics Reporting Window</h4>
                <p class="filter-subtext">Filter your duty performance, worked hours, punctuality, and pay statement</p>
              </div>
            </div>
            <div class="filter-actions-right">
              <button type="button" class="btn btn-sm btn-outline" (click)="loadActiveTabData()">
                <span class="material-symbols-outlined" [class.spin]="isLoading">refresh</span>
                <span>Refresh Data</span>
              </button>
            </div>
          </div>

          <div class="filter-controls-row">
            <!-- Preset Buttons -->
            <div class="presets-row">
              <button type="button" class="preset-pill" [class.active]="analyticsPreset === 'this_month'" (click)="setAnalyticsPreset('this_month')">
                This Month (Default)
              </button>
              <button type="button" class="preset-pill" [class.active]="analyticsPreset === 'this_week'" (click)="setAnalyticsPreset('this_week')">
                This Week
              </button>
              <button type="button" class="preset-pill" [class.active]="analyticsPreset === 'last_30_days'" (click)="setAnalyticsPreset('last_30_days')">
                Last 30 Days
              </button>
              <button type="button" class="preset-pill" [class.active]="analyticsPreset === 'last_month'" (click)="setAnalyticsPreset('last_month')">
                Last Month
              </button>
              <button type="button" class="preset-pill" [class.active]="analyticsPreset === 'quarter'" (click)="setAnalyticsPreset('quarter')">
                Quarter to Date
              </button>
              <button type="button" class="preset-pill" [class.active]="analyticsPreset === 'custom'" (click)="analyticsPreset = 'custom'">
                Custom Range
              </button>
            </div>

            <!-- Custom Date Pickers -->
            <div class="custom-range-inputs">
              <div class="range-field">
                <span class="range-label">From:</span>
                <input type="date" class="form-control form-control-sm" [(ngModel)]="analyticsStartDate" (change)="onCustomDateChange()" />
              </div>
              <span class="range-sep">&rarr;</span>
              <div class="range-field">
                <span class="range-label">To:</span>
                <input type="date" class="form-control form-control-sm" [(ngModel)]="analyticsEndDate" (change)="onCustomDateChange()" />
              </div>
            </div>
          </div>

          <!-- Active Filter Badge Row -->
          <div class="active-filter-summary">
            <span class="summary-chip">
              <span class="material-symbols-outlined chip-icon">calendar_today</span>
              <span>{{ analyticsStartDate | date:'d MMM yyyy' }} &mdash; {{ analyticsEndDate | date:'d MMM yyyy' }}</span>
            </span>
            <span class="summary-chip chip-count">
              <span>{{ analyticsTotalShifts }} Shift(s) in Window</span>
            </span>
          </div>
        </div>

        <!-- 4 Top KPI Cards (Executive BCC Standard Set A) -->
        <div class="metrics-grid mb-4">
          <!-- Card 1: Shift Fulfillment -->
          <div class="metric-card">
            <div class="card-top">
              <div class="card-icon bg-blue">
                <span class="material-symbols-outlined">event_available</span>
              </div>
              <span class="card-chip chip-blue">{{ analyticsFulfillmentRate }}% Fulfilled</span>
            </div>
            <div class="card-value">{{ analyticsTotalShifts }}</div>
            <div class="card-label">Shift Fulfillment</div>
            <div class="card-progress-track">
              <div class="card-progress-bar bg-blue" [style.width.%]="analyticsFulfillmentRate"></div>
            </div>
            <div class="card-sub-info">
              <span>{{ analyticsCompletedShifts }} fulfilled &bull; {{ analyticsTotalShifts - analyticsCompletedShifts }} upcoming</span>
            </div>
          </div>

          <!-- Card 2: Logged Duty Hours -->
          <div class="metric-card">
            <div class="card-top">
              <div class="card-icon bg-teal">
                <span class="material-symbols-outlined">timer</span>
              </div>
              <span class="card-chip chip-teal">{{ analyticsHoursRatio }}% Delivered</span>
            </div>
            <div class="card-value">{{ analyticsClockedHours | number:'1.1-1' }} <span style="font-size: 15px; font-weight: 600; color: #64748b;">hrs</span></div>
            <div class="card-label">Logged Duty Hours</div>
            <div class="card-progress-track">
              <div class="card-progress-bar bg-teal" [style.width.%]="analyticsHoursRatio"></div>
            </div>
            <div class="card-sub-info">
              <span>of {{ analyticsPlannedHours | number:'1.1-1' }}h scheduled &bull; {{ calculateLeaveHoursInRange() }}h excused</span>
            </div>
          </div>

          <!-- Card 3: Punctuality & Arrival -->
          <div class="metric-card">
            <div class="card-top">
              <div class="card-icon" [ngClass]="analyticsLateCount > 0 ? 'bg-amber' : 'bg-green'">
                <span class="material-symbols-outlined">{{ analyticsLateCount > 0 ? 'running_with_errors' : 'verified_user' }}</span>
              </div>
              <span class="card-chip" [ngClass]="analyticsLateCount > 0 ? 'chip-amber' : 'chip-teal'">
                {{ analyticsLateCount === 0 ? 'Flawless Arrival' : analyticsLateCount + ' Late Incident(s)' }}
              </span>
            </div>
            <div class="card-value" [class.text-amber]="analyticsLateCount > 0">{{ analyticsPunctualityScore }}%</div>
            <div class="card-label">Punctuality &amp; Arrival</div>
            <div class="card-progress-track">
              <div class="card-progress-bar" [ngClass]="analyticsLateCount > 0 ? 'bg-amber' : 'bg-green'" [style.width.%]="analyticsPunctualityScore"></div>
            </div>
            <div class="card-sub-info">
              <span>{{ analyticsLateCount === 0 ? 'Zero late arrivals recorded' : analyticsLateCount + ' late arrival(s) in window' }} &bull; Geofence compliant</span>
            </div>
          </div>

          <!-- Card 4: Gross Duty Earnings -->
          <div class="metric-card">
            <div class="card-top">
              <div class="card-icon bg-purple">
                <span class="material-symbols-outlined">payments</span>
              </div>
              <span class="card-chip chip-purple">Duty Pay</span>
            </div>
            <div class="card-value">{{ currencySymbol }}{{ (analyticsGrossEarnings | number:'1.2-2') || '0.00' }}</div>
            <div class="card-label">Gross Duty Earnings</div>
            <div class="card-progress-track">
              <div class="card-progress-bar bg-purple" style="width: 85%;"></div>
            </div>
            <div class="card-sub-info">
              <span>Est. Net Take-Home: {{ currencySymbol }}{{ (analyticsNetEarnings | number:'1.2-2') || '0.00' }}</span>
            </div>
          </div>
        </div>

        <!-- Charts Grid (2 columns on desktop) -->
        <div class="analytics-charts-grid mb-4">
          <!-- Chart 1: Grouped Bar Chart (Given Hours vs Hours Worked) -->
          <div class="cms-card chart-panel-card">
            <div class="chart-panel-header">
              <div class="chart-header-left">
                <span class="material-symbols-outlined text-primary">bar_chart</span>
                <div>
                  <h4 class="chart-panel-title">Scheduled Hours vs. Hours Worked</h4>
                  <p class="chart-panel-sub">Weekly comparison of given work hours against actual duty clocked</p>
                </div>
              </div>
            </div>
            <div class="chart-panel-body">
              <div class="chart-canvas-container">
                <canvas #hoursBarChartCanvas></canvas>
              </div>
            </div>
          </div>

          <!-- Chart 2: Donut / Pie Chart (Given Work Hours vs Work Hours Done) -->
          <div class="cms-card chart-panel-card">
            <div class="chart-panel-header">
              <div class="chart-header-left">
                <span class="material-symbols-outlined text-primary">pie_chart</span>
                <div>
                  <h4 class="chart-panel-title">Hours Fulfillment Ratio</h4>
                  <p class="chart-panel-sub">Given work hours against work hours completed &amp; excused</p>
                </div>
              </div>
            </div>
            <div class="chart-panel-body position-relative">
              <div class="chart-canvas-container">
                <canvas #hoursDonutChartCanvas></canvas>
              </div>
              <div class="donut-center-metric" *ngIf="analyticsPlannedHours > 0">
                <span class="center-percentage">{{ analyticsHoursRatio }}%</span>
                <span class="center-label">Fulfilled</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Venue / Client Deployment Breakdown Card -->
        <div class="cms-card mb-4" *ngIf="venueDistribution.length > 0">
          <div class="table-toolbar">
            <div class="toolbar-left">
              <span class="material-symbols-outlined text-primary">location_city</span>
              <div>
                <h3>Client Venue Deployment &amp; Spend Distribution</h3>
                <p class="modal-subtitle">Hours delivered and gross revenue generated per operating customer site</p>
              </div>
            </div>
            <div class="toolbar-right">
              <span class="count-badge">{{ venueDistribution.length }} Active Venue(s)</span>
            </div>
          </div>
          <div class="venue-breakdown-body">
            <div class="venue-breakdown-item" *ngFor="let v of venueDistribution">
              <div class="venue-item-top">
                <div class="venue-item-name">
                  <span class="material-symbols-outlined">place</span>
                  <strong>{{ v.name }}</strong>
                </div>
                <div class="venue-item-stats">
                  <span class="venue-hours">{{ v.hours }} hrs ({{ v.percentage }}%)</span>
                  <span class="venue-gross">{{ currencySymbol }}{{ (v.gross | number:'1.2-2') }}</span>
                </div>
              </div>
              <div class="venue-progress-track">
                <div class="venue-progress-bar" [style.width.%]="v.percentage"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Filtered Shift Activity Table -->
        <div class="cms-card">
          <div class="table-toolbar">
            <div class="toolbar-left">
              <span class="material-symbols-outlined text-primary">receipt_long</span>
              <div>
                <h3>Duty Activity Log in Window</h3>
                <p class="modal-subtitle">All scheduled, completed, and logged shifts for the selected date range</p>
              </div>
            </div>
            <div class="toolbar-right">
              <span class="count-badge">{{ filteredAnalyticsShifts.length }} Shift Record(s)</span>
            </div>
          </div>

          <div class="empty-state-card" *ngIf="filteredAnalyticsShifts.length === 0">
            <div class="empty-icon-circle">
              <span class="material-symbols-outlined">event_busy</span>
            </div>
            <h3>No Shifts Found in This Date Window</h3>
            <p>You have no rostered or completed shifts between {{ analyticsStartDate | date:'d MMM yyyy' }} and {{ analyticsEndDate | date:'d MMM yyyy' }}.</p>
            <button type="button" class="btn btn-primary" (click)="setAnalyticsPreset('this_month')">
              <span class="material-symbols-outlined">restore</span>
              <span>Reset to This Month</span>
            </button>
          </div>

          <div class="table-responsive" *ngIf="filteredAnalyticsShifts.length > 0">
            <table class="cms-table">
              <thead>
                <tr>
                  <th>Shift / Post</th>
                  <th>Venue</th>
                  <th>Date</th>
                  <th>Scheduled Window</th>
                  <th>Duration</th>
                  <th>Punctuality</th>
                  <th>Status</th>
                  <th class="text-end">Shift Pay</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let s of filteredAnalyticsShifts">
                  <td>
                    <span class="shift-code-tag">{{ s.shiftCode }}</span>
                    <div class="venue-cell-sub">{{ s.postName }}</div>
                  </td>
                  <td>
                    <div class="venue-cell-title">{{ s.facilityName || s.siteName }}</div>
                    <div class="venue-cell-sub">{{ s.address || s.siteAddress }}</div>
                  </td>
                  <td>{{ s.startsAtUtc | date:'dd MMM yyyy' }}</td>
                  <td>{{ s.startsAtUtc | date:'HH:mm' }} &mdash; {{ s.endsAtUtc | date:'HH:mm' }}</td>
                  <td>{{ s.plannedDurationHours }} hrs</td>
                  <td>
                    <span class="status-pill status-active" *ngIf="!isShiftLate(s)">
                      On-Time
                    </span>
                    <span class="status-pill status-danger" *ngIf="isShiftLate(s)">
                      Late Arrival
                    </span>
                  </td>
                  <td>
                    <span class="status-pill" [ngClass]="getStatusBadge(s)">{{ s.status }}</span>
                  </td>
                  <td class="text-end fw-bold text-success">
                    {{ currencySymbol }}{{ ((s.plannedDurationHours || 0) * (s.hourlyPayRate || 10) | number:'1.2-2') }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- TAB 2: MY SCHEDULE & ROTA (CALENDAR & ASSIGNED DUTIES) -->
      <div *ngIf="activeTab === 'shifts' && !isLoading">
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
                [class.has-leave]="day.leaves && day.leaves.length > 0"
                [class.is-selected]="selectedDay && selectedDay.date.toDateString() === day.date.toDateString()"
                (click)="onSelectDay(day)"
                title="Click to view full day activity, shifts, and excuses"
              >
                <div class="day-cell-top">
                  <span class="day-number">{{ day.dayNumber }}</span>
                  <div class="day-indicators">
                    <span class="indicator-dot dot-shift" *ngIf="day.shifts.length > 0" title="{{ day.shifts.length }} shift(s)"></span>
                    <span class="indicator-dot dot-leave" *ngIf="day.leaves && day.leaves.length > 0" title="{{ day.leaves.length }} leave/excuse(s)"></span>
                  </div>
                </div>

                <!-- Shift badges in cell -->
                <div class="day-shifts" *ngIf="day.shifts.length > 0">
                  <div *ngFor="let s of day.shifts" class="shift-pill-badge" [title]="s.postName + ' at ' + (s.facilityName || s.siteName)">
                    <span class="badge-time">{{ s.startsAtUtc | date:'HH:mm' }}</span>
                    <span class="badge-site">{{ s.facilityName || s.siteName }}</span>
                  </div>
                </div>

                <!-- Leave / Excuse badges in cell -->
                <div class="day-leaves" *ngIf="day.leaves && day.leaves.length > 0">
                  <div *ngFor="let l of day.leaves" class="leave-pill-badge" [class.leave-approved]="l.status === 'Approved'" [class.leave-pending]="l.status === 'Pending'" [title]="l.leaveType + ' (' + l.status + ')'">
                    <span class="material-symbols-outlined badge-leave-icon">flight_takeoff</span>
                    <span class="badge-leave-text">{{ l.leaveType }}</span>
                  </div>
                </div>

                <div class="cell-hover-hint" *ngIf="day.shifts.length === 0 && (!day.leaves || day.leaves.length === 0)">
                  <span>+ Excuse / Info</span>
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
        <div class="cms-card">
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

            <div class="mb-4">
              <label class="form-label mb-2">Delivery Channels</label>
              <div class="toggles-grid">
                <div class="toggle-card">
                  <div class="toggle-info">
                    <span class="material-symbols-outlined text-primary">notifications</span>
                    <div>
                      <div class="toggle-title">In-App Notification Alerts</div>
                      <div class="toggle-desc">Instant web &amp; mobile notifications when shifts are assigned</div>
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
                      <div class="toggle-desc">Receive departure reminder emails with venue address</div>
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
                      <div class="toggle-desc">Automated WhatsApp ping with 1-tap clock-in link</div>
                    </div>
                  </div>
                  <label class="toggle-switch">
                    <input type="checkbox" [(ngModel)]="reminderPrefs.allowWhatsApp" />
                    <span class="toggle-slider"></span>
                  </label>
                </div>
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

      <!-- DAY ACTIVITY & DETAILS MODAL -->
      <div class="modal-backdrop-custom" *ngIf="showDayDetailModal" (click)="showDayDetailModal = false">
        <div class="modal-card-custom day-details-modal" (click)="$event.stopPropagation()">
          <div class="modal-header-custom">
            <div class="modal-title-group">
              <span class="material-symbols-outlined text-primary day-modal-icon">calendar_month</span>
              <div>
                <div class="d-flex align-items-center gap-2">
                  <h3>{{ selectedDay?.date | date:'EEEE, d MMMM yyyy' }}</h3>
                  <span class="badge-day-today" *ngIf="selectedDay?.isToday">Today</span>
                </div>
                <p class="modal-subtitle">
                  {{ selectedDay?.shifts?.length || 0 }} Rostered Shift(s) &bull; {{ selectedDay?.leaves?.length || 0 }} Leave / Excuse Record(s)
                </p>
              </div>
            </div>
            <button type="button" class="btn-close-custom" (click)="showDayDetailModal = false">&times;</button>
          </div>

          <div class="modal-body-custom modal-body-scrollable">
            <!-- Quick Action Bar -->
            <div class="day-quick-actions mb-3">
              <button type="button" class="btn btn-sm btn-outline-primary" (click)="openExcuseForSelectedDay('single')">
                <span class="material-symbols-outlined">event_busy</span>
                <span>Apply Excuse for This Day</span>
              </button>
              <button type="button" class="btn btn-sm btn-outline" (click)="openExcuseForSelectedDay('3days')">
                <span class="material-symbols-outlined">date_range</span>
                <span>Request Multi-Day Leave</span>
              </button>
              <button type="button" class="btn btn-sm btn-outline" (click)="showDayDetailModal = false; switchTab('open-shifts')">
                <span class="material-symbols-outlined">work_outline</span>
                <span>Find Open Shifts</span>
              </button>
            </div>

            <!-- In-Modal Quick Excuse Form (Toggled when requested) -->
            <div class="quick-excuse-form-card mb-4" *ngIf="showDayExcuseForm">
              <div class="form-header-row">
                <div class="d-flex align-items-center gap-2">
                  <span class="material-symbols-outlined text-warning">edit_calendar</span>
                  <h4 class="form-title">Apply for Absence / Excuse</h4>
                </div>
                <button type="button" class="btn-close-sm" (click)="showDayExcuseForm = false">&times;</button>
              </div>

              <!-- Duration Quick Presets -->
              <div class="duration-presets-group mb-3">
                <span class="presets-label">Quick Duration:</span>
                <div class="presets-buttons">
                  <button type="button" class="preset-btn" [class.active]="dayExcuseDurationPreset === 'single'" (click)="onExcusePresetChange('single')">1 Day (This Day)</button>
                  <button type="button" class="preset-btn" [class.active]="dayExcuseDurationPreset === '2days'" (click)="onExcusePresetChange('2days')">2 Days</button>
                  <button type="button" class="preset-btn" [class.active]="dayExcuseDurationPreset === '3days'" (click)="onExcusePresetChange('3days')">3 Days</button>
                  <button type="button" class="preset-btn" [class.active]="dayExcuseDurationPreset === 'week'" (click)="onExcusePresetChange('week')">1 Week</button>
                  <button type="button" class="preset-btn" [class.active]="dayExcuseDurationPreset === 'custom'" (click)="onExcusePresetChange('custom')">Custom</button>
                </div>
              </div>

              <div class="form-row-2 mb-3">
                <div class="form-group">
                  <label class="form-label">Excuse / Leave Type *</label>
                  <select class="form-select" [(ngModel)]="leaveType">
                    <option value="Sick">Sickness / Medical</option>
                    <option value="Compassionate">Emergency / Compassionate</option>
                    <option value="Annual">Annual Leave</option>
                    <option value="Unpaid">Unpaid Leave</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Start Date *</label>
                  <input type="date" class="form-control" [(ngModel)]="leaveStartDate" (change)="onExcusePresetChange('custom')" />
                </div>
              </div>

              <div class="form-row-2 mb-3">
                <div class="form-group">
                  <label class="form-label">End Date *</label>
                  <input type="date" class="form-control" [(ngModel)]="leaveEndDate" (change)="onExcusePresetChange('custom')" />
                </div>
                <div class="form-group">
                  <label class="form-label">Reason / Sickness Details *</label>
                  <input type="text" class="form-control" [(ngModel)]="leaveReason" placeholder="e.g. Flu, medical appointment, family emergency" />
                </div>
              </div>

              <div class="d-flex justify-content-end gap-2">
                <button type="button" class="btn btn-sm btn-outline" (click)="showDayExcuseForm = false">Cancel</button>
                <button type="button" class="btn btn-sm btn-primary" (click)="submitDayExcuse()" [disabled]="isActionLoading || !leaveStartDate || !leaveEndDate">
                  <span class="material-symbols-outlined" *ngIf="!isActionLoading">send</span>
                  <span class="material-symbols-outlined spin" *ngIf="isActionLoading">refresh</span>
                  <span>Submit Excuse Request</span>
                </button>
              </div>
            </div>

            <!-- SECTION A: Assigned Shifts -->
            <div class="day-section mb-4">
              <div class="day-section-header">
                <span class="material-symbols-outlined text-primary">work</span>
                <h4>Assigned Rota Duties ({{ selectedDay?.shifts?.length || 0 }})</h4>
              </div>

              <div class="day-empty-box" *ngIf="!selectedDay?.shifts || selectedDay.shifts.length === 0">
                <span class="material-symbols-outlined text-muted">event_busy</span>
                <div>
                  <p class="empty-title">Off Duty / No Shifts Rostered</p>
                  <p class="empty-desc">You are not assigned to any duty posts on this day.</p>
                </div>
              </div>

              <div class="day-shifts-list" *ngIf="selectedDay?.shifts && selectedDay.shifts.length > 0">
                <div class="day-shift-card" *ngFor="let s of selectedDay.shifts">
                  <div class="day-shift-top">
                    <div>
                      <div class="shift-code-tag">{{ s.shiftCode }}</div>
                      <h5 class="day-shift-venue">{{ s.facilityName || s.siteName }}</h5>
                      <p class="day-shift-post">{{ s.postName }} &bull; {{ s.address || s.siteAddress }}</p>
                    </div>
                    <span class="status-pill" [ngClass]="getStatusBadge(s)">{{ s.status }}</span>
                  </div>

                  <div class="day-shift-meta-grid">
                    <div class="meta-item">
                      <span class="meta-icon material-symbols-outlined">schedule</span>
                      <span>{{ s.startsAtUtc | date:'HH:mm' }} - {{ s.endsAtUtc | date:'HH:mm' }} ({{ s.plannedDurationHours }}h)</span>
                    </div>
                    <div class="meta-item">
                      <span class="meta-icon material-symbols-outlined">payments</span>
                      <span>{{ s.hourlyPayRate ? currencySymbol + s.hourlyPayRate + '/hr' : (currencySymbol + '10.00/hr') }}</span>
                    </div>
                  </div>

                  <div class="day-shift-actions">
                    <button type="button" class="btn btn-sm btn-confirm" *ngIf="!s.isConfirmedByGuard" (click)="confirmShift(s)" [disabled]="isActionLoading || isShiftExpired(s)">
                      <span class="material-symbols-outlined">check_circle</span>
                      <span>Confirm Shift</span>
                    </button>
                    <button type="button" class="btn btn-sm btn-outline" (click)="openSwapModal(s)">
                      <span class="material-symbols-outlined">swap_horiz</span>
                      <span>Request Swap</span>
                    </button>
                    <a routerLink="/attendance/workspace/clock" class="btn btn-sm btn-primary" *ngIf="selectedDay?.isToday" (click)="showDayDetailModal = false">
                      <span class="material-symbols-outlined">fingerprint</span>
                      <span>Duty Clock-In</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <!-- SECTION B: Excuses & Leave -->
            <div class="day-section">
              <div class="day-section-header">
                <span class="material-symbols-outlined text-warning">flight_takeoff</span>
                <h4>Logged Excuses &amp; Time Off ({{ selectedDay?.leaves?.length || 0 }})</h4>
              </div>

              <div class="day-empty-box" *ngIf="!selectedDay?.leaves || selectedDay.leaves.length === 0">
                <span class="material-symbols-outlined text-muted">event_available</span>
                <div>
                  <p class="empty-title">No Excuses or Time-Off Logged</p>
                  <p class="empty-desc">Your attendance record has no reported sickness or absence for this date.</p>
                </div>
                <button type="button" class="btn btn-xs btn-outline-primary ms-auto" (click)="openExcuseForSelectedDay('single')" *ngIf="!showDayExcuseForm">
                  + Log Excuse
                </button>
              </div>

              <div class="day-leaves-list" *ngIf="selectedDay?.leaves && selectedDay.leaves.length > 0">
                <div class="day-leave-card" *ngFor="let l of selectedDay.leaves">
                  <div class="d-flex justify-content-between align-items-center mb-1">
                    <span class="badge-station">{{ l.leaveType }}</span>
                    <span class="status-pill" [ngClass]="l.status === 'Approved' ? 'status-active' : (l.status === 'Rejected' ? 'status-danger' : 'status-pending')">
                      {{ l.status }}
                    </span>
                  </div>
                  <div class="leave-date-span">
                    <span class="material-symbols-outlined">date_range</span>
                    <span>{{ l.startDate | date:'dd MMM' }} - {{ l.endDate | date:'dd MMM yyyy' }} ({{ l.totalDays }} day{{ l.totalDays > 1 ? 's' : '' }})</span>
                  </div>
                  <p class="leave-reason-text" *ngIf="l.reason"><strong>Reason:</strong> {{ l.reason }}</p>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-footer-custom">
            <button type="button" class="btn btn-outline" (click)="showDayDetailModal = false">Close</button>
            <button type="button" class="btn btn-primary" (click)="openExcuseForSelectedDay('single')" *ngIf="!showDayExcuseForm">
              <span class="material-symbols-outlined">add</span>
              <span>Apply for Excuse / Time Off</span>
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
    :host {
      display: block;
      width: 100%;
      max-width: 100%;
      overflow-x: hidden;
      box-sizing: border-box;
    }
    .bcp-page-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding: 0 4px 32px 4px;
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
      overflow-x: hidden;
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
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
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

    /* Sub-Nav Pill Tabs (Horizontal Scrolling with Edge Glow and Arrows) */
    .subnav-scroll-wrapper {
      position: relative;
      width: 100%;
      display: flex;
      align-items: center;
    }
    .bcp-subnav-tabs {
      display: flex;
      gap: 10px;
      overflow-x: auto;
      overflow-y: hidden;
      padding: 6px 4px 10px 4px;
      scroll-behavior: smooth;
      -webkit-overflow-scrolling: touch;
      scroll-snap-type: x proximity;
      width: 100%;
      scrollbar-width: thin;
      scrollbar-color: #0050e5 #f1f5f9;
    }
    /* Sweet & Noticeable Styled Scrollbar */
    .bcp-subnav-tabs::-webkit-scrollbar {
      height: 5px;
      display: block;
    }
    .bcp-subnav-tabs::-webkit-scrollbar-track {
      background: #f1f5f9;
      border-radius: 6px;
      margin: 0 4px;
    }
    .bcp-subnav-tabs::-webkit-scrollbar-thumb {
      background: linear-gradient(90deg, #0050e5, #3b82f6);
      border-radius: 6px;
    }
    .bcp-subnav-tabs::-webkit-scrollbar-thumb:hover {
      background: #003ebd;
    }

    .subnav-tab {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      border-radius: 12px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      color: #475569;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      flex-shrink: 0;
      scroll-snap-align: center;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
    }
    .subnav-tab:hover {
      background: #f8fafc;
      border-color: #0050e5;
      color: #0050e5;
      transform: translateY(-1px);
    }
    .subnav-tab.active {
      background: #0050e5;
      color: #ffffff;
      border-color: #0050e5;
      box-shadow: 0 4px 12px rgba(0,80,229,0.3);
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

    /* Scroll Arrow Buttons & Edge Glow */
    .subnav-arrow-btn {
      position: absolute;
      top: 50%;
      transform: translateY(-60%);
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: #0050e5;
      z-index: 10;
      transition: all 0.2s;
    }
    .subnav-arrow-btn:hover {
      background: #0050e5;
      color: #ffffff;
      border-color: #0050e5;
    }
    .subnav-arrow-btn.left { left: -4px; }
    .subnav-arrow-btn.right { right: -4px; }

    .scroll-edge-glow {
      position: absolute;
      top: 0;
      bottom: 10px;
      width: 48px;
      display: flex;
      align-items: center;
      pointer-events: auto;
      cursor: pointer;
      z-index: 8;
    }
    .scroll-edge-glow.right {
      right: 0;
      justify-content: flex-end;
      padding-right: 6px;
      background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.85) 40%, #ffffff 100%);
    }
    .scroll-edge-glow.left {
      left: 0;
      justify-content: flex-start;
      padding-left: 6px;
      background: linear-gradient(90deg, #ffffff 0%, rgba(255,255,255,0.85) 60%, transparent 100%);
    }
    .scroll-cue-chevron {
      font-size: 18px;
      color: #0050e5;
      background: #eff6ff;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 6px rgba(0,80,229,0.2);
      animation: bounceH 1.8s infinite;
    }
    @keyframes bounceH {
      0%, 100% { transform: translateX(0); }
      50% { transform: translateX(3px); }
    }

    /* Top Metrics Grid */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
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
      margin-bottom: 28px;
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
      min-height: 92px;
      padding: 8px;
      border-right: 1px solid #f1f5f9;
      border-bottom: 1px solid #f1f5f9;
      display: flex;
      flex-direction: column;
      gap: 4px;
      cursor: pointer;
      position: relative;
      transition: background 0.15s, box-shadow 0.15s;
    }
    .cal-day-cell:nth-child(7n) { border-right: none; }
    .cal-day-cell:hover {
      background: #f8fafc;
      box-shadow: inset 0 0 0 1.5px #0050e5;
      z-index: 2;
    }
    .cal-day-cell.is-selected {
      background: #eff6ff !important;
      box-shadow: inset 0 0 0 2px #0050e5 !important;
      z-index: 3;
    }
    .cal-day-cell.other-month { background: #fafafa; opacity: 0.45; }
    .cal-day-cell.today { background: #eff6ff; }
    .cal-day-cell.has-shift { background: #f0f7ff; }
    .day-cell-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
    }
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
    .day-indicators {
      display: flex;
      align-items: center;
      gap: 3px;
    }
    .indicator-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }
    .dot-shift { background: #0050e5; }
    .dot-leave { background: #f59e0b; }
    .day-shifts,
    .day-leaves {
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
    .leave-pill-badge {
      background: #fef3c7;
      color: #92400e;
      border: 1px solid #fde68a;
      padding: 2px 6px;
      border-radius: 5px;
      font-size: 10px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 3px;
      line-height: 1.2;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .leave-pill-badge.leave-approved {
      background: #ecfdf5;
      color: #065f46;
      border-color: #a7f3d0;
    }
    .leave-pill-badge.leave-pending {
      background: #fffbeb;
      color: #b45309;
      border-color: #fde68a;
    }
    .badge-leave-icon { font-size: 11px; }
    .badge-leave-text {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .cell-hover-hint {
      display: none;
      font-size: 9.5px;
      font-weight: 600;
      color: #0050e5;
      margin-top: auto;
      text-align: center;
      padding-top: 4px;
    }
    .cal-day-cell:hover .cell-hover-hint {
      display: block;
    }

    /* Day Activity & Details Modal */
    .day-details-modal {
      max-width: 640px !important;
      width: 100%;
    }
    .day-modal-icon {
      font-size: 28px;
    }
    .badge-day-today {
      background: #eff6ff;
      color: #0050e5;
      border: 1px solid #bfdbfe;
      border-radius: 20px;
      padding: 2px 8px;
      font-size: 11px;
      font-weight: 700;
    }
    .modal-body-scrollable {
      max-height: 72vh;
      overflow-y: auto;
      padding: 20px 24px;
    }
    .day-quick-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding-bottom: 14px;
      border-bottom: 1px solid #e2e8f0;
    }
    .btn-sm {
      padding: 6px 12px !important;
      font-size: 12px !important;
      border-radius: 8px !important;
      gap: 6px !important;
      display: inline-flex !important;
      align-items: center !important;
    }
    .btn-sm .material-symbols-outlined { font-size: 16px !important; }
    .btn-xs {
      padding: 4px 8px !important;
      font-size: 11px !important;
      border-radius: 6px !important;
      gap: 4px !important;
      display: inline-flex !important;
      align-items: center !important;
    }
    .btn-outline-primary {
      background: #eff6ff !important;
      color: #0050e5 !important;
      border: 1px solid #bfdbfe !important;
      font-weight: 600 !important;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-outline-primary:hover {
      background: #0050e5 !important;
      color: #ffffff !important;
      border-color: #0050e5 !important;
    }

    /* Quick In-Modal Excuse Form */
    .quick-excuse-form-card {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      padding: 16px;
      animation: modalSlide 0.2s ease-out;
    }
    .form-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .form-title {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }
    .btn-close-sm {
      background: none;
      border: none;
      font-size: 18px;
      line-height: 1;
      cursor: pointer;
      color: #64748b;
    }
    .btn-close-sm:hover { color: #0f172a; }
    .duration-presets-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .presets-label {
      font-size: 11.5px;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .presets-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .preset-btn {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 5px 10px;
      font-size: 11.5px;
      font-weight: 600;
      color: #475569;
      cursor: pointer;
      transition: all 0.15s;
    }
    .preset-btn:hover {
      border-color: #0050e5;
      color: #0050e5;
    }
    .preset-btn.active {
      background: #0050e5;
      border-color: #0050e5;
      color: #ffffff;
    }

    /* Sections inside Modal */
    .day-section {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .day-section-header {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .day-section-header h4 {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }
    .day-empty-box {
      display: flex;
      align-items: center;
      gap: 12px;
      background: #f8fafc;
      border: 1px dashed #cbd5e1;
      border-radius: 10px;
      padding: 14px 16px;
    }
    .day-empty-box .material-symbols-outlined { font-size: 26px; }
    .empty-title {
      font-size: 13px;
      font-weight: 700;
      color: #334155;
      margin: 0;
    }
    .empty-desc {
      font-size: 12px;
      color: #64748b;
      margin: 2px 0 0 0;
    }
    .day-shifts-list,
    .day-leaves-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .day-shift-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
    }
    .day-shift-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 10px;
    }
    .shift-code-tag {
      font-size: 10.5px;
      font-weight: 700;
      color: #0050e5;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    .day-shift-venue {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
      margin: 2px 0 0 0;
    }
    .day-shift-post {
      font-size: 12px;
      color: #64748b;
      margin: 2px 0 0 0;
    }
    .day-shift-meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 8px;
      background: #f8fafc;
      padding: 8px 12px;
      border-radius: 8px;
    }
    .meta-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #334155;
      font-weight: 600;
    }
    .meta-icon { font-size: 16px; color: #64748b; }
    .day-shift-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .day-leave-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 12px 14px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
    }
    .leave-date-span {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #475569;
      font-weight: 600;
      margin: 4px 0;
    }
    .leave-date-span .material-symbols-outlined { font-size: 15px; color: #64748b; }
    .leave-reason-text {
      font-size: 12px;
      color: #64748b;
      margin: 4px 0 0 0;
      background: #f8fafc;
      padding: 6px 10px;
      border-radius: 6px;
    }

    /* Dedicated Shift Analytics Styles */
    .analytics-filter-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 20px 24px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.02);
    }
    .filter-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .filter-title-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .filter-heading {
      font-size: 15px;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
    }
    .filter-subtext {
      font-size: 12.5px;
      color: #64748b;
      margin: 2px 0 0 0;
    }
    .filter-controls-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 14px;
      margin-top: 16px;
    }
    .presets-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .preset-pill {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      padding: 6px 14px;
      font-size: 12px;
      font-weight: 600;
      color: #475569;
      cursor: pointer;
      transition: all 0.15s ease-in-out;
    }
    .preset-pill:hover {
      border-color: #0050e5;
      color: #0050e5;
    }
    .preset-pill.active {
      background: #0050e5;
      border-color: #0050e5;
      color: #ffffff;
      box-shadow: 0 2px 8px rgba(0,80,229,0.25);
    }
    .custom-range-inputs {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .range-field {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .range-label {
      font-size: 11.5px;
      font-weight: 700;
      color: #64748b;
    }
    .form-control-sm {
      padding: 5px 10px;
      font-size: 12px;
      border-radius: 8px;
      border: 1px solid #cbd5e1;
    }
    .range-sep {
      color: #94a3b8;
      font-weight: 700;
    }
    .active-filter-summary {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 14px;
      padding-top: 12px;
      border-top: 1px solid #f1f5f9;
      flex-wrap: wrap;
    }
    .summary-chip {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 4px 10px;
      font-size: 11.5px;
      font-weight: 600;
      color: #475569;
    }
    .summary-chip .chip-icon { font-size: 14px; color: #0050e5; }
    .summary-chip.chip-count {
      background: #eff6ff;
      border-color: #bfdbfe;
      color: #0050e5;
    }

    /* Analytics Charts Grid */
    .analytics-charts-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    @media (max-width: 900px) {
      .analytics-charts-grid { grid-template-columns: 1fr; }
    }
    .chart-panel-card {
      background: #ffffff;
      border-radius: 16px;
      border: 1px solid #e2e8f0;
      padding: 20px 24px;
      display: flex;
      flex-direction: column;
      box-shadow: 0 4px 15px rgba(0,0,0,0.02);
    }
    .chart-panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .chart-header-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .chart-panel-title {
      font-size: 15px;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
    }
    .chart-panel-sub {
      font-size: 12px;
      color: #64748b;
      margin: 2px 0 0 0;
    }
    .chart-panel-body {
      position: relative;
      height: 270px;
      width: 100%;
    }
    .chart-canvas-container {
      width: 100%;
      height: 100%;
      position: relative;
    }
    .donut-center-metric {
      position: absolute;
      top: 45%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      pointer-events: none;
    }
    .center-percentage {
      display: block;
      font-size: 24px;
      font-weight: 800;
      color: #0f172a;
      line-height: 1;
    }
    .center-label {
      font-size: 10.5px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    /* Venue Deployment Breakdown */
    .venue-breakdown-body {
      padding: 18px 24px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .venue-breakdown-item {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .venue-item-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .venue-item-name {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: #0f172a;
    }
    .venue-item-name .material-symbols-outlined { font-size: 16px; color: #0050e5; }
    .venue-item-stats {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 12px;
    }
    .venue-hours { color: #64748b; font-weight: 600; }
    .venue-gross { color: #16a34a; font-weight: 700; }
    .venue-progress-track {
      height: 8px;
      background: #f1f5f9;
      border-radius: 4px;
      overflow: hidden;
    }
    .venue-progress-bar {
      height: 100%;
      background: linear-gradient(90deg, #0050e5, #38bdf8);
      border-radius: 4px;
      transition: width 0.4s ease-in-out;
    }

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

    /* Reminders Toggles (Full Width) */
    .toggles-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 16px;
    }
    .toggle-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      background: #f8fafc;
      transition: all 0.2s;
    }
    .toggle-card:hover {
      background: #ffffff;
      border-color: #0050e5;
      box-shadow: 0 4px 12px rgba(0, 80, 229, 0.05);
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

    /* Mobile Responsive Optimizations */
    @media (max-width: 768px) {
      .bcp-page-container {
        padding: 0 0 24px 0 !important;
        gap: 14px !important;
        width: 100% !important;
        max-width: 100% !important;
        overflow-x: hidden !important;
        box-sizing: border-box !important;
      }
      .page-header {
        flex-direction: column !important;
        align-items: stretch !important;
        padding: 16px !important;
        gap: 12px !important;
        width: 100% !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
      }
      .breadcrumb {
        display: flex !important;
        align-items: center !important;
        flex-wrap: nowrap !important;
        gap: 4px !important;
        font-size: 10.5px !important;
        white-space: nowrap !important;
        overflow-x: auto !important;
        scrollbar-width: none !important;
        margin-bottom: 4px !important;
        line-height: 1.2 !important;
      }
      .breadcrumb::-webkit-scrollbar { display: none !important; }
      .breadcrumb a, .breadcrumb span, .breadcrumb .current {
        font-size: 10.5px !important;
        white-space: nowrap !important;
      }
      .header-left {
        width: 100% !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
      }
      .title-row {
        gap: 8px !important;
        margin-bottom: 4px !important;
        flex-wrap: wrap !important;
      }
      .title-row h1 {
        font-size: 18px !important;
        line-height: 1.25 !important;
      }
      .badge-suite {
        font-size: 9.5px !important;
        padding: 2px 7px !important;
      }
      .subtitle {
        font-size: 12px !important;
        line-height: 1.35 !important;
      }
      .header-actions {
        width: 100% !important;
        display: grid !important;
        grid-template-columns: repeat(3, 1fr) !important;
        gap: 6px !important;
        box-sizing: border-box !important;
      }
      .header-actions .btn {
        width: 100% !important;
        justify-content: center !important;
        padding: 6px 4px !important;
        font-size: 10.5px !important;
        gap: 4px !important;
        border-radius: 8px !important;
        font-weight: 600 !important;
        box-sizing: border-box !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
      }
      .header-actions .btn .material-symbols-outlined {
        font-size: 14px !important;
      }
      .subnav-scroll-wrapper {
        width: 100% !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
      }
      .bcp-subnav-tabs {
        width: 100% !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
      }
      .subnav-arrow-btn {
        display: none !important;
      }
      .subnav-tab {
        padding: 6px 12px !important;
        font-size: 11px !important;
        border-radius: 9px !important;
        gap: 5px !important;
      }
      .subnav-tab .material-symbols-outlined {
        font-size: 15px !important;
      }
      .table-toolbar {
        padding: 14px 16px;
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;
      }
      .toolbar-right {
        width: 100%;
      }
      .toolbar-right .btn {
        width: 100%;
        justify-content: center;
      }
      .metrics-grid {
        grid-template-columns: 1fr;
      }
      .shifts-card-body {
        padding: 16px;
      }
      .shifts-grid {
        grid-template-columns: 1fr;
      }
      .card-body-form {
        padding: 16px;
      }
      .form-row-2,
      .form-row-3 {
        grid-template-columns: 1fr;
      }
      .toggles-grid {
        grid-template-columns: 1fr !important;
      }
    }

    @media (max-width: 400px) {
      .header-actions {
        gap: 4px !important;
      }
      .header-actions .btn {
        font-size: 10px !important;
        padding: 5px 2px !important;
        gap: 3px !important;
      }
      .header-actions .btn .material-symbols-outlined {
        font-size: 13px !important;
      }
      .breadcrumb {
        font-size: 10px !important;
        gap: 3px !important;
      }
      .breadcrumb a, .breadcrumb span, .breadcrumb .current {
        font-size: 10px !important;
      }
      .subnav-tab {
        padding: 5px 10px !important;
        font-size: 10.5px !important;
      }
    }

    /* Dark Mode */
    :host-context(.dark-mode) .bcp-page-container { color: #f8fafc; }
    :host-context(.dark-mode) .page-header,
    :host-context(.dark-mode) .rota-calendar-card,
    :host-context(.dark-mode) .metric-card,
    :host-context(.dark-mode) .card,
    :host-context(.dark-mode) .modal-card-custom,
    :host-context(.dark-mode) .analytics-filter-card,
    :host-context(.dark-mode) .chart-panel-card,
    :host-context(.dark-mode) .cms-card {
      background: #1e293b;
      border-color: rgba(255,255,255,0.08);
      color: #f8fafc;
    }
    :host-context(.dark-mode) .title-row h1,
    :host-context(.dark-mode) .card-value,
    :host-context(.dark-mode) .cal-month-title,
    :host-context(.dark-mode) .modal-title-group h3,
    :host-context(.dark-mode) .filter-heading,
    :host-context(.dark-mode) .chart-panel-title,
    :host-context(.dark-mode) .center-percentage,
    :host-context(.dark-mode) .venue-item-name {
      color: #f8fafc;
    }
    :host-context(.dark-mode) .preset-pill,
    :host-context(.dark-mode) .summary-chip {
      background: #0f172a;
      border-color: #334155;
      color: #cbd5e1;
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
export class WorkforceMyShiftsComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('subnavTabs') subnavTabsRef?: ElementRef<HTMLDivElement>;

  canScrollLeft = false;
  canScrollRight = true;

  shifts: Shift[] = [];
  openShifts: Shift[] = [];
  timesheetList: any[] = [];
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
  calendarDays: { date: Date; dayNumber: number; isCurrentMonth: boolean; isToday: boolean; shifts: Shift[]; leaves: any[] }[] = [];
  selectedDay: { date: Date; dayNumber: number; isCurrentMonth: boolean; isToday: boolean; shifts: Shift[]; leaves: any[] } | null = null;
  showDayDetailModal = false;
  showDayExcuseForm = false;
  dayExcuseDurationPreset = 'single';

  // --- ANALYTICS DASHBOARD STATE ---
  analyticsPreset: 'this_month' | 'this_week' | 'last_30_days' | 'last_month' | 'quarter' | 'custom' = 'this_month';
  analyticsStartDate: string = '';
  analyticsEndDate: string = '';

  @ViewChild('hoursBarChartCanvas') hoursBarChartCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('hoursDonutChartCanvas') hoursDonutChartCanvasRef!: ElementRef<HTMLCanvasElement>;

  private hoursBarChart: Chart | null = null;
  private hoursDonutChart: Chart | null = null;

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
    this.setAnalyticsPreset('this_month');

    this.workforceService.getTenantCurrency().subscribe({
      next: (res: any) => {
        if (res?.data?.currencySymbol) {
          this.currencySymbol = res.data.currencySymbol;
        }
      },
      error: () => { }
    });

    this.routeSub = this.route.data.subscribe((data) => {
      const tab = data['tab'] || this.route.snapshot.queryParams['tab'];
      if (tab) {
        this.activeTab = tab;
      }
      this.loadActiveTabData();
      setTimeout(() => {
        this.checkScrollArrows();
        this.scrollActiveTabIntoView();
        if (this.activeTab === 'analytics') {
          this.renderCharts();
        }
      }, 100);
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.checkScrollArrows();
      this.scrollActiveTabIntoView();
      if (this.activeTab === 'analytics') {
        this.renderCharts();
      }
    }, 150);
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.checkScrollArrows();
    if (this.activeTab === 'analytics') {
      this.renderCharts();
    }
  }

  checkScrollArrows(): void {
    const el = this.subnavTabsRef?.nativeElement;
    if (!el) return;
    this.canScrollLeft = el.scrollLeft > 15;
    this.canScrollRight = el.scrollLeft + el.clientWidth < el.scrollWidth - 15;
  }

  scrollTabs(direction: number): void {
    const el = this.subnavTabsRef?.nativeElement;
    if (!el) return;
    el.scrollBy({ left: direction * 220, behavior: 'smooth' });
    setTimeout(() => this.checkScrollArrows(), 250);
  }

  scrollActiveTabIntoView(): void {
    const el = this.subnavTabsRef?.nativeElement;
    if (!el) return;
    const activeBtn = el.querySelector('.subnav-tab.active') as HTMLElement;
    if (activeBtn) {
      activeBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
    if (this.hoursBarChart) {
      this.hoursBarChart.destroy();
      this.hoursBarChart = null;
    }
    if (this.hoursDonutChart) {
      this.hoursDonutChart.destroy();
      this.hoursDonutChart = null;
    }
  }

  switchTab(tab: 'analytics' | 'shifts' | 'open-shifts' | 'timesheets' | 'leave' | 'documents' | 'availability' | 'reminders'): void {
    this.activeTab = tab;
    const routeMap: Record<string, string> = {
      'analytics': '/workforce/workspace/analytics',
      'shifts': '/workforce/workspace/my-shifts',
      'open-shifts': '/workforce/workspace/open-shifts',
      'timesheets': '/workforce/workspace/timesheets',
      'leave': '/workforce/workspace/leave',
      'documents': '/workforce/workspace/documents',
      'availability': '/workforce/workspace/availability',
      'reminders': '/workforce/workspace/reminders'
    };
    if (routeMap[tab]) {
      this.router.navigate([routeMap[tab]], { replaceUrl: true });
    }
    this.loadActiveTabData();
    setTimeout(() => {
      this.checkScrollArrows();
      this.scrollActiveTabIntoView();
      if (tab === 'analytics') {
        this.renderCharts();
      }
    }, 100);
  }

  loadActiveTabData(): void {
    if (this.activeTab === 'analytics') {
      this.loadMyShifts();
      this.loadTimesheets();
      this.loadLeaveRequests();
    } else if (this.activeTab === 'shifts') {
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

    const days: { date: Date; dayNumber: number; isCurrentMonth: boolean; isToday: boolean; shifts: Shift[]; leaves: any[] }[] = [];
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
        shifts: this.getShiftsForDate(d),
        leaves: this.getLeavesForDate(d)
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
        shifts: this.getShiftsForDate(d),
        leaves: this.getLeavesForDate(d)
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
        shifts: this.getShiftsForDate(d),
        leaves: this.getLeavesForDate(d)
      });
    }

    this.calendarDays = days;
  }

  getShiftsForDate(date: Date): Shift[] {
    const dateStr = this.formatDateForInput(date);
    return this.shifts.filter(s => s.startsAtUtc && s.startsAtUtc.slice(0, 10) === dateStr);
  }

  getLeavesForDate(date: Date): any[] {
    if (!this.leaveList || this.leaveList.length === 0) return [];
    const target = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    return this.leaveList.filter(l => {
      if (!l.startDate) return false;
      const s = new Date(l.startDate);
      const sTime = new Date(s.getFullYear(), s.getMonth(), s.getDate()).getTime();
      const e = l.endDate ? new Date(l.endDate) : s;
      const eTime = new Date(e.getFullYear(), e.getMonth(), e.getDate()).getTime();
      return target >= sTime && target <= eTime;
    });
  }

  onSelectDay(day: { date: Date; dayNumber: number; isCurrentMonth: boolean; isToday: boolean; shifts: Shift[]; leaves: any[] }): void {
    this.selectedDay = {
      ...day,
      shifts: this.getShiftsForDate(day.date),
      leaves: this.getLeavesForDate(day.date)
    };
    this.showDayDetailModal = true;
    this.showDayExcuseForm = false;
  }

  openExcuseForSelectedDay(preset: string = 'single'): void {
    if (!this.selectedDay) return;
    this.dayExcuseDurationPreset = preset;
    const start = new Date(this.selectedDay.date);
    this.leaveStartDate = this.formatDateForInput(start);

    let end = new Date(this.selectedDay.date);
    if (preset === '2days') {
      end.setDate(end.getDate() + 1);
    } else if (preset === '3days') {
      end.setDate(end.getDate() + 2);
    } else if (preset === 'week') {
      end.setDate(end.getDate() + 6);
    }
    this.leaveEndDate = this.formatDateForInput(end);
    this.leaveType = 'Sick';
    this.leaveReason = '';
    this.showDayExcuseForm = true;
  }

  onExcusePresetChange(preset: string): void {
    this.dayExcuseDurationPreset = preset;
    if (!this.leaveStartDate) {
      this.leaveStartDate = this.formatDateForInput(this.selectedDay?.date || new Date());
    }
    const start = new Date(this.leaveStartDate);
    let end = new Date(start);
    if (preset === 'single') {
      // same day
    } else if (preset === '2days') {
      end.setDate(end.getDate() + 1);
    } else if (preset === '3days') {
      end.setDate(end.getDate() + 2);
    } else if (preset === 'week') {
      end.setDate(end.getDate() + 6);
    }
    if (preset !== 'custom') {
      this.leaveEndDate = this.formatDateForInput(end);
    }
  }

  submitDayExcuse(): void {
    if (!this.leaveStartDate || !this.leaveEndDate) return;
    const req = {
      leaveType: this.leaveType,
      startDate: new Date(this.leaveStartDate).toISOString(),
      endDate: new Date(this.leaveEndDate).toISOString(),
      reason: this.leaveReason
    };
    this.isActionLoading = true;
    this.workforceService.requestLeave(req).subscribe({
      next: (res: any) => {
        this.isActionLoading = false;
        if (res.isSuccess) {
          this.toast.success('Excuse / Leave request submitted successfully.');
          this.showDayExcuseForm = false;
          this.loadLeaveRequests();
          setTimeout(() => {
            if (this.selectedDay) {
              this.selectedDay.leaves = this.getLeavesForDate(this.selectedDay.date);
            }
            this.generateCalendar();
          }, 300);
        } else {
          this.toast.error(res.message || 'Leave submission failed.');
        }
      },
      error: () => {
        this.isActionLoading = false;
        this.toast.error('Failed to submit excuse/leave request.');
      }
    });
  }

  formatDateForInput(d: Date): string {
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // --- DEDICATED SHIFT ANALYTICS ENGINE ---
  setAnalyticsPreset(preset: 'this_month' | 'this_week' | 'last_30_days' | 'last_month' | 'quarter' | 'custom'): void {
    this.analyticsPreset = preset;
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();

    if (preset === 'this_month') {
      const first = new Date(y, m, 1);
      const last = new Date(y, m + 1, 0);
      this.analyticsStartDate = this.formatDateForInput(first);
      this.analyticsEndDate = this.formatDateForInput(last);
    } else if (preset === 'this_week') {
      const day = now.getDay();
      const diffToMon = now.getDate() - day + (day === 0 ? -6 : 1);
      const mon = new Date(now.getFullYear(), now.getMonth(), diffToMon);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      this.analyticsStartDate = this.formatDateForInput(mon);
      this.analyticsEndDate = this.formatDateForInput(sun);
    } else if (preset === 'last_30_days') {
      const start = new Date();
      start.setDate(now.getDate() - 30);
      this.analyticsStartDate = this.formatDateForInput(start);
      this.analyticsEndDate = this.formatDateForInput(now);
    } else if (preset === 'last_month') {
      const first = new Date(y, m - 1, 1);
      const last = new Date(y, m, 0);
      this.analyticsStartDate = this.formatDateForInput(first);
      this.analyticsEndDate = this.formatDateForInput(last);
    } else if (preset === 'quarter') {
      const currentQuarter = Math.floor(m / 3);
      const first = new Date(y, currentQuarter * 3, 1);
      const last = new Date(y, (currentQuarter + 1) * 3, 0);
      this.analyticsStartDate = this.formatDateForInput(first);
      this.analyticsEndDate = this.formatDateForInput(last);
    }
    this.recalculateAnalytics();
  }

  onCustomDateChange(): void {
    this.analyticsPreset = 'custom';
    this.recalculateAnalytics();
  }

  recalculateAnalytics(): void {
    if (this.activeTab === 'analytics') {
      setTimeout(() => this.renderCharts(), 50);
    }
  }

  get filteredAnalyticsShifts(): Shift[] {
    if (!this.analyticsStartDate || !this.analyticsEndDate) return this.shifts;
    const start = new Date(this.analyticsStartDate).getTime();
    const end = new Date(this.analyticsEndDate + 'T23:59:59').getTime();
    return this.shifts.filter(s => {
      if (!s.startsAtUtc) return false;
      const t = new Date(s.startsAtUtc).getTime();
      return t >= start && t <= end;
    });
  }

  get analyticsTotalShifts(): number {
    return this.filteredAnalyticsShifts.length;
  }

  get analyticsCompletedShifts(): number {
    return this.filteredAnalyticsShifts.filter(s => s.status === 'Completed' || (s.endsAtUtc && new Date(s.endsAtUtc) < new Date())).length;
  }

  get analyticsFulfillmentRate(): number {
    if (this.analyticsTotalShifts === 0) return 100;
    return Math.round((this.analyticsCompletedShifts / this.analyticsTotalShifts) * 100);
  }

  get analyticsPlannedHours(): number {
    return this.filteredAnalyticsShifts.reduce((acc, s) => acc + (s.plannedDurationHours || 0), 0);
  }

  get analyticsClockedHours(): number {
    return this.filteredAnalyticsShifts.reduce((acc, s) => {
      const ts = this.timesheetList.find(t => t.id === s.id || t.shiftCode === s.shiftCode);
      const hrs = ts?.actualDurationHours || s.plannedDurationHours || 0;
      return acc + (s.status === 'Completed' || (s.endsAtUtc && new Date(s.endsAtUtc) < new Date()) ? hrs : 0);
    }, 0);
  }

  get analyticsHoursRatio(): number {
    if (this.analyticsPlannedHours === 0) return 100;
    return Math.min(100, Math.round((this.analyticsClockedHours / this.analyticsPlannedHours) * 100));
  }

  get analyticsLateCount(): number {
    return this.filteredAnalyticsShifts.filter(s => this.isShiftLate(s)).length;
  }

  get analyticsPunctualityScore(): number {
    if (this.analyticsCompletedShifts === 0) return 100;
    const onTime = Math.max(0, this.analyticsCompletedShifts - this.analyticsLateCount);
    return Math.round((onTime / this.analyticsCompletedShifts) * 100);
  }

  get analyticsGrossEarnings(): number {
    return this.filteredAnalyticsShifts.reduce((acc, s) => {
      const rate = s.hourlyPayRate || 10;
      const hours = s.plannedDurationHours || 0;
      return acc + (hours * rate);
    }, 0);
  }

  get analyticsNetEarnings(): number {
    return Math.round(this.analyticsGrossEarnings * 0.82 * 100) / 100;
  }

  isShiftLate(s: Shift): boolean {
    const ts = this.timesheetList.find(t => t.id === s.id || t.shiftCode === s.shiftCode);
    if (ts?.isLate || (ts?.lateMinutes && ts.lateMinutes > 5)) return true;
    if (ts?.clockInUtc && s.startsAtUtc) {
      const diff = new Date(ts.clockInUtc).getTime() - new Date(s.startsAtUtc).getTime();
      return diff > 5 * 60 * 1000;
    }
    return false;
  }

  calculateLeaveHoursInRange(): number {
    if (!this.leaveList || this.leaveList.length === 0) return 0;
    const start = new Date(this.analyticsStartDate).getTime();
    const end = new Date(this.analyticsEndDate + 'T23:59:59').getTime();
    let totalLeaveDays = 0;
    for (const l of this.leaveList) {
      if (l.status === 'Approved' && l.startDate) {
        const sTime = new Date(l.startDate).getTime();
        const eTime = l.endDate ? new Date(l.endDate).getTime() : sTime;
        if (sTime <= end && eTime >= start) {
          totalLeaveDays += (l.totalDays || 1);
        }
      }
    }
    return totalLeaveDays * 8;
  }

  get venueDistribution(): { name: string; hours: number; gross: number; percentage: number }[] {
    const map = new Map<string, { hours: number; gross: number }>();
    const totalHours = this.analyticsPlannedHours || 1;

    for (const s of this.filteredAnalyticsShifts) {
      const v = s.facilityName || s.siteName || 'General Operating Venue';
      const prev = map.get(v) || { hours: 0, gross: 0 };
      const h = s.plannedDurationHours || 0;
      const g = h * (s.hourlyPayRate || 10);
      map.set(v, { hours: prev.hours + h, gross: prev.gross + g });
    }

    const list: { name: string; hours: number; gross: number; percentage: number }[] = [];
    map.forEach((val, key) => {
      list.push({
        name: key,
        hours: Math.round(val.hours * 10) / 10,
        gross: Math.round(val.gross * 100) / 100,
        percentage: Math.min(100, Math.round((val.hours / totalHours) * 100))
      });
    });

    return list.sort((a, b) => b.hours - a.hours);
  }

  calculateChartBuckets(): { labels: string[]; plannedHours: number[]; actualHours: number[] } {
    const shifts = this.filteredAnalyticsShifts;
    if (!this.analyticsStartDate || !this.analyticsEndDate) {
      return { labels: ['Current Window'], plannedHours: [0], actualHours: [0] };
    }

    const start = new Date(this.analyticsStartDate);
    const end = new Date(this.analyticsEndDate);
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 14) {
      const labels: string[] = [];
      const plannedHours: number[] = [];
      const actualHours: number[] = [];

      for (let i = 0; i <= diffDays; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        const dateStr = this.formatDateForInput(d);
        const dayLabel = `${d.getDate()} ${d.toLocaleString('en', { month: 'short' })}`;
        labels.push(dayLabel);

        const dayShifts = shifts.filter(s => s.startsAtUtc && s.startsAtUtc.slice(0, 10) === dateStr);
        const p = dayShifts.reduce((acc, s) => acc + (s.plannedDurationHours || 0), 0);
        const a = dayShifts.filter(s => s.status === 'Completed' || (s.endsAtUtc && new Date(s.endsAtUtc) < new Date()))
                           .reduce((acc, s) => acc + (s.plannedDurationHours || 0), 0);
        plannedHours.push(Math.round(p * 10) / 10);
        actualHours.push(Math.round(a * 10) / 10);
      }
      return { labels, plannedHours, actualHours };
    } else {
      const labels: string[] = [];
      const plannedHours: number[] = [];
      const actualHours: number[] = [];

      const totalWeeks = Math.min(6, Math.max(1, Math.ceil(diffDays / 7)));
      for (let w = 0; w < totalWeeks; w++) {
        const wStart = new Date(start);
        wStart.setDate(start.getDate() + (w * 7));
        const wEnd = new Date(wStart);
        wEnd.setDate(wStart.getDate() + 6);
        if (wEnd > end) wEnd.setTime(end.getTime());

        const label = `W${w + 1} (${wStart.getDate()}-${wEnd.getDate()} ${wStart.toLocaleString('en', { month: 'short' })})`;
        labels.push(label);

        const wStartT = wStart.getTime();
        const wEndT = new Date(this.formatDateForInput(wEnd) + 'T23:59:59').getTime();

        const wShifts = shifts.filter(s => {
          if (!s.startsAtUtc) return false;
          const t = new Date(s.startsAtUtc).getTime();
          return t >= wStartT && t <= wEndT;
        });

        const p = wShifts.reduce((acc, s) => acc + (s.plannedDurationHours || 0), 0);
        const a = wShifts.filter(s => s.status === 'Completed' || (s.endsAtUtc && new Date(s.endsAtUtc) < new Date()))
                         .reduce((acc, s) => acc + (s.plannedDurationHours || 0), 0);

        plannedHours.push(Math.round(p * 10) / 10);
        actualHours.push(Math.round(a * 10) / 10);
      }
      return { labels, plannedHours, actualHours };
    }
  }

  renderCharts(): void {
    if (this.activeTab !== 'analytics') return;
    this.renderHoursBarChart();
    this.renderHoursDonutChart();
  }

  private renderHoursBarChart(): void {
    if (!this.hoursBarChartCanvasRef?.nativeElement) return;
    if (this.hoursBarChart) {
      this.hoursBarChart.destroy();
      this.hoursBarChart = null;
    }

    const buckets = this.calculateChartBuckets();

    this.hoursBarChart = new Chart(this.hoursBarChartCanvasRef.nativeElement, {
      type: 'bar',
      data: {
        labels: buckets.labels,
        datasets: [
          {
            label: 'Given / Scheduled Hours',
            data: buckets.plannedHours,
            backgroundColor: 'rgba(147, 197, 253, 0.75)',
            borderColor: '#60a5fa',
            borderWidth: 1,
            borderRadius: 6,
            barPercentage: 0.6
          },
          {
            label: 'Actual Clocked Hours',
            data: buckets.actualHours,
            backgroundColor: 'rgba(0, 80, 229, 0.9)',
            borderColor: '#0050e5',
            borderWidth: 1,
            borderRadius: 6,
            barPercentage: 0.6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { boxWidth: 12, font: { size: 11 } }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${ctx.raw} hrs`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { font: { size: 11 } },
            grid: { color: '#f1f5f9' },
            title: { display: true, text: 'Hours (hrs)', font: { size: 11 } }
          },
          x: {
            ticks: { font: { size: 11 } },
            grid: { display: false }
          }
        }
      }
    });
  }

  private renderHoursDonutChart(): void {
    if (!this.hoursDonutChartCanvasRef?.nativeElement) return;
    if (this.hoursDonutChart) {
      this.hoursDonutChart.destroy();
      this.hoursDonutChart = null;
    }

    const clocked = this.analyticsClockedHours;
    const planned = this.analyticsPlannedHours;
    const remaining = Math.max(0, planned - clocked);
    const leaveHours = this.calculateLeaveHoursInRange();

    const data = [
      clocked || 0,
      remaining || 0,
      leaveHours || 0
    ];

    const allZero = data.every(v => v === 0);

    this.hoursDonutChart = new Chart(this.hoursDonutChartCanvasRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels: allZero ? ['No Duty Hours Recorded'] : ['Hours Clocked / Done', 'Pending / Scheduled Hours', 'Approved Leave / Excused'],
        datasets: [{
          data: allZero ? [1] : data,
          backgroundColor: allZero
            ? ['#e2e8f0']
            : ['#0050e5', '#38bdf8', '#f59e0b'],
          borderColor: '#ffffff',
          borderWidth: 2,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 12, font: { size: 11 } }
          },
          tooltip: {
            enabled: !allZero,
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${ctx.raw} hrs`
            }
          }
        }
      }
    });
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
    this.loadLeaveRequests();
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
          if (this.calendarDays.length > 0) {
            this.generateCalendar();
          }
          if (this.selectedDay) {
            this.selectedDay.leaves = this.getLeavesForDate(this.selectedDay.date);
          }
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
