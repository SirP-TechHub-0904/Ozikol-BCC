import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { WorkforceService, Shift, ClientSite } from '../../../core/services/workforce.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';

interface CalendarDayMetrics {
  date: Date;
  dateStr: string;
  dayNum: number;
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
  shifts: any[];
  leaves: any[];
  swaps: any[];
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
 * Dedicated Interactive Rota Calendar (`/workforce/console/schedule`).
 * Calendar-first operational view supporting Month, Week, Day (Grid Timeline & List), and Year (12-Month) views,
 * color-coded Past / Today / Upcoming shift day cells, multi-metric daily activity pills,
 * and an interactive Day Activity Inspector panel (Sections A, B, C, D).
 */
@Component({
  selector: 'app-workforce-schedule',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="bcp-page-container">
      <!-- 1. Canonical Dashboard Page Header -->
      <div class="page-header">
        <div class="header-left">
          <div class="breadcrumb">
            <a routerLink="/admin/dashboard">Command Center</a>
            <span class="sep">/</span>
            <span>Workforce &amp; Shifts</span>
            <span class="sep">/</span>
            <span class="current">Rota Calendar</span>
          </div>
          <div class="title-row">
            <h1>Rota Calendar</h1>
            <span class="badge-suite">Suite: Workforce &amp; Shifts</span>
          </div>
          <p class="subtitle">
            Interactive monthly, weekly, daily, and yearly duty calendar with live shift, active duty, leave/excuse, and swap telemetry.
          </p>
        </div>
        <div class="header-actions">
          <button type="button" class="btn btn-outline" (click)="loadData()">
            <span class="material-symbols-outlined" [class.spin]="isLoading">refresh</span>
            <span>Refresh</span>
          </button>
          <a routerLink="/workforce/console/shifts" class="btn btn-outline" title="Open Shift Manager (Roster List, Timesheets, Swaps & Leave)">
            <span class="material-symbols-outlined">table_rows</span>
            <span>Shift Manager</span>
          </a>
          <a routerLink="/workforce/console/schedule/create" class="btn btn-primary" title="Create New Shift or Recurring Schedule">
            <span class="material-symbols-outlined">add</span>
            <span>Create Schedule</span>
          </a>
        </div>
      </div>

      <!-- 2. Google-Calendar-Style Master Navigation & View Toolbar -->
      <div class="calendar-toolbar-card">
        <div class="cal-nav-left">
          <button type="button" class="btn-today" (click)="goToToday()">Today</button>
          <div class="nav-arrows">
            <button type="button" class="nav-icon-btn" (click)="navigatePeriod(-1)" title="Previous">
              <span class="material-symbols-outlined">chevron_left</span>
            </button>
            <button type="button" class="nav-icon-btn" (click)="navigatePeriod(1)" title="Next">
              <span class="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
          <h2 class="period-heading">{{ currentPeriodHeading }}</h2>

          <!-- Direct Month & Year Jump Pickers -->
          <div class="month-year-pickers">
            <select class="cal-picker-select" [ngModel]="currentCalendarDate.getMonth()" (ngModelChange)="onSelectMonth($event)">
              <option *ngFor="let m of monthNames; let idx = index" [ngValue]="idx">{{ m }}</option>
            </select>
            <select class="cal-picker-select" [ngModel]="currentCalendarDate.getFullYear()" (ngModelChange)="onSelectYear($event)">
              <option *ngFor="let y of availableYears" [ngValue]="y">{{ y }}</option>
            </select>
          </div>
        </div>

        <div class="cal-nav-right">
          <!-- Venue Filter -->
          <select class="cal-picker-select" [(ngModel)]="selectedSiteId" (change)="onFilterChange()">
            <option value="">All Venues / Locations</option>
            <option *ngFor="let s of sites" [value]="s.id">{{ s.siteName }}</option>
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
        </div>
      </div>

      <!-- 3. Color Legend Strip -->
      <div class="calendar-legend-bar">
        <div class="legend-group">
          <span class="legend-title">Day Background Key:</span>
          <span class="legend-swatch upcoming-swatch">
            <span class="swatch-dot"></span> Upcoming Day with Shifts
          </span>
          <span class="legend-swatch today-swatch">
            <span class="swatch-dot"></span> Today / Current Day
          </span>
          <span class="legend-swatch past-swatch">
            <span class="swatch-dot"></span> Past Day with Shifts
          </span>
        </div>

        <div class="legend-group">
          <span class="legend-title">Daily Metric Badges:</span>
          <span class="metric-pill pill-blue">🟦 Shifts</span>
          <span class="metric-pill pill-green">🟩 Active Now</span>
          <span class="metric-pill pill-orange">🟧 Open</span>
          <span class="metric-pill pill-purple">🟪 Excused / Leave</span>
          <span class="metric-pill pill-yellow">🟨 Swap</span>
          <span class="metric-pill pill-gray">⬜ Done</span>
        </div>
      </div>

      <!-- ========================================================================= -->
      <!-- VIEW A: MONTHLY CALENDAR GRID (DEFAULT) -->
      <!-- ========================================================================= -->
      <div class="calendar-board-card" *ngIf="calendarMode === 'month'">
        <div class="month-grid-scroll">
          <div class="month-grid-header">
            <div class="weekday-col" *ngFor="let wd of ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']">
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
              [class.day-selected]="selectedDayCell?.dateStr === cell.dateStr"
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

              <!-- Multi-Metric Daily Activity Pills -->
              <div class="cell-metrics-wrap" *ngIf="cell.shiftsCount > 0 || cell.leaveCount > 0 || cell.swapCount > 0">
                <span class="metric-pill pill-blue" *ngIf="cell.shiftsCount > 0" title="Total scheduled shifts">
                  {{ cell.shiftsCount }} {{ cell.shiftsCount === 1 ? 'Shift' : 'Shifts' }}
                </span>
                <span class="metric-pill pill-green" *ngIf="cell.activeNowCount > 0" title="Staff currently clocked in on duty">
                  {{ cell.activeNowCount }} Active Now
                </span>
                <span class="metric-pill pill-orange" *ngIf="cell.openCount > 0" title="Open unassigned shifts needing coverage">
                  {{ cell.openCount }} Open
                </span>
                <span class="metric-pill pill-purple" *ngIf="cell.leaveCount > 0" title="Staff on leave or excused absence">
                  {{ cell.leaveCount }} {{ cell.leaveCount === 1 ? 'Excuse' : 'Excuses' }}
                </span>
                <span class="metric-pill pill-yellow" *ngIf="cell.swapCount > 0" title="Pending shift swap requests">
                  {{ cell.swapCount }} {{ cell.swapCount === 1 ? 'Swap' : 'Swaps' }}
                </span>
                <span class="metric-pill pill-gray" *ngIf="cell.doneCount > 0" title="Completed shifts">
                  {{ cell.doneCount }} Done
                </span>
              </div>

              <!-- Compact Google-Calendar-Style Shift Preview Bars (Top 2) -->
              <div class="cell-events-list" *ngIf="cell.shifts.length > 0">
                <div
                  *ngFor="let s of cell.shifts.slice(0, 2)"
                  class="cell-event-chip"
                  [class.chip-open]="isOpenShift(s)"
                  [class.chip-done]="isShiftDone(s)"
                  [class.chip-archived]="s.assignedUserName === 'Archived Staff'"
                >
                  <span class="ev-time">{{ s.startsAtUtc | date:'HH:mm' }}</span>
                  <span class="ev-title" [class.archived-ev]="s.assignedUserName === 'Archived Staff'">{{ s.siteName || s.postName }} &bull; {{ s.assignedUserName || 'Open' }}</span>
                </div>
                <div class="more-events-link" *ngIf="cell.shifts.length > 2">
                  +{{ cell.shifts.length - 2 }} more on this day
                </div>
              </div>
            </div>
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
            <div class="time-gutter-header">GMT/Local</div>
            <div
              *ngFor="let wd of currentWeekDays"
              class="week-day-col-header"
              [class.is-today]="wd.isToday"
              [class.is-selected]="selectedDayCell?.dateStr === wd.dateStr"
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

          <!-- Week Hourly Rows (06:00 to 22:00 condensed or full 24h) -->
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
                  [class.ev-open]="isOpenShift(s)"
                  [class.ev-done]="isShiftDone(s)"
                  [class.ev-upcoming]="wd.isFuture && !isOpenShift(s)"
                >
                  <div class="tev-time">{{ s.startsAtUtc | date:'HH:mm' }} – {{ s.endsAtUtc | date:'HH:mm' }}</div>
                  <div class="tev-venue">{{ s.siteName }} ({{ s.postName }})</div>
                  <div class="tev-staff" [class.archived-ev]="s.assignedUserName === 'Archived Staff'">{{ s.assignedUserName || 'Open Shift' }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ========================================================================= -->
      <!-- VIEW C: SINGLE-DAY CALENDAR (GRID TIMELINE OR LIST TOGGLE) -->
      <!-- ========================================================================= -->
      <div class="calendar-board-card" *ngIf="calendarMode === 'day' && selectedDayCell">
        <div class="day-view-Subheader">
          <div class="day-hero-badge">
            <div class="day-big-circle" [class.today]="selectedDayCell.isToday">
              <span class="dbc-dow">{{ selectedDayCell.date | date:'EEE' }}</span>
              <span class="dbc-num">{{ selectedDayCell.dayNum }}</span>
            </div>
            <div>
              <h3>{{ selectedDayCell.date | date:'EEEE, d MMMM yyyy' }}</h3>
              <div class="cell-metrics-wrap" style="margin-top: 4px;">
                <span class="metric-pill pill-blue">{{ selectedDayCell.shiftsCount }} Shifts</span>
                <span class="metric-pill pill-green">{{ selectedDayCell.activeNowCount }} Active Now</span>
                <span class="metric-pill pill-orange">{{ selectedDayCell.openCount }} Open</span>
                <span class="metric-pill pill-purple">{{ selectedDayCell.leaveCount }} Excused / Leave</span>
                <span class="metric-pill pill-yellow">{{ selectedDayCell.swapCount }} Swaps</span>
              </div>
            </div>
          </div>

          <div class="day-layout-toggle">
            <span class="toggle-lbl">Day View Layout:</span>
            <button
              type="button"
              class="cal-view-btn"
              [class.active]="dayDisplayMode === 'grid'"
              (click)="dayDisplayMode = 'grid'"
            >
              <span class="material-symbols-outlined">schedule</span>
              <span>Hourly Timeline Grid</span>
            </button>
            <button
              type="button"
              class="cal-view-btn"
              [class.active]="dayDisplayMode === 'list'"
              (click)="dayDisplayMode = 'list'"
            >
              <span class="material-symbols-outlined">view_list</span>
              <span>Structured List</span>
            </button>
          </div>
        </div>

        <!-- Day Hourly Timeline Grid (Google Calendar Day Style) -->
        <div class="day-hourly-timeline" *ngIf="dayDisplayMode === 'grid'">
          <div class="day-all-day-bar" *ngIf="selectedDayCell.leaves.length > 0">
            <span class="all-day-lbl">EXCUSED / LEAVE</span>
            <div class="all-day-chips">
              <span class="metric-pill pill-purple" *ngFor="let lv of selectedDayCell.leaves">
                {{ lv.userName }} &bull; {{ lv.leaveType }} ({{ lv.status }})
              </span>
            </div>
          </div>

          <div class="day-hour-row" *ngFor="let hr of timelineHours">
            <div class="time-gutter-cell">{{ formatHourLabel(hr) }}</div>
            <div class="day-hour-slot">
              <div
                *ngFor="let s of getShiftsStartingInHour(selectedDayCell, hr)"
                class="day-timeline-shift-block"
                [class.ev-open]="isOpenShift(s)"
                [class.ev-done]="isShiftDone(s)"
              >
                <div class="dts-main">
                  <strong>{{ s.startsAtUtc | date:'HH:mm' }} – {{ s.endsAtUtc | date:'HH:mm' }}</strong>
                  <span class="dts-site">{{ s.siteName }} &bull; {{ s.postName }}</span>
                  <span class="dts-staff" [class.archived-ev]="s.assignedUserName === 'Archived Staff'">
                    <span class="material-symbols-outlined">{{ isOpenShift(s) ? 'person_search' : (s.assignedUserName === 'Archived Staff' ? 'person_off' : 'person') }}</span>
                    {{ s.assignedUserName || 'Open Shift (Unassigned)' }}
                  </span>
                </div>
                <div class="dts-actions">
                  <a *ngIf="!isShiftDone(s)" [routerLink]="['/workforce/console/schedule/edit', s.id]" class="btn btn-outline btn-sm">Edit</a>
                  <a [routerLink]="['/workforce/console/shifts', s.id, 'report']" class="btn btn-outline btn-sm">Report</a>
                </div>
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
              <span *ngFor="let d of ['S', 'M', 'T', 'W', 'T', 'F', 'S']">{{ d }}</span>
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
                [title]="md.shiftsCount > 0 ? (md.shiftsCount + ' shifts on ' + (md.date | date:'d MMM y')) : (md.date | date:'d MMM y')"
                (click)="jumpToDateFromYear(md.date)"
              >
                {{ md.dayNum }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ========================================================================= -->
      <!-- 4. INTERACTIVE "DAY ACTIVITY INSPECTOR" PANEL (SECTIONS A, B, C, D) -->
      <!-- ========================================================================= -->
      <div class="day-inspector-card" id="dayOperationsInspector" *ngIf="selectedDayCell">
        <div class="inspector-header">
          <div class="inspector-title-left">
            <div class="inspector-date-icon" [class.today]="selectedDayCell.isToday" [class.upcoming]="selectedDayCell.isFuture">
              <span class="idi-month">{{ selectedDayCell.date | date:'MMM' }}</span>
              <span class="idi-day">{{ selectedDayCell.dayNum }}</span>
            </div>
            <div>
              <div class="inspector-heading-row">
                <h3>Day Operations Breakdown &mdash; {{ selectedDayCell.date | date:'EEEE, d MMMM yyyy' }}</h3>
                <span class="day-era-tag today" *ngIf="selectedDayCell.isToday">Today</span>
                <span class="day-era-tag upcoming" *ngIf="selectedDayCell.isFuture">Upcoming Date</span>
                <span class="day-era-tag past" *ngIf="selectedDayCell.isPast">Past Date</span>
              </div>
              <p class="inspector-sub">
                Complete snapshot of scheduled shifts, active personnel on duty, staff excuses/leave, and shift swaps for this date.
              </p>
            </div>
          </div>

          <div class="inspector-header-actions">
            <!-- Toggle Day Inspector between Grid Cards and Table List -->
            <div class="cal-view-switcher">
              <button
                type="button"
                class="cal-view-btn"
                [class.active]="inspectorLayout === 'grid'"
                (click)="inspectorLayout = 'grid'"
              >
                <span class="material-symbols-outlined">grid_view</span>
                <span>Cards Grid</span>
              </button>
              <button
                type="button"
                class="cal-view-btn"
                [class.active]="inspectorLayout === 'list'"
                (click)="inspectorLayout = 'list'"
              >
                <span class="material-symbols-outlined">table_rows</span>
                <span>Table List</span>
              </button>
            </div>

            <a routerLink="/workforce/console/schedule/create" class="btn btn-primary">
              <span class="material-symbols-outlined">add</span>
              <span>+ Add Shift on This Day</span>
            </a>
          </div>
        </div>

        <!-- Inspector 4-Section Summary Strip -->
        <div class="inspector-metrics-strip">
          <div class="insp-stat blue">
            <span class="material-symbols-outlined">event_note</span>
            <div>
              <strong>{{ selectedDayCell.shiftsCount }}</strong>
              <span>Scheduled Shifts ({{ selectedDayCell.openCount }} Open, {{ selectedDayCell.doneCount }} Done)</span>
            </div>
          </div>
          <div class="insp-stat green">
            <span class="material-symbols-outlined">sensors</span>
            <div>
              <strong>{{ selectedDayCell.activeNowCount }}</strong>
              <span>Active On Duty</span>
            </div>
          </div>
          <div class="insp-stat purple">
            <span class="material-symbols-outlined">event_busy</span>
            <div>
              <strong>{{ selectedDayCell.leaveCount }}</strong>
              <span>Excused / On Leave</span>
            </div>
          </div>
          <div class="insp-stat amber">
            <span class="material-symbols-outlined">swap_horiz</span>
            <div>
              <strong>{{ selectedDayCell.swapCount }}</strong>
              <span>Shift Swaps</span>
            </div>
          </div>
        </div>

        <div class="inspector-sections-body">
          <!-- SECTION A: SHIFTS ON THIS DAY -->
          <div class="inspector-section">
            <div class="sec-head">
              <div class="sec-title">
                <span class="sec-badge blue">Section A</span>
                <h4>Shifts on This Day ({{ selectedDayCell.shifts.length }})</h4>
              </div>
            </div>

            <div class="sec-empty" *ngIf="selectedDayCell.shifts.length === 0">
              No shifts scheduled for {{ selectedDayCell.date | date:'EEEE, d MMM yyyy' }}.
            </div>

            <!-- Section A: Grid Cards View -->
            <div class="day-shifts-cards-grid" *ngIf="selectedDayCell.shifts.length > 0 && inspectorLayout === 'grid'">
              <div
                *ngFor="let s of selectedDayCell.shifts; let i = index"
                class="day-shift-card"
                [class.card-upcoming]="selectedDayCell.isFuture && !isOpenShift(s)"
                [class.card-open]="isOpenShift(s)"
                [class.card-done]="isShiftDone(s)"
              >
                <div class="dsc-top">
                  <span class="sn-badge">#{{ i + 1 }} &bull; {{ s.shiftCode }}</span>
                  <span class="status-pill" [ngClass]="getStatusClass(s)">{{ getDisplayStatus(s) }}</span>
                </div>
                <div class="dsc-venue">{{ s.siteName }}</div>
                <div class="dsc-post">Post: {{ s.postName || s.facilityName || 'General Post' }}</div>
                <div class="dsc-time">
                  <span class="material-symbols-outlined">schedule</span>
                  <span>{{ s.startsAtUtc | date:'HH:mm' }} – {{ s.endsAtUtc | date:'HH:mm' }} ({{ s.plannedDurationHours || 8 }}h)</span>
                </div>
                <div class="dsc-staff" [class.archived-ev]="s.assignedUserName === 'Archived Staff'">
                  <span class="material-symbols-outlined">{{ isOpenShift(s) ? 'person_search' : (s.assignedUserName === 'Archived Staff' ? 'person_off' : 'person') }}</span>
                  <strong>{{ s.assignedUserName || 'Open Shift — Unassigned' }}</strong>
                </div>
                <div class="dsc-actions">
                  <a *ngIf="!isShiftDone(s)" [routerLink]="['/workforce/console/schedule/edit', s.id]" class="btn btn-outline btn-sm">
                    <span class="material-symbols-outlined">edit</span>
                    <span>Edit</span>
                  </a>
                  <a [routerLink]="['/workforce/console/shifts', s.id, 'report']" class="btn btn-outline btn-sm">
                    <span class="material-symbols-outlined">assignment</span>
                    <span>Duty Report</span>
                  </a>
                </div>
              </div>
            </div>

            <!-- Section A: Table List View -->
            <div class="table-responsive" *ngIf="selectedDayCell.shifts.length > 0 && inspectorLayout === 'list'">
              <table class="bcp-table">
                <thead>
                  <tr>
                    <th style="width: 50px;">S/N</th>
                    <th>Shift Code</th>
                    <th>Time &amp; Hours</th>
                    <th>Venue &amp; Post</th>
                    <th>Assigned Staff</th>
                    <th>Pay Rate</th>
                    <th>Status</th>
                    <th class="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let s of selectedDayCell.shifts; let i = index">
                    <td><span class="sn-badge">{{ i + 1 }}</span></td>
                    <td><strong>{{ s.shiftCode }}</strong></td>
                    <td>{{ s.startsAtUtc | date:'HH:mm' }} – {{ s.endsAtUtc | date:'HH:mm' }} ({{ s.plannedDurationHours || 8 }}h)</td>
                    <td><strong>{{ s.siteName }}</strong> &bull; {{ s.postName }}</td>
                    <td>
                      <strong *ngIf="!isOpenShift(s)">{{ s.assignedUserName }}</strong>
                      <span *ngIf="isOpenShift(s)" class="metric-pill pill-orange">Open Shift</span>
                    </td>
                    <td>{{ currencySymbol }}{{ (s.hourlyPayRate || 0) | number:'1.2-2' }}/hr</td>
                    <td><span class="status-pill" [ngClass]="getStatusClass(s)">{{ getDisplayStatus(s) }}</span></td>
                    <td class="text-right">
                      <div style="display: inline-flex; gap: 6px;">
                        <a *ngIf="!isShiftDone(s)" [routerLink]="['/workforce/console/schedule/edit', s.id]" class="btn btn-outline btn-sm">Edit</a>
                        <a [routerLink]="['/workforce/console/shifts', s.id, 'report']" class="btn btn-outline btn-sm">Report</a>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- SECTION B & C & D IN 2-COLUMN GRID -->
          <div class="inspector-sub-grid">
            <!-- SECTION B: ACTIVE ON DUTY -->
            <div class="inspector-section">
              <div class="sec-head">
                <div class="sec-title">
                  <span class="sec-badge green">Section B</span>
                  <h4>Active On Duty ({{ getActiveShiftsForDay(selectedDayCell).length }})</h4>
                </div>
                <a routerLink="/workforce/console/live" class="sec-link">Open Live Monitor &rarr;</a>
              </div>
              <div class="sec-empty" *ngIf="getActiveShiftsForDay(selectedDayCell).length === 0">
                No staff currently clocked in for shifts on this date.
              </div>
              <div class="compact-item-list" *ngIf="getActiveShiftsForDay(selectedDayCell).length > 0">
                <div class="compact-item" *ngFor="let act of getActiveShiftsForDay(selectedDayCell)">
                  <div>
                    <strong>{{ act.assignedUserName }}</strong>
                    <span class="ci-sub">{{ act.siteName }} &bull; {{ act.postName }} ({{ act.startsAtUtc | date:'HH:mm' }} – {{ act.endsAtUtc | date:'HH:mm' }})</span>
                  </div>
                  <span class="metric-pill pill-green">● On Duty</span>
                </div>
              </div>
            </div>

            <!-- SECTION C: EXCUSES / LEAVE & TIME-OFF -->
            <div class="inspector-section">
              <div class="sec-head">
                <div class="sec-title">
                  <span class="sec-badge purple">Section C</span>
                  <h4>Excuses / Leave &amp; Time-Off ({{ selectedDayCell.leaves.length }})</h4>
                </div>
                <a [routerLink]="['/workforce/console/shifts']" [queryParams]="{ tab: 'leave' }" class="sec-link">All Leave Requests &rarr;</a>
              </div>
              <div class="sec-empty" *ngIf="selectedDayCell.leaves.length === 0">
                No staff members on leave or excused absence on this date.
              </div>
              <div class="compact-item-list" *ngIf="selectedDayCell.leaves.length > 0">
                <div class="compact-item" *ngFor="let lv of selectedDayCell.leaves">
                  <div>
                    <strong>{{ lv.userName }}</strong> &bull; <span class="metric-pill pill-purple">{{ lv.leaveType }}</span>
                    <span class="ci-sub">{{ lv.reason || 'No reason specified' }} ({{ lv.startDate | date:'d MMM' }} – {{ lv.endDate | date:'d MMM' }})</span>
                  </div>
                  <div class="ci-actions" *ngIf="lv.status === 'Pending'">
                    <button type="button" class="btn-mini-approve" (click)="reviewLeave(lv, true)">Approve</button>
                    <button type="button" class="btn-mini-decline" (click)="reviewLeave(lv, false)">Decline</button>
                  </div>
                  <span class="metric-pill pill-green" *ngIf="lv.status === 'Approved'">Approved</span>
                </div>
              </div>
            </div>

            <!-- SECTION D: SHIFT SWAPS ON THIS DAY -->
            <div class="inspector-section full-span">
              <div class="sec-head">
                <div class="sec-title">
                  <span class="sec-badge amber">Section D</span>
                  <h4>Shift Swaps on This Day ({{ selectedDayCell.swaps.length }})</h4>
                </div>
                <a [routerLink]="['/workforce/console/shifts']" [queryParams]="{ tab: 'swaps' }" class="sec-link">All Shift Swaps &rarr;</a>
              </div>
              <div class="sec-empty" *ngIf="selectedDayCell.swaps.length === 0">
                No shift swap requests affecting this date.
              </div>
              <div class="compact-item-list" *ngIf="selectedDayCell.swaps.length > 0">
                <div class="compact-item" *ngFor="let sw of selectedDayCell.swaps">
                  <div>
                    <strong>{{ sw.requestingUserName }}</strong> &rarr; <strong>{{ sw.offeredToUserName || 'Team Broadcast' }}</strong>
                    <span class="ci-sub">{{ sw.shiftCode }} &bull; {{ sw.siteName }} ({{ sw.reason || 'Coverage request' }})</span>
                  </div>
                  <div class="ci-actions" *ngIf="sw.status === 'PendingSupervisor' || sw.status === 'Pending'">
                    <button type="button" class="btn-mini-approve" (click)="reviewSwap(sw, true)">Approve</button>
                    <button type="button" class="btn-mini-decline" (click)="reviewSwap(sw, false)">Decline</button>
                  </div>
                  <span class="metric-pill pill-green" *ngIf="sw.status === 'Approved'">Approved</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 5. Info Guide Modal -->
      <div class="modal-backdrop" *ngIf="showInfoModal" (click)="showInfoModal = false">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <span class="material-symbols-outlined text-blue">info</span>
            <h3>Rota Calendar Guide</h3>
          </div>
          <div class="modal-body">
            <p><strong>Calendar-First View:</strong> Inspect every day of the month, week, day, or full 12-month year at a glance with color-coded badges for Shifts, Active Now, Open Shifts, Excused/Leave, Swaps, and Completed Shifts.</p>
            <p><strong>Smart Day Highlighting:</strong> Upcoming days with scheduled shifts have a text-friendly emerald tint, Today is highlighted in Royal Blue, and Past days with shifts use a soft indigo-slate tint.</p>
            <p><strong>Click Any Date:</strong> Clicking any date automatically shifts the calendar to that month and opens the 4-section <em>Day Operations Breakdown</em> below.</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-primary" (click)="showInfoModal = false">Got It</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .bcp-page-container { display: flex; flex-direction: column; gap: 16px; padding: 0 4px 40px 4px; width: 100%; }
    .page-header { display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; background: #ffffff; padding: 18px 22px; border-radius: 14px; border: 1px solid #e2e8f0; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02); }
    .header-left { display: flex; flex-direction: column; gap: 6px; }
    .breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #64748b; }
    .breadcrumb a { color: #0050e5; text-decoration: none; font-weight: 600; }
    .breadcrumb .current { color: #0f172a; font-weight: 600; }
    .title-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .title-row h1 { margin: 0; font-size: 24px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; }
    .subtitle { margin: 0; font-size: 13.5px; color: #64748b; }
    .badge-suite { background: #eff6ff; color: #0050e5; border: 1px solid #bfdbfe; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 999px; text-transform: uppercase; }
    .info-trigger-btn { background: #eff6ff; border: 1px solid #bfdbfe; color: #0050e5; width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; }
    .header-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

    .btn { display: inline-flex; align-items: center; justify-content: center; gap: 5px; height: 34px; padding: 0 12px; border-radius: 8px; font-size: 12px; font-weight: 600; white-space: nowrap; flex-shrink: 0; cursor: pointer; text-decoration: none; border: 1px solid transparent; transition: all 0.15s ease; }
    .btn .material-symbols-outlined { font-size: 16px; }
    .btn-primary { background: #0050e5; color: #ffffff; }
    .btn-primary:hover { background: #003bb5; }
    .btn-outline { background: #ffffff; color: #334155; border-color: #cbd5e1; }
    .btn-outline:hover { background: #f8fafc; border-color: #94a3b8; }
    .btn-sm { height: 28px; padding: 0 10px; font-size: 11.5px; }

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
    }
    .cal-nav-left, .cal-nav-right {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
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
    }
    .nav-icon-btn:hover { background: #e2e8f0; color: #0f172a; }
    .period-heading {
      margin: 0 4px;
      font-size: 19px;
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
      min-height: 132px;
      padding: 8px 10px;
      border-right: 1px solid #e2e8f0;
      border-bottom: 1px solid #e2e8f0;
      background: #ffffff;
      color: #0f172a;
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
      background: #fcfcfd;
      opacity: 0.65;
    }

    /* Secret Text-Friendly Past / Today / Upcoming Day Backgrounds */
    .month-day-cell.day-upcoming-shifts {
      background: linear-gradient(180deg, #f0fdf4 0%, #dcfce7 100%);
      border-color: #86efac;
      color: #064e3b;
    }
    .month-day-cell.day-today {
      background: linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%);
      border: 2px solid #0050e5;
      color: #0f172a;
    }
    .month-day-cell.day-past-shifts {
      background: linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%);
      border-color: #cbd5e1;
      color: #1e293b;
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
      color: #0f172a;
    }
    .day-num-circle.today-circle {
      background: #0050e5;
      color: #ffffff;
    }
    .month-abbr {
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
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
      background: rgba(255, 255, 255, 0.88);
      border-left: 3px solid #0050e5;
      font-size: 10.5px;
      color: #0f172a;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    }
    .cell-event-chip.chip-open { border-left-color: #d97706; background: #fffbeb; color: #92400e; }
    .cell-event-chip.chip-done { border-left-color: #64748b; opacity: 0.85; }
    .cell-event-chip.chip-archived { border-left-color: #94a3b8; background: #f8fafc; color: #64748b; }
    .ev-time { font-weight: 800; color: #0050e5; flex-shrink: 0; }
    .ev-title { overflow: hidden; text-overflow: ellipsis; font-weight: 600; }
    .archived-ev { color: #64748b !important; font-style: italic; }
    .more-events-link { font-size: 10px; font-weight: 700; color: #0050e5; padding-left: 4px; }

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
    .week-timeline-scroll { max-height: 540px; overflow-y: auto; }
    .week-hour-row {
      display: grid;
      grid-template-columns: 76px repeat(7, minmax(120px, 1fr));
      min-height: 54px;
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
    .timeline-event-card.ev-open { background: #fffbeb; border-left-color: #d97706; color: #92400e; }
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
      width: 56px;
      height: 56px;
      border-radius: 14px;
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
    .day-timeline-shift-block.ev-open { background: #fffbeb; border-left-color: #d97706; }
    .dts-main { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; font-size: 13px; color: #0f172a; }
    .dts-site { font-weight: 700; color: #0050e5; }
    .dts-staff { display: inline-flex; align-items: center; gap: 4px; font-weight: 600; }
    .dts-staff .material-symbols-outlined { font-size: 16px; }
    .dts-actions { display: flex; gap: 6px; }

    /* Year 12-Month Overview Grid */
    .year-board-pad { padding: 20px; }
    .year-months-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
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

    /* Interactive Day Activity Inspector Panel */
    .day-inspector-card {
      background: #ffffff;
      border: 1.5px solid #bfdbfe;
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 8px 24px rgba(0, 80, 229, 0.06);
    }
    .inspector-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
      padding: 16px 20px;
      background: linear-gradient(90deg, #eff6ff 0%, #f8fafc 100%);
      border-bottom: 1px solid #dbeafe;
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
    .inspector-heading-row h3 { margin: 0; font-size: 17px; font-weight: 800; color: #0f172a; }
    .inspector-sub { margin: 2px 0 0 0; font-size: 12.5px; color: #475569; }
    .inspector-header-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

    .inspector-metrics-strip {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
      padding: 14px 20px;
      background: #fafbfc;
      border-bottom: 1px solid #e2e8f0;
    }
    .insp-stat {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      border-radius: 10px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
    }
    .insp-stat .material-symbols-outlined { font-size: 22px; }
    .insp-stat.blue .material-symbols-outlined { color: #0050e5; }
    .insp-stat.green .material-symbols-outlined { color: #16a34a; }
    .insp-stat.purple .material-symbols-outlined { color: #7c3aed; }
    .insp-stat.amber .material-symbols-outlined { color: #d97706; }
    .insp-stat strong { display: block; font-size: 16px; font-weight: 800; color: #0f172a; }
    .insp-stat span { font-size: 11.5px; color: #64748b; font-weight: 600; }

    .inspector-sections-body { padding: 18px 20px; display: flex; flex-direction: column; gap: 18px; }
    .inspector-section {
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px 16px;
      background: #ffffff;
    }
    .inspector-sub-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .inspector-section.full-span { grid-column: 1 / -1; }
    @media (max-width: 900px) {
      .inspector-sub-grid { grid-template-columns: 1fr; }
    }
    .sec-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
    .sec-title { display: flex; align-items: center; gap: 8px; }
    .sec-title h4 { margin: 0; font-size: 14px; font-weight: 800; color: #0f172a; }
    .sec-badge { font-size: 10.5px; font-weight: 800; padding: 2px 8px; border-radius: 999px; text-transform: uppercase; }
    .sec-badge.blue { background: #dbeafe; color: #1e40af; }
    .sec-badge.green { background: #dcfce7; color: #166534; }
    .sec-badge.purple { background: #f3e8ff; color: #6b21a8; }
    .sec-badge.amber { background: #ffedd5; color: #9a3412; }
    .sec-link { font-size: 12px; font-weight: 700; color: #0050e5; text-decoration: none; }
    .sec-empty { padding: 16px; text-align: center; font-size: 12.5px; color: #64748b; background: #f8fafc; border-radius: 8px; }

    .day-shifts-cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 12px;
    }
    .day-shift-card {
      padding: 14px;
      border-radius: 10px;
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .day-shift-card.card-upcoming {
      background: linear-gradient(180deg, #f0fdf4 0%, #dcfce7 100%);
      border-color: #86efac;
    }
    .day-shift-card.card-open {
      background: #fffbeb;
      border-color: #fde68a;
    }
    .dsc-top { display: flex; justify-content: space-between; align-items: center; }
    .dsc-venue { font-size: 14px; font-weight: 800; color: #0f172a; }
    .dsc-post { font-size: 12px; font-weight: 700; color: #0050e5; }
    .dsc-time, .dsc-staff { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #334155; }
    .dsc-time .material-symbols-outlined, .dsc-staff .material-symbols-outlined { font-size: 16px; color: #64748b; }
    .dsc-actions { display: flex; gap: 6px; margin-top: 6px; }

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
    .ci-actions { display: flex; gap: 6px; }
    .btn-mini-approve { background: #16a34a; color: #ffffff; border: none; border-radius: 6px; padding: 4px 10px; font-size: 11px; font-weight: 700; cursor: pointer; }
    .btn-mini-decline { background: #fee2e2; color: #dc2626; border: 1px solid #fecaca; border-radius: 6px; padding: 4px 10px; font-size: 11px; font-weight: 700; cursor: pointer; }

    /* Table */
    .table-responsive { width: 100%; overflow-x: auto; }
    .bcp-table { width: 100%; border-collapse: collapse; text-align: left; }
    .bcp-table th { background: #f8fafc; padding: 10px 14px; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #475569; border-bottom: 1px solid #e2e8f0; }
    .bcp-table td { padding: 12px 14px; border-bottom: 1px solid #f1f5f9; font-size: 12.5px; color: #1e293b; vertical-align: middle; }
    .sn-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 24px; height: 22px; padding: 0 6px; border-radius: 6px; background: #e2e8f0; color: #334155; font-size: 11px; font-weight: 800; font-family: monospace; }
    .status-pill { display: inline-flex; align-items: center; padding: 3px 9px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .status-open { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
    .status-scheduled { background: #eff6ff; color: #0050e5; border: 1px solid #bfdbfe; }
    .status-active { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
    .status-completed { background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; }
    .text-right { text-align: right; }
    .text-blue { color: #0050e5; }

    .modal-backdrop { position: fixed; inset: 0; background: rgba(15,23,42,0.45); display: flex; align-items: center; justify-content: center; z-index: 1200; padding: 16px; }
    .modal-card { background: #ffffff; border-radius: 14px; max-width: 500px; width: 100%; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.15); overflow: hidden; }
    .modal-header { display: flex; align-items: center; gap: 10px; padding: 18px 22px; border-bottom: 1px solid #f1f5f9; }
    .modal-header h3 { margin: 0; font-size: 16px; font-weight: 700; color: #0f172a; }
    .modal-body { padding: 20px 22px; font-size: 13.5px; color: #334155; line-height: 1.55; }
    .modal-footer { padding: 14px 22px; background: #f8fafc; border-top: 1px solid #f1f5f9; display: flex; justify-content: flex-end; gap: 10px; }

    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { 100% { transform: rotate(360deg); } }
  `]
})
export class WorkforceScheduleComponent implements OnInit {
  shifts: Shift[] = [];
  sites: ClientSite[] = [];
  workspaceSwaps: any[] = [];
  leaveRequests: any[] = [];

  isLoading = false;
  showInfoModal = false;
  currencySymbol = '£';

  // Calendar Views: 'month' (default), 'week', 'day', 'year'
  calendarMode: 'month' | 'week' | 'day' | 'year' = 'month';
  dayDisplayMode: 'grid' | 'list' = 'grid';
  inspectorLayout: 'grid' | 'list' = 'grid';

  selectedSiteId = '';
  currentToday = new Date();
  currentCalendarDate = new Date();

  monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  availableYears: number[] = [];
  timelineHours: number[] = Array.from({ length: 24 }, (_, i) => i);

  calendarDays: CalendarDayMetrics[] = [];
  currentWeekDays: CalendarDayMetrics[] = [];
  yearMonthsGrid: YearMonthGrid[] = [];
  selectedDayCell: CalendarDayMetrics | null = null;

  constructor(
    private readonly workforceService: WorkforceService,
    private readonly toast: ToastService,
    private readonly confirmDialog: ConfirmDialogService
  ) {
    const curYear = new Date().getFullYear();
    for (let y = curYear - 2; y <= curYear + 3; y++) {
      this.availableYears.push(y);
    }
  }

  ngOnInit(): void {
    this.loadData();
  }

  get currentPeriodHeading(): string {
    const y = this.currentCalendarDate.getFullYear();
    const m = this.monthNames[this.currentCalendarDate.getMonth()];
    if (this.calendarMode === 'year') {
      return `${y}`;
    }
    if (this.calendarMode === 'day' && this.selectedDayCell) {
      return this.selectedDayCell.date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    }
    return `${m} ${y}`;
  }

  loadData(): void {
    this.isLoading = true;

    this.workforceService.getTenantCurrency().subscribe({
      next: (res: any) => {
        if (res?.data?.currencySymbol) {
          this.currencySymbol = res.data.currencySymbol;
        }
      },
      error: () => {}
    });

    this.workforceService.getSites().subscribe({
      next: (res: any) => {
        this.sites = Array.isArray(res?.data) ? res.data : [];
      },
      error: () => {}
    });

    this.workforceService.getWorkspaceSwaps().subscribe({
      next: (res: any) => {
        this.workspaceSwaps = Array.isArray(res?.data) ? res.data : [];
        this.rebuildAllCalendarViews();
      },
      error: () => {}
    });

    this.workforceService.getSupervisorLeaveRequests().subscribe({
      next: (res: any) => {
        this.leaveRequests = Array.isArray(res?.data) ? res.data : [];
        this.rebuildAllCalendarViews();
      },
      error: () => {}
    });

    this.workforceService.getShifts({
      siteId: this.selectedSiteId || undefined
    }).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        this.shifts = Array.isArray(res?.data) ? res.data : [];
        this.rebuildAllCalendarViews();
      },
      error: () => {
        this.isLoading = false;
        this.toast.error('Failed to load rota calendar data.');
      }
    });
  }

  onFilterChange(): void {
    this.rebuildAllCalendarViews();
  }

  setCalendarMode(mode: 'month' | 'week' | 'day' | 'year'): void {
    this.calendarMode = mode;
    this.rebuildAllCalendarViews();
  }

  goToToday(): void {
    this.currentToday = new Date();
    this.currentCalendarDate = new Date(this.currentToday);
    this.rebuildAllCalendarViews();
    const todayCell = this.calendarDays.find(c => c.isToday);
    if (todayCell) {
      this.selectedDayCell = todayCell;
    }
  }

  navigatePeriod(delta: number): void {
    if (this.calendarMode === 'month') {
      this.currentCalendarDate = new Date(
        this.currentCalendarDate.getFullYear(),
        this.currentCalendarDate.getMonth() + delta,
        1
      );
    } else if (this.calendarMode === 'week') {
      const next = new Date(this.currentCalendarDate);
      next.setDate(next.getDate() + delta * 7);
      this.currentCalendarDate = next;
    } else if (this.calendarMode === 'day') {
      const base = this.selectedDayCell ? new Date(this.selectedDayCell.date) : new Date(this.currentCalendarDate);
      base.setDate(base.getDate() + delta);
      this.currentCalendarDate = base;
    } else if (this.calendarMode === 'year') {
      this.currentCalendarDate = new Date(
        this.currentCalendarDate.getFullYear() + delta,
        this.currentCalendarDate.getMonth(),
        1
      );
    }
    this.rebuildAllCalendarViews();
  }

  onSelectMonth(monthIndex: number): void {
    this.currentCalendarDate = new Date(this.currentCalendarDate.getFullYear(), Number(monthIndex), 1);
    if (this.calendarMode === 'year') {
      this.calendarMode = 'month';
    }
    this.rebuildAllCalendarViews();
  }

  onSelectYear(year: number): void {
    this.currentCalendarDate = new Date(Number(year), this.currentCalendarDate.getMonth(), 1);
    this.rebuildAllCalendarViews();
  }

  /**
   * When any date cell is clicked:
   * - If the date is in a different month than the currently displayed month, automatically shifts
   *   the calendar to that date's month so the user sees the entire month for that date.
   * - Selects the clicked date to populate the 4-section Day Operations Breakdown panel.
   */
  onDayCellClick(cell: CalendarDayMetrics): void {
    const clickedDate = cell.date;
    if (
      clickedDate.getMonth() !== this.currentCalendarDate.getMonth() ||
      clickedDate.getFullYear() !== this.currentCalendarDate.getFullYear()
    ) {
      this.currentCalendarDate = new Date(clickedDate.getFullYear(), clickedDate.getMonth(), clickedDate.getDate());
      this.rebuildAllCalendarViews();
      const targetStr = this.toDateStr(clickedDate);
      this.selectedDayCell = this.calendarDays.find(c => c.dateStr === targetStr) || this.buildDayMetrics(clickedDate, true);
      this.scrollToDayBreakdown();
      return;
    }

    this.selectedDayCell = cell;
    this.scrollToDayBreakdown();
  }

  jumpToMonthFromYear(monthIndex: number): void {
    this.currentCalendarDate = new Date(this.currentCalendarDate.getFullYear(), monthIndex, 1);
    this.calendarMode = 'month';
    this.rebuildAllCalendarViews();
  }

  jumpToDateFromYear(date: Date): void {
    this.currentCalendarDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    this.calendarMode = 'month';
    this.rebuildAllCalendarViews();
    const targetStr = this.toDateStr(date);
    this.selectedDayCell = this.calendarDays.find(c => c.dateStr === targetStr) || null;
    this.scrollToDayBreakdown();
  }

  /**
   * Smoothly scrolls the window down to the Day Operations Breakdown panel immediately upon day selection.
   */
  scrollToDayBreakdown(): void {
    setTimeout(() => {
      const el = document.getElementById('dayOperationsInspector') || document.querySelector('.day-inspector-card');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 60);
  }

  rebuildAllCalendarViews(): void {
    this.buildMonthGrid();
    this.buildWeekGrid();
    if (this.calendarMode === 'year') {
      this.buildYearGrid();
    }

    // Keep selectedDayCell synchronized
    if (this.selectedDayCell) {
      const match = this.calendarDays.find(c => c.dateStr === this.selectedDayCell!.dateStr);
      this.selectedDayCell = match || this.buildDayMetrics(this.selectedDayCell.date, true);
    } else {
      const todayMatch = this.calendarDays.find(c => c.isToday);
      this.selectedDayCell = todayMatch || this.calendarDays.find(c => c.isCurrentMonth) || null;
    }
  }

  private buildMonthGrid(): void {
    const year = this.currentCalendarDate.getFullYear();
    const month = this.currentCalendarDate.getMonth();
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const cells: CalendarDayMetrics[] = [];

    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthDays - i);
      cells.push(this.buildDayMetrics(d, false));
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      cells.push(this.buildDayMetrics(dateObj, true));
    }

    const remaining = (7 - (cells.length % 7)) % 7;
    for (let t = 1; t <= remaining; t++) {
      const d = new Date(year, month + 1, t);
      cells.push(this.buildDayMetrics(d, false));
    }

    this.calendarDays = cells;
  }

  private buildWeekGrid(): void {
    const ref = this.selectedDayCell ? new Date(this.selectedDayCell.date) : new Date(this.currentCalendarDate);
    const dayOfWeek = ref.getDay();
    const sunday = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() - dayOfWeek);

    const week: CalendarDayMetrics[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + i);
      week.push(this.buildDayMetrics(d, d.getMonth() === this.currentCalendarDate.getMonth()));
    }
    this.currentWeekDays = week;
  }

  private buildYearGrid(): void {
    const year = this.currentCalendarDate.getFullYear();
    const months: YearMonthGrid[] = [];

    for (let m = 0; m < 12; m++) {
      const firstDow = new Date(year, m, 1).getDay();
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
    const dateStr = this.toDateStr(date);
    const todayStr = this.toDateStr(this.currentToday);
    const isToday = dateStr === todayStr;
    const isPast = dateStr < todayStr;
    const isFuture = dateStr > todayStr;

    const dayShifts = this.shifts.filter(s => {
      if (this.selectedSiteId && s.clientSiteId !== this.selectedSiteId) return false;
      if (!s.startsAtUtc) return false;
      return this.toDateStr(new Date(s.startsAtUtc)) === dateStr;
    });

    const dayLeaves = this.leaveRequests.filter(l => {
      if (!l.startDate || !l.endDate) return false;
      const st = this.toDateStr(new Date(l.startDate));
      const et = this.toDateStr(new Date(l.endDate));
      return dateStr >= st && dateStr <= et && l.status !== 'Rejected';
    });

    const daySwaps = this.workspaceSwaps.filter(sw => {
      if (!sw.startsAtUtc) return false;
      return this.toDateStr(new Date(sw.startsAtUtc)) === dateStr;
    });

    const activeNowCount = dayShifts.filter(s =>
      (s as any).isClockedIn && !(s as any).isClockedOut || (s.status || '').toLowerCase() === 'inprogress'
    ).length;

    const openCount = dayShifts.filter(s => this.isOpenShift(s)).length;
    const doneCount = dayShifts.filter(s => this.isShiftDone(s)).length;

    return {
      date,
      dateStr,
      dayNum: date.getDate(),
      isCurrentMonth,
      isToday,
      isPast,
      isFuture,
      shiftsCount: dayShifts.length,
      activeNowCount,
      openCount,
      leaveCount: dayLeaves.length,
      swapCount: daySwaps.length,
      doneCount,
      shifts: dayShifts,
      leaves: dayLeaves,
      swaps: daySwaps
    };
  }

  getShiftsStartingInHour(day: CalendarDayMetrics, hour: number): any[] {
    return day.shifts.filter(s => {
      if (!s.startsAtUtc) return false;
      const d = new Date(s.startsAtUtc);
      return d.getHours() === hour;
    });
  }

  getActiveShiftsForDay(day: CalendarDayMetrics): any[] {
    return day.shifts.filter(s =>
      ((s as any).isClockedIn && !(s as any).isClockedOut) || (s.status || '').toLowerCase() === 'inprogress'
    );
  }

  formatHourLabel(hr: number): string {
    return `${String(hr).padStart(2, '0')}:00`;
  }

  isOpenShift(shift: any): boolean {
    return !shift?.assignedUserId || String(shift.assignedUserId).trim() === '' || (shift.status || '').toLowerCase() === 'open';
  }

  isShiftDone(shift: any): boolean {
    const st = (shift?.status || '').toLowerCase();
    return st === 'completed' || st === 'done' || st === 'closed';
  }

  getDisplayStatus(shift: any): string {
    if (this.isShiftDone(shift)) return 'Completed';
    const st = (shift?.status || '').toLowerCase();
    if (st === 'cancelled') return 'Cancelled';
    if (st === 'inprogress' || st === 'active') return 'Active Now';
    if (this.isOpenShift(shift)) return 'Open Shift';
    if (st === 'confirmed') return 'Confirmed';
    return shift?.status || 'Scheduled';
  }

  getStatusClass(shift: any): string {
    if (this.isShiftDone(shift)) return 'status-completed';
    const st = (shift?.status || '').toLowerCase();
    if (st === 'inprogress' || st === 'active') return 'status-active';
    if (this.isOpenShift(shift)) return 'status-open';
    return 'status-scheduled';
  }

  reviewSwap(swap: any, isApproved: boolean): void {
    this.workforceService.reviewSwap(swap.id, { isApproved }).subscribe({
      next: (res: any) => {
        if (res?.isSuccess !== false) {
          this.toast.success(isApproved ? 'Shift swap approved.' : 'Shift swap declined.');
          this.loadData();
        } else {
          this.toast.error(res?.message || 'Swap review failed.');
        }
      },
      error: () => this.toast.error('Error reviewing shift swap.')
    });
  }

  async reviewLeave(leave: any, isApproved: boolean): Promise<void> {
    let rejectionReason: string | undefined;
    if (!isApproved) {
      const reason = await this.confirmDialog.prompt({
        title: 'Decline Time-Off Request',
        message: `Please specify the reason for declining ${leave.staffName || 'this staff member'}'s time-off request:`,
        inputLabel: 'Reason for decline',
        inputPlaceholder: 'e.g. Insufficient post coverage, overlapping shift schedule',
        inputRequired: true,
        confirmLabel: 'Decline Request',
        cancelLabel: 'Cancel',
        isDestructive: true
      });
      if (reason === null) return;
      rejectionReason = reason;
    }

    this.workforceService.reviewLeaveRequest(leave.id, { isApproved, rejectionReason }).subscribe({
      next: (res: any) => {
        if (res?.isSuccess !== false) {
          this.toast.success(isApproved ? 'Leave request approved.' : 'Leave request declined.');
          this.loadData();
        } else {
          this.toast.error(res?.message || 'Leave review failed.');
        }
      },
      error: () => this.toast.error('Error reviewing leave request.')
    });
  }

  private toDateStr(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
