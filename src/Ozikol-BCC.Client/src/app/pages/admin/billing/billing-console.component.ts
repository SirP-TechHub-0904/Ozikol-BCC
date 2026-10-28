import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  BillingService,
  BillingFeaturesSnapshot,
  BillingFeatureItem,
  BillingInvoice,
  SubscribeFeatureResult
} from './services/billing.service';
import { ToastService } from '../../../core/services/toast.service';

type BillingTab = 'overview' | 'features' | 'invoices' | 'calculator';
type BillingCadence = 'Monthly' | 'Quarterly' | 'Yearly';

@Component({
  selector: 'app-billing-console',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './billing-console.component.html',
  styleUrls: ['./billing-console.component.css']
})
export class BillingConsoleComponent implements OnInit, OnDestroy {
  activeTab: BillingTab = 'overview';
  isLoading = false;
  isActionLoading = false;

  // Snapshot data
  snapshot: BillingFeaturesSnapshot | null = null;
  invoices: BillingInvoice[] = [];

  // Filter & Search states
  featureSearch = '';
  selectedSuite = '';
  selectedMarketplaceCadence: BillingCadence = 'Yearly';
  invoiceStatusFilter = 'all';

  // Modal states
  showSubscribeModal = false;
  selectedFeatureToSubscribe: BillingFeatureItem | null = null;
  subscribeCadence: BillingCadence = 'Yearly';
  pendingSubscribeResult: SubscribeFeatureResult | null = null;

  showInvoiceModal = false;
  selectedInvoice: BillingInvoice | null = null;

  showInfoModal = false;
  infoModalTopic = '';

  // Calculator state
  calculatorCadence: 'Monthly' | 'Yearly' = 'Monthly';
  selectedAddonIdsForCalc: Set<string> = new Set();

  private routeSub: Subscription | null = null;

