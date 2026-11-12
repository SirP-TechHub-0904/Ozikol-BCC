import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { TranslationService } from '../../../core/services/translation.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { PageHeaderComponent, PageHeaderButton } from '../../../shared/components/page-header/page-header.component';

/**
 * Interface representing a seeded system role in the identity governance catalog.
 */
interface RoleCatalogItem {
  name: string;
  description: string;
  scope: string;
  canAssign: boolean;
  badge: string;
  icon: string;
  group?: 'system_feature' | 'operational_level' | string;
  order?: number;
  memberCount: number;
  members: RoleMemberItem[];
}

/**
 * Interface representing a user assigned to a specific role.
 */
interface RoleMemberItem {
  userId: string;
  fullName: string;
  email: string;
  memberId: string;
  avatarUrl?: string;
  features?: string[];
}

/**
 * Role-First Governance Catalog Component.
 * Restructured into two distinct enterprise categories:
 *  1. System & Feature Authority Roles (SuperAdmin, Admin, Identity Manager, User Manager, Member)
 *  2. Operational Access Levels (Global Editor, Feature Editor, Read Only)
 * 
 * Includes interactive clickable filter stat cards (All, Authority, Operational, Assigned Personnel)
 * that dynamically filter the view and provide instant access to assigned rosters.
 */
