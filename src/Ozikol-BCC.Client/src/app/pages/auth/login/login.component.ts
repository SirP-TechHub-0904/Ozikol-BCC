import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { TenantStateService } from '../../../core/services/tenant-state.service';
import { MultiWorkspaceService } from '../../../core/services/multi-workspace.service';
import { getReturnUrlForRole, getStoredUserRoles, canAccessRoute } from '../../../core/utils/user-role.utils';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="login-container">
      <!-- Dedicated Workspace Not Found State -->
      <div class="login-card" *ngIf="workspaceNotFound" style="text-align: center; padding: 48px 32px;">
        <div class="brand-avatar" style="margin: 0 auto 18px; width: 64px; height: 64px; background: #fef2f2; border: 1.5px solid #fecaca; border-radius: 18px; display: flex; align-items: center; justify-content: center;">
          <span class="material-symbols-outlined" style="font-size: 32px; color: #dc2626;">domain_disabled</span>
        </div>
        <h2 class="title" style="font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 6px;">Workspace not found.</h2>
      </div>

      <!-- Standard Login Card -->
      <div class="login-card" *ngIf="!workspaceNotFound">
        <!-- Logo & Header -->
        <div class="card-header">
          <!-- Official Brand Logo if uploaded, or Brand Name if logo is null -->
          <div class="brand-identity-row">
            <img 
              *ngIf="brandLogoUrl && !logoLoadFailed" 
              [src]="brandLogoUrl" 
              [alt]="brandCompanyName || 'Workspace'" 
              class="brand-logo-top" 
              (error)="logoLoadFailed = true"
            />
            <span *ngIf="!brandLogoUrl || logoLoadFailed" class="brand-company-title">
              {{ brandCompanyName || 'Workspace' }}
            </span>
          </div>

          <h2 class="title">{{ loginTitle || 'Sign In' }}</h2>
          <p class="subtitle" *ngIf="loginNote">{{ loginNote }}</p>
        </div>

        <!-- Alert Error Banner -->
        <div *ngIf="errorMessage" class="error-banner">
          <span class="material-symbols-outlined">error</span>
          <span>{{ errorMessage }}</span>
        </div>

        <!-- Form -->
        <form (ngSubmit)="onLogin()" method="post" action="javascript:void(0);" class="login-form">
          <div class="form-group">
            <label for="email">Email Address</label>
            <div class="input-wrapper">
              <span class="material-symbols-outlined input-icon">mail</span>
              <input
                id="email"
                type="email"
                name="email"
                [(ngModel)]="email"
                placeholder="name@example.com"
                required
                autocomplete="username"
              />
            </div>
          </div>

          <div class="form-group">
            <div class="label-row">
              <label for="password">Password</label>
              <a routerLink="/auth/reset-password" class="forgot-link">Forgot password?</a>
            </div>
            <div class="input-wrapper">
              <span class="material-symbols-outlined input-icon">key</span>
              <input
                id="password"
                [type]="showPassword ? 'text' : 'password'"
                name="password"
                [(ngModel)]="password"
                placeholder="••••••••••••"
                required
                autocomplete="current-password"
              />
              <button
                type="button"
                class="toggle-pwd-btn"
                (click)="showPassword = !showPassword"
                tabindex="-1"
              >
                <span class="material-symbols-outlined">
                  {{ showPassword ? 'visibility_off' : 'visibility' }}
                </span>
              </button>
            </div>
          </div>

          <!-- Remember Me -->
          <div class="remember-row">
            <label class="remember-label">
              <input type="checkbox" [(ngModel)]="rememberMe" name="rememberMe" />
              <span>Remember this device</span>
            </label>
          </div>

          <button type="submit" [disabled]="loading" class="btn-submit">
            <span *ngIf="loading" class="spinner"></span>
            <span *ngIf="!loading" class="material-symbols-outlined">login</span>
            <span>{{ loading ? 'Authenticating...' : (loginButtonText || 'Sign In') }}</span>
          </button>
        </form>

        <div class="card-footer">
          <p class="signup-prompt" *ngIf="allowPublicRegistration">Need a new account? <a routerLink="/auth/register" class="register-link">Register here</a></p>
          <a routerLink="/" class="back-link">
            <span class="material-symbols-outlined">arrow_back</span>
            Return to Home
          </a>
        </div>
      </div>

      <!-- Forced First-Time Password Change Modal -->
      <div class="modal-backdrop" *ngIf="showForceChangeModal">
        <div class="modal-card force-change-card" (click)="$event.stopPropagation()">
          <div class="force-modal-header">
            <!-- Brand Identity: Logo or Company Name -->
            <div class="brand-identity-row" style="margin-bottom: 14px;">
              <img 
                *ngIf="brandLogoUrl && !logoLoadFailed" 
                [src]="brandLogoUrl" 
                [alt]="brandCompanyName || 'Workspace'" 
                class="brand-logo-top" 
                (error)="logoLoadFailed = true"
              />
              <span *ngIf="!brandLogoUrl || logoLoadFailed" class="brand-company-title">
                {{ brandCompanyName || 'Workspace' }}
              </span>
            </div>
            <div class="force-modal-avatar">
              <span class="material-symbols-outlined">lock_reset</span>
            </div>
            <h3 class="force-modal-title">Temporary Password Detected</h3>
            <p class="force-modal-subtitle">For your security, please update your temporary credentials to a permanent password before accessing the portal.</p>
          </div>

          <div *ngIf="forceChangeError" class="force-error-banner">
            <span class="material-symbols-outlined">error</span>
            <span>{{ forceChangeError }}</span>
          </div>

          <form (ngSubmit)="onForceChangePassword()" class="force-modal-form">
            <div class="force-form-group">
              <label class="force-label">New Permanent Password *</label>
              <div class="force-input-wrapper">
                <span class="material-symbols-outlined force-input-icon">key</span>
                <input [type]="showNewPassword ? 'text' : 'password'" [(ngModel)]="newPermanentPassword" name="newPermanentPassword" placeholder="Enter new permanent password" required />
                <button type="button" class="force-toggle-pwd-btn" (click)="showNewPassword = !showNewPassword">
                  <span class="material-symbols-outlined">{{ showNewPassword ? 'visibility_off' : 'visibility' }}</span>
                </button>
              </div>
            </div>

            <!-- Live Password Complexity Checklist -->
            <div class="password-rules-box">
              <span class="rules-box-title">Password Complexity Requirements:</span>
              <div class="rules-list">
                <div class="rule-chip" [class.rule-passed]="newPermanentPassword.length >= 8">
                  <span class="material-symbols-outlined rule-icon">{{ newPermanentPassword.length >= 8 ? 'check_circle' : 'radio_button_unchecked' }}</span>
                  <span>8+ Chars</span>
                </div>
                <div class="rule-chip" [class.rule-passed]="hasUpperCase()">
                  <span class="material-symbols-outlined rule-icon">{{ hasUpperCase() ? 'check_circle' : 'radio_button_unchecked' }}</span>
                  <span>Uppercase (A-Z)</span>
                </div>
                <div class="rule-chip" [class.rule-passed]="hasLowerCase()">
                  <span class="material-symbols-outlined rule-icon">{{ hasLowerCase() ? 'check_circle' : 'radio_button_unchecked' }}</span>
                  <span>Lowercase (a-z)</span>
                </div>
                <div class="rule-chip" [class.rule-passed]="hasNumber()">
                  <span class="material-symbols-outlined rule-icon">{{ hasNumber() ? 'check_circle' : 'radio_button_unchecked' }}</span>
                  <span>Number (0-9)</span>
                </div>
                <div class="rule-chip" [class.rule-passed]="hasSpecial()">
                  <span class="material-symbols-outlined rule-icon">{{ hasSpecial() ? 'check_circle' : 'radio_button_unchecked' }}</span>
                  <span>Special (!&#64;#$...)</span>
                </div>
              </div>
            </div>

            <div class="force-form-group">
              <label class="force-label">Confirm Permanent Password *</label>
              <div class="force-input-wrapper">
                <span class="material-symbols-outlined force-input-icon">check_circle</span>
                <input [type]="showNewPassword ? 'text' : 'password'" [(ngModel)]="confirmPermanentPassword" name="confirmPermanentPassword" placeholder="Confirm new permanent password" required />
              </div>
              <div *ngIf="confirmPermanentPassword && newPermanentPassword !== confirmPermanentPassword" class="password-mismatch-hint">
                <span class="material-symbols-outlined" style="font-size:14px;">warning</span>
                <span>Passwords do not match</span>
              </div>
            </div>

            <button type="submit" [disabled]="forceChangeLoading || !isPasswordValid()" class="force-btn-submit">
              <span *ngIf="forceChangeLoading" class="spinner"></span>
              <span *ngIf="!forceChangeLoading" class="material-symbols-outlined">verified_user</span>
              <span>{{ forceChangeLoading ? 'Updating Password...' : 'Save & Enter Dashboard' }}</span>
            </button>
          </form>
        </div>
      </div>

      <!-- Unverified Email OTP Verification Modal -->
      <div class="modal-backdrop" *ngIf="showOtpVerifyModal">
        <div class="modal-card force-change-card" (click)="$event.stopPropagation()">
          <div class="force-modal-header">
            <!-- Brand Identity: Logo or Company Name -->
            <div class="brand-identity-row" style="margin-bottom: 14px;">
              <img 
                *ngIf="brandLogoUrl && !logoLoadFailed" 
                [src]="brandLogoUrl" 
                [alt]="brandCompanyName || 'Workspace'" 
                class="brand-logo-top" 
                (error)="logoLoadFailed = true"
              />
              <span *ngIf="!brandLogoUrl || logoLoadFailed" class="brand-company-title">
                {{ brandCompanyName || 'Workspace' }}
              </span>
            </div>
            <div class="force-modal-avatar">
              <span class="material-symbols-outlined">mark_email_unread</span>
            </div>
            <h3 class="force-modal-title">Verify Email Address</h3>
            <p class="force-modal-subtitle">A 6-digit verification OTP code was sent to <strong>{{ email }}</strong>. Enter the code below to verify your account.</p>
          </div>

          <div *ngIf="otpError" class="force-error-banner">
            <span class="material-symbols-outlined">error</span>
            <span>{{ otpError }}</span>
          </div>

          <form (ngSubmit)="onVerifyOtp()" class="force-modal-form">
            <div class="force-form-group">
              <label class="force-label">6-Digit Verification Code</label>
              <div class="force-input-wrapper">
                <span class="material-symbols-outlined force-input-icon">pin</span>
                <input type="text" maxlength="6" [(ngModel)]="otpCode" name="otpCode" placeholder="123456" style="letter-spacing:4px; font-size:18px; font-weight:700; text-align:center;" required />
              </div>
            </div>

            <button type="submit" [disabled]="otpLoading || otpCode.length < 6" class="force-btn-submit">
              <span *ngIf="otpLoading" class="spinner"></span>
              <span *ngIf="!otpLoading" class="material-symbols-outlined">check</span>
              <span>{{ otpLoading ? 'Verifying...' : 'Verify & Continue' }}</span>
            </button>

            <button 
              type="button" 
              class="btn-resend-otp" 
              (click)="onRequestNewOtp()" 
              [disabled]="otpResendLoading || otpResendCountdown > 0"
              style="margin: 4px auto; display: flex; align-items: center; justify-content: center; gap: 6px;"
            >
              <span *ngIf="otpResendLoading" class="spinner" style="width:14px; height:14px; border-width:2px;"></span>
              <span *ngIf="!otpResendLoading" class="material-symbols-outlined" style="font-size:16px;">autorenew</span>
              <span *ngIf="otpResendCountdown > 0">Resend Code in {{ otpResendCountdown }}s</span>
              <span *ngIf="otpResendCountdown === 0 && !otpResendLoading">Didn't receive code? Resend Code</span>
            </button>

            <button 
              type="button" 
              class="btn-back-login" 
              (click)="showOtpVerifyModal = false; otpCode = ''; otpError = '';"
              style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 16px; border-radius: 10px; font-weight: 600; font-size: 14px; background: #f8fafc; color: #475569; border: 1.5px solid #cbd5e1; cursor: pointer; transition: all 0.2s ease; margin-top: 6px; box-sizing: border-box;"
            >
              <span class="material-symbols-outlined" style="font-size: 18px; color: #0050e5;">arrow_back</span>
              <span>Back to Login</span>
            </button>
          </form>
        </div>
      </div>

      <!-- MFA OTP Verification Modal -->
      <div class="modal-backdrop" *ngIf="showMfaModal">
        <div class="modal-card force-change-card" (click)="$event.stopPropagation()">
          <div class="force-modal-header">
            <!-- Brand Identity: Logo or Company Name -->
            <div class="brand-identity-row" style="margin-bottom: 14px;">
              <img 
                *ngIf="brandLogoUrl && !logoLoadFailed" 
                [src]="brandLogoUrl" 
                [alt]="brandCompanyName || 'Workspace'" 
                class="brand-logo-top" 
                (error)="logoLoadFailed = true"
              />
              <span *ngIf="!brandLogoUrl || logoLoadFailed" class="brand-company-title">
                {{ brandCompanyName || 'Workspace' }}
              </span>
            </div>
            <div class="force-modal-avatar" style="background:#0050e5; border-radius: 50%; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center;">
              <span class="material-symbols-outlined" style="color:#fff; font-size:28px;">security</span>
            </div>
            <h3 class="force-modal-title" style="margin-top: 10px;">Two-Factor Verification</h3>
            <p class="force-modal-subtitle">
              Your account requires MFA. Enter the verification code from your <strong>{{ mfaProviderLabel }}</strong>.
            </p>
          </div>

          <div *ngIf="mfaSuccessMessage" style="background:#ecfdf5; border:1px solid #a7f3d0; color:#065f46; border-radius:10px; padding:10px 14px; font-size:13px; display:flex; align-items:center; gap:8px; margin-bottom:14px;">
            <span class="material-symbols-outlined" style="color:#059669; font-size:18px;">check_circle</span>
            <span>{{ mfaSuccessMessage }}</span>
          </div>

          <div *ngIf="mfaError" class="force-error-banner">
            <span class="material-symbols-outlined">error</span>
            <span>{{ mfaError }}</span>
          </div>

          <form (ngSubmit)="onVerifyLoginMfa()" class="force-modal-form">
            <div class="force-form-group">
              <label class="force-label">Verification Code / Backup Recovery Key</label>
              <div class="force-input-wrapper">
                <span class="material-symbols-outlined force-input-icon">pin</span>
                <input 
                  type="text" 
                  [(ngModel)]="mfaCode" 
                  name="mfaCode" 
                  placeholder="6-digit code or backup key" 
                  style="letter-spacing:2px; font-size:16px; font-weight:700; text-align:center;" 
                  required 
                />
              </div>
            </div>

            <!-- Trust This Device Checkbox -->
            <div class="remember-row" style="margin-bottom:16px; display: flex; align-items: center;">
              <label class="remember-label" style="display: flex; align-items: center; gap: 8px; font-size: 13px; color: #94a3b8; cursor: pointer;">
                <input type="checkbox" [(ngModel)]="trustThisDevice" name="trustThisDevice" />
                <span>Trust this device for 30 days</span>
              </label>
            </div>

            <button type="submit" [disabled]="mfaLoading || !mfaCode || mfaCode.trim().length < 4" class="force-btn-submit" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px; border-radius: 8px; font-weight: 600; font-size: 14px; background: #0050e5; color: #fff; border: none; cursor: pointer; margin-bottom: 8px;">
              <span *ngIf="mfaLoading" class="spinner"></span>
              <span *ngIf="!mfaLoading" class="material-symbols-outlined">verified_user</span>
              <span>{{ mfaLoading ? 'Verifying...' : 'Verify & Sign In' }}</span>
            </button>

            <!-- 60-Second Cooldown Resend for SMS / Email Only -->
            <button 
              *ngIf="canResendMfaCode()"
              type="button" 
              class="btn-resend-otp" 
              (click)="onResendLoginMfa()" 
              [disabled]="mfaResendLoading || mfaResendCountdown > 0"
              style="margin: 2px auto 8px auto; display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 13px; background: none; border: none; color: #0050e5; cursor: pointer;"
            >
              <span *ngIf="mfaResendLoading" class="spinner" style="width:14px; height:14px; border-width:2px;"></span>
              <span *ngIf="!mfaResendLoading" class="material-symbols-outlined" style="font-size:16px;">autorenew</span>
              <span *ngIf="mfaResendCountdown > 0">Resend Code in {{ mfaResendCountdown }}s</span>
              <span *ngIf="mfaResendCountdown === 0 && !mfaResendLoading">Didn't receive code? Resend Code</span>
            </button>

            <!-- Tip for TOTP / Authenticator App Users -->
            <p *ngIf="!canResendMfaCode()" style="margin: 4px auto 10px auto; font-size: 12px; color: #64748b; text-align: center; line-height: 1.4;">
              Codes rotate automatically every 30 seconds in your app. You can also enter one of your single-use backup recovery keys.
            </p>

            <button 
              type="button" 
              class="btn-back-login" 
              (click)="cancelMfaAndReturnToLogin()"
              style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 16px; border-radius: 10px; font-weight: 600; font-size: 14px; background: #f8fafc; color: #475569; border: 1.5px solid #cbd5e1; cursor: pointer; transition: all 0.2s ease; margin-top: 4px; box-sizing: border-box;"
            >
              <span class="material-symbols-outlined" style="font-size: 18px; color: #0050e5;">arrow_back</span>
              <span>Back to Login</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      width: 100%;
      display: flex;
      justify-content: center;
      box-sizing: border-box;
      padding: 0;
    }
    .login-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      padding: 36px 32px;
      width: 100%;
      max-width: 440px;
      box-shadow: 0 20px 45px -12px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04);
      color: #0f172a;
      box-sizing: border-box;
    }
    .card-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      margin-bottom: 24px;
      width: 100%;
    }
    .brand-identity-row {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;
    }
    .brand-logo-top {
      max-height: 48px;
      max-width: 220px;
      object-fit: contain;
    }
    .brand-company-title {
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.02em;
    }
    .brand-avatar {
      width: 58px;
      height: 58px;
      border-radius: 16px;
      background: #eff6ff;
      border: 1.5px solid #dbeafe;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 14px;
      box-shadow: 0 4px 14px rgba(0, 80, 229, 0.08);
      overflow: hidden;
    }
    .brand-avatar span.material-symbols-outlined {
      font-size: 28px;
      color: #0050e5;
    }
    .brand-initials {
      font-size: 20px;
      font-weight: 800;
      color: #0050e5;
      letter-spacing: -0.02em;
    }
    .brand-logo-main {
      max-width: 44px;
      max-height: 44px;
      object-fit: contain;
    }
    .title {
      font-size: 22px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 6px;
      text-align: center;
    }
    .subtitle {
      font-size: 13.5px;
      color: #64748b;
      margin: 0;
      text-align: center;
      line-height: 1.45;
    }
    .error-banner {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #dc2626;
      padding: 11px 14px;
      border-radius: 10px;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 18px;
    }
    .login-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .label-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .form-group label {
      font-size: 11.5px;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .forgot-link {
      font-size: 12px;
      color: #0050e5;
      text-decoration: none;
      font-weight: 600;
    }
    .forgot-link:hover {
      text-decoration: underline;
    }
    .remember-row {
      display: flex;
      align-items: center;
      margin-top: -2px;
    }
    .remember-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #475569;
      cursor: pointer;
      user-select: none;
    }
    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }
    .input-icon {
      position: absolute;
      left: 14px;
      color: #94a3b8;
      font-size: 20px;
      pointer-events: none;
    }
    .input-wrapper input {
      width: 100%;
      background: #f8fafc;
      border: 1.5px solid #cbd5e1;
      border-radius: 10px;
      padding: 12px 42px 12px 44px;
      color: #0f172a;
      font-size: 14px;
      font-weight: 500;
      outline: none;
      box-sizing: border-box;
      transition: all 0.2s ease;
    }
    .input-wrapper input:focus {
      background: #ffffff;
      border-color: #0050e5;
      box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.15);
    }
    .toggle-pwd-btn {
      position: absolute;
      right: 12px;
      background: none;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      display: flex;
      align-items: center;
      padding: 4px;
    }
    .toggle-pwd-btn:hover {
      color: #0050e5;
    }
    .btn-submit {
      margin-top: 6px;
      background: linear-gradient(135deg, #0050e5, #1f6bff);
      color: #ffffff;
      border: none;
      border-radius: 10px;
      padding: 14px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s;
      box-shadow: 0 4px 14px rgba(0, 80, 229, 0.3);
    }
    .btn-submit:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(0, 80, 229, 0.4);
    }
    .btn-submit:disabled {
      opacity: 0.65;
      cursor: not-allowed;
    }
    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: #ffffff;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .card-footer {
      margin-top: 20px;
      text-align: center;
    }
    .signup-prompt { font-size: 13px; color: #64748b; margin: 0 0 10px; }
    .register-link { color: #0050e5; text-decoration: none; font-weight: 700; }
    .register-link:hover { text-decoration: underline; }
    .back-link {
      color: #64748b;
      font-size: 13px;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: color 0.15s;
    }
    .back-link:hover { color: #0050e5; }

    /* Modal Backdrop */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.8);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 99999;
      padding: 20px;
    }
    .modal-card.force-change-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      padding: 36px 32px;
      width: 100%;
      max-width: 440px;
      box-shadow: 0 25px 60px -12px rgba(15, 23, 42, 0.35);
      color: #0f172a;
      box-sizing: border-box;
    }
    .force-modal-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      margin-bottom: 24px;
    }
    .force-modal-avatar {
      width: 58px;
      height: 58px;
      border-radius: 16px;
      background: linear-gradient(135deg, #0050e5, #38bdf8);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 14px;
      box-shadow: 0 8px 24px rgba(0, 80, 229, 0.3);
    }
    .force-modal-avatar span {
      font-size: 30px;
      color: #ffffff;
    }
    .brand-logo-img {
      max-width: 44px;
      max-height: 44px;
      object-fit: contain;
      border-radius: 8px;
    }
    .force-modal-title {
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 6px;
      line-height: 1.3;
    }
    .force-modal-subtitle {
      font-size: 13px;
      color: #64748b;
      margin: 0;
      line-height: 1.5;
      max-width: 360px;
    }
    .force-error-banner {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #dc2626;
      padding: 11px 14px;
      border-radius: 10px;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 18px;
    }
    .force-modal-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .force-form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .force-label {
      font-size: 11.5px;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .force-input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }
    .force-input-icon {
      position: absolute;
      left: 14px;
      color: #0050e5;
      font-size: 20px;
      pointer-events: none;
    }
    .force-input-wrapper input {
      width: 100%;
      background: #f8fafc;
      border: 1.5px solid #cbd5e1;
      border-radius: 10px;
      padding: 12px 42px 12px 42px;
      color: #0f172a;
      font-size: 14px;
      font-weight: 500;
      outline: none;
      box-sizing: border-box;
      transition: all 0.2s ease;
    }
    .force-input-wrapper input:focus {
      background: #ffffff;
      border-color: #0050e5;
      box-shadow: 0 0 0 3.5px rgba(0, 80, 229, 0.15);
    }
    .force-toggle-pwd-btn {
      position: absolute;
      right: 12px;
      background: none;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      display: flex;
      align-items: center;
      padding: 4px;
      transition: color 0.15s;
    }
    .force-toggle-pwd-btn:hover {
      color: #0050e5;
    }
    .password-rules-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .rules-box-title {
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .rules-list {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .rule-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px;
      border-radius: 6px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      font-size: 11px;
      color: #64748b;
      font-weight: 500;
      transition: all 0.2s ease;
    }
    .rule-chip .rule-icon {
      font-size: 13px;
      color: #94a3b8;
    }
    .rule-chip.rule-passed {
      background: #dcfce7;
      border-color: #86efac;
      color: #15803d;
      font-weight: 700;
    }
    .rule-chip.rule-passed .rule-icon {
      color: #16a34a;
    }
    .password-mismatch-hint {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11.5px;
      color: #dc2626;
      font-weight: 600;
      margin-top: 4px;
    }
    .force-btn-submit {
      margin-top: 8px;
      background: linear-gradient(135deg, #0050e5, #1f6bff);
      color: #ffffff;
      border: none;
      border-radius: 10px;
      padding: 14px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      box-shadow: 0 4px 15px rgba(0, 80, 229, 0.35);
      transition: all 0.2s ease;
    }
    .force-btn-submit:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 6px 22px rgba(0, 80, 229, 0.45);
    }
    .force-btn-submit:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
    .btn-resend-otp {
      background: none;
      border: none;
      color: #0050e5;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      padding: 6px;
      text-align: center;
    }
    .btn-resend-otp:hover:not(:disabled) {
      text-decoration: underline;
    }
    .btn-back-login {
      background: #f8fafc !important;
      border: 1.5px solid #cbd5e1 !important;
      color: #475569 !important;
      border-radius: 10px !important;
      padding: 12px 16px !important;
      font-size: 14px !important;
      font-weight: 600 !important;
      cursor: pointer !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 8px !important;
      width: 100% !important;
      transition: all 0.2s ease !important;
      margin-top: 6px !important;
      box-sizing: border-box !important;
    }
    .btn-back-login:hover {
      background: #eff6ff !important;
      color: #0050e5 !important;
      border-color: #93c5fd !important;
      transform: translateY(-1px) !important;
      box-shadow: 0 4px 12px rgba(0, 80, 229, 0.12) !important;
    }
  `]
})
export class LoginComponent implements OnInit {
  email = '';
  password = '';
  rememberMe = true;
  showPassword = false;
  loading = false;
  errorMessage = '';
  workspaceNotFound = false;
  allowPublicRegistration = true;

  // Brand Logo, Icon & Name
  brandLogoUrl = '';
  brandIconUrl = '';
  brandCompanyName = '';
  brandInitials = '';
  logoLoadFailed = false;

  // Auth Settings & Dynamic Copy
  loginTitle = '';
  loginNote = '';
  loginButtonText = 'Sign In';
  loginNoteFooter = '';

  // Forced Password Change State
  showForceChangeModal = false;
  newPermanentPassword = '';
  confirmPermanentPassword = '';
  showNewPassword = false;
  forceChangeLoading = false;
  forceChangeError = '';

  // OTP Verification State (Unconfirmed Accounts)
  showOtpVerifyModal = false;
  otpCode = '';
  otpLoading = false;
  otpResendLoading = false;
  otpResendCountdown = 60;
  otpResendInterval: any = null;
  otpError = '';

  // MFA Login State
  showMfaModal = false;
  mfaCode = '';
  mfaUserId = '';
  mfaProvider = '';
  mfaProviderLabel = '';
  trustThisDevice = false;
  mfaLoading = false;
  mfaResendLoading = false;
  mfaResendCountdown = 60;
  mfaResendInterval: any = null;
  mfaError = '';
  mfaSuccessMessage = '';

  constructor(
    private api: ApiService, 
    private router: Router,
    private route: ActivatedRoute,
    private tenantState: TenantStateService,
    private multiWorkspace: MultiWorkspaceService
  ) {}

  ngOnInit(): void {
    // If already authenticated with valid token, navigate to dashboard immediately
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          if (!payload.exp || Date.now() < payload.exp * 1000) {
            this.navigateAfterLogin();
            return;
          }
        }
      } catch {}
    }

    // Load Brand Identity if available
    this.api.get<any>('SettingsApi/brand').subscribe({
      next: (res) => {
        if (res?.data) {
          this.brandCompanyName = res.data.companyName || '';
          this.brandLogoUrl = res.data.companyLogoUrl || res.data.companyWhiteLogoUrl || '';
          const rawIcon = res.data.companyIconUrl;
          this.brandIconUrl = (rawIcon && rawIcon !== '/favicon.ico') ? rawIcon : (this.brandLogoUrl || '');
          this.brandInitials = res.data.companyNameAbbreviation || (this.brandCompanyName ? this.brandCompanyName.substring(0, 2).toUpperCase() : '');
          if (res.data.allowPublicRegistration !== undefined) {
            this.allowPublicRegistration = res.data.allowPublicRegistration;
          }
          this.loginTitle = res.data.loginTitle || '';
          this.loginNote = res.data.loginNote || '';
          this.loginButtonText = res.data.loginButtonText || 'Sign In';
          this.loginNoteFooter = res.data.loginNoteFooter || '';
        }
      },
      error: (err) => {
        if (err?.status === 404 || err?.error?.error === 'TenantNotFound') {
          this.workspaceNotFound = true;
          this.tenantState.setTenantNotFound(true);
        }
      }
    });
  }

  hasUpperCase(): boolean {
    return /[A-Z]/.test(this.newPermanentPassword || '');
  }

  hasLowerCase(): boolean {
    return /[a-z]/.test(this.newPermanentPassword || '');
  }

  hasNumber(): boolean {
    return /[0-9]/.test(this.newPermanentPassword || '');
  }

  hasSpecial(): boolean {
    return /[^a-zA-Z0-9]/.test(this.newPermanentPassword || '');
  }

  isPasswordValid(): boolean {
    if (!this.newPermanentPassword) return false;
    return this.newPermanentPassword.length >= 8
      && this.hasUpperCase()
      && this.hasLowerCase()
      && this.hasNumber()
      && this.hasSpecial()
      && this.newPermanentPassword === this.confirmPermanentPassword;
  }

  onLogin(): void {
    if (!this.email || !this.password) {
      this.errorMessage = 'Please provide both email and password.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    console.log('[LoginComponent] Submitting login request for:', this.email);

    this.api.post<any>('auth/login', {
      email: this.email,
      password: this.password
    }).subscribe({
      next: (res) => {
        this.loading = false;
        console.log('[LoginComponent] Login success:', res);

        // Check for MFA requirement
        if (res?.data?.requiresMfa) {
          this.mfaUserId = res.data.userId;
          this.mfaProvider = res.data.mfaProvider || '';
          this.mfaProviderLabel = this.getFriendlyMfaProvider(this.mfaProvider);
          this.mfaCode = '';
          this.mfaError = '';
          this.mfaSuccessMessage = '';
          this.showMfaModal = true;
          if (this.canResendMfaCode()) {
            this.startMfaCountdown();
          }
          return;
        }

        if (res?.data?.token) {
          this.storeLoginSession(res.data);

          // Check if user has incomplete registration onboarding stages to finish
          if (res.data.requiresOnboarding) {
            const resumeStep = res.data.onboardingStep || 2;
            this.router.navigate(['/auth/register'], {
              queryParams: { resume: 'true', step: resumeStep }
            });
            return;
          }

          if (res.data.mustChangePassword) {
            this.showForceChangeModal = true;
          } else {
            this.navigateAfterLogin();
          }
        } else {
          this.errorMessage = 'Authentication succeeded but token was missing.';
        }
      },
      error: (err) => {
        this.loading = false;
        if (err?.status === 404 || err?.error?.error === 'TenantNotFound') {
          this.workspaceNotFound = true;
          this.tenantState.setTenantNotFound(true);
          return;
        }

        // If unconfirmed email required by policy (403), open OTP verification dialog
        if (err.status === 403) {
          this.showOtpVerifyModal = true;
          this.onRequestNewOtp();
          return;
        }

        this.errorMessage = err?.error?.message 
          || `Invalid email or password credentials.`;
      }
    });
  }

  private getFriendlyMfaProvider(provider: string): string {
    switch (provider) {
      case 'GoogleAuthenticator': return 'Google Authenticator App';
      case 'MicrosoftAuthenticator': return 'Microsoft Authenticator App';
      case 'SMS': return 'Mobile SMS OTP';
      case 'Email': return 'Email OTP';
      default: return 'Authenticator App / OTP';
    }
  }

  canResendMfaCode(): boolean {
    const p = (this.mfaProvider || '').toLowerCase();
    return p === 'email' || p === 'sms';
  }

  onVerifyLoginMfa(): void {
    if (!this.mfaCode || this.mfaCode.trim().length < 4) return;

    this.mfaLoading = true;
    this.mfaError = '';

    this.api.post<any>('auth/login/verify-mfa', {
      userId: this.mfaUserId,
      code: this.mfaCode,
      trustDevice: this.trustThisDevice
    }).subscribe({
      next: (res) => {
        this.mfaLoading = false;
        console.log('[LoginComponent] MFA verification success:', res);
        
        if (res?.data?.auth?.token) {
          this.storeLoginSession(res.data.auth);
          
          if (res.data.trustToken) {
            localStorage.setItem('device_trust_token', res.data.trustToken);
          }

          this.showMfaModal = false;

          if (res.data.auth.mustChangePassword) {
            this.showForceChangeModal = true;
          } else {
            this.navigateAfterLogin();
          }
        } else {
          this.mfaError = 'Verification succeeded but login token was missing.';
        }
      },
      error: (err) => {
        this.mfaLoading = false;
        this.mfaError = err?.error?.message || 'Incorrect or expired verification code.';
      }
    });
  }

  cancelMfaAndReturnToLogin(): void {
    this.showMfaModal = false;
    this.mfaCode = '';
    this.mfaError = '';
    this.mfaSuccessMessage = '';
    this.mfaUserId = '';
    this.mfaProvider = '';
    this.loading = false;
    if (this.mfaResendInterval) {
      clearInterval(this.mfaResendInterval);
      this.mfaResendInterval = null;
    }
  }

  startMfaCountdown(): void {
    this.mfaResendCountdown = 60;
    if (this.mfaResendInterval) clearInterval(this.mfaResendInterval);
    this.mfaResendInterval = setInterval(() => {
      if (this.mfaResendCountdown > 0) {
        this.mfaResendCountdown--;
      } else {
        clearInterval(this.mfaResendInterval);
        this.mfaResendInterval = null;
      }
    }, 1000);
  }

  onResendLoginMfa(): void {
    if (!this.canResendMfaCode() || !this.mfaUserId || this.mfaResendLoading || this.mfaResendCountdown > 0) return;
    this.mfaResendLoading = true;
    this.mfaError = '';
    this.mfaSuccessMessage = '';

    this.api.post<any>('auth/login/resend-mfa', { userId: this.mfaUserId }).subscribe({
      next: (res) => {
        this.mfaResendLoading = false;
        this.mfaSuccessMessage = res?.message || 'A fresh verification code has been dispatched.';
        this.startMfaCountdown();
      },
      error: (err) => {
        this.mfaResendLoading = false;
        this.mfaError = err?.error?.message || 'Failed to resend verification code. Please try again.';
      }
    });
  }

  startOtpCountdown(): void {
    this.otpResendCountdown = 60;
    if (this.otpResendInterval) clearInterval(this.otpResendInterval);
    this.otpResendInterval = setInterval(() => {
      if (this.otpResendCountdown > 0) {
        this.otpResendCountdown--;
      } else {
        clearInterval(this.otpResendInterval);
        this.otpResendInterval = null;
      }
    }, 1000);
  }

  private storeLoginSession(data: any): void {
    localStorage.setItem('access_token', data.token);
    if (data.tenantKey) localStorage.setItem('tenant_key', data.tenantKey);
    if (data.fullName) localStorage.setItem('user_name', data.fullName);
    if (data.email) localStorage.setItem('user_email', data.email);
    if (data.roles && Array.isArray(data.roles)) {
      localStorage.setItem('user_roles', JSON.stringify(data.roles));
    }
    this.multiWorkspace.saveSession({
      tenantKey: data.tenantKey || localStorage.getItem('tenant_key') || '',
      token: data.token,
      fullName: data.fullName,
      email: data.email,
      roles: data.roles,
      organizationName: this.brandCompanyName,
      brandLogoUrl: this.brandLogoUrl
    });
    this.promptBrowserSavePassword();
  }

  /**
   * Instructs the browser (Chrome, Edge, Safari) native Credential Manager
   * to prompt the user to save or update their password.
   */
  private promptBrowserSavePassword(): void {
    if (typeof window !== 'undefined' && 'PasswordCredential' in window && navigator.credentials && this.email && this.password) {
      try {
        const cred = new (window as any).PasswordCredential({
          id: this.email,
          password: this.password
        });
        navigator.credentials.store(cred).catch(() => {});
      } catch (e) {}
    }
  }

  private navigateAfterLogin(): void {
    const userRoles = getStoredUserRoles();
    const returnUrl = this.route.snapshot.queryParams['returnUrl'];

    // Only navigate to returnUrl if it's a specific authorized deep link
    if (
      returnUrl && 
      typeof returnUrl === 'string' && 
      !returnUrl.startsWith('/auth') && 
      !returnUrl.includes('login') && 
      !returnUrl.includes('access-denied') && 
      returnUrl !== '/dashboard/workspace' && 
      returnUrl !== '/'
    ) {
      if (canAccessRoute(undefined, returnUrl, userRoles)) {
        this.router.navigateByUrl(returnUrl);
        return;
      }
    }

    // Role-tailored target dashboard
    const targetDashboard = getReturnUrlForRole(userRoles);
    this.router.navigate([targetDashboard]);
  }

  onForceChangePassword(): void {
    if (!this.newPermanentPassword) {
      this.forceChangeError = 'Please enter your new permanent password.';
      return;
    }

    if (this.newPermanentPassword.length < 8) {
      this.forceChangeError = 'Password must be at least 8 characters long.';
      return;
    }

    if (!this.hasUpperCase() || !this.hasLowerCase() || !this.hasNumber() || !this.hasSpecial()) {
      this.forceChangeError = 'Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character.';
      return;
    }

    if (this.newPermanentPassword !== this.confirmPermanentPassword) {
      this.forceChangeError = 'Passwords do not match.';
      return;
    }

    this.forceChangeLoading = true;
    this.forceChangeError = '';

    this.api.post<any>('auth/password/force-change', {
      oldPassword: this.password,
      newPassword: this.newPermanentPassword
    }).subscribe({
      next: () => {
        this.forceChangeLoading = false;
        this.showForceChangeModal = false;
        this.navigateAfterLogin();
      },
      error: (err) => {
        this.forceChangeLoading = false;
        if (err?.error?.message) {
          this.forceChangeError = err.error.message;
        } else if (err?.error?.errors && Array.isArray(err.error.errors)) {
          this.forceChangeError = err.error.errors.join('. ');
        } else if (typeof err?.error === 'string') {
          this.forceChangeError = err.error;
        } else {
          this.forceChangeError = 'Password does not meet complexity requirements (8+ chars, upper, lower, number, special).';
        }
      }
    });
  }

  onRequestNewOtp(): void {
    if (this.otpResendLoading || this.otpResendCountdown > 0) return;
    this.otpResendLoading = true;
    this.api.post<any>('auth/otp/request', { email: this.email }).subscribe({
      next: () => {
        this.otpResendLoading = false;
        this.otpError = '';
        this.startOtpCountdown();
      },
      error: () => {
        this.otpResendLoading = false;
      }
    });
  }

  onVerifyOtp(): void {
    if (!this.otpCode || this.otpCode.length < 6) return;

    this.otpLoading = true;
    this.otpError = '';

    this.api.post<any>('auth/otp/verify', {
      email: this.email,
      otp: this.otpCode,
      channel: 0 // Email
    }).subscribe({
      next: () => {
        this.otpLoading = false;
        this.showOtpVerifyModal = false;
        // Re-attempt login automatically after successful verification
        this.onLogin();
      },
      error: (err) => {
        this.otpLoading = false;
        this.otpError = err?.error?.message || 'Invalid or expired 6-digit verification code.';
      }
    });
  }
}
