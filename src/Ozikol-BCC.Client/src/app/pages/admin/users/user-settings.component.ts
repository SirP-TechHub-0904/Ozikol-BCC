import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent, PageHeaderButton } from '../../../shared/components/page-header/page-header.component';

interface MemberIdFormatPreview {
  key: string;
  name: string;
  pattern: string;
  description: string;
  previewExample: string;
  isSequential: boolean;
}

interface UserSettingsModel {
  enableTitle: boolean;
  preFilledTitles: string;
  enableSuffix: boolean;
  memberIdFormat: string;
  memberIdPrefix: string;
  memberIdNextNumber: number;
  memberIdPadding: number;
  memberIdDelimiter: string;
  requireConfirmedEmailToLogin: boolean;
  enableUserDeletion: boolean;
}

@Component({
  selector: 'app-user-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent],
  template: `
    <div class="user-settings-page">
      <!-- Standardized Page Header -->
      <app-page-header
        eyebrow="USER MANAGEMENT PREFERENCES"
        icon="tune"
        title="User Management Settings"
        subtitle="Configure name salutations, professional suffixes, member ID generation rules, and directory governance policies."
        [buttons]="headerButtons"
        [loading]="isLoading || isSaving"
      ></app-page-header>

      <!-- Main Form -->
      <div class="settings-container" *ngIf="!isLoading">
        <form (ngSubmit)="saveSettings()" class="settings-form">

          <!-- Section 1: Salutation Title & Professional Suffix Configuration -->
          <div class="settings-card">
            <div class="card-header">
              <div class="header-icon-box">
                <span class="material-symbols-outlined">badge</span>
              </div>
              <div class="header-text">
                <h3>Name Titles & Professional Suffixes</h3>
                <p>Control whether salutation titles and honorary suffixes appear on registration and member profiles.</p>
              </div>
            </div>

            <div class="card-body">
              <!-- Toggle 1: Enable Title -->
              <div class="preference-row">
                <div class="pref-info">
                  <div class="pref-title-row">
                    <span class="pref-title">Enable Name Title / Salutation</span>
                    <span class="status-badge" [class.badge-active]="settings.enableTitle" [class.badge-inactive]="!settings.enableTitle">
                      {{ settings.enableTitle ? 'ENABLED' : 'DISABLED' }}
                    </span>
                  </div>
                  <p class="pref-desc">When enabled, members and staff select their formal title (e.g. Dr., Prof., Engr.) during onboarding and profile setup.</p>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" [(ngModel)]="settings.enableTitle" name="enableTitle" />
                  <span class="toggle-slider"></span>
                </label>
              </div>

              <!-- Configurable Titles Input (Visible only when Title is enabled) -->
              <div class="sub-config-block" *ngIf="settings.enableTitle">
                <div class="form-group">
                  <label>
                    <span>Configured Pre-Filled Titles</span>
                    <span class="hint-text">(Comma-separated list of prefilled title options)</span>
                  </label>
                  <textarea
                    rows="2"
                    [(ngModel)]="settings.preFilledTitles"
                    name="preFilledTitles"
                    (ngModelChange)="updateTitleChips()"
                    placeholder="e.g. Mr., Mrs., Ms., Dr., Prof., Engr., Chief, Rev., Pastor"
                    class="form-control"
                  ></textarea>
                </div>

                <!-- Live Title Chips Preview -->
                <div class="chips-container" *ngIf="titleChips.length > 0">
                  <span class="chip-label">Active Dropdown Options ({{ titleChips.length }}):</span>
                  <div class="chips-wrap">
                    <span class="title-chip" *ngFor="let chip of titleChips">
                      <span class="chip-text">{{ chip }}</span>
                      <button type="button" class="chip-remove" (click)="removeTitleChip(chip)" title="Remove {{ chip }}">
                        <span class="material-symbols-outlined">close</span>
                      </button>
                    </span>
                  </div>
                </div>
              </div>

              <div class="divider-line"></div>

              <!-- Toggle 2: Enable Suffix -->
              <div class="preference-row">
                <div class="pref-info">
                  <div class="pref-title-row">
                    <span class="pref-title">Enable Name Suffix (e.g. mni, PhD, Esq, OON)</span>
                    <span class="status-badge" [class.badge-active]="settings.enableSuffix" [class.badge-inactive]="!settings.enableSuffix">
                      {{ settings.enableSuffix ? 'ENABLED' : 'DISABLED' }}
                    </span>
                  </div>
                  <p class="pref-desc">
                    When enabled, an open text space is made available on the registration page and member creation forms for professional or honorary post-nominal suffixes.
                    <strong>Suffix is freeform text and not pre-filled.</strong>
                  </p>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" [(ngModel)]="settings.enableSuffix" name="enableSuffix" />
                  <span class="toggle-slider"></span>
                </label>
              </div>

              <div class="suffix-demo-box" *ngIf="settings.enableSuffix">
                <span class="material-symbols-outlined demo-icon">info</span>
                <div class="demo-content">
                  <strong>Suffix Input Active:</strong> The registration page and user directory forms will render an empty text box: 
                  <code class="demo-code">Suffix: [ e.g. mni, PhD, Esq ]</code>. Members can enter their recognized honorific titles.
                </div>
              </div>
            </div>
          </div>

          <!-- Section 2: Member ID Generation & Formatting Rules -->
          <div class="settings-card">
            <div class="card-header">
              <div class="header-icon-box">
                <span class="material-symbols-outlined">tag</span>
              </div>
              <div class="header-text">
                <h3>Member ID Generation & Numbering Rules</h3>
                <p>Customize the automated coding pattern, prefix, zero-padding, and delimiter for all newly created accounts.</p>
              </div>
            </div>

            <div class="card-body">
              <div class="form-grid-3">
                <div class="form-group">
                  <label>Prefix Code</label>
                  <input
                    type="text"
                    [(ngModel)]="settings.memberIdPrefix"
                    name="memberIdPrefix"
                    (input)="onPrefixInput()"
                    placeholder="e.g. CC or ID"
                    maxlength="15"
                    class="form-control"
                  />
                  <span class="field-hint">Delimiter will be appended automatically. Trailing dashes are sanitized.</span>
                </div>

                <div class="form-group">
                  <label>Delimiter Separator</label>
                  <select [(ngModel)]="settings.memberIdDelimiter" name="memberIdDelimiter" (change)="refreshPreviews()" class="form-control">
                    <option value="-">Hyphen (-)</option>
                    <option value="/">Forward Slash (/)</option>
                    <option value="_">Underscore (_)</option>
                    <option value=".">Dot (.)</option>
                  </select>
                  <span class="field-hint">Character separating code blocks.</span>
                </div>

                <div class="form-group">
                  <label>Zero-Padding Width</label>
                  <select [(ngModel)]="settings.memberIdPadding" name="memberIdPadding" (change)="refreshPreviews()" class="form-control">
                    <option [ngValue]="3">3 Digits (001)</option>
                    <option [ngValue]="4">4 Digits (0001)</option>
                    <option [ngValue]="5">5 Digits (00001)</option>
                    <option [ngValue]="6">6 Digits (000001)</option>
                  </select>
                  <span class="field-hint">Numeric padding for sequential IDs.</span>
                </div>
              </div>

              <!-- Format Pattern Selection -->
              <div class="form-group" style="margin-top: 16px;">
                <label>Active Generation Pattern</label>
                <div class="patterns-grid">
                  <label
                    *ngFor="let p of previews"
                    class="pattern-card"
                    [class.selected]="settings.memberIdFormat === p.key"
                  >
                    <input
                      type="radio"
                      name="memberIdFormat"
                      [value]="p.key"
                      [(ngModel)]="settings.memberIdFormat"
                      class="pattern-radio"
                    />
                    <div class="pattern-header">
                      <span class="pattern-name">{{ p.name }}</span>
                      <span class="material-symbols-outlined check-icon" *ngIf="settings.memberIdFormat === p.key">check_circle</span>
                    </div>
                    <div class="pattern-example">{{ p.previewExample }}</div>
                    <div class="pattern-desc">{{ p.description }}</div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <!-- Section 3: Directory Governance & Policies -->
          <div class="settings-card">
            <div class="card-header">
              <div class="header-icon-box">
                <span class="material-symbols-outlined">security</span>
              </div>
              <div class="header-text">
                <h3>Directory Access & Deletion Policies</h3>
                <p>Configure security verification requirements and account deletion safety locks.</p>
              </div>
            </div>

            <div class="card-body">
              <div class="preference-row">
                <div class="pref-info">
                  <div class="pref-title-row">
                    <span class="pref-title">Require Confirmed Email to Login</span>
                    <span class="status-badge" [class.badge-active]="settings.requireConfirmedEmailToLogin" [class.badge-inactive]="!settings.requireConfirmedEmailToLogin">
                      {{ settings.requireConfirmedEmailToLogin ? 'ENFORCED' : 'OFF' }}
                    </span>
                  </div>
                  <p class="pref-desc">When enabled, members cannot access the workspace until verifying their email address via OTP or confirmation link.</p>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" [(ngModel)]="settings.requireConfirmedEmailToLogin" name="requireConfirmedEmailToLogin" />
                  <span class="toggle-slider"></span>
                </label>
              </div>

              <div class="divider-line"></div>

              <div class="preference-row">
                <div class="pref-info">
                  <div class="pref-title-row">
                    <span class="pref-title">Allow Permanent User Deletion</span>
                    <span class="status-badge" [class.badge-danger]="settings.enableUserDeletion" [class.badge-safe]="!settings.enableUserDeletion">
                      {{ settings.enableUserDeletion ? 'PERMITTED' : 'PROTECTED' }}
                    </span>
                  </div>
                  <p class="pref-desc">When enabled, administrators can permanently delete member records. When disabled, accounts can only be deactivated or suspended.</p>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" [(ngModel)]="settings.enableUserDeletion" name="enableUserDeletion" />
                  <span class="toggle-slider toggle-danger"></span>
                </label>
              </div>
            </div>
          </div>

          <!-- Form Actions Footer -->
          <div class="settings-footer">
            <a routerLink="/users/console/list" class="btn btn-outline">Cancel</a>
            <button type="submit" class="btn btn-primary" [disabled]="isSaving">
              <span class="material-symbols-outlined" *ngIf="!isSaving">save</span>
              <span>{{ isSaving ? 'Saving Preferences...' : 'Save Settings' }}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  `,
  styles: [`
    .user-settings-page {
      display: flex;
      flex-direction: column;
      gap: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      width: 100%;
    }

    .settings-container { width: 100%; }
    .settings-form { display: flex; flex-direction: column; gap: 20px; }

    .settings-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .card-header {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 18px 24px;
      border-bottom: 1px solid #f1f5f9;
      background: #fafbfc;
    }
    .header-icon-box {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      background: rgba(0, 80, 229, 0.08);
      color: #0050e5;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .header-icon-box span { font-size: 24px; }
    .header-text h3 { margin: 0; font-size: 15px; font-weight: 700; color: #0f172a; }
    .header-text p { margin: 2px 0 0; font-size: 12.5px; color: #64748b; }

    .card-body { padding: 22px 24px; display: flex; flex-direction: column; gap: 18px; }

    .preference-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 24px;
    }
    .pref-info { display: flex; flex-direction: column; gap: 4px; flex: 1; }
    .pref-title-row { display: flex; align-items: center; gap: 10px; }
    .pref-title { font-size: 14px; font-weight: 700; color: #0f172a; }
    .pref-desc { font-size: 12.5px; color: #64748b; margin: 0; line-height: 1.45; }

    .status-badge {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.06em;
      padding: 2px 8px;
      border-radius: 6px;
    }
    .badge-active { background: #dcfce7; color: #166534; }
    .badge-inactive { background: #f1f5f9; color: #64748b; }
    .badge-safe { background: #e0e7ff; color: #3730a3; }
    .badge-danger { background: #fee2e2; color: #991b1b; }

    .divider-line { height: 1px; background: #f1f5f9; margin: 4px 0; }

    .sub-config-block {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 16px 18px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 700;
      color: #334155;
    }
    .hint-text { font-size: 11px; font-weight: 400; color: #64748b; }
    .field-hint { font-size: 11.5px; color: #94a3b8; }

    .form-control {
      padding: 10px 12px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 13px;
      outline: none;
      background: #ffffff;
      color: #0f172a;
      transition: all 0.15s ease;
      width: 100%;
      box-sizing: border-box;
    }
    .form-control:focus {
      border-color: #0050e5;
      box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.1);
    }

    .chips-container { display: flex; flex-direction: column; gap: 6px; }
    .chip-label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.04em; }
    .chips-wrap { display: flex; flex-wrap: wrap; gap: 6px; }
    .title-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      color: #0f172a;
      font-size: 12px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 16px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.02);
    }
    .chip-remove {
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    }
    .chip-remove span { font-size: 14px; }
    .chip-remove:hover { color: #ef4444; }

    .suffix-demo-box {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      background: rgba(0, 80, 229, 0.04);
      border: 1px solid rgba(0, 80, 229, 0.15);
      border-radius: 8px;
      padding: 12px 14px;
      font-size: 12.5px;
      color: #334155;
      line-height: 1.45;
    }
    .demo-icon { font-size: 20px; color: #0050e5; flex-shrink: 0; }
    .demo-code { background: #ffffff; border: 1px solid #cbd5e1; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 12px; color: #0050e5; font-weight: 600; }

    .form-grid-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 14px;
    }
    @media (max-width: 768px) {
      .form-grid-3 { grid-template-columns: 1fr; }
    }

    .patterns-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 12px;
    }
    .pattern-card {
      position: relative;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      padding: 14px 16px;
      cursor: pointer;
      background: #ffffff;
      transition: all 0.15s ease;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .pattern-card:hover { border-color: #0050e5; background: #f8fafc; }
    .pattern-card.selected {
      border-color: #0050e5;
      background: rgba(0, 80, 229, 0.03);
      box-shadow: 0 0 0 2px rgba(0, 80, 229, 0.15);
    }
    .pattern-radio { position: absolute; opacity: 0; }
    .pattern-header { display: flex; justify-content: space-between; align-items: center; }
    .pattern-name { font-size: 12.5px; font-weight: 700; color: #0f172a; }
    .check-icon { font-size: 18px; color: #0050e5; }
    .pattern-example {
      font-size: 14px;
      font-weight: 800;
      color: #0050e5;
      font-family: monospace;
      letter-spacing: 0.04em;
      margin: 4px 0 2px;
    }
    .pattern-desc { font-size: 11.5px; color: #64748b; line-height: 1.35; }

    /* Toggle Switch */
    .toggle-switch {
      position: relative;
      display: inline-block;
      width: 44px;
      height: 24px;
      flex-shrink: 0;
      cursor: pointer;
    }
    .toggle-switch input { opacity: 0; width: 0; height: 0; }
    .toggle-slider {
      position: absolute;
      cursor: pointer;
      top: 0; left: 0; right: 0; bottom: 0;
      background-color: #cbd5e1;
      transition: .2s;
      border-radius: 24px;
    }
    .toggle-slider:before {
      position: absolute;
      content: "";
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: .2s;
      border-radius: 50%;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }
    .toggle-switch input:checked + .toggle-slider { background-color: #0050e5; }
    .toggle-switch input:checked + .toggle-slider.toggle-danger { background-color: #dc2626; }
    .toggle-switch input:checked + .toggle-slider:before { transform: translateX(20px); }

    .settings-footer {
      padding: 16px 24px;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      background: #ffffff;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }
    .btn {
      height: 40px;
      padding: 0 20px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      text-decoration: none;
      border: 1px solid transparent;
      transition: all 0.15s ease;
    }
    .btn-outline { background: #ffffff; border-color: #cbd5e1; color: #334155; }
    .btn-outline:hover { background: #f8fafc; color: #0f172a; border-color: #94a3b8; }
    .btn-primary { background: #0050e5; color: #ffffff; }
    .btn-primary:hover:not(:disabled) { background: #0040b8; }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
  `]
})
export class UserSettingsComponent implements OnInit {
  isLoading = false;
  isSaving = false;

