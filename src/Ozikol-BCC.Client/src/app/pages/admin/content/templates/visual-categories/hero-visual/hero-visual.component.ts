import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { VisualEditorComponent } from '../../visual-editor/visual-editor.component';
import { ApiService } from '../../../../../../core/services/api.service';
import { ToastService } from '../../../../../../core/services/toast.service';
import { UniversalPreviewModalService } from '../../services/universal-preview-modal.service';
import { TemplateSecurityScannerService } from '../../services/template-security-scanner.service';

/**
 * Dedicated category studio component for creating and editing Hero Section templates.
 * Enforces pure scoped CSS, dynamic headline, dual CTAs, badge, media, and Monaco code folding.
 */
@Component({
  selector: 'app-hero-visual',
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
              placeholder="e.g. Quantum Split Showcase Hero"
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
              (click)="saveHeroTemplate()"
            >
              <span class="material-symbols-outlined btn-icon" *ngIf="!isSaving">check_circle</span>
              <span class="material-symbols-outlined btn-icon spin" *ngIf="isSaving">sync</span>
              <span>{{ isSaving ? 'Saving...' : (isEditMode ? 'Update Hero' : 'Save Hero') }}</span>
            </button>
          </div>
        </div>

        <div class="config-col col-span-full" style="margin-top: 14px;">
          <label class="config-label">DESCRIPTION (OPTIONAL)</label>
          <input
            type="text"
            [(ngModel)]="description"
            class="form-control config-input"
            placeholder="e.g. Split hero showcase with bold headline, dual CTAs, badge, and media"
          />
        </div>
      </div>

      <!-- 2. Template Code & Content Studio Card -->
      <div class="code-editor-card">
        <!-- Studio Card Header -->
        <div class="studio-card-header">
          <div class="studio-title-block">
            <span class="material-symbols-outlined studio-code-icon">view_headline</span>
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
            [category]="'hero'"
            [categoryName]="'Hero Showcase'"
            [activeTab]="activeEditorTab"
            [hideInternalTabs]="true"
            [htmlTemplate]="htmlTemplate"
            [cssStyles]="cssStyles"
            [jsScript]="jsScript"
            [sampleContent]="sampleContent"
            [specificTokens]="heroTokens"
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
                <h3 class="drawer-title">Mock Content &amp; Loop Configuration for Hero</h3>
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

          <!-- Mock Data Sub-Tabs: Slide 1 vs Slide 2 -->
          <div class="mock-tabs-nav">
            <button
              type="button"
              class="mock-tab-btn"
              [class.active]="activeMockTab === 'slide_1'"
              (click)="activeMockTab = 'slide_1'"
            >
              <span class="slide-indicator-pill">1</span>
              <span>Slide 1 (First Image)</span>
            </button>
            <button
              type="button"
              class="mock-tab-btn"
              [class.active]="activeMockTab === 'slide_2'"
              (click)="activeMockTab = 'slide_2'"
            >
              <span class="slide-indicator-pill">2</span>
              <span>Slide 2 (Second Image)</span>
            </button>
          </div>

          <!-- Sub-Tab 1: Slide 1 Configuration -->
          <div class="mock-tab-pane" *ngIf="activeMockTab === 'slide_1' && sampleContent.items?.[0]">
            <div class="slide-pane-header">
              <span class="slide-pane-tag">SLIDE 1 CONFIGURATION</span>
              <span class="slide-pane-hint">Controls the first banner image, headline, and call to action buttons</span>
            </div>
            <div class="inspector-form-grid-2">
              <div class="form-group">
                <label class="field-label">
                  <span>Badge / Mini Headline</span>
                  <code [innerText]="'{{ MiniTitle }}'"></code>
                </label>
                <input
                  type="text"
                  [(ngModel)]="sampleContent.items[0].miniTitle"
                  (ngModelChange)="onSlide1Change()"
                  class="form-control inspector-input"
                  placeholder="e.g. ENTERPRISE CLOUD PLATFORM"
                />
              </div>

              <div class="form-group">
                <label class="field-label">
                  <span>Main Headline Title</span>
                  <code [innerText]="'{{ Title }}'"></code>
                </label>
                <input
                  type="text"
                  [(ngModel)]="sampleContent.items[0].title"
                  (ngModelChange)="onSlide1Change()"
                  class="form-control inspector-input"
                  placeholder="e.g. Scale Your Digital Infrastructure"
                />
              </div>

              <div class="form-group col-span-2">
                <label class="field-label">
                  <span>Lead Paragraph Description</span>
                  <code [innerText]="'{{ Description }}'"></code>
                </label>
                <textarea
                  [(ngModel)]="sampleContent.items[0].description"
                  (ngModelChange)="onSlide1Change()"
                  class="form-control inspector-input textarea-tall"
                  rows="3"
                  placeholder="e.g. Deploy mission-critical workloads..."
                ></textarea>
              </div>

              <div class="form-group col-span-2">
                <label class="field-label">
                  <span>Slide 1 Background Image URL</span>
                  <code [innerText]="'{{ ImageUrl }}'"></code>
                </label>
                <div class="image-input-with-preview">
                  <input
                    type="text"
                    [(ngModel)]="sampleContent.items[0].imageUrl"
                    (ngModelChange)="onSlide1Change()"
                    class="form-control inspector-input flex-1"
                    placeholder="e.g. https://images.unsplash.com/..."
                  />
                  <div class="mini-img-preview" *ngIf="sampleContent.items[0].imageUrl">
                    <img [src]="sampleContent.items[0].imageUrl" alt="Slide 1 Preview" />
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label class="field-label">
                  <span>Primary Button Label</span>
                  <code [innerText]="'{{ ButtonText }}'"></code>
                </label>
                <input
                  type="text"
                  [(ngModel)]="sampleContent.items[0].buttonText"
                  (ngModelChange)="onSlide1Change()"
                  class="form-control inspector-input"
                  placeholder="e.g. Get Started Free"
                />
              </div>

              <div class="form-group">
                <label class="field-label">
                  <span>Primary Button Link</span>
                  <code [innerText]="'{{ ButtonLink }}'"></code>
                </label>
                <input
                  type="text"
                  [(ngModel)]="sampleContent.items[0].buttonLink"
                  (ngModelChange)="onSlide1Change()"
                  class="form-control inspector-input"
                  placeholder="e.g. #signup"
                />
              </div>

              <div class="form-group">
                <label class="field-label">
                  <span>Secondary Button Label</span>
                  <code [innerText]="'{{ SecondaryButtonText }}'"></code>
                </label>
                <input
                  type="text"
                  [(ngModel)]="sampleContent.items[0].secondaryButtonText"
                  (ngModelChange)="onSlide1Change()"
                  class="form-control inspector-input"
                  placeholder="e.g. Explore Platform"
                />
              </div>

              <div class="form-group">
                <label class="field-label">
                  <span>Secondary Button Link</span>
                  <code [innerText]="'{{ SecondaryButtonLink }}'"></code>
                </label>
                <input
                  type="text"
                  [(ngModel)]="sampleContent.items[0].secondaryButtonLink"
                  (ngModelChange)="onSlide1Change()"
                  class="form-control inspector-input"
                  placeholder="e.g. #features"
                />
              </div>
            </div>
          </div>

          <!-- Sub-Tab 2: Slide 2 Configuration -->
          <div class="mock-tab-pane" *ngIf="activeMockTab === 'slide_2' && sampleContent.items?.[1]">
            <div class="slide-pane-header">
              <span class="slide-pane-tag">SLIDE 2 CONFIGURATION</span>
              <span class="slide-pane-hint">Controls the second banner image, headline, and call to action buttons</span>
            </div>
            <div class="inspector-form-grid-2">
              <div class="form-group">
                <label class="field-label">
                  <span>Badge / Mini Headline</span>
                  <code [innerText]="'{{ MiniTitle }}'"></code>
                </label>
                <input
                  type="text"
                  [(ngModel)]="sampleContent.items[1].miniTitle"
                  class="form-control inspector-input"
                  placeholder="e.g. NEXT-GEN AI AUTOMATION"
                />
              </div>

              <div class="form-group">
                <label class="field-label">
                  <span>Main Headline Title</span>
                  <code [innerText]="'{{ Title }}'"></code>
                </label>
                <input
                  type="text"
                  [(ngModel)]="sampleContent.items[1].title"
                  class="form-control inspector-input"
                  placeholder="e.g. Accelerate Intelligent Workflows"
                />
              </div>

              <div class="form-group col-span-2">
                <label class="field-label">
                  <span>Lead Paragraph Description</span>
                  <code [innerText]="'{{ Description }}'"></code>
                </label>
                <textarea
                  [(ngModel)]="sampleContent.items[1].description"
                  class="form-control inspector-input textarea-tall"
                  rows="3"
                  placeholder="e.g. Automate complex operations..."
                ></textarea>
              </div>

              <div class="form-group col-span-2">
                <label class="field-label">
                  <span>Slide 2 Background Image URL</span>
                  <code [innerText]="'{{ ImageUrl }}'"></code>
                </label>
                <div class="image-input-with-preview">
                  <input
                    type="text"
                    [(ngModel)]="sampleContent.items[1].imageUrl"
                    class="form-control inspector-input flex-1"
                    placeholder="e.g. https://images.unsplash.com/..."
                  />
                  <div class="mini-img-preview" *ngIf="sampleContent.items[1].imageUrl">
                    <img [src]="sampleContent.items[1].imageUrl" alt="Slide 2 Preview" />
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label class="field-label">
                  <span>Primary Button Label</span>
                  <code [innerText]="'{{ ButtonText }}'"></code>
                </label>
                <input
                  type="text"
                  [(ngModel)]="sampleContent.items[1].buttonText"
                  class="form-control inspector-input"
                  placeholder="e.g. Schedule a Demo"
                />
              </div>

              <div class="form-group">
                <label class="field-label">
                  <span>Primary Button Link</span>
                  <code [innerText]="'{{ ButtonLink }}'"></code>
                </label>
                <input
                  type="text"
                  [(ngModel)]="sampleContent.items[1].buttonLink"
                  class="form-control inspector-input"
                  placeholder="e.g. #demo"
                />
              </div>

              <div class="form-group">
                <label class="field-label">
                  <span>Secondary Button Label</span>
                  <code [innerText]="'{{ SecondaryButtonText }}'"></code>
                </label>
                <input
                  type="text"
                  [(ngModel)]="sampleContent.items[1].secondaryButtonText"
                  class="form-control inspector-input"
                  placeholder="e.g. View Case Studies"
                />
              </div>

              <div class="form-group">
                <label class="field-label">
                  <span>Secondary Button Link</span>
                  <code [innerText]="'{{ SecondaryButtonLink }}'"></code>
                </label>
                <input
                  type="text"
                  [(ngModel)]="sampleContent.items[1].secondaryButtonLink"
                  class="form-control inspector-input"
                  placeholder="e.g. #case-studies"
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

    /* 1. Metadata Configuration Card */
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

    /* 2. Code Editor Card */
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

    /* 4 Tabs Bar */
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

    /* Mock Content Card */
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

    .slide-indicator-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #e2e8f0;
      color: #334155;
      font-size: 11px;
      font-weight: 800;
      transition: all 0.2s ease;
    }

    .mock-tab-btn.active .slide-indicator-pill {
      background: #0050e5;
      color: #ffffff;
    }

    .slide-pane-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 18px;
      padding-bottom: 12px;
      border-bottom: 1px dashed #e2e8f0;
      flex-wrap: wrap;
    }

    .slide-pane-tag {
      font-size: 11px;
      font-weight: 800;
      color: #0050e5;
      background: #eff6ff;
      padding: 4px 10px;
      border-radius: 6px;
      letter-spacing: 0.5px;
    }

    .slide-pane-hint {
      font-size: 12px;
      color: #64748b;
    }

    .image-input-with-preview {
      display: flex;
      gap: 12px;
      align-items: center;
    }

    .flex-1 {
      flex: 1;
    }

    .mini-img-preview {
      width: 58px;
      height: 40px;
      border-radius: 6px;
      overflow: hidden;
      border: 1.5px solid #cbd5e1;
      flex-shrink: 0;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
      background: #f8fafc;
    }

    .mini-img-preview img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .inspector-form-grid-2 {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 18px;
    }

    .col-span-2 {
      grid-column: span 2;
    }

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

    .textarea-tall {
      resize: vertical;
      font-family: inherit;
    }

    /* Modal Backdrop & Dialog */
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
export class HeroVisualComponent implements OnInit {
  @Input() isEditMode: boolean = false;
  @Input() existingTemplateId?: string;
  @Input() editorTokens: any = null;
  @Output() templateSaved = new EventEmitter<any>();

