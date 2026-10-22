import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent, PageHeaderButton } from '../../../shared/components/page-header/page-header.component';

/**
 * Categorizes primary authority roles into broad organizational tiers
 * or modular capability feature authorities.
 */
export enum RoleGroup {
  System = 'System',
  Feature = 'Feature'
}

/**
 * Operational access level / action scope enumeration matching BcpActionRole.
 */
export enum ActionRoleType {
  GlobalEditor = 'GlobalEditor',
  FeatureEditor = 'FeatureEditor',
  Readonly = 'Readonly'
}

/**
 * Interface representing a selectable system or operational role with security governance details.
 */
export interface AvailableRole {
  name: string;
  group: RoleGroup;
  tier: string;
  badgeClass: string;
  icon: string;
  summary: string;
  featureAreaKey?: string;
  defaultActionRole?: ActionRoleType;
  allowedActions: string[];
  restrictedActions: string[];
}

/**
 * Interface representing an operational action role (Global Editor, Feature Editor, Read Only).
 */
export interface ActionRoleOption {
  key: ActionRoleType;
  title: string;
  badge: string;
  badgeClass: string;
  icon: string;
  summary: string;
  detailNote: string;
}

/**
 * Interface representing a modular capability domain for Feature Editor scoping.
 */
export interface FeatureScopeOption {
  key: string;
  label: string;
  icon: string;
  description: string;
  permittedAreas: string[];
}

/**
 * Component providing a dedicated administrative page for issuing workspace onboarding invitations.
 * Implements a 2-card role and action role selection hierarchy with reactive auto-selection,
 * modular capability binding, live authority inspection, and dynamic email simulation.
 */
