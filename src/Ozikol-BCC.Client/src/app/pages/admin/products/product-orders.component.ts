import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent, PageHeaderButton } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-product-orders',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, PageHeaderComponent],
  template: `
    <div class="orders-page">
      <app-page-header
        eyebrow="COMMERCE STUDIO"
        icon="local_shipping"
        title="Customer Orders & Fulfillment"
        subtitle="Manage commercial purchases, software license delivery, consultation bookings, and shipment tracking."
        [buttons]="headerButtons"
      ></app-page-header>

      <!-- Status Filter Tabs -->
      <div class="filter-tabs">
        <button type="button" class="filter-tab" [class.active]="selectedStatus === null" (click)="filterByStatus(null)">
          <span>All Orders</span>
          <span class="count-pill">{{ totalCount }}</span>
        </button>
        <button type="button" class="filter-tab" [class.active]="selectedStatus === 0" (click)="filterByStatus(0)">
          <span>Pending</span>
        </button>
        <button type="button" class="filter-tab" [class.active]="selectedStatus === 1" (click)="filterByStatus(1)">
          <span>Processing</span>
        </button>
        <button type="button" class="filter-tab" [class.active]="selectedStatus === 2" (click)="filterByStatus(2)">
          <span>Completed</span>
        </button>
      </div>

      <!-- Orders Table -->
      <div class="table-container">
        <div *ngIf="isLoading" class="loading-state">
          <div class="spinner"></div>
          <span>Loading orders...</span>
        </div>

        <table *ngIf="!isLoading" class="data-table">
          <thead>
            <tr>
              <th>Order Number</th>
              <th>Customer</th>
              <th>Items Purchased</th>
              <th style="text-align: right;">Total Amount</th>
              <th style="text-align: center;">Payment</th>
              <th style="text-align: center;">Fulfillment</th>
              <th>Date</th>
              <th style="text-align: right; width: 100px;">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let ord of orders">
              <td>
                <span class="order-num-pill">#{{ ord.orderNumber }}</span>
              </td>
              <td>
                <strong>{{ ord.customerName }}</strong>
                <div class="customer-sub">{{ ord.customerEmail }}</div>
                <div *ngIf="ord.customerPhone" class="customer-sub">{{ ord.customerPhone }}</div>
              </td>
              <td>
                <div class="items-list">
                  <div *ngFor="let item of ord.items" class="order-item-chip">
                    <span class="item-qty">{{ item.quantity }}x</span>
                    <span class="item-name">{{ item.productTitle }}</span>
                    <span *ngIf="item.generatedLicenseKey" class="lic-tag" title="License Key Generated">🔑 License</span>
                  </div>
                </div>
              </td>
              <td style="text-align: right;">
                <span class="order-total">{{ currencySymbol }}{{ ord.totalAmount | number:'1.2-2' }}</span>
                <div class="pay-method">{{ ord.paymentMethod }}</div>
              </td>
              <td style="text-align: center;">
                <span class="status-pill" [ngClass]="ord.paymentStatus === 1 ? 'pay-paid' : 'pay-pending'">
                  {{ ord.paymentStatus === 1 ? 'Paid' : 'Pending' }}
                </span>
              </td>
              <td style="text-align: center;">
                <span class="status-pill" [ngClass]="'order-status-' + ord.orderStatus">
                  {{ getStatusName(ord.orderStatus) }}
                </span>
              </td>
              <td class="date-cell">{{ ord.createdAtUtc | date:'short' }}</td>
              <td style="text-align: right;">
                <a [routerLink]="['/products/console/orders/details', ord.id]" class="btn btn-outline btn-xs" title="View & Manage Order">
                  Update
                </a>
              </td>
            </tr>

            <tr *ngIf="orders.length === 0">
              <td colspan="8" class="empty-state">
                <span class="material-symbols-outlined empty-icon">shopping_cart</span>
                <p>No customer orders placed yet.</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .orders-page { display: flex; flex-direction: column; gap: 20px; width: 100%; }

    .filter-tabs { display: flex; gap: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px; }
    .filter-tab {
      display: flex; align-items: center; gap: 6px; padding: 10px 16px; border: none; background: transparent;
      font-size: 14px; font-weight: 500; color: #64748b; border-bottom: 2px solid transparent; cursor: pointer;
    }
    .filter-tab.active { color: #0050e5; border-bottom-color: #0050e5; font-weight: 600; }
    .count-pill { font-size: 11px; padding: 2px 7px; background: #e2e8f0; border-radius: 12px; }

    .table-container { background: #ffffff; border-radius: 10px; border: 1px solid #e2e8f0; overflow: hidden; }
    .data-table { width: 100%; border-collapse: collapse; text-align: left; }
    .data-table th { background: #f8fafc; padding: 12px 16px; font-size: 12px; font-weight: 600; color: #475569; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }
    .data-table td { padding: 14px 16px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #1e293b; vertical-align: middle; }

    .order-num-pill { font-family: monospace; font-weight: 700; color: #0050e5; background: rgba(0,80,229,0.06); padding: 3px 8px; border-radius: 4px; }
    .customer-sub { font-size: 11px; color: #64748b; }

    .items-list { display: flex; flex-direction: column; gap: 4px; }
    .order-item-chip { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; }
    .item-qty { font-weight: 700; color: #475569; }
    .lic-tag { font-size: 10px; background: #e0e7ff; color: #4338ca; padding: 1px 5px; border-radius: 4px; }

    .order-total { font-weight: 700; color: #0f172a; font-size: 14px; }
    .pay-method { font-size: 11px; color: #64748b; }

    .status-pill { padding: 3px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
    .pay-paid { background: #ecfdf5; color: #047857; }
    .pay-pending { background: #fffbeb; color: #b45309; }
    .order-status-0 { background: #fffbeb; color: #b45309; }
    .order-status-1 { background: #eff6ff; color: #1d4ed8; }
    .order-status-2 { background: #ecfdf5; color: #047857; }
    .order-status-3 { background: #fef2f2; color: #b91c1c; }

    .date-cell { font-size: 12px; color: #64748b; }
    .empty-state { text-align: center; padding: 48px; color: #64748b; }
    .empty-icon { font-size: 48px; color: #94a3b8; margin-bottom: 8px; }

    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(15,23,42,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;
    }
    .modal-card {
      background: #ffffff; border-radius: 12px; width: 100%; max-width: 480px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
      overflow: hidden; display: flex; flex-direction: column;
    }
    .modal-header {
      display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; background: #f8fafc; border-bottom: 1px solid #e2e8f0;
    }
    .modal-header h3 { margin: 0; font-size: 16px; font-weight: 700; color: #0f172a; }
    .btn-close { background: none; border: none; font-size: 16px; cursor: pointer; color: #64748b; }
    .modal-body { padding: 20px; display: flex; flex-direction: column; gap: 14px; }
    .modal-footer {
      display: flex; align-items: center; justify-content: flex-end; gap: 10px; padding: 14px 20px; background: #f8fafc; border-top: 1px solid #e2e8f0;
    }

    .form-group { margin-bottom: 0; }
    .form-label { display: block; font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 4px; }
    .form-control {
      width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; outline: none; box-sizing: border-box;
    }
    .font-mono { font-family: monospace; }
    .loading-state { text-align: center; padding: 48px; color: #64748b; }
    .spinner { width: 32px; height: 32px; border: 3px solid #e2e8f0; border-top-color: #0050e5; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 12px; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class ProductOrdersComponent implements OnInit {
  orders: any[] = [];
  totalCount = 0;
  selectedStatus: number | null = null;
  isLoading = true;
  editingOrder: any = null;
  currencySymbol = '$';

  headerButtons: PageHeaderButton[] = [
    {
      text: 'Products Catalog',
      icon: 'storefront',
      routerLink: '/products/console'
    },
    {
      text: 'Financial Ledger',
      icon: 'receipt_long',
      routerLink: '/products/console/transactions'
    }
  ];

  constructor(private api: ApiService, private toast: ToastService) {}

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.isLoading = true;
    let url = 'ProductsApi/orders?pageSize=50';
    if (this.selectedStatus !== null) url += `&status=${this.selectedStatus}`;

    this.api.get<any>(url).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.orders = res?.data?.items || [];
        this.totalCount = res?.data?.totalCount || 0;
        this.currencySymbol = res?.data?.currencySymbol || '$';
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  filterByStatus(status: number | null): void {
    this.selectedStatus = status;
    this.loadOrders();
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
}
