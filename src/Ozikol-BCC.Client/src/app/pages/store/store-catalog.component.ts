import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { CartService } from '../../core/services/cart.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-store-catalog',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="store-container">
      <!-- Store Hero Banner -->
      <header class="store-hero">
        <div class="hero-content">
          <span class="hero-eyebrow">COMMERCIAL STOREFRONT & CATALOG</span>
          <h1 class="hero-title">Explore Commercial Products, Services & Software</h1>
          <p class="hero-subtitle">Instant digital downloads, expert consulting sessions, physical goods, and membership subscriptions.</p>
          
          <div class="hero-search-box">
            <span class="material-symbols-outlined search-icon">search</span>
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (keyup.enter)="loadCatalog()"
              placeholder="Search catalog by title, keyword, or features..."
              class="hero-search-input"
            />
            <button (click)="loadCatalog()" class="hero-search-btn">Search</button>
          </div>
        </div>

        <div class="cart-floating-btn" [routerLink]="['/store/cart']" title="View Shopping Cart">
          <span class="material-symbols-outlined">shopping_cart</span>
          <span class="cart-count-badge">{{ cartService.getItemCount() }}</span>
        </div>
      </header>

      <!-- Archetype Navigation Tabs -->
      <nav class="archetype-nav">
        <button type="button" class="arch-tab" [class.active]="selectedType === null" (click)="filterByType(null)">
          <span class="material-symbols-outlined">apps</span>
          <span>All Items ({{ totalCount }})</span>
        </button>
        <button type="button" class="arch-tab" [class.active]="selectedType === 0" (click)="filterByType(0)">
          <span class="material-symbols-outlined">terminal</span>
          <span>Software & Digital</span>
        </button>
        <button type="button" class="arch-tab" [class.active]="selectedType === 1" (click)="filterByType(1)">
          <span class="material-symbols-outlined">handshake</span>
          <span>Consulting & Services</span>
        </button>
        <button type="button" class="arch-tab" [class.active]="selectedType === 2" (click)="filterByType(2)">
          <span class="material-symbols-outlined">inventory_2</span>
          <span>Physical Products</span>
        </button>
        <button type="button" class="arch-tab" [class.active]="selectedType === 3" (click)="filterByType(3)">
          <span class="material-symbols-outlined">autorenew</span>
          <span>Subscriptions</span>
        </button>
      </nav>

      <!-- Main Catalog Grid -->
      <main class="catalog-content">
        <div *ngIf="isLoading" class="loading-state">
          <div class="spinner"></div>
          <span>Loading storefront catalog...</span>
        </div>

        <div *ngIf="!isLoading && products.length > 0" class="products-grid">
          <div *ngFor="let p of products" class="product-card">
            <!-- Cover / Badge -->
            <div class="card-media" [routerLink]="['/store/product', p.slug]">
              <img *ngIf="p.coverImageUrl" [src]="p.coverImageUrl" [alt]="p.title" class="card-img" />
              <div *ngIf="!p.coverImageUrl" class="card-placeholder">
                <span class="material-symbols-outlined">{{ getTypeIcon(p.type) }}</span>
              </div>
              <span class="type-tag" [ngClass]="'tag-' + p.type">{{ p.typeName }}</span>
              <span *ngIf="p.isFeatured" class="featured-badge">★ Featured</span>
            </div>

            <!-- Card Info -->
            <div class="card-body">
              <div class="category-name">{{ p.categoryTitle }}</div>
              <h3 class="card-title">
                <a [routerLink]="['/store/product', p.slug]">{{ p.title }}</a>
              </h3>
              <p *ngIf="p.shortDescription" class="card-desc">{{ p.shortDescription }}</p>

              <div class="card-footer">
                <div class="price-wrap">
                  <span class="current-price">{{ currencySymbol }}{{ p.price | number:'1.2-2' }}</span>
                  <span *ngIf="p.compareAtPrice" class="compare-price">{{ currencySymbol }}{{ p.compareAtPrice | number:'1.2-2' }}</span>
                </div>

                <button type="button" (click)="addToCart(p)" class="btn-add-cart" title="Add to Cart">
                  <span class="material-symbols-outlined">add_shopping_cart</span>
                  <span>Add</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div *ngIf="!isLoading && products.length === 0" class="empty-state">
          <span class="material-symbols-outlined empty-icon">storefront</span>
          <h3>No matching products found</h3>
          <p>Try clearing your search query or selecting another product category.</p>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .store-container { width: 100%; max-width: 1300px; margin: 0 auto; padding: 24px 20px; box-sizing: border-box; }

    .store-hero {
      background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0050e5 100%);
      color: #ffffff; border-radius: 16px; padding: 48px 32px; margin-bottom: 28px; position: relative; overflow: hidden;
    }
    .hero-eyebrow { font-size: 11px; font-weight: 700; letter-spacing: 1.5px; color: #38bdf8; text-transform: uppercase; }
    .hero-title { font-size: 32px; font-weight: 800; margin: 10px 0 8px; line-height: 1.2; }
    .hero-subtitle { font-size: 15px; color: #cbd5e1; max-width: 680px; margin: 0 0 24px; line-height: 1.5; }

    .hero-search-box {
      display: flex; align-items: center; background: #ffffff; border-radius: 10px; max-width: 580px; padding: 4px 6px 4px 14px;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.2);
    }
    .search-icon { color: #64748b; font-size: 22px; margin-right: 8px; }
    .hero-search-input { flex: 1; border: none; font-size: 15px; outline: none; color: #0f172a; padding: 8px 0; }
    .hero-search-btn {
      background: #0050e5; color: #ffffff; border: none; border-radius: 8px; padding: 10px 20px; font-weight: 600; font-size: 14px; cursor: pointer;
    }
    .hero-search-btn:hover { background: #003ebd; }

    .cart-floating-btn {
      position: absolute; top: 32px; right: 32px; background: rgba(255,255,255,0.15); backdrop-filter: blur(8px);
      border: 1px solid rgba(255,255,255,0.25); color: #fff; width: 48px; height: 48px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center; cursor: pointer; transition: transform 0.2s;
    }
    .cart-floating-btn:hover { transform: scale(1.08); background: rgba(255,255,255,0.25); }
    .cart-count-badge {
      position: absolute; top: -4px; right: -4px; background: #ef4444; color: #fff; font-size: 11px; font-weight: 700;
      border-radius: 10px; padding: 2px 6px;
    }

    .archetype-nav {
      display: flex; gap: 10px; margin-bottom: 24px; overflow-x: auto; padding-bottom: 4px;
    }
    .arch-tab {
      display: flex; align-items: center; gap: 8px; padding: 10px 18px; border: 1px solid #cbd5e1; border-radius: 24px;
      background: #ffffff; font-size: 14px; font-weight: 600; color: #475569; cursor: pointer; transition: all 0.2s; white-space: nowrap;
    }
    .arch-tab:hover { border-color: #0050e5; color: #0050e5; }
    .arch-tab.active { background: #0050e5; color: #ffffff; border-color: #0050e5; }

    .products-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px;
    }
    .product-card {
      background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; display: flex; flex-direction: column;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .product-card:hover { transform: translateY(-4px); box-shadow: 0 12px 20px -5px rgba(0,0,0,0.08); border-color: #cbd5e1; }

    .card-media {
      height: 180px; position: relative; background: #f8fafc; overflow: hidden; cursor: pointer;
    }
    .card-img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s; }
    .product-card:hover .card-img { transform: scale(1.04); }
    .card-placeholder {
      width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #94a3b8;
    }
    .card-placeholder span { font-size: 48px; }

    .type-tag {
      position: absolute; top: 12px; left: 12px; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 4px;
      text-transform: uppercase; letter-spacing: 0.5px;
    }
    .tag-0 { background: #e0e7ff; color: #4338ca; } /* Software */
    .tag-1 { background: #dcfce7; color: #15803d; } /* Service */
    .tag-2 { background: #fef3c7; color: #b45309; } /* Physical */
    .tag-3 { background: #f3e8ff; color: #7e22ce; } /* Subscription */
    .featured-badge { position: absolute; top: 12px; right: 12px; font-size: 10px; font-weight: 700; background: #fef3c7; color: #b45309; padding: 3px 8px; border-radius: 4px; }

    .card-body { padding: 16px; display: flex; flex-direction: column; flex: 1; }
    .category-name { font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
    .card-title { margin: 0 0 6px; font-size: 16px; font-weight: 700; line-height: 1.3; }
    .card-title a { color: #0f172a; text-decoration: none; }
    .card-title a:hover { color: #0050e5; }
    .card-desc { font-size: 13px; color: #64748b; margin: 0 0 16px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

    .card-footer {
      display: flex; align-items: center; justify-content: space-between; margin-top: auto; padding-top: 12px; border-top: 1px solid #f1f5f9;
    }
    .current-price { font-size: 18px; font-weight: 800; color: #0f172a; }
    .compare-price { font-size: 12px; color: #94a3b8; text-decoration: line-through; margin-left: 6px; }

    .btn-add-cart {
      display: inline-flex; align-items: center; gap: 6px; background: rgba(0,80,229,0.08); color: #0050e5; border: 1px solid rgba(0,80,229,0.2);
      padding: 8px 14px; border-radius: 8px; font-weight: 600; font-size: 13px; cursor: pointer; transition: all 0.2s;
    }
    .btn-add-cart:hover { background: #0050e5; color: #ffffff; border-color: #0050e5; }
    .btn-add-cart span { font-size: 16px; }

    .loading-state, .empty-state { text-align: center; padding: 64px 16px; color: #64748b; }
    .empty-icon { font-size: 64px; color: #94a3b8; margin-bottom: 12px; }
    .spinner { width: 36px; height: 36px; border: 3px solid #e2e8f0; border-top-color: #0050e5; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 12px; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class StoreCatalogComponent implements OnInit {
  products: any[] = [];
  totalCount = 0;
  searchQuery = '';
  selectedType: number | null = null;
  isLoading = true;
  currencySymbol = '$';
  currencyCode = 'USD';

  constructor(
    private api: ApiService,
    public cartService: CartService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.loadCatalog();
  }

  loadCatalog(): void {
    this.isLoading = true;
    let url = 'ProductsApi/public/catalog?pageSize=48';
    if (this.searchQuery) url += `&search=${encodeURIComponent(this.searchQuery.trim())}`;
    if (this.selectedType !== null) url += `&type=${this.selectedType}`;

    this.api.get<any>(url).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.products = res?.data?.items || [];
        this.totalCount = res?.data?.totalCount || 0;
        this.currencySymbol = res?.data?.currencySymbol || '$';
        this.currencyCode = res?.data?.currencyCode || 'USD';
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  filterByType(type: number | null): void {
    this.selectedType = type;
    this.loadCatalog();
  }

  addToCart(product: any): void {
    this.cartService.addItem(product, 1);
    this.toast.success(`"${product.title}" added to cart.`);
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
