import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

/**
 * General Settings Console Component (located under Security & Audit).
 * Centralizes workspace-wide system settings (starting with Email Configuration for notifications)
 * distinct from individual feature module settings.
 */
@Component({
  selector: 'app-general-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent],
  template: `
    <div class="gen-settings-page">
      <app-page-header
        eyebrow="SECURITY & AUDIT · SYSTEM GOVERNANCE"
        icon="settings"
        title="General Settings"
        subtitle="Configure core workspace-wide system services and notification infrastructure."
      ></app-page-header>

      <!-- Modular General Settings Navigation Bar -->
      <div class="gen-tabs-bar">
        <button
          type="button"
          class="gen-tab-btn"
          [class.active]="activeTab === 'email'"
          (click)="selectTab('email')"
        >
          <span class="material-symbols-outlined tab-icon">mark_email_read</span>
          <div class="tab-meta">
            <div class="tab-title-row">
              <span class="tab-title">Email Configuration</span>
              <span class="status-pill" [class.pill-active]="emailStatus.isConfigured" [class.pill-pending]="!emailStatus.isConfigured">
                {{ emailStatus.isConfigured ? 'Active' : 'Setup Required' }}
              </span>
            </div>
            <span class="tab-sub">Workspace Notification Email Service</span>
          </div>
        </button>

        <button
          type="button"
          class="gen-tab-btn"
          [class.active]="activeTab === 'currency'"
          (click)="selectTab('currency')"
        >
          <span class="material-symbols-outlined tab-icon">payments</span>
          <div class="tab-meta">
            <div class="tab-title-row">
              <span class="tab-title">Default Currency</span>
              <span class="status-pill pill-active">
                {{ currencySettings.currencyCode }} ({{ currencySettings.currencySymbol }})
              </span>
            </div>
            <span class="tab-sub">Operational Running Currency</span>
          </div>
        </button>
      </div>

      <!-- TAB 1: EMAIL CONFIGURATION -->
      <div *ngIf="activeTab === 'email'" class="gen-tab-content">
        <!-- Status Banner -->
        <div class="status-banner" [class.banner-active]="emailStatus.isConfigured" [class.banner-pending]="!emailStatus.isConfigured">
          <div class="banner-icon-wrap">
            <span class="material-symbols-outlined">
              {{ emailStatus.isConfigured ? 'verified' : 'notifications_active' }}
            </span>
          </div>
          <div class="banner-body">
            <h4>
              {{ emailStatus.isConfigured
                ? 'Your Email Service for Notifications is Active'
                : 'Enable Email Service for Notifications' }}
            </h4>
            <p>
              {{ emailStatus.isConfigured
                ? 'Transactional emails for password resets, workforce onboarding links, and security alerts are actively dispatched from ' + (emailStatus.senderEmail || emailStatus.recommendedAddress) + '.'
                : 'Activate your workspace notification address (' + (emailStatus.recommendedAddress || 'noreply@workspace.ozikol.cloud') + ') to enable transactional emails.' }}
            </p>
          </div>
          <div class="banner-actions">
            <button
              type="button"
              class="btn-primary-action"
              [disabled]="activatingEmail"
              (click)="activateOrUpdateEmailService()"
            >
              <span class="material-symbols-outlined">{{ activatingEmail ? 'progress_activity' : 'bolt' }}</span>
              <span>{{ activatingEmail ? 'Activating...' : (emailStatus.isConfigured ? 'Update Email Service' : 'Enable Email Service') }}</span>
            </button>
          </div>
        </div>

        <div class="gen-cards-grid">
          <!-- Card 1: Notification Sender Configuration -->
          <div class="gen-card">
            <div class="gen-card-head">
              <div class="head-icon">
                <span class="material-symbols-outlined">Alternate_Email</span>
              </div>
              <div>
                <h3>Workspace Notification Sender</h3>
                <p>Configure the sender identity displayed to members and staff on system emails.</p>
              </div>
            </div>

            <div class="gen-card-body">
              <div class="form-group">
                <label class="form-label">Workspace Notification Email Address</label>
                <div class="readonly-input-box">
                  <span class="material-symbols-outlined">mail</span>
                  <span class="email-mono">{{ emailStatus.senderEmail || emailStatus.recommendedAddress || 'noreply@workspace.ozikol.cloud' }}</span>
                  <span class="verified-chip" *ngIf="emailStatus.isConfigured">
                    <span class="material-symbols-outlined">check_circle</span>
                    Active
                  </span>
                </div>
                <span class="form-hint">Provisioned automatically for your workspace subdomain with TLS encryption.</span>
              </div>

              <div class="form-group">
                <label class="form-label">Sender Display Name</label>
                <input
                  type="text"
                  class="form-control"
                  [(ngModel)]="emailStatus.senderName"
                  placeholder="e.g. Your Organization Name"
                />
                <span class="form-hint">Appears as the "From" name in member inboxes for password resets and onboarding invitations.</span>
              </div>

              <div class="channel-tags-box">
                <div class="channel-tags-title">Protected Transactional Flows</div>
                <div class="channel-list">
                  <div class="channel-item">
                    <span class="material-symbols-outlined">check_circle</span>
                    <span>Password Resets &amp; Account Recovery</span>
                  </div>
                  <div class="channel-item">
                    <span class="material-symbols-outlined">check_circle</span>
                    <span>Workforce &amp; Member Onboarding Links</span>
                  </div>
                  <div class="channel-item">
                    <span class="material-symbols-outlined">check_circle</span>
                    <span>Two-Factor Authentication (2FA) &amp; Security Alerts</span>
                  </div>
                </div>
              </div>

              <div class="card-footer-actions">
                <button
                  type="button"
                  class="btn-primary-action full-width"
                  [disabled]="activatingEmail"
                  (click)="activateOrUpdateEmailService()"
                >
                  <span class="material-symbols-outlined">{{ activatingEmail ? 'progress_activity' : 'check_circle' }}</span>
                  <span>{{ activatingEmail ? 'Saving...' : (emailStatus.isConfigured ? 'Save Email Configuration' : 'Enable Email Service Now') }}</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Card 2: Verify & Send Test Email -->
          <div class="gen-card">
            <div class="gen-card-head">
              <div class="head-icon head-icon-emerald">
                <span class="material-symbols-outlined">forward_to_inbox</span>
              </div>
              <div>
                <h3>Test Notification Delivery</h3>
                <p>Send a live verification email to confirm your workspace notification service is delivering cleanly.</p>
              </div>
            </div>

            <div class="gen-card-body">
              <div class="form-group">
                <label class="form-label">Recipient Email Address</label>
                <input
                  type="email"
                  class="form-control"
                  [(ngModel)]="testRecipientEmail"
                  placeholder="name@company.com"
                />
                <span class="form-hint">Enter an email address where you want to receive the test notification.</span>
              </div>

              <div class="info-callout">
                <span class="material-symbols-outlined">shield_lock</span>
                <div>
                  <strong>End-to-End Encrypted Delivery</strong>
                  <p>All workspace notifications are transmitted over encrypted TLS channels with automated domain authentication.</p>
                </div>
              </div>

              <div class="card-footer-actions">
                <button
                  type="button"
                  class="btn-outline-action full-width"
                  [disabled]="sendingTestEmail || !testRecipientEmail.trim()"
                  (click)="sendTestEmail()"
                >
                  <span class="material-symbols-outlined">{{ sendingTestEmail ? 'progress_activity' : 'send' }}</span>
                  <span>{{ sendingTestEmail ? 'Sending Verification Email...' : 'Send Test Email' }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 2: DEFAULT CURRENCY -->
      <div *ngIf="activeTab === 'currency'" class="gen-tab-content">
        <!-- Status / Informational Banner -->
        <div class="status-banner banner-active">
          <div class="banner-icon-wrap">
            <span class="material-symbols-outlined">payments</span>
          </div>
          <div class="banner-body">
            <h4>Workspace Running Currency: {{ currencySettings.currencyCode }} ({{ currencySettings.currencySymbol }})</h4>
            <p>
              Configure the primary currency your workspace uses for day-to-day operations across products, sales orders, customer checkout, invoices, and employee compensation. Subscriptions and capability licenses from Ozikol Central are billed separately.
            </p>
          </div>
        </div>

        <div class="gen-cards-grid">
          <!-- Card 1: Operational Currency Selector -->
          <div class="gen-card">
            <div class="gen-card-head">
              <div class="head-icon">
                <span class="material-symbols-outlined">currency_exchange</span>
              </div>
              <div>
                <h3>Workspace Operational Currency</h3>
                <p>Choose the default currency applied to all internal transactions across your workspace.</p>
              </div>
            </div>

            <div class="gen-card-body">
              <div class="form-group">
                <label class="form-label">Default Currency</label>
                <select
                  class="form-control"
                  [(ngModel)]="currencySettings.currencyCode"
                  (ngModelChange)="onCurrencyCodeChange()"
                >
                  <option value="USD">USD - United States Dollar ($)</option>
                  <option value="NGN">NGN - Nigerian Naira (₦)</option>
                  <option value="GBP">GBP - British Pound Sterling (£)</option>
                  <option value="EUR">EUR - Euro (€)</option>
                  <option value="CAD">CAD - Canadian Dollar (CA$)</option>
                  <option value="KES">KES - Kenyan Shilling (KSh)</option>
                  <option value="ZAR">ZAR - South African Rand (R)</option>
                  <option value="GHS">GHS - Ghanaian Cedi (GH₵)</option>
                  <option value="AUD">AUD - Australian Dollar (A$)</option>
                  <option value="INR">INR - Indian Rupee (₹)</option>
                  <option value="JPY">JPY - Japanese Yen (¥)</option>
                  <option value="AED">AED - United Arab Emirates Dirham (AED)</option>
                  <option value="ZMW">ZMW - Zambian Kwacha (ZK)</option>
                  <option value="UGX">UGX - Ugandan Shilling (USh)</option>
                  <option value="RWF">RWF - Rwandan Franc (FRw)</option>
                  <option value="EGP">EGP - Egyptian Pound (E£)</option>
                </select>
                <span class="form-hint">Used for all product prices, checkout carts, invoices, and employee payments.</span>
              </div>

              <div class="form-group">
                <label class="form-label">Currency Symbol</label>
                <input
                  type="text"
                  class="form-control"
                  [(ngModel)]="currencySettings.currencySymbol"
                  placeholder="e.g. $, ₦, £, €, CA$, KSh"
                />
                <span class="form-hint">Visual symbol or prefix displayed alongside monetary values.</span>
              </div>

              <!-- Live Preview Block -->
              <div class="currency-live-box">
                <div class="currency-live-label">LIVE DISPLAY PREVIEW</div>
                <div class="currency-live-price">
                  <span class="sym">{{ currencySettings.currencySymbol }}</span>
                  <span class="amt">149.99</span>
                  <span class="iso">{{ currencySettings.currencyCode }}</span>
                </div>
                <span class="currency-live-sub">Rendered across product cards, POS receipts, customer invoices, and payroll slips.</span>
              </div>

              <div class="card-footer-actions">
                <button
                  type="button"
                  class="btn-primary-action full-width"
                  [disabled]="savingCurrency"
                  (click)="saveCurrencySettings()"
                >
                  <span class="material-symbols-outlined">{{ savingCurrency ? 'progress_activity' : 'check' }}</span>
                  <span>{{ savingCurrency ? 'Saving...' : 'Save' }}</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Card 2: Central Platform Billing Context -->
          <div class="gen-card">
            <div class="gen-card-head">
              <div class="head-icon head-icon-emerald">
                <span class="material-symbols-outlined">receipt_long</span>
              </div>
              <div>
                <h3>Platform Billing Currency (Central)</h3>
                <p>Currency used by Ozikol Central for workspace capability licenses &amp; subscriptions.</p>
              </div>
            </div>

            <div class="gen-card-body">
              <div class="billing-context-card">
                <div class="billing-chip-row">
                  <span class="billing-badge">Central Billing</span>
                  <span class="billing-curr">{{ currencySettings.platformBillingCurrencyCode }} ({{ currencySettings.platformBillingCurrencySymbol }})</span>
                </div>
                <p class="billing-desc">
                  Ozikol Central invoices and charges your organization in <strong>{{ currencySettings.platformBillingCurrencyCode }}</strong> for platform feature add-ons, monthly plans, and cloud capabilities.
                </p>
                <div class="billing-rules-list">
                  <div class="rule-item">
                    <span class="material-symbols-outlined rule-check">check_circle</span>
                    <span><strong>Workspace Running Currency:</strong> Dictates internal commerce, invoices, POS, and payroll.</span>
                  </div>
                  <div class="rule-item">
                    <span class="material-symbols-outlined rule-check">check_circle</span>
                    <span><strong>Platform Billing Currency:</strong> Dictates workspace capability licenses billed by Central.</span>
                  </div>
                </div>
              </div>

              <div class="card-footer-actions">
                <a
                  routerLink="/billing/features"
                  class="btn-outline-action full-width"
                  style="text-decoration:none;"
                >
                  <span class="material-symbols-outlined">auto_awesome</span>
                  <span>View Features &amp; Capabilities</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .gen-settings-page {
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding: 0 4px 40px 4px;
      width: 100%;
    }

    .gen-tabs-bar {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 12px;
    }

    .gen-tab-btn {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 18px;
      border-radius: 12px;
      border: 1.5px solid #e2e8f0;
      background: #ffffff;
      cursor: pointer;
      text-align: left;
      transition: all 0.18s ease;
    }
    .gen-tab-btn.active {
      border-color: #0050E5;
      background: #f0f7ff;
      box-shadow: 0 4px 14px rgba(0, 80, 229, 0.08);
    }
    .tab-icon {
      font-size: 22px;
      color: #0050E5;
      background: #dbeafe;
      padding: 8px;
      border-radius: 10px;
    }
    .tab-meta {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .tab-title-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .tab-title {
      font-size: 13.5px;
      font-weight: 800;
      color: #0f172a;
    }
    .tab-sub {
      font-size: 11.5px;
      color: #64748b;
    }
    .status-pill {
      font-size: 10px;
      font-weight: 800;
      padding: 2px 8px;
      border-radius: 999px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .pill-active {
      background: #dcfce7;
      color: #15803d;
    }
    .pill-pending {
      background: #fef3c7;
      color: #b45309;
    }

    .status-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      padding: 20px 24px;
      border-radius: 16px;
      border: 1px solid #bfdbfe;
      background: linear-gradient(135deg, #eff6ff 0%, #ffffff 100%);
      flex-wrap: wrap;
    }
    .status-banner.banner-active {
      border-color: #bbf7d0;
      background: linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%);
    }
    .banner-icon-wrap {
      width: 48px;
      height: 48px;
      border-radius: 14px;
      background: #dbeafe;
      color: #0050E5;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .banner-active .banner-icon-wrap {
      background: #dcfce7;
      color: #16a34a;
    }
    .banner-icon-wrap .material-symbols-outlined {
      font-size: 26px;
    }
    .banner-body {
      flex: 1;
      min-width: 240px;
    }
    .banner-body h4 {
      margin: 0 0 4px 0;
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
    }
    .banner-body p {
      margin: 0;
      font-size: 13px;
      color: #475569;
      line-height: 1.5;
    }

    .gen-cards-grid {
      display: grid;
      grid-template-columns: 1.2fr 1fr;
      gap: 20px;
      margin-top: 18px;
    }
    @media (max-width: 960px) {
      .gen-cards-grid {
        grid-template-columns: 1fr;
      }
    }

    .gen-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 18px;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.03);
    }
    .gen-card-head {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding-bottom: 14px;
      border-bottom: 1px solid #f1f5f9;
    }
    .head-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: #eff6ff;
      color: #0050E5;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .head-icon-emerald {
      background: #ecfdf5;
      color: #059669;
    }
    .gen-card-head h3 {
      margin: 0 0 3px 0;
      font-size: 15px;
      font-weight: 800;
      color: #0f172a;
    }
    .gen-card-head p {
      margin: 0;
      font-size: 12.5px;
      color: #64748b;
    }

    .gen-card-body {
      display: flex;
      flex-direction: column;
      gap: 16px;
      flex: 1;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .form-label {
      font-size: 12px;
      font-weight: 700;
      color: #334155;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .form-control {
      height: 42px;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      padding: 0 14px;
      font-size: 13.5px;
      color: #0f172a;
      background: #ffffff;
      outline: none;
    }
    .form-control:focus {
      border-color: #0050E5;
      box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.1);
    }
    .form-hint {
      font-size: 11.5px;
      color: #64748b;
    }

    .readonly-input-box {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      border-radius: 10px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      color: #0f172a;
    }
    .readonly-input-box .material-symbols-outlined {
      font-size: 18px;
      color: #0050E5;
    }
    .email-mono {
      font-family: monospace;
      font-size: 13.5px;
      font-weight: 700;
      flex: 1;
    }
    .verified-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      font-weight: 700;
      color: #15803d;
      background: #dcfce7;
      padding: 3px 9px;
      border-radius: 999px;
    }
    .verified-chip .material-symbols-outlined {
      font-size: 14px;
      color: #16a34a;
    }

    .channel-tags-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px;
    }
    .channel-tags-title {
      font-size: 11px;
      font-weight: 800;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 10px;
    }
    .channel-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .channel-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12.5px;
      font-weight: 600;
      color: #1e293b;
    }
    .channel-item .material-symbols-outlined {
      font-size: 17px;
      color: #16a34a;
    }

    .info-callout {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 14px;
      border-radius: 12px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
    }
    .info-callout .material-symbols-outlined {
      color: #0050E5;
      font-size: 20px;
      margin-top: 1px;
    }
    .info-callout strong {
      display: block;
      font-size: 12.5px;
      color: #1e3a8a;
      margin-bottom: 2px;
    }
    .info-callout p {
      margin: 0;
      font-size: 12px;
      color: #1e40af;
      line-height: 1.45;
    }

    .card-footer-actions {
      margin-top: auto;
      padding-top: 8px;
    }

    .btn-primary-action {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      height: 42px;
      padding: 0 20px;
      border-radius: 10px;
      border: none;
      background: #0050E5;
      color: #ffffff;
      font-size: 13.5px;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .btn-primary-action:hover:not(:disabled) {
      background: #003ebd;
    }
    .btn-primary-action:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-outline-action {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      height: 42px;
      padding: 0 20px;
      border-radius: 10px;
      border: 1.5px solid #0050E5;
      background: #ffffff;
      color: #0050E5;
      font-size: 13.5px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-outline-action:hover:not(:disabled) {
      background: #eff6ff;
    }
    .btn-outline-action:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }

    .full-width {
      width: 100%;
    }

    .currency-live-box {
      background: #f8fafc;
      border: 1.5px dashed #cbd5e1;
      border-radius: 12px;
      padding: 16px;
      text-align: center;
      margin: 4px 0 8px;
    }
    .currency-live-label {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.08em;
      color: #64748b;
    }
    .currency-live-price {
      font-size: 28px;
      font-weight: 900;
      color: #0f172a;
      display: flex;
      align-items: baseline;
      justify-content: center;
      gap: 4px;
      margin: 6px 0 2px;
    }
    .currency-live-price .sym {
      color: #0050E5;
      font-weight: 900;
    }
    .currency-live-price .amt {
      color: #0f172a;
    }
    .currency-live-price .iso {
      font-size: 14px;
      font-weight: 700;
      color: #64748b;
      margin-left: 4px;
    }
    .currency-live-sub {
      font-size: 11.5px;
      color: #64748b;
      line-height: 1.4;
    }

    .billing-context-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .billing-chip-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .billing-badge {
      font-size: 10.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 3px 8px;
      border-radius: 6px;
      background: #e0e7ff;
      color: #3730a3;
    }
    .billing-curr {
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
    }
    .billing-desc {
      margin: 0;
      font-size: 12.5px;
      color: #475569;
      line-height: 1.5;
    }
    .billing-rules-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding-top: 4px;
    }
    .rule-item {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      font-size: 12px;
      color: #334155;
      line-height: 1.4;
    }
    .rule-check {
      font-size: 16px;
      color: #10b981;
      flex-shrink: 0;
      margin-top: 1px;
    }
  `]
})
export class GeneralSettingsComponent implements OnInit {
  activeTab: 'email' | 'currency' = 'email';
  activatingEmail = false;
  sendingTestEmail = false;
  testRecipientEmail = '';

