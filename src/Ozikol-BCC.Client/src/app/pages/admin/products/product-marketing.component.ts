import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent, PageHeaderButton } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-product-marketing',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, PageHeaderComponent],
  template: `
    <div class="marketing-page">
      <app-page-header
        eyebrow="COMMERCE STUDIO"
        icon="campaign"
        title="Product Marketing & Email Broadcast Studio"
        subtitle="Create high-converting email promotional campaigns, launch announcements, and flash discounts dispatched via the background EmailQueue."
        [buttons]="headerButtons"
      ></app-page-header>

      <!-- Sub-Tabs: Compose Campaign vs Past Broadcasts -->
      <div class="tab-strip">
        <button type="button" class="tab-btn" [class.active]="activeView === 'compose'" (click)="activeView = 'compose'">
          <span class="material-symbols-outlined">edit_note</span>
          <span>Compose Campaign</span>
        </button>
        <button type="button" class="tab-btn" [class.active]="activeView === 'history'" (click)="activeView = 'history'; loadCampaigns()">
          <span class="material-symbols-outlined">history</span>
          <span>Broadcast History</span>
          <span class="count-badge">{{ pastCampaigns.length }}</span>
        </button>
      </div>

      <!-- VIEW 1: COMPOSE CAMPAIGN -->
      <div *ngIf="activeView === 'compose'" class="compose-grid">
        <!-- LEFT: Campaign Configuration -->
        <div class="compose-main">
          <!-- 1. Campaign Details -->
          <div class="form-card">
            <h3 class="card-title">
              <span class="material-symbols-outlined icon-blue">tune</span>
              <span>1. Campaign Setup & Product Selection</span>
            </h3>

            <div class="form-row-2">
              <div class="form-group">
                <label class="form-label">Internal Campaign Name <span class="req">*</span></label>
                <input
                  type="text"
                  [(ngModel)]="campaignName"
                  placeholder="e.g. Summer 2026 ERP Product Launch"
                  class="form-control"
                />
              </div>

              <div class="form-group">
                <label class="form-label">Email Subject Line <span class="req">*</span></label>
                <input
                  type="text"
                  [(ngModel)]="emailSubject"
                  placeholder="e.g. 🚀 Introducing the all-new Enterprise Cloud Suite"
                  class="form-control"
                  (input)="updateTemplatePreview()"
                />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Select Featured Product</label>
              <select [(ngModel)]="selectedProductId" (change)="onProductChange()" class="form-control">
                <option [ngValue]="null">-- Select a product to auto-inject details --</option>
                <option *ngFor="let p of products" [ngValue]="p.id">{{ p.title }} ({{ currencySymbol }}{{ p.price | number:'1.2-2' }})</option>
              </select>
            </div>
          </div>

          <!-- 2. Template Selector -->
          <div class="form-card">
            <h3 class="card-title">
              <span class="material-symbols-outlined icon-purple">dashboard_customize</span>
              <span>2. Choose Marketing Template Design</span>
            </h3>

            <div class="templates-grid">
              <div
                class="template-card"
                [class.selected]="selectedTemplate === 'ProductLaunch'"
                (click)="setTemplate('ProductLaunch')"
              >
                <span class="material-symbols-outlined tpl-icon">rocket_launch</span>
                <strong>Product Launch</strong>
                <p>Hero banner, key highlights, and early-bird CTA button.</p>
              </div>

              <div
                class="template-card"
                [class.selected]="selectedTemplate === 'FlashSale'"
                (click)="setTemplate('FlashSale')"
              >
                <span class="material-symbols-outlined tpl-icon">local_fire_department</span>
                <strong>Flash Discount</strong>
                <p>Limited-time offer, strikethrough price, and promo coupon.</p>
              </div>

              <div
                class="template-card"
                [class.selected]="selectedTemplate === 'ServiceInvitation'"
                (click)="setTemplate('ServiceInvitation')"
              >
                <span class="material-symbols-outlined tpl-icon">handshake</span>
                <strong>Service Invitation</strong>
                <p>Executive layout with consultation booking milestones.</p>
              </div>

              <div
                class="template-card"
                [class.selected]="selectedTemplate === 'ProductDigest'"
                (click)="setTemplate('ProductDigest')"
              >
                <span class="material-symbols-outlined tpl-icon">newspaper</span>
                <strong>Catalog Digest</strong>
                <p>Newsletter showcase featuring top commercial products.</p>
              </div>

              <div
                class="template-card"
                [class.selected]="selectedTemplate === 'CustomBuilder'"
                (click)="setTemplate('CustomBuilder')"
              >
                <span class="material-symbols-outlined tpl-icon">code</span>
                <strong>Custom Rich HTML</strong>
                <p>Freeform rich text HTML editor for bespoke designs.</p>
              </div>
            </div>

            <!-- Custom Content Textarea if CustomBuilder -->
            <div *ngIf="selectedTemplate === 'CustomBuilder'" class="form-group" style="margin-top: 14px;">
              <label class="form-label">Custom HTML Body</label>
              <textarea
                [(ngModel)]="customHtml"
                (input)="updateTemplatePreview()"
                rows="6"
                class="form-control font-mono"
                placeholder="<p>Custom HTML template content...</p>"
              ></textarea>
            </div>
          </div>

          <!-- 3. Target Audience & Recipient Selection -->
          <div class="form-card">
            <h3 class="card-title">
              <span class="material-symbols-outlined icon-amber">group_add</span>
              <span>3. Target Audience & Recipients</span>
            </h3>

            <div class="audience-options">
              <label class="audience-radio" [class.selected]="audienceMode === 'manual'">
                <input type="radio" [(ngModel)]="audienceMode" name="audienceMode" value="manual" />
                <span>Type Names & Emails Manually</span>
              </label>
              <label class="audience-radio" [class.selected]="audienceMode === 'csv'">
                <input type="radio" [(ngModel)]="audienceMode" name="audienceMode" value="csv" />
                <span>Upload CSV / Text Recipient List</span>
              </label>
              <label class="audience-radio" [class.selected]="audienceMode === 'category'">
                <input type="radio" [(ngModel)]="audienceMode" name="audienceMode" value="category" />
                <span>Select Member Directory Category</span>
              </label>
            </div>

            <!-- Manual Emails Input -->
            <div *ngIf="audienceMode === 'manual'" class="form-group" style="margin-top: 14px;">
              <label class="form-label">Recipient Emails (Comma or Newline Separated)</label>
              <textarea
                [(ngModel)]="manualEmailsText"
                rows="4"
                placeholder="john@example.com, Sarah Connor <sarah@company.com>, alex@tech.org"
                class="form-control font-mono"
              ></textarea>
              <span class="help-text">You can type bare email addresses or formatted "Name &lt;email&gt;".</span>
            </div>

            <!-- CSV Upload Input -->
            <div *ngIf="audienceMode === 'csv'" class="form-group" style="margin-top: 14px;">
              <label class="form-label">Upload .CSV or .TXT File</label>
              <div class="csv-dropzone" (click)="csvInput.click()">
                <input #csvInput type="file" (change)="onCsvFileSelected($event)" accept=".csv,.txt" style="display:none;" />
                <span class="material-symbols-outlined upload-icon">upload_file</span>
                <p>Click to upload CSV or TXT recipient file</p>
                <span>Automatically detects Name and Email columns</span>
              </div>
              <div *ngIf="parsedCsvEmails.length > 0" class="csv-success-badge">
                <span class="material-symbols-outlined">check_circle</span>
                <span>Parsed <strong>{{ parsedCsvEmails.length }} valid email address(es)</strong> from uploaded file.</span>
              </div>
            </div>

            <!-- Category Selector -->
            <div *ngIf="audienceMode === 'category'" class="form-group" style="margin-top: 14px;">
              <label class="form-label">Member Category / Group</label>
              <select [(ngModel)]="selectedCategoryAudience" class="form-control">
                <option value="AllMembers">All Active Platform Members</option>
                <option *ngFor="let cat of userCategories" [value]="'Category:' + cat.id">{{ cat.name }} Members</option>
              </select>
            </div>
          </div>
        </div>

        <!-- RIGHT: Live Interactive Email Preview & Dispatch -->
        <div class="compose-sidebar">
          <div class="form-card preview-card">
            <h3 class="card-title">
              <span class="material-symbols-outlined icon-green">preview</span>
              <span>Live Email Preview</span>
            </h3>

            <div class="email-preview-frame">
              <div class="email-client-bar">
                <span class="dot red"></span>
                <span class="dot yellow"></span>
                <span class="dot green"></span>
                <span class="preview-subject-line">{{ emailSubject || 'Subject Preview' }}</span>
              </div>
              <div class="preview-body" [innerHTML]="sanitizedPreviewHtml"></div>
            </div>

            <div class="dispatch-action-box">
              <button
                type="button"
                [disabled]="isDispatching"
                (click)="onDispatchCampaign()"
                class="btn btn-primary btn-block btn-lg"
              >
                <span class="material-symbols-outlined">send</span>
                <span>{{ isDispatching ? 'Enqueuing Dispatch...' : 'Dispatch to EmailQueue' }}</span>
              </button>
              <p class="dispatch-hint">
                <span class="material-symbols-outlined">schedule</span>
                <span>Dispatches via background worker without blocking browser.</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- VIEW 2: BROADCAST HISTORY -->
      <div *ngIf="activeView === 'history'" class="history-table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Campaign Name</th>
              <th>Subject Line</th>
              <th>Template</th>
              <th style="text-align: center;">Recipients</th>
              <th style="text-align: center;">Status</th>
              <th>Dispatched Date</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let camp of pastCampaigns">
              <td>
                <strong>{{ camp.campaignName }}</strong>
                <div *ngIf="camp.product" class="camp-product-tag">{{ camp.product.title }}</div>
              </td>
              <td>{{ camp.emailSubject }}</td>
              <td><span class="tpl-pill">{{ camp.templateType }}</span></td>
              <td style="text-align: center;">
                <span class="recipient-pill">{{ camp.totalRecipients }} emails</span>
              </td>
              <td style="text-align: center;">
                <span class="status-pill status-queued">
                  <span class="status-dot"></span>
                  <span>{{ camp.status }}</span>
                </span>
              </td>
              <td class="date-cell">{{ camp.createdAtUtc | date:'medium' }}</td>
            </tr>

            <tr *ngIf="pastCampaigns.length === 0">
              <td colspan="6" class="empty-state">
                <span class="material-symbols-outlined empty-icon">history</span>
                <p>No broadcast campaigns dispatched yet.</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .marketing-page { display: flex; flex-direction: column; gap: 20px; width: 100%; }

    .tab-strip { display: flex; gap: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px; }
    .tab-btn {
      display: flex; align-items: center; gap: 8px; padding: 10px 16px; border: none; background: transparent;
      font-size: 14px; font-weight: 500; color: #64748b; border-bottom: 2px solid transparent; cursor: pointer;
    }
    .tab-btn.active { color: #0050e5; border-bottom-color: #0050e5; font-weight: 600; }
    .count-badge { font-size: 11px; padding: 2px 7px; background: #e2e8f0; border-radius: 12px; }

    .compose-grid { display: grid; grid-template-columns: 1fr 420px; gap: 24px; }
    @media (max-width: 1080px) { .compose-grid { grid-template-columns: 1fr; } }

    .compose-main, .compose-sidebar { display: flex; flex-direction: column; gap: 20px; }

    .form-card { background: #ffffff; padding: 20px; border-radius: 10px; border: 1px solid #e2e8f0; }
    .card-title {
      display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 600; color: #0f172a;
      margin-top: 0; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #f1f5f9;
    }
    .icon-blue { color: #0050e5; }
    .icon-purple { color: #8b5cf6; }
    .icon-amber { color: #f59e0b; }
    .icon-green { color: #10b981; }

    .form-group { margin-bottom: 14px; }
    .form-group:last-child { margin-bottom: 0; }
    .form-label { display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px; }
    .req { color: #ef4444; }
    .form-control {
      width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px;
      outline: none; background: #ffffff; box-sizing: border-box;
    }
    .form-control:focus { border-color: #0050e5; box-shadow: 0 0 0 3px rgba(0,80,229,0.12); }
    .font-mono { font-family: monospace; font-size: 13px; }
    .help-text { font-size: 12px; color: #64748b; margin-top: 4px; display: block; }
    .form-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }

    .templates-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; }
    .template-card {
      border: 2px solid #e2e8f0; border-radius: 8px; padding: 12px; cursor: pointer; transition: all 0.2s; text-align: center;
    }
    .template-card:hover { border-color: #94a3b8; background: #f8fafc; }
    .template-card.selected { border-color: #0050e5; background: rgba(0,80,229,0.04); }
    .tpl-icon { font-size: 28px; color: #0050e5; margin-bottom: 4px; }
    .template-card strong { display: block; font-size: 12px; color: #0f172a; margin-bottom: 2px; }
    .template-card p { font-size: 10px; color: #64748b; margin: 0; line-height: 1.2; }

    .audience-options { display: flex; gap: 12px; flex-wrap: wrap; }
    .audience-radio {
      display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 500; color: #334155;
      padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; cursor: pointer;
    }
    .audience-radio.selected { border-color: #0050e5; background: rgba(0,80,229,0.05); color: #0050e5; }

    .csv-dropzone {
      border: 2px dashed #cbd5e1; border-radius: 8px; padding: 18px; text-align: center; cursor: pointer; background: #f8fafc;
    }
    .upload-icon { font-size: 32px; color: #0050e5; margin-bottom: 4px; }
    .csv-dropzone p { margin: 0 0 2px; font-size: 13px; font-weight: 600; color: #334155; }
    .csv-dropzone span { font-size: 11px; color: #64748b; }
    .csv-success-badge {
      display: flex; align-items: center; gap: 6px; background: #ecfdf5; color: #047857; padding: 8px 12px;
      border-radius: 6px; border: 1px solid #a7f3d0; margin-top: 8px; font-size: 13px;
    }

    .email-preview-frame {
      border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; background: #ffffff;
    }
    .email-client-bar {
      display: flex; align-items: center; gap: 6px; background: #f1f5f9; padding: 8px 12px; border-bottom: 1px solid #e2e8f0;
    }
    .dot { width: 8px; height: 8px; border-radius: 50%; }
    .dot.red { background: #ef4444; } .dot.yellow { background: #f59e0b; } .dot.green { background: #10b981; }
    .preview-subject-line { font-size: 12px; font-weight: 600; color: #475569; margin-left: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .preview-body { padding: 16px; max-height: 480px; overflow-y: auto; font-family: Arial, sans-serif; font-size: 13px; }

    .dispatch-action-box { margin-top: 16px; }
    .btn-block { width: 100%; }
    .btn-lg { padding: 12px; font-size: 15px; font-weight: 600; }
    .dispatch-hint {
      display: flex; align-items: center; justify-content: center; gap: 4px; font-size: 11px; color: #64748b; margin: 8px 0 0;
    }
    .dispatch-hint span { font-size: 13px; }

    .history-table-container { background: #ffffff; border-radius: 10px; border: 1px solid #e2e8f0; overflow: hidden; }
    .data-table { width: 100%; border-collapse: collapse; text-align: left; }
    .data-table th { background: #f8fafc; padding: 12px 16px; font-size: 12px; font-weight: 600; color: #475569; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }
    .data-table td { padding: 14px 16px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #1e293b; vertical-align: middle; }
    .camp-product-tag { font-size: 11px; color: #0050e5; background: rgba(0,80,229,0.06); padding: 1px 6px; border-radius: 4px; display: inline-block; margin-top: 2px; }
    .tpl-pill { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 11px; color: #475569; }
    .recipient-pill { font-weight: 600; color: #0f172a; }
    .status-pill { display: inline-flex; align-items: center; gap: 5px; padding: 3px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; background: #e0e7ff; color: #4338ca; }
    .status-dot { width: 6px; height: 6px; border-radius: 50%; background: #6366f1; }
    .date-cell { font-size: 12px; color: #64748b; }
    .empty-state { text-align: center; padding: 48px; color: #64748b; }
  `]
})
export class ProductMarketingComponent implements OnInit {
  activeView: 'compose' | 'history' = 'compose';

