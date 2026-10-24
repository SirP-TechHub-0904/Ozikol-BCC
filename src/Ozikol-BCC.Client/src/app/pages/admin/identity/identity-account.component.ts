import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { parseUserAgent, formatClientIpAddress } from '../../../core/utils/user-agent.util';

/**
 * Interface representing an active logged-in device session.
 */
interface ActiveSessionItem {
  sessionId: string;
  device: string;
  browser: string;
  browserName?: string;
  clientType?: string;
  operatingSystem?: string;
  deviceType?: string;
  icon?: string;
  rawDevice?: string;
  ipAddress: string;
  lastActive: string;
  isCurrent: boolean;
  isTrusted?: boolean;
  createdAt?: string;
}

/**
 * Interface representing a security login audit log record.
 */
interface LoginAuditItem {
  id: string;
  email: string;
  actionType?: string;
  status: string;
  description?: string;
  module?: string;
  ipAddress: string;
  userAgent: string;
  device?: string;
  browser?: string;
  browserName?: string;
  clientType?: string;
  icon?: string;
  isTrusted?: boolean;
  date?: string;
  timestamp: string;
}

/**
 * Interface representing user account summary details.
 */
interface AccountSummary {
  id?: string;
  email?: string;
  userName?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  designation?: string;
  twoFactorEnabled?: boolean;
  provider?: string;
  lastLogin?: string;
  roles?: string[];
  activeSessionsCount?: number;
  mustChangePassword?: boolean;
}

/**
 * Component providing unified account management and security governance under Identity & Access Manager.
 * Supports credential updates, two-factor authentication, active device sessions, and login audit tracking.
 */
