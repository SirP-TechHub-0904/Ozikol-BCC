import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ViewChild,
  ElementRef,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MonacoLoaderService } from '../services/monaco-loader.service';
import { HtmlAssemblerService } from '../services/html-assembler.service';
import { TemplateHydrationService } from '../services/template-hydration.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { ApiService } from '../../../../../core/services/api.service';

/**
 * Reusable full-featured visual code and content editor component for CMS template blueprints.
 * Features Monaco Editor with deep code folding (minimizing HTML divs, CSS rulesets, and JS functions),
 * live responsive iframe preview (Desktop, Tablet, Mobile), token insertion, and AI placeholder copilot.
 */
@Component({
  selector: 'app-visual-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="visual-editor-container">
      <!-- Toolbar Row: Tabs, Viewport Controls, Tokens & Actions -->
      <div class="editor-toolbar">
        <div class="toolbar-left">
          <!-- Editor Code & Data Tabs -->
          <div class="editor-tabs-group">
            <button
              type="button"
              class="tab-btn"
              [class.active]="activeTab === 'html'"
              (click)="switchTab('html')"
            >
              <span class="tab-badge html-badge">&lt;/&gt;</span>
              <span>HTML Markup</span>
            </button>

            <button
              type="button"
              class="tab-btn"
              [class.active]="activeTab === 'css'"
              (click)="switchTab('css')"
            >
              <span class="tab-badge css-badge">#</span>
              <span>Scoped CSS</span>
            </button>

            <button
              type="button"
              class="tab-btn"
              [class.active]="activeTab === 'js'"
              (click)="switchTab('js')"
            >
              <span class="tab-badge js-badge">&#123;&#125;</span>
              <span>JavaScript</span>
            </button>

            <button
              type="button"
              class="tab-btn"
              [class.active]="activeTab === 'data'"
              (click)="switchTab('data')"
            >
              <span class="material-symbols-outlined tab-icon">data_object</span>
              <span>Mock Data JSON</span>
            </button>
          </div>
        </div>

        <div class="toolbar-right">
          <!-- Viewport Toggle Buttons for Preview -->
          <div class="viewport-toggle-group">
            <button
              type="button"
              class="vp-btn"
              [class.active]="previewViewport === 'desktop'"
              (click)="previewViewport = 'desktop'"
              title="Desktop Viewport (100%)"
            >
              <span class="material-symbols-outlined">desktop_windows</span>
            </button>
            <button
              type="button"
              class="vp-btn"
              [class.active]="previewViewport === 'tablet'"
              (click)="previewViewport = 'tablet'"
              title="Tablet Viewport (768px)"
            >
              <span class="material-symbols-outlined">tablet</span>
            </button>
            <button
              type="button"
              class="vp-btn"
              [class.active]="previewViewport === 'mobile'"
              (click)="previewViewport = 'mobile'"
              title="Mobile Viewport (375px)"
            >
              <span class="material-symbols-outlined">smartphone</span>
            </button>
          </div>

          <!-- Code Folding Actions -->
          <div class="folding-actions-group">
            <button
              type="button"
              class="fold-btn"
              (click)="foldAllCode()"
              title="Minimise all tags / properties in active editor"
            >
              <span class="material-symbols-outlined">unfold_less</span>
              <span>Minimise All</span>
            </button>
            <button
              type="button"
              class="fold-btn"
              (click)="unfoldAllCode()"
              title="Expand all folded tags / properties"
            >
              <span class="material-symbols-outlined">unfold_more</span>
              <span>Expand All</span>
            </button>
          </div>

          <!-- AI Auto-Transform Copilot Button -->
          <button
            type="button"
            class="ai-transform-btn"
            [disabled]="isAiTransforming"
            (click)="triggerAiTransform()"
            title="Use Gemini AI to surgically replace raw text with standard CMS tokens"
          >
            <span class="material-symbols-outlined" [class.spin]="isAiTransforming">auto_awesome</span>
            <span>{{ isAiTransforming ? 'Transforming...' : 'Smart AI Tokens' }}</span>
          </button>
        </div>
      </div>

      <!-- Main Workspace: Split Screen (Editor on Left, Live Preview on Right) -->
      <div class="editor-workspace">
        <!-- Left Panel: Monaco Code Editor / Mock Data JSON -->
        <div class="editor-pane">
          <!-- Quick Token Insertion Chips Bar -->
          <div class="token-chips-bar" *ngIf="specificTokens && specificTokens.length > 0 && activeTab === 'html'">
            <span class="chips-label">Insert Token:</span>
            <div class="chips-scroll">
              <button
                type="button"
                class="token-chip"
                *ngFor="let t of specificTokens"
                (click)="insertToken(t.token)"
                [title]="t.label"
              >
                + {{ t.label }}
              </button>
            </div>
          </div>

          <!-- Monaco Editor Containers -->
          <div class="monaco-wrapper" [class.hidden]="activeTab !== 'html'">
            <div #monacoHtmlContainer class="monaco-host"></div>
          </div>

          <div class="monaco-wrapper" [class.hidden]="activeTab !== 'css'">
            <div #monacoCssContainer class="monaco-host"></div>
          </div>

          <div class="monaco-wrapper" [class.hidden]="activeTab !== 'js'">
            <div #monacoJsContainer class="monaco-host"></div>
          </div>

          <!-- Mock Data JSON Inspector -->
          <div class="data-inspector-wrapper" *ngIf="activeTab === 'data'">
            <div class="data-header">
              <span class="data-title">Preview Mock Data (JSON)</span>
              <button type="button" class="btn-format-json" (click)="formatJsonData()">
                Format JSON
              </button>
            </div>
            <textarea
              class="json-textarea"
              [(ngModel)]="rawJsonText"
              (ngModelChange)="onJsonTextChange($event)"
              placeholder="e.g. { &#34;brandName&#34;: &#34;Acme Global&#34;, ... }"
              spellcheck="false"
            ></textarea>
          </div>
        </div>

        <!-- Right Panel: Isolated Live Preview Iframe -->
        <div class="preview-pane">
          <div class="preview-header">
            <div class="preview-status">
              <span class="status-dot"></span>
              <span class="status-text">Live Preview Simulation</span>
            </div>
            <div class="preview-viewport-label">
              {{ previewViewport === 'desktop' ? 'Desktop Viewport' : previewViewport === 'tablet' ? 'Tablet (768px)' : 'Mobile (375px)' }}
            </div>
          </div>

          <div class="preview-stage" [ngClass]="'viewport-' + previewViewport">
            <iframe
              #previewIframe
              class="preview-iframe"
              [src]="safePreviewUrl"
              sandbox="allow-scripts allow-same-origin"
              title="Live Section Preview"
            ></iframe>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./visual-editor.component.scss']
})
export class VisualEditorComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() htmlTemplate: string = '';
  @Input() cssStyles: string = '';
  @Input() jsScript: string = '';
  @Input() sampleContent: any = {};
  @Input() category: string = 'menu';
  @Input() categoryName: string = 'Navigation';
  @Input() specificTokens: Array<{ label: string; token: string }> = [];
  @Input() isEditMode: boolean = false;
  @Input() editorTokens: any = null;

  @Output() htmlTemplateChange = new EventEmitter<string>();
  @Output() cssStylesChange = new EventEmitter<string>();
  @Output() jsScriptChange = new EventEmitter<string>();
  @Output() sampleContentChange = new EventEmitter<any>();
  @Output() aiTransformRequest = new EventEmitter<void>();

  @ViewChild('monacoHtmlContainer', { static: false }) monacoHtmlContainer?: ElementRef<HTMLDivElement>;
  @ViewChild('monacoCssContainer', { static: false }) monacoCssContainer?: ElementRef<HTMLDivElement>;
  @ViewChild('monacoJsContainer', { static: false }) monacoJsContainer?: ElementRef<HTMLDivElement>;
  @ViewChild('previewIframe', { static: false }) previewIframe?: ElementRef<HTMLIFrameElement>;

  activeTab: 'html' | 'css' | 'js' | 'data' = 'html';
  previewViewport: 'desktop' | 'tablet' | 'mobile' = 'desktop';
  rawJsonText: string = '{}';
  safePreviewUrl: SafeResourceUrl | null = null;
  isAiTransforming: boolean = false;

  private monacoHtmlInstance: any = null;
  private monacoCssInstance: any = null;
  private monacoJsInstance: any = null;
  private monacoGlobal: any = null;
  private previewDebounceTimer: any = null;

  constructor(
    private monacoLoader: MonacoLoaderService,
    private htmlAssembler: HtmlAssemblerService,
    private hydrationService: TemplateHydrationService,
    private sanitizer: DomSanitizer,
    private toast: ToastService,
    private api: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    try {
      this.rawJsonText = JSON.stringify(this.sampleContent || {}, null, 2);
    } catch {
      this.rawJsonText = '{}';
    }
    this.updatePreviewIframe();
  }

  ngAfterViewInit(): void {
    this.initializeMonacoEditors();
  }

  ngOnDestroy(): void {
    if (this.previewDebounceTimer) {
      clearTimeout(this.previewDebounceTimer);
    }
    this.monacoHtmlInstance?.dispose();
    this.monacoCssInstance?.dispose();
    this.monacoJsInstance?.dispose();
  }

  /**
   * Switches active editor tab and triggers Monaco layout resize.
   * @param tab Target tab identifier ('html' | 'css' | 'js' | 'data').
   */
  switchTab(tab: 'html' | 'css' | 'js' | 'data'): void {
    this.activeTab = tab;
    this.cdr.detectChanges();
    setTimeout(() => {
      if (tab === 'html') this.monacoHtmlInstance?.layout();
      if (tab === 'css') this.monacoCssInstance?.layout();
      if (tab === 'js') this.monacoJsInstance?.layout();
    }, 50);
  }

  /**
   * Minimises all foldable blocks (tags, divs, CSS rulesets, JS functions) in the currently active editor.
   */
  foldAllCode(): void {
    const editor = this.getActiveMonacoInstance();
    if (editor) {
      editor.trigger('foldAll', 'editor.foldAll', {});
      this.toast.info('Minimised all foldable tags and blocks.');
    }
  }

  /**
   * Expands all folded code blocks in the currently active editor.
   */
  unfoldAllCode(): void {
    const editor = this.getActiveMonacoInstance();
    if (editor) {
      editor.trigger('unfoldAll', 'editor.unfoldAll', {});
      this.toast.info('Expanded all folded blocks.');
    }
  }

  /**
   * Returns the Monaco Editor instance for the currently active tab.
   * @returns Active Monaco editor instance or null.
   */
  private getActiveMonacoInstance(): any {
    if (this.activeTab === 'html') return this.monacoHtmlInstance;
    if (this.activeTab === 'css') return this.monacoCssInstance;
    if (this.activeTab === 'js') return this.monacoJsInstance;
    return null;
  }

  /**
   * Inserts a dynamic Handlebars token at the current cursor position in the HTML editor.
   * @param token Handlebars placeholder string (e.g. '{{ Title }}').
   */
  insertToken(token: string): void {
    if (this.activeTab !== 'html' || !this.monacoHtmlInstance) {
      this.toast.warning('Please switch to the HTML Markup tab to insert placeholders.');
      return;
    }
    const selection = this.monacoHtmlInstance.getSelection();
    const op = {
      range: selection,
      text: token,
      forceMoveMarkers: true
    };
    this.monacoHtmlInstance.executeEdits('insertToken', [op]);
    this.monacoHtmlInstance.focus();
    this.htmlTemplate = this.monacoHtmlInstance.getValue();
    this.htmlTemplateChange.emit(this.htmlTemplate);
    this.schedulePreviewUpdate();
  }

  /**
   * Formats JSON text inside the Mock Data tab.
   */
  formatJsonData(): void {
    try {
      const parsed = JSON.parse(this.rawJsonText);
      this.rawJsonText = JSON.stringify(parsed, null, 2);
      this.sampleContent = parsed;
      this.sampleContentChange.emit(this.sampleContent);
      this.schedulePreviewUpdate();
      this.toast.success('Formatted JSON successfully.');
    } catch {
      this.toast.error('Invalid JSON syntax. Please verify commas and quotes.');
    }
  }

  /**
   * Handles changes to the Mock Data JSON text area.
   * @param value Raw JSON string.
   */
  onJsonTextChange(value: string): void {
    try {
      const parsed = JSON.parse(value);
      this.sampleContent = parsed;
      this.sampleContentChange.emit(this.sampleContent);
      this.schedulePreviewUpdate();
    } catch {
      // Ignored while user is typing incomplete JSON
    }
  }

  /**
   * Debounces preview recalculation to maintain 60fps responsiveness during rapid keystrokes.
   */
  private schedulePreviewUpdate(): void {
    if (this.previewDebounceTimer) {
      clearTimeout(this.previewDebounceTimer);
    }
    this.previewDebounceTimer = setTimeout(() => {
      this.updatePreviewIframe();
    }, 180);
  }

  /**
   * Hydrates HTML markup and generates an isolated HTML5 preview document rendered in the iframe.
   */
  updatePreviewIframe(): void {
    const rawHtml = this.htmlTemplate || '';
    const rawCss = this.cssStyles || '';
    const rawJs = this.jsScript || '';

    // Hydrate template using Master Hydration Service with editor tokens and mock data
    const hydratedHtml = this.hydrationService.hydrateTemplate(
      rawHtml,
      this.sampleContent,
      {
        editorTokens: this.editorTokens,
        previewMenuContent: this.sampleContent,
        currentTenantBrandName: this.sampleContent?.brandName || 'Acme Global'
      }
    );

    // Assemble self-contained isolated HTML5 preview document via HtmlAssemblerService
    const assembledDoc = this.htmlAssembler.assembleSectionPreview({
      html: hydratedHtml,
      css: rawCss,
      js: rawJs,
      category: this.category,
      pageTitle: `${this.categoryName} Preview`
    });

    if (this.previewIframe?.nativeElement) {
      const iframe = this.previewIframe.nativeElement;
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(assembledDoc);
        doc.close();
      }
    }
  }

  /**
   * Initializes Monaco Editor instances with code folding enabled across HTML, CSS, and JS tabs.
   */
  private initializeMonacoEditors(): void {
    this.monacoLoader.loadMonaco().then((monaco) => {
      this.monacoGlobal = monaco;

      // Common Monaco options with code folding enabled (minimise divs and properties)
      const commonOptions = {
        theme: 'ozikol-studio-dark',
        automaticLayout: true,
        folding: true,
        foldingStrategy: 'auto',
        showFoldingControls: 'always',
        matchBrackets: 'always',
        autoClosingBrackets: 'always',
        autoClosingQuotes: 'always',
        lineNumbers: 'on',
        minimap: { enabled: true },
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        fontSize: 13,
        fontFamily: "'Fira Code', 'Cascadia Code', Consolas, 'Courier New', monospace",
        tabSize: 2
      };

      // 1. HTML Editor Instance
      if (this.monacoHtmlContainer?.nativeElement) {
        this.monacoHtmlInstance = monaco.editor.create(this.monacoHtmlContainer.nativeElement, {
          ...commonOptions,
          value: this.htmlTemplate || '',
          language: 'html'
        });
        this.monacoHtmlInstance.onDidChangeModelContent(() => {
          const val = this.monacoHtmlInstance.getValue();
          if (this.htmlTemplate !== val) {
            this.htmlTemplate = val;
            this.htmlTemplateChange.emit(val);
            this.schedulePreviewUpdate();
          }
        });
      }

      // 2. CSS Editor Instance
      if (this.monacoCssContainer?.nativeElement) {
        this.monacoCssInstance = monaco.editor.create(this.monacoCssContainer.nativeElement, {
          ...commonOptions,
          value: this.cssStyles || '',
          language: 'css'
        });
        this.monacoCssInstance.onDidChangeModelContent(() => {
          const val = this.monacoCssInstance.getValue();
          if (this.cssStyles !== val) {
            this.cssStyles = val;
            this.cssStylesChange.emit(val);
            this.schedulePreviewUpdate();
          }
        });
      }

      // 3. JavaScript Editor Instance
      if (this.monacoJsContainer?.nativeElement) {
        this.monacoJsInstance = monaco.editor.create(this.monacoJsContainer.nativeElement, {
          ...commonOptions,
          value: this.jsScript || '',
          language: 'javascript'
        });
        this.monacoJsInstance.onDidChangeModelContent(() => {
          const val = this.monacoJsInstance.getValue();
          if (this.jsScript !== val) {
            this.jsScript = val;
            this.jsScriptChange.emit(val);
            this.schedulePreviewUpdate();
          }
        });
      }

      this.updatePreviewIframe();
    }).catch((err) => {
      console.warn('Monaco loader failed to load from CDN:', err);
    });
  }

  /**
   * Triggers the AI Copilot to surgically transform raw HTML into standard Handlebars placeholders.
   */
  triggerAiTransform(): void {
    const rawHtml = (this.htmlTemplate || '').trim();
    if (!rawHtml) {
      this.toast.warning('Please enter HTML markup first.');
      return;
    }

    this.isAiTransforming = true;
    this.toast.info(`✨ AI is analyzing ${this.categoryName} structure and transforming placeholders...`);

    const payload = {
      prompt: `You are a surgical code transformer for the Ozikol BCC CMS platform.
Category: ${this.category} (${this.categoryName}).
Replace raw text with standard Handlebars placeholders ({{ Title }}, {{#each NavItems="first"}}, {{ BrandName }}, etc.).
Preserve 100% of original CSS classes, IDs, wrappers, and styling. No explanations, no markdown fences.`,
      rawHtml,
      rawCss: this.cssStyles || '',
      category: this.category,
      currentTemplateName: this.categoryName
    };

    this.api.post<any>('ContentApi/templates/ai-copilot', payload).subscribe({
      next: (res) => {
        this.isAiTransforming = false;
        let transformed = res?.data?.htmlTemplate || res?.data?.codeResult?.htmlTemplate || '';
        if (transformed) {
          transformed = transformed.replace(/^```(?:html)?\s*/i, '').replace(/```\s*$/i, '').trim();
          this.htmlTemplate = transformed;
          this.monacoHtmlInstance?.setValue(transformed);
          this.htmlTemplateChange.emit(transformed);
          this.updatePreviewIframe();
          this.toast.success(`✨ Successfully transformed ${this.categoryName} with smart AI placeholders!`);
        } else {
          this.toast.warning('AI response did not return transformed HTML.');
        }
      },
      error: (err) => {
        this.isAiTransforming = false;
        const msg = err?.error?.message || err?.message || 'Failed to reach AI service.';
        this.toast.error(`AI Transformation error: ${msg}`);
      }
    });
  }
}
