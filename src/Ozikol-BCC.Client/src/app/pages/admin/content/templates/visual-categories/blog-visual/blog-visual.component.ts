import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../../../core/services/api.service';
import { ToastService } from '../../../../../../core/services/toast.service';
import { VisualEditorComponent } from '../../visual-editor/visual-editor.component';

/**
 * Dedicated visual editor component for creating and editing Blog Feed / Article Grid templates.
 * Enforces responsive multi-column article cards, category badges, publication dates, author metadata,
 * and category/tag navigation loops.
 */
@Component({
  selector: 'app-blog-visual',
  standalone: true,
  imports: [CommonModule, FormsModule, VisualEditorComponent],
  template: `
    <div class="category-visual-layout">
      <!-- Category Meta Bar: Name, Variant Code, Description, and Save Action -->
      <div class="category-meta-bar">
        <div class="meta-left">
          <div class="category-badge">
            <span class="material-symbols-outlined">rss_feed</span>
            <span>Blog Feed Studio</span>
          </div>

          <div class="meta-input-group">
            <label class="meta-label">Template Name</label>
            <input
              type="text"
              class="meta-input"
              [(ngModel)]="templateName"
              placeholder="e.g. Apex 3-Column Blog Card Grid"
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
              placeholder="e.g. Modern three-column blog article index with category filters, cover images, and author credits"
            />
          </div>
        </div>

        <div class="meta-right">
          <button
            type="button"
            class="btn-save-template"
            [disabled]="isSaving"
            (click)="saveBlogTemplate()"
          >
            <span class="material-symbols-outlined" *ngIf="!isSaving">check_circle</span>
            <span class="material-symbols-outlined spin" *ngIf="isSaving">sync</span>
            <span>{{ isSaving ? 'Saving...' : (isEditMode ? 'Update Blog Feed' : 'Save Blog Feed') }}</span>
          </button>
        </div>
      </div>

      <!-- Core Reusable Visual Editor with Div and CSS Folding -->
      <app-visual-editor
        [category]="'blog'"
        [categoryName]="'Blog Feed'"
        [htmlTemplate]="htmlTemplate"
        [cssStyles]="cssStyles"
        [jsScript]="jsScript"
        [sampleContent]="sampleContent"
        [specificTokens]="blogTokens"
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
      background-color: rgba(236, 72, 153, 0.12);
      border: 1px solid rgba(236, 72, 153, 0.25);
      color: #f472b6;
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
        border-color: #f472b6;
        box-shadow: 0 0 0 2px rgba(236, 72, 153, 0.2);
      }
    }

    .code-input {
      min-width: 150px;
      color: #f472b6;
      font-family: 'Fira Code', monospace;
      background-color: rgba(15, 23, 42, 0.6);
    }

    .btn-save-template {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 20px;
      background: linear-gradient(135deg, #db2777 0%, #be185d 100%);
      color: #ffffff;
      border: none;
      border-radius: 8px;
      font-size: 13.5px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(219, 39, 119, 0.3);
      transition: all 0.15s ease;

      span.material-symbols-outlined { font-size: 18px; }

      &:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 6px 16px rgba(219, 39, 119, 0.45);
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
export class BlogVisualComponent implements OnInit {
  @Input() isEditMode: boolean = false;
  @Input() existingTemplateId?: string;
  @Input() editorTokens: any = null;
  @Output() templateSaved = new EventEmitter<any>();

  templateName: string = 'Apex 3-Column Blog Card Grid';
  variantCode: string = '';
  description: string = 'Modern three-column blog article index with category filters, cover images, and author credits';
  isSaving: boolean = false;

  htmlTemplate: string = `<section class="oz-blog-section">
  <div class="oz-blog-header">
    <span class="oz-blog-kicker">{{ MiniTitle }}</span>
    <h2 class="oz-blog-title">{{ Title }}</h2>
    <p class="oz-blog-desc">{{ Description }}</p>
  </div>

  <div class="oz-articles-grid">
    {{#each Articles}}
    <article class="oz-article-card">
      <div class="oz-card-media">
        <img src="{{ CoverImageUrl }}" alt="{{ Title }}" class="oz-card-img" />
        <span class="oz-card-category">{{ Category }}</span>
      </div>
      <div class="oz-card-content">
        <div class="oz-card-meta">
          <span class="oz-card-date">{{ PublishedDate }}</span>
          <span class="oz-meta-bullet">&bull;</span>
          <span class="oz-card-author">{{ AuthorName }}</span>
        </div>
        <h3 class="oz-card-title">
          <a href="{{ Url }}" class="oz-card-title-link">{{ Title }}</a>
        </h3>
        <p class="oz-card-summary">{{ Summary }}</p>
        <div class="oz-card-footer">
          <a href="{{ Url }}" class="oz-card-read-more">
            Read Article
            <span class="material-symbols-outlined">arrow_forward</span>
          </a>
        </div>
      </div>
    </article>
    {{/each}}
  </div>
</section>`;

  cssStyles: string = `.oz-blog-section {
  padding: 72px 24px;
  background: #f8fafc;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.oz-blog-header {
  max-width: 760px;
  margin: 0 auto 52px auto;
  text-align: center;
}
.oz-blog-kicker {
  display: inline-block;
  background: #eef2ff;
  color: #0050e5;
  font-size: 11px;
  font-weight: 800;
  padding: 4px 12px;
  border-radius: 16px;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.8px;
}
.oz-blog-title {
  font-size: 34px;
  font-weight: 900;
  color: #0f172a;
  margin: 0 0 14px 0;
  letter-spacing: -0.02em;
}
.oz-blog-desc {
  font-size: 16px;
  color: #64748b;
  line-height: 1.6;
  margin: 0;
}
.oz-articles-grid {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 32px;
}
.oz-article-card {
  background: #ffffff;
  border: 1.5px solid #e2e8f0;
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: all 0.25s ease;
}
.oz-article-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
  border-color: #cbd5e1;
}
.oz-card-media {
  position: relative;
  width: 100%;
  height: 200px;
  background: #0f172a;
  overflow: hidden;
}
.oz-card-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}
.oz-article-card:hover .oz-card-img {
  transform: scale(1.04);
}
.oz-card-category {
  position: absolute;
  top: 14px;
  left: 14px;
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(8px);
  color: #ffffff;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  padding: 4px 10px;
  border-radius: 6px;
}
.oz-card-content {
  padding: 24px;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}
.oz-card-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 12px;
}
.oz-meta-bullet {
  font-size: 14px;
}
.oz-card-title {
  font-size: 19px;
  font-weight: 800;
  line-height: 1.4;
  margin: 0 0 10px 0;
}
.oz-card-title-link {
  color: #0f172a;
  text-decoration: none;
  transition: color 0.2s ease;
}
.oz-card-title-link:hover {
  color: #0050e5;
}
.oz-card-summary {
  font-size: 13.5px;
  color: #64748b;
  line-height: 1.55;
  margin: 0 0 20px 0;
  flex-grow: 1;
}
.oz-card-footer {
  margin-top: auto;
  padding-top: 16px;
  border-top: 1px solid #f1f5f9;
}
.oz-card-read-more {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #0050e5;
  font-size: 13px;
  font-weight: 800;
  text-decoration: none;
  transition: gap 0.2s ease;
}
.oz-card-read-more:hover {
  gap: 10px;
}
.oz-card-read-more .material-symbols-outlined {
  font-size: 16px;
}
@media (max-width: 768px) {
  .oz-blog-section { padding: 48px 16px; }
  .oz-articles-grid { grid-template-columns: 1fr; gap: 20px; }
  .oz-blog-title { font-size: 26px; }
}`;

  jsScript: string = '';

  blogTokens: Array<{ label: string; token: string }> = [
    { label: 'Title', token: '{{ Title }}' },
    { label: 'MiniTitle', token: '{{ MiniTitle }}' },
    { label: 'Description', token: '{{ Description }}' },
    { label: 'Articles Loop', token: '{{#each Articles}}\n  <article class="oz-article-card">\n    <img src="{{ CoverImageUrl }}" />\n    <span>{{ Category }}</span>\n    <h3><a href="{{ Url }}">{{ Title }}</a></h3>\n    <p>{{ Summary }}</p>\n    <span>{{ PublishedDate }} - {{ AuthorName }}</span>\n  </article>\n{{/each}}' },
    { label: 'Categories Loop', token: '{{#each BlogCategories}}\n  <a href="{{ Url }}">{{ Name }} ({{ Count }})</a>\n{{/each}}' },
    { label: 'Tags Loop', token: '{{#each Tags}}\n  <a href="{{ Url }}">{{ Name }}</a>\n{{/each}}' },
    { label: 'Newsletter Form', token: '{{ Form "Newsletter_Subscribe" }}' }
  ];

  sampleContent: any = {
    title: 'Insights, Technical Architectures, & Engineering Breakthroughs',
    miniTitle: 'LATEST DISPATCHES',
    description: 'Deep dives from our engineering leads on distributed systems, infrastructure resiliency, and security posture.',
    articles: [
      {
        title: 'Building Resilient Multi-Region Active-Active Systems with Zero Downtime',
        summary: 'How our engineering team eliminated single points of failure across planetary distributed data stores using consensus clustering.',
        category: 'Architecture',
        publishedDate: 'October 8, 2026',
        authorName: 'Alex Thorne',
        url: '/blog/multi-region-zero-downtime',
        coverImageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80'
      },
      {
        title: 'Deep Dive into Sovereign Cloud Telemetry and Real-Time Anomaly Detection',
        summary: 'Inside the mathematical algorithms that scrub sensitive customer data while predicting container memory leaks in real-time.',
        category: 'Observability',
        publishedDate: 'September 29, 2026',
        authorName: 'Sarah Jenkins',
        url: '/blog/sovereign-cloud-telemetry',
        coverImageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80'
      },
      {
        title: 'Migrating Monoliths to Isolated Modular Web Frameworks Cleanly',
        summary: 'Lessons learned decomposing multi-thousand line files into single-responsibility, tree-shakable standalone micro-components.',
        category: 'Frontend',
        publishedDate: 'September 15, 2026',
        authorName: 'David Vance',
        url: '/blog/modular-web-frameworks',
        coverImageUrl: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=800&q=80'
      }
    ],
    blogCategories: [
      { name: 'Architecture', count: 12, url: '/blog/category/architecture' },
      { name: 'Observability', count: 8, url: '/blog/category/observability' },
      { name: 'Frontend', count: 15, url: '/blog/category/frontend' }
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
    this.variantCode = `BLOG_${randomSuffix}`;
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
        this.toast.error('Failed to load existing Blog Feed template.');
      }
    });
  }

  saveBlogTemplate(): void {
    const name = (this.templateName || '').trim();
    if (!name) {
      this.toast.warning('Please enter a template name.');
      return;
    }

    this.isSaving = true;
    const payload = {
      name,
      category: 'blog',
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
            ? `Successfully updated Blog Feed template "${name}".`
            : `Successfully created Blog Feed template "${name}".`
        );
        this.templateSaved.emit(res?.data || res);
      },
      error: (err: any) => {
        this.isSaving = false;
        const msg = err?.error?.message || err?.message || 'Failed to save Blog Feed template.';
        this.toast.error(`Save error: ${msg}`);
      }
    });
  }
}
