import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { PageHeaderComponent, PageHeaderButton } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-identity-audit-logs',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent],
  template: `
    <div class="identity-page">
      <app-page-header
        eyebrow="GOVERNANCE AUDITING"
        icon="history"
        title="Security Login Audit Stream"
        subtitle="Review account authentication events, suspicious logins, MFA challenge retries, and active session revocations."
        [buttons]="headerButtons"
        [loading]="isLoading"
      ></app-page-header>

      <!-- Logs Card Container -->
      <section class="console-widget">
        <div class="widget-head">
          <div class="widget-title-wrap">
            <span class="material-symbols-outlined text-purple">policy</span>
            <h2 class="widget-title">Authentication Events Stream (Latest 250 records)</h2>
          </div>
        </div>
        <div class="widget-body" style="padding:0;">
          <div *ngIf="logs.length === 0 && !isLoading" class="empty-state">
            <span class="material-symbols-outlined">gpp_good</span>
            <p>No login audit events recorded in the system.</p>
          </div>

          <div class="table-responsive" *ngIf="logs.length > 0">
            <table class="table-clean">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Account Email</th>
                  <th>Security Event Status</th>
                  <th>Client IP Address</th>
                  <th>User Agent Header</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let log of logs">
                  <td>{{ log.timestamp | date:'medium' }}</td>
                  <td><strong>{{ log.email }}</strong></td>
                  <td>
                    <span class="status-pill" [class]="getEventClass(log.status)">
                      {{ log.status }}
                    </span>
                  </td>
                  <td><code>{{ log.ipAddress || 'Unknown' }}</code></td>
                  <td class="ua-cell" [title]="log.userAgent">{{ log.userAgent || 'Unknown' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .console-widget {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.02);
    }
    .widget-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    .widget-title-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .widget-title {
      font-size: 14px;
      font-weight: 800;
      margin: 0;
      color: #0f172a;
    }
    .empty-state {
      padding: 40px;
      text-align: center;
      color: #64748b;
    }
    .empty-state span {
      font-size: 40px;
      margin-bottom: 12px;
    }
    .table-clean {
      width: 100%;
      border-collapse: collapse;
    }
    .table-clean th {
      text-align: left;
      font-size: 11px;
      text-transform: uppercase;
      color: #64748b;
      font-weight: 700;
      padding: 10px 12px;
      border-bottom: 2px solid #e2e8f0;
    }
    .table-clean td {
      padding: 12px;
      font-size: 13px;
      border-bottom: 1px solid #e2e8f0;
      color: #1e293b;
    }
    .table-clean tr:hover td {
      background: #f8fafc;
    }
    .status-pill {
      font-size: 11px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 4px;
      display: inline-block;
    }
    .status-pill.success { background: rgba(34,197,94,0.12); color: #16a34a; }
    .status-pill.pending { background: rgba(245,158,11,0.12); color: #d97706; }
    .status-pill.failure { background: rgba(239,68,68,0.12); color: #ef4444; }
    .status-pill.info { background: rgba(59,130,246,0.12); color: #0050e5; }

    .table-responsive {
      width: 100%;
      overflow-x: auto;
    }
    .ua-cell {
      max-width: 250px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: var(--md-sys-color-on-surface-variant, #94a3b8);
    }
  `]
})
export class IdentityAuditLogsComponent implements OnInit {
  isLoading = false;
  logs: any[] = [];
  isSuperAdmin = false;

  headerButtons: PageHeaderButton[] = [
    {
      text: 'Refresh Logs',
      icon: 'refresh',
      action: () => { this.loadLogs(); }
    }
  ];

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.checkCurrentUserRole();
    this.loadLogs();
  }

  /**
   * Evaluates the authenticated user identity to determine if SuperAdmin access is permitted.
   */
  private checkCurrentUserRole(): void {
    const userStr = localStorage.getItem('auth_user') || localStorage.getItem('user');
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        const roles: string[] = Array.isArray(u.roles) ? u.roles : (u.role ? [u.role] : []);
        this.isSuperAdmin = roles.some(r => typeof r === 'string' && r.toLowerCase() === 'superadmin');
      } catch {}
    }
  }

  loadLogs(): void {
    this.isLoading = true;
    this.api.get<any>('IdentityApi/login-audit').subscribe({
      next: (res) => {
        this.isLoading = false;
        const allLogs = res?.data || [];
        // Defense-in-depth: If logged in user is not a SuperAdmin, strictly filter out SuperAdmin audit logs
        if (!this.isSuperAdmin) {
          this.logs = allLogs.filter((log: any) => {
            const email = (log.email || '').toLowerCase();
            return !email.includes('superadmin');
          });
        } else {
          this.logs = allLogs;
        }
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  getEventClass(status: string): string {
    if (!status) return 'info';
    const s = status.toLowerCase();
    if (s.includes('success')) return 'success';
    if (s.includes('fail') || s.includes('lock') || s.includes('incorrect') || s.includes('expired')) return 'failure';
    if (s.includes('pending') || s.includes('challenge')) return 'pending';
    return 'info';
  }
}
