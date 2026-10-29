import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../../core/services/api.service';

/**
 * Single modular capability billing posture.
 */
export interface BillingFeatureItem {
  featureId: string;
  featureCode: string;
  name: string;
  menuTitle?: string;
  suiteId?: string;
  category: string;
  suiteMenuTitle?: string;
  description?: string;
  icon?: string;
  routePrefix?: string;
  isCompulsory: boolean;
  isSubscribed: boolean;
  isActive: boolean;
  isAvailableForUse: boolean;
  isPublished?: boolean;
  isInBeta?: boolean;
  hasCustomPriceOverride?: boolean;
  hasCustomAvailabilityOverride?: boolean;
  sortOrder?: number;
  billingType?: string;
  autoRenew: boolean;
  billingCadence: string;
  status: string;
  monthlyPrice: number;
  quarterlyPrice: number;
  yearlyPrice: number;
  effectivePrice: number;
  subscriptionId?: string;
  expiresAtUtc?: string;
  daysRemaining?: number;
  severity: 'None' | 'Warning' | 'Urgent' | 'Critical' | string;
}

/**
 * Renewal notice payload for approaching or overdue subscriptions.
 */
export interface FeatureExpirationNotice {
  featureCode: string;
  featureName: string;
  severity: string;
  daysRemaining: number;
  expiresAtUtc: string;
  message: string;
}

/**
 * Complete feature billing snapshot for the active sovereign tenant.
 */
export interface BillingFeaturesSnapshot {
  tenantKey: string;
  currencyCode?: string;
  currencySymbol?: string;
  exchangeRateFromUsd?: number;
  useCustomPricing?: boolean;
  useCustomAvailability?: boolean;
  serverTimeUtc: string;
  included: BillingFeatureItem[];
  subscribed: BillingFeatureItem[];
  available: BillingFeatureItem[];
  notices: FeatureExpirationNotice[];
  totalRecurringMonthly: number;
}

/**
 * Response payload when subscribing to a feature add-on.
 */
export interface SubscribeFeatureResult {
  activated: boolean;
  requiresPayment: boolean;
  invoiceId?: string;
  invoiceNumber?: string;
  amountDue: number;
}

/**
 * Invoice ledger record.
 */
export interface BillingInvoice {
  id: string;
  invoiceNumber?: string;
  description: string;
  amount: number;
  currency: string;
  status: string;
  paymentProvider?: string;
  reference?: string;
  createdUtc: string;
}

/**
 * Saved payment card method for automated settlements.
 */
export interface PaymentCard {
  id: string;
  brand: 'Visa' | 'Mastercard' | 'Amex' | 'Discover' | string;
  last4: string;
  expMonth: number;
  expYear: number;
  holderName: string;
  isDefault: boolean;
  createdUtc: string;
}

/**
 * Corporate billing contact profile and tax attributes.
 */
export interface BillingContactProfile {
  companyName: string;
  billingEmail: string;
  taxId?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  stateProvince?: string;
  country?: string;
  postalCode?: string;
  phoneNumber?: string;
}

/**
 * Standard API envelope wrapper.
 */
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  errors?: string[];
}

/**
 * Service orchestrating tenant subscription posture, payment methods,
 * auto-renew toggles, and billing invoice ledgers.
 */
@Injectable({
  providedIn: 'root'
})
export class BillingService {
  private readonly CARDS_STORAGE_KEY = 'ozikol_bcc_payment_cards';
  private readonly CONTACT_STORAGE_KEY = 'ozikol_bcc_billing_contact';

  constructor(private api: ApiService) {}

  /**
   * Retrieves the current feature billing snapshot for the workspace.
   */
  getFeaturesSnapshot(): Observable<ApiResponse<BillingFeaturesSnapshot>> {
    return this.api.get<ApiResponse<BillingFeaturesSnapshot>>('billing/features');
  }

  /**
   * Subscribes the workspace to an optional feature add-on.
   */
  subscribeFeature(featureId: string, cadence: 'Monthly' | 'Quarterly' | 'Yearly'): Observable<ApiResponse<SubscribeFeatureResult>> {
    return this.api.post<ApiResponse<SubscribeFeatureResult>>('billing/features/subscribe', {
      featureId,
      cadence
    });
  }

