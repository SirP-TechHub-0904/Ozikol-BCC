import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-blogs-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="cms-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">Blog Articles & News Posts</h1>
          <p class="page-sub">Publish editorial articles, organization announcements, and featured news.</p>
        </div>
        <a [routerLink]="canEdit ? '/content/console/blogs/create' : null" class="btn-primary" [class.disabled-btn]="!canEdit">
          <span class="material-symbols-outlined">post_add</span>
          <span>Create New Article</span>
        </a>
      </div>

      <!-- Filter Controls & Search -->
      <div class="table-card">
        <div class="card-filters-row">
          <div class="search-box">
            <span class="material-symbols-outlined">search</span>
            <input type="text" [(ngModel)]="searchQuery" (input)="filterBlogs()" placeholder="Search title or content..." />
          </div>

          <div class="filter-controls">
            <select [(ngModel)]="selectedCategory" (change)="loadBlogs()" class="filter-select">
              <option value="">All Categories</option>
              <option *ngFor="let cat of categories" [value]="cat.id">{{ cat.title }}</option>
            </select>

            <span class="count-badge">{{ filteredBlogs.length }} Articles</span>
          </div>
        </div>

        <!-- Data Table -->
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 70px;">Media</th>
                <th>Article Title & Excerpt</th>
                <th>Category</th>
                <th>Publish Date</th>
                <th>Ribbon Ticker</th>
                <th>Status</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let post of filteredBlogs">
                <td>
                  <div class="thumb-box">
                    <img *ngIf="post.imageUrl" [src]="post.imageUrl" alt="Thumb" class="thumb-img" />
                    <span *ngIf="!post.imageUrl" class="material-symbols-outlined text-muted">image</span>
                  </div>
                </td>
                <td>
                  <div class="article-title-cell">
                    <a [routerLink]="canEdit ? ['/content/console/blogs/edit', post.id] : null" class="article-title-link" [class.disabled-link]="!canEdit">
                      <strong>{{ post.title }}</strong>
                    </a>
                    <p class="excerpt-preview">{{ post.description || 'No summary excerpt provided.' }}</p>
                  </div>
                </td>
                <td>
                  <span class="cat-pill">{{ post.categoryTitle || 'Uncategorized' }}</span>
                </td>
                <td class="date-cell">
                  {{ post.date | date:'mediumDate' }}
                </td>
                <td>
                  <span *ngIf="post.addToRibon" class="ribbon-badge">
                    <span class="material-symbols-outlined">breaking_news_alt_1</span>
                    Ticker Active
                  </span>
                  <span *ngIf="!post.addToRibon" class="text-muted-sm">—</span>
                </td>
                <td>
                  <span *ngIf="post.isScheduled && post.scheduledPublishDate" class="status-btn scheduled" [title]="'Scheduled for ' + (post.scheduledPublishDate | date:'medium')">
                    <span class="material-symbols-outlined">schedule</span>
                    <span>Scheduled: {{ post.scheduledPublishDate | date:'shortDate' }}</span>
                  </span>
                  <button *ngIf="!post.isScheduled" type="button" class="status-btn" [class.published]="post.publish" [class.draft]="!post.publish" (click)="togglePublish(post)" [disabled]="!canEdit">
                    <span class="material-symbols-outlined">{{ post.publish ? 'check_circle' : 'do_not_disturb_on' }}</span>
                    <span>{{ post.publish ? 'Published' : 'Draft' }}</span>
                  </button>
                </td>
                <td style="text-align: right;">
                  <div class="actions-group">
                    <a [routerLink]="canEdit ? ['/content/console/blogs/edit', post.id] : null" class="btn-icon edit" [class.disabled-btn]="!canEdit" title="Edit Article Page">
                      <span class="material-symbols-outlined">edit</span>
                    </a>
                    <a [routerLink]="canEdit ? ['/content/console/blogs/delete', post.id] : null" class="btn-icon delete" [class.disabled-btn]="!canEdit" title="Delete Article Page">
                      <span class="material-symbols-outlined">delete</span>
                    </a>
                  </div>
                </td>
              </tr>
              <tr *ngIf="!filteredBlogs.length && !loading">
                <td colspan="7" class="empty-row">No blog posts found matching your criteria.</td>
              </tr>
              <tr *ngIf="loading">
                <td colspan="7" class="empty-row">Loading articles...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
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
    .btn-primary:hover:not(.disabled-btn) { transform: translateY(-1px); }
    .btn-primary.disabled-btn {
      opacity: 0.5;
      cursor: not-allowed;
      pointer-events: none;
    }

    .table-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.02);
      overflow: hidden;
    }
    .card-filters-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      gap: 16px;
      flex-wrap: wrap;
    }
    .search-box {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 8px 12px;
      width: 280px;
    }
    .search-box span { font-size: 18px; color: #64748b; }
    .search-box input { border: none; outline: none; font-size: 13px; width: 100%; color: #0f172a; }
    
    .filter-controls { display: flex; align-items: center; gap: 12px; }
    .filter-select {
      padding: 8px 12px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 13px;
      background: #f8fafc;
      outline: none;
    }
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

    .thumb-box {
      width: 48px;
      height: 48px;
      border-radius: 8px;
      background: #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .thumb-img { width: 100%; height: 100%; object-fit: cover; }
    .article-title-cell { display: flex; flex-direction: column; gap: 2px; }
    .article-title-link { color: #0f172a; text-decoration: none; font-size: 14px; }
    .article-title-link:hover:not(.disabled-link) { color: #0050e5; text-decoration: underline; }
    .article-title-link.disabled-link {
      pointer-events: none;
      cursor: default;
      text-decoration: none !important;
      color: inherit !important;
    }

    .excerpt-preview { margin: 0; font-size: 12px; color: #64748b; max-width: 420px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .cat-pill { font-size: 11px; font-weight: 700; background: rgba(168, 85, 247, 0.1); color: #9333ea; padding: 3px 8px; border-radius: 6px; }
    .date-cell { font-size: 12px; color: #475569; }

    .ribbon-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: rgba(249, 115, 22, 0.12);
      color: #ea580c;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
    }
    .text-muted-sm { color: #cbd5e1; font-size: 11px; }

    .status-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 5px 10px;
      border: 1px solid transparent;
      border-radius: 12px;
      font-size: 11.5px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
    }
    .status-btn span { font-size: 14px; }
    .status-btn.published { background: rgba(34, 197, 94, 0.12); color: #16a34a; }
    .status-btn.scheduled { background: rgba(0, 80, 229, 0.12); color: #0050e5; border: 1px solid rgba(0, 80, 229, 0.3); }
    .status-btn.draft { background: rgba(100, 116, 139, 0.12); color: #64748b; }
    .status-btn:disabled { opacity: 0.8; cursor: not-allowed; }

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
    .btn-icon:hover:not(.disabled-btn) { background: #f8fafc; color: #0f172a; }
    .btn-icon.delete:hover:not(.disabled-btn) { border-color: #ef4444; color: #ef4444; }
    .btn-icon.disabled-btn {
      opacity: 0.5;
      cursor: not-allowed;
      pointer-events: none;
    }

    .empty-row { text-align: center; padding: 30px; color: #94a3b8; }
    .text-muted { color: #94a3b8; }
  `]
})
export class BlogsManagementComponent implements OnInit {
  blogs: any[] = [];
  filteredBlogs: any[] = [];
  categories: any[] = [];
  searchQuery = '';
  selectedCategory = '';
  loading = false;
  canEdit = false;

  constructor(private api: ApiService, private toast: ToastService) {}

  ngOnInit(): void {
    this.checkPermissions();
    this.loadCategories();
    this.loadBlogs();
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

  loadCategories(): void {
    this.api.get<any>('ContentApi/blog-categories').subscribe({
      next: (res) => {
        this.categories = res?.data || [];
      }
    });
  }

  loadBlogs(): void {
    this.loading = true;
    let url = 'ContentApi/blogs';
    if (this.selectedCategory) {
      url += `?categoryId=${this.selectedCategory}`;
    }

    this.api.get<any>(url).subscribe({
      next: (res) => {
        this.loading = false;
        this.blogs = res?.data || [];
        this.filterBlogs();
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  filterBlogs(): void {
    if (!this.searchQuery) {
      this.filteredBlogs = [...this.blogs];
      return;
    }
    const q = this.searchQuery.toLowerCase();
    this.filteredBlogs = this.blogs.filter(b =>
      b.title?.toLowerCase().includes(q) || b.description?.toLowerCase().includes(q)
    );
  }

  togglePublish(blog: any): void {
    if (!this.canEdit) return;
    this.api.put<any>(`ContentApi/blogs/${blog.id}/toggle-publish`, {}).subscribe({
      next: () => {
        blog.publish = !blog.publish;
        this.toast.success(`Article publish status updated.`, 'Publish Status');
      },
      error: () => this.toast.error('Failed to toggle publish status.', 'Toggle Error')
    });
  }
}
