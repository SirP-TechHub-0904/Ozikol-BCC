import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="reset-container">
      <div class="reset-card">
        <div class="card-header">
          <div class="brand-avatar">
            <span class="material-symbols-outlined">pin</span>
          </div>
          <h2 class="title">6-Digit OTP Verification</h2>
          <p class="subtitle">Enter your 6-digit security code and set your permanent password.</p>
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
              <button type="button" class="btn-resend-link" (click)="requestOtp()" [disabled]="isRequestingOtp || !email">
                <span>{{ isRequestingOtp ? 'Sending...' : 'Send / Resend OTP' }}</span>
              </button>
            </div>
            <div class="input-wrapper">
              <span class="material-symbols-outlined input-icon">mail</span>
              <input id="email" type="email" [(ngModel)]="email" name="email" placeholder="user@domain.com" required />
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
              />
              <button type="button" class="toggle-pwd-btn" (click)="showPassword = !showPassword">
                <span class="material-symbols-outlined">{{ showPassword ? 'visibility_off' : 'visibility' }}</span>
              </button>
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
              />
            </div>
          </div>

          <button type="submit" [disabled]="loading || !email || !otp || !newPassword" class="btn-submit">
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
        </div>
      </div>
    </div>
  `,
  styles: [`
    .reset-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: radial-gradient(circle at 50% 0%, #1e293b 0%, #0f172a 100%);
      padding: 24px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      box-sizing: border-box;
    }
    .reset-card {
      background: rgba(30, 41, 59, 0.7);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 36px 40px;
      width: 100%;
      max-width: 440px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
      color: #f8fafc;
    }
    .card-header { text-align: center; margin-bottom: 24px; }
    .brand-avatar {
      width: 56px;
      height: 56px;
      border-radius: 14px;
      background: linear-gradient(135deg, #0050e5, #3b82f6);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 12px;
      box-shadow: 0 8px 20px rgba(0, 80, 229, 0.35);
    }
    .brand-avatar span { font-size: 28px; color: #fff; }
    .title { font-size: 20px; font-weight: 700; margin: 0 0 6px; }
    .subtitle { font-size: 13px; color: #94a3b8; margin: 0; line-height: 1.4; }
    .error-banner {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #f87171;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
    }
    .success-banner {
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #34d399;
      padding: 14px;
      border-radius: 8px;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 20px;
    }
    .reset-form { display: flex; flex-direction: column; gap: 14px; }
    .form-group { display: flex; flex-direction: column; gap: 4px; }
    .form-group label {
      font-size: 11px;
      font-weight: 700;
      color: #cbd5e1;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .input-wrapper { position: relative; display: flex; align-items: center; }
    .input-icon { position: absolute; left: 12px; color: #64748b; font-size: 18px; pointer-events: none; }
    .input-wrapper input {
      width: 100%;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 8px;
      padding: 10px 12px 10px 38px;
      color: #fff;
      font-size: 13px;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .otp-input-field {
      font-family: monospace;
      font-size: 16px !important;
      letter-spacing: 4px;
      font-weight: 700;
      color: #60a5fa !important;
    }
    .input-wrapper input:focus {
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
    }
    .field-hint { font-size: 11px; color: #64748b; margin-top: 2px; }
    .btn-resend-link { background: none; border: none; color: #60a5fa; font-size: 11px; font-weight: 700; cursor: pointer; padding: 0; }
    .btn-resend-link:hover { text-decoration: underline; }
    .btn-resend-link:disabled { opacity: 0.5; cursor: not-allowed; }

    .toggle-pwd-btn {
      position: absolute;
      right: 10px;
      background: none;
      border: none;
      color: #64748b;
      cursor: pointer;
      display: flex;
      align-items: center;
      padding: 4px;
    }
    .btn-submit {
      margin-top: 8px;
      background: linear-gradient(135deg, #0050e5, #2563eb);
      color: #fff;
      border: none;
      border-radius: 8px;
      padding: 12px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s;
      box-shadow: 0 4px 15px rgba(0, 80, 229, 0.3);
    }
    .btn-submit:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(0, 80, 229, 0.45); }
    .btn-submit:disabled { opacity: 0.7; cursor: not-allowed; }
    .spinner { width: 16px; height: 16px; border: 2px solid rgba(255, 255, 255, 0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .card-footer { margin-top: 20px; text-align: center; }
    .back-link { color: #64748b; font-size: 12px; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; }
    .back-link:hover { color: #cbd5e1; }
  `]
})
export class ResetPasswordComponent implements OnInit {
  email = '';
  otp = '';
  newPassword = '';
  confirmPassword = '';
  showPassword = false;
  loading = false;
  isRequestingOtp = false;
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
