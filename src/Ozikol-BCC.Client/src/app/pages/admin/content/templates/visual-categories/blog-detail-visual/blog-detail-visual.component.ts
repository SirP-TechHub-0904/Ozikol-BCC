import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { VisualEditorComponent } from '../../visual-editor/visual-editor.component';
import { ApiService } from '../../../../../../core/services/api.service';
import { ToastService } from '../../../../../../core/services/toast.service';
import { UniversalPreviewModalService } from '../../services/universal-preview-modal.service';

/**
 * Dedicated category studio component for creating and editing Blog Article Detail templates.
 * Enforces long-form editorial typography, author cards, publication tags, and social shares.
 */
@Component({
  selector: 'app-blog-detail-visual',
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
              placeholder="e.g. Editorial Long-Form Article Showcase"
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
              (click)="saveBlogDetailTemplate()"
            >
              <span class="material-symbols-outlined btn-icon" *ngIf="!isSaving">check_circle</span>
              <span class="material-symbols-outlined btn-icon spin" *ngIf="isSaving">sync</span>
              <span>{{ isSaving ? 'Saving...' : (isEditMode ? 'Update Article' : 'Save Article') }}</span>
            </button>
          </div>
        </div>

        <div class="config-col col-span-full" style="margin-top: 14px;">
          <label class="config-label">DESCRIPTION (OPTIONAL)</label>
          <input
            type="text"
            [(ngModel)]="description"
            class="form-control config-input"
            placeholder="e.g. Editorial long-form article reader with author biography, cover imagery, and reading time"
          />
        </div>
      </div>

      <!-- 2. Template Code & Content Studio Card -->
      <div class="code-editor-card">
        <!-- Studio Card Header -->
        <div class="studio-card-header">
          <div class="studio-title-block">
            <span class="material-symbols-outlined studio-code-icon">menu_book</span>
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
            [category]="'blogdetail'"
            [categoryName]="'Blog Detail'"
            [activeTab]="activeEditorTab"
            [hideInternalTabs]="true"
            [htmlTemplate]="htmlTemplate"
            [cssStyles]="cssStyles"
            [jsScript]="jsScript"
            [sampleContent]="sampleContent"
            [specificTokens]="blogDetailTokens"
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
                <h3 class="drawer-title">Mock Content &amp; Loop Configuration for Blog Detail</h3>
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

          <!-- Mock Data Sub-Tabs: Content & Body (Default) vs Author Meta -->
          <div class="mock-tabs-nav">
            <button
              type="button"
              class="mock-tab-btn"
              [class.active]="activeMockTab === 'content'"
              (click)="activeMockTab = 'content'"
            >
              <span class="material-symbols-outlined icon-micro">article</span>
              <span>Article Content &amp; Body</span>
            </button>
            <button
              type="button"
              class="mock-tab-btn"
              [class.active]="activeMockTab === 'author'"
              (click)="activeMockTab = 'author'"
            >
              <span class="material-symbols-outlined icon-micro">person</span>
              <span>Author &amp; Publication Meta</span>
            </button>
          </div>

          <!-- Sub-Tab 1: Article Content & Body (Default) -->
          <div class="mock-tab-pane" *ngIf="activeMockTab === 'content'">
            <div class="inspector-form-grid-2">
              <div class="form-group col-span-2">
                <label class="field-label">
                  <span>Article Headline</span>
                  <code [innerText]="'{{ ArticleHeadline }}'"></code>
                </label>
                <input
                  type="text"
                  [(ngModel)]="sampleContent.articleHeadline"
                  class="form-control inspector-input"
                  placeholder="e.g. Navigating Multi-Cloud Complexity"
                />
              </div>

              <div class="form-group col-span-2">
                <label class="field-label">
                  <span>Article Lead Narrative</span>
                  <code [innerText]="'{{ ArticleLead }}'"></code>
                </label>
                <textarea
                  [(ngModel)]="sampleContent.articleLead"
                  class="form-control inspector-input textarea-short"
                  rows="2"
                  placeholder="e.g. As engineering organizations transition to distributed multi-cloud..."
                ></textarea>
              </div>

              <div class="form-group col-span-2">
                <label class="field-label">
                  <span>Cover Image URL</span>
                  <code [innerText]="'{{ CoverImageUrl }}'"></code>
                </label>
                <input
                  type="text"
                  [(ngModel)]="sampleContent.coverImageUrl"
                  class="form-control inspector-input"
                  placeholder="e.g. https://images.unsplash.com/..."
                />
              </div>
            </div>
          </div>

          <!-- Sub-Tab 2: Author & Publication Meta -->
          <div class="mock-tab-pane" *ngIf="activeMockTab === 'author'">
            <div class="inspector-form-grid-2">
              <div class="form-group">
                <label class="field-label">
                  <span>Author Full Name</span>
                  <code [innerText]="'{{ AuthorName }}'"></code>
                </label>
                <input
                  type="text"
                  [(ngModel)]="sampleContent.authorName"
                  class="form-control inspector-input"
                  placeholder="e.g. Marcus Aurelius"
                />
              </div>

              <div class="form-group">
                <label class="field-label">
                  <span>Author Role</span>
                  <code [innerText]="'{{ AuthorRole }}'"></code>
                </label>
                <input
                  type="text"
                  [(ngModel)]="sampleContent.authorRole"
                  class="form-control inspector-input"
                  placeholder="e.g. VP of Cloud Architecture"
                />
              </div>

              <div class="form-group">
                <label class="field-label">
                  <span>Publication Date</span>
                  <code [innerText]="'{{ PublishedDate }}'"></code>
                </label>
                <input
                  type="text"
                  [(ngModel)]="sampleContent.publishedDate"
                  class="form-control inspector-input"
                  placeholder="e.g. October 14, 2026"
                />
              </div>

              <div class="form-group">
                <label class="field-label">
                  <span>Estimated Reading Time</span>
                  <code [innerText]="'{{ ReadingTime }}'"></code>
                </label>
                <input
                  type="text"
                  [(ngModel)]="sampleContent.readingTime"
                  class="form-control inspector-input"
                  placeholder="e.g. 8 min read"
                />
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

    .textarea-short {
      resize: vertical;
      font-family: inherit;
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
export class BlogDetailVisualComponent implements OnInit {
  @Input() isEditMode: boolean = false;
  @Input() existingTemplateId?: string;
  @Input() editorTokens: any = null;
  @Output() templateSaved = new EventEmitter<any>();

  templateName: string = 'Editorial Long-Form Article Showcase';
  variantCode: string = '';
  description: string = 'Editorial long-form article reader with author biography, cover imagery, and reading time';
  isSaving: boolean = false;

  // Studio Tab Controls (HTML tab is default; Mock sub-tab 1 'content' is default)
  activeEditorTab: 'html' | 'css' | 'js' | 'mock' = 'html';
  activeMockTab: 'content' | 'author' = 'content';

  htmlTemplate: string = `<article class="oz-article-detail {{ CustomClass }}">
  <header class="oz-article-header">
    <div class="oz-article-meta-top">
      <span class="oz-category-badge">{{ Category }}</span>
      <span class="oz-publish-date">{{ PublishedDate }} &bull; {{ ReadingTime }}</span>
    </div>
    <h1 class="oz-article-headline">{{ ArticleHeadline }}</h1>
    <p class="oz-article-lead">{{ ArticleLead }}</p>
    <div class="oz-author-strip">
      <img src="{{ AuthorAvatar }}" alt="{{ AuthorName }}" class="oz-author-avatar" />
      <div class="oz-author-info">
        <span class="oz-author-name">{{ AuthorName }}</span>
        <span class="oz-author-role">{{ AuthorRole }}</span>
      </div>
    </div>
  </header>
  <div class="oz-article-cover">
    <img src="{{ CoverImageUrl }}" alt="{{ ArticleHeadline }}" class="oz-cover-image" />
  </div>
  <div class="oz-article-layout">
    <div class="oz-article-body">
      {{{ Content }}}
      <div class="oz-article-tags">
        <span class="oz-tags-label">Tags:</span>
        {{#each Tags}}
        <a href="{{ Url }}" class="oz-tag-pill">#{{ Name }}</a>
        {{/each}}
      </div>
    </div>
  </div>
</article>`;

  cssStyles: string = `.oz-article-detail {
  padding: 64px 24px 96px 24px;
  background: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.oz-article-header {
  max-width: 820px;
  margin: 0 auto 40px auto;
  text-align: center;
}
.oz-article-meta-top {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 20px;
}
.oz-category-badge {
  background: #eff6ff;
  color: #0050e5;
  font-size: 11px;
  font-weight: 800;
  padding: 4px 12px;
  border-radius: 14px;
  text-transform: uppercase;
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
  max-width: 820px;
  margin: 0 auto;
}
.oz-article-body {
  font-size: 16px;
  line-height: 1.8;
  color: #334155;
}
.oz-article-tags {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding-top: 24px;
  border-top: 1px solid #e2e8f0;
  margin-top: 36px;
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
}`;

  jsScript: string = '';

  blogDetailTokens: Array<{ label: string; token: string }> = [
    { label: 'Title', token: '{{ Title }}' },
    { label: 'Headline', token: '{{ ArticleHeadline }}' },
    { label: 'Lead', token: '{{ ArticleLead }}' },
    { label: 'Cover Image', token: '{{ CoverImageUrl }}' },
    { label: 'Content Body', token: '{{{ Content }}}' },
    { label: 'Category', token: '{{ Category }}' },
    { label: 'Author Name', token: '{{ AuthorName }}' },
    { label: 'Author Role', token: '{{ AuthorRole }}' },
    { label: 'Author Avatar', token: '{{ AuthorAvatar }}' },
    { label: 'Publish Date', token: '{{ PublishedDate }}' },
    { label: 'Reading Time', token: '{{ ReadingTime }}' },
    { label: 'Tags Loop', token: '{{#each Tags}}\n  <a href="{{ Url }}" class="oz-tag-pill">#{{ Name }}</a>\n{{/each}}' }
  ];

  sampleContent: any = {
    title: 'Navigating Multi-Cloud Architecture at Scale',
    articleHeadline: 'Navigating Multi-Cloud Complexity: A Blueprint for Sovereign Cloud Orchestration',
    articleLead: 'How global engineering teams maintain governance, zero trust security, and low-latency continuous deployment across AWS, Azure, and private Kubernetes clusters.',
    coverImageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&auto=format&fit=crop&q=80',
    content: '<p>Modern enterprise platforms increasingly face the requirement of sovereign data control, zero-egress billing models, and high availability across disparate multi-cloud ecosystems.</p><p>By treating each cloud boundary as an untrusted peer node connected via encrypted service mesh fabrics, organizations can decouple workload logic from vendor-specific infrastructure APIs.</p>',
    category: 'Cloud Engineering',
    authorName: 'Alex Vance',
    authorRole: 'Chief Cloud Architect',
    authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    publishedDate: 'October 14, 2026',
    readingTime: '8 min read',
    tags: [
      { name: 'MultiCloud', url: '/tags/multicloud' },
      { name: 'Architecture', url: '/tags/architecture' },
      { name: 'Kubernetes', url: '/tags/kubernetes' }
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
    this.variantCode = `BDET_${randomSuffix}`;
  }

  resetBoilerplate(): void {
    this.toast.info('Boilerplate reset to default article detail structure.');
  }

  resetSampleContent(): void {
    this.sampleContent = {
      title: 'Navigating Multi-Cloud Architecture at Scale',
      articleHeadline: 'Navigating Multi-Cloud Complexity: A Blueprint for Sovereign Cloud Orchestration',
      articleLead: 'How global engineering teams maintain governance, zero trust security, and low-latency continuous deployment across AWS, Azure, and private Kubernetes clusters.',
      coverImageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&auto=format&fit=crop&q=80',
      content: '<p>Modern enterprise platforms increasingly face the requirement of sovereign data control, zero-egress billing models, and high availability across disparate multi-cloud ecosystems.</p><p>By treating each cloud boundary as an untrusted peer node connected via encrypted service mesh fabrics, organizations can decouple workload logic from vendor-specific infrastructure APIs.</p>',
      category: 'Cloud Engineering',
      authorName: 'Alex Vance',
      authorRole: 'Chief Cloud Architect',
      authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
      publishedDate: 'October 14, 2026',
      readingTime: '8 min read',
      tags: [
        { name: 'MultiCloud', url: '/tags/multicloud' },
        { name: 'Architecture', url: '/tags/architecture' },
        { name: 'Kubernetes', url: '/tags/kubernetes' }
      ]
    };
    this.toast.info('Blog detail sample values reset to defaults.');
  }

  openPreviewModal(): void {
    this.previewModalService.open({
      title: this.templateName || 'Article Detail',
      category: 'blog_detail',
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
        this.toast.error('Failed to load existing Article Detail template.');
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
      category: 'blogdetail',
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
            ? `Successfully updated Article Detail template "${name}".`
            : `Successfully created Article Detail template "${name}".`
        );
        this.templateSaved.emit(res?.data || res);
        this.router.navigate(['/content/console/templates']);
      },
      error: (err: any) => {
        this.isSaving = false;
        const msg = err?.error?.message || err?.message || 'Failed to save Article Detail template.';
        this.toast.error(`Save error: ${msg}`);
      }
    });
  }
}
