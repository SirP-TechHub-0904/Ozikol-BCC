import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent, PageHeaderButton } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-web-page-details',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, PageHeaderComponent],
  template: `
    <div class="cms-page-container">
      <!-- Standardized Reusable Page Header -->
      <app-page-header
        eyebrow="CMS Studio / All Web Pages"
        icon="article"
        [title]="page?.title || 'Page Details'"
        [subtitle]="headerSubtitle"
        [buttons]="headerButtons"
        [loading]="loading"
      ></app-page-header>

      <!-- Loading State -->
      <div class="loading-box" *ngIf="loading">
        <span class="material-symbols-outlined spin">progress_activity</span>
        <p>Loading page details...</p>
      </div>

      <!-- Tab Switcher -->
      <div class="detail-tabs" *ngIf="!loading && page">
        <button type="button" class="tab-btn" [class.active]="activeTab === 'sections'" (click)="activeTab = 'sections'">
          <span class="material-symbols-outlined">layers</span>
          <span>Page Layout Sections ({{ page?.pageSections?.length || 0 }})</span>
        </button>
        <button type="button" class="tab-btn" [class.active]="activeTab === 'overview'" (click)="activeTab = 'overview'">
          <span class="material-symbols-outlined">info</span>
          <span>Page Overview & Metadata</span>
        </button>
      </div>

      <!-- TAB 1: SECTIONS MANAGER -->
      <div class="tab-content" *ngIf="!loading && page && activeTab === 'sections'">
        <div class="cms-card">
          <div class="card-header-bar">
            <div>
              <h3>Attached Layout Blocks</h3>
              <p class="card-sub">Sections render from top to bottom based on Page Sort Order.</p>
            </div>
            <a [routerLink]="['/content/console/sections/create']" [queryParams]="{ webPageId: pageId }" class="btn btn-primary btn-sm">
              <span class="material-symbols-outlined">add_circle</span>
              <span>Add New Section</span>
            </a>
          </div>

          <div class="table-responsive">
            <table class="cms-table">
              <thead>
                <tr>
                  <th>ORDER</th>
                  <th>SECTION TITLE</th>
                  <th>MINI TITLE</th>
                  <th>TEMPLATE KEY</th>
                  <th>SUB-ITEMS</th>
                  <th>HOME VISIBLE</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let sec of page.pageSections">
                  <td><span class="order-badge">#{{ sec.pageSortOrder }}</span></td>
                  <td>
                    <strong>{{ sec.title || '(Untitled Section)' }}</strong>
                    <div class="sub-text" *ngIf="sec.description">{{ sec.description | slice:0:50 }}...</div>
                  </td>
                  <td><span class="mini-pill">{{ sec.miniTitle || '-' }}</span></td>
                  <td><code>{{ sec.templateKey || 'default-block' }}</code></td>
                  <td>
                    <span class="subitems-badge">
                      {{ sec.pageSectionLists?.length || 0 }} Items
                    </span>
                  </td>
                  <td>
                    <span class="status-pill" [class.published]="sec.showInHome" [class.draft]="!sec.showInHome">
                      {{ sec.showInHome ? 'Yes' : 'No' }}
                    </span>
                  </td>
                  <td>
                    <div class="action-buttons">
                      <a [routerLink]="['/content/console/sections/details', sec.id]" class="btn-action btn-details" title="Manage sub-items">
                        <span class="material-symbols-outlined">list</span>
                        <span>Items</span>
                      </a>
                      <a [routerLink]="['/content/console/sections/edit', sec.id]" class="btn-action btn-edit" title="Edit section">
                        <span class="material-symbols-outlined">edit</span>
                        <span>Edit</span>
                      </a>
                      <a [routerLink]="['/content/console/sections/delete', sec.id]" [queryParams]="{ returnUrl: '/content/console/pages/details/' + page.id }" class="btn-action btn-delete" title="Delete Section">
                        <span class="material-symbols-outlined">delete</span>
                      </a>
                    </div>
                  </td>
                </tr>
                <tr *ngIf="!page.pageSections || page.pageSections.length === 0">
                  <td colspan="7" class="empty-cell">
                    <div class="empty-state">
                      <span class="material-symbols-outlined">view_quilt</span>
                      <p>No layout sections added yet.</p>
                      <a [routerLink]="['/content/console/sections/create']" [queryParams]="{ webPageId: pageId }" class="btn btn-outline btn-sm" style="margin-top: 10px;">
                        <span class="material-symbols-outlined">add_circle</span>
                        <span>Add First Section</span>
                      </a>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- TAB 2: OVERVIEW & SEO -->
      <div class="tab-content" *ngIf="!loading && page && activeTab === 'overview'">
        <div class="overview-grid">
          <div class="cms-card">
            <div class="card-header-bar">
              <h3>General Configuration</h3>
            </div>
            <div class="info-list">
              <div class="info-row">
                <span>Page Title:</span>
                <strong>{{ page.title }}</strong>
              </div>
              <div class="info-row">
                <span>Direct Route:</span>
                <code>{{ displayDirectRoute }}</code>
              </div>
              <div class="info-row">
                <span>Menu Category:</span>
                <span>{{ page.pageCategory?.title || 'Standalone' }}</span>
              </div>
              <div class="info-row">
                <span>Publication Status:</span>
                <span class="status-pill" [class.published]="page.publish" [class.draft]="!page.publish">
                  {{ page.publish ? 'Published' : 'Draft' }}
                </span>
              </div>
              <div class="info-row">
                <span>Protected (Auth Required):</span>
                <span>{{ page.securityPage ? 'Yes (Requires Login)' : 'No (Public)' }}</span>
              </div>
            </div>
          </div>

          <div class="cms-card">
            <div class="card-header-bar">
              <h3>SEO & Analytics Summary</h3>
            </div>
            <div class="info-list">
              <div class="info-row">
                <span>Meta Title:</span>
                <span>{{ page.metaTitle || '(Not set)' }}</span>
              </div>
              <div class="info-row">
                <span>Meta Description:</span>
                <small>{{ page.metaDescription || '(Not set)' }}</small>
              </div>
              <div class="info-row">
                <span>Meta Keywords:</span>
                <span>{{ page.metaKeywords || '(Not set)' }}</span>
              </div>
              <div class="info-row">
                <span>Cumulative Visits:</span>
                <strong>{{ page.viewCount || 0 }} views</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .cms-page-container { display: flex; flex-direction: column; gap: 24px; }

    .btn {
      display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px;
      border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; text-decoration: none;
    }
    .btn-primary { background: #0050e5; color: #fff; border: none; }
    .btn-outline { background: transparent; border: 1px solid #cbd5e1; color: #334155; }
    .btn-sm { padding: 8px 14px; font-size: 12px; }

    .detail-tabs {
      display: flex; gap: 8px; background: #fff; padding: 6px;
      border-radius: 12px; border: 1px solid #e2e8f0; width: fit-content;
    }
    .tab-btn {
      display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px;
      border-radius: 8px; font-size: 13px; font-weight: 700; border: none;
      background: transparent; color: #64748b; cursor: pointer; transition: all 0.2s;
    }
    .tab-btn.active { background: #eff6ff; color: #0050e5; }

    .cms-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; }
    .card-header-bar {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 20px; padding-bottom: 14px; border-bottom: 1px solid #f1f5f9;
    }
    .card-header-bar h3 { font-size: 17px; font-weight: 800; color: #0f172a; margin: 0 0 2px; }
    .card-sub { font-size: 13px; color: #64748b; margin: 0; }

    .cms-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .cms-table th {
      text-align: left; padding: 12px; background: #f8fafc; color: #64748b;
      font-weight: 700; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-transform: uppercase;
    }
    .cms-table td { padding: 14px 12px; border-bottom: 1px solid #f1f5f9; }

    .order-badge { background: #f1f5f9; padding: 4px 8px; border-radius: 6px; font-weight: 700; font-size: 12px; color: #0f172a; }
    .mini-pill { font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; }
    .subitems-badge { background: #eff6ff; color: #0050e5; padding: 4px 8px; border-radius: 6px; font-weight: 700; font-size: 11px; }
    .status-pill { padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; }
    .status-pill.published { background: #dcfce7; color: #15803d; }
    .status-pill.draft { background: #f1f5f9; color: #64748b; }

    .action-buttons { display: flex; gap: 6px; align-items: center; }
    .btn-action {
      display: inline-flex; align-items: center; gap: 4px; padding: 6px 10px;
      border-radius: 6px; font-size: 12px; font-weight: 600; text-decoration: none; cursor: pointer; border: none;
    }
    .btn-details { background: #f1f5f9; color: #334155; }
    .btn-details:hover { background: #e2e8f0; color: #0f172a; }
    .btn-edit { background: #eff6ff; color: #0050e5; }
    .btn-edit:hover { background: #0050e5; color: #fff; }
    .btn-delete { background: #fee2e2; color: #dc2626; }
    .btn-delete:hover { background: #dc2626; color: #fff; }

    .overview-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; }
    .info-list { display: flex; flex-direction: column; gap: 12px; font-size: 13px; }
    .info-row { display: flex; justify-content: space-between; align-items: center; padding-bottom: 8px; border-bottom: 1px solid #f1f5f9; }
    .info-row span { color: #64748b; }

    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center; z-index: 2000;
    }
    .modal-card {
      background: #fff; border-radius: 16px; width: 100%; max-width: 580px;
      box-shadow: 0 25px 60px rgba(0,0,0,0.3); overflow: hidden;
    }
    .modal-lg { max-width: 640px; }
    .modal-header {
      padding: 18px 24px; display: flex; justify-content: space-between; align-items: center;
      border-bottom: 1px solid #e2e8f0;
    }
    .modal-title-group { display: flex; align-items: center; gap: 10px; }
    .modal-title-group h3 { margin: 0; font-size: 18px; font-weight: 800; }
    .btn-close { background: none; border: none; font-size: 20px; cursor: pointer; color: #64748b; }
    .modal-body { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
    .modal-footer { padding: 16px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 10px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group label { font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; }
    .form-control { padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; }
    .form-row { display: flex; gap: 12px; }
    .error-box { background: #fee2e2; color: #991b1b; padding: 10px; border-radius: 8px; font-size: 12px; font-weight: 600; }

    .loading-box { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px; color: #64748b; }
    .spin { animation: spin 1s linear infinite; font-size: 32px; color: #0050e5; margin-bottom: 12px; }
    @keyframes spin { 100% { transform: rotate(360deg); } }
  `]
})
export class WebPageDetailsComponent implements OnInit {
  pageId = '';
  page: any = null;
  loading = false;
  activeTab = 'sections';

