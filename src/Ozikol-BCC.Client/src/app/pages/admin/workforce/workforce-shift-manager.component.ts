import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { WorkforceService, ClientSite } from '../../../core/services/workforce.service';
import { ToastService } from '../../../core/services/toast.service';

/**
 * Dedicated Administrator Shift Manager Component (`/workforce/console/shifts`).
 * Central operational hub housing:
 * 1. Roster List — Paginated tabular directory of all shifts with S/N, 15/25/100/All rows, rates, status, and Edit/Report/Delete.
 * 2. Daily Timesheet — Cross-comparison of scheduled hours vs. verified clock-in/out attendance logs.
 * 3. Shift Swaps — Peer shift swap requests with instant supervisor Approve / Decline actions.
 * 4. Leave Approvals — Staff time-off and excused absence requests with instant Approve / Decline actions.
 */
@Component({
  selector: 'app-workforce-shift-manager',
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
            <span>Staff Rota &amp; Shifts</span>
            <span class="sep">/</span>
            <span class="current">Shift Manager</span>
          </div>
          <div class="title-row">
            <h1>Shift Manager</h1>
            <button type="button" class="info-trigger-btn" (click)="showInfoModal = true" title="Shift Manager Guide">
              <span class="material-symbols-outlined">info</span>
            </button>
            <span class="badge-suite">Suite: Workforce &amp; Shifts</span>
          </div>
          <p class="subtitle">
            Manage all scheduled, open, active, and completed shifts, daily timesheets, shift swaps, and staff leave approvals.
          </p>
        </div>
        <div class="header-actions">
          <button type="button" class="btn btn-outline" (click)="refreshCurrentTab()">
            <span class="material-symbols-outlined" [class.spin]="isLoading || isLoadingSwaps || isLoadingLeave">refresh</span>
            <span>Refresh</span>
          </button>
          <a routerLink="/workforce/console/schedule" class="btn btn-outline" title="Open Interactive Rota Calendar">
            <span class="material-symbols-outlined">calendar_month</span>
            <span>Rota Calendar</span>
          </a>
          <a routerLink="/workforce/console/schedule/create" class="btn btn-primary" title="Create New Shift or Recurring Schedule">
            <span class="material-symbols-outlined">add</span>
            <span>Add New Shift</span>
          </a>
        </div>
      </div>

      <!-- 2. Segmented Operational Tabs Bar (Moved from Rota Calendar) -->
      <div class="ops-tabs-bar">
        <div class="ops-tabs-list">
          <button
            type="button"
            class="ops-tab-btn"
            [class.active]="activeTab === 'list'"
            (click)="switchTab('list')"
          >
            <span class="material-symbols-outlined">table_rows</span>
            <span>Roster List</span>
            <span class="tab-pill">{{ shifts.length }}</span>
          </button>

          <button
            type="button"
            class="ops-tab-btn"
            [class.active]="activeTab === 'timesheet'"
            (click)="switchTab('timesheet')"
          >
            <span class="material-symbols-outlined">assignment</span>
            <span>Daily Timesheet</span>
            <span class="tab-pill">{{ filteredShifts.length }}</span>
          </button>

          <button
            type="button"
            class="ops-tab-btn"
            [class.active]="activeTab === 'swaps'"
            (click)="switchTab('swaps')"
          >
            <span class="material-symbols-outlined">swap_horiz</span>
            <span>Shift Swaps</span>
            <span class="tab-pill" [class.warn]="pendingSwapsCount > 0">{{ workspaceSwaps.length }}</span>
          </button>

          <button
            type="button"
            class="ops-tab-btn"
            [class.active]="activeTab === 'leave'"
            (click)="switchTab('leave')"
          >
            <span class="material-symbols-outlined">event_busy</span>
            <span>Leave Approvals</span>
            <span class="tab-pill" [class.warn]="pendingLeaveCount > 0">{{ leaveRequests.length }}</span>
          </button>
        </div>

        <a routerLink="/workforce/console/schedule" class="calendar-quick-link">
          <span class="material-symbols-outlined">calendar_month</span>
          <span>Switch to Rota Calendar View &rarr;</span>
        </a>
      </div>

      <!-- 3. Summary KPI Strip -->
      <div class="kpi-strip">
        <div class="kpi-card" [class.active-filter]="activeTab === 'list' && statusFilter === ''" (click)="switchTab('list'); setStatusFilter('')">
          <div class="kpi-icon bg-blue">
            <span class="material-symbols-outlined">event_note</span>
          </div>
          <div class="kpi-info">
            <span class="kpi-val">{{ shifts.length }}</span>
            <span class="kpi-lbl">Total Shifts</span>
          </div>
        </div>

        <div class="kpi-card" [class.active-filter]="activeTab === 'list' && assignmentFilter === 'assigned'" (click)="switchTab('list'); toggleAssignmentFilter('assigned')">
          <div class="kpi-icon bg-green">
            <span class="material-symbols-outlined">how_to_reg</span>
          </div>
          <div class="kpi-info">
            <span class="kpi-val">{{ assignedShiftsCount }}</span>
            <span class="kpi-lbl">Assigned Shifts</span>
          </div>
        </div>

        <div class="kpi-card" [class.active-filter]="activeTab === 'list' && assignmentFilter === 'open'" (click)="switchTab('list'); toggleAssignmentFilter('open')">
          <div class="kpi-icon bg-amber">
            <span class="material-symbols-outlined">person_search</span>
          </div>
          <div class="kpi-info">
            <span class="kpi-val">{{ openShiftsCount }}</span>
            <span class="kpi-lbl">Open Shifts (Unassigned)</span>
          </div>
        </div>

        <div class="kpi-card" [class.active-filter]="activeTab === 'leave'" (click)="switchTab('leave')">
          <div class="kpi-icon bg-purple">
            <span class="material-symbols-outlined">event_busy</span>
          </div>
          <div class="kpi-info">
            <span class="kpi-val">{{ pendingLeaveCount }}</span>
            <span class="kpi-lbl">Pending Leave / Excuses</span>
          </div>
        </div>
      </div>

      <!-- 4. Search & Filters Toolbar (For Roster List & Daily Timesheet) -->
      <div class="filter-card" *ngIf="activeTab === 'list' || activeTab === 'timesheet'">
        <div class="filter-row">
          <div class="search-box">
            <span class="material-symbols-outlined">search</span>
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (ngModelChange)="currentPage = 1"
              placeholder="Search by shift code, venue, post, or staff name..."
            />
            <button *ngIf="searchQuery" type="button" class="clear-btn" (click)="searchQuery = ''; currentPage = 1">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <div class="filter-group">
            <select class="filter-select" [(ngModel)]="siteFilter" (change)="currentPage = 1">
              <option value="">All Venues / Client Sites</option>
              <option *ngFor="let s of sites" [value]="s.id">{{ s.siteName }}</option>
            </select>

            <select class="filter-select" [(ngModel)]="assignmentFilter" (change)="currentPage = 1">
              <option value="">All Assignments</option>
              <option value="open">Open Shifts (Unassigned Only)</option>
              <option value="assigned">Assigned Shifts Only</option>
            </select>

            <select class="filter-select" [(ngModel)]="statusFilter" (change)="currentPage = 1">
              <option value="">All Statuses</option>
              <option value="Open">Open</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Confirmed">Confirmed</option>
              <option value="InProgress">On Duty (In Progress)</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            <input
              type="date"
              class="filter-select"
              [(ngModel)]="dateFilter"
              (change)="currentPage = 1"
              title="Filter by specific date"
            />

            <button
              *ngIf="searchQuery || siteFilter || assignmentFilter || statusFilter || dateFilter"
              type="button"
              class="btn btn-outline btn-sm"
              (click)="resetFilters()"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      <!-- ========================================================================= -->
      <!-- TAB 1: ROSTER LIST TABLE -->
      <!-- ========================================================================= -->
      <div class="table-card" *ngIf="activeTab === 'list'">
        <div class="table-card-header">
          <div class="header-title">
            <span class="material-symbols-outlined text-blue">table_rows</span>
            <h3>Shift Schedule Directory ({{ filteredShifts.length }})</h3>
          </div>
        </div>

        <div class="loading-box" *ngIf="isLoading">
          <div class="spinner-ring"></div>
          <span>Loading shifts directory...</span>
        </div>

        <div class="empty-box" *ngIf="!isLoading && filteredShifts.length === 0">
          <span class="material-symbols-outlined empty-icon">event_busy</span>
          <h4>No Shifts Found</h4>
          <p>No shifts match your current filter criteria, or no shifts have been scheduled yet.</p>
          <a routerLink="/workforce/console/schedule/create" class="btn btn-primary">
            <span class="material-symbols-outlined">add</span>
            <span>Add New Shift</span>
          </a>
        </div>

        <div class="table-responsive" *ngIf="!isLoading && filteredShifts.length > 0">
          <table class="bcp-table">
            <thead>
              <tr>
                <th style="width: 56px;">S/N</th>
                <th>Shift Code</th>
                <th>Date &amp; Time</th>
                <th>Venue / Client Site</th>
                <th>Assigned User / Staff</th>
                <th>Duration &amp; Pay Rate</th>
                <th>Status</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let shift of paginatedShifts; let i = index" [class.row-completed]="isShiftDone(shift)">
                <td>
                  <span class="sn-badge">{{ getSerialNumber(i) }}</span>
                </td>
                <td>
                  <div class="code-cell">
                    <span class="shift-code-badge">{{ shift.shiftCode || 'SHF-001' }}</span>
                    <span class="event-tag" *ngIf="shift.eventTag">{{ shift.eventTag }}</span>
                  </div>
                </td>
                <td>
                  <div class="datetime-cell">
                    <strong class="date-text">{{ shift.startsAtUtc | date:'EEE, d MMM y' }}</strong>
                    <div class="time-range">
                      <span class="material-symbols-outlined">schedule</span>
                      <span>{{ shift.startsAtUtc | date:'HH:mm' }} – {{ shift.endsAtUtc | date:'HH:mm' }}</span>
                      <span *ngIf="shift.isOvernight" class="overnight-pill" title="Cross-midnight overnight shift">
                        <span class="material-symbols-outlined">dark_mode</span>
                        Overnight
                      </span>
                    </div>
                  </div>
                </td>
                <td>
                  <div class="venue-cell">
                    <strong class="venue-name">{{ shift.siteName || 'Unassigned Venue' }}</strong>
                    <span class="post-text" *ngIf="shift.postName || shift.facilityName">
                      Post: {{ shift.postName || shift.facilityName }}
                    </span>
                    <span class="addr-text" *ngIf="shift.address || shift.postCode">
                      {{ shift.address }}{{ shift.postCode ? ' (' + shift.postCode + ')' : '' }}
                    </span>
                  </div>
                </td>
                <td>
                  <div *ngIf="!isOpenShift(shift)" class="staff-cell">
                    <div class="staff-avatar">{{ getInitials(shift.assignedUserName || shift.assignedUserEmail || 'S') }}</div>
                    <div class="staff-details">
                      <strong class="staff-name">{{ shift.assignedUserName || shift.assignedUserEmail || 'Assigned Staff' }}</strong>
                      <span class="staff-sub" *ngIf="shift.assignedUserEmail && shift.assignedUserName">{{ shift.assignedUserEmail }}</span>
                    </div>
                  </div>

                  <div *ngIf="isOpenShift(shift)" class="open-shift-cell">
                    <span class="open-shift-badge">
                      <span class="material-symbols-outlined">person_add</span>
                      <span>Open Shift — Unassigned</span>
                    </span>
                    <button
                      *ngIf="!isShiftDone(shift)"
                      type="button"
                      class="btn-broadcast-mini"
                      (click)="broadcastShift(shift)"
                      [disabled]="broadcastingId === shift.id"
                      title="Broadcast push/email notification to available staff"
                    >
                      <span class="material-symbols-outlined">campaign</span>
                      <span>{{ broadcastingId === shift.id ? 'Sending...' : 'Notify Staff' }}</span>
                    </button>
                  </div>
                </td>
                <td>
                  <div class="rate-cell">
                    <strong class="hrs-text">{{ shift.plannedDurationHours || calculateHours(shift) | number:'1.1-2' }} hrs</strong>
                    <span class="pay-text">{{ currencySymbol }}{{ (shift.hourlyPayRate || 0) | number:'1.2-2' }} / hr</span>
                  </div>
                </td>
                <td>
                  <span class="status-pill" [ngClass]="getStatusClass(shift)">
                    {{ getDisplayStatus(shift) }}
                  </span>
                </td>
                <td class="text-right">
                  <div class="actions-cell">
                    <a
                      *ngIf="!isShiftDone(shift)"
                      [routerLink]="['/workforce/console/schedule/edit', shift.id]"
                      class="action-btn btn-edit"
                      title="Edit Shift Details, Venue, or Assigned Staff"
                    >
                      <span class="material-symbols-outlined">edit</span>
                      <span>Edit</span>
                    </a>

                    <span
                      *ngIf="isShiftDone(shift)"
                      class="completed-lock-chip"
                      title="This shift has already been completed and is locked from editing"
                    >
                      <span class="material-symbols-outlined">lock</span>
                      <span>Done</span>
                    </span>

                    <a
                      [routerLink]="['/workforce/console/shifts', shift.id, 'report']"
                      class="action-btn btn-report"
                      title="View Shift Duty & Attendance Report"
                    >
                      <span class="material-symbols-outlined">assignment</span>
                      <span>Report</span>
                    </a>

                    <button
                      *ngIf="!isShiftDone(shift)"
                      type="button"
                      class="action-btn btn-delete"
                      (click)="confirmDelete(shift)"
                      title="Delete Shift"
                    >
                      <span class="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Bottom Pagination & Page List Count Bar -->
        <div class="pagination-footer" *ngIf="!isLoading && filteredShifts.length > 0">
          <div class="page-summary">
            Showing <strong>{{ startEntryIndex }}</strong> to <strong>{{ endEntryIndex }}</strong> of
            <strong>{{ filteredShifts.length }}</strong> shifts
          </div>

          <div class="page-size-controls">
            <span class="size-label">Rows per page:</span>
            <div class="size-pills">
              <button
                *ngFor="let opt of pageSizeOptions"
                type="button"
                class="size-pill"
                [class.active]="pageSize === opt.value"
                (click)="setPageSize(opt.value)"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>

          <div class="page-nav-controls" *ngIf="totalPages > 1">
            <button type="button" class="nav-btn" [disabled]="currentPage <= 1" (click)="goToPage(currentPage - 1)">
              <span class="material-symbols-outlined">chevron_left</span>
              <span>Prev</span>
            </button>
            <button
              *ngFor="let p of pageNumbers"
              type="button"
              class="page-num-btn"
              [class.active]="p === currentPage"
              (click)="goToPage(p)"
            >
              {{ p }}
            </button>
            <button type="button" class="nav-btn" [disabled]="currentPage >= totalPages" (click)="goToPage(currentPage + 1)">
              <span>Next</span>
              <span class="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      <!-- ========================================================================= -->
      <!-- TAB 2: DAILY TIMESHEET SUMMARY -->
      <!-- ========================================================================= -->
      <div class="table-card" *ngIf="activeTab === 'timesheet'">
        <div class="table-card-header">
          <div class="header-title">
            <span class="material-symbols-outlined text-blue">assignment</span>
            <div>
              <h3>Daily Timesheet &amp; Attendance Summary ({{ filteredShifts.length }})</h3>
              <p class="card-sub-note">Cross-comparison of scheduled hours versus verified clock-in and clock-out attendance logs.</p>
            </div>
          </div>
        </div>

        <div class="empty-box" *ngIf="!isLoading && filteredShifts.length === 0">
          <span class="material-symbols-outlined empty-icon">assignment</span>
          <h4>No Timesheet Records Found</h4>
          <p>No scheduled shifts match your current filter selection.</p>
        </div>

        <div class="table-responsive" *ngIf="!isLoading && filteredShifts.length > 0">
          <table class="bcp-table">
            <thead>
              <tr>
                <th style="width: 56px;">S/N</th>
                <th>Staff Officer</th>
                <th>Venue &amp; Post</th>
                <th>Start Time</th>
                <th>End Time</th>
                <th>Acceptance Status</th>
                <th>Live Duty Status</th>
                <th>Rate / Hour</th>
                <th class="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let s of paginatedShifts; let i = index">
                <td><span class="sn-badge">{{ getSerialNumber(i) }}</span></td>
                <td>
                  <strong class="staff-name">{{ s.assignedUserName || 'Unassigned Staff' }}</strong>
                  <div class="addr-text">{{ s.shiftCode }}</div>
                </td>
                <td>
                  <strong class="venue-name">{{ s.siteName }}</strong>
                  <div class="post-text">{{ s.postName }}</div>
                </td>
                <td><span class="date-text">{{ s.startsAtUtc | date:'dd MMM yyyy, HH:mm' }}</span></td>
                <td><span class="date-text">{{ s.endsAtUtc | date:'dd MMM yyyy, HH:mm' }}</span></td>
                <td>
                  <span class="status-pill" [ngClass]="s.isConfirmedByGuard ? 'status-active' : (s.assignedUserId ? 'status-scheduled' : 'status-open')">
                    {{ s.isConfirmedByGuard ? 'Accepted' : (s.assignedUserId ? 'Pending Acceptance' : 'Open Shift') }}
                  </span>
                </td>
                <td>
                  <span class="status-pill status-active" *ngIf="s.isClockedIn && !s.isClockedOut">
                    ● Active on Site
                  </span>
                  <span class="status-pill status-completed" *ngIf="s.isClockedOut">
                    Clocked Out
                  </span>
                  <span class="addr-text" *ngIf="!s.isClockedIn && !s.isClockedOut">Awaiting Clock-In</span>
                </td>
                <td>
                  <strong class="pay-text">{{ currencySymbol }}{{ (s.hourlyPayRate || 0) | number:'1.2-2' }}/hr</strong>
                </td>
                <td class="text-right">
                  <a [routerLink]="['/workforce/console/shifts', s.id, 'report']" class="action-btn btn-report">
                    <span class="material-symbols-outlined">visibility</span>
                    <span>Duty Report</span>
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ========================================================================= -->
      <!-- TAB 3: SHIFT SWAPS -->
      <!-- ========================================================================= -->
      <div class="table-card" *ngIf="activeTab === 'swaps'">
        <div class="table-card-header">
          <div class="header-title">
            <span class="material-symbols-outlined text-blue">swap_horiz</span>
            <div>
              <h3>Peer Shift Swap Approvals ({{ workspaceSwaps.length }})</h3>
              <p class="card-sub-note">Review peer coverage requests, verify roster compliance, and approve duty transfers.</p>
            </div>
          </div>
          <button type="button" class="btn btn-outline btn-sm" (click)="loadWorkspaceSwaps()">
            <span class="material-symbols-outlined" [class.spin]="isLoadingSwaps">refresh</span>
            <span>Refresh Swaps</span>
          </button>
        </div>

        <div class="loading-box" *ngIf="isLoadingSwaps">
          <div class="spinner-ring"></div>
          <span>Loading shift swap requests...</span>
        </div>

        <div class="empty-box" *ngIf="!isLoadingSwaps && workspaceSwaps.length === 0">
          <span class="material-symbols-outlined empty-icon">swap_horiz</span>
          <h4>No Shift Swap Requests</h4>
          <p>There are currently no active or pending shift swaps submitted by team members.</p>
        </div>

        <div class="table-responsive" *ngIf="!isLoadingSwaps && workspaceSwaps.length > 0">
          <table class="bcp-table">
            <thead>
              <tr>
                <th style="width: 56px;">S/N</th>
                <th>Shift Code</th>
                <th>Work Location &amp; Post</th>
                <th>Scheduled Date &amp; Time</th>
                <th>Requesting Officer</th>
                <th>Covering Officer</th>
                <th>Reason</th>
                <th>Status</th>
                <th class="text-right">Supervisor Action</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let sw of workspaceSwaps; let i = index">
                <td><span class="sn-badge">{{ i + 1 }}</span></td>
                <td><span class="shift-code-badge">{{ sw.shiftCode }}</span></td>
                <td>
                  <strong class="venue-name">{{ sw.siteName }}</strong>
                  <div class="post-text">{{ sw.postName }}</div>
                </td>
                <td>
                  <div *ngIf="sw.startsAtUtc">
                    <strong class="date-text">{{ sw.startsAtUtc | date:'dd MMM yyyy' }}</strong>
                    <div class="addr-text">{{ sw.startsAtUtc | date:'HH:mm' }} – {{ sw.endsAtUtc | date:'HH:mm' }}</div>
                  </div>
                  <span *ngIf="!sw.startsAtUtc">—</span>
                </td>
                <td><strong class="staff-name">{{ sw.requestingUserName }}</strong></td>
                <td>
                  <strong class="staff-name" *ngIf="sw.offeredToUserName">{{ sw.offeredToUserName }}</strong>
                  <span class="status-pill status-open" *ngIf="!sw.offeredToUserName">Team Broadcast</span>
                </td>
                <td><span class="addr-text">{{ sw.reason || 'None stated' }}</span></td>
                <td>
                  <span class="status-pill" [ngClass]="sw.status === 'Approved' ? 'status-active' : (sw.status === 'Rejected' ? 'status-cancelled' : 'status-scheduled')">
                    {{ sw.status }}
                  </span>
                </td>
                <td class="text-right">
                  <div class="actions-cell" *ngIf="sw.status === 'PendingSupervisor' || sw.status === 'Pending'">
                    <button type="button" class="action-btn btn-approve" (click)="reviewSwap(sw, true)">
                      <span class="material-symbols-outlined">check</span>
                      <span>Approve</span>
                    </button>
                    <button type="button" class="action-btn btn-delete" (click)="reviewSwap(sw, false)">
                      <span class="material-symbols-outlined">close</span>
                      <span>Decline</span>
                    </button>
                  </div>
                  <span class="status-pill status-active" *ngIf="sw.status === 'Approved'">✓ Approved</span>
                  <span class="status-pill status-cancelled" *ngIf="sw.status === 'Rejected'">Declined</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ========================================================================= -->
      <!-- TAB 4: LEAVE & EXCUSE APPROVALS -->
      <!-- ========================================================================= -->
      <div class="table-card" *ngIf="activeTab === 'leave'">
        <div class="table-card-header">
          <div class="header-title">
            <span class="material-symbols-outlined text-blue">event_busy</span>
            <div>
              <h3>Staff Time-Off &amp; Leave Approvals ({{ leaveRequests.length }})</h3>
              <p class="card-sub-note">Manage staff absence requests, excused duty notices, and calendar availability blackouts.</p>
            </div>
          </div>
          <button type="button" class="btn btn-outline btn-sm" (click)="loadLeaveRequests()">
            <span class="material-symbols-outlined" [class.spin]="isLoadingLeave">refresh</span>
            <span>Refresh Leave</span>
          </button>
        </div>

        <div class="loading-box" *ngIf="isLoadingLeave">
          <div class="spinner-ring"></div>
          <span>Loading leave and excuse requests...</span>
        </div>

        <div class="empty-box" *ngIf="!isLoadingLeave && leaveRequests.length === 0">
          <span class="material-symbols-outlined empty-icon">event_busy</span>
          <h4>No Time-Off Requests</h4>
          <p>There are currently no pending absence or leave applications from staff members.</p>
        </div>

        <div class="table-responsive" *ngIf="!isLoadingLeave && leaveRequests.length > 0">
          <table class="bcp-table">
            <thead>
              <tr>
                <th style="width: 56px;">S/N</th>
                <th>Staff Officer</th>
                <th>Leave Type</th>
                <th>Dates Requested</th>
                <th>Duration</th>
                <th>Reason &amp; Notes</th>
                <th>Status</th>
                <th class="text-right">Supervisor Action</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let lv of leaveRequests; let i = index">
                <td><span class="sn-badge">{{ i + 1 }}</span></td>
                <td><strong class="staff-name">{{ lv.userName }}</strong></td>
                <td><span class="status-pill status-scheduled">{{ lv.leaveType }}</span></td>
                <td>
                  <strong class="date-text">{{ lv.startDate | date:'dd MMM yyyy' }} – {{ lv.endDate | date:'dd MMM yyyy' }}</strong>
                </td>
                <td><strong>{{ lv.totalDays }} day{{ lv.totalDays === 1 ? '' : 's' }}</strong></td>
                <td><span class="addr-text">{{ lv.reason || 'None provided' }}</span></td>
                <td>
                  <span class="status-pill" [ngClass]="lv.status === 'Approved' ? 'status-active' : (lv.status === 'Rejected' ? 'status-cancelled' : 'status-open')">
                    {{ lv.status }}
                  </span>
                </td>
                <td class="text-right">
                  <div class="actions-cell" *ngIf="lv.status === 'Pending'">
                    <button type="button" class="action-btn btn-approve" (click)="reviewLeave(lv, true)">
                      <span class="material-symbols-outlined">check</span>
                      <span>Approve</span>
                    </button>
                    <button type="button" class="action-btn btn-delete" (click)="reviewLeave(lv, false)">
                      <span class="material-symbols-outlined">close</span>
                      <span>Decline</span>
                    </button>
                  </div>
                  <span class="status-pill status-active" *ngIf="lv.status === 'Approved'">✓ Approved</span>
                  <span class="status-pill status-cancelled" *ngIf="lv.status === 'Rejected'">Declined</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Delete Confirmation Modal -->
      <div class="modal-backdrop" *ngIf="shiftToDelete" (click)="shiftToDelete = null">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <span class="material-symbols-outlined text-red">warning</span>
            <h3>Delete Shift</h3>
          </div>
          <div class="modal-body">
            <p>
              Are you sure you want to delete shift <strong>{{ shiftToDelete.shiftCode }}</strong> at
              <strong>{{ shiftToDelete.siteName }}</strong> on
              <strong>{{ shiftToDelete.startsAtUtc | date:'d MMM y, HH:mm' }}</strong>?
            </p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" (click)="shiftToDelete = null">Cancel</button>
            <button type="button" class="btn btn-danger" [disabled]="isDeleting" (click)="deleteConfirmed()">
              {{ isDeleting ? 'Deleting...' : 'Delete Shift' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Info Guide Modal -->
      <div class="modal-backdrop" *ngIf="showInfoModal" (click)="showInfoModal = false">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <span class="material-symbols-outlined text-blue">info</span>
            <h3>Shift Manager Guide</h3>
          </div>
          <div class="modal-body">
            <p><strong>Roster List:</strong> Central tabular view of all workforce shifts across all venues and dates with pagination and S/N tracking.</p>
            <p><strong>Daily Timesheet:</strong> Compare scheduled duty windows with live clock-in and clock-out attendance.</p>
            <p><strong>Shift Swaps &amp; Leave Approvals:</strong> Review and approve/decline peer shift swap requests and staff leave/excuse applications in one place.</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-primary" (click)="showInfoModal = false">Got It</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .bcp-page-container { display: flex; flex-direction: column; gap: 18px; padding: 0 4px 40px 4px; width: 100%; }
    .page-header { display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; background: #ffffff; padding: 18px 22px; border-radius: 14px; border: 1px solid #e2e8f0; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02); }
    .header-left { display: flex; flex-direction: column; gap: 6px; }
    .breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #64748b; }
    .breadcrumb a { color: #0050e5; text-decoration: none; font-weight: 500; }
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
    .btn-danger { background: #dc2626; color: #ffffff; }
    .btn-sm { padding: 0 10px; height: 30px; font-size: 11.5px; }

    /* Operational Tabs Bar */
    .ops-tabs-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      background: #ffffff;
      padding: 8px 12px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
    }
    .ops-tabs-list {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }
    .ops-tab-btn {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 8px 14px;
      border-radius: 8px;
      border: none;
      background: #f8fafc;
      color: #475569;
      font-size: 12.5px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .ops-tab-btn .material-symbols-outlined { font-size: 17px; }
    .ops-tab-btn:hover { background: #e2e8f0; color: #0f172a; }
    .ops-tab-btn.active {
      background: #0050e5;
      color: #ffffff;
      box-shadow: 0 2px 8px rgba(0, 80, 229, 0.24);
    }
    .tab-pill {
      font-size: 11px;
      font-weight: 800;
      padding: 1px 7px;
      border-radius: 999px;
      background: #e2e8f0;
      color: #334155;
    }
    .tab-pill.warn {
      background: #fef3c7;
      color: #b45309;
    }
    .ops-tab-btn.active .tab-pill {
      background: rgba(255, 255, 255, 0.22);
      color: #ffffff;
    }
    .calendar-quick-link {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 12px;
      font-weight: 700;
      color: #0050e5;
      text-decoration: none;
      padding: 6px 10px;
      border-radius: 8px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
    }
    .calendar-quick-link:hover { background: #dbeafe; }
    .calendar-quick-link .material-symbols-outlined { font-size: 16px; }

    /* KPI Strip */
    .kpi-strip { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 14px; }
    .kpi-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; display: flex; align-items: center; gap: 14px; cursor: pointer; transition: all 0.15s ease; }
    .kpi-card:hover { border-color: #93c5fd; transform: translateY(-1px); }
    .kpi-card.active-filter { border-color: #0050e5; box-shadow: 0 0 0 2px rgba(0,80,229,0.12); }
    .kpi-icon { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
    .kpi-icon.bg-blue { background: #eff6ff; color: #0050e5; }
    .kpi-icon.bg-green { background: #f0fdf4; color: #16a34a; }
    .kpi-icon.bg-amber { background: #fffbeb; color: #d97706; }
    .kpi-icon.bg-purple { background: #f5f3ff; color: #7c3aed; }
    .kpi-info { display: flex; flex-direction: column; }
    .kpi-val { font-size: 22px; font-weight: 800; color: #0f172a; line-height: 1.1; }
    .kpi-lbl { font-size: 12px; color: #64748b; font-weight: 600; margin-top: 2px; }

    /* Filters */
    .filter-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 18px; }
    .filter-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
    .search-box { flex: 1 1 260px; display: flex; align-items: center; gap: 8px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 0 12px; height: 38px; }
    .search-box input { border: none; background: transparent; outline: none; width: 100%; font-size: 13px; color: #0f172a; }
    .clear-btn { background: none; border: none; color: #64748b; cursor: pointer; display: flex; align-items: center; }
    .filter-group { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .filter-select { height: 38px; padding: 0 12px; border: 1px solid #cbd5e1; border-radius: 8px; background: #ffffff; font-size: 12.5px; color: #1e293b; outline: none; }

    /* Table */
    .table-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
    .table-card-header { padding: 16px 20px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
    .header-title { display: flex; align-items: center; gap: 10px; }
    .header-title h3 { margin: 0; font-size: 15px; font-weight: 700; color: #0f172a; }
    .card-sub-note { margin: 2px 0 0 0; font-size: 12px; color: #64748b; }
    .text-blue { color: #0050e5; }
    .text-red { color: #dc2626; }
    .text-right { text-align: right; }

    .table-responsive { width: 100%; overflow-x: auto; }
    .bcp-table { width: 100%; border-collapse: collapse; text-align: left; }
    .bcp-table th { background: #f8fafc; padding: 12px 16px; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #475569; letter-spacing: 0.04em; border-bottom: 1px solid #e2e8f0; }
    .bcp-table td { padding: 14px 16px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #1e293b; vertical-align: middle; }
    .bcp-table tr:hover td { background: #fafbfc; }
    .bcp-table tr.row-completed td { opacity: 0.88; background: #f8fafc; }

    .code-cell { display: flex; flex-direction: column; gap: 4px; align-items: flex-start; }
    .shift-code-badge { font-family: monospace; font-weight: 700; font-size: 12px; background: #f1f5f9; color: #0f172a; padding: 3px 8px; border-radius: 6px; border: 1px solid #e2e8f0; }
    .event-tag { font-size: 11px; color: #0050e5; font-weight: 600; }

    .datetime-cell { display: flex; flex-direction: column; gap: 4px; }
    .date-text { font-weight: 700; color: #0f172a; }
    .time-range { display: flex; align-items: center; gap: 5px; font-size: 12px; color: #475569; }
    .time-range .material-symbols-outlined { font-size: 15px; color: #64748b; }
    .overnight-pill { display: inline-flex; align-items: center; gap: 3px; background: #ede9fe; color: #6d28d9; font-size: 10.5px; font-weight: 700; padding: 2px 7px; border-radius: 999px; }
    .overnight-pill .material-symbols-outlined { font-size: 12px; color: #6d28d9; }

    .venue-cell { display: flex; flex-direction: column; gap: 2px; }
    .venue-name { font-weight: 700; color: #0f172a; }
    .post-text { font-size: 12px; color: #0050e5; font-weight: 600; }
    .addr-text { font-size: 11.5px; color: #64748b; }

    .staff-cell { display: flex; align-items: center; gap: 10px; }
    .staff-avatar { width: 34px; height: 34px; border-radius: 50%; background: #eff6ff; color: #0050e5; font-weight: 700; font-size: 12px; display: flex; align-items: center; justify-content: center; border: 1px solid #bfdbfe; flex-shrink: 0; }
    .staff-details { display: flex; flex-direction: column; }
    .staff-name { font-weight: 700; color: #0f172a; }
    .staff-sub { font-size: 11.5px; color: #64748b; }

    .open-shift-cell { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; }
    .open-shift-badge { display: inline-flex; align-items: center; gap: 5px; background: #fffbeb; color: #b45309; border: 1px solid #fde68a; padding: 4px 10px; border-radius: 999px; font-size: 11.5px; font-weight: 700; }
    .open-shift-badge .material-symbols-outlined { font-size: 15px; }
    .btn-broadcast-mini { display: inline-flex; align-items: center; gap: 4px; background: #eff6ff; color: #0050e5; border: 1px solid #bfdbfe; border-radius: 6px; padding: 3px 8px; font-size: 11px; font-weight: 600; cursor: pointer; }
    .btn-broadcast-mini:hover { background: #dbeafe; }
    .btn-broadcast-mini .material-symbols-outlined { font-size: 14px; }

    .rate-cell { display: flex; flex-direction: column; gap: 2px; }
    .hrs-text { font-weight: 700; color: #0f172a; }
    .pay-text { font-size: 12px; color: #16a34a; font-weight: 600; }

    .status-pill { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 999px; font-size: 11.5px; font-weight: 700; }
    .status-open { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
    .status-scheduled { background: #eff6ff; color: #0050e5; border: 1px solid #bfdbfe; }
    .status-active { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
    .status-completed { background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; }
    .status-cancelled { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }

    .actions-cell { display: inline-flex; align-items: center; justify-content: flex-end; gap: 6px; }
    .action-btn { display: inline-flex; align-items: center; gap: 4px; padding: 6px 10px; border-radius: 7px; font-size: 12px; font-weight: 600; text-decoration: none; cursor: pointer; border: 1px solid #e2e8f0; background: #ffffff; color: #334155; transition: all 0.15s ease; }
    .action-btn .material-symbols-outlined { font-size: 16px; }
    .action-btn.btn-edit:hover { background: #eff6ff; color: #0050e5; border-color: #bfdbfe; }
    .action-btn.btn-approve { background: #f0fdf4; color: #15803d; border-color: #bbf7d0; }
    .action-btn.btn-approve:hover { background: #16a34a; color: #ffffff; }
    .action-btn.btn-report:hover { background: #f8fafc; color: #0f172a; border-color: #94a3b8; }
    .action-btn.btn-delete { color: #dc2626; }
    .action-btn.btn-delete:hover { background: #fef2f2; border-color: #fecaca; }

    .completed-lock-chip { display: inline-flex; align-items: center; gap: 4px; padding: 5px 10px; border-radius: 7px; font-size: 11.5px; font-weight: 600; background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0; }
    .completed-lock-chip .material-symbols-outlined { font-size: 14px; }

    .loading-box, .empty-box { padding: 48px 24px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; text-align: center; color: #64748b; }
    .empty-icon { font-size: 42px; color: #94a3b8; }
    .empty-box h4 { margin: 0; font-size: 16px; color: #0f172a; }
    .empty-box p { margin: 0 0 8px 0; font-size: 13px; max-width: 420px; }

    .modal-backdrop { position: fixed; inset: 0; background: rgba(15,23,42,0.45); display: flex; align-items: center; justify-content: center; z-index: 1200; padding: 16px; }
    .modal-card { background: #ffffff; border-radius: 14px; max-width: 480px; width: 100%; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.15); overflow: hidden; }
    .modal-header { display: flex; align-items: center; gap: 10px; padding: 18px 22px; border-bottom: 1px solid #f1f5f9; }
    .modal-header h3 { margin: 0; font-size: 16px; font-weight: 700; color: #0f172a; }
    .modal-body { padding: 20px 22px; font-size: 13.5px; color: #334155; line-height: 1.55; }
    .modal-footer { padding: 14px 22px; background: #f8fafc; border-top: 1px solid #f1f5f9; display: flex; justify-content: flex-end; gap: 10px; }

    .sn-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 28px; height: 26px; padding: 0 6px; border-radius: 6px; background: #f1f5f9; color: #475569; font-size: 12px; font-weight: 700; font-family: monospace; }

    .pagination-footer { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 14px 20px; border-top: 1px solid #f1f5f9; background: #fafbfc; flex-wrap: wrap; }
    .page-summary { font-size: 12.5px; color: #64748b; }
    .page-summary strong { color: #0f172a; }
    .page-size-controls { display: flex; align-items: center; gap: 10px; }
    .size-label { font-size: 12px; font-weight: 600; color: #64748b; }
    .size-pills { display: inline-flex; align-items: center; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 2px; gap: 2px; }
    .size-pill { border: none; background: transparent; color: #475569; font-size: 12px; font-weight: 700; padding: 5px 11px; border-radius: 6px; cursor: pointer; transition: all 0.15s ease; }
    .size-pill:hover { background: #f1f5f9; color: #0f172a; }
    .size-pill.active { background: #0050e5; color: #ffffff; }
    .page-nav-controls { display: flex; align-items: center; gap: 6px; }
    .nav-btn, .page-num-btn { display: inline-flex; align-items: center; justify-content: center; gap: 2px; height: 32px; padding: 0 10px; border-radius: 7px; border: 1px solid #cbd5e1; background: #ffffff; color: #334155; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.15s ease; }
    .page-num-btn { min-width: 32px; padding: 0 6px; }
    .nav-btn:hover:not(:disabled), .page-num-btn:hover { background: #eff6ff; color: #0050e5; border-color: #bfdbfe; }
    .page-num-btn.active { background: #0050e5; color: #ffffff; border-color: #0050e5; }
    .nav-btn:disabled { opacity: 0.45; cursor: not-allowed; }
    .nav-btn .material-symbols-outlined { font-size: 16px; }

    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { 100% { transform: rotate(360deg); } }
  `]
})
export class WorkforceShiftManagerComponent implements OnInit {
  private readonly PAGE_SIZE_STORAGE_KEY = 'ozikol_shift_manager_page_size';
  activeTab: 'list' | 'timesheet' | 'swaps' | 'leave' = 'list';

  shifts: any[] = [];
  sites: ClientSite[] = [];
  workspaceSwaps: any[] = [];
  leaveRequests: any[] = [];

  isLoading = false;
  isLoadingSwaps = false;
  isLoadingLeave = false;
  currencySymbol = '£';

  searchQuery = '';
  siteFilter = '';
  assignmentFilter: '' | 'open' | 'assigned' = '';
  statusFilter = '';
  dateFilter = '';

  pageSizeOptions: { label: string; value: number | 'all' }[] = [
    { label: '15', value: 15 },
    { label: '25', value: 25 },
    { label: '100', value: 100 },
    { label: 'All', value: 'all' }
  ];
  pageSize: number | 'all' = 15;
  currentPage = 1;

  shiftToDelete: any = null;
  isDeleting = false;
  broadcastingId: string | null = null;
  showInfoModal = false;

  constructor(
    private readonly workforceService: WorkforceService,
    private readonly toast: ToastService,
    private readonly route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.restoreSavedPageSize();
    this.loadCurrency();
    this.loadAll();
    this.loadWorkspaceSwaps();
    this.loadLeaveRequests();

    this.route.queryParams.subscribe(params => {
      if (params['tab'] && ['list', 'timesheet', 'swaps', 'leave'].includes(params['tab'])) {
        this.activeTab = params['tab'];
      }
      if (params['date']) {
        this.dateFilter = params['date'];
      }
    });
  }

  switchTab(tab: 'list' | 'timesheet' | 'swaps' | 'leave'): void {
    this.activeTab = tab;
    if (tab === 'swaps' && this.workspaceSwaps.length === 0) {
      this.loadWorkspaceSwaps();
    } else if (tab === 'leave' && this.leaveRequests.length === 0) {
      this.loadLeaveRequests();
    }
  }

  refreshCurrentTab(): void {
    this.loadAll();
    this.loadWorkspaceSwaps();
    this.loadLeaveRequests();
  }

  private restoreSavedPageSize(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem(this.PAGE_SIZE_STORAGE_KEY);
        if (saved === 'all') {
          this.pageSize = 'all';
        } else if (saved) {
          const parsed = parseInt(saved, 10);
          if ([15, 25, 100].includes(parsed)) {
            this.pageSize = parsed;
          }
        }
      }
    } catch {}
  }

  setPageSize(size: number | 'all'): void {
    this.pageSize = size;
    this.currentPage = 1;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.PAGE_SIZE_STORAGE_KEY, String(size));
      }
    } catch {}
  }

  get effectivePageSize(): number {
    const total = this.filteredShifts.length;
    if (this.pageSize === 'all') return Math.max(1, total);
    return this.pageSize;
  }

  get totalPages(): number {
    if (this.pageSize === 'all') return 1;
    return Math.max(1, Math.ceil(this.filteredShifts.length / this.effectivePageSize));
  }

  get pageNumbers(): number[] {
    const pages: number[] = [];
    for (let i = 1; i <= this.totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  get paginatedShifts(): any[] {
    const list = this.filteredShifts;
    if (this.pageSize === 'all') return list;
    const safePage = Math.min(this.currentPage, this.totalPages);
    const start = (safePage - 1) * this.effectivePageSize;
    return list.slice(start, start + this.effectivePageSize);
  }

  get startEntryIndex(): number {
    if (this.filteredShifts.length === 0) return 0;
    if (this.pageSize === 'all') return 1;
    const safePage = Math.min(this.currentPage, this.totalPages);
    return (safePage - 1) * this.effectivePageSize + 1;
  }

  get endEntryIndex(): number {
    if (this.filteredShifts.length === 0) return 0;
    if (this.pageSize === 'all') return this.filteredShifts.length;
    return Math.min(this.filteredShifts.length, this.startEntryIndex + this.effectivePageSize - 1);
  }

  getSerialNumber(indexOnPage: number): number {
    return this.startEntryIndex + indexOnPage;
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  loadCurrency(): void {
    this.workforceService.getTenantCurrency().subscribe({
      next: (res: any) => {
        if (res?.data?.currencySymbol) {
          this.currencySymbol = res.data.currencySymbol;
        }
      },
      error: () => {}
    });
  }

  loadAll(): void {
    this.isLoading = true;
    this.workforceService.getSites().subscribe({
      next: (res: any) => {
        this.sites = Array.isArray(res?.data) ? res.data : [];
      },
      error: () => {}
    });

    this.workforceService.getShifts().subscribe({
      next: (res: any) => {
        this.isLoading = false;
        this.shifts = Array.isArray(res?.data) ? res.data : [];
      },
      error: () => {
        this.isLoading = false;
        this.toast.error('Could not load shifts directory.');
      }
    });
  }

  loadWorkspaceSwaps(): void {
    this.isLoadingSwaps = true;
    this.workforceService.getWorkspaceSwaps().subscribe({
      next: (res: any) => {
        this.isLoadingSwaps = false;
        this.workspaceSwaps = Array.isArray(res?.data) ? res.data : [];
      },
      error: () => {
        this.isLoadingSwaps = false;
      }
    });
  }

  loadLeaveRequests(): void {
    this.isLoadingLeave = true;
    this.workforceService.getSupervisorLeaveRequests().subscribe({
      next: (res: any) => {
        this.isLoadingLeave = false;
        this.leaveRequests = Array.isArray(res?.data) ? res.data : [];
      },
      error: () => {
        this.isLoadingLeave = false;
      }
    });
  }

  reviewSwap(swap: any, isApproved: boolean): void {
    this.workforceService.reviewSwap(swap.id, { isApproved }).subscribe({
      next: (res: any) => {
        if (res?.isSuccess !== false) {
          this.toast.success(isApproved ? 'Shift swap approved and roster updated.' : 'Shift swap declined.');
          this.loadWorkspaceSwaps();
          this.loadAll();
        } else {
          this.toast.error(res?.message || 'Swap review failed.');
        }
      },
      error: () => this.toast.error('Error reviewing shift swap.')
    });
  }

  reviewLeave(leave: any, isApproved: boolean): void {
    let rejectionReason: string | undefined;
    if (!isApproved) {
      const reason = prompt('Please specify reason for declining time-off:');
      if (reason === null) return;
      rejectionReason = reason;
    }

    this.workforceService.reviewLeaveRequest(leave.id, { isApproved, rejectionReason }).subscribe({
      next: (res: any) => {
        if (res?.isSuccess !== false) {
          this.toast.success(isApproved ? 'Leave request approved.' : 'Leave request declined.');
          this.loadLeaveRequests();
        } else {
          this.toast.error(res?.message || 'Leave review failed.');
        }
      },
      error: () => this.toast.error('Error reviewing leave request.')
    });
  }

  get assignedShiftsCount(): number {
    return this.shifts.filter(s => !this.isOpenShift(s)).length;
  }

  get openShiftsCount(): number {
    return this.shifts.filter(s => this.isOpenShift(s)).length;
  }

  get completedShiftsCount(): number {
    return this.shifts.filter(s => this.isShiftDone(s)).length;
  }

  get pendingSwapsCount(): number {
    return this.workspaceSwaps.filter(s => s.status === 'PendingSupervisor' || s.status === 'Pending').length;
  }

  get pendingLeaveCount(): number {
    return this.leaveRequests.filter(l => l.status === 'Pending').length;
  }

  get filteredShifts(): any[] {
    const q = this.searchQuery.trim().toLowerCase();
    return this.shifts.filter(s => {
      if (this.siteFilter && s.clientSiteId !== this.siteFilter) {
        return false;
      }
      if (this.assignmentFilter === 'open' && !this.isOpenShift(s)) {
        return false;
      }
      if (this.assignmentFilter === 'assigned' && this.isOpenShift(s)) {
        return false;
      }
      if (this.dateFilter && s.startsAtUtc) {
        const shiftDate = new Date(s.startsAtUtc).toISOString().slice(0, 10);
        if (shiftDate !== this.dateFilter) return false;
      }
      if (this.statusFilter) {
        const disp = this.getDisplayStatus(s).toLowerCase();
        if (this.statusFilter === 'Open' && !this.isOpenShift(s)) return false;
        else if (this.statusFilter !== 'Open' && !disp.includes(this.statusFilter.toLowerCase()) && (s.status || '').toLowerCase() !== this.statusFilter.toLowerCase()) {
          return false;
        }
      }
      if (!q) return true;
      return (
        (s.shiftCode || '').toLowerCase().includes(q) ||
        (s.siteName || '').toLowerCase().includes(q) ||
        (s.postName || '').toLowerCase().includes(q) ||
        (s.facilityName || '').toLowerCase().includes(q) ||
        (s.assignedUserName || '').toLowerCase().includes(q) ||
        (s.assignedUserEmail || '').toLowerCase().includes(q) ||
        (s.eventTag || '').toLowerCase().includes(q)
      );
    });
  }

  isOpenShift(shift: any): boolean {
    return !shift?.assignedUserId || String(shift.assignedUserId).trim() === '' || (shift.status || '').toLowerCase() === 'open';
  }

  isShiftDone(shift: any): boolean {
    const status = (shift?.status || '').toLowerCase();
    return status === 'completed' || status === 'done' || status === 'closed';
  }

  getDisplayStatus(shift: any): string {
    if (this.isShiftDone(shift)) return 'Completed';
    if ((shift?.status || '').toLowerCase() === 'cancelled') return 'Cancelled';
    if ((shift?.status || '').toLowerCase() === 'inprogress' || (shift?.status || '').toLowerCase() === 'active') return 'On Duty';
    if (this.isOpenShift(shift)) return 'Open Shift';
    if ((shift?.status || '').toLowerCase() === 'confirmed') return 'Confirmed';
    return shift?.status || 'Scheduled';
  }

  getStatusClass(shift: any): string {
    if (this.isShiftDone(shift)) return 'status-completed';
    const st = (shift?.status || '').toLowerCase();
    if (st === 'cancelled') return 'status-cancelled';
    if (st === 'inprogress' || st === 'active') return 'status-active';
    if (this.isOpenShift(shift)) return 'status-open';
    return 'status-scheduled';
  }

  setStatusFilter(status: string): void {
    this.statusFilter = this.statusFilter === status ? '' : status;
    this.currentPage = 1;
  }

  toggleAssignmentFilter(mode: 'open' | 'assigned'): void {
    this.assignmentFilter = this.assignmentFilter === mode ? '' : mode;
    this.currentPage = 1;
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.siteFilter = '';
    this.assignmentFilter = '';
    this.statusFilter = '';
    this.dateFilter = '';
    this.currentPage = 1;
  }

  calculateHours(shift: any): number {
    if (!shift?.startsAtUtc || !shift?.endsAtUtc) return 0;
    const start = new Date(shift.startsAtUtc).getTime();
    const end = new Date(shift.endsAtUtc).getTime();
    const diffHrs = Math.max(0, (end - start) / (1000 * 60 * 60));
    const breakHrs = (shift.breakMinutes || 0) / 60;
    return Math.max(0, diffHrs - breakHrs);
  }

  getInitials(name: string): string {
    if (!name) return 'ST';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  broadcastShift(shift: any): void {
    if (!shift?.id) return;
    this.broadcastingId = shift.id;
    this.workforceService.broadcastOpenShift(shift.id).subscribe({
      next: () => {
        this.broadcastingId = null;
        this.toast.success(`Open shift alert dispatched for ${shift.siteName || shift.shiftCode}.`);
      },
      error: (err: any) => {
        this.broadcastingId = null;
        this.toast.error(err?.error?.message || 'Could not dispatch open shift alert.');
      }
    });
  }

  confirmDelete(shift: any): void {
    if (this.isShiftDone(shift)) {
      this.toast.warning('Completed shifts cannot be deleted.');
      return;
    }
    this.shiftToDelete = shift;
  }

  deleteConfirmed(): void {
    if (!this.shiftToDelete) return;
    this.isDeleting = true;
    this.workforceService.deleteShift(this.shiftToDelete.id).subscribe({
      next: () => {
        this.isDeleting = false;
        this.toast.success('Shift deleted.');
        this.shifts = this.shifts.filter(s => s.id !== this.shiftToDelete.id);
        this.shiftToDelete = null;
      },
      error: (err: any) => {
        this.isDeleting = false;
        this.toast.error(err?.error?.message || 'Could not delete shift.');
      }
    });
  }
}
