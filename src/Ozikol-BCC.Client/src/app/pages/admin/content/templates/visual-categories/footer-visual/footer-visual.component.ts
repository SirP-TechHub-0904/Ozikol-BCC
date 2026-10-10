import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../../../core/services/api.service';
import { ToastService } from '../../../../../../core/services/toast.service';
import { VisualEditorComponent } from '../../visual-editor/visual-editor.component';

/**
 * Dedicated visual editor component for creating and editing Footer templates.
 * Enforces dynamic multi-column link navigation, legal compliance links, social icons,
 * newsletter subscribe block, and brand metadata.
 */
@Component({
  selector: 'app-footer-visual',
  standalone: true,
  imports: [CommonModule, FormsModule, VisualEditorComponent],
  template: `
    <div class="category-visual-layout">
      <!-- Category Meta Bar: Name, Variant Code, Description, and Save Action -->
      <div class="category-meta-bar">
        <div class="meta-left">
          <div class="category-badge">
            <span class="material-symbols-outlined">dock</span>
            <span>Footer Studio</span>
          </div>

          <div class="meta-input-group">
            <label class="meta-label">Template Name</label>
            <input
              type="text"
              class="meta-input"
              [(ngModel)]="templateName"
              placeholder="e.g. Sovereign Enterprise Clean Footer"
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
              placeholder="e.g. Four-column responsive footer with newsletter subscription, legal links, and brand copyright"
            />
          </div>
        </div>

        <div class="meta-right">
          <button
            type="button"
            class="btn-save-template"
            [disabled]="isSaving"
            (click)="saveFooterTemplate()"
          >
            <span class="material-symbols-outlined" *ngIf="!isSaving">check_circle</span>
            <span class="material-symbols-outlined spin" *ngIf="isSaving">sync</span>
            <span>{{ isSaving ? 'Saving...' : (isEditMode ? 'Update Footer' : 'Save Footer') }}</span>
          </button>
        </div>
      </div>

      <!-- Core Reusable Visual Editor with Div and CSS Folding -->
      <app-visual-editor
        [category]="'footer'"
        [categoryName]="'Footer'"
        [htmlTemplate]="htmlTemplate"
        [cssStyles]="cssStyles"
        [jsScript]="jsScript"
        [sampleContent]="sampleContent"
        [specificTokens]="footerTokens"
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
      background-color: rgba(245, 158, 11, 0.12);
      border: 1px solid rgba(245, 158, 11, 0.25);
      color: #fbbf24;
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
        border-color: #fbbf24;
        box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2);
      }
    }

    .code-input {
      min-width: 150px;
      color: #fbbf24;
      font-family: 'Fira Code', monospace;
      background-color: rgba(15, 23, 42, 0.6);
    }

    .btn-save-template {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 20px;
      background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
      color: #ffffff;
      border: none;
      border-radius: 8px;
      font-size: 13.5px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(217, 119, 6, 0.3);
      transition: all 0.15s ease;

      span.material-symbols-outlined { font-size: 18px; }

      &:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 6px 16px rgba(217, 119, 6, 0.45);
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
export class FooterVisualComponent implements OnInit {
  @Input() isEditMode: boolean = false;
  @Input() existingTemplateId?: string;
  @Input() editorTokens: any = null;
  @Output() templateSaved = new EventEmitter<any>();

  templateName: string = 'Sovereign Enterprise Clean Footer';
  variantCode: string = '';
  description: string = 'Four-column responsive footer with newsletter subscription, legal links, and brand copyright';
  isSaving: boolean = false;

  htmlTemplate: string = `<footer class="oz-footer-wrapper">
  <div class="oz-footer-container">
    <div class="oz-footer-top">
      <div class="oz-footer-brand-col">
        <a href="/" class="oz-footer-brand">
          <span class="oz-brand-name">{{ BrandName }}</span>
        </a>
        <p class="oz-footer-desc">{{ Description }}</p>
        <div class="oz-footer-socials">
          {{#each SocialLinks}}
          <a href="{{ Url }}" class="oz-social-link" target="_blank" rel="noopener noreferrer" title="{{ Platform }}">
            <span class="material-symbols-outlined">{{ Icon }}</span>
          </a>
          {{/each}}
        </div>
      </div>

      <div class="oz-footer-nav-grid">
        {{#each FooterCategories}}
        <div class="oz-footer-col">
          <h4 class="oz-footer-heading">{{ Title }}</h4>
          <ul class="oz-footer-links">
            {{#each Pages}}
            <li>
              <a href="{{ Url }}" class="oz-footer-link">{{ Title }}</a>
            </li>
            {{/each}}
          </ul>
        </div>
        {{/each}}
      </div>
    </div>

    <div class="oz-footer-bottom">
      <div class="oz-footer-legal-copy">
        <span class="oz-copyright">&copy; {{ Year }} {{ Copyright }}. All rights reserved.</span>
        <span class="oz-powered-by">Powered by {{ PoweredBy }}</span>
      </div>
      <div class="oz-footer-legal-links">
        {{#each LegalPages}}
        <a href="{{ Url }}" class="oz-legal-link">{{ Title }}</a>
        {{/each}}
      </div>
    </div>
  </div>
</footer>`;

  cssStyles: string = `.oz-footer-wrapper {
  background: #0f172a;
  color: #94a3b8;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  padding: 64px 24px 32px 24px;
}
.oz-footer-container {
  max-width: 1200px;
  margin: 0 auto;
}
.oz-footer-top {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 48px;
  padding-bottom: 48px;
  border-bottom: 1px solid #1e293b;
}
.oz-footer-brand-col {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.oz-footer-brand {
  text-decoration: none;
  display: inline-flex;
  align-items: center;
}
.oz-brand-name {
  font-size: 22px;
  font-weight: 900;
  color: #ffffff;
  letter-spacing: -0.02em;
}
.oz-footer-desc {
  font-size: 14px;
  line-height: 1.6;
  color: #94a3b8;
  margin: 0;
}
.oz-footer-socials {
  display: flex;
  gap: 10px;
  margin-top: 8px;
}
.oz-social-link {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: #1e293b;
  color: #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  transition: all 0.2s ease;
}
.oz-social-link:hover {
  background: #0050e5;
  color: #ffffff;
  transform: translateY(-2px);
}
.oz-social-link .material-symbols-outlined {
  font-size: 18px;
}
.oz-footer-nav-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 32px;
}
.oz-footer-col {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.oz-footer-heading {
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: #ffffff;
  margin: 0;
}
.oz-footer-links {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.oz-footer-link {
  font-size: 14px;
  color: #94a3b8;
  text-decoration: none;
  transition: color 0.2s ease;
}
.oz-footer-link:hover {
  color: #ffffff;
}
.oz-footer-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
  padding-top: 32px;
}
.oz-footer-legal-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  color: #64748b;
}
.oz-powered-by {
  font-size: 12px;
  color: #475569;
}
.oz-footer-legal-links {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}
.oz-legal-link {
  font-size: 13px;
  color: #64748b;
  text-decoration: none;
  transition: color 0.2s ease;
}
.oz-legal-link:hover {
  color: #94a3b8;
}
@media (max-width: 900px) {
  .oz-footer-top {
    grid-template-columns: 1fr;
    gap: 36px;
  }
}
@media (max-width: 600px) {
  .oz-footer-bottom {
    flex-direction: column;
    align-items: flex-start;
  }
}`;

  jsScript: string = '';

  footerTokens: Array<{ label: string; token: string }> = [
    { label: 'Brand Name', token: '{{ BrandName }}' },
    { label: 'Description', token: '{{ Description }}' },
    { label: 'Copyright', token: '{{ Copyright }}' },
    { label: 'Year', token: '{{ Year }}' },
    { label: 'PoweredBy', token: '{{ PoweredBy }}' },
    { label: 'Email', token: '{{ Email }}' },
    { label: 'Phone', token: '{{ Phone }}' },
    { label: 'Address', token: '{{ Address }}' },
    { label: 'Category Columns', token: '{{#each FooterCategories}}\n  <div class="oz-footer-col">\n    <h4>{{ Title }}</h4>\n    <ul>\n      {{#each Pages}}\n      <li><a href="{{ Url }}">{{ Title }}</a></li>\n      {{/each}}\n    </ul>\n  </div>\n{{/each}}' },
    { label: 'Social Links', token: '{{#each SocialLinks}}\n  <a href="{{ Url }}" title="{{ Platform }}"><span class="material-symbols-outlined">{{ Icon }}</span></a>\n{{/each}}' },
    { label: 'Legal Pages', token: '{{#each LegalPages}}\n  <a href="{{ Url }}">{{ Title }}</a>\n{{/each}}' },
    { label: 'Newsletter Form', token: '{{ Form "Newsletter_Subscribe" }}' }
  ];

  sampleContent: any = {
    brandName: 'Ozikol Technologies',
    description: 'Autonomous cloud management, enterprise high availability, and sovereign workload control at planetary scale.',
    copyright: 'Ozikol Technologies LLC',
    year: '2026',
    poweredBy: 'Ozikol Cloud Engine',
    email: 'contact@company.com',
    phone: '+0 (000) 000-0000',
    address: 'One Sovereign Way, Suite 400',
    footerCategories: [
      {
        title: 'Platform',
        pages: [
          { title: 'Overview', url: '/platform' },
          { title: 'Security Architecture', url: '/security' },
          { title: 'Edge Cloud', url: '/edge' },
          { title: 'Observability', url: '/observability' }
        ]
      },
      {
        title: 'Resources',
        pages: [
          { title: 'Developer Portal', url: '/docs' },
          { title: 'API References', url: '/api' },
          { title: 'Status Dashboard', url: '/status' },
          { title: 'Release Notes', url: '/changelog' }
        ]
      },
      {
        title: 'Company',
        pages: [
          { title: 'About Us', url: '/about' },
          { title: 'Executive Team', url: '/team' },
          { title: 'Careers', url: '/careers' },
          { title: 'Press & Media', url: '/press' }
        ]
      }
    ],
    socialLinks: [
      { platform: 'Twitter / X', url: 'https://twitter.com', icon: 'share' },
      { platform: 'LinkedIn', url: 'https://linkedin.com', icon: 'public' },
      { platform: 'GitHub', url: 'https://github.com', icon: 'code' }
    ],
    legalPages: [
      { title: 'Privacy Policy', url: '/privacy' },
      { title: 'Terms of Service', url: '/terms' },
      { title: 'Cookie Notice', url: '/cookies' },
      { title: 'Security Compliance', url: '/security' }
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
    this.variantCode = `FOOTER_${randomSuffix}`;
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
        this.toast.error('Failed to load existing Footer template.');
      }
    });
  }

  saveFooterTemplate(): void {
    const name = (this.templateName || '').trim();
    if (!name) {
      this.toast.warning('Please enter a template name.');
      return;
    }

    this.isSaving = true;
    const payload = {
      name,
      category: 'footer',
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
            ? `Successfully updated Footer template "${name}".`
            : `Successfully created Footer template "${name}".`
        );
        this.templateSaved.emit(res?.data || res);
      },
      error: (err: any) => {
        this.isSaving = false;
        const msg = err?.error?.message || err?.message || 'Failed to save Footer template.';
        this.toast.error(`Save error: ${msg}`);
      }
    });
  }
}
