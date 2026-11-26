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
 * Interface representing a modular capability suite and its assigned action scope.
 */
interface CapabilityScope {
  key: string;
  name: string;
  category: string;
  icon: string;
  description: string;
  scope: 'None' | 'ReadOnly' | 'FeatureEdit' | 'GlobalEdit';
  isPaid?: boolean;
}

/**
 * Interface representing member preview details inside a user group.
 */
interface GroupMemberPreview {
  id?: string;
  fullName?: string;
  email?: string;
  designation?: string;
  avatarUrl?: string;
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
        <!-- Card 1: User Groups & Blueprints -->
        <div 
          class="stat-card" 
          [class.active-groups]="activeFilter === 'user_groups'" 
          (click)="setFilter('user_groups')"
          role="button"
          tabindex="0"
          title="Click to view User Groups & Permission Blueprints"
        >
          <div class="stat-card-main">
            <div class="stat-icon-wrap" style="background: rgba(0,80,229,0.08); color: #0050e5;">
              <span class="material-symbols-outlined">group_work</span>
            </div>
            <div class="stat-meta">
              <span class="stat-val">{{ userGroups.length }}</span>
              <span class="stat-lbl">{{ 'identity.roles.user_groups' | translate:'User Groups' }}</span>
            </div>
          </div>
          <span class="active-indicator-pill indicator-groups" *ngIf="activeFilter === 'user_groups'">
            <span class="material-symbols-outlined" style="font-size: 13px;">check</span>
            <span>{{ 'identity.roles.blueprints' | translate:'Blueprints' }}</span>
          </span>
        </div>

        <!-- Card 2: All Permissions (System & Features) -->
        <div 
          class="stat-card" 
          [class.active-system]="activeFilter === 'permissions'" 
          (click)="setFilter('permissions')"
          role="button"
          tabindex="0"
          title="Click to view All Permissions (System & Features)"
        >
          <div class="stat-card-main">
            <div class="stat-icon-wrap" style="background: rgba(67,56,202,0.08); color: #4338ca;">
              <span class="material-symbols-outlined">shield_person</span>
            </div>
            <div class="stat-meta">
              <span class="stat-val">{{ majorRoles.length + systemModuleRoles.length + paidFeatureRoles.length }}</span>
              <span class="stat-lbl">{{ 'identity.roles.all_permissions' | translate:'All Permissions' }}</span>
            </div>
          </div>
          <span class="active-indicator-pill indicator-system" *ngIf="activeFilter === 'permissions'">
            <span class="material-symbols-outlined" style="font-size: 13px;">check</span>
            <span>{{ 'identity.roles.system_and_features' | translate:'System & Features' }}</span>
          </span>
        </div>

        <!-- Card 3: Editor Permissions -->
        <div 
          class="stat-card" 
          [class.active-operational]="activeFilter === 'editor_permissions'" 
          (click)="setFilter('editor_permissions')"
          role="button"
          tabindex="0"
          title="Click to view Editor Permissions & Operational Levels"
        >
          <div class="stat-card-main">
            <div class="stat-icon-wrap" style="background: rgba(16,185,129,0.08); color: #10b981;">
              <span class="material-symbols-outlined">tune</span>
            </div>
            <div class="stat-meta">
              <span class="stat-val">{{ operationalLevelRoles.length }}</span>
              <span class="stat-lbl">{{ 'identity.roles.editor_permissions' | translate:'Editor Permissions' }}</span>
            </div>
          </div>
          <span class="active-indicator-pill indicator-operational" *ngIf="activeFilter === 'editor_permissions'">
            <span class="material-symbols-outlined" style="font-size: 13px;">check</span>
            <span>{{ 'identity.roles.operational_levels' | translate:'Operational Levels' }}</span>
          </span>
        </div>
      </div>

      <!-- Category Filter Navigation Tabs -->
      <div class="category-tabs-nav" *ngIf="!isLoading">
        <button 
          type="button" 
          class="filter-tab-btn" 
          [class.active]="activeFilter === 'user_groups'" 
          (click)="setFilter('user_groups')"
        >
          <span class="material-symbols-outlined">group_work</span>
          <span>{{ 'identity.roles.tab_user_groups' | translate:'User Groups' }} ({{ userGroups.length }})</span>
        </button>
        <button 
          type="button" 
          class="filter-tab-btn" 
          [class.active]="activeFilter === 'permissions'" 
          (click)="setFilter('permissions')"
        >
          <span class="material-symbols-outlined">shield_person</span>
          <span>{{ 'identity.roles.tab_all_permissions' | translate:'All Permissions' }} ({{ majorRoles.length + systemModuleRoles.length + paidFeatureRoles.length }})</span>
        </button>
        <button 
          type="button" 
          class="filter-tab-btn" 
          [class.active]="activeFilter === 'editor_permissions'" 
          (click)="setFilter('editor_permissions')"
        >
          <span class="material-symbols-outlined">tune</span>
          <span>{{ 'identity.roles.tab_editor_permissions' | translate:'Editor Permissions' }} ({{ operationalLevelRoles.length }})</span>
        </button>
      </div>

      <!-- Tab 1: User Groups & Permission Blueprints (Active by Default) -->
      <div class="user-groups-section" *ngIf="!isLoading && activeFilter === 'user_groups'">
        <!-- Security & Architecture Advisory Banner -->
        <div class="groups-banner">
          <div class="banner-icon-wrap">
            <span class="material-symbols-outlined">group_work</span>
          </div>
          <div class="banner-body">
            <h4>{{ 'identity.roles.groups_banner_title' | translate:'User Group Permissions & Scoped Roles' }}</h4>
            <p>
              {{ 'identity.roles.groups_banner_desc' | translate:'User groups let you bundle a system access role with specific capability permissions (e.g., Content Editors, Operations Staff, Finance Auditors). Assign members to a group so they only see the modules and actions they need without configuring users one by one.' }}
            </p>
          </div>
          <div class="banner-actions" *ngIf="!editingGroup">
            <button type="button" class="btn btn-primary" (click)="startCreateGroup()">
              <span class="material-symbols-outlined">add_circle</span>
              <span>{{ 'identity.roles.btn_create_group' | translate:'Create User Group' }}</span>
            </button>
          </div>
        </div>

