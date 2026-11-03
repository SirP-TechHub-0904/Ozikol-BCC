import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
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
 * Member Directory & 1-Click Extra-Info Join Screen (M2 — /committees/workspace/discover).
 * Allows authenticated members to browse Public and ApprovalRequired Committees/Sub-Groups and join
 * using their existing workspace identity while answering ONLY supplemental Extra-Info questions.
 */
@Component({
  selector: 'app-committees-discover',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TranslatePipe, CommitteesUxHelpersComponent],
  template: `
    <div class="cd-shell">
      <header class="cd-header">
        <div>
          <span class="cd-eyebrow">{{ 'committees.eyebrow' | translate:'PEOPLE & COMMUNITY' }}</span>
          <div class="cd-title-row">
            <h1>{{ 'committees.browse_join' | translate:'Browse & Join' }} {{ aliases.aliasPlural }}</h1>
            <button type="button" class="cd-info-btn" (click)="openInfo()">
              <span class="material-symbols-outlined">info</span>
            </button>
          </div>
          <p class="cd-subtitle">
            {{ 'committees.core_identity_note' | translate:'Core member details (First Name, Last Name, Email, Phone) are already stored in the workspace. Add ONLY extra fields specific to your groups.' }}
          </p>
        </div>

        <div class="cd-actions">
          <button type="button" class="cd-btn-ghost" (click)="showTour = true">
            <span class="material-symbols-outlined">help</span>
            <span>{{ 'committees.tour_guide' | translate:'Tour Guide' }}</span>
          </button>
          <a routerLink="/committees/workspace/my" class="cd-btn-secondary">
            <span class="material-symbols-outlined">arrow_back</span>
            <span>{{ 'committees.my_groups' | translate:'My' }} {{ aliases.aliasPlural }}</span>
          </a>
        </div>
      </header>

      <!-- Feedback Banner -->
      <div class="cd-alert" *ngIf="bannerMessage" [class.error]="bannerError">
        <span class="material-symbols-outlined">{{ bannerError ? 'error' : 'check_circle' }}</span>
        <span>{{ bannerMessage }}</span>
        <button type="button" (click)="bannerMessage = ''"><span class="material-symbols-outlined">close</span></button>
      </div>

      <!-- Search & Filter -->
      <div class="cd-toolbar">
        <div class="cd-search">
          <span class="material-symbols-outlined">search</span>
          <input
            type="text"
            [(ngModel)]="searchTerm"
            [placeholder]="'committees.search_placeholder' | translate:'Search by name, code, or category tag...'"
          />
        </div>
        <div class="cd-pills">
          <button type="button" [class.active]="typeFilter === 'ALL'" (click)="typeFilter = 'ALL'">All Open</button>
          <button type="button" [class.active]="typeFilter === 'PRIMARY'" (click)="typeFilter = 'PRIMARY'">{{ aliases.aliasPlural }}</button>
          <button type="button" [class.active]="typeFilter === 'SUB'" (click)="typeFilter = 'SUB'">{{ aliases.subGroupAliasPlural }}</button>
        </div>
      </div>

      <!-- Loading -->
      <div class="cd-empty" *ngIf="loading">
        <span class="material-symbols-outlined spin">progress_activity</span>
        <p>Loading open {{ aliases.aliasPlural.toLowerCase() }}...</p>
      </div>

      <!-- Empty -->
      <div class="cd-empty" *ngIf="!loading && filteredCommittees.length === 0">
        <span class="material-symbols-outlined">travel_explore</span>
        <h3>No Open {{ aliases.aliasPlural }} Available</h3>
        <p>There are currently no discoverable {{ aliases.aliasPlural.toLowerCase() }} matching your search criteria.</p>
      </div>

      <!-- Directory Grid -->
      <div class="cd-grid" *ngIf="!loading && filteredCommittees.length > 0">
        <article class="cd-card" *ngFor="let item of filteredCommittees">
          <div class="cd-card-head">
            <div class="cd-icon">
              <span class="material-symbols-outlined">{{ item.iconName || 'diversity_3' }}</span>
            </div>
            <div class="cd-head-meta">
              <div class="cd-chips">
                <span class="cd-chip">{{ item.parentCommitteeId ? aliases.subGroupAliasSingular : aliases.aliasSingular }}</span>
                <span class="cd-chip approval" *ngIf="item.requiresApproval">
                  {{ 'committees.visibility_approval' | translate:'Approval Required' }}
                </span>
                <span class="cd-chip open" *ngIf="!item.requiresApproval">
                  {{ 'committees.visibility_public' | translate:'Public (Open Join)' }}
                </span>
              </div>
              <h3>{{ item.name }}</h3>
              <small *ngIf="item.parentCommitteeName">Parent: {{ item.parentCommitteeName }}</small>
            </div>
          </div>

          <p class="cd-desc">{{ item.description || item.missionStatement || 'Collaborate with fellow workspace members.' }}</p>

          <div class="cd-details">
            <span *ngIf="item.categoryTag"><span class="material-symbols-outlined">sell</span> {{ item.categoryTag }}</span>
            <span *ngIf="item.meetingSchedule"><span class="material-symbols-outlined">schedule</span> {{ item.meetingSchedule }}</span>
            <span>
              <span class="material-symbols-outlined">group</span>
              {{ item.memberCount }}{{ item.maxCapacity ? ' / ' + item.maxCapacity : '' }} Enrolled
            </span>
          </div>

          <div class="cd-footer">
            <a *ngIf="item.isJoined" [routerLink]="['/committees/workspace/view', item.id]" class="cd-btn-joined">
              <span class="material-symbols-outlined">verified</span>
              <span>{{ 'committees.joined_badge' | translate:'Enrolled' }} — Open Hub</span>
            </a>

            <button *ngIf="!item.isJoined && item.isPendingApproval" type="button" class="cd-btn-pending" disabled>
              <span class="material-symbols-outlined">hourglass_top</span>
              <span>{{ 'committees.status_pending' | translate:'Pending' }} Approval</span>
            </button>

            <button
              *ngIf="!item.isJoined && !item.isPendingApproval"
              type="button"
              class="cd-btn-primary"
              [disabled]="joiningId === item.id"
              (click)="initiateJoin(item)"
            >
              <span class="material-symbols-outlined">{{ item.requiresApproval ? 'how_to_reg' : 'person_add' }}</span>
              <span>
                {{ item.requiresApproval ? ('committees.request_to_join' | translate:'Request to Join') : ('committees.join_now' | translate:'Join Now') }}
              </span>
            </button>
          </div>
        </article>
      </div>

      <!-- Supplemental Extra-Info Join Modal (Explicit Close Only - Never auto-vanish on accidental backdrop click) -->
      <div class="cd-modal-backdrop" *ngIf="selectedGroup">
        <div class="cd-modal">
          <div class="cd-modal-header">
            <div>
              <span class="cd-eyebrow">SUPPLEMENTAL ONBOARDING</span>
              <h3>Join {{ selectedGroup.name }}</h3>
            </div>
            <button type="button" class="cd-close" (click)="closeJoinModal()">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <div class="cd-modal-body">
            <div class="cd-profile-notice">
              <span class="material-symbols-outlined">verified_user</span>
              <span>Your workspace identity (Name, Email &amp; Phone) is linked automatically. Complete the extra {{ selectedGroup.extraInfoForm?.title || 'questions' }} below.</span>
            </div>

            <div class="cd-field" *ngFor="let f of selectedGroup.extraInfoForm?.fields || []">
              <label>
                {{ f.label }}
                <span class="req" *ngIf="f.required">*</span>
              </label>

              <input
                *ngIf="f.type === 'text' || f.type === 'number' || f.type === 'date' || f.type === 'url'"
                [type]="f.type === 'url' ? 'url' : f.type"
                [(ngModel)]="extraAnswers[f.key]"
                [placeholder]="f.placeholder || 'Enter value'"
              />

              <textarea
                *ngIf="f.type === 'textarea'"
                rows="3"
                [(ngModel)]="extraAnswers[f.key]"
                [placeholder]="f.placeholder || 'Provide details'"
              ></textarea>

              <select *ngIf="f.type === 'select'" [(ngModel)]="extraAnswers[f.key]">
                <option value="">Select an option</option>
                <option *ngFor="let opt of f.options || []" [value]="opt">{{ opt }}</option>
              </select>

              <div class="cd-checkbox-list" *ngIf="f.type === 'multiselect'">
                <label class="cd-check-item" *ngFor="let opt of f.options || []">
                  <input
                    type="checkbox"
                    [checked]="isMultiSelected(f.key, opt)"
                    (change)="toggleMultiOption(f.key, opt)"
                  />
                  <span>{{ opt }}</span>
                </label>
              </div>

              <label class="cd-check-item" *ngIf="f.type === 'checkbox'">
                <input type="checkbox" [(ngModel)]="extraAnswers[f.key]" />
                <span>{{ f.placeholder || 'Yes, I confirm' }}</span>
              </label>

              <div class="cd-file-upload" *ngIf="f.type === 'file'">
                <input type="file" (change)="onExtraFileSelected($event, f.key)" />
                <span class="cd-uploaded-tag" *ngIf="extraAnswers[f.key]">
                  <span class="material-symbols-outlined">attach_file</span> File uploaded
                </span>
              </div>

              <small class="cd-help" *ngIf="f.helpText">{{ f.helpText }}</small>
            </div>
          </div>

          <div class="cd-modal-footer">
            <button type="button" class="cd-btn-ghost" (click)="closeJoinModal()">
              {{ 'committees.cancel' | translate:'Cancel' }}
            </button>
            <button type="button" class="cd-btn-primary" [disabled]="submittingModal || uploadingFile" (click)="submitExtraJoin()">
              <span class="material-symbols-outlined">check_circle</span>
              <span>{{ selectedGroup.requiresApproval ? ('committees.request_to_join' | translate:'Request to Join') : ('committees.join_now' | translate:'Join Now') }}</span>
            </button>
          </div>
        </div>
      </div>

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
    .cd-shell { display: flex; flex-direction: column; gap: 20px; width: 100%; }
    .cd-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
    .cd-eyebrow { font-size: 11px; font-weight: 700; letter-spacing: 0.8px; color: #0050e5; text-transform: uppercase; }
    .cd-title-row { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
    .cd-title-row h1 { margin: 0; font-size: 24px; font-weight: 800; color: #0f172a; }
    :host-context(.dark-mode) .cd-title-row h1 { color: #f8fafc; }
    .cd-subtitle { margin: 6px 0 0; font-size: 13.5px; color: #64748b; max-width: 720px; }
    .cd-info-btn { background: transparent; border: none; color: #0050e5; cursor: pointer; display: inline-flex; padding: 4px; }
    .cd-actions { display: flex; gap: 10px; flex-wrap: wrap; }
    .cd-btn-primary, .cd-btn-secondary, .cd-btn-ghost, .cd-btn-joined, .cd-btn-pending {
      display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 9px 16px;
      border-radius: 10px; font-size: 13px; font-weight: 600; text-decoration: none; cursor: pointer; border: 1px solid transparent;
    }
    .cd-btn-primary { background: #0050e5; color: #ffffff; width: 100%; }
    .cd-modal-footer .cd-btn-primary { width: auto; }
    .cd-btn-primary:hover:not(:disabled) { background: #003db3; }
    .cd-btn-secondary { background: rgba(0, 80, 229, 0.08); color: #0050e5; border-color: rgba(0, 80, 229, 0.2); }
    .cd-btn-ghost { background: #ffffff; color: #334155; border-color: #cbd5e1; }
    :host-context(.dark-mode) .cd-btn-ghost { background: #1e293b; color: #e2e8f0; border-color: rgba(255,255,255,0.12); }
    .cd-btn-joined { background: rgba(16, 185, 129, 0.1); color: #059669; border-color: rgba(16, 185, 129, 0.25); width: 100%; }
    .cd-btn-pending { background: #f8fafc; color: #64748b; border-color: #cbd5e1; width: 100%; cursor: not-allowed; }
    .cd-alert {
      display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: 12px;
      background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); color: #065f46; font-size: 13.5px; font-weight: 600;
    }
    .cd-alert.error { background: rgba(220, 38, 38, 0.08); border-color: rgba(220, 38, 38, 0.25); color: #dc2626; }
    .cd-alert button { margin-left: auto; background: transparent; border: none; color: inherit; cursor: pointer; }
    .cd-toolbar { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
    .cd-search {
      display: flex; align-items: center; gap: 8px; background: #ffffff; border: 1px solid #cbd5e1;
      border-radius: 10px; padding: 8px 12px; min-width: 280px; flex: 1; max-width: 440px;
    }
    :host-context(.dark-mode) .cd-search { background: #1e293b; border-color: rgba(255,255,255,0.12); }
    .cd-search input { border: none; outline: none; background: transparent; width: 100%; color: inherit; font-size: 13.5px; }
    .cd-pills { display: flex; gap: 6px; }
    .cd-pills button {
      background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 7px 14px;
      font-size: 12.5px; font-weight: 600; color: #475569; cursor: pointer;
    }
    .cd-pills button.active { background: #0050e5; border-color: #0050e5; color: #ffffff; }
    .cd-empty {
      background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 48px 24px;
      text-align: center; color: #64748b; display: flex; flex-direction: column; align-items: center; gap: 10px;
    }
    :host-context(.dark-mode) .cd-empty { background: #1e293b; border-color: rgba(255,255,255,0.08); }
    .cd-empty .material-symbols-outlined { font-size: 40px; color: #0050e5; }
    .cd-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(330px, 1fr)); gap: 16px; }
    .cd-card {
      background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px;
      display: flex; flex-direction: column; gap: 14px;
    }
    :host-context(.dark-mode) .cd-card { background: #1e293b; border-color: rgba(255,255,255,0.08); }
    .cd-card-head { display: flex; gap: 14px; align-items: flex-start; }
    .cd-icon {
      width: 46px; height: 46px; border-radius: 12px; background: rgba(0, 80, 229, 0.1); color: #0050e5;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .cd-chips { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 4px; }
    .cd-chip { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 999px; background: #f1f5f9; color: #475569; }
    .cd-chip.open { background: rgba(16, 185, 129, 0.12); color: #059669; }
    .cd-chip.approval { background: rgba(245, 158, 11, 0.14); color: #b45309; }
    .cd-head-meta h3 { margin: 0; font-size: 17px; font-weight: 700; color: #0f172a; }
    :host-context(.dark-mode) .cd-head-meta h3 { color: #f8fafc; }
    .cd-head-meta small { color: #64748b; font-size: 12px; }
    .cd-desc { margin: 0; font-size: 13.5px; color: #475569; line-height: 1.55; flex: 1; }
    :host-context(.dark-mode) .cd-desc { color: #cbd5e1; }
    .cd-details { display: flex; flex-wrap: wrap; gap: 12px; font-size: 12px; color: #64748b; padding-top: 8px; border-top: 1px solid #f1f5f9; }
    .cd-details span { display: inline-flex; align-items: center; gap: 4px; }
    .cd-details .material-symbols-outlined { font-size: 15px; color: #0050e5; }
    .cd-modal-backdrop {
      position: fixed; inset: 0; background: rgba(15, 23, 42, 0.55); backdrop-filter: blur(4px);
      z-index: 10400; display: flex; align-items: center; justify-content: center; padding: 16px;
    }
    .cd-modal {
      background: #ffffff; border-radius: 16px; width: 100%; max-width: 540px; overflow: hidden;
      border: 1px solid #e2e8f0; box-shadow: 0 24px 48px rgba(15, 23, 42, 0.22);
    }
    :host-context(.dark-mode) .cd-modal { background: #1e293b; border-color: rgba(255,255,255,0.1); }
    .cd-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 18px 22px; border-bottom: 1px solid #e2e8f0; }
    .cd-modal-header h3 { margin: 4px 0 0; font-size: 18px; font-weight: 700; }
    .cd-close { background: transparent; border: none; cursor: pointer; color: #64748b; }
    .cd-modal-body { padding: 20px 22px; max-height: 65vh; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; }
    .cd-profile-notice {
      display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px; border-radius: 10px;
      background: rgba(0, 80, 229, 0.07); color: #1e293b; font-size: 13px; line-height: 1.5;
    }
    :host-context(.dark-mode) .cd-profile-notice { color: #e2e8f0; background: rgba(0,80,229,0.18); }
    .cd-profile-notice .material-symbols-outlined { color: #0050e5; font-size: 20px; }
    .cd-field { display: flex; flex-direction: column; gap: 6px; }
    .cd-field label { font-size: 13px; font-weight: 600; color: #1e293b; }
    :host-context(.dark-mode) .cd-field label { color: #e2e8f0; }
    .cd-field .req { color: #dc2626; }
    .cd-field input[type="text"], .cd-field input[type="number"], .cd-field input[type="date"], .cd-field input[type="url"], .cd-field textarea, .cd-field select {
      border: 1px solid #cbd5e1; border-radius: 9px; padding: 9px 12px; font-size: 13.5px; background: #ffffff; color: #0f172a;
    }
    :host-context(.dark-mode) .cd-field input, :host-context(.dark-mode) .cd-field textarea, :host-context(.dark-mode) .cd-field select {
      background: #0f172a; border-color: rgba(255,255,255,0.14); color: #f8fafc;
    }
    .cd-checkbox-list { display: flex; flex-direction: column; gap: 6px; }
    .cd-check-item { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 500; }
    .cd-help { font-size: 12px; color: #64748b; }
    .cd-uploaded-tag { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; color: #0050e5; font-weight: 600; margin-top: 4px; }
    .cd-modal-footer { padding: 14px 22px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 10px; }
    .spin { animation: cdSpin 1s linear infinite; }
    @keyframes cdSpin { to { transform: rotate(360deg); } }
  `]
})
export class CommitteesDiscoverComponent implements OnInit, OnDestroy {
  aliases: CommitteeAliases;
  loading = false;
  committees: any[] = [];
  searchTerm = '';
  typeFilter: 'ALL' | 'PRIMARY' | 'SUB' = 'ALL';

