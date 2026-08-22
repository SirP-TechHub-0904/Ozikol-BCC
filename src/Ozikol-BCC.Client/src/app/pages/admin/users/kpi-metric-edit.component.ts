import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent, PageHeaderButton } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-kpi-metric-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent],
  template: `
    <div class="metric-form-page">
      <!-- Standardized Page Header -->
      <app-page-header
        eyebrow="KPI METRIC SETUP"
        icon="analytics"
        [title]="isEditMode ? 'Edit KPI Indicator: ' + model.title : 'Create New KPI Indicator'"
        subtitle="Define performance evaluation metrics, target scale, domain category, and calculation weighting."
        [buttons]="headerButtons"
        [loading]="isLoading || isSaving"
      ></app-page-header>

      <!-- Form Card -->
      <form (ngSubmit)="saveMetric()" class="form-container" *ngIf="!isLoading">
        <div class="form-card">
          <div class="card-header">
            <span class="material-symbols-outlined header-icon">speed</span>
            <div>
              <h3>Metric Indicator Parameters</h3>
              <p>Score range, weight multiplier, and evaluation domain</p>
            </div>
          </div>

          <div class="card-body">
            <div class="form-grid-2">
              <div class="form-group">
                <label>Indicator Title *</label>
                <input type="text" [(ngModel)]="model.title" name="title" placeholder="e.g. Task Completion & Delivery" required />
              </div>
              <div class="form-group">
                <label>Evaluation Domain / Tag</label>
                <select [(ngModel)]="model.category" name="category">
                  <option value="Operational">Operational</option>
                  <option value="Quality">Quality & Accuracy</option>
                  <option value="Attendance">Attendance & Punctuality</option>
                  <option value="Engagement">Community & Engagement</option>
                  <option value="Leadership">Leadership & Teamwork</option>
                  <option value="Custom">Custom Domain</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label>Indicator Description</label>
              <textarea rows="3" [(ngModel)]="model.description" name="description" placeholder="Specify grading criteria, guidelines, and evaluation rubrics..."></textarea>
            </div>

            <div class="form-grid-2">
              <div class="form-group">
                <label>Maximum Score Limit</label>
                <input type="number" [(ngModel)]="model.maxScore" name="maxScore" placeholder="100" min="1" max="1000" />
                <div class="field-hint">Standard scale upper bound (e.g. 100).</div>
              </div>
              <div class="form-group">
                <label>Calculation Weight Multiplier</label>
                <input type="number" [(ngModel)]="model.weight" name="weight" placeholder="1.0" step="0.1" min="0.1" max="5.0" />
                <div class="field-hint">Multiplier applied to composite score calculation (e.g. 1.5x).</div>
              </div>
            </div>
          </div>

          <div class="card-footer">
            <a routerLink="/admin/users/kpi" class="btn btn-outline">Cancel</a>
            <button type="submit" class="btn btn-primary" [disabled]="isSaving || !model.title.trim()">
              <span *ngIf="!isSaving" class="material-symbols-outlined">save</span>
              <span>{{ isSaving ? 'Saving Indicator...' : (isEditMode ? 'Save Changes' : 'Create KPI Metric') }}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .metric-form-page { display: flex; flex-direction: column; gap: 18px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; width: 100%; }

    .form-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); overflow: hidden; display: flex; flex-direction: column; width: 100%; }
    .card-header { display: flex; align-items: center; gap: 14px; padding: 18px 22px; border-bottom: 1px solid #f1f5f9; background: #fafbfc; }
    .header-icon { font-size: 24px; color: #0050e5; }
    .card-header h3 { margin: 0; font-size: 15px; font-weight: 700; color: #0f172a; }
    .card-header p { margin: 2px 0 0; font-size: 12px; color: #64748b; }
    .card-body { padding: 22px; display: flex; flex-direction: column; gap: 16px; }

    .form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    @media (max-width: 540px) { .form-grid-2 { grid-template-columns: 1fr; } }

    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #475569; letter-spacing: 0.05em; }
    .form-group input, .form-group select, .form-group textarea { padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; outline: none; background: #ffffff; color: #0f172a; transition: all 0.15s ease; }
    .form-group input:focus, .form-group select:focus, .form-group textarea:focus { border-color: #0050e5; box-shadow: 0 0 0 3px rgba(0,80,229,0.1); }
    .field-hint { font-size: 11px; color: #64748b; margin-top: 2px; }

    .card-footer { padding: 16px 22px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 10px; background: #f8fafc; }
    .btn { height: 40px; padding: 0 18px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 6px; text-decoration: none; border: 1px solid transparent; }
    .btn-outline { background: #ffffff; border-color: #cbd5e1; color: #334155; }
    .btn-outline:hover { background: #f1f5f9; color: #0f172a; }
    .btn-primary { background: #0050e5; color: #ffffff; }
    .btn-primary:hover:not(:disabled) { background: #0040b8; }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
  `]
})
export class KpiMetricEditComponent implements OnInit {
  metricId: string | null = null;
  isEditMode = false;
  isLoading = false;
  isSaving = false;

  model: any = {
    title: '',
    category: 'Operational',
    description: '',
    maxScore: 100,
    weight: 1.0
  };

  headerButtons: PageHeaderButton[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.metricId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.metricId;

    this.headerButtons = [
      {
        text: 'Back to KPI Hub',
        icon: 'arrow_back',
        isPrimary: false,
        routerLink: '/admin/users/kpi'
      }
    ];

    if (this.isEditMode && this.metricId) {
      this.loadMetric(this.metricId);
    }
  }

  loadMetric(id: string): void {
    this.isLoading = true;
    this.api.get<any>(`UsersApi/kpi-indicators/${id}`).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.data) {
          this.model = res.data;
        }
      },
      error: () => {
        this.isLoading = false;
        this.toast.error('Failed to load KPI metric.');
        this.router.navigate(['/admin/users/kpi']);
      }
    });
  }

  saveMetric(): void {
    if (!this.model.title.trim()) {
      this.toast.warning('Metric title is required.');
      return;
    }

    this.isSaving = true;
    if (this.isEditMode && this.metricId) {
      this.api.put<any>(`UsersApi/kpi-indicators/${this.metricId}`, this.model).subscribe({
        next: () => {
          this.isSaving = false;
          this.toast.success(`KPI Metric '${this.model.title}' updated successfully!`);
          this.router.navigate(['/admin/users/kpi']);
        },
        error: (err) => {
          this.isSaving = false;
          this.toast.error(err?.error?.message || 'Failed to update metric.');
        }
      });
    } else {
      this.api.post<any>('UsersApi/kpi-indicators', this.model).subscribe({
        next: () => {
          this.isSaving = false;
          this.toast.success(`KPI Metric '${this.model.title}' created successfully!`);
          this.router.navigate(['/admin/users/kpi']);
        },
        error: (err) => {
          this.isSaving = false;
          this.toast.error(err?.error?.message || 'Failed to create metric.');
        }
      });
    }
  }
}
