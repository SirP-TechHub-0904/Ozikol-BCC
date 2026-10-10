import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../../../core/services/api.service';
import { ToastService } from '../../../../../../core/services/toast.service';
import { VisualEditorComponent } from '../../visual-editor/visual-editor.component';

/**
 * Dedicated visual editor component for creating and editing Hero Section templates.
 * Enforces pure scoped CSS, dynamic headline, dual CTAs, media, and Monaco code folding.
 */
@Component({
  selector: 'app-hero-visual',
  standalone: true,
  imports: [CommonModule, FormsModule, VisualEditorComponent],
  template: `
    <div class="category-visual-layout">
      <!-- Category Meta Bar: Name, Variant Code, Description, and Save Action -->
      <div class="category-meta-bar">
        <div class="meta-left">
          <div class="category-badge">
            <span class="material-symbols-outlined">view_headline</span>
            <span>Hero Studio</span>
          </div>

          <div class="meta-input-group">
            <label class="meta-label">Template Name</label>
            <input
              type="text"
              class="meta-input"
              [(ngModel)]="templateName"
              placeholder="e.g. Quantum Split Showcase Hero"
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
              placeholder="e.g. Split hero showcase with bold headline, dual CTAs, badge, and media"
            />
          </div>
        </div>

        <div class="meta-right">
          <button
            type="button"
            class="btn-save-template"
            [disabled]="isSaving"
            (click)="saveHeroTemplate()"
          >
            <span class="material-symbols-outlined" *ngIf="!isSaving">check_circle</span>
            <span class="material-symbols-outlined spin" *ngIf="isSaving">sync</span>
            <span>{{ isSaving ? 'Saving...' : (isEditMode ? 'Update Hero' : 'Save Hero') }}</span>
          </button>
        </div>
      </div>

      <!-- Core Reusable Visual Editor with Div and CSS Folding -->
      <app-visual-editor
        [category]="'hero'"
        [categoryName]="'Hero Showcase'"
        [htmlTemplate]="htmlTemplate"
        [cssStyles]="cssStyles"
        [jsScript]="jsScript"
        [sampleContent]="sampleContent"
        [specificTokens]="heroTokens"
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
      background-color: rgba(99, 102, 241, 0.12);
      border: 1px solid rgba(99, 102, 241, 0.25);
      color: #818cf8;
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
        border-color: #818cf8;
        box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
      }
    }

    .code-input {
      min-width: 150px;
      color: #818cf8;
      font-family: 'Fira Code', monospace;
      background-color: rgba(15, 23, 42, 0.6);
    }

    .btn-save-template {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 20px;
      background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%);
      color: #ffffff;
      border: none;
      border-radius: 8px;
      font-size: 13.5px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
      transition: all 0.15s ease;

      span.material-symbols-outlined { font-size: 18px; }

      &:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 6px 16px rgba(79, 70, 229, 0.45);
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
export class HeroVisualComponent implements OnInit {
  @Input() isEditMode: boolean = false;
  @Input() existingTemplateId?: string;
  @Input() editorTokens: any = null;
  @Output() templateSaved = new EventEmitter<any>();

  templateName: string = 'Quantum Split Showcase Hero';
  variantCode: string = '';
  description: string = 'Split hero showcase with bold headline, dual CTAs, badge, and media';
  isSaving: boolean = false;

  htmlTemplate: string = `<section class="oz-hero-section">
  <div class="oz-hero-container">
    <div class="oz-hero-content">
      <span class="oz-hero-badge">{{ MiniTitle }}</span>
      <h1 class="oz-hero-title">{{ Title }}</h1>
      <p class="oz-hero-desc">{{ Description }}</p>
      <div class="oz-hero-actions">
        {{#if ButtonText}}
        <a href="{{ ButtonLink }}" class="oz-btn-primary">{{ ButtonText }}</a>
        {{/if}}
        {{#if SecondaryButtonText}}
        <a href="{{ SecondaryButtonLink }}" class="oz-btn-secondary">{{ SecondaryButtonText }}</a>
        {{/if}}
      </div>
    </div>
    <div class="oz-hero-media">
      <img src="{{ ImageUrl }}" alt="{{ Title }}" class="oz-hero-img" />
    </div>
  </div>
</section>`;

  cssStyles: string = `.oz-hero-section {
  padding: 88px 24px;
  background: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  overflow: hidden;
}
.oz-hero-container {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1.15fr 0.85fr;
  gap: 56px;
  align-items: center;
}
.oz-hero-badge {
  display: inline-block;
  background: #eef2ff;
  color: #0050e5;
  font-size: 11px;
  font-weight: 800;
  padding: 5px 14px;
  border-radius: 20px;
  margin-bottom: 16px;
  letter-spacing: 0.5px;
}
.oz-hero-title {
  font-size: 46px;
  font-weight: 900;
  line-height: 1.15;
  color: #0f172a;
  margin: 0 0 18px 0;
  letter-spacing: -0.025em;
}
.oz-hero-desc {
  font-size: 16px;
  color: #475569;
  line-height: 1.6;
  margin: 0 0 32px 0;
  max-width: 540px;
}
.oz-hero-actions {
  display: flex;
  gap: 14px;
  align-items: center;
  flex-wrap: wrap;
}
.oz-btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 28px;
  background: #0050e5;
  color: #ffffff;
  font-weight: 700;
  font-size: 14px;
  border-radius: 8px;
  text-decoration: none;
  transition: all 0.2s ease;
  box-shadow: 0 4px 14px rgba(0, 80, 229, 0.3);
}
.oz-btn-primary:hover {
  background: #003db3;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 80, 229, 0.4);
}
.oz-btn-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 28px;
  background: #f8fafc;
  color: #0f172a;
  font-weight: 700;
  font-size: 14px;
  border-radius: 8px;
  text-decoration: none;
  border: 1.5px solid #cbd5e1;
  transition: all 0.2s ease;
}
.oz-btn-secondary:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
}
.oz-hero-img {
  width: 100%;
  max-height: 420px;
  object-fit: cover;
  border-radius: 16px;
  box-shadow: 0 20px 45px -10px rgba(15, 23, 42, 0.15), 0 0 0 1px rgba(15, 23, 42, 0.05);
}
@media (max-width: 900px) {
  .oz-hero-section { padding: 60px 20px; }
  .oz-hero-container { grid-template-columns: 1fr; gap: 36px; text-align: center; }
  .oz-hero-title { font-size: 34px; }
  .oz-hero-actions { justify-content: center; }
}
@media (max-width: 480px) {
  .oz-hero-section { padding: 44px 16px; }
  .oz-hero-title { font-size: 26px; }
  .oz-hero-desc { font-size: 14px; margin-bottom: 24px; }
  .oz-hero-actions { flex-direction: column; width: 100%; }
  .oz-btn-primary, .oz-btn-secondary { width: 100%; text-align: center; box-sizing: border-box; }
}`;

  jsScript: string = '';

  heroTokens: Array<{ label: string; token: string }> = [
    { label: 'Title', token: '{{ Title }}' },
    { label: 'MiniTitle', token: '{{ MiniTitle }}' },
    { label: 'Description', token: '{{ Description }}' },
    { label: 'ButtonText', token: '{{ ButtonText }}' },
    { label: 'ButtonLink', token: '{{ ButtonLink }}' },
    { label: 'SecondaryButtonText', token: '{{ SecondaryButtonText }}' },
    { label: 'SecondaryButtonLink', token: '{{ SecondaryButtonLink }}' },
    { label: 'ImageUrl', token: '{{ ImageUrl }}' },
    { label: 'SecondImageUrl', token: '{{ SecondImageUrl }}' },
    { label: 'VideoLink', token: '{{ VideoLink }}' }
  ];

  sampleContent: any = {
    title: 'Scale Your Digital Infrastructure With Unrivaled Speed',
    miniTitle: 'ENTERPRISE CLOUD PLATFORM',
    description: 'Deploy mission-critical workloads, orchestrate multi-cloud pipelines, and protect customer assets with sub-millisecond resilience.',
    buttonText: 'Get Started Free',
    buttonLink: '#signup',
    secondaryButtonText: 'Explore Platform',
    secondaryButtonLink: '#features',
    imageUrl: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&auto=format&fit=crop&q=80'
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
    this.variantCode = `HERO_${randomSuffix}`;
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
        this.toast.error('Failed to load existing Hero template.');
      }
    });
  }

  saveHeroTemplate(): void {
    const name = (this.templateName || '').trim();
    if (!name) {
      this.toast.warning('Please enter a template name.');
      return;
    }

    this.isSaving = true;
    const payload = {
      name,
      category: 'hero',
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
            ? `Successfully updated Hero template "${name}".`
            : `Successfully created Hero template "${name}".`
        );
        this.templateSaved.emit(res?.data || res);
      },
      error: (err: any) => {
        this.isSaving = false;
        const msg = err?.error?.message || err?.message || 'Failed to save Hero template.';
        this.toast.error(`Save error: ${msg}`);
      }
    });
  }
}
