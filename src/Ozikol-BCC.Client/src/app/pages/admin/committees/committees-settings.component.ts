import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PageHeaderComponent, PageHeaderButton } from '../../../shared/components/page-header/page-header.component';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { ToastService } from '../../../core/services/toast.service';
import { CommitteesService, CommitteeInfoSpec } from '../../../core/services/committees.service';
import { CommitteesUxHelpersComponent } from '../../../shared/components/committees-ux-helpers/committees-ux-helpers.component';

/**
 * Administrator Settings & Dynamic Alias Engine (A7) for bcp-committees.
 * Enables instant workspace-wide switching of terminology (e.g. "Ministries", "Actor Groups", "Chapters"),
 * external onboarding governance, Google / Cloud document linking controls, and custom numeric report KPIs.
 */
@Component({
  selector: 'app-committees-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent, TranslatePipe, CommitteesUxHelpersComponent],
  template: `
    <div class="comm-page">
      <app-page-header
        [eyebrow]="'committees.eyebrow' | translate:'PEOPLE & COMMUNITY'"
        icon="tune"
        [title]="model.aliasSingular + ' ' + ('committees.settings' | translate:'Settings')"
        subtitle="Configure custom terminology aliases, external link governance, cloud document rules, and custom report metrics."
        [buttons]="headerButtons"
        [loading]="loading"
      ></app-page-header>

      <div class="comm-subnav">
        <a routerLink="/committees/console/dashboard" class="comm-subnav-link">
          <span class="material-symbols-outlined">space_dashboard</span>
          <span>{{ model.aliasSingular }} {{ 'committees.dashboard' | translate:'Dashboard' }}</span>
        </a>
        <a routerLink="/committees/console/manage" class="comm-subnav-link">
          <span class="material-symbols-outlined">groups</span>
          <span>{{ 'committees.manage' | translate:'Manage' }} {{ model.aliasPlural }}</span>
        </a>
        <a routerLink="/committees/console/registrations" class="comm-subnav-link">
          <span class="material-symbols-outlined">how_to_reg</span>
          <span>{{ 'committees.registrations' | translate:'Registrations & Intake' }}</span>
        </a>
        <a routerLink="/committees/console/reports" class="comm-subnav-link">
          <span class="material-symbols-outlined">assignment</span>
          <span>{{ 'committees.reports_docs' | translate:'Meeting Reports & Docs' }}</span>
        </a>
        <a routerLink="/committees/console/forms" class="comm-subnav-link">
          <span class="material-symbols-outlined">dynamic_form</span>
          <span>{{ 'committees.extra_forms' | translate:'Extra-Info Forms' }}</span>
        </a>
        <a routerLink="/committees/console/settings" class="comm-subnav-link active">
          <span class="material-symbols-outlined">tune</span>
          <span>{{ model.aliasSingular }} {{ 'committees.settings' | translate:'Settings' }}</span>
        </a>
      </div>

      <!-- 1. DYNAMIC TERMINOLOGY & ALIAS ENGINE -->
      <div class="panel-card">
        <div class="panel-head">
          <div>
            <h3>{{ 'committees.alias_engine_title' | translate }}</h3>
            <p>{{ 'committees.alias_engine_desc' | translate }}</p>
          </div>
          <button type="button" class="info-btn" (click)="openAliasInfo()">
            <span class="material-symbols-outlined">info</span>
          </button>
        </div>

        <!-- 1-Click Preset Chips -->
        <div class="preset-bar">
          <span class="preset-lbl">Quick Presets:</span>
          <button type="button" class="preset-chip" (click)="applyPreset('Committee', 'Committees', 'Sub-Committee', 'Sub-Committees', 'Chairperson', 'Secretary')">Committees</button>
          <button type="button" class="preset-chip" (click)="applyPreset('Ministry', 'Ministries', 'Unit', 'Units', 'Ministry Lead', 'Secretary')">Ministries & Units</button>
          <button type="button" class="preset-chip" (click)="applyPreset('Actor Group', 'Actors & Casts', 'Cast Unit', 'Cast Units', 'Director', 'Stage Manager')">Actors & Production</button>
          <button type="button" class="preset-chip" (click)="applyPreset('Department', 'Departments', 'Team', 'Teams', 'Head of Department', 'Coordinator')">Departments & Teams</button>
          <button type="button" class="preset-chip" (click)="applyPreset('Chapter', 'Chapters', 'Cell', 'Cells', 'Chapter President', 'Scribe')">Chapters & Cells</button>
          <button type="button" class="preset-chip" (click)="applyPreset('Club', 'Clubs & Societies', 'Squad', 'Squads', 'Club Captain', 'Secretary')">Clubs & Societies</button>
        </div>

        <div class="grid-3">
          <div class="field-grp">
            <label>Singular Alias (replaces "Committee")</label>
            <input type="text" [(ngModel)]="model.aliasSingular" placeholder="e.g. Ministry or Actor Group" />
          </div>
          <div class="field-grp">
            <label>Plural Alias (Sidebar & Directory Title)</label>
            <input type="text" [(ngModel)]="model.aliasPlural" placeholder="e.g. Ministries or Actors" />
          </div>
          <div class="field-grp">
            <label>Primary Leader Title</label>
            <input type="text" [(ngModel)]="model.leaderTitleAlias" placeholder="e.g. Chairperson or Director" />
          </div>
          <div class="field-grp">
            <label>Sub-Unit Singular Alias</label>
            <input type="text" [(ngModel)]="model.subGroupAliasSingular" placeholder="e.g. Unit or Cast" />
          </div>
          <div class="field-grp">
            <label>Sub-Unit Plural Alias</label>
            <input type="text" [(ngModel)]="model.subGroupAliasPlural" placeholder="e.g. Units or Casts" />
          </div>
          <div class="field-grp">
            <label>Secretary / Scribe Title</label>
            <input type="text" [(ngModel)]="model.secretaryTitleAlias" placeholder="e.g. Secretary or Stage Manager" />
          </div>
        </div>

        <!-- Live Preview Strip -->
        <div class="live-preview-box">
          <span class="material-symbols-outlined">visibility</span>
          <div>
            <strong>Live UI Preview:</strong>
            <span>Admin Menu: <em>Manage {{ model.aliasPlural || 'Committees' }}</em> • Member Sidebar: <em>My {{ model.aliasPlural || 'Committees' }}</em> • Leadership: <em>{{ model.leaderTitleAlias || 'Chairperson' }} &amp; {{ model.secretaryTitleAlias || 'Secretary' }}</em></span>
          </div>
        </div>
      </div>

      <!-- 2. EXTERNAL REGISTRATION & CLOUD INTEGRATION RULES -->
      <div class="grid-2">
        <div class="panel-card">
          <h3>External Registration & Onboarding Rules</h3>
          <label class="toggle-row">
            <input type="checkbox" [(ngModel)]="model.allowExternalRegistration" />
            <div>
              <strong>Enable Public External Registration Links</strong>
              <span>Allow sharing external links so applicants can register into open {{ model.aliasPlural.toLowerCase() }}.</span>
            </div>
          </label>

          <label class="toggle-row">
            <input type="checkbox" [(ngModel)]="model.requireApprovalForExternal" />
            <div>
              <strong>Require Admin / {{ model.leaderTitleAlias }} Approval</strong>
              <span>Hold external link submissions in the Intake Queue before adding to active rosters.</span>
            </div>
          </label>

          <label class="toggle-row">
            <input type="checkbox" [(ngModel)]="model.autoProvisionMemberOnApprove" />
            <div>
              <strong>Auto-Create Workspace Account on External Approval</strong>
              <span>Automatically create a member profile when approving a brand-new external applicant.</span>
            </div>
          </label>

          <div class="field-grp" style="margin-top:8px;">
            <label>Default Extra-Info Form (Fallback when a group has none assigned)</label>
            <select [(ngModel)]="model.defaultExtraInfoFormId">
              <option [ngValue]="null">None (Only core identity for external visitors)</option>
              <option *ngFor="let f of forms" [ngValue]="f.id">{{ f.title }}</option>
            </select>
          </div>
        </div>

        <div class="panel-card">
          <h3>Meeting Reports, Uploads & Google / Cloud Workspace</h3>
          <label class="toggle-row">
            <input type="checkbox" [(ngModel)]="model.allowGoogleCloudLinking" />
            <div>
              <strong>Enable Google Docs, Sheets & Cloud Notebook Linking</strong>
              <span>Allow connecting Google Drive / Docs / Sheets / Notebooks and Excel Online URLs on reports and shelves.</span>
            </div>
          </label>

          <label class="toggle-row">
            <input type="checkbox" [(ngModel)]="model.allowAnyMemberReportSubmission" />
            <div>
              <strong>Allow Any Enrolled Member to Submit Reports</strong>
              <span>When unchecked, only appointed {{ model.leaderTitleAlias }} / {{ model.secretaryTitleAlias }} roles and Admins can submit reports.</span>
            </div>
          </label>

          <div class="grid-2" style="margin-top:8px;">
            <div class="field-grp">
              <label>Max File Upload Size (MB)</label>
              <input type="number" min="1" max="100" [(ngModel)]="model.maxUploadSizeMb" />
            </div>
            <div class="field-grp">
              <label>Report Reminder Cadence</label>
              <select [(ngModel)]="model.reportReminderCadence">
                <option value="None">None</option>
                <option value="Weekly">Weekly</option>
                <option value="BiWeekly">Every 2 Weeks</option>
                <option value="Monthly">Monthly</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. OPTIONAL CUSTOM NUMERIC REPORT METRICS -->
      <div class="panel-card">
        <div class="panel-head">
          <div>
            <h3>Custom Numeric Report KPIs (Optional)</h3>
            <p>Add custom numeric counters (e.g. New Visitors, Volunteer Hours, Items Produced) to every {{ model.aliasSingular.toLowerCase() }} report form.</p>
          </div>
          <button type="button" class="btn-secondary-sm" (click)="addCustomMetric()">
            <span class="material-symbols-outlined">add</span>
            <span>Add Metric</span>
          </button>
        </div>

        <div class="metrics-list" *ngIf="model.customReportMetrics?.length > 0">
          <div class="metric-row" *ngFor="let m of model.customReportMetrics; let i = index">
            <input type="text" [(ngModel)]="m.label" (blur)="syncMetricKey(m)" placeholder="e.g. Hours Volunteered" />
            <input type="text" [(ngModel)]="m.unit" placeholder="Unit (e.g. Hours, People)" />
            <button type="button" class="btn-icon danger" (click)="model.customReportMetrics.splice(i, 1)">
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>
        </div>
      </div>

      <div class="save-bar">
        <button type="button" class="btn-primary-lg" (click)="saveSettings()" [disabled]="saving">
          <span class="material-symbols-outlined">save</span>
          <span>{{ saving ? 'Saving...' : ('Save ' + model.aliasSingular + ' Settings') }}</span>
        </button>
      </div>

      <app-committees-ux-helpers [activeInfo]="activeInfo" (closeInfo)="activeInfo = null"></app-committees-ux-helpers>
    </div>
  `,
  styles: [`
    .comm-page { display: flex; flex-direction: column; gap: 20px; }
    .comm-subnav {
      display: flex; flex-wrap: wrap; gap: 8px; background: #ffffff;
      border: 1px solid #e2e8f0; border-radius: 12px; padding: 8px;
    }
    :host-context(.dark-mode) .comm-subnav { background: #1e293b; border-color: rgba(255,255,255,0.08); }
    .comm-subnav-link {
      display: inline-flex; align-items: center; gap: 7px; padding: 8px 14px;
      border-radius: 8px; font-size: 13px; font-weight: 600; color: #475569; text-decoration: none;
    }
    :host-context(.dark-mode) .comm-subnav-link { color: #cbd5e1; }
    .comm-subnav-link.active { background: #0050e5; color: #ffffff; }

    .panel-card {
      background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 22px;
      display: flex; flex-direction: column; gap: 16px;
    }
    :host-context(.dark-mode) .panel-card { background: #1e293b; border-color: rgba(255,255,255,0.08); }
    .panel-card h3 { margin: 0; font-size: 16px; font-weight: 700; }
    .panel-card p { margin: 4px 0 0; font-size: 13px; color: #64748b; }
    .panel-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
    .info-btn { background: transparent; border: none; color: #94a3b8; cursor: pointer; }

    .preset-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
    .preset-lbl { font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; }
    .preset-chip {
      padding: 6px 12px; border-radius: 999px; border: 1px solid #cbd5e1; background: #f8fafc;
      font-size: 12px; font-weight: 600; color: #1e293b; cursor: pointer;
    }
    .preset-chip:hover { border-color: #0050e5; color: #0050e5; background: rgba(0,80,229,0.06); }

    .grid-3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; }
    .grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 18px; }
    .field-grp { display: flex; flex-direction: column; gap: 6px; }
    .field-grp label { font-size: 12.5px; font-weight: 600; color: #475569; }
    :host-context(.dark-mode) .field-grp label { color: #cbd5e1; }
    .field-grp input, .field-grp select {
      padding: 9px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13.5px; background: inherit; color: inherit;
    }

    .live-preview-box {
      display: flex; align-items: center; gap: 10px; padding: 12px 16px;
      background: rgba(0,80,229,0.06); border-left: 3px solid #0050e5; border-radius: 8px; font-size: 13px;
    }
    .live-preview-box .material-symbols-outlined { color: #0050e5; }
    .live-preview-box span { margin-left: 6px; }

    .toggle-row {
      display: flex; align-items: flex-start; gap: 12px; padding: 10px 12px;
      border: 1px solid #f1f5f9; border-radius: 10px; cursor: pointer;
    }
    :host-context(.dark-mode) .toggle-row { border-color: rgba(255,255,255,0.06); }
    .toggle-row input { margin-top: 3px; width: 16px; height: 16px; accent-color: #0050e5; }
    .toggle-row strong { display: block; font-size: 13.5px; }
    .toggle-row span { display: block; font-size: 12px; color: #64748b; margin-top: 2px; }

    .metrics-list { display: flex; flex-direction: column; gap: 10px; }
    .metric-row { display: flex; gap: 10px; align-items: center; }
    .metric-row input { flex: 1; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; background: inherit; color: inherit; }

    .btn-secondary-sm {
      display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px;
      border-radius: 8px; border: 1px solid #cbd5e1; background: #f8fafc; font-size: 12.5px; font-weight: 600; cursor: pointer;
    }
    .btn-icon { width: 34px; height: 34px; border: 1px solid #e2e8f0; background: transparent; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
    .btn-icon.danger:hover { color: #dc2626; border-color: #dc2626; }
    .save-bar { display: flex; justify-content: flex-end; }
    .btn-primary-lg {
      display: inline-flex; align-items: center; gap: 8px; background: #0050e5; color: #ffffff;
      border: none; border-radius: 10px; padding: 12px 24px; font-size: 14px; font-weight: 700; cursor: pointer;
    }
    .btn-primary-lg:hover { background: #003db3; }
  `]
})
export class CommitteesSettingsComponent implements OnInit {
  loading = false;
  saving = false;
  forms: any[] = [];
  headerButtons: PageHeaderButton[] = [];
  activeInfo: CommitteeInfoSpec | null = null;

