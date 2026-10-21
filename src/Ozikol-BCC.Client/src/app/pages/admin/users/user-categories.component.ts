import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent, PageHeaderButton } from '../../../shared/components/page-header/page-header.component';

/**
 * Enterprise List Table component for managing tenant organizational categories and departments.
 * Replaces the previous card grid layout per user requirement.
 */
@Component({
  selector: 'app-user-categories',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent],
  template: `
    <div class="categories-page">
      <!-- Standardized Page Header -->
      <app-page-header
        eyebrow="ORGANIZATIONAL HIERARCHY"
        icon="corporate_fare"
        title="User Categories & Departments"
        subtitle="Manage organizational departments, business units, and member classification tiers in an enterprise table."
        [buttons]="headerButtons"
        [loading]="isLoading"
      ></app-page-header>

      <!-- Search & Summary Filter Toolbar -->
      <div class="table-toolbar-card">
        <div class="search-input-wrap">
          <span class="material-symbols-outlined search-icon">search</span>
          <input
            type="text"
            [(ngModel)]="searchQuery"
            (ngModelChange)="applyFilter()"
            placeholder="Search categories or departments..."
          />
          <button *ngIf="searchQuery" (click)="searchQuery=''; applyFilter()" class="clear-btn">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="toolbar-meta">
          <span>Showing <strong>{{ filteredCategories.length }}</strong> of <strong>{{ categories.length }}</strong> categories</span>
        </div>
      </div>

      <!-- Categories Enterprise List Table -->
      <div class="table-container" *ngIf="!isLoading">
        <table class="data-table">
          <thead>
            <tr>
              <th style="min-width: 240px;">Category / Department</th>
              <th style="width: 140px; text-align: center;">Members</th>
              <th style="width: 120px; text-align: center;">Sort Order</th>
              <th style="width: 150px; text-align: center;">Status</th>
              <th style="width: 160px; text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let cat of filteredCategories">
              <!-- Name & Description -->
              <td>
                <div class="category-info-cell">
                  <div class="category-icon-box">
                    <span class="material-symbols-outlined">folder_shared</span>
                  </div>
                  <div class="category-text">
                    <a [routerLink]="['/users/console/categories/edit', cat.id]" class="cat-name-link">
                      {{ cat.name }}
                    </a>
                    <div class="cat-description-text" *ngIf="cat.description">
                      {{ cat.description }}
                    </div>
                  </div>
                </div>
              </td>

              <!-- Member Headcount -->
              <td style="text-align: center;">
                <a routerLink="/admin/users/list" [queryParams]="{ category: cat.id }" class="headcount-badge" title="View all members in this category">
                  <span class="material-symbols-outlined" style="font-size: 15px;">groups</span>
                  <strong>{{ cat.memberCount || 0 }}</strong>
                  <span>{{ (cat.memberCount === 1) ? 'member' : 'members' }}</span>
                </a>
              </td>

              <!-- Sort Order -->
              <td style="text-align: center;">
                <span class="sort-order-pill">#{{ cat.sortOrder || 0 }}</span>
              </td>

              <!-- Publication Status -->
              <td style="text-align: center;">
                <span class="status-badge" [class.active-status]="cat.isActive !== false" [class.draft-status]="cat.isActive === false">
                  <span class="status-dot"></span>
                  <span>{{ (cat.isActive !== false) ? 'Published' : 'Unpublished' }}</span>
                </span>
              </td>

              <!-- Action Buttons -->
              <td style="text-align: right;">
                <div class="row-actions-group">
                  <a routerLink="/admin/users/list" [queryParams]="{ category: cat.id }" class="btn-action btn-members" title="View Category Members">
                    <span class="material-symbols-outlined">group</span>
                    <span>Members</span>
                  </a>
                  <a [routerLink]="['/users/console/categories/edit', cat.id]" class="btn-action btn-edit" title="Edit Category">
                    <span class="material-symbols-outlined">edit</span>
                    <span>Edit</span>
                  </a>
                  <a [routerLink]="['/users/console/categories/delete', cat.id]" class="btn-action btn-delete" title="Delete Category">
                    <span class="material-symbols-outlined">delete</span>
                  </a>
                </div>
              </td>
            </tr>

            <!-- Empty Table State -->
            <tr *ngIf="filteredCategories.length === 0">
              <td colspan="5" class="empty-table-cell">
                <span class="material-symbols-outlined empty-icon">corporate_fare</span>
                <p *ngIf="categories.length === 0">No user categories or departments have been configured yet.</p>
                <p *ngIf="categories.length > 0">No categories matching "{{ searchQuery }}".</p>
                <a *ngIf="categories.length === 0" routerLink="/users/console/categories/create" class="btn btn-primary btn-sm" style="margin-top: 8px;">
                  <span class="material-symbols-outlined">add</span> Create First Category
                </a>
                <button *ngIf="categories.length > 0" (click)="searchQuery=''; applyFilter()" class="btn btn-outline btn-sm" style="margin-top: 8px;">
                  Clear Search
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .categories-page { display: flex; flex-direction: column; gap: 18px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; width: 100%; }

    /* Search Toolbar */
    .table-toolbar-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
    }
    @media (max-width: 640px) {
      .table-toolbar-card { flex-direction: column; align-items: stretch; }
    }
    .search-input-wrap {
      position: relative;
      display: flex;
      align-items: center;
      flex: 1;
      max-width: 420px;
    }
    .search-icon {
      position: absolute;
      left: 12px;
      font-size: 18px;
      color: #94a3b8;
      pointer-events: none;
    }
    .search-input-wrap input {
      width: 100%;
      height: 38px;
      padding: 0 34px 0 38px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 13px;
      outline: none;
      background: #fafbfc;
      color: #0f172a;
      transition: all 0.15s ease;
    }
    .search-input-wrap input:focus {
      background: #ffffff;
      border-color: #0050e5;
      box-shadow: 0 0 0 3px rgba(0,80,229,0.1);
    }
    .clear-btn {
      position: absolute;
      right: 10px;
      background: none;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      padding: 0;
      display: flex;
      align-items: center;
    }
    .clear-btn span { font-size: 16px; }
    .toolbar-meta { font-size: 12px; color: #64748b; }
    .toolbar-meta strong { color: #0f172a; }

    /* Table Container */
    .table-container {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow-x: auto;
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 13px;
    }
    .data-table thead th {
      background: #fafbfc;
      padding: 12px 18px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
      border-bottom: 1px solid #e2e8f0;
      white-space: nowrap;
    }
    .data-table tbody td {
      padding: 14px 18px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
      color: #334155;
    }
    .data-table tbody tr:last-child td {
      border-bottom: none;
    }
    .data-table tbody tr:hover {
      background: #f8fafc;
    }

    /* Category Cell */
    .category-info-cell {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .category-icon-box {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: rgba(0,80,229,0.08);
      color: #0050e5;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .category-icon-box span { font-size: 20px; }
    .category-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    .cat-name-link {
      font-weight: 700;
      color: #0f172a;
      text-decoration: none;
      font-size: 13.5px;
    }
    .cat-name-link:hover {
      color: #0050e5;
    }
    .cat-description-text {
      font-size: 11.5px;
      color: #64748b;
      line-height: 1.35;
      white-space: normal;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    /* Headcount Badge */
    .headcount-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 10px;
      border-radius: 9999px;
      background: #f1f5f9;
      color: #334155;
      font-size: 11.5px;
      text-decoration: none;
      transition: all 0.15s ease;
    }
    .headcount-badge strong { color: #0050e5; font-weight: 700; }
    .headcount-badge:hover {
      background: #e0e7ff;
      color: #0050e5;
    }

    /* Sort Order Pill */
    .sort-order-pill {
      font-family: monospace;
      font-weight: 700;
      font-size: 12px;
      color: #64748b;
      background: #f8fafc;
      padding: 2px 8px;
      border-radius: 4px;
      border: 1px solid #e2e8f0;
      display: inline-block;
    }

    /* Status Badge */
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 10px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }
    .status-badge.active-status {
      background: #dcfce7;
      color: #15803d;
    }
    .status-badge.active-status .status-dot {
      background: #16a34a;
    }
    .status-badge.draft-status {
      background: #f1f5f9;
      color: #64748b;
    }
    .status-badge.draft-status .status-dot {
      background: #94a3b8;
    }

    /* Actions Group */
    .row-actions-group {
      display: inline-flex;
      align-items: center;
      justify-content: flex-end;
      gap: 6px;
    }
    .btn-action {
      height: 30px;
      padding: 0 10px;
      border-radius: 6px;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      color: #334155;
      font-size: 11.5px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      text-decoration: none;
      transition: all 0.15s ease;
    }
    .btn-action span.material-symbols-outlined { font-size: 15px; }
    .btn-action:hover {
      background: #f1f5f9;
      color: #0f172a;
    }
    .btn-members:hover {
      border-color: #0050e5;
      color: #0050e5;
    }
    .btn-edit:hover {
      border-color: #0050e5;
      color: #0050e5;
    }
    .btn-delete {
      padding: 0 8px;
    }
    .btn-delete:hover {
      border-color: #ef4444;
      color: #ef4444;
      background: #fef2f2;
    }

    /* Empty Table Cell */
    .empty-table-cell {
      padding: 48px 24px !important;
      text-align: center;
      color: #64748b;
    }
    .empty-icon { font-size: 44px; color: #cbd5e1; margin-bottom: 8px; }
    .empty-table-cell p { margin: 0 0 10px; font-size: 13.5px; }

    .btn { height: 38px; padding: 0 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 6px; text-decoration: none; border: 1px solid transparent; }
    .btn-outline { background: #ffffff; border-color: #cbd5e1; color: #334155; }
    .btn-outline:hover { background: #f1f5f9; color: #0f172a; }
    .btn-primary { background: #0050e5; color: #ffffff; }
    .btn-primary:hover { background: #0040b8; }
    .btn-sm { height: 34px; padding: 0 12px; font-size: 12px; }
  `]
})
export class UserCategoriesComponent implements OnInit {
  isLoading = false;
  categories: any[] = [];
  filteredCategories: any[] = [];
  searchQuery = '';

  headerButtons: PageHeaderButton[] = [
    {
      text: 'User Directory',
      icon: 'groups',
      isPrimary: false,
      routerLink: '/admin/users/list'
    },
    {
      text: 'Create Category',
      icon: 'add',
      isPrimary: true,
      routerLink: '/users/console/categories/create'
    }
  ];

  constructor(
    private api: ApiService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.isLoading = true;
    this.api.get<any>('UsersApi/categories').subscribe({
      next: (res) => {
        this.isLoading = false;
        this.categories = res.data || [];
        this.applyFilter();
      },
      error: () => {
        this.isLoading = false;
        this.toast.error('Failed to load user categories.');
      }
    });
  }

  applyFilter(): void {
    if (!this.searchQuery.trim()) {
      this.filteredCategories = [...this.categories];
      return;
    }
    const q = this.searchQuery.toLowerCase().trim();
    this.filteredCategories = this.categories.filter(c =>
      c.name?.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q)
    );
  }
}
