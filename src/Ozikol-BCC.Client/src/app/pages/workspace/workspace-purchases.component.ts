import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { PageHeaderComponent, PageHeaderButton } from '../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-workspace-purchases',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, PageHeaderComponent],
  template: `
    <div class="workspace-purchases-container">
      <app-page-header
        eyebrow="WORKSPACE PORTAL"
        icon="shopping_bag"
        title="My Purchases & Licenses"
        subtitle="Manage your invoice history, download files, and copy your software license keys."
        [buttons]="headerButtons"
      ></app-page-header>

      <!-- KPI Summary Cards -->
      <div class="metrics-grid" *ngIf="!isLoading && orders.length > 0">
        <div class="metric-card bg-primary-light">
          <div class="metric-icon-wrap bg-primary">
            <span class="material-symbols-outlined text-white">payments</span>
          </div>
          <div class="metric-content">
            <span class="metric-label">Total Invested</span>
            <h3 class="metric-value">{{ currencySymbol }}{{ totalSpend | number:'1.2-2' }}</h3>
          </div>
        </div>

        <div class="metric-card bg-success-light">
          <div class="metric-icon-wrap bg-success">
            <span class="material-symbols-outlined text-white">shopping_cart</span>
          </div>
          <div class="metric-content">
            <span class="metric-label">Orders Placed</span>
            <h3 class="metric-value">{{ orders.length }}</h3>
          </div>
        </div>

        <div class="metric-card bg-info-light">
          <div class="metric-icon-wrap bg-info">
            <span class="material-symbols-outlined text-white">vpn_key</span>
          </div>
          <div class="metric-content">
            <span class="metric-label">Active Licenses</span>
            <h3 class="metric-value">{{ activeLicensesCount }}</h3>
          </div>
        </div>
      </div>

      <div *ngIf="isLoading" class="loading-state">
        <div class="spinner"></div>
        <span>Loading purchase records...</span>
      </div>

      <!-- Main Purchases List -->
      <div *ngIf="!isLoading && orders.length > 0" class="orders-list-card m3-card">
        <div class="card-header">
          <h3 class="card-title">Order History</h3>
          <span class="badge-pill">{{ orders.length }} total</span>
        </div>

        <div class="orders-accordion">
          <div *ngFor="let order of orders; let idx = index" class="accordion-item" [class.expanded]="expandedIndex === idx">
            <!-- Header Row -->
            <div class="accordion-header" (click)="toggleExpand(idx)">
              <div class="order-headline">
                <span class="order-number">#{{ order.orderNumber }}</span>
                <span class="order-date">{{ order.createdAtUtc | date:'mediumDate' }}</span>
              </div>

              <div class="order-meta-summary">
                <span class="order-total">{{ currencySymbol }}{{ order.totalAmount | number:'1.2-2' }}</span>
                <span class="status-badge" [ngClass]="'status-' + order.orderStatus">
                  {{ getStatusName(order.orderStatus) }}
                </span>
                <span class="material-symbols-outlined arrow-icon">keyboard_arrow_down</span>
              </div>
            </div>

            <!-- Expanded Body -->
            <div class="accordion-body" *ngIf="expandedIndex === idx">
              <!-- Item Details Table -->
              <div class="table-responsive">
                <table class="items-table">
                  <thead>
                    <tr>
                      <th>Product / Deliverable</th>
                      <th>Archetype</th>
                      <th style="text-align: right;">Unit Price</th>
                      <th style="text-align: center;">Qty</th>
                      <th style="text-align: right;">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let item of order.items">
                      <td>
                        <div class="item-details-cell">
                          <strong>{{ item.productTitle }}</strong>
                          <div class="license-info-row" *ngIf="item.generatedLicenseKey">
                            <span class="license-badge">
                              <span class="material-symbols-outlined">vpn_key</span>
                              <code>{{ item.generatedLicenseKey }}</code>
                              <button type="button" (click)="copyLicense(item.generatedLicenseKey)" class="btn-copy" title="Copy License">
                                <span class="material-symbols-outlined">content_copy</span>
                              </button>
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span class="archetype-badge" [ngClass]="'arch-' + item.productType">
                          {{ getArchetypeName(item.productType) }}
                        </span>
                      </td>
                      <td style="text-align: right;">{{ currencySymbol }}{{ item.unitPrice | number:'1.2-2' }}</td>
                      <td style="text-align: center;">{{ item.quantity }}</td>
                      <td style="text-align: right;"><strong>{{ currencySymbol }}{{ (item.unitPrice * item.quantity) | number:'1.2-2' }}</strong></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Transaction Summary Footer -->
              <div class="order-summary-footer">
                <div class="summary-details">
                  <div class="detail-row">
                    <span>Payment Method:</span>
                    <strong>{{ order.paymentMethod || 'DirectGateway' }}</strong>
                  </div>
                  <div class="detail-row" *ngIf="order.paymentReference">
                    <span>Reference ID:</span>
                    <strong class="font-mono">{{ order.paymentReference }}</strong>
                  </div>
                  <div class="detail-row">
                    <span>Fulfillment Date:</span>
                    <strong>{{ order.fulfilledAtUtc ? (order.fulfilledAtUtc | date:'medium') : 'Processing' }}</strong>
                  </div>
                </div>

                <div class="order-pricing-box">
                  <div class="price-row">
                    <span>Subtotal:</span>
                    <span>{{ currencySymbol }}{{ order.subtotal | number:'1.2-2' }}</span>
                  </div>
                  <div class="price-row text-danger" *ngIf="order.discountAmount > 0">
                    <span>Discount:</span>
                    <span>-{{ currencySymbol }}{{ order.discountAmount | number:'1.2-2' }}</span>
                  </div>
                  <div class="price-row total-price-row">
                    <span>Paid Total:</span>
                    <span>{{ currencySymbol }}{{ order.totalAmount | number:'1.2-2' }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div *ngIf="!isLoading && orders.length === 0" class="empty-state-card m3-card">
        <span class="material-symbols-outlined empty-icon">shopping_bag</span>
        <h3>No Purchases Recorded</h3>
        <p>You have not made any storefront purchases, consultations, or software license orders yet.</p>
        <a routerLink="/store" class="btn btn-primary">
          <span class="material-symbols-outlined">storefront</span>
          <span>Browse Storefront Catalog</span>
        </a>
      </div>
    </div>
  `,
  styles: [`
    .workspace-purchases-container { display: flex; flex-direction: column; gap: 20px; width: 100%; }
    .loading-state { text-align: center; padding: 48px; color: #64748b; }
    .spinner { width: 32px; height: 32px; border: 3px solid #e2e8f0; border-top-color: #0050e5; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 12px; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Metrics Grid */
    .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; }
    .metric-card {
      display: flex; align-items: center; gap: 16px; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.02);
    }
    .metric-icon-wrap {
      width: 48px; height: 48px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .metric-content { display: flex; flex-direction: column; gap: 4px; }
    .metric-label { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.02em; }
    .metric-value { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0; }

    .bg-primary-light { background: #eff6ff; border-color: #bfdbfe; }
    .bg-success-light { background: #f0fdf4; border-color: #bbf7d0; }
    .bg-info-light { background: #f0f9ff; border-color: #bae6fd; }
    .bg-primary { background: #0050e5; }
    .bg-success { background: #10b981; }
    .bg-info { background: #0284c7; }
    .text-white { color: #ffffff; }

    /* Accordion List */
    .m3-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); overflow: hidden; }
    .card-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 24px; border-bottom: 1px solid #f1f5f9; background: #f8fafc; }
    .card-title { font-size: 14.5px; font-weight: 700; color: #0f172a; margin: 0; }
    .badge-pill { font-size: 11px; font-weight: 700; background: #e2e8f0; color: #475569; padding: 3px 8px; border-radius: 20px; }

    .orders-accordion { display: flex; flex-direction: column; }
    .accordion-item { border-bottom: 1px solid #f1f5f9; }
    .accordion-item:last-child { border-bottom: none; }
    
    .accordion-header {
      display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; cursor: pointer; background: #ffffff; transition: background 0.15s;
    }
    .accordion-header:hover { background: #f8fafc; }
    .accordion-item.expanded .accordion-header { background: #f1f5f9; border-bottom: 1px solid #e2e8f0; }

    .order-headline { display: flex; align-items: center; gap: 12px; }
    .order-number { font-weight: 700; color: #0050e5; font-size: 14px; }
    .order-date { font-size: 12.5px; color: #64748b; }

    .order-meta-summary { display: flex; align-items: center; gap: 16px; }
    .order-total { font-weight: 800; color: #0f172a; font-size: 14px; }
    .status-badge { font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 4px; text-transform: uppercase; }
    .status-0 { background: #fef3c7; color: #d97706; } /* Pending */
    .status-1 { background: #dbeafe; color: #2563eb; } /* Processing */
    .status-2 { background: #d1fae5; color: #059669; } /* Completed */
    .status-3 { background: #fee2e2; color: #dc2626; } /* Cancelled */
    .status-4 { background: #f1f5f9; color: #64748b; } /* Refunded */

    .arrow-icon { color: #94a3b8; transition: transform 0.2s; }
    .accordion-item.expanded .arrow-icon { transform: rotate(180deg); }

    /* Expanded accordion body */
    .accordion-body { padding: 24px; background: #fafbfc; border-top: 1px solid #f1f5f9; }
    .table-responsive { width: 100%; overflow-x: auto; margin-bottom: 20px; }
    
    .items-table { width: 100%; border-collapse: collapse; }
    .items-table th { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; padding: 8px 12px; border-bottom: 2px solid #cbd5e1; text-align: left; }
    .items-table td { padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; vertical-align: middle; }
    
    .item-details-cell { display: flex; flex-direction: column; gap: 6px; }
    .license-info-row { display: flex; align-items: center; gap: 8px; }
    .license-badge {
      display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; padding: 3px 8px; border-radius: 4px; font-family: monospace;
    }
    .license-badge span { font-size: 13px !important; }
    .btn-copy { background: transparent; border: none; padding: 0; color: #0284c7; cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .btn-copy:hover { color: #0369a1; }
    .btn-copy span { font-size: 13px !important; }

    .archetype-badge { font-size: 10.5px; font-weight: 700; padding: 2px 6px; border-radius: 4px; }
    .arch-0 { background: #e0f2fe; color: #0369a1; } /* Software */
    .arch-1 { background: #f3e8ff; color: #7e22ce; } /* Service */
    .arch-2 { background: #fdf2f8; color: #be185d; } /* Physical */
    .arch-3 { background: #ecfdf5; color: #047857; } /* Subscription */

    .order-summary-footer { display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 16px; gap: 24px; flex-wrap: wrap; }
    .summary-details { display: flex; flex-direction: column; gap: 6px; font-size: 12.5px; color: #475569; }
    .detail-row { display: flex; gap: 8px; }
    .detail-row span { color: #64748b; font-weight: 600; }
    .font-mono { font-family: monospace; }

    .order-pricing-box { display: flex; flex-direction: column; gap: 6px; width: 220px; }
    .price-row { display: flex; justify-content: space-between; font-size: 13px; color: #475569; }
    .total-price-row { border-top: 1px dashed #cbd5e1; padding-top: 6px; font-size: 14.5px; font-weight: 800; color: #0f172a; }

    /* Empty State */
    .empty-state-card { text-align: center; padding: 64px 32px; background: #ffffff; }
    .empty-icon { font-size: 48px !important; color: #cbd5e1; margin-bottom: 16px; }
    .empty-state-card h3 { font-size: 16px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 8px; }
    .empty-state-card p { font-size: 13.5px; color: #64748b; margin-top: 0; margin-bottom: 24px; max-width: 420px; margin-left: auto; margin-right: auto; line-height: 1.5; }
  `]
})
export class WorkspacePurchasesComponent implements OnInit {
  orders: any[] = [];
  isLoading = true;
  totalSpend = 0;
  activeLicensesCount = 0;
  currencySymbol = '$';
  expandedIndex = 0;
  headerButtons: PageHeaderButton[] = [];

