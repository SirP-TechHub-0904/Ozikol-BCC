import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-slider-edit',
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
            <a routerLink="/admin/content/sliders">Hero Sliders</a>
            <span class="sep">/</span>
            <span class="current">Edit Slider</span>
          </div>
          <h1>Edit Hero Slider: {{ slider?.title }}</h1>
          <p class="subtitle">Complete configuration of carousel headlines, slide media, video buttons, and sorting order.</p>
        </div>
        <div class="header-actions">
          <a routerLink="/admin/content/sliders" class="btn btn-outline">
            <span class="material-symbols-outlined">arrow_back</span>
            <span>Back to Sliders</span>
          </a>
          <button type="button" class="btn btn-primary" (click)="saveSlider()" [disabled]="saving || loading">
            <span class="material-symbols-outlined">save</span>
            <span *ngIf="!saving">Save Slider Changes</span>
            <span *ngIf="saving">Saving...</span>
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div class="loading-box" *ngIf="loading">
        <span class="material-symbols-outlined spin">progress_activity</span>
        <p>Loading slider details...</p>
      </div>

      <!-- Main Form -->
      <div class="form-layout" *ngIf="!loading && slider">
        <!-- Main Column -->
        <div class="main-column">
          <!-- Card 1: Copy & Headline -->
          <div class="cms-card">
            <div class="card-header-bar">
              <h3>Headline & Text Content</h3>
            </div>
            <div class="form-grid">
              <div class="form-group full-width">
                <label>SLIDER MAIN HEADLINE *</label>
                <input type="text" [(ngModel)]="slider.title" class="form-control" placeholder="e.g. Innovating the Future of Community Empowerment">
              </div>

              <div class="form-group">
                <label>MINI TITLE (SUB-TAG / EYEBROW)</label>
                <input type="text" [(ngModel)]="slider.miniTitle" class="form-control" placeholder="e.g. Official Portal">
              </div>

              <div class="form-group">
                <label>SORT ORDER</label>
                <input type="number" [(ngModel)]="slider.sortOrder" class="form-control">
              </div>

              <div class="form-group full-width">
                <label>SLIDE TEXT / SUMMARY</label>
                <textarea [(ngModel)]="slider.text" class="form-control" rows="3" placeholder="Brief supportive summary..."></textarea>
              </div>
            </div>
          </div>

          <!-- Card 2: Action Buttons & Video -->
          <div class="cms-card">
            <div class="card-header-bar">
              <h3>Action Buttons & Video Modal</h3>
            </div>
            <div class="form-grid">
              <div class="form-group">
                <label>PRIMARY BUTTON TEXT</label>
                <input type="text" [(ngModel)]="slider.buttonText" class="form-control" placeholder="e.g. Learn More">
              </div>
              <div class="form-group">
                <label>PRIMARY BUTTON LINK</label>
                <input type="text" [(ngModel)]="slider.buttonLink" class="form-control" placeholder="/about">
              </div>

              <div class="form-group">
                <label>VIDEO BUTTON TEXT</label>
                <input type="text" [(ngModel)]="slider.videoButtonText" class="form-control" placeholder="Watch Video">
              </div>
              <div class="form-group">
                <label>POPUP VIDEO LINK</label>
                <input type="text" [(ngModel)]="slider.videoLink" class="form-control" placeholder="https://youtube.com/watch?v=...">
              </div>

              <div class="form-group full-width">
                <label class="checkbox-card">
                  <input type="checkbox" [(ngModel)]="slider.disableVideoButton">
                  <span>Disable / Hide Video Popup Button</span>
                </label>
              </div>
            </div>
          </div>

          <!-- Card 3: Media Upload -->
          <div class="cms-card">
            <div class="card-header-bar">
              <div>
                <h3>Hero Background Media</h3>
                <p class="card-sub">Upload high-resolution slide backgrounds or enter media URLs.</p>
              </div>
            </div>

            <div class="form-grid">
              <!-- Slide Primary Image -->
              <div class="form-group full-width">
                <div class="label-with-badge">
                  <label>PRIMARY SLIDE IMAGE URL</label>
                  <span class="key-pill" *ngIf="slider.key">
                    <span class="material-symbols-outlined icon-mini">vpn_key</span>
                    <span>KEY: {{ slider.key }}</span>
                  </span>
                </div>
                <div class="input-with-upload">
                  <input type="text" [(ngModel)]="slider.url" class="form-control" placeholder="e.g. https://yourdomain.com/slide-bg.jpg">
                  <label class="btn-upload" [class.uploading]="uploadingPrimary">
                    <input type="file" (change)="uploadSlideImage($event, 'primary')" accept="image/*" style="display:none">
                    <span class="material-symbols-outlined">cloud_upload</span>
                    <span>{{ uploadingPrimary ? 'Uploading...' : 'Upload Image' }}</span>
                  </label>
                </div>
              </div>

              <div class="form-group full-width" *ngIf="slider.url">
                <div class="image-preview-box">
                  <img [src]="slider.url" alt="Slide Background">
                  <button type="button" class="btn-remove-img" (click)="slider.url = ''; slider.key = ''">&times;</button>
                </div>
              </div>

              <!-- Secondary Image -->
              <div class="form-group full-width">
                <div class="label-with-badge">
                  <label>SECONDARY / ACCENT SLIDE IMAGE URL</label>
                  <span class="key-pill" *ngIf="slider.secondKey">
                    <span class="material-symbols-outlined icon-mini">vpn_key</span>
                    <span>KEY: {{ slider.secondKey }}</span>
                  </span>
                </div>
                <div class="input-with-upload">
                  <input type="text" [(ngModel)]="slider.secondUrl" class="form-control" placeholder="e.g. https://yourdomain.com/slide-overlay.png">
                  <label class="btn-upload" [class.uploading]="uploadingSecondary">
                    <input type="file" (change)="uploadSlideImage($event, 'secondary')" accept="image/*" style="display:none">
                    <span class="material-symbols-outlined">cloud_upload</span>
                    <span>{{ uploadingSecondary ? 'Uploading...' : 'Upload Image' }}</span>
                  </label>
                </div>
              </div>

              <div class="form-group full-width">
                <label>YOUTUBE EMBED URL</label>
                <input type="text" [(ngModel)]="slider.youtubeVideo" class="form-control" placeholder="https://youtube.com/embed/...">
              </div>
            </div>
          </div>
        </div>

        <!-- Side Column -->
        <div class="side-column">
          <!-- Template Selection -->
          <div class="cms-card">
            <div class="card-header-bar">
              <div>
                <h3>Theme Layout Blueprint</h3>
                <p class="card-sub">Select modular Hero layout from your library.</p>
              </div>
            </div>
            <div class="form-group">
              <label>HERO SECTION TEMPLATE</label>
              <select [(ngModel)]="slider.templateKey" class="form-control">
                <option value="">-- Default System Slider --</option>
                <option *ngFor="let t of heroTemplates" [value]="t.templateKey || t.variantCode">
                  {{ t.name }} ({{ t.variantCode }})
                </option>
              </select>
              <small class="form-hint" style="color: #64748b; font-size: 11px; margin-top: 6px; display: block;">
                Directly renders this template markup &amp; styles. Manage blueprints in
                <a routerLink="/content/console/templates" target="_blank" style="color: #0050e5; font-weight: 600;">My Templates</a>.
              </small>
            </div>
          </div>

          <!-- Visibility & Toggles -->
          <div class="cms-card">
            <div class="card-header-bar">
              <h3>Display Configuration</h3>
            </div>
            <div class="toggles-list">
              <label class="toggle-card">
                <input type="checkbox" [(ngModel)]="slider.show">
                <div class="toggle-info">
                  <strong>Show in Hero Carousel</strong>
                  <p>Slide is active and cycling on homepage.</p>
                </div>
              </label>
              <label class="toggle-card">
                <input type="checkbox" [(ngModel)]="slider.isVideo">
                <div class="toggle-info">
                  <strong>Enable Video Background</strong>
                  <p>Treat media as background video stream.</p>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>
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
  `]
})
export class SliderEditComponent implements OnInit {
  sliderId: string | null = null;
  slider: any = {
    show: true,
    sortOrder: 1,
    isVideo: false,
    disableVideoButton: false
  };
  heroTemplates: any[] = [];
  loading = true;
  uploadingPrimary = false;
  uploadingSecondary = false;
  saving = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.sliderId = this.route.snapshot.paramMap.get('id');
    if (this.sliderId) {
      this.loadSlider();
    } else {
      this.loading = false;
    }
    this.loadHeroTemplates();
  }

  loadHeroTemplates(): void {
    this.api.get<any>('ContentApi/templates/installed').subscribe({
      next: (res) => {
        if (res?.data && Array.isArray(res.data)) {
          this.heroTemplates = res.data.filter((t: any) => t.categoryKey?.toLowerCase() === 'hero');
        }
      },
      error: () => {}
    });
  }

  loadSlider(): void {
    this.loading = true;
    this.api.get<any>(`ContentApi/sliders/${this.sliderId}`).subscribe({
      next: (res) => {
        this.loading = false;
        if (res?.data) this.slider = res.data;
      },
      error: (err) => {
        this.loading = false;
        this.toast.error(err?.error?.message || 'Failed to load slider details.');
      }
    });
  }

  uploadSlideImage(event: any, type: string): void {
    const file = event.target.files?.[0];
    if (!file) return;

    if (type === 'primary') this.uploadingPrimary = true;
    else this.uploadingSecondary = true;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'bcp-cms/sliders');

    this.api.post<any>('ContentApi/upload-media', formData).subscribe({
      next: (res) => {
        if (type === 'primary') {
          this.uploadingPrimary = false;
          if (res?.data?.url) this.slider.url = res.data.url;
          if (res?.data?.key) this.slider.key = res.data.key;
        } else {
          this.uploadingSecondary = false;
          if (res?.data?.url) this.slider.secondUrl = res.data.url;
          if (res?.data?.key) this.slider.secondKey = res.data.key;
        }
        this.toast.success('Slide image uploaded successfully!');
      },
      error: (err) => {
        this.uploadingPrimary = false;
        this.uploadingSecondary = false;
        this.toast.error(err?.error?.message || 'Media upload failed.');
      }
    });
  }

  saveSlider(): void {
    if (!this.slider?.title?.trim()) {
      this.toast.warning('Slider Main Headline is required.');
      return;
    }

    this.saving = true;

    this.api.put<any>(`ContentApi/sliders/${this.sliderId}`, this.slider).subscribe({
      next: (res) => {
        this.saving = false;
        this.toast.success(res?.message || 'Hero slider updated successfully!');
      },
      error: (err) => {
        this.saving = false;
        this.toast.error(err?.error?.message || 'Failed to update slider.');
      }
    });
  }
}