  savingCurrency = false;
  currencySettings = {
    currencyCode: 'USD',
    currencySymbol: '$',
    platformBillingCurrencyCode: 'USD',
    platformBillingCurrencySymbol: '$'
  };

  private readonly currencySymbols: { [code: string]: string } = {
    'USD': '$',
    'NGN': '₦',
    'GBP': '£',
    'EUR': '€',
    'CAD': 'CA$',
    'KES': 'KSh',
    'ZAR': 'R',
    'GHS': 'GH₵',
    'AUD': 'A$',
    'INR': '₹',
    'JPY': '¥',
    'AED': 'AED',
    'ZMW': 'ZK',
    'UGX': 'USh',
    'RWF': 'FRw',
    'EGP': 'E£'
  };

  emailStatus = {
    isConfigured: false,
    tenantKey: '',
    brandName: '',
    senderName: '',
    senderEmail: '',
    recommendedAddress: '',
    smtpEnableSsl: true,
    smtpPort: 587
  };

  constructor(
    private readonly api: ApiService,
    private readonly toast: ToastService,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    if (this.router.url.includes('currency')) {
      this.activeTab = 'currency';
    } else {
      this.activeTab = 'email';
    }
    this.loadEmailSetupStatus();
    this.loadCurrencySettings();
  }

