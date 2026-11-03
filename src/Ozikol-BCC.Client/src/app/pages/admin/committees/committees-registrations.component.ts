import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { PageHeaderComponent, PageHeaderButton } from '../../../shared/components/page-header/page-header.component';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { ToastService } from '../../../core/services/toast.service';
import { CommitteesService, CommitteeAliases } from '../../../core/services/committees.service';

/**
 * Administrator Intake & Applicant Queue (A5) for bcp-committees.
 * Reviews applications from External Public Registration Links and moderated Member Workspace join requests.
 */
@Component({
  selector: 'app-committees-registrations',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent, TranslatePipe],
  template: `
    <div class="comm-page">
      <app-page-header
        [eyebrow]="'committees.eyebrow' | translate:'PEOPLE & COMMUNITY'"
        icon="how_to_reg"
        [title]="aliases.aliasSingular + ' ' + ('committees.registrations' | translate:'Registrations & Intake')"
        [subtitle]="'Review external link registrants and internal join requests, inspect Extra-Info answers, and approve or reassign in one click.'"
        [buttons]="headerButtons"
        [loading]="loading"
      ></app-page-header>

      <div class="comm-subnav">
        <a routerLink="/committees/console/dashboard" class="comm-subnav-link">
          <span class="material-symbols-outlined">space_dashboard</span>
          <span>{{ aliases.aliasSingular }} {{ 'committees.dashboard' | translate:'Dashboard' }}</span>
        </a>
        <a routerLink="/committees/console/manage" class="comm-subnav-link">
          <span class="material-symbols-outlined">groups</span>
          <span>{{ 'committees.manage' | translate:'Manage' }} {{ aliases.aliasPlural }}</span>
        </a>
        <a routerLink="/committees/console/registrations" class="comm-subnav-link active">
          <span class="material-symbols-outlined">how_to_reg</span>
          <span>{{ 'committees.registrations' | translate:'Registrations & Intake' }}</span>
        </a>
        <a routerLink="/committees/console/reports" class="comm-subnav-link">
          <span class="material-symbols-outlined">assignment</span>
          <span>{{ 'committees.reports_docs' | translate:'Meeting Reports & Docs' }}</span>
        </a>
        <a routerLink="/committees/console/forms" class="comm-subnav-link">
          <span class="material-symbols-outlined">dynamic_form</span>
          <span>{{ 'committees.extra_forms' | translate:'Extra-Info Forms' }}</span>
        </a>
        <a routerLink="/committees/console/settings" class="comm-subnav-link">
          <span class="material-symbols-outlined">tune</span>
          <span>{{ aliases.aliasSingular }} {{ 'committees.settings' | translate:'Settings' }}</span>
        </a>
      </div>

      <div class="filter-row">
        <div class="pill-tabs">
          <button type="button" [class.active]="statusFilter === 'Pending'" (click)="setStatus('Pending')">Pending</button>
          <button type="button" [class.active]="statusFilter === 'Approved'" (click)="setStatus('Approved')">Approved</button>
          <button type="button" [class.active]="statusFilter === 'Declined'" (click)="setStatus('Declined')">Declined</button>
          <button type="button" [class.active]="statusFilter === 'All'" (click)="setStatus('All')">All</button>
        </div>

        <select [(ngModel)]="committeeFilter" (change)="loadRegistrations()" class="select-ctrl">
          <option value="">All {{ aliases.aliasPlural }}</option>
          <option *ngFor="let c of committees" [value]="c.id">{{ c.name }}</option>
        </select>
      </div>

      <div class="reg-list" *ngIf="registrations.length > 0">
        <div class="reg-card" *ngFor="let reg of registrations">
          <div class="reg-main">
            <div class="reg-avatar">{{ (reg.firstName || 'A')[0] }}</div>
            <div class="reg-info">
              <div class="reg-top-line">
                <h4>{{ reg.fullName }}</h4>
                <span class="src-badge" [class.ext]="reg.isExternalApplicant">
                  {{ reg.isExternalApplicant ? 'External Link' : 'Workspace Member' }}
                </span>
                <span class="status-badge" [ngClass]="'st-' + reg.status.toLowerCase()">{{ reg.status }}</span>
              </div>
              <div class="reg-sub">
                <span>{{ reg.email }}</span>
                <span *ngIf="reg.phoneNumber">• {{ reg.phoneNumber }}</span>
                <span>• Target {{ aliases.aliasSingular }}: <strong>{{ reg.committeeName }}</strong></span>
                <span>• {{ reg.submittedAt | date:'medium' }}</span>
              </div>

              <!-- Extra Info Answers -->
              <div class="extra-answers" *ngIf="objectEntries(reg.extraInfoResponses).length > 0">
                <div class="ans-chip" *ngFor="let kv of objectEntries(reg.extraInfoResponses)">
                  <strong>{{ kv[0] }}:</strong> {{ formatAnswer(kv[1]) }}
                </div>
              </div>

              <!-- Attachments -->
              <div class="att-row" *ngIf="reg.attachmentUrls?.length > 0">
                <a *ngFor="let url of reg.attachmentUrls; let idx = index" [href]="url" target="_blank" rel="noopener" class="att-link">
                  <span class="material-symbols-outlined">attach_file</span> Attachment #{{ idx + 1 }}
                </a>
              </div>
            </div>
          </div>

          <div class="reg-actions" *ngIf="reg.status === 'Pending'">
            <button type="button" class="btn-approve" (click)="decide(reg, 'Approve')">
              <span class="material-symbols-outlined">check</span>
              <span>{{ 'committees.approve' | translate:'Approve' }}</span>
            </button>
            <button type="button" class="btn-secondary-sm" (click)="openReassignModal(reg)">
              <span class="material-symbols-outlined">swap_horiz</span>
              <span>{{ 'committees.reassign' | translate:'Reassign' }}</span>
            </button>
            <button type="button" class="btn-decline" (click)="decide(reg, 'Decline')">
              <span class="material-symbols-outlined">close</span>
              <span>{{ 'committees.decline' | translate:'Decline' }}</span>
            </button>
          </div>
        </div>
      </div>

      <div class="empty-card" *ngIf="registrations.length === 0 && !loading">
        <span class="material-symbols-outlined">inbox</span>
        <h3>No {{ statusFilter !== 'All' ? statusFilter : '' }} Registrations</h3>
        <p>Share your external registration link to receive new applications.</p>
      </div>

      <!-- Reassign Modal -->
      <div class="modal-backdrop" *ngIf="reassignTarget" (click)="reassignTarget = null">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-head">
            <h3>Reassign & Approve — {{ reassignTarget.fullName }}</h3>
          </div>
          <div class="modal-body">
            <label>Select Target {{ aliases.aliasSingular }}</label>
            <select [(ngModel)]="reassignCommitteeId" class="select-ctrl">
              <option *ngFor="let c of committees" [value]="c.id">{{ c.name }}</option>
            </select>
            <label>Reviewer Note (Optional)</label>
            <input type="text" [(ngModel)]="reassignNote" placeholder="e.g. Placed in Technical Sub-Group based on skills" class="select-ctrl" />
          </div>
          <div class="modal-foot">
            <button type="button" class="btn-secondary-sm" (click)="reassignTarget = null">Cancel</button>
            <button type="button" class="btn-approve" (click)="confirmReassign()">Approve &amp; Enroll</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .comm-page { display: flex; flex-direction: column; gap: 20px; }
    .comm-subnav {
      display: flex; flex-wrap: wrap; gap: 8px; background: #ffffff;
      border: 1px solid #e2e8f0; border-radius: 12px; padding: 8px;
    }
    :host-context(.dark-mode) .comm-subnav { background: #1e293b; border-color: rgba(255,255,255,0.08); }
    .comm-subnav-link {
      display: inline-flex; align-items: center; gap: 7px; padding: 8px 14px;
      border-radius: 8px; font-size: 13px; font-weight: 600; color: #475569; text-decoration: none;
    }
    :host-context(.dark-mode) .comm-subnav-link { color: #cbd5e1; }
    .comm-subnav-link.active { background: #0050e5; color: #ffffff; }

    .filter-row { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
    .pill-tabs { display: flex; gap: 6px; background: #ffffff; padding: 5px; border-radius: 10px; border: 1px solid #e2e8f0; }
    :host-context(.dark-mode) .pill-tabs { background: #1e293b; border-color: rgba(255,255,255,0.08); }
    .pill-tabs button {
      border: none; background: transparent; padding: 7px 14px; border-radius: 7px;
      font-size: 12.5px; font-weight: 600; color: #64748b; cursor: pointer;
    }
    .pill-tabs button.active { background: #0050e5; color: #ffffff; }
    .select-ctrl { padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; background: #ffffff; }

    .reg-list { display: flex; flex-direction: column; gap: 12px; }
    .reg-card, .empty-card {
      background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px;
      display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap;
    }
    :host-context(.dark-mode) .reg-card, :host-context(.dark-mode) .empty-card { background: #1e293b; border-color: rgba(255,255,255,0.08); }
    .empty-card { flex-direction: column; align-items: center; text-align: center; padding: 48px 20px; }
    .empty-card .material-symbols-outlined { font-size: 42px; color: #94a3b8; }

    .reg-main { display: flex; gap: 14px; flex: 1; min-width: 260px; }
    .reg-avatar {
      width: 42px; height: 42px; border-radius: 50%; background: rgba(0,80,229,0.12); color: #0050e5;
      font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .reg-info { display: flex; flex-direction: column; gap: 6px; flex: 1; }
    .reg-top-line { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .reg-top-line h4 { margin: 0; font-size: 15px; font-weight: 700; }
    .src-badge, .status-badge { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 999px; background: #f1f5f9; color: #475569; }
    .src-badge.ext { background: rgba(0,80,229,0.1); color: #0050e5; }
    .st-approved, .st-reassigned { background: #dcfce7; color: #166534; }
    .st-declined { background: #fee2e2; color: #b91c1c; }
    .reg-sub { display: flex; flex-wrap: wrap; gap: 8px; font-size: 12.5px; color: #64748b; }
    .extra-answers { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; }
    .ans-chip { font-size: 12px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 4px 10px; border-radius: 8px; }
    :host-context(.dark-mode) .ans-chip { background: #0f172a; border-color: rgba(255,255,255,0.1); }
    .att-row { display: flex; gap: 10px; flex-wrap: wrap; }
    .att-link { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 600; color: #0050e5; text-decoration: none; }

    .reg-actions { display: flex; gap: 8px; align-items: center; }
    .btn-approve {
      display: inline-flex; align-items: center; gap: 5px; background: #0050e5; color: #ffffff;
      border: none; border-radius: 8px; padding: 8px 14px; font-size: 12.5px; font-weight: 600; cursor: pointer;
    }
    .btn-secondary-sm {
      display: inline-flex; align-items: center; gap: 5px; background: #f1f5f9; color: #334155;
      border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 12px; font-size: 12.5px; font-weight: 600; cursor: pointer;
    }
    .btn-decline {
      display: inline-flex; align-items: center; gap: 5px; background: #fee2e2; color: #dc2626;
      border: 1px solid #fecaca; border-radius: 8px; padding: 8px 12px; font-size: 12.5px; font-weight: 600; cursor: pointer;
    }

    .modal-backdrop { position: fixed; inset: 0; background: rgba(15,23,42,0.55); z-index: 10200; display: flex; align-items: center; justify-content: center; padding: 16px; }
    .modal-card { background: #ffffff; border-radius: 16px; width: 100%; max-width: 440px; padding: 20px; display: flex; flex-direction: column; gap: 14px; }
    .modal-head h3 { margin: 0; font-size: 16px; }
    .modal-body { display: flex; flex-direction: column; gap: 8px; font-size: 13px; }
    .modal-foot { display: flex; justify-content: flex-end; gap: 8px; }
  `]
})
export class CommitteesRegistrationsComponent implements OnInit, OnDestroy {
  aliases: CommitteeAliases;
  loading = false;
  registrations: any[] = [];
  committees: any[] = [];
  statusFilter = 'Pending';
  committeeFilter = '';
  headerButtons: PageHeaderButton[] = [];

