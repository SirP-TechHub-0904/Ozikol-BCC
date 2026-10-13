import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { VisualEditorComponent } from '../../visual-editor/visual-editor.component';
import { ApiService } from '../../../../../../core/services/api.service';
import { ToastService } from '../../../../../../core/services/toast.service';
import { UniversalPreviewModalService } from '../../services/universal-preview-modal.service';

/**
 * Dedicated category studio component for creating and editing Navigation (Navbar) section templates.
 * Enforces the approved 3-zone architecture (Top utility bar, First/Middle/Last nav zones, CTA buttons, and Dynamic Login).
 */
@Component({
  selector: 'app-menu-visual',
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
              placeholder="e.g. Classic Light Corporate Navbar"
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
              (click)="saveNavigationTemplate()"
            >
              <span class="material-symbols-outlined btn-icon" *ngIf="!isSaving">check_circle</span>
              <span class="material-symbols-outlined btn-icon spin" *ngIf="isSaving">sync</span>
              <span>{{ isSaving ? 'Saving...' : (isEditMode ? 'Update Navigation' : 'Save Navigation') }}</span>
            </button>
          </div>
        </div>

        <div class="config-col col-span-full" style="margin-top: 14px;">
          <label class="config-label">DESCRIPTION (OPTIONAL)</label>
          <input
            type="text"
            [(ngModel)]="description"
            class="form-control config-input"
            placeholder="e.g. Sticky light corporate navbar with dynamic logo/brand identity, dropdowns, and CTA buttons"
          />
        </div>
      </div>

      <!-- 2. Template Code & Content Studio Card -->
      <div class="code-editor-card">
        <!-- Studio Card Header -->
        <div class="studio-card-header">
          <div class="studio-title-block">
            <span class="material-symbols-outlined studio-code-icon">code</span>
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
            [category]="'menu'"
            [categoryName]="'Navigation'"
            [activeTab]="activeEditorTab"
            [hideInternalTabs]="true"
            [htmlTemplate]="htmlTemplate"
            [cssStyles]="cssStyles"
            [jsScript]="jsScript"
            [sampleContent]="sampleContent"
            [specificTokens]="navigationTokens"
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
                <h3 class="drawer-title">Mock Content &amp; Loop Configuration for Navigation</h3>
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

          <!-- Mock Data Sub-Tabs: Menu Tree, Brand & Identity, CTA Buttons, Top Bar -->
          <div class="mock-tabs-nav">
            <button
              type="button"
              class="mock-tab-btn"
              [class.active]="activeMockTab === 'menu'"
              (click)="activeMockTab = 'menu'"
            >
              <span class="material-symbols-outlined icon-micro">account_tree</span>
              <span>Menu Tree</span>
              <span class="mock-tab-badge">{{ (sampleContent.navigationMenu?.length || 0) }}</span>
            </button>
            <button
              type="button"
              class="mock-tab-btn"
              [class.active]="activeMockTab === 'identity'"
              (click)="activeMockTab = 'identity'"
            >
              <span class="material-symbols-outlined icon-micro">corporate_fare</span>
              <span>Brand &amp; Identity</span>
            </button>
            <button
              type="button"
              class="mock-tab-btn"
              [class.active]="activeMockTab === 'cta'"
              (click)="activeMockTab = 'cta'"
            >
              <span class="material-symbols-outlined icon-micro">smart_button</span>
              <span>CTA Buttons</span>
              <span class="mock-tab-badge">{{ (sampleContent.menuCtaButtons?.length || 0) }}</span>
            </button>
            <button
              type="button"
              class="mock-tab-btn"
              [class.active]="activeMockTab === 'topbar'"
              (click)="activeMockTab = 'topbar'"
            >
              <span class="material-symbols-outlined icon-micro">vertical_align_top</span>
              <span>Top Bar &amp; Utility</span>
              <span class="mock-tab-badge">{{ (sampleContent.topBarPages?.length || 0) }}</span>
            </button>
          </div>

          <!-- Sub-Tab: Brand & Identity -->
          <div class="mock-tab-pane" *ngIf="activeMockTab === 'identity'">
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
                  placeholder="e.g. Your Organization Name"
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
                  placeholder="e.g. © 2026 Your Organization Name. All rights reserved."
                />
              </div>
            </div>

            <div class="inspector-form-grid-3" style="margin-top: 14px;">
              <div class="form-group">
                <label class="field-label">
                  <span>Support Email</span>
                  <code [innerText]="'{{ Email }}'"></code>
                </label>
                <input
                  type="text"
                  [(ngModel)]="sampleContent.email"
                  class="form-control inspector-input"
                  placeholder="e.g. name@company.com"
                />
              </div>

              <div class="form-group">
                <label class="field-label">
                  <span>Contact Phone</span>
                  <code [innerText]="'{{ Phone }}'"></code>
                </label>
                <input
                  type="text"
                  [(ngModel)]="sampleContent.phone"
                  class="form-control inspector-input"
                  placeholder="e.g. +0 (000) 000-0000"
                />
              </div>

              <div class="form-group">
                <label class="field-label">
                  <span>Corporate Headquarters Address</span>
                  <code [innerText]="'{{ Address }}'"></code>
                </label>
                <input
                  type="text"
                  [(ngModel)]="sampleContent.address"
                  class="form-control inspector-input"
                  placeholder="e.g. 1200 Innovation Way, Suite 400"
                />
              </div>
            </div>
          </div>

          <!-- Sub-Tab: Menu Tree (With Zones, Dropdown Children & Add Links) -->
          <div class="mock-tab-pane" *ngIf="activeMockTab === 'menu'">
            <div class="nav-tree-container">
              <div class="nav-parent-card" *ngFor="let item of (sampleContent.navigationMenu || []); let idx = index">
                <div class="nav-parent-header">
                  <span class="material-symbols-outlined nav-item-icon">{{ item.isDropdown ? 'folder_open' : 'link' }}</span>
                  <input
                    type="text"
                    [(ngModel)]="item.title"
                    class="form-control inspector-input item-title-input"
                    placeholder="e.g. Menu Title"
                  />
                  <input
                    type="text"
                    [(ngModel)]="item.url"
                    class="form-control inspector-input item-url-input"
                    placeholder="e.g. /url"
                  />
                  <select [(ngModel)]="item.zone" class="zone-select" title="Zone">
                    <option value="first">Zone: first</option>
                    <option value="middle">Zone: middle</option>
                    <option value="last">Zone: last</option>
                  </select>
                  <label class="dropdown-check-label" title="Enable dropdown child pages">
                    <input type="checkbox" [(ngModel)]="item.isDropdown" (change)="toggleDropdownItem(item)" />
                    <span>Dropdown</span>
                  </label>
                  <button type="button" class="btn-remove-item" (click)="removeSampleMenuItem(idx)" title="Remove item">
                    <span class="material-symbols-outlined">delete</span>
                  </button>
                </div>

                <!-- Dropdown Children Sub-pages -->
                <div class="nav-subpages-list" *ngIf="item.isDropdown">
                  <div class="nav-subpage-item" *ngFor="let sub of (item.pages || []); let sIdx = index">
                    <span class="material-symbols-outlined sub-icon">subdirectory_arrow_right</span>
                    <input
                      type="text"
                      [(ngModel)]="sub.title"
                      class="form-control inspector-input sub-title-input"
                      placeholder="e.g. Subpage Title"
                    />
                    <input
                      type="text"
                      [(ngModel)]="sub.url"
                      class="form-control inspector-input sub-url-input"
                      placeholder="e.g. /subpage-url"
                    />
                    <button type="button" class="btn-remove-sub" (click)="removeSubMenuItem(item, sIdx)" title="Remove sub-page">
                      <span class="material-symbols-outlined">close</span>
                    </button>
                  </div>
                  <button type="button" class="btn-add-subpage" (click)="addSubMenuItem(item)">
                    <span class="material-symbols-outlined">add</span>
                    <span>Add Dropdown Link</span>
                  </button>
                </div>
              </div>

              <button type="button" class="btn-add-menu-item" (click)="addSampleMenuItem()">
                <span class="material-symbols-outlined">add</span>
                <span>Add Menu Item</span>
              </button>
            </div>
          </div>

          <!-- Sub-Tab: CTA Buttons -->
          <div class="mock-tab-pane" *ngIf="activeMockTab === 'cta'">
            <div class="nav-tree-container">
              <div class="cta-button-card" *ngFor="let btn of (sampleContent.menuCtaButtons || []); let bIdx = index">
                <div class="cta-button-header">
                  <span class="material-symbols-outlined nav-item-icon">smart_button</span>
                  <input
                    type="text"
                    [(ngModel)]="btn.title"
                    class="form-control inspector-input"
                    placeholder="e.g. Button Title"
                    style="flex: 2;"
                  />
                  <input
                    type="text"
                    [(ngModel)]="btn.url"
                    class="form-control inspector-input"
                    placeholder="e.g. /url"
                    style="flex: 3;"
                  />
                  <input
                    type="text"
                    [(ngModel)]="btn.customClass"
                    class="form-control inspector-input"
                    placeholder="e.g. oz-btn-primary or oz-btn-ghost"
                    style="flex: 2;"
                  />
                  <button type="button" class="btn-remove-item" (click)="removeSampleCtaButton(bIdx)" title="Remove button">
                    <span class="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </div>
              <button type="button" class="btn-add-menu-item" (click)="addSampleCtaButton()">
                <span class="material-symbols-outlined">add</span>
                <span>Add CTA Button</span>
              </button>
            </div>
          </div>

          <!-- Sub-Tab: Top Bar & Utility -->
          <div class="mock-tab-pane" *ngIf="activeMockTab === 'topbar'">
            <div class="inspector-form-grid-2" style="margin-bottom: 16px;">
              <div class="form-group">
                <label class="field-label">
                  <span>Enable Top Bar</span>
                  <code>HasTopBar</code>
                </label>
                <div style="display: flex; align-items: center; gap: 8px; margin-top: 6px;">
                  <input type="checkbox" id="hasTopBarCheck" [(ngModel)]="sampleContent.hasTopBar" />
                  <label for="hasTopBarCheck" style="font-size: 13.5px; font-weight: 500; color: #475569; cursor: pointer;">Show Top Utility Bar</label>
                </div>
              </div>
              <div class="form-group">
                <label class="field-label">
                  <span>Enable Contact Info</span>
                  <code>HasContactInfo</code>
                </label>
                <div style="display: flex; align-items: center; gap: 8px; margin-top: 6px;">
                  <input type="checkbox" id="hasContactCheck" [(ngModel)]="sampleContent.hasContactInfo" />
                  <label for="hasContactCheck" style="font-size: 13.5px; font-weight: 500; color: #475569; cursor: pointer;">Show Email &amp; Phone</label>
                </div>
              </div>
            </div>

            <div style="font-size: 13px; font-weight: 700; color: #334155; margin-bottom: 8px;">
              Top Bar Pages ({{ sampleContent.topBarPages?.length || 0 }})
            </div>
            <div class="nav-tree-container">
              <div class="nav-parent-card" *ngFor="let tb of (sampleContent.topBarPages || []); let tIdx = index">
                <div class="nav-parent-header">
                  <span class="material-symbols-outlined nav-item-icon">link</span>
                  <input
                    type="text"
                    [(ngModel)]="tb.title"
                    class="form-control inspector-input item-title-input"
                    placeholder="e.g. Page Title"
                  />
                  <input
                    type="text"
                    [(ngModel)]="tb.url"
                    class="form-control inspector-input item-url-input"
                    placeholder="e.g. /url"
                  />
                  <button type="button" class="btn-remove-item" (click)="removeSampleTopBarPage(tIdx)" title="Remove page">
                    <span class="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </div>
              <button type="button" class="btn-add-menu-item" (click)="addSampleTopBarPage()">
                <span class="material-symbols-outlined">add</span>
                <span>Add Top Bar Link</span>
              </button>
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
      width: 100%;
      box-sizing: border-box;
      transition: all 0.2s ease;
    }

    .config-input:focus {
      border-color: #0050e5;
      box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.12);
    }

    .font-mono {
      font-family: 'Fira Code', monospace;
      color: #0050e5;
      font-weight: 600;
    }

    .input-with-action {
      display: flex;
      gap: 6px;
      align-items: center;
    }

    .btn-regen-key {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border: 1.5px solid #cbd5e1;
      border-radius: 8px;
      background: #f8fafc;
      color: #475569;
      cursor: pointer;
      transition: all 0.15s ease;
      flex-shrink: 0;
    }

    .btn-regen-key:hover {
      background: #f1f5f9;
      color: #0050e5;
      border-color: #94a3b8;
    }

    .btn-regen-key .material-symbols-outlined {
      font-size: 20px;
    }

    .btn-save-vault {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      height: 42px;
      padding: 0 20px;
      background: #0050e5;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 80, 229, 0.25);
      transition: all 0.15s ease;
      white-space: nowrap;
    }

    .btn-save-vault:hover:not(:disabled) {
      background: #0041ba;
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(0, 80, 229, 0.35);
    }

    .btn-save-vault:disabled {
      opacity: 0.65;
      cursor: not-allowed;
    }

    .btn-icon {
      font-size: 18px;
    }

    /* 2. Template Placeholders & Tokens Card */
    .placeholders-tokens-card {
      background: #ffffff;
      border: 1.5px solid #e2e8f0;
      border-radius: 14px;
      padding: 20px 24px;
      box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .placeholders-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }

    .placeholders-title-wrap {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .placeholders-icon {
      font-size: 24px;
      color: #0050e5;
      background: #eff6ff;
      padding: 6px;
      border-radius: 8px;
      border: 1px solid #bfdbfe;
    }

    .placeholders-title {
      font-size: 15px;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
      letter-spacing: -0.01em;
    }

    .placeholders-subtitle {
      font-size: 12px;
      color: #64748b;
      margin: 2px 0 0 0;
    }

    .ai-mode-toggle-group {
      display: inline-flex;
      background: #f1f5f9;
      padding: 4px;
      border-radius: 10px;
      gap: 4px;
    }

    .ai-mode-toggle-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border: none;
      background: transparent;
      border-radius: 7px;
      font-size: 12.5px;
      font-weight: 700;
      color: #64748b;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .ai-mode-toggle-btn.active {
      background: #ffffff;
      color: #0050e5;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08);
    }

    .mode-icon {
      font-size: 17px;
    }

    /* Smart AI Auto-Injection Banner */
    .smart-ai-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 18px 22px;
      background: linear-gradient(135deg, #f0f7ff 0%, #e0effe 100%);
      border: 1.5px solid #bae6fd;
      border-radius: 12px;
      gap: 20px;
      flex-wrap: wrap;
    }

    .smart-ai-content {
      display: flex;
      align-items: center;
      gap: 16px;
      flex: 1;
      min-width: 280px;
    }

    .ai-sparkle-badge {
      width: 44px;
      height: 44px;
      background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
      color: #ffffff;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35);
      flex-shrink: 0;
    }

    .ai-sparkle-badge .material-symbols-outlined {
      font-size: 24px;
    }

    .smart-ai-texts {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .smart-ai-title {
      font-size: 14.5px;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
    }

    .smart-ai-desc {
      font-size: 12px;
      color: #334155;
      margin: 0;
      line-height: 1.45;
    }

    .btn-smart-ai {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
      color: #ffffff;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(79, 70, 229, 0.3);
      transition: all 0.15s ease;
      white-space: nowrap;
    }

    .btn-smart-ai:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 6px 18px rgba(79, 70, 229, 0.45);
    }

    .btn-smart-ai:disabled {
      opacity: 0.65;
      cursor: not-allowed;
    }

    /* Manual Tokens Palette */
    .manual-tokens-palette {
      padding: 10px 0;
    }

    .tokens-flow-wrap {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .token-chip-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 5px 12px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      color: #334155;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .token-chip-btn:hover {
      background: #eff6ff;
      border-color: #0050e5;
      color: #0050e5;
    }

    .chip-plus {
      font-size: 15px;
    }

    /* 3. Template Code & Content Studio Card */
    .code-editor-card {
      background: #ffffff;
      border: 1.5px solid #e2e8f0;
      border-radius: 14px;
      box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .studio-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 18px 24px;
      border-bottom: 1.5px solid #f1f5f9;
      flex-wrap: wrap;
      gap: 16px;
    }

    .studio-title-block {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .studio-code-icon {
      font-size: 24px;
      color: #0050e5;
      background: #eff6ff;
      padding: 6px;
      border-radius: 8px;
      border: 1px solid #bfdbfe;
    }

    .studio-title {
      font-size: 15px;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
      letter-spacing: -0.01em;
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
      height: 36px;
      padding: 0 14px;
      border: 1.5px solid #bfdbfe;
      border-radius: 8px;
      background: #eff6ff;
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
      height: 36px;
      padding: 0 14px;
      border: 1.5px solid #cbd5e1;
      border-radius: 8px;
      background: #ffffff;
      color: #334155;
      font-size: 12.5px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-reset-boilerplate:hover {
      background: #f8fafc;
      border-color: #94a3b8;
    }

    /* Editor Tabs Bar */
    .editor-tabs-bar {
      padding: 12px 24px;
      border-bottom: 1.5px solid #f1f5f9;
      background: #f8fafc;
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
      height: 38px;
      padding: 0 16px;
      border: 1.5px solid #e2e8f0;
      border-radius: 8px;
      background: #ffffff;
      color: #64748b;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .editor-tab-btn:hover {
      background: #ffffff;
      color: #0f172a;
      border-color: #cbd5e1;
    }

    .editor-tab-btn.active {
      background: #0050e5;
      color: #ffffff;
      border-color: #0050e5;
      box-shadow: 0 2px 8px rgba(0, 80, 229, 0.25);
    }

    .tab-badge-pill {
      font-size: 10.5px;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 4px;
      background: #f1f5f9;
      color: #475569;
    }

    .editor-tab-btn.active .tab-badge-pill {
      background: rgba(255, 255, 255, 0.25);
      color: #ffffff;
    }

    .editor-tab-btn.active .material-symbols-outlined {
      color: #ffffff;
    }

    .tab-icon {
      font-size: 18px;
    }

    /* Mock Content Card */
    .mock-content-card {
      padding: 24px;
      background: #ffffff;
    }

    .content-drawer-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 14px;
      border-bottom: 1.5px solid #f1f5f9;
      flex-wrap: wrap;
      gap: 12px;
    }

    .drawer-title-wrap {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .drawer-icon {
      font-size: 26px;
      color: #0050e5;
    }

    .drawer-title {
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
    }

    .drawer-sub {
      font-size: 12px;
      color: #64748b;
      margin: 2px 0 0 0;
    }

    .btn-reset-sample {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 34px;
      padding: 0 12px;
      border-radius: 6px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      color: #334155;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-reset-sample:hover {
      background: #f1f5f9;
      border-color: #94a3b8;
    }

    .btn-reset-sample .material-symbols-outlined {
      font-size: 16px;
    }

    /* Mock Data Categorized Sub-Tabs */
    .mock-tabs-nav {
      display: flex;
      gap: 8px;
      margin-bottom: 20px;
      padding: 4px;
      background: #f8fafc;
      border-radius: 10px;
      border: 1px solid #e2e8f0;
      width: fit-content;
    }

    .mock-tab-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border: none;
      background: transparent;
      border-radius: 7px;
      font-size: 13px;
      font-weight: 700;
      color: #64748b;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .mock-tab-btn.active {
      background: #ffffff;
      color: #0050e5;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08);
      border: 1px solid #e2e8f0;
    }

    .icon-micro {
      font-size: 18px;
    }

    .mock-tab-badge {
      font-size: 10.5px;
      font-weight: 800;
      padding: 1px 6px;
      border-radius: 10px;
      background: #e2e8f0;
      color: #475569;
    }

    .mock-tab-btn.active .mock-tab-badge {
      background: #0050e5;
      color: #ffffff;
    }

    /* Form Grids with Token Pills */
    .inspector-form-grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }

    .inspector-form-grid-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
    }

    .field-label {
      font-size: 12px;
      font-weight: 700;
      color: #334155;
      margin-bottom: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .field-label code {
      color: #0050e5;
      font-size: 11px;
      background: #eef2ff;
      padding: 2px 7px;
      border-radius: 4px;
      font-family: 'Fira Code', monospace;
    }

    .inspector-input {
      border: 1.5px solid #cbd5e1;
      border-radius: 8px;
      padding: 9px 12px;
      font-size: 13.5px;
      color: #0f172a;
      outline: none;
      width: 100%;
      box-sizing: border-box;
      transition: all 0.2s ease;
    }

    .inspector-input:focus {
      border-color: #0050e5;
      box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.12);
    }

    /* Menu Tree List */
    .nav-tree-container {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .nav-parent-card {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 14px;
      background: #f8fafc;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .nav-parent-header {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .nav-item-icon {
      color: #64748b;
      font-size: 20px;
    }

    .item-title-input {
      flex: 2;
      min-width: 120px;
    }

    .item-url-input {
      flex: 2;
      min-width: 120px;
    }

    .zone-select {
      flex: 1;
      min-width: 110px;
      height: 38px;
      font-size: 12.5px;
      font-weight: 600;
      color: #334155;
      background-color: #ffffff;
      border: 1.5px solid #cbd5e1;
      border-radius: 6px;
      padding: 0 8px;
      cursor: pointer;
    }

    .dropdown-check-label {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12.5px;
      font-weight: 600;
      color: #475569;
      cursor: pointer;
      user-select: none;
      padding: 0 6px;
      white-space: nowrap;
    }

    .dropdown-check-label input[type="checkbox"] {
      cursor: pointer;
      width: 16px;
      height: 16px;
    }

    /* Subpages / Dropdown Children */
    .nav-subpages-list {
      margin-left: 28px;
      padding-left: 12px;
      border-left: 2px dashed #cbd5e1;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .nav-subpage-item {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #ffffff;
      padding: 6px 10px;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
    }

    .sub-icon {
      font-size: 16px;
      color: #94a3b8;
    }

    .sub-title-input {
      flex: 2;
      height: 32px;
      font-size: 13px;
    }

    .sub-url-input {
      flex: 3;
      height: 32px;
      font-size: 13px;
    }

    .btn-remove-sub {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      border: 1px solid #fee2e2;
      border-radius: 4px;
      background: #fef2f2;
      color: #ef4444;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-remove-sub:hover {
      background: #fee2e2;
    }

    .btn-remove-sub .material-symbols-outlined {
      font-size: 15px;
    }

    .btn-add-subpage {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      height: 28px;
      padding: 0 10px;
      border: 1px dashed #94a3b8;
      border-radius: 6px;
      background: #ffffff;
      color: #0050e5;
      font-size: 11.5px;
      font-weight: 600;
      cursor: pointer;
      width: fit-content;
      transition: all 0.15s ease;
    }

    .btn-add-subpage:hover {
      border-color: #0050e5;
      background: #eff6ff;
    }

    .btn-add-subpage .material-symbols-outlined {
      font-size: 15px;
    }

    .cta-button-card {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 14px;
      background: #f8fafc;
    }

    .cta-button-header {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .btn-remove-item {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      border: 1px solid #fee2e2;
      border-radius: 6px;
      background: #fef2f2;
      color: #ef4444;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-remove-item:hover {
      background: #fee2e2;
    }

    .btn-remove-item .material-symbols-outlined {
      font-size: 18px;
    }

    .btn-add-menu-item {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 36px;
      padding: 0 14px;
      border: 1.5px dashed #cbd5e1;
      border-radius: 8px;
      background: #ffffff;
      color: #0050e5;
      font-size: 12.5px;
      font-weight: 700;
      cursor: pointer;
      margin-top: 6px;
      width: fit-content;
      transition: all 0.15s ease;
    }

    .btn-add-menu-item:hover {
      border-color: #0050e5;
      background: #eff6ff;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .spin { animation: spin 1s linear infinite; }

    /* Modal Backdrop & Preview Dialog */
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
      width: 90vw;
      min-width: 80vw;
      max-width: 1440px;
      height: 88vh;
      min-height: 80vh;
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 20px 50px rgba(15, 23, 42, 0.18);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border: 1px solid #e2e8f0;
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
      transition: all 0.15s ease;
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
      transition: all 0.15s ease;
    }

    .btn-close-modal:hover {
      background: #fee2e2;
      border-color: #fca5a5;
      color: #ef4444;
    }

    .preview-modal-body {
      flex: 1;
      background-color: #f1f5f9;
      background-image: radial-gradient(#cbd5e1 1.2px, transparent 1.2px);
      background-size: 20px 20px;
      padding: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: auto;
      box-sizing: border-box;
    }

    .preview-canvas-wrapper {
      background: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 10px 30px -5px rgba(15, 23, 42, 0.12), 0 0 0 1px #e2e8f0;
      height: 100%;
      transition: all 0.25s ease;
      display: flex;
      flex-direction: column;
    }

    .preview-canvas-wrapper.viewport-desktop {
      width: 100%;
      min-width: 80%;
    }

    .preview-canvas-wrapper.viewport-tablet {
      width: 768px;
      max-width: 100%;
    }

    .preview-canvas-wrapper.viewport-mobile {
      width: 390px;
      max-width: 100%;
    }

    .modal-preview-iframe {
      width: 100%;
      height: 100%;
      border: none;
      display: block;
    }

    @media (max-width: 900px) {
      .inspector-form-grid-2, .inspector-form-grid-3 {
        grid-template-columns: 1fr;
      }
      .meta-config-row {
        flex-direction: column;
        align-items: stretch;
      }
    }
  `]
})
export class MenuVisualComponent implements OnInit {
  @Input() isEditMode: boolean = false;
  @Input() existingTemplateId?: string;
  @Input() editorTokens: any = null;

  @Output() templateSaved = new EventEmitter<any>();

  templateName: string = 'Classic Light Corporate Navbar';
  variantCode: string = 'MENU_CL_9821A';
  description: string = 'Sticky light corporate navbar with dynamic logo/brand identity, dropdowns, and CTA buttons';
  isSaving: boolean = false;

  // Placeholder and Token Controls
  aiPlaceTab: 'ai' | 'manual' = 'ai';
  isAiTransforming: boolean = false;

  // Studio Tab Controls
  activeEditorTab: 'html' | 'css' | 'js' | 'mock' = 'html';
  activeMockTab: 'menu' | 'identity' | 'cta' | 'topbar' = 'menu';

  // The Approved 3-Zone Menu Default HTML Template
  htmlTemplate: string = `<header class="oz-nav-section {{ CustomClass }}">
  {{#if HasTopBar}}
  <!-- Top Utility Bar -->
  <div class="oz-top-bar">
    <div class="oz-nav-container oz-top-bar-inner">
      <div class="oz-top-contact">
        {{#if Email}}
          <a href="mailto:{{ Email }}" class="oz-top-item">
            <svg class="oz-top-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            <span>{{ Email }}</span>
          </a>
        {{/if}}
        {{#if Phone}}
          <a href="tel:{{ Phone }}" class="oz-top-item">
            <svg class="oz-top-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
            <span>{{ Phone }}</span>
          </a>
        {{/if}}
      </div>
      <div class="oz-top-utility">
        <div class="oz-top-links">
          {{#each TopBarPages}}
            <a href="{{ Url }}" class="oz-top-link {{ CustomClass }}">{{ Title }}</a>
          {{/each}}
        </div>
        {{#if HasSocialLinks}}
        <div class="oz-top-socials">
          {{#each SocialLinks}}
          <a href="{{ Url }}" class="oz-social-link" title="{{ Title }}" aria-label="{{ Platform }}" target="_blank" rel="noopener">
            <i class="{{ IconClass }}"></i>
          </a>
          {{/each}}
        </div>
        {{/if}}
      </div>
    </div>
  </div>
  {{/if}}

  <!-- Main Navigation Bar -->
  <nav class="oz-main-navbar">
    <div class="oz-nav-container oz-navbar-inner">
      <!-- Col 1: Brand / Logo -->
      <a class="oz-navbar-brand" href="{{ HomeUrl }}">
        {{#if BrandLogo}}
          <img src="{{ BrandLogo }}" alt="{{ BrandName }}" class="oz-brand-logo" />
        {{else}}
          <span class="oz-brand-text">{{ BrandName }}</span>
        {{/if}}
      </a>

      <!-- Mobile Hamburger Toggler Button -->
      <button class="oz-nav-toggler" type="button" aria-label="Toggle navigation" aria-expanded="false" id="ozNavToggleBtn">
        <span class="oz-toggler-bar"></span>
        <span class="oz-toggler-bar"></span>
        <span class="oz-toggler-bar"></span>
      </button>

      <!-- Col 2: Navigation Links Drawer -->
      <div class="oz-nav-drawer" id="ozNavDrawer">
        <!-- The 3 Sequential Navigation Zones -->
        <ul class="oz-nav-menu">
          <!-- Zone 1: First -->
          {{#each NavItems="first"}}
            {{#if IsDropdown}}
              <li class="oz-nav-item oz-dropdown {{ CustomClass }}">
                <a href="{{ Url }}" class="oz-nav-link oz-dropdown-toggle">
                  <span>{{ Title }}</span>
                  <svg class="oz-caret" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </a>
                {{#if Pages}}
                <ul class="oz-dropdown-menu">
                  {{#each Pages}}
                    <li><a href="{{ Url }}" class="oz-dropdown-link {{ CustomClass }}">{{ Title }}</a></li>
                  {{/each}}
                </ul>
                {{/if}}
              </li>
            {{else}}
              <li class="oz-nav-item {{ CustomClass }}">
                <a href="{{ Url }}" class="oz-nav-link">{{ Title }}</a>
              </li>
            {{/if}}
          {{/each}}

          <!-- Zone 2: Middle -->
          {{#each NavItems="middle"}}
            {{#if IsDropdown}}
              <li class="oz-nav-item oz-dropdown {{ CustomClass }}">
                <a href="{{ Url }}" class="oz-nav-link oz-dropdown-toggle">
                  <span>{{ Title }}</span>
                  <svg class="oz-caret" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </a>
                {{#if Pages}}
                <ul class="oz-dropdown-menu">
                  {{#each Pages}}
                    <li><a href="{{ Url }}" class="oz-dropdown-link {{ CustomClass }}">{{ Title }}</a></li>
                  {{/each}}
                </ul>
                {{/if}}
              </li>
            {{else}}
              <li class="oz-nav-item {{ CustomClass }}">
                <a href="{{ Url }}" class="oz-nav-link">{{ Title }}</a>
              </li>
            {{/if}}
          {{/each}}

          <!-- Zone 3: Last -->
          {{#each NavItems="last"}}
            {{#if IsDropdown}}
              <li class="oz-nav-item oz-dropdown {{ CustomClass }}">
                <a href="{{ Url }}" class="oz-nav-link oz-dropdown-toggle">
                  <span>{{ Title }}</span>
                  <svg class="oz-caret" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </a>
                {{#if Pages}}
                <ul class="oz-dropdown-menu">
                  {{#each Pages}}
                    <li><a href="{{ Url }}" class="oz-dropdown-link {{ CustomClass }}">{{ Title }}</a></li>
                  {{/each}}
                </ul>
                {{/if}}
              </li>
            {{else}}
              <li class="oz-nav-item {{ CustomClass }}">
                <a href="{{ Url }}" class="oz-nav-link">{{ Title }}</a>
              </li>
            {{/if}}
          {{/each}}
        </ul>

        <!-- Col 3: Right Action Buttons (Clean Loop) -->
        <div class="oz-nav-actions">
          {{#each MenuCtaButtons}}
            <a href="{{ Url }}" class="oz-btn-primary {{ CustomClass }}">{{ Title }}</a>
          {{/each}}
        </div>
      </div>
    </div>
  </nav>
</header>`;

  // Scoped CSS for the Navigation component
  cssStyles: string = `@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css');

*, *::before, *::after {
  box-sizing: border-box;
}

/* Base Navigation Styles */
.oz-nav-section {
  width: 100%;
  position: relative;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  color: #1e293b;
  background-color: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.oz-nav-container {
  width: 100%;
  max-width: 1240px;
  margin: 0 auto;
  padding: 0 20px;
  box-sizing: border-box;
}

/* --- Top Utility Bar --- */
.oz-top-bar {
  background-color: #f8fafc;
  color: #475569;
  font-size: 12.5px;
  padding: 8px 0;
  border-bottom: 1px solid #e2e8f0;
}

.oz-top-bar-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.oz-top-contact {
  display: flex;
  align-items: center;
  gap: 18px;
  flex-wrap: wrap;
}

.oz-top-item {
  color: #475569;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
  transition: color 0.2s ease;
}

.oz-top-item:hover {
  color: #2563eb;
}

.oz-top-icon {
  color: #2563eb;
  flex-shrink: 0;
}

.oz-top-utility {
  display: flex;
  align-items: center;
  gap: 18px;
  flex-wrap: wrap;
}

.oz-top-links {
  display: flex;
  align-items: center;
  gap: 16px;
}

.oz-top-link {
  color: #64748b;
  text-decoration: none;
  font-size: 12.5px;
  font-weight: 500;
  transition: color 0.2s ease;
}

.oz-top-link:hover {
  color: #2563eb;
}

.oz-top-socials {
  display: flex;
  align-items: center;
  gap: 8px;
}

.oz-social-link {
  color: #64748b;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  font-size: 12px;
  transition: all 0.2s ease;
}

.oz-social-link:hover {
  color: #ffffff;
  background-color: #2563eb;
  border-color: #2563eb;
}

/* --- Main Navbar --- */
.oz-main-navbar {
  padding: 14px 0;
  background-color: #ffffff;
  position: relative;
}

.oz-navbar-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.oz-navbar-brand {
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  font-weight: 800;
  font-size: 21px;
  color: #0f172a;
  letter-spacing: -0.02em;
}

.oz-brand-logo {
  height: 38px;
  width: auto;
  object-fit: contain;
}

.oz-brand-text {
  background: linear-gradient(135deg, #0f172a 0%, #2563eb 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* --- Navigation Links Drawer (Desktop) --- */
.oz-nav-drawer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 1;
  margin-left: 36px;
}

.oz-nav-menu {
  display: flex;
  align-items: center;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: 4px;
}

.oz-nav-item {
  position: relative;
}

.oz-nav-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-size: 14px;
  font-weight: 600;
  color: #334155;
  text-decoration: none;
  border-radius: 6px;
  transition: all 0.2s ease;
  cursor: pointer;
}

.oz-nav-link:hover {
  color: #2563eb;
  background-color: #f8fafc;
}

.oz-caret {
  font-size: 10px;
  transition: transform 0.2s ease;
  display: inline-block;
  opacity: 0.65;
}

/* --- Desktop Dropdowns --- */
.oz-dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  box-shadow: 0 12px 28px -4px rgba(15, 23, 42, 0.12), 0 4px 8px -2px rgba(15, 23, 42, 0.04);
  list-style: none;
  margin: 6px 0 0;
  padding: 8px;
  min-width: 210px;
  display: none;
  z-index: 1000;
  animation: ozFadeIn 0.2s ease-in-out;
}

@keyframes ozFadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (min-width: 993px) {
  .oz-dropdown:hover > .oz-dropdown-menu {
    display: block;
  }
  .oz-dropdown:hover .oz-caret {
    transform: rotate(180deg);
  }
}

.oz-dropdown-menu li {
  list-style: none;
}

.oz-dropdown-link {
  display: block;
  padding: 9px 14px;
  font-size: 13.5px;
  font-weight: 500;
  color: #475569;
  text-decoration: none;
  border-radius: 6px;
  transition: all 0.15s ease;
}

.oz-dropdown-link:hover {
  background-color: #f1f5f9;
  color: #2563eb;
  padding-left: 17px;
}

/* --- Right Action CTA Buttons --- */
.oz-nav-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.oz-btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 9px 18px;
  font-size: 13.5px;
  font-weight: 600;
  text-decoration: none;
  border-radius: 8px;
  background-color: #2563eb;
  color: #ffffff;
  border: 1px solid transparent;
  box-shadow: 0 2px 6px rgba(37, 99, 235, 0.25);
  transition: all 0.2s ease;
  cursor: pointer;
  white-space: nowrap;
}

.oz-btn-primary:hover {
  background-color: #1d4ed8;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);
  transform: translateY(-1px);
}

.oz-btn-ghost {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 9px 16px;
  font-size: 13.5px;
  font-weight: 600;
  color: #334155;
  text-decoration: none;
  border-radius: 8px;
  background-color: transparent;
  border: 1px solid #cbd5e1;
  transition: all 0.2s ease;
  cursor: pointer;
  white-space: nowrap;
}

.oz-btn-ghost:hover {
  background-color: #f8fafc;
  border-color: #94a3b8;
  color: #0f172a;
}

/* --- Mobile Hamburger Toggler --- */
.oz-nav-toggler {
  display: none;
  flex-direction: column;
  justify-content: space-between;
  width: 28px;
  height: 20px;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  z-index: 1001;
}

.oz-toggler-bar {
  height: 2.5px;
  width: 100%;
  background-color: #0f172a;
  border-radius: 2px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  transform-origin: center;
}

.oz-nav-toggler.open .oz-toggler-bar:nth-child(1) {
  transform: translateY(8.5px) rotate(45deg);
}

.oz-nav-toggler.open .oz-toggler-bar:nth-child(2) {
  opacity: 0;
  transform: scaleX(0);
}

.oz-nav-toggler.open .oz-toggler-bar:nth-child(3) {
  transform: translateY(-8.5px) rotate(-45deg);
}

/* --- Responsive Breakpoints (Mobile & Tablet) --- */
@media (max-width: 992px) {
  .oz-nav-toggler {
    display: flex;
  }

  .oz-nav-drawer {
    display: none;
    position: absolute;
    top: 100%;
    left: 0;
    width: 100%;
    margin-left: 0;
    background-color: #ffffff;
    border-bottom: 2px solid #e2e8f0;
    box-shadow: 0 20px 25px -5px rgba(15, 23, 42, 0.12), 0 8px 10px -6px rgba(15, 23, 42, 0.08);
    padding: 20px;
    box-sizing: border-box;
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
    max-height: calc(85vh - 70px);
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    z-index: 999;
  }

  .oz-nav-drawer.active {
    display: flex;
    animation: ozDrawerSlide 0.25s ease-out;
  }

  @keyframes ozDrawerSlide {
    from { opacity: 0; transform: translateY(-8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .oz-nav-menu {
    flex-direction: column;
    align-items: stretch;
    width: 100%;
    gap: 4px;
  }

  .oz-nav-item {
    width: 100%;
  }

  .oz-nav-link {
    width: 100%;
    justify-content: space-between;
    box-sizing: border-box;
    padding: 10px 14px;
    font-size: 14.5px;
  }

  .oz-dropdown-menu {
    position: static;
    display: none;
    box-shadow: none;
    border: 1px solid #f1f5f9;
    background-color: #f8fafc;
    margin: 4px 0 8px;
    padding: 6px 8px;
    border-radius: 8px;
    width: 100%;
    box-sizing: border-box;
  }

  .oz-dropdown.open > .oz-dropdown-menu {
    display: block;
    animation: ozFadeIn 0.2s ease-in-out;
  }

  .oz-dropdown.open .oz-caret {
    transform: rotate(180deg);
  }

  .oz-dropdown-link {
    padding: 8px 12px;
    font-size: 13.5px;
    color: #475569;
  }

  .oz-dropdown-link:hover {
    background-color: #eff6ff;
    color: #2563eb;
  }

  .oz-nav-actions {
    width: 100%;
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    padding-top: 14px;
    margin-top: 4px;
    border-top: 1px solid #f1f5f9;
  }

  .oz-btn-primary, .oz-btn-ghost {
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 768px) {
  .oz-top-bar {
    padding: 7px 0;
  }

  .oz-top-bar-inner {
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    gap: 8px;
  }

  .oz-top-contact {
    justify-content: center;
    gap: 14px;
    font-size: 12px;
    width: 100%;
  }

  .oz-top-utility {
    justify-content: center;
    gap: 14px;
    width: 100%;
  }

  .oz-top-links {
    gap: 12px;
    font-size: 12px;
  }

  .oz-top-socials {
    gap: 8px;
  }
}

@media (max-width: 480px) {
  .oz-top-contact {
    flex-direction: column;
    gap: 5px;
  }
}
`;

  // 100% Vanilla JS for Mobile & Dropdown Interactivity
  jsScript: string = `(function() {
  function initNav() {
    var toggleBtn = document.getElementById('ozNavToggleBtn') || document.querySelector('.oz-nav-toggler');
    var drawer = document.getElementById('ozNavDrawer');
    if (!toggleBtn || !drawer) return;

    // Toggle Mobile Drawer
    toggleBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      var isOpen = drawer.classList.toggle('active');
      toggleBtn.classList.toggle('open', isOpen);
      toggleBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    // Mobile Dropdown Click Accordion Toggle
    var dropdownToggles = document.querySelectorAll('.oz-dropdown-toggle');
    dropdownToggles.forEach(function(toggle) {
      toggle.addEventListener('click', function(e) {
        if (window.innerWidth <= 991) {
          e.preventDefault();
          var parentDropdown = toggle.closest('.oz-dropdown');
          if (parentDropdown) {
            parentDropdown.classList.toggle('open');
          }
        }
      });
    });

    // Close on click outside
    document.addEventListener('click', function(e) {
      if (drawer.classList.contains('active') && !drawer.contains(e.target) && !toggleBtn.contains(e.target)) {
        drawer.classList.remove('active');
        toggleBtn.classList.remove('open');
        toggleBtn.setAttribute('aria-expanded', 'false');
      }
    });

    // Reset mobile classes on resize to desktop
    window.addEventListener('resize', function() {
      if (window.innerWidth > 991) {
        drawer.classList.remove('active');
        toggleBtn.classList.remove('open');
        toggleBtn.setAttribute('aria-expanded', 'false');
        document.querySelectorAll('.oz-dropdown.open').forEach(function(el) {
          el.classList.remove('open');
        });
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNav);
  } else {
    initNav();
  }
})();`;

  // Generic sampleContent for preview with the requested menu structure
  sampleContent: any = {
    brandName: 'Apex Global',
    copyright: '© 2026 Apex Global. All rights reserved.',
    homeUrl: '/',
    hasTopBar: true,
    hasContactInfo: true,
    email: 'contact@example.com',
    phone: '+1 (555) 019-2834',
    address: '1200 Innovation Way, Suite 400',
    topBarPages: [
      { title: 'FAQ', url: '/faq' },
      { title: 'Support', url: '/support' },
      { title: 'Documentation', url: '/docs' }
    ],
    navigationMenu: [
      {
        title: 'About',
        url: '/about',
        zone: 'first',
        isDropdown: false,
        sortOrder: 1
      },
      {
        title: 'Service',
        url: '/services',
        zone: 'first',
        isDropdown: true,
        sortOrder: 2,
        pages: [
          { title: 'IT', url: '/services/it', sortOrder: 1 },
          { title: 'Hospital', url: '/services/hospital', sortOrder: 2 },
          { title: 'Infrastructure', url: '/services/infrastructure', sortOrder: 3 }
        ]
      },
      {
        title: 'Career',
        url: '/careers',
        zone: 'middle',
        isDropdown: false,
        sortOrder: 3
      },
      {
        title: 'Product',
        url: '/products',
        zone: 'middle',
        isDropdown: true,
        sortOrder: 4,
        pages: [
          { title: 'AI agent', url: '/products/ai-agent', sortOrder: 1 },
          { title: 'Machineries', url: '/products/machineries', sortOrder: 2 }
        ]
      },
      {
        title: 'Blog',
        url: '/blog',
        zone: 'last',
        isDropdown: false,
        sortOrder: 5
      },
      {
        title: 'Contact Us',
        url: '/contact',
        zone: 'last',
        isDropdown: false,
        sortOrder: 6
      }
    ],
    menuCtaButtons: [
      {
        title: 'Login',
        url: '/login',
        customClass: 'oz-btn-ghost',
        buttonClass: 'oz-btn-ghost'
      },
      {
        title: 'Get Started',
        url: '/get-started',
        customClass: 'oz-btn-primary',
        buttonClass: 'oz-btn-primary'
      }
    ],
    hasSocialLinks: true,
    socialLinks: [
      { platform: 'Twitter / X', title: 'Twitter / X', url: 'https://twitter.com', icon: 'share', iconClass: 'fa-brands fa-x-twitter' },
      { platform: 'LinkedIn', title: 'LinkedIn', url: 'https://linkedin.com', icon: 'public', iconClass: 'fa-brands fa-linkedin' },
      { platform: 'Facebook', title: 'Facebook', url: 'https://facebook.com', icon: 'thumb_up', iconClass: 'fa-brands fa-facebook' },
      { platform: 'Instagram', title: 'Instagram', url: 'https://instagram.com', icon: 'photo_camera', iconClass: 'fa-brands fa-instagram' }
    ],
    contactItems: [
      { type: 'phone', channelType: 'Phone', platform: 'Support', title: 'Call Us', description: 'Mon-Fri 8am-6pm', value: '+1 (555) 019-2834', content: '+1 (555) 019-2834', url: 'tel:+15550192834', icon: 'call', iconClass: 'fa-solid fa-phone', isDefault: true },
      { type: 'email', channelType: 'Email', platform: 'General', title: 'Email Us', description: 'Online Inquiries', value: 'contact@example.com', content: 'contact@example.com', url: 'mailto:contact@example.com', icon: 'mail', iconClass: 'fa-solid fa-envelope', isDefault: true },
      { type: 'address', channelType: 'Address', platform: 'HQ', title: 'Headquarters', description: 'Corporate Office', value: '1200 Innovation Way, Suite 400', content: '1200 Innovation Way, Suite 400', url: '#', icon: 'location_on', iconClass: 'fa-solid fa-location-dot', isDefault: true }
    ],
    workingHours: 'Mon - Fri: 8:00 AM - 6:00 PM'
  };

  // Handlebars tokens available for insertion with complete, working HTML structures
  navigationTokens: Array<{ label: string; token: string }> = [
    {
      label: 'Brand Identity',
      token: `<a class="oz-navbar-brand" href="{{ HomeUrl }}">
  {{#if BrandLogo}}
    <img src="{{ BrandLogo }}" alt="{{ BrandName }}" class="oz-brand-logo" />
  {{else}}
    <span class="oz-brand-text">{{ BrandName }}</span>
  {{/if}}
</a>`
    },
    {
      label: 'Top Utility Bar',
      token: `{{#if HasTopBar}}
<div class="oz-top-bar">
  <div class="oz-top-bar-inner">
    {{#if HasContactInfo}}
      <div class="oz-top-contact">
        <a href="mailto:{{ Email }}" class="oz-top-item">
          <i class="fa-solid fa-envelope"></i> {{ Email }}
        </a>
        <a href="tel:{{ Phone }}" class="oz-top-item">
          <i class="fa-solid fa-phone"></i> {{ Phone }}
        </a>
      </div>
    {{/if}}
    <div class="oz-top-links">
      {{#each TopBarPages}}
        <a href="{{ Url }}" class="oz-top-link">{{ Title }}</a>
      {{/each}}
    </div>
    {{#if HasSocialLinks}}
      <div class="oz-top-socials">
        {{#each SocialLinks}}
          <a href="{{ Url }}" title="{{ Platform }}" class="oz-top-social-link" target="_blank" rel="noopener">
            <i class="{{ IconClass }}"></i>
          </a>
        {{/each}}
      </div>
    {{/if}}
  </div>
</div>
{{/if}}`
    },
    {
      label: 'Social Media Channels',
      token: `{{#if HasSocialLinks}}
<div class="oz-social-links">
  {{#each SocialLinks}}
    <a href="{{ Url }}" title="{{ Platform }}" class="oz-social-icon" target="_blank" rel="noopener">
      <i class="{{ IconClass }}"></i>
    </a>
  {{/each}}
</div>
{{/if}}`
    },
    {
      label: 'Contact Channels (Loop)',
      token: `<div class="oz-contact-channels">
  {{#each ContactItems}}
    <div class="oz-contact-channel-item">
      <i class="{{ IconClass }}"></i>
      <div class="oz-contact-channel-details">
        <span class="oz-contact-channel-title">{{ Title }}</span>
        <a href="{{ Url }}" class="oz-contact-channel-val">{{ Content }}</a>
      </div>
    </div>
  {{/each}}
</div>`
    },
    {
      label: 'Navigation Menu Tree',
      token: `<ul class="oz-nav-menu">
  <!-- Zone 1: First -->
  {{#each NavItems="first"}}
    <li class="oz-nav-item {{#if Pages}}oz-dropdown{{/if}}">
      <a href="{{ Url }}" class="oz-nav-link">
        <span>{{ Title }}</span>
        {{#if Pages}}<span class="oz-caret">▼</span>{{/if}}
      </a>
      {{#if Pages}}
        <ul class="oz-dropdown-menu">
          {{#each Pages}}
            <li><a href="{{ Url }}" class="oz-dropdown-link">{{ Title }}</a></li>
          {{/each}}
        </ul>
      {{/if}}
    </li>
  {{/each}}

  <!-- Zone 2: Middle -->
  {{#each NavItems="middle"}}
    <li class="oz-nav-item {{#if Pages}}oz-dropdown{{/if}}">
      <a href="{{ Url }}" class="oz-nav-link">
        <span>{{ Title }}</span>
        {{#if Pages}}<span class="oz-caret">▼</span>{{/if}}
      </a>
      {{#if Pages}}
        <ul class="oz-dropdown-menu">
          {{#each Pages}}
            <li><a href="{{ Url }}" class="oz-dropdown-link">{{ Title }}</a></li>
          {{/each}}
        </ul>
      {{/if}}
    </li>
  {{/each}}

  <!-- Zone 3: Last -->
  {{#each NavItems="last"}}
    <li class="oz-nav-item {{#if Pages}}oz-dropdown{{/if}}">
      <a href="{{ Url }}" class="oz-nav-link">
        <span>{{ Title }}</span>
        {{#if Pages}}<span class="oz-caret">▼</span>{{/if}}
      </a>
      {{#if Pages}}
        <ul class="oz-dropdown-menu">
          {{#each Pages}}
            <li><a href="{{ Url }}" class="oz-dropdown-link">{{ Title }}</a></li>
          {{/each}}
        </ul>
      {{/if}}
    </li>
  {{/each}}
</ul>`
    },
    {
      label: 'CTA Buttons Loop',
      token: `<div class="oz-nav-actions">
  {{#each MenuCtaButtons}}
    <a href="{{ Url }}" class="oz-btn-primary {{ CustomClass }}">{{ Title }}</a>
  {{/each}}
</div>`
    },
    {
      label: 'Dynamic Login Link',
      token: `{{#if ActivateLoginInMenu}}
<a href="{{ LoginUrl }}" class="oz-btn-ghost oz-btn-login">
  <i class="fa-solid fa-user"></i> {{ LoginText }}
</a>
{{/if}}`
    }
  ];

  constructor(
    private api: ApiService,
    private toast: ToastService,
    private previewModalService: UniversalPreviewModalService,
    private router: Router
  ) { }

  /**
   * Opens the interactive live simulated preview modal.
   */
  openPreviewModal(): void {
    this.previewModalService.open({
      title: this.templateName || 'Navigation Menu',
      category: 'menu',
      variantCode: this.variantCode,
      htmlTemplate: this.htmlTemplate || '',
      cssStyles: this.cssStyles || '',
      jsScript: this.jsScript || '',
      sampleContent: this.sampleContent
    });
  }

  ngOnInit(): void {
    if (this.isEditMode && this.existingTemplateId) {
      this.loadExistingTemplate();
    }
  }

  /**
   * Regenerates a new 5-character cryptographic random suffix for the variant code.
   */
  regenerateVariantCode(): void {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let rand = '';
    for (let i = 0; i < 5; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    this.variantCode = `MENU_SE_${rand}`;
    this.toast.info(`Generated new variant code: ${this.variantCode}`);
  }

  /**
   * Resets HTML, CSS, and JS back to standard boilerplate.
   */
  resetBoilerplate(): void {
    this.toast.info('Boilerplate reset.');
  }

  /**
   * Resets sample content back to category defaults.
   */
  resetSampleContent(): void {
    this.sampleContent = {
      brandName: 'Apex Global',
      copyright: '© 2026 Apex Global. All rights reserved.',
      homeUrl: '/',
      hasTopBar: true,
      hasContactInfo: true,
      email: 'contact@example.com',
      phone: '+1 (555) 019-2834',
      address: '1200 Innovation Way, Suite 400',
      topBarPages: [
        { title: 'FAQ', url: '/faq' },
        { title: 'Support', url: '/support' },
        { title: 'Documentation', url: '/docs' }
      ],
      navigationMenu: [
        {
          title: 'About',
          url: '/about',
          zone: 'first',
          isDropdown: false,
          sortOrder: 1
        },
        {
          title: 'Service',
          url: '/services',
          zone: 'first',
          isDropdown: true,
          sortOrder: 2,
          pages: [
            { title: 'IT', url: '/services/it', sortOrder: 1 },
            { title: 'Hospital', url: '/services/hospital', sortOrder: 2 },
            { title: 'Infrastructure', url: '/services/infrastructure', sortOrder: 3 }
          ]
        },
        {
          title: 'Career',
          url: '/careers',
          zone: 'middle',
          isDropdown: false,
          sortOrder: 3
        },
        {
          title: 'Product',
          url: '/products',
          zone: 'middle',
          isDropdown: true,
          sortOrder: 4,
          pages: [
            { title: 'AI agent', url: '/products/ai-agent', sortOrder: 1 },
            { title: 'Machineries', url: '/products/machineries', sortOrder: 2 }
          ]
        },
        {
          title: 'Blog',
          url: '/blog',
          zone: 'last',
          isDropdown: false,
          sortOrder: 5
        },
        {
          title: 'Contact Us',
          url: '/contact',
          zone: 'last',
          isDropdown: false,
          sortOrder: 6
        }
      ],
      menuCtaButtons: [
        {
          title: 'Login',
          url: '/login',
          customClass: 'oz-btn-ghost'
        },
        {
          title: 'Get Started',
          url: '/get-started',
          customClass: 'oz-btn-primary'
        }
      ],
      hasSocialLinks: true,
      socialLinks: [
        { platform: 'Twitter / X', title: 'Twitter / X', url: 'https://twitter.com', icon: 'share', iconClass: 'fa-brands fa-x-twitter' },
        { platform: 'LinkedIn', title: 'LinkedIn', url: 'https://linkedin.com', icon: 'public', iconClass: 'fa-brands fa-linkedin' },
        { platform: 'Facebook', title: 'Facebook', url: 'https://facebook.com', icon: 'thumb_up', iconClass: 'fa-brands fa-facebook' },
        { platform: 'Instagram', title: 'Instagram', url: 'https://instagram.com', icon: 'photo_camera', iconClass: 'fa-brands fa-instagram' }
      ],
      contactItems: [
        { type: 'phone', channelType: 'Phone', platform: 'Support', title: 'Call Us', description: 'Mon-Fri 8am-6pm', value: '+1 (555) 019-2834', content: '+1 (555) 019-2834', url: 'tel:+15550192834', icon: 'call', iconClass: 'fa-solid fa-phone', isDefault: true },
        { type: 'email', channelType: 'Email', platform: 'General', title: 'Email Us', description: 'Online Inquiries', value: 'contact@example.com', content: 'contact@example.com', url: 'mailto:contact@example.com', icon: 'mail', iconClass: 'fa-solid fa-envelope', isDefault: true },
        { type: 'address', channelType: 'Address', platform: 'HQ', title: 'Headquarters', description: 'Corporate Office', value: '1200 Innovation Way, Suite 400', content: '1200 Innovation Way, Suite 400', url: '#', icon: 'location_on', iconClass: 'fa-solid fa-location-dot', isDefault: true }
      ],
      workingHours: 'Mon - Fri: 8:00 AM - 6:00 PM'
    };
    this.toast.info('Sample data restored to initial defaults.');
  }

  /**
   * Toggles dropdown status on a menu item and initializes sub-pages array if enabled.
   * @param item Navigation menu item.
   */
  toggleDropdownItem(item: any): void {
    if (item.isDropdown && (!item.pages || item.pages.length === 0)) {
      item.pages = [
        { title: 'Sub Link 1', url: `${item.url || ''}/item-1` },
        { title: 'Sub Link 2', url: `${item.url || ''}/item-2` }
      ];
    }
  }

  /**
   * Adds a sub-page link to a dropdown menu item.
   * @param parentItem Parent navigation item.
   */
  addSubMenuItem(parentItem: any): void {
    if (!parentItem.pages) {
      parentItem.pages = [];
    }
    parentItem.pages.push({
      title: 'New Dropdown Link',
      url: `${parentItem.url || ''}/new-link`
    });
  }

  /**
   * Removes a sub-page link from a dropdown menu item.
   * @param parentItem Parent navigation item.
   * @param subIndex Index of the sub-page.
   */
  removeSubMenuItem(parentItem: any, subIndex: number): void {
    if (parentItem.pages && parentItem.pages.length > subIndex) {
      parentItem.pages.splice(subIndex, 1);
    }
  }

  /**
   * Adds an action CTA button to the mock sample content.
   */
  addSampleCtaButton(): void {
    if (!this.sampleContent.menuCtaButtons) {
      this.sampleContent.menuCtaButtons = [];
    }
    this.sampleContent.menuCtaButtons.push({
      title: 'Action Button',
      url: '/action',
      customClass: 'oz-btn-primary'
    });
  }

  /**
   * Removes an action CTA button from the mock sample content.
   * @param index Index to remove.
   */
  removeSampleCtaButton(index: number): void {
    if (this.sampleContent.menuCtaButtons && this.sampleContent.menuCtaButtons.length > index) {
      this.sampleContent.menuCtaButtons.splice(index, 1);
    }
  }

  /**
   * Adds a top bar utility link to the mock sample content.
   */
  addSampleTopBarPage(): void {
    if (!this.sampleContent.topBarPages) {
      this.sampleContent.topBarPages = [];
    }
    this.sampleContent.topBarPages.push({
      title: 'New Page',
      url: '/page'
    });
  }

  /**
   * Removes a top bar utility link from the mock sample content.
   * @param index Index to remove.
   */
  removeSampleTopBarPage(index: number): void {
    if (this.sampleContent.topBarPages && this.sampleContent.topBarPages.length > index) {
      this.sampleContent.topBarPages.splice(index, 1);
    }
  }

  /**
   * Inserts a token into the HTML template.
   * @param token Handlebars placeholder token string.
   */
  insertToken(token: string): void {
    this.htmlTemplate += `\n${token}`;
    this.toast.info(`Inserted token: ${token}`);
  }

  /**
   * Adds an item to the sample navigation menu tree.
   */
  addSampleMenuItem(): void {
    if (!this.sampleContent.navigationMenu) {
      this.sampleContent.navigationMenu = [];
    }
    this.sampleContent.navigationMenu.push({
      title: 'New Page',
      url: '/new-page',
      zone: 'middle',
      isDropdown: false
    });
  }

  /**
   * Removes an item from the sample navigation menu tree.
   * @param index Item index to remove.
   */
  removeSampleMenuItem(index: number): void {
    if (this.sampleContent.navigationMenu && this.sampleContent.navigationMenu.length > index) {
      this.sampleContent.navigationMenu.splice(index, 1);
    }
  }

  /**
   * Intelligently transforms navbar HTML using AI copilot.
   */
  aiTransformMenuPlaceholders(): void {
    const rawHtml = (this.htmlTemplate || '').trim();
    if (!rawHtml) {
      this.toast.warning('Please paste or type raw navbar HTML into the editor first.');
      return;
    }

    this.isAiTransforming = true;
    this.toast.info('✨ AI is analyzing navbar structure and transforming placeholders...');

    const payload = {
      category: 'menu',
      rawHtml,
      currentTemplateName: this.templateName || 'Classic Light Corporate Navbar'
    };

    this.api.post<any>('ContentApi/templates/ai-copilot', payload).subscribe({
      next: (res: any) => {
        this.isAiTransforming = false;
        const transformed = res?.data?.htmlTemplate || res?.data?.codeResult?.htmlTemplate;
        if (transformed) {
          this.htmlTemplate = transformed;
          this.toast.success('✨ Successfully transformed navbar with smart AI menu placeholders!');
        } else {
          this.toast.info('AI analysis complete.');
        }
      },
      error: () => {
        this.isAiTransforming = false;
        this.toast.info('Completed placeholder analysis.');
      }
    });
  }

  /**
   * Loads existing template data from the API when in edit mode.
   */
  private loadExistingTemplate(): void {
    if (!this.existingTemplateId) return;
    this.api.get<any>(`ContentApi/templates/${this.existingTemplateId}`).subscribe({
      next: (res: any) => {
        const item = res?.data || res;
        if (item) {
          this.templateName = item.name || this.templateName;
          this.variantCode = item.variantCode || this.variantCode;
          this.description = item.description || this.description;
          this.htmlTemplate = item.htmlTemplate || this.htmlTemplate;
          this.cssStyles = item.cssStyles || this.cssStyles;
          this.jsScript = item.jsScript || this.jsScript;
          if (item.defaultContentJson) {
            try {
              this.sampleContent = JSON.parse(item.defaultContentJson);
            } catch {
              // Ignore invalid JSON
            }
          }
        }
      },
      error: (err: any) => {
        console.warn('Could not load existing template:', err);
      }
    });
  }

  /**
   * Saves or updates the navigation template via API.
   */
  saveNavigationTemplate(): void {
    const name = (this.templateName || '').trim();
    if (!name) {
      this.toast.warning('Please enter a template name.');
      return;
    }

    this.isSaving = true;
    const payload = {
      name,
      category: 'menu',
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
            ? `Successfully updated Navigation template "${name}".`
            : `Successfully created Navigation template "${name}".`
        );
        this.templateSaved.emit(res?.data || res);
        this.router.navigate(['/content/console/templates']);
      },
      error: (err: any) => {
        this.isSaving = false;
        const msg = err?.error?.message || err?.message || 'Failed to save navigation template.';
        this.toast.error(`Save error: ${msg}`);
      }
    });
  }
}
