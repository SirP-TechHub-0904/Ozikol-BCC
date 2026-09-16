import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';

/**
 * Self-service password reset and account activation component.
 * Allows users to request a 6-digit OTP to their registered email,
 * verify their identity, and set a new compliant password with live validation.
 */
@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="reset-container">
      <div class="reset-card">
        <div class="card-header">
          <div class="brand-avatar">
            <span class="material-symbols-outlined">lock_reset</span>
          </div>
          <h2 class="title">Reset Account Password</h2>
          <p class="subtitle">Enter your 6-digit verification code and set your permanent password.</p>
        </div>

        <div *ngIf="errorMessage" class="error-banner">
          <span class="material-symbols-outlined">error</span>
          <span>{{ errorMessage }}</span>
        </div>

        <div *ngIf="successMessage" class="success-banner">
          <span class="material-symbols-outlined">check_circle</span>
          <span>{{ successMessage }}</span>
        </div>

        <form (ngSubmit)="onResetPassword()" class="reset-form" *ngIf="!successMessage">
          <!-- Email Field -->
          <div class="form-group">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <label for="email">Account Email *</label>
              <button 
                type="button" 
                class="btn-resend-link" 
                (click)="requestOtp()" 
                [disabled]="isRequestingOtp || otpCountdown > 0 || !email"
              >
                <span *ngIf="isRequestingOtp">Sending...</span>
                <span *ngIf="!isRequestingOtp && otpCountdown > 0">Resend in {{ otpCountdown }}s</span>
                <span *ngIf="!isRequestingOtp && otpCountdown === 0">Send / Resend OTP</span>
              </button>
            </div>
            <div class="input-wrapper">
              <span class="material-symbols-outlined input-icon">mail</span>
              <input id="email" type="email" [(ngModel)]="email" name="email" placeholder="user@domain.com" required autocomplete="email" />
            </div>
          </div>

          <!-- 6-Digit OTP Field -->
          <div class="form-group">
            <label for="otp">6-Digit Verification Code (OTP) *</label>
            <div class="input-wrapper">
              <span class="material-symbols-outlined input-icon">dialpad</span>
              <input
                id="otp"
                type="text"
                maxlength="6"
                [(ngModel)]="otp"
                name="otp"
                placeholder="e.g. 849201"
                class="otp-input-field"
                required
              />
            </div>
            <div class="field-hint">Check your email, SMS, or use the code provided by your administrator.</div>
          </div>

          <!-- New Password Field -->
          <div class="form-group">
            <label for="newPassword">New Permanent Password *</label>
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
              />
              <button type="button" class="toggle-pwd-btn" (click)="showPassword = !showPassword" tabindex="-1">
                <span class="material-symbols-outlined">{{ showPassword ? 'visibility_off' : 'visibility' }}</span>
              </button>
            </div>
          </div>

          <!-- Live Password Complexity Checklist -->
          <div class="password-rules-box">
            <span class="rules-box-title">Password Complexity Requirements:</span>
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

          <!-- Confirm Password Field -->
          <div class="form-group">
            <label for="confirmPassword">Confirm Password *</label>
            <div class="input-wrapper">
              <span class="material-symbols-outlined input-icon">check_circle</span>
              <input
                id="confirmPassword"
                [type]="showPassword ? 'text' : 'password'"
                [(ngModel)]="confirmPassword"
                name="confirmPassword"
                placeholder="••••••••••••"
                required
                autocomplete="new-password"
              />
            </div>
            <div *ngIf="confirmPassword && newPassword !== confirmPassword" class="password-mismatch-hint">
              <span class="material-symbols-outlined" style="font-size:14px;">warning</span>
              <span>Passwords do not match</span>
            </div>
          </div>

          <button type="submit" [disabled]="loading || !email || !otp || !isPasswordValid()" class="btn-submit">
            <span *ngIf="loading" class="spinner"></span>
            <span *ngIf="!loading" class="material-symbols-outlined">verified_user</span>
            <span>{{ loading ? 'Verifying & Saving...' : 'Verify OTP & Activate Account' }}</span>
          </button>
        </form>

        <div class="card-footer">
          <a routerLink="/auth/login" class="back-link">
            <span class="material-symbols-outlined">arrow_back</span>
            Back to Login
          </a>
          <span style="margin: 0 8px; color: #cbd5e1;">•</span>
          <a routerLink="/" class="back-link">
            <span class="material-symbols-outlined">home</span>
            Return to Home
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
      border-radius: 20px;
      padding: 36px 32px;
      width: 100%;
      max-width: 440px;
      box-shadow: 0 20px 45px -12px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04);
      color: #0f172a;
      box-sizing: border-box;
    }
    .card-header { text-align: center; margin-bottom: 24px; }
    .brand-avatar {
      width: 58px;
      height: 58px;
      border-radius: 16px;
      background: #eff6ff;
      border: 1.5px solid #dbeafe;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 14px;
      box-shadow: 0 4px 14px rgba(0, 80, 229, 0.08);
    }
    .brand-avatar span { font-size: 28px; color: #0050e5; }
    .title { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 6px; }
    .subtitle { font-size: 13.5px; color: #64748b; margin: 0; line-height: 1.45; }
    .error-banner {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #dc2626;
      padding: 10px 14px;
      border-radius: 10px;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
    }
    .success-banner {
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      color: #065f46;
      padding: 14px;
      border-radius: 10px;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 20px;
    }
    .reset-form { display: flex; flex-direction: column; gap: 16px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group label {
      font-size: 11.5px;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .input-wrapper { position: relative; display: flex; align-items: center; }
    .input-icon { position: absolute; left: 14px; color: #94a3b8; font-size: 20px; pointer-events: none; }
    .input-wrapper input {
      width: 100%;
      background: #f8fafc;
      border: 1.5px solid #cbd5e1;
      border-radius: 10px;
      padding: 12px 42px 12px 44px;
      color: #0f172a;
      font-size: 14px;
      outline: none;
      box-sizing: border-box;
      transition: all 0.2s ease;
    }
    .otp-input-field {
      font-family: monospace;
      font-size: 17px !important;
      letter-spacing: 4px;
      font-weight: 700;
      color: #0050e5 !important;
      text-align: center;
    }
    .input-wrapper input:focus {
      background: #ffffff;
      border-color: #0050e5;
      box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.15);
    }
    .field-hint { font-size: 11px; color: #64748b; margin-top: 2px; }
    .btn-resend-link {
      background: none;
      border: none;
      color: #0050e5;
      font-size: 11.5px;
      font-weight: 700;
      cursor: pointer;
      padding: 0;
      transition: color 0.15s;
    }
    .btn-resend-link:hover:not(:disabled) { text-decoration: underline; color: #1d4ed8; }
    .btn-resend-link:disabled { opacity: 0.5; cursor: not-allowed; }

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
    .toggle-pwd-btn:hover { color: #0050e5; }

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
    .btn-submit:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(0, 80, 229, 0.4); }
    .btn-submit:disabled { opacity: 0.65; cursor: not-allowed; }
    .spinner { width: 16px; height: 16px; border: 2px solid rgba(255, 255, 255, 0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .card-footer { margin-top: 20px; text-align: center; }
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
  `]
})
export class ResetPasswordComponent implements OnInit, OnDestroy {
  email = '';
  otp = '';
  newPassword = '';
  confirmPassword = '';
  showPassword = false;
  loading = false;
  isRequestingOtp = false;
  otpCountdown = 0;
  otpInterval: any = null;
  errorMessage = '';
  successMessage = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['email']) {
        this.email = params['email'];
      }
      if (params['otp']) {
        this.otp = params['otp'];
      }
    });
  }

  ngOnDestroy(): void {
    if (this.otpInterval) {
      clearInterval(this.otpInterval);
      this.otpInterval = null;
    }
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

  requestOtp(): void {
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
        this.toast.success('6-Digit OTP dispatched to your registered email & phone.');
      },
      error: (err) => {
        this.isRequestingOtp = false;
        this.errorMessage = err?.error?.message || 'Failed to request OTP.';
      }
    });
  }

  onResetPassword(): void {
    if (!this.email.trim() || !this.otp.trim() || !this.newPassword.trim()) {
      this.errorMessage = 'Please enter your email, 6-digit OTP, and new password.';
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
        this.successMessage = 'OTP verified! Your password has been updated and account activated.';
        this.toast.success('Account activated successfully!');
        setTimeout(() => this.router.navigate(['/auth/login']), 2000);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.error?.message || 'Invalid or expired OTP code.';
      }
    });
  }
}
