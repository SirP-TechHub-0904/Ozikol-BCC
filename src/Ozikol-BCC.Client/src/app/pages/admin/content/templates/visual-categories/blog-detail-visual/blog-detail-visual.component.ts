import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../../../core/services/api.service';
import { ToastService } from '../../../../../../core/services/toast.service';
import { VisualEditorComponent } from '../../visual-editor/visual-editor.component';

/**
 * Dedicated visual editor component for creating and editing Blog Article Detail templates.
 * Enforces editorial header layout, cover banner, rich prose typography, author bio card,
 * article tags pill cloud, and related article dispatches.
 */
@Component({
  selector: 'app-blog-detail-visual',
  standalone: true,
  imports: [CommonModule, FormsModule, VisualEditorComponent],
  template: `
    <div class="category-visual-layout">
      <!-- Category Meta Bar: Name, Variant Code, Description, and Save Action -->
      <div class="category-meta-bar">
        <div class="meta-left">
          <div class="category-badge">
            <span class="material-symbols-outlined">article</span>
            <span>Article Detail Studio</span>
          </div>

          <div class="meta-input-group">
            <label class="meta-label">Template Name</label>
            <input
              type="text"
              class="meta-input"
              [(ngModel)]="templateName"
              placeholder="e.g. Apex Editorial Article Detail With Author Card"
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
              placeholder="e.g. In-depth editorial article layout with author bio card, tag taxonomy, and related readings"
            />
          </div>
        </div>

        <div class="meta-right">
          <button
            type="button"
            class="btn-save-template"
            [disabled]="isSaving"
            (click)="saveBlogDetailTemplate()"
          >
            <span class="material-symbols-outlined" *ngIf="!isSaving">check_circle</span>
            <span class="material-symbols-outlined spin" *ngIf="isSaving">sync</span>
            <span>{{ isSaving ? 'Saving...' : (isEditMode ? 'Update Article Detail' : 'Save Article Detail') }}</span>
          </button>
        </div>
      </div>

      <!-- Core Reusable Visual Editor with Div and CSS Folding -->
      <app-visual-editor
        [category]="'blog_detail'"
        [categoryName]="'Blog Detail'"
        [htmlTemplate]="htmlTemplate"
        [cssStyles]="cssStyles"
        [jsScript]="jsScript"
        [sampleContent]="sampleContent"
        [specificTokens]="articleTokens"
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
      background-color: rgba(168, 85, 247, 0.12);
      border: 1px solid rgba(168, 85, 247, 0.25);
      color: #c084fc;
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
        border-color: #c084fc;
        box-shadow: 0 0 0 2px rgba(168, 85, 247, 0.2);
      }
    }

    .code-input {
      min-width: 150px;
      color: #c084fc;
      font-family: 'Fira Code', monospace;
      background-color: rgba(15, 23, 42, 0.6);
    }

    .btn-save-template {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 20px;
      background: linear-gradient(135deg, #9333ea 0%, #7e22ce 100%);
      color: #ffffff;
      border: none;
      border-radius: 8px;
      font-size: 13.5px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(147, 51, 234, 0.3);
      transition: all 0.15s ease;

      span.material-symbols-outlined { font-size: 18px; }

      &:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 6px 16px rgba(147, 51, 234, 0.45);
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
export class BlogDetailVisualComponent implements OnInit {
  @Input() isEditMode: boolean = false;
  @Input() existingTemplateId?: string;
  @Input() editorTokens: any = null;
  @Output() templateSaved = new EventEmitter<any>();

  templateName: string = 'Apex Editorial Article Detail With Author Card';
  variantCode: string = '';
  description: string = 'In-depth editorial article layout with author bio card, tag taxonomy, and related readings';
  isSaving: boolean = false;

  htmlTemplate: string = `<article class="oz-article-container">
  <header class="oz-article-header">
    <div class="oz-article-kicker">
      <span class="oz-category-badge">{{ Category }}</span>
      <span class="oz-publish-date">{{ PublishedDate }}</span>
    </div>
    <h1 class="oz-article-headline">{{ Title }}</h1>
    <p class="oz-article-lead">{{ Summary }}</p>

    <div class="oz-author-strip">
      <img src="{{ AuthorAvatarUrl }}" alt="{{ AuthorName }}" class="oz-author-avatar" />
      <div class="oz-author-info">
        <span class="oz-author-name">{{ AuthorName }}</span>
        <span class="oz-author-role">{{ AuthorRole }}</span>
      </div>
    </div>
  </header>

  <div class="oz-article-cover">
    <img src="{{ ImageUrl }}" alt="{{ Title }}" class="oz-cover-image" />
  </div>

  <div class="oz-article-layout">
    <div class="oz-article-body">
      {{{ FullDescription }}}

      <div class="oz-article-tags">
        <span class="oz-tags-label">Tags:</span>
        {{#each Tags}}
        <a href="{{ Url }}" class="oz-tag-pill">{{ Name }}</a>
        {{/each}}
      </div>

      <div class="oz-author-bio-card">
        <img src="{{ AuthorAvatarUrl }}" alt="{{ AuthorName }}" class="oz-bio-avatar" />
        <div class="oz-bio-details">
          <h4 class="oz-bio-name">About {{ AuthorName }}</h4>
          <p class="oz-bio-text">{{ AuthorBio }}</p>
        </div>
      </div>
    </div>

    <aside class="oz-article-sidebar">
      <div class="oz-sidebar-card">
        <h3 class="oz-sidebar-title">Related Dispatches</h3>
        <div class="oz-related-list">
          {{#each RecentArticles}}
          <a href="{{ Url }}" class="oz-related-item">
            <span class="oz-related-date">{{ PublishedDate }}</span>
            <h5 class="oz-related-heading">{{ Title }}</h5>
          </a>
          {{/each}}
        </div>
      </div>
    </aside>
  </div>
</article>`;

  cssStyles: string = `.oz-article-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 60px 24px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.oz-article-header {
  max-width: 820px;
  margin: 0 auto 36px auto;
  text-align: center;
}
.oz-article-kicker {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 18px;
}
.oz-category-badge {
  background: #eef2ff;
  color: #0050e5;
  font-size: 11px;
  font-weight: 800;
  padding: 4px 12px;
  border-radius: 14px;
  text-transform: uppercase;
  letter-spacing: 0.6px;
}
.oz-publish-date {
  font-size: 13px;
  color: #64748b;
}
.oz-article-headline {
  font-size: 38px;
  font-weight: 900;
  color: #0f172a;
  line-height: 1.25;
  margin: 0 0 16px 0;
  letter-spacing: -0.025em;
}
.oz-article-lead {
  font-size: 18px;
  color: #475569;
  line-height: 1.6;
  margin: 0 0 28px 0;
}
.oz-author-strip {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  padding: 8px 18px;
  border-radius: 40px;
}
.oz-author-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
}
.oz-author-info {
  display: flex;
  flex-direction: column;
  text-align: left;
}
.oz-author-name {
  font-size: 13px;
  font-weight: 800;
  color: #0f172a;
}
.oz-author-role {
  font-size: 11px;
  color: #64748b;
}
.oz-article-cover {
  max-width: 1040px;
  margin: 0 auto 48px auto;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);
}
.oz-cover-image {
  width: 100%;
  height: auto;
  display: block;
}
.oz-article-layout {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 56px;
  max-width: 1040px;
  margin: 0 auto;
}
.oz-article-body {
  font-size: 16px;
  line-height: 1.8;
  color: #334155;
}
.oz-article-body p {
  margin: 0 0 24px 0;
}
.oz-article-body h2 {
  font-size: 24px;
  font-weight: 800;
  color: #0f172a;
  margin: 40px 0 16px 0;
  letter-spacing: -0.015em;
}
.oz-article-tags {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding-top: 24px;
  border-top: 1px solid #e2e8f0;
  margin: 36px 0;
}
.oz-tags-label {
  font-size: 13px;
  font-weight: 700;
  color: #64748b;
}
.oz-tag-pill {
  background: #f1f5f9;
  color: #475569;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 6px;
  text-decoration: none;
  transition: all 0.2s;
}
.oz-tag-pill:hover {
  background: #0050e5;
  color: #ffffff;
}
.oz-author-bio-card {
  display: flex;
  gap: 20px;
  background: #f8fafc;
  border: 1.5px solid #e2e8f0;
  border-radius: 14px;
  padding: 24px;
  margin-top: 40px;
}
.oz-bio-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}
.oz-bio-name {
  font-size: 16px;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 6px 0;
}
.oz-bio-text {
  font-size: 13.5px;
  color: #64748b;
  line-height: 1.6;
  margin: 0;
}
.oz-article-sidebar {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.oz-sidebar-card {
  background: #ffffff;
  border: 1.5px solid #e2e8f0;
  border-radius: 14px;
  padding: 24px;
}
.oz-sidebar-title {
  font-size: 15px;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 16px 0;
  padding-bottom: 12px;
  border-bottom: 1px solid #f1f5f9;
}
.oz-related-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.oz-related-item {
  text-decoration: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.oz-related-date {
  font-size: 11px;
  color: #94a3b8;
  font-weight: 600;
}
.oz-related-heading {
  font-size: 13.5px;
  font-weight: 700;
  color: #1e293b;
  line-height: 1.4;
  margin: 0;
  transition: color 0.2s;
}
.oz-related-item:hover .oz-related-heading {
  color: #0050e5;
}
@media (max-width: 900px) {
  .oz-article-layout { grid-template-columns: 1fr; }
  .oz-article-headline { font-size: 28px; }
  .oz-article-container { padding: 40px 16px; }
}`;

  jsScript: string = '';

  articleTokens: Array<{ label: string; token: string }> = [
    { label: 'Title', token: '{{ Title }}' },
    { label: 'Summary', token: '{{ Summary }}' },
    { label: 'Full Description', token: '{{{ FullDescription }}}' },
    { label: 'Category', token: '{{ Category }}' },
    { label: 'Published Date', token: '{{ PublishedDate }}' },
    { label: 'Cover Image', token: '{{ ImageUrl }}' },
    { label: 'Author Name', token: '{{ AuthorName }}' },
    { label: 'Author Role', token: '{{ AuthorRole }}' },
    { label: 'Author Bio', token: '{{ AuthorBio }}' },
    { label: 'Author Avatar', token: '{{ AuthorAvatarUrl }}' },
    { label: 'Tags Loop', token: '{{#each Tags}}\n  <a href="{{ Url }}">{{ Name }}</a>\n{{/each}}' },
    { label: 'Recent Articles', token: '{{#each RecentArticles}}\n  <a href="{{ Url }}">\n    <span>{{ PublishedDate }}</span>\n    <h5>{{ Title }}</h5>\n  </a>\n{{/each}}' }
  ];

  sampleContent: any = {
    title: 'Architecting Distributed Consensus Across Multi-Region Kubernetes Clusters',
    summary: 'A deep examination into Raft state replication, Byzantine fault mitigation, and achieving sub-10ms failover without ledger divergence.',
    fullDescription: `<p>Distributed applications running across autonomous cloud regions face severe physical constraints: speed of light latency across oceans, transit network partitions, and unpredictable container lifecycle evictions.</p>
<h2>The Core Consensus Challenge</h2>
<p>When nodes cannot coordinate instantly, split-brain scenarios emerge unless a quorum is strictly maintained. By deploying deterministic leader election algorithms coupled with distributed raft logs, each regional node guarantees strict linearizability.</p>
<h2>Achieving Zero Data Loss</h2>
<p>Through our proactive heartbeat telemetry and automatic ephemeral key rotation, stale partitions are isolated within 250 milliseconds, ensuring zero transactional loss during unplanned outages.</p>`,
    category: 'Architecture',
    publishedDate: 'October 10, 2026',
    imageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
    authorName: 'Dr. Evelyn Martinez',
    authorRole: 'Principal Systems Architect',
    authorBio: 'Dr. Martinez leads distributed infrastructure research at Ozikol Technologies, focusing on planetary data pipelines and fault tolerance.',
    authorAvatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    tags: [
      { name: 'Kubernetes', url: '/blog/tags/kubernetes' },
      { name: 'Distributed Systems', url: '/blog/tags/distributed' },
      { name: 'Consensus', url: '/blog/tags/consensus' },
      { name: 'Raft', url: '/blog/tags/raft' }
    ],
    recentArticles: [
      {
        title: 'Zero Trust Network Architecture for Modern Web Apps',
        publishedDate: 'October 2, 2026',
        url: '/blog/zero-trust-network-architecture'
      },
      {
        title: 'Optimizing V8 Garbage Collection for Real-Time Dashboards',
        publishedDate: 'September 24, 2026',
        url: '/blog/optimizing-v8-garbage-collection'
      }
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
    this.variantCode = `ARTICLE_${randomSuffix}`;
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
        this.toast.error('Failed to load existing Blog Detail template.');
      }
    });
  }

  saveBlogDetailTemplate(): void {
    const name = (this.templateName || '').trim();
    if (!name) {
      this.toast.warning('Please enter a template name.');
      return;
    }

    this.isSaving = true;
    const payload = {
      name,
      category: 'blog_detail',
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
            ? `Successfully updated Article Detail template "${name}".`
            : `Successfully created Article Detail template "${name}".`
        );
        this.templateSaved.emit(res?.data || res);
      },
      error: (err: any) => {
        this.isSaving = false;
        const msg = err?.error?.message || err?.message || 'Failed to save Article Detail template.';
        this.toast.error(`Save error: ${msg}`);
      }
    });
  }
}
