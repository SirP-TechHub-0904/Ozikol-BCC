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
  category: string;
  description?: string;
  icon?: string;
  isCompulsory: boolean;
  isSubscribed: boolean;
  isActive: boolean;
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
 * Standard API envelope wrapper.
 */
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  errors?: string[];
}

/**
 * Service orchestrating tenant subscription posture, feature marketplace add-ons,
 * auto-renew toggles, and billing invoice ledgers.
 */
@Injectable({
  providedIn: 'root'
})
export class BillingService {
  constructor(private api: ApiService) {}

  /**
   * Retrieves the current feature billing snapshot for the workspace.
   */
  getFeaturesSnapshot(): Observable<ApiResponse<BillingFeaturesSnapshot>> {
    return this.api.get<ApiResponse<BillingFeaturesSnapshot>>('api/billing/features');
  }

  /**
   * Subscribes the workspace to an optional feature add-on.
   */
  subscribeFeature(featureId: string, cadence: 'Monthly' | 'Quarterly' | 'Yearly'): Observable<ApiResponse<SubscribeFeatureResult>> {
    return this.api.post<ApiResponse<SubscribeFeatureResult>>('api/billing/features/subscribe', {
      featureId,
      cadence
    });
  }

  /**
   * Toggles auto-renewal for a subscribed add-on.
   */
  toggleAutoRenew(subscriptionId: string): Observable<ApiResponse<boolean>> {
    return this.api.post<ApiResponse<boolean>>(`api/billing/features/${subscriptionId}/auto-renew`, {});
  }

  /**
   * Lists all invoices generated for the tenant workspace.
   */
  getInvoices(): Observable<ApiResponse<BillingInvoice[]>> {
    return this.api.get<ApiResponse<BillingInvoice[]>>('api/billing/invoices');
  }
}

