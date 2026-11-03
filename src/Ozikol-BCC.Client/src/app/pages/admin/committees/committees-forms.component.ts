import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { PageHeaderComponent, PageHeaderButton } from '../../../shared/components/page-header/page-header.component';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { ToastService } from '../../../core/services/toast.service';
import {
  CommitteesService,
  CommitteeAliases,
  CommitteeInfoSpec
} from '../../../core/services/committees.service';
import { CommitteesUxHelpersComponent } from '../../../shared/components/committees-ux-helpers/committees-ux-helpers.component';

/**
 * Module-Independent Supplemental Extra-Info Form Builder (A4) for bcp-committees.
 * Recognizes core identity (First Name, Last Name, Email, Phone) already exists in Ozikol BCC
 * and designs ONLY group-specific extra fields (Skills, Portfolio URL, Availability, File Upload, etc.).
 */
@Component({
  selector: 'app-committees-forms',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent, TranslatePipe, CommitteesUxHelpersComponent],
  template: `
    <div class="comm-page">
      <app-page-header
        [eyebrow]="'committees.eyebrow' | translate:'PEOPLE & COMMUNITY'"
        icon="dynamic_form"
        [title]="aliases.aliasSingular + ' ' + ('committees.extra_forms' | translate:'Extra-Info Forms')"
        [subtitle]="'Design self-contained supplemental questionnaires for ' + aliases.aliasPlural.toLowerCase() + ' without re-asking basic member profile fields.'"
        [buttons]="headerButtons"
        [loading]="loading"
      ></app-page-header>

      <div class="comm-subnav">
        <a routerLink="/committees/console/dashboard" class="comm-subnav-link">
          <span class="material-symbols-outlined">space_dashboard</span>
          <span>{{ aliases.aliasSingular }} {{ 'committees.dashboard' | translate:'Dashboard' }}</span>
        </a>
        <a routerLink="/committees/console/manage" class="comm-subnav-link">
          <span class="material-symbols-outlined">groups</span>
          <span>{{ 'committees.manage' | translate:'Manage' }} {{ aliases.aliasPlural }}</span>
        </a>
        <a routerLink="/committees/console/registrations" class="comm-subnav-link">
          <span class="material-symbols-outlined">how_to_reg</span>
          <span>{{ 'committees.registrations' | translate:'Registrations & Intake' }}</span>
        </a>
        <a routerLink="/committees/console/reports" class="comm-subnav-link">
          <span class="material-symbols-outlined">assignment</span>
          <span>{{ 'committees.reports_docs' | translate:'Meeting Reports & Docs' }}</span>
        </a>
        <a routerLink="/committees/console/forms" class="comm-subnav-link active">
          <span class="material-symbols-outlined">dynamic_form</span>
          <span>{{ 'committees.extra_forms' | translate:'Extra-Info Forms' }}</span>
        </a>
        <a routerLink="/committees/console/settings" class="comm-subnav-link">
          <span class="material-symbols-outlined">tune</span>
          <span>{{ aliases.aliasSingular }} {{ 'committees.settings' | translate:'Settings' }}</span>
        </a>
      </div>

      <!-- Smart Core Identity Advisory Banner -->
      <div class="advisory-banner">
        <span class="material-symbols-outlined">verified_user</span>
        <div>
          <strong>Zero Duplicate Profile Fields:</strong>
          <span>{{ 'committees.core_identity_note' | translate }}</span>
        </div>
        <button type="button" class="info-btn" (click)="openFormInfo()">
          <span class="material-symbols-outlined">info</span>
        </button>
      </div>

      <!-- List Mode -->
      <ng-container *ngIf="!editingForm">
        <div class="forms-grid" *ngIf="forms.length > 0">
          <div class="form-card" *ngFor="let f of forms">
            <div class="fc-head">
              <div>
                <span class="default-pill" *ngIf="f.isGlobalDefault">Global Default</span>
                <h3>{{ f.title }}</h3>
              </div>
              <span class="field-count">{{ f.fields?.length || 0 }} Fields</span>
            </div>
            <p>{{ f.description || 'Supplemental intake questionnaire.' }}</p>
            <div class="fc-meta">
              <span>Attached to {{ f.attachedCommitteesCount || 0 }} {{ aliases.aliasPlural.toLowerCase() }}</span>
              <span>Updated {{ f.updatedAt | date:'mediumDate' }}</span>
            </div>
            <div class="fc-actions">
              <button type="button" class="btn-primary-sm" (click)="startEdit(f)">
                <span class="material-symbols-outlined">edit</span>
                <span>Edit Fields</span>
              </button>
              <button type="button" class="btn-icon danger" (click)="deleteForm(f)">
                <span class="material-symbols-outlined">delete</span>
              </button>
            </div>
          </div>
        </div>

        <div class="empty-card" *ngIf="forms.length === 0 && !loading">
          <span class="material-symbols-outlined">dynamic_form</span>
          <h3>No Supplemental Extra-Info Forms Yet</h3>
          <p>Need extra details such as Skillset, Availability, Audition Link, Portfolio PDF, or Shirt Size when someone joins a {{ aliases.aliasSingular.toLowerCase() }}? Create a form here.</p>
          <button type="button" class="btn-primary-sm" (click)="startNewForm()">
            <span class="material-symbols-outlined">add</span>
            <span>Create Extra-Info Form</span>
          </button>
        </div>
      </ng-container>

      <!-- Visual Form Builder Mode -->
      <div class="builder-layout" *ngIf="editingForm">
        <div class="builder-main">
          <div class="builder-head">
            <h3>{{ editingForm.id ? 'Edit Extra-Info Form' : 'New Extra-Info Form' }}</h3>
            <button type="button" class="btn-secondary-sm" (click)="editingForm = null">Back to Forms</button>
          </div>

          <div class="grid-2">
            <div class="field-grp">
              <label>Form Title *</label>
              <input type="text" [(ngModel)]="editingForm.title" placeholder="e.g. Technical Skillset & Availability Questionnaire" />
            </div>
            <div class="field-grp">
              <label>Instructions (Optional)</label>
              <input type="text" [(ngModel)]="editingForm.description" placeholder="e.g. Tell us your preferred unit and weekly availability." />
            </div>
          </div>

          <label class="chk-inline">
            <input type="checkbox" [(ngModel)]="editingForm.isGlobalDefault" />
            <span>Set as Global Default Form across {{ aliases.aliasPlural.toLowerCase() }} that have no specific form assigned</span>
          </label>

          <div class="fields-header">
            <h4>Extra-Info Questions ({{ editingForm.fields.length }})</h4>
            <button type="button" class="btn-primary-sm" (click)="addField()">
              <span class="material-symbols-outlined">add</span>
              <span>Add Question Field</span>
            </button>
          </div>

          <div class="field-designer-card" *ngFor="let fld of editingForm.fields; let idx = index">
            <div class="fd-top">
              <span class="fd-num">#{{ idx + 1 }}</span>
              <input type="text" [(ngModel)]="fld.label" (blur)="syncFieldKey(fld)" placeholder="Question Label (e.g. Primary Skill or Portfolio URL)" class="fd-lbl-input" />
              <select [(ngModel)]="fld.type" class="fd-type-select">
                <option value="text">Short Text</option>
                <option value="textarea">Paragraph Text</option>
                <option value="select">Dropdown Select</option>
                <option value="multiselect">Multi-Select Checkboxes</option>
                <option value="number">Number</option>
                <option value="date">Date</option>
                <option value="url">Website / Portfolio URL</option>
                <option value="file">File / Document Upload</option>
                <option value="checkbox">Consent / Agreement Checkbox</option>
              </select>
              <label class="req-chk"><input type="checkbox" [(ngModel)]="fld.required" /> Required</label>
              <button type="button" class="btn-icon danger" (click)="editingForm.fields.splice(idx, 1)">
                <span class="material-symbols-outlined">delete</span>
              </button>
            </div>

            <div class="fd-sub">
              <input type="text" [(ngModel)]="fld.placeholder" placeholder="Format placeholder (e.g. https://portfolio.domain.com)" />
              <input
                *ngIf="fld.type === 'select' || fld.type === 'multiselect'"
                type="text"
                [ngModel]="(fld.options || []).join(', ')"
                (ngModelChange)="updateOptions(fld, $event)"
                placeholder="Comma-separated options (e.g. Camera, Sound, Lighting, Graphics)"
              />
            </div>
          </div>

          <div class="builder-footer">
            <button type="button" class="btn-secondary-sm" (click)="editingForm = null">{{ 'committees.cancel' | translate }}</button>
            <button type="button" class="btn-primary-sm" (click)="saveForm()" [disabled]="saving">
              <span class="material-symbols-outlined">save</span>
              <span>{{ saving ? 'Saving...' : 'Save Extra-Info Form' }}</span>
            </button>
          </div>
        </div>

        <!-- Live Preview Pane -->
        <div class="builder-preview">
          <div class="preview-kicker">LIVE MEMBER / EXTERNAL INTAKE PREVIEW</div>
          <h4>{{ editingForm.title || 'Untitled Extra-Info Form' }}</h4>
          <p class="prev-desc">{{ editingForm.description }}</p>

          <div class="locked-core-box">
            <span class="material-symbols-outlined">check_circle</span>
            <span>Core Identity (First Name, Last Name, Email, Phone) auto-filled for signed-in members</span>
          </div>

          <div class="prev-field" *ngFor="let fld of editingForm.fields">
            <label>{{ fld.label || 'Question' }} <span *ngIf="fld.required" class="req-star">*</span></label>
            <input *ngIf="fld.type === 'text' || fld.type === 'url' || fld.type === 'number' || fld.type === 'date'" [type]="fld.type === 'url' ? 'url' : fld.type" [placeholder]="fld.placeholder || ''" disabled />
            <textarea *ngIf="fld.type === 'textarea'" rows="2" [placeholder]="fld.placeholder || ''" disabled></textarea>
            <select *ngIf="fld.type === 'select'" disabled>
              <option *ngFor="let opt of (fld.options || [])">{{ opt }}</option>
            </select>
            <div *ngIf="fld.type === 'multiselect'" class="prev-checks">
              <span *ngFor="let opt of (fld.options || [])"><input type="checkbox" disabled /> {{ opt }}</span>
            </div>
            <div *ngIf="fld.type === 'file'" class="prev-file">
              <span class="material-symbols-outlined">upload_file</span> Choose PDF, Word, or Image
            </div>
            <div *ngIf="fld.type === 'checkbox'" class="prev-checks">
              <span><input type="checkbox" disabled /> {{ fld.placeholder || 'Yes, I agree' }}</span>
            </div>
          </div>
        </div>
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

    .advisory-banner {
      display: flex; align-items: center; gap: 12px; padding: 14px 18px;
      background: rgba(0,80,229,0.06); border: 1px solid rgba(0,80,229,0.2); border-radius: 12px; font-size: 13px;
    }
    .advisory-banner .material-symbols-outlined { color: #0050e5; }
    .advisory-banner div { flex: 1; }
    .advisory-banner span { margin-left: 6px; color: #475569; }
    :host-context(.dark-mode) .advisory-banner span { color: #cbd5e1; }
    .info-btn { background: transparent; border: none; color: #0050e5; cursor: pointer; }

    .forms-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(310px, 1fr)); gap: 16px; }
    .form-card, .empty-card {
      background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px;
      display: flex; flex-direction: column; gap: 10px;
    }
    :host-context(.dark-mode) .form-card, :host-context(.dark-mode) .empty-card { background: #1e293b; border-color: rgba(255,255,255,0.08); }
    .empty-card { align-items: center; text-align: center; padding: 48px 20px; }
    .empty-card .material-symbols-outlined { font-size: 42px; color: #0050e5; }
    .fc-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
    .fc-head h3 { margin: 4px 0 0; font-size: 16px; font-weight: 700; }
    .default-pill { font-size: 10.5px; font-weight: 700; background: rgba(0,80,229,0.12); color: #0050e5; padding: 2px 8px; border-radius: 999px; }
    .field-count { font-size: 12px; font-weight: 700; color: #64748b; background: #f1f5f9; padding: 3px 9px; border-radius: 999px; }
    .form-card p { margin: 0; font-size: 13px; color: #64748b; }
    .fc-meta { display: flex; justify-content: space-between; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 10px; }
    .fc-actions { display: flex; gap: 8px; margin-top: auto; }

    .builder-layout { display: grid; grid-template-columns: 1.5fr 1fr; gap: 20px; align-items: start; }
    @media (max-width: 960px) { .builder-layout { grid-template-columns: 1fr; } }
    .builder-main, .builder-preview {
      background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px;
      display: flex; flex-direction: column; gap: 14px;
    }
    :host-context(.dark-mode) .builder-main, :host-context(.dark-mode) .builder-preview { background: #1e293b; border-color: rgba(255,255,255,0.08); }
    .builder-head, .fields-header, .builder-footer { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
    .builder-footer { justify-content: flex-end; border-top: 1px solid #e2e8f0; padding-top: 14px; }
    .grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
    .field-grp { display: flex; flex-direction: column; gap: 5px; }
    .field-grp label { font-size: 12.5px; font-weight: 600; color: #475569; }
    .field-grp input { padding: 9px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13.5px; background: inherit; color: inherit; }
    .chk-inline { display: flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer; }

    .field-designer-card {
      border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; background: #f8fafc;
      display: flex; flex-direction: column; gap: 8px;
    }
    :host-context(.dark-mode) .field-designer-card { background: #0f172a; border-color: rgba(255,255,255,0.1); }
    .fd-top { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .fd-num { font-size: 12px; font-weight: 800; color: #0050e5; }
    .fd-lbl-input { flex: 1; min-width: 180px; padding: 7px 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; background: #ffffff; }
    .fd-type-select { padding: 7px 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; background: #ffffff; }
    .req-chk { font-size: 12.5px; display: inline-flex; align-items: center; gap: 5px; }
    .fd-sub { display: flex; flex-wrap: wrap; gap: 8px; }
    .fd-sub input { flex: 1; min-width: 200px; padding: 7px 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 12.5px; background: #ffffff; }

    .preview-kicker { font-size: 11px; font-weight: 800; color: #0050e5; letter-spacing: 0.7px; }
    .builder-preview h4 { margin: 0; font-size: 16px; }
    .prev-desc { margin: 0; font-size: 12.5px; color: #64748b; }
    .locked-core-box {
      display: flex; align-items: center; gap: 8px; padding: 10px 12px;
      background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; font-size: 12px; color: #166534;
    }
    .prev-field { display: flex; flex-direction: column; gap: 5px; }
    .prev-field label { font-size: 12.5px; font-weight: 600; }
    .req-star { color: #dc2626; }
    .prev-field input, .prev-field textarea, .prev-field select { padding: 8px 10px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc; font-size: 13px; }
    .prev-checks { display: flex; flex-wrap: wrap; gap: 10px; font-size: 12.5px; }
    .prev-file { display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px; border: 1px dashed #94a3b8; border-radius: 8px; font-size: 12.5px; color: #475569; }

    .btn-primary-sm {
      display: inline-flex; align-items: center; gap: 6px; background: #0050e5; color: #ffffff;
      border: none; border-radius: 8px; padding: 8px 14px; font-size: 12.5px; font-weight: 600; cursor: pointer;
    }
    .btn-secondary-sm {
      display: inline-flex; align-items: center; gap: 6px; background: #f1f5f9; color: #334155;
      border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 12px; font-size: 12.5px; font-weight: 600; cursor: pointer;
    }
    .btn-icon { width: 32px; height: 32px; border: 1px solid #e2e8f0; border-radius: 8px; background: transparent; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
    .btn-icon.danger:hover { color: #dc2626; border-color: #dc2626; }
  `]
})
export class CommitteesFormsComponent implements OnInit, OnDestroy {
  aliases: CommitteeAliases;
  loading = false;
  saving = false;
  forms: any[] = [];
  editingForm: any = null;
  headerButtons: PageHeaderButton[] = [];
  activeInfo: CommitteeInfoSpec | null = null;
  private sub?: Subscription;

