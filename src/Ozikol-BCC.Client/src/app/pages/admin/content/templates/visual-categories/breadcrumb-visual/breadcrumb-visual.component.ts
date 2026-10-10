import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../../../core/services/api.service';
import { ToastService } from '../../../../../../core/services/toast.service';
import { VisualEditorComponent } from '../../visual-editor/visual-editor.component';

/**
 * Dedicated visual editor component for creating and editing Breadcrumbs & Subpage Header templates.
 * Enforces dynamic page hierarchy trail, background banner, and scoped styling.
 */
@Component({
  selector: 'app-breadcrumb-visual',
  standalone: true,
  imports: [CommonModule, FormsModule, VisualEditorComponent],
  template: `
    <div class="category-visual-layout">
      <!-- Category Meta Bar: Name, Variant Code, Description, and Save Action -->
      <div class="category-meta-bar">
        <div class="meta-left">
          <div class="category-badge">
            <span class="material-symbols-outlined">linear_scale</span>
            <span>Breadcrumb Studio</span>
          </div>

          <div class="meta-input-group">
            <label class="meta-label">Template Name</label>
            <input
              type="text"
              class="meta-input"
              [(ngModel)]="templateName"
              placeholder="e.g. Modern Breadcrumb Page Banner"
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
              placeholder="e.g. Centered page banner with responsive dynamic breadcrumb trail and background imagery"
            />
          </div>
        </div>

        <div class="meta-right">
          <button
            type="button"
            class="btn-save-template"
            [disabled]="isSaving"
            (click)="saveBreadcrumbTemplate()"
          >
            <span class="material-symbols-outlined" *ngIf="!isSaving">check_circle</span>
            <span class="material-symbols-outlined spin" *ngIf="isSaving">sync</span>
            <span>{{ isSaving ? 'Saving...' : (isEditMode ? 'Update Breadcrumb' : 'Save Breadcrumb') }}</span>
          </button>
        </div>
      </div>

      <!-- Core Reusable Visual Editor with Div and CSS Folding -->
      <app-visual-editor
        [category]="'breadcrumb'"
        [categoryName]="'Breadcrumb Header'"
        [htmlTemplate]="htmlTemplate"
        [cssStyles]="cssStyles"
        [jsScript]="jsScript"
        [sampleContent]="sampleContent"
        [specificTokens]="breadcrumbTokens"
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
      background-color: rgba(14, 165, 233, 0.12);
      border: 1px solid rgba(14, 165, 233, 0.25);
      color: #38bdf8;
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
        border-color: #38bdf8;
        box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.2);
      }
    }

    .code-input {
      min-width: 150px;
      color: #38bdf8;
      font-family: 'Fira Code', monospace;
      background-color: rgba(15, 23, 42, 0.6);
    }

    .btn-save-template {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 20px;
      background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
      color: #ffffff;
      border: none;
      border-radius: 8px;
      font-size: 13.5px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(2, 132, 199, 0.3);
      transition: all 0.15s ease;

      span.material-symbols-outlined { font-size: 18px; }

      &:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 6px 16px rgba(2, 132, 199, 0.45);
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
export class BreadcrumbVisualComponent implements OnInit {
  @Input() isEditMode: boolean = false;
  @Input() existingTemplateId?: string;
  @Input() editorTokens: any = null;
  @Output() templateSaved = new EventEmitter<any>();

  templateName: string = 'Modern Breadcrumb Page Banner';
  variantCode: string = '';
  description: string = 'Centered page header banner with responsive dynamic breadcrumb trail and background imagery';
  isSaving: boolean = false;

  htmlTemplate: string = `<section class="oz-breadcrumb-banner" style="background-image: url('{{ BackgroundImageUrl }}');">
  <div class="oz-breadcrumb-overlay"></div>
  <div class="oz-breadcrumb-container">
    <h1 class="oz-breadcrumb-title">{{ Title }}</h1>
    <p class="oz-breadcrumb-subtitle">{{ SubTitle }}</p>
    <nav class="oz-breadcrumb-nav" aria-label="breadcrumb">
      <ol class="oz-breadcrumb-list">
        {{#each Breadcrumbs}}
          <li class="oz-breadcrumb-item {{#if IsActive}}active{{/if}}">
            {{#if Url}}<a href="{{ Url }}" class="oz-breadcrumb-link">{{ Title }}</a>{{else}}<span>{{ Title }}</span>{{/if}}
          </li>
        {{/each}}
      </ol>
    </nav>
  </div>
</section>`;

  cssStyles: string = `.oz-breadcrumb-banner {
  position: relative;
  min-height: 240px;
  background-size: cover;
  background-position: center;
  background-color: #0f172a;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.oz-breadcrumb-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.75);
}
.oz-breadcrumb-container {
  position: relative;
  z-index: 2;
  text-align: center;
  max-width: 900px;
  margin: 0 auto;
}
.oz-breadcrumb-title {
  font-size: 36px;
  font-weight: 900;
  color: #ffffff;
  margin: 0 0 10px 0;
  letter-spacing: -0.02em;
}
.oz-breadcrumb-subtitle {
  font-size: 15px;
  color: #94a3b8;
  margin: 0 0 24px 0;
  line-height: 1.5;
}
.oz-breadcrumb-list {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  list-style: none;
  padding: 0;
  margin: 0;
  gap: 8px;
  flex-wrap: wrap;
}
.oz-breadcrumb-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #94a3b8;
}
.oz-breadcrumb-item + .oz-breadcrumb-item::before {
  content: '/';
  color: #64748b;
  font-size: 12px;
}
.oz-breadcrumb-link {
  color: #cbd5e1;
  text-decoration: none;
  transition: color 0.2s ease;
}
.oz-breadcrumb-link:hover {
  color: #ffffff;
}
.oz-breadcrumb-item.active {
  color: #38bdf8;
  font-weight: 700;
}`;

  jsScript: string = '';

  breadcrumbTokens: Array<{ label: string; token: string }> = [
    { label: 'Title', token: '{{ Title }}' },
    { label: 'SubTitle', token: '{{ SubTitle }}' },
    { label: 'BackgroundImageUrl', token: '{{ BackgroundImageUrl }}' },
    { label: 'Breadcrumbs Loop', token: '{{#each Breadcrumbs}}\n  <li class="oz-breadcrumb-item {{#if IsActive}}active{{/if}}">\n    {{#if Url}}<a href="{{ Url }}" class="oz-breadcrumb-link">{{ Title }}</a>{{else}}<span>{{ Title }}</span>{{/if}}\n  </li>\n{{/each}}' }
  ];

  sampleContent: any = {
    title: 'Enterprise Architecture & Cloud Solutions',
    subTitle: 'Discover our cloud migration, microservices, and enterprise consulting frameworks.',
    backgroundImageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
    breadcrumbs: [
      { title: 'Home', url: '/' },
      { title: 'Solutions', url: '/solutions' },
      { title: 'Enterprise Architecture', url: '', isActive: true }
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
    this.variantCode = `BCRUMB_${randomSuffix}`;
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
        this.toast.error('Failed to load existing Breadcrumb template.');
      }
    });
  }

  saveBreadcrumbTemplate(): void {
    const name = (this.templateName || '').trim();
    if (!name) {
      this.toast.warning('Please enter a template name.');
      return;
    }

    this.isSaving = true;
    const payload = {
      name,
      category: 'breadcrumb',
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
            ? `Successfully updated Breadcrumb template "${name}".`
            : `Successfully created Breadcrumb template "${name}".`
        );
        this.templateSaved.emit(res?.data || res);
      },
      error: (err: any) => {
        this.isSaving = false;
        const msg = err?.error?.message || err?.message || 'Failed to save Breadcrumb template.';
        this.toast.error(`Save error: ${msg}`);
      }
    });
  }
}
