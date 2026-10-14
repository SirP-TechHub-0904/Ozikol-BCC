import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';

/**
 * Web Navigation Categories management console.
 * Organizes site navigation into header dropdowns, top bar categories, and footer columns.
 * Action buttons navigate to dedicated full-width Create, Edit, and Delete pages.
 */
@Component({
  selector: 'app-web-categories',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="cms-page-container">
      <!-- Full-Width Page Header -->
      <div class="page-header">
        <div class="header-titles">
          <div class="breadcrumb">
            <a routerLink="/content/console">CMS Studio</a>
            <span class="sep">/</span>
            <span class="current">Web Categories (Menu Dropdowns)</span>
          </div>
          <h1>Web Menu Categories</h1>
          <p class="subtitle">Organize pages into hierarchical header dropdowns and website navigation groups.</p>
        </div>
        <div class="header-actions">
          <a routerLink="/content/console/categories/create" class="btn btn-primary">
            <span class="material-symbols-outlined">add_circle</span>
            <span>New Category</span>
          </a>
          <button type="button" (click)="loadCategories()" class="btn btn-outline" [disabled]="loading">
            <span class="material-symbols-outlined" [class.spin]="loading">refresh</span>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <!-- Categories Table Card (Full Width) -->
      <div class="cms-card full-width-card">
        <div class="card-header-bar">
          <div>
            <h3>Menu Navigation Categories</h3>
            <p class="card-sub">Categories manage navigation grouping and footer columns across your public website.</p>
          </div>
          <div class="search-box">
            <span class="material-symbols-outlined search-icon">search</span>
            <input 
              type="text" 
              [(ngModel)]="searchTerm" 
              (ngModelChange)="onSearchChange()"
              placeholder="Search categories..." 
              class="search-input">
          </div>
        </div>

        <div class="table-responsive">
          <table class="cms-table">
            <thead>
              <tr>
                <th>TITLE</th>
                <th>MENU ZONE</th>
                <th>ICON</th>
                <th>ORDER</th>
                <th>MAIN NAV</th>
                <th>FOOTER</th>
                <th>ATTACHED PAGES</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let cat of paginatedCategories">
                <td>
                  <strong class="cat-title">{{ cat.title }}</strong>
                  <div class="sub-text" *ngIf="cat.parent">Parent: {{ cat.parent.title }}</div>
                  <div class="sub-text" *ngIf="cat.customClass"><code>.{{ cat.customClass }}</code></div>
                </td>
                <td>
                  <span class="zone-badge" [ngClass]="getZoneClass(cat.menuPosition)">
                    {{ getZoneLabel(cat.menuPosition) }}
                  </span>
                </td>
                <td>
                  <span class="icon-chip"><i [class]="cat.icon || 'fa fa-folder'"></i> {{ cat.icon || '(None)' }}</span>
                </td>
                <td><strong>#{{ cat.menuSortOrder }}</strong></td>
                <td>
                  <span class="indicator" [class.on]="cat.showInMenu" [class.off]="!cat.showInMenu" [title]="'Menu Order: #' + (cat.menuSortOrder || 0)">
                    {{ cat.showInMenu ? ('#' + (cat.menuSortOrder || 0)) : 'No' }}
                  </span>
                </td>
                <td>
                  <span class="indicator" [class.on]="cat.showInFooter" [class.off]="!cat.showInFooter" [title]="'Footer Order: #' + (cat.footerSortOrder || 0)">
                    {{ cat.showInFooter ? ('#' + (cat.footerSortOrder || 0)) : 'No' }}
                  </span>
                </td>
                <td>
                  <span class="pages-badge" [class.has-pages]="cat.webPages && cat.webPages.length > 0">
                    {{ cat.webPages?.length || 0 }} WebPages
                  </span>
                </td>
                <td>
                  <span class="status-pill" [class.published]="cat.publish" [class.draft]="!cat.publish">
                    {{ cat.publish ? 'Published' : 'Hidden' }}
                  </span>
                </td>
                <td>
                  <div class="action-buttons">
                    <a [routerLink]="['/content/console/categories/edit', cat.id]" class="btn-action btn-edit" title="Edit Category">
                      <span class="material-symbols-outlined">edit</span>
                      <span>Edit</span>
                    </a>
                    <a [routerLink]="['/content/console/categories/delete', cat.id]" class="btn-action btn-delete" title="Delete Category">
                      <span class="material-symbols-outlined">delete</span>
                      <span>Delete</span>
                    </a>
                  </div>
                </td>
              </tr>
              <tr *ngIf="filteredCategories.length === 0">
                <td colspan="9" class="empty-cell">
                  <div class="empty-state">
                    <span class="material-symbols-outlined">folder_off</span>
                    <p>No categories found. Click "New Category" to create one.</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Built-in Pagination Footer -->
        <div class="pagination-footer" *ngIf="filteredCategories.length > 0">
          <div class="page-size-selector">
            <span>Show</span>
            <select [(ngModel)]="pageSize" (change)="onPageSizeChange()">
              <option [value]="10">10</option>
              <option [value]="25">25</option>
              <option [value]="50">50</option>
              <option [value]="100">100</option>
            </select>
            <span>entries per page</span>
            <span class="entries-info">
              (Showing {{ (currentPage - 1) * pageSize + 1 }} to {{ getEndIndex() }} of {{ filteredCategories.length }} categories)
            </span>
          </div>

          <div class="pagination-controls" *ngIf="totalPages > 1">
            <button type="button" class="page-btn" [disabled]="currentPage === 1" (click)="setPage(1)" title="First Page">
              <span class="material-symbols-outlined">keyboard_double_arrow_left</span>
            </button>
            <button type="button" class="page-btn" [disabled]="currentPage === 1" (click)="setPage(currentPage - 1)" title="Previous Page">
              <span class="material-symbols-outlined">chevron_left</span>
            </button>

            <ng-container *ngFor="let p of visiblePages">
              <span class="page-ellipsis" *ngIf="p === '...'">...</span>
              <button
                *ngIf="p !== '...'"
                type="button"
                class="page-btn"
                [class.active]="p === currentPage"
                (click)="setPage(p)"
              >
                {{ p }}
              </button>
            </ng-container>

            <button type="button" class="page-btn" [disabled]="currentPage === totalPages" (click)="setPage(currentPage + 1)" title="Next Page">
              <span class="material-symbols-outlined">chevron_right</span>
            </button>
            <button type="button" class="page-btn" [disabled]="currentPage === totalPages" (click)="setPage(totalPages)" title="Last Page">
              <span class="material-symbols-outlined">keyboard_double_arrow_right</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .cms-page-container {
      display: flex;
      flex-direction: column;
      gap: 24px;
      width: 100%;
      box-sizing: border-box;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      background: #ffffff;
      padding: 24px 30px;
      border-radius: 16px;
      border: 1px solid #e2e8f0;
      width: 100%;
      box-sizing: border-box;
    }
    .breadcrumb {
      font-size: 13px;
      color: #64748b;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .breadcrumb a {
      color: #0050e5;
      text-decoration: none;
      font-weight: 600;
    }
    .breadcrumb a:hover {
      text-decoration: underline;
    }
    .breadcrumb .sep {
      color: #94a3b8;
    }
    .breadcrumb .current {
      color: #334155;
      font-weight: 600;
    }
    .page-header h1 {
      font-size: 24px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 4px;
    }
    .subtitle {
      color: #64748b;
      font-size: 14px;
      margin: 0;
    }
    .header-actions {
      display: flex;
      gap: 12px;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.2s ease;
    }
    .btn-primary {
      background: #0050e5;
      color: #ffffff;
      border: none;
    }
    .btn-primary:hover:not(:disabled) {
      background: #0043c7;
    }
    .btn-outline {
      background: transparent;
      border: 1px solid #cbd5e1;
      color: #334155;
    }
    .btn-outline:hover {
      background: #f8fafc;
      border-color: #94a3b8;
    }

    .cms-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 24px 28px;
      width: 100%;
      box-sizing: border-box;
    }
    .full-width-card {
      width: 100%;
    }
    .card-header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid #f1f5f9;
      gap: 16px;
    }
    .card-header-bar h3 {
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 4px;
    }
    .card-sub {
      font-size: 13px;
      color: #64748b;
      margin: 0;
    }

    .search-box {
      position: relative;
      display: flex;
      align-items: center;
      min-width: 260px;
    }
    .search-icon {
      position: absolute;
      left: 12px;
      font-size: 18px;
      color: #94a3b8;
      pointer-events: none;
    }
    .search-input {
      width: 100%;
      padding: 9px 14px 9px 38px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 13px;
      color: #0f172a;
      background: #ffffff;
    }
    .search-input:focus {
      outline: none;
      border-color: #0050e5;
      box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.12);
    }

    .table-responsive {
      overflow-x: auto;
      width: 100%;
    }
    .cms-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
    }
    .cms-table th {
      background: #f8fafc;
      padding: 12px 16px;
      font-size: 11px;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #e2e8f0;
      text-align: left;
      white-space: nowrap;
    }
    .cms-table td {
      padding: 14px 16px;
      font-size: 13px;
      color: #334155;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
    }
    .cms-table tr:hover td {
      background: #fbfcfe;
    }

    .cat-title {
      font-size: 14px;
      color: #0f172a;
    }
    .sub-text {
      font-size: 11px;
      color: #64748b;
      margin-top: 2px;
    }
    .sub-text code {
      background: #f1f5f9;
      padding: 1px 4px;
      border-radius: 4px;
      color: #0f172a;
    }

    .zone-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      white-space: nowrap;
    }
    .zone-first { background: #eff6ff; color: #1d4ed8; }
    .zone-middle { background: #f5f3ff; color: #6d28d9; }
    .zone-last { background: #fdf2f8; color: #be185d; }
    .zone-top { background: #fefce8; color: #a16207; }

    .icon-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #475569;
      background: #f1f5f9;
      padding: 4px 8px;
      border-radius: 6px;
    }

    .indicator {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
    }
    .indicator.on { background: #dcfce7; color: #15803d; }
    .indicator.off { background: #f1f5f9; color: #94a3b8; }

    .pages-badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      background: #f1f5f9;
      color: #64748b;
    }
    .pages-badge.has-pages {
      background: #e0e7ff;
      color: #3730a3;
      font-weight: 700;
    }

    .status-pill {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
    }
    .status-pill.published { background: #dcfce7; color: #15803d; }
    .status-pill.draft { background: #f1f5f9; color: #64748b; }

    /* Uniform Table Action Buttons */
    .action-buttons {
      display: flex;
      align-items: center;
      gap: 8px;
      white-space: nowrap;
    }
    .btn-action {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      height: 34px;
      padding: 0 14px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
      transition: all 0.15s ease;
      border: 1px solid transparent;
      box-sizing: border-box;
    }
    .btn-action .material-symbols-outlined {
      font-size: 16px;
    }
    .btn-edit {
      background: #eff6ff;
      color: #0050e5;
      border-color: #bfdbfe;
    }
    .btn-edit:hover {
      background: #dbeafe;
      border-color: #93c5fd;
      color: #0043c7;
    }
    .btn-delete {
      background: #fef2f2;
      color: #dc2626;
      border-color: #fecaca;
    }
    .btn-delete:hover {
      background: #fee2e2;
      border-color: #fca5a5;
      color: #b91c1c;
    }

    .empty-cell {
      text-align: center;
      padding: 60px 20px !important;
    }
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      color: #94a3b8;
    }
    .empty-state .material-symbols-outlined {
      font-size: 40px;
      color: #cbd5e1;
    }

    /* Built-In Pagination Toolbar */
    .pagination-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 20px;
      border-top: 1px solid #e2e8f0;
      background: #f8fafc;
      flex-wrap: wrap;
      gap: 12px;
      border-bottom-left-radius: 16px;
      border-bottom-right-radius: 16px;
    }
    .page-size-selector {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #64748b;
    }
    .page-size-selector select {
      height: 32px;
      padding: 0 8px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      background: #ffffff;
      outline: none;
      font-size: 12px;
      font-weight: 600;
      color: #0f172a;
      cursor: pointer;
    }
    .entries-info {
      font-size: 12px;
      color: #94a3b8;
      margin-left: 6px;
    }
    .pagination-controls {
      display: flex;
      gap: 4px;
      align-items: center;
    }
    .page-btn {
      min-width: 32px;
      height: 32px;
      padding: 0 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      color: #334155;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .page-btn:hover:not(:disabled) {
      background: #f1f5f9;
      border-color: #94a3b8;
    }
    .page-btn.active {
      background: #0050e5;
      color: #ffffff;
      border-color: #0050e5;
    }
    .page-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .page-btn .material-symbols-outlined {
      font-size: 18px;
    }
    .page-ellipsis {
      padding: 0 4px;
      color: #94a3b8;
      font-weight: 600;
      font-size: 12px;
    }

    .spin {
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      100% { transform: rotate(360deg); }
    }
  `]
})
export class WebCategoriesComponent implements OnInit {
  loading = false;
  categories: any[] = [];
  searchTerm = '';
  pageSize = 10;
  currentPage = 1;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.loading = true;
    this.api.get<any>('ContentApi/categories').subscribe({
      next: (res) => {
        this.loading = false;
        this.categories = res?.data || [];
        this.currentPage = 1;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  get filteredCategories(): any[] {
    if (!this.searchTerm) return this.categories;
    const term = this.searchTerm.toLowerCase();
    return this.categories.filter(c => c.title?.toLowerCase().includes(term));
  }

  get totalPages(): number {
    return Math.ceil(this.filteredCategories.length / this.pageSize) || 1;
  }

  get paginatedCategories(): any[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredCategories.slice(start, start + this.pageSize);
  }

  get visiblePages(): (number | string)[] {
    const total = this.totalPages;
    const current = this.currentPage;
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages: (number | string)[] = [1];
    if (current > 3) pages.push('...');
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    if (current < total - 2) pages.push('...');
    pages.push(total);
    return pages;
  }

  setPage(page: number | string): void {
    if (typeof page !== 'number') return;
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
  }

  onSearchChange(): void {
    this.currentPage = 1;
  }

  getEndIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredCategories.length);
  }

  getZoneLabel(pos: number | string): string {
    const p = Number(pos) || 2;
    switch (p) {
      case 1: return '1. First Zone';
      case 2: return '2. Middle Zone';
      case 3: return '3. Last Zone';
      case 4: return 'Top Utility';
      default: return '2. Middle Zone';
    }
  }

  getZoneClass(pos: number | string): string {
    const p = Number(pos) || 2;
    switch (p) {
      case 1: return 'zone-first';
      case 2: return 'zone-middle';
      case 3: return 'zone-last';
      case 4: return 'zone-top';
      default: return 'zone-middle';
    }
  }
}