  campaignName = '';
  emailSubject = '';
  selectedProductId: string | null = null;
  selectedTemplate = 'ProductLaunch';
  customHtml = '';

  audienceMode: 'manual' | 'csv' | 'category' = 'manual';
  manualEmailsText = '';
  parsedCsvEmails: string[] = [];
  selectedCategoryAudience = 'AllMembers';

  products: any[] = [];
  userCategories: any[] = [];
  pastCampaigns: any[] = [];
  selectedProduct: any = null;

  isDispatching = false;
  currencySymbol = '$';
  currencyCode = 'USD';
  sanitizedPreviewHtml: SafeHtml = '';

  headerButtons: PageHeaderButton[] = [
    {
      text: 'Queue Monitor',
      icon: 'sync_alt',
      routerLink: '/products/console/queues'
    },
    {
      text: 'Products Catalog',
      icon: 'arrow_back',
      routerLink: '/products/console'
    }
  ];

  constructor(
    private api: ApiService,
    private toast: ToastService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.loadProducts();
    this.loadUserCategories();
    this.loadCampaigns();
    this.updateTemplatePreview();
  }

  loadProducts(): void {
    this.api.get<any>('ProductsApi?pageSize=100').subscribe({
      next: (res) => {
        this.products = res?.data?.items || [];
        this.currencySymbol = res?.data?.currencySymbol || '$';
        this.currencyCode = res?.data?.currencyCode || 'USD';
        if (this.products.length > 0 && !this.selectedProductId) {
          this.selectedProductId = this.products[0].id;
          this.selectedProduct = this.products[0];
          this.emailSubject = `🚀 Announcement: ${this.selectedProduct.title}`;
          this.campaignName = `${this.selectedProduct.title} Launch Campaign`;
          this.updateTemplatePreview();
        }
      }
    });
  }

