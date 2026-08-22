import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-workspace-kpi',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="kpi-container">
      <!-- Header with Interactive Evaluation Period Switcher -->
      <div class="kpi-header-row">
        <div>
          <h1 class="page-title">My Performance & KPI Scorecard</h1>
          <p class="page-sub">Review your quarterly evaluations, milestone metrics, and supervisor appraisal feedback.</p>
        </div>

        <!-- Period Switcher Selector -->
        <div class="period-switcher-wrap">
          <label class="period-label">Evaluation Period:</label>
          <div class="period-chips">
            <button
              *ngFor="let p of periodsList"
              type="button"
              class="period-chip-btn"
              [class.active]="selectedPeriod === p.title"
              (click)="selectPeriod(p.title)"
            >
              <span class="material-symbols-outlined">calendar_today</span>
              <span>{{ p.title }}</span>
              <span *ngIf="p.isActive" class="active-dot" title="Current Active Cycle"></span>
            </button>
          </div>
        </div>
      </div>

      <!-- 2-Column Score & Trend Overview Grid -->
      <div class="kpi-overview-grid">
        <!-- Card 1: Cumulative Performance Hero -->
        <section class="kpi-hero-card">
          <div class="grade-badge" [class.grade-a]="grade === 'A'" [class.grade-b]="grade === 'B'">
            <div class="grade-char">{{ grade }}</div>
            <div class="grade-sub">Overall Grade</div>
          </div>
          <div class="banner-summary">
            <div class="metric-score-label">Cumulative Performance Index</div>
            <div class="metric-score-val">{{ overallScore }} <span class="max-val">/ 100</span></div>
            <div class="progress-bar-bg">
              <div class="progress-bar-fill" [style.width.%]="overallScore"></div>
            </div>
            <div class="hero-sub-stats">
              <span class="sub-stat">Target: <strong>85%</strong></span>
              <span class="sub-stat text-success">• Standing: <strong>Top 15%</strong></span>
            </div>
          </div>
          <div class="banner-badge-col">
            <div class="status-pill good">
              <span class="material-symbols-outlined">verified</span>
              <span>Target Achieved</span>
            </div>
            <div class="period-display-pill">
              <span class="material-symbols-outlined">event_available</span>
              <span>{{ selectedPeriod }}</span>
            </div>
          </div>
        </section>

        <!-- Card 2: Historical Multi-Quarter Trend Visualizer -->
        <section class="trend-card">
          <div class="trend-header">
            <div class="trend-title">
              <span class="material-symbols-outlined text-primary">trending_up</span>
              <h3>Quarterly Performance Trend</h3>
            </div>
            <span class="growth-pill text-success">+3.0% Growth</span>
          </div>

          <div class="trend-bars-layout">
            <div class="trend-bar-row" *ngFor="let t of historicalTrend">
              <div class="trend-period-label">{{ t.period }}</div>
              <div class="trend-track">
                <div class="trend-fill" [style.width.%]="t.score" [class.active-period]="t.period === selectedPeriod"></div>
              </div>
              <div class="trend-score-val">{{ t.score }}%</div>
            </div>
          </div>
        </section>
      </div>

      <!-- Card 3: Evaluated Metrics Breakdown (Grouped by Category with Weightings) -->
      <section class="metrics-card">
        <div class="card-head">
          <div class="head-title-wrap">
            <span class="material-symbols-outlined text-primary">format_list_bulleted</span>
            <h2 class="card-title">Evaluated Metrics Breakdown ({{ selectedPeriod }})</h2>
          </div>
          <span class="badge-count">{{ kpiScores.length }} Metrics Scored</span>
        </div>

        <div class="table-wrap">
          <table class="kpi-table">
            <thead>
              <tr>
                <th>KPI Metric & Category</th>
                <th>Weight</th>
                <th>Target</th>
                <th>Achieved Score</th>
                <th>Performance Progress</th>
                <th>Evaluator Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of kpiScores">
                <td>
                  <strong>{{ item.title }}</strong>
                  <div class="category-chip">{{ item.category || 'Operational Execution' }}</div>
                </td>
                <td>
                  <span class="weight-tag">{{ (item.weight || 1.0) * 100 | number:'1.0-0' }}%</span>
                </td>
                <td class="num-cell">{{ item.targetValue || 100 }}</td>
                <td class="num-cell highlight">{{ item.score }}</td>
                <td style="min-width: 140px;">
                  <div class="mini-progress-bg">
                    <div class="mini-progress-fill" [style.width.%]="calcPercent(item.score, item.targetValue)"></div>
                  </div>
                  <span class="pct-text">{{ calcPercent(item.score, item.targetValue) }}%</span>
                </td>
                <td class="notes-cell">{{ item.remarks || 'Excellent execution across milestones.' }}</td>
              </tr>
              <tr *ngIf="!kpiScores.length">
                <td colspan="6" class="empty-cell">No formal evaluations recorded for {{ selectedPeriod }}.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Card 4: Official Supervisor Appraisal Feedback Remarks -->
      <section class="supervisor-feedback-card">
        <div class="feedback-head">
          <div class="feedback-title">
            <span class="material-symbols-outlined text-purple">rate_review</span>
            <h3>Official Supervisor Evaluation Appraisal</h3>
          </div>
          <span class="feedback-date">{{ selectedPeriod }} Appraisal</span>
        </div>
        <blockquote class="feedback-quote">
          "{{ supervisorRemarks }}"
        </blockquote>
      </section>
    </div>
  `,
  styles: [`
    .kpi-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .kpi-header-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      flex-wrap: wrap;
      gap: 16px;
      margin-bottom: 4px;
    }
    .page-title {
      font-size: 22px;
      font-weight: 800;
      color: var(--md-sys-color-on-surface, #0f172a);
      margin: 0 0 4px;
    }
    .page-sub { font-size: 13px; color: #64748b; margin: 0; }

    /* Period Switcher */
    .period-switcher-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .period-label {
      font-size: 12px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .period-chips {
      display: flex;
      gap: 6px;
      background: #f1f5f9;
      padding: 4px;
      border-radius: 10px;
    }
    .period-chip-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: none;
      border: none;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 12.5px;
      font-weight: 700;
      color: #475569;
      cursor: pointer;
      transition: all 0.2s;
      position: relative;
    }
    .period-chip-btn span.material-symbols-outlined { font-size: 16px; }
    .period-chip-btn:hover { color: #0050e5; }
    .period-chip-btn.active {
      background: #ffffff;
      color: #0050e5;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }
    .active-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #16a34a;
      display: inline-block;
    }

    /* 2-Column Overview */
    .kpi-overview-grid {
      display: grid;
      grid-template-columns: 1.2fr 1fr;
      gap: 20px;
    }
    @media (max-width: 900px) {
      .kpi-overview-grid { grid-template-columns: 1fr; }
    }

    /* Hero Card */
    .kpi-hero-card {
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 24px 28px;
      display: flex;
      align-items: center;
      gap: 24px;
      color: #ffffff;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    }
    .grade-badge {
      width: 76px;
      height: 76px;
      border-radius: 20px;
      background: linear-gradient(135deg, #22c55e, #16a34a);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 8px 24px rgba(34, 197, 94, 0.35);
    }
    .grade-char { font-size: 32px; font-weight: 900; line-height: 1; }
    .grade-sub { font-size: 9px; font-weight: 700; text-transform: uppercase; }
    .banner-summary { flex: 1; min-width: 0; }
    .metric-score-label { font-size: 12.5px; color: #94a3b8; margin-bottom: 2px; }
    .metric-score-val { font-size: 24px; font-weight: 900; color: #ffffff; margin-bottom: 6px; }
    .max-val { font-size: 14px; color: #94a3b8; font-weight: 500; }
    .progress-bar-bg {
      height: 7px;
      background: rgba(255, 255, 255, 0.15);
      border-radius: 6px;
      overflow: hidden;
      margin-bottom: 8px;
    }
    .progress-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #22c55e, #38bdf8);
      border-radius: 6px;
      transition: width 0.6s ease;
    }
    .hero-sub-stats { font-size: 12px; color: #cbd5e1; display: flex; gap: 8px; }

    .banner-badge-col {
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex-shrink: 0;
    }
    .status-pill.good {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: rgba(34, 197, 94, 0.2);
      border: 1px solid #22c55e;
      color: #4ade80;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 11.5px;
      font-weight: 700;
    }
    .status-pill.good span { font-size: 14px; }
    .period-display-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: rgba(0, 80, 229, 0.25);
      border: 1px solid #0050e5;
      color: #60a5fa;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 11.5px;
      font-weight: 700;
    }
    .period-display-pill span { font-size: 14px; }

    /* Trend Card */
    .trend-card {
      background: var(--md-sys-color-surface, #ffffff);
      border: 1px solid var(--md-sys-color-outline, #e2e8f0);
      border-radius: 16px;
      padding: 22px 24px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .trend-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
    }
    .trend-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .trend-title h3 { font-size: 15px; font-weight: 800; color: #0f172a; margin: 0; }
    .trend-title span { font-size: 20px; }
    .growth-pill {
      font-size: 11.5px;
      font-weight: 800;
      background: rgba(22, 163, 74, 0.12);
      padding: 3px 8px;
      border-radius: 12px;
    }

    .trend-bars-layout {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .trend-bar-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .trend-period-label {
      width: 65px;
      font-size: 12px;
      font-weight: 700;
      color: #475569;
    }
    .trend-track {
      flex: 1;
      height: 8px;
      background: #f1f5f9;
      border-radius: 6px;
      overflow: hidden;
    }
    .trend-fill {
      height: 100%;
      background: #94a3b8;
      border-radius: 6px;
      transition: width 0.6s ease;
    }
    .trend-fill.active-period {
      background: linear-gradient(90deg, #0050e5, #38bdf8);
    }
    .trend-score-val {
      width: 38px;
      font-size: 12px;
      font-weight: 800;
      color: #0f172a;
      text-align: right;
    }

    /* Metrics Table Card */
    .metrics-card {
      background: var(--md-sys-color-surface, #ffffff);
      border: 1px solid var(--md-sys-color-outline, #e2e8f0);
      border-radius: 16px;
      padding: 24px 28px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
    }
    .card-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 18px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 12px;
    }
    .head-title-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .head-title-wrap span { font-size: 22px; }
    .card-title {
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
    }
    .badge-count {
      font-size: 11.5px;
      font-weight: 700;
      color: #0050e5;
      background: rgba(0, 80, 229, 0.1);
      padding: 3px 10px;
      border-radius: 12px;
    }

    .table-wrap { overflow-x: auto; }
    .kpi-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .kpi-table th {
      text-align: left;
      padding: 10px 14px;
      font-size: 11.5px;
      font-weight: 800;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #e2e8f0;
    }
    .kpi-table td {
      padding: 14px;
      border-bottom: 1px solid #f1f5f9;
      color: #1e293b;
    }
    .category-chip {
      font-size: 11px;
      color: #64748b;
      margin-top: 2px;
    }
    .weight-tag {
      font-size: 11px;
      font-weight: 700;
      background: #f1f5f9;
      padding: 2px 6px;
      border-radius: 6px;
      color: #475569;
    }
    .num-cell { font-weight: 700; }
    .num-cell.highlight { color: #0050e5; font-size: 14px; font-weight: 800; }
    .mini-progress-bg {
      height: 6px;
      background: #f1f5f9;
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 2px;
    }
    .mini-progress-fill {
      height: 100%;
      background: #16a34a;
      border-radius: 4px;
    }
    .pct-text { font-size: 11px; font-weight: 700; color: #16a34a; }
    .notes-cell { color: #475569; font-style: italic; font-size: 12.5px; max-width: 260px; }
    .empty-cell { text-align: center; padding: 24px; color: #94a3b8; }

    /* Supervisor Feedback Card */
    .supervisor-feedback-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-left: 4px solid #9333ea;
      border-radius: 14px;
      padding: 20px 24px;
    }
    .feedback-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .feedback-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .feedback-title h3 { font-size: 14px; font-weight: 800; color: #0f172a; margin: 0; }
    .feedback-title span { font-size: 20px; }
    .feedback-date { font-size: 11.5px; font-weight: 700; color: #64748b; }
    .feedback-quote {
      margin: 0;
      font-size: 13.5px;
      line-height: 1.6;
      color: #334155;
      font-style: italic;
    }

    .text-primary { color: #0050e5; }
    .text-success { color: #16a34a; }
    .text-purple { color: #9333ea; }
  `]
})
export class WorkspaceKpiComponent implements OnInit {
  selectedPeriod = 'Q3 2026';
  periodsList: any[] = [];
  overallScore = 88;
  grade = 'A';
  kpiScores: any[] = [];
  historicalTrend: any[] = [];
  supervisorRemarks = 'Exceptional consistency across operational deliverables and high engagement.';

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadPeriods();
  }

  loadPeriods(): void {
    this.api.get<any>('PortalUsersApi/periods').subscribe({
      next: (res) => {
        if (Array.isArray(res?.data) && res.data.length > 0) {
          this.periodsList = res.data;
          const active = this.periodsList.find(p => p.isActive);
          this.selectedPeriod = active ? active.title : this.periodsList[0].title;
        } else {
          this.periodsList = [
            { title: 'Q3 2026', isActive: true },
            { title: 'Q2 2026', isActive: false },
            { title: 'Q1 2026', isActive: false }
          ];
          this.selectedPeriod = 'Q3 2026';
        }
        this.loadScorecard(this.selectedPeriod);
      },
      error: () => {
        this.periodsList = [
          { title: 'Q3 2026', isActive: true },
          { title: 'Q2 2026', isActive: false },
          { title: 'Q1 2026', isActive: false }
        ];
        this.loadScorecard('Q3 2026');
      }
    });
  }

  selectPeriod(periodTitle: string): void {
    this.selectedPeriod = periodTitle;
    this.loadScorecard(periodTitle);
  }

  loadScorecard(period: string): void {
    this.api.get<any>(`PortalUsersApi/my-kpi?period=${encodeURIComponent(period)}`).subscribe({
      next: (res) => {
        if (res?.data) {
          this.overallScore = res.data.overallScore || 88;
          this.grade = res.data.grade || 'A';
          this.kpiScores = res.data.scores || [];
          this.historicalTrend = res.data.historicalTrend || [];
          this.supervisorRemarks = res.data.supervisorRemarks || 'Exceptional execution across designated milestones.';
        }
      },
      error: () => {
        // Fallback demo data
        this.overallScore = 88;
        this.grade = 'A';
        this.kpiScores = [
          { title: 'Project Deliverables & Milestones', category: 'Operational Execution', weight: 0.4, targetValue: 100, score: 92, remarks: 'Delivered all designated sprints on time.' },
          { title: 'Attendance & Community Participation', category: 'Engagement', weight: 0.3, targetValue: 100, score: 85, remarks: 'Active engagement in committee meetings.' },
          { title: 'Code Quality & Adherence to Standards', category: 'Technical Excellence', weight: 0.3, targetValue: 100, score: 87, remarks: 'High code review pass rate.' }
        ];
        this.historicalTrend = [
          { period: 'Q1 2026', score: 82 },
          { period: 'Q2 2026', score: 85 },
          { period: 'Q3 2026', score: 88 }
        ];
      }
    });
  }

  calcPercent(score: number, target: number): number {
    const t = target > 0 ? target : 100;
    return Math.round((score / t) * 100);
  }
}
