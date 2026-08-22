import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent, PageHeaderButton } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-product-category-edit',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, PageHeaderComponent],
  template: `
    <div class="category-form-page">
      <app-page-header
        eyebrow="COMMERCE STUDIO"
        icon="category"
        [title]="isEditMode ? 'Edit Category: ' + (model.title || '') : 'Create Product Category'"
        subtitle="Configure catalog hierarchy, icon badge, description, and storefront visibility."
        [buttons]="headerButtons"
      ></app-page-header>

      <div *ngIf="isLoading" class="loading-state">
        <div class="spinner"></div>
        <span>Loading category...</span>
      </div>

      <form *ngIf="!isLoading" (ngSubmit)="onSubmit()" class="form-container">
        <div class="form-card">
          <div class="form-group">
            <label class="form-label">Category Title <span class="req">*</span></label>
            <input
              type="text"
              [(ngModel)]="model.title"
              name="title"
              required
              placeholder="e.g. Enterprise Cloud Software"
              class="form-control"
            />
          </div>

          <div *ngIf="isEditMode" class="form-group">
            <label class="form-label">URL Slug</label>
            <input
              type="text"
              [(ngModel)]="model.slug"
              name="slug"
              class="form-control font-mono"
            />
          </div>

          <div class="form-group">
            <label class="form-label">Description</label>
            <textarea
              [(ngModel)]="model.description"
              name="description"
              rows="3"
              placeholder="Brief summary of products grouped in this category"
              class="form-control"
            ></textarea>
          </div>

          <div class="form-row-2">
            <div class="form-group">
              <label class="form-label">Material Symbol Icon</label>
              <div class="icon-input-wrap">
                <span class="material-symbols-outlined input-icon-preview">{{ model.icon || 'category' }}</span>
                <input
                  type="text"
                  [(ngModel)]="model.icon"
                  name="icon"
                  placeholder="category, terminal, handshake..."
                  class="form-control"
                  style="padding-left: 38px;"
                />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Sort Order (Menu Priority)</label>
              <input
                type="number"
                [(ngModel)]="model.sortOrder"
                name="sortOrder"
                class="form-control"
              />
            </div>
          </div>

          <div class="form-group checkbox-group">
            <label class="checkbox-label">
              <input type="checkbox" [(ngModel)]="model.publish" name="publish" />
              <span>Publish category on public storefront</span>
            </label>
          </div>

          <div class="form-actions">
            <button type="submit" [disabled]="isSubmitting" class="btn btn-primary btn-lg">
              <span class="material-symbols-outlined">save</span>
              <span>{{ isSubmitting ? 'Saving...' : (isEditMode ? 'Update Category' : 'Create Category') }}</span>
            </button>
            <a routerLink="/products/console/categories" class="btn btn-outline btn-lg">Cancel</a>
          </div>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .category-form-page { display: flex; flex-direction: column; gap: 20px; width: 100%; }
    .form-container { max-width: 100%; }

    .form-card {
      background: #ffffff; padding: 24px; border-radius: 10px; border: 1px solid #e2e8f0;
      display: flex; flex-direction: column; gap: 16px;
    }

    .form-group { margin-bottom: 4px; }
    .form-label { display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px; }
    .req { color: #ef4444; }
    .form-control {
      width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px;
      outline: none; background: #ffffff; box-sizing: border-box;
    }
    .form-control:focus { border-color: #0050e5; box-shadow: 0 0 0 3px rgba(0,80,229,0.12); }
    .font-mono { font-family: monospace; }

    .form-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    @media (max-width: 600px) { .form-row-2 { grid-template-columns: 1fr; } }

    .icon-input-wrap { position: relative; display: flex; align-items: center; }
    .input-icon-preview { position: absolute; left: 10px; color: #0050e5; font-size: 20px; pointer-events: none; }

    .checkbox-group { display: flex; align-items: center; padding-top: 4px; }
    .checkbox-label { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 500; color: #334155; cursor: pointer; }
    .checkbox-label input { width: 16px; height: 16px; accent-color: #0050e5; }

    .form-actions { display: flex; align-items: center; gap: 12px; margin-top: 12px; padding-top: 16px; border-top: 1px solid #f1f5f9; }
    .btn-lg { padding: 10px 20px; font-size: 14px; font-weight: 600; }

    .loading-state { text-align: center; padding: 48px; color: #64748b; }
    .spinner { width: 32px; height: 32px; border: 3px solid #e2e8f0; border-top-color: #0050e5; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 12px; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class ProductCategoryEditComponent implements OnInit {
  categoryId = '';
  isEditMode = false;
  isLoading = false;
  isSubmitting = false;

  model: any = {
    title: '',
    slug: '',
    description: '',
    icon: 'category',
    sortOrder: 0,
    publish: true
  };

  headerButtons: PageHeaderButton[] = [
    {
      text: 'Back to Categories',
      icon: 'arrow_back',
      routerLink: '/products/console/categories'
    }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.categoryId = this.route.snapshot.paramMap.get('id') || '';
    if (this.categoryId) {
      this.isEditMode = true;
      this.loadCategory();
    }
  }

  loadCategory(): void {
    this.isLoading = true;
    this.api.get<any>(`ProductsApi/categories/${this.categoryId}`).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.model = res?.data?.category || {};
      },
      error: (err) => {
        this.isLoading = false;
        this.toast.error(err?.error?.message || 'Failed to load category.');
        this.router.navigate(['/products/console/categories']);
      }
    });
  }

  onSubmit(): void {
    if (!this.model.title?.trim()) {
      this.toast.error('Category title is required.');
      return;
    }

    this.isSubmitting = true;
    const req$ = this.isEditMode
      ? this.api.put<any>(`ProductsApi/categories/${this.categoryId}`, this.model)
      : this.api.post<any>('ProductsApi/categories', this.model);

    req$.subscribe({
      next: () => {
        this.isSubmitting = false;
        this.toast.success(this.isEditMode ? 'Category updated.' : 'Category created.');
        this.router.navigate(['/products/console/categories']);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.toast.error(err?.error?.message || 'Failed to save category.');
      }
    });
  }
}
