import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  AfterViewInit,
  OnChanges,
  SimpleChanges,
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
import { TemplateAiService } from '../services/template-ai.service';

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
          <div class="editor-tabs-group" *ngIf="!hideInternalTabs">
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

          <!-- AI Auto-Transform Copilot Button (Strictly Visible Only in Semantic HTML Tab) -->
          <button
            type="button"
            class="ai-transform-btn"
            *ngIf="activeTab === 'html'"
            [disabled]="isAiTransforming"
            (click)="triggerAiTransform()"
            [title]="'Use AI to analyze ' + categoryName + ' markup and inject standard CMS placeholders'"
          >
            <span class="material-symbols-outlined" [class.spin]="isAiTransforming">auto_awesome</span>
            <span>
              {{ isAiTransforming ? 'Injecting ' + categoryName + ' Placeholders...' : 'Smart Auto-Inject Placeholders (' + categoryName + ')' }}
            </span>
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
                (click)="onTokenChipClick(t)"
                [title]="t.label"
              >
                + {{ t.label }}
              </button>
            </div>
          </div>

          <!-- Monaco Editor Containers -->
          <div class="monaco-wrapper" [class.hidden]="activeTab !== 'html'">
            <div #monacoHtmlContainer class="monaco-host"></div>

            <!-- HTML Area Loading Overlay during AI Tokenization -->
            <div class="ai-editor-loading-overlay" *ngIf="isAiTransforming">
              <div class="ai-loading-card">
                <div class="ai-loading-spinner-wrap">
                  <div class="ai-spinner-ring"></div>
                  <span class="material-symbols-outlined ai-spinner-icon">auto_awesome</span>
                </div>
                <div class="ai-loading-text-block">
                  <h4 class="ai-loading-title">AI Auto-Injecting {{ categoryName }} Placeholders...</h4>
                  <p class="ai-loading-desc">
                    Analyzing markup structure and surgically replacing static elements with standard CMS tokens while preserving 100% of your styling &amp; markup.
                  </p>
                  <div class="ai-loading-bar-wrap">
                    <div class="ai-loading-bar-fill"></div>
                  </div>
                </div>
              </div>
            </div>
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
      </div>

      <!-- Token Confirmation & Code Preview Modal -->
      <div class="token-modal-backdrop" *ngIf="showTokenConfirmModal" (click)="closeTokenModal()">
        <div class="token-modal-card" (click)="$event.stopPropagation()">
          <div class="token-modal-header">
            <div class="modal-title-wrap">
              <span class="material-symbols-outlined token-modal-icon">integration_instructions</span>
              <h3 class="token-modal-title">Insert Placeholder: {{ selectedTokenForInsert?.label }}</h3>
            </div>
            <button type="button" class="btn-close-modal" (click)="closeTokenModal()" title="Close">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <div class="token-modal-body">
            <div class="token-guide-banner">
              <span class="material-symbols-outlined guide-icon">info</span>
              <div class="guide-text">
                <strong>Placeholder Sample Template</strong>
                <p>This is a placeholder sample snippet. Adjust it with your divs and classes to fit your design.</p>
              </div>
            </div>

            <div class="token-code-preview-wrap">
              <div class="code-preview-header">
                <span class="preview-badge">HTML Snippet</span>
                <span class="preview-hint">Will be inserted at your cursor position</span>
              </div>
              <pre class="token-code-preview"><code>{{ selectedTokenForInsert?.token }}</code></pre>
            </div>
          </div>

          <div class="token-modal-footer">
            <button type="button" class="btn btn-modal-cancel" (click)="closeTokenModal()">
              Cancel
            </button>
            <button type="button" class="btn btn-modal-confirm" (click)="confirmInsertToken()">
              <span class="material-symbols-outlined">add_circle</span>
              <span>Click to Add</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./visual-editor.component.scss']
})
export class VisualEditorComponent implements OnInit, OnDestroy, AfterViewInit, OnChanges {
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

  @Input() hideInternalTabs: boolean = false;

