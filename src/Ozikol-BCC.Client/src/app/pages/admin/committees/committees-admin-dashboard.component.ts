import { Component, OnInit, AfterViewInit, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Chart, registerables } from 'chart.js';
import { PageHeaderComponent, PageHeaderButton } from '../../../shared/components/page-header/page-header.component';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { TranslationService } from '../../../core/services/translation.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  CommitteesService,
  CommitteeAliases,
  CommitteeInfoSpec,
  CommitteeTourStep
} from '../../../core/services/committees.service';
import { CommitteesUxHelpersComponent } from '../../../shared/components/committees-ux-helpers/committees-ux-helpers.component';

Chart.register(...registerables);

/**
 * Administrator Graphical & Card Statistics Dashboard (A1) for bcp-committees.
 * Renders 100% live tenant database metrics, Chart.js analytics, recent reports, and pending intake feeds.
 */
@Component({
  selector: 'app-committees-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, PageHeaderComponent, TranslatePipe, CommitteesUxHelpersComponent],
  template: `
    <div class="comm-page">
      <app-page-header
        [eyebrow]="'committees.eyebrow' | translate:'PEOPLE & COMMUNITY'"
        icon="diversity_3"
        [title]="aliases.aliasPlural + ' ' + ('committees.dashboard' | translate:'Dashboard')"
        [subtitle]="'Live telemetry, attendance pulse, meeting reports, and enrollment analytics across all ' + aliases.aliasPlural.toLowerCase() + '.'"
        [buttons]="headerButtons"
        [loading]="loading"
      ></app-page-header>

      <!-- Quick Sub-Navigation Strip -->
      <div class="comm-subnav">
        <a routerLink="/committees/console/dashboard" class="comm-subnav-link active">
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
          <span class="pill-count" *ngIf="kpis.pendingRegistrations > 0">{{ kpis.pendingRegistrations }}</span>
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

      <!-- KPI Cards Grid -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-head">
            <span class="kpi-label">Active {{ aliases.aliasPlural }}</span>
            <button type="button" class="info-icon-btn" (click)="openInfo('active_groups')">
              <span class="material-symbols-outlined">info</span>
            </button>
          </div>
          <div class="kpi-val">{{ kpis.activeCommittees }} <span class="kpi-total">/ {{ kpis.totalCommittees }}</span></div>
          <div class="kpi-foot">
            <span class="material-symbols-outlined">account_tree</span>
            <span>{{ kpis.totalSubGroups }} {{ aliases.subGroupAliasPlural }}</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-head">
            <span class="kpi-label">{{ 'committees.kpi_enrolled_members' | translate:'Enrolled Members' }}</span>
            <button type="button" class="info-icon-btn" (click)="openInfo('enrolled_members')">
              <span class="material-symbols-outlined">info</span>
            </button>
          </div>
          <div class="kpi-val">{{ kpis.distinctEnrolledMembers }}</div>
          <div class="kpi-foot">
            <span class="material-symbols-outlined">badge</span>
            <span>{{ kpis.totalSeatEnrollments }} total seat assignments</span>
          </div>
        </div>

        <div class="kpi-card highlight-card" routerLink="/committees/console/registrations">
          <div class="kpi-head">
            <span class="kpi-label">{{ 'committees.kpi_pending_intake' | translate:'Pending Registrations' }}</span>
            <button type="button" class="info-icon-btn" (click)="openInfo('pending_intake'); $event.stopPropagation()">
              <span class="material-symbols-outlined">info</span>
            </button>
          </div>
          <div class="kpi-val" [class.text-blue]="kpis.pendingRegistrations > 0">{{ kpis.pendingRegistrations }}</div>
          <div class="kpi-foot">
            <span class="material-symbols-outlined">link</span>
            <span>{{ kpis.activeExtraForms }} active Extra-Info form(s)</span>
          </div>
        </div>

        <div class="kpi-card" routerLink="/committees/console/reports">
          <div class="kpi-head">
            <span class="kpi-label">{{ 'committees.kpi_reports_month' | translate:'Reports This Month' }}</span>
            <button type="button" class="info-icon-btn" (click)="openInfo('reports_month'); $event.stopPropagation()">
              <span class="material-symbols-outlined">info</span>
            </button>
          </div>
          <div class="kpi-val">{{ kpis.reportsThisMonth }}</div>
          <div class="kpi-foot">
            <span class="material-symbols-outlined">cloud_done</span>
            <span>{{ kpis.connectedCloudDocs }} connected Cloud Docs/Sheets</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-head">
            <span class="kpi-label">{{ 'committees.kpi_attendance_rate' | translate:'Avg. Attendance Pulse' }}</span>
            <button type="button" class="info-icon-btn" (click)="openInfo('attendance')">
              <span class="material-symbols-outlined">info</span>
            </button>
          </div>
          <div class="kpi-val">{{ kpis.averageAttendanceRate }}%</div>
          <div class="kpi-foot">
            <span class="material-symbols-outlined">fact_check</span>
            <span>Across {{ kpis.totalReportsAllTime }} total meeting report(s)</span>
          </div>
        </div>
      </div>

      <!-- Visual Charts Row -->
      <div class="charts-row">
        <div class="panel-card chart-panel">
          <div class="panel-header">
            <div>
              <h3>{{ 'committees.chart_monthly_trends' | translate:'6-Month Reports & Attendance Pulse' }}</h3>
              <p>Monthly report submissions compared against recorded roll-call participation (%).</p>
            </div>
            <button type="button" class="info-icon-btn" (click)="openInfo('monthly_chart')">
              <span class="material-symbols-outlined">info</span>
            </button>
          </div>
          <div class="chart-canvas-wrap">
            <canvas #monthlyTrendCanvas></canvas>
          </div>
        </div>

        <div class="panel-card chart-panel">
          <div class="panel-header">
            <div>
              <h3>{{ aliases.aliasSingular }} {{ 'committees.chart_distribution' | translate:'Membership Distribution' }}</h3>
              <p>Active member roster count across top {{ aliases.aliasPlural.toLowerCase() }}.</p>
            </div>
            <button type="button" class="info-icon-btn" (click)="openInfo('distribution_chart')">
              <span class="material-symbols-outlined">info</span>
            </button>
          </div>
          <div class="chart-canvas-wrap" *ngIf="membershipDistribution.length > 0">
            <canvas #distributionCanvas></canvas>
          </div>
          <div class="empty-inline" *ngIf="membershipDistribution.length === 0 && !loading">
            <span class="material-symbols-outlined">bar_chart</span>
            <p>{{ 'committees.empty_dashboard_desc' | translate }}</p>
            <a routerLink="/committees/console/manage" class="btn-outline-sm">
              {{ 'committees.create_new' | translate:'Create New' }} {{ aliases.aliasSingular }}
            </a>
          </div>
        </div>
      </div>

      <!-- Live Activity Feeds Row -->
      <div class="feeds-row">
        <!-- Recent Reports -->
        <div class="panel-card">
          <div class="panel-header">
            <div>
              <h3>{{ 'committees.recent_reports' | translate:'Recent Meeting Reports' }}</h3>
              <p>Latest minutes, spreadsheets, and connected cloud notebooks.</p>
            </div>
            <a routerLink="/committees/console/reports" class="link-action">View All</a>
          </div>

          <div class="feed-list" *ngIf="recentReports.length > 0">
            <div class="feed-item" *ngFor="let r of recentReports" routerLink="/committees/console/reports" [queryParams]="{ id: r.id }">
              <div class="feed-icon">
                <span class="material-symbols-outlined">description</span>
              </div>
              <div class="feed-meta">
                <div class="feed-title">{{ r.title }}</div>
                <div class="feed-sub">{{ r.committeeName }} • By {{ r.submittedByName }} • {{ r.meetingDate | date:'mediumDate' }}</div>
              </div>
              <span class="status-pill" [ngClass]="'st-' + (r.reviewStatus || 'Submitted').toLowerCase()">
                {{ r.reviewStatus }}
              </span>
            </div>
          </div>

          <div class="empty-inline" *ngIf="recentReports.length === 0 && !loading">
            <span class="material-symbols-outlined">assignment</span>
            <p>No meeting reports submitted yet.</p>
          </div>
        </div>

        <!-- Recent Registrations -->
        <div class="panel-card">
          <div class="panel-header">
            <div>
              <h3>{{ 'committees.recent_registrations' | translate:'Recent Intake Applications' }}</h3>
              <p>Applicants from external links and internal join requests.</p>
            </div>
            <a routerLink="/committees/console/registrations" class="link-action">Review Queue</a>
          </div>

          <div class="feed-list" *ngIf="recentRegistrations.length > 0">
            <div class="feed-item" *ngFor="let reg of recentRegistrations" routerLink="/committees/console/registrations">
              <div class="feed-icon" [class.ext-icon]="reg.isExternalApplicant">
                <span class="material-symbols-outlined">{{ reg.isExternalApplicant ? 'public' : 'person_add' }}</span>
              </div>
              <div class="feed-meta">
                <div class="feed-title">{{ reg.fullName }}</div>
                <div class="feed-sub">{{ reg.committeeName }} • {{ reg.isExternalApplicant ? 'External Link' : 'Member Portal' }} • {{ reg.submittedAt | date:'short' }}</div>
              </div>
              <span class="status-pill" [ngClass]="'st-' + (reg.status || 'Pending').toLowerCase()">
                {{ reg.status }}
              </span>
            </div>
          </div>

          <div class="empty-inline" *ngIf="recentRegistrations.length === 0 && !loading">
            <span class="material-symbols-outlined">how_to_reg</span>
            <p>No pending or historical registrations yet.</p>
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
    .comm-page { display: flex; flex-direction: column; gap: 20px; }
    .comm-subnav {
      display: flex; flex-wrap: wrap; gap: 8px;
      background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 8px;
    }
    :host-context(.dark-mode) .comm-subnav { background: #1e293b; border-color: rgba(255,255,255,0.08); }
    .comm-subnav-link {
      display: inline-flex; align-items: center; gap: 7px; padding: 8px 14px;
      border-radius: 8px; font-size: 13px; font-weight: 600; color: #475569; text-decoration: none;
      transition: all 0.15s ease;
    }
    :host-context(.dark-mode) .comm-subnav-link { color: #cbd5e1; }
    .comm-subnav-link .material-symbols-outlined { font-size: 18px; }
    .comm-subnav-link:hover { background: rgba(0, 80, 229, 0.06); color: #0050e5; }
    .comm-subnav-link.active { background: #0050e5; color: #ffffff; }
    .pill-count {
      background: #ef4444; color: #ffffff; font-size: 11px; font-weight: 700;
      padding: 1px 7px; border-radius: 999px;
    }

    .kpi-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 16px;
    }
    .kpi-card {
      background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px;
      display: flex; flex-direction: column; gap: 8px; cursor: default;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }
    .kpi-card[routerLink] { cursor: pointer; }
    .kpi-card[routerLink]:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,80,229,0.08); }
    :host-context(.dark-mode) .kpi-card { background: #1e293b; border-color: rgba(255,255,255,0.08); }
    .kpi-head { display: flex; justify-content: space-between; align-items: center; }
    .kpi-label { font-size: 12.5px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.4px; }
    .kpi-val { font-size: 28px; font-weight: 800; color: #0f172a; line-height: 1.1; }
    :host-context(.dark-mode) .kpi-val { color: #f8fafc; }
    .kpi-val.text-blue { color: #0050e5; }
    .kpi-total { font-size: 15px; font-weight: 600; color: #94a3b8; }
    .kpi-foot { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #64748b; }
    .kpi-foot .material-symbols-outlined { font-size: 16px; color: #0050e5; }

    .info-icon-btn {
      background: transparent; border: none; color: #94a3b8; cursor: pointer; padding: 2px;
      display: inline-flex; align-items: center; border-radius: 50%;
    }
    .info-icon-btn:hover { color: #0050e5; background: rgba(0,80,229,0.08); }
    .info-icon-btn .material-symbols-outlined { font-size: 18px; }

    .charts-row, .feeds-row {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(380px, 1fr)); gap: 18px;
    }
    .panel-card {
      background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px;
      display: flex; flex-direction: column; gap: 16px;
    }
    :host-context(.dark-mode) .panel-card { background: #1e293b; border-color: rgba(255,255,255,0.08); }
    .panel-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
    .panel-header h3 { margin: 0; font-size: 16px; font-weight: 700; color: #0f172a; }
    :host-context(.dark-mode) .panel-header h3 { color: #f8fafc; }
    .panel-header p { margin: 3px 0 0; font-size: 12.5px; color: #64748b; }
    .link-action { font-size: 12.5px; font-weight: 700; color: #0050e5; text-decoration: none; white-space: nowrap; }
    .chart-canvas-wrap { position: relative; height: 250px; width: 100%; }

    .feed-list { display: flex; flex-direction: column; gap: 10px; }
    .feed-item {
      display: flex; align-items: center; gap: 12px; padding: 10px 12px;
      border: 1px solid #f1f5f9; border-radius: 10px; cursor: pointer; transition: background 0.15s;
    }
    :host-context(.dark-mode) .feed-item { border-color: rgba(255,255,255,0.06); }
    .feed-item:hover { background: rgba(0,80,229,0.04); }
    .feed-icon {
      width: 38px; height: 38px; border-radius: 10px; background: rgba(0,80,229,0.1); color: #0050e5;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .feed-icon.ext-icon { background: rgba(16, 185, 129, 0.12); color: #059669; }
    .feed-meta { flex: 1; min-width: 0; }
    .feed-title { font-size: 13.5px; font-weight: 700; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    :host-context(.dark-mode) .feed-title { color: #f8fafc; }
    .feed-sub { font-size: 12px; color: #64748b; margin-top: 2px; }

    .status-pill {
      font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 999px;
      background: #f1f5f9; color: #475569;
    }
    .st-reviewed, .st-approved { background: #dcfce7; color: #166534; }
    .st-pending, .st-submitted { background: rgba(0,80,229,0.12); color: #0050e5; }
    .st-actionneeded, .st-declined { background: #fee2e2; color: #b91c1c; }

    .empty-inline {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 34px 16px; text-align: center; color: #64748b; gap: 8px;
    }
    .empty-inline .material-symbols-outlined { font-size: 36px; color: #94a3b8; }
    .empty-inline p { margin: 0; font-size: 13px; max-width: 320px; }
    .btn-outline-sm {
      margin-top: 6px; padding: 7px 14px; border: 1px solid #0050e5; color: #0050e5;
      border-radius: 8px; font-size: 12.5px; font-weight: 600; text-decoration: none;
    }
  `]
})
export class CommitteesAdminDashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('monthlyTrendCanvas') monthlyTrendCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('distributionCanvas') distributionCanvas?: ElementRef<HTMLCanvasElement>;

  aliases: CommitteeAliases;
  loading = false;
  headerButtons: PageHeaderButton[] = [];

  kpis: any = {
    totalCommittees: 0,
    activeCommittees: 0,
    totalSubGroups: 0,
    distinctEnrolledMembers: 0,
    totalSeatEnrollments: 0,
    pendingRegistrations: 0,
    reportsThisMonth: 0,
    totalReportsAllTime: 0,
    averageAttendanceRate: 0,
    connectedCloudDocs: 0,
    activeExtraForms: 0
  };

  monthlyTrends: any[] = [];
  membershipDistribution: any[] = [];
  recentReports: any[] = [];
  recentRegistrations: any[] = [];

  activeInfo: CommitteeInfoSpec | null = null;
  showTour = false;
  tourSteps: CommitteeTourStep[] = [];

  private trendChart?: Chart;
  private distChart?: Chart;
  private sub?: Subscription;

  constructor(
    private committeesService: CommitteesService,
    private toast: ToastService,
    private translation: TranslationService,
    private router: Router
  ) {
    this.aliases = this.committeesService.currentAliases;
  }

  ngOnInit(): void {
    this.sub = this.committeesService.aliases$.subscribe((a) => {
      this.aliases = a;
      this.buildHeaderButtons();
      this.buildTourSteps();
    });

    this.buildHeaderButtons();
    this.buildTourSteps();
    this.loadDashboard();

    if (!this.committeesService.hasCompletedTour('committees_admin_dashboard')) {
      this.showTour = true;
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.renderCharts(), 150);
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.trendChart?.destroy();
    this.distChart?.destroy();
  }

  buildHeaderButtons(): void {
    this.headerButtons = [
      {
        text: this.translation.translate('committees.tour_guide', 'Tour Guide'),
        icon: 'help',
        action: () => { this.showTour = true; }
      },
      {
        text: this.translation.translate('committees.copy_link', 'Copy External Link'),
        icon: 'share',
        action: () => this.copyDirectoryExternalLink()
      },
      {
        text: `${this.translation.translate('committees.manage', 'Manage')} ${this.aliases.aliasPlural}`,
        icon: 'groups',
        isPrimary: true,
        action: () => this.router.navigate(['/committees/console/manage'])
      }
    ];
  }

  buildTourSteps(): void {
    this.tourSteps = [
      {
        icon: 'diversity_3',
        title: `Welcome to ${this.aliases.aliasPlural} Command`,
        description: `This module is 100% independent. Create ${this.aliases.aliasPlural} and nested ${this.aliases.subGroupAliasPlural}, appoint delegated leaders, and monitor real-time attendance and reporting.`
      },
      {
        icon: 'tune',
        title: 'Dynamic Alias Engine',
        description: `Visit ${this.aliases.aliasSingular} Settings at any time to rename "${this.aliases.aliasPlural}" to Ministries, Actor Groups, Chapters, or Departments. Every Admin and Member screen updates immediately.`
      },
      {
        icon: 'share',
        title: 'External Registration & Extra-Info Forms',
        description: 'Share external registration links without duplicating basic member profiles. Existing members only answer your custom Extra-Info questions.'
      },
      {
        icon: 'cloud_done',
        title: 'Reports, Google Docs & Ozi AI Digest',
        description: 'Leaders can type rich minutes, upload Word/Excel/PDFs, or sign in with Google to attach live Docs, Sheets, and Notebooks—with 1-click Ozi AI summarization.'
      }
    ];
  }

  onTourClosed(): void {
    this.showTour = false;
    this.committeesService.markTourCompleted('committees_admin_dashboard');
  }

  loadDashboard(): void {
    this.loading = true;
    this.committeesService.getDashboard().subscribe({
      next: (res) => {
        this.loading = false;
        if (res?.isSuccess && res.data) {
          this.kpis = { ...this.kpis, ...(res.data.kpis || {}) };
          this.monthlyTrends = res.data.charts?.monthlyTrends || [];
          this.membershipDistribution = res.data.charts?.membershipDistribution || [];
          this.recentReports = res.data.recentReports || [];
          this.recentRegistrations = res.data.recentRegistrations || [];
          setTimeout(() => this.renderCharts(), 80);
        }
      },
      error: () => {
        this.loading = false;
        this.toast.error('Unable to load dashboard telemetry. Please refresh.');
      }
    });
  }

  copyDirectoryExternalLink(): void {
    const link = this.committeesService.buildExternalRegistrationUrl();
    navigator.clipboard.writeText(link).then(() => {
      this.toast.success(this.translation.translate('committees.link_copied', 'External registration link copied to clipboard.'));
    });
  }

  openInfo(key: string): void {
    const catalog: Record<string, CommitteeInfoSpec> = {
      active_groups: {
        title: `Active ${this.aliases.aliasPlural} & ${this.aliases.subGroupAliasPlural}`,
        purpose: `Tracks all operational ${this.aliases.aliasPlural.toLowerCase()} and nested ${this.aliases.subGroupAliasPlural.toLowerCase()} in your workspace.`,
        inputs: `Created via Manage ${this.aliases.aliasPlural} with Public, Approval-Required, or Private visibility.`,
        impact: `Active ${this.aliases.aliasPlural.toLowerCase()} appear in the Member Workspace and external onboarding links when enabled.`,
        bestPractices: `Organize large teams into nested ${this.aliases.subGroupAliasPlural.toLowerCase()} and appoint a ${this.aliases.leaderTitleAlias} and ${this.aliases.secretaryTitleAlias} for each.`
      },
      enrolled_members: {
        title: 'Enrolled Members vs. Seat Assignments',
        purpose: 'Shows unique participating members alongside total multi-group seat memberships.',
        inputs: 'Populated via direct roster assignment, Member Portal 1-click joins, and approved external link registrations.',
        impact: 'Enrolled members automatically unlock their group workspace, shared cloud documents, and meeting schedules.',
        bestPractices: 'Review roster roles quarterly to keep leadership permissions accurate.'
      },
      pending_intake: {
        title: 'Pending Intake Registrations',
        purpose: 'Highlights external applicants and internal moderated join requests awaiting approval.',
        inputs: 'Submitted via your shareable external registration link or moderated Member Directory.',
        impact: 'Approving an applicant immediately enrolls them and dispatches an in-app and email welcome alert.',
        bestPractices: 'Attach a concise Extra-Info Form to capture skills or availability without re-asking basic contact fields.'
      },
      reports_month: {
        title: 'Meeting Reports & Cloud Documents',
        purpose: 'Counts official meeting reports submitted during the current calendar month and linked cloud docs.',
        inputs: 'Submitted via rich text minutes, uploaded files, or connected Google Docs / Sheets / Notebooks.',
        impact: 'Provides leadership with auditable meeting records and Ozi AI executive digests.',
        bestPractices: 'Encourage secretaries to pin living Google Sheets or Notebooks to the group shelf for ongoing collaboration.'
      },
      attendance: {
        title: 'Average Attendance Pulse',
        purpose: 'Measures Present vs. Excused/Absent participation across recorded meeting roll-calls.',
        inputs: 'Captured automatically from the 1-tap Roster Roll-Call inside the Meeting Report Composer.',
        impact: 'Helps spot thriving teams as well as groups needing leadership support.',
        bestPractices: 'Record roll-call during every meeting to maintain accurate 6-month trend lines.'
      },
      monthly_chart: {
        title: '6-Month Reports & Attendance Trend',
        purpose: 'Correlates monthly meeting report volume against average member attendance percentage.',
        inputs: 'Aggregated live from tenant meeting reports over the rolling 6-month window.',
        impact: 'Reveals seasonal engagement peaks and reporting consistency.',
        bestPractices: 'Configure monthly or weekly report reminders in Settings to keep curves steady.'
      },
      distribution_chart: {
        title: `${this.aliases.aliasSingular} Membership Distribution`,
        purpose: `Compares active roster headcount across your top ${this.aliases.aliasPlural.toLowerCase()}.`,
        inputs: 'Live count of active members per group.',
        impact: 'Prevents over-subscribed teams and highlights groups that need recruitment.',
        bestPractices: 'Set a Max Capacity on high-demand groups and reassign overflow applicants from the Intake Queue.'
      }
    };
    this.activeInfo = catalog[key] || null;
  }

  private renderCharts(): void {
    if (this.monthlyTrendCanvas?.nativeElement) {
      this.trendChart?.destroy();
      const labels = this.monthlyTrends.map((m) => m.monthLabel);
      const reportsData = this.monthlyTrends.map((m) => m.reportsCount);
      const attData = this.monthlyTrends.map((m) => m.attendanceRate);

      this.trendChart = new Chart(this.monthlyTrendCanvas.nativeElement, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              type: 'bar',
              label: 'Reports Submitted',
              data: reportsData,
              backgroundColor: 'rgba(0, 80, 229, 0.78)',
              borderRadius: 6,
              yAxisID: 'y'
            },
            {
              type: 'line',
              label: 'Attendance (%)',
              data: attData,
              borderColor: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              tension: 0.35,
              yAxisID: 'y1'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: { beginAtZero: true, ticks: { precision: 0 } },
            y1: { beginAtZero: true, max: 100, position: 'right', grid: { drawOnChartArea: false } }
          }
        }
      });
    }

    if (this.distributionCanvas?.nativeElement && this.membershipDistribution.length > 0) {
      this.distChart?.destroy();
      this.distChart = new Chart(this.distributionCanvas.nativeElement, {
        type: 'bar',
        data: {
          labels: this.membershipDistribution.map((d) => d.name),
          datasets: [
            {
              label: 'Active Members',
              data: this.membershipDistribution.map((d) => d.memberCount),
              backgroundColor: '#0050e5',
              borderRadius: 6
            }
          ]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          scales: { x: { beginAtZero: true, ticks: { precision: 0 } } }
        }
      });
    }
  }
}

