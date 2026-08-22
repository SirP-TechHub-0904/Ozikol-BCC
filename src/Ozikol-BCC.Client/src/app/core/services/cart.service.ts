import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface CartItem {
  productId: string;
  title: string;
  slug: string;
  coverImageUrl?: string;
  price: number;
  quantity: number;
  productType: number;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private readonly STORAGE_KEY = 'ozikol_cart_items';
  private itemsSubject = new BehaviorSubject<CartItem[]>(this.loadFromStorage());

  items$ = this.itemsSubject.asObservable();

  constructor() {}

  private loadFromStorage(): CartItem[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private saveToStorage(items: CartItem[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(items));
    } catch {}
    this.itemsSubject.next(items);
  }

  getItems(): CartItem[] {
    return this.itemsSubject.value;
  }

  getItemCount(): number {
    return this.itemsSubject.value.reduce((total, item) => total + item.quantity, 0);
  }

  getSubtotal(): number {
    return this.itemsSubject.value.reduce((total, item) => total + (item.price * item.quantity), 0);
  }

  addItem(product: any, quantity: number = 1): void {
    const items = [...this.itemsSubject.value];
    const existingIndex = items.findIndex(i => i.productId === product.id);

    if (existingIndex > -1) {
      items[existingIndex].quantity += quantity;
    } else {
      items.push({
        productId: product.id,
        title: product.title,
        slug: product.slug,
        coverImageUrl: product.coverImageUrl,
        price: product.price,
        quantity: Math.max(1, quantity),
        productType: product.type
      });
    }

    this.saveToStorage(items);
  }

  updateQuantity(productId: string, quantity: number): void {
    let items = [...this.itemsSubject.value];
    if (quantity <= 0) {
      items = items.filter(i => i.productId !== productId);
    } else {
      const index = items.findIndex(i => i.productId === productId);
      if (index > -1) {
        items[index].quantity = quantity;
      }
    }
    this.saveToStorage(items);
  }

  removeItem(productId: string): void {
    const items = this.itemsSubject.value.filter(i => i.productId !== productId);
    this.saveToStorage(items);
  }

  clearCart(): void {
    this.saveToStorage([]);
  }
}
