import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { ExportService, ExportColumn } from '../../../core/services/export.service';
import { PageHeaderComponent, PageHeaderButton } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent],
  template: `
    <div class="users-list-page">
      <!-- Standardized Page Header -->
      <app-page-header
        eyebrow="USER MANAGEMENT & DIRECTORY"
        icon="groups"
        title="Member Directory & Register"
        subtitle="Search, filter, paginate, and export official membership rolls across organizational category tiers."
        [buttons]="headerButtons"
        [loading]="isLoading"
      ></app-page-header>

      <!-- Filter & Export Action Toolbar with Pixel-Perfect Alignment Grid -->
      <div class="filter-export-card">
        <div class="filter-grid-row">
          <!-- 1. Search Box -->
          <div class="filter-group">
            <label>Search Members</label>
            <div class="search-input-wrap">
              <span class="material-symbols-outlined search-icon">search</span>
              <input
                type="text"
                [(ngModel)]="searchQuery"
                (ngModelChange)="applyFilters()"
                placeholder="Search by name, email, ID, or category..."
              />
              <button *ngIf="searchQuery" (click)="searchQuery=''; applyFilters()" class="clear-btn">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>
          </div>

          <!-- 2. Category Filter -->
          <div class="filter-group">
            <label>Category Tier</label>
            <select [(ngModel)]="selectedCategoryFilter" (change)="applyFilters()">
              <option value="">All Categories</option>
              <option *ngFor="let cat of categories" [value]="cat.id">{{ cat.name }}</option>
            </select>
          </div>

          <!-- 3. Role Filter -->
          <div class="filter-group">
            <label>Assigned Role</label>
            <select [(ngModel)]="selectedRoleFilter" (change)="applyFilters()">
              <option value="All">All Roles</option>
              <option value="Admin">Admin</option>
              <option value="Global Editor">Global Editor</option>
              <option value="Feature Editor">Feature Editor</option>
              <option value="Read Only">Read Only</option>
              <option value="Member">Member</option>
            </select>
          </div>

          <!-- 4. Status Filter -->
          <div class="filter-group">
            <label>Account Status</label>
            <select [(ngModel)]="selectedStatusFilter" (change)="applyFilters()">
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Suspended">Suspended</option>
            </select>
          </div>

          <!-- 5. Reset Button -->
          <div class="filter-group reset-group">
            <button type="button" class="btn btn-outline btn-reset" (click)="resetFilters()" title="Reset Filters">
              <span class="material-symbols-outlined">restart_alt</span>
              <span>Reset</span>
            </button>
          </div>
        </div>

        <!-- Quick Info & Export Actions -->
        <div class="export-row">
          <div class="export-info">
            <span>Showing <strong>{{ paginatedUsers.length }}</strong> of <strong>{{ filteredUsers.length }}</strong> filtered members (Total: {{ users.length }})</span>
          </div>

          <div class="export-buttons">
            <button type="button" class="btn-export" (click)="exportPdf()" title="Export PDF Document">
              <span class="material-symbols-outlined">picture_as_pdf</span>
              <span>PDF</span>
            </button>

            <button type="button" class="btn-export" (click)="exportExcel()" title="Export Excel Spreadsheet">
              <span class="material-symbols-outlined">table_view</span>
              <span>Excel</span>
            </button>

            <button type="button" class="btn-export" (click)="exportWord()" title="Export Word Document">
              <span class="material-symbols-outlined">description</span>
              <span>Word</span>
            </button>

            <!-- Category Export Menu -->
            <div class="category-export-dropdown">
              <button type="button" class="btn-export" (click)="showCategoryExportMenu = !showCategoryExportMenu">
                <span class="material-symbols-outlined">category</span>
                <span>Export Category</span>
                <span class="material-symbols-outlined">expand_more</span>
              </button>
              <div class="dropdown-menu" *ngIf="showCategoryExportMenu" (mouseleave)="showCategoryExportMenu = false">
                <a href="javascript:void(0)" *ngFor="let cat of categories" (click)="exportSpecificCategory(cat)">
                  <span class="cat-dot" [style.background]="cat.colorCode || '#0050e5'"></span>
                  <span>{{ cat.name }}</span>
                </a>
                <a href="javascript:void(0)" *ngIf="categories.length === 0" style="color:#94a3b8; font-size:12px;">
                  No categories created
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Member Directory Table -->
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th (click)="sortBy('fullName')">
                <div class="th-content">
                  <span>Member Name</span>
                  <span class="material-symbols-outlined sort-icon">{{ getSortIcon('fullName') }}</span>
                </div>
              </th>
              <th (click)="sortBy('email')">
                <div class="th-content">
                  <span>Email Address</span>
                  <span class="material-symbols-outlined sort-icon">{{ getSortIcon('email') }}</span>
                </div>
              </th>
              <th (click)="sortBy('memberId')" style="width: 140px;">
                <div class="th-content">
                  <span>Member ID</span>
                  <span class="material-symbols-outlined sort-icon">{{ getSortIcon('memberId') }}</span>
                </div>
              </th>
              <th (click)="sortBy('categoryName')">
                <div class="th-content">
                  <span>Category</span>
                  <span class="material-symbols-outlined sort-icon">{{ getSortIcon('categoryName') }}</span>
                </div>
              </th>
              <th (click)="sortBy('roles')" style="width: 130px;">
                <div class="th-content">
                  <span>Role</span>
                  <span class="material-symbols-outlined sort-icon">{{ getSortIcon('roles') }}</span>
                </div>
              </th>
              <th (click)="sortBy('userStatus')" style="width: 110px;">
                <div class="th-content">
                  <span>Status</span>
                  <span class="material-symbols-outlined sort-icon">{{ getSortIcon('userStatus') }}</span>
                </div>
              </th>
              <th style="text-align:right; width:160px;">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let u of paginatedUsers" [class.suspended-row]="u.userStatus === 'Suspended'">
              <!-- Member Avatar & Name -->
              <td>
                <div class="member-cell">
                  <div class="avatar-box" [style.background]="getGradient(u.fullName)">
                    <img *ngIf="u.avatarUrl" [src]="u.avatarUrl" [alt]="u.fullName" class="avatar-img" onerror="this.style.display='none'">
                    <span *ngIf="!u.avatarUrl">{{ getInitials(u.fullName) }}</span>
                  </div>
                  <div class="member-info">
                    <div class="member-name">{{ u.fullName || 'Unnamed Member' }}</div>
                    <div class="member-designation" *ngIf="u.designation">{{ u.designation }}</div>
                  </div>
                </div>
              </td>

              <!-- Email Address & Phone -->
              <td>
                <div class="email-cell">
                  <div class="email-text-row">
                    <span class="email-address">{{ u.email }}</span>
                    <span class="material-symbols-outlined verify-icon" [title]="u.emailConfirmed ? 'Email Verified' : 'Email Unverified (Pending)'" [style.color]="u.emailConfirmed ? '#16a34a' : '#f59e0b'">
                      {{ u.emailConfirmed ? 'verified' : 'mark_email_unread' }}
                    </span>
                  </div>
                  <div class="phone-sub-row" *ngIf="u.phoneNumber">
                    <span class="phone-text">{{ u.phoneNumber }}</span>
                    <span class="material-symbols-outlined verify-icon" [title]="u.phoneNumberConfirmed ? 'Phone Verified' : 'Phone Unverified'" [style.color]="u.phoneNumberConfirmed ? '#16a34a' : '#94a3b8'">
                      {{ u.phoneNumberConfirmed ? 'sms' : 'phone_missed' }}
                    </span>
                  </div>
                </div>
              </td>

              <!-- Member ID -->
              <td>
                <span class="member-id-pill">{{ sanitizeId(u.memberId || 'CC-2026-' + u.id.substring(0,4).toUpperCase()) }}</span>
              </td>

              <!-- Category Tier -->
              <td>
                <span class="category-badge" *ngIf="u.bcpUserCategoryId && u.categoryName" [style.background]="(u.categoryColor || '#0050e5') + '15'" [style.color]="u.categoryColor || '#0050e5'" [style.border-color]="(u.categoryColor || '#0050e5') + '35'">
                  <span class="material-symbols-outlined badge-icon">{{ u.categoryIcon || 'folder_shared' }}</span>
                  <span>{{ u.categoryName }}</span>
                </span>
                <span class="unassigned-badge" *ngIf="!u.bcpUserCategoryId || !u.categoryName">
                  <span>Unassigned</span>
                </span>
              </td>

              <!-- Role -->
              <td>
                <span class="role-pill" [class.role-admin]="u.roles?.includes('Admin')">
                  {{ u.roles?.join(', ') || 'Member' }}
                </span>
              </td>

              <!-- Account Status Toggle -->
              <td>
                <span class="status-badge" [class.active-status]="u.userStatus === 'Active'" [class.suspended-status]="u.userStatus === 'Suspended'">
                  <span class="status-dot"></span>
                  <span>{{ u.userStatus || 'Active' }}</span>
                </span>
              </td>

              <!-- Clean Actions (Details & Edit - Delete button removed) -->
              <td style="text-align:right;">
                <div class="row-actions-group">
                  <a [routerLink]="['/users/console/details', u.id]" class="btn-action btn-details" title="View Member Dossier">
                    <span class="material-symbols-outlined">visibility</span>
                    <span>Details</span>
                  </a>
                  <a [routerLink]="['/users/console/edit', u.id]" class="btn-action btn-edit" title="Edit Member Profile">
                    <span class="material-symbols-outlined">edit</span>
                    <span>Edit</span>
                  </a>
                </div>
              </td>
            </tr>

            <tr *ngIf="paginatedUsers.length === 0">
              <td colspan="7" class="empty-table-cell">
                <span class="material-symbols-outlined empty-icon">person_search</span>
                <p>No members found matching your search or filters.</p>
                <button type="button" class="btn btn-outline btn-sm" (click)="resetFilters()">Clear Filters</button>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Built-In Pagination Toolbar -->
        <div class="pagination-footer" *ngIf="filteredUsers.length > 0">
          <div class="page-size-selector">
            <span>Show</span>
            <select [(ngModel)]="pageSize" (change)="onPageSizeChange()">
              <option [value]="10">10</option>
              <option [value]="25">25</option>
              <option [value]="50">50</option>
              <option [value]="100">100</option>
            </select>
            <span>entries per page</span>
          </div>

          <div class="pagination-controls">
            <button type="button" class="page-btn" [disabled]="currentPage === 1" (click)="setPage(currentPage - 1)">
              <span class="material-symbols-outlined">chevron_left</span>
            </button>

            <button
              type="button"
              class="page-btn"
              *ngFor="let p of totalPagesArray"
              [class.active]="p === currentPage"
              (click)="setPage(p)"
            >
              {{ p }}
            </button>

            <button type="button" class="page-btn" [disabled]="currentPage === totalPages" (click)="setPage(currentPage + 1)">
              <span class="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .users-list-page { display: flex; flex-direction: column; gap: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; }

    /* Navigation Bar */
    .feature-nav-bar { display: flex; gap: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; overflow-x: auto; }
    .tab-btn { display: flex; align-items: center; gap: 8px; padding: 10px 18px; border: none; background: transparent; border-radius: 8px; font-size: 13px; font-weight: 600; color: #64748b; cursor: pointer; text-decoration: none; transition: all 0.15s ease; white-space: nowrap; }
    .tab-btn:hover { background: #f1f5f9; color: #0f172a; }
    .tab-btn.active { background: #0050e5; color: #ffffff; }
    .count-pill { font-size: 11px; padding: 2px 8px; border-radius: 9999px; background: #e2e8f0; color: #475569; font-weight: 700; }
    .tab-btn.active .count-pill { background: rgba(255,255,255,0.25); color: #ffffff; }

    /* Filter Card */
    .filter-export-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; display: flex; flex-direction: column; gap: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
    .filter-grid-row { display: grid; grid-template-columns: minmax(260px, 2fr) 1.2fr 1fr 1fr auto; gap: 12px; align-items: flex-end; }
    @media (max-width: 1024px) { .filter-grid-row { grid-template-columns: 1fr 1fr; } }
    @media (max-width: 640px) { .filter-grid-row { grid-template-columns: 1fr; } }

    .filter-group { display: flex; flex-direction: column; gap: 6px; }
    .filter-group label { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; height: 14px; line-height: 14px; }
    .filter-group select { height: 40px; padding: 0 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; color: #1e293b; outline: none; background: #ffffff; width: 100%; transition: border-color 0.15s ease; }
    .filter-group select:focus { border-color: #0050e5; }
    .reset-group { justify-content: flex-end; }
    .btn-reset { height: 40px; padding: 0 16px; display: inline-flex; align-items: center; gap: 6px; border: 1px solid #cbd5e1; background: #ffffff; color: #475569; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; }
    .btn-reset:hover { background: #f8fafc; color: #0f172a; border-color: #94a3b8; }

    .search-input-wrap { position: relative; display: flex; align-items: center; width: 100%; }
    .search-input-wrap input { width: 100%; height: 40px; padding: 0 34px 0 38px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; outline: none; transition: border-color 0.15s ease; }
    .search-input-wrap input:focus { border-color: #0050e5; box-shadow: 0 0 0 3px rgba(0,80,229,0.1); }
    .search-icon { position: absolute; left: 10px; font-size: 20px; color: #94a3b8; pointer-events: none; }
    .clear-btn { position: absolute; right: 8px; background: none; border: none; color: #94a3b8; cursor: pointer; }

    /* Export Row */
    .export-row { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f1f5f9; padding-top: 12px; flex-wrap: wrap; gap: 12px; }
    .export-info { font-size: 13px; color: #64748b; }
    .export-buttons { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .btn-export { display: flex; align-items: center; gap: 6px; padding: 7px 14px; border: 1px solid #cbd5e1; background: #f8fafc; color: #334155; font-size: 12px; font-weight: 600; border-radius: 7px; cursor: pointer; transition: all 0.15s ease; }
    .btn-export:hover { background: #0050e5; color: #ffffff; border-color: #0050e5; }
    .category-export-dropdown { position: relative; }
    .dropdown-menu { position: absolute; right: 0; top: 100%; margin-top: 4px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); width: 220px; z-index: 100; overflow: hidden; }
    .dropdown-menu a { display: flex; align-items: center; gap: 8px; padding: 10px 14px; font-size: 12px; color: #1e293b; text-decoration: none; }
    .dropdown-menu a:hover { background: #f1f5f9; }
    .cat-dot { width: 8px; height: 8px; border-radius: 50%; }

    /* Tables */
    .table-container { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
    .data-table { width: 100%; border-collapse: collapse; text-align: left; }
    .data-table th { background: #f8fafc; padding: 12px 16px; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #475569; letter-spacing: 0.05em; border-bottom: 1px solid #e2e8f0; user-select: none; }
    .th-content { display: flex; align-items: center; gap: 6px; cursor: pointer; }
    .sort-icon { font-size: 16px; color: #94a3b8; }
    .data-table td { padding: 14px 16px; border-bottom: 1px solid #f1f5f9; font-size: 13px; vertical-align: middle; }
    .data-table tr:hover { background: #fafafa; }
    .suspended-row { opacity: 0.7; background: #fff5f5; }

    /* Member Cell */
    .member-cell { display: flex; align-items: center; gap: 12px; }
    .avatar-box { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #ffffff; font-weight: 700; font-size: 13px; overflow: hidden; flex-shrink: 0; }
    .avatar-img { width: 100%; height: 100%; object-fit: cover; }
    .member-info { display: flex; flex-direction: column; }
    .member-name { font-weight: 700; color: #0f172a; }
    .member-designation { font-size: 11px; color: #0050e5; font-weight: 600; margin-top: 1px; }

    /* Email Cell */
    .email-cell { display: flex; flex-direction: column; gap: 2px; }
    .email-text-row { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }
    .email-address { font-size: 12.5px; color: #334155; font-weight: 500; }
    .verify-icon { font-size: 14px; }
    .phone-sub-row { display: flex; align-items: center; gap: 4px; }
    .phone-text { font-size: 11px; color: #64748b; font-family: monospace; }

    .member-id-pill { font-family: monospace; font-size: 12px; background: #f1f5f9; padding: 2px 8px; border-radius: 4px; color: #475569; font-weight: 600; }

    .category-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; border: 1px solid transparent; }
    .badge-icon { font-size: 16px; }
    .unassigned-badge { font-size: 12px; color: #94a3b8; font-style: italic; }

    .role-pill { font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 9999px; background: #f1f5f9; color: #475569; }
    .role-admin { background: #eff6ff; color: #0050e5; }

    .status-badge { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; }
    .status-dot { width: 8px; height: 8px; border-radius: 50%; }
    .active-status { color: #10b981; }
    .active-status .status-dot { background: #10b981; }
    .suspended-status { color: #ef4444; }
    .suspended-status .status-dot { background: #ef4444; }

    /* Action Buttons */
    .row-actions-group { display: flex; gap: 6px; justify-content: flex-end; }
    .btn-action { display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; text-decoration: none; transition: all 0.15s ease; }
    .btn-details { background: #eff6ff; color: #0050e5; border: 1px solid #bfdbfe; }
    .btn-details:hover { background: #0050e5; color: #ffffff !important; }
    .btn-details:hover span { color: #ffffff !important; }
    .btn-edit { background: #ffffff; color: #475569; border: 1px solid #cbd5e1; }
    .btn-edit:hover { background: #f8fafc; color: #0f172a; border-color: #94a3b8; }

    /* Pagination */
    .pagination-footer { display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; border-top: 1px solid #e2e8f0; background: #f8fafc; flex-wrap: wrap; gap: 12px; }
    .page-size-selector { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #64748b; }
    .page-size-selector select { height: 32px; padding: 0 8px; border: 1px solid #cbd5e1; border-radius: 6px; background: #ffffff; outline: none; }
    .pagination-controls { display: flex; gap: 4px; align-items: center; }
    .page-btn { min-width: 32px; height: 32px; padding: 0 6px; display: flex; align-items: center; justify-content: center; border: 1px solid #cbd5e1; background: #ffffff; color: #334155; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; }
    .page-btn:hover:not(:disabled) { background: #f1f5f9; border-color: #94a3b8; }
    .page-btn.active { background: #0050e5; color: #ffffff !important; border-color: #0050e5; }
    .page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .empty-table-cell { text-align: center; padding: 40px 20px; color: #64748b; }
    .empty-icon { font-size: 40px; color: #cbd5e1; margin-bottom: 8px; display: block; }
  `]
})
export class UsersListComponent implements OnInit {
  isLoading = false;
  users: any[] = [];
  filteredUsers: any[] = [];
  paginatedUsers: any[] = [];
  categories: any[] = [];

