import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-page-section-list-edit',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="cms-page-container">
      <!-- Header -->
      <div class="page-header">
        <div class="header-titles">
          <div class="breadcrumb">
            <a routerLink="/content/console">CMS Studio</a>
            <span class="sep">/</span>
            <a routerLink="/content/console/sections">Page Sections</a>
            <span class="sep">/</span>
            <span class="current">Edit Sub-Item</span>
          </div>
          <h1>Edit Sub-Item: {{ item?.title }}</h1>
          <p class="subtitle">Complete configuration of repeating card fields, icons, descriptions, buttons, and media assets.</p>
        </div>
        <div class="header-actions">
          <button type="button" class="btn btn-outline" (click)="goBack()">
            <span class="material-symbols-outlined">arrow_back</span>
            <span>Back</span>
          </button>
          <button type="button" class="btn btn-primary" (click)="saveItem()" [disabled]="saving || loading">
            <span class="material-symbols-outlined">save</span>
            <span *ngIf="!saving">Save Changes</span>
            <span *ngIf="saving">Saving...</span>
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div class="loading-box" *ngIf="loading">
        <span class="material-symbols-outlined spin">progress_activity</span>
        <p>Loading sub-item details...</p>
      </div>

      <!-- Main Edit Form -->
      <div class="form-layout" *ngIf="!loading && item">
        <!-- Main Column -->
        <div class="main-column">
          <!-- Card 1: Content & Copy -->
          <div class="cms-card">
            <div class="card-header-bar">
              <h3>Item Identity & Descriptions</h3>
            </div>
            <div class="form-grid">
              <div class="form-group full-width">
                <label>ITEM TITLE *</label>
                <input type="text" [(ngModel)]="item.title" class="form-control" placeholder="e.g. Health Outreach Program">
              </div>

              <div class="form-group">
                <label>MINI TITLE (SUB-TAG)</label>
                <input type="text" [(ngModel)]="item.miniTitle" class="form-control" placeholder="HEALTH & WELLNESS">
              </div>

              <div class="form-group">
                <label>ICON CLASS STRING</label>
                <input type="text" [(ngModel)]="item.iconText" class="form-control" placeholder="fa-solid fa-stethoscope">
              </div>

              <div class="form-group full-width">
                <label>SUMMARY DESCRIPTION</label>
                <textarea rows="3" [(ngModel)]="item.description" class="form-control" placeholder="Card introductory text..."></textarea>
              </div>

              <div class="form-group full-width">
                <label>EXTENDED / MORE DESCRIPTION</label>
                <textarea rows="4" [(ngModel)]="item.moreDescription" class="form-control" placeholder="Full details when expanded..."></textarea>
              </div>
            </div>
          </div>

          <!-- Card 2: Action Button & Route -->
          <div class="cms-card">
            <div class="card-header-bar">
              <h3>Button Action & Direct Link</h3>
            </div>
            <div class="form-grid">
              <div class="form-group">
                <label>BUTTON TEXT</label>
                <input type="text" [(ngModel)]="item.buttonText" class="form-control" placeholder="View Program">
              </div>

              <div class="form-group">
                <label>BUTTON LINK</label>
                <input type="text" [(ngModel)]="item.buttonLink" class="form-control" placeholder="/programs/health">
              </div>

              <div class="form-group full-width">
                <label>DIRECT ROUTE / ANCHOR SLUG</label>
                <input type="text" [(ngModel)]="item.directUrl" class="form-control" placeholder="health-program">
              </div>
            </div>
          </div>

          <!-- Card 3: Media Uploads -->
          <div class="cms-card">
            <div class="card-header-bar">
              <div>
                <h3>Media Image & Video Assets</h3>
                <p class="card-sub">Upload image assets or enter media URL.</p>
              </div>
            </div>
            <div class="form-grid">
              <div class="form-group full-width">
                <label>IMAGE URL</label>
                <div class="input-with-upload">
                  <input type="text" [(ngModel)]="item.imageUrl" class="form-control" placeholder="e.g. https://yourdomain.com/icon.svg">
                  <label class="btn-upload" [class.uploading]="uploading">
                    <input type="file" (change)="uploadImage($event)" accept="image/*" style="display:none">
                    <span class="material-symbols-outlined">cloud_upload</span>
                    <span>{{ uploading ? 'Uploading...' : 'Upload Image' }}</span>
                  </label>
                </div>
              </div>

              <div class="form-group full-width" *ngIf="item.imageUrl">
                <div class="image-preview-box">
                  <img [src]="item.imageUrl" alt="Sub-Item Preview">
                  <button type="button" class="btn-remove-img" (click)="item.imageUrl = ''">&times;</button>
                </div>
              </div>

              <div class="form-group">
                <label>MEDIA ASSET KEY</label>
                <input type="text" [(ngModel)]="item.imageKey" class="form-control" placeholder="e.g. assets/items/item_01">
              </div>

              <div class="form-group">
                <label>VIDEO URL</label>
                <input type="text" [(ngModel)]="item.videoUrl" class="form-control" placeholder="e.g. https://yourdomain.com/video.mp4">
              </div>
            </div>
          </div>
        </div>

        <!-- Side Column -->
        <div class="side-column">
          <!-- Placement & Order -->
          <div class="cms-card">
            <div class="card-header-bar">
              <h3>Placement & Status</h3>
            </div>
            <div class="form-group">
              <label>SORT ORDER</label>
              <input type="number" [(ngModel)]="item.sortOrder" class="form-control">
            </div>

            <div class="toggles-list" style="margin-top:14px;">
              <label class="toggle-card">
                <input type="checkbox" [(ngModel)]="item.disable">
                <div class="toggle-info">
                  <strong>Disable Sub-Item</strong>
                  <p>Hides this card from the layout block.</p>
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
                <input type="checkbox" [(ngModel)]="item.addToRibon">
                <div class="toggle-info">
                  <strong>Add to News Ribbon</strong>
                  <p>Pushes title to top breaking news.</p>
                </div>
              </label>
            </div>

            <div class="form-group" style="margin-top:12px;" *ngIf="item.addToRibon">
              <label>RIBBON DISPLAY TITLE</label>
              <input type="text" [(ngModel)]="item.ribonCustomDisplayTitle" class="form-control" placeholder="Headline...">
            </div>

            <div class="form-group" style="margin-top:12px;" *ngIf="item.addToRibon">
              <label>RIBBON SORT ORDER</label>
              <input type="number" [(ngModel)]="item.ribonSortOrder" class="form-control">
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

    .toggles-list { display: flex; flex-direction: column; gap: 10px; }
    .toggle-card {
      display: flex; align-items: flex-start; gap: 12px; background: #f8fafc;
      padding: 12px 14px; border-radius: 10px; border: 1px solid #e2e8f0; cursor: pointer;
    }
    .toggle-card input { margin-top: 3px; }
    .toggle-info strong { font-size: 13px; color: #0f172a; }
    .toggle-info p { font-size: 11px; color: #64748b; margin: 2px 0 0; }

    .loading-box { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px; color: #64748b; }
    .spin { animation: spin 1s linear infinite; font-size: 32px; color: #0050e5; margin-bottom: 12px; }
    @keyframes spin { 100% { transform: rotate(360deg); } }

    .success-box { background: #f0fdf4; color: #166534; padding: 12px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; }
    .error-box { background: #fee2e2; color: #991b1b; padding: 12px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; }
  `]
})
export class PageSectionListEditComponent implements OnInit {
  itemId = '';
  item: any = null;
  loading = false;
  saving = false;
  uploading = false;
  successMessage = '';
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.itemId = this.route.snapshot.paramMap.get('id') || '';
    if (this.itemId) {
      this.loadItem();
    }
  }

  loadItem(): void {
    this.loading = true;
    this.api.get<any>(`ContentApi/section-lists/${this.itemId}`).subscribe({
      next: (res) => {
        this.loading = false;
        this.item = res?.data;
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Failed to load sub-item details.';
      }
    });
  }

  uploadImage(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;

    this.uploading = true;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'bcp-cms/section-items');

    this.api.post<any>('ContentApi/upload-media', formData).subscribe({
      next: (res) => {
        this.uploading = false;
        if (res?.data?.url) this.item.imageUrl = res.data.url;
      },
      error: (err) => {
        this.uploading = false;
        this.toast.error(err?.error?.message || 'Media upload failed.');
      }
    });
  }

  saveItem(): void {
    if (!this.item?.title?.trim()) {
      this.errorMessage = 'Item Title is required.';
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.api.put<any>(`ContentApi/section-lists/${this.itemId}`, this.item).subscribe({
      next: () => {
        this.saving = false;
        this.successMessage = 'Sub-item updated successfully!';
        setTimeout(() => this.successMessage = '', 4000);
      },
      error: (err) => {
        this.saving = false;
        this.errorMessage = err?.error?.message || 'Failed to update sub-item.';
      }
    });
  }

  goBack(): void {
    if (this.item?.pageSectionId) {
      this.router.navigate(['/content/console/sections/details', this.item.pageSectionId]);
    } else {
      this.router.navigate(['/content/console/sections']);
    }
  }
}
