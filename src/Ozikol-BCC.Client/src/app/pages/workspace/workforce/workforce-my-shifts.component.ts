import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Chart, registerables } from 'chart.js';
import { WorkforceService, Shift } from '../../../core/services/workforce.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';

Chart.register(...registerables);

interface CalendarDayMetrics {
  date: Date;
  dateStr: string;
  dayNum: number;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
  shiftsCount: number;
  activeNowCount: number;
  openCount: number;
  leaveCount: number;
  swapCount: number;
  doneCount: number;
  shifts: Shift[];
  leaves: any[];
}

interface YearMonthGrid {
  monthIndex: number;
  monthName: string;
  days: Array<{
    date: Date;
    dayNum: number;
    isCurrentMonth: boolean;
    isToday: boolean;
    isPast: boolean;
    isFuture: boolean;
    shiftsCount: number;
    leaveCount: number;
  }>;
}

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
            <a routerLink="/dashboard/workspace">Personal Workspace</a>
            <span class="sep">/</span>
            <a (click)="closeDayDetailView()" style="cursor: pointer;" *ngIf="activeTab === 'shifts' && selectedDay">Shift &amp; Rota</a>
            <span *ngIf="!(activeTab === 'shifts' && selectedDay)">Shift &amp; Rota</span>
            <span class="sep">/</span>
            <span class="current">{{ getPageTitle() }}</span>
          </div>
          <div class="title-row">
            <h1>{{ getPageTitle() }}</h1>
            <span class="badge-day-today" *ngIf="activeTab === 'shifts' && selectedDay?.isToday">Today</span>
            <span class="badge-suite">{{ (activeTab === 'shifts' && selectedDay) ? 'Day Schedule &amp; Duties' : 'Suite: Workforce &amp; Shifts' }}</span>
          </div>
          <p class="subtitle">{{ getPageSubtitle() }}</p>
        </div>
        <div class="header-actions" *ngIf="activeTab === 'shifts' && selectedDay">
          <button type="button" class="btn btn-outline" (click)="closeDayDetailView()">
            <span class="material-symbols-outlined">arrow_back</span>
            <span>Back to Schedule</span>
          </button>
          <button type="button" class="btn btn-primary" (click)="openExcuseForSelectedDay('single')" *ngIf="!showDayExcuseForm">
            <span class="material-symbols-outlined">add</span>
            <span>Apply for Excuse</span>
          </button>
          <a routerLink="/attendance/workspace/clock" class="btn btn-primary" *ngIf="selectedDay?.isToday">
            <span class="material-symbols-outlined">fingerprint</span>
            <span>Duty Clock-In</span>
          </a>
        </div>
        <div class="header-actions" *ngIf="!(activeTab === 'shifts' && selectedDay)">
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

      <!-- Next Shift Overview Banner Card -->
      <div class="next-shift-banner" *ngIf="getNextShift() as nextShift; else noNextShiftTpl">
        <div class="nsb-left">
          <div class="nsb-tag-row">
            <span class="nsb-tag">
              <span class="material-symbols-outlined">schedule</span>
              <span>Next Assigned Shift</span>
            </span>
            <span class="nsb-pill pill-active" *ngIf="isShiftActive(nextShift)">
              <span class="live-dot pulse"></span> Active on Duty
            </span>
            <span class="nsb-pill pill-today" *ngIf="!isShiftActive(nextShift) && isShiftToday(nextShift)">
              Today
            </span>
          </div>
          <h3 class="nsb-venue">{{ nextShift.facilityName || nextShift.siteName || 'Assigned Venue Post' }}</h3>
          <p class="nsb-location" *ngIf="nextShift.address || nextShift.siteAddress">
            <span class="material-symbols-outlined">place</span>
            <span>{{ nextShift.address || nextShift.siteAddress }} <strong *ngIf="nextShift.postCode">({{ nextShift.postCode }})</strong></span>
          </p>
        </div>

        <div class="nsb-center">
          <div class="nsb-time-box">
            <div class="nsb-date">{{ nextShift.startsAtUtc | date:'EEEE, d MMMM yyyy' }}</div>
            <div class="nsb-time">
              <span class="material-symbols-outlined time-icon">alarm</span>
              <strong>{{ nextShift.startsAtUtc | date:'HH:mm' }} &ndash; {{ nextShift.endsAtUtc | date:'HH:mm' }}</strong>
              <span class="nsb-overnight-badge" *ngIf="nextShift.isOvernight">Overnight</span>
            </div>
            <div class="nsb-role" *ngIf="nextShift.postName || nextShift.jobRoleTitle">
              <span class="material-symbols-outlined">badge</span>
              <span>{{ nextShift.postName || nextShift.jobRoleTitle }}</span>
            </div>
          </div>
        </div>

        <div class="nsb-actions">
          <a [routerLink]="['/workforce/workspace/shifts', nextShift.id]" class="btn btn-outline btn-sm">
            <span class="material-symbols-outlined">visibility</span>
            <span>Shift Details</span>
          </a>
          <a
            routerLink="/attendance/workspace/clock"
            [queryParams]="{ shiftId: nextShift.id }"
            class="btn btn-primary btn-sm"
            *ngIf="(isShiftToday(nextShift) || isShiftActive(nextShift)) && !isShiftCompleted(nextShift)"
          >
            <span class="material-symbols-outlined">fingerprint</span>
            <span>{{ isShiftActive(nextShift) ? 'Duty Clock-Out' : 'Duty Clock-In' }}</span>
          </a>
        </div>
      </div>

      <ng-template #noNextShiftTpl>
        <div class="next-shift-banner empty-banner">
          <div class="nsb-left d-flex align-items-center gap-3">
            <div class="nsb-empty-icon">
              <span class="material-symbols-outlined">event_available</span>
            </div>
            <div>
              <h4 class="nsb-empty-title">None shift available</h4>
              <p class="nsb-empty-desc">You have no upcoming shifts rostered at this time.</p>
            </div>
          </div>
          <div class="nsb-actions">
            <button type="button" class="btn btn-outline btn-sm" (click)="switchTab('open-shifts')">
              <span class="material-symbols-outlined">work_outline</span>
              <span>Explore Open Shifts</span>
            </button>
          </div>
        </div>
      </ng-template>

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
            <span class="material-symbols-outlined">work_outline</span>
            <span>Open Shifts &amp; Swaps</span>
            <span class="tab-badge-sup" *ngIf="(openShiftsCount || openShifts.length) > 0">{{ openShiftsCount || openShifts.length }}</span>
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
          <a routerLink="/workforce/workspace/messages" class="subnav-tab">
            <span class="material-symbols-outlined">forum</span> Messages &amp; Support
          </a>
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
      <div class="analytics-tab-container" *ngIf="activeTab === 'analytics' && !isLoading">
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
            <!-- Left: Current Working Date Display (Default Current Month) -->
            <div class="current-working-range">
              <div class="active-range-chip">
                <span class="range-chip-label">
                  <span class="material-symbols-outlined range-chip-icon">calendar_month</span>
                  <span class="range-date-text">{{ analyticsStartDate | date:'d MMM yyyy' }} &mdash; {{ analyticsEndDate | date:'d MMM yyyy' }}</span>
                </span>
                <span class="badge-default-month" *ngIf="isCurrentMonthSelected()">Current Month</span>
              </div>
              <div class="range-meta-actions">
                <span class="shifts-count-chip">
                  <span class="material-symbols-outlined chip-icon-sm">work_history</span>
                  <span>{{ analyticsTotalShifts }} Shift(s) in Window</span>
                </span>
                <button
                  type="button"
                  class="btn-reset-month"
                  *ngIf="!isCurrentMonthSelected()"
                  (click)="resetDateRangeToCurrentMonth()"
                  title="Reset reporting window to Current Month (1st &mdash; End)">
                  <span class="material-symbols-outlined">restart_alt</span>
                  <span>Reset to This Month</span>
                </button>
              </div>
            </div>

            <!-- Right: Custom Date Range Pickers -->
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

        <!-- Punctuality Pulse Strip (Visual Arrival Compliance Micro-Widget) -->
        <div class="cms-card punctuality-pulse-card mb-4">
          <div class="pulse-header">
            <div class="pulse-title-group">
              <span class="material-symbols-outlined text-primary">speed</span>
              <div>
                <h4 class="pulse-heading">Recent Punctuality Pulse &amp; Clock-In Compliance</h4>
                <p class="pulse-sub">Visual audit trail of your last {{ recentClockInBeads.length }} shift arrivals</p>
              </div>
            </div>
            <div class="pulse-legend">
              <span class="legend-item"><span class="bead-indicator bead-green"></span> On-Time (&le;0m)</span>
              <span class="legend-item"><span class="bead-indicator bead-amber"></span> Grace (1-5m)</span>
              <span class="legend-item"><span class="bead-indicator bead-red"></span> Late (&gt;5m)</span>
            </div>
          </div>
          <div class="pulse-beads-row" *ngIf="recentClockInBeads.length > 0">
            <div class="pulse-bead-item" *ngFor="let b of recentClockInBeads" [title]="b.tooltip">
              <div class="bead-circle" [ngClass]="b.statusClass">
                <span class="material-symbols-outlined bead-icon">{{ b.icon }}</span>
              </div>
              <div class="bead-date">{{ b.dateLabel }}</div>
              <div class="bead-status">{{ b.timeDiffLabel }}</div>
            </div>
          </div>
          <div class="empty-pulse" *ngIf="recentClockInBeads.length === 0">
            <span class="material-symbols-outlined">schedule</span>
            <span>No completed duty clock-ins recorded in the selected reporting window.</span>
          </div>
        </div>

        <!-- Charts Grid (2 columns on desktop) -->
        <div class="analytics-charts-grid mb-4">
          <!-- Chart 1: Grouped Bar Chart (Scheduled vs. Delivered Hours) -->
          <div class="cms-card chart-panel-card">
            <div class="chart-panel-header">
              <div class="chart-header-left">
                <span class="material-symbols-outlined text-primary">bar_chart</span>
                <div>
                  <h4 class="chart-panel-title">Scheduled vs. Delivered Hours</h4>
                  <p class="chart-panel-sub">Given work roster vs. actual verified duty clocked on site</p>
                </div>
              </div>
              <div class="chart-header-actions">
                <div class="btn-group-granularity">
                  <button type="button" class="btn-granularity" [class.active]="chartGranularity === 'weekly'" (click)="setChartGranularity('weekly')">
                    Weekly
                  </button>
                  <button type="button" class="btn-granularity" [class.active]="chartGranularity === 'daily'" (click)="setChartGranularity('daily')">
                    Daily
                  </button>
                </div>
              </div>
            </div>
            <div class="chart-panel-body">
              <div class="chart-canvas-container">
                <canvas #hoursBarChartCanvas></canvas>
              </div>
            </div>
          </div>

          <!-- Chart 2: Donut Chart (Roster Fulfillment & Duty Distribution) -->
          <div class="cms-card chart-panel-card">
            <div class="chart-panel-header">
              <div class="chart-header-left">
                <span class="material-symbols-outlined text-primary">pie_chart</span>
                <div>
                  <h4 class="chart-panel-title">Roster Fulfillment &amp; Duty Distribution</h4>
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
            <!-- Rich Metric Legend Chips -->
            <div class="donut-chips-row">
              <div class="donut-chip">
                <span class="chip-dot bg-blue"></span>
                <span class="chip-name">Delivered</span>
                <strong class="chip-val">{{ analyticsClockedHours | number:'1.1-1' }}h</strong>
                <span class="chip-pct">({{ analyticsHoursRatio }}%)</span>
              </div>
              <div class="donut-chip">
                <span class="chip-dot bg-sky"></span>
                <span class="chip-name">Upcoming</span>
                <strong class="chip-val">{{ analyticsUpcomingHours | number:'1.1-1' }}h</strong>
                <span class="chip-pct">({{ analyticsUpcomingRatio }}%)</span>
              </div>
              <div class="donut-chip">
                <span class="chip-dot bg-amber"></span>
                <span class="chip-name">Excused</span>
                <strong class="chip-val">{{ calculateLeaveHoursInRange() | number:'1.1-1' }}h</strong>
                <span class="chip-pct">({{ analyticsExcusedRatio }}%)</span>
              </div>
              <div class="donut-chip" *ngIf="analyticsShortfallHours > 0">
                <span class="chip-dot bg-danger"></span>
                <span class="chip-name">Shortfall</span>
                <strong class="chip-val">{{ analyticsShortfallHours | number:'1.1-1' }}h</strong>
                <span class="chip-pct">({{ analyticsShortfallRatio }}%)</span>
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
                <h3>Venue Deployment &amp; Duty Earnings</h3>
                <p class="modal-subtitle">Where you delivered your duty hours and gross earnings generated per operating site</p>
              </div>
            </div>
            <div class="toolbar-right">
              <span class="count-badge">{{ venueDistribution.length }} Operating Venue(s)</span>
            </div>
          </div>
          <div class="venue-breakdown-body">
            <div class="venue-breakdown-item" *ngFor="let v of venueDistribution">
              <div class="venue-item-top">
                <div class="venue-item-name">
                  <span class="material-symbols-outlined text-primary">place</span>
                  <strong>{{ v.name }}</strong>
                  <span class="badge-top-venue" *ngIf="v.isPrimary">⭐ Primary Venue ({{ v.percentage }}%)</span>
                </div>
                <div class="venue-item-stats">
                  <span class="venue-shifts">{{ v.shiftCount }} Shifts</span>
                  <span class="venue-hours">&bull; {{ v.hours }} hrs ({{ v.percentage }}%)</span>
                  <span class="venue-gross">&bull; {{ currencySymbol }}{{ (v.gross | number:'1.2-2') }} ({{ currencySymbol }}{{ (v.effectiveRate | number:'1.2-2') }}/hr)</span>
                </div>
              </div>
              <div class="venue-progress-track">
                <div class="venue-progress-bar" [style.width.%]="v.percentage"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Filtered Duty Activity & Pay Table -->
        <div class="cms-card">
          <div class="table-toolbar">
            <div class="toolbar-left">
              <span class="material-symbols-outlined text-primary">receipt_long</span>
              <div>
                <h3>Duty Timesheet &amp; Pay Statement</h3>
                <p class="modal-subtitle">Itemized shift records, verified clock-in/out audit timestamps, punctuality compliance, and gross earnings</p>
              </div>
            </div>
            <div class="toolbar-right">
              <div class="toolbar-actions-grid">
                <button type="button" class="btn btn-sm btn-outline toolbar-action-btn" (click)="printDutyStatement()" [disabled]="displayedStatementShifts.length === 0" title="Print this duty statement">
                  <span class="material-symbols-outlined">print</span>
                  <span>Print</span>
                </button>
                <button type="button" class="btn btn-sm btn-outline toolbar-action-btn" (click)="exportDutyStatementCsv()" [disabled]="displayedStatementShifts.length === 0" title="Export this statement as CSV">
                  <span class="material-symbols-outlined">download</span>
                  <span>Export CSV</span>
                </button>
              </div>
              <span class="count-badge">{{ displayedStatementShifts.length }} Shift Record(s)</span>
            </div>
          </div>

          <!-- Statement Filter Bar -->
          <div class="statement-filters-bar">
            <div class="table-filter-pills">
              <button type="button" class="filter-pill-btn" [class.active]="statementFilter === 'all'" (click)="statementFilter = 'all'">
                All ({{ filteredAnalyticsShifts.length }})
              </button>
              <button type="button" class="filter-pill-btn" [class.active]="statementFilter === 'completed'" (click)="statementFilter = 'completed'">
                Completed ({{ statementCompletedCount }})
              </button>
              <button type="button" class="filter-pill-btn" [class.active]="statementFilter === 'upcoming'" (click)="statementFilter = 'upcoming'">
                Upcoming ({{ statementUpcomingCount }})
              </button>
              <button type="button" class="filter-pill-btn" [class.active]="statementFilter === 'late'" (click)="statementFilter = 'late'">
                Late Arrivals ({{ analyticsLateCount }})
              </button>
            </div>
            <div class="table-search-box">
              <span class="material-symbols-outlined search-icon">search</span>
              <input type="text" class="table-search-input" [(ngModel)]="statementSearch" placeholder="Search venue, code, post..." />
              <button type="button" class="search-clear-btn" *ngIf="statementSearch" (click)="statementSearch = ''">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>
          </div>

          <div class="empty-state-card" *ngIf="displayedStatementShifts.length === 0">
            <div class="empty-icon-circle">
              <span class="material-symbols-outlined">event_busy</span>
            </div>
            <h3>No Shifts Found Matching Filters</h3>
            <p>No duty records match your filter criteria in the current date window ({{ analyticsStartDate | date:'d MMM yyyy' }} &mdash; {{ analyticsEndDate | date:'d MMM yyyy' }}).</p>
            <button type="button" class="btn btn-primary" (click)="statementFilter = 'all'; statementSearch = ''">
              <span class="material-symbols-outlined">restart_alt</span>
              <span>Clear Table Filters</span>
            </button>
          </div>

          <div class="table-responsive" *ngIf="displayedStatementShifts.length > 0">
            <table class="cms-table">
              <thead>
                <tr>
                  <th class="sortable-th" [class.active-sort]="stmtSortCol === 'shiftCode'" (click)="toggleStmtSort('shiftCode')">
                    <span class="th-sort-wrap">Shift &amp; Role <span class="material-symbols-outlined sort-icon">{{ getSortIcon(stmtSortCol, stmtSortDir, 'shiftCode') }}</span></span>
                  </th>
                  <th class="sortable-th" [class.active-sort]="stmtSortCol === 'siteName'" (click)="toggleStmtSort('siteName')">
                    <span class="th-sort-wrap">Client Venue <span class="material-symbols-outlined sort-icon">{{ getSortIcon(stmtSortCol, stmtSortDir, 'siteName') }}</span></span>
                  </th>
                  <th class="sortable-th" [class.active-sort]="stmtSortCol === 'startsAtUtc'" (click)="toggleStmtSort('startsAtUtc')">
                    <span class="th-sort-wrap">Scheduled Window <span class="material-symbols-outlined sort-icon">{{ getSortIcon(stmtSortCol, stmtSortDir, 'startsAtUtc') }}</span></span>
                  </th>
                  <th class="sortable-th" [class.active-sort]="stmtSortCol === 'clockIn'" (click)="toggleStmtSort('clockIn')">
                    <span class="th-sort-wrap">Actual Clock-In / Out <span class="material-symbols-outlined sort-icon">{{ getSortIcon(stmtSortCol, stmtSortDir, 'clockIn') }}</span></span>
                  </th>
                  <th class="sortable-th" [class.active-sort]="stmtSortCol === 'plannedDurationHours'" (click)="toggleStmtSort('plannedDurationHours')">
                    <span class="th-sort-wrap">Duration <span class="material-symbols-outlined sort-icon">{{ getSortIcon(stmtSortCol, stmtSortDir, 'plannedDurationHours') }}</span></span>
                  </th>
                  <th class="sortable-th" [class.active-sort]="stmtSortCol === 'punctuality'" (click)="toggleStmtSort('punctuality')">
                    <span class="th-sort-wrap">Punctuality Status <span class="material-symbols-outlined sort-icon">{{ getSortIcon(stmtSortCol, stmtSortDir, 'punctuality') }}</span></span>
                  </th>
                  <th class="sortable-th" [class.active-sort]="stmtSortCol === 'status'" (click)="toggleStmtSort('status')">
                    <span class="th-sort-wrap">Duty Status <span class="material-symbols-outlined sort-icon">{{ getSortIcon(stmtSortCol, stmtSortDir, 'status') }}</span></span>
                  </th>
                  <th class="sortable-th text-end" [class.active-sort]="stmtSortCol === 'earnings'" (click)="toggleStmtSort('earnings')">
                    <span class="th-sort-wrap">Shift Earnings <span class="material-symbols-outlined sort-icon">{{ getSortIcon(stmtSortCol, stmtSortDir, 'earnings') }}</span></span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let s of displayedStatementShifts" (click)="openDayDetailForShift(s)" class="clickable-statement-row" title="Click to view full shift details, instructions, and apply excuse">
                  <td>
                    <span class="shift-code-tag">{{ s.shiftCode }}</span>
                    <div class="venue-cell-sub"><strong>{{ s.postName || 'Security Operative' }}</strong></div>
                  </td>
                  <td>
                    <div class="venue-cell-title d-flex align-items-center gap-1">
                      <span class="material-symbols-outlined text-primary" style="font-size: 15px;">location_on</span>
                      <span>{{ s.facilityName || s.siteName }}</span>
                    </div>
                    <div class="venue-cell-sub" *ngIf="s.address || s.siteAddress">{{ s.address || s.siteAddress }}</div>
                  </td>
                  <td>
                    <div class="fw-semibold">{{ s.startsAtUtc | date:'EEE, d MMM' }}</div>
                    <div class="venue-cell-sub">{{ s.startsAtUtc | date:'HH:mm' }} &mdash; {{ s.endsAtUtc | date:'HH:mm' }} ({{ s.plannedDurationHours }}h)</div>
                  </td>
                  <td>
                    <div class="clock-times-cell" *ngIf="getShiftClockTimes(s) as ct">
                      <div class="d-flex align-items-center gap-1">
                        <span class="punctuality-dot" [ngClass]="isShiftLate(s) ? 'dot-red' : (getGraceArrivalStatus(s) ? 'dot-amber' : (ct.inTime ? 'dot-green' : 'dot-gray'))"></span>
                        <strong [class.text-amber]="isShiftLate(s)">{{ ct.inTime || 'Not Clocked' }}</strong>
                        <span *ngIf="ct.outTime">&mdash; {{ ct.outTime }}</span>
                      </div>
                      <div class="venue-cell-sub" style="font-size: 10.5px;">{{ getActualClockSubtext(s) }}</div>
                    </div>
                  </td>
                  <td>
                    <span class="badge-duration">{{ s.plannedDurationHours }} hrs</span>
                  </td>
                  <td>
                    <span class="status-pill status-active" *ngIf="!isShiftLate(s) && !getGraceArrivalStatus(s) && (s.status === 'Completed' || (s.endsAtUtc && isPastDate(s.endsAtUtc)))">
                      🟢 On-Time
                    </span>
                    <span class="status-pill status-amber" *ngIf="getGraceArrivalStatus(s)">
                      🟡 Grace (&lt;5m)
                    </span>
                    <span class="status-pill status-danger" *ngIf="isShiftLate(s)">
                      🔴 Late (+{{ getLateMinutes(s) }}m)
                    </span>
                    <span class="status-pill status-pending" *ngIf="!isShiftLate(s) && !getGraceArrivalStatus(s) && s.status !== 'Completed' && (!s.endsAtUtc || !isPastDate(s.endsAtUtc))">
                      ⚪ Upcoming
                    </span>
                  </td>
                  <td>
                    <span class="status-pill" [ngClass]="getStatusBadge(s)">{{ s.status }}</span>
                  </td>
                  <td class="text-end">
                    <div class="fw-bold text-success" style="font-size: 13.5px;">
                      {{ currencySymbol }}{{ ((s.plannedDurationHours || 0) * (s.hourlyPayRate || 10) | number:'1.2-2') }}
                    </div>
                    <div class="venue-cell-sub" style="font-size: 10.5px; color: #64748b;">({{ currencySymbol }}{{ s.hourlyPayRate || 10 | number:'1.2-2' }}/hr)</div>
                  </td>
                </tr>
              </tbody>
              <!-- Pinned Summary Footer Row -->
              <tfoot>
                <tr class="statement-summary-footer-row">
                  <td colspan="4" class="fw-bold">
                    <span class="material-symbols-outlined summary-icon">verified</span>
                    TOTALS IN WINDOW: {{ displayedStatementShifts.length }} Shifts Rostered
                  </td>
                  <td colspan="3" class="fw-bold text-primary">
                    {{ statementTotalClockedHours | number:'1.1-1' }} hrs Logged
                  </td>
                  <td class="text-end fw-bold text-success" style="font-size: 14.5px;">
                    {{ currencySymbol }}{{ statementTotalGross | number:'1.2-2' }} Gross
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      <!-- TAB 2: MY SCHEDULE & ROTA (CALENDAR & ASSIGNED DUTIES) -->
      <div class="shifts-tab-container" *ngIf="activeTab === 'shifts' && !isLoading">

        <!-- 1. Top Metrics Row (KPIs) -->
        <div class="metrics-grid mb-4">
          <!-- Metric 1: Take-Home / Gross Pay (Respects Admin Policy) -->
          <div class="metric-card">
            <div class="card-kpi-heading">{{ earningsCardTitle }}</div>
            <div class="card-top">
              <div class="card-icon bg-blue">
                <span class="material-symbols-outlined">payments</span>
              </div>
              <span class="card-chip chip-blue">{{ earningsCardChip }}</span>
            </div>
            <div class="card-value">
              {{ currencySymbol }}{{ (effectiveEarningsAmount | number:'1.2-2') || '0.00' }}
            </div>
            <div class="card-label">{{ periodLabel }} {{ earningsCardLabel }}</div>
            <div class="card-progress-track">
              <div class="card-progress-bar bg-blue" [style.width.%]="periodShifts.length > 0 ? 80 : 0"></div>
            </div>
            <div class="card-sub-info">
              <span>{{ earningsCardSubInfo }}</span>
            </div>
          </div>

          <!-- Metric 2: Next Payday Countdown (Respects Admin Policy) -->
          <div class="metric-card">
            <div class="card-kpi-heading">UPCOMING PAYDAY</div>
            <div class="card-top">
              <div class="card-icon bg-green">
                <span class="material-symbols-outlined">event_available</span>
              </div>
              <span class="card-chip chip-teal">{{ daysUntilPayday }} Day{{ daysUntilPayday === 1 ? '' : 's' }} Away</span>
            </div>
            <div class="card-value font-monospace" style="font-size: 20px; line-height: 28px;">
              {{ nextPaydayDate | date:'EEEE, d MMM' }}
            </div>
            <div class="card-label">Next Scheduled Payday ({{ paydayFrequencyLabel }})</div>
            <div class="card-progress-track">
              <div class="card-progress-bar bg-green" style="width: 70%;"></div>
            </div>
            <div class="card-sub-info">
              <span>Est. Cycle Payout: {{ currencySymbol }}{{ (effectiveEarningsAmount * 0.5 | number:'1.2-2') || '0.00' }}</span>
            </div>
          </div>

          <!-- Metric 3: Next Shift Spotlight -->
          <div class="metric-card spotlight-card" *ngIf="nextUpcomingShift">
            <div class="card-kpi-heading">NEXT SCHEDULED SHIFT</div>
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
              <span>{{ nextUpcomingShift.startsAtUtc | date:'EEE, d MMM' }} &bull; {{ nextUpcomingShift.postName }}</span>
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

          <!-- Standby Card when no upcoming shift is scheduled -->
          <div class="metric-card" *ngIf="!nextUpcomingShift">
            <div class="card-kpi-heading">NEXT SCHEDULED SHIFT</div>
            <div class="card-top">
              <div class="card-icon bg-teal">
                <span class="material-symbols-outlined">event_busy</span>
              </div>
              <span class="card-chip chip-teal">Duty Standby</span>
            </div>
            <div class="card-value" style="font-size: 20px;">No Duty Assigned</div>
            <div class="card-label">Awaiting Assignment</div>
            <div class="card-progress-track">
              <div class="card-progress-bar bg-teal" style="width: 0%;"></div>
            </div>
            <div class="card-sub-info">
              <span>Check Open Shifts &amp; Swaps to claim duties</span>
            </div>
          </div>

          <!-- Metric 4: Punctuality & Standing -->
          <div class="metric-card">
            <div class="card-kpi-heading">PUNCTUALITY REPORT</div>
            <div class="card-top">
              <div class="card-icon bg-purple">
                <span class="material-symbols-outlined">verified_user</span>
              </div>
              <span class="card-chip chip-purple">{{ completedDutiesCount > 0 ? 'Duty Standing' : 'No Duty History' }}</span>
            </div>
            <div class="card-value">{{ completedDutiesCount > 0 ? (punctualityScore + '%') : '—' }}</div>
            <div class="card-label">{{ completedDutiesCount > 0 ? 'Overall Punctuality Score' : 'Punctuality (No Shifts Yet)' }}</div>
            <div class="card-progress-track">
              <div class="card-progress-bar bg-purple" [style.width.%]="completedDutiesCount > 0 ? punctualityScore : 0"></div>
            </div>
            <div class="card-sub-info">
              <span>{{ completedDutiesCount > 0 ? (onTimeDutiesCount + ' of ' + completedDutiesCount + ' completed duties on-time') : 'No completed shifts yet. Score activates after duty.' }}</span>
            </div>
          </div>
        </div>

        <!-- 2. Google-Calendar-Style Master Navigation & View Toolbar -->
        <div class="calendar-toolbar-card">
          <div class="cal-nav-left">
            <div class="period-title-group">
              <h2 class="period-heading">{{ currentPeriodHeading }}</h2>
            </div>
            <div class="cal-nav-controls">
              <button type="button" class="btn-today" (click)="goToToday()">Today</button>
              <div class="nav-arrows">
                <button type="button" class="nav-icon-btn" (click)="navigatePeriod(-1)" title="Previous">
                  <span class="material-symbols-outlined">chevron_left</span>
                </button>
                <button type="button" class="nav-icon-btn" (click)="navigatePeriod(1)" title="Next">
                  <span class="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            </div>

            <!-- Direct Month & Year Jump Pickers (Desktop only) -->
            <div class="month-year-pickers desktop-only">
              <select class="cal-picker-select" [ngModel]="currentCalendarDate.getMonth()" (ngModelChange)="onSelectMonth($event)">
                <option *ngFor="let m of monthNames; let idx = index" [ngValue]="idx">{{ m }}</option>
              </select>
              <select class="cal-picker-select" [ngModel]="currentCalendarDate.getFullYear()" (ngModelChange)="onSelectYear($event)">
                <option *ngFor="let y of availableYears" [ngValue]="y">{{ y }}</option>
              </select>
            </div>
          </div>

          <div class="cal-nav-right">
            <!-- Venue Filter Dropdown (if multiple venues exist) -->
            <select class="cal-picker-select" [(ngModel)]="selectedVenueId" (change)="rebuildAllCalendarViews()" *ngIf="distinctVenues.length > 1">
              <option value="">All Venues ({{ distinctVenues.length }})</option>
              <option *ngFor="let v of distinctVenues" [value]="v.id">{{ v.name }}</option>
            </select>

            <!-- Calendar View Mode Switcher (Month | Week | Day | Year) -->
            <div class="cal-view-switcher">
              <button
                type="button"
                class="cal-view-btn"
                [class.active]="calendarMode === 'month'"
                (click)="setCalendarMode('month')"
              >
                <span class="material-symbols-outlined">calendar_view_month</span>
                <span>Month</span>
              </button>
              <button
                type="button"
                class="cal-view-btn"
                [class.active]="calendarMode === 'week'"
                (click)="setCalendarMode('week')"
              >
                <span class="material-symbols-outlined">calendar_view_week</span>
                <span>Week</span>
              </button>
              <button
                type="button"
                class="cal-view-btn"
                [class.active]="calendarMode === 'day'"
                (click)="setCalendarMode('day')"
              >
                <span class="material-symbols-outlined">calendar_view_day</span>
                <span>Day</span>
              </button>
              <button
                type="button"
                class="cal-view-btn"
                [class.active]="calendarMode === 'year'"
                (click)="setCalendarMode('year')"
              >
                <span class="material-symbols-outlined">apps</span>
                <span>Year</span>
              </button>
            </div>

            <!-- Fast Action Banner (Desktop only) -->
            <div class="cal-action-banner desktop-only">
              <span class="material-symbols-outlined text-primary">info</span>
              <span>Not on rota today? Clock in if on duty:</span>
              <a routerLink="/attendance/workspace/clock" class="btn-clockin-mini" title="Instant Duty Clock-In">
                <span class="material-symbols-outlined">fingerprint</span>
                <span>Duty Clock-In</span>
              </a>
            </div>
          </div>
        </div>

        <!-- 3. Color Legend Strip -->
        <div class="calendar-legend-bar">
          <div class="legend-group">
            <span class="legend-title">Day Indicators:</span>
            <span class="legend-swatch upcoming-swatch">
              <span class="swatch-dot"></span> Upcoming
            </span>
            <span class="legend-swatch today-swatch">
              <span class="swatch-dot"></span> Today
            </span>
            <span class="legend-swatch past-swatch">
              <span class="swatch-dot"></span> Past
            </span>
          </div>

          <div class="legend-group">
            <span class="legend-title">Badges:</span>
            <span class="metric-pill pill-blue">Shifts</span>
            <span class="metric-pill pill-green">Active</span>
            <span class="metric-pill pill-purple">Excused</span>
            <span class="metric-pill pill-yellow">Swap</span>
          </div>
        </div>

        <!-- ========================================================================= -->
        <!-- VIEW A: MONTHLY CALENDAR GRID (DEFAULT) -->
        <!-- ========================================================================= -->
        <div class="calendar-board-card" *ngIf="calendarMode === 'month'">
          <div class="month-grid-scroll">
            <div class="month-grid-header">
              <div class="weekday-col" *ngFor="let wd of ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']">
                {{ wd }}
              </div>
            </div>

            <div class="month-grid-body">
              <div
                *ngFor="let cell of calendarDays"
                class="month-day-cell"
                [class.other-month]="!cell.isCurrentMonth"
                [class.day-today]="cell.isToday"
                [class.day-upcoming-shifts]="cell.isFuture && cell.shiftsCount > 0"
                [class.day-past-shifts]="cell.isPast && cell.shiftsCount > 0"
                [class.day-selected]="selectedDay?.dateStr === cell.dateStr"
                (click)="onDayCellClick(cell)"
              >
                <!-- Cell Top Row: Date Number + Timeline State Tag -->
                <div class="cell-top-row">
                  <div class="day-num-wrap">
                    <span class="day-num-circle" [class.today-circle]="cell.isToday">
                      {{ cell.dayNum }}
                    </span>
                    <span class="month-abbr" *ngIf="cell.dayNum === 1 || !cell.isCurrentMonth">
                      {{ cell.date | date:'MMM' }}
                    </span>
                  </div>

                  <span class="day-era-tag today" *ngIf="cell.isToday">Today</span>
                  <span class="day-era-tag upcoming" *ngIf="cell.isFuture && cell.shiftsCount > 0">Upcoming</span>
                  <span class="day-era-tag past" *ngIf="cell.isPast && cell.shiftsCount > 0">Past</span>
                </div>

                <!-- Multi-Metric Daily Activity Pills (Desktop only) -->
                <div class="cell-metrics-wrap desktop-only" *ngIf="cell.shiftsCount > 0 || cell.leaveCount > 0 || cell.swapCount > 0">
                  <span class="metric-pill pill-blue" *ngIf="cell.shiftsCount > 0" title="Total scheduled shifts">
                    {{ cell.shiftsCount }} {{ cell.shiftsCount === 1 ? 'Shift' : 'Shifts' }}
                  </span>
                  <span class="metric-pill pill-green" *ngIf="cell.activeNowCount > 0" title="Clocked in on duty right now">
                    {{ cell.activeNowCount }} Active Now
                  </span>
                  <span class="metric-pill pill-purple" *ngIf="cell.leaveCount > 0" title="Excused absence or time-off">
                    {{ cell.leaveCount }} Leave
                  </span>
                  <span class="metric-pill pill-yellow" *ngIf="cell.swapCount > 0" title="Swap offer pending">
                    {{ cell.swapCount }} Swap
                  </span>
                </div>

                <!-- Mobile Dots & Badge Indicator (Mobile only) -->
                <div class="cell-mobile-indicators mobile-only" *ngIf="cell.shiftsCount > 0 || cell.leaveCount > 0 || cell.swapCount > 0">
                  <span class="mobile-shift-count" *ngIf="cell.shiftsCount > 0">{{ cell.shiftsCount }} {{ cell.shiftsCount === 1 ? 'shift' : 'shifts' }}</span>
                  <div class="mobile-dots-row">
                    <span class="mob-dot dot-blue" *ngIf="cell.shiftsCount > 0" title="Shifts"></span>
                    <span class="mob-dot dot-green" *ngIf="cell.activeNowCount > 0" title="Active"></span>
                    <span class="mob-dot dot-purple" *ngIf="cell.leaveCount > 0" title="Leave"></span>
                    <span class="mob-dot dot-yellow" *ngIf="cell.swapCount > 0" title="Swap"></span>
                  </div>
                </div>

                <!-- Compact Google-Calendar-Style Shift Preview Bars (Top 2) (Desktop only) -->
                <div class="cell-events-list desktop-only" *ngIf="cell.shifts.length > 0">
                  <div
                    *ngFor="let s of cell.shifts.slice(0, 2)"
                    class="cell-event-chip"
                    [class.chip-done]="isShiftDone(s)"
                  >
                    <span class="ev-time">{{ s.startsAtUtc | date:'HH:mm' }}</span>
                    <span class="ev-title">{{ s.facilityName || s.siteName }} &bull; {{ s.postName }}</span>
                  </div>
                  <div class="more-events-link" *ngIf="cell.shifts.length > 2">
                    +{{ cell.shifts.length - 2 }} more duties
                  </div>
                </div>

                <div class="cell-hover-hint desktop-only" *ngIf="cell.shiftsCount === 0 && cell.leaveCount === 0">
                  <span>+ View Day / Excuse</span>
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

        <!-- ========================================================================= -->
        <!-- VIEW B: WEEKLY TIMELINE CALENDAR (7-DAY HOURLY GRID) -->
        <!-- ========================================================================= -->
        <div class="calendar-board-card" *ngIf="calendarMode === 'week'">
          <div class="week-grid-container">
            <!-- Week Header Row -->
            <div class="week-header-row">
              <div class="time-gutter-header">Time</div>
              <div
                *ngFor="let wd of currentWeekDays"
                class="week-day-col-header"
                [class.is-today]="wd.isToday"
                [class.is-selected]="selectedDay?.dateStr === wd.dateStr"
                (click)="onDayCellClick(wd)"
              >
                <span class="wk-day-name">{{ wd.date | date:'EEE' }}</span>
                <span class="wk-day-num" [class.today-circle]="wd.isToday">{{ wd.dayNum }}</span>
                <div class="wk-mini-pills">
                  <span class="metric-pill pill-blue" *ngIf="wd.shiftsCount > 0">{{ wd.shiftsCount }} shift{{ wd.shiftsCount === 1 ? '' : 's' }}</span>
                  <span class="metric-pill pill-purple" *ngIf="wd.leaveCount > 0">{{ wd.leaveCount }} leave</span>
                </div>
              </div>
            </div>

            <!-- Week Hourly Rows -->
            <div class="week-timeline-scroll">
              <div class="week-hour-row" *ngFor="let hr of timelineHours">
                <div class="time-gutter-cell">{{ formatHourLabel(hr) }}</div>
                <div
                  *ngFor="let wd of currentWeekDays"
                  class="week-slot-cell"
                  [class.slot-today]="wd.isToday"
                  [class.slot-upcoming]="wd.isFuture && wd.shiftsCount > 0"
                  (click)="onDayCellClick(wd)"
                >
                  <div
                    *ngFor="let s of getShiftsStartingInHour(wd, hr)"
                    class="timeline-event-card"
                    [class.ev-done]="isShiftDone(s)"
                    [class.ev-upcoming]="wd.isFuture"
                  >
                    <div class="tev-time">{{ s.startsAtUtc | date:'HH:mm' }} &ndash; {{ s.endsAtUtc | date:'HH:mm' }}</div>
                    <div class="tev-venue">{{ s.facilityName || s.siteName }}</div>
                    <div class="tev-staff">{{ s.postName }} &bull; {{ s.hourlyPayRate ? (currencySymbol + s.hourlyPayRate + '/hr') : '' }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ========================================================================= -->
        <!-- VIEW C: SINGLE-DAY CALENDAR (GRID TIMELINE OR STRUCTURED LIST) -->
        <!-- ========================================================================= -->
        <div class="calendar-board-card" *ngIf="calendarMode === 'day' && selectedDay">
          <div class="day-view-Subheader">
            <div class="day-hero-badge">
              <div class="day-big-circle" [class.today]="selectedDay.isToday">
                <span class="dbc-dow">{{ selectedDay.date | date:'EEE' }}</span>
                <span class="dbc-num">{{ selectedDay.dayNum }}</span>
              </div>
              <div>
                <h3>{{ selectedDay.date | date:'EEEE, d MMMM yyyy' }}</h3>
                <div class="cell-metrics-wrap" style="margin-top: 4px;">
                  <span class="metric-pill pill-blue">{{ selectedDay.shiftsCount }} Shift{{ selectedDay.shiftsCount === 1 ? '' : 's' }}</span>
                  <span class="metric-pill pill-green" *ngIf="selectedDay.activeNowCount > 0">{{ selectedDay.activeNowCount }} Active Now</span>
                  <span class="metric-pill pill-purple" *ngIf="selectedDay.leaveCount > 0">{{ selectedDay.leaveCount }} Leave</span>
                  <span class="metric-pill pill-yellow" *ngIf="selectedDay.swapCount > 0">{{ selectedDay.swapCount }} Swap</span>
                </div>
              </div>
            </div>

            <div class="day-layout-toggle">
              <span class="toggle-lbl">Day Layout:</span>
              <button
                type="button"
                class="cal-view-btn"
                [class.active]="dayDisplayMode === 'grid'"
                (click)="dayDisplayMode = 'grid'"
              >
                <span class="material-symbols-outlined">schedule</span>
                <span>Hourly Timeline</span>
              </button>
              <button
                type="button"
                class="cal-view-btn"
                [class.active]="dayDisplayMode === 'list'"
                (click)="dayDisplayMode = 'list'"
              >
                <span class="material-symbols-outlined">view_list</span>
                <span>Duty Cards</span>
              </button>
            </div>
          </div>

          <!-- Day Hourly Timeline Grid -->
          <div class="day-hourly-timeline" *ngIf="dayDisplayMode === 'grid'">
            <div class="day-all-day-bar" *ngIf="selectedDay.leaves.length > 0">
              <span class="all-day-lbl">TIME OFF / LEAVE</span>
              <div class="all-day-chips">
                <span class="metric-pill pill-purple" *ngFor="let lv of selectedDay.leaves">
                  {{ lv.leaveType }} ({{ lv.status }}) &bull; {{ lv.reason || 'Approved leave' }}
                </span>
              </div>
            </div>

            <div class="day-hour-row" *ngFor="let hr of timelineHours">
              <div class="time-gutter-cell">{{ formatHourLabel(hr) }}</div>
              <div class="day-hour-slot">
                <div
                  *ngFor="let s of getShiftsStartingInHour(selectedDay, hr)"
                  class="day-timeline-shift-block"
                  [class.ev-done]="isShiftDone(s)"
                >
                  <div class="dts-main">
                    <strong>{{ s.startsAtUtc | date:'HH:mm' }} &ndash; {{ s.endsAtUtc | date:'HH:mm' }}</strong>
                    <span class="dts-site">{{ s.facilityName || s.siteName }} &bull; {{ s.postName }}</span>
                    <span class="dts-staff">
                      <span class="material-symbols-outlined">payments</span>
                      {{ s.hourlyPayRate ? (currencySymbol + s.hourlyPayRate + '/hr') : (currencySymbol + '10.00/hr') }}
                    </span>
                  </div>
                  <div class="dts-actions">
                    <a
                      routerLink="/attendance/workspace/clock"
                      [queryParams]="{ shiftId: s.id }"
                      class="btn btn-primary btn-sm"
                      *ngIf="selectedDay.isToday || s.isClockedIn"
                    >
                      <span class="material-symbols-outlined">fingerprint</span>
                      <span>Fast Clock-In</span>
                    </a>
                    <button type="button" class="btn btn-outline btn-sm" *ngIf="s.status !== 'SwapOffered'" (click)="openSwapModal(s)">
                      Swap
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Day Structured Duty Cards -->
          <div class="day-page-body p-4" *ngIf="dayDisplayMode === 'list'">
            <div class="day-empty-box" *ngIf="!selectedDay.shifts.length">
              <span class="material-symbols-outlined text-muted">event_busy</span>
              <div class="empty-text-group">
                <p class="empty-title">Off Duty / No Shifts Rostered</p>
                <p class="empty-desc">You are not assigned to any duty posts on this day.</p>
              </div>
              <button type="button" class="btn btn-sm btn-outline ms-auto" (click)="switchTab('open-shifts')">
                <span class="material-symbols-outlined">work_outline</span>
                <span>Find Open Shifts</span>
              </button>
            </div>

            <div class="day-shifts-list" *ngIf="selectedDay.shifts.length > 0">
              <div class="day-shift-card mb-3" *ngFor="let s of selectedDay.shifts">
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

                <div class="day-shift-actions mt-3">
                  <span class="card-chip chip-amber" *ngIf="s.status === 'ClaimPending' || s.status === 'PendingClaim'">Claim Pending Approval</span>
                  <span class="card-chip chip-purple" *ngIf="s.assignmentMode === 'Mandatory' && s.status !== 'ClaimPending'">Mandatory Duty</span>
                  <a
                    routerLink="/attendance/workspace/clock"
                    [queryParams]="{ shiftId: s.id }"
                    class="btn btn-sm btn-primary d-inline-flex align-items-center gap-1"
                    *ngIf="selectedDay.isToday || s.isClockedIn"
                  >
                    <span class="material-symbols-outlined" style="font-size: 15px;">fingerprint</span>
                    <span>Fast Duty Clock-In</span>
                  </a>
                  <button
                    type="button"
                    class="btn btn-sm btn-outline d-inline-flex align-items-center gap-1"
                    style="color: #0050e5; border-color: #bfdbfe;"
                    (click)="openDutyReportModal(s)"
                    title="Submit Shift Duty Activity Report"
                  >
                    <span class="material-symbols-outlined" style="font-size: 15px;">assignment</span>
                    <span>Duty Report</span>
                  </button>
                  <button
                    type="button"
                    class="btn btn-sm btn-danger d-inline-flex align-items-center gap-1 emergency-sos-trigger-btn"
                    (click)="openEmergencySosModal(s)"
                    title="Engage Immediate Emergency SOS Security Panic Alert"
                  >
                    <span class="material-symbols-outlined pulse-icon" style="font-size: 15px;">e911</span>
                    <span>Emergency SOS</span>
                  </button>
                  <button type="button" class="btn btn-sm btn-confirm" *ngIf="!s.isConfirmedByGuard && s.status !== 'ClaimPending' && s.status !== 'PendingClaim'" (click)="confirmShift(s)" [disabled]="isActionLoading || isShiftExpired(s)">
                    <span class="material-symbols-outlined">check_circle</span>
                    <span>{{ s.assignmentMode === 'Mandatory' ? 'Acknowledge Duty' : 'Accept Shift' }}</span>
                  </button>
                  <button type="button" class="btn btn-sm btn-outline" style="color: #dc2626; border-color: #fecaca;" *ngIf="!s.isConfirmedByGuard && s.assignmentMode !== 'Mandatory' && s.status !== 'ClaimPending' && s.status !== 'PendingClaim'" (click)="declineShiftOffer(s)" [disabled]="isActionLoading">
                    <span class="material-symbols-outlined">close</span>
                    <span>Decline</span>
                  </button>
                  <button type="button" class="btn btn-sm btn-outline" *ngIf="s.status !== 'SwapOffered'" (click)="openSwapModal(s)">
                    <span class="material-symbols-outlined">swap_horiz</span>
                    <span>Request Swap</span>
                  </button>
                  <button type="button" class="btn btn-sm btn-outline" style="color: #dc2626; border-color: #fecaca;" *ngIf="s.status === 'SwapOffered'" (click)="withdrawShiftSwap(s)">
                    <span class="material-symbols-outlined">cancel</span>
                    <span>Withdraw Swap</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ========================================================================= -->
        <!-- VIEW D: YEAR CALENDAR (12-MONTH FULL YEAR OVERVIEW) -->
        <!-- ========================================================================= -->
        <div class="calendar-board-card year-board-pad" *ngIf="calendarMode === 'year'">
          <div class="year-months-grid">
            <div class="mini-month-card" *ngFor="let ym of yearMonthsGrid">
              <div class="mini-month-header" (click)="jumpToMonthFromYear(ym.monthIndex)">
                <h4>{{ ym.monthName }} {{ currentCalendarDate.getFullYear() }}</h4>
                <span class="jump-hint">Open Month &rarr;</span>
              </div>
              <div class="mini-weekdays">
                <span *ngFor="let d of ['M', 'T', 'W', 'T', 'F', 'S', 'S']">{{ d }}</span>
              </div>
              <div class="mini-days-grid">
                <button
                  type="button"
                  *ngFor="let md of ym.days"
                  class="mini-day-btn"
                  [class.other]="!md.isCurrentMonth"
                  [class.today]="md.isToday"
                  [class.upcoming-shifts]="md.isCurrentMonth && md.isFuture && md.shiftsCount > 0"
                  [class.past-shifts]="md.isCurrentMonth && md.isPast && md.shiftsCount > 0"
                  [title]="md.shiftsCount > 0 ? (md.shiftsCount + ' shift(s) on ' + (md.date | date:'d MMM y')) : (md.date | date:'d MMM y')"
                  (click)="jumpToDateFromYear(md.date)"
                >
                  {{ md.dayNum }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- ========================================================================= -->
        <!-- INTERACTIVE "DAY OPERATIONS BREAKDOWN" PANEL (CLICK TO SEE ALL SHIFTS & CLOCK IN FAST) -->
        <!-- ========================================================================= -->
        <div class="day-inspector-card" id="dayOperationsInspector" *ngIf="selectedDay">
          <div class="inspector-header">
            <div class="inspector-title-left">
              <div class="inspector-date-icon" [class.today]="selectedDay.isToday" [class.upcoming]="selectedDay.isFuture">
                <span class="idi-month">{{ selectedDay.date | date:'MMM' }}</span>
                <span class="idi-day">{{ selectedDay.dayNum }}</span>
              </div>
              <div class="inspector-text-block">
                <div class="inspector-heading-row">
                  <h3>Day Operations &mdash; {{ selectedDay.date | date:'EEE, d MMM yyyy' }}</h3>
                  <span class="day-era-tag today" *ngIf="selectedDay.isToday">Today</span>
                  <span class="day-era-tag upcoming" *ngIf="selectedDay.isFuture">Upcoming</span>
                  <span class="day-era-tag past" *ngIf="selectedDay.isPast">Past</span>
                </div>
                <p class="inspector-sub">
                  {{ selectedDay.shifts.length }} Shift(s) &bull; {{ selectedDay.leaves.length }} Leave Record(s)
                </p>
              </div>
            </div>

            <!-- Single Close Button -->
            <button type="button" class="btn-close-circle" (click)="closeDayDetailView()" title="Close day view">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <!-- Inspector Action Strip (Single row of actions) -->
          <div class="inspector-actions-strip" *ngIf="!showDayExcuseForm">
            <button type="button" class="btn btn-outline flex-1" (click)="openExcuseForSelectedDay('single')">
              <span class="material-symbols-outlined">event_busy</span>
              <span>Apply for Excuse</span>
            </button>
            <a
              routerLink="/attendance/workspace/clock"
              class="btn btn-primary flex-1"
              *ngIf="selectedDay.isToday"
            >
              <span class="material-symbols-outlined">fingerprint</span>
              <span>Duty Clock-In</span>
            </a>
          </div>

          <!-- Inspector Quick Metrics Strip -->
          <div class="inspector-metrics-strip">
            <div class="insp-stat blue">
              <span class="material-symbols-outlined">work</span>
              <div>
                <strong>{{ selectedDay.shifts.length }}</strong>
                <span>Rostered Shift(s)</span>
              </div>
            </div>
            <div class="insp-stat green" *ngIf="selectedDay.isToday">
              <span class="material-symbols-outlined">verified_user</span>
              <div>
                <strong>{{ selectedDay.activeNowCount > 0 ? 'Clocked In' : 'Ready' }}</strong>
                <span>Today's Attendance</span>
              </div>
            </div>
            <div class="insp-stat purple">
              <span class="material-symbols-outlined">timer</span>
              <div>
                <strong>{{ calculateShiftsHours(selectedDay.shifts) }}h</strong>
                <span>Planned Hours</span>
              </div>
            </div>
            <div class="insp-stat amber" *ngIf="selectedDay.leaves.length > 0">
              <span class="material-symbols-outlined">flight_takeoff</span>
              <div>
                <strong>{{ selectedDay.leaves.length }}</strong>
                <span>Excuse / Leave Record(s)</span>
              </div>
            </div>
          </div>

          <div class="inspector-sections-body">
            <!-- In-Page Quick Excuse Form (Toggled when requested) -->
            <div class="quick-excuse-form-card mb-4" *ngIf="showDayExcuseForm">
              <div class="form-header-row">
                <div class="d-flex align-items-center gap-2 desktop-only">
                  <span class="material-symbols-outlined text-warning">edit_calendar</span>
                  <h4 class="form-title">Apply for Absence / Excuse</h4>
                </div>
                <button type="button" class="btn-close-sm" (click)="showDayExcuseForm = false">&times;</button>
              </div>

              <!-- Duration Quick Presets -->
              <div class="duration-presets-group mb-2">
                <span class="presets-label">Quick Duration:</span>
                <div class="presets-buttons">
                  <button type="button" class="preset-btn" [class.active]="dayExcuseDurationPreset === 'single'" (click)="onExcusePresetChange('single')">1 Day</button>
                  <button type="button" class="preset-btn" [class.active]="dayExcuseDurationPreset === '2days'" (click)="onExcusePresetChange('2days')">2 Days</button>
                  <button type="button" class="preset-btn" [class.active]="dayExcuseDurationPreset === '3days'" (click)="onExcusePresetChange('3days')">3 Days</button>
                  <button type="button" class="preset-btn" [class.active]="dayExcuseDurationPreset === 'week'" (click)="onExcusePresetChange('week')">1 Week</button>
                  <button type="button" class="preset-btn" [class.active]="dayExcuseDurationPreset === 'custom'" (click)="onExcusePresetChange('custom')">Custom</button>
                </div>
              </div>

              <!-- Leave Type -->
              <div class="form-group mb-2">
                <label class="form-label">Excuse / Leave Type *</label>
                <select class="form-select" [(ngModel)]="leaveType">
                  <option value="Sick">Sickness / Medical</option>
                  <option value="Compassionate">Emergency / Compassionate</option>
                  <option value="Annual">Annual Leave</option>
                  <option value="Unpaid">Unpaid Leave</option>
                </select>
              </div>

              <!-- Side-by-side Start & End Dates on Mobile -->
              <div class="dates-row-2 mb-2">
                <div class="form-group">
                  <label class="form-label">Start Date *</label>
                  <input type="date" class="form-control" [(ngModel)]="leaveStartDate" (change)="onExcusePresetChange('custom')" />
                </div>
                <div class="form-group">
                  <label class="form-label">End Date *</label>
                  <input type="date" class="form-control" [(ngModel)]="leaveEndDate" (change)="onExcusePresetChange('custom')" />
                </div>
              </div>

              <!-- Reason -->
              <div class="form-group mb-2">
                <label class="form-label">Reason / Sickness Details *</label>
                <input type="text" class="form-control" [(ngModel)]="leaveReason" placeholder="e.g. Flu, medical appointment, emergency" />
              </div>

              <div class="form-actions mt-2 d-flex justify-content-end gap-2">
                <button type="button" class="btn btn-outline btn-sm" (click)="showDayExcuseForm = false">Cancel</button>
                <button type="button" class="btn btn-primary btn-sm" (click)="submitDayExcuse()" [disabled]="isActionLoading || !leaveStartDate || !leaveEndDate">
                  <span class="material-symbols-outlined" *ngIf="!isActionLoading" style="font-size: 16px;">send</span>
                  <span class="material-symbols-outlined spin" *ngIf="isActionLoading" style="font-size: 16px;">refresh</span>
                  <span>Submit Excuse</span>
                </button>
              </div>
            </div>

            <!-- SECTION A: Assigned Rota Duties on this Date -->
            <div class="inspector-section">
              <div class="sec-head">
                <div class="sec-title">
                  <span class="sec-badge blue">Duties</span>
                  <h4>Assigned Rota Duties ({{ selectedDay.shifts.length }})</h4>
                </div>
                <div class="d-flex align-items-center gap-2 desktop-only">
                  <button type="button" class="btn btn-sm btn-outline" (click)="openExcuseForSelectedDay('single')" *ngIf="!showDayExcuseForm">
                    <span class="material-symbols-outlined">event_busy</span>
                    <span>Apply Excuse</span>
                  </button>
                  <a routerLink="/attendance/workspace/clock" class="btn btn-sm btn-primary" *ngIf="selectedDay.isToday">
                    <span class="material-symbols-outlined">fingerprint</span>
                    <span>Duty Clock-In</span>
                  </a>
                </div>
              </div>

              <div class="sec-empty" *ngIf="selectedDay.shifts.length === 0">
                <span class="material-symbols-outlined text-muted" style="font-size: 32px; display: block; margin-bottom: 6px;">event_available</span>
                <strong>Off Duty / No Shifts Rostered</strong>
                <p style="margin: 4px 0 10px 0;">You have no scheduled shifts assigned for {{ selectedDay.date | date:'EEEE, d MMMM yyyy' }}.</p>
                <button type="button" class="btn btn-sm btn-primary" (click)="switchTab('open-shifts')">
                  <span class="material-symbols-outlined">work_outline</span>
                  <span>Find &amp; Claim Open Shifts</span>
                </button>
              </div>

              <div class="day-shifts-cards-grid" *ngIf="selectedDay.shifts.length > 0">
                <div
                  class="day-shift-card"
                  *ngFor="let s of selectedDay.shifts"
                  [class.card-active]="isShiftActive(s)"
                  [class.card-upcoming]="!isShiftActive(s) && isShiftUpcoming(s)"
                  [class.card-completed]="isShiftCompleted(s)"
                >
                  <div class="dsc-top">
                    <div class="shift-code-tag">{{ s.shiftCode }}</div>
                    <span class="status-pill status-active" *ngIf="isShiftActive(s)">
                      <span class="live-dot pulse"></span> ACTIVE ON DUTY
                    </span>
                    <span class="status-pill status-upcoming" *ngIf="!isShiftActive(s) && isShiftUpcoming(s)">
                      UPCOMING
                    </span>
                    <span class="status-pill status-completed" *ngIf="isShiftCompleted(s)">
                      COMPLETED
                    </span>
                  </div>

                  <h5 class="dsc-venue">{{ s.facilityName || s.siteName }}</h5>
                  <div class="dsc-post">{{ s.postName }} &bull; {{ s.address || s.siteAddress }}</div>

                  <div class="dsc-time">
                    <span class="material-symbols-outlined">event</span>
                    <span>{{ s.startsAtUtc | date:'EEE, d MMM yyyy' }} &bull; {{ s.startsAtUtc | date:'HH:mm' }} &ndash; {{ s.endsAtUtc | date:'HH:mm' }} ({{ s.plannedDurationHours }}h)</span>
                  </div>

                  <div class="dsc-staff">
                    <span class="material-symbols-outlined">payments</span>
                    <span>Rate: <strong>{{ s.hourlyPayRate ? (currencySymbol + s.hourlyPayRate + '/hr') : (currencySymbol + '10.00/hr') }}</strong></span>
                  </div>

                  <!-- Quick Action Buttons for Shift -->
                  <div class="dsc-actions">
                    <!-- Primary Overview Button (Dedicated Shift Details Page) -->
                    <a
                      [routerLink]="['/workforce/workspace/shifts', s.id]"
                      class="btn btn-sm btn-primary d-inline-flex align-items-center gap-1"
                      title="View Complete Shift Details, Instructions & Actions"
                    >
                      <span class="material-symbols-outlined" style="font-size: 15px;">visibility</span>
                      <span>View Details</span>
                    </a>

                    <!-- Fast Clock In Button (Only if duty is Today or Active) -->
                    <a
                      routerLink="/attendance/workspace/clock"
                      [queryParams]="{ shiftId: s.id }"
                      class="btn btn-success btn-sm d-inline-flex align-items-center gap-1"
                      *ngIf="(selectedDay.isToday || isShiftActive(s)) && !isShiftCompleted(s)"
                      title="Fast Duty Clock-In"
                    >
                      <span class="material-symbols-outlined" style="font-size: 15px;">fingerprint</span>
                      <span>{{ isShiftActive(s) ? 'Live Duty Clock-Out' : 'Clock In Fast' }}</span>
                    </a>

                    <!-- 1-Tap Confirm / Acknowledge (Only if Unconfirmed) -->
                    <button
                      type="button"
                      class="btn btn-sm btn-confirm"
                      *ngIf="!s.isConfirmedByGuard && s.status !== 'ClaimPending' && s.status !== 'PendingClaim'"
                      (click)="confirmShift(s)"
                      [disabled]="isActionLoading || isShiftExpired(s)"
                    >
                      <span class="material-symbols-outlined">check_circle</span>
                      <span>{{ s.assignmentMode === 'Mandatory' ? 'Acknowledge' : 'Accept' }}</span>
                    </button>

                    <!-- Request Swap (Only if Upcoming) -->
                    <button
                      type="button"
                      class="btn btn-sm btn-outline"
                      *ngIf="isShiftUpcoming(s) && s.status !== 'SwapOffered'"
                      (click)="openSwapModal(s)"
                      title="Request Peer Cover / Shift Swap"
                    >
                      <span class="material-symbols-outlined">swap_horiz</span>
                      <span>Request Swap</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- SECTION B: Logged Excuses & Time Off on this Date -->
            <div class="inspector-section" *ngIf="selectedDay.leaves.length > 0">
              <div class="sec-head">
                <div class="sec-title">
                  <span class="sec-badge purple">Time Off</span>
                  <h4>Logged Excuses &amp; Time Off ({{ selectedDay.leaves.length }})</h4>
                </div>
              </div>

              <div class="compact-item-list">
                <div class="compact-item" *ngFor="let l of selectedDay.leaves">
                  <div>
                    <strong>{{ l.leaveType }}</strong> &bull;
                    <span class="status-pill" [ngClass]="l.status === 'Approved' ? 'status-active' : (l.status === 'Rejected' ? 'status-danger' : 'status-pending')">
                      {{ l.status }}
                    </span>
                    <span class="ci-sub">{{ l.startDate | date:'dd MMM' }} &ndash; {{ l.endDate | date:'dd MMM yyyy' }} ({{ l.totalDays }} day{{ l.totalDays > 1 ? 's' : '' }}) &bull; {{ l.reason || 'No reason specified' }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 5. Upcoming Assigned Shifts Section (Canonical CMS Card - Only visible when browsing all days) -->
        <div class="cms-card mt-4" *ngIf="!selectedDay">
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
                  <a
                    [routerLink]="['/workforce/workspace/shifts', s.id]"
                    class="btn btn-sm btn-outline d-inline-flex align-items-center gap-1"
                    title="View Complete Shift Details, Instructions & Actions"
                  >
                    <span class="material-symbols-outlined" style="font-size: 15px;">visibility</span>
                    <span>View Details</span>
                  </a>
                  <span class="card-chip chip-amber" *ngIf="s.status === 'ClaimPending' || s.status === 'PendingClaim'" title="Awaiting supervisor approval">Claim Pending Approval</span>
                  <button
                    type="button"
                    class="btn btn-confirm"
                    *ngIf="!s.isConfirmedByGuard && s.status !== 'ClaimPending' && s.status !== 'PendingClaim'"
                    (click)="confirmShift(s)"
                    [disabled]="isActionLoading || isShiftExpired(s)">
                    <span class="material-symbols-outlined">check_circle</span>
                    <span>{{ s.assignmentMode === 'Mandatory' ? 'Acknowledge Duty' : 'Accept Shift' }}</span>
                  </button>
                  <button
                    type="button"
                    class="btn btn-outline"
                    style="color: #dc2626; border-color: #fecaca;"
                    *ngIf="!s.isConfirmedByGuard && s.assignmentMode !== 'Mandatory' && s.status !== 'ClaimPending' && s.status !== 'PendingClaim'"
                    (click)="declineShiftOffer(s)"
                    [disabled]="isActionLoading">
                    <span class="material-symbols-outlined">close</span>
                    <span>Decline</span>
                  </button>
                  <button
                    type="button"
                    class="btn btn-outline"
                    *ngIf="s.status !== 'SwapOffered'"
                    (click)="openSwapModal(s)">
                    <span class="material-symbols-outlined">swap_horiz</span>
                    <span>Request Swap</span>
                  </button>
                  <button
                    type="button"
                    class="btn btn-outline"
                    style="color: #dc2626; border-color: #fecaca;"
                    *ngIf="s.status === 'SwapOffered'"
                    (click)="withdrawShiftSwap(s)">
                    <span class="material-symbols-outlined">cancel</span>
                    <span>Withdraw Swap</span>
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
                  <div class="d-flex align-items-center gap-1 flex-wrap">
                    <span class="badge badge-info" *ngIf="os.requiredStaffCount && os.requiredStaffCount > 1" style="background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; font-size: 11px; padding: 2px 8px; border-radius: 12px; font-weight: 600;">
                      {{ os.openSlotsRemaining !== undefined ? os.openSlotsRemaining : (os.requiredStaffCount - (os.assignedCount || 0)) }} of {{ os.requiredStaffCount }} slots open
                    </span>
                    <span class="status-pill status-active" *ngIf="!os.requireClaimApproval">Open to Claim</span>
                    <span class="status-pill status-pending" *ngIf="os.requireClaimApproval" style="background: #fef3c7; color: #92400e; border: 1px solid #fde68a;">Requires Approval</span>
                  </div>
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
                  <div class="meta-row" *ngIf="os.requiredStaffCount && os.requiredStaffCount > 1">
                    <span class="meta-label">Total Capacity:</span>
                    <span class="meta-val" style="color: #0369a1; font-weight: 600;">
                      {{ os.assignedCount || 0 }}/{{ os.requiredStaffCount }} filled ({{ os.openSlotsRemaining !== undefined ? os.openSlotsRemaining : (os.requiredStaffCount - (os.assignedCount || 0)) }} open slots)
                    </span>
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
                  <span class="material-symbols-outlined">{{ os.requireClaimApproval ? 'assignment_turned_in' : 'how_to_reg' }}</span>
                  <span>{{ os.requireClaimApproval ? 'Apply to Claim Shift' : 'Claim Shift Immediately' }}</span>
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
                  <th class="sortable-th" [class.active-sort]="tsSortCol === 'siteName'" (click)="toggleTsSort('siteName')">
                    <span class="th-sort-wrap">Shift / Site <span class="material-symbols-outlined sort-icon">{{ getSortIcon(tsSortCol, tsSortDir, 'siteName') }}</span></span>
                  </th>
                  <th class="sortable-th" [class.active-sort]="tsSortCol === 'startsAtUtc'" (click)="toggleTsSort('startsAtUtc')">
                    <span class="th-sort-wrap">Date <span class="material-symbols-outlined sort-icon">{{ getSortIcon(tsSortCol, tsSortDir, 'startsAtUtc') }}</span></span>
                  </th>
                  <th class="sortable-th" [class.active-sort]="tsSortCol === 'startsAtUtc'" (click)="toggleTsSort('startsAtUtc')">
                    <span class="th-sort-wrap">Scheduled Window <span class="material-symbols-outlined sort-icon">{{ getSortIcon(tsSortCol, tsSortDir, 'startsAtUtc') }}</span></span>
                  </th>
                  <th class="sortable-th" [class.active-sort]="tsSortCol === 'clockInUtc'" (click)="toggleTsSort('clockInUtc')">
                    <span class="th-sort-wrap">Clock-In / Out <span class="material-symbols-outlined sort-icon">{{ getSortIcon(tsSortCol, tsSortDir, 'clockInUtc') }}</span></span>
                  </th>
                  <th class="sortable-th" [class.active-sort]="tsSortCol === 'duration'" (click)="toggleTsSort('duration')">
                    <span class="th-sort-wrap">Duration <span class="material-symbols-outlined sort-icon">{{ getSortIcon(tsSortCol, tsSortDir, 'duration') }}</span></span>
                  </th>
                  <th class="sortable-th" [class.active-sort]="tsSortCol === 'hourlyPayRate'" (click)="toggleTsSort('hourlyPayRate')">
                    <span class="th-sort-wrap">Rate <span class="material-symbols-outlined sort-icon">{{ getSortIcon(tsSortCol, tsSortDir, 'hourlyPayRate') }}</span></span>
                  </th>
                  <th class="sortable-th" [class.active-sort]="tsSortCol === 'fineAmount'" (click)="toggleTsSort('fineAmount')">
                    <span class="th-sort-wrap">Deductions / Fines <span class="material-symbols-outlined sort-icon">{{ getSortIcon(tsSortCol, tsSortDir, 'fineAmount') }}</span></span>
                  </th>
                  <th class="sortable-th text-end" [class.active-sort]="tsSortCol === 'netPay'" (click)="toggleTsSort('netPay')">
                    <span class="th-sort-wrap">Net Pay <span class="material-symbols-outlined sort-icon">{{ getSortIcon(tsSortCol, tsSortDir, 'netPay') }}</span></span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let t of sortedTimesheetList">
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
              <div class="form-group mb-3">
                <label class="form-label">Reason / Notes</label>
                <textarea class="form-control" rows="3" [(ngModel)]="leaveReason" placeholder="Describe the reason for your leave request..."></textarea>
              </div>
              <div class="form-actions mt-3">
                <button
                  type="button"
                  class="btn btn-primary"
                  (click)="submitLeave()"
                  [disabled]="isActionLoading || !leaveStartDate || !leaveEndDate">
                  <span class="material-symbols-outlined">send</span>
                  <span>Submit Leave Request</span>
                </button>
              </div>
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
                    <th class="sortable-th" [class.active-sort]="leaveSortCol === 'leaveType'" (click)="toggleLeaveSort('leaveType')">
                      <span class="th-sort-wrap">Type <span class="material-symbols-outlined sort-icon">{{ getSortIcon(leaveSortCol, leaveSortDir, 'leaveType') }}</span></span>
                    </th>
                    <th class="sortable-th" [class.active-sort]="leaveSortCol === 'startDate'" (click)="toggleLeaveSort('startDate')">
                      <span class="th-sort-wrap">Dates <span class="material-symbols-outlined sort-icon">{{ getSortIcon(leaveSortCol, leaveSortDir, 'startDate') }}</span></span>
                    </th>
                    <th class="sortable-th" [class.active-sort]="leaveSortCol === 'totalDays'" (click)="toggleLeaveSort('totalDays')">
                      <span class="th-sort-wrap">Days <span class="material-symbols-outlined sort-icon">{{ getSortIcon(leaveSortCol, leaveSortDir, 'totalDays') }}</span></span>
                    </th>
                    <th class="sortable-th" [class.active-sort]="leaveSortCol === 'status'" (click)="toggleLeaveSort('status')">
                      <span class="th-sort-wrap">Status <span class="material-symbols-outlined sort-icon">{{ getSortIcon(leaveSortCol, leaveSortDir, 'status') }}</span></span>
                    </th>
                    <th class="sortable-th" [class.active-sort]="leaveSortCol === 'reason'" (click)="toggleLeaveSort('reason')">
                      <span class="th-sort-wrap">Notes <span class="material-symbols-outlined sort-icon">{{ getSortIcon(leaveSortCol, leaveSortDir, 'reason') }}</span></span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let l of sortedLeaveList">
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
              <div class="form-group mb-2">
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
              <div class="form-group mb-2">
                <label class="form-label">Document Name *</label>
                <input type="text" class="form-control" [(ngModel)]="docForm.documentName" placeholder="e.g. SIA Door Supervisor Badge #1002" />
              </div>
              <div class="form-group mb-2">
                <label class="form-label">Expiry Date</label>
                <input type="date" class="form-control" [(ngModel)]="docForm.expiryDateUtc" />
              </div>
              <!-- Document Source Selection: File Upload OR Direct URL -->
              <div class="form-group mb-2">
                <div class="source-toggle-header">
                  <label class="form-label m-0">Document Attachment *</label>
                  <div class="source-toggle-pills">
                    <button
                      type="button"
                      class="source-pill"
                      [class.active]="docUploadMode === 'file'"
                      (click)="docUploadMode = 'file'">
                      <span class="material-symbols-outlined">upload_file</span>
                      <span>Upload File</span>
                    </button>
                    <button
                      type="button"
                      class="source-pill"
                      [class.active]="docUploadMode === 'url'"
                      (click)="docUploadMode = 'url'">
                      <span class="material-symbols-outlined">link</span>
                      <span>Direct URL</span>
                    </button>
                  </div>
                </div>

                <!-- 1. Direct File Upload Dropzone -->
                <div *ngIf="docUploadMode === 'file'" class="doc-dropzone" (click)="docFileInput.click()">
                  <input
                    #docFileInput
                    type="file"
                    (change)="onDocumentFileSelected($event)"
                    accept="image/*,.pdf,.doc,.docx"
                    style="display: none;" />

                  <!-- Empty state / Click to upload -->
                  <div *ngIf="!docForm.fileUrl && !isUploadingDoc" class="dropzone-empty">
                    <div class="dropzone-icon">
                      <span class="material-symbols-outlined">cloud_upload</span>
                    </div>
                    <div class="dropzone-instructions">
                      <strong>Choose a file or click to browse</strong>
                      <span>Supports PDF, PNG, JPG, or DOC up to 10MB</span>
                    </div>
                  </div>

                  <!-- Uploading spinner state -->
                  <div *ngIf="isUploadingDoc" class="dropzone-uploading">
                    <span class="material-symbols-outlined spin text-primary">sync</span>
                    <span>Uploading file securely...</span>
                  </div>

                  <!-- Uploaded file success card -->
                  <div *ngIf="docForm.fileUrl && !isUploadingDoc" class="dropzone-file-card" (click)="$event.stopPropagation()">
                    <div class="file-card-info">
                      <span class="material-symbols-outlined text-green">verified</span>
                      <div class="file-text">
                        <div class="file-name">{{ uploadedDocFileName || 'Document Attached' }}</div>
                        <a [href]="docForm.fileUrl" target="_blank" class="file-preview-link">
                          <span class="material-symbols-outlined">visibility</span>
                          <span>Preview File</span>
                        </a>
                      </div>
                    </div>
                    <div class="file-card-actions">
                      <button type="button" class="icon-action-btn" (click)="docFileInput.click()" title="Replace File">
                        <span class="material-symbols-outlined">sync</span>
                      </button>
                      <button type="button" class="icon-action-btn text-danger" (click)="removeUploadedDoc()" title="Remove File">
                        <span class="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                  </div>
                </div>

                <!-- 2. Direct URL Input -->
                <div *ngIf="docUploadMode === 'url'" class="url-input-container">
                  <div class="url-input-group">
                    <input
                      type="url"
                      class="form-control"
                      [(ngModel)]="docForm.fileUrl"
                      placeholder="https://example.com/document.pdf or hosted link" />
                    <a *ngIf="docForm.fileUrl" [href]="docForm.fileUrl" target="_blank" class="btn-url-preview" title="Test URL">
                      <span class="material-symbols-outlined">open_in_new</span>
                    </a>
                  </div>
                  <span class="url-helper-text">Enter direct hosted document link</span>
                </div>
              </div>

              <div class="form-actions mt-2">
                <button
                  type="button"
                  class="btn btn-primary btn-sm"
                  (click)="saveDocument()"
                  [disabled]="isActionLoading || isUploadingDoc || !docForm.documentName || !docForm.fileUrl">
                  <span class="material-symbols-outlined">verified_user</span>
                  <span>Save Document</span>
                </button>
              </div>
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
                    <th class="sortable-th" [class.active-sort]="docSortCol === 'documentName'" (click)="toggleDocSort('documentName')">
                      <span class="th-sort-wrap">Document <span class="material-symbols-outlined sort-icon">{{ getSortIcon(docSortCol, docSortDir, 'documentName') }}</span></span>
                    </th>
                    <th class="sortable-th" [class.active-sort]="docSortCol === 'documentType'" (click)="toggleDocSort('documentType')">
                      <span class="th-sort-wrap">Type <span class="material-symbols-outlined sort-icon">{{ getSortIcon(docSortCol, docSortDir, 'documentType') }}</span></span>
                    </th>
                    <th class="sortable-th" [class.active-sort]="docSortCol === 'expiryDateUtc'" (click)="toggleDocSort('expiryDateUtc')">
                      <span class="th-sort-wrap">Expiry <span class="material-symbols-outlined sort-icon">{{ getSortIcon(docSortCol, docSortDir, 'expiryDateUtc') }}</span></span>
                    </th>
                    <th class="sortable-th" [class.active-sort]="docSortCol === 'isVerified'" (click)="toggleDocSort('isVerified')">
                      <span class="th-sort-wrap">Status <span class="material-symbols-outlined sort-icon">{{ getSortIcon(docSortCol, docSortDir, 'isVerified') }}</span></span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let d of sortedDocList">
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
              <div class="form-group mb-3">
                <label class="form-label">Reason / Notes</label>
                <textarea class="form-control" rows="2" [(ngModel)]="availForm.reason" placeholder="e.g. University lectures, family commitment..."></textarea>
              </div>
              <div class="form-actions mt-3">
                <button
                  type="button"
                  class="btn btn-primary"
                  (click)="saveAvailability()"
                  [disabled]="isActionLoading || !availForm.targetDate">
                  <span class="material-symbols-outlined">save</span>
                  <span>Save Availability</span>
                </button>
              </div>
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
                    <th class="sortable-th" [class.active-sort]="availSortCol === 'targetDate'" (click)="toggleAvailSort('targetDate')">
                      <span class="th-sort-wrap">Date <span class="material-symbols-outlined sort-icon">{{ getSortIcon(availSortCol, availSortDir, 'targetDate') }}</span></span>
                    </th>
                    <th class="sortable-th" [class.active-sort]="availSortCol === 'state'" (click)="toggleAvailSort('state')">
                      <span class="th-sort-wrap">Status <span class="material-symbols-outlined sort-icon">{{ getSortIcon(availSortCol, availSortDir, 'state') }}</span></span>
                    </th>
                    <th class="sortable-th" [class.active-sort]="availSortCol === 'unavailableFromTime'" (click)="toggleAvailSort('unavailableFromTime')">
                      <span class="th-sort-wrap">Window <span class="material-symbols-outlined sort-icon">{{ getSortIcon(availSortCol, availSortDir, 'unavailableFromTime') }}</span></span>
                    </th>
                    <th class="sortable-th" [class.active-sort]="availSortCol === 'reason'" (click)="toggleAvailSort('reason')">
                      <span class="th-sort-wrap">Reason <span class="material-symbols-outlined sort-icon">{{ getSortIcon(availSortCol, availSortDir, 'reason') }}</span></span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let a of sortedAvailList">
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
            <div class="form-row-3 mb-2">
              <div class="form-group">
                <label class="form-label">Slot 1 Reminder</label>
                <select class="form-select" [(ngModel)]="reminderPrefs.slot1MinutesBefore">
                  <option [ngValue]="null">-- Choose time frame --</option>
                  <option [ngValue]="1440">24 hours before</option>
                  <option [ngValue]="720">12 hours before</option>
                  <option [ngValue]="360">6 hours before</option>
                  <option [ngValue]="240">4 hours before</option>
                  <option [ngValue]="120">2 hours before</option>
                  <option [ngValue]="60">1 hour before</option>
                  <option [ngValue]="0">Disabled / No Reminder</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Slot 2 Reminder</label>
                <select class="form-select" [(ngModel)]="reminderPrefs.slot2MinutesBefore">
                  <option [ngValue]="null">-- Choose time frame --</option>
                  <option [ngValue]="720">12 hours before</option>
                  <option [ngValue]="360">6 hours before</option>
                  <option [ngValue]="240">4 hours before</option>
                  <option [ngValue]="120">2 hours before</option>
                  <option [ngValue]="60">1 hour before</option>
                  <option [ngValue]="30">30 mins before</option>
                  <option [ngValue]="0">Disabled / No Reminder</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Slot 3 Reminder</label>
                <select class="form-select" [(ngModel)]="reminderPrefs.slot3MinutesBefore">
                  <option [ngValue]="null">-- Choose time frame --</option>
                  <option [ngValue]="120">2 hours before</option>
                  <option [ngValue]="60">1 hour before</option>
                  <option [ngValue]="45">45 mins before</option>
                  <option [ngValue]="30">30 mins before</option>
                  <option [ngValue]="15">15 mins before</option>
                  <option [ngValue]="0">Disabled / No Reminder</option>
                </select>
              </div>
            </div>

            <div class="mb-2">
              <label class="form-label mb-1">Delivery Channels</label>
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
                    <input type="checkbox" [(ngModel)]="reminderPrefs.enableInApp" />
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
                    <input type="checkbox" [(ngModel)]="reminderPrefs.enableEmail" />
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
                    <input type="checkbox" [(ngModel)]="reminderPrefs.enableWhatsApp" />
                    <span class="toggle-slider"></span>
                  </label>
                </div>
              </div>
            </div>

            <div class="form-actions mt-2">
              <button type="button" class="btn btn-primary" (click)="saveReminderPreferences()">
                <span class="material-symbols-outlined">save</span>
                <span>Save Preferences</span>
              </button>
            </div>
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

      <!-- 7. Duty Report Modal -->
      <div class="modal-backdrop-custom" *ngIf="showDutyReportModal" (click)="closeDutyReportModal()">
        <div class="modal-card-custom" style="max-width: 600px;" (click)="$event.stopPropagation()">
          <div class="modal-header-custom">
            <div class="modal-title-group">
              <span class="material-symbols-outlined text-primary">assignment</span>
              <div>
                <h3>Shift Duty Activity Report</h3>
                <p class="modal-subtitle">Log routine occurrences, patrol checkpoints, access control events, and shift handover remarks.</p>
              </div>
            </div>
            <button type="button" class="btn-close-custom" (click)="closeDutyReportModal()">&times;</button>
          </div>
          <div class="modal-body-custom">
            <div class="p-3 mb-2" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
              <div class="d-flex justify-content-between align-items-center">
                <strong>{{ activeReportingShift?.facilityName || activeReportingShift?.siteName }}</strong>
                <span class="badge" style="background: #e0e7ff; color: #3730a3; padding: 3px 8px; border-radius: 4px; font-size: 11px;">{{ activeReportingShift?.postName }}</span>
              </div>
              <div class="text-muted small mt-1">
                Shift: {{ activeReportingShift?.shiftCode }} &bull; {{ activeReportingShift?.startsAtUtc | date:'HH:mm' }} &ndash; {{ activeReportingShift?.endsAtUtc | date:'HH:mm' }}
              </div>
            </div>

            <div class="form-group mb-1">
              <label class="form-label fw-bold">Duty Report &amp; Occurrence Observations *</label>
              <textarea
                class="form-control"
                rows="7"
                [(ngModel)]="dutyReportContent"
                placeholder="e.g. Conducted perimeter inspection at 20:00, all exterior doors secured. Access control log clear with no unauthorized entries. Handover to relief officer completed."
              ></textarea>
            </div>
          </div>
          <div class="modal-footer-custom">
            <button type="button" class="btn btn-outline" (click)="closeDutyReportModal()">Cancel</button>
            <button
              type="button"
              class="btn btn-primary"
              (click)="saveShiftDutyReport()"
              [disabled]="isSubmittingDutyReport || !dutyReportContent.trim()"
            >
              <span class="material-symbols-outlined" *ngIf="!isSubmittingDutyReport" style="font-size: 16px;">check_circle</span>
              <span class="material-symbols-outlined spin" *ngIf="isSubmittingDutyReport" style="font-size: 16px;">sync</span>
              <span>{{ isSubmittingDutyReport ? 'Submitting...' : 'Submit Duty Report' }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 8. Emergency SOS Security Alert Modal -->
      <div class="modal-backdrop-custom emergency-sos-backdrop" *ngIf="showEmergencySosModal" (click)="closeEmergencySosModal()">
        <div class="modal-card-custom emergency-sos-card" style="max-width: 650px;" (click)="$event.stopPropagation()">
          <div class="modal-header-custom" style="background: #fef2f2; border-bottom: 2px solid #fee2e2;">
            <div class="modal-title-group">
              <div class="emergency-badge-pulse">
                <span class="material-symbols-outlined" style="font-size: 26px; color: #fff;">e911</span>
              </div>
              <div>
                <h3 style="color: #b91c1c; margin: 0; font-size: 1.15rem; font-weight: 700;">EMERGENCY SOS DISPATCH</h3>
                <p class="modal-subtitle" style="color: #991b1b; margin: 2px 0 0 0;">Immediate high-urgency security alert across SMS, Email, WhatsApp, and Web Push notifications</p>
              </div>
            </div>
            <button type="button" class="btn-close-custom" (click)="closeEmergencySosModal()">&times;</button>
          </div>
          <div class="modal-body-custom">
            <!-- Urgent Banner -->
            <div class="alert-box mb-3" style="background: #fee2e2; border: 1px solid #ef4444; border-radius: 8px; padding: 10px 14px; display: flex; align-items: center; gap: 10px;">
              <span class="material-symbols-outlined" style="color: #dc2626; font-size: 24px; flex-shrink: 0;">crisis_alert</span>
              <div style="font-size: 12.5px; color: #7f1d1d; line-height: 1.4;">
                <strong>URGENT SECURITY ESCALATION:</strong> Engaging this alert immediately notifies duty controllers, incident response commanders, and emergency administrators across all communication channels.
              </div>
            </div>

            <!-- Site & GPS Status -->
            <div class="p-2 px-3 mb-3" style="background: #f8fafc; border-radius: 6px; font-size: 12.5px; border: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong>Site:</strong> {{ activeSosShift?.facilityName || activeSosShift?.siteName }} ({{ activeSosShift?.postName }})
              </div>
              <div>
                <span *ngIf="sosLatitude && sosLongitude" style="color: #16a34a; font-weight: 600;">
                  📍 GPS Acquired: {{ sosLatitude | number:'1.4-4' }}, {{ sosLongitude | number:'1.4-4' }}
                </span>
                <span *ngIf="!sosLatitude && isAcquiringGps" style="color: #d97706;">
                  <span class="material-symbols-outlined spin" style="font-size: 12px; vertical-align: middle;">sync</span> Acquiring GPS...
                </span>
                <span *ngIf="!sosLatitude && !isAcquiringGps" style="color: #64748b;">
                  📍 GPS: Offline / Pending
                </span>
              </div>
            </div>

            <!-- Dynamic Emergency Categories -->
            <div class="form-group mb-3">
              <label class="form-label fw-bold mb-1">
                Select Incident Category <span class="text-danger">*</span>
              </label>
              <p class="text-muted small mb-2">Category configured by your organization's shift policy:</p>

              <div class="emergency-categories-grid" *ngIf="emergencyCategories.length > 0">
                <div
                  *ngFor="let cat of emergencyCategories"
                  class="emergency-cat-card"
                  [class.selected]="selectedSosCategory?.id === cat.id"
                  (click)="selectSosCategory(cat)"
                >
                  <div class="ecc-icon">{{ cat.icon || '🚨' }}</div>
                  <div class="ecc-info">
                    <div class="ecc-name">{{ cat.name }}</div>
                    <div class="ecc-desc">{{ cat.description }}</div>
                  </div>
                  <span class="ecc-severity" [class.critical]="cat.severity === 'Critical'" [class.high]="cat.severity === 'High'">
                    {{ cat.severity }}
                  </span>
                </div>
              </div>

              <div *ngIf="emergencyCategories.length === 0" class="p-3 text-center text-muted border rounded small">
                Loading emergency categories from shift settings...
              </div>
            </div>

            <!-- Emergency Description -->
            <div class="form-group mb-1">
              <label class="form-label fw-bold">Emergency Situation &amp; Immediate Requirements *</label>
              <textarea
                class="form-control"
                rows="4"
                [(ngModel)]="sosDescription"
                placeholder="e.g. Unauthorized individual attempting to breach rear warehouse gate, aggressive behavior, backup requested immediately..."
              ></textarea>
            </div>
          </div>
          <div class="modal-footer-custom" style="background: #fef2f2; border-top: 1px solid #fee2e2;">
            <button type="button" class="btn btn-outline" (click)="closeEmergencySosModal()" [disabled]="isTransmittingSos">Cancel</button>
            <button
              type="button"
              class="btn btn-danger d-inline-flex align-items-center gap-2 emergency-sos-trigger-btn"
              style="padding: 10px 20px; font-size: 14px;"
              (click)="dispatchEmergencySos()"
              [disabled]="isTransmittingSos || !selectedSosCategory || !sosDescription.trim()"
            >
              <span class="material-symbols-outlined" *ngIf="!isTransmittingSos">e911</span>
              <span class="material-symbols-outlined spin" *ngIf="isTransmittingSos">sync</span>
              <strong>{{ isTransmittingSos ? 'Broadcasting Alert...' : '🚨 TRANSMIT EMERGENCY SOS NOW' }}</strong>
            </button>
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
      gap: 24px;
      padding: 0 4px 32px 4px;
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
      overflow-x: hidden;
    }
    .analytics-tab-container,
    .shifts-tab-container {
      display: flex;
      flex-direction: column;
      gap: 28px;
      width: 100%;
    }
    .mb-4 {
      margin-bottom: 28px !important;
    }
    .mb-3 {
      margin-bottom: 20px !important;
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

    /* Next Shift Overview Banner Card */
    .next-shift-banner {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 16px 22px;
      margin-top: 14px;
      margin-bottom: 16px;
      box-shadow: 0 4px 16px rgba(0, 80, 229, 0.04);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      flex-wrap: wrap;
    }
    .next-shift-banner.empty-banner {
      border: 1px dashed #cbd5e1;
      background: #f8fafc;
      padding: 16px 20px;
    }
    .nsb-left {
      flex: 1 1 300px;
      min-width: 0;
    }
    .nsb-tag-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 6px;
    }
    .nsb-tag {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #0050e5;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      padding: 2px 8px;
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .nsb-tag .material-symbols-outlined {
      font-size: 13px;
    }
    .nsb-pill {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 12px;
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }
    .nsb-pill.pill-active {
      background: #ecfdf5;
      color: #059669;
      border: 1px solid #a7f3d0;
    }
    .nsb-pill.pill-today {
      background: #fef3c7;
      color: #d97706;
      border: 1px solid #fde68a;
    }
    .nsb-venue {
      font-size: 17px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 4px 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .nsb-location {
      font-size: 13px;
      color: #64748b;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .nsb-location .material-symbols-outlined {
      font-size: 16px;
      color: #94a3b8;
    }
    .nsb-center {
      flex: 1 1 260px;
      min-width: 0;
      border-left: 1px solid #f1f5f9;
      padding-left: 20px;
    }
    .nsb-time-box {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .nsb-date {
      font-size: 12px;
      font-weight: 600;
      color: #475569;
      text-transform: capitalize;
    }
    .nsb-time {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 16px;
      color: #0f172a;
    }
    .nsb-time .time-icon {
      font-size: 18px;
      color: #0050e5;
    }
    .nsb-overnight-badge {
      font-size: 10px;
      background: #312e81;
      color: #ffffff;
      padding: 1px 6px;
      border-radius: 4px;
      text-transform: uppercase;
      font-weight: 600;
    }
    .nsb-role {
      font-size: 12px;
      color: #64748b;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .nsb-role .material-symbols-outlined {
      font-size: 14px;
    }
    .nsb-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
    }
    .nsb-empty-icon {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      background: #eff6ff;
      color: #0050e5;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      flex-shrink: 0;
    }
    .nsb-empty-title {
      font-size: 15px;
      font-weight: 700;
      color: #1e293b;
      margin: 0 0 2px 0;
    }
    .nsb-empty-desc {
      font-size: 12px;
      color: #64748b;
      margin: 0;
    }
    @media (max-width: 768px) {
      .next-shift-banner {
        flex-direction: column;
        align-items: stretch;
      }
      .nsb-center {
        border-left: none;
        border-top: 1px solid #f1f5f9;
        padding-left: 0;
        padding-top: 12px;
      }
      .nsb-actions {
        width: 100%;
        justify-content: flex-end;
      }
    }

    /* Sub-Nav Pill Tabs (Horizontal Scrolling with Edge Glow and Arrows) */
    .subnav-scroll-wrapper {
      position: relative;
      width: 100%;
      max-width: 100%;
      min-width: 0;
      overflow: hidden;
      box-sizing: border-box;
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
      max-width: 100%;
      min-width: 0;
      box-sizing: border-box;
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
    .subnav-tab.position-relative {
      position: relative;
    }
    .tab-badge,
    .tab-badge-sup {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 18px;
      height: 18px;
      padding: 0 5px;
      border-radius: 999px;
      font-size: 10px;
      font-weight: 800;
      line-height: 1;
      background: #0050e5;
      color: #ffffff;
      box-shadow: 0 2px 6px rgba(0, 80, 229, 0.35);
      vertical-align: super;
      transform: translateY(-2px);
      margin-left: 6px;
    }
    .subnav-tab.active .tab-badge,
    .subnav-tab.active .tab-badge-sup {
      background: #ffffff;
      color: #0050e5;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.18);
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
      margin-bottom: 28px !important;
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
    .card-kpi-heading {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #64748b;
      margin-bottom: 2px;
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
    /* Master Calendar Navigation Toolbar */
    .calendar-toolbar-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      flex-wrap: wrap;
      background: #ffffff;
      padding: 12px 18px;
      border-radius: 14px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02);
    }
    .cal-nav-left, .cal-nav-right {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .cal-nav-controls {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .period-title-group {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .btn-today {
      height: 34px;
      padding: 0 14px;
      border-radius: 8px;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      color: #0f172a;
      font-size: 12.5px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-today:hover { background: #f1f5f9; }
    .nav-arrows { display: inline-flex; align-items: center; gap: 4px; }
    .nav-icon-btn {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      color: #334155;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .nav-icon-btn:hover { background: #e2e8f0; color: #0f172a; }
    .period-heading {
      margin: 0 4px;
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
      min-width: 155px;
    }
    .month-year-pickers { display: inline-flex; align-items: center; gap: 6px; }
    .cal-picker-select {
      height: 34px;
      padding: 0 10px;
      border-radius: 8px;
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      color: #0f172a;
      font-size: 12.5px;
      font-weight: 600;
      outline: none;
    }
    .cal-view-switcher {
      display: inline-flex;
      align-items: center;
      background: #f1f5f9;
      padding: 4px;
      border-radius: 10px;
      border: 1px solid #e2e8f0;
      gap: 4px;
    }
    .cal-view-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      height: 30px;
      padding: 0 11px;
      border-radius: 7px;
      border: none;
      background: transparent;
      color: #475569;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .cal-view-btn .material-symbols-outlined { font-size: 16px; }
    .cal-view-btn:hover { color: #0f172a; background: #e2e8f0; }
    .cal-view-btn.active {
      background: #0050e5;
      color: #ffffff;
      box-shadow: 0 2px 6px rgba(0, 80, 229, 0.25);
    }
    .cal-action-banner {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      padding: 5px 12px;
      border-radius: 8px;
      font-size: 12px;
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
      font-size: 11.5px;
      font-weight: 700;
      text-decoration: none;
      transition: background 0.15s;
    }
    .btn-clockin-mini:hover { background: #003ebd; }

    /* Color Legend Bar */
    .calendar-legend-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      background: #ffffff;
      padding: 10px 16px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      font-size: 11.5px;
    }
    .legend-group { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .legend-title { font-weight: 700; color: #475569; }
    .legend-swatch {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 10px;
      border-radius: 6px;
      font-weight: 700;
    }
    .swatch-dot { width: 8px; height: 8px; border-radius: 50%; }
    .upcoming-swatch { background: #dcfce7; color: #065f46; border: 1px solid #86efac; }
    .upcoming-swatch .swatch-dot { background: #16a34a; }
    .today-swatch { background: #dbeafe; color: #1e40af; border: 1px solid #93c5fd; }
    .today-swatch .swatch-dot { background: #0050e5; }
    .past-swatch { background: #eef2ff; color: #334155; border: 1px solid #cbd5e1; }
    .past-swatch .swatch-dot { background: #64748b; }

    /* Multi-Metric Daily Badges */
    .metric-pill {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      padding: 2px 7px;
      border-radius: 6px;
      font-size: 10.5px;
      font-weight: 800;
      line-height: 1.3;
      white-space: nowrap;
    }
    .pill-blue { background: #dbeafe; color: #1e40af; border: 1px solid #93c5fd; }
    .pill-green { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
    .pill-orange { background: #ffedd5; color: #9a3412; border: 1px solid #fdba74; }
    .pill-purple { background: #f3e8ff; color: #6b21a8; border: 1px solid #d8b4fe; }
    .pill-yellow { background: #fef9c3; color: #854d0e; border: 1px solid #fde047; }
    .pill-gray { background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; }

    /* Monthly Calendar Board */
    .calendar-board-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.02);
    }
    .month-grid-scroll { overflow-x: auto; }
    .month-grid-header {
      display: grid;
      grid-template-columns: repeat(7, minmax(135px, 1fr));
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
    }
    .weekday-col {
      padding: 10px 12px;
      text-align: center;
      font-size: 11.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #475569;
      border-right: 1px solid #f1f5f9;
    }
    .month-grid-body {
      display: grid;
      grid-template-columns: repeat(7, minmax(135px, 1fr));
    }
    .month-day-cell {
      min-height: 120px;
      padding: 8px 10px;
      border-right: 1px solid var(--md-sys-color-outline, #e2e8f0);
      border-bottom: 1px solid var(--md-sys-color-outline, #e2e8f0);
      background: var(--md-sys-color-surface, #ffffff);
      color: var(--md-sys-color-on-surface, #0f172a);
      display: flex;
      flex-direction: column;
      gap: 6px;
      cursor: pointer;
      transition: all 0.14s ease;
      position: relative;
    }
    .month-day-cell:hover {
      box-shadow: inset 0 0 0 2px #0050e5;
      z-index: 2;
    }
    .month-day-cell.other-month {
      background: var(--md-sys-color-surface-variant, #fcfcfd);
      color: var(--md-sys-color-on-surface-variant, #64748b);
      opacity: 0.55;
    }
    .month-day-cell.day-upcoming-shifts {
      background: linear-gradient(180deg, #f0fdf4 0%, #dcfce7 100%);
      border-color: #86efac;
      color: #064e3b;
    }
    .month-day-cell.day-today {
      background: linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%);
      border: 2px solid #0050e5;
      color: var(--md-sys-color-on-surface, #0f172a);
    }
    .month-day-cell.day-past-shifts {
      background: linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%);
      border-color: #cbd5e1;
      color: var(--md-sys-color-on-surface-variant, #1e293b);
    }
    .month-day-cell.day-selected {
      box-shadow: inset 0 0 0 2.5px #0050e5;
    }

    .cell-top-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 4px;
    }
    .day-num-wrap { display: inline-flex; align-items: center; gap: 4px; }
    .day-num-circle {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 800;
      color: var(--md-sys-color-on-surface, #0f172a);
    }
    .day-num-circle.today-circle {
      background: #0050e5;
      color: #ffffff;
    }
    .month-abbr {
      font-size: 11px;
      font-weight: 700;
      color: var(--md-sys-color-on-surface-variant, #64748b);
      text-transform: uppercase;
    }
    .day-era-tag {
      font-size: 9.5px;
      font-weight: 800;
      text-transform: uppercase;
      padding: 1px 6px;
      border-radius: 999px;
      letter-spacing: 0.03em;
    }
    .day-era-tag.today { background: #0050e5; color: #ffffff; }
    .day-era-tag.upcoming { background: #16a34a; color: #ffffff; }
    .day-era-tag.past { background: #64748b; color: #ffffff; }

    .cell-metrics-wrap {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    .cell-events-list {
      display: flex;
      flex-direction: column;
      gap: 3px;
      margin-top: 2px;
    }
    .cell-event-chip {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 2px 6px;
      border-radius: 5px;
      background: rgba(255, 255, 255, 0.92);
      border-left: 3px solid #0050e5;
      font-size: 10.5px;
      color: #0f172a;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    }
    .cell-event-chip.chip-done { border-left-color: #64748b; opacity: 0.85; }
    .ev-time { font-weight: 800; color: #0050e5; flex-shrink: 0; }
    .ev-title { overflow: hidden; text-overflow: ellipsis; font-weight: 600; }
    .more-events-link { font-size: 10px; font-weight: 700; color: #0050e5; padding-left: 4px; }
    .cell-hover-hint { font-size: 9.5px; font-weight: 600; color: #94a3b8; margin-top: auto; }
    .month-day-cell:hover .cell-hover-hint { color: #0050e5; }
    .cell-mobile-indicators { display: none; }
    .mobile-only { display: none; }

    /* Calendar Summary Footer */
    .calendar-summary-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 20px;
      padding: 12px 18px;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      font-size: 12.5px;
      color: #475569;
    }
    .summary-item { display: inline-flex; align-items: center; gap: 6px; }
    .summary-item .material-symbols-outlined { font-size: 16px; color: #64748b; }

    /* Week Timeline View */
    .week-grid-container { display: flex; flex-direction: column; overflow-x: auto; }
    .week-header-row {
      display: grid;
      grid-template-columns: 76px repeat(7, minmax(120px, 1fr));
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
    }
    .time-gutter-header {
      padding: 12px 8px;
      font-size: 10.5px;
      font-weight: 700;
      color: #64748b;
      text-align: center;
      border-right: 1px solid #e2e8f0;
    }
    .week-day-col-header {
      padding: 10px 8px;
      text-align: center;
      border-right: 1px solid #e2e8f0;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }
    .week-day-col-header.is-today { background: #eff6ff; }
    .wk-day-name { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; }
    .wk-day-num { width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 800; color: #0f172a; }
    .wk-day-num.today-circle { background: #0050e5; color: #ffffff; }
    .wk-mini-pills { display: flex; gap: 3px; flex-wrap: wrap; justify-content: center; }
    .week-timeline-scroll { max-height: 520px; overflow-y: auto; }
    .week-hour-row {
      display: grid;
      grid-template-columns: 76px repeat(7, minmax(120px, 1fr));
      min-height: 52px;
      border-bottom: 1px solid #f1f5f9;
    }
    .time-gutter-cell {
      padding: 6px 8px;
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
      text-align: right;
      border-right: 1px solid #e2e8f0;
      background: #fafbfc;
    }
    .week-slot-cell {
      padding: 4px;
      border-right: 1px solid #f1f5f9;
      cursor: pointer;
    }
    .week-slot-cell.slot-today { background: rgba(239, 246, 255, 0.45); }
    .week-slot-cell.slot-upcoming { background: rgba(240, 253, 244, 0.45); }
    .timeline-event-card {
      padding: 5px 7px;
      border-radius: 6px;
      background: #eff6ff;
      border-left: 3px solid #0050e5;
      color: #0f172a;
      font-size: 11px;
      margin-bottom: 4px;
    }
    .timeline-event-card.ev-upcoming { background: #dcfce7; border-left-color: #16a34a; color: #064e3b; }
    .timeline-event-card.ev-done { background: #f1f5f9; border-left-color: #64748b; opacity: 0.85; }
    .tev-time { font-weight: 800; }
    .tev-venue { font-weight: 700; }
    .tev-staff { font-size: 10px; opacity: 0.9; }

    /* Single Day View */
    .day-view-Subheader {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
      padding: 16px 20px;
      border-bottom: 1px solid #e2e8f0;
      background: #fafbfc;
    }
    .day-hero-badge { display: flex; align-items: center; gap: 14px; }
    .day-big-circle {
      width: 54px;
      height: 54px;
      border-radius: 12px;
      background: #e2e8f0;
      color: #0f172a;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .day-big-circle.today { background: #0050e5; color: #ffffff; }
    .dbc-dow { font-size: 10px; font-weight: 800; text-transform: uppercase; }
    .dbc-num { font-size: 20px; font-weight: 800; line-height: 1.1; }
    .day-hero-badge h3 { margin: 0; font-size: 17px; font-weight: 800; color: #0f172a; }
    .day-layout-toggle { display: flex; align-items: center; gap: 8px; }
    .toggle-lbl { font-size: 12px; font-weight: 700; color: #64748b; }
    .day-hourly-timeline { max-height: 520px; overflow-y: auto; }
    .day-all-day-bar {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 16px;
      background: #faf5ff;
      border-bottom: 1px solid #e9d5ff;
    }
    .all-day-lbl { font-size: 10.5px; font-weight: 800; color: #6b21a8; }
    .all-day-chips { display: flex; gap: 6px; flex-wrap: wrap; }
    .day-hour-row {
      display: grid;
      grid-template-columns: 84px 1fr;
      min-height: 56px;
      border-bottom: 1px solid #f1f5f9;
    }
    .day-hour-slot { padding: 6px 12px; display: flex; flex-direction: column; gap: 6px; }
    .day-timeline-shift-block {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 14px;
      border-radius: 8px;
      background: #eff6ff;
      border-left: 4px solid #0050e5;
    }
    .day-timeline-shift-block.ev-done { background: #f1f5f9; border-left-color: #64748b; }
    .dts-main { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; font-size: 13px; color: #0f172a; }
    .dts-site { font-weight: 700; color: #0050e5; }
    .dts-staff { display: inline-flex; align-items: center; gap: 4px; font-weight: 600; }
    .dts-staff .material-symbols-outlined { font-size: 16px; }
    .dts-actions { display: flex; gap: 6px; }

    /* Year 12-Month Overview Grid */
    .year-board-pad { padding: 20px; }
    .year-months-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 18px;
    }
    .mini-month-card {
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px;
      background: #ffffff;
    }
    .mini-month-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
      cursor: pointer;
    }
    .mini-month-header h4 { margin: 0; font-size: 14px; font-weight: 800; color: #0f172a; }
    .jump-hint { font-size: 11px; font-weight: 700; color: #0050e5; }
    .mini-weekdays {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      text-align: center;
      font-size: 10.5px;
      font-weight: 800;
      color: #64748b;
      margin-bottom: 6px;
    }
    .mini-days-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 3px;
    }
    .mini-day-btn {
      height: 28px;
      border-radius: 6px;
      border: none;
      background: transparent;
      font-size: 11.5px;
      font-weight: 700;
      color: #0f172a;
      cursor: pointer;
    }
    .mini-day-btn:hover { background: #e2e8f0; }
    .mini-day-btn.other { opacity: 0.3; }
    .mini-day-btn.today { background: #0050e5; color: #ffffff; }
    .mini-day-btn.upcoming-shifts { background: #dcfce7; color: #065f46; border: 1px solid #86efac; }
    .mini-day-btn.past-shifts { background: #eef2ff; color: #334155; border: 1px solid #cbd5e1; }

    /* Interactive Day Operations Breakdown Panel */
    .day-inspector-card {
      background: var(--md-sys-color-surface, #ffffff);
      border: 1.5px solid var(--md-sys-color-outline, #bfdbfe);
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 8px 24px rgba(0, 80, 229, 0.06);
      margin-top: 24px;
    }
    .inspector-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
      padding: 16px 20px;
      background: var(--md-sys-color-surface-variant, #eff6ff);
      border-bottom: 1px solid var(--md-sys-color-outline, #dbeafe);
    }
    .inspector-title-left { display: flex; align-items: center; gap: 14px; }
    .inspector-date-icon {
      width: 52px;
      height: 52px;
      border-radius: 12px;
      background: #0f172a;
      color: #ffffff;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .inspector-date-icon.today { background: #0050e5; }
    .inspector-date-icon.upcoming { background: #16a34a; }
    .idi-month { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; }
    .idi-day { font-size: 20px; font-weight: 800; line-height: 1.1; }
    .inspector-heading-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .inspector-heading-row h3 { margin: 0; font-size: 17px; font-weight: 800; color: var(--md-sys-color-on-surface, #0f172a); }
    .inspector-sub { margin: 2px 0 0 0; font-size: 12.5px; color: var(--md-sys-color-on-surface-variant, #475569); }
    .inspector-header-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .btn-close-circle {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 1px solid var(--md-sys-color-outline, #cbd5e1);
      background: var(--md-sys-color-surface, #ffffff);
      color: var(--md-sys-color-on-surface-variant, #475569);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s ease;
      flex-shrink: 0;
    }
    .btn-close-circle:hover {
      background: var(--md-sys-color-surface-variant, #f1f5f9);
      color: var(--md-sys-color-on-surface, #0f172a);
    }
    .btn-close-circle .material-symbols-outlined {
      font-size: 18px;
    }
    .inspector-actions-strip {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 20px;
      background: var(--md-sys-color-surface-variant, #f8fafc);
      border-bottom: 1px solid var(--md-sys-color-outline, #e2e8f0);
    }
    .inspector-actions-strip .flex-1 {
      flex: 1;
      justify-content: center;
    }

    .inspector-metrics-strip {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
      padding: 14px 20px;
      background: var(--md-sys-color-surface-variant, #fafbfc);
      border-bottom: 1px solid var(--md-sys-color-outline, #e2e8f0);
    }
    .insp-stat {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      border-radius: 10px;
      background: var(--md-sys-color-surface, #ffffff);
      border: 1px solid var(--md-sys-color-outline, #e2e8f0);
    }
    .insp-stat .material-symbols-outlined { font-size: 22px; }
    .insp-stat.blue .material-symbols-outlined { color: #0050e5; }
    .insp-stat.green .material-symbols-outlined { color: #16a34a; }
    .insp-stat.purple .material-symbols-outlined { color: #7c3aed; }
    .insp-stat.amber .material-symbols-outlined { color: #d97706; }
    .insp-stat strong { display: block; font-size: 16px; font-weight: 800; color: var(--md-sys-color-on-surface, #0f172a); }
    .insp-stat span { font-size: 11.5px; color: var(--md-sys-color-on-surface-variant, #64748b); font-weight: 600; }

    .inspector-sections-body { padding: 18px 20px; display: flex; flex-direction: column; gap: 18px; }
    .inspector-section {
      border: 1px solid var(--md-sys-color-outline, #e2e8f0);
      border-radius: 12px;
      padding: 14px 16px;
      background: var(--md-sys-color-surface, #ffffff);
    }
    .sec-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
    .sec-title { display: flex; align-items: center; gap: 8px; }
    .sec-title h4 { margin: 0; font-size: 14px; font-weight: 800; color: var(--md-sys-color-on-surface, #0f172a); }
    .sec-badge { font-size: 10.5px; font-weight: 800; padding: 2px 8px; border-radius: 999px; text-transform: uppercase; }
    .sec-badge.blue { background: #dbeafe; color: #1e40af; }
    .sec-badge.green { background: #dcfce7; color: #166534; }
    .sec-badge.purple { background: #f3e8ff; color: #6b21a8; }
    .sec-badge.amber { background: #ffedd5; color: #9a3412; }
    .sec-empty { padding: 20px; text-align: center; font-size: 13px; color: var(--md-sys-color-on-surface-variant, #64748b); background: var(--md-sys-color-surface-variant, #f8fafc); border-radius: 8px; }

    .day-shifts-cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 14px;
    }
    .day-shift-card {
      padding: 14px;
      border-radius: 10px;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      display: flex;
      flex-direction: column;
      gap: 6px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      transition: all 0.2s ease;
    }
    .day-shift-card:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    }
    .day-shift-card.card-active {
      background: #f0fdf4;
      border-color: #22c55e;
      border-width: 1.5px;
    }
    .day-shift-card.card-upcoming {
      background: #ffffff;
      border-color: #cbd5e1;
    }
    .day-shift-card.card-completed {
      background: #f8fafc;
      border-color: #e2e8f0;
      opacity: 0.9;
    }
    .status-pill.status-active {
      background: #dcfce7;
      color: #15803d;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }
    .status-pill.status-upcoming {
      background: #eff6ff;
      color: #1d4ed8;
      font-weight: 700;
      border: 1px solid #bfdbfe;
    }
    .status-pill.status-completed {
      background: #f1f5f9;
      color: #64748b;
      font-weight: 700;
    }
    .live-dot.pulse {
      display: inline-block;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #16a34a;
      box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.7);
      animation: pulse-dot 1.8s infinite;
    }
    @keyframes pulse-dot {
      0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.7); }
      70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(22, 163, 74, 0); }
      100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(22, 163, 74, 0); }
    }

    /* Duty Detail Modal Styling */
    .duty-status-banner {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border-radius: 10px;
    }
    .duty-status-banner p { margin: 2px 0 0 0; font-size: 12.5px; color: #475569; }
    .status-active-banner { background: #f0fdf4; border: 1px solid #86efac; color: #15803d; }
    .status-upcoming-banner { background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; }
    .status-completed-banner { background: #f8fafc; border: 1px solid #e2e8f0; color: #475569; }

    .duty-specs-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }
    .spec-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 14px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .spec-label { font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; letter-spacing: 0.5px; }
    .spec-value { font-size: 14px; color: #0f172a; }
    .spec-sub { font-size: 12px; color: #64748b; }

    .info-group-box {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 16px;
    }
    .info-group-box h5 {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 6px 0;
    }
    .info-group-box p { font-size: 12.5px; color: #334155; line-height: 1.5; margin: 0; }
    .dsc-top { display: flex; justify-content: space-between; align-items: center; }
    .dsc-venue { font-size: 14px; font-weight: 800; color: #0f172a; margin: 4px 0 0 0; }
    .dsc-post { font-size: 12px; font-weight: 700; color: #0050e5; }
    .dsc-time, .dsc-staff { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #334155; }
    .dsc-time .material-symbols-outlined, .dsc-staff .material-symbols-outlined { font-size: 16px; color: #64748b; }
    .dsc-actions { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; }

    .compact-item-list { display: flex; flex-direction: column; gap: 8px; }
    .compact-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 8px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      font-size: 12.5px;
    }
    .ci-sub { display: block; font-size: 11.5px; color: #64748b; margin-top: 2px; }

    /* Day Activity & Details Modal (Spacious Full Page Modal) */
    .day-details-modal {
      max-width: 1240px !important;
      width: 95vw !important;
      height: 88vh !important;
      max-height: 92vh !important;
      display: flex;
      flex-direction: column;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 25px 60px rgba(15, 23, 42, 0.25);
      transition: all 0.25s ease-in-out;
    }
    .day-details-modal.maximized {
      max-width: 100vw !important;
      width: 100vw !important;
      height: 100vh !important;
      max-height: 100vh !important;
      border-radius: 0 !important;
      margin: 0 !important;
    }
    .btn-icon-custom {
      background: none;
      border: none;
      border-radius: 8px;
      width: 34px;
      height: 34px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #64748b;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-icon-custom:hover {
      background: #f1f5f9;
      color: #0f172a;
    }
    .btn-icon-custom .material-symbols-outlined {
      font-size: 20px;
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
    /* Dedicated Full-Page Day Schedule View */
    .day-detail-page-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
      animation: fadeIn 0.2s ease-in-out;
    }
    .day-page-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 0;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }
    .day-page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px 28px;
      border-bottom: 1px solid #e2e8f0;
      background: #ffffff;
      gap: 16px;
      flex-wrap: wrap;
    }
    .day-page-title-group h3 {
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
    }
    .day-page-subtitle {
      font-size: 13px;
      color: #64748b;
      margin: 4px 0 0 0;
    }
    .day-page-header-actions {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .day-page-body {
      padding: 28px;
    }
    .day-page-columns {
      display: grid;
      grid-template-columns: 1.25fr 1fr;
      gap: 28px;
      align-items: start;
    }
    @media (max-width: 1024px) {
      .day-page-columns {
        grid-template-columns: 1fr;
        gap: 24px;
      }
    }
    .day-page-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 18px 28px;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      flex-wrap: wrap;
      gap: 12px;
    }
    .day-details-modal .modal-header-custom {
      padding: 20px 28px;
      flex-shrink: 0;
    }
    .day-details-modal .modal-body-scrollable {
      flex: 1 1 auto;
      max-height: none !important;
      overflow-y: auto;
      padding: 24px 28px;
    }
    .day-quick-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px;
      padding-bottom: 16px;
      margin-bottom: 24px !important;
      border-bottom: 1px solid #e2e8f0;
    }
    .day-quick-actions .btn {
      padding: 8px 16px !important;
      font-size: 12.5px !important;
      border-radius: 9px !important;
      margin: 0 !important;
    }
    .btn-sm {
      padding: 8px 16px !important;
      font-size: 12.5px !important;
      border-radius: 8px !important;
      gap: 6px !important;
      display: inline-flex !important;
      align-items: center !important;
    }
    .btn-sm .material-symbols-outlined { font-size: 17px !important; }
    .btn-xs {
      padding: 6px 12px !important;
      font-size: 11.5px !important;
      border-radius: 7px !important;
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
    .dates-row-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
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
      gap: 14px;
      background: #f8fafc;
      border: 1px dashed #cbd5e1;
      border-radius: 12px;
      padding: 16px 20px;
    }
    .day-empty-box .material-symbols-outlined { font-size: 26px; }
    .day-empty-box .btn {
      margin-left: auto !important;
      flex-shrink: 0;
      padding: 8px 16px !important;
      font-size: 12.5px !important;
      border-radius: 8px !important;
    }
    .empty-text-group {
      min-width: 0;
    }
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
      margin-bottom: 28px !important;
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
      gap: 16px;
      margin-top: 14px;
    }
    .current-working-range {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .active-range-chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #eff6ff;
      border: 1.5px solid #bfdbfe;
      border-radius: 10px;
      padding: 6px 14px;
      font-size: 13px;
      color: #1e3a8a;
      font-weight: 700;
    }
    .range-chip-label {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .range-chip-icon {
      font-size: 18px;
      color: #0050e5;
    }
    .range-date-text {
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.2px;
    }
    .badge-default-month {
      background: #0050e5;
      color: #ffffff;
      font-size: 10.5px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 12px;
      letter-spacing: 0.2px;
      margin-left: 4px;
    }
    .range-meta-actions {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .shifts-count-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 6px 12px;
      font-size: 12px;
      font-weight: 700;
      color: #475569;
    }
    .chip-icon-sm {
      font-size: 16px;
      color: #64748b;
    }
    .btn-reset-month {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 6px 12px;
      font-size: 12px;
      font-weight: 600;
      color: #0050e5;
      cursor: pointer;
      transition: all 0.15s ease-in-out;
    }
    .btn-reset-month:hover {
      background: #eff6ff;
      border-color: #0050e5;
    }
    .btn-reset-month .material-symbols-outlined {
      font-size: 16px;
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

    /* Analytics Charts Grid */
    .analytics-charts-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 28px !important;
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
    .badge-top-venue {
      font-size: 10.5px;
      font-weight: 700;
      background: #eff6ff;
      color: #0050e5;
      padding: 2px 8px;
      border-radius: 12px;
      border: 1px solid #bfdbfe;
      margin-left: 6px;
    }
    .venue-shifts {
      font-size: 11.5px;
      color: #64748b;
      font-weight: 600;
    }
    .venue-rate {
      font-size: 11.5px;
      color: #0050e5;
      font-weight: 700;
    }

    /* Punctuality Pulse Strip Micro-Widget */
    .punctuality-pulse-card {
      padding: 18px 24px;
      background: #ffffff;
      border-radius: 16px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 15px rgba(0,0,0,0.02);
      margin-bottom: 28px !important;
    }
    .pulse-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      flex-wrap: wrap;
      gap: 12px;
    }
    .pulse-title-group {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .pulse-heading {
      font-size: 15px;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
    }
    .pulse-sub {
      font-size: 12px;
      color: #64748b;
      margin: 2px 0 0 0;
    }
    .pulse-legend {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 11.5px;
      color: #64748b;
      font-weight: 600;
    }
    .legend-item {
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }
    .bead-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    .bead-indicator.bead-green { background: #16a34a; }
    .bead-indicator.bead-amber { background: #d97706; }
    .bead-indicator.bead-red { background: #dc2626; }
    .pulse-beads-row {
      display: flex;
      align-items: center;
      gap: 14px;
      overflow-x: auto;
      padding: 6px 2px 8px 2px;
      scrollbar-width: thin;
    }
    .pulse-bead-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      min-width: 60px;
      cursor: pointer;
      transition: transform 0.15s ease-in-out;
    }
    .pulse-bead-item:hover {
      transform: translateY(-2px);
    }
    .bead-circle {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 6px rgba(0,0,0,0.06);
    }
    .bead-circle.bead-green {
      background: #dcfce7;
      color: #15803d;
      border: 1.5px solid #86efac;
    }
    .bead-circle.bead-amber {
      background: #fef3c7;
      color: #b45309;
      border: 1.5px solid #fde68a;
    }
    .bead-circle.bead-red {
      background: #fee2e2;
      color: #b91c1c;
      border: 1.5px solid #fca5a5;
    }
    .bead-icon { font-size: 18px; }
    .bead-date {
      font-size: 10.5px;
      font-weight: 700;
      color: #334155;
    }
    .bead-status {
      font-size: 9.5px;
      color: #64748b;
      font-weight: 600;
      white-space: nowrap;
    }
    .empty-pulse {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12.5px;
      color: #64748b;
      padding: 12px 0;
    }

    /* Granularity Toggle */
    .btn-group-granularity {
      display: inline-flex;
      background: #f1f5f9;
      border-radius: 8px;
      padding: 2px;
      border: 1px solid #e2e8f0;
    }
    .btn-granularity {
      border: none;
      background: transparent;
      padding: 4px 10px;
      font-size: 11.5px;
      font-weight: 700;
      color: #64748b;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s ease-in-out;
    }
    .btn-granularity.active {
      background: #ffffff;
      color: #0050e5;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }

    /* Donut Metric Legend Chips */
    .donut-chips-row {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 10px;
      margin-top: 14px;
      padding-top: 12px;
      border-top: 1px solid #f1f5f9;
    }
    .donut-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 5px 10px;
      font-size: 11.5px;
    }
    .chip-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    .chip-dot.bg-blue { background: #0050e5; }
    .chip-dot.bg-sky { background: #38bdf8; }
    .chip-dot.bg-amber { background: #f59e0b; }
    .chip-dot.bg-danger { background: #f87171; }
    .chip-name { color: #64748b; font-weight: 600; }
    .chip-val { color: #0f172a; font-weight: 800; }
    .chip-pct { color: #64748b; font-size: 10.5px; }

    /* Statement Filter Bar & Controls */
    .statement-filters-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 20px;
      border-bottom: 1px solid #f1f5f9;
      background: #fafbfc;
      flex-wrap: wrap;
      gap: 12px;
    }
    .table-filter-pills {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }
    .filter-pill-btn {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 4px 12px;
      font-size: 11.5px;
      font-weight: 600;
      color: #475569;
      cursor: pointer;
      transition: all 0.15s ease-in-out;
    }
    .filter-pill-btn:hover {
      border-color: #0050e5;
      color: #0050e5;
    }
    .filter-pill-btn.active {
      background: #0050e5;
      border-color: #0050e5;
      color: #ffffff;
      box-shadow: 0 1px 4px rgba(0,80,229,0.2);
    }
    .table-search-box {
      display: flex;
      align-items: center;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 4px 10px;
      gap: 6px;
      width: 240px;
    }
    .table-search-box .search-icon {
      font-size: 16px;
      color: #94a3b8;
    }
    .table-search-input {
      border: none;
      outline: none;
      font-size: 12px;
      width: 100%;
      color: #0f172a;
      background: transparent;
    }
    .search-clear-btn {
      background: none;
      border: none;
      padding: 0;
      color: #94a3b8;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
    }
    .search-clear-btn .material-symbols-outlined { font-size: 14px; }
    .clock-times-cell {
      display: flex;
      flex-direction: column;
      gap: 2px;
      font-size: 11.5px;
    }
    .clock-in-val { font-weight: 700; color: #16a34a; }
    .clock-in-val.text-amber { color: #d97706; }
    .clock-out-val { color: #64748b; font-size: 11px; }
    .statement-summary-footer-row {
      background: #f8fafc;
      border-top: 2px solid #e2e8f0;
    }
    .statement-summary-footer-row td {
      padding: 12px 16px !important;
      font-size: 12.5px;
      color: #334155;
    }
    .summary-icon {
      font-size: 16px;
      color: #0050e5;
      vertical-align: middle;
      margin-right: 4px;
    }
    .clickable-statement-row {
      cursor: pointer;
      transition: background-color 0.15s ease-in-out;
    }
    .clickable-statement-row:hover {
      background-color: #f8fafc !important;
    }
    :host-context(.dark-mode) .clickable-statement-row:hover {
      background-color: #334155 !important;
    }
    .punctuality-dot {
      display: inline-block;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .dot-green { background-color: #16a34a; }
    .dot-amber { background-color: #d97706; }
    .dot-red { background-color: #dc2626; }
    .dot-gray { background-color: #94a3b8; }
    .badge-duration {
      background: #f1f5f9;
      color: #334155;
      font-size: 11.5px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
    }
    :host-context(.dark-mode) .badge-duration {
      background: #0f172a;
      color: #cbd5e1;
      border-color: #334155;
    }
    .status-amber {
      background: #fef3c7;
      color: #b45309;
      border: 1px solid #fde68a;
    }

    @media print {
      .page-header .header-actions,
      .subnav-scroll-wrapper,
      .analytics-filter-card .filter-controls-row,
      .analytics-filter-card .filter-actions-right,
      .statement-filters-bar,
      .toolbar-right,
      .btn {
        display: none !important;
      }
      .bcp-page-container {
        padding: 0 !important;
      }
      .cms-card {
        box-shadow: none !important;
        border: 1px solid #cbd5e1 !important;
        break-inside: avoid;
      }
    }

    /* Calendar Footer Summary */
    .calendar-summary-footer {
      display: flex;
      justify-content: space-around;
      align-items: center;
      background: var(--md-sys-color-surface-variant, #f8fafc);
      border-radius: 10px;
      padding: 12px 16px;
      margin-top: 16px;
      border: 1px solid var(--md-sys-color-outline, #e2e8f0);
      flex-wrap: wrap;
      gap: 12px;
    }
    .summary-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: var(--md-sys-color-on-surface-variant, #475569);
    }
    .summary-item strong {
      color: var(--md-sys-color-on-surface, #0f172a);
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
      align-items: center;
      justify-content: flex-end;
      gap: 12px;
      background: #f8fafc;
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-weight: 600;
      font-size: 13.5px;
      padding: 9px 18px;
      border-radius: 10px;
      border: 1px solid transparent;
      cursor: pointer;
      transition: all 0.15s ease-in-out;
      text-decoration: none;
    }
    .btn .material-symbols-outlined {
      font-size: 18px;
      line-height: 1;
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
      margin-bottom: 28px !important;
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
    .toolbar-actions-grid {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .toolbar-action-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
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
    .card-body-form > button,
    .card-body-form > .btn {
      margin-top: 24px !important;
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
      margin-bottom: 16px;
    }
    .form-actions {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 24px !important;
      margin-bottom: 4px;
    }
    .w-100 {
      width: 100% !important;
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
      margin-bottom: 16px;
    }
    .form-row-3 {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 14px;
      margin-bottom: 16px;
    }

    /* Document Source Toggle & Dropzone */
    .source-toggle-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .source-toggle-pills {
      display: inline-flex;
      background: #f1f5f9;
      padding: 3px;
      border-radius: 8px;
      gap: 3px;
    }
    .source-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 10px;
      font-size: 11.5px;
      font-weight: 700;
      color: #64748b;
      background: transparent;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s ease-in-out;
    }
    .source-pill .material-symbols-outlined {
      font-size: 15px;
    }
    .source-pill.active {
      background: #ffffff;
      color: #0050e5;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    }
    .doc-dropzone {
      border: 2px dashed #cbd5e1;
      border-radius: 12px;
      background: #f8fafc;
      padding: 22px 18px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s ease-in-out;
      box-sizing: border-box;
    }
    .doc-dropzone:hover {
      border-color: #0050e5;
      background: #f0f7ff;
    }
    .dropzone-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }
    .dropzone-icon {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: #eff6ff;
      color: #0050e5;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .dropzone-icon .material-symbols-outlined {
      font-size: 24px;
    }
    .dropzone-instructions strong {
      display: block;
      font-size: 13px;
      color: #1e293b;
      margin-bottom: 2px;
    }
    .dropzone-instructions span {
      display: block;
      font-size: 11.5px;
      color: #64748b;
    }
    .dropzone-uploading {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 12px 0;
      color: #0050e5;
      font-size: 13px;
      font-weight: 700;
    }
    .dropzone-file-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #ffffff;
      border: 1px solid #bbf7d0;
      border-radius: 10px;
      padding: 10px 14px;
      text-align: left;
      box-shadow: 0 2px 8px rgba(16, 185, 129, 0.08);
    }
    .file-card-info {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }
    .file-text {
      min-width: 0;
    }
    .file-name {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 220px;
    }
    .file-preview-link {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11.5px;
      font-weight: 600;
      color: #0050e5;
      text-decoration: none;
      margin-top: 2px;
    }
    .file-preview-link .material-symbols-outlined {
      font-size: 13px;
    }
    .file-preview-link:hover {
      text-decoration: underline;
    }
    .file-card-actions {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .icon-action-btn {
      background: #f1f5f9;
      border: none;
      border-radius: 8px;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: #475569;
      transition: all 0.15s ease-in-out;
    }
    .icon-action-btn:hover {
      background: #e2e8f0;
    }
    .icon-action-btn.text-danger:hover {
      background: #fee2e2;
      color: #dc2626;
    }
    .icon-action-btn .material-symbols-outlined {
      font-size: 16px;
    }
    .url-input-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .btn-url-preview {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 10px;
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      color: #0050e5;
      text-decoration: none;
      flex-shrink: 0;
      transition: all 0.15s;
    }
    .btn-url-preview:hover {
      background: #eff6ff;
      border-color: #0050e5;
    }
    .btn-url-preview .material-symbols-outlined {
      font-size: 18px;
    }
    .url-helper-text {
      display: block;
      font-size: 11.5px;
      color: #64748b;
      margin-top: 4px;
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
      /* Compact Metrics Grid & Cards on Mobile */
      .metrics-grid {
        grid-template-columns: repeat(2, 1fr) !important;
        gap: 8px !important;
        margin-bottom: 16px !important;
      }
      .metric-card {
        padding: 10px 12px !important;
        border-radius: 12px !important;
        gap: 4px !important;
        box-shadow: 0 1px 4px rgba(0,0,0,0.02) !important;
      }
      .metric-card .card-top {
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        gap: 6px !important;
        margin-bottom: 2px !important;
      }
      .metric-card .card-icon {
        width: 28px !important;
        height: 28px !important;
        min-width: 28px !important;
        border-radius: 7px !important;
      }
      .metric-card .card-icon .material-symbols-outlined {
        font-size: 16px !important;
      }
      .metric-card .card-chip {
        font-size: 8.5px !important;
        font-weight: 700 !important;
        padding: 2px 6px !important;
        border-radius: 8px !important;
        letter-spacing: 0.1px !important;
        white-space: nowrap !important;
      }
      .metric-card .card-value {
        font-size: 15px !important;
        font-weight: 800 !important;
        line-height: 1.25 !important;
        letter-spacing: -0.3px !important;
        word-break: break-word !important;
      }
      .metric-card .card-label {
        font-size: 10.5px !important;
        font-weight: 600 !important;
        line-height: 1.2 !important;
        color: #64748b !important;
      }
      .metric-card .card-progress-track {
        height: 3px !important;
        margin-top: 2px !important;
      }
      .metric-card .card-sub-info {
        font-size: 9.5px !important;
        line-height: 1.25 !important;
        color: #94a3b8 !important;
        margin-top: 2px !important;
      }
      .metric-card .card-sub-info span {
        font-size: 9.5px !important;
      }
      .metric-card .btn-confirm-inline {
        padding: 2px 6px !important;
        font-size: 9.5px !important;
        border-radius: 4px !important;
      }

      /* Calendar Toolbar & Navigation Mobile Optimization */
      .calendar-toolbar-card {
        padding: 10px 12px !important;
        border-radius: 12px !important;
        gap: 8px !important;
        margin-bottom: 8px !important;
      }
      .cal-nav-left {
        width: 100% !important;
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        gap: 8px !important;
        flex-wrap: nowrap !important;
      }
      .period-title-group {
        display: inline-flex !important;
        align-items: center !important;
        min-width: 0 !important;
        flex: 1 1 auto !important;
      }
      .period-heading {
        font-size: 15.5px !important;
        font-weight: 800 !important;
        margin: 0 !important;
        min-width: 0 !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
      }
      .cal-nav-controls {
        display: inline-flex !important;
        align-items: center !important;
        gap: 6px !important;
        flex-shrink: 0 !important;
      }
      .btn-today {
        height: 28px !important;
        padding: 0 10px !important;
        font-size: 11px !important;
        border-radius: 6px !important;
      }
      .nav-arrows {
        display: inline-flex !important;
        align-items: center !important;
        gap: 3px !important;
      }
      .nav-icon-btn {
        width: 28px !important;
        height: 28px !important;
      }
      .nav-icon-btn .material-symbols-outlined {
        font-size: 16px !important;
      }
      .cal-nav-right {
        width: 100% !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 8px !important;
      }
      .cal-view-switcher {
        width: 100% !important;
        display: grid !important;
        grid-template-columns: repeat(4, 1fr) !important;
        gap: 2px !important;
        padding: 2px !important;
        border-radius: 8px !important;
        box-sizing: border-box !important;
      }
      .cal-view-btn {
        justify-content: center !important;
        height: 30px !important;
        padding: 0 4px !important;
        font-size: 11px !important;
        border-radius: 6px !important;
        gap: 3px !important;
      }
      .cal-view-btn .material-symbols-outlined {
        font-size: 14px !important;
      }
      .desktop-only {
        display: none !important;
      }
      .calendar-legend-bar {
        display: flex !important;
        align-items: center !important;
        flex-wrap: nowrap !important;
        overflow-x: auto !important;
        scrollbar-width: none !important;
        padding: 6px 10px !important;
        gap: 8px !important;
        margin-bottom: 10px !important;
        border-radius: 8px !important;
        background: #f8fafc !important;
      }
      .calendar-legend-bar::-webkit-scrollbar { display: none !important; }
      .legend-group {
        display: flex !important;
        align-items: center !important;
        flex-wrap: nowrap !important;
        gap: 5px !important;
        flex-shrink: 0 !important;
      }
      .legend-title {
        font-size: 9.5px !important;
        font-weight: 700 !important;
        color: #64748b !important;
        white-space: nowrap !important;
      }
      .legend-swatch, .metric-pill {
        font-size: 9px !important;
        padding: 2px 5px !important;
        white-space: nowrap !important;
        flex-shrink: 0 !important;
      }
      .mobile-only {
        display: flex !important;
      }
      .month-grid-scroll {
        overflow-x: hidden !important;
        width: 100% !important;
        max-width: 100% !important;
        min-width: 0 !important;
        box-sizing: border-box !important;
      }
      .month-grid-header {
        grid-template-columns: repeat(7, minmax(0, 1fr)) !important;
        width: 100% !important;
        max-width: 100% !important;
        min-width: 0 !important;
        box-sizing: border-box !important;
      }
      .weekday-col {
        padding: 6px 1px !important;
        font-size: 10px !important;
        font-weight: 700 !important;
        letter-spacing: 0 !important;
        border-right: 1px solid #f1f5f9 !important;
        text-align: center !important;
        min-width: 0 !important;
        max-width: 100% !important;
        overflow: hidden !important;
        box-sizing: border-box !important;
      }
      .month-grid-body {
        grid-template-columns: repeat(7, minmax(0, 1fr)) !important;
        width: 100% !important;
        max-width: 100% !important;
        min-width: 0 !important;
        box-sizing: border-box !important;
      }
      .month-day-cell {
        min-height: 54px !important;
        height: auto !important;
        padding: 4px 1px !important;
        gap: 2px !important;
        align-items: center !important;
        justify-content: flex-start !important;
        overflow: hidden !important;
        box-sizing: border-box !important;
        min-width: 0 !important;
        max-width: 100% !important;
      }
      .calendar-board-card {
        width: 100% !important;
        max-width: 100% !important;
        min-width: 0 !important;
        box-sizing: border-box !important;
        overflow: hidden !important;
      }
      .shifts-tab-container,
      .analytics-tab-container {
        width: 100% !important;
        max-width: 100% !important;
        min-width: 0 !important;
        box-sizing: border-box !important;
        overflow-x: hidden !important;
      }
      .cell-top-row {
        width: 100% !important;
        justify-content: center !important;
        gap: 0 !important;
      }
      .day-num-wrap {
        gap: 0 !important;
        justify-content: center !important;
      }
      .day-num-circle {
        width: 22px !important;
        height: 22px !important;
        font-size: 11px !important;
        font-weight: 800 !important;
      }
      .month-abbr {
        display: none !important;
      }
      .day-era-tag {
        display: none !important;
      }
      .cell-mobile-indicators {
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        gap: 1.5px !important;
        margin-top: 1px !important;
        width: 100% !important;
      }
      .mobile-shift-count {
        font-size: 8px !important;
        font-weight: 800 !important;
        color: #0050e5 !important;
        background: #eff6ff !important;
        border-radius: 3px !important;
        padding: 0 3px !important;
        line-height: 1.15 !important;
        white-space: nowrap !important;
      }
      .mobile-dots-row {
        display: flex !important;
        align-items: center !important;
        gap: 2px !important;
        justify-content: center !important;
      }
      .mob-dot {
        width: 4.5px !important;
        height: 4.5px !important;
        border-radius: 50% !important;
        display: inline-block !important;
        flex-shrink: 0 !important;
      }
      .mob-dot.dot-blue { background: #0050e5 !important; }
      .mob-dot.dot-green { background: #16a34a !important; }
      .mob-dot.dot-purple { background: #9333ea !important; }
      .mob-dot.dot-yellow { background: #ca8a04 !important; }
      .calendar-summary-footer {
        flex-direction: column !important;
        align-items: flex-start !important;
        padding: 10px 14px !important;
        gap: 6px !important;
        font-size: 11px !important;
      }

      /* Day Operations Inspector Mobile Optimization */
      .day-inspector-card {
        margin-top: 14px !important;
        border-radius: 12px !important;
      }
      .inspector-header {
        padding: 10px 12px !important;
        gap: 8px !important;
        justify-content: space-between !important;
        align-items: center !important;
        flex-wrap: nowrap !important;
      }
      .inspector-title-left {
        gap: 10px !important;
        min-width: 0 !important;
        flex: 1 1 auto !important;
      }
      .inspector-date-icon {
        width: 38px !important;
        height: 38px !important;
        border-radius: 8px !important;
      }
      .idi-month {
        font-size: 8px !important;
      }
      .idi-day {
        font-size: 15px !important;
      }
      .inspector-text-block {
        min-width: 0 !important;
      }
      .inspector-heading-row {
        gap: 6px !important;
        flex-wrap: nowrap !important;
      }
      .inspector-heading-row h3 {
        font-size: 13.5px !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
      }
      .inspector-sub {
        font-size: 10.5px !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
      }
      .btn-close-circle {
        width: 28px !important;
        height: 28px !important;
      }
      .btn-close-circle .material-symbols-outlined {
        font-size: 16px !important;
      }
      .inspector-actions-strip {
        padding: 8px 12px !important;
        gap: 6px !important;
      }
      .inspector-actions-strip .btn {
        height: 34px !important;
        font-size: 11.5px !important;
        padding: 0 10px !important;
      }
      .inspector-metrics-strip {
        grid-template-columns: repeat(2, 1fr) !important;
        gap: 6px !important;
        padding: 8px 12px !important;
      }
      .insp-stat {
        padding: 6px 10px !important;
        gap: 8px !important;
        border-radius: 8px !important;
      }
      .insp-stat .material-symbols-outlined {
        font-size: 18px !important;
      }
      .insp-stat strong {
        font-size: 13px !important;
      }
      .insp-stat span {
        font-size: 10px !important;
      }
      .inspector-sections-body {
        padding: 12px !important;
        gap: 12px !important;
      }
      .sec-head {
        padding-bottom: 8px !important;
        margin-bottom: 10px !important;
      }
      .sec-head h4 {
        font-size: 13px !important;
      }

      /* Quick Excuse Form Mobile Optimization */
      .quick-excuse-form-card {
        padding: 10px 12px !important;
        border-radius: 10px !important;
        margin-bottom: 12px !important;
      }
      .quick-excuse-form-card .form-header-row {
        margin-bottom: 8px !important;
      }
      .duration-presets-group {
        gap: 4px !important;
        margin-bottom: 8px !important;
      }
      .presets-label {
        font-size: 10px !important;
      }
      .presets-buttons {
        display: flex !important;
        flex-wrap: nowrap !important;
        overflow-x: auto !important;
        scrollbar-width: none !important;
        gap: 4px !important;
      }
      .presets-buttons::-webkit-scrollbar { display: none !important; }
      .preset-btn {
        padding: 3px 8px !important;
        font-size: 10.5px !important;
        white-space: nowrap !important;
        flex-shrink: 0 !important;
        border-radius: 5px !important;
      }
      .quick-excuse-form-card .form-group {
        margin-bottom: 6px !important;
      }
      .quick-excuse-form-card .form-label {
        font-size: 10.5px !important;
        font-weight: 700 !important;
        margin-bottom: 2px !important;
      }
      .quick-excuse-form-card .form-control,
      .quick-excuse-form-card .form-select {
        height: 34px !important;
        padding: 4px 8px !important;
        font-size: 12px !important;
        border-radius: 6px !important;
      }
      .dates-row-2 {
        display: grid !important;
        grid-template-columns: 1fr 1fr !important;
        gap: 6px !important;
        margin-bottom: 6px !important;
      }
      .quick-excuse-form-card .form-actions {
        margin-top: 8px !important;
        gap: 6px !important;
      }
      .quick-excuse-form-card .form-actions .btn {
        height: 32px !important;
        font-size: 11.5px !important;
        padding: 0 10px !important;
        border-radius: 6px !important;
        white-space: nowrap !important;
      }

      .shifts-card-body {
        padding: 14px 16px !important;
      }
      .shifts-grid {
        grid-template-columns: 1fr !important;
        gap: 12px !important;
      }
      .shift-card {
        padding: 14px 16px !important;
        gap: 10px !important;
        border-radius: 12px !important;
      }
      .shift-venue-title {
        font-size: 14px !important;
      }
      .shift-meta-grid {
        grid-template-columns: 1fr 1fr !important;
        gap: 6px !important;
        padding: 8px 10px !important;
      }
      .cms-card {
        border-radius: 12px !important;
        margin-bottom: 14px !important;
      }
      .card-body-form {
        padding: 8px 10px !important;
      }
      .card-body-form .form-group {
        margin-bottom: 5px !important;
      }
      .card-body-form .form-label {
        font-size: 10.5px !important;
        font-weight: 700 !important;
        margin-bottom: 2px !important;
      }
      .card-body-form .form-control,
      .card-body-form .form-select {
        height: 32px !important;
        padding: 2px 8px !important;
        font-size: 11.5px !important;
        border-radius: 6px !important;
      }
      .source-toggle-header {
        flex-direction: column !important;
        align-items: stretch !important;
        gap: 3px !important;
        margin-bottom: 4px !important;
      }
      .source-toggle-header .form-label {
        white-space: nowrap !important;
        margin-bottom: 0 !important;
        font-size: 10.5px !important;
        font-weight: 700 !important;
      }
      .source-toggle-pills {
        width: 100% !important;
        display: grid !important;
        grid-template-columns: 1fr 1fr !important;
        gap: 2px !important;
        padding: 2px !important;
        box-sizing: border-box !important;
      }
      .source-pill {
        flex: 1 !important;
        height: 26px !important;
        justify-content: center !important;
        padding: 0 6px !important;
        font-size: 10.5px !important;
        font-weight: 700 !important;
        border-radius: 5px !important;
        white-space: nowrap !important;
      }
      .source-pill .material-symbols-outlined {
        font-size: 14px !important;
      }
      .doc-dropzone {
        padding: 8px 10px !important;
        border-radius: 8px !important;
      }
      .dropzone-empty {
        gap: 3px !important;
      }
      .dropzone-icon {
        width: 28px !important;
        height: 28px !important;
      }
      .dropzone-icon .material-symbols-outlined {
        font-size: 16px !important;
      }
      .dropzone-instructions strong {
        font-size: 10.5px !important;
        margin-bottom: 0 !important;
      }
      .dropzone-instructions span {
        font-size: 8.5px !important;
      }
      .card-body-form .form-actions {
        margin-top: 6px !important;
      }
      .card-body-form .form-actions .btn {
        width: 100% !important;
        height: 32px !important;
        font-size: 11.5px !important;
        font-weight: 700 !important;
        justify-content: center !important;
        padding: 0 10px !important;
        margin-top: 0 !important;
        border-radius: 6px !important;
      }
      .card-header-simple {
        padding: 10px 12px !important;
        gap: 8px !important;
      }
      .card-header-simple h3 {
        font-size: 13.5px !important;
      }
      .card-header-simple .card-sub-text {
        font-size: 10.5px !important;
      }
      .form-row-2,
      .form-row-3 {
        grid-template-columns: 1fr !important;
        gap: 5px !important;
        margin-bottom: 5px !important;
      }
      .form-row-3 .form-group {
        margin-bottom: 0 !important;
      }
      .toggles-grid {
        grid-template-columns: 1fr !important;
        gap: 5px !important;
      }
      .toggle-card {
        padding: 8px 10px !important;
        gap: 8px !important;
        border-radius: 8px !important;
      }
      .toggle-info {
        gap: 8px !important;
      }
      .toggle-title {
        font-size: 11.5px !important;
      }
      .toggle-desc {
        font-size: 9.5px !important;
      }

      /* Analytics Filter Card Mobile Layout */
      .analytics-filter-card {
        padding: 16px !important;
        border-radius: 14px !important;
        margin-bottom: 20px !important;
      }
      .filter-card-header {
        flex-direction: column !important;
        align-items: stretch !important;
        gap: 12px !important;
      }
      .filter-title-group {
        width: 100% !important;
        align-items: flex-start !important;
        gap: 10px !important;
      }
      .filter-actions-right {
        width: 100% !important;
      }
      .filter-actions-right .btn {
        width: 100% !important;
        justify-content: center !important;
        padding: 8px 14px !important;
      }
      .filter-controls-row {
        flex-direction: column !important;
        align-items: stretch !important;
        gap: 14px !important;
        margin-top: 14px !important;
      }
      .current-working-range {
        width: 100% !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: stretch !important;
        gap: 8px !important;
      }
      .active-range-chip {
        width: 100% !important;
        box-sizing: border-box !important;
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        padding: 9px 12px !important;
        font-size: 12px !important;
        flex-wrap: wrap !important;
        gap: 6px !important;
      }
      .range-chip-label {
        display: inline-flex !important;
        align-items: center !important;
        gap: 6px !important;
      }
      .range-date-text {
        font-size: 12px !important;
      }
      .range-meta-actions {
        width: 100% !important;
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
      }
      .shifts-count-chip {
        flex: 1 !important;
        box-sizing: border-box !important;
        justify-content: center !important;
        padding: 7px 10px !important;
        font-size: 11.5px !important;
        gap: 6px !important;
      }
      .btn-reset-month {
        flex-shrink: 0 !important;
        box-sizing: border-box !important;
        justify-content: center !important;
        padding: 7px 12px !important;
        font-size: 11.5px !important;
        white-space: nowrap !important;
      }
      .custom-range-inputs {
        width: 100% !important;
        display: grid !important;
        grid-template-columns: 1fr 1fr !important;
        gap: 10px !important;
        align-items: stretch !important;
        box-sizing: border-box !important;
      }
      .range-sep {
        display: none !important;
      }
      .range-field {
        width: 100% !important;
        min-width: 0 !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: flex-start !important;
        gap: 4px !important;
        box-sizing: border-box !important;
      }
      .range-label {
        font-size: 11px !important;
        font-weight: 700 !important;
        color: #64748b !important;
        text-transform: uppercase !important;
        letter-spacing: 0.3px !important;
      }
      .range-field .form-control {
        width: 100% !important;
        min-width: 0 !important;
        box-sizing: border-box !important;
        padding: 7px 8px !important;
        font-size: 12px !important;
        height: 38px !important;
      }

      /* Pulse Card & Charts Mobile Optimization */
      .punctuality-pulse-card {
        padding: 16px !important;
        border-radius: 14px !important;
      }
      .pulse-header {
        flex-direction: column !important;
        align-items: stretch !important;
        gap: 10px !important;
      }
      .pulse-title-group {
        align-items: flex-start !important;
      }
      .pulse-legend {
        flex-wrap: wrap !important;
        gap: 8px !important;
      }
      .pulse-beads-row {
        gap: 6px !important;
        padding-bottom: 6px !important;
        overflow-x: auto !important;
      }
      .pulse-bead-item {
        min-width: 58px !important;
      }
      .analytics-charts-grid {
        grid-template-columns: 1fr !important;
        gap: 16px !important;
      }
      .chart-panel-card {
        padding: 16px !important;
        border-radius: 14px !important;
      }
      .chart-panel-header {
        flex-direction: column !important;
        align-items: flex-start !important;
        gap: 10px !important;
      }
      .chart-header-actions {
        width: 100% !important;
      }
      .btn-group-granularity {
        width: 100% !important;
        display: flex !important;
      }
      .btn-granularity {
        flex: 1 !important;
        text-align: center !important;
      }
      .donut-chips-row {
        display: grid !important;
        grid-template-columns: 1fr 1fr !important;
        gap: 8px !important;
      }
      .donut-chip {
        width: 100% !important;
        box-sizing: border-box !important;
      }

      /* Statement Filter Bar & Toolbar Mobile Layout */
      .table-toolbar {
        padding: 16px !important;
        flex-direction: column !important;
        align-items: stretch !important;
        gap: 12px !important;
      }
      .toolbar-left {
        width: 100% !important;
        display: flex !important;
        align-items: flex-start !important;
        gap: 10px !important;
      }
      .toolbar-right {
        width: 100% !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: stretch !important;
        gap: 8px !important;
      }
      .toolbar-actions-grid {
        display: grid !important;
        grid-template-columns: 1fr 1fr !important;
        gap: 8px !important;
        width: 100% !important;
        box-sizing: border-box !important;
      }
      .toolbar-action-btn {
        width: 100% !important;
        height: 38px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 6px !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        border-radius: 10px !important;
        box-sizing: border-box !important;
      }
      .toolbar-action-btn .material-symbols-outlined {
        font-size: 16px !important;
      }
      .count-badge {
        width: 100% !important;
        height: 34px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        text-align: center !important;
        box-sizing: border-box !important;
        border-radius: 8px !important;
        font-size: 12px !important;
        font-weight: 700 !important;
      }
      .statement-filters-bar {
        flex-direction: column !important;
        align-items: stretch !important;
        gap: 12px !important;
        padding: 14px 16px !important;
      }
      .table-filter-pills {
        display: grid !important;
        grid-template-columns: 1fr 1fr !important;
        gap: 8px !important;
        width: 100% !important;
        box-sizing: border-box !important;
      }
      .filter-pill-btn {
        width: 100% !important;
        height: 38px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        text-align: center !important;
        font-size: 11.5px !important;
        font-weight: 600 !important;
        border-radius: 10px !important;
        box-sizing: border-box !important;
        margin: 0 !important;
        white-space: nowrap !important;
      }
      .table-search-box {
        width: 100% !important;
        max-width: 100% !important;
        height: 42px !important;
        border-radius: 10px !important;
        box-sizing: border-box !important;
        padding: 0 12px !important;
      }
      .table-search-input {
        font-size: 12.5px !important;
      }
    }

    @media (max-width: 400px) {
      .metrics-grid {
        grid-template-columns: repeat(2, 1fr) !important;
        gap: 6px !important;
      }
      .metric-card {
        padding: 8px 10px !important;
        gap: 3px !important;
      }
      .metric-card .card-icon {
        width: 24px !important;
        height: 24px !important;
        min-width: 24px !important;
      }
      .metric-card .card-icon .material-symbols-outlined {
        font-size: 14px !important;
      }
      .metric-card .card-chip {
        font-size: 7.5px !important;
        padding: 1px 4px !important;
      }
      .metric-card .card-value {
        font-size: 13.5px !important;
      }
      .metric-card .card-label {
        font-size: 10px !important;
      }
      .metric-card .card-sub-info {
        font-size: 9px !important;
      }
      .range-meta-actions {
        flex-direction: column !important;
        align-items: stretch !important;
      }
      .btn-reset-month {
        width: 100% !important;
      }
      .custom-range-inputs {
        grid-template-columns: 1fr 1fr !important;
        gap: 6px !important;
      }
      .range-field .form-control {
        font-size: 11px !important;
        padding: 6px 4px !important;
      }
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
    :host-context(.dark-mode) .calendar-toolbar-card,
    :host-context(.dark-mode) .calendar-legend-bar,
    :host-context(.dark-mode) .calendar-board-card,
    :host-context(.dark-mode) .day-inspector-card,
    :host-context(.dark-mode) .rota-calendar-card,
    :host-context(.dark-mode) .metric-card,
    :host-context(.dark-mode) .card,
    :host-context(.dark-mode) .modal-card-custom,
    :host-context(.dark-mode) .analytics-filter-card,
    :host-context(.dark-mode) .chart-panel-card,
    :host-context(.dark-mode) .punctuality-pulse-card,
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
    :host-context(.dark-mode) .pulse-heading,
    :host-context(.dark-mode) .chart-panel-title,
    :host-context(.dark-mode) .center-percentage,
    :host-context(.dark-mode) .venue-item-name,
    :host-context(.dark-mode) .table-toolbar h3,
    :host-context(.dark-mode) .toolbar-left h3,
    :host-context(.dark-mode) .empty-state-card h3,
    :host-context(.dark-mode) .shift-venue-title,
    :host-context(.dark-mode) .table-header-simple h3,
    :host-context(.dark-mode) .statement-month-heading h4 {
      color: #f8fafc !important;
    }
    :host-context(.dark-mode) .empty-state-card p,
    :host-context(.dark-mode) .shift-venue-address,
    :host-context(.dark-mode) .card-header-simple .card-sub-text,
    :host-context(.dark-mode) .meta-label,
    :host-context(.dark-mode) .cell-date-hint {
      color: #94a3b8 !important;
    }
    :host-context(.dark-mode) .scroll-edge-glow.left {
      background: linear-gradient(90deg, #0b1329 0%, rgba(11,19,41,0) 100%) !important;
    }
    :host-context(.dark-mode) .scroll-edge-glow.right {
      background: linear-gradient(270deg, #0b1329 0%, rgba(11,19,41,0) 100%) !important;
    }
    :host-context(.dark-mode) .subnav-arrow-btn {
      background: #1e293b !important;
      border-color: #334155 !important;
      color: #cbd5e1 !important;
    }
    :host-context(.dark-mode) .subnav-arrow-btn:hover {
      background: #0050e5 !important;
      color: #ffffff !important;
    }
    :host-context(.dark-mode) .btn.btn-outline,
    :host-context(.dark-mode) .table-toolbar .btn.btn-outline {
      background: #0f172a !important;
      color: #f8fafc !important;
      border-color: #334155 !important;
    }
    :host-context(.dark-mode) .btn.btn-outline:hover {
      background: #1e293b !important;
      border-color: #60a5fa !important;
    }
    :host-context(.dark-mode) .empty-icon-circle {
      background: #0f172a !important;
      color: #60a5fa !important;
      border: 1px solid #334155 !important;
    }
    :host-context(.dark-mode) .shift-card {
      background: #0f172a !important;
      border-color: #334155 !important;
    }
    :host-context(.dark-mode) .shift-meta-box {
      background: #1e293b !important;
      border-color: #334155 !important;
    }
    :host-context(.dark-mode) .meta-val {
      color: #f8fafc !important;
    }
    :host-context(.dark-mode) .meta-val.val-rate {
      color: #34d399 !important;
    }
    :host-context(.dark-mode) .toggle-card {
      background: #0f172a !important;
      border-color: #334155 !important;
    }
    :host-context(.dark-mode) .toggle-title {
      color: #f8fafc !important;
    }
    :host-context(.dark-mode) .toggle-desc {
      color: #94a3b8 !important;
    }
    :host-context(.dark-mode) .form-control {
      background: #0f172a !important;
      border-color: #334155 !important;
      color: #f8fafc !important;
    }
    :host-context(.dark-mode) .form-label {
      color: #cbd5e1 !important;
    }
    :host-context(.dark-mode) .active-range-chip {
      background: rgba(0, 80, 229, 0.15);
      border-color: rgba(96, 165, 250, 0.35);
      color: #93c5fd;
    }
    :host-context(.dark-mode) .range-date-text {
      color: #f8fafc;
    }
    :host-context(.dark-mode) .shifts-count-chip {
      background: #0f172a;
      border-color: #334155;
      color: #cbd5e1;
    }
    :host-context(.dark-mode) .btn-reset-month {
      background: #1e293b;
      border-color: #334155;
      color: #60a5fa;
    }
    :host-context(.dark-mode) .btn-reset-month:hover {
      background: #0f172a;
      border-color: #60a5fa;
    }
    :host-context(.dark-mode) .donut-chip,
    :host-context(.dark-mode) .filter-pill-btn {
      background: #0f172a;
      border-color: #334155;
      color: #cbd5e1;
    }
    :host-context(.dark-mode) .btn-group-granularity {
      background: #0f172a;
      border-color: #334155;
    }
    :host-context(.dark-mode) .btn-granularity {
      color: #94a3b8;
    }
    :host-context(.dark-mode) .btn-granularity.active {
      background: #1e293b;
      color: #60a5fa;
    }
    :host-context(.dark-mode) .statement-filters-bar,
    :host-context(.dark-mode) .statement-summary-footer-row {
      background: #0f172a;
      border-color: #334155;
    }
    :host-context(.dark-mode) .count-badge {
      background: rgba(0, 80, 229, 0.2);
      border-color: rgba(96, 165, 250, 0.3);
      color: #93c5fd;
    }
    :host-context(.dark-mode) .table-search-box {
      background: #1e293b;
      border-color: #334155;
    }
    :host-context(.dark-mode) .table-search-input {
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
    :host-context(.dark-mode) .modal-footer-custom,
    :host-context(.dark-mode) .day-page-header,
    :host-context(.dark-mode) .day-page-footer {
      background: #0f172a;
      border-color: #334155;
    }
    :host-context(.dark-mode) .day-page-card,
    :host-context(.dark-mode) .day-shift-card,
    :host-context(.dark-mode) .day-leave-card {
      background: #1e293b;
      border-color: #334155;
    }
    :host-context(.dark-mode) .day-empty-box,
    :host-context(.dark-mode) .quick-excuse-form-card,
    :host-context(.dark-mode) .day-shift-meta-grid,
    :host-context(.dark-mode) .leave-reason-text {
      background: #0f172a;
      border-color: #334155;
    }
    :host-context(.dark-mode) .day-quick-actions {
      border-bottom-color: #334155;
    }
    :host-context(.dark-mode) .day-page-title-group h3,
    :host-context(.dark-mode) .day-shift-venue,
    :host-context(.dark-mode) .day-section-header h4,
    :host-context(.dark-mode) .form-title,
    :host-context(.dark-mode) .empty-title {
      color: #f8fafc;
    }
    :host-context(.dark-mode) .meta-item {
      color: #cbd5e1;
    }
    :host-context(.dark-mode) .cal-days-grid { background: #1e293b; }
    :host-context(.dark-mode) .cal-day-cell { border-color: #334155; }
    :host-context(.dark-mode) .cal-day-cell.other-month { background: #0f172a; }

    /* Monthly Calendar Cells in Dark Mode */
    :host-context(.dark-mode) .month-grid-header { background: #0f172a !important; border-bottom: 1px solid #334155 !important; }
    :host-context(.dark-mode) .weekday-col { color: #94a3b8 !important; border-right: 1px solid #334155 !important; }
    :host-context(.dark-mode) .month-day-cell { background: #1e293b !important; color: #f8fafc !important; border-right: 1px solid #334155 !important; border-bottom: 1px solid #334155 !important; }
    :host-context(.dark-mode) .month-day-cell:hover { box-shadow: inset 0 0 0 2px #60a5fa !important; }
    :host-context(.dark-mode) .month-day-cell.other-month { background: #0f172a !important; color: #64748b !important; opacity: 0.6 !important; }
    :host-context(.dark-mode) .month-day-cell.day-today { background: linear-gradient(180deg, #1e3a8a 0%, #1e293b 100%) !important; border: 2px solid #60a5fa !important; color: #f8fafc !important; }
    :host-context(.dark-mode) .month-day-cell.day-upcoming-shifts { background: linear-gradient(180deg, rgba(22, 163, 74, 0.25) 0%, #1e293b 100%) !important; border-color: #16a34a !important; color: #86efac !important; }
    :host-context(.dark-mode) .month-day-cell.day-past-shifts { background: #1e293b !important; border-color: #334155 !important; color: #94a3b8 !important; }

    /* Day Operations Inspector in Dark Mode */
    :host-context(.dark-mode) .day-inspector-card { background: #1e293b !important; border: 1.5px solid #334155 !important; color: #f8fafc !important; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35) !important; }
    :host-context(.dark-mode) .inspector-header { background: linear-gradient(90deg, #1e293b 0%, #0f172a 100%) !important; border-bottom: 1px solid #334155 !important; }
    :host-context(.dark-mode) .inspector-heading-row h3 { color: #f8fafc !important; }
    :host-context(.dark-mode) .inspector-sub { color: #94a3b8 !important; }
    :host-context(.dark-mode) .btn-close-circle { background: #0f172a !important; border-color: #334155 !important; color: #cbd5e1 !important; }
    :host-context(.dark-mode) .btn-close-circle:hover { background: #1e293b !important; color: #f8fafc !important; }
    :host-context(.dark-mode) .inspector-actions-strip { background: #0f172a !important; border-bottom: 1px solid #334155 !important; }
    :host-context(.dark-mode) .inspector-metrics-strip { background: #0f172a !important; border-bottom: 1px solid #334155 !important; }
    :host-context(.dark-mode) .insp-stat { background: #1e293b !important; border: 1px solid #334155 !important; }
    :host-context(.dark-mode) .insp-stat strong { color: #f8fafc !important; }
    :host-context(.dark-mode) .insp-stat span { color: #94a3b8 !important; }
    :host-context(.dark-mode) .inspector-section { background: #1e293b !important; border: 1px solid #334155 !important; }
    :host-context(.dark-mode) .sec-title h4 { color: #f8fafc !important; }
    :host-context(.dark-mode) .sec-empty { background: #0f172a !important; border: 1px solid #334155 !important; color: #94a3b8 !important; }
    :host-context(.dark-mode) .sec-empty strong { color: #f8fafc !important; }
    :host-context(.dark-mode) .dsc-venue { color: #f8fafc !important; }
    :host-context(.dark-mode) .dsc-time, :host-context(.dark-mode) .dsc-staff { color: #cbd5e1 !important; }

    /* Calendar Summary Footer in Dark Mode */
    :host-context(.dark-mode) .calendar-summary-footer { background: #0f172a !important; border: 1px solid #334155 !important; color: #94a3b8 !important; }
    :host-context(.dark-mode) .summary-item { color: #94a3b8 !important; }
    :host-context(.dark-mode) .summary-item strong { color: #f8fafc !important; }

    /* Emergency SOS and Duty Report Styles */
    .emergency-sos-trigger-btn {
      background: #dc2626 !important;
      color: #ffffff !important;
      border-color: #b91c1c !important;
      font-weight: 600 !important;
      box-shadow: 0 0 0 2px rgba(220, 38, 38, 0.2);
      transition: all 0.2s ease;
    }
    .emergency-sos-trigger-btn:hover {
      background: #b91c1c !important;
      box-shadow: 0 0 0 4px rgba(220, 38, 38, 0.35);
    }
    .pulse-icon {
      animation: pulse-sos 1.5s infinite;
    }
    @keyframes pulse-sos {
      0% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.18); opacity: 0.85; }
      100% { transform: scale(1); opacity: 1; }
    }
    .emergency-badge-pulse {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: #dc2626;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 0 4px rgba(220, 38, 38, 0.3);
      animation: pulse-sos 1.8s infinite;
    }
    .emergency-categories-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 10px;
      max-height: 220px;
      overflow-y: auto;
      padding: 4px;
    }
    .emergency-cat-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      cursor: pointer;
      background: #ffffff;
      transition: all 0.15s ease;
    }
    .emergency-cat-card:hover {
      border-color: #fca5a5;
      background: #fef2f2;
    }
    .emergency-cat-card.selected {
      border-color: #dc2626;
      background: #fef2f2;
      box-shadow: 0 0 0 2px rgba(220, 38, 38, 0.25);
    }
    .ecc-icon {
      font-size: 22px;
      flex-shrink: 0;
    }
    .ecc-info {
      flex: 1;
      min-width: 0;
    }
    .ecc-name {
      font-weight: 600;
      font-size: 13px;
      color: #0f172a;
    }
    .ecc-desc {
      font-size: 11px;
      color: #64748b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .ecc-severity {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      text-transform: uppercase;
    }
    .ecc-severity.critical {
      background: #fee2e2;
      color: #991b1b;
    }
    .ecc-severity.high {
      background: #ffedd5;
      color: #9a3412;
    }
  `]
})
export class WorkforceMyShiftsComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('subnavTabs') subnavTabsRef?: ElementRef<HTMLDivElement>;

  canScrollLeft = false;
  canScrollRight = true;

  // Shift Duty Report State
  showDutyReportModal = false;
  activeReportingShift: Shift | null = null;
  dutyReportContent = '';
  isSubmittingDutyReport = false;

  // Emergency SOS State
  showEmergencySosModal = false;
  activeSosShift: Shift | null = null;
  emergencyCategories: any[] = [];
  selectedSosCategory: any = null;
  sosDescription = '';
  sosLatitude: number | null = null;
  sosLongitude: number | null = null;
  isAcquiringGps = false;
  isTransmittingSos = false;

  shifts: Shift[] = [];
  openShifts: Shift[] = [];
  openShiftsCount = 0;
  private openShiftsSub?: Subscription;
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

  // --- CALENDAR & ROTA STATE (Google-Calendar-Style Multi-View) ---
  calendarMode: 'month' | 'week' | 'day' | 'year' = 'month';
  dayDisplayMode: 'grid' | 'list' = 'list';
  currentToday: Date = new Date();
  currentCalendarDate: Date = new Date();
  currentMonth: Date = new Date();
  selectedVenueId: string = '';

  monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  availableYears: number[] = [];
  timelineHours: number[] = Array.from({ length: 24 }, (_, i) => i);

  calendarDays: CalendarDayMetrics[] = [];
  currentWeekDays: CalendarDayMetrics[] = [];
  yearMonthsGrid: YearMonthGrid[] = [];
  selectedDay: CalendarDayMetrics | null = null;
  showDayDetailModal = false;
  isDayModalMaximized = false;
  showDayExcuseForm = false;
  dayExcuseDurationPreset = 'single';

  // --- ANALYTICS DASHBOARD STATE ---
  analyticsPreset: 'this_month' | 'this_week' | 'last_30_days' | 'last_month' | 'quarter' | 'custom' = 'this_month';
  analyticsStartDate: string = '';
  analyticsEndDate: string = '';
  chartGranularity: 'weekly' | 'daily' = 'weekly';
  statementFilter: 'all' | 'completed' | 'upcoming' | 'late' = 'all';
  statementSearch: string = '';

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
  docUploadMode: 'file' | 'url' = 'file';
  isUploadingDoc = false;
  uploadedDocFileName = '';

  // Reminders state
  reminderPrefs: any = {
    slot1MinutesBefore: 1440,
    slot2MinutesBefore: 240,
    slot3MinutesBefore: 30,
    enableSlot1: true,
    enableSlot2: true,
    enableSlot3: true,
    enableInApp: true,
    enableEmail: true,
    enableWhatsApp: true,
    preferredContactPhone: ''
  };

  private routeSub?: Subscription;

  constructor(
    private readonly workforceService: WorkforceService,
    private readonly toast: ToastService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly confirmDialog: ConfirmDialogService
  ) {
    const curYear = new Date().getFullYear();
    for (let y = curYear - 2; y <= curYear + 3; y++) {
      this.availableYears.push(y);
    }
  }

  ngOnInit(): void {
    this.resetDateRangeToCurrentMonth();

    // Real-time listener for open shifts count across workspace
    this.openShiftsSub = this.workforceService.openShiftsCount$.subscribe(count => {
      this.openShiftsCount = count;
    });
    this.workforceService.refreshOpenShiftsCount();

    this.workforceService.getTenantCurrency().subscribe({
      next: (res: any) => {
        if (res?.data?.currencySymbol) {
          this.currencySymbol = res.data.currencySymbol;
        }
      },
      error: () => { }
    });

    this.loadWorkforcePolicies();
    if (!this.shifts || this.shifts.length === 0) {
      this.loadMyShifts();
    }

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

    this.route.queryParams.subscribe(params => {
      const tab = params['tab'];
      if (tab && tab !== this.activeTab) {
        this.activeTab = tab;
      }
      const dateParam = params['date'];
      if (dateParam) {
        this.syncSelectedDayFromParam(dateParam);
      } else if (!dateParam && this.selectedDay) {
        this.selectedDay = null;
        this.showDayExcuseForm = false;
      }
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
      // Scroll strictly within the horizontal subnav container without triggering ancestor scrollIntoView
      const elRect = el.getBoundingClientRect();
      const btnRect = activeBtn.getBoundingClientRect();
      const offsetInEl = (btnRect.left - elRect.left) + el.scrollLeft;
      const targetScroll = offsetInEl - (el.clientWidth / 2) + (btnRect.width / 2);
      const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
      const boundedScroll = Math.max(0, Math.min(targetScroll, maxScroll));
      el.scrollTo({ left: boundedScroll, behavior: 'smooth' });
    }
    // Prevent document, shell, or window horizontal/vertical overshoot
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
      document.documentElement.scrollLeft = 0;
      document.body.scrollLeft = 0;
      const mainEl = document.getElementById('main-content');
      if (mainEl) {
        mainEl.scrollTop = 0;
        mainEl.scrollLeft = 0;
      }
      const pageShell = document.querySelector('.bcp-page-shell') as HTMLElement | null;
      if (pageShell) {
        pageShell.scrollLeft = 0;
      }
    }
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
    this.openShiftsSub?.unsubscribe();
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
    if (this.activeTab === 'shifts' && this.selectedDay) {
      const d = this.selectedDay.date;
      return new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d);
    }
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
    if (this.activeTab === 'shifts' && this.selectedDay) {
      const shiftCount = this.selectedDay.shifts?.length || 0;
      const leaveCount = this.selectedDay.leaves?.length || 0;
      return `${shiftCount} rostered shift(s), ${leaveCount} excuse/time-off record(s) on this date.`;
    }
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

  // --- CALENDAR & ROTA ENGINE (Google-Calendar-Style Multi-View) ---
  get currentPeriodHeading(): string {
    const y = this.currentCalendarDate.getFullYear();
    const m = this.monthNames[this.currentCalendarDate.getMonth()];
    if (this.calendarMode === 'year') {
      return `Year ${y}`;
    }
    if (this.calendarMode === 'day' && this.selectedDay) {
      return this.selectedDay.date.toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    }
    if (this.calendarMode === 'week' && this.currentWeekDays.length > 0) {
      const first = this.currentWeekDays[0].date;
      const last = this.currentWeekDays[6].date;
      return `${first.getDate()} ${this.monthNames[first.getMonth()].slice(0, 3)} – ${last.getDate()} ${this.monthNames[last.getMonth()].slice(0, 3)} ${y}`;
    }
    return `${m} ${y}`;
  }

  get distinctVenues(): { id: string; name: string }[] {
    const map = new Map<string, string>();
    for (const s of this.shifts) {
      const id = s.clientSiteId || (s as any).siteId || s.facilityName || s.siteName;
      const name = s.facilityName || s.siteName;
      if (id && name && !map.has(id)) {
        map.set(id, name);
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }

  setCalendarMode(mode: 'month' | 'week' | 'day' | 'year'): void {
    this.calendarMode = mode;
    this.rebuildAllCalendarViews();
  }

  goToToday(): void {
    this.currentToday = new Date();
    this.currentCalendarDate = new Date(this.currentToday);
    this.currentMonth = new Date(this.currentToday);
    this.rebuildAllCalendarViews();
    const todayCell = this.calendarDays.find(c => c.isToday);
    if (todayCell) {
      this.selectedDay = todayCell;
    }
  }

  navigatePeriod(delta: number): void {
    if (this.calendarMode === 'month') {
      this.currentCalendarDate = new Date(
        this.currentCalendarDate.getFullYear(),
        this.currentCalendarDate.getMonth() + delta,
        1
      );
      this.currentMonth = new Date(this.currentCalendarDate);
    } else if (this.calendarMode === 'week') {
      const next = new Date(this.currentCalendarDate);
      next.setDate(next.getDate() + delta * 7);
      this.currentCalendarDate = next;
      this.currentMonth = new Date(this.currentCalendarDate);
    } else if (this.calendarMode === 'day') {
      const base = this.selectedDay ? new Date(this.selectedDay.date) : new Date(this.currentCalendarDate);
      base.setDate(base.getDate() + delta);
      this.currentCalendarDate = base;
      this.currentMonth = new Date(this.currentCalendarDate);
    } else if (this.calendarMode === 'year') {
      this.currentCalendarDate = new Date(
        this.currentCalendarDate.getFullYear() + delta,
        this.currentCalendarDate.getMonth(),
        1
      );
      this.currentMonth = new Date(this.currentCalendarDate);
    }
    this.rebuildAllCalendarViews();
  }

  onSelectMonth(monthIndex: number): void {
    this.currentCalendarDate = new Date(this.currentCalendarDate.getFullYear(), Number(monthIndex), 1);
    this.currentMonth = new Date(this.currentCalendarDate);
    if (this.calendarMode === 'year') {
      this.calendarMode = 'month';
    }
    this.rebuildAllCalendarViews();
  }

  onSelectYear(year: number): void {
    this.currentCalendarDate = new Date(Number(year), this.currentCalendarDate.getMonth(), 1);
    this.currentMonth = new Date(this.currentCalendarDate);
    this.rebuildAllCalendarViews();
  }

  onDayCellClick(cell: CalendarDayMetrics): void {
    const clickedDate = cell.date;
    if (
      clickedDate.getMonth() !== this.currentCalendarDate.getMonth() ||
      clickedDate.getFullYear() !== this.currentCalendarDate.getFullYear()
    ) {
      this.currentCalendarDate = new Date(clickedDate.getFullYear(), clickedDate.getMonth(), clickedDate.getDate());
      this.currentMonth = new Date(this.currentCalendarDate);
      this.rebuildAllCalendarViews();
      const targetStr = this.formatDateForInput(clickedDate);
      this.selectedDay = this.calendarDays.find(c => c.dateStr === targetStr) || this.buildDayMetrics(clickedDate, true);
    } else {
      this.selectedDay = cell;
    }

    this.showDayDetailModal = false;
    this.showDayExcuseForm = false;
    const dateStr = this.formatDateForInput(this.selectedDay.date);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: 'shifts', date: dateStr },
      queryParamsHandling: 'merge'
    });
    this.scrollToDayBreakdown();
  }

  jumpToMonthFromYear(monthIndex: number): void {
    this.currentCalendarDate = new Date(this.currentCalendarDate.getFullYear(), monthIndex, 1);
    this.currentMonth = new Date(this.currentCalendarDate);
    this.calendarMode = 'month';
    this.rebuildAllCalendarViews();
  }

  jumpToDateFromYear(date: Date): void {
    this.currentCalendarDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    this.currentMonth = new Date(this.currentCalendarDate);
    this.calendarMode = 'month';
    this.rebuildAllCalendarViews();
    const targetStr = this.formatDateForInput(date);
    this.selectedDay = this.calendarDays.find(c => c.dateStr === targetStr) || null;
    this.scrollToDayBreakdown();
  }

  /**
   * Smoothly scrolls the inner page shell down to the Day Operations Breakdown panel upon day selection
   * without scrolling #main-content or hiding #topbar.
   */
  scrollToDayBreakdown(): void {
    setTimeout(() => {
      const el = document.getElementById('dayOperationsInspector') || document.querySelector('.day-inspector-card');
      const pageShell = document.querySelector('.bcp-page-shell') as HTMLElement | null;
      if (el && pageShell) {
        const shellRect = pageShell.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        const targetTop = pageShell.scrollTop + (elRect.top - shellRect.top) - 12;
        pageShell.scrollTo({ top: Math.max(0, targetTop), left: 0, behavior: 'smooth' });
      }
    }, 60);
  }

  rebuildAllCalendarViews(): void {
    this.buildMonthGrid();
    this.buildWeekGrid();
    if (this.calendarMode === 'year') {
      this.buildYearGrid();
    }

    if (this.selectedDay) {
      const targetStr = this.formatDateForInput(this.selectedDay.date);
      const match = this.calendarDays.find(c => c.dateStr === targetStr);
      this.selectedDay = match || this.buildDayMetrics(this.selectedDay.date, true);
    } else {
      const todayMatch = this.calendarDays.find(c => c.isToday);
      this.selectedDay = todayMatch || this.calendarDays.find(c => c.isCurrentMonth) || null;
    }
  }

  generateCalendar(): void {
    this.rebuildAllCalendarViews();

    const urlDate = this.route.snapshot.queryParams['date'];
    if (urlDate && !this.selectedDay) {
      this.syncSelectedDayFromParam(urlDate);
    }
  }

  private buildMonthGrid(): void {
    const year = this.currentCalendarDate.getFullYear();
    const month = this.currentCalendarDate.getMonth();
    const firstDayDow = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const cells: CalendarDayMetrics[] = [];

    for (let i = firstDayDow - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthDays - i);
      cells.push(this.buildDayMetrics(d, false));
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dObj = new Date(year, month, d);
      cells.push(this.buildDayMetrics(dObj, true));
    }

    const remaining = (7 - (cells.length % 7)) % 7;
    for (let t = 1; t <= remaining; t++) {
      const d = new Date(year, month + 1, t);
      cells.push(this.buildDayMetrics(d, false));
    }

    this.calendarDays = cells;
  }

  private buildWeekGrid(): void {
    const ref = this.selectedDay ? new Date(this.selectedDay.date) : new Date(this.currentCalendarDate);
    const dow = (ref.getDay() + 6) % 7;
    const monday = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() - dow);

    const week: CalendarDayMetrics[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
      week.push(this.buildDayMetrics(d, d.getMonth() === this.currentCalendarDate.getMonth()));
    }
    this.currentWeekDays = week;
  }

  private buildYearGrid(): void {
    const year = this.currentCalendarDate.getFullYear();
    const months: YearMonthGrid[] = [];

    for (let m = 0; m < 12; m++) {
      const firstDow = (new Date(year, m, 1).getDay() + 6) % 7;
      const daysCount = new Date(year, m + 1, 0).getDate();
      const prevCount = new Date(year, m, 0).getDate();
      const days: YearMonthGrid['days'] = [];

      for (let i = firstDow - 1; i >= 0; i--) {
        const d = new Date(year, m - 1, prevCount - i);
        const metrics = this.buildDayMetrics(d, false);
        days.push({
          date: d,
          dayNum: d.getDate(),
          isCurrentMonth: false,
          isToday: metrics.isToday,
          isPast: metrics.isPast,
          isFuture: metrics.isFuture,
          shiftsCount: metrics.shiftsCount,
          leaveCount: metrics.leaveCount
        });
      }

      for (let day = 1; day <= daysCount; day++) {
        const d = new Date(year, m, day);
        const metrics = this.buildDayMetrics(d, true);
        days.push({
          date: d,
          dayNum: day,
          isCurrentMonth: true,
          isToday: metrics.isToday,
          isPast: metrics.isPast,
          isFuture: metrics.isFuture,
          shiftsCount: metrics.shiftsCount,
          leaveCount: metrics.leaveCount
        });
      }

      months.push({
        monthIndex: m,
        monthName: this.monthNames[m],
        days
      });
    }

    this.yearMonthsGrid = months;
  }

  private buildDayMetrics(date: Date, isCurrentMonth: boolean): CalendarDayMetrics {
    const dateStr = this.formatDateForInput(date);
    const todayStr = this.formatDateForInput(this.currentToday);
    const isToday = dateStr === todayStr;
    const isPast = dateStr < todayStr;
    const isFuture = dateStr > todayStr;

    const dayShifts = this.shifts.filter(s => {
      if (this.selectedVenueId) {
        const venueMatch = (s.clientSiteId === this.selectedVenueId) ||
          ((s as any).siteId === this.selectedVenueId) ||
          ((s.facilityName || s.siteName) === this.selectedVenueId);
        if (!venueMatch) return false;
      }
      if (!s.startsAtUtc) return false;
      return s.startsAtUtc.slice(0, 10) === dateStr;
    });

    const dayLeaves = this.getLeavesForDate(date);
    const activeNowCount = dayShifts.filter(s =>
      (s.isClockedIn && !s.isClockedOut) || (s.status || '').toLowerCase() === 'inprogress'
    ).length;
    const openCount = dayShifts.filter(s => this.isOpenShift(s)).length;
    const doneCount = dayShifts.filter(s => this.isShiftDone(s)).length;

    return {
      date,
      dateStr,
      dayNum: date.getDate(),
      dayNumber: date.getDate(),
      isCurrentMonth,
      isToday,
      isPast,
      isFuture,
      shiftsCount: dayShifts.length,
      activeNowCount,
      openCount,
      leaveCount: dayLeaves.length,
      swapCount: dayShifts.filter(s => s.status === 'SwapOffered').length,
      doneCount,
      shifts: dayShifts,
      leaves: dayLeaves
    };
  }

  formatHourLabel(hour: number): string {
    return `${hour.toString().padStart(2, '0')}:00`;
  }

  getShiftsStartingInHour(day: CalendarDayMetrics, hour: number): Shift[] {
    return day.shifts.filter(s => {
      if (!s.startsAtUtc) return false;
      const d = new Date(s.startsAtUtc);
      return d.getHours() === hour;
    });
  }

  getActiveShiftsForDay(day: CalendarDayMetrics): Shift[] {
    return day.shifts.filter(s =>
      (s.isClockedIn && !s.isClockedOut) || (s.status || '').toLowerCase() === 'inprogress'
    );
  }

  isOpenShift(s: Shift): boolean {
    return !s.assignedUserId || s.status === 'Open';
  }

  isShiftDone(s: Shift): boolean {
    return s.isClockedOut || s.status === 'Completed';
  }

  // --- DUTY SHIFT STATE & DETAIL MODAL CONTROLS ---
  selectedDutyShift: Shift | null = null;
  showDutyDetailModal: boolean = false;

  openDutyDetailModal(s: Shift): void {
    this.selectedDutyShift = s;
    this.showDutyDetailModal = true;
  }

  closeDutyDetailModal(): void {
    this.showDutyDetailModal = false;
    this.selectedDutyShift = null;
  }

  isShiftActive(s: Shift | null | undefined): boolean {
    if (!s) return false;
    return !!(s.isClockedIn || s.status === 'InProgress' || s.status === 'Active');
  }

  isShiftCompleted(s: Shift | null | undefined): boolean {
    if (!s) return false;
    if (s.isClockedOut || s.status === 'Completed' || s.status === 'Done') return true;
    const end = new Date(s.endsAtUtc).getTime();
    return !isNaN(end) && end < Date.now() && !s.isClockedIn;
  }

  isShiftUpcoming(s: Shift | null | undefined): boolean {
    if (!s) return false;
    return !this.isShiftActive(s) && !this.isShiftCompleted(s);
  }

  isShiftToday(s: Shift | null | undefined): boolean {
    if (!s || !s.startsAtUtc) return false;
    const d = new Date(s.startsAtUtc);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }

  getNextShift(): Shift | null {
    if (!this.shifts || this.shifts.length === 0) return null;
    const now = Date.now();

    // 1. Check for active duty first
    const active = this.shifts.find(s => this.isShiftActive(s) && !s.isClockedOut);
    if (active) return active;

    // 2. Look for shifts starting today or in the future that are not completed/cancelled
    const candidates = this.shifts.filter(s => {
      if (this.isShiftCompleted(s)) return false;
      if (s.status === 'Cancelled' || s.status === 'Rejected') return false;
      const end = new Date(s.endsAtUtc).getTime();
      return isNaN(end) || end >= now;
    });

    if (candidates.length === 0) return null;

    // Sort ascending by startsAtUtc
    candidates.sort((a, b) => new Date(a.startsAtUtc).getTime() - new Date(b.startsAtUtc).getTime());
    return candidates[0];
  }

  calculateShiftsHours(shifts: Shift[]): number {
    if (!shifts || shifts.length === 0) return 0;
    const total = shifts.reduce((acc, s) => acc + (s.plannedDurationHours || 0), 0);
    return Math.round(total * 10) / 10;
  }

  syncSelectedDayFromParam(dateStr: string): void {
    if (!dateStr) return;
    const matched = this.calendarDays.find(d => d.dateStr === dateStr);
    if (matched) {
      this.selectedDay = matched;
    } else {
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        this.selectedDay = this.buildDayMetrics(parsed, parsed.getMonth() === this.currentCalendarDate.getMonth());
      }
    }
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

  onSelectDay(day: any): void {
    if (day && day.date) {
      this.onDayCellClick(day);
    }
  }

  closeDayDetailView(): void {
    this.selectedDay = null;
    this.showDayExcuseForm = false;
    this.showDayDetailModal = false;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { date: null },
      queryParamsHandling: 'merge'
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  isSelectedDay(day: { date: Date }): boolean {
    return !!this.selectedDay && this.selectedDay.date.toDateString() === day.date.toDateString();
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
  resetDateRangeToCurrentMonth(): void {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    this.analyticsStartDate = this.formatDateForInput(first);
    this.analyticsEndDate = this.formatDateForInput(last);
    this.analyticsPreset = 'this_month';
    this.recalculateAnalytics();
  }

  isCurrentMonthSelected(): boolean {
    if (!this.analyticsStartDate || !this.analyticsEndDate) return false;
    const now = new Date();
    const first = this.formatDateForInput(new Date(now.getFullYear(), now.getMonth(), 1));
    const last = this.formatDateForInput(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    return this.analyticsStartDate === first && this.analyticsEndDate === last;
  }

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

  setChartGranularity(g: 'weekly' | 'daily'): void {
    this.chartGranularity = g;
    this.renderHoursBarChart();
  }

  get analyticsUpcomingHours(): number {
    const now = new Date();
    return this.filteredAnalyticsShifts
      .filter(s => s.startsAtUtc && new Date(s.startsAtUtc) > now)
      .reduce((acc, s) => acc + (s.plannedDurationHours || 0), 0);
  }

  get analyticsUpcomingRatio(): number {
    const total = this.analyticsPlannedHours || 1;
    return Math.round((this.analyticsUpcomingHours / total) * 100);
  }

  get analyticsExcusedRatio(): number {
    const total = this.analyticsPlannedHours || 1;
    return Math.round((this.calculateLeaveHoursInRange() / total) * 100);
  }

  get analyticsPastPlannedHours(): number {
    const now = new Date();
    return this.filteredAnalyticsShifts
      .filter(s => !s.startsAtUtc || new Date(s.startsAtUtc) <= now)
      .reduce((acc, s) => acc + (s.plannedDurationHours || 0), 0);
  }

  get analyticsShortfallHours(): number {
    const shortfall = Math.max(0, this.analyticsPastPlannedHours - this.analyticsClockedHours);
    return Math.round(shortfall * 10) / 10;
  }

  get analyticsShortfallRatio(): number {
    const total = this.analyticsPlannedHours || 1;
    return Math.round((this.analyticsShortfallHours / total) * 100);
  }

  get recentClockInBeads(): any[] {
    const now = new Date();
    const pastShifts = this.filteredAnalyticsShifts
      .filter(s => s.status === 'Completed' || (s.endsAtUtc && new Date(s.endsAtUtc) < now))
      .sort((a, b) => new Date(b.startsAtUtc).getTime() - new Date(a.startsAtUtc).getTime())
      .slice(0, 10);

    return pastShifts.map(s => {
      const ts = this.timesheetList.find(t => t.id === s.id || t.shiftCode === s.shiftCode);
      const isLate = this.isShiftLate(s);
      let diffMinutes = 0;

      if (ts?.lateMinutes) {
        diffMinutes = ts.lateMinutes;
      } else if (ts?.clockInUtc && s.startsAtUtc) {
        diffMinutes = Math.round((new Date(ts.clockInUtc).getTime() - new Date(s.startsAtUtc).getTime()) / 60000);
      }

      let statusClass = 'bead-green';
      let icon = 'check_circle';
      let timeDiffLabel = 'On-Time';

      if (diffMinutes > 5 || isLate) {
        statusClass = 'bead-red';
        icon = 'warning';
        timeDiffLabel = diffMinutes > 0 ? `+${diffMinutes}m late` : 'Late Arrival';
      } else if (diffMinutes > 0) {
        statusClass = 'bead-amber';
        icon = 'schedule';
        timeDiffLabel = `+${diffMinutes}m grace`;
      } else if (diffMinutes < 0) {
        timeDiffLabel = `${Math.abs(diffMinutes)}m early`;
      }

      const d = new Date(s.startsAtUtc);
      const dateLabel = `${d.getDate()} ${d.toLocaleString('en', { month: 'short' })}`;
      const venueName = s.facilityName || s.siteName || 'Operating Site';
      const tooltip = `${s.shiftCode} (${venueName}): ${timeDiffLabel} • Scheduled ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

      return {
        shiftCode: s.shiftCode,
        dateLabel,
        timeDiffLabel,
        statusClass,
        icon,
        tooltip
      };
    });
  }

  get venueDistribution(): { name: string; hours: number; gross: number; percentage: number; shiftCount: number; effectiveRate: number; isPrimary: boolean }[] {
    const map = new Map<string, { hours: number; gross: number; count: number }>();
    const totalHours = this.analyticsPlannedHours || 1;

    for (const s of this.filteredAnalyticsShifts) {
      const v = s.facilityName || s.siteName || 'General Operating Venue';
      const prev = map.get(v) || { hours: 0, gross: 0, count: 0 };
      const h = s.plannedDurationHours || 0;
      const g = h * (s.hourlyPayRate || 10);
      map.set(v, { hours: prev.hours + h, gross: prev.gross + g, count: prev.count + 1 });
    }

    const list: { name: string; hours: number; gross: number; percentage: number; shiftCount: number; effectiveRate: number; isPrimary: boolean }[] = [];
    map.forEach((val, key) => {
      const hours = Math.round(val.hours * 10) / 10;
      const gross = Math.round(val.gross * 100) / 100;
      const effectiveRate = hours > 0 ? Math.round((gross / hours) * 100) / 100 : 0;
      list.push({
        name: key,
        hours,
        gross,
        shiftCount: val.count,
        effectiveRate,
        percentage: Math.min(100, Math.round((val.hours / totalHours) * 100)),
        isPrimary: false
      });
    });

    list.sort((a, b) => b.hours - a.hours);
    if (list.length > 0) {
      list[0].isPrimary = true;
    }
    return list;
  }

  isPastDate(d: string | Date | undefined): boolean {
    if (!d) return false;
    return new Date(d).getTime() < Date.now();
  }

  getShiftClockTimes(s: Shift): { inTime: string; outTime: string } | null {
    const ts = this.timesheetList.find(t => t.id === s.id || t.shiftCode === s.shiftCode);
    if (ts?.clockInUtc) {
      const inTime = new Date(ts.clockInUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const outTime = ts.clockOutUtc ? new Date(ts.clockOutUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
      return { inTime, outTime };
    }
    if (s.status === 'Completed' && s.startsAtUtc) {
      const inTime = new Date(s.startsAtUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const outTime = s.endsAtUtc ? new Date(s.endsAtUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
      return { inTime, outTime };
    }
    return null;
  }

  get statementCompletedCount(): number {
    const now = new Date();
    return this.filteredAnalyticsShifts.filter(s => s.status === 'Completed' || (s.endsAtUtc && new Date(s.endsAtUtc) < now)).length;
  }

  get statementUpcomingCount(): number {
    const now = new Date();
    return this.filteredAnalyticsShifts.filter(s => s.startsAtUtc && new Date(s.startsAtUtc) > now).length;
  }

  // Table Sort States (Default: Latest First)
  stmtSortCol = 'startsAtUtc';
  stmtSortDir: 'asc' | 'desc' = 'desc';
  tsSortCol = 'startsAtUtc';
  tsSortDir: 'asc' | 'desc' = 'desc';
  leaveSortCol = 'startDate';
  leaveSortDir: 'asc' | 'desc' = 'desc';
  docSortCol = 'createdUtc';
  docSortDir: 'asc' | 'desc' = 'desc';
  availSortCol = 'targetDate';
  availSortDir: 'asc' | 'desc' = 'desc';

  toggleStmtSort(col: string): void {
    if (this.stmtSortCol === col) {
      this.stmtSortDir = this.stmtSortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.stmtSortCol = col;
      this.stmtSortDir = ['startsAtUtc', 'plannedDurationHours', 'earnings'].includes(col) ? 'desc' : 'asc';
    }
  }

  toggleTsSort(col: string): void {
    if (this.tsSortCol === col) {
      this.tsSortDir = this.tsSortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.tsSortCol = col;
      this.tsSortDir = ['startsAtUtc', 'clockInUtc', 'duration', 'hourlyPayRate', 'fineAmount', 'netPay'].includes(col) ? 'desc' : 'asc';
    }
  }

  toggleLeaveSort(col: string): void {
    if (this.leaveSortCol === col) {
      this.leaveSortDir = this.leaveSortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.leaveSortCol = col;
      this.leaveSortDir = ['startDate', 'totalDays'].includes(col) ? 'desc' : 'asc';
    }
  }

  toggleDocSort(col: string): void {
    if (this.docSortCol === col) {
      this.docSortDir = this.docSortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.docSortCol = col;
      this.docSortDir = ['createdUtc', 'expiryDateUtc'].includes(col) ? 'desc' : 'asc';
    }
  }

  toggleAvailSort(col: string): void {
    if (this.availSortCol === col) {
      this.availSortDir = this.availSortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.availSortCol = col;
      this.availSortDir = col === 'targetDate' ? 'desc' : 'asc';
    }
  }

  getSortIcon(activeCol: string, dir: 'asc' | 'desc', col: string): string {
    if (activeCol !== col) return 'unfold_more';
    return dir === 'asc' ? 'arrow_upward' : 'arrow_downward';
  }

  get sortedTimesheetList(): any[] {
    const mult = this.tsSortDir === 'asc' ? 1 : -1;
    return [...this.timesheetList].sort((a: any, b: any) => {
      if (this.tsSortCol === 'startsAtUtc' || this.tsSortCol === 'clockInUtc') {
        const tA = a[this.tsSortCol] ? new Date(a[this.tsSortCol]).getTime() : 0;
        const tB = b[this.tsSortCol] ? new Date(b[this.tsSortCol]).getTime() : 0;
        return (tA - tB) * mult;
      }
      if (this.tsSortCol === 'duration') {
        return ((Number(a.actualDurationHours || a.plannedDurationHours) || 0) - (Number(b.actualDurationHours || b.plannedDurationHours) || 0)) * mult;
      }
      if (this.tsSortCol === 'hourlyPayRate') {
        return ((Number(a.hourlyPayRate) || 0) - (Number(b.hourlyPayRate) || 0)) * mult;
      }
      if (this.tsSortCol === 'fineAmount') {
        return ((Number(a.fineAmount) || 0) - (Number(b.fineAmount) || 0)) * mult;
      }
      if (this.tsSortCol === 'netPay') {
        return (this.getShiftNetPay(a) - this.getShiftNetPay(b)) * mult;
      }
      const sA = String(a[this.tsSortCol] || '').toLowerCase();
      const sB = String(b[this.tsSortCol] || '').toLowerCase();
      return sA.localeCompare(sB, undefined, { numeric: true }) * mult;
    });
  }

  get sortedLeaveList(): any[] {
    const mult = this.leaveSortDir === 'asc' ? 1 : -1;
    return [...this.leaveList].sort((a: any, b: any) => {
      if (this.leaveSortCol === 'startDate') {
        const tA = a.startDate ? new Date(a.startDate).getTime() : 0;
        const tB = b.startDate ? new Date(b.startDate).getTime() : 0;
        return (tA - tB) * mult;
      }
      if (this.leaveSortCol === 'totalDays') {
        return ((Number(a.totalDays) || 0) - (Number(b.totalDays) || 0)) * mult;
      }
      const sA = String(a[this.leaveSortCol] || '').toLowerCase();
      const sB = String(b[this.leaveSortCol] || '').toLowerCase();
      return sA.localeCompare(sB, undefined, { numeric: true }) * mult;
    });
  }

  get sortedDocList(): any[] {
    const mult = this.docSortDir === 'asc' ? 1 : -1;
    return [...this.docList].sort((a: any, b: any) => {
      if (this.docSortCol === 'createdUtc' || this.docSortCol === 'expiryDateUtc') {
        const tA = a[this.docSortCol] ? new Date(a[this.docSortCol]).getTime() : 0;
        const tB = b[this.docSortCol] ? new Date(b[this.docSortCol]).getTime() : 0;
        return (tA - tB) * mult;
      }
      const sA = String(a[this.docSortCol] || '').toLowerCase();
      const sB = String(b[this.docSortCol] || '').toLowerCase();
      return sA.localeCompare(sB, undefined, { numeric: true }) * mult;
    });
  }

  get sortedAvailList(): any[] {
    const mult = this.availSortDir === 'asc' ? 1 : -1;
    return [...this.availList].sort((a: any, b: any) => {
      if (this.availSortCol === 'targetDate') {
        const tA = a.targetDate ? new Date(a.targetDate).getTime() : 0;
        const tB = b.targetDate ? new Date(b.targetDate).getTime() : 0;
        return (tA - tB) * mult;
      }
      const sA = String(a[this.availSortCol] || '').toLowerCase();
      const sB = String(b[this.availSortCol] || '').toLowerCase();
      return sA.localeCompare(sB, undefined, { numeric: true }) * mult;
    });
  }

  get displayedStatementShifts(): Shift[] {
    const now = new Date();
    let list = this.filteredAnalyticsShifts;

    // Filter by status pill
    if (this.statementFilter === 'completed') {
      list = list.filter(s => s.status === 'Completed' || (s.endsAtUtc && new Date(s.endsAtUtc) < now));
    } else if (this.statementFilter === 'upcoming') {
      list = list.filter(s => s.startsAtUtc && new Date(s.startsAtUtc) > now);
    } else if (this.statementFilter === 'late') {
      list = list.filter(s => this.isShiftLate(s));
    }

    // Filter by search query
    if (this.statementSearch && this.statementSearch.trim()) {
      const q = this.statementSearch.trim().toLowerCase();
      list = list.filter(s =>
        (s.shiftCode && s.shiftCode.toLowerCase().includes(q)) ||
        (s.facilityName && s.facilityName.toLowerCase().includes(q)) ||
        (s.siteName && s.siteName.toLowerCase().includes(q)) ||
        (s.postName && s.postName.toLowerCase().includes(q)) ||
        (s.address && s.address.toLowerCase().includes(q)) ||
        (s.siteAddress && s.siteAddress.toLowerCase().includes(q))
      );
    }

    const mult = this.stmtSortDir === 'asc' ? 1 : -1;
    return [...list].sort((a: any, b: any) => {
      if (this.stmtSortCol === 'startsAtUtc') {
        const tA = a.startsAtUtc ? new Date(a.startsAtUtc).getTime() : 0;
        const tB = b.startsAtUtc ? new Date(b.startsAtUtc).getTime() : 0;
        return (tA - tB) * mult;
      }
      if (this.stmtSortCol === 'plannedDurationHours') {
        return ((Number(a.plannedDurationHours) || 0) - (Number(b.plannedDurationHours) || 0)) * mult;
      }
      if (this.stmtSortCol === 'earnings') {
        const eA = (Number(a.plannedDurationHours) || 0) * (Number(a.hourlyPayRate) || 10);
        const eB = (Number(b.plannedDurationHours) || 0) * (Number(b.hourlyPayRate) || 10);
        return (eA - eB) * mult;
      }
      if (this.stmtSortCol === 'punctuality') {
        return ((this.isShiftLate(a) ? 1 : 0) - (this.isShiftLate(b) ? 1 : 0)) * mult;
      }
      if (this.stmtSortCol === 'siteName') {
        const sA = String(a.facilityName || a.siteName || '').toLowerCase();
        const sB = String(b.facilityName || b.siteName || '').toLowerCase();
        return sA.localeCompare(sB, undefined, { numeric: true }) * mult;
      }
      const sA = String(a[this.stmtSortCol] || '').toLowerCase();
      const sB = String(b[this.stmtSortCol] || '').toLowerCase();
      return sA.localeCompare(sB, undefined, { numeric: true }) * mult;
    });
  }

  get statementTotalClockedHours(): number {
    return this.displayedStatementShifts.reduce((acc, s) => {
      const ts = this.timesheetList.find(t => t.id === s.id || t.shiftCode === s.shiftCode);
      const hrs = ts?.actualDurationHours || s.plannedDurationHours || 0;
      return acc + (s.status === 'Completed' || (s.endsAtUtc && new Date(s.endsAtUtc) < new Date()) ? hrs : (s.plannedDurationHours || 0));
    }, 0);
  }

  get statementTotalGross(): number {
    return this.displayedStatementShifts.reduce((acc, s) => {
      return acc + ((s.plannedDurationHours || 0) * (s.hourlyPayRate || 10));
    }, 0);
  }

  exportDutyStatementCsv(): void {
    const shifts = this.displayedStatementShifts;
    if (shifts.length === 0) {
      this.toast.warning('Export Statement', 'No shift records available to export.');
      return;
    }

    const headers = [
      'Shift Code',
      'Post Name',
      'Venue Name',
      'Address',
      'Duty Date',
      'Scheduled Start',
      'Scheduled End',
      'Duration (Hours)',
      'Verified Clock In',
      'Verified Clock Out',
      'Punctuality Status',
      'Shift Status',
      'Hourly Rate',
      'Gross Pay'
    ];

    const rows = shifts.map(s => {
      const ct = this.getShiftClockTimes(s);
      const isLate = this.isShiftLate(s);
      const punctuality = isLate ? 'Late Arrival' : (s.status === 'Completed' || this.isPastDate(s.endsAtUtc) ? 'On-Time' : 'Scheduled');
      const gross = ((s.plannedDurationHours || 0) * (s.hourlyPayRate || 10)).toFixed(2);
      const venue = (s.facilityName || s.siteName || '').replace(/"/g, '""');
      const addr = (s.address || s.siteAddress || '').replace(/"/g, '""');
      const post = (s.postName || '').replace(/"/g, '""');

      return [
        `"${s.shiftCode}"`,
        `"${post}"`,
        `"${venue}"`,
        `"${addr}"`,
        `"${s.startsAtUtc ? s.startsAtUtc.slice(0, 10) : ''}"`,
        `"${s.startsAtUtc ? new Date(s.startsAtUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}"`,
        `"${s.endsAtUtc ? new Date(s.endsAtUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}"`,
        `"${s.plannedDurationHours || 0}"`,
        `"${ct?.inTime || ''}"`,
        `"${ct?.outTime || ''}"`,
        `"${punctuality}"`,
        `"${s.status}"`,
        `"${s.hourlyPayRate || 10}"`,
        `"${gross}"`
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Duty_Statement_${this.analyticsStartDate}_to_${this.analyticsEndDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    this.toast.success('Export Statement', `Duty statement CSV exported successfully (${shifts.length} records).`);
  }

  printDutyStatement(): void {
    window.print();
  }

  openDayDetailForShift(s: Shift): void {
    const shiftDate = s.startsAtUtc ? new Date(s.startsAtUtc) : new Date();
    const today = new Date();
    const isToday = shiftDate.toDateString() === today.toDateString();
    const dayShifts = this.shifts.filter(item => {
      if (!item.startsAtUtc) return false;
      return new Date(item.startsAtUtc).toDateString() === shiftDate.toDateString();
    });
    const dayLeaves = this.leaveList.filter(l => {
      if (!l.startDate) return false;
      const sT = new Date(l.startDate).getTime();
      const eT = l.endDate ? new Date(l.endDate).getTime() : sT;
      const t = shiftDate.getTime();
      return t >= sT && t <= eT;
    });

    this.selectedDay = this.buildDayMetrics(shiftDate, true);
    if (dayShifts.length === 0) {
      this.selectedDay.shifts = [s];
      this.selectedDay.shiftsCount = 1;
    }
    this.showDayDetailModal = false;
    this.showDayExcuseForm = false;
    this.activeTab = 'shifts';
    const dateStr = this.formatDateForInput(shiftDate);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: 'shifts', date: dateStr },
      queryParamsHandling: 'merge'
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  getGraceArrivalStatus(s: Shift): boolean {
    const ts = this.timesheetList.find(t => t.id === s.id || t.shiftCode === s.shiftCode);
    let diff = 0;
    if (ts?.lateMinutes) {
      diff = ts.lateMinutes;
    } else if (ts?.clockInUtc && s.startsAtUtc) {
      diff = (new Date(ts.clockInUtc).getTime() - new Date(s.startsAtUtc).getTime()) / 60000;
    }
    return diff > 0 && diff <= 5;
  }

  getLateMinutes(s: Shift): number {
    const ts = this.timesheetList.find(t => t.id === s.id || t.shiftCode === s.shiftCode);
    if (ts?.lateMinutes) return ts.lateMinutes;
    if (ts?.clockInUtc && s.startsAtUtc) {
      const diff = Math.round((new Date(ts.clockInUtc).getTime() - new Date(s.startsAtUtc).getTime()) / 60000);
      return Math.max(0, diff);
    }
    return 10;
  }

  getActualClockSubtext(s: Shift): string {
    const isLate = this.isShiftLate(s);
    if (isLate) {
      const m = this.getLateMinutes(s);
      return `(+${m}m late arrival)`;
    }
    if (this.getGraceArrivalStatus(s)) {
      const m = this.getLateMinutes(s);
      return `(+${m}m grace arrival)`;
    }
    if (s.status === 'Completed' || (s.endsAtUtc && this.isPastDate(s.endsAtUtc))) {
      return `(On-Time • ${s.plannedDurationHours || 8}h)`;
    }
    return `(${s.plannedDurationHours || 8}h planned)`;
  }

  calculateChartBuckets(): { labels: string[]; plannedHours: number[]; actualHours: number[] } {
    const shifts = this.filteredAnalyticsShifts;
    if (!this.analyticsStartDate || !this.analyticsEndDate) {
      return { labels: ['Current Window'], plannedHours: [0], actualHours: [0] };
    }

    const start = new Date(this.analyticsStartDate);
    const end = new Date(this.analyticsEndDate);
    const diffDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

    if (this.chartGranularity === 'daily' || diffDays <= 10) {
      const labels: string[] = [];
      const plannedHours: number[] = [];
      const actualHours: number[] = [];

      const maxDays = Math.min(31, diffDays);
      for (let i = 0; i < maxDays; i++) {
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

      const totalWeeks = Math.min(8, Math.max(1, Math.ceil(diffDays / 7)));
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
    const upcoming = this.analyticsUpcomingHours;
    const leaveHours = this.calculateLeaveHoursInRange();
    const shortfall = this.analyticsShortfallHours;

    const labels: string[] = ['Delivered Hours', 'Upcoming Shifts', 'Approved Leave / Excused'];
    const data: number[] = [clocked || 0, upcoming || 0, leaveHours || 0];
    const bgColors: string[] = ['#0050e5', '#38bdf8', '#f59e0b'];

    if (shortfall > 0) {
      labels.push('Unfulfilled Shortfall');
      data.push(shortfall);
      bgColors.push('#f87171');
    }

    const allZero = data.every(v => v === 0);

    this.hoursDonutChart = new Chart(this.hoursDonutChartCanvasRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels: allZero ? ['No Duty Hours Recorded'] : labels,
        datasets: [{
          data: allZero ? [1] : data,
          backgroundColor: allZero ? ['#e2e8f0'] : bgColors,
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
            display: false // Using rich interactive metric legend chips below canvas
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

  /**
   * Filters shifts strictly belonging to the currently selected calendar period (Month / Week / Day / Year).
   */
  get periodShifts(): Shift[] {
    if (!this.shifts || this.shifts.length === 0) return [];
    const calDate = this.currentCalendarDate || new Date();

    if (this.calendarMode === 'day') {
      const targetDate = this.selectedDay ? this.selectedDay.date : calDate;
      const targetStr = this.formatDateForInput(targetDate);
      return this.shifts.filter(s => {
        const sDate = this.formatDateForInput(new Date(s.startsAtUtc));
        return sDate === targetStr;
      });
    }

    if (this.calendarMode === 'week') {
      const startOfWeek = new Date(calDate);
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
      startOfWeek.setDate(diff);
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      return this.shifts.filter(s => {
        const sTime = new Date(s.startsAtUtc).getTime();
        return sTime >= startOfWeek.getTime() && sTime <= endOfWeek.getTime();
      });
    }

    if (this.calendarMode === 'year') {
      const year = calDate.getFullYear();
      return this.shifts.filter(s => new Date(s.startsAtUtc).getFullYear() === year);
    }

    // Default: 'month'
    const month = calDate.getMonth();
    const year = calDate.getFullYear();
    return this.shifts.filter(s => {
      const d = new Date(s.startsAtUtc);
      return d.getMonth() === month && d.getFullYear() === year;
    });
  }

  get periodLabel(): string {
    const calDate = this.currentCalendarDate || new Date();
    if (this.calendarMode === 'day') {
      const targetDate = this.selectedDay ? this.selectedDay.date : calDate;
      return targetDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    }
    if (this.calendarMode === 'week') return 'This Week';
    if (this.calendarMode === 'year') return calDate.getFullYear().toString();
    return calDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  }

  get periodPlannedHours(): number {
    return this.periodShifts.reduce((acc, s) => acc + (s.plannedDurationHours || 0), 0);
  }

  get periodGrossPay(): number {
    return this.periodShifts.reduce((acc, s) => acc + ((s.plannedDurationHours || 0) * (s.hourlyPayRate || 10.0)), 0);
  }

  staffEarningsDisplayMode: string = 'GrossOnly';
  estimatedTaxWithholdingPercent: number = 0.0;
  paydayFrequency: string = 'Weekly';
  paydaySpecificDay: string = 'Friday';

  get earningsCardTitle(): string {
    if (this.staffEarningsDisplayMode === 'EstimatedNet') return 'ESTIMATED TAKE-HOME PAY';
    if (this.staffEarningsDisplayMode === 'Both') return 'ESTIMATED GROSS & NET PAY';
    return 'ESTIMATED GROSS PAY';
  }

  get earningsCardChip(): string {
    if (this.staffEarningsDisplayMode === 'EstimatedNet') return 'After Tax (Net)';
    if (this.staffEarningsDisplayMode === 'Both') return 'Dual Gross/Net';
    return 'Pre-Tax (Gross)';
  }

  get earningsCardLabel(): string {
    if (this.staffEarningsDisplayMode === 'EstimatedNet') return 'Take-Home Pay';
    return 'Gross Earnings';
  }

  get effectiveEarningsAmount(): number {
    if (this.staffEarningsDisplayMode === 'EstimatedNet') {
      const withholdingFactor = Math.max(0, 1 - ((this.estimatedTaxWithholdingPercent || 0) / 100));
      return Math.round(this.periodGrossPay * withholdingFactor * 100) / 100;
    }
    return this.periodGrossPay;
  }

  get earningsCardSubInfo(): string {
    if (this.staffEarningsDisplayMode === 'EstimatedNet') {
      return `Gross: ${this.currencySymbol}${this.periodGrossPay.toFixed(2)} (${this.periodPlannedHours}h) • ~${this.estimatedTaxWithholdingPercent || 0}% Est. Withholding`;
    }
    if (this.staffEarningsDisplayMode === 'Both') {
      const net = Math.round(this.periodGrossPay * Math.max(0, 1 - ((this.estimatedTaxWithholdingPercent || 0) / 100)) * 100) / 100;
      return `${this.periodPlannedHours}h planned • Est. Net: ${this.currencySymbol}${net.toFixed(2)} (~${this.estimatedTaxWithholdingPercent || 0}% tax)`;
    }
    return `${this.periodPlannedHours}h across rostered shifts • Pre-tax gross pay`;
  }

  get paydayFrequencyLabel(): string {
    return this.paydayFrequency || 'Weekly';
  }

  get periodTakeHomePay(): number {
    const factor = Math.max(0, 1 - ((this.estimatedTaxWithholdingPercent || 0) / 100));
    return Math.round(this.periodGrossPay * factor * 100) / 100;
  }

  get completedDuties(): Shift[] {
    if (!this.shifts) return [];
    return this.shifts.filter(s => s.status === 'Completed' || s.isClockedOut || (s.attendanceRecord && !!s.attendanceRecord.clockOutUtc));
  }

  get completedDutiesCount(): number {
    return this.completedDuties.length;
  }

  get onTimeDutiesCount(): number {
    return this.completedDuties.filter(s => !this.isShiftLate(s) && (!s.attendanceRecord || !s.attendanceRecord.isFlagged)).length;
  }

  get punctualityScore(): number {
    if (this.completedDutiesCount === 0) return 0;
    return Math.round((this.onTimeDutiesCount / this.completedDutiesCount) * 100);
  }

  get nextPaydayDate(): Date {
    const today = new Date();
    const targetDayName = (this.paydaySpecificDay || 'Friday').toLowerCase();
    const dayMap: { [key: string]: number } = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6
    };
    const targetDayIndex = dayMap[targetDayName] !== undefined ? dayMap[targetDayName] : 5;

    const currentDay = today.getDay();
    let diff = (targetDayIndex - currentDay + 7) % 7;
    if (diff === 0) diff = 7;

    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() + diff);
    return nextDate;
  }

  get daysUntilPayday(): number {
    const today = new Date();
    const payday = this.nextPaydayDate;
    const diffTime = payday.getTime() - today.getTime();
    return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }

  loadWorkforcePolicies(): void {
    this.workforceService.getWorkforcePolicies().subscribe({
      next: (res: any) => {
        if (res?.data) {
          this.staffEarningsDisplayMode = res.data.staffEarningsDisplayMode || 'GrossOnly';
          this.estimatedTaxWithholdingPercent = res.data.estimatedTaxWithholdingPercent ?? 0.0;
          this.paydayFrequency = res.data.paydayFrequency || 'Weekly';
          this.paydaySpecificDay = res.data.paydaySpecificDay || 'Friday';
        }
      },
      error: () => {}
    });
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

  /**
   * Declines an offered (non-mandatory) shift after custom-modal confirmation.
   * The shift returns to the open pool and the admin is notified.
   */
  async declineShiftOffer(shift: Shift): Promise<void> {
    const ok = await this.confirmDialog.confirm({
      title: 'Decline this shift?',
      message: `Shift ${shift.shiftCode} will be returned to the open pool and the administrator will be notified.`,
      confirmText: 'Decline Shift',
      danger: true
    });
    if (!ok) return;

    this.isActionLoading = true;
    this.workforceService.declineShift(shift.id).subscribe({
      next: (res) => {
        this.isActionLoading = false;
        this.toast.success(res?.message || 'Shift declined.');
        this.loadActiveTabData();
      },
      error: (err) => {
        this.isActionLoading = false;
        this.toast.error(err?.error?.message || 'Failed to decline shift.');
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
          this.openShiftsCount = res.data.length;
          this.workforceService.setOpenShiftsCount(res.data.length);
        }
      },
      error: () => {
        this.isLoading = false;
        this.toast.error('Unable to load open shifts.');
      }
    });
  }

  async claimOpenShiftDirect(shift: Shift): Promise<void> {
    const isApproval = !!shift.requireClaimApproval;
    const ok = await this.confirmDialog.confirm({
      title: isApproval ? 'Apply to Claim Shift?' : 'Claim Open Shift?',
      message: isApproval
        ? `Submit an application to claim shift ${shift.shiftCode} at ${shift.facilityName || shift.siteName}? ${(shift.requiredStaffCount && shift.requiredStaffCount > 1) ? `(${shift.openSlotsRemaining ?? (shift.requiredStaffCount - (shift.assignedCount || 0))} open slots remaining). ` : ''}Management will review and approve your request.`
        : `Claim shift ${shift.shiftCode} at ${shift.facilityName || shift.siteName}? ${(shift.requiredStaffCount && shift.requiredStaffCount > 1) ? `(${shift.openSlotsRemaining ?? (shift.requiredStaffCount - (shift.assignedCount || 0))} open slots remaining). ` : ''}You will be immediately assigned and scheduled on the duty roster.`,
      confirmLabel: isApproval ? 'Submit Application' : 'Claim Shift',
      cancelLabel: 'Cancel',
      isDestructive: false
    });
    if (!ok) return;

    this.isActionLoading = true;
    this.workforceService.claimShiftDirect(shift.id).subscribe({
      next: (res: any) => {
        this.isActionLoading = false;
        if (res.isSuccess) {
          this.toast.success(isApproval
            ? 'Claim request submitted! Awaiting manager approval.'
            : 'Shift claimed successfully! Added to your schedule.');
          this.loadOpenShifts();
          this.loadMyShifts();
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

  onDocumentFileSelected(event: any): void {
    const file = event.target?.files?.[0];
    if (!file) return;

    if (!this.docForm.documentName) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      this.docForm.documentName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
    }

    this.isUploadingDoc = true;
    this.uploadedDocFileName = file.name;

    this.workforceService.uploadComplianceMedia(file).subscribe({
      next: (res: any) => {
        this.isUploadingDoc = false;
        const url = res?.data?.url || res?.url;
        if (url) {
          this.docForm.fileUrl = url;
          this.toast.success(`"${file.name}" uploaded successfully!`);
        } else {
          this.toast.error('File uploaded, but no URL was returned.');
        }
      },
      error: (err: any) => {
        this.isUploadingDoc = false;
        this.uploadedDocFileName = '';
        this.toast.error(err?.error?.message || 'Failed to upload document.');
      }
    });
  }

  removeUploadedDoc(): void {
    this.docForm.fileUrl = '';
    this.uploadedDocFileName = '';
  }

  saveDocument(): void {
    if (!this.docForm.documentName || !this.docForm.fileUrl) return;
    this.isActionLoading = true;
    this.workforceService.uploadDocument(this.docForm).subscribe({
      next: (res: any) => {
        this.isActionLoading = false;
        if (res.isSuccess) {
          this.toast.success('Document uploaded to vault.');
          this.loadDocuments();
          this.docForm.documentName = '';
          this.docForm.fileUrl = '';
          this.uploadedDocFileName = '';
        } else {
          this.toast.error(res.message || 'Failed to save document.');
        }
      },
      error: () => {
        this.isActionLoading = false;
        this.toast.error('Error uploading document.');
      }
    });
  }

  // --- TAB: REMINDERS ---
  loadReminders(): void {
    this.workforceService.getNotificationPreferences().subscribe({
      next: (res: any) => {
        if (res.isSuccess && res.data) {
          const d = res.data;
          const parseMinutes = (v: any, fallback: number) => {
            if (v === null || v === undefined || v === '') return fallback;
            const n = parseInt(v, 10);
            return isNaN(n) ? fallback : n;
          };
          this.reminderPrefs = {
            slot1MinutesBefore: parseMinutes(d.slot1MinutesBefore ?? d.reminderSlot1Minutes, 1440),
            slot2MinutesBefore: parseMinutes(d.slot2MinutesBefore ?? d.reminderSlot2Minutes, 240),
            slot3MinutesBefore: parseMinutes(d.slot3MinutesBefore ?? d.reminderSlot3Minutes, 30),
            enableSlot1: d.enableSlot1 ?? true,
            enableSlot2: d.enableSlot2 ?? true,
            enableSlot3: d.enableSlot3 ?? true,
            enableInApp: d.enableInApp !== false && d.allowInApp !== false,
            enableEmail: d.enableEmail !== false && d.allowEmail !== false,
            enableWhatsApp: d.enableWhatsApp !== false && d.allowWhatsApp !== false,
            preferredContactPhone: d.preferredContactPhone || ''
          };
        }
      }
    });
  }

  saveReminderPreferences(): void {
    const payload = {
      slot1MinutesBefore: Number(this.reminderPrefs.slot1MinutesBefore) || 1440,
      enableSlot1: (this.reminderPrefs.slot1MinutesBefore ?? 1440) > 0,
      slot2MinutesBefore: Number(this.reminderPrefs.slot2MinutesBefore) || 240,
      enableSlot2: (this.reminderPrefs.slot2MinutesBefore ?? 240) > 0,
      slot3MinutesBefore: Number(this.reminderPrefs.slot3MinutesBefore) || 30,
      enableSlot3: (this.reminderPrefs.slot3MinutesBefore ?? 30) > 0,
      enableInApp: this.reminderPrefs.enableInApp !== false,
      enableEmail: this.reminderPrefs.enableEmail !== false,
      enableWhatsApp: this.reminderPrefs.enableWhatsApp !== false,
      preferredContactPhone: this.reminderPrefs.preferredContactPhone || null
    };

    this.workforceService.updateNotificationPreferences(payload).subscribe({
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

  async withdrawShiftSwap(shift: Shift): Promise<void> {
    if (!(await this.confirmDialog.confirm({
      title: 'Withdraw swap offer?',
      message: `Withdraw the swap offer for shift ${shift.shiftCode}?`,
      confirmText: 'Withdraw',
      danger: true
    }))) return;
    this.workforceService.getWorkspaceSwaps().subscribe({
      next: (res: any) => {
        const swaps = res?.data || [];
        const mySwap = swaps.find((sw: any) => sw.shiftId === shift.id && sw.status !== 'Cancelled' && sw.status !== 'Approved');
        if (mySwap) {
          this.workforceService.cancelSwap(mySwap.id).subscribe({
            next: (cRes: any) => {
              if (cRes.isSuccess) {
                this.toast.success('Shift swap offer withdrawn.');
                this.loadMyShifts();
              } else {
                this.toast.error(cRes.message || 'Failed to withdraw swap.');
              }
            },
            error: () => this.toast.error('Error withdrawing shift swap.')
          });
        } else {
          this.toast.info('No active swap offer found for this shift.');
          this.loadMyShifts();
        }
      },
      error: () => this.toast.error('Could not verify swap status.')
    });
  }

  getStatusBadge(s: Shift): string {
    if (s.isClockedIn) return 'bg-primary';
    if (s.isClockedOut) return 'bg-secondary';
    if (s.isConfirmedByGuard) return 'bg-success';
    return 'bg-warning text-dark';
  }

  // --- DUTY REPORT & OCCURRENCE ACTIONS ---
  openDutyReportModal(shift: Shift): void {
    this.activeReportingShift = shift;
    this.dutyReportContent = shift.reportContent || '';
    this.showDutyReportModal = true;
  }

  closeDutyReportModal(): void {
    this.showDutyReportModal = false;
    this.activeReportingShift = null;
    this.dutyReportContent = '';
  }

  saveShiftDutyReport(): void {
    if (!this.activeReportingShift || !this.dutyReportContent.trim()) return;
    this.isSubmittingDutyReport = true;
    this.workforceService.submitShiftDutyReport(this.activeReportingShift.id, {
      reportContent: this.dutyReportContent.trim()
    }).subscribe({
      next: () => {
        this.isSubmittingDutyReport = false;
        if (this.activeReportingShift) {
          this.activeReportingShift.reportContent = this.dutyReportContent.trim();
        }
        this.toast.success('Duty report submitted successfully.');
        this.closeDutyReportModal();
      },
      error: (err: any) => {
        this.isSubmittingDutyReport = false;
        this.toast.error(err?.error?.message || 'Failed to submit duty report.');
      }
    });
  }

  // --- EMERGENCY SOS PROTOCOLS ---
  openEmergencySosModal(shift: Shift): void {
    this.activeSosShift = shift;
    this.selectedSosCategory = null;
    this.sosDescription = '';
    this.sosLatitude = null;
    this.sosLongitude = null;
    this.showEmergencySosModal = true;
    this.loadEmergencyCategoriesForSos();
    this.acquireGpsForSos();
  }

  closeEmergencySosModal(): void {
    this.showEmergencySosModal = false;
    this.activeSosShift = null;
    this.selectedSosCategory = null;
    this.sosDescription = '';
  }

  loadEmergencyCategoriesForSos(): void {
    this.workforceService.getEmergencyCategories().subscribe({
      next: (res: any) => {
        const raw = res?.data;
        if (Array.isArray(raw)) {
          this.emergencyCategories = raw.filter((c: any) => c.isActive !== false);
        } else if (typeof raw === 'string') {
          try {
            const parsed = JSON.parse(raw);
            this.emergencyCategories = Array.isArray(parsed) ? parsed.filter((c: any) => c.isActive !== false) : [];
          } catch {
            this.emergencyCategories = [];
          }
        }
        if (this.emergencyCategories.length > 0 && !this.selectedSosCategory) {
          this.selectedSosCategory = this.emergencyCategories[0];
        }
      },
      error: () => {
        this.emergencyCategories = [];
      }
    });
  }

  acquireGpsForSos(): void {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      this.isAcquiringGps = true;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.sosLatitude = pos.coords.latitude;
          this.sosLongitude = pos.coords.longitude;
          this.isAcquiringGps = false;
        },
        () => {
          this.isAcquiringGps = false;
        },
        { enableHighAccuracy: true, timeout: 7000 }
      );
    }
  }

  selectSosCategory(cat: any): void {
    this.selectedSosCategory = cat;
  }

  dispatchEmergencySos(): void {
    if (!this.activeSosShift || !this.selectedSosCategory || !this.sosDescription.trim()) return;

    this.isTransmittingSos = true;
    this.workforceService.transmitEmergencySos(this.activeSosShift.id, {
      categoryId: this.selectedSosCategory.id,
      categoryName: this.selectedSosCategory.name,
      severity: this.selectedSosCategory.severity || 'Critical',
      description: this.sosDescription.trim(),
      latitude: this.sosLatitude,
      longitude: this.sosLongitude
    }).subscribe({
      next: () => {
        this.isTransmittingSos = false;
        this.toast.success('Emergency SOS broadcasted across SMS, Email, WhatsApp, and Push notifications.');
        this.closeEmergencySosModal();
      },
      error: (err: any) => {
        this.isTransmittingSos = false;
        this.toast.error(err?.error?.message || 'Failed to dispatch Emergency SOS.');
      }
    });
  }
}