@Component({
  selector: 'app-identity-invitation-create',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent],
  template: `
    <div class="identity-create-page">
      <!-- Standard BCC Page Header with Back Navigation -->
      <app-page-header
        eyebrow="IDENTITY ONBOARDING"
        icon="person_add"
        title="Issue Workspace Onboarding Invitation"
        subtitle="Dispatch secure cryptographic tokens to pre-provision enterprise system roles and modular capability scopes for new personnel."
        backUrl="/identity/console/invitations"
        backText="Back to Registry"
        [buttons]="headerButtons"
        [loading]="isSending"
      ></app-page-header>

      <!-- Success Dispatch Card (Displayed when invitation is successfully created) -->
      <div *ngIf="dispatchedLink" class="success-dispatch-card animate-fade">
        <div class="success-icon-wrap">
          <span class="material-symbols-outlined">mark_email_read</span>
        </div>
        <div class="success-content">
          <h3>Invitation Dispatched Successfully</h3>
          <p>
            An onboarding email has been enqueued for <strong>{{ dispatchedEmail }}</strong> with pre-assigned role <strong>{{ dispatchedRole }}</strong>.
            You can also copy the direct registration link below to share directly via communication channels:
          </p>
          <div class="link-copy-box">
            <input type="text" readonly [value]="dispatchedLink" class="link-input" #linkInput />
            <button type="button" class="btn btn-primary btn-copy" (click)="copyLink(linkInput)">
              <span class="material-symbols-outlined">{{ hasCopied ? 'check' : 'content_copy' }}</span>
              <span>{{ hasCopied ? 'Copied Link' : 'Copy Direct Link' }}</span>
            </button>
          </div>
          <div class="success-actions">
            <button type="button" class="btn btn-outline" (click)="resetForm()">
              <span class="material-symbols-outlined">add_circle</span>
              <span>Invite Another Member</span>
            </button>
            <a routerLink="/identity/console/invitations" class="btn btn-outline">
              <span class="material-symbols-outlined">format_list_bulleted</span>
              <span>View Onboarding Registry</span>
            </a>
          </div>
        </div>
      </div>

      <!-- Main Form Dual-Column Grid -->
      <div class="invitation-grid" *ngIf="!dispatchedLink">
        <!-- LEFT COLUMN: Primary Configuration (60% width) -->
        <div class="config-column">
          <!-- CARD 0: Recipient Identity & Organization Details -->
          <section class="console-card">
            <div class="card-head">
              <div class="card-head-title">
                <span class="material-symbols-outlined text-blue">alternate_email</span>
                <div>
                  <h3 class="card-title">Recipient &amp; Workspace Membership</h3>
                  <p class="card-subtitle">Specify recipient identity details, organization categorization, and invitation duration.</p>
                </div>
              </div>
            </div>

            <div class="card-body">
              <div class="form-row">
                <div class="form-group flex-1">
                  <label class="form-label" for="inviteEmail">Recipient Email Address <span class="required">*</span></label>
                  <div class="input-with-icon">
                    <span class="material-symbols-outlined input-icon">mail</span>
                    <input
                      id="inviteEmail"
                      type="email"
                      class="form-control"
                      placeholder="name@company.com"
                      [(ngModel)]="inviteEmail"
                      (ngModelChange)="onFormChange()"
                      required
                    />
                  </div>
                  <span class="field-hint">The invitation token and activation link will be dispatched to this mailbox.</span>
                </div>

                <div class="form-group flex-1">
                  <label class="form-label" for="inviteCategory">Target Member Category</label>
                  <div class="input-with-icon">
                    <span class="material-symbols-outlined input-icon">category</span>
                    <select id="inviteCategory" class="form-control" [(ngModel)]="selectedCategoryId">
                      <option [ngValue]="null">Standard / General Member</option>
                      <option *ngFor="let cat of userCategories" [ngValue]="cat.id">
                        {{ cat.name }} {{ cat.code ? '(' + cat.code + ')' : '' }}
                      </option>
                    </select>
                  </div>
                  <span class="field-hint">Pre-links the onboarded account to a directory group.</span>
                </div>
              </div>

              <div class="form-row mt-3">
                <div class="form-group flex-1">
                  <label class="form-label">Invitation Expiration Window</label>
                  <div class="pill-selector">
                    <button
                      type="button"
                      class="pill-opt"
                      [class.active]="expirationDays === 7"
                      (click)="expirationDays = 7"
                    >
                      <span class="material-symbols-outlined">timelapse</span>
                      <span>7 Days (Recommended)</span>
                    </button>
                    <button
                      type="button"
                      class="pill-opt"
                      [class.active]="expirationDays === 14"
                      (click)="expirationDays = 14"
                    >
                      <span>14 Days</span>
                    </button>
                    <button
                      type="button"
                      class="pill-opt"
                      [class.active]="expirationDays === 30"
                      (click)="expirationDays = 30"
                    >
                      <span>30 Days</span>
                    </button>
                  </div>
                </div>
              </div>

              <div class="form-group mt-3">
                <label class="form-label" for="customMessage">Welcome Note / Administrator Message (Optional)</label>
                <textarea
                  id="customMessage"
                  rows="2"
                  class="form-control textarea"
                  placeholder="e.g. Welcome to our enterprise workspace! Please establish your credentials to access your designated modules."
                  [(ngModel)]="customMessage"
                  (ngModelChange)="onFormChange()"
                ></textarea>
                <span class="field-hint">This personal message will be highlighted inside the onboarding invitation email.</span>
              </div>
            </div>
          </section>

          <!-- CARD 1: Pre-Assigned Primary Authority Role (Grouped into System vs Feature Authorities) -->
          <section class="console-card mt-4">
            <div class="card-head">
              <div class="card-head-title">
                <span class="material-symbols-outlined text-purple">badge</span>
                <div>
                  <h3 class="card-title">Card 1: Primary Authority Role</h3>
                  <p class="card-subtitle">Choose the user's primary identity persona. Grouped into System Governance and Modular Feature Authorities.</p>
                </div>
              </div>

              <!-- Filter Tabs for Groups -->
              <div class="group-tab-switch">
                <button
                  type="button"
                  class="tab-btn"
                  [class.active]="activeGroupFilter === 'All'"
                  (click)="activeGroupFilter = 'All'"
                >
                  <span>All</span>
                  <span class="tab-count">{{ availableRoles.length }}</span>
                </button>
                <button
                  type="button"
                  class="tab-btn"
                  [class.active]="activeGroupFilter === RoleGroup.System"
                  (click)="activeGroupFilter = RoleGroup.System"
                >
                  <span>System</span>
                  <span class="tab-count">{{ systemRoles.length }}</span>
                </button>
                <button
                  type="button"
                  class="tab-btn"
                  [class.active]="activeGroupFilter === RoleGroup.Feature"
                  (click)="activeGroupFilter = RoleGroup.Feature"
                >
                  <span>Feature Authority</span>
                  <span class="tab-count">{{ featureRoles.length }}</span>
                </button>
              </div>
            </div>

            <div class="card-body">
              <!-- GROUP A: System & Organization Governance -->
              <div class="role-group-section" *ngIf="activeGroupFilter === 'All' || activeGroupFilter === RoleGroup.System">
                <div class="role-group-divider">
                  <div class="divider-left">
                    <span class="material-symbols-outlined text-purple">admin_panel_settings</span>
                    <span class="group-header-text">System &amp; Workspace Governance</span>
                  </div>
                  <span class="group-header-pill">Organization Tier</span>
                </div>

                <div class="roles-selection-grid">
                  <div
                    *ngFor="let role of systemRoles"
                    class="role-select-card"
                    [class.selected]="selectedRole === role.name"
                    (click)="selectRole(role)"
                  >
                    <div class="role-select-top">
                      <div class="role-icon-box" [ngClass]="role.badgeClass">
                        <span class="material-symbols-outlined">{{ role.icon }}</span>
                      </div>
                      <span class="role-tier-badge" [ngClass]="role.badgeClass">{{ role.tier }}</span>
                    </div>
                    <h4 class="role-select-title">{{ role.name }}</h4>
                    <p class="role-select-desc">{{ role.summary }}</p>
                    <div class="role-card-footer">
                      <span class="auto-link-hint" *ngIf="role.name === 'Admin'">
                        <span class="material-symbols-outlined">auto_mode</span>
                        <span>Sets Global Edit</span>
                      </span>
                      <span class="auto-link-hint text-slate" *ngIf="role.name === 'Member'">
                        <span class="material-symbols-outlined">dashboard</span>
                        <span>Member Portal Access</span>
                      </span>
                      <div class="role-radio-indicator">
                        <span class="material-symbols-outlined" *ngIf="selectedRole === role.name">check_circle</span>
                        <span class="material-symbols-outlined text-muted" *ngIf="selectedRole !== role.name">radio_button_unchecked</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- GROUP B: Modular Feature Authority Roles (Active 2 Roles) -->
              <div class="role-group-section mt-4" *ngIf="activeGroupFilter === 'All' || activeGroupFilter === RoleGroup.Feature">
                <div class="role-group-divider">
                  <div class="divider-left">
                    <span class="material-symbols-outlined text-emerald">extension</span>
                    <span class="group-header-text">Modular Capability Feature Authorities</span>
                  </div>
                  <span class="group-header-pill emerald">Active Modules (2)</span>
                </div>

                <div class="roles-selection-grid">
                  <div
                    *ngFor="let role of featureRoles"
                    class="role-select-card"
                    [class.selected]="selectedRole === role.name"
                    (click)="selectRole(role)"
                  >
                    <div class="role-select-top">
                      <div class="role-icon-box" [ngClass]="role.badgeClass">
                        <span class="material-symbols-outlined">{{ role.icon }}</span>
                      </div>
                      <span class="role-tier-badge" [ngClass]="role.badgeClass">{{ role.tier }}</span>
                    </div>
                    <h4 class="role-select-title">{{ role.name }}</h4>
                    <p class="role-select-desc">{{ role.summary }}</p>
                    <div class="role-card-footer">
                      <span class="auto-link-hint emerald">
                        <span class="material-symbols-outlined">tune</span>
                        <span>Feature Edit</span>
                      </span>
                      <div class="role-radio-indicator">
                        <span class="material-symbols-outlined" *ngIf="selectedRole === role.name">check_circle</span>
                        <span class="material-symbols-outlined text-muted" *ngIf="selectedRole !== role.name">radio_button_unchecked</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- CARD 2: Operational Action Role & Edit Scope (BcpActionRole) -->
          <section class="console-card mt-4">
            <div class="card-head">
              <div class="card-head-title">
                <span class="material-symbols-outlined text-emerald">tune</span>
                <div>
                  <h3 class="card-title">Card 2: Operational Edit Access Level</h3>
                  <p class="card-subtitle">
                    {{ selectedRole === 'Member' 
                       ? 'Standard members do not hold operational administrative edit roles.' 
                       : 'Controls the user operational write power: tenant-wide global edit, targeted module edit, or view-only auditing.' }}
                  </p>
                </div>
              </div>
              <span class="scope-highlight-badge" [ngClass]="getActionBadgeClass()">
                <span class="material-symbols-outlined">{{ getActionIcon() }}</span>
                <span>{{ getSelectedActionRoleLabel() }}</span>
              </span>
            </div>

            <div class="card-body">
              <!-- CASE A: When Member is selected -> Standard Member Workspace Portal Info -->
              <div *ngIf="selectedRole === 'Member'" class="member-portal-info-box animate-fade">
                <div class="member-info-icon">
                  <span class="material-symbols-outlined">dashboard_customize</span>
                </div>
                <div class="member-info-text">
                  <h4>Dedicated Member Workspace Portal</h4>
                  <p>
                    A <strong>Member</strong> is a standard workspace user with their own dedicated user dashboard and workspace applications.
                    They do not hold administrative or operational editing roles within the BCC Administration Console.
                  </p>
                  <div class="member-features-pills">
                    <span class="pill-feat"><span class="material-symbols-outlined">check</span> Authenticated Member Dashboard</span>
                    <span class="pill-feat"><span class="material-symbols-outlined">check</span> Personal Profile &amp; 2FA</span>
                    <span class="pill-feat"><span class="material-symbols-outlined">check</span> Member Directory Presence</span>
                  </div>
                </div>
              </div>

              <!-- CASE B: When an Operational Role is selected (Admin, User Manager, Identity Manager) -->
              <div *ngIf="selectedRole !== 'Member'">
                <!-- 3 Action Role Cards (Global Editor, Feature Editor, Read Only) -->
                <div class="action-roles-grid">
                  <div
                    *ngFor="let act of actionRoleOptions"
                    class="action-role-card"
                    [class.selected]="selectedActionRole === act.key"
                    (click)="selectActionRole(act)"
                  >
                    <div class="action-card-top">
                      <div class="action-icon-box" [ngClass]="act.badgeClass">
                        <span class="material-symbols-outlined">{{ act.icon }}</span>
                      </div>
                      <span class="action-tier-badge" [ngClass]="act.badgeClass">{{ act.badge }}</span>
                    </div>
                    <h4 class="action-title">{{ act.title }}</h4>
                    <p class="action-summary">{{ act.summary }}</p>

                    <div class="action-card-bottom">
                      <span class="action-sync-tag" *ngIf="isAutoAssigned(act.key)">
                        <span class="material-symbols-outlined">auto_awesome</span>
                        <span>Auto-assigned</span>
                      </span>
                      <span class="action-sync-tag custom" *ngIf="!isAutoAssigned(act.key)">
                        <span>Manual Override</span>
                      </span>
                      <div class="action-radio">
                        <span class="material-symbols-outlined" *ngIf="selectedActionRole === act.key">check_circle</span>
                        <span class="material-symbols-outlined text-muted" *ngIf="selectedActionRole !== act.key">radio_button_unchecked</span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Contextual Scope Details depending on selectedActionRole -->
                <!-- Feature Editor -> Show active modular capability picker -->
                <div class="module-scope-container mt-4 animate-fade" *ngIf="selectedActionRole === ActionRoleType.FeatureEditor">
                  <div class="module-scope-head">
                    <div>
                      <h4 class="module-scope-title">Designated Capability Domain</h4>
                      <p class="module-scope-sub">This user will be granted full authoring, write, and publishing rights strictly within this selected module.</p>
                    </div>
                    <span class="bound-badge">
                      <span class="material-symbols-outlined">link</span>
                      <span>Bound to: <strong>{{ getSelectedScopeLabel() }}</strong></span>
                    </span>
                  </div>

                  <div class="scope-selector-grid mt-3">
                    <div
                      *ngFor="let scope of featureScopeOptions"
                      class="scope-option-card"
                      [class.active]="selectedFeatureArea === scope.key"
                      (click)="selectFeatureScope(scope)"
                    >
                      <div class="scope-option-header">
                        <div class="scope-icon-wrap">
                          <span class="material-symbols-outlined">{{ scope.icon }}</span>
                        </div>
                        <div>
                          <h4 class="scope-title">{{ scope.label }}</h4>
                          <code class="scope-code">{{ scope.key }}</code>
                        </div>
                      </div>
                      <p class="scope-desc">{{ scope.description }}</p>
                      <div class="scope-areas-pills">
                        <span *ngFor="let area of scope.permittedAreas" class="area-pill">
                          ✓ {{ area }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div class="scope-notice-box mt-3">
                    <span class="material-symbols-outlined text-blue">info</span>
                    <p>
                      <strong>Capability Isolation:</strong> Personnel assigned with Feature Editor access to <strong>{{ getSelectedScopeLabel() }}</strong> can only author, edit, and publish records within this designated module. They will hold standard read-only access in other workspace areas.
                    </p>
                  </div>
                </div>

                <!-- Global Editor Info Notice -->
                <div class="scope-notice-box global mt-4 animate-fade" *ngIf="selectedActionRole === ActionRoleType.GlobalEditor">
                  <span class="material-symbols-outlined text-indigo">language</span>
                  <p>
                    <strong>Global Operational Scope:</strong> With <strong>Global Editor</strong> privileges, this user will hold full CRUD create, edit, publish, and delete authority across all active modules throughout this entire tenant workspace.
                  </p>
                </div>

                <!-- Read Only Info Notice -->
                <div class="scope-notice-box readonly mt-4 animate-fade" *ngIf="selectedActionRole === ActionRoleType.Readonly">
                  <span class="material-symbols-outlined text-amber">visibility</span>
                  <p>
                    <strong>Observer Auditing Scope:</strong> With <strong>Read Only</strong> privileges, this user can navigate and inspect data across workspace applications, but all create, edit, and delete action triggers will be hidden or disabled.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <!-- RIGHT COLUMN: Live Authority & Email Simulation (40% width) -->
        <div class="preview-column">
          <!-- CARD A: Live Authority & Permission Summary -->
          <section class="console-card sticky-card">
            <div class="card-head">
              <div class="card-head-title">
                <span class="material-symbols-outlined text-indigo">shield</span>
                <div>
                  <h3 class="card-title">Governance &amp; Access Summary</h3>
                  <p class="card-subtitle">Real-time breakdown of assigned authorities upon onboarding.</p>
                </div>
              </div>
            </div>

            <div class="card-body">
              <!-- Active Role Badge Bar -->
              <div class="live-role-summary-bar">
                <div class="role-icon-box" [ngClass]="currentRoleObj?.badgeClass || 'badge-member'">
                  <span class="material-symbols-outlined">{{ currentRoleObj?.icon || 'person' }}</span>
                </div>
                <div>
                  <div class="live-role-name">{{ selectedRole }}</div>
                  <div class="live-role-tier">
                    {{ currentRoleObj?.tier || 'Standard Member' }} &bull;
                    {{ currentRoleObj?.group === RoleGroup.System ? 'System Tier' : 'Feature Authority' }}
                  </div>
                </div>
              </div>

              <!-- Live Action Role Pill Bar -->
              <div class="live-scope-banner mt-3" [ngClass]="getActionBadgeClass()">
                <span class="material-symbols-outlined">{{ getActionIcon() }}</span>
                <div>
                  <strong>{{ selectedRole === 'Member' ? 'Workspace Surface:' : 'Edit Access Level:' }}</strong>
                  <span>{{ getSelectedActionRoleLabel() }}</span>
                  <span *ngIf="selectedRole !== 'Member' && selectedActionRole === ActionRoleType.FeatureEditor"> &mdash; {{ getSelectedScopeLabel() }}</span>
                </div>
              </div>

              <!-- Dynamic Permitted Capabilities -->
              <div class="permissions-list mt-3">
                <div class="perm-title text-good">
                  <span class="material-symbols-outlined">check_circle</span>
                  <span>Permitted Capabilities</span>
                </div>
                <ul class="perm-items">
                  <li *ngIf="selectedRole === 'Member'">
                    Full access to authenticated personal workspace apps and member dashboard
                  </li>
                  <li *ngIf="selectedRole !== 'Member' && selectedActionRole === ActionRoleType.GlobalEditor">
                    Full CRUD create, edit, and publish permissions across all workspace modules
                  </li>
                  <li *ngIf="selectedRole !== 'Member' && selectedActionRole === ActionRoleType.FeatureEditor">
                    Author, update, and publish records within {{ getSelectedScopeLabel() }}
                  </li>
                  <li *ngIf="selectedRole !== 'Member' && selectedActionRole === ActionRoleType.Readonly">
                    Inspect dashboards, member rosters, and activity logs without edit rights
                  </li>
                  <li *ngFor="let act of currentRoleObj?.allowedActions">
                    {{ act }}
                  </li>
                </ul>
              </div>

              <!-- Dynamic Restricted Boundaries -->
              <div class="permissions-list mt-3">
                <div class="perm-title text-warn">
                  <span class="material-symbols-outlined">block</span>
                  <span>Restricted Boundaries</span>
                </div>
                <ul class="perm-items restricted">
                  <li *ngIf="selectedRole !== 'Member' && selectedActionRole === ActionRoleType.Readonly">
                    Strictly prohibited from modifying, saving, or deleting workspace records
                  </li>
                  <li *ngIf="selectedRole !== 'Member' && selectedActionRole === ActionRoleType.FeatureEditor">
                    Read-only access across other modules outside {{ getSelectedScopeLabel() }}
                  </li>
                  <li *ngFor="let rest of currentRoleObj?.restrictedActions">
                    {{ rest }}
                  </li>
                </ul>
              </div>

              <div class="meta-stats-row mt-3">
                <div class="meta-stat">
                  <span class="meta-lbl">Token Lifetime</span>
                  <span class="meta-val">{{ expirationDays }} Days</span>
                </div>
                <div class="meta-stat">
                  <span class="meta-lbl">Target Category</span>
                  <span class="meta-val">{{ getSelectedCategoryName() }}</span>
                </div>
              </div>
            </div>
          </section>

          <!-- CARD B: Live Email Preview Simulation -->
          <section class="console-card mt-4 sticky-card-preview">
            <div class="card-head">
              <div class="card-head-title">
                <span class="material-symbols-outlined text-purple">mark_as_unread</span>
                <div>
                  <h3 class="card-title">Live Email Dispatch Preview</h3>
                  <p class="card-subtitle">Real-time simulation of the invitation email dispatched to the recipient.</p>
                </div>
              </div>
            </div>

            <div class="card-body" style="padding: 16px;">
              <div class="email-mockup-frame">
                <div class="email-mockup-header">
                  <div class="brand-pill">
                    <span class="material-symbols-outlined brand-icon">token</span>
                    <span>Ozikol BCC Workspace</span>
                  </div>
                  <span class="email-date-mock">{{ today | date:'mediumDate' }}</span>
                </div>

                <div class="email-mockup-body">
                  <h4 class="mock-heading">Workspace Onboarding Invitation</h4>
                  <p class="mock-intro">
                    Hello, you have been invited to join the <strong>Ozikol Workspace Portal</strong> as a
                    <span class="mock-role-pill" [ngClass]="currentRoleObj?.badgeClass">
                      {{ selectedRole }}
                    </span>
                    <ng-container *ngIf="selectedRole !== 'Member'">
                      with <strong>{{ getSelectedActionRoleLabel() }}</strong>
                      <span *ngIf="selectedActionRole === ActionRoleType.FeatureEditor">
                        for <strong>{{ getSelectedScopeLabel() }}</strong>
                      </span>
                    </ng-container>
                    <ng-container *ngIf="selectedRole === 'Member'">
                      with access to your personal workspace portal apps and dashboard.
                    </ng-container>
                  </p>

                  <div *ngIf="customMessage" class="mock-quote-box">
                    &ldquo;{{ customMessage }}&rdquo;
                  </div>

                  <div class="mock-cta-wrap">
                    <div class="mock-btn-cta">
                      <span>Accept Invitation &amp; Register</span>
                    </div>
                  </div>

                  <p class="mock-footer-note">
                    This onboarding invitation link is cryptographic, private, and valid for {{ expirationDays }} days.
                  </p>
                </div>
              </div>

              <!-- Main Submit Trigger Buttons -->
              <div class="action-buttons-wrap mt-4">
                <button
                  type="button"
                  class="btn btn-outline flex-1"
                  routerLink="/identity/console/invitations"
                  [disabled]="isSending"
                >
                  Discard
                </button>
                <button
                  type="button"
                  class="btn btn-primary btn-dispatch flex-2"
                  [disabled]="isSending || !isFormValid"
                  (click)="dispatchInvitation()"
                >
                  <span class="material-symbols-outlined" *ngIf="!isSending">send</span>
                  <span class="material-symbols-outlined spin-icon" *ngIf="isSending">progress_activity</span>
                  <span>{{ isSending ? 'Enqueuing Dispatch...' : 'Dispatch Invitation' }}</span>
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .identity-create-page {
      padding: 0 0 40px;
    }
    .invitation-grid {
      display: grid;
      grid-template-columns: 1.4fr 1fr;
      gap: 24px;
      align-items: start;
    }
    @media (max-width: 1024px) {
      .invitation-grid {
        grid-template-columns: 1fr;
      }
    }
    .console-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
    }
    .card-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
      gap: 16px;
      flex-wrap: wrap;
    }
    .card-head-title {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      flex: 1;
    }
    .card-head-title .material-symbols-outlined {
      font-size: 26px;
      margin-top: 2px;
    }
    .card-title {
      font-size: 15px;
      font-weight: 800;
      margin: 0;
      color: #0f172a;
    }
    .card-subtitle {
      font-size: 12.5px;
      color: #64748b;
      margin: 3px 0 0;
      line-height: 1.4;
    }
    .form-row {
      display: flex;
      gap: 16px;
    }
    @media (max-width: 640px) {
      .form-row {
        flex-direction: column;
      }
    }
    .flex-1 { flex: 1; }
    .flex-2 { flex: 2; }
    .form-group {
      display: flex;
      flex-direction: column;
    }
    .form-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #475569;
      margin-bottom: 6px;
    }
    .required {
      color: #ef4444;
    }
    .input-with-icon {
      position: relative;
      display: flex;
      align-items: center;
    }
    .input-icon {
      position: absolute;
      left: 12px;
      color: #94a3b8;
      font-size: 18px;
      pointer-events: none;
    }
    .form-control {
      width: 100%;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 10px 12px 10px 38px;
      font-size: 13.5px;
      color: #0f172a;
      outline: none;
      background: #ffffff;
      box-sizing: border-box;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .form-control:focus {
      border-color: #0050e5;
      box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.1);
    }
    .form-control.textarea {
      padding: 10px 12px;
      resize: vertical;
    }
    .field-hint {
      font-size: 11.5px;
      color: #94a3b8;
      margin-top: 4px;
    }
    .mt-3 { margin-top: 16px; }
    .mt-4 { margin-top: 24px; }
    .text-blue { color: #0050e5; }
    .text-purple { color: #8b5cf6; }
    .text-emerald { color: #10b981; }
    .text-indigo { color: #6366f1; }
    .text-amber { color: #d97706; }
    .text-good { color: #16a34a; }
    .text-warn { color: #d97706; }
    .text-muted { color: #94a3b8; }
    .text-slate { color: #475569; }

    /* Expiration Pills */
    .pill-selector {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .pill-opt {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 8px 14px;
      font-size: 12px;
      font-weight: 600;
      color: #475569;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s;
    }
    .pill-opt .material-symbols-outlined {
      font-size: 15px;
    }
    .pill-opt.active {
      background: rgba(0, 80, 229, 0.08);
      border-color: #0050e5;
      color: #0050e5;
    }

    /* Filter Tabs Switcher */
    .group-tab-switch {
      display: inline-flex;
      background: #f1f5f9;
      border-radius: 9999px;
      padding: 3px;
      gap: 2px;
    }
    .tab-btn {
      border: none;
      background: transparent;
      padding: 6px 12px;
      border-radius: 9999px;
      font-size: 11.5px;
      font-weight: 600;
      color: #64748b;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s;
    }
    .tab-btn.active {
      background: #ffffff;
      color: #0050e5;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    }
    .tab-count {
      font-size: 10px;
      padding: 1px 6px;
      border-radius: 9999px;
      background: rgba(100, 116, 139, 0.12);
      color: inherit;
    }
    .tab-btn.active .tab-count {
      background: rgba(0, 80, 229, 0.1);
      color: #0050e5;
    }

    /* Role Group Section & Divider */
    .role-group-divider {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 10px;
      margin-bottom: 12px;
      border-bottom: 1px dashed #e2e8f0;
    }
    .divider-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .divider-left .material-symbols-outlined {
      font-size: 18px;
    }
    .group-header-text {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #334155;
    }
    .group-header-pill {
      font-size: 10.5px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 9999px;
      background: rgba(139, 92, 246, 0.1);
      color: #8b5cf6;
    }
    .group-header-pill.emerald {
      background: rgba(16, 185, 129, 0.1);
      color: #10b981;
    }

    /* Roles Selection Grid */
    .roles-selection-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 12px;
    }
    .role-select-card {
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px;
      cursor: pointer;
      background: #ffffff;
      transition: all 0.2s;
      display: flex;
      flex-direction: column;
      position: relative;
    }
    .role-select-card:hover {
      border-color: #cbd5e1;
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.03);
    }
    .role-select-card.selected {
      border-color: #0050e5;
      background: rgba(0, 80, 229, 0.02);
      box-shadow: 0 0 0 1px #0050e5;
    }
    .role-select-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .role-icon-box {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .role-icon-box .material-symbols-outlined {
      font-size: 18px;
    }
    .role-tier-badge {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .role-select-title {
      font-size: 13.5px;
      font-weight: 700;
      margin: 0 0 4px;
      color: #0f172a;
    }
    .role-select-desc {
      font-size: 11.5px;
      color: #64748b;
      margin: 0 0 12px;
      line-height: 1.4;
      flex: 1;
    }
    .role-card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid #f1f5f9;
      padding-top: 8px;
      margin-top: auto;
    }
    .auto-link-hint {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 10.5px;
      color: #0050e5;
      font-weight: 600;
    }
    .auto-link-hint .material-symbols-outlined {
      font-size: 13px;
    }
    .auto-link-hint.emerald {
      color: #10b981;
    }
    .auto-link-hint.text-slate {
      color: #475569;
    }
    .role-radio-indicator {
      display: flex;
      align-items: center;
    }
    .role-radio-indicator .material-symbols-outlined {
      font-size: 18px;
      color: #0050e5;
    }

    /* Badges */
    .badge-admin { background: rgba(0, 80, 229, 0.12); color: #0050e5; }
    .badge-identity { background: rgba(139, 92, 246, 0.12); color: #8b5cf6; }
    .badge-user { background: rgba(14, 165, 233, 0.12); color: #0284c7; }
    .badge-member { background: rgba(100, 116, 139, 0.12); color: #475569; }
    .badge-readonly { background: rgba(245, 158, 11, 0.12); color: #d97706; }
    .badge-global { background: rgba(0, 80, 229, 0.12); color: #0050e5; }
    .badge-feature { background: rgba(16, 185, 129, 0.12); color: #10b981; }

    /* CARD 2: Operational Action Roles */
    .action-roles-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 14px;
    }
    @media (max-width: 768px) {
      .action-roles-grid {
        grid-template-columns: 1fr;
      }
    }
    .action-role-card {
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px;
      cursor: pointer;
      background: #ffffff;
      transition: all 0.2s;
      display: flex;
      flex-direction: column;
      position: relative;
    }
    .action-role-card:hover {
      border-color: #cbd5e1;
      transform: translateY(-1px);
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.03);
    }
    .action-role-card.selected {
      border-color: #0050e5;
      background: rgba(0, 80, 229, 0.02);
      box-shadow: 0 0 0 1.5px #0050e5;
    }
    .action-card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .action-icon-box {
      width: 34px;
      height: 34px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .action-icon-box .material-symbols-outlined {
      font-size: 20px;
    }
    .action-tier-badge {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      padding: 2px 7px;
      border-radius: 4px;
    }
    .action-title {
      font-size: 14px;
      font-weight: 800;
      margin: 0 0 5px;
      color: #0f172a;
    }
    .action-summary {
      font-size: 11.5px;
      color: #64748b;
      margin: 0 0 14px;
      line-height: 1.45;
      flex: 1;
    }
    .action-card-bottom {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid #f1f5f9;
      padding-top: 8px;
      margin-top: auto;
    }
    .action-sync-tag {
      font-size: 10.5px;
      font-weight: 600;
      color: #0050e5;
      display: inline-flex;
      align-items: center;
      gap: 3px;
    }
    .action-sync-tag .material-symbols-outlined {
      font-size: 13px;
    }
    .action-sync-tag.custom {
      color: #94a3b8;
    }
    .action-radio .material-symbols-outlined {
      font-size: 18px;
      color: #0050e5;
    }

    /* Dedicated Member Portal Notice */
    .member-portal-info-box {
      display: flex;
      gap: 16px;
      align-items: flex-start;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 18px;
    }
    .member-info-icon {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      background: rgba(0, 80, 229, 0.08);
      color: #0050e5;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .member-info-icon .material-symbols-outlined {
      font-size: 24px;
    }
    .member-info-text h4 {
      font-size: 14px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 6px;
    }
    .member-info-text p {
      font-size: 12.5px;
      color: #475569;
      line-height: 1.5;
      margin: 0 0 12px;
    }
    .member-features-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .pill-feat {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      font-weight: 600;
      color: #0f172a;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 4px 10px;
    }
    .pill-feat .material-symbols-outlined {
      font-size: 14px;
      color: #10b981;
    }

    /* Module Scope Container */
    .module-scope-container {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px;
    }
    .module-scope-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      flex-wrap: wrap;
    }
    .module-scope-title {
      font-size: 13px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 3px;
    }
    .module-scope-sub {
      font-size: 11.5px;
      color: #64748b;
      margin: 0;
    }
    .bound-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: rgba(16, 185, 129, 0.1);
      color: #065f46;
      border: 1px solid rgba(16, 185, 129, 0.2);
      border-radius: 6px;
      padding: 4px 8px;
      font-size: 11px;
    }
    .bound-badge .material-symbols-outlined {
      font-size: 14px;
    }

    /* Scope Options Grid */
    .scope-highlight-badge {
      background: rgba(16, 185, 129, 0.12);
      color: #10b981;
      font-size: 11px;
      font-weight: 700;
      padding: 4px 8px;
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .scope-highlight-badge .material-symbols-outlined {
      font-size: 14px;
    }
    .scope-selector-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 12px;
    }
    .scope-option-card {
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px;
      cursor: pointer;
      background: #ffffff;
      transition: all 0.15s;
    }
    .scope-option-card:hover {
      border-color: #cbd5e1;
    }
    .scope-option-card.active {
      border-color: #10b981;
      background: rgba(16, 185, 129, 0.03);
      box-shadow: 0 0 0 1px #10b981;
    }
    .scope-option-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 6px;
    }
    .scope-icon-wrap {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      background: rgba(16, 185, 129, 0.1);
      color: #10b981;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .scope-icon-wrap .material-symbols-outlined {
      font-size: 16px;
    }
    .scope-title {
      font-size: 12.5px;
      font-weight: 700;
      margin: 0;
      color: #0f172a;
    }
    .scope-code {
      font-size: 10px;
      color: #64748b;
      background: #f1f5f9;
      padding: 1px 4px;
      border-radius: 4px;
    }
    .scope-desc {
      font-size: 11px;
      color: #64748b;
      margin: 0 0 8px;
      line-height: 1.4;
    }
    .scope-areas-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    .area-pill {
      font-size: 10px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      color: #334155;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .scope-notice-box {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      background: rgba(0, 80, 229, 0.04);
      border-left: 3px solid #0050e5;
      padding: 10px 12px;
      border-radius: 0 8px 8px 0;
      font-size: 12px;
      color: #334155;
      line-height: 1.5;
    }
    .scope-notice-box.global {
      background: rgba(99, 102, 241, 0.05);
      border-left-color: #6366f1;
    }
    .scope-notice-box.readonly {
      background: rgba(245, 158, 11, 0.05);
      border-left-color: #f59e0b;
    }
    .scope-notice-box .material-symbols-outlined {
      font-size: 18px;
      margin-top: 1px;
    }

    /* Live Summary Card */
    .live-role-summary-bar {
      display: flex;
      align-items: center;
      gap: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid #e2e8f0;
    }
    .live-role-name {
      font-size: 15px;
      font-weight: 800;
      color: #0f172a;
    }
    .live-role-tier {
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
    }
    .live-scope-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 12px;
      font-weight: 600;
    }
    .live-scope-banner.badge-global {
      background: rgba(0, 80, 229, 0.08);
      border: 1px solid rgba(0, 80, 229, 0.2);
      color: #0050e5;
    }
    .live-scope-banner.badge-feature {
      background: rgba(16, 185, 129, 0.08);
      border: 1px solid rgba(16, 185, 129, 0.2);
      color: #065f46;
    }
    .live-scope-banner.badge-readonly {
      background: rgba(245, 158, 11, 0.08);
      border: 1px solid rgba(245, 158, 11, 0.2);
      color: #b45309;
    }
    .live-scope-banner.badge-member {
      background: rgba(100, 116, 139, 0.08);
      border: 1px solid rgba(100, 116, 139, 0.2);
      color: #334155;
    }
    .live-scope-banner .material-symbols-outlined {
      font-size: 18px;
    }
    .permissions-list .perm-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      margin-bottom: 6px;
    }
    .permissions-list .perm-title .material-symbols-outlined {
      font-size: 15px;
    }
    .perm-items {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .perm-items li {
      font-size: 12px;
      color: #334155;
      padding: 3px 0 3px 18px;
      position: relative;
      line-height: 1.4;
    }
    .perm-items li::before {
      content: "•";
      position: absolute;
      left: 6px;
      color: #16a34a;
      font-weight: bold;
    }
    .perm-items.restricted li::before {
      color: #d97706;
    }
    .meta-stats-row {
      display: flex;
      justify-content: space-between;
      background: #f8fafc;
      border-radius: 8px;
      padding: 10px 14px;
      border: 1px solid #e2e8f0;
    }
    .meta-stat {
      display: flex;
      flex-direction: column;
    }
    .meta-lbl {
      font-size: 10px;
      text-transform: uppercase;
      color: #64748b;
      font-weight: 700;
    }
    .meta-val {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
    }

    /* Email Mockup Simulation */
    .email-mockup-frame {
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      background: #fafafc;
      overflow: hidden;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
    }
    .email-mockup-header {
      background: #ffffff;
      padding: 12px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #e2e8f0;
    }
    .brand-pill {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 700;
      color: #0050e5;
    }
    .brand-icon {
      font-size: 16px;
    }
    .email-date-mock {
      font-size: 11px;
      color: #94a3b8;
    }
    .email-mockup-body {
      padding: 20px;
      background: #ffffff;
    }
    .mock-heading {
      font-size: 16px;
      font-weight: 800;
      margin: 0 0 10px;
      color: #0f172a;
    }
    .mock-intro {
      font-size: 12.5px;
      color: #334155;
      line-height: 1.5;
      margin: 0 0 12px;
    }
    .mock-role-pill {
      font-size: 11px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      display: inline-block;
    }
    .mock-quote-box {
      background: #f8fafc;
      border-left: 3px solid #0050e5;
      padding: 8px 12px;
      font-style: italic;
      color: #475569;
      font-size: 12px;
      margin: 10px 0;
      border-radius: 0 6px 6px 0;
    }
    .mock-cta-wrap {
      text-align: center;
      margin: 18px 0;
    }
    .mock-btn-cta {
      background: #0050e5;
      color: #ffffff;
      padding: 10px 22px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      display: inline-block;
      box-shadow: 0 4px 6px -1px rgba(0, 80, 229, 0.2);
    }
    .mock-footer-note {
      font-size: 11px;
      color: #94a3b8;
      border-top: 1px solid #f1f5f9;
      padding-top: 10px;
      margin: 0;
      line-height: 1.4;
    }

    /* Buttons */
    .btn {
      padding: 10px 20px;
      font-size: 13px;
      font-weight: 600;
      border-radius: 8px;
      border: 1px solid transparent;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.15s;
      text-decoration: none;
    }
    .btn-outline {
      background: #ffffff;
      border-color: #cbd5e1;
      color: #475569;
    }
    .btn-outline:hover:not(:disabled) {
      background: #f8fafc;
      border-color: #94a3b8;
    }
    .btn-primary {
      background: #0050e5;
      color: #ffffff;
    }
    .btn-primary:hover:not(:disabled) {
      background: #0040b3;
    }
    .btn:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }
    .action-buttons-wrap {
      display: flex;
      gap: 10px;
    }

    /* Success Card */
    .success-dispatch-card {
      background: #ffffff;
      border: 1px solid #10b981;
      border-radius: 16px;
      padding: 32px;
      display: flex;
      gap: 24px;
      box-shadow: 0 10px 25px rgba(16, 185, 129, 0.08);
      margin-bottom: 24px;
    }
    .success-icon-wrap {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      background: rgba(16, 185, 129, 0.12);
      color: #10b981;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .success-icon-wrap .material-symbols-outlined {
      font-size: 32px;
    }
    .success-content {
      flex: 1;
    }
    .success-content h3 {
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 6px;
    }
    .success-content p {
      font-size: 13.5px;
      color: #475569;
      line-height: 1.5;
      margin: 0 0 16px;
    }
    .link-copy-box {
      display: flex;
      gap: 8px;
      margin-bottom: 20px;
    }
    .link-input {
      flex: 1;
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      border-radius: 8px;
      padding: 10px 14px;
      font-size: 13px;
      color: #0f172a;
      font-family: monospace;
      outline: none;
    }
    .btn-copy {
      flex-shrink: 0;
    }
    .success-actions {
      display: flex;
      gap: 12px;
    }

    .spin-icon {
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .animate-fade {
      animation: fadeIn 0.25s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class IdentityInvitationCreateComponent implements OnInit {
  isSending = false;
  hasCopied = false;
  today = new Date();

  // Enums for template usage
  readonly RoleGroup = RoleGroup;
  readonly ActionRoleType = ActionRoleType;

  // Form State
  inviteEmail = '';
  selectedCategoryId: string | null = null;
  expirationDays = 7;
  customMessage = '';

  // Role & Group State
  activeGroupFilter: RoleGroup | 'All' = 'All';
  selectedRole = 'User Manager';
  selectedActionRole: ActionRoleType | null = ActionRoleType.FeatureEditor;
  selectedFeatureArea: string | null = 'UserManager';

  // Loaded Data
  userCategories: any[] = [];

  // Dispatched Result State
  dispatchedLink = '';
  dispatchedEmail = '';
  dispatchedRole = '';

  /** Available Primary Authority Roles (Categorized via RoleGroup Enum) */
  availableRoles: AvailableRole[] = [
    // GROUP 1: System & Workspace Governance
    {
      name: 'Admin',
      group: RoleGroup.System,
      tier: 'System Governance',
      badgeClass: 'badge-admin',
      icon: 'admin_panel_settings',
      summary: 'Broad governance across members, operations, CMS entities, and workspace settings.',
      defaultActionRole: ActionRoleType.GlobalEditor,
      allowedActions: [
        'Full CRUD governance across all workspace modules',
        'Manage organizational users, categories, and rosters',
        'Review security login audit trails and challenges',
        'Manage tenant configuration and workspace branding'
      ],
      restrictedActions: [
        'Root account authority strictly reserved for SuperAdmin',
        'Cannot unbind tenant primary database connection'
      ]
    },
    {
      name: 'Member',
      group: RoleGroup.System,
      tier: 'Standard Member',
      badgeClass: 'badge-member',
      icon: 'badge',
      summary: 'Standard member directory presence and authenticated user workspace portal access.',
      defaultActionRole: undefined,
      allowedActions: [
        'Access authenticated user workspace portal apps and personal dashboard',
        'Update personal profile details and 2FA credentials',
        'Participate in permitted member discussion channels'
      ],
      restrictedActions: [
        'Zero access to Administration Console',
        'Cannot inspect or modify other members private records'
      ]
    },

    // GROUP 2: Modular Feature Authority Roles (Active 2 Roles)
    {
      name: 'User Manager',
      group: RoleGroup.Feature,
      featureAreaKey: 'UserManager',
      tier: 'Domain Authority',
      badgeClass: 'badge-user',
      icon: 'manage_accounts',
      summary: 'Full governance of user accounts, directory categories, and status transitions.',
      defaultActionRole: ActionRoleType.FeatureEditor,
      allowedActions: [
        'Create, edit, suspend, and archive user profiles',
        'Manage member categories and custom tags',
        'Export member directory rosters'
      ],
      restrictedActions: [
        'Cannot grant system roles to other users',
        'Read-only access in other workspace areas'
      ]
    },
    {
      name: 'Identity Manager',
      group: RoleGroup.Feature,
      featureAreaKey: 'IdentityManager',
      tier: 'Security Authority',
      badgeClass: 'badge-identity',
      icon: 'security',
      summary: 'Dedicated authority to provision roles, enforce policies, and issue invitations.',
      defaultActionRole: ActionRoleType.FeatureEditor,
      allowedActions: [
        'Issue cryptographic onboarding invitations',
        'Assign and revoke feature authority roles',
        'Audit access logs and security challenges'
      ],
      restrictedActions: [
        'Cannot modify platform billing or subscriptions',
        'Cannot assign the SuperAdmin root role'
      ]
    }
  ];

  /** Operational Action Role Options for Card 2 */
  actionRoleOptions: ActionRoleOption[] = [
    {
      key: ActionRoleType.GlobalEditor,
      title: 'Global Editor',
      badge: 'Tenant-Wide Edit',
      badgeClass: 'badge-global',
      icon: 'public',
      summary: 'Full CRUD privileges across all features, modules, and directories throughout the workspace.',
      detailNote: 'Unrestricted operational authority across all current and future modules in this workspace.'
    },
    {
      key: ActionRoleType.FeatureEditor,
      title: 'Feature Editor',
      badge: 'Modular Scope',
      badgeClass: 'badge-feature',
      icon: 'tune',
      summary: 'Targeted edit and authoring privileges strictly confined to the assigned capability module.',
      detailNote: 'Editing permissions are isolated to the designated module; other workspace areas remain read-only.'
    },
    {
      key: ActionRoleType.Readonly,
      title: 'Read Only',
      badge: 'Observer Level',
      badgeClass: 'badge-readonly',
      icon: 'visibility',
      summary: 'Inspection and auditing visibility across features without permission to create, edit, or delete records.',
      detailNote: 'All create, edit, update, and delete actions will be hidden and prohibited.'
    }
  ];

  /** Available Feature Capability Scopes for Feature Editor (Active 2 Modules) */
  featureScopeOptions: FeatureScopeOption[] = [
    {
      key: 'UserManager',
      label: 'User Directory & Profiles',
      icon: 'manage_accounts',
      description: 'Authoring and governance of member records, categories, and account statuses.',
      permittedAreas: ['Member Profiles', 'User Categories', 'Member Rosters']
    },
    {
      key: 'IdentityManager',
      label: 'Identity & Access Control',
      icon: 'security',
      description: 'Issuing onboarding invitations, role delegations, and security policies.',
      permittedAreas: ['Onboarding Invitations', 'Role Assignments', 'Security Policies']
    }
  ];

  headerButtons: PageHeaderButton[] = [
    {
      text: 'View Registry',
      icon: 'format_list_bulleted',
      routerLink: '/identity/console/invitations'
    }
  ];

  constructor(
    private api: ApiService,
    private toast: ToastService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadUserCategories();
  }

  /**
   * Retrieves active member categories for optional pre-assignment.
   */
  private loadUserCategories(): void {
    this.api.get<any>('UsersApi/categories').subscribe({
      next: (res) => {
        this.userCategories = res?.data || [];
      },
      error: () => {}
    });
  }

  /**
   * Returns roles filtered by System Governance.
   */
  get systemRoles(): AvailableRole[] {
    return this.availableRoles.filter(r => r.group === RoleGroup.System);
  }

  /**
   * Returns roles filtered by Modular Feature Authority.
   */
  get featureRoles(): AvailableRole[] {
    return this.availableRoles.filter(r => r.group === RoleGroup.Feature);
  }

  /**
   * Returns the currently selected role definition.
   */
  get currentRoleObj(): AvailableRole | undefined {
    return this.availableRoles.find(r => r.name === this.selectedRole);
  }

  /**
   * Checks form completeness before allowing dispatch.
   */
  get isFormValid(): boolean {
    if (!this.inviteEmail || !this.inviteEmail.includes('@') || !this.inviteEmail.includes('.')) {
      return false;
    }
    if (this.selectedRole !== 'Member' && this.selectedActionRole === ActionRoleType.FeatureEditor && !this.selectedFeatureArea) {
      return false;
    }
    return true;
  }

  /**
   * Selects a primary authority role and triggers automatic selection in Card 2.
   * - Admin -> Automatically selects Global Editor.
   * - Member -> Standard member workspace portal access (no action role, no readonly).
   * - Feature Authority -> Automatically selects Feature Editor and binds to that module.
   * @param role Target role item.
   */
  selectRole(role: AvailableRole): void {
    this.selectedRole = role.name;

    // Automatic Interplay:
    if (role.name === 'Admin') {
      this.selectedActionRole = ActionRoleType.GlobalEditor;
      this.selectedFeatureArea = null;
    } else if (role.name === 'Member') {
      // Member is strictly a member with their own dashboard; no action role or readonly attached.
      this.selectedActionRole = null;
      this.selectedFeatureArea = null;
    } else {
      // Feature Authority Role
      this.selectedActionRole = ActionRoleType.FeatureEditor;
      this.selectedFeatureArea = role.featureAreaKey || 'UserManager';
    }

    this.onFormChange();
  }

  /**
   * Manually selects or adjusts the operational action role in Card 2.
   * @param action Target action role option.
   */
  selectActionRole(action: ActionRoleOption): void {
    this.selectedActionRole = action.key;
    if (action.key === ActionRoleType.FeatureEditor && !this.selectedFeatureArea) {
      this.selectedFeatureArea = this.currentRoleObj?.featureAreaKey || 'UserManager';
    }
    this.onFormChange();
  }

  /**
   * Selects a specific feature capability scope domain.
   * @param scope Target feature scope option.
   */
  selectFeatureScope(scope: FeatureScopeOption): void {
    this.selectedFeatureArea = scope.key;
    // Align role with chosen scope if current role is a feature authority
    if (this.currentRoleObj?.group === RoleGroup.Feature) {
      const matchingRole = this.availableRoles.find(r => r.featureAreaKey === scope.key);
      if (matchingRole) {
        this.selectedRole = matchingRole.name;
      }
    }
    this.onFormChange();
  }

  /**
   * Determines whether the given action role was auto-assigned by the active role.
   * @param key Action role type.
   */
  isAutoAssigned(key: ActionRoleType): boolean {
    if (this.selectedRole === 'Admin') return key === ActionRoleType.GlobalEditor;
    if (this.selectedRole === 'Member') return false;
    return key === ActionRoleType.FeatureEditor;
  }

  /**
   * Returns human-readable label for selected action role.
   */
  getSelectedActionRoleLabel(): string {
    if (this.selectedRole === 'Member') {
      return 'Member Portal Dashboard';
    }
    const act = this.actionRoleOptions.find(a => a.key === this.selectedActionRole);
    return act ? act.title : 'Feature Editor';
  }

  /**
   * Returns badge CSS class for active action role.
   */
  getActionBadgeClass(): string {
    if (this.selectedRole === 'Member') {
      return 'badge-member';
    }
    switch (this.selectedActionRole) {
      case ActionRoleType.GlobalEditor: return 'badge-global';
      case ActionRoleType.FeatureEditor: return 'badge-feature';
      case ActionRoleType.Readonly: return 'badge-readonly';
      default: return 'badge-member';
    }
  }

  /**
   * Returns material icon for active action role.
   */
  getActionIcon(): string {
    if (this.selectedRole === 'Member') {
      return 'dashboard';
    }
    switch (this.selectedActionRole) {
      case ActionRoleType.GlobalEditor: return 'public';
      case ActionRoleType.FeatureEditor: return 'tune';
      case ActionRoleType.Readonly: return 'visibility';
      default: return 'dashboard';
    }
  }

  /**
   * Returns human-readable label for selected capability scope.
   */
  getSelectedScopeLabel(): string {
    const scope = this.featureScopeOptions.find(s => s.key === this.selectedFeatureArea);
    return scope ? scope.label : (this.selectedFeatureArea || 'General Workspace');
  }

  /**
   * Returns human-readable label for selected member category.
   */
  getSelectedCategoryName(): string {
    if (!this.selectedCategoryId) return 'Standard Member';
    const cat = this.userCategories.find(c => c.id === this.selectedCategoryId);
    return cat ? cat.name : 'Custom Category';
  }

  onFormChange(): void {
    this.hasCopied = false;
  }

  /**
   * Submits the invitation creation payload to the backend API.
   */
  dispatchInvitation(): void {
    if (!this.isFormValid) {
      this.toast.warning('Please enter a valid recipient email address.');
      return;
    }

    this.isSending = true;
    const isMember = this.selectedRole === 'Member';
    const payload = {
      email: this.inviteEmail.trim(),
      role: this.selectedRole,
      actionRole: isMember ? null : this.selectedActionRole,
      featureArea: (!isMember && this.selectedActionRole === ActionRoleType.FeatureEditor) ? this.selectedFeatureArea : null,
      categoryId: this.selectedCategoryId,
      expirationDays: this.expirationDays,
      customMessage: this.customMessage?.trim() || null
    };

    this.api.post<any>('IdentityApi/invitations', payload).subscribe({
      next: (res) => {
        this.isSending = false;
        const data = res?.data;
        this.dispatchedLink = data?.invitationUrl || '';
        this.dispatchedEmail = this.inviteEmail;
        this.dispatchedRole = isMember ? 'Member' : `${this.selectedRole} (${this.getSelectedActionRoleLabel()})`;
        this.toast.success(`Invitation dispatched successfully to ${this.inviteEmail}!`, 'Invitation Sent');
      },
      error: (err) => {
        this.isSending = false;
        this.toast.error(err?.error?.message || 'Failed to dispatch onboarding invitation.', 'Invitation Error');
      }
    });
  }

  /**
   * Copies the direct onboarding URL to the system clipboard.
   * @param input HTMLInputElement containing the link string.
   */
  copyLink(input: HTMLInputElement): void {
    input.select();
    navigator.clipboard.writeText(input.value).then(() => {
      this.hasCopied = true;
      this.toast.success('Direct onboarding link copied to clipboard!');
      setTimeout(() => { this.hasCopied = false; }, 3000);
    });
  }

  /**
   * Resets the form state to issue another invitation.
   */
  resetForm(): void {
    this.dispatchedLink = '';
    this.dispatchedEmail = '';
    this.dispatchedRole = '';
    this.inviteEmail = '';
    this.customMessage = '';
    this.hasCopied = false;
  }
}
