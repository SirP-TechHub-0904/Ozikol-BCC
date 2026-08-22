import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { ApiService } from '../../../core/services/api.service';
import { PageHeaderComponent, PageHeaderButton } from '../../../shared/components/page-header/page-header.component';

Chart.register(...registerables);

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, PageHeaderComponent],
  template: `
    <div class="user-dashboard-page">
      <!-- Standardized Page Header -->
      <app-page-header
        eyebrow="USER MANAGEMENT & DIRECTORY"
        icon="groups"
        title="Member Management & Directory Hub"
        subtitle="Executive real-time intelligence, demographic distributions, category tiers, KPI scorecards, and forensic audit logs."
        [buttons]="headerButtons"
        [loading]="isLoading"
      ></app-page-header>

      <!-- =================================================================== -->
      <!-- ROW 1: CORE OPERATIONAL METRICS (4 EQUAL CARDS - CLICKABLE)          -->
      <!-- =================================================================== -->
      <div class="row-1-metrics-grid">
        <!-- 1. Total Members -->
        <a routerLink="/admin/users/list" class="stat-card clickable" title="View All Members in Directory">
          <div class="stat-top-row">
            <div class="stat-icon-box bg-blue">
              <span class="material-symbols-outlined">groups</span>
            </div>
            <div class="stat-details">
              <span class="stat-label">Total Members</span>
              <div class="stat-value">{{ stats?.totalMembers || 0 }}</div>
              <span class="stat-subtext">Registered Profiles • View All &rarr;</span>
            </div>
          </div>
        </a>

        <!-- 2. Active Accounts -->
        <a routerLink="/admin/users/list" [queryParams]="{ status: 'Active' }" class="stat-card clickable" title="Filter Active Members">
          <div class="stat-top-row">
            <div class="stat-icon-box bg-green">
              <span class="material-symbols-outlined">verified_user</span>
            </div>
            <div class="stat-details">
              <span class="stat-label">Active Accounts</span>
              <div class="stat-value text-green">{{ stats?.activeMembers || 0 }}</div>
              <span class="stat-subtext">Good Standing • Filter &rarr;</span>
            </div>
          </div>
        </a>

        <!-- 3. Suspicious / Flagged Accounts -->
        <a routerLink="/admin/users/list" [queryParams]="{ status: 'Suspicious' }" class="stat-card clickable" [class.card-alert]="(stats?.suspiciousAccounts || 0) > 0" title="Inspect Suspicious Accounts">
          <div class="stat-top-row">
            <div class="stat-icon-box bg-rose">
              <span class="material-symbols-outlined">gpp_maybe</span>
            </div>
            <div class="stat-details">
              <span class="stat-label">Suspicious / Flagged</span>
              <div class="stat-value text-rose">{{ stats?.suspiciousAccounts || 0 }}</div>
              <span class="stat-subtext">Lockouts & Logins • Filter &rarr;</span>
            </div>
          </div>
        </a>

        <!-- 4. Suspended Accounts -->
        <a routerLink="/admin/users/list" [queryParams]="{ status: 'Suspended' }" class="stat-card clickable" title="Filter Suspended Members">
          <div class="stat-top-row">
            <div class="stat-icon-box bg-amber">
              <span class="material-symbols-outlined">block</span>
            </div>
            <div class="stat-details">
              <span class="stat-label">Suspended</span>
              <div class="stat-value text-amber">{{ stats?.suspendedMembers || 0 }}</div>
              <span class="stat-subtext">Access Restricted • Filter &rarr;</span>
            </div>
          </div>
        </a>
      </div>

      <!-- =================================================================== -->
      <!-- ROW 2: DEMOGRAPHICS (MALE/FEMALE) & MEMBERSHIP PLAN QUOTA           -->
      <!-- =================================================================== -->
      <div class="dashboard-row-2">
        <!-- Gender Demographics: 100% Dual Progress Bar Meeting In Middle -->
        <div class="card-panel">
          <div class="panel-header">
            <div class="panel-title-wrap">
              <h3>Gender Demographic Distribution</h3>
              <p class="panel-subtitle">Dual roster ratio • Blue (Left) & Pink (Right)</p>
            </div>
            <span class="badge-pill-soft">100% Total Ratio</span>
          </div>

          <div class="gender-widget-body">
            <div class="gender-top-row">
              <div class="gender-side male-side">
                <span class="gender-icon-pill bg-cyan-soft"><span class="material-symbols-outlined">male</span></span>
                <div>
                  <div class="gender-count-label">Male: <strong>{{ stats?.maleMembers || 0 }}</strong></div>
                  <div class="gender-percentage text-cyan">{{ getGenderSplit().malePercent }}%</div>
                </div>
              </div>

              <div class="gender-mid-label">
                <span class="material-symbols-outlined mid-icon">transgender</span>
                <span>Roster Split</span>
              </div>

              <div class="gender-side female-side">
                <div style="text-align: right;">
                  <div class="gender-count-label">Female: <strong>{{ stats?.femaleMembers || 0 }}</strong></div>
                  <div class="gender-percentage text-pink">{{ getGenderSplit().femalePercent }}%</div>
                </div>
                <span class="gender-icon-pill bg-pink-soft"><span class="material-symbols-outlined">female</span></span>
              </div>
            </div>

            <!-- Dual 100% Meeting in the middle bar -->
            <div class="dual-progress-container">
              <div class="dual-progress-track">
                <div class="dual-bar-male" [style.width.%]="getGenderSplit().malePercent" [title]="'Male: ' + (stats?.maleMembers || 0) + ' (' + getGenderSplit().malePercent + '%)'"></div>
                <div class="dual-bar-female" [style.width.%]="getGenderSplit().femalePercent" [title]="'Female: ' + (stats?.femaleMembers || 0) + ' (' + getGenderSplit().femalePercent + '%)'"></div>
              </div>
              <div class="dual-progress-footer">
                <span>♂ Male {{ getGenderSplit().malePercent }}%</span>
                <span class="middle-marker">100% Total Representation</span>
                <span>Female {{ getGenderSplit().femalePercent }}% ♀</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Membership Subscription Plan & Seat Capacity Quota -->
        <div class="card-panel">
          <div class="panel-header">
            <div class="panel-title-wrap">
              <h3>Membership Plan & Capacity Quota</h3>
              <p class="panel-subtitle">Tenant platform subscription and seat limit allocation</p>
            </div>
            <span class="badge-plan-tier">{{ stats?.planQuota?.planType || 'Starter' }} Tier</span>
          </div>

          <div class="quota-widget-body">
            <div class="quota-top-row">
              <div class="quota-metric">
                <span class="quota-label">Allocated Seats</span>
                <div class="quota-value">
                  <span>{{ stats?.planQuota?.usedSeats || 0 }}</span>
                  <span class="quota-max"> / {{ stats?.planQuota?.isUnlimited ? '∞' : (stats?.planQuota?.maximumUsers || 100) }}</span>
                </div>
              </div>
              <div class="quota-remaining-box">
                <span class="stat-label">Remaining Allowance</span>
                <div class="remaining-value text-green">
                  {{ stats?.planQuota?.isUnlimited ? 'Unlimited Seats' : (stats?.planQuota?.remainingSeats + ' Seats Left') }}
                </div>
              </div>
            </div>

            <!-- Seat Usage Progress Bar -->
            <div class="quota-progress-container">
              <div class="quota-track">
                <div class="quota-bar" [class.bg-green]="(stats?.planQuota?.seatUsagePercent || 0) < 80" [class.bg-amber]="(stats?.planQuota?.seatUsagePercent || 0) >= 80 && (stats?.planQuota?.seatUsagePercent || 0) < 95" [class.bg-rose]="(stats?.planQuota?.seatUsagePercent || 0) >= 95" [style.width.%]="stats?.planQuota?.isUnlimited ? 5 : (stats?.planQuota?.seatUsagePercent || 0)"></div>
              </div>
              <div class="quota-footer-row">
                <span>{{ stats?.planQuota?.isUnlimited ? 'Enterprise Unlimited' : (stats?.planQuota?.seatUsagePercent + '% Capacity Used') }}</span>
                <span class="quota-subtext">{{ stats?.planQuota?.isUnlimited ? 'Full Platform Unrestricted' : 'Hard Cap Enforced by Central Admin' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- =================================================================== -->
      <!-- ROW 3: 50% GROWTH TREND + 50% BEST PERFORMING KPI BAR CHART         -->
      <!-- =================================================================== -->
      <div class="dashboard-row-2">
        <!-- 50% Left: Growth Trend Area Chart -->
        <div class="card-panel">
          <div class="panel-header">
            <div class="panel-title-wrap">
              <h3>Member Registration & Growth Trend</h3>
              <p class="panel-subtitle">6-month onboarding curve and profile acquisition velocity</p>
            </div>
            <span class="badge-pill-soft">Past 6 Months</span>
          </div>
          <div class="chart-canvas-container">
            <canvas #growthLineCanvas></canvas>
          </div>
        </div>

        <!-- 50% Right: Best Performing Members KPI Bar Chart -->
        <div class="card-panel">
          <div class="panel-header">
            <div class="panel-title-wrap">
              <h3>Best Performing Members (KPI Scorecards)</h3>
              <p class="panel-subtitle">Performance evaluation comparison across top member profiles</p>
            </div>
            <a routerLink="/admin/users/kpi" class="header-link">KPI Hub</a>
          </div>
          <div class="chart-canvas-container">
            <canvas #kpiBarCanvas></canvas>
          </div>
        </div>
      </div>

      <!-- =================================================================== -->
      <!-- ROW 4: KPI LEADERBOARD & PERFORMANCE HEALTH                         -->
      <!-- =================================================================== -->
      <div class="dashboard-row-2">
        <!-- Top Performing Members Leaderboard -->
        <div class="card-panel">
          <div class="panel-header">
            <div class="panel-title-wrap">
              <h3>Top Performing Members (Leaderboard)</h3>
              <p class="panel-subtitle">Highest average composite scores recorded in evaluations</p>
            </div>
            <a routerLink="/admin/users/kpi" class="header-link">Full Leaderboard</a>
          </div>

          <div class="leaderboard-list">
            <div class="leaderboard-item" *ngFor="let item of stats?.kpiStats?.leaderboard">
              <div class="rank-badge" [class.rank-1]="item.rank === 1" [class.rank-2]="item.rank === 2" [class.rank-3]="item.rank === 3">
                {{ item.rank === 1 ? '🥇' : (item.rank === 2 ? '🥈' : '🥉') }}
              </div>
              <div class="performer-info">
                <strong>{{ item.fullName }}</strong>
                <span>{{ item.categoryName }} • {{ item.email }}</span>
              </div>
              <div class="score-badge-box">
                <div class="score-number">{{ item.avgScore }}%</div>
                <span class="period-tag">{{ item.latestPeriod || 'Current' }}</span>
              </div>
              <a [routerLink]="['/admin/users/kpi/grade', item.profileId]" class="btn-grade-sm" title="Grade Member">
                <span class="material-symbols-outlined">assignment_turned_in</span>
              </a>
            </div>

            <div *ngIf="!stats?.kpiStats?.leaderboard?.length" class="empty-cell" style="padding: 24px 0;">
              <span class="material-symbols-outlined" style="font-size: 32px; color: #cbd5e1; display:block; margin-bottom:6px;">military_tech</span>
              No KPI evaluation scorecards submitted yet.
              <div style="margin-top: 8px;">
                <a routerLink="/admin/users/kpi" class="btn-sm-details">Open KPI Hub</a>
              </div>
            </div>
          </div>
        </div>

        <!-- KPI Organizational Health Summary -->
        <div class="card-panel">
          <div class="panel-header">
            <div class="panel-title-wrap">
              <h3>KPI Organizational Performance Health</h3>
              <p class="panel-subtitle">Summary of active metric indicators and evaluation coverage</p>
            </div>
            <a routerLink="/admin/users/kpi/metrics/create" class="header-link">+ Add Metric</a>
          </div>

          <div class="kpi-health-grid">
            <div class="kpi-metric-box">
              <span class="kpi-box-label">Avg Organization Score</span>
              <div class="kpi-box-val text-blue">{{ stats?.kpiStats?.avgOrgScore || 0 }}%</div>
              <span class="kpi-box-sub">Across All Evaluations</span>
            </div>

            <div class="kpi-metric-box">
              <span class="kpi-box-label">Active KPI Indicators</span>
              <div class="kpi-box-val">{{ stats?.kpiStats?.indicatorsCount || 0 }}</div>
              <span class="kpi-box-sub">Configured Rubrics</span>
            </div>

            <div class="kpi-metric-box">
              <span class="kpi-box-label">Evaluated Headcount</span>
              <div class="kpi-box-val text-green">{{ stats?.kpiStats?.evaluatedMembersCount || 0 }}</div>
              <span class="kpi-box-sub">Members Assessed</span>
            </div>

            <div class="kpi-metric-box">
              <span class="kpi-box-label">Total Scorecards</span>
              <div class="kpi-box-val text-purple">{{ stats?.kpiStats?.totalEvaluations || 0 }}</div>
              <span class="kpi-box-sub">Historical Submissions</span>
            </div>
          </div>
        </div>
      </div>

      <!-- =================================================================== -->
      <!-- ROW 5: QUICK ACTIONS & RECENTLY ONBOARDED MEMBERS                   -->
      <!-- =================================================================== -->
      <div class="dashboard-row-2">
        <!-- Quick Action Center -->
        <div class="card-panel">
          <div class="panel-header">
            <div class="panel-title-wrap">
              <h3>Quick Action Center</h3>
              <p class="panel-subtitle">Fast shortcuts for member administration</p>
            </div>
          </div>
          <div class="quick-actions-grid">
            <a routerLink="/admin/users/create" class="action-tile">
              <div class="tile-icon bg-blue"><span class="material-symbols-outlined">person_add</span></div>
              <div class="tile-content">
                <strong>Add New Member</strong>
                <span>Provision an account with temporary credentials</span>
              </div>
              <span class="material-symbols-outlined arrow-icon">chevron_right</span>
            </a>

            <a routerLink="/admin/users/categories/create" class="action-tile">
              <div class="tile-icon bg-purple"><span class="material-symbols-outlined">add_circle</span></div>
              <div class="tile-content">
                <strong>Create Category Tier</strong>
                <span>Add department, faculty, or tier grouping</span>
              </div>
              <span class="material-symbols-outlined arrow-icon">chevron_right</span>
            </a>

            <a routerLink="/admin/users/list" class="action-tile">
              <div class="tile-icon bg-green"><span class="material-symbols-outlined">table_view</span></div>
              <div class="tile-content">
                <strong>Export Member Directory</strong>
                <span>Generate PDF, Excel, and Word registers</span>
              </div>
              <span class="material-symbols-outlined arrow-icon">chevron_right</span>
            </a>

            <a routerLink="/admin/users/kpi" class="action-tile">
              <div class="tile-icon bg-indigo"><span class="material-symbols-outlined">monitoring</span></div>
              <div class="tile-content">
                <strong>Evaluate KPI Scores</strong>
                <span>Review leaderboards and batch grade scorecards</span>
              </div>
              <span class="material-symbols-outlined arrow-icon">chevron_right</span>
            </a>
          </div>
        </div>

        <!-- Recently Onboarded Members (Hiding SuperAdmin) -->
        <div class="card-panel">
          <div class="panel-header">
            <div class="panel-title-wrap">
              <h3>Recently Onboarded Members</h3>
              <p class="panel-subtitle">Latest organizational accounts registered in tenant</p>
            </div>
            <a routerLink="/admin/users/list" class="header-link">View All</a>
          </div>

          <div class="table-responsive">
            <table class="mini-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th style="text-align:right;">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let m of stats?.recentRegistrations">
                  <td>
                    <div class="member-compact">
                      <div class="member-name">{{ m.fullName || 'Unnamed' }}</div>
                      <div class="member-email">{{ m.email }}</div>
                    </div>
                  </td>
                  <td>
                    <span class="cat-pill" [style.background]="(m.categoryColor || '#0050e5') + '15'" [style.color]="m.categoryColor || '#0050e5'">
                      {{ m.categoryName }}
                    </span>
                  </td>
                  <td>
                    <span class="status-indicator" [class.active]="m.userStatus === 'Active'">
                      {{ m.userStatus }}
                    </span>
                  </td>
                  <td style="text-align:right;">
                    <a [routerLink]="['/admin/users/details', m.id]" class="btn-sm-details">Details</a>
                  </td>
                </tr>
                <tr *ngIf="!stats?.recentRegistrations?.length">
                  <td colspan="4" class="empty-cell">No organizational members registered yet.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- =================================================================== -->
      <!-- ROW 6: SECURITY & FORENSIC AUDIT TRAIL                              -->
      <!-- =================================================================== -->
      <div class="card-panel">
        <div class="panel-header">
          <div class="panel-title-wrap">
            <h3>Recent Security & Forensic Audit Trail</h3>
            <p class="panel-subtitle">Real-time authentication, password lifecycle, and permission logs</p>
          </div>
          <a routerLink="/admin/users/activity" class="header-link">Full Audit Logs</a>
        </div>

        <div class="logs-stream-grid">
          <div class="log-stream-item" *ngFor="let l of stats?.recentLogs">
            <div class="log-dot"></div>
            <div class="log-content">
              <div class="log-title-row">
                <span class="log-action-tag">{{ l.actionType }}</span>
                <span class="log-time">{{ l.date | date:'short' }}</span>
              </div>
              <div class="log-description">{{ l.description }}</div>
            </div>
          </div>
          <div *ngIf="!stats?.recentLogs?.length" class="empty-cell" style="padding:20px 0;">
            No activity logs recorded yet.
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .user-dashboard-page { display: flex; flex-direction: column; gap: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; width: 100%; box-sizing: border-box; }

    /* Row 1 Metrics (4 Equal Cards) */
    .row-1-metrics-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; width: 100%; box-sizing: border-box; }
    @media (max-width: 1024px) { .row-1-metrics-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    @media (max-width: 600px) { .row-1-metrics-grid { grid-template-columns: 1fr; } }

    .stat-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; display: flex; flex-direction: column; justify-content: center; gap: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1); min-width: 0; box-sizing: border-box; text-decoration: none; color: inherit; }
    .stat-card.clickable { cursor: pointer; }
    .stat-card.clickable:hover { transform: translateY(-3px); border-color: #0050e5; box-shadow: 0 8px 24px rgba(0, 80, 229, 0.12); }
    .stat-card.card-alert { border-color: #fecdd3; background: #fff1f2; }
    .stat-card.card-alert.clickable:hover { border-color: #e11d48; box-shadow: 0 8px 24px rgba(225, 29, 72, 0.15); }
    
    .stat-top-row { display: flex; align-items: center; gap: 14px; min-width: 0; }
    .stat-icon-box { width: 46px; height: 46px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .stat-icon-box span { font-size: 24px; color: #ffffff; }

    .bg-blue { background: linear-gradient(135deg, #0050e5, #3b82f6); }
    .bg-green { background: linear-gradient(135deg, #10b981, #059669); }
    .bg-cyan { background: linear-gradient(135deg, #0284c7, #38bdf8); }
    .bg-pink { background: linear-gradient(135deg, #db2777, #f472b6); }
    .bg-amber { background: linear-gradient(135deg, #f59e0b, #d97706); }
    .bg-rose { background: linear-gradient(135deg, #e11d48, #f43f5e); }
    .bg-purple { background: linear-gradient(135deg, #8b5cf6, #6366f1); }
    .bg-indigo { background: linear-gradient(135deg, #6366f1, #4f46e5); }

    .bg-cyan-soft { background: #e0f2fe; color: #0284c7; }
    .bg-pink-soft { background: #fce7f3; color: #db2777; }

    .stat-details { display: flex; flex-direction: column; min-width: 0; overflow: hidden; }
    .stat-label { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .stat-value { font-size: 24px; font-weight: 800; color: #0f172a; margin: 2px 0; }
    .text-blue { color: #0050e5; }
    .text-green { color: #10b981; }
    .text-cyan { color: #0284c7; }
    .text-pink { color: #db2777; }
    .text-amber { color: #f59e0b; }
    .text-rose { color: #e11d48; }
    .text-purple { color: #8b5cf6; }
    .stat-subtext { font-size: 11px; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    /* 2-Column Responsive Layout (Zero Overlap with minmax(0, 1fr)) */
    .dashboard-row-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; width: 100%; box-sizing: border-box; }
    @media (max-width: 960px) { .dashboard-row-2 { grid-template-columns: 1fr; } }

    .card-panel { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); display: flex; flex-direction: column; width: 100%; min-width: 0; box-sizing: border-box; overflow: hidden; }
    .panel-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; gap: 12px; flex-wrap: wrap; }
    .panel-title-wrap { flex: 1; min-width: 200px; }
    .panel-header h3 { margin: 0; font-size: 15px; font-weight: 700; color: #0f172a; }
    .panel-subtitle { margin: 2px 0 0; font-size: 12px; color: #64748b; }
    .header-link { font-size: 12px; font-weight: 600; color: #0050e5; text-decoration: none; white-space: nowrap; }
    .header-link:hover { text-decoration: underline; }
    .badge-pill-soft { font-size: 11px; font-weight: 700; background: #eff6ff; color: #0050e5; padding: 3px 10px; border-radius: 6px; white-space: nowrap; }
    .badge-plan-tier { font-size: 11px; font-weight: 700; background: #f0fdf4; color: #15803d; padding: 3px 10px; border-radius: 6px; border: 1px solid #bbf7d0; text-transform: uppercase; white-space: nowrap; }
    
    .chart-canvas-container { width: 100%; height: 260px; position: relative; min-width: 0; }

    /* Row 2: Gender Demographics Widget */
    .gender-widget-body { display: flex; flex-direction: column; gap: 14px; justify-content: center; height: 100%; min-width: 0; }
    .gender-top-row { display: flex; justify-content: space-between; align-items: center; width: 100%; gap: 10px; }
    .gender-side { display: flex; align-items: center; gap: 10px; }
    .gender-icon-pill { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .gender-icon-pill span { font-size: 22px; }
    .gender-count-label { font-size: 12.5px; color: #334155; }
    .gender-percentage { font-size: 20px; font-weight: 800; line-height: 1.1; }
    .gender-mid-label { display: flex; align-items: center; gap: 4px; font-size: 10.5px; font-weight: 700; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.05em; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 999px; padding: 2px 10px; white-space: nowrap; }
    .mid-icon { font-size: 14px; }
    .dual-progress-container { display: flex; flex-direction: column; gap: 6px; width: 100%; }
    .dual-progress-track { display: flex; width: 100%; height: 12px; border-radius: 999px; overflow: hidden; background: #e2e8f0; box-shadow: inset 0 1px 2px rgba(0,0,0,0.06); }
    .dual-bar-male { height: 100%; background: linear-gradient(90deg, #0050e5, #38bdf8); transition: width 0.6s ease-in-out; }
    .dual-bar-female { height: 100%; background: linear-gradient(90deg, #f472b6, #db2777); transition: width 0.6s ease-in-out; }
    .dual-progress-footer { display: flex; justify-content: space-between; align-items: center; font-size: 10.5px; font-weight: 700; color: #64748b; }
    .middle-marker { color: #94a3b8; font-weight: 600; font-size: 10px; }

    /* Row 2: Quota Widget */
    .quota-widget-body { display: flex; flex-direction: column; gap: 14px; justify-content: center; height: 100%; min-width: 0; }
    .quota-top-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
    .quota-metric { display: flex; flex-direction: column; }
    .quota-label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; }
    .quota-value { font-size: 24px; font-weight: 800; color: #0f172a; }
    .quota-max { font-size: 16px; font-weight: 600; color: #94a3b8; }
    .quota-remaining-box { text-align: right; }
    .remaining-value { font-size: 14px; font-weight: 700; margin-top: 2px; }
    .quota-progress-container { display: flex; flex-direction: column; gap: 6px; width: 100%; }
    .quota-track { width: 100%; height: 12px; background: #e2e8f0; border-radius: 999px; overflow: hidden; box-shadow: inset 0 1px 2px rgba(0,0,0,0.06); }
    .quota-bar { height: 100%; border-radius: 999px; transition: width 0.6s ease-in-out; }
    .quota-footer-row { display: flex; justify-content: space-between; align-items: center; font-size: 11px; font-weight: 700; color: #475569; }
    .quota-subtext { font-size: 10.5px; color: #94a3b8; font-weight: normal; }

    /* Row 4: KPI Leaderboard */
    .leaderboard-list { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
    .leaderboard-item { display: flex; align-items: center; gap: 12px; padding: 10px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; transition: all 0.15s ease; min-width: 0; }
    .leaderboard-item:hover { background: #f1f5f9; }
    .rank-badge { font-size: 22px; width: 32px; text-align: center; flex-shrink: 0; }
    .performer-info { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .performer-info strong { font-size: 13px; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .performer-info span { font-size: 11px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .score-badge-box { text-align: right; flex-shrink: 0; }
    .score-number { font-size: 15px; font-weight: 800; color: #0050e5; }
    .period-tag { font-size: 10px; color: #94a3b8; font-weight: 600; }
    .btn-grade-sm { width: 32px; height: 32px; border-radius: 8px; background: #eff6ff; color: #0050e5; display: flex; align-items: center; justify-content: center; text-decoration: none; border: 1px solid #bfdbfe; transition: all 0.15s ease; flex-shrink: 0; }
    .btn-grade-sm:hover { background: #0050e5; color: #ffffff; }

    /* Row 4: KPI Health Grid */
    .kpi-health-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; height: 100%; align-content: center; min-width: 0; }
    .kpi-metric-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; display: flex; flex-direction: column; min-width: 0; }
    .kpi-box-label { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .kpi-box-val { font-size: 22px; font-weight: 800; color: #0f172a; margin: 2px 0; }
    .kpi-box-sub { font-size: 11px; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    /* Row 5: Quick Actions */
    .quick-actions-grid { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
    .action-tile { display: flex; align-items: center; gap: 12px; padding: 12px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; text-decoration: none; color: #1e293b; transition: all 0.15s ease; min-width: 0; }
    .action-tile:hover { background: #f1f5f9; border-color: #cbd5e1; transform: translateX(2px); }
    .tile-icon { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .tile-icon span { font-size: 20px; color: #ffffff; }
    .tile-content { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .tile-content strong { font-size: 13px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .tile-content span { font-size: 11px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .arrow-icon { color: #94a3b8; font-size: 20px; flex-shrink: 0; }

    /* Row 5: Mini Table */
    .table-responsive { overflow-x: auto; min-width: 0; }
    .mini-table { width: 100%; border-collapse: collapse; text-align: left; }
    .mini-table th { padding: 8px 10px; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e2e8f0; white-space: nowrap; }
    .mini-table td { padding: 10px; border-bottom: 1px solid #f1f5f9; font-size: 12px; vertical-align: middle; }
    .member-compact { display: flex; flex-direction: column; min-width: 0; }
    .member-name { font-weight: 700; color: #0f172a; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .member-email { font-size: 11px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .cat-pill { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px; white-space: nowrap; }
    .status-indicator { font-size: 11px; font-weight: 700; color: #f59e0b; white-space: nowrap; }
    .status-indicator.active { color: #10b981; }
    .btn-sm-details { padding: 4px 10px; background: #f1f5f9; color: #0050e5; border-radius: 6px; font-size: 11px; font-weight: 600; text-decoration: none; border: 1px solid #e2e8f0; white-space: nowrap; }
    .btn-sm-details:hover { background: #0050e5; color: #ffffff; }

    /* Row 6: Logs Stream Grid */
    .logs-stream-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px; min-width: 0; }
    .log-stream-item { display: flex; gap: 10px; align-items: flex-start; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; min-width: 0; }
    .log-dot { width: 8px; height: 8px; border-radius: 50%; background: #0050e5; margin-top: 6px; flex-shrink: 0; }
    .log-content { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .log-title-row { display: flex; justify-content: space-between; align-items: center; gap: 6px; }
    .log-action-tag { font-size: 10.5px; font-weight: 700; color: #0050e5; background: #eff6ff; padding: 1px 6px; border-radius: 4px; white-space: nowrap; }
    .log-time { font-size: 11px; color: #94a3b8; font-family: monospace; white-space: nowrap; }
    .log-description { font-size: 12px; color: #334155; }
    .empty-cell { text-align: center; color: #94a3b8; font-size: 12px; padding: 16px; }
  `]
})
export class UserDashboardComponent implements OnInit, AfterViewInit {
  isLoading = false;
  stats: any = null;

