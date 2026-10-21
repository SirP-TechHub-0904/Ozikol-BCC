import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent, PageHeaderButton } from '../../../shared/components/page-header/page-header.component';

/**
 * Component for creating and editing organizational user categories or departments.
 * Color code and icon selectors have been removed per specification, replaced by
 * a publication status (Published / Unpublished) toggle.
 */
@Component({
  selector: 'app-category-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent],
  template: `
    <div class="category-form-page">
      <!-- Standardized Page Header -->
      <app-page-header
        eyebrow="ORGANIZATIONAL HIERARCHY"
        icon="corporate_fare"
        [title]="isEditMode ? 'Edit Category: ' + (model.name || 'Department') : 'Create User Category'"
        subtitle="Configure organizational department or user category tier, description, sort order, and publication status."
        [buttons]="headerButtons"
        [loading]="isLoading || isSaving"
      ></app-page-header>

      <!-- Form Card -->
      <form (ngSubmit)="saveCategory()" class="form-container" *ngIf="!isLoading">
        <div class="form-card">
          <div class="card-header">
            <div class="icon-box">
              <span class="material-symbols-outlined">corporate_fare</span>
            </div>
            <div>
              <h3>Category Details</h3>
              <p>Organizational department name, description, priority order, and publication visibility</p>
            </div>
          </div>

          <div class="card-body">
            <div class="form-grid-2">
              <div class="form-group">
                <label>Category / Department Name *</label>
                <input
                  type="text"
                  [(ngModel)]="model.name"
                  name="name"
                  placeholder="e.g. Engineering Team, Software Team, Operations"
                  required
                />
              </div>
              <div class="form-group">
                <label>Sort Order / Display Priority</label>
                <input
                  type="number"
                  [(ngModel)]="model.sortOrder"
                  name="sortOrder"
                  placeholder="0"
                />
              </div>
            </div>

            <div class="form-group">
              <label>Description (Optional)</label>
              <textarea
                rows="3"
                [(ngModel)]="model.description"
                name="description"
                placeholder="Briefly describe the responsibilities, members, or purpose of this category..."
              ></textarea>
            </div>

            <!-- Publication Status Toggle -->
            <div class="publication-card" [class.is-published]="model.isActive">
              <div class="pub-info">
                <div class="pub-title-row">
                  <span class="material-symbols-outlined pub-icon">
                    {{ model.isActive ? 'check_circle' : 'pause_circle' }}
                  </span>
                  <span class="pub-title">Publication Status</span>
                  <span class="status-pill" [class.status-pill-active]="model.isActive" [class.status-pill-draft]="!model.isActive">
                    {{ model.isActive ? 'Published' : 'Unpublished' }}
                  </span>
                </div>
                <p class="pub-desc">
                  {{ model.isActive
                    ? 'Active & Published: Visible to administrators, member registration forms, and departmental directories.'
                    : 'Unpublished / Draft: Temporarily hidden from registration forms and disabled for new member assignments.' }}
                </p>
              </div>

              <label class="toggle-switch">
                <input type="checkbox" [(ngModel)]="model.isActive" name="isActive" />
                <span class="slider"></span>
              </label>
            </div>
          </div>

          <div class="card-footer">
            <a routerLink="/admin/users/categories" class="btn btn-outline">Cancel</a>
            <button type="submit" class="btn btn-primary" [disabled]="isSaving || !model.name.trim()">
              <span *ngIf="!isSaving" class="material-symbols-outlined">save</span>
              <span>{{ isSaving ? 'Saving Category...' : (isEditMode ? 'Save Changes' : 'Create Category') }}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .category-form-page { display: flex; flex-direction: column; gap: 18px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; width: 100%; }

    .form-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); overflow: hidden; display: flex; flex-direction: column; width: 100%; }
    .card-header { display: flex; align-items: center; gap: 14px; padding: 18px 22px; border-bottom: 1px solid #f1f5f9; background: #fafbfc; }
    .icon-box { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; background: rgba(0,80,229,0.08); color: #0050e5; }
    .icon-box span { font-size: 24px; }
    .card-header h3 { margin: 0; font-size: 15px; font-weight: 700; color: #0f172a; }
    .card-header p { margin: 2px 0 0; font-size: 12px; color: #64748b; }
    .card-body { padding: 22px; display: flex; flex-direction: column; gap: 18px; }

    .form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    @media (max-width: 540px) { .form-grid-2 { grid-template-columns: 1fr; } }

    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #475569; letter-spacing: 0.05em; }
    .form-group input, .form-group select, .form-group textarea { padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; outline: none; background: #ffffff; color: #0f172a; transition: all 0.15s ease; box-sizing: border-box; }
    .form-group input:focus, .form-group select:focus, .form-group textarea:focus { border-color: #0050e5; box-shadow: 0 0 0 3px rgba(0,80,229,0.1); }

    /* Publication Card & Switch */
    .publication-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      padding: 16px 20px;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      background: #fafbfc;
      transition: all 0.2s ease;
    }
    .publication-card.is-published {
      border-color: #bbf7d0;
      background: #f0fdf4;
    }
    .pub-info { display: flex; flex-direction: column; gap: 4px; }
    .pub-title-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .pub-icon { font-size: 20px; color: #64748b; }
    .publication-card.is-published .pub-icon { color: #16a34a; }
    .pub-title { font-size: 14px; font-weight: 700; color: #0f172a; }
    .pub-desc { font-size: 12px; color: #64748b; margin: 0; line-height: 1.4; }
    .publication-card.is-published .pub-desc { color: #166534; }

    .status-pill {
      font-size: 11px;
      font-weight: 700;
      padding: 2px 10px;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .status-pill-active { background: #dcfce7; color: #15803d; }
    .status-pill-draft { background: #f1f5f9; color: #64748b; }

    /* Toggle switch slider */
    .toggle-switch {
      position: relative;
      display: inline-block;
      width: 48px;
      height: 26px;
      flex-shrink: 0;
      cursor: pointer;
    }
    .toggle-switch input { opacity: 0; width: 0; height: 0; }
    .slider {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background-color: #cbd5e1;
      border-radius: 26px;
      transition: 0.2s;
    }
    .slider:before {
      position: absolute;
      content: "";
      height: 20px;
      width: 20px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      border-radius: 50%;
      transition: 0.2s;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }
    input:checked + .slider { background-color: #0050e5; }
    input:checked + .slider:before { transform: translateX(22px); }

    .card-footer { padding: 16px 22px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 10px; background: #f8fafc; }
    .btn { height: 40px; padding: 0 18px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 6px; text-decoration: none; border: 1px solid transparent; }
    .btn-outline { background: #ffffff; border-color: #cbd5e1; color: #334155; }
    .btn-outline:hover { background: #f1f5f9; color: #0f172a; }
    .btn-primary { background: #0050e5; color: #ffffff; }
    .btn-primary:hover:not(:disabled) { background: #0040b8; }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
  `]
})
export class CategoryEditComponent implements OnInit {
  categoryId: string | null = null;
  isEditMode = false;
  isLoading = false;
  isSaving = false;

