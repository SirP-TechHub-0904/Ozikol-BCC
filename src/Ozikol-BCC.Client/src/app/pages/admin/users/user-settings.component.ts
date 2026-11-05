import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { TranslationService } from '../../../core/services/translation.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
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
  enableKpiEvaluations: boolean;
  enablePublicLeaderboard: boolean;
  defaultKpiPeriodCycle: string;
  kpiPassingScore: number;
}

@Component({
  selector: 'app-user-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent, TranslatePipe],
  template: `
    <div class="user-settings-page">
      <!-- Standardized Page Header -->
      <app-page-header
        [eyebrow]="'user_settings.header_eyebrow' | translate:'USER MANAGEMENT PREFERENCES'"
        icon="tune"
        [title]="'user_settings.header_title' | translate:'User Management Settings'"
        [subtitle]="'user_settings.header_subtitle' | translate:'Configure name salutations, professional suffixes, member ID generation rules, and directory governance policies.'"
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
                <h3>{{ 'user_settings.sec1_title' | translate:'Name Titles & Professional Suffixes' }}</h3>
                <p>{{ 'user_settings.sec1_subtitle' | translate:'Control whether salutation titles and honorary suffixes appear on registration and member profiles.' }}</p>
              </div>
            </div>

            <div class="card-body">
              <!-- Toggle 1: Enable Title -->
              <div class="preference-row">
                <div class="pref-info">
                  <div class="pref-title-row">
                    <span class="pref-title">{{ 'user_settings.title_enable_label' | translate:'Enable Name Title / Salutation' }}</span>
                    <span class="status-badge" [class.badge-active]="settings.enableTitle" [class.badge-inactive]="!settings.enableTitle">
                      {{ settings.enableTitle ? ('user_settings.badge_enabled' | translate:'ENABLED') : ('user_settings.badge_disabled' | translate:'DISABLED') }}
                    </span>
                  </div>
                  <p class="pref-desc">{{ 'user_settings.title_enable_desc' | translate:'When enabled, members and staff select their formal title (e.g. Dr., Prof., Engr.) during onboarding and profile setup.' }}</p>
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
                    <span>{{ 'user_settings.prefilled_titles_label' | translate:'Configured Pre-Filled Titles' }}</span>
                    <span class="hint-text">({{ 'user_settings.prefilled_titles_hint' | translate:'Comma-separated list of prefilled title options' }})</span>
                  </label>
                  <textarea
                    rows="2"
                    [(ngModel)]="settings.preFilledTitles"
                    name="preFilledTitles"
                    (ngModelChange)="updateTitleChips()"
                    [placeholder]="'user_settings.prefilled_titles_ph' | translate:'e.g. Mr., Mrs., Ms., Dr., Prof., Engr., Chief, Rev., Pastor'"
                    class="form-control"
                  ></textarea>
                </div>

                <!-- Live Title Chips Preview -->
                <div class="chips-container" *ngIf="titleChips.length > 0">
                  <span class="chip-label">{{ 'user_settings.active_dropdown_options' | translate:'Active Dropdown Options' }} ({{ titleChips.length }}):</span>
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
                    <span class="pref-title">{{ 'user_settings.suffix_enable_label' | translate:'Enable Name Suffix (e.g. mni, PhD, Esq, OON)' }}</span>
                    <span class="status-badge" [class.badge-active]="settings.enableSuffix" [class.badge-inactive]="!settings.enableSuffix">
                      {{ settings.enableSuffix ? ('user_settings.badge_enabled' | translate:'ENABLED') : ('user_settings.badge_disabled' | translate:'DISABLED') }}
                    </span>
                  </div>
                  <p class="pref-desc">
                    {{ 'user_settings.suffix_enable_desc' | translate:'When enabled, an open text space is made available on the registration page and member creation forms for professional or honorary post-nominal suffixes.' }}
                    <strong>{{ 'user_settings.suffix_freeform_note' | translate:'Suffix is freeform text and not pre-filled.' }}</strong>
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
                  <strong>{{ 'user_settings.suffix_demo_title' | translate:'Suffix Input Active:' }}</strong> {{ 'user_settings.suffix_demo_body' | translate:'The registration page and user directory forms will render an empty text box: Suffix: [ e.g. mni, PhD, Esq ]. Members can enter their recognized honorific titles.' }}
                </div>
              </div>
            </div>
          </div>

          <!-- Section 2: Member ID Auto-Generation & Security Rules -->
          <div class="settings-card member-id-card">
            <div class="card-header">
              <div class="header-icon-box">
                <span class="material-symbols-outlined">badge</span>
              </div>
              <div class="header-text">
                <h3>{{ 'user_settings.sec2_title' | translate:'Member ID Auto-Generation & Security Rules' }}</h3>
                <p>{{ 'user_settings.sec2_subtitle' | translate:'Select from 10 standard institutional coding formats, customize tokens, and configure member authentication policies.' }}</p>
              </div>
            </div>

            <div class="card-body">
              <!-- Top Row: Dropdown Selector & Dynamic Live Preview -->
              <div class="format-selection-grid">
                <div class="form-group format-dropdown-group">
                  <label class="form-label" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                    <span style="font-weight: 700; font-size: 13px; color: #0f172a;">{{ 'user_settings.select_format_label' | translate:'Select Member ID Format (10 Standard Formats)' }}</span>
                    <span class="badge-pill-soft">{{ 'user_settings.badge_immediate' | translate:'Immediate Effect' }}</span>
                  </label>
                  <select [(ngModel)]="settings.memberIdFormat" name="memberIdFormat" (ngModelChange)="onFormatParamChange()" class="form-control format-select">
                    <option *ngFor="let f of previews; let i = index" [value]="f.key">
                      {{ 'user_settings.format_label' | translate:'Format' }} {{ i + 1 }}: {{ f.name }} (e.g. {{ f.previewExample }})
                    </option>
                  </select>
                  <span class="field-hint" style="display: block; margin-top: 6px;">{{ getActiveFormatDescription() }}</span>
                </div>

                <!-- Dynamic Live Preview Box -->
                <div class="live-preview-box">
                  <div class="preview-header">
                    <span class="material-symbols-outlined preview-icon">visibility</span>
                    <span class="preview-label">{{ 'user_settings.preview_header' | translate:'NEXT GENERATED MEMBER ID PREVIEW' }}</span>
                  </div>
                  <div class="preview-badge-display">
                    <span class="preview-id-text">{{ getActivePreviewSample() }}</span>
                  </div>
                  <div class="preview-footer-note">
                    <span class="material-symbols-outlined" style="font-size:14px; color:#10b981;">check_circle</span>
                    <span>{{ isCurrentFormatSequential() ? ('user_settings.seq_strict' | translate:'Strict Serial Auto-Incrementing Sequence (1, 2, 3...)') : ('user_settings.seq_crypto' | translate:'Cryptographic Random Secure Format') }}</span>
                  </div>
                </div>
              </div>

              <!-- Configuration Controls: Prefix, Starting Counter, Padding, Delimiter -->
              <div class="format-params-grid">
                <div class="form-group">
                  <label class="form-label" style="font-weight: 600; font-size: 12.5px; color: #334155;">{{ 'user_settings.field_prefix' | translate:'Custom Prefix Code' }}</label>
                  <input
                    type="text"
                    [(ngModel)]="settings.memberIdPrefix"
                    name="memberIdPrefix"
                    (input)="onPrefixInput()"
                    class="form-control"
                    [placeholder]="'user_settings.field_prefix_ph' | translate:'e.g. CC, BCC, MEM, ORG'"
                    maxlength="15"
                  />
                  <span class="field-hint">{{ 'user_settings.field_prefix_hint' | translate:'Organization code prepended to ID' }}</span>
                </div>

                <div class="form-group">
                  <label class="form-label" style="font-weight: 600; font-size: 12.5px; color: #334155;">{{ 'user_settings.field_next_num' | translate:'Next Serial Counter Number' }}</label>
                  <input
                    type="number"
                    [(ngModel)]="settings.memberIdNextNumber"
                    name="memberIdNextNumber"
                    (ngModelChange)="refreshPreviews()"
                    class="form-control"
                    placeholder="1"
                    min="1"
                  />
                  <span class="field-hint">{{ 'user_settings.field_next_num_hint' | translate:'Current sequential auto-increment value' }}</span>
                </div>

                <div class="form-group">
                  <label class="form-label" style="font-weight: 600; font-size: 12.5px; color: #334155;">{{ 'user_settings.field_padding' | translate:'Zero Padding Length' }}</label>
                  <select [(ngModel)]="settings.memberIdPadding" name="memberIdPadding" (change)="refreshPreviews()" class="form-control">
                    <option [ngValue]="3">{{ 'user_settings.pad_3' | translate:'3 Digits (e.g. 001)' }}</option>
                    <option [ngValue]="4">{{ 'user_settings.pad_4' | translate:'4 Digits (e.g. 0001)' }}</option>
                    <option [ngValue]="5">{{ 'user_settings.pad_5' | translate:'5 Digits (e.g. 00001)' }}</option>
                    <option [ngValue]="6">{{ 'user_settings.pad_6' | translate:'6 Digits (e.g. 000001)' }}</option>
                  </select>
                  <span class="field-hint">{{ 'user_settings.field_padding_hint' | translate:'Leading zeros for serial numbers' }}</span>
                </div>

                <div class="form-group">
                  <label class="form-label" style="font-weight: 600; font-size: 12.5px; color: #334155;">{{ 'user_settings.field_delim' | translate:'Delimiter Separator' }}</label>
                  <select [(ngModel)]="settings.memberIdDelimiter" name="memberIdDelimiter" (change)="refreshPreviews()" class="form-control">
                    <option value="-">{{ 'user_settings.delim_hyphen' | translate:'- Dash (e.g. CC-2026-0001)' }}</option>
                    <option value="/">{{ 'user_settings.delim_slash' | translate:'/ Slash (e.g. CC/2026/0001)' }}</option>
                    <option value=".">{{ 'user_settings.delim_dot' | translate:'. Dot (e.g. CC.2026.0001)' }}</option>
                    <option value="_">{{ 'user_settings.delim_underscore' | translate:'_ Underscore (e.g. CC_2026_0001)' }}</option>
                  </select>
                  <span class="field-hint">{{ 'user_settings.field_delim_hint' | translate:'Separator between tokens' }}</span>
                </div>
              </div>

              <!-- Security & Access Policy 1: Email Confirmation -->
              <div class="security-policy-box" style="margin-top: 16px; padding: 14px 18px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; display: flex; align-items: center; justify-content: space-between; gap: 16px;">
                <div style="display: flex; align-items: flex-start; gap: 12px;">
                  <span class="material-symbols-outlined" style="font-size: 22px; color: #0050e5; margin-top: 2px;">verified_user</span>
                  <div>
                    <strong style="font-size: 13px; color: #0f172a; display: block;">{{ 'user_settings.gov_email_confirm_label' | translate:'Enforce Email Verification Before Login' }}</strong>
                    <p style="margin: 2px 0 0; font-size: 12px; color: #64748b;">
                      {{ 'user_settings.gov_email_confirm_desc' | translate:'When enabled, members cannot sign into the workspace until their email address is confirmed via the 6-digit OTP code.' }}
                    </p>
                  </div>
                </div>
                <label class="toggle-switch" style="position: relative; display: inline-block; width: 44px; height: 24px; flex-shrink: 0;">
                  <input type="checkbox" [(ngModel)]="settings.requireConfirmedEmailToLogin" name="requireConfirmedEmailToLogin" style="opacity: 0; width: 0; height: 0;" />
                  <span class="toggle-slider" [class.toggle-on]="settings.requireConfirmedEmailToLogin" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #cbd5e1; transition: .2s; border-radius: 24px;"></span>
                </label>
              </div>

              <!-- Security & Access Policy 2: Allow User Account Deletion -->
              <div class="security-policy-box" style="margin-top: 12px; padding: 14px 18px; background: #fff5f5; border: 1px solid #fed7d7; border-radius: 10px; display: flex; align-items: center; justify-content: space-between; gap: 16px;">
                <div style="display: flex; align-items: flex-start; gap: 12px;">
                  <span class="material-symbols-outlined" style="font-size: 22px; color: #e53e3e; margin-top: 2px;">person_remove</span>
                  <div>
                    <strong style="font-size: 13px; color: #9b2c2c; display: block;">{{ 'user_settings.gov_delete_label' | translate:'Allow Administrator User Account Deletion' }}</strong>
                    <p style="margin: 2px 0 0; font-size: 12px; color: #742a2a;">
                      {{ 'user_settings.gov_delete_desc' | translate:'When enabled, administrators are permitted to permanently delete user accounts from the portal.' }}
                    </p>
                  </div>
                </div>
                <label class="toggle-switch" style="position: relative; display: inline-block; width: 44px; height: 24px; flex-shrink: 0;">
                  <input type="checkbox" [(ngModel)]="settings.enableUserDeletion" name="enableUserDeletion" style="opacity: 0; width: 0; height: 0;" />
                  <span class="toggle-slider" [class.toggle-on]="settings.enableUserDeletion" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #cbd5e1; transition: .2s; border-radius: 24px;"></span>
                </label>
              </div>

              <!-- All 10 Formats Overview Grid -->
              <div class="formats-matrix-section">
                <div class="matrix-header">
                  <span class="matrix-title">{{ 'user_settings.all_formats_title' | translate:'All 10 Available Format Patterns Quick Reference' }}</span>
                  <span class="matrix-hint">{{ 'user_settings.all_formats_hint' | translate:'Click any card below to instantly select that format' }}</span>
                </div>

                <div class="formats-cards-grid">
                  <div
                    class="format-card-mini"
                    *ngFor="let f of previews; let idx = index"
                    [class.selected]="settings.memberIdFormat === f.key"
                    (click)="selectFormat(f.key)"
                  >
                    <div class="card-mini-top">
                      <span class="format-number">{{ 'user_settings.format_label' | translate:'Format' }} {{ idx + 1 }}</span>
                      <span class="format-type-tag" [class.type-serial]="f.isSequential" [class.type-random]="!f.isSequential">
                        {{ f.isSequential ? ('user_settings.type_serial' | translate:'Serial (1,2,3..)') : ('user_settings.type_random' | translate:'Random') }}
                      </span>
                    </div>
                    <h4 class="format-card-title">{{ f.name }}</h4>
                    <div class="format-preview-chip">{{ f.previewExample }}</div>
                    <p class="format-card-desc">{{ f.description }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Section 3: Performance Evaluations & KPI Settings -->
          <div class="settings-card">
            <div class="card-header">
              <div class="header-icon-box">
                <span class="material-symbols-outlined">monitoring</span>
              </div>
              <div class="header-text">
                <h3>{{ 'user_settings.sec3_title' | translate:'Performance Evaluations & KPI Settings' }}</h3>
                <p>{{ 'user_settings.sec3_subtitle' | translate:'Configure scorecard evaluation cycles, passing benchmarks, and public member leaderboard visibility.' }}</p>
              </div>
            </div>

            <div class="card-body">
              <!-- Toggle: Enable KPI Evaluations -->
              <div class="preference-row">
                <div class="pref-info">
                  <div class="pref-title-row">
                    <span class="pref-title">{{ 'user_settings.kpi_enable_label' | translate:'Enable Member KPI Evaluations' }}</span>
                    <span class="status-badge" [class.badge-active]="settings.enableKpiEvaluations" [class.badge-inactive]="!settings.enableKpiEvaluations">
                      {{ settings.enableKpiEvaluations ? ('user_settings.badge_enabled' | translate:'ENABLED') : ('user_settings.badge_disabled' | translate:'DISABLED') }}
                    </span>
                  </div>
                  <p class="pref-desc">{{ 'user_settings.kpi_enable_desc' | translate:'Activate performance scorecards and multi-factor evaluation rubrics for members and staff across the tenant.' }}</p>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" [(ngModel)]="settings.enableKpiEvaluations" name="enableKpiEvaluations" />
                  <span class="toggle-slider"></span>
                </label>
              </div>

              <div class="divider-line"></div>

              <!-- Toggle: Publish Leaderboard -->
              <div class="preference-row">
                <div class="pref-info">
                  <div class="pref-title-row">
                    <span class="pref-title">{{ 'user_settings.kpi_board_label' | translate:'Publish Member Performance Leaderboard' }}</span>
                    <span class="status-badge" [class.badge-active]="settings.enablePublicLeaderboard" [class.badge-inactive]="!settings.enablePublicLeaderboard">
                      {{ settings.enablePublicLeaderboard ? ('user_settings.badge_visible' | translate:'PUBLIC') : ('user_settings.badge_hidden' | translate:'ADMIN ONLY') }}
                    </span>
                  </div>
                  <p class="pref-desc">{{ 'user_settings.kpi_board_desc' | translate:'Allow members to view competitive performance rankings and podium positions in their personal member workspace.' }}</p>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" [(ngModel)]="settings.enablePublicLeaderboard" name="enablePublicLeaderboard" />
                  <span class="toggle-slider"></span>
                </label>
              </div>

              <!-- Sub-config when KPI is enabled -->
              <div class="sub-config-block" *ngIf="settings.enableKpiEvaluations">
                <div class="kpi-config-grid" style="display:grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                  <div class="form-group">
                    <label>
                      <span>{{ 'user_settings.kpi_cycle_label' | translate:'Default Evaluation Cycle / Period' }}</span>
                    </label>
                    <select [(ngModel)]="settings.defaultKpiPeriodCycle" name="defaultKpiPeriodCycle" class="form-control" style="height: 42px; padding: 0 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; font-weight: 600; color: #0f172a; background: #ffffff;">
                      <option value="Quarterly">{{ 'user_settings.cycle_quarterly' | translate:'Quarterly (e.g. 2026 Q1, 2026 Q2...)' }}</option>
                      <option value="Monthly">{{ 'user_settings.cycle_monthly' | translate:'Monthly (e.g. October 2026, November 2026...)' }}</option>
                      <option value="Bi-Annual">{{ 'user_settings.cycle_semiannual' | translate:'Bi-Annual (H1 / H2)' }}</option>
                      <option value="Annual">{{ 'user_settings.cycle_annual' | translate:'Annual Review Cycle' }}</option>
                    </select>
                    <span class="hint-text">{{ 'user_settings.kpi_cycle_hint' | translate:'Pre-selected cycle duration when generating periodic grading sheets.' }}</span>
                  </div>

                  <div class="form-group">
                    <label>
                      <span>{{ 'user_settings.kpi_benchmark_label' | translate:'Benchmark Passing Score (%)' }}</span>
                    </label>
                    <input
                      type="number"
                      [(ngModel)]="settings.kpiPassingScore"
                      name="kpiPassingScore"
                      min="1"
                      max="100"
                      class="form-control"
                      placeholder="70"
                    />
                    <span class="hint-text">{{ 'user_settings.kpi_benchmark_hint' | translate:'Minimum threshold percentage required for satisfactory performance rating.' }}</span>
                  </div>
                </div>

                <div style="margin-top: 14px; display: flex; align-items: center; justify-content: space-between; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px 16px; flex-wrap: wrap; gap: 10px;">
                  <div style="display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: #166534; font-weight: 600;">
                    <span class="material-symbols-outlined" style="font-size: 20px;">verified</span>
                    <span>{{ 'user_settings.kpi_ready_msg' | translate:'Ready to evaluate scorecards or configure rubric indicators?' }}</span>
                  </div>
                  <a routerLink="/users/console/kpi" class="btn btn-outline btn-sm" style="background:#fff;">
                    <span class="material-symbols-outlined">launch</span>
                    <span>{{ 'user_settings.kpi_hub_cta' | translate:'Open KPI & Leaderboard Hub' }}</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          <!-- Section 4: Directory Governance & Policies -->
          <div class="settings-card">
            <div class="card-header">
              <div class="header-icon-box">
                <span class="material-symbols-outlined">security</span>
              </div>
              <div class="header-text">
                <h3>{{ 'user_settings.sec4_title' | translate:'Directory Access & Deletion Policies' }}</h3>
                <p>{{ 'user_settings.sec4_subtitle' | translate:'Configure security verification requirements and account deletion safety locks.' }}</p>
              </div>
            </div>

            <div class="card-body">
              <div class="preference-row">
                <div class="pref-info">
                  <div class="pref-title-row">
                    <span class="pref-title">{{ 'user_settings.gov_email_confirm_label' | translate:'Require Confirmed Email to Login' }}</span>
                    <span class="status-badge" [class.badge-active]="settings.requireConfirmedEmailToLogin" [class.badge-inactive]="!settings.requireConfirmedEmailToLogin">
                      {{ settings.requireConfirmedEmailToLogin ? ('user_settings.badge_enforced' | translate:'ENFORCED') : ('user_settings.badge_off' | translate:'OFF') }}
                    </span>
                  </div>
                  <p class="pref-desc">{{ 'user_settings.gov_email_confirm_desc' | translate:'When enabled, members cannot access the workspace until verifying their email address via OTP or confirmation link.' }}</p>
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
                    <span class="pref-title">{{ 'user_settings.gov_delete_label' | translate:'Allow Permanent User Deletion' }}</span>
                    <span class="status-badge" [class.badge-danger]="settings.enableUserDeletion" [class.badge-safe]="!settings.enableUserDeletion">
                      {{ settings.enableUserDeletion ? ('user_settings.badge_allowed' | translate:'PERMITTED') : ('user_settings.badge_prohibited' | translate:'PROTECTED') }}
                    </span>
                  </div>
                  <p class="pref-desc">{{ 'user_settings.gov_delete_desc' | translate:'When enabled, administrators can permanently delete member records. When disabled, accounts can only be deactivated or suspended.' }}</p>
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
            <a routerLink="/users/console/list" class="btn btn-outline">{{ 'user_cat.btn_cancel' | translate:'Cancel' }}</a>
            <button type="submit" class="btn btn-primary" [disabled]="isSaving">
              <span class="material-symbols-outlined" *ngIf="!isSaving">save</span>
              <span>{{ isSaving ? ('user_settings.btn_saving' | translate:'Saving Preferences...') : ('user_settings.btn_save' | translate:'Save Settings') }}</span>
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

    /* Member ID Matrix Styles */
    .badge-pill-soft {
      font-size: 11px;
      font-weight: 700;
      color: #0050e5;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      padding: 2px 8px;
      border-radius: 12px;
    }
    .format-selection-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; margin-bottom: 20px; }
    @media (max-width: 900px) {
      .format-selection-grid { grid-template-columns: 1fr; }
    }
    .format-select { height: 42px; font-size: 13.5px; font-weight: 600; }
    .live-preview-box { 
      padding: 14px 18px; 
      background: #f8fafc; 
      border: 2px solid #cbd5e1; 
      border-radius: 10px; 
      box-sizing: border-box;
    }
    .preview-header { display: flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 800; color: #64748b; letter-spacing: 0.05em; margin-bottom: 6px; }
    .preview-icon { font-size: 16px; color: #64748b; }
    .preview-badge-display { font-size: 20px; font-weight: 800; color: #0050e5; font-family: monospace; letter-spacing: 0.05em; word-break: break-all; }
    .preview-footer-note { display: flex; align-items: center; gap: 5px; font-size: 11px; color: #64748b; margin-top: 6px; }
    .format-params-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
    @media (max-width: 900px) {
      .format-params-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 500px) {
      .format-params-grid { grid-template-columns: 1fr; }
    }

    .formats-matrix-section { margin-top: 24px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
    .matrix-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .matrix-title { font-size: 13px; font-weight: 700; color: #0f172a; }
    .matrix-hint { font-size: 11px; color: #94a3b8; }
    .formats-cards-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; }
    @media (max-width: 1200px) {
      .formats-cards-grid { grid-template-columns: repeat(3, 1fr); }
    }
    @media (max-width: 768px) {
      .formats-cards-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 480px) {
      .formats-cards-grid { grid-template-columns: 1fr; }
    }
    .format-card-mini { 
      padding: 10px 12px; 
      border: 2px solid #cbd5e1; 
      border-radius: 8px; 
      background: #ffffff; 
      cursor: pointer; 
      transition: all 0.15s; 
      box-sizing: border-box;
      overflow: hidden;
    }
    .format-card-mini:hover { border-color: #93c5fd; background: #f8fafc; }
    .format-card-mini.selected { border-color: #0050e5; background: #eff6ff; box-shadow: 0 0 0 1px #0050e5; }
    .card-mini-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .format-number { font-size: 10px; font-weight: 700; color: #64748b; }
    .format-type-tag { font-size: 9px; font-weight: 700; padding: 1px 4px; border-radius: 4px; }
    .type-serial { background: #dcfce7; color: #15803d; }
    .type-random { background: #f1f5f9; color: #475569; }
    .format-card-title { font-size: 11.5px; font-weight: 700; color: #0f172a; margin: 0 0 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .format-preview-chip { font-family: monospace; font-size: 10.5px; font-weight: 700; color: #0050e5; background: rgba(0,80,229,0.06); padding: 2px 5px; border-radius: 4px; display: inline-block; margin-bottom: 4px; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .format-card-desc { font-size: 10px; color: #64748b; margin: 0; line-height: 1.3; height: 26px; overflow: hidden; }
    .toggle-slider.toggle-on { background-color: #0050e5 !important; }
    .toggle-slider.toggle-on:before { transform: translateX(20px); }

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
    .btn-primary { background: #0050e5 !important; color: #ffffff !important; }
    .btn-primary span, .btn-primary .material-symbols-outlined { color: #ffffff !important; }
    .btn-primary:hover:not(:disabled) { background: #0040b8 !important; color: #ffffff !important; }
    .btn-primary:hover:not(:disabled) span, .btn-primary:hover:not(:disabled) .material-symbols-outlined { color: #ffffff !important; }
    .btn-primary:disabled { opacity: 0.65; cursor: not-allowed; color: #ffffff !important; }
    .btn-primary:disabled span, .btn-primary:disabled .material-symbols-outlined { color: #ffffff !important; }
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
    enableUserDeletion: false,
    enableKpiEvaluations: true,
    enablePublicLeaderboard: true,
    defaultKpiPeriodCycle: 'Quarterly',
    kpiPassingScore: 70
  };

  titleChips: string[] = [];
  previews: MemberIdFormatPreview[] = [];

  get headerButtons(): PageHeaderButton[] {
    return [
      {
        text: this.translationService.translate('directory.title', 'Member Directory'),
        icon: 'groups',
        isPrimary: false,
        routerLink: '/users/console/list'
      }
    ];
  }

  constructor(
    private api: ApiService,
    private toast: ToastService,
    private translationService: TranslationService
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
            enableUserDeletion: !!res.data.enableUserDeletion,
            enableKpiEvaluations: res.data.enableKpiEvaluations !== false,
            enablePublicLeaderboard: res.data.enablePublicLeaderboard !== false,
            defaultKpiPeriodCycle: res.data.defaultKpiPeriodCycle || 'Quarterly',
            kpiPassingScore: res.data.kpiPassingScore || 70
          };
          this.previews = this.sanitizePreviews(res.data.previews || []);
          this.updateTitleChips();
        }
      },
      error: () => {
        this.isLoading = false;
        this.toast.error(this.translationService.translate('user_settings.err_saved_failed', 'Failed to load user management settings.'));
      }
    });
  }

  sanitizePreviews(list: MemberIdFormatPreview[]): MemberIdFormatPreview[] {
    if (!list) return [];
    return list.map(p => ({
      ...p,
      previewExample: (p.previewExample || '')
        .replace(/[-]{2,}/g, '-')
        .replace(/[/]{2,}/g, '/')
        .replace(/[_]{2,}/g, '_')
    }));
  }

  selectFormat(formatKey: string): void {
    this.settings.memberIdFormat = formatKey;
  }

  onFormatParamChange(): void {
    this.refreshPreviews();
  }

  getActivePreviewSample(): string {
    const active = this.previews.find(p => p.key === this.settings.memberIdFormat);
    return active ? active.previewExample : `${this.settings.memberIdPrefix || 'CC'}${this.settings.memberIdDelimiter || '-'}0001`;
  }

  getActiveFormatDescription(): string {
    const active = this.previews.find(p => p.key === this.settings.memberIdFormat);
    return active ? active.description : 'Standard organizational member coding format.';
  }

  isCurrentFormatSequential(): boolean {
    const active = this.previews.find(p => p.key === this.settings.memberIdFormat);
    return active ? active.isSequential : true;
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
          this.previews = this.sanitizePreviews(res.data);
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
      enableUserDeletion: this.settings.enableUserDeletion,
      enableKpiEvaluations: this.settings.enableKpiEvaluations,
      enablePublicLeaderboard: this.settings.enablePublicLeaderboard,
      defaultKpiPeriodCycle: this.settings.defaultKpiPeriodCycle,
      kpiPassingScore: this.settings.kpiPassingScore
    };

    this.api.put<any>('UsersApi/settings', payload).subscribe({
      next: (res) => {
        this.isSaving = false;
        this.toast.success(this.translationService.translate('user_settings.msg_saved_success', 'User management preferences saved successfully.'));
        if (res.data?.previews) {
          this.previews = res.data.previews;
        }
      },
      error: (err) => {
        this.isSaving = false;
        this.toast.error(err?.error?.message || this.translationService.translate('user_settings.err_saved_failed', 'Failed to save settings.'));
      }
    });
  }
}
