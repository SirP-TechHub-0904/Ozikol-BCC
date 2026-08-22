import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent, PageHeaderButton } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-user-kpi',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, PageHeaderComponent],
  template: `
    <div class="user-kpi-page">
      <!-- Standardized Page Header -->
      <app-page-header
        eyebrow="USER MANAGEMENT"
        icon="monitoring"
        title="KPI Indicators & Member Leaderboard"
        subtitle="Configure organizational performance metrics, evaluate member scorecards, and track dynamic leaderboard rankings."
        [buttons]="headerButtons"
        [loading]="isLoading"
      ></app-page-header>

      <!-- Inline Create Period Banner (when opened) -->
      <div class="period-create-card" *ngIf="showNewPeriodModal">
        <div class="period-create-header">
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="material-symbols-outlined text-blue">calendar_add_on</span>
            <strong>Create New Evaluation Period / Cycle</strong>
          </div>
          <button type="button" class="btn-close-sm" (click)="showNewPeriodModal = false">&times;</button>
        </div>
        <div class="period-create-body">
          <div class="form-group-inline">
            <label>Period Title *</label>
            <input type="text" [(ngModel)]="newPeriodTitle" placeholder="e.g. 2026 Q4, Annual 2026, September 2026..." />
          </div>
          <div class="form-group-inline" style="flex:1;">
            <label>Description (Optional)</label>
            <input type="text" [(ngModel)]="newPeriodDescription" placeholder="e.g. Fourth quarter executive review cycle..." />
          </div>
          <button type="button" class="btn btn-primary btn-sm" (click)="createPeriod()" [disabled]="isCreatingPeriod || !newPeriodTitle.trim()">
            <span class="material-symbols-outlined">save</span>
            <span>{{ isCreatingPeriod ? 'Saving...' : 'Save Period' }}</span>
          </button>
        </div>
      </div>

      <!-- Main 2-Column KPI Workspace Grid -->
      <div class="kpi-workspace-grid">
        <!-- 1. KPI Indicators / Metrics Panel -->
        <div class="kpi-panel">
          <div class="panel-header">
            <div>
              <h3>Performance Evaluation Metrics</h3>
              <p>Rubrics and numerical indicators used during member evaluations</p>
            </div>
            <a routerLink="/admin/users/kpi/metrics/create" class="btn btn-primary btn-sm">
              <span class="material-symbols-outlined">add</span>
              <span>Create Metric</span>
            </a>
          </div>

          <div class="metrics-list" *ngIf="!isLoading">
            <div class="metric-card" *ngFor="let m of metrics">
              <div class="metric-icon-box">
                <span class="material-symbols-outlined">analytics</span>
              </div>
              <div class="metric-details">
                <div class="metric-title-row">
                  <strong>{{ m.title }}</strong>
                  <span class="metric-cat-badge">{{ m.category || 'General' }}</span>
                </div>
                <p class="metric-desc">{{ m.description || 'Standard performance evaluation indicator.' }}</p>
                <div class="metric-meta-row">
                  <span>Max Score: <strong>{{ m.maxScore || 100 }}</strong></span>
                  <span>Weight: <strong>{{ m.weight || 1.0 }}x</strong></span>
                </div>
              </div>
              <div class="metric-actions">
                <a [routerLink]="['/users/console/kpi/metrics/edit', m.id]" class="btn-icon" title="Edit Metric">
                  <span class="material-symbols-outlined">edit</span>
                </a>
                <a [routerLink]="['/users/console/kpi/metrics/delete', m.id]" class="btn-icon text-danger" title="Delete Metric">
                  <span class="material-symbols-outlined">delete</span>
                </a>
              </div>
            </div>

            <div class="empty-state" *ngIf="metrics.length === 0">
              <span class="material-symbols-outlined">assignment</span>
              <p>No KPI indicators defined yet.</p>
              <a routerLink="/admin/users/kpi/metrics/create" class="btn btn-outline btn-sm">Create Indicator</a>
            </div>
          </div>
        </div>

        <!-- 2. Performance Leaderboard Panel -->
        <div class="kpi-panel">
          <div class="panel-header">
            <div>
              <h3>Member Performance Leaderboard</h3>
              <p>Rankings derived from genuine evaluation scorecards</p>
            </div>
            <div class="period-picker-group">
              <div class="period-picker">
                <label>Period:</label>
                <select [(ngModel)]="selectedPeriod" (change)="loadLeaderboard()">
                  <option *ngFor="let p of periods" [value]="p.title">{{ p.title }}</option>
                </select>
              </div>
              <button type="button" class="btn btn-outline btn-sm btn-add-period" (click)="showNewPeriodModal = !showNewPeriodModal" title="Add New Evaluation Cycle">
                <span class="material-symbols-outlined">add_circle</span>
                <span>Add Period</span>
              </button>
            </div>
          </div>

          <div class="table-responsive" *ngIf="!isLoading">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 50px;">Rank</th>
                  <th>Member</th>
                  <th>Category</th>
                  <th style="text-align:center;">Score</th>
                  <th style="text-align:right;">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of leaderboard; let i = index">
                  <td>
                    <div class="rank-badge" [class.gold]="i === 0" [class.silver]="i === 1" [class.bronze]="i === 2">
                      {{ i === 0 ? '🥇' : (i === 1 ? '🥈' : (i === 2 ? '🥉' : (i + 1))) }}
                    </div>
                  </td>
                  <td>
                    <div class="member-compact">
                      <div class="member-name">{{ item.fullName }}</div>
                      <div class="member-email">{{ item.email }}</div>
                    </div>
                  </td>
                  <td>
                    <span class="cat-tag">{{ item.categoryName || 'General' }}</span>
                  </td>
                  <td style="text-align:center;">
                    <span class="score-badge">{{ item.averageScore }}%</span>
                  </td>
                  <td style="text-align:right;">
                    <a [routerLink]="['/admin/users/kpi/grade', item.userId]" class="btn btn-outline btn-xs">
                      Grade
                    </a>
                  </td>
                </tr>
                <tr *ngIf="leaderboard.length === 0">
                  <td colspan="5" class="empty-table-cell">
                    <span class="material-symbols-outlined empty-icon">leaderboard</span>
                    <p>No evaluation scores recorded for <strong>{{ selectedPeriod }}</strong>.</p>
                    <p class="empty-subtext">Select a member from the directory to enter this period's performance evaluation.</p>
                    <div style="margin-top: 12px;">
                      <a routerLink="/admin/users/list" class="btn btn-outline btn-sm">Browse Directory to Grade</a>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .user-kpi-page { display: flex; flex-direction: column; gap: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; width: 100%; box-sizing: border-box; }

    /* Period Creator Banner */
    .period-create-card { background: #ffffff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 16px 20px; display: flex; flex-direction: column; gap: 12px; box-shadow: 0 4px 14px rgba(0, 80, 229, 0.08); animation: fadeIn 0.2s ease-in-out; }
    .period-create-header { display: flex; justify-content: space-between; align-items: center; }
    .btn-close-sm { background: none; border: none; font-size: 22px; cursor: pointer; color: #64748b; line-height: 1; }
    .period-create-body { display: flex; gap: 14px; align-items: flex-end; flex-wrap: wrap; }
    .form-group-inline { display: flex; flex-direction: column; gap: 4px; min-width: 220px; }
    .form-group-inline label { font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; }
    .form-group-inline input { height: 38px; padding: 0 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; outline: none; }
    .form-group-inline input:focus { border-color: #0050e5; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }

    /* Workspace 2-Column Grid (Zero Overlap) */
    .kpi-workspace-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; width: 100%; box-sizing: border-box; }
    @media (max-width: 960px) { .kpi-workspace-grid { grid-template-columns: 1fr; } }

    .kpi-panel { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); display: flex; flex-direction: column; width: 100%; min-width: 0; box-sizing: border-box; overflow: hidden; }
    .panel-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px; gap: 12px; flex-wrap: wrap; }
    .panel-header h3 { margin: 0; font-size: 15px; font-weight: 700; color: #0f172a; }
    .panel-header p { margin: 2px 0 0; font-size: 12px; color: #64748b; }

    .period-picker-group { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .period-picker { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; color: #475569; }
    .period-picker select { height: 34px; padding: 0 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 12px; outline: none; background: #fff; font-weight: 600; color: #0f172a; }
    .btn-add-period { height: 34px; padding: 0 10px; display: inline-flex; align-items: center; gap: 4px; font-size: 11.5px; font-weight: 600; border-radius: 8px; }

    /* Metrics List */
    .metrics-list { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
    .metric-card { display: flex; align-items: center; gap: 14px; padding: 14px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; transition: all 0.15s ease; min-width: 0; }
    .metric-card:hover { background: #f1f5f9; border-color: #cbd5e1; }
    .metric-icon-box { width: 40px; height: 40px; border-radius: 10px; background: #eff6ff; color: #0050e5; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .metric-details { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .metric-title-row { display: flex; align-items: center; gap: 8px; }
    .metric-title-row strong { font-size: 13.5px; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .metric-cat-badge { font-size: 10px; font-weight: 700; background: #e2e8f0; color: #475569; padding: 1px 6px; border-radius: 4px; text-transform: uppercase; }
    .metric-desc { margin: 0; font-size: 11.5px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .metric-meta-row { display: flex; gap: 12px; font-size: 11px; color: #64748b; margin-top: 2px; }
    .metric-actions { display: flex; gap: 6px; flex-shrink: 0; }
    .btn-icon { width: 32px; height: 32px; border-radius: 6px; border: 1px solid #e2e8f0; background: #ffffff; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #475569; text-decoration: none; transition: all 0.15s; }
    .btn-icon:hover { background: #0050e5; color: #ffffff; border-color: #0050e5; }
    .btn-icon.text-danger:hover { background: #e11d48; color: #ffffff; border-color: #e11d48; }

    /* Leaderboard Table */
    .table-responsive { overflow-x: auto; min-width: 0; }
    .data-table { width: 100%; border-collapse: collapse; text-align: left; }
    .data-table th { padding: 10px 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e2e8f0; }
    .data-table td { padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 12.5px; vertical-align: middle; }
    .rank-badge { font-size: 16px; font-weight: 800; text-align: center; }
    .member-compact { display: flex; flex-direction: column; min-width: 0; }
    .member-name { font-weight: 700; color: #0f172a; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .member-email { font-size: 11px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .cat-tag { font-size: 11px; font-weight: 600; background: #f1f5f9; color: #475569; padding: 2px 8px; border-radius: 4px; }
    .score-badge { font-size: 13.5px; font-weight: 800; color: #0050e5; background: #eff6ff; padding: 3px 10px; border-radius: 6px; border: 1px solid #bfdbfe; }
    .empty-state, .empty-table-cell { text-align: center; color: #64748b; padding: 32px 16px; font-size: 13px; }
    .empty-icon { font-size: 40px; color: #cbd5e1; display: block; margin-bottom: 8px; }
    .empty-subtext { font-size: 11.5px; color: #94a3b8; margin: 4px 0 0; }

    .btn { height: 38px; padding: 0 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; text-decoration: none; border: none; transition: all 0.15s ease; }
    .btn-sm { height: 34px; padding: 0 12px; font-size: 12px; }
    .btn-xs { height: 28px; padding: 0 10px; font-size: 11px; }
    .btn-primary { background: #0050e5; color: #ffffff; }
    .btn-primary:hover { background: #003bb5; }
    .btn-outline { background: #ffffff; border: 1px solid #cbd5e1; color: #334155; }
    .btn-outline:hover { background: #f8fafc; border-color: #94a3b8; }
  `]
})
export class UserKpiComponent implements OnInit {
  isLoading = false;
  isCreatingPeriod = false;
  showNewPeriodModal = false;

