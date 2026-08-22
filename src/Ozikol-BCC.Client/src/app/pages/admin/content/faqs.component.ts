import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-faqs',
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
            <span class="current">FAQs & Knowledge</span>
          </div>
          <h1>Frequently Asked Questions</h1>
          <p class="subtitle">Organize categorized and standalone questions, answers, and accordions for website visitors.</p>
        </div>
        <div class="header-actions">
          <button type="button" class="btn btn-outline" (click)="openCategoryModal()">
            <span class="material-symbols-outlined">category</span>
            <span>Manage FAQ Categories</span>
          </button>
          <button type="button" class="btn btn-primary" (click)="openCreateModal()">
            <span class="material-symbols-outlined">add_circle</span>
            <span>New FAQ</span>
          </button>
          <button type="button" (click)="loadAll()" class="btn btn-outline" [disabled]="loading">
            <span class="material-symbols-outlined" [class.spin]="loading">refresh</span>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <!-- Category Filter Pills Bar -->
      <div class="filter-pills-bar">
        <div class="pills-scroll">
          <button type="button" class="pill-btn" [class.active]="selectedCatFilter === 'all'" (click)="selectedCatFilter = 'all'">
            All FAQs ({{ faqs.length }})
          </button>
          <button type="button" class="pill-btn" [class.active]="selectedCatFilter === 'standalone'" (click)="selectedCatFilter = 'standalone'">
            Standalone / No Category ({{ standaloneCount }})
          </button>
          <button type="button" class="pill-btn" *ngFor="let c of faqCategories" [class.active]="selectedCatFilter === c.id.toString()" (click)="selectedCatFilter = c.id.toString()">
            {{ c.title }} ({{ getFaqCountForCat(c.id) }})
          </button>
        </div>
        <div class="search-box">
          <span class="material-symbols-outlined">search</span>
          <input type="text" [(ngModel)]="searchTerm" placeholder="Search questions or answers...">
        </div>
      </div>

      <!-- FAQs Table Card -->
      <div class="cms-card">
        <div class="table-responsive">
          <table class="cms-table">
            <thead>
              <tr>
                <th>ORDER</th>
                <th>QUESTION (TITLE)</th>
                <th>CATEGORY</th>
                <th>ANSWER PREVIEW</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let f of filteredFaqs">
                <td><span class="order-badge">#{{ f.sortOrder }}</span></td>
                <td><strong>{{ f.title }}</strong></td>
                <td>
                  <span class="cat-pill" *ngIf="f.faqCategory">{{ f.faqCategory.title }}</span>
                  <span class="badge-none" *ngIf="!f.faqCategory">Standalone</span>
                </td>
                <td><span class="answer-preview">{{ f.message | slice:0:70 }}...</span></td>
                <td>
                  <span class="status-pill" [class.published]="f.show" [class.draft]="!f.show">
                    {{ f.show ? 'Published' : 'Hidden' }}
                  </span>
                </td>
                <td>
                  <div class="action-buttons">
                    <a [routerLink]="['/admin/content/faqs/edit', f.id]" class="btn-action btn-edit" title="Edit FAQ">
                      <span class="material-symbols-outlined">edit</span>
                      <span>Edit Page</span>
                    </a>
                    <a [routerLink]="['/content/console/faqs/delete', f.id]" class="btn-action btn-delete" title="Delete FAQ">
                      <span class="material-symbols-outlined">delete</span>
                    </a>
                  </div>
                </td>
              </tr>
              <tr *ngIf="filteredFaqs.length === 0">
                <td colspan="6" class="empty-cell">No FAQs found. Click "New FAQ" to create one.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Create FAQ Modal (Protected Backdrop) -->
      <div class="modal-backdrop" *ngIf="showCreateModal">
        <div class="modal-card modal-lg">
          <div class="modal-header">
            <div class="modal-title-group">
              <span class="material-symbols-outlined text-blue">quiz</span>
              <h3>Create FAQ Question</h3>
            </div>
            <button type="button" class="btn-close" (click)="closeCreateModal()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>QUESTION (TITLE) *</label>
              <input type="text" [(ngModel)]="newFaq.title" class="form-control" placeholder="e.g. How do I apply for annual membership?">
            </div>

            <div class="form-row">
              <div class="form-group flex-1">
                <label>FAQ CATEGORY (TYPO-FREE SELECTOR)</label>
                <select [(ngModel)]="newFaq.faqCategoryId" class="form-control">
                  <option [ngValue]="null">Standalone / General (No Category)</option>
                  <option *ngFor="let c of faqCategories" [ngValue]="c.id">{{ c.title }}</option>
                </select>
              </div>
              <div class="form-group flex-1">
                <label>SORT ORDER</label>
                <input type="number" [(ngModel)]="newFaq.sortOrder" class="form-control">
              </div>
            </div>

            <div class="form-group">
              <label>ANSWER (RICH TEXT / ACCORDION CONTENT) *</label>
              <textarea [(ngModel)]="newFaq.description" rows="5" class="form-control" placeholder="Provide a helpful, detailed answer..."></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" (click)="closeCreateModal()">Cancel</button>
            <button type="button" class="btn btn-primary" (click)="saveNewFaq()" [disabled]="saving || !newFaq.title">
              <span class="material-symbols-outlined" *ngIf="!saving">save</span>
              <span>{{ saving ? 'Saving...' : 'Create FAQ' }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Manage Categories Modal -->
      <div class="modal-backdrop" *ngIf="showCategoryModal">
        <div class="modal-card modal-md">
          <div class="modal-header">
            <div class="modal-title-group">
              <span class="material-symbols-outlined text-blue">category</span>
              <h3>Manage FAQ Categories</h3>
            </div>
            <button type="button" class="btn-close" (click)="closeCategoryModal()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="cat-create-box">
              <input type="text" [(ngModel)]="newCategoryTitle" class="form-control" placeholder="New Category Title...">
              <button type="button" class="btn btn-primary btn-sm" (click)="createFaqCategory()" [disabled]="savingCat || !newCategoryTitle">
                {{ savingCat ? 'Adding...' : 'Add' }}
              </button>
            </div>

            <div class="cat-list">
              <div class="cat-item" *ngFor="let c of faqCategories">
                <strong>{{ c.title }}</strong>
                <div class="cat-item-actions">
                  <span class="badge-cat-count">{{ getFaqCountForCat(c.id) }} FAQs</span>
                  <a [routerLink]="['/content/console/faq-categories/delete', c.id]" class="btn-delete-cat" title="Delete Category">&times;</a>
                </div>
              </div>
              <div class="empty-cell-sm" *ngIf="faqCategories.length === 0">No custom categories. Click "Add" above.</div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" (click)="closeCategoryModal()">Close</button>
          </div>
        </div>
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
    .page-header h1 { font-size: 26px; font-weight: 800; color: #0f172a; margin: 0 0 4px; }
    .subtitle { color: #64748b; font-size: 14px; margin: 0; }
    .header-actions { display: flex; gap: 12px; }

    .btn {
      display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px;
      border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; text-decoration: none;
    }
    .btn-primary { background: #0050e5; color: #fff; border: none; }
    .btn-outline { background: transparent; border: 1px solid #cbd5e1; color: #334155; }
    .btn-sm { padding: 8px 14px; font-size: 12px; }

    .cms-nav-tabs {
      display: flex; gap: 8px; background: #fff; padding: 8px 12px;
      border-radius: 12px; border: 1px solid #e2e8f0; overflow-x: auto;
    }
    .nav-tab {
      display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px;
      border-radius: 8px; font-size: 13px; font-weight: 600; color: #64748b; text-decoration: none;
    }
    .nav-tab.active { background: #0050e5; color: #fff; }
    .tab-badge { background: rgba(0,0,0,0.08); padding: 2px 8px; border-radius: 12px; font-size: 11px; }
    .nav-tab.active .tab-badge { background: rgba(255,255,255,0.25); color: #fff; }

    .filter-pills-bar {
      display: flex; justify-content: space-between; align-items: center; gap: 16px;
      background: #fff; padding: 12px 18px; border-radius: 12px; border: 1px solid #e2e8f0;
    }
    .pills-scroll { display: flex; gap: 8px; overflow-x: auto; }
    .pill-btn {
      border: none; background: #f1f5f9; padding: 6px 14px; border-radius: 20px;
      font-size: 12px; font-weight: 600; color: #475569; cursor: pointer; white-space: nowrap; transition: all 0.2s;
    }
    .pill-btn.active { background: #0050e5; color: #fff; }
    .search-box {
      display: flex; align-items: center; gap: 8px; background: #f8fafc;
      padding: 6px 14px; border-radius: 8px; border: 1px solid #e2e8f0; width: 260px;
    }
    .search-box input { border: none; background: transparent; font-size: 13px; outline: none; width: 100%; }

    .cms-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; }
    .cms-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .cms-table th {
      text-align: left; padding: 12px; background: #f8fafc; color: #64748b;
      font-weight: 700; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-transform: uppercase;
    }
    .cms-table td { padding: 14px 12px; border-bottom: 1px solid #f1f5f9; }

    .cat-pill { background: #faf5ff; color: #7e22ce; padding: 3px 8px; border-radius: 6px; font-weight: 700; font-size: 11px; }
    .badge-none { color: #94a3b8; font-size: 11px; }
    .order-badge { background: #f1f5f9; padding: 4px 8px; border-radius: 6px; font-weight: 700; font-size: 12px; }
    .answer-preview { color: #475569; font-size: 12px; }
    .status-pill { padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; }
    .status-pill.published { background: #dcfce7; color: #15803d; }
    .status-pill.draft { background: #fee2e2; color: #dc2626; }

    .action-buttons { display: flex; gap: 6px; align-items: center; }
    .btn-action {
      display: inline-flex; align-items: center; gap: 4px; padding: 6px 10px;
      border-radius: 6px; font-size: 12px; font-weight: 600; text-decoration: none; cursor: pointer; border: none;
    }
    .btn-edit { background: #eff6ff; color: #0050e5; }
    .btn-edit:hover { background: #0050e5; color: #fff; }
    .btn-delete { background: #fee2e2; color: #dc2626; }
    .btn-delete:hover { background: #dc2626; color: #fff; }

    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center; z-index: 2000;
    }
    .modal-card {
      background: #fff; border-radius: 16px; width: 100%; max-width: 540px;
      box-shadow: 0 25px 60px rgba(0,0,0,0.3); overflow: hidden;
    }
    .modal-lg { max-width: 600px; }
    .modal-header {
      padding: 18px 24px; display: flex; justify-content: space-between; align-items: center;
      border-bottom: 1px solid #e2e8f0;
    }
    .modal-title-group { display: flex; align-items: center; gap: 10px; }
    .modal-title-group h3 { margin: 0; font-size: 18px; font-weight: 800; }
    .btn-close { background: none; border: none; font-size: 20px; cursor: pointer; color: #64748b; }
    .modal-body { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
    .modal-footer { padding: 16px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 10px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group label { font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; }
    .form-control { padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; }
    .form-row { display: flex; gap: 12px; }
    .form-check { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; }
    .help-text { font-size: 11px; color: #64748b; }
    .error-box { background: #fee2e2; color: #991b1b; padding: 10px; border-radius: 8px; font-size: 12px; font-weight: 600; }

    .add-cat-bar { display: flex; gap: 8px; margin-bottom: 12px; }
    .categories-list { display: flex; flex-direction: column; gap: 8px; max-height: 200px; overflow-y: auto; }
    .cat-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 13px; }
    .cat-item-actions { display: flex; align-items: center; gap: 8px; }
    .badge-cat-count { font-size: 11px; background: #eff6ff; color: #0050e5; padding: 2px 6px; border-radius: 4px; font-weight: 600; }
    .btn-delete-cat { background: none; border: none; font-size: 18px; color: #dc2626; cursor: pointer; }
    .empty-cell-sm { text-align: center; color: #64748b; padding: 16px; font-size: 12px; }
  `]
})
export class FaqsComponent implements OnInit {
  loading = false;
  saving = false;
  savingCat = false;
  faqs: any[] = [];
  faqCategories: any[] = [];
  searchTerm = '';
  selectedCatFilter = 'all';

  showCreateModal = false;
  showCategoryModal = false;
  errorMessage = '';
  newCategoryTitle = '';

  newFaq: any = {};

  constructor(
    private api: ApiService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.loading = true;
    this.api.get<any>('ContentApi/faqs').subscribe({
      next: (res) => {
        this.faqs = res?.data || [];
        this.loadCategories();
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  loadCategories(): void {
    this.api.get<any>('ContentApi/faq-categories').subscribe({
      next: (res) => {
        this.loading = false;
        this.faqCategories = res?.data || [];
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  get standaloneCount(): number {
    return this.faqs.filter(f => !f.faqCategoryId).length;
  }

  getFaqCountForCat(catId: number): number {
    return this.faqs.filter(f => f.faqCategoryId === catId).length;
  }

  get filteredFaqs(): any[] {
    let list = this.faqs;
    if (this.selectedCatFilter === 'standalone') {
      list = list.filter(f => !f.faqCategoryId);
    } else if (this.selectedCatFilter !== 'all') {
      const id = parseInt(this.selectedCatFilter, 10);
      list = list.filter(f => f.faqCategoryId === id);
    }

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      list = list.filter(f => f.title?.toLowerCase().includes(term) || f.message?.toLowerCase().includes(term));
    }

    return list;
  }

  openCreateModal(): void {
    this.newFaq = {
      title: '',
      message: '',
      faqCategoryId: null,
      sortOrder: this.faqs.length + 1,
      show: true
    };
    this.errorMessage = '';
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
  }

  saveNewFaq(): void {
    if (!this.newFaq.title?.trim() || !this.newFaq.message?.trim()) {
      this.errorMessage = 'Question and Answer are required.';
      return;
    }

    this.saving = true;
    this.errorMessage = '';

    const payload = {
      ...this.newFaq,
      faqCategoryId: this.newFaq.faqCategoryId ? parseInt(this.newFaq.faqCategoryId, 10) : null,
      sortOrder: parseInt(this.newFaq.sortOrder, 10) || 0
    };

    this.api.post<any>('ContentApi/faqs', payload).subscribe({
      next: () => {
        this.saving = false;
        this.showCreateModal = false;
        this.toast.success('FAQ item created successfully.');
        this.loadAll();
      },
      error: (err) => {
        this.saving = false;
        this.errorMessage = err?.error?.message || 'Failed to save FAQ.';
      }
    });
  }

  toggleFaqStatus(f: any): void {
    this.api.put<any>(`ContentApi/faqs/${f.id}`, { ...f, show: !f.show }).subscribe({
      next: () => {
        f.show = !f.show;
        this.toast.success(`FAQ "${f.title}" visibility updated.`);
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'Failed to update FAQ.');
      }
    });
  }

  openCategoryModal(): void {
    this.newCategoryTitle = '';
    this.showCategoryModal = true;
  }

  closeCategoryModal(): void {
    this.showCategoryModal = false;
  }

  createFaqCategory(): void {
    if (!this.newCategoryTitle.trim()) return;

    this.savingCat = true;
    const payload = {
      title: this.newCategoryTitle.trim(),
      sortOrder: this.faqCategories.length + 1
    };

    this.api.post<any>('ContentApi/faq-categories', payload).subscribe({
      next: () => {
        this.savingCat = false;
        this.newCategoryTitle = '';
        this.toast.success('Category created successfully.');
        this.loadCategories();
      },
      error: (err) => {
        this.savingCat = false;
        this.toast.error(err?.error?.message || 'Failed to create category.');
      }
    });
  }

  async deleteFaqCategory(c: any): Promise<void> {
    const confirmed = await this.toast.confirm(
      'Delete FAQ Category',
      `You are about to permanently delete FAQ category "${c.title}".`,
      'Delete Category',
      'Cancel',
      'danger',
      c.title,
      [
        'All FAQs organized under this category will be unassigned to Uncategorized.',
        'This category cannot be recovered.'
      ]
    );
    if (!confirmed) return;

    this.api.delete<any>(`ContentApi/faq-categories/${c.id}`).subscribe({
      next: () => {
        this.toast.success(`Category "${c.title}" deleted.`);
        this.loadAll();
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'Failed to delete category.');
      }
    });
  }

  async deleteFaq(f: any): Promise<void> {
    const confirmed = await this.toast.confirm(
      'Delete FAQ Question',
      `You are about to permanently delete FAQ "${f.title}".`,
      'Delete FAQ',
      'Cancel',
      'danger',
      f.title,
      [
        'This frequently asked question and answer will be removed from the public Help & Support pages.',
        'This item cannot be recovered.'
      ]
    );
    if (!confirmed) return;

    this.api.delete<any>(`ContentApi/faqs/${f.id}`).subscribe({
      next: () => {
        this.toast.success(`FAQ "${f.title}" deleted.`);
        this.loadAll();
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'Failed to delete FAQ.');
      }
    });
  }
}
