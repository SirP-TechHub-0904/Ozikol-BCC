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
 * Member Workspace Hub (M1 — /committees/workspace/my).
 * Displays all enrolled Committees & Sub-Groups for the signed-in member with dynamic terminology aliases,
 * role badges, pending join request tracker, and quick actions to open group hubs or compose meeting reports.
 */
@Component({
  selector: 'app-committees-member-hub',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TranslatePipe, CommitteesUxHelpersComponent],
  template: `
    <div class="cm-shell">
      <!-- Page Header -->
      <header class="cm-header">
        <div>
          <span class="cm-eyebrow">{{ 'committees.eyebrow' | translate:'PEOPLE & COMMUNITY' }}</span>
          <div class="cm-title-row">
            <h1>{{ 'committees.my_groups' | translate:'My' }} {{ aliases.aliasPlural }}</h1>
            <button type="button" class="cm-info-trigger" (click)="openHubInfo()" title="Section Information">
              <span class="material-symbols-outlined">info</span>
            </button>
          </div>
          <p class="cm-subtitle">
            Access your active {{ aliases.aliasPlural.toLowerCase() }}, {{ aliases.subGroupAliasPlural.toLowerCase() }}, meeting schedules, shared cloud shelves, and reporting workspace.
          </p>
        </div>

        <div class="cm-header-actions">
          <button type="button" class="cm-btn-ghost" (click)="startTour(true)">
            <span class="material-symbols-outlined">help</span>
            <span>{{ 'committees.tour_guide' | translate:'Tour Guide' }}</span>
          </button>
          <button type="button" class="cm-btn-ghost" (click)="loadMyHub()" [disabled]="loading">
            <span class="material-symbols-outlined">refresh</span>
            <span>{{ 'committees.refresh' | translate:'Refresh' }}</span>
          </button>
          <a routerLink="/committees/workspace/discover" class="cm-btn-secondary">
            <span class="material-symbols-outlined">explore</span>
            <span>{{ 'committees.browse_join' | translate:'Browse & Join' }} {{ aliases.aliasPlural }}</span>
          </a>
          <a routerLink="/committees/workspace/reports/compose" class="cm-btn-primary" *ngIf="hasAnyReportAccess">
            <span class="material-symbols-outlined">edit_document</span>
            <span>{{ 'committees.compose_report' | translate:'Compose Meeting Report' }}</span>
          </a>
        </div>
      </header>

      <!-- Summary KPI Strip -->
      <section class="cm-kpi-grid">
        <div class="cm-kpi-card">
          <div class="cm-kpi-icon"><span class="material-symbols-outlined">diversity_3</span></div>
          <div>
            <span class="cm-kpi-label">{{ 'committees.joined_badge' | translate:'Enrolled' }} {{ aliases.aliasPlural }}</span>
            <strong class="cm-kpi-val">{{ enrolledGroups.length }}</strong>
          </div>
        </div>
        <div class="cm-kpi-card">
          <div class="cm-kpi-icon"><span class="material-symbols-outlined">workspace_premium</span></div>
          <div>
            <span class="cm-kpi-label">Leadership Portfolios</span>
            <strong class="cm-kpi-val">{{ leaderCount }}</strong>
          </div>
        </div>
        <div class="cm-kpi-card">
          <div class="cm-kpi-icon"><span class="material-symbols-outlined">hourglass_top</span></div>
          <div>
            <span class="cm-kpi-label">{{ 'committees.status_pending' | translate:'Pending' }} Requests</span>
            <strong class="cm-kpi-val">{{ pendingRequests.length }}</strong>
          </div>
        </div>
        <div class="cm-kpi-card">
          <div class="cm-kpi-icon"><span class="material-symbols-outlined">cloud_done</span></div>
          <div>
            <span class="cm-kpi-label">Shared Cloud Docs</span>
            <strong class="cm-kpi-val">{{ totalCloudDocs }}</strong>
          </div>
        </div>
      </section>

      <!-- Pending Join Requests Banner -->
      <section class="cm-pending-strip" *ngIf="pendingRequests.length > 0">
        <div class="cm-pending-head">
          <span class="material-symbols-outlined">schedule</span>
          <strong>Awaiting Leadership Approval ({{ pendingRequests.length }})</strong>
        </div>
        <div class="cm-pending-pills">
          <span class="cm-pending-pill" *ngFor="let req of pendingRequests">
            <span class="material-symbols-outlined">pending</span>
            <span>{{ req.committeeName }}</span>
            <small>{{ req.submittedAt | date:'mediumDate' }}</small>
          </span>
        </div>
      </section>

      <!-- Filter Bar -->
      <div class="cm-toolbar" *ngIf="enrolledGroups.length > 0">
        <div class="cm-search-box">
          <span class="material-symbols-outlined">search</span>
          <input
            type="text"
            [(ngModel)]="searchTerm"
            [placeholder]="'committees.search_placeholder' | translate:'Search by name, code, or category tag...'"
          />
        </div>
        <div class="cm-filter-tabs">
          <button type="button" [class.active]="roleFilter === 'ALL'" (click)="roleFilter = 'ALL'">All ({{ enrolledGroups.length }})</button>
          <button type="button" [class.active]="roleFilter === 'LEADER'" (click)="roleFilter = 'LEADER'">My Leadership ({{ leaderCount }})</button>
          <button type="button" [class.active]="roleFilter === 'SUBGROUP'" (click)="roleFilter = 'SUBGROUP'">{{ aliases.subGroupAliasPlural }}</button>
        </div>
      </div>

      <!-- Loading Skeleton -->
      <div class="cm-loading" *ngIf="loading">
        <span class="material-symbols-outlined spin">progress_activity</span>
        <span>Loading your {{ aliases.aliasPlural.toLowerCase() }}...</span>
      </div>

      <!-- Empty State -->
      <div class="cm-empty-card" *ngIf="!loading && filteredGroups.length === 0">
        <div class="cm-empty-icon">
          <span class="material-symbols-outlined">groups</span>
        </div>
        <h3>No {{ aliases.aliasPlural }} Found</h3>
        <p *ngIf="enrolledGroups.length === 0">
          You are not enrolled in any {{ aliases.aliasSingular.toLowerCase() }} or {{ aliases.subGroupAliasSingular.toLowerCase() }} yet. Browse open {{ aliases.aliasPlural.toLowerCase() }} to join in one click.
        </p>
        <p *ngIf="enrolledGroups.length > 0">
          No enrolled {{ aliases.aliasPlural.toLowerCase() }} match your current filter.
        </p>
        <a routerLink="/committees/workspace/discover" class="cm-btn-primary">
          <span class="material-symbols-outlined">explore</span>
          <span>{{ 'committees.browse_join' | translate:'Browse & Join' }} {{ aliases.aliasPlural }}</span>
        </a>
      </div>

      <!-- Enrolled Groups Grid -->
      <div class="cm-cards-grid" *ngIf="!loading && filteredGroups.length > 0">
        <article class="cm-group-card" *ngFor="let g of filteredGroups">
          <div class="cm-card-top">
            <div class="cm-group-avatar">
              <span class="material-symbols-outlined">{{ g.iconName || 'diversity_3' }}</span>
            </div>
            <div class="cm-group-headings">
              <div class="cm-badges-row">
                <span class="cm-type-chip" [class.sub]="!!g.parentCommitteeId">
                  {{ g.parentCommitteeId ? aliases.subGroupAliasSingular : aliases.aliasSingular }}
                </span>
                <span class="cm-role-chip" [class.leader]="g.isLeader">
                  {{ g.customRoleTitle || g.myRoleDisplay || g.myRole }}
                </span>
              </div>
              <h3>{{ g.name }}</h3>
              <span class="cm-parent-hint" *ngIf="g.parentCommitteeName">
                Under {{ g.parentCommitteeName }}
              </span>
            </div>
          </div>

          <p class="cm-desc">{{ g.description || g.missionStatement || 'Active workspace collaboration unit.' }}</p>

          <div class="cm-meta-list">
            <div class="cm-meta-item" *ngIf="g.meetingSchedule">
              <span class="material-symbols-outlined">event_repeat</span>
              <span>{{ g.meetingSchedule }}</span>
            </div>
            <div class="cm-meta-stats">
              <span><strong class="num">{{ g.memberCount }}</strong> Members</span>
              <span><strong class="num">{{ g.reportsCount }}</strong> Reports</span>
              <span><strong class="num">{{ g.cloudDocsCount }}</strong> Cloud Docs</span>
            </div>
          </div>

          <div class="cm-card-actions">
            <a [routerLink]="['/committees/workspace/view', g.committeeId]" class="cm-btn-primary full">
              <span class="material-symbols-outlined">open_in_new</span>
              <span>Open Hub</span>
            </a>
            <a
              *ngIf="g.canSubmitReport"
              [routerLink]="['/committees/workspace/reports/compose']"
              [queryParams]="{ committeeId: g.committeeId }"
              class="cm-btn-secondary"
              title="Submit Meeting Report"
            >
              <span class="material-symbols-outlined">post_add</span>
              <span>Report</span>
            </a>
          </div>
        </article>
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
    .cm-shell { display: flex; flex-direction: column; gap: 20px; width: 100%; }
    .cm-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
    .cm-eyebrow { font-size: 11px; font-weight: 700; letter-spacing: 0.8px; color: #0050e5; text-transform: uppercase; }
    .cm-title-row { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
    .cm-title-row h1 { margin: 0; font-size: 24px; font-weight: 800; color: #0f172a; }
    :host-context(.dark-mode) .cm-title-row h1 { color: #f8fafc; }
    .cm-subtitle { margin: 6px 0 0; font-size: 14px; color: #64748b; max-width: 680px; }
    .cm-info-trigger { background: transparent; border: none; color: #0050e5; cursor: pointer; display: inline-flex; padding: 4px; border-radius: 50%; }
    .cm-header-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .cm-btn-primary, .cm-btn-secondary, .cm-btn-ghost {
      display: inline-flex; align-items: center; gap: 7px; padding: 9px 15px; border-radius: 10px;
      font-size: 13px; font-weight: 600; text-decoration: none; cursor: pointer; border: 1px solid transparent; transition: all 0.18s;
    }
    .cm-btn-primary { background: #0050e5; color: #ffffff; }
    .cm-btn-primary:hover { background: #003db3; }
    .cm-btn-primary.full { flex: 1; justify-content: center; }
    .cm-btn-secondary { background: rgba(0, 80, 229, 0.08); color: #0050e5; border-color: rgba(0, 80, 229, 0.2); }
    .cm-btn-secondary:hover { background: rgba(0, 80, 229, 0.14); }
    .cm-btn-ghost { background: #ffffff; color: #334155; border-color: #e2e8f0; }
    :host-context(.dark-mode) .cm-btn-ghost { background: #1e293b; color: #e2e8f0; border-color: rgba(255,255,255,0.1); }
    .cm-kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 14px; }
    .cm-kpi-card {
      background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px 18px;
      display: flex; align-items: center; gap: 14px;
    }
    :host-context(.dark-mode) .cm-kpi-card { background: #1e293b; border-color: rgba(255,255,255,0.08); }
    .cm-kpi-icon {
      width: 44px; height: 44px; border-radius: 12px; background: rgba(0, 80, 229, 0.1); color: #0050e5;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .cm-kpi-label { display: block; font-size: 12px; color: #64748b; font-weight: 600; }
    .cm-kpi-val { font-size: 22px; font-weight: 800; color: #0f172a; }
    :host-context(.dark-mode) .cm-kpi-val { color: #f8fafc; }
    .cm-pending-strip {
      background: rgba(0, 80, 229, 0.05); border: 1px solid rgba(0, 80, 229, 0.2); border-radius: 12px;
      padding: 14px 18px; display: flex; flex-direction: column; gap: 10px;
    }
    .cm-pending-head { display: flex; align-items: center; gap: 8px; color: #0050e5; font-size: 13px; }
    .cm-pending-pills { display: flex; flex-wrap: wrap; gap: 8px; }
    .cm-pending-pill {
      display: inline-flex; align-items: center; gap: 6px; background: #ffffff; border: 1px solid #cbd5e1;
      padding: 5px 12px; border-radius: 999px; font-size: 12.5px; font-weight: 600; color: #1e293b;
    }
    .cm-pending-pill small { color: #64748b; font-weight: 500; }
    .cm-toolbar { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; align-items: center; }
    .cm-search-box {
      display: flex; align-items: center; gap: 8px; background: #ffffff; border: 1px solid #cbd5e1;
      border-radius: 10px; padding: 8px 12px; min-width: 280px; flex: 1; max-width: 420px;
    }
    :host-context(.dark-mode) .cm-search-box { background: #1e293b; border-color: rgba(255,255,255,0.12); }
    .cm-search-box input { border: none; outline: none; width: 100%; background: transparent; font-size: 13.5px; color: inherit; }
    .cm-filter-tabs { display: flex; gap: 6px; flex-wrap: wrap; }
    .cm-filter-tabs button {
      background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 7px 13px;
      font-size: 12.5px; font-weight: 600; color: #475569; cursor: pointer;
    }
    .cm-filter-tabs button.active { background: #0050e5; border-color: #0050e5; color: #ffffff; }
    .cm-loading, .cm-empty-card {
      background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 48px 24px;
      text-align: center; display: flex; flex-direction: column; align-items: center; gap: 12px;
    }
    :host-context(.dark-mode) .cm-loading, :host-context(.dark-mode) .cm-empty-card { background: #1e293b; border-color: rgba(255,255,255,0.08); }
    .cm-empty-icon {
      width: 56px; height: 56px; border-radius: 16px; background: rgba(0, 80, 229, 0.1); color: #0050e5;
      display: flex; align-items: center; justify-content: center;
    }
    .cm-cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(330px, 1fr)); gap: 16px; }
    .cm-group-card {
      background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px;
      display: flex; flex-direction: column; gap: 14px; transition: box-shadow 0.2s, transform 0.2s;
    }
    :host-context(.dark-mode) .cm-group-card { background: #1e293b; border-color: rgba(255,255,255,0.08); }
    .cm-group-card:hover { box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08); transform: translateY(-2px); }
    .cm-card-top { display: flex; align-items: flex-start; gap: 14px; }
    .cm-group-avatar {
      width: 46px; height: 46px; border-radius: 12px; background: rgba(0, 80, 229, 0.1); color: #0050e5;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .cm-group-headings { flex: 1; min-width: 0; }
    .cm-badges-row { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 5px; }
    .cm-type-chip, .cm-role-chip { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 999px; }
    .cm-type-chip { background: #f1f5f9; color: #475569; }
    .cm-type-chip.sub { background: rgba(14, 165, 233, 0.12); color: #0284c7; }
    .cm-role-chip { background: rgba(100, 116, 139, 0.12); color: #334155; }
    .cm-role-chip.leader { background: rgba(0, 80, 229, 0.12); color: #0050e5; }
    .cm-group-headings h3 { margin: 0; font-size: 17px; font-weight: 700; color: #0f172a; }
    :host-context(.dark-mode) .cm-group-headings h3 { color: #f8fafc; }
    .cm-parent-hint { font-size: 12px; color: #64748b; }
    .cm-desc { margin: 0; font-size: 13.5px; color: #475569; line-height: 1.55; flex: 1; }
    :host-context(.dark-mode) .cm-desc { color: #cbd5e1; }
    .cm-meta-list { display: flex; flex-direction: column; gap: 8px; padding-top: 10px; border-top: 1px solid #f1f5f9; font-size: 12.5px; color: #64748b; }
    :host-context(.dark-mode) .cm-meta-list { border-top-color: rgba(255,255,255,0.08); }
    .cm-meta-item { display: flex; align-items: center; gap: 6px; }
    .cm-meta-item .material-symbols-outlined { font-size: 16px; color: #0050e5; }
    .cm-meta-stats { display: flex; justify-content: space-between; gap: 8px; }
    .cm-meta-stats .num { color: #0f172a; }
    :host-context(.dark-mode) .cm-meta-stats .num { color: #f8fafc; }
    .cm-card-actions { display: flex; gap: 8px; margin-top: 4px; }
    .spin { animation: cmSpin 1s linear infinite; }
    @keyframes cmSpin { to { transform: rotate(360deg); } }
  `]
})
export class CommitteesMemberHubComponent implements OnInit, OnDestroy {
  aliases: CommitteeAliases;
  loading = false;
  enrolledGroups: any[] = [];
  pendingRequests: any[] = [];
  searchTerm = '';
  roleFilter: 'ALL' | 'LEADER' | 'SUBGROUP' = 'ALL';

