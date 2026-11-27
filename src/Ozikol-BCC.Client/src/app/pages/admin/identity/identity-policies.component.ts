import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { TranslationService } from '../../../core/services/translation.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

@Component({
  selector: 'app-identity-policies',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslatePipe],
  template: `
    <div class="identity-page">
      <!-- Canonical BCC Enterprise Page Header Card -->
      <div class="page-header">
        <div class="header-left">
          <div class="breadcrumb">
            <a routerLink="/admin/dashboard">Command Center</a>
            <span class="sep">/</span>
            <a routerLink="/identity/console">Identity &amp; Access</a>
            <span class="sep">/</span>
            <span class="current">Security Policies</span>
          </div>
          <div class="title-row">
            <span class="material-symbols-outlined header-icon text-blue">policy</span>
            <h1>{{ 'identity.policy.title' | translate:'Global Security Policies' }}</h1>
            <span class="badge-suite">SUITE: SECURITY &amp; COMPLIANCE</span>
          </div>
          <p class="subtitle">{{ 'identity.policy.subtitle' | translate:'Configure system-wide password complexity thresholds, account brute-force lockouts, and multi-factor enforcement options.' }}</p>
        </div>
        <div class="header-actions">
          <button type="button" class="btn-header-link" (click)="loadPolicies()">
            <span class="material-symbols-outlined">refresh</span>
            <span>{{ 'identity.policy.btn_reset' | translate:'Reset Settings' }}</span>
          </button>
        </div>
      </div>

      <div class="policies-grid">
        <!-- Panel 1: Password Complexity Policies -->
        <section class="console-widget">
          <div class="widget-head">
            <div class="widget-title-wrap">
              <span class="material-symbols-outlined text-blue">password</span>
              <h2 class="widget-title">{{ 'identity.policy.pwd_controls' | translate:'Password Complexity Controls' }}</h2>
            </div>
          </div>
          <div class="widget-body">
            <div class="form-container">
              <div class="form-group">
                <label class="form-label">{{ 'identity.policy.min_length' | translate:'Minimum Character Length' }}</label>
                <input
                  type="number"
                  min="6"
                  max="30"
                  class="form-control"
                  [(ngModel)]="passwordPolicy.minLength"
                />
              </div>

              <!-- Switches List -->
              <div class="switch-item">
                <div class="switch-label-wrap">
                  <span class="switch-title">{{ 'identity.policy.req_upper' | translate:'Require Uppercase Letter' }}</span>
                  <span class="switch-desc">{{ 'identity.policy.req_upper_desc' | translate:'At least one uppercase character (A-Z) in the password.' }}</span>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" [(ngModel)]="passwordPolicy.requireUppercase" />
                  <span class="slider"></span>
                </label>
              </div>

              <div class="switch-item">
                <div class="switch-label-wrap">
                  <span class="switch-title">{{ 'identity.policy.req_lower' | translate:'Require Lowercase Letter' }}</span>
                  <span class="switch-desc">{{ 'identity.policy.req_lower_desc' | translate:'At least one lowercase character (a-z) in the password.' }}</span>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" [(ngModel)]="passwordPolicy.requireLowercase" />
                  <span class="slider"></span>
                </label>
              </div>

              <div class="switch-item">
                <div class="switch-label-wrap">
                  <span class="switch-title">{{ 'identity.policy.req_digit' | translate:'Require Numeric Digit' }}</span>
                  <span class="switch-desc">{{ 'identity.policy.req_digit_desc' | translate:'At least one number (0-9) in the password.' }}</span>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" [(ngModel)]="passwordPolicy.requireDigit" />
                  <span class="slider"></span>
                </label>
              </div>

              <div class="switch-item">
                <div class="switch-label-wrap">
                  <span class="switch-title">{{ 'identity.policy.req_symbol' | translate:'Require Non-Alphanumeric Symbol' }}</span>
                  <span class="switch-desc">{{ 'identity.policy.req_symbol_desc' | translate:'At least one special character (e.g. @, #, $, %) in the password.' }}</span>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" [(ngModel)]="passwordPolicy.requireNonAlphanumeric" />
                  <span class="slider"></span>
                </label>
              </div>

              <div class="form-group-2row" style="margin-top: 16px;">
                <div class="form-group">
                  <label class="form-label">{{ 'identity.policy.max_attempts' | translate:'Max Login Attempts Lockout' }}</label>
                  <input
                    type="number"
                    min="3"
                    max="15"
                    class="form-control"
                    [(ngModel)]="passwordPolicy.maxFailedAccessAttempts"
                  />
                </div>
                <div class="form-group">
                  <label class="form-label">{{ 'identity.policy.lockout_duration' | translate:'Lockout Duration (Minutes)' }}</label>
                  <input
                    type="number"
                    min="5"
                    max="120"
                    class="form-control"
                    [(ngModel)]="passwordPolicy.defaultLockoutTimeSpanMinutes"
                  />
                </div>
              </div>

              <div style="display:flex; justify-content:flex-end; margin-top:24px;">
                <button type="button" class="btn btn-primary" (click)="savePasswordPolicy()" [disabled]="isSavingPassword">
                  <span class="material-symbols-outlined" *ngIf="!isSavingPassword">save</span>
                  <span>{{ isSavingPassword ? ('identity.policy.saving' | translate:'Saving...') : ('identity.policy.btn_save_pwd' | translate:'Save Password Policy') }}</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- Panel 2: Multi-Factor Authentication Policies -->
        <section class="console-widget">
          <div class="widget-head">
            <div class="widget-title-wrap">
              <span class="material-symbols-outlined text-purple">phonelink_lock</span>
              <h2 class="widget-title">{{ 'identity.policy.mfa_title' | translate:'Multi-Factor Authentication (MFA)' }}</h2>
            </div>
          </div>
          <div class="widget-body">
            <div class="form-container">
              <div class="switch-item">
                <div class="switch-label-wrap">
                  <span class="switch-title">{{ 'identity.policy.enforce_mfa_global' | translate:'Enforce MFA Globally' }}</span>
                  <span class="switch-desc">{{ 'identity.policy.enforce_mfa_global_desc' | translate:'Every platform user is required to set up and verify through MFA before accessing workspaces.' }}</span>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" [(ngModel)]="mfaPolicy.enforceMfaForAllUsers" />
                  <span class="slider"></span>
                </label>
              </div>

              <div class="switch-item">
                <div class="switch-label-wrap">
                  <span class="switch-title">{{ 'identity.policy.enforce_mfa_admins' | translate:'Enforce MFA for Administrators' }}</span>
                  <span class="switch-desc">{{ 'identity.policy.enforce_mfa_admins_desc' | translate:'Requires users in Admin or SuperAdmin groups to perform verification challenges.' }}</span>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" [(ngModel)]="mfaPolicy.enforceMfaForAdmins" />
                  <span class="slider"></span>
                </label>
              </div>

              <!-- Available Methods Display (Informational) -->
              <h4 class="info-title" style="margin-top:24px; margin-bottom:12px;">{{ 'identity.policy.allowed_methods' | translate:'Allowed Methods Matrix' }}</h4>
              <div class="allowed-methods-list">
                <div class="method-badge" *ngFor="let method of mfaPolicy.allowedMethods">
                  <span class="material-symbols-outlined" style="font-size:16px;">gpp_good</span>
                  <span>{{ method }}</span>
                </div>
              </div>

              <div style="display:flex; justify-content:flex-end; margin-top:36px;">
                <button type="button" class="btn btn-primary" (click)="saveMfaPolicy()" [disabled]="isSavingMfa">
                  <span class="material-symbols-outlined" *ngIf="!isSavingMfa">save</span>
                  <span>{{ isSavingMfa ? ('identity.policy.saving' | translate:'Saving...') : ('identity.policy.btn_save_mfa' | translate:'Save MFA Policy') }}</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      max-width: 100%;
      min-width: 0;
      box-sizing: border-box;
    }
    .identity-page {
      display: flex;
      flex-direction: column;
      gap: 20px;
      width: 100%;
      max-width: 100%;
      min-width: 0;
      box-sizing: border-box;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
      background: #ffffff;
      padding: 18px 22px;
      border-radius: 14px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02);
      box-sizing: border-box;
      width: 100%;
    }
    .header-left { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
    .breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #64748b; }
    .breadcrumb a { color: #0050e5; text-decoration: none; font-weight: 500; }
    .breadcrumb .sep { color: #cbd5e1; }
    .breadcrumb .current { color: #0f172a; font-weight: 600; }
    .title-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .title-row h1 { margin: 0; font-size: 24px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; }
    .header-icon { font-size: 28px; }
    .badge-suite { background: #eff6ff; color: #0050e5; border: 1px solid #bfdbfe; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 999px; text-transform: uppercase; }
    .subtitle { margin: 0; font-size: 13.5px; color: #64748b; }
    .header-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .btn-header-link {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      height: 38px;
      padding: 0 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
      transition: all 0.15s ease;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      color: #334155;
    }
    .btn-header-link:hover {
      background: #f8fafc;
      border-color: #94a3b8;
      color: #0f172a;
    }
    .policies-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
      gap: 24px;
      align-items: start;
    }
    .console-widget {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.02);
    }
    .widget-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    .widget-title-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .widget-title {
      font-size: 14px;
      font-weight: 800;
      margin: 0;
      color: #0f172a;
    }
    .form-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .form-group-2row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .form-control {
      width: 100%;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      color: #0f172a;
      border-radius: 8px;
      padding: 9px 12px;
      font-size: 13px;
      outline: none;
      box-sizing: border-box;
    }
    .form-control:focus {
      border-color: #0050e5;
    }
    .form-label {
      display: block;
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 6px;
    }
    .switch-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .switch-label-wrap {
      display: flex;
      flex-direction: column;
      gap: 2px;
      max-width: 80%;
    }
    .switch-title {
      font-size: 13px;
      font-weight: 700;
      color: #1e293b;
    }
    .switch-desc {
      font-size: 11.5px;
      color: #64748b;
      line-height: 1.4;
    }
    .toggle-switch {
      position: relative;
      display: inline-block;
      width: 44px;
      height: 24px;
    }
    .toggle-switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }
    .slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #cbd5e1;
      transition: .3s cubic-bezier(0.4, 0, 0.2, 1);
      border-radius: 24px;
    }
    .slider:before {
      position: absolute;
      content: "";
      height: 16px;
      width: 16px;
      left: 4px;
      bottom: 4px;
      background-color: white;
      transition: .3s cubic-bezier(0.4, 0, 0.2, 1);
      border-radius: 50%;
    }
    input:checked + .slider {
      background-color: #0050e5;
    }
    input:checked + .slider:before {
      transform: translateX(20px);
    }
    .btn {
      padding: 9px 18px;
      font-size: 13px;
      font-weight: 600;
      border-radius: 8px;
      border: 1px solid transparent;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: background 0.2s;
    }
    .btn-primary {
      background: #0050e5;
      color: #fff;
    }
    .btn-primary:hover:not(:disabled) {
      background: #0040b3;
    }
    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .info-title {
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .allowed-methods-list {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    .method-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(16,185,129,0.08);
      border: 1px solid rgba(16,185,129,0.2);
      border-radius: 6px;
      padding: 6px 12px;
      font-size: 12px;
      color: #10b981;
      font-weight: 600;
    }

    @media (max-width: 768px) {
      .page-header {
        flex-direction: column !important;
        align-items: stretch !important;
        padding: 16px 14px !important;
        gap: 12px !important;
        width: 100% !important;
        box-sizing: border-box !important;
        border-radius: 0 !important;
        border-top: none !important;
        border-left: none !important;
        border-right: none !important;
        border-bottom: 1px solid #e2e8f0 !important;
        box-shadow: none !important;
      }
      .title-row h1 {
        font-size: 19px !important;
      }
      .breadcrumb {
        font-size: 11px;
        flex-wrap: wrap;
      }
      .header-actions {
        width: 100%;
      }
      .btn-header-link {
        width: 100%;
        justify-content: center;
      }
      .policies-grid {
        grid-template-columns: 1fr !important;
        gap: 14px !important;
        width: 100% !important;
        padding: 0 10px 24px 10px !important;
        box-sizing: border-box !important;
      }
        gap: 14px !important;
        width: 100% !important;
      }
      .console-widget {
        padding: 16px 14px !important;
        border-radius: 12px !important;
        width: 100% !important;
        box-sizing: border-box !important;
      }
      .form-group-2row {
        grid-template-columns: 1fr !important;
        gap: 12px !important;
      }
      .switch-label-wrap {
        max-width: 72% !important;
      }
      .switch-item {
        gap: 10px;
      }
      .btn-primary {
        width: 100% !important;
        justify-content: center !important;
      }
    }
  `]
})
export class IdentityPoliciesComponent implements OnInit {
  isLoading = false;
  isSavingPassword = false;
  isSavingMfa = false;