  settings: UserSettingsModel = {
    enableTitle: true,
    preFilledTitles: 'Mr., Mrs., Ms., Dr., Prof., Engr., Chief, Rev., Pastor',
    enableSuffix: true,
    memberIdFormat: 'PrefixYearMonthRandom',
    memberIdPrefix: 'CC',
    memberIdNextNumber: 1,
    memberIdPadding: 4,
    memberIdDelimiter: '-',
    requireConfirmedEmailToLogin: false,
    enableUserDeletion: false
  };

  titleChips: string[] = [];
  previews: MemberIdFormatPreview[] = [];

  headerButtons: PageHeaderButton[] = [
    {
      text: 'Member Directory',
      icon: 'groups',
      isPrimary: false,
      routerLink: '/users/console/list'
    }
  ];

  constructor(
    private api: ApiService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.loadSettings();
  }

  loadSettings(): void {
    this.isLoading = true;
    this.api.get<any>('UsersApi/settings').subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.data) {
          this.settings = {
            enableTitle: res.data.enableTitle !== false,
            preFilledTitles: res.data.preFilledTitles || 'Mr., Mrs., Ms., Dr., Prof., Engr., Chief, Rev., Pastor',
            enableSuffix: res.data.enableSuffix !== false,
            memberIdFormat: res.data.memberIdFormat || 'PrefixYearMonthRandom',
            memberIdPrefix: res.data.memberIdPrefix || 'CC',
            memberIdNextNumber: res.data.nextNumber || res.data.memberIdNextNumber || 1,
            memberIdPadding: res.data.padding || res.data.memberIdPadding || 4,
            memberIdDelimiter: res.data.delimiter || res.data.memberIdDelimiter || '-',
            requireConfirmedEmailToLogin: !!res.data.requireConfirmedEmailToLogin,
            enableUserDeletion: !!res.data.enableUserDeletion
          };
          this.previews = res.data.previews || [];
          this.updateTitleChips();
        }
      },
      error: () => {
        this.isLoading = false;
        this.toast.error('Failed to load user management settings.');
      }
    });
  }

  onPrefixInput(): void {
    // Sanitize trailing separators as the user types
    if (this.settings.memberIdPrefix) {
      this.settings.memberIdPrefix = this.settings.memberIdPrefix.replace(/[-/_:.\s]+$/, '');
    }
    this.refreshPreviews();
  }

  refreshPreviews(): void {
    const params = {
      prefix: this.settings.memberIdPrefix || 'CC',
      startNumber: this.settings.memberIdNextNumber || 1,
      padding: this.settings.memberIdPadding || 4,
      delimiter: this.settings.memberIdDelimiter || '-'
    };

    this.api.get<any>('UsersApi/member-id-config/preview', params).subscribe({
      next: (res) => {
        if (res.data) {
          this.previews = res.data;
        }
      }
    });
  }

  updateTitleChips(): void {
    if (!this.settings.preFilledTitles) {
      this.titleChips = [];
      return;
    }
    this.titleChips = this.settings.preFilledTitles
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);
  }

  removeTitleChip(chip: string): void {
    this.titleChips = this.titleChips.filter(t => t !== chip);
    this.settings.preFilledTitles = this.titleChips.join(', ');
  }

  saveSettings(): void {
    this.isSaving = true;

    // Clean prefix before saving
    if (this.settings.memberIdPrefix) {
      this.settings.memberIdPrefix = this.settings.memberIdPrefix.replace(/[-/_:.\s]+$/, '').toUpperCase();
    }

    const payload = {
      enableTitle: this.settings.enableTitle,
      preFilledTitles: this.settings.preFilledTitles,
      enableSuffix: this.settings.enableSuffix,
      memberIdFormat: this.settings.memberIdFormat,
      memberIdPrefix: this.settings.memberIdPrefix,
      memberIdNextNumber: this.settings.memberIdNextNumber,
      memberIdPadding: this.settings.memberIdPadding,
      memberIdDelimiter: this.settings.memberIdDelimiter,
      requireConfirmedEmailToLogin: this.settings.requireConfirmedEmailToLogin,
      enableUserDeletion: this.settings.enableUserDeletion
    };

    this.api.put<any>('UsersApi/settings', payload).subscribe({
      next: (res) => {
        this.isSaving = false;
        this.toast.success('User management preferences saved successfully.');
        if (res.data?.previews) {
          this.previews = res.data.previews;
        }
      },
      error: (err) => {
        this.isSaving = false;
        this.toast.error(err?.error?.message || 'Failed to save settings.');
      }
    });
  }
}