  headerButtons: PageHeaderButton[] = [
    {
      text: 'Add Member',
      icon: 'person_add',
      isPrimary: true,
      routerLink: '/admin/users/create'
    },
    {
      text: 'Directory Register',
      icon: 'table_view',
      isPrimary: false,
      routerLink: '/admin/users/list'
    }
  ];

  @ViewChild('growthLineCanvas') growthCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('kpiBarCanvas') kpiBarCanvasRef!: ElementRef<HTMLCanvasElement>;
  private growthChart: Chart | null = null;
  private kpiBarChart: Chart | null = null;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadStats();
  }

  ngAfterViewInit(): void {
    if (this.stats) {
      this.renderCharts();
    }
  }

  loadStats(): void {
    this.isLoading = true;
    this.api.get<any>('UsersApi/dashboard-stats').subscribe({
      next: (res) => {
        this.isLoading = false;
        this.stats = res.data;
        setTimeout(() => this.renderCharts(), 50);
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  getGenderSplit(): { malePercent: number; femalePercent: number } {
    const male = this.stats?.maleMembers || 0;
    const female = this.stats?.femaleMembers || 0;
    const total = male + female;
    if (total === 0) return { malePercent: 50, femalePercent: 50 };
    const malePercent = Math.round((male / total) * 100);
    const femalePercent = 100 - malePercent;
    return { malePercent, femalePercent };
  }

  private renderCharts(): void {
    this.renderGrowthChart();
    this.renderKpiBarChart();
  }

  private renderGrowthChart(): void {
    if (!this.growthCanvasRef?.nativeElement || !this.stats) return;

    if (this.growthChart) {
      this.growthChart.destroy();
    }

    const labels = this.stats.growthTrend?.labels || ['Month 1', 'Month 2', 'Month 3', 'Month 4', 'Month 5', 'Month 6'];
    const data = this.stats.growthTrend?.counts || [0, 0, 0, 0, 0, this.stats.totalMembers || 0];

    const ctx = this.growthCanvasRef.nativeElement.getContext('2d');
    let gradient = '#0050e5';
    if (ctx) {
      const grad = ctx.createLinearGradient(0, 0, 0, 240);
      grad.addColorStop(0, 'rgba(0, 80, 229, 0.25)');
      grad.addColorStop(1, 'rgba(0, 80, 229, 0.0)');
      gradient = grad as any;
    }

    this.growthChart = new Chart(this.growthCanvasRef.nativeElement, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'New Registered Members',
          data,
          borderColor: '#0050e5',
          backgroundColor: gradient,
          fill: true,
          tension: 0.35,
          pointBackgroundColor: '#0050e5',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { precision: 0, font: { size: 11 } },
            grid: { color: '#f1f5f9' }
          },
          x: {
            grid: { display: false },
            ticks: { font: { size: 11 } }
          }
        }
      }
    });
  }

  private renderKpiBarChart(): void {
    if (!this.kpiBarCanvasRef?.nativeElement || !this.stats) return;

    if (this.kpiBarChart) {
      this.kpiBarChart.destroy();
    }

    let labels = this.stats.kpiStats?.barChart?.labels || [];
    let scores = this.stats.kpiStats?.barChart?.scores || [];

    if (labels.length === 0) {
      labels = ['No Evaluated Members Yet'];
      scores = [0];
    }

    this.kpiBarChart = new Chart(this.kpiBarCanvasRef.nativeElement, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Average KPI Score (%)',
          data: scores,
          backgroundColor: [
            'rgba(0, 80, 229, 0.85)',
            'rgba(16, 185, 129, 0.85)',
            'rgba(139, 92, 246, 0.85)',
            'rgba(245, 158, 11, 0.85)'
          ],
          borderColor: [
            '#0050e5',
            '#10b981',
            '#8b5cf6',
            '#f59e0b'
          ],
          borderWidth: 1,
          borderRadius: 8,
          barThickness: 32
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `Score: ${ctx.raw}%`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: {
              callback: (val) => `${val}%`,
              font: { size: 11 }
            },
            grid: { color: '#f1f5f9' }
          },
          x: {
            grid: { display: false },
            ticks: { font: { size: 11 } }
          }
        }
      }
    });
  }
}
