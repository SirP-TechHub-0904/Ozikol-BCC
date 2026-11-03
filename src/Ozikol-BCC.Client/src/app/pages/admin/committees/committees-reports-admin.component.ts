import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { PageHeaderComponent, PageHeaderButton } from '../../../shared/components/page-header/page-header.component';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { ToastService } from '../../../core/services/toast.service';
import { CommitteesService, CommitteeAliases } from '../../../core/services/committees.service';

/**
 * Administrator Centralized Meeting Reports & Cloud Vault Reviewer (A6) for bcp-committees.
 * Supports reading typed minutes, attendance roll-calls, uploaded Excel/Word/PDFs, embedded Google Docs/Sheets/Notebooks,
 * 1-click Ozi AI Executive Digest synthesis, and official review remarks.
 */
@Component({
  selector: 'app-committees-reports-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent, TranslatePipe],
  template: `
    <div class="comm-page">
      <app-page-header
        [eyebrow]="'committees.eyebrow' | translate:'PEOPLE & COMMUNITY'"
        icon="assignment"
        [title]="aliases.aliasSingular + ' ' + ('committees.reports_docs' | translate:'Meeting Reports & Docs')"
        [subtitle]="'Review submitted meeting minutes, attendance roll-calls, uploaded spreadsheets, and connected Google Docs / Notebooks.'"
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
        <a routerLink="/committees/console/registrations" class="comm-subnav-link">
          <span class="material-symbols-outlined">how_to_reg</span>
          <span>{{ 'committees.registrations' | translate:'Registrations & Intake' }}</span>
        </a>
        <a routerLink="/committees/console/reports" class="comm-subnav-link active">
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
          <button type="button" [class.active]="reviewFilter === 'All'" (click)="setReviewFilter('All')">All Reports</button>
          <button type="button" [class.active]="reviewFilter === 'Submitted'" (click)="setReviewFilter('Submitted')">Needs Review</button>
          <button type="button" [class.active]="reviewFilter === 'Reviewed'" (click)="setReviewFilter('Reviewed')">Reviewed</button>
          <button type="button" [class.active]="reviewFilter === 'ActionNeeded'" (click)="setReviewFilter('ActionNeeded')">Action Needed</button>
        </div>

        <select [(ngModel)]="committeeFilter" (change)="loadReports()" class="select-ctrl">
          <option value="">All {{ aliases.aliasPlural }}</option>
          <option *ngFor="let c of committees" [value]="c.id">{{ c.name }}</option>
        </select>
      </div>

      <div class="master-detail-grid" *ngIf="reports.length > 0">
        <!-- Left List -->
        <div class="report-list">
          <div
            class="report-list-item"
            *ngFor="let r of reports"
            [class.active]="selectedReport?.id === r.id"
            (click)="selectReport(r)"
          >
            <div class="rl-top">
              <span class="rl-group">{{ r.committeeName }}</span>
              <span class="rl-status" [ngClass]="'st-' + r.reviewStatus.toLowerCase()">{{ r.reviewStatus }}</span>
            </div>
            <h4>{{ r.title }}</h4>
            <div class="rl-meta">
              <span>{{ r.meetingDate | date:'mediumDate' }}</span>
              <span>• {{ r.submittedByName }}</span>
              <span>• {{ r.presentCount }} Present</span>
            </div>
          </div>
        </div>

        <!-- Right Reader & Reviewer -->
        <div class="report-reader" *ngIf="selectedReport">
          <div class="reader-head">
            <div>
              <span class="reader-kicker">{{ selectedReport.committeeName }} • {{ selectedReport.meetingDate | date:'fullDate' }}</span>
              <h2>{{ selectedReport.title }}</h2>
              <p class="reader-byline">Submitted by {{ selectedReport.submittedByName }} • Attendance: <strong>{{ selectedReport.presentCount }} Present</strong>, {{ selectedReport.excusedCount }} Excused, {{ selectedReport.absentCount }} Absent</p>
            </div>
            <button type="button" class="btn-ai" (click)="summarizeWithAi()" [disabled]="generatingAi">
              <span class="material-symbols-outlined">auto_awesome</span>
              <span>{{ generatingAi ? 'Synthesizing...' : ('committees.summarize_ozi_ai' | translate:'Summarize with Ozi AI') }}</span>
            </button>
          </div>

          <!-- Ozi AI Executive Digest -->
          <div class="ai-digest-box" *ngIf="selectedReport.aiExecutiveDigest">
            <div class="ai-head">
              <span class="material-symbols-outlined">smart_toy</span>
              <strong>Ozi AI Executive Digest</strong>
            </div>
            <pre class="ai-pre">{{ selectedReport.aiExecutiveDigest }}</pre>
          </div>

          <!-- Summary & Typed Minutes -->
          <div class="sec-block" *ngIf="selectedReport.summary">
            <h4>Executive Summary</h4>
            <p>{{ selectedReport.summary }}</p>
          </div>

          <div class="sec-block" *ngIf="selectedReport.richMinutesContent">
            <h4>Meeting Minutes & Proceedings</h4>
            <div class="minutes-body">{{ selectedReport.richMinutesContent }}</div>
          </div>

          <div class="sec-block" *ngIf="selectedReport.decisionsText">
            <h4>Key Decisions & Resolutions</h4>
            <p>{{ selectedReport.decisionsText }}</p>
          </div>

          <!-- Action Items -->
          <div class="sec-block" *ngIf="selectedReport.actionItems?.length > 0">
            <h4>Follow-Up Action Items</h4>
            <div class="action-item-row" *ngFor="let a of selectedReport.actionItems">
              <span class="material-symbols-outlined">task_alt</span>
              <div>
                <strong>{{ a.task }}</strong>
                <span *ngIf="a.assigneeName"> — Assigned to {{ a.assigneeName }}</span>
                <span *ngIf="a.dueDate"> (Due: {{ a.dueDate }})</span>
              </div>
            </div>
          </div>

          <!-- Connected Google Docs / Sheets / Notebooks -->
          <div class="sec-block" *ngIf="selectedReport.cloudLinks?.length > 0">
            <h4>Connected Google Docs, Sheets & Cloud Notebooks</h4>
            <div class="cloud-links-wrap">
              <div class="cloud-link-card" *ngFor="let cl of selectedReport.cloudLinks">
                <span class="material-symbols-outlined">{{ getProviderIcon(cl.provider) }}</span>
                <div style="flex:1; min-width:0;">
                  <div class="cl-title">{{ cl.title || 'Cloud Document' }}</div>
                  <div class="cl-sub">{{ cl.provider || 'CloudLink' }}</div>
                </div>
                <button type="button" class="btn-secondary-xs" (click)="previewCloudUrl(cl.url)">Preview Inline</button>
                <a [href]="cl.url" target="_blank" rel="noopener" class="btn-primary-xs">Open Live</a>
              </div>
            </div>

            <div class="iframe-preview-wrap" *ngIf="safePreviewUrl">
              <div class="iframe-bar">
                <span>Live Cloud Document Preview</span>
                <button type="button" class="btn-secondary-xs" (click)="safePreviewUrl = null">Close Preview</button>
              </div>
              <iframe [src]="safePreviewUrl" class="cloud-iframe"></iframe>
            </div>
          </div>

          <!-- Uploaded Files -->
          <div class="sec-block" *ngIf="selectedReport.uploadedFiles?.length > 0">
            <h4>Uploaded Static Files ({{ selectedReport.uploadedFiles.length }})</h4>
            <div class="files-row">
              <a *ngFor="let f of selectedReport.uploadedFiles" [href]="f.fileUrl" target="_blank" rel="noopener" class="file-chip">
                <span class="material-symbols-outlined">attach_file</span>
                <span>{{ f.fileName }}</span>
              </a>
            </div>
          </div>

          <!-- Admin Official Review Box -->
          <div class="review-box">
            <h4>Administrator Review & Remarks</h4>
            <div class="review-controls">
              <select [(ngModel)]="reviewStatusInput" class="select-ctrl">
                <option value="Reviewed">Mark as Reviewed &amp; Acknowledged</option>
                <option value="ActionNeeded">Flag as Action Needed</option>
                <option value="Submitted">Keep as Submitted</option>
              </select>
              <input type="text" [(ngModel)]="adminRemarksInput" placeholder="Add official remarks or follow-up guidance for the group leader..." class="remarks-input" />
              <button type="button" class="btn-primary-sm" (click)="saveReview()">Save Review</button>
            </div>
          </div>
        </div>
      </div>

      <div class="empty-card" *ngIf="reports.length === 0 && !loading">
        <span class="material-symbols-outlined">assignment</span>
        <h3>No Meeting Reports Found</h3>
        <p>Submitted reports, uploaded Excel/Word files, and linked Google Docs will appear here automatically.</p>
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

    .filter-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
    .pill-tabs { display: flex; gap: 6px; background: #ffffff; padding: 5px; border-radius: 10px; border: 1px solid #e2e8f0; }
    .pill-tabs button { border: none; background: transparent; padding: 7px 14px; border-radius: 7px; font-size: 12.5px; font-weight: 600; color: #64748b; cursor: pointer; }
    .pill-tabs button.active { background: #0050e5; color: #ffffff; }
    .select-ctrl { padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; background: #ffffff; }

    .master-detail-grid { display: grid; grid-template-columns: 340px 1fr; gap: 18px; align-items: start; }
    @media (max-width: 980px) { .master-detail-grid { grid-template-columns: 1fr; } }

    .report-list { display: flex; flex-direction: column; gap: 10px; max-height: 75vh; overflow-y: auto; }
    .report-list-item {
      background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; cursor: pointer;
    }
    :host-context(.dark-mode) .report-list-item { background: #1e293b; border-color: rgba(255,255,255,0.08); }
    .report-list-item.active { border-color: #0050e5; box-shadow: 0 0 0 2px rgba(0,80,229,0.15); }
    .rl-top { display: flex; justify-content: space-between; align-items: center; font-size: 11px; font-weight: 700; }
    .rl-group { color: #0050e5; }
    .rl-status { padding: 2px 7px; border-radius: 999px; background: #f1f5f9; }
    .st-reviewed { background: #dcfce7; color: #166534; }
    .st-actionneeded { background: #fee2e2; color: #b91c1c; }
    .report-list-item h4 { margin: 6px 0; font-size: 14px; font-weight: 700; }
    .rl-meta { font-size: 11.5px; color: #64748b; display: flex; gap: 6px; flex-wrap: wrap; }

    .report-reader, .empty-card {
      background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 22px;
      display: flex; flex-direction: column; gap: 18px;
    }
    :host-context(.dark-mode) .report-reader, :host-context(.dark-mode) .empty-card { background: #1e293b; border-color: rgba(255,255,255,0.08); }
    .empty-card { align-items: center; text-align: center; padding: 48px 20px; }
    .empty-card .material-symbols-outlined { font-size: 42px; color: #94a3b8; }

    .reader-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 14px; flex-wrap: wrap; border-bottom: 1px solid #e2e8f0; padding-bottom: 14px; }
    .reader-kicker { font-size: 11.5px; font-weight: 700; color: #0050e5; text-transform: uppercase; }
    .reader-head h2 { margin: 4px 0; font-size: 20px; font-weight: 800; }
    .reader-byline { margin: 0; font-size: 13px; color: #64748b; }

    .btn-ai {
      display: inline-flex; align-items: center; gap: 6px; background: rgba(0,80,229,0.1); color: #0050e5;
      border: 1px solid rgba(0,80,229,0.3); border-radius: 8px; padding: 8px 14px; font-size: 12.5px; font-weight: 700; cursor: pointer;
    }
    .btn-ai:hover { background: #0050e5; color: #ffffff; }

    .ai-digest-box { background: rgba(0,80,229,0.05); border-left: 4px solid #0050e5; padding: 14px 16px; border-radius: 10px; }
    .ai-head { display: flex; align-items: center; gap: 6px; color: #0050e5; font-size: 13px; margin-bottom: 6px; }
    .ai-pre { margin: 0; white-space: pre-wrap; font-family: inherit; font-size: 13px; line-height: 1.55; }

    .sec-block h4 { margin: 0 0 6px; font-size: 13px; font-weight: 700; text-transform: uppercase; color: #475569; }
    .sec-block p, .minutes-body { margin: 0; font-size: 14px; line-height: 1.65; white-space: pre-wrap; }
    .action-item-row { display: flex; align-items: center; gap: 8px; padding: 6px 0; font-size: 13.5px; }
    .action-item-row .material-symbols-outlined { font-size: 18px; color: #0050e5; }

    .cloud-links-wrap { display: flex; flex-direction: column; gap: 8px; }
    .cloud-link-card { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 10px; }
    .cloud-link-card .material-symbols-outlined { color: #0050e5; font-size: 24px; }
    .cl-title { font-size: 13.5px; font-weight: 700; }
    .cl-sub { font-size: 11.5px; color: #64748b; }
    .btn-secondary-xs, .btn-primary-xs {
      padding: 5px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; text-decoration: none; cursor: pointer;
    }
    .btn-secondary-xs { background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; }
    .btn-primary-xs { background: #0050e5; color: #ffffff; border: none; }

    .iframe-preview-wrap { margin-top: 12px; border: 1px solid #cbd5e1; border-radius: 10px; overflow: hidden; }
    .iframe-bar { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #f8fafc; font-size: 12px; font-weight: 700; }
    .cloud-iframe { width: 100%; height: 420px; border: none; }

    .files-row { display: flex; flex-wrap: wrap; gap: 8px; }
    .file-chip { display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 12.5px; font-weight: 600; color: #0050e5; text-decoration: none; }

    .review-box { border-top: 1px solid #e2e8f0; padding-top: 16px; }
    .review-box h4 { margin: 0 0 10px; font-size: 13.5px; font-weight: 700; }
    .review-controls { display: flex; flex-wrap: wrap; gap: 10px; }
    .remarks-input { flex: 1; min-width: 240px; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; }
    .btn-primary-sm { background: #0050e5; color: #ffffff; border: none; border-radius: 8px; padding: 8px 16px; font-size: 13px; font-weight: 600; cursor: pointer; }
  `]
})
export class CommitteesReportsAdminComponent implements OnInit, OnDestroy {
  aliases: CommitteeAliases;
  loading = false;
  generatingAi = false;
  reports: any[] = [];
  committees: any[] = [];
  selectedReport: any = null;
  reviewFilter = 'All';
  committeeFilter = '';

