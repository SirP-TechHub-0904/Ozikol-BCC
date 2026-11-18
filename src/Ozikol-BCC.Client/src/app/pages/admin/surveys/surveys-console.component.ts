import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

/**
 * Standalone Survey & Dynamic Form Builder Console (bcp-form-builder modular feature).
 * Completely independent from Website CMS PageForms.
 */
@Component({
  selector: 'app-surveys-console',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent],
  template: `
    <div class="surveys-page">
      <app-page-header
        eyebrow="MODULAR CAPABILITY · FORMS & SURVEYS"
        icon="dynamic_form"
        title="Forms & Surveys Builder"
        subtitle="Create standalone surveys, questionnaires, and data collection forms with shareable links."
      ></app-page-header>

      <div class="toolbar">
        <button type="button" class="btn-primary" (click)="openEditor()">
          <span class="material-symbols-outlined">add</span>
          <span>New Survey / Form</span>
        </button>
        <button type="button" class="btn-outline" (click)="loadSurveys()">
          <span class="material-symbols-outlined">refresh</span>
          <span>Refresh</span>
        </button>
      </div>

      <!-- Survey List -->
      <div *ngIf="!editingSurvey && !viewingResponsesSurvey" class="surveys-grid">
        <div *ngIf="loading" class="empty-card">Loading surveys...</div>
        <div *ngIf="!loading && surveys.length === 0" class="empty-card">
          <span class="material-symbols-outlined" style="font-size:40px;color:#94a3b8;">poll</span>
          <h3>No Surveys Created Yet</h3>
          <p>Create your first standalone survey or questionnaire to collect responses independently of your website CMS.</p>
          <button type="button" class="btn-primary" (click)="openEditor()">Create Survey</button>
        </div>

        <div *ngFor="let s of surveys" class="survey-card">
          <div class="card-top">
            <div>
              <h3>{{ s.title }}</h3>
              <span class="slug-pill">/survey/{{ s.slug }}</span>
            </div>
            <span class="status-pill" [class.active]="s.isPublished">{{ s.isPublished ? 'Published' : 'Draft' }}</span>
          </div>
          <p class="desc">{{ s.description || 'No description provided.' }}</p>
          <div class="stats-row">
            <span><strong>{{ s.fieldCount }}</strong> Questions</span>
            <span><strong>{{ s.submissionCount }}</strong> Responses</span>
          </div>
          <div class="card-actions">
            <button type="button" class="btn-sm" (click)="copyShareLink(s.slug)">
              <span class="material-symbols-outlined">link</span> Copy Link
            </button>
            <button type="button" class="btn-sm" (click)="viewResponses(s)">
              <span class="material-symbols-outlined">inbox</span> Responses
            </button>
            <button type="button" class="btn-sm" (click)="openEditor(s.id)">
              <span class="material-symbols-outlined">edit</span> Edit
            </button>
            <button type="button" class="btn-sm danger" (click)="deleteSurvey(s)">
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Survey Editor -->
      <div *ngIf="editingSurvey" class="editor-card">
        <div class="editor-head">
          <h3>{{ editingSurvey.id ? 'Edit Survey' : 'Create Standalone Survey' }}</h3>
          <button type="button" class="btn-outline" (click)="editingSurvey = null">Cancel</button>
        </div>

        <div class="form-grid">
          <div class="form-group">
            <label>Survey Title *</label>
            <input type="text" [(ngModel)]="editingSurvey.title" placeholder="e.g. Customer Satisfaction Survey" class="form-control" />
          </div>
          <div class="form-group">
            <label>URL Slug</label>
            <input type="text" [(ngModel)]="editingSurvey.slug" placeholder="e.g. customer-satisfaction" class="form-control" [disabled]="!!editingSurvey.id" />
          </div>
          <div class="form-group full">
            <label>Description / Instructions</label>
            <textarea [(ngModel)]="editingSurvey.description" rows="2" class="form-control" placeholder="Brief instructions for respondents"></textarea>
          </div>
          <div class="form-group">
            <label>Success Page Title</label>
            <input type="text" [(ngModel)]="editingSurvey.successPageTitle" class="form-control" placeholder="Thank You for Your Response!" />
          </div>
          <div class="form-group">
            <label>Success Note</label>
            <input type="text" [(ngModel)]="editingSurvey.successMessage" class="form-control" placeholder="Your survey response has been recorded." />
          </div>
          <div class="form-group">
            <label>Submit Again Button Label</label>
            <input type="text" [(ngModel)]="editingSurvey.successPageButtonText" class="form-control" placeholder="Submit Another Response" />
          </div>
          <div class="form-group checkboxes">
            <label><input type="checkbox" [(ngModel)]="editingSurvey.isPublished" /> Published</label>
            <label><input type="checkbox" [(ngModel)]="editingSurvey.allowAnonymous" /> Allow Anonymous</label>
            <label><input type="checkbox" [(ngModel)]="editingSurvey.showSuccessPage" /> Show Success Page</label>
          </div>
        </div>

        <div class="questions-section">
          <div class="q-head">
            <h4>Questions ({{ editingSurvey.fields.length }})</h4>
            <button type="button" class="btn-sm" (click)="addQuestion()">+ Add Question</button>
          </div>
          <div *ngFor="let f of editingSurvey.fields; let i = index" class="question-row">
            <input type="text" [(ngModel)]="f.label" placeholder="Question label" class="form-control" />
            <select [(ngModel)]="f.fieldType" class="form-control" style="max-width:150px;">
              <option value="text">Short Text</option>
              <option value="textarea">Long Text</option>
              <option value="email">Email</option>
              <option value="number">Number</option>
              <option value="select">Dropdown</option>
              <option value="radio">Multiple Choice</option>
              <option value="date">Date</option>
            </select>
            <input *ngIf="f.fieldType === 'select' || f.fieldType === 'radio'" type="text" [(ngModel)]="f.optionsCsv" placeholder="Options (comma-separated)" class="form-control" />
            <label class="req-check"><input type="checkbox" [(ngModel)]="f.isRequired" /> Required</label>
            <button type="button" class="btn-sm danger" (click)="editingSurvey.fields.splice(i, 1)">Remove</button>
          </div>
        </div>

        <div class="editor-footer">
          <button type="button" class="btn-primary" [disabled]="saving" (click)="saveSurvey()">
            {{ saving ? 'Saving...' : 'Save' }}
          </button>
        </div>
      </div>

      <!-- Survey Responses Viewer -->
      <div *ngIf="viewingResponsesSurvey" class="editor-card">
        <div class="editor-head">
          <h3>Responses: {{ viewingResponsesSurvey.title }} ({{ responses.length }})</h3>
          <button type="button" class="btn-outline" (click)="viewingResponsesSurvey = null">Back to Surveys</button>
        </div>
        <div *ngIf="responses.length === 0" class="empty-card">No responses submitted yet.</div>
        <div *ngFor="let r of responses" class="response-item">
          <div class="resp-meta">
            <span>{{ r.submittedAtUtc | date:'medium' }}</span>
            <button type="button" class="btn-sm danger" (click)="deleteResponse(r.id)">Delete</button>
          </div>
          <pre class="resp-json">{{ formatJson(r.dataJson) }}</pre>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .surveys-page { padding: 24px; max-width: 1200px; margin: 0 auto; }
    .toolbar { display: flex; gap: 12px; margin-bottom: 20px; }
    .btn-primary { display: inline-flex; align-items: center; gap: 6px; padding: 10px 18px; background: #0050e5; color: #fff; border: none; border-radius: 10px; font-weight: 700; cursor: pointer; }
    .btn-outline { display: inline-flex; align-items: center; gap: 6px; padding: 10px 16px; background: #fff; color: #334155; border: 1px solid #cbd5e1; border-radius: 10px; font-weight: 600; cursor: pointer; }
    .btn-sm { display: inline-flex; align-items: center; gap: 4px; padding: 6px 10px; background: #f1f5f9; color: #334155; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; }
    .btn-sm.danger { color: #dc2626; background: #fef2f2; border-color: #fecaca; }
    .surveys-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
    .survey-card, .editor-card, .empty-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px; }
    .empty-card { grid-column: 1 / -1; text-align: center; padding: 40px 20px; }
    .card-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 8px; }
    .card-top h3 { margin: 0; font-size: 16px; font-weight: 700; color: #0f172a; }
    .slug-pill { font-size: 12px; color: #0050e5; font-family: monospace; }
    .status-pill { font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 999px; background: #f1f5f9; color: #64748b; }
    .status-pill.active { background: #ecfdf5; color: #059669; }
    .desc { font-size: 13px; color: #64748b; margin: 8px 0 14px; }
    .stats-row { display: flex; gap: 16px; font-size: 12.5px; color: #475569; margin-bottom: 14px; }
    .card-actions { display: flex; flex-wrap: wrap; gap: 8px; }
    .editor-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 20px; }
    .form-group.full { grid-column: 1 / -1; }
    .form-group label { display: block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 6px; }
    .form-control { width: 100%; padding: 9px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13.5px; box-sizing: border-box; }
    .checkboxes { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
    .checkboxes label { display: inline-flex; align-items: center; gap: 6px; margin: 0; cursor: pointer; }
    .questions-section { border-top: 1px solid #e2e8f0; padding-top: 16px; margin-bottom: 20px; }
    .q-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .question-row { display: flex; gap: 10px; align-items: center; margin-bottom: 10px; flex-wrap: wrap; }
    .question-row > input:first-child { flex: 1; min-width: 200px; }
    .req-check { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; }
    .editor-footer { display: flex; justify-content: flex-end; }
    .response-item { border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; margin-bottom: 10px; }
    .resp-meta { display: flex; justify-content: space-between; font-size: 12px; color: #64748b; margin-bottom: 6px; }
    .resp-json { margin: 0; font-size: 12px; background: #f8fafc; padding: 10px; border-radius: 8px; overflow-x: auto; }
  `]
})
export class SurveysConsoleComponent implements OnInit {
  surveys: any[] = [];
  loading = false;
  saving = false;
  editingSurvey: any = null;
  viewingResponsesSurvey: any = null;
  responses: any[] = [];

