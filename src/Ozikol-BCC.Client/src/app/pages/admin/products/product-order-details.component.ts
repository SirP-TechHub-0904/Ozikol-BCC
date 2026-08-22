import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent, PageHeaderButton } from '../../../shared/components/page-header/page-header.component';

interface AdminNote {
  author: string;
  timestamp: string;
  text: string;
}

@Component({
  selector: 'app-product-order-details',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, PageHeaderComponent],
  template: `
    <div class="order-details-page">
      <app-page-header
        eyebrow="COMMERCE STUDIO"
        icon="receipt_long"
        [title]="order ? 'Order Details: #' + order.orderNumber : 'Loading Order Details...'"
        subtitle="Manage buyer credentials, product fulfillment, internal review notes, and refund processes."
        [buttons]="headerButtons"
      ></app-page-header>

      <div *ngIf="isLoading" class="loading-state">
        <div class="spinner"></div>
        <span>Fetching order details...</span>
      </div>

      <div *ngIf="!isLoading && order" class="details-layout">
        <!-- Main Column (Left) -->
        <div class="details-main">
          <!-- Buyer Info Card -->
          <div class="m3-card card-padding">
            <h3 class="card-title">
              <span class="material-symbols-outlined icon-blue">person</span>
              <span>Buyer Information</span>
            </h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Full Name</span>
                <span class="info-value">{{ order.customerName }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Email Address</span>
                <span class="info-value">{{ order.customerEmail }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Phone Number</span>
                <span class="info-value">{{ order.customerPhone || 'N/A' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Order Reference ID</span>
                <span class="info-value font-mono">{{ order.id }}</span>
              </div>
            </div>

            <!-- Shipping Address -->
            <div class="shipping-details" *ngIf="hasShippingAddress()">
              <h4 class="sub-title">Shipping Address</h4>
              <p class="address-paragraph">
                {{ order.shippingAddressLine1 }}<br />
                <span *ngIf="order.shippingAddressLine2">{{ order.shippingAddressLine2 }}<br /></span>
                {{ order.shippingCity }}, {{ order.shippingState }} {{ order.shippingPostalCode }}<br />
                <strong>{{ order.shippingCountry }}</strong>
              </p>
            </div>
            <div class="shipping-details" *ngIf="!hasShippingAddress()">
              <h4 class="sub-title">Delivery Method</h4>
              <p class="address-paragraph text-muted">
                Digital Delivery / Instant Download Fulfillment. No physical shipping address required.
              </p>
            </div>
          </div>

          <!-- Products Purchased Card -->
          <div class="m3-card card-padding">
            <h3 class="card-title">
              <span class="material-symbols-outlined icon-green">shopping_bag</span>
              <span>Items Purchased</span>
            </h3>
            <div class="table-responsive">
              <table class="items-table">
                <thead>
                  <tr>
                    <th>Product Title</th>
                    <th style="text-align: right;">Unit Price</th>
                    <th style="text-align: center;">Quantity</th>
                    <th style="text-align: right;">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let item of order.items">
                    <td>
                      <div class="product-info-cell">
                        <strong>{{ item.productTitle }}</strong>
                        <div class="product-meta-row">
                          <span class="badge-tag">{{ item.versionTag || 'v1.0' }}</span>
                          <span *ngIf="item.generatedLicenseKey" class="badge-tag license-pill">
                            <span class="material-symbols-outlined font-sm">vpn_key</span>
                            <code>{{ item.generatedLicenseKey }}</code>
                            <button type="button" (click)="copyLicense(item.generatedLicenseKey)" class="btn-copy" title="Copy License">
                              <span class="material-symbols-outlined">content_copy</span>
                            </button>
                          </span>
                        </div>
                      </div>
                    </td>
                    <td style="text-align: right;">{{ currencySymbol }}{{ item.unitPrice | number:'1.2-2' }}</td>
                    <td style="text-align: center;">{{ item.quantity }}</td>
                    <td style="text-align: right;"><strong>{{ currencySymbol }}{{ (item.unitPrice * item.quantity) | number:'1.2-2' }}</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Price Breakdown -->
            <div class="price-breakdown">
              <div class="breakdown-row">
                <span>Subtotal</span>
                <span>{{ currencySymbol }}{{ order.subtotal | number:'1.2-2' }}</span>
              </div>
              <div class="breakdown-row" *ngIf="order.discountAmount > 0">
                <span>Discount</span>
                <span class="text-danger">-{{ currencySymbol }}{{ order.discountAmount | number:'1.2-2' }}</span>
              </div>
              <div class="breakdown-row" *ngIf="order.shippingFee > 0">
                <span>Shipping Fee</span>
                <span>{{ currencySymbol }}{{ order.shippingFee | number:'1.2-2' }}</span>
              </div>
              <div class="breakdown-row" *ngIf="order.taxAmount > 0">
                <span>Estimated Tax</span>
                <span>{{ currencySymbol }}{{ order.taxAmount | number:'1.2-2' }}</span>
              </div>
              <div class="breakdown-row total-row">
                <span>Grand Total</span>
                <span>{{ currencySymbol }}{{ order.totalAmount | number:'1.2-2' }}</span>
              </div>
            </div>
          </div>

          <!-- Internal Admin Notes / Reviews Timeline -->
          <div class="m3-card card-padding">
            <h3 class="card-title">
              <span class="material-symbols-outlined icon-purple">rate_review</span>
              <span>Internal Admin Notes & Reviews</span>
            </h3>

            <!-- Timeline of past notes -->
            <div class="notes-timeline" *ngIf="adminNotesList.length > 0">
              <div class="timeline-item" *ngFor="let note of adminNotesList">
                <div class="timeline-header">
                  <span class="note-author">{{ note.author }}</span>
                  <span class="note-time">{{ note.timestamp | date:'short' }}</span>
                </div>
                <p class="note-text">{{ note.text }}</p>
              </div>
            </div>
            <div class="notes-empty" *ngIf="adminNotesList.length === 0">
              <p>No admin notes or internal reviews logged for this order yet.</p>
            </div>

            <!-- Add new note -->
            <div class="add-note-box">
              <label class="form-label">Add Note / Status Review</label>
              <textarea
                [(ngModel)]="newNoteText"
                placeholder="Type internal comment, verification notes, or customer communication logs..."
                class="form-control"
                rows="3"
              ></textarea>
              <button
                type="button"
                (click)="addAdminNote()"
                [disabled]="!newNoteText.trim()"
                class="btn btn-outline btn-sm"
                style="margin-top: 10px;"
              >
                <span class="material-symbols-outlined">add_comment</span>
                <span>Add Log Note</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Sidebar Column (Right) -->
        <div class="details-sidebar">
          <!-- Status & Order Actions Card -->
          <div class="m3-card card-padding">
            <h3 class="card-title">
              <span class="material-symbols-outlined icon-amber">settings</span>
              <span>Fulfillment & Status</span>
            </h3>

            <div class="form-group">
              <label class="form-label">Fulfillment Status</label>
              <select [(ngModel)]="order.orderStatus" class="form-control">
                <option [ngValue]="0">Pending</option>
                <option [ngValue]="1">Processing / Dispatched</option>
                <option [ngValue]="2">Completed / Delivered</option>
                <option [ngValue]="3">Cancelled</option>
                <option [ngValue]="4">Refunded</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Payment Status</label>
              <select [(ngModel)]="order.paymentStatus" class="form-control">
                <option [ngValue]="0">Pending</option>
                <option [ngValue]="1">Paid / Success</option>
                <option [ngValue]="2">Failed</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Courier Name</label>
              <input type="text" [(ngModel)]="order.courierName" placeholder="e.g. DHL Express, FedEx" class="form-control" />
            </div>

            <div class="form-group">
              <label class="form-label">Tracking Number</label>
              <input type="text" [(ngModel)]="order.trackingNumber" placeholder="e.g. TRK93850123" class="form-control" />
            </div>

            <div class="info-item" style="margin-top: 14px;">
              <span class="info-label">Payment Method</span>
              <span class="info-value font-mono">{{ order.paymentMethod || 'DirectGateway' }}</span>
            </div>
            <div class="info-item" *ngIf="order.paymentReference">
              <span class="info-label">Payment Reference</span>
              <span class="info-value font-mono">{{ order.paymentReference }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Checkout Date</span>
              <span class="info-value">{{ order.createdAtUtc | date:'medium' }}</span>
            </div>
          </div>

          <!-- Refund Actions Card -->
          <div class="m3-card card-padding refund-card" *ngIf="order.orderStatus !== 4">
            <h3 class="card-title">
              <span class="material-symbols-outlined icon-red">monetization_on</span>
              <span>Financial Refund Action</span>
            </h3>
            <p class="refund-warning">
              Refunding will set the order status to <strong>Refunded</strong>, record a negative transaction amount in the Central Financial Ledger, and update order items. This action is final.
            </p>
            <button type="button" (click)="triggerRefund()" class="btn btn-danger btn-block">
              <span class="material-symbols-outlined">undo</span>
              <span>Process Full Refund</span>
            </button>
          </div>

          <div class="m3-card card-padding refund-card refunded-state" *ngIf="order.orderStatus === 4">
            <h3 class="card-title">
              <span class="material-symbols-outlined icon-red">check_circle</span>
              <span>Refund Processed</span>
            </h3>
            <p class="refund-warning">
              This order has been fully refunded. A reverse transaction was successfully enqueued in the central ledger.
            </p>
          </div>

          <!-- Page Save Actions -->
          <div class="save-actions">
            <button type="button" (click)="onSaveChanges()" [disabled]="isSaving" class="btn btn-primary btn-block btn-lg">
              <span class="material-symbols-outlined">save</span>
              <span>{{ isSaving ? 'Saving Changes...' : 'Save Order Changes' }}</span>
            </button>
            <a routerLink="/products/console/orders" class="btn btn-outline btn-block">Cancel</a>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .order-details-page { display: flex; flex-direction: column; gap: 20px; width: 100%; }
    .loading-state { text-align: center; padding: 48px; color: #64748b; }
    .spinner { width: 32px; height: 32px; border: 3px solid #e2e8f0; border-top-color: #0050e5; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 12px; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .details-layout { display: grid; grid-template-columns: 1fr 340px; gap: 24px; }
    @media (max-width: 960px) {
      .details-layout { grid-template-columns: 1fr; }
    }

    .details-main, .details-sidebar { display: flex; flex-direction: column; gap: 20px; }

    .m3-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
    }
    .card-padding { padding: 24px; }
    .card-title {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
      margin-top: 0;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 1px solid #f1f5f9;
    }
    .icon-blue { color: #0050e5; }
    .icon-green { color: #10b981; }
    .icon-purple { color: #8b5cf6; }
    .icon-amber { color: #f59e0b; }
    .icon-red { color: #ef4444; }

    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    @media (max-width: 540px) { .info-grid { grid-template-columns: 1fr; } }
    .info-item { display: flex; flex-direction: column; gap: 4px; }
    .info-label { font-size: 11.5px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.02em; }
    .info-value { font-size: 14px; font-weight: 600; color: #1e293b; }
    .font-mono { font-family: monospace; }

    .sub-title { font-size: 13px; font-weight: 700; color: #1e293b; margin: 20px 0 8px 0; border-top: 1px solid #f1f5f9; padding-top: 16px; }
    .address-paragraph { font-size: 13.5px; line-height: 1.6; color: #475569; margin: 0; }
    .text-muted { color: #94a3b8; }

    .table-responsive { width: 100%; overflow-x: auto; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    .items-table th { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; padding: 10px 12px; border-bottom: 2px solid #cbd5e1; text-align: left; }
    .items-table td { padding: 14px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13.5px; vertical-align: middle; }
    .product-info-cell { display: flex; flex-direction: column; gap: 6px; }
    .product-meta-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .badge-tag { font-size: 11px; font-weight: 600; background: #f1f5f9; color: #475569; padding: 3px 8px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px; }
    .license-pill { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; font-family: monospace; font-size: 11.5px; }
    .btn-copy { background: transparent; border: none; padding: 0; color: #0284c7; cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .btn-copy:hover { color: #0369a1; }
    .btn-copy span { font-size: 14px !important; }

    .price-breakdown { margin-top: 20px; border-top: 1px solid #cbd5e1; padding-top: 14px; display: flex; flex-direction: column; gap: 8px; width: 280px; margin-left: auto; }
    @media (max-width: 540px) { .price-breakdown { width: 100%; } }
    .breakdown-row { display: flex; justify-content: space-between; font-size: 13.5px; color: #475569; }
    .total-row { border-top: 1px dashed #cbd5e1; padding-top: 8px; font-size: 16px; font-weight: 800; color: #0f172a; }

    /* Timeline style for Admin Notes & Reviews */
    .notes-timeline { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }
    .timeline-item { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; }
    .timeline-header { display: flex; justify-content: space-between; font-size: 11.5px; margin-bottom: 6px; }
    .note-author { font-weight: 700; color: #0f172a; }
    .note-time { color: #94a3b8; }
    .note-text { font-size: 13px; line-height: 1.5; color: #334155; margin: 0; }
    .notes-empty { text-align: center; padding: 24px; color: #94a3b8; font-size: 13px; background: #f8fafc; border-radius: 8px; margin-bottom: 20px; }

    .add-note-box { border-top: 1px solid #f1f5f9; padding-top: 16px; }
    .form-group { margin-bottom: 14px; }
    .form-label { display: block; font-size: 12.5px; font-weight: 700; color: #334155; margin-bottom: 6px; }
    .form-control { width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13.5px; outline: none; background: #ffffff; box-sizing: border-box; }
    .form-control:focus { border-color: #0050e5; box-shadow: 0 0 0 3px rgba(0,80,229,0.12); }

    .refund-card { background: #fff5f5; border-color: #fed7d7; }
    .refund-warning { font-size: 12px; line-height: 1.5; color: #9b2c2c; margin-top: 0; margin-bottom: 16px; }
    .refunded-state { background: #f0fdf4; border-color: #bbf7d0; text-align: center; }

    .save-actions { display: flex; flex-direction: column; gap: 10px; margin-top: 10px; }
  `]
})
export class ProductOrderDetailsComponent implements OnInit {
  orderId = '';
  order: any = null;
  isLoading = true;
  isSaving = false;
  currencySymbol = '$';
  currencyCode = 'USD';
  headerButtons: PageHeaderButton[] = [];

