import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-product-delete',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="delete-page-container">
      <!-- Breadcrumbs -->
      <nav class="breadcrumb-nav">
        <a routerLink="/products/console" class="crumb-link">Commerce Studio</a>
        <span class="crumb-sep">/</span>
        <a routerLink="/products/console" class="crumb-link">Products</a>
        <span class="crumb-sep">/</span>
        <span class="current danger-text">Delete Product</span>
      </nav>

      <!-- Danger Zone Header -->
      <div class="danger-header">
        <div class="danger-title-row">
          <div class="danger-icon-circle">
            <span class="material-symbols-outlined">delete_forever</span>
          </div>
          <div>
            <h1 class="page-title">Delete Product Record</h1>
            <p class="page-desc">Permanent removal of commercial catalog records and digital assets.</p>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading" class="loading-state">
        <div class="spinner"></div>
        <span>Verifying product order dependencies...</span>
      </div>

      <!-- Main Deletion Box -->
      <div *ngIf="!isLoading && product" class="delete-card">
        <!-- 1. Product Summary Strip -->
        <div class="product-summary-strip">
          <div class="product-thumb">
            <img *ngIf="product.coverImageUrl" [src]="product.coverImageUrl" [alt]="product.title" class="thumb-img" />
            <span *ngIf="!product.coverImageUrl" class="material-symbols-outlined thumb-icon">category</span>
          </div>
          <div class="product-info">
            <h2 class="product-name">{{ product.title }}</h2>
            <div class="product-meta">
              <span class="type-pill">Type: <strong>{{ product.type === 0 ? 'Software' : product.type === 1 ? 'Service' : product.type === 2 ? 'Physical' : 'Subscription' }}</strong></span>
              <span class="sku-pill" *ngIf="product.sku">SKU: <strong>{{ product.sku }}</strong></span>
              <span class="price-pill">{{ currencySymbol }}{{ product.price | number:'1.2-2' }}</span>
              <span class="category-pill">{{ product.category?.title || 'Uncategorized' }}</span>
            </div>
          </div>
        </div>

        <!-- 2. CASE A: Deletion Blocked (Orders Exist) -->
        <div *ngIf="!canDelete" class="blocked-alert-card">
          <div class="blocked-header">
            <span class="material-symbols-outlined blocked-icon">gavel</span>
            <div>
              <h3>Deletion Blocked: Commercial Compliance & Order History</h3>
              <p>This product is linked to <strong>{{ orderCount }} customer order transaction(s)</strong>.</p>
            </div>
          </div>

          <div class="blocked-body">
            <p>
              Under commercial accounting and tax compliance rules, products tied to customer invoices, payment transactions, and historical purchase receipts cannot be deleted from the database.
            </p>
            <p>
              To remove this product from the public storefront and stop new purchases without breaking past invoices, you can <strong>Archive / Disable</strong> it.
            </p>
          </div>

          <div class="blocked-actions">
            <button type="button" [disabled]="isSubmitting" (click)="onDisableProduct()" class="btn btn-warning btn-lg">
              <span class="material-symbols-outlined">archive</span>
              <span>{{ isSubmitting ? 'Disabling Product...' : 'Disable & Archive Product Instead' }}</span>
            </button>
            <a routerLink="/products/console" class="btn btn-outline">Cancel & Keep Product</a>
          </div>
        </div>

        <!-- 3. CASE B: Deletion Allowed (No Orders) -->
        <div *ngIf="canDelete" class="allowed-delete-flow">
          <!-- Consequence Warning Box -->
          <div class="consequences-box">
            <div class="consequences-header">
              <span class="material-symbols-outlined">warning</span>
              <strong>Irreversible Action Warning</strong>
            </div>
            <ul class="consequences-list">
              <li>The product record <strong>"{{ product.title }}"</strong> will be permanently deleted.</li>
              <li>Associated gallery assets, software license templates, and release schedules will be removed.</li>
              <li>Any cart items referencing this product will become invalid.</li>
              <li>This action <strong>CANNOT</strong> be undone.</li>
            </ul>
          </div>

          <!-- Exact Title Verification Input -->
          <div class="verification-box">
            <label class="verification-label">
              To confirm deletion, please type <code class="target-title-code">{{ product.title }}</code> below:
            </label>
            <input
              type="text"
              [(ngModel)]="confirmationInput"
              placeholder="Type exact product title to unlock button..."
              class="verification-input"
              [class.matched]="isTitleMatched()"
            />
          </div>

          <!-- Error Message Banner -->
          <div *ngIf="errorMsg" class="error-banner">
            <span class="material-symbols-outlined">error</span>
            <span>{{ errorMsg }}</span>
          </div>

          <!-- Action Buttons -->
          <div class="action-footer">
            <a routerLink="/products/console" class="btn btn-outline btn-lg">Cancel</a>
            <button
              type="button"
              [disabled]="!isTitleMatched() || isSubmitting"
              (click)="onConfirmDelete()"
              class="btn btn-danger btn-lg"
            >
              <span class="material-symbols-outlined">delete_forever</span>
              <span>{{ isSubmitting ? 'Purging Product...' : 'I understand the consequences, delete this product' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .delete-page-container {
      width: 100%; max-width: 100%; box-sizing: border-box; display: flex; flex-direction: column; gap: 20px;
    }
    .breadcrumb-nav { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #64748b; }
    .crumb-link { color: #0050e5; text-decoration: none; font-weight: 500; }
    .crumb-link:hover { text-decoration: underline; }
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

    .product-summary-strip {
      display: flex; align-items: center; gap: 16px; background: #f8fafc; padding: 16px; border-radius: 10px; border: 1px solid #e2e8f0;
    }
    .product-thumb {
      width: 64px; height: 64px; border-radius: 8px; background: #e2e8f0; overflow: hidden; display: flex; align-items: center; justify-content: center;
    }
    .thumb-img { width: 100%; height: 100%; object-fit: cover; }
    .thumb-icon { font-size: 32px; color: #94a3b8; }
    .product-name { margin: 0 0 6px; font-size: 18px; font-weight: 700; color: #0f172a; }
    .product-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 12px; }
    .type-pill, .sku-pill, .price-pill, .category-pill {
      background: #ffffff; padding: 3px 8px; border-radius: 4px; border: 1px solid #cbd5e1; color: #334155;
    }
    .price-pill { font-weight: 700; color: #0f172a; }

    .blocked-alert-card {
      background: #fffbeb; border: 2px solid #fef3c7; border-radius: 10px; padding: 20px;
    }
    .blocked-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
    .blocked-icon { font-size: 36px; color: #d97706; }
    .blocked-header h3 { margin: 0; font-size: 16px; font-weight: 700; color: #92400e; }
    .blocked-header p { margin: 2px 0 0; font-size: 13px; color: #b45309; }
    .blocked-body { font-size: 14px; color: #78350f; line-height: 1.6; margin-bottom: 20px; }
    .blocked-actions { display: flex; align-items: center; gap: 12px; }

    .consequences-box {
      background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 18px;
    }
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
    .btn-warning { background: #d97706; color: #fff; border: none; font-weight: 600; padding: 10px 20px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; }
    .btn-warning:hover { background: #b45309; }
    .btn-danger { background: #dc2626; color: #fff; border: none; font-weight: 600; padding: 10px 20px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; }
    .btn-danger:disabled { background: #fca5a5; cursor: not-allowed; }
    .btn-danger:not(:disabled):hover { background: #b91c1c; }

    .error-banner { display: flex; align-items: center; gap: 8px; background: #fee2e2; color: #b91c1c; padding: 12px; border-radius: 8px; font-size: 13px; }
    .loading-state { text-align: center; padding: 48px; color: #64748b; }
    .spinner { width: 32px; height: 32px; border: 3px solid #e2e8f0; border-top-color: #0050e5; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 12px; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class ProductDeleteComponent implements OnInit {
  productId = '';
  product: any = null;
  orderCount = 0;
  canDelete = false;
  confirmationInput = '';
  isLoading = true;
  isSubmitting = false;
  errorMsg = '';
  currencySymbol = '$';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.productId = this.route.snapshot.paramMap.get('id') || '';
    this.loadProductDetails();
  }

  loadProductDetails(): void {
    this.isLoading = true;
    this.api.get<any>(`ProductsApi/${this.productId}`).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.product = res?.data?.product;
        this.orderCount = res?.data?.orderCount || 0;
        this.canDelete = res?.data?.canDelete === true;
        this.currencySymbol = res?.data?.currencySymbol || '$';
      },
      error: (err) => {
        this.isLoading = false;
        this.toast.error(err?.error?.message || 'Failed to load product.');
        this.router.navigate(['/products/console']);
      }
    });
  }

  isTitleMatched(): boolean {
    if (!this.product?.title) return false;
    return this.confirmationInput.trim().toLowerCase() === this.product.title.trim().toLowerCase();
  }

  onDisableProduct(): void {
    this.isSubmitting = true;
    this.api.put<any>(`ProductsApi/${this.productId}/disable`, {}).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.toast.success(`Product '${this.product.title}' has been disabled and archived.`);
        this.router.navigate(['/products/console']);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.toast.error(err?.error?.message || 'Failed to disable product.');
      }
    });
  }

  onConfirmDelete(): void {
    if (!this.isTitleMatched()) return;

    this.isSubmitting = true;
    this.errorMsg = '';

    this.api.delete<any>(`ProductsApi/${this.productId}`).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.toast.success(`Product '${this.product.title}' deleted successfully.`);
        this.router.navigate(['/products/console']);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMsg = err?.error?.message || 'Failed to delete product.';
      }
    });
  }
}
