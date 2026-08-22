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
                  <span class="donut-grade-pill grade-{{ grade.toLowerCase() }}">Grade {{ grade }}</span>
                </div>
              </div>

              <div class="kpi-score-meta">
                <div class="score-status text-success">
                  <span class="material-symbols-outlined">check_circle</span>
                  <span>Performance on track</span>
                </div>
                <p class="score-eval-count">{{ evaluationsCount }} evaluation milestone(s) recorded</p>
                <div class="kpi-target-indicator">Target: 85% • Standing: <strong>Top 15%</strong></div>
              </div>
            </div>

            <!-- Horizontal Metric Progress Bars -->
            <div class="metrics-bars-wrap">
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
          </div>
        </section>

        <!-- Card 2: Membership & Contact Status -->
        <section class="ws-card">
          <div class="card-head">
            <div class="head-title-wrap">
              <span class="material-symbols-outlined head-icon text-info">badge</span>
              <h2 class="card-title">Membership Status</h2>
            </div>
            <span class="status-pill good">Verified</span>
          </div>
          <div class="card-body">
            <ul class="meta-list">
              <li>
                <span class="meta-label"><span class="material-symbols-outlined icon-mini">tag</span> Member ID:</span>
                <strong class="meta-value">{{ userProfile?.memberId || 'CC-2026-0099' }}</strong>
              </li>
              <li>
                <span class="meta-label"><span class="material-symbols-outlined icon-mini">category</span> User Category:</span>
                <strong class="meta-value category-tag">{{ userProfile?.categoryName || 'Standard Member' }}</strong>
              </li>
              <li>
                <span class="meta-label"><span class="material-symbols-outlined icon-mini">mail</span> Email Status:</span>
                <span class="status-tag verified">
                  <span class="material-symbols-outlined">check</span>
                  Verified
                </span>
              </li>
              <li>
                <span class="meta-label"><span class="material-symbols-outlined icon-mini">call</span> Phone Status:</span>
                <span class="status-tag verified">
                  <span class="material-symbols-outlined">check</span>
                  {{ userProfile?.phoneNumber ? 'Verified (' + userProfile.phoneNumber + ')' : 'Verified (+234)' }}
                </span>
              </li>
              <li>
                <span class="meta-label"><span class="material-symbols-outlined icon-mini">event_available</span> Member Since:</span>
                <strong class="meta-value">{{ (userProfile?.joinDate | date:'mediumDate') || '2026' }}</strong>
              </li>
            </ul>

            <div class="profile-complete-box">
              <div class="p-comp-head">
                <span>Profile Completeness</span>
                <strong>95%</strong>
              </div>
              <div class="metric-progress-track">
                <div class="metric-progress-fill bg-blue" style="width: 95%;"></div>
              </div>
            </div>
          </div>
        </section>

        <!-- Card 3: My Group Channels -->
        <section class="ws-card">
          <div class="card-head">
            <div class="head-title-wrap">
              <span class="material-symbols-outlined head-icon text-purple">diversity_3</span>
              <h2 class="card-title">My Groups & Channels</h2>
            </div>
            <a routerLink="/groups/workspace" class="head-link">Open Channels →</a>
          </div>
          <div class="card-body">
            <div class="groups-empty" *ngIf="!myGroups.length">
              <span class="material-symbols-outlined groups-icon">forum</span>
              <h4>General Member Channel</h4>
              <p>You are active in the central community communication channel.</p>
              <a routerLink="/groups/workspace" class="btn-sm primary">Open Member Chat</a>
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
          <a routerLink="/users/workspace/profile" class="qa-item">
            <div class="qa-icon-wrap bg-blue"><span class="material-symbols-outlined">badge</span></div>
            <div>
              <div class="qa-title">Update Personal Dossier</div>
              <div class="qa-desc">Edit contact, designation, and bio</div>
            </div>
          </a>
          <a routerLink="/users/workspace/security" class="qa-item">
            <div class="qa-icon-wrap bg-purple"><span class="material-symbols-outlined">lock_reset</span></div>
            <div>
              <div class="qa-title">Change Password</div>
              <div class="qa-desc">Manage credentials & 2FA security</div>
            </div>
          </a>
          <a routerLink="/users/workspace/kpi" class="qa-item">
            <div class="qa-icon-wrap bg-green"><span class="material-symbols-outlined">leaderboard</span></div>
            <div>
              <div class="qa-title">View KPI Evaluations</div>
              <div class="qa-desc">Check scores, targets, and feedback</div>
            </div>
          </a>
          <a routerLink="/groups/workspace" class="qa-item">
            <div class="qa-icon-wrap bg-amber"><span class="material-symbols-outlined">chat</span></div>
            <div>
              <div class="qa-title">Community Chat</div>
              <div class="qa-desc">Engage with team members</div>
            </div>
          </a>
          <a routerLink="/users/workspace/purchases" class="qa-item">
            <div class="qa-icon-wrap bg-info" style="background-color: #0284c7; display: flex; align-items: center; justify-content: center; width: 42px; height: 42px; border-radius: 8px;"><span class="material-symbols-outlined" style="color: #ffffff;">shopping_bag</span></div>
            <div>
              <div class="qa-title">My Purchases & Licenses</div>
              <div class="qa-desc">View invoices and copy license keys</div>
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

    /* Groups */
    .groups-empty {
      text-align: center;
      padding: 16px 12px;
      color: #64748b;
      font-size: 13px;
    }
    .groups-icon { font-size: 36px; color: #a855f7; margin-bottom: 6px; }
    .groups-empty h4 { margin: 0 0 4px; color: #0f172a; font-size: 14px; font-weight: 700; }
    .groups-empty p { margin: 0 0 10px; font-size: 12px; }
    .btn-sm {
      display: inline-block;
      padding: 7px 16px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      text-decoration: none;
      background: #0050e5;
      color: #ffffff;
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
  grade = 'A';
  overallScore = 88;
  evaluationsCount = 3;
  myGroups: any[] = [];

  kpiMetrics = [
    { name: 'Attendance & Engagement', score: 92, colorClass: 'bg-blue' },
    { name: 'Project Milestones', score: 85, colorClass: 'bg-green' },
    { name: 'Training & Knowledge', score: 88, colorClass: 'bg-purple' }
  ];

  weeklyActivity = [
    { day: 'Mon', activityCount: 4, percentage: 60 },
    { day: 'Tue', activityCount: 6, percentage: 85 },
    { day: 'Wed', activityCount: 3, percentage: 45 },
    { day: 'Thu', activityCount: 7, percentage: 100 },
    { day: 'Fri', activityCount: 5, percentage: 70 },
    { day: 'Sat', activityCount: 2, percentage: 30 },
    { day: 'Sun', activityCount: 4, percentage: 55 }
  ];

  constructor(private api: ApiService) {}

  ngOnInit(): void {
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

  getInitials(name: string): string {
    if (!name) return 'MB';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }

  getGaugeDashoffset(): number {
    const circumference = 264;
    return circumference - (circumference * (this.overallScore || 0)) / 100;
  }
}
