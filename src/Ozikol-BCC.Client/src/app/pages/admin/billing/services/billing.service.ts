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
  suiteSortOrder?: number;
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
  freeTrialDays?: number;
  effectiveFreeTrialDays?: number;
  hasCustomFreeTrialOverride?: boolean;
  hasUsedFreeTrial?: boolean;
  isTrialPeriod?: boolean;
  isEligibleForFreeTrial?: boolean;
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
 * Server-calculated Central Paystack Inline Checkout initialization payload.
 */
export interface InitializeFeaturePaymentPayload {
  publicKey: string;
  accessCode: string;
  reference: string;
  authorizationUrl: string;
  amount: number;
  currency: string;
  currencySymbol: string;
  email: string;
  invoiceNumber: string;
  cadence: string;
  featureNames: string[];
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
 * Result of preparing/generating an invoice before navigating to /billing/invoices/:id.
 */
export interface PrepareBillingInvoiceResponse {
  invoiceId: string;
  invoiceNumber: string;
}

/**
 * Individual capability line item inside a full billing invoice, supporting dynamic duration selection
 * (1 Month, 3 Months, 1 Year) and automatic discount calculation.
 */
export interface BillingInvoiceLineItem {
  featureId: string;
  featureCode: string;
  featureName: string;
  category: string;
  icon: string;
  selectedCadence: 'Monthly' | 'Quarterly' | 'Yearly' | string;
  months: number;
  isYearlyOnly: boolean;
  isMonthlyOnly: boolean;
  supportedCadences: string[];
  monthlyPrice: number;
  quarterlyPrice: number;
  yearlyPrice: number;
  yearlyDiscountPercent: number;
  yearlySavingsAmount: number;
  quarterlyDiscountPercent: number;
  quarterlySavingsAmount: number;
  lineTotal: number;
  appliedSavingsAmount: number;
  appliedDiscountPercent: number;
}

/**
 * Payment gateway / method option displayed on the dedicated Invoice Page (/billing/invoices/:id).
 */
export interface BillingPaymentMethodOption {
  providerCode: 'Paystack' | 'Flutterwave' | 'Stripe' | 'BankDeposit' | string;
  name: string;
  description: string;
  icon: string;
  isEnabled: boolean;
  isConfigured: boolean;
  statusBadge: string;
  publicKey?: string;
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  sortCodeOrSwift?: string;
  instructions?: string;
}

/**
 * Full invoice detail payload for /billing/invoices/:id.
 */
export interface BillingInvoiceDetail {
  id: string;
  invoiceNumber: string;
  status: string;
  organizationName: string;
  tenantKey: string;
  billingEmail: string;
  currency: string;
  currencySymbol: string;
  subtotalBeforeDiscount: number;
  totalSavingsAmount: number;
  totalAmount: number;
  paymentProvider?: string;
  reference?: string;
  paymentProofRef?: string;
  notes?: string;
  createdUtc: string;
  updatedUtc?: string;
  lineItems: BillingInvoiceLineItem[];
  paymentMethods: BillingPaymentMethodOption[];
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
  success?: boolean;
  isSuccess?: boolean;
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
   * Initializes a Central Paystack Inline Checkout transaction for one or more capabilities.
   * Credentials and exact pricing are resolved server-side from MasterCatalogDbContext.
   */
  initializePaystackFeaturePayment(
    featureCodes: string[],
    cadence: 'Monthly' | 'Quarterly' | 'Yearly' = 'Monthly'
  ): Observable<ApiResponse<InitializeFeaturePaymentPayload>> {
    return this.api.post<ApiResponse<InitializeFeaturePaymentPayload>>('billing/features/paystack/initialize', {
      featureCodes,
      cadence
    });
  }

  /**
   * Verifies a completed Central Paystack Inline payment reference and renews/activates the covered capabilities.
   */
  verifyPaystackFeaturePayment(reference: string): Observable<ApiResponse<BillingFeaturesSnapshot>> {
    return this.api.post<ApiResponse<BillingFeaturesSnapshot>>('billing/features/paystack/verify', {
      reference
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
   * Automatically prepares/generates an itemized invoice for either a single capability ("Pay & Renew")
   * or all expiring capabilities ("Renew All Expiring Features") and returns its Invoice ID.
   */
  prepareInvoice(featureCodes: string[], cadence?: string): Observable<ApiResponse<PrepareBillingInvoiceResponse>> {
    return this.api.post<ApiResponse<PrepareBillingInvoiceResponse>>('billing/invoices/prepare', {
      featureCodes,
      cadence
    });
  }

  /**
   * Retrieves the full invoice detail and payment gateway options for /billing/invoices/:id.
   */
  getInvoiceDetail(invoiceId: string): Observable<ApiResponse<BillingInvoiceDetail>> {
    return this.api.get<ApiResponse<BillingInvoiceDetail>>(`billing/invoices/${invoiceId}`);
  }

  /**
   * Updates the billing duration (Monthly = 1 Month, Quarterly = 3 Months, Yearly = 1 Year) for a line item on a Pending invoice.
   */
  updateInvoiceLineCadence(
    invoiceId: string,
    cadence: 'Monthly' | 'Quarterly' | 'Yearly' | string,
    featureCode?: string
  ): Observable<ApiResponse<BillingInvoiceDetail>> {
    return this.api.post<ApiResponse<BillingInvoiceDetail>>(`billing/invoices/${invoiceId}/cadence`, {
      featureCode,
      cadence
    });
  }

  /**
   * Initializes Paystack checkout for a specific invoice on /billing/invoices/:id.
   */
  payInvoiceWithPaystack(invoiceId: string): Observable<ApiResponse<InitializeFeaturePaymentPayload>> {
    return this.api.post<ApiResponse<InitializeFeaturePaymentPayload>>(`billing/invoices/${invoiceId}/pay/paystack`, {});
  }

  /**
   * Submits a Direct Bank Deposit transfer reference / proof for a specific invoice on /billing/invoices/:id.
   */
  submitInvoiceBankDeposit(invoiceId: string, transferReference: string): Observable<ApiResponse<BillingInvoiceDetail>> {
    return this.api.post<ApiResponse<BillingInvoiceDetail>>(`billing/invoices/${invoiceId}/pay/bank-deposit`, {
      transferReference
    });
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

