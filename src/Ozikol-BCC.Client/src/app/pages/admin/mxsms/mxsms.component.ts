import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent, PageHeaderButton } from '../../../shared/components/page-header/page-header.component';

export interface SmsLogItem {
  id: string;
  recipientPhone: string;
  recipientName?: string;
  recipientEmail?: string;
  message: string;
  charLength: number;
  segments: number;
  category: string;
  priority: string;
  eventType?: string;
  status: 'Queued' | 'Sent' | 'Failed' | 'Processing';
  retries: number;
  maxRetries: number;
  lastError?: string;
  scheduledAt?: string;
  sentAt?: string;
  createdAt: string;
}

export interface SmsQueueStats {
  totalSms: number;
  queuedCount: number;
  sentCount: number;
  failedCount: number;
  processingCount: number;
}

@Component({
  selector: 'app-mxsms',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent],
  template: `
    <div class="mxsms-container">
      <app-page-header
        eyebrow="TELEMETRY & DISPATCH POOL"
        icon="sms"
        title="MX Outbound SMS Telemetry & Logs"
        subtitle="Real-time inspection of all transactional SMS passcodes, verification codes, alerts, and dispatch telemetry."
        [buttons]="headerButtons"
        [loading]="isLoading"
      ></app-page-header>

      <!-- KPI Summary Cards -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-icon-wrap bg-blue-subtle">
            <span class="material-symbols-outlined text-blue">sms</span>
          </div>
          <div class="kpi-meta">
            <span class="kpi-label">Total Outbound Pool</span>
            <span class="kpi-value">{{ stats.totalSms | number }}</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon-wrap bg-green-subtle">
            <span class="material-symbols-outlined text-green">verified</span>
          </div>
          <div class="kpi-meta">
            <span class="kpi-label">Successfully Delivered</span>
            <span class="kpi-value">{{ stats.sentCount | number }}</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon-wrap bg-amber-subtle">
            <span class="material-symbols-outlined text-amber">hourglass_top</span>
          </div>
          <div class="kpi-meta">
            <span class="kpi-label">Queued / Processing</span>
            <span class="kpi-value">{{ (stats.queuedCount + stats.processingCount) | number }}</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon-wrap bg-red-subtle">
            <span class="material-symbols-outlined text-red">error</span>
          </div>
          <div class="kpi-meta">
            <span class="kpi-label">Delivery Failures</span>
            <span class="kpi-value">{{ stats.failedCount | number }}</span>
          </div>
        </div>
      </div>

      <!-- Controls & Filter Toolbar -->
      <div class="toolbar-card">
        <div class="filter-tabs">
          <button 
            type="button" 
            class="tab-btn" 
            [class.active]="selectedStatus === 'All'" 
            (click)="filterByStatus('All')"
          >
            All Logs ({{ stats.totalSms }})
          </button>
          <button 
            type="button" 
            class="tab-btn" 
            [class.active]="selectedStatus === 'Queued'" 
            (click)="filterByStatus('Queued')"
          >
            <span class="status-dot dot-blue"></span>
            Queued ({{ stats.queuedCount }})
          </button>
          <button 
            type="button" 
            class="tab-btn" 
            [class.active]="selectedStatus === 'Sent'" 
            (click)="filterByStatus('Sent')"
          >
            <span class="status-dot dot-green"></span>
            Delivered ({{ stats.sentCount }})
          </button>
          <button 
            type="button" 
            class="tab-btn" 
            [class.active]="selectedStatus === 'Failed'" 
            (click)="filterByStatus('Failed')"
          >
            <span class="status-dot dot-red"></span>
            Failed ({{ stats.failedCount }})
          </button>
        </div>

        <div class="search-box">
          <span class="material-symbols-outlined search-icon">search</span>
          <input 
            type="text" 
            [(ngModel)]="searchQuery" 
            (keyup.enter)="loadLogs()" 
            placeholder="Search by phone, message, or member..." 
            class="search-input"
          />
          <button *ngIf="searchQuery" (click)="searchQuery = ''; loadLogs()" class="clear-btn">
            <span class="material-symbols-outlined">close</span>
          </button>
          <button type="button" class="btn btn-outline btn-sm" (click)="loadLogs()">Filter</button>
        </div>
      </div>

      <!-- Main Logs Table Card -->
      <div class="logs-card">
        <div class="table-responsive" *ngIf="!isLoading && logs.length > 0">
          <table class="table-clean">
            <thead>
              <tr>
                <th style="width: 130px;">Status</th>
                <th>Recipient</th>
                <th>Message Content</th>
                <th style="width: 130px;">Category & Priority</th>
                <th style="width: 170px;">Timeline</th>
                <th style="width: 130px; text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of logs">
                <td>
                  <span class="badge-status" [ngClass]="'badge-' + item.status.toLowerCase()">
                    <span class="status-indicator"></span>
                    {{ item.status }}
                  </span>
                  <div *ngIf="item.lastError" class="error-hint" [title]="item.lastError">
                    <span class="material-symbols-outlined">warning</span>
                    <span>Error details</span>
                  </div>
                </td>
                <td>
                  <div class="recipient-cell">
                    <strong class="recipient-phone">{{ item.recipientPhone }}</strong>
                    <span class="recipient-name" *ngIf="item.recipientName">{{ item.recipientName }}</span>
                    <button type="button" class="btn-copy-inline" (click)="copyText(item.recipientPhone)" title="Copy phone number">
                      <span class="material-symbols-outlined">content_copy</span>
                    </button>
                  </div>
                </td>
                <td>
                  <div class="message-cell">
                    <p class="sms-preview-text">{{ item.message }}</p>
                    <div class="sms-meta-pills">
                      <span class="sms-segment-pill">
                        {{ item.charLength }} chars &bull; {{ item.segments }} segment{{ item.segments > 1 ? 's' : '' }}
                      </span>
                      <span *ngIf="item.eventType" class="event-pill">{{ item.eventType }}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <div class="category-meta">
                    <span class="badge-category">{{ item.category }}</span>
                    <span class="badge-priority" [ngClass]="'priority-' + item.priority.toLowerCase()">{{ item.priority }}</span>
                  </div>
                </td>
                <td>
                  <div class="timeline-meta">
                    <span class="date-created">Queued: {{ item.createdAt | date:'short' }}</span>
                    <span *ngIf="item.sentAt" class="date-sent">Sent: {{ item.sentAt | date:'short' }}</span>
                  </div>
                </td>
                <td style="text-align: right;">
                  <div class="row-actions">
                    <button type="button" class="btn-icon" (click)="viewDetails(item)" title="View Details">
                      <span class="material-symbols-outlined">visibility</span>
                    </button>
                    <button 
                      *ngIf="item.status === 'Failed' || item.status === 'Queued'" 
                      type="button" 
                      class="btn-icon btn-retry" 
                      (click)="retrySms(item)" 
                      title="Retry SMS"
                    >
                      <span class="material-symbols-outlined">refresh</span>
                    </button>
                    <button type="button" class="btn-icon btn-delete" (click)="deleteSms(item)" title="Delete Log">
                      <span class="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Empty State -->
        <div class="empty-state" *ngIf="!isLoading && logs.length === 0">
          <div class="empty-icon-wrap">
            <span class="material-symbols-outlined">sms</span>
          </div>
          <h4>No SMS Logs Found</h4>
          <p>No outbound SMS queue records match your current filter parameters.</p>
          <button type="button" class="btn btn-primary btn-sm" (click)="clearFilters()">Reset Filters</button>
        </div>

        <!-- Loading State -->
        <div class="loading-state" *ngIf="isLoading">
          <div class="spinner"></div>
          <span>Loading outbound SMS telemetry records...</span>
        </div>

        <!-- Pagination Controls -->
        <div class="pagination-footer" *ngIf="!isLoading && totalCount > 0">
          <div class="page-meta">
            Showing {{ ((page - 1) * pageSize) + 1 }} to {{ Math.min(page * pageSize, totalCount) }} of {{ totalCount }} logs
          </div>
          <div class="page-controls">
            <button type="button" class="btn-page" [disabled]="page === 1" (click)="goToPage(page - 1)">
              <span class="material-symbols-outlined">chevron_left</span>
            </button>
            <span class="page-number">Page {{ page }} of {{ totalPages || 1 }}</span>
            <button type="button" class="btn-page" [disabled]="page >= totalPages" (click)="goToPage(page + 1)">
              <span class="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Detail Modal -->
      <div class="modal-backdrop" *ngIf="selectedSms" (click)="selectedSms = null">
        <div class="modal-dialog" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div class="modal-title-wrap">
              <span class="material-symbols-outlined modal-icon">sms</span>
              <div>
                <h3>SMS Queue Record</h3>
                <span class="modal-subtitle">ID: {{ selectedSms.id }}</span>
              </div>
            </div>
            <button type="button" class="btn-close" (click)="selectedSms = null">&times;</button>
          </div>

          <div class="modal-body">
            <div class="detail-grid">
              <div class="detail-item">
                <span class="label">Recipient Phone</span>
                <span class="value font-mono">{{ selectedSms.recipientPhone }}</span>
              </div>
              <div class="detail-item" *ngIf="selectedSms.recipientName">
                <span class="label">Associated Member</span>
                <span class="value">{{ selectedSms.recipientName }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Queue Status</span>
                <span class="badge-status" [ngClass]="'badge-' + selectedSms.status.toLowerCase()">
                  {{ selectedSms.status }}
                </span>
              </div>
              <div class="detail-item">
                <span class="label">Priority / Category</span>
                <span class="value">{{ selectedSms.priority }} &bull; {{ selectedSms.category }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Length & Segments</span>
                <span class="value">{{ selectedSms.charLength }} characters ({{ selectedSms.segments }} segment{{ selectedSms.segments > 1 ? 's' : '' }})</span>
              </div>
              <div class="detail-item">
                <span class="label">Created At</span>
                <span class="value">{{ selectedSms.createdAt | date:'medium' }}</span>
              </div>
            </div>

            <div class="error-banner" *ngIf="selectedSms.lastError">
              <span class="material-symbols-outlined">error</span>
              <div>
                <strong>Delivery Error:</strong>
                <p>{{ selectedSms.lastError }}</p>
              </div>
            </div>

            <div class="message-preview-box">
              <span class="box-label">Full Message Body</span>
              <pre class="sms-body-display">{{ selectedSms.message }}</pre>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-outline" (click)="selectedSms = null">Close</button>
            <button 
              *ngIf="selectedSms.status === 'Failed' || selectedSms.status === 'Queued'" 
              type="button" 
              class="btn btn-primary" 
              (click)="retrySms(selectedSms)"
            >
              <span class="material-symbols-outlined">refresh</span>
              <span>Re-Queue SMS</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Test SMS Modal -->
      <div class="modal-backdrop" *ngIf="showTestModal" (click)="showTestModal = false">
        <div class="modal-dialog" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div class="modal-title-wrap">
              <span class="material-symbols-outlined modal-icon text-blue">cell_tower</span>
              <div>
                <h3>Dispatch Test SMS</h3>
                <span class="modal-subtitle">Enqueue a diagnostic SMS message to verify dispatch flow</span>
              </div>
            </div>
            <button type="button" class="btn-close" (click)="showTestModal = false">&times;</button>
          </div>

          <div class="modal-body">
            <div class="form-group">
              <label>Recipient Phone Number *</label>
              <input 
                type="text" 
                [(ngModel)]="testPhone" 
                placeholder="e.g. +0 (000) 000-0000" 
                class="form-input font-mono"
              />
            </div>

            <div class="form-group">
              <label>Custom Message (Optional)</label>
              <textarea 
                [(ngModel)]="testMessage" 
                rows="4" 
                placeholder="Diagnostic verification from Business Command Center..."
                class="form-input"
              ></textarea>
              <div class="char-count">
                {{ testMessage.length }} / 160 chars ({{ Math.ceil(Math.max(1, testMessage.length) / 160) }} segment)
              </div>
            </div>

            <div *ngIf="testFeedback" class="test-feedback" [class.success]="testSuccess" [class.error]="!testSuccess">
              {{ testFeedback }}
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-outline" (click)="showTestModal = false">Cancel</button>
            <button 
              type="button" 
              class="btn btn-primary" 
              [disabled]="isSendingTest || !testPhone" 
              (click)="sendTestSms()"
            >
              <span class="material-symbols-outlined">{{ isSendingTest ? 'hourglass_top' : 'send' }}</span>
              <span>{{ isSendingTest ? 'Dispatching...' : 'Send Test SMS' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .mxsms-container {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .kpi-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 18px 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    }

    .kpi-icon-wrap {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .bg-blue-subtle { background: #eff6ff; color: #0050e5; }
    .bg-green-subtle { background: #ecfdf5; color: #059669; }
    .bg-amber-subtle { background: #fffbeb; color: #d97706; }
    .bg-red-subtle { background: #fef2f2; color: #dc2626; }

    .text-blue { color: #0050e5; }
    .text-green { color: #059669; }
    .text-amber { color: #d97706; }
    .text-red { color: #dc2626; }

    .kpi-meta {
      display: flex;
      flex-direction: column;
    }

    .kpi-label {
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .kpi-value {
      font-size: 24px;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.2;
    }

    .toolbar-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 12px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
      margin-bottom: 20px;
    }

    .filter-tabs {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .tab-btn {
      background: transparent;
      border: 1px solid transparent;
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      color: #64748b;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
    }

    .tab-btn:hover {
      background: #f8fafc;
      color: #0f172a;
    }

    .tab-btn.active {
      background: #eff6ff;
      border-color: #bfdbfe;
      color: #0050e5;
    }

    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
    }

    .dot-blue { background: #0050e5; }
    .dot-green { background: #059669; }
    .dot-red { background: #dc2626; }

    .search-box {
      display: flex;
      align-items: center;
      gap: 8px;
      position: relative;
      flex: 1;
      max-width: 400px;
    }

    .search-icon {
      position: absolute;
      left: 10px;
      font-size: 18px;
      color: #94a3b8;
    }

    .search-input {
      width: 100%;
      padding: 8px 32px 8px 34px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 13px;
      outline: none;
    }

    .search-input:focus {
      border-color: #0050e5;
      box-shadow: 0 0 0 2px rgba(0,80,229,0.12);
    }

    .clear-btn {
      position: absolute;
      right: 60px;
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
    }

    .logs-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    }

    .table-responsive {
      overflow-x: auto;
    }

    .table-clean {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      text-align: left;
    }

    .table-clean th {
      background: #f8fafc;
      padding: 12px 16px;
      color: #475569;
      font-weight: 700;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #e2e8f0;
    }

    .table-clean td {
      padding: 14px 16px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
    }

    .table-clean tr:hover td {
      background: #f8fafc;
    }

    .badge-status {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 11.5px;
      font-weight: 700;
    }

    .badge-status .status-indicator {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }

    .badge-queued { background: #eff6ff; color: #0050e5; }
    .badge-queued .status-indicator { background: #0050e5; }

    .badge-sent { background: #ecfdf5; color: #059669; }
    .badge-sent .status-indicator { background: #059669; }

    .badge-failed { background: #fef2f2; color: #dc2626; }
    .badge-failed .status-indicator { background: #dc2626; }

    .badge-processing { background: #fffbeb; color: #d97706; }
    .badge-processing .status-indicator { background: #d97706; }

    .error-hint {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: #dc2626;
      font-size: 11px;
      margin-top: 4px;
      cursor: help;
    }

    .error-hint span.material-symbols-outlined {
      font-size: 13px;
    }

    .recipient-cell {
      display: flex;
      flex-direction: column;
      position: relative;
    }

    .recipient-phone {
      font-family: monospace;
      font-size: 13.5px;
      color: #0f172a;
    }

    .recipient-name {
      font-size: 12px;
      color: #64748b;
    }

    .btn-copy-inline {
      position: absolute;
      right: 0;
      top: 0;
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      padding: 2px;
    }

    .btn-copy-inline:hover {
      color: #0050e5;
    }

    .message-cell {
      max-width: 440px;
    }

    .sms-preview-text {
      margin: 0 0 6px;
      color: #1e293b;
      font-size: 12.5px;
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .sms-meta-pills {
      display: flex;
      gap: 6px;
      align-items: center;
    }

    .sms-segment-pill {
      font-size: 11px;
      background: #f1f5f9;
      color: #475569;
      padding: 2px 7px;
      border-radius: 4px;
      font-weight: 600;
    }

    .event-pill {
      font-size: 11px;
      background: #eff6ff;
      color: #0050e5;
      padding: 2px 7px;
      border-radius: 4px;
      font-weight: 600;
    }

    .category-meta {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .badge-category {
      font-size: 11.5px;
      font-weight: 600;
      color: #334155;
    }

    .badge-priority {
      font-size: 11px;
      font-weight: 700;
      display: inline-block;
    }

    .priority-high, .priority-urgent { color: #dc2626; }
    .priority-normal { color: #64748b; }
    .priority-low { color: #94a3b8; }

    .timeline-meta {
      display: flex;
      flex-direction: column;
      font-size: 11.5px;
      color: #64748b;
    }

    .row-actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 4px;
    }

    .btn-icon {
      background: transparent;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      width: 32px;
      height: 32px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: #64748b;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-icon:hover {
      background: #f8fafc;
      color: #0050e5;
      border-color: #cbd5e1;
    }

    .btn-retry:hover { color: #d97706; }
    .btn-delete:hover { color: #dc2626; }

    .btn-icon span { font-size: 16px; }

    .empty-state {
      padding: 48px 24px;
      text-align: center;
    }

    .empty-icon-wrap {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: #f1f5f9;
      color: #64748b;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
    }

    .empty-icon-wrap span { font-size: 32px; }

    .empty-state h4 {
      margin: 0 0 6px;
      font-size: 16px;
      color: #0f172a;
    }

    .empty-state p {
      margin: 0 0 16px;
      font-size: 13px;
      color: #64748b;
    }

    .loading-state {
      padding: 48px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      color: #64748b;
      font-size: 13px;
    }

    .spinner {
      width: 28px;
      height: 28px;
      border: 3px solid #e2e8f0;
      border-top-color: #0050e5;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .pagination-footer {
      padding: 12px 16px;
      border-top: 1px solid #f1f5f9;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12.5px;
      color: #64748b;
    }

    .page-controls {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn-page {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }

    .btn-page:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    /* Modals */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.45);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1050;
      padding: 20px;
    }

    .modal-dialog {
      background: #ffffff;
      border-radius: 16px;
      width: 100%;
      max-width: 600px;
      box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);
      overflow: hidden;
      animation: popIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes popIn {
      from { opacity: 0; transform: scale(0.96); }
      to { opacity: 1; transform: scale(1); }
    }

    .modal-header {
      padding: 20px 24px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .modal-title-wrap {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .modal-icon {
      font-size: 24px;
      color: #0050e5;
    }

    .modal-header h3 {
      margin: 0;
      font-size: 17px;
      font-weight: 700;
      color: #0f172a;
    }

    .modal-subtitle {
      font-size: 11.5px;
      color: #64748b;
      font-family: monospace;
    }

    .btn-close {
      background: transparent;
      border: none;
      font-size: 22px;
      color: #94a3b8;
      cursor: pointer;
      padding: 4px;
    }

    .modal-body {
      padding: 24px;
      max-height: 70vh;
      overflow-y: auto;
    }

    .detail-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-bottom: 20px;
    }

    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .detail-item .label {
      font-size: 11.5px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
    }

    .detail-item .value {
      font-size: 13.5px;
      font-weight: 600;
      color: #0f172a;
    }

    .font-mono { font-family: monospace; }

    .error-banner {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      padding: 12px;
      display: flex;
      gap: 10px;
      color: #dc2626;
      font-size: 12.5px;
      margin-bottom: 20px;
    }

    .message-preview-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 16px;
    }

    .box-label {
      display: block;
      font-size: 11.5px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      margin-bottom: 8px;
    }

    .sms-body-display {
      margin: 0;
      white-space: pre-wrap;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13.5px;
      line-height: 1.5;
      color: #0f172a;
    }

    .form-group {
      margin-bottom: 16px;
    }

    .form-group label {
      display: block;
      font-size: 12.5px;
      font-weight: 600;
      color: #334155;
      margin-bottom: 6px;
    }

    .form-input {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 13px;
      box-sizing: border-box;
      outline: none;
    }

    .form-input:focus {
      border-color: #0050e5;
      box-shadow: 0 0 0 2px rgba(0,80,229,0.12);
    }

    .char-count {
      font-size: 11px;
      color: #64748b;
      text-align: right;
      margin-top: 4px;
    }

    .test-feedback {
      padding: 10px 12px;
      border-radius: 8px;
      font-size: 12.5px;
      font-weight: 600;
      margin-top: 12px;
    }

    .test-feedback.success { background: #ecfdf5; color: #059669; }
    .test-feedback.error { background: #fef2f2; color: #dc2626; }

    .modal-footer {
      padding: 16px 24px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }

    .btn {
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border: none;
      transition: all 0.15s ease;
    }

    .btn-sm {
      padding: 6px 12px;
      font-size: 12px;
    }

    .btn-primary {
      background: #0050e5;
      color: #ffffff;
    }

    .btn-primary:hover {
      background: #003ebd;
    }

    .btn-primary:disabled {
      background: #94a3b8;
      cursor: not-allowed;
    }

    .btn-outline {
      background: transparent;
      border: 1px solid #cbd5e1;
      color: #334155;
    }

    .btn-outline:hover {
      background: #f8fafc;
      border-color: #94a3b8;
    }
  `]
})
export class MxSmsComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private toast = inject(ToastService);

  logs: SmsLogItem[] = [];
  stats: SmsQueueStats = {
    totalSms: 0,
    queuedCount: 0,
    sentCount: 0,
    failedCount: 0,
    processingCount: 0
  };

  isLoading = false;
  selectedStatus = 'All';
  searchQuery = '';
  page = 1;
  pageSize = 25;
  totalCount = 0;
  totalPages = 1;

  selectedSms: SmsLogItem | null = null;
  showTestModal = false;
  testPhone = '';
  testMessage = '';
  isSendingTest = false;
  testFeedback: string | null = null;
  testSuccess = false;

  Math = Math;
  private refreshInterval: any;

  headerButtons: PageHeaderButton[] = [
    {
      text: 'Send Test SMS',
      icon: 'send_to_mobile',
      isPrimary: true,
      action: () => this.openTestModal()
    },
    {
      text: 'Refresh',
      icon: 'refresh',
      isPrimary: false,
      action: () => this.loadLogs()
    }
  ];

  ngOnInit(): void {
    this.loadLogs();
    // Auto-refresh every 30 seconds for live telemetry
    this.refreshInterval = setInterval(() => {
      this.loadLogs(true);
    }, 30000);
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  loadLogs(silent = false): void {
    if (!silent) this.isLoading = true;

    const params = new URLSearchParams();
    if (this.selectedStatus !== 'All') params.set('status', this.selectedStatus);
    if (this.searchQuery.trim()) params.set('search', this.searchQuery.trim());
    params.set('page', this.page.toString());
    params.set('pageSize', this.pageSize.toString());

    this.api.get<any>(`MxSmsApi/logs?${params.toString()}`).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        if (res && res.data) {
          this.logs = res.data.items || [];
          this.totalCount = res.data.totalCount || 0;
          this.totalPages = res.data.totalPages || 1;
          if (res.data.stats) {
            this.stats = res.data.stats;
          }
        }
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  filterByStatus(status: string): void {
    this.selectedStatus = status;
    this.page = 1;
    this.loadLogs();
  }

  clearFilters(): void {
    this.selectedStatus = 'All';
    this.searchQuery = '';
    this.page = 1;
    this.loadLogs();
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages) return;
    this.page = p;
    this.loadLogs();
  }

  viewDetails(item: SmsLogItem): void {
    this.api.get<any>(`MxSmsApi/logs/${item.id}`).subscribe({
      next: (res: any) => {
        if (res && res.data) {
          this.selectedSms = res.data;
        } else {
          this.selectedSms = item;
        }
      },
      error: () => {
        this.selectedSms = item;
      }
    });
  }

  retrySms(item: SmsLogItem): void {
    this.api.post<any>(`MxSmsApi/logs/${item.id}/retry`, {}).subscribe({
      next: () => {
        item.status = 'Queued';
        item.lastError = undefined;
        this.toast.success('SMS re-queued for delivery.');
        this.loadLogs(true);
        if (this.selectedSms && this.selectedSms.id === item.id) {
          this.selectedSms.status = 'Queued';
          this.selectedSms.lastError = undefined;
        }
      },
      error: (err: any) => {
        this.toast.error(err.error?.message || 'Failed to retry SMS.');
      }
    });
  }

  deleteSms(item: SmsLogItem): void {
    if (!confirm(`Are you sure you want to delete SMS log to ${item.recipientPhone}?`)) return;

    this.api.delete<any>(`MxSmsApi/logs/${item.id}`).subscribe({
      next: () => {
        this.logs = this.logs.filter(l => l.id !== item.id);
        this.totalCount = Math.max(0, this.totalCount - 1);
        this.toast.success('SMS log deleted.');
        this.loadLogs(true);
        if (this.selectedSms && this.selectedSms.id === item.id) {
          this.selectedSms = null;
        }
      },
      error: (err: any) => {
        this.toast.error(err.error?.message || 'Failed to delete SMS log.');
      }
    });
  }

  openTestModal(): void {
    this.showTestModal = true;
    this.testFeedback = null;
    this.testPhone = '';
    this.testMessage = 'Test SMS dispatch from Ozikol Business Command Center.';
  }

  sendTestSms(): void {
    if (!this.testPhone.trim()) return;

    this.isSendingTest = true;
    this.testFeedback = null;

    this.api.post<any>('MxSmsApi/send-test', {
      recipientPhone: this.testPhone.trim(),
      message: this.testMessage.trim() || undefined
    }).subscribe({
      next: (res: any) => {
        this.isSendingTest = false;
        this.testSuccess = true;
        this.testFeedback = res.message || 'Diagnostic test SMS enqueued successfully!';
        this.toast.success('Test SMS enqueued.');
        this.loadLogs(true);
        setTimeout(() => {
          this.showTestModal = false;
        }, 1500);
      },
      error: (err: any) => {
        this.isSendingTest = false;
        this.testSuccess = false;
        this.testFeedback = err.error?.message || 'Failed to dispatch test SMS.';
      }
    });
  }

  copyText(text: string): void {
    navigator.clipboard.writeText(text);
    this.toast.success('Copied to clipboard');
  }
}