@Component({
  selector: 'app-identity-roles',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent, TranslatePipe],
  template: `
    <div class="identity-roles-page">
      <!-- Standardized Page Header -->
      <app-page-header
        [eyebrow]="'identity.roles.eyebrow' | translate:'ACCESS CONTROL & GOVERNANCE'"
        icon="shield_person"
        [title]="'identity.roles.title' | translate:'System Roles & Authority Matrix'"
        [subtitle]="('identity.roles.subtitle_prefix' | translate:'Manage the ') + (rolesCatalog.length || (isSuperAdmin ? 8 : 7)) + ('identity.roles.subtitle_suffix' | translate:' enterprise roles organized into System & Feature Authority and Operational Access Levels.')"
        [buttons]="headerButtons"
        [loading]="isLoading"
      ></app-page-header>

      <!-- Overview Stats Strip (Clickable Filter Cards) -->
      <div class="stats-strip" *ngIf="!isLoading">
        <!-- Card 1: All Enterprise Roles -->
        <div 
          class="stat-card" 
          [class.active-all]="activeFilter === 'all'" 
          (click)="setFilter('all')"
          role="button"
          tabindex="0"
          title="Click to view all enterprise roles"
        >
          <div class="stat-card-main">
            <div class="stat-icon-wrap" style="background: rgba(0,80,229,0.08); color: #0050e5;">
              <span class="material-symbols-outlined">security</span>
            </div>
            <div class="stat-meta">
              <span class="stat-val">{{ rolesCatalog.length || (isSuperAdmin ? 8 : 7) }}</span>
              <span class="stat-lbl">{{ 'identity.roles.enterprise_roles' | translate:'Enterprise Roles' }}</span>
            </div>
          </div>
          <span class="active-indicator-pill indicator-all" *ngIf="activeFilter === 'all'">
            <span class="material-symbols-outlined" style="font-size: 13px;">check</span>
            <span>{{ 'identity.roles.all' | translate:'All' }}</span>
          </span>
        </div>

        <!-- Card 2: Authority & Feature Roles -->
        <div 
          class="stat-card" 
          [class.active-system]="activeFilter === 'system_feature'" 
          (click)="setFilter('system_feature')"
          role="button"
          tabindex="0"
          title="Click to filter by System & Feature Authority Roles"
        >
          <div class="stat-card-main">
            <div class="stat-icon-wrap" style="background: rgba(67,56,202,0.08); color: #4338ca;">
              <span class="material-symbols-outlined">admin_panel_settings</span>
            </div>
            <div class="stat-meta">
              <span class="stat-val">{{ systemFeatureRoles.length }}</span>
              <span class="stat-lbl">{{ 'identity.roles.authority_feature_roles' | translate:'Authority & Feature Roles' }}</span>
            </div>
          </div>
          <span class="active-indicator-pill indicator-system" *ngIf="activeFilter === 'system_feature'">
            <span class="material-symbols-outlined" style="font-size: 13px;">check</span>
            <span>{{ 'identity.roles.filtered' | translate:'Filtered' }}</span>
          </span>
        </div>

        <!-- Card 3: Operational Action Levels -->
        <div 
          class="stat-card" 
          [class.active-operational]="activeFilter === 'operational_level'" 
          (click)="setFilter('operational_level')"
          role="button"
          tabindex="0"
          title="Click to filter by Operational Action Levels"
        >
          <div class="stat-card-main">
            <div class="stat-icon-wrap" style="background: rgba(16,185,129,0.08); color: #10b981;">
              <span class="material-symbols-outlined">tune</span>
            </div>
            <div class="stat-meta">
              <span class="stat-val">{{ operationalLevelRoles.length }}</span>
              <span class="stat-lbl">{{ 'identity.roles.operational_levels' | translate:'Operational Action Levels' }}</span>
            </div>
          </div>
          <span class="active-indicator-pill indicator-operational" *ngIf="activeFilter === 'operational_level'">
            <span class="material-symbols-outlined" style="font-size: 13px;">check</span>
            <span>{{ 'identity.roles.filtered' | translate:'Filtered' }}</span>
          </span>
        </div>

        <!-- Card 4: Assigned Personnel -->
        <div 
          class="stat-card" 
          [class.active-assigned]="activeFilter === 'assigned'" 
          (click)="setFilter('assigned')"
          role="button"
          tabindex="0"
          title="Click to view assigned personnel directory"
        >
          <div class="stat-card-main">
            <div class="stat-icon-wrap" style="background: rgba(100,116,139,0.08); color: #475569;">
              <span class="material-symbols-outlined">groups</span>
            </div>
            <div class="stat-meta">
              <span class="stat-val">{{ totalAssignedCount }}</span>
              <span class="stat-lbl">{{ 'identity.roles.assigned_personnel' | translate:'Assigned Personnel' }}</span>
            </div>
          </div>
          <span class="active-indicator-pill indicator-assigned" *ngIf="activeFilter === 'assigned'">
            <span class="material-symbols-outlined" style="font-size: 13px;">check</span>
            <span>{{ 'identity.roles.roster' | translate:'Roster' }}</span>
          </span>
        </div>
      </div>

      <!-- Category Filter Navigation Tabs -->
      <div class="category-tabs-nav" *ngIf="!isLoading">
        <button 
          type="button" 
          class="filter-tab-btn" 
          [class.active]="activeFilter === 'all'" 
          (click)="setFilter('all')"
        >
          <span class="material-symbols-outlined">dataset</span>
          <span>{{ 'identity.roles.tab_all' | translate:'All Roles' }} ({{ rolesCatalog.length }})</span>
        </button>
        <button 
          type="button" 
          class="filter-tab-btn" 
          [class.active]="activeFilter === 'system_feature'" 
          (click)="setFilter('system_feature')"
        >
          <span class="material-symbols-outlined">shield_person</span>
          <span>{{ 'identity.roles.tab_authority' | translate:'System & Feature Authority' }} ({{ systemFeatureRoles.length }})</span>
        </button>
        <button 
          type="button" 
          class="filter-tab-btn" 
          [class.active]="activeFilter === 'operational_level'" 
          (click)="setFilter('operational_level')"
        >
          <span class="material-symbols-outlined">tune</span>
          <span>{{ 'identity.roles.tab_operational' | translate:'Operational Access Levels' }} ({{ operationalLevelRoles.length }})</span>
        </button>
        <button 
          type="button" 
          class="filter-tab-btn" 
          [class.active]="activeFilter === 'assigned'" 
          (click)="setFilter('assigned')"
        >
          <span class="material-symbols-outlined">groups</span>
          <span>{{ 'identity.roles.tab_assigned' | translate:'Assigned Personnel' }} ({{ totalAssignedCount }})</span>
        </button>
      </div>

      <!-- Group 1: System & Feature Authority Roles Card -->
      <div class="table-card" *ngIf="!isLoading && (activeFilter === 'all' || activeFilter === 'system_feature')">
        <div class="table-card-header">
          <div class="card-header-meta">
            <div class="header-icon-pill" style="background: rgba(0,80,229,0.08); color: #0050e5;">
              <span class="material-symbols-outlined">shield_person</span>
            </div>
            <div>
              <div class="header-title-row">
                <h3>{{ 'identity.roles.authority_title' | translate:'System & Feature Authority Roles' }}</h3>
                <span class="section-count-badge badge-admin">{{ systemFeatureRoles.length }} Roles</span>
              </div>
              <p>{{ 'identity.roles.authority_desc' | translate:'Sovereign platform, identity governance, and feature domain authority roles that govern workspace administration.' }}</p>
            </div>
          </div>
          <button type="button" class="btn btn-outline btn-sm" (click)="loadRoleCatalog()" title="Refresh role assignments">
            <span class="material-symbols-outlined">refresh</span>
            <span>{{ 'identity.roles.btn_refresh' | translate:'Refresh' }}</span>
          </button>
        </div>

        <div class="table-responsive">
          <table class="roles-data-table">
            <thead>
              <tr>
                <th style="min-width: 220px;">{{ 'identity.roles.th_role_tier' | translate:'Role & Authority Tier' }}</th>
                <th style="min-width: 280px;">{{ 'identity.roles.th_scope_boundaries' | translate:'Scope & Governance Boundaries' }}</th>
                <th style="width: 140px; text-align: center;">{{ 'identity.roles.th_personnel' | translate:'Personnel' }}</th>
                <th style="width: 200px;">{{ 'identity.roles.th_members_preview' | translate:'Assigned Members Preview' }}</th>
                <th style="width: 190px; text-align: right; white-space: nowrap;">{{ 'identity.roles.th_action' | translate:'Action' }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let role of systemFeatureRoles" [class.locked-row]="!role.canAssign">
                <!-- Role Name & Icon -->
                <td>
                  <div class="role-cell">
                    <div class="role-icon-box" [ngClass]="role.badge">
                      <span class="material-symbols-outlined">{{ role.icon }}</span>
                    </div>
                    <div class="role-title-box">
                      <span class="role-name">{{ role.name }}</span>
                      <span class="role-pill-badge" [ngClass]="role.badge">
                        {{ role.canAssign ? ('identity.roles.system_authority' | translate:'System Authority') : ('identity.roles.root_sovereign' | translate:'Root Sovereign') }}
                      </span>
                    </div>
                  </div>
                </td>

                <!-- Scope & Description -->
                <td>
                  <div class="scope-cell">
                    <span class="scope-tag">{{ role.scope }}</span>
                    <p class="role-desc">{{ role.description }}</p>
                  </div>
                </td>

                <!-- Member Count -->
                <td style="text-align: center;">
                  <span class="count-badge" [class.count-badge-zero]="role.memberCount === 0">
                    <strong>{{ role.memberCount }}</strong>
                    <span>{{ role.memberCount === 1 ? 'user' : 'users' }}</span>
                  </span>
                </td>

                <!-- Members Preview Avatars -->
                <td>
                  <div class="members-preview-cell" *ngIf="role.memberCount > 0">
                    <div class="avatar-stack">
                      <div
                        class="stack-avatar"
                        *ngFor="let m of role.members.slice(0, 3)"
                        [title]="m.fullName + ' (' + m.email + ')'"
                        [style.background]="getGradient(m.fullName)"
                      >
                        {{ getInitials(m.fullName) }}
                      </div>
                      <div class="stack-avatar stack-more" *ngIf="role.memberCount > 3" [title]="(role.memberCount - 3) + ' more members'">
                        +{{ role.memberCount - 3 }}
                      </div>
                    </div>
                    <span class="preview-names-text">
                      {{ getPreviewNames(role.members) }}
                    </span>
                  </div>
                  <div class="no-members-text" *ngIf="role.memberCount === 0">
                    <span>{{ 'identity.roles.no_members' | translate:'No members assigned' }}</span>
                  </div>
                </td>

                <!-- Action Button -->
                <td style="text-align: right; white-space: nowrap;">
                  <!-- SuperAdmin Locked State -->
                  <div *ngIf="!role.canAssign" class="locked-chip" title="Root account authority cannot be transferred or assigned to other users.">
                    <span class="material-symbols-outlined">lock</span>
                    <span>{{ 'identity.roles.root_account_only' | translate:'Root Account Only' }}</span>
                  </div>

                  <!-- Manage Members Modal Trigger -->
                  <button
                    *ngIf="role.canAssign"
                    type="button"
                    class="btn-manage-members"
                    (click)="openManageModal(role)"
                  >
                    <span class="material-symbols-outlined btn-icon">group_add</span>
                    <span class="btn-text">{{ 'identity.roles.btn_manage_members' | translate:'Manage Members' }}</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Group 2: Operational Access Levels Card -->
      <div class="table-card" [class.mt-4]="activeFilter === 'all'" *ngIf="!isLoading && (activeFilter === 'all' || activeFilter === 'operational_level')">
        <div class="table-card-header">
          <div class="card-header-meta">
            <div class="header-icon-pill" style="background: rgba(16,185,129,0.08); color: #10b981;">
              <span class="material-symbols-outlined">tune</span>
            </div>
            <div>
              <div class="header-title-row">
                <h3>{{ 'identity.roles.operational_title' | translate:'Operational Access Levels' }}</h3>
                <span class="section-count-badge badge-editor">{{ operationalLevelRoles.length }} Levels</span>
              </div>
              <p>{{ 'identity.roles.operational_desc' | translate:'Granular operational scopes governing content creation, data records, and read-only observation across features.' }}</p>
            </div>
          </div>
          <button *ngIf="activeFilter === 'operational_level'" type="button" class="btn btn-outline btn-sm" (click)="loadRoleCatalog()" title="Refresh role assignments">
            <span class="material-symbols-outlined">refresh</span>
            <span>{{ 'identity.roles.btn_refresh' | translate:'Refresh' }}</span>
          </button>
        </div>

        <div class="table-responsive">
          <table class="roles-data-table">
            <thead>
              <tr>
                <th style="min-width: 220px;">{{ 'identity.roles.th_role_tier' | translate:'Operational Level' }}</th>
                <th style="min-width: 280px;">{{ 'identity.roles.th_scope_boundaries' | translate:'Scope & Operational Action Boundaries' }}</th>
                <th style="width: 140px; text-align: center;">{{ 'identity.roles.th_personnel' | translate:'Personnel' }}</th>
                <th style="width: 200px;">{{ 'identity.roles.th_members_preview' | translate:'Assigned Members Preview' }}</th>
                <th style="width: 190px; text-align: right; white-space: nowrap;">{{ 'identity.roles.th_action' | translate:'Action' }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let role of operationalLevelRoles" [class.locked-row]="!role.canAssign">
                <!-- Role Name & Icon -->
                <td>
                  <div class="role-cell">
                    <div class="role-icon-box" [ngClass]="role.badge">
                      <span class="material-symbols-outlined">{{ role.icon }}</span>
                    </div>
                    <div class="role-title-box">
                      <span class="role-name">{{ role.name }}</span>
                      <span class="role-pill-badge" [ngClass]="role.badge">
                        {{ 'identity.roles.operational_level' | translate:'Operational Level' }}
                      </span>
                    </div>
                  </div>
                </td>

                <!-- Scope & Description -->
                <td>
                  <div class="scope-cell">
                    <span class="scope-tag">{{ role.scope }}</span>
                    <p class="role-desc">{{ role.description }}</p>
                  </div>
                </td>

                <!-- Member Count -->
                <td style="text-align: center;">
                  <span class="count-badge" [class.count-badge-zero]="role.memberCount === 0">
                    <strong>{{ role.memberCount }}</strong>
                    <span>{{ role.memberCount === 1 ? 'user' : 'users' }}</span>
                  </span>
                </td>

                <!-- Members Preview Avatars -->
                <td>
                  <div class="members-preview-cell" *ngIf="role.memberCount > 0">
                    <div class="avatar-stack">
                      <div
                        class="stack-avatar"
                        *ngFor="let m of role.members.slice(0, 3)"
                        [title]="m.fullName + ' (' + m.email + ')'"
                        [style.background]="getGradient(m.fullName)"
                      >
                        {{ getInitials(m.fullName) }}
                      </div>
                      <div class="stack-avatar stack-more" *ngIf="role.memberCount > 3" [title]="(role.memberCount - 3) + ' more members'">
                        +{{ role.memberCount - 3 }}
                      </div>
                    </div>
                    <span class="preview-names-text">
                      {{ getPreviewNames(role.members) }}
                    </span>
                  </div>
                  <div class="no-members-text" *ngIf="role.memberCount === 0">
                    <span>{{ 'identity.roles.no_members' | translate:'No members assigned' }}</span>
                  </div>
                </td>

                <!-- Action Button -->
                <td style="text-align: right; white-space: nowrap;">
                  <!-- Manage Members Modal Trigger -->
                  <button
                    type="button"
                    class="btn-manage-members"
                    (click)="openManageModal(role)"
                  >
                    <span class="material-symbols-outlined btn-icon">group_add</span>
                    <span class="btn-text">{{ 'identity.roles.btn_manage_members' | translate:'Manage Members' }}</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Group 3: Assigned Personnel Roster Card (When activeFilter === 'assigned') -->
      <div class="table-card" *ngIf="!isLoading && activeFilter === 'assigned'">
        <div class="table-card-header">
          <div class="card-header-meta">
            <div class="header-icon-pill" style="background: rgba(100,116,139,0.08); color: #475569;">
              <span class="material-symbols-outlined">group</span>
            </div>
            <div>
              <div class="header-title-row">
                <h3>{{ 'identity.roles.assigned_title' | translate:'Assigned Personnel Roster' }}</h3>
                <span class="section-count-badge badge-member">{{ allAssignedMembers.length }} Members</span>
              </div>
              <p>{{ 'identity.roles.assigned_desc' | translate:'Complete directory of all workspace personnel currently holding active system or operational roles.' }}</p>
            </div>
          </div>
          <button type="button" class="btn btn-outline btn-sm" (click)="loadRoleCatalog()" title="Refresh role assignments">
            <span class="material-symbols-outlined">refresh</span>
            <span>{{ 'identity.roles.btn_refresh' | translate:'Refresh' }}</span>
          </button>
        </div>

        <!-- Populated Assigned Personnel Table -->
        <div class="table-responsive" *ngIf="allAssignedMembers.length > 0">
          <table class="roles-data-table">
            <thead>
              <tr>
                <th style="min-width: 240px;">{{ 'identity.roles.th_personnel' | translate:'Personnel' }}</th>
                <th style="min-width: 200px;">{{ 'identity.roles.th_role_tier' | translate:'Assigned Role' }}</th>
                <th style="min-width: 240px;">{{ 'identity.roles.th_scope_boundaries' | translate:'Scope & Module Boundaries' }}</th>
                <th style="width: 190px; text-align: right; white-space: nowrap;">{{ 'identity.roles.th_action' | translate:'Actions' }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of allAssignedMembers">
                <td>
                  <div class="role-cell">
                    <div class="member-avatar" [style.background]="getGradient(item.member.fullName)">
                      {{ getInitials(item.member.fullName) }}
                    </div>
                    <div class="member-names">
                      <strong>{{ item.member.fullName }}</strong>
                      <span class="m-email">{{ item.member.email }}</span>
                      <span class="id-tag" *ngIf="item.member.memberId">ID: {{ item.member.memberId }}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <div class="role-cell">
                    <div class="role-icon-box" [ngClass]="item.role.badge" style="width: 34px; height: 34px;">
                      <span class="material-symbols-outlined" style="font-size: 18px;">{{ item.role.icon }}</span>
                    </div>
                    <span class="role-pill-badge" [ngClass]="item.role.badge">{{ item.role.name }}</span>
                  </div>
                </td>
                <td>
                  <div class="scope-cell">
                    <span class="scope-tag">{{ item.role.scope }}</span>
                    <span class="feature-tag" *ngIf="item.role.name === 'Feature Editor' && item.member.features && item.member.features.length > 0">
                      Features: {{ item.member.features.join(', ') }}
                    </span>
                  </div>
                </td>
                <td style="text-align: right; white-space: nowrap;">
                  <button
                    type="button"
                    class="btn-manage-members"
                    (click)="openManageModal(item.role)"
                    style="margin-right: 8px;"
                  >
                    <span class="material-symbols-outlined btn-icon">edit</span>
                    <span class="btn-text">{{ 'identity.roles.btn_manage_members' | translate:'Manage' }}</span>
                  </button>
                  <button
                    type="button"
                    class="btn-remove-role"
                    [disabled]="isUnassigning"
                    (click)="unassignRoleFromUser(item.member.userId, item.member.fullName, item.role)"
                  >
                    <span class="material-symbols-outlined">person_remove</span>
                    <span>{{ 'identity.roles.modal_btn_remove' | translate:'Remove' }}</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Empty Roster State -->
        <div class="empty-roster-state" *ngIf="allAssignedMembers.length === 0">
          <div class="empty-icon-wrap">
            <span class="material-symbols-outlined">group_off</span>
          </div>
          <h4>{{ 'identity.roles.no_personnel_yet' | translate:'No Personnel Assigned Yet' }}</h4>
          <p>{{ 'identity.roles.no_personnel_desc' | translate:'Zero members currently hold administrative or operational roles in this workspace. Select an authority or operational role below to assign personnel.' }}</p>
          <div class="empty-actions">
            <button type="button" class="btn btn-primary" (click)="setFilter('all')">
              <span class="material-symbols-outlined">visibility</span>
              <span>{{ 'identity.roles.btn_view_all_assign' | translate:'View All Roles & Assign' }}</span>
            </button>
            <a routerLink="/admin/users/list" class="btn btn-outline">
              <span class="material-symbols-outlined">person_add</span>
              <span>{{ 'identity.roles.btn_user_directory' | translate:'User Directory' }}</span>
            </a>
          </div>
        </div>
      </div>

      <!-- Manage Members Modal Dialog -->
      <div class="modal-backdrop fade-in" *ngIf="activeModalRole" (click)="closeManageModal()">
        <div class="modal-dialog" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div class="modal-header-left">
              <div class="role-icon-box" [ngClass]="activeModalRole.badge">
                <span class="material-symbols-outlined">{{ activeModalRole.icon }}</span>
              </div>
              <div>
                <h3>{{ 'identity.roles.modal_manage_title' | translate:'Manage Personnel:' }} {{ activeModalRole.name }}</h3>
                <p>{{ activeModalRole.scope }}</p>
              </div>
            </div>
            <button type="button" class="modal-close-btn" (click)="closeManageModal()">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <div class="modal-body">
            <!-- Informative Role Notices -->
            <div class="role-scope-notice notice-identity" *ngIf="activeModalRole.name === 'Identity Manager'">
              <span class="material-symbols-outlined">verified_user</span>
              <span><strong>Identity Manager Sovereign Role:</strong> Members assigned to this role possess authority to assign system roles, manage operational permissions, and dispatch workspace invitations.</span>
            </div>

            <div class="role-scope-notice notice-usermanager" *ngIf="activeModalRole.name === 'User Manager'">
              <span class="material-symbols-outlined">manage_accounts</span>
              <span><strong>User Manager Domain Role:</strong> Members assigned to this role can manage user profiles, categories, and account statuses. They cannot assign roles unless also granted Identity Manager authority.</span>
            </div>
            <div class="role-scope-notice notice-cmsmanager" *ngIf="activeModalRole.name === 'CMS Studio Manager'">
              <span class="material-symbols-outlined">web</span>
              <span><strong>CMS Studio Manager Domain Role:</strong> Members assigned to this role govern the entire Website &amp; CMS suite — including CMS Studio, Brand &amp; Settings, Link Domain, Manage Forms, My Templates, and UI Marketplace.</span>
            </div>

            <!-- Assignment Form Section -->
            <div class="assign-section">
              <h4 class="section-title">{{ 'identity.roles.modal_assign_title' | translate:'Assign Member to this Role' }}</h4>
              <div class="assign-form-grid" [class.has-feature-select]="activeModalRole.name === 'Feature Editor'">
                <!-- User Select Dropdown -->
                <div class="form-group">
                  <label>{{ 'identity.roles.modal_select_member' | translate:'Select Member *' }}</label>
                  <select [(ngModel)]="selectedUserId" class="form-control">
                    <option value="">{{ 'identity.roles.modal_choose_member' | translate:'Choose a member to assign...' }}</option>
                    <option *ngFor="let u of assignableUsers" [value]="u.id">
                      {{ u.fullName }} ({{ u.email }}) {{ u.memberId ? '• ' + u.memberId : '' }}
                    </option>
                  </select>
                </div>

                <!-- Feature Area Selector (Shown only for Feature Editor) -->
                <div class="form-group" *ngIf="activeModalRole.name === 'Feature Editor'">
                  <label>{{ 'identity.roles.modal_scope_module' | translate:'Feature Scope Module *' }}</label>
                  <select [(ngModel)]="selectedFeatureName" class="form-control">
                    <option value="UserManager">User Management (UserManager)</option>
                    <option value="ContentManager">Content & Web Pages (CMS)</option>
                    <option value="CommerceManager">Commerce Studio (Products & Orders)</option>
                    <option value="IdentityManager">Identity & Security Management</option>
                    <option value="SettingsManager">Workspace Settings & Branding</option>
                  </select>
                </div>

                <div class="form-group assign-btn-col">
                  <button
                    type="button"
                    class="btn btn-primary btn-assign"
                    [disabled]="!selectedUserId || isAssigning"
                    (click)="assignRoleToUser()"
                  >
                    <span *ngIf="!isAssigning" class="material-symbols-outlined">person_add</span>
                    <span>{{ isAssigning ? ('identity.roles.modal_assigning' | translate:'Assigning...') : ('identity.roles.modal_btn_assign' | translate:'Assign Role') }}</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Assigned Members List Section -->
            <div class="assigned-list-section">
              <div class="section-header-row">
                <h4 class="section-title">{{ 'identity.roles.modal_current_assigned' | translate:'Currently Assigned Personnel' }} ({{ activeModalRole.members.length }})</h4>
              </div>

              <div class="assigned-members-scroll">
                <div *ngFor="let m of activeModalRole.members" class="assigned-member-card">
                  <div class="member-meta-left">
                    <div class="member-avatar" [style.background]="getGradient(m.fullName)">
                      {{ getInitials(m.fullName) }}
                    </div>
                    <div class="member-names">
                      <strong>{{ m.fullName }}</strong>
                      <span class="m-email">{{ m.email }}</span>
                      <div class="m-badges">
                        <span class="id-tag" *ngIf="m.memberId">ID: {{ m.memberId }}</span>
                        <span class="feature-tag" *ngIf="activeModalRole.name === 'Feature Editor' && m.features && m.features.length > 0">
                          Scope: {{ m.features.join(', ') }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    class="btn-remove-role"
                    title="Remove role from this user"
                    [disabled]="isUnassigning"
                    (click)="unassignRoleFromUser(m.userId, m.fullName)"
                  >
                    <span class="material-symbols-outlined">person_remove</span>
                    <span>{{ 'identity.roles.modal_btn_remove' | translate:'Remove' }}</span>
                  </button>
                </div>

                <div class="empty-assigned" *ngIf="activeModalRole.members.length === 0">
                  <span class="material-symbols-outlined">group_off</span>
                  <p>{{ 'identity.roles.modal_empty_assigned' | translate:'No personnel currently hold the role.' }}</p>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-outline" (click)="closeManageModal()">{{ 'identity.roles.modal_btn_close' | translate:'Close' }}</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .identity-roles-page {
      display: flex;
      flex-direction: column;
      gap: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      width: 100%;
    }

    /* Stats Strip (Clickable Interactive Filter Cards) */
    .stats-strip {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
    }
    @media (max-width: 900px) {
      .stats-strip { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 540px) {
      .stats-strip { grid-template-columns: 1fr; }
    }
    .stat-card {
      background: #ffffff;
      border: 1.5px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
      cursor: pointer;
      user-select: none;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      outline: none;
    }
    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.06);
      border-color: #cbd5e1;
    }
    .stat-card:active {
      transform: translateY(0);
    }
    .stat-card-main {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .stat-icon-wrap {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: transform 0.2s ease;
    }
    .stat-card:hover .stat-icon-wrap {
      transform: scale(1.06);
    }
    .stat-icon-wrap span { font-size: 22px; }
    .stat-meta { display: flex; flex-direction: column; }
    .stat-val { font-size: 20px; font-weight: 800; color: #0f172a; line-height: 1.2; }
    .stat-lbl { font-size: 11.5px; color: #64748b; font-weight: 500; margin-top: 2px; }

    /* Active Card States */
    .stat-card.active-all {
      border-color: #0050e5;
      background: #fafcff;
      box-shadow: 0 0 0 2px rgba(0, 80, 229, 0.2), 0 6px 16px rgba(0, 80, 229, 0.08);
    }
    .stat-card.active-system {
      border-color: #4338ca;
      background: #fafaff;
      box-shadow: 0 0 0 2px rgba(67, 56, 202, 0.2), 0 6px 16px rgba(67, 56, 202, 0.08);
    }
    .stat-card.active-operational {
      border-color: #10b981;
      background: #f7fdfa;
      box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2), 0 6px 16px rgba(16, 185, 129, 0.08);
    }
    .stat-card.active-assigned {
      border-color: #64748b;
      background: #f8fafc;
      box-shadow: 0 0 0 2px rgba(100, 116, 139, 0.2), 0 6px 16px rgba(100, 116, 139, 0.08);
    }

    /* Active Card Indicator Badge */
    .active-indicator-pill {
      font-size: 10px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      display: inline-flex;
      align-items: center;
      gap: 3px;
      flex-shrink: 0;
    }
    .indicator-all { background: #eff6ff; color: #0050e5; border: 1px solid #bfdbfe; }
    .indicator-system { background: #eef2ff; color: #4338ca; border: 1px solid #c7d2fe; }
    .indicator-operational { background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; }
    .indicator-assigned { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }

    /* Category Tabs Nav */
    .category-tabs-nav {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px;
      background: #f1f5f9;
      border-radius: 10px;
      width: fit-content;
      max-width: 100%;
      overflow-x: auto;
    }
    .filter-tab-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border-radius: 7px;
      border: none;
      background: transparent;
      color: #64748b;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease-in-out;
      white-space: nowrap;
    }
    .filter-tab-btn span.material-symbols-outlined { font-size: 17px; }
    .filter-tab-btn:hover {
      color: #0f172a;
      background: rgba(255, 255, 255, 0.6);
    }
    .filter-tab-btn.active {
      background: #ffffff;
      color: #0050e5;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    }

    /* Table Card */
    .table-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
    }
    .table-card.mt-4 { margin-top: 20px; }
    .table-card-header {
      padding: 18px 22px;
      border-bottom: 1px solid #f1f5f9;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #fafbfc;
    }
    .card-header-meta {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .header-icon-pill {
      width: 38px;
      height: 38px;
      border-radius: 9px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .header-icon-pill span { font-size: 20px; }
    .header-title-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .header-title-row h3 { margin: 0; font-size: 15px; font-weight: 700; color: #0f172a; }
    .section-count-badge {
      font-size: 10.5px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .table-card-header p { margin: 2px 0 0; font-size: 12px; color: #64748b; }

    .table-responsive { width: 100%; overflow-x: auto; }
    .roles-data-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 13px;
    }
    .roles-data-table thead th {
      background: #f8fafc;
      padding: 12px 18px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
      border-bottom: 1px solid #e2e8f0;
    }
    .roles-data-table tbody td {
      padding: 16px 18px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
    }
    .roles-data-table tbody tr:last-child td { border-bottom: none; }
    .roles-data-table tbody tr:hover { background: #fafbfc; }
    .locked-row { background: #fafbfc; }

    /* Role Cell */
    .role-cell { display: flex; align-items: center; gap: 12px; }
    .role-icon-box {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .role-icon-box span { font-size: 22px; }
    .role-title-box { display: flex; flex-direction: column; gap: 3px; }
    .role-name { font-size: 14px; font-weight: 700; color: #0f172a; }
    .role-pill-badge {
      font-size: 10px;
      font-weight: 700;
      padding: 1px 8px;
      border-radius: 9999px;
      width: fit-content;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    /* Badges */
    .badge-root { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
    .badge-admin { background: #eff6ff; color: #0050e5; border: 1px solid #bfdbfe; }
    .badge-identity { background: #eef2ff; color: #4338ca; border: 1px solid #c7d2fe; }
    .badge-usermanager { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
    .badge-cmsmanager { background: #ecfeff; color: #0e7490; border: 1px solid #a5f3fc; }
    .badge-feature-authority { background: #faf5ff; color: #7e22ce; border: 1px solid #e9d5ff; }
    .badge-editor { background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; }
    .badge-feature { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
    .badge-readonly { background: #f8fafc; color: #475569; border: 1px solid #e2e8f0; }
    .badge-member { background: #f8fafc; color: #64748b; border: 1px solid #e2e8f0; }

    /* Scope Cell */
    .scope-cell { display: flex; flex-direction: column; gap: 4px; }
    .scope-tag {
      font-size: 11px;
      font-weight: 700;
      color: #0050e5;
      background: #eff6ff;
      padding: 2px 8px;
      border-radius: 4px;
      width: fit-content;
    }
    .role-desc {
      font-size: 12px;
      color: #64748b;
      margin: 0;
      line-height: 1.4;
      max-width: 480px;
    }

    /* Count Badge */
    .count-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: #f1f5f9;
      color: #334155;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 12px;
    }
    .count-badge strong { color: #0050e5; }
    .count-badge-zero { color: #94a3b8; }
    .count-badge-zero strong { color: #94a3b8; }

    /* Members Preview */
    .members-preview-cell { display: flex; align-items: center; gap: 8px; }
    .avatar-stack { display: flex; }
    .stack-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      font-size: 10px;
      font-weight: 700;
      border: 2px solid #ffffff;
      margin-left: -8px;
      flex-shrink: 0;
    }
    .avatar-stack .stack-avatar:first-child { margin-left: 0; }
    .stack-more { background: #64748b; font-size: 9px; }
    .preview-names-text {
      font-size: 11.5px;
      color: #64748b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 140px;
    }
    .no-members-text { font-size: 11.5px; color: #94a3b8; font-style: italic; }

    /* Actions */
    .locked-chip {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: #f1f5f9;
      color: #64748b;
      padding: 5px 10px;
      border-radius: 6px;
      font-size: 11.5px;
      font-weight: 600;
    }
    .locked-chip span.material-symbols-outlined { font-size: 15px; }

    .btn-manage-members {
      height: 34px;
      padding: 0 14px;
      border-radius: 8px;
      border: 1px solid rgba(0, 80, 229, 0.4);
      background: #ffffff;
      color: #0050e5;
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      white-space: nowrap;
      line-height: 1;
      text-decoration: none;
      transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 1px 2px rgba(0, 80, 229, 0.05);
    }
    .btn-manage-members .material-symbols-outlined,
    .btn-manage-members .btn-icon {
      font-size: 16px;
      line-height: 1;
      color: inherit;
      flex-shrink: 0;
    }
    .btn-manage-members .btn-text {
      font-size: 12.5px;
      font-weight: 600;
      line-height: 1;
      color: inherit;
      white-space: nowrap;
    }
    .btn-manage-members:hover {
      background: #0050e5;
      border-color: #0050e5;
      color: #ffffff !important;
      box-shadow: 0 4px 10px rgba(0, 80, 229, 0.22);
      transform: translateY(-1px);
    }
    .btn-manage-members:hover .material-symbols-outlined,
    .btn-manage-members:hover .btn-icon,
    .btn-manage-members:hover .btn-text {
      color: #ffffff !important;
    }
    .btn-manage-members:active {
      transform: translateY(0);
      box-shadow: none;
    }
    :host-context(.dark-mode) .btn-manage-members {
      background: rgba(0, 80, 229, 0.12);
      border-color: rgba(96, 165, 250, 0.4);
      color: #60a5fa;
    }
    :host-context(.dark-mode) .btn-manage-members:hover {
      background: #0050e5;
      border-color: #0050e5;
      color: #ffffff !important;
    }
    :host-context(.dark-mode) .btn-manage-members:hover .material-symbols-outlined,
    :host-context(.dark-mode) .btn-manage-members:hover .btn-icon,
    :host-context(.dark-mode) .btn-manage-members:hover .btn-text {
      color: #ffffff !important;
    }

    /* Modal Backdrop & Dialog */
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(15, 23, 42, 0.5);
      backdrop-filter: blur(4px);
      z-index: 1050;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .modal-dialog {
      background: #ffffff;
      border-radius: 14px;
      box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1);
      width: 100%;
      max-width: 620px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: modalSlide 0.2s ease-out;
    }
    @keyframes modalSlide {
      from { opacity: 0; transform: translateY(12px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .modal-header {
      padding: 18px 22px;
      border-bottom: 1px solid #f1f5f9;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #fafbfc;
    }
    .modal-header-left { display: flex; align-items: center; gap: 12px; }
    .modal-header-left h3 { margin: 0; font-size: 15px; font-weight: 700; color: #0f172a; }
    .modal-header-left p { margin: 2px 0 0; font-size: 11.5px; color: #64748b; }
    .modal-close-btn {
      background: none;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      padding: 4px;
      display: flex;
      align-items: center;
      border-radius: 6px;
    }
    .modal-close-btn:hover { background: #f1f5f9; color: #0f172a; }

    .modal-body {
      padding: 22px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    /* Role Scope Notices */
    .role-scope-notice {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px 14px;
      border-radius: 8px;
      font-size: 12.5px;
      line-height: 1.45;
    }
    .role-scope-notice.notice-identity {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #1e40af;
    }
    .role-scope-notice.notice-usermanager {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #166534;
    }
    .role-scope-notice.notice-cmsmanager {
      background: #ecfeff;
      border: 1px solid #a5f3fc;
      color: #155e75;
    }
    .role-scope-notice span.material-symbols-outlined { font-size: 20px; flex-shrink: 0; margin-top: 1px; }

    .section-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #475569;
      margin: 0 0 10px 0;
    }

    /* Assign Section Form */
    .assign-section {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 16px;
    }
    .assign-form-grid {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 10px;
      align-items: flex-end;
    }
    .assign-form-grid.has-feature-select {
      grid-template-columns: 1.2fr 1fr auto;
    }
    @media (max-width: 580px) {
      .assign-form-grid, .assign-form-grid.has-feature-select {
        grid-template-columns: 1fr;
      }
    }
    .form-group { display: flex; flex-direction: column; gap: 4px; }
    .form-group label { font-size: 11px; font-weight: 700; color: #475569; }
    .form-control {
      height: 38px;
      padding: 0 10px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 12.5px;
      background: #ffffff;
      color: #0f172a;
      outline: none;
    }
    .form-control:focus { border-color: #0050e5; }
    .btn-assign { height: 38px; }

    /* Assigned Personnel List */
    .assigned-members-scroll {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 260px;
      overflow-y: auto;
    }
    .assigned-member-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 14px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: #ffffff;
      transition: background 0.15s;
    }
    .assigned-member-card:hover { background: #f8fafc; }
    .member-meta-left { display: flex; align-items: center; gap: 10px; }
    .member-avatar {
      width: 34px;
      height: 34px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      font-weight: 700;
      font-size: 12px;
      flex-shrink: 0;
    }
    .member-names { display: flex; flex-direction: column; }
    .member-names strong { font-size: 13px; color: #0f172a; }
    .m-email { font-size: 11.5px; color: #64748b; }
    .m-badges { display: flex; gap: 6px; margin-top: 2px; }
    .id-tag { font-family: monospace; font-size: 10.5px; background: #f1f5f9; padding: 1px 6px; border-radius: 3px; color: #475569; }
    .feature-tag { font-size: 10.5px; font-weight: 700; color: #0050e5; background: #eff6ff; padding: 1px 6px; border-radius: 3px; }

    .btn-remove-role {
      height: 30px;
      padding: 0 10px;
      border-radius: 6px;
      border: 1px solid #fecaca;
      background: #ffffff;
      color: #dc2626;
      font-size: 11.5px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      transition: all 0.15s;
    }
    .btn-remove-role span { font-size: 15px; }
    .btn-remove-role:hover:not(:disabled) {
      background: #fef2f2;
      border-color: #dc2626;
    }

    .empty-assigned {
      padding: 28px;
      text-align: center;
      color: #94a3b8;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
    }
    .empty-assigned span { font-size: 32px; color: #cbd5e1; }
    .empty-assigned p { margin: 0; font-size: 12.5px; }

    /* Empty Roster State in Assigned Card */
    .empty-roster-state {
      padding: 48px 24px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    .empty-icon-wrap {
      width: 56px;
      height: 56px;
      border-radius: 14px;
      background: #f1f5f9;
      color: #64748b;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .empty-icon-wrap span { font-size: 30px; }
    .empty-roster-state h4 { margin: 0; font-size: 16px; font-weight: 700; color: #0f172a; }
    .empty-roster-state p { margin: 0; max-width: 460px; font-size: 13px; color: #64748b; line-height: 1.5; }
    .empty-actions { display: flex; align-items: center; gap: 12px; margin-top: 8px; }

    .modal-footer {
      padding: 14px 22px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: flex-end;
      background: #fafbfc;
    }

    .btn { height: 38px; padding: 0 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 6px; text-decoration: none; border: 1px solid transparent; }
    .btn-outline { background: #ffffff; border-color: #cbd5e1; color: #334155; }
    .btn-outline:hover { background: #f1f5f9; color: #0f172a; }
    .btn-primary { background: #0050e5; color: #ffffff; }
    .btn-primary:hover:not(:disabled) { background: #0040b8; color: #ffffff !important; }
    .btn-sm { height: 32px; padding: 0 12px; font-size: 12px; }

    /* Dark Mode Context */
    :host-context(.dark-mode) .stat-card {
      background: #1e293b;
      border-color: #334155;
    }
    :host-context(.dark-mode) .stat-val { color: #f8fafc; }
    :host-context(.dark-mode) .stat-lbl { color: #94a3b8; }
    :host-context(.dark-mode) .stat-card:hover {
      border-color: #475569;
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
    }
    :host-context(.dark-mode) .stat-card.active-all {
      border-color: #3b82f6;
      background: rgba(0, 80, 229, 0.12);
    }
    :host-context(.dark-mode) .stat-card.active-system {
      border-color: #818cf8;
      background: rgba(67, 56, 202, 0.12);
    }
    :host-context(.dark-mode) .stat-card.active-operational {
      border-color: #34d399;
      background: rgba(16, 185, 129, 0.12);
    }
    :host-context(.dark-mode) .stat-card.active-assigned {
      border-color: #94a3b8;
      background: rgba(100, 116, 139, 0.12);
    }
    :host-context(.dark-mode) .category-tabs-nav {
      background: #0f172a;
    }
    :host-context(.dark-mode) .filter-tab-btn {
      color: #94a3b8;
    }
    :host-context(.dark-mode) .filter-tab-btn:hover {
      color: #f8fafc;
      background: rgba(255, 255, 255, 0.06);
    }
    :host-context(.dark-mode) .filter-tab-btn.active {
      background: #1e293b;
      color: #60a5fa;
    }
  `]
})
export class IdentityRolesComponent implements OnInit {
  isLoading = false;
  isAssigning = false;
  isUnassigning = false;

