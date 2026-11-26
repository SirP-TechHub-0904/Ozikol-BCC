import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent, PageHeaderButton } from '../../../shared/components/page-header/page-header.component';

/**
 * Interface representing a user group summary item.
 */
interface UserGroupItem {
  id: string;
  name: string;
  description?: string;
  baseRole: string;
  isDefault: boolean;
  isSystem: boolean;
  colorBadge?: string;
  icon?: string;
  membersCount: number;
  permissionsCount: number;
}

/**
 * Member Group Assignment Component.
 * Dedicated, distraction-free view for assigning a specific workspace member to a User Group.
 * Displays all available User Groups and clearly indicates which one the member is currently actively assigned to.
 */
@Component({
  selector: 'app-user-permissions',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent],
  template: `
    <div class="user-permissions-page">
      <!-- Standardized Page Header -->
      <app-page-header
        eyebrow="SECURITY & ACCESS GOVERNANCE"
        icon="admin_panel_settings"
        [title]="'Assign User Group: ' + (user?.fullName || user?.email || 'Member')"
        subtitle="Assign this member to a permission blueprint group. The member will inherit the group's system role and modular capability scopes."
        [buttons]="headerButtons"
        [loading]="isLoading || isSaving"
      ></app-page-header>

      <!-- Loading State -->
      <div *ngIf="isLoading" class="loading-state-card">
        <span class="material-symbols-outlined spinner">progress_activity</span>
        <p>Loading member profile and workspace user groups...</p>
      </div>

      <div *ngIf="!isLoading" class="assignment-layout">
        <!-- 1. Member Profile & Current Status Card -->
        <div class="member-profile-card">
          <div class="profile-hero-left">
            <div class="avatar-box">
              <img *ngIf="user?.avatarUrl" [src]="user.avatarUrl" [alt]="user.fullName" />
              <span *ngIf="!user?.avatarUrl">{{ getUserInitials() }}</span>
            </div>
            <div class="profile-meta-info">
              <div class="name-status-row">
                <h3>{{ user?.fullName || 'Workspace Member' }}</h3>
                <span class="status-pill active">Active</span>
                <span *ngIf="isRootSuperAdmin" class="locked-root-pill">
                  <span class="material-symbols-outlined">lock</span>
                  Root SuperAdmin
                </span>
              </div>
              <div class="user-subtext-row">
                <span class="email-subtext">{{ user?.email || 'member@domain.com' }}</span>
                <span class="meta-separator">•</span>
                <span class="id-subtext">ID: {{ sanitizeId(userId) }}</span>
              </div>
            </div>
          </div>

          <div class="profile-hero-right">
            <div class="current-role-indicator">
              <span class="indicator-label">CURRENT ACTIVE GROUP</span>
              <div class="active-group-pill">
                <span class="material-symbols-outlined">{{ getActiveGroupIcon() }}</span>
                <strong>{{ getActiveGroupName() }}</strong>
              </div>
            </div>
          </div>
        </div>

        <!-- 2. Security Advisory Banner -->
        <div class="security-advisory-banner">
          <div class="banner-icon-col">
            <span class="material-symbols-outlined">shield_person</span>
          </div>
          <div class="banner-text-col">
            <h4>Permission Blueprint Assignment</h4>
            <p>
              Assigning a user to a group automatically provisions their primary system role and capability access privileges.
              Any modifications configured on the group blueprint in <strong>Role &amp; Group Governance</strong> will immediately apply to this member.
            </p>
          </div>
          <div class="banner-action-col">
            <span class="live-protection-chip">
              <span class="pulse-dot"></span>
              Live Governance
            </span>
          </div>
        </div>

        <!-- 3. User Groups Selection Section -->
        <div class="groups-selection-card">
          <div class="groups-card-header">
            <div class="header-left">
              <div class="header-icon-pill">
                <span class="material-symbols-outlined">group_work</span>
              </div>
              <div>
                <h3>Select User Group</h3>
                <p>Choose the target group to assign to this member. The active assigned group is highlighted below.</p>
              </div>
            </div>
            <div class="header-right">
              <a routerLink="/identity/console/roles" class="btn btn-outline btn-sm">
                <span class="material-symbols-outlined">tune</span>
                <span>Manage Groups &amp; Blueprints</span>
              </a>
            </div>
          </div>

          <div class="groups-grid">
            <div
              *ngFor="let group of userGroups"
              class="group-card"
              [class.selected]="selectedGroupId === group.id"
              [class.is-active-assigned]="currentAssignedGroupId === group.id"
              (click)="selectGroup(group)"
              role="button"
              tabindex="0"
            >
              <!-- Top Header Row -->
              <div class="group-card-top">
                <div class="group-icon-pill" [style.background]="(group.colorBadge || '#0050E5') + '15'" [style.color]="group.colorBadge || '#0050E5'">
                  <span class="material-symbols-outlined">{{ group.icon || 'groups' }}</span>
                </div>
                <div class="top-badges-row">
                  <span class="default-pill" *ngIf="group.isDefault">DEFAULT</span>
                  <span class="role-pill" [style.color]="group.colorBadge || '#0050E5'">{{ group.baseRole }}</span>
                  <div class="radio-indicator" [class.checked]="selectedGroupId === group.id">
                    <span class="material-symbols-outlined" *ngIf="selectedGroupId === group.id">check</span>
                  </div>
                </div>
              </div>

              <!-- Group Title & Description -->
              <div class="group-card-body">
                <h4 class="group-name">{{ group.name }}</h4>
                <p class="group-description">{{ group.description || 'Predefined permissions blueprint for workspace members.' }}</p>
              </div>

              <!-- Group Meta & Active Badge Footer -->
              <div class="group-card-footer">
                <div class="group-meta-tags">
                  <span class="meta-tag">
                    <span class="material-symbols-outlined">person</span>
                    {{ group.membersCount || 0 }} {{ (group.membersCount === 1 ? 'member' : 'members') }}
                  </span>
                  <span class="meta-tag">
                    <span class="material-symbols-outlined">rule</span>
                    {{ group.permissionsCount || 0 }} rules
                  </span>
                </div>

                <!-- Active Assigned Indicator -->
                <div class="active-badge-wrap" *ngIf="currentAssignedGroupId === group.id">
                  <span class="active-connected-badge">
                    <span class="material-symbols-outlined">check_circle</span>
                    Active Assigned Group
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 4. Sticky Action Footer Bar -->
        <div class="action-footer-bar">
          <div class="footer-left-info">
            <span class="material-symbols-outlined info-icon">verified_user</span>
            <span>
              Target Group: <strong>{{ getSelectedGroupName() }}</strong>
              <ng-container *ngIf="selectedGroupId === currentAssignedGroupId"> (Currently Active)</ng-container>
              <ng-container *ngIf="selectedGroupId !== currentAssignedGroupId"> (Pending Reassignment)</ng-container>
            </span>
          </div>

          <div class="footer-action-buttons">
            <a [routerLink]="['/users/console/details', userId]" class="btn btn-outline" [class.disabled]="isSaving">
              Cancel
            </a>
            <button
              type="button"
              class="btn btn-primary"
              (click)="savePermissions()"
              [disabled]="isSaving || isRootSuperAdmin || (selectedGroupId === currentAssignedGroupId)"
            >
              <span class="material-symbols-outlined" *ngIf="!isSaving">verified</span>
              <span class="material-symbols-outlined spinner" *ngIf="isSaving">progress_activity</span>
              <span>{{ isSaving ? 'Updating Assignment...' : 'Save & Assign Group' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .user-permissions-page {
      padding: 0 0 80px 0;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .loading-state-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 60px 20px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      color: #64748b;
    }
    .loading-state-card .spinner {
      font-size: 36px;
      color: #0050e5;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }

    .assignment-layout {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    /* 1. Member Profile Card */
    .member-profile-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
      flex-wrap: wrap;
      gap: 16px;
    }
    .profile-hero-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .avatar-box {
      width: 54px;
      height: 54px;
      border-radius: 50%;
      background: #0050e5;
      color: #ffffff;
      font-weight: 700;
      font-size: 19px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      flex-shrink: 0;
      border: 2px solid #e2e8f0;
    }
    .avatar-box img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .profile-meta-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .name-status-row {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .name-status-row h3 {
      margin: 0;
      font-size: 17px;
      font-weight: 700;
      color: #0f172a;
    }
    .status-pill.active {
      background: #dcfce7;
      color: #166534;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .locked-root-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #dc2626;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 9999px;
    }
    .locked-root-pill .material-symbols-outlined {
      font-size: 13px;
    }
    .user-subtext-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #64748b;
    }
    .meta-separator {
      color: #cbd5e1;
    }
    .id-subtext {
      font-family: monospace;
      color: #475569;
    }

    .profile-hero-right {
      display: flex;
      align-items: center;
    }
    .current-role-indicator {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;
    }
    .indicator-label {
      font-size: 11px;
      font-weight: 700;
      color: #94a3b8;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    .active-group-pill {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      background: rgba(0, 80, 229, 0.08);
      color: #0050e5;
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 13px;
      font-weight: 700;
      border: 1px solid rgba(0, 80, 229, 0.2);
    }
    .active-group-pill .material-symbols-outlined {
      font-size: 16px;
    }

    /* 2. Security Advisory Banner */
    .security-advisory-banner {
      background: #eff6ff;
      border: 1px solid #dbeafe;
      border-radius: 12px;
      padding: 16px 20px;
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .banner-icon-col {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: #dbeafe;
      color: #0050e5;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .banner-text-col {
      flex: 1;
    }
    .banner-text-col h4 {
      margin: 0 0 3px 0;
      font-size: 14px;
      font-weight: 700;
      color: #1e3a8a;
    }
    .banner-text-col p {
      margin: 0;
      font-size: 12.5px;
      color: #3b82f6;
      line-height: 1.45;
    }
    .live-protection-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #ffffff;
      border: 1px solid #bfdbfe;
      color: #1e40af;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 11.5px;
      font-weight: 700;
      white-space: nowrap;
    }
    .pulse-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #10b981;
      animation: pulseDot 1.5s infinite;
    }
    @keyframes pulseDot {
      0% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(1.3); }
      100% { opacity: 1; transform: scale(1); }
    }

    /* 3. Groups Selection Card */
    .groups-selection-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
    }
    .groups-card-header {
      padding: 18px 24px;
      background: #fafbfc;
      border-bottom: 1px solid #f1f5f9;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .header-icon-pill {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      background: rgba(0, 80, 229, 0.08);
      color: #0050e5;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .header-left h3 {
      margin: 0;
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
    }
    .header-left p {
      margin: 2px 0 0 0;
      font-size: 12px;
      color: #64748b;
    }

    /* Groups Grid */
    .groups-grid {
      padding: 24px;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
      gap: 18px;
    }
    .group-card {
      background: #f8fafc;
      border: 1.5px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 14px;
      transition: all 0.2s ease-in-out;
      position: relative;
    }
    .group-card:hover {
      border-color: #93c5fd;
      background: #ffffff;
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(0, 80, 229, 0.07);
    }
    .group-card.selected {
      background: #ffffff;
      border-color: #0050e5;
      box-shadow: 0 0 0 2px rgba(0, 80, 229, 0.15), 0 6px 20px rgba(0, 80, 229, 0.08);
    }
    .group-card.is-active-assigned {
      border-color: #10b981;
    }
    .group-card.is-active-assigned.selected {
      border-color: #0050e5;
    }

    .group-card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .group-icon-pill {
      width: 42px;
      height: 42px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .group-icon-pill .material-symbols-outlined {
      font-size: 22px;
    }
    .top-badges-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .default-pill {
      background: #ecfdf5;
      color: #059669;
      font-size: 10.5px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 4px;
      border: 1px solid #a7f3d0;
      letter-spacing: 0.05em;
    }
    .role-pill {
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 6px;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
    }
    .radio-indicator {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      border: 2px solid #cbd5e1;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #ffffff;
      color: #ffffff;
      transition: all 0.15s ease-in-out;
    }
    .radio-indicator.checked {
      background: #0050e5;
      border-color: #0050e5;
    }
    .radio-indicator .material-symbols-outlined {
      font-size: 15px;
      font-weight: 700;
    }

    .group-card-body {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .group-name {
      margin: 0;
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
    }
    .group-description {
      margin: 0;
      font-size: 12.5px;
      color: #64748b;
      line-height: 1.45;
    }

    .group-card-footer {
      display: flex;
      flex-direction: column;
      gap: 10px;
      border-top: 1px solid #f1f5f9;
      padding-top: 12px;
    }
    .group-meta-tags {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 12px;
      color: #64748b;
    }
    .meta-tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .meta-tag .material-symbols-outlined {
      font-size: 15px;
      color: #94a3b8;
    }

    .active-badge-wrap {
      display: flex;
    }
    .active-connected-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: #dcfce7;
      border: 1px solid #bbf7d0;
      color: #15803d;
      padding: 3px 9px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.02em;
    }
    .active-connected-badge .material-symbols-outlined {
      font-size: 14px;
    }

    /* 4. Action Footer Bar */
    .action-footer-bar {
      position: sticky;
      bottom: 20px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      z-index: 50;
    }
    .footer-left-info {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #475569;
    }
    .footer-left-info .info-icon {
      color: #0050e5;
      font-size: 18px;
    }
    .footer-action-buttons {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 9px 18px;
      border-radius: 8px;
      font-size: 13.5px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.15s ease-in-out;
      border: 1px solid transparent;
    }
    .btn-sm {
      padding: 6px 12px;
      font-size: 12.5px;
    }
    .btn-outline {
      background: #ffffff;
      border-color: #cbd5e1;
      color: #334155;
    }
    .btn-outline:hover:not(.disabled) {
      background: #f8fafc;
      border-color: #94a3b8;
    }
    .btn-primary {
      background: #0050e5;
      color: #ffffff;
    }
    .btn-primary:hover:not(:disabled) {
      background: #0040b8;
      box-shadow: 0 4px 12px rgba(0, 80, 229, 0.25);
    }
    .btn:disabled, .btn.disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    @media (max-width: 768px) {
      .member-profile-card {
        flex-direction: column;
        align-items: flex-start;
      }
      .profile-hero-right {
        width: 100%;
        justify-content: flex-start;
      }
      .current-role-indicator {
        align-items: flex-start;
      }
      .groups-grid {
        grid-template-columns: 1fr;
      }
      .action-footer-bar {
        flex-direction: column;
        gap: 12px;
        align-items: stretch;
      }
      .footer-action-buttons {
        justify-content: flex-end;
      }
    }
  `]
})
export class UserPermissionsComponent implements OnInit {
  userId = '';
  isLoading = false;
  isSaving = false;
  user: any = null;