  joiningId = '';
  selectedGroup: any | null = null;
  extraAnswers: Record<string, any> = {};
  uploadedAttachmentUrls: string[] = [];
  uploadingFile = false;
  submittingModal = false;

  bannerMessage = '';
  bannerError = false;

  activeInfo: CommitteeInfoSpec | null = null;
  showTour = false;
  tourSteps: CommitteeTourStep[] = [];

  private aliasSub?: Subscription;
  private readonly TOUR_KEY = 'committees_discover';

  constructor(private committeesService: CommitteesService) {
    this.aliases = this.committeesService.currentAliases;
  }

  ngOnInit(): void {
    this.aliasSub = this.committeesService.aliases$.subscribe((a) => {
      this.aliases = a;
      this.buildTourSteps();
    });
    this.buildTourSteps();
    this.loadDirectory();
  }

  ngOnDestroy(): void {
    this.aliasSub?.unsubscribe();
  }

  /**
   * Loads all Public and ApprovalRequired groups in the tenant directory.
   */
  loadDirectory(): void {
    this.loading = true;
    this.committeesService.discoverWorkspaceCommittees().subscribe({
      next: (res) => {
        this.loading = false;
        if (res?.isSuccess) {
          this.committees = res.data || [];
        }
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  get filteredCommittees(): any[] {
    const q = this.searchTerm.trim().toLowerCase();
    return this.committees.filter((c) => {
      if (this.typeFilter === 'PRIMARY' && c.parentCommitteeId) return false;
      if (this.typeFilter === 'SUB' && !c.parentCommitteeId) return false;
      if (!q) return true;
      return (
        (c.name || '').toLowerCase().includes(q) ||
        (c.categoryTag || '').toLowerCase().includes(q) ||
        (c.description || '').toLowerCase().includes(q)
      );
    });
  }

  /**
   * Joins immediately if no Extra-Info fields exist, or opens the supplemental Extra-Info modal.
   */
  initiateJoin(item: any): void {
    const fields = item.extraInfoForm?.fields || [];
    if (fields.length > 0) {
      this.selectedGroup = item;
      this.extraAnswers = {};
      this.uploadedAttachmentUrls = [];
      return;
    }

    this.joiningId = item.id;
    this.committeesService.joinFromWorkspace(item.id, { extraInfoResponses: {}, attachmentUrls: [] }).subscribe({
      next: (res) => {
        this.joiningId = '';
        this.bannerError = !res?.isSuccess;
        this.bannerMessage = res?.message || 'Enrollment request processed.';
        this.loadDirectory();
      },
      error: (err) => {
        this.joiningId = '';
        this.bannerError = true;
        this.bannerMessage = err?.error?.message || 'Unable to process enrollment right now.';
      }
    });
  }

  closeJoinModal(): void {
    this.selectedGroup = null;
    this.extraAnswers = {};
    this.uploadedAttachmentUrls = [];
  }

  isMultiSelected(key: string, opt: string): boolean {
    const arr = Array.isArray(this.extraAnswers[key]) ? this.extraAnswers[key] : [];
    return arr.includes(opt);
  }

  toggleMultiOption(key: string, opt: string): void {
    const arr = Array.isArray(this.extraAnswers[key]) ? [...this.extraAnswers[key]] : [];
    const idx = arr.indexOf(opt);
    if (idx >= 0) arr.splice(idx, 1);
    else arr.push(opt);
    this.extraAnswers[key] = arr;
  }

  onExtraFileSelected(event: Event, key: string): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploadingFile = true;
    this.committeesService.uploadAttachment(file).subscribe({
      next: (res) => {
        this.uploadingFile = false;
        if (res?.isSuccess && res.data?.fileUrl) {
          this.extraAnswers[key] = res.data.fileUrl;
          this.uploadedAttachmentUrls.push(res.data.fileUrl);
        }
      },
      error: () => {
        this.uploadingFile = false;
      }
    });
  }

  submitExtraJoin(): void {
    if (!this.selectedGroup) return;
    const fields: any[] = this.selectedGroup.extraInfoForm?.fields || [];
    for (const f of fields) {
      if (f.required) {
        const v = this.extraAnswers[f.key];
        if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) {
          this.bannerError = true;
          this.bannerMessage = `Please complete required field: ${f.label}`;
          return;
        }
      }
    }

    this.submittingModal = true;
    const groupId = this.selectedGroup.id;
    this.committeesService
      .joinFromWorkspace(groupId, {
        extraInfoResponses: this.extraAnswers,
        attachmentUrls: this.uploadedAttachmentUrls
      })
      .subscribe({
        next: (res) => {
          this.submittingModal = false;
          this.closeJoinModal();
          this.bannerError = !res?.isSuccess;
          this.bannerMessage = res?.message || 'Request submitted.';
          this.loadDirectory();
        },
        error: (err) => {
          this.submittingModal = false;
          this.bannerError = true;
          this.bannerMessage = err?.error?.message || 'Submission failed.';
        }
      });
  }

  openInfo(): void {
    this.activeInfo = {
      title: `Browse & Join ${this.aliases.aliasPlural}`,
      purpose: `Explore open ${this.aliases.aliasPlural.toLowerCase()} and ${this.aliases.subGroupAliasPlural.toLowerCase()} across your organization.`,
      inputs: `Your core identity (Name, Email, Phone) is linked automatically. Only group-specific supplemental fields are prompted when configured.`,
      impact: `Open groups enroll you immediately; approval-gated groups notify the ${this.aliases.leaderTitleAlias} for review.`,
      bestPractices: `Provide clear answers on supplemental skill or availability questions to help group leaders assign appropriate roles.`
    };
  }

  onTourClosed(): void {
    this.showTour = false;
    this.committeesService.markTourCompleted(this.TOUR_KEY);
  }

  private buildTourSteps(): void {
    this.tourSteps = [
      {
        icon: 'travel_explore',
        title: `Discover Open ${this.aliases.aliasPlural}`,
        description: `Browse public and approval-based ${this.aliases.aliasPlural.toLowerCase()} and nested ${this.aliases.subGroupAliasPlural.toLowerCase()}.`
      },
      {
        icon: 'verified_user',
        title: 'Zero Duplicate Typing',
        description: 'Because you are signed in, you never re-type your name, email, or phone number — only group-specific extra questions appear.'
      }
    ];
  }
}