  reassignTarget: any = null;
  reassignCommitteeId = '';
  reassignNote = '';

  private sub?: Subscription;

  constructor(
    private committeesService: CommitteesService,
    private toast: ToastService
  ) {
    this.aliases = this.committeesService.currentAliases;
  }

  ngOnInit(): void {
    this.sub = this.committeesService.aliases$.subscribe((a) => { this.aliases = a; });
    this.headerButtons = [
      {
        text: 'Copy Public Intake Link',
        icon: 'share',
        isPrimary: true,
        action: () => {
          navigator.clipboard.writeText(this.committeesService.buildExternalRegistrationUrl());
          this.toast.success('External registration link copied.');
        }
      }
    ];
    this.committeesService.getManagedCommittees().subscribe({
      next: (res) => { if (res?.isSuccess) this.committees = res.data || []; }
    });
    this.loadRegistrations();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  setStatus(st: string): void {
    this.statusFilter = st;
    this.loadRegistrations();
  }

  loadRegistrations(): void {
    this.loading = true;
    this.committeesService.getRegistrations(this.committeeFilter || undefined, this.statusFilter).subscribe({
      next: (res) => {
        this.loading = false;
        if (res?.isSuccess) this.registrations = res.data || [];
      },
      error: () => { this.loading = false; }
    });
  }

  decide(reg: any, decision: 'Approve' | 'Decline'): void {
    this.committeesService.reviewRegistration(reg.id, { decision }).subscribe({
      next: () => {
        this.toast.success(`Application ${decision.toLowerCase()}d.`);
        this.loadRegistrations();
      },
      error: (err) => this.toast.error(err?.error?.message || 'Unable to process review.')
    });
  }

  openReassignModal(reg: any): void {
    this.reassignTarget = reg;
    this.reassignCommitteeId = reg.committeeId;
    this.reassignNote = '';
  }

  confirmReassign(): void {
    if (!this.reassignTarget) return;
    this.committeesService.reviewRegistration(this.reassignTarget.id, {
      decision: 'Reassign',
      reassignCommitteeId: this.reassignCommitteeId,
      reviewNotes: this.reassignNote
    }).subscribe({
      next: () => {
        this.toast.success('Applicant reassigned and enrolled.');
        this.reassignTarget = null;
        this.loadRegistrations();
      }
    });
  }

  objectEntries(obj: any): [string, any][] {
    return obj && typeof obj === 'object' ? Object.entries(obj) : [];
  }

  formatAnswer(v: any): string {
    return Array.isArray(v) ? v.join(', ') : String(v ?? '—');
  }
}

