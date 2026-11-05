import { Component, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { ApiService } from '../../../core/services/api.service';
import { TranslationService } from '../../../core/services/translation.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { PageHeaderComponent, PageHeaderButton } from '../../../shared/components/page-header/page-header.component';

Chart.register(...registerables);

@Component({
  selector: 'app-identity-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, PageHeaderComponent, TranslatePipe],
  template: `
    <div class="identity-page">
      <!-- Header -->
      <app-page-header
        [eyebrow]="'identity.dash.eyebrow' | translate:'IDENTITY SECURITY CONTROL'"
        icon="security"
        [title]="'identity.dash.title' | translate:'Security Console Overview'"
        [subtitle]="'identity.dash.subtitle' | translate:'Real-time telemetry, 2FA adoption metrics, brute-force retry flags, and remote session controls.'"
        [buttons]="headerButtons"
        [loading]="isLoading"
      ></app-page-header>

      <!-- Metric Grid (Clickable Interactive Telemetry Cards) -->
      <div class="metric-grid" style="margin-bottom: 24px;">
        <!-- Card 1: Total Users -> User Directory -->
        <div 
          class="metric-card card-hover clickable" 
          [routerLink]="['/users/console/list']"
          role="button"
          tabindex="0"
          title="Click to view all registered members in User Directory"
        >
          <div class="metric-card-header">
            <span class="metric-label">{{ 'identity.dash.total_users' | translate:'Total Users' }}</span>
            <span class="material-symbols-outlined metric-link-icon">arrow_forward</span>
          </div>
          <div class="metric-value">{{ telemetry.totalUsers }}</div>
          <span class="metric-trend text-blue">{{ 'identity.dash.registered_members' | translate:'Registered Members' }}</span>
        </div>

        <!-- Card 2: Locked Accounts -> Filtered User Directory (Suspended) -->
        <div 
          class="metric-card card-hover clickable" 
          [routerLink]="['/users/console/list']"
          [queryParams]="{ status: 'Suspended' }"
          role="button"
          tabindex="0"
          title="Click to inspect locked and suspended user accounts in User Directory"
        >
          <div class="metric-card-header">
            <span class="metric-label">{{ 'identity.dash.locked_accounts' | translate:'Locked Accounts' }}</span>
            <span class="material-symbols-outlined metric-link-icon">arrow_forward</span>
          </div>
          <div class="metric-value" [class.text-red]="telemetry.lockedOutCount > 0">{{ telemetry.lockedOutCount }}</div>
          <span class="metric-trend" [class.text-red]="telemetry.lockedOutCount > 0" [class.text-green]="telemetry.lockedOutCount === 0">
            {{ telemetry.lockedOutCount > 0 ? ('identity.dash.requires_attention' | translate:'Requires Attention') : ('identity.dash.active_safeguard' | translate:'Active Safeguard') }}
          </span>
        </div>

        <!-- Card 3: Brute-Force Retries -> Security Logs -->
        <div 
          class="metric-card card-hover clickable" 
          [routerLink]="['/identity/console/audit-logs']"
          role="button"
          tabindex="0"
          title="Click to inspect brute-force retry flags and authentication events in Security Logs"
        >
          <div class="metric-card-header">
            <span class="metric-label">{{ 'identity.dash.brute_force_retries' | translate:'Brute-Force Retries' }}</span>
            <span class="material-symbols-outlined metric-link-icon">arrow_forward</span>
          </div>
          <div class="metric-value" [class.text-amber]="telemetry.retryAlertsCount > 0">{{ telemetry.retryAlertsCount }}</div>
          <span class="metric-trend" [class.text-amber]="telemetry.retryAlertsCount > 0" [class.text-green]="telemetry.retryAlertsCount === 0">
            {{ telemetry.retryAlertsCount > 0 ? ('identity.dash.suspicious_retries' | translate:'Suspicious Retries') : ('identity.dash.clean_audit_stream' | translate:'Clean Audit Stream') }}
          </span>
        </div>

        <!-- Card 4: MFA Enrolled -> Global Policies -->
        <div 
          class="metric-card card-hover clickable" 
          [routerLink]="['/identity/console/policies']"
          role="button"
          tabindex="0"
          title="Click to configure two-factor authentication and global security policies"
        >
          <div class="metric-card-header">
            <span class="metric-label">{{ 'identity.dash.mfa_enrolled' | translate:'MFA Enrolled' }}</span>
            <span class="material-symbols-outlined metric-link-icon">arrow_forward</span>
          </div>
          <div class="metric-value text-green">{{ mfaPercentage }}%</div>
          <span class="metric-trend text-green">{{ 'identity.dash.preferred_auth' | translate:'Preferred Authentication' }}</span>
        </div>
      </div>

      <!-- Charts Row -->
      <div class="chart-row-2" style="margin-bottom: 24px;">
        <!-- Chart 1: 2FA Methods Adoption -->
        <section class="console-widget">
          <div class="widget-head">
            <div class="widget-title-wrap">
              <span class="material-symbols-outlined text-blue">phonelink_lock</span>
              <h2 class="widget-title">{{ 'identity.dash.mfa_distribution' | translate:'MFA Verification Method Distribution' }}</h2>
            </div>
          </div>
          <div class="widget-body">
            <div class="chart-box" style="height: 280px; position: relative;">
              <canvas #mfaChartCanvas></canvas>
            </div>
          </div>
        </section>

        <!-- Chart 2: Security Threat Posture -->
        <section class="console-widget">
          <div class="widget-head">
            <div class="widget-title-wrap">
              <span class="material-symbols-outlined text-purple">gpp_maybe</span>
              <h2 class="widget-title">{{ 'identity.dash.operational_overview' | translate:'Identity Operational Overview' }}</h2>
            </div>
          </div>
          <div class="widget-body">
            <div class="chart-box" style="height: 280px; position: relative;">
              <canvas #postureChartCanvas></canvas>
            </div>
          </div>
        </section>
      </div>

      <!-- Quick Shortcuts Console Grid -->
      <h3 style="color: var(--md-sys-color-on-surface); font-size: 15px; font-weight: 700; margin-bottom: 16px; letter-spacing: -0.02em;">{{ 'identity.dash.control_panels' | translate:'Identity Control Panels' }}</h3>
      <div class="console-actions" style="margin-bottom: 30px;">
        <div class="action-card card-hover" routerLink="/identity/console/roles">
          <div class="action-icon-bg" style="background:#0050e5;"><span class="material-symbols-outlined">shield_person</span></div>
          <span class="action-label">{{ 'identity.dash.roles_scopes' | translate:'Roles & Scopes' }}</span>
          <span class="action-desc">{{ 'identity.dash.roles_scopes_desc' | translate:'Assign fine-grained feature editing permissions.' }}</span>
        </div>
        <div class="action-card card-hover" routerLink="/identity/console/invitations">
          <div class="action-icon-bg" style="background:#a855f7;"><span class="material-symbols-outlined">mail</span></div>
          <span class="action-label">{{ 'identity.dash.user_invitations' | translate:'User Invitations' }}</span>
          <span class="action-desc">{{ 'identity.dash.user_invitations_desc' | translate:'Issue secure registration tokens to admins & members.' }}</span>
        </div>
        <div class="action-card card-hover" routerLink="/identity/console/audit-logs">
          <div class="action-icon-bg" style="background:#22c55e;"><span class="material-symbols-outlined">history</span></div>
          <span class="action-label">{{ 'identity.dash.security_logs' | translate:'Security Logs' }}</span>
          <span class="action-desc">{{ 'identity.dash.security_logs_desc' | translate:'Analyze login audit stream and tracking events.' }}</span>
        </div>
        <div class="action-card card-hover" routerLink="/identity/console/policies">
          <div class="action-icon-bg" style="background:#f59e0b;"><span class="material-symbols-outlined">password</span></div>
          <span class="action-label">{{ 'identity.dash.global_policies' | translate:'Global Policies' }}</span>
          <span class="action-desc">{{ 'identity.dash.global_policies_desc' | translate:'Set global password complexity and MFA triggers.' }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .identity-page {
      padding: 0;
    }
    .metric-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 20px;
    }
    .metric-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      box-shadow: 0 4px 12px rgba(0,0,0,0.02);
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .metric-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 6px;
    }
    .metric-card-header .metric-label {
      margin-bottom: 0;
    }
    .metric-link-icon {
      font-size: 16px;
      color: #94a3b8;
      opacity: 0.6;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      transform: translateX(0);
    }
    .metric-card.clickable {
      cursor: pointer;
      user-select: none;
      position: relative;
      outline: none;
    }
    .metric-card.clickable:hover {
      border-color: #cbd5e1;
      transform: translateY(-3px);
      box-shadow: 0 10px 24px rgba(0, 0, 0, 0.06);
    }
    .metric-card.clickable:hover .metric-link-icon {
      color: #0050e5;
      opacity: 1;
      transform: translateX(3px);
    }
    .metric-card.clickable:focus-visible {
      border-color: #0050e5;
      box-shadow: 0 0 0 2px rgba(0, 80, 229, 0.2);
    }
    .metric-card.clickable:active {
      transform: translateY(-1px);
    }
    .card-hover {
      transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s;
    }
    .metric-label {
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 700;
      color: #64748b;
      letter-spacing: 0.05em;
    }
    .metric-value {
      font-size: 32px;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.1;
      margin-bottom: 6px;
    }
    .metric-trend {
      font-size: 12px;
      font-weight: 500;
    }
    .text-blue { color: #0050e5; }
    .text-red { color: #ef4444; }
    .text-green { color: #22c55e; }
    .text-amber { color: #f59e0b; }
    .chart-row-2 {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 24px;
    }
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
    .chart-box {
      width: 100%;
    }
    .console-actions {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 20px;
    }
    .action-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.02);
      cursor: pointer;
      transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s;
    }
    .action-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(0,0,0,0.05);
    }
    .action-icon-bg {
      width: 42px;
      height: 42px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
    }
    .action-label {
      font-size: 14px;
      font-weight: 800;
      color: #0f172a;
    }
    .action-desc {
      font-size: 12px;
      color: #64748b;
      line-height: 1.4;
    }

    /* Dark Mode Context */
    :host-context(.dark-mode) .metric-card {
      background: #1e293b;
      border-color: #334155;
    }
    :host-context(.dark-mode) .metric-card.clickable:hover {
      border-color: #475569;
      box-shadow: 0 10px 24px rgba(0, 0, 0, 0.35);
    }
    :host-context(.dark-mode) .metric-value {
      color: #f8fafc;
    }
    :host-context(.dark-mode) .metric-label {
      color: #94a3b8;
    }
    :host-context(.dark-mode) .metric-link-icon {
      color: #64748b;
    }
    :host-context(.dark-mode) .metric-card.clickable:hover .metric-link-icon {
      color: #60a5fa;
    }
    :host-context(.dark-mode) .console-widget {
      background: #1e293b;
      border-color: #334155;
    }
    :host-context(.dark-mode) .widget-title {
      color: #f8fafc;
    }
    :host-context(.dark-mode) .action-card {
      background: #1e293b;
      border-color: #334155;
    }
    :host-context(.dark-mode) .action-label {
      color: #f8fafc;
    }
    :host-context(.dark-mode) .action-desc {
      color: #94a3b8;
    }
  `]
})
export class IdentityDashboardComponent implements OnInit, AfterViewInit {
  @ViewChild('mfaChartCanvas') mfaChartCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('postureChartCanvas') postureChartCanvas?: ElementRef<HTMLCanvasElement>;

