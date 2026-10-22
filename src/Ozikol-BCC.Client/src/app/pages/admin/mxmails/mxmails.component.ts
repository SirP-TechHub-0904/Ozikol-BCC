import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent, PageHeaderButton } from '../../../shared/components/page-header/page-header.component';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

export interface EmailQueueItem {
  id: string;
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  retries: number;
  maxRetries: number;
  lastError?: string;
  scheduledAt?: string;
  sentAt?: string;
  createdAt: string;
  hasHtmlBody: boolean;
  hasPlainBody: boolean;
}

export interface EmailQueueStats {
  totalEmails: number;
  queuedCount: number;
  sentCount: number;
  failedCount: number;
  processingCount: number;
}

@Component({
  selector: 'app-mxmails',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent, TranslatePipe],
  template: `
    <div class="mxmails-container">
      <app-page-header
        eyebrow="TELEMETRY & DISPATCH POOL"
        icon="mark_email_read"
        title="MX Outbound Email Telemetry & Logs"
        subtitle="Real-time inspection of all transactional passcodes, activations, notifications, and customer emails with delivery verification, HTML previews, and instant retry."
        [buttons]="headerButtons"
        [loading]="isLoading"
      ></app-page-header>

      <!-- KPI Summary Cards -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-icon-wrap bg-blue-subtle">
            <span class="material-symbols-outlined text-blue">mail</span>
          </div>
          <div class="kpi-meta">
            <span class="kpi-label">Total Outbound Pool</span>
            <span class="kpi-value">{{ stats.totalEmails | number }}</span>
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
            All Logs ({{ stats.totalEmails }})
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
            placeholder="Search by recipient, subject, or email..." 
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
                <th>Subject & Category</th>
                <th style="width: 100px;">Priority</th>
                <th style="width: 170px;">Timeline</th>
                <th style="width: 140px; text-align: right;">Actions</th>
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
                    <strong class="recipient-email">{{ item.recipientEmail }}</strong>
                    <span class="recipient-name" *ngIf="item.recipientName">{{ item.recipientName }}</span>
                    <button type="button" class="btn-copy-inline" (click)="copyText(item.recipientEmail)" title="Copy email">
                      <span class="material-symbols-outlined">content_copy</span>
                    </button>
                  </div>
                </td>
                <td>
                  <div class="subject-cell">
                    <span class="subject-text">{{ item.subject }}</span>
                    <div class="badge-category-row">
                      <span class="badge-category">{{ item.category }}</span>
                      <span class="badge-retries" *ngIf="item.retries > 0">Retries: {{ item.retries }}/{{ item.maxRetries }}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <span class="badge-priority" [ngClass]="'priority-' + item.priority.toLowerCase()">
                    {{ item.priority }}
                  </span>
                </td>
                <td>
                  <div class="timeline-cell">
                    <div class="time-row" title="Created timestamp">
                      <span class="time-label">Created:</span>
                      <span class="time-val">{{ item.createdAt | date:'MMM d, HH:mm' }}</span>
                    </div>
                    <div class="time-row" *ngIf="item.sentAt" title="Dispatched timestamp">
                      <span class="time-label text-green">Sent:</span>
                      <span class="time-val">{{ item.sentAt | date:'MMM d, HH:mm' }}</span>
                    </div>
                  </div>
                </td>
                <td style="text-align: right;">
                  <div class="action-buttons">
                    <button 
                      type="button" 
                      class="btn-icon-action" 
                      (click)="inspectEmail(item.id)" 
                      title="Inspect HTML and Headers"
                    >
                      <span class="material-symbols-outlined">visibility</span>
                    </button>
                    <button 
                      type="button" 
                      class="btn-icon-action text-blue" 
                      (click)="retryEmail(item.id)" 
                      [disabled]="isRetrying === item.id"
                      title="Retry / Resend Email Immediately"
                    >
                      <span class="material-symbols-outlined" [class.spin-icon]="isRetrying === item.id">replay</span>
                    </button>
                    <button 
                      type="button" 
                      class="btn-icon-action text-red" 
                      (click)="deleteLog(item.id)" 
                      title="Delete Log"
                    >
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
            <span class="material-symbols-outlined">inbox</span>
          </div>
          <h3>No Email Queue Records Found</h3>
          <p>Outbound transactional emails (such as 6-digit OTPs, activations, invitations, and alerts) will appear here automatically.</p>
          <button type="button" class="btn btn-primary btn-sm" (click)="openTestEmailModal()">
            <span class="material-symbols-outlined">send</span>
            <span>Send Test Diagnostic Email</span>
          </button>
        </div>

        <!-- Loading State -->
        <div class="loading-state" *ngIf="isLoading">
          <div class="spinner"></div>
          <span>Loading outbound email queue telemetry...</span>
        </div>

        <!-- Pagination Bar -->
        <div class="pagination-footer" *ngIf="totalPages > 1">
          <span class="pagination-info">Page {{ page }} of {{ totalPages }} ({{ totalCount }} items)</span>
          <div class="pagination-buttons">
            <button class="btn btn-outline btn-xs" [disabled]="page <= 1" (click)="goToPage(page - 1)">
              Previous
            </button>
            <button class="btn btn-outline btn-xs" [disabled]="page >= totalPages" (click)="goToPage(page + 1)">
              Next
            </button>
          </div>
        </div>
      </div>

      <!-- ======================================================== -->
      <!-- MODAL 1: EMAIL INSPECTOR & HTML PREVIEW                  -->
      <!-- ======================================================== -->
      <div class="modal-backdrop" *ngIf="selectedEmailDetails" (click)="closeInspector()">
        <div class="modal-card email-inspector-modal" (click)="$event.stopPropagation()">
          <div class="inspector-header">
            <div class="inspector-header-meta">
              <span class="badge-status" [ngClass]="'badge-' + selectedEmailDetails.status.toLowerCase()">
                {{ selectedEmailDetails.status }}
              </span>
              <h3 class="inspector-subject">{{ selectedEmailDetails.subject }}</h3>
            </div>
            <button type="button" class="close-btn" (click)="closeInspector()">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <div class="inspector-meta-bar">
            <div class="meta-item">
              <span class="meta-label">To:</span>
              <strong class="meta-val">{{ selectedEmailDetails.recipientEmail }}</strong>
            </div>
            <div class="meta-item">
              <span class="meta-label">Category:</span>
              <span class="meta-val">{{ selectedEmailDetails.category }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Priority:</span>
              <span class="meta-val">{{ selectedEmailDetails.priority }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Created:</span>
              <span class="meta-val">{{ selectedEmailDetails.createdAt | date:'yyyy-MM-dd HH:mm:ss' }} UTC</span>
            </div>
            <div class="meta-item" *ngIf="selectedEmailDetails.sentAt">
              <span class="meta-label text-green">Delivered:</span>
              <span class="meta-val">{{ selectedEmailDetails.sentAt | date:'yyyy-MM-dd HH:mm:ss' }} UTC</span>
            </div>
          </div>

          <!-- Error Alert if Failed -->
          <div class="inspector-error-banner" *ngIf="selectedEmailDetails.lastError">
            <span class="material-symbols-outlined">error</span>
            <div>
              <strong>Delivery Error Diagnostic:</strong>
              <div>{{ selectedEmailDetails.lastError }}</div>
            </div>
          </div>

          <!-- Tabs: Rendered HTML vs Raw HTML -->
          <div class="inspector-tabs">
            <button 
              type="button" 
              class="tab-link" 
              [class.active]="inspectorTab === 'preview'" 
              (click)="inspectorTab = 'preview'"
            >
              <span class="material-symbols-outlined">preview</span>
              Rendered Email Preview
            </button>
            <button 
              type="button" 
              class="tab-link" 
              [class.active]="inspectorTab === 'raw'" 
              (click)="inspectorTab = 'raw'"
            >
              <span class="material-symbols-outlined">code</span>
              Raw HTML Source
            </button>
            <button 
              type="button" 
              class="tab-link" 
              [class.active]="inspectorTab === 'plain'" 
              (click)="inspectorTab = 'plain'" 
              *ngIf="selectedEmailDetails.plainBody"
            >
              <span class="material-symbols-outlined">notes</span>
              Plain Text
            </button>
          </div>

          <!-- Inspector Body Content -->
          <div class="inspector-body">
            <div *ngIf="inspectorTab === 'preview'" class="html-preview-sandbox" [innerHTML]="safeHtmlBody"></div>
            <pre *ngIf="inspectorTab === 'raw'" class="raw-code-box"><code>{{ selectedEmailDetails.htmlBody }}</code></pre>
            <pre *ngIf="inspectorTab === 'plain'" class="raw-code-box"><code>{{ selectedEmailDetails.plainBody }}</code></pre>
          </div>

          <div class="inspector-footer">
            <button type="button" class="btn btn-outline btn-sm" (click)="closeInspector()">Close</button>
            <button 
              type="button" 
              class="btn btn-primary btn-sm" 
              (click)="retryEmail(selectedEmailDetails.id)"
              [disabled]="isRetrying === selectedEmailDetails.id"
            >
              <span class="material-symbols-outlined">replay</span>
              <span>{{ isRetrying === selectedEmailDetails.id ? 'Sending...' : 'Retry / Resend Email' }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- ======================================================== -->
      <!-- MODAL 2: SEND LIVE DIAGNOSTIC TEST EMAIL                -->
      <!-- ======================================================== -->
      <div class="modal-backdrop" *ngIf="showTestEmailModal" (click)="showTestEmailModal = false">
        <div class="modal-card test-email-modal" (click)="$event.stopPropagation()">
          <div class="test-header">
            <div class="test-avatar">
              <span class="material-symbols-outlined">send</span>
            </div>
            <h3>Dispatch Live Diagnostic Test Email</h3>
            <p>Send an immediate test message through the configured Postmark email engine and record the output in the telemetry pool.</p>
          </div>

          <form (ngSubmit)="submitTestEmail()" class="test-form">
            <div class="form-group">
              <label>Destination Email Address *</label>
              <input 
                type="email" 
                [(ngModel)]="testRecipientEmail" 
                name="testEmail" 
                placeholder="e.g. name@company.com" 
                required 
                class="form-control"
              />
            </div>

            <div class="form-group">
              <label>Subject Line (Optional)</label>
              <input 
                type="text" 
                [(ngModel)]="testSubject" 
                name="testSubject" 
                placeholder="e.g. Ozikol BCC Outbound Deliverability Test" 
                class="form-control"
              />
            </div>

            <div class="form-group">
              <label>Friendly Recipient Name (Optional)</label>
              <input 
                type="text" 
                [(ngModel)]="testRecipientName" 
                name="testName" 
                placeholder="e.g. First Last" 
                class="form-control"
              />
            </div>

            <div class="modal-actions">
              <button type="button" class="btn btn-outline" (click)="showTestEmailModal = false">Cancel</button>
              <button type="submit" class="btn btn-primary" [disabled]="isSendingTest || !testRecipientEmail">
                <span *ngIf="isSendingTest" class="spinner"></span>
                <span *ngIf="!isSendingTest" class="material-symbols-outlined">send</span>
                <span>{{ isSendingTest ? 'Dispatching...' : 'Send Live Test' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .mxmails-container {
      padding: 24px;
      max-width: 1440px;
      margin: 0 auto;
    }

    /* KPI Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
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
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }
    .kpi-icon-wrap {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .bg-blue-subtle { background: #eff6ff; }
    .bg-green-subtle { background: #ecfdf5; }
    .bg-amber-subtle { background: #fffbeb; }
    .bg-red-subtle { background: #fef2f2; }
    .text-blue { color: #0050e5; }
    .text-green { color: #059669; }
    .text-amber { color: #d97706; }
    .text-red { color: #dc2626; }

    .kpi-meta {
      display: flex;
      flex-direction: column;
    }
    .kpi-label {
      font-size: 12.5px;
      font-weight: 600;
      color: #64748b;
      margin-bottom: 4px;
    }
    .kpi-value {
      font-size: 24px;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.1;
    }

    /* Toolbar */
    .toolbar-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 12px 18px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 18px;
    }
    .filter-tabs {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .tab-btn {
      background: transparent;
      border: none;
      padding: 8px 14px;
      font-size: 13px;
      font-weight: 600;
      color: #64748b;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s ease;
    }
    .tab-btn:hover {
      background: #f1f5f9;
      color: #0f172a;
    }
    .tab-btn.active {
      background: #eff6ff;
      color: #0050e5;
      font-weight: 700;
    }
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    .dot-blue { background: #0050e5; }
    .dot-green { background: #10b981; }
    .dot-red { background: #ef4444; }

    .search-box {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      padding: 4px 12px;
      min-width: 320px;
    }
    .search-icon {
      font-size: 18px;
      color: #94a3b8;
    }
    .search-input {
      border: none;
      background: transparent;
      outline: none;
      font-size: 13.5px;
      color: #0f172a;
      flex: 1;
      padding: 6px 0;
    }
    .clear-btn {
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      padding: 0;
      display: flex;
      align-items: center;
    }

    /* Logs Card */
    .logs-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }
    .table-responsive {
      overflow-x: auto;
    }
    .table-clean {
      width: 100%;
      border-collapse: collapse;
      font-size: 13.5px;
      text-align: left;
    }
    .table-clean th {
      background: #f8fafc;
      color: #475569;
      font-weight: 700;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 12px 18px;
      border-bottom: 1px solid #e2e8f0;
    }
    .table-clean td {
      padding: 14px 18px;
      border-bottom: 1px solid #f1f5f9;
      color: #1e293b;
      vertical-align: middle;
    }
    .table-clean tr:hover td {
      background: #f8fafc;
    }

    /* Status Badges */
    .badge-status {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 9999px;
      text-transform: capitalize;
    }
    .status-indicator {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }
    .badge-sent {
      background: #ecfdf5;
      color: #065f46;
    }
    .badge-sent .status-indicator { background: #10b981; }

    .badge-queued {
      background: #eff6ff;
      color: #1e40af;
    }
    .badge-queued .status-indicator { background: #3b82f6; }

    .badge-processing {
      background: #fffbeb;
      color: #92400e;
    }
    .badge-processing .status-indicator { background: #f59e0b; }

    .badge-failed {
      background: #fef2f2;
      color: #991b1b;
    }
    .badge-failed .status-indicator { background: #ef4444; }

    .error-hint {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      color: #dc2626;
      margin-top: 4px;
      cursor: help;
    }
    .error-hint span.material-symbols-outlined { font-size: 14px; }

    /* Recipient & Subject */
    .recipient-cell {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }
    .recipient-email {
      color: #0f172a;
      font-weight: 600;
    }
    .recipient-name {
      font-size: 12px;
      color: #64748b;
    }
    .btn-copy-inline {
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      padding: 2px;
      display: flex;
      align-items: center;
      transition: color 0.15s;
    }
    .btn-copy-inline:hover { color: #0050e5; }
    .btn-copy-inline span { font-size: 14px; }

    .subject-cell {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .subject-text {
      font-weight: 600;
      color: #1e293b;
    }
    .badge-category-row {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .badge-category {
      font-size: 11px;
      font-weight: 600;
      background: #f1f5f9;
      color: #475569;
      padding: 2px 8px;
      border-radius: 6px;
    }
    .badge-retries {
      font-size: 11px;
      color: #64748b;
    }

    /* Priority */
    .badge-priority {
      font-size: 11.5px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
    }
    .priority-urgent { background: #fee2e2; color: #991b1b; }
    .priority-high { background: #ffedd5; color: #9a3412; }
    .priority-normal { background: #f1f5f9; color: #475569; }
    .priority-low { background: #f8fafc; color: #94a3b8; }

    /* Timeline */
    .timeline-cell {
      display: flex;
      flex-direction: column;
      gap: 2px;
      font-size: 12px;
    }
    .time-row {
      display: flex;
      gap: 6px;
    }
    .time-label {
      color: #94a3b8;
      font-weight: 600;
    }
    .time-val {
      color: #334155;
      font-weight: 500;
    }

    /* Actions */
    .action-buttons {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 4px;
    }
    .btn-icon-action {
      background: transparent;
      border: 1px solid transparent;
      border-radius: 8px;
      padding: 6px;
      color: #64748b;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
    }
    .btn-icon-action:hover {
      background: #f1f5f9;
      border-color: #e2e8f0;
      color: #0f172a;
    }
    .btn-icon-action.text-blue:hover {
      background: #eff6ff;
      border-color: #bfdbfe;
      color: #0050e5;
    }
    .btn-icon-action.text-red:hover {
      background: #fef2f2;
      border-color: #fecaca;
      color: #dc2626;
    }
    .btn-icon-action span { font-size: 18px; }
    .spin-icon {
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      100% { transform: rotate(360deg); }
    }

    /* Empty & Loading */
    .empty-state {
      padding: 48px 24px;
      text-align: center;
      color: #64748b;
    }
    .empty-icon-wrap {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: #f1f5f9;
      color: #94a3b8;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
    }
    .empty-icon-wrap span { font-size: 32px; }
    .empty-state h3 {
      font-size: 17px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 6px;
    }
    .empty-state p {
      font-size: 13.5px;
      max-width: 440px;
      margin: 0 auto 20px;
      line-height: 1.5;
    }

    .loading-state {
      padding: 48px 24px;
      text-align: center;
      color: #64748b;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 14px;
    }
    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid #e2e8f0;
      border-top-color: #0050e5;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    /* Pagination */
    .pagination-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 18px;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      font-size: 12.5px;
      color: #64748b;
    }
    .pagination-buttons {
      display: flex;
      gap: 8px;
    }

    /* Modals */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .modal-card {
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      border: 1px solid #e2e8f0;
      width: 100%;
      box-sizing: border-box;
      animation: modalPop 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes modalPop {
      0% { transform: scale(0.95); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }

    .email-inspector-modal {
      max-width: 860px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
    }
    .inspector-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding: 20px 24px;
      border-bottom: 1px solid #f1f5f9;
    }
    .inspector-header-meta {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .inspector-subject {
      margin: 0;
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
    }
    .close-btn {
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      padding: 4px;
      display: flex;
      align-items: center;
      border-radius: 8px;
    }
    .close-btn:hover { background: #f1f5f9; color: #0f172a; }

    .inspector-meta-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      padding: 12px 24px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      font-size: 12.5px;
    }
    .meta-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .meta-label {
      color: #64748b;
      font-weight: 600;
    }
    .meta-val {
      color: #0f172a;
    }

    .inspector-error-banner {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      padding: 10px 16px;
      margin: 12px 24px 0;
      color: #991b1b;
      font-size: 13px;
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }
    .inspector-error-banner span.material-symbols-outlined { color: #dc2626; font-size: 18px; }

    .inspector-tabs {
      display: flex;
      border-bottom: 1px solid #e2e8f0;
      padding: 0 24px;
      gap: 16px;
      background: #ffffff;
    }
    .tab-link {
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      padding: 12px 6px;
      font-size: 13px;
      font-weight: 600;
      color: #64748b;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .tab-link:hover { color: #0f172a; }
    .tab-link.active {
      color: #0050e5;
      border-bottom-color: #0050e5;
      font-weight: 700;
    }
    .tab-link span { font-size: 16px; }

    .inspector-body {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
      background: #f8fafc;
    }
    .html-preview-sandbox {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.03);
    }
    .raw-code-box {
      margin: 0;
      background: #0f172a;
      color: #f8fafc;
      padding: 16px;
      border-radius: 10px;
      font-size: 12px;
      line-height: 1.5;
      white-space: pre-wrap;
      word-break: break-all;
    }

    .inspector-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      padding: 14px 24px;
      border-top: 1px solid #e2e8f0;
      background: #ffffff;
      border-radius: 0 0 16px 16px;
    }

    /* Test Email Modal */
    .test-email-modal {
      max-width: 500px;
      padding: 28px;
    }
    .test-header {
      text-align: center;
      margin-bottom: 20px;
    }
    .test-avatar {
      width: 52px;
      height: 52px;
      border-radius: 16px;
      background: #eff6ff;
      color: #0050e5;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 12px;
      box-shadow: 0 4px 12px rgba(0, 80, 229, 0.15);
    }
    .test-avatar span { font-size: 26px; }
    .test-header h3 {
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 6px;
    }
    .test-header p {
      font-size: 13px;
      color: #64748b;
      margin: 0;
      line-height: 1.5;
    }

    .test-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .form-group label {
      font-size: 12.5px;
      font-weight: 700;
      color: #334155;
    }
    .form-control {
      width: 100%;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      padding: 10px 14px;
      font-size: 13.5px;
      color: #0f172a;
      outline: none;
      box-sizing: border-box;
      transition: border-color 0.15s;
    }
    .form-control:focus {
      border-color: #0050e5;
      box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.1);
    }
    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 10px;
    }

    /* Common Button utilities */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font-weight: 600;
      font-size: 13.5px;
      border-radius: 10px;
      padding: 9px 16px;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.2s ease;
    }
    .btn-primary {
      background: #0050e5;
      color: #ffffff;
    }
    .btn-primary:hover:not(:disabled) {
      background: #003eb8;
    }
    .btn-outline {
      background: #ffffff;
      border-color: #cbd5e1;
      color: #334155;
    }
    .btn-outline:hover:not(:disabled) {
      background: #f8fafc;
      border-color: #94a3b8;
    }
    .btn-sm {
      padding: 7px 12px;
      font-size: 12.5px;
      border-radius: 8px;
    }
    .btn-xs {
      padding: 4px 8px;
      font-size: 11.5px;
      border-radius: 6px;
    }
    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `]
})
export class MxMailsComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private sanitizer = inject(DomSanitizer);

  isLoading = false;
  logs: EmailQueueItem[] = [];
  stats: EmailQueueStats = {
    totalEmails: 0,
    queuedCount: 0,
    sentCount: 0,
    failedCount: 0,
    processingCount: 0
  };

  searchQuery = '';
  selectedStatus = 'All';
  page = 1;
  pageSize = 25;
  totalCount = 0;
  totalPages = 1;

  isRetrying: string | null = null;
  selectedEmailDetails: any = null;
  safeHtmlBody: SafeHtml = '';
  inspectorTab: 'preview' | 'raw' | 'plain' = 'preview';

  showTestEmailModal = false;
  testRecipientEmail = '';
  testSubject = '';
  testRecipientName = '';
  isSendingTest = false;

  headerButtons: PageHeaderButton[] = [
    {
      text: 'Send Live Test Email',
      icon: 'send',
      isPrimary: true,
      action: () => this.openTestEmailModal()
    },
    {
      text: 'Refresh Telemetry',
      icon: 'refresh',
      isPrimary: false,
      action: () => this.loadLogs()
    }
  ];

  ngOnInit(): void {
    this.loadLogs();
  }

  ngOnDestroy(): void {}

  loadLogs(): void {
    this.isLoading = true;
    const params = new URLSearchParams();
    if (this.searchQuery.trim()) params.append('search', this.searchQuery.trim());
    if (this.selectedStatus && this.selectedStatus !== 'All') params.append('status', this.selectedStatus);
    params.append('page', this.page.toString());
    params.append('pageSize', this.pageSize.toString());

    this.api.get<any>(`MxMailsApi/logs?${params.toString()}`).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res?.data) {
          this.logs = res.data.items || [];
          this.totalCount = res.data.totalCount || 0;
          this.totalPages = res.data.totalPages || 1;
          if (res.data.stats) {
            this.stats = res.data.stats;
          }
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.toast.error(err?.error?.message || 'Failed to fetch email logs telemetry.');
      }
    });
  }

  filterByStatus(status: string): void {
    this.selectedStatus = status;
    this.page = 1;
    this.loadLogs();
  }

  goToPage(newPage: number): void {
    if (newPage >= 1 && newPage <= this.totalPages) {
      this.page = newPage;
      this.loadLogs();
    }
  }

  inspectEmail(id: string): void {
    this.api.get<any>(`MxMailsApi/logs/${id}`).subscribe({
      next: (res) => {
        if (res?.data) {
          this.selectedEmailDetails = res.data;
          this.safeHtmlBody = this.sanitizer.bypassSecurityTrustHtml(res.data.htmlBody || '<p>No HTML body recorded.</p>');
          this.inspectorTab = 'preview';
        }
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'Failed to load email details.');
      }
    });
  }

  closeInspector(): void {
    this.selectedEmailDetails = null;
    this.safeHtmlBody = '';
  }

  retryEmail(id: string): void {
    this.isRetrying = id;
    this.api.post<any>(`MxMailsApi/logs/${id}/retry`, {}).subscribe({
      next: (res) => {
        this.isRetrying = null;
        this.toast.success(res?.message || 'Email dispatched successfully.');
        this.loadLogs();
        if (this.selectedEmailDetails && this.selectedEmailDetails.id === id) {
          this.inspectEmail(id);
        }
      },
      error: (err) => {
        this.isRetrying = null;
        this.toast.error(err?.error?.message || 'Failed to resend email.');
      }
    });
  }

  deleteLog(id: string): void {
    if (!confirm('Are you sure you want to permanently delete this email queue log record?')) {
      return;
    }
    this.api.delete<any>(`MxMailsApi/logs/${id}`).subscribe({
      next: () => {
        this.toast.success('Email log removed.');
        this.loadLogs();
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'Failed to delete email record.');
      }
    });
  }

  openTestEmailModal(): void {
    this.testRecipientEmail = '';
    this.testSubject = 'Ozikol BCC Outbound Deliverability Test';
    this.testRecipientName = '';
    this.showTestEmailModal = true;
  }

  submitTestEmail(): void {
    if (!this.testRecipientEmail.trim()) {
      this.toast.warning('Please enter a recipient email.');
      return;
    }

    this.isSendingTest = true;
    this.api.post<any>('MxMailsApi/send-test', {
      recipientEmail: this.testRecipientEmail.trim(),
      subject: this.testSubject.trim(),
      recipientName: this.testRecipientName.trim()
    }).subscribe({
      next: (res) => {
        this.isSendingTest = false;
        this.showTestEmailModal = false;
        this.toast.success(res?.message || 'Test email dispatched successfully!');
        this.loadLogs();
      },
      error: (err) => {
        this.isSendingTest = false;
        this.toast.error(err?.error?.message || 'Test email failed to send.');
      }
    });
  }

  copyText(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.toast.success(`Copied: ${text}`);
    });
  }
}
