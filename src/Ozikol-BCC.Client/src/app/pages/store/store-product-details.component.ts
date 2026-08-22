import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { CartService } from '../../core/services/cart.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-store-product-details',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="product-details-container">
      <!-- Breadcrumbs -->
      <nav class="breadcrumb-nav">
        <a routerLink="/store" class="crumb-link">Storefront</a>
        <span class="crumb-sep">/</span>
        <span *ngIf="product?.category" class="crumb-link">{{ product.category.title }}</span>
        <span *ngIf="product?.category" class="crumb-sep">/</span>
        <span class="current">{{ product?.title || 'Product Details' }}</span>
      </nav>

      <div *ngIf="isLoading" class="loading-state">
        <div class="spinner"></div>
        <span>Loading product details...</span>
      </div>

      <div *ngIf="!isLoading && product" class="details-grid">
        <!-- Media Column -->
        <div class="media-column">
          <div class="main-image-card">
            <img *ngIf="product.coverImageUrl" [src]="product.coverImageUrl" [alt]="product.title" class="product-cover" />
            <div *ngIf="!product.coverImageUrl" class="cover-placeholder">
              <span class="material-symbols-outlined">{{ getTypeIcon(product.type) }}</span>
            </div>
            <span class="type-badge" [ngClass]="'badge-' + product.type">{{ getTypeName(product.type) }}</span>
          </div>
        </div>

        <!-- Info Column -->
        <div class="info-column">
          <div class="category-eyebrow">{{ product.category?.title || 'General' }}</div>
          <h1 class="product-title">{{ product.title }}</h1>

          <div class="price-strip">
            <span class="main-price">{{ currencySymbol }}{{ product.price | number:'1.2-2' }}</span>
            <span *ngIf="product.compareAtPrice" class="compare-price">{{ currencySymbol }}{{ product.compareAtPrice | number:'1.2-2' }}</span>
            <span class="currency-tag">{{ currencyCode }}</span>
          </div>

          <p *ngIf="product.shortDescription" class="short-desc">{{ product.shortDescription }}</p>

          <!-- Specifications Box -->
          <div class="specs-card">
            <h3 class="specs-title">
              <span class="material-symbols-outlined">verified</span>
              <span>Included Specifications & Features</span>
            </h3>

            <!-- Software specs -->
            <div *ngIf="product.type === 0" class="spec-rows">
              <div *ngIf="product.versionTag" class="spec-item">
                <span class="spec-k">Version:</span>
                <span class="spec-v font-mono">{{ product.versionTag }}</span>
              </div>
              <div *ngIf="product.fileSize" class="spec-item">
                <span class="spec-k">Package Size:</span>
                <span class="spec-v">{{ product.fileSize }}</span>
              </div>
              <div *ngIf="product.requiresLicenseKey" class="spec-item">
                <span class="spec-k">Licensing:</span>
                <span class="spec-v text-blue">Unique License Key Issued on Purchase</span>
              </div>
            </div>

            <!-- Service specs -->
            <div *ngIf="product.type === 1" class="spec-rows">
              <div *ngIf="product.deliveryTimeframeDays" class="spec-item">
                <span class="spec-k">Delivery Turnaround:</span>
                <span class="spec-v">{{ product.deliveryTimeframeDays }} business days</span>
              </div>
              <div *ngIf="product.consultationDurationMinutes" class="spec-item">
                <span class="spec-k">Consultation Time:</span>
                <span class="spec-v">{{ product.consultationDurationMinutes }} minutes</span>
              </div>
              <div *ngIf="product.deliverablesSummary" class="spec-item">
                <span class="spec-k">Scope:</span>
                <span class="spec-v">{{ product.deliverablesSummary }}</span>
              </div>
            </div>

            <!-- Physical specs -->
            <div *ngIf="product.type === 2" class="spec-rows">
              <div *ngIf="product.stockQuantity !== null" class="spec-item">
                <span class="spec-k">Availability:</span>
                <span class="spec-v text-green">{{ product.stockQuantity }} in stock</span>
              </div>
              <div *ngIf="product.weightKg" class="spec-item">
                <span class="spec-k">Shipping Weight:</span>
                <span class="spec-v">{{ product.weightKg }} kg</span>
              </div>
            </div>

            <!-- Subscription specs -->
            <div *ngIf="product.type === 3" class="spec-rows">
              <div class="spec-item">
                <span class="spec-k">Billing Cycle:</span>
                <span class="spec-v">{{ product.billingInterval === 0 ? 'Monthly' : (product.billingInterval === 1 ? 'Quarterly' : 'Yearly') }}</span>
              </div>
              <div *ngIf="product.trialPeriodDays" class="spec-item">
                <span class="spec-k">Free Trial:</span>
                <span class="spec-v text-emerald">{{ product.trialPeriodDays }} days free</span>
              </div>
            </div>
          </div>

          <!-- Purchase Controls -->
          <div class="purchase-controls">
            <div class="quantity-picker">
              <button type="button" (click)="qty = Math.max(1, qty - 1)" class="qty-btn">-</button>
              <input type="number" [(ngModel)]="qty" min="1" class="qty-input" />
              <button type="button" (click)="qty = qty + 1" class="qty-btn">+</button>
            </div>

            <button type="button" (click)="onAddToCart()" class="btn-cart">
              <span class="material-symbols-outlined">shopping_cart</span>
              <span>Add to Cart</span>
            </button>

            <button type="button" (click)="onBuyNow()" class="btn-buy-now">
              <span>Buy Now</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Rich Description Section -->
      <section *ngIf="product?.fullDescription" class="rich-description-section">
        <h2 class="section-heading">Detailed Product Overview</h2>
        <div class="rich-html-body" [innerHTML]="product.fullDescription"></div>
      </section>
    </div>
  `,
  styles: [`
    .product-details-container { width: 100%; max-width: 1200px; margin: 0 auto; padding: 24px 20px; box-sizing: border-box; }

    .breadcrumb-nav { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #64748b; margin-bottom: 24px; }
    .crumb-link { color: #0050e5; text-decoration: none; }
    .crumb-link:hover { text-decoration: underline; }
    .crumb-sep { color: #cbd5e1; }
    .current { color: #1e293b; font-weight: 600; }

    .details-grid { display: grid; grid-template-columns: 460px 1fr; gap: 36px; margin-bottom: 40px; }
    @media (max-width: 900px) { .details-grid { grid-template-columns: 1fr; } }

    .main-image-card {
      background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; position: relative;
      height: 380px; display: flex; align-items: center; justify-content: center;
    }
    .product-cover { width: 100%; height: 100%; object-fit: cover; }
    .cover-placeholder { color: #94a3b8; font-size: 64px; }
    .cover-placeholder span { font-size: 80px; }

    .type-badge {
      position: absolute; top: 16px; left: 16px; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 6px;
      text-transform: uppercase; letter-spacing: 0.5px;
    }
    .badge-0 { background: #e0e7ff; color: #4338ca; }
    .badge-1 { background: #dcfce7; color: #15803d; }
    .badge-2 { background: #fef3c7; color: #b45309; }
    .badge-3 { background: #f3e8ff; color: #7e22ce; }

    .info-column { display: flex; flex-direction: column; }
    .category-eyebrow { font-size: 12px; font-weight: 700; color: #0050e5; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
    .product-title { font-size: 28px; font-weight: 800; color: #0f172a; margin: 0 0 14px; line-height: 1.25; }

    .price-strip { display: flex; align-items: baseline; gap: 10px; margin-bottom: 16px; }
    .main-price { font-size: 32px; font-weight: 800; color: #0f172a; }
    .compare-price { font-size: 18px; color: #94a3b8; text-decoration: line-through; }
    .currency-tag { font-size: 13px; font-weight: 600; color: #64748b; background: #f1f5f9; padding: 2px 8px; border-radius: 4px; }

    .short-desc { font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 20px; }

    .specs-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin-bottom: 24px; }
    .specs-title {
      display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 700; color: #1e293b; text-transform: uppercase;
      letter-spacing: 0.5px; margin: 0 0 12px;
    }
    .specs-title span { font-size: 18px; color: #0050e5; }
    .spec-rows { display: flex; flex-direction: column; gap: 8px; }
    .spec-item { display: flex; justify-content: space-between; font-size: 13px; padding-bottom: 6px; border-bottom: 1px dashed #e2e8f0; }
    .spec-item:last-child { border-bottom: none; padding-bottom: 0; }
    .spec-k { color: #64748b; font-weight: 500; }
    .spec-v { font-weight: 600; color: #0f172a; }
    .font-mono { font-family: monospace; }
    .text-blue { color: #0050e5; }
    .text-green { color: #16a34a; }
    .text-emerald { color: #059669; }

    .purchase-controls { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .quantity-picker { display: flex; align-items: center; border: 1px solid #cbd5e1; border-radius: 8px; background: #fff; }
    .qty-btn { width: 36px; height: 42px; border: none; background: transparent; font-size: 16px; cursor: pointer; color: #475569; }
    .qty-input { width: 44px; text-align: center; border: none; font-size: 15px; font-weight: 600; outline: none; }

    .btn-cart {
      flex: 1; min-width: 140px; display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      background: rgba(0,80,229,0.08); color: #0050e5; border: 1px solid rgba(0,80,229,0.25); height: 44px; border-radius: 8px;
      font-size: 15px; font-weight: 700; cursor: pointer; transition: all 0.2s;
    }
    .btn-cart:hover { background: #0050e5; color: #fff; }

    .btn-buy-now {
      flex: 1; min-width: 140px; background: #0050e5; color: #ffffff; border: none; height: 44px; border-radius: 8px;
      font-size: 15px; font-weight: 700; cursor: pointer; transition: background 0.2s;
    }
    .btn-buy-now:hover { background: #003ebd; }

    .rich-description-section {
      background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px; margin-top: 20px;
    }
    .section-heading { font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 18px; padding-bottom: 12px; border-bottom: 1px solid #e2e8f0; }
    .rich-html-body { font-size: 15px; line-height: 1.7; color: #334155; }

    .loading-state { text-align: center; padding: 64px; color: #64748b; }
    .spinner { width: 36px; height: 36px; border: 3px solid #e2e8f0; border-top-color: #0050e5; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 12px; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class StoreProductDetailsComponent implements OnInit {
  product: any = null;
  qty = 1;
  isLoading = true;
  currencySymbol = '$';
  currencyCode = 'USD';
  Math = Math;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private cartService: CartService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (slug) this.loadProduct(slug);
  }

  loadProduct(slug: string): void {
    this.isLoading = true;
    this.api.get<any>(`ProductsApi/public/${slug}`).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.product = res?.data?.product;
        this.currencySymbol = res?.data?.currencySymbol || '$';
        this.currencyCode = res?.data?.currencyCode || 'USD';
      },
      error: () => {
        this.isLoading = false;
        this.toast.error('Product not found.');
        this.router.navigate(['/store']);
      }
    });
  }

  onAddToCart(): void {
    if (!this.product) return;
    this.cartService.addItem(this.product, this.qty);
    this.toast.success(`Added ${this.qty} item(s) to cart.`);
  }

  onBuyNow(): void {
    if (!this.product) return;
    this.cartService.addItem(this.product, this.qty);
    this.router.navigate(['/store/checkout']);
  }

  getTypeName(type: number): string {
    switch (type) {
      case 0: return 'Software & Digital';
      case 1: return 'Service & Consulting';
      case 2: return 'Physical Goods';
      case 3: return 'Subscription Plan';
      default: return 'Commercial Item';
    }
  }

  getTypeIcon(type: number): string {
    switch (type) {
      case 0: return 'terminal';
      case 1: return 'handshake';
      case 2: return 'inventory_2';
      case 3: return 'autorenew';
      default: return 'category';
    }
  }
}