  templateName: string = 'Quantum 2-Slide Hero Showcase';
  variantCode: string = '';
  description: string = 'Dual-image hero slider with animated background transitions, customizable CTAs, and dot pagination';
  isSaving: boolean = false;

  // Studio Tab Controls (HTML tab is default; Mock sub-tab 1 'slide_1' is default)
  activeEditorTab: 'html' | 'css' | 'js' | 'mock' = 'html';
  activeMockTab: 'slide_1' | 'slide_2' = 'slide_1';

  htmlTemplate: string = '';
  cssStyles: string = '';
  jsScript: string = '';
  sampleContent: any = {};

  heroTokens: Array<{ label: string; token: string; htmlSnippet?: string; description?: string }> = [
    { label: 'Slider Track Loop', token: '{{#each PageSectionLists}}\n<div class="slide">\n  <h1>{{ PageSectionList.Title }}</h1>\n  <p>{{ PageSectionList.Description }}</p>\n</div>\n{{/each}}', description: 'Multi-slide responsive carousel iteration.' },
    { label: 'Slide Title', token: '{{ PageSectionList.Title }}', description: 'Current slide headline in PageSectionList.' },
    { label: 'Slide Subtitle', token: '{{ PageSectionList.MiniTitle }}', description: 'Current slide kicker badge in PageSectionList.' },
    { label: 'Slide Description', token: '{{ PageSectionList.Description }}', description: 'Current slide narrative text in PageSectionList.' },
    { label: 'Slide Image', token: '{{ PageSectionList.ImageUrl }}', description: 'Current slide background visual in PageSectionList.' },
    { label: 'Slide Button', token: '{{ PageSectionList.ButtonText }}', description: 'Current slide action button in PageSectionList.' },
    { label: 'Section Title', token: '{{ PageSection.Title }}', description: 'Parent section title.' },
    { label: 'Section MiniTitle', token: '{{ PageSection.MiniTitle }}', description: 'Parent section category label or eyebrow badge.' },
    { label: 'Section Description', token: '{{ PageSection.Description }}', description: 'Parent section introductory narrative text.' },
    { label: 'Section ImageUrl', token: '{{ PageSection.ImageUrl }}', description: 'Parent section showcase background or visual URL.' },
    { label: 'ButtonText', token: '{{ ButtonText }}', description: 'Primary action button label.' },
    { label: 'ButtonLink', token: '{{ ButtonLink }}', description: 'Primary action destination link.' },
    { label: 'SecondaryButtonText', token: '{{ SecondaryButtonText }}', description: 'Secondary button label.' },
    { label: 'SecondaryButtonLink', token: '{{ SecondaryButtonLink }}', description: 'Secondary button destination link.' }
  ];
  constructor(
    private api: ApiService,
    private toast: ToastService,
    private previewModalService: UniversalPreviewModalService,
    private securityScanner: TemplateSecurityScannerService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (!this.variantCode) {
      this.regenerateVariantCode();
    }
    if (this.isEditMode && this.existingTemplateId) {
      this.loadExistingTemplate(this.existingTemplateId);
    } else {
      this.loadBlueprint();
    }
  }

