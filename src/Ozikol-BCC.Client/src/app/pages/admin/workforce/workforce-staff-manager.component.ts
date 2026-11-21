import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { WorkforceService } from '../../../core/services/workforce.service';
import { ToastService } from '../../../core/services/toast.service';

/**
 * Dedicated Administrator Staff Manager Component (`/workforce/console/staff`).
 * Lists all workforce staff members with contract terms, availability, punctuality,
 * and provides two distinct onboarding actions:
 * 1. Full Staff Registration (`/workforce/console/staff/create`) — In-house admin registration (works even when public form is disabled).
 * 2. Invite to Register (`/workforce/console/enroll`) — Dispatches a one-time self-registration link.
 */
@Component({
  selector: 'app-workforce-staff-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="bcp-page-container">
      <!-- 1. Page Header -->
      <div class="page-header">
        <div class="header-left">
          <div class="breadcrumb">
            <a routerLink="/admin/dashboard">Command Center</a>
            <span class="sep">/</span>
            <span>Staff Rota &amp; Shifts</span>
            <span class="sep">/</span>
            <span class="current">Staff Manager</span>
          </div>
          <div class="title-row">
            <h1>Staff Manager</h1>
            <span class="badge-suite">Suite: Workforce &amp; Shifts</span>
          </div>
          <p class="subtitle">
            Manage your workforce roster, contract classifications, hourly pay rates, and onboard new staff in-house or via invitation.
          </p>
        </div>
        <div class="header-actions">
          <button type="button" class="btn btn-outline" (click)="loadAll()">
            <span class="material-symbols-outlined" [class.spin]="isLoading">refresh</span>
            <span>Refresh</span>
          </button>
          <a routerLink="/workforce/console/enroll" class="btn btn-outline-blue" title="Send a single-use link for the staff member to fill the registration form">
            <span class="material-symbols-outlined">mail</span>
            <span>Invite to Register</span>
          </a>
          <button type="button" class="btn btn-outline-blue" (click)="openEnrollModal()" title="Enroll an existing user from the directory into shifts">
            <span class="material-symbols-outlined">how_to_reg</span>
            <span>Enroll Existing Member</span>
          </button>
          <a routerLink="/workforce/console/staff/create" class="btn btn-primary" title="Register staff member in-house and email them a password setup link">
            <span class="material-symbols-outlined">person_add</span>
            <span>Full Staff Registration</span>
          </a>
        </div>
      </div>

      <!-- 2. Summary KPI Strip -->
      <div class="kpi-strip">
        <div class="kpi-card" [class.active-filter]="availabilityFilter === ''" (click)="availabilityFilter = ''">
          <div class="kpi-icon bg-blue">
            <span class="material-symbols-outlined">groups</span>
          </div>
          <div class="kpi-info">
            <span class="kpi-val">{{ members.length }}</span>
            <span class="kpi-lbl">Total Enrolled Staff</span>
          </div>
        </div>

        <div class="kpi-card" [class.active-filter]="availabilityFilter === 'Available'" (click)="toggleAvailability('Available')">
          <div class="kpi-icon bg-green">
            <span class="material-symbols-outlined">verified_user</span>
          </div>
          <div class="kpi-info">
            <span class="kpi-val">{{ availableCount }}</span>
            <span class="kpi-lbl">Full Availability</span>
          </div>
        </div>

        <div class="kpi-card" [class.active-filter]="availabilityFilter === 'Restricted'" (click)="toggleAvailability('Restricted')">
          <div class="kpi-icon bg-amber">
            <span class="material-symbols-outlined">event_busy</span>
          </div>
          <div class="kpi-info">
            <span class="kpi-val">{{ restrictedCount }}</span>
            <span class="kpi-lbl">Partial / On Leave</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon bg-teal">
            <span class="material-symbols-outlined">schedule</span>
          </div>
          <div class="kpi-info">
            <span class="kpi-val">{{ averagePunctuality }}%</span>
            <span class="kpi-lbl">Avg Punctuality Score</span>
          </div>
        </div>
      </div>

      <!-- 3. Search & Filters Toolbar -->
      <div class="filter-card">
        <div class="filter-row">
          <div class="search-box">
            <span class="material-symbols-outlined">search</span>
            <input
              type="text"
              [(ngModel)]="searchQuery"
              placeholder="Search staff by name, email, phone number, or job title..."
            />
            <button *ngIf="searchQuery" type="button" class="clear-btn" (click)="searchQuery = ''">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <div class="filter-group">
            <select class="filter-select" [(ngModel)]="roleFilter">
              <option value="">All Job Titles</option>
              <option *ngFor="let r of distinctJobTitles" [value]="r">{{ r }}</option>
            </select>

            <select class="filter-select" [(ngModel)]="typeFilter">
              <option value="">All Staff Classifications</option>
              <option *ngFor="let t of distinctStaffTypes" [value]="t">{{ t }}</option>
            </select>

            <select class="filter-select" [(ngModel)]="availabilityFilter">
              <option value="">All Availability</option>
              <option value="Available">Available (Full)</option>
              <option value="Restricted">Partial / Restricted</option>
              <option value="Pending">Pending Onboarding</option>
            </select>

            <button
              *ngIf="searchQuery || roleFilter || typeFilter || availabilityFilter"
              type="button"
              class="btn btn-outline btn-sm"
              (click)="resetFilters()"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      <!-- 4. Staff List Table -->
      <div class="table-card">
        <div class="table-card-header">
          <div class="header-title">
            <span class="material-symbols-outlined text-blue">badge</span>
            <h3>Workforce Staff Directory ({{ filteredMembers.length }})</h3>
          </div>
        </div>

        <div class="loading-box" *ngIf="isLoading">
          <div class="spinner-ring"></div>
          <span>Loading staff directory...</span>
        </div>

        <div class="empty-box" *ngIf="!isLoading && filteredMembers.length === 0">
          <span class="material-symbols-outlined empty-icon">group_off</span>
          <h4>No Staff Members Found</h4>
          <p>No staff members match your current filters, or none have been enrolled yet.</p>
          <div class="empty-actions">
            <a routerLink="/workforce/console/staff/create" class="btn btn-primary">
              <span class="material-symbols-outlined">person_add</span>
              <span>Full Staff Registration</span>
            </a>
            <a routerLink="/workforce/console/enroll" class="btn btn-outline">
              <span class="material-symbols-outlined">mail</span>
              <span>Invite to Register</span>
            </a>
          </div>
        </div>

        <div class="table-responsive" *ngIf="!isLoading && filteredMembers.length > 0">
          <table class="bcp-table">
            <thead>
              <tr>
                <th style="width: 56px;">S/N</th>
                <th>Staff Member</th>
                <th>Job Title &amp; Type</th>
                <th>Pay Rate &amp; Contract</th>
                <th>Shift Preference &amp; Availability</th>
                <th>Shifts &amp; Punctuality</th>
                <th>Rating</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let m of paginatedMembers; let i = index">
                <!-- 0. S/N -->
                <td>
                  <span class="sn-badge">{{ getSerialNumber(i) }}</span>
                </td>

                <!-- 1. Staff Member -->
                <td>
                  <div class="member-cell">
                    <div class="member-avatar">{{ getInitials(m.fullName || m.email) }}</div>
                    <div class="member-details">
                      <a [routerLink]="['/workforce/console/members', m.userId]" class="member-name">
                        {{ m.fullName || 'Staff Member' }}
                      </a>
                      <span class="member-sub">{{ m.email }}</span>
                      <span class="member-sub" *ngIf="m.phoneNumber">{{ m.phoneNumber }}</span>
                    </div>
                  </div>
                </td>

                <!-- 2. Job Title & Type -->
                <td>
                  <div class="role-cell">
                    <strong class="job-title">{{ (m.jobTitle && m.jobTitle !== 'undefined') ? m.jobTitle : 'Staff Member' }}</strong>
                    <span class="staff-type-chip">{{ (m.staffTypeName && m.staffTypeName !== 'undefined') ? m.staffTypeName : 'Permanent' }}</span>
                  </div>
                </td>

                <!-- 3. Pay Rate & Contract -->
                <td>
                  <div class="contract-cell">
                    <strong class="rate-text">{{ currencySymbol }}{{ (m.defaultHourlyRate || 0) | number:'1.2-2' }} / hr</strong>
                    <span class="hours-text">{{ m.contractedWeeklyHours || 0 }} hrs / week</span>
                  </div>
                </td>

                <!-- 4. Shift Preference & Availability -->
                <td>
                  <div class="avail-cell">
                    <span class="avail-pill" [ngClass]="isPending(m) ? 'avail-amber' : (isAvailable(m) ? 'avail-green' : 'avail-gray')">
                      {{ m.workingAvailability || 'Available' }}
                    </span>
                    <span class="pref-text">Pref: {{ m.preferredWorkingTime || 'Any Shift' }}</span>
                  </div>
                </td>

                <!-- 5. Shifts & Punctuality -->
                <td>
                  <div class="perf-cell">
                    <strong class="shifts-count">{{ m.completedShiftsCount || 0 }} completed</strong>
                    <span class="punct-text">Punctuality: {{ m.punctualityPercent ?? 100 }}%</span>
                  </div>
                </td>

                <!-- 6. Rating -->
                <td>
                  <div
                    class="rating-badge"
                    *ngIf="(m.totalRatingsCount > 0 || m.totalShiftsCompleted > 0) && m.averageRating > 0"
                    [title]="(m.averageRating | number:'1.1-1') + ' based on ' + (m.totalRatingsCount || 0) + ' shift review(s)'"
                  >
                    <span class="material-symbols-outlined star-icon">star</span>
                    <span>{{ m.averageRating | number:'1.1-1' }}</span>
                  </div>
                  <span
                    class="unrated-chip"
                    *ngIf="(!m.totalRatingsCount && !m.totalShiftsCompleted) || !m.averageRating || m.averageRating <= 0"
                    title="No shift performance reviews submitted yet"
                  >
                    Unrated
                  </span>
                </td>

                <!-- 7. Actions -->
                <td class="text-right">
                  <div class="actions-cell">
                    <a
                      [routerLink]="['/workforce/console/members', m.userId]"
                      class="action-btn"
                      title="View Full Staff Profile, Compliance Documents & Shift History"
                    >
                      <span class="material-symbols-outlined">visibility</span>
                      <span>Profile</span>
                    </a>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Bottom Pagination & Page List Count Bar -->
        <div class="pagination-footer" *ngIf="!isLoading && filteredMembers.length > 0">
          <!-- Left side: Rows per page dropdown & Showing summary -->
          <div class="pagination-left">
            <div class="page-size-dropdown-group">
              <label for="staffPageSizeSelect" class="size-label">Rows per page:</label>
              <select
                id="staffPageSizeSelect"
                class="page-size-select"
                [(ngModel)]="pageSize"
                (ngModelChange)="onPageSizeSelectChange($event)"
              >
                <option *ngFor="let opt of pageSizeOptions" [ngValue]="opt.value">{{ opt.label }}</option>
              </select>
            </div>

            <div class="page-summary">
              Showing <strong>{{ startEntryIndex }}</strong> to <strong>{{ endEntryIndex }}</strong> of
              <strong>{{ filteredMembers.length }}</strong> staff
            </div>
          </div>

          <!-- Right side: << < 1 2 3 ... 9 10 > >> -->
          <div class="pagination-right">
            <div class="page-nav-controls">
              <!-- First Page (<<) -->
              <button
                type="button"
                class="nav-btn nav-icon-btn"
                [disabled]="currentPage <= 1 || pageSize === 'all'"
                (click)="goToPage(1)"
                title="First Page (<<)"
              >
                <span class="material-symbols-outlined">first_page</span>
              </button>

              <!-- Previous Page (<) -->
              <button
                type="button"
                class="nav-btn nav-icon-btn"
                [disabled]="currentPage <= 1 || pageSize === 'all'"
                (click)="goToPage(currentPage - 1)"
                title="Previous Page (<)"
              >
                <span class="material-symbols-outlined">chevron_left</span>
              </button>

              <!-- Numeric Pages with Ellipsis (...) -->
              <ng-container *ngFor="let p of displayedPages">
                <span *ngIf="p === '...'" class="page-ellipsis">&hellip;</span>
                <button
                  *ngIf="p !== '...'"
                  type="button"
                  class="page-num-btn"
                  [class.active]="p === currentPage"
                  (click)="goToPage(+p)"
                >
                  {{ p }}
                </button>
              </ng-container>

              <!-- Next Page (>) -->
              <button
                type="button"
                class="nav-btn nav-icon-btn"
                [disabled]="currentPage >= totalPages || pageSize === 'all'"
                (click)="goToPage(currentPage + 1)"
                title="Next Page (>)"
              >
                <span class="material-symbols-outlined">chevron_right</span>
              </button>

              <!-- Last Page (>>) -->
              <button
                type="button"
                class="nav-btn nav-icon-btn"
                [disabled]="currentPage >= totalPages || pageSize === 'all'"
                (click)="goToPage(totalPages)"
                title="Last Page (>>)"
              >
                <span class="material-symbols-outlined">last_page</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Info Guide Modal -->
      <div class="modal-backdrop" *ngIf="showInfoModal" (click)="showInfoModal = false">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <span class="material-symbols-outlined text-blue">info</span>
            <h3>Staff Manager Guide</h3>
          </div>
          <div class="modal-body">
            <p><strong>Full Staff Registration (In-House):</strong> Use this when an administrator wants to fill out all registration and contract details directly on behalf of a staff member—even if the public Registration Form is disabled or unpublished. The staff member receives an email link to set their password and log in.</p>
            <p><strong>Invite to Register:</strong> Sends a single-use invitation link so the staff member completes your active Registration Form themselves.</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-primary" (click)="showInfoModal = false">Got It</button>
          </div>
        </div>
      </div>

      <!-- 7. ENROLL EXISTING MEMBER MODAL -->
      <div class="modal-backdrop" *ngIf="showEnrollModal" (click)="closeEnrollModal()">
        <div class="modal-card modal-enroll-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div class="header-title-group">
              <span class="material-symbols-outlined modal-head-icon">how_to_reg</span>
              <div>
                <h3>Enroll Existing Member</h3>
                <p class="modal-head-sub">Select an existing directory user from User Manager to enroll into workforce shifts</p>
              </div>
            </div>
            <button type="button" class="btn-close-round" (click)="closeEnrollModal()">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <div class="modal-body enroll-modal-body">
            <!-- Loading Available Users State -->
            <div *ngIf="isLoadingAvailableUsers" class="enroll-loading-state">
              <span class="material-symbols-outlined spin">progress_activity</span>
              <span>Loading unenrolled directory members...</span>
            </div>

            <!-- No Available Users Notice -->
            <div *ngIf="!isLoadingAvailableUsers && availableUsers.length === 0" class="alert-info-box">
              <span class="material-symbols-outlined">info</span>
              <div>
                <strong>All directory members are already enrolled</strong>
                <p>There are currently no unenrolled directory members eligible for workforce shifts.</p>
              </div>
            </div>

            <div *ngIf="!isLoadingAvailableUsers && availableUsers.length > 0" class="enroll-form">
              <!-- Member Selector -->
              <div class="form-group">
                <label class="form-label required">Select Directory Member</label>
                <select
                  class="form-select"
                  [(ngModel)]="selectedUserId"
                  (ngModelChange)="onUserSelected($event)"
                >
                  <option value="" disabled>-- Choose a member from directory --</option>
                  <option *ngFor="let u of availableUsers" [value]="u.userId">
                    {{ u.fullName }} ({{ u.email }}) {{ u.memberId ? '[' + u.memberId + ']' : '' }}
                  </option>
                </select>
              </div>

              <!-- Selected User Card Preview -->
              <div *ngIf="selectedUser" class="selected-user-card">
                <div class="selected-avatar">
                  {{ getInitials(selectedUser.fullName) }}
                </div>
                <div class="selected-meta">
                  <strong>{{ selectedUser.fullName }}</strong>
                  <span class="selected-sub">{{ selectedUser.email }} • {{ selectedUser.phoneNumber || 'No phone' }}</span>
                  <span class="selected-badge" *ngIf="selectedUser.memberId">ID: {{ selectedUser.memberId }}</span>
                </div>
              </div>

              <!-- Operational Workforce Fields Grid -->
              <div class="form-grid-2">
                <!-- Job Role Selection -->
                <div class="form-group">
                  <label class="form-label required">Assigned Job Role</label>
                  <select class="form-select" [(ngModel)]="enrollForm.jobTitle">
                    <option value="" disabled>-- Select Job Role --</option>
                    <option *ngFor="let r of jobRoles" [value]="r.title">{{ r.title }}</option>
                    <option *ngIf="jobRoles.length === 0" value="Static Security Guard">Static Security Guard</option>
                    <option *ngIf="jobRoles.length === 0" value="Door Supervisor">Door Supervisor</option>
                    <option *ngIf="jobRoles.length === 0" value="CCTV Operator">CCTV Operator</option>
                  </select>
                </div>

                <!-- Employment / Staff Type -->
                <div class="form-group">
                  <label class="form-label required">Employment Classification</label>
                  <select
                    class="form-select"
                    [(ngModel)]="enrollForm.staffTypeId"
                    (ngModelChange)="onStaffTypeChange($event)"
                  >
                    <option value="" disabled>-- Select Staff Type --</option>
                    <option *ngFor="let t of staffTypes" [value]="t.id">{{ t.name }}</option>
                    <option *ngIf="staffTypes.length === 0" value="">Permanent</option>
                  </select>
                </div>
              </div>

              <div class="form-grid-2">
                <!-- Hourly Pay Rate -->
                <div class="form-group">
                  <label class="form-label">Default Hourly Rate ({{ currencySymbol }})</label>
                  <div class="input-with-prefix">
                    <span class="input-prefix">{{ currencySymbol }}</span>
                    <input
                      type="number"
                      step="0.50"
                      min="0"
                      class="form-input has-prefix"
                      [(ngModel)]="enrollForm.defaultHourlyRate"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <!-- Contracted Weekly Hours -->
                <div class="form-group">
                  <label class="form-label">Contracted Weekly Hours</label>
                  <div class="input-with-suffix">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      max="168"
                      class="form-input has-suffix"
                      [(ngModel)]="enrollForm.contractedWeeklyHours"
                      placeholder="40"
                    />
                    <span class="input-suffix">hrs/wk</span>
                  </div>
                </div>
              </div>

              <!-- Working Availability -->
              <div class="form-group">
                <label class="form-label">Initial Working Availability</label>
                <select class="form-select" [(ngModel)]="enrollForm.workingAvailability">
                  <option value="Available">Available (Ready for Shifts)</option>
                  <option value="Pending Onboarding">Pending Onboarding</option>
                  <option value="Restricted">Restricted / Limited</option>
                </select>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-outline" (click)="closeEnrollModal()">Cancel</button>
            <button
              type="button"
              class="btn btn-primary"
              [disabled]="!selectedUserId || isSubmittingEnroll"
              (click)="submitEnrollMember()"
            >
              <span class="material-symbols-outlined" *ngIf="!isSubmittingEnroll">how_to_reg</span>
              <span class="material-symbols-outlined spin" *ngIf="isSubmittingEnroll">progress_activity</span>
              <span>{{ isSubmittingEnroll ? 'Enrolling...' : 'Enroll Member into Shifts' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .bcp-page-container { display: flex; flex-direction: column; gap: 20px; padding: 0 4px 40px 4px; width: 100%; }
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
    .btn-outline-blue { background: #eff6ff; color: #0050e5; border-color: #bfdbfe; }
    .btn-outline-blue:hover { background: #dbeafe; border-color: #93c5fd; }
    .btn-sm { padding: 7px 12px; font-size: 12px; }

    /* KPI Strip */
    .kpi-strip { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 14px; }
    .kpi-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; display: flex; align-items: center; gap: 14px; cursor: pointer; transition: all 0.15s ease; }
    .kpi-card:hover { border-color: #93c5fd; transform: translateY(-1px); }
    .kpi-card.active-filter { border-color: #0050e5; box-shadow: 0 0 0 2px rgba(0,80,229,0.12); }
    .kpi-icon { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
    .kpi-icon.bg-blue { background: #eff6ff; color: #0050e5; }
    .kpi-icon.bg-green { background: #f0fdf4; color: #16a34a; }
    .kpi-icon.bg-amber { background: #fffbeb; color: #d97706; }
    .kpi-icon.bg-teal { background: #f0fdfa; color: #0d9488; }
    .kpi-info { display: flex; flex-direction: column; }
    .kpi-val { font-size: 22px; font-weight: 800; color: #0f172a; line-height: 1.1; }
    .kpi-lbl { font-size: 12px; color: #64748b; font-weight: 600; margin-top: 2px; }

    /* Filters */
    .filter-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 18px; }
    .filter-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
    .search-box { flex: 1 1 280px; display: flex; align-items: center; gap: 8px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 0 12px; height: 40px; }
    .search-box input { border: none; background: transparent; outline: none; width: 100%; font-size: 13px; color: #0f172a; }
    .clear-btn { background: none; border: none; color: #64748b; cursor: pointer; display: flex; align-items: center; }
    .filter-group { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .filter-select { height: 40px; padding: 0 12px; border: 1px solid #cbd5e1; border-radius: 8px; background: #ffffff; font-size: 13px; color: #1e293b; outline: none; }

    /* Table */
    .table-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
    .table-card-header { padding: 16px 20px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between; }
    .header-title { display: flex; align-items: center; gap: 10px; }
    .header-title h3 { margin: 0; font-size: 15px; font-weight: 700; color: #0f172a; }
    .text-blue { color: #0050e5; }
    .text-right { text-align: right; }

    .table-responsive { width: 100%; overflow-x: auto; }
    .bcp-table { width: 100%; border-collapse: collapse; text-align: left; }
    .bcp-table th { background: #f8fafc; padding: 12px 16px; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #475569; letter-spacing: 0.04em; border-bottom: 1px solid #e2e8f0; }
    .bcp-table td { padding: 14px 16px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #1e293b; vertical-align: middle; }
    .bcp-table tr:hover td { background: #fafbfc; }

    .member-cell { display: flex; align-items: center; gap: 12px; }
    .member-avatar { width: 38px; height: 38px; border-radius: 50%; background: #eff6ff; color: #0050e5; font-weight: 700; font-size: 13px; display: flex; align-items: center; justify-content: center; border: 1px solid #bfdbfe; flex-shrink: 0; }
    .member-details { display: flex; flex-direction: column; gap: 1px; }
    .member-name { font-weight: 700; color: #0f172a; text-decoration: none; }
    .member-name:hover { color: #0050e5; text-decoration: underline; }
    .member-sub { font-size: 11.5px; color: #64748b; }

    .role-cell { display: flex; flex-direction: column; gap: 4px; align-items: flex-start; }
    .job-title { font-weight: 700; color: #0f172a; }
    .staff-type-chip { font-size: 11px; font-weight: 600; background: #f1f5f9; color: #475569; padding: 2px 8px; border-radius: 999px; }

    .contract-cell { display: flex; flex-direction: column; gap: 2px; }
    .rate-text { font-weight: 700; color: #16a34a; }
    .hours-text { font-size: 11.5px; color: #64748b; }

    .avail-cell { display: flex; flex-direction: column; gap: 4px; align-items: flex-start; }
    .avail-pill { padding: 3px 9px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .avail-green { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
    .avail-amber { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
    .avail-gray { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }
    .pref-text { font-size: 11.5px; color: #64748b; }

    :host-context(.dark-mode) .avail-green,
    body.dark-mode .avail-green {
      background: rgba(22, 163, 74, 0.2) !important;
      color: #86efac !important;
      border-color: rgba(22, 163, 74, 0.4) !important;
    }
    :host-context(.dark-mode) .avail-amber,
    body.dark-mode .avail-amber {
      background: rgba(245, 158, 11, 0.2) !important;
      color: #fcd34d !important;
      border-color: rgba(245, 158, 11, 0.4) !important;
    }
    :host-context(.dark-mode) .avail-gray,
    body.dark-mode .avail-gray {
      background: rgba(100, 116, 139, 0.2) !important;
      color: #cbd5e1 !important;
      border-color: rgba(100, 116, 139, 0.4) !important;
    }

    .perf-cell { display: flex; flex-direction: column; gap: 2px; }
    .shifts-count { font-weight: 700; color: #0f172a; }
    .punct-text { font-size: 11.5px; color: #0d9488; font-weight: 600; }

    .rating-badge { display: inline-flex; align-items: center; gap: 4px; background: #fffbeb; color: #b45309; border: 1px solid #fde68a; padding: 4px 9px; border-radius: 8px; font-weight: 700; font-size: 12.5px; }
    .star-icon { font-size: 15px; color: #f59e0b; }
    .unrated-chip { display: inline-block; padding: 3px 9px; border-radius: 6px; font-size: 11.5px; font-weight: 600; color: #64748b; background: #f1f5f9; border: 1px solid #e2e8f0; }
    :host-context(.dark-mode) .unrated-chip,
    body.dark-mode .unrated-chip { color: #94a3b8; background: rgba(148, 163, 184, 0.12); border-color: rgba(148, 163, 184, 0.25); }

    .actions-cell { display: inline-flex; align-items: center; gap: 6px; }
    .action-btn { display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px; border-radius: 7px; font-size: 12px; font-weight: 600; text-decoration: none; border: 1px solid #cbd5e1; background: #ffffff; color: #1e293b; transition: all 0.15s ease; }
    .action-btn:hover { background: #eff6ff; color: #0050e5; border-color: #bfdbfe; }
    .action-btn .material-symbols-outlined { font-size: 16px; }

    .loading-box, .empty-box { padding: 48px 24px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; text-align: center; color: #64748b; }
    .empty-icon { font-size: 42px; color: #94a3b8; }
    .empty-box h4 { margin: 0; font-size: 16px; color: #0f172a; }
    .empty-box p { margin: 0 0 8px 0; font-size: 13px; max-width: 420px; }
    .empty-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; justify-content: center; }

    .modal-backdrop { position: fixed; inset: 0; background: rgba(15,23,42,0.45); display: flex; align-items: center; justify-content: center; z-index: 1200; padding: 16px; }
    .modal-card { background: #ffffff; border-radius: 14px; max-width: 480px; width: 100%; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.15); overflow: hidden; }
    .modal-header { display: flex; align-items: center; gap: 10px; padding: 18px 22px; border-bottom: 1px solid #f1f5f9; }
    .modal-header h3 { margin: 0; font-size: 16px; font-weight: 700; color: #0f172a; }
    .modal-body { padding: 20px 22px; font-size: 13.5px; color: #334155; line-height: 1.55; }
    .modal-footer { padding: 14px 22px; background: #f8fafc; border-top: 1px solid #f1f5f9; display: flex; justify-content: flex-end; gap: 10px; }

    /* Enroll Existing Member Modal */
    .modal-enroll-card { max-width: 540px; }
    .header-title-group { display: flex; align-items: center; gap: 12px; }
    .modal-head-icon { font-size: 26px; color: #0050e5; background: #eff6ff; padding: 6px; border-radius: 8px; }
    .modal-head-sub { margin: 2px 0 0; font-size: 12px; color: #64748b; }
    .btn-close-round { background: none; border: none; font-size: 20px; color: #94a3b8; cursor: pointer; border-radius: 6px; padding: 4px; display: flex; align-items: center; justify-content: center; }
    .btn-close-round:hover { color: #0f172a; background: #f1f5f9; }
    .enroll-modal-body { display: flex; flex-direction: column; gap: 16px; }
    .enroll-loading-state { padding: 32px 16px; display: flex; align-items: center; justify-content: center; gap: 10px; color: #64748b; font-size: 13px; }
    .alert-info-box { display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; color: #1e40af; font-size: 12.5px; }
    .alert-info-box p { margin: 2px 0 0; font-size: 11.5px; }
    .enroll-form { display: flex; flex-direction: column; gap: 14px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-label { font-size: 12px; font-weight: 700; color: #334155; }
    .form-label.required::after { content: ' *'; color: #dc2626; }
    .form-select, .form-input { height: 40px; padding: 0 12px; border: 1.5px solid #cbd5e1; border-radius: 8px; font-size: 13px; color: #0f172a; background: #ffffff; outline: none; transition: all 0.15s ease; box-sizing: border-box; width: 100%; }
    .form-select:focus, .form-input:focus { border-color: #0050e5; box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.12); }
    .form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    @media (max-width: 500px) { .form-grid-2 { grid-template-columns: 1fr; } }
    .selected-user-card { display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; }
    .selected-avatar { width: 36px; height: 36px; border-radius: 50%; background: #eff6ff; color: #0050e5; font-weight: 800; font-size: 13px; display: flex; align-items: center; justify-content: center; border: 1px solid #bfdbfe; flex-shrink: 0; }
    .selected-meta { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .selected-meta strong { font-size: 13px; color: #0f172a; }
    .selected-sub { font-size: 11.5px; color: #64748b; }
    .selected-badge { font-size: 10.5px; font-weight: 700; color: #0050e5; background: #eff6ff; padding: 1px 6px; border-radius: 4px; display: inline-block; width: fit-content; }
    .input-with-prefix, .input-with-suffix { position: relative; display: flex; align-items: center; width: 100%; }
    .input-prefix { position: absolute; left: 12px; font-weight: 700; color: #64748b; font-size: 13px; pointer-events: none; }
    .input-suffix { position: absolute; right: 12px; font-weight: 600; color: #64748b; font-size: 12px; pointer-events: none; }
    .form-input.has-prefix { padding-left: 28px; }
    .form-input.has-suffix { padding-right: 56px; }

    .sn-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 28px; height: 26px; padding: 0 6px; border-radius: 6px; background: #f1f5f9; color: #475569; font-size: 12px; font-weight: 700; font-family: monospace; }

    .pagination-footer { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 14px 20px; border-top: 1px solid #f1f5f9; background: #fafbfc; flex-wrap: wrap; }
    .pagination-left { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
    .page-size-dropdown-group { display: inline-flex; align-items: center; gap: 8px; }
    .size-label { font-size: 12.5px; font-weight: 600; color: #64748b; }
    .page-size-select { height: 32px; padding: 0 10px 0 8px; border-radius: 7px; border: 1px solid #cbd5e1; background: #ffffff; color: #0f172a; font-size: 12.5px; font-weight: 600; cursor: pointer; outline: none; transition: all 0.15s ease; }
    .page-size-select:focus { border-color: #0050e5; box-shadow: 0 0 0 2px rgba(0, 80, 229, 0.12); }
    .page-summary { font-size: 12.5px; color: #64748b; }
    .page-summary strong { color: #0f172a; }
    .pagination-right { display: flex; align-items: center; }
    .page-nav-controls { display: inline-flex; align-items: center; gap: 4px; }
    .nav-btn, .page-num-btn { display: inline-flex; align-items: center; justify-content: center; height: 32px; min-width: 32px; padding: 0 6px; border-radius: 7px; border: 1px solid #cbd5e1; background: #ffffff; color: #334155; font-size: 12.5px; font-weight: 600; cursor: pointer; transition: all 0.15s ease; }
    .nav-icon-btn { padding: 0 4px; }
    .nav-icon-btn .material-symbols-outlined { font-size: 18px; }
    .nav-btn:hover:not(:disabled), .page-num-btn:hover { background: #eff6ff; color: #0050e5; border-color: #bfdbfe; }
    .page-num-btn.active { background: #0050e5; color: #ffffff; border-color: #0050e5; font-weight: 700; }
    .nav-btn:disabled { opacity: 0.4; cursor: not-allowed; background: #f8fafc; }
    .page-ellipsis { display: inline-flex; align-items: center; justify-content: center; min-width: 24px; height: 32px; color: #94a3b8; font-weight: 700; letter-spacing: 2px; }

    :host-context(.dark-mode) .pagination-footer,
    body.dark-mode .pagination-footer { background: #0f172a; border-top-color: #1e293b; }
    :host-context(.dark-mode) .page-size-select,
    body.dark-mode .page-size-select { background: #1e293b; border-color: #334155; color: #f1f5f9; }
    :host-context(.dark-mode) .size-label,
    body.dark-mode .size-label,
    :host-context(.dark-mode) .page-summary,
    body.dark-mode .page-summary { color: #94a3b8; }
    :host-context(.dark-mode) .page-summary strong,
    body.dark-mode .page-summary strong { color: #f8fafc; }
    :host-context(.dark-mode) .nav-btn,
    body.dark-mode .nav-btn,
    :host-context(.dark-mode) .page-num-btn,
    body.dark-mode .page-num-btn { background: #1e293b; border-color: #334155; color: #cbd5e1; }
    :host-context(.dark-mode) .nav-btn:hover:not(:disabled),
    body.dark-mode .nav-btn:hover:not(:disabled),
    :host-context(.dark-mode) .page-num-btn:hover,
    body.dark-mode .page-num-btn:hover { background: rgba(59, 130, 246, 0.2); border-color: #3b82f6; color: #60a5fa; }
    :host-context(.dark-mode) .page-num-btn.active,
    body.dark-mode .page-num-btn.active { background: #0050e5; border-color: #0050e5; color: #ffffff; }
    :host-context(.dark-mode) .nav-btn:disabled,
    body.dark-mode .nav-btn:disabled { background: #0f172a; border-color: #1e293b; color: #475569; }
    :host-context(.dark-mode) .page-ellipsis,
    body.dark-mode .page-ellipsis { color: #64748b; }

    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { 100% { transform: rotate(360deg); } }
  `]
})
export class WorkforceStaffManagerComponent implements OnInit {
  private readonly PAGE_SIZE_STORAGE_KEY = 'ozikol_staff_manager_page_size';
  members: any[] = [];
  isLoading = false;
  currencySymbol = '£';

  searchQuery = '';
  roleFilter = '';
  typeFilter = '';
  availabilityFilter = '';
  showInfoModal = false;

  // Enroll Existing Member Modal State
  showEnrollModal = false;
  isLoadingAvailableUsers = false;
  isSubmittingEnroll = false;
  availableUsers: any[] = [];
  selectedUserId = '';
  selectedUser: any = null;
  jobRoles: any[] = [];
  staffTypes: any[] = [];

  enrollForm = {
    jobTitle: '',
    staffTypeId: '',
    staffTypeName: '',
    defaultHourlyRate: null as number | null,
    contractedWeeklyHours: 40,
    workingAvailability: 'Available',
    preferredWorkingTime: 'Any'
  };

  pageSizeOptions: { label: string; value: number | 'all' }[] = [
    { label: '10', value: 10 },
    { label: '15', value: 15 },
    { label: '25', value: 25 },
    { label: '50', value: 50 },
    { label: '100', value: 100 },
    { label: 'All', value: 'all' }
  ];
  pageSize: number | 'all' = 15;
  currentPage = 1;

  constructor(
    private readonly workforceService: WorkforceService,
    private readonly toast: ToastService
  ) {}

  ngOnInit(): void {
    this.restoreSavedPageSize();
    this.loadCurrency();
    this.loadAll();
  }

  private restoreSavedPageSize(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem(this.PAGE_SIZE_STORAGE_KEY);
        if (saved === 'all') {
          this.pageSize = 'all';
        } else if (saved) {
          const parsed = parseInt(saved, 10);
          if ([10, 15, 25, 50, 100].includes(parsed)) {
            this.pageSize = parsed;
          }
        }
      }
    } catch {}
  }

  onPageSizeSelectChange(val: any): void {
    const parsed = val === 'all' ? 'all' : parseInt(val, 10);
    this.setPageSize(parsed);
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
    const total = this.filteredMembers.length;
    if (this.pageSize === 'all') return Math.max(1, total);
    return this.pageSize;
  }

  get totalPages(): number {
    if (this.pageSize === 'all') return 1;
    return Math.max(1, Math.ceil(this.filteredMembers.length / this.effectivePageSize));
  }

  get pageNumbers(): number[] {
    const pages: number[] = [];
    for (let i = 1; i <= this.totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  get displayedPages(): (number | '...')[] {
    const total = this.totalPages;
    if (total <= 1) return [1];
    if (total <= 7) {
      const pages: number[] = [];
      for (let i = 1; i <= total; i++) pages.push(i);
      return pages;
    }

    const current = this.currentPage;
    const result: (number | '...')[] = [];

    if (current <= 4) {
      for (let i = 1; i <= 5; i++) result.push(i);
      result.push('...');
      result.push(total);
    } else if (current >= total - 3) {
      result.push(1);
      result.push('...');
      for (let i = total - 4; i <= total; i++) result.push(i);
    } else {
      result.push(1);
      result.push('...');
      result.push(current - 1);
      result.push(current);
      result.push(current + 1);
      result.push('...');
      result.push(total);
    }
    return result;
  }

  get paginatedMembers(): any[] {
    const list = this.filteredMembers;
    if (this.pageSize === 'all') return list;
    const safePage = Math.min(this.currentPage, this.totalPages);
    const start = (safePage - 1) * this.effectivePageSize;
    return list.slice(start, start + this.effectivePageSize);
  }

  get startEntryIndex(): number {
    if (this.filteredMembers.length === 0) return 0;
    if (this.pageSize === 'all') return 1;
    const safePage = Math.min(this.currentPage, this.totalPages);
    return (safePage - 1) * this.effectivePageSize + 1;
  }

  get endEntryIndex(): number {
    if (this.filteredMembers.length === 0) return 0;
    if (this.pageSize === 'all') return this.filteredMembers.length;
    return Math.min(this.filteredMembers.length, this.startEntryIndex + this.effectivePageSize - 1);
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
    this.workforceService.getMembers().subscribe({
      next: (res: any) => {
        this.isLoading = false;
        this.members = Array.isArray(res?.data) ? res.data : [];
      },
      error: () => {
        this.isLoading = false;
        this.toast.error('Could not load workforce staff directory.');
      }
    });
  }

  get distinctJobTitles(): string[] {
    const set = new Set<string>();
    this.members.forEach(m => {
      if (m.jobTitle) set.add(m.jobTitle);
    });
    return Array.from(set).sort();
  }

  get distinctStaffTypes(): string[] {
    const set = new Set<string>();
    this.members.forEach(m => {
      if (m.staffTypeName) set.add(m.staffTypeName);
    });
    return Array.from(set).sort();
  }

  get availableCount(): number {
    return this.members.filter(m => this.isAvailable(m)).length;
  }

  get restrictedCount(): number {
    return this.members.filter(m => !this.isAvailable(m)).length;
  }

  get averagePunctuality(): number {
    if (this.members.length === 0) return 100;
    const sum = this.members.reduce((acc, m) => acc + (m.punctualityPercent ?? 100), 0);
    return Math.round(sum / this.members.length);
  }

  isAvailable(m: any): boolean {
    const av = (m?.workingAvailability || '').toLowerCase();
    return av.includes('available') && !av.includes('unavailable') && !av.includes('partial') && !av.includes('pending');
  }

  isPending(m: any): boolean {
    const av = (m?.workingAvailability || '').toLowerCase();
    return av.includes('pending');
  }

  isRestricted(m: any): boolean {
    const av = (m?.workingAvailability || '').toLowerCase();
    return (av.includes('partial') || av.includes('unavailable') || av.includes('leave')) && !av.includes('pending');
  }

  get pendingCount(): number {
    return this.members.filter(m => this.isPending(m)).length;
  }

  toggleAvailability(mode: string): void {
    this.availabilityFilter = this.availabilityFilter === mode ? '' : mode;
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.roleFilter = '';
    this.typeFilter = '';
    this.availabilityFilter = '';
  }

  get filteredMembers(): any[] {
    const q = this.searchQuery.trim().toLowerCase();
    return this.members.filter(m => {
      if (this.roleFilter && m.jobTitle !== this.roleFilter) return false;
      if (this.typeFilter && m.staffTypeName !== this.typeFilter) return false;
      if (this.availabilityFilter === 'Available' && !this.isAvailable(m)) return false;
      if (this.availabilityFilter === 'Restricted' && !this.isRestricted(m)) return false;
      if (this.availabilityFilter === 'Pending' && !this.isPending(m)) return false;
      if (!q) return true;
      return (
        (m.fullName || '').toLowerCase().includes(q) ||
        (m.email || '').toLowerCase().includes(q) ||
        (m.phoneNumber || '').toLowerCase().includes(q) ||
        (m.jobTitle || '').toLowerCase().includes(q) ||
        (m.staffTypeName || '').toLowerCase().includes(q)
      );
    });
  }

  openEnrollModal(): void {
    this.showEnrollModal = true;
    this.selectedUserId = '';
    this.selectedUser = null;
    this.enrollForm = {
      jobTitle: '',
      staffTypeId: '',
      staffTypeName: '',
      defaultHourlyRate: null,
      contractedWeeklyHours: 40,
      workingAvailability: 'Available',
      preferredWorkingTime: 'Any'
    };
    this.loadEnrollmentOptions();
  }

  closeEnrollModal(): void {
    this.showEnrollModal = false;
  }

  loadEnrollmentOptions(): void {
    this.isLoadingAvailableUsers = true;
    this.workforceService.getAvailableUsers().subscribe({
      next: (res: any) => {
        this.isLoadingAvailableUsers = false;
        this.availableUsers = Array.isArray(res?.data) ? res.data : [];
      },
      error: () => {
        this.isLoadingAvailableUsers = false;
        this.toast.error('Could not load available directory members.');
      }
    });

    if (this.jobRoles.length === 0) {
      this.workforceService.getJobRoles().subscribe({
        next: (res: any) => {
          this.jobRoles = Array.isArray(res?.data) ? res.data : [];
          if (!this.enrollForm.jobTitle && this.jobRoles.length > 0) {
            this.enrollForm.jobTitle = this.jobRoles[0].title;
          }
        },
        error: () => {}
      });
    }

    if (this.staffTypes.length === 0) {
      this.workforceService.getStaffTypes().subscribe({
        next: (res: any) => {
          this.staffTypes = Array.isArray(res?.data) ? res.data : [];
          if (!this.enrollForm.staffTypeId && this.staffTypes.length > 0) {
            this.enrollForm.staffTypeId = this.staffTypes[0].id;
            this.enrollForm.staffTypeName = this.staffTypes[0].name;
          }
        },
        error: () => {}
      });
    }
  }

  onUserSelected(userId: string): void {
    this.selectedUserId = userId;
    this.selectedUser = this.availableUsers.find(u => u.userId === userId) || null;
    if (this.selectedUser?.designation && !this.enrollForm.jobTitle) {
      this.enrollForm.jobTitle = this.selectedUser.designation;
    }
  }

  onStaffTypeChange(typeId: string): void {
    const found = this.staffTypes.find(t => t.id === typeId);
    if (found) {
      this.enrollForm.staffTypeName = found.name;
    }
  }

  submitEnrollMember(): void {
    if (!this.selectedUserId) {
      this.toast.warning('Please select a directory member to enroll.');
      return;
    }

    this.isSubmittingEnroll = true;
    const payload = {
      userId: this.selectedUserId,
      fullName: this.selectedUser?.fullName,
      email: this.selectedUser?.email,
      phoneNumber: this.selectedUser?.phoneNumber,
      jobTitle: this.enrollForm.jobTitle || 'Staff Member',
      staffTypeId: this.enrollForm.staffTypeId || null,
      staffTypeName: this.enrollForm.staffTypeName || 'Permanent',
      defaultHourlyRate: this.enrollForm.defaultHourlyRate ?? 0,
      contractedWeeklyHours: this.enrollForm.contractedWeeklyHours ?? 40,
      workingAvailability: this.enrollForm.workingAvailability || 'Available',
      preferredWorkingTime: this.enrollForm.preferredWorkingTime || 'Any'
    };

    this.workforceService.enrollMember(payload).subscribe({
      next: () => {
        this.isSubmittingEnroll = false;
        this.toast.success(`'${this.selectedUser?.fullName || 'Member'}' enrolled into Workforce Shifts successfully!`);
        this.closeEnrollModal();
        this.loadAll();
      },
      error: (err: any) => {
        this.isSubmittingEnroll = false;
        this.toast.error(err?.error?.message || 'Failed to enroll member into shifts.');
      }
    });
  }

  getInitials(name: string): string {
    if (!name) return 'ST';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }
}
