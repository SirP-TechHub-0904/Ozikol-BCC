import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../../../environments/environment';
import {
  BillingService,
  BillingFeaturesSnapshot,
  BillingFeatureItem,
  BillingInvoice,
  BillingInvoiceDetail,
  BillingInvoiceLineItem,
  BillingPaymentMethodOption
} from './services/billing.service';
import { ToastService } from '../../../core/services/toast.service';
import { TranslationService } from '../../../core/services/translation.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

export interface SuiteFeatureGroup {
  suiteName: string;
  suiteLetter: string;
  suiteIndex: number;
  features: Array<BillingFeatureItem & { serialNo: number }>;
  availableCount: number;
  comingSoonCount: number;
}

export type BillingPageSection = 'features' | 'subscriptions' | 'invoice-detail';

/**
 * Billing, Features & Subscriptions Console (Suite 13).
 * Supports:
 * - /billing/features (with Simple Tab and Detailed Tab, one-click Install/Activate synced with Central)
 * - /billing/subscriptions (Active Installed Capabilities & Invoices Ledger)
 */
@Component({
  selector: 'app-billing-console',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslatePipe],
  templateUrl: './billing-console.component.html',
  styleUrls: ['./billing-console.component.css']
})
export class BillingConsoleComponent implements OnInit, OnDestroy {
  /**
   * Canonical ordering of the 11 platform suites matching the Master Feature Catalog (/centralwks/features).
   */
  static readonly CanonicalSuites: string[] = [
    'People, Community & Collaboration',
    'Workforce, Rota & Scheduling',
    'Reports, Forms & Analytics',
    'Events & Training Management',
    'Finance & Commercial Revenue',
    'Operations & Workflows',
    'Communication, AI & Support',
    'Compliance, Learning & Certification',
    'Demographics & Civic Census',
    'Life Events & Publications',
    'Workspace'
  ];

  activePage: BillingPageSection = 'features';
  featuresTab: 'simple' | 'detailed' = 'simple';
  viewMode: 'cards' | 'table' = 'cards';

  isLoading = false;
  togglingFeatureCode: string | null = null;
  payingFeatureCode: string | null = null;
  isPayingAllDue = false;
  private suppressNextSocketToast = false;

  // Filter & Search controls
  searchQuery = '';
  selectedSuite = '';
  availabilityFilter: 'all' | 'available' | 'coming_soon' = 'all';
  statusFilter: 'all' | 'active' | 'not_active' | 'coming_soon' = 'all';
  tierFilter: 'all' | 'compulsory' | 'optional' = 'all';

  // Table Sorting controls
  sortColumn: 'serialNo' | 'name' | 'suite' | 'amount' | 'duration' | 'status' | 'tier' = 'serialNo';
  sortDirection: 'asc' | 'desc' = 'asc';

  // Snapshot data from MasterCatalogDbContext via /api/billing/features
  snapshot: BillingFeaturesSnapshot = {
    tenantKey: 'workspace',
    serverTimeUtc: '',
    included: [],
    subscribed: [],
    available: [],
    notices: [],
    totalRecurringMonthly: 0
  };

  // Subscriptions & Invoices State (/billing/subscriptions & /billing/invoices/:id)
  invoices: BillingInvoice[] = [];
  invoiceStatusFilter: 'all' | 'pending' | 'completed' = 'all';
  selectedInvoice: BillingInvoice | null = null;
  showInvoiceModal = false;

  // Dedicated Full-Page Invoice & Multi-Gateway Checkout State (/billing/invoices/:id)
  activeInvoiceId: string | null = null;
  invoiceDetail: BillingInvoiceDetail | null = null;
  isLoadingInvoiceDetail = false;
  updatingCadenceFeatureCode: string | null = null;
  selectedGatewayCode: string = 'Paystack';
  isProcessingGatewayPayment = false;
  bankDepositReferenceInput = '';
  private paramMapSub: Subscription | null = null;

  // Feature Details Page / Modal
  selectedFeatureDetail: (BillingFeatureItem & { serialNo?: number; suiteLetter?: string }) | null = null;
  showFeatureDetailModal = false;
  pendingDetailFeatureCode: string | null = null;

  // Contextual Suite Info Modal
  showInfoModal = false;

  // Real-time WebSocket state (/hubs/notifications)
  isRealtimeConnected = false;
  private hubConnection: signalR.HubConnection | null = null;
  private routeSub: Subscription | null = null;
  private queryParamSub: Subscription | null = null;

  constructor(
    private billingService: BillingService,
    private toastService: ToastService,
    public translationService: TranslationService,
    private route: ActivatedRoute,
    private router: Router,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.resolveActivePageFromRoute();
    this.routeSub = this.route.data.subscribe(data => {
      this.resolveActivePageFromRoute(data?.['tab']);
    });

    this.paramMapSub = this.route.paramMap.subscribe(params => {
      const invId = params.get('id');
      if (invId && invId.trim()) {
        this.activePage = 'invoice-detail';
        this.activeInvoiceId = invId.trim();
        this.loadInvoiceDetailPage(this.activeInvoiceId);
      } else {
        this.activeInvoiceId = null;
      }
    });

    this.queryParamSub = this.route.queryParamMap.subscribe(params => {
      const code = params.get('feature');
      if (code && code.trim()) {
        this.activePage = 'features';
        this.pendingDetailFeatureCode = code.trim().toLowerCase();
        this.resolveSelectedFeatureFromCode(this.pendingDetailFeatureCode);
      } else {
        this.pendingDetailFeatureCode = null;
        this.selectedFeatureDetail = null;
        this.showFeatureDetailModal = false;
      }
    });

    this.loadSnapshot();
    this.loadInvoices();
    this.startRealtimeSocket();
  }

  ngOnDestroy(): void {
    if (this.routeSub) {
      this.routeSub.unsubscribe();
    }
    if (this.paramMapSub) {
      this.paramMapSub.unsubscribe();
    }
    if (this.queryParamSub) {
      this.queryParamSub.unsubscribe();
    }
    if (this.hubConnection) {
      this.hubConnection.stop().catch(() => {});
      this.hubConnection = null;
    }
  }

