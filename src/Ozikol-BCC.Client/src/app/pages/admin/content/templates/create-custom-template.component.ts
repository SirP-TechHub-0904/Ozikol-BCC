import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ToastService } from '../../../../core/services/toast.service';
import { ApiService } from '../../../../core/services/api.service';

/**
 * Interface representing a blueprint or custom template installed in the workspace library.
 */
export interface InstalledTemplateItem {
  id: string;
  dbId?: string;
  name: string;
  category: string;
  variantCode: string;
  badge?: string;
  tag: string;
  description: string;
  thumbnailGradient: string;
  previewIcon: string;
  previewSubtitle: string;
  previewTitle: string;
  previewBody: string;
  htmlTemplate: string;
  cssStyles: string;
  jsScript?: string;
  version: string;
  installedUtc: string;
  isCustomized?: boolean;
  defaultContentJson?: string;
}

/**
 * Interface representing category blueprint presets with tailored markup, scoped styles, and mock data.
 */
interface CategoryPreset {
  id: string;
  name: string;
  icon: string;
  tagline: string;
  defaultName: string;
  html: string;
  css: string;
  sampleContent: {
    title: string;
    miniTitle: string;
    description: string;
    imageUrl: string;
    buttonText: string;
    buttonLink: string;
    secondaryButtonText?: string;
    secondaryButtonLink?: string;
    email?: string;
    phone?: string;
    address?: string;
    brandName?: string;
    copyright?: string;
    items: Array<{
      title: string;
      subTitle?: string;
      description: string;
      icon?: string;
      imageUrl?: string;
      buttonText?: string;
      buttonLink?: string;
    }>;
  };
  specificTokens?: Array<{ label: string; token: string }>;
}

/**
 * Standalone page component for crafting custom CMS section templates.
 * Provides real-time preview, category-driven boilerplates, cursor-accurate token insertion,
 * dynamic variant code generation based on the active tenant key, and an editable sample content inspector.
 */
