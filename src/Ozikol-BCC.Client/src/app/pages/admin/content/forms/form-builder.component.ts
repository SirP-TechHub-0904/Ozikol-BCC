import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PageFormsService, PageFormItem, PageFormFieldItem } from '../../../../core/services/page-forms.service';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-form-builder',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="cms-page-container">
      <!-- Top Header -->
      <div class="page-header">
        <div class="header-titles">
          <div class="breadcrumb">
            <a routerLink="/content/console">CMS Studio</a>
            <span class="sep">/</span>
            <a routerLink="/content/console/forms">Manage Forms</a>
            <span class="sep">/</span>
            <span class="current">{{ isEditMode ? 'Edit Form' : 'New Dynamic Form' }}</span>
          </div>
          <h1>{{ isEditMode ? ('Edit: ' + form.title) : 'Create Dynamic Website Form' }}</h1>
          <p class="subtitle">
            Configure questions, multi-select pills, dropdowns, and submission rules for website intake.
          </p>
        </div>
        <div class="header-actions">
          <a routerLink="/content/console/forms" class="btn btn-outline">
            Cancel
          </a>
          <button type="button" class="btn btn-primary" (click)="saveForm()" [disabled]="saving">
            <span class="material-symbols-outlined" *ngIf="!saving">save</span>
            <span class="material-symbols-outlined spin" *ngIf="saving">progress_activity</span>
            <span>{{ saving ? 'Saving Form...' : 'Save Form & Questions' }}</span>
          </button>
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
                  placeholder="e.g. Service Request & Project Intake"
                  class="form-control"
                  required>
                <small class="hint">Internal and display title of this form.</small>
              </div>

              <div class="form-group">
                <label>Programmatic Key / Slug <span class="required">*</span></label>
                <input
                  type="text"
                  [(ngModel)]="form.formKey"
                  placeholder="e.g. service-request"
                  class="form-control font-mono"
                  [disabled]="isEditMode"
                  required>
                <small class="hint">Used in template sections to identify this form (lowercase, hyphens only).</small>
              </div>

              <div class="form-group">
                <label>Notification Email</label>
                <input
                  type="email"
                  [(ngModel)]="form.notificationEmail"
                  placeholder="e.g. inquiries@mycompany.com"
                  class="form-control">
                <small class="hint">Optional. Forward newly submitted inquiries to this address.</small>
              </div>

              <div class="form-group col-span-2">
                <label>Description / Subtitle</label>
                <textarea
                  [(ngModel)]="form.description"
                  rows="2"
                  placeholder="Brief introductory guidance for visitors filling this form..."
                  class="form-control"></textarea>
              </div>

              <div class="form-group">
                <label>Submit Button Text</label>
                <input
                  type="text"
                  [(ngModel)]="form.submitButtonText"
                  placeholder="Submit Inquiry"
                  class="form-control">
              </div>

              <div class="form-group">
                <label>Success Message Confirmation</label>
                <input
                  type="text"
                  [(ngModel)]="form.successMessage"
                  placeholder="Thank you! We have received your request and will follow up shortly."
                  class="form-control">
              </div>

              <div class="form-group col-span-2">
                <label class="toggle-label">
                  <input type="checkbox" [(ngModel)]="form.isActive">
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
                        (input)="onFieldLabelChange(field)"
                        placeholder="e.g. Which service are you interested in?"
                        class="form-control">
                    </div>

                    <div class="form-group">
                      <label>Programmatic Key <span class="required">*</span></label>
                      <input
                        type="text"
                        [(ngModel)]="field.fieldKey"
                        placeholder="e.g. services"
                        class="form-control font-mono">
                      <small class="hint">Identifier stored in submission data payload.</small>
                    </div>

                    <div class="form-group">
                      <label>Input Type <span class="required">*</span></label>
                      <select [(ngModel)]="field.fieldType" class="form-control">
                        <option value="pill_select">Pill Select (Multi-choice tags)</option>
                        <option value="dropdown">Dropdown Select</option>
                        <option value="text">Single-line Text</option>
                        <option value="email">Email Address</option>
                        <option value="phone">Phone Number</option>
                        <option value="textarea">Multi-line Textarea / Brief</option>
                        <option value="number">Numeric</option>
                        <option value="checkbox">Agreement Checkbox</option>
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
                        rows="2"
                        placeholder="e.g. Web Design & UI, Cloud Engineering, Security Audit, Mobile App Dev"
                        class="form-control"></textarea>
                      <small class="hint">Enter each option separated by commas. Visitors will choose from these items.</small>
                    </div>

                    <div class="form-group">
                      <label>Placeholder Text</label>
                      <input
                        type="text"
                        [(ngModel)]="field.placeholder"
                        placeholder="e.g. Select timeline or Enter your name"
                        class="form-control">
                    </div>

                    <div class="form-group">
                      <label>Grid Layout Width</label>
                      <select [(ngModel)]="field.gridWidth" class="form-control">
                        <option value="col-md-12">Full Width (100%)</option>
                        <option value="col-md-6">Half Width (50%)</option>
                        <option value="col-md-4">One Third (33.3%)</option>
                      </select>
                    </div>

                    <div class="form-group col-span-2">
                      <label class="toggle-label">
                        <input type="checkbox" [(ngModel)]="field.isRequired">
                        <span class="toggle-text">Mandatory / Required question</span>
                      </label>
                    </div>
                  </div>
                </div>
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

                  <!-- Checkbox preview -->
                  <label *ngIf="field.fieldType === 'checkbox'" class="preview-checkbox">
                    <input type="checkbox" disabled>
                    <span>{{ field.placeholder || field.label }}</span>
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
    .btn-sort, .btn-remove-field {
      border: none; background: transparent; padding: 4px; border-radius: 6px;
      cursor: pointer; color: #64748b; display: flex; align-items: center;
    }
    .btn-sort:hover:not(:disabled) { background: #e2e8f0; color: #0f172a; }
    .btn-sort:disabled { opacity: 0.3; cursor: not-allowed; }
    .btn-remove-field:hover { background: #fee2e2; color: #dc2626; }
    .btn-sort span, .btn-remove-field span { font-size: 18px; }

    .field-card-body {
      padding: 18px; border-top: 1px solid #f1f5f9; background: #fff;
    }
    .field-edit-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }

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

    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { 100% { transform: rotate(360deg); } }
  `]
})
export class FormBuilderComponent implements OnInit {
  isEditMode = false;
  formId: string | null = null;
  saving = false;
  activeFieldIndex = 0;

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

  constructor(
    private formsService: PageFormsService,
    private route: ActivatedRoute,
    private router: Router,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.isEditMode = true;
        this.formId = id;
        this.loadForm(id);
      } else {
        // Seed default starter questions for new form
        this.fields = [
          {
            fieldKey: 'full_name',
            label: 'Your Full Name',
            placeholder: 'e.g. John Doe',
            fieldType: 'text',
            isRequired: true,
            sortOrder: 1,
            gridWidth: 'col-md-6'
          },
          {
            fieldKey: 'email',
            label: 'Work Email Address',
            placeholder: 'e.g. john@example.com',
            fieldType: 'email',
            isRequired: true,
            sortOrder: 2,
            gridWidth: 'col-md-6'
          },
          {
            fieldKey: 'message',
            label: 'Message / Project Brief',
            placeholder: 'Describe your goals or questions in detail...',
            fieldType: 'textarea',
            isRequired: true,
            sortOrder: 3,
            gridWidth: 'col-md-12'
          }
        ];
      }
    });
  }

  loadForm(id: string): void {
    this.formsService.getFormById(id).subscribe({
      next: (res: any) => {
        if (res && res.isSuccess && res.data) {
          this.form = res.data;
          this.fields = res.data.fields || [];
        } else {
          this.toast.error(res?.message || 'Failed to load form details.');
        }
      },
      error: () => {
        this.toast.error('Network error loading form details.');
      }
    });
  }

  onTitleChange(): void {
    if (!this.isEditMode && this.form.title) {
      this.form.formKey = this.form.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
    }
  }

  onFieldLabelChange(field: PageFormFieldItem): void {
    if (!field.fieldKey || field.fieldKey.startsWith('field_')) {
      field.fieldKey = field.label
        .toLowerCase()
        .replace(/[^a-z0-9\s_]/g, '')
        .trim()
        .replace(/\s+/g, '_');
    }
  }

  getFieldTypeLabel(type: string): string {
    switch (type) {
      case 'pill_select': return 'Pills';
      case 'dropdown': return 'Dropdown';
      case 'text': return 'Text';
      case 'email': return 'Email';
      case 'phone': return 'Phone';
      case 'textarea': return 'Textarea';
      case 'number': return 'Number';
      case 'checkbox': return 'Checkbox';
      default: return type;
    }
  }

  toggleFieldExpansion(idx: number): void {
    this.activeFieldIndex = this.activeFieldIndex === idx ? -1 : idx;
  }

  addField(): void {
    const newIdx = this.fields.length + 1;
    this.fields.push({
      fieldKey: `question_${newIdx}`,
      label: `Question ${newIdx}`,
      placeholder: '',
      fieldType: 'text',
      isRequired: false,
      sortOrder: newIdx,
      gridWidth: 'col-md-12'
    });
    this.activeFieldIndex = this.fields.length - 1;
  }

  removeField(idx: number): void {
    this.fields.splice(idx, 1);
    this.reindexFields();
    if (this.activeFieldIndex >= this.fields.length) {
      this.activeFieldIndex = this.fields.length - 1;
    }
  }

  moveField(idx: number, delta: number): void {
    const target = idx + delta;
    if (target < 0 || target >= this.fields.length) return;
    const temp = this.fields[idx];
    this.fields[idx] = this.fields[target];
    this.fields[target] = temp;
    this.reindexFields();
    this.activeFieldIndex = target;
  }

  private reindexFields(): void {
    this.fields.forEach((f, i) => {
      f.sortOrder = i + 1;
    });
  }

  parseOptions(optionsStr?: string): string[] {
    if (!optionsStr) return [];
    return optionsStr
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  saveForm(): void {
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
          this.toast.success(this.isEditMode ? 'Form updated successfully.' : 'Form created successfully.');
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('forms_updated'));
          }
          this.router.navigate(['/content/console/forms']);
        } else {
          this.toast.error(res?.message || 'Failed to save form.');
        }
      },
      error: (err: any) => {
        this.saving = false;
        this.toast.error('An error occurred while saving the form.');
      }
    });
  }
}
