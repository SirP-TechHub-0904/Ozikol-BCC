import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { WorkforceService } from '../../../core/services/workforce.service';
import { ToastService } from '../../../core/services/toast.service';

/**
 * Staff Member Workforce Message Desk & Support Tickets (`/workforce/workspace/messages`).
 * Allows staff members to raise topics/inquiries to Administrators and reply to open threads.
 * Closed tickets (closed by Admin or automatically after 48 hours of inactivity) are read-only
 * unless an Administrator re-opens them.
 */
@Component({
  selector: 'app-workforce-my-messages',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="bcp-page-container">
      <!-- 1. Canonical Dashboard Page Header -->
      <div class="page-header">
        <div class="header-left">
          <div class="breadcrumb">
            <a routerLink="/dashboard/workspace">My Workspace</a>
            <span class="sep">/</span>
            <a routerLink="/workforce/workspace/my-shifts">Shift &amp; Rota</a>
            <span class="sep">/</span>
            <span class="current">Messages &amp; Support Tickets</span>
          </div>
          <div class="title-row">
            <h1>Messages &amp; Admin Support Desk</h1>
            <span class="badge-suite">Workforce Workspace</span>
          </div>
          <p class="subtitle">
            Raise topics or inquiries to administrators and view follow-up threads. Tickets automatically close after 48 hours of inactivity.
          </p>
        </div>
        <div class="header-actions">
          <button type="button" class="btn btn-outline" (click)="loadMyTickets()">
            <span class="material-symbols-outlined" [class.spin]="isLoading">refresh</span>
            <span>Refresh</span>
          </button>
          <a routerLink="/workforce/workspace/my-shifts" class="btn btn-outline">
            <span class="material-symbols-outlined">calendar_month</span>
            <span>My Shifts</span>
          </a>
          <button type="button" class="btn btn-primary" (click)="openRaiseTopicModal()">
            <span class="material-symbols-outlined">add_comment</span>
            <span>+ Raise New Topic</span>
          </button>
        </div>
      </div>

      <!-- 2. Split View: My Tickets List + Conversation View -->
      <div class="desk-grid">
        <!-- Left Column: Ticket List -->
        <div class="tickets-list-card">
          <div class="list-header">
            <h3>My Topics &amp; Tickets ({{ tickets.length }})</h3>
            <div class="filter-pills">
              <button type="button" class="f-pill" [class.active]="statusFilter === ''" (click)="statusFilter = ''">All</button>
              <button type="button" class="f-pill" [class.active]="statusFilter === 'Open'" (click)="statusFilter = 'Open'">Open</button>
              <button type="button" class="f-pill" [class.active]="statusFilter === 'Closed'" (click)="statusFilter = 'Closed'">Closed</button>
            </div>
          </div>

          <div class="empty-list" *ngIf="!isLoading && filteredTickets.length === 0">
            <span class="material-symbols-outlined">forum</span>
            <h4>No Message Topics Yet</h4>
            <p>Need help with a shift, timesheet, or compliance document? Click "+ Raise New Topic" to message an administrator.</p>
            <button type="button" class="btn btn-primary" (click)="openRaiseTopicModal()">
              <span class="material-symbols-outlined">add_comment</span>
              <span>+ Raise New Topic</span>
            </button>
          </div>

          <div class="tickets-items" *ngIf="filteredTickets.length > 0">
            <div
              *ngFor="let t of filteredTickets; let i = index"
              class="ticket-item"
              [class.active]="activeTicket?.id === t.id"
              (click)="selectTicket(t)"
            >
              <div class="ti-top">
                <span class="sn-tag">#{{ i + 1 }} &bull; {{ t.ticketNumber }}</span>
                <span class="status-pill status-open" *ngIf="t.status === 'Open'">● Open</span>
                <span class="status-pill status-autoclosed" *ngIf="t.status === 'Closed' && t.closedReason === 'AutoClosed48h'">Auto-Closed (48h+)</span>
                <span class="status-pill status-closed" *ngIf="t.status === 'Closed' && t.closedReason !== 'AutoClosed48h'">Closed</span>
              </div>
              <strong class="ti-topic">{{ t.topic }}</strong>
              <div class="ti-meta">
                <span class="cat-badge">{{ t.category }}</span>
                <span class="ti-time">{{ t.lastActivityUtc | date:'d MMM y, HH:mm' }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Column: Active Conversation Thread -->
        <div class="conversation-card" *ngIf="activeTicket">
          <div class="conv-header">
            <div>
              <div class="conv-badges">
                <span class="sn-tag">{{ activeTicket.ticketNumber }}</span>
                <span class="cat-badge">{{ activeTicket.category }}</span>
                <span class="status-pill status-open" *ngIf="activeTicket.status === 'Open'">● Open</span>
                <span class="status-pill status-autoclosed" *ngIf="activeTicket.status === 'Closed' && activeTicket.closedReason === 'AutoClosed48h'">Auto-Closed (2+ Days Inactive)</span>
                <span class="status-pill status-closed" *ngIf="activeTicket.status === 'Closed' && activeTicket.closedReason !== 'AutoClosed48h'">Closed by Admin</span>
              </div>
              <h3>{{ activeTicket.topic }}</h3>
              <p class="conv-sub" *ngIf="activeTicket.relatedShiftLabel">
                Related Shift: <strong>{{ activeTicket.relatedShiftLabel }}</strong>
              </p>
            </div>
          </div>

          <div class="conv-messages">
            <div
              *ngFor="let r of activeTicket.replies"
              class="msg-row"
              [class.mine]="r.senderRole !== 'Admin'"
              [class.admin]="r.senderRole === 'Admin'"
            >
              <div class="msg-card">
                <div class="msg-head">
                  <strong>{{ r.senderName }}</strong>
                  <span class="role-badge" [class.admin]="r.senderRole === 'Admin'">{{ r.senderRole }}</span>
                  <span class="msg-date">{{ r.sentUtc | date:'d MMM y, HH:mm' }}</span>
                </div>
                <div class="msg-body">{{ r.message }}</div>
              </div>
            </div>
          </div>

          <!-- Open Ticket Reply Composer -->
          <div class="conv-composer" *ngIf="activeTicket.status === 'Open'">
            <textarea
              rows="3"
              class="form-control"
              [(ngModel)]="replyText"
              placeholder="Write a follow-up message to the administrator..."
            ></textarea>
            <div class="composer-footer">
              <span class="auto-close-note">
                <span class="material-symbols-outlined">schedule</span>
                Tickets automatically close after 48 hours of no activity.
              </span>
              <button
                type="button"
                class="btn btn-primary"
                [disabled]="isSending || !replyText.trim()"
                (click)="submitReply()"
              >
                <span class="material-symbols-outlined">send</span>
                <span>{{ isSending ? 'Sending...' : 'Send Reply' }}</span>
              </button>
            </div>
          </div>

          <!-- Closed Ticket Lock Banner (Staff cannot re-open) -->
          <div class="conv-locked-banner" *ngIf="activeTicket.status === 'Closed'">
            <span class="material-symbols-outlined">lock</span>
            <div>
              <strong>This ticket is closed ({{ activeTicket.closedReason === 'AutoClosed48h' ? 'over 2 days of inactivity' : 'closed by administrator' }})</strong>
              <p>You cannot reply to a closed ticket unless an administrator re-opens it. If you need further assistance, please raise a new topic.</p>
            </div>
            <button type="button" class="btn btn-primary" (click)="openRaiseTopicModal()">
              + Raise New Topic
            </button>
          </div>
        </div>
      </div>

      <!-- 3. Raise New Topic Modal -->
      <div class="modal-backdrop" *ngIf="showRaiseModal" (click)="showRaiseModal = false">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <span class="material-symbols-outlined text-blue">add_comment</span>
            <h3>Raise New Topic to Administrator</h3>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Topic Category</label>
              <select class="form-control" [(ngModel)]="newTopicForm.category">
                <option *ngFor="let c of categories" [value]="c">{{ c }}</option>
              </select>
            </div>

            <div class="form-group" *ngIf="myShifts.length > 0">
              <label class="form-label">Related Shift (Optional)</label>
              <select class="form-control" [(ngModel)]="newTopicForm.relatedShiftLabel">
                <option value="">-- Not tied to a specific shift --</option>
                <option *ngFor="let s of myShifts" [value]="(s.shiftCode || 'Shift') + ' • ' + (s.siteName || '') + ' (' + (s.startsAtUtc | date:'d MMM y') + ')'">
                  {{ s.shiftCode }} &bull; {{ s.siteName }} ({{ s.startsAtUtc | date:'d MMM y, HH:mm' }})
                </option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Topic / Subject <span class="req">*</span></label>
              <input
                type="text"
                class="form-control"
                [(ngModel)]="newTopicForm.topic"
                placeholder="e.g. Question regarding Friday night shift hours"
              />
            </div>

            <div class="form-group">
              <label class="form-label">Message <span class="req">*</span></label>
              <textarea
                rows="4"
                class="form-control"
                [(ngModel)]="newTopicForm.message"
                placeholder="Describe your inquiry or follow-up details clearly..."
              ></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" (click)="showRaiseModal = false">Cancel</button>
            <button type="button" class="btn btn-primary" [disabled]="isCreating" (click)="submitNewTopic()">
              <span class="material-symbols-outlined">send</span>
              <span>{{ isCreating ? 'Submitting...' : 'Submit Topic' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .bcp-page-container { display: flex; flex-direction: column; gap: 18px; padding: 0 4px 40px 4px; width: 100%; }
    .page-header { display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; background: #ffffff; padding: 18px 22px; border-radius: 14px; border: 1px solid #e2e8f0; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02); }
    .header-left { display: flex; flex-direction: column; gap: 6px; }
    .breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #64748b; }
    .breadcrumb a { color: #0050e5; text-decoration: none; font-weight: 600; }
    .breadcrumb .current { color: #0f172a; font-weight: 600; }
    .title-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .title-row h1 { margin: 0; font-size: 24px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; }
    .subtitle { margin: 0; font-size: 13.5px; color: #64748b; }
    .badge-suite { background: #eff6ff; color: #0050e5; border: 1px solid #bfdbfe; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 999px; text-transform: uppercase; }
    .header-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

    .btn { display: inline-flex; align-items: center; justify-content: center; gap: 5px; height: 34px; padding: 0 12px; border-radius: 8px; font-size: 12px; font-weight: 600; white-space: nowrap; flex-shrink: 0; cursor: pointer; text-decoration: none; border: 1px solid transparent; transition: all 0.15s ease; }
    .btn .material-symbols-outlined { font-size: 16px; }
    .btn-primary { background: #0050e5; color: #ffffff; }
    .btn-primary:hover { background: #003bb5; }
    .btn-outline { background: #ffffff; color: #334155; border-color: #cbd5e1; }
    .btn-outline:hover { background: #f8fafc; border-color: #94a3b8; }

    .desk-grid { display: grid; grid-template-columns: 360px 1fr; gap: 16px; align-items: start; }
    @media (max-width: 960px) {
      .desk-grid { grid-template-columns: 1fr; }
    }

    .tickets-list-card, .conversation-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      overflow: hidden;
    }
    .list-header { padding: 14px 16px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
    .list-header h3 { margin: 0; font-size: 14.5px; font-weight: 800; color: #0f172a; }
    .filter-pills { display: inline-flex; background: #f1f5f9; padding: 2px; border-radius: 8px; gap: 2px; }
    .f-pill { border: none; background: transparent; padding: 4px 10px; border-radius: 6px; font-size: 11.5px; font-weight: 700; color: #475569; cursor: pointer; }
    .f-pill.active { background: #0050e5; color: #ffffff; }

    .empty-list { padding: 40px 20px; text-align: center; color: #64748b; display: flex; flex-direction: column; align-items: center; gap: 10px; }
    .empty-list .material-symbols-outlined { font-size: 40px; color: #94a3b8; }
    .empty-list h4 { margin: 0; font-size: 15px; color: #0f172a; }
    .empty-list p { margin: 0; font-size: 12.5px; }

    .tickets-items { display: flex; flex-direction: column; max-height: 560px; overflow-y: auto; }
    .ticket-item { padding: 14px 16px; border-bottom: 1px solid #f1f5f9; cursor: pointer; display: flex; flex-direction: column; gap: 6px; transition: background 0.14s ease; }
    .ticket-item:hover { background: #f8fafc; }
    .ticket-item.active { background: #eff6ff; border-left: 4px solid #0050e5; }
    .ti-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .sn-tag { font-family: monospace; font-size: 11px; font-weight: 800; color: #334155; background: #f1f5f9; padding: 2px 7px; border-radius: 5px; }
    .ti-topic { font-size: 13.5px; color: #0f172a; }
    .ti-meta { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .cat-badge { font-size: 10.5px; font-weight: 700; background: #eff6ff; color: #0050e5; padding: 2px 7px; border-radius: 6px; }
    .ti-time { font-size: 11px; color: #64748b; }

    .status-pill { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 999px; font-size: 10.5px; font-weight: 800; }
    .status-open { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
    .status-closed { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }
    .status-autoclosed { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }

    .conv-header { padding: 16px 20px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
    .conv-badges { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap; }
    .conv-header h3 { margin: 0; font-size: 17px; font-weight: 800; color: #0f172a; }
    .conv-sub { margin: 4px 0 0 0; font-size: 12px; color: #475569; }

    .conv-messages { padding: 18px 20px; max-height: 430px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; }
    .msg-row { display: flex; flex-direction: column; max-width: 85%; }
    .msg-row.mine { align-self: flex-end; }
    .msg-row.admin { align-self: flex-start; }
    .msg-card { padding: 12px 14px; border-radius: 12px; background: #eff6ff; border: 1px solid #bfdbfe; color: #0f172a; }
    .msg-row.admin .msg-card { background: #f8fafc; border-color: #e2e8f0; }
    .msg-head { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #475569; margin-bottom: 5px; }
    .role-badge { font-size: 9.5px; font-weight: 800; text-transform: uppercase; padding: 1px 6px; border-radius: 999px; background: #e2e8f0; color: #334155; }
    .role-badge.admin { background: #0050e5; color: #ffffff; }
    .msg-date { margin-left: auto; color: #64748b; }
    .msg-body { font-size: 13px; line-height: 1.5; white-space: pre-wrap; }

    .conv-composer { padding: 14px 20px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 10px; }
    .composer-footer { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
    .auto-close-note { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; color: #64748b; }
    .auto-close-note .material-symbols-outlined { font-size: 15px; color: #0050e5; }

    .conv-locked-banner {
      padding: 16px 20px;
      background: #fffbeb;
      border-top: 1px solid #fde68a;
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      color: #92400e;
      font-size: 12.5px;
    }
    .conv-locked-banner .material-symbols-outlined { font-size: 24px; color: #d97706; }
    .conv-locked-banner div { flex: 1; min-width: 200px; }
    .conv-locked-banner p { margin: 2px 0 0 0; }

    .form-group { margin-bottom: 14px; }
    .form-label { display: block; font-size: 12.5px; font-weight: 700; color: #334155; margin-bottom: 5px; }
    .req { color: #dc2626; }
    .form-control { width: 100%; box-sizing: border-box; padding: 9px 12px; font-size: 13px; border: 1px solid #cbd5e1; border-radius: 8px; background: #ffffff; color: #0f172a; outline: none; }
    .form-control:focus { border-color: #0050e5; box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.1); }
    .text-blue { color: #0050e5; }

    .modal-backdrop { position: fixed; inset: 0; background: rgba(15,23,42,0.45); display: flex; align-items: center; justify-content: center; z-index: 1200; padding: 16px; }
    .modal-card { background: #ffffff; border-radius: 14px; max-width: 520px; width: 100%; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.15); overflow: hidden; }
    .modal-header { display: flex; align-items: center; gap: 10px; padding: 18px 22px; border-bottom: 1px solid #f1f5f9; }
    .modal-header h3 { margin: 0; font-size: 16px; font-weight: 700; color: #0f172a; }
    .modal-body { padding: 20px 22px; font-size: 13.5px; color: #334155; }
    .modal-footer { padding: 14px 22px; background: #f8fafc; border-top: 1px solid #f1f5f9; display: flex; justify-content: flex-end; gap: 10px; }

    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { 100% { transform: rotate(360deg); } }
  `]
})
export class WorkforceMyMessagesComponent implements OnInit {
  tickets: any[] = [];
  myShifts: any[] = [];
  activeTicket: any = null;
  statusFilter = '';

  isLoading = false;
  isSending = false;
  isCreating = false;
  showRaiseModal = false;

  replyText = '';
  categories = [
    'Shift Inquiry',
    'Payroll & Hours',
    'Site / Equipment Issue',
    'Compliance Follow-Up',
    'General Inquiry'
  ];

  newTopicForm = {
    category: 'Shift Inquiry',
    relatedShiftLabel: '',
    topic: '',
    message: ''
  };

  constructor(
    private readonly workforceService: WorkforceService,
    private readonly toast: ToastService
  ) {}

  ngOnInit(): void {
    this.loadMyTickets();
    this.loadMyShifts();
  }

  get filteredTickets(): any[] {
    if (!this.statusFilter) return this.tickets;
    return this.tickets.filter(t => t.status === this.statusFilter);
  }

  loadMyTickets(): void {
    this.isLoading = true;
    this.workforceService.getMyMessages().subscribe({
      next: (res: any) => {
        this.isLoading = false;
        this.tickets = Array.isArray(res?.data) ? res.data : [];
        if (this.activeTicket) {
          this.activeTicket = this.tickets.find(t => t.id === this.activeTicket.id) || this.tickets[0] || null;
        } else if (this.tickets.length > 0) {
          this.activeTicket = this.tickets[0];
        }
      },
      error: () => {
        this.isLoading = false;
        this.toast.error('Failed to load your message topics.');
      }
    });
  }

  loadMyShifts(): void {
    this.workforceService.getMyShifts().subscribe({
      next: (res: any) => {
        this.myShifts = Array.isArray(res?.data) ? res.data : [];
      },
      error: () => {}
    });
  }

  selectTicket(ticket: any): void {
    this.activeTicket = ticket;
    this.replyText = '';
  }

  openRaiseTopicModal(): void {
    this.newTopicForm = {
      category: 'Shift Inquiry',
      relatedShiftLabel: '',
      topic: '',
      message: ''
    };
    this.showRaiseModal = true;
  }

  submitNewTopic(): void {
    if (!this.newTopicForm.topic.trim() || !this.newTopicForm.message.trim()) {
      this.toast.error('Please enter both a topic subject and your message.');
      return;
    }

    this.isCreating = true;
    this.workforceService.createMessageTicket({
      category: this.newTopicForm.category,
      relatedShiftLabel: this.newTopicForm.relatedShiftLabel || null,
      topic: this.newTopicForm.topic.trim(),
      message: this.newTopicForm.message.trim()
    }).subscribe({
      next: (res: any) => {
        this.isCreating = false;
        this.showRaiseModal = false;
        this.toast.success('Your topic has been submitted to the administrator.');
        this.loadMyTickets();
        if (res?.data) {
          this.activeTicket = res.data;
        }
      },
      error: (err: any) => {
        this.isCreating = false;
        this.toast.error(err?.error?.message || 'Failed to submit topic.');
      }
    });
  }

  submitReply(): void {
    if (!this.activeTicket || !this.replyText.trim()) return;
    this.isSending = true;
    this.workforceService.replyToMessageTicket(this.activeTicket.id, {
      message: this.replyText.trim(),
      senderRole: 'Staff'
    }).subscribe({
      next: (res: any) => {
        this.isSending = false;
        this.replyText = '';
        this.toast.success('Follow-up message sent.');
        if (res?.data) {
          this.activeTicket = res.data;
        }
        this.loadMyTickets();
      },
      error: (err: any) => {
        this.isSending = false;
        this.toast.error(err?.error?.message || 'Failed to send reply.');
        this.loadMyTickets();
      }
    });
  }
}
