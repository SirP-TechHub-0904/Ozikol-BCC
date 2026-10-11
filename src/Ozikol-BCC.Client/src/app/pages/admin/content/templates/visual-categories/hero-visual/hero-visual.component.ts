import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { VisualEditorComponent } from '../../visual-editor/visual-editor.component';
import { ApiService } from '../../../../../../core/services/api.service';
import { ToastService } from '../../../../../../core/services/toast.service';
import { UniversalPreviewModalService } from '../../services/universal-preview-modal.service';

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

  htmlTemplate: string = `<section class="oz-hero-slider {{ CustomClass }}">
  <div class="oz-slider-track">
    {{#each PageSectionLists}}
    <div class="oz-slide {{#if @first}}active{{/if}}" data-slide="{{ @index }}">
      <div class="oz-slide-bg" style="background-image: url('{{ ImageUrl }}');"></div>
      <div class="oz-slide-overlay"></div>
      <div class="oz-slide-container">
        <div class="oz-slide-content">
          {{#if MiniTitle}}<span class="oz-slide-badge">{{ MiniTitle }}</span>{{/if}}
          <h1 class="oz-slide-title">{{ Title }}</h1>
          <p class="oz-slide-desc">{{ Description }}</p>
          <div class="oz-slide-actions">
            {{#if ButtonText}}
            <a href="{{ ButtonLink }}" class="oz-btn-primary">{{ ButtonText }}</a>
            {{/if}}
            {{#if SecondaryButtonText}}
            <a href="{{ SecondaryButtonLink }}" class="oz-btn-secondary">{{ SecondaryButtonText }}</a>
            {{/if}}
          </div>
        </div>
      </div>
    </div>
    {{/each}}
  </div>

  <!-- Navigation Controls -->
  <button type="button" class="oz-slider-arrow oz-prev" aria-label="Previous Slide">
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="15 18 9 12 15 6"></polyline>
    </svg>
  </button>
  <button type="button" class="oz-slider-arrow oz-next" aria-label="Next Slide">
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="9 18 15 12 9 6"></polyline>
    </svg>
  </button>

  <!-- Pagination Dots -->
  <div class="oz-slider-dots">
    {{#each PageSectionLists}}
    <button type="button" class="oz-slider-dot {{#if @first}}active{{/if}}" data-index="{{ @index }}" aria-label="Slide {{ @number }}"></button>
    {{/each}}
  </div>
</section>`;

  cssStyles: string = `.oz-hero-slider {
  position: relative;
  min-height: 580px;
  display: flex;
  align-items: center;
  overflow: hidden;
  background: #0f172a;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.oz-slider-track {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 580px;
}
.oz-slide {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.7s cubic-bezier(0.4, 0, 0.2, 1), visibility 0.7s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 1;
}
.oz-slide.active {
  opacity: 1;
  visibility: visible;
  z-index: 2;
}
.oz-slide-bg {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  transform: scale(1.05);
  transition: transform 7s ease-out;
}
.oz-slide.active .oz-slide-bg {
  transform: scale(1);
}
.oz-slide-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgba(15, 23, 42, 0.92) 0%, rgba(15, 23, 42, 0.68) 55%, rgba(15, 23, 42, 0.35) 100%);
}
.oz-slide-container {
  position: relative;
  z-index: 3;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  padding: 80px 32px;
  box-sizing: border-box;
}
.oz-slide-content {
  max-width: 640px;
}
.oz-slide-badge {
  display: inline-block;
  padding: 6px 14px;
  background: rgba(0, 80, 229, 0.25);
  border: 1px solid rgba(147, 197, 253, 0.4);
  color: #93c5fd;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  margin-bottom: 18px;
  backdrop-filter: blur(8px);
}
.oz-slide-title {
  font-size: 46px;
  font-weight: 900;
  color: #ffffff;
  line-height: 1.15;
  margin: 0 0 18px 0;
  letter-spacing: -0.025em;
}
.oz-slide-desc {
  font-size: 16px;
  color: #e2e8f0;
  line-height: 1.6;
  margin: 0 0 32px 0;
}
.oz-slide-actions {
  display: flex;
  gap: 14px;
  align-items: center;
  flex-wrap: wrap;
}
.oz-btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 13px 30px;
  background: #0050e5;
  color: #ffffff;
  font-size: 14px;
  font-weight: 700;
  border-radius: 8px;
  text-decoration: none;
  transition: all 0.2s ease;
  box-shadow: 0 4px 15px rgba(0, 80, 229, 0.4);
}
.oz-btn-primary:hover {
  background: #003db3;
  transform: translateY(-2px);
  box-shadow: 0 6px 22px rgba(0, 80, 229, 0.5);
}
.oz-btn-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 13px 30px;
  background: rgba(255, 255, 255, 0.12);
  color: #ffffff;
  font-size: 14px;
  font-weight: 700;
  border-radius: 8px;
  text-decoration: none;
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.25);
  transition: all 0.2s ease;
}
.oz-btn-secondary:hover {
  background: rgba(255, 255, 255, 0.22);
  border-color: rgba(255, 255, 255, 0.4);
}
.oz-slider-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}
.oz-slider-arrow:hover {
  background: rgba(0, 80, 229, 0.85);
  border-color: #0050e5;
  transform: translateY(-50%) scale(1.08);
}
.oz-prev { left: 24px; }
.oz-next { right: 24px; }

.oz-slider-dots {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  display: flex;
  gap: 10px;
}
.oz-slider-dot {
  width: 28px;
  height: 7px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.35);
  border: none;
  cursor: pointer;
  transition: all 0.25s ease;
  padding: 0;
}
.oz-slider-dot.active {
  width: 44px;
  background: #0050e5;
  box-shadow: 0 0 10px rgba(0, 80, 229, 0.6);
}
@media (max-width: 768px) {
  .oz-hero-slider, .oz-slider-track { min-height: 500px; }
  .oz-slide-title { font-size: 32px; }
  .oz-slide-desc { font-size: 15px; }
  .oz-slider-arrow { display: none; }
  .oz-slide-container { padding: 60px 20px; }
}
@media (max-width: 480px) {
  .oz-hero-slider, .oz-slider-track { min-height: 460px; }
  .oz-slide-title { font-size: 26px; }
  .oz-slide-desc { font-size: 14px; margin-bottom: 24px; }
  .oz-slide-actions { flex-direction: column; width: 100%; }
  .oz-btn-primary, .oz-btn-secondary { width: 100%; text-align: center; box-sizing: border-box; }
}`;

  jsScript: string = `(function() {
  function initHeroSlider() {
    var section = document.querySelector('.oz-hero-slider');
    if (!section) return;

    var slides = section.querySelectorAll('.oz-slide');
    var dots = section.querySelectorAll('.oz-slider-dot');
    var prevBtn = section.querySelector('.oz-prev');
    var nextBtn = section.querySelector('.oz-next');

    if (slides.length <= 1) return;

    var currentIndex = 0;
    var timer = null;

    function showSlide(index) {
      if (index < 0) index = slides.length - 1;
      if (index >= slides.length) index = 0;
      currentIndex = index;

      for (var i = 0; i < slides.length; i++) {
        if (i === currentIndex) {
          slides[i].classList.add('active');
        } else {
          slides[i].classList.remove('active');
        }
      }

      for (var j = 0; j < dots.length; j++) {
        if (j === currentIndex) {
          dots[j].classList.add('active');
        } else {
          dots[j].classList.remove('active');
        }
      }
    }

    function nextSlide() {
      showSlide(currentIndex + 1);
    }

    function prevSlide() {
      showSlide(currentIndex - 1);
    }

    function startAutoPlay() {
      stopAutoPlay();
      timer = setInterval(nextSlide, 5000);
    }

    function stopAutoPlay() {
      if (timer) clearInterval(timer);
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', function(e) {
        e.preventDefault();
        prevSlide();
        startAutoPlay();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', function(e) {
        e.preventDefault();
        nextSlide();
        startAutoPlay();
      });
    }

    for (var k = 0; k < dots.length; k++) {
      (function(idx) {
        dots[idx].addEventListener('click', function(e) {
          e.preventDefault();
          showSlide(idx);
          startAutoPlay();
        });
      })(k);
    }

    section.addEventListener('mouseenter', stopAutoPlay);
    section.addEventListener('mouseleave', startAutoPlay);

    startAutoPlay();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeroSlider);
  } else {
    initHeroSlider();
  }
})();`;

  heroTokens: Array<{ label: string; token: string; htmlSnippet?: string; description?: string }> = [
    {
      label: 'Slider',
      token: `{{#each PageSectionLists}}\n<div class="swiper-slide">\n  <div class="slide-item">\n    <h1>{{ Title }}</h1>\n    <p>{{ Description }}</p>\n    <img src="{{ ImageUrl }}" alt="{{ Title }}" />\n  </div>\n</div>\n{{/each}}`,
      htmlSnippet: `<section class="slider-section position-relative {{ CustomClass }}">
  <div class="swiper hero-slider">
    <div class="swiper-wrapper">
      {{#each PageSectionLists}}
      <div class="swiper-slide">
        <div class="slide-content">
          {{#if MiniTitle}}<span class="sub-title">{{ MiniTitle }}</span>{{/if}}
          <h1>{{ Title }}</h1>
          <p>{{ Description }}</p>
          {{#if ButtonText}}
          <a href="{{ ButtonLink }}" class="btn btn-primary">{{ ButtonText }}</a>
          {{/if}}
        </div>
        {{#if ImageUrl}}
        <img src="{{ ImageUrl }}" alt="{{ Title }}" class="slide-img" />
        {{/if}}
      </div>
      {{/each}}
    </div>
    <!-- Navigation Controls -->
    <div class="swiper-button-prev"></div>
    <div class="swiper-button-next"></div>
  </div>
</section>`,
      description: 'Multi-slide responsive Swiper carousel for rotating promotions or hero images.'
    },
    {
      label: 'Hero',
      token: `{{ Title }}`,
      htmlSnippet: `<section class="hero-section {{ CustomClass }}">
  <div class="container">
    <div class="row align-items-center">
      <div class="col-lg-6">
        {{#if MiniTitle}}<span class="sub-title">{{ MiniTitle }}</span>{{/if}}
        <h1 class="display-4 fw-bold">{{ Title }}</h1>
        <p class="lead">{{ Description }}</p>
        <div class="d-flex gap-3">
          {{#if ButtonText}}
          <a href="{{ ButtonLink }}" class="btn btn-primary">{{ ButtonText }}</a>
          {{/if}}
          {{#if SecondaryButtonText}}
          <a href="{{ SecondaryButtonLink }}" class="btn btn-outline">{{ SecondaryButtonText }}</a>
          {{/if}}
        </div>
      </div>
      <div class="col-lg-6">
        {{#if ImageUrl}}
        <img src="{{ ImageUrl }}" alt="{{ Title }}" class="img-fluid" />
        {{/if}}
      </div>
    </div>
  </div>
</section>`,
      description: 'Single showcase hero banner with split columns (headline on left, visual on right).'
    },
    {
      label: 'Title',
      token: '{{ Title }}',
      htmlSnippet: '<h1>{{ Title }}</h1>',
      description: 'Primary hero headline text.'
    },
    {
      label: 'MiniTitle',
      token: '{{ MiniTitle }}',
      htmlSnippet: '{{#if MiniTitle}}<span class="sub-title">{{ MiniTitle }}</span>{{/if}}',
      description: 'Small category label, eyebrow, or badge above the main title.'
    },
    {
      label: 'Description',
      token: '{{ Description }}',
      htmlSnippet: '<p>{{ Description }}</p>',
      description: 'Hero introductory narrative or paragraph text.'
    },
    {
      label: 'ImageUrl',
      token: '{{ ImageUrl }}',
      htmlSnippet: '{{#if ImageUrl}}<img src="{{ ImageUrl }}" alt="{{ Title }}" class="img-fluid" />{{/if}}',
      description: 'Hero featured showcase image or slide illustration URL.'
    },
    {
      label: 'Button',
      token: '{{ ButtonText }}',
      htmlSnippet: '{{#if ButtonText}}<a href="{{ ButtonLink }}" class="btn btn-primary">{{ ButtonText }}</a>{{/if}}',
      description: 'Primary call-to-action button with dynamic label and target URL.'
    },
    {
      label: 'Secondary Button',
      token: '{{ SecondaryButtonText }}',
      htmlSnippet: '{{#if SecondaryButtonText}}<a href="{{ SecondaryButtonLink }}" class="btn btn-outline">{{ SecondaryButtonText }}</a>{{/if}}',
      description: 'Secondary outline button with dynamic label and link.'
    }
  ];

  sampleContent: any = {
    title: 'Scale Your Digital Infrastructure With Unrivaled Speed',
    miniTitle: 'ENTERPRISE CLOUD PLATFORM',
    description: 'Deploy mission-critical workloads, orchestrate multi-cloud pipelines, and protect customer assets with sub-millisecond resilience.',
    buttonText: 'Get Started Free',
    buttonLink: '#signup',
    secondaryButtonText: 'Explore Platform',
    secondaryButtonLink: '#features',
    imageUrl: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=1600&auto=format&fit=crop&q=80',
    items: [
      {
        sortOrder: 1,
        miniTitle: 'ENTERPRISE CLOUD PLATFORM',
        title: 'Scale Your Digital Infrastructure With Unrivaled Speed',
        description: 'Deploy mission-critical workloads, orchestrate multi-cloud pipelines, and protect customer assets with sub-millisecond resilience.',
        imageUrl: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=1600&auto=format&fit=crop&q=80',
        buttonText: 'Get Started Free',
        buttonLink: '#signup',
        secondaryButtonText: 'Explore Platform',
        secondaryButtonLink: '#features'
      },
      {
        sortOrder: 2,
        miniTitle: 'NEXT-GEN AI AUTOMATION',
        title: 'Accelerate Intelligent Workflows Across Your Entire Ecosystem',
        description: 'Automate complex operations, empower your teams with real-time analytics, and deliver high-impact results with modern intelligence.',
        imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&auto=format&fit=crop&q=80',
        buttonText: 'Schedule a Demo',
        buttonLink: '#demo',
        secondaryButtonText: 'View Case Studies',
        secondaryButtonLink: '#case-studies'
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
    this.ensureSlideItems();
    if (this.isEditMode && this.existingTemplateId) {
      this.loadExistingTemplate(this.existingTemplateId);
    }
  }

  /**
   * Guarantees that sampleContent.items contains both Slide 1 and Slide 2 objects.
   */
  ensureSlideItems(): void {
    if (!this.sampleContent) {
      this.sampleContent = {};
    }
    const defaultSlide1 = {
      sortOrder: 1,
      miniTitle: this.sampleContent.miniTitle || 'ENTERPRISE CLOUD PLATFORM',
      title: this.sampleContent.title || 'Scale Your Digital Infrastructure With Unrivaled Speed',
      description: this.sampleContent.description || 'Deploy mission-critical workloads, orchestrate multi-cloud pipelines, and protect customer assets with sub-millisecond resilience.',
      imageUrl: this.sampleContent.imageUrl || 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=1600&auto=format&fit=crop&q=80',
      buttonText: this.sampleContent.buttonText || 'Get Started Free',
      buttonLink: this.sampleContent.buttonLink || '#signup',
      secondaryButtonText: this.sampleContent.secondaryButtonText || 'Explore Platform',
      secondaryButtonLink: this.sampleContent.secondaryButtonLink || '#features'
    };
    const defaultSlide2 = {
      sortOrder: 2,
      miniTitle: 'NEXT-GEN AI AUTOMATION',
      title: 'Accelerate Intelligent Workflows Across Your Entire Ecosystem',
      description: 'Automate complex operations, empower your teams with real-time analytics, and deliver high-impact results with modern intelligence.',
      imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&auto=format&fit=crop&q=80',
      buttonText: 'Schedule a Demo',
      buttonLink: '#demo',
      secondaryButtonText: 'View Case Studies',
      secondaryButtonLink: '#case-studies'
    };

    if (!Array.isArray(this.sampleContent.items) || this.sampleContent.items.length === 0) {
      this.sampleContent.items = [defaultSlide1, defaultSlide2];
    } else if (this.sampleContent.items.length === 1) {
      this.sampleContent.items.push(defaultSlide2);
    }
  }

  /**
   * Synchronizes Slide 1 field updates with top-level scalar tokens for backward compatibility.
   */
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

  regenerateVariantCode(): void {
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
    this.variantCode = `HERO_${randomSuffix}`;
  }

  resetBoilerplate(): void {
    this.resetSampleContent();
    this.toast.info('Boilerplate reset to default 2-image hero slider.');
  }

  resetSampleContent(): void {
    this.sampleContent = {
      title: 'Scale Your Digital Infrastructure With Unrivaled Speed',
      miniTitle: 'ENTERPRISE CLOUD PLATFORM',
      description: 'Deploy mission-critical workloads, orchestrate multi-cloud pipelines, and protect customer assets with sub-millisecond resilience.',
      buttonText: 'Get Started Free',
      buttonLink: '#signup',
      secondaryButtonText: 'Explore Platform',
      secondaryButtonLink: '#features',
      imageUrl: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=1600&auto=format&fit=crop&q=80',
      items: [
        {
          sortOrder: 1,
          miniTitle: 'ENTERPRISE CLOUD PLATFORM',
          title: 'Scale Your Digital Infrastructure With Unrivaled Speed',
          description: 'Deploy mission-critical workloads, orchestrate multi-cloud pipelines, and protect customer assets with sub-millisecond resilience.',
          imageUrl: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=1600&auto=format&fit=crop&q=80',
          buttonText: 'Get Started Free',
          buttonLink: '#signup',
          secondaryButtonText: 'Explore Platform',
          secondaryButtonLink: '#features'
        },
        {
          sortOrder: 2,
          miniTitle: 'NEXT-GEN AI AUTOMATION',
          title: 'Accelerate Intelligent Workflows Across Your Entire Ecosystem',
          description: 'Automate complex operations, empower your teams with real-time analytics, and deliver high-impact results with modern intelligence.',
          imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&auto=format&fit=crop&q=80',
          buttonText: 'Schedule a Demo',
          buttonLink: '#demo',
          secondaryButtonText: 'View Case Studies',
          secondaryButtonLink: '#case-studies'
        }
      ]
    };
    this.toast.info('Hero 2-slider sample values reset to defaults.');
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
        const msg = err?.error?.message || err?.message || 'Failed to save Hero template.';
        this.toast.error(`Save error: ${msg}`);
      }
    });
  }
}