  rolesCatalog: RoleCatalogItem[] = [];
  assignableUsers: any[] = [];

  // Filter Tab State: 'all' | 'system_feature' | 'operational_level' | 'assigned'
  activeFilter: 'all' | 'system_feature' | 'operational_level' | 'assigned' = 'all';

  // Modal State
  isSuperAdmin: boolean = false;
  activeModalRole: RoleCatalogItem | null = null;
  selectedUserId: string = '';
  selectedFeatureName: string = 'UserManager';

  get headerButtons(): PageHeaderButton[] {
    return [
      {
        text: this.translationService.translate('identity.roles.btn_user_directory', 'User Directory'),
        icon: 'groups',
        isPrimary: false,
        routerLink: '/admin/users/list'
      },
      {
        text: this.translationService.translate('nav.identity_dashboard', 'Identity Dashboard'),
        icon: 'admin_panel_settings',
        isPrimary: false,
        routerLink: '/identity/console'
      }
    ];
  }

  constructor(
    private api: ApiService,
    private toast: ToastService,
    private translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.checkCurrentUserRole();
    this.loadRoleCatalog();
    this.loadAssignableUsers();
  }

  /**
   * Sets or toggles the active filter view when clicking cards or tabs.
   * If an active filtered view is clicked again, it toggles back to 'all'.
   */
  setFilter(filter: 'all' | 'system_feature' | 'operational_level' | 'assigned'): void {
    if (this.activeFilter === filter && filter !== 'all') {
      this.activeFilter = 'all';
    } else {
      this.activeFilter = filter;
    }
  }

