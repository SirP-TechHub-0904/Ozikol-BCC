import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent, PageHeaderButton } from '../../../shared/components/page-header/page-header.component';

/**
 * Interface representing a selectable system or operational role with security governance details.
 */
interface AvailableRole {
  name: string;
  tier: string;
  badgeClass: string;
  icon: string;
  summary: string;
  requiresFeatureScope?: boolean;
  allowedActions: string[];
  restrictedActions: string[];
}

/**
 * Interface representing a modular capability domain for Feature Editor scoping.
 */
interface FeatureScopeOption {
  key: string;
  label: string;
  icon: string;
  description: string;
  permittedAreas: string[];
}

/**
 * Component providing a dedicated administrative page for issuing workspace onboarding invitations.
 * Allows administrators to pre-assign system roles, configure granular feature capability edit scopes,
 * inspect a real-time reactive email simulation, and generate direct invitation tokens.
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
            You can also copy the direct registration link below to share directly via WhatsApp, Slack, Teams, or SMS:
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
          <!-- CARD 1: Recipient Identity & Organization Details -->
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

          <!-- CARD 2: Pre-Assigned System & Operational Role Selection -->
          <section class="console-card mt-4">
            <div class="card-head">
              <div class="card-head-title">
                <span class="material-symbols-outlined text-purple">verified_user</span>
                <div>
                  <h3 class="card-title">Pre-Assigned Authority Role</h3>
                  <p class="card-subtitle">Choose the governance tier or operational access level to provision upon account registration.</p>
                </div>
              </div>
            </div>

            <div class="card-body">
              <div class="roles-selection-grid">
                <div
                  *ngFor="let role of availableRoles"
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
                  <div class="role-radio-indicator">
                    <span class="material-symbols-outlined" *ngIf="selectedRole === role.name">check_circle</span>
                    <span class="material-symbols-outlined text-muted" *ngIf="selectedRole !== role.name">radio_button_unchecked</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- CARD 3: Modular Capability Edit Scope (Dynamic End Column / Section) -->
          <section
            class="console-card mt-4 animate-fade"
            *ngIf="currentRoleObj?.requiresFeatureScope"
          >
            <div class="card-head">
              <div class="card-head-title">
                <span class="material-symbols-outlined text-emerald">tune</span>
                <div>
                  <h3 class="card-title">Modular Capability Edit Access Scope</h3>
                  <p class="card-subtitle">Select the specific workspace domain this user will be granted write and editor permissions for.</p>
                </div>
              </div>
              <span class="scope-highlight-badge">Modular Scope Required</span>
            </div>

            <div class="card-body">
              <div class="scope-selector-grid">
                <div
                  *ngFor="let scope of featureScopeOptions"
                  class="scope-option-card"
                  [class.active]="selectedFeatureArea === scope.key"
                  (click)="selectedFeatureArea = scope.key"
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
                  <strong>Capability Isolation:</strong> Personnel assigned to <strong>{{ getSelectedScopeLabel() }}</strong> can only author, edit, and publish records within this designated module. They will hold standard read-only access in other workspace areas.
                </p>
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
                  <div class="live-role-tier">{{ currentRoleObj?.tier || 'Operational Level' }}</div>
                </div>
              </div>

              <!-- Scope Detail if Feature Editor -->
              <div *ngIf="currentRoleObj?.requiresFeatureScope" class="live-scope-banner mt-3">
                <span class="material-symbols-outlined">tune</span>
                <div>
                  <strong>Assigned Capability Scope:</strong>
                  <span>{{ getSelectedScopeLabel() }}</span>
                </div>
              </div>

              <!-- Allowed Actions -->
              <div class="permissions-list mt-3">
                <div class="perm-title text-good">
                  <span class="material-symbols-outlined">check_circle</span>
                  <span>Permitted Capabilities</span>
                </div>
                <ul class="perm-items">
                  <li *ngFor="let act of currentRoleObj?.allowedActions">
                    {{ act }}
                  </li>
                </ul>
              </div>

              <!-- Restricted Actions -->
              <div class="permissions-list mt-3">
                <div class="perm-title text-warn">
                  <span class="material-symbols-outlined">block</span>
                  <span>Restricted Boundaries</span>
                </div>
                <ul class="perm-items restricted">
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
                    <span *ngIf="currentRoleObj?.requiresFeatureScope">
                      with capability scope for <strong>{{ getSelectedScopeLabel() }}</strong>
                    </span>.
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
    }
    .card-head-title {
      display: flex;
      align-items: flex-start;
      gap: 12px;
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
    .text-good { color: #16a34a; }
    .text-warn { color: #d97706; }
    .text-muted { color: #cbd5e1; }

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
    .role-radio-indicator {
      display: flex;
      justify-content: flex-end;
    }
    .role-radio-indicator .material-symbols-outlined {
      font-size: 18px;
      color: #0050e5;
    }

    /* Badges */
    .badge-admin { background: rgba(0, 80, 229, 0.12); color: #0050e5; }
    .badge-identity { background: rgba(139, 92, 246, 0.12); color: #8b5cf6; }
    .badge-user { background: rgba(14, 165, 233, 0.12); color: #0284c7; }
    .badge-editor { background: rgba(16, 185, 129, 0.12); color: #10b981; }
    .badge-member { background: rgba(100, 116, 139, 0.12); color: #475569; }
    .badge-readonly { background: rgba(245, 158, 11, 0.12); color: #d97706; }

    /* Feature Scope Section */
    .scope-highlight-badge {
      background: rgba(16, 185, 129, 0.12);
      color: #10b981;
      font-size: 11px;
      font-weight: 700;
      padding: 4px 8px;
      border-radius: 6px;
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
      background: rgba(16, 185, 129, 0.08);
      border: 1px solid rgba(16, 185, 129, 0.2);
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 12px;
      color: #065f46;
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
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
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
      padding: 20px 16px;
      background: #ffffff;
      margin: 12px;
      border-radius: 8px;
      border: 1px solid #eef2f6;
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

  // Form State
  inviteEmail = '';
  selectedCategoryId: string | null = null;
  expirationDays = 7;
  customMessage = '';
  selectedRole = 'Feature Editor';
  selectedFeatureArea = 'UserManager';

  // Loaded Data
  userCategories: any[] = [];

  // Dispatched Result State
  dispatchedLink = '';
  dispatchedEmail = '';
  dispatchedRole = '';

  /** Available System and Operational Roles for Pre-Assignment */
  availableRoles: AvailableRole[] = [
    {
      name: 'Admin',
      tier: 'System Authority',
      badgeClass: 'badge-admin',
      icon: 'admin_panel_settings',
      summary: 'Broad management across members, CMS entities, operations, and settings.',
      requiresFeatureScope: false,
      allowedActions: [
        'Manage organizational users and categories',
        'Edit and publish website CMS pages',
        'Review security login audit records',
        'Manage tenant configuration and branding'
      ],
      restrictedActions: [
        'Root account authority reserved for SuperAdmin',
        'Cannot unbind tenant primary database connection'
      ]
    },
    {
      name: 'Identity Manager',
      tier: 'System Authority',
      badgeClass: 'badge-identity',
      icon: 'security',
      summary: 'Dedicated authority to provision roles, enforce policies, and issue invitations.',
      requiresFeatureScope: false,
      allowedActions: [
        'Issue cryptographic onboarding invitations',
        'Assign and revoke feature authority roles',
        'Audit access logs and security challenges'
      ],
      restrictedActions: [
        'Cannot modify platform billing or subscriptions',
        'Cannot assign the SuperAdmin root role'
      ]
    },
    {
      name: 'User Manager',
      tier: 'Domain Authority',
      badgeClass: 'badge-user',
      icon: 'manage_accounts',
      summary: 'Full governance of user accounts, directory categories, and status transitions.',
      requiresFeatureScope: false,
      allowedActions: [
        'Create, edit, suspend, and archive user profiles',
        'Manage member categories and custom tags',
        'Export member directory rosters'
      ],
      restrictedActions: [
        'Cannot grant system roles to other users',
        'Cannot alter workspace security policies'
      ]
    },
    {
      name: 'Global Editor',
      tier: 'Operational Level',
      badgeClass: 'badge-editor',
      icon: 'edit_note',
      summary: 'Tenant-wide editing privileges across all content, store, and event entities.',
      requiresFeatureScope: false,
      allowedActions: [
        'Edit all CMS pages, posts, and media assets',
        'Manage product catalogs, orders, and tickets',
        'Author news bulletins and notifications'
      ],
      restrictedActions: [
        'Cannot manage user roles or access controls',
        'Cannot alter tenant identity policies'
      ]
    },
    {
      name: 'Feature Editor',
      tier: 'Modular Scope',
      badgeClass: 'badge-editor',
      icon: 'tune',
      summary: 'Targeted edit and authoring access strictly scoped to one specific capability.',
      requiresFeatureScope: true,
      allowedActions: [
        'Author and manage records within assigned capability',
        'Publish updates within designated module boundary',
        'View related operational telemetry'
      ],
      restrictedActions: [
        'Read-only access in other workspace modules',
        'Zero administrative or user management authority'
      ]
    },
    {
      name: 'Moderator',
      tier: 'Operational Level',
      badgeClass: 'badge-readonly',
      icon: 'gavel',
      summary: 'Community moderation, chat stream oversight, and ticket handling.',
      requiresFeatureScope: false,
      allowedActions: [
        'Moderate discussion channels and user forums',
        'Review and triage member support tickets',
        'Flag inappropriate member interactions'
      ],
      restrictedActions: [
        'Cannot modify workspace web pages or products',
        'Cannot view system audit logs'
      ]
    },
    {
      name: 'Member',
      tier: 'Standard Member',
      badgeClass: 'badge-member',
      icon: 'badge',
      summary: 'Standard directory presence and authenticated user workspace portal access.',
      requiresFeatureScope: false,
      allowedActions: [
        'Access authenticated user workspace apps',
        'Update personal profile details and 2FA credentials',
        'Interact with public and shared member spaces'
      ],
      restrictedActions: [
        'Zero access to Administration Console',
        'Cannot view other members private metadata'
      ]
    },
    {
      name: 'Read Only',
      tier: 'Observer Level',
      badgeClass: 'badge-readonly',
      icon: 'visibility',
      summary: 'Full inspection and auditing visibility across features without edit rights.',
      requiresFeatureScope: false,
      allowedActions: [
        'Inspect operational dashboards and reports',
        'View audit logs and system analytics',
        'Export read-only summary reports'
      ],
      restrictedActions: [
        'Strictly prohibited from modifying any records',
        'Cannot delete, edit, or dispatch invites'
      ]
    }
  ];

  /** Available Feature Capability Scopes for Feature Editor */
  featureScopeOptions: FeatureScopeOption[] = [
    {
      key: 'UserManager',
      label: 'User Directory & Profiles',
      icon: 'group',
      description: 'Authoring and management of member records, categories, and account statuses.',
      permittedAreas: ['Member Profiles', 'User Categories', 'Member Rosters']
    },
    {
      key: 'ContentManager',
      label: 'Website CMS & Blog Studio',
      icon: 'web',
      description: 'Creating, updating, and publishing public web pages, articles, and media.',
      permittedAreas: ['CMS Web Pages', 'Blog Posts & Tags', 'Media Library']
    },
    {
      key: 'CommerceManager',
      label: 'Commerce & Product Catalog',
      icon: 'shopping_bag',
      description: 'Inventory management, product definitions, and customer order processing.',
      permittedAreas: ['Product Catalog', 'Orders & Shipping', 'Discounts & SKUs']
    },
    {
      key: 'CrmManager',
      label: 'Member CRM & Relationships',
      icon: 'contact_page',
      description: 'Lead engagement, relationship stages, communication logs, and customer CRM.',
      permittedAreas: ['CRM Contacts', 'Pipeline Stages', 'Interaction Logs']
    },
    {
      key: 'BillingManager',
      label: 'Invoicing & Plan Subscriptions',
      icon: 'payments',
      description: 'Managing invoices, subscription tiers, payment receipts, and billing items.',
      permittedAreas: ['Invoice Records', 'Subscription Plans', 'Payment Statuses']
    },
    {
      key: 'SettingsManager',
      label: 'Workspace Settings & Branding',
      icon: 'settings',
      description: 'Customizing brand assets, site header, footer, contact channels, and UI theme.',
      permittedAreas: ['Brand Assets', 'Site Information', 'Navigation Menus']
    },
    {
      key: 'FormsManager',
      label: 'Custom Intake & Survey Forms',
      icon: 'dynamic_form',
      description: 'Designing custom submission forms, survey questionnaires, and responses.',
      permittedAreas: ['Form Builder', 'Inquiry Submissions', 'Survey Analytics']
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
    if (this.currentRoleObj?.requiresFeatureScope && !this.selectedFeatureArea) {
      return false;
    }
    return true;
  }

  /**
   * Selects an authority or operational role.
   * @param role Target role item.
   */
  selectRole(role: AvailableRole): void {
    this.selectedRole = role.name;
    if (role.requiresFeatureScope && !this.selectedFeatureArea) {
      this.selectedFeatureArea = 'UserManager';
    }
  }

  /**
   * Returns human-readable label for selected capability scope.
   */
  getSelectedScopeLabel(): string {
    const scope = this.featureScopeOptions.find(s => s.key === this.selectedFeatureArea);
    return scope ? scope.label : this.selectedFeatureArea;
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
    const payload = {
      email: this.inviteEmail.trim(),
      role: this.selectedRole,
      categoryId: this.selectedCategoryId,
      expirationDays: this.expirationDays,
      featureArea: this.currentRoleObj?.requiresFeatureScope ? this.selectedFeatureArea : null,
      customMessage: this.customMessage?.trim() || null
    };

    this.api.post<any>('IdentityApi/invitations', payload).subscribe({
      next: (res) => {
        this.isSending = false;
        const data = res?.data;
        this.dispatchedLink = data?.invitationUrl || '';
        this.dispatchedEmail = this.inviteEmail;
        this.dispatchedRole = this.selectedRole;
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
