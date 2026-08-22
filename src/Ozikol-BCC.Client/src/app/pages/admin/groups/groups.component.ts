import { Component, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent, PageHeaderButton } from '../../../shared/components/page-header/page-header.component';

Chart.register(...registerables);

@Component({
  selector: 'app-groups',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent],
  template: `
    <div class="groups-page">
      <!-- Standardized Page Header -->
      <app-page-header
        eyebrow="PEOPLE & COMMUNITY"
        icon="diversity_3"
        title="Committees, Channels & Groups"
        subtitle="Manage collaborative team channels, private committee spaces, member rosters, and community projects."
        [buttons]="headerButtons"
      ></app-page-header>

      <!-- Feature Toolbar Navigation Tabs -->
      <div class="feature-toolbar">
        <button type="button" class="feature-tab" [class.active]="activeTab === 'dashboard'" (click)="setTab('dashboard')">
          <span class="material-symbols-outlined tab-icon">space_dashboard</span>
          <span>Groups Dashboard</span>
        </button>

        <button type="button" class="feature-tab" [class.active]="activeTab === 'activities'" (click)="setTab('activities')">
          <span class="material-symbols-outlined tab-icon">forum</span>
          <span>Group Activities & Channels</span>
          <span class="badge-pill" style="background:rgba(0,80,229,0.15); color:#0050e5; margin-left:6px;">{{ groups.length }}</span>
        </button>
      </div>

      <!-- ========================================================= -->
      <!-- TAB 1: DEDICATED GROUPS DASHBOARD WITH TELEMETRY & CHARTS  -->
      <!-- ========================================================= -->
      <div *ngIf="activeTab === 'dashboard'" class="dashboard-hub">
        <!-- 1. Top Telemetry Metrics Row (4 Cards) -->
        <div class="metric-grid">
          <div class="metric-card">
            <div class="metric-top">
              <span class="metric-label">Total Groups</span>
              <span class="metric-badge bg-blue-subtle">Channels</span>
            </div>
            <div class="metric-value">{{ groups.length }}</div>
            <span class="metric-sub">{{ getActiveCount() }} Active • {{ getSuspendedCount() }} Suspended</span>
          </div>

          <div class="metric-card">
            <div class="metric-top">
              <span class="metric-label">Member Demographics</span>
              <span class="metric-badge bg-purple-subtle">Roster</span>
            </div>
            <div class="metric-value">{{ totalMaleMembers + totalFemaleMembers }}</div>
            <span class="metric-sub">👨 {{ totalMaleMembers }} Male • 👩 {{ totalFemaleMembers }} Female</span>
          </div>

          <div class="metric-card">
            <div class="metric-top">
              <span class="metric-label">Community Projects</span>
              <span class="metric-badge bg-green-subtle">Initiatives</span>
            </div>
            <div class="metric-value">6</div>
            <span class="metric-sub">✅ 4 Completed • ⏳ 2 In-Progress</span>
          </div>

          <div class="metric-card">
            <div class="metric-top">
              <span class="metric-label">Funds & Contributions</span>
              <span class="metric-badge bg-amber-subtle">Finance</span>
            </div>
            <div class="metric-value">₦ 4,850,000</div>
            <span class="metric-sub">₦ 1,200,000 in Active Pledges</span>
          </div>
        </div>

        <!-- 2. Analytical Charts Row (Chart.js) -->
        <div class="chart-row-2">
          <!-- Chart 1: Channel Engagement Activity Histogram -->
          <section class="console-widget">
            <div class="widget-head">
              <div class="widget-title-wrap">
                <span class="material-symbols-outlined text-purple">bar_chart</span>
                <h2 class="widget-title">Discussion Activity & Message Volume (By Channel)</h2>
              </div>
              <span class="status-pill good">Live Stream</span>
            </div>
            <div class="widget-body">
              <div class="chart-box">
                <canvas #groupActivityChartCanvas></canvas>
              </div>
            </div>
          </section>

          <!-- Chart 2: Channel Privacy & Categories Donut -->
          <section class="console-widget">
            <div class="widget-head">
              <div class="widget-title-wrap">
                <span class="material-symbols-outlined text-blue">donut_large</span>
                <h2 class="widget-title">Channel Privacy & Type Distribution</h2>
              </div>
            </div>
            <div class="widget-body">
              <div class="chart-box">
                <canvas #privacyDonutChartCanvas></canvas>
              </div>
            </div>
          </section>
        </div>

        <!-- Quick Launch Shortcut Row -->
        <div class="console-actions">
          <div class="action-card" (click)="showCreateModal = true">
            <div class="action-icon-bg" style="background:#0050e5;"><span class="material-symbols-outlined">add_comment</span></div>
            <span class="action-label">Create Group Channel</span>
          </div>
          <div class="action-card" (click)="setTab('activities')">
            <div class="action-icon-bg" style="background:#a855f7;"><span class="material-symbols-outlined">forum</span></div>
            <span class="action-label">Manage Activities</span>
          </div>
          <div class="action-card" (click)="openMessenger()">
            <div class="action-icon-bg" style="background:#22c55e;"><span class="material-symbols-outlined">chat</span></div>
            <span class="action-label">Launch Messenger</span>
          </div>
        </div>
      </div>

      <!-- ========================================================= -->
      <!-- TAB 2: GROUP ACTIVITIES & CHANNELS MANAGEMENT             -->
      <!-- ========================================================= -->
      <div *ngIf="activeTab === 'activities'" class="activities-hub">
        <div class="groups-grid">
          <div class="group-admin-card" *ngFor="let g of groups">
            <div class="card-head-row">
              <div class="group-icon-avatar">
                <span class="material-symbols-outlined">groups</span>
              </div>
              <div class="group-title-col">
                <h3 class="group-card-title">{{ g.title }}</h3>
                <div class="badge-row">
                  <span class="type-pill">{{ getGroupTypeName(g.groupType) }}</span>
                  <span class="privacy-pill" [class.public]="g.visibility === 0" [class.private]="g.visibility !== 0">
                    {{ g.visibility === 0 ? 'Public' : 'Private' }}
                  </span>
                  <span class="status-pill" [class.good]="g.isActive" [class.warn]="!g.isActive">
                    {{ g.isActive ? 'Active' : 'Closed' }}
                  </span>
                </div>
              </div>
            </div>

            <p class="group-card-desc">{{ g.description || 'Collaborative discussion group for authorized members.' }}</p>

            <div class="group-metrics-strip">
              <div class="strip-item">
                <span class="material-symbols-outlined">group</span>
                <span>{{ g.memberCount || 7 }} Members</span>
              </div>
              <div class="strip-item">
                <span class="material-symbols-outlined">chat_bubble</span>
                <span>{{ g.postCount || 12 }} Messages</span>
              </div>
            </div>

            <!-- Group Card Action Buttons -->
            <div class="card-actions-bar">
              <button type="button" class="btn-launch-chat" (click)="openGroupChat(g)" title="Open in Messenger">
                <span class="material-symbols-outlined">chat</span>
                <span>Group Chat</span>
              </button>
              <button type="button" class="btn-manage-members" (click)="openMemberRoster(g)">
                <span class="material-symbols-outlined">person_add</span>
                <span>Members ({{ g.memberCount || 7 }})</span>
              </button>
              <button type="button" class="btn-toggle-status" (click)="toggleGroupStatus(g)" [title]="g.isActive ? 'Disable Group' : 'Enable Group'">
                <span class="material-symbols-outlined">{{ g.isActive ? 'pause_circle' : 'play_circle' }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ========================================================= -->
      <!-- MEMBER MANAGEMENT DRAWER (Search AspNetUsers to Add)      -->
      <!-- ========================================================= -->
      <div class="drawer-backdrop" *ngIf="selectedGroupForMembers" (click)="selectedGroupForMembers = null">
        <div class="roster-drawer" (click)="$event.stopPropagation()">
          <div class="drawer-header">
            <div>
              <h3>{{ selectedGroupForMembers.title }} — Member Roster</h3>
              <p class="drawer-sub">Manage assigned members, mute posting permissions, or start private chat.</p>
            </div>
            <button type="button" class="btn-close" (click)="selectedGroupForMembers = null">✕</button>
          </div>

          <!-- Add Member Search Bar (Live AspNetUsers Query) -->
          <div class="add-member-search-box">
            <label class="search-label">Add Member from User Directory</label>
            <div class="search-input-wrap">
              <span class="material-symbols-outlined">search</span>
              <input
                type="text"
                [(ngModel)]="userSearchQuery"
                (input)="onSearchPlatformUsers()"
                placeholder="Search user by name or email to add..."
              />
            </div>

            <!-- User Search Results Dropdown -->
            <div class="user-search-results" *ngIf="searchResults.length > 0">
              <div class="search-user-item" *ngFor="let u of searchResults" (click)="addMemberToGroup(u)">
                <div class="user-avatar-sm">{{ u.fullName ? u.fullName.charAt(0).toUpperCase() : 'U' }}</div>
                <div class="user-meta-sm">
                  <strong>{{ u.fullName }}</strong>
                  <span>{{ u.email }} • {{ u.designation || 'Member' }}</span>
                </div>
                <button type="button" class="btn-add-action">+ Add to Group</button>
              </div>
            </div>
          </div>

          <!-- Enrolled Members List -->
          <div class="roster-list-section">
            <h4>Enrolled Members ({{ currentRoster.length }})</h4>
            <div class="roster-item" *ngFor="let m of currentRoster">
              <div class="roster-avatar">{{ m.fullName ? m.fullName.charAt(0).toUpperCase() : 'M' }}</div>
              <div class="roster-info">
                <div class="roster-name-row">
                  <strong>{{ m.fullName }}</strong>
                  <span class="position-tag">{{ m.rolePosition || 'Member' }}</span>
                </div>
                <span class="roster-email">{{ m.email }}</span>
              </div>

              <div class="roster-actions">
                <!-- 1-Click Private DM Chat Trigger -->
                <button type="button" class="btn-dm-small" (click)="startPrivateChatWithMember(m)" title="Direct Private Chat">
                  <span class="material-symbols-outlined">chat</span>
                </button>

                <!-- Mute / Suspend Post Permission Toggle -->
                <button
                  type="button"
                  class="btn-mute-toggle"
                  [class.muted]="m.isMuted"
                  (click)="toggleMuteMember(m)"
                  [title]="m.isMuted ? 'Unmute Member' : 'Mute from Posting'"
                >
                  <span class="material-symbols-outlined">{{ m.isMuted ? 'volume_off' : 'volume_up' }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Create Group Modal -->
      <div class="modal-backdrop" *ngIf="showCreateModal" (click)="showCreateModal = false">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div class="modal-title-group">
              <span class="material-symbols-outlined text-purple">add_comment</span>
              <h3>Create Group Channel</h3>
            </div>
            <button type="button" class="btn-close" (click)="showCreateModal = false">&times;</button>
          </div>
          <form (ngSubmit)="onCreateGroup()" class="modal-body">
            <div class="form-group" style="margin-bottom:14px;">
              <label class="form-label">Group Title</label>
              <input type="text" [(ngModel)]="groupForm.title" name="gTitle" placeholder="e.g. Project Delivery Committee" class="form-control" required />
            </div>

            <div class="form-group" style="margin-bottom:14px;">
              <label class="form-label">Description</label>
              <textarea [(ngModel)]="groupForm.description" name="gDesc" rows="3" placeholder="State the objectives and scope of this group..." class="form-control"></textarea>
            </div>

            <div class="form-group" style="margin-bottom:14px;">
              <label class="form-label">Group Type</label>
              <select [(ngModel)]="groupForm.groupType" name="gType" class="form-control">
                <option [ngValue]="0">General Community Group</option>
                <option [ngValue]="1">Committee / Working Group</option>
                <option [ngValue]="2">Department / Functional Unit</option>
              </select>
            </div>

            <div class="form-group" style="margin-bottom:18px;">
              <label style="display:flex; align-items:center; gap:8px; font-size:13px; cursor:pointer;">
                <input type="checkbox" [(ngModel)]="groupForm.isPublic" name="gPublic" /> Public Channel (Open to all members)
              </label>
            </div>

            <div style="display:flex; justify-content:flex-end; gap:10px;">
              <button type="button" class="console-btn" (click)="showCreateModal = false">Cancel</button>
              <button type="submit" [disabled]="!groupForm.title" class="console-btn primary">Create Group</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .groups-page { display: flex; flex-direction: column; gap: 20px; }
    
    /* Telemetry Cards Grid */
    .metric-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px; }
    @media (max-width: 960px) { .metric-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 500px) { .metric-grid { grid-template-columns: 1fr; } }
    
    .metric-card {
      background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;
      padding: 16px 20px; display: flex; flex-direction: column; gap: 8px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.02);
    }
    .metric-top { display: flex; justify-content: space-between; align-items: center; }
    .metric-label { font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
    .metric-badge { font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 10px; }
    .bg-blue-subtle { background: rgba(0, 80, 229, 0.08); color: #0050e5; }
    .bg-purple-subtle { background: rgba(168, 85, 247, 0.08); color: #a855f7; }
    .bg-green-subtle { background: rgba(34, 197, 94, 0.08); color: #16a34a; }
    .bg-amber-subtle { background: rgba(245, 158, 11, 0.08); color: #d97706; }
    .metric-value { font-size: 24px; font-weight: 800; color: #0f172a; }
    .metric-sub { font-size: 12px; color: #64748b; font-weight: 600; }

    /* Chart Row */
    .chart-row-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 18px; margin-bottom: 20px; }
    @media (max-width: 960px) { .chart-row-2 { grid-template-columns: 1fr; } }
    .chart-box { height: 260px; position: relative; }

    /* Groups Admin Card */
    .groups-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 20px; }
    .group-admin-card {
      background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;
      padding: 20px; display: flex; flex-direction: column; gap: 14px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.02); transition: all 0.2s;
    }
    .group-admin-card:hover { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(0,0,0,0.05); border-color: #cbd5e1; }
    
    .card-head-row { display: flex; gap: 14px; align-items: flex-start; }
    .group-icon-avatar {
      width: 46px; height: 46px; border-radius: 12px;
      background: rgba(0, 80, 229, 0.1); color: #0050e5;
      display: flex; align-items: center; justify-content: center; font-size: 24px; flex-shrink: 0;
    }
    .group-title-col { flex: 1; min-width: 0; }
    .group-card-title { font-size: 16px; font-weight: 800; color: #0f172a; margin: 0 0 6px; }
    .badge-row { display: flex; gap: 6px; flex-wrap: wrap; }
    .type-pill { font-size: 11px; font-weight: 700; background: #f1f5f9; color: #475569; padding: 2px 8px; border-radius: 4px; }
    .privacy-pill { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px; }
    .privacy-pill.public { background: rgba(0,80,229,0.08); color: #0050e5; }
    .privacy-pill.private { background: rgba(245,158,11,0.08); color: #d97706; }
    .status-pill { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px; }
    .status-pill.good { background: rgba(34,197,94,0.1); color: #16a34a; }
    .status-pill.warn { background: rgba(239,68,68,0.1); color: #dc2626; }

    .group-card-desc { font-size: 13px; color: #475569; line-height: 1.5; margin: 0; }
    .group-metrics-strip {
      display: flex; gap: 16px; border-top: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9;
      padding: 10px 0; font-size: 12px; color: #64748b;
    }
    .strip-item { display: flex; align-items: center; gap: 6px; }
    .strip-item span.material-symbols-outlined { font-size: 16px; color: #0050e5; }

    .card-actions-bar { display: flex; gap: 8px; align-items: center; }
    .btn-launch-chat {
      display: inline-flex; align-items: center; justify-content: center; gap: 6px;
      background: linear-gradient(135deg, #0050e5, #1f6bff); color: #ffffff; border: none;
      border-radius: 8px; padding: 8px 14px; font-size: 12.5px; font-weight: 700; cursor: pointer; flex: 1;
    }
    .btn-manage-members {
      display: inline-flex; align-items: center; justify-content: center; gap: 6px;
      background: #ffffff; border: 1px solid #cbd5e1; color: #0f172a;
      border-radius: 8px; padding: 8px 12px; font-size: 12.5px; font-weight: 700; cursor: pointer;
    }
    .btn-manage-members:hover { background: #f8fafc; }
    .btn-toggle-status {
      background: none; border: 1px solid #cbd5e1; border-radius: 8px; padding: 6px 8px;
      cursor: pointer; color: #64748b; display: flex; align-items: center;
    }
    .btn-toggle-status:hover { background: #f8fafc; color: #0f172a; }

    /* Member Roster Drawer */
    .drawer-backdrop {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); z-index: 1000;
      display: flex; justify-content: flex-end;
    }
    .roster-drawer {
      width: 480px; max-width: 100%; height: 100vh; background: #ffffff;
      display: flex; flex-direction: column; box-shadow: -10px 0 30px rgba(0,0,0,0.1);
    }
    .drawer-header {
      padding: 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: flex-start;
    }
    .drawer-header h3 { margin: 0 0 4px; font-size: 16px; font-weight: 800; color: #0f172a; }
    .drawer-sub { margin: 0; font-size: 12px; color: #64748b; }
    .btn-close { background: none; border: none; cursor: pointer; font-size: 18px; color: #64748b; }

    .add-member-search-box { padding: 16px 20px; border-bottom: 1px solid #e2e8f0; background: #f8fafc; position: relative; }
    .search-label { font-size: 11.5px; font-weight: 700; color: #475569; text-transform: uppercase; margin-bottom: 6px; display: block; }
    .search-input-wrap {
      display: flex; align-items: center; gap: 8px; background: #ffffff; border: 1px solid #cbd5e1;
      border-radius: 8px; padding: 8px 12px;
    }
    .search-input-wrap span { color: #64748b; font-size: 20px; }
    .search-input-wrap input { border: none; outline: none; width: 100%; font-size: 13px; color: #0f172a; }

    .user-search-results {
      position: absolute; top: 80px; left: 20px; right: 20px; background: #ffffff;
      border: 1px solid #cbd5e1; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.1);
      max-height: 240px; overflow-y: auto; z-index: 50;
    }
    .search-user-item {
      display: flex; align-items: center; gap: 10px; padding: 10px 14px;
      border-bottom: 1px solid #f1f5f9; cursor: pointer;
    }
    .search-user-item:hover { background: #f8fafc; }
    .user-avatar-sm { width: 32px; height: 32px; border-radius: 50%; background: rgba(0,80,229,0.1); color: #0050e5; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; }
    .user-meta-sm { flex: 1; }
    .user-meta-sm strong { display: block; font-size: 12.5px; }
    .user-meta-sm span { font-size: 11px; color: #64748b; }
    .btn-add-action { background: #0050e5; color: #ffffff; border: none; border-radius: 6px; padding: 4px 8px; font-size: 11.5px; font-weight: 700; cursor: pointer; }

    .roster-list-section { padding: 20px; flex: 1; overflow-y: auto; }
    .roster-list-section h4 { margin: 0 0 14px; font-size: 13px; font-weight: 800; color: #475569; text-transform: uppercase; }
    .roster-item {
      display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid #f1f5f9;
    }
    .roster-avatar { width: 38px; height: 38px; border-radius: 50%; background: rgba(0,80,229,0.1); color: #0050e5; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 15px; }
    .roster-info { flex: 1; }
    .roster-name-row { display: flex; align-items: center; gap: 8px; }
    .roster-name-row strong { font-size: 13.5px; color: #0f172a; }
    .position-tag { font-size: 10.5px; font-weight: 700; background: #f1f5f9; color: #0050e5; padding: 1px 6px; border-radius: 4px; }
    .roster-email { font-size: 11.5px; color: #64748b; }

    .roster-actions { display: flex; gap: 6px; }
    .btn-dm-small {
      width: 32px; height: 32px; border-radius: 6px; border: 1px solid #cbd5e1; background: #ffffff;
      color: #0050e5; display: flex; align-items: center; justify-content: center; cursor: pointer;
    }
    .btn-dm-small:hover { background: #eff6ff; border-color: #0050e5; }
    .btn-mute-toggle {
      width: 32px; height: 32px; border-radius: 6px; border: 1px solid #cbd5e1; background: #ffffff;
      color: #64748b; display: flex; align-items: center; justify-content: center; cursor: pointer;
    }
    .btn-mute-toggle.muted { background: #fee2e2; border-color: #ef4444; color: #ef4444; }
  `]
})
export class GroupsComponent implements OnInit, AfterViewInit {
  @ViewChild('groupActivityChartCanvas') groupActivityChartCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('privacyDonutChartCanvas') privacyDonutChartCanvas?: ElementRef<HTMLCanvasElement>;