  /**
   * Resolves which Billing section is active based on the URL or route data.
   */
  private resolveActivePageFromRoute(tabData?: string): void {
    const url = (this.router.url || '').toLowerCase();
    const paramId = this.route.snapshot.paramMap.get('id');
    if (tabData === 'invoice-detail' || paramId || /\/billing\/invoices\/[0-9a-f-]+/i.test(url)) {
      this.activePage = 'invoice-detail';
    } else if (tabData === 'subscriptions' || tabData === 'invoices' || url.includes('/billing/subscriptions') || url.includes('/billing/invoices')) {
      this.activePage = 'subscriptions';
    } else {
      this.activePage = 'features';
    }
  }

  /**
   * Computes a deterministic signature of capability availability and menu activation state
   * so that invoice-only or non-menu background updates never trigger a false "Central Catalog Synchronized" toast.
   */
  private computeSnapshotMenuSignature(snap?: BillingFeaturesSnapshot): string {
    if (!snap) return '';
    const all = [...(snap.included || []), ...(snap.subscribed || []), ...(snap.available || [])];
    if (all.length === 0) return '';
    return all
      .map(f => `${f.featureCode}:${f.isActive ? 1 : 0}:${f.isAvailableForUse ? 1 : 0}:${f.effectivePrice ?? f.monthlyPrice}`)
      .sort()
      .join('|');
  }

