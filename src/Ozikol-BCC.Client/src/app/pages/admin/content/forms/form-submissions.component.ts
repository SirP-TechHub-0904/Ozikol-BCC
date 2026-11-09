import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PageFormsService, PageFormItem, PageFormSubmissionItem } from '../../../../core/services/page-forms.service';
import { ToastService } from '../../../../core/services/toast.service';
import { PageHeaderComponent, PageHeaderButton } from '../../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-form-submissions',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, PageHeaderComponent],
  template: `
    <div class="cms-page-container">
      <!-- Standardized Reusable Page Header -->
      <app-page-header
        eyebrow="CMS Studio / Manage Forms"
        icon="mark_email_read"
        [title]="form?.title || 'Form Submissions & Inquiries'"
        subtitle="Manage incoming leads, customer inquiries, and questionnaire submissions submitted through this form."
        [buttons]="headerButtons"
        [loading]="loading"
      ></app-page-header>

      <!-- Quick Metrics Summary Bar -->
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-icon-wrap icon-blue">
            <span class="material-symbols-outlined">inbox</span>
          </div>
          <div class="metric-info">
            <span class="metric-val">{{ totalCount }}</span>
            <span class="metric-lbl">Total Received</span>
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-icon-wrap icon-green">
            <span class="material-symbols-outlined">mark_email_unread</span>
          </div>
          <div class="metric-info">
            <span class="metric-val">{{ newCount }}</span>
            <span class="metric-lbl">New Unread Leads</span>
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-icon-wrap icon-amber">
            <span class="material-symbols-outlined">support_agent</span>
          </div>
          <div class="metric-info">
            <span class="metric-val">{{ contactedCount }}</span>
            <span class="metric-lbl">In Progress / Contacted</span>
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-icon-wrap icon-purple">
            <span class="material-symbols-outlined">task_alt</span>
          </div>
          <div class="metric-info">
            <span class="metric-val">{{ closedCount }}</span>
            <span class="metric-lbl">Resolved / Closed</span>
          </div>
        </div>
      </div>

      <!-- Filter Controls Bar -->
      <div class="filter-bar">
        <div class="filter-group">
          <button type="button" class="filter-btn" [class.active]="selectedStatus === 'all'" (click)="filterByStatus('all')">
            All ({{ totalCount }})
          </button>
          <button type="button" class="filter-btn" [class.active]="selectedStatus === 'New'" (click)="filterByStatus('New')">
            New Leads ({{ newCount }})
          </button>
          <button type="button" class="filter-btn" [class.active]="selectedStatus === 'Contacted'" (click)="filterByStatus('Contacted')">
            Contacted ({{ contactedCount }})
          </button>
          <button type="button" class="filter-btn" [class.active]="selectedStatus === 'Closed'" (click)="filterByStatus('Closed')">
            Closed ({{ closedCount }})
          </button>
        </div>
        <div class="search-box">
          <span class="material-symbols-outlined">search</span>
          <input
            type="text"
            [(ngModel)]="searchTerm"
            (keyup.enter)="loadSubmissions()"
            placeholder="Search inquiries, names, notes...">
        </div>
      </div>

      <!-- Submissions Table Card -->
      <div class="cms-card">
        <div *ngIf="loading" class="loading-state">
          <span class="material-symbols-outlined spin">progress_activity</span>
          <p>Loading inquiries...</p>
        </div>

        <div *ngIf="!loading && submissions.length === 0" class="empty-state">
          <div class="empty-icon-wrap">
            <span class="material-symbols-outlined">inbox</span>
          </div>
          <h3>No submissions yet</h3>
          <p>When visitors fill out this form on your website, their submissions will appear here in real-time.</p>
        </div>

        <div *ngIf="!loading && submissions.length > 0" class="table-responsive">
          <table class="cms-table">
            <thead>
              <tr>
                <th>Submitted On</th>
                <th>Visitor Data Summary</th>
                <th>Source Page</th>
                <th style="text-align: center;">Status</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of submissions" class="table-row-hover">
                <td>
                  <div class="date-cell">
                    <span class="date-main">{{ item.submittedAtUtc | date:'mediumDate' }}</span>
                    <span class="date-time">{{ item.submittedAtUtc | date:'shortTime' }}</span>
                  </div>
                </td>
                <td>
                  <div class="data-summary-cell" (click)="openDetailModal(item)">
                    <div class="summary-chips">
                      <div
                        *ngFor="let entry of getTopDataEntries(item.dataJson)"
                        class="summary-entry">
                        <strong class="entry-key">{{ formatFieldLabel(entry.key) }}:</strong>
                        <span class="entry-val">{{ entry.value }}</span>
                      </div>
                    </div>
                    <div *ngIf="item.adminNotes" class="admin-note-indicator">
                      <span class="material-symbols-outlined">sticky_note_2</span>
                      <span>{{ item.adminNotes }}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <span class="source-url" *ngIf="item.sourcePageUrl" [title]="item.sourcePageUrl">
                    {{ item.sourcePageUrl }}
                  </span>
                  <span *ngIf="!item.sourcePageUrl" class="text-muted">Direct / Website</span>
                </td>
                <td style="text-align: center;">
                  <span class="status-badge" [ngClass]="getStatusClass(item.status)">
                    {{ item.status || 'New' }}
                  </span>
                </td>
                <td style="text-align: right;">
                  <div class="actions-cell">
                    <button
                      type="button"
                      class="btn-action btn-view"
                      (click)="openDetailModal(item)"
                      title="View Details">
                      <span class="material-symbols-outlined">open_in_new</span>
                      <span>Details</span>
                    </button>
                    <button
                      type="button"
                      class="btn-action btn-del"
                      (click)="confirmDelete(item)"
                      title="Delete Submission">
                      <span class="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Submission Detail Modal -->
      <div *ngIf="activeSubmission" class="modal-overlay" (click)="closeDetailModal()">
        <div class="modal-card detail-modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div class="modal-header-left">
              <div class="modal-icon-wrap icon-blue">
                <span class="material-symbols-outlined">assignment</span>
              </div>
              <div>
                <h3>Submission Details</h3>
                <span class="submission-sub-time">
                  Submitted {{ activeSubmission.submittedAtUtc | date:'fullDate' }} at {{ activeSubmission.submittedAtUtc | date:'mediumTime' }}
                </span>
              </div>
            </div>
            <button type="button" class="btn-close" (click)="closeDetailModal()">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <div class="modal-body">
            <!-- Status and Admin Notes Panel -->
            <div class="admin-panel">
              <div class="admin-panel-row">
                <div class="form-group status-select-group">
                  <label>Update Lead Status:</label>
                  <select [(ngModel)]="modalStatus" class="form-control">
                    <option value="New">New Lead</option>
                    <option value="Contacted">Contacted / In Progress</option>
                    <option value="Closed">Closed / Resolved</option>
                  </select>
                </div>
                <button type="button" class="btn btn-sm btn-primary" (click)="updateStatus()" [disabled]="updatingStatus">
                  <span>{{ updatingStatus ? 'Updating...' : 'Update Status' }}</span>
                </button>
              </div>

              <div class="form-group notes-group">
                <label>Internal Follow-up Notes:</label>
                <textarea
                  [(ngModel)]="modalAdminNotes"
                  rows="2"
                  placeholder="Record internal team notes, calls, follow-ups..."
                  class="form-control"></textarea>
                <div class="notes-actions">
                  <button type="button" class="btn btn-sm btn-secondary" (click)="saveNotes()" [disabled]="savingNotes">
                    <span>{{ savingNotes ? 'Saving...' : 'Save Notes' }}</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Submitted Answers Breakdown -->
            <div class="answers-section">
              <h4>Visitor Submitted Answers</h4>
              <div class="answers-grid">
                <div
                  *ngFor="let field of parseSubmissionData(activeSubmission.dataJson)"
                  class="answer-card">
                  <span class="answer-key">{{ formatFieldLabel(field.key) }}</span>
                  <div class="answer-value">
                    <span *ngIf="isArray(field.value)" class="pills-value-list">
                      <span *ngFor="let pill of field.value" class="data-pill">{{ pill }}</span>
                    </span>
                    <span *ngIf="!isArray(field.value)" class="answer-text">{{ field.value }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Visitor Technical Telemetry -->
            <div class="telemetry-bar" *ngIf="activeSubmission.ipAddress || activeSubmission.userAgent">
              <small>
                <strong>IP:</strong> {{ activeSubmission.ipAddress || 'Unknown' }} &bull;
                <strong>User Agent:</strong> {{ activeSubmission.userAgent || 'Unknown' }}
              </small>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-outline" (click)="closeDetailModal()">
              Close
            </button>
          </div>
        </div>
      </div>

      <!-- Delete Confirmation Modal -->
      <div *ngIf="submissionToDelete" class="modal-overlay">
        <div class="modal-card">
          <div class="modal-header">
            <div class="modal-icon-wrap delete-icon">
              <span class="material-symbols-outlined">warning</span>
            </div>
            <h3>Delete Submission</h3>
          </div>
          <div class="modal-body">
            <p>Are you sure you want to permanently delete this submission record?</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" (click)="submissionToDelete = null" [disabled]="deleting">
              Cancel
            </button>
            <button type="button" class="btn btn-danger" (click)="executeDelete()" [disabled]="deleting">
              <span *ngIf="!deleting">Delete</span>
              <span *ngIf="deleting">Deleting...</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .cms-page-container { display: flex; flex-direction: column; gap: 24px; }
    
    .page-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      background: #fff; padding: 24px 28px; border-radius: 16px; border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }
    .breadcrumb { font-size: 13px; color: #64748b; margin-bottom: 6px; }
    .breadcrumb a { color: #0050e5; text-decoration: none; font-weight: 600; }
    .breadcrumb .sep { margin: 0 6px; }
    .title-with-badge { display: flex; align-items: center; gap: 12px; }
    .page-header h1 { font-size: 24px; font-weight: 800; color: #0f172a; margin: 0 0 4px; }
    .subtitle { color: #64748b; font-size: 14px; margin: 0; }
    .header-actions { display: flex; gap: 12px; }

    .badge-pill {
      display: inline-flex; align-items: center; padding: 3px 10px;
      border-radius: 20px; font-size: 11px; font-weight: 700;
    }
    .badge-key { background: #eff6ff; color: #0050e5; font-family: monospace; }

    .btn {
      display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px;
      border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; text-decoration: none;
      transition: all 0.2s ease;
    }
    .btn-primary { background: #0050e5; color: #fff; border: none; }
    .btn-primary:hover { background: #003ebd; }
    .btn-secondary { background: #eff6ff; color: #0050e5; border: 1px solid #bfdbfe; }
    .btn-secondary:hover { background: #dbeafe; }
    .btn-outline { background: transparent; border: 1px solid #cbd5e1; color: #334155; }
    .btn-outline:hover { background: #f8fafc; }
    .btn-danger { background: #ef4444; color: #fff; border: none; }
    .btn-sm { padding: 6px 14px; font-size: 12px; }

    .metrics-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;
    }
    .metric-card {
      background: #fff; border: 1px solid #e2e8f0; border-radius: 14px;
      padding: 16px 18px; display: flex; align-items: center; gap: 14px;
    }
    .metric-icon-wrap {
      width: 44px; height: 44px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
    }
    .icon-blue { background: #eff6ff; color: #0050e5; }
    .icon-green { background: #f0fdf4; color: #16a34a; }
    .icon-amber { background: #fffbeb; color: #d97706; }
    .icon-purple { background: #faf5ff; color: #9333ea; }
    .metric-info { display: flex; flex-direction: column; }
    .metric-val { font-size: 22px; font-weight: 800; color: #0f172a; line-height: 1.1; }
    .metric-lbl { font-size: 12px; color: #64748b; font-weight: 500; margin-top: 3px; }

    .filter-bar {
      display: flex; justify-content: space-between; align-items: center; gap: 16px;
      background: #fff; padding: 12px 18px; border-radius: 12px; border: 1px solid #e2e8f0;
    }
    .filter-group { display: flex; gap: 8px; }
    .filter-btn {
      border: none; background: transparent; padding: 6px 14px; border-radius: 8px;
      font-size: 13px; font-weight: 600; color: #64748b; cursor: pointer;
    }
    .filter-btn.active { background: #eff6ff; color: #0050e5; }
    .search-box {
      display: flex; align-items: center; gap: 8px; background: #f8fafc;
      padding: 6px 14px; border-radius: 8px; border: 1px solid #e2e8f0; width: 300px;
    }
    .search-box input { border: none; background: transparent; font-size: 13px; outline: none; width: 100%; }

    .cms-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; }
    .cms-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .cms-table th {
      padding: 12px 16px; background: #f8fafc; color: #475569;
      font-weight: 700; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;
      border-bottom: 1px solid #e2e8f0;
    }
    .cms-table td { padding: 16px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
    .table-row-hover:hover { background: #fcfdfe; }

    .date-cell { display: flex; flex-direction: column; gap: 2px; }
    .date-main { font-weight: 700; color: #0f172a; }
    .date-time { font-size: 11px; color: #64748b; }

    .data-summary-cell { cursor: pointer; display: flex; flex-direction: column; gap: 6px; }
    .summary-chips { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .summary-entry {
      background: #f8fafc; border: 1px solid #e2e8f0; padding: 3px 8px;
      border-radius: 6px; font-size: 12px; display: inline-flex; gap: 4px;
    }
    .entry-key { color: #475569; }
    .entry-val { color: #0f172a; font-weight: 600; }
    .admin-note-indicator {
      display: inline-flex; align-items: center; gap: 4px; font-size: 11px;
      color: #92400e; background: #fef3c7; padding: 2px 8px; border-radius: 4px; max-width: 380px;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .admin-note-indicator span.material-symbols-outlined { font-size: 14px; }

    .source-url {
      display: inline-block; max-width: 200px; overflow: hidden;
      text-overflow: ellipsis; white-space: nowrap; font-size: 12px; color: #64748b;
    }

    .status-badge {
      display: inline-block; padding: 3px 10px; border-radius: 12px;
      font-size: 11px; font-weight: 700;
    }
    .badge-status-new { background: #eff6ff; color: #0050e5; }
    .badge-status-contacted { background: #fef3c7; color: #b45309; }
    .badge-status-closed { background: #f1f5f9; color: #64748b; }

    .actions-cell { display: flex; align-items: center; justify-content: flex-end; gap: 8px; }
    .btn-action {
      display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px;
      border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer;
      border: 1px solid #e2e8f0; background: #fff; color: #334155; transition: all 0.15s;
    }
    .btn-view:hover { background: #eff6ff; border-color: #bfdbfe; color: #0050e5; }
    .btn-del:hover { background: #fee2e2; border-color: #fecaca; color: #dc2626; }
    .btn-action span.material-symbols-outlined { font-size: 16px; }

    .empty-state {
      padding: 48px 24px; text-align: center; display: flex; flex-direction: column;
      align-items: center; justify-content: center;
    }
    .empty-icon-wrap {
      width: 64px; height: 64px; border-radius: 50%; background: #eff6ff;
      color: #0050e5; display: flex; align-items: center; justify-content: center; margin-bottom: 16px;
    }
    .empty-icon-wrap span { font-size: 32px; }
    .empty-state h3 { font-size: 18px; font-weight: 700; color: #0f172a; margin: 0 0 6px; }
    .empty-state p { color: #64748b; font-size: 13px; max-width: 380px; margin: 0; }

    /* Modal */
    .modal-overlay {
      position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center;
      z-index: 9999; padding: 16px;
    }
    .modal-card {
      background: #fff; width: 100%; max-width: 600px; border-radius: 16px;
      box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1);
      overflow: hidden; max-height: 90vh; display: flex; flex-direction: column;
    }
    .modal-header {
      padding: 20px 24px; border-bottom: 1px solid #f1f5f9; display: flex;
      justify-content: space-between; align-items: center;
    }
    .modal-header-left { display: flex; align-items: center; gap: 12px; }
    .modal-header h3 { font-size: 18px; font-weight: 700; color: #0f172a; margin: 0; }
    .submission-sub-time { font-size: 12px; color: #64748b; }
    .btn-close {
      border: none; background: transparent; cursor: pointer; color: #64748b;
      padding: 4px; border-radius: 6px;
    }
    .btn-close:hover { background: #f1f5f9; color: #0f172a; }

    .modal-body { padding: 24px; overflow-y: auto; display: flex; flex-direction: column; gap: 20px; }

    .admin-panel {
      background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;
      padding: 16px; display: flex; flex-direction: column; gap: 14px;
    }
    .admin-panel-row { display: flex; align-items: flex-end; gap: 12px; }
    .status-select-group { flex: 1; }
    .notes-group { display: flex; flex-direction: column; gap: 6px; }
    .notes-actions { display: flex; justify-content: flex-end; margin-top: 6px; }

    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group label { font-size: 12px; font-weight: 600; color: #334155; }
    .form-control {
      width: 100%; padding: 8px 12px; border-radius: 8px; border: 1px solid #cbd5e1;
      font-size: 13px; color: #0f172a; outline: none; box-sizing: border-box;
    }

    .answers-section h4 { font-size: 14px; font-weight: 700; color: #0f172a; margin: 0 0 12px; }
    .answers-grid { display: flex; flex-direction: column; gap: 10px; }
    .answer-card {
      background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px;
      padding: 12px 16px; display: flex; flex-direction: column; gap: 4px;
    }
    .answer-key { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; }
    .answer-text { font-size: 14px; color: #0f172a; font-weight: 500; white-space: pre-wrap; }
    .pills-value-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 2px; }
    .data-pill {
      background: #eff6ff; color: #0050e5; border: 1px solid #bfdbfe;
      padding: 3px 10px; border-radius: 16px; font-size: 12px; font-weight: 600;
    }

    .telemetry-bar {
      padding: 10px 14px; background: #f8fafc; border-radius: 8px;
      font-size: 11px; color: #64748b; word-break: break-all;
    }

    .modal-footer {
      padding: 16px 24px; background: #f8fafc; border-top: 1px solid #f1f5f9;
      display: flex; justify-content: flex-end;
    }

    .delete-icon {
      width: 40px; height: 40px; border-radius: 10px; background: #fee2e2;
      color: #dc2626; display: flex; align-items: center; justify-content: center;
    }

    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { 100% { transform: rotate(360deg); } }
  `]
})
export class FormSubmissionsComponent implements OnInit {
  formKey: string | null = null;
  form: PageFormItem | null = null;
  submissions: PageFormSubmissionItem[] = [];
  loading = false;
  selectedStatus = 'all';
  searchTerm = '';
  totalCount = 0;
  newCount = 0;
  contactedCount = 0;
  closedCount = 0;