  /**
   * Installs/activates or deactivates/uninstalls a capability for the workspace and syncs with Central.
   */
  toggleFeatureActive(
    featureId: string,
    featureCode: string,
    setActive?: boolean,
    cadence: 'Monthly' | 'Quarterly' | 'Yearly' = 'Monthly'
  ): Observable<ApiResponse<BillingFeaturesSnapshot>> {
    return this.api.post<ApiResponse<BillingFeaturesSnapshot>>('billing/features/toggle-active', {
      featureId,
      featureCode,
      setActive,
      cadence
    });
  }

  /**
   * Toggles auto-renewal for a subscribed add-on.
   */
  toggleAutoRenew(subscriptionId: string): Observable<ApiResponse<boolean>> {
    return this.api.post<ApiResponse<boolean>>(`billing/features/${subscriptionId}/auto-renew`, {});
  }

  /**
   * Lists all invoices generated for the tenant workspace.
   */
  getInvoices(): Observable<ApiResponse<BillingInvoice[]>> {
    return this.api.get<ApiResponse<BillingInvoice[]>>('billing/invoices');
  }

  /**
   * Retrieves linked payment methods (cards) for the workspace.
   */
  getPaymentCards(): PaymentCard[] {
    if (typeof localStorage === 'undefined') return [];
    const saved = localStorage.getItem(this.CARDS_STORAGE_KEY);
    if (!saved) {
      // Default demo card
      const initialCards: PaymentCard[] = [
        {
          id: 'card_demo_01',
          brand: 'Visa',
          last4: '4242',
          expMonth: 12,
          expYear: 2028,
          holderName: 'Financial Administrator',
          isDefault: true,
          createdUtc: new Date().toISOString()
        }
      ];
      localStorage.setItem(this.CARDS_STORAGE_KEY, JSON.stringify(initialCards));
      return initialCards;
    }
    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  }

  /**
   * Adds and persists a new payment card.
   */
  addPaymentCard(card: Omit<PaymentCard, 'id' | 'createdUtc'>): PaymentCard {
    const cards = this.getPaymentCards();
    const newCard: PaymentCard = {
      ...card,
      id: 'card_' + Math.random().toString(36).substring(2, 10),
      createdUtc: new Date().toISOString()
    };
    if (newCard.isDefault || cards.length === 0) {
      cards.forEach(c => c.isDefault = false);
      newCard.isDefault = true;
    }
    cards.push(newCard);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.CARDS_STORAGE_KEY, JSON.stringify(cards));
    }
    return newCard;
  }

  /**
   * Marks a payment card as default.
   */
  setDefaultCard(cardId: string): void {
    const cards = this.getPaymentCards();
    cards.forEach(c => {
      c.isDefault = c.id === cardId;
    });
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.CARDS_STORAGE_KEY, JSON.stringify(cards));
    }
  }

  /**
   * Removes a linked payment card.
   */
  deletePaymentCard(cardId: string): void {
    let cards = this.getPaymentCards().filter(c => c.id !== cardId);
    if (cards.length > 0 && !cards.some(c => c.isDefault)) {
      cards[0].isDefault = true;
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.CARDS_STORAGE_KEY, JSON.stringify(cards));
    }
  }

  /**
   * Retrieves corporate billing contact profile.
   */
  getBillingContact(): BillingContactProfile {
    const fallback: BillingContactProfile = {
      companyName: 'Digital Organization',
      billingEmail: 'billing@company.com',
      taxId: 'US-TAX-982143',
      addressLine1: 'Corporate Suite 400',
      city: 'San Francisco',
      stateProvince: 'CA',
      country: 'United States',
      postalCode: '94103'
    };
    if (typeof localStorage === 'undefined') return fallback;
    const saved = localStorage.getItem(this.CONTACT_STORAGE_KEY);
    if (!saved) return fallback;
    try {
      return { ...fallback, ...JSON.parse(saved) };
    } catch {
      return fallback;
    }
  }

  /**
   * Saves updated billing contact profile.
   */
  saveBillingContact(profile: BillingContactProfile): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.CONTACT_STORAGE_KEY, JSON.stringify(profile));
    }
  }
}

