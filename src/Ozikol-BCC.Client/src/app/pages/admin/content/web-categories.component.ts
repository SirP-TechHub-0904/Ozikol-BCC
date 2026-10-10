import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-web-categories',
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
            <span class="current">Web Categories (Menu Dropdowns)</span>
          </div>
          <h1>Web Menu Categories</h1>
          <p class="subtitle">Organize pages into hierarchical header dropdowns and navigation groups.</p>
        </div>
        <div class="header-actions">
          <button type="button" class="btn btn-primary" (click)="openCreateModal()">
            <span class="material-symbols-outlined">add_circle</span>
            <span>New Category</span>
          </button>
          <button type="button" (click)="loadCategories()" class="btn btn-outline" [disabled]="loading">
            <span class="material-symbols-outlined" [class.spin]="loading">refresh</span>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <!-- Categories Table Card -->
      <div class="cms-card">
        <div class="card-header-bar">
          <div>
            <h3>Menu Navigation Categories</h3>
            <p class="card-sub">Categories manage navigation grouping on your public website.</p>
          </div>
          <input type="text" [(ngModel)]="searchTerm" placeholder="Search categories..." class="search-input">
        </div>

        <div class="table-responsive">
          <table class="cms-table">
            <thead>
              <tr>
                <th>TITLE</th>
                <th>MENU ZONE</th>
                <th>ICON</th>
                <th>ORDER</th>
                <th>ATTACHED PAGES</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let cat of filteredCategories">
                <td>
                  <strong>{{ cat.title }}</strong>
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
                    <button type="button" (click)="openEditModal(cat)" class="btn-edit" title="Edit Category">
                      <span class="material-symbols-outlined">edit</span>
                      <span>Edit</span>
                    </button>
                    <button type="button" (click)="openDeleteModal(cat)" class="btn-delete" title="Delete Category">
                      <span class="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="filteredCategories.length === 0">
                <td colspan="7" class="empty-cell">No categories found. Click "New Category" to create one.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Create Category Modal (Safe Backdrop: clicks outside DO NOT close) -->
      <div class="modal-backdrop" *ngIf="showCreateModal">
        <div class="modal-card">
          <div class="modal-header">
            <div class="modal-title-group">
              <span class="material-symbols-outlined text-blue">folder_open</span>
              <h3>Create Web Category</h3>
            </div>
            <button type="button" class="btn-close" (click)="closeCreateModal()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>CATEGORY TITLE *</label>
              <input type="text" [(ngModel)]="newCategory.title" class="form-control" placeholder="e.g., About Us Menu, Services">
            </div>
            <div class="form-row">
              <div class="form-group flex-1">
                <label>MENU ZONE POSITION *</label>
                <select [(ngModel)]="newCategory.menuPosition" class="form-control">
                  <option [ngValue]="1">First Zone (NavItems="first")</option>
                  <option [ngValue]="2">Middle Zone (NavItems="middle")</option>
                  <option [ngValue]="3">Last Zone (NavItems="last")</option>
                  <option [ngValue]="4">Top Utility Bar (MainMenuItems="top")</option>
                </select>
              </div>
              <div class="form-group flex-1">
                <label>MENU SORT ORDER</label>
                <input type="number" [(ngModel)]="newCategory.menuSortOrder" class="form-control">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group flex-1">
                <label>ICON CLASS</label>
                <input type="text" [(ngModel)]="newCategory.icon" class="form-control" placeholder="fa-solid fa-folder">
              </div>
              <div class="form-group flex-1">
                <label>CUSTOM CSS CLASS</label>
                <input type="text" [(ngModel)]="newCategory.customClass" class="form-control" placeholder="e.g. mega-dropdown">
              </div>
            </div>
            <div class="form-group">
              <label>PARENT CATEGORY (OPTIONAL)</label>
              <select [(ngModel)]="newCategory.parentId" class="form-control">
                <option [ngValue]="null">Top-Level (No Parent)</option>
                <option *ngFor="let c of categories" [ngValue]="c.id">{{ c.title }}</option>
              </select>
            </div>
            <div class="form-check">
              <input type="checkbox" [(ngModel)]="newCategory.publish" id="catPublish">
              <label for="catPublish">Publish in Navigation Bar</label>
            </div>
            <div class="error-box" *ngIf="errorMessage">{{ errorMessage }}</div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" (click)="closeCreateModal()">Cancel</button>
            <button type="button" class="btn btn-primary" (click)="saveNewCategory()" [disabled]="saving">
              <span *ngIf="!saving">Save & Create</span>
              <span *ngIf="saving">Saving...</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Edit Category Modal -->
      <div class="modal-backdrop" *ngIf="showEditModal && editingCategory">
        <div class="modal-card">
          <div class="modal-header">
            <div class="modal-title-group">
              <span class="material-symbols-outlined text-blue">edit_note</span>
              <h3>Edit Web Category</h3>
            </div>
            <button type="button" class="btn-close" (click)="closeEditModal()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>CATEGORY TITLE *</label>
              <input type="text" [(ngModel)]="editingCategory.title" class="form-control" placeholder="e.g., About Us Menu, Services">
            </div>
            <div class="form-row">
              <div class="form-group flex-1">
                <label>MENU ZONE POSITION *</label>
                <select [(ngModel)]="editingCategory.menuPosition" class="form-control">
                  <option [ngValue]="1">First Zone (NavItems="first")</option>
                  <option [ngValue]="2">Middle Zone (NavItems="middle")</option>
                  <option [ngValue]="3">Last Zone (NavItems="last")</option>
                  <option [ngValue]="4">Top Utility Bar (MainMenuItems="top")</option>
                </select>
              </div>
              <div class="form-group flex-1">
                <label>MENU SORT ORDER</label>
                <input type="number" [(ngModel)]="editingCategory.menuSortOrder" class="form-control">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group flex-1">
                <label>ICON CLASS</label>
                <input type="text" [(ngModel)]="editingCategory.icon" class="form-control" placeholder="fa-solid fa-folder">
              </div>
              <div class="form-group flex-1">
                <label>CUSTOM CSS CLASS</label>
                <input type="text" [(ngModel)]="editingCategory.customClass" class="form-control" placeholder="e.g. mega-dropdown">
              </div>
            </div>
            <div class="form-group">
              <label>PARENT CATEGORY (OPTIONAL)</label>
              <select [(ngModel)]="editingCategory.parentId" class="form-control">
                <option [ngValue]="null">Top-Level (No Parent)</option>
                <option *ngFor="let c of categories" [ngValue]="c.id" [disabled]="c.id === editingCategory.id">{{ c.title }}</option>
              </select>
            </div>
            <div class="form-check">
              <input type="checkbox" [(ngModel)]="editingCategory.publish" id="catEditPublish">
              <label for="catEditPublish">Publish in Navigation Bar</label>
            </div>
            <div class="error-box" *ngIf="editErrorMessage">{{ editErrorMessage }}</div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" (click)="closeEditModal()">Cancel</button>
            <button type="button" class="btn btn-primary" (click)="saveEditCategory()" [disabled]="editSaving">
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
      background: var(--md-sys-color-surface, #fff); padding: 24px 28px; border-radius: 16px;
      border: 1px solid var(--md-sys-color-outline, #e2e8f0);
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
    .btn-danger { background: #dc2626; color: #fff; border: none; }
    .btn-danger:disabled { background: #fca5a5; cursor: not-allowed; }

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

    .cms-card {
      background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px;
    }
    .card-header-bar {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;
    }
    .card-header-bar h3 { font-size: 18px; font-weight: 800; color: #0f172a; margin: 0; }
    .card-sub { font-size: 13px; color: #64748b; margin: 4px 0 0; }
    .search-input {
      padding: 8px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; width: 220px;
    }

    .cms-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .cms-table th {
      text-align: left; padding: 12px; background: #f8fafc; color: #64748b;
      font-weight: 700; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-transform: uppercase;
    }
    .cms-table td { padding: 14px 12px; border-bottom: 1px solid #f1f5f9; }
    .sub-text { font-size: 11px; color: #64748b; }
    .icon-chip { font-size: 12px; background: #f1f5f9; padding: 4px 8px; border-radius: 6px; }
    .pages-badge { padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; background: #f1f5f9; color: #64748b; }
    .pages-badge.has-pages { background: #eff6ff; color: #0050e5; }
    .status-pill { padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; }
    .status-pill.published { background: #dcfce7; color: #15803d; }
    .status-pill.draft { background: #f1f5f9; color: #64748b; }

    .action-buttons { display: flex; gap: 8px; align-items: center; }
    .btn-edit {
      display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px;
      background: #eff6ff; color: #0050e5; border-radius: 6px; font-size: 12px; font-weight: 600; text-decoration: none;
    }
    .btn-edit:hover { background: #0050e5; color: #fff; }
    .btn-delete {
      background: #fee2e2; color: #dc2626; border: none; padding: 6px;
      border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center;
    }
    .btn-delete:hover { background: #dc2626; color: #fff; }

    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center; z-index: 2000;
    }
    .modal-card {
      background: #fff; border-radius: 16px; width: 100%; max-width: 520px;
      box-shadow: 0 25px 60px rgba(0,0,0,0.3); overflow: hidden;
    }
    .modal-header {
      padding: 18px 24px; display: flex; justify-content: space-between; align-items: center;
      border-bottom: 1px solid #e2e8f0;
    }
    .modal-title-group { display: flex; align-items: center; gap: 10px; }
    .modal-title-group h3 { margin: 0; font-size: 17px; font-weight: 800; }
    .btn-close { background: none; border: none; font-size: 20px; cursor: pointer; color: #64748b; }
    .modal-body { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
    .modal-footer { padding: 16px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 10px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group label { font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; }
    .form-control { padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; }
    .form-row { display: flex; gap: 12px; }
    .form-check { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; }
    .error-box { background: #fee2e2; color: #991b1b; padding: 10px; border-radius: 8px; font-size: 12px; font-weight: 600; }
    
    .zone-badge { padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    .zone-badge.zone-first { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
    .zone-badge.zone-middle { background: #f5f3ff; color: #6d28d9; border: 1px solid #ddd6fe; }
    .zone-badge.zone-last { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
    .zone-badge.zone-top { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }

    .warning-banner { display: flex; align-items: center; gap: 8px; background: #fee2e2; color: #dc2626; padding: 10px 14px; border-radius: 8px; font-size: 13px; margin-bottom: 12px; }
    .attached-pages-list { list-style: none; padding: 0; margin: 10px 0; max-height: 140px; overflow-y: auto; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; }
    .attached-pages-list li { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; font-weight: 600; color: #334155; }
    .instruction-box { background: #f8fafc; border: 1px dashed #cbd5e1; padding: 12px; border-radius: 8px; font-size: 13px; margin-bottom: 12px; }
    .confirm-input { border: 2px solid #dc2626; }
    .text-danger { color: #dc2626; }
    .text-blue { color: #0050e5; }
  `]
})
export class WebCategoriesComponent implements OnInit {
  loading = false;
  saving = false;
  deleting = false;
  categories: any[] = [];
  searchTerm = '';
  errorMessage = '';

  // Create Modal
  showCreateModal = false;
  newCategory = {
    title: '',
    menuPosition: 2,
    menuSortOrder: 0,
    customClass: '',
    publish: true,
    parentId: null,
    icon: 'fa-solid fa-folder',
    homeSortFrom: 0
  };

  // Edit Modal
  showEditModal = false;
  editSaving = false;
  editErrorMessage = '';
  editingCategory: any = null;

  // Delete Modal
  showDeleteModal = false;
  deletingCategory: any = null;
  deleteConfirmationInput = '';
  deleteErrorMessage = '';

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

  openCreateModal(): void {
    this.newCategory = {
      title: '',
      menuPosition: 2,
      menuSortOrder: this.categories.length + 1,
      customClass: '',
      publish: true,
      parentId: null,
      icon: 'fa-solid fa-folder',
      homeSortFrom: 0
    };
    this.errorMessage = '';
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
  }

  saveNewCategory(): void {
    if (!this.newCategory.title.trim()) {
      this.errorMessage = 'Category Title is required.';
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.api.post<any>('ContentApi/categories', this.newCategory).subscribe({
      next: () => {
        this.saving = false;
        this.showCreateModal = false;
        this.loadCategories();
      },
      error: (err) => {
        this.saving = false;
        this.errorMessage = err?.error?.message || 'Failed to create category.';
      }
    });
  }

  openEditModal(cat: any): void {
    this.editingCategory = {
      id: cat.id,
      title: cat.title || '',
      menuPosition: cat.menuPosition ? Number(cat.menuPosition) : 2,
      menuSortOrder: cat.menuSortOrder || 0,
      customClass: cat.customClass || '',
      publish: cat.publish !== false,
      parentId: cat.parentId || null,
      icon: cat.icon || 'fa-solid fa-folder'
    };
    this.editErrorMessage = '';
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.editingCategory = null;
  }

  saveEditCategory(): void {
    if (!this.editingCategory || !this.editingCategory.title.trim()) {
      this.editErrorMessage = 'Category Title is required.';
      return;
    }

    this.editSaving = true;
    this.editErrorMessage = '';
    this.api.put<any>(`ContentApi/categories/${this.editingCategory.id}`, this.editingCategory).subscribe({
      next: () => {
        this.editSaving = false;
        this.showEditModal = false;
        this.editingCategory = null;
        this.loadCategories();
      },
      error: (err) => {
        this.editSaving = false;
        this.editErrorMessage = err?.error?.message || 'Failed to update category.';
      }
    });
  }

  openDeleteModal(cat: any): void {
    this.deletingCategory = cat;
    this.deleteConfirmationInput = '';
    this.deleteErrorMessage = '';
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.deletingCategory = null;
  }

  confirmDeleteCategory(): void {
    if (!this.deletingCategory) return;
    this.deleting = true;
    this.deleteErrorMessage = '';

    this.api.delete<any>(`ContentApi/categories/${this.deletingCategory.id}?confirmationTitle=${encodeURIComponent(this.deleteConfirmationInput)}`).subscribe({
      next: () => {
        this.deleting = false;
        this.showDeleteModal = false;
        this.loadCategories();
      },
      error: (err) => {
        this.deleting = false;
        this.deleteErrorMessage = err?.error?.message || 'Failed to delete category.';
      }
    });
  }
}
