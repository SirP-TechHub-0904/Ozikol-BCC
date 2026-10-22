import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';

/**
 * Premium Self-Service Password Recovery & Account Activation Suite.
 * Features a guided 2-step workflow (Request OTP -> Verify & Reset),
 * real-time password complexity checklist, OTP countdown timer,
 * and high-fidelity enterprise styling matching Ozikol BCC brand standards.
 */
@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="reset-container">
      <div class="reset-card">
        <!-- Brand Avatar & Header -->
        <!-- Brand Identity & Header -->
        <div class="reset-card-header">
          <!-- 1. Official Brand Logo if uploaded -->
          <div class="brand-identity-row" *ngIf="brandLogoUrl">
            <img [src]="brandLogoUrl" [alt]="brandCompanyName || 'Workspace Logo'" class="brand-logo-img" />
          </div>

          <!-- 2. Brand Name (Text Only) if no logo is uploaded -->
          <div class="brand-identity-row" *ngIf="!brandLogoUrl && brandCompanyName">
            <span class="brand-company-title">{{ brandCompanyName }}</span>
          </div>

          <!-- 3. Fallback Step Avatar only when neither logo nor brand name is available -->
          <div class="brand-avatar default-avatar" *ngIf="!brandLogoUrl && !brandCompanyName">
            <span class="material-symbols-outlined avatar-icon">{{ activeStep === 1 ? 'mark_email_read' : 'lock_reset' }}</span>
          </div>

          <h2 class="title">{{ activeStep === 1 ? 'Forgot Password?' : 'Reset Account Password' }}</h2>
          <p class="subtitle">
            {{ activeStep === 1 
              ? 'Enter your registered email address and we will dispatch a secure 6-digit verification code.' 
              : 'Enter the 6-digit code sent to your email and choose a strong permanent password.' }}
          </p>
        </div>

        <!-- Guided Step Navigator Pills -->
        <div class="step-navigator" *ngIf="!successMessage">
          <button 
            type="button" 
            class="step-pill" 
            [class.active]="activeStep === 1" 
            [class.completed]="activeStep === 2"
            (click)="activeStep = 1"
          >
            <span class="step-badge">1</span>
            <span class="step-label">Request Code</span>
          </button>
          <div class="step-line" [class.active]="activeStep === 2"></div>
          <button 
            type="button" 
            class="step-pill" 
            [class.active]="activeStep === 2"
            (click)="onStepTwoClick()"
          >
            <span class="step-badge">2</span>
            <span class="step-label">Set New Password</span>
          </button>
        </div>

        <!-- Alert Error Banner -->
        <div *ngIf="errorMessage" class="error-banner">
          <span class="material-symbols-outlined banner-icon">error</span>
          <span>{{ errorMessage }}</span>
        </div>

        <!-- Alert Success Banner -->
        <div *ngIf="successMessage" class="success-banner">
          <div class="success-icon-wrap">
            <span class="material-symbols-outlined">check_circle</span>
          </div>
          <div class="success-content">
            <strong class="success-title">Account Verified & Updated!</strong>
            <p class="success-text">{{ successMessage }}</p>
            <span class="redirect-hint">Redirecting to sign-in portal...</span>
          </div>
        </div>

        <!-- ============================================== -->
        <!-- STEP 1: REQUEST VERIFICATION OTP               -->
        <!-- ============================================== -->
        <form (ngSubmit)="onRequestOtpSubmit()" class="reset-form" *ngIf="activeStep === 1 && !successMessage">
          <div class="form-group">
            <label for="email" class="form-label">Registered Account Email *</label>
            <div class="input-wrapper">
              <span class="material-symbols-outlined input-icon">mail</span>
              <input 
                id="email" 
                type="email" 
                [(ngModel)]="email" 
                name="email" 
                placeholder="name@company.com" 
                required 
                autocomplete="email" 
                class="form-control"
              />
            </div>
            <span class="field-hint">We'll send your single-use recovery code to this email.</span>
          </div>

          <button 
            type="submit" 
            [disabled]="isRequestingOtp || !email" 
            class="btn-submit"
          >
            <span *ngIf="isRequestingOtp" class="spinner"></span>
            <span *ngIf="!isRequestingOtp" class="material-symbols-outlined">send</span>
            <span>{{ isRequestingOtp ? 'Dispatching Verification Code...' : 'Send 6-Digit Code' }}</span>
          </button>

          <div class="step-switch-prompt">
            <span>Already have a verification code?</span>
            <button type="button" class="btn-text-link" (click)="activeStep = 2">
              <span>Enter code</span>
              <span class="material-symbols-outlined prompt-arrow">arrow_forward</span>
            </button>
          </div>
        </form>

        <!-- ============================================== -->
        <!-- STEP 2: VERIFY CODE & SET PERMANENT PASSWORD  -->
        <!-- ============================================== -->
        <form (ngSubmit)="onResetPassword()" class="reset-form" *ngIf="activeStep === 2 && !successMessage">
          <!-- Active Account Email Badge & Resend Action -->
          <div class="account-email-chip">
            <div class="chip-info">
              <span class="material-symbols-outlined chip-icon">account_circle</span>
              <span class="chip-email">{{ email || 'No email specified' }}</span>
            </div>
            <button 
              type="button" 
              class="btn-change-email" 
              (click)="activeStep = 1" 
              title="Change target email"
            >
              Change
            </button>
          </div>

          <!-- 6-Digit Verification OTP -->
          <div class="form-group">
            <div class="label-with-action">
              <label for="otp" class="form-label">6-Digit Verification Code (OTP) *</label>
              <button 
                type="button" 
                class="btn-resend-inline" 
                (click)="requestOtp()" 
                [disabled]="isRequestingOtp || otpCountdown > 0 || !email"
              >
                <span *ngIf="isRequestingOtp" class="spinner-sm"></span>
                <span *ngIf="!isRequestingOtp && otpCountdown > 0">Resend in {{ otpCountdown }}s</span>
                <span *ngIf="!isRequestingOtp && otpCountdown === 0">Resend Code</span>
              </button>
            </div>
            <div class="input-wrapper">
              <span class="material-symbols-outlined input-icon">dialpad</span>
              <input
                id="otp"
                type="text"
                maxlength="6"
                [(ngModel)]="otp"
                name="otp"
                placeholder="123456"
                class="form-control otp-input-field"
                required
                autocomplete="one-time-code"
              />
            </div>
            <span class="field-hint">Check your email inbox or spam folder for your 6-digit code.</span>
          </div>

          <!-- New Permanent Password -->
          <div class="form-group">
            <label for="newPassword" class="form-label">New Permanent Password *</label>
            <div class="input-wrapper">
              <span class="material-symbols-outlined input-icon">key</span>
              <input
                id="newPassword"
                [type]="showPassword ? 'text' : 'password'"
                [(ngModel)]="newPassword"
                name="newPassword"
                placeholder="••••••••••••"
                required
                autocomplete="new-password"
                class="form-control"
              />
              <button 
                type="button" 
                class="toggle-pwd-btn" 
                (click)="showPassword = !showPassword" 
                tabindex="-1"
                [title]="showPassword ? 'Hide password' : 'Show password'"
              >
                <span class="material-symbols-outlined">
                  {{ showPassword ? 'visibility_off' : 'visibility' }}
                </span>
              </button>
            </div>
          </div>

          <!-- Live Real-Time Password Complexity Requirements -->
          <div class="password-rules-box">
            <div class="rules-header">
              <span class="material-symbols-outlined rules-header-icon">shield</span>
              <span class="rules-box-title">Password Security Requirements</span>
            </div>
            <div class="rules-list">
              <div class="rule-chip" [class.rule-passed]="newPassword.length >= 8">
                <span class="material-symbols-outlined rule-icon">{{ newPassword.length >= 8 ? 'check_circle' : 'radio_button_unchecked' }}</span>
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

          <!-- Confirm Password -->
          <div class="form-group">
            <label for="confirmPassword" class="form-label">Confirm Permanent Password *</label>
            <div class="input-wrapper">
              <span class="material-symbols-outlined input-icon">verified</span>
              <input
                id="confirmPassword"
                [type]="showPassword ? 'text' : 'password'"
                [(ngModel)]="confirmPassword"
                name="confirmPassword"
                placeholder="••••••••••••"
                required
                autocomplete="new-password"
                class="form-control"
              />
            </div>
            <div *ngIf="confirmPassword && newPassword !== confirmPassword" class="password-mismatch-hint">
              <span class="material-symbols-outlined">warning</span>
              <span>Passwords do not match</span>
            </div>
          </div>

          <button 
            type="submit" 
            [disabled]="loading || !email || !otp || !isPasswordValid()" 
            class="btn-submit"
          >
            <span *ngIf="loading" class="spinner"></span>
            <span *ngIf="!loading" class="material-symbols-outlined">verified_user</span>
            <span>{{ loading ? 'Verifying & Saving Password...' : 'Verify OTP & Activate Account' }}</span>
          </button>
        </form>

        <!-- Card Footer Navigation Links -->
        <div class="card-footer">
          <a routerLink="/auth/login" class="back-link">
            <span class="material-symbols-outlined">arrow_back</span>
            <span>Return to Sign In</span>
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .reset-container {
      width: 100%;
      display: flex;
      justify-content: center;
      box-sizing: border-box;
      padding: 0;
    }

    .reset-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 24px;
      padding: 38px 36px;
      width: 100%;
      max-width: 460px;
      box-shadow: 0 24px 50px -12px rgba(15, 23, 42, 0.1), 0 2px 6px rgba(0, 0, 0, 0.04);
      color: #0f172a;
      box-sizing: border-box;
      transition: all 0.3s ease;
    }

    .reset-card-header,
    .reset-card .card-header {
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      justify-content: center !important;
      text-align: center !important;
      margin-bottom: 24px;
      width: 100%;
    }

    .brand-identity-row {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;
    }

    .brand-logo-img {
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
      width: 60px;
      height: 60px;
      border-radius: 18px;
      background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
      border: 1.5px solid #bfdbfe;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 20px rgba(0, 80, 229, 0.12);
      transition: transform 0.2s ease;
      overflow: hidden;

      .avatar-icon {
        font-size: 30px;
        color: #0050e5;
      }
    }

    .brand-avatar.default-avatar {
      margin-bottom: 14px;
    }

    .title {
      font-size: 22px;
      font-weight: 800;
      color: #0f172a;
      margin: 6px 0 8px;
      letter-spacing: -0.02em;
      text-align: center;
    }

    .subtitle {
      font-size: 13.5px;
      color: #64748b;
      margin: 0;
      line-height: 1.55;
      text-align: center;
      max-width: 380px;
    }

    /* Step Navigator */
    .step-navigator {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 6px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      margin-bottom: 22px;

      .step-pill {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 8px 12px;
        border-radius: 10px;
        background: transparent;
        border: none;
        color: #64748b;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;

        .step-badge {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #e2e8f0;
          color: #475569;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          transition: all 0.2s ease;
        }

        &.active {
          background: #ffffff;
          color: #0050e5;
          box-shadow: 0 2px 8px rgba(0, 80, 229, 0.08);

          .step-badge {
            background: #0050e5;
            color: #ffffff;
          }
        }

        &.completed {
          color: #10b981;

          .step-badge {
            background: #10b981;
            color: #ffffff;
          }
        }
      }

      .step-line {
        width: 16px;
        height: 2px;
        background: #e2e8f0;
        border-radius: 2px;

        &.active {
          background: #0050e5;
        }
      }
    }

    /* Alert Banners */
    .error-banner {
      background: #fef2f2;
      border: 1.5px solid #fecaca;
      color: #dc2626;
      padding: 12px 16px;
      border-radius: 12px;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 20px;
      animation: shake 0.3s ease;

      .banner-icon {
        font-size: 20px;
        flex-shrink: 0;
      }
    }

    .success-banner {
      background: #f0fdf4;
      border: 1.5px solid #bbf7d0;
      color: #15803d;
      padding: 20px;
      border-radius: 16px;
      display: flex;
      align-items: flex-start;
      gap: 14px;
      margin-bottom: 24px;
      text-align: left;

      .success-icon-wrap {
        width: 40px;
        height: 40px;
        border-radius: 12px;
        background: #dcfce7;
        color: #16a34a;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;

        .material-symbols-outlined {
          font-size: 24px;
        }
      }

      .success-content {
        display: flex;
        flex-direction: column;
        gap: 4px;

        .success-title {
          font-size: 15px;
          font-weight: 800;
          color: #166534;
        }

        .success-text {
          font-size: 13px;
          color: #15803d;
          margin: 0;
          line-height: 1.45;
        }

        .redirect-hint {
          font-size: 11.5px;
          color: #4ade80;
          font-weight: 600;
          margin-top: 4px;
        }
      }
    }

    /* Forms */
    .reset-form {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-label {
      font-size: 11.5px;
      font-weight: 700;
      color: #334155;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .label-with-action {
      display: flex;
      align-items: center;
      justify-content: space-between;
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
      transition: color 0.2s ease;
    }

    .form-control {
      width: 100%;
      background: #f8fafc;
      border: 1.5px solid #cbd5e1;
      border-radius: 12px;
      padding: 13px 44px 13px 44px;
      color: #0f172a;
      font-size: 14px;
      outline: none;
      box-sizing: border-box;
      transition: all 0.2s ease;
      font-family: inherit;

      &:focus {
        background: #ffffff;
        border-color: #0050e5;
        box-shadow: 0 0 0 3.5px rgba(0, 80, 229, 0.12);

        + .input-icon {
          color: #0050e5;
        }
      }

      &::placeholder {
        color: #94a3b8;
      }
    }

    .otp-input-field {
      font-family: 'SF Mono', Monaco, Inconsolata, 'Roboto Mono', monospace;
      font-size: 20px !important;
      letter-spacing: 8px;
      font-weight: 800;
      color: #0050e5 !important;
      text-align: center;
      padding-left: 20px !important;
      padding-right: 20px !important;
    }

    .field-hint {
      font-size: 11.5px;
      color: #64748b;
      margin-top: 2px;
      line-height: 1.4;
    }

    /* Email Target Chip */
    .account-email-chip {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 12px;
      color: #1e40af;

      .chip-info {
        display: flex;
        align-items: center;
        gap: 8px;
        overflow: hidden;

        .chip-icon {
          font-size: 18px;
          color: #0050e5;
        }

        .chip-email {
          font-size: 13px;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      }

      .btn-change-email {
        background: none;
        border: none;
        color: #0050e5;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        padding: 2px 6px;
        border-radius: 6px;
        transition: background 0.15s;

        &:hover {
          background: rgba(0, 80, 229, 0.1);
        }
      }
    }

    .btn-resend-inline {
      background: none;
      border: none;
      color: #0050e5;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      padding: 0;
      transition: color 0.15s;

      &:hover:not(:disabled) {
        text-decoration: underline;
        color: #1d4ed8;
      }

      &:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
    }

    /* Password Complexity Rules Box */
    .password-rules-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;

      .rules-header {
        display: flex;
        align-items: center;
        gap: 6px;
        color: #64748b;

        .rules-header-icon {
          font-size: 15px;
          color: #0050e5;
        }

        .rules-box-title {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
      }

      .rules-list {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;

        .rule-chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 9px;
          border-radius: 8px;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          font-size: 11px;
          color: #64748b;
          font-weight: 500;
          transition: all 0.2s ease;

          .rule-icon {
            font-size: 13px;
            color: #94a3b8;
          }

          &.rule-passed {
            background: #dcfce7;
            border-color: #86efac;
            color: #15803d;
            font-weight: 700;

            .rule-icon {
              color: #16a34a;
            }
          }
        }
      }
    }

    .password-mismatch-hint {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #dc2626;
      font-weight: 600;
      margin-top: 4px;

      .material-symbols-outlined {
        font-size: 16px;
      }
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
      padding: 6px;
      border-radius: 6px;
      transition: color 0.15s;

      &:hover {
        color: #0050e5;
      }
    }

    /* Submit Button */
    .btn-submit {
      margin-top: 6px;
      background: linear-gradient(135deg, #0050e5 0%, #1f6bff 100%);
      color: #ffffff;
      border: none;
      border-radius: 12px;
      padding: 14px 20px;
      font-size: 14.5px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 4px 16px rgba(0, 80, 229, 0.28);

      &:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(0, 80, 229, 0.38);
      }

      &:disabled {
        opacity: 0.65;
        cursor: not-allowed;
      }

      .material-symbols-outlined {
        font-size: 19px;
      }
    }

    .step-switch-prompt {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-wrap: wrap;
      gap: 6px;
      font-size: 13px;
      color: #64748b;
      margin-top: 10px;
      text-align: center;

      span {
        color: #64748b;
        font-weight: 500;
      }

      .btn-text-link {
        background: none;
        border: none;
        color: #0050e5;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        padding: 0;
        display: inline-flex;
        align-items: center;
        gap: 3px;
        transition: color 0.15s ease;

        .prompt-arrow {
          font-size: 15px;
          transition: transform 0.15s ease;
        }

        &:hover {
          color: #003bb5;
          text-decoration: underline;

          .prompt-arrow {
            transform: translateX(2px);
          }
        }
      }
    }

    /* Footer */
    .card-footer {
      margin-top: 24px;
      padding-top: 18px;
      border-top: 1px solid #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: center;

      .back-link {
        color: #64748b;
        font-size: 13px;
        font-weight: 600;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 14px;
        border-radius: 8px;
        transition: all 0.2s ease;

        &:hover {
          color: #0050e5;
          background: #f0f6ff;
        }

        .material-symbols-outlined {
          font-size: 18px;
          transition: transform 0.2s ease;
        }

        &:hover .material-symbols-outlined {
          transform: translateX(-3px);
        }
      }
    }

    /* Spinners */
    .spinner {
      width: 18px;
      height: 18px;
      border: 2.5px solid rgba(255, 255, 255, 0.3);
      border-top-color: #ffffff;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    .spinner-sm {
      display: inline-block;
      width: 12px;
      height: 12px;
      border: 2px solid rgba(0, 80, 229, 0.25);
      border-top-color: #0050e5;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      20%, 60% { transform: translateX(-4px); }
      40%, 80% { transform: translateX(4px); }
    }
  `]
})
export class ResetPasswordComponent implements OnInit, OnDestroy {
  brandCompanyName: string = '';
  brandLogoUrl: string = '';
  brandIconUrl: string = '';
  brandInitials: string = '';

  activeStep: number = 1;
  email: string = '';
  otp: string = '';
  newPassword: string = '';
  confirmPassword: string = '';
  showPassword: boolean = false;
  loading: boolean = false;
  isRequestingOtp: boolean = false;
  otpCountdown: number = 0;
  otpInterval: any = null;
  errorMessage: string = '';
  successMessage: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    // Load Brand Identity
    this.api.get<any>('SettingsApi/brand').subscribe({
      next: (res) => {
        if (res?.data) {
          this.brandCompanyName = res.data.companyName || '';
          this.brandLogoUrl = res.data.companyLogoUrl || res.data.companyWhiteLogoUrl || '';
          const rawIcon = res.data.companyIconUrl;
          this.brandIconUrl = (rawIcon && rawIcon !== '/favicon.ico') ? rawIcon : (this.brandLogoUrl || '');
          this.brandInitials = res.data.companyNameAbbreviation || (this.brandCompanyName ? this.brandCompanyName.substring(0, 2).toUpperCase() : '');
        }
      },
      error: () => {}
    });

    this.route.queryParams.subscribe(params => {
      if (params['email']) {
        this.email = params['email'];
      }
      if (params['otp']) {
        this.otp = params['otp'];
        // If OTP parameter is provided, automatically switch to Step 2
        this.activeStep = 2;
      }
    });
  }

  ngOnDestroy(): void {
    if (this.otpInterval) {
      clearInterval(this.otpInterval);
      this.otpInterval = null;
    }
  }

  onStepTwoClick(): void {
    if (!this.email.trim()) {
      this.errorMessage = 'Please enter your account email address first.';
      return;
    }
    this.errorMessage = '';
    this.activeStep = 2;
  }

  hasUpperCase(): boolean {
    return /[A-Z]/.test(this.newPassword || '');
  }

  hasLowerCase(): boolean {
    return /[a-z]/.test(this.newPassword || '');
  }

  hasNumber(): boolean {
    return /[0-9]/.test(this.newPassword || '');
  }

  hasSpecial(): boolean {
    return /[^a-zA-Z0-9]/.test(this.newPassword || '');
  }

  isPasswordValid(): boolean {
    if (!this.newPassword) return false;
    return this.newPassword.length >= 8
      && this.hasUpperCase()
      && this.hasLowerCase()
      && this.hasNumber()
      && this.hasSpecial()
      && this.newPassword === this.confirmPassword;
  }

  private startCountdown(): void {
    this.otpCountdown = 60;
    if (this.otpInterval) clearInterval(this.otpInterval);
    this.otpInterval = setInterval(() => {
      if (this.otpCountdown > 0) {
        this.otpCountdown--;
      } else {
        clearInterval(this.otpInterval);
        this.otpInterval = null;
      }
    }, 1000);
  }

  onRequestOtpSubmit(): void {
    this.requestOtp(true);
  }

  requestOtp(advanceToStep2OnSuccess: boolean = false): void {
    if (!this.email.trim()) {
      this.errorMessage = 'Please enter your account email address first.';
      return;
    }

    this.isRequestingOtp = true;
    this.errorMessage = '';
    this.api.post<any>('auth/password/request-otp', { email: this.email.trim() }).subscribe({
      next: () => {
        this.isRequestingOtp = false;
        this.startCountdown();
        this.toast.success('6-Digit OTP dispatched to your registered email.');
        if (advanceToStep2OnSuccess) {
          this.activeStep = 2;
        }
      },
      error: (err) => {
        this.isRequestingOtp = false;
        this.errorMessage = err?.error?.message || 'Failed to request OTP. Please verify your email address.';
      }
    });
  }

  onResetPassword(): void {
    if (!this.email.trim() || !this.otp.trim() || !this.newPassword.trim()) {
      this.errorMessage = 'Please enter your email, 6-digit OTP, and new permanent password.';
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.api.post<any>('auth/password/reset-with-otp', {
      email: this.email.trim(),
      otp: this.otp.trim(),
      newPassword: this.newPassword
    }).subscribe({
      next: () => {
        this.loading = false;
        this.successMessage = 'OTP verified! Your password has been updated and your account is active.';
        this.toast.success('Password updated successfully!');
        setTimeout(() => this.router.navigate(['/auth/login']), 2500);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.error?.message || 'Invalid or expired OTP verification code.';
      }
    });
  }
}
