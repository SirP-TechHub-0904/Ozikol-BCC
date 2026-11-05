import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';

/**
 * Full-width unified page for Creating and Editing Web Navigation Categories (PageCategories).
 * Supports comprehensive entity model fields including menu positioning zones, footer columns,
 * icon strings, custom CSS classes, and parent dropdown hierarchies.
 */
@Component({
  selector: 'app-web-category-edit',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="cms-page-container">
      <!-- Full-Width Header Bar -->
      <div class="page-header">
        <div class="header-titles">
          <div class="breadcrumb">
            <a routerLink="/content/console">CMS Studio</a>
            <span class="sep">/</span>
            <a routerLink="/content/console/categories">Web Categories</a>
            <span class="sep">/</span>
            <span class="current">{{ isEditMode ? 'Edit Category' : 'Create Category' }}</span>
          </div>
          <h1>{{ isEditMode ? ('Edit Menu Category: ' + (category?.title || '')) : 'Create Web Menu Category' }}</h1>
          <p class="subtitle">
            {{ isEditMode 
              ? 'Update navigation category configuration, parent hierarchy, and sorting position.' 
              : 'Add a new navigation category for header dropdown menus and footer columns.' }}
          </p>
        </div>
        <div class="header-actions">
          <a routerLink="/content/console/categories" class="btn btn-outline">
            <span class="material-symbols-outlined">arrow_back</span>
            <span>Back to Categories</span>
          </a>
          <button type="button" class="btn btn-primary" (click)="saveCategory()" [disabled]="saving || loading">
            <span class="material-symbols-outlined">save</span>
            <span *ngIf="!saving">{{ isEditMode ? 'Save Changes' : 'Create Category' }}</span>
            <span *ngIf="saving">Saving...</span>
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div class="loading-box" *ngIf="loading">
        <span class="material-symbols-outlined spin">progress_activity</span>
        <p>Loading category details...</p>
      </div>

      <!-- Alerts -->
      <div class="alert-banner error" *ngIf="errorMessage">
        <span class="material-symbols-outlined">error</span>
        <span>{{ errorMessage }}</span>
      </div>
      <div class="alert-banner success" *ngIf="successMessage">
        <span class="material-symbols-outlined">check_circle</span>
        <span>{{ successMessage }}</span>
      </div>

      <!-- Unified Form Card (Full Width) -->
      <div class="cms-card full-width-card" *ngIf="!loading && category">
        <div class="card-header-bar">
          <div>
            <h3>Category Information & Settings</h3>
            <p class="card-sub">Every field from the PageCategory entity is exposed below.</p>
          </div>
          <span class="badge-status" [class.published]="category.publish" [class.draft]="!category.publish">
            {{ category.publish ? 'Published' : 'Hidden / Offline' }}
          </span>
        </div>

        <div class="form-grid">
          <!-- 1. Category Title -->
          <div class="form-group full-width">
            <label>CATEGORY TITLE <span class="req">*</span></label>
            <input 
              type="text" 
              [(ngModel)]="category.title" 
              class="form-control" 
              placeholder="e.g. Services, About Us, Resources">
            <small class="help-text">The display name of the dropdown group in the navigation menu.</small>
          </div>

          <!-- 2. Menu Zone Position -->
          <div class="form-group">
            <label>MENU ZONE POSITION <span class="req">*</span></label>
            <select [(ngModel)]="category.menuPosition" class="form-control">
              <option [ngValue]="1">First Zone (NavItems="first")</option>
              <option [ngValue]="2">Middle Zone (NavItems="middle")</option>
              <option [ngValue]="3">Last Zone (NavItems="last")</option>
              <option [ngValue]="4">Top Utility Bar (MainMenuItems="top")</option>
            </select>
            <small class="help-text">Which navigation region of the website header renders this category.</small>
          </div>

          <!-- 3. Menu Sort Order -->
          <div class="form-group">
            <label>MENU SORT ORDER</label>
            <input type="number" [(ngModel)]="category.menuSortOrder" class="form-control" placeholder="0">
            <small class="help-text">Order position within its menu zone (lower numbers appear first).</small>
          </div>

          <!-- 4. Parent Category Hierarchy -->
          <div class="form-group">
            <label>PARENT CATEGORY (NESTED SUB-DROPDOWNS)</label>
            <select [(ngModel)]="category.parentId" class="form-control">
              <option [ngValue]="null">Top-Level Category (No Parent)</option>
              <option *ngFor="let c of otherCategories" [ngValue]="c.id">{{ c.title }}</option>
            </select>
            <small class="help-text">Optional parent category to create cascading sub-menus.</small>
          </div>


          <!-- 6. Icon Class String -->
          <div class="form-group">
            <label>ICON CLASS STRING</label>
            <input type="text" [(ngModel)]="category.icon" class="form-control" placeholder="e.g. fa-solid fa-folder, bi bi-grid">
            <small class="help-text">FontAwesome / Bootstrap / Material icon class displayed next to the label.</small>
          </div>

          <!-- 7. Custom CSS Class -->
          <div class="form-group">
            <label>CUSTOM CSS CLASS</label>
            <input type="text" [(ngModel)]="category.customClass" class="form-control" placeholder="e.g. nav-highlight, menu-accent">
            <small class="help-text">Injected into menu item containers via template tokens.</small>
          </div>

          <!-- 8. Footer Display Title -->
          <div class="form-group">
            <label>FOOTER DISPLAY TITLE (OPTIONAL OVERRIDE)</label>
            <input type="text" [(ngModel)]="category.footerDisplayTitle" class="form-control" placeholder="e.g. Quick Links, Our Solutions">
            <small class="help-text">Override title when rendered as a footer column header (leave blank to use Category Title).</small>
          </div>

          <!-- 9. Footer Sort Order -->
          <div class="form-group">
            <label>FOOTER COLUMN SORT ORDER</label>
            <input type="number" [(ngModel)]="category.footerSortOrder" class="form-control" placeholder="0">
            <small class="help-text">Explicit column ordering position among other website footer columns.</small>
          </div>

          <!-- 10. Placements & Visibility Toggles (Full Width) -->
          <div class="form-group full-width">
            <label>CATEGORY VISIBILITY & PLACEMENTS</label>
            <div class="toggles-grid">
              <div class="checkbox-card">
                <input type="checkbox" [(ngModel)]="category.publish" id="catPub">
                <label for="catPub">
                  <strong>Publish Category</strong>
                  <p>When checked, this category is active across the tenant website.</p>
                </label>
              </div>

              <div class="checkbox-card">
                <input type="checkbox" [(ngModel)]="category.showInMenu" id="catShowMenu">
                <label for="catShowMenu">
                  <strong>Show in Navigation Header (Navbar Dropdown)</strong>
                  <p>When enabled, renders as a dropdown category in the main menu header.</p>
                </label>
              </div>

              <div class="checkbox-card">
                <input type="checkbox" [(ngModel)]="category.showInFooter" id="catShowFooter">
                <label for="catShowFooter">
                  <strong>Show as Column in Website Footer</strong>
                  <p>When enabled, renders as a dedicated column header with attached pages in the footer.</p>
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- Form Actions Bar -->
        <div class="form-actions-bottom">
          <a routerLink="/content/console/categories" class="btn btn-outline">Cancel</a>
          <button type="button" class="btn btn-primary" (click)="saveCategory()" [disabled]="saving || loading">
            <span class="material-symbols-outlined">save</span>
            <span>{{ isEditMode ? 'Save Category Changes' : 'Create Web Category' }}</span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
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
      padding: 10px 20px;
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
    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .cms-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 28px 32px;
      width: 100%;
      box-sizing: border-box;
    }
    .full-width-card {
      width: 100%;
    }
    .card-header-bar {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid #f1f5f9;
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

    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 22px;
    }
    .full-width {
      grid-column: span 2;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .form-group label {
      font-size: 11px;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .form-group label .req {
      color: #e11d48;
    }
    .form-control {
      padding: 11px 14px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 13px;
      color: #0f172a;
      background: #ffffff;
      transition: border-color 0.15s ease;
      width: 100%;
      box-sizing: border-box;
    }
    .form-control:focus {
      outline: none;
      border-color: #0050e5;
      box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.12);
    }
    .help-text {
      font-size: 11px;
      color: #64748b;
    }

    .toggles-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 14px;
      margin-top: 8px;
    }
    .checkbox-card {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      background: #f8fafc;
      padding: 16px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .checkbox-card:hover {
      border-color: #cbd5e1;
      background: #f1f5f9;
    }
    .checkbox-card input[type="checkbox"] {
      margin-top: 3px;
      width: 18px;
      height: 18px;
      cursor: pointer;
    }
    .checkbox-card label {
      cursor: pointer;
      font-size: 13px;
      color: #0f172a;
      text-transform: none !important;
      letter-spacing: normal !important;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .checkbox-card label strong {
      font-weight: 700;
      color: #1e293b;
    }
    .checkbox-card label p {
      font-size: 12px;
      color: #64748b;
      margin: 0;
      line-height: 1.4;
    }

    .badge-status {
      padding: 5px 14px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 700;
    }
    .badge-status.published {
      background: #dcfce7;
      color: #15803d;
    }
    .badge-status.draft {
      background: #f1f5f9;
      color: #64748b;
    }

    .form-actions-bottom {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 28px;
      padding-top: 20px;
      border-top: 1px solid #f1f5f9;
    }

    .alert-banner {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 18px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
    }
    .alert-banner.error {
      background: #fee2e2;
      color: #991b1b;
      border: 1px solid #fecaca;
    }
    .alert-banner.success {
      background: #dcfce7;
      color: #166534;
      border: 1px solid #bbf7d0;
    }

    .loading-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px;
      color: #64748b;
      background: #ffffff;
      border-radius: 16px;
      border: 1px solid #e2e8f0;
    }
    .spin {
      animation: spin 1s linear infinite;
      font-size: 32px;
      color: #0050e5;
      margin-bottom: 12px;
    }
    @keyframes spin {
      100% { transform: rotate(360deg); }
    }

    @media (max-width: 992px) {
      .form-grid {
        grid-template-columns: 1fr;
      }
      .full-width {
        grid-column: span 1;
      }
      .toggles-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class WebCategoryEditComponent implements OnInit {
  categoryId = '';
  isEditMode = false;
  category: any = null;
  allCategories: any[] = [];
  loading = false;
  saving = false;
  successMessage = '';
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'create') {
      this.categoryId = idParam;
      this.isEditMode = true;
      this.loadCategory();
    } else {
      this.isEditMode = false;
      this.initDefaultCategory();
      this.loadOtherCategories();
    }
  }

  initDefaultCategory(): void {
    this.category = {
      title: '',
      menuPosition: 2, // Middle
      menuSortOrder: 0,
      icon: '',
      customClass: '',
      parentId: null,
      footerDisplayTitle: '',
      footerSortOrder: 0,
      publish: true,
      showInMenu: true,
      showInFooter: true
    };
  }

  loadCategory(): void {
    this.loading = true;
    this.api.get<any>('ContentApi/categories').subscribe({
      next: (res) => {
        this.loading = false;
        this.allCategories = res?.data || [];
        this.category = this.allCategories.find(c => c.id.toLowerCase() === this.categoryId.toLowerCase());
        if (!this.category) {
          this.errorMessage = 'Category not found.';
        }
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Failed to load category details.';
      }
    });
  }

  loadOtherCategories(): void {
    this.api.get<any>('ContentApi/categories').subscribe({
      next: (res) => {
        this.allCategories = res?.data || [];
      }
    });
  }

  get otherCategories(): any[] {
    if (!this.categoryId) {
      return this.allCategories;
    }
    return this.allCategories.filter(c => c.id.toLowerCase() !== this.categoryId.toLowerCase());
  }

  saveCategory(): void {
    if (!this.category?.title?.trim()) {
      this.errorMessage = 'Category Title is required.';
      this.toast.warning('Category Title is required.');
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    if (this.isEditMode) {
      this.api.put<any>(`ContentApi/categories/${this.categoryId}`, this.category).subscribe({
        next: () => {
          this.saving = false;
          this.toast.success('Category updated successfully!');
          this.router.navigate(['/content/console/categories']);
        },
        error: (err) => {
          this.saving = false;
          this.errorMessage = err?.error?.message || 'Failed to update category.';
          this.toast.error(this.errorMessage);
        }
      });
    } else {
      this.api.post<any>('ContentApi/categories', this.category).subscribe({
        next: () => {
          this.saving = false;
          this.toast.success('Category created successfully!');
          this.router.navigate(['/content/console/categories']);
        },
        error: (err) => {
          this.saving = false;
          this.errorMessage = err?.error?.message || 'Failed to create category.';
          this.toast.error(this.errorMessage);
        }
      });
    }
  }
}