  model: any = {
    aliasSingular: 'Committee',
    aliasPlural: 'Committees',
    subGroupAliasSingular: 'Sub-Group',
    subGroupAliasPlural: 'Sub-Groups',
    leaderTitleAlias: 'Chairperson',
    secretaryTitleAlias: 'Secretary',
    allowExternalRegistration: true,
    requireApprovalForExternal: true,
    autoProvisionMemberOnApprove: true,
    defaultExtraInfoFormId: null,
    allowGoogleCloudLinking: true,
    allowAnyMemberReportSubmission: false,
    maxUploadSizeMb: 25,
    reportReminderCadence: 'Monthly',
    customReportMetrics: []
  };

  constructor(
    private committeesService: CommitteesService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.headerButtons = [
      {
        text: 'Save Settings',
        icon: 'save',
        isPrimary: true,
        action: () => this.saveSettings()
      }
    ];
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.committeesService.getSettings().subscribe({
      next: (res) => {
        this.loading = false;
        if (res?.isSuccess && res.data) {
          this.model = {
            ...this.model,
            ...res.data,
            customReportMetrics: res.data.customReportMetrics || []
          };
        }
      },
      error: () => { this.loading = false; }
    });

    this.committeesService.getForms().subscribe({
      next: (res) => { if (res?.isSuccess) this.forms = res.data || []; }
    });
  }

