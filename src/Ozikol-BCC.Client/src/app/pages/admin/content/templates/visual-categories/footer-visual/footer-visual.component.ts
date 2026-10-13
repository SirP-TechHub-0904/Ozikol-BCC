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

          <!-- Mock Data Sub-Tabs: Navigation Columns, Quick & Legal Links, Brand Identity, Contact & Social -->
          <div class="mock-tabs-nav">
            <button
              type="button"
              class="mock-tab-btn"
              [class.active]="activeMockTab === 'columns'"
              (click)="activeMockTab = 'columns'"
            >
              <span class="material-symbols-outlined icon-micro">view_column</span>
              <span>Navigation Columns &amp; Links</span>
              <span class="mock-tab-badge">{{ (sampleContent.footerCategories?.length || 0) }}</span>
            </button>
            <button
              type="button"
              class="mock-tab-btn"
              [class.active]="activeMockTab === 'links'"
              (click)="activeMockTab = 'links'"
            >
              <span class="material-symbols-outlined icon-micro">link</span>
              <span>Quick &amp; Legal Links</span>
              <span class="mock-tab-badge">{{ (sampleContent.taggedPages?.quicklinks?.length || 0) + (sampleContent.legalPages?.length || 0) }}</span>
            </button>
            <button
              type="button"
              class="mock-tab-btn"
              [class.active]="activeMockTab === 'brand'"
              (click)="activeMockTab = 'brand'"
            >
              <span class="material-symbols-outlined icon-micro">corporate_fare</span>
              <span>Brand &amp; Identity</span>
            </button>
            <button
              type="button"
              class="mock-tab-btn"
              [class.active]="activeMockTab === 'contact'"
              (click)="activeMockTab = 'contact'"
            >
              <span class="material-symbols-outlined icon-micro">contact_phone</span>
              <span>Contact &amp; Social</span>
              <span class="mock-tab-badge">{{ (sampleContent.contactItems?.length || 0) + (sampleContent.socialLinks?.length || 0) }}</span>
            </button>
          </div>

          <!-- Sub-Tab 1: Navigation Columns & Nested Links (Default) -->
          <div class="mock-tab-pane" *ngIf="activeMockTab === 'columns'">
            <div class="nav-tree-container">
              <div class="nav-parent-card" *ngFor="let col of (sampleContent.footerCategories || []); let cIdx = index">
                <div class="nav-parent-header">
                  <span class="material-symbols-outlined nav-item-icon">folder_open</span>
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

                <!-- Nested Column Links (Pages) -->
                <div class="nav-subpages-list">
                  <div class="nav-subpage-item" *ngFor="let page of (col.pages || []); let pIdx = index">
                    <span class="material-symbols-outlined sub-icon">subdirectory_arrow_right</span>
                    <input
                      type="text"
                      [(ngModel)]="page.title"
                      class="form-control inspector-input sub-title-input"
                      placeholder="e.g. Page Title"
                    />
                    <input
                      type="text"
                      [(ngModel)]="page.url"
                      class="form-control inspector-input sub-url-input"
                      placeholder="e.g. /page-url"
                    />
                    <button type="button" class="btn-remove-sub" (click)="removeFooterColumnPage(col, pIdx)" title="Remove link">
                      <span class="material-symbols-outlined">close</span>
                    </button>
                  </div>
                  <button type="button" class="btn-add-subpage" (click)="addFooterColumnPage(col)">
                    <span class="material-symbols-outlined">add</span>
                    <span>Add Link to {{ col.title || 'Column' }}</span>
                  </button>
                </div>
              </div>

              <button type="button" class="btn-add-item" (click)="addFooterCategory()">
                <span class="material-symbols-outlined">add</span>
                <span>Add Navigation Column</span>
              </button>
            </div>
          </div>

          <!-- Sub-Tab 2: Quick Links & Legal Compliance Pages -->
          <div class="mock-tab-pane" *ngIf="activeMockTab === 'links'">
            <!-- Quick Links (Tagged Pages) Section -->
            <div class="inspector-section-block">
              <div class="section-block-header">
                <div>
                  <h4 class="section-block-title">Quick Links (Tagged Pages)</h4>
                  <p class="section-block-desc">Mock pages rendered by <code [innerText]="'{{#each TaggedPages &quot;quicklinks&quot;}}'"></code></p>
                </div>
                <button type="button" class="btn-add-subpage" (click)="addQuickLink()">
                  <span class="material-symbols-outlined">add</span>
                  <span>Add Quick Link</span>
                </button>
              </div>
              <div class="repeater-simple-list">
                <div class="nav-subpage-item" *ngFor="let qk of (sampleContent.taggedPages?.quicklinks || []); let qIdx = index">
                  <span class="material-symbols-outlined sub-icon">bookmark</span>
                  <input
                    type="text"
                    [(ngModel)]="qk.title"
                    class="form-control inspector-input sub-title-input"
                    placeholder="e.g. Link Title"
                  />
                  <input
                    type="text"
                    [(ngModel)]="qk.url"
                    class="form-control inspector-input sub-url-input"
                    placeholder="e.g. /url"
                  />
                  <button type="button" class="btn-remove-sub" (click)="removeQuickLink(qIdx)" title="Remove Quick Link">
                    <span class="material-symbols-outlined">close</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Legal Compliance Pages Section -->
            <div class="inspector-section-block" style="margin-top: 24px;">
              <div class="section-block-header">
                <div>
                  <h4 class="section-block-title">Legal &amp; Compliance Pages</h4>
                  <p class="section-block-desc">Mock policy links rendered by <code [innerText]="'{{#each LegalPages}}'"></code></p>
                </div>
                <button type="button" class="btn-add-subpage" (click)="addLegalPage()">
                  <span class="material-symbols-outlined">add</span>
                  <span>Add Legal Policy</span>
                </button>
              </div>
              <div class="repeater-simple-list">
                <div class="nav-subpage-item" *ngFor="let lp of (sampleContent.legalPages || []); let lIdx = index">
                  <span class="material-symbols-outlined sub-icon">gavel</span>
                  <input
                    type="text"
                    [(ngModel)]="lp.title"
                    class="form-control inspector-input sub-title-input"
                    placeholder="e.g. Privacy Policy"
                  />
                  <input
                    type="text"
                    [(ngModel)]="lp.url"
                    class="form-control inspector-input sub-url-input"
                    placeholder="e.g. /privacy-policy"
                  />
                  <button type="button" class="btn-remove-sub" (click)="removeLegalPage(lIdx)" title="Remove Policy">
                    <span class="material-symbols-outlined">close</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Sub-Tab 3: Brand Identity & Narrative -->
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
                  <span>Brand Logo URL</span>
                  <code [innerText]="'{{ BrandLogo }}'"></code>
                </label>
                <input
                  type="text"
                  [(ngModel)]="sampleContent.brandLogo"
                  class="form-control inspector-input"
                  placeholder="e.g. https://... or leave blank for text logo"
                />
              </div>

              <div class="form-group">
                <label class="field-label">
                  <span>Home Page URL</span>
                  <code [innerText]="'{{ HomeUrl }}'"></code>
                </label>
                <input
                  type="text"
                  [(ngModel)]="sampleContent.homeUrl"
                  class="form-control inspector-input"
                  placeholder="e.g. /"
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
            </div>
          </div>

          <!-- Sub-Tab 4: Contact Touchpoints & Social Media -->
          <div class="mock-tab-pane" *ngIf="activeMockTab === 'contact'">
            <div class="inspector-form-grid-2">
              <div class="form-group">
                <label class="field-label">
                  <span>Working / Business Hours</span>
                  <code [innerText]="'{{ WorkingHours }}'"></code>
                </label>
                <input
                  type="text"
                  [(ngModel)]="sampleContent.workingHours"
                  class="form-control inspector-input"
                  placeholder="e.g. Mon - Fri: 8:00 AM - 6:00 PM"
                />
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

              <div class="form-group">
                <label class="field-label">
                  <span>Corporate Address</span>
                  <code [innerText]="'{{ Address }}'"></code>
                </label>
                <input
                  type="text"
                  [(ngModel)]="sampleContent.address"
                  class="form-control inspector-input"
                  placeholder="e.g. 100 Enterprise Boulevard, Suite 500"
                />
              </div>
            </div>

            <!-- Structured Contact Items -->
            <div class="inspector-section-block" style="margin-top: 24px;">
              <div class="section-block-header">
                <div>
                  <h4 class="section-block-title">Contact Channels &amp; Cards ({{ (sampleContent.contactItems?.length || 0) }})</h4>
                  <p class="section-block-desc">Mock channels rendered by <code [innerText]="'{{#each ContactItems}}'"></code></p>
                </div>
                <button type="button" class="btn-add-subpage" (click)="addContactItem()">
                  <span class="material-symbols-outlined">add</span>
                  <span>Add Contact Channel</span>
                </button>
              </div>
              <div class="repeater-simple-list">
                <div class="contact-channel-card" *ngFor="let item of (sampleContent.contactItems || []); let cIdx = index">
                  <div class="contact-channel-grid">
                    <input
                      type="text"
                      [(ngModel)]="item.title"
                      class="form-control inspector-input"
                      placeholder="Title (e.g. Call Us)"
                    />
                    <input
                      type="text"
                      [(ngModel)]="item.content"
                      (ngModelChange)="item.value = item.content"
                      class="form-control inspector-input"
                      placeholder="Content / Value"
                    />
                    <input
                      type="text"
                      [(ngModel)]="item.url"
                      class="form-control inspector-input"
                      placeholder="Link (e.g. tel:... or mailto:...)"
                    />
                    <input
                      type="text"
                      [(ngModel)]="item.iconClass"
                      class="form-control inspector-input"
                      placeholder="Icon (e.g. fa-solid fa-phone)"
                    />
                    <button type="button" class="btn-remove-sub" (click)="removeContactItem(cIdx)" title="Remove Channel">
                      <span class="material-symbols-outlined">close</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Social Media Channels -->
            <div class="inspector-section-block" style="margin-top: 24px;">
              <div class="section-block-header">
                <div>
                  <h4 class="section-block-title">Social Media Links ({{ (sampleContent.socialLinks?.length || 0) }})</h4>
                  <p class="section-block-desc">Mock channels rendered by <code [innerText]="'{{#each SocialLinks}}'"></code></p>
                </div>
                <button type="button" class="btn-add-subpage" (click)="addSocialLink()">
                  <span class="material-symbols-outlined">add</span>
                  <span>Add Social Channel</span>
                </button>
              </div>
              <div class="repeater-simple-list">
                <div class="social-channel-card" *ngFor="let soc of (sampleContent.socialLinks || []); let sIdx = index">
                  <div class="social-channel-grid">
                    <input
                      type="text"
                      [(ngModel)]="soc.platform"
                      (ngModelChange)="soc.title = soc.platform"
                      class="form-control inspector-input"
                      placeholder="Platform (e.g. Twitter / X)"
                    />
                    <input
                      type="text"
                      [(ngModel)]="soc.url"
                      class="form-control inspector-input"
                      placeholder="Profile URL"
                    />
                    <input
                      type="text"
                      [(ngModel)]="soc.iconClass"
                      class="form-control inspector-input"
                      placeholder="Icon (e.g. fa-brands fa-x-twitter)"
                    />
                    <button type="button" class="btn-remove-sub" (click)="removeSocialLink(sIdx)" title="Remove Social Link">
                      <span class="material-symbols-outlined">close</span>
                    </button>
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

    /* Subpages / Nested Column Links */
    .nav-subpages-list {
      margin-left: 28px;
      margin-top: 10px;
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
      flex-shrink: 0;
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

    .inspector-section-block {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 16px;
    }

    .section-block-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 12px;
      flex-wrap: wrap;
    }

    .section-block-title {
      font-size: 13.5px;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }

    .section-block-desc {
      font-size: 11.5px;
      color: #64748b;
      margin: 2px 0 0 0;
    }

    .section-block-desc code {
      background: #e2e8f0;
      padding: 1px 4px;
      border-radius: 4px;
      font-size: 11px;
      color: #0050e5;
    }

    .repeater-simple-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .contact-channel-card, .social-channel-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px 10px;
    }

    .contact-channel-grid {
      display: grid;
      grid-template-columns: 1.5fr 2fr 2fr 1.5fr auto;
      gap: 8px;
      align-items: center;
    }

    .social-channel-grid {
      display: grid;
      grid-template-columns: 2fr 3fr 2fr auto;
      gap: 8px;
      align-items: center;
    }

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
  activeMockTab: 'columns' | 'links' | 'brand' | 'contact' = 'columns';

  htmlTemplate: string = '';
  cssStyles: string = '';
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

  sampleContent: any = {};

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
    } else {
      this.loadBlueprint();
    }
  }

  regenerateVariantCode(): void {
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
    this.variantCode = `FOOTER_${randomSuffix}`;
  }

  /**
   * Loads the factory default footer blueprint (template.html, styles.css, script.js, sample-content.json)
   * directly from central blueprint files. Eliminates inline strings from TypeScript.
   */
  loadBlueprint(forceReload: boolean = false, toastSuccess?: string): void {
    const url = forceReload ? 'ContentApi/templates/blueprint/footer?reload=true' : 'ContentApi/templates/blueprint/footer';
    this.api.get<any>(url).subscribe({
      next: (res) => {
        const bp = res?.data || res;
        if (bp) {
          this.htmlTemplate = bp.htmlTemplate || '';
          this.cssStyles = bp.cssStyles || '';
          this.jsScript = bp.jsScript || '';
          if (bp.sampleContent) {
            this.sampleContent = bp.sampleContent;
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
        // Fallback: fetch directly from public blueprint files in client web root
        this.loadStaticBlueprintFallback(toastSuccess);
      }
    });
  }

  private loadStaticBlueprintFallback(toastSuccess?: string): void {
    Promise.all([
      fetch('/blueprints/footer/template.html').then(r => r.text()),
      fetch('/blueprints/footer/styles.css').then(r => r.text()),
      fetch('/blueprints/footer/script.js').then(r => r.text()).catch(() => ''),
      fetch('/blueprints/footer/sample-content.json').then(r => r.json()).catch(() => ({}))
    ]).then(([html, css, js, json]) => {
      this.htmlTemplate = html || '';
      this.cssStyles = css || '';
      this.jsScript = js || '';
      if (json && Object.keys(json).length > 0) {
        this.sampleContent = json;
      }
      if (toastSuccess) {
        this.toast.info(toastSuccess);
      }
    }).catch(() => {
      this.toast.error('Failed to load Footer blueprint files.');
    });
  }

  /**
   * Resets code editors (HTML, CSS, JS) back to the original central blueprint files.
   */
  resetBoilerplate(): void {
    this.loadBlueprint(true, 'Boilerplate reset to default footer files.');
  }

  /**
   * Resets simulation mock content back to the default sample-content.json file.
   */
  resetSampleContent(): void {
    this.api.get<any>('ContentApi/templates/blueprint/footer?reload=true').subscribe({
      next: (res) => {
        const bp = res?.data || res;
        if (bp?.sampleContent) {
          this.sampleContent = bp.sampleContent;
          this.toast.info('Footer sample values reset to file defaults.');
        }
      },
      error: () => {
        fetch('/blueprints/footer/sample-content.json')
          .then(r => r.json())
          .then(json => {
            this.sampleContent = json;
            this.toast.info('Footer sample values reset to file defaults.');
          })
          .catch(() => this.toast.error('Failed to reset sample content.'));
      }
    });
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

  addFooterColumnPage(col: any): void {
    if (!col.pages) col.pages = [];
    col.pages.push({
      title: 'New Page',
      url: '/new-page'
    });
  }

  removeFooterColumnPage(col: any, index: number): void {
    if (col.pages && col.pages.length > index) {
      col.pages.splice(index, 1);
    }
  }

  addQuickLink(): void {
    if (!this.sampleContent.taggedPages) this.sampleContent.taggedPages = {};
    if (!this.sampleContent.taggedPages.quicklinks) this.sampleContent.taggedPages.quicklinks = [];
    this.sampleContent.taggedPages.quicklinks.push({
      title: 'New Quick Link',
      url: '/quick-link'
    });
  }

  removeQuickLink(index: number): void {
    if (this.sampleContent.taggedPages?.quicklinks && this.sampleContent.taggedPages.quicklinks.length > index) {
      this.sampleContent.taggedPages.quicklinks.splice(index, 1);
    }
  }

  addLegalPage(): void {
    if (!this.sampleContent.legalPages) this.sampleContent.legalPages = [];
    this.sampleContent.legalPages.push({
      title: 'New Legal Policy',
      url: '/privacy-policy'
    });
  }

  removeLegalPage(index: number): void {
    if (this.sampleContent.legalPages && this.sampleContent.legalPages.length > index) {
      this.sampleContent.legalPages.splice(index, 1);
    }
  }

  addContactItem(): void {
    if (!this.sampleContent.contactItems) this.sampleContent.contactItems = [];
    this.sampleContent.contactItems.push({
      type: 'phone',
      channelType: 'Phone',
      platform: 'Support',
      title: 'Contact Channel',
      description: 'Support Line',
      value: '+1 (555) 019-2834',
      content: '+1 (555) 019-2834',
      url: 'tel:+15550192834',
      icon: 'call',
      iconClass: 'fa-solid fa-phone',
      isDefault: false
    });
  }

  removeContactItem(index: number): void {
    if (this.sampleContent.contactItems && this.sampleContent.contactItems.length > index) {
      this.sampleContent.contactItems.splice(index, 1);
    }
  }

  addSocialLink(): void {
    if (!this.sampleContent.socialLinks) this.sampleContent.socialLinks = [];
    this.sampleContent.socialLinks.push({
      platform: 'Platform',
      title: 'Platform',
      url: 'https://example.com',
      icon: 'share',
      iconClass: 'fa-solid fa-share-nodes'
    });
  }

  removeSocialLink(index: number): void {
    if (this.sampleContent.socialLinks && this.sampleContent.socialLinks.length > index) {
      this.sampleContent.socialLinks.splice(index, 1);
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
