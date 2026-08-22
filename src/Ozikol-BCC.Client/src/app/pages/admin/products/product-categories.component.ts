import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { PageHeaderComponent, PageHeaderButton } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-product-categories',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, PageHeaderComponent],
  template: `
    <div class="categories-page">
      <app-page-header
        eyebrow="COMMERCE STUDIO"
        icon="category"
        title="Commercial Product Categories"
        subtitle="Organize digital software, services, physical inventory, and subscriptions into distinct catalog taxonomies."
        [buttons]="headerButtons"
      ></app-page-header>

      <div class="table-container">
        <div *ngIf="isLoading" class="loading-state">
          <div class="spinner"></div>
          <span>Loading categories...</span>
        </div>

        <table *ngIf="!isLoading" class="data-table">
          <thead>
            <tr>
              <th style="width: 60px;">Icon</th>
              <th>Category Title</th>
              <th>Slug / URL</th>
              <th style="text-align: center;">Products Attached</th>
              <th style="text-align: center;">Sort Order</th>
              <th style="text-align: center;">Status</th>
              <th style="text-align: right; width: 140px;">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let cat of categories">
              <td>
                <div class="icon-circle">
                  <span class="material-symbols-outlined">{{ cat.icon || 'category' }}</span>
                </div>
              </td>
              <td>
                <a [routerLink]="['/products/console/categories/edit', cat.id]" class="cat-title-link">
                  {{ cat.title }}
                </a>
                <p *ngIf="cat.description" class="cat-desc">{{ cat.description }}</p>
              </td>
              <td>
                <code class="slug-code">/store?category={{ cat.slug }}</code>
              </td>
              <td style="text-align: center;">
                <span class="count-badge">{{ cat.productCount }} product(s)</span>
              </td>
              <td style="text-align: center;">
                <span class="sort-val">#{{ cat.sortOrder }}</span>
              </td>
              <td style="text-align: center;">
                <span class="status-pill" [class.active]="cat.publish">
                  <span class="status-dot"></span>
                  <span>{{ cat.publish ? 'Active' : 'Disabled' }}</span>
                </span>
              </td>
              <td style="text-align: right;">
                <div class="actions-group">
                  <a [routerLink]="['/products/console/categories/edit', cat.id]" class="btn-action btn-edit" title="Edit Category">
                    <span class="material-symbols-outlined">edit</span>
                  </a>
                  <a [routerLink]="['/products/console/categories/delete', cat.id]" class="btn-action btn-delete" title="Delete Category">
                    <span class="material-symbols-outlined">delete</span>
                  </a>
                </div>
              </td>
            </tr>

            <tr *ngIf="categories.length === 0">
              <td colspan="7" class="empty-state">
                <span class="material-symbols-outlined empty-icon">category</span>
                <h3>No categories created yet</h3>
                <p>Create your first category taxonomy to group commercial products.</p>
                <a routerLink="/products/console/categories/create" class="btn btn-primary btn-sm" style="margin-top:12px;">
                  <span class="material-symbols-outlined">add</span>
                  <span>Add Category</span>
                </a>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .categories-page { display: flex; flex-direction: column; gap: 20px; width: 100%; }

    .table-container { background: #ffffff; border-radius: 10px; border: 1px solid #e2e8f0; overflow: hidden; }
    .data-table { width: 100%; border-collapse: collapse; text-align: left; }
    .data-table th { background: #f8fafc; padding: 12px 16px; font-size: 12px; font-weight: 600; color: #475569; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }
    .data-table td { padding: 14px 16px; border-bottom: 1px solid #f1f5f9; font-size: 14px; color: #1e293b; vertical-align: middle; }
    .data-table tr:hover { background: #f8fafc; }

    .icon-circle {
      width: 38px; height: 38px; border-radius: 8px; background: rgba(0,80,229,0.08); color: #0050e5;
      display: flex; align-items: center; justify-content: center;
    }
    .icon-circle span { font-size: 20px; }

    .cat-title-link { font-weight: 600; color: #0f172a; text-decoration: none; }
    .cat-title-link:hover { color: #0050e5; text-decoration: underline; }
    .cat-desc { margin: 2px 0 0; font-size: 12px; color: #64748b; }
    .slug-code { font-size: 12px; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; color: #475569; }

    .count-badge { font-size: 12px; font-weight: 600; background: #f8fafc; border: 1px solid #e2e8f0; padding: 3px 8px; border-radius: 12px; color: #334155; }
    .sort-val { font-size: 12px; color: #64748b; font-family: monospace; }

    .status-pill {
      display: inline-flex; align-items: center; gap: 6px; padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 600;
      background: #fef2f2; color: #b91c1c;
    }
    .status-pill.active { background: #ecfdf5; color: #047857; }
    .status-dot { width: 6px; height: 6px; border-radius: 50%; background: #ef4444; }
    .status-pill.active .status-dot { background: #10b981; }

    .actions-group { display: flex; align-items: center; justify-content: flex-end; gap: 6px; }
    .btn-action {
      display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 6px;
      color: #64748b; text-decoration: none; border: 1px solid #e2e8f0; background: #fff;
    }
    .btn-edit:hover { color: #0050e5; border-color: #0050e5; background: rgba(0,80,229,0.05); }
    .btn-delete:hover { color: #ef4444; border-color: #ef4444; background: #fef2f2; }

    .loading-state, .empty-state { text-align: center; padding: 48px 16px; color: #64748b; }
    .empty-icon { font-size: 48px; color: #94a3b8; margin-bottom: 8px; }
    .spinner { width: 32px; height: 32px; border: 3px solid #e2e8f0; border-top-color: #0050e5; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 12px; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class ProductCategoriesComponent implements OnInit {
  categories: any[] = [];
  isLoading = true;

  headerButtons: PageHeaderButton[] = [
    {
      text: 'New Category',
      icon: 'add',
      routerLink: '/products/console/categories/create',
      isPrimary: true
    },
    {
      text: 'Back to Products',
      icon: 'arrow_back',
      routerLink: '/products/console'
    }
  ];

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.isLoading = true;
    this.api.get<any>('ProductsApi/categories').subscribe({
      next: (res) => {
        this.isLoading = false;
        this.categories = res?.data || [];
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }
}