@Component({
  selector: 'app-identity-account',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslatePipe],
  template: `
    <div class="account-container">
      <!-- Page Header -->
      <div class="account-header">
        <div class="header-left">
          <div class="header-icon-wrap">
            <span class="material-symbols-outlined header-icon">manage_accounts</span>
          </div>
          <div>
            <h1 class="page-title">{{ 'account.title' | translate }}</h1>
            <p class="page-sub">{{ 'account.subtitle' | translate }}</p>
          </div>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="tab-navigation-bar">
        <button
          type="button"
          class="tab-btn"
          [class.active]="activeTab === 'password'"
          (click)="selectTab('password')">
          <span class="material-symbols-outlined tab-icon">key</span>
          <span>{{ 'account.tab_password' | translate }}</span>
        </button>

        <button
          type="button"
          class="tab-btn"
          [class.active]="activeTab === '2fa'"
          (click)="selectTab('2fa')">
          <span class="material-symbols-outlined tab-icon">shield_lock</span>
          <span>{{ 'account.tab_2fa' | translate }}</span>
          <span class="tab-badge" [class.badge-good]="mfaEnabled" [class.badge-warn]="!mfaEnabled">
            {{ mfaEnabled ? ('account.status_enforced' | translate) : ('account.status_disabled' | translate) }}
          </span>
        </button>

        <button
          type="button"
          class="tab-btn"
          [class.active]="activeTab === 'devices'"
          (click)="selectTab('devices')">
          <span class="material-symbols-outlined tab-icon">devices</span>
          <span>{{ 'account.tab_devices' | translate }}</span>
          <span class="tab-counter" *ngIf="sessions.length > 0">{{ sessions.length }}</span>
        </button>

        <button
          type="button"
          class="tab-btn"
          [class.active]="activeTab === 'activity'"
          (click)="selectTab('activity')">
          <span class="material-symbols-outlined tab-icon">history</span>
          <span>{{ 'account.tab_activity' | translate }}</span>
        </button>

        <button
          type="button"
          class="tab-btn"
          [class.active]="activeTab === 'roles'"
          (click)="selectTab('roles')">
          <span class="material-symbols-outlined tab-icon">verified_user</span>
          <span>{{ 'account.tab_roles' | translate }}</span>
        </button>
      </div>

      <!-- Tab Content Area -->
      <div class="tab-content-wrapper">

        <!-- TAB 1: CHANGE PASSWORD -->
        <section class="card-section animate-fade" *ngIf="activeTab === 'password'">
          <div class="section-card-head">
            <div class="card-title-group">
              <span class="material-symbols-outlined head-icon text-primary">key</span>
              <div>
                <h2 class="card-title">{{ 'nav.change_password' | translate }}</h2>
                <p class="card-desc">Update your administrator password regularly to maintain workspace security.</p>
              </div>
            </div>
            <div class="info-tooltip-badge" title="Password must contain at least 8 characters with upper, lower, numbers, and symbols.">
              <span class="material-symbols-outlined">info</span>
            </div>
          </div>

          <div class="card-body">
            <form (ngSubmit)="changePassword()" class="account-form">
              <div class="form-group">
                <label>{{ 'account.current_password' | translate }}</label>
                <div class="password-input-wrap">
                  <input
                    [type]="showCurrent ? 'text' : 'password'"
                    [(ngModel)]="oldPassword"
                    name="oldPassword"
                    required
                    placeholder="Enter current password"
                    class="form-input" />
                  <button type="button" class="eye-btn" (click)="showCurrent = !showCurrent" aria-label="Toggle password visibility">
                    <span class="material-symbols-outlined">{{ showCurrent ? 'visibility_off' : 'visibility' }}</span>
                  </button>
                </div>
              </div>

              <div class="form-group">
                <label>{{ 'account.new_password' | translate }}</label>
                <div class="password-input-wrap">
                  <input
                    [type]="showNew ? 'text' : 'password'"
                    [(ngModel)]="newPassword"
                    name="newPassword"
                    (input)="evaluateComplexity()"
                    required
                    placeholder="Enter new strong password"
                    class="form-input" />
                  <button type="button" class="eye-btn" (click)="showNew = !showNew" aria-label="Toggle password visibility">
                    <span class="material-symbols-outlined">{{ showNew ? 'visibility_off' : 'visibility' }}</span>
                  </button>
                </div>
              </div>

              <!-- Password Complexity Checklist -->
              <div class="complexity-checklist">
                <div class="checklist-title">{{ 'account.password_requirements' | translate }}:</div>
                <div class="pill-grid">
                  <div class="rule-pill" [class.passed]="hasMinLength">
                    <span class="material-symbols-outlined">{{ hasMinLength ? 'check_circle' : 'radio_button_unchecked' }}</span>
                    <span>8+ Chars</span>
                  </div>
                  <div class="rule-pill" [class.passed]="hasUpper">
                    <span class="material-symbols-outlined">{{ hasUpper ? 'check_circle' : 'radio_button_unchecked' }}</span>
                    <span>Uppercase (A-Z)</span>
                  </div>
                  <div class="rule-pill" [class.passed]="hasLower">
                    <span class="material-symbols-outlined">{{ hasLower ? 'check_circle' : 'radio_button_unchecked' }}</span>
                    <span>Lowercase (a-z)</span>
                  </div>
                  <div class="rule-pill" [class.passed]="hasNumber">
                    <span class="material-symbols-outlined">{{ hasNumber ? 'check_circle' : 'radio_button_unchecked' }}</span>
                    <span>Number (0-9)</span>
                  </div>
                  <div class="rule-pill" [class.passed]="hasSpecial">
                    <span class="material-symbols-outlined">{{ hasSpecial ? 'check_circle' : 'radio_button_unchecked' }}</span>
                    <span>Special (!&#64;#$)</span>
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label>{{ 'account.confirm_password' | translate }}</label>
                <input
                  type="password"
                  [(ngModel)]="confirmPassword"
                  name="confirmPassword"
                  required
                  placeholder="Re-enter new password"
                  class="form-input" />
              </div>

              <div class="checkbox-option">
                <label class="checkbox-label">
                  <input type="checkbox" [(ngModel)]="signOutOtherSessions" name="signOutOtherSessions" />
                  <span>Sign out of all other devices and active browser sessions upon password update</span>
                </label>
              </div>

              <div class="form-actions">
                <button
                  type="submit"
                  [disabled]="savingPassword || !isComplexitySatisfied()"
                  class="btn-primary">
                  <span class="material-symbols-outlined">{{ savingPassword ? 'hourglass_top' : 'lock_reset' }}</span>
                  <span>{{ savingPassword ? 'Updating Password...' : ('account.update_password' | translate) }}</span>
                </button>
              </div>
            </form>
          </div>
        </section>

        <!-- TAB 2: 2FA SECURITY -->
        <section class="card-section animate-fade" *ngIf="activeTab === '2fa'">
          <div class="section-card-head">
            <div class="card-title-group">
              <span class="material-symbols-outlined head-icon text-primary">shield_lock</span>
              <div>
                <h2 class="card-title">{{ 'nav.mfa_security' | translate }}</h2>
                <p class="card-desc">Enhance workspace defense with multi-factor verification passcodes on each sign-in.</p>
              </div>
            </div>
            <span class="status-pill" [class.good]="mfaEnabled" [class.danger]="!mfaEnabled">
              {{ mfaEnabled ? ('account.status_enforced' | translate) : ('account.status_disabled' | translate) }}
            </span>
          </div>

          <div class="card-body">
            <!-- Idle Selection View -->
            <div class="mfa-selection-group" *ngIf="setupStep === 'idle'">
              <div
                class="mfa-option-row"
                [class.selected]="selectedProvider === 'None'"
                (click)="selectedProvider = 'None'">
                <input type="radio" name="mfaOpt" [value]="'None'" [(ngModel)]="selectedProvider" />
                <div class="mfa-opt-meta">
                  <div class="mfa-opt-title">No Two-Factor (Disabled)</div>
                  <div class="mfa-opt-desc">Authenticate using password only. Not recommended for administrative accounts.</div>
                </div>
              </div>

              <div
                class="mfa-option-row"
                [class.selected]="selectedProvider === 'GoogleAuthenticator'"
                (click)="selectedProvider = 'GoogleAuthenticator'">
                <input type="radio" name="mfaOpt" [value]="'GoogleAuthenticator'" [(ngModel)]="selectedProvider" />
                <div class="mfa-opt-meta">
                  <div class="mfa-opt-title">Google Authenticator</div>
                  <div class="mfa-opt-desc">Receive rotating 6-digit TOTP codes via Google Authenticator mobile app.</div>
                </div>
              </div>

              <div
                class="mfa-option-row"
                [class.selected]="selectedProvider === 'MicrosoftAuthenticator'"
                (click)="selectedProvider = 'MicrosoftAuthenticator'">
                <input type="radio" name="mfaOpt" [value]="'MicrosoftAuthenticator'" [(ngModel)]="selectedProvider" />
                <div class="mfa-opt-meta">
                  <div class="mfa-opt-title">Microsoft Authenticator</div>
                  <div class="mfa-opt-desc">Receive rotating 6-digit TOTP codes via Microsoft Authenticator app.</div>
                </div>
              </div>

              <div
                class="mfa-option-row"
                [class.selected]="selectedProvider === 'Email'"
                (click)="selectedProvider = 'Email'">
                <input type="radio" name="mfaOpt" [value]="'Email'" [(ngModel)]="selectedProvider" />
                <div class="mfa-opt-meta">
                  <div class="mfa-opt-title">Email Verification Code</div>
                  <div class="mfa-opt-desc">Receive a 6-digit single-use passcode dispatched to your verified email address.</div>
                </div>
              </div>

              <div
                class="mfa-option-row"
                [class.selected]="selectedProvider === 'SMS'"
                (click)="selectedProvider = 'SMS'">
                <input type="radio" name="mfaOpt" [value]="'SMS'" [(ngModel)]="selectedProvider" />
                <div class="mfa-opt-meta">
                  <div class="mfa-opt-title">SMS Verification Code</div>
                  <div class="mfa-opt-desc">Receive a 6-digit single-use passcode sent via SMS text to your registered mobile phone.</div>
                </div>
              </div>

              <div class="mfa-action-btn-wrap">
                <button
                  type="button"
                  class="btn-primary"
                  (click)="startMfaSetup()"
                  [disabled]="isConfiguring || selectedProvider === currentProvider">
                  <span class="material-symbols-outlined" *ngIf="!isConfiguring">tune</span>
                  <span>{{ selectedProvider === 'None' ? 'Disable 2FA' : 'Configure Method' }}</span>
                </button>
              </div>
            </div>

            <!-- Setup Challenge Step -->
            <div class="mfa-setup-challenge" *ngIf="setupStep === 'setup'">
              <div class="challenge-alert">
                <span class="material-symbols-outlined">info</span>
                <span>Verification required to complete configuration.</span>
              </div>

              <div class="auth-setup-details" *ngIf="selectedProvider === 'GoogleAuthenticator' || selectedProvider === 'MicrosoftAuthenticator'">
                <p class="setup-instructions">Scan this QR barcode with your Authenticator app, or enter the secret key manually:</p>
                
                <div class="qr-container" *ngIf="qrCodeUrl">
                  <img [src]="getQrImageUrl()" alt="MFA QR Barcode" class="qr-code-img" />
                </div>

                <div class="secret-key-box" (click)="copySecretKey()" title="Click to copy secret key">
                  <code>{{ secretKey }}</code>
                  <span class="material-symbols-outlined copy-icon">content_copy</span>
                </div>
                <div class="qr-placeholder-text">
                  <small>Scan the barcode above or type the key directly into your Google/Microsoft app.</small>
                </div>
              </div>

              <div class="otp-setup-details" *ngIf="selectedProvider === 'Email' || selectedProvider === 'SMS'">
                <p class="setup-instructions">
                  We've sent a 6-digit verification code to your registered {{ selectedProvider === 'Email' ? 'email' : 'phone number' }}.
                </p>
              </div>

              <div class="form-group" style="margin-top: 16px;">
                <label>Enter 6-Digit Verification Code</label>
                <input
                  type="text"
                  [(ngModel)]="verificationCode"
                  placeholder="000000"
                  maxlength="6"
                  class="form-input code-input-field" />
              </div>

              <div class="challenge-actions">
                <button type="button" class="btn-secondary" (click)="cancelMfaSetup()">Cancel</button>
                <button
                  type="button"
                  class="btn-primary"
                  (click)="verifyMfaSetup()"
                  [disabled]="isVerifying || verificationCode.trim().length !== 6">
                  <span class="material-symbols-outlined" *ngIf="!isVerifying">verified</span>
                  <span>Verify & Enable</span>
                </button>
              </div>
            </div>

            <!-- Backup Recovery Codes Step -->
            <div class="mfa-verified-step" *ngIf="setupStep === 'verified'">
              <div class="success-header">
                <span class="material-symbols-outlined text-green" style="font-size: 32px;">verified</span>
                <h3>2FA Enabled Successfully!</h3>
              </div>
              <p class="backup-note">
                Save these 8 single-use recovery backup codes. If you lose your device, you can use these to regain access. Each code can only be used once.
              </p>

              <div class="backup-codes-grid">
                <div class="backup-code-item" *ngFor="let c of backupCodes"><code>{{ c }}</code></div>
              </div>

              <div class="verified-done-wrap">
                <button type="button" class="btn-secondary" (click)="copyBackupCodes()">
                  <span class="material-symbols-outlined">content_copy</span>
                  <span>Copy Codes</span>
                </button>
                <button type="button" class="btn-primary" (click)="finishMfaVerifiedFlow()">Done</button>
              </div>
            </div>
          </div>
        </section>

        <!-- TAB 3: MANAGE DEVICES -->
        <section class="card-section animate-fade" *ngIf="activeTab === 'devices'">
          <div class="section-card-head">
            <div class="card-title-group">
              <span class="material-symbols-outlined head-icon text-primary">devices</span>
              <div>
                <h2 class="card-title">{{ 'nav.manage_devices' | translate }}</h2>
                <p class="card-desc">Review and revoke active login sessions and trusted devices logged into your account.</p>
              </div>
            </div>
            <button
              type="button"
              class="btn-danger-outline"
              *ngIf="sessions.length > 1"
              (click)="terminateOtherSessions()"
              [disabled]="terminatingOthers">
              <span class="material-symbols-outlined">logout</span>
              <span>{{ 'account.terminate_others' | translate }}</span>
            </button>
          </div>

          <div class="card-body">
            <div class="empty-state" *ngIf="sessions.length === 0 && !loadingSessions">
              <span class="material-symbols-outlined empty-icon">devices</span>
              <p>{{ 'account.no_devices' | translate }}</p>
            </div>

            <div class="devices-grid" *ngIf="sessions.length > 0">
              <div class="device-card" *ngFor="let s of sessions" [class.current-device]="s.isCurrent">
                <div class="device-icon-wrap" [class.trusted-wrap]="s.isTrusted">
                  <span class="material-symbols-outlined">{{ s.icon || getDeviceIcon(s.rawDevice || s.device) }}</span>
                </div>
                <div class="device-info">
                  <div class="device-name-row">
                    <span class="device-name">{{ s.device || formatDeviceTitle(s.rawDevice || s.device) }}</span>
                    <span class="badge-current" *ngIf="s.isCurrent">{{ 'account.this_device' | translate }}</span>
                    <span class="badge-activity" [class.badge-active]="isSessionActive(s)" [class.badge-idle]="!isSessionActive(s)">
                      <span class="activity-dot"></span>
                      <span>{{ (isSessionActive(s) ? 'account.active_now' : 'account.idle') | translate }}</span>
                    </span>
                    <span class="badge-trusted" *ngIf="s.isTrusted" title="2FA verification bypassed on this trusted device">
                      <span class="material-symbols-outlined">verified_user</span>
                      <span>Trusted Device</span>
                    </span>
                  </div>
                  <div class="device-meta-row">
                    <span class="meta-tag">
                      <span class="material-symbols-outlined meta-sub-icon">{{ getDeviceSubIcon(s.rawDevice || s.device) }}</span>
                      {{ s.browser || formatBrowserDetails(s.rawDevice || s.device) }}
                    </span>
                    <span class="meta-tag"><span class="material-symbols-outlined meta-sub-icon">router</span>{{ formatIpAddress(s.ipAddress) }}</span>
                    <span class="meta-tag"><span class="material-symbols-outlined meta-sub-icon">schedule</span>{{ formatExactDateTime(s.lastActive) }}</span>
                  </div>
                </div>
                <div class="device-actions" *ngIf="!s.isCurrent">
                  <button
                    type="button"
                    class="btn-revoke"
                    (click)="terminateSession(s.sessionId)"
                    title="Revoke Session">
                    <span class="material-symbols-outlined">delete</span>
                    <span>{{ 'account.terminate_session' | translate }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- TAB 4: MY ACTIVITY -->
        <section class="card-section animate-fade" *ngIf="activeTab === 'activity'">
          <div class="section-card-head">
            <div class="card-title-group">
              <span class="material-symbols-outlined head-icon text-primary">history</span>
              <div>
                <h2 class="card-title">{{ 'account.tab_activity' | translate }}</h2>
                <p class="card-desc">{{ 'account.activity_desc' | translate }}</p>
              </div>
            </div>
            <div class="head-actions-wrap">
              <span class="counter-badge" *ngIf="loginTotalCount > 0">{{ loginTotalCount }} {{ 'account.tab_activity' | translate }}</span>
              <button type="button" class="btn-secondary" (click)="loadLoginHistory(loginPage)" [disabled]="loadingLogs">
                <span class="material-symbols-outlined" [class.spin-icon]="loadingLogs">refresh</span>
                <span>Refresh</span>
              </button>
            </div>
          </div>

          <div class="card-body">
            <!-- 30-Day Retention & Archival Banner -->
            <div class="retention-banner">
              <div class="retention-info">
                <span class="material-symbols-outlined retention-icon">schedule</span>
                <div>
                  <span class="retention-title">{{ 'account.activity_retention_notice' | translate }}</span>
                  <span class="retention-sub" *ngIf="hasOlderRecords">Archival records older than 30 days are secured in deep retention.</span>
                </div>
              </div>
              <button type="button" class="btn-contact-admin" (click)="contactAdminForArchives()">
                <span class="material-symbols-outlined">support_agent</span>
                <span>{{ 'account.contact_admin' | translate }}</span>
              </button>
            </div>

            <div class="empty-state" *ngIf="loginLogs.length === 0 && !loadingLogs">
              <span class="material-symbols-outlined empty-icon">manage_search</span>
              <p>{{ 'account.no_history' | translate }}</p>
            </div>

            <div class="table-responsive" *ngIf="loginLogs.length > 0">
              <table class="account-table">
                <thead>
                  <tr>
                    <th>Action & Status</th>
                    <th>Description / Module</th>
                    <th>IP Address</th>
                    <th>Browser / Device</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let log of loginLogs">
                    <td>
                      <div class="log-status-col">
                        <span class="log-status-pill" [ngClass]="getStatusClass(log.actionType || log.status)">
                          <span class="material-symbols-outlined">{{ getStatusIcon(log.actionType || log.status) }}</span>
                          {{ log.actionType || log.status }}
                        </span>
                        <span class="badge-trusted-pill" *ngIf="log.isTrusted || (log.status && log.status.includes('Trusted'))" title="Trusted device authentication">
                          <span class="material-symbols-outlined">verified_user</span>
                          <span>Trusted</span>
                        </span>
                      </div>
                    </td>
                    <td>
                      <div class="log-desc-col">
                        <span class="log-desc-text">{{ log.description || log.actionType || log.status }}</span>
                        <span class="log-module-badge" *ngIf="log.module">{{ log.module }}</span>
                      </div>
                    </td>
                    <td><code>{{ formatIpAddress(log.ipAddress) }}</code></td>
                    <td class="log-agent" [title]="log.userAgent">
                      <div class="log-agent-wrap">
                        <div class="log-agent-head">
                          <span class="material-symbols-outlined log-device-icon">{{ log.icon || getDeviceIcon(log.userAgent) }}</span>
                          <span class="log-device-main">{{ log.device || formatDeviceTitle(log.userAgent) }}</span>
                        </div>
                        <span class="log-device-sub">{{ log.browser || formatBrowserDetails(log.userAgent) }}</span>
                      </div>
                    </td>
                    <td>{{ formatDateTime(log.timestamp || log.date) }}</td>
                  </tr>
                </tbody>
              </table>

              <!-- Pagination Toolbar -->
              <div class="pagination-footer" *ngIf="loginTotalCount > 0">
                <div class="page-size-selector">
                  <span>Show</span>
                  <select [ngModel]="loginPageSize" (ngModelChange)="onLoginPageSizeChange($event)">
                    <option [ngValue]="10">10</option>
                    <option [ngValue]="25">25</option>
                    <option [ngValue]="50">50</option>
                  </select>
                  <span>entries per page</span>
                  <span class="entries-info">
                    (Showing {{ (loginPage - 1) * loginPageSize + 1 }} to {{ getLoginEndIndex() }} of {{ loginTotalCount }} records)
                  </span>
                </div>

                <div class="pagination-controls" *ngIf="loginTotalPages > 1">
                  <button type="button" class="page-btn" [disabled]="loginPage === 1" (click)="setLoginPage(1)" title="First Page">
                    <span class="material-symbols-outlined">keyboard_double_arrow_left</span>
                  </button>
                  <button type="button" class="page-btn" [disabled]="loginPage === 1" (click)="setLoginPage(loginPage - 1)" title="Previous Page">
                    <span class="material-symbols-outlined">chevron_left</span>
                  </button>

                  <ng-container *ngFor="let p of getLoginVisiblePages()">
                    <span class="page-ellipsis" *ngIf="p === '...'">...</span>
                    <button
                      *ngIf="p !== '...'"
                      type="button"
                      class="page-btn"
                      [class.active]="p === loginPage"
                      (click)="setLoginPage(+p)">
                      {{ p }}
                    </button>
                  </ng-container>

                  <button type="button" class="page-btn" [disabled]="loginPage === loginTotalPages" (click)="setLoginPage(loginPage + 1)" title="Next Page">
                    <span class="material-symbols-outlined">chevron_right</span>
                  </button>
                  <button type="button" class="page-btn" [disabled]="loginPage === loginTotalPages" (click)="setLoginPage(loginTotalPages)" title="Last Page">
                    <span class="material-symbols-outlined">keyboard_double_arrow_right</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- TAB 5: ROLES & PRIVILEGES -->
        <section class="card-section animate-fade" *ngIf="activeTab === 'roles'">
          <div class="section-card-head">
            <div class="card-title-group">
              <span class="material-symbols-outlined head-icon text-primary">verified_user</span>
              <div>
                <h2 class="card-title">{{ 'account.roles_summary' | translate }}</h2>
                <p class="card-desc">Overview of your assigned role privileges and authorization scope within this tenant.</p>
              </div>
            </div>
          </div>

          <div class="card-body">
            <div class="roles-cards-grid">
              <div class="role-badge-card" *ngFor="let role of summary?.roles">
                <div class="role-icon-circle">
                  <span class="material-symbols-outlined">security</span>
                </div>
                <div class="role-card-info">
                  <span class="role-title">{{ role }}</span>
                  <span class="role-desc">Assigned administrative security credential</span>
                </div>
              </div>
            </div>

            <div class="privileges-note">
              <span class="material-symbols-outlined">info</span>
              <span>Need elevated privileges or additional feature roles? Contact your workspace Super Administrator to request permission adjustments.</span>
            </div>
          </div>
        </section>

      </div>
    </div>
  `,
  styles: [`
    .account-container {
      padding: 0;
      width: 100%;
      max-width: 100%;
      margin: 0;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .account-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #ffffff;
      padding: 20px 24px;
      border-radius: 14px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .header-icon-wrap {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: rgba(0, 80, 229, 0.08);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #0050e5;
    }
    .header-icon {
      font-size: 28px;
    }
    .page-title {
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
    }
    .page-sub {
      font-size: 13px;
      color: #64748b;
      margin: 2px 0 0 0;
    }
    .user-pill {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 16px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 30px;
    }
    .user-avatar-small {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #0050e5;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
    }
    .user-avatar-img {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      object-fit: cover;
    }
    .user-meta {
      display: flex;
      flex-direction: column;
    }
    .meta-name {
      font-size: 13px;
      font-weight: 700;
      color: #1e293b;
    }
    .meta-role {
      font-size: 11px;
      color: #64748b;
    }

    /* Tab navigation */
    .tab-navigation-bar {
      display: flex;
      gap: 8px;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 2px;
      overflow-x: auto;
    }
    .tab-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      border: none;
      background: transparent;
      color: #64748b;
      font-size: 13.5px;
      font-weight: 600;
      cursor: pointer;
      border-bottom: 3px solid transparent;
      margin-bottom: -4px;
      transition: all 0.2s ease;
      white-space: nowrap;
    }
    .tab-btn:hover {
      color: #0050e5;
    }
    .tab-btn.active {
      color: #0050e5;
      border-bottom-color: #0050e5;
      font-weight: 700;
    }
    .tab-icon {
      font-size: 19px;
    }
    .tab-badge {
      font-size: 10.5px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 9999px;
      text-transform: uppercase;
    }
    .badge-good {
      background: rgba(22, 163, 74, 0.1);
      color: #16a34a;
    }
    .badge-warn {
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
    }
    .tab-counter {
      background: #e2e8f0;
      color: #334155;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 9999px;
    }

    /* Card Section */
    .card-section {
      background: #ffffff;
      border-radius: 14px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
      overflow: hidden;
    }
    .section-card-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 18px 24px;
      border-bottom: 1px solid #f1f5f9;
      background: #fafafa;
    }
    .card-title-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .head-icon {
      font-size: 24px;
    }
    .card-title {
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
    }
    .card-desc {
      font-size: 12.5px;
      color: #64748b;
      margin: 2px 0 0 0;
    }
    .card-body {
      padding: 24px;
    }

    /* Form Styles */
    .account-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
      width: 100%;
      box-sizing: border-box;
    }
    .form-group label {
      font-size: 13px;
      font-weight: 700;
      color: #334155;
    }
    .form-input {
      width: 100%;
      box-sizing: border-box;
      padding: 10px 14px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 14px;
      outline: none;
      transition: border-color 0.2s;
    }
    .form-input:focus {
      border-color: #0050e5;
      box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.1);
    }
    .password-input-wrap {
      position: relative;
      display: flex;
      align-items: center;
      width: 100%;
      box-sizing: border-box;
    }
    .password-input-wrap .form-input {
      width: 100%;
      box-sizing: border-box;
      padding-right: 44px;
    }
    .eye-btn {
      position: absolute;
      right: 10px;
      background: none;
      border: none;
      color: #64748b;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .eye-btn:hover {
      color: #0f172a;
    }

    /* Complexity Checklist */
    .complexity-checklist {
      background: #f8fafc;
      padding: 14px;
      border-radius: 10px;
      border: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .checklist-title {
      font-size: 12px;
      font-weight: 700;
      color: #475569;
    }
    .pill-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .rule-pill {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 11.5px;
      font-weight: 600;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      color: #64748b;
    }
    .rule-pill.passed {
      background: rgba(22, 163, 74, 0.08);
      border-color: #16a34a;
      color: #16a34a;
    }
    .rule-pill .material-symbols-outlined {
      font-size: 14px;
    }

    .checkbox-option {
      margin-top: 4px;
    }
    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #475569;
      cursor: pointer;
    }

    .form-actions {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-top: 8px;
    }
    .btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #0050e5;
      color: #ffffff;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 13.5px;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.2s;
    }
    .btn-primary:hover:not(:disabled) {
      background: #003ebd;
    }
    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .btn-secondary {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #f1f5f9;
      color: #334155;
      border: 1px solid #cbd5e1;
      padding: 9px 18px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
    }
    .btn-secondary:hover {
      background: #e2e8f0;
    }
    .btn-danger-outline {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(239, 68, 68, 0.06);
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.25);
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 12.5px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-danger-outline:hover:not(:disabled) {
      background: #ef4444;
      color: #ffffff;
    }
    .btn-danger-outline:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* MFA Styles */
    .status-pill {
      font-size: 11.5px;
      font-weight: 700;
      padding: 4px 12px;
      border-radius: 20px;
      text-transform: uppercase;
    }
    .status-pill.good {
      background: rgba(22, 163, 74, 0.1);
      color: #16a34a;
    }
    .status-pill.danger {
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
    }

    .mfa-selection-group {
      display: flex;
      flex-direction: column;
      gap: 10px;
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
    }
    .mfa-option-row {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 16px;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .mfa-option-row:hover {
      background: #f8fafc;
      border-color: #cbd5e1;
    }
    .mfa-option-row.selected {
      background: rgba(0, 80, 229, 0.04);
      border-color: #0050e5;
    }
    .mfa-opt-meta {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .mfa-opt-title {
      font-size: 13.5px;
      font-weight: 700;
      color: #1e293b;
    }
    .mfa-opt-desc {
      font-size: 12px;
      color: #64748b;
    }
    .mfa-action-btn-wrap {
      display: flex;
      justify-content: flex-end;
      margin-top: 10px;
    }

    .mfa-setup-challenge {
      display: flex;
      flex-direction: column;
      gap: 16px;
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
    }
    .challenge-alert {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(0, 80, 229, 0.08);
      border: 1px solid rgba(0, 80, 229, 0.2);
      padding: 10px 14px;
      border-radius: 8px;
      color: #0050e5;
      font-size: 12.5px;
      font-weight: 600;
    }
    .qr-container {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 16px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      width: fit-content;
      margin: 12px auto;
    }
    .qr-code-img {
      width: 180px;
      height: 180px;
    }
    .secret-key-box {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-size: 16px;
      font-weight: 800;
      letter-spacing: 1px;
      color: #0f172a;
      cursor: pointer;
    }
    .secret-key-box:hover {
      background: #e2e8f0;
    }
    .code-input-field {
      text-align: center;
      font-size: 22px;
      font-weight: 800;
      letter-spacing: 6px;
      padding: 10px;
    }
    .challenge-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 8px;
    }

    .mfa-verified-step {
      display: flex;
      flex-direction: column;
      gap: 16px;
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
    }
    .success-header {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .success-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 800;
      color: #16a34a;
    }
    .backup-codes-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 16px;
    }
    .backup-code-item {
      text-align: center;
      font-size: 14px;
      font-weight: 700;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 8px;
    }
    .verified-done-wrap {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }

    /* Devices Grid */
    .devices-grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .device-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px 20px;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      background: #ffffff;
      transition: all 0.2s;
    }
    .device-card:hover {
      border-color: #cbd5e1;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
    }
    .device-card.current-device {
      border-color: #0050e5;
      background: rgba(0, 80, 229, 0.02);
    }
    .device-icon-wrap {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      background: #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #334155;
    }
    .device-card.current-device .device-icon-wrap {
      background: rgba(0, 80, 229, 0.1);
      color: #0050e5;
    }
    .device-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .device-name-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .device-name {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
    }
    .badge-current {
      font-size: 10.5px;
      font-weight: 700;
      background: #0050e5;
      color: #ffffff;
      padding: 2px 8px;
      border-radius: 20px;
    }
    .badge-trusted {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 10.5px;
      font-weight: 700;
      background: rgba(16, 185, 129, 0.12);
      color: #059669;
      border: 1px solid rgba(16, 185, 129, 0.35);
      padding: 2px 8px;
      border-radius: 20px;
    }
    .badge-trusted .material-symbols-outlined {
      font-size: 13px;
    }
    .badge-activity {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 10.5px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 20px;
    }
    .badge-activity.badge-active {
      background: rgba(16, 185, 129, 0.12);
      color: #059669;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .badge-activity.badge-idle {
      background: rgba(245, 158, 11, 0.12);
      color: #d97706;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }
    .activity-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }
    .device-icon-wrap.trusted-wrap {
      border: 1.5px solid rgba(16, 185, 129, 0.35);
    }
    .device-meta-row {
      display: flex;
      align-items: center;
      gap: 16px;
      font-size: 12px;
      color: #64748b;
    }
    .meta-tag {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .meta-sub-icon {
      font-size: 14px;
    }
    .btn-revoke {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: transparent;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      color: #ef4444;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-revoke:hover {
      background: #ef4444;
      border-color: #ef4444;
      color: #ffffff;
    }

    /* Table Styles */
    .table-responsive {
      overflow-x: auto;
    }
    .account-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .account-table th {
      text-align: left;
      padding: 10px 14px;
      background: #f8fafc;
      color: #475569;
      font-weight: 700;
      border-bottom: 2px solid #e2e8f0;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .account-table td {
      padding: 12px 14px;
      border-bottom: 1px solid #f1f5f9;
      color: #1e293b;
    }
    .log-status-col {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
    }
    .badge-trusted-pill {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      font-size: 10px;
      font-weight: 700;
      background: rgba(16, 185, 129, 0.12);
      color: #059669;
      border: 1px solid rgba(16, 185, 129, 0.3);
      padding: 1px 6px;
      border-radius: 10px;
    }
    .badge-trusted-pill .material-symbols-outlined {
      font-size: 11px;
    }
    .log-agent {
      min-width: 220px;
      max-width: 360px;
    }
    .log-agent-wrap {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .log-agent-head {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .log-device-icon {
      font-size: 16px;
      color: #0050e5;
    }
    .log-device-main {
      font-weight: 600;
      color: #0f172a;
      font-size: 13px;
    }
    .log-device-sub {
      font-size: 11.5px;
      color: #64748b;
      padding-left: 22px;
    }
    .log-status-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 20px;
    }
    .log-status-pill .material-symbols-outlined {
      font-size: 14px;
    }
    .log-good {
      background: rgba(22, 163, 74, 0.1);
      color: #16a34a;
    }
    .log-bad {
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
    }
    .log-info {
      background: rgba(0, 80, 229, 0.1);
      color: #0050e5;
    }

    .retention-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      padding: 12px 18px;
      margin-bottom: 18px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
    }
    .retention-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .retention-icon {
      font-size: 22px;
      color: #0050e5;
    }
    .retention-title {
      font-size: 13px;
      font-weight: 600;
      color: #1e293b;
      display: block;
    }
    .retention-sub {
      font-size: 11.5px;
      color: #64748b;
      display: block;
    }
    .btn-contact-admin {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      font-size: 12px;
      font-weight: 700;
      color: #0050e5;
      background: rgba(0, 80, 229, 0.08);
      border: 1px solid rgba(0, 80, 229, 0.25);
      border-radius: 8px;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s;
    }
    .btn-contact-admin:hover {
      background: rgba(0, 80, 229, 0.16);
      border-color: #0050e5;
    }
    .log-desc-col {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .log-desc-text {
      font-size: 13px;
      font-weight: 600;
      color: #1e293b;
    }
    .log-module-badge {
      display: inline-block;
      align-self: flex-start;
      font-size: 10.5px;
      font-weight: 700;
      padding: 2px 7px;
      background: #f1f5f9;
      color: #475569;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
    }

    /* Table Pagination Toolbar */
    .pagination-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border-top: 1px solid #e2e8f0;
      background: #f8fafc;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 4px;
      border-radius: 0 0 10px 10px;
    }
    .page-size-selector {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #64748b;
    }
    .page-size-selector select {
      height: 30px;
      padding: 0 8px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      background: #ffffff;
      outline: none;
      font-size: 12px;
      font-weight: 600;
      color: #0f172a;
      cursor: pointer;
    }
    .entries-info {
      font-size: 12px;
      color: #94a3b8;
      margin-left: 6px;
    }
    .pagination-controls {
      display: flex;
      gap: 4px;
      align-items: center;
    }
    .page-btn {
      min-width: 32px;
      height: 32px;
      padding: 0 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      color: #334155;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .page-btn:hover:not(:disabled) {
      background: #f1f5f9;
      border-color: #94a3b8;
    }
    .page-btn.active {
      background: #0050e5;
      color: #ffffff;
      border-color: #0050e5;
    }
    .page-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .page-btn .material-symbols-outlined {
      font-size: 18px;
    }
    .page-ellipsis {
      padding: 0 4px;
      color: #94a3b8;
      font-size: 12px;
    }
    .head-actions-wrap {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .counter-badge {
      font-size: 12px;
      font-weight: 700;
      color: #0050e5;
      background: rgba(0, 80, 229, 0.08);
      padding: 4px 10px;
      border-radius: 9999px;
    }
    .spin-icon {
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    /* Roles tab */
    .roles-cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 14px;
    }
    .role-badge-card {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 16px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
    }
    .role-icon-circle {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(0, 80, 229, 0.1);
      color: #0050e5;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .role-card-info {
      display: flex;
      flex-direction: column;
    }
    .role-title {
      font-size: 14px;
      font-weight: 800;
      color: #0f172a;
    }
    .role-desc {
      font-size: 11.5px;
      color: #64748b;
    }
    .privileges-note {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 20px;
      padding: 14px 18px;
      background: rgba(0, 80, 229, 0.05);
      border: 1px solid rgba(0, 80, 229, 0.15);
      border-radius: 10px;
      font-size: 12.5px;
      color: #0050e5;
    }

    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: #94a3b8;
    }
    .empty-icon {
      font-size: 48px;
      margin-bottom: 8px;
      color: #cbd5e1;
    }
    .text-primary { color: #0050e5; }
    .text-green { color: #16a34a; }
  `]
})
export class IdentityAccountComponent implements OnInit, OnDestroy {
  /** Active selected tab key: 'password' | '2fa' | 'devices' | 'activity' | 'roles' */
  activeTab: string = 'password';

