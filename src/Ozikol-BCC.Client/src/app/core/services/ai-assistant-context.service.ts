import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ToastService } from './toast.service';

/**
 * Interface representing an executable action provided by the active page context.
 */
export interface PageContextAction {
  id: string;
  label: string;
  icon: string;
  tooltip?: string;
  execute: (payload?: any) => Promise<void> | void;
}

/**
 * Interface representing the context bridge provided by active console pages.
 */
export interface PageContextProvider {
  pageId: string;
  pageTitle: string;
  pageCategory?: string;
  quickPrompts?: string[];
  getState: () => any;
  applyChanges: (data: any) => void;
  saveToDatabase?: () => Promise<void> | void;
  actions?: PageContextAction[];
}

/**
 * Interface representing a captured form field snapshot from the active screen DOM.
 */
export interface PageFormFieldSnapshot {
  name?: string;
  id?: string;
  label?: string;
  value?: string;
  placeholder?: string;
  type?: string;
}

/**
 * Interface representing a structured chat message in the AI Assistant conversation.
 */
export interface AiChatMessage {
  id: string;
  historyId?: string;
  sender: 'user' | 'assistant' | 'system';
  timestamp: Date;
  text: string;
  provider?: 'ozi-flash' | 'ozi-coder' | 'ozi-deep' | 'gemini' | 'deepseek' | 'qwen' | string;
  attachedImageUrl?: string;
  isImplemented?: boolean;
  implementedAt?: Date;
  previousSnapshot?: any;
  codeResult?: {
    templateName?: string;
    category?: string;
    variantCode?: string;
    htmlTemplate?: string;
    cssStyles?: string;
    jsScript?: string;
    explanation?: string;
    tokensExtracted?: string[];
    mockContent?: any;
  };
}

/**
 * Global AI Assistant Service that manages state, conversation, layout modes,
 * multi-model routing (Ozi Flash, Ozi Coder, Ozi Deep), real-time DOM/form state harvesting,
 * one-click implementation tracking, visual vision mockups, and bi-directional communication
 * with active workspace pages.
 */
@Injectable({
  providedIn: 'root'
})
export class AiAssistantContextService {
  /** Observable of active page context delegate */
  private readonly _activeContext = new BehaviorSubject<PageContextProvider | null>(null);
  public readonly activeContext$ = this._activeContext.asObservable();

  /** Observable of assistant open / visible state */
  private readonly _isOpen = new BehaviorSubject<boolean>(false);
  public readonly isOpen$ = this._isOpen.asObservable();

  /** Observable of layout docking state: floating | docked-right | docked-bottom | minimized */
  private readonly _layoutMode = new BehaviorSubject<'floating' | 'docked-right' | 'docked-bottom' | 'minimized'>('docked-right');
  public readonly layoutMode$ = this._layoutMode.asObservable();

  /** Observable of active AI engine: ozi-flash | ozi-coder | ozi-deep */
  private readonly _selectedModel = new BehaviorSubject<'ozi-flash' | 'ozi-coder' | 'ozi-deep' | 'gemini' | 'deepseek' | 'qwen'>('ozi-flash');
  public readonly selectedModel$ = this._selectedModel.asObservable();

  /** Observable of message history */
  private readonly _messages = new BehaviorSubject<AiChatMessage[]>([
    {
      id: 'welcome-msg',
      sender: 'assistant',
      timestamp: new Date(),
      text: 'Hello! I am Ozi AI. You can ask me questions about your active screen, inspect placeholders and form inputs, design bespoke sections, paste visual mockup screenshots (Ctrl+V), or study raw code into Ozikol tokens with one-click implementation and rollback. How can I help you today?',
      provider: 'ozi-flash'
    }
  ]);
  public readonly messages$ = this._messages.asObservable();

  /** Observable of loading/generation state */
  private readonly _isGenerating = new BehaviorSubject<boolean>(false);
  public readonly isGenerating$ = this._isGenerating.asObservable();

  constructor(
    private readonly api: ApiService,
    private readonly toast: ToastService
  ) {}

