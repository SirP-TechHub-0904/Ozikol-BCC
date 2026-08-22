import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-user-delete',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="delete-page-container">
      <!-- Breadcrumb & Top Bar -->
      <div class="page-header-bar">
        <div class="header-titles">
          <div class="breadcrumb">
            <a routerLink="/users/console">Users Suite</a>
            <span class="sep">/</span>
            <a routerLink="/users/console/list">Members Directory</a>
            <span class="sep">/</span>
            <span class="current danger-text">Delete Member Account</span>
          </div>
          <h1 class="page-title danger-title">
            <span class="material-symbols-outlined danger-icon">warning</span>
            Confirm Member Account Deletion
          </h1>
          <p class="page-sub">Review account access consequences and verify identity before permanently destroying this member profile.</p>
        </div>

        <div class="header-actions">
          <a routerLink="/users/console/list" class="btn btn-secondary">
            <span class="material-symbols-outlined">arrow_back</span>
            <span>Cancel & Go Back</span>
          </a>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="state-card loading">
        <span class="material-symbols-outlined spin">progress_activity</span>
        <p>Loading member dossier...</p>
      </div>

      <!-- Policy Warning Banner if User Deletion is Disabled -->
      <div *ngIf="policyDisabled && !loading" class="alert-banner warning">
        <span class="material-symbols-outlined">gpp_maybe</span>
        <div>
          <strong>User Deletion Disabled in System Settings:</strong>
          <span> Administrator user deletion is currently locked by organization security policies. You must enable "Allow Administrator User Account Deletion" in <a routerLink="/settings/console" style="color:inherit; text-decoration:underline; font-weight:800;">Settings</a> to proceed.</span>
        </div>
      </div>

      <!-- Error State -->
      <div *ngIf="errorMsg && !loading" class="alert-banner error">
        <span class="material-symbols-outlined">error</span>
        <span>{{ errorMsg }}</span>
      </div>

      <!-- Main Deletion Danger Zone -->
      <div class="delete-layout" *ngIf="!loading && user">
        <!-- Target Record Summary Card -->
        <div class="record-summary-card">
          <div class="summary-head">
            <span class="material-symbols-outlined">person</span>
            <h3>Member Account to be Destroyed</h3>
          </div>

          <div class="record-body">
            <div class="avatar-box">
              <img *ngIf="user.avatarUrl" [src]="user.avatarUrl" alt="Avatar" class="avatar-img" />
              <div *ngIf="!user.avatarUrl" class="avatar-fallback">
                {{ getInitials(user.fullName) }}
              </div>
            </div>

            <div class="record-details">
              <h2 class="record-title">{{ user.fullName }}</h2>
              <p class="record-sub">{{ user.email }} &bull; {{ user.phoneNumber || 'No phone' }}</p>

              <div class="meta-row">
                <span class="meta-pill id-pill">Member ID: {{ user.memberId || 'None' }}</span>
                <span class="meta-pill role-pill">{{ user.role || 'Member' }}</span>
                <span class="meta-pill" [ngClass]="user.isActive ? 'active' : 'suspended'">
                  {{ user.isActive ? 'Active Account' : 'Suspended' }}
                </span>
                <span class="meta-date">Joined: {{ user.createdAt | date:'mediumDate' }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Consequences Warning Box -->
        <div class="consequences-card">
          <div class="consequences-head">
            <span class="material-symbols-outlined">dangerous</span>
            <h3>Irreversible Consequences of Deleting this User</h3>
          </div>

          <ul class="consequences-list">
            <li>
              <strong>Credential & Session Invalidation:</strong> All active login tokens, sessions, MFA authenticators, and password credentials will be immediately wiped.
            </li>
            <li>
              <strong>KPI Evaluation & Performance History:</strong> All historical evaluation ratings, score logs, and metric submissions recorded for this member will be permanently detached and purged.
            </li>
            <li>
              <strong>User Notes & Administrative Logs:</strong> All confidential administrative notes, warnings, and dossier flags attached to this profile will be erased.
            </li>
            <li>
              <strong>Irreversible Data Loss:</strong> This member account cannot be recovered or restored after deletion.
            </li>
          </ul>
        </div>

        <!-- Exact Full Name Confirmation & Action -->
        <div class="confirmation-card" *ngIf="!policyDisabled">
          <div class="confirm-instruction">
            <p>
              To confirm that you understand these consequences and intend to permanently destroy this user account, please type the member's exact full name:
            </p>
            <div class="target-title-pill" (click)="copyName()" title="Click to copy">
              <code>{{ user.fullName }}</code>
            </div>
          </div>

          <div class="confirm-input-group">
            <label>TYPE MEMBER FULL NAME TO CONFIRM DELETION:</label>
            <input
              type="text"
              [(ngModel)]="confirmationInput"
              placeholder="Type the exact full name here..."
              class="confirm-input"
              [class.matched]="isNameMatched()"
            />

            <div class="match-status" *ngIf="confirmationInput">
              <span *ngIf="isNameMatched()" class="status-match">
                <span class="material-symbols-outlined">check_circle</span> Name matched exactly. Account destruction unlocked.
              </span>
              <span *ngIf="!isNameMatched()" class="status-mismatch">
                <span class="material-symbols-outlined">cancel</span> Name does not match yet.
              </span>
            </div>
          </div>

          <div class="delete-action-row">
            <a routerLink="/users/console/list" class="btn btn-secondary">
              <span>Cancel</span>
            </a>
            <button
              type="button"
              class="btn btn-danger"
              (click)="executeDelete()"
              [disabled]="!isNameMatched() || deleting"
            >
              <span class="material-symbols-outlined">{{ deleting ? 'hourglass_top' : 'person_remove' }}</span>
              <span>{{ deleting ? 'Deleting Account...' : 'I understand the consequences, delete this user permanently' }}</span>
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
    .alert-banner.warning { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }

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
    .avatar-box {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      overflow: hidden;
      flex-shrink: 0;
      border: 2px solid #e2e8f0;
      background: #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .avatar-img { width: 100%; height: 100%; object-fit: cover; }
    .avatar-fallback { font-size: 24px; font-weight: 800; color: #0050e5; }

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
    .meta-pill.id-pill { background: #f1f5f9; color: #334155; font-family: monospace; }
    .meta-pill.role-pill { background: rgba(0, 80, 229, 0.1); color: #0050e5; }
    .meta-pill.active { background: rgba(34, 197, 94, 0.12); color: #16a34a; }
    .meta-pill.suspended { background: rgba(239, 68, 68, 0.12); color: #ef4444; }
    .meta-date { font-size: 12px; color: #94a3b8; }

    .record-id-box {
      margin-top: 8px;
      font-size: 11px;
      color: #64748b;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .record-id-box code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; color: #334155; }

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
export class UserDeleteComponent implements OnInit {
  userId: string | null = null;
  user: any = null;
  loading = false;
  deleting = false;
  policyDisabled = false;
  confirmationInput = '';
  errorMsg = '';

  constructor(
    private api: ApiService,
    private toast: ToastService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.checkPolicy();
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.userId = id;
        this.loadUser(id);
      }
    });
  }

  checkPolicy(): void {
    this.api.get<any>('UsersApi/member-id-config').subscribe({
      next: (res) => {
        if (res?.data && res.data.enableUserDeletion === false) {
          this.policyDisabled = true;
        }
      },
      error: () => {}
    });
  }

  loadUser(id: string): void {
    this.loading = true;
    this.api.get<any>(`UsersApi/${id}`).subscribe({
      next: (res) => {
        this.loading = false;
        if (res?.data) {
          this.user = res.data;
        } else {
          this.errorMsg = 'Member record not found.';
        }
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = err?.error?.message || 'Failed to load member profile.';
      }
    });
  }

  getInitials(name: string): string {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }

  isNameMatched(): boolean {
    if (!this.user?.fullName || !this.confirmationInput) return false;
    return this.confirmationInput.trim().toLowerCase() === this.user.fullName.trim().toLowerCase();
  }

  copyName(): void {
    if (this.user?.fullName) {
      navigator.clipboard?.writeText(this.user.fullName);
      this.confirmationInput = this.user.fullName;
    }
  }

  executeDelete(): void {
    if (!this.isNameMatched() || !this.userId) return;

    this.deleting = true;
    this.errorMsg = '';

    this.api.delete<any>(`UsersApi/${this.userId}`).subscribe({
      next: () => {
        this.deleting = false;
        this.toast.success(`Account for '${this.user.fullName}' deleted permanently.`);
        this.router.navigate(['/users/console/list']);
      },
      error: (err) => {
        this.deleting = false;
        this.errorMsg = err?.error?.message || 'Failed to delete member account.';
      }
    });
  }
}
