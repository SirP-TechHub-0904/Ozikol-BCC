import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent, PageHeaderButton } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-identity-invitations',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent],
  template: `
    <div class="identity-page">
      <app-page-header
        eyebrow="ONBOARDING REGISTRY"
        icon="mail"
        title="Administrative User Invitations"
        subtitle="Issue secure onboarding tokens to administrators, editors, or moderators with pre-assigned workspace roles."
        [buttons]="headerButtons"
        [loading]="isLoading"
      ></app-page-header>

      <!-- Invitations Table Card -->
      <section class="console-widget" style="margin-bottom: 24px;">
        <div class="widget-head">
          <div class="widget-title-wrap">
            <span class="material-symbols-outlined text-purple">list_alt</span>
            <h2 class="widget-title">Onboarding Token Registry</h2>
          </div>
          <a routerLink="/identity/console/invitations/create" class="btn btn-primary btn-sm">
            <span class="material-symbols-outlined">add</span>
            <span>Issue New Invitation</span>
          </a>
        </div>
        <div class="widget-body" style="padding:0;">
          <div *ngIf="invitations.length === 0 && !isLoading" class="empty-state">
            <span class="material-symbols-outlined">drafts</span>
            <p>No invitations issued yet. Click "Issue New Invitation" to onboard a new workspace member.</p>
            <a routerLink="/identity/console/invitations/create" class="btn btn-primary" style="margin-top: 14px;">
              <span class="material-symbols-outlined">send</span>
              <span>Issue First Invitation</span>
            </a>
          </div>

          <table class="table-clean" *ngIf="invitations.length > 0">
            <thead>
              <tr>
                <th>Recipient Email</th>
                <th>Assigned Role &amp; Scope</th>
                <th>Sent Date</th>
                <th>Expiration Date</th>
                <th>Onboarding Status</th>
                <th style="text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let invite of invitations">
                <td><strong>{{ invite.email }}</strong></td>
                <td>
                  <span class="role-pill">{{ invite.assignedRole }}</span>
                  <span *ngIf="invite.featureArea" class="scope-pill">
                    {{ invite.featureArea }}
                  </span>
                </td>
                <td>{{ invite.sentDate | date:'medium' }}</td>
                <td>{{ invite.expiresDate | date:'medium' }}</td>
                <td>
                  <span class="status-pill" [class]="getStatusClass(invite.status)">
                    {{ invite.status }}
                  </span>
                </td>
                <td style="text-align: right;">
                  <button
                    *ngIf="invite.status === 'Pending' && invite.invitationUrl"
                    type="button"
                    class="btn-copy-sm"
                    (click)="copyLink(invite.invitationUrl)"
                    title="Copy direct registration link"
                  >
                    <span class="material-symbols-outlined">content_copy</span>
                    <span>Copy Link</span>
                  </button>
                  <span *ngIf="invite.status !== 'Pending'" class="text-muted-status">
                    {{ invite.status === 'Accepted' ? 'Enrolled' : 'Expired' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .btn {
      padding: 9px 18px;
      font-size: 13px;
      font-weight: 600;
      border-radius: 8px;
      border: 1px solid transparent;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: background 0.2s;
    }
    .btn-outline {
      background: transparent;
      border-color: #cbd5e1;
      color: #475569;
    }
    .btn-outline:hover {
      background: #f8fafc;
    }
    .btn-primary {
      background: #0050e5;
      color: #fff;
    }
    .btn-primary:hover:not(:disabled) {
      background: #0040b3;
    }
    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .console-widget {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.02);
    }
    .widget-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    .widget-title-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .widget-title {
      font-size: 14px;
      font-weight: 800;
      margin: 0;
      color: #0f172a;
    }
    .empty-state {
      padding: 40px;
      text-align: center;
      color: #64748b;
    }
    .empty-state span {
      font-size: 40px;
      margin-bottom: 12px;
    }
    .form-control {
      width: 100%;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      color: #0f172a;
      border-radius: 8px;
      padding: 9px 12px;
      font-size: 13px;
      outline: none;
      box-sizing: border-box;
    }
    .form-control:focus {
      border-color: #0050e5;
    }
    .form-label {
      display: block;
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 6px;
    }
    .table-clean {
      width: 100%;
      border-collapse: collapse;
    }
    .table-clean th {
      text-align: left;
      font-size: 11px;
      text-transform: uppercase;
      color: #64748b;
      font-weight: 700;
      padding: 10px 12px;
      border-bottom: 2px solid #e2e8f0;
    }
    .table-clean td {
      padding: 12px;
      font-size: 13px;
      border-bottom: 1px solid #e2e8f0;
      color: #1e293b;
    }
    .table-clean tr:hover td {
      background: #f8fafc;
    }
    .status-pill {
      font-size: 11px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 4px;
      display: inline-block;
    }
    .status-pill.good { background: rgba(34,197,94,0.12); color: #16a34a; }
    .status-pill.info { background: rgba(59,130,246,0.12); color: #0050e5; }
    .status-pill.danger { background: rgba(239,68,68,0.12); color: #ef4444; }


    .role-pill {
      font-size: 11px;
      font-weight: 700;
      color: #0f172a;
      background: #f1f5f9;
      padding: 3px 8px;
      border-radius: 4px;
      display: inline-block;
      margin-right: 6px;
    }
    .scope-pill {
      font-size: 10.5px;
      font-weight: 600;
      color: #10b981;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.2);
      padding: 2px 6px;
      border-radius: 4px;
      display: inline-block;
    }
    .btn-copy-sm {
      background: transparent;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 4px 8px;
      font-size: 11.5px;
      font-weight: 600;
      color: #475569;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      transition: all 0.15s;
    }
    .btn-copy-sm .material-symbols-outlined {
      font-size: 14px;
    }
    .btn-copy-sm:hover {
      background: #f8fafc;
      border-color: #0050e5;
      color: #0050e5;
    }
    .text-muted-status {
      font-size: 11.5px;
      color: #94a3b8;
    }
    .btn-sm {
      padding: 6px 12px;
      font-size: 12px;
    }
  `]
})
export class IdentityInvitationsComponent implements OnInit {
  isLoading = false;
  invitations: any[] = [];

  headerButtons: PageHeaderButton[] = [
    {
      text: 'Send Onboarding Invite',
      icon: 'send',
      isPrimary: true,
      routerLink: '/identity/console/invitations/create'
    },
    {
      text: 'Refresh Registry',
      icon: 'refresh',
      action: () => { this.loadInvitations(); }
    }
  ];

  constructor(private api: ApiService, private toast: ToastService) {}

  ngOnInit(): void {
    this.loadInvitations();
  }

  loadInvitations(): void {
    this.isLoading = true;
    this.api.get<any>('IdentityApi/invitations').subscribe({
      next: (res) => {
        this.isLoading = false;
        this.invitations = res?.data || [];
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  copyLink(url: string): void {
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
      this.toast.success('Registration invitation link copied to clipboard!');
    });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Accepted': return 'good';
      case 'Expired': return 'danger';
      default: return 'info';
    }
  }
}
