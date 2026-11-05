import { Component, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { ApiService } from '../../../core/services/api.service';
import { TranslationService } from '../../../core/services/translation.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { PageHeaderComponent, PageHeaderButton } from '../../../shared/components/page-header/page-header.component';

Chart.register(...registerables);

@Component({
  selector: 'app-identity',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, TranslatePipe],
  template: `
    <div class="identity-page">
      <!-- Standardized Page Header -->
      <app-page-header
        [eyebrow]="'identity.dashboard.eyebrow' | translate:'SECURITY & GOVERNANCE'"
        icon="admin_panel_settings"
        [title]="'identity.dashboard.title' | translate:'Identity & Access Administration'"
        [subtitle]="'identity.dashboard.subtitle' | translate:'Role-Based Access Control (RBAC), user invitation tokens, login security audit, and policy controls.'"
        [buttons]="headerButtons"
        [loading]="isLoading"
      ></app-page-header>

      <!-- Identity Toolbar Tabs -->
      <div class="feature-toolbar">
        <button type="button" class="feature-tab" [class.active]="activeTab === 'dashboard'" (click)="setTab('dashboard')">
          <span class="material-symbols-outlined tab-icon">space_dashboard</span>
          <span>{{ 'nav.identity_dashboard' | translate:'Identity Dashboard' }}</span>
        </button>

        <button type="button" class="feature-tab" [class.active]="activeTab === 'roles'" (click)="setTab('roles')">
          <span class="material-symbols-outlined tab-icon">shield_person</span>
          <span>{{ 'identity.roles.title' | translate:'Roles & Scopes' }}</span>
          <span class="badge-pill" style="background:rgba(0,80,229,0.15); color:#0050e5; margin-left:6px;">{{ roles.length }}</span>
        </button>

        <button type="button" class="feature-tab" [class.active]="activeTab === 'permissions'" (click)="setTab('permissions')">
          <span class="material-symbols-outlined tab-icon">checklist</span>
          <span>{{ 'identity.roles.tab_authority' | translate:'Permission Matrix' }}</span>
        </button>

        <button type="button" class="feature-tab" [class.active]="activeTab === 'invitations'" (click)="setTab('invitations')">
          <span class="material-symbols-outlined tab-icon">mail</span>
          <span>{{ 'identity.invitations.title' | translate:'User Invitations' }}</span>
          <span class="badge-pill" style="background:rgba(0,80,229,0.15); color:#0050e5; margin-left:6px;">{{ invitations.length }}</span>
        </button>

        <button type="button" class="feature-tab" [class.active]="activeTab === 'audit'" (click)="setTab('audit')">
          <span class="material-symbols-outlined tab-icon">history</span>
          <span>{{ 'identity.audit.title' | translate:'Login Audit Logs' }}</span>
        </button>

        <button type="button" class="feature-tab" [class.active]="activeTab === 'policies'" (click)="setTab('policies')">
          <span class="material-symbols-outlined tab-icon">policy</span>
          <span>{{ 'identity.policies.title' | translate:'Security Policies' }}</span>
        </button>
      </div>

      <!-- TAB 1: DEDICATED IDENTITY DASHBOARD WITH CHARTS & HISTOGRAMS -->
      <div *ngIf="activeTab === 'dashboard'" class="dashboard-hub">
        <!-- 4 KPI Metric Cards -->
        <div class="metric-grid" style="margin-bottom: 20px;">
          <div class="metric-card">
            <div class="metric-label">Platform Roles</div>
            <div class="metric-value">{{ roles.length }}</div>
            <span class="metric-trend text-purple">Configured Scopes</span>
          </div>
          <div class="metric-card">
            <div class="metric-label">Pending Invitations</div>
            <div class="metric-value">{{ invitations.length }}</div>
            <span class="metric-trend text-blue">Awaiting Acceptance</span>
          </div>
          <div class="metric-card">
            <div class="metric-label">MFA Adoption Rate</div>
            <div class="metric-value">100%</div>
            <span class="metric-trend text-green">SuperAdmin Enforced</span>
          </div>
          <div class="metric-card">
            <div class="metric-label">Blocked Login Attempts</div>
            <div class="metric-value">0</div>
            <span class="metric-trend text-green">Clean Security Posture</span>
          </div>
        </div>

        <!-- 2 Analytical Charts Row (Login History Histogram & Role Donut) -->
        <div class="chart-row-2">
          <!-- Chart 1: Login Security Histogram -->
          <section class="console-widget">
            <div class="widget-head">
              <div class="widget-title-wrap">
                <span class="material-symbols-outlined text-green">verified_user</span>
                <h2 class="widget-title">Authentication Activity Histogram (Last 7 Days)</h2>
              </div>
              <span class="status-pill good">Secure</span>
            </div>
            <div class="widget-body">
              <div class="chart-box">
                <canvas #loginAuditChartCanvas></canvas>
              </div>
            </div>
          </section>

          <!-- Chart 2: RBAC Role Distribution Donut -->
          <section class="console-widget">
            <div class="widget-head">
              <div class="widget-title-wrap">
                <span class="material-symbols-outlined text-purple">donut_large</span>
                <h2 class="widget-title">RBAC Role Distribution</h2>
              </div>
            </div>
            <div class="widget-body">
              <div class="chart-box">
                <canvas #roleDonutChartCanvas></canvas>
              </div>
            </div>
          </section>
        </div>

        <!-- Quick Launch Shortcut Row -->
        <div class="console-actions">
          <div class="action-card" (click)="showInviteModal = true">
            <div class="action-icon-bg" style="background:#0050e5;"><span class="material-symbols-outlined">send</span></div>
            <span class="action-label">Send Invitation</span>
          </div>
          <div class="action-card" (click)="setTab('permissions')">
            <div class="action-icon-bg" style="background:#a855f7;"><span class="material-symbols-outlined">checklist</span></div>
            <span class="action-label">Permission Matrix</span>
          </div>
          <div class="action-card" (click)="setTab('audit')">
            <div class="action-icon-bg" style="background:#22c55e;"><span class="material-symbols-outlined">history</span></div>
            <span class="action-label">Review Audit Stream</span>
          </div>
          <div class="action-card" (click)="setTab('policies')">
            <div class="action-icon-bg" style="background:#f59e0b;"><span class="material-symbols-outlined">policy</span></div>
            <span class="action-label">Password Policy</span>
          </div>
        </div>
      </div>

      <!-- TAB 2: ROLES & SCOPES -->
      <div *ngIf="activeTab === 'roles'" class="roles-grid">
        <div class="console-widget role-card" *ngFor="let role of roles">
          <div class="widget-head">
            <div class="widget-title-wrap">
              <span class="material-symbols-outlined text-purple" style="font-size:22px;">shield_person</span>
              <h3 class="widget-title">{{ role.name || role }}</h3>
            </div>
            <span class="status-pill good">System Role</span>
          </div>
          <div class="widget-body">
            <p class="role-description">{{ getRoleDescription(role.name || role) }}</p>
            <div class="permission-list">
              <div class="perm-item" *ngFor="let perm of getPermissions(role.name || role)">
                <span class="material-symbols-outlined check-icon">check_circle</span>
                <span>{{ perm }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 3: PERMISSION MATRIX -->
      <section *ngIf="activeTab === 'permissions'" class="console-widget">
        <div class="widget-head">
          <div class="widget-title-wrap">
            <span class="material-symbols-outlined drag-dot">drag_indicator</span>
            <h2 class="widget-title">Platform Feature & Security Permission Matrix</h2>
          </div>
        </div>
        <div class="widget-body" style="padding:0;">
          <table class="table-clean">
            <thead>
              <tr>
                <th>Functional Module</th>
                <th>Assigned Access Scope</th>
                <th>SuperAdmin</th>
                <th>Admin</th>
                <th>Member</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let perm of permissions">
                <td><strong>{{ perm.module }}</strong></td>
                <td>{{ perm.permissions?.join(', ') }}</td>
                <td><span class="status-pill good">Full Access</span></td>
                <td><span class="status-pill info">Operational</span></td>
                <td><span class="status-pill muted">Restricted</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- TAB 4: INVITATIONS -->
      <section *ngIf="activeTab === 'invitations'" class="console-widget">
        <div class="widget-head">
          <div class="widget-title-wrap">
            <span class="material-symbols-outlined drag-dot">drag_indicator</span>
            <h2 class="widget-title">Pending & Sent User Invitations</h2>
          </div>
          <button type="button" class="console-btn primary" (click)="showInviteModal = true">
            <span class="material-symbols-outlined">send</span>
            <span>Invite User</span>
          </button>
        </div>
        <div class="widget-body" style="padding:0;">
          <table class="table-clean">
            <thead>
              <tr>
                <th>Invited Email</th>
                <th>Target Role</th>
                <th>Invitation Status</th>
                <th>Date Sent</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let inv of invitations">
                <td><strong>{{ inv.email }}</strong></td>
                <td><span class="status-pill violet">{{ inv.assignedRole }}</span></td>
                <td>
                  <span class="status-pill" [class.warn]="inv.status === 'Pending'" [class.good]="inv.status === 'Accepted'">
                    {{ inv.status }}
                  </span>
                </td>
                <td>{{ inv.sentDate | date:'mediumDate' }}</td>
                <td>
                  <button type="button" class="console-btn" style="height:28px; padding:0 8px;">Resend</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- TAB 5: LOGIN AUDIT LOGS -->
      <section *ngIf="activeTab === 'audit'" class="console-widget">
        <div class="widget-head">
          <div class="widget-title-wrap">
            <span class="material-symbols-outlined drag-dot">drag_indicator</span>
            <h2 class="widget-title">Real-Time Login Security Audit Trail</h2>
          </div>
        </div>
        <div class="widget-body" style="padding:0;">
          <table class="table-clean">
            <thead>
              <tr>
                <th>Account Email</th>
                <th>Client IP Address</th>
                <th>Result Status</th>
                <th>Device & Agent</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let log of auditLogs">
                <td><strong>{{ log.email }}</strong></td>
                <td><code class="slug-tag">{{ log.ipAddress }}</code></td>
                <td>
                  <span class="status-pill" [class.good]="log.status === 'Success'" [class.bad]="log.status !== 'Success'">
                    {{ log.status }}
                  </span>
                </td>
                <td>{{ log.userAgent }}</td>
                <td>{{ log.timestamp | date:'short' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- TAB 6: POLICIES -->
      <div *ngIf="activeTab === 'policies'" class="console-grid">
        <section class="console-widget span-6">
          <div class="widget-head">
            <div class="widget-title-wrap">
              <span class="material-symbols-outlined drag-dot">drag_indicator</span>
              <h2 class="widget-title">Password Complexity Policy</h2>
            </div>
          </div>
          <div class="widget-body">
            <div style="display:flex; flex-direction:column; gap:12px; font-size:13px; color:var(--sidebar-color);">
              <label style="display:flex; align-items:center; justify-content:space-between;">
                <span>Minimum Password Length</span>
                <input type="number" value="8" style="width:60px; padding:4px 8px; border-radius:6px; border:1px solid var(--md-sys-color-outline);" />
              </label>
              <label style="display:flex; align-items:center; gap:8px;">
                <input type="checkbox" checked /> Require Uppercase Characters (A-Z)
              </label>
              <label style="display:flex; align-items:center; gap:8px;">
                <input type="checkbox" checked /> Require Numerical Digits (0-9)
              </label>
              <label style="display:flex; align-items:center; gap:8px;">
                <input type="checkbox" checked /> Require Special Symbols (!&#64;#$%^&*)
              </label>
            </div>
          </div>
        </section>

        <section class="console-widget span-6">
          <div class="widget-head">
            <div class="widget-title-wrap">
              <span class="material-symbols-outlined drag-dot">drag_indicator</span>
              <h2 class="widget-title">Two-Factor Authentication (2FA / MFA)</h2>
            </div>
          </div>
          <div class="widget-body">
            <div style="display:flex; flex-direction:column; gap:12px; font-size:13px; color:var(--sidebar-color);">
              <label style="display:flex; align-items:center; gap:8px;">
                <input type="checkbox" checked /> Enforce MFA for Administrator Accounts
              </label>
              <label style="display:flex; align-items:center; gap:8px;">
                <input type="checkbox" /> Enforce MFA for All General Members
              </label>
              <p style="font-size:12px; color:var(--sidebar-header-color); margin-top:8px;">
                Supported methods: Time-Based One-Time Passwords (TOTP via Google Authenticator, Authy, Microsoft Authenticator) & Email OTP.
              </p>
            </div>
          </div>
        </section>
      </div>

      <!-- Invite User Modal -->
      <div class="modal-backdrop" *ngIf="showInviteModal" (click)="showInviteModal = false">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div class="modal-title-group">
              <span class="material-symbols-outlined text-blue">mail</span>
              <h3>Send Workspace Invitation</h3>
            </div>
            <button type="button" class="btn-close" (click)="showInviteModal = false">&times;</button>
          </div>
          <form (ngSubmit)="onSendInvite()" class="modal-body">
            <div class="form-group" style="margin-bottom:14px;">
              <label class="form-label">User Email Address</label>
              <input type="email" [(ngModel)]="inviteEmail" name="email" placeholder="user@company.com" class="form-control" required />
            </div>

            <div class="form-group" style="margin-bottom:18px;">
              <label class="form-label">Assigned Role</label>
              <select [(ngModel)]="inviteRole" name="role" class="form-control">
                <option value="Admin">Admin</option>
                <option value="Member">Member</option>
                <option value="Editor">Editor</option>
                <option value="Moderator">Moderator</option>
              </select>
            </div>

            <div style="display:flex; justify-content:flex-end; gap:10px;">
              <button type="button" class="console-btn" (click)="showInviteModal = false">Cancel</button>
              <button type="submit" [disabled]="!inviteEmail" class="console-btn primary">Send Invitation</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .identity-page { display: flex; flex-direction: column; gap: 16px; }
    .tab-icon { font-size: 18px; }
    .roles-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 16px;
    }
    .role-description {
      font-size: 13px;
      color: var(--sidebar-color);
      line-height: 1.5;
      margin: 0 0 12px;
    }
    .permission-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      border-top: 1px solid var(--md-sys-color-outline);
      padding-top: 12px;
    }
    .perm-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12.5px;
      color: var(--sidebar-color);
    }
    .check-icon { font-size: 18px; color: #16a34a; }
    .slug-tag {
      background: var(--sidebar-active-bg);
      color: var(--sidebar-active-color);
      padding: 3px 7px;
      border-radius: 4px;
      font-size: 12px;
    }
    .form-label {
      display: block;
      font-size: 11.5px;
      font-weight: 700;
      color: var(--sidebar-header-color);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 4px;
    }
    .form-control {
      width: 100%;
      border: 1px solid var(--md-sys-color-outline);
      background: var(--md-sys-color-surface);
      color: var(--md-sys-color-on-surface);
      border-radius: 8px;
      padding: 9px 12px;
      font-size: 13px;
      outline: none;
      box-sizing: border-box;
    }
  `]
})
export class IdentityComponent implements OnInit, AfterViewInit {
  @ViewChild('loginAuditChartCanvas') loginAuditChartCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('roleDonutChartCanvas') roleDonutChartCanvas?: ElementRef<HTMLCanvasElement>;