  /**
   * Scans the active screen DOM to extract visible input fields, labels, placeholders, and current values.
   * Excludes inputs inside the AI assistant panel, Monaco code editors, and code textareas.
   */
  public harvestActivePageDomState(): PageFormFieldSnapshot[] {
    if (typeof document === 'undefined') return [];

    const snapshots: PageFormFieldSnapshot[] = [];
    try {
      const elements = document.querySelectorAll(
        'main input:not([type="hidden"]):not([type="password"]), main select, main textarea:not(.code-editor):not([name*="html"]):not([name*="css"]):not([name*="js"]), .content-wrapper input:not([type="hidden"]):not([type="password"]), .content-wrapper select, form input:not([type="hidden"]):not([type="password"]), form select'
      );

      elements.forEach((el) => {
        if (el.closest('.ai-panel-wrapper') || el.closest('.ai-launch-pill') || el.closest('.monaco-editor') || el.closest('.code-editor-wrapper')) {
          return;
        }

        const htmlEl = el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
        const id = htmlEl.id || '';
        const name = htmlEl.name || id || '';
        const placeholder = (htmlEl as HTMLInputElement).placeholder || '';
        let value = htmlEl.value || '';
        const type = (htmlEl as HTMLInputElement).type || htmlEl.tagName.toLowerCase();

        // Skip fields that contain full HTML/CSS tags or raw code dumps
        if (value.includes('<section') || value.includes('<div') || value.includes('{') && value.includes('}')) {
          return;
        }

        // Truncate overly long values
        if (value.length > 80) {
          value = value.substring(0, 77) + '...';
        }

        let labelText = '';
        if (id) {
          const labelEl = document.querySelector(`label[for="${id}"]`);
          if (labelEl) {
            labelText = labelEl.textContent?.trim() || '';
          }
        }
        if (!labelText && htmlEl.parentElement) {
          const parentLabel = htmlEl.parentElement.querySelector('label, .form-label, .input-label, span.label');
          if (parentLabel) {
            labelText = parentLabel.textContent?.trim() || '';
          }
        }
        if (!labelText && htmlEl.getAttribute('aria-label')) {
          labelText = htmlEl.getAttribute('aria-label') || '';
        }

        if (labelText.length > 60) {
          labelText = labelText.substring(0, 57) + '...';
        }

        if (name || id || labelText || placeholder || value) {
          snapshots.push({
            name: name || undefined,
            id: id || undefined,
            label: labelText || undefined,
            value: value || undefined,
            placeholder: placeholder || undefined,
            type: type || undefined
          });
        }
      });
    } catch {
      // Graceful fallback
    }

    return snapshots.slice(0, 15);
  }

  /**
   * Registers a page context provider when a page activates.
   * @param provider The page context provider implementation.
   */
  public registerPageContext(provider: PageContextProvider): void {
    this._activeContext.next(provider);
  }

  /**
   * Unregisters a page context when the page is destroyed.
   * @param pageId The identifier of the page being unregistered.
   */
  public unregisterPageContext(pageId: string): void {
    const current = this._activeContext.getValue();
    if (current && current.pageId === pageId) {
      this._activeContext.next(null);
    }
  }

  /**
   * Gets the current active page context snapshot.
   */
  public getActiveContext(): PageContextProvider | null {
    return this._activeContext.getValue();
  }

  /**
   * Toggles the open state of the AI assistant panel.
   */
  public toggleOpen(): void {
    const nextState = !this._isOpen.getValue();
    this._isOpen.next(nextState);
    if (nextState && this._layoutMode.getValue() === 'minimized') {
      this._layoutMode.next('floating');
    }
  }

  /**
   * Sets the open state explicitly.
   */
  public setOpen(open: boolean): void {
    this._isOpen.next(open);
    if (open && this._layoutMode.getValue() === 'minimized') {
      this._layoutMode.next('floating');
    }
  }

  /**
   * Sets the docking/layout mode.
   * @param mode The desired layout mode.
   */
  public setLayoutMode(mode: 'floating' | 'docked-right' | 'docked-bottom' | 'minimized'): void {
    this._layoutMode.next(mode);
    if (mode === 'minimized') {
      this._isOpen.next(false);
    } else {
      this._isOpen.next(true);
    }
  }

