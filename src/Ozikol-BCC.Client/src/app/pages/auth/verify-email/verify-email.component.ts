import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="auth-card-shell">
      <div class="auth-card-header">

        <div class="icon-badge" [class.verified]="verified">
          <span class="material-symbols-outlined">
            {{ verified ? (isActive ? 'verified_user' : 'hourglass_top') : 'mark_email_read' }}
          </span>
        </div>

        <h1 *ngIf="!verified">Verify Your Email</h1>
        <h1 *ngIf="verified && isActive">Email Verified!</h1>
        <h1 *ngIf="verified && !isActive">Email Verified — Pending Review</h1>

        <p class="subtitle" *ngIf="!verified">
          Enter the 6-digit verification code sent to
          <strong>{{ email || 'your email address' }}</strong>.
          Your account remains inactive until verified.
        </p>
        <p class="subtitle" *ngIf="verified">
          {{ statusMessage }}
        </p>
      </div>

      <div *ngIf="errorMessage" class="error-banner">
        <span class="material-symbols-outlined">error</span>
        <span>{{ errorMessage }}</span>
      </div>

      <form *ngIf="!verified" (ngSubmit)="onVerify()" class="verify-form">
        <div class="form-group">
          <label for="ve-email">Email Address</label>
          <input
            id="ve-email"
            type="email"
            name="email"
            [(ngModel)]="email"
            placeholder="name@company.com"
            required
            class="oz-input"
          />
        </div>

        <div class="form-group">
          <label for="ve-otp">6-Digit Verification Code</label>
          <input
            id="ve-otp"
            type="text"
            name="otp"
            [(ngModel)]="otp"
            maxlength="6"
            inputmode="numeric"
            autocomplete="one-time-code"
            placeholder="000000"
            required
            class="oz-input otp-input"
          />
        </div>

        <button
          type="submit"
          class="btn-primary-full"
          [disabled]="loading || !email || otp.trim().length < 6"
        >
          <span class="spinner" *ngIf="loading"></span>
          <span>{{ loading ? 'Verifying...' : 'Verify & Activate Account' }}</span>
        </button>

        <div class="resend-row">
          <span>Didn't receive the code?</span>
          <button
            type="button"
            class="btn-link"
            (click)="onResend()"
            [disabled]="resending || cooldown > 0 || !email"
          >
            {{ resending ? 'Sending...' : cooldown > 0 ? 'Resend in ' + cooldown + 's' : 'Resend Code' }}
          </button>
        </div>
      </form>

      <div *ngIf="verified" class="verified-actions">
        <a routerLink="/auth/login" [queryParams]="{ email: email }" class="btn-primary-full">
          <span class="material-symbols-outlined">login</span>
          <span>Proceed to Sign In</span>
        </a>
      </div>

      <div class="card-footer">
        <a routerLink="/auth/login" class="back-link">
          <span class="material-symbols-outlined">arrow_back</span>
          <span>Back to Sign In</span>
        </a>
      </div>
    </div>
  `,
  styles: [`
    .auth-card-shell {
      width: 100%;
      max-width: 440px;
      margin: 0 auto;
      padding: 28px 24px;
      background: #ffffff;
      border-radius: 16px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 12px 32px rgba(15, 23, 42, 0.06);
    }
    .auth-card-header { text-align: center; margin-bottom: 20px; }
    .brand-row { margin-bottom: 14px; display: flex; justify-content: center; }
    .brand-logo { max-height: 36px; object-fit: contain; }
    .brand-title { font-size: 16px; font-weight: 700; color: #0f172a; }
    .icon-badge {
      width: 52px;
      height: 52px;
      border-radius: 14px;
      background: #eff6ff;
      color: #0050e5;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 12px;
    }
    .icon-badge.verified { background: #ecfdf5; color: #059669; }
    .icon-badge .material-symbols-outlined { font-size: 26px; }
    h1 { margin: 0 0 8px; font-size: 22px; font-weight: 800; color: #0f172a; }
    .subtitle { margin: 0; font-size: 13.5px; line-height: 1.5; color: #475569; }
    .error-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #b91c1c;
      padding: 10px 12px;
      border-radius: 10px;
      font-size: 13px;
      margin-bottom: 16px;
    }
    .verify-form { display: flex; flex-direction: column; gap: 14px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group label { font-size: 12.5px; font-weight: 600; color: #334155; }
    .oz-input {
      width: 100%;
      box-sizing: border-box;
      padding: 11px 13px;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      font-size: 14px;
      color: #0f172a;
      background: #ffffff;
    }
    .oz-input:focus {
      outline: none;
      border-color: #0050e5;
      box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.12);
    }
    .otp-input {
      text-align: center;
      font-size: 22px;
      font-weight: 700;
      letter-spacing: 8px;
      font-family: monospace;
    }
    .btn-primary-full {
      width: 100%;
      padding: 12px 16px;
      border: none;
      border-radius: 10px;
      background: #0050e5;
      color: #ffffff;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      text-decoration: none;
      box-sizing: border-box;
    }
    .btn-primary-full:disabled { opacity: 0.6; cursor: not-allowed; }
    .resend-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font-size: 13px;
      color: #64748b;
    }
    .btn-link {
      background: none;
      border: none;
      padding: 0;
      color: #0050e5;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
    }
    .btn-link:disabled { color: #94a3b8; cursor: not-allowed; }
    .verified-actions { margin-top: 8px; }
    .card-footer {
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid #f1f5f9;
      display: flex;
      justify-content: center;
    }
    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 600;
      color: #475569;
      text-decoration: none;
    }
    .back-link .material-symbols-outlined { font-size: 16px; }
    .spinner {
      width: 15px;
      height: 15px;
      border: 2px solid rgba(255,255,255,0.4);
      border-top-color: #ffffff;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class VerifyEmailComponent implements OnInit, OnDestroy {
  email = '';
  otp = '';
  loading = false;
  resending = false;
  cooldown = 0;
  verified = false;
  isActive = false;
  statusMessage = '';
  errorMessage = '';
  private cooldownTimer: any;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const qEmail = params.get('email');
      if (qEmail) this.email = qEmail;
    });
    this.startCooldown(30);
  }

  ngOnDestroy(): void {
    if (this.cooldownTimer) clearInterval(this.cooldownTimer);
  }

  onVerify(): void {
    if (!this.email.trim() || this.otp.trim().length < 6) {
      this.errorMessage = 'Please enter your email and 6-digit verification code.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.api.post<any>('auth/verify-email-otp', {
      email: this.email.trim(),
      otp: this.otp.trim()
    }).subscribe({
      next: (res) => {
        this.loading = false;
        this.verified = true;
        this.isActive = res?.data?.isActive !== false;
        this.statusMessage = res?.message || (this.isActive
          ? 'Your email has been verified and your account is now active.'
          : 'Your email has been verified. Your account is now awaiting administrator approval.');
        this.toast.success(this.statusMessage);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.error?.message || 'Invalid or expired 6-digit verification code.';
      }
    });
  }

  onResend(): void {
    if (!this.email.trim() || this.resending || this.cooldown > 0) return;

    this.resending = true;
    this.errorMessage = '';

    this.api.post<any>('auth/resend-email-otp', { email: this.email.trim() }).subscribe({
      next: (res) => {
        this.resending = false;
        this.toast.success(res?.message || 'A fresh 6-digit verification code has been sent.');
        this.startCooldown(60);
      },
      error: (err) => {
        this.resending = false;
        this.errorMessage = err?.error?.message || 'Failed to resend verification code.';
      }
    });
  }

  private startCooldown(seconds: number): void {
    if (this.cooldownTimer) clearInterval(this.cooldownTimer);
    this.cooldown = seconds;
    this.cooldownTimer = setInterval(() => {
      this.cooldown--;
      if (this.cooldown <= 0) {
        clearInterval(this.cooldownTimer);
        this.cooldownTimer = null;
      }
    }, 1000);
  }
}
