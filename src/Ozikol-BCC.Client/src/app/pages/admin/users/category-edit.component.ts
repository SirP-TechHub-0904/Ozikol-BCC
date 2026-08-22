import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent, PageHeaderButton } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-category-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent],
  template: `
    <div class="category-form-page">
      <!-- Standardized Page Header -->
      <app-page-header
        eyebrow="CATEGORY CONFIGURATION"
        icon="category"
        [title]="isEditMode ? 'Edit Category Tier: ' + model.name : 'Create User Category Tier'"
        subtitle="Configure category identity, description, sort order, and custom hex color branding."
        [buttons]="headerButtons"
        [loading]="isLoading || isSaving"
      ></app-page-header>

      <!-- Form Card -->
      <form (ngSubmit)="saveCategory()" class="form-container" *ngIf="!isLoading">
        <div class="form-card">
          <div class="card-header">
            <div class="icon-preview-box" [style.background]="(model.colorCode || '#0050e5') + '15'" [style.color]="model.colorCode || '#0050e5'">
              <span class="material-symbols-outlined">{{ model.icon || 'category' }}</span>
            </div>
            <div>
              <h3>Category Tier Details</h3>
              <p>Organizational placement and visual badge settings</p>
            </div>
          </div>

          <div class="card-body">
            <div class="form-grid-2">
              <div class="form-group">
                <label>Category Name *</label>
                <input type="text" [(ngModel)]="model.name" name="name" placeholder="e.g. Executive Board, Engineering, Volunteers" required />
              </div>
              <div class="form-group">
                <label>Sort Order / Weight</label>
                <input type="number" [(ngModel)]="model.sortOrder" name="sortOrder" placeholder="0" />
              </div>
            </div>

            <div class="form-group">
              <label>Description (Optional)</label>
              <textarea rows="3" [(ngModel)]="model.description" name="description" placeholder="Briefly describe the responsibilities or criteria of this tier..."></textarea>
            </div>

            <div class="form-grid-2">
              <!-- Color Picker -->
              <div class="form-group">
                <label>Brand Accent Color</label>
                <div class="color-picker-row">
                  <input type="color" [(ngModel)]="model.colorCode" name="colorCode" class="color-input" />
                  <input type="text" [(ngModel)]="model.colorCode" name="colorCodeText" placeholder="#0050e5" class="color-text-input" />
                </div>
              </div>

              <!-- Icon Selector -->
              <div class="form-group">
                <label>Material Symbol Icon</label>
                <select [(ngModel)]="model.icon" name="icon">
                  <option value="category">Category (Default)</option>
                  <option value="corporate_fare">Corporate Fare</option>
                  <option value="badge">Badge</option>
                  <option value="workspace_premium">Premium Crown</option>
                  <option value="school">School / Faculty</option>
                  <option value="handshake">Partnership</option>
                  <option value="engineering">Engineering</option>
                  <option value="volunteer_activism">Volunteers</option>
                  <option value="medical_services">Medical</option>
                  <option value="group_work">Group Work</option>
                </select>
              </div>
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
    .icon-preview-box { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
    .icon-preview-box span { font-size: 24px; }
    .card-header h3 { margin: 0; font-size: 15px; font-weight: 700; color: #0f172a; }
    .card-header p { margin: 2px 0 0; font-size: 12px; color: #64748b; }
    .card-body { padding: 22px; display: flex; flex-direction: column; gap: 16px; }

    .form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    @media (max-width: 540px) { .form-grid-2 { grid-template-columns: 1fr; } }

    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #475569; letter-spacing: 0.05em; }
    .form-group input, .form-group select, .form-group textarea { padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; outline: none; background: #ffffff; color: #0f172a; transition: all 0.15s ease; }
    .form-group input:focus, .form-group select:focus, .form-group textarea:focus { border-color: #0050e5; box-shadow: 0 0 0 3px rgba(0,80,229,0.1); }

    .color-picker-row { display: flex; gap: 10px; align-items: center; }
    .color-input { width: 44px; height: 42px; padding: 2px; border-radius: 8px; border: 1px solid #cbd5e1; cursor: pointer; }
    .color-text-input { flex: 1; height: 42px; font-family: monospace; }

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
    colorCode: '#0050e5',
    icon: 'category',
    sortOrder: 0
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
            colorCode: res.data.colorCode || '#0050e5',
            icon: res.data.icon || 'category',
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
