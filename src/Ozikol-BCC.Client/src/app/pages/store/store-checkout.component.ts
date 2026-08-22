import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CartService, CartItem } from '../../core/services/cart.service';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-store-checkout',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="checkout-container">
      <h1 class="checkout-title">Commercial Order Checkout</h1>

      <!-- ORDER COMPLETED SUCCESS VIEW -->
      <div *ngIf="completedOrder" class="success-card">
        <div class="success-icon-circle">
          <span class="material-symbols-outlined">check_circle</span>
        </div>
        <h2>Thank you for your order!</h2>
        <p class="order-num-text">Order Confirmation Reference: <strong>#{{ completedOrder.orderNumber }}</strong></p>
        <p class="success-sub">A formal receipt and fulfillment email has been queued to <strong>{{ form.customerEmail }}</strong>.</p>

        <!-- Digital Deliverables / Licenses -->
        <div *ngIf="hasDigitalDeliverables(completedOrder)" class="digital-assets-box">
          <h3 class="assets-title">
            <span class="material-symbols-outlined">key</span>
            <span>Your Digital Licenses & Access Tokens</span>
          </h3>
          <div *ngFor="let item of completedOrder.items" class="asset-row">
            <div *ngIf="item.generatedLicenseKey">
              <strong>{{ item.productTitle }} License Key:</strong>
              <code class="license-code">{{ item.generatedLicenseKey }}</code>
            </div>
          </div>
        </div>

        <div class="success-actions">
          <a routerLink="/store" class="btn btn-primary btn-lg">Return to Storefront</a>
        </div>
      </div>

      <!-- MAIN CHECKOUT FORM -->
      <div *ngIf="!completedOrder" class="checkout-grid">
        <!-- Customer & Delivery Information Form -->
        <form (ngSubmit)="onPlaceOrder()" class="checkout-form">
          <!-- 1. Customer Contact Details -->
          <div class="form-card">
            <h3 class="card-heading">
              <span class="material-symbols-outlined icon-blue">person</span>
              <span>1. Customer & Contact Details</span>
            </h3>

            <div class="form-row-2">
              <div class="form-group">
                <label class="form-label">Full Name <span class="req">*</span></label>
                <input
                  type="text"
                  [(ngModel)]="form.customerName"
                  name="customerName"
                  required
                  placeholder="e.g. Jane Doe"
                  class="form-control"
                />
              </div>

              <div class="form-group">
                <label class="form-label">Email Address <span class="req">*</span></label>
                <input
                  type="email"
                  [(ngModel)]="form.customerEmail"
                  name="customerEmail"
                  required
                  placeholder="e.g. jane@example.com"
                  class="form-control"
                />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Phone Number</label>
              <input
                type="tel"
                [(ngModel)]="form.customerPhone"
                name="customerPhone"
                placeholder="+1 (555) 000-0000"
                class="form-control"
              />
            </div>
          </div>

          <!-- 2. Shipping & Physical Delivery (if applicable) -->
          <div class="form-card">
            <h3 class="card-heading">
              <span class="material-symbols-outlined icon-purple">local_shipping</span>
              <span>2. Delivery & Address (For Physical Items)</span>
            </h3>

            <div class="form-group">
              <label class="form-label">Street Address</label>
              <input
                type="text"
                [(ngModel)]="form.shippingAddress"
                name="shippingAddress"
                placeholder="123 Innovation Boulevard, Suite 400"
                class="form-control"
              />
            </div>

            <div class="form-row-3">
              <div class="form-group">
                <label class="form-label">City</label>
                <input type="text" [(ngModel)]="form.shippingCity" name="shippingCity" placeholder="City" class="form-control" />
              </div>
              <div class="form-group">
                <label class="form-label">State / Province</label>
                <input type="text" [(ngModel)]="form.shippingState" name="shippingState" placeholder="State" class="form-control" />
              </div>
              <div class="form-group">
                <label class="form-label">Postal Code</label>
                <input type="text" [(ngModel)]="form.shippingPostalCode" name="shippingPostalCode" placeholder="ZIP" class="form-control font-mono" />
              </div>
            </div>
          </div>

          <!-- 3. Payment Method -->
          <div class="form-card">
            <h3 class="card-heading">
              <span class="material-symbols-outlined icon-green">credit_card</span>
              <span>3. Commercial Payment Method</span>
            </h3>

            <div class="payment-methods-grid">
              <label class="payment-method-tile" [class.selected]="form.paymentMethod === 'DirectGateway'">
                <input type="radio" [(ngModel)]="form.paymentMethod" name="paymentMethod" value="DirectGateway" />
                <span class="material-symbols-outlined">payments</span>
                <strong>Credit Card / Online Gateway</strong>
                <span>Paystack / Flutterwave / Stripe</span>
              </label>

              <label class="payment-method-tile" [class.selected]="form.paymentMethod === 'BankTransfer'">
                <input type="radio" [(ngModel)]="form.paymentMethod" name="paymentMethod" value="BankTransfer" />
                <span class="material-symbols-outlined">account_balance</span>
                <strong>Direct Bank Transfer / Invoice</strong>
                <span>Official commercial invoice</span>
              </label>
            </div>
          </div>

          <div class="submit-box">
            <button type="submit" [disabled]="isSubmitting || items.length === 0" class="btn btn-primary btn-block btn-lg">
              <span class="material-symbols-outlined">lock</span>
              <span>{{ isSubmitting ? 'Processing Order...' : 'Complete Purchase & Generate Invoice' }}</span>
            </button>
          </div>
        </form>

        <!-- Right Side: Order Summary -->
        <div class="order-summary-card">
          <h3 class="summary-title">Order Items ({{ cartService.getItemCount() }})</h3>

          <div class="summary-items-list">
            <div *ngFor="let item of items" class="summary-item">
              <div class="item-title-wrap">
                <strong>{{ item.title }}</strong>
                <span class="item-qty-badge">{{ item.quantity }}x</span>
              </div>
              <span class="item-price">\${{ (item.price * item.quantity) | number:'1.2-2' }}</span>
            </div>
          </div>

          <div class="total-divider"></div>

          <div class="total-row">
            <span>Subtotal</span>
            <span>\${{ cartService.getSubtotal() | number:'1.2-2' }}</span>
          </div>
          <div class="total-row total-highlight">
            <span>Total to Pay</span>
            <span class="final-price">\${{ cartService.getSubtotal() | number:'1.2-2' }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .checkout-container { width: 100%; max-width: 1200px; margin: 0 auto; padding: 32px 20px; box-sizing: border-box; }
    .checkout-title { font-size: 26px; font-weight: 800; color: #0f172a; margin-bottom: 24px; }

    .checkout-grid { display: grid; grid-template-columns: 1fr 380px; gap: 24px; }
    @media (max-width: 960px) { .checkout-grid { grid-template-columns: 1fr; } }

    .checkout-form { display: flex; flex-direction: column; gap: 20px; }
    .form-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; }
    .card-heading {
      display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 700; color: #0f172a;
      margin: 0 0 18px; padding-bottom: 12px; border-bottom: 1px solid #f1f5f9;
    }
    .icon-blue { color: #0050e5; }
    .icon-purple { color: #8b5cf6; }
    .icon-green { color: #10b981; }

    .form-group { margin-bottom: 14px; }
    .form-group:last-child { margin-bottom: 0; }
    .form-label { display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px; }
    .req { color: #ef4444; }
    .form-control {
      width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; outline: none; background: #fff; box-sizing: border-box;
    }
    .form-control:focus { border-color: #0050e5; box-shadow: 0 0 0 3px rgba(0,80,229,0.12); }
    .font-mono { font-family: monospace; }
    .form-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .form-row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }

    .payment-methods-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    @media (max-width: 600px) { .payment-methods-grid { grid-template-columns: 1fr; } }
    .payment-method-tile {
      display: flex; flex-direction: column; padding: 14px; border: 2px solid #e2e8f0; border-radius: 8px; cursor: pointer; transition: all 0.2s; position: relative;
    }
    .payment-method-tile input { position: absolute; top: 12px; right: 12px; }
    .payment-method-tile.selected { border-color: #0050e5; background: rgba(0,80,229,0.04); }
    .payment-method-tile span:first-of-type { font-size: 28px; color: #0050e5; margin-bottom: 6px; }
    .payment-method-tile strong { font-size: 13px; color: #0f172a; margin-bottom: 2px; }
    .payment-method-tile span:last-child { font-size: 11px; color: #64748b; }

    .submit-box { margin-top: 10px; }
    .btn-block { width: 100%; }
    .btn-lg { padding: 14px; font-size: 16px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 8px; }

    .order-summary-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; height: fit-content; }
    .summary-title { margin: 0 0 16px; font-size: 16px; font-weight: 700; color: #0f172a; }
    .summary-items-list { display: flex; flex-direction: column; gap: 12px; }
    .summary-item { display: flex; justify-content: space-between; align-items: center; font-size: 13px; }
    .item-title-wrap { display: flex; align-items: center; gap: 6px; }
    .item-qty-badge { font-size: 11px; background: #f1f5f9; padding: 1px 6px; border-radius: 4px; color: #475569; }
    .item-price { font-weight: 600; color: #0f172a; }
    .total-divider { height: 1px; background: #e2e8f0; margin: 16px 0; }
    .total-row { display: flex; justify-content: space-between; font-size: 14px; color: #64748b; margin-bottom: 8px; }
    .total-highlight { font-size: 16px; font-weight: 700; color: #0f172a; margin-top: 12px; }
    .final-price { font-size: 22px; font-weight: 800; color: #0050e5; }

    .success-card {
      background: #ffffff; border: 1px solid #a7f3d0; border-radius: 16px; padding: 48px 24px; text-align: center; max-width: 640px; margin: 0 auto;
    }
    .success-icon-circle {
      width: 64px; height: 64px; border-radius: 50%; background: #ecfdf5; color: #059669; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;
    }
    .success-icon-circle span { font-size: 40px; }
    .order-num-text { font-size: 18px; color: #0f172a; margin: 8px 0; }
    .success-sub { font-size: 14px; color: #64748b; margin-bottom: 24px; }
    .digital-assets-box {
      background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px; text-align: left; margin-bottom: 24px;
    }
    .assets-title { display: flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 700; color: #0f172a; margin: 0 0 12px; }
    .assets-title span { color: #0050e5; }
    .asset-row { font-size: 13px; margin-bottom: 8px; }
    .license-code { display: block; font-family: monospace; background: #fee2e2; color: #991b1b; padding: 6px 10px; border-radius: 6px; margin-top: 4px; font-size: 13px; font-weight: 700; }
    .success-actions { display: flex; justify-content: center; }
  `]
})
export class StoreCheckoutComponent implements OnInit {
  items: CartItem[] = [];
  isSubmitting = false;
  completedOrder: any = null;

  form: any = {
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    shippingAddress: '',
    shippingCity: '',
    shippingState: '',
    shippingPostalCode: '',
    paymentMethod: 'DirectGateway'
  };

  constructor(
    public cartService: CartService,
    private api: ApiService,
    private toast: ToastService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.items = this.cartService.getItems();
    if (this.items.length === 0) {
      this.toast.info('Your cart is empty.');
      this.router.navigate(['/store']);
    }
  }

  hasDigitalDeliverables(order: any): boolean {
    return order?.items?.some((i: any) => i.generatedLicenseKey || i.downloadAccessToken);
  }

  onPlaceOrder(): void {
    if (!this.form.customerName?.trim() || !this.form.customerEmail?.trim()) {
      this.toast.error('Customer name and email are required.');
      return;
    }

    const payload = {
      customerName: this.form.customerName.trim(),
      customerEmail: this.form.customerEmail.trim(),
      customerPhone: this.form.customerPhone?.trim(),
      shippingAddress: this.form.shippingAddress?.trim(),
      shippingCity: this.form.shippingCity?.trim(),
      shippingState: this.form.shippingState?.trim(),
      shippingPostalCode: this.form.shippingPostalCode?.trim(),
      paymentMethod: this.form.paymentMethod,
      items: this.items.map(i => ({
        productId: i.productId,
        quantity: i.quantity
      }))
    };

    this.isSubmitting = true;
    this.api.post<any>('ProductsApi/checkout', payload).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.completedOrder = res?.data;
        this.cartService.clearCart();
        this.toast.success('Order placed successfully!');
      },
      error: (err) => {
        this.isSubmitting = false;
        this.toast.error(err?.error?.message || 'Failed to place order.');
      }
    });
  }
}
