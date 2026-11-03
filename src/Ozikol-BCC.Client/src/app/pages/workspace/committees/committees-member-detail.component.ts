import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import {
  CommitteeAliases,
  CommitteeInfoSpec,
  CommitteesService
} from '../../../core/services/committees.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { CommitteesUxHelpersComponent } from '../../../shared/components/committees-ux-helpers/committees-ux-helpers.component';

/**
 * Single Committee / Sub-Group Member Workspace Hub (M3 — /committees/workspace/view/:id).
 * Provides Roster, Nested Sub-Groups, Meeting Reports reader, Shared Google Docs / Notebooks Shelf with inline preview,
 * and Delegated Leader Tools (when CurrentUserAccess.canManageGroup is true).
 */
@Component({
  selector: 'app-committees-member-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TranslatePipe, CommitteesUxHelpersComponent],
  template: `
    <div class="cv-shell" *ngIf="details">
      <!-- Top Breadcrumb & Header -->
      <div class="cv-top-nav">
        <a routerLink="/committees/workspace/my" class="cv-back-link">
          <span class="material-symbols-outlined">arrow_back</span>
          <span>{{ 'committees.my_groups' | translate:'My' }} {{ aliases.aliasPlural }}</span>
        </a>
      </div>

      <header class="cv-hero">
        <div class="cv-hero-left">
          <div class="cv-hero-icon">
            <span class="material-symbols-outlined">{{ details.committee?.iconName || 'diversity_3' }}</span>
          </div>
          <div>
            <div class="cv-chip-row">
              <span class="cv-chip primary">
                {{ details.committee?.parentCommitteeId ? aliases.subGroupAliasSingular : aliases.aliasSingular }}
              </span>
              <span class="cv-chip" *ngIf="details.committee?.categoryTag">{{ details.committee.categoryTag }}</span>
              <span class="cv-chip role" *ngIf="details.currentUserAccess?.memberRole">
                Your Role: {{ details.currentUserAccess.memberRole }}
              </span>
            </div>
            <div class="cv-title-row">
              <h1>{{ details.committee?.name }}</h1>
              <button type="button" class="cv-info-btn" (click)="openInfo()">
                <span class="material-symbols-outlined">info</span>
              </button>
            </div>
            <p class="cv-desc">{{ details.committee?.description || details.committee?.missionStatement }}</p>
            <div class="cv-schedule-row">
              <span *ngIf="details.committee?.meetingSchedule">
                <span class="material-symbols-outlined">event_repeat</span> {{ details.committee.meetingSchedule }}
              </span>
              <span *ngIf="details.committee?.meetingLocationOrLink">
                <span class="material-symbols-outlined">location_on</span> {{ details.committee.meetingLocationOrLink }}
              </span>
            </div>
          </div>
        </div>

        <div class="cv-hero-actions">
          <a
            *ngIf="details.currentUserAccess?.canSubmitReport"
            [routerLink]="['/committees/workspace/reports/compose']"
            [queryParams]="{ committeeId: committeeId }"
            class="cv-btn-primary"
          >
            <span class="material-symbols-outlined">edit_document</span>
            <span>{{ 'committees.compose_report' | translate:'Compose Meeting Report' }}</span>
          </a>
          <button
            *ngIf="details.committee?.allowExternalRegistration"
            type="button"
            class="cv-btn-secondary"
            (click)="copyExternalLink()"
          >
            <span class="material-symbols-outlined">share</span>
            <span>{{ 'committees.copy_link' | translate:'Copy External Registration Link' }}</span>
          </button>
        </div>
      </header>

      <div class="cv-toast" *ngIf="toastMessage">
        <span class="material-symbols-outlined">check_circle</span>
        <span>{{ toastMessage }}</span>
      </div>

      <!-- Navigation Tabs -->
      <nav class="cv-tabs">
        <button type="button" [class.active]="activeTab === 'roster'" (click)="activeTab = 'roster'">
          <span class="material-symbols-outlined">groups</span>
          <span>{{ 'committees.tab_roster' | translate:'Roster & Roles' }} ({{ (details.members || []).length }})</span>
        </button>
        <button type="button" [class.active]="activeTab === 'subgroups'" (click)="activeTab = 'subgroups'">
          <span class="material-symbols-outlined">account_tree</span>
          <span>{{ aliases.subGroupAliasPlural }} ({{ (details.subGroups || []).length }})</span>
        </button>
        <button type="button" [class.active]="activeTab === 'reports'" (click)="activeTab = 'reports'">
          <span class="material-symbols-outlined">summarize</span>
          <span>Meeting Reports ({{ (details.reports || []).length }})</span>
        </button>
        <button type="button" [class.active]="activeTab === 'cloud'" (click)="activeTab = 'cloud'">
          <span class="material-symbols-outlined">cloud_done</span>
          <span>Shared Google Docs &amp; Cloud Shelf ({{ (details.cloudDocuments || []).length }})</span>
        </button>
        <button
          *ngIf="details.currentUserAccess?.canManageGroup"
          type="button"
          [class.active]="activeTab === 'leader'"
          (click)="activeTab = 'leader'"
        >
          <span class="material-symbols-outlined">admin_panel_settings</span>
          <span>{{ 'committees.tab_leader_tools' | translate:'Leader Tools' }} ({{ (details.pendingRegistrations || []).length }})</span>
        </button>
      </nav>

      <!-- TAB 1: ROSTER -->
      <section class="cv-panel" *ngIf="activeTab === 'roster'">
        <div class="cv-roster-grid">
          <div class="cv-member-card" *ngFor="let m of details.members || []">
            <div class="cv-member-avatar">
              <span class="material-symbols-outlined">person</span>
            </div>
            <div class="cv-member-info">
              <strong>{{ m.fullName }}</strong>
              <span>{{ m.designation || m.email || 'Workspace Member' }}</span>
            </div>
            <span class="cv-role-pill" [class.leader]="m.role !== 'Member'">
              {{ m.customRoleTitle || m.role }}
            </span>
          </div>
        </div>
      </section>

      <!-- TAB 2: SUB-GROUPS -->
      <section class="cv-panel" *ngIf="activeTab === 'subgroups'">
        <div class="cv-empty" *ngIf="(details.subGroups || []).length === 0">
          <span class="material-symbols-outlined">account_tree</span>
          <p>No nested {{ aliases.subGroupAliasPlural.toLowerCase() }} under this {{ aliases.aliasSingular.toLowerCase() }} yet.</p>
        </div>
        <div class="cv-sub-grid" *ngIf="(details.subGroups || []).length > 0">
          <a
            class="cv-sub-card"
            *ngFor="let sg of details.subGroups"
            [routerLink]="['/committees/workspace/view', sg.id]"
          >
            <div class="cv-sub-icon"><span class="material-symbols-outlined">{{ sg.iconName || 'hub' }}</span></div>
            <div>
              <h4>{{ sg.name }}</h4>
              <span>{{ sg.memberCount }} Members • {{ sg.meetingSchedule || sg.visibility }}</span>
            </div>
            <span class="material-symbols-outlined arrow">chevron_right</span>
          </a>
        </div>
      </section>

      <!-- TAB 3: MEETING REPORTS -->
      <section class="cv-panel" *ngIf="activeTab === 'reports'">
        <div class="cv-empty" *ngIf="(details.reports || []).length === 0">
          <span class="material-symbols-outlined">description</span>
          <p>No meeting reports shared yet.</p>
        </div>

        <div class="cv-report-list" *ngIf="(details.reports || []).length > 0">
          <div class="cv-report-row" *ngFor="let r of details.reports">
            <div>
              <h4>{{ r.title }}</h4>
              <p>{{ r.summary || 'Click View Minutes to inspect full report, attendance, and attached documents.' }}</p>
              <div class="cv-report-meta">
                <span><span class="material-symbols-outlined">calendar_today</span> {{ r.meetingDate | date:'mediumDate' }}</span>
                <span><span class="material-symbols-outlined">how_to_reg</span> {{ r.presentCount }} Present</span>
                <span><span class="material-symbols-outlined">attach_file</span> {{ r.uploadedFilesCount }} Files</span>
                <span><span class="material-symbols-outlined">cloud</span> {{ r.cloudLinksCount }} Cloud Docs</span>
              </div>
            </div>
            <button type="button" class="cv-btn-secondary" (click)="openReportReader(r.id)">
              <span class="material-symbols-outlined">visibility</span>
              <span>View Minutes</span>
            </button>
          </div>
        </div>

        <!-- Inline Report Detail Drawer -->
        <div class="cv-report-detail" *ngIf="selectedReport">
          <div class="cv-detail-head">
            <div>
              <span class="cv-eyebrow">MEETING REPORT</span>
              <h3>{{ selectedReport.title }}</h3>
            </div>
            <button type="button" class="cv-btn-ghost" (click)="selectedReport = null">Close</button>
          </div>

          <div class="cv-ai-box" *ngIf="selectedReport.aiExecutiveDigest">
            <div class="cv-ai-label"><span class="material-symbols-outlined">auto_awesome</span> Ozi AI Executive Digest</div>
            <pre>{{ selectedReport.aiExecutiveDigest }}</pre>
          </div>

          <div class="cv-minutes-body" *ngIf="selectedReport.richMinutesContent" [innerHTML]="selectedReport.richMinutesContent"></div>
          <p *ngIf="selectedReport.decisionsText"><strong>Resolutions &amp; Decisions:</strong> {{ selectedReport.decisionsText }}</p>

          <div class="cv-links-strip" *ngIf="(selectedReport.uploadedFiles || []).length > 0 || (selectedReport.cloudLinks || []).length > 0">
            <a *ngFor="let f of selectedReport.uploadedFiles" [href]="f.fileUrl" target="_blank" rel="noopener" class="cv-doc-pill">
              <span class="material-symbols-outlined">download</span> {{ f.fileName }}
            </a>
            <a *ngFor="let c of selectedReport.cloudLinks" [href]="c.url" target="_blank" rel="noopener" class="cv-doc-pill cloud">
              <span class="material-symbols-outlined">open_in_new</span> {{ c.title }}
            </a>
          </div>
        </div>
      </section>

      <!-- TAB 4: SHARED GOOGLE DOCS / NOTEBOOKS / CLOUD SHELF -->
      <section class="cv-panel" *ngIf="activeTab === 'cloud'">
        <div class="cv-cloud-bar">
          <button type="button" class="cv-btn-primary" (click)="connectGoogleToShelf()">
            <span class="material-symbols-outlined">add_to_drive</span>
            <span>{{ 'committees.connect_google' | translate:'Sign in with Google to Link Docs / Sheets' }}</span>
          </button>
          <button type="button" class="cv-btn-secondary" (click)="showCloudLinkForm = !showCloudLinkForm">
            <span class="material-symbols-outlined">add_link</span>
            <span>{{ 'committees.paste_cloud_link' | translate:'Paste Cloud / Notebook / Excel Link' }}</span>
          </button>
        </div>

        <div class="cv-cloud-form" *ngIf="showCloudLinkForm">
          <input type="text" [(ngModel)]="newCloudTitle" placeholder="Document title (e.g. Live Meeting Agenda)" />
          <input type="url" [(ngModel)]="newCloudUrl" placeholder="https://docs.google.com/document/d/..." />
          <button type="button" class="cv-btn-primary" (click)="pinPastedCloudDoc()">Pin to Shelf</button>
        </div>

        <div class="cv-empty" *ngIf="(details.cloudDocuments || []).length === 0">
          <span class="material-symbols-outlined">cloud_off</span>
          <p>No Google Docs, Sheets, Notebooks, or Excel Online links pinned to this shelf yet.</p>
        </div>

        <div class="cv-cloud-grid" *ngIf="(details.cloudDocuments || []).length > 0">
          <div class="cv-cloud-card" *ngFor="let doc of details.cloudDocuments">
            <div class="cv-cloud-icon">
              <span class="material-symbols-outlined">{{ getProviderIcon(doc.provider) }}</span>
            </div>
            <div class="cv-cloud-info">
              <strong>{{ doc.title }}</strong>
              <span>{{ doc.provider }} • Linked by {{ doc.ownerDisplayName || 'Member' }}</span>
            </div>
            <div class="cv-cloud-btns">
              <button type="button" class="cv-btn-ghost" (click)="previewDoc(doc)">
                <span class="material-symbols-outlined">preview</span>
              </button>
              <a [href]="doc.documentUrl" target="_blank" rel="noopener" class="cv-btn-secondary">
                <span class="material-symbols-outlined">open_in_new</span>
              </a>
            </div>
          </div>
        </div>

        <div class="cv-iframe-box" *ngIf="previewEmbedUrl">
          <div class="cv-detail-head">
            <strong>Live Cloud Preview: {{ previewTitle }}</strong>
            <button type="button" class="cv-btn-ghost" (click)="previewEmbedUrl = null">Close Preview</button>
          </div>
          <iframe [src]="previewEmbedUrl" title="Cloud Document Preview"></iframe>
        </div>
      </section>

      <!-- TAB 5: DELEGATED LEADER TOOLS -->
      <section class="cv-panel" *ngIf="activeTab === 'leader' && details.currentUserAccess?.canManageGroup">
        <div class="cv-leader-grid">
          <!-- Add Workspace Member -->
          <div class="cv-leader-box">
            <h3>Enroll Workspace Member</h3>
            <div class="cv-candidate-row">
              <input
                type="text"
                [(ngModel)]="candidateSearch"
                (input)="searchCandidates()"
                placeholder="Search member by name or email..."
              />
              <select [(ngModel)]="assignRole">
                <option value="Member">Member</option>
                <option value="Coordinator">Coordinator</option>
                <option value="Secretary">{{ aliases.secretaryTitleAlias }}</option>
                <option value="CoChair">Co-Chair</option>
              </select>
            </div>
            <div class="cv-candidate-list" *ngIf="candidates.length > 0">
              <div class="cv-cand-item" *ngFor="let c of candidates">
                <div>
                  <strong>{{ c.fullName }}</strong>
                  <small>{{ c.email }}</small>
                </div>
                <button type="button" class="cv-btn-secondary" (click)="enrollCandidate(c.id)">Add</button>
              </div>
            </div>
          </div>

          <!-- Pending Applicants Queue -->
          <div class="cv-leader-box">
            <h3>Pending Intake Requests ({{ (details.pendingRegistrations || []).length }})</h3>
            <p class="cv-muted" *ngIf="(details.pendingRegistrations || []).length === 0">No pending join applications.</p>
            <div class="cv-cand-item" *ngFor="let reg of details.pendingRegistrations || []">
              <div>
                <strong>{{ reg.firstName }} {{ reg.lastName }}</strong>
                <small>{{ reg.email }} • {{ reg.isExternalApplicant ? 'External Link' : 'Workspace Member' }}</small>
              </div>
              <div class="cv-reg-btns">
                <button type="button" class="cv-btn-primary" (click)="reviewApplicant(reg.id, 'Approve')">Approve</button>
                <button type="button" class="cv-btn-danger" (click)="reviewApplicant(reg.id, 'Decline')">Decline</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <app-committees-ux-helpers
        [activeInfo]="activeInfo"
        (closeInfo)="activeInfo = null"
      ></app-committees-ux-helpers>
    </div>
  `,
  styles: [`
    .cv-shell { padding: 24px; max-width: 1400px; margin: 0 auto; display: flex; flex-direction: column; gap: 18px; }
    .cv-back-link { display: inline-flex; align-items: center; gap: 6px; color: #0050e5; text-decoration: none; font-size: 13px; font-weight: 600; }
    .cv-hero {
      background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 22px;
      display: flex; justify-content: space-between; align-items: flex-start; gap: 18px; flex-wrap: wrap;
    }
    :host-context(.dark-mode) .cv-hero, :host-context(.dark-mode) .cv-panel { background: #1e293b; border-color: rgba(255,255,255,0.08); }
    .cv-hero-left { display: flex; gap: 16px; align-items: flex-start; flex: 1; min-width: 280px; }
    .cv-hero-icon {
      width: 56px; height: 56px; border-radius: 14px; background: rgba(0, 80, 229, 0.1); color: #0050e5;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .cv-hero-icon .material-symbols-outlined { font-size: 28px; }
    .cv-chip-row { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 6px; }
    .cv-chip { font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 999px; background: #f1f5f9; color: #475569; }
    .cv-chip.primary { background: rgba(0, 80, 229, 0.12); color: #0050e5; }
    .cv-chip.role { background: rgba(16, 185, 129, 0.12); color: #059669; }
    .cv-title-row { display: flex; align-items: center; gap: 8px; }
    .cv-title-row h1 { margin: 0; font-size: 23px; font-weight: 800; color: #0f172a; }
    :host-context(.dark-mode) .cv-title-row h1 { color: #f8fafc; }
    .cv-info-btn { background: transparent; border: none; color: #0050e5; cursor: pointer; }
    .cv-desc { margin: 6px 0 8px; font-size: 14px; color: #475569; }
    :host-context(.dark-mode) .cv-desc { color: #cbd5e1; }
    .cv-schedule-row { display: flex; gap: 16px; flex-wrap: wrap; font-size: 12.5px; color: #64748b; }
    .cv-schedule-row span { display: inline-flex; align-items: center; gap: 5px; }
    .cv-schedule-row .material-symbols-outlined { font-size: 16px; color: #0050e5; }
    .cv-hero-actions { display: flex; gap: 10px; flex-wrap: wrap; }
    .cv-btn-primary, .cv-btn-secondary, .cv-btn-ghost, .cv-btn-danger {
      display: inline-flex; align-items: center; gap: 6px; padding: 9px 15px; border-radius: 10px;
      font-size: 13px; font-weight: 600; text-decoration: none; cursor: pointer; border: 1px solid transparent;
    }
    .cv-btn-primary { background: #0050e5; color: #ffffff; }
    .cv-btn-secondary { background: rgba(0, 80, 229, 0.08); color: #0050e5; border-color: rgba(0, 80, 229, 0.2); }
    .cv-btn-ghost { background: #f8fafc; color: #334155; border-color: #cbd5e1; }
    .cv-btn-danger { background: rgba(220, 38, 38, 0.1); color: #dc2626; border-color: rgba(220, 38, 38, 0.25); }
    .cv-toast {
      display: flex; align-items: center; gap: 8px; padding: 11px 16px; border-radius: 10px;
      background: rgba(0, 80, 229, 0.08); color: #0050e5; font-size: 13px; font-weight: 600;
    }
    .cv-tabs { display: flex; gap: 8px; flex-wrap: wrap; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; }
    .cv-tabs button {
      display: inline-flex; align-items: center; gap: 7px; padding: 9px 15px; border-radius: 10px;
      background: transparent; border: 1px solid transparent; font-size: 13px; font-weight: 600; color: #64748b; cursor: pointer;
    }
    .cv-tabs button.active { background: #0050e5; color: #ffffff; }
    .cv-panel { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 16px; }
    .cv-roster-grid, .cv-sub-grid, .cv-cloud-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 12px; }
    .cv-member-card, .cv-sub-card, .cv-cloud-card {
      display: flex; align-items: center; gap: 12px; padding: 13px 15px; border: 1px solid #e2e8f0;
      border-radius: 12px; text-decoration: none; color: inherit;
    }
    :host-context(.dark-mode) .cv-member-card, :host-context(.dark-mode) .cv-sub-card, :host-context(.dark-mode) .cv-cloud-card {
      border-color: rgba(255,255,255,0.1);
    }
    .cv-member-avatar, .cv-sub-icon, .cv-cloud-icon {
      width: 40px; height: 40px; border-radius: 10px; background: rgba(0, 80, 229, 0.1); color: #0050e5;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .cv-member-info, .cv-cloud-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .cv-member-info span, .cv-cloud-info span { font-size: 12px; color: #64748b; }
    .cv-role-pill { font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 999px; background: #f1f5f9; color: #475569; }
    .cv-role-pill.leader { background: rgba(0, 80, 229, 0.12); color: #0050e5; }
    .cv-report-list { display: flex; flex-direction: column; gap: 12px; }
    .cv-report-row {
      display: flex; justify-content: space-between; align-items: center; gap: 14px; flex-wrap: wrap;
      padding: 16px; border: 1px solid #e2e8f0; border-radius: 12px;
    }
    .cv-report-row h4 { margin: 0 0 4px; font-size: 15.5px; }
    .cv-report-row p { margin: 0 0 8px; font-size: 13px; color: #64748b; }
    .cv-report-meta { display: flex; gap: 14px; flex-wrap: wrap; font-size: 12px; color: #64748b; }
    .cv-report-meta span { display: inline-flex; align-items: center; gap: 4px; }
    .cv-report-meta .material-symbols-outlined { font-size: 15px; color: #0050e5; }
    .cv-report-detail { border-top: 2px solid #0050e5; padding-top: 18px; display: flex; flex-direction: column; gap: 12px; }
    .cv-detail-head { display: flex; justify-content: space-between; align-items: center; }
    .cv-ai-box { background: rgba(0, 80, 229, 0.06); border-left: 3px solid #0050e5; padding: 14px; border-radius: 10px; }
    .cv-ai-label { display: flex; align-items: center; gap: 6px; font-weight: 700; color: #0050e5; font-size: 12.5px; margin-bottom: 6px; }
    .cv-ai-box pre { margin: 0; white-space: pre-wrap; font-family: inherit; font-size: 13px; line-height: 1.55; }
    .cv-links-strip { display: flex; gap: 8px; flex-wrap: wrap; }
    .cv-doc-pill {
      display: inline-flex; align-items: center; gap: 5px; padding: 6px 12px; border-radius: 8px;
      background: #f1f5f9; color: #1e293b; text-decoration: none; font-size: 12.5px; font-weight: 600;
    }
    .cv-doc-pill.cloud { background: rgba(0, 80, 229, 0.1); color: #0050e5; }
    .cv-cloud-bar, .cv-cloud-form { display: flex; gap: 10px; flex-wrap: wrap; }
    .cv-cloud-form input { flex: 1; min-width: 220px; padding: 9px 12px; border: 1px solid #cbd5e1; border-radius: 9px; }
    .cv-cloud-btns, .cv-reg-btns { display: flex; gap: 6px; }
    .cv-iframe-box { border: 1px solid #cbd5e1; border-radius: 12px; padding: 12px; display: flex; flex-direction: column; gap: 10px; }
    .cv-iframe-box iframe { width: 100%; height: 480px; border: none; border-radius: 8px; }
    .cv-leader-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 18px; }
    .cv-leader-box { border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
    .cv-leader-box h3 { margin: 0; font-size: 16px; }
    .cv-candidate-row { display: flex; gap: 8px; }
    .cv-candidate-row input { flex: 1; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 8px; }
    .cv-candidate-row select { padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 8px; }
    .cv-cand-item { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
    .cv-cand-item div { display: flex; flex-direction: column; }
    .cv-cand-item small { color: #64748b; font-size: 12px; }
    .cv-empty { text-align: center; padding: 32px; color: #64748b; }
    .cv-empty .material-symbols-outlined { font-size: 36px; color: #0050e5; }
  `]
})
export class CommitteesMemberDetailComponent implements OnInit, OnDestroy {
  aliases: CommitteeAliases;
  committeeId = '';
  details: any | null = null;
  activeTab: 'roster' | 'subgroups' | 'reports' | 'cloud' | 'leader' = 'roster';