  constructor(private readonly api: ApiService, private readonly toast: ToastService) {}

  ngOnInit(): void {
    this.loadSurveys();
  }

  loadSurveys(): void {
    this.loading = true;
    this.api.get<any>('SurveyFormsApi').subscribe({
      next: (res: any) => {
        this.loading = false;
        this.surveys = res?.data || [];
      },
      error: (err: any) => {
        this.loading = false;
        this.toast.error(err?.error?.message || 'Unable to load surveys.');
      }
    });
  }

  openEditor(id?: string): void {
    this.viewingResponsesSurvey = null;
    if (!id) {
      this.editingSurvey = {
        title: '',
        slug: '',
        description: '',
        isPublished: true,
        allowAnonymous: true,
        showSuccessPage: true,
        successPageTitle: 'Thank You for Your Response!',
        successMessage: 'Your survey response has been recorded.',
        successPageButtonText: 'Submit Another Response',
        fields: [{ label: '', fieldType: 'text', isRequired: true, optionsCsv: '' }]
      };
      return;
    }

    this.api.get<any>(`SurveyFormsApi/${id}`).subscribe({
      next: (res: any) => {
        const s = res?.data;
        if (!s) return;
        this.editingSurvey = {
          ...s,
          fields: (s.fields || []).map((f: any) => ({
            ...f,
            optionsCsv: f.optionsJson ? (() => { try { return JSON.parse(f.optionsJson).join(', '); } catch { return ''; } })() : ''
          }))
        };
      },
      error: (err: any) => this.toast.error(err?.error?.message || 'Unable to load survey.')
    });
  }

