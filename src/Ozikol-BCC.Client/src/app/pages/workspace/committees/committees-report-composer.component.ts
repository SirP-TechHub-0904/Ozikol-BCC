import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import {
  CommitteeAliases,
  CommitteeInfoSpec,
  CommitteeTourStep,
  CommitteesService
} from '../../../core/services/committees.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { CommitteesUxHelpersComponent } from '../../../shared/components/committees-ux-helpers/committees-ux-helpers.component';

/**
 * Multi-Modal Meeting Report Composer (M4 — /committees/workspace/reports/compose).
 * Supports 3 simultaneous/interchangeable modes:
 * 1. Rich Typed Minutes + Resolutions + Action Items (@Member + Due Date) + 1-Tap Roster Roll-Call + Custom KPIs
 * 2. Static File Uploads (PDF, Word, Excel, CSV, PowerPoint, Images)
 * 3. Google Sign-In Picker (Docs / Sheets / Slides / Notebooks) + Paste Any Cloud / Excel Online Link
 */
@Component({
  selector: 'app-committees-report-composer',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TranslatePipe, CommitteesUxHelpersComponent],
  template: `
    <div class="rc-shell">
      <header class="rc-header">
        <div>
          <span class="rc-eyebrow">{{ 'committees.eyebrow' | translate:'PEOPLE & COMMUNITY' }}</span>
          <div class="rc-title-row">
            <h1>{{ 'committees.compose_report' | translate:'Compose Meeting Report' }}</h1>
            <button type="button" class="rc-info-btn" (click)="openInfo()">
              <span class="material-symbols-outlined">info</span>
            </button>
          </div>
          <p class="rc-subtitle">
            Type structured minutes, record 1-tap attendance roll-call, upload files, or connect Google Docs, Sheets &amp; Cloud Notebooks.
          </p>
        </div>

        <div class="rc-actions">
          <button type="button" class="rc-btn-ghost" (click)="showTour = true">
            <span class="material-symbols-outlined">help</span>
            <span>{{ 'committees.tour_guide' | translate:'Tour Guide' }}</span>
          </button>
          <a routerLink="/committees/workspace/my" class="rc-btn-secondary">
            <span class="material-symbols-outlined">arrow_back</span>
            <span>Back to {{ aliases.aliasPlural }}</span>
          </a>
        </div>
      </header>

      <div class="rc-alert" *ngIf="feedback" [class.error]="isError">
        <span class="material-symbols-outlined">{{ isError ? 'error' : 'check_circle' }}</span>
        <span>{{ feedback }}</span>
      </div>

      <!-- Core Session Metadata Card -->
      <section class="rc-card">
        <div class="rc-grid-3">
          <div class="rc-field">
            <label>Select {{ aliases.aliasSingular }} / {{ aliases.subGroupAliasSingular }} <span class="req">*</span></label>
            <select [(ngModel)]="selectedCommitteeId" (change)="onCommitteeChanged()">
              <option value="">Choose {{ aliases.aliasSingular.toLowerCase() }}...</option>
              <option *ngFor="let g of reportableGroups" [value]="g.committeeId">
                {{ g.name }} ({{ g.myRoleDisplay || g.myRole }})
              </option>
            </select>
          </div>

          <div class="rc-field">
            <label>Meeting / Report Title <span class="req">*</span></label>
            <input type="text" [(ngModel)]="title" placeholder="e.g. Monthly Strategy & Operations Review" />
          </div>

          <div class="rc-field">
            <label>Meeting Date <span class="req">*</span></label>
            <input type="date" [(ngModel)]="meetingDate" />
          </div>
        </div>

        <div class="rc-field" style="margin-top: 14px;">
          <label>Executive Summary</label>
          <input type="text" [(ngModel)]="summary" placeholder="e.g. Brief 1-2 sentence overview of key outcomes" />
        </div>
      </section>

      <!-- Multi-Modal Input Switcher -->
      <nav class="rc-mode-tabs">
        <button type="button" [class.active]="activeMode === 'minutes'" (click)="activeMode = 'minutes'">
          <span class="material-symbols-outlined">edit_note</span>
          <span>{{ 'committees.mode_type_minutes' | translate:'Type Rich Minutes & Roll-Call' }}</span>
        </button>
        <button type="button" [class.active]="activeMode === 'files'" (click)="activeMode = 'files'">
          <span class="material-symbols-outlined">upload_file</span>
          <span>{{ 'committees.mode_upload_files' | translate:'Upload Files (PDF, Word, Excel)' }} ({{ uploadedFiles.length }})</span>
        </button>
        <button type="button" [class.active]="activeMode === 'cloud'" (click)="activeMode = 'cloud'">
          <span class="material-symbols-outlined">add_to_drive</span>
          <span>{{ 'committees.mode_cloud_docs' | translate:'Connect Google Docs, Sheets & Notebooks' }} ({{ cloudLinks.length }})</span>
        </button>
      </nav>

      <!-- MODE 1: TYPED MINUTES, ACTION ITEMS & ROLL-CALL -->
      <section class="rc-card" *ngIf="activeMode === 'minutes'">
        <div class="rc-field">
          <label>Meeting Minutes &amp; Discussion Notes</label>
          <textarea
            rows="7"
            [(ngModel)]="richMinutesContent"
            placeholder="Type agenda discussions, progress updates, and detailed meeting notes..."
          ></textarea>
        </div>

        <div class="rc-field">
          <label>Key Decisions &amp; Resolutions</label>
          <textarea
            rows="3"
            [(ngModel)]="decisionsText"
            placeholder="Record formal resolutions or approved items..."
          ></textarea>
        </div>

        <!-- Custom Numeric KPIs (if configured in Committee Settings) -->
        <div class="rc-sub-section" *ngIf="customMetricsSchema.length > 0">
          <h3>Custom {{ aliases.aliasSingular }} Metrics</h3>
          <div class="rc-grid-3">
            <div class="rc-field" *ngFor="let m of customMetricsSchema">
              <label>{{ m.label }} <small *ngIf="m.unit">({{ m.unit }})</small></label>
              <input type="number" [(ngModel)]="customMetricsValues[m.key]" placeholder="0" />
            </div>
          </div>
        </div>

        <!-- Action Items -->
        <div class="rc-sub-section">
          <div class="rc-sub-head">
            <h3>Follow-Up Action Items ({{ actionItems.length }})</h3>
            <button type="button" class="rc-btn-secondary" (click)="addActionItem()">
              <span class="material-symbols-outlined">add_task</span>
              <span>Add Action Item</span>
            </button>
          </div>
          <div class="rc-action-row" *ngFor="let act of actionItems; let i = index">
            <input type="text" [(ngModel)]="act.task" placeholder="Action item description..." style="flex:2" />
            <select [(ngModel)]="act.assigneeUserId" (change)="onAssigneeSelected(act)">
              <option value="">Assign member...</option>
              <option *ngFor="let m of roster" [value]="m.userProfileId">{{ m.fullName }}</option>
            </select>
            <input type="date" [(ngModel)]="act.dueDate" />
            <button type="button" class="rc-icon-del" (click)="actionItems.splice(i, 1)">
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>
        </div>

        <!-- 1-Tap Roster Attendance Roll-Call -->
        <div class="rc-sub-section">
          <div class="rc-sub-head">
            <h3>1-Tap Attendance Roll-Call</h3>
            <div class="rc-roll-stats">
              <span class="present">Present: {{ presentCount }}</span>
              <span class="excused">Excused: {{ excusedCount }}</span>
              <span class="absent">Absent: {{ absentCount }}</span>
            </div>
          </div>

          <div class="rc-roll-grid" *ngIf="rollCall.length > 0">
            <div class="rc-roll-item" *ngFor="let r of rollCall">
              <span class="rc-roll-name">{{ r.fullName }}</span>
              <div class="rc-roll-btns">
                <button type="button" [class.p]="r.status === 'Present'" (click)="r.status = 'Present'">Present</button>
                <button type="button" [class.e]="r.status === 'Excused'" (click)="r.status = 'Excused'">Excused</button>
                <button type="button" [class.a]="r.status === 'Absent'" (click)="r.status = 'Absent'">Absent</button>
              </div>
            </div>
          </div>
          <p class="rc-muted" *ngIf="rollCall.length === 0">Select a {{ aliases.aliasSingular.toLowerCase() }} above to load its member roll-call.</p>
        </div>
      </section>

      <!-- MODE 2: UPLOAD FILES -->
      <section class="rc-card" *ngIf="activeMode === 'files'">
        <div class="rc-upload-zone">
          <span class="material-symbols-outlined">cloud_upload</span>
          <h3>Upload Meeting Documents, Spreadsheets, or Slides</h3>
          <p>Supports PDF, Word (.docx), Excel (.xlsx, .csv), PowerPoint (.pptx), and Images.</p>
          <label class="rc-btn-primary" style="cursor:pointer">
            <span class="material-symbols-outlined">attach_file</span>
            <span>{{ uploading ? 'Uploading...' : 'Select File to Upload' }}</span>
            <input type="file" hidden (change)="onFilePicked($event)" [disabled]="uploading" />
          </label>
        </div>

        <div class="rc-attached-list" *ngIf="uploadedFiles.length > 0">
          <div class="rc-attached-item" *ngFor="let f of uploadedFiles; let idx = index">
            <span class="material-symbols-outlined">description</span>
            <div class="rc-att-meta">
              <strong>{{ f.fileName }}</strong>
              <small>{{ f.fileType }} • {{ (f.sizeBytes / 1024) | number:'1.0-0' }} KB</small>
            </div>
            <button type="button" class="rc-icon-del" (click)="uploadedFiles.splice(idx, 1)">
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>
        </div>
      </section>

      <!-- MODE 3: CONNECT GOOGLE DOCS / SHEETS / CLOUD NOTEBOOKS -->
      <section class="rc-card" *ngIf="activeMode === 'cloud'">
        <div class="rc-google-hero">
          <div>
            <h3>Connect Google Account or Cloud Workspace</h3>
            <p>Sign in with Google to pick live Google Docs, Google Sheets, Slides, or NotebookLM links, or paste any Excel Online / Notion URL.</p>
          </div>
          <div class="rc-google-btns">
            <button type="button" class="rc-btn-primary" (click)="pickFromGoogleDrive()">
              <span class="material-symbols-outlined">add_to_drive</span>
              <span>{{ 'committees.connect_google' | translate:'Sign in with Google to Link Docs / Sheets' }}</span>
            </button>
            <a href="https://docs.google.com/document/create" target="_blank" rel="noopener" class="rc-btn-secondary">
              <span class="material-symbols-outlined">description</span>
              <span>{{ 'committees.create_google_doc' | translate:'New Google Doc' }}</span>
            </a>
            <a href="https://docs.google.com/spreadsheets/create" target="_blank" rel="noopener" class="rc-btn-secondary">
              <span class="material-symbols-outlined">table_chart</span>
              <span>{{ 'committees.create_google_sheet' | translate:'New Google Sheet' }}</span>
            </a>
          </div>
        </div>

        <div class="rc-paste-box">
          <h4>{{ 'committees.paste_cloud_link' | translate:'Paste Cloud / Notebook / Excel Link' }}</h4>
          <div class="rc-paste-row">
            <input type="text" [(ngModel)]="cloudTitleInput" placeholder="Document title (e.g. Financial Sheet or Meeting Notebook)" />
            <input type="url" [(ngModel)]="cloudUrlInput" placeholder="https://docs.google.com/spreadsheets/d/..." />
            <label class="rc-pin-check">
              <input type="checkbox" [(ngModel)]="pinCloudInput" />
              <span>Pin to {{ aliases.aliasSingular }} Shelf</span>
            </label>
            <button type="button" class="rc-btn-secondary" (click)="addCloudUrl()">
              <span class="material-symbols-outlined">add_link</span>
              <span>Attach Link</span>
            </button>
          </div>
        </div>

        <div class="rc-attached-list" *ngIf="cloudLinks.length > 0">
          <div class="rc-attached-item" *ngFor="let c of cloudLinks; let idx = index">
            <span class="material-symbols-outlined">{{ getProviderIcon(c.provider) }}</span>
            <div class="rc-att-meta">
              <strong>{{ c.title }}</strong>
              <small>{{ c.provider }} • {{ c.pinToGroupShelf ? 'Pinned to Group Shelf' : 'Report Only' }}</small>
            </div>
            <a [href]="c.url" target="_blank" rel="noopener" class="rc-btn-ghost">Open</a>
            <button type="button" class="rc-icon-del" (click)="cloudLinks.splice(idx, 1)">
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>
        </div>
      </section>

      <!-- Submit Bar -->
      <footer class="rc-submit-bar">
        <label class="rc-share-toggle">
          <input type="checkbox" [(ngModel)]="isSharedWithMembers" />
          <span>Share this report with enrolled {{ aliases.aliasSingular.toLowerCase() }} members</span>
        </label>

        <button type="button" class="rc-btn-primary lg" [disabled]="submitting" (click)="submitMeetingReport()">
          <span class="material-symbols-outlined">send</span>
          <span>{{ submitting ? 'Submitting...' : ('committees.submit_report' | translate:'Submit Meeting Report') }}</span>
        </button>
      </footer>

      <app-committees-ux-helpers
        [activeInfo]="activeInfo"
        (closeInfo)="activeInfo = null"
        [showTour]="showTour"
        [tourSteps]="tourSteps"
        (tourClosed)="onTourClosed()"
      ></app-committees-ux-helpers>
    </div>
  `,
  styles: [`
    .rc-shell { display: flex; flex-direction: column; gap: 18px; width: 100%; }
    .rc-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
    .rc-eyebrow { font-size: 11px; font-weight: 700; letter-spacing: 0.8px; color: #0050e5; text-transform: uppercase; }
    .rc-title-row { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
    .rc-title-row h1 { margin: 0; font-size: 24px; font-weight: 800; color: #0f172a; }
    :host-context(.dark-mode) .rc-title-row h1 { color: #f8fafc; }
    .rc-subtitle { margin: 6px 0 0; font-size: 13.5px; color: #64748b; }
    .rc-info-btn { background: transparent; border: none; color: #0050e5; cursor: pointer; }
    .rc-actions { display: flex; gap: 10px; }
    .rc-btn-primary, .rc-btn-secondary, .rc-btn-ghost {
      display: inline-flex; align-items: center; gap: 7px; padding: 9px 15px; border-radius: 10px;
      font-size: 13px; font-weight: 600; text-decoration: none; cursor: pointer; border: 1px solid transparent;
    }
    .rc-btn-primary { background: #0050e5; color: #ffffff; }
    .rc-btn-primary.lg { padding: 11px 22px; font-size: 14px; }
    .rc-btn-secondary { background: rgba(0, 80, 229, 0.08); color: #0050e5; border-color: rgba(0, 80, 229, 0.2); }
    .rc-btn-ghost { background: #ffffff; color: #334155; border-color: #cbd5e1; }
    .rc-alert {
      display: flex; align-items: center; gap: 8px; padding: 12px 16px; border-radius: 12px;
      background: rgba(16, 185, 129, 0.12); color: #065f46; font-size: 13.5px; font-weight: 600;
    }
    .rc-alert.error { background: rgba(220, 38, 38, 0.1); color: #dc2626; }
    .rc-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 16px; }
    :host-context(.dark-mode) .rc-card { background: #1e293b; border-color: rgba(255,255,255,0.08); }
    .rc-grid-3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; }
    .rc-field { display: flex; flex-direction: column; gap: 6px; }
    .rc-field label { font-size: 13px; font-weight: 600; color: #1e293b; }
    :host-context(.dark-mode) .rc-field label { color: #e2e8f0; }
    .rc-field .req { color: #dc2626; }
    .rc-field input, .rc-field select, .rc-field textarea {
      border: 1px solid #cbd5e1; border-radius: 9px; padding: 9px 12px; font-size: 13.5px; background: #ffffff; color: #0f172a; font-family: inherit;
    }
    :host-context(.dark-mode) .rc-field input, :host-context(.dark-mode) .rc-field select, :host-context(.dark-mode) .rc-field textarea {
      background: #0f172a; border-color: rgba(255,255,255,0.14); color: #f8fafc;
    }
    .rc-mode-tabs { display: flex; gap: 8px; flex-wrap: wrap; }
    .rc-mode-tabs button {
      display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 12px;
      background: #ffffff; border: 1px solid #e2e8f0; font-size: 13px; font-weight: 700; color: #475569; cursor: pointer;
    }
    .rc-mode-tabs button.active { background: #0050e5; border-color: #0050e5; color: #ffffff; }
    .rc-sub-section { border-top: 1px solid #f1f5f9; padding-top: 16px; display: flex; flex-direction: column; gap: 12px; }
    .rc-sub-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
    .rc-sub-head h3 { margin: 0; font-size: 15.5px; }
    .rc-action-row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
    .rc-action-row input, .rc-action-row select { padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; }
    .rc-icon-del { background: transparent; border: none; color: #dc2626; cursor: pointer; }
    .rc-roll-stats { display: flex; gap: 10px; font-size: 12.5px; font-weight: 700; }
    .rc-roll-stats .present { color: #059669; }
    .rc-roll-stats .excused { color: #b45309; }
    .rc-roll-stats .absent { color: #dc2626; }
    .rc-roll-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 10px; }
    .rc-roll-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 10px; }
    .rc-roll-name { font-size: 13px; font-weight: 600; }
    .rc-roll-btns { display: flex; gap: 4px; }
    .rc-roll-btns button { border: 1px solid #cbd5e1; background: #ffffff; border-radius: 6px; padding: 4px 8px; font-size: 11.5px; font-weight: 600; cursor: pointer; }
    .rc-roll-btns button.p { background: #059669; border-color: #059669; color: #ffffff; }
    .rc-roll-btns button.e { background: #d97706; border-color: #d97706; color: #ffffff; }
    .rc-roll-btns button.a { background: #dc2626; border-color: #dc2626; color: #ffffff; }
    .rc-upload-zone {
      border: 2px dashed #cbd5e1; border-radius: 14px; padding: 36px 20px; text-align: center;
      display: flex; flex-direction: column; align-items: center; gap: 10px;
    }
    .rc-upload-zone .material-symbols-outlined { font-size: 40px; color: #0050e5; }
    .rc-google-hero {
      background: rgba(0, 80, 229, 0.05); border: 1px solid rgba(0, 80, 229, 0.2); border-radius: 14px;
      padding: 18px; display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap;
    }
    .rc-google-hero h3 { margin: 0 0 4px; font-size: 16px; }
    .rc-google-hero p { margin: 0; font-size: 13px; color: #475569; max-width: 560px; }
    .rc-google-btns { display: flex; gap: 8px; flex-wrap: wrap; }
    .rc-paste-box h4 { margin: 0 0 8px; font-size: 14px; }
    .rc-paste-row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
    .rc-paste-row input[type="text"], .rc-paste-row input[type="url"] { flex: 1; min-width: 210px; padding: 9px 12px; border: 1px solid #cbd5e1; border-radius: 9px; }
    .rc-pin-check { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 600; }
    .rc-attached-list { display: flex; flex-direction: column; gap: 8px; }
    .rc-attached-item { display: flex; align-items: center; gap: 12px; padding: 11px 14px; border: 1px solid #e2e8f0; border-radius: 10px; }
    .rc-attached-item .material-symbols-outlined { color: #0050e5; }
    .rc-att-meta { flex: 1; display: flex; flex-direction: column; }
    .rc-att-meta small { color: #64748b; font-size: 12px; }
    .rc-submit-bar {
      background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px 20px;
      display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap;
    }
    :host-context(.dark-mode) .rc-submit-bar { background: #1e293b; border-color: rgba(255,255,255,0.08); }
    .rc-share-toggle { display: inline-flex; align-items: center; gap: 8px; font-size: 13.5px; font-weight: 600; }
    .rc-muted { color: #64748b; font-size: 13px; margin: 0; }
  `]
})
export class CommitteesReportComposerComponent implements OnInit, OnDestroy {
  aliases: CommitteeAliases;
  reportableGroups: any[] = [];
  selectedCommitteeId = '';

