import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
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
 * The 6 canonical system roles (SuperAdmin, Admin, Global Editor, Feature Editor, Read Only, Member)
 * are always seeded and prefilled on page load (never blank).
 * SuperAdmin cannot be assigned to any user except the root account.
 */
@Component({
  selector: 'app-identity-roles',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent],
  template: `
    <div class="identity-roles-page">
      <!-- Standardized Page Header -->
      <app-page-header
        eyebrow="ACCESS CONTROL & GOVERNANCE"
        icon="shield_person"
        title="System Roles & Authority Matrix"
        [subtitle]="'Manage the ' + (rolesCatalog.length || (isSuperAdmin ? 6 : 5)) + ' pre-configured system roles, examine operational permissions, and assign authorized members to feature scopes.'"
        [buttons]="headerButtons"
        [loading]="isLoading"
      ></app-page-header>

      <!-- Overview Stats Strip -->
      <div class="stats-strip" *ngIf="!isLoading">
        <div class="stat-card">
          <div class="stat-icon-wrap" style="background: rgba(0,80,229,0.08); color: #0050e5;">
            <span class="material-symbols-outlined">security</span>
          </div>
          <div class="stat-meta">
            <span class="stat-val">{{ rolesCatalog.length || (isSuperAdmin ? 6 : 5) }}</span>
            <span class="stat-lbl">Fixed System Roles</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon-wrap" style="background: rgba(16,185,129,0.08); color: #10b981;">
            <span class="material-symbols-outlined">admin_panel_settings</span>
          </div>
          <div class="stat-meta">
            <span class="stat-val">{{ totalPrivilegedCount }}</span>
            <span class="stat-lbl">Administrative Staff</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon-wrap" style="background: rgba(245,158,11,0.08); color: #f59e0b;">
            <span class="material-symbols-outlined">rule_settings</span>
          </div>
          <div class="stat-meta">
            <span class="stat-val">{{ featureEditorCount }}</span>
            <span class="stat-lbl">Modular Feature Editors</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon-wrap" style="background: rgba(100,116,139,0.08); color: #475569;">
            <span class="material-symbols-outlined">groups</span>
          </div>
          <div class="stat-meta">
            <span class="stat-val">{{ memberRoleCount }}</span>
            <span class="stat-lbl">General Workspace Members</span>
          </div>
        </div>
      </div>

      <!-- Roles Table Card -->
      <div class="table-card" *ngIf="!isLoading">
        <div class="table-card-header">
          <div>
            <h3>Enterprise Role Catalog</h3>
            <p>Seeded system roles with permanent scope boundaries. Roles cannot be arbitrarily deleted.</p>
          </div>
          <button type="button" class="btn btn-outline btn-sm" (click)="loadRoleCatalog()" title="Refresh role assignments">
            <span class="material-symbols-outlined">refresh</span>
            <span>Refresh</span>
          </button>
        </div>

        <div class="table-responsive">
          <table class="roles-data-table">
            <thead>
              <tr>
                <th style="min-width: 220px;">Role & Tier</th>
                <th style="min-width: 280px;">Scope & Operational Boundaries</th>
                <th style="width: 140px; text-align: center;">Personnel</th>
                <th style="width: 200px;">Assigned Members Preview</th>
                <th style="width: 190px; text-align: right; white-space: nowrap;">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let role of rolesCatalog" [class.locked-row]="!role.canAssign">
                <!-- Role Name & Icon -->
                <td>
                  <div class="role-cell">
                    <div class="role-icon-box" [ngClass]="role.badge">
                      <span class="material-symbols-outlined">{{ role.icon }}</span>
                    </div>
                    <div class="role-title-box">
                      <span class="role-name">{{ role.name }}</span>
                      <span class="role-pill-badge" [ngClass]="role.badge">
                        {{ role.canAssign ? 'Operational Role' : 'Root Sovereign' }}
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
                    <span>No members assigned</span>
                  </div>
                </td>

                <!-- Action Button -->
                <td style="text-align: right; white-space: nowrap;">
                  <!-- SuperAdmin Locked State -->
                  <div *ngIf="!role.canAssign" class="locked-chip" title="Root account authority cannot be transferred or assigned to other users.">
                    <span class="material-symbols-outlined">lock</span>
                    <span>Root Account Only</span>
                  </div>

                  <!-- Manage Members Modal Trigger -->
                  <button
                    *ngIf="role.canAssign"
                    type="button"
                    class="btn-manage-members"
                    (click)="openManageModal(role)"
                  >
                    <span class="material-symbols-outlined btn-icon">group_add</span>
                    <span class="btn-text">Manage Members</span>
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
                <h3>Manage Personnel: {{ activeModalRole.name }}</h3>
                <p>{{ activeModalRole.scope }}</p>
              </div>
            </div>
            <button type="button" class="modal-close-btn" (click)="closeManageModal()">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <div class="modal-body">
            <!-- Assignment Form Section -->
            <div class="assign-section">
              <h4 class="section-title">Assign Member to this Role</h4>
              <div class="assign-form-grid" [class.has-feature-select]="activeModalRole.name === 'Feature Editor'">
                <!-- User Select Dropdown -->
                <div class="form-group">
                  <label>Select Member *</label>
                  <select [(ngModel)]="selectedUserId" class="form-control">
                    <option value="">Choose a member to assign...</option>
                    <option *ngFor="let u of assignableUsers" [value]="u.id">
                      {{ u.fullName }} ({{ u.email }}) {{ u.memberId ? '• ' + u.memberId : '' }}
                    </option>
                  </select>
                </div>

                <!-- Feature Area Selector (Shown only for Feature Editor) -->
                <div class="form-group" *ngIf="activeModalRole.name === 'Feature Editor'">
                  <label>Feature Scope Module *</label>
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
                    <span>{{ isAssigning ? 'Assigning...' : 'Assign Role' }}</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Assigned Members List Section -->
            <div class="assigned-list-section">
              <div class="section-header-row">
                <h4 class="section-title">Currently Assigned Personnel ({{ activeModalRole.members.length }})</h4>
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
                    <span>Remove</span>
                  </button>
                </div>

                <div class="empty-assigned" *ngIf="activeModalRole.members.length === 0">
                  <span class="material-symbols-outlined">group_off</span>
                  <p>No personnel currently hold the {{ activeModalRole.name }} role.</p>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-outline" (click)="closeManageModal()">Close</button>
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

    /* Stats Strip */
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
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px 18px;
      display: flex;
      align-items: center;
      gap: 14px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
    }
    .stat-icon-wrap {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .stat-icon-wrap span { font-size: 22px; }
    .stat-meta { display: flex; flex-direction: column; }
    .stat-val { font-size: 20px; font-weight: 800; color: #0f172a; line-height: 1.2; }
    .stat-lbl { font-size: 11.5px; color: #64748b; font-weight: 500; margin-top: 2px; }

    /* Table Card */
    .table-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
    }
    .table-card-header {
      padding: 18px 22px;
      border-bottom: 1px solid #f1f5f9;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #fafbfc;
    }
    .table-card-header h3 { margin: 0; font-size: 15px; font-weight: 700; color: #0f172a; }
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
    .badge-root { background: #fef2f2; color: #b91c1c; }
    .badge-admin { background: #eff6ff; color: #0050e5; }
    .badge-editor { background: #ecfdf5; color: #059669; }
    .badge-feature { background: #fef3c7; color: #d97706; }
    .badge-readonly { background: #f1f5f9; color: #475569; }
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
      top: 0; left: 0; right: 0; bottom: 0;
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
      box-shadow: 0 20px 25px -5px rgba(0,0,0,0.15);
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
    .btn-primary:hover:not(:disabled) { background: #0040b8; }
    .btn-sm { height: 32px; padding: 0 12px; font-size: 12px; }
  `]
})
export class IdentityRolesComponent implements OnInit {
  isLoading = false;
  isAssigning = false;
  isUnassigning = false;

