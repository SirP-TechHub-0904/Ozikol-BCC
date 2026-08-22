import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-faq-delete',
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
            <a routerLink="/content/console/faqs">FAQs & Knowledge</a>
            <span class="sep">/</span>
            <span class="current danger-text">Delete {{ isCategory ? 'Category' : 'FAQ' }}</span>
          </div>
          <h1 class="page-title danger-title">
            <span class="material-symbols-outlined danger-icon">warning</span>
            Confirm {{ isCategory ? 'FAQ Category' : 'FAQ Question' }} Deletion
          </h1>
          <p class="page-sub">Review public knowledge base consequences and verify identity before permanently destroying this record.</p>
        </div>

        <div class="header-actions">
          <a routerLink="/content/console/faqs" class="btn btn-secondary">
            <span class="material-symbols-outlined">arrow_back</span>
            <span>Cancel & Go Back</span>
          </a>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="state-card loading">
        <span class="material-symbols-outlined spin">progress_activity</span>
        <p>Loading {{ isCategory ? 'category' : 'FAQ' }} details...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="errorMsg && !loading" class="alert-banner error">
        <span class="material-symbols-outlined">error</span>
        <span>{{ errorMsg }}</span>
      </div>

      <!-- Main Deletion Danger Zone -->
      <div class="delete-layout" *ngIf="!loading && item">
        <!-- Target Record Summary Card -->
        <div class="record-summary-card">
          <div class="summary-head">
            <span class="material-symbols-outlined">{{ isCategory ? 'folder_open' : 'quiz' }}</span>
            <h3>{{ isCategory ? 'FAQ Category to be Deleted' : 'FAQ Question to be Deleted' }}</h3>
          </div>

          <div class="record-body">
            <div class="faq-icon-box">
              <span class="material-symbols-outlined">{{ isCategory ? 'category' : 'help' }}</span>
            </div>

            <div class="record-details">
              <h2 class="record-title">{{ item.title }}</h2>
              <p class="record-sub" *ngIf="!isCategory && item.description">{{ item.description }}</p>
              <p class="record-sub" *ngIf="isCategory && item.description">{{ item.description }}</p>

              <div class="meta-row">
                <span class="meta-pill" [ngClass]="item.publish ? 'published' : 'draft'">
                  {{ item.publish ? 'Published on Help Center' : 'Draft / Hidden' }}
                </span>
                <span class="meta-pill count-pill" *ngIf="isCategory">
                  {{ item.faqCount || 0 }} Questions in Category
                </span>
                <span class="meta-pill count-pill" *ngIf="!isCategory && item.faqCategory">
                  Category: {{ item.faqCategory.title }}
                </span>
                <span class="meta-date">Sort Order: {{ item.sortOrder || 0 }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Consequences Warning Box -->
        <div class="consequences-card">
          <div class="consequences-head">
            <span class="material-symbols-outlined">dangerous</span>
            <h3>Consequences of Deleting this {{ isCategory ? 'Category' : 'FAQ Question' }}</h3>
          </div>

          <ul class="consequences-list" *ngIf="!isCategory">
            <li>
              <strong>Help Center Removal:</strong> This frequently asked question and answer will immediately disappear from all public Help, FAQ, and Support accordions.
            </li>
            <li>
              <strong>Search Index Removal:</strong> Visitors searching the support knowledge base will no longer find answers linked to this question.
            </li>
            <li>
              <strong>Permanent Record Eradication:</strong> This FAQ question and response copy cannot be recovered after deletion.
            </li>
          </ul>

          <ul class="consequences-list" *ngIf="isCategory">
            <li>
              <strong>Question Detachment:</strong> All FAQ questions currently filed under this category will be unassigned to <em>Uncategorized</em>.
            </li>
            <li>
              <strong>Help Center Topic Filter:</strong> Public topic tabs and category filters referencing this category will no longer display it.
            </li>
            <li>
              <strong>Permanent Record Eradication:</strong> This FAQ category structure cannot be recovered after deletion.
            </li>
          </ul>
        </div>

        <!-- Exact Title Confirmation & Action -->
        <div class="confirmation-card">
          <div class="confirm-instruction">
            <p>
              To confirm that you understand these consequences and intend to permanently destroy this {{ isCategory ? 'category' : 'FAQ' }}, please type the exact {{ isCategory ? 'category name' : 'question title' }}:
            </p>
            <div class="target-title-pill" (click)="copyTitle()" title="Click to copy">
              <code>{{ item.title }}</code>
            </div>
          </div>

          <div class="confirm-input-group">
            <label>TYPE {{ isCategory ? 'CATEGORY NAME' : 'QUESTION TITLE' }} TO CONFIRM DELETION:</label>
            <input
              type="text"
              [(ngModel)]="confirmationInput"
              [placeholder]="'Type the exact ' + (isCategory ? 'category name' : 'question title') + ' here...'"
              class="confirm-input"
              [class.matched]="isTitleMatched()"
            />

            <div class="match-status" *ngIf="confirmationInput">
              <span *ngIf="isTitleMatched()" class="status-match">
                <span class="material-symbols-outlined">check_circle</span> Title matched. Deletion unlocked.
              </span>
              <span *ngIf="!isTitleMatched()" class="status-mismatch">
                <span class="material-symbols-outlined">cancel</span> Title does not match yet.
              </span>
            </div>
          </div>

          <div class="delete-action-row">
            <a routerLink="/content/console/faqs" class="btn btn-secondary">
              <span>Cancel</span>
            </a>
            <button
              type="button"
              class="btn btn-danger"
              (click)="executeDelete()"
              [disabled]="!isTitleMatched() || deleting"
            >
              <span class="material-symbols-outlined">{{ deleting ? 'hourglass_top' : 'delete_forever' }}</span>
              <span>{{ deleting ? 'Deleting...' : 'I understand the consequences, delete permanently' }}</span>
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
    .faq-icon-box {
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
    .faq-icon-box span { font-size: 32px; }

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
  `]
})
export class FaqDeleteComponent implements OnInit {
  itemId: string | null = null;
  isCategory = false;
  item: any = null;
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
    this.isCategory = this.router.url.includes('faq-categories');
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.itemId = id;
        this.loadDetails(id);
      }
    });
  }

  loadDetails(id: string): void {
    this.loading = true;
    const url = this.isCategory ? `ContentApi/faq-categories/${id}` : `ContentApi/faqs/${id}`;

    this.api.get<any>(url).subscribe({
      next: (res) => {
        this.loading = false;
        if (res?.data) {
          this.item = res.data;
        } else {
          this.errorMsg = `${this.isCategory ? 'Category' : 'FAQ'} record not found.`;
        }
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = err?.error?.message || `Failed to load ${this.isCategory ? 'category' : 'FAQ'}.`;
      }
    });
  }

  isTitleMatched(): boolean {
    if (!this.item?.title || !this.confirmationInput) return false;
    return this.confirmationInput.trim().toLowerCase() === this.item.title.trim().toLowerCase();
  }

  copyTitle(): void {
    if (this.item?.title) {
      navigator.clipboard?.writeText(this.item.title);
      this.confirmationInput = this.item.title;
    }
  }

  executeDelete(): void {
    if (!this.isTitleMatched() || !this.itemId) return;

    this.deleting = true;
    this.errorMsg = '';

    const url = this.isCategory ? `ContentApi/faq-categories/${this.itemId}` : `ContentApi/faqs/${this.itemId}`;

    this.api.delete<any>(url).subscribe({
      next: () => {
        this.deleting = false;
        this.toast.success(`${this.isCategory ? 'Category' : 'FAQ'} '${this.item.title}' deleted successfully.`);
        this.router.navigate(['/content/console/faqs']);
      },
      error: (err) => {
        this.deleting = false;
        this.errorMsg = err?.error?.message || `Failed to delete ${this.isCategory ? 'category' : 'FAQ'}.`;
      }
    });
  }
}