  adminNotesList: AdminNote[] = [];
  newNoteText = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.orderId = this.route.snapshot.paramMap.get('id') || '';
    this.headerButtons = [
      {
        text: 'Back to Orders',
        icon: 'arrow_back',
        routerLink: '/products/console/orders',
        isPrimary: false
      }
    ];

    if (this.orderId) {
      this.fetchOrderDetails();
    } else {
      this.toast.error('Invalid order identifier.');
      this.router.navigate(['/products/console/orders']);
    }
  }

  fetchOrderDetails(): void {
    this.isLoading = true;
    this.api.get(`ProductsApi/orders/${this.orderId}`).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        if (res?.isSuccess) {
          this.order = res.data.order;
          this.currencySymbol = res.data.currencySymbol || '$';
          this.currencyCode = res.data.currencyCode || 'USD';
          this.parseAdminNotes();
        } else {
          this.toast.error(res?.message || 'Failed to fetch order details.');
          this.router.navigate(['/products/console/orders']);
        }
      },
      error: (err: any) => {
        this.isLoading = false;
        this.toast.error('An error occurred while loading order information.');
        console.error(err);
        this.router.navigate(['/products/console/orders']);
      }
    });
  }

  hasShippingAddress(): boolean {
    return !!(
      this.order?.shippingAddressLine1 ||
      this.order?.shippingCity ||
      this.order?.shippingCountry
    );
  }

  parseAdminNotes(): void {
    this.adminNotesList = [];
    if (!this.order?.adminNotes) return;

    try {
      // Check if it's formatted as a JSON array
      if (this.order.adminNotes.trim().startsWith('[')) {
        this.adminNotesList = JSON.parse(this.order.adminNotes);
      } else {
        // Fallback for plain text note
        this.adminNotesList = [
          {
            author: 'System Migrator',
            timestamp: new Date().toISOString(),
            text: this.order.adminNotes
          }
        ];
      }
    } catch (e) {
      // Fallback if parsing fails
      this.adminNotesList = [
        {
          author: 'Admin note',
          timestamp: new Date().toISOString(),
          text: this.order.adminNotes
        }
      ];
    }
  }

  addAdminNote(): void {
    if (!this.newNoteText.trim()) return;

    const note: AdminNote = {
      author: 'Coca Admin', // Display current logged in user name
      timestamp: new Date().toISOString(),
      text: this.newNoteText.trim()
    };

    this.adminNotesList.push(note);
    this.order.adminNotes = JSON.stringify(this.adminNotesList);
    this.newNoteText = '';
    this.toast.success('Note logged locally. Remember to save changes to persist to DB.');
  }

  triggerRefund(): void {
    if (confirm('Are you absolutely sure you want to issue a full refund for this order? This will reverse transaction logs in the central ledger.')) {
      this.order.orderStatus = 4; // Refunded
      this.order.paymentStatus = 2; // Failed / Refunded
      this.addSystemNote('Full order refund initiated by administrator.');
      this.onSaveChanges();
    }
  }

  addSystemNote(text: string): void {
    const note: AdminNote = {
      author: 'System Event',
      timestamp: new Date().toISOString(),
      text: text
    };
    this.adminNotesList.push(note);
    this.order.adminNotes = JSON.stringify(this.adminNotesList);
  }

  copyLicense(key: string): void {
    navigator.clipboard.writeText(key).then(() => {
      this.toast.success('License key copied to clipboard.');
    });
  }

  onSaveChanges(): void {
    this.isSaving = true;

    this.api.put(`ProductsApi/orders/${this.orderId}/status`, this.order).subscribe({
      next: (res: any) => {
        this.isSaving = false;
        if (res?.isSuccess) {
          this.toast.success('Order settings saved successfully.');
          this.fetchOrderDetails(); // Reload to sync state
        } else {
          this.toast.error(res?.message || 'Failed to update order status.');
        }
      },
      error: (err: any) => {
        this.isSaving = false;
        this.toast.error('An error occurred while updating order settings.');
        console.error(err);
      }
    });
  }
}