  userGroups: UserGroupItem[] = [];
  currentAssignedGroupId: string | null = null;
  selectedGroupId: string | null = null;
  headerButtons: PageHeaderButton[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.userId = params['id'] || '';
      if (this.userId) {
        this.loadData();
      } else {
        this.router.navigate(['/users/console']);
      }
    });
  }

  loadData(): void {
    this.isLoading = true;

    // Load User Profile via canonical UsersApi route
    this.api.get<any>(`UsersApi/${this.userId}`).subscribe({
      next: (userRes: any) => {
        this.user = userRes.data || userRes;
        this.setupHeaderButtons();

        // Load User Groups & Current Assignment
        this.loadUserGroupsAndAssignment();
      },
      error: () => {
        this.toast.error('Failed to load workspace member profile.');
        this.isLoading = false;
      }
    });
  }

  loadUserGroupsAndAssignment(): void {
    // 1. Fetch configured User Groups
    this.api.get<any>('api/v1/user-groups').subscribe({
      next: (groupsRes: any) => {
        this.userGroups = groupsRes.data || groupsRes || [];

        // If user already has an explicit assigned BcpUserGroupId, prioritize it immediately
        if (this.user?.bcpUserGroupId) {
          this.currentAssignedGroupId = this.user.bcpUserGroupId;
          this.selectedGroupId = this.currentAssignedGroupId;
          this.isLoading = false;
          return;
        }

        // 2. Fetch User's current feature roles to determine current userGroupId
        this.api.get<any>(`IdentityApi/user-feature-roles/${this.userId}`).subscribe({
          next: (rolesRes: any) => {
            const data = rolesRes.data || rolesRes;
            this.currentAssignedGroupId = data?.userGroupId || null;

            // If user has no assigned group, match by base role or default group
            if (!this.currentAssignedGroupId) {
              const matchedGroup = this.userGroups.find(g => g.name.toLowerCase() === (data?.primaryRole || 'member').toLowerCase())
                || this.userGroups.find(g => g.isDefault)
                || this.userGroups[0];
              this.currentAssignedGroupId = matchedGroup ? matchedGroup.id : null;
            }

            this.selectedGroupId = this.currentAssignedGroupId;
            this.isLoading = false;
          },
          error: () => {
            // Fallback: match by default group
            const def = this.userGroups.find(g => g.isDefault) || this.userGroups[0];
            this.currentAssignedGroupId = def ? def.id : null;
            this.selectedGroupId = this.currentAssignedGroupId;
            this.isLoading = false;
          }
        });
      },
      error: () => {
        this.toast.error('Failed to load user groups.');
        this.isLoading = false;
      }
    });
  }

  setupHeaderButtons(): void {
    this.headerButtons = [
      {
        text: 'Back to Member Dossier',
        icon: 'arrow_back',
        isPrimary: false,
        action: () => this.router.navigate(['/users/console/details', this.userId])
      }
    ];
  }

  selectGroup(group: UserGroupItem): void {
    if (this.isRootSuperAdmin) return;
    this.selectedGroupId = group.id;
  }

  savePermissions(): void {
    if (this.isRootSuperAdmin) {
      this.toast.warning('Root SuperAdmin authority is locked and cannot be reassigned.');
      return;
    }

    if (!this.selectedGroupId) {
      this.toast.warning('Please select a target user group.');
      return;
    }

    const selectedGroup = this.userGroups.find(g => g.id === this.selectedGroupId);
    if (!selectedGroup) return;

    this.isSaving = true;

    // Call group assignment endpoint
    this.api.post<any>(`/api/v1/user-groups/${this.selectedGroupId}/assign`, { userId: this.userId }).subscribe({
      next: () => {
        this.isSaving = false;
        this.currentAssignedGroupId = this.selectedGroupId;
        this.toast.success(`Member assigned to '${selectedGroup.name}' successfully.`);
      },
      error: (err: any) => {
        this.isSaving = false;
        const msg = err?.error?.message || 'Failed to update member group assignment.';
        this.toast.error(msg);
      }
    });
  }

  getUserInitials(): string {
    if (!this.user) return 'U';
    const first = this.user.firstName ? this.user.firstName.charAt(0) : '';
    const last = this.user.lastName ? this.user.lastName.charAt(0) : '';
    return (first + last).toUpperCase() || (this.user.email ? this.user.email.charAt(0).toUpperCase() : 'U');
  }

  sanitizeId(id: string): string {
    if (!id) return '';
    return id.length > 8 ? id.substring(0, 8) + '...' : id;
  }

  getActiveGroupName(): string {
    const group = this.userGroups.find(g => g.id === this.currentAssignedGroupId);
    return group ? group.name : (this.user?.role || 'Member');
  }

  getActiveGroupIcon(): string {
    const group = this.userGroups.find(g => g.id === this.currentAssignedGroupId);
    return group?.icon || 'groups';
  }

  getSelectedGroupName(): string {
    const group = this.userGroups.find(g => g.id === this.selectedGroupId);
    return group ? group.name : 'None';
  }

  get isRootSuperAdmin(): boolean {
    const role = (this.user?.role || '').toLowerCase();
    const email = (this.user?.email || '').toLowerCase();
    return role === 'superadmin' || email.includes('superadmin');
  }
}
