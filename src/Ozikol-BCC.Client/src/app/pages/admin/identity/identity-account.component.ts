import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

/**
 * Interface representing an active logged-in device session.
 */
interface ActiveSessionItem {
  sessionId: string;
  device: string;
  browser: string;
  ipAddress: string;
  lastActive: string;
  isCurrent: boolean;
}

/**
 * Interface representing a security login audit log record.
 */
interface LoginAuditItem {
  id: string;
  email: string;
  status: string;
  ipAddress: string;
  userAgent: string;
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
        <div class="header-right" *ngIf="summary?.email">
          <div class="user-pill">
            <div class="user-avatar-small" *ngIf="!summary?.avatarUrl">
              {{ (summary?.fullName || 'User').substring(0, 2).toUpperCase() }}
            </div>
            <img [src]="summary?.avatarUrl" class="user-avatar-img" *ngIf="summary?.avatarUrl" alt="Avatar" />
            <div class="user-meta">
              <span class="meta-name">{{ summary?.fullName || summary?.email }}</span>
              <span class="meta-role">{{ (summary?.roles && summary!.roles!.length > 0) ? summary!.roles![0] : 'Administrator' }}</span>
            </div>
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
                <div class="device-icon-wrap">
                  <span class="material-symbols-outlined">{{ getDeviceIcon(s.device) }}</span>
                </div>
                <div class="device-info">
                  <div class="device-name-row">
                    <span class="device-name">{{ s.device }}</span>
                    <span class="badge-current" *ngIf="s.isCurrent">{{ 'account.this_device' | translate }}</span>
                  </div>
                  <div class="device-meta-row">
                    <span class="meta-tag"><span class="material-symbols-outlined meta-sub-icon">router</span>{{ s.ipAddress }}</span>
                    <span class="meta-tag"><span class="material-symbols-outlined meta-sub-icon">schedule</span>{{ formatRelativeTime(s.lastActive) }}</span>
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

        <!-- TAB 4: LOGIN ACTIVITY -->
        <section class="card-section animate-fade" *ngIf="activeTab === 'activity'">
          <div class="section-card-head">
            <div class="card-title-group">
              <span class="material-symbols-outlined head-icon text-primary">history</span>
              <div>
                <h2 class="card-title">{{ 'nav.login_history' | translate }}</h2>
                <p class="card-desc">Audit trail of recent authentication challenges, timestamps, and network IP addresses.</p>
              </div>
            </div>
            <button type="button" class="btn-secondary" (click)="loadLoginHistory()">
              <span class="material-symbols-outlined">refresh</span>
              <span>Refresh</span>
            </button>
          </div>

          <div class="card-body">
            <div class="empty-state" *ngIf="loginLogs.length === 0 && !loadingLogs">
              <span class="material-symbols-outlined empty-icon">manage_search</span>
              <p>{{ 'account.no_history' | translate }}</p>
            </div>

            <div class="table-responsive" *ngIf="loginLogs.length > 0">
              <table class="account-table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>IP Address</th>
                    <th>Browser / Device</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let log of loginLogs">
                    <td>
                      <span class="log-status-pill" [ngClass]="getStatusClass(log.status)">
                        <span class="material-symbols-outlined">{{ getStatusIcon(log.status) }}</span>
                        {{ log.status }}
                      </span>
                    </td>
                    <td><code>{{ log.ipAddress || '127.0.0.1' }}</code></td>
                    <td class="log-agent" [title]="log.userAgent">{{ formatUserAgent(log.userAgent) }}</td>
                    <td>{{ formatDateTime(log.timestamp) }}</td>
                  </tr>
                </tbody>
              </table>
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
    .log-agent {
      max-width: 250px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
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
   * Fetches personal login history logs.
   */
  loadLoginHistory(): void {
    this.loadingLogs = true;
    this.api.get<any>('IdentityApi/account/login-history').subscribe({
      next: (res) => {
        this.loadingLogs = false;
        this.loginLogs = res?.data || [];
      },
      error: () => {
        this.loadingLogs = false;
      }
    });
  }

  /**
   * Returns an appropriate icon name for a given device description.
   * @param device Device name string.
   */
  getDeviceIcon(device: string): string {
    const d = (device || '').toLowerCase();
    if (d.includes('mobile') || d.includes('android') || d.includes('iphone')) return 'smartphone';
    if (d.includes('ipad') || d.includes('tablet')) return 'tablet';
    return 'computer';
  }

  /**
   * Formats a raw user agent string into a concise readable label.
   * @param ua User agent string.
   */
  formatUserAgent(ua: string): string {
    if (!ua) return 'Unknown Client';
    if (ua.length > 50) return ua.substring(0, 48) + '...';
    return ua;
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
   * Formats an ISO date string into readable date and time.
   * @param dateStr ISO date string.
   */
  formatDateTime(dateStr: string): string {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  }
}
