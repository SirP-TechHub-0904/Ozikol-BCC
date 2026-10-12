import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { VisualEditorComponent, SectionPreset } from '../../visual-editor/visual-editor.component';
import { BODY_PRESETS } from './body-presets.data';
import { ApiService } from '../../../../../../core/services/api.service';
import { ToastService } from '../../../../../../core/services/toast.service';
import { UniversalPreviewModalService } from '../../services/universal-preview-modal.service';

/**
 * Dedicated category studio component for creating and editing Body Section templates.
 * Enforces multi-column feature cards, child items repeater loop (PageSectionLists),
 * rich full description scalar, and isolated scoped CSS.
 */
@Component({
  selector: 'app-body-visual',
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
              placeholder="e.g. Nexus Tri-Card Features Grid"
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
              (click)="saveBodyTemplate()"
            >
              <span class="material-symbols-outlined btn-icon" *ngIf="!isSaving">check_circle</span>
              <span class="material-symbols-outlined btn-icon spin" *ngIf="isSaving">sync</span>
              <span>{{ isSaving ? 'Saving...' : (isEditMode ? 'Update Section' : 'Save Section') }}</span>
            </button>
          </div>
        </div>

        <div class="config-col col-span-full" style="margin-top: 14px;">
          <label class="config-label">DESCRIPTION (OPTIONAL)</label>
          <input
            type="text"
            [(ngModel)]="description"
            class="form-control config-input"
            placeholder="e.g. Multi-column responsive grid with icon badges, feature cards, and narrative copy"
          />
        </div>
      </div>

      <!-- 2. Template Code & Content Studio Card -->
      <div class="code-editor-card">
        <!-- Studio Card Header -->
        <div class="studio-card-header">
          <div class="studio-title-block">
            <span class="material-symbols-outlined studio-code-icon">dashboard_customize</span>
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
            [category]="'body'"
            [categoryName]="'Body Section'"
            [activeTab]="activeEditorTab"
            [hideInternalTabs]="true"
            [htmlTemplate]="htmlTemplate"
            [cssStyles]="cssStyles"
            [jsScript]="jsScript"
            [sampleContent]="sampleContent"
            [specificTokens]="bodyTokens"
            [samplePresets]="bodyPresets"
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
                <h3 class="drawer-title">Mock Content &amp; Loop Configuration for Body Section</h3>
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

          <!-- Mock Data Sub-Tabs: Cards Repeater (Default) vs Section Headlines -->
          <div class="mock-tabs-nav">
            <button
              type="button"
              class="mock-tab-btn"
              [class.active]="activeMockTab === 'cards'"
              (click)="activeMockTab = 'cards'"
            >
              <span class="material-symbols-outlined icon-micro">dashboard_customize</span>
              <span>Feature Cards Repeater</span>
              <span class="mock-tab-badge">{{ (sampleContent.pageSectionLists?.length || 3) }}</span>
            </button>
            <button
              type="button"
              class="mock-tab-btn"
              [class.active]="activeMockTab === 'meta'"
              (click)="activeMockTab = 'meta'"
            >
              <span class="material-symbols-outlined icon-micro">title</span>
              <span>Section Headlines &amp; Media</span>
            </button>
          </div>

          <!-- Sub-Tab 1: Feature Cards Repeater (Default) -->
          <div class="mock-tab-pane" *ngIf="activeMockTab === 'cards'">
            <div class="cards-repeater-container">
              <div class="repeater-item-card" *ngFor="let item of (sampleContent.pageSectionLists || []); let idx = index">
                <div class="repeater-header">
                  <span class="material-symbols-outlined icon-badge">{{ item.icon || 'star' }}</span>
                  <input
                    type="text"
                    [(ngModel)]="item.title"
                    class="form-control inspector-input item-title-input"
                    placeholder="e.g. Card Title"
                  />
                  <input
                    type="text"
                    [(ngModel)]="item.icon"
                    class="form-control inspector-input item-icon-input"
                    placeholder="e.g. hub"
                  />
                  <button type="button" class="btn-remove-item" (click)="removeCardItem(idx)" title="Remove item">
                    <span class="material-symbols-outlined">delete</span>
                  </button>
                </div>
                <div class="repeater-body">
                  <textarea
                    [(ngModel)]="item.description"
                    class="form-control inspector-input textarea-short"
                    rows="2"
                    placeholder="e.g. Card description text..."
                  ></textarea>
                </div>
              </div>
              <button type="button" class="btn-add-item" (click)="addCardItem()">
                <span class="material-symbols-outlined">add</span>
                <span>Add Feature Card</span>
              </button>
            </div>
          </div>

          <!-- Sub-Tab 2: Section Headlines & Media -->
          <div class="mock-tab-pane" *ngIf="activeMockTab === 'meta'">
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
                  placeholder="e.g. PLATFORM CAPABILITIES"
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
                  placeholder="e.g. Engineered For Enterprise Scale"
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
                  rows="3"
                  placeholder="e.g. Unified toolchain built from the ground up..."
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
export class BodyVisualComponent implements OnInit {
  @Input() isEditMode: boolean = false;
  @Input() existingTemplateId?: string;
  @Input() editorTokens: any = null;
  @Output() templateSaved = new EventEmitter<any>();

  templateName: string = 'Nexus Tri-Card Features Grid';
  variantCode: string = '';
  description: string = 'Multi-column responsive grid with icon badges, feature cards, and narrative copy';
  isSaving: boolean = false;

  // Studio Tab Controls (HTML tab is default; Mock sub-tab 1 'cards' is default)
  activeEditorTab: 'html' | 'css' | 'js' | 'mock' = 'html';
  activeMockTab: 'cards' | 'meta' = 'cards';

  htmlTemplate: string = `<section class="oz-features-section {{ CustomClass }}">
  <div class="oz-features-container">
    <div class="oz-features-header">
      {{#if MiniTitle}}<span class="oz-features-badge">{{ MiniTitle }}</span>{{/if}}
      <h2 class="oz-features-title">{{ Title }}</h2>
      <p class="oz-features-desc">{{ Description }}</p>
    </div>
    <div class="oz-features-grid">
      {{#each PageSectionLists}}
      <div class="oz-feature-card">
        <div class="oz-feature-icon-box">
          <span class="material-symbols-outlined">{{ Icon }}</span>
        </div>
        <h3 class="oz-feature-card-title">{{ Title }}</h3>
        <p class="oz-feature-card-desc">{{ Description }}</p>
      </div>
      {{/each}}
    </div>
  </div>
</section>`;

  cssStyles: string = `.oz-features-section {
  padding: 80px 24px;
  background: #f8fafc;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.oz-features-container {
  max-width: 1200px;
  margin: 0 auto;
}
.oz-features-header {
  text-align: center;
  max-width: 700px;
  margin: 0 auto 56px auto;
}
.oz-features-badge {
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
.oz-features-title {
  font-size: 34px;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 16px 0;
  letter-spacing: -0.02em;
}
.oz-features-desc {
  font-size: 15px;
  color: #64748b;
  line-height: 1.6;
  margin: 0;
}
.oz-features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 28px;
}
.oz-feature-card {
  background: #ffffff;
  border: 1.5px solid #e2e8f0;
  border-radius: 12px;
  padding: 32px 24px;
  transition: all 0.2s ease;
}
.oz-feature-card:hover {
  transform: translateY(-3px);
  border-color: #0050e5;
  box-shadow: 0 12px 28px rgba(0, 80, 229, 0.08);
}
.oz-feature-icon-box {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  background: #eff6ff;
  color: #0050e5;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 18px;
}
.oz-feature-icon-box .material-symbols-outlined { font-size: 26px; }
.oz-feature-card-title { font-size: 18px; font-weight: 800; color: #0f172a; margin: 0 0 8px 0; }
.oz-feature-card-desc { font-size: 13.5px; color: #64748b; line-height: 1.55; margin: 0; }
@media (max-width: 768px) {
  .oz-features-section { padding: 48px 16px; }
  .oz-features-title { font-size: 26px; }
  .oz-features-desc { font-size: 14px; margin-bottom: 32px; }
  .oz-features-grid { grid-template-columns: 1fr; gap: 16px; }
  .oz-feature-card { padding: 20px; }
}`;

  jsScript: string = '';

  bodyTokens: Array<{ label: string; token: string; htmlSnippet?: string; description?: string }> = [
    { label: 'Title', token: '{{ Title }}', description: 'Main section heading / title.' },
    { label: 'MiniTitle', token: '{{ MiniTitle }}', description: 'Eyebrow kicker badge, category label, or card pill.' },
    { label: 'Description', token: '{{ Description }}', description: 'Section intro description, subtitle, or card excerpt.' },
    { label: 'FullDescription', token: '{{{ FullDescription }}}', description: 'Extended rich HTML body content for split showcases.' },
    { label: 'Quote', token: '{{ Qoute }}', description: 'Highlight quote or callout banner narrative.' },
    { label: 'ImageUrl', token: '{{ ImageUrl }}', description: 'Primary section graphic, hero image, or card thumbnail.' },
    { label: 'SecondImageUrl', token: '{{ SecondImageUrl }}', description: 'Secondary collage graphic or split visual asset.' },
    { label: 'VideoUrl', token: '{{ VideoUrl }}', description: 'Direct video file URL (.mp4, .webm).' },
    { label: 'YoutubeUrlLink', token: '{{ YoutubeUrlLink }}', description: 'External YouTube or Vimeo embed/modal URL.' },
    { label: 'IconText', token: '{{ IconText }}', description: 'CSS icon class string (e.g. tji-rocket, bi-star, fa-check).' },
    { label: 'ButtonText', token: '{{ ButtonText }}', description: 'Primary action button display label.' },
    { label: 'ButtonLink', token: '{{ ButtonLink }}', description: 'Primary action destination URL.' },
    { label: 'SecondButtonText', token: '{{ SecondButtonText }}', description: 'Secondary outline button label for dual-CTA sections.' },
    { label: 'SecondButtonLink', token: '{{ SecondButtonLink }}', description: 'Secondary outline button destination URL.' },
    { label: 'DirectUrl', token: '{{ DirectUrl }}', description: 'Direct routing link or section anchor.' },
    {
      label: 'Cards Repeater',
      token: '{{#each PageSectionLists}}\n  <div class="col-item">\n    <span class="material-symbols-outlined">{{ Icon }}</span>\n    <h3>{{ Title }}</h3>\n    <p>{{ Description }}</p>\n    <a href="{{ ButtonLink }}">{{ ButtonText }}</a>\n  </div>\n{{/each}}',
      description: 'Repeats over all active child items/cards in PageSectionList.'
    },
    { label: 'Contact Form', token: '{{ Form "Contact_Us" }}', description: 'Embeds dynamic tenant contact inquiry form.' },
    { label: 'Service Form', token: '{{ Form "Service_Request" }}', description: 'Embeds dynamic tenant service quotation booking form.' },
    { label: 'CustomClass', token: '{{ CustomClass }}', description: 'Injects custom CSS modifier class into the root container.' }
  ];

  bodyPresets: SectionPreset[] = BODY_PRESETS;

  sampleContent: any = {
    title: 'Engineered For Enterprise Scale And Sub-Millisecond Speed',
    miniTitle: 'PLATFORM CAPABILITIES',
    description: 'Unified toolchain built from the ground up to solve distributed bottlenecks and enhance organizational productivity.',
    pageSectionLists: [
      { title: 'Edge Cloud Replication', description: 'Continuous multi-region synchronization keeps endpoints resilient against downtime.', icon: 'hub' },
      { title: 'Zero Trust Security', description: 'Granular policy enforcement, automatic device trust tokens, and cryptographic verification on every call.', icon: 'verified_user' },
      { title: 'Automated CI/CD Workflows', description: 'Push to git and deploy production containers in seconds with automated rollbacks.', icon: 'rocket_launch' }
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
    this.variantCode = `BODY_${randomSuffix}`;
  }

  resetBoilerplate(): void {
    this.toast.info('Boilerplate reset to default body section structure.');
  }

  resetSampleContent(): void {
    this.sampleContent = {
      title: 'Engineered For Enterprise Scale And Sub-Millisecond Speed',
      miniTitle: 'PLATFORM CAPABILITIES',
      description: 'Unified toolchain built from the ground up to solve distributed bottlenecks and enhance organizational productivity.',
      pageSectionLists: [
        { title: 'Edge Cloud Replication', description: 'Continuous multi-region synchronization keeps endpoints resilient against downtime.', icon: 'hub' },
        { title: 'Zero Trust Security', description: 'Granular policy enforcement, automatic device trust tokens, and cryptographic verification on every call.', icon: 'verified_user' },
        { title: 'Automated CI/CD Workflows', description: 'Push to git and deploy production containers in seconds with automated rollbacks.', icon: 'rocket_launch' }
      ]
    };
    this.toast.info('Body section sample values reset to defaults.');
  }

  addCardItem(): void {
    if (!this.sampleContent.pageSectionLists) this.sampleContent.pageSectionLists = [];
    this.sampleContent.pageSectionLists.push({
      title: 'New Feature Capability',
      description: 'High performance capability designed for speed and reliability.',
      icon: 'check_circle'
    });
  }

  removeCardItem(index: number): void {
    if (this.sampleContent.pageSectionLists && this.sampleContent.pageSectionLists.length > index) {
      this.sampleContent.pageSectionLists.splice(index, 1);
    }
  }

  openPreviewModal(): void {
    this.previewModalService.open({
      title: this.templateName || 'Body Section',
      category: 'body',
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
        this.toast.error('Failed to load existing Body Section template.');
      }
    });
  }

  saveBodyTemplate(): void {
    const name = (this.templateName || '').trim();
    if (!name) {
      this.toast.warning('Please enter a template name.');
      return;
    }

    this.isSaving = true;
    const payload = {
      name,
      category: 'body',
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
            ? `Successfully updated Body Section template "${name}".`
            : `Successfully created Body Section template "${name}".`
        );
        this.templateSaved.emit(res?.data || res);
        this.router.navigate(['/content/console/templates']);
      },
      error: (err: any) => {
        this.isSaving = false;
        const msg = err?.error?.message || err?.message || 'Failed to save Body Section template.';
        this.toast.error(`Save error: ${msg}`);
      }
    });
  }
}
