import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-web-category-edit',
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
            <a routerLink="/admin/content/categories">Web Categories</a>
            <span class="sep">/</span>
            <span class="current">Edit Category</span>
          </div>
          <h1>Edit Menu Category: {{ category?.title }}</h1>
          <p class="subtitle">Update navigation category configuration, parent hierarchy, and sorting position.</p>
        </div>
        <div class="header-actions">
          <a routerLink="/admin/content/categories" class="btn btn-outline">
            <span class="material-symbols-outlined">arrow_back</span>
            <span>Back to Categories</span>
          </a>
          <button type="button" class="btn btn-primary" (click)="saveCategory()" [disabled]="saving || loading">
            <span class="material-symbols-outlined">save</span>
            <span *ngIf="!saving">Save Changes</span>
            <span *ngIf="saving">Saving...</span>
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div class="loading-box" *ngIf="loading">
        <span class="material-symbols-outlined spin">progress_activity</span>
        <p>Loading category details...</p>
      </div>

      <!-- Category Form Card -->
      <div class="cms-card" *ngIf="!loading && category">
        <div class="card-header-bar">
          <div>
            <h3>Category Information & Settings</h3>
            <p class="card-sub">All fields from the PageCategory entity are exposed below.</p>
          </div>
          <span class="badge-status" [class.published]="category.publish" [class.draft]="!category.publish">
            {{ category.publish ? 'Published' : 'Hidden' }}
          </span>
        </div>

        <div class="form-grid">
          <!-- Title -->
          <div class="form-group full-width">
            <label>CATEGORY TITLE *</label>
            <input type="text" [(ngModel)]="category.title" class="form-control" placeholder="e.g. About Us, Programs, Services">
          </div>

          <!-- Menu Sort Order -->
          <div class="form-group">
            <label>MENU SORT ORDER</label>
            <input type="number" [(ngModel)]="category.menuSortOrder" class="form-control">
            <small class="help-text">Controls position in header navigation bar (lower numbers appear first).</small>
          </div>

          <!-- Icon Class -->
          <div class="form-group">
            <label>ICON CLASS STRING</label>
            <input type="text" [(ngModel)]="category.icon" class="form-control" placeholder="fa-solid fa-folder">
            <small class="help-text">FontAwesome / Bootstrap icon class displayed next to the category label.</small>
          </div>

          <!-- Parent Category -->
          <div class="form-group">
            <label>PARENT CATEGORY (SUB-DROPDOWN HIERARCHY)</label>
            <select [(ngModel)]="category.parentId" class="form-control">
              <option [ngValue]="null">Top-Level Navigation (No Parent)</option>
              <option *ngFor="let c of otherCategories" [ngValue]="c.id">{{ c.title }}</option>
            </select>
          </div>

          <!-- Home Sort From -->
          <div class="form-group">
            <label>HOME SORT FROM</label>
            <select [(ngModel)]="category.homeSortFrom" class="form-control">
              <option [ngValue]="0">Default (Top to Bottom)</option>
              <option [ngValue]="1">Ascending</option>
              <option [ngValue]="2">Descending</option>
            </select>
          </div>

          <!-- Footer Customizations -->
          <div class="form-group">
            <label>FOOTER DISPLAY TITLE (OPTIONAL OVERRIDE)</label>
            <input type="text" [(ngModel)]="category.footerDisplayTitle" class="form-control" placeholder="e.g. Our Services">
            <small class="help-text">Leave blank to use the Category Title as the footer column header.</small>
          </div>

          <div class="form-group">
            <label>FOOTER COLUMN SORT ORDER</label>
            <input type="number" [(ngModel)]="category.footerSortOrder" class="form-control" placeholder="0">
            <small class="help-text">Ordering position among other footer navigation columns.</small>
          </div>

          <!-- Visibility Toggles -->
          <div class="form-group full-width">
            <label>CATEGORY VISIBILITY & PLACEMENTS</label>
            <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 8px;">
              <div class="checkbox-card">
                <input type="checkbox" [(ngModel)]="category.publish" id="catPub">
                <label for="catPub">
                  <strong>Publish Category</strong>
                  <p>When checked, this category is active across the tenant website.</p>
                </label>
              </div>

              <div class="checkbox-card">
                <input type="checkbox" [(ngModel)]="category.showInMenu" id="catShowMenu">
                <label for="catShowMenu">
                  <strong>Show in Navigation Header (Navbar Dropdown)</strong>
                  <p>When enabled, renders as a dropdown category in the main menu header.</p>
                </label>
              </div>

              <div class="checkbox-card">
                <input type="checkbox" [(ngModel)]="category.showInFooter" id="catShowFooter">
                <label for="catShowFooter">
                  <strong>Show as Column in Website Footer</strong>
                  <p>When enabled, renders as a dedicated column header with its attached child pages in the footer.</p>
                </label>
              </div>
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
      background: #fff; padding: 24px 28px; border-radius: 16px;
      border: 1px solid #e2e8f0;
    }
    .breadcrumb { font-size: 13px; color: #64748b; margin-bottom: 6px; }
    .breadcrumb a { color: #0050e5; text-decoration: none; font-weight: 600; }
    .page-header h1 { font-size: 24px; font-weight: 800; color: #0f172a; margin: 0 0 4px; }
    .subtitle { color: #64748b; font-size: 14px; margin: 0; }
    .header-actions { display: flex; gap: 12px; }

    .btn {
      display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px;
      border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; text-decoration: none;
    }
    .btn-primary { background: #0050e5; color: #fff; border: none; }
    .btn-outline { background: transparent; border: 1px solid #cbd5e1; color: #334155; }

    .cms-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 28px; }
    .card-header-bar {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #f1f5f9;
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

    .badge-status { padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; }
    .badge-status.published { background: #dcfce7; color: #15803d; }
    .badge-status.draft { background: #f1f5f9; color: #64748b; }

    .loading-box { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px; color: #64748b; }
    .spin { animation: spin 1s linear infinite; font-size: 32px; color: #0050e5; margin-bottom: 12px; }
    @keyframes spin { 100% { transform: rotate(360deg); } }

    .success-box { background: #f0fdf4; color: #166534; padding: 12px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; margin-top: 20px; }
    .error-box { background: #fee2e2; color: #991b1b; padding: 12px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; margin-top: 20px; }
  `]
})
export class WebCategoryEditComponent implements OnInit {
  categoryId = '';
  category: any = null;
  allCategories: any[] = [];
  loading = false;
  saving = false;
  successMessage = '';
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService
  ) {}

  ngOnInit(): void {
    this.categoryId = this.route.snapshot.paramMap.get('id') || '';
    if (this.categoryId) {
      this.loadCategory();
    }
  }

  loadCategory(): void {
    this.loading = true;
    this.api.get<any>('ContentApi/categories').subscribe({
      next: (res) => {
        this.loading = false;
        this.allCategories = res?.data || [];
        this.category = this.allCategories.find(c => c.id.toLowerCase() === this.categoryId.toLowerCase());
        if (!this.category) {
          this.errorMessage = 'Category not found.';
        }
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Failed to load category.';
      }
    });
  }

  get otherCategories(): any[] {
    return this.allCategories.filter(c => c.id.toLowerCase() !== this.categoryId.toLowerCase());
  }

  saveCategory(): void {
    if (!this.category?.title?.trim()) {
      this.errorMessage = 'Category Title is required.';
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.api.put<any>(`ContentApi/categories/${this.categoryId}`, this.category).subscribe({
      next: () => {
        this.saving = false;
        this.successMessage = 'Category updated successfully!';
        setTimeout(() => this.successMessage = '', 4000);
      },
      error: (err) => {
        this.saving = false;
        this.errorMessage = err?.error?.message || 'Failed to update category.';
      }
    });
  }
}