  constructor(
    private billingService: BillingService,
    private toastService: ToastService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.routeSub = this.route.data.subscribe(data => {
      if (data && data['tab']) {
        this.activeTab = data['tab'] as BillingTab;
      }
    });

    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        this.activeTab = params['tab'] as BillingTab;
      }
    });

    this.loadSnapshot();
    this.loadInvoices();
  }

  ngOnDestroy(): void {
    if (this.routeSub) {
      this.routeSub.unsubscribe();
    }
  }

  switchTab(tab: BillingTab): void {
    this.activeTab = tab;
    // Keep URL synchronized
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge'
    });
  }

  loadSnapshot(): void {
    this.isLoading = true;
    this.billingService.getFeaturesSnapshot().subscribe({
      next: res => {
        this.isLoading = false;
        if (res.success && res.data) {
          this.snapshot = res.data;
          // Pre-select some addons in calculator for demo
          if (this.snapshot.available.length > 0 && this.selectedAddonIdsForCalc.size === 0) {
            this.selectedAddonIdsForCalc.add(this.snapshot.available[0].featureId);
          }
        }
      },
      error: err => {
        this.isLoading = false;
        console.error('Failed to load billing snapshot:', err);
        this.toastService.error('Could not load billing snapshot. Please verify your connection.');
      }
    });
  }

  loadInvoices(): void {
    this.billingService.getInvoices().subscribe({
      next: res => {
        if (res.success && res.data) {
          this.invoices = res.data;
        }
      },
      error: err => {
        console.error('Failed to load invoices:', err);
      }
    });
  }

  // ── Auto-Renew Toggle ──
  toggleAutoRenew(item: BillingFeatureItem): void {
    if (!item.subscriptionId) return;

    const previousState = item.autoRenew;
    item.autoRenew = !previousState; // Optimistic update

    this.billingService.toggleAutoRenew(item.subscriptionId).subscribe({
      next: res => {
        if (res.success) {
          this.toastService.success(res.message || `Auto-renew for ${item.name} updated.`);
        } else {
          item.autoRenew = previousState; // Revert
          this.toastService.error(res.message || 'Failed to update auto-renewal.');
        }
      },
      error: () => {
        item.autoRenew = previousState; // Revert
        this.toastService.error('Network error toggling auto-renew.');
      }
    });
  }

  // ── Subscribe Modal Actions ──
  openSubscribeModal(feature: BillingFeatureItem): void {
    this.selectedFeatureToSubscribe = feature;
    this.subscribeCadence = this.selectedMarketplaceCadence;
    this.pendingSubscribeResult = null;
    this.showSubscribeModal = true;
  }

  closeSubscribeModal(): void {
    this.showSubscribeModal = false;
    this.selectedFeatureToSubscribe = null;
    this.pendingSubscribeResult = null;
  }

  confirmSubscribe(): void {
    if (!this.selectedFeatureToSubscribe) return;

    this.isActionLoading = true;
    this.billingService.subscribeFeature(this.selectedFeatureToSubscribe.featureId, this.subscribeCadence).subscribe({
      next: res => {
        this.isActionLoading = false;
        if (res.success && res.data) {
          this.pendingSubscribeResult = res.data;
          this.toastService.success(res.message || `Subscribed to ${this.selectedFeatureToSubscribe?.name}.`);
          this.loadSnapshot();
          this.loadInvoices();
        } else {
          this.toastService.error(res.message || 'Subscription could not be processed.');
        }
      },
      error: err => {
        this.isActionLoading = false;
        console.error('Subscription error:', err);
        this.toastService.error('Failed to process feature subscription. Please try again.');
      }
    });
  }

  // ── Invoice Modal Actions ──
  viewInvoice(invoice: BillingInvoice): void {
    this.selectedInvoice = invoice;
    this.showInvoiceModal = true;
  }

  closeInvoiceModal(): void {
    this.showInvoiceModal = false;
    this.selectedInvoice = null;
  }

  printInvoice(): void {
    window.print();
  }

  // ── Contextual Info Modal ──
  openSuiteInfo(topic: string): void {
    this.infoModalTopic = topic;
    this.showInfoModal = true;
  }

  closeInfoModal(): void {
    this.showInfoModal = false;
  }

  // ── Filter Getters ──
  get filteredAvailableFeatures(): BillingFeatureItem[] {
    if (!this.snapshot) return [];
    return this.snapshot.available.filter(f => {
      const matchesSearch = !this.featureSearch.trim() ||
        f.name.toLowerCase().includes(this.featureSearch.toLowerCase()) ||
        f.featureCode.toLowerCase().includes(this.featureSearch.toLowerCase()) ||
        (f.description && f.description.toLowerCase().includes(this.featureSearch.toLowerCase()));

      const matchesSuite = !this.selectedSuite || f.category.toLowerCase() === this.selectedSuite.toLowerCase();

      return matchesSearch && matchesSuite;
    });
  }

  get distinctAvailableSuites(): string[] {
    if (!this.snapshot) return [];
    const set = new Set<string>();
    this.snapshot.available.forEach(f => {
      if (f.category) set.add(f.category);
    });
    return Array.from(set);
  }

  get filteredInvoices(): BillingInvoice[] {
    if (this.invoiceStatusFilter === 'all') {
      return this.invoices;
    }
    return this.invoices.filter(i => i.status.toLowerCase() === this.invoiceStatusFilter.toLowerCase());
  }

  get pendingInvoicesCount(): number {
    return this.invoices.filter(i => i.status.toLowerCase() === 'pending').length;
  }

  get totalInvoicedAmount(): number {
    return this.invoices.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  }

  get pendingInvoicedAmount(): number {
    return this.invoices
      .filter(i => i.status.toLowerCase() === 'pending')
      .reduce((acc, curr) => acc + (curr.amount || 0), 0);
  }

  // ── Price Helpers ──
  getPriceForCadence(feature: BillingFeatureItem, cadence: BillingCadence): number {
    switch (cadence) {
      case 'Yearly':
        return feature.yearlyPrice > 0 ? feature.yearlyPrice : feature.monthlyPrice * 10;
      case 'Quarterly':
        return feature.quarterlyPrice > 0 ? feature.quarterlyPrice : Math.round(feature.monthlyPrice * 3 * 0.9);
      default:
        return feature.monthlyPrice;
    }
  }

  // ── Calculator Helpers ──
  toggleCalcAddon(id: string): void {
    if (this.selectedAddonIdsForCalc.has(id)) {
      this.selectedAddonIdsForCalc.delete(id);
    } else {
      this.selectedAddonIdsForCalc.add(id);
    }
  }

  isCalcAddonSelected(id: string): boolean {
    return this.selectedAddonIdsForCalc.has(id);
  }

  get calculatedMonthlyTotal(): number {
    if (!this.snapshot) return 0;
    let sum = this.snapshot.totalRecurringMonthly || 0;
    this.snapshot.available.forEach(f => {
      if (this.selectedAddonIdsForCalc.has(f.featureId)) {
        sum += f.monthlyPrice || 0;
      }
    });
    return sum;
  }

  get calculatedYearlyTotal(): number {
    if (!this.snapshot) return 0;
    let sum = (this.snapshot.totalRecurringMonthly || 0) * 10; // 2 months free equivalent
    this.snapshot.available.forEach(f => {
      if (this.selectedAddonIdsForCalc.has(f.featureId)) {
        const yPrice = f.yearlyPrice > 0 ? f.yearlyPrice : (f.monthlyPrice * 10);
        sum += yPrice;
      }
    });
    return sum;
  }
}