  applyPreset(s: string, p: string, sSub: string, pSub: string, leader: string, sec: string): void {
    this.model.aliasSingular = s;
    this.model.aliasPlural = p;
    this.model.subGroupAliasSingular = sSub;
    this.model.subGroupAliasPlural = pSub;
    this.model.leaderTitleAlias = leader;
    this.model.secretaryTitleAlias = sec;
  }

  addCustomMetric(): void {
    this.model.customReportMetrics.push({ key: `metric_${Date.now()}`, label: '', unit: '' });
  }

  syncMetricKey(m: any): void {
    if (m.label && (!m.key || m.key.startsWith('metric_'))) {
      m.key = m.label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    }
  }

  saveSettings(): void {
    this.saving = true;
    this.committeesService.updateSettings(this.model).subscribe({
      next: (res) => {
        this.saving = false;
        if (res?.isSuccess) {
          this.toast.success(`${this.model.aliasPlural} settings & aliases updated across the workspace.`);
        }
      },
      error: (err) => {
        this.saving = false;
        this.toast.error(err?.error?.message || 'Unable to save settings.');
      }
    });
  }

  openAliasInfo(): void {
    this.activeInfo = {
      title: 'Dynamic Alias Engine',
      purpose: 'Adapts all menus, headings, member screens, and public links to your organization’s exact vocabulary.',
      inputs: 'Singular & Plural names (e.g. Ministry / Ministries, Actor Group / Actors, Chapter / Chapters).',
      impact: 'Broadcasts in real time via SignalR so both Web and Mobile sidebars switch immediately without signing out.',
      bestPractices: 'Choose concise 1–2 word labels so mobile navigation tabs and sidebar badges stay crisp.'
    };
  }
}

