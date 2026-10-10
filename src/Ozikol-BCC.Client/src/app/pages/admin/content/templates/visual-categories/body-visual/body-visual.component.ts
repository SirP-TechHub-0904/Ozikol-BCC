import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../../../core/services/api.service';
import { ToastService } from '../../../../../../core/services/toast.service';
import { VisualEditorComponent } from '../../visual-editor/visual-editor.component';

/**
 * Dedicated visual editor component for creating and editing Body Section templates.
 * Enforces multi-column feature cards, child items repeater loop (`PageSectionLists`),
 * rich full description scalar, and isolated scoped CSS.
 */
@Component({
  selector: 'app-body-visual',
  standalone: true,
  imports: [CommonModule, FormsModule, VisualEditorComponent],
  template: `
    <div class="category-visual-layout">
      <!-- Category Meta Bar: Name, Variant Code, Description, and Save Action -->
      <div class="category-meta-bar">
        <div class="meta-left">
          <div class="category-badge">
            <span class="material-symbols-outlined">dashboard_customize</span>
            <span>Body Section Studio</span>
          </div>

          <div class="meta-input-group">
            <label class="meta-label">Template Name</label>
            <input
              type="text"
              class="meta-input"
              [(ngModel)]="templateName"
              placeholder="e.g. Nexus Tri-Card Features Grid"
            />
          </div>

          <div class="meta-input-group">
            <label class="meta-label">Variant Code</label>
            <input
              type="text"
              class="meta-input code-input"
              [(ngModel)]="variantCode"
              readonly
            />
          </div>

          <div class="meta-input-group flex-grow">
            <label class="meta-label">Description</label>
            <input
              type="text"
              class="meta-input"
              [(ngModel)]="description"
              placeholder="e.g. Multi-column responsive grid with icon badges, feature cards, and narrative copy"
            />
          </div>
        </div>

        <div class="meta-right">
          <button
            type="button"
            class="btn-save-template"
            [disabled]="isSaving"
            (click)="saveBodyTemplate()"
          >
            <span class="material-symbols-outlined" *ngIf="!isSaving">check_circle</span>
            <span class="material-symbols-outlined spin" *ngIf="isSaving">sync</span>
            <span>{{ isSaving ? 'Saving...' : (isEditMode ? 'Update Section' : 'Save Section') }}</span>
          </button>
        </div>
      </div>

      <!-- Core Reusable Visual Editor with Div and CSS Folding -->
      <app-visual-editor
        [category]="'body'"
        [categoryName]="'Body Section'"
        [htmlTemplate]="htmlTemplate"
        [cssStyles]="cssStyles"
        [jsScript]="jsScript"
        [sampleContent]="sampleContent"
        [specificTokens]="bodyTokens"
        [isEditMode]="isEditMode"
        [editorTokens]="editorTokens"
        (htmlTemplateChange)="htmlTemplate = $event"
        (cssStylesChange)="cssStyles = $event"
        (jsScriptChange)="jsScript = $event"
        (sampleContentChange)="sampleContent = $event"
      ></app-visual-editor>
    </div>
  `,
  styles: [`
    .category-visual-layout {
      display: flex;
      flex-direction: column;
      gap: 16px;
      height: 100%;
    }

    .category-meta-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 20px;
      background-color: #1e293b;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 10px;
      flex-wrap: wrap;
      gap: 16px;
    }

    .meta-left {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
      flex: 1;
    }

    .category-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background-color: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.25);
      color: #34d399;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;

      span.material-symbols-outlined { font-size: 16px; }
    }

    .meta-input-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .meta-input-group.flex-grow {
      flex: 1;
      min-width: 220px;
    }

    .meta-label {
      font-size: 11px;
      font-weight: 600;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .meta-input {
      background-color: #0f172a;
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #ffffff;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 13px;
      min-width: 200px;
      outline: none;

      &:focus {
        border-color: #34d399;
        box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
      }
    }

    .code-input {
      min-width: 150px;
      color: #34d399;
      font-family: 'Fira Code', monospace;
      background-color: rgba(15, 23, 42, 0.6);
    }

    .btn-save-template {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 20px;
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      color: #ffffff;
      border: none;
      border-radius: 8px;
      font-size: 13.5px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);
      transition: all 0.15s ease;

      span.material-symbols-outlined { font-size: 18px; }

      &:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 6px 16px rgba(5, 150, 105, 0.45);
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .spin { animation: spin 1s linear infinite; }
  `]
})
export class BodyVisualComponent implements OnInit {
  @Input() isEditMode: boolean = false;
  @Input() existingTemplateId?: string;
  @Input() editorTokens: any = null;
  @Output() templateSaved = new EventEmitter<any>();