        <!-- Inline Group / Blueprint Editor (when editing or creating) -->
        <div class="group-editor-card" *ngIf="editingGroup">
          <div class="editor-header">
            <div class="editor-title-row">
              <span class="material-symbols-outlined editor-icon">{{ editingGroup.id ? 'tune' : 'add_moderator' }}</span>
              <div>
                <h3>{{ editingGroup.id ? ('Edit User Group: ' + editingGroup.name) : 'Create New User Group Blueprint' }}</h3>
                <p>Define group identity, base system access level, and modular capability scopes.</p>
              </div>
            </div>
            <button type="button" class="btn btn-outline btn-sm" (click)="cancelEditGroup()">
              <span class="material-symbols-outlined">close</span>
              <span>Cancel</span>
            </button>
          </div>

          <div class="editor-body">
            <!-- Form Fields Grid -->
            <div class="editor-form-grid">
              <div class="form-group">
                <label>Group Name *</label>
                <input type="text" [(ngModel)]="editingGroup.name" placeholder="e.g. Operations & Workforce Manager" class="form-control" />
              </div>

              <div class="form-group">
                <label>Base System Role *</label>
                <select [(ngModel)]="editingGroup.baseRole" class="form-control">
                  <optgroup label="Core Platform Governance">
                    <option value="Admin">Administrator (Full Unrestricted Access)</option>
                    <option value="Member">Member (Standard Workspace Access)</option>
                  </optgroup>
                  <optgroup label="System Module Roles">
                    <option value="Central Command Manager">Central Command Manager</option>
                    <option value="CMS Studio Manager">Website &amp; CMS Manager</option>
                    <option value="User Manager">User Manager</option>
                    <option value="Identity Manager">Identity &amp; Access Manager</option>
                    <option value="Broadcast Manager">Broadcast &amp; Communications Manager</option>
                    <option value="Billing Manager">Billing &amp; Invoices Manager</option>
                    <option value="Settings &amp; Audit Manager">Settings &amp; Audit Manager</option>
                  </optgroup>
                  <optgroup label="Paid &amp; Modular Features">
                    <option value="Staff Rota &amp; Shifts Manager">Workforce &amp; Shifts Manager (Paid)</option>
                  </optgroup>
                  <optgroup label="Operational Action Levels">
                    <option value="GlobalEditor">Global Editor (Workspace-Wide Editing)</option>
                    <option value="FeatureEditor">Feature Editor (Scoped Capability Access)</option>
                    <option value="ReadOnly">Read Only (Inspection &amp; Audit Observer)</option>
                  </optgroup>
                </select>
              </div>

              <div class="form-group">
                <label>Color Badge</label>
                <div class="color-picker-row">
                  <input type="color" [(ngModel)]="editingGroup.colorBadge" class="color-input" />
                  <input type="text" [(ngModel)]="editingGroup.colorBadge" class="form-control" placeholder="#0050E5" />
                </div>
              </div>

              <div class="form-group">
                <label>Material Icon</label>
                <div class="icon-input-row">
                  <span class="material-symbols-outlined icon-preview" [style.color]="editingGroup.colorBadge || '#0050E5'">{{ editingGroup.icon || 'groups' }}</span>
                  <input type="text" [(ngModel)]="editingGroup.icon" class="form-control" placeholder="e.g. badge, work, shield" />
                </div>
              </div>

              <div class="form-group span-full">
                <label>Description</label>
                <textarea [(ngModel)]="editingGroup.description" rows="2" class="form-control" placeholder="Describe the purpose, designated department, or authority scope of this group..."></textarea>
              </div>

              <div class="form-group span-full">
                <label class="checkbox-label">
                  <input type="checkbox" [(ngModel)]="editingGroup.isDefault" />
                  <span>Set as default group for newly invited members</span>
                </label>
              </div>
            </div>

            <!-- Granular Capability Scopes Matrix -->
            <div class="blueprint-matrix-section">
              <div class="matrix-header">
                <h4>Modular Capability Action Scopes</h4>
                <p>Define which system modules members in this group can access and their permitted action level.</p>
              </div>

              <div class="blueprint-table-wrap">
                <table class="blueprint-table">
                  <thead>
                    <tr>
                      <th style="min-width: 240px;">Capability Suite</th>
                      <th style="min-width: 260px;">Functional Scope</th>
                      <th style="width: 380px;">Assigned Action Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let item of editingGroupCapabilities">
                      <td>
                        <div class="feat-cell">
                          <span class="material-symbols-outlined feat-icon" [style.color]="editingGroup.colorBadge || '#0050E5'">{{ item.icon }}</span>
                          <div>
                            <strong>{{ item.name }}</strong>
                            <span class="cat-tag">{{ item.category }}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span class="feat-desc">{{ item.description }}</span>
                      </td>
                      <td>
                        <div class="segmented-role-control">
                          <button
                            type="button"
                            class="seg-btn seg-none"
                            [class.active]="item.scope === 'None'"
                            (click)="item.scope = 'None'"
                            title="No access"
                          >
                            <span class="material-symbols-outlined">block</span>
                            <span>None</span>
                          </button>
                          <button
                            type="button"
                            class="seg-btn seg-readonly"
                            [class.active]="item.scope === 'ReadOnly'"
                            (click)="item.scope = 'ReadOnly'"
                            title="Read Only"
                          >
                            <span class="material-symbols-outlined">visibility</span>
                            <span>Read Only</span>
                          </button>
                          <button
                            type="button"
                            class="seg-btn seg-feature"
                            [class.active]="item.scope === 'FeatureEdit'"
                            (click)="item.scope = 'FeatureEdit'"
                            title="Feature Editor"
                          >
                            <span class="material-symbols-outlined">edit_note</span>
                            <span>Feature Editor</span>
                          </button>
                          <button
                            type="button"
                            class="seg-btn seg-global"
                            [class.active]="item.scope === 'GlobalEdit'"
                            (click)="item.scope = 'GlobalEdit'"
                            title="Global Editor"
                          >
                            <span class="material-symbols-outlined">domain</span>
                            <span>Global Editor</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div class="editor-footer">
            <button type="button" class="btn btn-outline" (click)="cancelEditGroup()" [disabled]="isSavingGroup">Cancel</button>
            <button type="button" class="btn btn-primary" (click)="saveGroup()" [disabled]="isSavingGroup">
              <span class="material-symbols-outlined" *ngIf="!isSavingGroup">save</span>
              <span class="material-symbols-outlined spinner" *ngIf="isSavingGroup">progress_activity</span>
              <span>{{ isSavingGroup ? 'Saving Blueprint...' : (editingGroup.id ? 'Save Changes' : 'Create User Group') }}</span>
            </button>
          </div>
        </div>

