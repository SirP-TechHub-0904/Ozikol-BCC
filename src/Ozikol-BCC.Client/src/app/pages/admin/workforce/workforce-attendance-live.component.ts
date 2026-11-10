import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { WorkforceService, LiveDutyMonitorItem } from '../../../core/services/workforce.service';
import { ToastService } from '../../../core/services/toast.service';

/**
 * Administrator Live Duty Monitor & Attendance Feed (`/workforce/console/attendance/live`).
 * Real-time operational map & telemetry feed showing active guards on site, geofence audit compliance,
 * missed clock-ins (>15m), and lone-worker hourly safety checks.
 */
@Component({
  selector: 'app-workforce-attendance-live',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="bcp-page-container">
      <!-- 1. Breadcrumbs & Header -->
      <div class="page-header">
        <div class="header-left">
          <div class="breadcrumb">
            <a routerLink="/admin/dashboard">Command Center</a>
            <span class="sep">/</span>
            <span>Workforce &amp; Shifts</span>
            <span class="sep">/</span>
            <span class="current">Live Attendance Monitor</span>
          </div>
          <div class="title-row">
            <h1>Live Site Attendance Monitor</h1>
            <div class="live-status-chip">
              <span class="live-pulse-dot"></span>
              <span class="live-text">LIVE TELEMETRY</span>
            </div>
            <span class="badge-suite">Suite: Workforce &amp; Shifts</span>
            <button
              type="button"
              class="info-badge-btn"
              (click)="showInfoModal = true"
              title="Click for Live Attendance & Geofence telemetry guide"
            >
              <span class="material-symbols-outlined">info</span>
            </button>
          </div>
          <p class="subtitle">
            Real-time telemetry of on-duty personnel, GPS geofence compliance, and lone worker safety check-calls.
          </p>
        </div>

        <div class="header-actions">
          <a routerLink="/workforce/console/schedule" class="btn btn-outline" title="Return to master rota grid">
            <span class="material-symbols-outlined">arrow_back</span>
            <span>Back to Rota</span>
          </a>
          <button type="button" class="btn btn-outline" (click)="loadMonitor()" title="Refresh telemetry feed">
            <span class="material-symbols-outlined" [class.spin]="isLoading">refresh</span>
            <span>Refresh Feed</span>
          </button>
          <a routerLink="/workforce/workspace/clock" class="btn btn-primary" title="Open on-site clock-in terminal">
            <span class="material-symbols-outlined">fingerprint</span>
            <span>Clock-In Terminal</span>
          </a>
        </div>
      </div>

      <!-- 2. KPI Telemetry Summary Cards -->
      <div class="kpi-grid">
        <!-- On-Duty Personnel -->
        <div class="kpi-card on-duty">
          <div class="kpi-header">
            <div class="kpi-icon-box on-duty">
              <span class="material-symbols-outlined">shield_person</span>
            </div>
            <span class="kpi-tag active">Active Rota</span>
          </div>
          <div class="kpi-value">{{ getActiveOnDutyCount() }}</div>
          <div class="kpi-label">On-Duty Personnel</div>
          <div class="kpi-sub">
            <span class="dot-indicator blue"></span>
            <span>Clocked in &amp; active on post</span>
          </div>
        </div>

        <!-- Geofence Verified -->
        <div class="kpi-card verified">
          <div class="kpi-header">
            <div class="kpi-icon-box verified">
              <span class="material-symbols-outlined">verified_user</span>
            </div>
            <span class="kpi-tag verified">100% In Bounds</span>
          </div>
          <div class="kpi-value text-success">{{ getVerifiedCount() }}</div>
          <div class="kpi-label">Geofence Verified</div>
          <div class="kpi-sub">
            <span class="dot-indicator green"></span>
            <span>Within authorized site perimeter</span>
          </div>
        </div>

        <!-- Geofence Audit Flags -->
        <div class="kpi-card flagged">
          <div class="kpi-header">
            <div class="kpi-icon-box flagged">
              <span class="material-symbols-outlined">warning</span>
            </div>
            <span class="kpi-tag flagged" *ngIf="getFlaggedCount() > 0">Action Required</span>
            <span class="kpi-tag safe" *ngIf="getFlaggedCount() === 0">Zero Violations</span>
          </div>
          <div class="kpi-value text-danger">{{ getFlaggedCount() }}</div>
          <div class="kpi-label">Geofence Flags</div>
          <div class="kpi-sub">
            <span class="dot-indicator red"></span>
            <span>Out-of-range or GPS deviation</span>
          </div>
        </div>

        <!-- Missed Clock-Ins (>15m) -->
        <div class="kpi-card missed">
          <div class="kpi-header">
            <div class="kpi-icon-box missed">
              <span class="material-symbols-outlined">schedule</span>
            </div>
            <span class="kpi-tag missed" *ngIf="getMissedCount() > 0">Overdue</span>
            <span class="kpi-tag on-time" *ngIf="getMissedCount() === 0">On Schedule</span>
          </div>
          <div class="kpi-value text-warning">{{ getMissedCount() }}</div>
          <div class="kpi-label">Missed Clock-Ins (>15m)</div>
          <div class="kpi-sub">
            <span class="dot-indicator amber"></span>
            <span>Past grace period threshold</span>
          </div>
        </div>
      </div>

      <!-- 3. Toolbar & View Switcher -->
      <div class="toolbar-card">
        <div class="toolbar-left">
          <div class="search-input-box">
            <span class="material-symbols-outlined">search</span>
            <input
              type="text"
              [(ngModel)]="searchQuery"
              placeholder="Search by personnel name, venue, or shift code..."
              class="search-input"
            />
            <button type="button" class="clear-search-btn" *ngIf="searchQuery" (click)="searchQuery = ''">&times;</button>
          </div>

          <select class="filter-dropdown" [(ngModel)]="selectedStatusFilter">
            <option value="">All Telemetry Statuses</option>
            <option value="on-duty">On Duty (In Progress)</option>
            <option value="verified">Geofence Verified</option>
            <option value="flagged">Geofence Flags Only</option>
            <option value="missed">Missed Clock-Ins (>15m)</option>
          </select>
        </div>

        <div class="toolbar-right">
          <span class="count-badge">{{ filteredFeed.length }} Active Feeds</span>
          <span class="last-sync-text">
            <span class="material-symbols-outlined">sync</span>
            Updated {{ lastRefreshedAt | date:'HH:mm:ss' }}
          </span>

          <div class="view-mode-toggle">
            <button
              type="button"
              class="view-btn"
              [class.active]="viewMode === 'cards'"
              (click)="viewMode = 'cards'"
              title="Cards View"
            >
              <span class="material-symbols-outlined">grid_view</span>
              <span>Cards</span>
            </button>
            <button
              type="button"
              class="view-btn"
              [class.active]="viewMode === 'table'"
              (click)="viewMode = 'table'"
              title="Table View"
            >
              <span class="material-symbols-outlined">table_rows</span>
              <span>Table</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 4. Loading State -->
      <div class="loading-state-card" *ngIf="isLoading && feed.length === 0">
        <div class="spinner-ring"></div>
        <p>Connecting to live GPS telemetry &amp; site attendance stream...</p>
      </div>

      <!-- 5. Beautiful Empty State -->
      <div class="empty-telemetry-card" *ngIf="!isLoading && filteredFeed.length === 0">
        <div class="radar-scan-box">
          <div class="radar-pulse-ring ring-1"></div>
          <div class="radar-pulse-ring ring-2"></div>
          <div class="radar-icon-center">
            <span class="material-symbols-outlined">sensors</span>
          </div>
        </div>
        <h3>All Sites Quiet &amp; Secure</h3>
        <p class="empty-sub">
          There are no personnel currently scheduled or clocked in within the active operational window.
        </p>
        <p class="empty-hint">
          Active duty personnel, live GPS geofence verifications, and lone-worker welfare check-calls will appear here automatically once shifts commence.
        </p>
        <div class="empty-actions">
          <a routerLink="/workforce/console/schedule" class="btn btn-outline">
            <span class="material-symbols-outlined">calendar_month</span>
            <span>View Shift Rota &amp; Schedule</span>
          </a>
          <a routerLink="/workforce/workspace/clock" class="btn btn-primary">
            <span class="material-symbols-outlined">fingerprint</span>
            <span>Launch Clock-In Terminal</span>
          </a>
          <button type="button" class="btn btn-outline" (click)="loadMonitor()">
            <span class="material-symbols-outlined">refresh</span>
            <span>Check Telemetry Feed</span>
          </button>
        </div>
      </div>

      <!-- 6. CARDS VIEW (When viewMode === 'cards') -->
      <div class="duty-cards-grid" *ngIf="!isLoading && viewMode === 'cards' && filteredFeed.length > 0">
        <div
          class="duty-monitor-card"
          *ngFor="let item of filteredFeed"
          [class.card-flagged]="item.isFlagged"
          [class.card-missed]="item.isMissedClockIn"
        >
          <!-- Card Header: Personnel & Status -->
          <div class="duty-card-header">
            <div class="guard-identity">
              <div class="guard-avatar">
                {{ getInitials(item.guardName) }}
              </div>
              <div class="guard-meta">
                <h4 class="guard-name">{{ item.guardName || 'Staff Member' }}</h4>
                <div class="guard-code-row">
                  <span class="shift-code-badge">{{ item.shiftCode }}</span>
                  <span class="overnight-chip" *ngIf="item.isOvernight">🌙 Overnight</span>
                </div>
              </div>
            </div>

            <div class="status-indicator">
              <span
                class="badge-status"
                [class.in-progress]="item.shiftStatus === 'InProgress'"
                [class.missed]="item.isMissedClockIn"
                [class.scheduled]="item.shiftStatus === 'Scheduled'"
              >
                {{ item.isMissedClockIn ? 'Missed Clock-In' : item.shiftStatus }}
              </span>
            </div>
          </div>

          <!-- Card Body: Site & Shift Details -->
          <div class="duty-card-body">
            <div class="detail-row">
              <span class="material-symbols-outlined icon">location_on</span>
              <div class="detail-content">
                <strong>{{ item.siteName }}</strong>
                <span>{{ item.postName }}</span>
              </div>
            </div>

            <div class="detail-row">
              <span class="material-symbols-outlined icon">schedule</span>
              <div class="detail-content">
                <strong>{{ item.startsAtUtc | date:'HH:mm' }} - {{ item.endsAtUtc | date:'HH:mm' }}</strong>
                <span>Scheduled Shift Window</span>
              </div>
            </div>

            <!-- Telemetry Badges Grid -->
            <div class="telemetry-badges-row">
              <!-- Clock-In Badge -->
              <div class="telemetry-pill" [class.success]="!!item.clockInUtc" [class.danger]="item.isMissedClockIn" [class.pending]="!item.clockInUtc && !item.isMissedClockIn">
                <span class="material-symbols-outlined">
                  {{ item.clockInUtc ? 'check_circle' : (item.isMissedClockIn ? 'error' : 'hourglass_empty') }}
                </span>
                <span>
                  {{ item.clockInUtc ? ('Clocked: ' + (item.clockInUtc | date:'HH:mm')) : (item.isMissedClockIn ? 'Missed (>15m)' : 'Awaiting Start') }}
                </span>
              </div>

              <!-- Geofence Badge -->
              <div class="telemetry-pill" [class.success]="item.isGeofenceVerified" [class.danger]="!item.isGeofenceVerified && item.clockInUtc" [class.neutral]="!item.clockInUtc">
                <span class="material-symbols-outlined">
                  {{ item.isGeofenceVerified ? 'verified' : (item.clockInUtc ? 'location_off' : 'radar') }}
                </span>
                <span>
                  {{ item.isGeofenceVerified ? ('Verified (' + item.distanceFromSiteMeters + 'm)') : (item.clockInUtc ? ('Out of Range (' + item.distanceFromSiteMeters + 'm)') : 'GPS Standby') }}
                </span>
              </div>
            </div>

            <!-- Lone Worker Safety Welfare Check -->
            <div class="welfare-status-box" *ngIf="item.clockInUtc">
              <div class="welfare-left">
                <span class="material-symbols-outlined text-blue">health_and_safety</span>
                <div>
                  <strong>Lone Worker Safety</strong>
                  <span *ngIf="item.lastWelfareCheckAtUtc">Last checked: {{ item.lastWelfareCheckAtUtc | date:'HH:mm' }}</span>
                  <span *ngIf="!item.lastWelfareCheckAtUtc" class="text-warning">Check-call pending</span>
                </div>
              </div>
              <button
                type="button"
                class="btn-welfare-call"
                (click)="performWelfareCheck(item)"
                [disabled]="isActionLoading === item.shiftId"
                title="Log verified welfare check-call with staff"
              >
                Log Check
              </button>
            </div>
          </div>

          <!-- Card Footer Actions -->
          <div class="duty-card-footer">
            <button
              *ngIf="!item.clockInUtc"
              type="button"
              class="btn btn-primary btn-sm flex-1"
              (click)="recordClockIn(item)"
              [disabled]="isActionLoading === item.shiftId"
            >
              <span class="material-symbols-outlined" *ngIf="isActionLoading !== item.shiftId">login</span>
              <span class="material-symbols-outlined spin" *ngIf="isActionLoading === item.shiftId">sync</span>
              <span>Supervisor Clock In</span>
            </button>

            <button
              *ngIf="item.clockInUtc && item.shiftStatus === 'InProgress'"
              type="button"
              class="btn btn-outline-danger btn-sm flex-1"
              (click)="recordClockOut(item)"
              [disabled]="isActionLoading === item.shiftId"
            >
              <span class="material-symbols-outlined" *ngIf="isActionLoading !== item.shiftId">logout</span>
              <span class="material-symbols-outlined spin" *ngIf="isActionLoading === item.shiftId">sync</span>
              <span>Clock Out Personnel</span>
            </button>

            <span class="duty-complete-tag" *ngIf="item.clockInUtc && item.shiftStatus !== 'InProgress'">
              ✓ Shift Completed
            </span>
          </div>
        </div>
      </div>

      <!-- 7. TABLE VIEW (When viewMode === 'table') -->
      <div class="table-card" *ngIf="!isLoading && viewMode === 'table' && filteredFeed.length > 0">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Personnel</th>
                <th>Post &amp; Site</th>
                <th>Shift Window</th>
                <th>Clock-In Status</th>
                <th>Geofence Verification</th>
                <th>Lone Worker Safety</th>
                <th>Status</th>
                <th style="text-align: right;">Supervisor Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of filteredFeed" [class.row-flagged]="item.isFlagged" [class.row-missed]="item.isMissedClockIn">
                <td>
                  <div class="user-cell">
                    <div class="table-avatar">{{ getInitials(item.guardName) }}</div>
                    <div>
                      <strong>{{ item.guardName || 'Staff Member' }}</strong>
                      <div class="user-sub font-mono">{{ item.shiftCode }}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div class="venue-cell">
                    <strong>{{ item.siteName }}</strong>
                    <span>{{ item.postName }}</span>
                  </div>
                </td>
                <td>
                  <div class="time-cell">
                    <span>{{ item.startsAtUtc | date:'HH:mm' }} - {{ item.endsAtUtc | date:'HH:mm' }}</span>
                    <span class="overnight-chip mini" *ngIf="item.isOvernight">🌙 Overnight</span>
                  </div>
                </td>
                <td>
                  <div *ngIf="item.clockInUtc">
                    <span class="badge-tag green">✓ {{ item.clockInUtc | date:'HH:mm' }}</span>
                  </div>
                  <div *ngIf="!item.clockInUtc">
                    <span class="badge-tag red" *ngIf="item.isMissedClockIn">⚠️ Missed (>15m)</span>
                    <span class="badge-tag gray" *ngIf="!item.isMissedClockIn">Awaiting Start</span>
                  </div>
                </td>
                <td>
                  <div *ngIf="item.clockInUtc">
                    <span class="badge-tag green" *ngIf="item.isGeofenceVerified">
                      <span class="material-symbols-outlined fs-icon">verified</span>
                      <span>Verified ({{ item.distanceFromSiteMeters }}m)</span>
                    </span>
                    <span class="badge-tag red" *ngIf="!item.isGeofenceVerified" [title]="item.flagReason || 'Outside perimeter'">
                      <span class="material-symbols-outlined fs-icon">location_off</span>
                      <span>Out of Range ({{ item.distanceFromSiteMeters }}m)</span>
                    </span>
                  </div>
                  <div *ngIf="!item.clockInUtc">
                    <span class="text-muted small">—</span>
                  </div>
                </td>
                <td>
                  <div *ngIf="item.lastWelfareCheckAtUtc">
                    <span class="welfare-text">Checked: {{ item.lastWelfareCheckAtUtc | date:'HH:mm' }}</span>
                  </div>
                  <div *ngIf="!item.lastWelfareCheckAtUtc && item.clockInUtc">
                    <button type="button" class="btn-mini-welfare" (click)="performWelfareCheck(item)">Log Check-Call</button>
                  </div>
                  <div *ngIf="!item.clockInUtc">
                    <span class="text-muted small">—</span>
                  </div>
                </td>
                <td>
                  <span class="badge-status" [class.in-progress]="item.shiftStatus === 'InProgress'" [class.scheduled]="item.shiftStatus === 'Scheduled'">
                    {{ item.shiftStatus }}
                  </span>
                </td>
                <td style="text-align: right;">
                  <div class="table-actions">
                    <button
                      *ngIf="!item.clockInUtc"
                      type="button"
                      class="btn btn-sm btn-primary"
                      (click)="recordClockIn(item)"
                      [disabled]="isActionLoading === item.shiftId"
                    >
                      <span class="material-symbols-outlined" *ngIf="isActionLoading !== item.shiftId">login</span>
                      <span class="material-symbols-outlined spin" *ngIf="isActionLoading === item.shiftId">sync</span>
                      <span>Clock In</span>
                    </button>
                    <button
                      *ngIf="item.clockInUtc && item.shiftStatus === 'InProgress'"
                      type="button"
                      class="btn btn-sm btn-outline-danger"
                      (click)="recordClockOut(item)"
                      [disabled]="isActionLoading === item.shiftId"
                    >
                      <span class="material-symbols-outlined" *ngIf="isActionLoading !== item.shiftId">logout</span>
                      <span class="material-symbols-outlined spin" *ngIf="isActionLoading === item.shiftId">sync</span>
                      <span>Clock Out</span>
                    </button>
                    <span class="duty-complete-tag" *ngIf="item.clockInUtc && item.shiftStatus !== 'InProgress'">
                      Completed
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 8. CONTEXTUAL INFO MODAL (i) -->
      <div class="modal-backdrop" *ngIf="showInfoModal" (click)="showInfoModal = false">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div class="modal-title-group">
              <span class="material-symbols-outlined text-blue">sensors</span>
              <div>
                <h3>Live Attendance Telemetry Guide</h3>
                <p class="modal-subtitle">Real-time GPS geofencing &amp; lone-worker compliance monitoring</p>
              </div>
            </div>
            <button type="button" class="btn-close" (click)="showInfoModal = false">&times;</button>
          </div>

          <div class="modal-body">
            <div class="info-guide-section">
              <div class="guide-icon-wrap"><span class="material-symbols-outlined">radar</span></div>
              <div>
                <h4>Real-Time Geofence Auditing</h4>
                <p>When personnel clock in via mobile or on-site terminal, the device GPS latitude/longitude is matched against the client site perimeter radius (50m - 500m). Checks inside the radius are tagged as <strong>Geofence Verified</strong>.</p>
              </div>
            </div>

            <div class="info-guide-section">
              <div class="guide-icon-wrap warning"><span class="material-symbols-outlined">warning</span></div>
              <div>
                <h4>Geofence Flags &amp; Deviations</h4>
                <p>Clock-ins attempted beyond the site radius or with GPS accuracy degradation (>100m) are automatically flagged as <strong>Out of Range</strong> to prevent buddy-punching or remote clock-ins.</p>
              </div>
            </div>

            <div class="info-guide-section">
              <div class="guide-icon-wrap alert"><span class="material-symbols-outlined">schedule</span></div>
              <div>
                <h4>Missed Clock-In Grace Period (>15m)</h4>
                <p>If a scheduled worker has not clocked in within 15 minutes of the designated shift start time, the system flags the roster slot as <strong>Missed (>15m)</strong> and alerts operations managers to dispatch relief.</p>
              </div>
            </div>

            <div class="info-guide-section">
              <div class="guide-icon-wrap blue"><span class="material-symbols-outlined">health_and_safety</span></div>
              <div>
                <h4>Lone Worker Safety Check-Calls</h4>
                <p>For high-risk or lone-worker assignments, hourly welfare checks are monitored. Operations supervisors can record verified welfare check-calls directly from this telemetry dashboard.</p>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-primary" (click)="showInfoModal = false">Got it, Close</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .bcp-page-container {
      padding: 1.5rem 2rem;
      background-color: #f8fafc;
      min-height: calc(100vh - 70px);
      box-sizing: border-box;
      max-width: 100%;
    }

    /* Breadcrumbs & Header */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.5rem;
      gap: 1.5rem;
      flex-wrap: wrap;
    }
    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8125rem;
      color: #64748b;
      margin-bottom: 0.5rem;
    }
    .breadcrumb a {
      color: #0050e5;
      text-decoration: none;
      font-weight: 600;
    }
    .breadcrumb a:hover {
      text-decoration: underline;
    }
    .breadcrumb .sep {
      color: #cbd5e1;
    }
    .breadcrumb .current {
      color: #0f172a;
      font-weight: 600;
    }
    .title-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.25rem;
      flex-wrap: wrap;
    }
    .title-row h1 {
      font-size: 1.5rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
      letter-spacing: -0.02em;
    }
    .badge-suite {
      font-size: 0.6875rem;
      font-weight: 700;
      background: #eff6ff;
      color: #0050e5;
      padding: 0.2rem 0.6rem;
      border-radius: 9999px;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      border: 1px solid #dbeafe;
    }
    .live-status-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      padding: 3px 10px;
      border-radius: 9999px;
    }
    .live-text {
      font-size: 11px;
      font-weight: 800;
      color: #16a34a;
      letter-spacing: 0.04em;
    }
    .live-pulse-dot {
      width: 8px;
      height: 8px;
      background-color: #22c55e;
      border-radius: 50%;
      display: inline-block;
      animation: pulse 1.8s infinite;
    }
    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
      70% { box-shadow: 0 0 0 7px rgba(34, 197, 94, 0); }
      100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
    }
    .info-badge-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: #64748b;
      padding: 2px;
      display: flex;
      align-items: center;
      border-radius: 50%;
      transition: color 0.15s ease;
    }
    .info-badge-btn:hover {
      color: #0050e5;
    }
    .subtitle {
      font-size: 0.875rem;
      color: #64748b;
      margin: 0;
    }
    .header-actions {
      display: flex;
      gap: 0.75rem;
      align-items: center;
      flex-wrap: wrap;
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 1.125rem;
      font-size: 0.875rem;
      font-weight: 600;
      border-radius: 0.5rem;
      cursor: pointer;
      transition: all 0.15s ease;
      text-decoration: none;
      border: 1px solid transparent;
      line-height: 1;
    }
    .btn-sm {
      padding: 0.45rem 0.85rem;
      font-size: 0.8125rem;
    }
    .btn-primary {
      background-color: #0050e5;
      color: #ffffff;
      border-color: #0050e5;
    }
    .btn-primary:hover {
      background-color: #003db3;
    }
    .btn-outline {
      background-color: #ffffff;
      color: #334155;
      border-color: #cbd5e1;
    }
    .btn-outline:hover {
      background-color: #f8fafc;
      border-color: #94a3b8;
    }
    .btn-outline-danger {
      background-color: #ffffff;
      color: #dc2626;
      border-color: #fca5a5;
    }
    .btn-outline-danger:hover {
      background-color: #fef2f2;
      border-color: #dc2626;
    }

    /* KPI Summary Cards Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1.25rem;
      margin-bottom: 1.5rem;
    }
    @media (max-width: 1024px) {
      .kpi-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    @media (max-width: 640px) {
      .kpi-grid {
        grid-template-columns: 1fr;
      }
    }
    .kpi-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
      padding: 1.25rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      display: flex;
      flex-direction: column;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }
    .kpi-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
    }
    .kpi-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    }
    .kpi-icon-box {
      width: 42px;
      height: 42px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .kpi-icon-box.on-duty {
      background: #eff6ff;
      color: #0050e5;
    }
    .kpi-icon-box.verified {
      background: #f0fdf4;
      color: #16a34a;
    }
    .kpi-icon-box.flagged {
      background: #fef2f2;
      color: #dc2626;
    }
    .kpi-icon-box.missed {
      background: #fffbeb;
      color: #d97706;
    }
    .kpi-tag {
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
    }
    .kpi-tag.active { background: #eff6ff; color: #0050e5; }
    .kpi-tag.verified { background: #f0fdf4; color: #16a34a; }
    .kpi-tag.flagged { background: #fef2f2; color: #dc2626; }
    .kpi-tag.safe { background: #f8fafc; color: #64748b; }
    .kpi-tag.missed { background: #fef2f2; color: #dc2626; }
    .kpi-tag.on-time { background: #f0fdf4; color: #16a34a; }
    .kpi-value {
      font-size: 1.75rem;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.2;
      margin-bottom: 0.25rem;
    }
    .kpi-label {
      font-size: 0.8125rem;
      font-weight: 600;
      color: #64748b;
      margin-bottom: 0.5rem;
    }
    .kpi-sub {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.75rem;
      color: #64748b;
      margin-top: auto;
      padding-top: 0.5rem;
      border-top: 1px dashed #f1f5f9;
    }
    .dot-indicator {
      width: 7px;
      height: 7px;
      border-radius: 50%;
    }
    .dot-indicator.blue { background-color: #0050e5; }
    .dot-indicator.green { background-color: #16a34a; }
    .dot-indicator.red { background-color: #dc2626; }
    .dot-indicator.amber { background-color: #d97706; }

    /* Toolbar & Search */
    .toolbar-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
      padding: 0.875rem 1.25rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .toolbar-left {
      display: flex;
      align-items: center;
      gap: 0.875rem;
      flex: 1;
      min-width: 280px;
      flex-wrap: wrap;
    }
    .search-input-box {
      position: relative;
      display: flex;
      align-items: center;
      flex: 1;
      min-width: 260px;
      max-width: 440px;
    }
    .search-input-box .material-symbols-outlined {
      position: absolute;
      left: 12px;
      color: #94a3b8;
      font-size: 20px;
    }
    .search-input {
      width: 100%;
      padding: 0.55rem 2.25rem 0.55rem 2.5rem;
      font-size: 0.875rem;
      border: 1px solid #cbd5e1;
      border-radius: 0.5rem;
      outline: none;
      background: #ffffff;
    }
    .search-input:focus {
      border-color: #0050e5;
      box-shadow: 0 0 0 2px rgba(0, 80, 229, 0.12);
    }
    .clear-search-btn {
      position: absolute;
      right: 10px;
      background: none;
      border: none;
      font-size: 16px;
      color: #94a3b8;
      cursor: pointer;
    }
    .filter-dropdown {
      padding: 0.55rem 1rem;
      font-size: 0.875rem;
      border: 1px solid #cbd5e1;
      border-radius: 0.5rem;
      background: #ffffff;
      color: #334155;
      font-weight: 500;
      outline: none;
      cursor: pointer;
    }
    .filter-dropdown:focus {
      border-color: #0050e5;
    }
    .toolbar-right {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .count-badge {
      font-size: 0.75rem;
      font-weight: 700;
      background: #f1f5f9;
      color: #475569;
      padding: 0.35rem 0.75rem;
      border-radius: 0.375rem;
    }
    .last-sync-text {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.75rem;
      color: #94a3b8;
    }
    .last-sync-text span {
      font-size: 14px;
    }
    .view-mode-toggle {
      display: flex;
      background: #f1f5f9;
      padding: 3px;
      border-radius: 0.5rem;
      gap: 2px;
    }
    .view-btn {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.4rem 0.75rem;
      border: none;
      background: transparent;
      border-radius: 0.375rem;
      font-size: 0.8125rem;
      font-weight: 600;
      color: #64748b;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .view-btn span.material-symbols-outlined {
      font-size: 18px;
    }
    .view-btn.active {
      background: #ffffff;
      color: #0050e5;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    /* Loading State */
    .loading-state-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
      padding: 3rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      color: #64748b;
    }
    .spinner-ring {
      width: 36px;
      height: 36px;
      border: 3px solid #e2e8f0;
      border-top-color: #0050e5;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    /* Modern Telemetry Empty State */
    .empty-telemetry-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
      padding: 4rem 2rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }
    .radar-scan-box {
      position: relative;
      width: 80px;
      height: 80px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1.5rem;
    }
    .radar-icon-center {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: #eff6ff;
      color: #0050e5;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      z-index: 2;
    }
    .radar-icon-center span {
      font-size: 32px;
    }
    .radar-pulse-ring {
      position: absolute;
      border-radius: 50%;
      border: 2px solid #93c5fd;
      animation: ripple 2.5s cubic-bezier(0.2, 0.8, 0.2, 1) infinite;
    }
    .radar-pulse-ring.ring-1 { width: 68px; height: 68px; }
    .radar-pulse-ring.ring-2 { width: 84px; height: 84px; animation-delay: 0.8s; }
    @keyframes ripple {
      0% { transform: scale(0.8); opacity: 1; }
      100% { transform: scale(1.4); opacity: 0; }
    }
    .empty-telemetry-card h3 {
      font-size: 1.25rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 0.5rem 0;
    }
    .empty-sub {
      font-size: 0.9375rem;
      color: #475569;
      margin: 0 0 0.5rem 0;
      max-width: 520px;
    }
    .empty-hint {
      font-size: 0.8125rem;
      color: #94a3b8;
      max-width: 560px;
      margin: 0 0 1.75rem 0;
      line-height: 1.5;
    }
    .empty-actions {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
      justify-content: center;
    }

    /* Cards Grid View */
    .duty-cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 1.25rem;
    }
    .duty-monitor-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
      display: flex;
      flex-direction: column;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      transition: all 0.15s ease;
      overflow: hidden;
    }
    .duty-monitor-card:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      border-color: #cbd5e1;
    }
    .duty-monitor-card.card-flagged {
      border-left: 4px solid #dc2626;
      background: #fffcfc;
    }
    .duty-monitor-card.card-missed {
      border-left: 4px solid #d97706;
      background: #fffdfa;
    }
    .duty-card-header {
      padding: 1.25rem;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1px solid #f1f5f9;
      background: #fafafa;
    }
    .guard-identity {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .guard-avatar {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: #0050e5;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 15px;
      font-weight: 700;
    }
    .guard-meta {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .guard-name {
      font-size: 0.95rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }
    .guard-code-row {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .shift-code-badge {
      font-size: 11px;
      font-family: monospace;
      color: #64748b;
      background: #f1f5f9;
      padding: 1px 6px;
      border-radius: 4px;
    }
    .overnight-chip {
      font-size: 10px;
      font-weight: 700;
      color: #7c3aed;
      background: #f5f3ff;
      border: 1px solid #ddd6fe;
      padding: 1px 6px;
      border-radius: 4px;
    }
    .overnight-chip.mini {
      font-size: 9px;
      padding: 1px 4px;
    }

    .badge-status {
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
      background: #f1f5f9;
      color: #475569;
    }
    .badge-status.in-progress {
      background: #eff6ff;
      color: #0050e5;
      border: 1px solid #dbeafe;
    }
    .badge-status.missed {
      background: #fef2f2;
      color: #dc2626;
      border: 1px solid #fecaca;
    }
    .badge-status.scheduled {
      background: #f8fafc;
      color: #64748b;
      border: 1px solid #e2e8f0;
    }

    .duty-card-body {
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.875rem;
      flex: 1;
    }
    .detail-row {
      display: flex;
      align-items: flex-start;
      gap: 0.625rem;
    }
    .detail-row .icon {
      font-size: 18px;
      color: #64748b;
      margin-top: 2px;
    }
    .detail-content {
      display: flex;
      flex-direction: column;
    }
    .detail-content strong {
      font-size: 0.875rem;
      color: #0f172a;
    }
    .detail-content span {
      font-size: 0.75rem;
      color: #64748b;
    }

    .telemetry-badges-row {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      margin-top: 0.25rem;
    }
    .telemetry-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11.5px;
      font-weight: 600;
      padding: 4px 8px;
      border-radius: 6px;
      background: #f1f5f9;
      color: #475569;
    }
    .telemetry-pill span.material-symbols-outlined {
      font-size: 16px;
    }
    .telemetry-pill.success {
      background: #f0fdf4;
      color: #16a34a;
      border: 1px solid #bbf7d0;
    }
    .telemetry-pill.danger {
      background: #fef2f2;
      color: #dc2626;
      border: 1px solid #fecaca;
    }
    .telemetry-pill.pending {
      background: #fffbeb;
      color: #d97706;
      border: 1px solid #fde68a;
    }
    .telemetry-pill.neutral {
      background: #f8fafc;
      color: #94a3b8;
      border: 1px solid #e2e8f0;
    }

    /* Welfare Status Box */
    .welfare-status-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      padding: 0.75rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
      margin-top: 0.25rem;
    }
    .welfare-left {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .welfare-left span.material-symbols-outlined {
      font-size: 20px;
    }
    .welfare-left div {
      display: flex;
      flex-direction: column;
    }
    .welfare-left strong {
      font-size: 0.75rem;
      color: #0f172a;
    }
    .welfare-left span {
      font-size: 0.6875rem;
      color: #64748b;
    }
    .btn-welfare-call {
      padding: 0.35rem 0.65rem;
      font-size: 0.6875rem;
      font-weight: 700;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      cursor: pointer;
      color: #0050e5;
      transition: all 0.15s ease;
    }
    .btn-welfare-call:hover {
      background: #eff6ff;
      border-color: #93c5fd;
    }

    .duty-card-footer {
      padding: 0.875rem 1.25rem;
      background: #f8fafc;
      border-top: 1px solid #f1f5f9;
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }
    .flex-1 { flex: 1; justify-content: center; }
    .duty-complete-tag {
      font-size: 11px;
      font-weight: 700;
      color: #16a34a;
      background: #f0fdf4;
      padding: 4px 8px;
      border-radius: 4px;
      margin: 0 auto;
    }

    /* Table View */
    .table-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      overflow: hidden;
    }
    .table-responsive {
      width: 100%;
      overflow-x: auto;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.8125rem;
    }
    .data-table th {
      background: #f8fafc;
      text-align: left;
      padding: 0.875rem 1rem;
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
      border-bottom: 1px solid #e2e8f0;
    }
    .data-table td {
      padding: 0.875rem 1rem;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
      color: #1e293b;
    }
    .data-table tbody tr:hover {
      background: #f8fafc;
    }
    .row-flagged { background: #fffcfc !important; }
    .row-missed { background: #fffdfa !important; }

    .user-cell {
      display: flex;
      align-items: center;
      gap: 0.625rem;
    }
    .table-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #0050e5;
      color: #ffffff;
      font-size: 12px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .user-sub {
      font-size: 0.6875rem;
      color: #64748b;
    }
    .font-mono { font-family: monospace; }
    .venue-cell, .time-cell {
      display: flex;
      flex-direction: column;
    }
    .venue-cell strong, .time-cell span {
      font-size: 0.8125rem;
    }
    .venue-cell span {
      font-size: 0.6875rem;
      color: #64748b;
    }
    .badge-tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 4px;
    }
    .badge-tag.green { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
    .badge-tag.red { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
    .badge-tag.gray { background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0; }
    .fs-icon { font-size: 14px; }
    .welfare-text { font-size: 0.75rem; color: #64748b; }
    .btn-mini-welfare {
      padding: 2px 6px;
      font-size: 0.6875rem;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      border-radius: 4px;
      color: #0050e5;
      cursor: pointer;
    }
    .table-actions {
      display: flex;
      gap: 0.5rem;
      justify-content: flex-end;
    }

    /* Modal / Popover Guide */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.45);
      backdrop-filter: blur(2px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1050;
      padding: 1rem;
    }
    .modal-card {
      background: #ffffff;
      border-radius: 0.75rem;
      width: 100%;
      max-width: 580px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #e2e8f0;
    }
    .modal-title-group {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .modal-title-group h3 {
      font-size: 1.125rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }
    .modal-subtitle {
      font-size: 0.75rem;
      color: #64748b;
      margin: 0.15rem 0 0 0;
    }
    .btn-close {
      background: none;
      border: none;
      font-size: 1.5rem;
      color: #94a3b8;
      cursor: pointer;
    }
    .modal-body {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      max-height: 70vh;
      overflow-y: auto;
    }
    .info-guide-section {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
    }
    .guide-icon-wrap {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      background: #eff6ff;
      color: #0050e5;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .guide-icon-wrap.warning { background: #fffbeb; color: #d97706; }
    .guide-icon-wrap.alert { background: #fef2f2; color: #dc2626; }
    .guide-icon-wrap.blue { background: #eff6ff; color: #0050e5; }
    .info-guide-section h4 {
      font-size: 0.9375rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 0.25rem 0;
    }
    .info-guide-section p {
      font-size: 0.8125rem;
      color: #475569;
      line-height: 1.5;
      margin: 0;
    }
    .modal-footer {
      padding: 1rem 1.5rem;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: flex-end;
    }

    .spin {
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      100% { transform: rotate(360deg); }
    }
  `]
})
export class WorkforceAttendanceLiveComponent implements OnInit, OnDestroy {
  feed: LiveDutyMonitorItem[] = [];
  isLoading = false;
  isActionLoading: string | null = null;
  private pollTimer: any;

  // View & Filter State
  viewMode: 'cards' | 'table' = 'cards';
  searchQuery: string = '';
  selectedStatusFilter: string = '';
  showInfoModal: boolean = false;
  lastRefreshedAt: Date = new Date();

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
        this.lastRefreshedAt = new Date();
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  get filteredFeed(): LiveDutyMonitorItem[] {
    let list = this.feed;

    if (this.selectedStatusFilter) {
      if (this.selectedStatusFilter === 'on-duty') {
        list = list.filter(f => !!f.clockInUtc && f.shiftStatus === 'InProgress');
      } else if (this.selectedStatusFilter === 'verified') {
        list = list.filter(f => f.isGeofenceVerified);
      } else if (this.selectedStatusFilter === 'flagged') {
        list = list.filter(f => f.isFlagged);
      } else if (this.selectedStatusFilter === 'missed') {
        list = list.filter(f => f.isMissedClockIn);
      }
    }

    if (this.searchQuery && this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(f =>
        (f.guardName && f.guardName.toLowerCase().includes(q)) ||
        (f.siteName && f.siteName.toLowerCase().includes(q)) ||
        (f.postName && f.postName.toLowerCase().includes(q)) ||
        (f.shiftCode && f.shiftCode.toLowerCase().includes(q))
      );
    }

    return list;
  }

  getInitials(name?: string): string {
    if (!name || name === 'undefined' || name.trim() === '') return 'WR';
    const parts = name.trim().split(/\s+/).filter(p => p.length > 0 && p.toLowerCase() !== 'undefined');
    if (parts.length === 0) return 'WR';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  recordClockIn(item: LiveDutyMonitorItem): void {
    if (!item.shiftId || this.isActionLoading) return;
    this.isActionLoading = item.shiftId;
    this.workforceService.clockIn({
      shiftId: item.shiftId,
      method: 'SupervisorDirectAttendance'
    }).subscribe({
      next: () => {
        this.isActionLoading = null;
        this.toast.success(`Clock-in recorded for ${item.guardName || 'Staff Member'}`);
        this.loadMonitor(true);
      },
      error: (err: any) => {
        this.isActionLoading = null;
        this.toast.error(err?.error?.message || 'Failed to record clock-in.');
      }
    });
  }

  recordClockOut(item: LiveDutyMonitorItem): void {
    if (!item.shiftId || this.isActionLoading) return;
    this.isActionLoading = item.shiftId;
    this.workforceService.clockOut({
      shiftId: item.shiftId,
      method: 'SupervisorDirectAttendance'
    }).subscribe({
      next: () => {
        this.isActionLoading = null;
        this.toast.success(`Clock-out recorded for ${item.guardName || 'Staff Member'}`);
        this.loadMonitor(true);
      },
      error: (err: any) => {
        this.isActionLoading = null;
        this.toast.error(err?.error?.message || 'Failed to record clock-out.');
      }
    });
  }

  performWelfareCheck(item: LiveDutyMonitorItem): void {
    if (!item.shiftId || this.isActionLoading) return;
    this.isActionLoading = item.shiftId;
    this.workforceService.confirmWelfareCheck(item.shiftId).subscribe({
      next: () => {
        this.isActionLoading = null;
        this.toast.success(`Welfare check-call recorded for ${item.guardName || 'Staff Member'}`);
        this.loadMonitor(true);
      },
      error: (err: any) => {
        this.isActionLoading = null;
        this.toast.error(err?.error?.message || 'Failed to record welfare check.');
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
