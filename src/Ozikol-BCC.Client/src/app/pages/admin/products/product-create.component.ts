import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent, PageHeaderButton } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-product-create',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, PageHeaderComponent],
  template: `
    <div class="product-form-page">
      <app-page-header
        eyebrow="COMMERCE STUDIO"
        icon="add_box"
        title="Create New Commercial Product"
        subtitle="Publish software packages, consulting services, physical inventory, or recurring membership plans."
        [buttons]="headerButtons"
      ></app-page-header>

      <form (ngSubmit)="onSubmit()" class="form-layout">
        <!-- LEFT COLUMN: Main Product Content -->
        <div class="form-main">
          <!-- 1. General Identification Card -->
          <div class="form-card">
            <h3 class="card-title">
              <span class="material-symbols-outlined icon-blue">description</span>
              <span>General Information</span>
            </h3>

            <div class="form-group">
              <label class="form-label">Product Title <span class="req">*</span></label>
              <input
                type="text"
                [(ngModel)]="model.title"
                name="title"
                required
                placeholder="e.g. Enterprise Cloud ERP Suite v2.0"
                class="form-control"
              />
            </div>

            <div class="form-group">
              <label class="form-label">Short Summary / Tagline</label>
              <input
                type="text"
                [(ngModel)]="model.shortDescription"
                name="shortDescription"
                placeholder="Brief value proposition displayed on product cards"
                class="form-control"
              />
            </div>

            <!-- Rich Text WYSIWYG Description -->
            <div class="form-group">
              <label class="form-label">Full Product Description (Rich Text HTML)</label>
              
              <div class="rich-toolbar">
                <button type="button" (click)="execFormat('bold')" title="Bold"><b>B</b></button>
                <button type="button" (click)="execFormat('italic')" title="Italic"><i>I</i></button>
                <button type="button" (click)="execFormat('underline')" title="Underline"><u>U</u></button>
                <span class="tool-sep"></span>
                <button type="button" (click)="execFormat('formatBlock', '<h2>')" title="Heading 2">H2</button>
                <button type="button" (click)="execFormat('formatBlock', '<h3>')" title="Heading 3">H3</button>
                <button type="button" (click)="execFormat('formatBlock', '<p>')" title="Paragraph">¶</button>
                <span class="tool-sep"></span>
                <button type="button" (click)="execFormat('insertUnorderedList')" title="Bullet List">• List</button>
                <button type="button" (click)="execFormat('insertOrderedList')" title="Numbered List">1. List</button>
                <button type="button" (click)="insertLink()" title="Hyperlink">🔗 Link</button>
              </div>

              <div
                #editor
                contenteditable="true"
                class="rich-editor-box"
                (input)="onEditorInput($event)"
                placeholder="Enter rich details, features, specifications, deliverables..."
              ></div>
            </div>
          </div>

          <!-- 2. Commercial Archetype Configuration -->
          <div class="form-card">
            <h3 class="card-title">
              <span class="material-symbols-outlined icon-purple">category</span>
              <span>Commercial Archetype & Type Attributes</span>
            </h3>

            <div class="archetype-grid">
              <label class="archetype-tile" [class.selected]="model.type === 0">
                <input type="radio" [(ngModel)]="model.type" name="type" [value]="0" />
                <span class="material-symbols-outlined tile-icon">terminal</span>
                <strong>Software & Digital</strong>
                <p>Digital downloads, license keys, version files</p>
              </label>

              <label class="archetype-tile" [class.selected]="model.type === 1">
                <input type="radio" [(ngModel)]="model.type" name="type" [value]="1" />
                <span class="material-symbols-outlined tile-icon">handshake</span>
                <strong>Service & Consultation</strong>
                <p>Professional hours, booking slots, deliverables</p>
              </label>

              <label class="archetype-tile" [class.selected]="model.type === 2">
                <input type="radio" [(ngModel)]="model.type" name="type" [value]="2" />
                <span class="material-symbols-outlined tile-icon">inventory_2</span>
                <strong>Physical Merchandise</strong>
                <p>Tracked warehouse stock, weight, shipping</p>
              </label>

              <label class="archetype-tile" [class.selected]="model.type === 3">
                <input type="radio" [(ngModel)]="model.type" name="type" [value]="3" />
                <span class="material-symbols-outlined tile-icon">autorenew</span>
                <strong>Recurring Subscription</strong>
                <p>Membership billing, auto-renewal cycles</p>
              </label>
            </div>

            <!-- Dynamic Fields: Type 0 (Software) -->
            <div *ngIf="model.type === 0" class="type-subcard">
              <h4 class="subcard-title">💻 Software & Digital Download Specifications</h4>
              <div class="form-row-2">
                <div class="form-group">
                  <label class="form-label">Download File URL</label>
                  <input type="text" [(ngModel)]="model.downloadFileUrl" name="downloadFileUrl" placeholder="https://cdn.ozikol.com/releases/app.zip" class="form-control" />
                </div>
                <div class="form-group">
                  <label class="form-label">Version Tag</label>
                  <input type="text" [(ngModel)]="model.versionTag" name="versionTag" placeholder="e.g. v2.4.0" class="form-control" />
                </div>
              </div>
              <div class="form-row-2">
                <div class="form-group">
                  <label class="form-label">File Size</label>
                  <input type="text" [(ngModel)]="model.fileSize" name="fileSize" placeholder="e.g. 48.5 MB" class="form-control" />
                </div>
                <div class="form-group checkbox-group" style="padding-top: 26px;">
                  <label class="checkbox-label">
                    <input type="checkbox" [(ngModel)]="model.requiresLicenseKey" name="requiresLicenseKey" />
                    <span>Auto-generate unique cryptographic license key on purchase</span>
                  </label>
                </div>
              </div>
            </div>

            <!-- Dynamic Fields: Type 1 (Service) -->
            <div *ngIf="model.type === 1" class="type-subcard">
              <h4 class="subcard-title">🤝 Professional Service & Deliverable Specifications</h4>
              <div class="form-row-2">
                <div class="form-group">
                  <label class="form-label">Delivery Turnaround (Days)</label>
                  <input type="number" [(ngModel)]="model.deliveryTimeframeDays" name="deliveryTimeframeDays" placeholder="e.g. 5" class="form-control" />
                </div>
                <div class="form-group">
                  <label class="form-label">Consultation Duration (Minutes)</label>
                  <input type="number" [(ngModel)]="model.consultationDurationMinutes" name="consultationDurationMinutes" placeholder="e.g. 60" class="form-control" />
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Deliverables Summary</label>
                <input type="text" [(ngModel)]="model.deliverablesSummary" name="deliverablesSummary" placeholder="Summary of scope included with this service package" class="form-control" />
              </div>
            </div>

            <!-- Dynamic Fields: Type 2 (Physical) -->
            <div *ngIf="model.type === 2" class="type-subcard">
              <h4 class="subcard-title">📦 Physical Inventory & Logistics</h4>
              <div class="form-row-3">
                <div class="form-group">
                  <label class="form-label">Stock Quantity</label>
                  <input type="number" [(ngModel)]="model.stockQuantity" name="stockQuantity" class="form-control" />
                </div>
                <div class="form-group">
                  <label class="form-label">Low Stock Alert Threshold</label>
                  <input type="number" [(ngModel)]="model.lowStockThreshold" name="lowStockThreshold" class="form-control" />
                </div>
                <div class="form-group">
                  <label class="form-label">Weight (Kg)</label>
                  <input type="number" step="0.01" [(ngModel)]="model.weightKg" name="weightKg" placeholder="0.5" class="form-control" />
                </div>
              </div>
              <div class="form-row-2">
                <div class="form-group checkbox-group">
                  <label class="checkbox-label">
                    <input type="checkbox" [(ngModel)]="model.trackInventory" name="trackInventory" />
                    <span>Track inventory levels automatically</span>
                  </label>
                </div>
                <div class="form-group checkbox-group">
                  <label class="checkbox-label">
                    <input type="checkbox" [(ngModel)]="model.requiresShipping" name="requiresShipping" />
                    <span>Requires physical shipping address</span>
                  </label>
                </div>
              </div>
            </div>

            <!-- Dynamic Fields: Type 3 (Subscription) -->
            <div *ngIf="model.type === 3" class="type-subcard">
              <h4 class="subcard-title">🔄 Subscription Billing & Cycle Rules</h4>
              <div class="form-row-3">
                <div class="form-group">
                  <label class="form-label">Billing Interval</label>
                  <select [(ngModel)]="model.billingInterval" name="billingInterval" class="form-control">
                    <option [ngValue]="0">Monthly</option>
                    <option [ngValue]="1">Quarterly</option>
                    <option [ngValue]="2">Yearly</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Free Trial Period (Days)</label>
                  <input type="number" [(ngModel)]="model.trialPeriodDays" name="trialPeriodDays" placeholder="0" class="form-control" />
                </div>
                <div class="form-group checkbox-group" style="padding-top: 26px;">
                  <label class="checkbox-label">
                    <input type="checkbox" [(ngModel)]="model.autoRenew" name="autoRenew" />
                    <span>Auto-renew by default</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <!-- 3. Media Gallery (Cloudinary) -->
          <div class="form-card">
            <h3 class="card-title">
              <span class="material-symbols-outlined icon-green">photo_library</span>
              <span>Media Assets & Product Gallery</span>
            </h3>

            <!-- Cover Image Upload -->
            <div class="form-group">
              <label class="form-label">Primary Cover Image</label>
              <div class="media-dropzone" (click)="fileInput.click()">
                <input #fileInput type="file" (change)="onCoverFileSelected($event)" accept="image/*" style="display:none;" />
                <div *ngIf="!model.coverImageUrl && !isUploadingMedia" class="dropzone-prompt">
                  <span class="material-symbols-outlined upload-icon">cloud_upload</span>
                  <p>Click to upload high-resolution product image</p>
                  <span>Supports PNG, JPG, WebP up to 10MB</span>
                </div>
                <div *ngIf="isUploadingMedia" class="uploading-state">
                  <div class="spinner"></div>
                  <span>Uploading to Cloudinary...</span>
                </div>
                <div *ngIf="model.coverImageUrl && !isUploadingMedia" class="cover-preview-box">
                  <img [src]="model.coverImageUrl" alt="Cover Preview" class="cover-preview-img" />
                  <button type="button" class="btn-remove-cover" (click)="$event.stopPropagation(); removeCoverImage()">✕</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- RIGHT COLUMN: Pricing, Taxonomy, Scheduling & Actions -->
        <div class="form-sidebar">
          <!-- 1. Pricing Card -->
          <div class="form-card">
            <h3 class="card-title">
              <span class="material-symbols-outlined icon-emerald">payments</span>
              <span>Pricing & Identifiers</span>
            </h3>

            <div class="currency-pill">
              <span class="material-symbols-outlined">currency_exchange</span>
              <span>Active Currency: <strong>{{ currencyCode }} ({{ currencySymbol }})</strong></span>
            </div>

            <div class="form-group">
              <label class="form-label">Selling Price ({{ currencySymbol }}) <span class="req">*</span></label>
              <input
                type="number"
                step="0.01"
                [(ngModel)]="model.price"
                name="price"
                required
                placeholder="0.00"
                class="form-control price-input"
              />
            </div>

            <div class="form-group">
              <label class="form-label">Compare-At Price ({{ currencySymbol }})</label>
              <input
                type="number"
                step="0.01"
                [(ngModel)]="model.compareAtPrice"
                name="compareAtPrice"
                placeholder="Original strikethrough price"
                class="form-control"
              />
            </div>

            <div class="form-group">
              <label class="form-label">SKU (Stock Keeping Unit)</label>
              <input type="text" [(ngModel)]="model.sku" name="sku" placeholder="e.g. OZ-ERP-01" class="form-control font-mono" />
            </div>

            <div class="form-group">
              <label class="form-label">Barcode / UPC</label>
              <input type="text" [(ngModel)]="model.barcode" name="barcode" placeholder="Optional barcode number" class="form-control font-mono" />
            </div>
          </div>

          <!-- 2. Organization & Category Taxonomy -->
          <div class="form-card">
            <h3 class="card-title">
              <span class="material-symbols-outlined icon-amber">folder_open</span>
              <span>Taxonomy & Placement</span>
            </h3>

            <div class="form-group">
              <label class="form-label">Category</label>
              <select [(ngModel)]="model.bcpProductCategoryId" name="bcpProductCategoryId" class="form-control">
                <option [ngValue]="null">Uncategorized</option>
                <option *ngFor="let cat of categories" [ngValue]="cat.id">{{ cat.title }}</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Tags (Comma-Separated)</label>
              <input type="text" [(ngModel)]="model.tags" name="tags" placeholder="software, cloud, erp, popular" class="form-control" />
            </div>

            <div class="form-group checkbox-group">
              <label class="checkbox-label">
                <input type="checkbox" [(ngModel)]="model.isFeatured" name="isFeatured" />
                <span>★ Feature on Storefront Homepage</span>
              </label>
            </div>
          </div>

          <!-- 3. Publishing & Scheduling Queue -->
          <div class="form-card">
            <h3 class="card-title">
              <span class="material-symbols-outlined icon-indigo">schedule_send</span>
              <span>Publishing & Release Schedule</span>
            </h3>

            <div class="form-group">
              <label class="form-label">Publish Status</label>
              <select [(ngModel)]="model.publishStatus" name="publishStatus" class="form-control">
                <option [ngValue]="1">Published (Live on Store)</option>
                <option [ngValue]="0">Draft (Hidden)</option>
                <option [ngValue]="2">Scheduled Release</option>
                <option [ngValue]="3">Archived / Disabled</option>
              </select>
            </div>

            <div class="form-group checkbox-group">
              <label class="checkbox-label">
                <input type="checkbox" [(ngModel)]="model.isScheduled" name="isScheduled" (change)="onScheduleToggle()" />
                <span>Schedule Automated Release</span>
              </label>
            </div>

            <div *ngIf="model.isScheduled" class="form-group schedule-box">
              <label class="form-label">Scheduled Release Date & Time</label>
              <input type="datetime-local" [(ngModel)]="scheduledDateTimeString" name="scheduledDateTimeString" class="form-control" />
              <p class="schedule-help">This will enqueue a release event into the central JobQueue.</p>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="submit-card">
            <button type="submit" [disabled]="isSubmitting" class="btn btn-primary btn-block btn-lg">
              <span class="material-symbols-outlined">save</span>
              <span>{{ isSubmitting ? 'Publishing Product...' : 'Create & Save Product' }}</span>
            </button>
            <a routerLink="/products/console" class="btn btn-outline btn-block">Cancel</a>
          </div>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .product-form-page { display: flex; flex-direction: column; gap: 20px; width: 100%; }
    .form-layout { display: grid; grid-template-columns: 1fr 360px; gap: 24px; }
    @media (max-width: 960px) { .form-layout { grid-template-columns: 1fr; } }

    .form-main, .form-sidebar { display: flex; flex-direction: column; gap: 20px; }

    .form-card {
      background: #ffffff; padding: 20px; border-radius: 10px; border: 1px solid #e2e8f0;
    }
    .card-title {
      display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 600; color: #0f172a;
      margin-top: 0; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #f1f5f9;
    }
    .icon-blue { color: #0050e5; }
    .icon-purple { color: #8b5cf6; }
    .icon-green { color: #10b981; }
    .icon-emerald { color: #059669; }
    .icon-amber { color: #f59e0b; }
    .icon-indigo { color: #6366f1; }

    .form-group { margin-bottom: 16px; }
    .form-group:last-child { margin-bottom: 0; }
    .form-label { display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px; }
    .req { color: #ef4444; }
    .form-control {
      width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px;
      outline: none; background: #ffffff; transition: border-color 0.2s, box-shadow 0.2s; box-sizing: border-box;
    }
    .form-control:focus { border-color: #0050e5; box-shadow: 0 0 0 3px rgba(0,80,229,0.12); }
    .price-input { font-size: 16px; font-weight: 700; color: #0f172a; }
    .font-mono { font-family: monospace; }

    .form-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .form-row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }

    .checkbox-group { display: flex; align-items: center; }
    .checkbox-label { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 500; color: #334155; cursor: pointer; }
    .checkbox-label input { width: 16px; height: 16px; accent-color: #0050e5; }

    .rich-toolbar {
      display: flex; align-items: center; gap: 4px; background: #f8fafc; padding: 6px 10px;
      border: 1px solid #cbd5e1; border-bottom: none; border-radius: 8px 8px 0 0; flex-wrap: wrap;
    }
    .rich-toolbar button {
      background: #ffffff; border: 1px solid #e2e8f0; border-radius: 4px; padding: 4px 8px;
      font-size: 12px; font-weight: 600; color: #475569; cursor: pointer;
    }
    .rich-toolbar button:hover { background: #e0e7ff; color: #0050e5; }
    .tool-sep { width: 1px; height: 16px; background: #cbd5e1; margin: 0 4px; }

    .rich-editor-box {
      min-height: 180px; max-height: 400px; overflow-y: auto; padding: 12px; border: 1px solid #cbd5e1;
      border-radius: 0 0 8px 8px; outline: none; font-size: 14px; line-height: 1.6; background: #fff;
    }
    .rich-editor-box:focus { border-color: #0050e5; }

    .archetype-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
    .archetype-tile {
      display: flex; flex-direction: column; padding: 14px; border: 2px solid #e2e8f0; border-radius: 8px;
      cursor: pointer; transition: all 0.2s; position: relative;
    }
    .archetype-tile input { position: absolute; top: 12px; right: 12px; }
    .archetype-tile:hover { border-color: #94a3b8; background: #f8fafc; }
    .archetype-tile.selected { border-color: #0050e5; background: rgba(0,80,229,0.03); }
    .tile-icon { font-size: 24px; color: #0050e5; margin-bottom: 6px; }
    .archetype-tile strong { font-size: 13px; color: #0f172a; }
    .archetype-tile p { font-size: 11px; color: #64748b; margin: 4px 0 0; line-height: 1.3; }

    .type-subcard {
      background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-top: 12px;
    }
    .subcard-title { font-size: 13px; font-weight: 600; color: #1e293b; margin-top: 0; margin-bottom: 12px; }

    .media-dropzone {
      border: 2px dashed #cbd5e1; border-radius: 8px; padding: 24px; text-align: center; cursor: pointer;
      background: #f8fafc; transition: all 0.2s; position: relative;
    }
    .media-dropzone:hover { border-color: #0050e5; background: rgba(0,80,229,0.02); }
    .upload-icon { font-size: 36px; color: #0050e5; margin-bottom: 6px; }
    .dropzone-prompt p { font-size: 13px; font-weight: 600; color: #334155; margin: 0 0 4px; }
    .dropzone-prompt span { font-size: 11px; color: #64748b; }
    .cover-preview-box { position: relative; display: inline-block; max-height: 180px; border-radius: 6px; overflow: hidden; }
    .cover-preview-img { max-height: 180px; max-width: 100%; border-radius: 6px; }
    .btn-remove-cover {
      position: absolute; top: 6px; right: 6px; background: rgba(0,0,0,0.6); color: #fff; border: none;
      border-radius: 50%; width: 24px; height: 24px; cursor: pointer; font-size: 12px;
    }

    .currency-pill {
      display: flex; align-items: center; gap: 6px; font-size: 12px; color: #047857; background: #ecfdf5;
      padding: 6px 10px; border-radius: 6px; border: 1px solid #a7f3d0; margin-bottom: 14px;
    }
    .currency-pill span { font-size: 14px; }

    .schedule-box { background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 6px; padding: 10px; }
    .schedule-help { font-size: 11px; color: #6d28d9; margin: 4px 0 0; }

    .submit-card { display: flex; flex-direction: column; gap: 10px; }
    .btn-block { width: 100%; }
    .btn-lg { padding: 12px; font-size: 15px; font-weight: 600; }

    .spinner { width: 24px; height: 24px; border: 3px solid #e2e8f0; border-top-color: #0050e5; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 8px; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class ProductCreateComponent implements OnInit {
  model: any = {
    title: '',
    shortDescription: '',
    fullDescription: '',
    type: 0, // Software by default
    publishStatus: 1, // Published
    price: 0,
    compareAtPrice: null,
    sku: '',
    barcode: '',
    coverImageUrl: '',
    coverImageKey: '',
    downloadFileUrl: '',
    versionTag: '',
    fileSize: '',
    requiresLicenseKey: false,
    deliveryTimeframeDays: null,
    consultationDurationMinutes: null,
    deliverablesSummary: '',
    trackInventory: true,
    stockQuantity: 10,
    lowStockThreshold: 5,
    weightKg: null,
    requiresShipping: false,
    billingInterval: 0,
    trialPeriodDays: 0,
    autoRenew: true,
    bcpProductCategoryId: null,
    tags: '',
    isFeatured: false,
    isScheduled: false,
    scheduledReleaseUtc: null
  };

  categories: any[] = [];
  isSubmitting = false;
  isUploadingMedia = false;
  scheduledDateTimeString = '';
  currencyCode = 'USD';
  currencySymbol = '$';

  headerButtons: PageHeaderButton[] = [
    {
      text: 'Back to Catalog',
      icon: 'arrow_back',
      routerLink: '/products/console'
    }
  ];

  constructor(
    private api: ApiService,
    private toast: ToastService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.api.get<any>('ProductsApi/categories').subscribe({
      next: (res) => {
        this.categories = res?.data || [];
      }
    });
  }

  onEditorInput(event: any): void {
    this.model.fullDescription = event.target.innerHTML;
  }

  execFormat(command: string, value: string = ''): void {
    document.execCommand(command, false, value);
  }

  insertLink(): void {
    const url = prompt('Enter destination URL:');
    if (url) {
      document.execCommand('createLink', false, url);
    }
  }

  onScheduleToggle(): void {
    if (this.model.isScheduled) {
      this.model.publishStatus = 2; // Scheduled
    } else {
      this.model.publishStatus = 1; // Published
    }
  }

  onCoverFileSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    this.isUploadingMedia = true;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'bcp-products');

    this.api.post<any>('ProductsApi/upload-media', formData).subscribe({
      next: (res) => {
        this.isUploadingMedia = false;
        this.model.coverImageUrl = res?.data?.url;
        this.model.coverImageKey = res?.data?.key;
        this.toast.success('Product image uploaded successfully.');
      },
      error: (err) => {
        this.isUploadingMedia = false;
        this.toast.error(err?.error?.message || 'Failed to upload media.');
      }
    });
  }

  removeCoverImage(): void {
    this.model.coverImageUrl = '';
    this.model.coverImageKey = '';
  }

  onSubmit(): void {
    if (!this.model.title?.trim()) {
      this.toast.error('Product title is required.');
      return;
    }

    if (this.model.isScheduled && this.scheduledDateTimeString) {
      this.model.scheduledReleaseUtc = new Date(this.scheduledDateTimeString).toISOString();
    }

    this.isSubmitting = true;
    this.api.post<any>('ProductsApi', this.model).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.toast.success(`Product '${this.model.title}' created successfully.`);
        this.router.navigate(['/products/console']);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.toast.error(err?.error?.message || 'Failed to create product.');
      }
    });
  }
}