  addQuestion(): void {
    this.editingSurvey.fields.push({ label: '', fieldType: 'text', isRequired: false, optionsCsv: '' });
  }

  saveSurvey(): void {
    if (!this.editingSurvey?.title?.trim()) {
      this.toast.error('Survey title is required.');
      return;
    }

    const payload = {
      ...this.editingSurvey,
      fields: (this.editingSurvey.fields || []).map((f: any, idx: number) => ({
        id: f.id,
        fieldKey: f.fieldKey || '',
        label: f.label,
        fieldType: f.fieldType,
        isRequired: !!f.isRequired,
        sortOrder: idx + 1,
        optionsJson: f.optionsCsv ? JSON.stringify(f.optionsCsv.split(',').map((o: string) => o.trim()).filter(Boolean)) : null
      }))
    };

    this.saving = true;
    const req$ = this.editingSurvey.id
      ? this.api.put<any>(`SurveyFormsApi/${this.editingSurvey.id}`, payload)
      : this.api.post<any>('SurveyFormsApi', payload);

    req$.subscribe({
      next: () => {
        this.saving = false;
        this.toast.success('Survey saved.');
        this.editingSurvey = null;
        this.loadSurveys();
      },
      error: (err: any) => {
        this.saving = false;
        this.toast.error(err?.error?.message || 'Failed to save survey.');
      }
    });
  }

  deleteSurvey(s: any): void {
    if (!confirm(`Delete survey "${s.title}"?`)) return;
    this.api.delete<any>(`SurveyFormsApi/${s.id}`).subscribe({
      next: () => {
        this.toast.success('Survey deleted.');
        this.loadSurveys();
      },
      error: (err: any) => this.toast.error(err?.error?.message || 'Failed to delete survey.')
    });
  }

  copyShareLink(slug: string): void {
    const url = `${window.location.origin}/survey/${slug}`;
    navigator.clipboard?.writeText(url);
    this.toast.success(`Survey link copied: ${url}`);
  }

  viewResponses(s: any): void {
    this.editingSurvey = null;
    this.viewingResponsesSurvey = s;
    this.api.get<any>(`SurveyFormsApi/${s.id}/submissions`).subscribe({
      next: (res: any) => { this.responses = res?.data?.items || []; },
      error: (err: any) => this.toast.error(err?.error?.message || 'Unable to load responses.')
    });
  }

  deleteResponse(id: string): void {
    this.api.delete<any>(`SurveyFormsApi/submissions/${id}`).subscribe({
      next: () => {
        this.responses = this.responses.filter(r => r.id !== id);
        this.toast.success('Response deleted.');
      }
    });
  }

  formatJson(raw: string): string {
    try { return JSON.stringify(JSON.parse(raw), null, 2); } catch { return raw; }
  }
}
