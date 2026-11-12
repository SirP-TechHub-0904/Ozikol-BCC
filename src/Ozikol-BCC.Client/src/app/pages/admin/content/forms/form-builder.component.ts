import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PageFormsService, PageFormItem, PageFormFieldItem } from '../../../../core/services/page-forms.service';
import { ApiService } from '../../../../core/services/api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { PageHeaderComponent, PageHeaderButton } from '../../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-form-builder',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, PageHeaderComponent],
  template: `
    <div class="cms-page-container">
      <!-- Standardized Reusable Page Header -->
      <app-page-header
        eyebrow="CMS Studio / Manage Forms"
        icon="build"
        [title]="headerTitle"
        subtitle="Configure questions, multi-select pills, dropdowns, and submission rules for website intake."
        [buttons]="headerButtons"
        [loading]="saving"
      ></app-page-header>

      <!-- Real-Time Auto-Save & Draft Protection Bar -->
      <div class="autosave-bar">
        <div class="autosave-left">
          <div class="save-indicator" [ngClass]="autoSaveStatus">
            <span *ngIf="autoSaveStatus === 'saving'" class="material-symbols-outlined spin">sync</span>
            <span *ngIf="autoSaveStatus === 'saved'" class="material-symbols-outlined text-success">check_circle</span>
            <span *ngIf="autoSaveStatus === 'unsaved'" class="dot-unsaved"></span>
            <span *ngIf="autoSaveStatus === 'error'" class="material-symbols-outlined text-danger">error</span>

            <span class="status-msg">
              <ng-container *ngIf="autoSaveStatus === 'saving'">Saving...</ng-container>
              <ng-container *ngIf="autoSaveStatus === 'saved'">Saved {{ lastSavedTime ? '(' + (lastSavedTime | date:'mediumTime') + ')' : '' }}</ng-container>
              <ng-container *ngIf="autoSaveStatus === 'unsaved'">Unsaved changes</ng-container>
              <ng-container *ngIf="autoSaveStatus === 'error'">Save failed. <button type="button" class="btn-retry-inline" (click)="performAutoSave()">Retry</button></ng-container>
            </span>
          </div>
        </div>
        <div class="autosave-right" *ngIf="hasDraftRestored">
          <span class="draft-badge">
            <span class="material-symbols-outlined">history</span>
            Restored
          </span>
          <button type="button" class="btn-discard-draft" (click)="discardDraft()" title="Discard restored draft">Discard</button>
        </div>
      </div>

      <!-- Main Layout: Left Settings & Fields / Right Live Preview -->
      <div class="builder-grid">
        <!-- Form Settings & Fields Column -->
        <div class="builder-main">
          <!-- Form General Settings Card -->
          <div class="cms-card">
            <div class="card-section-header">
              <span class="material-symbols-outlined header-icon">settings</span>
              <div>
                <h3>General Configuration</h3>
                <p>Form identification, URLs, and notification destinations.</p>
              </div>
            </div>

            <div class="form-grid">
              <div class="form-group col-span-2">
                <label>Form Title <span class="required">*</span></label>
                <input
                  type="text"
                  [(ngModel)]="form.title"
                  (input)="onTitleChange()"
                  (ngModelChange)="onDataChanged()"
                  placeholder="e.g. Service Request & Project Intake"
                  class="form-control"
                  required>
                <div class="auto-key-meta">
                  <span class="auto-key-label">Form Key:</span>
                  <code class="auto-key-pill">{{ form.formKey || 'auto-generated' }}</code>
                  <span *ngIf="isDuplicateFormKey()" class="auto-key-dup">Already in use — auto-adjusted on save</span>
                  <span *ngIf="!isDuplicateFormKey()" class="auto-key-hint">Auto-generated from title (used to link sections)</span>
                </div>
              </div>

              <div class="form-group col-span-2">
                <label>Notification Email</label>
                <input
                  type="email"
                  [(ngModel)]="form.notificationEmail"
                  (ngModelChange)="onDataChanged()"
                  placeholder="name@company.com"
                  class="form-control">
                <small class="hint">Optional. Forward newly submitted inquiries to this address.</small>
              </div>

              <div class="form-group col-span-2">
                <label>Description / Subtitle</label>
                <textarea
                  [(ngModel)]="form.description"
                  (ngModelChange)="onDataChanged()"
                  rows="2"
                  placeholder="Brief introductory guidance for visitors filling this form..."
                  class="form-control"></textarea>
              </div>

              <div class="form-group">
                <label>Submit Button Text</label>
                <input
                  type="text"
                  [(ngModel)]="form.submitButtonText"
                  (ngModelChange)="onDataChanged()"
                  placeholder="Submit Inquiry"
                  class="form-control">
              </div>

              <div class="form-group">
                <label>Success Message Confirmation</label>
                <input
                  type="text"
                  [(ngModel)]="form.successMessage"
                  (ngModelChange)="onDataChanged()"
                  placeholder="Thank you! We have received your request and will follow up shortly."
                  class="form-control">
              </div>

              <div class="form-group col-span-2">
                <label class="toggle-label">
                  <input type="checkbox" [(ngModel)]="form.isActive" (ngModelChange)="onDataChanged()">
                  <span class="toggle-text">Active on Public Website</span>
                </label>
                <small class="hint">When disabled, public visitors will not be able to submit this form.</small>
              </div>
            </div>
          </div>

          <!-- Questions & Interactive Fields Card -->
          <div class="cms-card">
            <div class="card-section-header with-action">
              <div class="header-text-group">
                <span class="material-symbols-outlined header-icon">tune</span>
                <div>
                  <h3>Form Questions & Fields ({{ fields.length }})</h3>
                  <p>Add inputs, multi-select service pills, dropdown options, and contact fields.</p>
                </div>
              </div>
              <button type="button" class="btn btn-sm btn-secondary" (click)="addField()">
                <span class="material-symbols-outlined">add</span>
                <span>Add Question</span>
              </button>
            </div>

            <!-- Empty Fields Notice -->
            <div *ngIf="fields.length === 0" class="empty-fields-state">
              <span class="material-symbols-outlined">quiz</span>
              <p>No questions added yet. Click "Add Question" above to start building your form.</p>
            </div>

            <!-- Fields List -->
            <div class="fields-container" *ngIf="fields.length > 0">
              <div
                *ngFor="let field of fields; let idx = index"
                class="field-card"
                [class.field-active]="activeFieldIndex === idx">
                <div class="field-card-header" (click)="toggleFieldExpansion(idx)">
                  <div class="field-header-left">
                    <span class="field-number">#{{ idx + 1 }}</span>
                    <span class="field-type-tag">{{ getFieldTypeLabel(field.fieldType) }}</span>
                    <strong class="field-title-preview">{{ field.label || '(Untitled Question)' }}</strong>
                    <span *ngIf="field.isRequired" class="req-star" title="Required">*</span>
                  </div>
                  <div class="field-header-right" (click)="$event.stopPropagation()">
                    <button
                      type="button"
                      class="btn-insert-below"
                      (click)="addField(idx)"
                      title="Insert Question Below">
                      <span class="material-symbols-outlined">add</span>
                    </button>
                    <button
                      type="button"
                      class="btn-sort"
                      [disabled]="idx === 0"
                      (click)="moveField(idx, -1)"
                      title="Move Up">
                      <span class="material-symbols-outlined">arrow_upward</span>
                    </button>
                    <button
                      type="button"
                      class="btn-sort"
                      [disabled]="idx === fields.length - 1"
                      (click)="moveField(idx, 1)"
                      title="Move Down">
                      <span class="material-symbols-outlined">arrow_downward</span>
                    </button>
                    <button
                      type="button"
                      class="btn-remove-field"
                      (click)="removeField(idx)"
                      title="Delete Question">
                      <span class="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </div>

                <!-- Field Card Body (Expanded) -->
                <div class="field-card-body" *ngIf="activeFieldIndex === idx">
                  <div class="field-edit-grid">
                    <div class="form-group col-span-2">
                      <label>Question Label <span class="required">*</span></label>
                      <input
                        type="text"
                        [(ngModel)]="field.label"
                        (input)="onFieldLabelChange(field, idx)"
                        (ngModelChange)="onDataChanged()"
                        placeholder="e.g. Which service are you interested in?"
                        class="form-control">
                      <div class="auto-key-meta">
                        <span class="auto-key-label">Programmatic Key:</span>
                        <code class="auto-key-pill">{{ field.fieldKey || ('question_' + (idx + 1)) }}</code>
                        <span *ngIf="isDuplicateFieldKey(field, idx)" class="auto-key-dup">Duplicate key auto-adjusted</span>
                      </div>
                    </div>

                    <div class="form-group">
                      <label>Input Type <span class="required">*</span></label>
                      <select [(ngModel)]="field.fieldType" (ngModelChange)="onDataChanged()" class="form-control">
                        <option value="pill_select">Pill Select (Multi-choice tags)</option>
                        <option value="dropdown">Dropdown Select</option>
                        <option value="text">Single-line Text</option>
                        <option value="email">Email Address</option>
                        <option value="phone">Phone Number</option>
                        <option value="date">Date Picker</option>
                        <option value="time">Time Picker</option>
                        <option value="datetime">Date &amp; Time Picker</option>
                        <option value="textarea">Multi-line Textarea / Brief</option>
                        <option value="number">Numeric</option>
                        <option value="checkbox">Agreement Checkbox</option>
                      </select>
                    </div>

                    <div class="form-group">
                      <label>Grid Layout Width</label>
                      <select [(ngModel)]="field.gridWidth" (ngModelChange)="onDataChanged()" class="form-control">
                        <option value="col-md-12">Full Width (100%)</option>
                        <option value="col-md-6">Half Width (50%)</option>
                        <option value="col-md-4">One Third (33.3%)</option>
                      </select>
                    </div>

                    <!-- Options list for pill_select and dropdown -->
                    <div class="form-group col-span-2" *ngIf="field.fieldType === 'pill_select' || field.fieldType === 'dropdown'">
                      <label>
                        {{ field.fieldType === 'pill_select' ? 'Selectable Pill Options' : 'Dropdown Options' }}
                        <span class="hint-inline">(Comma-separated values)</span>
                      </label>
                      <textarea
                        [(ngModel)]="field.optionsJson"
                        (ngModelChange)="onDataChanged()"
                        rows="2"
                        placeholder="e.g. Security Audit, Patrol Guarding, Event Security, Access Control"
                        class="form-control"></textarea>
                      <small class="hint">Enter each option separated by commas. Visitors will choose from these items.</small>
                    </div>

                    <!-- Linked Legal Pages for Agreement Checkbox -->
                    <div class="form-group col-span-2" *ngIf="field.fieldType === 'checkbox'">
                      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px;">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                          <span style="font-size: 11.5px; font-weight: 700; color: #334155;">
                            Linked Legal Pages ({{ getCheckboxLinks(field).length }})
                          </span>
                          <button type="button"
                                  (click)="addCheckboxLink(field)"
                                  style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; font-size: 11.5px; font-weight: 600; color: #0050E5; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; cursor: pointer;">
                            <span class="material-symbols-outlined" style="font-size: 14px;">add_link</span>
                            <span>Add Link</span>
                          </button>
                        </div>

                        <div *ngIf="getCheckboxLinks(field).length === 0" style="font-size: 11.5px; color: #64748b;">
                          Optional: Click <strong>Add Link</strong> to attach Terms &amp; Conditions, Privacy Policy, or any CMS Legal Page to this checkbox.
                        </div>

                        <div *ngFor="let lnk of getCheckboxLinks(field); let ki = index"
                             style="display: grid; grid-template-columns: minmax(130px, 1fr) minmax(170px, 1.3fr) auto; gap: 8px; align-items: end; margin-bottom: 8px;">
                          <div>
                            <label style="display: block; font-size: 10.5px; font-weight: 600; color: #64748b; margin-bottom: 3px;">Link Text #{{ ki + 1 }}</label>
                            <input type="text"
                                   [ngModel]="lnk.linkText"
                                   (ngModelChange)="updateCheckboxLinkText(field, ki, $event)"
                                   placeholder="e.g. Terms & Conditions"
                                   class="form-control" />
                          </div>
                          <div>
                            <label style="display: block; font-size: 10.5px; font-weight: 600; color: #64748b; margin-bottom: 3px;">CMS Legal Page</label>
                            <select [ngModel]="lnk.pageId || (lnk.pageSlug === '__custom__' || lnk.customUrl ? '__custom__' : '')"
                                    (ngModelChange)="onCheckboxLinkPageSelected(field, ki, $event)"
                                    class="form-control">
                              <option value="">-- Select CMS Legal Page --</option>
                              <option *ngFor="let p of cmsPages" [value]="p.id">
                                {{ p.title }} (/p/{{ p.directUrl }}){{ p.publish ? '' : ' [Draft]' }}
                              </option>
                              <option value="__custom__">Custom URL / External Link...</option>
                            </select>
                          </div>
                          <button type="button"
                                  (click)="removeCheckboxLink(field, ki)"
                                  title="Remove Link"
                                  style="width: 32px; height: 36px; border-radius: 6px; border: 1px solid #fecaca; background: #fef2f2; color: #dc2626; display: inline-flex; align-items: center; justify-content: center; cursor: pointer;">
                            <span class="material-symbols-outlined" style="font-size: 16px;">close</span>
                          </button>

                          <div *ngIf="!lnk.pageId && (lnk.pageSlug === '__custom__' || (lnk.customUrl && lnk.customUrl.length > 0))"
                               style="grid-column: 1 / -1;">
                            <input type="text"
                                   [ngModel]="lnk.customUrl"
                                   (ngModelChange)="updateCheckboxLinkCustomUrl(field, ki, $event)"
                                   placeholder="e.g. /p/terms-conditions or https://..."
                                   class="form-control" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div class="form-group col-span-2">
                      <label>Placeholder Text</label>
                      <input
                        type="text"
                        [(ngModel)]="field.placeholder"
                        (ngModelChange)="onDataChanged()"
                        placeholder="e.g. Select timeline or Enter details"
                        class="form-control">
                    </div>

                    <div class="form-group col-span-2">
                      <label class="toggle-label">
                        <input type="checkbox" [(ngModel)]="field.isRequired" (ngModelChange)="onDataChanged()">
                        <span class="toggle-text">Mandatory / Required question</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Bottom Add Action (prevents scrolling back to top on long forms) -->
              <div class="fields-bottom-actions">
                <button type="button" class="btn-add-bottom" (click)="addField(fields.length - 1)">
                  <span class="material-symbols-outlined">add</span>
                  <span>Add Question</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Column: Live Form Interactive Preview -->
        <div class="builder-preview-col">
          <div class="cms-card preview-card">
            <div class="preview-header">
              <span class="material-symbols-outlined">visibility</span>
              <h4>Live Form Preview</h4>
            </div>
            <div class="preview-body">
              <h2 class="preview-title">{{ form.title || 'Your Form Title' }}</h2>
              <p class="preview-desc" *ngIf="form.description">{{ form.description }}</p>

              <div class="preview-form-fields">
                <div
                  *ngFor="let field of fields"
                  class="preview-field"
                  [ngClass]="field.gridWidth || 'col-md-12'">
                  
                  <label class="preview-label">
                    {{ field.label || 'Question Label' }}
                    <span *ngIf="field.isRequired" class="req-star">*</span>
                  </label>

                  <!-- Pill select preview -->
                  <div *ngIf="field.fieldType === 'pill_select'" class="preview-pills">
                    <span
                      *ngFor="let opt of parseOptions(field.optionsJson)"
                      class="preview-pill-item">
                      {{ opt }}
                    </span>
                    <span *ngIf="parseOptions(field.optionsJson).length === 0" class="preview-pill-placeholder">
                      Add comma-separated options...
                    </span>
                  </div>

                  <!-- Dropdown preview -->
                  <select *ngIf="field.fieldType === 'dropdown'" class="form-control" disabled>
                    <option value="">{{ field.placeholder || 'Choose an option...' }}</option>
                    <option *ngFor="let opt of parseOptions(field.optionsJson)">{{ opt }}</option>
                  </select>

                  <!-- Textarea preview -->
                  <textarea
                    *ngIf="field.fieldType === 'textarea'"
                    rows="3"
                    class="form-control"
                    [placeholder]="field.placeholder || 'Type here...'"
                    disabled></textarea>

                  <!-- Single inputs preview -->
                  <input
                    *ngIf="['text', 'email', 'phone', 'number'].includes(field.fieldType)"
                    [type]="field.fieldType === 'number' ? 'number' : (field.fieldType === 'email' ? 'email' : 'text')"
                    class="form-control"
                    [placeholder]="field.placeholder || ('Enter ' + (field.label || 'value'))"
                    disabled>

                  <!-- Date & Time inputs preview -->
                  <input
                    *ngIf="['date', 'time', 'datetime'].includes(field.fieldType)"
                    [type]="field.fieldType === 'datetime' ? 'datetime-local' : field.fieldType"
                    class="form-control"
                    [placeholder]="field.placeholder || ''"
                    disabled>

                  <!-- Checkbox preview -->
                  <label *ngIf="field.fieldType === 'checkbox'" class="preview-checkbox">
                    <input type="checkbox" disabled>
                    <span>
                      {{ field.placeholder || field.label }}
                      <ng-container *ngFor="let lnk of getCheckboxLinks(field); let ki = index; let last = last">
                        <span>{{ ki === 0 ? ' ' : (last ? ' and ' : ', ') }}</span>
                        <a *ngIf="lnk.linkText"
                           [href]="getLegalLinkHref(lnk)"
                           target="_blank"
                           rel="noopener noreferrer"
                           (click)="$event.stopPropagation()"
                           style="color: #0050E5; font-weight: 600; text-decoration: underline;">
                          {{ lnk.linkText }}
                        </a>
                      </ng-container>
                    </span>
                  </label>
                </div>
              </div>

              <div class="preview-submit-wrap">
                <button type="button" class="btn btn-primary preview-btn" disabled>
                  <span>{{ form.submitButtonText || 'Submit' }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .cms-page-container { display: flex; flex-direction: column; gap: 24px; }
    
    .page-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      background: #fff; padding: 24px 28px; border-radius: 16px; border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }
    .breadcrumb { font-size: 13px; color: #64748b; margin-bottom: 6px; }
    .breadcrumb a { color: #0050e5; text-decoration: none; font-weight: 600; }
    .breadcrumb .sep { margin: 0 6px; }
    .page-header h1 { font-size: 24px; font-weight: 800; color: #0f172a; margin: 0 0 4px; }
    .subtitle { color: #64748b; font-size: 14px; margin: 0; }
    .header-actions { display: flex; gap: 12px; }

    .btn {
      display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px;
      border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; text-decoration: none;
      transition: all 0.2s ease;
    }
    .btn-primary { background: #0050e5; color: #fff; border: none; }
    .btn-primary:hover:not(:disabled) { background: #003ebd; }
    .btn-secondary { background: #eff6ff; color: #0050e5; border: 1px solid #bfdbfe; }
    .btn-secondary:hover { background: #dbeafe; }
    .btn-outline { background: transparent; border: 1px solid #cbd5e1; color: #334155; }
    .btn-outline:hover { background: #f8fafc; }
    .btn-sm { padding: 6px 14px; font-size: 12px; }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; }

    .builder-grid {
      display: grid; grid-template-columns: 1fr 400px; gap: 24px; align-items: start;
    }
    @media (max-width: 1024px) {
      .builder-grid { grid-template-columns: 1fr; }
    }

    .builder-main { display: flex; flex-direction: column; gap: 24px; }
    .cms-card {
      background: #fff; border: 1px solid #e2e8f0; border-radius: 16px;
      padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    }

    .card-section-header {
      display: flex; align-items: flex-start; gap: 12px; margin-bottom: 20px;
    }
    .card-section-header.with-action {
      justify-content: space-between; align-items: center;
    }
    .header-text-group { display: flex; align-items: center; gap: 12px; }
    .header-icon {
      font-size: 24px; color: #0050e5; background: #eff6ff;
      padding: 8px; border-radius: 10px;
    }
    .card-section-header h3 { font-size: 16px; font-weight: 700; color: #0f172a; margin: 0; }
    .card-section-header p { font-size: 13px; color: #64748b; margin: 2px 0 0; }

    .form-grid {
      display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;
    }
    .col-span-2 { grid-column: span 2; }

    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group label { font-size: 13px; font-weight: 600; color: #334155; }
    .required { color: #dc2626; font-weight: 700; }
    .font-mono { font-family: monospace; }
    .hint { font-size: 11px; color: #64748b; }
    .hint-inline { font-size: 11px; color: #64748b; font-weight: normal; margin-left: 6px; }

    .form-control {
      width: 100%; padding: 10px 14px; border-radius: 8px;
      border: 1px solid #cbd5e1; font-size: 13px; color: #0f172a; outline: none;
      transition: border-color 0.15s ease; box-sizing: border-box;
    }
    .form-control:focus { border-color: #0050e5; box-shadow: 0 0 0 3px rgba(0,80,229,0.1); }
    .form-control:disabled { background: #f8fafc; color: #64748b; cursor: not-allowed; }

    .toggle-label { display: inline-flex; align-items: center; gap: 10px; cursor: pointer; }
    .toggle-label input[type="checkbox"] { width: 16px; height: 16px; accent-color: #0050e5; }
    .toggle-text { font-size: 13px; font-weight: 600; color: #0f172a; }

    /* Questions & Fields List */
    .fields-container { display: flex; flex-direction: column; gap: 12px; }
    .field-card {
      border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;
      background: #fafbfc; transition: border-color 0.15s;
    }
    .field-card.field-active { border-color: #0050e5; background: #fff; }
    
    .field-card-header {
      padding: 14px 18px; display: flex; justify-content: space-between;
      align-items: center; cursor: pointer; user-select: none;
    }
    .field-card-header:hover { background: #f1f5f9; }
    .field-header-left { display: flex; align-items: center; gap: 10px; }
    .field-number { font-size: 12px; font-weight: 700; color: #64748b; }
    .field-type-tag {
      font-size: 10px; font-weight: 700; text-transform: uppercase;
      background: #e2e8f0; color: #334155; padding: 2px 8px; border-radius: 6px;
    }
    .field-title-preview { font-size: 13px; color: #0f172a; }
    .req-star { color: #dc2626; font-weight: 700; }

    .field-header-right { display: flex; align-items: center; gap: 4px; }
    .btn-insert-below, .btn-sort, .btn-remove-field {
      border: none; background: transparent; padding: 4px; border-radius: 6px;
      cursor: pointer; color: #64748b; display: flex; align-items: center;
    }
    .btn-insert-below:hover { background: #eff6ff; color: #0050e5; }
    .btn-sort:hover:not(:disabled) { background: #e2e8f0; color: #0f172a; }
    .btn-sort:disabled { opacity: 0.3; cursor: not-allowed; }
    .btn-remove-field:hover { background: #fee2e2; color: #dc2626; }
    .btn-insert-below span, .btn-sort span, .btn-remove-field span { font-size: 18px; }
    .fields-bottom-actions { margin-top: 4px; }
    .btn-add-bottom {
      width: 100%; display: inline-flex; align-items: center; justify-content: center; gap: 6px;
      padding: 10px 16px; border-radius: 10px; border: 1px dashed #93c5fd;
      background: #eff6ff; color: #0050e5; font-size: 13px; font-weight: 600;
      cursor: pointer; transition: all 0.15s ease;
    }
    .btn-add-bottom:hover { background: #dbeafe; border-color: #0050e5; }

    .field-card-body {
      padding: 18px; border-top: 1px solid #f1f5f9; background: #fff;
    }
    .field-edit-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
    .auto-key-meta {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 6px;
      font-size: 11px;
    }
    .auto-key-label { color: #64748b; font-weight: 600; }
    .auto-key-pill {
      background: #f1f5f9;
      color: #0f172a;
      border: 1px solid #e2e8f0;
      border-radius: 5px;
      padding: 2px 7px;
      font-size: 11px;
      font-family: monospace;
      font-weight: 600;
    }
    .auto-key-hint { color: #94a3b8; }
    .auto-key-dup { color: #d97706; font-weight: 600; }

    .empty-fields-state {
      padding: 32px; text-align: center; color: #64748b;
      display: flex; flex-direction: column; align-items: center; gap: 10px;
    }
    .empty-fields-state span { font-size: 36px; color: #cbd5e1; }

    /* Live Preview Column */
    .builder-preview-col { position: sticky; top: 24px; }
    .preview-card { border: 1px solid #cbd5e1; background: #ffffff; }
    .preview-header {
      display: flex; align-items: center; gap: 8px; padding-bottom: 14px;
      border-bottom: 1px solid #f1f5f9; color: #0050e5;
    }
    .preview-header h4 { font-size: 14px; font-weight: 700; margin: 0; color: #0f172a; }
    .preview-body { padding: 18px 0 0; }
    .preview-title { font-size: 18px; font-weight: 800; color: #0f172a; margin: 0 0 6px; }
    .preview-desc { font-size: 12px; color: #64748b; margin: 0 0 16px; }

    .preview-form-fields { display: flex; flex-direction: column; gap: 14px; }
    .preview-field { display: flex; flex-direction: column; gap: 6px; }
    .preview-label { font-size: 12px; font-weight: 600; color: #334155; }
    .preview-pills { display: flex; flex-wrap: wrap; gap: 6px; }
    .preview-pill-item {
      font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 20px;
      background: #eff6ff; color: #0050e5; border: 1px solid #bfdbfe;
    }
    .preview-pill-placeholder { font-size: 11px; color: #94a3b8; font-style: italic; }
    .preview-checkbox { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #334155; }
    .preview-submit-wrap { margin-top: 18px; }
    .preview-btn { width: 100%; justify-content: center; }

    /* Auto-Save & Draft Protection Bar */
    .autosave-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 8px 16px;
      font-size: 12px;
      color: #475569;
    }
    .save-indicator {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-weight: 500;
    }
    .save-indicator .material-symbols-outlined {
      font-size: 16px;
    }
    .save-indicator.saving { color: #0050e5; }
    .save-indicator.saved { color: #16a34a; }
    .save-indicator.unsaved { color: #d97706; }
    .save-indicator.error { color: #dc2626; }
    .dot-unsaved {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #d97706;
      display: inline-block;
      animation: pulse 1.5s infinite;
    }
    .btn-retry-inline {
      background: none;
      border: none;
      color: #0050e5;
      text-decoration: underline;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
      padding: 0;
      margin-left: 4px;
    }
    .draft-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: #eff6ff;
      color: #0050e5;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      border: 1px solid #bfdbfe;
    }
    .draft-badge .material-symbols-outlined { font-size: 14px; }
    .btn-discard-draft {
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 11px;
      cursor: pointer;
      margin-left: 8px;
      text-decoration: underline;
    }
    .btn-discard-draft:hover { color: #dc2626; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { 100% { transform: rotate(360deg); } }
  `]
})
export class FormBuilderComponent implements OnInit {
  isEditMode = false;
  formId: string | null = null;
  saving = false;
  activeFieldIndex = 0;