        <!-- Group Table View (When not editing) -->
        <div class="table-card" *ngIf="!editingGroup">
          <div class="table-card-header">
            <div class="card-header-meta">
              <div class="header-icon-pill" style="background: rgba(0,80,229,0.08); color: #0050e5;">
                <span class="material-symbols-outlined">group_work</span>
              </div>
              <div>
                <div class="header-title-row">
                  <h3>{{ 'identity.roles.user_groups_title' | translate:'User Groups & Permission Blueprints' }}</h3>
                  <span class="section-count-badge badge-admin">{{ userGroups.length }} Groups</span>
                </div>
                <p>{{ 'identity.roles.user_groups_desc' | translate:'Configured permission blueprint groups with assigned member rosters and modular capability scopes.' }}</p>
              </div>
            </div>
            <button type="button" class="btn btn-outline btn-sm" (click)="loadUserGroups()" title="Refresh user groups">
              <span class="material-symbols-outlined">refresh</span>
              <span>{{ 'identity.roles.btn_refresh' | translate:'Refresh' }}</span>
            </button>
          </div>

          <div class="table-responsive">
            <table class="roles-data-table">
              <thead>
                <tr>
                  <th style="min-width: 240px;">{{ 'identity.roles.th_group_tier' | translate:'Group Name & Base Tier' }}</th>
                  <th style="min-width: 280px;">{{ 'identity.roles.th_scope_boundaries' | translate:'Scope & Governance Boundaries' }}</th>
                  <th style="min-width: 320px;">{{ 'identity.roles.th_assigned_personnel' | translate:'Assigned Personnel' }}</th>
                  <th style="width: 220px; text-align: right; white-space: nowrap;">{{ 'identity.roles.th_action' | translate:'Actions' }}</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let g of userGroups">
                  <!-- Group Name & Icon -->
                  <td>
                    <div class="role-cell">
                      <div class="group-icon-pill" [style.background]="(g.colorBadge || '#0050E5') + '15'" [style.color]="g.colorBadge || '#0050E5'">
                        <span class="material-symbols-outlined">{{ g.icon || 'groups' }}</span>
                      </div>
                      <div class="role-title-box">
                        <span class="role-name">{{ g.name }}</span>
                        <div style="display: flex; gap: 6px; align-items: center; margin-top: 2px;">
                          <span class="default-pill" *ngIf="g.isDefault">DEFAULT</span>
                          <span class="role-pill" [style.color]="g.colorBadge || '#0050E5'">{{ g.baseRole }}</span>
                        </div>
                      </div>
                    </div>
                  </td>

                  <!-- Scope & Description -->
                  <td>
                    <div class="scope-cell">
                      <p class="role-desc">{{ g.description || 'Predefined permissions blueprint for workspace members.' }}</p>
                      <span class="rule-count-pill">{{ g.permissionsCount || 0 }} rules configured</span>
                    </div>
                  </td>

                  <!-- Assigned Personnel (Avatar Stack) -->
                  <td>
                    <div class="members-preview-cell" *ngIf="(g.membersCount || 0) > 0">
                      <span class="count-badge">
                        <strong>{{ g.membersCount }}</strong>
                        <span>{{ g.membersCount === 1 ? 'user' : 'users' }}</span>
                      </span>
                      <div class="avatar-stack">
                        <div
                          class="stack-avatar"
                          *ngFor="let m of getGroupPreviewMembers(g); let idx = index"
                          [title]="(m.fullName || m.email || '') + (m.designation ? ' - ' + m.designation : '')"
                          [style.background]="getMemberGradient(m.fullName || m.email || '', idx)"
                        >
                          {{ getInitials(m.fullName || m.email || '') }}
                        </div>
                        <div class="stack-avatar stack-more" *ngIf="(g.membersCount || 0) > 3" [title]="((g.membersCount || 0) - 3) + ' more members'">
                          +{{ (g.membersCount || 0) - 3 }}
                        </div>
                      </div>
                      <span class="preview-names-text" [title]="getMemberNamesText(g)">
                        {{ getMemberNamesText(g) }}
                      </span>
                    </div>
                    <div class="no-members-text" *ngIf="(g.membersCount || 0) === 0">
                      <span class="count-badge count-badge-zero"><strong>0</strong> <span>users</span></span>
                      <span>No members assigned</span>
                    </div>
                  </td>

                  <!-- Actions -->
                  <td style="text-align: right; white-space: nowrap;">
                    <button type="button" class="btn-manage-members" (click)="startEditGroup(g)" title="Configure blueprint capability permissions">
                      <span class="material-symbols-outlined btn-icon">tune</span>
                      <span class="btn-text">Configure Blueprint</span>
                    </button>
                    <div class="quick-icons" style="display: inline-flex; vertical-align: middle; margin-left: 6px;">
                      <button type="button" class="icon-btn edit-icon-btn" (click)="startEditGroup(g)" title="Edit group identity">
                        <span class="material-symbols-outlined">edit</span>
                      </button>
                      <button type="button" class="icon-btn delete-icon-btn" (click)="deleteGroup(g)" [disabled]="g.isDefault || g.isSystem" title="Delete group">
                        <span class="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Tab 2: All Permissions (3 Distinct Cards: Major Roles, System Roles, Feature/Paid Roles) -->
      <div class="permissions-tab-section" *ngIf="!isLoading && activeFilter === 'permissions'">
        