  activeInfo: CommitteeInfoSpec | null = null;
  showTour = false;
  tourSteps: CommitteeTourStep[] = [];

  private aliasSub?: Subscription;
  private readonly TOUR_KEY = 'committees_member_hub';

  constructor(private committeesService: CommitteesService) {
    this.aliases = this.committeesService.currentAliases;
  }

  ngOnInit(): void {
    this.aliasSub = this.committeesService.aliases$.subscribe((a) => {
      this.aliases = a;
      this.buildTourSteps();
    });
    this.buildTourSteps();
    this.loadMyHub();

    if (!this.committeesService.hasCompletedTour(this.TOUR_KEY)) {
      this.showTour = true;
    }
  }

  ngOnDestroy(): void {
    this.aliasSub?.unsubscribe();
  }

  /**
   * Fetches the authenticated member's enrolled groups and pending join applications.
   */
  loadMyHub(): void {
    this.loading = true;
    this.committeesService.getMyWorkspaceCommittees().subscribe({
      next: (res) => {
        this.loading = false;
        if (res?.isSuccess && res.data) {
          this.enrolledGroups = res.data.enrolledCommittees || [];
          this.pendingRequests = res.data.myPendingRequests || [];
        }
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  get filteredGroups(): any[] {
    const q = this.searchTerm.trim().toLowerCase();
    return this.enrolledGroups.filter((g) => {
      if (this.roleFilter === 'LEADER' && !g.isLeader) return false;
      if (this.roleFilter === 'SUBGROUP' && !g.parentCommitteeId) return false;
      if (!q) return true;
      return (
        (g.name || '').toLowerCase().includes(q) ||
        (g.categoryTag || '').toLowerCase().includes(q) ||
        (g.myRoleDisplay || '').toLowerCase().includes(q)
      );
    });
  }

  get leaderCount(): number {
    return this.enrolledGroups.filter((g) => g.isLeader).length;
  }

  get totalCloudDocs(): number {
    return this.enrolledGroups.reduce((sum, g) => sum + (g.cloudDocsCount || 0), 0);
  }

  get hasAnyReportAccess(): boolean {
    return this.enrolledGroups.some((g) => g.canSubmitReport);
  }

  openHubInfo(): void {
    this.activeInfo = {
      title: `My ${this.aliases.aliasPlural} Hub`,
      purpose: `Displays every ${this.aliases.aliasSingular.toLowerCase()} and ${this.aliases.subGroupAliasSingular.toLowerCase()} you belong to, along with your assigned portfolio role and reporting access.`,
      inputs: `Filter by leadership role or search by group name. Click Open Hub to view rosters, meeting minutes, and pinned Google Docs or Notebooks.`,
      impact: `Leaders and authorized secretaries can launch the Meeting Report Composer directly from each card.`,
      bestPractices: `Keep your shared cloud documents pinned inside each ${this.aliases.aliasSingular.toLowerCase()} hub so members always read live agendas and spreadsheets.`
    };
  }

  startTour(force = false): void {
    if (force || !this.committeesService.hasCompletedTour(this.TOUR_KEY)) {
      this.showTour = true;
    }
  }

  onTourClosed(): void {
    this.showTour = false;
    this.committeesService.markTourCompleted(this.TOUR_KEY);
  }

  private buildTourSteps(): void {
    this.tourSteps = [
      {
        icon: 'diversity_3',
        title: `Your Enrolled ${this.aliases.aliasPlural}`,
        description: `View every ${this.aliases.aliasSingular.toLowerCase()} and nested ${this.aliases.subGroupAliasSingular.toLowerCase()} you belong to, including your role badge and meeting schedule.`
      },
      {
        icon: 'post_add',
        title: 'Multi-Modal Meeting Reports',
        description: `When assigned as ${this.aliases.leaderTitleAlias}, ${this.aliases.secretaryTitleAlias}, or authorized reporter, click Report to submit minutes, roll-call attendance, file uploads, or Google Docs/Sheets.`
      },
      {
        icon: 'explore',
        title: `One-Click Join Without Duplicate Typing`,
        description: `Use Browse & Join ${this.aliases.aliasPlural} to join open groups using your existing workspace profile — only group-specific extra questions are requested.`
      }
    ];
  }
}

