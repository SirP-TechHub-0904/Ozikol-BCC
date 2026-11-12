import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { PageHeaderComponent, PageHeaderButton } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, PageHeaderComponent],
  template: `
    <div class="console-dashboard-container">
      <!-- Universal Responsive Page Header -->
      <app-page-header
        title="Console Dashboard"
        subtitle="Multi-tenant workspace command center, membership telemetry, and dynamic CMS studio."
        icon="space_dashboard"
        [buttons]="headerButtons"
        [loading]="loading">
      </app-page-header>

      <!-- Main Widget Grid (12-column system) -->
      <div class="console-grid">
        <!-- 6-Metric Strip (Span 12) -->
        <section class="console-widget span-12">
          <div class="widget-head">
            <div class="widget-title-wrap">
              <span class="material-symbols-outlined drag-dot">drag_indicator</span>
              <h2 class="widget-title">Core Performance & Health Counters</h2>
            </div>
            <div class="widget-actions">
              <span class="status-pill good"><span class="material-symbols-outlined" style="font-size:14px;">check_circle</span> All Services Operational</span>
            </div>
          </div>
          <div class="widget-body">
            <div class="metric-grid">
              <div class="metric-card" routerLink="/admin/users">
                <div class="metric-label">Total Members</div>
                <div class="metric-value">{{ metrics?.totalMembers || 0 }}</div>
                <div class="metric-note text-success">↗ +12% active directory</div>
              </div>

              <div class="metric-card" routerLink="/admin/groups">
                <div class="metric-label">Group Channels</div>
                <div class="metric-value">{{ metrics?.totalGroups || 0 }}</div>
                <div class="metric-note text-info">↗ Live real-time chat</div>
              </div>

              <div class="metric-card" routerLink="/admin/content">
                <div class="metric-label">Published Pages</div>
                <div class="metric-value">{{ metrics?.totalPublishedPages || 0 }}</div>
                <div class="metric-note text-success">✓ 100% DB dynamic</div>
              </div>

              <div class="metric-card" routerLink="/admin/content">
                <div class="metric-label">Hero Sliders</div>
                <div class="metric-value">{{ metrics?.totalSliders || 0 }}</div>
                <div class="metric-note text-warning">★ Visual carousel</div>
              </div>

              <div class="metric-card" routerLink="/admin/content">
                <div class="metric-label">Active FAQs</div>
                <div class="metric-value">{{ metrics?.totalFaqs || 0 }}</div>
                <div class="metric-note text-info">ℹ Knowledge items</div>
              </div>

              <div class="metric-card" routerLink="/admin/identity">
                <div class="metric-label">Platform Roles</div>
                <div class="metric-value">3</div>
                <div class="metric-note text-purple">🔒 RBAC Protected</div>
              </div>
            </div>
          </div>
        </section>

        <!-- Left Column: Recently Registered Members (Span 7) -->
        <section class="console-widget span-7">
          <div class="widget-head">
            <div class="widget-title-wrap">
              <span class="material-symbols-outlined drag-dot">drag_indicator</span>
              <h2 class="widget-title">Recently Registered Members</h2>
            </div>
            <a routerLink="/admin/users" class="info-link">View Directory &rarr;</a>
          </div>
          <div class="widget-body table-responsive" style="padding:0;">
            <table class="table-clean">
              <thead>
                <tr>
                  <th>Member Name</th>
                  <th>Email</th>
                  <th>Category</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let user of metrics?.recentUsers">
                  <td>
                    <div class="user-inline-cell">
                      <div class="user-inline-avatar">{{ (user.fullName || 'U')[0] }}</div>
                      <span class="user-inline-name">{{ user.fullName }}</span>
                    </div>
                  </td>
                  <td class="code-cell">{{ user.email }}</td>
                  <td><span class="status-pill info">{{ user.category || 'Member' }}</span></td>
                  <td><span class="status-pill good">Active</span></td>
                </tr>
                <tr *ngIf="!metrics?.recentUsers?.length">
                  <td colspan="4" class="empty-cell">No registered members yet.</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="widget-footer">
            <a routerLink="/admin/users">Manage all directory members</a>
          </div>
        </section>

        <!-- Right Column: Quick Action Shortcuts & CMS Tools (Span 5) -->
        <section class="console-widget span-5">
          <div class="widget-head">
            <div class="widget-title-wrap">
              <span class="material-symbols-outlined drag-dot">drag_indicator</span>
              <h2 class="widget-title">Quick Actions & Shortcuts</h2>
            </div>
          </div>
          <div class="widget-body">
            <div class="quick-actions-stack">
              <a routerLink="/admin/content" class="quick-action-row">
                <div class="action-icon-circle bg-blue">
                  <span class="material-symbols-outlined">add_circle</span>
                </div>
                <div class="action-info">
                  <div class="action-title">Create Dynamic Web Page</div>
                  <div class="action-desc">Add database-driven page to website navigation</div>
                </div>
                <span class="material-symbols-outlined arrow">chevron_right</span>
              </a>

              <a routerLink="/admin/users" class="quick-action-row">
                <div class="action-icon-circle bg-green">
                  <span class="material-symbols-outlined">person_add</span>
                </div>
                <div class="action-info">
                  <div class="action-title">Register New Member</div>
                  <div class="action-desc">Add profile and assign feature category</div>
                </div>
                <span class="material-symbols-outlined arrow">chevron_right</span>
              </a>

              <a routerLink="/admin/groups" class="quick-action-row">
                <div class="action-icon-circle bg-purple">
                  <span class="material-symbols-outlined">add_comment</span>
                </div>
                <div class="action-info">
                  <div class="action-title">Create Group Channel</div>
                  <div class="action-desc">Launch real-time team discussion space</div>
                </div>
                <span class="material-symbols-outlined arrow">chevron_right</span>
              </a>

              <a routerLink="/admin/settings" class="quick-action-row">
                <div class="action-icon-circle bg-amber">
                  <span class="material-symbols-outlined">palette</span>
                </div>
                <div class="action-info">
                  <div class="action-title">Brand & Theme Customizer</div>
                  <div class="action-desc">Update corporate colors, logo, and announcement</div>
                </div>
                <span class="material-symbols-outlined arrow">chevron_right</span>
              </a>
            </div>
          </div>
        </section>

        <!-- Bottom Audit Log Stream (Span 12) -->
        <section class="console-widget span-12">
          <div class="widget-head">
            <div class="widget-title-wrap">
              <span class="material-symbols-outlined drag-dot">drag_indicator</span>
              <h2 class="widget-title">Recent Activity & Audit Trail</h2>
            </div>
            <span class="status-pill muted">Telemetry Log</span>
          </div>
          <div class="widget-body table-responsive" style="padding:0;">
            <table class="table-clean">
              <thead>
                <tr>
                  <th>Action Type</th>
                  <th>Performed By</th>
                  <th>Details & Description</th>
                  <th>Date & Time</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let audit of metrics?.recentActivities">
                  <td>
                    <span class="status-pill" [ngClass]="getActionBadgeClass(audit.action)">
                      <span class="material-symbols-outlined action-mini-icon">{{ getActionIcon(audit.action) }}</span>
                      <span>{{ formatAction(audit.action) }}</span>
                    </span>
                  </td>
                  <td><strong>{{ audit.user }}</strong></td>
                  <td class="details-cell">{{ formatDetails(audit.details, audit.action) }}</td>
                  <td class="code-cell">{{ audit.timestamp | date:'short' }}</td>
                </tr>
                <tr *ngIf="!metrics?.recentActivities?.length">
                  <td colspan="4" class="empty-cell">No audit actions logged yet.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  `,
  styles: [`
    .console-dashboard-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .spinning { animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .table-responsive {
      width: 100%;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }
    .table-clean {
      width: 100%;
      min-width: 480px;
      border-collapse: collapse;
      font-size: 13px;
    }
    .table-clean th {
      text-align: left;
      padding: 10px 14px;
      color: var(--sidebar-header-color);
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      border-bottom: 1px solid var(--md-sys-color-outline);
    }
    .table-clean td {
      padding: 12px 14px;
      border-bottom: 1px solid var(--md-sys-color-outline);
      color: var(--sidebar-color);
    }
    .user-inline-cell {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .user-inline-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--sidebar-active-bg);
      color: var(--sidebar-active-color);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 13px;
    }
    .user-inline-name {
      font-weight: 600;
      color: var(--md-sys-color-on-surface);
    }
    .code-cell {
      font-family: monospace;
      font-size: 12px;
    }
    .empty-cell {
      text-align: center;
      padding: 30px;
      color: var(--sidebar-header-color);
    }

    .quick-actions-stack {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .quick-action-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      border: 1px solid var(--md-sys-color-outline);
      border-radius: 8px;
      text-decoration: none;
      color: inherit;
      transition: all 0.15s ease;
    }
    .quick-action-row:hover {
      border-color: var(--sidebar-active-color);
      background: var(--sidebar-active-bg);
      transform: translateX(4px);
    }
    .action-icon-circle {
      width: 38px;
      height: 38px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .action-icon-circle span { font-size: 20px; }
    .bg-blue { background: rgba(0, 80, 229, 0.12); color: #0050e5; }
    .bg-green { background: rgba(34, 197, 94, 0.12); color: #16a34a; }
    .bg-purple { background: rgba(168, 85, 247, 0.12); color: #9333ea; }
    .bg-amber { background: rgba(245, 158, 11, 0.12); color: #d97706; }
    .action-info { flex: 1; min-width: 0; }
    .action-title { font-size: 13px; font-weight: 700; color: var(--md-sys-color-on-surface); }
    .action-desc { font-size: 11px; color: var(--sidebar-header-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .arrow { color: var(--sidebar-header-color); }

    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 11.5px;
      font-weight: 700;
      white-space: nowrap;
    }
    .status-pill.good { background: #dcfce7; color: #15803d; }
    .status-pill.info { background: #eff6ff; color: #0050e5; }
    .status-pill.violet { background: #f3e8ff; color: #7e22ce; }
    .status-pill.amber { background: #fef3c7; color: #b45309; }
    .status-pill.red { background: #fee2e2; color: #b91c1c; }
    .status-pill.muted { background: #f1f5f9; color: #64748b; }
    .action-mini-icon { font-size: 14px; }
    .details-cell {
      max-width: 520px;
      line-height: 1.45;
      color: #334155;
      font-size: 12.5px;
    }
  `]
})
export class DashboardComponent implements OnInit {
  metrics: any = null;
  loading = false;

