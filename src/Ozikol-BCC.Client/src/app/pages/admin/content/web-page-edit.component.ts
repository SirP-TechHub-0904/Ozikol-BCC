import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-web-page-edit',
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
            <a routerLink="/admin/content/pages">All Web Pages</a>
            <span class="sep">/</span>
            <span class="current">Edit Web Page</span>
          </div>
          <h1>Edit Page: {{ page?.title }}</h1>
          <p class="subtitle">Complete configuration of SEO parameters, navigation visibility, direct routing, and banner assets.</p>
        </div>
        <div class="header-actions">
          <a [routerLink]="['/admin/content/pages/details', pageId]" class="btn btn-outline">
            <span class="material-symbols-outlined">layers</span>
            <span>Manage Sections</span>
          </a>
          <a routerLink="/admin/content/pages" class="btn btn-outline">
            <span class="material-symbols-outlined">arrow_back</span>
            <span>Back to Pages</span>
          </a>
          <button type="button" class="btn btn-primary" (click)="savePage()" [disabled]="saving || loading">
            <span class="material-symbols-outlined">save</span>
            <span *ngIf="!saving">Save Page Changes</span>
            <span *ngIf="saving">Saving...</span>
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div class="loading-box" *ngIf="loading">
        <span class="material-symbols-outlined spin">progress_activity</span>
        <p>Loading page details...</p>
      </div>

      <!-- Page Edit Form -->
      <div class="form-layout" *ngIf="!loading && page">
        <!-- Left Main Column: Content, SEO, Banner -->
        <div class="main-column">
          <!-- Card 1: Core Identification -->
          <div class="cms-card">
            <div class="card-header-bar">
              <div>
                <h3>Core Identity & Routing</h3>
                <p class="card-sub">Page naming and public direct route mapping.</p>
              </div>
            </div>

            <div class="form-grid">
              <div class="form-group">
                <label>PAGE TITLE *</label>
                <input type="text" [(ngModel)]="page.title" class="form-control" placeholder="e.g. About Our Mission">
              </div>

              <div class="form-group">
                <label>DIRECT URL SLUG *</label>
                <input type="text" [(ngModel)]="page.directUrl" class="form-control" placeholder="about-us">
              </div>

              <div class="form-group">
                <label>MENU CATEGORY</label>
                <select [(ngModel)]="page.pageCategoryId" class="form-control">
                  <option [ngValue]="null">None (Standalone Page)</option>
                  <option *ngFor="let cat of categories" [ngValue]="cat.id">{{ cat.title }}</option>
                </select>
              </div>

              <div class="form-group">
                <label>SORT ORDER</label>
                <input type="number" [(ngModel)]="page.sortOrder" class="form-control">
              </div>

              <div class="form-group">
                <label>MENU ZONE POSITION *</label>
                <select [(ngModel)]="page.menuPosition" class="form-control">
                  <option [ngValue]="1">First Zone (NavItems="first")</option>
                  <option [ngValue]="2">Middle Zone (NavItems="middle")</option>
                  <option [ngValue]="3">Last Zone (NavItems="last")</option>
                  <option [ngValue]="4">Top Utility Bar (MainMenuItems="top")</option>
                </select>
              </div>

              <div class="form-group">
                <label>CUSTOM CSS CLASS</label>
                <input type="text" [(ngModel)]="page.customClass" class="form-control" placeholder="e.g. nav-highlight">
              </div>

              <div class="form-group full-width">
                <label>PARENT PAGE (SUB-PAGE HIERARCHY)</label>
                <select [(ngModel)]="page.mainPageId" class="form-control">
                  <option [ngValue]="null">None (Top-Level Page)</option>
                  <option *ngFor="let p of otherPages" [ngValue]="p.id">{{ p.title }}</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Card 2: SEO Meta Configuration -->
          <div class="cms-card">
            <div class="card-header-bar">
              <div>
                <h3>SEO & Search Engine Optimization</h3>
                <p class="card-sub">Control meta tags for Google indexing and social cards.</p>
              </div>
            </div>

            <div class="form-grid">
              <div class="form-group full-width">
                <label>META TITLE</label>
                <input type="text" [(ngModel)]="page.metaTitle" class="form-control" placeholder="SEO Title Tag">
              </div>

              <div class="form-group full-width">
                <label>META DESCRIPTION</label>
                <textarea rows="3" [(ngModel)]="page.metaDescription" class="form-control" placeholder="Brief snippet shown on Google search results..."></textarea>
              </div>

              <div class="form-group full-width">
                <label>META KEYWORDS</label>
                <input type="text" [(ngModel)]="page.metaKeywords" class="form-control" placeholder="e.g. community, portal, youth, empowerment">
              </div>
            </div>
          </div>

          <!-- Card 3: Banner & Media Image -->
          <div class="cms-card">
            <div class="card-header-bar">
              <div>
                <h3>Banner & Media Image</h3>
                <p class="card-sub">Upload high-resolution header image or enter media URL.</p>
              </div>
            </div>

            <div class="form-grid">
              <div class="form-group full-width">
                <div class="input-with-upload">
                  <input type="text" [(ngModel)]="page.imageUrl" class="form-control" placeholder="e.g. https://yourdomain.com/banner.jpg">
                  <label class="btn-upload" [class.uploading]="uploading">
                    <input type="file" (change)="uploadImage($event)" accept="image/*" style="display:none">
                    <span class="material-symbols-outlined">cloud_upload</span>
                    <span>{{ uploading ? 'Uploading...' : 'Upload Image' }}</span>
                  </label>
                </div>
              </div>

              <div class="form-group full-width" *ngIf="page.imageUrl">
                <div class="image-preview-box">
                  <img [src]="page.imageUrl" alt="Banner Preview">
                  <button type="button" class="btn-remove-img" (click)="page.imageUrl = ''; page.imageKey = ''">&times;</button>
                </div>
              </div>

              <div class="form-group full-width">
                <label>HOME SORT FROM</label>
                <select [(ngModel)]="page.homeSortFrom" class="form-control">
                  <option [ngValue]="0">Default</option>
                  <option [ngValue]="1">Ascending</option>
                  <option [ngValue]="2">Descending</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Side Column: Navigation Rules & Audits -->
        <div class="side-column">
          <!-- Publishing & Security -->
          <div class="cms-card">
            <div class="card-header-bar">
              <h3>Publishing & Access</h3>
            </div>
            <div class="toggles-list">
              <label class="toggle-card">
                <input type="checkbox" [(ngModel)]="page.publish">
                <div class="toggle-info">
                  <strong>Publish Page</strong>
                  <p>Page is live and accessible to visitors.</p>
                </div>
              </label>
              <label class="toggle-card">
                <input type="checkbox" [(ngModel)]="page.enableDirectUrl">
                <div class="toggle-info">
                  <strong>Enable Direct URL</strong>
                  <p>Route via slug (e.g. /about-us).</p>
                </div>
              </label>
              <label class="toggle-card">
                <input type="checkbox" [(ngModel)]="page.securityPage">
                <div class="toggle-info">
                  <strong>Institutional / Legal Page (Terms, Privacy)</strong>
                  <p>Categorized for compliance and legal footer links.</p>
                </div>
              </label>
            </div>
          </div>

          <!-- Navigation Placement Rules -->
          <div class="cms-card">
            <div class="card-header-bar">
              <h3>Navigation Placements</h3>
            </div>
            <div class="toggles-list">
              <label class="toggle-card">
                <input type="checkbox" [(ngModel)]="page.showInMainMenu">
                <div class="toggle-info">
                  <strong>Show in Main Menu</strong>
                  <p>Displays on primary top navigation bar.</p>
                </div>
              </label>
              <label class="toggle-card">
                <input type="checkbox" [(ngModel)]="page.showInMainTop">
                <div class="toggle-info">
                  <strong>Show in Main Top Bar</strong>
                  <p>Displays in secondary top utility bar.</p>
                </div>
              </label>
              <label class="toggle-card">
                <input type="checkbox" [(ngModel)]="page.showInMenuDropDown">
                <div class="toggle-info">
                  <strong>Show in Menu DropDown</strong>
                  <p>Displays inside category dropdowns.</p>
                </div>
              </label>
              <label class="toggle-card">
                <input type="checkbox" [(ngModel)]="page.showInFooter">
                <div class="toggle-info">
                  <strong>Show in Footer</strong>
                  <p>Displays in site footer links section.</p>
                </div>
              </label>
              <label class="toggle-card">
                <input type="checkbox" [(ngModel)]="page.isLegal">
                <div class="toggle-info">
                  <strong>Is Legal Document</strong>
                  <p [innerText]="'Surfaced to {{#each LegalPages}} and footer legal compliance tokens.'"></p>
                </div>
              </label>
              <label class="toggle-card">
                <input type="checkbox" [(ngModel)]="page.isMenuCTA">
                <div class="toggle-info">
                  <strong>Is Menu CTA Button</strong>
                  <p>Highlighted as an action button in header navbars.</p>
                </div>
              </label>
            </div>
          </div>

          <!-- Page Tags & Custom Grouping -->
          <div class="cms-card">
            <div class="card-header-bar">
              <h3>Page Tags & Custom Grouping</h3>
            </div>
            <p class="card-hint">
              Assign custom tags to organize pages into custom footer columns (e.g. <code [innerText]="'{{#each TaggedPages &quot;quick-links&quot;}}'"></code>).
            </p>

            <!-- Active Chips -->
            <div class="tags-chips-container" *ngIf="tagsList.length > 0">
              <span class="tag-badge" *ngFor="let t of tagsList">
                #{{ t }}
                <button type="button" class="tag-remove-btn" (click)="removeTag(t)" title="Remove tag">
                  <i class="fas fa-times"></i>
                </button>
              </span>
            </div>

            <!-- Tag Input + Suggestions -->
            <div class="tag-input-wrapper">
              <div class="tag-input-group">
                <i class="fas fa-tag tag-icon"></i>
                <input
                  type="text"
                  [(ngModel)]="newTagInput"
                  (keydown.enter)="addTag($event)"
                  (keydown.comma)="addTag($event)"
                  (input)="filterTags()"
                  placeholder="Type tag & press Enter (e.g. quick-links)..."
                  class="tag-text-input"
                />
                <button type="button" class="btn-add-tag" (click)="addTag($event)" [disabled]="!newTagInput.trim()">
                  <i class="fas fa-plus"></i> Add
                </button>
              </div>

              <!-- Autocomplete Dropdown -->
              <div class="tag-autocomplete-dropdown" *ngIf="filteredTags.length > 0">
                <div
                  class="tag-autocomplete-item"
                  *ngFor="let suggestion of filteredTags"
                  (click)="selectTag(suggestion)"
                >
                  <i class="fas fa-hashtag"></i>
                  <span>{{ suggestion }}</span>
                </div>
              </div>
            </div>

            <!-- Existing Tenant Tags Quick-Pick -->
            <div class="available-tags-shelf" *ngIf="unselectedAvailableTags.length > 0">
              <small class="shelf-label">Existing site tags:</small>
              <div class="shelf-chips">
                <span
                  class="shelf-chip"
                  *ngFor="let at of unselectedAvailableTags"
                  (click)="selectTag(at)"
                  title="Click to add tag"
                >
                  + {{ at }}
                </span>
              </div>
            </div>
          </div>

          <!-- Audit Timestamps & Views -->
          <div class="cms-card">
            <div class="card-header-bar">
              <h3>Analytics & Timestamps</h3>
            </div>
            <div class="meta-list">
              <div class="meta-row">
                <span>Cumulative Views:</span>
                <strong>{{ page.viewCount || 0 }} visits</strong>
              </div>
              <div class="meta-row">
                <span>Created At:</span>
                <small>{{ page.createdAtUtc | date:'medium' }}</small>
              </div>
              <div class="meta-row" *ngIf="page.updatedAtUtc">
                <span>Last Updated:</span>
                <small>{{ page.updatedAtUtc | date:'medium' }}</small>
              </div>
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
    .badge-seo { background: #eff6ff; color: #0050e5; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; }

    .form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 18px; }
    .full-width { grid-column: span 2; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group label { font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; }
    .form-control { padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; }
    .help-text { font-size: 11px; color: #64748b; }

    .slug-input-wrapper { display: flex; align-items: center; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; }
    .slug-input-wrapper .prefix { background: #f8fafc; padding: 10px 12px; color: #64748b; font-weight: 700; border-right: 1px solid #cbd5e1; }
    .slug-control { border: none !important; border-radius: 0 !important; }

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

    .toggles-list { display: flex; flex-direction: column; gap: 12px; }
    .toggle-card {
      display: flex; align-items: flex-start; gap: 12px; background: #f8fafc;
      padding: 12px 14px; border-radius: 10px; border: 1px solid #e2e8f0; cursor: pointer;
    }
    .toggle-card input { margin-top: 3px; }
    .toggle-info strong { font-size: 13px; color: #0f172a; }
    .toggle-info p { font-size: 11px; color: #64748b; margin: 2px 0 0; }

    .meta-list { display: flex; flex-direction: column; gap: 10px; font-size: 13px; }
    .meta-row { display: flex; justify-content: space-between; align-items: center; padding-bottom: 8px; border-bottom: 1px solid #f1f5f9; }
    .meta-row span { color: #64748b; }

    .loading-box { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px; color: #64748b; }
    .spin { animation: spin 1s linear infinite; font-size: 32px; color: #0050e5; margin-bottom: 12px; }
    @keyframes spin { 100% { transform: rotate(360deg); } }

    .success-box { background: #f0fdf4; color: #166534; padding: 12px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; }
    .error-box { background: #fee2e2; color: #991b1b; padding: 12px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; }

    .card-hint { font-size: 13px; color: #64748b; margin-top: 0; margin-bottom: 12px; line-height: 1.4; }
    .card-hint code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 12px; color: #0284c7; }
    .tags-chips-container { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
    .tag-badge { display: inline-flex; align-items: center; gap: 6px; background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; font-size: 13px; font-weight: 600; padding: 4px 10px; border-radius: 9999px; }
    .tag-remove-btn { background: none; border: none; color: #93c5fd; cursor: pointer; padding: 0; font-size: 12px; display: inline-flex; align-items: center; transition: color 0.15s; }
    .tag-remove-btn:hover { color: #dc2626; }
    .tag-input-wrapper { position: relative; margin-bottom: 12px; }
    .tag-input-group { display: flex; align-items: center; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; background: #fff; }
    .tag-icon { padding-left: 12px; color: #94a3b8; font-size: 14px; }
    .tag-text-input { flex: 1; border: none; outline: none; padding: 8px 12px; font-size: 13px; color: #1e293b; }
    .btn-add-tag { background: #f1f5f9; border: none; border-left: 1px solid #cbd5e1; padding: 8px 14px; font-size: 13px; font-weight: 600; color: #475569; cursor: pointer; display: flex; align-items: center; gap: 6px; }
    .btn-add-tag:hover:not(:disabled) { background: #e2e8f0; color: #0f172a; }
    .btn-add-tag:disabled { opacity: 0.5; cursor: not-allowed; }
    .tag-autocomplete-dropdown { position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); z-index: 50; max-height: 160px; overflow-y: auto; }
    .tag-autocomplete-item { display: flex; align-items: center; gap: 8px; padding: 8px 12px; font-size: 13px; color: #334155; cursor: pointer; transition: background 0.15s; }
    .tag-autocomplete-item:hover { background: #f8fafc; color: #0050e5; }
    .available-tags-shelf { display: flex; flex-direction: column; gap: 6px; }
    .shelf-label { font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
    .shelf-chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .shelf-chip { background: #f8fafc; border: 1px dashed #cbd5e1; color: #64748b; font-size: 12px; font-weight: 500; padding: 3px 8px; border-radius: 6px; cursor: pointer; transition: all 0.15s; }
    .shelf-chip:hover { background: #f0fdf4; border-color: #86efac; color: #166534; }
  `]
})
export class WebPageEditComponent implements OnInit {
  pageId = '';
  page: any = null;
  categories: any[] = [];
  allPages: any[] = [];
  loading = false;
  uploading = false;
  saving = false;
  successMessage = '';
  errorMessage = '';

  // Free-form Tag Management
  tagsList: string[] = [];
  newTagInput = '';
  availableTags: string[] = [];
  filteredTags: string[] = [];

  get unselectedAvailableTags(): string[] {
    return this.availableTags.filter(t => !this.tagsList.includes(t.toLowerCase()));
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.pageId = this.route.snapshot.paramMap.get('id') || '';
    this.loadCategories();
    this.loadAllPages();
    this.loadAvailableTags();
    if (this.pageId) {
      this.loadPage();
    }
  }

  loadAvailableTags(): void {
    this.api.get<any>('ContentApi/page-tags').subscribe({
      next: (res) => {
        this.availableTags = res?.data || [];
      }
    });
  }

  filterTags(): void {
    const q = (this.newTagInput || '').trim().toLowerCase();
    if (!q) {
      this.filteredTags = [];
      return;
    }
    this.filteredTags = this.availableTags.filter(
      t => t.toLowerCase().includes(q) && !this.tagsList.includes(t.toLowerCase())
    );
  }

  addTag(event?: Event): void {
    if (event) {
      event.preventDefault();
    }
    const clean = (this.newTagInput || '')
      .trim()
      .toLowerCase()
      .replace(/[,;]/g, '')
      .replace(/\s+/g, '-');
    if (clean && !this.tagsList.includes(clean)) {
      this.tagsList.push(clean);
      this.syncTags();
    }
    this.newTagInput = '';
    this.filteredTags = [];
  }

  selectTag(tag: string): void {
    const clean = tag.trim().toLowerCase();
    if (clean && !this.tagsList.includes(clean)) {
      this.tagsList.push(clean);
      this.syncTags();
    }
    this.newTagInput = '';
    this.filteredTags = [];
  }

  removeTag(tag: string): void {
    this.tagsList = this.tagsList.filter(t => t !== tag);
    this.syncTags();
  }

  syncTags(): void {
    if (this.page) {
      this.page.tags = this.tagsList.join(',');
    }
  }

  loadPage(): void {
    this.loading = true;
    this.api.get<any>(`ContentApi/pages/${this.pageId}`).subscribe({
      next: (res) => {
        this.loading = false;
        this.page = res?.data;
        if (this.page) {
          this.tagsList = (this.page.tags || '')
            .split(',')
            .map((t: string) => t.trim().toLowerCase())
            .filter((t: string) => !!t);
        }
      },
      error: (err) => {
        this.loading = false;
        this.toast.error(err?.error?.message || 'Failed to load page details.');
      }
    });
  }

  loadCategories(): void {
    this.api.get<any>('ContentApi/categories').subscribe({
      next: (res) => {
        this.categories = res?.data || [];
      }
    });
  }

  loadAllPages(): void {
    this.api.get<any>('ContentApi/pages').subscribe({
      next: (res) => {
        this.allPages = res?.data || [];
      }
    });
  }

  get otherPages(): any[] {
    return this.allPages.filter(p => p.id.toLowerCase() !== this.pageId.toLowerCase());
  }

  uploadImage(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;

    this.uploading = true;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'bcp-cms/pages');

    this.api.post<any>('ContentApi/upload-media', formData).subscribe({
      next: (res) => {
        this.uploading = false;
        if (res?.data?.url) {
          this.page.imageUrl = res.data.url;
        }
        if (res?.data?.key) {
          this.page.imageKey = res.data.key;
        }
        this.toast.success('Banner image uploaded successfully!');
      },
      error: (err) => {
        this.uploading = false;
        this.toast.error(err?.error?.message || 'Media upload failed.');
      }
    });
  }

  savePage(): void {
    this.syncTags();

    if (!this.page?.title?.trim()) {
      this.toast.warning('Page Title is required.');
      return;
    }

    if (!this.page?.directUrl?.trim()) {
      this.toast.warning('Direct URL Slug is required.');
      return;
    }

    this.saving = true;

    this.api.put<any>(`ContentApi/pages/${this.pageId}`, this.page).subscribe({
      next: (res) => {
        this.saving = false;
        this.toast.success(res?.message || 'Web page updated successfully!');
      },
      error: (err) => {
        this.saving = false;
        this.toast.error(err?.error?.message || 'Failed to update web page.');
      }
    });
  }
}
