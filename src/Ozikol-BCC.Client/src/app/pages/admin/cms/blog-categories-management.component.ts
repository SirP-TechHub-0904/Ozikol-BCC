import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { getSavedPageSize, savePageSizePreference } from '../../../core/utils/pagination-storage.util';

@Component({
  selector: 'app-blog-categories-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="cms-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">Blog & Article Categories</h1>
          <p class="page-sub">Manage topical categories, news groupings, and editorial taxonomy.</p>
        </div>
        <button type="button" class="btn-primary" (click)="openCreateModal()" [disabled]="!canEdit">
          <span class="material-symbols-outlined">add_circle</span>
          <span>Add Blog Category</span>
        </button>
      </div>

      <!-- Categories Table Card -->
      <div class="table-card">
        <div class="card-head">
          <div class="search-box">
            <span class="material-symbols-outlined">search</span>
            <input type="text" [(ngModel)]="searchQuery" placeholder="Search categories..." />
          </div>
          <span class="count-badge">{{ filteredCategories.length }} Categories</span>
        </div>

        <!-- Bulk Action Bar -->
        <div class="bulk-action-bar" *ngIf="selectedIds.size > 0">
          <div class="bulk-info">
            <span class="material-symbols-outlined text-primary">check_circle</span>
            <span><strong>{{ selectedIds.size }}</strong> category{{ selectedIds.size > 1 ? 'ies' : '' }} selected</span>
          </div>
          <div class="bulk-buttons">
            <button type="button" class="btn btn-sm btn-outline" (click)="clearSelection()">Deselect All</button>
            <button type="button" class="btn btn-sm btn-danger" (click)="openBulkDeleteModal()" [disabled]="!canEdit">
              <span class="material-symbols-outlined fs-6">delete_sweep</span>
              <span>Delete Selected ({{ selectedIds.size }})</span>
            </button>
          </div>
        </div>

        <div class="table-wrap">
          <table class="data-table">
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
                <th>Category Name</th>
                <th>Parent Category</th>
                <th>Articles Count</th>
                <th>Visibility</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let cat of paginatedCategories" [class.selected-row]="isSelected(cat.id)">
                <td style="width: 44px; text-align: center;">
                  <input
                    type="checkbox"
                    class="cms-checkbox"
                    [checked]="isSelected(cat.id)"
                    (change)="toggleSelection(cat.id)"
                  >
                </td>
                <td>
                  <div class="cat-name-cell">
                    <span class="material-symbols-outlined text-purple">folder</span>
                    <strong>{{ cat.title }}</strong>
                  </div>
                </td>
                <td>{{ cat.parentTitle || '— (Root Category)' }}</td>
                <td>
                  <span class="post-count-badge">{{ cat.postCount || 0 }} Posts</span>
                </td>
                <td>
                  <span class="status-chip" [class.published]="cat.publish" [class.draft]="!cat.publish">
                    {{ cat.publish ? 'Published' : 'Hidden' }}
                  </span>
                </td>
                <td style="text-align: right;">
                  <div class="actions-group">
                    <button type="button" class="btn-icon edit" (click)="openEditModal(cat)" [disabled]="!canEdit" title="Edit Category">
                      <span class="material-symbols-outlined">edit</span>
                    </button>
                    <a [routerLink]="canEdit ? ['/content/console/blog-categories/delete', cat.id] : null" class="btn-icon delete" [class.disabled-btn]="!canEdit" title="Delete Category">
                      <span class="material-symbols-outlined">delete</span>
                    </a>
                  </div>
                </td>
              </tr>
              <tr *ngIf="!filteredCategories.length && !loading">
                <td colspan="6" class="empty-row">No blog categories found.</td>
              </tr>
              <tr *ngIf="loading">
                <td colspan="6" class="empty-row">Loading categories...</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Built-In Pagination Toolbar -->
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

      <!-- Create / Edit Modal -->
      <div class="modal-backdrop" *ngIf="showModal">
        <div class="modal-card">
          <div class="modal-head">
            <div class="modal-title">
              <span class="material-symbols-outlined text-purple">{{ isEditing ? 'edit' : 'add_circle' }}</span>
              <h3>{{ isEditing ? 'Edit Blog Category' : 'Create New Blog Category' }}</h3>
            </div>
            <button type="button" class="btn-close" (click)="closeModal()">✕</button>
          </div>

          <form (ngSubmit)="saveCategory()">
            <div class="form-body">
              <div class="form-group">
                <label>Category Title <span class="req">*</span></label>
                <input type="text" [(ngModel)]="currentCat.title" name="title" required placeholder="e.g. Technology & Innovation" class="form-input" />
              </div>

              <div class="form-group">
                <label>Parent Category (Optional)</label>
                <select [(ngModel)]="currentCat.parentId" name="parentId" class="form-input">
                  <option [ngValue]="null">-- None (Top Level) --</option>
                  <option *ngFor="let p of parentOptions" [ngValue]="p.id">{{ p.title }}</option>
                </select>
              </div>

              <div class="form-group checkbox-group">
                <label class="check-label">
                  <input type="checkbox" [(ngModel)]="currentCat.publish" name="publish" />
                  <span>Publish category and show on public website</span>
                </label>
              </div>

              <div *ngIf="modalError" class="modal-error">{{ modalError }}</div>
            </div>

            <div class="modal-foot">
              <button type="button" class="btn-secondary" (click)="closeModal()">Cancel</button>
              <button type="submit" class="btn-primary" [disabled]="saving || !currentCat.title">
                <span class="material-symbols-outlined">{{ saving ? 'hourglass_top' : 'save' }}</span>
                <span>{{ saving ? 'Saving...' : (isEditing ? 'Save Changes' : 'Create Category') }}</span>
              </button>
            </div>
          </form>
        </div>
        <!-- Bulk Delete Confirmation Modal -->
        <div class="modal-backdrop" *ngIf="showBulkDeleteModal">
          <div class="modal-card">
            <div class="modal-header">
              <div class="modal-title-group">
                <span class="material-symbols-outlined text-danger">delete_sweep</span>
                <h3>Delete {{ selectedIds.size }} Blog Categor{{ selectedIds.size > 1 ? 'ies' : 'y' }}?</h3>
              </div>
              <button type="button" class="btn-close" (click)="closeBulkDeleteModal()">&times;</button>
            </div>
            <div class="modal-body">
              <p style="margin: 0; font-size: 14px; color: #334155; line-height: 1.6;">
                Are you sure you want to permanently delete the <strong>{{ selectedIds.size }}</strong> selected blog category(ies)?
              </p>
              <div class="force-cascade-check">
                <label class="custom-check-label">
                  <input type="checkbox" [(ngModel)]="unlinkBlogs" class="cms-checkbox">
                  <span>
                    <strong>Unlink Articles:</strong> Safely unassign attached articles so they become uncategorized.
                  </span>
                </label>
              </div>
              <div class="warning-callout">
                <span class="material-symbols-outlined text-danger" style="font-size: 20px;">warning</span>
                <div style="font-size: 12.5px; color: #991b1b; line-height: 1.5;">
                  Category taxonomy and article grouping filters will be permanently removed.
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
      margin: 16px 20px 0;
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
    .btn-outline {
      border: 1px solid #cbd5e1;
      background: #fff;
      color: #334155;
      cursor: pointer;
    }
    .btn-outline:hover {
      background: #f8fafc;
    }
    .btn-danger {
      background: #dc2626;
      color: #fff;
      border: none;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn-danger:hover {
      background: #b91c1c;
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
    .cms-container { display: flex; flex-direction: column; gap: 20px; }
    .page-header { display: flex; justify-content: space-between; align-items: center; }
    .page-title { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 4px; }
    .page-sub { font-size: 13px; color: #64748b; margin: 0; }

    .btn-primary {
      background: linear-gradient(135deg, #0050e5, #1f6bff);
      color: #ffffff;
      border: none;
      border-radius: 8px;
      padding: 10px 18px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 4px 12px rgba(0, 80, 229, 0.3);
      text-decoration: none;
    }
    .btn-primary:hover:not(:disabled) { transform: translateY(-1px); }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

    .table-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.02);
      overflow: hidden;
    }
    .card-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
    }
    .search-box {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 6px 12px;
      width: 260px;
    }
    .search-box span { font-size: 18px; color: #64748b; }
    .search-box input { border: none; outline: none; font-size: 13px; width: 100%; color: #0f172a; }
    .count-badge { font-size: 12px; font-weight: 700; color: #64748b; background: #f1f5f9; padding: 4px 10px; border-radius: 12px; }

    .table-wrap { overflow-x: auto; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
    .data-table th {
      text-align: left;
      padding: 10px 14px;
      font-size: 11.5px;
      font-weight: 800;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #e2e8f0;
    }
    .data-table td { padding: 14px; border-bottom: 1px solid #f1f5f9; color: #1e293b; vertical-align: middle; }

    .cat-name-cell { display: flex; align-items: center; gap: 8px; }
    .post-count-badge { font-size: 11px; font-weight: 700; color: #64748b; background: #f1f5f9; padding: 3px 8px; border-radius: 6px; }
    .status-chip {
      display: inline-flex;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
    }
    .status-chip.published { background: rgba(34, 197, 94, 0.12); color: #16a34a; }
    .status-chip.draft { background: rgba(100, 116, 139, 0.12); color: #64748b; }

    .actions-group { display: flex; justify-content: flex-end; gap: 6px; }
    .btn-icon {
      background: none;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: #64748b;
      transition: all 0.2s;
      text-decoration: none;
      box-sizing: border-box;
    }
    .btn-icon:hover:not(:disabled):not(.disabled-btn) { background: #f8fafc; color: #0f172a; }
    .btn-icon:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-icon.disabled-btn {
      opacity: 0.5;
      cursor: not-allowed;
      pointer-events: none;
    }

    .empty-row { text-align: center; padding: 30px; color: #94a3b8; }

    /* Modal Styles */
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(15, 23, 42, 0.4);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.2s ease-out;
    }
    .modal-card {
      background: #ffffff;
      border-radius: 16px;
      width: 460px;
      max-width: 90%;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      overflow: hidden;
      animation: scaleIn 0.2s ease-out;
    }
    .modal-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 18px 24px;
      border-bottom: 1px solid #e2e8f0;
    }
    .modal-title { display: flex; align-items: center; gap: 8px; }
    .modal-title h3 { margin: 0; font-size: 16px; font-weight: 800; color: #0f172a; }
    .btn-close { background: none; border: none; font-size: 16px; cursor: pointer; color: #64748b; }
    .form-body { padding: 20px 24px; display: flex; flex-direction: column; gap: 14px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group label { font-size: 12px; font-weight: 700; color: #334155; text-transform: uppercase; }
    .form-group label .req { color: #ef4444; }
    .form-input {
      padding: 10px 12px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 13.5px;
      outline: none;
    }
    .form-input:focus { border-color: #0050e5; box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.1); }
    .checkbox-group { margin-top: 4px; }
    .check-label { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; cursor: pointer; }
    .modal-foot {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding: 16px 24px;
      border-top: 1px solid #e2e8f0;
      background: #f8fafc;
    }
    .btn-secondary {
      background: #ffffff;
      color: #475569;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 9px 18px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
    }
    .btn-secondary:hover { background: #f8fafc; }
    .modal-error { color: #ef4444; font-size: 12.5px; font-weight: 700; }
    .text-purple { color: #9333ea; }

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
      border-bottom-left-radius: 12px;
      border-bottom-right-radius: 12px;
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
  `]
})
export class BlogCategoriesManagementComponent implements OnInit {
  bulkDeleting = false;
  showBulkDeleteModal = false;
  unlinkBlogs = true;
  selectedIds = new Set<string>();
  categories: any[] = [];
  searchQuery = '';
  loading = false;
  saving = false;
  showModal = false;
  isEditing = false;
  modalError = '';
  canEdit = false;
  pageSize = getSavedPageSize('cms_blog_categories', 10);
  currentPage = 1;

  currentCat: any = {
    id: null,
    title: '',
    publish: true,
    parentId: null
  };

  constructor(
    private api: ApiService,
    private toast: ToastService
  ) {}

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

    this.api.post<any>('ContentApi/blog-categories/bulk-delete', { ids, unlinkBlogs: this.unlinkBlogs }).subscribe({
      next: (res) => {
        this.bulkDeleting = false;
        this.showBulkDeleteModal = false;
        this.selectedIds.clear();
        this.toast.success(res?.message || `${ids.length} category(ies) deleted successfully.`);
        this.loadCategories();
      },
      error: (err) => {
        this.bulkDeleting = false;
        this.toast.error(err?.error?.message || 'Failed to bulk delete blog categories.');
      }
    });
  }

  ngOnInit(): void {
    this.checkPermissions();
    this.loadCategories();
  }

  getUserId(): string {
    const token = localStorage.getItem('access_token');
    if (!token) return '';
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        return payload.sub || payload.nameid || payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || '';
      }
    } catch {}
    return '';
  }

  checkPermissions(): void {
    const userId = this.getUserId();
    const rolesJson = localStorage.getItem('user_roles');
    let isAdminOrSuper = false;
    if (rolesJson) {
      try {
        const roles: string[] = JSON.parse(rolesJson);
        isAdminOrSuper = roles.some(r => ['superadmin', 'admin', 'systemadministrator'].includes(r.toLowerCase()));
      } catch {}
    }

    if (isAdminOrSuper) {
      this.canEdit = true;
    } else if (userId) {
      this.api.get<any>(`IdentityApi/users/${userId}/feature-roles`).subscribe({
        next: (res) => {
          if (res && res.data) {
            const roles = res.data.featureRoles || [];
            const cmsRole = roles.find((r: any) => r.featureName?.toLowerCase() === 'cms' || r.featureName?.toLowerCase() === 'blog');
            const hasGlobalEdit = roles.some((r: any) => r.scope === 'GlobalEdit');
            const hasFeatureEdit = cmsRole && cmsRole.scope === 'FeatureEdit';
            
            this.canEdit = res.data.isAdmin || hasGlobalEdit || hasFeatureEdit;
          }
        },
        error: () => {
          this.canEdit = false;
        }
      });
    }
  }

  get filteredCategories(): any[] {
    if (!this.searchQuery) return this.categories;
    const q = this.searchQuery.toLowerCase();
    return this.categories.filter(c => c.title?.toLowerCase().includes(q));
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
    this.pageSize = savePageSizePreference('cms_blog_categories', this.pageSize, 10);
    this.currentPage = 1;
  }

  onSearchChange(): void {
    this.currentPage = 1;
  }

  getEndIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredCategories.length);
  }

  get parentOptions(): any[] {
    if (!this.isEditing) return this.categories;
    return this.categories.filter(c => c.id !== this.currentCat.id);
  }

  loadCategories(): void {
    this.loading = true;
    this.api.get<any>('ContentApi/blog-categories').subscribe({
      next: (res) => {
        this.loading = false;
        this.categories = res?.data || [];
      },
      error: () => {
        this.loading = false;
        this.toast.error('Failed to load blog categories.');
      }
    });
  }

  openCreateModal(): void {
    if (!this.canEdit) return;
    this.isEditing = false;
    this.modalError = '';
    this.currentCat = { id: null, title: '', publish: true, parentId: null };
    this.showModal = true;
  }

  openEditModal(cat: any): void {
    if (!this.canEdit) return;
    this.isEditing = true;
    this.modalError = '';
    this.currentCat = { ...cat };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  saveCategory(): void {
    if (!this.canEdit || !this.currentCat.title) return;
    this.saving = true;
    this.modalError = '';

    const obs = this.isEditing
      ? this.api.put<any>(`ContentApi/blog-categories/${this.currentCat.id}`, this.currentCat)
      : this.api.post<any>('ContentApi/blog-categories', this.currentCat);

    obs.subscribe({
      next: () => {
        this.saving = false;
        this.showModal = false;
        this.toast.success(
          this.isEditing ? 'Category updated successfully.' : 'Category created successfully.',
          'CMS Success'
        );
        this.loadCategories();
      },
      error: (err) => {
        this.saving = false;
        this.modalError = err?.error?.message || 'Failed to save blog category.';
      }
    });
  }
}
