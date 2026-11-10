import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { WorkforceService, Shift, ClientSite } from '../../../core/services/workforce.service';
import { ToastService } from '../../../core/services/toast.service';

/**
 * Administrator Master Rota & Scheduling Grid (`/admin/workforce/schedule`).
 * Supports weekly duty rosters, 24/7 cross-midnight overnight shifts, break deductions,
 * post assignment, workstation links, and conflict detection.
 */
@Component({
  selector: 'app-workforce-schedule',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="bcp-page-container">
      <!-- 1. Canonical Page Header -->
      <div class="page-header">
        <div class="header-left">
          <div class="breadcrumb">
            <a routerLink="/admin/dashboard">Command Center</a>
            <span class="sep">/</span>
            <span>Workforce &amp; Shifts</span>
            <span class="sep">/</span>
            <span class="current">Staff Rota &amp; Schedule</span>
          </div>
          <div class="title-row">
            <h1>Staff Rota &amp; Shift Management</h1>
            <button type="button" class="info-trigger-btn" (click)="showInfoModal = true" title="Rota &amp; Scheduling Info">
              <span class="material-symbols-outlined">info</span>
            </button>
            <span class="badge-suite">Suite: Workforce &amp; Shifts</span>
          </div>
          <p class="subtitle">Multi-site shift scheduling, 24/7 overnight rosters, and conflict protection.</p>
        </div>
        <div class="header-actions">
          <a routerLink="/workforce/console/analytics" class="btn btn-outline" title="Back to Workforce Analytics & Hub">
            <span class="material-symbols-outlined">arrow_back</span>
            <span>Back to Hub</span>
          </a>
          <button type="button" class="btn btn-outline" (click)="loadData()">
            <span class="material-symbols-outlined" [class.spin]="isLoading">refresh</span>
            <span>Refresh</span>
          </button>
          <button type="button" class="btn btn-primary" (click)="openCreateModal()">
            <span class="material-symbols-outlined">add</span>
            <span>Create Shift</span>
          </button>
        </div>
      </div>

      <!-- 2. View Switcher & Filters Toolbar -->
      <div class="toolbar-card">
        <div class="toolbar-top">
          <div class="view-mode-toggle">
            <button
              type="button"
              class="view-btn"
              [class.active]="activeView === 'list'"
              (click)="activeView = 'list'"
            >
              <span class="material-symbols-outlined">table_rows</span>
              <span>Roster List</span>
            </button>
            <button
              type="button"
              class="view-btn"
              [class.active]="activeView === 'timesheet'"
              (click)="activeView = 'timesheet'"
            >
              <span class="material-symbols-outlined">assignment</span>
              <span>Daily Timesheet</span>
            </button>
            <button
              type="button"
              class="view-btn"
              [class.active]="activeView === 'calendar'"
              (click)="activeView = 'calendar'"
            >
              <span class="material-symbols-outlined">calendar_month</span>
              <span>Monthly Calendar</span>
            </button>
          </div>

          <div class="count-badge-wrap">
            <span class="count-badge">
              <strong>{{ filteredShifts.length }}</strong> Planned Shifts
            </span>
          </div>
        </div>

        <div class="filters-row">
          <div class="filter-item">
            <label class="filter-label">Filter by Operating Site</label>
            <select class="filter-dropdown" [(ngModel)]="selectedSiteId" (change)="applyFilters()">
              <option value="">All Operating Sites</option>
              <option *ngFor="let site of sites" [value]="site.id">{{ site.siteName }} ({{ site.siteCode }})</option>
            </select>
          </div>

          <div class="filter-item">
            <label class="filter-label">Filter by Status</label>
            <select class="filter-dropdown" [(ngModel)]="selectedStatus" (change)="applyFilters()">
              <option value="">All Statuses</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Confirmed">Confirmed</option>
              <option value="InProgress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          <div class="filter-item">
            <label class="filter-label">Filter by Date</label>
            <div class="date-input-wrap">
              <input type="date" class="date-input" [(ngModel)]="selectedDateFilter" (change)="applyFilters()" />
              <button
                type="button"
                class="btn-clear-date"
                *ngIf="selectedDateFilter"
                (click)="selectedDateFilter = ''; applyFilters()"
                title="Clear date filter"
              >
                &times;
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div class="loading-state-card" *ngIf="isLoading && shifts.length === 0">
        <div class="spinner-ring"></div>
        <p>Loading duty schedule and post rosters...</p>
      </div>

      <!-- 3. Shifts Views Container -->
      <ng-container *ngIf="!isLoading || shifts.length > 0">
        <!-- View 1: Roster List Table -->
        <div class="cms-card" *ngIf="activeView === 'list' && filteredShifts.length > 0">
          <div class="table-responsive">
            <table class="cms-table">
              <thead>
                <tr>
                  <th>SHIFT REF</th>
                  <th>OPERATING SITE &amp; POST</th>
                  <th>FACILITY / ADDRESS</th>
                  <th>ASSIGNED OFFICER</th>
                  <th>DATE &amp; HOURS</th>
                  <th>BREAK / NET</th>
                  <th>RATE / PAY</th>
                  <th>ACCEPTANCE</th>
                  <th>STATUS</th>
                  <th style="text-align: right;">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let s of filteredShifts">
                  <td>
                    <span class="code-badge">{{ s.shiftCode }}</span>
                  </td>
                  <td>
                    <div class="site-cell">
                      <strong>{{ s.siteName }}</strong>
                      <span class="post-sub">
                        <span class="material-symbols-outlined">location_on</span>
                        {{ s.postName }}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div class="facility-cell">
                      <span>{{ s.facilityName || s.siteName }}</span>
                      <small class="postal-sub" *ngIf="s.postCode">{{ s.postCode }}</small>
                    </div>
                  </td>
                  <td>
                    <div class="officer-cell">
                      <span class="avatar-circle">{{ getInitials(s.assignedUserName) }}</span>
                      <div class="officer-meta">
                        <div class="officer-name">{{ s.assignedUserName || 'Open / Unassigned' }}</div>
                        <span class="confirmed-pill" *ngIf="s.isConfirmedByGuard">✓ Confirmed</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div class="time-cell">
                      <span class="date-text">{{ s.startsAtUtc | date:'shortDate' }}</span>
                      <div class="hours-row">
                        <span>{{ s.startsAtUtc | date:'HH:mm' }} - {{ s.endsAtUtc | date:'HH:mm' }}</span>
                        <span class="overnight-chip" *ngIf="s.isOvernight" title="24/7 Overnight shift crossing midnight">
                          🌙 Overnight
                        </span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div class="duration-cell">
                      <strong>{{ s.plannedDurationHours }} hrs</strong>
                      <small class="break-sub" *ngIf="s.breakMinutes > 0">{{ s.breakMinutes }}m break</small>
                    </div>
                  </td>
                  <td>
                    <span class="rate-badge">{{ s.hourlyPayRate ? currencySymbol + (s.hourlyPayRate | number:'1.2-2') + '/h' : '—' }}</span>
                  </td>
                  <td>
                    <span class="badge-status accepted" *ngIf="s.isConfirmedByGuard">Accepted</span>
                    <span
                      class="badge-status countdown"
                      *ngIf="!s.isConfirmedByGuard && s.assignedUserId"
                      [ngClass]="getAcceptanceCountdownClass(s)"
                    >
                      {{ getAcceptanceCountdown(s) }}
                    </span>
                    <span class="badge-status open" *ngIf="!s.assignedUserId">Open Shift</span>
                  </td>
                  <td>
                    <span class="badge-status" [ngClass]="getStatusBadge(s.status)">{{ s.status }}</span>
                  </td>
                  <td style="text-align: right;">
                    <button type="button" class="btn-action-sm" (click)="viewShiftDetails(s)">
                      <span class="material-symbols-outlined">visibility</span>
                      <span>Details</span>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- View 2: Daily Timesheet Summary View -->
        <div class="cms-card" *ngIf="activeView === 'timesheet' && filteredShifts.length > 0">
          <div class="timesheet-header">
            <div>
              <h3>Daily Timesheet Summary</h3>
              <p class="timesheet-sub">Cross-comparison of scheduled hours versus verified attendance logs.</p>
            </div>
            <span class="date-window-badge" *ngIf="selectedDateFilter">
              Filtered: {{ selectedDateFilter }}
            </span>
          </div>

          <div class="table-responsive">
            <table class="cms-table">
              <thead>
                <tr>
                  <th>STAFF OFFICER</th>
                  <th>POST CODE</th>
                  <th>START TIME</th>
                  <th>END TIME</th>
                  <th>ACCEPTANCE STATUS</th>
                  <th>COUNTDOWN</th>
                  <th>LIVE DUTY STATUS</th>
                  <th>RATE / HOUR</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let s of filteredShifts">
                  <td>
                    <div class="officer-name-bold">{{ s.assignedUserName || 'Unassigned Staff' }}</div>
                    <small class="user-sub">{{ s.assignedUserId || 'Open Roster' }}</small>
                  </td>
                  <td>
                    <span class="code-badge">{{ s.postCode || 'N/A' }}</span>
                  </td>
                  <td>
                    <span class="time-bold">{{ s.startsAtUtc | date:'dd MMM yyyy, HH:mm' }}</span>
                  </td>
                  <td>
                    <span class="time-bold">{{ s.endsAtUtc | date:'dd MMM yyyy, HH:mm' }}</span>
                  </td>
                  <td>
                    <span
                      class="badge-status"
                      [class.accepted]="s.isConfirmedByGuard"
                      [class.pending]="!s.isConfirmedByGuard && s.assignedUserId"
                      [class.open]="!s.assignedUserId"
                    >
                      {{ s.isConfirmedByGuard ? 'Accepted' : (s.assignedUserId ? 'Pending' : 'Open') }}
                    </span>
                  </td>
                  <td>
                    <span class="countdown-text" [ngClass]="getAcceptanceCountdownClass(s)">
                      {{ getAcceptanceCountdown(s) }}
                    </span>
                  </td>
                  <td>
                    <span class="live-duty-active" *ngIf="s.isClockedIn">
                      <span class="live-dot"></span> Active on Site
                    </span>
                    <span class="live-duty-done" *ngIf="s.isClockedOut">Clocked Out</span>
                    <span class="text-muted-mini" *ngIf="!s.isClockedIn && !s.isClockedOut">—</span>
                  </td>
                  <td>
                    <span class="rate-bold">{{ s.hourlyPayRate ? currencySymbol + (s.hourlyPayRate | number:'1.2-2') : (currencySymbol + '10.00') }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- View 3: Monthly Calendar View -->
        <div class="cms-card calendar-card" *ngIf="activeView === 'calendar'">
          <div class="calendar-nav-bar">
            <h3>{{ currentCalendarDate | date:'MMMM yyyy' }}</h3>
            <div class="calendar-controls">
              <button type="button" class="btn btn-outline btn-sm" (click)="navigateMonth(-1)">
                &larr; Previous
              </button>
              <button type="button" class="btn btn-outline btn-sm" (click)="currentCalendarDate = currentToday; buildCalendar()">
                Current Month
              </button>
              <button type="button" class="btn btn-outline btn-sm" (click)="navigateMonth(1)">
                Next &rarr;
              </button>
            </div>
          </div>

          <div class="calendar-scroll-wrap">
            <div class="calendar-grid">
              <div class="calendar-header-day" *ngFor="let dayName of ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']">
                {{ dayName }}
              </div>
              <div
                class="calendar-day-cell"
                *ngFor="let c of calendarDays"
                [class.not-current-month]="!c.isCurrentMonth"
                [class.is-today]="c.isToday"
                (click)="selectCalendarDay(c)"
              >
                <div class="day-number">{{ c.dayNum }}</div>
                <div class="day-shifts-pill" *ngIf="c.shiftsCount > 0">
                  <span>{{ c.shiftsCount }} {{ c.shiftsCount === 1 ? 'shift' : 'shifts' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State Card (When filteredShifts is 0 and not in Calendar view) -->
        <div class="empty-state-card" *ngIf="filteredShifts.length === 0 && activeView !== 'calendar'">
          <div class="empty-icon-circle">
            <span class="material-symbols-outlined">calendar_month</span>
          </div>
          <h3>No Shifts Found</h3>
          <p *ngIf="selectedSiteId || selectedStatus || selectedDateFilter">
            No shifts match your currently selected filters. Clear your filters to inspect the full roster.
          </p>
          <p *ngIf="!selectedSiteId && !selectedStatus && !selectedDateFilter">
            Plan your first 24/7 or day shift by clicking "Create Shift".
          </p>
          <button type="button" class="btn btn-primary" (click)="openCreateModal()">
            <span class="material-symbols-outlined">add</span>
            <span>Create Shift</span>
          </button>
        </div>
      </ng-container>

      <!-- 4. Create Shift Modal (Assign User to Sheet) -->
      <div class="modal-backdrop" *ngIf="showCreateModal" (click)="showCreateModal = false">
        <div class="modal-card modal-large" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div class="modal-title-group">
              <span class="material-symbols-outlined text-blue">schedule</span>
              <div>
                <h3>Create Shift &amp; Assign to Sheet</h3>
                <p class="modal-subtitle">Schedule guard duty with 24/7 cross-midnight logic and acceptance deadlines.</p>
              </div>
            </div>
            <button type="button" class="btn-close" (click)="showCreateModal = false">&times;</button>
          </div>

          <div class="modal-body">
            <div class="form-row-dual">
              <div class="form-group">
                <label class="form-label">Operating Client Site <span class="required">*</span></label>
                <select class="form-control" [(ngModel)]="newShift.clientSiteId" (change)="onSiteSelected()">
                  <option value="">Select operating site...</option>
                  <option *ngFor="let site of sites" [value]="site.id">{{ site.siteName }} ({{ site.siteCode }})</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Facility / Venue Name</label>
                <input
                  type="text"
                  class="form-control"
                  [(ngModel)]="newShift.facilityName"
                  placeholder="e.g. Oakleigh Park Care Home"
                />
              </div>
            </div>

            <div class="form-row-dual">
              <div class="form-group">
                <label class="form-label">Street Address</label>
                <input
                  type="text"
                  class="form-control"
                  [(ngModel)]="newShift.address"
                  placeholder="e.g. 55 Oakleigh Park North, London"
                />
              </div>
              <div class="form-group">
                <label class="form-label">Postal Code</label>
                <input
                  type="text"
                  class="form-control"
                  [(ngModel)]="newShift.postCode"
                  placeholder="e.g. N20 9NH"
                />
              </div>
            </div>

            <div class="form-row-dual">
              <div class="form-group">
                <label class="form-label">Post Name / Duty Role <span class="required">*</span></label>
                <input
                  type="text"
                  class="form-control"
                  [(ngModel)]="newShift.postName"
                  placeholder="e.g. Main Gatehouse, Floor Warden"
                />
              </div>
              <div class="form-group">
                <label class="form-label">Assign Staff Member (Leave blank for Open Shift)</label>
                <input
                  type="text"
                  class="form-control"
                  [(ngModel)]="newShift.assignedUserName"
                  placeholder="e.g. First Last"
                />
              </div>
            </div>

            <div class="form-row-dual">
              <div class="form-group">
                <label class="form-label">Shift Start Time (Local) <span class="required">*</span></label>
                <input
                  type="datetime-local"
                  class="form-control"
                  [(ngModel)]="newShiftStart"
                  (change)="calculateDuration()"
                />
              </div>
              <div class="form-group">
                <label class="form-label">Shift End Time (Local) <span class="required">*</span></label>
                <input
                  type="datetime-local"
                  class="form-control"
                  [(ngModel)]="newShiftEnd"
                  (change)="calculateDuration()"
                />
              </div>
            </div>

            <!-- Overnight Banner Alert -->
            <div class="overnight-banner" *ngIf="isOvernightShift">
              <span class="material-symbols-outlined">bedtime</span>
              <span><strong>24/7 Overnight Shift Detected:</strong> This shift ends on a subsequent calendar day and correctly calculates duration across midnight.</span>
            </div>

            <div class="form-row-triple">
              <div class="form-group">
                <label class="form-label">Pay Rate ({{ currencySymbol }}/hr)</label>
                <input
                  type="number"
                  step="0.5"
                  class="form-control"
                  [(ngModel)]="newShift.hourlyPayRate"
                  placeholder="e.g. 15.00"
                />
              </div>
              <div class="form-group">
                <label class="form-label">Unpaid Break (Minutes)</label>
                <input
                  type="number"
                  step="15"
                  class="form-control"
                  [(ngModel)]="newShift.breakMinutes"
                  (change)="calculateDuration()"
                  placeholder="e.g. 30"
                />
              </div>
              <div class="form-group">
                <label class="form-label">Planned Net Hours</label>
                <input
                  type="text"
                  class="form-control readonly-input"
                  [value]="calculatedDuration + ' hrs'"
                  readonly
                />
              </div>
            </div>

            <div class="form-row-dual">
              <div class="form-group">
                <label class="form-label">Acceptance Countdown Deadline</label>
                <input
                  type="datetime-local"
                  class="form-control"
                  [(ngModel)]="newShiftAcceptanceDeadline"
                />
                <span class="form-help">If unaccepted before this deadline, the shift reverts to the open board.</span>
              </div>
              <div class="form-group">
                <label class="form-label">Workstation Gatekeeper (Optional)</label>
                <input
                  type="text"
                  class="form-control"
                  [(ngModel)]="newShift.requiredWorkspaceStationName"
                  placeholder="e.g. Gatehouse PC #1"
                />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Post Instructions / Briefing Notes</label>
              <textarea
                class="form-control"
                rows="2"
                [(ngModel)]="newShift.notes"
                placeholder="Special post instructions, key codes, and handover procedures..."
              ></textarea>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-outline" (click)="showCreateModal = false">Cancel</button>
            <button type="button" class="btn btn-primary" (click)="submitCreateShift()" [disabled]="isSubmitting">
              <span class="material-symbols-outlined" *ngIf="!isSubmitting">save</span>
              <span>{{ isSubmitting ? 'Saving...' : 'Save Shift' }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 5. Info Modal (i) -->
      <div class="modal-backdrop" *ngIf="showInfoModal" (click)="showInfoModal = false">
        <div class="modal-card modal-large" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div class="modal-title-group">
              <span class="material-symbols-outlined text-blue">info</span>
              <div>
                <h3>Staff Rota &amp; Shift Management Guide</h3>
                <p class="modal-subtitle">Architecture overview for multi-venue rotas, 24/7 cross-midnight logic, and workstation locks.</p>
              </div>
            </div>
            <button type="button" class="btn-close" (click)="showInfoModal = false">&times;</button>
          </div>

          <div class="modal-body info-guide-body">
            <div class="info-guide-section">
              <h4><span class="material-symbols-outlined text-blue">event_note</span> Multi-Site Shift Scheduling</h4>
              <p>
                Manage rosters across all customer sites with automatic conflict protection preventing accidental double-booking of any officer.
              </p>
            </div>

            <div class="info-guide-section">
              <h4><span class="material-symbols-outlined text-purple">bedtime</span> 24/7 Overnight Cross-Midnight Logic</h4>
              <p>
                Shifts spanning into the subsequent calendar day (e.g. 20:00 to 06:00) seamlessly calculate net hours across midnight without date truncation.
              </p>
            </div>

            <div class="info-guide-section">
              <h4><span class="material-symbols-outlined text-green">computer</span> Workstation Gatekeeper</h4>
              <p>
                Assigning a designated physical workstation locks desktop terminal access until the officer actively clocks in on site via verified GPS geofence proximity.
              </p>
            </div>
          </div>

          <div class="modal-footer" style="display: flex; justify-content: space-between; align-items: center;">
            <button type="button" class="btn btn-outline" (click)="showInfoModal = false; startTour()">
              <span class="material-symbols-outlined">play_circle</span>
              <span>Replay Tour</span>
            </button>
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
      gap: 24px;
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
    .breadcrumb .sep {
      color: #cbd5e1;
    }
    .breadcrumb .current {
      color: #334155;
      font-weight: 600;
    }
    .title-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 4px;
    }
    .title-row h1 {
      font-size: 26px;
      font-weight: 800;
      color: var(--md-sys-color-on-surface, #0f172a);
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
    .info-trigger-btn, .tour-btn {
      background: none;
      border: none;
      padding: 0;
      cursor: pointer;
      color: #64748b;
      display: inline-flex;
      align-items: center;
      transition: color 0.2s;
    }
    .info-trigger-btn:hover, .tour-btn:hover {
      color: #0050e5;
    }
    .subtitle {
      color: #64748b;
      font-size: 14px;
      margin: 0;
    }
    .header-actions {
      display: flex;
      gap: 12px;
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.2s;
    }
    .btn-primary {
      background: #0050e5;
      color: #ffffff;
      border: 1px solid #0050e5;
    }
    .btn-primary:hover:not(:disabled) {
      background: #003ebd;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 80, 229, 0.25);
    }
    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .btn-outline {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      color: #334155;
    }
    .btn-outline:hover {
      background: #f8fafc;
      border-color: #94a3b8;
    }
    .btn-sm {
      padding: 6px 12px;
      font-size: 12px;
    }
    .spin {
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      100% { transform: rotate(360deg); }
    }

    /* Toolbar Card */
    .toolbar-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.02);
    }
    .toolbar-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }
    .view-mode-toggle {
      display: inline-flex;
      background: #f1f5f9;
      padding: 3px;
      border-radius: 8px;
      gap: 2px;
    }
    .view-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 6px;
      border: none;
      background: none;
      font-size: 12.5px;
      font-weight: 600;
      color: #64748b;
      cursor: pointer;
      transition: all 0.15s;
    }
    .view-btn .material-symbols-outlined {
      font-size: 16px;
    }
    .view-btn.active {
      background: #ffffff;
      color: #0050e5;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }
    .count-badge {
      font-size: 12px;
      font-weight: 700;
      background: #eff6ff;
      color: #0050e5;
      padding: 4px 12px;
      border-radius: 12px;
      border: 1px solid #bfdbfe;
    }

    .filters-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      padding-top: 14px;
      border-top: 1px solid #f1f5f9;
    }
    .filter-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .filter-label {
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
    }
    .filter-dropdown, .date-input {
      padding: 8px 12px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 13px;
      color: #334155;
      background: #ffffff;
      outline: none;
    }
    .date-input-wrap {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .date-input-wrap .date-input {
      flex: 1;
    }
    .btn-clear-date {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      color: #64748b;
      font-size: 16px;
      cursor: pointer;
      padding: 4px 8px;
    }

    /* CMS Card & Table */
    .cms-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 15px rgba(0,0,0,0.02);
    }
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
      white-space: nowrap;
    }
    .cms-table tbody tr {
      border-bottom: 1px solid #f1f5f9;
      transition: background 0.15s;
    }
    .cms-table tbody tr:hover {
      background: #f8fafc;
    }
    .cms-table tbody td {
      padding: 14px 20px;
      font-size: 13px;
      color: #334155;
      vertical-align: middle;
    }

    .code-badge {
      font-size: 12px;
      font-weight: 800;
      font-family: monospace;
      color: #0050e5;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      padding: 3px 8px;
      border-radius: 6px;
    }
    .site-cell {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .post-sub {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      font-size: 12px;
      color: #64748b;
    }
    .post-sub .material-symbols-outlined {
      font-size: 14px;
      color: #0050e5;
    }
    .facility-cell {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .postal-sub {
      font-size: 11.5px;
      color: #94a3b8;
    }

    .officer-cell {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .avatar-circle {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: #eff6ff;
      color: #0050e5;
      font-weight: 700;
      font-size: 12px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      border: 1px solid #bfdbfe;
    }
    .officer-meta {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .officer-name {
      font-weight: 600;
      color: #0f172a;
    }
    .confirmed-pill {
      font-size: 10.5px;
      font-weight: 700;
      color: #16a34a;
    }

    .time-cell {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .date-text {
      font-size: 11.5px;
      color: #64748b;
    }
    .hours-row {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 600;
      color: #0f172a;
    }
    .overnight-chip {
      font-size: 10.5px;
      font-weight: 700;
      background: #faf5ff;
      color: #7e22ce;
      padding: 1px 6px;
      border-radius: 4px;
      border: 1px solid #e9d5ff;
    }

    .duration-cell {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .break-sub {
      font-size: 11.5px;
      color: #94a3b8;
    }
    .rate-badge {
      font-weight: 700;
      color: #15803d;
      font-size: 12.5px;
    }

    /* Badges */
    .badge-status {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
    }
    .badge-status.accepted {
      background: #f0fdf4;
      color: #166534;
      border: 1px solid #bbf7d0;
    }
    .badge-status.pending {
      background: #fffbeb;
      color: #b45309;
      border: 1px solid #fde68a;
    }
    .badge-status.open {
      background: #f8fafc;
      color: #64748b;
      border: 1px solid #e2e8f0;
    }
    .badge-status.bg-success { background: #16a34a !important; color: #fff !important; }
    .badge-status.bg-primary { background: #0050e5 !important; color: #fff !important; }
    .badge-status.bg-secondary { background: #64748b !important; color: #fff !important; }
    .badge-status.bg-danger { background: #dc2626 !important; color: #fff !important; }
    .badge-status.bg-warning { background: #fffbeb !important; color: #b45309 !important; border: 1px solid #fde68a; }

    .btn-action-sm {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 6px 12px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      color: #334155;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-action-sm .material-symbols-outlined {
      font-size: 16px;
      color: #0050e5;
    }
    .btn-action-sm:hover {
      background: #eff6ff;
      border-color: #93c5fd;
      color: #0050e5;
    }

    /* Timesheet View */
    .timesheet-header {
      padding: 20px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #e2e8f0;
    }
    .timesheet-header h3 {
      font-size: 17px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 2px 0;
    }
    .timesheet-sub {
      font-size: 13px;
      color: #64748b;
      margin: 0;
    }
    .date-window-badge {
      font-size: 12px;
      font-weight: 700;
      background: #eff6ff;
      color: #0050e5;
      padding: 4px 10px;
      border-radius: 8px;
      border: 1px solid #bfdbfe;
    }
    .officer-name-bold {
      font-weight: 700;
      color: #0f172a;
    }
    .user-sub {
      font-size: 11.5px;
      color: #64748b;
    }
    .time-bold {
      font-weight: 600;
      font-size: 12.5px;
    }
    .countdown-text {
      font-family: monospace;
      font-size: 11.5px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .live-duty-active {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      color: #166534;
      font-weight: 700;
      font-size: 12px;
    }
    .live-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #16a34a;
      display: inline-block;
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
      0% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.85); }
      100% { opacity: 1; transform: scale(1); }
    }
    .live-duty-done {
      color: #64748b;
      font-size: 12px;
    }
    .rate-bold {
      font-weight: 800;
      color: #15803d;
    }
    .text-muted-mini {
      color: #94a3b8;
    }

    /* Calendar View */
    .calendar-card {
      padding: 24px;
    }
    .calendar-nav-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    .calendar-nav-bar h3 {
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
    }
    .calendar-controls {
      display: flex;
      gap: 8px;
    }
    .calendar-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 10px;
    }
    .calendar-header-day {
      text-align: center;
      font-weight: 700;
      font-size: 12.5px;
      color: #475569;
      padding: 10px 0;
      background: #f8fafc;
      border-radius: 8px;
    }
    .calendar-day-cell {
      min-height: 96px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 10px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .calendar-day-cell:hover {
      border-color: #0050e5;
      background: #eff6ff;
    }
    .calendar-day-cell.not-current-month {
      background: #f8fafc;
      opacity: 0.45;
    }
    .calendar-day-cell.is-today {
      border: 2px solid #0050e5;
      background: #f0f7ff;
    }
    .day-number {
      font-weight: 800;
      font-size: 14px;
      color: #0f172a;
    }
    .day-shifts-pill {
      font-size: 11px;
      font-weight: 700;
      background: #dbeafe;
      color: #1e40af;
      padding: 3px 6px;
      border-radius: 6px;
      text-align: center;
    }

    /* Empty State Card */
    .empty-state-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 64px 24px;
      text-align: center;
      max-width: 560px;
      margin: 20px auto;
      box-shadow: 0 4px 15px rgba(0,0,0,0.02);
    }
    .empty-icon-circle {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: #f1f5f9;
      color: #64748b;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
    }
    .empty-icon-circle .material-symbols-outlined {
      font-size: 28px;
    }
    .empty-state-card h3 {
      font-size: 17px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 6px 0;
    }
    .empty-state-card p {
      font-size: 13.5px;
      color: #64748b;
      margin: 0 0 20px 0;
      line-height: 1.5;
    }

    /* Modals */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
      padding: 20px;
    }
    .modal-card {
      background: #ffffff;
      border-radius: 16px;
      width: 100%;
      max-width: 520px;
      box-shadow: 0 25px 60px rgba(0,0,0,0.3);
      overflow: hidden;
      animation: modalSlide 0.2s ease-out;
    }
    .modal-card.modal-large {
      max-width: 680px;
    }
    @keyframes modalSlide {
      from { transform: translateY(12px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .modal-header {
      padding: 20px 24px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1px solid #e2e8f0;
    }
    .modal-title-group {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }
    .modal-title-group .material-symbols-outlined {
      font-size: 26px;
      margin-top: 2px;
    }
    .text-blue { color: #0050e5; }
    .modal-title-group h3 {
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 4px 0;
    }
    .modal-subtitle {
      font-size: 13px;
      color: #64748b;
      margin: 0;
    }
    .btn-close {
      background: none;
      border: none;
      font-size: 24px;
      color: #94a3b8;
      cursor: pointer;
      line-height: 1;
    }
    .btn-close:hover {
      color: #334155;
    }
    .modal-body {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-height: 72vh;
      overflow-y: auto;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .form-row-dual {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }
    .form-row-triple {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 12px;
    }
    .form-label {
      font-size: 13px;
      font-weight: 700;
      color: #334155;
    }
    .form-label .required {
      color: #ef4444;
    }
    .form-control {
      padding: 10px 14px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 13.5px;
      color: #0f172a;
      outline: none;
      transition: border-color 0.2s;
      font-family: inherit;
    }
    .form-control:focus {
      border-color: #0050e5;
      box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.1);
    }
    .readonly-input {
      background: #f8fafc;
      color: #475569;
      font-weight: 700;
    }
    .form-help {
      font-size: 11.5px;
      color: #64748b;
    }
    .overnight-banner {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      background: #faf5ff;
      border: 1px solid #e9d5ff;
      border-radius: 10px;
      color: #7e22ce;
      font-size: 12.5px;
    }
    .overnight-banner .material-symbols-outlined {
      font-size: 20px;
      flex-shrink: 0;
    }
    .modal-footer {
      padding: 16px 24px;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }

    /* Info Guide */
    .info-guide-body {
      gap: 20px;
    }
    .info-guide-section h4 {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 6px 0;
    }
    .info-guide-section p {
      font-size: 13px;
      color: #475569;
      line-height: 1.55;
      margin: 0 0 6px 0;
    }

    /* Loading state */
    .loading-state-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 60px 20px;
      text-align: center;
      color: #64748b;
    }
    .spinner-ring {
      width: 36px;
      height: 36px;
      border: 3px solid #e2e8f0;
      border-top-color: #0050e5;
      border-radius: 50%;
      margin: 0 auto 16px auto;
      animation: spin 0.8s linear infinite;
    }

    /* Mobile & Tablet Responsiveness */
    @media (max-width: 900px) {
      .page-header {
        flex-direction: column;
        gap: 16px;
        padding: 20px;
      }
      .header-actions {
        width: 100%;
        justify-content: flex-start;
      }
      .toolbar-top {
        flex-direction: column;
        align-items: flex-start;
      }
      .view-mode-toggle {
        width: 100%;
        justify-content: space-between;
      }
      .view-btn {
        flex: 1;
        justify-content: center;
      }
      .filters-row {
        grid-template-columns: 1fr;
      }
      .form-row-dual, .form-row-triple {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 768px) {
      .calendar-card {
        padding: 16px;
      }
      .calendar-nav-bar {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
      }
      .calendar-controls {
        width: 100%;
        display: flex;
        justify-content: space-between;
      }
      .calendar-controls .btn {
        flex: 1;
        text-align: center;
      }
      .calendar-scroll-wrap {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        padding-bottom: 8px;
        margin: 0 -8px;
      }
      .calendar-grid {
        min-width: 520px;
        gap: 6px;
      }
      .calendar-header-day {
        font-size: 11px;
        padding: 8px 0;
      }
      .calendar-day-cell {
        min-height: 72px;
        padding: 8px;
        border-radius: 8px;
      }
      .day-number {
        font-size: 13px;
      }
      .day-shifts-pill {
        font-size: 10.5px;
        padding: 2px 4px;
      }
    }

    @media (max-width: 480px) {
      .calendar-grid {
        min-width: 460px;
        gap: 4px;
      }
      .calendar-day-cell {
        min-height: 62px;
        padding: 6px;
      }
      .day-number {
        font-size: 12px;
      }
      .day-shifts-pill {
        font-size: 10px;
      }
    }
  `]
})
export class WorkforceScheduleComponent implements OnInit {
  shifts: Shift[] = [];
  filteredShifts: Shift[] = [];
  sites: ClientSite[] = [];
  isLoading = false;
  isSubmitting = false;
  showCreateModal = false;
  showInfoModal = false;
  currencySymbol = '₦';

  activeView: 'list' | 'timesheet' | 'calendar' = 'list';
  selectedSiteId = '';
  selectedStatus = '';
  selectedDateFilter = '';

  currentToday = new Date();
  currentCalendarDate = new Date();
  calendarDays: Array<{ date: Date; dayNum: number; isCurrentMonth: boolean; isToday: boolean; shiftsCount: number }> = [];

  newShift: any = {
    clientSiteId: '',
    postName: 'Main Gatehouse',
    facilityName: '',
    address: '',
    postCode: '',
    assignedUserName: '',
    assignedUserId: '',
    hourlyPayRate: 15.0,
    breakMinutes: 30,
    requiredWorkspaceStationName: '',
    notes: ''
  };

  newShiftStart = '';
  newShiftEnd = '';
  newShiftAcceptanceDeadline = '';
  calculatedDuration = '0';
  isOvernightShift = false;

  constructor(
    private readonly workforceService: WorkforceService,
    private readonly toast: ToastService
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.buildCalendar();
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
        this.sites = res?.data || [];
      }
    });

    this.workforceService.getShifts({
      siteId: this.selectedSiteId || undefined,
      status: this.selectedStatus || undefined
    }).subscribe({
      next: (res: any) => {
        this.shifts = res?.data || [];
        this.applyFilters();
        this.buildCalendar();
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.toast.error('Failed to load roster.');
      }
    });
  }

  applyFilters(): void {
    let result = [...this.shifts];
    if (this.selectedSiteId) {
      result = result.filter(s => s.clientSiteId === this.selectedSiteId);
    }
    if (this.selectedStatus) {
      result = result.filter(s => s.status === this.selectedStatus);
    }
    if (this.selectedDateFilter) {
      const targetStr = this.selectedDateFilter;
      result = result.filter(s => {
        if (!s.startsAtUtc) return false;
        const shiftDateStr = new Date(s.startsAtUtc).toISOString().substring(0, 10);
        return shiftDateStr === targetStr;
      });
    }
    this.filteredShifts = result;
  }

  onSiteSelected(): void {
    const selected = this.sites.find(s => s.id === this.newShift.clientSiteId);
    if (selected) {
      if (!this.newShift.facilityName) this.newShift.facilityName = selected.siteName;
      if (!this.newShift.address) this.newShift.address = selected.address;
      if (!this.newShift.postCode) this.newShift.postCode = selected.postalCode;
    }
  }

  openCreateModal(): void {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 20, 0);
    const deadline = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    this.newShiftStart = this.formatDateForInput(start);
    this.newShiftEnd = this.formatDateForInput(end);
    this.newShiftAcceptanceDeadline = this.formatDateForInput(deadline);
    this.calculateDuration();
    this.showCreateModal = true;
  }

  calculateDuration(): void {
    if (!this.newShiftStart || !this.newShiftEnd) return;
    const start = new Date(this.newShiftStart);
    const end = new Date(this.newShiftEnd);

    this.isOvernightShift = end.getDate() !== start.getDate();
    const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    const net = Math.max(0, diffHours - ((this.newShift.breakMinutes || 0) / 60));
    this.calculatedDuration = net.toFixed(1);
  }

  submitCreateShift(): void {
    if (!this.newShift.clientSiteId) {
      this.toast.warning('Please select a client site.');
      return;
    }

    this.isSubmitting = true;
    const payload = {
      ...this.newShift,
      startsAtUtc: new Date(this.newShiftStart).toISOString(),
      endsAtUtc: new Date(this.newShiftEnd).toISOString(),
      acceptanceDeadlineUtc: this.newShiftAcceptanceDeadline ? new Date(this.newShiftAcceptanceDeadline).toISOString() : null
    };

    this.workforceService.createShift(payload).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.showCreateModal = false;
        this.toast.success('Shift created and roster updated.');
        this.loadData();
      },
      error: (err: any) => {
        this.isSubmitting = false;
        this.toast.error(err?.error?.message || 'Failed to create shift. Check for overlapping conflicts.');
      }
    });
  }

  buildCalendar(): void {
    const year = this.currentCalendarDate.getFullYear();
    const month = this.currentCalendarDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const cells: Array<{ date: Date; dayNum: number; isCurrentMonth: boolean; isToday: boolean; shiftsCount: number }> = [];

    // Leading days from previous month
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthDays - i);
      cells.push({
        date: d,
        dayNum: prevMonthDays - i,
        isCurrentMonth: false,
        isToday: this.isSameDay(d, this.currentToday),
        shiftsCount: this.getShiftsCountForDay(d)
      });
    }

    // Days in current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      cells.push({
        date: dateObj,
        dayNum: d,
        isCurrentMonth: true,
        isToday: this.isSameDay(dateObj, this.currentToday),
        shiftsCount: this.getShiftsCountForDay(dateObj)
      });
    }

    // Trailing days
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let t = 1; t <= remaining; t++) {
      const d = new Date(year, month + 1, t);
      cells.push({
        date: d,
        dayNum: t,
        isCurrentMonth: false,
        isToday: this.isSameDay(d, this.currentToday),
        shiftsCount: this.getShiftsCountForDay(d)
      });
    }

    this.calendarDays = cells;
  }

  navigateMonth(delta: number): void {
    this.currentCalendarDate = new Date(
      this.currentCalendarDate.getFullYear(),
      this.currentCalendarDate.getMonth() + delta,
      1
    );
    this.buildCalendar();
  }

  selectCalendarDay(cell: { date: Date }): void {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const d = cell.date;
    this.selectedDateFilter = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    this.activeView = 'timesheet';
    this.applyFilters();
  }

  getShiftsCountForDay(date: Date): number {
    return this.shifts.filter(s => {
      if (!s.startsAtUtc) return false;
      return this.isSameDay(new Date(s.startsAtUtc), date);
    }).length;
  }

  isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() &&
           a.getMonth() === b.getMonth() &&
           a.getDate() === b.getDate();
  }

  getAcceptanceCountdown(shift: Shift): string {
    if (shift.isConfirmedByGuard) return 'Accepted';
    if (!shift.acceptanceDeadlineUtc) return 'No Deadline';
    const diff = new Date(shift.acceptanceDeadlineUtc).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const hrs = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hrs.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m left`;
  }

  getAcceptanceCountdownClass(shift: Shift): string {
    if (shift.isConfirmedByGuard) return 'bg-success text-white';
    if (!shift.acceptanceDeadlineUtc) return 'bg-light text-muted';
    const diff = new Date(shift.acceptanceDeadlineUtc).getTime() - Date.now();
    if (diff <= 0) return 'bg-danger text-white';
    if (diff < 4 * 60 * 60 * 1000) return 'bg-warning text-dark';
    return 'bg-info-subtle text-info border';
  }

  viewShiftDetails(shift: Shift): void {
    this.toast.info(`Shift: ${shift.shiftCode} at ${shift.facilityName || shift.siteName}`);
  }

  startTour(): void {
    this.showInfoModal = true;
  }

  getStatusBadge(status: string): string {
    switch (status) {
      case 'Confirmed': return 'bg-success';
      case 'InProgress': return 'bg-primary';
      case 'Completed': return 'bg-secondary';
      case 'Cancelled': return 'bg-danger';
      default: return 'bg-warning text-dark';
    }
  }

  getInitials(name?: string): string {
    if (!name) return 'OP';
    const parts = name.trim().split(' ');
    return parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
  }

  private formatDateForInput(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
}