  constructor(
    private committeesService: CommitteesService,
    private toast: ToastService
  ) {
    this.aliases = this.committeesService.currentAliases;
  }

  ngOnInit(): void {
    this.sub = this.committeesService.aliases$.subscribe((a) => { this.aliases = a; });
    this.headerButtons = [
      {
        text: 'Create Extra-Info Form',
        icon: 'add',
        isPrimary: true,
        action: () => this.startNewForm()
      }
    ];
    this.loadForms();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  loadForms(): void {
    this.loading = true;
    this.committeesService.getForms().subscribe({
      next: (res) => {
        this.loading = false;
        if (res?.isSuccess) this.forms = res.data || [];
      },
      error: () => { this.loading = false; }
    });
  }

  startNewForm(): void {
    this.editingForm = {
      id: null,
      title: '',
      description: '',
      isGlobalDefault: this.forms.length === 0,
      isActive: true,
      fields: [
        {
          id: 'fld_1',
          key: 'primary_skill',
          label: 'Relevant Experience or Skillset',
          type: 'text',
          placeholder: 'e.g. Event Coordination, Audio Engineering, Accounting',
          required: true,
          options: []
        }
      ]
    };
  }

  startEdit(f: any): void {
    this.editingForm = JSON.parse(JSON.stringify(f));
    if (!Array.isArray(this.editingForm.fields)) this.editingForm.fields = [];
  }

  addField(): void {
    this.editingForm.fields.push({
      id: `fld_${Date.now()}`,
      key: `field_${this.editingForm.fields.length + 1}`,
      label: '',
      type: 'text',
      placeholder: '',
      required: false,
      options: []
    });
  }

  syncFieldKey(fld: any): void {
    if (fld.label) {
      fld.key = fld.label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    }
  }

  updateOptions(fld: any, raw: string): void {
    fld.options = (raw || '').split(',').map((s) => s.trim()).filter((s) => s.length > 0);
  }

  saveForm(): void {
    if (!this.editingForm?.title?.trim()) {
      this.toast.error('Enter a form title.');
      return;
    }
    this.saving = true;
    const req$ = this.editingForm.id
      ? this.committeesService.updateForm(this.editingForm.id, this.editingForm)
      : this.committeesService.createForm(this.editingForm);

    req$.subscribe({
      next: (res) => {
        this.saving = false;
        if (res?.isSuccess) {
          this.toast.success('Extra-Info Form saved.');
          this.editingForm = null;
          this.loadForms();
        }
      },
      error: () => {
        this.saving = false;
        this.toast.error('Could not save form.');
      }
    });
  }

  deleteForm(f: any): void {
    if (!confirm(`Delete "${f.title}"?`)) return;
    this.committeesService.deleteForm(f.id).subscribe({
      next: () => {
        this.toast.success('Form deleted.');
        this.loadForms();
      }
    });
  }

  openFormInfo(): void {
    this.activeInfo = {
      title: 'Module-Independent Extra-Info Forms',
      purpose: `Captures group-specific questions when a member or external visitor registers for a ${this.aliases.aliasSingular.toLowerCase()}.`,
      inputs: 'Text, Dropdowns, Multi-Selects, Dates, URLs, Consent Checkboxes, and File Uploads.',
      impact: 'Signed-in members skip First Name, Last Name, Email, and Phone completely and only see these extra fields.',
      bestPractices: 'Keep forms to 3–5 focused questions to maximize registration completion.'
    };
  }
}