  rolesCatalog: RoleCatalogItem[] = [];
  assignableUsers: any[] = [];

  // Modal State
  isSuperAdmin: boolean = false;
  activeModalRole: RoleCatalogItem | null = null;
  selectedUserId: string = '';
  selectedFeatureName: string = 'UserManager';

  headerButtons: PageHeaderButton[] = [
    {
      text: 'User Directory',
      icon: 'groups',
      isPrimary: false,
      routerLink: '/admin/users/list'
    },
    {
      text: 'Identity Dashboard',
      icon: 'admin_panel_settings',
      isPrimary: false,
      routerLink: '/identity/console'
    }
  ];

  constructor(
    private api: ApiService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.checkCurrentUserRole();
    this.loadRoleCatalog();
    this.loadAssignableUsers();
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

  get totalPrivilegedCount(): number {
    return this.rolesCatalog
      .filter(r => r.name !== 'Member')
      .reduce((acc, curr) => acc + curr.memberCount, 0);
  }

  get featureEditorCount(): number {
    const f = this.rolesCatalog.find(r => r.name === 'Feature Editor');
    return f ? f.memberCount : 0;
  }

  get memberRoleCount(): number {
    const m = this.rolesCatalog.find(r => r.name === 'Member');
    return m ? m.memberCount : 0;
  }

  loadRoleCatalog(): void {
    this.isLoading = true;
    this.api.get<any>('IdentityApi/roles/catalog').subscribe({
      next: (res) => {
        this.isLoading = false;
        const allRoles: RoleCatalogItem[] = res.data || [];
        // Strictly filter out SuperAdmin unless the current logged-in user is SuperAdmin
        this.rolesCatalog = allRoles.filter(r => {
          if (r.name.toLowerCase() === 'superadmin') {
            return this.isSuperAdmin;
          }
          return true;
        });
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

  unassignRoleFromUser(userId: string, userName: string): void {
    if (!this.activeModalRole) return;

    if (this.activeModalRole.name === 'SuperAdmin') {
      this.toast.error('Cannot unassign the root SuperAdmin role.');
      return;
    }

    this.isUnassigning = true;
    const payload = {
      userId,
      roleName: this.activeModalRole.name
    };

    this.api.post<any>('IdentityApi/roles/unassign', payload).subscribe({
      next: () => {
        this.isUnassigning = false;
        this.toast.success(`Removed ${this.activeModalRole?.name} from ${userName}.`);
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