  /**
   * Switches the active settings tab and updates the route URL accordingly.
   */
  selectTab(tab: 'email' | 'currency'): void {
    this.activeTab = tab;
    if (tab === 'currency') {
      this.router.navigate(['/settings/console/general/currency']);
    } else {
      this.router.navigate(['/settings/console/general/email']);
    }
  }

  /**
   * Auto-populates visual currency symbol when the user selects a standard currency code.
   */
  onCurrencyCodeChange(): void {
    const code = this.currencySettings.currencyCode?.toUpperCase();
    if (code && this.currencySymbols[code]) {
      this.currencySettings.currencySymbol = this.currencySymbols[code];
    }
  }

  /**
   * Loads the current operational running currency configuration for this workspace.
   */
  loadCurrencySettings(): void {
    this.api.get<any>('SettingsApi/currency').subscribe({
      next: (res: any) => {
        const data = res?.data;
        if (data) {
          this.currencySettings = {
            currencyCode: data.currencyCode || 'USD',
            currencySymbol: data.currencySymbol || '$',
            platformBillingCurrencyCode: data.platformBillingCurrencyCode || 'USD',
            platformBillingCurrencySymbol: data.platformBillingCurrencySymbol || '$'
          };
        }
      },
      error: () => {}
    });
  }

  /**
   * Saves the updated default operational running currency.
   */
  saveCurrencySettings(): void {
    if (!this.currencySettings.currencyCode?.trim()) {
      this.toast.warning('Please select a currency code.');
      return;
    }

    this.savingCurrency = true;
    this.api.put<any>('SettingsApi/currency', {
      currencyCode: this.currencySettings.currencyCode.trim(),
      currencySymbol: this.currencySettings.currencySymbol?.trim() || '$'
    }).subscribe({
      next: (res: any) => {
        this.savingCurrency = false;
        if (res?.data) {
          this.currencySettings = {
            ...this.currencySettings,
            ...res.data
          };
        }
        this.toast.success('Default workspace running currency updated successfully.');
      },
      error: (err: any) => {
        this.savingCurrency = false;
        this.toast.error(err?.error?.message || 'Unable to update currency settings.');
      }
    });
  }

