import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { WorkforceService } from '../../../core/services/workforce.service';
import { ToastService } from '../../../core/services/toast.service';

interface StaffTypeItem {
  id: string;
  name: string;
  code: string;
  description: string;
  defaultContractedHours: number;
  isCompulsory: boolean;
  isActive: boolean;
  sortOrder: number;
  enrolledStaffCount: number;
}

@Component({
  selector: 'app-workforce-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="settings-page">
      <!-- Breadcrumb Header -->
      <nav class="breadcrumb-nav">
        <span class="crumb-root">Command Center</span>
        <span class="crumb-sep">/</span>
        <span class="crumb-parent">Workforce &amp; Shifts</span>
        <span class="crumb-sep">/</span>
        <span class="crumb-active">Staff Types &amp; Workforce Settings</span>
      </nav>

      <!-- Main Title Bar -->
      <div class="page-header">
        <div class="header-left">
          <div class="title-row">
            <h1 class="page-title">Workforce Staff Types &amp; Policies</h1>
            <button
              type="button"
              class="info-badge-btn"
              (click)="showInfoModal = true"
              title="Click to view explanation and policy rules"
            >
              <span class="material-symbols-outlined">info</span>
            </button>
            <span class="suite-pill">SUITE: WORKFORCE &amp; SHIFTS</span>
          </div>
          <p class="page-subtitle">
            Govern employment classifications (Permanent, Temporary, Contractor), baseline weekly duty hours, and compulsory tenant defaults.
          </p>
        </div>
        <div class="header-actions">
          <button type="button" class="btn btn-outline" (click)="loadStaffTypes()">
            <span class="material-symbols-outlined">refresh</span> Refresh
          </button>
          <button type="button" class="btn btn-primary" (click)="openCreateModal()">
            <span class="material-symbols-outlined">add</span> + Add Staff Type
          </button>
        </div>
      </div>

      <!-- Overview Metric Cards -->
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="card-icon bg-blue">
            <span class="material-symbols-outlined">badge</span>
          </div>
          <div class="metric-body">
            <div class="metric-val">{{ staffTypes.length }}</div>
            <div class="metric-label">Configured Staff Types</div>
          </div>
        </div>

        <div class="metric-card">
          <div class="card-icon bg-emerald">
            <span class="material-symbols-outlined">verified_user</span>
          </div>
          <div class="metric-body">
            <div class="metric-val">{{ compulsoryCount }}</div>
            <div class="metric-label">Compulsory Defaults (Permanent &amp; Temporary)</div>
          </div>
        </div>

        <div class="metric-card">
          <div class="card-icon bg-purple">
            <span class="material-symbols-outlined">groups</span>
          </div>
          <div class="metric-body">
            <div class="metric-val">{{ totalEnrolledStaff }}</div>
            <div class="metric-label">Enrolled Workers Classified</div>
          </div>
        </div>
      </div>

      <!-- Main Staff Types Table Card -->
      <div class="content-card">
        <div class="card-header-bar">
          <div class="header-bar-left">
            <h2 class="card-title">Configured Staff Employment Classifications</h2>
            <span class="card-desc">
              Permanent and Temporary staff types are platform-compulsory seeded upon workspace creation.
            </span>
          </div>
          <div class="badge-compulsory-note">
            <span class="material-symbols-outlined">lock</span> Compulsory on Tenant Creation
          </div>
        </div>

        <div class="table-responsive" *ngIf="!isLoading && staffTypes.length">
          <table class="modern-table">
            <thead>
              <tr>
                <th>Classification Name</th>
                <th>System Code</th>
                <th>Description &amp; Scheduling Rule</th>
                <th>Contracted Hours / Wk</th>
                <th>Enrolled Staff</th>
                <th>Status</th>
                <th class="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of staffTypes">
                <td>
                  <div class="type-name-cell">
                    <span class="name-text">{{ item.name }}</span>
                    <span class="compulsory-chip" *ngIf="item.isCompulsory" title="Platform compulsory standard for all tenants">
                      <span class="material-symbols-outlined">lock</span> Compulsory
                    </span>
                  </div>
                </td>
                <td>
                  <code class="code-pill">{{ item.code }}</code>
                </td>
                <td>
                  <span class="desc-text">{{ item.description || 'Standard employment classification' }}</span>
                </td>
                <td>
                  <span class="hours-badge" [class.zero-hours]="item.defaultContractedHours === 0">
                    <span class="material-symbols-outlined">schedule</span>
                    {{ item.defaultContractedHours > 0 ? (item.defaultContractedHours | number:'1.1-1') + ' hrs/wk' : 'Zero-Hours (Flexible)' }}
                  </span>
                </td>
                <td>
                  <span class="count-chip">{{ item.enrolledStaffCount }} staff</span>
                </td>
                <td>
                  <span class="status-badge" [class.active]="item.isActive" [class.inactive]="!item.isActive">
                    {{ item.isActive ? 'Active' : 'Inactive' }}
                  </span>
                </td>
                <td class="text-end">
                  <div class="action-btn-group">
                    <button
                      type="button"
                      class="btn-icon"
                      (click)="openEditModal(item)"
                      title="Edit Staff Type"
                    >
                      <span class="material-symbols-outlined">edit</span>
                    </button>
                    <button
                      type="button"
                      class="btn-icon btn-icon-danger"
                      [disabled]="item.isCompulsory"
                      (click)="deleteType(item)"
                      [title]="item.isCompulsory ? 'Compulsory platform staff types cannot be deleted' : 'Delete Staff Type'"
                    >
                      <span class="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Empty State -->
        <div class="empty-state" *ngIf="!isLoading && !staffTypes.length">
          <span class="material-symbols-outlined empty-icon">badge</span>
          <h3>No Staff Types Found</h3>
          <p>Compulsory defaults are automatically initialized for all workspaces.</p>
          <button type="button" class="btn btn-primary" (click)="loadStaffTypes()">
            Initialize Compulsory Types
          </button>
        </div>

        <!-- Loading State -->
        <div class="loading-state" *ngIf="isLoading">
          <div class="spinner"></div>
          <span>Loading workforce staff types...</span>
        </div>
      </div>

      <!-- Add / Edit Modal -->
      <div class="modal-overlay" *ngIf="showModal" (click)="closeModal()">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div class="modal-title-row">
              <span class="material-symbols-outlined modal-header-icon">{{ isEditing ? 'edit' : 'add_circle' }}</span>
              <h3>{{ isEditing ? 'Edit Staff Type' : 'Add New Staff Type' }}</h3>
            </div>
            <button type="button" class="close-btn" (click)="closeModal()">&times;</button>
          </div>

          <form (ngSubmit)="saveStaffType()" class="modal-form">
            <div class="form-group">
              <label class="form-label">Classification Name <span class="required">*</span></label>
              <input
                type="text"
                class="form-control"
                [(ngModel)]="activeModel.name"
                name="name"
                placeholder="e.g. Temporary, Permanent, Contractor"
                required
              />
            </div>

            <div class="form-group" *ngIf="!isEditing">
              <label class="form-label">System Code</label>
              <input
                type="text"
                class="form-control"
                [(ngModel)]="activeModel.code"
                name="code"
                placeholder="e.g. temporary, permanent, contractor"
              />
              <small class="form-hint">Used for system classification and automated payroll exports.</small>
            </div>

            <div class="form-group">
              <label class="form-label">Default Baseline Contracted Hours / Week</label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="80"
                class="form-control"
                [(ngModel)]="activeModel.defaultContractedHours"
                name="defaultContractedHours"
                placeholder="e.g. 40.0 (or 0 for zero-hours)"
              />
              <small class="form-hint">Set to 0 for casual, zero-hours, or ad-hoc event shifts.</small>
            </div>

            <div class="form-group">
              <label class="form-label">Description &amp; Scheduling Rule</label>
              <textarea
                class="form-control textarea"
                rows="3"
                [(ngModel)]="activeModel.description"
                name="description"
                placeholder="Describe the employment conditions, shift eligibility, or overtime rules..."
              ></textarea>
            </div>

            <div class="form-group" *ngIf="isEditing && !activeModel.isCompulsory">
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  [(ngModel)]="activeModel.isActive"
                  name="isActive"
                />
                <span>Active for new staff enrollments and rota assignments</span>
              </label>
            </div>

            <div class="compulsory-alert" *ngIf="isEditing && activeModel.isCompulsory">
              <span class="material-symbols-outlined">info</span>
              <div>
                <strong>Compulsory Platform Standard:</strong> This classification was seeded when your workspace was created and cannot be deactivated or deleted.
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-outline" (click)="closeModal()">Cancel</button>
              <button type="submit" class="btn btn-primary" [disabled]="isSubmitting || !activeModel.name?.trim()">
                <span class="material-symbols-outlined">save</span>
                {{ isSubmitting ? 'Saving...' : (isEditing ? 'Save Changes' : 'Create Staff Type') }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Info Modal -->
      <div class="modal-overlay" *ngIf="showInfoModal" (click)="showInfoModal = false">
        <div class="modal-card info-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div class="modal-title-row">
              <span class="material-symbols-outlined modal-header-icon text-primary">help</span>
              <h3>Workforce Staff Types &amp; Tenant Governance</h3>
            </div>
            <button type="button" class="close-btn" (click)="showInfoModal = false">&times;</button>
          </div>
          <div class="info-modal-body">
            <div class="info-section">
              <h4>Why are Staff Types Compulsory?</h4>
              <p>
                Every tenant organization has both <strong>Permanent</strong> (guaranteed hours) and <strong>Temporary</strong> (casual / zero-hours) workers.
                When a new workspace is created, the BCC engine automatically provisions these compulsory classifications so that shift scheduling, attendance compliance, and labor spend analytics function seamlessly out of the box.
              </p>
            </div>
            <div class="info-section">
              <h4>Custom Staff Classifications</h4>
              <p>
                Administrators can create additional custom classifications such as <em>External Agency</em>, <em>Apprentice</em>, or <em>Event Steward</em> to fit specific enterprise contracts.
              </p>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-primary" (click)="showInfoModal = false">Understood</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .settings-page {
      padding: 1.5rem;
      max-width: 1400px;
      margin: 0 auto;
    }

    .breadcrumb-nav {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.825rem;
      color: #64748b;
      margin-bottom: 0.75rem;
    }
    .crumb-sep { color: #cbd5e1; }
    .crumb-active { color: #0050e5; font-weight: 600; }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .title-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .page-title {
      font-size: 1.625rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
    }
    .info-badge-btn {
      background: none;
      border: none;
      padding: 0;
      color: #64748b;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      transition: color 0.15s;
    }
    .info-badge-btn:hover { color: #0050e5; }
    .suite-pill {
      font-size: 0.7rem;
      font-weight: 700;
      padding: 0.2rem 0.5rem;
      border-radius: 9999px;
      background: #eff6ff;
      color: #0050e5;
      letter-spacing: 0.05em;
    }
    .page-subtitle {
      color: #64748b;
      font-size: 0.9rem;
      margin: 0.375rem 0 0 0;
    }
    .header-actions {
      display: flex;
      gap: 0.75rem;
    }

    /* Metrics Grid */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .metric-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 1.25rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
    }
    .card-icon {
      width: 48px;
      height: 48px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .bg-blue { background: #eff6ff; color: #0050e5; }
    .bg-emerald { background: #ecfdf5; color: #059669; }
    .bg-purple { background: #f5f3ff; color: #7c3aed; }
    .metric-val {
      font-size: 1.5rem;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.2;
    }
    .metric-label {
      font-size: 0.8rem;
      color: #64748b;
      margin-top: 0.2rem;
    }

    /* Content Card */
    .content-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
      overflow: hidden;
    }
    .card-header-bar {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #f1f5f9;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.75rem;
    }
    .card-title {
      font-size: 1.1rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }
    .card-desc {
      font-size: 0.825rem;
      color: #64748b;
      display: block;
      margin-top: 0.25rem;
    }
    .badge-compulsory-note {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.75rem;
      font-weight: 600;
      color: #059669;
      background: #ecfdf5;
      padding: 0.35rem 0.75rem;
      border-radius: 9999px;
    }
    .badge-compulsory-note .material-symbols-outlined { font-size: 1rem; }

    /* Modern Table */
    .table-responsive {
      overflow-x: auto;
    }
    .modern-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }
    .modern-table th {
      background: #f8fafc;
      color: #475569;
      font-weight: 600;
      text-align: left;
      padding: 0.875rem 1.25rem;
      border-bottom: 1px solid #e2e8f0;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .modern-table td {
      padding: 1rem 1.25rem;
      border-bottom: 1px solid #f1f5f9;
      color: #1e293b;
      vertical-align: middle;
    }
    .modern-table tr:hover { background: #f8fafc; }

    .type-name-cell {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .name-text {
      font-weight: 700;
      color: #0f172a;
    }
    .compulsory-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.7rem;
      font-weight: 600;
      color: #0284c7;
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      padding: 0.15rem 0.5rem;
      border-radius: 6px;
    }
    .compulsory-chip .material-symbols-outlined { font-size: 0.85rem; }

    .code-pill {
      background: #f1f5f9;
      color: #475569;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-family: monospace;
      font-size: 0.8rem;
    }

    .desc-text {
      color: #64748b;
      font-size: 0.825rem;
      max-width: 320px;
      display: block;
      line-height: 1.4;
    }

    .hours-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.8rem;
      font-weight: 600;
      padding: 0.3rem 0.6rem;
      border-radius: 6px;
      background: #eff6ff;
      color: #0050e5;
    }
    .hours-badge.zero-hours {
      background: #fef3c7;
      color: #d97706;
    }
    .hours-badge .material-symbols-outlined { font-size: 0.95rem; }

    .count-chip {
      font-size: 0.8rem;
      font-weight: 600;
      color: #475569;
      background: #f1f5f9;
      padding: 0.25rem 0.6rem;
      border-radius: 6px;
    }

    .status-badge {
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.25rem 0.5rem;
      border-radius: 9999px;
    }
    .status-badge.active { background: #ecfdf5; color: #059669; }
    .status-badge.inactive { background: #f1f5f9; color: #94a3b8; }

    .action-btn-group {
      display: flex;
      justify-content: flex-end;
      gap: 0.35rem;
    }
    .btn-icon {
      background: none;
      border: 1px solid transparent;
      padding: 0.4rem;
      border-radius: 6px;
      cursor: pointer;
      color: #64748b;
      display: inline-flex;
      align-items: center;
      transition: all 0.15s;
    }
    .btn-icon:hover:not(:disabled) {
      background: #f1f5f9;
      color: #0050e5;
    }
    .btn-icon-danger:hover:not(:disabled) {
      background: #fee2e2;
      color: #dc2626;
    }
    .btn-icon:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.6rem 1.1rem;
      font-size: 0.875rem;
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.15s;
    }
    .btn-primary {
      background: #0050e5;
      color: #ffffff;
    }
    .btn-primary:hover:not(:disabled) { background: #003db3; }
    .btn-outline {
      background: #ffffff;
      border-color: #cbd5e1;
      color: #475569;
    }
    .btn-outline:hover { background: #f8fafc; color: #0f172a; }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; }

    /* Modals */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.55);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1050;
      padding: 1rem;
    }
    .modal-card {
      background: #ffffff;
      border-radius: 14px;
      width: 100%;
      max-width: 520px;
      box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1);
      overflow: hidden;
      animation: modalSlideIn 0.2s ease-out;
    }
    @keyframes modalSlideIn {
      from { transform: translateY(12px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .modal-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #f1f5f9;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .modal-title-row {
      display: flex;
      align-items: center;
      gap: 0.625rem;
    }
    .modal-header-icon {
      font-size: 1.4rem;
      color: #0050e5;
    }
    .modal-title-row h3 {
      font-size: 1.15rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }
    .close-btn {
      background: none;
      border: none;
      font-size: 1.5rem;
      color: #94a3b8;
      cursor: pointer;
      line-height: 1;
    }
    .close-btn:hover { color: #0f172a; }
    .modal-form { padding: 1.5rem; }
    .form-group { margin-bottom: 1.125rem; }
    .form-label {
      display: block;
      font-size: 0.825rem;
      font-weight: 600;
      color: #334155;
      margin-bottom: 0.35rem;
    }
    .required { color: #ef4444; }
    .form-control {
      width: 100%;
      padding: 0.65rem 0.875rem;
      font-size: 0.875rem;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      color: #0f172a;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .form-control:focus {
      outline: none;
      border-color: #0050e5;
      box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.12);
    }
    .textarea { resize: vertical; }
    .form-hint {
      font-size: 0.75rem;
      color: #64748b;
      margin-top: 0.3rem;
      display: block;
    }
    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.85rem;
      color: #334155;
      cursor: pointer;
    }
    .compulsory-alert {
      display: flex;
      gap: 0.625rem;
      padding: 0.75rem;
      border-radius: 8px;
      background: #eff6ff;
      border: 1px solid #dbeafe;
      color: #1e40af;
      font-size: 0.8rem;
      margin-bottom: 1.125rem;
    }
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding-top: 1rem;
      border-top: 1px solid #f1f5f9;
      margin-top: 0.5rem;
    }

    /* Info Modal */
    .info-modal-body {
      padding: 1.5rem;
    }
    .info-section {
      margin-bottom: 1.25rem;
    }
    .info-section:last-child { margin-bottom: 0; }
    .info-section h4 {
      font-size: 0.95rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 0.35rem 0;
    }
    .info-section p {
      font-size: 0.85rem;
      color: #475569;
      line-height: 1.5;
      margin: 0;
    }

    /* States */
    .loading-state, .empty-state {
      padding: 3rem 1.5rem;
      text-align: center;
      color: #64748b;
    }
    .empty-icon {
      font-size: 3rem;
      color: #cbd5e1;
      margin-bottom: 0.5rem;
    }
    .empty-state h3 {
      font-size: 1.15rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 0.25rem 0;
    }
    .empty-state p {
      font-size: 0.85rem;
      margin-bottom: 1rem;
    }
    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid #e2e8f0;
      border-top-color: #0050e5;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 0.75rem auto;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    @media (max-width: 768px) {
      .settings-page { padding: 1rem; }
      .header-actions { width: 100%; }
      .header-actions .btn { flex: 1; justify-content: center; }
    }
  `]
})
export class WorkforceSettingsComponent implements OnInit {
  isLoading = true;
  isSubmitting = false;
  staffTypes: StaffTypeItem[] = [];

  showModal = false;
  showInfoModal = false;
  isEditing = false;

  activeModel: any = {
    id: '',
    name: '',
    code: '',
    description: '',
    defaultContractedHours: 40.0,
    isCompulsory: false,
    isActive: true
  };

  constructor(
    private readonly workforceService: WorkforceService,
    private readonly toast: ToastService
  ) {}

  ngOnInit(): void {
    this.loadStaffTypes();
  }

  get compulsoryCount(): number {
    return this.staffTypes.filter(t => t.isCompulsory).length;
  }

  get totalEnrolledStaff(): number {
    return this.staffTypes.reduce((acc, curr) => acc + (curr.enrolledStaffCount || 0), 0);
  }

  loadStaffTypes(): void {
    this.isLoading = true;
    this.workforceService.getStaffTypes().subscribe({
      next: (res: any) => {
        this.staffTypes = res?.data || [];
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.toast.error('Unable to retrieve workforce staff types.');
      }
    });
  }

  openCreateModal(): void {
    this.isEditing = false;
    this.activeModel = {
      id: '',
      name: '',
      code: '',
      description: '',
      defaultContractedHours: 40.0,
      isCompulsory: false,
      isActive: true
    };
    this.showModal = true;
  }

  openEditModal(item: StaffTypeItem): void {
    this.isEditing = true;
    this.activeModel = {
      id: item.id,
      name: item.name,
      code: item.code,
      description: item.description,
      defaultContractedHours: item.defaultContractedHours,
      isCompulsory: item.isCompulsory,
      isActive: item.isActive
    };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  saveStaffType(): void {
    if (!this.activeModel.name?.trim()) {
      this.toast.warning('Staff classification name is required.');
      return;
    }

    this.isSubmitting = true;

    if (this.isEditing) {
      this.workforceService.updateStaffType(this.activeModel.id, {
        name: this.activeModel.name.trim(),
        description: this.activeModel.description?.trim(),
        defaultContractedHours: Number(this.activeModel.defaultContractedHours || 0),
        isActive: this.activeModel.isActive
      }).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.showModal = false;
          this.toast.success(`Staff type '${this.activeModel.name}' updated successfully.`);
          this.loadStaffTypes();
        },
        error: (err: any) => {
          this.isSubmitting = false;
          this.toast.error(err?.error?.message || 'Failed to update staff type.');
        }
      });
    } else {
      this.workforceService.createStaffType({
        name: this.activeModel.name.trim(),
        code: this.activeModel.code?.trim(),
        description: this.activeModel.description?.trim(),
        defaultContractedHours: Number(this.activeModel.defaultContractedHours || 0)
      }).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.showModal = false;
          this.toast.success(`Staff type '${this.activeModel.name}' created successfully.`);
          this.loadStaffTypes();
        },
        error: (err: any) => {
          this.isSubmitting = false;
          this.toast.error(err?.error?.message || 'Failed to create staff type.');
        }
      });
    }
  }

  deleteType(item: StaffTypeItem): void {
    if (item.isCompulsory) {
      this.toast.warning(`'${item.name}' is a compulsory platform standard and cannot be deleted.`);
      return;
    }

    if (item.enrolledStaffCount > 0) {
      this.toast.warning(`Cannot delete '${item.name}' because ${item.enrolledStaffCount} active staff member(s) are assigned to it.`);
      return;
    }

    if (!confirm(`Are you sure you want to delete the staff type '${item.name}'?`)) {
      return;
    }

    this.workforceService.deleteStaffType(item.id).subscribe({
      next: () => {
        this.toast.success(`Staff type '${item.name}' deleted.`);
        this.loadStaffTypes();
      },
      error: (err: any) => {
        this.toast.error(err?.error?.message || 'Failed to delete staff type.');
      }
    });
  }
}