  mfaChart?: Chart;
  postureChart?: Chart;

  isLoading = false;
  telemetry = {
    totalUsers: 0,
    mfaGoogleCount: 0,
    mfaMicrosoftCount: 0,
    mfaEmailCount: 0,
    mfaSmsCount: 0,
    mfaNoneCount: 0,
    lockedOutCount: 0,
    retryAlertsCount: 0
  };

  mfaPercentage = 0;

  constructor(
    private api: ApiService,
    private router: Router,
    private translationService: TranslationService
  ) {}

  get headerButtons(): PageHeaderButton[] {
    return [
      {
        text: this.translationService.translate('btn.refresh_telemetry', 'Refresh Telemetry'),
        icon: 'refresh',
        action: () => { this.loadTelemetry(); }
      }
    ];
  }

  ngOnInit(): void {
    this.loadTelemetry();
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.initCharts(), 200);
  }

  loadTelemetry(): void {
    this.isLoading = true;
    this.api.get<any>('IdentityApi/telemetry').subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res && res.data) {
          this.telemetry = res.data;
          const enrolled = this.telemetry.mfaGoogleCount + this.telemetry.mfaMicrosoftCount + this.telemetry.mfaEmailCount + this.telemetry.mfaSmsCount;
          this.mfaPercentage = this.telemetry.totalUsers > 0 ? Math.round((enrolled / this.telemetry.totalUsers) * 100) : 0;
          this.updateCharts();
        }
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  initCharts(): void {
    if (this.mfaChartCanvas && !this.mfaChart) {
      const ctx = this.mfaChartCanvas.nativeElement.getContext('2d');
      if (ctx) {
        this.mfaChart = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: ['Google Authenticator', 'Microsoft Authenticator', 'Email OTP', 'SMS OTP', 'Disabled'],
            datasets: [{
              data: [0, 0, 0, 0, 0],
              backgroundColor: ['#0050e5', '#3b82f6', '#10b981', '#f59e0b', '#cbd5e1'],
              borderWidth: 0
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'right',
                labels: { color: '#475569', font: { size: 11, weight: 'bold' } }
              }
            }
          }
        });
      }
    }

    if (this.postureChartCanvas && !this.postureChart) {
      const ctx = this.postureChartCanvas.nativeElement.getContext('2d');
      if (ctx) {
        this.postureChart = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: ['Active Guards', 'Locked Out', 'Brute Force Attempts'],
            datasets: [{
              label: 'Metrics Value',
              data: [0, 0, 0],
              backgroundColor: ['#10b981', '#ef4444', '#f59e0b'],
              borderRadius: 6
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              y: {
                grid: { color: '#f1f5f9' },
                ticks: { color: '#475569', font: { weight: 'bold' } }
              },
              x: {
                grid: { display: false },
                ticks: { color: '#475569', font: { weight: 'bold' } }
              }
            }
          }
        });
      }
    }

    this.updateCharts();
  }

  updateCharts(): void {
    if (this.mfaChart) {
      this.mfaChart.data.datasets[0].data = [
        this.telemetry.mfaGoogleCount,
        this.telemetry.mfaMicrosoftCount,
        this.telemetry.mfaEmailCount,
        this.telemetry.mfaSmsCount,
        this.telemetry.mfaNoneCount
      ];
      this.mfaChart.update();
    }

    if (this.postureChart) {
      const activeGuards = this.telemetry.totalUsers - this.telemetry.lockedOutCount;
      this.postureChart.data.datasets[0].data = [
        activeGuards,
        this.telemetry.lockedOutCount,
        this.telemetry.retryAlertsCount
      ];
      this.postureChart.update();
    }
  }
}