  templateName: string = 'Nexus Tri-Card Features Grid';
  variantCode: string = '';
  description: string = 'Multi-column responsive grid with icon badges, feature cards, and narrative copy';
  isSaving: boolean = false;

  htmlTemplate: string = `<section class="oz-features-section">
  <div class="oz-features-header">
    <span class="oz-sub-badge">{{ MiniTitle }}</span>
    <h2 class="oz-features-title">{{ Title }}</h2>
    <p class="oz-features-desc">{{ Description }}</p>
  </div>

  <div class="oz-features-grid">
    {{#each PageSectionLists}}
    <div class="oz-feature-card">
      <div class="oz-feature-icon-box">
        <span class="material-symbols-outlined">{{ Icon }}</span>
      </div>
      <h3 class="oz-feature-card-title">{{ Title }}</h3>
      <p class="oz-feature-card-desc">{{ Description }}</p>
    </div>
    {{/each}}
  </div>
</section>`;

  cssStyles: string = `.oz-features-section {
  padding: 72px 24px;
  background: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  text-align: center;
}
.oz-sub-badge {
  display: inline-block;
  background: #eef2ff;
  color: #0050e5;
  font-size: 11px;
  font-weight: 800;
  padding: 4px 12px;
  border-radius: 16px;
  margin-bottom: 12px;
}
.oz-features-title {
  font-size: 34px;
  font-weight: 900;
  color: #0f172a;
  margin: 0 0 12px 0;
  letter-spacing: -0.02em;
}
.oz-features-desc {
  font-size: 15px;
  color: #64748b;
  max-width: 620px;
  margin: 0 auto 48px auto;
  line-height: 1.5;
}
.oz-features-grid {
  max-width: 1140px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 28px;
  text-align: left;
}
.oz-feature-card {
  background: #f8fafc;
  border: 1.5px solid #e2e8f0;
  border-radius: 12px;
  padding: 28px;
  transition: all 0.2s ease;
}
.oz-feature-card:hover {
  transform: translateY(-3px);
  border-color: #0050e5;
  background: #ffffff;
  box-shadow: 0 8px 24px rgba(0, 80, 229, 0.08);
}
.oz-feature-icon-box {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  background: #eef2ff;
  color: #0050e5;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 18px;
}
.oz-feature-icon-box .material-symbols-outlined { font-size: 26px; }
.oz-feature-card-title { font-size: 18px; font-weight: 800; color: #0f172a; margin: 0 0 8px 0; }
.oz-feature-card-desc { font-size: 13.5px; color: #64748b; line-height: 1.55; margin: 0; }
@media (max-width: 768px) {
  .oz-features-section { padding: 48px 16px; }
  .oz-features-title { font-size: 26px; }
  .oz-features-desc { font-size: 14px; margin-bottom: 32px; }
  .oz-features-grid { grid-template-columns: 1fr; gap: 16px; }
  .oz-feature-card { padding: 20px; }
}`;

  jsScript: string = '';