  /** Password change state */
  oldPassword: string = '';
  newPassword: string = '';
  confirmPassword: string = '';
  showCurrent: boolean = false;
  showNew: boolean = false;
  savingPassword: boolean = false;
  signOutOtherSessions: boolean = false;

  /** Password complexity criteria */
  hasMinLength: boolean = false;
  hasUpper: boolean = false;
  hasLower: boolean = false;
  hasNumber: boolean = false;
  hasSpecial: boolean = false;

  /** 2FA security state */
  mfaEnabled: boolean = false;
  currentProvider: string = 'None';
  selectedProvider: string = 'None';
  setupStep: 'idle' | 'setup' | 'verified' = 'idle';
  isConfiguring: boolean = false;
  isVerifying: boolean = false;
  secretKey: string = '';
  qrCodeUrl: string = '';
  verificationCode: string = '';
  backupCodes: string[] = [];

  /** Manage devices state */
  sessions: ActiveSessionItem[] = [];
  loadingSessions: boolean = false;
  terminatingOthers: boolean = false;

  /** Login activity logs state */
  loginLogs: LoginAuditItem[] = [];
  loadingLogs: boolean = false;
  loginPage: number = 1;
  loginPageSize: number = 10;
  loginTotalCount: number = 0;
  loginTotalPages: number = 1;
  hasOlderRecords: boolean = false;
  retentionNotice: string = '';

