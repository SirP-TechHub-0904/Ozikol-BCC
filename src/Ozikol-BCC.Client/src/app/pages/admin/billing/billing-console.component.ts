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
  PaymentCard,
  BillingContactProfile
} from './services/billing.service';
import { ToastService } from '../../../core/services/toast.service';

export type BillingTab = 'overview' | 'payment_methods' | 'invoices' | 'calculator';
export type BillingCadence = 'Monthly' | 'Quarterly' | 'Yearly';

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

  // Snapshot posture (initialized with default resilient data so UI is never blank)
  snapshot: BillingFeaturesSnapshot = this.buildDefaultSnapshot();
  invoices: BillingInvoice[] = [];

  // Payment Methods State
  paymentCards: PaymentCard[] = [];
  billingContact: BillingContactProfile = {
    companyName: 'Digital Organization',
    billingEmail: 'billing@company.com',
    taxId: 'US-TAX-982143',
    addressLine1: 'Corporate Suite 400',
    city: 'San Francisco',
    stateProvince: 'CA',
    country: 'United States',
    postalCode: '94103'
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

  // Invoices & Receipts State
  invoiceStatusFilter = 'all';
  showInvoiceModal = false;
  selectedInvoice: BillingInvoice | null = null;

  // Contextual Suite Walkthrough / Info Modal
  showInfoModal = false;
  infoModalTopic = 'overview';

  // Calculator State
  calculatorCadence: 'Monthly' | 'Yearly' = 'Monthly';
  teamSeatsCount = 15;
  storageGb = 50;
  readonly Math = Math;

  private routeSub: Subscription | null = null;

  constructor(
    private billingService: BillingService,
    private toastService: ToastService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Load local payment cards & contact
    this.loadPaymentMethods();

    this.routeSub = this.route.data.subscribe(data => {
      if (data && data['tab']) {
        const tab = data['tab'];
        this.activeTab = (tab === 'features' ? 'payment_methods' : tab) as BillingTab;
      }
    });

    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        const tab = params['tab'];
        this.activeTab = (tab === 'features' ? 'payment_methods' : tab) as BillingTab;
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
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge'
    });
  }

  // ── Data Loading & Synchronization ──
  loadSnapshot(): void {
    this.isLoading = true;
    this.billingService.getFeaturesSnapshot().subscribe({
      next: res => {
        this.isLoading = false;
        if (res && res.success && res.data) {
          this.snapshot = res.data;
        }
      },
      error: err => {
        this.isLoading = false;
        // Keep resilient local snapshot so workspace is fully interactive
        console.warn('Backend snapshot unavailable, using resilient workspace posture:', err);
      }
    });
  }

  loadInvoices(): void {
    this.billingService.getInvoices().subscribe({
      next: res => {
        if (res && res.success && res.data) {
          this.invoices = res.data;
        } else if (!this.invoices.length) {
          this.invoices = this.buildDefaultInvoices();
        }
      },
      error: () => {
        if (!this.invoices.length) {
          this.invoices = this.buildDefaultInvoices();
        }
      }
    });
  }

  loadPaymentMethods(): void {
    this.paymentCards = this.billingService.getPaymentCards();
    this.billingContact = this.billingService.getBillingContact();
  }

  // ── Payment Methods & Card Actions ──
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

  detectBrandFromNumber(num: string): string {
    const clean = num.replace(/\s+/g, '');
    if (clean.startsWith('4')) return 'Visa';
    if (clean.startsWith('5') || clean.startsWith('2')) return 'Mastercard';
    if (clean.startsWith('34') || clean.startsWith('37')) return 'Amex';
    return 'Visa';
  }

  saveCard(): void {
    if (!this.cardForm.holderName.trim()) {
      this.toastService.error('Please enter the name on the card.');
      return;
    }
    const cleanNum = this.cardForm.cardNumber.replace(/\D/g, '');
    if (cleanNum.length < 13 || cleanNum.length > 19) {
      this.toastService.error('Please enter a valid 16-digit card number.');
      return;
    }

    const brand = this.detectBrandFromNumber(cleanNum);
    const last4 = cleanNum.slice(-4);

    this.billingService.addPaymentCard({
      brand,
      last4,
      expMonth: Number(this.cardForm.expMonth),
      expYear: Number(this.cardForm.expYear),
      holderName: this.cardForm.holderName.trim(),
      isDefault: this.cardForm.isDefault
    });

    this.loadPaymentMethods();
    this.closeAddCardModal();
    this.toastService.success(`Payment card ending in •••• ${last4} added successfully.`);
  }

  setDefaultCard(cardId: string): void {
    this.billingService.setDefaultCard(cardId);
    this.loadPaymentMethods();
    this.toastService.success('Default payment method updated.');
  }

  deleteCard(card: PaymentCard): void {
    if (confirm(`Remove card ending in •••• ${card.last4}?`)) {
      this.billingService.deletePaymentCard(card.id);
      this.loadPaymentMethods();
      this.toastService.info('Card removed from workspace.');
    }
  }

  saveBillingProfile(): void {
    this.billingService.saveBillingContact(this.billingContact);
    this.toastService.success('Billing contact and company details updated.');
  }

  // ── Auto-Renew Toggle ──
  toggleAutoRenew(item: BillingFeatureItem): void {
    if (!item.subscriptionId) return;

    const previousState = item.autoRenew;
    item.autoRenew = !previousState;

    this.billingService.toggleAutoRenew(item.subscriptionId).subscribe({
      next: res => {
        if (res.success) {
          this.toastService.success(res.message || `Auto-renew for ${item.name} updated.`);
        } else {
          item.autoRenew = previousState;
          this.toastService.error(res.message || 'Failed to update auto-renewal.');
        }
      },
      error: () => {
        item.autoRenew = previousState;
        this.toastService.error('Network error toggling auto-renew.');
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

  // ── Contextual Info Walkthrough Modal ──
  openSuiteInfo(topic: string): void {
    this.infoModalTopic = topic;
    this.showInfoModal = true;
  }

  closeInfoModal(): void {
    this.showInfoModal = false;
  }

  // ── Computed Getters ──
  get filteredInvoices(): BillingInvoice[] {
    if (this.invoiceStatusFilter === 'all') {
      return this.invoices;
    }
    return this.invoices.filter(i => i.status.toLowerCase() === this.invoiceStatusFilter.toLowerCase());
  }

  get pendingInvoicesCount(): number {
    return this.invoices.filter(i => i.status.toLowerCase() === 'pending').length;
  }

  get pendingInvoicedAmount(): number {
    return this.invoices
      .filter(i => i.status.toLowerCase() === 'pending')
      .reduce((acc, inv) => acc + (inv.amount || 0), 0);
  }

  get defaultCard(): PaymentCard | undefined {
    return this.paymentCards.find(c => c.isDefault) || this.paymentCards[0];
  }

  get calculatedMonthlyEstimate(): number {
    const base = this.snapshot.totalRecurringMonthly || 0;
    const seatsCost = Math.max(0, this.teamSeatsCount - 10) * 4.5;
    const storageCost = Math.max(0, this.storageGb - 25) * 0.20;
    return base + seatsCost + storageCost;
  }

  get calculatedYearlyEstimate(): number {
    return (this.calculatedMonthlyEstimate * 10); // 2 months free annual discount
  }

  // ── Default Posture Initializer (Ensures 0 Blank Screen) ──
  private buildDefaultSnapshot(): BillingFeaturesSnapshot {
    return {
      tenantKey: 'workspace',
      serverTimeUtc: new Date().toISOString(),
      included: [
        {
          featureId: 'core-identity',
          featureCode: 'bcp-identity',
          name: 'Identity, RBAC & Multi-Factor Security',
          category: 'Platform Core',
          isCompulsory: true,
          isSubscribed: true,
          isActive: true,
          autoRenew: true,
          billingCadence: 'Included',
          status: 'Active',
          monthlyPrice: 0,
          quarterlyPrice: 0,
          yearlyPrice: 0,
          effectivePrice: 0,
          severity: 'None'
        },
        {
          featureId: 'core-cms',
          featureCode: 'bcp-cms',
          name: 'Dynamic Content Management System (CMS)',
          category: 'Digital Presence',
          isCompulsory: true,
          isSubscribed: true,
          isActive: true,
          autoRenew: true,
          billingCadence: 'Included',
          status: 'Active',
          monthlyPrice: 0,
          quarterlyPrice: 0,
          yearlyPrice: 0,
          effectivePrice: 0,
          severity: 'None'
        },
        {
          featureId: 'core-communities',
          featureCode: 'bcp-communities',
          name: 'Member Communities, Committees & Sub-Groups',
          category: 'Collaboration',
          isCompulsory: true,
          isSubscribed: true,
          isActive: true,
          autoRenew: true,
          billingCadence: 'Included',
          status: 'Active',
          monthlyPrice: 0,
          quarterlyPrice: 0,
          yearlyPrice: 0,
          effectivePrice: 0,
          severity: 'None'
        },
        {
          featureId: 'core-database',
          featureCode: 'bcp-database',
          name: 'Dedicated Isolated Database Catalog',
          category: 'Infrastructure',
          isCompulsory: true,
          isSubscribed: true,
          isActive: true,
          autoRenew: true,
          billingCadence: 'Included',
          status: 'Active',
          monthlyPrice: 0,
          quarterlyPrice: 0,
          yearlyPrice: 0,
          effectivePrice: 0,
          severity: 'None'
        }
      ],
      subscribed: [],
      available: [],
      notices: [],
      totalRecurringMonthly: 0
    };
  }

  private buildDefaultInvoices(): BillingInvoice[] {
    return [
      {
        id: 'inv_init_01',
        invoiceNumber: 'INV-2026-0001',
        description: 'Sovereign Business Command Center Onboarding & Free Baseline Tier Setup',
        amount: 0.00,
        currency: 'USD',
        status: 'Completed',
        paymentProvider: 'System Onboarding',
        reference: 'SETUP-FREE-001',
        createdUtc: new Date().toISOString()
      }
    ];
  }
}
