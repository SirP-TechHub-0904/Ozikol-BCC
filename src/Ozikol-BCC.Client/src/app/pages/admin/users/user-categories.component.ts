import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent, PageHeaderButton } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-user-categories',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent],
  template: `
    <div class="categories-page">
      <!-- Standardized Page Header -->
      <app-page-header
        eyebrow="ORGANIZATIONAL HIERARCHY"
        icon="category"
        title="User Categories"
        subtitle="Manage organizational divisions, units, and member classification categories."
        [buttons]="headerButtons"
        [loading]="isLoading"
      ></app-page-header>

      <!-- Categories Grid -->
      <div class="categories-grid" *ngIf="!isLoading">
        <div class="category-card" *ngFor="let cat of categories">
          <div class="card-top-bar" [style.background]="cat.colorCode || '#0050e5'"></div>
          <div class="card-content">
            <div class="cat-header-row">
              <a routerLink="/admin/users/list" [queryParams]="{ category: cat.id }" class="cat-icon-box" [style.background]="(cat.colorCode || '#0050e5') + '15'" [style.color]="cat.colorCode || '#0050e5'" title="View all members in {{ cat.name }}">
                <span class="material-symbols-outlined">{{ cat.icon || 'category' }}</span>
              </a>
              <a routerLink="/admin/users/list" [queryParams]="{ category: cat.id }" class="headcount-pill" title="View all members in {{ cat.name }}">
                <strong>{{ cat.memberCount || 0 }}</strong> members
              </a>
            </div>

            <h3 class="cat-title">
              <a routerLink="/admin/users/list" [queryParams]="{ category: cat.id }" class="cat-title-link" title="View all members in {{ cat.name }}">
                {{ cat.name }}
              </a>
            </h3>
            <p class="cat-description">{{ cat.description || 'No description provided for this category.' }}</p>

            <div class="cat-footer">
              <div class="sort-badge">Order: {{ cat.sortOrder || 0 }}</div>
              <div class="cat-actions">
                <a [routerLink]="['/admin/users/list']" [queryParams]="{ category: cat.id }" class="btn-sm-action btn-sm-members" title="View members in this category">
                  <span class="material-symbols-outlined">group</span>
                </a>
                <a [routerLink]="['/users/console/categories/edit', cat.id]" class="btn-sm-action btn-sm-edit" title="Edit category">
                  <span class="material-symbols-outlined">edit</span>
                </a>
                <a [routerLink]="['/users/console/categories/delete', cat.id]" class="btn-sm-action btn-sm-delete" title="Delete category">
                  <span class="material-symbols-outlined">delete</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        <div class="empty-categories" *ngIf="categories.length === 0">
          <span class="material-symbols-outlined">category</span>
          <h3>No User Categories</h3>
          <p>Create your first user category to begin classifying members.</p>
          <a routerLink="/users/console/categories/create" class="btn btn-primary btn-sm">
            <span class="material-symbols-outlined">add</span> Create Category
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .categories-page { display: flex; flex-direction: column; gap: 20px; }
    .categories-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
    }
    .category-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
      transition: all 0.2s;
    }
    .category-card:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.06); }
    .card-top-bar { height: 6px; width: 100%; }
    .card-content { padding: 20px 22px; display: flex; flex-direction: column; gap: 10px; }

    .cat-header-row { display: flex; justify-content: space-between; align-items: center; }
    .cat-icon-box {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      text-decoration: none;
    }
    .cat-icon-box span { font-size: 24px; }
    .headcount-pill {
      font-size: 12px;
      color: #64748b;
      background: #f1f5f9;
      padding: 4px 10px;
      border-radius: 12px;
      text-decoration: none;
    }
    .headcount-pill strong { color: #0f172a; }
    .headcount-pill:hover { background: #e2e8f0; color: #0050e5; }

    .cat-title { font-size: 16px; font-weight: 800; margin: 0; }
    .cat-title-link { color: #0f172a; text-decoration: none; }
    .cat-title-link:hover { color: #0050e5; }
    .cat-description { font-size: 13px; color: #64748b; margin: 0; min-height: 38px; line-height: 1.4; }

    .cat-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid #f1f5f9;
      padding-top: 12px;
      margin-top: 6px;
    }
    .sort-badge { font-size: 11px; font-weight: 700; color: #94a3b8; background: #f8fafc; padding: 2px 8px; border-radius: 4px; border: 1px solid #e2e8f0; }
    .cat-actions { display: flex; gap: 6px; }
    .btn-sm-action {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid #e2e8f0;
      background: #ffffff;
      color: #64748b;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.15s;
    }
    .btn-sm-action:hover { background: #f8fafc; color: #0f172a; }
    .btn-sm-delete:hover { border-color: #ef4444; color: #ef4444; }

    .empty-categories {
      grid-column: 1 / -1;
      background: #ffffff;
      border: 1px dashed #cbd5e1;
      border-radius: 16px;
      padding: 48px 24px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    .empty-categories span { font-size: 48px; color: #94a3b8; }
    .empty-categories h3 { font-size: 17px; font-weight: 800; color: #0f172a; margin: 0; }
    .empty-categories p { font-size: 13px; color: #64748b; margin: 0; }
  `]
})
export class UserCategoriesComponent implements OnInit {
  isLoading = false;
  categories: any[] = [];

  headerButtons: PageHeaderButton[] = [
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
      },
      error: () => {
        this.isLoading = false;
        this.toast.error('Failed to load categories.');
      }
    });
  }

  async deleteCategory(cat: any): Promise<void> {
    const confirmed = await this.toast.confirm(
      'Delete User Category',
      `You are about to permanently delete category '${cat.name}'.`,
      'Delete Category',
      'Cancel',
      'danger',
      cat.name,
      [
        'All members belonging to this category will be unassigned to Uncategorized.',
        'This organizational category record cannot be recovered or restored.'
      ]
    );
    if (!confirmed) return;

    this.api.delete<any>(`UsersApi/categories/${cat.id}`).subscribe({
      next: () => {
        this.toast.success(`Category '${cat.name}' deleted successfully.`);
        this.loadCategories();
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'Failed to delete category.');
      }
    });
  }
}
