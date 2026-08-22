import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent, PageHeaderButton } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-kpi-grade',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent],
  template: `
    <div class="grade-page" *ngIf="user">
      <!-- Standardized Page Header -->
      <app-page-header
        eyebrow="PERFORMANCE EVALUATION"
        icon="assignment_turned_in"
        [title]="'Grade Scorecard: ' + user.fullName"
        [subtitle]="'Member ID: ' + (user.memberId || 'N/A') + ' • ' + (user.categoryName || 'General')"
        [buttons]="headerButtons"
        [loading]="isLoading || isSaving"
      ></app-page-header>

      <!-- Main Scorecard Card -->
      <form (ngSubmit)="submitEvaluation()" class="form-container">
        <div class="form-card">
          <div class="card-header" style="justify-content:space-between; flex-wrap:wrap; gap:10px;">
            <div style="display:flex; align-items:center; gap:12px;">
              <span class="material-symbols-outlined header-icon">speed</span>
              <div>
                <h3>Evaluation Period & Scorecard Matrix</h3>
                <p>Input scores for active indicators and submit performance review</p>
              </div>
            </div>

            <div class="period-selector-row">
              <label>Evaluation Period:</label>
              <select [(ngModel)]="evaluationPeriod" name="evaluationPeriod" *ngIf="!customPeriodMode">
                <option *ngFor="let p of periods" [value]="p.title">{{ p.title }}</option>
                <option value="__CUSTOM__">+ Custom / New Period...</option>
              </select>
              <div *ngIf="customPeriodMode" style="display:flex; gap:6px; align-items:center;">
                <input type="text" [(ngModel)]="customPeriodText" placeholder="e.g. 2026 Q4, Sept 2026..." style="height:36px; padding:0 10px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px;" />
                <button type="button" class="btn btn-outline btn-xs" (click)="customPeriodMode = false">Use Existing</button>
              </div>
            </div>
          </div>

          <div class="card-body">
            <!-- Indicators Evaluation Rows -->
            <div class="indicators-grading-list" *ngIf="indicators.length > 0">
              <div class="indicator-grade-card" *ngFor="let ind of indicators">
                <div class="ind-info">
                  <strong>{{ ind.title }}</strong>
                  <span class="ind-category">{{ ind.category || 'Standard' }}</span>
                  <p class="ind-desc">{{ ind.description || 'Evaluation indicator.' }}</p>
                  <span class="max-badge">Max Score: {{ ind.maxScore || 100 }} • Weight: {{ ind.weight || 1.0 }}x</span>
                </div>

                <div class="ind-inputs">
                  <div class="input-field">
                    <label>Score (0 - {{ ind.maxScore || 100 }})</label>
                    <input
                      type="number"
                      [(ngModel)]="ind.scoreInput"
                      [name]="'score_' + ind.id"
                      [min]="0"
                      [max]="ind.maxScore || 100"
                      placeholder="e.g. 85"
                    />
                  </div>

                  <div class="input-field remarks-field">
                    <label>Remarks / Feedback</label>
                    <input
                      type="text"
                      [(ngModel)]="ind.remarksInput"
                      [name]="'remarks_' + ind.id"
                      placeholder="Feedback notes..."
                    />
                  </div>
                </div>
              </div>
            </div>

            <div class="empty-state" *ngIf="indicators.length === 0">
              <span class="material-symbols-outlined">assignment_late</span>
              <p>No active KPI indicators available for grading.</p>
              <a routerLink="/admin/users/kpi/metrics/create" class="btn btn-primary btn-sm">Create Indicator</a>
            </div>
          </div>

          <div class="card-footer" *ngIf="indicators.length > 0">
            <a [routerLink]="['/admin/users/details', userId]" class="btn btn-outline">Cancel</a>
            <button type="submit" class="btn btn-primary" [disabled]="isSaving">
              <span *ngIf="!isSaving" class="material-symbols-outlined">send</span>
              <span>{{ isSaving ? 'Submitting Scorecard...' : 'Submit Evaluation Scores' }}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .grade-page { display: flex; flex-direction: column; gap: 18px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; width: 100%; }

    .form-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); overflow: hidden; display: flex; flex-direction: column; width: 100%; }
    .card-header { display: flex; align-items: center; gap: 14px; padding: 18px 22px; border-bottom: 1px solid #f1f5f9; background: #fafbfc; }
    .header-icon { font-size: 24px; color: #0050e5; }
    .card-header h3 { margin: 0; font-size: 15px; font-weight: 700; color: #0f172a; }
    .card-header p { margin: 2px 0 0; font-size: 12px; color: #64748b; }
    .card-body { padding: 22px; display: flex; flex-direction: column; gap: 16px; }

    .period-selector-row { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 700; color: #475569; }
    .period-selector-row select { height: 36px; padding: 0 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; outline: none; background: #ffffff; font-weight: 600; color: #0f172a; }

    .indicators-grading-list { display: flex; flex-direction: column; gap: 14px; }
    .indicator-grade-card { display: flex; justify-content: space-between; align-items: center; gap: 18px; padding: 16px 18px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; flex-wrap: wrap; }
    .ind-info { flex: 1; min-width: 240px; }
    .ind-info strong { font-size: 14px; color: #0f172a; display: inline-block; margin-right: 8px; }
    .ind-category { font-size: 10px; font-weight: 700; text-transform: uppercase; background: #e2e8f0; color: #475569; padding: 2px 6px; border-radius: 4px; }
    .ind-desc { font-size: 12px; color: #64748b; margin: 4px 0 6px; }
    .max-badge { font-size: 11px; color: #0050e5; font-weight: 600; }

    .ind-inputs { display: flex; gap: 12px; align-items: center; }
    .input-field { display: flex; flex-direction: column; gap: 4px; }
    .input-field label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; }
    .input-field input { height: 38px; padding: 0 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; outline: none; background: #ffffff; width: 100px; font-weight: 700; color: #0f172a; text-align: center; }
    .remarks-field input { width: 220px; font-weight: normal; text-align: left; }
    .input-field input:focus { border-color: #0050e5; }

    .empty-state { text-align: center; padding: 40px; color: #64748b; display: flex; flex-direction: column; align-items: center; gap: 10px; }
    .empty-state span { font-size: 40px; color: #cbd5e1; }

    .card-footer { padding: 16px 22px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 10px; background: #f8fafc; }
    .btn { height: 40px; padding: 0 18px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 6px; text-decoration: none; border: 1px solid transparent; }
    .btn-sm { height: 32px; padding: 0 12px; font-size: 11px; }
    .btn-outline { background: #ffffff; border-color: #cbd5e1; color: #334155; }
    .btn-outline:hover { background: #f1f5f9; color: #0f172a; }
    .btn-primary { background: #0050e5; color: #ffffff; }
    .btn-primary:hover:not(:disabled) { background: #0040b8; }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
  `]
})
export class KpiGradeComponent implements OnInit {
  userId = '';
  isLoading = false;
  isSaving = false;
  user: any = null;
  indicators: any[] = [];
  periods: any[] = [];
  evaluationPeriod = '';
  customPeriodMode = false;
  customPeriodText = '';

