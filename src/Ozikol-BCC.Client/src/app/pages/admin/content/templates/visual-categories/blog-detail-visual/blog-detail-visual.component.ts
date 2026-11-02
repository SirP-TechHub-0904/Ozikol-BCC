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
            [category]="'blog_detail'"
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
                  Adjust placeholder sample data to test your article template design. These values are used for demo simulation and live preview hydration.
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

          <!-- Mock Data Sub-Tabs: 1. Content & Body | 2. Author Profile | 3. Tags | 4. Related Reads & Comments -->
          <div class="mock-tabs-nav">
            <button
              type="button"
              class="mock-tab-btn"
              [class.active]="activeMockTab === 'content'"
              (click)="activeMockTab = 'content'"
            >
              <span class="material-symbols-outlined icon-micro">article</span>
              <span>1. Article Content &amp; Body</span>
            </button>
            <button
              type="button"
              class="mock-tab-btn"
              [class.active]="activeMockTab === 'author'"
              (click)="activeMockTab = 'author'"
            >
              <span class="material-symbols-outlined icon-micro">person</span>
              <span>2. Author &amp; Publication</span>
            </button>
            <button
              type="button"
              class="mock-tab-btn"
              [class.active]="activeMockTab === 'tags'"
              (click)="activeMockTab = 'tags'"
            >
              <span class="material-symbols-outlined icon-micro">sell</span>
              <span>3. Topic Tags ({{ (sampleContent.tags || []).length }})</span>
            </button>
            <button
              type="button"
              class="mock-tab-btn"
              [class.active]="activeMockTab === 'related'"
              (click)="activeMockTab = 'related'"
            >
              <span class="material-symbols-outlined icon-micro">dynamic_feed</span>
              <span>4. Related &amp; Discussion</span>
            </button>
          </div>

          <!-- Sub-Tab 1: Article Content & Body (Default) -->
          <div class="mock-tab-pane" *ngIf="activeMockTab === 'content'">
            <div class="inspector-form-grid-2">
              <div class="form-group col-span-2">
                <label class="field-label">
                  <span>Article Headline (H1 / Title)</span>
                  <code [innerText]="'{{ Title }}'"></code>
                </label>
                <input
                  type="text"
                  [(ngModel)]="sampleContent.title"
                  (ngModelChange)="sampleContent.articleHeadline = sampleContent.title"
                  class="form-control inspector-input"
                  placeholder="e.g. Navigating Multi-Cloud Architecture at Scale"
                />
              </div>

              <div class="form-group">
                <label class="field-label">
                  <span>Category Badge</span>
                  <code [innerText]="'{{ Category }}'"></code>
                </label>
                <input
                  type="text"
                  [(ngModel)]="sampleContent.category"
                  class="form-control inspector-input"
                  placeholder="e.g. Cloud Engineering"
                />
              </div>

              <div class="form-group">
                <label class="field-label">
                  <span>Featured Cover Image URL</span>
                  <code [innerText]="'{{ CoverImageUrl }}'"></code>
                </label>
                <input
                  type="text"
                  [(ngModel)]="sampleContent.coverImageUrl"
                  class="form-control inspector-input"
                  placeholder="e.g. https://images.unsplash.com/..."
                />
              </div>

              <div class="form-group col-span-2">
                <label class="field-label">
                  <span>Lead Narrative / Excerpt</span>
                  <code [innerText]="'{{ Summary }}'"></code>
                </label>
                <textarea
                  [(ngModel)]="sampleContent.summary"
                  (ngModelChange)="sampleContent.articleLead = sampleContent.summary; sampleContent.description = sampleContent.summary"
                  class="form-control inspector-input textarea-short"
                  rows="2"
                  placeholder="e.g. How global engineering teams maintain governance, zero trust security, and low latency..."
                ></textarea>
              </div>

              <div class="form-group col-span-2">
                <label class="field-label">
                  <span>Editorial Article Body (HTML Allowed)</span>
                  <code [innerText]="'{{{ Body }}}'"></code>
                </label>
                <textarea
                  [(ngModel)]="sampleContent.body"
                  (ngModelChange)="sampleContent.content = sampleContent.body; sampleContent.fullDescription = sampleContent.body"
                  class="form-control inspector-input textarea-short"
                  rows="5"
                  placeholder="e.g. <p>Modern enterprise platforms increasingly face...</p>"
                ></textarea>
              </div>
            </div>
          </div>

          <!-- Sub-Tab 2: Author Profile & Publication Meta -->
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
                  placeholder="e.g. Alex Vance"
                />
              </div>

              <div class="form-group">
                <label class="field-label">
                  <span>Author Role / Designation</span>
                  <code [innerText]="'{{ AuthorRole }}'"></code>
                </label>
                <input
                  type="text"
                  [(ngModel)]="sampleContent.authorRole"
                  class="form-control inspector-input"
                  placeholder="e.g. Chief Cloud Architect"
                />
              </div>

              <div class="form-group col-span-2">
                <label class="field-label">
                  <span>Author Avatar URL</span>
                  <code [innerText]="'{{ AuthorAvatarUrl }}'"></code>
                </label>
                <input
                  type="text"
                  [(ngModel)]="sampleContent.authorAvatarUrl"
                  (ngModelChange)="sampleContent.authorAvatar = sampleContent.authorAvatarUrl"
                  class="form-control inspector-input"
                  placeholder="e.g. https://images.unsplash.com/..."
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
                  (ngModelChange)="sampleContent.readTime = sampleContent.readingTime"
                  class="form-control inspector-input"
                  placeholder="e.g. 8 min read"
                />
              </div>

              <div class="form-group col-span-2">
                <label class="field-label">
                  <span>Author Biography</span>
                  <code [innerText]="'{{ AuthorBio }}'"></code>
                </label>
                <textarea
                  [(ngModel)]="sampleContent.authorBio"
                  class="form-control inspector-input textarea-short"
                  rows="2"
                  placeholder="e.g. Specializing in distributed systems, sovereign cloud meshes, and container security."
                ></textarea>
              </div>
            </div>
          </div>

          <!-- Sub-Tab 3: Topic Tags Taxonomy -->
          <div class="mock-tab-pane" *ngIf="activeMockTab === 'tags'">
            <div class="tax-group-block">
              <div class="tax-header-row">
                <div>
                  <h4 class="tax-group-title">Article Topic Tags</h4>
                  <p class="tax-group-sub">Rendered via loop: <code [innerText]="'{{#each Tags}}'"></code></p>
                </div>
                <button type="button" class="btn-add-mini" (click)="addTag()">
                  <span class="material-symbols-outlined">add</span>
                  <span>Add Tag</span>
                </button>
              </div>

              <div class="tax-list">
                <div class="tax-item-row" *ngFor="let tag of (sampleContent.tags || []); let idx = index">
                  <input
                    type="text"
                    [(ngModel)]="tag.name"
                    class="form-control inspector-input flex-2"
                    placeholder="Tag name e.g. MultiCloud"
                  />
                  <input
                    type="text"
                    [(ngModel)]="tag.url"
                    class="form-control inspector-input flex-2"
                    placeholder="URL e.g. /blog/tags/multicloud"
                  />
                  <button type="button" class="btn-remove-item" (click)="removeTag(idx)" title="Remove tag">
                    <span class="material-symbols-outlined">delete</span>
                  </button>
                </div>
                <div *ngIf="!sampleContent.tags || sampleContent.tags.length === 0" class="empty-list-notice">
                  No tags added. Click "Add Tag" to add topic labels.
                </div>
              </div>
            </div>
          </div>

          <!-- Sub-Tab 4: Sidebar & Related Content -->
          <div class="mock-tab-pane" *ngIf="activeMockTab === 'related'">
            <div class="tax-group-block" style="margin-bottom: 24px;">
              <div class="tax-header-row">
                <div>
                  <h4 class="tax-group-title">Sidebar Categories</h4>
                  <p class="tax-group-sub">Rendered via loop: <code [innerText]="'{{#each BlogCategories}}'"></code></p>
                </div>
                <button type="button" class="btn-add-mini" (click)="addCategory()">
                  <span class="material-symbols-outlined">add</span>
                  <span>Add Category</span>
                </button>
              </div>

              <div class="tax-list">
                <div class="tax-item-row" *ngFor="let cat of (sampleContent.blogCategories || []); let idx = index">
                  <input
                    type="text"
                    [(ngModel)]="cat.name"
                    class="form-control inspector-input flex-2"
                    placeholder="Category name e.g. Cloud Architecture"
                  />
                  <input
                    type="number"
                    [(ngModel)]="cat.count"
                    class="form-control inspector-input flex-1"
                    placeholder="Count e.g. 14"
                  />
                  <input
                    type="text"
                    [(ngModel)]="cat.url"
                    class="form-control inspector-input flex-2"
                    placeholder="URL e.g. /blog/categories/cloud"
                  />
                  <button type="button" class="btn-remove-item" (click)="removeCategory(idx)" title="Remove category">
                    <span class="material-symbols-outlined">delete</span>
                  </button>
                </div>
                <div *ngIf="!sampleContent.blogCategories || sampleContent.blogCategories.length === 0" class="empty-list-notice">
                  No categories added. Click "Add Category" to add sidebar categories.
                </div>
              </div>
            </div>

            <div class="tax-group-block">
              <div class="tax-header-row">
                <div>
                  <h4 class="tax-group-title">Recommended / Recent Articles</h4>
                  <p class="tax-group-sub">Rendered via loop: <code [innerText]="'{{#each RecentArticles}}'"></code></p>
                </div>
                <button type="button" class="btn-add-mini" (click)="addRecentArticle()">
                  <span class="material-symbols-outlined">add</span>
                  <span>Add Article</span>
                </button>
              </div>

              <div class="recent-list">
                <div class="repeater-card" *ngFor="let rec of (sampleContent.recentArticles || []); let idx = index">
                  <div class="repeater-header">
                    <span class="badge-item-num">#{{ idx + 1 }}</span>
                    <input
                      type="text"
                      [(ngModel)]="rec.title"
                      class="form-control inspector-input font-bold"
                      placeholder="e.g. Sovereign Compliance Across Regions"
                    />
                    <button type="button" class="btn-remove-item" (click)="removeRecentArticle(idx)" title="Remove item">
                      <span class="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                  <div class="repeater-grid-2">
                    <div class="input-cell">
                      <label class="cell-label"><span>Target Link</span><code [innerText]="'{{ Url }}'"></code></label>
                      <input type="text" [(ngModel)]="rec.url" class="form-control inspector-input" placeholder="e.g. /blog/2" />
                    </div>
                    <div class="input-cell">
                      <label class="cell-label"><span>Published Date</span><code [innerText]="'{{ PublishedDate }}'"></code></label>
                      <input type="text" [(ngModel)]="rec.publishedDate" class="form-control inspector-input" placeholder="e.g. Sep 28, 2026" />
                    </div>
                    <div class="input-cell col-span-2">
                      <label class="cell-label"><span>Cover Image URL</span><code [innerText]="'{{ CoverImageUrl }}'"></code></label>
                      <input type="text" [(ngModel)]="rec.coverImageUrl" class="form-control inspector-input" placeholder="e.g. https://images.unsplash.com/..." />
                    </div>
                  </div>
                </div>
              </div>

              <div class="comments-note-box mt-4">
                <div class="comments-note-header">
                  <span class="material-symbols-outlined note-icon">chat</span>
                  <div>
                    <h5 class="note-title">Sidebar Widgets &amp; Dynamic Forms: <code [innerText]="'{{ Form &quot;Comment_Submit&quot; }}'"></code></h5>
                    <p class="note-desc">
                      The sidebar displays live search, categories, recent reads, tags cloud, and newsletter subscription form. When the Comment database model is connected, submissions will bind natively without requiring template changes.
                    </p>
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
      width: 100% !important;
      box-sizing: border-box !important;
      min-height: 72px;
    }

    .tax-group-block {
      background: #f8fafc;
      border: 1.5px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
    }

    .tax-header-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
      gap: 12px;
      flex-wrap: wrap;
    }

    .tax-group-title {
      font-size: 14px;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
    }

    .tax-group-sub {
      font-size: 12px;
      color: #64748b;
      margin: 3px 0 0 0;
    }

    .tax-group-sub code {
      font-family: 'Fira Code', monospace;
      color: #0050e5;
    }

    .btn-add-mini {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 6px 14px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      color: #0050e5;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-add-mini:hover {
      background: #0050e5;
      color: #ffffff;
      border-color: #0050e5;
    }

    .tax-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .tax-item-row {
      display: flex;
      align-items: center;
      gap: 10px;
      background: #ffffff;
      padding: 8px 12px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }

    .flex-2 { flex: 2; }
    .flex-1 { flex: 1; }

    .btn-remove-item {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border: 1px solid #fecaca;
      background: #fff5f5;
      color: #ef4444;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s;
      flex-shrink: 0;
    }

    .btn-remove-item:hover {
      background: #ef4444;
      color: #ffffff;
      border-color: #dc2626;
    }

    .empty-list-notice {
      padding: 18px;
      text-align: center;
      font-size: 12.5px;
      color: #94a3b8;
      background: #ffffff;
      border: 1px dashed #cbd5e1;
      border-radius: 8px;
    }

    .recent-list {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .repeater-card {
      background: #ffffff;
      border: 1.5px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .repeater-header {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .badge-item-num {
      font-size: 11px;
      font-weight: 800;
      color: #64748b;
      background: #f1f5f9;
      padding: 3px 8px;
      border-radius: 6px;
      flex-shrink: 0;
    }

    .font-bold {
      font-weight: 700;
    }

    .repeater-grid-2 {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }

    .input-cell {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .cell-label {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
    }

    .cell-label code {
      font-family: 'Fira Code', monospace;
      font-size: 10px;
      color: #0050e5;
    }

    .comments-note-box {
      background: #ffffff;
      border: 1.5px solid #bfdbfe;
      border-radius: 12px;
      padding: 16px 20px;
    }

    .comments-note-header {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }

    .note-icon {
      color: #0050e5;
      font-size: 24px;
      margin-top: 2px;
    }

    .note-title {
      font-size: 13.5px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 4px 0;
    }

    .note-title code {
      font-family: 'Fira Code', monospace;
      color: #0050e5;
      background: #eff6ff;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .note-desc {
      font-size: 12.5px;
      color: #475569;
      margin: 0;
      line-height: 1.5;
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
  activeMockTab: 'content' | 'author' | 'tags' | 'related' = 'content';

  htmlTemplate: string = '';
  cssStyles: string = '';
  jsScript: string = '';
  sampleContent: any = {};

  blogDetailTokens: Array<{ label: string; token: string; htmlSnippet?: string; description?: string }> = [
    { label: 'Article Headline', token: '{{ Title }}', description: 'Primary headline of the article.' },
    { label: 'Lead Paragraph', token: '{{ Summary }}', description: 'Prominent summary / lead paragraph.' },
    { label: 'Article Body', token: '{{{ Body }}}', description: 'Full rich HTML body content of the article.' },
    { label: 'Cover Image', token: '{{ CoverImageUrl }}', description: 'Full-bleed article header cover image.' },
    { label: 'Category Badge', token: '{{ Category }}', description: 'Topic category badge.' },
    { label: 'Author Name', token: '{{ AuthorName }}', description: 'Full author name.' },
    { label: 'Author Role', token: '{{ AuthorRole }}', description: 'Author professional title or role.' },
    { label: 'Author Avatar', token: '{{ AuthorAvatarUrl }}', description: 'Author avatar photo URL.' },
    { label: 'Author Biography', token: '{{ AuthorBio }}', description: 'Author biographical narrative.' },
    { label: 'Reading Time', token: '{{ ReadingTime }}', description: 'Estimated reading time string (e.g. 5 min read).' },
    { label: 'Published Date', token: '{{ PublishedDate }}', description: 'Publication date string.' },
    { label: 'Topic Tags Loop', token: '{{#each Tags}}<a href="{{ Url }}">#{{ Name }}</a>{{/each}}', description: 'Article topic tag pills.' },
    { label: 'Categories Widget', token: '{{#each BlogCategories}}<li><a href="{{ Url }}">{{ Name }} ({{ Count }})</a></li>{{/each}}', description: 'Sidebar category list.' },
    { label: 'Recent Reads Widget', token: '{{#each RecentArticles}}<a href="{{ Url }}">{{ Title }}</a>{{/each}}', description: 'Sidebar recent articles.' },
    { label: 'Comment Submit Form', token: '{{ Form "Comment_Submit" }}', description: 'Dynamic visitor comments submission form.' },
    { label: 'Newsletter Widget Form', token: '{{ Form "Newsletter_Subscribe" }}', description: 'Sidebar newsletter opt-in form.' }
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
    this.variantCode = `BLOG_DET_${randomSuffix}`;
  }

  loadBlueprint(forceReload: boolean = false, toastSuccess?: string): void {
    const url = forceReload ? 'ContentApi/templates/blueprint/blog-detail?reload=true' : 'ContentApi/templates/blueprint/blog-detail';
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
        this.toast.error('Failed to load Article Detail blueprint from central API.');
      }
    });
  }

  resetBoilerplate(): void {
    this.loadBlueprint(true, 'Boilerplate reset to default article detail files.');
  }

  resetSampleContent(): void {
    this.api.get<any>('ContentApi/templates/blueprint/blog-detail?reload=true').subscribe({
      next: (res) => {
        const bp = res?.data || res;
        if (bp?.sampleContent) {
          this.sampleContent = bp.sampleContent;
          this.toast.info('Article Detail sample values reset to file defaults.');
        }
      },
      error: () => {
        this.toast.error('Failed to reset sample content from central API.');
      }
    });
  }

  addTag(): void {
    if (!this.sampleContent.tags) {
      this.sampleContent.tags = [];
    }
    this.sampleContent.tags.push({
      name: 'NewTopic',
      url: '/blog/tags/newtopic'
    });
    this.toast.info('Added new topic tag.');
  }

  removeTag(idx: number): void {
    if (this.sampleContent.tags && this.sampleContent.tags.length > idx) {
      this.sampleContent.tags.splice(idx, 1);
      this.toast.info('Removed topic tag.');
    }
  }

  addCategory(): void {
    if (!this.sampleContent.blogCategories) {
      this.sampleContent.blogCategories = [];
    }
    this.sampleContent.blogCategories.push({
      name: 'New Category',
      count: 1,
      url: '/blog/categories/new'
    });
    this.toast.info('Added sidebar category.');
  }

  removeCategory(idx: number): void {
    if (this.sampleContent.blogCategories && this.sampleContent.blogCategories.length > idx) {
      this.sampleContent.blogCategories.splice(idx, 1);
      this.toast.info('Removed sidebar category.');
    }
  }

  addRecentArticle(): void {
    if (!this.sampleContent.recentArticles) {
      this.sampleContent.recentArticles = [];
    }
    this.sampleContent.recentArticles.push({
      title: 'New Related Article Headline',
      url: '/blog/new-article',
      coverImageUrl: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=600&auto=format&fit=crop&q=80',
      publishedDate: 'Recently Published'
    });
    this.toast.info('Added recommended article.');
  }

  removeRecentArticle(idx: number): void {
    if (this.sampleContent.recentArticles && this.sampleContent.recentArticles.length > idx) {
      this.sampleContent.recentArticles.splice(idx, 1);
      this.toast.info('Removed recommended article.');
    }
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

    this.securityScanner.scanAndExecute({
      title: name,
      category: 'blog_detail',
      html: this.htmlTemplate || '',
      css: this.cssStyles || '',
      js: this.jsScript || '',
      mockJson: JSON.stringify(this.sampleContent),
      onConfirmSave: () => this.executeSaveBlogDetailTemplate(name)
    });
  }

  private executeSaveBlogDetailTemplate(name: string): void {
    this.isSaving = true;
    const payload = {
      name,
      category: 'blog_detail',
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
        if (err?.status === 400 && (err?.error?.message?.toLowerCase().includes('security') || err?.error?.data?.violations)) {
          this.securityScanner.handleBackendError(err);
        } else {
          const msg = err?.error?.message || err?.message || 'Failed to save Article Detail template.';
          this.toast.error(`Save error: ${msg}`);
        }
      }
    });
  }
}
