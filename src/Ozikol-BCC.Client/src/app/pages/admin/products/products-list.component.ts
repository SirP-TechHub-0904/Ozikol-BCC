import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { PageHeaderComponent, PageHeaderButton } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-products-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, PageHeaderComponent],
  template: `
    <div class="products-page">
      <app-page-header
        eyebrow="COMMERCE STUDIO"
        icon="storefront"
        title="Products & Commercial Catalog"
        subtitle="Manage software downloads, digital licenses, professional services, physical merchandise, and recurring subscriptions."
        [buttons]="headerButtons"
      ></app-page-header>

      <!-- Type Filter Tabs -->
      <div class="filter-tabs">
        <button type="button" class="filter-tab" [class.active]="selectedType === null" (click)="filterByType(null)">
          <span class="material-symbols-outlined tab-icon">apps</span>
          <span>All Products</span>
          <span class="count-pill">{{ totalCount }}</span>
        </button>
        <button type="button" class="filter-tab" [class.active]="selectedType === 0" (click)="filterByType(0)">
          <span class="material-symbols-outlined tab-icon">terminal</span>
          <span>Software & Digital</span>
        </button>
        <button type="button" class="filter-tab" [class.active]="selectedType === 1" (click)="filterByType(1)">
          <span class="material-symbols-outlined tab-icon">handshake</span>
          <span>Services & Booking</span>
        </button>
        <button type="button" class="filter-tab" [class.active]="selectedType === 2" (click)="filterByType(2)">
          <span class="material-symbols-outlined tab-icon">inventory_2</span>
          <span>Physical Goods</span>
        </button>
        <button type="button" class="filter-tab" [class.active]="selectedType === 3" (click)="filterByType(3)">
          <span class="material-symbols-outlined tab-icon">autorenew</span>
          <span>Subscriptions</span>
        </button>
      </div>

      <!-- Search & Filters Toolbar -->
      <div class="toolbar-card">
        <div class="search-box">
          <span class="material-symbols-outlined search-icon">search</span>
          <input
            type="text"
            [(ngModel)]="searchQuery"
            (keyup.enter)="loadProducts()"
            placeholder="Search by title, SKU, description..."
            class="search-input"
          />
          <button *ngIf="searchQuery" (click)="searchQuery=''; loadProducts()" class="clear-search">✕</button>
        </div>

        <div class="toolbar-actions">
          <select [(ngModel)]="selectedCategory" (change)="loadProducts()" class="select-filter">
            <option [ngValue]="null">All Categories</option>
            <option *ngFor="let cat of categories" [ngValue]="cat.id">{{ cat.title }}</option>
          </select>

          <select [(ngModel)]="selectedStatus" (change)="loadProducts()" class="select-filter">
            <option [ngValue]="null">All Statuses</option>
            <option [ngValue]="1">Published</option>
            <option [ngValue]="0">Draft</option>
            <option [ngValue]="2">Scheduled</option>
            <option [ngValue]="3">Archived / Disabled</option>
          </select>

          <button type="button" class="btn btn-outline btn-sm" (click)="resetFilters()" title="Reset Filters">
            <span class="material-symbols-outlined">restart_alt</span>
            <span>Reset</span>
          </button>
        </div>
      </div>

      <!-- Products Data Table -->
      <div class="table-container">
        <div *ngIf="isLoading" class="loading-state">
          <div class="spinner"></div>
          <span>Loading catalog...</span>
        </div>

        <table *ngIf="!isLoading" class="data-table">
          <thead>
            <tr>
              <th style="width: 70px;">Media</th>
              <th>Product Details</th>
              <th>Archetype</th>
              <th>Category</th>
              <th style="text-align: right;">Price</th>
              <th style="text-align: center;">Inventory / Orders</th>
              <th style="text-align: center;">Status</th>
              <th style="text-align: right; width: 140px;">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let p of products" [class.archived-row]="p.publishStatus === 3">
              <!-- Thumbnail -->
              <td>
                <div class="thumb-box">
                  <img *ngIf="p.coverImageUrl" [src]="p.coverImageUrl" [alt]="p.title" class="thumb-img" />
                  <span *ngIf="!p.coverImageUrl" class="material-symbols-outlined thumb-placeholder">{{ getTypeIcon(p.type) }}</span>
                </div>
              </td>

              <!-- Title & SKU -->
              <td>
                <div class="product-title-row">
                  <a [routerLink]="['/products/console/edit', p.id]" class="product-title-link">
                    {{ p.title }}
                  </a>
                  <span *ngIf="p.isFeatured" class="badge-featured" title="Featured on Storefront">★ Featured</span>
                </div>
                <div class="product-subtext">
                  <span *ngIf="p.sku" class="sku-tag">SKU: {{ p.sku }}</span>
                  <span *ngIf="p.isScheduled" class="scheduled-tag">
                    <span class="material-symbols-outlined micro-icon">schedule</span>
                    Release: {{ p.scheduledReleaseUtc | date:'shortDate' }}
                  </span>
                </div>
              </td>

              <!-- Archetype Pill -->
              <td>
                <span class="type-pill" [ngClass]="'type-' + p.type">
                  <span class="material-symbols-outlined type-icon">{{ getTypeIcon(p.type) }}</span>
                  <span>{{ p.typeName }}</span>
                </span>
              </td>

              <!-- Category -->
              <td>
                <span class="cat-badge">{{ p.categoryTitle }}</span>
              </td>

              <!-- Price -->
              <td style="text-align: right;">
                <div class="price-val">{{ currencySymbol }}{{ p.price | number:'1.2-2' }}</div>
                <div *ngIf="p.compareAtPrice" class="compare-price">{{ currencySymbol }}{{ p.compareAtPrice | number:'1.2-2' }}</div>
              </td>

              <!-- Inventory & Orders -->
              <td style="text-align: center;">
                <div *ngIf="p.type === 2 && p.trackInventory" class="stock-indicator" [class.low-stock]="p.stockQuantity <= 5">
                  <span class="stock-qty">{{ p.stockQuantity }} in stock</span>
                </div>
                <div *ngIf="p.type !== 2 || !p.trackInventory" class="unlimited-stock">
                  <span>Unlimited</span>
                </div>
                <div class="orders-count">
                  <span class="material-symbols-outlined micro-icon">shopping_bag</span>
                  <span>{{ p.orderCount }} orders</span>
                </div>
              </td>

              <!-- Status -->
              <td style="text-align: center;">
                <span class="status-pill" [ngClass]="'status-' + p.publishStatus">
                  <span class="status-dot"></span>
                  <span>{{ p.statusName }}</span>
                </span>
              </td>

              <!-- Actions -->
              <td style="text-align: right;">
                <div class="actions-group">
                  <a [routerLink]="['/products/console/edit', p.id]" class="btn-action btn-edit" title="Edit Product">
                    <span class="material-symbols-outlined">edit</span>
                  </a>
                  <a [routerLink]="['/products/console/delete', p.id]" class="btn-action btn-delete" title="Delete Product">
                    <span class="material-symbols-outlined">delete</span>
                  </a>
                </div>
              </td>
            </tr>

            <tr *ngIf="products.length === 0">
              <td colspan="8" class="empty-state">
                <span class="material-symbols-outlined empty-icon">inventory_2</span>
                <h3>No products found</h3>
                <p>Add your first commercial product, service, software release, or subscription.</p>
                <a routerLink="/products/console/create" class="btn btn-primary btn-sm" style="margin-top:12px;">
                  <span class="material-symbols-outlined">add</span>
                  <span>Create Product</span>
                </a>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Pagination -->
        <div *ngIf="totalCount > pageSize" class="pagination-bar">
          <span>Showing {{ (page - 1) * pageSize + 1 }} to {{ Math.min(page * pageSize, totalCount) }} of {{ totalCount }} products</span>
          <div class="page-buttons">
            <button [disabled]="page === 1" (click)="setPage(page - 1)" class="btn btn-outline btn-xs">Previous</button>
            <span class="page-indicator">Page {{ page }}</span>
            <button [disabled]="page * pageSize >= totalCount" (click)="setPage(page + 1)" class="btn btn-outline btn-xs">Next</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .products-page { display: flex; flex-direction: column; gap: 20px; width: 100%; }
    
    .filter-tabs {
      display: flex; gap: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px; overflow-x: auto;
    }
    .filter-tab {
      display: flex; align-items: center; gap: 8px; padding: 10px 16px; border: none; background: transparent;
      font-size: 14px; font-weight: 500; color: #64748b; border-bottom: 2px solid transparent; cursor: pointer;
      transition: all 0.2s; border-radius: 6px 6px 0 0;
    }
    .filter-tab:hover { color: #0050e5; background: #f8fafc; }
    .filter-tab.active { color: #0050e5; border-bottom-color: #0050e5; font-weight: 600; background: rgba(0,80,229,0.04); }
    .tab-icon { font-size: 18px; }
    .count-pill { font-size: 11px; padding: 2px 7px; background: #e2e8f0; border-radius: 12px; color: #475569; }

    .toolbar-card {
      display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap;
      background: #ffffff; padding: 16px; border-radius: 10px; border: 1px solid #e2e8f0;
    }
    .search-box {
      display: flex; align-items: center; position: relative; flex: 1; min-width: 280px; max-width: 480px;
    }
    .search-icon { position: absolute; left: 12px; color: #94a3b8; font-size: 20px; pointer-events: none; }
    .search-input {
      width: 100%; padding: 9px 36px 9px 38px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; outline: none;
    }
    .search-input:focus { border-color: #0050e5; box-shadow: 0 0 0 3px rgba(0,80,229,0.12); }
    .clear-search { position: absolute; right: 10px; background: none; border: none; color: #94a3b8; cursor: pointer; }

    .toolbar-actions { display: flex; align-items: center; gap: 10px; }
    .select-filter { padding: 9px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; outline: none; background: #fff; }

    .table-container { background: #ffffff; border-radius: 10px; border: 1px solid #e2e8f0; overflow: hidden; }
    .data-table { width: 100%; border-collapse: collapse; text-align: left; }
    .data-table th { background: #f8fafc; padding: 12px 16px; font-size: 12px; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0; }
    .data-table td { padding: 14px 16px; border-bottom: 1px solid #f1f5f9; font-size: 14px; color: #1e293b; vertical-align: middle; }
    .data-table tr:hover { background: #f8fafc; }
    .archived-row { opacity: 0.65; background: #fafafa; }

    .thumb-box {
      width: 48px; height: 48px; border-radius: 8px; background: #f1f5f9; overflow: hidden; display: flex; align-items: center; justify-content: center;
    }
    .thumb-img { width: 100%; height: 100%; object-fit: cover; }
    .thumb-placeholder { color: #94a3b8; font-size: 24px; }

    .product-title-row { display: flex; align-items: center; gap: 8px; }
    .product-title-link { font-weight: 600; color: #0f172a; text-decoration: none; }
    .product-title-link:hover { color: #0050e5; text-decoration: underline; }
    .badge-featured { font-size: 10px; font-weight: 700; background: #fef3c7; color: #b45309; padding: 2px 6px; border-radius: 4px; }

    .product-subtext { display: flex; align-items: center; gap: 12px; font-size: 12px; color: #64748b; margin-top: 3px; }
    .sku-tag { font-family: monospace; background: #f1f5f9; padding: 1px 6px; border-radius: 4px; }
    .scheduled-tag { display: inline-flex; align-items: center; gap: 4px; color: #8b5cf6; }
    .micro-icon { font-size: 13px; }

    .type-pill {
      display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600;
    }
    .type-icon { font-size: 14px; }
    .type-0 { background: #e0e7ff; color: #4338ca; } /* Software */
    .type-1 { background: #dcfce7; color: #15803d; } /* Service */
    .type-2 { background: #fef3c7; color: #b45309; } /* Physical */
    .type-3 { background: #f3e8ff; color: #7e22ce; } /* Subscription */

    .cat-badge { font-size: 12px; color: #475569; background: #f8fafc; padding: 3px 8px; border-radius: 4px; border: 1px solid #e2e8f0; }

    .price-val { font-weight: 700; color: #0f172a; font-size: 14px; }
    .compare-price { font-size: 11px; color: #94a3b8; text-decoration: line-through; }

    .stock-indicator { font-size: 12px; font-weight: 600; color: #16a34a; }
    .stock-indicator.low-stock { color: #dc2626; }
    .unlimited-stock { font-size: 12px; color: #64748b; }
    .orders-count { font-size: 11px; color: #64748b; display: flex; align-items: center; justify-content: center; gap: 3px; margin-top: 3px; }

    .status-pill {
      display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600;
    }
    .status-dot { width: 6px; height: 6px; border-radius: 50%; }
    .status-1 { background: #ecfdf5; color: #047857; } .status-1 .status-dot { background: #10b981; } /* Published */
    .status-0 { background: #f1f5f9; color: #475569; } .status-0 .status-dot { background: #94a3b8; } /* Draft */
    .status-2 { background: #f5f3ff; color: #6d28d9; } .status-2 .status-dot { background: #8b5cf6; } /* Scheduled */
    .status-3 { background: #fef2f2; color: #b91c1c; } .status-3 .status-dot { background: #ef4444; } /* Archived */

    .actions-group { display: flex; align-items: center; justify-content: flex-end; gap: 6px; }
    .btn-action {
      display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 6px;
      color: #64748b; text-decoration: none; transition: all 0.15s; border: 1px solid #e2e8f0; background: #fff;
    }
    .btn-edit:hover { color: #0050e5; border-color: #0050e5; background: rgba(0,80,229,0.05); }
    .btn-delete:hover { color: #ef4444; border-color: #ef4444; background: #fef2f2; }

    .loading-state, .empty-state { text-align: center; padding: 48px 16px; color: #64748b; }
    .empty-icon { font-size: 48px; color: #94a3b8; margin-bottom: 8px; }
    .spinner { width: 32px; height: 32px; border: 3px solid #e2e8f0; border-top-color: #0050e5; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 12px; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .pagination-bar {
      display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #f8fafc;
      border-top: 1px solid #e2e8f0; font-size: 13px; color: #64748b;
    }
    .page-buttons { display: flex; align-items: center; gap: 8px; }
    .page-indicator { font-weight: 600; color: #334155; }
  `]
})
export class ProductsListComponent implements OnInit {
  products: any[] = [];
  categories: any[] = [];
  totalCount = 0;
  page = 1;
  pageSize = 15;
  searchQuery = '';
  selectedType: number | null = null;
  selectedCategory: string | null = null;
  selectedStatus: number | null = null;
  isLoading = false;
  currencyCode = 'USD';
  currencySymbol = '$';
  Math = Math;