  /**
   * Selects the active AI model engine.
   * @param model 'ozi-flash' | 'ozi-coder' | 'ozi-deep'
   */
  public setSelectedModel(model: 'ozi-flash' | 'ozi-coder' | 'ozi-deep' | 'gemini' | 'deepseek' | 'qwen'): void {
    this._selectedModel.next(model);
  }

  /**
   * Sends a user prompt, code study request, or visual mockup to the backend AI assistant
   * bundled with real-time DOM input fields, placeholders, and active editor context.
   * @param prompt The user's instruction or request.
   * @param rawCode Optional raw HTML/CSS/JS code to study.
   * @param attachedImageUrl Optional base64 or URL visual mockup image.
   */
  public sendPrompt(
    prompt: string,
    rawCode?: { html?: string; css?: string; js?: string },
    attachedImageUrl?: string
  ): void {
    const trimmedPrompt = prompt?.trim();
    if (!trimmedPrompt && !rawCode?.html && !attachedImageUrl) {
      return;
    }

    const currentContext = this._activeContext.getValue();
    const currentState = currentContext ? currentContext.getState() : null;
    const provider = this._selectedModel.getValue();
    const formFields = this.harvestActivePageDomState();

    // 1. Append user message to conversation
    const userMsg: AiChatMessage = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      timestamp: new Date(),
      text: trimmedPrompt || (attachedImageUrl ? 'Inspect and convert attached mockup image into an Ozikol section.' : 'Study and convert this raw code into Ozikol tokens.'),
      provider,
      attachedImageUrl
    };

    const currentMessages = this._messages.getValue();
    this._messages.next([...currentMessages, userMsg]);
    this._isGenerating.next(true);

    // 2. Prepare API payload with full DOM and Form context
    const payload = {
      prompt: trimmedPrompt,
      rawHtml: rawCode?.html || currentState?.html || '',
      rawCss: rawCode?.css || currentState?.css || '',
      rawJs: rawCode?.js || currentState?.js || '',
      provider,
      category: currentState?.category || 'cards',
      currentTemplateName: currentState?.name || '',
      pageRoute: currentContext?.pageId || (typeof window !== 'undefined' ? window.location.pathname : ''),
      pageTitle: currentContext?.pageTitle || (typeof document !== 'undefined' ? document.title : 'Studio Console'),
      attachedImageUrl,
      formFields: formFields.length > 0 ? formFields : undefined
    };