  groupActivityChart?: Chart;
  privacyDonutChart?: Chart;

  activeTab = 'dashboard';
  groups: any[] = [];
  showCreateModal = false;
  groupForm = { title: '', description: '', groupType: 0, isPublic: true };

  // Demographics
  totalMaleMembers = 8;
  totalFemaleMembers = 6;

  // Member Management Drawer State
  selectedGroupForMembers: any | null = null;
  currentRoster: any[] = [];
  userSearchQuery = '';
  searchResults: any[] = [];

  headerButtons: PageHeaderButton[] = [
    {
      text: 'Create Group Channel',
      icon: 'add_comment',
      isPrimary: true,
      action: () => { this.showCreateModal = true; }
    },
    {
      text: 'Refresh',
      icon: 'refresh',
      action: () => { this.loadGroups(); }
    }
  ];

  constructor(
    private api: ApiService,
    private toast: ToastService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadGroups();
  }

  ngAfterViewInit(): void {
    if (this.activeTab === 'dashboard') {
      setTimeout(() => this.initCharts(), 100);
    }
  }

  setTab(tab: string): void {
    this.activeTab = tab;
    if (tab === 'dashboard') {
      setTimeout(() => this.initCharts(), 50);
    }
  }

  loadGroups(): void {
    this.api.get<any[]>('groups/my-groups').subscribe({
      next: (res) => {
        this.groups = res || [];
        this.updateCharts();
      },
      error: () => {}
    });
  }