  bodyTokens: Array<{ label: string; token: string }> = [
    { label: 'Title', token: '{{ Title }}' },
    { label: 'MiniTitle', token: '{{ MiniTitle }}' },
    { label: 'Description', token: '{{ Description }}' },
    { label: 'FullDescription', token: '{{ FullDescription }}' },
    { label: 'ButtonText', token: '{{ ButtonText }}' },
    { label: 'ButtonLink', token: '{{ ButtonLink }}' },
    { label: 'ImageUrl', token: '{{ ImageUrl }}' },
    { label: 'Cards Repeater', token: '{{#each PageSectionLists}}\n  <div class="oz-feature-card">\n    <span class="material-symbols-outlined">{{ Icon }}</span>\n    <h3>{{ Title }}</h3>\n    <p>{{ Description }}</p>\n  </div>\n{{/each}}' },
    { label: 'Contact Form', token: '{{ Form "Contact_Us" }}' }
  ];

  sampleContent: any = {
    title: 'Engineered For Enterprise Scale And Sub-Millisecond Speed',
    miniTitle: 'PLATFORM CAPABILITIES',
    description: 'Unified toolchain built from the ground up to solve distributed bottlenecks and enhance organizational productivity.',
    pageSectionLists: [
      { title: 'Edge Cloud Replication', description: 'Continuous multi-region synchronization keeps endpoints resilient against downtime.', icon: 'hub' },
      { title: 'Zero Trust Security', description: 'Granular policy enforcement, automatic device trust tokens, and cryptographic verification on every call.', icon: 'verified_user' },
      { title: 'Automated CI/CD Workflows', description: 'Push to git and deploy production containers in seconds with automated rollbacks.', icon: 'rocket_launch' }
    ]
  };

  constructor(
    private api: ApiService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    if (!this.variantCode) {
      this.regenerateVariantCode();
    }
    if (this.isEditMode && this.existingTemplateId) {
      this.loadExistingTemplate(this.existingTemplateId);
    }
  }

  regenerateVariantCode(): void {
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
    this.variantCode = `BODY_${randomSuffix}`;
  }

  loadExistingTemplate(id: string): void {
    this.api.get<any>(`ContentApi/templates/${id}`).subscribe({
      next: (res) => {
        const item = res?.data || res;
        if (item) {
          this.templateName = item.name || this.templateName;
          this.variantCode = item.variantCode || this.variantCode;
          this.description = item.description || this.description;
          if (item.htmlTemplate) this.htmlTemplate = item.htmlTemplate;
          if (item.cssStyles) this.cssStyles = item.cssStyles;
          if (item.jsScript) this.jsScript = item.jsScript;
          if (item.defaultContentJson) {
            try {
              this.sampleContent = JSON.parse(item.defaultContentJson);
            } catch (e) {}
          }
        }
      },
      error: () => {
        this.toast.error('Failed to load existing Body Section template.');
      }
    });
  }

  saveBodyTemplate(): void {
    const name = (this.templateName || '').trim();
    if (!name) {
      this.toast.warning('Please enter a template name.');
      return;
    }

    this.isSaving = true;
    const payload = {
      name,
      category: 'body',
      variantCode: this.variantCode,
      htmlTemplate: this.htmlTemplate,
      cssStyles: this.cssStyles,
      jsScript: this.jsScript,
      defaultContentJson: JSON.stringify(this.sampleContent),
      version: '1.0.0'
    };

    const endpoint = this.isEditMode && this.existingTemplateId
      ? this.api.put<any>(`ContentApi/templates/${this.existingTemplateId}`, payload)
      : this.api.post<any>('ContentApi/templates', payload);

    endpoint.subscribe({
      next: (res: any) => {
        this.isSaving = false;
        this.toast.success(
          this.isEditMode
            ? `Successfully updated Body Section template "${name}".`
            : `Successfully created Body Section template "${name}".`
        );
        this.templateSaved.emit(res?.data || res);
      },
      error: (err: any) => {
        this.isSaving = false;
        const msg = err?.error?.message || err?.message || 'Failed to save Body Section template.';
        this.toast.error(`Save error: ${msg}`);
      }
    });
  }
}