  passwordPolicy = {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireDigit: true,
    requireNonAlphanumeric: true,
    maxFailedAccessAttempts: 5,
    defaultLockoutTimeSpanMinutes: 15
  };

  mfaPolicy = {
    enforceMfaForAllUsers: false,
    enforceMfaForAdmins: true,
    allowedMethods: [] as string[]
  };

  constructor(
    private api: ApiService,
    private toast: ToastService,
    private translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.loadPolicies();
  }

  loadPolicies(): void {
    this.isLoading = true;
    let completed = 0;
    const checkDone = () => {
      completed++;
      if (completed >= 2) this.isLoading = false;
    };

    this.api.get<any>('IdentityApi/password-policy').subscribe({
      next: (res) => {
        if (res && res.data) this.passwordPolicy = res.data;
        checkDone();
      },
      error: () => checkDone()
    });

    this.api.get<any>('IdentityApi/mfa-policy').subscribe({
      next: (res) => {
        if (res && res.data) this.mfaPolicy = res.data;
        checkDone();
      },
      error: () => checkDone()
    });
  }

  savePasswordPolicy(): void {
    this.isSavingPassword = true;
    this.api.put<any>('IdentityApi/password-policy', this.passwordPolicy).subscribe({
      next: () => {
        this.isSavingPassword = false;
        this.toast.success('Password complexity configuration successfully saved and synchronized.', 'Policy Saved');
      },
      error: (err) => {
        this.isSavingPassword = false;
        this.toast.error(err?.error?.message || 'Failed to save password policy.', 'Policy Save Error');
      }
    });
  }

  saveMfaPolicy(): void {
    this.isSavingMfa = true;
    this.api.put<any>('IdentityApi/mfa-policy', this.mfaPolicy).subscribe({
      next: () => {
        this.isSavingMfa = false;
        this.toast.success('MFA global enforcement policy successfully updated.', 'MFA Policy Saved');
      },
      error: (err) => {
        this.isSavingMfa = false;
        this.toast.error(err?.error?.message || 'Failed to save MFA policy.', 'MFA Save Error');
      }
    });
  }
}
