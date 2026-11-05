import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent, PageHeaderButton } from '../../../shared/components/page-header/page-header.component';

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
}

/**
 * Component providing fine-grained access governance, system access tier assignment,
 * and modular capability action role management for individual workspace members.
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
        [title]="'Permissions Matrix: ' + (user?.fullName || user?.email || 'Member')"
        subtitle="Manage system access roles, modular capability areas, and granular action scopes (Global Editor, Feature Editor, Read Only)."
        [buttons]="headerButtons"
        [loading]="isLoading || isSaving"
      ></app-page-header>

      <!-- Loading State -->
      <div *ngIf="isLoading" class="loading-state-card">
        <span class="material-symbols-outlined spinner">progress_activity</span>
        <p>Loading member permissions profile and capability matrix...</p>
      </div>

      <div *ngIf="!isLoading" class="permissions-content-layout">
        <!-- 1. Security Warning & Impact Advisory Banner -->
        <div class="security-advisory-banner">
          <div class="banner-icon-col">
            <span class="material-symbols-outlined">shield_person</span>
          </div>
          <div class="banner-text-col">
            <h4>Security & Authority Advisory</h4>
            <p>
              Modifying access privileges directly alters what administrative functions, records, and capabilities this user can execute.
              All changes take effect across active user sessions, update audit telemetry in <code>BcpActivityLogs</code>, and immediately dispatch
              real-time in-app alerts and security emails to the member.
            </p>
          </div>
          <div class="banner-action-col">
            <span class="live-protection-chip">
              <span class="pulse-dot"></span>
              Live Audit Active
            </span>
          </div>
        </div>

        <!-- 2. Member Identity Profile Card -->
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
              <span class="indicator-label">CURRENT ACTIVE ROLE</span>
              <div class="role-pill-badge" [class.badge-admin]="isCurrentRoleAdmin" [class.badge-super]="isRootSuperAdmin">
                <span class="material-symbols-outlined">{{ getRoleIcon(selectedRole) }}</span>
                <span>{{ selectedRole }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 3. Primary System Access Tier Selection -->
        <div class="permissions-section-card">
          <div class="section-card-header">
            <div class="header-title-box">
              <span class="material-symbols-outlined section-icon">badge</span>
              <div>
                <h3>1. Primary System Access Role</h3>
                <p>Governs overall platform administrative rights, console views, and base workspace capabilities</p>
              </div>
            </div>
            <div *ngIf="isRootSuperAdmin" class="locked-badge-notice">
              <span class="material-symbols-outlined">lock</span>
              <span>SuperAdmin cannot be modified or demoted</span>
            </div>
          </div>

          <div class="section-card-body">
            <div class="system-roles-grid">
              <!-- Member Role -->
              <div
                class="role-tier-card"
                [class.selected]="selectedRole === 'Member'"
                [class.disabled]="isRootSuperAdmin"
                (click)="selectSystemRole('Member')"
              >
                <div class="tier-card-top">
                  <span class="material-symbols-outlined tier-icon">person</span>
                  <div class="tier-radio-indicator">
                    <span class="radio-circle" [class.active]="selectedRole === 'Member'"></span>
                  </div>
                </div>
                <h4>Member</h4>
                <p>Standard workspace membership. Access to self-service directory, workspace dashboard, personal profile, and designated portal modules.</p>
                <span class="tier-tag">Standard Access</span>
              </div>

              <!-- Admin Role -->
              <div
                class="role-tier-card tier-admin"
                [class.selected]="selectedRole === 'Admin'"
                [class.disabled]="isRootSuperAdmin"
                (click)="selectSystemRole('Admin')"
              >
                <div class="tier-card-top">
                  <span class="material-symbols-outlined tier-icon">admin_panel_settings</span>
                  <div class="tier-radio-indicator">
                    <span class="radio-circle" [class.active]="selectedRole === 'Admin'"></span>
                  </div>
                </div>
                <h4>Admin</h4>
                <p>Full workspace administrative authority across accounts, identity policies, communications, and audit telemetry.</p>
                <span class="tier-tag tag-primary">Full Administrator</span>
              </div>

              <!-- Global Editor Role -->
              <div
                class="role-tier-card"
                [class.selected]="selectedRole === 'Global Editor'"
                [class.disabled]="isRootSuperAdmin"
                (click)="selectSystemRole('Global Editor')"
              >
                <div class="tier-card-top">
                  <span class="material-symbols-outlined tier-icon">edit_document</span>
                  <div class="tier-radio-indicator">
                    <span class="radio-circle" [class.active]="selectedRole === 'Global Editor'"></span>
                  </div>
                </div>
                <h4>Global Editor</h4>
                <p>Broad operational privileges to create, edit, and publish tenant entities, website content, forms, and categories across the workspace.</p>
                <span class="tier-tag">Tenant Operations</span>
              </div>

              <!-- Feature Editor Role -->
              <div
                class="role-tier-card"
                [class.selected]="selectedRole === 'Feature Editor'"
                [class.disabled]="isRootSuperAdmin"
                (click)="selectSystemRole('Feature Editor')"
              >
                <div class="tier-card-top">
                  <span class="material-symbols-outlined tier-icon">auto_stories</span>
                  <div class="tier-radio-indicator">
                    <span class="radio-circle" [class.active]="selectedRole === 'Feature Editor'"></span>
                  </div>
                </div>
                <h4>Feature Editor</h4>
                <p>Specialized management access restricted strictly to your workspace assigned modular capability scopes selected in Section 2.</p>
                <span class="tier-tag tag-warning">Scoped Authority</span>
              </div>

              <!-- Read Only Role -->
              <div
                class="role-tier-card"
                [class.selected]="selectedRole === 'Read Only'"
                [class.disabled]="isRootSuperAdmin"
                (click)="selectSystemRole('Read Only')"
              >
                <div class="tier-card-top">
                  <span class="material-symbols-outlined tier-icon">visibility</span>
                  <div class="tier-radio-indicator">
                    <span class="radio-circle" [class.active]="selectedRole === 'Read Only'"></span>
                  </div>
                </div>
                <h4>Read Only</h4>
                <p>Inspection and audit view privileges across directory listings and reports without permission to modify system records.</p>
                <span class="tier-tag">Inspection & Audit</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 4. Modular Capability Suites & Action Roles Matrix -->
        <div class="permissions-section-card">
          <div class="section-card-header" style="justify-content: space-between;">
            <div class="header-title-box">
              <span class="material-symbols-outlined section-icon">tune</span>
              <div>
                <h3>2. Modular Capability Suites & Action Roles</h3>
                <p>Assign granular operational scopes (None, Read Only, Feature Editor CRUD, Global Editor) across specific BCC functional domains</p>
              </div>
            </div>

            <!-- Quick Matrix Preset Actions -->
            <div class="matrix-preset-buttons" *ngIf="!isRootSuperAdmin">
              <button type="button" class="btn btn-outline btn-xs" (click)="setAllScopes('None')">
                <span class="material-symbols-outlined">block</span>
                Clear All
              </button>
              <button type="button" class="btn btn-outline btn-xs" (click)="setAllScopes('ReadOnly')">
                <span class="material-symbols-outlined">visibility</span>
                All Read-Only
              </button>
              <button type="button" class="btn btn-outline btn-xs" (click)="setAllScopes('FeatureEdit')">
                <span class="material-symbols-outlined">edit</span>
                All Feature CRUD
              </button>
            </div>
          </div>

          <div class="section-card-body">
            <!-- Scopes Table -->
            <div class="scopes-table-wrapper">
              <table class="scopes-matrix-table">
                <thead>
                  <tr>
                    <th class="th-feature">Modular Capability Suite</th>
                    <th class="th-description">Functional Scope</th>
                    <th class="th-actions">Assigned Action Role</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let item of capabilitySuites; let i = index">
                    <td class="td-feature">
                      <div class="suite-title-row">
                        <span class="material-symbols-outlined suite-icon">{{ item.icon }}</span>
                        <div>
                          <strong>{{ item.name }}</strong>
                          <span class="suite-category-pill">{{ item.category }}</span>
                        </div>
                      </div>
                    </td>
                    <td class="td-description">
                      <span class="scope-description-text">{{ item.description }}</span>
                    </td>
                    <td class="td-actions">
                      <div class="action-role-segmented-control">
                        <!-- None -->
                        <button
                          type="button"
                          class="segment-btn seg-none"
                          [class.active]="item.scope === 'None'"
                          (click)="item.scope = 'None'"
                          [disabled]="isRootSuperAdmin"
                          title="No access to this capability suite"
                        >
                          <span class="material-symbols-outlined">block</span>
                          <span>None</span>
                        </button>

                        <!-- Read Only -->
                        <button
                          type="button"
                          class="segment-btn seg-readonly"
                          [class.active]="item.scope === 'ReadOnly'"
                          (click)="item.scope = 'ReadOnly'"
                          [disabled]="isRootSuperAdmin"
                          title="Inspection and audit view only (zero create/edit/delete)"
                        >
                          <span class="material-symbols-outlined">visibility</span>
                          <span>Read Only</span>
                        </button>

                        <!-- Feature Editor -->
                        <button
                          type="button"
                          class="segment-btn seg-feature"
                          [class.active]="item.scope === 'FeatureEdit'"
                          (click)="item.scope = 'FeatureEdit'"
                          [disabled]="isRootSuperAdmin"
                          title="Full CRUD authority (Create, Read, Update, Delete) strictly within this suite"
                        >
                          <span class="material-symbols-outlined">edit_note</span>
                          <span>Feature Editor</span>
                        </button>

                        <!-- Global Editor -->
                        <button
                          type="button"
                          class="segment-btn seg-global"
                          [class.active]="item.scope === 'GlobalEdit'"
                          (click)="item.scope = 'GlobalEdit'"
                          [disabled]="isRootSuperAdmin"
                          title="Tenant-wide operational authority spanning across connected workflows"
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

        <!-- 5. Real-Time Notification & Security Dispatch Preview Card -->
        <div class="permissions-section-card">
          <div class="section-card-header">
            <div class="header-title-box">
              <span class="material-symbols-outlined section-icon">mark_email_read</span>
              <div>
                <h3>3. Real-Time Security Notifications & Multi-Channel Dispatch</h3>
                <p>Automated security delivery pool triggers enforced upon saving permissions</p>
              </div>
            </div>
          </div>

          <div class="section-card-body">
            <div class="dispatch-channels-grid">
              <!-- In-App Notification Tile -->
              <div class="dispatch-tile">
                <div class="tile-icon-box inapp-icon">
                  <span class="material-symbols-outlined">notifications_active</span>
                </div>
                <div class="tile-info">
                  <strong>In-App Alert & Badge Stream</strong>
                  <p>Enqueues a high-priority notification in <code>BcpNotifications</code> and broadcasts instantly via SignalR to user's browser sessions.</p>
                  <span class="tile-badge badge-active">Enforced • Real-time</span>
                </div>
              </div>

              <!-- Transactional Email Tile -->
              <div class="dispatch-tile">
                <div class="tile-icon-box email-icon">
                  <span class="material-symbols-outlined">outgoing_mail</span>
                </div>
                <div class="tile-info">
                  <strong>Postmark Security Advisory Email</strong>
                  <p>Dispatches a severity-branded HTML breakdown of assigned access roles & active capability scopes to <strong>{{ user?.email }}</strong>.</p>
                  <span class="tile-badge badge-active">Enforced • Postmark</span>
                </div>
              </div>

              <!-- Activity Audit Telemetry Tile -->
              <div class="dispatch-tile">
                <div class="tile-icon-box audit-icon">
                  <span class="material-symbols-outlined">security</span>
                </div>
                <div class="tile-info">
                  <strong>Tamper-Proof Audit Record</strong>
                  <p>Logs the exact permission delta, timestamp, administrator actor ID, and IP address into <code>BcpActivityLogs</code>.</p>
                  <span class="tile-badge badge-active">Immutable Audit</span>
                </div>
              </div>
            </div>

            <!-- Notification Preview Box -->
            <div class="preview-notice-box">
              <span class="material-symbols-outlined preview-icon">info</span>
              <div class="preview-text">
                <strong>Active Delivery Summary:</strong>
                <span>
                  Saving will set Primary Role to <strong>'{{ selectedRole }}'</strong> with
                  <strong>{{ getActiveScopesCount() }}</strong> active modular capability scopes.
                  User will receive an instant notification bell badge and a Postmark security breakdown email.
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- 6. Sticky Action Footer Bar -->
        <div class="action-footer-bar">
          <div class="footer-left-info">
            <span class="material-symbols-outlined info-icon">verified_user</span>
            <span>Security policy requires active admin authorization to enforce changes.</span>
          </div>

          <div class="footer-action-buttons">
            <a [routerLink]="['/users/console/details', userId]" class="btn btn-outline" [class.disabled]="isSaving">
              Cancel
            </a>
            <button
              type="button"
              class="btn btn-primary"
              (click)="savePermissions()"
              [disabled]="isSaving || isRootSuperAdmin"
            >
              <span class="material-symbols-outlined" *ngIf="!isSaving">verified</span>
              <span class="material-symbols-outlined spinner" *ngIf="isSaving">progress_activity</span>
              <span>{{ isSaving ? 'Enforcing Permissions...' : 'Save & Enforce Permissions' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .user-permissions-page {
      display: flex;
      flex-direction: column;
      gap: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
    }

    .loading-state-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 60px 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      color: #64748b;
      font-size: 14px;
    }

    .spinner {
      animation: spin 1s linear infinite;
      color: #0050e5;
    }
    @keyframes spin { 100% { transform: rotate(360deg); } }

    .permissions-content-layout {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    /* 1. Security Advisory Banner */
    .security-advisory-banner {
      background: linear-gradient(135deg, #fffbeb 0%, #fef2f2 100%);
      border: 1.5px solid #fca5a5;
      border-radius: 12px;
      padding: 16px 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      box-shadow: 0 2px 8px rgba(239, 68, 68, 0.06);
    }
    .banner-icon-col {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      background: #fee2e2;
      color: #dc2626;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .banner-icon-col .material-symbols-outlined { font-size: 26px; }
    .banner-text-col { flex: 1; }
    .banner-text-col h4 {
      margin: 0 0 4px;
      font-size: 14px;
      font-weight: 700;
      color: #991b1b;
    }
    .banner-text-col p {
      margin: 0;
      font-size: 12.5px;
      color: #7f1d1d;
      line-height: 1.5;
    }
    .banner-text-col code {
      background: rgba(254, 226, 226, 0.8);
      padding: 1px 5px;
      border-radius: 4px;
      font-size: 11.5px;
      font-weight: 600;
    }
    .live-protection-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 9999px;
      background: #ffffff;
      border: 1px solid #fca5a5;
      color: #991b1b;
      font-size: 11px;
      font-weight: 700;
      white-space: nowrap;
    }
    .pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #dc2626;
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
      0% { transform: scale(0.95); opacity: 0.8; }
      50% { transform: scale(1.3); opacity: 1; }
      100% { transform: scale(0.95); opacity: 0.8; }
    }

    /* 2. Member Identity Profile Card */
    .member-profile-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 18px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }
    .profile-hero-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .avatar-box {
      width: 56px;
      height: 56px;
      border-radius: 14px;
      background: linear-gradient(135deg, #0050e5 0%, #3b82f6 100%);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      font-weight: 800;
      overflow: hidden;
      box-shadow: 0 4px 10px rgba(0, 80, 229, 0.2);
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
    .status-pill {
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 9999px;
      background: #d1fae5;
      color: #065f46;
    }
    .locked-root-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      font-weight: 700;
      color: #92400e;
      background: #fef3c7;
      border: 1px solid #fde68a;
      padding: 2px 8px;
      border-radius: 9999px;
    }
    .locked-root-pill .material-symbols-outlined { font-size: 12px; }
    .user-subtext-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12.5px;
      color: #64748b;
    }
    .meta-separator { color: #cbd5e1; }
    .id-subtext { font-family: monospace; font-size: 11.5px; }

    .current-role-indicator {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;
    }
    .indicator-label {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.06em;
      color: #64748b;
    }
    .role-pill-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 12px;
      border-radius: 8px;
      background: #eff6ff;
      color: #0050e5;
      border: 1px solid #bfdbfe;
      font-size: 13px;
      font-weight: 700;
    }
    .role-pill-badge .material-symbols-outlined { font-size: 17px; }
    .role-pill-badge.badge-admin { background: #eff6ff; color: #0050e5; border-color: #93c5fd; }
    .role-pill-badge.badge-super { background: #fef3c7; color: #92400e; border-color: #fde68a; }

    /* Section Cards */
    .permissions-section-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
    }
    .section-card-header {
      padding: 16px 20px;
      background: #fafbfc;
      border-bottom: 1px solid #f1f5f9;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .header-title-box {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .section-icon {
      font-size: 22px;
      color: #0050e5;
    }
    .header-title-box h3 {
      margin: 0;
      font-size: 14.5px;
      font-weight: 700;
      color: #0f172a;
    }
    .header-title-box p {
      margin: 2px 0 0;
      font-size: 11.5px;
      color: #64748b;
    }
    .section-card-body {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .locked-badge-notice {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: #fef3c7;
      border: 1px solid #fde68a;
      color: #92400e;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
    }
    .locked-badge-notice .material-symbols-outlined { font-size: 14px; }

    /* System Roles Grid */
    .system-roles-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
      gap: 14px;
    }
    .role-tier-card {
      background: #f8fafc;
      border: 1.5px solid #e2e8f0;
      border-radius: 10px;
      padding: 16px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 8px;
      transition: all 0.15s ease-in-out;
      position: relative;
    }
    .role-tier-card:hover:not(.disabled) {
      border-color: #93c5fd;
      background: #ffffff;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 80, 229, 0.08);
    }
    .role-tier-card.selected {
      background: #ffffff;
      border-color: #0050e5;
      box-shadow: 0 0 0 2px rgba(0, 80, 229, 0.15), 0 4px 12px rgba(0, 80, 229, 0.08);
    }
    .role-tier-card.disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
    .tier-card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .tier-icon {
      font-size: 24px;
      color: #64748b;
    }
    .role-tier-card.selected .tier-icon {
      color: #0050e5;
    }
    .tier-radio-indicator {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border: 2px solid #cbd5e1;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .role-tier-card.selected .tier-radio-indicator {
      border-color: #0050e5;
    }
    .radio-circle {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: transparent;
    }
    .radio-circle.active {
      background: #0050e5;
    }
    .role-tier-card h4 {
      margin: 0;
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
    }
    .role-tier-card p {
      margin: 0;
      font-size: 11.5px;
      color: #64748b;
      line-height: 1.45;
      flex: 1;
    }
    .tier-tag {
      align-self: flex-start;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 2px 7px;
      border-radius: 4px;
      background: #f1f5f9;
      color: #475569;
    }
    .tier-tag.tag-primary {
      background: #eff6ff;
      color: #0050e5;
    }
    .tier-tag.tag-warning {
      background: #fffbeb;
      color: #b45309;
    }

    /* Modular Capability Scopes Matrix Table */
    .matrix-preset-buttons {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }
    .btn-xs {
      height: 28px;
      padding: 0 10px;
      font-size: 11px;
      font-weight: 600;
      border-radius: 6px;
    }
    .btn-xs .material-symbols-outlined { font-size: 14px; }

    .scopes-table-wrapper {
      overflow-x: auto;
    }
    .scopes-matrix-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      font-size: 12.5px;
    }
    .scopes-matrix-table th {
      background: #f8fafc;
      padding: 10px 14px;
      text-align: left;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
      border-bottom: 1px solid #e2e8f0;
    }
    .scopes-matrix-table td {
      padding: 14px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
    }
    .scopes-matrix-table tr:hover td {
      background: #fafbfc;
    }
    .th-feature { width: 30%; }
    .th-description { width: 28%; }
    .th-actions { width: 42%; }

    .suite-title-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .suite-icon {
      font-size: 20px;
      color: #0050e5;
      background: #eff6ff;
      padding: 6px;
      border-radius: 8px;
      flex-shrink: 0;
    }
    .suite-title-row strong {
      display: block;
      color: #0f172a;
      font-size: 13px;
    }
    .suite-category-pill {
      font-size: 10px;
      font-weight: 700;
      color: #64748b;
      background: #f1f5f9;
      padding: 1px 6px;
      border-radius: 4px;
      display: inline-block;
      margin-top: 2px;
    }
    .scope-description-text {
      color: #475569;
      font-size: 12px;
      line-height: 1.4;
    }

    /* Segmented Control for Action Roles */
    .action-role-segmented-control {
      display: inline-flex;
      background: #f1f5f9;
      padding: 3px;
      border-radius: 8px;
      gap: 3px;
      width: 100%;
      max-width: 480px;
    }
    .segment-btn {
      flex: 1;
      height: 32px;
      border: none;
      background: transparent;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      transition: all 0.15s ease;
      white-space: nowrap;
      padding: 0 8px;
    }
    .segment-btn .material-symbols-outlined { font-size: 14px; }
    .segment-btn:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.6);
      color: #0f172a;
    }
    .segment-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    /* Active Segment States */
    .segment-btn.active.seg-none {
      background: #ffffff;
      color: #64748b;
      font-weight: 700;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .segment-btn.active.seg-readonly {
      background: #eff6ff;
      color: #0284c7;
      font-weight: 700;
      box-shadow: 0 1px 3px rgba(2, 132, 199, 0.15);
    }
    .segment-btn.active.seg-feature {
      background: #ecfdf5;
      color: #059669;
      font-weight: 700;
      box-shadow: 0 1px 3px rgba(5, 150, 105, 0.15);
    }
    .segment-btn.active.seg-global {
      background: #ede9fe;
      color: #7c3aed;
      font-weight: 700;
      box-shadow: 0 1px 3px rgba(124, 58, 237, 0.15);
    }

    /* Multi-Channel Dispatch Tiles */
    .dispatch-channels-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 14px;
    }
    .dispatch-tile {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px;
      display: flex;
      gap: 12px;
      align-items: flex-start;
    }
    .tile-icon-box {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .tile-icon-box .material-symbols-outlined { font-size: 20px; }
    .inapp-icon { background: #eff6ff; color: #0050e5; }
    .email-icon { background: #ecfdf5; color: #059669; }
    .audit-icon { background: #fef3c7; color: #d97706; }

    .tile-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .tile-info strong {
      font-size: 13px;
      color: #0f172a;
    }
    .tile-info p {
      margin: 0;
      font-size: 11.5px;
      color: #64748b;
      line-height: 1.4;
    }
    .tile-info code {
      background: #e2e8f0;
      padding: 1px 4px;
      border-radius: 3px;
      font-size: 11px;
    }
    .tile-badge {
      align-self: flex-start;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      margin-top: 4px;
    }
    .badge-active {
      background: #dcfce7;
      color: #15803d;
    }

    .preview-notice-box {
      background: #f1f5f9;
      border-radius: 8px;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 12px;
      color: #334155;
    }
    .preview-icon {
      color: #0050e5;
      font-size: 20px;
      flex-shrink: 0;
    }
    .preview-text strong {
      color: #0f172a;
      margin-right: 4px;
    }

    /* Sticky Action Footer */
    .action-footer-bar {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 14px rgba(0,0,0,0.04);
      flex-wrap: wrap;
      gap: 12px;
    }
    .footer-left-info {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: #64748b;
    }
    .info-icon { font-size: 18px; color: #0050e5; }
    .footer-action-buttons {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    /* Buttons */
    .btn {
      height: 38px;
      padding: 0 16px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      text-decoration: none;
      border: 1px solid transparent;
      transition: all 0.15s ease;
    }
    .btn-outline {
      background: #ffffff;
      border-color: #cbd5e1;
      color: #334155;
    }
    .btn-outline:hover:not(.disabled) {
      background: #f1f5f9;
      color: #0f172a;
    }
    .btn-primary {
      background: #0050e5 !important;
      color: #ffffff !important;
    }
    .btn-primary span, .btn-primary .material-symbols-outlined { color: #ffffff !important; }
    .btn-primary:hover:not(:disabled) {
      background: #0040b8 !important;
    }
    .btn-primary:disabled {
      opacity: 0.65;
      cursor: not-allowed;
    }
    .disabled {
      pointer-events: none;
      opacity: 0.6;
    }
  `]
})
export class UserPermissionsComponent implements OnInit {
  userId = '';
  isLoading = false;
  isSaving = false;
  user: any = null;

  selectedRole = 'Member';
  headerButtons: PageHeaderButton[] = [];

  /**
   * Canonical modular capability suites across the BCC architecture.
   */
  capabilitySuites: CapabilityScope[] = [
    {
      key: 'UserManager',
      name: 'User Management Suite',
      category: 'Governance & Identity',
      icon: 'manage_accounts',
      description: 'User Directory, Member Profiles, Onboarding Custom Attributes, Categories & OTP Verification.',
      scope: 'None'
    },
    {
      key: 'ContentManager',
      name: 'Website & CMS Studio',
      category: 'Content & Publishing',
      icon: 'web',
      description: 'Web Pages, Dynamic Blog Articles, Visual Templates, Navigation Menus, and Code Injections.',
      scope: 'None'
    },
    {
      key: 'IdentityManager',
      name: 'Identity & Access Policies',
      category: 'Security & Auth',
      icon: 'admin_panel_settings',
      description: 'System Roles, Fine-Grained Permissions, Member Invitations, Security Rules & Session Audits.',
      scope: 'None'
    },
    {
      key: 'CrmManager',
      name: 'CRM & Member Relationships',
      category: 'Member Operations',
      icon: 'contacts',
      description: 'Member Dossiers, Activity Histories, Direct Communications & Relationship Telemetry.',
      scope: 'None'
    },
    {
      key: 'BillingManager',
      name: 'Billing & Subscriptions',
      category: 'Financial Governance',
      icon: 'credit_card',
      description: 'Workspace Invoicing, Payment Gateways, Subscription Plans & Feature Add-On Entitlements.',
      scope: 'None'
    },
    {
      key: 'StoreManager',
      name: 'Store & Commerce Catalog',
      category: 'Commerce Studio',
      icon: 'storefront',
      description: 'Product Catalog, Pricing, Inventory Stock, Digital Downloads, and Order Fulfillment.',
      scope: 'None'
    },
    {
      key: 'EventsManager',
      name: 'Events & Registrations',
      category: 'Community & Events',
      icon: 'event',
      description: 'Event Schedules, Ticketing, RSVP Registration Lists, and QR Code Attendee Check-Ins.',
      scope: 'None'
    },
    {
      key: 'FormsManager',
      name: 'Forms & Survey Studio',
      category: 'Data & Intake',
      icon: 'dynamic_form',
      description: 'Visual Form Builder, Dynamic Fields, Submission Captures, and Intake Export Telemetry.',
      scope: 'None'
    },
    {
      key: 'TelemetryManager',
      name: 'System Logs & Telemetry',
      category: 'Platform Monitoring',
      icon: 'analytics',
      description: 'Outbound MX Email Dispatch Logs, BcpActivityLogs Telemetry, and Sentry Crash Alerts.',
      scope: 'None'
    }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private toast: ToastService
  ) {}

  get isCurrentRoleAdmin(): boolean {
    return this.selectedRole === 'Admin' || this.selectedRole === 'SuperAdmin';
  }

  get isRootSuperAdmin(): boolean {
    return this.selectedRole === 'SuperAdmin' || this.user?.isSuperAdmin === true;
  }

  ngOnInit(): void {
    this.userId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.userId) {
      this.toast.error('No member ID specified.');
      this.router.navigate(['/users/console/list']);
      return;
    }

    this.headerButtons = [
      {
        text: 'Back to Dossier',
        icon: 'arrow_back',
        isPrimary: false,
        routerLink: `/users/console/details/${this.userId}`
      },
      {
        text: 'Save Permissions',
        icon: 'verified_user',
        isPrimary: true,
        action: () => this.savePermissions()
      }
    ];

    this.loadUserPermissions();
  }

  loadUserPermissions(): void {
    this.isLoading = true;
    this.api.get<any>(`IdentityApi/users/${this.userId}/feature-roles`).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.user = res.data;
        this.selectedRole = this.user?.currentRole || 'Member';

        // Hydrate modular scopes from backend response
        if (this.user?.featureRoles && Array.isArray(this.user.featureRoles)) {
          for (const fr of this.user.featureRoles) {
            const suite = this.capabilitySuites.find(
              s => s.key.toLowerCase() === (fr.featureName || '').toLowerCase()
            );
            if (suite) {
              suite.scope = (fr.scope as any) || 'None';
            }
          }
        }
      },
      error: () => {
        // Fallback: try loading dossier if feature-roles is unavailable
        this.api.get<any>(`UsersApi/${this.userId}/dossier`).subscribe({
          next: (dossierRes) => {
            this.isLoading = false;
            this.user = dossierRes.data;
            this.selectedRole = this.user?.roles?.[0] || 'Member';
            if (this.user?.assignedFeatureArea) {
              const matchedSuite = this.capabilitySuites.find(
                s => s.key.toLowerCase() === this.user.assignedFeatureArea.toLowerCase()
              );
              if (matchedSuite) matchedSuite.scope = 'FeatureEdit';
            }
          },
          error: () => {
            this.isLoading = false;
            this.toast.error('Failed to load user permissions matrix.');
            this.router.navigate([`/users/console/details/${this.userId}`]);
          }
        });
      }
    });
  }

  selectSystemRole(role: string): void {
    if (this.isRootSuperAdmin) return;
    this.selectedRole = role;
  }

  setAllScopes(scope: 'None' | 'ReadOnly' | 'FeatureEdit' | 'GlobalEdit'): void {
    if (this.isRootSuperAdmin) return;
    for (const suite of this.capabilitySuites) {
      suite.scope = scope;
    }
  }

  getActiveScopesCount(): number {
    return this.capabilitySuites.filter(s => s.scope !== 'None').length;
  }

  getUserInitials(): string {
    if (!this.user?.fullName) return 'U';
    const parts = this.user.fullName.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0].substring(0, 2).toUpperCase();
  }

  sanitizeId(id: string): string {
    if (!id) return '';
    return id.replace(/[-]{2,}/g, '-').replace(/[/]{2,}/g, '/').replace(/[_]{2,}/g, '_');
  }

  getRoleIcon(role: string): string {
    switch (role) {
      case 'SuperAdmin': return 'military_tech';
      case 'Admin': return 'admin_panel_settings';
      case 'Global Editor': return 'edit_document';
      case 'Feature Editor': return 'auto_stories';
      case 'Read Only': return 'visibility';
      default: return 'person';
    }
  }

  savePermissions(): void {
    if (this.isRootSuperAdmin) {
      this.toast.error('Root SuperAdmin permissions are permanent and cannot be modified.');
      return;
    }

    this.isSaving = true;

    const featureRolesPayload = this.capabilitySuites.map(s => ({
      featureName: s.key,
      scope: s.scope
    }));

    const payload = {
      systemRole: this.selectedRole,
      isAdmin: this.selectedRole === 'Admin',
      featureRoles: featureRolesPayload
    };

    this.api.post<any>(`IdentityApi/users/${this.userId}/feature-roles`, payload).subscribe({
      next: (res) => {
        this.isSaving = false;
        this.toast.success(res?.message || 'Permissions updated successfully! Real-time alerts and email dispatched.');
        setTimeout(() => {
          this.router.navigate([`/users/console/details/${this.userId}`]);
        }, 600);
      },
      error: (err) => {
        this.isSaving = false;
        this.toast.error(err?.error?.message || 'Failed to update user security permissions.');
      }
    });
  }
}
