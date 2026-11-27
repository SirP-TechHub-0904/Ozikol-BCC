import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';

/**
 * General Settings Console Component (located under Security & Audit).
 * Centralizes workspace-wide system settings (starting with Email Configuration for notifications)
 * distinct from individual feature module settings.
 */
@Component({
  selector: 'app-general-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="gen-settings-page">
      <!-- Canonical Page Header Card -->
      <div class="page-header">
        <div class="header-left">
          <div class="breadcrumb">
            <a routerLink="/admin/dashboard">Command Center</a>
            <span class="sep">/</span>
            <span>Security &amp; Audit</span>
            <span class="sep">/</span>
            <span class="current">System Settings</span>
          </div>
          <div class="title-row">
            <span class="material-symbols-outlined header-icon text-blue">settings</span>
            <h1>System Settings</h1>
            <span class="badge-suite">SUITE: SECURITY &amp; SYSTEM GOVERNANCE</span>
          </div>
          <p class="subtitle">Configure core workspace-wide governance policies, currency, and notification infrastructure.</p>
        </div>
      </div>

      <!-- Modular System Settings Navigation Bar -->
      <div class="gen-tabs-bar">
        <button
          type="button"
          class="gen-tab-btn"
          [class.active]="activeTab === 'general'"
          (click)="selectTab('general')"
        >
          <span class="material-symbols-outlined tab-icon">tune</span>
          <div class="tab-meta">
            <div class="tab-title-row">
              <span class="tab-title">General Settings</span>
              <span class="status-pill" [class.pill-active]="enableUserDeletion" [class.pill-pending]="!enableUserDeletion">
                {{ enableUserDeletion ? 'Deletion Permitted' : 'Deletion Locked' }}
              </span>
            </div>
            <span class="tab-sub">User Governance & Security Policies</span>
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
              <span class="tab-title">Currency</span>
              <span class="status-pill pill-active">
                {{ currencySettings.currencyCode }} ({{ currencySettings.currencySymbol }})
              </span>
            </div>
            <span class="tab-sub">Operational Running Currency</span>
          </div>
        </button>

        <button
          type="button"
          class="gen-tab-btn"
          [class.active]="activeTab === 'email'"
          (click)="selectTab('email')"
        >
          <span class="material-symbols-outlined tab-icon">mark_email_read</span>
          <div class="tab-meta">
            <div class="tab-title-row">
              <span class="tab-title">Emails</span>
              <span class="status-pill" [class.pill-active]="emailStatus.isConfigured" [class.pill-pending]="!emailStatus.isConfigured">
                {{ emailStatus.isConfigured ? 'Active' : 'Setup Required' }}
              </span>
            </div>
            <span class="tab-sub">Workspace Notification Email Service</span>
          </div>
        </button>
      </div>

      <!-- TAB 1: GENERAL SETTINGS (USER GOVERNANCE) -->
      <div *ngIf="activeTab === 'general'" class="gen-tab-content">
        <div class="status-banner" [class.banner-active]="enableUserDeletion" [class.banner-pending]="!enableUserDeletion">
          <div class="banner-icon-wrap">
            <span class="material-symbols-outlined">{{ enableUserDeletion ? 'admin_panel_settings' : 'shield_lock' }}</span>
          </div>
          <div class="banner-body">
            <h4>
              {{ enableUserDeletion
                ? 'Administrator User Account Deletion is Enabled'
                : 'Administrator User Account Deletion is Locked' }}
            </h4>
            <p>
              {{ enableUserDeletion
                ? 'Authorized administrators can permanently delete member accounts from the Member Directory.'
                : 'Member accounts are protected from permanent deletion. Enable the policy below to permit administrator deletions.' }}
            </p>
          </div>
        </div>

        <div class="gen-card">
          <div class="gen-card-head">
            <div class="head-icon" style="background: #fef2f2; color: #dc2626;">
              <span class="material-symbols-outlined">person_remove</span>
            </div>
            <div>
              <h3>Allow Administrator User Account Deletion</h3>
              <p>Control whether administrators are permitted to permanently destroy member accounts from the portal.</p>
            </div>
          </div>

          <div class="gen-card-body">
            <div class="deletion-toggle-box">
              <div class="deletion-toggle-info">
                <strong class="deletion-toggle-title">Enable User Account Deletion</strong>
                <span class="deletion-toggle-desc">When turned on, administrators can permanently delete user profiles after confirmation.</span>
              </div>
              <label class="deletion-toggle-control">
                <input type="checkbox" [(ngModel)]="enableUserDeletion" />
                <span>{{ enableUserDeletion ? 'Enabled' : 'Disabled' }}</span>
              </label>
            </div>

            <button
              type="button"
              class="btn-primary-action"
              [disabled]="savingGeneralSettings"
              (click)="saveGeneralSettings()"
            >
              <span class="material-symbols-outlined">{{ savingGeneralSettings ? 'progress_activity' : 'check' }}</span>
              <span>{{ savingGeneralSettings ? 'Saving...' : 'Save' }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- TAB 2: EMAILS CONFIGURATION -->
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

          <!-- Card 2: Workspace Operating Country & Regional Defaults -->
          <div class="gen-card">
            <div class="gen-card-head">
              <div class="head-icon head-icon-emerald">
                <span class="material-symbols-outlined">public</span>
              </div>
              <div>
                <h3>Workspace Operating Country &amp; Defaults</h3>
                <p>Configures your business operating jurisdiction and default international dialing code.</p>
              </div>
            </div>

            <div class="gen-card-body">
              <div class="form-group">
                <label class="form-label">Operating Country</label>
                <select
                  class="form-control"
                  [(ngModel)]="currencySettings.operatingCountry"
                  (ngModelChange)="onOperatingCountryChange()"
                >
                  <option value="GB">🇬🇧 United Kingdom (+44)</option>
                  <option value="NG">🇳🇬 Nigeria (+234)</option>
                  <option value="US">🇺🇸 United States (+1)</option>
                  <option value="CA">🇨🇦 Canada (+1)</option>
                  <option value="GH">🇬🇭 Ghana (+233)</option>
                  <option value="KE">🇰🇪 Kenya (+254)</option>
                  <option value="ZA">🇿🇦 South Africa (+27)</option>
                  <option value="IE">🇮🇪 Ireland (+353)</option>
                  <option value="DE">🇩🇪 Germany (+49)</option>
                  <option value="FR">🇫🇷 France (+33)</option>
                  <option value="AU">🇦🇺 Australia (+61)</option>
                  <option value="IN">🇮🇳 India (+91)</option>
                  <option value="AE">🇦🇪 United Arab Emirates (+971)</option>
                  <option value="EG">🇪🇬 Egypt (+20)</option>
                </select>
                <span class="form-hint">Governs the default country flag and calling code for phone number inputs across the workspace.</span>
              </div>

              <!-- Country Calling Code Preview -->
              <div class="billing-context-card" style="margin-top: 16px;">
                <div class="billing-chip-row">
                  <span class="billing-badge">Country Phone Default</span>
                  <span class="billing-curr">{{ getCountryCallingCode(currencySettings.operatingCountry) }}</span>
                </div>
                <p class="billing-desc">
                  When adding new members, inviting workforce staff, or capturing contact numbers, phone inputs will automatically default to <strong>{{ getCountryCallingCode(currencySettings.operatingCountry) }}</strong>.
                </p>
                <div class="billing-rules-list">
                  <div class="rule-item">
                    <span class="material-symbols-outlined rule-check">check_circle</span>
                    <span><strong>Workforce Invitations:</strong> Self-registration links automatically pre-populate the business dial code.</span>
                  </div>
                  <div class="rule-item">
                    <span class="material-symbols-outlined rule-check">check_circle</span>
                    <span><strong>Member Provisioning:</strong> Admin creation forms adapt instantly to your regional jurisdiction.</span>
                  </div>
                </div>
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

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
      background: #ffffff;
      padding: 18px 22px;
      border-radius: 14px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02);
    }
    .header-left { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
    .breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #64748b; }
    .breadcrumb a { color: #0050e5; text-decoration: none; font-weight: 500; }
    .breadcrumb .sep { color: #cbd5e1; }
    .breadcrumb .current { color: #0f172a; font-weight: 600; }
    .title-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .title-row h1 { margin: 0; font-size: 24px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; }
    .header-icon { font-size: 28px; }
    .badge-suite { background: #eff6ff; color: #0050e5; border: 1px solid #bfdbfe; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 999px; text-transform: uppercase; }
    .subtitle { font-size: 13px; color: #64748b; margin: 0; }

    .deletion-toggle-box {
      padding: 16px 20px;
      background: #fff5f5;
      border: 1px solid #fed7d7;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 20px;
    }
    .deletion-toggle-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .deletion-toggle-title {
      font-size: 14px;
      color: #9b2c2c;
      display: block;
    }
    .deletion-toggle-desc {
      font-size: 12.5px;
      color: #742a2a;
    }
    .deletion-toggle-control {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      font-weight: 700;
      font-size: 13px;
      color: #0f172a;
      flex-shrink: 0;
    }
    .deletion-toggle-control input {
      width: 18px;
      height: 18px;
      accent-color: #0050e5;
      cursor: pointer;
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

    @media (max-width: 768px) {
      .gen-settings-page {
        gap: 14px;
        padding: 0 0 24px 0;
      }
      .page-header {
        flex-direction: column;
        align-items: stretch;
        padding: 14px !important;
        gap: 10px !important;
      }
      .title-row h1 { font-size: 19px !important; }
      .breadcrumb { font-size: 11px; flex-wrap: wrap; }
      .gen-tabs-bar {
        display: flex;
        flex-wrap: nowrap;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        gap: 8px;
        padding-bottom: 8px;
        border-bottom: 1px solid #e2e8f0;
        scrollbar-width: none;
      }
      .gen-tabs-bar::-webkit-scrollbar {
        display: none;
      }
      .gen-tab-btn {
        flex: 0 0 auto;
        padding: 8px 12px;
        gap: 8px;
        border-radius: 10px;
      }
      .tab-icon {
        font-size: 18px;
        padding: 5px;
        border-radius: 8px;
      }
      .tab-title-row {
        gap: 6px;
      }
      .tab-title {
        font-size: 12.5px;
        white-space: nowrap;
      }
      .tab-sub {
        display: none !important;
      }
      .status-pill {
        font-size: 9px;
        padding: 2px 6px;
        white-space: nowrap;
      }
      .status-banner {
        padding: 12px 14px;
        gap: 12px;
        border-radius: 12px;
      }
      .banner-icon-wrap {
        width: 38px;
        height: 38px;
        border-radius: 10px;
      }
      .banner-icon-wrap .material-symbols-outlined {
        font-size: 22px;
      }
      .banner-body {
        min-width: 0;
      }
      .banner-body h4 {
        font-size: 13.5px;
        margin-bottom: 2px;
      }
      .banner-body p {
        font-size: 11.5px;
        line-height: 1.4;
      }
      .banner-actions {
        width: 100%;
        margin-top: 6px;
      }
      .banner-actions .btn-primary-action {
        width: 100%;
      }
      .gen-card {
        padding: 14px 12px;
        border-radius: 12px;
        gap: 12px;
      }
      .gen-card-head {
        gap: 10px;
        padding-bottom: 10px;
      }
      .head-icon {
        width: 34px;
        height: 34px;
        border-radius: 8px;
      }
      .head-icon span {
        font-size: 20px;
      }
      .gen-card-head h3 {
        font-size: 14px;
      }
      .gen-card-head p {
        font-size: 11.5px;
      }
      .deletion-toggle-box {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
        padding: 12px 14px;
        margin-bottom: 14px;
      }
      .deletion-toggle-title {
        font-size: 13px;
      }
      .deletion-toggle-desc {
        font-size: 11.5px;
        line-height: 1.4;
      }
      .deletion-toggle-control {
        width: 100%;
        padding-top: 10px;
        border-top: 1px solid #fed7d7;
        justify-content: space-between;
      }
      .btn-primary-action, .btn-outline-action {
        width: 100%;
        justify-content: center;
        height: 40px;
        font-size: 13px;
      }
      .readonly-input-box {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 6px;
        padding: 8px 12px;
      }
      .email-mono {
        font-size: 11.5px;
        word-break: break-all;
        min-width: 0;
        flex: 1 1 auto;
      }
      .verified-chip {
        flex-shrink: 0;
        font-size: 10px;
        padding: 2px 7px;
      }
      .channel-tags-box {
        padding: 10px 12px;
        gap: 8px;
      }
      .channel-item {
        font-size: 11.5px;
        gap: 6px;
      }
      .info-callout {
        padding: 10px 12px;
        gap: 8px;
      }
      .info-callout strong {
        font-size: 12px;
      }
      .info-callout p {
        font-size: 11px;
        line-height: 1.4;
      }
      .gen-cards-grid {
        gap: 14px !important;
        margin-top: 12px !important;
      }
      .currency-live-price {
        font-size: 22px;
      }
      .currency-live-box {
        padding: 12px;
        margin: 2px 0 6px;
      }
      .form-control {
        height: 38px;
        font-size: 13px;
        padding: 0 12px;
      }
      .form-hint {
        font-size: 11px;
        line-height: 1.35;
      }
      .billing-context-card {
        padding: 12px;
        gap: 10px;
      }
      .billing-curr {
        font-size: 14px;
      }
      .billing-desc {
        font-size: 11.5px;
      }
      .card-footer-actions {
        margin-top: 8px;
        width: 100%;
      }
    }
  `]
})
export class GeneralSettingsComponent implements OnInit {
  activeTab: 'general' | 'currency' | 'email' = 'general';
  enableUserDeletion = false;
  savingGeneralSettings = false;
  activatingEmail = false;
  sendingTestEmail = false;
  testRecipientEmail = '';

  savingCurrency = false;
  currencySettings = {
    currencyCode: 'USD',
    currencySymbol: '$',
    operatingCountry: 'GB',
    platformBillingCurrencyCode: 'USD',
    platformBillingCurrencySymbol: '$'
  };

  private readonly countryDialCodes: { [iso: string]: string } = {
    'GB': '🇬🇧 +44 (UK)',
    'NG': '🇳🇬 +234 (Nigeria)',
    'US': '🇺🇸 +1 (USA)',
    'CA': '🇨🇦 +1 (Canada)',
    'GH': '🇬🇭 +233 (Ghana)',
    'KE': '🇰🇪 +254 (Kenya)',
    'ZA': '🇿🇦 +27 (South Africa)',
    'IE': '🇮🇪 +353 (Ireland)',
    'DE': '🇩🇪 +49 (Germany)',
    'FR': '🇫🇷 +33 (France)',
    'AU': '🇦🇺 +61 (Australia)',
    'IN': '🇮🇳 +91 (India)',
    'AE': '🇦🇪 +971 (UAE)',
    'EG': '🇪🇬 +20 (Egypt)'
  };

  getCountryCallingCode(countryCode?: string): string {
    const code = (countryCode || 'GB').toUpperCase();
    return this.countryDialCodes[code] || `${code} (+44)`;
  }

  onOperatingCountryChange(): void {
    // Optionally suggest currency if matching
    const country = this.currencySettings.operatingCountry?.toUpperCase();
    if (country === 'GB' && this.currencySettings.currencyCode === 'USD') {
      this.currencySettings.currencyCode = 'GBP';
      this.currencySettings.currencySymbol = '£';
    } else if (country === 'NG' && this.currencySettings.currencyCode === 'USD') {
      this.currencySettings.currencyCode = 'NGN';
      this.currencySettings.currencySymbol = '₦';
    }
  }

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
    } else if (this.router.url.includes('email')) {
      this.activeTab = 'email';
    } else {
      this.activeTab = 'general';
    }
    this.loadGeneralGovernanceSettings();
    this.loadEmailSetupStatus();
    this.loadCurrencySettings();
  }

  /**
   * Switches the active settings tab and updates the route URL accordingly.
   */
  selectTab(tab: 'general' | 'currency' | 'email'): void {
    this.activeTab = tab;
    if (tab === 'currency') {
      this.router.navigate(['/settings/console/general/currency']);
    } else if (tab === 'email') {
      this.router.navigate(['/settings/console/general/email']);
    } else {
      this.router.navigate(['/settings/console/general']);
    }
  }

  /**
   * Loads workspace general governance policies (such as administrator user deletion).
   */
  loadGeneralGovernanceSettings(): void {
    this.api.get<any>('UsersApi/settings').subscribe({
      next: (res: any) => {
        if (res?.data) {
          this.enableUserDeletion = !!res.data.enableUserDeletion;
        }
      },
      error: () => {}
    });
  }

  /**
   * Persists the administrator user deletion policy toggle.
   */
  saveGeneralSettings(): void {
    this.savingGeneralSettings = true;
    this.api.put<any>('UsersApi/settings', { enableUserDeletion: this.enableUserDeletion }).subscribe({
      next: (res: any) => {
        this.savingGeneralSettings = false;
        this.enableUserDeletion = !!res?.data?.enableUserDeletion;
        this.toast.success('System general settings saved.');
      },
      error: (err: any) => {
        this.savingGeneralSettings = false;
        this.toast.error(err?.error?.message || 'Failed to save system general settings.');
      }
    });
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
            operatingCountry: data.operatingCountry || 'GB',
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
      currencySymbol: this.currencySettings.currencySymbol?.trim() || '$',
      operatingCountry: this.currencySettings.operatingCountry?.trim() || 'GB'
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