  get headerButtons(): PageHeaderButton[] {
    const btns: PageHeaderButton[] = [];
    if (this.form?.id) {
      btns.push({
        text: 'Edit Form',
        icon: 'edit',
        routerLink: `/content/console/forms/edit/${this.form.id}`
      });
    }
    btns.push({
      text: 'Refresh',
      icon: 'refresh',
      disabled: this.loading,
      loading: this.loading,
      action: () => this.loadSubmissions()
    });
    return btns;
  }

  activeSubmission: PageFormSubmissionItem | null = null;
  modalStatus = 'New';
  modalAdminNotes = '';
  updatingStatus = false;
  savingNotes = false;

  submissionToDelete: PageFormSubmissionItem | null = null;
  deleting = false;

  constructor(
    private formsService: PageFormsService,
    private route: ActivatedRoute,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.formKey = params.get('formKey');
      if (this.formKey) {
        this.loadFormByKey(this.formKey);
      }
    });
  }

  loadFormByKey(key: string): void {
    this.loading = true;
    this.formsService.getFormByKey(key).subscribe({
      next: (res: any) => {
        if (res && res.isSuccess && res.data) {
          this.form = res.data;
          this.loadSubmissions();
        } else {
          this.loading = false;
          this.toast.error(res?.message || 'Form not found.');
        }
      },
      error: () => {
        this.loading = false;
        this.toast.error('Network error loading form details.');
      }
    });
  }

  loadSubmissions(): void {
    if (!this.form?.id) return;
    this.loading = true;

    const params: any = {
      status: this.selectedStatus === 'all' ? undefined : this.selectedStatus,
      search: this.searchTerm.trim() || undefined,
      page: 1,
      pageSize: 50
    };

    this.formsService.getFormSubmissions(this.form.id, params).subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res && res.isSuccess && res.data) {
          this.submissions = res.data.items || [];
          this.totalCount = res.data.totalCount || 0;
          this.computeStatusCounts();
        } else {
          this.toast.error(res?.message || 'Failed to load submissions.');
        }
      },
      error: () => {
        this.loading = false;
        this.toast.error('Network error loading submissions.');
      }
    });
  }

  computeStatusCounts(): void {
    this.newCount = this.submissions.filter(s => s.status === 'New').length;
    this.contactedCount = this.submissions.filter(s => s.status === 'Contacted').length;
    this.closedCount = this.submissions.filter(s => s.status === 'Closed').length;
  }

  filterByStatus(status: string): void {
    this.selectedStatus = status;
    this.loadSubmissions();
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'New': return 'badge-status-new';
      case 'Contacted': return 'badge-status-contacted';
      case 'Closed': return 'badge-status-closed';
      default: return 'badge-status-new';
    }
  }

  getTopDataEntries(dataJson: string): { key: string; value: string }[] {
    try {
      const obj = JSON.parse(dataJson || '{}');
      return Object.entries(obj).slice(0, 3).map(([k, v]) => ({
        key: k,
        value: Array.isArray(v) ? v.join(', ') : String(v)
      }));
    } catch {
      return [];
    }
  }

  formatFieldLabel(key: string): string {
    return key
      .replace(/_/g, ' ')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  parseSubmissionData(dataJson: string): { key: string; value: any }[] {
    try {
      const obj = JSON.parse(dataJson || '{}');
      return Object.entries(obj).map(([k, v]) => ({ key: k, value: v }));
    } catch {
      return [];
    }
  }

  isArray(val: any): boolean {
    return Array.isArray(val);
  }

  openDetailModal(item: PageFormSubmissionItem): void {
    this.activeSubmission = item;
    this.modalStatus = item.status || 'New';
    this.modalAdminNotes = item.adminNotes || '';
  }

  closeDetailModal(): void {
    this.activeSubmission = null;
  }

  updateStatus(): void {
    if (!this.activeSubmission) return;
    this.updatingStatus = true;
    this.formsService.updateSubmissionStatus(this.activeSubmission.id, this.modalStatus, undefined).subscribe({
      next: (res: any) => {
        this.updatingStatus = false;
        if (res && res.isSuccess) {
          this.activeSubmission!.status = this.modalStatus;
          this.toast.success('Submission status updated.');
          this.computeStatusCounts();
        } else {
          this.toast.error(res?.message || 'Failed to update status.');
        }
      },
      error: () => {
        this.updatingStatus = false;
        this.toast.error('Network error updating status.');
      }
    });
  }

  saveNotes(): void {
    if (!this.activeSubmission) return;
    this.savingNotes = true;
    this.formsService.updateSubmissionStatus(this.activeSubmission.id, undefined, this.modalAdminNotes).subscribe({
      next: (res: any) => {
        this.savingNotes = false;
        if (res && res.isSuccess) {
          this.activeSubmission!.adminNotes = this.modalAdminNotes;
          this.toast.success('Admin follow-up notes saved.');
        } else {
          this.toast.error(res?.message || 'Failed to save notes.');
        }
      },
      error: () => {
        this.savingNotes = false;
        this.toast.error('Network error saving notes.');
      }
    });
  }

  confirmDelete(item: PageFormSubmissionItem): void {
    this.submissionToDelete = item;
  }

  executeDelete(): void {
    if (!this.submissionToDelete) return;
    this.deleting = true;
    this.formsService.deleteSubmission(this.submissionToDelete.id).subscribe({
      next: (res: any) => {
        this.deleting = false;
        if (res && res.isSuccess) {
          const deletedId = this.submissionToDelete!.id;
          this.toast.success('Submission deleted.');
          this.submissions = this.submissions.filter(s => s.id !== deletedId);
          if (this.activeSubmission?.id === deletedId) {
            this.activeSubmission = null;
          }
          this.submissionToDelete = null;
          this.totalCount--;
          this.computeStatusCounts();
        } else {
          this.toast.error(res?.message || 'Failed to delete submission.');
        }
      },
      error: () => {
        this.deleting = false;
        this.toast.error('Network error deleting submission.');
      }
    });
  }
}
