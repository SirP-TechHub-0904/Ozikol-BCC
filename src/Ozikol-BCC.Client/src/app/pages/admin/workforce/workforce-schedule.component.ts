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
    <div class="schedule-page">
      <!-- Header -->
      <div class="page-header d-flex align-items-center justify-content-between mb-4">
        <div>
          <div class="d-flex align-items-center gap-2">
            <h2 class="page-title m-0">Staff Rota & Shift Management</h2>
            <button class="info-icon-btn" (click)="showInfoModal = true" title="Rota & Scheduling Info">
              <span class="material-symbols-outlined">info</span>
            </button>
            <button class="tour-btn" (click)="startTour()" title="Replay Walkthrough Tour">
              <span class="material-symbols-outlined">help</span>
            </button>
          </div>
          <p class="text-muted m-0 mt-1">Multi-site shift scheduling, 24/7 overnight rosters, and conflict protection.</p>
        </div>
        <div class="d-flex gap-2">
          <button class="btn btn-outline-primary d-flex align-items-center gap-1" (click)="loadData()">
            <span class="material-symbols-outlined">refresh</span> Refresh
          </button>
          <button class="btn btn-primary d-flex align-items-center gap-1" (click)="openCreateModal()">
            <span class="material-symbols-outlined">add</span> Create Shift
          </button>
        </div>
      </div>

      <!-- View Switcher & Filters Bar -->
      <div class="filters-card mb-4 p-3 rounded shadow-sm bg-white">
        <div class="d-flex align-items-center justify-content-between mb-3 pb-3 border-bottom flex-wrap gap-2">
          <div class="btn-group view-switcher">
            <button class="btn btn-sm" [class.btn-primary]="activeView === 'list'" [class.btn-outline-secondary]="activeView !== 'list'" (click)="activeView = 'list'">
              <span class="material-symbols-outlined fs-6 align-middle">table_rows</span> Roster List
            </button>
            <button class="btn btn-sm" [class.btn-primary]="activeView === 'timesheet'" [class.btn-outline-secondary]="activeView !== 'timesheet'" (click)="activeView = 'timesheet'">
              <span class="material-symbols-outlined fs-6 align-middle">assignment</span> Daily Timesheet
            </button>
            <button class="btn btn-sm" [class.btn-primary]="activeView === 'calendar'" [class.btn-outline-secondary]="activeView !== 'calendar'" (click)="activeView = 'calendar'">
              <span class="material-symbols-outlined fs-6 align-middle">calendar_month</span> Monthly Calendar
            </button>
          </div>
          <div class="d-flex align-items-center gap-2">
            <span class="badge bg-light text-dark border p-2">
              Showing <strong>{{ filteredShifts.length }}</strong> planned shifts
            </span>
          </div>
        </div>

        <div class="row g-3 align-items-center">
          <div class="col-md-3">
            <label class="form-label small text-muted">Filter by Site</label>
            <select class="form-select" [(ngModel)]="selectedSiteId" (change)="applyFilters()">
              <option value="">All Operating Sites</option>
              <option *ngFor="let site of sites" [value]="site.id">{{ site.siteName }} ({{ site.siteCode }})</option>
            </select>
          </div>
          <div class="col-md-3">
            <label class="form-label small text-muted">Filter by Status</label>
            <select class="form-select" [(ngModel)]="selectedStatus" (change)="applyFilters()">
              <option value="">All Statuses</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Confirmed">Confirmed</option>
              <option value="InProgress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
          <div class="col-md-3">
            <label class="form-label small text-muted">Filter by Date</label>
            <input type="date" class="form-control" [(ngModel)]="selectedDateFilter" (change)="applyFilters()" />
          </div>
          <div class="col-md-3 text-end" *ngIf="selectedDateFilter">
            <button class="btn btn-sm btn-outline-secondary mt-3" (click)="selectedDateFilter = ''; applyFilters()">Clear Date Filter</button>
          </div>
        </div>
      </div>

      <!-- Shifts Views Container -->
      <div class="shifts-table-card rounded shadow-sm bg-white p-3">
        <!-- View 1: Roster List -->
        <div class="table-responsive" *ngIf="activeView === 'list' && !isLoading && filteredShifts.length > 0">
          <table class="table table-hover align-middle m-0">
            <thead class="table-light">
              <tr>
                <th>Shift Ref</th>
                <th>Operating Site & Post</th>
                <th>Facility / Address</th>
                <th>Assigned Officer</th>
                <th>Date & Hours</th>
                <th>Break / Net</th>
                <th>Rate / Pay</th>
                <th>Acceptance Status</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let s of filteredShifts">
                <td>
                  <span class="fw-semibold text-primary font-monospace">{{ s.shiftCode }}</span>
                </td>
                <td>
                  <div class="fw-bold">{{ s.siteName }}</div>
                  <small class="text-muted"><span class="material-symbols-outlined fs-6 align-middle">location_on</span> {{ s.postName }}</small>
                </td>
                <td>
                  <div class="small fw-medium">{{ s.facilityName || s.siteName }}</div>
                  <small class="text-muted" *ngIf="s.postCode">{{ s.postCode }}</small>
                </td>
                <td>
                  <div class="d-flex align-items-center gap-2">
                    <span class="avatar-circle">{{ getInitials(s.assignedUserName) }}</span>
                    <div>
                      <div class="fw-medium">{{ s.assignedUserName || 'Open / Unassigned' }}</div>
                      <small class="badge bg-light text-muted" *ngIf="s.isConfirmedByGuard">✓ Confirmed</small>
                    </div>
                  </div>
                </td>
                <td>
                  <div>{{ s.startsAtUtc | date:'shortDate' }}</div>
                  <div class="d-flex align-items-center gap-1">
                    <span class="fw-medium">{{ s.startsAtUtc | date:'HH:mm' }} - {{ s.endsAtUtc | date:'HH:mm' }}</span>
                    <span class="badge bg-purple-subtle text-purple" *ngIf="s.isOvernight" title="24/7 Overnight shift crossing midnight">
                      🌙 Overnight
                    </span>
                  </div>
                </td>
                <td>
                  <div>{{ s.plannedDurationHours }} hrs</div>
                  <small class="text-muted" *ngIf="s.breakMinutes > 0">{{ s.breakMinutes }}m break</small>
                </td>
                <td>
                  <span class="fw-semibold text-success">{{ s.hourlyPayRate ? '£' + s.hourlyPayRate + '/hr' : '—' }}</span>
                </td>
                <td>
                  <div *ngIf="s.isConfirmedByGuard" class="badge bg-success">Accepted</div>
                  <div *ngIf="!s.isConfirmedByGuard && s.assignedUserId">
                    <span class="badge" [ngClass]="getAcceptanceCountdownClass(s)">
                      {{ getAcceptanceCountdown(s) }}
                    </span>
                  </div>
                  <div *ngIf="!s.assignedUserId" class="badge bg-light text-muted">Open Shift</div>
                </td>
                <td>
                  <span class="badge" [ngClass]="getStatusBadge(s.status)">{{ s.status }}</span>
                </td>
                <td>
                  <button class="btn btn-sm btn-outline-secondary" (click)="viewShiftDetails(s)">
                    <span class="material-symbols-outlined fs-6">visibility</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- View 2: Daily Timesheet View (Screenshot Fidelity) -->
        <div class="table-responsive" *ngIf="activeView === 'timesheet' && !isLoading && filteredShifts.length > 0">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h5 class="fw-bold m-0 text-primary">Daily Timesheet Summary</h5>
            <span class="text-muted small">Viewing shifts for selected date window</span>
          </div>
          <table class="table table-hover align-middle m-0">
            <thead class="table-light">
              <tr>
                <th>User</th>
                <th>Post Code</th>
                <th>Start Time</th>
                <th>End Time</th>
                <th>Acceptance Status</th>
                <th>Acceptance Countdown</th>
                <th>User Start Time</th>
                <th>User End Time</th>
                <th>Rate / Hour</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let s of filteredShifts">
                <td>
                  <div class="fw-bold text-dark">{{ s.assignedUserName || 'Unassigned Staff' }}</div>
                  <small class="text-muted">{{ s.assignedUserId || 'Open' }}</small>
                </td>
                <td>
                  <span class="badge bg-light text-dark border">{{ s.postCode || 'N/A' }}</span>
                </td>
                <td>
                  <span class="fw-semibold">{{ s.startsAtUtc | date:'dd MMM yyyy, HH:mm' }}</span>
                </td>
                <td>
                  <span class="fw-semibold">{{ s.endsAtUtc | date:'dd MMM yyyy, HH:mm' }}</span>
                </td>
                <td>
                  <span class="badge" [class.bg-success]="s.isConfirmedByGuard" [class.bg-warning]="!s.isConfirmedByGuard && s.assignedUserId" [class.bg-light]="!s.assignedUserId" [class.text-dark]="!s.isConfirmedByGuard">
                    {{ s.isConfirmedByGuard ? 'Accepted' : (s.assignedUserId ? 'Pending Confirmation' : 'Open') }}
                  </span>
                </td>
                <td>
                  <span class="font-monospace small fw-bold" [ngClass]="getAcceptanceCountdownClass(s)">
                    {{ getAcceptanceCountdown(s) }}
                  </span>
                </td>
                <td>
                  <span class="text-primary fw-medium" *ngIf="s.isClockedIn">Active on Site</span>
                  <span class="text-muted" *ngIf="!s.isClockedIn">—</span>
                </td>
                <td>
                  <span class="text-secondary fw-medium" *ngIf="s.isClockedOut">Clocked Out</span>
                  <span class="text-muted" *ngIf="!s.isClockedOut">—</span>
                </td>
                <td>
                  <span class="fw-bold text-success">{{ s.hourlyPayRate ? '£' + s.hourlyPayRate : '£10.00' }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- View 3: Monthly Calendar View -->
        <div class="calendar-view-container" *ngIf="activeView === 'calendar' && !isLoading">
          <div class="d-flex align-items-center justify-content-between mb-4">
            <h4 class="m-0 fw-bold text-primary">{{ currentCalendarDate | date:'MMMM yyyy' }}</h4>
            <div class="btn-group">
              <button class="btn btn-outline-secondary btn-sm" (click)="navigateMonth(-1)">← Previous</button>
              <button class="btn btn-outline-secondary btn-sm" (click)="currentCalendarDate = currentToday; buildCalendar()">Current</button>
              <button class="btn btn-outline-secondary btn-sm" (click)="navigateMonth(1)">Next →</button>
            </div>
          </div>
          <div class="calendar-grid">
            <div class="calendar-header-day" *ngFor="let dayName of ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']">
              {{ dayName }}
            </div>
            <div
              class="calendar-day-cell"
              *ngFor="let c of calendarDays"
              [class.not-current-month]="!c.isCurrentMonth"
              [class.is-today]="c.isToday"
              (click)="selectCalendarDay(c)">
              <div class="day-number">{{ c.dayNum }}</div>
              <div class="day-shifts-badge" *ngIf="c.shiftsCount > 0">
                <span class="badge bg-success">{{ c.shiftsCount }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="empty-state text-center p-5" *ngIf="!isLoading && filteredShifts.length === 0 && activeView !== 'calendar'">
          <span class="material-symbols-outlined display-4 text-muted mb-3">calendar_month</span>
          <h5>No shifts scheduled for this filter</h5>
          <p class="text-muted">Create your first 24/7 or day shift by tapping "Create Shift".</p>
          <button class="btn btn-primary" (click)="openCreateModal()">Create Shift</button>
        </div>

        <div class="text-center p-5" *ngIf="isLoading">
          <div class="spinner-border text-primary" role="status"></div>
          <div class="mt-2 text-muted">Loading schedule...</div>
        </div>
      </div>

      <!-- Create Shift Modal (Assign User to Sheet) -->
      <div class="modal-backdrop fade show" *ngIf="showCreateModal"></div>
      <div class="modal fade show d-block" *ngIf="showCreateModal" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Assign User to Sheet / Create Shift</h5>
              <button type="button" class="btn-close" (click)="showCreateModal = false"></button>
            </div>
            <div class="modal-body">
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">Client Site *</label>
                  <select class="form-select" [(ngModel)]="newShift.clientSiteId" (change)="onSiteSelected()" required>
                    <option value="">Select operating site...</option>
                    <option *ngFor="let site of sites" [value]="site.id">{{ site.siteName }} ({{ site.siteCode }})</option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Facility / Venue Name</label>
                  <input type="text" class="form-control" [(ngModel)]="newShift.facilityName" placeholder="e.g. Oakleigh Park Care Home" />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Address</label>
                  <input type="text" class="form-control" [(ngModel)]="newShift.address" placeholder="e.g. 55 Oakleigh Park North, London" />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Post Code</label>
                  <input type="text" class="form-control" [(ngModel)]="newShift.postCode" placeholder="e.g. N20 9NH" />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Post Name / Duty Role *</label>
                  <input type="text" class="form-control" [(ngModel)]="newShift.postName" placeholder="e.g. Reception, Main Gatehouse, Floor Warden" />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Assign User (Leave Blank if unassigned)</label>
                  <input type="text" class="form-control" [(ngModel)]="newShift.assignedUserName" placeholder="e.g. First Last" />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Sheet Start Time (Local) *</label>
                  <input type="datetime-local" class="form-control" [(ngModel)]="newShiftStart" (change)="calculateDuration()" required />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Sheet End Time (Local) *</label>
                  <input type="datetime-local" class="form-control" [(ngModel)]="newShiftEnd" (change)="calculateDuration()" required />
                </div>
                <div class="col-md-4">
                  <label class="form-label">Rate Per Hour in Pounds (£)</label>
                  <input type="number" class="form-control" [(ngModel)]="newShift.hourlyPayRate" min="0" step="0.5" />
                </div>
                <div class="col-md-4">
                  <label class="form-label">Unpaid Break (Minutes)</label>
                  <input type="number" class="form-control" [(ngModel)]="newShift.breakMinutes" (change)="calculateDuration()" min="0" step="15" />
                </div>
                <div class="col-md-4">
                  <label class="form-label">Planned Net Hours</label>
                  <input type="text" class="form-control" [value]="calculatedDuration + ' hrs'" readonly />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Acceptance Expiration Time (Countdown Deadline)</label>
                  <input type="datetime-local" class="form-control" [(ngModel)]="newShiftAcceptanceDeadline" />
                  <small class="text-muted">If unaccepted by this time, shift returns to the open board.</small>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Workstation Lock (Optional)</label>
                  <input type="text" class="form-control" [(ngModel)]="newShift.requiredWorkspaceStationName" placeholder="e.g. Gatehouse PC #1" />
                </div>
                <div class="col-md-12">
                  <label class="form-label">Post Instructions / Briefing Notes</label>
                  <textarea class="form-control" rows="2" [(ngModel)]="newShift.notes" placeholder="Enter special site instructions, key codes, or handover notes..."></textarea>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline-secondary" (click)="showCreateModal = false">Cancel</button>
              <button type="button" class="btn btn-primary" (click)="submitCreateShift()" [disabled]="isSubmitting">
                <span class="spinner-border spinner-border-sm me-1" *ngIf="isSubmitting"></span> Save Shift
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Info Modal -->
      <div class="modal-backdrop fade show" *ngIf="showInfoModal"></div>
      <div class="modal fade show d-block" *ngIf="showInfoModal" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title d-flex align-items-center gap-2">
                <span class="material-symbols-outlined text-primary">info</span>
                About Staff Rota & Scheduling
              </h5>
              <button type="button" class="btn-close" (click)="showInfoModal = false"></button>
            </div>
            <div class="modal-body">
              <div class="mb-3">
                <h6 class="fw-bold">Purpose:</h6>
                <p class="text-muted small">Central command center for scheduling multi-department shifts, managing 24/7 cross-midnight rosters, and preventing guard overlap.</p>
              </div>
              <div class="mb-3">
                <h6 class="fw-bold">24/7 Overnight Logic:</h6>
                <p class="text-muted small">Shifts ending on a subsequent calendar day (e.g., 20:00 to 06:00) automatically calculate duration across midnight without date truncation.</p>
              </div>
              <div class="mb-3">
                <h6 class="fw-bold">Workstation Gatekeeper:</h6>
                <p class="text-muted small">Assigning a required workstation ensures staff cannot unlock the designated machine or desktop app until they actively clock in on site.</p>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-primary" (click)="showInfoModal = false">Got it</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .schedule-page {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }
    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 16px;
    }
    .page-title {
      font-size: 22px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.4px;
      margin: 0;
    }
    .text-muted {
      color: #64748b !important;
      font-size: 13.5px;
    }
    .info-icon-btn, .tour-btn {
      background: none;
      border: 1px solid #e2e8f0;
      color: #64748b;
      cursor: pointer;
      padding: 6px;
      border-radius: 8px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
      background: #ffffff;
    }
    .info-icon-btn:hover, .tour-btn:hover {
      color: #0050e5;
      border-color: #0050e5;
      background: #eff6ff;
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
      transition: all 0.15s ease;
      text-decoration: none;
      line-height: 1.4;
    }
    .btn-primary {
      background: #0050e5;
      color: #ffffff;
      border-color: #0050e5;
    }
    .btn-primary:hover {
      background: #003db3;
      border-color: #003db3;
    }
    .btn-outline-primary {
      background: #ffffff;
      color: #0050e5;
      border-color: #0050e5;
    }
    .btn-outline-primary:hover {
      background: #eff6ff;
    }
    .btn-outline-secondary {
      background: #ffffff;
      color: #475569;
      border-color: #cbd5e1;
    }
    .btn-outline-secondary:hover {
      background: #f8fafc;
      color: #0f172a;
    }
    .btn-sm {
      padding: 4px 10px;
      font-size: 12px;
    }

    /* Filters Bar */
    .filters-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }
    .row {
      display: flex;
      flex-wrap: wrap;
      margin: -8px;
    }
    .align-items-center { align-items: center; }
    .col-md-3 {
      flex: 0 0 25%;
      max-width: 25%;
      padding: 8px;
      box-sizing: border-box;
    }
    .col-md-4 {
      flex: 0 0 33.333333%;
      max-width: 33.333333%;
      padding: 8px;
      box-sizing: border-box;
    }
    .col-md-6 {
      flex: 0 0 50%;
      max-width: 50%;
      padding: 8px;
      box-sizing: border-box;
    }
    .col-md-12 {
      flex: 0 0 100%;
      max-width: 100%;
      padding: 8px;
      box-sizing: border-box;
    }
    @media (max-width: 768px) {
      .col-md-3, .col-md-4, .col-md-6 {
        flex: 0 0 100%;
        max-width: 100%;
      }
    }
    .form-label {
      display: block;
      margin-bottom: 6px;
      font-size: 12px;
      font-weight: 600;
      color: #475569;
    }
    .form-select, .form-control {
      width: 100%;
      padding: 9px 12px;
      font-size: 13px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      background: #ffffff;
      color: #0f172a;
      transition: border-color 0.15s;
      box-sizing: border-box;
    }
    .form-select:focus, .form-control:focus {
      outline: none;
      border-color: #0050e5;
      box-shadow: 0 0 0 3px rgba(0,80,229,0.12);
    }

    /* Roster Table Card */
    .shifts-table-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }
    .table-responsive {
      width: 100%;
      overflow-x: auto;
    }
    .table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .table th {
      text-align: left;
      padding: 12px 14px;
      font-size: 11.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      color: #64748b;
      border-bottom: 1px solid #e2e8f0;
      background: #f8fafc;
    }
    .table td {
      padding: 12px 14px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
      color: #1e293b;
    }
    .table-hover tbody tr:hover {
      background: #f8fafc;
    }

    /* Badges & Icons */
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
    }
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
    .bg-danger { background: #dc2626 !important; color: #ffffff !important; }
    .bg-secondary { background: #64748b !important; color: #ffffff !important; }
    .bg-light { background: #f1f5f9 !important; color: #475569 !important; }
    .bg-purple-subtle { background: #faf5ff; border: 1px solid #e9d5ff; }
    .text-purple { color: #9333ea; }
    .bg-info-subtle { background: #eff6ff; border: 1px solid #bfdbfe; }
    .text-info { color: #2563eb; }
    .text-primary { color: #0050e5; }
    .text-end { text-align: right; }
    .font-monospace { font-family: monospace; }
    .fw-bold { font-weight: 700; }
    .fw-semibold { font-weight: 600; }
    .fw-medium { font-weight: 500; }
    .fs-6 { font-size: 16px; }
    .d-flex { display: flex; }
    .gap-1 { gap: 4px; }
    .gap-2 { gap: 8px; }
    .gap-3 { gap: 16px; }
    .mb-1 { margin-bottom: 4px; }
    .mb-3 { margin-bottom: 12px; }
    .mb-4 { margin-bottom: 24px; }
    .mt-1 { margin-top: 4px; }
    .mt-2 { margin-top: 8px; }
    .m-0 { margin: 0; }
    .p-2 { padding: 8px; }
    .p-3 { padding: 16px; }
    .p-5 { padding: 48px; }
    .border { border: 1px solid #e2e8f0; }
    .rounded { border-radius: 8px; }
    .shadow-sm { box-shadow: 0 1px 3px rgba(0,0,0,0.04); }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 60px 20px;
    }
    .empty-state h5 {
      font-size: 17px;
      font-weight: 700;
      margin: 12px 0 6px;
      color: #0f172a;
    }
    .empty-state p {
      font-size: 13.5px;
      color: #64748b;
      margin-bottom: 20px;
    }
    .empty-state .material-symbols-outlined {
      font-size: 54px;
      color: #94a3b8;
    }

    /* Modal Dialogs */
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(15, 23, 42, 0.55);
      z-index: 1040;
      backdrop-filter: blur(2px);
    }
    .modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 1050;
      display: flex !important;
      align-items: center;
      justify-content: center;
      overflow-y: auto;
      padding: 20px;
      box-sizing: border-box;
    }
    .modal-dialog {
      width: 100%;
      max-width: 680px;
      margin: auto;
    }
    .modal-content {
      background: #ffffff;
      border-radius: 14px;
      box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);
      border: 1px solid #e2e8f0;
      overflow: hidden;
    }
    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 18px 24px;
      border-bottom: 1px solid #e2e8f0;
    }
    .modal-title {
      font-size: 17px;
      font-weight: 700;
      margin: 0;
      color: #0f172a;
    }
    .btn-close {
      background: none;
      border: none;
      font-size: 18px;
      cursor: pointer;
      color: #64748b;
      padding: 4px;
      line-height: 1;
    }
    .btn-close:hover { color: #0f172a; }
    .btn-close::before { content: '✕'; font-family: Arial, sans-serif; }
    .modal-body {
      padding: 24px;
      max-height: calc(85vh - 140px);
      overflow-y: auto;
    }
    .modal-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 24px;
      border-top: 1px solid #e2e8f0;
      background: #f8fafc;
    }
    .alert {
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 16px;
      font-size: 13px;
    }
    .alert-info {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #1e40af;
    }

    /* Calendar View Styles (November 2026 Grid) */
    .calendar-view-container {
      padding: 10px 0;
    }
    .calendar-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 10px;
    }
    .calendar-header-day {
      text-align: center;
      font-weight: 700;
      font-size: 13px;
      color: #475569;
      padding: 10px 0;
      background: #f8fafc;
      border-radius: 8px;
    }
    .calendar-day-cell {
      min-height: 90px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
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
      font-weight: 700;
      font-size: 14px;
      color: #0f172a;
    }
    .day-shifts-badge {
      display: flex;
      justify-content: flex-end;
    }

    /* Dark Mode Support */
    :host-context(.dark-mode) .schedule-page { color: #f8fafc; }
    :host-context(.dark-mode) .page-title { color: #f8fafc; }
    :host-context(.dark-mode) .filters-card,
    :host-context(.dark-mode) .shifts-table-card,
    :host-context(.dark-mode) .modal-content,
    :host-context(.dark-mode) .calendar-day-cell {
      background: #1e293b;
      border-color: rgba(255,255,255,0.08);
      color: #f8fafc;
    }
    :host-context(.dark-mode) .calendar-header-day {
      background: #0f172a;
      color: #94a3b8;
    }
    :host-context(.dark-mode) .form-select,
    :host-context(.dark-mode) .form-control {
      background: #0f172a;
      border-color: #334155;
      color: #f8fafc;
    }
    :host-context(.dark-mode) .table th {
      background: #0f172a;
      color: #94a3b8;
      border-bottom-color: #334155;
    }
    :host-context(.dark-mode) .table td {
      border-bottom-color: rgba(255,255,255,0.06);
      color: #e2e8f0;
    }
    :host-context(.dark-mode) .modal-footer {
      background: #0f172a;
      border-top-color: #334155;
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
    hourlyPayRate: 10.0,
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
      const targetStr = this.selectedDateFilter; // 'YYYY-MM-DD'
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
    const deadline = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24h countdown

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

  // --- CALENDAR GRID BUILDER ---
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

    // Trailing days to fill 35 or 42 cells
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

  // --- COUNTDOWN UTILITIES ---
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

