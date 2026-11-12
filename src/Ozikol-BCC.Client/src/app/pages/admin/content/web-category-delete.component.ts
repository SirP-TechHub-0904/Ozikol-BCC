import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-web-category-delete',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="delete-page-container">
      <!-- Breadcrumb & Top Bar -->
      <div class="page-header-bar">
        <div class="header-titles">
          <div class="breadcrumb">
            <a routerLink="/content/console">CMS Studio</a>
            <span class="sep">/</span>
            <a routerLink="/content/console/categories">Web Categories</a>
            <span class="sep">/</span>
            <span class="current danger-text">Delete Category</span>
          </div>
          <h1 class="page-title danger-title">
            <span class="material-symbols-outlined danger-icon">warning</span>
            Confirm Menu Navigation Category Deletion
          </h1>
          <p class="page-sub">Review public site navigation and dropdown grouping consequences before permanently destroying this category.</p>
        </div>

        <div class="header-actions">
          <a routerLink="/content/console/categories" class="btn btn-secondary">
            <span class="material-symbols-outlined">arrow_back</span>
            <span>Cancel & Go Back</span>
          </a>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="state-card loading">
        <span class="material-symbols-outlined spin">progress_activity</span>
        <p>Loading category record...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="errorMsg && !loading" class="alert-banner error">
        <span class="material-symbols-outlined">error</span>
        <span>{{ errorMsg }}</span>
      </div>

      <!-- Main Deletion Danger Zone -->
      <div class="delete-layout" *ngIf="!loading && category">
        <!-- Target Record Summary Card -->
        <div class="record-summary-card">
          <div class="summary-head">
            <span class="material-symbols-outlined">folder</span>
            <h3>Category Record to be Deleted</h3>
          </div>

          <div class="record-body">
            <div class="cat-icon-box">
              <span class="material-symbols-outlined">category</span>
            </div>

            <div class="record-details">
              <h2 class="record-title">{{ category.title }}</h2>
              <p class="record-sub">
                Menu Header: {{ category.showInMenu ? 'Enabled' : 'Hidden' }} &bull;
                Footer Column: {{ category.showInFooter ? (category.footerDisplayTitle || category.title) : 'Disabled' }}
              </p>

              <div class="meta-row">
                <span class="meta-pill" [ngClass]="category.publish ? 'published' : 'draft'">
                  {{ category.publish ? 'Published on Header Menu' : 'Draft / Hidden' }}
                </span>
                <span class="meta-pill count-pill">{{ attachedPageCount }} Web Page{{ attachedPageCount === 1 ? '' : 's' }} Attached</span>
                <span class="meta-date">Menu Sort Order: {{ category.menuSortOrder ?? category.sortOrder ?? 0 }}</span>
              </div>

              <div class="attached-pages-note" *ngIf="attachedPageCount > 0">
                The category has {{ attachedPageCount }} page{{ attachedPageCount === 1 ? '' : 's' }} binded — unbind them below before deleting.
              </div>
            </div>
          </div>
        </div>

        <!-- Bound Pages List & Unbind Controls (Same-Page Resolution) -->
        <div class="bound-pages-card" *ngIf="attachedPageCount > 0">
          <div class="bound-pages-head">
            <div class="bound-head-left">
              <span class="material-symbols-outlined">link_off</span>
              <div>
                <h3>Bound Web Pages ({{ attachedPageCount }}) — Unbind First</h3>
                <p>The category has some pages binded. Unbind individual pages or clear all bound pages below to proceed with deletion.</p>
              </div>
            </div>
            <button
              type="button"
              class="btn btn-primary-blue"
              (click)="unbindAllPages()"
              [disabled]="unbindingAll || !!unbindingPageId"
            >
              <span class="material-symbols-outlined">{{ unbindingAll ? 'hourglass_top' : 'link_off' }}</span>
              <span>{{ unbindingAll ? 'Unbinding...' : 'Unbind All Pages (' + attachedPageCount + ')' }}</span>
            </button>
          </div>

          <div class="bound-pages-list">
            <div class="bound-page-row" *ngFor="let p of category.webPages">
              <div class="bound-page-info">
                <span class="material-symbols-outlined bound-page-icon">article</span>
                <div>
                  <strong class="bound-page-title">{{ p.title || '(Untitled Page)' }}</strong>
                  <div class="bound-page-meta">
                    <code>{{ formatSlug(p.directUrl || p.slug) }}</code>
                    <span class="status-tag" [class.live]="p.publish" [class.draft]="!p.publish">
                      {{ p.publish ? 'Published' : 'Draft' }}
                    </span>
                  </div>
                </div>
              </div>

              <div class="bound-page-actions">
                <a
                  [routerLink]="['/content/console/pages/edit', p.id]"
                  target="_blank"
                  class="btn btn-sm btn-outline-light"
                  title="Open page settings in a new tab"
                >
                  <span class="material-symbols-outlined">open_in_new</span>
                  <span>View / Edit</span>
                </a>
                <button
                  type="button"
                  class="btn btn-sm btn-unbind"
                  (click)="unbindSinglePage(p)"
                  [disabled]="unbindingAll || unbindingPageId === p.id"
                >
                  <span class="material-symbols-outlined">{{ unbindingPageId === p.id ? 'hourglass_top' : 'link_off' }}</span>
                  <span>{{ unbindingPageId === p.id ? 'Unbinding...' : 'Unbind' }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Consequences Warning Box -->
        <div class="consequences-card">
          <div class="consequences-head">
            <span class="material-symbols-outlined">dangerous</span>
            <h3>Consequences of Deleting this Navigation Category</h3>
          </div>

          <ul class="consequences-list">
            <li>
              <strong>Bound Pages Prerequisite:</strong> Any web pages still grouped under this category must be unbound to <em>Standalone / Uncategorized</em> first using the list above.
            </li>
            <li>
              <strong>Header Menu Dropdown Removal:</strong> This dropdown menu will immediately disappear from the public website header.
            </li>
            <li>
              <strong>Permanent Record Eradication:</strong> This web menu category cannot be recovered after deletion.
            </li>
          </ul>
        </div>

        <!-- Exact Category Title Confirmation & Action -->
        <div class="confirmation-card">
          <div class="confirm-instruction">
            <p>
              To confirm that you understand these consequences and intend to permanently destroy this category, please type the exact category title:
            </p>
            <div class="target-title-pill" (click)="copyTitle()" title="Click to copy">
              <code>{{ category.title }}</code>
            </div>
          </div>

          <div class="confirm-input-group">
            <label>TYPE CATEGORY TITLE TO CONFIRM DELETION:</label>
            <input
              type="text"
              [(ngModel)]="confirmationInput"
              placeholder="Type the exact category title here..."
              class="confirm-input"
              [class.matched]="isTitleMatched()"
            />

            <div class="match-status" *ngIf="confirmationInput">
              <span *ngIf="isTitleMatched()" class="status-match">
                <span class="material-symbols-outlined">check_circle</span> Category title matched. Deletion unlocked.
              </span>
              <span *ngIf="!isTitleMatched()" class="status-mismatch">
                <span class="material-symbols-outlined">cancel</span> Category title does not match yet.
              </span>
            </div>
          </div>

          <div class="delete-action-row">
            <a routerLink="/content/console/categories" class="btn btn-secondary">
              <span>Cancel</span>
            </a>
            <button
              type="button"
              class="btn btn-danger"
              (click)="executeDelete()"
              [disabled]="!isTitleMatched() || deleting"
            >
              <span class="material-symbols-outlined">{{ deleting ? 'hourglass_top' : 'delete_forever' }}</span>
              <span>{{ deleting ? 'Deleting Category...' : 'I understand the consequences, delete this category' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .delete-page-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
      width: 100%;
      max-width: 100%;
    }

    .page-header-bar {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      flex-wrap: wrap;
      gap: 16px;
    }
    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12.5px;
      font-weight: 700;
      color: #64748b;
      margin-bottom: 4px;
    }
    .breadcrumb a { color: #0050e5; text-decoration: none; }
    .breadcrumb .sep { color: #cbd5e1; }
    .breadcrumb .danger-text { color: #dc2626; }

    .page-title {
      font-size: 22px;
      font-weight: 800;
      margin: 0 0 4px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .danger-title { color: #dc2626; }
    .danger-icon { font-size: 26px; color: #dc2626; }
    .page-sub { font-size: 13px; color: #64748b; margin: 0; }

    .header-actions { display: flex; align-items: center; gap: 10px; }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
      text-decoration: none;
    }
    .btn-secondary { background: #ffffff; color: #334155; border: 1px solid #cbd5e1; }
    .btn-secondary:hover { background: #f8fafc; }
    .btn-danger {
      background: #dc2626;
      color: #ffffff;
      box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
    }
    .btn-danger:hover:not(:disabled) { background: #b91c1c; transform: translateY(-1px); }
    .btn-danger:disabled {
      background: #fca5a5;
      cursor: not-allowed;
      box-shadow: none;
      opacity: 0.7;
    }

    .alert-banner {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 18px;
      border-radius: 10px;
      font-size: 13.5px;
      font-weight: 600;
    }
    .alert-banner.error { background: rgba(239, 68, 68, 0.12); color: #ef4444; border: 1px solid #ef4444; }

    .state-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 40px;
      text-align: center;
      color: #64748b;
    }
    .spin { animation: spin 1s linear infinite; font-size: 32px; color: #0050e5; }
    @keyframes spin { 100% { transform: rotate(360deg); } }

    .delete-layout { display: flex; flex-direction: column; gap: 20px; }

    .record-summary-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 22px 26px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
    }
    .summary-head {
      display: flex;
      align-items: center;
      gap: 8px;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .summary-head h3 { font-size: 15px; font-weight: 800; color: #0f172a; margin: 0; }
    .summary-head span { font-size: 20px; color: #0050e5; }

    .record-body { display: flex; gap: 20px; align-items: center; }
    .cat-icon-box {
      width: 64px;
      height: 64px;
      border-radius: 14px;
      background: rgba(0, 80, 229, 0.1);
      color: #0050e5;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .cat-icon-box span { font-size: 32px; }

    .record-details { display: flex; flex-direction: column; gap: 4px; flex: 1; }
    .record-title { font-size: 18px; font-weight: 800; color: #0f172a; margin: 0; }
    .record-sub { font-size: 13.5px; color: #64748b; margin: 0; }

    .meta-row { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-top: 6px; }
    .meta-pill {
      font-size: 11.5px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
    }
    .meta-pill.published { background: rgba(34, 197, 94, 0.12); color: #16a34a; }
    .meta-pill.draft { background: rgba(100, 116, 139, 0.12); color: #64748b; }
    .meta-pill.count-pill { background: #f1f5f9; color: #334155; }
    .meta-date { font-size: 12px; color: #94a3b8; }
    .attached-pages-note { font-size: 12px; color: #475569; margin-top: 8px; }

    .consequences-card {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 16px;
      padding: 22px 26px;
    }
    .consequences-head {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
    }
    .consequences-head h3 { font-size: 15px; font-weight: 800; color: #991b1b; margin: 0; }
    .consequences-head span { font-size: 22px; color: #dc2626; }

    .consequences-list {
      margin: 0;
      padding-left: 20px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      font-size: 13px;
      color: #7f1d1d;
      line-height: 1.5;
    }

    .confirmation-card {
      background: #ffffff;
      border: 2px solid #ef4444;
      border-radius: 16px;
      padding: 24px 28px;
      box-shadow: 0 4px 16px rgba(239, 68, 68, 0.08);
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .confirm-instruction p {
      font-size: 13.5px;
      color: #0f172a;
      margin: 0 0 8px;
      font-weight: 600;
    }
    .target-title-pill {
      display: inline-block;
      background: #fee2e2;
      border: 1px dashed #f87171;
      padding: 6px 14px;
      border-radius: 8px;
      cursor: pointer;
    }
    .target-title-pill code { font-size: 14px; font-weight: 800; color: #991b1b; }

    .confirm-input-group { display: flex; flex-direction: column; gap: 6px; }
    .confirm-input-group label {
      font-size: 12px;
      font-weight: 800;
      color: #334155;
      letter-spacing: 0.5px;
    }
    .confirm-input {
      padding: 12px 16px;
      border: 2px solid #cbd5e1;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      outline: none;
      transition: all 0.2s;
      background: #f8fafc;
    }
    .confirm-input:focus {
      border-color: #ef4444;
      background: #ffffff;
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.12);
    }
    .confirm-input.matched {
      border-color: #22c55e;
      background: #f0fdf4;
    }

    .match-status { font-size: 12px; font-weight: 700; }
    .status-match { color: #16a34a; display: flex; align-items: center; gap: 4px; }
    .status-mismatch { color: #dc2626; display: flex; align-items: center; gap: 4px; }
    .status-match span, .status-mismatch span { font-size: 16px; }

    .delete-action-row {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 12px;
      border-top: 1px solid #f1f5f9;
      padding-top: 16px;
      margin-top: 4px;
    }

    /* Bound Pages Unbind Card */
    .bound-pages-card {
      background: #ffffff;
      border: 1.5px solid #93c5fd;
      border-radius: 16px;
      padding: 20px 24px;
      box-shadow: 0 4px 12px rgba(0, 80, 229, 0.06);
    }
    .bound-pages-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 14px;
      padding-bottom: 14px;
      border-bottom: 1px solid #e2e8f0;
      margin-bottom: 14px;
    }
    .bound-head-left {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }
    .bound-head-left > span {
      color: #0050e5;
      font-size: 24px;
      margin-top: 2px;
    }
    .bound-head-left h3 {
      margin: 0 0 2px;
      font-size: 15.5px;
      font-weight: 800;
      color: #0f172a;
    }
    .bound-head-left p {
      margin: 0;
      font-size: 12.5px;
      color: #475569;
    }
    .btn-primary-blue {
      background: #0050e5;
      color: #ffffff;
    }
    .btn-primary-blue:hover:not(:disabled) {
      background: #003fb8;
    }
    .btn-primary-blue:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .bound-pages-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .bound-page-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
      padding: 12px 14px;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      background: #f8fafc;
    }
    .bound-page-info {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .bound-page-icon {
      color: #0050e5;
      font-size: 20px;
    }
    .bound-page-title {
      display: block;
      font-size: 13.5px;
      color: #0f172a;
    }
    .bound-page-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 3px;
      font-size: 11.5px;
    }
    .bound-page-meta code {
      background: #e2e8f0;
      color: #334155;
      padding: 1px 6px;
      border-radius: 4px;
    }
    .status-tag {
      padding: 1px 7px;
      border-radius: 10px;
      font-weight: 700;
      font-size: 11px;
    }
    .status-tag.live { background: #dcfce7; color: #15803d; }
    .status-tag.draft { background: #e2e8f0; color: #475569; }
    .bound-page-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .btn-sm {
      padding: 6px 12px;
      font-size: 12px;
    }
    .btn-outline-light {
      background: #ffffff;
      color: #334155;
      border: 1px solid #cbd5e1;
    }
    .btn-outline-light:hover { background: #f1f5f9; }
    .btn-unbind {
      background: #eff6ff;
      color: #0050e5;
      border: 1px solid #bfdbfe;
    }
    .btn-unbind:hover:not(:disabled) {
      background: #0050e5;
      color: #ffffff;
    }
    .btn-unbind:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `]
})
export class WebCategoryDeleteComponent implements OnInit {
  categoryId: string | null = null;
  category: any = null;
  loading = false;
  deleting = false;
  unbindingAll = false;
  unbindingPageId: string | null = null;
  confirmationInput = '';
  errorMsg = '';

  constructor(
    private api: ApiService,
    private toast: ToastService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.categoryId = id;
        this.loadCategory(id);
      }
    });
  }

  loadCategory(id: string): void {
    this.loading = true;
    this.api.get<any>(`ContentApi/categories/${id}`).subscribe({
      next: (res) => {
        this.loading = false;
        if (res?.data) {
          this.category = res.data;
        } else {
          this.errorMsg = 'Page category record not found.';
        }
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = err?.error?.message || 'Failed to load page category.';
      }
    });
  }

  /** Returns the actual count of web pages attached to this category. */
  get attachedPageCount(): number {
    return this.category?.webPages?.length ?? this.category?.pageCount ?? 0;
  }

  /** Returns a readable comma-separated list of attached page titles. */
  get attachedPageTitlesPreview(): string {
    const pages = this.category?.webPages || [];
    return pages.map((p: any) => p.title || 'Untitled').join(', ');
  }

  /** Returns a normal leading-slash slug label for a bound page row. */
  formatSlug(raw?: string): string {
    const val = (raw || '').trim();
    if (!val || val === '/') return '/';
    if (val.startsWith('http://') || val.startsWith('https://')) return val;
    return '/' + val.replace(/^\/+/, '');
  }

  /** Unbinds a single bound web page from this category directly on the delete page. */
  unbindSinglePage(page: any): void {
    if (!this.categoryId || !page?.id) return;
    this.unbindingPageId = page.id;
    this.errorMsg = '';

    this.api.post<any>(`ContentApi/categories/${this.categoryId}/unbind-pages`, { webPageId: page.id }).subscribe({
      next: () => {
        this.unbindingPageId = null;
        this.category.webPages = (this.category?.webPages || []).filter((p: any) => p.id !== page.id);
        this.toast.success(`"${page.title}" unbound to Standalone.`);
      },
      error: (err) => {
        this.unbindingPageId = null;
        this.errorMsg = err?.error?.message || 'Failed to unbind web page.';
      }
    });
  }

  /** Clears all bound web pages from this category in one click on the same page. */
  unbindAllPages(): void {
    if (!this.categoryId || this.attachedPageCount === 0) return;
    this.unbindingAll = true;
    this.errorMsg = '';

    this.api.post<any>(`ContentApi/categories/${this.categoryId}/unbind-pages`, {}).subscribe({
      next: (res) => {
        this.unbindingAll = false;
        this.category.webPages = [];
        this.toast.success(res?.message || 'All bound pages cleared to Standalone.');
      },
      error: (err) => {
        this.unbindingAll = false;
        this.errorMsg = err?.error?.message || 'Failed to unbind attached pages.';
      }
    });
  }

  isTitleMatched(): boolean {
    if (!this.category?.title || !this.confirmationInput) return false;
    return this.confirmationInput.trim().toLowerCase() === this.category.title.trim().toLowerCase();
  }

  copyTitle(): void {
    if (this.category?.title) {
      navigator.clipboard?.writeText(this.category.title);
      this.confirmationInput = this.category.title;
    }
  }

  executeDelete(): void {
    if (!this.isTitleMatched() || !this.categoryId) return;

    this.deleting = true;
    this.errorMsg = '';

    this.api.delete<any>(`ContentApi/categories/${this.categoryId}?confirmationTitle=${encodeURIComponent(this.confirmationInput.trim())}`).subscribe({
      next: () => {
        this.deleting = false;
        this.toast.success(`Web category '${this.category.title}' deleted successfully.`);
        this.router.navigate(['/content/console/categories']);
      },
      error: (err) => {
        this.deleting = false;
        this.errorMsg = err?.error?.message || 'Failed to delete web category.';
      }
    });
  }
}
