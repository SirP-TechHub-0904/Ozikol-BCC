import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-product-category-delete',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="delete-page-container">
      <!-- Breadcrumbs -->
      <nav class="breadcrumb-nav">
        <a routerLink="/products/console" class="crumb-link">Commerce Studio</a>
        <span class="crumb-sep">/</span>
        <a routerLink="/products/console/categories" class="crumb-link">Categories</a>
        <span class="crumb-sep">/</span>
        <span class="current danger-text">Delete Category</span>
      </nav>

      <!-- Danger Header -->
      <div class="danger-header">
        <div class="danger-title-row">
          <div class="danger-icon-circle">
            <span class="material-symbols-outlined">delete_forever</span>
          </div>
          <div>
            <h1 class="page-title">Delete Product Category</h1>
            <p class="page-desc">Permanent removal of category taxonomy from the commercial catalog.</p>
          </div>
        </div>
      </div>

      <div *ngIf="isLoading" class="loading-state">
        <div class="spinner"></div>
        <span>Loading category details...</span>
      </div>

      <div *ngIf="!isLoading && category" class="delete-card">
        <!-- Category Summary Strip -->
        <div class="summary-strip">
          <div class="icon-box">
            <span class="material-symbols-outlined">{{ category.icon || 'category' }}</span>
          </div>
          <div class="summary-info">
            <h2>{{ category.title }}</h2>
            <p *ngIf="category.description">{{ category.description }}</p>
            <div class="summary-meta">
              <span>Attached Products: <strong>{{ productCount }}</strong></span>
              <span>Slug: <code>{{ category.slug }}</code></span>
            </div>
          </div>
        </div>

        <!-- Consequences Alert -->
        <div class="consequences-box">
          <div class="consequences-header">
            <span class="material-symbols-outlined">warning</span>
            <strong>Category Deletion Consequences</strong>
          </div>
          <ul class="consequences-list">
            <li>The category <strong>"{{ category.title }}"</strong> will be permanently deleted.</li>
            <li *ngIf="productCount > 0">
              <strong>{{ productCount }} attached product(s)</strong> will be safely moved to <strong>Uncategorized</strong> and will NOT be deleted.
            </li>
            <li>Storefront navigation filters linked to this category will be removed.</li>
            <li>This action cannot be undone.</li>
          </ul>
        </div>

        <!-- Exact Title Verification Input -->
        <div class="verification-box">
          <label class="verification-label">
            To confirm deletion, please type <code class="target-title-code">{{ category.title }}</code> below:
          </label>
          <input
            type="text"
            [(ngModel)]="confirmationInput"
            placeholder="Type exact category title to unlock button..."
            class="verification-input"
            [class.matched]="isTitleMatched()"
          />
        </div>

        <!-- Error Banner -->
        <div *ngIf="errorMsg" class="error-banner">
          <span class="material-symbols-outlined">error</span>
          <span>{{ errorMsg }}</span>
        </div>

        <!-- Action Buttons -->
        <div class="action-footer">
          <a routerLink="/products/console/categories" class="btn btn-outline btn-lg">Cancel</a>
          <button
            type="button"
            [disabled]="!isTitleMatched() || isSubmitting"
            (click)="onConfirmDelete()"
            class="btn btn-danger btn-lg"
          >
            <span class="material-symbols-outlined">delete_forever</span>
            <span>{{ isSubmitting ? 'Deleting...' : 'I understand the consequences, delete this category' }}</span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .delete-page-container { width: 100%; max-width: 100%; display: flex; flex-direction: column; gap: 20px; }
    .breadcrumb-nav { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #64748b; }
    .crumb-link { color: #0050e5; text-decoration: none; font-weight: 500; }
    .crumb-sep { color: #cbd5e1; }
    .current { font-weight: 600; }
    .danger-text { color: #dc2626; }

    .danger-header {
      background: #ffffff; padding: 24px; border-radius: 12px; border: 1px solid #fee2e2; border-left: 6px solid #ef4444;
    }
    .danger-title-row { display: flex; align-items: center; gap: 16px; }
    .danger-icon-circle {
      width: 52px; height: 52px; border-radius: 12px; background: #fee2e2; color: #dc2626;
      display: flex; align-items: center; justify-content: center;
    }
    .danger-icon-circle span { font-size: 32px; }
    .page-title { margin: 0; font-size: 22px; font-weight: 700; color: #0f172a; }
    .page-desc { margin: 4px 0 0; font-size: 14px; color: #64748b; }

    .delete-card {
      background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 28px; display: flex; flex-direction: column; gap: 24px;
    }

    .summary-strip {
      display: flex; align-items: center; gap: 16px; background: #f8fafc; padding: 16px; border-radius: 10px; border: 1px solid #e2e8f0;
    }
    .icon-box {
      width: 52px; height: 52px; border-radius: 10px; background: rgba(0,80,229,0.08); color: #0050e5;
      display: flex; align-items: center; justify-content: center;
    }
    .icon-box span { font-size: 28px; }
    .summary-info h2 { margin: 0 0 4px; font-size: 18px; font-weight: 700; color: #0f172a; }
    .summary-info p { margin: 0 0 6px; font-size: 13px; color: #64748b; }
    .summary-meta { display: flex; gap: 16px; font-size: 12px; color: #475569; }
    .summary-meta code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; }

    .consequences-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 18px; }
    .consequences-header { display: flex; align-items: center; gap: 8px; color: #b91c1c; font-size: 15px; margin-bottom: 10px; }
    .consequences-list { margin: 0; padding-left: 20px; font-size: 13px; color: #991b1b; line-height: 1.7; }

    .verification-box { display: flex; flex-direction: column; gap: 10px; }
    .verification-label { font-size: 14px; font-weight: 600; color: #334155; }
    .target-title-code { background: #fee2e2; color: #b91c1c; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 14px; }
    .verification-input {
      width: 100%; padding: 12px 14px; font-size: 15px; border: 2px solid #cbd5e1; border-radius: 8px; outline: none; box-sizing: border-box;
    }
    .verification-input:focus { border-color: #0050e5; }
    .verification-input.matched { border-color: #10b981; background: #f0fdf4; }

    .action-footer { display: flex; align-items: center; justify-content: flex-end; gap: 12px; margin-top: 12px; }
    .btn-danger { background: #dc2626; color: #fff; border: none; font-weight: 600; padding: 10px 20px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; }
    .btn-danger:disabled { background: #fca5a5; cursor: not-allowed; }
    .btn-danger:not(:disabled):hover { background: #b91c1c; }

    .error-banner { display: flex; align-items: center; gap: 8px; background: #fee2e2; color: #b91c1c; padding: 12px; border-radius: 8px; font-size: 13px; }
    .loading-state { text-align: center; padding: 48px; color: #64748b; }
    .spinner { width: 32px; height: 32px; border: 3px solid #e2e8f0; border-top-color: #0050e5; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 12px; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class ProductCategoryDeleteComponent implements OnInit {
  categoryId = '';
  category: any = null;
  productCount = 0;
  confirmationInput = '';
  isLoading = true;
  isSubmitting = false;
  errorMsg = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.categoryId = this.route.snapshot.paramMap.get('id') || '';
    this.loadCategory();
  }

  loadCategory(): void {
    this.isLoading = true;
    this.api.get<any>(`ProductsApi/categories/${this.categoryId}`).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.category = res?.data?.category;
        this.productCount = res?.data?.productCount || 0;
      },
      error: (err) => {
        this.isLoading = false;
        this.toast.error(err?.error?.message || 'Failed to load category.');
        this.router.navigate(['/products/console/categories']);
      }
    });
  }

  isTitleMatched(): boolean {
    if (!this.category?.title) return false;
    return this.confirmationInput.trim().toLowerCase() === this.category.title.trim().toLowerCase();
  }

  onConfirmDelete(): void {
    if (!this.isTitleMatched()) return;

    this.isSubmitting = true;
    this.errorMsg = '';

    this.api.delete<any>(`ProductsApi/categories/${this.categoryId}`).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.toast.success(`Category '${this.category.title}' deleted successfully.`);
        this.router.navigate(['/products/console/categories']);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMsg = err?.error?.message || 'Failed to delete category.';
      }
    });
  }
}
