import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { TranslationService } from '../../../core/services/translation.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

/**
 * Standardized error code reference item displayed to workspace administrators.
 * Contains only the Error Code, Category, Custom Error message, and plain-language Meaning.
 */
export interface ClientErrorCodeItem {
  code: string;
  category: string;
  customError: string;
  meaning: string;
}

/**
 * Client Admin Error Codes Reference Directory (/identity/console/error-codes) under Audit Logs.
 * Displays the standardized ERR-XXXX catalog and user-friendly meanings without exposing internal RealError telemetry.
 */
@Component({
  selector: 'app-identity-error-codes',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslatePipe],
  template: `
    <div class="error-codes-page">
      <!-- Page Header -->
      <div class="ec-header">
        <div class="ec-title-group">
          <div class="ec-breadcrumb">
            <a routerLink="/identity/console/audit-logs" class="ec-back-link">
              <span class="material-symbols-outlined">security</span>
              <span>{{ 'nav.security_audit' | translate:'Security & Audit Logs' }}</span>
            </a>
            <span class="ec-sep">/</span>
            <span class="ec-current">{{ 'nav.error_codes' | translate:'Error Codes' }}</span>
          </div>
          <h1 class="ec-title">{{ 'err_ref.title' | translate:'Standard Error Codes & Meanings' }}</h1>
          <p class="ec-subtitle">
            {{ 'err_ref.subtitle' | translate:'Look up any error code shown in your workspace to understand what it means and how to resolve it.' }}
          </p>
        </div>
        <div class="ec-actions">
          <a routerLink="/identity/console/audit-logs" class="ec-btn-secondary">
            <span class="material-symbols-outlined">history</span>
            <span>{{ 'nav.security_audit' | translate:'Audit Logs' }}</span>
          </a>
        </div>
      </div>

      <!-- Filter & Search Bar -->
      <div class="ec-toolbar">
        <div class="ec-search-wrap">
          <span class="material-symbols-outlined ec-search-icon">search</span>
          <input
            type="text"
            [(ngModel)]="searchQuery"
            (ngModelChange)="applyFilter()"
            [placeholder]="'err_ref.search_placeholder' | translate:'e.g. ERR-3001 or payment'"
            class="ec-search-input"
          />
          <button
            *ngIf="searchQuery"
            type="button"
            class="ec-clear-btn"
            (click)="searchQuery = ''; applyFilter()">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="ec-category-pills">
          <button
            type="button"
            class="ec-cat-pill"
            [class.active]="selectedCategory === 'ALL'"
            (click)="selectCategory('ALL')">
            {{ 'common.all' | translate:'All' }} ({{ allCodes.length }})
          </button>
          <button
            *ngFor="let cat of categories"
            type="button"
            class="ec-cat-pill"
            [class.active]="selectedCategory === cat"
            (click)="selectCategory(cat)">
            {{ cat | translate:cat }} ({{ countByCategory(cat) }})
          </button>
        </div>
      </div>

      <!-- Error Codes Table Card -->
      <div class="ec-card">
        <div class="ec-table-wrap">
          <table class="ec-table">
            <thead>
              <tr>
                <th style="width: 140px;">{{ 'err_ref.col_code' | translate:'Error Code' }}</th>
                <th style="width: 210px;">{{ 'err_ref.col_category' | translate:'Category' }}</th>
                <th style="width: 250px;">{{ 'err_ref.col_custom_error' | translate:'Custom Error' }}</th>
                <th>{{ 'err_ref.col_meaning' | translate:'Meaning & Recommended Action' }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of filteredCodes">
                <td>
                  <span class="ec-code-badge">{{ item.code }}</span>
                </td>
                <td>
                  <span class="ec-category-badge">{{ item.category | translate:item.category }}</span>
                </td>
                <td class="ec-custom-msg">
                  {{ item.customError | translate:item.customError }}
                </td>
                <td class="ec-meaning-msg">
                  {{ item.meaning | translate:item.meaning }}
                </td>
              </tr>
              <tr *ngIf="filteredCodes.length === 0">
                <td colspan="4" class="ec-empty">
                  <span class="material-symbols-outlined">search_off</span>
                  <div>{{ 'err_ref.no_match' | translate:'No matching error code found.' }}</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .error-codes-page {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .ec-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }
    .ec-breadcrumb {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
      margin-bottom: 6px;
    }
    .ec-back-link {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: #0050e5;
      text-decoration: none;
    }
    .ec-back-link .material-symbols-outlined {
      font-size: 15px;
    }
    .ec-title {
      margin: 0;
      font-size: 22px;
      font-weight: 800;
      color: var(--md-sys-color-on-surface, #0f172a);
    }
    .ec-subtitle {
      margin: 4px 0 0 0;
      font-size: 13px;
      color: #64748b;
    }
    .ec-btn-secondary {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 36px;
      padding: 0 14px;
      border-radius: 8px;
      border: 1px solid var(--md-sys-color-outline, #e2e8f0);
      background: var(--md-sys-color-surface, #ffffff);
      color: var(--md-sys-color-on-surface, #0f172a);
      font-size: 12.5px;
      font-weight: 700;
      text-decoration: none;
    }
    .ec-btn-secondary .material-symbols-outlined {
      font-size: 16px;
      color: #0050e5;
    }
    .ec-toolbar {
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: var(--md-sys-color-surface, #ffffff);
      border: 1px solid var(--md-sys-color-outline, #e2e8f0);
      border-radius: 12px;
      padding: 14px 16px;
    }
    .ec-search-wrap {
      position: relative;
      max-width: 420px;
    }
    .ec-search-icon {
      position: absolute;
      left: 11px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 18px;
      color: #64748b;
    }
    .ec-search-input {
      width: 100%;
      height: 38px;
      padding: 0 34px 0 36px;
      border-radius: 8px;
      border: 1px solid var(--md-sys-color-outline, #cbd5e1);
      background: var(--md-sys-color-background, #f8fafc);
      color: var(--md-sys-color-on-surface, #0f172a);
      font-size: 13px;
      box-sizing: border-box;
    }
    .ec-clear-btn {
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      border: none;
      background: transparent;
      cursor: pointer;
      color: #64748b;
      display: inline-flex;
      align-items: center;
    }
    .ec-category-pills {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .ec-cat-pill {
      height: 30px;
      padding: 0 12px;
      border-radius: 999px;
      border: 1px solid var(--md-sys-color-outline, #e2e8f0);
      background: transparent;
      color: #475569;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .ec-cat-pill.active {
      background: #0050e5;
      border-color: #0050e5;
      color: #ffffff;
    }
    .ec-card {
      background: var(--md-sys-color-surface, #ffffff);
      border: 1px solid var(--md-sys-color-outline, #e2e8f0);
      border-radius: 12px;
      overflow: hidden;
    }
    .ec-table-wrap {
      overflow-x: auto;
    }
    .ec-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    .ec-table th {
      padding: 12px 16px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #64748b;
      background: rgba(248, 250, 252, 0.8);
      border-bottom: 1px solid var(--md-sys-color-outline, #e2e8f0);
    }
    .ec-table td {
      padding: 13px 16px;
      border-bottom: 1px solid var(--md-sys-color-outline, #f1f5f9);
      vertical-align: top;
      font-size: 13px;
    }
    .ec-code-badge {
      display: inline-block;
      font-family: monospace;
      font-size: 12.5px;
      font-weight: 800;
      padding: 3px 8px;
      border-radius: 6px;
      background: rgba(0, 80, 229, 0.08);
      color: #0050e5;
      border: 1px solid rgba(0, 80, 229, 0.2);
    }
    .ec-category-badge {
      display: inline-block;
      font-size: 11.5px;
      font-weight: 700;
      padding: 3px 9px;
      border-radius: 999px;
      background: #f1f5f9;
      color: #334155;
    }
    .ec-custom-msg {
      font-weight: 700;
      color: var(--md-sys-color-on-surface, #0f172a);
    }
    .ec-meaning-msg {
      color: #475569;
      line-height: 1.45;
    }
    .ec-empty {
      text-align: center;
      padding: 36px 16px !important;
      color: #64748b;
    }
    .ec-empty .material-symbols-outlined {
      font-size: 32px;
      margin-bottom: 6px;
      color: #94a3b8;
    }
  `]
})
export class IdentityErrorCodesComponent implements OnInit {
  allCodes: ClientErrorCodeItem[] = [
    // Authentication & Identity
    {
      code: 'ERR-1001',
      category: 'Authentication & Identity',
      customError: 'Invalid credentials.',
      meaning: 'The email, username, or password entered is incorrect. Verify your login details and try again.'
    },
    {
      code: 'ERR-1002',
      category: 'Authentication & Identity',
      customError: 'Session expired. Please sign in again.',
      meaning: 'Your authentication session has timed out or been signed out. Sign in again to continue.'
    },
    {
      code: 'ERR-1003',
      category: 'Authentication & Identity',
      customError: 'Access denied.',
      meaning: 'Your account does not have permission to perform this action. Contact your workspace administrator.'
    },
    {
      code: 'ERR-1004',
      category: 'Authentication & Identity',
      customError: 'Two-factor verification failed.',
      meaning: 'The security verification code entered is invalid or has expired. Request a new code and try again.'
    },
    {
      code: 'ERR-1005',
      category: 'Authentication & Identity',
      customError: 'Account locked or suspended.',
      meaning: 'This user account is currently restricted or deactivated. Contact your workspace administrator.'
    },
    {
      code: 'ERR-1006',
      category: 'Authentication & Identity',
      customError: 'Password policy requirements not met.',
      meaning: 'The password provided does not meet the workspace security complexity requirements.'
    },

    // Validation & Request Data
    {
      code: 'ERR-2001',
      category: 'Validation & Request Data',
      customError: 'Invalid request data.',
      meaning: 'One or more fields in your submission contain invalid values. Review the form fields and try again.'
    },
    {
      code: 'ERR-2002',
      category: 'Validation & Request Data',
      customError: 'Required information is missing.',
      meaning: 'Mandatory fields were left blank. Complete all required fields before submitting.'
    },
    {
      code: 'ERR-2003',
      category: 'Validation & Request Data',
      customError: 'Duplicate record detected.',
      meaning: 'A record with the same unique identifier, email, or code already exists in your workspace.'
    },
    {
      code: 'ERR-2004',
      category: 'Validation & Request Data',
      customError: 'Requested record not found.',
      meaning: 'The item you are attempting to view, update, or delete could not be found.'
    },
    {
      code: 'ERR-2005',
      category: 'Validation & Request Data',
      customError: 'Operation not allowed in current state.',
      meaning: 'This action cannot be completed because of the item current status or linked dependencies.'
    },

    // Billing & Payments
    {
      code: 'ERR-3001',
      category: 'Billing & Payments',
      customError: 'Paystack unavailable.',
      meaning: 'The Paystack payment channel is temporarily unavailable. Please select another payment method or try again later.'
    },
    {
      code: 'ERR-3002',
      category: 'Billing & Payments',
      customError: 'Flutterwave unavailable.',
      meaning: 'The Flutterwave payment channel is temporarily unavailable. Please select another payment method or try again later.'
    },
    {
      code: 'ERR-3003',
      category: 'Billing & Payments',
      customError: 'Stripe unavailable.',
      meaning: 'The Stripe payment channel is temporarily unavailable. Please select another payment method or try again later.'
    },
    {
      code: 'ERR-3004',
      category: 'Billing & Payments',
      customError: 'Payment verification failed.',
      meaning: 'We could not confirm the payment status with the payment provider. If debited, please contact support with your invoice number.'
    },
    {
      code: 'ERR-3005',
      category: 'Billing & Payments',
      customError: 'Invoice unavailable.',
      meaning: 'The requested invoice could not be found or is no longer eligible for payment.'
    },
    {
      code: 'ERR-3006',
      category: 'Billing & Payments',
      customError: 'Payment gateway not enabled.',
      meaning: 'The selected payment method is not enabled for this workspace.'
    },
    {
      code: 'ERR-3007',
      category: 'Billing & Payments',
      customError: 'Subscription update failed.',
      meaning: 'Your feature subscription could not be updated at this time. Please refresh and try again.'
    },

    // Workspace & Capabilities
    {
      code: 'ERR-4001',
      category: 'Workspace & Capabilities',
      customError: 'Workspace not found.',
      meaning: 'The requested organization workspace could not be resolved. Verify the workspace URL or access code.'
    },
    {
      code: 'ERR-4002',
      category: 'Workspace & Capabilities',
      customError: 'Workspace is currently suspended.',
      meaning: 'Access to this organization workspace is temporarily paused. Please contact billing or platform support.'
    },
    {
      code: 'ERR-4003',
      category: 'Workspace & Capabilities',
      customError: 'Capability not active.',
      meaning: 'This modular feature is not currently active on your workspace plan. Activate it in Workspace Features & Capabilities.'
    },
    {
      code: 'ERR-4004',
      category: 'Workspace & Capabilities',
      customError: 'Workspace quota limit reached.',
      meaning: 'Your organization has reached the maximum allowance for this resource.'
    },
    {
      code: 'ERR-4005',
      category: 'Workspace & Capabilities',
      customError: 'Workspace provisioning failed.',
      meaning: 'The workspace setup encountered an interruption. Please retry in a few moments.'
    },

    // Communications & AI
    {
      code: 'ERR-5001',
      category: 'Communications & AI',
      customError: 'Email dispatch failed.',
      meaning: 'The email notification could not be queued or delivered at this time.'
    },
    {
      code: 'ERR-5002',
      category: 'Communications & AI',
      customError: 'SMS dispatch failed.',
      meaning: 'The SMS alert could not be dispatched. Verify the recipient phone number format.'
    },
    {
      code: 'ERR-5003',
      category: 'Communications & AI',
      customError: 'AI assistant temporarily unavailable.',
      meaning: 'The Ozi AI Studio service is currently busy or unreachable. Please try your prompt again shortly.'
    },
    {
      code: 'ERR-5004',
      category: 'Communications & AI',
      customError: 'Media upload failed.',
      meaning: 'The file could not be uploaded. Ensure the file format and size meet workspace guidelines.'
    },

    // System & Infrastructure
    {
      code: 'ERR-9001',
      category: 'System & Infrastructure',
      customError: 'Service temporarily unavailable.',
      meaning: 'A background service required for this action is temporarily unreachable. Please try again shortly.'
    },
    {
      code: 'ERR-9002',
      category: 'System & Infrastructure',
      customError: 'Request timed out.',
      meaning: 'The operation took longer than expected to respond. Check your connection and try again.'
    },
    {
      code: 'ERR-9003',
      category: 'System & Infrastructure',
      customError: 'Too many requests. Please slow down.',
      meaning: 'Rate limit exceeded for this action. Wait a moment before retrying.'
    },
    {
      code: 'ERR-9999',
      category: 'System & Infrastructure',
      customError: 'An unexpected error occurred.',
      meaning: 'An unexpected system error prevented this request from completing. Reference the error code if contacting support.'
    }
  ];

