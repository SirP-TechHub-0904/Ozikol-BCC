import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-page-sections',
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
            <span class="current">Page Section Templates</span>
          </div>
          <h1>All Page Layout Sections &amp; Sub-Items</h1>
          <p class="subtitle">Global overview of all layout blocks, feature grids, hero banners, and child card items across all web pages.</p>
        </div>
        <div class="header-actions">
          <button type="button" class="btn btn-primary" (click)="openCreateModal()">
            <span class="material-symbols-outlined">add_circle</span>
            <span>New Section</span>
          </button>
          <button type="button" (click)="loadSections()" class="btn btn-outline" [disabled]="loading">
            <span class="material-symbols-outlined" [class.spin]="loading">refresh</span>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <!-- Navigation Tabs (Sections vs All Sub-Items) -->
      <div class="cms-nav-tabs">
        <button
          type="button"
          class="nav-tab"
          [class.active]="activeTab === 'sections'"
          (click)="activeTab = 'sections'"
        >
          <span class="material-symbols-outlined fs-5">view_quilt</span>
          <span>All Page Sections</span>
          <span class="tab-badge">{{ sections.length }}</span>
        </button>
        <button
          type="button"
          class="nav-tab"
          [class.active]="activeTab === 'subitems'"
          (click)="activeTab = 'subitems'"
        >
          <span class="material-symbols-outlined fs-5">list</span>
          <span>All Repeating Sub-Items &amp; Cards</span>
          <span class="tab-badge">{{ allSubItems.length }}</span>
        </button>
      </div>

      <!-- Search & Page Filter -->
      <div class="filter-bar">
        <div class="filter-group">
          <select [(ngModel)]="filterPageId" class="filter-select">
            <option value="">All Web Pages (Global View)</option>
            <option *ngFor="let p of allPages" [value]="p.id">{{ p.title }} (/{{ p.directUrl || 'page' }})</option>
          </select>

          <div class="search-box">
            <span class="material-symbols-outlined">search</span>
            <input
              type="text"
              [(ngModel)]="searchTerm"
              [placeholder]="activeTab === 'sections' ? 'Search sections by title, page, template...' : 'Search sub-items, cards, buttons...'"
            >
          </div>
        </div>
      </div>

      <!-- TAB 1: ALL SECTIONS TABLE -->
      <div class="cms-card" *ngIf="activeTab === 'sections'">
        <div class="table-responsive">
          <table class="cms-table">
            <thead>
              <tr>
                <th>SECTION TITLE</th>
                <th>PARENT PAGE</th>
                <th>TEMPLATE KEY</th>
                <th>SUB-ITEMS</th>
                <th>HOME VISIBLE</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let sec of filteredSections">
                <td>
                  <strong>{{ sec.title || '(Untitled Section)' }}</strong>
                  <div class="sub-text" *ngIf="sec.miniTitle">{{ sec.miniTitle }}</div>
                </td>
                <td>
                  <span class="page-pill" *ngIf="sec.webPage">
                    <span class="material-symbols-outlined fs-6">web</span>
                    {{ sec.webPage.title }}
                  </span>
                  <span class="page-pill global" *ngIf="!sec.webPage">
                    <span class="material-symbols-outlined fs-6">public</span>
                    Standalone / Global
                  </span>
                </td>
                <td><code>{{ sec.templateKey || 'default-block' }}</code></td>
                <td>
                  <span class="subitems-badge">{{ sec.pageSectionLists?.length || 0 }} Items</span>
                </td>
                <td>
                  <span class="indicator" [class.on]="sec.showInHome" [class.off]="!sec.showInHome">
                    {{ sec.showInHome ? 'Yes' : 'No' }}
                  </span>
                </td>
                <td>
                  <span class="status-pill" [class.published]="!sec.disable" [class.draft]="sec.disable">
                    {{ !sec.disable ? 'Active' : 'Disabled' }}
                  </span>
                </td>
                <td>
                  <div class="action-buttons">
                    <a [routerLink]="['/content/console/sections/details', sec.id]" class="btn-action btn-details" title="Manage sub-items">
                      <span class="material-symbols-outlined">list</span>
                      <span>Sub-Items</span>
                    </a>
                    <a [routerLink]="['/content/console/sections/edit', sec.id]" class="btn-action btn-edit" title="Edit section">
                      <span class="material-symbols-outlined">edit</span>
                      <span>Edit</span>
                    </a>
                    <a [routerLink]="['/content/console/sections/delete', sec.id]" [queryParams]="{ returnUrl: getSectionDeleteReturnUrl(sec) }" class="btn-action btn-delete" title="Delete Section">
                      <span class="material-symbols-outlined">delete</span>
                    </a>
                  </div>
                </td>
              </tr>
              <tr *ngIf="filteredSections.length === 0">
                <td colspan="7" class="empty-cell">No sections found matching your filter criteria.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- TAB 2: ALL SUB-ITEMS & CARDS TABLE -->
      <div class="cms-card" *ngIf="activeTab === 'subitems'">
        <div class="table-responsive">
          <table class="cms-table">
            <thead>
              <tr>
                <th>SUB-ITEM / CARD TITLE</th>
                <th>PARENT SECTION</th>
                <th>PARENT PAGE</th>
                <th>BUTTON / DESTINATION</th>
                <th>SORT ORDER</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of filteredSubItems">
                <td>
                  <strong>{{ item.title || '(Untitled Item)' }}</strong>
                  <div class="sub-text" *ngIf="item.miniTitle">{{ item.miniTitle }}</div>
                </td>
                <td>
                  <div class="d-flex align-items-center gap-1">
                    <span class="material-symbols-outlined text-muted fs-6">layers</span>
                    <strong class="text-dark">{{ item.pageSection?.title || 'Unknown Section' }}</strong>
                  </div>
                </td>
                <td>
                  <span class="page-pill" *ngIf="item.pageSection?.webPage">
                    <span class="material-symbols-outlined fs-6">web</span>
                    {{ item.pageSection.webPage.title }}
                  </span>
                  <span class="page-pill global" *ngIf="!item.pageSection?.webPage">
                    <span class="material-symbols-outlined fs-6">public</span>
                    Standalone / Global
                  </span>
                </td>
                <td>
                  <span class="btn-preview-tag" *ngIf="item.buttonText">{{ item.buttonText }}</span>
                  <code class="small text-muted" *ngIf="item.buttonLink"> &rarr; {{ item.buttonLink }}</code>
                  <span class="badge-none" *ngIf="!item.buttonText &amp;&amp; !item.buttonLink">-</span>
                </td>
                <td><code>#{{ item.sortOrder || 0 }}</code></td>
                <td>
                  <span class="status-pill" [class.published]="!item.disable" [class.draft]="item.disable">
                    {{ !item.disable ? 'Active' : 'Disabled' }}
                  </span>
                </td>
                <td>
                  <div class="action-buttons">
                    <a [routerLink]="['/content/console/sections/lists/edit', item.id]" class="btn-action btn-edit" title="Edit sub-item">
                      <span class="material-symbols-outlined">edit</span>
                      <span>Edit</span>
                    </a>
                    <a [routerLink]="['/content/console/sections/lists/delete', item.id]" [queryParams]="{ returnUrl: getSubItemDeleteReturnUrl(item) }" class="btn-action btn-delete" title="Delete Item">
                      <span class="material-symbols-outlined">delete</span>
                    </a>
                  </div>
                </td>
              </tr>
              <tr *ngIf="filteredSubItems.length === 0">
                <td colspan="7" class="empty-cell">No repeating sub-items found matching your filter criteria.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Create Section Modal -->
      <div class="modal-backdrop" *ngIf="showCreateModal">
        <div class="modal-card modal-lg">
          <div class="modal-header">
            <div class="modal-title-group">
              <span class="material-symbols-outlined text-blue">view_quilt</span>
              <h3>Create Page Section Template</h3>
            </div>
            <button type="button" class="btn-close" (click)="closeCreateModal()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>SECTION MAIN TITLE *</label>
              <input type="text" [(ngModel)]="newSection.title" class="form-control" placeholder="e.g. Services, About Section, Core Pillars">
            </div>

            <div class="form-row">
              <div class="form-group flex-1">
                <label>MINI TITLE (SUB-TAG)</label>
                <input type="text" [(ngModel)]="newSection.miniTitle" class="form-control" placeholder="WHAT WE OFFER">
              </div>
              <div class="form-group flex-1">
                <label>TEMPLATE KEY</label>
                <input type="text" [(ngModel)]="newSection.templateKey" class="form-control" placeholder="services-grid, feature-callout">
              </div>
            </div>

            <div class="form-group">
              <label>SHORT DESCRIPTION</label>
              <textarea rows="2" [(ngModel)]="newSection.description" class="form-control" placeholder="Brief section intro..."></textarea>
            </div>

            <div class="form-row">
              <div class="form-group flex-1">
                <label>PAGE SORT ORDER</label>
                <input type="number" [(ngModel)]="newSection.pageSortOrder" class="form-control">
              </div>
              <div class="form-group flex-1">
                <label>ATTACH TO WEB PAGE</label>
                <select [(ngModel)]="newSection.webPageId" class="form-control">
                  <option [ngValue]="null">Standalone (Global / All Pages)</option>
                  <option *ngFor="let p of allPages" [ngValue]="p.id">{{ p.title }} ({{ p.directUrl || 'page' }})</option>
                </select>
              </div>
            </div>

            <div class="error-box" *ngIf="errorMessage">{{ errorMessage }}</div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" (click)="closeCreateModal()">Cancel</button>
            <button type="button" class="btn btn-primary" (click)="saveNewSection()" [disabled]="saving">
              <span *ngIf="!saving">Save &amp; Create Section</span>
              <span *ngIf="saving">Saving...</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .cms-page-container { display: flex; flex-direction: column; gap: 20px; }
    .page-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      background: #fff; padding: 24px 28px; border-radius: 16px; border: 1px solid #e2e8f0;
    }
    .breadcrumb { font-size: 13px; color: #64748b; margin-bottom: 6px; }
    .breadcrumb a { color: #0050e5; text-decoration: none; font-weight: 600; }
    .page-header h1 { font-size: 24px; font-weight: 800; color: #0f172a; margin: 0 0 4px; }
    .subtitle { color: #64748b; font-size: 13.5px; margin: 0; }
    .header-actions { display: flex; gap: 12px; }

    .btn {
      display: inline-flex; align-items: center; gap: 8px; padding: 9px 16px;
      border-radius: 9px; font-size: 13px; font-weight: 600; cursor: pointer; text-decoration: none;
    }
    .btn-primary { background: #0050e5; color: #fff; border: none; }
    .btn-outline { background: transparent; border: 1px solid #cbd5e1; color: #334155; }

    .cms-nav-tabs {
      display: flex; gap: 10px; background: #fff; padding: 8px 12px;
      border-radius: 12px; border: 1px solid #e2e8f0;
    }
    .nav-tab {
      display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px;
      border-radius: 8px; font-size: 13.5px; font-weight: 700; color: #64748b;
      background: transparent; border: none; cursor: pointer; transition: all 0.2s ease;
    }
    .nav-tab.active { background: #0050e5; color: #fff; }
    .tab-badge {
      background: #f1f5f9; color: #475569; padding: 2px 8px;
      border-radius: 12px; font-size: 11px; font-weight: 800;
    }
    .nav-tab.active .tab-badge { background: rgba(255, 255, 255, 0.25); color: #fff; }

    .filter-bar {
      display: flex; justify-content: flex-end; background: #fff; padding: 12px 18px;
      border-radius: 12px; border: 1px solid #e2e8f0;
    }
    .filter-group { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .filter-select {
      padding: 8px 14px; border-radius: 8px; border: 1px solid #cbd5e1;
      font-size: 13px; background: #fff; color: #334155; outline: none; font-weight: 600;
    }
    .search-box {
      display: flex; align-items: center; gap: 8px; background: #f8fafc;
      padding: 6px 14px; border-radius: 8px; border: 1px solid #e2e8f0; width: 340px;
    }
    .search-box input { border: none; background: transparent; font-size: 13px; outline: none; width: 100%; }

    .cms-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; }
    .cms-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .cms-table th {
      text-align: left; padding: 12px; background: #f8fafc; color: #64748b;
      font-weight: 700; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-transform: uppercase;
    }
    .cms-table td { padding: 14px 12px; border-bottom: 1px solid #f1f5f9; }

    .sub-text { font-size: 11px; color: #64748b; }
    .page-pill {
      display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px;
      border-radius: 6px; font-size: 12px; font-weight: 700;
      background: #eff6ff; color: #0050e5; border: 1px solid #bfdbfe;
    }
    .page-pill.global { background: #f8fafc; color: #64748b; border-color: #cbd5e1; }
    .btn-preview-tag { background: #f1f5f9; color: #0f172a; padding: 2px 6px; border-radius: 4px; font-size: 11.5px; font-weight: 700; }
    .badge-none { color: #94a3b8; font-size: 12px; }

    .subitems-badge { background: #eff6ff; color: #0050e5; padding: 4px 8px; border-radius: 6px; font-weight: 700; font-size: 11px; }
    .indicator { font-size: 12px; font-weight: 700; }
    .indicator.on { color: #16a34a; }
    .indicator.off { color: #94a3b8; }
    .status-pill { padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; }
    .status-pill.published { background: #dcfce7; color: #15803d; }
    .status-pill.draft { background: #fee2e2; color: #dc2626; }

    .action-buttons { display: flex; gap: 6px; align-items: center; }
    .btn-action {
      display: inline-flex; align-items: center; gap: 4px; padding: 6px 10px;
      border-radius: 6px; font-size: 12px; font-weight: 600; text-decoration: none; cursor: pointer; border: none;
    }
    .btn-details { background: #f1f5f9; color: #334155; }
    .btn-details:hover { background: #e2e8f0; color: #0f172a; }
    .btn-edit { background: #eff6ff; color: #0050e5; }
    .btn-edit:hover { background: #0050e5; color: #fff; }
    .btn-delete { background: #fee2e2; color: #dc2626; }
    .btn-delete:hover { background: #dc2626; color: #fff; }
    .empty-cell { text-align: center; color: #64748b; padding: 32px !important; font-size: 13.5px; }

    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center; z-index: 2000;
    }
    .modal-card {
      background: #fff; border-radius: 16px; width: 100%; max-width: 600px;
      box-shadow: 0 25px 60px rgba(0,0,0,0.3); overflow: hidden;
    }
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
    .error-box { background: #fee2e2; color: #991b1b; padding: 10px; border-radius: 8px; font-size: 12px; font-weight: 600; }
  `]
})
export class PageSectionsComponent implements OnInit {
  loading = false;
  saving = false;
  activeTab: 'sections' | 'subitems' = 'sections';
  sections: any[] = [];
  allSubItems: any[] = [];
  allPages: any[] = [];
  searchTerm = '';
  filterPageId = '';

  showCreateModal = false;
  errorMessage = '';
  newSection: any = {};

  constructor(
    private api: ApiService,
    private toast: ToastService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const pageId = params.get('webPageId') || params.get('pageId');
      if (pageId) {
        this.filterPageId = pageId;
      }
    });
    this.loadSections();
  }

  loadSections(): void {
    this.loading = true;
    this.api.get<any>('ContentApi/sections').subscribe({
      next: (res) => {
        this.sections = res?.data || [];
        this.loadPages();
        this.loadSubItems();
      },
      error: (err) => {
        this.loading = false;
        this.toast.error(err?.error?.message || 'Failed to load layout sections.');
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

  loadSubItems(): void {
    this.api.get<any>('ContentApi/section-lists').subscribe({
      next: (res) => {
        this.allSubItems = res?.data || [];
      },
      error: () => {}
    });
  }

  get filteredSections(): any[] {
    let list = this.sections;
    if (this.filterPageId) {
      list = list.filter(s => s.webPageId === this.filterPageId);
    }
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      list = list.filter(s =>
        s.title?.toLowerCase().includes(term) ||
        s.templateKey?.toLowerCase().includes(term) ||
        s.webPage?.title?.toLowerCase().includes(term)
      );
    }
    return list;
  }

  get filteredSubItems(): any[] {
    let list = this.allSubItems;
    if (this.filterPageId) {
      list = list.filter(item => item.pageSection?.webPageId === this.filterPageId);
    }
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      list = list.filter(item =>
        item.title?.toLowerCase().includes(term) ||
        item.miniTitle?.toLowerCase().includes(term) ||
        item.buttonText?.toLowerCase().includes(term) ||
        item.buttonLink?.toLowerCase().includes(term) ||
        item.pageSection?.title?.toLowerCase().includes(term) ||
        item.pageSection?.webPage?.title?.toLowerCase().includes(term)
      );
    }
    return list;
  }

  openCreateModal(): void {
    this.newSection = {
      title: '',
      miniTitle: '',
      templateKey: 'feature-block',
      description: '',
      pageSortOrder: this.sections.length + 1,
      showInHome: true,
      webPageId: null
    };
    this.errorMessage = '';
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
  }

  saveNewSection(): void {
    if (!this.newSection.title?.trim()) {
      this.errorMessage = 'Section Title is required.';
      return;
    }

    this.saving = true;
    this.errorMessage = '';

    this.api.post<any>('ContentApi/sections', this.newSection).subscribe({
      next: () => {
        this.saving = false;
        this.showCreateModal = false;
        this.toast.success('Layout section created successfully!');
        this.loadSections();
      },
      error: (err) => {
        this.saving = false;
        this.errorMessage = err?.error?.message || 'Failed to create section.';
      }
    });
  }

  getSectionDeleteReturnUrl(sec: any): string {
    const pageId = this.filterPageId || sec.webPageId;
    return pageId ? `/content/console/sections?webPageId=${pageId}` : '/content/console/sections';
  }

  getSubItemDeleteReturnUrl(item: any): string {
    const pageId = this.filterPageId || item.pageSection?.webPageId;
    return pageId ? `/content/console/sections?webPageId=${pageId}` : '/content/console/sections';
  }
}