  reviewStatusInput = 'Reviewed';
  adminRemarksInput = '';
  safePreviewUrl: SafeResourceUrl | null = null;
  headerButtons: PageHeaderButton[] = [];

  private sub?: Subscription;

  constructor(
    private committeesService: CommitteesService,
    private toast: ToastService,
    private sanitizer: DomSanitizer,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.aliases = this.committeesService.currentAliases;
  }

  ngOnInit(): void {
    this.sub = this.committeesService.aliases$.subscribe((a) => { this.aliases = a; });
    this.headerButtons = [
      {
        text: 'Compose Report',
        icon: 'edit_document',
        isPrimary: true,
        action: () => this.router.navigate(['/committees/workspace/reports/compose'])
      }
    ];
    const qCommittee = this.route.snapshot.queryParamMap.get('committeeId');
    if (qCommittee) this.committeeFilter = qCommittee;

    this.committeesService.getManagedCommittees().subscribe({
      next: (res) => { if (res?.isSuccess) this.committees = res.data || []; }
    });
    this.loadReports();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  setReviewFilter(f: string): void {
    this.reviewFilter = f;
    this.loadReports();
  }

  loadReports(): void {
    this.loading = true;
    this.committeesService.getReports(this.committeeFilter || undefined, this.reviewFilter).subscribe({
      next: (res) => {
        this.loading = false;
        if (res?.isSuccess) {
          this.reports = res.data || [];
          const qId = this.route.snapshot.queryParamMap.get('id');
          const match = qId ? this.reports.find((x) => x.id === qId) : null;
          this.selectReport(match || this.reports[0] || null);
        }
      },
      error: () => { this.loading = false; }
    });
  }

  selectReport(r: any): void {
    this.selectedReport = r;
    this.safePreviewUrl = null;
    if (r) {
      this.reviewStatusInput = r.reviewStatus === 'Submitted' ? 'Reviewed' : r.reviewStatus;
      this.adminRemarksInput = r.adminRemarks || '';
    }
  }

  summarizeWithAi(): void {
    if (!this.selectedReport) return;
    this.generatingAi = true;
    this.committeesService.generateAiDigest(this.selectedReport.id).subscribe({
      next: (res) => {
        this.generatingAi = false;
        if (res?.isSuccess) {
          this.selectedReport.aiExecutiveDigest = res.data.aiExecutiveDigest;
          this.toast.success('Ozi AI Executive Digest generated.');
        }
      },
      error: () => {
        this.generatingAi = false;
        this.toast.error('Unable to generate AI digest right now.');
      }
    });
  }

  previewCloudUrl(url: string): void {
    if (!url) return;
    const embed = url.includes('docs.google.com/')
      ? url.replace(/\/(edit|view).*$/i, '/preview')
      : url;
    this.safePreviewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(embed);
  }

  saveReview(): void {
    if (!this.selectedReport) return;
    this.committeesService.reviewReport(this.selectedReport.id, {
      reviewStatus: this.reviewStatusInput,
      adminRemarks: this.adminRemarksInput
    }).subscribe({
      next: (res) => {
        if (res?.isSuccess) {
          this.selectedReport.reviewStatus = this.reviewStatusInput;
          this.selectedReport.adminRemarks = this.adminRemarksInput;
          this.toast.success('Report review saved and author notified.');
        }
      }
    });
  }

  getProviderIcon(p: string): string {
    return this.committeesService.getProviderIcon(p);
  }
}

