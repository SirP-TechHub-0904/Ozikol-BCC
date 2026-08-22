import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { PageHeaderComponent, PageHeaderButton } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-product-queues',
  standalone: true,
  imports: [CommonModule, RouterModule, PageHeaderComponent],
  template: `
    <div class="queues-page">
      <app-page-header
        eyebrow="COMMERCE STUDIO"
        icon="sync_alt"
        title="Background Queue & Dispatch Monitor"
        subtitle="Real-time operational status of asynchronous worker pools: EmailQueue, SmsQueue, and Scheduled JobQueue."
        [buttons]="headerButtons"
      ></app-page-header>

      <div *ngIf="isLoading" class="loading-state">
        <div class="spinner"></div>
        <span>Polling queue metrics...</span>
      </div>

      <div *ngIf="!isLoading" class="queues-container">
        <!-- 3 Master Metric Cards -->
        <div class="metric-grid">
          <!-- 1. EmailQueue Card -->
          <div class="queue-card">
            <div class="queue-header">
              <span class="material-symbols-outlined icon-blue">mail</span>
              <div>
                <h3>Email Queue</h3>
                <p>Postmark Marketing & Transactional</p>
              </div>
            </div>
            <div class="queue-stats">
              <div class="stat-box">
                <span class="stat-val text-amber">{{ summary.emailQueue?.pending || 0 }}</span>
                <span class="stat-lbl">Pending / Queued</span>
              </div>
              <div class="stat-box">
                <span class="stat-val text-green">{{ summary.emailQueue?.completed || 0 }}</span>
                <span class="stat-lbl">Dispatched</span>
              </div>
              <div class="stat-box">
                <span class="stat-val text-red">{{ summary.emailQueue?.failed || 0 }}</span>
                <span class="stat-lbl">Failed</span>
              </div>
            </div>
          </div>

          <!-- 2. SmsQueue Card -->
          <div class="queue-card">
            <div class="queue-header">
              <span class="material-symbols-outlined icon-purple">sms</span>
              <div>
                <h3>SMS Queue</h3>
                <p>Twilio / Termii Gateway</p>
              </div>
            </div>
            <div class="queue-stats">
              <div class="stat-box">
                <span class="stat-val text-amber">{{ summary.smsQueue?.pending || 0 }}</span>
                <span class="stat-lbl">Pending / Queued</span>
              </div>
              <div class="stat-box">
                <span class="stat-val text-green">{{ summary.smsQueue?.completed || 0 }}</span>
                <span class="stat-lbl">Dispatched</span>
              </div>
              <div class="stat-box">
                <span class="stat-val text-red">{{ summary.smsQueue?.failed || 0 }}</span>
                <span class="stat-lbl">Failed</span>
              </div>
            </div>
          </div>

          <!-- 3. Scheduled JobQueue Card -->
          <div class="queue-card">
            <div class="queue-header">
              <span class="material-symbols-outlined icon-indigo">schedule</span>
              <div>
                <h3>Scheduled Job Queue</h3>
                <p>Automated Releases & Tasks</p>
              </div>
            </div>
            <div class="queue-stats">
              <div class="stat-box">
                <span class="stat-val text-amber">{{ summary.jobQueue?.pending || 0 }}</span>
                <span class="stat-lbl">Pending Execution</span>
              </div>
              <div class="stat-box">
                <span class="stat-val text-green">{{ summary.jobQueue?.completed || 0 }}</span>
                <span class="stat-lbl">Executed</span>
              </div>
              <div class="stat-box">
                <span class="stat-val text-red">{{ summary.jobQueue?.failed || 0 }}</span>
                <span class="stat-lbl">Failed</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Queue Activity Tables -->
        <div class="tables-grid">
          <!-- Recent Email Queue Activity -->
          <div class="section-card">
            <h3 class="section-title">
              <span class="material-symbols-outlined icon-blue">outgoing_mail</span>
              <span>Recent EmailQueue Dispatches</span>
            </h3>
            <table class="data-table">
              <thead>
                <tr>
                  <th>Recipient</th>
                  <th>Subject</th>
                  <th style="text-align:center;">Status</th>
                  <th>Scheduled / Sent</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of summary.emailQueue?.recent">
                  <td>
                    <strong>{{ item.recipientName || 'Member' }}</strong>
                    <div class="email-sub">{{ item.recipientEmail }}</div>
                  </td>
                  <td>{{ item.subject }}</td>
                  <td style="text-align:center;">
                    <span class="status-pill" [class.success]="item.statusName === 'Sent'" [class.queued]="item.statusName === 'Queued'">
                      {{ item.statusName }}
                    </span>
                  </td>
                  <td class="date-cell">{{ (item.sentAt || item.scheduledAt || item.createdAt) | date:'short' }}</td>
                </tr>
                <tr *ngIf="!summary.emailQueue?.recent?.length">
                  <td colspan="4" class="empty-cell">No recent email queue items.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Recent Scheduled JobQueue Activity -->
          <div class="section-card">
            <h3 class="section-title">
              <span class="material-symbols-outlined icon-indigo">task</span>
              <span>Recent Scheduled JobQueue Activity</span>
            </h3>
            <table class="data-table">
              <thead>
                <tr>
                  <th>Action Type</th>
                  <th>Source Entity</th>
                  <th style="text-align:center;">Status</th>
                  <th>Scheduled For</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let job of summary.jobQueue?.recent">
                  <td>
                    <strong>{{ job.actionType }}</strong>
                  </td>
                  <td><span class="source-pill">{{ job.sourceModel }} #{{ job.sourceId?.substring(0,8) }}</span></td>
                  <td style="text-align:center;">
                    <span class="status-pill" [class.success]="job.statusName === 'Sent'" [class.queued]="job.statusName === 'Queued'">
                      {{ job.statusName }}
                    </span>
                  </td>
                  <td class="date-cell">{{ job.scheduledAt | date:'short' }}</td>
                </tr>
                <tr *ngIf="!summary.jobQueue?.recent?.length">
                  <td colspan="4" class="empty-cell">No recent scheduled jobs.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .queues-page { display: flex; flex-direction: column; gap: 20px; width: 100%; }
    .queues-container { display: flex; flex-direction: column; gap: 24px; }

    .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; }
    .queue-card {
      background: #ffffff; padding: 20px; border-radius: 10px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 16px;
    }
    .queue-header { display: flex; align-items: center; gap: 12px; }
    .queue-header span { font-size: 32px; }
    .queue-header h3 { margin: 0; font-size: 16px; font-weight: 700; color: #0f172a; }
    .queue-header p { margin: 2px 0 0; font-size: 12px; color: #64748b; }

    .icon-blue { color: #0050e5; }
    .icon-purple { color: #8b5cf6; }
    .icon-indigo { color: #6366f1; }

    .queue-stats { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; background: #f8fafc; padding: 12px; border-radius: 8px; }
    .stat-box { text-align: center; }
    .stat-val { display: block; font-size: 20px; font-weight: 700; }
    .stat-lbl { font-size: 11px; color: #64748b; }
    .text-amber { color: #d97706; }
    .text-green { color: #16a34a; }
    .text-red { color: #dc2626; }

    .tables-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    @media (max-width: 960px) { .tables-grid { grid-template-columns: 1fr; } }

    .section-card { background: #ffffff; border-radius: 10px; border: 1px solid #e2e8f0; overflow: hidden; }
    .section-title {
      display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; color: #0f172a;
      margin: 0; padding: 14px 16px; background: #f8fafc; border-bottom: 1px solid #e2e8f0;
    }

    .data-table { width: 100%; border-collapse: collapse; text-align: left; }
    .data-table th { background: #f8fafc; padding: 10px 14px; font-size: 11px; font-weight: 600; color: #475569; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }
    .data-table td { padding: 12px 14px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #1e293b; vertical-align: middle; }
    .email-sub { font-size: 11px; color: #64748b; }
    .source-pill { font-size: 11px; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace; }

    .status-pill { padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; background: #f1f5f9; color: #475569; }
    .status-pill.success { background: #ecfdf5; color: #047857; }
    .status-pill.queued { background: #fffbeb; color: #b45309; }

    .date-cell { font-size: 11px; color: #64748b; }
    .empty-cell { text-align: center; padding: 24px; color: #94a3b8; font-size: 12px; }

    .loading-state { text-align: center; padding: 48px; color: #64748b; }
    .spinner { width: 32px; height: 32px; border: 3px solid #e2e8f0; border-top-color: #0050e5; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 12px; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class ProductQueuesComponent implements OnInit {
  summary: any = {};
  isLoading = true;

  headerButtons: PageHeaderButton[] = [
    {
      text: 'Broadcast Studio',
      icon: 'campaign',
      routerLink: '/products/console/marketing'
    },
    {
      text: 'Back to Products',
      icon: 'arrow_back',
      routerLink: '/products/console'
    }
  ];

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadSummary();
  }

  loadSummary(): void {
    this.isLoading = true;
    this.api.get<any>('ProductsApi/queues/summary').subscribe({
      next: (res) => {
        this.isLoading = false;
        this.summary = res?.data || {};
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }
}
