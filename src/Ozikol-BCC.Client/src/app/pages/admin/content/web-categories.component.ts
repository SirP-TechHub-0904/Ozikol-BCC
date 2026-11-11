import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent, PageHeaderButton } from '../../../shared/components/page-header/page-header.component';

/**
 * Web Navigation Categories management console.
 * Organizes site navigation into header dropdowns, top bar categories, and footer columns.
 * Action buttons navigate to dedicated full-width Create, Edit, and Delete pages.
 */
@Component({
  selector: 'app-web-categories',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, PageHeaderComponent],
  template: `
    <div class="cms-page-container">
      <!-- Standardized Reusable Page Header -->
      <app-page-header
        eyebrow="CMS Studio"
        icon="folder_special"
        title="Web Menu Categories"
        subtitle="Organize pages into hierarchical header dropdowns and website navigation groups."
        [buttons]="headerButtons"
        [loading]="loading"
      ></app-page-header>

      <!-- Bulk Action Bar -->
      <div class="bulk-action-bar" *ngIf="selectedIds.size > 0">
        <div class="bulk-info">
          <span class="material-symbols-outlined text-primary">check_circle</span>
          <span><strong>{{ selectedIds.size }}</strong> category{{ selectedIds.size > 1 ? 'ies' : '' }} selected</span>
        </div>
        <div class="bulk-buttons">
          <button type="button" class="btn btn-sm btn-outline" (click)="clearSelection()">Deselect All</button>
          <button type="button" class="btn btn-sm btn-danger" (click)="openBulkDeleteModal()">
            <span class="material-symbols-outlined fs-6">delete_sweep</span>
            <span>Delete Selected ({{ selectedIds.size }})</span>
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

        <!-- Zone Arrangement Quick Filters -->
        <div class="filter-bar" style="margin-bottom: 16px;">
          <div class="filter-group">
            <button type="button" class="filter-btn" [class.active]="selectedZoneFilter === null" (click)="selectedZoneFilter = null; onSearchChange()">
              All Categories ({{ categories.length }})
            </button>
            <span class="filter-sep"></span>
            <button type="button" class="filter-btn zone-btn" [class.active]="selectedZoneFilter === 1" (click)="toggleZoneFilter(1)" title="Filter to 1. First Zone categories">
              1. First ({{ getZoneCount(1) }})
            </button>
            <button type="button" class="filter-btn zone-btn" [class.active]="selectedZoneFilter === 2" (click)="toggleZoneFilter(2)" title="Filter to 2. Middle Zone categories">
              2. Middle ({{ getZoneCount(2) }})
            </button>
            <button type="button" class="filter-btn zone-btn" [class.active]="selectedZoneFilter === 3" (click)="toggleZoneFilter(3)" title="Filter to 3. Last Zone categories">
              3. Last ({{ getZoneCount(3) }})
            </button>
            <button type="button" class="filter-btn zone-btn" [class.active]="selectedZoneFilter === 4" (click)="toggleZoneFilter(4)" title="Filter to Top Utility categories">
              Top Utility ({{ getZoneCount(4) }})
            </button>
          </div>
        </div>

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
                    title="Select / Deselect all categories on this page"
                  >
                </th>
                <th style="width: 130px;">ORDER</th>
                <th>TITLE</th>
                <th>MENU ZONE</th>
                <th>ICON</th>
                <th>MAIN NAV</th>
                <th>FOOTER</th>
                <th>ATTACHED PAGES</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let cat of paginatedCategories; let i = index"
                  [class.selected-row]="isSelected(cat.id)"
                  draggable="true"
                  (dragstart)="onCategoryDragStart($event, i)"
                  (dragover)="onCategoryDragOver($event, i)"
                  (dragleave)="onCategoryDragLeave($event, i)"
                  (drop)="onCategoryDrop($event, i)"
                  [class.row-dragged]="draggedCategoryIndex === getGlobalIndex(i)"
                  [class.row-drag-over]="dragOverCategoryIndex === getGlobalIndex(i)">
                <td style="width: 44px; text-align: center;">
                  <input
                    type="checkbox"
                    class="cms-checkbox"
                    [checked]="isSelected(cat.id)"
                    (change)="toggleSelection(cat.id)"
                  >
                </td>
                <td>
                  <div class="tag-order-cell">
                    <span class="drag-grip-handle" title="Drag up or down to re-order category sequence">
                      <span class="material-symbols-outlined">drag_indicator</span>
                    </span>
                    <span class="order-pill" *ngIf="editingOrderId !== cat.id" (click)="startEditOrder(cat)" title="Click to edit custom sort order">
                      #{{ cat.menuSortOrder }}
                    </span>
                    <input
                      *ngIf="editingOrderId === cat.id"
                      type="number"
                      class="order-input-mini"
                      [value]="cat.menuSortOrder"
                      #orderInput
                      (blur)="finishEditOrder(cat, orderInput.value)"
                      (keydown.enter)="finishEditOrder(cat, orderInput.value)"
                      (keydown.escape)="cancelEditOrder()"
                    >
                    <div class="arrow-sort-group">
                      <button type="button" class="btn-sort-arrow" (click)="moveCategoryToTop(i)" [disabled]="isFirstItem(i)" title="Move category directly to top">
                        <span class="material-symbols-outlined">vertical_align_top</span>
                      </button>
                      <button type="button" class="btn-sort-arrow" (click)="moveCategoryUp(i)" [disabled]="isFirstItem(i)" title="Move category up">
                        <span class="material-symbols-outlined">expand_less</span>
                      </button>
                      <button type="button" class="btn-sort-arrow" (click)="moveCategoryDown(i)" [disabled]="isLastItem(i)" title="Move category down">
                        <span class="material-symbols-outlined">expand_more</span>
                      </button>
                    </div>
                  </div>
                </td>
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
                <td colspan="10" class="empty-cell">
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
      <!-- Bulk Delete Confirmation Modal -->
      <div class="modal-backdrop" *ngIf="showBulkDeleteModal">
        <div class="modal-card">
          <div class="modal-header">
            <div class="modal-title-group">
              <span class="material-symbols-outlined text-danger">delete_sweep</span>
              <h3>Delete {{ selectedIds.size }} Categor{{ selectedIds.size > 1 ? 'ies' : 'y' }}?</h3>
            </div>
            <button type="button" class="btn-close" (click)="closeBulkDeleteModal()">&times;</button>
          </div>
          <div class="modal-body">
            <p style="margin: 0; font-size: 14px; color: #334155; line-height: 1.6;">
              Are you sure you want to permanently delete the <strong>{{ selectedIds.size }}</strong> selected category(ies)?
            </p>
            <div class="force-cascade-check">
              <label class="custom-check-label">
                <input type="checkbox" [(ngModel)]="cascadePages" class="cms-checkbox">
                <span>
                  <strong>Unlink Pages:</strong> Safely unassign attached web pages so they are not deleted.
                </span>
              </label>
            </div>
            <div class="warning-callout">
              <span class="material-symbols-outlined text-danger" style="font-size: 20px;">warning</span>
              <div style="font-size: 12.5px; color: #991b1b; line-height: 1.5;">
                Navigation dropdowns containing these categories will immediately disappear from the public header and footer.
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" (click)="closeBulkDeleteModal()" [disabled]="bulkDeleting">
              Cancel
            </button>
            <button type="button" class="btn btn-danger" (click)="executeBulkDelete()" [disabled]="bulkDeleting">
              <span class="material-symbols-outlined fs-6" *ngIf="!bulkDeleting">delete_forever</span>
              <span *ngIf="!bulkDeleting">Delete {{ selectedIds.size }} Categor{{ selectedIds.size > 1 ? 'ies' : 'y' }}</span>
              <span *ngIf="bulkDeleting">Deleting Categories...</span>
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
      margin-bottom: 16px;
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

    /* Zone Arrangement Filter Tabs */
    .filter-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      background: #f8fafc;
      padding: 6px 10px;
      border-radius: 10px;
      border: 1px solid #e2e8f0;
      width: 100%;
      box-sizing: border-box;
      flex-wrap: wrap;
    }
    .filter-group {
      display: flex;
      gap: 6px;
      align-items: center;
      flex-wrap: wrap;
    }
    .filter-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border: 1px solid transparent;
      background: transparent;
      padding: 7px 14px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      color: #475569;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .filter-btn:hover {
      background: #ffffff;
      color: #0f172a;
      border-color: #e2e8f0;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
    }
    .filter-btn.active {
      background: #0050e5;
      color: #ffffff;
      border-color: #0050e5;
      box-shadow: 0 2px 6px rgba(0, 80, 229, 0.22);
    }
    .filter-sep {
      display: inline-block;
      width: 1px;
      height: 20px;
      background: #cbd5e1;
      margin: 0 4px;
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
  savingCategoryOrder = false;

  get headerButtons(): PageHeaderButton[] {
    return [
      {
        text: 'Normalize (10, 20...)',
        icon: 'reorder',
        disabled: this.savingCategoryOrder,
        loading: this.savingCategoryOrder,
        action: () => this.normalizeCategoryOrders()
      },
      {
        text: 'New Category',
        icon: 'add_circle',
        isPrimary: true,
        routerLink: '/content/console/categories/create'
      },
      {
        text: 'Refresh',
        icon: 'refresh',
        disabled: this.loading,
        loading: this.loading,
        action: () => this.loadCategories()
      }
    ];
  }
  bulkDeleting = false;
  showBulkDeleteModal = false;
  cascadePages = true;
  selectedIds = new Set<string>();
  categories: any[] = [];
  searchTerm = '';
  selectedZoneFilter: number | null = null;
  pageSize = 10;
  currentPage = 1;

  draggedCategoryIndex: number | null = null;
  dragOverCategoryIndex: number | null = null;
  editingOrderId: string | null = null;

  constructor(private api: ApiService, private toast: ToastService) {}

  ngOnInit(): void {
    this.loadCategories();
  }

  // Bulk Selection Methods
  get isAllSelected(): boolean {
    const list = this.paginatedCategories;
    return list.length > 0 && list.every(c => this.selectedIds.has(c.id));
  }

  get isIndeterminate(): boolean {
    const count = this.paginatedCategories.filter(c => this.selectedIds.has(c.id)).length;
    return count > 0 && count < this.paginatedCategories.length;
  }

  toggleSelectAll(event: any): void {
    const isChecked = event?.target?.checked;
    const list = this.paginatedCategories;
    if (isChecked) {
      list.forEach(c => this.selectedIds.add(c.id));
    } else {
      list.forEach(c => this.selectedIds.delete(c.id));
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

    this.api.post<any>('ContentApi/categories/bulk-delete', { ids, forceCascade: !this.cascadePages }).subscribe({
      next: (res) => {
        this.bulkDeleting = false;
        this.showBulkDeleteModal = false;
        this.selectedIds.clear();
        this.toast.success(res?.message || `${ids.length} category(ies) deleted successfully.`);
        this.loadCategories();
      },
      error: (err) => {
        this.bulkDeleting = false;
        this.toast.error(err?.error?.message || 'Failed to bulk delete categories.');
      }
    });
  }

  sortByZoneAndOrder(a: any, b: any): number {
    const zoneA = Number(a.menuPosition) || 2;
    const zoneB = Number(b.menuPosition) || 2;
    if (zoneA !== zoneB) {
      return zoneA - zoneB;
    }
    return (a.menuSortOrder || 0) - (b.menuSortOrder || 0);
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
    return this.categories.filter(c => (Number(c.menuPosition) || 2) === zone).length;
  }

  loadCategories(): void {
    this.loading = true;
    this.api.get<any>('ContentApi/categories').subscribe({
      next: (res) => {
        this.loading = false;
        this.categories = (res?.data || []).sort((a: any, b: any) => this.sortByZoneAndOrder(a, b));
        this.currentPage = 1;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  get filteredCategories(): any[] {
    let list = this.categories;
    if (this.selectedZoneFilter !== null) {
      list = list.filter(c => (Number(c.menuPosition) || 2) === this.selectedZoneFilter);
    }
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      list = list.filter(c => c.title?.toLowerCase().includes(term));
    }
    return list.slice().sort((a, b) => this.sortByZoneAndOrder(a, b));
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

  getGlobalIndex(localIndex: number): number {
    return (this.currentPage - 1) * this.pageSize + localIndex;
  }

  isFirstItem(localIndex: number): boolean {
    return this.getGlobalIndex(localIndex) === 0;
  }

  isLastItem(localIndex: number): boolean {
    return this.getGlobalIndex(localIndex) >= this.filteredCategories.length - 1;
  }

  startEditOrder(cat: any): void {
    this.editingOrderId = cat.id;
  }

  cancelEditOrder(): void {
    this.editingOrderId = null;
  }

  finishEditOrder(cat: any, newVal: string): void {
    this.editingOrderId = null;
    const parsed = parseInt(newVal, 10);
    if (isNaN(parsed) || parsed === cat.menuSortOrder) return;
    cat.menuSortOrder = parsed;
    this.categories.sort((a, b) => this.sortByZoneAndOrder(a, b));
    const payload = this.categories.map(c => ({ id: c.id, sortOrder: c.menuSortOrder || 0 }));
    this.savingCategoryOrder = true;
    this.api.put<any>('ContentApi/categories/reorder', payload).subscribe({
      next: () => {
        this.savingCategoryOrder = false;
        this.toast.success(`Sort order for '${cat.title}' updated to #${parsed}.`);
      },
      error: (err) => {
        this.savingCategoryOrder = false;
        this.toast.error(err?.error?.message || 'Failed to update category sort order.');
        this.loadCategories();
      }
    });
  }

  moveCategoryToTop(localIndex: number): void {
    const globalIdx = this.getGlobalIndex(localIndex);
    const list = [...this.filteredCategories];
    if (globalIdx <= 0 || globalIdx >= list.length) return;
    const [moved] = list.splice(globalIdx, 1);
    list.unshift(moved);
    this.applyAndSaveCategoryReorder(list);
  }

  moveCategoryUp(localIndex: number): void {
    const globalIdx = this.getGlobalIndex(localIndex);
    const list = [...this.filteredCategories];
    if (globalIdx <= 0 || globalIdx >= list.length) return;
    const temp = list[globalIdx];
    list[globalIdx] = list[globalIdx - 1];
    list[globalIdx - 1] = temp;
    this.applyAndSaveCategoryReorder(list);
  }

  moveCategoryDown(localIndex: number): void {
    const globalIdx = this.getGlobalIndex(localIndex);
    const list = [...this.filteredCategories];
    if (globalIdx < 0 || globalIdx >= list.length - 1) return;
    const temp = list[globalIdx];
    list[globalIdx] = list[globalIdx + 1];
    list[globalIdx + 1] = temp;
    this.applyAndSaveCategoryReorder(list);
  }

  onCategoryDragStart(event: DragEvent, localIndex: number): void {
    const globalIdx = this.getGlobalIndex(localIndex);
    this.draggedCategoryIndex = globalIdx;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', globalIdx.toString());
    }
  }

  onCategoryDragOver(event: DragEvent, localIndex: number): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    this.dragOverCategoryIndex = this.getGlobalIndex(localIndex);
  }

  onCategoryDragLeave(event: DragEvent, localIndex: number): void {
    const globalIdx = this.getGlobalIndex(localIndex);
    if (this.dragOverCategoryIndex === globalIdx) {
      this.dragOverCategoryIndex = null;
    }
  }

  onCategoryDrop(event: DragEvent, localIndex: number): void {
    event.preventDefault();
    this.dragOverCategoryIndex = null;
    const targetGlobalIdx = this.getGlobalIndex(localIndex);
    if (this.draggedCategoryIndex === null || this.draggedCategoryIndex === targetGlobalIdx) {
      this.draggedCategoryIndex = null;
      return;
    }
    const list = [...this.filteredCategories];
    const [moved] = list.splice(this.draggedCategoryIndex, 1);
    list.splice(targetGlobalIdx, 0, moved);
    this.draggedCategoryIndex = null;
    this.applyAndSaveCategoryReorder(list);
  }

  normalizeCategoryOrders(): void {
    const list = [...this.categories].sort((a, b) => this.sortByZoneAndOrder(a, b));
    this.applyAndSaveCategoryReorder(list, true);
  }

  applyAndSaveCategoryReorder(orderedList: any[], showNotice: boolean = false): void {
    const payload: Array<{ id: string; sortOrder: number }> = [];
    orderedList.forEach((cat, idx) => {
      const newOrder = (idx + 1) * 10;
      cat.menuSortOrder = newOrder;
      payload.push({ id: cat.id, sortOrder: newOrder });

      const master = this.categories.find(c => c.id === cat.id);
      if (master) master.menuSortOrder = newOrder;
    });

    this.categories.sort((a, b) => this.sortByZoneAndOrder(a, b));

    this.savingCategoryOrder = true;
    this.api.put<any>('ContentApi/categories/reorder', payload).subscribe({
      next: () => {
        this.savingCategoryOrder = false;
        if (showNotice) {
          this.toast.success('Categories re-spaced to 10, 20, 30, 40... successfully!');
        }
      },
      error: (err) => {
        this.savingCategoryOrder = false;
        this.toast.error(err?.error?.message || 'Failed to save category order.');
        this.loadCategories();
      }
    });
  }
}