  regenerateVariantCode(): void {
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
    this.variantCode = `HERO_${randomSuffix}`;
  }

  /**
   * Loads the factory default hero blueprint (template.html, styles.css, script.js, sample-content.json)
   * directly from central blueprint files.
   */
  loadBlueprint(forceReload: boolean = false, toastSuccess?: string): void {
    const url = forceReload ? 'ContentApi/templates/blueprint/hero?reload=true' : 'ContentApi/templates/blueprint/hero';
    this.api.get<any>(url).subscribe({
      next: (res) => {
        const bp = res?.data || res;
        if (bp) {
          this.htmlTemplate = bp.htmlTemplate || '';
          this.cssStyles = bp.cssStyles || '';
          this.jsScript = bp.jsScript || '';
          if (bp.sampleContent) {
            this.sampleContent = bp.sampleContent;
            this.ensureSlideItems();
          }
          if (!this.isEditMode) {
            this.templateName = bp.name || this.templateName;
            this.description = bp.description || this.description;
          }
          if (toastSuccess) {
            this.toast.info(toastSuccess);
          }
        }
      },
      error: () => {
        this.toast.error('Failed to load Hero blueprint from central API.');
      }
    });
  }

  ensureSlideItems(): void {
    if (!this.sampleContent) this.sampleContent = {};
    if (!this.sampleContent.items || this.sampleContent.items.length === 0) {
      this.sampleContent.items = [
        {
          sortOrder: 1,
          miniTitle: this.sampleContent.miniTitle || 'ENTERPRISE PLATFORM',
          title: this.sampleContent.title || 'Scale Your Digital Infrastructure',
          description: this.sampleContent.description || 'Deploy mission-critical workloads.',
          imageUrl: this.sampleContent.imageUrl || 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=1600',
          buttonText: this.sampleContent.buttonText || 'Get Started',
          buttonLink: this.sampleContent.buttonLink || '#signup',
          secondaryButtonText: this.sampleContent.secondaryButtonText || 'Explore',
          secondaryButtonLink: this.sampleContent.secondaryButtonLink || '#features'
        }
      ];
    }
  }

