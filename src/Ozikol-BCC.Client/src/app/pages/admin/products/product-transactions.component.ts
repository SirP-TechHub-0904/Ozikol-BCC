import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { PageHeaderComponent, PageHeaderButton } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-product-transactions',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, PageHeaderComponent],
  template: `
    <div class="transactions-page">
      <app-page-header
        eyebrow="COMMERCE STUDIO"
        icon="account_balance_wallet"
        title="Commerce Financial Ledger"
        subtitle="Centralized financial ledger records, commercial revenue, and payment receipts filtered specifically for Product & Store operations."
        [buttons]="headerButtons"
      ></app-page-header>

      <!-- Revenue Summary Cards -->
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-icon-box icon-emerald">
            <span class="material-symbols-outlined">payments</span>
          </div>
          <div>
            <span class="metric-lbl">Total Commercial Revenue</span>
            <div class="metric-val">{{ currencySymbol }}{{ totalRevenue | number:'1.2-2' }}</div>
            <span class="metric-sub">{{ currencyCode }} Verified Collections</span>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon-box icon-blue">
            <span class="material-symbols-outlined">receipt_long</span>
          </div>
          <div>
            <span class="metric-lbl">Total Transactions</span>
            <div class="metric-val">{{ totalCount }}</div>
            <span class="metric-sub">Ledger Entries (Feature: ProductCatalog)</span>
          </div>
        </div>
      </div>

      <!-- Transactions Data Table -->
      <div class="table-container">
        <div *ngIf="isLoading" class="loading-state">
          <div class="spinner"></div>
          <span>Loading ledger records...</span>
        </div>

        <table *ngIf="!isLoading" class="data-table">
          <thead>
            <tr>
              <th>Reference / Order</th>
              <th>Customer / Payer</th>
              <th style="text-align: right;">Amount</th>
              <th>Payment Gateway</th>
              <th style="text-align: center;">Status</th>
              <th>Date Recorded</th>
              <th>Ledger Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let tx of transactions">
              <td>
                <span class="ref-pill">#{{ tx.transactionReference || 'TXN-' + tx.id?.substring(0,8) }}</span>
              </td>
              <td>
                <strong>{{ tx.donorName || 'Registered Customer' }}</strong>
                <div *ngIf="tx.donorEmail" class="email-sub">{{ tx.donorEmail }}</div>
              </td>
              <td style="text-align: right;">
                <span class="amount-val">{{ currencySymbol }}{{ tx.amount | number:'1.2-2' }}</span>
              </td>
              <td>
                <span class="provider-badge">{{ tx.paymentProvider || 'Direct / Manual' }}</span>
              </td>
              <td style="text-align: center;">
                <span class="status-pill" [class.success]="tx.status === 1" [class.pending]="tx.status === 0" [class.failed]="tx.status === 2">
                  {{ tx.status === 1 ? 'Success' : (tx.status === 0 ? 'Pending' : 'Failed') }}
                </span>
              </td>
              <td class="date-cell">{{ tx.createdAt | date:'medium' }}</td>
              <td class="notes-cell">{{ tx.notes || 'Commerce order purchase.' }}</td>
            </tr>

            <tr *ngIf="transactions.length === 0">
              <td colspan="7" class="empty-state">
                <span class="material-symbols-outlined empty-icon">receipt_long</span>
                <p>No commercial transactions recorded in the central ledger yet.</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .transactions-page { display: flex; flex-direction: column; gap: 20px; width: 100%; }

    .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
    .metric-card {
      background: #ffffff; padding: 20px; border-radius: 10px; border: 1px solid #e2e8f0;
      display: flex; align-items: center; gap: 16px;
    }
    .metric-icon-box {
      width: 52px; height: 52px; border-radius: 10px; display: flex; align-items: center; justify-content: center;
    }
    .metric-icon-box span { font-size: 28px; }
    .icon-emerald { background: #ecfdf5; color: #059669; }
    .icon-blue { background: #eff6ff; color: #0050e5; }
    .metric-lbl { display: block; font-size: 12px; font-weight: 600; color: #64748b; }
    .metric-val { font-size: 22px; font-weight: 700; color: #0f172a; margin: 2px 0; }
    .metric-sub { font-size: 11px; color: #94a3b8; }

    .table-container { background: #ffffff; border-radius: 10px; border: 1px solid #e2e8f0; overflow: hidden; }
    .data-table { width: 100%; border-collapse: collapse; text-align: left; }
    .data-table th { background: #f8fafc; padding: 12px 16px; font-size: 12px; font-weight: 600; color: #475569; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }
    .data-table td { padding: 14px 16px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #1e293b; vertical-align: middle; }

    .ref-pill { font-family: monospace; font-weight: 700; color: #0050e5; background: rgba(0,80,229,0.06); padding: 3px 8px; border-radius: 4px; }
    .email-sub { font-size: 11px; color: #64748b; }
    .amount-val { font-size: 14px; font-weight: 700; color: #0f172a; }
    .provider-badge { font-size: 12px; background: #f1f5f9; padding: 2px 8px; border-radius: 4px; color: #475569; }

    .status-pill { padding: 3px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; background: #f1f5f9; color: #475569; }
    .status-pill.success { background: #ecfdf5; color: #047857; }
    .status-pill.pending { background: #fffbeb; color: #b45309; }
    .status-pill.failed { background: #fef2f2; color: #b91c1c; }

    .date-cell { font-size: 12px; color: #64748b; }
    .notes-cell { font-size: 12px; color: #64748b; max-width: 200px; }
    .empty-state { text-align: center; padding: 48px; color: #64748b; }
    .empty-icon { font-size: 48px; color: #94a3b8; margin-bottom: 8px; }

    .loading-state { text-align: center; padding: 48px; color: #64748b; }
    .spinner { width: 32px; height: 32px; border: 3px solid #e2e8f0; border-top-color: #0050e5; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 12px; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class ProductTransactionsComponent implements OnInit {
  transactions: any[] = [];
  totalCount = 0;
  totalRevenue = 0;
  isLoading = true;
  currencyCode = 'USD';
  currencySymbol = '$';

  headerButtons: PageHeaderButton[] = [
    {
      text: 'Orders & Fulfillment',
      icon: 'local_shipping',
      routerLink: '/products/console/orders'
    },
    {
      text: 'Products Catalog',
      icon: 'arrow_back',
      routerLink: '/products/console'
    }
  ];

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadTransactions();
  }

  loadTransactions(): void {
    this.isLoading = true;
    this.api.get<any>('ProductsApi/transactions?pageSize=50').subscribe({
      next: (res) => {
        this.isLoading = false;
        this.transactions = res?.data?.items || [];
        this.totalCount = res?.data?.totalCount || 0;
        this.totalRevenue = res?.data?.totalRevenue || 0;
        this.currencyCode = res?.data?.currencyCode || 'USD';
        this.currencySymbol = res?.data?.currencySymbol || '$';
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }
}