  // Real-time auto-save & draft states
  autoSaveStatus: 'saved' | 'saving' | 'unsaved' | 'error' = 'saved';
  lastSavedTime: Date | null = null;
  hasDraftRestored = false;
  existingFormKeys: string[] = [];
  private autoSaveDebounceTimer: any = null;
  private autoSaveInFlight = false;
  private pendingAutoSave = false;
  private pendingExplicitSave = false;

  get headerTitle(): string {
    return this.isEditMode ? `Edit: ${this.form.title || ''}` : 'Create Dynamic Website Form';
  }

  get headerButtons(): PageHeaderButton[] {
    return [
      {
        text: 'Cancel',
        icon: 'arrow_back',
        routerLink: '/content/console/forms'
      },
      {
        text: this.saving ? 'Saving Form...' : 'Save Form & Questions',
        icon: 'save',
        isPrimary: true,
        disabled: this.saving,
        loading: this.saving,
        action: () => this.saveForm()
      }
    ];
  }

  form: Partial<PageFormItem> = {
    title: '',
    formKey: '',
    description: '',
    submitButtonText: 'Submit Request',
    successMessage: 'Thank you! Your submission has been received. Our team will follow up promptly.',
    notificationEmail: '',
    isActive: true
  };

  fields: PageFormFieldItem[] = [];

