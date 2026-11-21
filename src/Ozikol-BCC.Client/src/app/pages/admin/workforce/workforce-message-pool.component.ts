import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { WorkforceService } from '../../../core/services/workforce.service';
import { ToastService } from '../../../core/services/toast.service';

/**
 * Administrator Staff Message Pool & Support Ticket Desk (`/workforce/console/messages`).
 * Manages two-way topic/ticket threads between Staff Members and Administrators.
 * Features:
 * - S/N column and persistent 15 / 25 / 100 / All bottom pagination.
 * - Automatic closure after 48 hours (2 days) of inactivity.
 * - Admin-only Close and Re-Open authority.
 * - Direct "+ New Staff Follow-Up" ticket initiation by Admin.
 */
@Component({
  selector: 'app-workforce-message-pool',
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
            <span class="current">Staff Message Pool</span>
          </div>
          <div class="title-row">
            <h1>Staff Message Pool &amp; Ticket Desk</h1>
            <span class="badge-suite">Suite: Workforce &amp; Shifts</span>
          </div>
          <p class="subtitle">
            Two-way staff inquiries and admin follow-up threads with automatic 48-hour inactivity closure and admin re-open controls.
          </p>
        </div>
        <div class="header-actions">
          <button type="button" class="btn btn-outline" (click)="loadAll()">
            <span class="material-symbols-outlined" [class.spin]="isLoading">refresh</span>
            <span>Refresh</span>
          </button>
          <a routerLink="/workforce/console/staff" class="btn btn-outline">
            <span class="material-symbols-outlined">badge</span>
            <span>Staff Manager</span>
          </a>
          <button type="button" class="btn btn-primary" (click)="openNewFollowUpModal()">
            <span class="material-symbols-outlined">add_comment</span>
            <span>+ New Staff Follow-Up</span>
          </button>
        </div>
      </div>

      <!-- 2. Summary KPI Strip -->
      <div class="kpi-strip">
        <div class="kpi-card" [class.active-filter]="statusFilter === ''" (click)="setStatusFilter('')">
          <div class="kpi-icon bg-blue">
            <span class="material-symbols-outlined">forum</span>
          </div>
          <div class="kpi-info">
            <span class="kpi-val">{{ tickets.length }}</span>
            <span class="kpi-lbl">Total Tickets</span>
          </div>
        </div>

        <div class="kpi-card" [class.active-filter]="statusFilter === 'Open'" (click)="setStatusFilter('Open')">
          <div class="kpi-icon bg-green">
            <span class="material-symbols-outlined">mark_chat_unread</span>
          </div>
          <div class="kpi-info">
            <span class="kpi-val">{{ openCount }}</span>
            <span class="kpi-lbl">Open Threads</span>
          </div>
        </div>

        <div class="kpi-card" [class.active-filter]="statusFilter === 'AwaitingAdmin'" (click)="setStatusFilter('AwaitingAdmin')">
          <div class="kpi-icon bg-amber">
            <span class="material-symbols-outlined">notification_important</span>
          </div>
          <div class="kpi-info">
            <span class="kpi-val">{{ awaitingAdminCount }}</span>
            <span class="kpi-lbl">Awaiting Admin Reply</span>
          </div>
        </div>

        <div class="kpi-card" [class.active-filter]="statusFilter === 'Closed'" (click)="setStatusFilter('Closed')">
          <div class="kpi-icon bg-slate">
            <span class="material-symbols-outlined">lock_clock</span>
          </div>
          <div class="kpi-info">
            <span class="kpi-val">{{ closedCount }}</span>
            <span class="kpi-lbl">Closed / Auto-Closed (48h+)</span>
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
              (ngModelChange)="currentPage = 1"
              placeholder="Search by ticket #, topic title, staff name, or message content..."
            />
            <button *ngIf="searchQuery" type="button" class="clear-btn" (click)="searchQuery = ''; currentPage = 1">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <div class="filter-group">
            <select class="filter-select" [(ngModel)]="categoryFilter" (change)="currentPage = 1">
              <option value="">All Categories</option>
              <option *ngFor="let c of categories" [value]="c">{{ c }}</option>
            </select>

            <select class="filter-select" [(ngModel)]="statusFilter" (change)="currentPage = 1">
              <option value="">All Statuses</option>
              <option value="Open">Open Tickets</option>
              <option value="AwaitingAdmin">Awaiting Admin Reply</option>
              <option value="Closed">Closed &amp; Auto-Closed</option>
            </select>

            <button
              *ngIf="searchQuery || categoryFilter || statusFilter"
              type="button"
              class="btn btn-outline btn-sm"
              (click)="resetFilters()"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      <!-- 4. Split View: Ticket Directory Table + Conversation Drawer -->
      <div class="pool-split-layout" [class.has-active-ticket]="!!activeTicket">
        <!-- Left: Ticket Directory Table -->
        <div class="table-card">
          <div class="table-card-header">
            <div class="header-title">
              <span class="material-symbols-outlined text-blue">support_agent</span>
              <h3>Staff Message Pool ({{ filteredTickets.length }})</h3>
            </div>
            <span class="policy-note">
              <span class="material-symbols-outlined">schedule</span>
              Auto-closes after 48 hours of inactivity
            </span>
          </div>

          <div class="loading-box" *ngIf="isLoading">
            <div class="spinner-ring"></div>
            <span>Loading staff message pool...</span>
          </div>

          <div class="empty-box" *ngIf="!isLoading && filteredTickets.length === 0">
            <span class="material-symbols-outlined empty-icon">forum</span>
            <h4>No Message Tickets Found</h4>
            <p>No staff inquiries or admin follow-up topics match your current filter selection.</p>
            <button type="button" class="btn btn-primary" (click)="openNewFollowUpModal()">
              <span class="material-symbols-outlined">add_comment</span>
              <span>+ New Staff Follow-Up</span>
            </button>
          </div>

          <div class="table-responsive" *ngIf="!isLoading && filteredTickets.length > 0">
            <table class="bcp-table">
              <thead>
                <tr>
                  <th style="width: 52px;">S/N</th>
                  <th>Ticket &amp; Topic</th>
                  <th>Staff Member</th>
                  <th>Category &amp; Shift</th>
                  <th>Last Activity</th>
                  <th>Status</th>
                  <th class="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  *ngFor="let t of paginatedTickets; let i = index"
                  [class.row-selected]="activeTicket?.id === t.id"
                  (click)="selectTicket(t)"
                  style="cursor: pointer;"
                >
                  <td><span class="sn-badge">{{ getSerialNumber(i) }}</span></td>
                  <td>
                    <div class="topic-cell">
                      <div class="t-code-row">
                        <span class="ticket-code">{{ t.ticketNumber }}</span>
                        <span class="reply-count-tag">{{ (t.replies || []).length }} msg{{ (t.replies || []).length === 1 ? '' : 's' }}</span>
                        <span class="awaiting-dot" *ngIf="t.status === 'Open' && t.lastSenderRole === 'Staff'" title="Awaiting Admin Reply">Needs Reply</span>
                      </div>
                      <strong class="topic-title">{{ t.topic }}</strong>
                    </div>
                  </td>
                  <td>
                    <div class="staff-cell">
                      <div class="staff-avatar">{{ getInitials(t.staffFullName) }}</div>
                      <div>
                        <strong class="staff-name">{{ t.staffFullName }}</strong>
                        <span class="staff-sub" *ngIf="t.staffEmail">{{ t.staffEmail }}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span class="cat-badge">{{ t.category }}</span>
                    <span class="shift-sub" *ngIf="t.relatedShiftLabel">{{ t.relatedShiftLabel }}</span>
                  </td>
                  <td>
                    <div class="activity-cell">
                      <strong>{{ t.lastActivityUtc | date:'d MMM y, HH:mm' }}</strong>
                      <span class="inactivity-hint" *ngIf="t.status === 'Open'">
                        {{ getRemainingHoursText(t) }}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span class="status-pill status-open" *ngIf="t.status === 'Open'">
                      ● Open
                    </span>
                    <span class="status-pill status-autoclosed" *ngIf="t.status === 'Closed' && t.closedReason === 'AutoClosed48h'">
                      Auto-Closed (48h+)
                    </span>
                    <span class="status-pill status-closed" *ngIf="t.status === 'Closed' && t.closedReason !== 'AutoClosed48h'">
                      Closed
                    </span>
                  </td>
                  <td class="text-right" (click)="$event.stopPropagation()">
                    <div class="actions-cell">
                      <button type="button" class="action-btn btn-view" (click)="selectTicket(t)">
                        <span class="material-symbols-outlined">chat</span>
                        <span>{{ t.status === 'Open' ? 'Reply' : 'View' }}</span>
                      </button>

                      <button
                        *ngIf="t.status === 'Open'"
                        type="button"
                        class="action-btn btn-close-tck"
                        (click)="toggleTicketStatus(t, 'Closed')"
                        title="Close Ticket"
                      >
                        <span class="material-symbols-outlined">check_circle</span>
                        <span>Close</span>
                      </button>

                      <button
                        *ngIf="t.status === 'Closed'"
                        type="button"
                        class="action-btn btn-reopen-tck"
                        (click)="toggleTicketStatus(t, 'Open')"
                        title="Re-Open Ticket so Staff can reply again"
                      >
                        <span class="material-symbols-outlined">lock_open</span>
                        <span>Re-Open</span>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Bottom Pagination & Page List Count Bar -->
          <div class="pagination-footer" *ngIf="!isLoading && filteredTickets.length > 0">
            <div class="page-summary">
              Showing <strong>{{ startEntryIndex }}</strong> to <strong>{{ endEntryIndex }}</strong> of
              <strong>{{ filteredTickets.length }}</strong> tickets
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

        <!-- Right: Active Ticket Thread Conversation Drawer -->
        <div class="thread-drawer-card" *ngIf="activeTicket">
          <div class="thread-header">
            <div>
              <div class="thread-badge-row">
                <span class="ticket-code">{{ activeTicket.ticketNumber }}</span>
                <span class="cat-badge">{{ activeTicket.category }}</span>
                <span class="status-pill status-open" *ngIf="activeTicket.status === 'Open'">● Open</span>
                <span class="status-pill status-autoclosed" *ngIf="activeTicket.status === 'Closed' && activeTicket.closedReason === 'AutoClosed48h'">Auto-Closed (2+ Days Inactive)</span>
                <span class="status-pill status-closed" *ngIf="activeTicket.status === 'Closed' && activeTicket.closedReason !== 'AutoClosed48h'">Closed</span>
              </div>
              <h3 class="thread-topic">{{ activeTicket.topic }}</h3>
              <p class="thread-staff">
                Staff Member: <strong>{{ activeTicket.staffFullName }}</strong>
                <span *ngIf="activeTicket.relatedShiftLabel"> &bull; Shift: {{ activeTicket.relatedShiftLabel }}</span>
              </p>
            </div>
            <button type="button" class="btn-icon-close" (click)="activeTicket = null">&times;</button>
          </div>

          <div class="thread-status-bar">
            <span class="tsb-info" *ngIf="activeTicket.status === 'Open'">
              <span class="material-symbols-outlined">schedule</span>
              {{ getRemainingHoursText(activeTicket) }}
            </span>
            <span class="tsb-info closed" *ngIf="activeTicket.status === 'Closed'">
              <span class="material-symbols-outlined">lock</span>
              {{ activeTicket.closedReason === 'AutoClosed48h' ? 'Auto-closed after 48 hours of inactivity. Staff cannot reply unless you re-open.' : 'Closed by administrator. Staff cannot reply unless you re-open.' }}
            </span>

            <button
              *ngIf="activeTicket.status === 'Open'"
              type="button"
              class="btn btn-outline btn-sm"
              (click)="toggleTicketStatus(activeTicket, 'Closed')"
            >
              <span class="material-symbols-outlined">check_circle</span>
              <span>Close Ticket</span>
            </button>
            <button
              *ngIf="activeTicket.status === 'Closed'"
              type="button"
              class="btn btn-primary btn-sm"
              (click)="toggleTicketStatus(activeTicket, 'Open')"
            >
              <span class="material-symbols-outlined">lock_open</span>
              <span>Re-Open Ticket</span>
            </button>
          </div>

          <!-- Messages Stream -->
          <div class="thread-messages-body">
            <div
              *ngFor="let r of activeTicket.replies"
              class="msg-bubble-wrap"
              [class.from-admin]="r.senderRole === 'Admin'"
              [class.from-staff]="r.senderRole !== 'Admin'"
            >
              <div class="msg-bubble">
                <div class="msg-meta">
                  <strong>{{ r.senderName }}</strong>
                  <span class="role-tag" [class.admin]="r.senderRole === 'Admin'">{{ r.senderRole }}</span>
                  <span class="msg-time">{{ r.sentUtc | date:'d MMM y, HH:mm' }}</span>
                </div>
                <div class="msg-text">{{ r.message }}</div>
              </div>
            </div>
          </div>

          <!-- Reply Composer (When Open) -->
          <div class="thread-composer" *ngIf="activeTicket.status === 'Open'">
            <textarea
              rows="3"
              class="form-control"
              [(ngModel)]="replyText"
              placeholder="Write an administrative reply to this staff member..."
            ></textarea>
            <div class="composer-actions">
              <button
                type="button"
                class="btn btn-primary"
                [disabled]="isSendingReply || !replyText.trim()"
                (click)="submitReply()"
              >
                <span class="material-symbols-outlined">send</span>
                <span>{{ isSendingReply ? 'Sending...' : 'Send Reply' }}</span>
              </button>
            </div>
          </div>

          <!-- Closed Notice in Drawer -->
          <div class="thread-closed-footer" *ngIf="activeTicket.status === 'Closed'">
            <p>This thread is locked. Click <strong>Re-Open Ticket</strong> above to unlock it and send a reply.</p>
          </div>
        </div>
      </div>

      <!-- 5. New Admin -> Staff Follow-Up Ticket Modal -->
      <div class="modal-backdrop" *ngIf="showNewModal" (click)="showNewModal = false">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <span class="material-symbols-outlined text-blue">add_comment</span>
            <h3>Open Staff Follow-Up Ticket</h3>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Target Staff Member <span class="req">*</span></label>
              <select class="form-control" [(ngModel)]="newTicketForm.staffUserId">
                <option value="">-- Select Staff Member --</option>
                <option *ngFor="let m of staffMembers" [value]="m.userId">
                  {{ m.fullName }} ({{ m.jobTitle || 'Staff' }} &bull; {{ m.email }})
                </option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Category</label>
              <select class="form-control" [(ngModel)]="newTicketForm.category">
                <option *ngFor="let c of categories" [value]="c">{{ c }}</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Topic / Subject Title <span class="req">*</span></label>
              <input
                type="text"
                class="form-control"
                [(ngModel)]="newTicketForm.topic"
                placeholder="e.g. Shift Attendance Follow-Up or Document Renewal Notice"
              />
            </div>

            <div class="form-group">
              <label class="form-label">Message <span class="req">*</span></label>
              <textarea
                rows="4"
                class="form-control"
                [(ngModel)]="newTicketForm.message"
                placeholder="Enter your message to the staff member..."
              ></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" (click)="showNewModal = false">Cancel</button>
            <button type="button" class="btn btn-primary" [disabled]="isCreating" (click)="submitNewTicket()">
              <span class="material-symbols-outlined">send</span>
              <span>{{ isCreating ? 'Opening Ticket...' : 'Send & Open Ticket' }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 6. Info Guide Modal -->
      <div class="modal-backdrop" *ngIf="showInfoModal" (click)="showInfoModal = false">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <span class="material-symbols-outlined text-blue">info</span>
            <h3>Staff Message Pool &amp; Ticket Desk Guide</h3>
          </div>
          <div class="modal-body">
            <p><strong>Two-Way Topic Tickets:</strong> Staff members can raise topics from their Workforce Workspace, and Administrators can open direct follow-up tickets targeting any staff member.</p>
            <p><strong>48-Hour Auto-Close Rule:</strong> Any open ticket with no reply activity for over 2 days (48 hours) automatically closes.</p>
            <p><strong>Admin Re-Open Control:</strong> Once a ticket is closed (manually or after 48 hours of inactivity), staff members cannot reply unless an Administrator clicks <em>Re-Open</em>.</p>
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

    /* KPI Strip */
    .kpi-strip { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 14px; }
    .kpi-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; display: flex; align-items: center; gap: 14px; cursor: pointer; transition: all 0.15s ease; }
    .kpi-card:hover { border-color: #93c5fd; transform: translateY(-1px); }
    .kpi-card.active-filter { border-color: #0050e5; box-shadow: 0 0 0 2px rgba(0,80,229,0.12); }
    .kpi-icon { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
    .kpi-icon.bg-blue { background: #eff6ff; color: #0050e5; }
    .kpi-icon.bg-green { background: #f0fdf4; color: #16a34a; }
    .kpi-icon.bg-amber { background: #fffbeb; color: #d97706; }
    .kpi-icon.bg-slate { background: #f1f5f9; color: #475569; }
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

    /* Split Layout */
    .pool-split-layout { display: grid; grid-template-columns: 1fr; gap: 16px; align-items: start; }
    .pool-split-layout.has-active-ticket { grid-template-columns: minmax(0, 1.35fr) minmax(360px, 1fr); }
    @media (max-width: 1100px) {
      .pool-split-layout.has-active-ticket { grid-template-columns: 1fr; }
    }

    /* Table */
    .table-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
    .table-card-header { padding: 16px 20px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
    .header-title { display: flex; align-items: center; gap: 10px; }
    .header-title h3 { margin: 0; font-size: 15px; font-weight: 700; color: #0f172a; }
    .policy-note { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; font-weight: 600; color: #64748b; background: #f8fafc; padding: 4px 10px; border-radius: 999px; border: 1px solid #e2e8f0; }
    .policy-note .material-symbols-outlined { font-size: 14px; color: #0050e5; }
    .text-blue { color: #0050e5; }
    .text-right { text-align: right; }

    .table-responsive { width: 100%; overflow-x: auto; }
    .bcp-table { width: 100%; border-collapse: collapse; text-align: left; }
    .bcp-table th { background: #f8fafc; padding: 12px 14px; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #475569; border-bottom: 1px solid #e2e8f0; }
    .bcp-table td { padding: 13px 14px; border-bottom: 1px solid #f1f5f9; font-size: 12.5px; color: #1e293b; vertical-align: middle; }
    .bcp-table tr:hover td { background: #fafbfc; }
    .bcp-table tr.row-selected td { background: #eff6ff; }

    .sn-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 26px; height: 24px; padding: 0 6px; border-radius: 6px; background: #f1f5f9; color: #475569; font-size: 11.5px; font-weight: 700; font-family: monospace; }
    .topic-cell { display: flex; flex-direction: column; gap: 4px; }
    .t-code-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .ticket-code { font-family: monospace; font-weight: 800; font-size: 11.5px; background: #f1f5f9; color: #0f172a; padding: 2px 7px; border-radius: 5px; border: 1px solid #cbd5e1; }
    .reply-count-tag { font-size: 10.5px; font-weight: 700; color: #64748b; background: #f8fafc; padding: 1px 6px; border-radius: 999px; border: 1px solid #e2e8f0; }
    .awaiting-dot { font-size: 10px; font-weight: 800; background: #fef3c7; color: #b45309; border: 1px solid #fde68a; padding: 1px 7px; border-radius: 999px; }
    .topic-title { font-size: 13px; color: #0f172a; }

    .staff-cell { display: flex; align-items: center; gap: 8px; }
    .staff-avatar { width: 32px; height: 32px; border-radius: 50%; background: #eff6ff; color: #0050e5; font-weight: 700; font-size: 11.5px; display: flex; align-items: center; justify-content: center; border: 1px solid #bfdbfe; flex-shrink: 0; }
    .staff-name { display: block; font-weight: 700; color: #0f172a; }
    .staff-sub { display: block; font-size: 11px; color: #64748b; }

    .cat-badge { display: inline-block; font-size: 11px; font-weight: 700; background: #eff6ff; color: #0050e5; padding: 2px 8px; border-radius: 6px; }
    .shift-sub { display: block; font-size: 11px; color: #64748b; margin-top: 3px; }

    .activity-cell { display: flex; flex-direction: column; gap: 2px; }
    .inactivity-hint { font-size: 11px; color: #059669; font-weight: 600; }

    .status-pill { display: inline-flex; align-items: center; padding: 3px 9px; border-radius: 999px; font-size: 11px; font-weight: 700; white-space: nowrap; }
    .status-open { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
    .status-closed { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }
    .status-autoclosed { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }

    .actions-cell { display: inline-flex; align-items: center; gap: 5px; }
    .action-btn { display: inline-flex; align-items: center; gap: 4px; padding: 5px 9px; border-radius: 7px; font-size: 11.5px; font-weight: 700; cursor: pointer; border: 1px solid #e2e8f0; background: #ffffff; color: #334155; }
    .action-btn .material-symbols-outlined { font-size: 15px; }
    .action-btn.btn-view:hover { background: #eff6ff; color: #0050e5; border-color: #bfdbfe; }
    .action-btn.btn-close-tck:hover { background: #f1f5f9; color: #0f172a; }
    .action-btn.btn-reopen-tck { background: #eff6ff; color: #0050e5; border-color: #bfdbfe; }
    .action-btn.btn-reopen-tck:hover { background: #0050e5; color: #ffffff; }

    /* Thread Drawer Card */
    .thread-drawer-card {
      background: #ffffff;
      border: 1.5px solid #bfdbfe;
      border-radius: 14px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 10px 25px rgba(0, 80, 229, 0.08);
    }
    .thread-header {
      padding: 16px 18px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 10px;
    }
    .thread-badge-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 6px; }
    .thread-topic { margin: 0; font-size: 16px; font-weight: 800; color: #0f172a; }
    .thread-staff { margin: 4px 0 0 0; font-size: 12px; color: #475569; }
    .btn-icon-close { background: none; border: none; font-size: 22px; color: #64748b; cursor: pointer; line-height: 1; }

    .thread-status-bar {
      padding: 10px 18px;
      background: #eff6ff;
      border-bottom: 1px solid #dbeafe;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      flex-wrap: wrap;
    }
    .tsb-info { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 700; color: #1e40af; }
    .tsb-info.closed { color: #b45309; }
    .tsb-info .material-symbols-outlined { font-size: 16px; }

    .thread-messages-body {
      padding: 16px 18px;
      max-height: 400px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: #ffffff;
    }
    .msg-bubble-wrap { display: flex; flex-direction: column; max-width: 88%; }
    .msg-bubble-wrap.from-staff { align-self: flex-start; }
    .msg-bubble-wrap.from-admin { align-self: flex-end; }
    .msg-bubble {
      padding: 11px 14px;
      border-radius: 12px;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      color: #0f172a;
    }
    .msg-bubble-wrap.from-admin .msg-bubble {
      background: #eff6ff;
      border-color: #bfdbfe;
    }
    .msg-meta { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #475569; margin-bottom: 5px; flex-wrap: wrap; }
    .role-tag { font-size: 9.5px; font-weight: 800; text-transform: uppercase; padding: 1px 6px; border-radius: 999px; background: #e2e8f0; color: #334155; }
    .role-tag.admin { background: #0050e5; color: #ffffff; }
    .msg-time { color: #64748b; margin-left: auto; }
    .msg-text { font-size: 13px; line-height: 1.5; white-space: pre-wrap; }

    .thread-composer {
      padding: 14px 18px;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .composer-actions { display: flex; justify-content: flex-end; }
    .thread-closed-footer {
      padding: 14px 18px;
      background: #fffbeb;
      border-top: 1px solid #fde68a;
      color: #92400e;
      font-size: 12.5px;
      text-align: center;
    }
    .thread-closed-footer p { margin: 0; }

    /* Form & Modal */
    .form-group { margin-bottom: 14px; }
    .form-label { display: block; font-size: 12.5px; font-weight: 700; color: #334155; margin-bottom: 5px; }
    .req { color: #dc2626; }
    .form-control { width: 100%; box-sizing: border-box; padding: 9px 12px; font-size: 13px; border: 1px solid #cbd5e1; border-radius: 8px; background: #ffffff; color: #0f172a; outline: none; }
    .form-control:focus { border-color: #0050e5; box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.1); }

    .loading-box, .empty-box { padding: 48px 24px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; text-align: center; color: #64748b; }
    .empty-icon { font-size: 42px; color: #94a3b8; }
    .empty-box h4 { margin: 0; font-size: 16px; color: #0f172a; }
    .empty-box p { margin: 0 0 8px 0; font-size: 13px; max-width: 420px; }

    .pagination-footer { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 14px 20px; border-top: 1px solid #f1f5f9; background: #fafbfc; flex-wrap: wrap; }
    .page-summary { font-size: 12.5px; color: #64748b; }
    .page-summary strong { color: #0f172a; }
    .page-size-controls { display: flex; align-items: center; gap: 10px; }
    .size-label { font-size: 12px; font-weight: 600; color: #64748b; }
    .size-pills { display: inline-flex; align-items: center; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 2px; gap: 2px; }
    .size-pill { border: none; background: transparent; color: #475569; font-size: 12px; font-weight: 700; padding: 5px 11px; border-radius: 6px; cursor: pointer; }
    .size-pill.active { background: #0050e5; color: #ffffff; }
    .page-nav-controls { display: flex; align-items: center; gap: 6px; }
    .nav-btn, .page-num-btn { display: inline-flex; align-items: center; justify-content: center; gap: 2px; height: 32px; padding: 0 10px; border-radius: 7px; border: 1px solid #cbd5e1; background: #ffffff; color: #334155; font-size: 12px; font-weight: 600; cursor: pointer; }
    .page-num-btn.active { background: #0050e5; color: #ffffff; border-color: #0050e5; }
    .nav-btn:disabled { opacity: 0.45; cursor: not-allowed; }

    .modal-backdrop { position: fixed; inset: 0; background: rgba(15,23,42,0.45); display: flex; align-items: center; justify-content: center; z-index: 1200; padding: 16px; }
    .modal-card { background: #ffffff; border-radius: 14px; max-width: 520px; width: 100%; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.15); overflow: hidden; }
    .modal-header { display: flex; align-items: center; gap: 10px; padding: 18px 22px; border-bottom: 1px solid #f1f5f9; }
    .modal-header h3 { margin: 0; font-size: 16px; font-weight: 700; color: #0f172a; }
    .modal-body { padding: 20px 22px; font-size: 13.5px; color: #334155; line-height: 1.55; }
    .modal-footer { padding: 14px 22px; background: #f8fafc; border-top: 1px solid #f1f5f9; display: flex; justify-content: flex-end; gap: 10px; }

    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { 100% { transform: rotate(360deg); } }
  `]
})
export class WorkforceMessagePoolComponent implements OnInit {
  private readonly PAGE_SIZE_STORAGE_KEY = 'ozikol_workforce_msg_pool_page_size';

  tickets: any[] = [];
  staffMembers: any[] = [];
  activeTicket: any = null;

  isLoading = false;
  isSendingReply = false;
  isCreating = false;
  showNewModal = false;
  showInfoModal = false;

  searchQuery = '';
  categoryFilter = '';
  statusFilter = '';

  categories = [
    'Shift Inquiry',
    'Payroll & Hours',
    'Site / Equipment Issue',
    'Compliance Follow-Up',
    'Admin Follow-Up',
    'General Inquiry'
  ];

  replyText = '';
  newTicketForm = {
    staffUserId: '',
    category: 'Admin Follow-Up',
    topic: '',
    message: ''
  };

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
    this.loadAll();
    this.loadStaffMembers();
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

  loadAll(): void {
    this.isLoading = true;
    this.workforceService.getAllMessages().subscribe({
      next: (res: any) => {
        this.isLoading = false;
        this.tickets = Array.isArray(res?.data) ? res.data : [];
        if (this.activeTicket) {
          this.activeTicket = this.tickets.find(t => t.id === this.activeTicket.id) || null;
        }
      },
      error: () => {
        this.isLoading = false;
        this.toast.error('Failed to load staff message pool.');
      }
    });
  }

  loadStaffMembers(): void {
    this.workforceService.getMembers().subscribe({
      next: (res: any) => {
        this.staffMembers = Array.isArray(res?.data) ? res.data : [];
      },
      error: () => {}
    });
  }

  get openCount(): number {
    return this.tickets.filter(t => t.status === 'Open').length;
  }

  get awaitingAdminCount(): number {
    return this.tickets.filter(t => t.status === 'Open' && t.lastSenderRole === 'Staff').length;
  }

  get closedCount(): number {
    return this.tickets.filter(t => t.status === 'Closed').length;
  }

  get filteredTickets(): any[] {
    const q = this.searchQuery.trim().toLowerCase();
    return this.tickets.filter(t => {
      if (this.categoryFilter && t.category !== this.categoryFilter) return false;
      if (this.statusFilter === 'Open' && t.status !== 'Open') return false;
      if (this.statusFilter === 'Closed' && t.status !== 'Closed') return false;
      if (this.statusFilter === 'AwaitingAdmin' && !(t.status === 'Open' && t.lastSenderRole === 'Staff')) return false;

      if (!q) return true;
      const inReplies = (t.replies || []).some((r: any) => (r.message || '').toLowerCase().includes(q));
      return (
        (t.ticketNumber || '').toLowerCase().includes(q) ||
        (t.topic || '').toLowerCase().includes(q) ||
        (t.staffFullName || '').toLowerCase().includes(q) ||
        (t.staffEmail || '').toLowerCase().includes(q) ||
        (t.category || '').toLowerCase().includes(q) ||
        inReplies
      );
    });
  }

  get effectivePageSize(): number {
    const total = this.filteredTickets.length;
    if (this.pageSize === 'all') return Math.max(1, total);
    return this.pageSize;
  }

  get totalPages(): number {
    if (this.pageSize === 'all') return 1;
    return Math.max(1, Math.ceil(this.filteredTickets.length / this.effectivePageSize));
  }

  get pageNumbers(): number[] {
    const pages: number[] = [];
    for (let i = 1; i <= this.totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  get paginatedTickets(): any[] {
    const list = this.filteredTickets;
    if (this.pageSize === 'all') return list;
    const safePage = Math.min(this.currentPage, this.totalPages);
    const start = (safePage - 1) * this.effectivePageSize;
    return list.slice(start, start + this.effectivePageSize);
  }

  get startEntryIndex(): number {
    if (this.filteredTickets.length === 0) return 0;
    if (this.pageSize === 'all') return 1;
    const safePage = Math.min(this.currentPage, this.totalPages);
    return (safePage - 1) * this.effectivePageSize + 1;
  }

  get endEntryIndex(): number {
    if (this.filteredTickets.length === 0) return 0;
    if (this.pageSize === 'all') return this.filteredTickets.length;
    return Math.min(this.filteredTickets.length, this.startEntryIndex + this.effectivePageSize - 1);
  }

  getSerialNumber(indexOnPage: number): number {
    return this.startEntryIndex + indexOnPage;
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  setStatusFilter(filter: string): void {
    this.statusFilter = this.statusFilter === filter ? '' : filter;
    this.currentPage = 1;
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.categoryFilter = '';
    this.statusFilter = '';
    this.currentPage = 1;
  }

  selectTicket(ticket: any): void {
    this.activeTicket = ticket;
    this.replyText = '';
  }

  getRemainingHoursText(ticket: any): string {
    if (!ticket?.lastActivityUtc) return '';
    const last = new Date(ticket.lastActivityUtc).getTime();
    const elapsedHrs = (Date.now() - last) / (1000 * 60 * 60);
    const remaining = Math.max(0, Math.round(48 - elapsedHrs));
    return `Auto-closes in ~${remaining}h if no activity`;
  }

  submitReply(): void {
    if (!this.activeTicket || !this.replyText.trim()) return;
    this.isSendingReply = true;
    this.workforceService.replyToMessageTicket(this.activeTicket.id, {
      message: this.replyText.trim(),
      senderRole: 'Admin'
    }).subscribe({
      next: (res: any) => {
        this.isSendingReply = false;
        this.replyText = '';
        this.toast.success('Reply sent to staff member.');
        if (res?.data) {
          this.activeTicket = res.data;
        }
        this.loadAll();
      },
      error: (err: any) => {
        this.isSendingReply = false;
        this.toast.error(err?.error?.message || 'Failed to send reply.');
      }
    });
  }

  toggleTicketStatus(ticket: any, newStatus: 'Open' | 'Closed'): void {
    this.workforceService.updateMessageTicketStatus(ticket.id, newStatus).subscribe({
      next: (res: any) => {
        this.toast.success(newStatus === 'Open' ? 'Ticket re-opened.' : 'Ticket closed.');
        if (res?.data && this.activeTicket?.id === ticket.id) {
          this.activeTicket = res.data;
        }
        this.loadAll();
      },
      error: (err: any) => {
        this.toast.error(err?.error?.message || 'Failed to update ticket status.');
      }
    });
  }

  openNewFollowUpModal(): void {
    this.newTicketForm = {
      staffUserId: this.staffMembers.length > 0 ? this.staffMembers[0].userId : '',
      category: 'Admin Follow-Up',
      topic: '',
      message: ''
    };
    this.showNewModal = true;
  }

  submitNewTicket(): void {
    if (!this.newTicketForm.staffUserId) {
      this.toast.error('Please select a staff member.');
      return;
    }
    if (!this.newTicketForm.topic.trim() || !this.newTicketForm.message.trim()) {
      this.toast.error('Please enter both a topic title and message.');
      return;
    }

    this.isCreating = true;
    this.workforceService.createMessageTicket({
      staffUserId: this.newTicketForm.staffUserId,
      category: this.newTicketForm.category,
      topic: this.newTicketForm.topic.trim(),
      message: this.newTicketForm.message.trim()
    }).subscribe({
      next: (res: any) => {
        this.isCreating = false;
        this.showNewModal = false;
        this.toast.success('Follow-up ticket opened and staff member notified.');
        this.loadAll();
        if (res?.data) {
          this.activeTicket = res.data;
        }
      },
      error: (err: any) => {
        this.isCreating = false;
        this.toast.error(err?.error?.message || 'Failed to create follow-up ticket.');
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
