import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PageFormsService, PageFormItem } from '../../../../core/services/page-forms.service';
import { ToastService } from '../../../../core/services/toast.service';
import { PageHeaderComponent, PageHeaderButton } from '../../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-forms-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, PageHeaderComponent],
  template: `
    <div class="cms-page-container">
      <!-- Standardized Reusable Page Header -->
      <app-page-header
        eyebrow="CMS Studio"
        icon="dynamic_form"
        title="Dynamic Page Forms & Lead Intake"
        subtitle="Configure dynamic contact forms, subscription boxes, and intake questionnaires embedded across your website sections."
        [buttons]="headerButtons"
        [loading]="loading"
      ></app-page-header>

      <!-- Quick Metrics Summary Cards -->
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-icon-wrap icon-blue">
            <span class="material-symbols-outlined">dynamic_form</span>
          </div>
          <div class="metric-info">
            <span class="metric-val">{{ forms.length }}</span>
            <span class="metric-lbl">Total Configured Forms</span>
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-icon-wrap icon-green">
            <span class="material-symbols-outlined">mark_email_unread</span>
          </div>
          <div class="metric-info">
            <span class="metric-val">{{ totalNewSubmissions }}</span>
            <span class="metric-lbl">Unread Leads / Inquiries</span>
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-icon-wrap icon-purple">
            <span class="material-symbols-outlined">inbox</span>
          </div>
          <div class="metric-info">
            <span class="metric-val">{{ totalSubmissionsCount }}</span>
            <span class="metric-lbl">Lifetime Submissions</span>
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-icon-wrap icon-amber">
            <span class="material-symbols-outlined">toggle_on</span>
          </div>
          <div class="metric-info">
            <span class="metric-val">{{ activeFormsCount }}</span>
            <span class="metric-lbl">Active on Public Site</span>
          </div>
        </div>
      </div>

      <!-- Search & Filter Bar -->
      <div class="filter-bar">
        <div class="filter-group">
          <button type="button" class="filter-btn" [class.active]="statusFilter === 'all'" (click)="statusFilter = 'all'">
            All Forms ({{ forms.length }})
          </button>
          <button type="button" class="filter-btn" [class.active]="statusFilter === 'active'" (click)="statusFilter = 'active'">
            Active ({{ activeFormsCount }})
          </button>
          <button type="button" class="filter-btn" [class.active]="statusFilter === 'inactive'" (click)="statusFilter = 'inactive'">
            Draft / Disabled ({{ forms.length - activeFormsCount }})
          </button>
        </div>
        <div class="search-box">
          <span class="material-symbols-outlined">search</span>
          <input type="text" [(ngModel)]="searchTerm" placeholder="Search forms by title or key...">
        </div>
      </div>

      <!-- Forms Table Card -->
      <div class="cms-card">
        <div class="card-table-header">
          <div class="table-title">Configured Website Forms</div>
          <div class="table-subtitle">Click any form to view questions/fields or monitor incoming submissions</div>
        </div>

        <div *ngIf="loading" class="loading-state">
          <span class="material-symbols-outlined spin">progress_activity</span>
          <p>Loading forms...</p>
        </div>

        <div *ngIf="!loading && filteredForms.length === 0" class="empty-state">
          <div class="empty-icon-wrap">
            <span class="material-symbols-outlined">format_list_bulleted_add</span>
          </div>
          <h3>No forms found</h3>
          <p>Create your first dynamic form to start capturing visitor requests and leads.</p>
          <button type="button" class="btn btn-primary" routerLink="/content/console/forms/create">
            <span class="material-symbols-outlined">add</span>
            <span>Create Form Now</span>
          </button>
        </div>

        <div *ngIf="!loading && filteredForms.length > 0" class="table-responsive">
          <table class="cms-table">
            <thead>
              <tr>
                <th>Form Title & Key</th>
                <th>Notification Target</th>
                <th style="text-align: center;">Questions / Fields</th>
                <th style="text-align: center;">Submissions</th>
                <th style="text-align: center;">Status</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let form of filteredForms" class="table-row-hover">
                <td>
                  <div class="form-title-cell">
                    <span class="form-name">{{ form.title }}</span>
                    <div class="form-tags">
                      <span class="code-badge" title="Form programmatic key">key: {{ form.formKey }}</span>
                    </div>
                    <p class="form-desc" *ngIf="form.description">{{ form.description }}</p>
                  </div>
                </td>
                <td>
                  <div class="notification-cell">
                    <span *ngIf="form.notificationEmail" class="email-badge">
                      <span class="material-symbols-outlined">mail</span>
                      {{ form.notificationEmail }}
                    </span>
                    <span *ngIf="!form.notificationEmail" class="text-muted">In-app leads only</span>
                  </div>
                </td>
                <td style="text-align: center;">
                  <span class="field-pill">
                    <span class="material-symbols-outlined">tune</span>
                    {{ form.fieldCount || 0 }} fields
                  </span>
                </td>
                <td style="text-align: center;">
                  <div class="submission-metrics">
                    <span class="sub-count" [class.has-new]="(form.newSubmissions || 0) > 0">
                      {{ form.totalSubmissions || 0 }}
                    </span>
                    <span *ngIf="(form.newSubmissions || 0) > 0" class="badge-new-leads" title="New unread inquiries">
                      +{{ form.newSubmissions }} new
                    </span>
                  </div>
                </td>
                <td style="text-align: center;">
                  <span class="status-pill" [class.active]="form.isActive" [class.inactive]="!form.isActive">
                    {{ form.isActive ? 'Active' : 'Disabled' }}
                  </span>
                </td>
                <td style="text-align: right;">
                  <div class="actions-cell">
                    <button
                      type="button"
                      class="btn-icon btn-leads"
                      [routerLink]="['/content/console/forms', form.formKey, 'submissions']"
                      title="View Inquiries & Submissions">
                      <span class="material-symbols-outlined">inbox</span>
                      <span class="btn-text">Leads</span>
                    </button>
                    <button
                      type="button"
                      class="btn-icon btn-edit"
                      [routerLink]="['/content/console/forms/edit', form.id]"
                      title="Edit Form & Questions">
                      <span class="material-symbols-outlined">edit</span>
                      <span class="btn-text">Edit</span>
                    </button>
                    <button
                      type="button"
                      class="btn-icon btn-delete"
                      (click)="confirmDelete(form)"
                      title="Delete Form">
                      <span class="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Delete Confirmation Modal -->
      <div *ngIf="formToDelete" class="modal-overlay">
        <div class="modal-card">
          <div class="modal-header">
            <div class="modal-icon-wrap delete-icon">
              <span class="material-symbols-outlined">warning</span>
            </div>
            <h3>Delete Form</h3>
          </div>
          <div class="modal-body">
            <p>
              Are you sure you want to permanently delete <strong>{{ formToDelete.title }}</strong>?
            </p>
            <p class="warning-text">
              This will remove all associated questions and {{ formToDelete.totalSubmissions || 0 }} visitor submission records. This action cannot be undone.
            </p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" (click)="formToDelete = null" [disabled]="deleting">
              Cancel
            </button>
            <button type="button" class="btn btn-danger" (click)="executeDelete()" [disabled]="deleting">
              <span *ngIf="!deleting">Delete Permanently</span>
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
    .page-header h1 { font-size: 26px; font-weight: 800; color: #0f172a; margin: 0 0 4px; }
    .subtitle { color: #64748b; font-size: 14px; margin: 0; }
    .header-actions { display: flex; gap: 12px; }

    .btn {
      display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px;
      border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; text-decoration: none;
      transition: all 0.2s ease;
    }
    .btn-primary { background: #0050e5; color: #fff; border: none; }
    .btn-primary:hover { background: #003ebd; }
    .btn-outline { background: transparent; border: 1px solid #cbd5e1; color: #334155; }
    .btn-outline:hover { background: #f8fafc; border-color: #94a3b8; }
    .btn-danger { background: #ef4444; color: #fff; border: none; }
    .btn-danger:hover { background: #dc2626; }

    .badge-pill {
      display: inline-flex; align-items: center; padding: 3px 10px;
      border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase;
    }
    .badge-live { background: #dcfce7; color: #166534; }

    .metrics-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px;
    }
    .metric-card {
      background: #fff; border: 1px solid #e2e8f0; border-radius: 14px;
      padding: 18px 20px; display: flex; align-items: center; gap: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
    }
    .metric-icon-wrap {
      width: 48px; height: 48px; border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
    }
    .icon-blue { background: #eff6ff; color: #0050e5; }
    .icon-green { background: #f0fdf4; color: #16a34a; }
    .icon-purple { background: #faf5ff; color: #9333ea; }
    .icon-amber { background: #fffbeb; color: #d97706; }
    .metric-info { display: flex; flex-direction: column; }
    .metric-val { font-size: 24px; font-weight: 800; color: #0f172a; line-height: 1.1; }
    .metric-lbl { font-size: 12px; color: #64748b; font-weight: 500; margin-top: 3px; }

    .filter-bar {
      display: flex; justify-content: space-between; align-items: center; gap: 16px;
      background: #fff; padding: 12px 18px; border-radius: 12px; border: 1px solid #e2e8f0;
    }
    .filter-group { display: flex; gap: 8px; }
    .filter-btn {
      border: none; background: transparent; padding: 6px 14px; border-radius: 8px;
      font-size: 13px; font-weight: 600; color: #64748b; cursor: pointer; transition: all 0.15s;
    }
    .filter-btn.active { background: #eff6ff; color: #0050e5; }
    .search-box {
      display: flex; align-items: center; gap: 8px; background: #f8fafc;
      padding: 6px 14px; border-radius: 8px; border: 1px solid #e2e8f0; width: 280px;
    }
    .search-box input { border: none; background: transparent; font-size: 13px; outline: none; width: 100%; }

    .cms-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.03); }
    .card-table-header { margin-bottom: 20px; }
    .table-title { font-size: 16px; font-weight: 700; color: #0f172a; }
    .table-subtitle { font-size: 13px; color: #64748b; margin-top: 2px; }

    .cms-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .cms-table th {
      padding: 12px 16px; background: #f8fafc; color: #475569;
      font-weight: 700; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;
      border-bottom: 1px solid #e2e8f0;
    }
    .cms-table td { padding: 16px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
    .table-row-hover:hover { background: #fcfdfe; }

    .form-title-cell { display: flex; flex-direction: column; gap: 4px; }
    .form-name { font-weight: 700; color: #0f172a; font-size: 14px; }
    .form-tags { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .code-badge {
      font-family: monospace; font-size: 11px; background: #f1f5f9;
      color: #334155; padding: 2px 8px; border-radius: 6px;
    }
    .form-desc { font-size: 12px; color: #64748b; margin: 4px 0 0; }

    .notification-cell { font-size: 12px; }
    .email-badge {
      display: inline-flex; align-items: center; gap: 4px; background: #f8fafc;
      padding: 4px 10px; border-radius: 6px; border: 1px solid #e2e8f0; color: #334155;
    }
    .email-badge span { font-size: 14px; color: #0050e5; }
    .text-muted { color: #94a3b8; }

    .field-pill {
      display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px;
      background: #f1f5f9; border-radius: 8px; font-weight: 600; font-size: 12px; color: #334155;
    }
    .field-pill span { font-size: 14px; color: #64748b; }

    .submission-metrics { display: flex; align-items: center; justify-content: center; gap: 6px; }
    .sub-count { font-weight: 700; font-size: 14px; color: #0f172a; }
    .badge-new-leads {
      background: #fef2f2; color: #dc2626; font-size: 10px; font-weight: 700;
      padding: 2px 6px; border-radius: 12px; border: 1px solid #fee2e2;
    }

    .status-pill {
      display: inline-block; padding: 3px 10px; border-radius: 12px;
      font-size: 11px; font-weight: 700;
    }
    .status-pill.active { background: #dcfce7; color: #15803d; }
    .status-pill.inactive { background: #f1f5f9; color: #64748b; }

    .actions-cell { display: flex; align-items: center; justify-content: flex-end; gap: 8px; }
    .btn-icon {
      display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px;
      border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; text-decoration: none;
      transition: all 0.15s; border: 1px solid #e2e8f0; background: #fff; color: #334155;
    }
    .btn-leads { color: #0050e5; border-color: #bfdbfe; background: #eff6ff; }
    .btn-leads:hover { background: #dbeafe; }
    .btn-edit:hover { background: #f8fafc; border-color: #cbd5e1; }
    .btn-delete { color: #dc2626; border-color: #fecaca; }
    .btn-delete:hover { background: #fef2f2; border-color: #f87171; }
    .btn-icon span.material-symbols-outlined { font-size: 16px; }

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
    .empty-state p { color: #64748b; font-size: 13px; max-width: 380px; margin: 0 0 20px; }

    .loading-state {
      padding: 40px; text-align: center; color: #64748b;
      display: flex; flex-direction: column; align-items: center; gap: 12px;
    }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { 100% { transform: rotate(360deg); } }

    /* Modal */
    .modal-overlay {
      position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center;
      z-index: 9999; padding: 16px;
    }
    .modal-card {
      background: #fff; width: 100%; max-width: 460px; border-radius: 16px;
      box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1);
      overflow: hidden; animation: modalPop 0.2s ease-out;
    }
    @keyframes modalPop {
      0% { transform: scale(0.95); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }
    .modal-header {
      padding: 20px 24px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; gap: 12px;
    }
    .delete-icon {
      width: 40px; height: 40px; border-radius: 10px; background: #fee2e2;
      color: #dc2626; display: flex; align-items: center; justify-content: center;
    }
    .modal-header h3 { font-size: 18px; font-weight: 700; color: #0f172a; margin: 0; }
    .modal-body { padding: 20px 24px; font-size: 14px; color: #334155; line-height: 1.5; }
    .warning-text { font-size: 12px; color: #dc2626; margin-top: 10px; background: #fef2f2; padding: 8px 12px; border-radius: 8px; }
    .modal-footer {
      padding: 16px 24px; background: #f8fafc; border-top: 1px solid #f1f5f9;
      display: flex; justify-content: flex-end; gap: 12px;
    }
  `]
})
export class FormsListComponent implements OnInit {
  forms: PageFormItem[] = [];
  loading = false;
  deleting = false;
  searchTerm = '';
  statusFilter: 'all' | 'active' | 'inactive' = 'all';
  formToDelete: PageFormItem | null = null;

