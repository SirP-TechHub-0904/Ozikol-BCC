import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-web-pages',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="cms-page-container">
      <!-- Top Header -->
      <div class="page-header">
        <div class="header-titles">
          <div class="breadcrumb">
            <a routerLink="/admin/content">CMS Studio</a>
            <span class="sep">/</span>
            <span class="current">All Web Pages</span>
          </div>
          <h1>Published & Draft Web Pages</h1>
          <p class="subtitle">Create, organize layout blocks, and manage SEO metadata for all public website pages.</p>
        </div>
        <div class="header-actions">
          <button type="button" class="btn btn-primary" (click)="openCreateModal()">
            <span class="material-symbols-outlined">add_circle</span>
            <span>New Web Page</span>
          </button>
          <button type="button" (click)="loadAll()" class="btn btn-outline" [disabled]="loading">
            <span class="material-symbols-outlined" [class.spin]="loading">refresh</span>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <!-- Filter Controls Bar -->
      <div class="filter-bar">
        <div class="filter-group">
          <button type="button" class="filter-btn" [class.active]="filterStatus === 'all'" (click)="filterStatus = 'all'">
            All Pages ({{ pages.length }})
          </button>
          <button type="button" class="filter-btn" [class.active]="filterStatus === 'published'" (click)="filterStatus = 'published'">
            Published ({{ publishedCount }})
          </button>
          <button type="button" class="filter-btn" [class.active]="filterStatus === 'draft'" (click)="filterStatus = 'draft'">
            Drafts ({{ draftCount }})
          </button>
        </div>
        <div class="search-box">
          <span class="material-symbols-outlined">search</span>
          <input type="text" [(ngModel)]="searchTerm" placeholder="Search by title or slug...">
        </div>
      </div>

      <!-- Pages Table Card -->
      <div class="cms-card">
        <div class="table-responsive">
          <table class="cms-table">
            <thead>
              <tr>
                <th>PAGE TITLE</th>
                <th>ZONE</th>
                <th>DIRECT URL SLUG</th>
                <th>MENU CATEGORY</th>
                <th>NAV BAR</th>
                <th>FOOTER</th>
                <th>VIEWS</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let page of filteredPages">
                <td>
                  <div class="page-title-cell">
                    <div class="d-flex align-items-center gap-2">
                      <strong>{{ page.title }}</strong>
                      <span class="cta-pill" *ngIf="page.isMenuCTA">CTA Button</span>
                    </div>
                    <span class="security-badge" *ngIf="page.securityPage">
                      <span class="material-symbols-outlined">lock</span> Protected
                    </span>
                    <span class="sub-text" *ngIf="page.customClass"><code>.{{ page.customClass }}</code></span>
                  </div>
                </td>
                <td>
                  <span class="zone-badge" [ngClass]="getZoneClass(page.menuPosition)">
                    {{ getZoneLabel(page.menuPosition) }}
                  </span>
                </td>
                <td>
                  <a [href]="'/' + page.directUrl" target="_blank" class="slug-link" title="Open preview">
                    <code>/{{ page.directUrl }}</code>
                    <span class="material-symbols-outlined open-icon">open_in_new</span>
                  </a>
                </td>
                <td>
                  <span class="badge-cat" *ngIf="page.pageCategory">{{ page.pageCategory.title }}</span>
                  <span class="badge-none" *ngIf="!page.pageCategory">Standalone</span>
                </td>
                <td>
                  <span class="indicator" [class.on]="page.showInMainMenu" [class.off]="!page.showInMainMenu">
                    {{ page.showInMainMenu ? 'Yes' : 'No' }}
                  </span>
                </td>
                <td>
                  <span class="indicator" [class.on]="page.showInFooter" [class.off]="!page.showInFooter">
                    {{ page.showInFooter ? 'Yes' : 'No' }}
                  </span>
                </td>
                <td>
                  <span class="views-pill">{{ page.viewCount || 0 }} views</span>
                </td>
                <td>
                  <span class="status-pill" [class.published]="page.publish" [class.draft]="!page.publish">
                    {{ page.publish ? 'Published' : 'Draft' }}
                  </span>
                </td>
                <td>
                  <div class="action-buttons">
                    <button type="button" (click)="openEditModal(page)" class="btn-action btn-edit" title="Quick Edit Page & Navigation">
                      <span class="material-symbols-outlined">edit</span>
                      <span>Edit</span>
                    </button>
                    <a [routerLink]="['/admin/content/pages/details', page.id]" class="btn-action btn-details" title="View details & page sections">
                      <span class="material-symbols-outlined">layers</span>
                      <span>Sections</span>
                    </a>
                    <a [routerLink]="['/admin/content/pages/edit', page.id]" class="btn-action btn-tune" title="Full Page Settings & SEO">
                      <span class="material-symbols-outlined">tune</span>
                    </a>
                    <button type="button" (click)="deletePage(page)" class="btn-action btn-delete" title="Delete web page">
                      <span class="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="filteredPages.length === 0">
                <td colspan="9" class="empty-cell">
                  <div class="empty-state">
                    <span class="material-symbols-outlined">description</span>
                    <p>No web pages match your criteria. Click "New Web Page" to create one.</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Create Web Page Modal (Safe Backdrop: clicks outside DO NOT close) -->
      <div class="modal-backdrop" *ngIf="showCreateModal">
        <div class="modal-card modal-lg">
          <div class="modal-header">
            <div class="modal-title-group">
              <span class="material-symbols-outlined text-blue">add_circle</span>
              <h3>Create Dynamic Web Page</h3>
            </div>
            <button type="button" class="btn-close" (click)="closeCreateModal()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>PAGE TITLE *</label>
              <input type="text" [(ngModel)]="newPage.title" (input)="onTitleChange()" class="form-control" placeholder="e.g. About Us, Mission & Vision, Volunteer">
            </div>

            <div class="form-row">
              <div class="form-group flex-1">
                <label>CUSTOM URL SLUG (OPTIONAL - AUTO-GENERATED IF EMPTY)</label>
                <input type="text" [(ngModel)]="newPage.slug" (input)="onSlugChange()" class="form-control" placeholder="e.g. about-us">
                <small class="help-text">Unique URL path. Duplicate slugs will automatically append numbers (-2, -3).</small>
              </div>
              <div class="form-group flex-1">
                <label>DROPDOWN MENU CATEGORY</label>
                <select [(ngModel)]="newPage.pageCategoryId" class="form-control">
                  <option [ngValue]="null">Standalone (No Category)</option>
                  <option *ngFor="let cat of categories" [ngValue]="cat.id">{{ cat.title }}</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group flex-1">
                <label>MENU ZONE POSITION *</label>
                <select [(ngModel)]="newPage.menuPosition" class="form-control">
                  <option [ngValue]="1">First Zone (NavItems="first")</option>
                  <option [ngValue]="2">Middle Zone (NavItems="middle")</option>
                  <option [ngValue]="3">Last Zone (NavItems="last")</option>
                  <option [ngValue]="4">Top Utility Bar (MainMenuItems="top")</option>
                </select>
              </div>
              <div class="form-group flex-1">
                <label>SORT ORDER</label>
                <input type="number" [(ngModel)]="newPage.sortOrder" class="form-control" placeholder="0">
              </div>
              <div class="form-group flex-1">
                <label>CUSTOM CSS CLASS</label>
                <input type="text" [(ngModel)]="newPage.customClass" class="form-control" placeholder="e.g. nav-highlight">
              </div>
            </div>

            <div class="checkbox-row">
              <label class="checkbox-item">
                <input type="checkbox" [(ngModel)]="newPage.showInMainMenu">
                <span>Show in Top Header Menu</span>
              </label>
              <label class="checkbox-item">
                <input type="checkbox" [(ngModel)]="newPage.isMenuCTA">
                <span>Highlight as Header Action Button (CTA)</span>
              </label>
              <label class="checkbox-item">
                <input type="checkbox" [(ngModel)]="newPage.showInFooter">
                <span>Show in Footer</span>
              </label>
              <label class="checkbox-item">
                <input type="checkbox" [(ngModel)]="newPage.publish">
                <span>Publish Immediately</span>
              </label>
              <label class="checkbox-item">
                <input type="checkbox" [(ngModel)]="newPage.securityPage">
                <span>Require Login (Protected)</span>
              </label>
            </div>

            <div class="error-box" *ngIf="errorMessage">{{ errorMessage }}</div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" (click)="closeCreateModal()">Cancel</button>
            <button type="button" class="btn btn-primary" (click)="saveNewPage()" [disabled]="saving">
              <span *ngIf="!saving">Save & Create Page</span>
              <span *ngIf="saving">Saving...</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Edit Web Page Modal (Safe Backdrop: clicks outside DO NOT close) -->
      <div class="modal-backdrop" *ngIf="showEditModal && editingPage">
        <div class="modal-card modal-lg">
          <div class="modal-header">
            <div class="modal-title-group">
              <span class="material-symbols-outlined text-blue">edit_note</span>
              <h3>Edit Web Page: {{ editingPage.title }}</h3>
            </div>
            <button type="button" class="btn-close" (click)="closeEditModal()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>PAGE TITLE *</label>
              <input type="text" [(ngModel)]="editingPage.title" class="form-control" placeholder="e.g. About Us">
            </div>

            <div class="form-row">
              <div class="form-group flex-1">
                <label>DIRECT URL SLUG *</label>
                <input type="text" [(ngModel)]="editingPage.directUrl" class="form-control" placeholder="e.g. about-us">
                <small class="help-text">Unique URL path for this page.</small>
              </div>
              <div class="form-group flex-1">
                <label>DROPDOWN MENU CATEGORY</label>
                <select [(ngModel)]="editingPage.pageCategoryId" class="form-control">
                  <option [ngValue]="null">Standalone (No Category)</option>
                  <option *ngFor="let cat of categories" [ngValue]="cat.id">{{ cat.title }}</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group flex-1">
                <label>MENU ZONE POSITION *</label>
                <select [(ngModel)]="editingPage.menuPosition" class="form-control">
                  <option [ngValue]="1">First Zone (NavItems="first")</option>
                  <option [ngValue]="2">Middle Zone (NavItems="middle")</option>
                  <option [ngValue]="3">Last Zone (NavItems="last")</option>
                  <option [ngValue]="4">Top Utility Bar (MainMenuItems="top")</option>
                </select>
              </div>
              <div class="form-group flex-1">
                <label>SORT ORDER</label>
                <input type="number" [(ngModel)]="editingPage.sortOrder" class="form-control" placeholder="0">
              </div>
              <div class="form-group flex-1">
                <label>CUSTOM CSS CLASS</label>
                <input type="text" [(ngModel)]="editingPage.customClass" class="form-control" placeholder="e.g. nav-highlight">
              </div>
            </div>

            <div class="checkbox-row">
              <label class="checkbox-item">
                <input type="checkbox" [(ngModel)]="editingPage.showInMainMenu">
                <span>Show in Top Header Menu</span>
              </label>
              <label class="checkbox-item">
                <input type="checkbox" [(ngModel)]="editingPage.isMenuCTA">
                <span>Highlight as Header Action Button (CTA)</span>
              </label>
              <label class="checkbox-item">
                <input type="checkbox" [(ngModel)]="editingPage.showInFooter">
                <span>Show in Footer</span>
              </label>
              <label class="checkbox-item">
                <input type="checkbox" [(ngModel)]="editingPage.publish">
                <span>Published</span>
              </label>
              <label class="checkbox-item">
                <input type="checkbox" [(ngModel)]="editingPage.securityPage">
                <span>Require Login (Protected)</span>
              </label>
            </div>

            <div class="error-box" *ngIf="editErrorMessage">{{ editErrorMessage }}</div>
          </div>
          <div class="modal-footer">
            <a [routerLink]="['/admin/content/pages/edit', editingPage.id]" (click)="closeEditModal()" class="btn btn-outline" style="margin-right: auto;">
              <span class="material-symbols-outlined">tune</span>
              <span>Advanced SEO & Banners</span>
            </a>
            <button type="button" class="btn btn-outline" (click)="closeEditModal()">Cancel</button>
            <button type="button" class="btn btn-primary" (click)="saveEditPage()" [disabled]="editSaving">
              <span *ngIf="!editSaving">Save Changes</span>
              <span *ngIf="editSaving">Saving...</span>
            </button>
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
    .page-header h1 { font-size: 26px; font-weight: 800; color: #0f172a; margin: 0 0 4px; }
    .subtitle { color: #64748b; font-size: 14px; margin: 0; }
    .header-actions { display: flex; gap: 12px; }

    .btn {
      display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px;
      border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; text-decoration: none;
    }
    .btn-primary { background: #0050e5; color: #fff; border: none; }
    .btn-outline { background: transparent; border: 1px solid #cbd5e1; color: #334155; }

    .cms-nav-tabs {
      display: flex; gap: 8px; background: #fff; padding: 8px 12px;
      border-radius: 12px; border: 1px solid #e2e8f0; overflow-x: auto;
    }
    .nav-tab {
      display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px;
      border-radius: 8px; font-size: 13px; font-weight: 600; color: #64748b; text-decoration: none;
    }
    .nav-tab.active { background: #0050e5; color: #fff; }
    .tab-badge { background: rgba(0,0,0,0.08); padding: 2px 8px; border-radius: 12px; font-size: 11px; }
    .nav-tab.active .tab-badge { background: rgba(255,255,255,0.25); color: #fff; }

    .filter-bar {
      display: flex; justify-content: space-between; align-items: center; gap: 16px;
      background: #fff; padding: 12px 18px; border-radius: 12px; border: 1px solid #e2e8f0;
    }
    .filter-group { display: flex; gap: 8px; }
    .filter-btn {
      border: none; background: transparent; padding: 6px 14px; border-radius: 8px;
      font-size: 13px; font-weight: 600; color: #64748b; cursor: pointer;
    }
    .filter-btn.active { background: #eff6ff; color: #0050e5; }
    .search-box {
      display: flex; align-items: center; gap: 8px; background: #f8fafc;
      padding: 6px 14px; border-radius: 8px; border: 1px solid #e2e8f0; width: 260px;
    }
    .search-box input { border: none; background: transparent; font-size: 13px; outline: none; width: 100%; }

    .cms-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; }
    .cms-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .cms-table th {
      text-align: left; padding: 12px; background: #f8fafc; color: #64748b;
      font-weight: 700; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-transform: uppercase;
    }
    .cms-table td { padding: 14px 12px; border-bottom: 1px solid #f1f5f9; }
    
    .page-title-cell { display: flex; flex-direction: column; gap: 4px; }
    .security-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; color: #dc2626; font-weight: 700; }
    .security-badge span { font-size: 14px; }
    .slug-link { display: inline-flex; align-items: center; gap: 4px; text-decoration: none; color: #0050e5; }
    .slug-link:hover code { text-decoration: underline; }
    .open-icon { font-size: 14px; }

    .badge-cat { background: #eff6ff; color: #0050e5; padding: 3px 8px; border-radius: 6px; font-weight: 700; font-size: 11px; }
    .badge-none { color: #94a3b8; font-size: 11px; }
    .indicator { font-size: 12px; font-weight: 700; }
    .indicator.on { color: #16a34a; }
    .indicator.off { color: #94a3b8; }
    .views-pill { background: #f8fafc; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; color: #475569; }

    .status-pill { padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; }
    .status-pill.published { background: #dcfce7; color: #15803d; }
    .status-pill.draft { background: #fef3c7; color: #b45309; }

    .action-buttons { display: flex; gap: 6px; align-items: center; }
    .btn-action {
      display: inline-flex; align-items: center; gap: 4px; padding: 6px 10px;
      border-radius: 6px; font-size: 12px; font-weight: 600; text-decoration: none; cursor: pointer; border: none;
    }
    .btn-details { background: #f1f5f9; color: #334155; }
    .btn-details:hover { background: #e2e8f0; color: #0f172a; }
    .btn-tune { background: #f8fafc; color: #64748b; border: 1px solid #e2e8f0; }
    .btn-tune:hover { background: #e2e8f0; color: #0f172a; }
    .btn-edit { background: #eff6ff; color: #0050e5; }
    .btn-edit:hover { background: #0050e5; color: #fff; }
    .btn-delete { background: #fee2e2; color: #dc2626; }
    .btn-delete:hover { background: #dc2626; color: #fff; }

    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center; z-index: 2000;
    }
    .modal-card {
      background: #fff; border-radius: 16px; width: 100%; max-width: 540px;
      box-shadow: 0 25px 60px rgba(0,0,0,0.3); overflow: hidden;
    }
    .modal-lg { max-width: 620px; }
    .modal-header {
      padding: 18px 24px; display: flex; justify-content: space-between; align-items: center;
      border-bottom: 1px solid #e2e8f0;
    }
    .modal-title-group { display: flex; align-items: center; gap: 10px; }
    .modal-title-group h3 { margin: 0; font-size: 18px; font-weight: 800; }
    .btn-close { background: none; border: none; font-size: 20px; cursor: pointer; color: #64748b; }
    .modal-body { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
    .modal-footer { padding: 16px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 10px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group label { font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; }
    .form-control { padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; }
    .form-row { display: flex; gap: 12px; }
    .checkbox-row { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; background: #f8fafc; padding: 14px; border-radius: 10px; border: 1px solid #e2e8f0; }
    .checkbox-item { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: #334155; cursor: pointer; }
    .help-text { font-size: 11px; color: #64748b; }
    .error-box { background: #fee2e2; color: #991b1b; padding: 10px; border-radius: 8px; font-size: 12px; font-weight: 600; }
    .zone-badge { padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    .zone-badge.zone-first { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
    .zone-badge.zone-middle { background: #f5f3ff; color: #6d28d9; border: 1px solid #ddd6fe; }
    .zone-badge.zone-last { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
    .zone-badge.zone-top { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
    .cta-pill { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #fff; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 700; letter-spacing: 0.4px; }
    .empty-cell { padding: 40px; text-align: center; color: #64748b; }
    .empty-state { display: flex; flex-direction: column; align-items: center; gap: 8px; }
    .empty-state span { font-size: 36px; color: #cbd5e1; }
  `]
})
export class WebPagesComponent implements OnInit {
  loading = false;
  saving = false;
  pages: any[] = [];
  categories: any[] = [];
  searchTerm = '';
  filterStatus = 'all';

  // Modal State - Create
  showCreateModal = false;
  errorMessage = '';
  isSlugManuallyEdited = false;
  newPage = {
    title: '',
    slug: '',
    pageCategoryId: null,
    menuPosition: 1,
    sortOrder: 0,
    customClass: '',
    showInMainMenu: true,
    isMenuCTA: false,
    showInFooter: true,
    publish: true,
    securityPage: false
  };

  // Modal State - Edit
  showEditModal = false;
  editSaving = false;
  editErrorMessage = '';
  editingPage: any = null;

  constructor(
    private api: ApiService,
    private router: Router,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.loadAll();
  }

  getZoneLabel(pos: number | string): string {
    const p = Number(pos) || 1;
    switch (p) {
      case 1: return '1. First Zone';
      case 2: return '2. Middle Zone';
      case 3: return '3. Last Zone';
      case 4: return 'Top Utility';
      default: return '1. First Zone';
    }
  }

  getZoneClass(pos: number | string): string {
    const p = Number(pos) || 1;
    switch (p) {
      case 1: return 'zone-first';
      case 2: return 'zone-middle';
      case 3: return 'zone-last';
      case 4: return 'zone-top';
      default: return 'zone-first';
    }
  }

  loadAll(): void {
    this.loading = true;
    this.api.get<any>('ContentApi/pages').subscribe({
      next: (res) => {
        this.pages = res?.data || [];
        this.loadCategories();
      },
      error: (err) => {
        this.loading = false;
        this.toast.error(err?.error?.message || 'Failed to load web pages.');
      }
    });
  }

  loadCategories(): void {
    this.api.get<any>('ContentApi/categories').subscribe({
      next: (res) => {
        this.categories = res?.data || [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  get publishedCount(): number {
    return this.pages.filter(p => p.publish).length;
  }

  get draftCount(): number {
    return this.pages.filter(p => !p.publish).length;
  }

  get filteredPages(): any[] {
    let list = this.pages;
    if (this.filterStatus === 'published') list = list.filter(p => p.publish);
    else if (this.filterStatus === 'draft') list = list.filter(p => !p.publish);

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      list = list.filter(p => p.title?.toLowerCase().includes(term) || p.directUrl?.toLowerCase().includes(term));
    }
    return list;
  }

  slugify(text: string): string {
    return (text || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }

  onTitleChange(): void {
    if (!this.isSlugManuallyEdited) {
      this.newPage.slug = this.slugify(this.newPage.title);
    }
  }

  onSlugChange(): void {
    this.isSlugManuallyEdited = true;
  }

  openCreateModal(): void {
    this.isSlugManuallyEdited = false;
    this.newPage = {
      title: '',
      slug: '',
      pageCategoryId: null,
      menuPosition: 1,
      sortOrder: this.pages.length + 1,
      customClass: '',
      showInMainMenu: true,
      isMenuCTA: false,
      showInFooter: true,
      publish: true,
      securityPage: false
    };
    this.errorMessage = '';
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
  }

  saveNewPage(): void {
    if (!this.newPage.title.trim()) {
      this.errorMessage = 'Page Title is required.';
      return;
    }

    if (!this.newPage.slug || !this.newPage.slug.trim()) {
      this.newPage.slug = this.slugify(this.newPage.title);
    }

    this.saving = true;
    this.errorMessage = '';

    this.api.post<any>('ContentApi/pages', this.newPage).subscribe({
      next: () => {
        this.saving = false;
        this.showCreateModal = false;
        this.toast.success('Web page created successfully!');
        this.loadAll();
      },
      error: (err) => {
        this.saving = false;
        this.errorMessage = err?.error?.message || 'Failed to create web page.';
      }
    });
  }

  openEditModal(page: any): void {
    this.editingPage = {
      id: page.id,
      title: page.title || '',
      directUrl: page.directUrl || '',
      pageCategoryId: page.pageCategoryId || null,
      menuPosition: page.menuPosition ? Number(page.menuPosition) : 1,
      sortOrder: page.sortOrder || 0,
      customClass: page.customClass || '',
      showInMainMenu: page.showInMainMenu !== false,
      isMenuCTA: page.isMenuCTA === true,
      showInFooter: page.showInFooter !== false,
      publish: page.publish !== false,
      securityPage: page.securityPage === true,
      // preserve existing properties
      imageUrl: page.imageUrl,
      imageKey: page.imageKey,
      metaTitle: page.metaTitle,
      metaDescription: page.metaDescription,
      metaKeywords: page.metaKeywords,
      mainPageId: page.mainPageId,
      isLegal: page.isLegal,
      showInMenuDropDown: page.showInMenuDropDown,
      tags: page.tags
    };
    this.editErrorMessage = '';
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.editingPage = null;
  }

  saveEditPage(): void {
    if (!this.editingPage || !this.editingPage.title.trim()) {
      this.editErrorMessage = 'Page Title is required.';
      return;
    }

    if (!this.editingPage.directUrl || !this.editingPage.directUrl.trim()) {
      this.editingPage.directUrl = this.slugify(this.editingPage.title);
    }

    this.editSaving = true;
    this.editErrorMessage = '';

    this.api.put<any>(`ContentApi/pages/${this.editingPage.id}`, this.editingPage).subscribe({
      next: () => {
        this.editSaving = false;
        this.showEditModal = false;
        this.editingPage = null;
        this.toast.success('Web page updated successfully!');
        this.loadAll();
      },
      error: (err) => {
        this.editSaving = false;
        this.editErrorMessage = err?.error?.message || 'Failed to update web page.';
      }
    });
  }

  async deletePage(page: any): Promise<void> {
    const confirmed = await this.toast.confirm(
      'Delete Web Page',
      `You are about to permanently delete web page "${page.title}".`,
      'Delete Page',
      'Cancel',
      'danger',
      page.title,
      [
        'All sections, custom layout widgets, and lists on this page will be deleted.',
        'The public URL route will immediately return 404 Not Found.'
      ]
    );

    if (confirmed) {
      this.api.delete<any>(`ContentApi/pages/${page.id}`).subscribe({
        next: () => {
          this.toast.success(`Page "${page.title}" deleted successfully.`);
          this.loadAll();
        },
        error: (err) => {
          this.toast.error(err?.error?.message || 'Failed to delete web page.');
        }
      });
    }
  }
}