  constructor(
    private api: ApiService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.headerButtons = [
      {
        text: 'Go to Storefront',
        icon: 'storefront',
        routerLink: '/store',
        isPrimary: true
      }
    ];
    this.loadMyPurchases();
  }

  loadMyPurchases(): void {
    this.isLoading = true;
    this.api.get<any>('ProductsApi/my-orders').subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res?.isSuccess) {
          this.orders = res.data.items || [];
          this.currencySymbol = res.data.currencySymbol || '$';
          this.calculateMetrics();
        } else {
          this.toast.error(res?.message || 'Failed to load purchase records.');
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.toast.error('An error occurred while loading your orders.');
        console.error(err);
      }
    });
  }

  calculateMetrics(): void {
    this.totalSpend = 0;
    this.activeLicensesCount = 0;

    this.orders.forEach(o => {
      // Aggregate total spent on completed/processing/pending orders (ignore cancelled/refunded for metrics)
      if (o.orderStatus !== 3 && o.orderStatus !== 4) {
        this.totalSpend += o.totalAmount;
      }
      
      // Count generated active license keys
      if (o.items) {
        o.items.forEach((item: any) => {
          if (item.generatedLicenseKey && o.orderStatus !== 4) {
            this.activeLicensesCount++;
          }
        });
      }
    });
  }

  toggleExpand(idx: number): void {
    this.expandedIndex = this.expandedIndex === idx ? -1 : idx;
  }

  getStatusName(status: number): string {
    switch (status) {
      case 0: return 'Pending';
      case 1: return 'Processing';
      case 2: return 'Completed';
      case 3: return 'Cancelled';
      case 4: return 'Refunded';
      default: return 'Pending';
    }
  }

  getArchetypeName(type: number): string {
    switch (type) {
      case 0: return 'Software';
      case 1: return 'Service';
      case 2: return 'Physical';
      case 3: return 'Subscription';
      default: return 'Product';
    }
  }

  copyLicense(key: string): void {
    navigator.clipboard.writeText(key).then(() => {
      this.toast.success('License key copied to clipboard.');
    });
  }
}