@Component({
  selector: 'app-create-custom-template',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="custom-studio-container">
      <!-- Top Navigation & Breadcrumb Card -->
      <div class="studio-header-card">
        <div class="header-main-row">
          <div class="header-left">
            <div class="breadcrumb-trail">
              <a routerLink="/admin/dashboard">Console</a>
              <span class="sep">/</span>
              <a routerLink="/content/console">CMS Studio</a>
              <span class="sep">/</span>
              <a routerLink="/content/console/templates">My Templates</a>
              <span class="sep">/</span>
              <span class="current">Create Custom Section</span>
            </div>

            <div class="title-with-icon">
              <div class="header-icon-box">
                <span class="material-symbols-outlined">add_circle</span>
              </div>
              <div class="title-text-wrap">
                <h1 class="page-title">Create Custom Section Template</h1>
                <p class="page-subtitle">
                  Design bespoke section markup with dynamic CMS placeholders, scoped styling, and live content simulation.
                </p>
              </div>
            </div>
          </div>

          <div class="header-actions">
            <a routerLink="/content/console/templates" class="btn btn-outline-cancel">
              <span class="material-symbols-outlined btn-icon">arrow_back</span>
              <span>Back to Library</span>
            </a>
            <button
              type="button"
              class="btn btn-save-vault"
              (click)="saveCustomTemplate()"
              [disabled]="savingTemplate"
            >
              <span class="material-symbols-outlined btn-icon">{{ savingTemplate ? 'hourglass_empty' : 'save' }}</span>
              <span>{{ savingTemplate ? 'Saving to Vault...' : 'Save to Template Vault' }}</span>
            </button>
          </div>
        </div>

        <!-- Configuration Bar: Category, Name, Variant Code, Tenant Key -->
        <div class="meta-config-grid">
          <!-- Template Name -->
          <div class="config-col">
            <label class="config-label">Template Name <span class="required">*</span></label>
            <input
              type="text"
              [(ngModel)]="templateName"
              (ngModelChange)="onTemplateNameChange()"
              class="form-control config-input"
              placeholder="e.g. Modern Split Hero"
            />
          </div>

          <!-- Section Role / Category -->
          <div class="config-col">
            <label class="config-label">Section Role / Category <span class="required">*</span></label>
            <select
              [(ngModel)]="selectedCategory"
              (ngModelChange)="onCategoryChange(true)"
              class="form-select config-select"
            >
              <option *ngFor="let cat of categoryPresets" [value]="cat.id">
                {{ cat.name }}
              </option>
            </select>
          </div>

          <!-- Auto Variant Code / Key -->
          <div class="config-col">
            <div class="label-with-hint">
              <label class="config-label">Variant Code / Key <span class="required">*</span></label>
              <span class="tenant-key-badge" [title]="'Tenant Key: ' + resolvedTenantKey">
                Tenant: <strong>{{ resolvedTenantKey }}</strong> ({{ domainInitials }})
              </span>
            </div>
            <div class="input-with-action">
              <input
                type="text"
                [(ngModel)]="variantCode"
                class="form-control config-input font-mono"
                placeholder="HERO_AG_8F3K2"
              />
              <button
                type="button"
                class="btn-regen-key"
                (click)="regenerateVariantCode()"
                title="Regenerate random 5-character key"
              >
                <span class="material-symbols-outlined">refresh</span>
              </button>
            </div>
          </div>

          <!-- Description -->
          <div class="config-col">
            <label class="config-label">Description (Optional)</label>
            <input
              type="text"
              [(ngModel)]="description"
              class="form-control config-input"
              placeholder="e.g. High-converting hero banner with dual CTAs"
            />
          </div>
        </div>
      </div>

      <!-- Main Studio Dual-Pane Layout -->
      <div class="studio-workspace-grid">
        <!-- LEFT COLUMN: Code Editors & Dynamic Tokens -->
        <div class="code-editor-column">
          <!-- Token Insertion Toolbar -->
          <div class="token-toolbar-card">
            <div class="token-bar-header">
              <div class="token-bar-title">
                <span class="material-symbols-outlined token-icon">token</span>
                <span>Click token to insert at cursor:</span>
              </div>
              <span class="category-indicator-pill">
                {{ currentPreset.name }} Placeholders
              </span>
            </div>

            <div class="tokens-scroll-area">
              <!-- Standard Core Field Tokens -->
              <div class="token-group">
                <span class="group-tag">Core Fields</span>
                <button
                  type="button"
                  class="token-chip chip-core"
                  (click)="insertTokenAtCursor('{{ Title }}')"
                  [innerText]="'+ {{ Title }}'"
                  title="Inserts main headline placeholder"
                ></button>
                <button
                  type="button"
                  class="token-chip chip-core"
                  (click)="insertTokenAtCursor('{{ MiniTitle }}')"
                  [innerText]="'+ {{ MiniTitle }}'"
                  title="Inserts eyebrow badge / sub-headline placeholder"
                ></button>
                <button
                  type="button"
                  class="token-chip chip-core"
                  (click)="insertTokenAtCursor('{{ Description }}')"
                  [innerText]="'+ {{ Description }}'"
                  title="Inserts narrative description placeholder"
                ></button>
                <button
                  type="button"
                  class="token-chip chip-core"
                  (click)="insertTokenAtCursor('{{ ImageUrl }}')"
                  [innerText]="'+ {{ ImageUrl }}'"
                  title="Inserts hero or section graphic URL placeholder"
                ></button>
                <button
                  type="button"
                  class="token-chip chip-core"
                  (click)="insertTokenAtCursor('{{ ButtonText }}')"
                  [innerText]="'+ {{ ButtonText }}'"
                  title="Inserts primary call-to-action button text"
                ></button>
                <button
                  type="button"
                  class="token-chip chip-core"
                  (click)="insertTokenAtCursor('{{ ButtonLink }}')"
                  [innerText]="'+ {{ ButtonLink }}'"
                  title="Inserts primary call-to-action URL or anchor"
                ></button>
              </div>

              <!-- Category-Specific Tokens -->
              <div class="token-group" *ngIf="currentPreset.specificTokens?.length">
                <span class="group-tag">{{ currentPreset.name }}</span>
                <button
                  type="button"
                  *ngFor="let spec of currentPreset.specificTokens"
                  class="token-chip chip-specific"
                  (click)="insertTokenAtCursor(spec.token)"
                  [title]="'Inserts ' + spec.label + ' placeholder'"
                >
                  + {{ spec.token }}
                </button>
              </div>

              <!-- Sub-Items Loop (PageSectionLists) -->
              <div class="token-group">
                <span class="group-tag">Sub-Items Repeater</span>
                <button
                  type="button"
                  class="token-chip chip-repeater"
                  (click)="insertRepeaterLoopAtCursor()"
                  title="Iterates through all repeating cards/items in PageSectionLists"
                >
                  <span class="material-symbols-outlined chip-icon">repeat</span>
                  <span>+ Card Loop (PageSectionLists)</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Code View Tabs: HTML vs CSS vs JS -->
          <div class="editor-tabs-bar">
            <button
              type="button"
              class="editor-tab-btn"
              [class.active]="activeEditorTab === 'html'"
              (click)="activeEditorTab = 'html'"
            >
              <span class="material-symbols-outlined">html</span>
              <span>Semantic HTML Markup</span>
            </button>
            <button
              type="button"
              class="editor-tab-btn"
              [class.active]="activeEditorTab === 'css'"
              (click)="activeEditorTab = 'css'"
            >
              <span class="material-symbols-outlined">css</span>
              <span>Scoped CSS Styles</span>
            </button>
            <button
              type="button"
              class="editor-tab-btn"
              [class.active]="activeEditorTab === 'js'"
              (click)="activeEditorTab = 'js'"
            >
              <span class="material-symbols-outlined">javascript</span>
              <span>Client JS (Optional)</span>
            </button>

            <div class="editor-meta-actions">
              <button
                type="button"
                class="btn-reset-boilerplate"
                (click)="confirmResetToCategoryBoilerplate()"
                title="Reload default boilerplate for the selected category"
              >
                <span class="material-symbols-outlined">restore</span>
                <span>Reset to Boilerplate</span>
              </button>
            </div>
          </div>

          <!-- Editor Panes -->
          <div class="editor-pane-body">
            <!-- HTML Editor -->
            <div class="code-area-wrap" *ngIf="activeEditorTab === 'html'">
              <textarea
                #htmlEditor
                [(ngModel)]="htmlTemplate"
                (ngModelChange)="onCodeChange()"
                class="code-textarea font-mono"
                rows="22"
                placeholder="Write semantic HTML here..."
                spellcheck="false"
              ></textarea>
            </div>

            <!-- CSS Editor -->
            <div class="code-area-wrap" *ngIf="activeEditorTab === 'css'">
              <div class="css-info-pill">
                <span class="material-symbols-outlined pill-icon">lightbulb</span>
                <span>Styles defined here will be scoped to this section or injected automatically.</span>
              </div>
              <textarea
                #cssEditor
                [(ngModel)]="cssStyles"
                (ngModelChange)="onCodeChange()"
                class="code-textarea font-mono"
                rows="21"
                placeholder="/* Scoped CSS for your section */\n.oz-custom-section {\n  padding: 60px 24px;\n}"
                spellcheck="false"
              ></textarea>
            </div>

            <!-- JS Editor -->
            <div class="code-area-wrap" *ngIf="activeEditorTab === 'js'">
              <textarea
                #jsEditor
                [(ngModel)]="jsScript"
                (ngModelChange)="onCodeChange()"
                class="code-textarea font-mono"
                rows="22"
                placeholder="// Optional client-side script for interactive widgets\n// e.g. document.querySelector(...)"
                spellcheck="false"
              ></textarea>
            </div>
          </div>
        </div>

        <!-- RIGHT COLUMN: Live Interactive Preview & Sample Content Inspector -->
        <div class="preview-column">
          <!-- Preview Mode Toggle Tabs -->
          <div class="preview-mode-bar">
            <div class="mode-tabs">
              <button
                type="button"
                class="mode-tab-btn"
                [class.active]="previewTab === 'preview'"
                (click)="previewTab = 'preview'"
              >
                <span class="material-symbols-outlined">visibility</span>
                <span>Live Simulated Preview</span>
              </button>
              <button
                type="button"
                class="mode-tab-btn"
                [class.active]="previewTab === 'content'"
                (click)="previewTab = 'content'"
              >
                <span class="material-symbols-outlined">edit_note</span>
                <span>Sample Content Inspector</span>
                <span class="count-bubble">{{ sampleContent.items?.length || 0 }} items</span>
              </button>
            </div>

            <!-- Viewport Controls (Desktop vs Mobile) -->
            <div class="viewport-toggle-group" *ngIf="previewTab === 'preview'">
              <button
                type="button"
                class="btn-viewport"
                [class.active]="viewport === 'desktop'"
                (click)="viewport = 'desktop'"
                title="Desktop View (100%)"
              >
                <span class="material-symbols-outlined">desktop_windows</span>
                <span>Desktop</span>
              </button>
              <button
                type="button"
                class="btn-viewport"
                [class.active]="viewport === 'mobile'"
                (click)="viewport = 'mobile'"
                title="Mobile View (390px)"
              >
                <span class="material-symbols-outlined">smartphone</span>
                <span>Mobile</span>
              </button>
            </div>
          </div>

          <!-- TAB 1: Live Rendered Simulation Canvas -->
          <div class="simulation-canvas-card" *ngIf="previewTab === 'preview'">
            <div class="canvas-viewport-frame" [class.mobile-frame]="viewport === 'mobile'">
              <div class="canvas-header-decor" *ngIf="viewport === 'mobile'">
                <div class="mobile-notch"></div>
              </div>
              <div class="rendered-html-box" [innerHTML]="safeHydratedHtml"></div>
            </div>
          </div>

          <!-- TAB 2: Sample Content Inspector (Adjust Real Content For Placeholders) -->
          <div class="sample-content-card" *ngIf="previewTab === 'content'">
            <div class="content-inspector-header">
              <div>
                <h3 class="inspector-title">Mock Content Configuration</h3>
                <p class="inspector-sub">
                  Adjust placeholder values to test how your template behaves with realistic customer data.
                </p>
              </div>
              <button
                type="button"
                class="btn-reset-sample"
                (click)="resetSampleContentToCategoryDefaults()"
                title="Reset sample text to category defaults"
              >
                <span class="material-symbols-outlined">restart_alt</span>
                <span>Reset Data</span>
              </button>
            </div>

            <div class="inspector-fields-scroll">
              <!-- Scalar Fields -->
              <div class="form-grid-2">
                <div class="form-group">
                  <label class="field-label" [innerText]="'{{ Title }}'"></label>
                  <input
                    type="text"
                    [(ngModel)]="sampleContent.title"
                    (ngModelChange)="onSampleContentChange()"
                    class="form-control inspector-input"
                  />
                </div>
                <div class="form-group">
                  <label class="field-label" [innerText]="'{{ MiniTitle }}'"></label>
                  <input
                    type="text"
                    [(ngModel)]="sampleContent.miniTitle"
                    (ngModelChange)="onSampleContentChange()"
                    class="form-control inspector-input"
                  />
                </div>
              </div>

              <div class="form-group">
                <label class="field-label" [innerText]="'{{ Description }}'"></label>
                <textarea
                  [(ngModel)]="sampleContent.description"
                  (ngModelChange)="onSampleContentChange()"
                  class="form-control inspector-input"
                  rows="3"
                ></textarea>
              </div>

              <div class="form-group">
                <label class="field-label" [innerText]="'{{ ImageUrl }}'"></label>
                <input
                  type="text"
                  [(ngModel)]="sampleContent.imageUrl"
                  (ngModelChange)="onSampleContentChange()"
                  class="form-control inspector-input"
                  placeholder="https://..."
                />
              </div>

              <div class="form-grid-2">
                <div class="form-group">
                  <label class="field-label" [innerText]="'{{ ButtonText }}'"></label>
                  <input
                    type="text"
                    [(ngModel)]="sampleContent.buttonText"
                    (ngModelChange)="onSampleContentChange()"
                    class="form-control inspector-input"
                  />
                </div>
                <div class="form-group">
                  <label class="field-label" [innerText]="'{{ ButtonLink }}'"></label>
                  <input
                    type="text"
                    [(ngModel)]="sampleContent.buttonLink"
                    (ngModelChange)="onSampleContentChange()"
                    class="form-control inspector-input"
                  />
                </div>
              </div>

              <!-- Extra category specific inputs -->
              <div class="form-grid-2" *ngIf="selectedCategory === 'hero'">
                <div class="form-group">
                  <label class="field-label" [innerText]="'{{ SecondaryButtonText }}'"></label>
                  <input
                    type="text"
                    [(ngModel)]="sampleContent.secondaryButtonText"
                    (ngModelChange)="onSampleContentChange()"
                    class="form-control inspector-input"
                  />
                </div>
                <div class="form-group">
                  <label class="field-label" [innerText]="'{{ SecondaryButtonLink }}'"></label>
                  <input
                    type="text"
                    [(ngModel)]="sampleContent.secondaryButtonLink"
                    (ngModelChange)="onSampleContentChange()"
                    class="form-control inspector-input"
                  />
                </div>
              </div>

              <div class="form-grid-3" *ngIf="selectedCategory === 'contact'">
                <div class="form-group">
                  <label class="field-label" [innerText]="'{{ Email }}'"></label>
                  <input
                    type="text"
                    [(ngModel)]="sampleContent.email"
                    (ngModelChange)="onSampleContentChange()"
                    class="form-control inspector-input"
                  />
                </div>
                <div class="form-group">
                  <label class="field-label" [innerText]="'{{ Phone }}'"></label>
                  <input
                    type="text"
                    [(ngModel)]="sampleContent.phone"
                    (ngModelChange)="onSampleContentChange()"
                    class="form-control inspector-input"
                  />
                </div>
                <div class="form-group">
                  <label class="field-label" [innerText]="'{{ Address }}'"></label>
                  <input
                    type="text"
                    [(ngModel)]="sampleContent.address"
                    (ngModelChange)="onSampleContentChange()"
                    class="form-control inspector-input"
                  />
                </div>
              </div>

              <!-- Repeating Cards / PageSectionLists Items -->
              <div class="repeater-section-wrap">
                <div class="repeater-section-header">
                  <div>
                    <h4 class="repeater-title">
                      Repeater Cards / Sub-Items (PageSectionLists)
                    </h4>
                    <span class="repeater-sub">
                      Mock items generated inside the card loop (PageSectionLists)
                    </span>
                  </div>
                  <button type="button" class="btn-add-item" (click)="addSampleSubItem()">
                    <span class="material-symbols-outlined">add</span>
                    <span>Add Item</span>
                  </button>
                </div>

                <div class="items-list">
                  <div
                    class="item-card-editor"
                    *ngFor="let item of sampleContent.items; let idx = index"
                  >
                    <div class="item-card-top">
                      <span class="item-index-badge">#{{ idx + 1 }}</span>
                      <input
                        type="text"
                        [(ngModel)]="item.title"
                        (ngModelChange)="onSampleContentChange()"
                        class="form-control item-input-title"
                        placeholder="Item Title"
                      />
                      <input
                        type="text"
                        [(ngModel)]="item.subTitle"
                        (ngModelChange)="onSampleContentChange()"
                        class="form-control item-input-sub"
                        placeholder="SubTitle / Price"
                      />
                      <button
                        type="button"
                        class="btn-remove-item"
                        (click)="removeSampleSubItem(idx)"
                        title="Remove item"
                      >
                        ✕
                      </button>
                    </div>
                    <div class="item-card-bottom">
                      <input
                        type="text"
                        [(ngModel)]="item.description"
                        (ngModelChange)="onSampleContentChange()"
                        class="form-control item-input-desc"
                        placeholder="Description narrative..."
                      />
                      <input
                        type="text"
                        [(ngModel)]="item.icon"
                        (ngModelChange)="onSampleContentChange()"
                        class="form-control item-input-icon"
                        placeholder="Icon (e.g. star, bolt, check)"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .custom-studio-container {
      padding: 24px;
      background: #f8fafc;
      min-height: calc(100vh - 70px);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }

    /* Top Studio Header Card */
    .studio-header-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 20px 24px;
      margin-bottom: 20px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }
    .header-main-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 20px;
      margin-bottom: 20px;
    }
    .breadcrumb-trail {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11.5px;
      font-weight: 600;
      color: #64748b;
      margin-bottom: 8px;
    }
    .breadcrumb-trail a { color: #64748b; text-decoration: none; }
    .breadcrumb-trail a:hover { color: #0050e5; }
    .breadcrumb-trail .sep { color: #cbd5e1; }
    .breadcrumb-trail .current { color: #0f172a; font-weight: 700; }

    .title-with-icon {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .header-icon-box {
      width: 44px;
      height: 44px;
      background: #eef2ff;
      color: #0050e5;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .header-icon-box .material-symbols-outlined { font-size: 26px; }

    .page-title {
      font-size: 21px;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
      letter-spacing: -0.02em;
    }
    .page-subtitle {
      font-size: 13px;
      color: #64748b;
      margin: 4px 0 0 0;
      line-height: 1.4;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .btn {
      height: 42px;
      padding: 0 18px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.2s ease;
    }
    .btn-outline-cancel {
      background: #ffffff;
      color: #475569;
      border: 1.5px solid #cbd5e1;
    }
    .btn-outline-cancel:hover {
      background: #f1f5f9;
      color: #0f172a;
    }
    .btn-save-vault {
      background: #0050e5;
      color: #ffffff;
      border: none;
      box-shadow: 0 4px 12px rgba(0, 80, 229, 0.25);
    }
    .btn-save-vault:hover:not(:disabled) {
      background: #0041ba;
      box-shadow: 0 6px 18px rgba(0, 80, 229, 0.35);
      transform: translateY(-1px);
    }
    .btn-save-vault:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    /* Configuration Grid */
    .meta-config-grid {
      display: grid;
      grid-template-columns: 1.5fr 1.2fr 1.3fr 1.8fr;
      gap: 16px;
      padding-top: 16px;
      border-top: 1px solid #f1f5f9;
    }
    .config-col { display: flex; flex-direction: column; }
    .config-label {
      font-size: 12px;
      font-weight: 700;
      color: #334155;
      margin-bottom: 6px;
    }
    .config-label .required { color: #ef4444; }
    .label-with-hint {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }
    .tenant-key-badge {
      font-size: 10.5px;
      color: #0050e5;
      background: #eef2ff;
      padding: 1px 7px;
      border-radius: 12px;
      font-weight: 600;
      white-space: nowrap;
    }
    .config-input, .config-select {
      height: 38px;
      border-radius: 8px;
      border: 1.5px solid #e2e8f0;
      padding: 0 12px;
      font-size: 13px;
      color: #0f172a;
      background: #ffffff;
      outline: none;
      transition: border-color 0.15s ease;
      width: 100%;
      box-sizing: border-box;
    }
    .config-input:focus, .config-select:focus {
      border-color: #0050e5;
      box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.1);
    }
    .input-with-action {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .btn-regen-key {
      height: 38px;
      width: 38px;
      border-radius: 8px;
      border: 1.5px solid #e2e8f0;
      background: #f8fafc;
      color: #475569;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      flex-shrink: 0;
      transition: all 0.15s ease;
    }
    .btn-regen-key:hover {
      background: #eef2ff;
      color: #0050e5;
      border-color: #c7d2fe;
    }
    .font-mono { font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; }

    /* Studio Dual-Pane Layout */
    .studio-workspace-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      align-items: start;
    }

    /* Left Column: Code Editors */
    .code-editor-column {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    /* Token Toolbar */
    .token-toolbar-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 12px 16px;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
    }
    .token-bar-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .token-bar-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 700;
      color: #334155;
    }
    .token-icon { font-size: 17px; color: #0050e5; }
    .category-indicator-pill {
      font-size: 11px;
      font-weight: 700;
      background: #f1f5f9;
      color: #475569;
      padding: 2px 8px;
      border-radius: 10px;
    }
    .tokens-scroll-area {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }
    .token-group {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }
    .group-tag {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      color: #94a3b8;
      letter-spacing: 0.5px;
      margin-right: 2px;
    }
    .token-chip {
      height: 28px;
      padding: 0 10px;
      border-radius: 6px;
      font-size: 11.5px;
      font-weight: 700;
      font-family: monospace;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      border: 1px solid transparent;
      transition: all 0.15s ease;
      white-space: nowrap;
    }
    .chip-core {
      background: #eff6ff;
      color: #1d4ed8;
      border-color: #bfdbfe;
    }
    .chip-core:hover {
      background: #dbeafe;
      border-color: #93c5fd;
      transform: translateY(-1px);
    }
    .chip-specific {
      background: #f5f3ff;
      color: #6d28d9;
      border-color: #ddd6fe;
    }
    .chip-specific:hover {
      background: #ede9fe;
      border-color: #c4b5fd;
      transform: translateY(-1px);
    }
    .chip-repeater {
      background: #fdf2f8;
      color: #db2777;
      border-color: #fbcfe8;
    }
    .chip-repeater:hover {
      background: #fce7f3;
      border-color: #f472b6;
      transform: translateY(-1px);
    }
    .chip-icon { font-size: 14px; }

    /* Editor Tabs */
    .editor-tabs-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #ffffff;
      padding: 6px 8px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
    }
    .editor-tab-btn {
      padding: 8px 14px;
      border-radius: 8px;
      border: none;
      background: transparent;
      color: #64748b;
      font-size: 12.5px;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .editor-tab-btn:hover {
      background: #f1f5f9;
      color: #0f172a;
    }
    .editor-tab-btn.active {
      background: #0050e5;
      color: #ffffff;
    }
    .editor-meta-actions {
      margin-left: auto;
    }
    .btn-reset-boilerplate {
      height: 32px;
      padding: 0 10px;
      border-radius: 6px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      color: #475569;
      font-size: 11.5px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      transition: all 0.15s ease;
    }
    .btn-reset-boilerplate:hover {
      background: #e2e8f0;
      color: #0f172a;
    }

    /* Editor Panes */
    .editor-pane-body {
      background: #0f172a;
      border-radius: 12px;
      border: 1px solid #1e293b;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    }
    .code-area-wrap {
      display: flex;
      flex-direction: column;
    }
    .css-info-pill {
      background: rgba(245, 158, 11, 0.1);
      border-bottom: 1px solid rgba(245, 158, 11, 0.2);
      color: #fbbf24;
      padding: 6px 14px;
      font-size: 11.5px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .pill-icon { font-size: 16px; }
    .code-textarea {
      width: 100%;
      background: #0f172a;
      color: #f8fafc;
      border: none;
      padding: 16px;
      font-size: 13px;
      line-height: 1.55;
      resize: vertical;
      outline: none;
      box-sizing: border-box;
      min-height: 520px;
    }
    .code-textarea:focus {
      background: #090d16;
    }

    /* RIGHT COLUMN: Live Simulation & Content Inspector */
    .preview-column {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .preview-mode-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #ffffff;
      padding: 6px 8px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
    }
    .mode-tabs {
      display: flex;
      gap: 6px;
    }
    .mode-tab-btn {
      padding: 8px 14px;
      border-radius: 8px;
      border: none;
      background: transparent;
      color: #64748b;
      font-size: 12.5px;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .mode-tab-btn:hover { background: #f1f5f9; color: #0f172a; }
    .mode-tab-btn.active {
      background: #0050e5;
      color: #ffffff;
    }
    .count-bubble {
      background: rgba(255, 255, 255, 0.25);
      padding: 1px 7px;
      border-radius: 10px;
      font-size: 10.5px;
      margin-left: 4px;
    }
    .mode-tab-btn:not(.active) .count-bubble {
      background: #e2e8f0;
      color: #475569;
    }

    .viewport-toggle-group {
      display: flex;
      gap: 4px;
      background: #f1f5f9;
      padding: 3px;
      border-radius: 8px;
    }
    .btn-viewport {
      height: 30px;
      padding: 0 10px;
      border-radius: 6px;
      border: none;
      background: transparent;
      color: #64748b;
      font-size: 11.5px;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-viewport.active {
      background: #ffffff;
      color: #0050e5;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    /* Simulation Canvas Card */
    .simulation-canvas-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
      min-height: 580px;
      display: flex;
      justify-content: center;
      background-image: radial-gradient(#cbd5e1 1px, transparent 1px);
      background-size: 16px 16px;
      padding: 16px;
    }
    .canvas-viewport-frame {
      width: 100%;
      background: #ffffff;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 16px rgba(0,0,0,0.06);
      overflow-y: auto;
      max-height: 650px;
      transition: max-width 0.3s ease;
    }
    .canvas-viewport-frame.mobile-frame {
      max-width: 390px;
      border-radius: 28px;
      border: 8px solid #0f172a;
    }
    .canvas-header-decor {
      height: 24px;
      background: #0f172a;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .mobile-notch {
      width: 80px;
      height: 12px;
      background: #1e293b;
      border-radius: 10px;
    }
    .rendered-html-box {
      padding: 0;
      min-height: 300px;
    }

    /* Sample Content Card */
    .sample-content-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
      min-height: 580px;
    }
    .content-inspector-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid #f1f5f9;
    }
    .inspector-title { font-size: 15px; font-weight: 800; color: #0f172a; margin: 0; }
    .inspector-sub { font-size: 12px; color: #64748b; margin: 2px 0 0 0; }
    .btn-reset-sample {
      height: 32px;
      padding: 0 10px;
      border-radius: 6px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      color: #334155;
      font-size: 11.5px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .inspector-fields-scroll {
      display: flex;
      flex-direction: column;
      gap: 14px;
      max-height: 580px;
      overflow-y: auto;
      padding-right: 6px;
    }
    .form-grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .form-grid-3 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 10px;
    }
    .form-group { display: flex; flex-direction: column; }
    .field-label {
      font-size: 11px;
      font-weight: 700;
      color: #0050e5;
      font-family: monospace;
      margin-bottom: 4px;
    }
    .inspector-input {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 8px 10px;
      font-size: 12.5px;
      color: #0f172a;
      outline: none;
    }
    .inspector-input:focus {
      border-color: #0050e5;
    }

    /* Repeater Items Editor */
    .repeater-section-wrap {
      margin-top: 10px;
      border-top: 1.5px dashed #e2e8f0;
      padding-top: 14px;
    }
    .repeater-section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .repeater-title { font-size: 13px; font-weight: 800; color: #0f172a; margin: 0; }
    .repeater-sub { font-size: 11px; color: #64748b; }
    .btn-add-item {
      height: 30px;
      padding: 0 10px;
      border-radius: 6px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #1d4ed8;
      font-size: 11.5px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .items-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .item-card-editor {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .item-card-top {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .item-index-badge {
      font-size: 11px;
      font-weight: 800;
      color: #64748b;
      background: #e2e8f0;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .item-input-title { flex: 2; height: 32px; font-size: 12px; }
    .item-input-sub { flex: 1; height: 32px; font-size: 12px; }
    .btn-remove-item {
      width: 26px;
      height: 26px;
      border-radius: 4px;
      border: none;
      background: #fee2e2;
      color: #dc2626;
      font-size: 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .item-card-bottom {
      display: flex;
      gap: 8px;
    }
    .item-input-desc { flex: 3; height: 32px; font-size: 12px; }
    .item-input-icon { flex: 1; height: 32px; font-size: 12px; }

    @media (max-width: 1200px) {
      .meta-config-grid { grid-template-columns: 1fr 1fr; }
      .studio-workspace-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class CreateCustomTemplateComponent implements OnInit {
  @ViewChild('htmlEditor') htmlEditorRef?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('cssEditor') cssEditorRef?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('jsEditor') jsEditorRef?: ElementRef<HTMLTextAreaElement>;

  // Form Metadata
  templateName: string = '';
  selectedCategory: string = 'hero';
  variantCode: string = '';
  description: string = '';
  htmlTemplate: string = '';
  cssStyles: string = '';
  jsScript: string = '';

  // Active Tenant & Domain Resolution
  resolvedTenantKey: string = 'acme-global';
  domainInitials: string = 'AG';

  // Editor and Preview State
  activeEditorTab: 'html' | 'css' | 'js' = 'html';
  previewTab: 'preview' | 'content' = 'preview';
  viewport: 'desktop' | 'mobile' = 'desktop';
  savingTemplate: boolean = false;
  safeHydratedHtml: SafeHtml = '';

  // Sample Content Inspector State
  sampleContent: any = {
    title: '',
    miniTitle: '',
    description: '',
    imageUrl: '',
    buttonText: '',
    buttonLink: '',
    secondaryButtonText: '',
    secondaryButtonLink: '',
    email: '',
    phone: '',
    address: '',
    items: []
  };

  /**
   * Library of comprehensive, high-aesthetic category boilerplate templates.
   */
  categoryPresets: CategoryPreset[] = [
    {
      id: 'hero',
      name: 'Hero Banner',
      icon: 'view_carousel',
      tagline: 'High-impact landing hero with bold headline, dual buttons, and visual graphics',
      defaultName: 'Modern Split Hero',
      html: `<section class="oz-hero-section">
  <div class="oz-hero-container">
    <div class="oz-hero-content">
      <span class="oz-hero-badge">{{ MiniTitle }}</span>
      <h1 class="oz-hero-title">{{ Title }}</h1>
      <p class="oz-hero-desc">{{ Description }}</p>
      <div class="oz-hero-actions">
        <a href="{{ ButtonLink }}" class="oz-btn-primary">{{ ButtonText }}</a>
        <a href="{{ SecondaryButtonLink }}" class="oz-btn-secondary">{{ SecondaryButtonText }}</a>
      </div>
    </div>
    <div class="oz-hero-media">
      <img src="{{ ImageUrl }}" alt="{{ Title }}" class="oz-hero-img" />
    </div>
  </div>
</section>`,
      css: `.oz-hero-section {
  padding: 80px 24px;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  color: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.oz-hero-container {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 48px;
  align-items: center;
}
.oz-hero-badge {
  display: inline-block;
  background: rgba(0, 80, 229, 0.2);
  color: #60a5fa;
  border: 1px solid rgba(96, 165, 250, 0.3);
  font-size: 11.5px;
  font-weight: 800;
  letter-spacing: 0.8px;
  padding: 4px 12px;
  border-radius: 20px;
  margin-bottom: 16px;
}
.oz-hero-title {
  font-size: 42px;
  font-weight: 900;
  line-height: 1.15;
  letter-spacing: -0.02em;
  margin: 0 0 16px 0;
  color: #ffffff;
}
.oz-hero-desc {
  font-size: 16px;
  line-height: 1.6;
  color: #94a3b8;
  margin: 0 0 32px 0;
}
.oz-hero-actions {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
}
.oz-btn-primary {
  background: #0050e5;
  color: #ffffff;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 700;
  text-decoration: none;
  transition: 0.2s;
  box-shadow: 0 4px 14px rgba(0, 80, 229, 0.35);
}
.oz-btn-primary:hover { background: #0041ba; transform: translateY(-1px); }
.oz-btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 700;
  text-decoration: none;
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: 0.2s;
}
.oz-btn-secondary:hover { background: rgba(255, 255, 255, 0.18); }
.oz-hero-media { text-align: center; }
.oz-hero-img {
  max-width: 100%;
  height: auto;
  border-radius: 16px;
  box-shadow: 0 16px 36px rgba(0,0,0,0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
@media (max-width: 768px) {
  .oz-hero-container { grid-template-columns: 1fr; gap: 32px; }
  .oz-hero-title { font-size: 32px; }
}`,
      sampleContent: {
        title: 'Scale Your Digital Infrastructure With Unrivaled Speed',
        miniTitle: 'ENTERPRISE CLOUD PLATFORM',
        description: 'Deploy mission-critical workloads, orchestrate multi-cloud pipelines, and protect customer assets with sub-millisecond resilience.',
        imageUrl: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&auto=format&fit=crop&q=80',
        buttonText: 'Get Started Free',
        buttonLink: '#signup',
        secondaryButtonText: 'Explore Platform',
        secondaryButtonLink: '#features',
        items: []
      },
      specificTokens: [
        { label: 'Secondary Button Text', token: '{{ SecondaryButtonText }}' },
        { label: 'Secondary Button Link', token: '{{ SecondaryButtonLink }}' }
      ]
    },
    {
      id: 'pricing',
      name: 'Pricing Plans',
      icon: 'payments',
      tagline: '3-tier pricing matrix with features checklist and popular highlight',
      defaultName: 'Transparent Pricing Grid',
      html: `<section class="oz-pricing-section">
  <div class="oz-pricing-header">
    <span class="oz-sub-badge">{{ MiniTitle }}</span>
    <h2 class="oz-pricing-title">{{ Title }}</h2>
    <p class="oz-pricing-desc">{{ Description }}</p>
  </div>

  <div class="oz-pricing-grid">
    {{#each PageSectionLists}}
    <div class="oz-pricing-card">
      <div class="oz-plan-top">
        <h3 class="oz-plan-name">{{ Title }}</h3>
        <div class="oz-price-row">
          <span class="oz-price-num">{{ SubTitle }}</span>
          <span class="oz-price-cycle">/month</span>
        </div>
        <p class="oz-plan-desc">{{ Description }}</p>
      </div>
      <a href="{{ ButtonLink }}" class="oz-btn-plan">{{ ButtonText }}</a>
    </div>
    {{/each}}
  </div>
</section>`,
      css: `.oz-pricing-section {
  padding: 70px 24px;
  background: #f8fafc;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  text-align: center;
}
.oz-sub-badge {
  display: inline-block;
  background: #eef2ff;
  color: #0050e5;
  font-size: 11px;
  font-weight: 800;
  padding: 4px 12px;
  border-radius: 16px;
  margin-bottom: 12px;
}
.oz-pricing-title {
  font-size: 36px;
  font-weight: 900;
  color: #0f172a;
  margin: 0 0 12px 0;
  letter-spacing: -0.02em;
}
.oz-pricing-desc {
  font-size: 15px;
  color: #64748b;
  max-width: 600px;
  margin: 0 auto 48px auto;
  line-height: 1.5;
}
.oz-pricing-grid {
  max-width: 1100px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  text-align: left;
}
.oz-pricing-card {
  background: #ffffff;
  border: 1.5px solid #e2e8f0;
  border-radius: 14px;
  padding: 32px 28px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  transition: all 0.25s ease;
}
.oz-pricing-card:hover {
  transform: translateY(-4px);
  border-color: #0050e5;
  box-shadow: 0 12px 28px rgba(0, 80, 229, 0.12);
}
.oz-plan-name { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 8px 0; }
.oz-price-row { display: flex; align-items: baseline; gap: 4px; margin-bottom: 12px; }
.oz-price-num { font-size: 38px; font-weight: 900; color: #0050e5; }
.oz-price-cycle { font-size: 14px; color: #64748b; font-weight: 600; }
.oz-plan-desc { font-size: 13.5px; color: #475569; line-height: 1.5; margin: 0 0 24px 0; }
.oz-btn-plan {
  display: block;
  text-align: center;
  padding: 12px;
  border-radius: 8px;
  background: #0050e5;
  color: #ffffff;
  font-weight: 700;
  text-decoration: none;
  transition: 0.2s;
}
.oz-btn-plan:hover { background: #0041ba; }`,
      sampleContent: {
        title: 'Simple, Transparent Plans For Growing Teams',
        miniTitle: 'FLEXIBLE PACKAGES',
        description: 'Choose the solution tailored for your team size. Upgrade, downgrade, or cancel anytime with zero lock-in.',
        imageUrl: '',
        buttonText: 'Choose Plan',
        buttonLink: '#pricing',
        items: [
          { title: 'Starter Tier', subTitle: '$29', description: 'Essential collaboration & API access for small teams.', buttonText: 'Start Free Trial', buttonLink: '#starter' },
          { title: 'Professional', subTitle: '$79', description: 'Advanced AI tooling, automated workflows, and priority queues.', buttonText: 'Upgrade to Pro', buttonLink: '#pro' },
          { title: 'Enterprise', subTitle: '$199', description: 'Dedicated engineering SLAs, single-tenant hosting & audit logs.', buttonText: 'Contact Sales', buttonLink: '#enterprise' }
        ]
      }
    },
    {
      id: 'body',
      name: 'Features & Services',
      icon: 'view_quilt',
      tagline: 'Multi-column responsive grid with icon badges and description cards',
      defaultName: 'Core Capabilities Grid',
      html: `<section class="oz-features-section">
  <div class="oz-features-header">
    <span class="oz-sub-badge">{{ MiniTitle }}</span>
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
</section>`,
      css: `.oz-features-section {
  padding: 72px 24px;
  background: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  text-align: center;
}
.oz-sub-badge {
  display: inline-block;
  background: #eef2ff;
  color: #0050e5;
  font-size: 11px;
  font-weight: 800;
  padding: 4px 12px;
  border-radius: 16px;
  margin-bottom: 12px;
}
.oz-features-title {
  font-size: 34px;
  font-weight: 900;
  color: #0f172a;
  margin: 0 0 12px 0;
  letter-spacing: -0.02em;
}
.oz-features-desc {
  font-size: 15px;
  color: #64748b;
  max-width: 620px;
  margin: 0 auto 48px auto;
  line-height: 1.5;
}
.oz-features-grid {
  max-width: 1140px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 28px;
  text-align: left;
}
.oz-feature-card {
  background: #f8fafc;
  border: 1.5px solid #e2e8f0;
  border-radius: 12px;
  padding: 28px;
  transition: all 0.2s ease;
}
.oz-feature-card:hover {
  transform: translateY(-3px);
  border-color: #0050e5;
  background: #ffffff;
  box-shadow: 0 8px 24px rgba(0, 80, 229, 0.08);
}
.oz-feature-icon-box {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  background: #eef2ff;
  color: #0050e5;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 18px;
}
.oz-feature-icon-box .material-symbols-outlined { font-size: 26px; }
.oz-feature-card-title { font-size: 18px; font-weight: 800; color: #0f172a; margin: 0 0 8px 0; }
.oz-feature-card-desc { font-size: 13.5px; color: #64748b; line-height: 1.55; margin: 0; }`,
      sampleContent: {
        title: 'Engineered For Enterprise Scale And Sub-Millisecond Speed',
        miniTitle: 'PLATFORM CAPABILITIES',
        description: 'Unified toolchain built from the ground up to solve distributed bottlenecks and enhance organizational productivity.',
        imageUrl: '',
        buttonText: '',
        buttonLink: '',
        items: [
          { title: 'Edge Cloud Replication', description: 'Continuous multi-region synchronization keeps your endpoints resilient against regional downtime.', icon: 'hub' },
          { title: 'Zero Trust Security', description: 'Granular policy enforcement, automatic device trust tokens, and cryptographic verification on every request.', icon: 'verified_user' },
          { title: 'Automated CI/CD Workflows', description: 'Push to git and deploy production containers in seconds with automated rollback guards.', icon: 'rocket_launch' }
        ]
      }
    },
    {
      id: 'contact',
      name: 'Contact Us',
      icon: 'contact_mail',
      tagline: 'Split layout with office details and responsive direct inquiry form',
      defaultName: 'Contact & Inquiry Section',
      html: `<section class="oz-contact-section">
  <div class="oz-contact-container">
    <div class="oz-contact-info">
      <span class="oz-sub-badge">{{ MiniTitle }}</span>
      <h2 class="oz-contact-title">{{ Title }}</h2>
      <p class="oz-contact-desc">{{ Description }}</p>

      <div class="oz-info-stack">
        <div class="oz-info-row">
          <span class="material-symbols-outlined oz-info-icon">mail</span>
          <div>
            <strong>Support Email</strong>
            <p>{{ Email }}</p>
          </div>
        </div>
        <div class="oz-info-row">
          <span class="material-symbols-outlined oz-info-icon">phone</span>
          <div>
            <strong>Direct Phone</strong>
            <p>{{ Phone }}</p>
          </div>
        </div>
        <div class="oz-info-row">
          <span class="material-symbols-outlined oz-info-icon">location_on</span>
          <div>
            <strong>Global Headquarters</strong>
            <p>{{ Address }}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="oz-contact-card">
      <form class="oz-contact-form" onsubmit="event.preventDefault();">
        <div class="oz-form-row">
          <label>Your Full Name</label>
          <input type="text" class="oz-form-ctrl" placeholder="Alex Morgan" />
        </div>
        <div class="oz-form-row">
          <label>Work Email</label>
          <input type="email" class="oz-form-ctrl" placeholder="alex@company.com" />
        </div>
        <div class="oz-form-row">
          <label>Your Inquiry</label>
          <textarea rows="4" class="oz-form-ctrl" placeholder="Tell us about your project requirements..."></textarea>
        </div>
        <button type="submit" class="oz-btn-submit">{{ ButtonText }}</button>
      </form>
    </div>
  </div>
</section>`,
      css: `.oz-contact-section {
  padding: 70px 24px;
  background: #f8fafc;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.oz-contact-container {
  max-width: 1140px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 48px;
  align-items: start;
}
.oz-sub-badge {
  display: inline-block;
  background: #eef2ff;
  color: #0050e5;
  font-size: 11px;
  font-weight: 800;
  padding: 4px 12px;
  border-radius: 16px;
  margin-bottom: 12px;
}
.oz-contact-title {
  font-size: 36px;
  font-weight: 900;
  color: #0f172a;
  margin: 0 0 12px 0;
  letter-spacing: -0.02em;
}
.oz-contact-desc {
  font-size: 15px;
  color: #64748b;
  line-height: 1.6;
  margin: 0 0 32px 0;
}
.oz-info-stack { display: flex; flex-direction: column; gap: 20px; }
.oz-info-row { display: flex; align-items: flex-start; gap: 14px; }
.oz-info-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: #eef2ff;
  color: #0050e5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}
.oz-info-row strong { font-size: 13px; color: #0f172a; display: block; }
.oz-info-row p { font-size: 14px; color: #475569; margin: 2px 0 0 0; }
.oz-contact-card {
  background: #ffffff;
  border: 1.5px solid #e2e8f0;
  border-radius: 14px;
  padding: 32px;
  box-shadow: 0 4px 18px rgba(0,0,0,0.04);
}
.oz-form-row { margin-bottom: 18px; }
.oz-form-row label {
  display: block;
  font-size: 12.5px;
  font-weight: 700;
  color: #334155;
  margin-bottom: 6px;
}
.oz-form-ctrl {
  width: 100%;
  border: 1.5px solid #cbd5e1;
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13.5px;
  outline: none;
  box-sizing: border-box;
}
.oz-form-ctrl:focus { border-color: #0050e5; }
.oz-btn-submit {
  width: 100%;
  padding: 14px;
  background: #0050e5;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(0, 80, 229, 0.3);
}
@media (max-width: 768px) {
  .oz-contact-container { grid-template-columns: 1fr; }
}`,
      sampleContent: {
        title: "Let's Build Something Exceptional Together",
        miniTitle: 'GET IN TOUCH',
        description: 'Our global product specialists are ready to architect the ideal setup for your team requirements.',
        email: 'partnerships@acme-global.com',
        phone: '+1 (800) 555-0199',
        address: '450 Innovation Blvd, Tower B, Silicon Valley, CA',
        buttonText: 'Send Direct Message',
        buttonLink: '#',
        imageUrl: '',
        items: []
      },
      specificTokens: [
        { label: 'Support Email', token: '{{ Email }}' },
        { label: 'Contact Phone', token: '{{ Phone }}' },
        { label: 'HQ Address', token: '{{ Address }}' }
      ]
    },
    {
      id: 'faq',
      name: 'FAQ Accordion',
      icon: 'help_outline',
      tagline: 'Collapsible questions and answers list for knowledge base sections',
      defaultName: 'Knowledge Base FAQ',
      html: `<section class="oz-faq-section">
  <div class="oz-faq-header">
    <span class="oz-sub-badge">{{ MiniTitle }}</span>
    <h2 class="oz-faq-title">{{ Title }}</h2>
    <p class="oz-faq-desc">{{ Description }}</p>
  </div>

  <div class="oz-faq-list">
    {{#each PageSectionLists}}
    <details class="oz-faq-item">
      <summary class="oz-faq-question">
        <span>{{ Title }}</span>
        <span class="material-symbols-outlined oz-arrow">expand_more</span>
      </summary>
      <div class="oz-faq-answer">
        <p>{{ Description }}</p>
      </div>
    </details>
    {{/each}}
  </div>
</section>`,
      css: `.oz-faq-section {
  padding: 70px 24px;
  background: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.oz-faq-header { text-align: center; max-width: 650px; margin: 0 auto 40px auto; }
.oz-sub-badge {
  display: inline-block;
  background: #eef2ff;
  color: #0050e5;
  font-size: 11px;
  font-weight: 800;
  padding: 4px 12px;
  border-radius: 16px;
  margin-bottom: 12px;
}
.oz-faq-title { font-size: 34px; font-weight: 900; color: #0f172a; margin: 0 0 10px 0; }
.oz-faq-desc { font-size: 14.5px; color: #64748b; line-height: 1.5; margin: 0; }
.oz-faq-list { max-width: 800px; margin: 0 auto; display: flex; flex-direction: column; gap: 14px; }
.oz-faq-item {
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  padding: 16px 20px;
  background: #f8fafc;
  transition: all 0.2s ease;
}
.oz-faq-item[open] { border-color: #0050e5; background: #ffffff; }
.oz-faq-question {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  cursor: pointer;
  list-style: none;
}
.oz-faq-question::-webkit-details-marker { display: none; }
.oz-faq-item[open] .oz-arrow { transform: rotate(180deg); color: #0050e5; }
.oz-faq-answer { padding-top: 12px; color: #475569; font-size: 14px; line-height: 1.6; }
.oz-faq-answer p { margin: 0; }`,
      sampleContent: {
        title: 'Frequently Asked Questions',
        miniTitle: 'HELP & CLARITY',
        description: 'Everything you need to know about our cloud architecture, provisioning, and billing options.',
        imageUrl: '',
        buttonText: '',
        buttonLink: '',
        items: [
          { title: 'How does multi-tenant database isolation work?', description: 'Each tenant is allocated a dedicated schema partition with strict row-level security and independent cryptographic keys.' },
          { title: 'Can I import my own custom CSS framework or Tailwind?', description: 'Yes. You can link external stylesheets in the Header Tags injection zone or include scoped styles directly in each template.' },
          { title: 'What is the uptime SLA on production clusters?', description: 'We guarantee a 99.99% monthly uptime backed by financial credits and automated multi-region failover.' }
        ]
      }
    },
    {
      id: 'menu',
      name: 'Navigation Bar',
      icon: 'menu',
      tagline: 'Header bar with brand logo, nav links loop, and direct action button',
      defaultName: 'Modern Sticky Navbar',
      html: `<header class="oz-nav-header">
  <div class="oz-nav-container">
    <a href="/" class="oz-nav-brand">
      <span class="oz-brand-icon material-symbols-outlined">dataset</span>
      <span class="oz-brand-text">{{ BrandName }}</span>
    </a>

    <nav class="oz-nav-links">
      {{#each PageSectionLists}}
      <a href="{{ ButtonLink }}" class="oz-nav-link">{{ Title }}</a>
      {{/each}}
    </nav>

    <div class="oz-nav-cta">
      <a href="{{ ButtonLink }}" class="oz-btn-nav">{{ ButtonText }}</a>
    </div>
  </div>
</header>`,
      css: `.oz-nav-header {
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  padding: 16px 24px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  position: sticky;
  top: 0;
  z-index: 1000;
}
.oz-nav-container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.oz-nav-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  color: #0f172a;
  font-weight: 800;
  font-size: 18px;
}
.oz-brand-icon { color: #0050e5; font-size: 26px; }
.oz-nav-links { display: flex; align-items: center; gap: 24px; }
.oz-nav-link {
  color: #475569;
  text-decoration: none;
  font-size: 14px;
  font-weight: 600;
  transition: color 0.15s ease;
}
.oz-nav-link:hover { color: #0050e5; }
.oz-btn-nav {
  background: #0050e5;
  color: #ffffff;
  padding: 9px 18px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
}`,
      sampleContent: {
        brandName: 'Acme Global',
        buttonText: 'Console Sign In',
        buttonLink: '#login',
        title: '',
        miniTitle: '',
        description: '',
        imageUrl: '',
        items: [
          { title: 'Products', buttonLink: '#products', description: '' },
          { title: 'Architecture', buttonLink: '#arch', description: '' },
          { title: 'Pricing', buttonLink: '#pricing', description: '' },
          { title: 'Docs', buttonLink: '#docs', description: '' }
        ]
      },
      specificTokens: [
        { label: 'Brand Name', token: '{{ BrandName }}' }
      ]
    },
    {
      id: 'footer',
      name: 'Footer',
      icon: 'dock_to_bottom',
      tagline: 'Multi-column corporate footer with links, brand info, and copyright bar',
      defaultName: 'Enterprise Clean Footer',
      html: `<footer class="oz-site-footer">
  <div class="oz-footer-container">
    <div class="oz-footer-brand-col">
      <h3 class="oz-footer-brand">{{ BrandName }}</h3>
      <p class="oz-footer-tagline">{{ Description }}</p>
      <span class="oz-footer-copy">{{ Copyright }}</span>
    </div>

    <div class="oz-footer-links-grid">
      {{#each PageSectionLists}}
      <div class="oz-footer-col">
        <h4 class="oz-footer-col-title">{{ Title }}</h4>
        <p class="oz-footer-col-sub">{{ Description }}</p>
      </div>
      {{/each}}
    </div>
  </div>
</footer>`,
      css: `.oz-site-footer {
  background: #0f172a;
  color: #ffffff;
  padding: 60px 24px 40px 24px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.oz-footer-container {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1.5fr 2fr;
  gap: 48px;
}
.oz-footer-brand { font-size: 22px; font-weight: 900; margin: 0 0 10px 0; }
.oz-footer-tagline { font-size: 14px; color: #94a3b8; line-height: 1.6; max-width: 320px; margin: 0 0 24px 0; }
.oz-footer-copy { font-size: 12px; color: #64748b; }
.oz-footer-links-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 24px;
}
.oz-footer-col-title { font-size: 14px; font-weight: 700; color: #ffffff; margin: 0 0 8px 0; }
.oz-footer-col-sub { font-size: 13px; color: #94a3b8; margin: 0; line-height: 1.5; }
@media (max-width: 768px) {
  .oz-footer-container { grid-template-columns: 1fr; }
}`,
      sampleContent: {
        brandName: 'Acme Global Platform',
        description: 'Empowering organizations worldwide with autonomous cloud deployment and intelligent telemetry.',
        copyright: '© 2026 Acme Global Corp. All rights reserved.',
        title: '',
        miniTitle: '',
        imageUrl: '',
        buttonText: '',
        buttonLink: '',
        items: [
          { title: 'Platform', description: 'Real-time telemetry, zero trust tokens, global cache edge points.' },
          { title: 'Solutions', description: 'Fintech compliance, enterprise healthcare, SaaS automation.' },
          { title: 'Developers', description: 'REST APIs, CLI tools, webhooks, sandbox testing.' }
        ]
      },
      specificTokens: [
        { label: 'Brand Name', token: '{{ BrandName }}' },
        { label: 'Copyright Notice', token: '{{ Copyright }}' }
      ]
    }
  ];

  constructor(
    private router: Router,
    private sanitizer: DomSanitizer,
    private toast: ToastService,
    private api: ApiService
  ) {}

  ngOnInit(): void {
    this.resolveTenantInfo();
    this.onCategoryChange(false);
  }

  /**
   * Resolves current tenant key (e.g. "acme-global") and domain initials (e.g. "AG")
   * from active browser hostname and local storage.
   */
  resolveTenantInfo(): void {
    let key = '';
    try {
      key = localStorage.getItem('tenant_key') || '';
    } catch (e) {}

    if (!key && typeof window !== 'undefined') {
      const host = window.location.hostname;
      // If host is e.g. "acme-global.localhost" or "acme-global.domain.com"
      if (host && host !== 'localhost' && host !== '127.0.0.1') {
        key = host.split('.')[0];
      }
    }

    if (!key) {
      key = 'acme-global';
    }

    this.resolvedTenantKey = key.trim().toLowerCase();

    // Compute initials: split by "-" or "_" or "."
    const parts = this.resolvedTenantKey.split(/[-_.]+/).filter(Boolean);
    if (parts.length >= 2) {
      // E.g. "acme-global" -> "AG"
      this.domainInitials = parts.slice(0, 3).map(p => p[0].toUpperCase()).join('');
    } else if (parts.length === 1) {
      // E.g. "ozikol" -> "OZ", "acme" -> "AC"
      this.domainInitials = parts[0].substring(0, Math.min(3, parts[0].length)).toUpperCase();
    } else {
      this.domainInitials = 'AG';
    }
  }

  /**
   * Generates a 5-character cryptographic random alphanumeric code.
   */
  generateRandom5(): string {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Assembles variant code: [CATEGORY]_[DOMAIN_INITIAL]_[RANDOM5]
   */
  generateVariantCode(categoryKey: string): string {
    const catCode = (categoryKey || 'SECTION').toUpperCase();
    const dom = this.domainInitials || 'AG';
    const rand5 = this.generateRandom5();
    return `${catCode}_${dom}_${rand5}`;
  }

  /**
   * Regenerates the variant code key while preserving the prefix.
   */
  regenerateVariantCode(): void {
    this.variantCode = this.generateVariantCode(this.selectedCategory);
    this.toast.info(`Generated new variant code: ${this.variantCode}`);
  }

  /**
   * Returns the currently active category preset configuration.
   */
  get currentPreset(): CategoryPreset {
    return this.categoryPresets.find(c => c.id === this.selectedCategory) || this.categoryPresets[0];
  }

  /**
   * Triggered when the user switches the category dropdown.
   * Loads category markup, scoped styles, and realistic sample data.
   */
  onCategoryChange(isUserAction: boolean): void {
    const preset = this.currentPreset;

    // Generate new category-tailored variant code
    this.variantCode = this.generateVariantCode(preset.id);

    if (!this.templateName || !isUserAction) {
      this.templateName = preset.defaultName;
    }
    if (!this.description || !isUserAction) {
      this.description = preset.tagline;
    }

    this.htmlTemplate = preset.html;
    this.cssStyles = preset.css;
    this.jsScript = '';

    // Deep copy category sample content
    this.sampleContent = JSON.parse(JSON.stringify(preset.sampleContent));

    this.updatePreviewSimulation();

    if (isUserAction) {
      this.toast.info(`Loaded ${preset.name} boilerplate markup & sample content.`);
    }
  }

  onTemplateNameChange(): void {
    // Keep preview synchronized
  }

  confirmResetToCategoryBoilerplate(): void {
    if (confirm(`Reset HTML & CSS to default ${this.currentPreset.name} boilerplate? Any uncommitted edits will be replaced.`)) {
      this.onCategoryChange(true);
    }
  }

  /**
   * Inserts a placeholder token directly at the current cursor position in the HTML textarea.
   * Avoids jumping to the bottom and immediately restores selection focus.
   */
  insertTokenAtCursor(tokenText: string): void {
    const textarea = this.htmlEditorRef?.nativeElement;
    if (!textarea) {
      this.htmlTemplate = (this.htmlTemplate || '') + tokenText;
      this.onCodeChange();
      return;
    }

    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const currentVal = this.htmlTemplate || '';

    const newVal = currentVal.substring(0, start) + tokenText + currentVal.substring(end);
    this.htmlTemplate = newVal;

    // Restore cursor position immediately after the inserted token
    setTimeout(() => {
      textarea.focus();
      const newPos = start + tokenText.length;
      textarea.setSelectionRange(newPos, newPos);
      this.onCodeChange();
    }, 10);

    this.toast.info(`Inserted: ${tokenText.split('\n')[0]}`);
  }

  /**
   * Inserts the structured repeater loop for PageSectionLists at the cursor position.
   */
  insertRepeaterLoopAtCursor(): void {
    const loopBlock = `\n{{#each PageSectionLists}}
  <div class="oz-card-item">
    <span class="material-symbols-outlined">{{ Icon }}</span>
    <h4>{{ Title }}</h4>
    <p>{{ Description }}</p>
  </div>
{{/each}}\n`;
    this.insertTokenAtCursor(loopBlock);
  }

  onCodeChange(): void {
    this.updatePreviewSimulation();
  }

  onSampleContentChange(): void {
    this.updatePreviewSimulation();
  }

  resetSampleContentToCategoryDefaults(): void {
    this.sampleContent = JSON.parse(JSON.stringify(this.currentPreset.sampleContent));
    this.updatePreviewSimulation();
    this.toast.info('Sample content reset to category presets.');
  }

  addSampleSubItem(): void {
    const idx = (this.sampleContent.items?.length || 0) + 1;
    if (!this.sampleContent.items) this.sampleContent.items = [];
    this.sampleContent.items.push({
      title: `Sample Item ${idx}`,
      subTitle: `$${idx * 15}`,
      description: 'Dynamic item description created in repeater inspector.',
      icon: 'star',
      buttonText: 'View Details',
      buttonLink: '#'
    });
    this.updatePreviewSimulation();
  }

  removeSampleSubItem(idx: number): void {
    if (this.sampleContent.items?.length > 1) {
      this.sampleContent.items.splice(idx, 1);
      this.updatePreviewSimulation();
    } else {
      this.toast.info('Keep at least 1 item to test the repeater loop.');
    }
  }

  /**
   * Hydrates raw template HTML containing {{ Placeholders }} with the sample content.
   */
  hydrateMarkup(rawHtml: string): string {
    if (!rawHtml) return '';
    let output = rawHtml;
    const ctx = this.sampleContent;

    // 1. Loop over {{#each PageSectionLists}}...{{/each}}
    const eachRegex = /\{\{#each\s+PageSectionLists\}\}([\s\S]*?)\{\{\/each\}\}/gi;
    output = output.replace(eachRegex, (_match, innerTemplate) => {
      if (!ctx.items || !Array.isArray(ctx.items) || ctx.items.length === 0) {
        return '';
      }
      return ctx.items.map((item: any, idx: number) => {
        let renderedItem = innerTemplate;
        renderedItem = renderedItem.replace(/\{\{\s*Title\s*\}\}/gi, item.title || `Item ${idx + 1}`);
        renderedItem = renderedItem.replace(/\{\{\s*SubTitle\s*\}\}/gi, item.subTitle || '');
        renderedItem = renderedItem.replace(/\{\{\s*MiniTitle\s*\}\}/gi, item.miniTitle || ctx.miniTitle || '');
        renderedItem = renderedItem.replace(/\{\{\s*Description\s*\}\}/gi, item.description || '');
        renderedItem = renderedItem.replace(/\{\{\s*Icon\s*\}\}/gi, item.icon || 'star');
        renderedItem = renderedItem.replace(/\{\{\s*ImageUrl\s*\}\}/gi, item.imageUrl || ctx.imageUrl || '');
        renderedItem = renderedItem.replace(/\{\{\s*ButtonText\s*\}\}/gi, item.buttonText || ctx.buttonText || 'Learn More');
        renderedItem = renderedItem.replace(/\{\{\s*ButtonLink\s*\}\}/gi, item.buttonLink || ctx.buttonLink || '#');
        return renderedItem;
      }).join('\n');
    });

    // 2. Scalar Field Placeholders
    output = output.replace(/\{\{\s*Title\s*\}\}/gi, ctx.title || '');
    output = output.replace(/\{\{\s*MiniTitle\s*\}\}/gi, ctx.miniTitle || '');
    output = output.replace(/\{\{\s*Description\s*\}\}/gi, ctx.description || '');
    output = output.replace(/\{\{\s*ImageUrl\s*\}\}/gi, ctx.imageUrl || '');
    output = output.replace(/\{\{\s*ButtonText\s*\}\}/gi, ctx.buttonText || '');
    output = output.replace(/\{\{\s*ButtonLink\s*\}\}/gi, ctx.buttonLink || '#');
    output = output.replace(/\{\{\s*SecondaryButtonText\s*\}\}/gi, ctx.secondaryButtonText || '');
    output = output.replace(/\{\{\s*SecondaryButtonLink\s*\}\}/gi, ctx.secondaryButtonLink || '#');
    output = output.replace(/\{\{\s*Email\s*\}\}/gi, ctx.email || 'contact@acme-global.com');
    output = output.replace(/\{\{\s*Phone\s*\}\}/gi, ctx.phone || '+1 (800) 555-0199');
    output = output.replace(/\{\{\s*Address\s*\}\}/gi, ctx.address || 'Enterprise Blvd, Silicon Valley');
    output = output.replace(/\{\{\s*BrandName\s*\}\}/gi, ctx.brandName || 'Acme Global');
    output = output.replace(/\{\{\s*Copyright\s*\}\}/gi, ctx.copyright || '© 2026 Acme Global. All rights reserved.');

    return output;
  }

  /**
   * Compiles HTML and scoped CSS into sanitized DOM for the live visual preview container.
   */
  updatePreviewSimulation(): void {
    const hydratedHtml = this.hydrateMarkup(this.htmlTemplate);
    const combined = `
      <style>
        ${this.cssStyles || ''}
      </style>
      <div class="oz-live-simulation-root">
        ${hydratedHtml}
      </div>
    `;
    this.safeHydratedHtml = this.sanitizer.bypassSecurityTrustHtml(combined);
  }

  /**
   * Persists the custom template directly into the database and local library.
   */
  saveCustomTemplate(): void {
    if (!this.templateName?.trim()) {
      this.toast.error('Please enter a template name.');
      return;
    }
    if (!this.htmlTemplate?.trim()) {
      this.toast.error('Please provide the HTML markup for this section.');
      return;
    }
    if (!this.variantCode?.trim()) {
      this.variantCode = this.generateVariantCode(this.selectedCategory);
    }

    this.savingTemplate = true;

    const payload = {
      name: this.templateName.trim(),
      categoryKey: this.selectedCategory,
      variantCode: this.variantCode.trim(),
      description: this.description.trim() || `${this.currentPreset.name} crafted template`,
      htmlTemplate: this.htmlTemplate,
      cssStyles: this.cssStyles,
      jsScript: this.jsScript,
      defaultContentJson: JSON.stringify(this.sampleContent)
    };

    this.api.post<any>('ContentApi/templates/custom', payload).subscribe({
      next: (res) => {
        this.savingTemplate = false;
        const newDbItem = res?.data;

        const newTemplate: InstalledTemplateItem = {
          id: this.variantCode,
          dbId: newDbItem?.id,
          name: this.templateName,
          category: this.selectedCategory,
          variantCode: this.variantCode,
          tag: 'custom',
          badge: 'Custom',
          description: this.description || 'Custom crafted section template',
          thumbnailGradient: 'linear-gradient(135deg, #0050e5 0%, #1e293b 100%)',
          previewIcon: this.currentPreset.icon,
          previewSubtitle: this.currentPreset.name,
          previewTitle: this.templateName,
          previewBody: this.description || 'Custom section component',
          htmlTemplate: this.htmlTemplate,
          cssStyles: this.cssStyles,
          jsScript: this.jsScript,
          version: '1.0.0',
          installedUtc: new Date().toISOString(),
          defaultContentJson: payload.defaultContentJson
        };

        // Update local storage installed templates cache
        try {
          const stored = localStorage.getItem('oz_installed_templates');
          const list: InstalledTemplateItem[] = stored ? JSON.parse(stored) : [];
          list.unshift(newTemplate);
          localStorage.setItem('oz_installed_templates', JSON.stringify(list));
        } catch (e) {}

        this.toast.success(`Custom template '${newTemplate.name}' saved to your vault!`);
        this.router.navigate(['/content/console/templates']);
      },
      error: () => {
        this.savingTemplate = false;
        this.toast.error('Failed to create custom template. Please verify API connection.');
      }
    });
  }
}
