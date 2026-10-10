import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { VisualEditorComponent } from '../../visual-editor/visual-editor.component';
import { ApiService } from '../../../../../../core/services/api.service';
import { ToastService } from '../../../../../../core/services/toast.service';
import { HtmlAssemblerService } from '../../services/html-assembler.service';
import { TemplateHydrationService } from '../../services/template-hydration.service';

/**
 * Dedicated category studio component for creating and editing Breadcrumbs & Subpage Header templates.
 * Enforces dynamic page hierarchy trail, background banner, and scoped styling.
 */
@Component({
  selector: 'app-breadcrumb-visual',
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
              placeholder="e.g. Modern Breadcrumb Page Banner"
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
              (click)="saveBreadcrumbTemplate()"
            >
              <span class="material-symbols-outlined btn-icon" *ngIf="!isSaving">check_circle</span>
              <span class="material-symbols-outlined btn-icon spin" *ngIf="isSaving">sync</span>
              <span>{{ isSaving ? 'Saving...' : (isEditMode ? 'Update Breadcrumb' : 'Save Breadcrumb') }}</span>
            </button>
          </div>
        </div>

        <div class="config-col col-span-full" style="margin-top: 14px;">
          <label class="config-label">DESCRIPTION (OPTIONAL)</label>
          <input
            type="text"
            [(ngModel)]="description"
            class="form-control config-input"
            placeholder="e.g. Centered page banner with responsive dynamic breadcrumb trail and background imagery"
          />
        </div>
      </div>

      <!-- 2. Template Code & Content Studio Card -->
      <div class="code-editor-card">
        <!-- Studio Card Header -->
        <div class="studio-card-header">
          <div class="studio-title-block">
            <span class="material-symbols-outlined studio-code-icon">linear_scale</span>
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
            [category]="'breadcrumb'"
            [categoryName]="'Breadcrumb Header'"
            [activeTab]="activeEditorTab"
            [hideInternalTabs]="true"
            [htmlTemplate]="htmlTemplate"
            [cssStyles]="cssStyles"
            [jsScript]="jsScript"
            [sampleContent]="sampleContent"
            [specificTokens]="breadcrumbTokens"
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
                <h3 class="drawer-title">Mock Content &amp; Loop Configuration for Breadcrumb</h3>
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

          <!-- Mock Data Sub-Tabs: Trail (Default) vs Banner Header -->
          <div class="mock-tabs-nav">
            <button
              type="button"
              class="mock-tab-btn"
              [class.active]="activeMockTab === 'trail'"
              (click)="activeMockTab = 'trail'"
            >
              <span class="material-symbols-outlined icon-micro">linear_scale</span>
              <span>Breadcrumb Trail</span>
              <span class="mock-tab-badge">{{ (sampleContent.breadcrumbs?.length || 3) }}</span>
            </button>
            <button
              type="button"
              class="mock-tab-btn"
              [class.active]="activeMockTab === 'banner'"
              (click)="activeMockTab = 'banner'"
            >
              <span class="material-symbols-outlined icon-micro">image</span>
              <span>Page Header &amp; Banner</span>
            </button>
          </div>

          <!-- Sub-Tab 1: Breadcrumb Trail (Default) -->
          <div class="mock-tab-pane" *ngIf="activeMockTab === 'trail'">
            <div class="nav-tree-container">
              <div class="nav-parent-card" *ngFor="let item of (sampleContent.breadcrumbs || []); let idx = index">
                <div class="nav-parent-header">
                  <span class="material-symbols-outlined nav-item-icon">{{ item.isActive ? 'label' : 'link' }}</span>
                  <input
                    type="text"
                    [(ngModel)]="item.title"
                    class="form-control inspector-input item-title-input"
                    placeholder="e.g. Page Title"
                  />
                  <input
                    type="text"
                    [(ngModel)]="item.url"
                    class="form-control inspector-input item-url-input"
                    placeholder="e.g. /url"
                  />
                  <label class="active-check-label">
                    <input type="checkbox" [(ngModel)]="item.isActive" /> Active Page
                  </label>
                  <button type="button" class="btn-remove-item" (click)="removeBreadcrumbItem(idx)" title="Remove item">
                    <span class="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </div>
              <button type="button" class="btn-add-item" (click)="addBreadcrumbItem()">
                <span class="material-symbols-outlined">add</span>
                <span>Add Breadcrumb Step</span>
              </button>
            </div>
          </div>

          <!-- Sub-Tab 2: Page Header & Banner -->
          <div class="mock-tab-pane" *ngIf="activeMockTab === 'banner'">
            <div class="inspector-form-grid-2">
              <div class="form-group col-span-2">
                <label class="field-label">
                  <span>Page Headline Title</span>
                  <code [innerText]="'{{ Title }}'"></code>
                </label>
                <input
                  type="text"
                  [(ngModel)]="sampleContent.title"
                  class="form-control inspector-input"
                  placeholder="e.g. Enterprise Architecture & Cloud Solutions"
                />
              </div>

              <div class="form-group col-span-2">
                <label class="field-label">
                  <span>SubTitle / Lead</span>
                  <code [innerText]="'{{ SubTitle }}'"></code>
                </label>
                <input
                  type="text"
                  [(ngModel)]="sampleContent.subTitle"
                  class="form-control inspector-input"
                  placeholder="e.g. Discover our cloud migration frameworks"
                />
              </div>

              <div class="form-group col-span-2">
                <label class="field-label">
                  <span>Background Image URL</span>
                  <code [innerText]="'{{ BackgroundImageUrl }}'"></code>
                </label>
                <input
                  type="text"
                  [(ngModel)]="sampleContent.backgroundImageUrl"
                  class="form-control inspector-input"
                  placeholder="e.g. https://images.unsplash.com/..."
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Interactive Simulated Preview Modal -->
      <div class="modal-backdrop" *ngIf="showPreviewModal" (click)="closePreviewModal()">
        <div class="preview-modal-dialog" (click)="$event.stopPropagation()">
          <div class="preview-modal-header">
            <div class="preview-header-meta">
              <div class="preview-badge-icon">
                <span class="material-symbols-outlined">linear_scale</span>
              </div>
              <div>
                <h3 class="preview-modal-name">{{ templateName || 'Breadcrumb Header' }}</h3>
                <span class="preview-modal-sub">
                  Category: <strong>Breadcrumb</strong> &bull; Variant: <code>{{ variantCode }}</code>
                </span>
              </div>
            </div>

            <div class="modal-header-actions">
              <div class="modal-viewport-toggle">
                <button
                  type="button"
                  class="btn-vp"
                  [class.active]="previewViewport === 'desktop'"
                  (click)="previewViewport = 'desktop'"
                >
                  <span class="material-symbols-outlined">desktop_windows</span>
                  <span>Desktop (100%)</span>
                </button>
                <button
                  type="button"
                  class="btn-vp"
                  [class.active]="previewViewport === 'tablet'"
                  (click)="previewViewport = 'tablet'"
                >
                  <span class="material-symbols-outlined">tablet</span>
                  <span>Tablet (768px)</span>
                </button>
                <button
                  type="button"
                  class="btn-vp"
                  [class.active]="previewViewport === 'mobile'"
                  (click)="previewViewport = 'mobile'"
                >
                  <span class="material-symbols-outlined">smartphone</span>
                  <span>Mobile (375px)</span>
                </button>
              </div>
              <button type="button" class="btn-close-modal" (click)="closePreviewModal()">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>
          </div>

          <div class="preview-modal-body">
            <div class="preview-canvas-wrapper" [ngClass]="'viewport-' + previewViewport">
              <iframe
                class="modal-preview-iframe"
                [src]="safeModalPreviewUrl"
                sandbox="allow-scripts allow-same-origin"
                title="Live Simulation Demo"
              ></iframe>
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

    .item-title-input { flex: 2; }
    .item-url-input { flex: 2; }

    .active-check-label {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 700;
      color: #475569;
      cursor: pointer;
      white-space: nowrap;
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
export class BreadcrumbVisualComponent implements OnInit {
  @Input() isEditMode: boolean = false;
  @Input() existingTemplateId?: string;
  @Input() editorTokens: any = null;
  @Output() templateSaved = new EventEmitter<any>();

  templateName: string = 'Modern Breadcrumb Page Banner';
  variantCode: string = '';
  description: string = 'Centered page banner with responsive dynamic breadcrumb trail and background imagery';
  isSaving: boolean = false;

  // Studio Tab Controls (HTML tab is default; Mock sub-tab 1 'trail' is default)
  activeEditorTab: 'html' | 'css' | 'js' | 'mock' = 'html';
  activeMockTab: 'trail' | 'banner' = 'trail';

  // Preview Modal
  showPreviewModal: boolean = false;
  previewViewport: 'desktop' | 'tablet' | 'mobile' = 'desktop';
  safeModalPreviewUrl: SafeResourceUrl | null = null;

  htmlTemplate: string = `<header class="oz-breadcrumb-banner {{ CustomClass }}" style="background-image: url('{{ BackgroundImageUrl }}');">
  <div class="oz-banner-overlay"></div>
  <div class="oz-banner-container">
    <h1 class="oz-banner-title">{{ Title }}</h1>
    {{#if SubTitle}}<p class="oz-banner-subtitle">{{ SubTitle }}</p>{{/if}}
    <nav class="oz-breadcrumb-nav" aria-label="Breadcrumb">
      <ol class="oz-breadcrumb-list">
        {{#each Breadcrumbs}}
        <li class="oz-breadcrumb-item {{#if IsActive}}active{{/if}}">
          {{#if Url}}
          <a href="{{ Url }}" class="oz-breadcrumb-link">{{ Title }}</a>
          {{else}}
          <span class="oz-breadcrumb-current">{{ Title }}</span>
          {{/if}}
        </li>
        {{/each}}
      </ol>
    </nav>
  </div>
</header>`;

  cssStyles: string = `.oz-breadcrumb-banner {
  position: relative;
  background-size: cover;
  background-position: center;
  padding: 72px 24px;
  color: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  text-align: center;
}
.oz-banner-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(2px);
}
.oz-banner-container {
  position: relative;
  z-index: 2;
  max-width: 960px;
  margin: 0 auto;
}
.oz-banner-title {
  font-size: 36px;
  font-weight: 800;
  margin: 0 0 10px 0;
  letter-spacing: -0.02em;
}
.oz-banner-subtitle {
  font-size: 16px;
  color: #cbd5e1;
  margin: 0 0 24px 0;
  line-height: 1.5;
}
.oz-breadcrumb-list {
  display: inline-flex;
  list-style: none;
  padding: 6px 18px;
  margin: 0;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 30px;
  gap: 12px;
  align-items: center;
}
.oz-breadcrumb-item + .oz-breadcrumb-item::before {
  content: '/';
  color: #94a3b8;
  margin-right: 12px;
}
.oz-breadcrumb-link {
  color: #cbd5e1;
  text-decoration: none;
  transition: color 0.2s ease;
}
.oz-breadcrumb-link:hover {
  color: #ffffff;
}
.oz-breadcrumb-item.active {
  color: #38bdf8;
  font-weight: 700;
}`;

  jsScript: string = '';

  breadcrumbTokens: Array<{ label: string; token: string }> = [
    { label: 'Title', token: '{{ Title }}' },
    { label: 'SubTitle', token: '{{ SubTitle }}' },
    { label: 'BackgroundImageUrl', token: '{{ BackgroundImageUrl }}' },
    { label: 'Breadcrumbs Loop', token: '{{#each Breadcrumbs}}\n  <li class="oz-breadcrumb-item {{#if IsActive}}active{{/if}}">\n    {{#if Url}}<a href="{{ Url }}" class="oz-breadcrumb-link">{{ Title }}</a>{{else}}<span>{{ Title }}</span>{{/if}}\n  </li>\n{{/each}}' }
  ];

  sampleContent: any = {
    title: 'Enterprise Architecture & Cloud Solutions',
    subTitle: 'Discover our cloud migration, microservices, and enterprise consulting frameworks.',
    backgroundImageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
    breadcrumbs: [
      { title: 'Home', url: '/' },
      { title: 'Solutions', url: '/solutions' },
      { title: 'Enterprise Architecture', url: '', isActive: true }
    ]
  };

  constructor(
    private api: ApiService,
    private toast: ToastService,
    private sanitizer: DomSanitizer,
    private htmlAssembler: HtmlAssemblerService,
    private hydrationService: TemplateHydrationService,
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
    this.variantCode = `BCRUMB_${randomSuffix}`;
  }

  resetBoilerplate(): void {
    this.toast.info('Boilerplate reset to default breadcrumb structure.');
  }

  resetSampleContent(): void {
    this.sampleContent = {
      title: 'Enterprise Architecture & Cloud Solutions',
      subTitle: 'Discover our cloud migration, microservices, and enterprise consulting frameworks.',
      backgroundImageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
      breadcrumbs: [
        { title: 'Home', url: '/' },
        { title: 'Solutions', url: '/solutions' },
        { title: 'Enterprise Architecture', url: '', isActive: true }
      ]
    };
    this.toast.info('Breadcrumb sample values reset to defaults.');
  }

  addBreadcrumbItem(): void {
    if (!this.sampleContent.breadcrumbs) this.sampleContent.breadcrumbs = [];
    this.sampleContent.breadcrumbs.push({
      title: 'New Page',
      url: '/page',
      isActive: false
    });
  }

  removeBreadcrumbItem(index: number): void {
    if (this.sampleContent.breadcrumbs && this.sampleContent.breadcrumbs.length > index) {
      this.sampleContent.breadcrumbs.splice(index, 1);
    }
  }

  openPreviewModal(): void {
    const rawHtml = this.htmlTemplate || '';
    const rawCss = this.cssStyles || '';
    const rawJs = this.jsScript || '';

    const hydratedHtml = this.hydrationService.hydrateTemplate(
      rawHtml,
      this.sampleContent,
      {
        editorTokens: this.editorTokens,
        currentTenantBrandName: 'Acme Global'
      }
    );

    const assembled = this.htmlAssembler.assembleSectionPreview({
      html: hydratedHtml,
      css: rawCss,
      js: rawJs,
      category: 'breadcrumb',
      pageTitle: `${this.templateName || 'Breadcrumb'} Preview`
    });

    const blob = new Blob([assembled], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    this.safeModalPreviewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    this.showPreviewModal = true;
  }

  closePreviewModal(): void {
    this.showPreviewModal = false;
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
        this.toast.error('Failed to load existing Breadcrumb template.');
      }
    });
  }

  saveBreadcrumbTemplate(): void {
    const name = (this.templateName || '').trim();
    if (!name) {
      this.toast.warning('Please enter a template name.');
      return;
    }

    this.isSaving = true;
    const payload = {
      name,
      category: 'breadcrumb',
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
            ? `Successfully updated Breadcrumb template "${name}".`
            : `Successfully created Breadcrumb template "${name}".`
        );
        this.templateSaved.emit(res?.data || res);
        this.router.navigate(['/content/console/templates']);
      },
      error: (err: any) => {
        this.isSaving = false;
        const msg = err?.error?.message || err?.message || 'Failed to save Breadcrumb template.';
        this.toast.error(`Save error: ${msg}`);
      }
    });
  }
}