  title = '';
  meetingDate = new Date().toISOString().slice(0, 10);
  summary = '';
  activeMode: 'minutes' | 'files' | 'cloud' = 'minutes';

  richMinutesContent = '';
  decisionsText = '';
  actionItems: Array<{ task: string; assigneeUserId: string; assigneeName: string; dueDate: string; status: string }> = [];
  roster: any[] = [];
  rollCall: Array<{ userId: string; fullName: string; status: 'Present' | 'Excused' | 'Absent' }> = [];

  customMetricsSchema: Array<{ key: string; label: string; unit?: string }> = [];
  customMetricsValues: Record<string, number> = {};

  uploadedFiles: Array<{ fileName: string; fileUrl: string; fileType: string; sizeBytes: number }> = [];
  uploading = false;

  cloudLinks: Array<{ provider: string; title: string; url: string; externalFileId?: string; pinToGroupShelf: boolean }> = [];
  cloudTitleInput = '';
  cloudUrlInput = '';
  pinCloudInput = true;

  isSharedWithMembers = true;
  submitting = false;
  feedback = '';
  isError = false;

  activeInfo: CommitteeInfoSpec | null = null;
  showTour = false;
  tourSteps: CommitteeTourStep[] = [];

  private aliasSub?: Subscription;
  private readonly TOUR_KEY = 'committees_report_composer';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private committeesService: CommitteesService
  ) {
    this.aliases = this.committeesService.currentAliases;
  }

  ngOnInit(): void {
    this.aliasSub = this.committeesService.aliases$.subscribe((a) => {
      this.aliases = a;
      this.buildTourSteps();
    });
    this.buildTourSteps();

    const preselect = this.route.snapshot.queryParamMap.get('committeeId') || '';

    this.committeesService.getSettings().subscribe({
      next: (res) => {
        if (res?.isSuccess && res.data?.customReportMetrics) {
          this.customMetricsSchema = res.data.customReportMetrics || [];
        }
      }
    });

    this.committeesService.getMyWorkspaceCommittees().subscribe({
      next: (res) => {
        if (res?.isSuccess && res.data?.enrolledCommittees) {
          const all: any[] = res.data.enrolledCommittees;
          this.reportableGroups = all.filter((g) => g.canSubmitReport);
          if (preselect && this.reportableGroups.some((g) => g.committeeId === preselect)) {
            this.selectedCommitteeId = preselect;
            this.onCommitteeChanged();
          } else if (this.reportableGroups.length === 1) {
            this.selectedCommitteeId = this.reportableGroups[0].committeeId;
            this.onCommitteeChanged();
          }
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.aliasSub?.unsubscribe();
  }

  onCommitteeChanged(): void {
    if (!this.selectedCommitteeId) {
      this.roster = [];
      this.rollCall = [];
      return;
    }
    this.committeesService.getCommitteeDetails(this.selectedCommitteeId).subscribe({
      next: (res) => {
        if (res?.isSuccess && res.data?.members) {
          this.roster = res.data.members;
          this.rollCall = this.roster.map((m: any) => ({
            userId: m.userProfileId,
            fullName: m.fullName,
            status: 'Present'
          }));
        }
      }
    });
  }

  get presentCount(): number {
    return this.rollCall.filter((r) => r.status === 'Present').length;
  }

  get excusedCount(): number {
    return this.rollCall.filter((r) => r.status === 'Excused').length;
  }

  get absentCount(): number {
    return this.rollCall.filter((r) => r.status === 'Absent').length;
  }

  addActionItem(): void {
    this.actionItems.push({ task: '', assigneeUserId: '', assigneeName: '', dueDate: '', status: 'Pending' });
  }

  onAssigneeSelected(act: { assigneeUserId: string; assigneeName: string }): void {
    const found = this.roster.find((m) => m.userProfileId === act.assigneeUserId);
    act.assigneeName = found ? found.fullName : '';
  }

  onFilePicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploading = true;
    this.committeesService.uploadAttachment(file).subscribe({
      next: (res) => {
        this.uploading = false;
        if (res?.isSuccess && res.data) {
          this.uploadedFiles.push({
            fileName: res.data.fileName || file.name,
            fileUrl: res.data.fileUrl,
            fileType: res.data.fileType || 'FILE',
            sizeBytes: res.data.sizeBytes || file.size
          });
        }
      },
      error: (err) => {
        this.uploading = false;
        this.isError = true;
        this.feedback = err?.error?.message || 'File upload failed.';
      }
    });
  }

  async pickFromGoogleDrive(): Promise<void> {
    const res = await this.committeesService.launchGoogleDrivePicker();
    if (res.picked) {
      this.cloudLinks.push({
        provider: res.picked.provider,
        title: res.picked.title,
        url: res.picked.url,
        externalFileId: res.picked.externalFileId,
        pinToGroupShelf: true
      });
    } else if (res.fallbackReason) {
      this.isError = false;
      this.feedback = 'Paste your Google Doc, Google Sheet, or Cloud Notebook share link below to attach it immediately.';
    }
  }

  addCloudUrl(): void {
    const url = this.cloudUrlInput.trim();
    if (!url) return;
    const provider = this.committeesService.detectProviderFromUrl(url);
    this.cloudLinks.push({
      provider,
      title: this.cloudTitleInput.trim() || `${provider} Document`,
      url,
      pinToGroupShelf: this.pinCloudInput
    });
    this.cloudTitleInput = '';
    this.cloudUrlInput = '';
  }

  getProviderIcon(provider: string): string {
    return this.committeesService.getProviderIcon(provider);
  }

  submitMeetingReport(): void {
    if (!this.selectedCommitteeId || !this.title.trim()) {
      this.isError = true;
      this.feedback = `Please select a ${this.aliases.aliasSingular.toLowerCase()} and enter a report title.`;
      return;
    }

    this.submitting = true;
    this.feedback = '';

    this.committeesService
      .submitReport({
        committeeId: this.selectedCommitteeId,
        title: this.title.trim(),
        meetingDate: this.meetingDate,
        summary: this.summary.trim(),
        richMinutesContent: this.richMinutesContent,
        decisionsText: this.decisionsText,
        actionItems: this.actionItems.filter((a) => a.task.trim()),
        attendanceRollCall: this.rollCall,
        presentCount: this.presentCount,
        excusedCount: this.excusedCount,
        absentCount: this.absentCount,
        customMetricsValues: this.customMetricsValues,
        uploadedFiles: this.uploadedFiles,
        cloudLinks: this.cloudLinks,
        isSharedWithMembers: this.isSharedWithMembers
      })
      .subscribe({
        next: (res) => {
          this.submitting = false;
          if (res?.isSuccess) {
            this.router.navigate(['/committees/workspace/view', this.selectedCommitteeId]);
          } else {
            this.isError = true;
            this.feedback = res?.message || 'Report submission failed.';
          }
        },
        error: (err) => {
          this.submitting = false;
          this.isError = true;
          this.feedback = err?.error?.message || 'Unable to submit meeting report.';
        }
      });
  }

  openInfo(): void {
    this.activeInfo = {
      title: 'Multi-Modal Meeting Report Studio',
      purpose: 'Lets leaders and secretaries submit meeting minutes by typing directly, uploading static files, or connecting live Google Docs, Sheets & Notebooks.',
      inputs: 'Combine typed minutes, 1-tap attendance roll-call, uploaded PDFs/spreadsheets, and Google Drive / Excel Online links in one submission.',
      impact: 'Updates workspace attendance trends, notifies administrators, and optionally pins live cloud documents onto the group shelf.',
      bestPractices: 'Assign clear owners and target dates to Action Items so follow-up responsibilities are transparent.'
    };
  }

  onTourClosed(): void {
    this.showTour = false;
    this.committeesService.markTourCompleted(this.TOUR_KEY);
  }

  private buildTourSteps(): void {
    this.tourSteps = [
      {
        icon: 'edit_note',
        title: 'Mode 1: Type Minutes & 1-Tap Roll-Call',
        description: 'Write meeting notes, record decisions, assign @Member action items, and mark Present / Excused / Absent in one tap.'
      },
      {
        icon: 'upload_file',
        title: 'Mode 2: Upload Documents & Spreadsheets',
        description: 'Attach PDFs, Word documents, Excel workbooks, or presentation decks directly to the report.'
      },
      {
        icon: 'add_to_drive',
        title: 'Mode 3: Sign in with Google or Paste Cloud Links',
        description: 'Connect Google Docs, Google Sheets, Slides, NotebookLM, or Excel Online links and pin them to your group shelf.'
      }
    ];
  }
}

