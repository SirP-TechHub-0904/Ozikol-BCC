import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-page-section-edit',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="cms-page-container">
      <!-- Header -->
      <div class="page-header">
        <div class="header-titles">
          <div class="breadcrumb">
            <a routerLink="/admin/content">CMS Studio</a>
            <span class="sep">/</span>
            <a routerLink="/admin/content/sections">Page Sections</a>
            <span class="sep">/</span>
            <span class="current">Edit Section</span>
          </div>
          <h1>Edit Section: {{ section?.title }}</h1>
          <p class="subtitle">Complete configuration of template layout key, rich descriptions, Cloudinary media assets, and ribbon settings.</p>
        </div>
        <div class="header-actions">
          <a [routerLink]="['/admin/content/sections/details', sectionId]" class="btn btn-outline">
            <span class="material-symbols-outlined">list</span>
            <span>Manage Sub-Items</span>
          </a>
          <a routerLink="/admin/content/sections" class="btn btn-outline">
            <span class="material-symbols-outlined">arrow_back</span>
            <span>Back to Sections</span>
          </a>
          <button type="button" class="btn btn-primary" (click)="saveSection()" [disabled]="saving || loading">
            <span class="material-symbols-outlined">save</span>
            <span *ngIf="!saving">Save Section Changes</span>
            <span *ngIf="saving">Saving...</span>
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div class="loading-box" *ngIf="loading">
        <span class="material-symbols-outlined spin">progress_activity</span>
        <p>Loading section details...</p>
      </div>

      <!-- Form Layout -->
      <div class="form-layout" *ngIf="!loading && section">
        <!-- Main Column: Text, Descriptions, Media Assets -->
        <div class="main-column">
          <!-- Card 1: Titles & Core Copy -->
          <div class="cms-card">
            <div class="card-header-bar">
              <h3>Titles & Copywriting</h3>
            </div>
            <div class="form-grid">
              <div class="form-group full-width">
                <label>SECTION MAIN TITLE *</label>
                <input type="text" [(ngModel)]="section.title" class="form-control" placeholder="e.g. Empowering Our Community Through Action">
              </div>

              <div class="form-group">
                <label>MINI TITLE (SUB-TAG / EYEBROW)</label>
                <input type="text" [(ngModel)]="section.miniTitle" class="form-control" placeholder="OUR VISION & VALUES">
              </div>

              <div class="form-group">
                <label>QUOTE / CALLOUT PHRASE</label>
                <input type="text" [(ngModel)]="section.qoute" class="form-control" placeholder="Prominent quote or highlight...">
              </div>

              <div class="form-group full-width">
                <label>SHORT DESCRIPTION</label>
                <textarea rows="3" [(ngModel)]="section.description" class="form-control" placeholder="Brief section overview..."></textarea>
              </div>

              <div class="form-group full-width">
                <label>FULL EXTENDED DESCRIPTION (RICH TEXT / HTML)</label>
                <textarea rows="5" [(ngModel)]="section.fullDescription" class="form-control" placeholder="Detailed content narrative..."></textarea>
              </div>
            </div>
          </div>

          <!-- Card 2: Action Buttons & Direct Links -->
          <div class="cms-card">
            <div class="card-header-bar">
              <h3>Call-to-Action Buttons & Links</h3>
            </div>
            <div class="form-grid">
              <div class="form-group">
                <label>BUTTON TEXT</label>
                <input type="text" [(ngModel)]="section.buttonText" class="form-control" placeholder="e.g. Discover More, Join Now">
              </div>

              <div class="form-group">
                <label>BUTTON TARGET LINK</label>
                <input type="text" [(ngModel)]="section.buttonLink" class="form-control" placeholder="/programs or https://...">
              </div>

              <div class="form-group">
                <label>DIRECT SECTION URL ROUTE</label>
                <input type="text" [(ngModel)]="section.directUrl" class="form-control" placeholder="core-programs">
              </div>

              <div class="form-group">
                <label>BUTTON TOGGLE</label>
                <div class="checkbox-card">
                  <input type="checkbox" [(ngModel)]="section.disableButton" id="disBtn">
                  <label for="disBtn"><strong>Disable / Hide Action Button</strong></label>
                </div>
              </div>
            </div>
          </div>

          <!-- Card 3: Media & Video Assets (Cloudinary) -->
          <div class="cms-card">
            <div class="card-header-bar">
              <div>
                <h3>Media Assets & Cloudinary Uploads</h3>
                <p class="card-sub">Upload high-resolution images or videos directly to Cloudinary.</p>
              </div>
            </div>

            <div class="form-grid">
              <!-- Primary Image -->
              <div class="form-group full-width">
                <div class="label-with-badge">
                  <label>PRIMARY BACKGROUND / HERO IMAGE</label>
                  <span class="key-pill" *ngIf="section.imageKey">
                    <span class="material-symbols-outlined icon-mini">vpn_key</span>
                    <span>KEY: {{ section.imageKey }}</span>
                  </span>
                </div>
                <div class="input-with-upload">
                  <input type="text" [(ngModel)]="section.imageUrl" class="form-control" placeholder="https://res.cloudinary.com/...">
                  <label class="btn-upload" [class.uploading]="uploadingPrimary">
                    <input type="file" (change)="uploadMedia($event, 'primary')" accept="image/*" style="display:none">
                    <span class="material-symbols-outlined">cloud_upload</span>
                    <span>{{ uploadingPrimary ? 'Uploading...' : 'Upload Image' }}</span>
                  </label>
                </div>
              </div>
              <div class="form-group full-width" *ngIf="section.imageUrl">
                <div class="image-preview-box">
                  <img [src]="section.imageUrl" alt="Primary Image">
                  <button type="button" class="btn-remove-img" (click)="section.imageUrl = ''; section.imageKey = ''">&times;</button>
                </div>
              </div>

              <!-- Secondary Image -->
              <div class="form-group full-width">
                <div class="label-with-badge">
                  <label>SECONDARY / ACCENT IMAGE URL</label>
                  <span class="key-pill" *ngIf="section.secondImageKey">
                    <span class="material-symbols-outlined icon-mini">vpn_key</span>
                    <span>KEY: {{ section.secondImageKey }}</span>
                  </span>
                </div>
                <div class="input-with-upload">
                  <input type="text" [(ngModel)]="section.secondImageUrl" class="form-control" placeholder="https://res.cloudinary.com/...">
                  <label class="btn-upload" [class.uploading]="uploadingSecondary">
                    <input type="file" (change)="uploadMedia($event, 'secondary')" accept="image/*" style="display:none">
                    <span class="material-symbols-outlined">cloud_upload</span>
                    <span>{{ uploadingSecondary ? 'Uploading...' : 'Upload Image' }}</span>
                  </label>
                </div>
              </div>

              <!-- Video & Youtube -->
              <div class="form-group">
                <label>VIDEO FILE URL</label>
                <input type="text" [(ngModel)]="section.videoUrl" class="form-control" placeholder="Direct MP4 / WebM URL">
              </div>

              <div class="form-group">
                <label>YOUTUBE EMBED LINK</label>
                <input type="text" [(ngModel)]="section.youtubeUrlLink" class="form-control" placeholder="https://youtube.com/watch?v=...">
              </div>
            </div>
          </div>
        </div>

        <!-- Side Column: Template Engine, Sorting, Ribbon & Status -->
        <div class="side-column">
          <!-- Template Design Block -->
          <div class="cms-card">
            <div class="card-header-bar">
              <h3>Theme Engine Layout</h3>
            </div>
            <div class="form-group">
              <label>TEMPLATE DESIGN KEY *</label>
              <select [(ngModel)]="section.templateKey" class="form-control" *ngIf="installedTemplates.length > 0">
                <option value="">-- Select Installed Template --</option>
                <option *ngFor="let t of installedTemplates" [value]="t.templateKey || t.variantCode">
                  {{ t.name }} ({{ t.variantCode }}) [{{ t.categoryKey }}]
                </option>
              </select>
              <input type="text" [(ngModel)]="section.templateKey" class="form-control" placeholder="e.g. services-grid, hero-features" [style.margin-top]="installedTemplates.length > 0 ? '8px' : '0'">
              <small class="help-text">Choose from your installed blueprint library or type a custom key. View all in <a routerLink="/content/console/templates" target="_blank" style="color: #0050e5; font-weight: 600;">My Templates</a>.</small>
            </div>

            <div class="form-group" style="margin-top:12px;">
              <label>CUSTOM CSS CLASS INJECTION</label>
              <input type="text" [(ngModel)]="section.customClass" class="form-control" placeholder="bg-slate-50 py-12">
            </div>

            <div class="form-group" style="margin-top:12px;">
              <label>BACKGROUND COLOR / THEME OVERRIDE</label>
              <input type="text" [(ngModel)]="section.backgroundColor" class="form-control" placeholder="#ffffff, #f8fafc, dark">
            </div>
          </div>

          <!-- Dynamic Page Form Attachment -->
          <div class="cms-card">
            <div class="card-header-bar">
              <div>
                <h3>Attach Dynamic Page Form</h3>
                <p class="card-sub" style="margin:0; font-size:12px; color:#64748b;">Connect an interactive inquiry, intake, or newsletter form to this section.</p>
              </div>
            </div>
            <div class="form-group">
              <label>DYNAMIC FORM</label>
              <select [(ngModel)]="section.pageFormId" (ngModelChange)="onFormSelected($event)" class="form-control">
                <option [ngValue]="null">-- None (No Dynamic Form) --</option>
                <option *ngFor="let f of availableForms" [ngValue]="f.id">
                  {{ f.title }} ({{ f.formKey }}) [{{ f.fieldCount || f.fields?.length || 0 }} fields]
                </option>
              </select>
              <small class="help-text">Responses appear under <a routerLink="/admin/content/forms" target="_blank" style="color: #0050e5; font-weight: 600;">Manage Forms</a>.</small>
            </div>

            <div class="form-group" style="margin-top:12px;">
              <label>DIRECT FORM KEY</label>
              <input type="text" [(ngModel)]="section.formKey" class="form-control" placeholder="e.g. contact-us, service-request, newsletter">
            </div>
          </div>

          <!-- Placement & Sorting -->
          <div class="cms-card">
            <div class="card-header-bar">
              <h3>Hierarchy & Positioning</h3>
            </div>
            <div class="form-group">
              <label>PARENT WEB PAGE</label>
              <select [(ngModel)]="section.webPageId" class="form-control">
                <option [ngValue]="null">Standalone (Global / Home Only)</option>
                <option *ngFor="let p of allPages" [ngValue]="p.id">{{ p.title }}</option>
              </select>
            </div>

            <div class="form-row" style="margin-top:12px;">
              <div class="form-group flex-1">
                <label>PAGE ORDER</label>
                <input type="number" [(ngModel)]="section.pageSortOrder" class="form-control">
              </div>
              <div class="form-group flex-1">
                <label>HOME ORDER</label>
                <input type="number" [(ngModel)]="section.homePageSortOrder" class="form-control">
              </div>
            </div>

            <div class="toggles-list" style="margin-top:14px;">
              <label class="toggle-card">
                <input type="checkbox" [(ngModel)]="section.showInHome">
                <div class="toggle-info">
                  <strong>Show on Home Page</strong>
                  <p>Renders on the main landing page.</p>
                </div>
              </label>
              <label class="toggle-card">
                <input type="checkbox" [(ngModel)]="section.disable">
                <div class="toggle-info">
                  <strong>Disable Section</strong>
                  <p>Temporarily hides this section completely.</p>
                </div>
              </label>
              <label class="toggle-card">
                <input type="checkbox" [(ngModel)]="section.fixedAfterFooter">
                <div class="toggle-info">
                  <strong>Fixed After Footer</strong>
                  <p>Pushes section below the footer layout.</p>
                </div>
              </label>
            </div>
          </div>

          <!-- Breaking News Ribbon -->
          <div class="cms-card">
            <div class="card-header-bar">
              <h3>Breaking News Ribbon</h3>
            </div>
            <div class="toggles-list">
              <label class="toggle-card">
                <input type="checkbox" [(ngModel)]="section.addToRibon">
                <div class="toggle-info">
                  <strong>Add to News Ribbon Ticker</strong>
                  <p>Pushes title to the top marquee ticker.</p>
                </div>
              </label>
            </div>

            <div class="form-group" style="margin-top:12px;" *ngIf="section.addToRibon">
              <label>RIBBON DISPLAY TITLE</label>
              <input type="text" [(ngModel)]="section.ribonCustomDisplayTitle" class="form-control" placeholder="Short ticker headline...">
            </div>

            <div class="form-group" style="margin-top:12px;" *ngIf="section.addToRibon">
              <label>RIBBON SORT ORDER</label>
              <input type="number" [(ngModel)]="section.ribonSortOrder" class="form-control">
            </div>
          </div>
        </div>
      </div>

      <!-- Notification Alerts -->
      <div class="success-box" *ngIf="successMessage">{{ successMessage }}</div>
      <div class="error-box" *ngIf="errorMessage">{{ errorMessage }}</div>
    </div>
  `,
  styles: [`
    .cms-page-container { display: flex; flex-direction: column; gap: 24px; }
    .page-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      background: #fff; padding: 24px 28px; border-radius: 16px; border: 1px solid #e2e8f0;
    }
    .breadcrumb { font-size: 13px; color: #64748b; margin-bottom: 6px; }
    .breadcrumb a { color: #0050e5; text-decoration: none; font-weight: 600; }
    .page-header h1 { font-size: 24px; font-weight: 800; color: #0f172a; margin: 0 0 4px; }
    .subtitle { color: #64748b; font-size: 14px; margin: 0; }
    .header-actions { display: flex; gap: 10px; }

    .btn {
      display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px;
      border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; text-decoration: none;
    }
    .btn-primary { background: #0050e5; color: #fff; border: none; }
    .btn-outline { background: transparent; border: 1px solid #cbd5e1; color: #334155; }

    .form-layout { display: grid; grid-template-columns: 2fr 1fr; gap: 24px; }
    .main-column, .side-column { display: flex; flex-direction: column; gap: 24px; }

    .cms-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; }
    .card-header-bar {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 20px; padding-bottom: 14px; border-bottom: 1px solid #f1f5f9;
    }
    .card-header-bar h3 { font-size: 17px; font-weight: 800; color: #0f172a; margin: 0 0 2px; }
    .card-sub { font-size: 13px; color: #64748b; margin: 0; }

    .form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 18px; }
    .full-width { grid-column: span 2; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group label { font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; }
    .form-control { padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; }
    .form-row { display: flex; gap: 12px; }
    .help-text { font-size: 11px; color: #64748b; }

    .input-with-upload { display: flex; gap: 10px; }
    .input-with-upload input { flex: 1; }
    .btn-upload {
      display: inline-flex; align-items: center; gap: 6px; padding: 10px 16px;
      background: #eff6ff; color: #0050e5; border-radius: 8px; font-size: 13px; font-weight: 600;
      cursor: pointer; white-space: nowrap;
    }
    .btn-upload.uploading { background: #cbd5e1; cursor: wait; }

    .image-preview-box {
      position: relative; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; max-height: 180px;
    }
    .image-preview-box img { width: 100%; height: 180px; object-fit: cover; }
    .btn-remove-img {
      position: absolute; top: 8px; right: 8px; background: rgba(0,0,0,0.7); color: #fff;
      border: none; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; font-size: 16px;
    }

    .label-with-badge { display: flex; justify-content: space-between; align-items: center; }
    .key-pill {
      display: inline-flex; align-items: center; gap: 4px;
      background: #f1f5f9; color: #475569; font-size: 10px; font-weight: 700;
      padding: 3px 8px; border-radius: 6px; font-family: monospace; border: 1px solid #e2e8f0;
    }
    .key-pill .icon-mini { font-size: 12px; color: #0050e5; }
    .readonly-input { background: #f8fafc; color: #64748b; cursor: not-allowed; }

    .toggles-list { display: flex; flex-direction: column; gap: 10px; }
    .toggle-card {
      display: flex; align-items: flex-start; gap: 12px; background: #f8fafc;
      padding: 12px 14px; border-radius: 10px; border: 1px solid #e2e8f0; cursor: pointer;
    }
    .toggle-card input { margin-top: 3px; }
    .toggle-info strong { font-size: 13px; color: #0f172a; }
    .toggle-info p { font-size: 11px; color: #64748b; margin: 2px 0 0; }
    .checkbox-card { display: flex; align-items: center; gap: 8px; background: #f8fafc; padding: 10px 14px; border-radius: 8px; border: 1px solid #e2e8f0; }

    .loading-box { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px; color: #64748b; }
    .spin { animation: spin 1s linear infinite; font-size: 32px; color: #0050e5; margin-bottom: 12px; }
    @keyframes spin { 100% { transform: rotate(360deg); } }

    .success-box { background: #f0fdf4; color: #166534; padding: 12px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; }
    .error-box { background: #fee2e2; color: #991b1b; padding: 12px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; }
  `]
})
export class PageSectionEditComponent implements OnInit {
  sectionId = '';
  section: any = null;
  installedTemplates: any[] = [];
  allPages: any[] = [];
  availableForms: any[] = [];
  loading = false;
  uploadingPrimary = false;
  uploadingSecondary = false;
  saving = false;
  successMessage = '';
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.sectionId = this.route.snapshot.paramMap.get('id') || '';
    if (this.sectionId) {
      this.loadSection();
    }
    this.loadInstalledTemplates();
    this.loadForms();
  }

  loadForms(): void {
    this.api.get<any>('PageFormsApi').subscribe({
      next: (res) => {
        if (res?.data && Array.isArray(res.data)) {
          this.availableForms = res.data;
        }
      },
      error: () => {}
    });
  }

  onFormSelected(formId: string | null): void {
    if (!formId) {
      this.section.formKey = '';
      return;
    }
    const found = this.availableForms.find(f => f.id === formId);
    if (found) {
      this.section.formKey = found.formKey;
    }
  }

  loadInstalledTemplates(): void {
    this.api.get<any>('ContentApi/templates/installed').subscribe({
      next: (res) => {
        if (res?.data && Array.isArray(res.data)) {
          this.installedTemplates = res.data;
        }
      },
      error: () => {}
    });
  }

  loadSection(): void {
    this.loading = true;
    this.api.get<any>(`ContentApi/sections/${this.sectionId}`).subscribe({
      next: (res) => {
        this.section = res?.data;
        this.loadPages();
      },
      error: (err) => {
        this.loading = false;
        this.toast.error(err?.error?.message || 'Failed to load layout section details.');
      }
    });
  }

  loadPages(): void {
    this.api.get<any>('ContentApi/pages').subscribe({
      next: (res) => {
        this.loading = false;
        this.allPages = res?.data || [];
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  uploadMedia(event: any, type: string): void {
    const file = event.target.files?.[0];
    if (!file) return;

    if (type === 'primary') this.uploadingPrimary = true;
    else this.uploadingSecondary = true;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'bcp-cms/sections');

    this.api.post<any>('ContentApi/upload-media', formData).subscribe({
      next: (res) => {
        if (type === 'primary') {
          this.uploadingPrimary = false;
          if (res?.data?.url) this.section.imageUrl = res.data.url;
          if (res?.data?.key) this.section.imageKey = res.data.key;
        } else {
          this.uploadingSecondary = false;
          if (res?.data?.url) this.section.secondImageUrl = res.data.url;
          if (res?.data?.key) this.section.secondImageKey = res.data.key;
        }
        this.toast.success('Media image uploaded successfully!');
      },
      error: (err) => {
        this.uploadingPrimary = false;
        this.uploadingSecondary = false;
        this.toast.error(err?.error?.message || 'Media upload failed.');
      }
    });
  }

  saveSection(): void {
    if (!this.section?.title?.trim()) {
      this.toast.warning('Section Title is required.');
      return;
    }

    this.saving = true;

    this.api.put<any>(`ContentApi/sections/${this.sectionId}`, this.section).subscribe({
      next: (res) => {
        this.saving = false;
        this.toast.success(res?.message || 'Section updated successfully!');
      },
      error: (err) => {
        this.saving = false;
        this.toast.error(err?.error?.message || 'Failed to update section.');
      }
    });
  }
}