  loginAuditChart?: Chart;
  roleDonutChart?: Chart;

  activeTab = 'dashboard';
  isLoading = false;
  roles: any[] = [];
  permissions: any[] = [];
  invitations: any[] = [];
  auditLogs: any[] = [];

  showInviteModal = false;
  inviteEmail = '';
  inviteRole = 'Member';

  get headerButtons(): PageHeaderButton[] {
    return [
      {
        text: this.translationService.translate('identity.invitations.btn_send_invite', 'Invite User'),
        icon: 'send',
        isPrimary: true,
        action: () => { this.showInviteModal = true; }
      },
      {
        text: this.translationService.translate('btn.refresh', 'Refresh'),
        icon: 'refresh',
        action: () => { this.loadData(); }
      }
    ];
  }

  constructor(
    private api: ApiService,
    private translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngAfterViewInit(): void {
    if (this.activeTab === 'dashboard') {
      setTimeout(() => this.initCharts(), 150);
    }
  }

  setTab(tab: string): void {
    this.activeTab = tab;
    if (tab === 'dashboard') {
      setTimeout(() => this.initCharts(), 150);
    }
  }

  loadData(): void {
    this.isLoading = true;
    let completed = 0;
    const checkDone = () => {
      completed++;
      if (completed >= 4) {
        setTimeout(() => {
          this.isLoading = false;
          this.updateCharts();
        }, 300);
      }
    };

    this.api.get<any>('IdentityApi/roles').subscribe({
      next: (res) => {
        this.roles = res?.data || [];
        checkDone();
      },
      error: () => checkDone()
    });

    this.api.get<any>('IdentityApi/permissions').subscribe({
      next: (res) => {
        this.permissions = res?.data || [];
        checkDone();
      },
      error: () => checkDone()
    });

    this.api.get<any>('IdentityApi/invitations').subscribe({
      next: (res) => {
        this.invitations = res?.data || [];
        checkDone();
      },
      error: () => checkDone()
    });

    this.api.get<any>('IdentityApi/login-audit').subscribe({
      next: (res) => {
        this.auditLogs = res?.data || [];
        checkDone();
      },
      error: () => checkDone()
    });
  }

  initCharts(): void {
    if (this.loginAuditChartCanvas && !this.loginAuditChart) {
      const ctx = this.loginAuditChartCanvas.nativeElement.getContext('2d');
      if (ctx) {
        this.loginAuditChart = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [
              {
                label: 'Successful Logins',
                data: [14, 22, 19, 28, 35, 12, 18],
                backgroundColor: '#22c55e',
                borderRadius: 4
              },
              {
                label: 'Failed Attempts',
                data: [0, 1, 0, 0, 2, 0, 0],
                backgroundColor: '#ef4444',
                borderRadius: 4
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'top' } },
            scales: {
              y: { grid: { color: 'rgba(255,255,255,0.05)' } },
              x: { grid: { display: false } }
            }
          }
        });
      }
    }

    if (this.roleDonutChartCanvas && !this.roleDonutChart) {
      const ctx = this.roleDonutChartCanvas.nativeElement.getContext('2d');
      if (ctx) {
        this.roleDonutChart = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: ['SuperAdmin', 'Admin', 'Member', 'Editor', 'Moderator'],
            datasets: [{
              data: [1, 2, 12, 2, 1],
              backgroundColor: ['#ef4444', '#0050e5', '#22c55e', '#a855f7', '#f59e0b']
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'right' } }
          }
        });
      }
    }
  }

  updateCharts(): void {
    if (this.roleDonutChart && this.roles.length > 0) {
      this.roleDonutChart.data.labels = this.roles.map(r => r.name || r);
      this.roleDonutChart.update();
    }
  }

  onSendInvite(): void {
    if (!this.inviteEmail) return;

    this.api.post<any>('IdentityApi/invitations', {
      email: this.inviteEmail,
      role: this.inviteRole
    }).subscribe({
      next: () => {
        this.showInviteModal = false;
        this.inviteEmail = '';
        this.loadData();
      },
      error: () => {}
    });
  }

  getRoleDescription(role: string): string {
    switch (role) {
      case 'SuperAdmin': return 'Full administrative governance, security configuration, and tenant catalog authority.';
      case 'Admin': return 'Operational management over CMS pages, member approvals, channels, and brand customizer.';
      case 'Editor': return 'Content authoring authority over dynamic web pages, section templates, and sliders.';
      case 'Moderator': return 'Channel moderation, community management, and discussion oversight.';
      default: return 'Member community access to group channels, direct messaging, directory, and personal profile.';
    }
  }

  getPermissions(role: string): string[] {
    switch (role) {
      case 'SuperAdmin': return ['Full Platform Authority', 'Manage Roles & Security', 'Database & Audit Logs', 'CMS Page Studio'];
      case 'Admin': return ['Manage Members & Directory', 'Create/Edit Dynamic Pages', 'Moderate Group Channels', 'Update Brand Theme'];
      case 'Editor': return ['Create/Edit Dynamic WebPages', 'Publish Page Sections', 'Upload Slider Media'];
      case 'Moderator': return ['Moderate Discussion Channels', 'Mute/Warn Members', 'Review Reported Content'];
      default: return ['Participate in Group Channels', 'Send Direct Messages', 'View Directory Profiles', 'Update Personal Security'];
    }
  }
}
