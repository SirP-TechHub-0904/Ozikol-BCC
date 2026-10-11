import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { VisualEditorComponent } from '../../visual-editor/visual-editor.component';
import { ApiService } from '../../../../../../core/services/api.service';
import { ToastService } from '../../../../../../core/services/toast.service';
import { UniversalPreviewModalService } from '../../services/universal-preview-modal.service';

/**
 * Dedicated category studio component for creating and editing Footer templates.
 * Enforces dynamic multi-column link navigation, legal compliance links, social icons,
 * newsletter subscribe block, and brand metadata.
 */
@Component({
  selector: 'app-footer-visual',
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
              placeholder="e.g. Sovereign Enterprise Clean Footer"
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
              (click)="saveFooterTemplate()"
            >
              <span class="material-symbols-outlined btn-icon" *ngIf="!isSaving">check_circle</span>
              <span class="material-symbols-outlined btn-icon spin" *ngIf="isSaving">sync</span>
              <span>{{ isSaving ? 'Saving...' : (isEditMode ? 'Update Footer' : 'Save Footer') }}</span>
            </button>
          </div>
        </div>

        <div class="config-col col-span-full" style="margin-top: 14px;">
          <label class="config-label">DESCRIPTION (OPTIONAL)</label>
          <input
            type="text"
            [(ngModel)]="description"
            class="form-control config-input"
            placeholder="e.g. Four-column responsive footer with newsletter subscription, legal links, and brand copyright"
          />
        </div>
      </div>

      <!-- 2. Template Code & Content Studio Card -->
      <div class="code-editor-card">
        <!-- Studio Card Header -->
        <div class="studio-card-header">
          <div class="studio-title-block">
            <span class="material-symbols-outlined studio-code-icon">dock</span>
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
            [category]="'footer'"
            [categoryName]="'Footer'"
            [activeTab]="activeEditorTab"
            [hideInternalTabs]="true"
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

        <!-- Mock Content & Loop Configuration View (When activeEditorTab is 'mock') -->
        <div class="mock-content-card" *ngIf="activeEditorTab === 'mock'">
          <div class="content-drawer-header">
            <div class="drawer-title-wrap">
              <span class="material-symbols-outlined drawer-icon">edit_note</span>
              <div>
                <h3 class="drawer-title">Mock Content &amp; Loop Configuration for Footer</h3>
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

          <!-- Mock Data Sub-Tabs: Footer Columns (Default) vs Brand Info -->
          <div class="mock-tabs-nav">
            <button
              type="button"
              class="mock-tab-btn"
              [class.active]="activeMockTab === 'columns'"
              (click)="activeMockTab = 'columns'"
            >
              <span class="material-symbols-outlined icon-micro">view_column</span>
              <span>Footer Columns &amp; Links</span>
              <span class="mock-tab-badge">{{ (sampleContent.footerCategories?.length || 3) }}</span>
            </button>
            <button
              type="button"
              class="mock-tab-btn"
              [class.active]="activeMockTab === 'brand'"
              (click)="activeMockTab = 'brand'"
            >
              <span class="material-symbols-outlined icon-micro">corporate_fare</span>
              <span>Brand &amp; Social Info</span>
            </button>
          </div>

          <!-- Sub-Tab 1: Footer Columns (Default) -->
          <div class="mock-tab-pane" *ngIf="activeMockTab === 'columns'">
            <div class="nav-tree-container">
              <div class="nav-parent-card" *ngFor="let col of (sampleContent.footerCategories || []); let cIdx = index">
                <div class="nav-parent-header">
                  <span class="material-symbols-outlined nav-item-icon">folder</span>
                  <input
                    type="text"
                    [(ngModel)]="col.title"
                    class="form-control inspector-input item-title-input"
                    placeholder="e.g. Column Title"
                  />
                  <button type="button" class="btn-remove-item" (click)="removeFooterCategory(cIdx)" title="Remove Column">
                    <span class="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </div>
              <button type="button" class="btn-add-item" (click)="addFooterCategory()">
                <span class="material-symbols-outlined">add</span>
                <span>Add Navigation Column</span>
              </button>
            </div>
          </div>

          <!-- Sub-Tab 2: Brand & Social Info -->
          <div class="mock-tab-pane" *ngIf="activeMockTab === 'brand'">
            <div class="inspector-form-grid-2">
              <div class="form-group">
                <label class="field-label">
                  <span>Brand Name</span>
                  <code [innerText]="'{{ BrandName }}'"></code>
                </label>
                <input
                  type="text"
                  [(ngModel)]="sampleContent.brandName"
                  class="form-control inspector-input"
                  placeholder="e.g. Acme Global"
                />
              </div>

              <div class="form-group">
                <label class="field-label">
                  <span>Copyright Notice</span>
                  <code [innerText]="'{{ Copyright }}'"></code>
                </label>
                <input
                  type="text"
                  [(ngModel)]="sampleContent.copyright"
                  class="form-control inspector-input"
                  placeholder="e.g. Acme Global Inc."
                />
              </div>

              <div class="form-group col-span-2">
                <label class="field-label">
                  <span>Brand Narrative Description</span>
                  <code [innerText]="'{{ Description }}'"></code>
                </label>
                <textarea
                  [(ngModel)]="sampleContent.description"
                  class="form-control inspector-input textarea-short"
                  rows="2"
                  placeholder="e.g. Autonomous cloud management..."
                ></textarea>
              </div>

              <div class="form-group">
                <label class="field-label">
                  <span>Support Email</span>
                  <code [innerText]="'{{ Email }}'"></code>
                </label>
                <input
                  type="text"
                  [(ngModel)]="sampleContent.email"
                  class="form-control inspector-input"
                  placeholder="e.g. contact@company.com"
                />
              </div>

              <div class="form-group">
                <label class="field-label">
                  <span>Support Phone</span>
                  <code [innerText]="'{{ Phone }}'"></code>
                </label>
                <input
                  type="text"
                  [(ngModel)]="sampleContent.phone"
                  class="form-control inspector-input"
                  placeholder="e.g. +1 (800) 555-0199"
                />
              </div>

              <div class="form-group col-span-2">
                <label class="field-label">
                  <span>Working Hours</span>
                  <code [innerText]="'{{ WorkingHours }}'"></code>
                </label>
                <input
                  type="text"
                  [(ngModel)]="sampleContent.workingHours"
                  class="form-control inspector-input"
                  placeholder="e.g. Mon - Fri: 8:00 AM - 6:00 PM"
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

    .mock-tab-badge {
      background: #dbeafe;
      color: #0050e5;
      font-size: 10.5px;
      font-weight: 800;
      padding: 1px 6px;
      border-radius: 10px;
    }

    .nav-tree-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .nav-parent-card {
      background: #f8fafc;
      border: 1.5px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px;
    }

    .nav-parent-header {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .nav-item-icon {
      font-size: 20px;
      color: #0050e5;
    }

    .item-title-input { flex: 3; }

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
export class FooterVisualComponent implements OnInit {
  @Input() isEditMode: boolean = false;
  @Input() existingTemplateId?: string;
  @Input() editorTokens: any = null;
  @Output() templateSaved = new EventEmitter<any>();

  templateName: string = 'Sovereign Enterprise Clean Footer';
  variantCode: string = '';
  description: string = 'Four-column responsive footer with newsletter subscription, legal links, and brand copyright';
  isSaving: boolean = false;

  // Studio Tab Controls (HTML tab is default; Mock sub-tab 1 'columns' is default)
  activeEditorTab: 'html' | 'css' | 'js' | 'mock' = 'html';
  activeMockTab: 'columns' | 'brand' = 'columns';

  htmlTemplate: string = `<footer class="oz-footer-section {{ CustomClass }}">
  <div class="oz-footer-container">
    <!-- Top Row: Brand & Mission, Multi-Column Navigation, and Newsletter -->
    <div class="oz-footer-grid">
      <!-- Zone 1: Brand, Tagline, Business Hours & Contact Touchpoints -->
      <div class="oz-footer-brand-col">
        <a class="oz-footer-brand-link" href="{{ HomeUrl }}">
          {{#if BrandLogo}}
            <img src="{{ BrandLogo }}" alt="{{ BrandName }}" class="oz-footer-brand-logo" />
          {{else}}
            <span class="oz-footer-brand-title">{{ BrandName }}</span>
          {{/if}}
        </a>
        <p class="oz-footer-desc">{{ Description }}</p>

        {{#if WorkingHours}}
        <div class="oz-footer-hours">
          <i class="fa-regular fa-clock"></i>
          <div class="oz-footer-hours-text">
            <span class="oz-footer-hours-label">Business Hours</span>
            <span class="oz-footer-hours-val">{{ WorkingHours }}</span>
          </div>
        </div>
        {{/if}}

        {{#if HasContactInfo}}
        <div class="oz-footer-contacts">
          {{#each ContactItems}}
          <div class="oz-footer-contact-item">
            <i class="{{ IconClass }}"></i>
            <div class="oz-footer-contact-text">
              <span class="oz-footer-contact-label">{{ Title }}</span>
              <a href="{{ Url }}" class="oz-footer-contact-val">{{ Content }}</a>
            </div>
          </div>
          {{/each}}
        </div>
        {{/if}}

        {{#if HasSocialLinks}}
        <div class="oz-footer-socials">
          {{#each SocialLinks}}
          <a href="{{ Url }}" title="{{ Platform }}" class="oz-footer-social-icon" target="_blank" rel="noopener">
            <i class="{{ IconClass }}"></i>
          </a>
          {{/each}}
        </div>
        {{/if}}
      </div>

      <!-- Zone 2: Dynamic Multi-Column Navigation (Categories & Tagged Quick Links) -->
      <div class="oz-footer-nav-group">
        {{#each FooterCategories}}
        <div class="oz-footer-col">
          <h4 class="oz-footer-col-title">{{ Title }}</h4>
          <ul class="oz-footer-links">
            {{#each Pages}}
            <li><a href="{{ Url }}" class="oz-footer-link">{{ Title }}</a></li>
            {{/each}}
          </ul>
        </div>
        {{/each}}

        <!-- Zone 3: Tagged Pages (e.g. Quick Links) -->
        <div class="oz-footer-col">
          <h4 class="oz-footer-col-title">Quick Links</h4>
          <ul class="oz-footer-links">
            {{#each TaggedPages "quicklinks"}}
            <li><a href="{{ Url }}" class="oz-footer-link">{{ Title }}</a></li>
            {{/each}}
          </ul>
        </div>
      </div>

      <!-- Zone 4: Interactive Newsletter Subscription Block -->
      <div class="oz-footer-newsletter-col">
        <h4 class="oz-footer-col-title">Stay Informed</h4>
        <p class="oz-footer-newsletter-desc">Subscribe to receive system alerts, release updates, and architecture advisories.</p>
        <div class="oz-footer-form-wrapper">
          {{ Form "Newsletter_Subscribe" }}
        </div>
      </div>
    </div>

    <!-- Zone 5: Bottom Compliance Bar & Legal Links -->
    <div class="oz-footer-bottom">
      <p class="oz-footer-copyright">© {{ Year }} {{ BrandName }}. All rights reserved.</p>
      <div class="oz-footer-legal-links">
        {{#each LegalPages}}
        <a href="{{ Url }}" class="oz-footer-legal-link">{{ Title }}</a>
        {{/each}}
      </div>
    </div>
  </div>
</footer>`;

  cssStyles: string = `.oz-footer-section {
  background: #090d16;
  color: #94a3b8;
  padding: 72px 24px 36px 24px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}
.oz-footer-container {
  max-width: 1240px;
  margin: 0 auto;
}
.oz-footer-grid {
  display: grid;
  grid-template-columns: 1.3fr 2fr 1.1fr;
  gap: 48px;
  padding-bottom: 56px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.oz-footer-brand-col {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.oz-footer-brand-link {
  text-decoration: none;
  display: inline-flex;
  align-items: center;
}
.oz-footer-brand-logo {
  max-height: 40px;
  width: auto;
  object-fit: contain;
}
.oz-footer-brand-title {
  color: #ffffff;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.5px;
}
.oz-footer-desc {
  font-size: 14px;
  line-height: 1.65;
  color: #94a3b8;
  margin: 0;
}
.oz-footer-hours {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 10px 14px;
  margin-top: 4px;
}
.oz-footer-hours i {
  color: #38bdf8;
  font-size: 16px;
  flex-shrink: 0;
}
.oz-footer-hours-text {
  display: flex;
  flex-direction: column;
}
.oz-footer-hours-label {
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: #64748b;
  font-weight: 700;
}
.oz-footer-hours-val {
  font-size: 13px;
  color: #e2e8f0;
  font-weight: 500;
}
.oz-footer-contacts {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 6px;
}
.oz-footer-contact-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  font-size: 13.5px;
}
.oz-footer-contact-item i {
  color: #38bdf8;
  font-size: 15px;
  margin-top: 3px;
  flex-shrink: 0;
}
.oz-footer-contact-text {
  display: flex;
  flex-direction: column;
}
.oz-footer-contact-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #64748b;
  font-weight: 600;
}
.oz-footer-contact-val {
  color: #e2e8f0;
  text-decoration: none;
  transition: color 0.2s ease;
}
.oz-footer-contact-val:hover {
  color: #38bdf8;
}
.oz-footer-socials {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
}
.oz-footer-social-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #cbd5e1;
  text-decoration: none;
  transition: all 0.2s ease;
}
.oz-footer-social-icon:hover {
  background: #38bdf8;
  color: #0f172a;
  border-color: #38bdf8;
  transform: translateY(-2px);
}
.oz-footer-nav-group {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 32px;
}
.oz-footer-col-title {
  color: #ffffff;
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin: 0 0 18px 0;
}
.oz-footer-links {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.oz-footer-link {
  color: #94a3b8;
  text-decoration: none;
  font-size: 14px;
  transition: color 0.2s ease;
}
.oz-footer-link:hover {
  color: #38bdf8;
  padding-left: 3px;
}
.oz-footer-newsletter-col {
  display: flex;
  flex-direction: column;
}
.oz-footer-newsletter-desc {
  font-size: 13.5px;
  line-height: 1.6;
  color: #94a3b8;
  margin: 0 0 16px 0;
}
.oz-footer-form-wrapper {
  margin-top: 4px;
}
.oz-footer-form-wrapper form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.oz-footer-form-wrapper input[type="email"],
.oz-footer-form-wrapper input[type="text"] {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  padding: 11px 14px;
  font-size: 13.5px;
  color: #ffffff;
  outline: none;
  transition: all 0.2s ease;
}
.oz-footer-form-wrapper input:focus {
  border-color: #38bdf8;
  box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.15);
}
.oz-footer-form-wrapper button,
.oz-footer-form-wrapper input[type="submit"] {
  background: #38bdf8;
  color: #0f172a;
  border: none;
  border-radius: 8px;
  padding: 11px 20px;
  font-size: 13.5px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}
.oz-footer-form-wrapper button:hover,
.oz-footer-form-wrapper input[type="submit"]:hover {
  background: #7dd3fc;
  transform: translateY(-1px);
}
.oz-footer-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 32px;
  font-size: 13.5px;
  flex-wrap: wrap;
  gap: 16px;
}
.oz-footer-copyright {
  margin: 0;
  color: #64748b;
}
.oz-footer-legal-links {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}
.oz-footer-legal-link {
  color: #94a3b8;
  text-decoration: none;
  transition: color 0.2s ease;
}
.oz-footer-legal-link:hover {
  color: #ffffff;
}
@media (max-width: 1024px) {
  .oz-footer-grid {
    grid-template-columns: 1fr;
    gap: 40px;
  }
}
@media (max-width: 640px) {
  .oz-footer-nav-group {
    grid-template-columns: 1fr 1fr;
  }
  .oz-footer-bottom {
    flex-direction: column;
    align-items: flex-start;
  }
}`;

  jsScript: string = '';

  footerTokens: Array<{ label: string; token: string }> = [
    {
      label: 'Brand Identity',
      token: `<a class="oz-footer-brand-link" href="{{ HomeUrl }}">
  {{#if BrandLogo}}
    <img src="{{ BrandLogo }}" alt="{{ BrandName }}" class="oz-footer-brand-logo" />
  {{else}}
    <span class="oz-footer-brand-title">{{ BrandName }}</span>
  {{/if}}
</a>`
    },
    {
      label: 'Category Columns (Loop)',
      token: `{{#each FooterCategories}}
<div class="oz-footer-col">
  <h4 class="oz-footer-col-title">{{ Title }}</h4>
  <ul class="oz-footer-links">
    {{#each Pages}}
    <li><a href="{{ Url }}" class="oz-footer-link">{{ Title }}</a></li>
    {{/each}}
  </ul>
</div>
{{/each}}`
    },
    {
      label: 'Tagged Pages (Loop)',
      token: `<div class="oz-footer-col">
  <h4 class="oz-footer-col-title">Quick Links</h4>
  <ul class="oz-footer-links">
    {{#each TaggedPages "quicklinks"}}
    <li><a href="{{ Url }}" class="oz-footer-link">{{ Title }}</a></li>
    {{/each}}
  </ul>
</div>`
    },
    {
      label: 'Working Hours',
      token: `{{#if WorkingHours}}
<div class="oz-footer-hours">
  <i class="fa-regular fa-clock"></i>
  <div class="oz-footer-hours-text">
    <span class="oz-footer-hours-label">Business Hours</span>
    <span class="oz-footer-hours-val">{{ WorkingHours }}</span>
  </div>
</div>
{{/if}}`
    },
    {
      label: 'Social Media Channels',
      token: `{{#if HasSocialLinks}}
<div class="oz-footer-socials">
  {{#each SocialLinks}}
  <a href="{{ Url }}" title="{{ Platform }}" class="oz-footer-social-icon" target="_blank" rel="noopener">
    <i class="{{ IconClass }}"></i>
  </a>
  {{/each}}
</div>
{{/if}}`
    },
    {
      label: 'Contact Channels (Loop)',
      token: `{{#if HasContactInfo}}
<div class="oz-footer-contacts">
  {{#each ContactItems}}
  <div class="oz-footer-contact-item">
    <i class="{{ IconClass }}"></i>
    <div class="oz-footer-contact-text">
      <span class="oz-footer-contact-label">{{ Title }}</span>
      <a href="{{ Url }}" class="oz-footer-contact-val">{{ Content }}</a>
    </div>
  </div>
  {{/each}}
</div>
{{/if}}`
    },
    {
      label: 'Legal Pages (Strip)',
      token: `<div class="oz-footer-legal-links">
  {{#each LegalPages}}
  <a href="{{ Url }}" class="oz-footer-legal-link">{{ Title }}</a>
  {{/each}}
</div>`
    },
    {
      label: 'Newsletter Subscribe Form',
      token: `<div class="oz-footer-newsletter-col">
  <h4 class="oz-footer-col-title">Stay Informed</h4>
  <p class="oz-footer-newsletter-desc">Subscribe to receive system alerts, release updates, and architecture advisories.</p>
  <div class="oz-footer-form-wrapper">
    {{ Form "Newsletter_Subscribe" }}
  </div>
</div>`
    },
    {
      label: 'Copyright Notice',
      token: `<p class="oz-footer-copyright">© {{ Year }} {{ BrandName }}. All rights reserved.</p>`
    },
    { label: 'Brand Name', token: '{{ BrandName }}' },
    { label: 'Description', token: '{{ Description }}' },
    { label: 'Phone', token: '{{ Phone }}' },
    { label: 'Email', token: '{{ Email }}' },
    { label: 'Address', token: '{{ Address }}' },
    { label: 'Working Hours', token: '{{ WorkingHours }}' }
  ];

  sampleContent: any = {
    brandName: 'Ozikol Technologies',
    brandLogo: '',
    logoUrl: '',
    homeUrl: '/',
    description: 'Autonomous cloud management, enterprise high availability, and sovereign workload control at planetary scale.',
    copyright: '© 2026 Ozikol Technologies LLC. All rights reserved.',
    year: '2026',
    hasContactInfo: true,
    hasSocialLinks: true,
    email: 'contact@company.com',
    phone: '+1 (555) 019-2834',
    address: 'One Sovereign Way, Suite 400',
    workingHours: 'Mon - Fri: 8:00 AM - 6:00 PM',
    socialLinks: [
      { platform: 'Twitter / X', title: 'Twitter / X', url: 'https://twitter.com', icon: 'share', iconClass: 'fa-brands fa-x-twitter' },
      { platform: 'LinkedIn', title: 'LinkedIn', url: 'https://linkedin.com', icon: 'public', iconClass: 'fa-brands fa-linkedin' },
      { platform: 'Facebook', title: 'Facebook', url: 'https://facebook.com', icon: 'thumb_up', iconClass: 'fa-brands fa-facebook' },
      { platform: 'Instagram', title: 'Instagram', url: 'https://instagram.com', icon: 'photo_camera', iconClass: 'fa-brands fa-instagram' }
    ],
    contactItems: [
      { type: 'phone', channelType: 'Phone', platform: 'Support', title: 'Call Us', description: 'Mon-Fri 8am-6pm', value: '+1 (555) 019-2834', content: '+1 (555) 019-2834', url: 'tel:+15550192834', icon: 'call', iconClass: 'fa-solid fa-phone', isDefault: true },
      { type: 'email', channelType: 'Email', platform: 'General', title: 'Email Us', description: 'Online Inquiries', value: 'contact@company.com', content: 'contact@company.com', url: 'mailto:contact@company.com', icon: 'mail', iconClass: 'fa-solid fa-envelope', isDefault: true },
      { type: 'address', channelType: 'Address', platform: 'HQ', title: 'Headquarters', description: 'Corporate Office', value: 'One Sovereign Way, Suite 400', content: 'One Sovereign Way, Suite 400', url: '#', icon: 'location_on', iconClass: 'fa-solid fa-location-dot', isDefault: true }
    ],
    taggedPages: {
      quicklinks: [
        { title: 'Release Notes', url: '/releases' },
        { title: 'System Status', url: '/status' },
        { title: 'Security Advisories', url: '/security' },
        { title: 'Knowledge Base', url: '/kb' }
      ]
    },
    legalPages: [
      { title: 'Privacy Policy', url: '/privacy-policy' },
      { title: 'Terms of Service', url: '/terms-and-conditions' },
      { title: 'Cookie Policy', url: '/cookie-policy' },
      { title: 'Security & SLA', url: '/security' }
    ],
    footerCategories: [
      {
        title: 'Platform',
        pages: [
          { title: 'Overview', url: '/platform' },
          { title: 'Security Architecture', url: '/security' },
          { title: 'Edge Cloud', url: '/edge' }
        ]
      },
      {
        title: 'Resources',
        pages: [
          { title: 'Developer Portal', url: '/docs' },
          { title: 'API References', url: '/api' },
          { title: 'Status Dashboard', url: '/status' }
        ]
      },
      {
        title: 'Company',
        pages: [
          { title: 'About Us', url: '/about' },
          { title: 'Careers', url: '/careers' },
          { title: 'Press & Media', url: '/press' }
        ]
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
    this.variantCode = `FOOTER_${randomSuffix}`;
  }

  resetBoilerplate(): void {
    this.htmlTemplate = `<footer class="oz-footer-section {{ CustomClass }}">
  <div class="oz-footer-container">
    <div class="oz-footer-grid">
      <div class="oz-footer-brand-col">
        <a class="oz-footer-brand-link" href="{{ HomeUrl }}">
          {{#if BrandLogo}}
            <img src="{{ BrandLogo }}" alt="{{ BrandName }}" class="oz-footer-brand-logo" />
          {{else}}
            <span class="oz-footer-brand-title">{{ BrandName }}</span>
          {{/if}}
        </a>
        <p class="oz-footer-desc">{{ Description }}</p>

        {{#if WorkingHours}}
        <div class="oz-footer-hours">
          <i class="fa-regular fa-clock"></i>
          <div class="oz-footer-hours-text">
            <span class="oz-footer-hours-label">Business Hours</span>
            <span class="oz-footer-hours-val">{{ WorkingHours }}</span>
          </div>
        </div>
        {{/if}}

        {{#if HasContactInfo}}
        <div class="oz-footer-contacts">
          {{#each ContactItems}}
          <div class="oz-footer-contact-item">
            <i class="{{ IconClass }}"></i>
            <div class="oz-footer-contact-text">
              <span class="oz-footer-contact-label">{{ Title }}</span>
              <a href="{{ Url }}" class="oz-footer-contact-val">{{ Content }}</a>
            </div>
          </div>
          {{/each}}
        </div>
        {{/if}}

        {{#if HasSocialLinks}}
        <div class="oz-footer-socials">
          {{#each SocialLinks}}
          <a href="{{ Url }}" title="{{ Platform }}" class="oz-footer-social-icon" target="_blank" rel="noopener">
            <i class="{{ IconClass }}"></i>
          </a>
          {{/each}}
        </div>
        {{/if}}
      </div>

      <div class="oz-footer-nav-group">
        {{#each FooterCategories}}
        <div class="oz-footer-col">
          <h4 class="oz-footer-col-title">{{ Title }}</h4>
          <ul class="oz-footer-links">
            {{#each Pages}}
            <li><a href="{{ Url }}" class="oz-footer-link">{{ Title }}</a></li>
            {{/each}}
          </ul>
        </div>
        {{/each}}

        <div class="oz-footer-col">
          <h4 class="oz-footer-col-title">Quick Links</h4>
          <ul class="oz-footer-links">
            {{#each TaggedPages "quicklinks"}}
            <li><a href="{{ Url }}" class="oz-footer-link">{{ Title }}</a></li>
            {{/each}}
          </ul>
        </div>
      </div>

      <div class="oz-footer-newsletter-col">
        <h4 class="oz-footer-col-title">Stay Informed</h4>
        <p class="oz-footer-newsletter-desc">Subscribe to receive system alerts, release updates, and architecture advisories.</p>
        <div class="oz-footer-form-wrapper">
          {{ Form "Newsletter_Subscribe" }}
        </div>
      </div>
    </div>

    <div class="oz-footer-bottom">
      <p class="oz-footer-copyright">© {{ Year }} {{ BrandName }}. All rights reserved.</p>
      <div class="oz-footer-legal-links">
        {{#each LegalPages}}
        <a href="{{ Url }}" class="oz-footer-legal-link">{{ Title }}</a>
        {{/each}}
      </div>
    </div>
  </div>
</footer>`;

    this.cssStyles = `.oz-footer-section {
  background: #090d16;
  color: #94a3b8;
  padding: 72px 24px 36px 24px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}
.oz-footer-container {
  max-width: 1240px;
  margin: 0 auto;
}
.oz-footer-grid {
  display: grid;
  grid-template-columns: 1.3fr 2fr 1.1fr;
  gap: 48px;
  padding-bottom: 56px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.oz-footer-brand-col {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.oz-footer-brand-link {
  text-decoration: none;
  display: inline-flex;
  align-items: center;
}
.oz-footer-brand-logo {
  max-height: 40px;
  width: auto;
  object-fit: contain;
}
.oz-footer-brand-title {
  color: #ffffff;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.5px;
}
.oz-footer-desc {
  font-size: 14px;
  line-height: 1.65;
  color: #94a3b8;
  margin: 0;
}
.oz-footer-hours {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 10px 14px;
  margin-top: 4px;
}
.oz-footer-hours i {
  color: #38bdf8;
  font-size: 16px;
  flex-shrink: 0;
}
.oz-footer-hours-text {
  display: flex;
  flex-direction: column;
}
.oz-footer-hours-label {
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: #64748b;
  font-weight: 700;
}
.oz-footer-hours-val {
  font-size: 13px;
  color: #e2e8f0;
  font-weight: 500;
}
.oz-footer-contacts {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 6px;
}
.oz-footer-contact-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  font-size: 13.5px;
}
.oz-footer-contact-item i {
  color: #38bdf8;
  font-size: 15px;
  margin-top: 3px;
  flex-shrink: 0;
}
.oz-footer-contact-text {
  display: flex;
  flex-direction: column;
}
.oz-footer-contact-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #64748b;
  font-weight: 600;
}
.oz-footer-contact-val {
  color: #e2e8f0;
  text-decoration: none;
  transition: color 0.2s ease;
}
.oz-footer-contact-val:hover {
  color: #38bdf8;
}
.oz-footer-socials {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
}
.oz-footer-social-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #cbd5e1;
  text-decoration: none;
  transition: all 0.2s ease;
}
.oz-footer-social-icon:hover {
  background: #38bdf8;
  color: #0f172a;
  border-color: #38bdf8;
  transform: translateY(-2px);
}
.oz-footer-nav-group {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 32px;
}
.oz-footer-col-title {
  color: #ffffff;
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin: 0 0 18px 0;
}
.oz-footer-links {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.oz-footer-link {
  color: #94a3b8;
  text-decoration: none;
  font-size: 14px;
  transition: color 0.2s ease;
}
.oz-footer-link:hover {
  color: #38bdf8;
  padding-left: 3px;
}
.oz-footer-newsletter-col {
  display: flex;
  flex-direction: column;
}
.oz-footer-newsletter-desc {
  font-size: 13.5px;
  line-height: 1.6;
  color: #94a3b8;
  margin: 0 0 16px 0;
}
.oz-footer-form-wrapper {
  margin-top: 4px;
}
.oz-footer-form-wrapper form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.oz-footer-form-wrapper input[type="email"],
.oz-footer-form-wrapper input[type="text"] {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  padding: 11px 14px;
  font-size: 13.5px;
  color: #ffffff;
  outline: none;
  transition: all 0.2s ease;
}
.oz-footer-form-wrapper input:focus {
  border-color: #38bdf8;
  box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.15);
}
.oz-footer-form-wrapper button,
.oz-footer-form-wrapper input[type="submit"] {
  background: #38bdf8;
  color: #0f172a;
  border: none;
  border-radius: 8px;
  padding: 11px 20px;
  font-size: 13.5px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}
.oz-footer-form-wrapper button:hover,
.oz-footer-form-wrapper input[type="submit"]:hover {
  background: #7dd3fc;
  transform: translateY(-1px);
}
.oz-footer-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 32px;
  font-size: 13.5px;
  flex-wrap: wrap;
  gap: 16px;
}
.oz-footer-copyright {
  margin: 0;
  color: #64748b;
}
.oz-footer-legal-links {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}
.oz-footer-legal-link {
  color: #94a3b8;
  text-decoration: none;
  transition: color 0.2s ease;
}
.oz-footer-legal-link:hover {
  color: #ffffff;
}
@media (max-width: 1024px) {
  .oz-footer-grid {
    grid-template-columns: 1fr;
    gap: 40px;
  }
}
@media (max-width: 640px) {
  .oz-footer-nav-group {
    grid-template-columns: 1fr 1fr;
  }
  .oz-footer-bottom {
    flex-direction: column;
    align-items: flex-start;
  }
}`;
    this.toast.info('Boilerplate reset to default footer structure.');
  }

  resetSampleContent(): void {
    this.sampleContent = {
      brandName: 'Ozikol Technologies',
      brandLogo: '',
      logoUrl: '',
      homeUrl: '/',
      description: 'Autonomous cloud management, enterprise high availability, and sovereign workload control at planetary scale.',
      copyright: '© 2026 Ozikol Technologies LLC. All rights reserved.',
      year: '2026',
      hasContactInfo: true,
      hasSocialLinks: true,
      email: 'contact@company.com',
      phone: '+1 (555) 019-2834',
      address: 'One Sovereign Way, Suite 400',
      workingHours: 'Mon - Fri: 8:00 AM - 6:00 PM',
      socialLinks: [
        { platform: 'Twitter / X', title: 'Twitter / X', url: 'https://twitter.com', icon: 'share', iconClass: 'fa-brands fa-x-twitter' },
        { platform: 'LinkedIn', title: 'LinkedIn', url: 'https://linkedin.com', icon: 'public', iconClass: 'fa-brands fa-linkedin' },
        { platform: 'Facebook', title: 'Facebook', url: 'https://facebook.com', icon: 'thumb_up', iconClass: 'fa-brands fa-facebook' },
        { platform: 'Instagram', title: 'Instagram', url: 'https://instagram.com', icon: 'photo_camera', iconClass: 'fa-brands fa-instagram' }
      ],
      contactItems: [
        { type: 'phone', channelType: 'Phone', platform: 'Support', title: 'Call Us', description: 'Mon-Fri 8am-6pm', value: '+1 (555) 019-2834', content: '+1 (555) 019-2834', url: 'tel:+15550192834', icon: 'call', iconClass: 'fa-solid fa-phone', isDefault: true },
        { type: 'email', channelType: 'Email', platform: 'General', title: 'Email Us', description: 'Online Inquiries', value: 'contact@company.com', content: 'contact@company.com', url: 'mailto:contact@company.com', icon: 'mail', iconClass: 'fa-solid fa-envelope', isDefault: true },
        { type: 'address', channelType: 'Address', platform: 'HQ', title: 'Headquarters', description: 'Corporate Office', value: 'One Sovereign Way, Suite 400', content: 'One Sovereign Way, Suite 400', url: '#', icon: 'location_on', iconClass: 'fa-solid fa-location-dot', isDefault: true }
      ],
      taggedPages: {
        quicklinks: [
          { title: 'Release Notes', url: '/releases' },
          { title: 'System Status', url: '/status' },
          { title: 'Security Advisories', url: '/security' },
          { title: 'Knowledge Base', url: '/kb' }
        ]
      },
      legalPages: [
        { title: 'Privacy Policy', url: '/privacy-policy' },
        { title: 'Terms of Service', url: '/terms-and-conditions' },
        { title: 'Cookie Policy', url: '/cookie-policy' },
        { title: 'Security & SLA', url: '/security' }
      ],
      footerCategories: [
        {
          title: 'Platform',
          pages: [
            { title: 'Overview', url: '/platform' },
            { title: 'Security Architecture', url: '/security' },
            { title: 'Edge Cloud', url: '/edge' }
          ]
        },
        {
          title: 'Resources',
          pages: [
            { title: 'Developer Portal', url: '/docs' },
            { title: 'API References', url: '/api' },
            { title: 'Status Dashboard', url: '/status' }
          ]
        },
        {
          title: 'Company',
          pages: [
            { title: 'About Us', url: '/about' },
            { title: 'Careers', url: '/careers' },
            { title: 'Press & Media', url: '/press' }
          ]
        }
      ]
    };
    this.toast.info('Footer sample values reset to defaults.');
  }

  addFooterCategory(): void {
    if (!this.sampleContent.footerCategories) this.sampleContent.footerCategories = [];
    this.sampleContent.footerCategories.push({
      title: 'New Column',
      pages: [
        { title: 'Link One', url: '/link1' },
        { title: 'Link Two', url: '/link2' }
      ]
    });
  }

  removeFooterCategory(index: number): void {
    if (this.sampleContent.footerCategories && this.sampleContent.footerCategories.length > index) {
      this.sampleContent.footerCategories.splice(index, 1);
    }
  }

  openPreviewModal(): void {
    this.previewModalService.open({
      title: this.templateName || 'Footer',
      category: 'footer',
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
            ? `Successfully updated Footer template "${name}".`
            : `Successfully created Footer template "${name}".`
        );
        this.templateSaved.emit(res?.data || res);
        this.router.navigate(['/content/console/templates']);
      },
      error: (err: any) => {
        this.isSaving = false;
        const msg = err?.error?.message || err?.message || 'Failed to save Footer template.';
        this.toast.error(`Save error: ${msg}`);
      }
    });
  }
}
