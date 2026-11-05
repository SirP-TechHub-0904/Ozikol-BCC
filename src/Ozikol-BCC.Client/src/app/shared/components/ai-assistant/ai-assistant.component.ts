import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { AiAssistantContextService, AiChatMessage, PageContextProvider } from '../../../core/services/ai-assistant-context.service';
import { ToastService } from '../../../core/services/toast.service';

/**
 * Global Floating and Dockable AI Assistant Component.
 * Provides multi-model AI generation (Ozi Flash, Ozi Coder, Ozi Deep),
 * visual image mockup attachments & Ctrl+V clipboard paste,
 * one-click implementation tracking with instant rollback restore,
 * and comprehensive chat history drawer per user and page.
 */
@Component({
  selector: 'app-ai-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- 1. Floating Launch Pill / Bubble (Visible when not docked or when opened) -->
    <button
      type="button"
      class="ai-launch-pill"
      [class.is-open]="isOpen"
      [class.has-context]="!!activeContext"
      (click)="toggleAssistant()"
      title="Toggle Ozi AI Assistant"
      *ngIf="layoutMode === 'floating' || layoutMode === 'minimized' || !isOpen"
    >
      <div class="pill-beacon-ring"></div>
      <span class="material-symbols-outlined pill-icon">auto_awesome</span>
      <span class="pill-label">Ozi AI</span>
      <span class="pill-badge" *ngIf="activeContext">{{ activeContext.pageCategory || 'Studio' }}</span>
    </button>

    <!-- 2. AI Assistant Panel (Floated or Docked) -->
    <div
      class="ai-panel-wrapper"
      [class.is-open]="isOpen"
      [class.mode-floating]="layoutMode === 'floating'"
      [class.mode-docked-right]="layoutMode === 'docked-right'"
      [class.mode-docked-bottom]="layoutMode === 'docked-bottom'"
      *ngIf="isOpen && layoutMode !== 'minimized'"
    >
      <!-- Panel Header Bar -->
      <div class="ai-panel-header">
        <div class="header-branding">
          <div class="ai-avatar-icon">
            <span class="material-symbols-outlined">psychology</span>
          </div>
          <div class="header-titles">
            <div class="ai-title-row">
              <h3 class="ai-main-title">Ozi AI</h3>
              <span class="ai-status-dot" title="Online & Ready"></span>
            </div>
            <div class="ai-sub-context" *ngIf="activeContext">
              <span class="material-symbols-outlined ctx-icon">integration_instructions</span>
              <span>{{ activeContext.pageTitle }}</span>
            </div>
          </div>
        </div>

        <!-- Header Actions & Mode Toggles -->
        <div class="header-controls">
          <!-- AI Provider Switcher -->
          <div class="model-select-wrapper">
            <select
              [ngModel]="selectedModel"
              (ngModelChange)="onModelChange($event)"
              class="model-select-dropdown"
              title="Select AI Engine"
            >
              <option value="ozi-flash">Ozi Flash</option>
              <option value="ozi-coder">Ozi Coder</option>
              <option value="ozi-deep">Ozi Deep</option>
            </select>
          </div>

          <!-- New Chat Button -->
          <button
            type="button"
            class="layout-btn btn-new-chat"
            (click)="startNewChat()"
            title="New Chat (Start Fresh Session)"
          >
            <span class="material-symbols-outlined">add_circle</span>
          </button>

          <!-- Chat History Button -->
          <button
            type="button"
            class="layout-btn btn-history"
            [class.active]="showHistoryDrawer"
            (click)="toggleHistoryDrawer()"
            title="Chat History & Saved Blueprints"
          >
            <span class="material-symbols-outlined">history</span>
          </button>

          <!-- Layout Mode Switchers -->
          <div class="layout-toggle-group">
            <button
              type="button"
              class="layout-btn"
              [class.active]="layoutMode === 'floating'"
              (click)="setLayoutMode('floating')"
              title="Float Window"
            >
              <span class="material-symbols-outlined">picture_in_picture_alt</span>
            </button>
            <button
              type="button"
              class="layout-btn"
              [class.active]="layoutMode === 'docked-right'"
              (click)="setLayoutMode('docked-right')"
              title="Dock to Right Sidebar"
            >
              <span class="material-symbols-outlined">dock_to_right</span>
            </button>
            <button
              type="button"
              class="layout-btn"
              [class.active]="layoutMode === 'docked-bottom'"
              (click)="setLayoutMode('docked-bottom')"
              title="Dock to Bottom"
            >
              <span class="material-symbols-outlined">dock_to_bottom</span>
            </button>
            <button
              type="button"
              class="layout-btn"
              (click)="setLayoutMode('minimized')"
              title="Minimize Assistant"
            >
              <span class="material-symbols-outlined">minimize</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Dynamic Quick Action Suggestions Bar (Context-Specific to Current Page) -->
      <div class="ai-quick-actions" *ngIf="!showHistoryDrawer && getQuickChips().length > 0">
        <button
          type="button"
          *ngFor="let chip of getQuickChips()"
          class="quick-action-chip"
          (click)="handleChipClick(chip)"
          [title]="chip.tooltip || chip.prompt || chip.label"
        >
          <span class="material-symbols-outlined chip-icon">{{ chip.icon }}</span>
          <span>{{ chip.label }}</span>
        </button>
      </div>

      <!-- Slide-Over Chat History Drawer -->
      <div class="ai-history-drawer" *ngIf="showHistoryDrawer">
        <div class="history-drawer-header">
          <div class="history-title-group">
            <span class="material-symbols-outlined history-header-icon">history</span>
            <h4>Chat & Blueprint History</h4>
          </div>
          <div class="history-header-actions">
            <button type="button" class="btn-icon-action" (click)="fetchHistory()" title="Refresh History">
              <span class="material-symbols-outlined" [class.spinning-icon]="isLoadingHistory">refresh</span>
            </button>
            <button type="button" class="btn-icon-action" (click)="showHistoryDrawer = false" title="Close History">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        <!-- History Scope Filter Tabs -->
        <div class="history-filter-bar">
          <button
            type="button"
            class="filter-tab"
            [class.active]="historyFilter === 'current'"
            (click)="setHistoryFilter('current')"
          >This Page</button>
          <button
            type="button"
            class="filter-tab"
            [class.active]="historyFilter === 'all'"
            (click)="setHistoryFilter('all')"
          >All Pages</button>
        </div>

        <!-- History Items List -->
        <div class="history-items-list">
          <div *ngIf="isLoadingHistory" class="history-loading-state">
            <span class="material-symbols-outlined spinning-icon">sync</span>
            <span>Loading saved interactions...</span>
          </div>

          <div *ngIf="!isLoadingHistory && historyItems.length === 0" class="history-empty-state">
            <span class="material-symbols-outlined empty-icon">forum</span>
            <p>No chat history saved for {{ historyFilter === 'current' ? 'this page' : 'this workspace' }} yet.</p>
          </div>

          <div
            *ngFor="let item of historyItems"
            class="history-card-item"
            [class.is-implemented]="item.isImplemented"
          >
            <div class="history-item-top">
              <div class="history-badge-row">
                <span class="model-pill">{{ item.providerUsed || 'ozi-flash' }}</span>
                <span class="page-pill" [title]="item.pageRoute">{{ item.pageTitle || item.pageRoute || 'Console' }}</span>
                <span *ngIf="item.isImplemented" class="implemented-pill">
                  <span class="material-symbols-outlined">task_alt</span> Implemented
                </span>
              </div>
              <span class="history-timestamp">{{ item.createdAt | date:'short' }}</span>
            </div>

            <div class="history-prompt-text">{{ item.promptText }}</div>

            <div *ngIf="item.attachedImageUrl" class="history-thumb-wrap">
              <img [src]="item.attachedImageUrl" class="history-thumb-img" alt="Attached Mockup" />
            </div>

            <div class="history-item-actions">
              <button
                type="button"
                class="btn-history-action btn-resume"
                (click)="resumeHistoryItem(item)"
                title="Resume this conversation in chat"
              >
                <span class="material-symbols-outlined">chat</span>
                <span>Resume / Load</span>
              </button>
              <button
                type="button"
                class="btn-history-action btn-delete-item"
                (click)="deleteHistoryItem(item.id)"
                title="Delete this record"
              >
                <span class="material-symbols-outlined">delete</span>
              </button>
            </div>
          </div>
        </div>

        <div class="history-footer-bar" *ngIf="historyItems.length > 0">
          <button type="button" class="btn-clear-all-history" (click)="clearAllHistory()">
            <span class="material-symbols-outlined">delete_sweep</span>
            <span>Clear {{ historyFilter === 'current' ? 'Page' : 'All' }} History</span>
          </button>
        </div>
      </div>

      <!-- Main Messages Stream Area -->
      <div class="ai-chat-body" #chatScrollContainer *ngIf="!showHistoryDrawer">
        <div
          *ngFor="let msg of messages"
          class="chat-message-row"
          [class.is-user]="msg.sender === 'user'"
          [class.is-assistant]="msg.sender === 'assistant'"
        >
          <div class="msg-avatar">
            <span class="material-symbols-outlined">
              {{ msg.sender === 'user' ? 'person' : 'auto_awesome' }}
            </span>
          </div>

          <div class="msg-bubble">
            <div class="msg-meta">
              <span class="msg-sender-name">{{ msg.sender === 'user' ? 'You' : 'Ozi AI (' + (msg.provider || 'Ozi Flash') + ')' }}</span>
              <div class="msg-meta-actions">
                <span class="msg-time">{{ msg.timestamp | date:'shortTime' }}</span>
                <button
                  type="button"
                  class="btn-copy-msg"
                  (click)="copyMessageText(msg.text)"
                  title="Copy text to clipboard"
                >
                  <span class="material-symbols-outlined">content_copy</span>
                </button>
              </div>
            </div>

            <!-- Attached Visual Mockup Thumbnail -->
            <div *ngIf="msg.attachedImageUrl" class="msg-attached-image-wrap">
              <img [src]="msg.attachedImageUrl" class="msg-attached-thumbnail" alt="Visual Mockup" />
            </div>

            <div
              class="msg-text-content"
              [class.collapsed-6lines]="isLongMessage(msg.text) && !expandedMessages[msg.id]"
            >{{ msg.text }}</div>

            <!-- Expand / Collapse Button if message exceeds 6 lines -->
            <button
              type="button"
              class="btn-expand-toggle"
              *ngIf="isLongMessage(msg.text)"
              (click)="toggleExpandMessage(msg.id)"
            >
              <span class="material-symbols-outlined">{{ expandedMessages[msg.id] ? 'expand_less' : 'expand_more' }}</span>
              <span>{{ expandedMessages[msg.id] ? 'Minimize' : 'Expand full text (' + getLineCount(msg.text) + ' lines)' }}</span>
            </button>

            <!-- Code Result Inspection Card (If AI returned structured code) -->
            <div class="code-result-card" *ngIf="msg.codeResult">
              <div class="code-card-header">
                <div class="code-card-title-group">
                  <span class="material-symbols-outlined code-icon">code</span>
                  <span class="code-template-name">{{ msg.codeResult.templateName || 'Section Blueprint' }}</span>
                  <span class="code-category-tag" *ngIf="msg.codeResult.category">[{{ msg.codeResult.category }}]</span>
                </div>

                <!-- Code Tab Selectors -->
                <div class="code-tab-nav">
                  <button
                    type="button"
                    class="code-tab-btn"
                    [class.active]="activeCodeTab[msg.id] === 'html' || !activeCodeTab[msg.id]"
                    (click)="activeCodeTab[msg.id] = 'html'"
                  >HTML</button>
                  <button
                    type="button"
                    class="code-tab-btn"
                    [class.active]="activeCodeTab[msg.id] === 'css'"
                    (click)="activeCodeTab[msg.id] = 'css'"
                  >CSS</button>
                  <button
                    type="button"
                    class="code-tab-btn"
                    [class.active]="activeCodeTab[msg.id] === 'js'"
                    (click)="activeCodeTab[msg.id] = 'js'"
                  >JS</button>
                  <button
                    type="button"
                    class="code-tab-btn"
                    [class.active]="activeCodeTab[msg.id] === 'preview'"
                    (click)="activeCodeTab[msg.id] = 'preview'"
                  >Preview</button>
                </div>
              </div>

              <!-- Code View Panels -->
              <div class="code-card-body">
                <pre class="code-pre font-mono" *ngIf="!activeCodeTab[msg.id] || activeCodeTab[msg.id] === 'html'"><code>{{ msg.codeResult.htmlTemplate }}</code></pre>
                <pre class="code-pre font-mono" *ngIf="activeCodeTab[msg.id] === 'css'"><code>{{ msg.codeResult.cssStyles || '/* No custom CSS needed */' }}</code></pre>
                <pre class="code-pre font-mono" *ngIf="activeCodeTab[msg.id] === 'js'"><code>{{ msg.codeResult.jsScript || '// No custom JS required' }}</code></pre>

                <!-- Live Sanitized Mini Preview -->
                <div
                  class="code-preview-pane"
                  *ngIf="activeCodeTab[msg.id] === 'preview'"
                  [innerHTML]="renderSafePreview(msg.codeResult)"
                ></div>
              </div>

              <!-- Action Buttons: Copy, Auto Fill, Restore, Apply -->
              <div class="code-card-actions">
                <div class="code-card-actions-left">
                  <!-- Copy Code Button -->
                  <button
                    type="button"
                    class="btn btn-copy-code"
                    (click)="copyActiveCode(msg)"
                    [title]="'Copy active ' + ((activeCodeTab[msg.id] || 'html') | uppercase) + ' code to clipboard'"
                  >
                    <span class="material-symbols-outlined">content_copy</span>
                    <span>Copy {{ (activeCodeTab[msg.id] || 'html') | uppercase }}</span>
                  </button>
                </div>

                <div class="code-card-actions-right">
                  <!-- Auto Fill button -->
                  <button
                    type="button"
                    class="btn btn-autofill"
                    *ngIf="!msg.isImplemented"
                    (click)="implementBlueprint(msg)"
                    title="Auto-fill HTML, CSS, and JS into active studio editors and snapshot for rollback"
                  >
                    <span class="material-symbols-outlined">auto_fix_high</span>
                    <span>Auto Fill</span>
                  </button>

                  <!-- Restore Button (Always available once modified or snapshot present) -->
                  <button
                    type="button"
                    class="btn btn-restore"
                    *ngIf="msg.isImplemented || msg.previousSnapshot || msg.historyId"
                    (click)="restoreBlueprint(msg)"
                    title="Roll back changes to the previous editor snapshot"
                  >
                    <span class="material-symbols-outlined">undo</span>
                    <span>Restore</span>
                  </button>

                  <!-- Apply button (persists changes and retains snapshot for restore) -->
                  <button
                    type="button"
                    class="btn btn-apply-changes"
                    (click)="applyAndSaveBlueprint(msg)"
                    title="Apply changes directly to active template"
                  >
                    <span class="material-symbols-outlined">task_alt</span>
                    <span>Apply</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Generating / Thinking Indicator -->
        <div class="chat-generating-indicator" *ngIf="isGenerating">
          <div class="pulse-sparkle">
            <span class="material-symbols-outlined spinning-icon">sync</span>
          </div>
          <span>Ozi AI is generating with {{ selectedModel }}...</span>
        </div>
      </div>

      <!-- Chat Input Dock -->
      <div class="ai-input-dock" *ngIf="!showHistoryDrawer">
        <!-- Attached Visual Mockup Pill -->
        <div class="attached-image-chip" *ngIf="attachedImageBase64">
          <img [src]="attachedImageBase64" class="attached-chip-thumb" alt="Preview" />
          <span class="attached-chip-name">{{ attachedImageName || 'Visual Mockup' }}</span>
          <button type="button" class="btn-remove-attachment" (click)="removeAttachedImage()" title="Remove attached mockup">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="input-container-inner">
          <textarea
            #promptTextarea
            [(ngModel)]="userPrompt"
            (input)="autoGrowTextarea($event)"
            (keydown.enter)="onEnterKey($event)"
            (paste)="onPasteImage($event)"
            class="ai-prompt-textarea"
            placeholder="Describe what to build, ask questions about active screen, paste visual screenshot (Ctrl+V)..."
            rows="3"
            [disabled]="isGenerating"
          ></textarea>
          <div class="input-action-buttons">
            <!-- Paste from Clipboard button -->
            <button
              type="button"
              class="btn-input-tool"
              (click)="pasteFromClipboard()"
              title="Paste from clipboard (or Ctrl+V / Win+V)"
            >
              <span class="material-symbols-outlined">content_paste</span>
            </button>

            <!-- Attach visual mockup image -->
            <label class="btn-input-tool" title="Attach visual mockup image or wireframe">
              <input type="file" accept="image/*" (change)="onFileSelected($event)" style="display: none;" />
              <span class="material-symbols-outlined">add_photo_alternate</span>
            </label>

            <!-- Send button -->
            <button
              type="button"
              class="btn-send-prompt"
              (click)="submitPrompt()"
              [disabled]="isGenerating || (!userPrompt.trim() && !attachedImageBase64)"
              title="Send Prompt (Enter, Shift+Enter for newline)"
            >
              <span class="material-symbols-outlined">send</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: contents;
    }

    /* Launch Floating Pill */
    .ai-launch-pill {
      position: fixed;
      bottom: 24px;
      right: 28px;
      z-index: 9998;
      display: inline-flex;
      align-items: center;
      gap: 9px;
      padding: 10px 18px;
      background: linear-gradient(135deg, #090d16 0%, #171d2d 100%);
      border: 1px solid rgba(0, 80, 229, 0.45);
      border-radius: 9999px;
      color: #ffffff;
      font-size: 13.5px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 10px 30px rgba(0, 80, 229, 0.35);
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      backdrop-filter: blur(12px);
    }
    .ai-launch-pill:hover {
      transform: translateY(-2px);
      border-color: rgba(56, 189, 248, 0.6);
      box-shadow: 0 14px 36px rgba(0, 80, 229, 0.45);
    }
    .pill-icon {
      color: #38bdf8;
      font-size: 20px;
      animation: sparkleRotate 4s linear infinite;
    }
    .pill-badge {
      background: rgba(0, 80, 229, 0.25);
      border: 1px solid rgba(0, 80, 229, 0.5);
      border-radius: 9999px;
      padding: 2px 8px;
      font-size: 11px;
      color: #93c5fd;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    @keyframes sparkleRotate {
      0% { transform: rotate(0deg) scale(1); }
      50% { transform: rotate(180deg) scale(1.1); }
      100% { transform: rotate(360deg) scale(1); }
    }

    /* AI Panel Wrapper */
    .ai-panel-wrapper {
      background: #090d16;
      border: 1px solid rgba(0, 80, 229, 0.35);
      display: flex;
      flex-direction: column;
      color: #f1f5f9;
      overflow: hidden;
      box-sizing: border-box;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .ai-panel-wrapper.mode-floating {
      position: fixed;
      bottom: 24px;
      right: 28px;
      width: 480px;
      height: 680px;
      max-height: calc(100vh - 48px);
      border-radius: 20px;
      backdrop-filter: blur(20px);
      z-index: 9999;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8), 0 0 40px rgba(0, 80, 229, 0.25);
    }
    .ai-panel-wrapper.mode-docked-right {
      position: relative;
      flex: 0 0 380px;
      width: 380px;
      min-width: 320px;
      max-width: 460px;
      height: 100%;
      max-height: 100%;
      border-radius: 12px;
      border: 1px solid rgba(0, 80, 229, 0.4);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4), 0 0 24px rgba(0, 80, 229, 0.12);
      z-index: 10;
    }
    .ai-panel-wrapper.mode-docked-bottom {
      position: relative;
      flex: 0 0 340px;
      width: 100%;
      height: 340px;
      min-height: 240px;
      max-height: 480px;
      border-radius: 12px;
      border: 1px solid rgba(0, 80, 229, 0.45);
      box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.4), 0 0 24px rgba(0, 80, 229, 0.12);
      z-index: 10;
    }

    /* Panel Header Bar */
    .ai-panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      background: linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(9, 13, 22, 0.98) 100%);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      gap: 8px;
      min-height: 46px;
      box-sizing: border-box;
    }
    .header-branding {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
      flex: 1 1 auto;
      overflow: hidden;
    }
    .ai-avatar-icon {
      width: 28px;
      height: 28px;
      min-width: 28px;
      border-radius: 8px;
      background: linear-gradient(135deg, #0050e5 0%, #38bdf8 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      box-shadow: 0 4px 12px rgba(0, 80, 229, 0.4);
    }
    .ai-avatar-icon span {
      font-size: 16px;
    }
    .header-titles {
      display: flex;
      flex-direction: column;
      min-width: 0;
      overflow: hidden;
      line-height: 1.15;
    }
    .ai-title-row {
      display: flex;
      align-items: center;
      gap: 5px;
      white-space: nowrap;
    }
    .ai-main-title {
      font-size: 13.5px;
      font-weight: 800;
      letter-spacing: -0.01em;
      margin: 0;
      color: #ffffff;
      line-height: 1;
    }
    .ai-status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 6px #10b981;
    }
    .ai-sub-context {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      font-size: 10.5px;
      color: #94a3b8;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 120px;
    }
    .ai-sub-context span:last-child {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .ctx-icon {
      font-size: 12px;
      color: #38bdf8;
      min-width: 12px;
    }
    .header-controls {
      display: flex;
      align-items: center;
      gap: 5px;
      flex: 0 0 auto;
      margin-left: auto;
    }
    .model-select-wrapper {
      position: relative;
    }
    .model-select-dropdown {
      background: #1e293b;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 6px;
      color: #38bdf8;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 6px;
      height: 26px;
      outline: none;
      cursor: pointer;
    }
    .layout-toggle-group {
      display: flex;
      align-items: center;
      background: rgba(30, 41, 59, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 6px;
      padding: 1px;
      gap: 1px;
    }
    .layout-btn {
      width: 24px;
      height: 24px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      border-radius: 4px;
      color: #94a3b8;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .layout-btn span {
      font-size: 15px;
    }
    .layout-btn:hover {
      color: #ffffff;
      background: rgba(255, 255, 255, 0.1);
    }
    .layout-btn.active {
      color: #38bdf8;
      background: rgba(0, 80, 229, 0.35);
    }
    .layout-btn.btn-new-chat {
      color: #38bdf8;
      background: rgba(0, 80, 229, 0.2);
      border: 1px solid rgba(0, 80, 229, 0.4);
    }
    .layout-btn.btn-new-chat:hover {
      background: rgba(0, 80, 229, 0.45);
      color: #ffffff;
      box-shadow: 0 0 8px rgba(56, 189, 248, 0.4);
    }
    .layout-btn.btn-history.active {
      color: #38bdf8;
      background: rgba(0, 80, 229, 0.4);
    }
    .layout-btn.btn-close:hover {
      color: #f87171;
      background: rgba(239, 68, 68, 0.15);
    }

    /* Quick Action Suggestions Bar */
    .ai-quick-actions {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      background: rgba(15, 23, 42, 0.6);
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      overflow-x: auto;
      white-space: nowrap;
      scrollbar-width: none;
    }
    .ai-quick-actions::-webkit-scrollbar {
      display: none;
    }
    .quick-action-chip {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 10px;
      background: rgba(30, 41, 59, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 9999px;
      color: #cbd5e1;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }
    .quick-action-chip:hover {
      background: rgba(0, 80, 229, 0.25);
      border-color: rgba(0, 80, 229, 0.5);
      color: #ffffff;
      transform: translateY(-1px);
    }
    .chip-icon {
      font-size: 13px;
      color: #38bdf8;
    }
    .chip-clear:hover {
      background: rgba(239, 68, 68, 0.2);
      border-color: rgba(239, 68, 68, 0.4);
      color: #fca5a5;
    }
    .chip-clear .chip-icon {
      color: #f87171;
    }

    /* Chat History Drawer */
    .ai-history-drawer {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: #090d16;
      animation: fadeIn 0.2s ease;
    }
    .history-drawer-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: #0f172a;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .history-title-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .history-header-icon {
      color: #38bdf8;
      font-size: 20px;
    }
    .history-title-group h4 {
      margin: 0;
      font-size: 13.5px;
      font-weight: 700;
      color: #ffffff;
    }
    .history-header-actions {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .btn-icon-action {
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      padding: 4px;
      border-radius: 6px;
      display: flex;
      align-items: center;
    }
    .btn-icon-action:hover {
      color: #ffffff;
      background: rgba(255, 255, 255, 0.1);
    }
    .history-filter-bar {
      display: flex;
      gap: 4px;
      padding: 8px 16px;
      background: rgba(15, 23, 42, 0.4);
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    .filter-tab {
      padding: 4px 12px;
      border-radius: 6px;
      font-size: 11.5px;
      font-weight: 600;
      background: transparent;
      border: 1px solid transparent;
      color: #94a3b8;
      cursor: pointer;
    }
    .filter-tab.active {
      background: rgba(0, 80, 229, 0.3);
      border-color: rgba(0, 80, 229, 0.5);
      color: #38bdf8;
    }
    .history-items-list {
      flex: 1;
      overflow-y: auto;
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .history-loading-state, .history-empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      color: #64748b;
      gap: 10px;
      text-align: center;
      font-size: 12.5px;
    }
    .empty-icon {
      font-size: 36px;
      color: #475569;
    }
    .history-card-item {
      background: #131b2e;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      transition: all 0.2s ease;
    }
    .history-card-item:hover {
      border-color: rgba(0, 80, 229, 0.4);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
    }
    .history-card-item.is-implemented {
      border-left: 3px solid #10b981;
    }
    .history-item-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .history-badge-row {
      display: flex;
      align-items: center;
      gap: 5px;
      flex-wrap: wrap;
    }
    .model-pill {
      font-size: 10px;
      font-weight: 700;
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.15);
      padding: 2px 6px;
      border-radius: 4px;
      text-transform: uppercase;
    }
    .page-pill {
      font-size: 10px;
      color: #94a3b8;
      background: rgba(255, 255, 255, 0.05);
      padding: 2px 6px;
      border-radius: 4px;
      max-width: 140px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .implemented-pill {
      font-size: 10px;
      font-weight: 700;
      color: #10b981;
      background: rgba(16, 185, 129, 0.15);
      padding: 2px 6px;
      border-radius: 4px;
      display: inline-flex;
      align-items: center;
      gap: 3px;
    }
    .implemented-pill span {
      font-size: 12px;
    }
    .history-timestamp {
      font-size: 10.5px;
      color: #64748b;
      white-space: nowrap;
    }
    .history-prompt-text {
      font-size: 12px;
      color: #e2e8f0;
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .history-thumb-wrap {
      display: inline-block;
    }
    .history-thumb-img {
      max-height: 60px;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.15);
    }
    .history-item-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-top: 4px;
    }
    .btn-history-action {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 6px;
      cursor: pointer;
      border: none;
      transition: all 0.15s ease;
    }
    .btn-history-action.btn-resume {
      background: rgba(0, 80, 229, 0.25);
      color: #93c5fd;
      border: 1px solid rgba(0, 80, 229, 0.4);
    }
    .btn-history-action.btn-resume:hover {
      background: rgba(0, 80, 229, 0.45);
      color: #ffffff;
    }
    .btn-history-action.btn-delete-item {
      background: transparent;
      color: #64748b;
    }
    .btn-history-action.btn-delete-item:hover {
      color: #f87171;
      background: rgba(239, 68, 68, 0.15);
    }
    .btn-history-action span {
      font-size: 14px;
    }
    .history-footer-bar {
      padding: 10px 16px;
      background: #0f172a;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      justify-content: flex-end;
    }
    .btn-clear-all-history {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 11.5px;
      font-weight: 600;
      color: #f87171;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: 6px;
      padding: 5px 12px;
      cursor: pointer;
    }
    .btn-clear-all-history:hover {
      background: rgba(239, 68, 68, 0.25);
    }

    /* Main Messages Stream Area */
    .ai-chat-body {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .chat-message-row {
      display: flex;
      gap: 10px;
      max-width: 92%;
    }
    .chat-message-row.is-user {
      align-self: flex-end;
      flex-direction: row-reverse;
    }
    .chat-message-row.is-assistant {
      align-self: flex-start;
    }
    .msg-avatar {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      font-size: 16px;
    }
    .is-user .msg-avatar {
      background: #334155;
      color: #ffffff;
    }
    .is-assistant .msg-avatar {
      background: linear-gradient(135deg, #0050e5 0%, #38bdf8 100%);
      color: #ffffff;
    }
    .msg-bubble {
      background: #131b2e;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 14px;
      padding: 10px 14px;
      font-size: 12.5px;
      line-height: 1.5;
      color: #e2e8f0;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      max-width: 100%;
    }
    .is-user .msg-bubble {
      background: #1e293b;
      border-color: rgba(0, 80, 229, 0.3);
    }
    .msg-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 6px;
    }
    .msg-sender-name {
      font-size: 11px;
      font-weight: 700;
      color: #38bdf8;
    }
    .msg-meta-actions {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .msg-time {
      font-size: 10px;
      color: #64748b;
    }
    .btn-copy-msg {
      background: transparent;
      border: none;
      color: #64748b;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 2px;
      border-radius: 4px;
      transition: all 0.15s ease;
    }
    .btn-copy-msg:hover {
      color: #38bdf8;
      background: rgba(255, 255, 255, 0.08);
    }
    .btn-copy-msg span {
      font-size: 13px;
    }
    .msg-attached-image-wrap {
      margin-bottom: 8px;
    }
    .msg-attached-thumbnail {
      max-width: 220px;
      max-height: 160px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      object-fit: cover;
    }
    .msg-text-content {
      word-break: break-word;
      white-space: pre-wrap;
      font-family: inherit;
      line-height: 1.5;
    }
    .msg-text-content.collapsed-6lines {
      max-height: 118px;
      overflow: hidden;
      position: relative;
      -webkit-line-clamp: 6;
      -webkit-box-orient: vertical;
      display: -webkit-box;
      mask-image: linear-gradient(180deg, #000 65%, transparent 100%);
      -webkit-mask-image: linear-gradient(180deg, #000 65%, transparent 100%);
    }
    .btn-expand-toggle {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      margin-top: 6px;
      background: rgba(56, 189, 248, 0.1);
      border: 1px solid rgba(56, 189, 248, 0.25);
      color: #38bdf8;
      font-size: 11px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-expand-toggle:hover {
      background: rgba(56, 189, 248, 0.2);
      color: #ffffff;
    }
    .btn-expand-toggle span {
      font-size: 14px;
    }

    /* Code Result Card */
    .code-result-card {
      margin-top: 12px;
      background: #0b101c;
      border: 1px solid rgba(0, 80, 229, 0.35);
      border-radius: 10px;
      overflow: hidden;
    }
    .code-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      background: #0f172a;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    .code-card-title-group {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11.5px;
      font-weight: 700;
      color: #ffffff;
    }
    .code-icon {
      font-size: 15px;
      color: #38bdf8;
    }
    .code-category-tag {
      font-size: 10px;
      color: #94a3b8;
    }
    .code-tab-nav {
      display: flex;
      gap: 2px;
      background: rgba(30, 41, 59, 0.6);
      border-radius: 6px;
      padding: 2px;
    }
    .code-tab-btn {
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 10.5px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 4px;
      cursor: pointer;
    }
    .code-tab-btn.active {
      background: #0050e5;
      color: #ffffff;
    }
    .code-card-body {
      padding: 10px;
      max-height: 240px;
      overflow-y: auto;
    }
    .code-pre {
      margin: 0;
      font-size: 11px;
      color: #93c5fd;
      white-space: pre-wrap;
      word-break: break-all;
    }
    .code-preview-pane {
      background: #ffffff;
      color: #1e293b;
      padding: 12px;
      border-radius: 6px;
      font-size: 12px;
      max-height: 220px;
      overflow-y: auto;
    }
    .code-card-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 8px 12px;
      background: #0d1424;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
    }
    .code-card-actions-left {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .code-card-actions-right {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .btn-copy-code {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 5px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      background: rgba(255, 255, 255, 0.08);
      color: #cbd5e1;
      border: 1px solid rgba(255, 255, 255, 0.12);
      transition: all 0.15s ease;
    }
    .btn-copy-code:hover {
      background: rgba(56, 189, 248, 0.18);
      border-color: rgba(56, 189, 248, 0.4);
      color: #38bdf8;
    }
    .btn-copy-code span {
      font-size: 14px;
    }
    .btn-autofill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 5px 12px;
      border-radius: 6px;
      font-size: 11.5px;
      font-weight: 700;
      cursor: pointer;
      background: linear-gradient(135deg, #0050e5 0%, #2563eb 100%);
      color: #ffffff;
      border: none;
      box-shadow: 0 2px 8px rgba(0, 80, 229, 0.4);
      transition: all 0.2s ease;
    }
    .btn-autofill:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 80, 229, 0.6);
    }
    .btn-autofill span {
      font-size: 15px;
    }
    .implemented-group {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .badge-implemented {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      background: rgba(16, 185, 129, 0.15);
      color: #10b981;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .badge-implemented span {
      font-size: 14px;
    }
    .btn-restore {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      background: rgba(245, 158, 11, 0.15);
      color: #fbbf24;
      border: 1px solid rgba(245, 158, 11, 0.3);
      cursor: pointer;
    }
    .btn-restore:hover {
      background: rgba(245, 158, 11, 0.3);
      color: #ffffff;
    }
    .btn-restore span {
      font-size: 14px;
    }
    .btn-apply-changes {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 5px 12px;
      border-radius: 6px;
      font-size: 11.5px;
      font-weight: 700;
      background: linear-gradient(135deg, #059669 0%, #10b981 100%);
      color: #ffffff;
      border: none;
      box-shadow: 0 2px 8px rgba(16, 185, 129, 0.35);
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .btn-apply-changes:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.55);
    }
    .btn-apply-changes span {
      font-size: 15px;
    }

    /* Generating / Thinking Indicator */
    .chat-generating-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: rgba(0, 80, 229, 0.15);
      border: 1px solid rgba(0, 80, 229, 0.3);
      border-radius: 8px;
      font-size: 11.5px;
      color: #93c5fd;
    }
    .spinning-icon {
      animation: spin 1.2s linear infinite;
    }
    @keyframes spin {
      100% { transform: rotate(360deg); }
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Chat Input Dock */
    .ai-input-dock {
      padding: 12px 16px;
      background: #0b1120;
      border-top: 1px solid rgba(255, 255, 255, 0.09);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .attached-image-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(30, 41, 59, 0.9);
      border: 1px solid rgba(0, 80, 229, 0.4);
      border-radius: 8px;
      padding: 4px 8px;
      align-self: flex-start;
      font-size: 11px;
      color: #93c5fd;
    }
    .attached-chip-thumb {
      width: 24px;
      height: 24px;
      border-radius: 4px;
      object-fit: cover;
    }
    .attached-chip-name {
      max-width: 180px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .btn-remove-attachment {
      background: transparent;
      border: none;
      color: #f87171;
      cursor: pointer;
      padding: 0;
      display: flex;
      align-items: center;
    }
    .btn-remove-attachment span {
      font-size: 14px;
    }
    .input-container-inner {
      display: flex;
      align-items: flex-end;
      gap: 10px;
      background: #172033;
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 14px;
      padding: 10px 14px;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .input-container-inner:focus-within {
      border-color: #3b82f6;
      background: #1e293b;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25);
    }
    .ai-prompt-textarea {
      flex: 1;
      background: transparent;
      border: none;
      color: #f8fafc;
      font-size: 13px;
      font-family: inherit;
      line-height: 1.5;
      min-height: 72px;
      max-height: 220px;
      resize: none;
      outline: none;
      padding: 0;
      margin: 0;
      scrollbar-width: thin;
      scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
    }
    .ai-prompt-textarea::-webkit-scrollbar {
      width: 5px;
    }
    .ai-prompt-textarea::-webkit-scrollbar-track {
      background: transparent;
    }
    .ai-prompt-textarea::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 4px;
    }
    .ai-prompt-textarea::placeholder {
      color: #64748b;
      font-size: 13px;
      line-height: 1.5;
    }
    .input-action-buttons {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 2px;
      flex-shrink: 0;
    }
    .btn-input-tool {
      width: 34px;
      height: 34px;
      border-radius: 9px;
      background: rgba(255, 255, 255, 0.07);
      color: #94a3b8;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-input-tool:hover {
      background: rgba(0, 80, 229, 0.3);
      color: #38bdf8;
    }
    .btn-input-tool span {
      font-size: 20px;
    }
    .btn-send-prompt {
      width: 36px;
      height: 36px;
      border-radius: 9px;
      background: linear-gradient(135deg, #0050e5 0%, #2563eb 100%);
      color: #ffffff;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0, 80, 229, 0.35);
      transition: all 0.2s ease;
    }
    .btn-send-prompt:hover:not(:disabled) {
      background: linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%);
      transform: scale(1.06);
      box-shadow: 0 4px 14px rgba(0, 80, 229, 0.5);
    }
    .btn-send-prompt:disabled {
      background: rgba(255, 255, 255, 0.08);
      color: #475569;
      box-shadow: none;
      cursor: not-allowed;
    }
  `]
})
export class AiAssistantComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('chatScrollContainer') private chatScrollContainer?: ElementRef;
  @ViewChild('promptTextarea') private promptTextareaRef?: ElementRef;

  public isOpen: boolean = false;
  public layoutMode: 'floating' | 'docked-right' | 'docked-bottom' | 'minimized' = 'docked-right';
  public selectedModel: 'ozi-flash' | 'ozi-coder' | 'ozi-deep' | 'gemini' | 'deepseek' | 'qwen' = 'ozi-flash';
  public activeContext: PageContextProvider | null = null;
  public messages: AiChatMessage[] = [];
  public isGenerating: boolean = false;
  public userPrompt: string = '';

  /** Visual image mockup attachment state */
  public attachedImageBase64: string | null = null;
  public attachedImageName: string | null = null;

  /** History drawer state */
  public showHistoryDrawer: boolean = false;
  public isLoadingHistory: boolean = false;
  public historyFilter: 'current' | 'all' = 'current';
  public historyItems: any[] = [];

  /** Active sub-tab state for each code result card */
  public activeCodeTab: { [messageId: string]: 'html' | 'css' | 'js' | 'preview' } = {};

  /** Expanded state for long text messages (>6 lines) */
  public expandedMessages: { [messageId: string]: boolean } = {};

  private subscriptions: Subscription = new Subscription();
  private shouldScrollToBottom: boolean = false;

  constructor(
    private readonly aiService: AiAssistantContextService,
    private readonly sanitizer: DomSanitizer,
    private readonly toast: ToastService
  ) {}

  ngOnInit(): void {
    this.subscriptions.add(
      this.aiService.isOpen$.subscribe(open => this.isOpen = open)
    );
    this.subscriptions.add(
      this.aiService.layoutMode$.subscribe(mode => this.layoutMode = mode)
    );
    this.subscriptions.add(
      this.aiService.selectedModel$.subscribe(model => this.selectedModel = model)
    );
    this.subscriptions.add(
      this.aiService.activeContext$.subscribe(ctx => {
        this.activeContext = ctx;
        if (this.showHistoryDrawer) {
          this.fetchHistory();
        }
      })
    );
    this.subscriptions.add(
      this.aiService.messages$.subscribe(msgs => {
        this.messages = msgs;
        this.shouldScrollToBottom = true;
      })
    );
    this.subscriptions.add(
      this.aiService.isGenerating$.subscribe(gen => {
        this.isGenerating = gen;
        if (gen) this.shouldScrollToBottom = true;
      })
    );
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  public toggleAssistant(): void {
    this.aiService.toggleOpen();
  }

  public closeAssistant(): void {
    this.aiService.setOpen(false);
  }

  public setLayoutMode(mode: 'floating' | 'docked-right' | 'docked-bottom' | 'minimized'): void {
    this.aiService.setLayoutMode(mode);
  }

  public onModelChange(model: 'gemini' | 'deepseek' | 'qwen' | 'ozi-flash' | 'ozi-coder' | 'ozi-deep'): void {
    this.selectedModel = model;
    this.aiService.setSelectedModel(model);
  }

  public toggleHistoryDrawer(): void {
    this.showHistoryDrawer = !this.showHistoryDrawer;
    if (this.showHistoryDrawer) {
      this.fetchHistory();
    }
  }

  public setHistoryFilter(filter: 'current' | 'all'): void {
    this.historyFilter = filter;
    this.fetchHistory();
  }

  public fetchHistory(): void {
    this.isLoadingHistory = true;
    const pageRoute = this.historyFilter === 'current' ? (this.activeContext?.pageId || '') : undefined;

    this.aiService.loadHistory(pageRoute).subscribe({
      next: (res) => {
        this.isLoadingHistory = false;
        this.historyItems = res?.data || [];
      },
      error: () => {
        this.isLoadingHistory = false;
        this.toast.error('Failed to load chat history.');
      }
    });
  }

  public resumeHistoryItem(item: any): void {
    this.showHistoryDrawer = false;
    this.aiService.resumeHistoryRecord(item);
  }

  public deleteHistoryItem(historyId: string): void {
    this.aiService.clearServerHistory(undefined, historyId).subscribe({
      next: () => {
        this.historyItems = this.historyItems.filter(h => h.id !== historyId);
        this.toast.success('History record deleted.');
      },
      error: () => {
        this.toast.error('Failed to delete history record.');
      }
    });
  }

  public clearAllHistory(): void {
    const pageRoute = this.historyFilter === 'current' ? (this.activeContext?.pageId || '') : undefined;
    this.aiService.clearServerHistory(pageRoute).subscribe({
      next: () => {
        this.historyItems = [];
        this.toast.success('Chat history cleared.');
      },
      error: () => {
        this.toast.error('Failed to clear history.');
      }
    });
  }

  /**
   * Handles clipboard paste events (e.g. Ctrl+V visual mockup screenshot or text code).
   */
  public onPasteImage(event: ClipboardEvent): void {
    const items = event.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            event.preventDefault();
            this.processImageFile(file, 'Pasted Screenshot');
            return;
          }
        }
      }
    }

    // Auto-expand textarea immediately when text is pasted
    setTimeout(() => {
      if (this.promptTextareaRef) {
        this.autoGrowTextarea({ target: this.promptTextareaRef.nativeElement } as any);
      }
    }, 0);
  }

  /**
   * 1-Click Paste from System / Windows Clipboard into Prompt Textarea.
   */
  public async pasteFromClipboard(): Promise<void> {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        this.userPrompt = (this.userPrompt ? this.userPrompt + '\n' : '') + text;
        this.toast.info('Pasted code / prompt from clipboard!');
        setTimeout(() => {
          if (this.promptTextareaRef) {
            const el = this.promptTextareaRef.nativeElement;
            el.style.height = 'auto';
            el.style.height = `${Math.min(Math.max(el.scrollHeight, 72), 220)}px`;
            el.focus();
          }
        }, 0);
      } else {
        this.toast.warning('Clipboard does not contain readable text.');
      }
    } catch {
      // If browser clipboard permission blocked, fallback to focusing textarea for Ctrl+V
      if (this.promptTextareaRef) {
        this.promptTextareaRef.nativeElement.focus();
      }
      this.toast.info('Press Ctrl+V to paste into the active prompt box.');
    }
  }

  /**
   * Handles visual mockup file attachment selection.
   */
  public onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.processImageFile(file, file.name);
      input.value = '';
    }
  }

  private processImageFile(file: File, label: string): void {
    const reader = new FileReader();
    reader.onload = () => {
      this.attachedImageBase64 = reader.result as string;
      this.attachedImageName = label;
      this.toast.info('Visual mockup screenshot attached! Ready for vision analysis.');
    };
    reader.readAsDataURL(file);
  }

  public removeAttachedImage(): void {
    this.attachedImageBase64 = null;
    this.attachedImageName = null;
  }

  public onEnterKey(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    if (!keyboardEvent.shiftKey) {
      keyboardEvent.preventDefault();
      this.submitPrompt();
    }
  }

  public autoGrowTextarea(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    if (textarea) {
      textarea.style.height = 'auto';
      const nextHeight = Math.min(Math.max(textarea.scrollHeight, 72), 220);
      textarea.style.height = `${nextHeight}px`;
    }
  }

  public submitPrompt(): void {
    const prompt = this.userPrompt?.trim();
    const image = this.attachedImageBase64;
    if ((!prompt && !image) || this.isGenerating) return;

    this.userPrompt = '';
    this.attachedImageBase64 = null;
    this.attachedImageName = null;

    if (this.promptTextareaRef) {
      this.promptTextareaRef.nativeElement.style.height = '72px';
    }

    this.aiService.sendPrompt(prompt, undefined, image || undefined);
  }

  /**
   * Dynamically resolves the quick action chips tailored specifically to the active screen.
   */
  public getQuickChips(): { label: string; icon: string; prompt?: string; action?: () => void; tooltip?: string }[] {
    const chips: { label: string; icon: string; prompt?: string; action?: () => void; tooltip?: string }[] = [];
    const ctx = this.activeContext;

    // 1. If active page registered custom quick prompts, display them
    if (ctx?.quickPrompts && ctx.quickPrompts.length > 0) {
      ctx.quickPrompts.forEach(p => {
        if (typeof p === 'string') {
          let icon = 'auto_awesome';
          const lower = p.toLowerCase();
          if (lower.includes('paste') || lower.includes('study') || lower.includes('token')) icon = 'content_paste';
          else if (lower.includes('price') || lower.includes('pricing')) icon = 'payments';
          else if (lower.includes('bento') || lower.includes('grid')) icon = 'grid_view';
          else if (lower.includes('mobile') || lower.includes('css') || lower.includes('responsive')) icon = 'smartphone';
          else if (lower.includes('seo') || lower.includes('meta')) icon = 'search';
          else if (lower.includes('user') || lower.includes('invite')) icon = 'person_add';
          else if (lower.includes('product') || lower.includes('store')) icon = 'storefront';
          else if (lower.includes('summarize') || lower.includes('overview')) icon = 'summarize';

          chips.push({
            label: p.length > 28 ? p.substring(0, 25) + '...' : p,
            icon,
            prompt: p,
            tooltip: p
          });
        }
      });
    }

    // 2. If active page registered custom executable actions
    if (ctx?.actions && ctx.actions.length > 0) {
      ctx.actions.forEach(act => {
        chips.push({
          label: act.label,
          icon: act.icon || 'play_arrow',
          action: () => act.execute(),
          tooltip: act.tooltip || act.label
        });
      });
    }

    // 3. Dynamic contextual fallback based on active URL / screen title
    if (chips.length === 0) {
      const route = (typeof window !== 'undefined' ? window.location.pathname.toLowerCase() : '') || ctx?.pageId?.toLowerCase() || '';
      const title = ctx?.pageTitle?.toLowerCase() || '';

      if (route.includes('template') || route.includes('section') || title.includes('template') || title.includes('blueprint')) {
        chips.push(
          { label: 'Study & Tokenize Code', icon: 'content_paste', action: () => this.pasteAndStudyPrompt(), tooltip: 'Paste raw HTML/CSS from any site to analyze and tokenize' },
          { label: 'Pricing Table', icon: 'payments', prompt: 'Generate a modern SaaS pricing table section with monthly/annual toggle and dark theme styling.' },
          { label: 'Bento Grid', icon: 'grid_view', prompt: 'Build a glassmorphism bento grid showcase with glowing neon hover borders and 4 feature items.' },
          { label: 'Fix Mobile CSS', icon: 'smartphone', prompt: 'Refactor the current section CSS for flawless mobile responsiveness and flex wrap.' }
        );
      } else if (route.includes('page') || route.includes('content') || title.includes('page')) {
        chips.push(
          { label: 'Generate Page Layout', icon: 'web', prompt: 'Suggest a high-converting page layout and section sequence for this page.' },
          { label: 'Audit SEO Meta', icon: 'search', prompt: 'Audit the meta title, description, and headings on this page for optimal search rankings.' },
          { label: 'Suggest Copy', icon: 'edit_note', prompt: 'Draft compelling headlines and body copy for the active sections on this page.' }
        );
      } else if (route.includes('user') || route.includes('identity') || route.includes('member') || title.includes('user')) {
        chips.push(
          { label: 'Audit Roles & Permissions', icon: 'security', prompt: 'Explain the access permissions and security best practices for active user roles.' },
          { label: 'Invite Guide', icon: 'person_add', prompt: 'Guide me on inviting and onboarding new team members to this workspace.' }
        );
      } else if (route.includes('product') || route.includes('order') || title.includes('product')) {
        chips.push(
          { label: 'Draft Product Description', icon: 'description', prompt: 'Generate an engaging, SEO-optimized product title, description, and feature bullets.' },
          { label: 'Pricing Strategy', icon: 'trending_up', prompt: 'Suggest competitive pricing tiers and promotional discount ideas.' }
        );
      } else if (route.includes('database') || route.includes('tenant') || route.includes('setting')) {
        chips.push(
          { label: 'System Health Check', icon: 'health_and_safety', prompt: 'Analyze database health status and migration synchronization.' },
          { label: 'Security Audit', icon: 'lock', prompt: 'Review tenant connection string isolation and security configurations.' }
        );
      } else {
        chips.push(
          { label: 'Inspect This Screen', icon: 'fact_check', prompt: 'Inspect all visible input fields, placeholders, and current values on this active screen.' },
          { label: 'Explain Page Features', icon: 'help', prompt: 'Explain what this page does and what actions I can perform here.' },
          { label: 'Summarize Status', icon: 'summarize', prompt: 'Provide a concise overview of the current screen status and next recommended steps.' }
        );
      }
    }

    return chips;
  }

  public handleChipClick(chip: { label: string; icon: string; prompt?: string; action?: () => void; tooltip?: string }): void {
    if (chip.action) {
      chip.action();
    } else if (chip.prompt) {
      this.sendQuickPrompt(chip.prompt);
    }
  }

  public sendQuickPrompt(promptText: string): void {
    this.aiService.sendPrompt(promptText);
  }

  public pasteAndStudyPrompt(): void {
    const state = this.activeContext?.getState();
    const prompt = 'Please study the following HTML, CSS, and JS code. Remove hardcoded text and replace with standard Ozikol Handlebars tokens ({{ Title }}, {{ Description }}, {{#each PageSectionLists}}), extract scoped CSS styles, and return a clean blueprint.';
    this.aiService.sendPrompt(prompt, {
      html: state?.html,
      css: state?.css,
      js: state?.js
    });
  }

  public startNewChat(): void {
    this.aiService.clearChat();
    this.showHistoryDrawer = false;
    this.userPrompt = '';
    this.attachedImageBase64 = null;
    this.attachedImageName = null;
    this.toast.info('Started fresh chat session.');
  }

  public clearChat(): void {
    this.aiService.clearChat();
  }

  public isLongMessage(text?: string): boolean {
    if (!text) return false;
    const lines = text.split('\n').length;
    return lines > 6 || text.length > 320;
  }

  public getLineCount(text?: string): number {
    if (!text) return 0;
    return text.split('\n').length;
  }

  public toggleExpandMessage(messageId: string): void {
    this.expandedMessages[messageId] = !this.expandedMessages[messageId];
  }

  public copyMessageText(text?: string): void {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      this.toast.success('Copied text to clipboard!');
    }).catch(() => {
      this.toast.error('Failed to copy text.');
    });
  }

  public copyActiveCode(message: AiChatMessage): void {
    if (!message.codeResult) return;
    const tab = this.activeCodeTab[message.id] || 'html';
    let codeToCopy = '';
    if (tab === 'html') {
      codeToCopy = message.codeResult.htmlTemplate || '';
    } else if (tab === 'css') {
      codeToCopy = message.codeResult.cssStyles || '';
    } else if (tab === 'js') {
      codeToCopy = message.codeResult.jsScript || '';
    } else {
      codeToCopy = message.codeResult.htmlTemplate || '';
    }

    if (codeToCopy) {
      navigator.clipboard.writeText(codeToCopy).then(() => {
        this.toast.success(`Copied ${tab.toUpperCase()} code to clipboard!`);
      }).catch(() => {
        this.toast.error('Failed to copy code to clipboard.');
      });
    }
  }

  public implementBlueprint(message: AiChatMessage): void {
    this.aiService.implementBlueprint(message);
  }

  public restoreBlueprint(message: AiChatMessage): void {
    this.aiService.restoreBlueprint(message);
  }

  public async saveCodeToDatabase(codeResult: any): Promise<void> {
    await this.aiService.saveToDatabase(codeResult);
  }

  public async applyAndSaveBlueprint(message: AiChatMessage): Promise<void> {
    if (!message.codeResult) return;
    
    // Auto-fill into editor first to take a snapshot for rollback
    this.aiService.implementBlueprint(message);

    // Persist changes directly to active template
    await this.aiService.saveToDatabase(message.codeResult);
    this.toast.success('Applied changes successfully! You can click Restore anytime to undo.');
  }

  public renderSafePreview(codeResult: any): SafeHtml {
    const rawHtml = codeResult.htmlTemplate || '';
    const cleanStyles = (codeResult.cssStyles || '').replace(/<\/?style[^>]*>/gi, '');
    const combined = `
      <style>${cleanStyles}</style>
      <div>${rawHtml.replace(/\{\{\s*Title\s*\}\}/g, 'AI Preview Title').replace(/\{\{\s*Description\s*\}\}/g, 'Sample section simulated content description.')}</div>
    `;
    return this.sanitizer.bypassSecurityTrustHtml(combined);
  }

  private scrollToBottom(): void {
    try {
      if (this.chatScrollContainer) {
        this.chatScrollContainer.nativeElement.scrollTop = this.chatScrollContainer.nativeElement.scrollHeight;
      }
    } catch {
      // Ignore scroll errors
    }
  }
}
