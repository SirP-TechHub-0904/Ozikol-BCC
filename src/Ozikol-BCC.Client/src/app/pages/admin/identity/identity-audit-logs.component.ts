import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { TranslationService } from '../../../core/services/translation.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { parseUserAgent, formatClientIpAddress } from '../../../core/utils/user-agent.util';

/**
 * Interface representing a unified workspace-wide activity or authentication audit log entry.
 */
export interface WorkspaceAuditLogItem {
  id: string;
  logSource?: 'activity' | 'login' | string;
  userId?: string;
  fullName?: string;
  email: string;
  actionType?: string;
  status: string;
  description?: string;
  module?: string;
  ipAddress: string;
  userAgent: string;
  device?: string;
  browser?: string;
  browserName?: string;
  clientType?: string;
  icon?: string;
  isTrusted?: boolean;
  date?: string;
  timestamp: string;
}

/**
 * Workspace Security Audit Console (/identity/console/audit-logs).
 * Displays the complete audit trail of tasks, operational changes, and authentication events
 * performed by all users across the workspace (without the 30-day personal retention limit),
 * and allows administrators to delete specific or selected log records when necessary.
 */
@Component({
  selector: 'app-identity-audit-logs',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="audit-page-container">
      <section class="card-section animate-fade">
        <!-- Card Header matching Manage My Account -> My Activity -->
        <div class="section-card-head">
          <div class="card-title-group">
            <span class="material-symbols-outlined head-icon text-primary">security</span>
            <div>
              <h2 class="card-title">{{ 'audit.console_title' | translate:'Security Audit & Log Activity (All Workspace Users)' }}</h2>
              <p class="card-desc">
                {{ 'audit.console_desc' | translate:'Complete workspace audit trail of tasks, operational changes, and authentication events across all users and historical archives.' }}
              </p>
            </div>
          </div>

          <div class="head-actions-wrap">
            <span class="counter-badge" *ngIf="totalCount > 0">{{ totalCount }} {{ 'audit.logs_count' | translate:'Audit Logs' }}</span>

            <button
              type="button"
              class="btn-danger-outline"
              *ngIf="selectedIds.size > 0"
              (click)="deleteSelectedLogs()"
              [disabled]="isDeleting">
              <span class="material-symbols-outlined">delete_sweep</span>
              <span>{{ 'audit.delete_selected' | translate:'Delete Selected' }} ({{ selectedIds.size }})</span>
            </button>

            <button
              type="button"
              class="btn-secondary"
              (click)="loadLogs(page)"
              [disabled]="isLoading">
              <span class="material-symbols-outlined" [class.spin-icon]="isLoading">refresh</span>
              <span>{{ 'audit.refresh' | translate:'Refresh' }}</span>
            </button>
          </div>
        </div>

        <div class="card-body">
          <!-- Search & Filter Toolbar -->
          <div class="filter-toolbar">
            <div class="search-box-wrap">
              <span class="material-symbols-outlined search-icon">search</span>
              <input
                type="text"
                [(ngModel)]="searchTerm"
                (keyup.enter)="onSearchChange()"
                [placeholder]="'audit.search_placeholder' | translate:'Search by user, email, action, description, or IP...'"
                class="search-input" />
              <button
                type="button"
                class="clear-btn"
                *ngIf="searchTerm"
                (click)="clearSearch()"
                [title]="'adm.close' | translate:'Clear search'">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>

            <select [(ngModel)]="selectedModule" (ngModelChange)="onModuleChange()" class="module-select">
              <option value="all">{{ 'audit.all_modules' | translate:'All Modules' }} ({{ modules.length }})</option>
              <option *ngFor="let mod of modules" [value]="mod">{{ translationService.translateDynamic(mod) }}</option>
            </select>

            <button type="button" class="btn-secondary btn-filter" (click)="onSearchChange()">
              <span class="material-symbols-outlined">filter_list</span>
              <span>{{ 'audit.filter' | translate:'Filter' }}</span>
            </button>
          </div>

          <!-- Empty State -->
          <div class="empty-state" *ngIf="logs.length === 0 && !isLoading">
            <span class="material-symbols-outlined empty-icon">manage_search</span>
            <p>{{ 'audit.no_records' | translate:'No audit log records match your current criteria.' }}</p>
          </div>

          <!-- Unified Audit Log Table (Same structure as My Activity + User Column + Admin Delete) -->
          <div class="table-responsive" *ngIf="logs.length > 0">
            <table class="account-table">
              <thead>
                <tr>
                  <th style="width: 40px;">
                    <input
                      type="checkbox"
                      [checked]="isAllPageSelected"
                      (change)="toggleSelectAll($event)" />
                  </th>
                  <th>{{ 'audit.th_user' | translate:'User / Account' }}</th>
                  <th>{{ 'audit.th_action_status' | translate:'Action & Status' }}</th>
                  <th>{{ 'audit.th_desc_module' | translate:'Description / Module' }}</th>
                  <th>{{ 'audit.th_ip' | translate:'IP Address' }}</th>
                  <th>{{ 'audit.th_browser_device' | translate:'Browser / Device' }}</th>
                  <th>{{ 'audit.th_timestamp' | translate:'Timestamp' }}</th>
                  <th style="text-align: right; width: 84px;">{{ 'audit.th_action' | translate:'Action' }}</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let log of logs" [class.selected-row]="selectedIds.has(log.id)">
                  <td>
                    <input
                      type="checkbox"
                      [checked]="selectedIds.has(log.id)"
                      (change)="toggleSelectOne(log.id, $event)" />
                  </td>
                  <td>
                    <div class="user-col">
                      <span class="user-name">{{ log.fullName || log.email }}</span>
                      <span class="user-email" *ngIf="log.fullName && log.fullName !== log.email">{{ log.email }}</span>
                    </div>
                  </td>
                  <td>
                    <div class="log-status-col">
                      <span class="log-status-pill" [ngClass]="getStatusClass(log.actionType || log.status)">
                        <span class="material-symbols-outlined">{{ getStatusIcon(log.actionType || log.status) }}</span>
                        {{ translationService.translateDynamic(log.actionType || log.status) }}
                      </span>
                      <span class="badge-trusted-pill" *ngIf="log.isTrusted || (log.status && log.status.includes('Trusted'))">
                        <span class="material-symbols-outlined">verified_user</span>
                        <span>{{ 'audit.trusted' | translate:'Trusted' }}</span>
                      </span>
                    </div>
                  </td>
                  <td>
                    <div class="log-desc-col">
                      <span class="log-desc-text">{{ translationService.translateDynamic(log.description || log.actionType || log.status) }}</span>
                      <span class="log-module-badge" *ngIf="log.module">{{ translationService.translateDynamic(log.module) }}</span>
                    </div>
                  </td>
                  <td><code>{{ formatIpAddress(log.ipAddress) }}</code></td>
                  <td class="log-agent" [title]="log.userAgent">
                    <div class="log-agent-wrap">
                      <div class="log-agent-head">
                        <span class="material-symbols-outlined log-device-icon">{{ log.icon || getDeviceIcon(log.userAgent) }}</span>
                        <span class="log-device-main">{{ log.device || formatDeviceTitle(log.userAgent) }}</span>
                      </div>
                      <span class="log-device-sub">{{ log.browser || formatBrowserDetails(log.userAgent) }}</span>
                    </div>
                  </td>
                  <td>{{ formatDateTime(log.timestamp || log.date) }}</td>
                  <td style="text-align: right;">
                    <button
                      type="button"
                      class="btn-delete-row"
                      (click)="deleteLog(log)"
                      [disabled]="deletingId === log.id"
                      [title]="'audit.delete_log' | translate:'Delete Audit Log'">
                      <span class="material-symbols-outlined">delete</span>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>

            <!-- Pagination Toolbar -->
            <div class="pagination-footer" *ngIf="totalCount > 0">
              <div class="page-size-selector">
                <span>{{ 'audit.show' | translate:'Show' }}</span>
                <select [ngModel]="pageSize" (ngModelChange)="onPageSizeChange($event)">
                  <option [ngValue]="10">10</option>
                  <option [ngValue]="25">25</option>
                  <option [ngValue]="50">50</option>
                  <option [ngValue]="100">100</option>
                </select>
                <span>{{ 'audit.entries_per_page' | translate:'entries per page' }}</span>
                <span class="entries-info">
                  ({{ 'audit.showing' | translate:'Showing' }} {{ (page - 1) * pageSize + 1 }} {{ 'audit.to' | translate:'to' }} {{ getEndIndex() }} {{ 'audit.of' | translate:'of' }} {{ totalCount }} {{ 'audit.records' | translate:'records' }})
                </span>
              </div>

              <div class="pagination-controls" *ngIf="totalPages > 1">
                <button type="button" class="page-btn" [disabled]="page === 1" (click)="setPage(1)">
                  <span class="material-symbols-outlined">keyboard_double_arrow_left</span>
                </button>
                <button type="button" class="page-btn" [disabled]="page === 1" (click)="setPage(page - 1)">
                  <span class="material-symbols-outlined">chevron_left</span>
                </button>

                <ng-container *ngFor="let p of getVisiblePages()">
                  <span class="page-ellipsis" *ngIf="p === '...'">...</span>
                  <button
                    *ngIf="p !== '...'"
                    type="button"
                    class="page-btn"
                    [class.active]="p === page"
                    (click)="setPage(+p)">
                    {{ p }}
                  </button>
                </ng-container>

                <button type="button" class="page-btn" [disabled]="page === totalPages" (click)="setPage(page + 1)">
                  <span class="material-symbols-outlined">chevron_right</span>
                </button>
                <button type="button" class="page-btn" [disabled]="page === totalPages" (click)="setPage(totalPages)">
                  <span class="material-symbols-outlined">keyboard_double_arrow_right</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .audit-page-container {
      width: 100%;
      box-sizing: border-box;
    }
    .card-section {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.03);
      overflow: hidden;
    }
    .section-card-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
      padding: 20px 24px;
      border-bottom: 1px solid #f1f5f9;
    }
    .card-title-group {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .head-icon {
      font-size: 26px;
      color: #0050e5;
    }
    .card-title {
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
    }
    .card-desc {
      font-size: 12.5px;
      color: #64748b;
      margin: 2px 0 0 0;
    }
    .head-actions-wrap {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .counter-badge {
      font-size: 12px;
      font-weight: 700;
      color: #0050e5;
      background: rgba(0, 80, 229, 0.08);
      padding: 4px 10px;
      border-radius: 9999px;
    }
    .btn-secondary {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #f1f5f9;
      color: #334155;
      border: 1px solid #cbd5e1;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.15s;
    }
    .btn-secondary:hover:not(:disabled) {
      background: #e2e8f0;
    }
    .btn-danger-outline {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(239, 68, 68, 0.06);
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.25);
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 12.5px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-danger-outline:hover:not(:disabled) {
      background: #ef4444;
      color: #ffffff;
    }
    .card-body {
      padding: 20px 24px 24px;
    }

    /* Filter Toolbar */
    .filter-toolbar {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      margin-bottom: 18px;
    }
    .search-box-wrap {
      position: relative;
      display: flex;
      align-items: center;
      flex: 1 1 280px;
      max-width: 440px;
    }
    .search-icon {
      position: absolute;
      left: 11px;
      font-size: 18px;
      color: #94a3b8;
      pointer-events: none;
    }
    .search-input {
      width: 100%;
      height: 38px;
      padding: 0 32px 0 36px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 13px;
      color: #0f172a;
      background: #f8fafc;
      outline: none;
    }
    .search-input:focus {
      background: #ffffff;
      border-color: #0050e5;
    }
    .clear-btn {
      position: absolute;
      right: 8px;
      background: none;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      display: flex;
      align-items: center;
      padding: 2px;
    }
    .clear-btn .material-symbols-outlined {
      font-size: 16px;
    }
    .module-select {
      height: 38px;
      padding: 0 12px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      background: #f8fafc;
      font-size: 13px;
      font-weight: 600;
      color: #334155;
      outline: none;
      cursor: pointer;
    }
    .btn-filter {
      height: 38px;
      padding: 0 14px;
    }

    /* Table Styles matching My Activity */
    .table-responsive {
      overflow-x: auto;
    }
    .account-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .account-table th {
      text-align: left;
      padding: 10px 14px;
      background: #f8fafc;
      color: #475569;
      font-weight: 700;
      border-bottom: 2px solid #e2e8f0;
      font-size: 11.5px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      white-space: nowrap;
    }
    .account-table td {
      padding: 12px 14px;
      border-bottom: 1px solid #f1f5f9;
      color: #1e293b;
      vertical-align: middle;
    }
    .account-table tr:hover td {
      background: #f8fafc;
    }
    .account-table tr.selected-row td {
      background: rgba(0, 80, 229, 0.04);
    }

    .user-col {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .user-name {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
    }
    .user-email {
      font-size: 11.5px;
      color: #64748b;
    }

    .log-status-col {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
    }
    .log-status-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 20px;
    }
    .log-status-pill .material-symbols-outlined {
      font-size: 14px;
    }
    .log-good {
      background: rgba(22, 163, 74, 0.1);
      color: #16a34a;
    }
    .log-bad {
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
    }
    .log-info {
      background: rgba(0, 80, 229, 0.1);
      color: #0050e5;
    }
    .badge-trusted-pill {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      font-size: 10px;
      font-weight: 700;
      background: rgba(16, 185, 129, 0.12);
      color: #059669;
      border: 1px solid rgba(16, 185, 129, 0.3);
      padding: 1px 6px;
      border-radius: 10px;
    }
    .badge-trusted-pill .material-symbols-outlined {
      font-size: 11px;
    }

    .log-desc-col {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .log-desc-text {
      font-size: 13px;
      font-weight: 600;
      color: #1e293b;
    }
    .log-module-badge {
      display: inline-block;
      align-self: flex-start;
      font-size: 10.5px;
      font-weight: 700;
      padding: 2px 7px;
      background: #f1f5f9;
      color: #475569;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
    }

    .log-agent {
      min-width: 210px;
      max-width: 340px;
    }
    .log-agent-wrap {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .log-agent-head {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .log-device-icon {
      font-size: 16px;
      color: #0050e5;
    }
    .log-device-main {
      font-weight: 600;
      color: #0f172a;
      font-size: 13px;
    }
    .log-device-sub {
      font-size: 11.5px;
      color: #64748b;
      padding-left: 22px;
    }

    .btn-delete-row {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 7px;
      border: 1px solid #e2e8f0;
      background: #ffffff;
      color: #ef4444;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-delete-row:hover:not(:disabled) {
      background: #ef4444;
      border-color: #ef4444;
      color: #ffffff;
    }
    .btn-delete-row .material-symbols-outlined {
      font-size: 17px;
    }

    .empty-state {
      padding: 48px 20px;
      text-align: center;
      color: #64748b;
    }
    .empty-icon {
      font-size: 40px;
      color: #94a3b8;
      margin-bottom: 10px;
    }

    /* Pagination Footer */
    .pagination-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border-top: 1px solid #e2e8f0;
      background: #f8fafc;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 4px;
      border-radius: 0 0 10px 10px;
    }
    .page-size-selector {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #64748b;
    }
    .page-size-selector select {
      height: 30px;
      padding: 0 8px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      background: #ffffff;
      outline: none;
      font-size: 12px;
      font-weight: 600;
      color: #0f172a;
      cursor: pointer;
    }
    .entries-info {
      font-size: 12px;
      color: #94a3b8;
      margin-left: 6px;
    }
    .pagination-controls {
      display: flex;
      gap: 4px;
      align-items: center;
    }
    .page-btn {
      min-width: 32px;
      height: 32px;
      padding: 0 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      color: #334155;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .page-btn:hover:not(:disabled) {
      background: #f1f5f9;
      border-color: #94a3b8;
    }
    .page-btn.active {
      background: #0050e5;
      color: #ffffff;
      border-color: #0050e5;
    }
    .page-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .page-btn .material-symbols-outlined {
      font-size: 18px;
    }
    .page-ellipsis {
      padding: 0 4px;
      color: #94a3b8;
      font-size: 12px;
    }
    .spin-icon {
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `]
})
export class IdentityAuditLogsComponent implements OnInit {
  isLoading = false;
  isDeleting = false;
  deletingId: string | null = null;

  logs: WorkspaceAuditLogItem[] = [];
  modules: string[] = [];

  page = 1;
  pageSize = 25;
  totalCount = 0;
  totalPages = 1;

  searchTerm = '';
  selectedModule = 'all';

  selectedIds = new Set<string>();

  constructor(
    private api: ApiService,
    private toast: ToastService,
    public translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.loadLogs(1);
  }

  /**
   * Loads the unified workspace security audit logs from the backend API.
   */
  loadLogs(targetPage: number = 1): void {
    this.isLoading = true;
    this.page = targetPage;
    const params = new URLSearchParams();
    params.set('page', String(this.page));
    params.set('pageSize', String(this.pageSize));
    if (this.searchTerm.trim()) {
      params.set('search', this.searchTerm.trim());
    }
    if (this.selectedModule && this.selectedModule !== 'all') {
      params.set('module', this.selectedModule);
    }

    this.api.get<any>(`IdentityApi/security-audit?${params.toString()}`).subscribe({
      next: res => {
        this.isLoading = false;
        const data = res?.data;
        if (data && Array.isArray(data.items)) {
          this.logs = data.items.filter((item: WorkspaceAuditLogItem) => {
            const desc = (item?.description || '').trim();
            if (desc.toLowerCase().includes('[viewcount:') && !desc.includes(', ')) {
              return false;
            }
            return true;
          });
          this.totalCount = Math.max(0, Number(data.totalCount || data.items.length) - (data.items.length - this.logs.length));
          this.page = Number(data.page || 1);
          this.pageSize = Number(data.pageSize || 25);
          this.totalPages = Number(data.totalPages || 1);
          if (Array.isArray(data.modules)) {
            this.modules = data.modules;
          }
          const dynamicStrings: string[] = [...this.modules];
          for (const l of this.logs) {
            if (l.actionType) dynamicStrings.push(l.actionType);
            if (l.status) dynamicStrings.push(l.status);
            if (l.description) dynamicStrings.push(l.description);
            if (l.module) dynamicStrings.push(l.module);
          }
          this.translationService.registerDynamicTexts(dynamicStrings);
          this.selectedIds.clear();
        } else {
          this.logs = [];
          this.totalCount = 0;
          this.totalPages = 1;
        }
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  onSearchChange(): void {
    this.loadLogs(1);
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.loadLogs(1);
  }

  onModuleChange(): void {
    this.loadLogs(1);
  }

  /**
   * Deletes a single audit log entry when requested by the administrator.
   */
  deleteLog(log: WorkspaceAuditLogItem): void {
    if (!log || !log.id) return;
    this.deletingId = log.id;
    this.api.delete<any>(`IdentityApi/security-audit/${log.id}`).subscribe({
      next: () => {
        this.deletingId = null;
        this.selectedIds.delete(log.id);
        this.toast.success(
          this.translationService.translate('audit.deleted_toast', 'Audit log record deleted.'),
          this.translationService.translate('audit.deleted_title', 'Deleted')
        );
        this.loadLogs(this.page);
      },
      error: err => {
        this.deletingId = null;
        this.toast.error(
          this.translationService.translateDynamic(err?.error?.message || 'Could not delete audit log record.'),
          this.translationService.translate('audit.deleted_title', 'Error')
        );
      }
    });
  }

  /**
   * Deletes all currently selected audit log entries in bulk.
   */
  deleteSelectedLogs(): void {
    const ids = Array.from(this.selectedIds);
    if (ids.length === 0) return;
    this.isDeleting = true;
    this.api.post<any>('IdentityApi/security-audit/bulk-delete', ids).subscribe({
      next: () => {
        this.isDeleting = false;
        this.selectedIds.clear();
        this.toast.success(
          this.translationService.translate('audit.deleted_toast', 'Audit log record deleted.'),
          this.translationService.translate('audit.deleted_title', 'Deleted')
        );
        this.loadLogs(1);
      },
      error: err => {
        this.isDeleting = false;
        this.toast.error(
          this.translationService.translateDynamic(err?.error?.message || 'Failed to delete selected logs.'),
          this.translationService.translate('audit.deleted_title', 'Error')
        );
      }
    });
  }

  get isAllPageSelected(): boolean {
    return this.logs.length > 0 && this.logs.every(l => this.selectedIds.has(l.id));
  }

  toggleSelectAll(event: Event): void {
    const checked = (event.target as HTMLInputElement)?.checked;
    if (checked) {
      for (const l of this.logs) {
        this.selectedIds.add(l.id);
      }
    } else {
      for (const l of this.logs) {
        this.selectedIds.delete(l.id);
      }
    }
  }

  toggleSelectOne(id: string, event: Event): void {
    const checked = (event.target as HTMLInputElement)?.checked;
    if (checked) {
      this.selectedIds.add(id);
    } else {
      this.selectedIds.delete(id);
    }
  }

  setPage(target: number): void {
    if (target < 1 || target > this.totalPages || target === this.page) return;
    this.loadLogs(target);
  }

  onPageSizeChange(newSize: number): void {
    this.pageSize = Number(newSize) || 25;
    this.loadLogs(1);
  }

  getEndIndex(): number {
    return Math.min(this.page * this.pageSize, this.totalCount);
  }

  getVisiblePages(): (number | string)[] {
    const total = this.totalPages;
    const current = this.page;
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages: (number | string)[] = [1];
    if (current > 3) pages.push('...');
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    if (current < total - 2) pages.push('...');
    pages.push(total);
    return pages;
  }

  formatDeviceTitle(device: string | undefined | null): string {
    return parseUserAgent(device).displayTitle;
  }

  formatBrowserDetails(device: string | undefined | null): string {
    return parseUserAgent(device).displayDetails;
  }

  formatIpAddress(ip: string | undefined | null): string {
    return formatClientIpAddress(ip);
  }

  getDeviceIcon(device: string): string {
    return parseUserAgent(device).icon;
  }

  getStatusIcon(status: string): string {
    const s = (status || '').toLowerCase();
    if (s.includes('success') || s.includes('granted') || s.includes('installed') || s.includes('enabled') || s.includes('activated')) return 'check_circle';
    if (s.includes('fail') || s.includes('denied')) return 'cancel';
    if (s.includes('revoked') || s.includes('terminated') || s.includes('deactivated') || s.includes('disabled') || s.includes('deleted') || s.includes('removed')) return 'block';
    return 'info';
  }

  getStatusClass(status: string): string {
    const s = (status || '').toLowerCase();
    if (s.includes('success') || s.includes('granted') || s.includes('installed') || s.includes('enabled') || s.includes('activated')) return 'log-good';
    if (s.includes('fail') || s.includes('denied') || s.includes('revoked') || s.includes('deactivated') || s.includes('disabled') || s.includes('deleted') || s.includes('removed')) return 'log-bad';
    return 'log-info';
  }

  formatDateTime(dateStr: string | undefined | null): string {
    if (!dateStr) return '—';
    try {
      const utcStr = (dateStr.endsWith('Z') || dateStr.includes('+')) ? dateStr : `${dateStr}Z`;
      const d = new Date(utcStr);
      return d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return dateStr;
    }
  }
}