  model: any = {
    name: '',
    description: '',
    sortOrder: 0,
    isActive: true
  };

  headerButtons: PageHeaderButton[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.categoryId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.categoryId;

    this.headerButtons = [
      {
        text: 'Back to Categories',
        icon: 'arrow_back',
        isPrimary: false,
        routerLink: '/admin/users/categories'
      }
    ];

    if (this.isEditMode && this.categoryId) {
      this.loadCategory(this.categoryId);
    }
  }

  loadCategory(id: string): void {
    this.isLoading = true;
    this.api.get<any>(`UsersApi/categories/${id}`).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.data) {
          this.model = {
            name: res.data.name || '',
            description: res.data.description || '',
            sortOrder: res.data.sortOrder || 0,
            isActive: res.data.isActive !== false
          };
        }
      },
      error: () => {
        this.isLoading = false;
        this.toast.error('Failed to load category.');
        this.router.navigate(['/admin/users/categories']);
      }
    });
  }

  saveCategory(): void {
    if (!this.model.name.trim()) {
      this.toast.error('Category Name is required.');
      return;
    }

    this.isSaving = true;
    if (this.isEditMode && this.categoryId) {
      this.api.put<any>(`UsersApi/categories/${this.categoryId}`, this.model).subscribe({
        next: () => {
          this.isSaving = false;
          this.toast.success('Category updated successfully.');
          this.router.navigate(['/admin/users/categories']);
        },
        error: (err) => {
          this.isSaving = false;
          this.toast.error(err?.error?.message || 'Failed to update category.');
        }
      });
    } else {
      this.api.post<any>('UsersApi/categories', this.model).subscribe({
        next: () => {
          this.isSaving = false;
          this.toast.success('Category created successfully.');
          this.router.navigate(['/admin/users/categories']);
        },
        error: (err) => {
          this.isSaving = false;
          this.toast.error(err?.error?.message || 'Failed to create category.');
        }
      });
    }
  }
}
