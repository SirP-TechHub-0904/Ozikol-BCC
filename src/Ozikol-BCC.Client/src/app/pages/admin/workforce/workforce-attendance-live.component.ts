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
    .live-monitor-page { padding: 1.5rem; }
    .page-title { font-weight: 700; color: #1e293b; }
    .btn-primary { background-color: #0050E5; border-color: #0050E5; }
    .btn-primary:hover { background-color: #003db3; border-color: #003db3; }
    .live-pulse-dot {
      width: 10px; height: 10px; background-color: #22c55e; border-radius: 50%;
      display: inline-block; animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
      70% { box-shadow: 0 0 0 8px rgba(34, 197, 94, 0); }
      100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
    }
    .text-purple { color: #7c3aed; }
    .bg-purple-subtle { background-color: #f3e8ff; }
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