        <!-- CARD 1: Major Platform Roles -->
        <div class="table-card">
          <div class="table-card-header">
            <div class="card-header-meta">
              <div class="header-icon-pill" style="background: rgba(0,80,229,0.08); color: #0050e5;">
                <span class="material-symbols-outlined">shield_person</span>
              </div>
              <div>
                <div class="header-title-row">
                  <h3>Major Platform Roles</h3>
                  <span class="section-count-badge badge-admin">{{ majorRoles.length }} Roles</span>
                </div>
                <p>Platform foundational governance and root sovereign access levels.</p>
              </div>
            </div>
            <button type="button" class="btn btn-outline btn-sm" (click)="loadRoleCatalog()" title="Refresh role catalog">
              <span class="material-symbols-outlined">refresh</span>
              <span>{{ 'identity.roles.btn_refresh' | translate:'Refresh' }}</span>
            </button>
          </div>

          <div class="table-responsive">
            <table class="roles-data-table">
              <thead>
                <tr>
                  <th style="width: 320px;">Role</th>
                  <th>Scope & Governance Boundaries</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let role of majorRoles">
                  <td style="vertical-align: top;">
                    <div class="role-cell">
                      <div class="role-icon-box" [ngClass]="role.badge">
                        <span class="material-symbols-outlined">{{ role.icon }}</span>
                      </div>
                      <div class="role-title-box">
                        <span class="role-name">{{ role.name }}</span>
                        <span class="role-pill-badge" [ngClass]="role.badge">
                          {{ role.name === 'SuperAdmin' ? 'Root Sovereign' : (role.name === 'Admin' ? 'Global Admin' : 'Baseline Member') }}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div class="scope-cell">
                      <span class="scope-tag">{{ role.scope }}</span>
                      <p class="role-desc">{{ role.description }}</p>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- CARD 2: Core System Roles (Matching Sidebar Navigation) -->
        <div class="table-card mt-4">
          <div class="table-card-header">
            <div class="card-header-meta">
              <div class="header-icon-pill" style="background: rgba(67,56,202,0.08); color: #4338ca;">
                <span class="material-symbols-outlined">dataset</span>
              </div>
              <div>
                <div class="header-title-row">
                  <h3>System Roles (Core Modules)</h3>
                  <span class="section-count-badge badge-identity">{{ systemModuleRoles.length }} Roles</span>
                </div>
                <p>Standard built-in platform capabilities matching the core workspace sidebar navigation.</p>
              </div>
            </div>
          </div>

          <div class="table-responsive">
            <table class="roles-data-table">
              <thead>
                <tr>
                  <th style="width: 320px;">System Role</th>
                  <th>Description & Operational Scope</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let role of systemModuleRoles">
                  <td style="vertical-align: top;">
                    <div class="role-cell">
                      <div class="role-icon-box" [ngClass]="role.badge">
                        <span class="material-symbols-outlined">{{ role.icon }}</span>
                      </div>
                      <div class="role-title-box">
                        <span class="role-name">{{ role.name }}</span>
                        <span class="role-pill-badge" [ngClass]="role.badge">System Role</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div class="scope-cell">
                      <span class="scope-tag">{{ role.scope }}</span>
                      <p class="role-desc">{{ role.description }}</p>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- CARD 3: Feature / Paid Roles (Modular Add-ons) -->
        <div class="table-card mt-4">
          <div class="table-card-header">
            <div class="card-header-meta">
              <div class="header-icon-pill" style="background: rgba(16,185,129,0.08); color: #10b981;">
                <span class="material-symbols-outlined">workspace_premium</span>
              </div>
              <div>
                <div class="header-title-row">
                  <h3>Feature & Paid Roles</h3>
                  <span class="section-count-badge badge-editor">{{ paidFeatureRoles.length }} Active</span>
                </div>
                <p>Dynamic domain capabilities unlocked exclusively by active workspace subscription add-ons.</p>
              </div>
            </div>
          </div>

