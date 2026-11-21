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
                    <span class="avail-pill" [ngClass]="isAvailable(m) ? 'avail-green' : 'avail-amber'">
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
                  <div class="rating-badge">
                    <span class="material-symbols-outlined star-icon">star</span>
                    <span>{{ (m.averageRating || 5.0) | number:'1.1-1' }}</span>
                  </div>
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
          <div class="page-summary">
            Showing <strong>{{ startEntryIndex }}</strong> to <strong>{{ endEntryIndex }}</strong> of
            <strong>{{ filteredMembers.length }}</strong> staff
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
    .pref-text { font-size: 11.5px; color: #64748b; }

    .perf-cell { display: flex; flex-direction: column; gap: 2px; }
    .shifts-count { font-weight: 700; color: #0f172a; }
    .punct-text { font-size: 11.5px; color: #0d9488; font-weight: 600; }

    .rating-badge { display: inline-flex; align-items: center; gap: 4px; background: #fffbeb; color: #b45309; border: 1px solid #fde68a; padding: 4px 9px; border-radius: 8px; font-weight: 700; font-size: 12.5px; }
    .star-icon { font-size: 15px; color: #f59e0b; }

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

  pageSizeOptions: { label: string; value: number | 'all' }[] = [
    { label: '15', value: 15 },
    { label: '25', value: 25 },
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
    const av = (m?.workingAvailability || 'Available').toLowerCase();
    return av.includes('available') && !av.includes('unavailable') && !av.includes('partial');
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
      if (this.availabilityFilter === 'Restricted' && this.isAvailable(m)) return false;
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

  getInitials(name: string): string {
    if (!name) return 'ST';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }
}