  get headerButtons(): PageHeaderButton[] {
    return [
      {
        text: 'Refresh Telemetry',
        icon: 'refresh',
        loading: this.loading,
        action: () => this.loadMetrics()
      },
      {
        text: 'New Web Page',
        icon: 'add',
        isPrimary: true,
        routerLink: '/admin/content'
      }
    ];
  }

  constructor(private api: ApiService) { }

  ngOnInit(): void {
    this.loadMetrics();
  }

  formatAction(action?: string): string {
    if (!action) return 'Activity';
    const clean = action.trim();
    if (clean === 'LOGIN_SUCCESS') return 'User Sign-In';
    if (clean === 'LOGIN_FAILED') return 'Failed Sign-In';
    if (clean === 'PASSWORD_RESET') return 'Password Reset';
    if (clean.includes('SiteCodeInjectionTag')) return 'Custom Code & Styles';
    if (clean.includes('TenantInstalledTemplate')) return 'Section Template';
    return clean;
  }

  getActionBadgeClass(action?: string): string {
    if (!action) return 'muted';
    const a = action.toLowerCase();
    if (a.includes('login_success') || a.includes('sign-in') || a.includes('success')) return 'good';
    if (a.includes('code') || a.includes('sitecode') || a.includes('template') || a.includes('page') || a.includes('cms')) return 'info';
    if (a.includes('role') || a.includes('permission') || a.includes('user') || a.includes('profile')) return 'violet';
    if (a.includes('fail') || a.includes('delete') || a.includes('critical') || a.includes('suspend') || a.includes('revok')) return 'red';
    if (a.includes('warning') || a.includes('reset') || a.includes('alert')) return 'amber';
    return 'violet';
  }

