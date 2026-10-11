import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { VisualEditorComponent } from '../../visual-editor/visual-editor.component';
import { ApiService } from '../../../../../../core/services/api.service';
import { ToastService } from '../../../../../../core/services/toast.service';
import { UniversalPreviewModalService } from '../../services/universal-preview-modal.service';

/**
 * Dedicated category studio component for creating and editing Blog Section & Article Grid templates.
 * Enforces dynamic Articles loop, category/tag chips, publication metadata, and responsive cards.
 */
@Component({
  selector: 'app-blog-visual',
  standalone: true,
  imports: [CommonModule, FormsModule, VisualEditorComponent],
  template: `
    <div class="category-visual-layout">
      <!-- 1. Metadata Configuration Card (Template Name, Variant Code, and Description) -->
      <div class="meta-config-card">
        <div class="meta-config-row">
          <div class="config-col flex-2">
            <label class="config-label">TEMPLATE NAME <span class="required">*</span></label>
            <input
              type="text"
              [(ngModel)]="templateName"
              class="form-control config-input"
              placeholder="e.g. Modern Magazine 3-Column Blog Feed"
            />
          </div>

          <div class="config-col flex-2">
            <div class="label-with-hint">
              <label class="config-label">VARIANT CODE / KEY <span class="required">*</span></label>
            </div>
            <div class="input-with-action">
              <input
                type="text"
                [(ngModel)]="variantCode"
                class="form-control config-input font-mono"
                readonly
              />
              <button
                type="button"
                class="btn-regen-key"
                (click)="regenerateVariantCode()"
                title="Regenerate random 5-character suffix"
              >
                <span class="material-symbols-outlined">refresh</span>
              </button>
            </div>
          </div>

          <div class="config-col flex-1 actions-col">
            <button
              type="button"
              class="btn btn-save-vault"
              [disabled]="isSaving"
              (click)="saveBlogTemplate()"
            >
              <span class="material-symbols-outlined btn-icon" *ngIf="!isSaving">check_circle</span>
              <span class="material-symbols-outlined btn-icon spin" *ngIf="isSaving">sync</span>
              <span>{{ isSaving ? 'Saving...' : (isEditMode ? 'Update Feed' : 'Save Feed') }}</span>
            </button>
          </div>
        </div>

        <div class="config-col col-span-full" style="margin-top: 14px;">
          <label class="config-label">DESCRIPTION (OPTIONAL)</label>
          <input
            type="text"
            [(ngModel)]="description"
            class="form-control config-input"
            placeholder="e.g. Responsive 3-column article cards grid with publication badges, thumbnails, and author avatars"
          />
        </div>
      </div>

      <!-- 2. Template Code & Content Studio Card -->
      <div class="code-editor-card">
        <!-- Studio Card Header -->
        <div class="studio-card-header">
          <div class="studio-title-block">
            <span class="material-symbols-outlined studio-code-icon">newspaper</span>
            <div>
              <h4 class="studio-title">Template Code &amp; Content Studio</h4>
              <p class="studio-subtitle">Author clean HTML markup, scoped CSS rules, and test dynamic data simulation</p>
            </div>
          </div>
          <div class="studio-header-actions">
            <button
              type="button"
              class="btn btn-preview-demo"
              (click)="openPreviewModal()"
              title="Preview simulated live demo"
            >
              <span class="material-symbols-outlined">visibility</span>
              <span>Preview Demo</span>
            </button>
            <button
              type="button"
              class="btn btn-reset-boilerplate"
              (click)="resetBoilerplate()"
              title="Reset editor back to standard boilerplate"
            >
              <span class="material-symbols-outlined">restart_alt</span>
              <span>Reset to Boilerplate</span>
            </button>
          </div>
        </div>

        <!-- Code & Content Studio Tabs -->
        <div class="editor-tabs-bar">
          <div class="tabs-group">
            <button
              type="button"
              class="editor-tab-btn"
              [class.active]="activeEditorTab === 'html'"
              (click)="activeEditorTab = 'html'"
            >
              <span class="tab-badge-pill">HTML</span>
              <span>Semantic HTML Markup</span>
            </button>
            <button
              type="button"
              class="editor-tab-btn"
              [class.active]="activeEditorTab === 'css'"
              (click)="activeEditorTab = 'css'"
            >
              <span class="tab-badge-pill">CSS</span>
              <span>Scoped CSS Styles</span>
            </button>
            <button
              type="button"
              class="editor-tab-btn"
              [class.active]="activeEditorTab === 'js'"
              (click)="activeEditorTab = 'js'"
            >
              <span class="tab-badge-pill">JS</span>
              <span>Client JS (Optional)</span>
            </button>
            <button
              type="button"
              class="editor-tab-btn tab-mock-studio"
              [class.active]="activeEditorTab === 'mock'"
              (click)="activeEditorTab = 'mock'"
            >
              <span class="material-symbols-outlined tab-icon">tune</span>
              <span>Sample Content &amp; Loops</span>
            </button>
          </div>
        </div>

        <!-- Editor Viewport (When activeEditorTab is html, css, or js) -->
        <div class="editor-pane-body" *ngIf="activeEditorTab !== 'mock'">
          <app-visual-editor
            [category]="'blog'"
            [categoryName]="'Article Cards'"
            [activeTab]="activeEditorTab"
            [hideInternalTabs]="true"
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

        <!-- Mock Content & Loop Configuration View (When activeEditorTab is 'mock') -->
        <div class="mock-content-card" *ngIf="activeEditorTab === 'mock'">
          <div class="content-drawer-header">
            <div class="drawer-title-wrap">
              <span class="material-symbols-outlined drawer-icon">edit_note</span>
              <div>
                <h3 class="drawer-title">Mock Content &amp; Loop Configuration for Blog Grid</h3>
                <p class="drawer-sub">
                  Adjust placeholder sample data to test your section design. These values are used for demo simulation and initial page defaults.
                </p>
              </div>
            </div>
            <button
              type="button"
              class="btn-reset-sample"
              (click)="resetSampleContent()"
              title="Reset mock values to category presets"
            >
              <span class="material-symbols-outlined">restart_alt</span>
              <span>Reset Data</span>
            </button>
          </div>

          <!-- Mock Data Sub-Tabs: Articles (Default) vs Section Header -->
          <div class="mock-tabs-nav">
            <button
              type="button"
              class="mock-tab-btn"
              [class.active]="activeMockTab === 'articles'"
              (click)="activeMockTab = 'articles'"
            >
              <span class="material-symbols-outlined icon-micro">newspaper</span>
              <span>Article Cards Grid</span>
              <span class="mock-tab-badge">{{ (sampleContent.articles?.length || 3) }}</span>
            </button>
            <button
              type="button"
              class="mock-tab-btn"
              [class.active]="activeMockTab === 'header'"
              (click)="activeMockTab = 'header'"
            >
              <span class="material-symbols-outlined icon-micro">title</span>
              <span>Section Header &amp; Filters</span>
            </button>
          </div>

          <!-- Sub-Tab 1: Article Cards Grid (Default) -->
          <div class="mock-tab-pane" *ngIf="activeMockTab === 'articles'">
            <div class="cards-repeater-container">
              <div class="repeater-item-card" *ngFor="let item of (sampleContent.articles || []); let idx = index">
                <div class="repeater-header">
                  <span class="material-symbols-outlined icon-badge">article</span>
                  <input
                    type="text"
                    [(ngModel)]="item.title"
                    class="form-control inspector-input item-title-input"
                    placeholder="e.g. Article Headline"
                  />
                  <input
                    type="text"
                    [(ngModel)]="item.category"
                    class="form-control inspector-input item-icon-input"
                    placeholder="e.g. Architecture"
                  />
                  <button type="button" class="btn-remove-item" (click)="removeArticleItem(idx)" title="Remove article">
                    <span class="material-symbols-outlined">delete</span>
                  </button>
                </div>
                <div class="repeater-body">
                  <textarea
                    [(ngModel)]="item.summary"
                    class="form-control inspector-input textarea-short"
                    rows="2"
                    placeholder="e.g. Article excerpt narrative..."
                  ></textarea>
                </div>
              </div>
              <button type="button" class="btn-add-item" (click)="addArticleItem()">
                <span class="material-symbols-outlined">add</span>
                <span>Add Article Card</span>
              </button>
            </div>
          </div>

          <!-- Sub-Tab 2: Section Header & Filters -->
          <div class="mock-tab-pane" *ngIf="activeMockTab === 'header'">
            <div class="inspector-form-grid-2">
              <div class="form-group">
                <label class="field-label">
                  <span>Badge / Mini Headline</span>
                  <code [innerText]="'{{ MiniTitle }}'"></code>
                </label>
                <input
                  type="text"
                  [(ngModel)]="sampleContent.miniTitle"
                  class="form-control inspector-input"
                  placeholder="e.g. INSIGHTS & EDITORIALS"
                />
              </div>

              <div class="form-group">
                <label class="field-label">
                  <span>Section Headline Title</span>
                  <code [innerText]="'{{ Title }}'"></code>
                </label>
                <input
                  type="text"
                  [(ngModel)]="sampleContent.title"
                  class="form-control inspector-input"
                  placeholder="e.g. Latest Insights & Technical Papers"
                />
              </div>

              <div class="form-group col-span-2">
                <label class="field-label">
                  <span>Section Lead Description</span>
                  <code [innerText]="'{{ Description }}'"></code>
                </label>
                <textarea
                  [(ngModel)]="sampleContent.description"
                  class="form-control inspector-input textarea-short"
                  rows="2"
                  placeholder="e.g. Explore in-depth engineering breakdowns..."
                ></textarea>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .category-visual-layout {
      display: flex;
      flex-direction: column;
      gap: 20px;
      width: 100%;
    }

    .meta-config-card {
      background: #ffffff;
      border: 1.5px solid #e2e8f0;
      border-radius: 14px;
      padding: 20px 24px;
      box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
      display: flex;
      flex-direction: column;
    }

    .meta-config-row {
      display: flex;
      gap: 20px;
      align-items: flex-end;
      flex-wrap: wrap;
    }

    .config-col {
      display: flex;
      flex-direction: column;
    }

    .flex-2 { flex: 2; min-width: 260px; }
    .flex-1 { flex: 1; min-width: 180px; }
    .col-span-full { width: 100%; }

    .actions-col {
      display: flex;
      justify-content: flex-end;
      align-items: flex-end;
    }

    .config-label {
      font-size: 11.5px;
      font-weight: 800;
      color: #475569;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }

    .required {
      color: #ef4444;
      font-weight: 900;
      margin-left: 2px;
    }

    .config-input {
      border: 1.5px solid #cbd5e1;
      border-radius: 8px;
      padding: 9px 14px;
      font-size: 13.5px;
      color: #0f172a;
      background: #ffffff;
      outline: none;
      transition: all 0.2s ease;
      width: 100%;
      box-sizing: border-box;
    }

    .config-input:focus {
      border-color: #0050e5;
      box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.12);
    }

    .font-mono {
      font-family: 'Fira Code', monospace;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.5px;
      color: #0050e5;
      background-color: #f8fafc;
    }

    .label-with-hint {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .input-with-action {
      display: flex;
      align-items: center;
      gap: 6px;
      width: 100%;
    }

    .btn-regen-key {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 38px;
      height: 38px;
      border: 1.5px solid #cbd5e1;
      border-radius: 8px;
      background: #f8fafc;
      color: #475569;
      cursor: pointer;
      transition: all 0.15s ease;
      flex-shrink: 0;
    }

    .btn-regen-key:hover {
      background: #e2e8f0;
      color: #0050e5;
      border-color: #94a3b8;
    }

    .btn-save-vault {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      height: 40px;
      padding: 0 24px;
      background: #0050e5;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0, 80, 229, 0.25);
      transition: all 0.2s ease;
      width: 100%;
    }

    .btn-save-vault:hover:not(:disabled) {
      background: #003db3;
      box-shadow: 0 4px 14px rgba(0, 80, 229, 0.35);
    }

    .btn-save-vault:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .code-editor-card {
      background: #ffffff;
      border: 1.5px solid #e2e8f0;
      border-radius: 14px;
      box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .studio-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px;
      background: #ffffff;
      border-bottom: 1px solid #e2e8f0;
      flex-wrap: wrap;
      gap: 14px;
    }

    .studio-title-block {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .studio-code-icon {
      font-size: 20px;
      color: #0050e5;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      padding: 6px;
    }

    .studio-title {
      font-size: 15px;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
    }

    .studio-subtitle {
      font-size: 12px;
      color: #64748b;
      margin: 2px 0 0 0;
    }

    .studio-header-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .btn-preview-demo {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 16px;
      background: #eff6ff;
      border: 1.5px solid #bfdbfe;
      border-radius: 8px;
      color: #0050e5;
      font-size: 12.5px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-preview-demo:hover {
      background: #dbeafe;
      border-color: #93c5fd;
    }

    .btn-reset-boilerplate {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 14px;
      background: #ffffff;
      border: 1.5px solid #cbd5e1;
      border-radius: 8px;
      color: #475569;
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-reset-boilerplate:hover {
      background: #f8fafc;
      color: #0f172a;
      border-color: #94a3b8;
    }

    .editor-tabs-bar {
      display: flex;
      align-items: center;
      padding: 10px 24px;
      background: #f8fafc;
      border-bottom: 1.5px solid #e2e8f0;
    }

    .tabs-group {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .editor-tab-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 7px 16px;
      background: #ffffff;
      border: 1.5px solid #cbd5e1;
      border-radius: 8px;
      font-size: 12.5px;
      font-weight: 700;
      color: #475569;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .editor-tab-btn:hover {
      border-color: #94a3b8;
      color: #0f172a;
    }

    .editor-tab-btn.active {
      background: #0050e5;
      border-color: #0050e5;
      color: #ffffff;
      box-shadow: 0 2px 8px rgba(0, 80, 229, 0.25);
    }

    .tab-badge-pill {
      font-size: 10.5px;
      font-weight: 800;
      background: #f1f5f9;
      color: #475569;
      padding: 2px 6px;
      border-radius: 4px;
      letter-spacing: 0.5px;
    }

    .editor-tab-btn.active .tab-badge-pill {
      background: rgba(255, 255, 255, 0.2);
      color: #ffffff;
    }

    .editor-tab-btn .tab-icon {
      font-size: 16px;
    }

    .mock-content-card {
      padding: 24px;
      background: #ffffff;
      min-height: 480px;
    }

    .content-drawer-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid #f1f5f9;
      flex-wrap: wrap;
      gap: 12px;
    }

    .drawer-title-wrap {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }

    .drawer-icon {
      font-size: 24px;
      color: #0050e5;
      margin-top: 2px;
    }

    .drawer-title {
      font-size: 15px;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
    }

    .drawer-sub {
      font-size: 12px;
      color: #64748b;
      margin: 4px 0 0 0;
    }

    .btn-reset-sample {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      color: #475569;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }

    .btn-reset-sample:hover {
      background: #f8fafc;
      color: #0f172a;
    }

    .mock-tabs-nav {
      display: flex;
      gap: 8px;
      margin-bottom: 20px;
      border-bottom: 1.5px solid #e2e8f0;
      padding-bottom: 10px;
    }

    .mock-tab-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 16px;
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      border-radius: 8px;
      font-size: 12.5px;
      font-weight: 700;
      color: #64748b;
      cursor: pointer;
    }

    .mock-tab-btn.active {
      background: #eff6ff;
      border-color: #0050e5;
      color: #0050e5;
    }

    .mock-tab-badge {
      background: #dbeafe;
      color: #0050e5;
      font-size: 10.5px;
      font-weight: 800;
      padding: 1px 6px;
      border-radius: 10px;
    }

    .cards-repeater-container {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .repeater-item-card {
      background: #f8fafc;
      border: 1.5px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .repeater-header {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .icon-badge {
      font-size: 22px;
      color: #0050e5;
    }

    .item-title-input { flex: 3; }
    .item-icon-input { flex: 1; max-width: 140px; }

    .textarea-short {
      resize: vertical;
      font-family: inherit;
    }

    .btn-remove-item {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      border-radius: 6px;
      color: #ef4444;
      cursor: pointer;
    }

    .btn-remove-item:hover {
      background: #fee2e2;
      border-color: #fca5a5;
    }

    .btn-add-item {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      background: #ffffff;
      border: 1.5px dashed #0050e5;
      color: #0050e5;
      border-radius: 8px;
      font-size: 12.5px;
      font-weight: 700;
      cursor: pointer;
      align-self: flex-start;
    }

    .btn-add-item:hover {
      background: #eff6ff;
    }

    .inspector-form-grid-2 {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 18px;
    }

    .col-span-2 { grid-column: span 2; }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .field-label {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      font-weight: 700;
      color: #334155;
    }

    .field-label code {
      font-family: 'Fira Code', monospace;
      font-size: 11px;
      color: #0050e5;
      background: #eff6ff;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .inspector-input {
      border: 1.5px solid #cbd5e1;
      border-radius: 8px;
      padding: 9px 12px;
      font-size: 13px;
      color: #0f172a;
      outline: none;
      transition: all 0.2s;
    }

    .inspector-input:focus {
      border-color: #0050e5;
      box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.12);
    }

    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(4px);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      box-sizing: border-box;
    }

    .preview-modal-dialog {
      width: 95vw;
      max-width: 1300px;
      height: 90vh;
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.35);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .preview-modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px;
      border-bottom: 1.5px solid #e2e8f0;
      background: #ffffff;
    }

    .preview-header-meta {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .preview-badge-icon {
      width: 40px;
      height: 40px;
      background: #eff6ff;
      color: #0050e5;
      border: 1px solid #bfdbfe;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .preview-modal-name {
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
    }

    .preview-modal-sub {
      font-size: 12px;
      color: #64748b;
    }

    .modal-header-actions {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .modal-viewport-toggle {
      display: inline-flex;
      background: #f1f5f9;
      padding: 3px;
      border-radius: 8px;
      gap: 3px;
    }

    .btn-vp {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 5px 12px;
      border: none;
      background: transparent;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      color: #64748b;
      cursor: pointer;
    }

    .btn-vp.active {
      background: #ffffff;
      color: #0050e5;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
    }

    .btn-close-modal {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: #ffffff;
      color: #64748b;
      cursor: pointer;
    }

    .btn-close-modal:hover {
      background: #fee2e2;
      border-color: #fca5a5;
      color: #ef4444;
    }

    .preview-modal-body {
      flex: 1;
      background: #0f172a;
      padding: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: auto;
    }

    .preview-canvas-wrapper {
      background: #ffffff;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
      height: 100%;
      transition: all 0.25s ease;
    }

    .preview-canvas-wrapper.viewport-desktop { width: 100%; }
    .preview-canvas-wrapper.viewport-tablet { width: 768px; }
    .preview-canvas-wrapper.viewport-mobile { width: 375px; }

    .modal-preview-iframe {
      width: 100%;
      height: 100%;
      border: none;
      display: block;
      background: #ffffff;
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

  templateName: string = 'Modern Magazine 3-Column Blog Feed';
  variantCode: string = '';
  description: string = 'Responsive 3-column article cards grid with publication badges, thumbnails, and author avatars';
  isSaving: boolean = false;

  // Studio Tab Controls (HTML tab is default; Mock sub-tab 1 'articles' is default)
  activeEditorTab: 'html' | 'css' | 'js' | 'mock' = 'html';
  activeMockTab: 'articles' | 'header' = 'articles';

  htmlTemplate: string = `<section class="oz-blog-section {{ CustomClass }}">
  <div class="oz-blog-container">
    <div class="oz-blog-header">
      {{#if MiniTitle}}<span class="oz-blog-badge">{{ MiniTitle }}</span>{{/if}}
      <h2 class="oz-blog-title">{{ Title }}</h2>
      {{#if Description}}<p class="oz-blog-desc">{{ Description }}</p>{{/if}}
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
            <span class="oz-meta-date">{{ PublishedDate }}</span>
            <span class="oz-meta-bullet">&bull;</span>
            <span class="oz-meta-author">{{ AuthorName }}</span>
          </div>
          <h3 class="oz-card-title"><a href="{{ Url }}" class="oz-card-title-link">{{ Title }}</a></h3>
          <p class="oz-card-summary">{{ Summary }}</p>
          <div class="oz-card-footer">
            <a href="{{ Url }}" class="oz-card-read-more">Read Article <span class="material-symbols-outlined">arrow_forward</span></a>
          </div>
        </div>
      </article>
      {{/each}}
    </div>
  </div>
</section>`;

  cssStyles: string = `.oz-blog-section {
  padding: 80px 24px;
  background: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.oz-blog-container {
  max-width: 1200px;
  margin: 0 auto;
}
.oz-blog-header {
  text-align: center;
  max-width: 680px;
  margin: 0 auto 56px auto;
}
.oz-blog-badge {
  display: inline-block;
  background: #eff6ff;
  color: #0050e5;
  font-size: 11px;
  font-weight: 800;
  padding: 4px 12px;
  border-radius: 14px;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
}
.oz-blog-title {
  font-size: 34px;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 16px 0;
  letter-spacing: -0.02em;
}
.oz-blog-desc {
  font-size: 15px;
  color: #64748b;
  line-height: 1.6;
  margin: 0;
}
.oz-articles-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
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
.oz-card-read-more:hover { gap: 10px; }
.oz-card-read-more .material-symbols-outlined { font-size: 16px; }
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
    { label: 'Tags Loop', token: '{{#each Tags}}\n  <a href="{{ Url }}">{{ Name }}</a>\n{{/each}}' }
  ];

  sampleContent: any = {
    title: 'Latest Insights & Technical Papers',
    miniTitle: 'INSIGHTS & EDITORIALS',
    description: 'Explore in-depth engineering breakdowns, architectural case studies, and enterprise cloud patterns.',
    articles: [
      {
        title: 'Zero Trust Network Architecture at Multi-Cloud Planetary Scale',
        summary: 'How modern sovereign clouds eliminate perimeter trust boundaries and enforce cryptographic verification.',
        category: 'Architecture',
        coverImageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&auto=format&fit=crop&q=80',
        authorName: 'Alex Vance',
        publishedDate: 'Oct 12, 2026',
        url: '/blog/zero-trust-architecture'
      },
      {
        title: 'Sub-Millisecond Distributed Data Fabrics for Hybrid Enterprises',
        summary: 'Synchronizing multi-master state machines across sovereign clusters without latency penalties.',
        category: 'Cloud Engineering',
        coverImageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80',
        authorName: 'Sarah Jenkins',
        publishedDate: 'Sep 28, 2026',
        url: '/blog/distributed-data-fabrics'
      },
      {
        title: 'Automated Compliance Guardrails for Regulated Financial Platforms',
        summary: 'Enforcing SOC2, HIPAA, and GDPR isolation policies continuously across dynamic container meshes.',
        category: 'Compliance',
        coverImageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80',
        authorName: 'Michael Chen',
        publishedDate: 'Sep 15, 2026',
        url: '/blog/compliance-guardrails'
      }
    ]
  };

  constructor(
    private api: ApiService,
    private toast: ToastService,
    private previewModalService: UniversalPreviewModalService,
    private router: Router
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

  resetBoilerplate(): void {
    this.toast.info('Boilerplate reset to default blog grid structure.');
  }

  resetSampleContent(): void {
    this.sampleContent = {
      title: 'Latest Insights & Technical Papers',
      miniTitle: 'INSIGHTS & EDITORIALS',
      description: 'Explore in-depth engineering breakdowns, architectural case studies, and enterprise cloud patterns.',
      articles: [
        {
          title: 'Zero Trust Network Architecture at Multi-Cloud Planetary Scale',
          summary: 'How modern sovereign clouds eliminate perimeter trust boundaries and enforce cryptographic verification.',
          category: 'Architecture',
          coverImageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&auto=format&fit=crop&q=80',
          authorName: 'Alex Vance',
          publishedDate: 'Oct 12, 2026',
          url: '/blog/zero-trust-architecture'
        },
        {
          title: 'Sub-Millisecond Distributed Data Fabrics for Hybrid Enterprises',
          summary: 'Synchronizing multi-master state machines across sovereign clusters without latency penalties.',
          category: 'Cloud Engineering',
          coverImageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80',
          authorName: 'Sarah Jenkins',
          publishedDate: 'Sep 28, 2026',
          url: '/blog/distributed-data-fabrics'
        },
        {
          title: 'Automated Compliance Guardrails for Regulated Financial Platforms',
          summary: 'Enforcing SOC2, HIPAA, and GDPR isolation policies continuously across dynamic container meshes.',
          category: 'Compliance',
          coverImageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80',
          authorName: 'Michael Chen',
          publishedDate: 'Sep 15, 2026',
          url: '/blog/compliance-guardrails'
        }
      ]
    };
    this.toast.info('Blog sample values reset to defaults.');
  }

  addArticleItem(): void {
    if (!this.sampleContent.articles) this.sampleContent.articles = [];
    this.sampleContent.articles.push({
      title: 'New Article Headline',
      summary: 'Summary excerpt of the new article explaining the core topic and value.',
      category: 'General',
      coverImageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&auto=format&fit=crop&q=80',
      authorName: 'Editorial Staff',
      publishedDate: 'Today',
      url: '/blog/new-article'
    });
  }

  removeArticleItem(index: number): void {
    if (this.sampleContent.articles && this.sampleContent.articles.length > index) {
      this.sampleContent.articles.splice(index, 1);
    }
  }

  openPreviewModal(): void {
    this.previewModalService.open({
      title: this.templateName || 'Article Cards',
      category: 'blog',
      variantCode: this.variantCode,
      htmlTemplate: this.htmlTemplate || '',
      cssStyles: this.cssStyles || '',
      jsScript: this.jsScript || '',
      sampleContent: this.sampleContent
    });
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
        this.toast.error('Failed to load existing Blog template.');
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
      description: this.description,
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
            ? `Successfully updated Blog template "${name}".`
            : `Successfully created Blog template "${name}".`
        );
        this.templateSaved.emit(res?.data || res);
        this.router.navigate(['/content/console/templates']);
      },
      error: (err: any) => {
        this.isSaving = false;
        const msg = err?.error?.message || err?.message || 'Failed to save Blog template.';
        this.toast.error(`Save error: ${msg}`);
      }
    });
  }
}