    // 3. Dispatch to backend AI Copilot endpoint
    this.api.post<any>('ContentApi/templates/ai-copilot', payload).subscribe({
      next: (res) => {
        this._isGenerating.next(false);
        const data = res?.data;
        const hasCode = !!data?.htmlTemplate && data.htmlTemplate.trim().length > 0;

        const assistantMsg: AiChatMessage = {
          id: 'msg-' + Date.now(),
          historyId: data?.historyId,
          sender: 'assistant',
          timestamp: new Date(),
          text: data?.explanation || (hasCode ? 'Here is the customized section blueprint with structured tokens and scoped CSS.' : 'Hello! How can I help you today?'),
          provider,
          isImplemented: false,
          codeResult: hasCode ? {
            templateName: data?.templateName || currentState?.name || 'AI Custom Section',
            category: data?.categoryKey || currentState?.category || 'cards',
            variantCode: data?.variantCode || currentState?.variantCode,
            htmlTemplate: data?.htmlTemplate || '',
            cssStyles: data?.cssStyles || '',
            jsScript: data?.jsScript || '',
            explanation: data?.explanation || '',
            tokensExtracted: data?.tokensExtracted || [],
            mockContent: data?.mockContent
          } : undefined
        };

        this._messages.next([...this._messages.getValue(), assistantMsg]);
      },
      error: (err) => {
        this._isGenerating.next(false);
        const errMsg = err?.error?.message || err?.message || 'Failed to reach AI service. Please check your network or try again.';
        this.toast.error(errMsg);

        const assistantMsg: AiChatMessage = {
          id: 'msg-' + Date.now(),
          sender: 'assistant',
          timestamp: new Date(),
          text: `⚠️ AI Service Notice: ${errMsg}`,
          provider,
          isImplemented: false
        };

        this._messages.next([...this._messages.getValue(), assistantMsg]);
      }
    });
  }

  /**
   * Implements the AI blueprint into active studio editors and captures snapshot for rollback.
   * @param message The chat message containing the code result to implement.
   */
  public implementBlueprint(message: AiChatMessage): void {
    const context = this._activeContext.getValue();
    if (!context) {
      this.toast.error('No active page context found to apply blueprint.');
      return;
    }

    if (!message.codeResult) {
      this.toast.error('No code result found to implement.');
      return;
    }

    // Capture current snapshot prior to modification
    const preChangeSnapshot = context.getState();
    message.previousSnapshot = preChangeSnapshot;

    // Apply AI changes to active form / editors
    context.applyChanges({
      name: message.codeResult.templateName,
      category: message.codeResult.category,
      html: message.codeResult.htmlTemplate,
      css: message.codeResult.cssStyles,
      js: message.codeResult.jsScript,
      mockContent: message.codeResult.mockContent
    });

    message.isImplemented = true;
    message.implementedAt = new Date();

    // Persist implementation status and previous snapshot to backend if historyId exists
    if (message.historyId) {
      this.api.post('ContentApi/ai/implement', {
        historyId: message.historyId,
        snapshotJson: JSON.stringify(preChangeSnapshot)
      }).subscribe({
        next: () => {
          this.toast.success('Auto-filled template into editor! Snapshot saved for rollback.');
        },
        error: () => {
          this.toast.success('Auto-filled template into editor!');
        }
      });
    } else {
      this.toast.success('Auto-filled template into editor!');
    }
  }

  /**
   * Restores the previous snapshot before the AI blueprint was implemented.
   * @param message The chat message whose implementation is being rolled back.
   */
  public restoreBlueprint(message: AiChatMessage): void {
    const context = this._activeContext.getValue();
    if (!context) {
      this.toast.error('No active page context found to restore.');
      return;
    }

    if (message.previousSnapshot) {
      context.applyChanges(message.previousSnapshot);
      message.isImplemented = false;
      this.toast.info('Restored editor to previous snapshot.');

      if (message.historyId) {
        this.api.post('ContentApi/ai/restore', { historyId: message.historyId }).subscribe();
      }
      return;
    }

    // If local snapshot not in memory, fetch from backend
    if (message.historyId) {
      this.api.post<any>('ContentApi/ai/restore', { historyId: message.historyId }).subscribe({
        next: (res) => {
          const snapshotJson = res?.data?.previousSnapshotJson;
          if (snapshotJson) {
            try {
              const parsed = JSON.parse(snapshotJson);
              context.applyChanges(parsed);
              message.isImplemented = false;
              this.toast.info('Restored editor from saved database snapshot.');
            } catch {
              this.toast.error('Unable to parse saved snapshot.');
            }
          } else {
            this.toast.warning('No previous snapshot was found for this interaction.');
          }
        },
        error: () => {
          this.toast.error('Failed to restore snapshot from server.');
        }
      });
    } else {
      this.toast.warning('No previous snapshot available to restore.');
    }
  }

  /**
   * Loads saved AI chat history records from backend.
   * @param pageRoute Optional route filter.
   */
  public loadHistory(pageRoute?: string): Observable<any> {
    const params: any = {};
    if (pageRoute) {
      params.pageRoute = pageRoute;
    }
    return this.api.get<any>('ContentApi/ai/history', params);
  }

  /**
   * Clears saved AI chat history on the server.
   * @param pageRoute Optional route filter.
   * @param historyId Optional specific record ID.
   */
  public clearServerHistory(pageRoute?: string, historyId?: string): Observable<any> {
    const params: any = {};
    if (pageRoute) params.pageRoute = pageRoute;
    if (historyId) params.historyId = historyId;
    return this.api.delete<any>('ContentApi/ai/history', params);
  }

  /**
   * Resumes and injects a saved historical interaction into the active chat stream.
   * @param record The saved BcpAiChatHistory record from database.
   */
  public resumeHistoryRecord(record: any): void {
    let parsedCode: any = null;
    if (record.generatedCodeJson) {
      try {
        parsedCode = JSON.parse(record.generatedCodeJson);
      } catch {
        parsedCode = null;
      }
    }

    let parsedSnapshot: any = null;
    if (record.previousSnapshotJson) {
      try {
        parsedSnapshot = JSON.parse(record.previousSnapshotJson);
      } catch {
        parsedSnapshot = null;
      }
    }

    const userMsg: AiChatMessage = {
      id: 'hist-user-' + record.id,
      sender: 'user',
      timestamp: new Date(record.createdAt),
      text: record.promptText || 'Inspect code / blueprint',
      provider: record.providerUsed || 'ozi-flash',
      attachedImageUrl: record.attachedImageUrl
    };

    const assistantMsg: AiChatMessage = {
      id: 'hist-asst-' + record.id,
      historyId: record.id,
      sender: 'assistant',
      timestamp: new Date(record.createdAt),
      text: record.responseText || 'Generated section blueprint.',
      provider: record.providerUsed || 'ozi-flash',
      isImplemented: !!record.isImplemented,
      implementedAt: record.implementedAt ? new Date(record.implementedAt) : undefined,
      previousSnapshot: parsedSnapshot,
      codeResult: parsedCode ? {
        templateName: parsedCode.templateName,
        category: parsedCode.categoryKey || parsedCode.category,
        variantCode: parsedCode.variantCode,
        htmlTemplate: parsedCode.htmlTemplate,
        cssStyles: parsedCode.cssStyles,
        jsScript: parsedCode.jsScript,
        explanation: parsedCode.explanation,
        tokensExtracted: parsedCode.tokensExtracted,
        mockContent: parsedCode.mockContent
      } : undefined
    };

    this._messages.next([...this._messages.getValue(), userMsg, assistantMsg]);
    this._isOpen.next(true);
    this.toast.info(`Loaded interaction from ${new Date(record.createdAt).toLocaleTimeString()}`);
  }

  /**
   * Directly triggers the active page's database save operation.
   * @param codeResult Optional code result to apply first before saving.
   */
  public async saveToDatabase(codeResult?: any): Promise<void> {
    const context = this._activeContext.getValue();
    if (!context || !context.saveToDatabase) {
      this.toast.error('Apply is not supported on this screen.');
      return;
    }

    if (codeResult) {
      context.applyChanges({
        name: codeResult.templateName,
        category: codeResult.category,
        html: codeResult.htmlTemplate,
        css: codeResult.cssStyles,
        js: codeResult.jsScript,
        mockContent: codeResult.mockContent
      });
    }

    await context.saveToDatabase();
  }

  /**
   * Clears the active chat conversation history in memory.
   */
  public clearChat(): void {
    this._messages.next([
      {
        id: 'welcome-msg',
        sender: 'assistant',
        timestamp: new Date(),
        text: 'Chat history cleared. How can I help you customize or tokenize sections today?',
        provider: this._selectedModel.getValue()
      }
    ]);
  }

  /**
   * High-speed deterministic client-side tokenization fallback.
   */
  private clientSideFallbackTokenize(html: string, css?: string, js?: string, category?: string): any {
    let processedHtml = html || '';

    // Replace common headings with Title
    processedHtml = processedHtml.replace(/<h[1-2][^>]*>(.*?)<\/h[1-2]>/i, '<h1 class="oz-title">{{ Title }}</h1>');
    processedHtml = processedHtml.replace(/<p class="[^"]*lead[^"]*"[^>]*>(.*?)<\/p>/i, '<p class="lead">{{ Description }}</p>');

    return {
      templateName: 'Imported Section Blueprint',
      category: category || 'cards',
      htmlTemplate: processedHtml,
      cssStyles: css || '',
      jsScript: js || '',
      explanation: 'Scoped styles cleaned and standard tokens mapped successfully.',
      tokensExtracted: ['Title', 'Description']
    };
  }
}
