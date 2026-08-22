import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-workspace-security',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="security-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">Security & Credentials</h1>
          <p class="page-sub">Manage your account password, multi-factor authentication, and verification badges.</p>
        </div>
      </div>

      <div class="security-grid">
        <!-- Left Column -->
        <div class="sec-column">
          <!-- Card 1: Change Password -->
          <section class="sec-card animate-fade">
            <div class="card-head">
              <div class="head-title-wrap">
                <span class="material-symbols-outlined head-icon text-primary">key</span>
                <h2 class="card-title">Change Account Password</h2>
              </div>
            </div>
            <div class="card-body">
              <form (ngSubmit)="changePassword()">
                <div class="form-group">
                  <label>Current Password</label>
                  <div class="password-input-wrap">
                    <input [type]="showCurrent ? 'text' : 'password'" [(ngModel)]="oldPassword" name="oldPassword" required placeholder="Enter current password" class="form-input" />
                    <button type="button" class="eye-btn" (click)="showCurrent = !showCurrent">
                      <span class="material-symbols-outlined">{{ showCurrent ? 'visibility_off' : 'visibility' }}</span>
                    </button>
                  </div>
                </div>

                <div class="form-group">
                  <label>New Password</label>
                  <div class="password-input-wrap">
                    <input [type]="showNew ? 'text' : 'password'" [(ngModel)]="newPassword" name="newPassword" (input)="evaluateComplexity()" required placeholder="Enter new strong password" class="form-input" />
                    <button type="button" class="eye-btn" (click)="showNew = !showNew">
                      <span class="material-symbols-outlined">{{ showNew ? 'visibility_off' : 'visibility' }}</span>
                    </button>
                  </div>
                </div>

                <!-- Password Complexity Checklist -->
                <div class="complexity-checklist">
                  <div class="checklist-title">Password Requirements:</div>
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
                  <label>Confirm New Password</label>
                  <input type="password" [(ngModel)]="confirmPassword" name="confirmPassword" required placeholder="Re-enter new password" class="form-input" />
                </div>

                <div class="form-actions">
                  <button type="submit" [disabled]="saving || !isComplexitySatisfied()" class="btn-primary">
                    <span class="material-symbols-outlined">{{ saving ? 'hourglass_top' : 'lock_reset' }}</span>
                    <span>{{ saving ? 'Updating Password...' : 'Update Password' }}</span>
                  </button>
                  <span *ngIf="successMsg" class="success-banner">{{ successMsg }}</span>
                  <span *ngIf="errorMsg" class="error-banner">{{ errorMsg }}</span>
                </div>
              </form>
            </div>
          </section>
        </div>

        <!-- Right Column -->
        <div class="sec-column">
          <!-- Card 2: Multi-Factor Authentication (2FA) -->
          <section class="sec-card animate-fade">
            <div class="card-head">
              <div class="head-title-wrap">
                <span class="material-symbols-outlined head-icon text-blue">shield_lock</span>
                <h2 class="card-title">Multi-Factor Authentication (2FA)</h2>
              </div>
              <span class="status-pill" [class.good]="mfaEnabled" [class.danger]="!mfaEnabled">
                {{ mfaEnabled ? 'Enforced' : 'Disabled' }}
              </span>
            </div>
            <div class="card-body">
              <p class="section-desc-text">Configure a verification provider to secure your account. You can configure exactly one active preferred method.</p>

              <!-- State 1: Selection Form -->
              <div class="mfa-selection-group" *ngIf="setupStep === 'idle'">
                <div class="mfa-option-row" [class.selected]="selectedProvider === 'None'" (click)="selectedProvider = 'None'">
                  <input type="radio" name="mfaOpt" [value]="'None'" [(ngModel)]="selectedProvider" />
                  <div class="mfa-opt-meta">
                    <div class="mfa-opt-title">No Two-Factor (None)</div>
                    <div class="mfa-opt-desc">Log in using password only. Not recommended.</div>
                  </div>
                </div>

                <div class="mfa-option-row" [class.selected]="selectedProvider === 'GoogleAuthenticator'" (click)="selectedProvider = 'GoogleAuthenticator'">
                  <input type="radio" name="mfaOpt" [value]="'GoogleAuthenticator'" [(ngModel)]="selectedProvider" />
                  <div class="mfa-opt-meta">
                    <div class="mfa-opt-title">Google Authenticator</div>
                    <div class="mfa-opt-desc">Generate verification codes using the Google Authenticator app.</div>
                  </div>
                </div>

                <div class="mfa-option-row" [class.selected]="selectedProvider === 'MicrosoftAuthenticator'" (click)="selectedProvider = 'MicrosoftAuthenticator'">
                  <input type="radio" name="mfaOpt" [value]="'MicrosoftAuthenticator'" [(ngModel)]="selectedProvider" />
                  <div class="mfa-opt-meta">
                    <div class="mfa-opt-title">Microsoft Authenticator</div>
                    <div class="mfa-opt-desc">Generate verification codes using the Microsoft Authenticator app.</div>
                  </div>
                </div>

                <div class="mfa-option-row" [class.selected]="selectedProvider === 'Email'" (click)="selectedProvider = 'Email'">
                  <input type="radio" name="mfaOpt" [value]="'Email'" [(ngModel)]="selectedProvider" />
                  <div class="mfa-opt-meta">
                    <div class="mfa-opt-title">Email Verification Code</div>
                    <div class="mfa-opt-desc">Receive a 6-digit one-time passcode in your email inbox.</div>
                  </div>
                </div>

                <div class="mfa-option-row" [class.selected]="selectedProvider === 'SMS'" (click)="selectedProvider = 'SMS'">
                  <input type="radio" name="mfaOpt" [value]="'SMS'" [(ngModel)]="selectedProvider" />
                  <div class="mfa-opt-meta">
                    <div class="mfa-opt-title">SMS Verification Code</div>
                    <div class="mfa-opt-desc">Receive a 6-digit one-time passcode sent to your phone.</div>
                  </div>
                </div>

                <div class="mfa-action-btn-wrap">
                  <button type="button" class="btn-primary" (click)="startMfaSetup()" [disabled]="isConfiguring || selectedProvider === currentProvider">
                    <span class="material-symbols-outlined" *ngIf="!isConfiguring">settings_accessibility</span>
                    <span>{{ selectedProvider === 'None' ? 'Disable 2FA' : 'Configure Method' }}</span>
                  </button>
                </div>
              </div>

              <!-- State 2: Verification/Setup Challenge -->
              <div class="mfa-setup-challenge" *ngIf="setupStep === 'setup'">
                <div class="challenge-alert">
                  <span class="material-symbols-outlined">info</span>
                  <span>Verification required to complete configuration.</span>
                </div>

                <div class="auth-setup-details" *ngIf="selectedProvider === 'GoogleAuthenticator' || selectedProvider === 'MicrosoftAuthenticator'">
                  <p class="setup-instructions">
                    Scan this QR barcode with your Authenticator app, or enter the secret key manually:
                  </p>
                  
                  <div class="qr-container" *ngIf="qrCodeUrl">
                    <img [src]="getQrImageUrl()" alt="MFA QR Barcode" class="qr-code-img" />
                  </div>

                  <div class="secret-key-box">
                    <code>{{ secretKey }}</code>
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
                  <input type="text" [(ngModel)]="verificationCode" placeholder="000000" maxlength="6" class="form-input code-input-field" />
                </div>

                <div class="challenge-actions">
                  <button type="button" class="btn-secondary" (click)="cancelMfaSetup()">Cancel</button>
                  <button type="button" class="btn-primary" (click)="verifyMfaSetup()" [disabled]="isVerifying || verificationCode.trim().length !== 6">
                    <span class="material-symbols-outlined" *ngIf="!isVerifying">verified</span>
                    <span>Verify & Enable</span>
                  </button>
                </div>
              </div>

              <!-- State 3: Backup Recovery Codes -->
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
                  <button type="button" class="btn-primary" (click)="finishMfaVerifiedFlow()">Done</button>
                </div>
              </div>
            </div>
          </section>

          <!-- Card 3: Verification Status Badges -->
          <section class="sec-card animate-fade">
            <div class="card-head">
              <div class="head-title-wrap">
                <span class="material-symbols-outlined head-icon text-green">verified_user</span>
                <h2 class="card-title">Identity Verification Badges</h2>
              </div>
            </div>
            <div class="card-body">
              <div class="verify-row">
                <div class="verify-icon bg-green">
                  <span class="material-symbols-outlined">mail</span>
                </div>
                <div class="verify-info">
                  <div class="verify-title">Email Verification</div>
                  <div class="verify-desc">{{ userEmail }}</div>
                </div>
                <span class="status-pill good">
                  <span class="material-symbols-outlined">check_circle</span>
                  Verified
                </span>
              </div>

              <div class="verify-row">
                <div class="verify-icon bg-blue">
                  <span class="material-symbols-outlined">phone_android</span>
                </div>
                <div class="verify-info">
                  <div class="verify-title">Phone Number Verification</div>
                  <div class="verify-desc">SMS Two-Factor Authentication</div>
                </div>
                <span class="status-pill good">
                  <span class="material-symbols-outlined">check_circle</span>
                  Active
                </span>
              </div>

              <div class="verify-row">
                <div class="verify-icon bg-purple">
                  <span class="material-symbols-outlined">devices</span>
                </div>
                <div class="verify-info">
                  <div class="verify-title">Current Session</div>
                  <div class="verify-desc">Chrome on Windows (Active)</div>
                </div>
                <span class="status-pill blue">This Device</span>
              </div>
            </div>
          </section>

          <!-- Card 4: Connected Devices & Sessions -->
          <section class="sec-card animate-fade">
            <div class="card-head">
              <div class="head-title-wrap">
                <span class="material-symbols-outlined head-icon text-red">devices</span>
                <h2 class="card-title">Connected Devices & Sessions</h2>
              </div>
              <span class="status-pill blue">{{ activeSessions.length }} Active</span>
            </div>
            <div class="card-body">
              <p class="section-desc-text">You are currently logged in from these browsers/devices. You can remotely terminate any session below.</p>
              
              <div class="sessions-list-container">
                <div class="session-item-row" *ngFor="let session of activeSessions">
                  <div class="session-device-icon-wrapper">
                    <span class="material-symbols-outlined">desktop_windows</span>
                  </div>
                  <div class="session-item-details">
                    <div class="session-device-title-line">
                      <span class="session-device-name">{{ session.device }}</span>
                    </div>
                    <div class="session-device-meta-line">
                      <span>IP: {{ session.ipAddress }}</span>
                      <span class="meta-dot">•</span>
                      <span>Active: {{ session.lastActive | date:'short' }}</span>
                    </div>
                  </div>
                  <div class="session-action-btn">
                    <button type="button" class="btn-revoke" (click)="revokeSession(session.sessionId)" [disabled]="isRevoking">
                      <span class="material-symbols-outlined" style="font-size: 18px;">logout</span>
                      <span>Revoke</span>
                    </button>
                  </div>
                </div>
                
                <div class="empty-state-small" *ngIf="activeSessions.length === 0">
                  <span>No active device sessions found.</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .security-container { display: flex; flex-direction: column; gap: 20px; }
    .page-header { margin-bottom: 4px; }
    .page-title { font-size: 22px; font-weight: 800; color: var(--md-sys-color-on-surface, #0f172a); margin: 0 0 4px; }
    .page-sub { font-size: 13px; color: #64748b; margin: 0; }
    
    .security-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      align-items: start;
    }
    @media (max-width: 860px) {
      .security-grid { grid-template-columns: 1fr; }
    }

    .sec-column {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .sec-card {
      background: var(--md-sys-color-surface, #ffffff);
      border: 1px solid var(--md-sys-color-outline, #e2e8f0);
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
    }
    .card-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      border-bottom: 1px solid var(--md-sys-color-outline, #e2e8f0);
      padding-bottom: 14px;
    }
    .head-title-wrap { display: flex; align-items: center; gap: 8px; }
    .head-icon { font-size: 22px; }
    .card-title { font-size: 16px; font-weight: 800; color: var(--md-sys-color-on-surface, #0f172a); margin: 0; }
    
    .section-desc-text {
      font-size: 13px;
      color: #64748b;
      margin-top: 0;
      margin-bottom: 20px;
      line-height: 1.5;
    }

    .form-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
    .form-group label {
      font-size: 12px;
      font-weight: 700;
      color: var(--md-sys-color-on-surface, #334155);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .password-input-wrap { position: relative; display: flex; align-items: center; }
    .password-input-wrap input { width: 100%; padding-right: 40px; }
    .eye-btn {
      position: absolute;
      right: 10px;
      background: none;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4px;
    }
    .eye-btn:hover { color: #0050e5; }
    .eye-btn span { font-size: 18px; }
    .form-input {
      padding: 10px 14px;
      border: 1px solid var(--md-sys-color-outline, #cbd5e1);
      border-radius: 8px;
      font-size: 13.5px;
      color: var(--md-sys-color-on-surface, #0f172a);
      background: var(--md-sys-color-surface-variant, #f8fafc);
      box-sizing: border-box;
      outline: none;
      transition: all 0.2s;
      width: 100%;
    }
    .form-input:focus {
      border-color: #0050e5;
      background: #ffffff;
      box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.1);
    }
    .complexity-checklist {
      background: var(--md-sys-color-surface-variant, #f8fafc);
      border: 1px solid var(--md-sys-color-outline, #e2e8f0);
      border-radius: 10px;
      padding: 12px 14px;
      margin-bottom: 16px;
    }
    .checklist-title { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 8px; }
    .pill-grid { display: flex; flex-wrap: wrap; gap: 6px; }
    .rule-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11.5px;
      color: #94a3b8;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      padding: 3px 8px;
      border-radius: 6px;
      font-weight: 600;
      transition: all 0.2s;
    }
    .rule-pill span.material-symbols-outlined { font-size: 13px; }
    .rule-pill.passed {
      color: #15803d;
      background: #dcfce7;
      border-color: #86efac;
    }
    .form-actions { display: flex; align-items: center; gap: 14px; margin-top: 20px; }
    
    .btn-primary {
      background: linear-gradient(135deg, #0050e5, #1f6bff);
      color: #ffffff;
      border: none;
      border-radius: 8px;
      padding: 11px 22px;
      font-size: 13.5px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 4px 12px rgba(0, 80, 229, 0.25);
      transition: all 0.2s;
    }
    .btn-primary:hover:not(:disabled) { transform: translateY(-1px); }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .success-banner { color: #16a34a; font-size: 13px; font-weight: 700; }
    .error-banner { color: #ef4444; font-size: 13px; font-weight: 700; }
    
    .verify-row {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 0;
      border-bottom: 1px solid var(--md-sys-color-outline, #f1f5f9);
    }
    .verify-row:last-child { border-bottom: none; }
    .verify-icon {
      width: 42px;
      height: 42px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .bg-green { background: rgba(34, 197, 94, 0.12); color: #16a34a; }
    .bg-blue { background: rgba(0, 80, 229, 0.12); color: #0050e5; }
    .bg-purple { background: rgba(168, 85, 247, 0.12); color: #9333ea; }
    .verify-info { flex: 1; min-width: 0; }
    .verify-title { font-size: 13.5px; font-weight: 700; color: var(--md-sys-color-on-surface, #0f172a); }
    .verify-desc { font-size: 12px; color: #64748b; margin-top: 2px; }
    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
    }
    .status-pill.good { background: rgba(34, 197, 94, 0.12); color: #16a34a; }
    .status-pill.danger { background: rgba(239, 68, 68, 0.12); color: #ef4444; }
    .status-pill.blue { background: rgba(0, 80, 229, 0.12); color: #0050e5; }
    .status-pill span { font-size: 14px; }
    .text-primary { color: #0050e5; }
    .text-green { color: #16a34a; }
    .text-blue { color: #0050e5; }
    .text-red { color: #ef4444; }

    /* MFA preferences styles */
    .mfa-selection-group { display: flex; flex-direction: column; gap: 12px; }
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
    .mfa-option-row:hover { background: #f8fafc; border-color: #cbd5e1; }
    .mfa-option-row.selected { background: rgba(0, 80, 229, 0.04); border-color: #0050e5; }
    .mfa-opt-meta { display: flex; flex-direction: column; gap: 2px; }
    .mfa-opt-title { font-size: 13.5px; font-weight: 700; color: #1e293b; }
    .mfa-opt-desc { font-size: 11.5px; color: #64748b; line-height: 1.4; }
    .mfa-action-btn-wrap { display: flex; justify-content: flex-end; margin-top: 8px; }
    
    .mfa-setup-challenge { display: flex; flex-direction: column; gap: 16px; }
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
    .auth-setup-details { display: flex; flex-direction: column; gap: 12px; }
    .setup-instructions { font-size: 12.5px; color: #334155; line-height: 1.4; }
    .secret-key-box {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 12px;
      text-align: center;
      font-size: 16px;
      font-weight: 800;
      letter-spacing: 1px;
      color: #0f172a;
    }
    .qr-placeholder-text { text-align: center; font-size: 11.5px; color: #64748b; }
    
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
      box-shadow: 0 4px 12px rgba(0,0,0,0.03);
    }
    .qr-code-img {
      width: 180px;
      height: 180px;
      display: block;
    }

    .code-input-field { text-align: center; font-size: 20px; font-weight: 800; letter-spacing: 4px; padding: 10px; }
    .challenge-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px; }
    .btn-secondary {
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 10px 18px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
    }
    .btn-secondary:hover { background: #e2e8f0; }

    .mfa-verified-step { display: flex; flex-direction: column; gap: 16px; }
    .success-header { display: flex; align-items: center; gap: 10px; }
    .success-header h3 { margin: 0; font-size: 16px; font-weight: 800; color: #16a34a; }
    .backup-note { font-size: 12.5px; color: #475569; line-height: 1.5; margin: 0; }
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
      color: #0f172a;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      padding: 6px;
      border-radius: 6px;
    }
    .verified-done-wrap { display: flex; justify-content: flex-end; }

    /* Connected devices styles */
    .sessions-list-container { display: flex; flex-direction: column; gap: 12px; }
    .session-item-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      background: #ffffff;
    }
    .session-device-icon-wrapper {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: #f1f5f9;
      color: #475569;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .session-item-details { flex: 1; min-width: 0; }
    .session-device-name { font-size: 13px; font-weight: 700; color: #1e293b; }
    .session-device-meta-line { font-size: 11.5px; color: #64748b; margin-top: 3px; display: flex; align-items: center; gap: 6px; }
    .meta-dot { color: #cbd5e1; }
    .btn-revoke {
      background: #fff;
      border: 1px solid #ef4444;
      color: #ef4444;
      border-radius: 6px;
      padding: 6px 12px;
      font-size: 11.5px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      transition: all 0.2s;
    }
    .btn-revoke:hover:not(:disabled) { background: #fef2f2; }
    .btn-revoke:disabled { opacity: 0.5; cursor: not-allowed; }
    .empty-state-small { text-align: center; padding: 20px; color: #94a3b8; font-size: 12.5px; }

    .animate-fade {
      animation: fadeIn 0.25s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class WorkspaceSecurityComponent implements OnInit {
  userEmail = localStorage.getItem('user_email') || 'member@domain.com';
  oldPassword = '';
  newPassword = '';
  confirmPassword = '';
  showCurrent = false;
  showNew = false;
  saving = false;
  successMsg = '';
  errorMsg = '';

  hasMinLength = false;
  hasUpper = false;
  hasLower = false;
  hasNumber = false;
  hasSpecial = false;

  // MFA properties
  mfaEnabled = false;
  currentProvider = 'None';
  selectedProvider = 'None';
  setupStep = 'idle'; // 'idle', 'setup', 'verified'
  verificationCode = '';
  secretKey = '';
  qrCodeUrl = '';
  backupCodes: string[] = [];

  isConfiguring = false;
  isVerifying = false;

  // Connected devices properties
  activeSessions: any[] = [];
  isRevoking = false;

  constructor(private api: ApiService, private toast: ToastService) {}

  ngOnInit(): void {
    this.loadMfaStatus();
    this.loadActiveSessions();
  }

  loadMfaStatus(): void {
    this.api.get<any>('Auth/mfa').subscribe({
      next: (res) => {
        if (res && res.data) {
          this.mfaEnabled = res.data.mfaEnabled;
          this.currentProvider = res.data.provider;
          this.selectedProvider = res.data.provider;
        }
      },
      error: (err) => {
        console.error('Failed to load MFA status', err);
      }
    });
  }

  loadActiveSessions(): void {
    this.api.get<any>('IdentityApi/sessions').subscribe({
      next: (res) => {
        if (res && res.data) {
          this.activeSessions = res.data;
        }
      },
      error: (err) => {
        console.error('Failed to load active sessions', err);
      }
    });
  }

  revokeSession(sessionId: string): void {
    this.isRevoking = true;
    this.api.delete<any>(`IdentityApi/sessions/${sessionId}`).subscribe({
      next: () => {
        this.isRevoking = false;
        this.toast.success('Device session revoked successfully.', 'Session Terminated');
        this.loadActiveSessions();
      },
      error: (err) => {
        this.isRevoking = false;
        this.toast.error(err?.error?.message || 'Failed to terminate session.', 'Revoke Error');
      }
    });
  }

  startMfaSetup(): void {
    if (this.selectedProvider === 'None') {
      this.disableMfa();
      return;
    }

    this.isConfiguring = true;
    this.api.post<any>('Auth/mfa/configure', { provider: this.selectedProvider }).subscribe({
      next: (res) => {
        this.isConfiguring = false;
        if (res && res.data) {
          this.secretKey = res.data.secretKey || '';
          this.qrCodeUrl = res.data.qrCodeUrl || '';
        }
        this.verificationCode = '';
        this.setupStep = 'setup';
        this.toast.info(`Please complete verification to enable ${this.selectedProvider}.`, 'Verification Enqueued');
      },
      error: (err) => {
        this.isConfiguring = false;
        this.toast.error(err?.error?.message || 'Failed to initiate MFA configuration.', 'MFA Setup Error');
      }
    });
  }

  verifyMfaSetup(): void {
    if (!this.verificationCode || this.verificationCode.trim().length !== 6) return;
    this.isVerifying = true;

    this.api.post<any>('Auth/mfa/verify', {
      provider: this.selectedProvider,
      code: this.verificationCode
    }).subscribe({
      next: (res) => {
        this.isVerifying = false;
        this.mfaEnabled = true;
        this.currentProvider = this.selectedProvider;
        this.backupCodes = res?.data?.backupCodes || [];
        this.setupStep = 'verified';
        this.toast.success('Two-factor authentication successfully configured and verified.', 'MFA Enforced');
      },
      error: (err) => {
        this.isVerifying = false;
        this.toast.error(err?.error?.message || 'Incorrect or expired verification code.', 'Verification Failed');
      }
    });
  }

  cancelMfaSetup(): void {
    this.setupStep = 'idle';
    this.selectedProvider = this.currentProvider;
    this.verificationCode = '';
    this.secretKey = '';
    this.qrCodeUrl = '';
  }

  disableMfa(): void {
    this.isConfiguring = true;
    this.api.post<any>('Auth/mfa/configure', { provider: 'None' }).subscribe({
      next: () => {
        this.isConfiguring = false;
        this.mfaEnabled = false;
        this.currentProvider = 'None';
        this.selectedProvider = 'None';
        this.setupStep = 'idle';
        this.toast.success('Two-Factor authentication successfully disabled.', 'MFA Disabled');
      },
      error: (err) => {
        this.isConfiguring = false;
        this.toast.error(err?.error?.message || 'Failed to disable Two-Factor authentication.', 'Error');
      }
    });
  }

  finishMfaVerifiedFlow(): void {
    this.setupStep = 'idle';
    this.verificationCode = '';
    this.secretKey = '';
    this.qrCodeUrl = '';
    this.backupCodes = [];
    this.loadMfaStatus();
  }

  getQrImageUrl(): string {
    if (!this.qrCodeUrl) return '';
    return 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=' + encodeURIComponent(this.qrCodeUrl);
  }

  evaluateComplexity(): void {
    const pwd = this.newPassword || '';
    this.hasMinLength = pwd.length >= 8;
    this.hasUpper = /[A-Z]/.test(pwd);
    this.hasLower = /[a-z]/.test(pwd);
    this.hasNumber = /[0-9]/.test(pwd);
    this.hasSpecial = /[^a-zA-Z0-9]/.test(pwd);
  }

  isComplexitySatisfied(): boolean {
    return this.hasMinLength && this.hasUpper && this.hasLower && this.hasNumber && this.hasSpecial;
  }

  changePassword(): void {
    if (this.newPassword !== this.confirmPassword) {
      this.errorMsg = 'New passwords do not match.';
      return;
    }
    if (!this.isComplexitySatisfied()) {
      this.errorMsg = 'Password does not meet the complexity requirements.';
      return;
    }

    this.saving = true;
    this.successMsg = '';
    this.errorMsg = '';

    this.api.post<any>('Auth/force-change-password', {
      oldPassword: this.oldPassword,
      newPassword: this.newPassword
    }).subscribe({
      next: () => {
        this.saving = false;
        this.toast.success('Password updated successfully!', 'Security Saved');
        this.oldPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
        this.evaluateComplexity();
      },
      error: (err) => {
        this.saving = false;
        this.toast.error(err?.error?.message || 'Failed to change password. Verify your current password.', 'Error');
      }
    });
  }
}