  headerButtons: PageHeaderButton[] = [
    {
      text: 'New Product',
      icon: 'add',
      routerLink: '/products/console/create',
      isPrimary: true
    },
    {
      text: 'Categories',
      icon: 'category',
      routerLink: '/products/console/categories'
    },
    {
      text: 'Broadcast Studio',
      icon: 'campaign',
      routerLink: '/products/console/marketing'
    }
  ];

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadCategories();
    this.loadProducts();
  }

  loadCategories(): void {
    this.api.get<any>('ProductsApi/categories').subscribe({
      next: (res) => {
        this.categories = res?.data || [];
      }
    });
  }

  loadProducts(): void {
    this.isLoading = true;
    let url = `ProductsApi?page=${this.page}&pageSize=${this.pageSize}`;
    if (this.searchQuery) url += `&search=${encodeURIComponent(this.searchQuery.trim())}`;
    if (this.selectedType !== null) url += `&type=${this.selectedType}`;
    if (this.selectedCategory) url += `&categoryId=${this.selectedCategory}`;
    if (this.selectedStatus !== null) url += `&status=${this.selectedStatus}`;

    this.api.get<any>(url).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.products = res?.data?.items || [];
        this.totalCount = res?.data?.totalCount || 0;
        this.currencyCode = res?.data?.currencyCode || 'USD';
        this.currencySymbol = res?.data?.currencySymbol || '$';
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  filterByType(type: number | null): void {
    this.selectedType = type;
    this.page = 1;
    this.loadProducts();
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.selectedType = null;
    this.selectedCategory = null;
    this.selectedStatus = null;
    this.page = 1;
    this.loadProducts();
  }

  setPage(p: number): void {
    this.page = p;
    this.loadProducts();
  }

  getTypeIcon(type: number): string {
    switch (type) {
      case 0: return 'terminal'; // Software
      case 1: return 'handshake'; // Service
      case 2: return 'inventory_2'; // Physical
      case 3: return 'autorenew'; // Subscription
      default: return 'category';
    }
  }
}