  newPeriodTitle = '';
  newPeriodDescription = '';

  metrics: any[] = [];
  periods: any[] = [];
  leaderboard: any[] = [];
  selectedPeriod = '';

  headerButtons: PageHeaderButton[] = [
    {
      text: 'Create KPI Metric',
      icon: 'add_chart',
      isPrimary: true,
      routerLink: '/admin/users/kpi/metrics/create'
    }
  ];

  constructor(
    private api: ApiService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.loadMetrics();
    this.loadPeriods();
  }

  loadMetrics(): void {
    this.isLoading = true;
    this.api.get<any>('UsersApi/kpi-indicators').subscribe({
      next: (res) => {
        this.isLoading = false;
        this.metrics = res.data || [];
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  loadPeriods(): void {
    this.api.get<any>('UsersApi/kpi-periods').subscribe({
      next: (res) => {
        this.periods = res.data || [];
        if (this.periods.length > 0) {
          if (!this.selectedPeriod || !this.periods.some(p => p.title === this.selectedPeriod)) {
            this.selectedPeriod = this.periods[0].title;
          }
        } else {
          this.selectedPeriod = `${new Date().getFullYear()} Q${Math.floor(new Date().getMonth() / 3) + 1}`;
          this.periods = [{ title: this.selectedPeriod }];
        }
        this.loadLeaderboard();
      },
      error: () => {
        this.loadLeaderboard();
      }
    });
  }

  loadLeaderboard(): void {
    if (!this.selectedPeriod) return;
    this.api.get<any>(`UsersApi/kpi-leaderboard?period=${encodeURIComponent(this.selectedPeriod)}`).subscribe({
      next: (res) => {
        this.leaderboard = res.data || [];
      },
      error: () => {
        this.leaderboard = [];
      }
    });
  }

  createPeriod(): void {
    if (!this.newPeriodTitle.trim()) {
      this.toast.error('Period Title is required.');
      return;
    }

    this.isCreatingPeriod = true;
    const payload = {
      title: this.newPeriodTitle.trim(),
      description: this.newPeriodDescription.trim(),
      isActive: true
    };

    this.api.post<any>('UsersApi/kpi-periods', payload).subscribe({
      next: () => {
        this.isCreatingPeriod = false;
        this.toast.success(`Evaluation period '${this.newPeriodTitle}' created.`);
        this.selectedPeriod = this.newPeriodTitle.trim();
        this.newPeriodTitle = '';
        this.newPeriodDescription = '';
        this.showNewPeriodModal = false;
        this.loadPeriods();
      },
      error: (err) => {
        this.isCreatingPeriod = false;
        this.toast.error(err?.error?.message || 'Failed to create period.');
      }
    });
  }

  async deleteMetric(m: any): Promise<void> {
    const confirmed = await this.toast.confirm(
      'Delete KPI Indicator',
      `You are about to permanently delete KPI indicator '${m.title}'.`,
      'Delete Indicator',
      'Cancel',
      'danger',
      m.title,
      [
        'All performance evaluation history linked to this metric will be detached.',
        'This metric indicator cannot be recovered.'
      ]
    );
    if (!confirmed) return;

    this.api.delete<any>(`UsersApi/kpi-indicators/${m.id}`).subscribe({
      next: () => {
        this.toast.success(`Indicator '${m.title}' deleted.`);
        this.loadMetrics();
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'Failed to delete indicator.');
      }
    });
  }
}