  /** Account profile summary state */
  summary: AccountSummary | null = null;

  private routeSub?: Subscription;

  constructor(
    private readonly api: ApiService,
    private readonly toast: ToastService,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    // Synchronize tab with route query params (?tab=password, ?tab=2fa, etc.)
    this.routeSub = this.route.queryParams.subscribe(params => {
      const tabParam = params['tab'];
      if (tabParam && ['password', '2fa', 'devices', 'activity', 'roles'].includes(tabParam)) {
        this.activeTab = tabParam;
      }
    });

    this.loadAccountSummary();
    this.loadMfaStatus();
    this.loadSessions();
    this.loadLoginHistory();
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  /**
   * Switches active tab and updates browser URL query param.
   * @param tab Target tab identifier.
   */
  selectTab(tab: string): void {
    this.activeTab = tab;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge'
    });
  }

  /**
   * Fetches account security summary including active roles and device counts.
   */
  loadAccountSummary(): void {
    this.api.get<any>('IdentityApi/account/summary').subscribe({
      next: (res) => {
        if (res?.data) {
          this.summary = res.data;
          this.mfaEnabled = !!res.data.twoFactorEnabled;
          this.currentProvider = res.data.provider || 'None';
          if (this.setupStep === 'idle') {
            this.selectedProvider = this.currentProvider;
          }
        }
      },
      error: () => {
        // Fallback gracefully without breaking view
      }
    });
  }

  /**
   * Evaluates live password complexity against standard enterprise criteria.
   */
  evaluateComplexity(): void {
    const pwd = this.newPassword || '';
    this.hasMinLength = pwd.length >= 8;
    this.hasUpper = /[A-Z]/.test(pwd);
    this.hasLower = /[a-z]/.test(pwd);
    this.hasNumber = /[0-9]/.test(pwd);
    this.hasSpecial = /[^A-Za-z0-9]/.test(pwd);
  }

  /**
   * Returns true if all password complexity rules and matching confirmations are met.
   */
  isComplexitySatisfied(): boolean {
    return (
      this.hasMinLength &&
      this.hasUpper &&
      this.hasLower &&
      this.hasNumber &&
      this.hasSpecial &&
      this.oldPassword.trim().length > 0 &&
      this.confirmPassword === this.newPassword
    );
  }

  /**
   * Submits password update request to the backend.
   */
  changePassword(): void {
    if (!this.isComplexitySatisfied()) {
      this.toast.warning('Please satisfy all password complexity requirements.', 'Validation');
      return;
    }

    this.savingPassword = true;
    this.api.post<any>('auth/password/change', {
      oldPassword: this.oldPassword,
      newPassword: this.newPassword
    }).subscribe({
      next: () => {
        this.savingPassword = false;
        this.toast.success('Your account password was updated successfully.', 'Success');
        const shouldSignOutOthers = this.signOutOtherSessions;

        // Reset inputs
        this.oldPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
        this.evaluateComplexity();

        if (shouldSignOutOthers) {
          this.terminateOtherSessions();
        }
      },
      error: (err) => {
        this.savingPassword = false;
        this.toast.error(err?.error?.message || 'Failed to update password. Please check your current password.', 'Error');
      }
    });
  }

  /**
   * Fetches current MFA security configuration.
   */
  loadMfaStatus(): void {
    this.api.get<any>('auth/mfa').subscribe({
      next: (res) => {
        if (res?.data) {
          this.mfaEnabled = !!res.data.mfaEnabled;
          this.currentProvider = res.data.provider || 'None';
          if (this.setupStep === 'idle') {
            this.selectedProvider = this.currentProvider;
          }
        }
      },
      error: () => {}
    });
  }

  /**
   * Begins multi-factor authentication setup challenge.
   */
  startMfaSetup(): void {
    if (this.selectedProvider === 'None') {
      if (!confirm('Are you sure you want to disable Two-Factor Authentication for this account?')) {
        return;
      }
      this.isConfiguring = true;
      this.api.post<any>('auth/mfa/configure', { provider: 'None' }).subscribe({
        next: () => {
          this.isConfiguring = false;
          this.mfaEnabled = false;
          this.currentProvider = 'None';
          this.toast.success('Two-factor authentication disabled.', 'Updated');
          this.loadAccountSummary();
        },
        error: (err) => {
          this.isConfiguring = false;
          this.toast.error(err?.error?.message || 'Failed to disable 2FA.', 'Error');
        }
      });
      return;
    }

    this.isConfiguring = true;
    this.api.post<any>('auth/mfa/configure', { provider: this.selectedProvider }).subscribe({
      next: (res) => {
        this.isConfiguring = false;
        this.secretKey = res?.data?.secretKey || res?.data?.sharedKey || '';
        this.qrCodeUrl = res?.data?.qrCodeUrl || res?.data?.qrCodeUri || '';
        this.verificationCode = '';
        this.setupStep = 'setup';
      },
      error: (err) => {
        this.isConfiguring = false;
        this.toast.error(err?.error?.message || 'Failed to initiate 2FA setup.', 'Error');
      }
    });
  }

  /**
   * Submits 6-digit confirmation test code to verify and finalize 2FA enrollment.
   */
  verifyMfaSetup(): void {
    if (this.verificationCode.trim().length !== 6) return;
    this.isVerifying = true;
    this.api.post<any>('auth/mfa/verify', {
      provider: this.selectedProvider,
      code: this.verificationCode.trim()
    }).subscribe({
      next: (res) => {
        this.isVerifying = false;
        this.mfaEnabled = true;
        this.currentProvider = this.selectedProvider;
        this.backupCodes = res?.data?.backupCodes || [];
        this.setupStep = 'verified';
        this.toast.success('Two-factor authentication enabled successfully!', 'Verified');
        this.loadAccountSummary();
      },
      error: (err) => {
        this.isVerifying = false;
        this.toast.error(err?.error?.message || 'Invalid verification code. Please try again.', 'Error');
      }
    });
  }

  /**
   * Cancels setup challenge and reverts to selection list.
   */
  cancelMfaSetup(): void {
    this.setupStep = 'idle';
    this.selectedProvider = this.currentProvider;
    this.verificationCode = '';
    this.secretKey = '';
    this.qrCodeUrl = '';
  }

  /**
   * Completes the verified recovery code flow.
   */
  finishMfaVerifiedFlow(): void {
    this.setupStep = 'idle';
    this.backupCodes = [];
  }

  /**
   * Copies secret key to clipboard.
   */
  copySecretKey(): void {
    if (!this.secretKey) return;
    navigator.clipboard.writeText(this.secretKey).then(() => {
      this.toast.info('Secret key copied to clipboard.', 'Copied');
    });
  }

  /**
   * Copies all single-use backup recovery codes to clipboard.
   */
  copyBackupCodes(): void {
    if (this.backupCodes.length === 0) return;
    navigator.clipboard.writeText(this.backupCodes.join('\n')).then(() => {
      this.toast.info('Recovery backup codes copied to clipboard.', 'Copied');
    });
  }

  /**
   * Encodes QR code URI for display.
   */
  getQrImageUrl(): string {
    if (!this.qrCodeUrl) return '';
    return 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=' + encodeURIComponent(this.qrCodeUrl);
  }

  /**
   * Fetches active sessions from the backend.
   */
  loadSessions(): void {
    this.loadingSessions = true;
    this.api.get<any>('IdentityApi/sessions').subscribe({
      next: (res) => {
        this.loadingSessions = false;
        this.sessions = res?.data || [];
        // Detect current device session if none marked
        if (this.sessions.length > 0 && !this.sessions.some(s => s.isCurrent)) {
          this.sessions[0].isCurrent = true;
        }
      },
      error: () => {
        this.loadingSessions = false;
      }
    });
  }

  /**
   * Revokes a single device session.
   * @param sessionId Session ID to terminate.
   */
  terminateSession(sessionId: string): void {
    if (!confirm('Are you sure you want to terminate this active device session?')) return;
    this.api.delete<any>(`IdentityApi/sessions/${sessionId}`).subscribe({
      next: () => {
        this.toast.success('Session terminated successfully.', 'Revoked');
        this.loadSessions();
        this.loadAccountSummary();
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'Failed to terminate session.', 'Error');
      }
    });
  }

  /**
   * Revokes all active sessions except the current session.
   */
  terminateOtherSessions(): void {
    if (!confirm('Are you sure you want to terminate all other active device sessions? All other logged in browsers will be signed out.')) {
      return;
    }
    this.terminatingOthers = true;
    this.api.post<any>('IdentityApi/sessions/terminate-others', {}).subscribe({
      next: (res) => {
        this.terminatingOthers = false;
        this.toast.success(res?.message || 'All other sessions have been revoked.', 'Success');
        this.loadSessions();
        this.loadAccountSummary();
      },
      error: (err) => {
        this.terminatingOthers = false;
        this.toast.error(err?.error?.message || 'Failed to revoke other sessions.', 'Error');
      }
    });
  }

  /**
   * Fetches personal login history logs with server-side pagination.
   * @param page Target page number (defaults to current loginPage).
   */
  loadLoginHistory(page: number = this.loginPage): void {
    this.loadingLogs = true;
    this.api.get<any>(`IdentityApi/account/login-history?page=${page}&pageSize=${this.loginPageSize}`).subscribe({
      next: (res) => {
        this.loadingLogs = false;
        if (Array.isArray(res?.data)) {
          this.loginLogs = res.data;
          this.loginTotalCount = res.data.length;
          this.loginPage = 1;
          this.loginTotalPages = 1;
          this.hasOlderRecords = false;
        } else if (res?.data?.items) {
          this.loginLogs = res.data.items;
          this.loginTotalCount = res.data.totalCount ?? this.loginLogs.length;
          this.loginPage = res.data.page ?? page;
          this.loginPageSize = res.data.pageSize ?? this.loginPageSize;
          this.loginTotalPages = res.data.totalPages ?? Math.max(1, Math.ceil(this.loginTotalCount / this.loginPageSize));
          this.hasOlderRecords = !!res.data.hasOlderRecords;
          this.retentionNotice = res.data.retentionNotice || '';
        } else {
          this.loginLogs = [];
          this.loginTotalCount = 0;
          this.loginTotalPages = 1;
          this.hasOlderRecords = false;
        }
      },
      error: () => {
        this.loadingLogs = false;
      }
    });
  }

  /**
   * Guides the user on how to request deep archival activity records beyond 30 days.
   */
  contactAdminForArchives(): void {
    this.toast.info('To request archival activity records older than 30 days, please contact your workspace Super Administrator.', 'Archival Records');
  }

  /**
   * Navigates to a specific login history page.
   * @param page Target 1-based page index.
   */
  setLoginPage(page: number): void {
    if (page < 1 || page > this.loginTotalPages || page === this.loginPage) return;
    this.loadLoginHistory(page);
  }

  /**
   * Handles page size change for login history.
   * @param newSize New page size (10, 25, 50).
   */
  onLoginPageSizeChange(newSize: number): void {
    this.loginPageSize = Number(newSize) || 10;
    this.loginPage = 1;
    this.loadLoginHistory(1);
  }

  /**
   * Calculates the end index of the currently displayed records.
   */
  getLoginEndIndex(): number {
    return Math.min(this.loginPage * this.loginPageSize, this.loginTotalCount);
  }

  /**
   * Computes visible page numbers and ellipsis for pagination controls.
   */
  getLoginVisiblePages(): (number | string)[] {
    const total = this.loginTotalPages;
    const current = this.loginPage;
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages: (number | string)[] = [1];
    if (current > 3) pages.push('...');
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    if (current < total - 2) pages.push('...');
    pages.push(total);
    return pages;
  }

  /**
   * Returns human-readable device title (e.g. "Google Chrome on Windows 10/11").
   * @param device Raw user agent or device string.
   */
  formatDeviceTitle(device: string | undefined | null): string {
    return parseUserAgent(device).displayTitle;
  }

  /**
   * Returns secondary browser details (e.g. "Google Chrome 155 • Desktop").
   * @param device Raw user agent or device string.
   */
  formatBrowserDetails(device: string | undefined | null): string {
    return parseUserAgent(device).displayDetails;
  }

  /**
   * Formats an IP address, handling loopback cleanly.
   * @param ip Raw IP string.
   */
  formatIpAddress(ip: string | undefined | null): string {
    return formatClientIpAddress(ip);
  }

  /**
   * Returns an appropriate icon name for a given device description.
   * @param device Device name or user agent string.
   */
  getDeviceIcon(device: string): string {
    return parseUserAgent(device).icon;
  }

  /**
   * Returns a secondary sub-icon for metadata tag (language for browser, terminal/desktop for native apps).
   * @param device Device name or user agent string.
   */
  getDeviceSubIcon(device: string | undefined | null): string {
    const parsed = parseUserAgent(device);
    if (parsed.clientType === 'desktop') return 'terminal';
    if (parsed.clientType === 'mobile') return 'smartphone';
    return 'language';
  }

  /**
   * Formats a raw user agent string into a concise readable label.
   * @param ua User agent string.
   */
  formatUserAgent(ua: string): string {
    return this.formatDeviceTitle(ua);
  }

  /**
   * Returns an icon representing the audit log status.
   * @param status Audit status string.
   */
  getStatusIcon(status: string): string {
    const s = (status || '').toLowerCase();
    if (s.includes('success') || s.includes('granted')) return 'check_circle';
    if (s.includes('fail') || s.includes('denied')) return 'cancel';
    if (s.includes('revoked') || s.includes('terminated')) return 'block';
    return 'info';
  }

  /**
   * Returns CSS class corresponding to audit log status.
   * @param status Audit status string.
   */
  getStatusClass(status: string): string {
    const s = (status || '').toLowerCase();
    if (s.includes('success') || s.includes('granted')) return 'log-good';
    if (s.includes('fail') || s.includes('denied') || s.includes('revoked')) return 'log-bad';
    return 'log-info';
  }

  /**
   * Formats relative timestamp for device last-active display.
   * @param dateStr ISO date string.
   */
  formatRelativeTime(dateStr: string): string {
    if (!dateStr) return 'Just now';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Active just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }

  /**
   * Formats an ISO date string into readable local date and exact time.
   * Ensures UTC representation is correctly converted to the device's local timezone.
   * @param dateStr ISO date string.
   */
  formatExactDateTime(dateStr: string): string {
    if (!dateStr) return '—';
    try {
      const utcStr = (dateStr.endsWith('Z') || dateStr.includes('+')) ? dateStr : `${dateStr}Z`;
      const d = new Date(utcStr);
      return d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return dateStr;
    }
  }

  /**
   * Alias for formatExactDateTime for audit log table timestamp formatting.
   * @param dateStr ISO date string.
   */
  formatDateTime(dateStr: string | undefined | null): string {
    return this.formatExactDateTime(dateStr || '');
  }

  /**
   * Evaluates if a device session is actively used (within 15m) or currently active.
   * @param s The session item.
   */
  isSessionActive(s: any): boolean {
    if (!s) return false;
    if (s.isCurrent) return true;
    if (!s.lastActive) return false;
    try {
      const utcStr = (s.lastActive.endsWith('Z') || s.lastActive.includes('+')) ? s.lastActive : `${s.lastActive}Z`;
      const last = new Date(utcStr).getTime();
      return (Date.now() - last) <= 15 * 60 * 1000;
    } catch {
      return false;
    }
  }
}