  /**
   * Evaluates the authenticated user identity to determine if SuperAdmin access is permitted.
   */
  private checkCurrentUserRole(): void {
    const userStr = localStorage.getItem('auth_user') || localStorage.getItem('user');
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        const roles: string[] = u.roles || [];
        this.isSuperAdmin = roles.some(r => r.toLowerCase() === 'superadmin');
      } catch {}
    }
  }

  /**
   * Filtered getter for Group 1: System & Feature Authority Roles.
   */
  get systemFeatureRoles(): RoleCatalogItem[] {
    return this.rolesCatalog
      .filter(r => r.group === 'system_feature' || ['SuperAdmin', 'Admin', 'Identity Manager', 'User Manager', 'CMS Studio Manager', 'Member'].includes(r.name))
      .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
  }

  /**
   * Filtered getter for Group 2: Operational Access Levels.
   */
  get operationalLevelRoles(): RoleCatalogItem[] {
    return this.rolesCatalog
      .filter(r => r.group === 'operational_level' || ['Global Editor', 'Feature Editor', 'Read Only'].includes(r.name))
      .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
  }

  /**
   * Total assigned personnel across all system and operational roles.
   */
  get totalAssignedCount(): number {
    return this.rolesCatalog.reduce((acc, curr) => acc + curr.memberCount, 0);
  }

  /**
   * Complete flat roster of all assigned members mapped to their respective roles.
   */
  get allAssignedMembers(): { role: RoleCatalogItem; member: RoleMemberItem }[] {
    const list: { role: RoleCatalogItem; member: RoleMemberItem }[] = [];
    for (const role of this.rolesCatalog) {
      if (role.members && role.members.length > 0) {
        for (const m of role.members) {
          list.push({ role, member: m });
        }
      }
    }
    return list;
  }

  /**
   * Fetches the complete system roles catalog from the backend API.
   */
  loadRoleCatalog(): void {
    this.isLoading = true;
    this.api.get<any>('IdentityApi/roles/catalog').subscribe({
      next: (res) => {
        this.isLoading = false;
        const allRoles: RoleCatalogItem[] = res.data || [];
        // Strictly filter out SuperAdmin unless the current logged-in user is SuperAdmin
        this.rolesCatalog = allRoles
          .filter(r => {
            if (r.name.toLowerCase() === 'superadmin') {
              return this.isSuperAdmin;
            }
            return true;
          })
          .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));

        // Update active modal role reference if open
        if (this.activeModalRole) {
          const refreshed = this.rolesCatalog.find(r => r.name === this.activeModalRole?.name);
          if (refreshed) this.activeModalRole = refreshed;
        }
      },
      error: () => {
        this.isLoading = false;
        this.toast.error('Failed to load system roles catalog.');
      }
    });
  }

  /**
   * Loads users eligible to receive role assignments.
   */
  loadAssignableUsers(): void {
    this.api.get<any>('UsersApi').subscribe({
      next: (res) => {
        // Strictly exclude root SuperAdmin users from assignment target dropdown
        this.assignableUsers = (res.data || []).filter((u: any) => !u.roles?.includes('SuperAdmin'));
      },
      error: () => {}
    });
  }

  openManageModal(role: RoleCatalogItem): void {
    this.activeModalRole = role;
    this.selectedUserId = '';
    this.selectedFeatureName = 'UserManager';
  }

  closeManageModal(): void {
    this.activeModalRole = null;
    this.selectedUserId = '';
  }

  assignRoleToUser(): void {
    if (!this.activeModalRole || !this.selectedUserId) return;

    if (this.activeModalRole.name === 'SuperAdmin') {
      this.toast.error('The SuperAdmin role is strictly reserved for the root account and cannot be assigned.');
      return;
    }

    this.isAssigning = true;
    const payload = {
      userId: this.selectedUserId,
      roleName: this.activeModalRole.name,
      featureArea: this.activeModalRole.name === 'Feature Editor' ? this.selectedFeatureName : undefined,
      featureName: this.activeModalRole.name === 'Feature Editor' ? this.selectedFeatureName : undefined
    };

    this.api.post<any>('IdentityApi/roles/assign', payload).subscribe({
      next: () => {
        this.isAssigning = false;
        this.toast.success(`Assigned ${this.activeModalRole?.name} role successfully.`);
        this.selectedUserId = '';
        this.loadRoleCatalog();
      },
      error: (err) => {
        this.isAssigning = false;
        this.toast.error(err?.error?.message || 'Failed to assign role.');
      }
    });
  }

  unassignRoleFromUser(userId: string, userName: string, roleOverride?: RoleCatalogItem): void {
    const targetRole = roleOverride || this.activeModalRole;
    if (!targetRole) return;

    if (targetRole.name === 'SuperAdmin') {
      this.toast.error('Cannot unassign the root SuperAdmin role.');
      return;
    }

    this.isUnassigning = true;
    const payload = {
      userId,
      roleName: targetRole.name
    };

    this.api.post<any>('IdentityApi/roles/unassign', payload).subscribe({
      next: () => {
        this.isUnassigning = false;
        this.toast.success(`Removed ${targetRole.name} from ${userName}.`);
        this.loadRoleCatalog();
      },
      error: (err) => {
        this.isUnassigning = false;
        this.toast.error(err?.error?.message || 'Failed to unassign role.');
      }
    });
  }

  getPreviewNames(members: RoleMemberItem[]): string {
    if (!members || members.length === 0) return '';
    const names = members.slice(0, 2).map(m => m.fullName);
    if (members.length > 2) {
      return `${names.join(', ')} +${members.length - 2}`;
    }
    return names.join(', ');
  }

  getInitials(name: string): string {
    if (!name) return 'U';
    const parts = name.trim().split(' ').filter(p => p.length > 0);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].substring(0, Math.min(2, parts[0].length)).toUpperCase();
  }

  getGradient(name: string): string {
    if (!name) return 'linear-gradient(135deg, #0050e5, #3b82f6)';
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `linear-gradient(135deg, hsl(${hue}, 70%, 45%), hsl(${(hue + 40) % 360}, 75%, 55%))`;
  }
}