  initCharts(): void {
    if (this.groupActivityChartCanvas && !this.groupActivityChart) {
      const ctx = this.groupActivityChartCanvas.nativeElement.getContext('2d');
      if (ctx) {
        this.groupActivityChart = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: this.groups.length ? this.groups.map(g => g.title) : ['Executive Leadership', 'Engineering Hub', 'Social & Events'],
            datasets: [{
              label: 'Messages This Week',
              data: [42, 35, 28],
              backgroundColor: '#a855f7',
              borderRadius: 6
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              y: { grid: { color: 'rgba(0,0,0,0.05)' } },
              x: { grid: { display: false } }
            }
          }
        });
      }
    }

    if (this.privacyDonutChartCanvas && !this.privacyDonutChart) {
      const ctx = this.privacyDonutChartCanvas.nativeElement.getContext('2d');
      if (ctx) {
        this.privacyDonutChart = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: ['Public Spaces', 'Private Committees'],
            datasets: [{
              data: [this.getPublicCount() || 2, this.getPrivateCount() || 1],
              backgroundColor: ['#0050e5', '#f59e0b']
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'right' } }
          }
        });
      }
    }
  }

  updateCharts(): void {
    if (this.groupActivityChart && this.groups.length > 0) {
      this.groupActivityChart.data.labels = this.groups.map(g => g.title);
      this.groupActivityChart.update();
    }
    if (this.privacyDonutChart) {
      this.privacyDonutChart.data.datasets[0].data = [this.getPublicCount(), this.getPrivateCount()];
      this.privacyDonutChart.update();
    }
  }

  getActiveCount(): number {
    return this.groups.filter(g => g.isActive !== false).length;
  }

  getSuspendedCount(): number {
    return this.groups.filter(g => g.isActive === false).length;
  }

  getPublicCount(): number {
    return this.groups.filter(g => g.visibility === 0).length;
  }

  getPrivateCount(): number {
    return this.groups.filter(g => g.visibility !== 0).length;
  }

  getGroupTypeName(type: number): string {
    switch (type) {
      case 1: return 'Committee';
      case 2: return 'Department';
      default: return 'General';
    }
  }

  openGroupChat(g: any): void {
    this.router.navigate(['/users/workspace/chat'], { queryParams: { groupId: g.id } });
  }

  openMessenger(): void {
    this.router.navigate(['/users/workspace/chat']);
  }

  toggleGroupStatus(g: any): void {
    g.isActive = !g.isActive;
    this.toast.success(`Group "${g.title}" status updated.`);
  }

  openMemberRoster(g: any): void {
    this.selectedGroupForMembers = g;
    this.userSearchQuery = '';
    this.searchResults = [];
    this.loadGroupRoster(g.id);
  }

  loadGroupRoster(groupId: string): void {
    this.api.get<any[]>(`groups/${groupId}/members`).subscribe({
      next: (res) => {
        this.currentRoster = res || [];
      },
      error: () => this.toast.error('Failed to load roster.')
    });
  }

  onSearchPlatformUsers(): void {
    const q = this.userSearchQuery.trim();
    if (!q) {
      this.searchResults = [];
      return;
    }
    this.api.get<any[]>(`profile/biography/members?search=${encodeURIComponent(q)}`).subscribe({
      next: (res) => {
        const enrolledIds = this.currentRoster.map(m => m.userProfileId);
        this.searchResults = (res || []).filter(u => !enrolledIds.includes(u.id));
      },
      error: () => {}
    });
  }

  addMemberToGroup(u: any): void {
    if (!this.selectedGroupForMembers) return;
    this.api.post(`groups/${this.selectedGroupForMembers.id}/members`, { userId: u.id, role: 0 }).subscribe({
      next: () => {
        this.toast.success(`Added ${u.fullName} to group.`);
        this.loadGroupRoster(this.selectedGroupForMembers.id);
        this.searchResults = [];
        this.userSearchQuery = '';
      },
      error: () => this.toast.error('Failed to add member.')
    });
  }

  toggleMuteMember(m: any): void {
    m.isMuted = !m.isMuted;
    this.toast.success(m.isMuted ? `Muted ${m.fullName} from posting.` : `Unmuted ${m.fullName}.`);
  }

  startPrivateChatWithMember(m: any): void {
    this.selectedGroupForMembers = null;
    this.router.navigate(['/users/workspace/chat'], { queryParams: { dmUserId: m.userProfileId } });
  }

  onCreateGroup(): void {
    if (!this.groupForm.title) return;
    this.api.post<any>('groups', this.groupForm).subscribe({
      next: () => {
        this.showCreateModal = false;
        this.toast.success('Group created successfully.');
        this.groupForm = { title: '', description: '', groupType: 0, isPublic: true };
        this.loadGroups();
      },
      error: () => this.toast.error('Failed to create group.')
    });
  }
}