  get displayDirectRoute(): string {
    if (!this.page?.directUrl) return '/';
    const val = this.page.directUrl.trim();
    if (val.startsWith('http://') || val.startsWith('https://')) return val;
    return '/' + val.replace(/^\/+/, '');
  }

  get headerSubtitle(): string {
    return this.page
      ? `Direct Route: ${this.displayDirectRoute} • ${this.page.pageSections?.length || 0} Layout Section Blocks`
      : 'Page layout sections, metadata, and routing configuration.';
  }

  get headerButtons(): PageHeaderButton[] {
    return [
      {
        text: 'Back to Pages',
        icon: 'arrow_back',
        routerLink: '/content/console/pages'
      },
      {
        text: 'Edit Page Settings',
        icon: 'edit',
        isPrimary: true,
        routerLink: `/content/console/pages/edit/${this.pageId}`
      }
    ];
  }

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.pageId = this.route.snapshot.paramMap.get('id') || '';
    if (this.pageId) {
      this.loadPage();
    }
  }

  loadPage(): void {
    this.loading = true;
    this.api.get<any>(`ContentApi/pages/${this.pageId}`).subscribe({
      next: (res) => {
        this.loading = false;
        this.page = res?.data;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  async deleteSection(sec: any): Promise<void> {
    const confirmed = await this.toast.confirm('Delete Section', `Are you sure you want to delete section "${sec.title}"?`, 'Delete', 'Cancel', 'danger');
    if (!confirmed) return;

    this.api.delete<any>(`ContentApi/sections/${sec.id}`).subscribe({
      next: () => {
        this.toast.success(`Section "${sec.title}" deleted.`);
        this.loadPage();
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'Failed to delete section.');
      }
    });
  }
}