  /**
   * Loads the current notification email configuration status for this workspace.
   */
  loadEmailSetupStatus(): void {
    this.api.get<any>('SettingsApi/email-setup-status').subscribe({
      next: (res: any) => {
        const data = res?.data;
        if (data) {
          this.emailStatus = {
            ...this.emailStatus,
            ...data,
            senderName: data.senderName || data.brandName || ''
          };
        }
      },
      error: () => {}
    });
  }

  /**
   * Enables or updates the workspace's notification email service (`noreply@{tenant}.ozikol.cloud`).
   */
  activateOrUpdateEmailService(): void {
    this.activatingEmail = true;
    this.api.post<any>('SettingsApi/provision-mailcow', {
      senderName: this.emailStatus.senderName
    }).subscribe({
      next: (res: any) => {
        this.activatingEmail = false;
        this.emailStatus.isConfigured = true;
        if (res?.data?.senderEmail) {
          this.emailStatus.senderEmail = res.data.senderEmail;
        }
        this.toast.success('Your email service for notifications has been activated.');
      },
      error: (err: any) => {
        this.activatingEmail = false;
        this.toast.error(err?.error?.message || 'Unable to update email notification settings.');
      }
    });
  }

  /**
   * Sends a live test email using the workspace's configured notification service.
   */
  sendTestEmail(): void {
    if (!this.testRecipientEmail?.trim()) {
      this.toast.warning('Please enter a recipient email address.');
      return;
    }

    this.sendingTestEmail = true;
    this.api.post<any>('SettingsApi/test-email', {
      recipientEmail: this.testRecipientEmail.trim()
    }).subscribe({
      next: (res: any) => {
        this.sendingTestEmail = false;
        this.toast.success(res?.message || `Test email sent to ${this.testRecipientEmail.trim()}.`);
      },
      error: (err: any) => {
        this.sendingTestEmail = false;
        this.toast.error(err?.error?.message || 'Could not send test email.');
      }
    });
  }
}