          <div class="table-responsive">
            <table class="roles-data-table">
              <thead>
                <tr>
                  <th style="width: 320px;">Feature Role</th>
                  <th>Description & Modular Scope</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let role of paidFeatureRoles">
                  <td style="vertical-align: top;">
                    <div class="role-cell">
                      <div class="role-icon-box" [ngClass]="role.badge || 'badge-feature-authority'">
                        <span class="material-symbols-outlined">{{ role.icon || 'calendar_month' }}</span>
                      </div>
                      <div class="role-title-box">
                        <span class="role-name">{{ role.name }}</span>
                        <span class="role-pill-badge badge-feature">Paid Feature</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div class="scope-cell">
                      <span class="scope-tag">{{ role.scope }}</span>
                      <p class="role-desc">{{ role.description }}</p>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <!-- Tab 3: Editor Permissions (Operational Access Levels) -->
      <div class="table-card" *ngIf="!isLoading && activeFilter === 'editor_permissions'">
        <div class="table-card-header">
          <div class="card-header-meta">
            <div class="header-icon-pill" style="background: rgba(16,185,129,0.08); color: #10b981;">
              <span class="material-symbols-outlined">tune</span>
            </div>
            <div>
              <div class="header-title-row">
                <h3>{{ 'identity.roles.operational_title' | translate:'Editor Permissions & Operational Action Levels' }}</h3>
                <span class="section-count-badge badge-editor">{{ operationalLevelRoles.length }} Levels</span>
              </div>
              <p>{{ 'identity.roles.operational_desc' | translate:'Granular operational scopes governing content creation, data records, and read-only observation across features.' }}</p>
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
                <th style="min-width: 220px;">{{ 'identity.roles.th_role_tier' | translate:'Operational Level' }}</th>
                <th style="min-width: 280px;">{{ 'identity.roles.th_scope_boundaries' | translate:'Scope & Operational Action Boundaries' }}</th>
                <th style="width: 140px; text-align: center;">{{ 'identity.roles.th_personnel' | translate:'Personnel' }}</th>
                <th style="width: 260px;">{{ 'identity.roles.th_members_preview' | translate:'Assigned Members Preview' }}</th>
                <th style="width: 190px; text-align: right; white-space: nowrap;">{{ 'identity.roles.th_action' | translate:'Action' }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let role of operationalLevelRoles" [class.locked-row]="!role.canAssign">
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
                <td>
                  <div class="scope-cell">
                    <span class="scope-tag">{{ role.scope }}</span>
                    <p class="role-desc">{{ role.description }}</p>
                  </div>
                </td>
                <td style="text-align: center;">
                  <span class="count-badge" [class.count-badge-zero]="role.memberCount === 0">
                    <strong>{{ role.memberCount }}</strong>
                    <span>{{ role.memberCount === 1 ? 'user' : 'users' }}</span>
                  </span>
                </td>
                <td>
                  <div class="members-preview-cell" *ngIf="role.memberCount > 0">
                    <div class="avatar-stack">
                      <div
                        class="stack-avatar"
                        *ngFor="let m of role.members.slice(0, 3); let idx = index"
                        [title]="m.fullName + ' (' + m.email + ')'"
                        [style.background]="getMemberGradient(m.fullName, idx)"
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
                <td style="text-align: right; white-space: nowrap;">
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
            <div class="role-scope-notice notice-usermanager" *ngIf="activeModalRole.name === 'Member'">
              <span class="material-symbols-outlined">shield</span>
              <span><strong>Baseline Role Protection:</strong> Every active user in the workspace automatically holds the <strong>Member</strong> role. You cannot remove a user from Member, but you can assign or remove elevated roles.</span>
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
                    *ngIf="activeModalRole.name !== 'Member'"
                    type="button"
                    class="btn-remove-role"
                    title="Remove role from this user"
                    [disabled]="isUnassigning"
                    (click)="unassignRoleFromUser(m.userId, m.fullName)"
                  >
                    <span class="material-symbols-outlined">person_remove</span>
                    <span>{{ 'identity.roles.modal_btn_remove' | translate:'Remove' }}</span>
                  </button>
                  <span *ngIf="activeModalRole.name === 'Member'" class="id-tag" title="Baseline role cannot be removed">
                    <span class="material-symbols-outlined" style="font-size: 14px; vertical-align: middle;">lock</span> Baseline
                  </span>
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
      grid-template-columns: repeat(3, 1fr);
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
    .stat-card.active-groups {
      border-color: #0050e5;
      background: #fafcff;
      box-shadow: 0 0 0 2px rgba(0, 80, 229, 0.2), 0 6px 16px rgba(0, 80, 229, 0.08);
    }
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
    .indicator-groups { background: #eff6ff; color: #0050e5; border: 1px solid #bfdbfe; }
    .indicator-all { background: #eff6ff; color: #0050e5; border: 1px solid #bfdbfe; }
    .indicator-system { background: #eef2ff; color: #4338ca; border: 1px solid #c7d2fe; }
    .indicator-operational { background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; }
    .indicator-assigned { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }

    /* User Groups Section Styles */
    .user-groups-section {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .groups-banner {
      background: #eff6ff;
      border: 1px solid #dbeafe;
      border-radius: 12px;
      padding: 18px 22px;
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }
    .banner-icon-wrap {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      background: #dbeafe;
      color: #0050e5;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .banner-icon-wrap .material-symbols-outlined { font-size: 24px; }
    .banner-body { flex: 1; }
    .banner-body h4 { margin: 0 0 4px 0; font-size: 14.5px; font-weight: 700; color: #1e3a8a; }
    .banner-body p { margin: 0; font-size: 12.5px; color: #3b82f6; line-height: 1.45; }
    .banner-actions { display: flex; align-items: center; }

    /* Group Cards Grid */
    .groups-cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 18px;
    }
    .group-blueprint-card {
      background: #ffffff;
      border: 1.5px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 14px;
      transition: all 0.2s ease;
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
    }
    .group-blueprint-card:hover {
      border-color: #93c5fd;
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(0, 80, 229, 0.07);
    }
    .group-top-row {
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
    .group-icon-pill .material-symbols-outlined { font-size: 22px; }
    .group-badges {
      display: flex;
      align-items: center;
      gap: 6px;
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
    .group-main-info {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .group-title { margin: 0; font-size: 15px; font-weight: 700; color: #0f172a; }
    .group-desc { margin: 0; font-size: 12.5px; color: #64748b; line-height: 1.45; }
    .group-meta-row {
      display: flex;
      align-items: center;
      gap: 14px;
      font-size: 12px;
      color: #64748b;
      padding-top: 10px;
      border-top: 1px solid #f1f5f9;
    }
    .meta-item {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .meta-item .material-symbols-outlined { font-size: 15px; color: #94a3b8; }
    .group-actions-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding-top: 6px;
    }
    .btn-blueprint {
      flex: 1;
      justify-content: center;
    }
    .quick-icons {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .icon-btn {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
      background: #ffffff;
      color: #64748b;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .icon-btn:hover:not(:disabled) {
      background: #f8fafc;
      color: #0f172a;
      border-color: #cbd5e1;
    }
    .icon-btn.delete-icon-btn:hover:not(:disabled) {
      background: #fef2f2;
      color: #dc2626;
      border-color: #fecaca;
    }
    .icon-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .icon-btn .material-symbols-outlined { font-size: 16px; }

    /* Group Editor Card */
    .group-editor-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
      margin-bottom: 10px;
    }
    .editor-header {
      padding: 18px 24px;
      background: #fafbfc;
      border-bottom: 1px solid #f1f5f9;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .editor-title-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .editor-icon {
      font-size: 26px;
      color: #0050e5;
    }
    .editor-title-row h3 { margin: 0; font-size: 15px; font-weight: 700; color: #0f172a; }
    .editor-title-row p { margin: 2px 0 0; font-size: 12px; color: #64748b; }
    .editor-body {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 22px;
    }
    .editor-form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
    }
    .span-full { grid-column: 1 / -1; }
    .color-picker-row, .icon-input-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .color-input {
      width: 40px;
      height: 38px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 0;
      cursor: pointer;
    }
    .icon-preview {
      font-size: 24px;
    }
    .checkbox-label {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #334155;
      font-weight: 500;
      cursor: pointer;
    }

    /* Blueprint Scopes Matrix Table */
    .blueprint-matrix-section {
      display: flex;
      flex-direction: column;
      gap: 12px;
      border-top: 1px solid #f1f5f9;
      padding-top: 18px;
    }
    .matrix-header h4 { margin: 0; font-size: 14px; font-weight: 700; color: #0f172a; }
    .matrix-header p { margin: 2px 0 0; font-size: 12px; color: #64748b; }
    .blueprint-table-wrap {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow-x: auto;
    }
    .blueprint-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      text-align: left;
    }
    .blueprint-table th {
      background: #f8fafc;
      padding: 10px 16px;
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1px solid #e2e8f0;
    }
    .blueprint-table td {
      padding: 12px 16px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
    }
    .blueprint-table tr:last-child td { border-bottom: none; }
    .feat-cell {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .feat-icon { font-size: 20px; }
    .cat-tag {
      display: block;
      font-size: 10.5px;
      color: #94a3b8;
    }
    .feat-desc { font-size: 12px; color: #64748b; }

    /* Segmented Action Role Control */
    .segmented-role-control {
      display: inline-flex;
      background: #f1f5f9;
      border-radius: 7px;
      padding: 3px;
      gap: 2px;
    }
    .seg-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      border: none;
      background: transparent;
      padding: 5px 10px;
      border-radius: 5px;
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .seg-btn .material-symbols-outlined { font-size: 13px; }
    .seg-btn:hover { color: #0f172a; }
    .seg-btn.active.seg-none {
      background: #ffffff;
      color: #dc2626;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
    .seg-btn.active.seg-readonly {
      background: #ffffff;
      color: #0284c7;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
    .seg-btn.active.seg-feature {
      background: #ffffff;
      color: #16a34a;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
    .seg-btn.active.seg-global {
      background: #ffffff;
      color: #0050e5;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }

    .editor-footer {
      padding: 16px 24px;
      background: #fafbfc;
      border-top: 1px solid #f1f5f9;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }

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
    .rule-count-pill {
      font-size: 11px;
      font-weight: 600;
      color: #475569;
      background: #f1f5f9;
      padding: 2px 8px;
      border-radius: 4px;
      width: fit-content;
      display: inline-flex;
      margin-top: 4px;
    }
    .action-scopes-pills { display: flex; gap: 4px; flex-wrap: wrap; }
    .scope-pill { font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.03em; }
    .scope-pill.readonly { background: #f8fafc; color: #475569; border: 1px solid #e2e8f0; }
    .scope-pill.feat-edit { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
    .scope-pill.global-edit { background: #eff6ff; color: #0050e5; border: 1px solid #bfdbfe; }
    .group-tags-list { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
    .group-tag-pill { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 6px; }
    .no-groups-text { font-size: 11.5px; color: #94a3b8; font-style: italic; }
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

  // User Groups & Blueprint Manager State
  userGroups: any[] = [];
  isLoadingGroups = false;
  editingGroup: any = null;
  editingGroupCapabilities: CapabilityScope[] = [];
  isSavingGroup = false;

  // Filter Tab State: 'user_groups' (Default) | 'permissions' | 'editor_permissions'
  activeFilter: 'user_groups' | 'permissions' | 'editor_permissions' = 'user_groups';

  // Modal State
  isSuperAdmin: boolean = false;
  activeModalRole: RoleCatalogItem | null = null;
  selectedUserId: string = '';
  selectedFeatureName: string = 'UserManager';

  /**
   * Card 1: Major platform governance and root access levels.
   */
  get majorRoles(): RoleCatalogItem[] {
    const targetNames = this.isSuperAdmin 
      ? ['superadmin', 'admin', 'member'] 
      : ['admin', 'member'];
    return this.rolesCatalog.filter(r => targetNames.includes((r.name || '').toLowerCase()));
  }

  /**
   * Card 2: Core built-in platform system roles matching the workspace sidebar navigation.
   */
  systemModuleRoles = [
    {
      name: 'Central Command',
      icon: 'space_dashboard',
      badge: 'badge-admin',
      scope: 'Dashboard Executive Command',
      description: 'Main workspace executive command center, high-level KPIs, fast actions, system analytics.'
    },
    {
      name: 'Website & CMS',
      icon: 'web',
      badge: 'badge-cmsmanager',
      scope: 'Website & CMS Studio Governance',
      description: 'Web pages, dynamic blog articles, visual templates, navigation menus, and public forms.'
    },
    {
      name: 'User Management',
      icon: 'manage_accounts',
      badge: 'badge-usermanager',
      scope: 'User Directory & Cohort Management',
      description: 'User directory, member profiles, onboarding custom attributes, categories, and account verification statuses.'
    },
    {
      name: 'Identity & Access Control',
      icon: 'admin_panel_settings',
      badge: 'badge-identity',
      scope: 'RBAC Sovereign & Security Governance',
      description: 'System roles, fine-grained permissions, user groups, member invitations, and security policies.'
    },
    {
      name: 'Broadcast & Communications',
      icon: 'campaign',
      badge: 'badge-feature-authority',
      scope: 'Broadcast Studio & Communications',
      description: 'Internal Broadcast Studio announcements (Push, Email, SMS bulletins) and delivery receipt logs.'
    },
    {
      name: 'Billing & Subscriptions',
      icon: 'credit_card',
      badge: 'badge-admin',
      scope: 'Financial & Subscriptions Governance',
      description: 'Workspace invoicing, payment gateways, subscription plans, and feature add-on entitlements.'
    },
    {
      name: 'Settings & Audit',
      icon: 'settings',
      badge: 'badge-readonly',
      scope: 'Global System Settings & Audit Logs',
      description: 'Workspace global settings, localization, brand customization, and tamper-proof security audit trails.'
    }
  ];

  /**
   * Card 3: Feature and paid modular roles unlocked exclusively by active subscriptions.
   */
  get paidFeatureRoles(): any[] {
    const list: any[] = [];
    
    // Check active paid feature roles from catalog, excluding core platform & system roles
    const excluded = [
      'superadmin', 'admin', 'member',
      'central command manager', 'central command',
      'cms studio manager', 'website & cms',
      'user manager', 'user management',
      'identity manager', 'identity & access control',
      'broadcast manager', 'broadcast & communications',
      'billing manager', 'billing & subscriptions', 'billing & invoices',
      'settings & audit manager', 'settings & audit',
      'global editor', 'feature editor', 'read only'
    ];
    const catalogPaid = this.rolesCatalog.filter(r => 
      !excluded.includes((r.name || '').toLowerCase())
    );

    if (catalogPaid.length > 0) {
      for (const r of catalogPaid) {
        list.push({
          name: r.name,
          icon: r.icon || 'calendar_month',
          badge: r.badge || 'badge-feature-authority',
          scope: r.scope || 'Modular Feature Governance Only',
          description: r.description
        });
      }
    } else {
      // Baseline active paid feature: Workforce & Shifts
      list.push({
        name: 'Workforce & Shifts',
        icon: 'calendar_month',
        badge: 'badge-feature-authority',
        scope: 'Staff Rota & Shifts Governance Only',
        description: "Feature domain administrator authorized strictly and exclusively to govern 'Staff Rota & Shifts' (bcp-staff-rota)."
      });
    }

    return list;
  }

  /**
   * System-managed core platform capabilities standard on every BCC workspace.
   */
  systemFeatures: CapabilityScope[] = [
    {
      key: 'Dashboard',
      name: 'Central Command',
      category: 'Core System Role',
      icon: 'space_dashboard',
      description: 'Main workspace executive command center, high-level KPIs, fast actions, system analytics.',
      scope: 'None',
      isPaid: false
    },
    {
      key: 'ContentManager',
      name: 'Website & CMS',
      category: 'Core System Role',
      icon: 'web',
      description: 'Web pages, dynamic blog articles, visual templates, navigation menus, and public forms.',
      scope: 'None',
      isPaid: false
    },
    {
      key: 'UserManager',
      name: 'User Management',
      category: 'Core System Role',
      icon: 'manage_accounts',
      description: 'User directory, member profiles, onboarding custom attributes, categories, and account verification statuses.',
      scope: 'None',
      isPaid: false
    },
    {
      key: 'IdentityManager',
      name: 'Identity & Access Control',
      category: 'Core System Role',
      icon: 'admin_panel_settings',
      description: 'System roles, fine-grained permissions, member invitations, and security policies.',
      scope: 'None',
      isPaid: false
    },
    {
      key: 'Broadcast',
      name: 'Broadcast & Communications',
      category: 'Core System Role',
      icon: 'campaign',
      description: 'Internal Broadcast Studio announcements (Push, Email, SMS bulletins) and delivery receipt logs.',
      scope: 'None',
      isPaid: false
    },
    {
      key: 'BillingManager',
      name: 'Billing & Subscriptions',
      category: 'Core System Role',
      icon: 'credit_card',
      description: 'Workspace invoicing, payment gateways, subscription plans, and feature add-on entitlements.',
      scope: 'None',
      isPaid: false
    },
    {
      key: 'SettingsManager',
      name: 'Settings & Audit',
      category: 'Core System Role',
      icon: 'settings',
      description: 'Workspace global settings, localization, brand identity, full tamper-proof audit trails.',
      scope: 'None',
      isPaid: false
    },
    {
      key: 'Workforce',
      name: 'Workforce & Shifts',
      category: 'Paid Feature',
      icon: 'badge',
      description: 'Staff directory, shift scheduling, clock-in attendance, timesheets, and self-registration forms.',
      scope: 'None',
      isPaid: true
    }
  ];

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
    this.loadUserGroups();
    this.loadRoleCatalog();
    this.loadAssignableUsers();
  }

  /**
   * Sets the active filter view when clicking cards or tabs.
   */
  setFilter(filter: 'user_groups' | 'permissions' | 'editor_permissions'): void {
    this.activeFilter = filter;
  }

  /**
   * Loads all user groups and permission blueprints.
   */
  loadUserGroups(): void {
    this.isLoadingGroups = true;
    this.api.get<any>('api/v1/user-groups').subscribe({
      next: (res) => {
        this.isLoadingGroups = false;
        this.userGroups = res.data || res || [];
      },
      error: () => {
        this.isLoadingGroups = false;
        this.toast.error('Failed to load user groups.');
      }
    });
  }

  /**
   * Opens the blueprint creation view with fresh default values.
   */
  startCreateGroup(): void {
    this.editingGroup = {
      name: '',
      description: '',
      baseRole: 'Member',
      isDefault: false,
      colorBadge: '#0050E5',
      icon: 'groups'
    };
    this.editingGroupCapabilities = this.systemFeatures.map(f => ({
      ...f,
      scope: 'None' as const
    }));
  }

  /**
   * Opens the blueprint editor for an existing user group.
   */
  startEditGroup(group: any): void {
    this.isLoadingGroups = true;
    this.api.get<any>(`api/v1/user-groups/${group.id}`).subscribe({
      next: (res) => {
        this.isLoadingGroups = false;
        const detail = res.data || res;
        this.editingGroup = {
          id: detail.id,
          name: detail.name,
          description: detail.description,
          baseRole: detail.baseRole || 'Member',
          isDefault: detail.isDefault || false,
          colorBadge: detail.colorBadge || '#0050E5',
          icon: detail.icon || 'groups'
        };

        const permissions = detail.permissions || [];
        this.editingGroupCapabilities = this.systemFeatures.map(f => {
          const matched = permissions.find((p: any) => p.featureAreaKey?.toLowerCase() === f.key.toLowerCase());
          return {
            ...f,
            scope: matched ? (matched.actionRole as any) : 'None'
          };
        });
      },
      error: () => {
        this.isLoadingGroups = false;
        this.toast.error('Failed to load group blueprint details.');
      }
    });
  }

  /**
   * Closes the blueprint editor and clears state.
   */
  cancelEditGroup(): void {
    this.editingGroup = null;
    this.editingGroupCapabilities = [];
  }

  /**
   * Saves new or updated user group blueprint and syncs rights to members.
   */
  saveGroup(): void {
    if (!this.editingGroup || !this.editingGroup.name?.trim()) {
      this.toast.warning('Please enter a user group name.');
      return;
    }

    this.isSavingGroup = true;
    const payload = {
      name: this.editingGroup.name.trim(),
      description: this.editingGroup.description?.trim(),
      baseRole: this.editingGroup.baseRole || 'Member',
      isDefault: !!this.editingGroup.isDefault,
      colorBadge: this.editingGroup.colorBadge || '#0050E5',
      icon: this.editingGroup.icon || 'groups',
      permissions: this.editingGroupCapabilities
        .filter(c => c.scope && c.scope !== 'None')
        .map(c => ({
          featureAreaKey: c.key,
          actionRole: c.scope
        }))
    };

    if (this.editingGroup.id) {
      this.api.put<any>(`api/v1/user-groups/${this.editingGroup.id}`, payload).subscribe({
        next: () => {
          this.isSavingGroup = false;
          this.toast.success(`User group '${payload.name}' updated successfully.`);
          this.editingGroup = null;
          this.loadUserGroups();
        },
        error: (err) => {
          this.isSavingGroup = false;
          this.toast.error(err?.error?.message || 'Failed to update user group.');
        }
      });
    } else {
      this.api.post<any>('api/v1/user-groups', payload).subscribe({
        next: () => {
          this.isSavingGroup = false;
          this.toast.success(`User group '${payload.name}' created successfully.`);
          this.editingGroup = null;
          this.loadUserGroups();
        },
        error: (err) => {
          this.isSavingGroup = false;
          this.toast.error(err?.error?.message || 'Failed to create user group.');
        }
      });
    }
  }

  /**
   * Deletes a user group after administrator confirmation.
   */
  deleteGroup(group: any): void {
    if (group.isDefault || group.isSystem) {
      this.toast.warning('Default or system user groups cannot be deleted.');
      return;
    }

    if (!confirm(`Are you sure you want to delete user group '${group.name}'? Assigned members will be moved to the default group.`)) {
      return;
    }

    this.api.delete<any>(`api/v1/user-groups/${group.id}`).subscribe({
      next: () => {
        this.toast.success(`User group '${group.name}' deleted successfully.`);
        this.loadUserGroups();
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'Failed to delete user group.');
      }
    });
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

  /**
   * Returns strongly typed preview members for avatar stacking (up to 3 members).
   */
  getGroupPreviewMembers(group: any): GroupMemberPreview[] {
    if (!group || !Array.isArray(group.membersPreview)) return [];
    return group.membersPreview.slice(0, 3);
  }

  /**
   * Generates a distinct professional gradient avatar background for member initials.
   */
  getMemberGradient(name: string, index: number = 0): string {
    const gradients = [
      'linear-gradient(135deg, #7c3aed, #6366f1)',
      'linear-gradient(135deg, #9333ea, #a855f7)',
      'linear-gradient(135deg, #ea580c, #f97316)',
      'linear-gradient(135deg, #059669, #10b981)',
      'linear-gradient(135deg, #0284c7, #38bdf8)',
      'linear-gradient(135deg, #dc2626, #ef4444)'
    ];
    if (!name) return gradients[index % gradients.length];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash + index) % gradients.length;
    return gradients[idx];
  }

  /**
   * Constructs the member names preview string (e.g. "Peter Elia, simon Obi +7")
   */
  getMemberNamesText(group: any): string {
    const previews = group.membersPreview || [];
    if (!previews || previews.length === 0) return '';
    const names = previews.slice(0, 2).map((m: any) => m.fullName || m.email);
    const total = group.membersCount || previews.length;
    if (total > 2) {
      return `${names.join(', ')} +${total - 2}`;
    }
    return names.join(', ');
  }

  /**
   * Resolves the list of user groups that grant active access to a specific feature key.
   */
  getGroupsWithFeature(featureKey: string): any[] {
    return this.userGroups.filter(g => {
      if (g.name === 'Administrator') return true;
      if (!g.permissions || g.permissions.length === 0) {
        if (g.name === 'Operations & Workforce Manager' && ['Workforce', 'UserManager', 'Dashboard'].includes(featureKey)) return true;
        return false;
      }
      return g.permissions.some((p: any) => p.featureAreaKey?.toLowerCase() === featureKey.toLowerCase() && p.actionRole !== 'None');
    });
  }

  /**
   * Distinguishes core platform system authority roles from dynamic feature domain roles.
   */
  isSystemRole(roleName: string): boolean {
    const systemRoleNames = [
      'SuperAdmin',
      'Admin',
      'Identity Manager',
      'User Manager',
      'CMS Studio Manager',
      'Member'
    ];
    return systemRoleNames.some(name => name.toLowerCase() === (roleName || '').toLowerCase());
  }
}
