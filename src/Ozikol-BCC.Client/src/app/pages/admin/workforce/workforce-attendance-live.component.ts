import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { WorkforceService, LiveDutyMonitorItem } from '../../../core/services/workforce.service';
import { ToastService } from '../../../core/services/toast.service';

/**
 * Administrator Live Duty Monitor & Attendance Feed (`/admin/attendance/live`).
 * Real-time operational map & table showing active guards on site, geofence audit flags,
 * missed clock-ins (>15m), and lone-worker hourly safety checks.
 */
@Component({
  selector: 'app-workforce-attendance-live',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="live-monitor-page">
      <!-- Header -->
      <div class="page-header d-flex align-items-center justify-content-between mb-4">
        <div>
          <div class="d-flex align-items-center gap-2">
            <h2 class="page-title m-0">Live Site Attendance Monitor</h2>
            <span class="live-pulse-dot" title="Live Polling Active"></span>
          </div>
          <p class="text-muted m-0 mt-1">Real-time telemetry of on-duty security officers, geofence compliance, and safety check-calls.</p>
        </div>
        <div class="d-flex gap-2">
          <button class="btn btn-outline-primary d-flex align-items-center gap-1" (click)="loadMonitor()">
            <span class="material-symbols-outlined">refresh</span> Refresh Feed
          </button>
          <a class="btn btn-primary d-flex align-items-center gap-1" routerLink="/workforce/console/schedule">
            <span class="material-symbols-outlined">calendar_month</span> Rota Calendar
          </a>
        </div>
      </div>

      <!-- KPI Summary Cards -->
      <div class="row g-3 mb-4">
        <div class="col-md-3">
          <div class="kpi-card p-3 rounded shadow-sm bg-white border-start border-4 border-primary">
            <span class="text-muted small text-uppercase fw-semibold">On-Duty Officers</span>
            <h3 class="fw-bold m-0 mt-1 text-primary">{{ getActiveOnDutyCount() }}</h3>
          </div>
        </div>
        <div class="col-md-3">
          <div class="kpi-card p-3 rounded shadow-sm bg-white border-start border-4 border-success">
            <span class="text-muted small text-uppercase fw-semibold">Geofence Verified</span>
            <h3 class="fw-bold m-0 mt-1 text-success">{{ getVerifiedCount() }}</h3>
          </div>
        </div>
        <div class="col-md-3">
          <div class="kpi-card p-3 rounded shadow-sm bg-white border-start border-4 border-danger">
            <span class="text-muted small text-uppercase fw-semibold">Geofence Flags</span>
            <h3 class="fw-bold m-0 mt-1 text-danger">{{ getFlaggedCount() }}</h3>
          </div>
        </div>
        <div class="col-md-3">
          <div class="kpi-card p-3 rounded shadow-sm bg-white border-start border-4 border-warning">
            <span class="text-muted small text-uppercase fw-semibold">Missed Clock-Ins (>15m)</span>
            <h3 class="fw-bold m-0 mt-1 text-warning">{{ getMissedCount() }}</h3>
          </div>
        </div>
      </div>

      <!-- Live Table Card -->
      <div class="card border-0 shadow-sm rounded p-3 bg-white">
        <div class="table-responsive" *ngIf="!isLoading && feed.length > 0">
          <table class="table table-hover align-middle m-0">
            <thead class="table-light">
              <tr>
                <th>Officer</th>
                <th>Post & Site</th>
                <th>Shift Hours</th>
                <th>Clocked In</th>
                <th>Geofence Verification</th>
                <th>Lone Worker Safety</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of feed" [class.table-warning]="item.isMissedClockIn" [class.table-danger-subtle]="item.isFlagged">
                <td>
                  <div class="fw-bold">{{ item.guardName }}</div>
                  <small class="text-muted font-monospace">{{ item.shiftCode }}</small>
                </td>
                <td>
                  <div class="fw-medium">{{ item.siteName }}</div>
                  <small class="text-muted">{{ item.postName }}</small>
                </td>
                <td>
                  <div>{{ item.startsAtUtc | date:'HH:mm' }} - {{ item.endsAtUtc | date:'HH:mm' }}</div>
                  <small class="badge bg-purple-subtle text-purple" *ngIf="item.isOvernight">🌙 Overnight</small>
                </td>
                <td>
                  <div *ngIf="item.clockInUtc">
                    <span class="fw-medium text-success">✓ {{ item.clockInUtc | date:'HH:mm' }}</span>
                  </div>
                  <div *ngIf="!item.clockInUtc">
                    <span class="badge bg-danger" *ngIf="item.isMissedClockIn">⚠️ Missed (>15m)</span>
                    <span class="badge bg-light text-muted border" *ngIf="!item.isMissedClockIn">Awaiting Start</span>
                  </div>
                </td>
                <td>
                  <div *ngIf="item.clockInUtc">
                    <span class="badge bg-success-subtle text-success d-inline-flex align-items-center gap-1" *ngIf="item.isGeofenceVerified">
                      <span class="material-symbols-outlined fs-6">verified</span> Verified ({{ item.distanceFromSiteMeters }}m)
                    </span>
                    <span class="badge bg-danger text-white d-inline-flex align-items-center gap-1" *ngIf="!item.isGeofenceVerified" [title]="item.flagReason || 'Outside site perimeter'">
                      <span class="material-symbols-outlined fs-6">location_off</span> Out of Range ({{ item.distanceFromSiteMeters }}m)
                    </span>
                  </div>
                  <div *ngIf="!item.clockInUtc">
                    <span class="text-muted small">—</span>
                  </div>
                </td>
                <td>
                  <div *ngIf="item.lastWelfareCheckAtUtc">
                    <span class="small text-muted">Checked: {{ item.lastWelfareCheckAtUtc | date:'HH:mm' }}</span>
                  </div>
                  <div *ngIf="!item.lastWelfareCheckAtUtc && item.clockInUtc">
                    <span class="badge bg-warning-subtle text-warning">Check Pending</span>
                  </div>
                  <div *ngIf="!item.clockInUtc">
                    <span class="text-muted small">—</span>
                  </div>
                </td>
                <td>
                  <span class="badge" [ngClass]="item.shiftStatus === 'InProgress' ? 'bg-primary' : 'bg-secondary'">{{ item.shiftStatus }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="text-center p-5" *ngIf="!isLoading && feed.length === 0">
          <span class="material-symbols-outlined display-4 text-muted mb-3">shield_person</span>
          <h5>No officers currently scheduled on duty</h5>
          <p class="text-muted">Active and upcoming shifts within the operational window will appear here automatically.</p>
        </div>

        <div class="text-center p-5" *ngIf="isLoading">
          <div class="spinner-border text-primary" role="status"></div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .live-monitor-page {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }
    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 16px;
    }
    .page-title {
      font-size: 22px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.4px;
      margin: 0;
    }
    .text-muted {
      color: #64748b !important;
      font-size: 13.5px;
    }
    .live-pulse-dot {
      width: 10px;
      height: 10px;
      background-color: #22c55e;
      border-radius: 50%;
      display: inline-block;
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
      70% { box-shadow: 0 0 0 8px rgba(34, 197, 94, 0); }
      100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 13px;
      padding: 8px 16px;
      border-radius: 8px;
      border: 1px solid transparent;
      cursor: pointer;
      transition: all 0.15s ease;
      text-decoration: none;
    }
    .btn-primary {
      background: #0050e5;
      color: #ffffff;
      border-color: #0050e5;
    }
    .btn-primary:hover {
      background: #003db3;
      border-color: #003db3;
    }
    .btn-outline-primary {
      background: #ffffff;
      color: #0050e5;
      border-color: #0050e5;
    }
    .btn-outline-primary:hover {
      background: #eff6ff;
    }

    /* KPI Summary Grid */
    .row {
      display: flex;
      flex-wrap: wrap;
      margin: -8px;
    }
    .g-3 > [class*="col"] {
      padding: 8px;
      box-sizing: border-box;
    }
    .col-md-3 {
      flex: 0 0 25%;
      max-width: 25%;
    }
    @media (max-width: 992px) {
      .col-md-3 { flex: 0 0 50%; max-width: 50%; }
    }
    @media (max-width: 576px) {
      .col-md-3 { flex: 0 0 100%; max-width: 100%; }
    }
    .kpi-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      display: flex;
      flex-direction: column;
    }
    .border-start { border-left-width: 4px !important; border-left-style: solid !important; }
    .border-primary { border-left-color: #0050e5 !important; }
    .border-success { border-left-color: #16a34a !important; }
    .border-danger { border-left-color: #dc2626 !important; }
    .border-warning { border-left-color: #f59e0b !important; }

    /* Feed Table Card */
    .card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }
    .table-responsive {
      width: 100%;
      overflow-x: auto;
    }
    .table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .table th {
      text-align: left;
      padding: 12px 14px;
      font-size: 11.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      color: #64748b;
      border-bottom: 1px solid #e2e8f0;
      background: #f8fafc;
    }
    .table td {
      padding: 12px 14px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
      color: #1e293b;
    }
    .table-hover tbody tr:hover {
      background: #f8fafc;
    }
    .table-warning {
      background: #fffbeb !important;
    }
    .table-danger-subtle {
      background: #fef2f2 !important;
    }

    /* Badges & Helpers */
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
    }
    .bg-primary { background: #0050e5 !important; color: #ffffff !important; }
    .bg-success { background: #16a34a !important; color: #ffffff !important; }
    .bg-warning { background: #f59e0b !important; color: #ffffff !important; }
    .bg-danger { background: #dc2626 !important; color: #ffffff !important; }
    .bg-secondary { background: #64748b !important; color: #ffffff !important; }
    .bg-light { background: #f1f5f9 !important; color: #475569 !important; }
    .bg-purple-subtle { background: #faf5ff; border: 1px solid #e9d5ff; }
    .text-purple { color: #9333ea; }
    .bg-success-subtle { background: #f0fdf4; border: 1px solid #bbf7d0; }
    .bg-warning-subtle { background: #fffbeb; border: 1px solid #fde68a; }
    .text-primary { color: #0050e5 !important; }
    .text-success { color: #16a34a !important; }
    .text-danger { color: #dc2626 !important; }
    .text-warning { color: #d97706 !important; }
    .font-monospace { font-family: monospace; }
    .fw-bold { font-weight: 700; }
    .fw-semibold { font-weight: 600; }
    .fw-medium { font-weight: 500; }
    .fs-6 { font-size: 16px; }
    .small { font-size: 12px; }
    .text-uppercase { text-transform: uppercase; }
    .d-flex { display: flex; }
    .align-items-center { align-items: center; }
    .justify-content-between { justify-content: space-between; }
    .gap-1 { gap: 4px; }
    .gap-2 { gap: 8px; }
    .m-0 { margin: 0; }
    .mt-1 { margin-top: 4px; }
    .mb-3 { margin-bottom: 12px; }
    .mb-4 { margin-bottom: 24px; }
    .p-3 { padding: 16px; }
    .p-5 { padding: 48px; }
    .border { border: 1px solid #e2e8f0; }
    .border-0 { border: none !important; }
    .rounded { border-radius: 8px; }
    .shadow-sm { box-shadow: 0 1px 3px rgba(0,0,0,0.04); }

    /* Empty state */
    .empty-state {
      text-align: center;
      padding: 60px 20px;
    }

    /* Dark Mode */
    :host-context(.dark-mode) .live-monitor-page { color: #f8fafc; }
    :host-context(.dark-mode) .page-title { color: #f8fafc; }
    :host-context(.dark-mode) .kpi-card,
    :host-context(.dark-mode) .card {
      background: #1e293b;
      border-color: rgba(255,255,255,0.08);
      color: #f8fafc;
    }
    :host-context(.dark-mode) .table th {
      background: #0f172a;
      color: #94a3b8;
      border-bottom-color: #334155;
    }
    :host-context(.dark-mode) .table td {
      border-bottom-color: rgba(255,255,255,0.06);
      color: #e2e8f0;
    }
  `]
})
export class WorkforceAttendanceLiveComponent implements OnInit, OnDestroy {
  feed: LiveDutyMonitorItem[] = [];
  isLoading = false;
  private pollTimer: any;

  constructor(
    private readonly workforceService: WorkforceService,
    private readonly toast: ToastService
  ) {}

  ngOnInit(): void {
    this.loadMonitor();
    this.pollTimer = setInterval(() => this.loadMonitor(true), 30000);
  }

  ngOnDestroy(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
  }

  loadMonitor(silent = false): void {
    if (!silent) this.isLoading = true;
    this.workforceService.getLiveDutyMonitor().subscribe({
      next: (res: any) => {
        this.feed = res?.data || [];
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  getActiveOnDutyCount(): number {
    return this.feed.filter(f => !!f.clockInUtc && f.shiftStatus === 'InProgress').length;
  }

  getVerifiedCount(): number {
    return this.feed.filter(f => f.isGeofenceVerified).length;
  }

  getFlaggedCount(): number {
    return this.feed.filter(f => f.isFlagged).length;
  }

  getMissedCount(): number {
    return this.feed.filter(f => f.isMissedClockIn).length;
  }
}

