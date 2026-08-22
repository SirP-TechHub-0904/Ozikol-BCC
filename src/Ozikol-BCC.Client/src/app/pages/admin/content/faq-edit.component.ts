import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-faq-edit',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="cms-page-container">
      <!-- Header -->
      <div class="page-header">
        <div class="header-titles">
          <div class="breadcrumb">
            <a routerLink="/admin/content">CMS Studio</a>
            <span class="sep">/</span>
            <a routerLink="/admin/content/faqs">FAQs</a>
            <span class="sep">/</span>
            <span class="current">Edit FAQ</span>
          </div>
          <h1>Edit FAQ Question</h1>
          <p class="subtitle">Update question wording, rich answer text, category assignment, and sorting position.</p>
        </div>
        <div class="header-actions">
          <a routerLink="/admin/content/faqs" class="btn btn-outline">
            <span class="material-symbols-outlined">arrow_back</span>
            <span>Back to FAQs</span>
          </a>
          <button type="button" class="btn btn-primary" (click)="saveFaq()" [disabled]="saving || loading">
            <span class="material-symbols-outlined">save</span>
            <span *ngIf="!saving">Save Changes</span>
            <span *ngIf="saving">Saving...</span>
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div class="loading-box" *ngIf="loading">
        <span class="material-symbols-outlined spin">progress_activity</span>
        <p>Loading FAQ details...</p>
      </div>

      <!-- Main Form -->
      <div class="cms-card" *ngIf="!loading && faq">
        <div class="card-header-bar">
          <div>
            <h3>Question & Answer Configuration</h3>
            <p class="card-sub">Categorized or standalone question displayed on your website.</p>
          </div>
          <span class="status-pill" [class.published]="faq.show" [class.draft]="!faq.show">
            {{ faq.show ? 'Published' : 'Hidden' }}
          </span>
        </div>

        <div class="form-grid">
          <div class="form-group full-width">
            <label>QUESTION (TITLE) *</label>
            <input type="text" [(ngModel)]="faq.title" class="form-control" placeholder="e.g. How do I register for an account?">
          </div>

          <div class="form-group">
            <label>FAQ CATEGORY (TYPO-FREE SELECTOR)</label>
            <select [(ngModel)]="faq.faqCategoryId" class="form-control">
              <option [ngValue]="null">Standalone / General (No Category)</option>
              <option *ngFor="let c of categories" [ngValue]="c.id">{{ c.title }}</option>
            </select>
            <small class="help-text">Assign to an existing category or choose Standalone.</small>
          </div>

          <div class="form-group">
            <label>SORT ORDER</label>
            <input type="number" [(ngModel)]="faq.sortOrder" class="form-control">
          </div>

          <div class="form-group full-width">
            <label>ANSWER MESSAGE *</label>
            <textarea rows="5" [(ngModel)]="faq.message" class="form-control" placeholder="Detailed answer content..."></textarea>
          </div>

          <div class="form-group full-width">
            <div class="checkbox-card">
              <input type="checkbox" [(ngModel)]="faq.show" id="faqPub">
              <label for="faqPub">
                <strong>Publish Question on Public Website</strong>
                <p>When active, this FAQ appears in the public accordion.</p>
              </label>
            </div>
          </div>
        </div>

        <!-- Notification Alerts -->
        <div class="success-box" *ngIf="successMessage">{{ successMessage }}</div>
        <div class="error-box" *ngIf="errorMessage">{{ errorMessage }}</div>
      </div>
    </div>
  `,
  styles: [`
    .cms-page-container { display: flex; flex-direction: column; gap: 24px; }
    .page-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      background: #fff; padding: 24px 28px; border-radius: 16px; border: 1px solid #e2e8f0;
    }
    .breadcrumb { font-size: 13px; color: #64748b; margin-bottom: 6px; }
    .breadcrumb a { color: #0050e5; text-decoration: none; font-weight: 600; }
    .page-header h1 { font-size: 24px; font-weight: 800; color: #0f172a; margin: 0 0 4px; }
    .subtitle { color: #64748b; font-size: 14px; margin: 0; }
    .header-actions { display: flex; gap: 10px; }

    .btn {
      display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px;
      border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; text-decoration: none;
    }
    .btn-primary { background: #0050e5; color: #fff; border: none; }
    .btn-outline { background: transparent; border: 1px solid #cbd5e1; color: #334155; }

    .cms-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 28px; }
    .card-header-bar {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 24px; padding-bottom: 14px; border-bottom: 1px solid #f1f5f9;
    }
    .card-header-bar h3 { font-size: 18px; font-weight: 800; color: #0f172a; margin: 0 0 4px; }
    .card-sub { font-size: 13px; color: #64748b; margin: 0; }

    .form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
    .full-width { grid-column: span 2; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group label { font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; }
    .form-control { padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; }
    .help-text { font-size: 11px; color: #64748b; }

    .checkbox-card {
      display: flex; align-items: flex-start; gap: 12px; background: #f8fafc;
      padding: 14px 16px; border-radius: 10px; border: 1px solid #e2e8f0;
    }
    .checkbox-card input { margin-top: 3px; }
    .checkbox-card p { font-size: 12px; color: #64748b; margin: 2px 0 0; }

    .status-pill { padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; }
    .status-pill.published { background: #dcfce7; color: #15803d; }
    .status-pill.draft { background: #fee2e2; color: #dc2626; }

    .loading-box { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px; color: #64748b; }
    .spin { animation: spin 1s linear infinite; font-size: 32px; color: #0050e5; margin-bottom: 12px; }
    @keyframes spin { 100% { transform: rotate(360deg); } }

    .success-box { background: #f0fdf4; color: #166534; padding: 12px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; margin-top: 20px; }
    .error-box { background: #fee2e2; color: #991b1b; padding: 12px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; margin-top: 20px; }
  `]
})
export class FaqEditComponent implements OnInit {
  faqId = '';
  faq: any = null;
  categories: any[] = [];
  loading = false;
  saving = false;
  successMessage = '';
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private api: ApiService
  ) {}

  ngOnInit(): void {
    this.faqId = this.route.snapshot.paramMap.get('id') || '';
    if (this.faqId) {
      this.loadFaq();
    }
  }

  loadFaq(): void {
    this.loading = true;
    this.api.get<any>(`ContentApi/faqs/${this.faqId}`).subscribe({
      next: (res) => {
        this.faq = res?.data;
        this.loadCategories();
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Failed to load FAQ.';
      }
    });
  }

  loadCategories(): void {
    this.api.get<any>('ContentApi/faq-categories').subscribe({
      next: (res) => {
        this.loading = false;
        this.categories = res?.data || [];
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  saveFaq(): void {
    if (!this.faq?.title?.trim() || !this.faq?.message?.trim()) {
      this.errorMessage = 'Question and Answer are required.';
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.api.put<any>(`ContentApi/faqs/${this.faqId}`, this.faq).subscribe({
      next: () => {
        this.saving = false;
        this.successMessage = 'FAQ updated successfully!';
        setTimeout(() => this.successMessage = '', 4000);
      },
      error: (err) => {
        this.saving = false;
        this.errorMessage = err?.error?.message || 'Failed to update FAQ.';
      }
    });
  }
}