  onSlide1Change(): void {
    if (this.sampleContent?.items?.[0]) {
      const s1 = this.sampleContent.items[0];
      this.sampleContent.title = s1.title;
      this.sampleContent.miniTitle = s1.miniTitle;
      this.sampleContent.description = s1.description;
      this.sampleContent.imageUrl = s1.imageUrl;
      this.sampleContent.buttonText = s1.buttonText;
      this.sampleContent.buttonLink = s1.buttonLink;
      this.sampleContent.secondaryButtonText = s1.secondaryButtonText;
      this.sampleContent.secondaryButtonLink = s1.secondaryButtonLink;
    }
  }

  resetBoilerplate(): void {
    this.loadBlueprint(true, 'Boilerplate reset to default hero files.');
  }

  resetSampleContent(): void {
    this.api.get<any>('ContentApi/templates/blueprint/hero?reload=true').subscribe({
      next: (res) => {
        const bp = res?.data || res;
        if (bp?.sampleContent) {
          this.sampleContent = bp.sampleContent;
          this.ensureSlideItems();
          this.toast.info('Hero sample values reset to file defaults.');
        }
      },
      error: () => {
        this.toast.error('Failed to reset sample content from central API.');
      }
    });
  }

  openPreviewModal(): void {
    this.previewModalService.open({
      title: this.templateName || 'Hero Showcase',
      category: 'hero',
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
              this.ensureSlideItems();
            } catch (e) {}
          }
        }
      },
      error: () => {
        this.toast.error('Failed to load existing Hero template.');
      }
    });
  }

  saveHeroTemplate(): void {
    const name = (this.templateName || '').trim();
    if (!name) {
      this.toast.warning('Please enter a template name.');
      return;
    }

    this.securityScanner.scanAndExecute({
      title: name,
      category: 'hero',
      html: this.htmlTemplate || '',
      css: this.cssStyles || '',
      js: this.jsScript || '',
      mockJson: JSON.stringify(this.sampleContent),
      onConfirmSave: () => this.executeSaveHeroTemplate(name)
    });
  }

  private executeSaveHeroTemplate(name: string): void {
    this.isSaving = true;
    const payload = {
      name,
      category: 'hero',
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
            ? `Successfully updated Hero template "${name}".`
            : `Successfully created Hero template "${name}".`
        );
        this.templateSaved.emit(res?.data || res);
        this.router.navigate(['/content/console/templates']);
      },
      error: (err: any) => {
        this.isSaving = false;
        if (err?.status === 400 && (err?.error?.message?.toLowerCase().includes('security') || err?.error?.data?.violations)) {
          this.securityScanner.handleBackendError(err);
        } else {
          const msg = err?.error?.message || err?.message || 'Failed to save Hero template.';
          this.toast.error(`Save error: ${msg}`);
        }
      }
    });
  }
}