  getActionIcon(action?: string): string {
    if (!action) return 'info';
    const a = action.toLowerCase();
    if (a.includes('login_success') || a.includes('sign-in')) return 'login';
    if (a.includes('code') || a.includes('sitecode')) return 'code';
    if (a.includes('template')) return 'layers';
    if (a.includes('page') || a.includes('section')) return 'article';
    if (a.includes('role') || a.includes('permission')) return 'verified_user';
    if (a.includes('delete') || a.includes('suspend')) return 'delete_forever';
    if (a.includes('user') || a.includes('profile')) return 'person';
    if (a.includes('password') || a.includes('reset')) return 'lock_reset';
    return 'history';
  }

  formatDetails(details?: string, action?: string): string {
    if (!details) return '';
    let text = details.trim();

    // 1. Strip internal timestamp change noise e.g. UpdatedAtUtc: '...' ➔ '...', LastUpdatedUtc: '...' ➔ '...'
    text = text.replace(/(?:,\s*)?(?:UpdatedAtUtc|LastUpdatedUtc|ModifiedAt|CreatedAt|RowVersion):\s*'[^']*'\s*(?:➔|->)\s*'[^']*'/gi, '');

    // 2. Clean up raw HTML code dumps: [HtmlTemplate: '<div...' ➔ '<div...']
    text = text.replace(/HtmlTemplate:\s*'[^']*'\s*(?:➔|->)\s*'[^']*'/gi, 'Template layout updated');

    // 3. Clean up trailing commas, empty brackets
    text = text.replace(/\[,\s*/g, '[').replace(/\[\]/g, '').replace(/\[:\s*\]/g, '').trim();
    if (text.endsWith(':')) text = text.slice(0, -1).trim();

    // 4. Clean up raw entity names
    text = text.replace(/SiteCodeInjectionTag/g, 'Custom Code & Styles')
               .replace(/TenantInstalledTemplate/g, 'Section Template');

    return text;
  }

  loadMetrics(): void {
    this.loading = true;
    this.api.get<any>('DashboardApi/metrics').subscribe({
      next: (res) => {
        this.loading = false;
        if (res?.data) {
          this.metrics = res.data;
          if (res.data.masterTenantInfo) {
            console.groupCollapsed('%c[Master Catalog Multi-Tenant Resolution]', 'color: #0050e5; font-weight: bold;');
            console.table(res.data.masterTenantInfo);
            console.groupEnd();
          }
        }
      },
      error: () => {
        this.loading = false;
      }
    });
  }
}
