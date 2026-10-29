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
  PaymentCard,
  BillingContactProfile
} from './services/billing.service';
import { ToastService } from '../../../core/services/toast.service';

export interface SuiteFeatureGroup {
  suiteName: string;
  suiteLetter: string;
  suiteIndex: number;
  features: Array<BillingFeatureItem & { serialNo: number }>;
  availableCount: number;
  comingSoonCount: number;
}

export type BillingPageSection = 'features' | 'paymentmethod' | 'subscriptions';

/**
 * Billing, Features, Payment Methods & Subscriptions Console (Suite 13).
 * Supports:
 * - /billing/features (with Simple Tab and Detailed Tab, one-click Install/Activate synced with Central)
 * - /billing/paymentmethod (Saved Payment Cards & Corporate Billing Contact Profile)
 * - /billing/subscriptions (Active Installed Capabilities & Invoices Ledger)
 */
@Component({
  selector: 'app-billing-console',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './billing-console.component.html',
  styleUrls: ['./billing-console.component.css']
})
export class BillingConsoleComponent implements OnInit, OnDestroy {
  /**
   * Canonical ordering of the 10 platform suites matching the Master Feature Catalog (/centralwks/features).
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
    'Life Events & Publications'
  ];

  activePage: BillingPageSection = 'features';
  featuresTab: 'simple' | 'detailed' = 'simple';
  viewMode: 'cards' | 'table' = 'cards';

  isLoading = false;
  togglingFeatureCode: string | null = null;

  // Filter & Search controls
  searchQuery = '';
  selectedSuite = '';
  availabilityFilter: 'all' | 'available' | 'coming_soon' = 'all';
  statusFilter: 'all' | 'active' | 'not_active' | 'coming_soon' = 'all';
  tierFilter: 'all' | 'compulsory' | 'optional' = 'all';

  // Snapshot data from MasterCatalogDbContext via /api/billing/features
  snapshot: BillingFeaturesSnapshot = this.buildDefaultSnapshot();

  // Payment Methods & Billing Contact State (/billing/paymentmethod)
  paymentCards: PaymentCard[] = [];
  billingContact: BillingContactProfile = {
    companyName: 'Organization Workspace',
    billingEmail: 'billing@company.com',
    taxId: '',
    addressLine1: '',
    city: '',
    stateProvince: '',
    country: '',
    postalCode: ''
  };
  showAddCardModal = false;
  cardForm = {
    holderName: '',
    cardNumber: '',
    expMonth: 12,
    expYear: 2028,
    cvc: '',
    brand: 'Visa' as 'Visa' | 'Mastercard' | 'Amex' | string,
    isDefault: true
  };

  // Subscriptions & Invoices State (/billing/subscriptions)
  invoices: BillingInvoice[] = [];
  invoiceStatusFilter: 'all' | 'pending' | 'completed' = 'all';
  selectedInvoice: BillingInvoice | null = null;
  showInvoiceModal = false;

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
    private route: ActivatedRoute,
    private router: Router,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.resolveActivePageFromRoute();
    this.routeSub = this.route.data.subscribe(data => {
      this.resolveActivePageFromRoute(data?.['tab']);
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

    this.broadcastSnapshotToSidebar(this.snapshot);
    this.loadPaymentMethods();
    this.loadSnapshot();
    this.loadInvoices();
    this.startRealtimeSocket();
  }

  ngOnDestroy(): void {
    if (this.routeSub) {
      this.routeSub.unsubscribe();
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
    if (tabData === 'paymentmethod' || tabData === 'payment_methods' || url.includes('/billing/payment')) {
      this.activePage = 'paymentmethod';
    } else if (tabData === 'subscriptions' || tabData === 'invoices' || url.includes('/billing/subscriptions') || url.includes('/billing/invoices')) {
      this.activePage = 'subscriptions';
    } else {
      this.activePage = 'features';
    }
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
          this.toastService.info(
            'Central Catalog Synchronized',
            'Capabilities, availability, and menu items updated in real time.'
          );
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
        if (res && res.success && res.data) {
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
        this.broadcastSnapshotToSidebar(this.snapshot);
        if (this.pendingDetailFeatureCode) {
          this.resolveSelectedFeatureFromCode(this.pendingDetailFeatureCode);
        }
        console.warn('Using resilient Master Feature Catalog snapshot:', err);
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
    this.togglingFeatureCode = feat.featureCode;

    this.billingService.toggleFeatureActive(feat.featureId, feat.featureCode, desiredState).subscribe({
      next: res => {
        this.togglingFeatureCode = null;
        if (res && res.success && res.data) {
          this.snapshot = res.data;
          this.broadcastSnapshotToSidebar(res.data);
          if (this.selectedFeatureDetail && this.selectedFeatureDetail.featureCode === feat.featureCode) {
            const updated = this.allOrderedFeatures.find(x => x.featureCode === feat.featureCode);
            if (updated) this.selectedFeatureDetail = updated;
          }
          if (desiredState) {
            this.toastService.success(
              'Capability Installed & Activated',
              `'${feat.name}' is now Active and visible in your sidebar menu.`
            );
          } else {
            this.toastService.info(
              'Capability Deactivated',
              `'${feat.name}' has been deactivated and removed from your sidebar menu.`
            );
          }
        } else {
          this.toastService.error('Update Failed', res?.message || 'Could not update capability status.');
        }
      },
      error: err => {
        this.togglingFeatureCode = null;
        const msg = err?.error?.message || 'Could not synchronize capability activation with Central.';
        this.toastService.error('Update Failed', msg);
      }
    });
  }

  /**
   * Toggles auto-renewal for a subscribed capability on /billing/subscriptions.
   */
  toggleAutoRenew(feat: BillingFeatureItem): void {
    if (!feat.subscriptionId) return;
    this.billingService.toggleAutoRenew(feat.subscriptionId).subscribe({
      next: res => {
        if (res && res.success) {
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

  // ── Payment Methods & Billing Contact Actions (/billing/paymentmethod) ──
  loadPaymentMethods(): void {
    this.paymentCards = this.billingService.getPaymentCards();
    this.billingContact = this.billingService.getBillingContact();
  }

  openAddCardModal(): void {
    this.cardForm = {
      holderName: '',
      cardNumber: '',
      expMonth: 12,
      expYear: 2028,
      cvc: '',
      brand: 'Visa',
      isDefault: this.paymentCards.length === 0
    };
    this.showAddCardModal = true;
  }

  closeAddCardModal(): void {
    this.showAddCardModal = false;
  }

  saveNewCard(): void {
    const cleanDigits = (this.cardForm.cardNumber || '').replace(/\D/g, '');
    if (!this.cardForm.holderName.trim() || cleanDigits.length < 4) {
      this.toastService.warning('Validation', 'Please enter cardholder title and valid card digits.');
      return;
    }
    const last4 = cleanDigits.slice(-4);
    this.billingService.addPaymentCard({
      brand: this.cardForm.brand || 'Visa',
      last4,
      expMonth: Number(this.cardForm.expMonth) || 12,
      expYear: Number(this.cardForm.expYear) || 2028,
      holderName: this.cardForm.holderName.trim(),
      isDefault: this.cardForm.isDefault
    });
    this.paymentCards = this.billingService.getPaymentCards();
    this.showAddCardModal = false;
    this.toastService.success('Card Linked', `Card ending in ${last4} has been saved.`);
  }

  setDefaultCard(cardId: string): void {
    this.billingService.setDefaultCard(cardId);
    this.paymentCards = this.billingService.getPaymentCards();
    this.toastService.success('Default Updated', 'Primary settlement card updated.');
  }

  deleteCard(card: PaymentCard): void {
    this.billingService.deletePaymentCard(card.id);
    this.paymentCards = this.billingService.getPaymentCards();
    this.toastService.info('Card Removed', `Card ending in ${card.last4} removed.`);
  }

  saveContactProfile(): void {
    this.billingService.saveBillingContact(this.billingContact);
    this.toastService.success('Billing Profile Saved', 'Organization billing contact details updated.');
  }

  // ── Invoices & Subscriptions Ledger Actions (/billing/subscriptions) ──
  loadInvoices(): void {
    this.billingService.getInvoices().subscribe({
      next: res => {
        if (res && res.success && Array.isArray(res.data)) {
          this.invoices = res.data;
        }
      },
      error: () => {}
    });
  }

  get activeInstalledFeatures(): Array<BillingFeatureItem & { serialNo: number; suiteLetter: string }> {
    return this.allOrderedFeatures.filter(f => f.isActive);
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

  openInvoiceDetail(inv: BillingInvoice): void {
    this.selectedInvoice = inv;
    this.showInvoiceModal = true;
  }

  closeInvoiceDetail(): void {
    this.showInvoiceModal = false;
    this.selectedInvoice = null;
  }

  /**
   * Resolves the 0-based canonical suite order index matching Master (/centralwks/features).
   */
  getSuiteOrder(category?: string): number {
    if (!category) return 999;
    const clean = category.trim().toLowerCase();
    const idx = BillingConsoleComponent.CanonicalSuites.findIndex(
      s => s.toLowerCase() === clean
    );
    return idx >= 0 ? idx : 500;
  }

  /**
   * Resolves the Suite Letter (A - J) for a given suite category.
   */
  getSuiteLetter(category?: string): string {
    const idx = this.getSuiteOrder(category);
    if (idx >= 0 && idx < 26) {
      return String.fromCharCode(65 + idx);
    }
    return '•';
  }

  /**
   * All published capabilities from Central for this tenant combined and ordered in canonical Master sequence.
   * Includes both Available (isAvailableForUse == true) and Coming Soon (isAvailableForUse == false) capabilities.
   */
  get allOrderedFeatures(): Array<BillingFeatureItem & { serialNo: number; suiteLetter: string }> {
    const combined: BillingFeatureItem[] = [
      ...(this.snapshot.included || []),
      ...(this.snapshot.subscribed || []),
      ...(this.snapshot.available || [])
    ];

    const byCode = new Map<string, BillingFeatureItem>();
    const unpublishedCodes = new Set<string>();
    for (const f of combined) {
      if (!f || !f.featureCode) continue;
      const code = f.featureCode.toLowerCase();
      if (f.isPublished === false) {
        unpublishedCodes.add(code);
        continue;
      }
      byCode.set(code, f);
    }

    // Ensure any published feature not yet returned (e.g. before backend restart when custom availability is active)
    // is still included as Coming Soon so all 45 published features appear consistently.
    const fallbackItems = this.buildDefaultSnapshot().available || [];
    for (const defItem of fallbackItems) {
      const code = defItem.featureCode.toLowerCase();
      if (!byCode.has(code) && !unpublishedCodes.has(code)) {
        byCode.set(code, {
          ...defItem,
          isAvailableForUse: false,
          isActive: false,
          isSubscribed: false,
          status: 'ComingSoon'
        });
      }
    }

    const published = Array.from(byCode.values());

    const sorted = published.sort((a, b) => {
      const suiteDiff = this.getSuiteOrder(a.category) - this.getSuiteOrder(b.category);
      if (suiteDiff !== 0) return suiteDiff;
      const orderDiff = (a.sortOrder ?? 999) - (b.sortOrder ?? 999);
      if (orderDiff !== 0) return orderDiff;
      return (a.name || '').localeCompare(b.name || '');
    });

    return sorted.map((item, idx) => ({
      ...item,
      serialNo: idx + 1,
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
   * Filtered capabilities based on search keyword, suite, availability, active status, and tier class.
   */
  get filteredFeatures(): Array<BillingFeatureItem & { serialNo: number; suiteLetter: string }> {
    const term = this.searchQuery.trim().toLowerCase();

    return this.allOrderedFeatures.filter(f => {
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
      this.tierFilter !== 'all'
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

  /**
   * Builds the complete canonical 10-suite Master Feature Catalog fallback so the UI
   * always matches MasterCatalogDbContext 1-to-1 even before backend connection completes.
   */
  private buildDefaultSnapshot(): BillingFeaturesSnapshot {
    const raw: Array<Partial<BillingFeatureItem> & { name: string; menuTitle: string; featureCode: string; category: string; suiteMenuTitle: string }> = [
      // Suite A: People, Community & Collaboration
      { featureCode: 'bcp-community-messenger', name: 'Community Messenger & Team Chat', menuTitle: 'Chat Messenger', category: 'People, Community & Collaboration', suiteMenuTitle: 'People & Community', icon: 'chat', isAvailableForUse: true, sortOrder: 1, description: 'Real-time 1-to-1 DMs, group channels, and platform-wide floating quick chat with end-to-end encryption.' },
      { featureCode: 'bcp-committees', name: 'Committees & Sub-Groups', menuTitle: 'Groups & Committees', category: 'People, Community & Collaboration', suiteMenuTitle: 'People & Community', icon: 'groups', isAvailableForUse: true, sortOrder: 2, description: 'Manage committee leadership, meeting schedules, minutes, voting resolutions, and member rosters.' },
      { featureCode: 'bcp-alumni-directory', name: 'Alumni Network & Directory', menuTitle: 'Alumni Network', category: 'People, Community & Collaboration', suiteMenuTitle: 'People & Community', icon: 'badge', isAvailableForUse: true, sortOrder: 3, description: 'Searchable alumni directory, graduating class portals, career networking, and mentoring rosters.' },
      { featureCode: 'bcp-whistleblowing', name: 'Anonymous Whistleblowing & Feedback', menuTitle: 'Whistleblowing', category: 'People, Community & Collaboration', suiteMenuTitle: 'People & Community', icon: 'security', isAvailableForUse: false, sortOrder: 4, description: 'Encrypted, anonymous whistleblowing submission channel and internal investigation management ledger.' },

      // Suite B: Workforce, Rota & Scheduling
      { featureCode: 'bcp-staff-rota', name: 'Staff & Volunteer Rota Scheduling', menuTitle: 'Staff & Volunteer Rota', category: 'Workforce, Rota & Scheduling', suiteMenuTitle: 'Workforce & Shifts', icon: 'calendar_month', isAvailableForUse: false, sortOrder: 5, description: 'Multi-department weekly shift scheduling, recurring duty patterns, on-call assignment, and conflict detection.' },
      { featureCode: 'bcp-shift-swaps', name: 'Shift Swaps & Leave Management', menuTitle: 'Shift Swaps & Leave', category: 'Workforce, Rota & Scheduling', suiteMenuTitle: 'Workforce & Shifts', icon: 'swap_horiz', isAvailableForUse: false, sortOrder: 6, description: 'Peer-to-peer shift trade approvals, annual leave accrual tracking, sick leave requests, and supervisor sign-offs.' },
      { featureCode: 'bcp-attendance-tracking', name: 'Biometric & QR Attendance Tracking', menuTitle: 'Attendance & QR', category: 'Workforce, Rota & Scheduling', suiteMenuTitle: 'Workforce & Shifts', icon: 'fingerprint', isAvailableForUse: false, sortOrder: 7, description: 'Clock-in/out via mobile QR codes, biometric device sync, geolocation geofencing, and timesheet reports.' },
      { featureCode: 'bcp-appointment-booking', name: 'Appointment & Facility Booking', menuTitle: 'Appointment Booking', category: 'Workforce, Rota & Scheduling', suiteMenuTitle: 'Workforce & Shifts', icon: 'book_online', isAvailableForUse: false, sortOrder: 8, description: 'Online calendar booking for consultations, counseling, meeting rooms, shared equipment, and venues.' },
      { featureCode: 'bcp-calendar-followups', name: 'Calendar & Automated Follow-Up Routine', menuTitle: 'Calendar & Follow-Ups', category: 'Workforce, Rota & Scheduling', suiteMenuTitle: 'Workforce & Shifts', icon: 'event_repeat', isAvailableForUse: false, sortOrder: 9, description: 'Two-way calendar synchronization, routine appointment reminders, and automated member follow-up cadences.' },

      // Suite C: Reports, Forms & Analytics
      { featureCode: 'bcp-interval-reporting', name: 'Interval & Periodic Reporting', menuTitle: 'Periodic Reports', category: 'Reports, Forms & Analytics', suiteMenuTitle: 'Reports & Forms', icon: 'assessment', isAvailableForUse: false, sortOrder: 10, description: 'Automated weekly, monthly, and annual operational reports with PDF exports and executive summaries.' },
      { featureCode: 'bcp-form-builder', name: 'Custom Dynamic Form Builder', menuTitle: 'Forms & Surveys', category: 'Reports, Forms & Analytics', suiteMenuTitle: 'Reports & Forms', icon: 'dynamic_form', isAvailableForUse: true, sortOrder: 11, description: 'Drag-and-drop form designer with conditional logic, payment collection, file uploads, and webhook integrations.' },
      { featureCode: 'bcp-survey-analytics', name: 'Survey & Opinion Poll Analytics', menuTitle: 'Opinion Polls', category: 'Reports, Forms & Analytics', suiteMenuTitle: 'Reports & Forms', icon: 'poll', isAvailableForUse: false, sortOrder: 12, description: 'Create multi-question satisfaction surveys, NPS sentiment scoring, and real-time response distribution charts.' },
      { featureCode: 'bcp-reference-forms', name: 'Reference Form & Referee Verification', menuTitle: 'Reference Forms', category: 'Reports, Forms & Analytics', suiteMenuTitle: 'Reports & Forms', icon: 'fact_check', isAvailableForUse: false, sortOrder: 13, description: 'Design custom confidential reference questionnaires, dispatch secure magic links, and generate vetting dossiers.' },

      // Suite D: Events & Training Management
      { featureCode: 'bcp-event-ticketing', name: 'Event Registration & Ticketing', menuTitle: 'Events & Passes', category: 'Events & Training Management', suiteMenuTitle: 'Events & Ticketing', icon: 'confirmation_number', isAvailableForUse: false, sortOrder: 14, description: 'Multi-tier event ticketing, seat reservation maps, promo codes, and QR code door check-in.' },
      { featureCode: 'bcp-speaker-sessions', name: 'Speaker & Session Lineup Management', menuTitle: 'Speaker & Sessions', category: 'Events & Training Management', suiteMenuTitle: 'Events & Ticketing', icon: 'podium', isAvailableForUse: false, sortOrder: 15, description: 'Manage conference tracks, keynote speaker bios, slide deck downloads, and live session Q&A.' },
      { featureCode: 'bcp-attendee-management', name: 'Attendee Badges & Check-In Kiosk', menuTitle: 'Attendee Check-In', category: 'Events & Training Management', suiteMenuTitle: 'Events & Ticketing', icon: 'qr_code_scanner', isAvailableForUse: false, sortOrder: 16, description: 'Instant badge printing, self-service kiosk check-in, and attendance certificate generation.' },

      // Suite E: Finance & Commercial Revenue
      { featureCode: 'bcp-invoicing-dues', name: 'Membership Dues & Recurring Invoicing', menuTitle: 'Invoicing & Dues', category: 'Finance & Commercial Revenue', suiteMenuTitle: 'Finance & Commerce', icon: 'receipt_long', isAvailableForUse: false, sortOrder: 17, description: 'Automated membership dues collection, pledge tracking, arrears reminders, and instant digital receipts.' },
      { featureCode: 'bcp-store-ecommerce', name: 'Store & E-Commerce Catalog', menuTitle: 'Commerce Studio', category: 'Finance & Commercial Revenue', suiteMenuTitle: 'Finance & Commerce', icon: 'shopping_bag', isAvailableForUse: true, sortOrder: 18, description: 'Online storefront for merchandise, digital resources, publications, and orders with inventory tracking.' },
      { featureCode: 'bcp-proposal-pipeline', name: 'Commercial Proposals & Bidding Pipeline', menuTitle: 'Proposals & Pipeline', category: 'Finance & Commercial Revenue', suiteMenuTitle: 'Finance & Commerce', icon: 'request_quote', isAvailableForUse: false, sortOrder: 19, description: 'Create client proposals, interactive pricing tables, e-signature approvals, and deal stage tracking.' },
      { featureCode: 'bcp-grant-ledger', name: 'Grants, Donations & Fund Accounting', menuTitle: 'Grants & Donations', category: 'Finance & Commercial Revenue', suiteMenuTitle: 'Finance & Commerce', icon: 'volunteer_activism', isAvailableForUse: false, sortOrder: 20, description: 'Restricted fund accounting, donor giving statements, grant milestone tracking, and disbursement ledgers.' },
      { featureCode: 'bcp-embedded-banking', name: 'Virtual Wallets & Payout Treasury', menuTitle: 'Wallets & Treasury', category: 'Finance & Commercial Revenue', suiteMenuTitle: 'Finance & Commerce', icon: 'account_balance', isAvailableForUse: false, sortOrder: 21, description: 'Multi-currency sub-accounts, automated split settlements, vendor payouts, and bank reconciliation.' },

      // Suite F: Operations & Workflows
      { featureCode: 'bcp-recruitment-hiring', name: 'Applicant Tracking & Talent Recruitment', menuTitle: 'Recruitment & Hiring', category: 'Operations & Workflows', suiteMenuTitle: 'Operations & Workflows', icon: 'work', isAvailableForUse: false, sortOrder: 22, description: 'Job board publishing, resume parsing, interview scorecards, and offer letter automation.' },
      { featureCode: 'bcp-elections-evoting', name: 'Secure E-Voting & Elections Center', menuTitle: 'E-Voting & Elections', category: 'Operations & Workflows', suiteMenuTitle: 'Operations & Workflows', icon: 'how_to_vote', isAvailableForUse: false, sortOrder: 23, description: 'Tamper-evident digital ballots, voter eligibility verification, secret tallying, and instant certified results.' },
      { featureCode: 'bcp-equipment-fleet', name: 'Equipment & Vehicle Logistics', menuTitle: 'Equipment Logistics', category: 'Operations & Workflows', suiteMenuTitle: 'Operations & Workflows', icon: 'local_shipping', isAvailableForUse: false, sortOrder: 24, description: 'Track organizational vehicles, maintenance schedules, fuel logs, and driver trip assignments.' },
      { featureCode: 'bcp-company-assets', name: 'IT & Fixed Asset Inventory Register', menuTitle: 'Asset Inventory', category: 'Operations & Workflows', suiteMenuTitle: 'Operations & Workflows', icon: 'inventory_2', isAvailableForUse: false, sortOrder: 25, description: 'Barcode asset tagging, custodian custody sign-offs, depreciation schedules, and audit trails.' },
      { featureCode: 'bcp-project-tasks', name: 'Project Kanban & Milestone Tracker', menuTitle: 'Projects & Tasks', category: 'Operations & Workflows', suiteMenuTitle: 'Operations & Workflows', icon: 'view_kanban', isAvailableForUse: false, sortOrder: 26, description: 'Agile task boards, Gantt timelines, deliverable checklists, and cross-team workload balancing.' },

      // Suite G: Communication, AI & Support
      { featureCode: 'bcp-ai-smart-assist', name: 'AI Smart Assist & Workflows', menuTitle: 'AI Smart Assist', category: 'Communication, AI & Support', suiteMenuTitle: 'Communication & AI', icon: 'smart_toy', isAvailableForUse: true, sortOrder: 27, description: 'AI-powered document summarization, draft generation, member inquiry auto-replies, and intelligent search.' },
      { featureCode: 'bcp-mass-communication', name: 'Mass Multi-Channel SMS & Email', menuTitle: 'Notification Studio', category: 'Communication, AI & Support', suiteMenuTitle: 'Communication & AI', icon: 'campaign', isAvailableForUse: true, sortOrder: 28, description: 'Broadcast bulk SMS, targeted email newsletters, WhatsApp announcements, and delivery receipts.' },
      { featureCode: 'bcp-helpdesk-support', name: 'Helpdesk & Ticketing Support', menuTitle: 'Helpdesk Support', category: 'Communication, AI & Support', suiteMenuTitle: 'Communication & AI', icon: 'support_agent', isAvailableForUse: false, sortOrder: 29, description: 'Multi-agent ticket queue, SLA resolution timers, automated routing, canned answers, and CSAT surveys.' },
      { featureCode: 'bcp-live-chat', name: 'Live Chat & Widget Messenger', menuTitle: 'Live Chat Widget', category: 'Communication, AI & Support', suiteMenuTitle: 'Communication & AI', icon: 'forum', isAvailableForUse: false, sortOrder: 30, description: 'Embeddable website live chat widget, real-time agent notifications, file sharing, and visitor routing.' },
      { featureCode: 'bcp-social-media', name: 'Social Media Publisher & Queue', menuTitle: 'Social Publisher', category: 'Communication, AI & Support', suiteMenuTitle: 'Communication & AI', icon: 'share', isAvailableForUse: false, sortOrder: 31, description: 'Schedule and publish posts across social channels with engagement analytics tracking.' },
      { featureCode: 'bcp-bio-link', name: 'Bio Link Hub & Public Microsite', menuTitle: 'Bio Link Hub', category: 'Communication, AI & Support', suiteMenuTitle: 'Communication & AI', icon: 'link', isAvailableForUse: false, sortOrder: 32, description: 'Custom branded link-in-bio hub, event buttons, donation links, and embeddable social widgets.' },
      { featureCode: 'bcp-gocall-ai', name: 'Voice & Video Conferencing Rooms', menuTitle: 'Video Conferencing', category: 'Communication, AI & Support', suiteMenuTitle: 'Communication & AI', icon: 'video_call', isAvailableForUse: false, sortOrder: 33, description: 'Browser-based HD video meetings, screen sharing, automated AI meeting minutes, and cloud recording.' },

      // Suite H: Compliance, Learning & Certification
      { featureCode: 'bcp-document-management', name: 'Document Vault & Revision Control', menuTitle: 'Document Vault', category: 'Compliance, Learning & Certification', suiteMenuTitle: 'Compliance & Learning', icon: 'folder_managed', isAvailableForUse: false, sortOrder: 34, description: 'Encrypted digital document storage, role-based access permissions, version history, and audit watermarking.' },
      { featureCode: 'bcp-learning-management', name: 'Learning Management & Course LMS', menuTitle: 'LMS & Courses', category: 'Compliance, Learning & Certification', suiteMenuTitle: 'Compliance & Learning', icon: 'school', isAvailableForUse: false, sortOrder: 35, description: 'Video lectures, quiz assessments, course progress tracking, instructor gradebooks, and completion diplomas.' },
      { featureCode: 'bcp-certificate-verification', name: 'Certificate Issuance & Verification', menuTitle: 'Certificates', category: 'Compliance, Learning & Certification', suiteMenuTitle: 'Compliance & Learning', icon: 'workspace_premium', isAvailableForUse: false, sortOrder: 36, description: 'Issue tamper-proof certificates with QR validation codes and public verification lookup portal.' },
      { featureCode: 'bcp-visitor-gate', name: 'Visitor & Gate Pass Management', menuTitle: 'Visitor Gate Passes', category: 'Compliance, Learning & Certification', suiteMenuTitle: 'Compliance & Learning', icon: 'badge', isAvailableForUse: false, sortOrder: 37, description: 'Pre-register guests, dispatch QR gate passes, notify hosts on arrival, and maintain security logs.' },
      { featureCode: 'bcp-kyc-verification', name: 'Identity KYC & Background Vetting', menuTitle: 'KYC Verification', category: 'Compliance, Learning & Certification', suiteMenuTitle: 'Compliance & Learning', icon: 'verified_user', isAvailableForUse: false, sortOrder: 38, description: 'Automated government ID verification, facial liveness checks, and compliance screening.' },

      // Suite I: Demographics & Civic Census
      { featureCode: 'bcp-community-census', name: 'Household & Community Census Registry', menuTitle: 'Community Census', category: 'Demographics & Civic Census', suiteMenuTitle: 'Demographics & Census', icon: 'family_restroom', isAvailableForUse: false, sortOrder: 39, description: 'Structured household enumeration, socio-economic profiling, dependency mapping, and ward registries.' },
      { featureCode: 'bcp-field-surveyor', name: 'Offline Field Enumeration App', menuTitle: 'Field Surveyor', category: 'Demographics & Civic Census', suiteMenuTitle: 'Demographics & Census', icon: 'explore', isAvailableForUse: false, sortOrder: 40, description: 'Offline-first mobile data collection with GPS coordinates, photo capture, and background sync.' },
      { featureCode: 'bcp-resident-id-cards', name: 'Digital & Printable Member ID Cards', menuTitle: 'Digital Member IDs', category: 'Demographics & Civic Census', suiteMenuTitle: 'Demographics & Census', icon: 'contact_mail', isAvailableForUse: false, sortOrder: 41, description: 'Custom PVC card designer, Apple/Google Wallet pass generation, and instant QR status verification.' },
      { featureCode: 'bcp-demographic-analytics', name: 'Demographic & Population Intelligence', menuTitle: 'Population Analytics', category: 'Demographics & Civic Census', suiteMenuTitle: 'Demographics & Census', icon: 'query_stats', isAvailableForUse: false, sortOrder: 42, description: 'Age pyramids, geographic heatmaps, occupational distributions, and longitudinal growth trends.' },

      // Suite J: Life Events & Publications
      { featureCode: 'bcp-digital-memorials', name: 'Digital Memorials & Funeral Tributes', menuTitle: 'Digital Memorials', category: 'Life Events & Publications', suiteMenuTitle: 'Life Events & Media', icon: 'local_fire_department', isAvailableForUse: false, sortOrder: 43, description: 'Online memorial portals, virtual tributes, biography galleries, eulogy streams, and printable booklets.' },
      { featureCode: 'bcp-wedding-portals', name: 'Weddings & Celebration Portals', menuTitle: 'Wedding Portals', category: 'Life Events & Publications', suiteMenuTitle: 'Life Events & Media', icon: 'celebration', isAvailableForUse: false, sortOrder: 44, description: 'Digital celebration invitations, RSVP registry, order of service flipbook, and guest photo sharing.' },
      { featureCode: 'bcp-digital-brochures', name: 'Digital Brochures & Magazine Publishing', menuTitle: 'Digital Brochures', category: 'Life Events & Publications', suiteMenuTitle: 'Life Events & Media', icon: 'auto_stories', isAvailableForUse: false, sortOrder: 45, description: 'Interactive 3D page-flip brochures, anniversary magazines, souvenir programmes, and PDF downloads.' }
    ];

    const items: BillingFeatureItem[] = raw.map((r, i) => ({
      featureId: `feat-${i + 1}`,
      featureCode: r.featureCode,
      name: r.name,
      menuTitle: r.menuTitle,
      category: r.category,
      suiteMenuTitle: r.suiteMenuTitle,
      description: r.description,
      icon: r.icon || 'extension',
      isCompulsory: true,
      isSubscribed: false,
      isActive: false,
      isAvailableForUse: !!r.isAvailableForUse,
      sortOrder: r.sortOrder || i + 1,
      billingType: 'FlatSubscription',
      autoRenew: true,
      billingCadence: 'Included',
      status: r.isAvailableForUse ? 'Available' : 'ComingSoon',
      monthlyPrice: 0,
      quarterlyPrice: 0,
      yearlyPrice: 0,
      effectivePrice: 0,
      severity: 'None'
    }));

    return {
      tenantKey: 'workspace',
      serverTimeUtc: new Date().toISOString(),
      included: [],
      subscribed: [],
      available: items,
      notices: [],
      totalRecurringMonthly: 0
    };
  }
}