  headerButtons: PageHeaderButton[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.userId = this.route.snapshot.paramMap.get('userId') || '';
    if (!this.userId) {
      this.router.navigate(['/admin/users/list']);
      return;
    }

    this.headerButtons = [
      {
        text: 'View Details',
        icon: 'visibility',
        isPrimary: false,
        routerLink: `/admin/users/details/${this.userId}`
      },
      {
        text: 'Back to KPI Hub',
        icon: 'arrow_back',
        isPrimary: false,
        routerLink: '/admin/users/kpi'
      }
    ];

    this.loadMember();
    this.loadIndicators();
    this.loadPeriods();
  }

  loadMember(): void {
    this.isLoading = true;
    this.api.get<any>(`UsersApi/${this.userId}/dossier`).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.user = res.data;
      },
      error: () => {
        this.isLoading = false;
        this.toast.error('Failed to load member profile.');
        this.router.navigate(['/admin/users/list']);
      }
    });
  }

  loadPeriods(): void {
    this.api.get<any>('UsersApi/kpi-periods').subscribe({
      next: (res) => {
        this.periods = res.data || [];
        if (this.periods.length > 0) {
          this.evaluationPeriod = this.periods[0].title;
        } else {
          this.evaluationPeriod = `${new Date().getFullYear()} Q${Math.floor(new Date().getMonth() / 3) + 1}`;
          this.periods = [{ title: this.evaluationPeriod }];
        }
      },
      error: () => {
        this.evaluationPeriod = `${new Date().getFullYear()} Q${Math.floor(new Date().getMonth() / 3) + 1}`;
        this.periods = [{ title: this.evaluationPeriod }];
      }
    });
  }

  loadIndicators(): void {
    this.api.get<any>('UsersApi/kpi-indicators').subscribe({
      next: (res) => {
        this.indicators = (res.data || []).map((ind: any) => ({
          ...ind,
          scoreInput: null,
          remarksInput: ''
        }));
      },
      error: () => {}
    });
  }

  submitEvaluation(): void {
    let finalPeriod = this.evaluationPeriod;
    if (this.customPeriodMode) {
      if (!this.customPeriodText.trim()) {
        this.toast.error('Please enter the custom period name.');
        return;
      }
      finalPeriod = this.customPeriodText.trim();
    } else if (this.evaluationPeriod === '__CUSTOM__') {
      this.customPeriodMode = true;
      this.toast.info('Please enter the custom evaluation period name.');
      return;
    }

    if (!finalPeriod) {
      this.toast.error('Evaluation Period is required.');
      return;
    }

    const scoresToSubmit = this.indicators
      .filter(i => i.scoreInput !== null && i.scoreInput !== undefined && i.scoreInput !== '')
      .map(i => ({
        indicatorId: i.id,
        score: Number(i.scoreInput),
        remarks: i.remarksInput
      }));

    if (scoresToSubmit.length === 0) {
      this.toast.warning('Please enter a score for at least one indicator.');
      return;
    }

    this.isSaving = true;
    this.api.post<any>('UsersApi/kpi-scores/batch', {
      profileId: this.userId,
      period: finalPeriod,
      scores: scoresToSubmit
    }).subscribe({
      next: () => {
        this.isSaving = false;
        this.toast.success(`Evaluation submitted successfully for ${this.user?.fullName} (${finalPeriod})!`);
        this.router.navigate(['/admin/users/details', this.userId]);
      },
      error: (err) => {
        this.isSaving = false;
        this.toast.error(err?.error?.message || 'Failed to submit evaluation.');
      }
    });
  }
}
