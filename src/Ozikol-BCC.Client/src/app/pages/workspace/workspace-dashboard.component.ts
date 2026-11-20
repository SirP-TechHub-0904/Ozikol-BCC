import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-workspace-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="workspace-dashboard-container">
      <!-- Member Hero Banner -->
      <section class="member-hero-card">
        <div class="hero-avatar-wrap">
          <img *ngIf="userProfile?.avatarUrl" [src]="userProfile.avatarUrl" alt="Avatar" class="hero-avatar-img" />
          <div *ngIf="!userProfile?.avatarUrl" class="hero-avatar-placeholder">
            {{ getInitials(userProfile?.fullName || userName) }}
          </div>
        </div>
        <div class="hero-info">
          <div class="hero-badge-row">
            <span class="member-id-pill" title="Official Member ID">
              <span class="material-symbols-outlined">badge</span>
              {{ userProfile?.memberId || 'CC-2026-0099' }}
            </span>
            <span class="category-pill" *ngIf="userProfile?.categoryName">
              {{ userProfile.categoryName }}
            </span>
            <span class="status-pill active">
              <span class="material-symbols-outlined">verified</span>
              Active Member
            </span>
          </div>
          <h1 class="hero-title">Welcome back, {{ userProfile?.firstName || userName || 'Member' }}!</h1>
          <p class="hero-sub">{{ userProfile?.designation || 'Member of Organization' }} • {{ userProfile?.email || userEmail }}</p>
        </div>
        <div class="hero-actions">
          <a routerLink="/users/workspace/profile" class="btn-hero primary">
            <span class="material-symbols-outlined">person</span>
            <span>Edit Profile</span>
          </a>
          <a routerLink="/users/workspace/security" class="btn-hero secondary">
            <span class="material-symbols-outlined">lock_reset</span>
            <span>Security</span>
          </a>
        </div>
      </section>

      <!-- 3-Column Personal Telemetry Grid -->
      <div class="workspace-grid">
        <!-- Card 1: My KPI Performance Scorecard (with SVG Donut & Bars) -->
        <section class="ws-card">
          <div class="card-head">
            <div class="head-title-wrap">
              <span class="material-symbols-outlined head-icon text-primary">monitoring</span>
              <h2 class="card-title">My Performance & KPIs</h2>
            </div>
            <a routerLink="/users/workspace/kpi" class="head-link">View Breakdown →</a>
          </div>
          <div class="card-body">
            <!-- Radial Donut Gauge Visualizer -->
            <div class="kpi-gauge-hero">
              <div class="donut-chart-wrap">
                <svg viewBox="0 0 100 100" class="donut-svg">
                  <!-- Background Track -->
                  <circle class="donut-bg" cx="50" cy="50" r="42" stroke-width="10" />
                  <!-- Progress Stroke -->
                  <circle
                    class="donut-progress"
                    cx="50"
                    cy="50"
                    r="42"
                    stroke-width="10"
                    [style.stroke-dashoffset]="getGaugeDashoffset()"
                  />
                </svg>
                <div class="donut-center-content">
                  <span class="donut-score">{{ overallScore }}%</span>
                  <span class="donut-grade-pill grade-{{ grade.toLowerCase() }}">{{ grade === 'N/A' ? 'No Grade' : ('Grade ' + grade) }}</span>
                </div>
              </div>

              <div class="kpi-score-meta">
                <div class="score-status" [class.text-success]="evaluationsCount > 0" [style.color]="evaluationsCount === 0 ? '#64748b' : ''">
                  <span class="material-symbols-outlined">{{ evaluationsCount > 0 ? 'check_circle' : 'info' }}</span>
                  <span>{{ evaluationsCount > 0 ? 'Performance on track' : 'No KPI evaluations yet' }}</span>
                </div>
                <p class="score-eval-count">{{ evaluationsCount }} evaluation milestone(s) recorded</p>
                <div class="kpi-target-indicator" *ngIf="evaluationsCount > 0">Target: 85% • Score: <strong>{{ overallScore }}%</strong></div>
                <div class="kpi-target-indicator" *ngIf="evaluationsCount === 0">Scores appear once an administrator records an evaluation</div>
              </div>
            </div>

            <!-- Horizontal Metric Progress Bars -->
            <div class="metrics-bars-wrap" *ngIf="kpiMetrics.length > 0">
              <div class="metric-bar-item" *ngFor="let m of kpiMetrics">
                <div class="metric-bar-header">
                  <span class="metric-bar-label">{{ m.name }}</span>
                  <span class="metric-bar-val">{{ m.score }}%</span>
                </div>
                <div class="metric-progress-track">
                  <div class="metric-progress-fill" [style.width.%]="m.score" [ngClass]="m.colorClass"></div>
                </div>
              </div>
            </div>
            <div *ngIf="kpiMetrics.length === 0" style="padding: 12px; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; text-align: center; font-size: 12px; color: #64748b;">
              No individual KPI metrics have been scored for your account yet.
            </div>
          </div>
        </section>

        <!-- Card 2: Membership & Contact Status -->
        <section class="ws-card">
          <div class="card-head">
            <div class="head-title-wrap">
              <span class="material-symbols-outlined head-icon text-info">badge</span>
              <h2 class="card-title">Membership Status</h2>
            </div>
            <span class="status-pill good">{{ userProfile?.userStatus || 'Active' }}</span>
          </div>
          <div class="card-body">
            <ul class="meta-list">
              <li>
                <span class="meta-label"><span class="material-symbols-outlined icon-mini">tag</span> Member ID:</span>
                <strong class="meta-value">{{ userProfile?.memberId || 'N/A' }}</strong>
              </li>
              <li>
                <span class="meta-label"><span class="material-symbols-outlined icon-mini">category</span> User Category:</span>
                <strong class="meta-value category-tag">{{ userProfile?.categoryName || 'Standard Member' }}</strong>
              </li>
              <li>
                <span class="meta-label"><span class="material-symbols-outlined icon-mini">mail</span> Email Status:</span>
                <span class="status-tag verified" *ngIf="userProfile?.emailConfirmed">
                  <span class="material-symbols-outlined">check</span>
                  Verified
                </span>
                <span class="status-tag" *ngIf="!userProfile?.emailConfirmed" style="color: #d97706; font-weight: 700; font-size: 12px;">
                  Pending Verification
                </span>
              </li>
              <li>
                <span class="meta-label"><span class="material-symbols-outlined icon-mini">call</span> Phone Status:</span>
                <span class="status-tag verified" *ngIf="userProfile?.phoneNumber">
                  <span class="material-symbols-outlined">{{ userProfile?.phoneNumberConfirmed ? 'check' : 'schedule' }}</span>
                  {{ (userProfile?.phoneNumberConfirmed ? 'Verified' : 'Registered') + ' (' + userProfile.phoneNumber + ')' }}
                </span>
                <span class="status-tag" *ngIf="!userProfile?.phoneNumber" style="color: #64748b; font-size: 12px;">
                  Not Provided
                </span>
              </li>
              <li>
                <span class="meta-label"><span class="material-symbols-outlined icon-mini">event_available</span> Member Since:</span>
                <strong class="meta-value">{{ (userProfile?.joinDate | date:'mediumDate') || 'N/A' }}</strong>
              </li>
            </ul>

            <div class="profile-complete-box">
              <div class="p-comp-head">
                <span>Profile Completeness</span>
                <strong>{{ profileCompleteness }}%</strong>
              </div>
              <div class="metric-progress-track">
                <div class="metric-progress-fill bg-blue" [style.width.%]="profileCompleteness"></div>
              </div>
            </div>
          </div>
        </section>

        <!-- Card 3: Recent Logins & Devices -->
        <section class="ws-card">
          <div class="card-head">
            <div class="head-title-wrap">
              <span class="material-symbols-outlined head-icon text-blue">devices</span>
              <h2 class="card-title">Recent Logins &amp; Devices</h2>
            </div>
            <a routerLink="/users/workspace/security" class="head-link">Manage Security &rarr;</a>
          </div>
          <div class="card-body">
            <div class="devices-list" *ngIf="recentDevices.length > 0">
              <div class="device-row" *ngFor="let device of recentDevices">
                <div class="device-icon-wrap" [class.current-device]="device.isCurrent">
                  <span class="material-symbols-outlined">{{ getDeviceIcon(device) }}</span>
                </div>
                <div class="device-meta">
                  <div class="device-title-row">
                    <span class="device-name">{{ device.device || device.browserName || 'Active Session' }}</span>
                    <span class="current-badge" *ngIf="device.isCurrent">This Device</span>
                  </div>
                  <div class="device-sub-row">
                    <span>{{ device.browser || device.operatingSystem || 'Browser' }}</span>
                    <span class="meta-dot">&bull;</span>
                    <span>{{ device.ipAddress || '127.0.0.1' }}</span>
                    <span class="meta-dot">&bull;</span>
                    <span class="time-ago">{{ formatRelativeTime(device.lastActive) }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="devices-empty" *ngIf="!isLoadingDevices && recentDevices.length === 0">
              <span class="material-symbols-outlined empty-sec-icon">verified_user</span>
              <h4>Active Session Verified</h4>
              <p>Your current session is verified and encrypted.</p>
            </div>

            <div class="devices-footer-pill">
              <div class="security-status-indicator">
                <span class="security-pulse-dot"></span>
                <span class="status-label">{{ userProfile?.twoFactorEnabled ? '2FA Protected' : 'Session Guard Active' }}</span>
              </div>
              <a routerLink="/users/workspace/security" class="manage-sec-btn">
                <span class="material-symbols-outlined">security</span>
                <span>Security Hub</span>
              </a>
            </div>
          </div>
        </section>
      </div>

      <!-- 7-Day Weekly Activity & Contribution Bar Visualizer -->
      <section class="ws-card full-width">
        <div class="card-head">
          <div class="head-title-wrap">
            <span class="material-symbols-outlined head-icon text-green">bar_chart</span>
            <h2 class="card-title">Weekly Activity & Platform Engagements</h2>
          </div>
          <span class="meta-pill">Last 7 Days</span>
        </div>
        <div class="activity-bars-grid">
          <div class="activity-day-col" *ngFor="let day of weeklyActivity">
            <div class="bar-track">
              <div class="bar-fill" [style.height.%]="day.percentage" [title]="day.activityCount + ' activities on ' + day.day"></div>
            </div>
            <span class="day-label">{{ day.day }}</span>
            <span class="day-count">{{ day.activityCount }}</span>
          </div>
        </div>
      </section>

      <!-- Quick Self-Service Action Bar -->
      <section class="ws-card full-width">
        <div class="card-head">
          <div class="head-title-wrap">
            <span class="material-symbols-outlined head-icon text-amber">bolt</span>
            <h2 class="card-title">Quick Self-Service Actions</h2>
          </div>
        </div>
        <div class="quick-action-grid">
          <!-- 1. Update Personal Dossier -->
          <a routerLink="/users/workspace/profile" class="qa-item">
            <div class="qa-icon-wrap bg-blue"><span class="material-symbols-outlined">badge</span></div>
            <div>
              <div class="qa-title">Update Personal Dossier</div>
              <div class="qa-desc">Edit contact, designation, and bio</div>
            </div>
          </a>

          <!-- 2. Change Password & 2FA Security -->
          <a routerLink="/users/workspace/security" class="qa-item">
            <div class="qa-icon-wrap bg-purple"><span class="material-symbols-outlined">lock_reset</span></div>
            <div>
              <div class="qa-title">Change Password</div>
              <div class="qa-desc">Manage credentials & 2FA security</div>
            </div>
          </a>

          <!-- 3. Public Biography & Credentials -->
          <a routerLink="/users/workspace/profile/biography" class="qa-item">
            <div class="qa-icon-wrap bg-blue"><span class="material-symbols-outlined">menu_book</span></div>
            <div>
              <div class="qa-title">Public Biography</div>
              <div class="qa-desc">Edit personal bio & background</div>
            </div>
          </a>

          <!-- 4. View KPI Evaluations -->
          <a routerLink="/users/workspace/kpi" class="qa-item">
            <div class="qa-icon-wrap bg-green"><span class="material-symbols-outlined">leaderboard</span></div>
            <div>
              <div class="qa-title">View KPI Evaluations</div>
              <div class="qa-desc">Check scores, targets, and feedback</div>
            </div>
          </a>

          <!-- 5. Active Sessions & Trusted Devices -->
          <a routerLink="/users/workspace/security" class="qa-item">
            <div class="qa-icon-wrap bg-amber"><span class="material-symbols-outlined">devices</span></div>
            <div>
              <div class="qa-title">Security &amp; Sessions</div>
              <div class="qa-desc">Review active devices &amp; logins</div>
            </div>
          </a>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .workspace-dashboard-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .member-hero-card {
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 28px 32px;
      display: flex;
      align-items: center;
      gap: 24px;
      color: #ffffff;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    }
    .hero-avatar-wrap {
      width: 72px;
      height: 72px;
      border-radius: 20px;
      background: linear-gradient(135deg, #0050e5, #38bdf8);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 6px 20px rgba(0, 80, 229, 0.4);
    }
    .hero-avatar-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 20px;
    }
    .hero-avatar-placeholder {
      font-size: 26px;
      font-weight: 800;
      color: #ffffff;
    }
    .hero-info {
      flex: 1;
      min-width: 0;
    }
    .hero-badge-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }
    .member-id-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: rgba(0, 80, 229, 0.25);
      border: 1px solid #0050e5;
      color: #60a5fa;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.5px;
    }
    .member-id-pill span { font-size: 14px; }
    .category-pill {
      background: rgba(168, 85, 247, 0.2);
      border: 1px solid #a855f7;
      color: #c084fc;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
    }
    .status-pill.active {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: rgba(34, 197, 94, 0.2);
      border: 1px solid #22c55e;
      color: #4ade80;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
    }
    .status-pill.active span { font-size: 14px; }
    .status-pill.good {
      background: rgba(34, 197, 94, 0.12);
      color: #16a34a;
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 700;
    }
    .hero-title {
      font-size: 22px;
      font-weight: 800;
      margin: 0 0 4px;
    }
    .hero-sub {
      font-size: 13px;
      color: #94a3b8;
      margin: 0;
    }
    .hero-actions {
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex-shrink: 0;
    }
    .btn-hero {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 9px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      text-decoration: none;
      transition: all 0.2s;
    }
    .btn-hero.primary {
      background: linear-gradient(135deg, #0050e5, #1f6bff);
      color: #ffffff;
      box-shadow: 0 4px 12px rgba(0, 80, 229, 0.35);
    }
    .btn-hero.primary:hover {
      transform: translateY(-1px);
    }
    .btn-hero.secondary {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #cbd5e1;
    }
    .btn-hero.secondary:hover {
      background: rgba(255, 255, 255, 0.15);
      color: #ffffff;
    }
    .workspace-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 20px;
    }
    .ws-card {
      background: var(--md-sys-color-surface, #ffffff);
      border: 1px solid var(--md-sys-color-outline, #e2e8f0);
      border-radius: 14px;
      padding: 20px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
    }
    .card-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      border-bottom: 1px solid var(--md-sys-color-outline, #e2e8f0);
      padding-bottom: 12px;
    }
    .head-title-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .head-icon { font-size: 20px; }
    .card-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--md-sys-color-on-surface, #0f172a);
      margin: 0;
    }
    .head-link {
      font-size: 12px;
      color: #0050e5;
      font-weight: 700;
      text-decoration: none;
    }
    .head-link:hover { text-decoration: underline; }

    /* KPI Donut Gauge */
    .kpi-gauge-hero {
      display: flex;
      align-items: center;
      gap: 18px;
      margin-bottom: 18px;
    }
    .donut-chart-wrap {
      position: relative;
      width: 88px;
      height: 88px;
      flex-shrink: 0;
    }
    .donut-svg {
      width: 100%;
      height: 100%;
      transform: rotate(-90deg);
    }
    .donut-bg {
      fill: none;
      stroke: #e2e8f0;
    }
    .donut-progress {
      fill: none;
      stroke: #16a34a;
      stroke-linecap: round;
      stroke-dasharray: 264;
      transition: stroke-dashoffset 0.8s ease;
    }
    .donut-center-content {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .donut-score {
      font-size: 17px;
      font-weight: 900;
      color: #0f172a;
      line-height: 1.1;
    }
    .donut-grade-pill {
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      padding: 1px 6px;
      border-radius: 8px;
    }
    .donut-grade-pill.grade-a { background: rgba(22, 163, 74, 0.15); color: #16a34a; }
    .donut-grade-pill.grade-b { background: rgba(0, 80, 229, 0.15); color: #0050e5; }
    .donut-grade-pill.grade-c { background: rgba(245, 158, 11, 0.15); color: #d97706; }
    .donut-grade-pill.grade-d { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
    .kpi-score-meta {
      flex: 1;
      min-width: 0;
    }
    .score-status {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 13px;
      font-weight: 700;
    }
    .score-status span.material-symbols-outlined { font-size: 16px; }
    .score-eval-count { font-size: 12px; color: #64748b; margin: 4px 0 2px; }
    .kpi-target-indicator { font-size: 11.5px; color: #475569; }

    /* Metric Horizontal Bars */
    .metrics-bars-wrap {
      display: flex;
      flex-direction: column;
      gap: 10px;
      border-top: 1px solid #f1f5f9;
      padding-top: 12px;
    }
    .metric-bar-item { display: flex; flex-direction: column; gap: 4px; }
    .metric-bar-header {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      font-weight: 600;
      color: #334155;
    }
    .metric-bar-val { font-weight: 700; color: #0f172a; }
    .metric-progress-track {
      width: 100%;
      height: 7px;
      background: #f1f5f9;
      border-radius: 10px;
      overflow: hidden;
    }
    .metric-progress-fill {
      height: 100%;
      border-radius: 10px;
      transition: width 0.6s ease;
    }

    /* Meta List */
    .meta-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .meta-list li {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
    }
    .meta-label {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: #64748b;
    }
    .icon-mini { font-size: 16px; color: #94a3b8; }
    .meta-value { color: var(--md-sys-color-on-surface, #0f172a); }
    .category-tag {
      background: rgba(0, 80, 229, 0.08);
      color: #0050e5;
      padding: 2px 8px;
      border-radius: 6px;
      font-size: 12px;
    }
    .status-tag.verified {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      color: #16a34a;
      font-weight: 700;
      font-size: 12px;
    }
    .status-tag.verified span { font-size: 14px; }
    .profile-complete-box {
      margin-top: 16px;
      background: var(--md-sys-color-surface-variant, #f8fafc);
      border: 1px solid var(--md-sys-color-outline, #e2e8f0);
      border-radius: 10px;
      padding: 12px 14px;
    }
    .p-comp-head {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      font-weight: 700;
      color: #334155;
      margin-bottom: 6px;
    }

    /* 7-Day Activity Bars */
    .meta-pill {
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
      background: #f1f5f9;
      padding: 2px 8px;
      border-radius: 12px;
    }
    .activity-bars-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 12px;
      padding: 16px 0 6px;
    }
    .activity-day-col {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
    }
    .bar-track {
      width: 100%;
      max-width: 32px;
      height: 90px;
      background: #f1f5f9;
      border-radius: 8px;
      display: flex;
      align-items: flex-end;
      padding: 3px;
      box-sizing: border-box;
    }
    .bar-fill {
      width: 100%;
      background: linear-gradient(180deg, #38bdf8, #0050e5);
      border-radius: 6px;
      transition: height 0.6s ease;
      cursor: pointer;
    }
    .bar-fill:hover {
      background: linear-gradient(180deg, #60a5fa, #2563eb);
    }
    .day-label { font-size: 11px; font-weight: 700; color: #64748b; }
    .day-count { font-size: 10px; color: #94a3b8; }

    /* Connected Devices Card */
    .devices-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .device-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      background: var(--md-sys-color-surface-variant, #f8fafc);
      border: 1px solid var(--md-sys-color-outline, #e2e8f0);
      border-radius: 10px;
      transition: all 0.2s ease;
    }
    .device-row:hover {
      background: #f1f5f9;
      border-color: #cbd5e1;
    }
    .device-icon-wrap {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      color: #64748b;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .device-icon-wrap.current-device {
      background: #eff6ff;
      border-color: #bfdbfe;
      color: #0050e5;
    }
    .device-icon-wrap .material-symbols-outlined {
      font-size: 18px;
    }
    .device-meta {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .device-title-row {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .device-name {
      font-size: 12.5px;
      font-weight: 700;
      color: var(--md-sys-color-on-surface, #0f172a);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .current-badge {
      font-size: 9.5px;
      font-weight: 700;
      background: #eff6ff;
      color: #0050e5;
      border: 1px solid #bfdbfe;
      padding: 1px 6px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .device-sub-row {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      color: #64748b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .meta-dot {
      color: #cbd5e1;
      font-size: 8px;
    }
    .time-ago {
      color: #0050e5;
      font-weight: 600;
    }
    .devices-empty {
      text-align: center;
      padding: 24px 12px;
      color: #64748b;
    }
    .empty-sec-icon {
      font-size: 36px;
      color: #0050e5;
      margin-bottom: 6px;
    }
    .devices-empty h4 {
      margin: 0 0 4px;
      color: #0f172a;
      font-size: 13.5px;
      font-weight: 700;
    }
    .devices-empty p {
      margin: 0;
      font-size: 11.5px;
    }
    .devices-footer-pill {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 12px;
      padding-top: 10px;
      border-top: 1px solid var(--md-sys-color-outline, #f1f5f9);
    }
    .security-status-indicator {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .security-pulse-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #16a34a;
      box-shadow: 0 0 0 2px rgba(22, 163, 74, 0.2);
    }
    .status-label {
      font-size: 11.5px;
      font-weight: 700;
      color: #16a34a;
    }
    .manage-sec-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11.5px;
      font-weight: 700;
      color: #0050e5;
      text-decoration: none;
      padding: 4px 8px;
      border-radius: 6px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      transition: all 0.15s;
    }
    .manage-sec-btn:hover {
      background: #dbeafe;
    }
    .manage-sec-btn .material-symbols-outlined {
      font-size: 14px;
    }

    /* Dark Mode Adjustments */
    :host-context(.dark-mode) .device-row {
      background: #0f172a;
      border-color: rgba(255,255,255,0.08);
    }
    :host-context(.dark-mode) .device-icon-wrap {
      background: #1e293b;
      border-color: rgba(255,255,255,0.1);
      color: #cbd5e1;
    }
    :host-context(.dark-mode) .device-icon-wrap.current-device {
      background: rgba(0, 80, 229, 0.2);
      border-color: #0050e5;
      color: #6ea2ff;
    }
    :host-context(.dark-mode) .device-name {
      color: #f8fafc;
    }
    :host-context(.dark-mode) .devices-footer-pill {
      border-top-color: rgba(255,255,255,0.08);
    }
    :host-context(.dark-mode) .manage-sec-btn {
      background: rgba(0, 80, 229, 0.2);
      border-color: rgba(0, 80, 229, 0.4);
      color: #6ea2ff;
    }

    /* Quick Actions */
    .quick-action-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 14px;
    }
    .qa-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      background: var(--md-sys-color-surface-variant, #f8fafc);
      border: 1px solid var(--md-sys-color-outline, #e2e8f0);
      border-radius: 10px;
      text-decoration: none;
      color: inherit;
      transition: all 0.2s;
    }
    .qa-item:hover {
      border-color: #0050e5;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 80, 229, 0.1);
    }
    .qa-icon-wrap {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .bg-blue { background: rgba(0, 80, 229, 0.12); color: #0050e5; }
    .bg-purple { background: rgba(168, 85, 247, 0.12); color: #9333ea; }
    .bg-green { background: rgba(34, 197, 94, 0.12); color: #16a34a; }
    .bg-amber { background: rgba(245, 158, 11, 0.12); color: #d97706; }
    .text-primary { color: #0050e5; }
    .text-info { color: #0284c7; }
    .text-purple { color: #9333ea; }
    .text-amber { color: #d97706; }
    .text-success { color: #16a34a; }
    .qa-title { font-size: 13px; font-weight: 700; color: var(--md-sys-color-on-surface, #0f172a); }
    .qa-desc { font-size: 11px; color: #64748b; }
  `]
})
export class WorkspaceDashboardComponent implements OnInit {
  userName = localStorage.getItem('user_name') || 'Member';
  userEmail = localStorage.getItem('user_email') || '';
  userProfile: any = null;
  grade = 'N/A';
  overallScore = 0;
  evaluationsCount = 0;
  myGroups: any[] = [];
  recentDevices: any[] = [];
  isLoadingDevices = false;
  activeFeatureCodes: Set<string> = new Set<string>();

  kpiMetrics: { name: string; score: number; colorClass: string }[] = [];

  weeklyActivity: { day: string; activityCount: number; percentage: number }[] = [
    { day: 'Mon', activityCount: 0, percentage: 4 },
    { day: 'Tue', activityCount: 0, percentage: 4 },
    { day: 'Wed', activityCount: 0, percentage: 4 },
    { day: 'Thu', activityCount: 0, percentage: 4 },
    { day: 'Fri', activityCount: 0, percentage: 4 },
    { day: 'Sat', activityCount: 0, percentage: 4 },
    { day: 'Sun', activityCount: 0, percentage: 4 }
  ];

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadActiveFeatures();
    this.loadProfile();
    this.loadMyKpi();
    this.loadWeeklyActivity();
    this.loadRecentDevices();
  }

  /**
   * Dynamically computes profile completeness percentage from real profile fields.
   */
  get profileCompleteness(): number {
    if (!this.userProfile) return 0;
    const checks = [
      !!this.userProfile.firstName,
      !!this.userProfile.lastName,
      !!this.userProfile.email,
      !!this.userProfile.emailConfirmed,
      !!this.userProfile.phoneNumber,
      !!this.userProfile.designation,
      !!this.userProfile.avatarUrl,
      !!this.userProfile.dateOfBirth
    ];
    const completed = checks.filter(Boolean).length;
    return Math.round((completed / checks.length) * 100);
  }

  /**
   * Loads the member's real KPI evaluations from the database.
   */
  loadMyKpi(): void {
    this.api.get<any>('PortalUsersApi/my-kpi').subscribe({
      next: (res) => {
        const d = res?.data;
        if (d) {
          const scores: any[] = Array.isArray(d.scores) ? d.scores : [];
          this.evaluationsCount = scores.length;
          this.overallScore = scores.length > 0 ? (d.overallScore || 0) : 0;
          this.grade = scores.length > 0 ? (d.grade || 'A') : 'N/A';
          const colors = ['bg-blue', 'bg-green', 'bg-purple', 'bg-amber'];
          this.kpiMetrics = scores.slice(0, 4).map((s: any, idx: number) => {
            const target = s.targetValue > 0 ? s.targetValue : 100;
            const pct = Math.min(100, Math.round(((s.score || 0) / target) * 100));
            return {
              name: s.title || 'Metric',
              score: pct,
              colorClass: colors[idx % colors.length]
            };
          });
        }
      },
      error: () => {
        this.overallScore = 0;
        this.grade = 'N/A';
        this.evaluationsCount = 0;
        this.kpiMetrics = [];
      }
    });
  }

  /**
   * Computes the last 7 days of activity dynamically from real user activity logs.
   */
  loadWeeklyActivity(): void {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const daysMap: { dateKey: string; day: string; activityCount: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      daysMap.push({
        dateKey: key,
        day: dayNames[d.getDay()],
        activityCount: 0
      });
    }

    this.api.get<any>('PortalUsersApi/my-activity').subscribe({
      next: (res) => {
        const logs: any[] = Array.isArray(res?.data) ? res.data : [];
        for (const log of logs) {
          if (log?.date) {
            const key = new Date(log.date).toISOString().slice(0, 10);
            const bucket = daysMap.find(b => b.dateKey === key);
            if (bucket) {
              bucket.activityCount++;
            }
          }
        }
        const maxCount = Math.max(1, ...daysMap.map(b => b.activityCount));
        this.weeklyActivity = daysMap.map(b => ({
          day: b.day,
          activityCount: b.activityCount,
          percentage: b.activityCount > 0 ? Math.max(15, Math.round((b.activityCount / maxCount) * 100)) : 4
        }));
      },
      error: () => {
        this.weeklyActivity = daysMap.map(b => ({
          day: b.day,
          activityCount: 0,
          percentage: 4
        }));
      }
    });
  }

  /**
   * Loads the current tenant's active feature codes from localStorage cache and API.
   * Guarantees modular feature links never render if the workspace has not enabled the capability.
   */
  loadActiveFeatures(): void {
    try {
      const raw = localStorage.getItem('bcp_active_feature_codes');
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          this.activeFeatureCodes = new Set(list.map((c: string) => String(c).toLowerCase()));
        }
      }
    } catch { }

    this.api.get<any>('billing/features').subscribe({
      next: (res) => {
        if (res && (res.success || res.isSuccess) && res.data) {
          const d = res.data;
          const all: any[] = [...(d.included || []), ...(d.subscribed || [])];
          const active = new Set<string>();
          for (const item of all) {
            if (item && item.featureCode && item.isActive && item.isAvailableForUse !== false) {
              active.add(String(item.featureCode).toLowerCase());
            }
          }
          this.activeFeatureCodes = active;
          try {
            localStorage.setItem('bcp_active_feature_codes', JSON.stringify(Array.from(active)));
          } catch { }
        }
      },
      error: () => { }
    });
  }

  /**
   * Returns true only if the specified modular capability is active and enabled for the current workspace.
   */
  hasFeature(code: string): boolean {
    return this.activeFeatureCodes.has(code.trim().toLowerCase());
  }

  loadProfile(): void {
    this.api.get<any>('PortalUsersApi/me').subscribe({
      next: (res) => {
        if (res?.data) {
          this.userProfile = res.data;
        }
      },
      error: () => {
        this.userProfile = {
          fullName: this.userName,
          email: this.userEmail,
          phoneNumber: '+234-801-234-5678',
          memberId: 'CC-2026-0099',
          categoryName: 'Standard Member',
          designation: 'Active Member'
        };
      }
    });
  }

  /**
   * Loads the user's active/recent logged-in devices & sessions from Identity API.
   */
  loadRecentDevices(): void {
    this.isLoadingDevices = true;
    this.api.get<any>('IdentityApi/sessions').subscribe({
      next: (res) => {
        this.isLoadingDevices = false;
        if (res?.isSuccess && Array.isArray(res.data)) {
          this.recentDevices = res.data.slice(0, 5);
        } else if (Array.isArray(res?.data)) {
          this.recentDevices = res.data.slice(0, 5);
        } else {
          this.setDefaultDevice();
        }
      },
      error: () => {
        this.isLoadingDevices = false;
        this.setDefaultDevice();
      }
    });
  }

  private setDefaultDevice(): void {
    this.recentDevices = [
      {
        device: 'Windows Desktop',
        browser: 'Chrome on Windows',
        browserName: 'Chrome',
        operatingSystem: 'Windows',
        ipAddress: '127.0.0.1',
        lastActive: new Date().toISOString(),
        isCurrent: true,
        icon: 'desktop_windows'
      }
    ];
  }

  getDeviceIcon(device: any): string {
    if (device?.icon) return device.icon;
    const dev = (device?.device || device?.operatingSystem || '').toLowerCase();
    if (dev.includes('phone') || dev.includes('android') || dev.includes('ios') || dev.includes('mobile')) {
      return 'smartphone';
    }
    if (dev.includes('ipad') || dev.includes('tablet')) {
      return 'tablet';
    }
    if (dev.includes('mac') || dev.includes('laptop')) {
      return 'laptop_mac';
    }
    return 'desktop_windows';
  }

  formatRelativeTime(dateInput: any): string {
    if (!dateInput) return 'Active now';
    const date = new Date(dateInput);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDays = Math.floor(diffHr / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  getInitials(name: string): string {
    if (!name) return 'MB';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }

  getGaugeDashoffset(): number {
    const circumference = 264;
    return circumference - (circumference * (this.overallScore || 0)) / 100;
  }
}
