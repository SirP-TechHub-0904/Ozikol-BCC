import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';

/**
 * Web Page Deletion Confirmation Component.
 * Enforces strict cascading protection: a page cannot be deleted while it contains attached layout sections.
 * Displays real-time attached section counts and individual section cleanup triggers.
 */
@Component({
  selector: 'app-web-page-delete',
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
            <a routerLink="/content/console/pages">Web Pages</a>
            <span class="sep">/</span>
            <span class="current danger-text">Delete Web Page</span>
          </div>
          <h1 class="page-title danger-title">
            <span class="material-symbols-outlined danger-icon">warning</span>
            Confirm Web Page Deletion
          </h1>
          <p class="page-sub">Review public routing and layout consequences before permanently destroying this page.</p>
        </div>

        <div class="header-actions">
          <a routerLink="/content/console/pages" class="btn btn-secondary">
            <span class="material-symbols-outlined">arrow_back</span>
            <span>Cancel & Go Back</span>
          </a>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="state-card loading">
        <span class="material-symbols-outlined spin">progress_activity</span>
        <p>Loading page record...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="errorMsg && !loading" class="alert-banner error">
        <span class="material-symbols-outlined">error</span>
        <span>{{ errorMsg }}</span>
      </div>

      <!-- Main Deletion Danger Zone -->
      <div class="delete-layout" *ngIf="!loading && page">
        <!-- Target Record Summary Card -->
        <div class="record-summary-card">
          <div class="summary-head">
            <span class="material-symbols-outlined">web</span>
            <h3>Web Page to be Deleted</h3>
          </div>

          <div class="record-body">
            <div class="page-icon-box">
              <span class="material-symbols-outlined">article</span>
            </div>

            <div class="record-details">
              <h2 class="record-title">{{ page.title }}</h2>
              <p class="record-sub">
                Route: <code>/{{ page.directUrl || page.slug || '' }}</code> &bull; {{ page.metaDescription || page.description || 'No description provided.' }}
              </p>

              <div class="meta-row">
                <span class="meta-pill" [ngClass]="page.publish ? 'published' : 'draft'">
                  {{ page.publish ? 'Published Live' : 'Draft / Offline' }}
                </span>
                <span class="meta-pill count-pill" [class.danger]="sectionsCount > 0" [class.success]="sectionsCount === 0">
                  {{ sectionsCount }} Section{{ sectionsCount === 1 ? '' : 's' }} Attached
                </span>
                <span class="meta-date" *ngIf="page.createdAtUtc || page.date">
                  Created: {{ (page.createdAtUtc || page.date) | date:'mediumDate' }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Attached Sections Blocking Alert -->
        <div class="sections-block-card" *ngIf="sectionsCount > 0">
          <div class="block-head">
            <span class="material-symbols-outlined">shield</span>
            <div>
              <h3>Deletion Blocked: {{ sectionsCount }} Attached Layout Section{{ sectionsCount === 1 ? '' : 's' }} Detected</h3>
              <p class="block-sub">To preserve layout integrity and prevent broken site structure, you must delete or unlink all sections before deleting this page.</p>
            </div>
          </div>

          <div class="sections-list-table">
            <div *ngFor="let sec of attachedSections" class="section-row">
              <div class="sec-meta">
                <span class="sec-order">#{{ sec.pageSortOrder || 1 }}</span>
                <strong class="sec-title">{{ sec.title || '(Untitled Section)' }}</strong>
                <span class="sec-badge">{{ sec.templateKey || 'Standard Block' }}</span>
                <span class="sec-subitems" *ngIf="sec.pageSectionLists?.length || sec.listCount">
                  {{ sec.pageSectionLists?.length || sec.listCount }} sub-item(s)
                </span>
              </div>
              <a
                [routerLink]="['/content/console/sections/delete', sec.id]"
                [queryParams]="{ returnUrl: '/content/console/pages/delete/' + pageId }"
                class="btn-delete-sec"
                title="Delete this section"
              >
                <span class="material-symbols-outlined">delete</span>
                <span>Delete Section</span>
              </a>
            </div>
          </div>

          <div class="block-action-bar">
            <a
              routerLink="/content/console/sections"
              [queryParams]="{ webPageId: pageId }"
              class="btn btn-warning-action"
            >
              <span class="material-symbols-outlined">layers</span>
              <span>Manage Sections for '{{ page.title }}'</span>
            </a>
          </div>
        </div>

        <!-- Consequences Warning Box -->
        <div class="consequences-card">
          <div class="consequences-head">
            <span class="material-symbols-outlined">dangerous</span>
            <h3>Consequences of Deleting this Web Page</h3>
          </div>

          <ul class="consequences-list">
            <li>
              <strong>Immediate 404 Route Failure:</strong> The public URL <code>/{{ page.directUrl || page.slug || '' }}</code> will immediately return a 404 Not Found response to all visitors and search engines.
            </li>
            <li *ngIf="sectionsCount > 0">
              <strong>Attached Sections Protection:</strong> This web page contains {{ sectionsCount }} layout section(s). Deletion is currently blocked until all attached sections are removed.
            </li>
            <li *ngIf="sectionsCount === 0">
              <strong>Section Independence:</strong> There are no attached sections blocking this deletion.
            </li>
            <li>
              <strong>Menu Navigation Unlinking:</strong> If this page is linked in the main header navbar or footer sitemap, it will become a broken link.
            </li>
            <li>
              <strong>Permanent Record Eradication:</strong> This web page and its configuration cannot be recovered after deletion.
            </li>
          </ul>
        </div>

        <!-- Exact Page Title Confirmation & Action -->
        <div class="confirmation-card">
          <div class="confirm-instruction">
            <p>
              To confirm that you understand these consequences and intend to permanently destroy this web page, please type the exact page title:
            </p>
            <div class="target-title-pill" (click)="copyTitle()" title="Click to copy">
              <code>{{ page.title }}</code>
            </div>
          </div>

          <div class="confirm-input-group">
            <label>TYPE PAGE TITLE TO CONFIRM DELETION:</label>
            <input
              type="text"
              [(ngModel)]="confirmationInput"
              placeholder="Type the exact page title here..."
              class="confirm-input"
              [class.matched]="isTitleMatched()"
            />

            <div class="match-status" *ngIf="confirmationInput">
              <span *ngIf="isTitleMatched() && sectionsCount === 0" class="status-match">
                <span class="material-symbols-outlined">check_circle</span> Page title matched. Deletion unlocked.
              </span>
              <span *ngIf="isTitleMatched() && sectionsCount > 0" class="status-warning">
                <span class="material-symbols-outlined">shield</span> Page title matched, but deletion is BLOCKED by {{ sectionsCount }} attached section(s).
              </span>
              <span *ngIf="!isTitleMatched()" class="status-mismatch">
                <span class="material-symbols-outlined">cancel</span> Page title does not match yet.
              </span>
            </div>
          </div>

          <div class="delete-action-row">
            <a routerLink="/content/console/pages" class="btn btn-secondary">
              <span>Cancel</span>
            </a>
            <button
              type="button"
              class="btn btn-danger"
              (click)="executeDelete()"
              [disabled]="!isTitleMatched() || deleting || sectionsCount > 0"
              [title]="sectionsCount > 0 ? 'Cannot delete page while attached sections exist.' : ''"
            >
              <span class="material-symbols-outlined">{{ deleting ? 'hourglass_top' : 'delete_forever' }}</span>
              <span>
                {{
                  deleting
                    ? 'Deleting Web Page...'
                    : sectionsCount > 0
                    ? 'Deletion Blocked (' + sectionsCount + ' Sections Attached)'
                    : 'I understand the consequences, delete this web page'
                }}
              </span>
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
    .page-icon-box {
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
    .page-icon-box span { font-size: 32px; }

    .record-details { display: flex; flex-direction: column; gap: 4px; flex: 1; }
    .record-title { font-size: 18px; font-weight: 800; color: #0f172a; margin: 0; }
    .record-sub { font-size: 13.5px; color: #64748b; margin: 0; }
    .record-sub code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; color: #0050e5; }

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
    .meta-pill.count-pill.danger { background: rgba(239, 68, 68, 0.12); color: #dc2626; font-weight: 800; }
    .meta-pill.count-pill.success { background: rgba(34, 197, 94, 0.12); color: #16a34a; }
    .meta-date { font-size: 12px; color: #94a3b8; }

    /* Sections Blocking Card */
    .sections-block-card {
      background: #fffbeb;
      border: 1.5px solid #fde68a;
      border-radius: 16px;
      padding: 22px 26px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .block-head {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }
    .block-head span { font-size: 26px; color: #d97706; }
    .block-head h3 { font-size: 15px; font-weight: 800; color: #92400e; margin: 0 0 4px; }
    .block-sub { font-size: 13px; color: #b45309; margin: 0; }

    .sections-list-table {
      display: flex;
      flex-direction: column;
      gap: 8px;
      background: #ffffff;
      border: 1px solid #fef3c7;
      border-radius: 10px;
      padding: 10px 14px;
    }
    .section-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding: 8px 10px;
      border-bottom: 1px solid #fef3c7;
    }
    .section-row:last-child { border-bottom: none; }
    .sec-meta {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13px;
      flex-wrap: wrap;
    }
    .sec-order {
      background: #f1f5f9;
      color: #475569;
      font-size: 11px;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .sec-title { color: #0f172a; }
    .sec-badge {
      background: #e0f2fe;
      color: #0284c7;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .sec-subitems {
      background: #ede9fe;
      color: #7c3aed;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .btn-delete-sec {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: #dc2626;
      font-size: 12px;
      font-weight: 700;
      text-decoration: none;
      padding: 4px 10px;
      border: 1px solid #fecaca;
      border-radius: 6px;
      background: #fff;
      transition: all 0.2s;
    }
    .btn-delete-sec:hover { background: #fee2e2; }
    .btn-delete-sec span { font-size: 15px; }

    .block-action-bar { display: flex; justify-content: flex-end; }
    .btn-warning-action {
      background: #fef3c7;
      color: #92400e;
      border: 1px solid #fde68a;
    }
    .btn-warning-action:hover { background: #fde68a; }

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
    .status-warning { color: #d97706; display: flex; align-items: center; gap: 4px; }
    .status-mismatch { color: #dc2626; display: flex; align-items: center; gap: 4px; }
    .status-match span, .status-warning span, .status-mismatch span { font-size: 16px; }

    .delete-action-row {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 12px;
      border-top: 1px solid #f1f5f9;
      padding-top: 16px;
      margin-top: 4px;
    }
  `]
})
export class WebPageDeleteComponent implements OnInit {
  pageId: string | null = null;
  page: any = null;
  attachedSections: any[] = [];
  sectionsCount: number = 0;
  loading = false;
  deleting = false;
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
        this.pageId = id;
        this.loadPage(id);
      }
    });
  }

  loadPage(id: string): void {
    this.loading = true;
    this.api.get<any>(`ContentApi/pages/${id}`).subscribe({
      next: (res) => {
        this.loading = false;
        if (res?.data) {
          this.page = res.data;
          this.sectionsCount = this.page.sectionCount ?? (this.page.pageSections?.length ?? 0);
          this.loadAttachedSections(id);
        } else {
          this.errorMsg = 'Web page record not found.';
        }
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = err?.error?.message || 'Failed to load web page.';
      }
    });
  }

  loadAttachedSections(id: string): void {
    this.api.get<any>('ContentApi/sections', { webPageId: id }).subscribe({
      next: (res) => {
        if (Array.isArray(res?.data)) {
          this.attachedSections = res.data;
          this.sectionsCount = this.attachedSections.length;
        }
      },
      error: () => {}
    });
  }

  isTitleMatched(): boolean {
    if (!this.page?.title || !this.confirmationInput) return false;
    return this.confirmationInput.trim().toLowerCase() === this.page.title.trim().toLowerCase();
  }

  copyTitle(): void {
    if (this.page?.title) {
      navigator.clipboard?.writeText(this.page.title);
      this.confirmationInput = this.page.title;
    }
  }

  executeDelete(): void {
    if (!this.isTitleMatched() || !this.pageId || this.sectionsCount > 0) return;

    this.deleting = true;
    this.errorMsg = '';

    this.api.delete<any>(`ContentApi/pages/${this.pageId}`).subscribe({
      next: () => {
        this.deleting = false;
        this.toast.success(`Web page '${this.page.title}' deleted successfully.`);
        this.router.navigate(['/content/console/pages']);
      },
      error: (err) => {
        this.deleting = false;
        this.errorMsg = err?.error?.message || 'Failed to delete web page.';
      }
    });
  }
}