  /**
   * Broadcasts the latest feature snapshot to the global window so AdminLayoutComponent
   * immediately updates the sidebar navigation menu without a page reload.
   */
  private broadcastSnapshotToSidebar(snap: BillingFeaturesSnapshot): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tenant_features_updated', { detail: snap }));
    }
  }

  /**
   * Establishes a real-time SignalR WebSocket connection to /hubs/notifications
   * so any capability or policy toggled in Central (/centralwks/tenants/features) updates the UI and menu automatically.
   */
  private startRealtimeSocket(): void {
    const apiOrigin = environment.apiUrl.startsWith('http')
      ? environment.apiUrl.replace(/\/api\/?$/, '')
      : typeof window !== 'undefined'
        ? `${window.location.origin}${environment.apiUrl.replace(/\/api\/?$/, '')}`
        : '';

    const tenantKey =
      localStorage.getItem('tenant_key') ||
      localStorage.getItem('tenant_domain') ||
      'workspace';

    const hubUrl = `${apiOrigin}/hubs/notifications?tenantKey=${encodeURIComponent(tenantKey)}`;

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl)
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    this.hubConnection.on('BillingUpdated', (incoming: BillingFeaturesSnapshot) => {
      this.ngZone.run(() => {
        if (incoming) {
          const prevSig = this.computeSnapshotMenuSignature(this.snapshot);
          const nextSig = this.computeSnapshotMenuSignature(incoming);
          this.snapshot = incoming;
          this.broadcastSnapshotToSidebar(incoming);
          if (this.selectedFeatureDetail) {
            const refreshed = this.allOrderedFeatures.find(
              f => f.featureCode === this.selectedFeatureDetail?.featureCode
            );
            if (refreshed) {
              this.selectedFeatureDetail = refreshed;
            } else {
              this.closeFeatureDetail();
            }
          }
          if (this.suppressNextSocketToast) {
            this.suppressNextSocketToast = false;
          } else if (this.activePage !== 'invoice-detail' && prevSig !== '' && prevSig !== nextSig) {
            this.toastService.info(
              'Central Catalog Synchronized',
              'Capabilities, availability, and menu items updated in real time.'
            );
          }
        }
      });
    });

    this.hubConnection
      .start()
      .then(() => {
        this.ngZone.run(() => {
          this.isRealtimeConnected = true;
        });
      })
      .catch(() => {
        this.ngZone.run(() => {
          this.isRealtimeConnected = false;
        });
      });

    this.hubConnection.onclose(() => {
      this.ngZone.run(() => {
        this.isRealtimeConnected = false;
      });
    });

    this.hubConnection.onreconnected(() => {
      this.ngZone.run(() => {
        this.isRealtimeConnected = true;
        this.loadSnapshot();
      });
    });
  }

  /**
   * Loads the live Master Feature Catalog snapshot from the backend API.
   */
  loadSnapshot(): void {
    this.isLoading = true;
    this.billingService.getFeaturesSnapshot().subscribe({
      next: res => {
        this.isLoading = false;
        const ok = Boolean(res && (res.success || res.isSuccess) && res.data);
        if (ok) {
          this.snapshot = res.data;
          this.broadcastSnapshotToSidebar(res.data);
          if (this.pendingDetailFeatureCode) {
            this.resolveSelectedFeatureFromCode(this.pendingDetailFeatureCode);
          } else if (this.selectedFeatureDetail) {
            this.resolveSelectedFeatureFromCode(this.selectedFeatureDetail.featureCode);
          }
        }
      },
      error: err => {
        this.isLoading = false;
        console.warn('Failed to load Master Feature Catalog snapshot:', err);
      }
    });
  }

  /**
   * Resolves and opens the Feature Details view for a specific featureCode.
   */
  private resolveSelectedFeatureFromCode(code: string): void {
    if (!code) return;
    const clean = code.trim().toLowerCase();
    const matched = this.allOrderedFeatures.find(f => f.featureCode?.toLowerCase() === clean);
    if (matched) {
      this.selectedFeatureDetail = matched;
      this.showFeatureDetailModal = false;
    }
  }

  /**
   * Installs/activates or deactivates a capability for this tenant workspace.
   * Immediately updates Central MasterCatalogDbContext and refreshes the sidebar menu.
   */
  toggleFeatureInstall(feat: BillingFeatureItem, targetActive?: boolean): void {
    if (!feat.isAvailableForUse && targetActive !== false) {
      this.toastService.warning(
        'Coming Soon',
        `'${feat.name}' is Coming Soon and not yet available for installation.`
      );
      return;
    }

    const desiredState = targetActive !== undefined ? targetActive : !feat.isActive;

    // If activating or renewing a paid capability when no first-time free trial applies,
    // launch the Central Paystack Inline Checkout instead of bypassing payment.
    if (desiredState && !feat.isCompulsory && this.getFeatureDisplayAmount(feat) > 0 && !feat.isEligibleForFreeTrial) {
      this.payAndRenewFeature(feat);
      return;
    }

    this.togglingFeatureCode = feat.featureCode;
    this.suppressNextSocketToast = true;

    this.billingService.toggleFeatureActive(feat.featureId, feat.featureCode, desiredState).subscribe({
      next: res => {
        this.togglingFeatureCode = null;
        const ok = Boolean(res && (res.success || res.isSuccess) && res.data);
        if (ok) {
          this.snapshot = res.data;
          this.broadcastSnapshotToSidebar(res.data);
          if (this.selectedFeatureDetail && this.selectedFeatureDetail.featureCode === feat.featureCode) {
            const updated = this.allOrderedFeatures.find(x => x.featureCode === feat.featureCode);
            if (updated) this.selectedFeatureDetail = updated;
          }
          if (desiredState) {
            this.toastService.success(
              feat.isEligibleForFreeTrial ? 'Free Trial Started & Activated' : 'Capability Installed & Activated',
              res.message || `'${feat.name}' is now Active and visible in your sidebar menu.`
            );
          } else {
            this.toastService.info(
              'Capability Deactivated',
              `'${feat.name}' has been deactivated and removed from your sidebar menu.`
            );
          }
        } else {
          this.suppressNextSocketToast = false;
          this.toastService.error('Update Failed', res?.message || 'Could not update capability status.');
        }
      },
      error: err => {
        this.togglingFeatureCode = null;
        this.suppressNextSocketToast = false;
        const msg = err?.error?.message || 'Could not synchronize capability activation with Central.';
        this.toastService.error('Update Failed', msg);
      }
    });
  }

  /**
   * Automatically prepares an invoice for ONLY the clicked capability (even if other capabilities are also expiring)
   * and navigates to the dedicated full-page Invoice & Multi-Gateway Checkout screen (/billing/invoices/:id).
   */
  payAndRenewFeature(feat: BillingFeatureItem): void {
    if (!feat || !feat.featureCode) return;
    this.payingFeatureCode = feat.featureCode;
    this.billingService.prepareInvoice([feat.featureCode], feat.billingCadence || 'Monthly').subscribe({
      next: res => {
        this.payingFeatureCode = null;
        const ok = Boolean(res && (res.success || res.isSuccess) && res.data?.invoiceId);
        if (ok && res.data?.invoiceId) {
          this.loadInvoices();
          this.router.navigate(['/billing/invoices', res.data.invoiceId]);
        } else {
          this.toastService.error('Invoice Error', res?.message || 'Could not generate invoice for this capability.');
        }
      },
      error: err => {
        this.payingFeatureCode = null;
        const msg = err?.error?.message || 'Could not prepare invoice for this capability.';
        this.toastService.error('Invoice Error', msg);
      }
    });
  }

  /**
   * Automatically prepares a consolidated invoice containing all expiring/overdue capabilities
   * and navigates to the dedicated full-page Invoice & Multi-Gateway Checkout screen (/billing/invoices/:id).
   */
  payAllExpiringFeatures(): void {
    const due = this.expiringOrExpiredFeatures;
    if (due.length === 0) return;
    this.isPayingAllDue = true;
    const codes = due.map(f => f.featureCode);
    this.billingService.prepareInvoice(codes).subscribe({
      next: res => {
        this.isPayingAllDue = false;
        const ok = Boolean(res && (res.success || res.isSuccess) && res.data?.invoiceId);
        if (ok && res.data?.invoiceId) {
          this.loadInvoices();
          this.router.navigate(['/billing/invoices', res.data.invoiceId]);
        } else {
          this.toastService.error('Invoice Error', res?.message || 'Could not prepare consolidated invoice.');
        }
      },
      error: err => {
        this.isPayingAllDue = false;
        const msg = err?.error?.message || 'Could not prepare consolidated invoice.';
        this.toastService.error('Invoice Error', msg);
      }
    });
  }

  /**
   * Loads the full invoice details and Central payment methods availability for /billing/invoices/:id.
   */
  loadInvoiceDetailPage(invoiceId: string): void {
    if (!invoiceId) return;
    this.isLoadingInvoiceDetail = true;
    this.billingService.getInvoiceDetail(invoiceId).subscribe({
      next: res => {
        this.isLoadingInvoiceDetail = false;
        const ok = Boolean(res && (res.success || res.isSuccess) && res.data);
        if (ok && res.data) {
          this.invoiceDetail = res.data;
          this.bankDepositReferenceInput = res.data.paymentProofRef || '';
          const firstConfigured = (res.data.paymentMethods || []).find(m => m.isEnabled && m.isConfigured);
          if (firstConfigured) {
            this.selectedGatewayCode = firstConfigured.providerCode;
          } else if (res.data.paymentMethods?.length > 0) {
            this.selectedGatewayCode = res.data.paymentMethods[0].providerCode;
          }
        } else {
          this.toastService.error('Invoice Not Found', res?.message || 'Could not load invoice details.');
        }
      },
      error: err => {
        this.isLoadingInvoiceDetail = false;
        const msg = err?.error?.message || 'Could not load invoice details.';
        this.toastService.error('Invoice Error', msg);
      }
    });
  }

  /**
   * Dynamically updates the billing duration (1 Month, 3 Months, 1 Year) for a capability line item on the invoice
   * and recalculates its discount and the invoice total.
   */
  onChangeInvoiceLineCadence(line: BillingInvoiceLineItem, newCadence: string): void {
    if (!this.invoiceDetail || !line || this.invoiceDetail.status !== 'Pending') return;
    this.updatingCadenceFeatureCode = line.featureCode;
    this.billingService.updateInvoiceLineCadence(this.invoiceDetail.id, newCadence, line.featureCode).subscribe({
      next: res => {
        this.updatingCadenceFeatureCode = null;
        const ok = Boolean(res && (res.success || res.isSuccess) && res.data);
        if (ok && res.data) {
          this.invoiceDetail = res.data;
          this.loadInvoices();
          this.toastService.success(
            'Duration & Discount Updated',
            `${line.featureName} set to ${this.formatCadenceOptionLabel(newCadence)}.`
          );
        } else {
          this.toastService.error('Update Failed', res?.message || 'Could not update billing duration.');
        }
      },
      error: err => {
        this.updatingCadenceFeatureCode = null;
        this.toastService.error('Update Failed', err?.error?.message || 'Could not update billing duration.');
      }
    });
  }

  /**
   * Formats a cadence code ('Monthly', 'Quarterly', 'Yearly') into a clear duration label.
   */
  formatCadenceOptionLabel(cadence: string, line?: BillingInvoiceLineItem): string {
    const clean = (cadence || 'Monthly').trim().toLowerCase();
    if (clean === 'yearly') {
      if (line && line.isYearlyOnly) {
        return '1 Year (Yearly Only)';
      }
      if (line && line.yearlyDiscountPercent > 0) {
        return `1 Year (Save ${line.yearlyDiscountPercent}%)`;
      }
      return '1 Year (Annual)';
    }
    if (clean === 'quarterly') {
      if (line && line.quarterlyDiscountPercent > 0) {
        return `3 Months (Save ${line.quarterlyDiscountPercent}%)`;
      }
      return '3 Months (Quarterly)';
    }
    return '1 Month (Monthly)';
  }

  /**
   * Resolves the clean display name for a payment gateway option.
   */
  getGatewayCleanName(method?: BillingPaymentMethodOption): string {
    if (!method) return '';
    if (method.providerCode === 'Paystack') return 'Paystack';
    if (method.providerCode === 'Flutterwave') return 'Flutterwave';
    if (method.providerCode === 'Stripe') return 'Stripe';
    if (method.providerCode === 'BankDeposit') {
      return this.translationService.translate('billing.direct_bank_deposit', 'Direct Bank Deposit');
    }
    return method.name;
  }

  /**
   * Selects an active, configured payment gateway on the Invoice Page.
   */
  selectPaymentGateway(method: BillingPaymentMethodOption): void {
    if (!method.isConfigured) {
      const gwName = this.getGatewayCleanName(method);
      const notEnabledText = this.translationService.translate('billing.not_enabled', 'not enabled');
      this.toastService.warning(
        this.translationService.translate('billing.not_enabled_title', 'Not Enabled'),
        `${gwName} ${notEnabledText}.`
      );
      return;
    }
    this.selectedGatewayCode = method.providerCode;
  }

  get activeSelectedGateway(): BillingPaymentMethodOption | undefined {
    return (this.invoiceDetail?.paymentMethods || []).find(m => m.providerCode === this.selectedGatewayCode);
  }

  /**
   * Proceeds with payment on /billing/invoices/:id using the selected payment gateway.
   */
  proceedWithSelectedGatewayPayment(): void {
    if (!this.invoiceDetail) return;
    const method = this.activeSelectedGateway;
    if (!method || !method.isConfigured) {
      const gwName = this.getGatewayCleanName(method) || 'Payment method';
      const notEnabledText = this.translationService.translate('billing.not_enabled', 'not enabled');
      this.toastService.warning(
        this.translationService.translate('billing.not_enabled_title', 'Not Enabled'),
        `${gwName} ${notEnabledText}.`
      );
      return;
    }

    if (method.providerCode === 'Paystack') {
      this.launchPaystackForCurrentInvoice();
      return;
    }

    if (method.providerCode === 'BankDeposit') {
      this.submitBankDepositProof();
      return;
    }

    this.toastService.info(
      `${method.name} Selected`,
      `Redirecting to ${method.name} checkout for Invoice ${this.invoiceDetail.invoiceNumber}...`
    );
  }

  /**
   * Initializes Paystack checkout for the current invoice on /billing/invoices/:id.
   */
  private launchPaystackForCurrentInvoice(): void {
    if (!this.invoiceDetail) return;
    this.isProcessingGatewayPayment = true;
    const inv = this.invoiceDetail;
    const label = inv.invoiceNumber;

    this.billingService.payInvoiceWithPaystack(inv.id).subscribe({
      next: async res => {
        const ok = Boolean(res && (res.success || res.isSuccess) && res.data);
        if (!ok || !res.data) {
          this.isProcessingGatewayPayment = false;
          this.toastService.error('Paystack Checkout Error', res?.message || 'Could not initialize Paystack checkout.');
          return;
        }

        const init = res.data;
        try {
          await this.ensurePaystackScriptLoaded();
          const win = window as any;

          if (win.PaystackPop && init.publicKey) {
            const handler = win.PaystackPop.setup({
              key: init.publicKey,
              email: init.email || inv.billingEmail || 'billing@company.com',
              amount: Math.round(Number(init.amount) * 100),
              currency: init.currency || inv.currency || 'NGN',
              ref: init.reference,
              access_code: init.accessCode || undefined,
              callback: (response: any) => {
                this.ngZone.run(() => {
                  const verifiedRef = response?.reference || init.reference;
                  this.verifyPaystackPayment(verifiedRef, label);
                });
              },
              onClose: () => {
                this.ngZone.run(() => {
                  this.isProcessingGatewayPayment = false;
                  this.toastService.info('Checkout Closed', `Paystack window for ${label} was closed.`);
                });
              }
            });
            handler.openIframe();
          } else if (init.authorizationUrl) {
            this.isProcessingGatewayPayment = false;
            window.open(init.authorizationUrl, '_blank', 'noopener,noreferrer');
          } else {
            this.isProcessingGatewayPayment = false;
            this.toastService.error('Paystack Key Missing', 'Please configure your Central Paystack Public Key in /centralwks/platform-settings.');
          }
        } catch {
          this.isProcessingGatewayPayment = false;
          this.toastService.error('Paystack Script Error', 'Could not load Paystack Inline script.');
        }
      },
      error: err => {
        this.isProcessingGatewayPayment = false;
        const msg = err?.error?.message || 'Paystack initialization failed. Please check Central Paystack keys in /centralwks/platform-settings.';
        this.toastService.error('Paystack Checkout Error', msg);
      }
    });
  }

  /**
   * Submits a Direct Bank Deposit transfer reference for the current invoice on /billing/invoices/:id.
   */
  submitBankDepositProof(): void {
    if (!this.invoiceDetail) return;
    const ref = (this.bankDepositReferenceInput || '').trim();
    if (!ref) {
      this.toastService.warning('Transfer Reference Required', 'Please enter your bank transfer reference or depositor narration.');
      return;
    }

    this.isProcessingGatewayPayment = true;
    this.billingService.submitInvoiceBankDeposit(this.invoiceDetail.id, ref).subscribe({
      next: res => {
        this.isProcessingGatewayPayment = false;
        const ok = Boolean(res && (res.success || res.isSuccess) && res.data);
        if (ok && res.data) {
          this.invoiceDetail = res.data;
          this.loadInvoices();
          this.toastService.success(
            'Bank Deposit Reference Submitted',
            res.message || `Transfer reference '${ref}' recorded for Invoice ${this.invoiceDetail.invoiceNumber}.`
          );
        } else {
          this.toastService.error('Submission Failed', res?.message || 'Could not submit bank transfer reference.');
        }
      },
      error: err => {
        this.isProcessingGatewayPayment = false;
        this.toastService.error('Submission Failed', err?.error?.message || 'Could not submit bank transfer reference.');
      }
    });
  }

  /**
   * Verifies a completed Paystack payment reference on the server and updates the capability posture & invoices.
   */
  private verifyPaystackPayment(reference: string, label: string): void {
    this.suppressNextSocketToast = true;
    this.billingService.verifyPaystackFeaturePayment(reference).subscribe({
      next: res => {
        this.payingFeatureCode = null;
        this.isPayingAllDue = false;
        this.isProcessingGatewayPayment = false;
        const ok = Boolean(res && (res.success || res.isSuccess) && res.data);
        if (ok) {
          this.snapshot = res.data;
          this.broadcastSnapshotToSidebar(res.data);
          this.loadInvoices();
          if (this.activeInvoiceId) {
            this.loadInvoiceDetailPage(this.activeInvoiceId);
          }
          if (this.selectedFeatureDetail) {
            const refreshed = this.allOrderedFeatures.find(
              f => f.featureCode === this.selectedFeatureDetail?.featureCode
            );
            if (refreshed) this.selectedFeatureDetail = refreshed;
          }
          this.toastService.success(
            'Payment Verified & Subscription Renewed',
            res.message || `Payment confirmed! '${label}' has been renewed and activated.`
          );
        } else {
          this.suppressNextSocketToast = false;
          this.toastService.error('Verification Failed', res?.message || 'Could not verify Paystack transaction.');
        }
      },
      error: err => {
        this.payingFeatureCode = null;
        this.isPayingAllDue = false;
        this.isProcessingGatewayPayment = false;
        this.suppressNextSocketToast = false;
        const msg = err?.error?.message || 'Error verifying Paystack transaction with server.';
        this.toastService.error('Verification Error', msg);
      }
    });
  }

  /**
   * Dynamically loads https://js.paystack.co/v1/inline.js once per session for Paystack Inline Popup.
   */
  private ensurePaystackScriptLoaded(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || typeof document === 'undefined') {
        resolve();
        return;
      }
      if ((window as any).PaystackPop) {
        resolve();
        return;
      }
      const existing = document.querySelector('script[src="https://js.paystack.co/v1/inline.js"]') as HTMLScriptElement | null;
      if (existing) {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject());
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject();
      document.head.appendChild(script);
    });
  }

  /**
   * Toggles auto-renewal for a subscribed capability on /billing/subscriptions.
   */
  toggleAutoRenew(feat: BillingFeatureItem): void {
    if (!feat.subscriptionId) return;
    this.billingService.toggleAutoRenew(feat.subscriptionId).subscribe({
      next: res => {
        if (res && (res.success || res.isSuccess)) {
          feat.autoRenew = res.data;
          this.toastService.success(
            'Auto-Renew Updated',
            `Auto-renew for '${feat.name}' is now ${feat.autoRenew ? 'Enabled' : 'Disabled'}.`
          );
        }
      },
      error: () => {
        this.toastService.error('Error', 'Failed to update auto-renew preference.');
      }
    });
  }

  // ── Invoices & Subscriptions Ledger Actions (/billing/subscriptions) ──
  loadInvoices(): void {
    this.billingService.getInvoices().subscribe({
      next: res => {
        if (res && (res.success || res.isSuccess) && Array.isArray(res.data)) {
          this.invoices = res.data;
        }
      },
      error: () => {}
    });
  }

  get activeInstalledFeatures(): Array<BillingFeatureItem & { serialNo: number; suiteLetter: string }> {
    return this.allOrderedFeatures.filter(f => f.isActive || f.status === 'Expired');
  }

  /**
   * Capabilities that are expired or expiring within 30 days and have a payable amount.
   */
  get expiringOrExpiredFeatures(): Array<BillingFeatureItem & { serialNo: number; suiteLetter: string }> {
    return this.activeInstalledFeatures.filter(
      f => !f.isCompulsory && this.getFeatureDisplayAmount(f) > 0 && (f.status === 'Expired' || (f.daysRemaining ?? 999) <= 30)
    );
  }

  /**
   * Consolidated total amount due across all capabilities expiring within 30 days or overdue.
   */
  get totalExpiringAmountDue(): number {
    return this.expiringOrExpiredFeatures.reduce((sum, f) => sum + this.getFeatureDisplayAmount(f), 0);
  }

  get filteredInvoices(): BillingInvoice[] {
    if (this.invoiceStatusFilter === 'pending') {
      return this.invoices.filter(i => i.status?.toLowerCase() === 'pending');
    }
    if (this.invoiceStatusFilter === 'completed') {
      return this.invoices.filter(i => i.status?.toLowerCase() !== 'pending');
    }
    return this.invoices;
  }

  get pendingInvoicesCount(): number {
    return this.invoices.filter(i => i.status?.toLowerCase() === 'pending').length;
  }

  get pendingInvoicedAmount(): number {
    return this.invoices
      .filter(i => i.status?.toLowerCase() === 'pending')
      .reduce((acc, item) => acc + (item.amount || 0), 0);
  }

  /**
   * Navigates to the dedicated full-page Invoice & Multi-Gateway Checkout view (/billing/invoices/:id).
   *
   * @param inv The billing invoice item to inspect or pay.
   */
  openInvoiceDetail(inv: BillingInvoice): void {
    this.router.navigate(['/billing/invoices', inv.id]);
  }

  /**
   * Returns from the dedicated Invoice & Checkout page back to /billing/subscriptions.
   */
  closeInvoiceDetail(): void {
    this.showInvoiceModal = false;
    this.selectedInvoice = null;
    this.router.navigate(['/billing/subscriptions']);
  }

  /**
   * Resolves the 0-based suite order index from dynamic SuiteSortOrder (MasterFeatureSuites) with fallback to CanonicalSuites.
   */
  getSuiteOrder(category?: string): number {
    if (!category) return 999;
    const clean = category.trim().toLowerCase();
    const combined: BillingFeatureItem[] = [
      ...(this.snapshot.included || []),
      ...(this.snapshot.subscribed || []),
      ...(this.snapshot.available || [])
    ];
    const matched = combined.find(f => {
      if (!f || !f.category || f.suiteSortOrder === undefined || f.suiteSortOrder <= 0) return false;
      const rawCat = f.category.trim().toLowerCase();
      const transCat = this.translationService.translateDynamic(f.category).trim().toLowerCase();
      return rawCat === clean || transCat === clean;
    });
    if (matched && matched.suiteSortOrder !== undefined) {
      return matched.suiteSortOrder - 1;
    }
    const idx = BillingConsoleComponent.CanonicalSuites.findIndex(
      s => s.toLowerCase() === clean || this.translationService.translateDynamic(s).toLowerCase() === clean
    );
    return idx >= 0 ? idx : 500;
  }

  /**
   * Resolves the Suite Letter (A - K) for a given suite category based on its dynamic SuiteSortOrder.
   */
  getSuiteLetter(category?: string): string {
    const idx = this.getSuiteOrder(category);
    if (idx >= 0 && idx < 26) {
      return String.fromCharCode(65 + idx);
    }
    return '•';
  }

  /**
   * All published capabilities from Central for this tenant combined and ordered strictly by SuiteSortOrder and Feature SortOrder.
   * Includes both Available (isAvailableForUse == true) and Coming Soon (isAvailableForUse == false) capabilities.
   */
  get allOrderedFeatures(): Array<BillingFeatureItem & { serialNo: number; suiteLetter: string }> {
    const combined: BillingFeatureItem[] = [
      ...(this.snapshot.included || []),
      ...(this.snapshot.subscribed || []),
      ...(this.snapshot.available || [])
    ];

    const byCode = new Map<string, BillingFeatureItem>();
    for (const f of combined) {
      if (!f || !f.featureCode) continue;
      const code = f.featureCode.toLowerCase();
      if (f.isPublished === false) {
        continue;
      }
      byCode.set(code, f);
    }

    const published = Array.from(byCode.values());

    const sorted = published.sort((a, b) => {
      const aSuite = (a.suiteSortOrder && a.suiteSortOrder > 0) ? (a.suiteSortOrder - 1) : this.getSuiteOrder(a.category);
      const bSuite = (b.suiteSortOrder && b.suiteSortOrder > 0) ? (b.suiteSortOrder - 1) : this.getSuiteOrder(b.category);
      const suiteDiff = aSuite - bSuite;
      if (suiteDiff !== 0) return suiteDiff;
      const orderDiff = (a.sortOrder ?? 999) - (b.sortOrder ?? 999);
      if (orderDiff !== 0) return orderDiff;
      return (a.name || '').localeCompare(b.name || '');
    });

    return sorted.map((item, idx) => ({
      ...item,
      name: this.translationService.translateDynamic(item.name || ''),
      menuTitle: this.translationService.translateDynamic(item.menuTitle || item.name || ''),
      description: this.translationService.translateDynamic(item.description || ''),
      category: this.translationService.translateDynamic(item.category || 'Operations'),
      suiteMenuTitle: item.suiteMenuTitle ? this.translationService.translateDynamic(item.suiteMenuTitle) : undefined,
      serialNo: (item.sortOrder && item.sortOrder > 0) ? item.sortOrder : (idx + 1),
      suiteLetter: this.getSuiteLetter(item.category)
    }));
  }

  /**
   * Distinct suites present in the catalog arranged in canonical order.
   */
  get canonicalSuiteOptions(): Array<{ name: string; letter: string; count: number }> {
    const all = this.allOrderedFeatures;
    const map = new Map<string, number>();
    for (const f of all) {
      const cat = f.category || 'Operations';
      map.set(cat, (map.get(cat) || 0) + 1);
    }

    const keys = Array.from(map.keys()).sort(
      (a, b) => this.getSuiteOrder(a) - this.getSuiteOrder(b)
    );

    return keys.map(k => ({
      name: k,
      letter: this.getSuiteLetter(k),
      count: map.get(k) || 0
    }));
  }

  /**
   * Filtered capabilities based on search keyword, suite, availability, active status, and tier class,
   * sorted by the active table column and direction.
   */
  get filteredFeatures(): Array<BillingFeatureItem & { serialNo: number; suiteLetter: string }> {
    const term = this.searchQuery.trim().toLowerCase();

    const filtered = this.allOrderedFeatures.filter(f => {
      if (term) {
        const matchName = f.name?.toLowerCase().includes(term);
        const matchCode = f.featureCode?.toLowerCase().includes(term);
        const matchCat = f.category?.toLowerCase().includes(term);
        const matchDesc = f.description?.toLowerCase().includes(term);
        if (!matchName && !matchCode && !matchCat && !matchDesc) {
          return false;
        }
      }

      if (this.selectedSuite && f.category?.toLowerCase() !== this.selectedSuite.toLowerCase()) {
        return false;
      }

      if (this.statusFilter === 'active' && !f.isActive) {
        return false;
      }
      if (this.statusFilter === 'not_active' && (f.isActive || !f.isAvailableForUse)) {
        return false;
      }
      if (this.statusFilter === 'coming_soon' && f.isAvailableForUse) {
        return false;
      }

      if (this.availabilityFilter === 'available' && !f.isAvailableForUse) {
        return false;
      }
      if (this.availabilityFilter === 'coming_soon' && f.isAvailableForUse) {
        return false;
      }

      if (this.tierFilter === 'compulsory' && !f.isCompulsory) {
        return false;
      }
      if (this.tierFilter === 'optional' && f.isCompulsory) {
        return false;
      }

      return true;
    });

    const dir = this.sortDirection === 'asc' ? 1 : -1;
    return filtered.sort((a, b) => {
      let cmp = 0;
      switch (this.sortColumn) {
        case 'serialNo':
          cmp = (a.serialNo || 0) - (b.serialNo || 0);
          break;
        case 'name':
          cmp = (a.name || '').localeCompare(b.name || '');
          break;
        case 'suite':
          cmp = this.getSuiteOrder(a.category) - this.getSuiteOrder(b.category);
          if (cmp === 0) cmp = (a.serialNo || 0) - (b.serialNo || 0);
          break;
        case 'amount':
          cmp = this.getFeatureDisplayAmount(a) - this.getFeatureDisplayAmount(b);
          if (cmp === 0) cmp = (a.serialNo || 0) - (b.serialNo || 0);
          break;
        case 'duration':
          cmp = this.getFeatureDurationLabel(a).localeCompare(this.getFeatureDurationLabel(b));
          if (cmp === 0) cmp = (a.serialNo || 0) - (b.serialNo || 0);
          break;
        case 'status':
          cmp = this.getFeatureStatusRank(a) - this.getFeatureStatusRank(b);
          if (cmp === 0) cmp = (a.serialNo || 0) - (b.serialNo || 0);
          break;
        case 'tier':
          cmp = (a.isCompulsory === b.isCompulsory) ? 0 : (a.isCompulsory ? -1 : 1);
          if (cmp === 0) cmp = (a.serialNo || 0) - (b.serialNo || 0);
          break;
      }
      return cmp * dir;
    });
  }

  /**
   * Toggles table sorting by the specified column.
   */
  toggleSort(column: 'serialNo' | 'name' | 'suite' | 'amount' | 'duration' | 'status' | 'tier'): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
  }

  /**
   * Returns the Material icon name for a sortable column header.
   */
  getSortIcon(column: 'serialNo' | 'name' | 'suite' | 'amount' | 'duration' | 'status' | 'tier'): string {
    if (this.sortColumn !== column) {
      return 'unfold_more';
    }
    return this.sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward';
  }

  /**
   * Resolves the numeric subscription amount for a feature in the tenant's active currency.
   */
  getFeatureDisplayAmount(feat: BillingFeatureItem): number {
    if (!feat) return 0;
    if (feat.effectivePrice && feat.effectivePrice > 0) {
      return Number(feat.effectivePrice);
    }
    if (feat.monthlyPrice && feat.monthlyPrice > 0) {
      return Number(feat.monthlyPrice);
    }
    if (feat.yearlyPrice && feat.yearlyPrice > 0) {
      return Number(feat.yearlyPrice);
    }
    return 0;
  }

  /**
   * Resolves the human-readable billing duration / cadence label for a feature.
   */
  getFeatureDurationLabel(feat: BillingFeatureItem): string {
    if (!feat) return 'Monthly';
    const amt = this.getFeatureDisplayAmount(feat);
    if (amt <= 0) {
      return 'Lifetime / Free';
    }
    const cadence = (feat.billingCadence || '').trim().toLowerCase();
    if (cadence === 'yearly' || (feat.monthlyPrice <= 0 && feat.yearlyPrice > 0)) {
      return 'Yearly';
    }
    if (cadence === 'quarterly') {
      return 'Quarterly';
    }
    return 'Monthly';
  }

  /**
   * Resolves a numeric rank for sorting by feature status (1 = Active, 2 = Not Active / Available, 3 = Coming Soon).
   */
  private getFeatureStatusRank(feat: BillingFeatureItem): number {
    if (feat.isActive) return 1;
    if (feat.isAvailableForUse) return 2;
    return 3;
  }

  /**
   * Filtered capabilities grouped by canonical suite for the Suite Cards view.
   */
  get groupedSuites(): SuiteFeatureGroup[] {
    const filtered = this.filteredFeatures;
    const groupsMap = new Map<string, Array<BillingFeatureItem & { serialNo: number }>>();

    for (const item of filtered) {
      const cat = item.category || 'Operations';
      if (!groupsMap.has(cat)) {
        groupsMap.set(cat, []);
      }
      groupsMap.get(cat)!.push(item);
    }

    const sortedSuites = Array.from(groupsMap.keys()).sort(
      (a, b) => this.getSuiteOrder(a) - this.getSuiteOrder(b)
    );

    return sortedSuites.map(suiteName => {
      const feats = groupsMap.get(suiteName) || [];
      return {
        suiteName,
        suiteLetter: this.getSuiteLetter(suiteName),
        suiteIndex: this.getSuiteOrder(suiteName) + 1,
        features: feats,
        availableCount: feats.filter(x => x.isAvailableForUse).length,
        comingSoonCount: feats.filter(x => !x.isAvailableForUse).length
      };
    });
  }

  // ── KPI Summary Counters & Currency Helpers ──
  get currencySymbol(): string {
    return this.snapshot?.currencySymbol || '$';
  }

  get currencyCode(): string {
    return this.snapshot?.currencyCode || 'USD';
  }

  /**
   * Formats a numeric amount in the tenant's running currency determined from Central.
   */
  formatAmount(amount?: number): string {
    const val = Number(amount || 0);
    return `${this.currencySymbol}${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  get totalSuitesCount(): number {
    return this.canonicalSuiteOptions.length;
  }

  get totalCapabilitiesCount(): number {
    return this.allOrderedFeatures.length;
  }

  get activeCapabilitiesCount(): number {
    return this.allOrderedFeatures.filter(f => f.isActive).length;
  }

  get availableForUseCount(): number {
    return this.allOrderedFeatures.filter(f => f.isAvailableForUse).length;
  }

  get comingSoonCount(): number {
    return this.allOrderedFeatures.filter(f => !f.isAvailableForUse).length;
  }

  get compulsoryCount(): number {
    return this.allOrderedFeatures.filter(f => f.isCompulsory).length;
  }

  get hasActiveFilters(): boolean {
    return (
      this.searchQuery.trim().length > 0 ||
      this.selectedSuite !== '' ||
      this.availabilityFilter !== 'all' ||
      this.statusFilter !== 'all' ||
      this.tierFilter !== 'all' ||
      this.sortColumn !== 'serialNo' ||
      this.sortDirection !== 'asc'
    );
  }

  // ── UI Filter & Modal Actions ──
  filterByAvailability(filter: 'all' | 'available' | 'coming_soon'): void {
    this.availabilityFilter = this.availabilityFilter === filter ? 'all' : filter;
  }

  filterByTier(tier: 'all' | 'compulsory' | 'optional'): void {
    this.tierFilter = this.tierFilter === tier ? 'all' : tier;
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.selectedSuite = '';
    this.availabilityFilter = 'all';
    this.statusFilter = 'all';
    this.tierFilter = 'all';
    this.sortColumn = 'serialNo';
    this.sortDirection = 'asc';
  }

  openFeatureDetail(feat: BillingFeatureItem & { serialNo?: number; suiteLetter?: string }): void {
    this.selectedFeatureDetail = feat;
    this.showFeatureDetailModal = false;
    this.router.navigate(['/billing/features'], {
      queryParams: { feature: feat.featureCode },
      queryParamsHandling: 'merge'
    });
  }

  closeFeatureDetail(): void {
    this.showFeatureDetailModal = false;
    this.selectedFeatureDetail = null;
    this.pendingDetailFeatureCode = null;
    this.router.navigate(['/billing/features'], {
      queryParams: { feature: null },
      queryParamsHandling: 'merge'
    });
  }

  /**
   * Returns a structured list of key capabilities and actions showing what the tenant can do with a feature.
   */
  getFeatureCapabilitiesList(feat: BillingFeatureItem): string[] {
    if (!feat) return [];
    const code = (feat.featureCode || '').toLowerCase();
    const specificMap: Record<string, string[]> = {
      'bcp-community-messenger': [
        'Launch real-time 1-to-1 direct messages and group channels across your workspace.',
        'Share files, announcements, and media with end-to-end encrypted delivery.',
        'Engage members via the floating quick-chat dock from any workspace screen.',
        'Manage channel moderation, pinned messages, and read receipts.'
      ],
      'bcp-committees': [
        'Create and manage committees, sub-groups, chapters, and working taskforces.',
        'Assign committee leadership roles (Chair, Secretary, Treasurer) and member rosters.',
        'Schedule committee meetings, record minutes, and track voting resolutions.',
        'Run dedicated group announcement feeds and restricted document sharing.'
      ],
      'bcp-alumni-directory': [
        'Maintain a searchable alumni and cohort directory with profile verification.',
        'Organize graduating classes, induction cohorts, and regional chapters.',
        'Enable career networking, mentorship matching, and alumni achievement spotlights.',
        'Track alumni engagement metrics and cohort participation.'
      ],
      'bcp-form-builder': [
        'Build custom dynamic forms with drag-and-drop fields and conditional validation.',
        'Embed forms directly on your public website or share standalone submission links.',
        'Collect file uploads, structured registrations, and automated lead notifications.',
        'Export form submissions to CSV/Excel and review real-time lead analytics.'
      ],
      'bcp-store-ecommerce': [
        'Publish physical merchandise, digital downloads, and publications in an online storefront.',
        'Organize product categories, SKU inventory levels, and promotional pricing.',
        'Process customer orders, fulfillment statuses, and automated digital receipts.',
        'Monitor store revenue and settlement transactions from a unified ledger.'
      ],
      'bcp-ai-smart-assist': [
        'Use the docked Ozi AI Studio Assistant across CMS, forms, and communications.',
        'Generate and refine page sections, email templates, and executive summaries.',
        'Automate intelligent responses and content translation across workspace modules.',
        'Access Central-managed AI provider pools with zero setup overhead.'
      ],
      'bcp-mass-communication': [
        'Compose and broadcast bulk Email and SMS campaigns to targeted user segments.',
        'Validate messages in real time with built-in anti-spam deliverability checks.',
        'Track delivery logs, open rates, and multi-channel dispatch queues (MX Mails & MX SMS).',
        'Use reusable branded templates for organization-wide announcements.'
      ],
      'bcp-workspace': [
        'Enable and govern native Desktop Workspace access from your web Command Center.',
        'Manage connected workplace stations, reception desks, and offline-capable desktop terminals.',
        'Configure workplace-level operational access, station policies, and local peripheral sync.',
        'Synchronize desktop workplace activities seamlessly with your cloud organization workspace.'
      ]
    };

    if (specificMap[code]) {
      return specificMap[code];
    }

    return [
      `Configure and manage ${feat.name} workflows directly from your Command Center sidebar.`,
      `Assign role-based permissions to control which administrators and members can access ${feat.name}.`,
      `View real-time operational telemetry, activity logs, and exportable reports under Suite ${this.getSuiteLetter(feat.category)} (${feat.category}).`,
      `Synchronize seamlessly with your organization's member directory, notifications pool, and audit trail.`
    ];
  }

  openInfoModal(): void {
    this.showInfoModal = true;
  }

  closeInfoModal(): void {
    this.showInfoModal = false;
  }
}
