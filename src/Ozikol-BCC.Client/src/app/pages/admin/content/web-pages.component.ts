import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';

/**
 * Published & Draft Web Pages management console.
 * Displays all pages with multi-zone placement badges, URL slug previews, category groupings,
 * and quick tag filters. Action buttons navigate to dedicated full-width Create, Edit, Details, and Delete pages.
 */
@Component({
  selector: 'app-web-pages',
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
            <span class="current">All Web Pages</span>
          </div>
          <h1>Published & Draft Web Pages</h1>
          <p class="subtitle">Create, organize layout blocks, and manage SEO metadata for all public website pages.</p>
        </div>
        <div class="header-actions">
          <button type="button" (click)="normalizePageOrders()" class="btn btn-outline" [disabled]="savingPageOrder" title="Normalize and re-space all pages into clean sequential increments (10, 20, 30...)">
            <span class="material-symbols-outlined" [class.spin]="savingPageOrder">reorder</span>
            <span>Normalize (10, 20...)</span>
          </button>
          <a routerLink="/content/console/pages/create" class="btn btn-primary">
            <span class="material-symbols-outlined">add_circle</span>
            <span>New Web Page</span>
          </a>
          <button type="button" (click)="loadAll()" class="btn btn-outline" [disabled]="loading">
            <span class="material-symbols-outlined" [class.spin]="loading">refresh</span>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <!-- Filter Controls Bar -->
      <div class="filter-bar">
        <div class="filter-group">
          <button type="button" class="filter-btn" [class.active]="filterStatus === 'all' && !selectedTagFilter && selectedZoneFilter === null" (click)="filterStatus = 'all'; selectedTagFilter = null; selectedZoneFilter = null">
            All Pages ({{ pages.length }})
          </button>
          <button type="button" class="filter-btn" [class.active]="filterStatus === 'published' && !selectedTagFilter && selectedZoneFilter === null" (click)="filterStatus = 'published'; selectedTagFilter = null; selectedZoneFilter = null">
            Published ({{ publishedCount }})
          </button>
          <button type="button" class="filter-btn" [class.active]="filterStatus === 'draft' && !selectedTagFilter && selectedZoneFilter === null" (click)="filterStatus = 'draft'; selectedTagFilter = null; selectedZoneFilter = null">
            Drafts ({{ draftCount }})
          </button>

          <!-- Zone Arrangement Quick Filters -->
          <span class="filter-sep"></span>
          <button type="button" class="filter-btn zone-btn" [class.active]="selectedZoneFilter === 1" (click)="toggleZoneFilter(1)" title="Filter to 1. First Zone pages">
            1. First ({{ getZoneCount(1) }})
          </button>
          <button type="button" class="filter-btn zone-btn" [class.active]="selectedZoneFilter === 2" (click)="toggleZoneFilter(2)" title="Filter to 2. Middle Zone pages">
            2. Middle ({{ getZoneCount(2) }})
          </button>
          <button type="button" class="filter-btn zone-btn" [class.active]="selectedZoneFilter === 3" (click)="toggleZoneFilter(3)" title="Filter to 3. Last Zone pages">
            3. Last ({{ getZoneCount(3) }})
          </button>
          <button type="button" class="filter-btn zone-btn" [class.active]="selectedZoneFilter === 4" (click)="toggleZoneFilter(4)" title="Filter to Top Utility pages">
            Top Utility ({{ getZoneCount(4) }})
          </button>

          <!-- Dynamic Active Tag Filters -->
          <span class="filter-sep" *ngIf="availableTags.length > 0"></span>
          <button type="button" class="filter-btn tag-btn" *ngFor="let tag of availableTags" [class.active]="selectedTagFilter === tag" (click)="toggleTagFilter(tag)">
            🏷️ #{{ tag }} ({{ getTagCount(tag) }})
          </button>
        </div>
        <div class="search-box">
          <span class="material-symbols-outlined search-icon">search</span>
          <input type="text" [(ngModel)]="searchTerm" (ngModelChange)="onFilterChange()" placeholder="Search by title, slug, or tag...">
        </div>
      </div>

      <!-- Bulk Action Bar -->
      <div class="bulk-action-bar" *ngIf="selectedIds.size > 0">
        <div class="bulk-info">
          <span class="material-symbols-outlined text-primary">check_circle</span>
          <span><strong>{{ selectedIds.size }}</strong> web page{{ selectedIds.size > 1 ? 's' : '' }} selected</span>
        </div>
        <div class="bulk-buttons">
          <button type="button" class="btn btn-sm btn-outline" (click)="clearSelection()">Deselect All</button>
          <button type="button" class="btn btn-sm btn-danger" (click)="openBulkDeleteModal()">
            <span class="material-symbols-outlined fs-6">delete_sweep</span>
            <span>Delete Selected ({{ selectedIds.size }})</span>
          </button>
        </div>
      </div>

      <!-- Pages Table Card (Full Width) -->
      <div class="cms-card full-width-card">
        <div class="table-responsive">
          <table class="cms-table">
            <thead>
              <tr>
                <th style="width: 44px; text-align: center;">
                  <input
                    type="checkbox"
                    class="cms-checkbox"
                    [checked]="isAllSelected"
                    [indeterminate]="isIndeterminate"
                    (change)="toggleSelectAll($event)"
                    title="Select / Deselect all pages on this page"
                  >
                </th>
                <th style="width: 130px;">ORDER</th>
                <th>PAGE TITLE</th>
                <th>ZONE</th>
                <th>DIRECT URL SLUG</th>
                <th>CATEGORY</th>
                <th>TOP BAR</th>
                <th>MAIN NAV</th>
                <th>DROPDOWN</th>
                <th>FOOTER</th>
                <th>BOTTOM</th>
                <th>TICKER</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let page of paginatedPages; let i = index"
                  [class.selected-row]="isSelected(page.id)"
                  draggable="true"
                  (dragstart)="onPageDragStart($event, i)"
                  (dragover)="onPageDragOver($event, i)"
                  (dragleave)="onPageDragLeave($event, i)"
                  (drop)="onPageDrop($event, i)"
                  [class.row-dragged]="draggedPageIndex === getGlobalIndex(i)"
                  [class.row-drag-over]="dragOverPageIndex === getGlobalIndex(i)">
                <td style="width: 44px; text-align: center;">
                  <input
                    type="checkbox"
                    class="cms-checkbox"
                    [checked]="isSelected(page.id)"
                    (change)="toggleSelection(page.id)"
                  >
                </td>
                <td>
                  <div class="tag-order-cell">
                    <span class="drag-grip-handle" title="Drag up or down to re-order page sequence">
                      <span class="material-symbols-outlined">drag_indicator</span>
                    </span>
                    <span class="order-pill" *ngIf="editingOrderId !== page.id" (click)="startEditOrder(page)" title="Click to edit custom sort order">
                      #{{ page.sortOrder }}
                    </span>
                    <input
                      *ngIf="editingOrderId === page.id"
                      type="number"
                      class="order-input-mini"
                      [value]="page.sortOrder"
                      #orderInput
                      (blur)="finishEditOrder(page, orderInput.value)"
                      (keydown.enter)="finishEditOrder(page, orderInput.value)"
                      (keydown.escape)="cancelEditOrder()"
                    >
                    <div class="arrow-sort-group">
                      <button type="button" class="btn-sort-arrow" (click)="movePageToTop(i)" [disabled]="isFirstItem(i)" title="Move page directly to top">
                        <span class="material-symbols-outlined">vertical_align_top</span>
                      </button>
                      <button type="button" class="btn-sort-arrow" (click)="movePageUp(i)" [disabled]="isFirstItem(i)" title="Move page up">
                        <span class="material-symbols-outlined">expand_less</span>
                      </button>
                      <button type="button" class="btn-sort-arrow" (click)="movePageDown(i)" [disabled]="isLastItem(i)" title="Move page down">
                        <span class="material-symbols-outlined">expand_more</span>
                      </button>
                    </div>
                  </div>
                </td>
                <td>
                  <div class="page-title-cell">
                    <div class="title-row">
                      <strong class="page-title">{{ page.title }}</strong>
                      <span class="home-pill" *ngIf="page.isHomePage" title="Root Homepage">🏠 Home</span>
                      <span class="cta-pill" *ngIf="page.isMenuCTA">CTA Button</span>
                    </div>
                    <div class="tags-badge-list" *ngIf="page.tags">
                      <span class="tag-pill" *ngFor="let t of getPageTags(page.tags)">#{{ t }}</span>
                    </div>
                    <span class="security-badge" *ngIf="page.securityPage">
                      <span class="material-symbols-outlined">lock</span> Protected
                    </span>
                    <span class="legal-badge" *ngIf="page.isLegal">
                      <span class="material-symbols-outlined">gavel</span> Legal
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
                  <a [href]="getLivePageUrl(page)" target="_blank" class="slug-link" title="Open live page in new tab">
                    <code>{{ getDisplaySlug(page) }}</code>
                    <span class="material-symbols-outlined open-icon">open_in_new</span>
                  </a>
                </td>
                <td>
                  <span class="badge-cat" *ngIf="page.pageCategory">{{ page.pageCategory.title }}</span>
                  <span class="badge-none" *ngIf="!page.pageCategory">Standalone</span>
                </td>
                <td>
                  <span class="indicator" [class.on]="page.showInTopBar" [class.off]="!page.showInTopBar" [title]="'Sort: #' + (page.topBarSortOrder || 0)">
                    {{ page.showInTopBar ? ('#' + (page.topBarSortOrder || 0)) : 'No' }}
                  </span>
                </td>
                <td>
                  <span class="indicator" [class.on]="page.showInMainMenu" [class.off]="!page.showInMainMenu" [title]="'Sort: #' + (page.mainMenuSortOrder || page.sortOrder || 0)">
                    {{ page.showInMainMenu ? ('#' + (page.mainMenuSortOrder || page.sortOrder || 0)) : 'No' }}
                  </span>
                </td>
                <td>
                  <span class="indicator" [class.on]="page.showInMenuDropDown" [class.off]="!page.showInMenuDropDown" [title]="'Sort: #' + (page.dropdownSortOrder || 0)">
                    {{ page.showInMenuDropDown ? ('#' + (page.dropdownSortOrder || 0)) : 'No' }}
                  </span>
                </td>
                <td>
                  <span class="indicator" [class.on]="page.showInFooter" [class.off]="!page.showInFooter" [title]="'Sort: #' + (page.footerSortOrder || 0)">
                    {{ page.showInFooter ? ('#' + (page.footerSortOrder || 0)) : 'No' }}
                  </span>
                </td>
                <td>
                  <span class="indicator" [class.on]="page.showInFooterBottom || page.isLegal" [class.off]="!page.showInFooterBottom && !page.isLegal" [title]="'Sort: #' + (page.footerBottomSortOrder || 0)">
                    {{ (page.showInFooterBottom || page.isLegal) ? ('#' + (page.footerBottomSortOrder || 0)) : 'No' }}
                  </span>
                </td>
                <td>
                  <span class="indicator" [class.on]="page.addToRibon" [class.off]="!page.addToRibon" [title]="'Ticker Sort: #' + (page.ribonSortOrder || 0)">
                    {{ page.addToRibon ? ('#' + (page.ribonSortOrder || 0)) : 'No' }}
                  </span>
                </td>
                <td>
                  <span class="status-pill" [class.published]="page.publish" [class.draft]="!page.publish">
                    {{ page.publish ? 'Published' : 'Draft' }}
                  </span>
                </td>
                <td>
                  <div class="action-buttons">
                    <a [href]="getLivePageUrl(page)" target="_blank" class="btn-action btn-view" title="Open live published page in a new tab">
                      <span class="material-symbols-outlined">open_in_new</span>
                      <span>View</span>
                    </a>
                    <a [routerLink]="['/content/console/pages/edit', page.id]" class="btn-action btn-edit" title="Edit Page & Settings">
                      <span class="material-symbols-outlined">edit</span>
                      <span>Edit</span>
                    </a>
                    <a [routerLink]="['/content/console/pages/details', page.id]" class="btn-action btn-sections" title="Manage Page Sections">
                      <span class="material-symbols-outlined">layers</span>
                      <span>Sections</span>
                    </a>
                    <a [routerLink]="['/content/console/pages/delete', page.id]" class="btn-action btn-delete" title="Delete Web Page">
                      <span class="material-symbols-outlined">delete</span>
                      <span>Delete</span>
                    </a>
                  </div>
                </td>
              </tr>
              <tr *ngIf="filteredPages.length === 0">
                <td colspan="14" class="empty-cell">
                  <div class="empty-state">
                    <span class="material-symbols-outlined">description</span>
                    <p>No web pages match your criteria. Click "New Web Page" to create one.</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Built-In Pagination Toolbar -->
        <div class="pagination-footer" *ngIf="filteredPages.length > 0">
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
              (Showing {{ (currentPage - 1) * pageSize + 1 }} to {{ getEndIndex() }} of {{ filteredPages.length }} pages)
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
      <!-- Bulk Delete Confirmation Modal -->
      <div class="modal-backdrop" *ngIf="showBulkDeleteModal">
        <div class="modal-card">
          <div class="modal-header">
            <div class="modal-title-group">
              <span class="material-symbols-outlined text-danger">delete_sweep</span>
              <h3>Delete {{ selectedIds.size }} Web Page{{ selectedIds.size > 1 ? 's' : '' }}?</h3>
            </div>
            <button type="button" class="btn-close" (click)="closeBulkDeleteModal()">&times;</button>
          </div>
          <div class="modal-body">
            <p style="margin: 0; font-size: 14px; color: #334155; line-height: 1.6;">
              Are you sure you want to permanently delete the <strong>{{ selectedIds.size }}</strong> selected web page(s)?
            </p>
            <div class="force-cascade-check">
              <label class="custom-check-label">
                <input type="checkbox" [(ngModel)]="cascadeSections" class="cms-checkbox">
                <span>
                  <strong>Cascade Purge:</strong> Also delete all attached layout sections and repeating child cards for these pages.
                </span>
              </label>
            </div>
            <div class="warning-callout">
              <span class="material-symbols-outlined text-danger" style="font-size: 20px;">warning</span>
              <div style="font-size: 12.5px; color: #991b1b; line-height: 1.5;">
                This action cannot be undone. Public routes for these pages will immediately return 404.
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" (click)="closeBulkDeleteModal()" [disabled]="bulkDeleting">
              Cancel
            </button>
            <button type="button" class="btn btn-danger" (click)="executeBulkDelete()" [disabled]="bulkDeleting">
              <span class="material-symbols-outlined fs-6" *ngIf="!bulkDeleting">delete_forever</span>
              <span *ngIf="!bulkDeleting">Delete {{ selectedIds.size }} Page{{ selectedIds.size > 1 ? 's' : '' }}</span>
              <span *ngIf="bulkDeleting">Deleting Pages...</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .cms-checkbox {
      width: 17px;
      height: 17px;
      accent-color: #0050e5;
      cursor: pointer;
      border-radius: 4px;
      vertical-align: middle;
    }
    .selected-row {
      background: #f0f7ff !important;
    }
    .bulk-action-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 12px;
      padding: 12px 20px;
      animation: slideDown 0.2s ease;
    }
    .bulk-info {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13.5px;
      color: #1e3a8a;
    }
    .bulk-buttons {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .btn-sm {
      padding: 6px 14px;
      font-size: 12.5px;
      border-radius: 8px;
    }
    .btn-danger {
      background: #dc2626;
      color: #fff;
      border: none;
    }
    .btn-danger:hover {
      background: #b91c1c;
    }
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.6);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
    }
    .modal-card {
      background: #fff;
      border-radius: 16px;
      width: 100%;
      max-width: 520px;
      box-shadow: 0 25px 60px rgba(0,0,0,0.3);
      overflow: hidden;
    }
    .modal-header {
      padding: 18px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #e2e8f0;
    }
    .modal-title-group {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .modal-title-group h3 {
      margin: 0;
      font-size: 17px;
      font-weight: 800;
      color: #0f172a;
    }
    .btn-close {
      background: none;
      border: none;
      font-size: 22px;
      cursor: pointer;
      color: #64748b;
    }
    .modal-body {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .modal-footer {
      padding: 16px 24px;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }
    .force-cascade-check {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 14px;
    }
    .custom-check-label {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13px;
      color: #334155;
      cursor: pointer;
    }
    .warning-callout {
      display: flex;
      gap: 10px;
      align-items: flex-start;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      padding: 10px 14px;
    }
    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: translateY(0); }
    }
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
      gap: 10px;
      flex-wrap: wrap;
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
    .btn-outline:hover:not(:disabled) {
      background: #f8fafc;
      border-color: #94a3b8;
    }

    /* Filter Controls Bar */
    .filter-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      background: #ffffff;
      padding: 12px 20px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      width: 100%;
      box-sizing: border-box;
      flex-wrap: wrap;
    }
    .filter-group {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap;
    }
    .filter-btn {
      border: none;
      background: transparent;
      padding: 7px 14px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      color: #64748b;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .filter-btn:hover {
      background: #f1f5f9;
      color: #0f172a;
    }
    .filter-btn.active {
      background: #eff6ff;
      color: #0050e5;
    }
    .filter-sep {
      border-left: 1px solid #cbd5e1;
      height: 20px;
      margin: 0 4px;
    }
    .search-box {
      position: relative;
      display: flex;
      align-items: center;
      min-width: 280px;
    }
    .search-icon {
      position: absolute;
      left: 12px;
      font-size: 18px;
      color: #94a3b8;
      pointer-events: none;
    }
    .search-box input {
      width: 100%;
      padding: 8px 14px 8px 38px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 13px;
      color: #0f172a;
      background: #ffffff;
    }
    .search-box input:focus {
      outline: none;
      border-color: #0050e5;
      box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.12);
    }

    /* Table Styles */
    .cms-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 20px 24px;
      width: 100%;
      box-sizing: border-box;
    }
    .full-width-card {
      width: 100%;
    }
    .table-responsive {
      overflow-x: auto;
      width: 100%;
    }
    .cms-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      font-size: 13px;
    }
    .cms-table th {
      text-align: left;
      padding: 12px 14px;
      background: #f8fafc;
      color: #475569;
      font-weight: 700;
      border-bottom: 1px solid #e2e8f0;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      white-space: nowrap;
    }
    .cms-table td {
      padding: 14px 14px;
      border-bottom: 1px solid #f1f5f9;
      color: #334155;
      vertical-align: middle;
    }
    .cms-table tr:hover td {
      background: #fbfcfe;
    }

    /* Drag-and-Drop & Arrow Reordering Styling */
    .tag-order-cell {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .drag-grip-handle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: grab;
      color: #94a3b8;
      padding: 2px;
      border-radius: 4px;
      transition: all 0.15s ease;
    }
    .drag-grip-handle:hover {
      color: #0050e5;
      background: #eff6ff;
    }
    .drag-grip-handle:active {
      cursor: grabbing;
    }
    .drag-grip-handle .material-symbols-outlined {
      font-size: 18px;
    }
    .order-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 32px;
      padding: 2px 7px;
      background: #f1f5f9;
      color: #1e293b;
      font-size: 11px;
      font-weight: 700;
      border-radius: 6px;
      cursor: pointer;
      border: 1px solid #e2e8f0;
      transition: all 0.15s ease;
    }
    .order-pill:hover {
      background: #eff6ff;
      border-color: #bfdbfe;
      color: #0050e5;
    }
    .order-input-mini {
      width: 48px;
      height: 24px;
      padding: 0 4px;
      font-size: 11px;
      font-weight: 700;
      border: 1.5px solid #0050e5;
      border-radius: 5px;
      outline: none;
      background: #ffffff;
      color: #0f172a;
      text-align: center;
    }
    .arrow-sort-group {
      display: inline-flex;
      flex-direction: column;
      gap: 1px;
    }
    .btn-sort-arrow {
      background: transparent;
      border: none;
      padding: 0;
      line-height: 1;
      height: 11px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: #94a3b8;
      cursor: pointer;
      transition: all 0.12s ease;
    }
    .btn-sort-arrow .material-symbols-outlined {
      font-size: 15px;
    }
    .btn-sort-arrow:hover:not(:disabled) {
      color: #0050e5;
      transform: scale(1.15);
    }
    .btn-sort-arrow:disabled {
      opacity: 0.25;
      cursor: default;
    }
    tr.row-dragged {
      opacity: 0.45;
      background: #f1f5f9 !important;
    }
    tr.row-drag-over {
      border-top: 2.5px solid #0050e5 !important;
      background: #eff6ff !important;
    }

    .page-title-cell {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .title-row {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }
    .page-title {
      font-size: 14px;
      color: #0f172a;
    }
    .home-pill {
      background: #dbeafe;
      color: #1e40af;
      padding: 2px 7px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
    }
    .cta-pill {
      background: #fef3c7;
      color: #b45309;
      padding: 2px 7px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
    }
    .tags-badge-list {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
      margin-top: 2px;
    }
    .tag-pill {
      background: #f1f5f9;
      color: #475569;
      font-size: 11px;
      padding: 1px 6px;
      border-radius: 6px;
      font-weight: 600;
    }
    .security-badge {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      font-size: 10px;
      color: #dc2626;
      font-weight: 700;
    }
    .security-badge span {
      font-size: 13px;
    }
    .legal-badge {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      font-size: 10px;
      color: #0d9488;
      font-weight: 700;
    }
    .legal-badge span {
      font-size: 13px;
    }
    .sub-text {
      font-size: 11px;
      color: #64748b;
    }
    .sub-text code {
      background: #f1f5f9;
      padding: 1px 4px;
      border-radius: 4px;
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

    .slug-link {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      text-decoration: none;
      color: #0050e5;
    }
    .slug-link:hover code {
      text-decoration: underline;
    }
    .open-icon {
      font-size: 14px;
    }

    .badge-cat {
      background: #eff6ff;
      color: #0050e5;
      padding: 3px 8px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 11px;
    }
    .badge-none {
      color: #94a3b8;
      font-size: 11px;
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

    .status-pill {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
    }
    .status-pill.published { background: #dcfce7; color: #15803d; }
    .status-pill.draft { background: #fef3c7; color: #b45309; }

    /* Uniform Table Action Buttons */
    .action-buttons {
      display: flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
    }
    .btn-action {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      height: 34px;
      padding: 0 12px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 500;
      white-space: nowrap;
      text-decoration: none;
      cursor: pointer;
      transition: all 0.15s ease;
      border: 1px solid transparent;
      box-sizing: border-box;
    }
    .btn-action .material-symbols-outlined {
      font-size: 16px;
    }
    .btn-view {
      background: #f0fdf4;
      color: #16a34a;
      border-color: #bbf7d0;
    }
    .btn-view:hover {
      background: #dcfce7;
      border-color: #86efac;
      color: #15803d;
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
    .btn-sections {
      background: #f1f5f9;
      color: #334155;
      border-color: #cbd5e1;
    }
    .btn-sections:hover {
      background: #e2e8f0;
      border-color: #94a3b8;
      color: #0f172a;
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
export class WebPagesComponent implements OnInit {
  loading = false;
  savingPageOrder = false;
  bulkDeleting = false;
  showBulkDeleteModal = false;
  cascadeSections = true;
  selectedIds = new Set<string>();
  pages: any[] = [];
  categories: any[] = [];
  filterStatus = 'all';
  searchTerm = '';
  selectedTagFilter: string | null = null;
  selectedZoneFilter: number | null = null;
  pageSize = 10;
  currentPage = 1;

  draggedPageIndex: number | null = null;
  dragOverPageIndex: number | null = null;
  editingOrderId: string | null = null;

  constructor(
    private api: ApiService,
    private toast: ToastService,
    private router: Router
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

  // Bulk Selection Methods
  get isAllSelected(): boolean {
    const list = this.paginatedPages;
    return list.length > 0 && list.every(p => this.selectedIds.has(p.id));
  }

  get isIndeterminate(): boolean {
    const count = this.paginatedPages.filter(p => this.selectedIds.has(p.id)).length;
    return count > 0 && count < this.paginatedPages.length;
  }

  toggleSelectAll(event: any): void {
    const isChecked = event?.target?.checked;
    const list = this.paginatedPages;
    if (isChecked) {
      list.forEach(p => this.selectedIds.add(p.id));
    } else {
      list.forEach(p => this.selectedIds.delete(p.id));
    }
  }

  toggleSelection(id: string): void {
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
    } else {
      this.selectedIds.add(id);
    }
  }

  isSelected(id: string): boolean {
    return this.selectedIds.has(id);
  }

  clearSelection(): void {
    this.selectedIds.clear();
  }

  openBulkDeleteModal(): void {
    if (this.selectedIds.size > 0) {
      this.showBulkDeleteModal = true;
    }
  }

  closeBulkDeleteModal(): void {
    if (this.bulkDeleting) return;
    this.showBulkDeleteModal = false;
  }

  executeBulkDelete(): void {
    if (this.selectedIds.size === 0) return;

    this.bulkDeleting = true;
    const ids = Array.from(this.selectedIds);

    this.api.post<any>('ContentApi/pages/bulk-delete', { ids, forceCascade: this.cascadeSections }).subscribe({
      next: (res) => {
        this.bulkDeleting = false;
        this.showBulkDeleteModal = false;
        this.selectedIds.clear();
        this.toast.success(res?.message || `${ids.length} web page(s) deleted successfully.`);
        this.loadAll();
      },
      error: (err) => {
        this.bulkDeleting = false;
        this.toast.error(err?.error?.message || 'Failed to bulk delete web pages.');
      }
    });
  }

  sortByZoneAndOrder(a: any, b: any): number {
    return (a.sortOrder || 0) - (b.sortOrder || 0);
  }

  toggleZoneFilter(zone: number): void {
    if (this.selectedZoneFilter === zone) {
      this.selectedZoneFilter = null;
    } else {
      this.selectedZoneFilter = zone;
    }
    this.currentPage = 1;
  }

  getZoneCount(zone: number): number {
    return this.pages.filter(p => (Number(p.menuPosition) || 1) === zone).length;
  }

  loadAll(): void {
    this.loading = true;
    this.api.get<any>('ContentApi/pages').subscribe({
      next: (res) => {
        this.pages = (res?.data || []).sort((a: any, b: any) => this.sortByZoneAndOrder(a, b));
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

  get availableTags(): string[] {
    const set = new Set<string>();
    for (const p of this.pages) {
      if (p.tags) {
        p.tags.split(/[,;]/).forEach((t: string) => {
          const trimmed = t.trim().toLowerCase();
          if (trimmed) set.add(trimmed);
        });
      }
    }
    return Array.from(set).sort();
  }

  getTagCount(tag: string): number {
    return this.pages.filter(p => this.getPageTags(p.tags).includes(tag.toLowerCase())).length;
  }

  getPageTags(tagsStr: string | null | undefined): string[] {
    if (!tagsStr) return [];
    return tagsStr.split(/[,;]/).map(t => t.trim().toLowerCase()).filter(t => !!t);
  }

  toggleTagFilter(tag: string): void {
    if (this.selectedTagFilter === tag) {
      this.selectedTagFilter = null;
    } else {
      this.selectedTagFilter = tag;
    }
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

    if (this.selectedZoneFilter !== null) {
      list = list.filter(p => (Number(p.menuPosition) || 1) === this.selectedZoneFilter);
    }

    if (this.selectedTagFilter) {
      list = list.filter(p => this.getPageTags(p.tags).includes(this.selectedTagFilter!));
    }

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      list = list.filter(p => p.title?.toLowerCase().includes(term) || p.directUrl?.toLowerCase().includes(term) || (p.tags && p.tags.toLowerCase().includes(term)));
    }
    return list.slice().sort((a, b) => this.sortByZoneAndOrder(a, b));
  }

  get totalPages(): number {
    return Math.ceil(this.filteredPages.length / this.pageSize) || 1;
  }

  get paginatedPages(): any[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredPages.slice(start, start + this.pageSize);
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

  onFilterChange(): void {
    this.currentPage = 1;
  }

  getEndIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredPages.length);
  }

  getGlobalIndex(localIndex: number): number {
    return (this.currentPage - 1) * this.pageSize + localIndex;
  }

  isFirstItem(localIndex: number): boolean {
    return this.getGlobalIndex(localIndex) === 0;
  }

  isLastItem(localIndex: number): boolean {
    return this.getGlobalIndex(localIndex) >= this.filteredPages.length - 1;
  }

  startEditOrder(page: any): void {
    this.editingOrderId = page.id;
  }

  cancelEditOrder(): void {
    this.editingOrderId = null;
  }

  finishEditOrder(page: any, newVal: string): void {
    this.editingOrderId = null;
    const parsed = parseInt(newVal, 10);
    if (isNaN(parsed) || parsed === page.sortOrder) return;
    page.sortOrder = parsed;
    page.mainMenuSortOrder = parsed;
    this.pages.sort((a, b) => this.sortByZoneAndOrder(a, b));
    const payload = this.pages.map(p => ({ id: p.id, sortOrder: p.sortOrder || 0, mainMenuSortOrder: p.sortOrder || 0 }));
    this.savingPageOrder = true;
    this.api.put<any>('ContentApi/pages/reorder', payload).subscribe({
      next: () => {
        this.savingPageOrder = false;
        this.toast.success(`Sort order for '${page.title}' updated to #${parsed}.`);
      },
      error: (err) => {
        this.savingPageOrder = false;
        this.toast.error(err?.error?.message || 'Failed to update sort order.');
        this.loadAll();
      }
    });
  }

  movePageToTop(localIndex: number): void {
    const globalIdx = this.getGlobalIndex(localIndex);
    const list = [...this.filteredPages];
    if (globalIdx <= 0 || globalIdx >= list.length) return;
    const [moved] = list.splice(globalIdx, 1);
    list.unshift(moved);
    this.applyAndSavePageReorder(list);
  }

  movePageUp(localIndex: number): void {
    const globalIdx = this.getGlobalIndex(localIndex);
    const list = [...this.filteredPages];
    if (globalIdx <= 0 || globalIdx >= list.length) return;
    const temp = list[globalIdx];
    list[globalIdx] = list[globalIdx - 1];
    list[globalIdx - 1] = temp;
    this.applyAndSavePageReorder(list);
  }

  movePageDown(localIndex: number): void {
    const globalIdx = this.getGlobalIndex(localIndex);
    const list = [...this.filteredPages];
    if (globalIdx < 0 || globalIdx >= list.length - 1) return;
    const temp = list[globalIdx];
    list[globalIdx] = list[globalIdx + 1];
    list[globalIdx + 1] = temp;
    this.applyAndSavePageReorder(list);
  }

  onPageDragStart(event: DragEvent, localIndex: number): void {
    const globalIdx = this.getGlobalIndex(localIndex);
    this.draggedPageIndex = globalIdx;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', globalIdx.toString());
    }
  }

  onPageDragOver(event: DragEvent, localIndex: number): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    this.dragOverPageIndex = this.getGlobalIndex(localIndex);
  }

  onPageDragLeave(event: DragEvent, localIndex: number): void {
    const globalIdx = this.getGlobalIndex(localIndex);
    if (this.dragOverPageIndex === globalIdx) {
      this.dragOverPageIndex = null;
    }
  }

  onPageDrop(event: DragEvent, localIndex: number): void {
    event.preventDefault();
    this.dragOverPageIndex = null;
    const targetGlobalIdx = this.getGlobalIndex(localIndex);
    if (this.draggedPageIndex === null || this.draggedPageIndex === targetGlobalIdx) {
      this.draggedPageIndex = null;
      return;
    }
    const list = [...this.filteredPages];
    const [moved] = list.splice(this.draggedPageIndex, 1);
    list.splice(targetGlobalIdx, 0, moved);
    this.draggedPageIndex = null;
    this.applyAndSavePageReorder(list);
  }

  normalizePageOrders(): void {
    const list = [...this.pages].sort((a, b) => this.sortByZoneAndOrder(a, b));
    this.applyAndSavePageReorder(list, true);
  }

  applyAndSavePageReorder(orderedList: any[], showNotice: boolean = false): void {
    const payload: Array<{ id: string; sortOrder: number; mainMenuSortOrder?: number }> = [];
    orderedList.forEach((page, idx) => {
      const newOrder = (idx + 1) * 10;
      page.sortOrder = newOrder;
      page.mainMenuSortOrder = newOrder;
      payload.push({ id: page.id, sortOrder: newOrder, mainMenuSortOrder: newOrder });

      const master = this.pages.find(p => p.id === page.id);
      if (master) {
        master.sortOrder = newOrder;
        master.mainMenuSortOrder = newOrder;
      }
    });

    this.pages.sort((a, b) => this.sortByZoneAndOrder(a, b));

    this.savingPageOrder = true;
    this.api.put<any>('ContentApi/pages/reorder', payload).subscribe({
      next: () => {
        this.savingPageOrder = false;
        if (showNotice) {
          this.toast.success('Web pages re-spaced to 10, 20, 30, 40... successfully!');
        }
      },
      error: (err) => {
        this.savingPageOrder = false;
        this.toast.error(err?.error?.message || 'Failed to save page order.');
        this.loadAll();
      }
    });
  }

  /**
   * Clears all demo pages, editorial blogs, and layout sections, resetting the workspace to a clean blank canvas.
   */
  async resetToBlankCanvas(): Promise<void> {
    const confirmed = await this.toast.confirm(
      'Reset to Blank Canvas',
      'Are you sure you want to clear all demo pages, editorial blogs, and layout sections?',
      'Reset to Blank Canvas',
      'Cancel',
      'danger',
      undefined,
      [
        'All demo pages, layout sections, and sample blog posts will be removed.',
        'Your custom dynamic forms and global brand settings will be preserved.',
        'You can build completely bespoke pages from scratch or re-seed turnkey defaults at any time.'
      ]
    );

    if (confirmed) {
      this.loading = true;
      this.api.post<any>('ContentApi/workspace/reset-blank', {}).subscribe({
        next: () => {
          this.loading = false;
          this.toast.success('Workspace successfully reset to a clean blank canvas.', 'Blank Slate Ready');
          this.loadAll();
        },
        error: (err) => {
          this.loading = false;
          this.toast.error(err?.error?.message || 'Failed to reset workspace to blank.');
        }
      });
    }
  }

  /**
   * Re-seeds the complete turnkey default website suite (forms, blogs, pages, sections, SEO tags).
   */
  async reseedTurnkeyDefaults(): Promise<void> {
    const confirmed = await this.toast.confirm(
      'Restore Turnkey Website Defaults',
      'Would you like to restore the complete default website suite?',
      'Restore Turnkey Suite',
      'Cancel',
      'info',
      undefined,
      [
        'Restores the 9 standard pages (Home, Services, About, Team, Contact, Legal).',
        'Restores the 10 modular body sections and 3 interactive dynamic forms.',
        'Restores the 3 rich editorial blog posts.'
      ]
    );

    if (confirmed) {
      this.loading = true;
      this.api.post<any>('ContentApi/workspace/seed-defaults', {}).subscribe({
        next: () => {
          this.loading = false;
          this.toast.success('Turnkey website pages, sections, and blogs restored successfully!', 'Defaults Seeded');
          this.loadAll();
        },
        error: (err) => {
          this.loading = false;
          this.toast.error(err?.error?.message || 'Failed to seed default website suite.');
        }
      });
    }
  }

  getLivePageUrl(page: any): string {
    if (!page?.directUrl) return '/';
    const val = page.directUrl.trim();
    if (val.startsWith('http://') || val.startsWith('https://')) return val;
    const clean = val.replace(/^\/+/, '');
    return '/' + clean;
  }

  getDisplaySlug(page: any): string {
    if (!page?.directUrl) return '/';
    const val = page.directUrl.trim();
    if (val.startsWith('http://') || val.startsWith('https://')) return val;
    const clean = val.replace(/^\/+/, '');
    return '/' + clean;
  }
}
