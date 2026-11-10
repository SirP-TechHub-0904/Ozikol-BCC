import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { WorkforceService, ClientSite } from '../../../core/services/workforce.service';
import { ToastService } from '../../../core/services/toast.service';

/**
 * Interface representing a staff member in the site roster directory.
 */
interface SiteStaffRosterItem {
  userId: string;
  fullName: string;
  jobTitle: string;
  totalShiftsAtSite: number;
  completedShiftsAtSite: number;
  totalHoursAtSite: number;
  punctualityScorePercent: number;
  lastDutyDateUtc: string;
  totalFinesAmount: number;
}

/**
 * Dedicated Page Component for Work Location Staff Roster & Duty History Hub.
 * Route: `/workforce/console/sites/:id/activity`
 * Provides:
 * - Venue overview & geofence telemetry
 * - 4 Key Performance Indicator (KPI) summary metrics
 * - View Modes: Table View (default), Cards Grid, Weekly Calendar Rota, and Staff Roster Directory
 * - Full date range & status filtering
 * - Direct navigation to Duty Inspection & Report pages (zero modals).
 */
@Component({
  selector: 'app-workforce-site-activity',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="bcp-page-container">
      <!-- 1. Header & Breadcrumbs -->
      <div class="page-header">
        <div class="header-left">
          <div class="breadcrumb">
            <a routerLink="/admin/dashboard">Command Center</a>
            <span class="sep">/</span>
            <span>Workforce &amp; Shifts</span>
            <span class="sep">/</span>
            <a routerLink="/workforce/console/sites">Client Sites &amp; Geofences</a>
            <span class="sep">/</span>
            <span class="current">{{ site?.siteName || 'Venue Duty Hub' }}</span>
          </div>
          <div class="title-row">
            <h1>{{ site?.siteName || 'Venue Duty & Staff Hub' }}</h1>
            <span class="code-badge" *ngIf="site?.siteCode">{{ site?.siteCode }}</span>
            <span class="badge-suite">Suite: Workforce &amp; Shifts</span>
          </div>
          <p class="subtitle" *ngIf="site">
            <span class="material-symbols-outlined pin-icon">pin_drop</span>
            <span>{{ site.address }}, {{ site.city }}</span>
            <span class="sep-dot">&bull;</span>
            <span class="radius-chip">Geofence: {{ site.geofenceRadiusMeters || 50 }}m</span>
            <span class="sep-dot" *ngIf="site.emergencyContactPhone">&bull;</span>
            <span *ngIf="site.emergencyContactPhone">
              <span class="material-symbols-outlined pin-icon">call</span>
              <span>Duty Contact: {{ site.emergencyContactName || 'Lead' }} ({{ site.emergencyContactPhone }})</span>
            </span>
          </p>
        </div>
        <div class="header-actions">
          <a routerLink="/workforce/console/sites" class="btn btn-outline">
            <span class="material-symbols-outlined">arrow_back</span>
            <span>Back to Sites</span>
          </a>
          <button type="button" class="btn btn-outline" (click)="loadActivityData()">
            <span class="material-symbols-outlined" [class.spin]="isLoading">refresh</span>
            <span>Refresh</span>
          </button>
          <a [routerLink]="['/workforce/console/sites/edit', siteId]" class="btn btn-primary">
            <span class="material-symbols-outlined">tune</span>
            <span>Edit Geofence &amp; SIs</span>
          </a>
        </div>
      </div>

      <!-- Loading State -->
      <div class="cms-loading-card" *ngIf="isLoading">
        <span class="material-symbols-outlined spin">progress_activity</span>
        <p>Loading venue duty history, staff roster, and shifts...</p>
      </div>

      <div *ngIf="!isLoading">
        <!-- 2. KPI Summary Cards (4 Cards) -->
        <div class="metrics-grid">
          <div class="kpi-card blue">
            <div class="kpi-icon-box">
              <span class="material-symbols-outlined">calendar_month</span>
            </div>
            <div class="kpi-info">
              <span class="kpi-value">{{ totalShiftsCount }}</span>
              <span class="kpi-label">Total Venue Shifts</span>
            </div>
            <div class="kpi-sub">{{ completedShiftsCount }} completed &bull; {{ scheduledShiftsCount }} scheduled</div>
          </div>

          <div class="kpi-card emerald">
            <div class="kpi-icon-box">
              <span class="material-symbols-outlined">schedule</span>
            </div>
            <div class="kpi-info">
              <span class="kpi-value">{{ totalHoursLogged | number:'1.1-1' }}h</span>
              <span class="kpi-label">Total Logged Duty Hours</span>
            </div>
            <div class="kpi-sub">Across all completed shifts at this venue</div>
          </div>

          <div class="kpi-card purple">
            <div class="kpi-icon-box">
              <span class="material-symbols-outlined">badge</span>
            </div>
            <div class="kpi-info">
              <span class="kpi-value">{{ uniqueStaffCount }}</span>
              <span class="kpi-label">Deployed Personnel</span>
            </div>
            <div class="kpi-sub">{{ activeShiftsCount }} officers currently on duty</div>
          </div>

          <div class="kpi-card amber">
            <div class="kpi-icon-box">
              <span class="material-symbols-outlined">gavel</span>
            </div>
            <div class="kpi-info">
              <span class="kpi-value">₦{{ totalFinesAmount | number:'1.2-2' }}</span>
              <span class="kpi-label">Attached Fines &amp; Penalties</span>
            </div>
            <div class="kpi-sub">{{ finesCount }} shifts with disciplinary deductions</div>
          </div>
        </div>

        <!-- 3. Toolbar: View Mode Switcher & Filters -->
        <div class="toolbar-card">
          <div class="toolbar-left">
            <!-- Search -->
            <div class="search-input-box">
              <span class="material-symbols-outlined">search</span>
              <input
                type="text"
                [(ngModel)]="searchQuery"
                placeholder="Search by staff name, post, or shift code..."
                class="search-input"
              />
              <button type="button" class="clear-search-btn" *ngIf="searchQuery" (click)="searchQuery = ''">&times;</button>
            </div>

            <!-- Date Range Filter -->
            <select class="filter-dropdown" [(ngModel)]="dateFilter" (change)="onFilterChange()">
              <option value="all">All Dates</option>
              <option value="today">Today Only</option>
              <option value="week">This Week</option>
              <option value="month">Past 30 Days</option>
              <option value="future">Upcoming Shifts</option>
            </select>

            <!-- Status Filter -->
            <select class="filter-dropdown" [(ngModel)]="statusFilter" (change)="onFilterChange()">
              <option value="all">All Duty Statuses</option>
              <option value="Completed">Completed</option>
              <option value="InProgress">In Progress</option>
              <option value="Scheduled">Scheduled / Confirmed</option>
              <option value="Flagged">Flagged / Late</option>
            </select>
          </div>

          <div class="toolbar-right">
            <!-- View Mode Tabs -->
            <div class="view-mode-tabs">
              <button
                type="button"
                class="view-tab"
                [class.active]="viewMode === 'table'"
                (click)="viewMode = 'table'"
                title="Duty Records Table"
              >
                <span class="material-symbols-outlined">table_rows</span>
                <span>Duty Table</span>
              </button>
              <button
                type="button"
                class="view-tab"
                [class.active]="viewMode === 'cards'"
                (click)="viewMode = 'cards'"
                title="Cards Grid"
              >
                <span class="material-symbols-outlined">grid_view</span>
                <span>Cards</span>
              </button>
              <button
                type="button"
                class="view-tab"
                [class.active]="viewMode === 'calendar'"
                (click)="viewMode = 'calendar'"
                title="Weekly Rota Calendar"
              >
                <span class="material-symbols-outlined">calendar_view_week</span>
                <span>Weekly Rota</span>
              </button>
              <button
                type="button"
                class="view-tab"
                [class.active]="viewMode === 'roster'"
                (click)="viewMode = 'roster'"
                title="Staff Roster Directory"
              >
                <span class="material-symbols-outlined">groups</span>
                <span>Staff Roster ({{ staffRoster.length }})</span>
              </button>
            </div>
          </div>
        </div>

        <!-- 4A. View 1: Duty Table (Default) -->
        <div class="cms-card" *ngIf="viewMode === 'table'">
          <div class="table-responsive" *ngIf="filteredShifts.length > 0">
            <table class="cms-table">
              <thead>
                <tr>
                  <th>SHIFT CODE</th>
                  <th>ASSIGNED STAFF &amp; POST</th>
                  <th>DUTY DATE &amp; TIMING</th>
                  <th>STATUS</th>
                  <th>GEOFENCE &amp; CLOCK-IN</th>
                  <th>DUTY REPORT</th>
                  <th>PENALTY / FINE</th>
                  <th style="text-align: right;">ACTION</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let s of filteredShifts">
                  <td>
                    <span class="code-badge">{{ s.shiftCode }}</span>
                  </td>
                  <td>
                    <div class="staff-cell">
                      <div class="staff-avatar">
                        {{ getInitials(s.assignedUserName || 'Staff Member') }}
                      </div>
                      <div class="staff-info">
                        <strong>{{ s.assignedUserName || 'Open Shift (Unassigned)' }}</strong>
                        <span class="staff-post">{{ s.postName }}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div class="timing-cell">
                      <span class="timing-date">{{ s.startsAtUtc | date:'EEE, d MMM y' }}</span>
                      <span class="timing-hours">{{ s.startsAtUtc | date:'shortTime' }} &ndash; {{ s.endsAtUtc | date:'shortTime' }}</span>
                      <span class="overnight-tag" *ngIf="s.isOvernight">Overnight</span>
                    </div>
                  </td>
                  <td>
                    <span class="status-pill" [ngClass]="getStatusClass(s)">
                      {{ s.status }}
                    </span>
                  </td>
                  <td>
                    <div class="geofence-cell">
                      <span class="geo-badge verified" *ngIf="s.isClockInGeofenceVerified">
                        <span class="material-symbols-outlined">verified</span> Verified GPS
                      </span>
                      <span class="geo-badge unverified" *ngIf="s.isClockedIn && !s.isClockInGeofenceVerified">
                        <span class="material-symbols-outlined">location_off</span> Out of Bounds
                      </span>
                      <span class="geo-badge pending" *ngIf="!s.isClockedIn">
                        <span class="material-symbols-outlined">schedule</span> Not Clocked In
                      </span>
                      <span class="late-warning" *ngIf="s.lateArrivalMinutes > 0">
                        {{ s.lateArrivalMinutes }}m late
                      </span>
                    </div>
                  </td>
                  <td>
                    <span class="report-badge submitted" *ngIf="s.reportSubmissionUtc">
                      <span class="material-symbols-outlined">description</span> Submitted
                    </span>
                    <span class="report-badge pending" *ngIf="!s.reportSubmissionUtc">
                      <span class="material-symbols-outlined">pending_actions</span> None
                    </span>
                  </td>
                  <td>
                    <span class="fine-badge attached" *ngIf="s.fineAttached">
                      <span class="material-symbols-outlined">gavel</span> ₦{{ (s.fineAmount || 0) | number:'1.0-0' }}
                    </span>
                    <span class="fine-badge none" *ngIf="!s.fineAttached">None</span>
                  </td>
                  <td style="text-align: right;">
                    <a [routerLink]="['/workforce/console/shifts', s.id, 'report']" class="btn-action-primary">
                      <span class="material-symbols-outlined">visibility</span>
                      <span>Duty Report</span>
                    </a>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="empty-state-box" *ngIf="filteredShifts.length === 0">
            <span class="material-symbols-outlined empty-icon">assignment</span>
            <h4>No duty records match your criteria</h4>
            <p>Try adjusting your search query, date filter, or status selection.</p>
          </div>
        </div>

        <!-- 4B. View 2: Cards Grid -->
        <div class="duty-cards-grid" *ngIf="viewMode === 'cards'">
          <div class="duty-card" *ngFor="let s of filteredShifts">
            <div class="duty-card-top">
              <span class="code-badge">{{ s.shiftCode }}</span>
              <span class="status-pill" [ngClass]="getStatusClass(s)">{{ s.status }}</span>
            </div>

            <div class="duty-card-staff">
              <div class="staff-avatar lg">
                {{ getInitials(s.assignedUserName || 'Staff Member') }}
              </div>
              <div>
                <h4 class="duty-staff-name">{{ s.assignedUserName || 'Open Shift (Unassigned)' }}</h4>
                <span class="duty-staff-role">{{ s.postName }}</span>
              </div>
            </div>

            <div class="duty-card-schedule">
              <div class="sched-row">
                <span class="material-symbols-outlined">event</span>
                <span>{{ s.startsAtUtc | date:'fullDate' }}</span>
              </div>
              <div class="sched-row">
                <span class="material-symbols-outlined">schedule</span>
                <span>{{ s.startsAtUtc | date:'shortTime' }} &ndash; {{ s.endsAtUtc | date:'shortTime' }}</span>
                <span class="overnight-tag" *ngIf="s.isOvernight">Overnight</span>
              </div>
            </div>

            <!-- Fine warning if attached -->
            <div class="fine-notice-banner" *ngIf="s.fineAttached">
              <span class="material-symbols-outlined text-danger">gavel</span>
              <div>
                <strong>Fine Attached: ₦{{ (s.fineAmount || 0) | number:'1.2-2' }}</strong>
                <span>{{ s.fineReason || 'Operational deduction' }}</span>
              </div>
            </div>

            <!-- Report teaser -->
            <div class="report-teaser" *ngIf="s.reportContent">
              <span class="material-symbols-outlined">chat</span>
              <p>{{ s.reportContent }}</p>
            </div>

            <div class="duty-card-footer">
              <a [routerLink]="['/workforce/console/shifts', s.id, 'report']" class="btn btn-primary full-width">
                <span class="material-symbols-outlined">visibility</span>
                <span>View Full Duty Report</span>
              </a>
            </div>
          </div>

          <div class="empty-state-box full-grid" *ngIf="filteredShifts.length === 0">
            <span class="material-symbols-outlined empty-icon">assignment</span>
            <h4>No shifts found in this view</h4>
            <p>Try switching to another date filter.</p>
          </div>
        </div>

        <!-- 4C. View 3: Weekly Calendar / Rota Grid -->
        <div class="cms-card" *ngIf="viewMode === 'calendar'">
          <div class="calendar-header-bar">
            <h4>Weekly Duty Schedule at {{ site?.siteName }}</h4>
            <span class="badge-suite">Mon &ndash; Sun Calendar Distribution</span>
          </div>
          <div class="weekly-calendar-grid">
            <div class="cal-day-col" *ngFor="let col of calendarColumns">
              <div class="cal-day-header" [class.today]="col.isToday">
                <span class="day-name">{{ col.dayName }}</span>
                <span class="day-count">{{ col.shifts.length }} shifts</span>
              </div>
              <div class="cal-shifts-list">
                <div class="cal-shift-pill" *ngFor="let cs of col.shifts" [ngClass]="getStatusClass(cs)">
                  <div class="cal-shift-time">{{ cs.startsAtUtc | date:'shortTime' }} - {{ cs.endsAtUtc | date:'shortTime' }}</div>
                  <strong class="cal-shift-name">{{ cs.assignedUserName || 'Open Shift' }}</strong>
                  <span class="cal-shift-post">{{ cs.postName }}</span>
                  <a [routerLink]="['/workforce/console/shifts', cs.id, 'report']" class="cal-view-link">
                    Duty Report &rarr;
                  </a>
                </div>
                <div class="no-shifts-day" *ngIf="col.shifts.length === 0">No duty scheduled</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 4D. View 4: Staff Roster Directory for this Site -->
        <div class="cms-card" *ngIf="viewMode === 'roster'">
          <div class="roster-header-bar">
            <div>
              <h4>Personnel Assigned to {{ site?.siteName }}</h4>
              <p class="card-subtitle">Distinct staff members deployed to this venue, their punctuality score, and logged hours.</p>
            </div>
            <span class="count-badge">{{ staffRoster.length }} Personnel</span>
          </div>

          <div class="table-responsive" *ngIf="staffRoster.length > 0">
            <table class="cms-table">
              <thead>
                <tr>
                  <th>STAFF MEMBER</th>
                  <th>ASSIGNED ROLE / POST</th>
                  <th>VENUE SHIFTS</th>
                  <th>TOTAL HOURS AT THIS POST</th>
                  <th>PUNCTUALITY AT VENUE</th>
                  <th>ATTACHED FINES</th>
                  <th>LAST ON DUTY</th>
                  <th style="text-align: right;">ACTION</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let m of staffRoster">
                  <td>
                    <div class="staff-cell">
                      <div class="staff-avatar">
                        {{ getInitials(m.fullName) }}
                      </div>
                      <div class="staff-info">
                        <strong>{{ m.fullName }}</strong>
                        <span class="staff-post">ID: {{ m.userId }}</span>
                      </div>
                    </div>
                  </td>
                  <td>{{ m.jobTitle }}</td>
                  <td>
                    <span class="metric-chip">{{ m.totalShiftsAtSite }} shifts ({{ m.completedShiftsAtSite }} completed)</span>
                  </td>
                  <td>
                    <strong>{{ m.totalHoursAtSite | number:'1.1-1' }} hrs</strong>
                  </td>
                  <td>
                    <div class="score-pill" [class.high]="m.punctualityScorePercent >= 90" [class.med]="m.punctualityScorePercent < 90 && m.punctualityScorePercent >= 75" [class.low]="m.punctualityScorePercent < 75">
                      {{ m.punctualityScorePercent | number:'1.0-0' }}% On-Time
                    </div>
                  </td>
                  <td>
                    <span class="fine-badge attached" *ngIf="m.totalFinesAmount > 0">
                      ₦{{ m.totalFinesAmount | number:'1.0-0' }}
                    </span>
                    <span class="fine-badge none" *ngIf="m.totalFinesAmount === 0">None</span>
                  </td>
                  <td>{{ m.lastDutyDateUtc | date:'mediumDate' }}</td>
                  <td style="text-align: right;">
                    <a [routerLink]="['/workforce/console/members', m.userId]" class="btn-action-primary">
                      <span class="material-symbols-outlined">person</span>
                      <span>Staff Profile</span>
                    </a>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="empty-state-box" *ngIf="staffRoster.length === 0">
            <span class="material-symbols-outlined empty-icon">group_off</span>
            <h4>No personnel have logged duty at this location yet</h4>
            <p>Assign staff to shifts at this venue to populate the roster directory.</p>
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
      margin-bottom: 0.35rem;
    }

    .title-row h1 {
      font-size: 1.5rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
      letter-spacing: -0.02em;
    }

    .subtitle {
      font-size: 0.875rem;
      color: #64748b;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 0.4rem;
      flex-wrap: wrap;
    }

    .pin-icon {
      font-size: 1rem;
      color: #0050e5;
    }

    .sep-dot {
      color: #94a3b8;
    }

    .code-badge {
      display: inline-block;
      padding: 0.2rem 0.5rem;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #0050e5;
      font-size: 0.75rem;
      font-weight: 700;
      border-radius: 0.375rem;
    }

    .badge-suite {
      display: inline-block;
      padding: 0.2rem 0.5rem;
      background: #f1f5f9;
      color: #475569;
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-radius: 0.25rem;
    }

    .radius-chip {
      padding: 0.15rem 0.45rem;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 0.25rem;
      font-size: 0.75rem;
      font-weight: 600;
      color: #334155;
    }

    .header-actions {
      display: flex;
      gap: 0.75rem;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.55rem 1rem;
      font-size: 0.875rem;
      font-weight: 600;
      border-radius: 0.5rem;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.15s ease;
      border: 1px solid transparent;
    }

    .btn-primary {
      background: #0050e5;
      color: #ffffff;
    }

    .btn-primary:hover {
      background: #0043c0;
    }

    .btn-outline {
      background: #ffffff;
      color: #334155;
      border-color: #cbd5e1;
    }

    .btn-outline:hover {
      background: #f8fafc;
      border-color: #94a3b8;
    }

    .full-width {
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

    /* 2. KPI Cards */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    @media (max-width: 1024px) {
      .metrics-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 640px) {
      .metrics-grid {
        grid-template-columns: 1fr;
      }
    }

    .kpi-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.625rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      position: relative;
      overflow: hidden;
    }

    .kpi-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
    }

    .kpi-card.blue::before { background: #0050e5; }
    .kpi-card.emerald::before { background: #10b981; }
    .kpi-card.purple::before { background: #8b5cf6; }
    .kpi-card.amber::before { background: #f59e0b; }

    .kpi-icon-box {
      width: 36px;
      height: 36px;
      border-radius: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .kpi-card.blue .kpi-icon-box { background: #eff6ff; color: #0050e5; }
    .kpi-card.emerald .kpi-icon-box { background: #ecfdf5; color: #10b981; }
    .kpi-card.purple .kpi-icon-box { background: #f5f3ff; color: #8b5cf6; }
    .kpi-card.amber .kpi-icon-box { background: #fffbeb; color: #f59e0b; }

    .kpi-info {
      display: flex;
      flex-direction: column;
    }

    .kpi-value {
      font-size: 1.625rem;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.02em;
    }

    .kpi-label {
      font-size: 0.8125rem;
      font-weight: 600;
      color: #64748b;
    }

    .kpi-sub {
      font-size: 0.75rem;
      color: #94a3b8;
    }

    /* 3. Toolbar */
    .toolbar-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
      padding: 0.875rem 1.25rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.25rem;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .toolbar-left {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex: 1;
      flex-wrap: wrap;
    }

    .search-input-box {
      position: relative;
      display: flex;
      align-items: center;
      min-width: 280px;
    }

    .search-input-box span {
      position: absolute;
      left: 0.75rem;
      color: #94a3b8;
      font-size: 1.125rem;
    }

    .search-input {
      width: 100%;
      padding: 0.5rem 2rem 0.5rem 2.25rem;
      font-size: 0.875rem;
      border: 1px solid #cbd5e1;
      border-radius: 0.5rem;
      background: #ffffff;
      outline: none;
    }

    .search-input:focus {
      border-color: #0050e5;
      box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.1);
    }

    .clear-search-btn {
      position: absolute;
      right: 0.5rem;
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 1.125rem;
      cursor: pointer;
    }

    .filter-dropdown {
      padding: 0.5rem 0.875rem;
      border: 1px solid #cbd5e1;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      background: #ffffff;
      color: #334155;
      outline: none;
    }

    .view-mode-tabs {
      display: flex;
      gap: 0.25rem;
      background: #f1f5f9;
      padding: 0.25rem;
      border-radius: 0.5rem;
    }

    .view-tab {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.4rem 0.75rem;
      border: none;
      background: transparent;
      border-radius: 0.375rem;
      font-size: 0.8125rem;
      font-weight: 600;
      color: #64748b;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .view-tab span.material-symbols-outlined {
      font-size: 1.125rem;
    }

    .view-tab:hover {
      color: #0f172a;
    }

    .view-tab.active {
      background: #ffffff;
      color: #0050e5;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    }

    /* 4. Common CMS Table & Cards */
    .cms-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      overflow: hidden;
    }

    .table-responsive {
      overflow-x: auto;
    }

    .cms-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.875rem;
    }

    .cms-table th {
      padding: 0.75rem 1rem;
      font-size: 0.6875rem;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      border-bottom: 1px solid #e2e8f0;
      background: #f8fafc;
    }

    .cms-table td {
      padding: 0.875rem 1rem;
      border-bottom: 1px solid #f1f5f9;
      color: #334155;
      vertical-align: middle;
    }

    .cms-table tr:hover td {
      background: #f8fafc;
    }

    .staff-cell {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .staff-avatar {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: #0050e5;
      color: #ffffff;
      font-size: 0.75rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .staff-avatar.lg {
      width: 44px;
      height: 44px;
      font-size: 1rem;
    }

    .staff-info strong {
      display: block;
      color: #0f172a;
      font-size: 0.875rem;
    }

    .staff-post {
      font-size: 0.75rem;
      color: #64748b;
    }

    .timing-cell {
      display: flex;
      flex-direction: column;
    }

    .timing-date {
      font-weight: 600;
      color: #0f172a;
      font-size: 0.8125rem;
    }

    .timing-hours {
      font-size: 0.75rem;
      color: #64748b;
    }

    .overnight-tag {
      display: inline-block;
      font-size: 0.6875rem;
      color: #7c3aed;
      font-weight: 600;
    }

    .status-pill {
      display: inline-block;
      padding: 0.2rem 0.6rem;
      border-radius: 1rem;
      font-size: 0.75rem;
      font-weight: 700;
    }

    .status-completed { background: #ecfdf5; color: #059669; }
    .status-in-progress { background: #eff6ff; color: #0050e5; }
    .status-scheduled { background: #f8fafc; color: #475569; border: 1px solid #e2e8f0; }
    .status-flagged { background: #fef2f2; color: #dc2626; }

    .geofence-cell {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .geo-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .geo-badge span { font-size: 0.875rem; }
    .geo-badge.verified { color: #16a34a; }
    .geo-badge.unverified { color: #dc2626; }
    .geo-badge.pending { color: #94a3b8; }

    .late-warning {
      font-size: 0.6875rem;
      color: #dc2626;
      font-weight: 700;
    }

    .report-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.2rem 0.5rem;
      border-radius: 0.25rem;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .report-badge span { font-size: 0.875rem; }
    .report-badge.submitted { background: #eff6ff; color: #0050e5; }
    .report-badge.pending { background: #f1f5f9; color: #94a3b8; }

    .fine-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.2rem 0.5rem;
      border-radius: 0.25rem;
      font-size: 0.75rem;
      font-weight: 700;
    }

    .fine-badge span { font-size: 0.875rem; }
    .fine-badge.attached { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
    .fine-badge.none { color: #94a3b8; }

    .btn-action-primary {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.4rem 0.75rem;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #0050e5;
      border-radius: 0.375rem;
      font-size: 0.8125rem;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.15s ease;
    }

    .btn-action-primary:hover {
      background: #0050e5;
      color: #ffffff;
    }

    .btn-action-primary span.material-symbols-outlined {
      font-size: 1rem;
    }

    /* Cards Grid */
    .duty-cards-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.25rem;
    }

    @media (max-width: 1024px) {
      .duty-cards-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 640px) {
      .duty-cards-grid {
        grid-template-columns: 1fr;
      }
    }

    .duty-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }

    .duty-card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .duty-card-staff {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .duty-staff-name {
      font-size: 1rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }

    .duty-staff-role {
      font-size: 0.75rem;
      color: #64748b;
    }

    .duty-card-schedule {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      padding: 0.75rem;
      background: #f8fafc;
      border-radius: 0.5rem;
      font-size: 0.8125rem;
    }

    .sched-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #334155;
    }

    .sched-row span.material-symbols-outlined {
      font-size: 1rem;
      color: #64748b;
    }

    .fine-notice-banner {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      padding: 0.625rem 0.75rem;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 0.375rem;
      font-size: 0.75rem;
    }

    .fine-notice-banner strong {
      display: block;
      color: #b91c1c;
    }

    .fine-notice-banner span {
      color: #7f1d1d;
    }

    .report-teaser {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      background: #f1f5f9;
      border-radius: 0.375rem;
      font-size: 0.75rem;
      color: #475569;
    }

    .report-teaser p {
      margin: 0;
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    /* Weekly Calendar */
    .calendar-header-bar {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #f1f5f9;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .calendar-header-bar h4 {
      margin: 0;
      font-size: 1rem;
      font-weight: 700;
      color: #0f172a;
    }

    .weekly-calendar-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      min-height: 380px;
      overflow-x: auto;
    }

    .cal-day-col {
      border-right: 1px solid #f1f5f9;
      padding: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .cal-day-col:last-child {
      border-right: none;
    }

    .cal-day-header {
      padding-bottom: 0.5rem;
      border-bottom: 2px solid #e2e8f0;
      text-align: center;
    }

    .cal-day-header.today {
      border-bottom-color: #0050e5;
    }

    .day-name {
      display: block;
      font-size: 0.8125rem;
      font-weight: 700;
      color: #0f172a;
    }

    .day-count {
      font-size: 0.6875rem;
      color: #64748b;
    }

    .cal-shifts-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .cal-shift-pill {
      padding: 0.6rem;
      border-radius: 0.5rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      font-size: 0.75rem;
    }

    .cal-shift-time {
      font-size: 0.6875rem;
      color: #64748b;
      font-weight: 600;
    }

    .cal-shift-name {
      color: #0f172a;
    }

    .cal-shift-post {
      font-size: 0.6875rem;
      color: #64748b;
    }

    .cal-view-link {
      font-size: 0.6875rem;
      font-weight: 700;
      color: #0050e5;
      text-decoration: none;
      margin-top: 0.25rem;
    }

    .no-shifts-day {
      padding: 1.5rem 0.5rem;
      text-align: center;
      font-size: 0.75rem;
      color: #cbd5e1;
    }

    /* Roster */
    .roster-header-bar {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #f1f5f9;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .roster-header-bar h4 {
      margin: 0 0 0.2rem 0;
      font-size: 1rem;
      font-weight: 700;
      color: #0f172a;
    }

    .card-subtitle {
      font-size: 0.8125rem;
      color: #64748b;
      margin: 0;
    }

    .count-badge {
      padding: 0.25rem 0.6rem;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #0050e5;
      border-radius: 1rem;
      font-size: 0.75rem;
      font-weight: 700;
    }

    .metric-chip {
      display: inline-block;
      padding: 0.2rem 0.5rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 0.25rem;
      font-size: 0.75rem;
      color: #334155;
    }

    .score-pill {
      display: inline-block;
      padding: 0.2rem 0.5rem;
      border-radius: 0.25rem;
      font-size: 0.75rem;
      font-weight: 700;
    }

    .score-pill.high { background: #ecfdf5; color: #059669; }
    .score-pill.med { background: #fffbeb; color: #d97706; }
    .score-pill.low { background: #fef2f2; color: #dc2626; }

    .empty-state-box {
      padding: 3rem 1.5rem;
      text-align: center;
      color: #64748b;
    }

    .empty-icon {
      font-size: 3rem;
      color: #cbd5e1;
      margin-bottom: 0.5rem;
    }

    .empty-state-box h4 {
      margin: 0 0 0.35rem 0;
      font-size: 1.125rem;
      color: #0f172a;
    }

    .empty-state-box p {
      margin: 0;
      font-size: 0.875rem;
    }

    .full-grid {
      grid-column: 1 / -1;
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
  `]
})
export class WorkforceSiteActivityComponent implements OnInit {
  siteId = '';
  site: ClientSite | null = null;
  isLoading = false;

  // View Mode: 'table' | 'cards' | 'calendar' | 'roster'
  viewMode: 'table' | 'cards' | 'calendar' | 'roster' = 'table';

  // Filters
  searchQuery = '';
  dateFilter = 'all';
  statusFilter = 'all';

  // Raw Data
  allShifts: any[] = [];
  staffRoster: SiteStaffRosterItem[] = [];

  // Summary Metrics
  totalShiftsCount = 0;
  activeShiftsCount = 0;
  completedShiftsCount = 0;
  scheduledShiftsCount = 0;
  totalHoursLogged = 0;
  totalFinesAmount = 0;
  finesCount = 0;
  uniqueStaffCount = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private workforceService: WorkforceService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      if (params['id']) {
        this.siteId = params['id'];
        this.loadActivityData();
      }
    });
  }

  loadActivityData(): void {
    this.isLoading = true;
    this.workforceService.getSiteActivity(this.siteId).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        const data = res?.data || res;
        if (!data) return;

        this.site = data.site;
        this.allShifts = data.shifts || [];
        this.staffRoster = data.staffRoster || [];

        this.totalShiftsCount = data.totalShiftsCount || 0;
        this.activeShiftsCount = data.activeShiftsCount || 0;
        this.completedShiftsCount = data.completedShiftsCount || 0;
        this.scheduledShiftsCount = data.scheduledShiftsCount || 0;
        this.totalHoursLogged = data.totalHoursLogged || 0;
        this.totalFinesAmount = data.totalFinesAmount || 0;
        this.uniqueStaffCount = data.uniqueStaffCount || 0;
        this.finesCount = this.allShifts.filter((s: any) => s.fineAttached).length;
      },
      error: (err) => {
        this.isLoading = false;
        this.toast.error(err?.error?.message || 'Failed to load venue duty history.');
      }
    });
  }

  get filteredShifts(): any[] {
    let list = this.allShifts;

    // Search query
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter((s) =>
        (s.assignedUserName && s.assignedUserName.toLowerCase().includes(q)) ||
        (s.postName && s.postName.toLowerCase().includes(q)) ||
        (s.shiftCode && s.shiftCode.toLowerCase().includes(q))
      );
    }

    // Status filter
    if (this.statusFilter !== 'all') {
      if (this.statusFilter === 'Scheduled') {
        list = list.filter((s) => s.status === 'Scheduled' || s.status === 'Confirmed');
      } else if (this.statusFilter === 'Flagged') {
        list = list.filter((s) => s.isFlagged || s.lateArrivalMinutes > 0 || s.fineAttached);
      } else {
        list = list.filter((s) => s.status === this.statusFilter);
      }
    }

    // Date filter
    const now = new Date();
    if (this.dateFilter === 'today') {
      const todayStr = this.formatDate(now);
      list = list.filter((s) => this.formatDate(new Date(s.startsAtUtc)) === todayStr);
    } else if (this.dateFilter === 'week') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);
      list = list.filter((s) => new Date(s.startsAtUtc) >= sevenDaysAgo);
    } else if (this.dateFilter === 'month') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);
      list = list.filter((s) => new Date(s.startsAtUtc) >= thirtyDaysAgo);
    } else if (this.dateFilter === 'future') {
      list = list.filter((s) => new Date(s.startsAtUtc) >= now);
    }

    return list;
  }

  get calendarColumns(): { dayName: string; isToday: boolean; shifts: any[] }[] {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const nowDay = (new Date().getDay() + 6) % 7; // Convert 0(Sun)->6, 1(Mon)->0

    return days.map((dayName, idx) => {
      // Map to shifts whose startsAtUtc falls on this day of week
      const dayShifts = this.filteredShifts.filter((s) => {
        const d = new Date(s.startsAtUtc);
        const shiftDayIdx = (d.getDay() + 6) % 7;
        return shiftDayIdx === idx;
      });

      return {
        dayName,
        isToday: idx === nowDay,
        shifts: dayShifts
      };
    });
  }

  onFilterChange(): void {
    // Triggers getter recalculation
  }

  getStatusClass(s: any): string {
    if (s.isFlagged || s.fineAttached) return 'status-flagged';
    if (s.status === 'Completed') return 'status-completed';
    if (s.status === 'InProgress') return 'status-in-progress';
    return 'status-scheduled';
  }

  getInitials(name: string): string {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  private formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