  @Input()
  get activeTab(): 'html' | 'css' | 'js' | 'data' {
    return this._activeTab;
  }
  set activeTab(val: 'html' | 'css' | 'js' | 'data') {
    if (val && val !== this._activeTab) {
      this._activeTab = val;
      this.switchTab(val);
    }
  }
  private _activeTab: 'html' | 'css' | 'js' | 'data' = 'html';

  previewViewport: 'desktop' | 'tablet' | 'mobile' = 'desktop';
  rawJsonText: string = '{}';
  safePreviewUrl: SafeResourceUrl | null = null;
  isAiTransforming: boolean = false;

  // Token Confirmation Modal State
  showTokenConfirmModal: boolean = false;
  selectedTokenForInsert: { label: string; token: string } | null = null;

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
    private templateAiService: TemplateAiService,
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

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['htmlTemplate'] && !changes['htmlTemplate'].firstChange) {
      if (this.monacoHtmlInstance && this.monacoHtmlInstance.getValue() !== this.htmlTemplate) {
        this.monacoHtmlInstance.setValue(this.htmlTemplate || '');
        this.updatePreviewIframe();
      }
    }
    if (changes['cssStyles'] && !changes['cssStyles'].firstChange) {
      if (this.monacoCssInstance && this.monacoCssInstance.getValue() !== this.cssStyles) {
        this.monacoCssInstance.setValue(this.cssStyles || '');
        this.updatePreviewIframe();
      }
    }
    if (changes['jsScript'] && !changes['jsScript'].firstChange) {
      if (this.monacoJsInstance && this.monacoJsInstance.getValue() !== this.jsScript) {
        this.monacoJsInstance.setValue(this.jsScript || '');
        this.updatePreviewIframe();
      }
    }
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
   * Opens the placeholder sample confirmation modal before inserting into editor.
   * @param tokenObj Token object containing label and HTML snippet.
   */
  onTokenChipClick(tokenObj: { label: string; token: string }): void {
    this.selectedTokenForInsert = tokenObj;
    this.showTokenConfirmModal = true;
  }

  /**
   * Closes the placeholder confirmation modal.
   */
  closeTokenModal(): void {
    this.showTokenConfirmModal = false;
    this.selectedTokenForInsert = null;
  }

  /**
   * Confirms insertion and injects the sample placeholder snippet into Monaco editor.
   */
  confirmInsertToken(): void {
    if (!this.selectedTokenForInsert) return;
    const snippet = this.selectedTokenForInsert.token;
    const label = this.selectedTokenForInsert.label;
    this.closeTokenModal();
    this.insertToken(snippet);
    this.toast.success(`Inserted ${label} placeholder!`);
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

      // Common Monaco options with dark theme and code folding enabled
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
   * Triggers the AI Copilot to surgically transform raw HTML into standard Handlebars placeholders
   * using the category-specific strategy rules and the unified backend AI copilot pipeline.
   */
  triggerAiTransform(): void {
    const rawHtml = (this.monacoHtmlInstance ? this.monacoHtmlInstance.getValue() : this.htmlTemplate || '').trim();
    if (!rawHtml) {
      this.toast.warning('Please enter HTML markup first.');
      return;
    }

    this.isAiTransforming = true;
    this.cdr.detectChanges();
    this.toast.info(`✨ AI is analyzing ${this.categoryName} structure and transforming placeholders...`);

    const rawCss = (this.monacoCssInstance ? this.monacoCssInstance.getValue() : this.cssStyles) || '';

    this.templateAiService.transformCategoryPlaceholders({
      category: this.category,
      rawHtml,
      rawCss,
      templateName: this.categoryName
    }).subscribe({
      next: (transformedHtml) => {
        this.isAiTransforming = false;
        this.htmlTemplate = transformedHtml;
        this.monacoHtmlInstance?.setValue(transformedHtml);
        this.htmlTemplateChange.emit(transformedHtml);
        this.updatePreviewIframe();
        this.toast.success(`✨ Successfully injected placeholders for ${this.categoryName}!`);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isAiTransforming = false;
        const msg = err?.message || 'Failed to reach AI service.';
        this.toast.error(`AI Transformation error: ${msg}`);
        this.cdr.detectChanges();
      }
    });
  }
}
