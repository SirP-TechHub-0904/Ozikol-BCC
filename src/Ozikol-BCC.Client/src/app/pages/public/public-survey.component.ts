import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';

/**
 * Public standalone survey runner page (/survey/:slug) for the bcp-form-builder feature.
 */
@Component({
  selector: 'app-public-survey',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="public-survey-shell">
      <div class="survey-box" *ngIf="loading">Loading survey...</div>

      <div class="survey-box" *ngIf="!loading && errorMsg">
        <h2>Survey Unavailable</h2>
        <p>{{ errorMsg }}</p>
      </div>

      <div class="survey-box success-box" *ngIf="!loading && submittedSuccess">
        <div class="check-circle"><span class="material-symbols-outlined">check_circle</span></div>
        <h2>{{ successTitle }}</h2>
        <p>{{ successNote }}</p>
        <button type="button" class="btn-primary" (click)="resetForAnother()">{{ successButtonText }}</button>
      </div>

      <div class="survey-box" *ngIf="!loading && survey && !submittedSuccess">
        <h1>{{ survey.title }}</h1>
        <p class="desc" *ngIf="survey.description">{{ survey.description }}</p>

        <form (ngSubmit)="submit()">
          <div *ngFor="let f of survey.fields" class="field-group">
            <label>{{ f.label }} <span *ngIf="f.isRequired" class="req">*</span></label>

            <textarea *ngIf="f.fieldType === 'textarea'" [(ngModel)]="answers[f.fieldKey]" [name]="f.fieldKey" rows="3" class="form-control"></textarea>

            <select *ngIf="f.fieldType === 'select'" [(ngModel)]="answers[f.fieldKey]" [name]="f.fieldKey" class="form-control">
              <option value="">Select an option...</option>
              <option *ngFor="let opt of parseOptions(f.optionsJson)" [value]="opt">{{ opt }}</option>
            </select>

            <div *ngIf="f.fieldType === 'radio'" class="radio-list">
              <label *ngFor="let opt of parseOptions(f.optionsJson)" class="radio-opt">
                <input type="radio" [name]="f.fieldKey" [value]="opt" [(ngModel)]="answers[f.fieldKey]" />
                <span>{{ opt }}</span>
              </label>
            </div>

            <input
              *ngIf="f.fieldType !== 'textarea' && f.fieldType !== 'select' && f.fieldType !== 'radio'"
              [type]="f.fieldType || 'text'"
              [(ngModel)]="answers[f.fieldKey]"
              [name]="f.fieldKey"
              class="form-control"
            />
          </div>

          <button type="submit" class="btn-primary" [disabled]="submitting">
            {{ submitting ? 'Submitting...' : 'Submit Survey' }}
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .public-survey-shell { min-height: 100vh; background: #f8fafc; padding: 48px 16px; display: flex; justify-content: center; align-items: flex-start; }
    .survey-box { width: 100%; max-width: 640px; background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px; box-shadow: 0 10px 30px rgba(15,23,42,0.05); }
    .survey-box h1 { margin: 0 0 8px; font-size: 24px; font-weight: 800; color: #0f172a; }
    .desc { color: #475569; margin: 0 0 24px; line-height: 1.6; }
    .field-group { margin-bottom: 18px; }
    .field-group > label { display: block; font-size: 13.5px; font-weight: 700; color: #1e293b; margin-bottom: 6px; }
    .req { color: #dc2626; }
    .form-control { width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 14px; box-sizing: border-box; }
    .radio-list { display: flex; flex-direction: column; gap: 8px; }
    .radio-opt { display: inline-flex; align-items: center; gap: 8px; font-size: 14px; cursor: pointer; }
    .btn-primary { padding: 12px 24px; background: #0050e5; color: #fff; border: none; border-radius: 10px; font-weight: 700; cursor: pointer; font-size: 14px; }
    .success-box { text-align: center; padding: 48px 32px; }
    .check-circle { width: 64px; height: 64px; border-radius: 50%; background: #eff6ff; color: #0050e5; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px; }
    .check-circle span { font-size: 36px; }
  `]
})
export class PublicSurveyComponent implements OnInit {
  survey: any = null;
  answers: Record<string, any> = {};
  loading = true;
  submitting = false;
  errorMsg = '';
  submittedSuccess = false;
  successTitle = 'Thank You for Your Response!';
  successNote = 'Your survey response has been recorded.';
  successButtonText = 'Submit Another Response';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly api: ApiService,
    private readonly toast: ToastService
  ) {}

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug') || '';
    this.api.get<any>(`PublicSurveysApi/${slug}`).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.survey = res?.data || null;
      },
      error: (err: any) => {
        this.loading = false;
        this.errorMsg = err?.error?.message || 'Survey not found.';
      }
    });
  }

  parseOptions(json?: string): string[] {
    if (!json) return [];
    try { return JSON.parse(json); } catch { return []; }
  }

  submit(): void {
    if (!this.survey?.slug) return;
    this.submitting = true;
    this.api.post<any>(`PublicSurveysApi/${this.survey.slug}/submit`, this.answers).subscribe({
      next: (res: any) => {
        this.submitting = false;
        const payload = res?.data || {};
        this.successNote = payload.message || res?.message || 'Your survey response has been recorded.';
        this.successTitle = payload.successPageTitle || 'Thank You for Your Response!';
        this.successButtonText = payload.successPageButtonText || 'Submit Another Response';
        this.toast.success(this.successNote);
        if (payload.showSuccessPage !== false) {
          this.submittedSuccess = true;
        } else {
          this.answers = {};
        }
      },
      error: (err: any) => {
        this.submitting = false;
        this.toast.error(err?.error?.message || 'Please check all required questions.');
      }
    });
  }

  resetForAnother(): void {
    this.answers = {};
    this.submittedSuccess = false;
  }
}
