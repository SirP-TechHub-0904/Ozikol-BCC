import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent, PageHeaderButton } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-identity-invitations',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent],
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

      <!-- Invitations Table -->
      <section class="console-widget" style="margin-bottom: 24px;">
        <div class="widget-head">
          <div class="widget-title-wrap">
            <span class="material-symbols-outlined text-purple">list_alt</span>
            <h2 class="widget-title">Onboarding Token Registry</h2>
          </div>
        </div>
        <div class="widget-body" style="padding:0;">
          <div *ngIf="invitations.length === 0 && !isLoading" class="empty-state">
            <span class="material-symbols-outlined">drafts</span>
            <p>No invitations issued yet. Click "Send Invitation" to onboard a new workspace member.</p>
          </div>

          <table class="table-clean" *ngIf="invitations.length > 0">
            <thead>
              <tr>
                <th>Recipient Email</th>
                <th>Assigned Role</th>
                <th>Sent Date</th>
                <th>Expiration Date</th>
                <th>Onboarding Status</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let invite of invitations">
                <td><strong>{{ invite.email }}</strong></td>
                <td>{{ invite.assignedRole }}</td>
                <td>{{ invite.sentDate | date:'medium' }}</td>
                <td>{{ invite.expiresDate | date:'medium' }}</td>
                <td>
                  <span class="status-pill" [class]="getStatusClass(invite.status)">
                    {{ invite.status }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Custom Send Invite Modal -->
      <div class="modal-overlay" *ngIf="showInviteModal">
        <div class="modal-card animate-fade">
          <div class="modal-header">
            <h3>Issue Onboarding Invitation</h3>
            <button type="button" class="close-modal-btn" (click)="showInviteModal = false">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
          <div class="modal-body">
            <div style="display:flex; flex-direction:column; gap:16px;">
              <div>
                <label class="form-label">Email Address</label>
                <input
                  type="email"
                  class="form-control"
                  placeholder="name@organization.com"
                  [(ngModel)]="inviteEmail"
                />
              </div>
              <div>
                <label class="form-label">Pre-Assigned Workspace Role</label>
                <select class="form-control" [(ngModel)]="inviteRole">
                  <option value="Admin">Admin (CMS & Management)</option>
                  <option value="Editor">Editor (Content Authoring)</option>
                  <option value="Moderator">Moderator (Community Channels)</option>
                  <option value="Member">Member (Directory Access)</option>
                </select>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" (click)="showInviteModal = false">Cancel</button>
            <button type="button" class="btn btn-primary" (click)="sendInvitation()" [disabled]="isSending || !inviteEmail">
              <span class="material-symbols-outlined" *ngIf="!isSending">send</span>
              <span>{{ isSending ? 'Sending...' : 'Dispatch Invitation' }}</span>
            </button>
          </div>
        </div>
      </div>
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

    /* Modal Styling */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    .modal-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      width: 440px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.15);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .modal-header {
      padding: 18px 24px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: #0f172a;
    }
    .modal-header h3 {
      font-size: 15px;
      font-weight: 800;
      margin: 0;
    }
    .close-modal-btn {
      background: transparent;
      border: none;
      color: #64748b;
      cursor: pointer;
    }
    .modal-body {
      padding: 20px 24px;
    }
    .modal-footer {
      padding: 16px 24px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      background: #f8fafc;
    }
    .animate-fade {
      animation: fadeIn 0.2s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.97); }
      to { opacity: 1; transform: scale(1); }
    }
  `]
})
export class IdentityInvitationsComponent implements OnInit {
  isLoading = false;
  isSending = false;
  invitations: any[] = [];

  showInviteModal = false;
  inviteEmail = '';
  inviteRole = 'Member';

  headerButtons: PageHeaderButton[] = [
    {
      text: 'Send Onboarding Invite',
      icon: 'send',
      isPrimary: true,
      action: () => { this.showInviteModal = true; }
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

  sendInvitation(): void {
    if (!this.inviteEmail) return;
    this.isSending = true;

    this.api.post<any>('IdentityApi/invitations', {
      email: this.inviteEmail,
      role: this.inviteRole
    }).subscribe({
      next: () => {
        this.isSending = false;
        this.showInviteModal = false;
        this.toast.success(`Invitation sent successfully to ${this.inviteEmail}!`, 'Invitation Sent');
        this.inviteEmail = '';
        this.loadInvitations();
      },
      error: (err) => {
        this.isSending = false;
        this.toast.error(err?.error?.message || 'Failed to send invitation.', 'Onboarding Error');
      }
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