  filteredCodes: ClientErrorCodeItem[] = [];
  categories: string[] = [];
  selectedCategory = 'ALL';
  searchQuery = '';

  constructor(
    private apiService: ApiService,
    private translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.rebuildCategories();
    this.registerTranslations();
    this.applyFilter();
    this.fetchLatestCatalog();
  }

  private fetchLatestCatalog(): void {
    this.apiService.get<ClientErrorCodeItem[]>('error-codes').subscribe({
      next: (res: any) => {
        const items = res?.data || res?.Data;
        if (Array.isArray(items) && items.length > 0) {
          this.allCodes = items.map((x: any) => ({
            code: x.code || x.Code,
            category: x.category || x.Category,
            customError: x.customError || x.CustomError,
            meaning: x.meaning || x.Meaning
          }));
          this.rebuildCategories();
          this.registerTranslations();
          this.applyFilter();
        }
      },
      error: () => {
        // Fallback to built-in catalog
      }
    });
  }

  private rebuildCategories(): void {
    const set = new Set<string>();
    for (const item of this.allCodes) {
      if (item.category) set.add(item.category);
    }
    this.categories = Array.from(set);
  }

  private registerTranslations(): void {
    const texts: string[] = [];
    for (const item of this.allCodes) {
      texts.push(item.category, item.customError, item.meaning);
    }
    this.translationService.registerDynamicTexts(texts);
  }

  selectCategory(cat: string): void {
    this.selectedCategory = cat;
    this.applyFilter();
  }

  countByCategory(cat: string): number {
    return this.allCodes.filter(x => x.category === cat).length;
  }

  applyFilter(): void {
    const q = (this.searchQuery || '').trim().toLowerCase();
    this.filteredCodes = this.allCodes.filter(item => {
      if (this.selectedCategory !== 'ALL' && item.category !== this.selectedCategory) {
        return false;
      }
      if (!q) return true;
      return (
        item.code.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.customError.toLowerCase().includes(q) ||
        item.meaning.toLowerCase().includes(q)
      );
    });
  }
}