  get headerButtons(): PageHeaderButton[] {
    return [
      {
        text: 'Create New Form',
        icon: 'add_circle',
        isPrimary: true,
        routerLink: '/content/console/forms/create'
      },
      {
        text: 'Refresh',
        icon: 'refresh',
        disabled: this.loading,
        loading: this.loading,
        action: () => this.loadForms()
      }
    ];
  }

  constructor(
    private formsService: PageFormsService,
    private toast: ToastService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadForms();
  }

  loadForms(): void {
    this.loading = true;
    this.formsService.getAllForms().subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res && res.isSuccess) {
          this.forms = res.data || [];
        } else {
          this.toast.error(res?.message || 'Failed to load page forms.');
        }
      },
      error: (err: any) => {
        this.loading = false;
        this.toast.error('Network error loading forms.');
      }
    });
  }

  get totalSubmissionsCount(): number {
    return this.forms.reduce((sum, f) => sum + (f.totalSubmissions || 0), 0);
  }

  get totalNewSubmissions(): number {
    return this.forms.reduce((sum, f) => sum + (f.newSubmissions || 0), 0);
  }

  get activeFormsCount(): number {
    return this.forms.filter(f => f.isActive).length;
  }

  get filteredForms(): PageFormItem[] {
    return this.forms.filter(f => {
      const matchesSearch = !this.searchTerm.trim() ||
        f.title.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        f.formKey.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        (f.description && f.description.toLowerCase().includes(this.searchTerm.toLowerCase()));

      const matchesStatus =
        this.statusFilter === 'all' ||
        (this.statusFilter === 'active' && f.isActive) ||
        (this.statusFilter === 'inactive' && !f.isActive);

      return matchesSearch && matchesStatus;
    });
  }

  confirmDelete(form: PageFormItem): void {
    this.formToDelete = form;
  }

  executeDelete(): void {
    if (!this.formToDelete) return;
    this.deleting = true;
    this.formsService.deleteForm(this.formToDelete.id).subscribe({
      next: (res: any) => {
        this.deleting = false;
        if (res && res.isSuccess) {
          this.toast.success(`Form '${this.formToDelete!.title}' deleted successfully.`);
          this.forms = this.forms.filter(f => f.id !== this.formToDelete!.id);
          this.formToDelete = null;
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('forms_updated'));
          }
        } else {
          this.toast.error(res?.message || 'Failed to delete form.');
        }
      },
      error: (err: any) => {
        this.deleting = false;
        this.toast.error('An error occurred while deleting the form.');
      }
    });
  }
}