  loadUserCategories(): void {
    this.api.get<any>('UsersApi/categories').subscribe({
      next: (res) => {
        this.userCategories = res?.data || [];
      }
    });
  }

  loadCampaigns(): void {
    this.api.get<any>('ProductsApi/marketing/campaigns').subscribe({
      next: (res) => {
        this.pastCampaigns = res?.data?.items || [];
      }
    });
  }

  onProductChange(): void {
    this.selectedProduct = this.products.find(p => p.id === this.selectedProductId);
    if (this.selectedProduct) {
      this.emailSubject = `🚀 Special Offer: ${this.selectedProduct.title}`;
      this.campaignName = `${this.selectedProduct.title} Campaign`;
    }
    this.updateTemplatePreview();
  }

  setTemplate(tpl: string): void {
    this.selectedTemplate = tpl;
    this.updateTemplatePreview();
  }

  updateTemplatePreview(): void {
    const rawHtml = this.generateHtmlTemplate();
    this.sanitizedPreviewHtml = this.sanitizer.bypassSecurityTrustHtml(rawHtml);
  }

  generateHtmlTemplate(): string {
    const p = this.selectedProduct || {
      title: 'Enterprise Commercial Suite',
      price: 199,
      compareAtPrice: 299,
      shortDescription: 'The comprehensive platform designed for your organizational workflows.',
      coverImageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800'
    };

    if (this.selectedTemplate === 'CustomBuilder') {
      return this.customHtml || `<div style="padding:20px; font-family:Arial,sans-serif;"><p>Custom HTML template preview.</p></div>`;
    }

    if (this.selectedTemplate === 'FlashSale') {
      return `
        <div style="max-width:600px; margin:0 auto; font-family:Arial,sans-serif; background:#ffffff; border:1px solid #fee2e2; border-radius:12px; overflow:hidden;">
          <div style="background:#dc2626; color:#ffffff; padding:18px; text-align:center;">
            <h1 style="margin:0; font-size:22px;">🔥 LIMITED TIME FLASH SALE</h1>
            <p style="margin:4px 0 0; font-size:13px; opacity:0.9;">Save big on ${p.title} before time runs out!</p>
          </div>
          <div style="padding:24px; text-align:center;">
            <img src="${p.coverImageUrl || 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800'}" style="max-width:100%; height:200px; object-fit:cover; border-radius:8px; margin-bottom:16px;" />
            <h2 style="color:#0f172a; margin:0 0 8px;">${p.title}</h2>
            <p style="color:#64748b; font-size:14px; margin:0 0 16px;">${p.shortDescription || ''}</p>
            <div style="background:#fef2f2; border:1px dashed #ef4444; border-radius:8px; padding:12px; display:inline-block; margin-bottom:18px;">
              <span style="font-size:13px; color:#991b1b;">Use Coupon: <strong>FLASH2026</strong></span>
              <div style="font-size:24px; font-weight:bold; color:#dc2626; margin-top:4px;">${this.currencySymbol}${p.price} <span style="font-size:14px; text-decoration:line-through; color:#94a3b8;">${this.currencySymbol}${p.compareAtPrice || (p.price * 1.3).toFixed(2)}</span></div>
            </div>
            <div>
              <a href="http://localhost:4200/store" style="display:inline-block; background:#dc2626; color:#ffffff; padding:14px 28px; border-radius:8px; font-weight:bold; text-decoration:none; font-size:15px;">Claim Your Discount Now →</a>
            </div>
          </div>
        </div>
      `;
    }

    if (this.selectedTemplate === 'ServiceInvitation') {
      return `
        <div style="max-width:600px; margin:0 auto; font-family:Arial,sans-serif; background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden;">
          <div style="background:#0f172a; color:#ffffff; padding:24px 20px;">
            <span style="font-size:11px; text-transform:uppercase; letter-spacing:1px; color:#38bdf8;">PROFESSIONAL CONSULTING</span>
            <h1 style="margin:6px 0 0; font-size:20px;">${p.title}</h1>
          </div>
          <div style="padding:24px;">
            <p style="color:#334155; font-size:14px; line-height:1.6;">${p.shortDescription || 'We are excited to offer our specialized advisory and execution package.'}</p>
            <div style="background:#f8fafc; border-left:4px solid #0050e5; padding:14px; border-radius:4px; margin:18px 0;">
              <strong style="color:#0f172a; font-size:14px;">Included Deliverables & Sessions:</strong>
              <ul style="margin:8px 0 0; padding-left:18px; color:#475569; font-size:13px; line-height:1.6;">
                <li>Dedicated strategy consultation with specialist</li>
                <li>Comprehensive milestone delivery package</li>
                <li>Direct follow-up roadmap & review</li>
              </ul>
            </div>
            <div style="text-align:center; margin-top:24px;">
              <a href="http://localhost:4200/store" style="display:inline-block; background:#0050e5; color:#ffffff; padding:14px 28px; border-radius:8px; font-weight:bold; text-decoration:none; font-size:15px;">Book Your Consultation (${this.currencySymbol}${p.price}) →</a>
            </div>
          </div>
        </div>
      `;
    }

    // Default: Product Launch
    return `
      <div style="max-width:600px; margin:0 auto; font-family:Arial,sans-serif; background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden;">
        <div style="background:#0050e5; color:#ffffff; padding:20px; text-align:center;">
          <h1 style="margin:0; font-size:22px;">🚀 NEW RELEASE ANNOUNCEMENT</h1>
          <p style="margin:4px 0 0; font-size:13px; opacity:0.9;">Available now in the Ozikol Store</p>
        </div>
        <div style="padding:24px; text-align:center;">
          <img src="${p.coverImageUrl || 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800'}" style="max-width:100%; height:200px; object-fit:cover; border-radius:8px; margin-bottom:16px;" />
          <h2 style="color:#0f172a; margin:0 0 8px;">${p.title}</h2>
          <p style="color:#64748b; font-size:14px; line-height:1.6; margin:0 0 16px;">${p.shortDescription || 'Experience the highest standard in digital performance and productivity.'}</p>
          <div style="font-size:26px; font-weight:bold; color:#0050e5; margin-bottom:18px;">${this.currencySymbol}${p.price}</div>
          <div>
            <a href="http://localhost:4200/store" style="display:inline-block; background:#0050e5; color:#ffffff; padding:14px 28px; border-radius:8px; font-weight:bold; text-decoration:none; font-size:15px;">Get Instant Access →</a>
          </div>
        </div>
      </div>
    `;
  }

  onCsvFileSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      const text = e.target.result;
      const emails: string[] = [];
      const lines = text.split(/[\r\n]+/);
      for (const line of lines) {
        const parts = line.split(/[,;\t]+/);
        for (const part of parts) {
          const match = part.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
          if (match && !emails.includes(match[0])) {
            emails.push(match[0]);
          }
        }
      }
      this.parsedCsvEmails = emails;
      this.toast.success(`Successfully parsed ${emails.length} recipient email(s).`);
    };
    reader.readAsText(file);
  }

  onDispatchCampaign(): void {
    if (!this.campaignName.trim() || !this.emailSubject.trim()) {
      this.toast.error('Campaign Name and Email Subject are required.');
      return;
    }

    let recipients: string[] = [];
    if (this.audienceMode === 'manual') {
      const parts = this.manualEmailsText.split(/[\r\n,;]+/);
      for (const p of parts) {
        const match = p.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (match && !recipients.includes(match[0])) recipients.push(match[0]);
      }
    } else if (this.audienceMode === 'csv') {
      recipients = this.parsedCsvEmails;
    }

    if (this.audienceMode !== 'category' && recipients.length === 0) {
      this.toast.error('Please specify at least one valid recipient email.');
      return;
    }

    const payload = {
      campaignName: this.campaignName.trim(),
      emailSubject: this.emailSubject.trim(),
      productId: this.selectedProductId,
      templateType: this.selectedTemplate,
      htmlContent: this.generateHtmlTemplate(),
      audienceFilter: this.audienceMode === 'category' ? this.selectedCategoryAudience : 'ManualUpload',
      manualEmails: recipients
    };

    this.isDispatching = true;
    this.api.post<any>('ProductsApi/marketing/dispatch', payload).subscribe({
      next: (res) => {
        this.isDispatching = false;
        this.toast.success(res?.message || 'Campaign successfully enqueued in EmailQueue.');
        this.activeView = 'history';
        this.loadCampaigns();
      },
      error: (err) => {
        this.isDispatching = false;
        this.toast.error(err?.error?.message || 'Failed to dispatch marketing campaign.');
      }
    });
  }
}
