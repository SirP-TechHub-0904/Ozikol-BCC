import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent, PageHeaderButton } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-identity-policies',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent],
  template: `
    <div class="identity-page">
      <app-page-header
        eyebrow="SECURITY STANDARDS"
        icon="policy"
        title="Global Security Policies"
        subtitle="Configure system-wide password complexity thresholds, account brute-force lockouts, and multi-factor enforcement options."
        [buttons]="headerButtons"
        [loading]="isLoading"
      ></app-page-header>

      <div class="policies-grid">
        <!-- Panel 1: Password Complexity Policies -->
        <section class="console-widget">
          <div class="widget-head">
            <div class="widget-title-wrap">
              <span class="material-symbols-outlined text-blue">password</span>
              <h2 class="widget-title">Password Complexity Controls</h2>
            </div>
          </div>
          <div class="widget-body">
            <div class="form-container">
              <div class="form-group">
                <label class="form-label">Minimum Character Length</label>
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
                  <span class="switch-title">Require Uppercase Letter</span>
                  <span class="switch-desc">At least one uppercase character (A-Z) in the password.</span>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" [(ngModel)]="passwordPolicy.requireUppercase" />
                  <span class="slider"></span>
                </label>
              </div>

              <div class="switch-item">
                <div class="switch-label-wrap">
                  <span class="switch-title">Require Lowercase Letter</span>
                  <span class="switch-desc">At least one lowercase character (a-z) in the password.</span>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" [(ngModel)]="passwordPolicy.requireLowercase" />
                  <span class="slider"></span>
                </label>
              </div>

              <div class="switch-item">
                <div class="switch-label-wrap">
                  <span class="switch-title">Require Numeric Digit</span>
                  <span class="switch-desc">At least one number (0-9) in the password.</span>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" [(ngModel)]="passwordPolicy.requireDigit" />
                  <span class="slider"></span>
                </label>
              </div>

              <div class="switch-item">
                <div class="switch-label-wrap">
                  <span class="switch-title">Require Non-Alphanumeric Symbol</span>
                  <span class="switch-desc">At least one special character (e.g. &#64;, #, $, %) in the password.</span>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" [(ngModel)]="passwordPolicy.requireNonAlphanumeric" />
                  <span class="slider"></span>
                </label>
              </div>

              <div class="form-group-2row" style="margin-top: 16px;">
                <div class="form-group">
                  <label class="form-label">Max Login Attempts Lockout</label>
                  <input
                    type="number"
                    min="3"
                    max="15"
                    class="form-control"
                    [(ngModel)]="passwordPolicy.maxFailedAccessAttempts"
                  />
                </div>
                <div class="form-group">
                  <label class="form-label">Lockout Duration (Minutes)</label>
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
                  <span>{{ isSavingPassword ? 'Saving...' : 'Save Password Policy' }}</span>
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
              <h2 class="widget-title">Multi-Factor Authentication (MFA)</h2>
            </div>
          </div>
          <div class="widget-body">
            <div class="form-container">
              <div class="switch-item">
                <div class="switch-label-wrap">
                  <span class="switch-title">Enforce MFA Globally</span>
                  <span class="switch-desc">Every platform user is required to set up and verify through MFA before accessing workspaces.</span>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" [(ngModel)]="mfaPolicy.enforceMfaForAllUsers" />
                  <span class="slider"></span>
                </label>
              </div>

              <div class="switch-item">
                <div class="switch-label-wrap">
                  <span class="switch-title">Enforce MFA for Administrators</span>
                  <span class="switch-desc">Requires users in Admin or SuperAdmin groups to perform verification challenges.</span>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" [(ngModel)]="mfaPolicy.enforceMfaForAdmins" />
                  <span class="slider"></span>
                </label>
              </div>

              <!-- Available Methods Display (Informational) -->
              <h4 class="info-title" style="margin-top:24px; margin-bottom:12px;">Allowed Methods Matrix</h4>
              <div class="allowed-methods-list">
                <div class="method-badge" *ngFor="let method of mfaPolicy.allowedMethods">
                  <span class="material-symbols-outlined" style="font-size:16px;">gpp_good</span>
                  <span>{{ method }}</span>
                </div>
              </div>

              <div style="display:flex; justify-content:flex-end; margin-top:36px;">
                <button type="button" class="btn btn-primary" (click)="saveMfaPolicy()" [disabled]="isSavingMfa">
                  <span class="material-symbols-outlined" *ngIf="!isSavingMfa">save</span>
                  <span>{{ isSavingMfa ? 'Saving...' : 'Save MFA Policy' }}</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  `,
  styles: [`
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

  headerButtons: PageHeaderButton[] = [
    {
      text: 'Reset Settings',
      icon: 'refresh',
      action: () => { this.loadPolicies(); }
    }
  ];

  constructor(private api: ApiService, private toast: ToastService) {}

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