  selectedReport: any | null = null;
  showCloudLinkForm = false;
  newCloudTitle = '';
  newCloudUrl = '';
  previewTitle = '';
  previewEmbedUrl: SafeResourceUrl | null = null;

  candidateSearch = '';
  assignRole = 'Member';
  candidates: any[] = [];
  toastMessage = '';
  activeInfo: CommitteeInfoSpec | null = null;

  private routeSub?: Subscription;
  private aliasSub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private committeesService: CommitteesService,
    private sanitizer: DomSanitizer
  ) {
    this.aliases = this.committeesService.currentAliases;
  }

  ngOnInit(): void {
    this.aliasSub = this.committeesService.aliases$.subscribe((a) => (this.aliases = a));
    this.routeSub = this.route.paramMap.subscribe((params) => {
      this.committeeId = params.get('id') || '';
      if (this.committeeId) {
        this.loadDetails();
      }
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
    this.aliasSub?.unsubscribe();
  }

  loadDetails(): void {
    this.committeesService.getCommitteeDetails(this.committeeId).subscribe({
      next: (res) => {
        if (res?.isSuccess) {
          this.details = res.data;
        }
      }
    });
  }

  copyExternalLink(): void {
    const c = this.details?.committee;
    if (!c) return;
    const url = this.committeesService.buildExternalRegistrationUrl(
      c.slug,
      c.visibility === 'Private' ? c.externalInviteToken : undefined
    );
    navigator.clipboard?.writeText(url);
    this.showToast('External registration link copied to clipboard.');
  }

  openReportReader(reportId: string): void {
    this.committeesService.getReportById(reportId).subscribe({
      next: (res) => {
        if (res?.isSuccess) {
          this.selectedReport = res.data;
        }
      }
    });
  }

  async connectGoogleToShelf(): Promise<void> {
    const res = await this.committeesService.launchGoogleDrivePicker();
    if (res.picked) {
      this.committeesService
        .linkCloudDocument({
          committeeId: this.committeeId,
          provider: res.picked.provider,
          title: res.picked.title,
          documentUrl: res.picked.url,
          externalFileId: res.picked.externalFileId,
          isPinnedToShelf: true
        })
        .subscribe(() => {
          this.showToast('Google document linked to group shelf.');
          this.loadDetails();
        });
    } else {
      this.showCloudLinkForm = true;
    }
  }

  pinPastedCloudDoc(): void {
    if (!this.newCloudUrl.trim()) return;
    this.committeesService
      .linkCloudDocument({
        committeeId: this.committeeId,
        title: this.newCloudTitle.trim() || 'Shared Cloud Document',
        documentUrl: this.newCloudUrl.trim(),
        isPinnedToShelf: true
      })
      .subscribe({
        next: (res) => {
          if (res?.isSuccess) {
            this.newCloudTitle = '';
            this.newCloudUrl = '';
            this.showCloudLinkForm = false;
            this.showToast('Cloud document pinned to shelf.');
            this.loadDetails();
          }
        }
      });
  }

  previewDoc(doc: any): void {
    const url = doc.embedUrl || doc.documentUrl;
    if (!url) return;
    this.previewTitle = doc.title;
    this.previewEmbedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  getProviderIcon(provider: string): string {
    return this.committeesService.getProviderIcon(provider);
  }

  searchCandidates(): void {
    if (this.candidateSearch.trim().length < 2) {
      this.candidates = [];
      return;
    }
    this.committeesService.searchUserCandidates(this.candidateSearch).subscribe({
      next: (res) => {
        if (res?.isSuccess) this.candidates = res.data || [];
      }
    });
  }

  enrollCandidate(userProfileId: string): void {
    this.committeesService
      .addMember(this.committeeId, { userProfileId, role: this.assignRole })
      .subscribe({
        next: () => {
          this.candidateSearch = '';
          this.candidates = [];
          this.showToast('Member added to roster.');
          this.loadDetails();
        }
      });
  }

  reviewApplicant(regId: string, decision: 'Approve' | 'Decline'): void {
    this.committeesService
      .reviewRegistration(regId, { decision, assignedRole: 'Member' })
      .subscribe({
        next: () => {
          this.showToast(`Application ${decision.toLowerCase()}d.`);
          this.loadDetails();
        }
      });
  }

  openInfo(): void {
    this.activeInfo = {
      title: `${this.aliases.aliasSingular} Collaboration Hub`,
      purpose: `Centralizes your ${this.aliases.aliasSingular.toLowerCase()} roster, nested ${this.aliases.subGroupAliasPlural.toLowerCase()}, meeting minutes, and live Google Docs/Sheets shelf.`,
      inputs: `Pin Google Docs, Sheets, Notebooks, or Excel Online links directly onto the Cloud Shelf or submit structured meeting reports.`,
      impact: `Members stay aligned on schedules, decisions, and shared cloud documents without hunting across separate chat threads.`,
      bestPractices: `Group leaders can approve pending applicants and assign ${this.aliases.secretaryTitleAlias} portfolios from the Leader Tools tab.`
    };
  }

  private showToast(msg: string): void {
    this.toastMessage = msg;
    setTimeout(() => {
      if (this.toastMessage === msg) this.toastMessage = '';
    }, 3500);
  }
}

