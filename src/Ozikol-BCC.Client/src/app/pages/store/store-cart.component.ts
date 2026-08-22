import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CartService, CartItem } from '../../core/services/cart.service';

@Component({
  selector: 'app-store-cart',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="cart-page-container">
      <h1 class="cart-title">Your Shopping Cart</h1>

      <div *ngIf="items.length === 0" class="empty-cart-card">
        <span class="material-symbols-outlined empty-icon">shopping_cart</span>
        <h2>Your cart is currently empty</h2>
        <p>Explore software packages, consultation hours, digital licenses, or merchandise.</p>
        <a routerLink="/store" class="btn btn-primary" style="margin-top: 16px;">
          <span class="material-symbols-outlined">storefront</span>
          <span>Browse Storefront</span>
        </a>
      </div>

      <div *ngIf="items.length > 0" class="cart-grid">
        <!-- Items Table -->
        <div class="cart-items-table-card">
          <table class="cart-table">
            <thead>
              <tr>
                <th>Product</th>
                <th style="text-align: right;">Unit Price</th>
                <th style="text-align: center;">Quantity</th>
                <th style="text-align: right;">Subtotal</th>
                <th style="width: 50px;"></th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of items">
                <td>
                  <div class="cart-item-row">
                    <img *ngIf="item.coverImageUrl" [src]="item.coverImageUrl" class="cart-item-thumb" />
                    <div>
                      <a [routerLink]="['/store/product', item.slug]" class="item-title">{{ item.title }}</a>
                      <div class="item-archetype">{{ getTypeName(item.productType) }}</div>
                    </div>
                  </div>
                </td>
                <td style="text-align: right;" class="unit-price">\${{ item.price | number:'1.2-2' }}</td>
                <td style="text-align: center;">
                  <div class="qty-control">
                    <button type="button" (click)="cartService.updateQuantity(item.productId, item.quantity - 1)" class="btn-qty">-</button>
                    <span class="qty-num">{{ item.quantity }}</span>
                    <button type="button" (click)="cartService.updateQuantity(item.productId, item.quantity + 1)" class="btn-qty">+</button>
                  </div>
                </td>
                <td style="text-align: right;" class="line-total">\${{ (item.price * item.quantity) | number:'1.2-2' }}</td>
                <td style="text-align: center;">
                  <button type="button" (click)="cartService.removeItem(item.productId)" class="btn-remove" title="Remove Item">✕</button>
                </td>
              </tr>
            </tbody>
          </table>

          <div class="cart-table-footer">
            <button type="button" (click)="cartService.clearCart()" class="btn-clear-cart">
              <span class="material-symbols-outlined">delete_sweep</span>
              <span>Clear Cart</span>
            </button>
            <a routerLink="/store" class="btn-continue">← Continue Shopping</a>
          </div>
        </div>

        <!-- Summary & Checkout Card -->
        <div class="cart-summary-card">
          <h3 class="summary-heading">Order Summary</h3>

          <div class="summary-line">
            <span>Items ({{ cartService.getItemCount() }})</span>
            <span>\${{ cartService.getSubtotal() | number:'1.2-2' }}</span>
          </div>
          <div class="summary-line">
            <span>Estimated Taxes</span>
            <span>\${{ 0 | number:'1.2-2' }}</span>
          </div>

          <div class="summary-total-line">
            <span>Order Total</span>
            <span class="total-amount">\${{ cartService.getSubtotal() | number:'1.2-2' }}</span>
          </div>

          <a routerLink="/store/checkout" class="btn btn-primary btn-block btn-lg" style="margin-top: 20px;">
            <span class="material-symbols-outlined">lock</span>
            <span>Proceed to Checkout</span>
          </a>

          <div class="security-badge">
            <span class="material-symbols-outlined">verified_user</span>
            <span>Encrypted SSL Commercial Checkout</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .cart-page-container { width: 100%; max-width: 1200px; margin: 0 auto; padding: 32px 20px; box-sizing: border-box; }
    .cart-title { font-size: 26px; font-weight: 800; color: #0f172a; margin-bottom: 24px; }

    .empty-cart-card {
      background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 64px 20px; text-align: center; color: #64748b;
    }
    .empty-icon { font-size: 64px; color: #94a3b8; margin-bottom: 12px; }
    .empty-cart-card h2 { color: #0f172a; margin: 0 0 6px; }

    .cart-grid { display: grid; grid-template-columns: 1fr 360px; gap: 24px; }
    @media (max-width: 900px) { .cart-grid { grid-template-columns: 1fr; } }

    .cart-items-table-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
    .cart-table { width: 100%; border-collapse: collapse; text-align: left; }
    .cart-table th { background: #f8fafc; padding: 12px 16px; font-size: 12px; font-weight: 600; color: #475569; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }
    .cart-table td { padding: 16px; border-bottom: 1px solid #f1f5f9; font-size: 14px; vertical-align: middle; }

    .cart-item-row { display: flex; align-items: center; gap: 12px; }
    .cart-item-thumb { width: 48px; height: 48px; border-radius: 6px; object-fit: cover; }
    .item-title { font-weight: 600; color: #0f172a; text-decoration: none; }
    .item-title:hover { color: #0050e5; }
    .item-archetype { font-size: 11px; color: #64748b; margin-top: 2px; }

    .unit-price { color: #64748b; }
    .line-total { font-weight: 700; color: #0f172a; }

    .qty-control { display: inline-flex; align-items: center; border: 1px solid #cbd5e1; border-radius: 6px; }
    .btn-qty { width: 28px; height: 28px; border: none; background: transparent; font-size: 14px; cursor: pointer; color: #475569; }
    .qty-num { width: 28px; text-align: center; font-size: 13px; font-weight: 600; }
    .btn-remove { background: none; border: none; color: #94a3b8; font-size: 14px; cursor: pointer; }
    .btn-remove:hover { color: #ef4444; }

    .cart-table-footer { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; background: #f8fafc; }
    .btn-clear-cart { display: inline-flex; align-items: center; gap: 4px; border: none; background: transparent; color: #ef4444; font-size: 13px; font-weight: 600; cursor: pointer; }
    .btn-continue { color: #0050e5; text-decoration: none; font-size: 13px; font-weight: 600; }

    .cart-summary-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; height: fit-content; }
    .summary-heading { margin: 0 0 16px; font-size: 18px; font-weight: 700; color: #0f172a; padding-bottom: 12px; border-bottom: 1px solid #f1f5f9; }
    .summary-line { display: flex; justify-content: space-between; font-size: 14px; color: #475569; margin-bottom: 10px; }
    .summary-total-line { display: flex; justify-content: space-between; align-items: baseline; font-size: 16px; font-weight: 700; color: #0f172a; margin-top: 16px; padding-top: 14px; border-top: 1px solid #e2e8f0; }
    .total-amount { font-size: 24px; font-weight: 800; color: #0050e5; }
    .btn-block { width: 100%; }
    .btn-lg { padding: 12px; font-size: 15px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 8px; text-decoration: none; box-sizing: border-box; }

    .security-badge { display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 11px; color: #64748b; margin-top: 16px; }
    .security-badge span:first-child { font-size: 16px; color: #10b981; }
  `]
})
export class StoreCartComponent implements OnInit {
  items: CartItem[] = [];

  constructor(public cartService: CartService, private router: Router) {}

  ngOnInit(): void {
    this.cartService.items$.subscribe(items => {
      this.items = items;
    });
  }

  getTypeName(type: number): string {
    switch (type) {
      case 0: return 'Software Download';
      case 1: return 'Professional Service';
      case 2: return 'Physical Good';
      case 3: return 'Subscription';
      default: return 'Commercial Item';
    }
  }
}