  get draftStorageKey(): string {
    return `bcp_form_draft_${this.formId || 'new'}`;
  }

  cmsPages: Array<{ id: string; title: string; directUrl: string; publish: boolean }> = [];

  constructor(
    private formsService: PageFormsService,
    private api: ApiService,
    private route: ActivatedRoute,
    private router: Router,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.loadCmsPages();
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      this.loadExistingFormKeys(id);
      if (id) {
        this.isEditMode = true;
        this.formId = id;
        this.loadForm(id);
      } else {
        // Seed default starter questions for new form (using clean professional placeholders)
        this.fields = [
          {
            fieldKey: 'full_name',
            label: 'Your Full Name',
            placeholder: 'e.g. First Last',
            fieldType: 'text',
            isRequired: true,
            sortOrder: 1,
            gridWidth: 'col-md-6'
          },
          {
            fieldKey: 'email',
            label: 'Work Email Address',
            placeholder: 'name@company.com',
            fieldType: 'email',
            isRequired: true,
            sortOrder: 2,
            gridWidth: 'col-md-6'
          },
          {
            fieldKey: 'message',
            label: 'Message / Project Brief',
            placeholder: 'Describe your goals or requirements in detail...',
            fieldType: 'textarea',
            isRequired: true,
            sortOrder: 3,
            gridWidth: 'col-md-12'
          }
        ];
        this.checkAndRestoreDraft();
      }
    });
  }

  /// <summary>
  /// Loads form entity and fields from the API. Falls back to local draft if server fails or draft is newer.
  /// </summary>
  /// <param name="id">The unique form GUID.</param>
  loadForm(id: string): void {
    this.formsService.getFormById(id).subscribe({
      next: (res: any) => {
        if (res && res.isSuccess && res.data) {
          this.form = res.data;
          this.fields = res.data.fields || [];
          this.lastSavedTime = res.data.updatedAtUtc ? new Date(this.parseUtcMillis(res.data.updatedAtUtc)) : null;
          this.autoSaveStatus = 'saved';
          this.checkAndRestoreDraft(res.data.updatedAtUtc);
        } else {
          this.toast.error(res?.message || 'Load failed.');
          this.checkAndRestoreDraft();
        }
      },
      error: () => {
        this.toast.error('Load failed.');
        this.checkAndRestoreDraft();
      }
    });
  }

  /// <summary>
  /// Removes stored local drafts and clears restored draft indicator.
  /// </summary>
  private clearLocalDraft(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.draftStorageKey);
      localStorage.removeItem('bcp_form_draft_new');
    }
    this.hasDraftRestored = false;
  }

  /// <summary>
  /// Saves current in-memory form and fields to localStorage draft backup.
  /// </summary>
  saveLocalDraft(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const draft = {
        formId: this.formId,
        form: this.form,
        fields: this.fields,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem(this.draftStorageKey, JSON.stringify(draft));
    } catch {
      // Ignore private browsing or quota limits
    }
  }

  /// <summary>
  /// Restores unsaved changes from local draft storage if available and newer than database record.
  /// </summary>
  /// <param name="serverUpdatedAt">Optional ISO string of last server update.</param>
  checkAndRestoreDraft(serverUpdatedAt?: string): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(this.draftStorageKey);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (!draft || !draft.form) return;

      if (serverUpdatedAt && draft.savedAt) {
        const draftTime = this.parseUtcMillis(draft.savedAt);
        const serverTime = this.parseUtcMillis(serverUpdatedAt);
        if (draftTime <= serverTime) {
          localStorage.removeItem(this.draftStorageKey);
          return;
        }
      }

      if (draft.fields && draft.fields.length > 0) {
        this.form = { ...this.form, ...draft.form };
        this.fields = draft.fields;
        this.hasDraftRestored = true;
        this.toast.info('Restored.');
      }
    } catch {
      // Ignore parse errors
    }
  }

  /// <summary>
  /// Clears the local draft storage and reloads server version.
  /// </summary>
  discardDraft(): void {
    this.clearLocalDraft();
    if (this.formId) {
      this.loadForm(this.formId);
    }
    this.toast.success('Discarded.');
  }

  /// <summary>
  /// Triggers debounced real-time auto-saving and persists local draft immediately.
  /// </summary>
  onDataChanged(): void {
    this.saveLocalDraft();
    this.autoSaveStatus = 'unsaved';

    if (this.autoSaveDebounceTimer) {
      clearTimeout(this.autoSaveDebounceTimer);
    }

    this.autoSaveDebounceTimer = setTimeout(() => {
      this.performAutoSave();
    }, 1500);
  }

  /// <summary>
  /// Parses a UTC timestamp safely even when SQL Server serializes without a trailing 'Z'.
  /// </summary>
  /// <param name="value">ISO or naive UTC timestamp string.</param>
  /// <returns>Unix epoch milliseconds.</returns>
  private parseUtcMillis(value: string): number {
    const raw = (value || '').trim();
    if (!raw) return 0;
    const hasZone = /([zZ]|[+-]\d{2}:\d{2})$/.test(raw);
    return new Date(hasZone ? raw : `${raw}Z`).getTime();
  }

  /// <summary>
  /// Executes debounced background saving without overlapping in-flight requests or explicit saves.
  /// </summary>
  performAutoSave(): void {
    if (!this.form.title?.trim() || !this.form.formKey?.trim() || this.fields.length === 0) {
      return;
    }

    if (this.saving || this.pendingExplicitSave) {
      return;
    }

    if (this.autoSaveInFlight) {
      this.pendingAutoSave = true;
      return;
    }

    this.autoSaveInFlight = true;
    this.autoSaveStatus = 'saving';
    this.reindexFields();

    const payload: Partial<PageFormItem> = {
      ...this.form,
      fields: this.fields
    };

    const action = this.isEditMode && this.formId
      ? this.formsService.updateForm(this.formId, payload)
      : this.formsService.createForm(payload);

    action.subscribe({
      next: (res: any) => {
        this.autoSaveInFlight = false;

        if (res && res.isSuccess) {
          this.autoSaveStatus = 'saved';
          this.lastSavedTime = new Date();

          if (!this.formId && res.data?.id) {
            this.formId = res.data.id;
            this.isEditMode = true;
            if (typeof window !== 'undefined') {
              window.history.replaceState({}, '', `/content/console/forms/edit/${this.formId}`);
            }
          }

          if (res.data?.fields && Array.isArray(res.data.fields)) {
            const serverFields: PageFormFieldItem[] = res.data.fields;
            this.fields.forEach((f, idx) => {
              const matched =
                serverFields.find(sf => sf.fieldKey && sf.fieldKey === f.fieldKey) ||
                (serverFields.length === this.fields.length ? serverFields[idx] : undefined);
              if (matched?.id) {
                f.id = matched.id;
              }
            });
          }

          // Clear local draft once server persistence succeeds so reopening does not falsely restore saved changes.
          this.clearLocalDraft();
        } else {
          this.autoSaveStatus = 'error';
        }

        if (this.pendingExplicitSave) {
          this.pendingExplicitSave = false;
          this.pendingAutoSave = false;
          this.executeSaveRequest();
        } else if (this.pendingAutoSave) {
          this.pendingAutoSave = false;
          this.performAutoSave();
        }
      },
      error: () => {
        this.autoSaveInFlight = false;
        this.autoSaveStatus = 'error';

        if (this.pendingExplicitSave) {
          this.pendingExplicitSave = false;
          this.pendingAutoSave = false;
          this.executeSaveRequest();
        } else if (this.pendingAutoSave) {
          this.pendingAutoSave = false;
          this.performAutoSave();
        }
      }
    });
  }

  private loadExistingFormKeys(currentId: string | null): void {
    this.formsService.getAllForms().subscribe({
      next: (res: any) => {
        const list: any[] = Array.isArray(res?.data) ? res.data : [];
        this.existingFormKeys = list
          .filter(f => !currentId || f.id !== currentId)
          .map(f => String(f.formKey || '').trim().toLowerCase())
          .filter(Boolean);
      },
      error: () => { }
    });
  }

  onTitleChange(): void {
    if (!this.isEditMode && this.form.title) {
      const baseSlug = this.form.title
        .toLowerCase()
        .replace(/&/g, 'and')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');

      const root = baseSlug || 'custom-form';
      let candidate = root;
      let suffix = 2;
      while (this.existingFormKeys.includes(candidate)) {
        candidate = `${root}-${suffix++}`;
      }
      this.form.formKey = candidate;
    }
    this.onDataChanged();
  }

  isDuplicateFormKey(): boolean {
    if (this.isEditMode || !this.form.formKey) return false;
    return this.existingFormKeys.includes(this.form.formKey.trim().toLowerCase());
  }

  onFieldLabelChange(field: PageFormFieldItem, idx: number): void {
    field.fieldKey = this.buildUniqueFieldKey(field.label, idx);
    this.onDataChanged();
  }

  /**
   * Builds a snake_case programmatic key from the question label while guaranteeing
   * zero duplicate keys among sibling fields in this form.
   */
  private buildUniqueFieldKey(label: string | undefined, selfIdx: number): string {
    const cleaned = (label || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s_]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');

    const root = cleaned || `question_${selfIdx + 1}`;
    const siblingKeys = new Set(
      this.fields
        .map((f, i) => (i !== selfIdx ? (f.fieldKey || '').trim().toLowerCase() : ''))
        .filter(Boolean)
    );

    let candidate = root;
    let suffix = 2;
    while (siblingKeys.has(candidate)) {
      candidate = `${root}_${suffix++}`;
    }
    return candidate;
  }

  isDuplicateFieldKey(field: PageFormFieldItem, idx: number): boolean {
    const target = (field.fieldKey || '').trim().toLowerCase();
    if (!target) return false;
    return this.fields.some((f, i) => i !== idx && (f.fieldKey || '').trim().toLowerCase() === target);
  }

  private ensureUniqueFieldKeys(): void {
    const seen = new Set<string>();
    this.fields.forEach((f, idx) => {
      const cleaned = (f.fieldKey || f.label || `question_${idx + 1}`)
        .toLowerCase()
        .replace(/[^a-z0-9\s_]/g, '')
        .trim()
        .replace(/\s+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '');
      const root = cleaned || `question_${idx + 1}`;
      let candidate = root;
      let suffix = 2;
      while (seen.has(candidate)) {
        candidate = `${root}_${suffix++}`;
      }
      seen.add(candidate);
      f.fieldKey = candidate;
    });
  }

  getFieldTypeLabel(type: string): string {
    switch (type) {
      case 'pill_select': return 'Pills';
      case 'dropdown': return 'Dropdown';
      case 'text': return 'Text';
      case 'email': return 'Email';
      case 'phone': return 'Phone';
      case 'date': return 'Date';
      case 'time': return 'Time';
      case 'datetime': return 'Date & Time';
      case 'textarea': return 'Textarea';
      case 'number': return 'Number';
      case 'checkbox': return 'Checkbox';
      default: return type;
    }
  }

  toggleFieldExpansion(idx: number): void {
    this.activeFieldIndex = this.activeFieldIndex === idx ? -1 : idx;
  }

  /// <summary>
  /// Inserts a new question directly below the specified index (or the active question),
  /// falling back to the bottom of the list when no question is active.
  /// </summary>
  /// <param name="afterIndex">Optional explicit field index to insert after.</param>
  addField(afterIndex?: number): void {
    const anchor = afterIndex !== undefined ? afterIndex : this.activeFieldIndex;
    const insertIdx = anchor >= 0 && anchor < this.fields.length ? anchor + 1 : this.fields.length;
    const defaultLabel = `Question ${this.fields.length + 1}`;

    this.fields.splice(insertIdx, 0, {
      fieldKey: '',
      label: defaultLabel,
      placeholder: '',
      fieldType: 'text',
      isRequired: false,
      sortOrder: insertIdx + 1,
      gridWidth: 'col-md-12'
    });

    // Recompute 1-based sortOrder and unique fieldKey across all fields after insertion
    this.reindexFields();
    this.activeFieldIndex = insertIdx;
    this.onDataChanged();
  }

  removeField(idx: number): void {
    this.fields.splice(idx, 1);
    this.reindexFields();
    if (this.activeFieldIndex >= this.fields.length) {
      this.activeFieldIndex = this.fields.length - 1;
    }
    this.onDataChanged();
  }

  moveField(idx: number, delta: number): void {
    const target = idx + delta;
    if (target < 0 || target >= this.fields.length) return;
    const temp = this.fields[idx];
    this.fields[idx] = this.fields[target];
    this.fields[target] = temp;
    this.reindexFields();
    this.activeFieldIndex = target;
    this.onDataChanged();
  }

  private reindexFields(): void {
    this.fields.forEach((f, i) => {
      f.sortOrder = i + 1;
    });
    this.ensureUniqueFieldKeys();
  }

  parseOptions(optionsStr?: string): string[] {
    if (!optionsStr) return [];
    return optionsStr
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  /** Loads CMS pages so Agreement Checkboxes can link to Terms, Privacy, or any CMS page. */
  loadCmsPages(): void {
    this.api.get<any>('ContentApi/pages').subscribe({
      next: (res) => {
        const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        this.cmsPages = list
          .filter((p: any) => p && p.id && p.title)
          .map((p: any) => ({
            id: String(p.id),
            title: String(p.title),
            directUrl: String(p.directUrl || '').replace(/^\/+/, ''),
            publish: Boolean(p.publish)
          }));
      },
      error: () => {}
    });
  }

  /** Parses legal consent links stored in `field.optionsJson` for `checkbox` fields. */
  getCheckboxLinks(field: PageFormFieldItem): Array<{ linkText: string; pageId?: string | null; pageSlug?: string | null; customUrl?: string | null }> {
    if (!field.optionsJson) return [];
    try {
      const parsed = JSON.parse(field.optionsJson);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private saveCheckboxLinks(field: PageFormFieldItem, links: Array<{ linkText: string; pageId?: string | null; pageSlug?: string | null; customUrl?: string | null }>): void {
    field.optionsJson = links.length > 0 ? JSON.stringify(links) : '';
    this.onDataChanged();
  }

  /** Adds a linked legal page entry to an Agreement Checkbox field. */
  addCheckboxLink(field: PageFormFieldItem): void {
    const links = [...this.getCheckboxLinks(field)];
    links.push({
      linkText: links.length === 0 ? 'Terms & Conditions' : 'Privacy Policy',
      pageId: null,
      pageSlug: null,
      customUrl: null
    });
    this.saveCheckboxLinks(field, links);
  }

  /** Removes a linked legal page entry from an Agreement Checkbox field. */
  removeCheckboxLink(field: PageFormFieldItem, index: number): void {
    const links = [...this.getCheckboxLinks(field)];
    links.splice(index, 1);
    this.saveCheckboxLinks(field, links);
  }

  /** Updates the clickable link label for a checkbox legal link. */
  updateCheckboxLinkText(field: PageFormFieldItem, index: number, value: string): void {
    const links = [...this.getCheckboxLinks(field)];
    if (!links[index]) return;
    links[index] = { ...links[index], linkText: value };
    this.saveCheckboxLinks(field, links);
  }

  /** Updates the custom URL for a checkbox legal link. */
  updateCheckboxLinkCustomUrl(field: PageFormFieldItem, index: number, value: string): void {
    const links = [...this.getCheckboxLinks(field)];
    if (!links[index]) return;
    links[index] = { ...links[index], customUrl: value };
    this.saveCheckboxLinks(field, links);
  }

  /** Handles CMS Legal Page dropdown selection for a checkbox link. */
  onCheckboxLinkPageSelected(field: PageFormFieldItem, index: number, selectedValue: string): void {
    const links = [...this.getCheckboxLinks(field)];
    const current = links[index];
    if (!current) return;

    if (selectedValue === '__custom__') {
      links[index] = { ...current, pageId: null, pageSlug: '__custom__', customUrl: current.customUrl || '' };
    } else if (!selectedValue) {
      links[index] = { ...current, pageId: null, pageSlug: null, customUrl: null };
    } else {
      const page = this.cmsPages.find(p => p.id === selectedValue);
      const nextText = (!current.linkText || current.linkText === 'Terms & Conditions' || current.linkText === 'Privacy Policy')
        ? (page?.title || current.linkText)
        : current.linkText;
      links[index] = {
        ...current,
        linkText: nextText,
        pageId: selectedValue,
        pageSlug: page?.directUrl || null,
        customUrl: null
      };
    }
    this.saveCheckboxLinks(field, links);
  }

  /** Resolves the public href for a checkbox legal link. */
  getLegalLinkHref(lnk: { pageSlug?: string | null; customUrl?: string | null }): string {
    if (lnk.customUrl && lnk.customUrl.trim()) return lnk.customUrl.trim();
    if (lnk.pageSlug && lnk.pageSlug !== '__custom__') return '/p/' + lnk.pageSlug.replace(/^\/+/, '');
    return '#';
  }

  saveForm(): void {
    if (this.autoSaveDebounceTimer) {
      clearTimeout(this.autoSaveDebounceTimer);
    }
    this.pendingAutoSave = false;

    if (!this.form.title?.trim()) {
      this.toast.error('Form title is required.');
      return;
    }

    if (!this.form.formKey?.trim()) {
      this.toast.error('Programmatic Form Key slug is required.');
      return;
    }

    if (this.fields.length === 0) {
      this.toast.error('Please add at least one question to the form.');
      return;
    }

    this.saving = true;
    this.autoSaveStatus = 'saving';

    // Wait for any active background auto-save to finish so two concurrent PUTs never race on PageFormFields.
    if (this.autoSaveInFlight) {
      this.pendingExplicitSave = true;
      return;
    }

    this.executeSaveRequest();
  }

  /// <summary>
  /// Sends the explicit Save Form request and navigates back to the forms console on success.
  /// </summary>
  private executeSaveRequest(): void {
    this.reindexFields();

    const payload: Partial<PageFormItem> = {
      ...this.form,
      fields: this.fields
    };

    const action = this.isEditMode && this.formId
      ? this.formsService.updateForm(this.formId, payload)
      : this.formsService.createForm(payload);

    action.subscribe({
      next: (res: any) => {
        this.saving = false;
        if (res && res.isSuccess) {
          this.autoSaveStatus = 'saved';
          this.clearLocalDraft();
          this.toast.success(this.isEditMode ? 'Updated.' : 'Saved.');
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('forms_updated'));
          }
          this.router.navigate(['/content/console/forms']);
        } else {
          this.autoSaveStatus = 'error';
          this.toast.error(res?.message || 'Save failed.');
        }
      },
      error: () => {
        this.saving = false;
        this.autoSaveStatus = 'error';
        this.toast.error('Save failed.');
      }
    });
  }
}