  // Filters
  searchQuery = '';
  selectedCategoryFilter = '';
  selectedRoleFilter = 'All';
  selectedStatusFilter = 'All';
  sortColumn = 'fullName';
  sortAsc = true;
  showCategoryExportMenu = false;

  // Pagination
  pageSize = 10;
  currentPage = 1;
  totalPages = 1;
  totalPagesArray: number[] = [];

  headerButtons: PageHeaderButton[] = [
    {
      text: 'Registration Form Builder',
      icon: 'dynamic_form',
      isPrimary: false,
      routerLink: '/users/console/registration-form'
    },
    {
      text: 'Add Member',
      icon: 'person_add',
      isPrimary: true,
      routerLink: '/users/console/create'
    }
  ];

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    private toast: ToastService,
    private exportService: ExportService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['status']) {
        this.selectedStatusFilter = params['status'];
      }
      if (params['category']) {
        this.selectedCategoryFilter = params['category'];
      }
      if (params['role']) {
        this.selectedRoleFilter = params['role'];
      }
      if (params['search']) {
        this.searchQuery = params['search'];
      }
      if (this.users.length > 0) {
        this.applyFilters();
      }
    });
    this.loadUsers();
    this.loadCategories();
  }

  loadUsers(): void {
    this.isLoading = true;
    this.api.get<any>('UsersApi').subscribe({
      next: (res) => {
        this.isLoading = false;
        // Strictly filter out any root SuperAdmin user account from appearing in user list
        this.users = (res.data || []).filter((u: any) => !u.roles?.includes('SuperAdmin'));
        this.applyFilters();
      },
      error: (err) => {
        this.isLoading = false;
        this.toast.error('Failed to load user directory.');
      }
    });
  }

  loadCategories(): void {
    this.api.get<any>('UsersApi/categories').subscribe({
      next: (res) => {
        this.categories = res.data || [];
      },
      error: () => {}
    });
  }

  applyFilters(): void {
    let list = [...this.users];

    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(u =>
        u.fullName?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.memberId?.toLowerCase().includes(q) ||
        u.designation?.toLowerCase().includes(q) ||
        u.categoryName?.toLowerCase().includes(q) ||
        u.phoneNumber?.includes(q)
      );
    }

    if (this.selectedCategoryFilter) {
      const filterVal = this.selectedCategoryFilter.toLowerCase();
      list = list.filter(u =>
        (u.bcpUserCategoryId && u.bcpUserCategoryId.toString().toLowerCase() === filterVal) ||
        (u.categoryName && u.categoryName.toLowerCase() === filterVal)
      );
    }

    if (this.selectedRoleFilter !== 'All') {
      list = list.filter(u => u.roles?.includes(this.selectedRoleFilter));
    }

    if (this.selectedStatusFilter !== 'All') {
      list = list.filter(u => u.userStatus === this.selectedStatusFilter);
    }

    // Comprehensive Column Sorting
    list.sort((a, b) => {
      let valA: any = a[this.sortColumn];
      let valB: any = b[this.sortColumn];

      if (this.sortColumn === 'roles') {
        valA = Array.isArray(a.roles) ? a.roles.join(', ') : (a.roles || '');
        valB = Array.isArray(b.roles) ? b.roles.join(', ') : (b.roles || '');
      }

      valA = (valA ?? '').toString().toLowerCase();
      valB = (valB ?? '').toString().toLowerCase();

      return this.sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });

    this.filteredUsers = list;
    this.currentPage = 1;
    this.updatePagination();
  }

  sortBy(col: string): void {
    if (this.sortColumn === col) {
      this.sortAsc = !this.sortAsc;
    } else {
      this.sortColumn = col;
      this.sortAsc = true;
    }
    this.applyFilters();
  }

  getSortIcon(col: string): string {
    if (this.sortColumn !== col) return 'unfold_more';
    return this.sortAsc ? 'arrow_upward' : 'arrow_downward';
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.selectedCategoryFilter = '';
    this.selectedRoleFilter = 'All';
    this.selectedStatusFilter = 'All';
    this.applyFilters();
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredUsers.length / this.pageSize) || 1;
    this.totalPagesArray = Array.from({ length: this.totalPages }, (_, i) => i + 1);
    const start = (this.currentPage - 1) * this.pageSize;
    this.paginatedUsers = this.filteredUsers.slice(start, start + this.pageSize);
  }

  setPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    const start = (this.currentPage - 1) * this.pageSize;
    this.paginatedUsers = this.filteredUsers.slice(start, start + this.pageSize);
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.updatePagination();
  }

  sanitizeId(id: string): string {
    if (!id) return '';
    return id.replace(/[-]{2,}/g, '-').replace(/[/]{2,}/g, '/').replace(/[_]{2,}/g, '_');
  }

  // Export Columns Definition
  private getExportColumns(): ExportColumn[] {
    return [
      { key: 'memberId', header: 'Member ID' },
      { key: 'fullName', header: 'Full Name' },
      { key: 'email', header: 'Email Address' },
      { key: 'phoneNumber', header: 'Phone Number' },
      { key: 'categoryName', header: 'Category Tier' },
      { key: 'roles', header: 'Assigned Roles', format: (val) => Array.isArray(val) ? val.join(', ') : (val || 'Member') },
      { key: 'designation', header: 'Designation' },
      { key: 'userStatus', header: 'Status' },
      { key: 'joinDate', header: 'Join Date', format: (val) => val ? new Date(val).toLocaleDateString() : '-' }
    ];
  }

  exportPdf(): void {
    this.exportService.printReport(
      'Official Member Directory Register',
      'Business Command Center',
      this.getExportColumns(),
      this.filteredUsers,
      this.searchQuery ? `Search: "${this.searchQuery}"` : undefined
    );
  }

  exportExcel(): void {
    this.exportService.exportToCsv(
      `Member_Directory_${new Date().toISOString().substring(0,10)}`,
      this.getExportColumns(),
      this.filteredUsers
    );
    this.toast.success('Spreadsheet exported successfully!');
  }

  exportWord(): void {
    this.exportService.exportToWord(
      `Member_Register_${new Date().toISOString().substring(0,10)}`,
      'Official Member Directory Register',
      'Business Command Center',
      this.getExportColumns(),
      this.filteredUsers
    );
    this.toast.success('Word document exported successfully!');
  }

  exportSpecificCategory(cat: any): void {
    this.showCategoryExportMenu = false;
    const categoryMembers = this.users.filter(u => u.bcpUserCategoryId === cat.id);
    this.exportService.printReport(
      `Member Register - ${cat.name}`,
      'Business Command Center',
      this.getExportColumns(),
      categoryMembers,
      `Category: ${cat.name}`
    );
  }

  getInitials(name: string): string {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  getGradient(name: string): string {
    const gradients = [
      'linear-gradient(135deg, #0050e5, #38bdf8)',
      'linear-gradient(135deg, #10b981, #06b6d4)',
      'linear-gradient(135deg, #8b5cf6, #ec4899)',
      'linear-gradient(135deg, #f59e0b, #ef4444)',
      'linear-gradient(135deg, #0ea5e9, #6366f1)'
    ];
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return gradients[Math.abs(hash) % gradients.length];
  }
}
