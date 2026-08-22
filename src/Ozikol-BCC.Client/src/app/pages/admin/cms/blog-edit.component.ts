import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-blog-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="cms-edit-container">
      <!-- Breadcrumb and Top Navigation Header -->
      <div class="page-header-bar">
        <div class="header-titles">
          <div class="breadcrumb">
            <a routerLink="/content/console">CMS Studio</a>
            <span class="sep">/</span>
            <a routerLink="/content/console/blogs">Blog Articles</a>
            <span class="sep">/</span>
            <span class="current">{{ isEditing ? 'Edit Article' : 'New Article' }}</span>
          </div>
          <h1 class="page-title">{{ isEditing ? 'Edit Blog Article' : 'Compose New Blog Article' }}</h1>
          <p class="page-sub">Create and publish formatted editorial articles, organization announcements, and featured news.</p>
        </div>

        <div class="header-actions">
          <a routerLink="/content/console/blogs" class="btn btn-secondary">
            <span class="material-symbols-outlined">arrow_back</span>
            <span>Back to Articles</span>
          </a>
          <button type="button" class="btn btn-primary" (click)="saveBlog()" [disabled]="saving || !blog.title || !canEdit">
            <span class="material-symbols-outlined">{{ saving ? 'hourglass_top' : 'save' }}</span>
            <span>{{ saving ? 'Saving Article...' : (isEditing ? 'Save Changes' : 'Publish Article') }}</span>
          </button>
        </div>
      </div>

      <!-- Success & Error Alert Banners -->
      <div *ngIf="successMsg" class="alert-banner success">
        <span class="material-symbols-outlined">check_circle</span>
        <span>{{ successMsg }}</span>
      </div>
      <div *ngIf="errorMsg" class="alert-banner error">
        <span class="material-symbols-outlined">error</span>
        <span>{{ errorMsg }}</span>
      </div>

      <!-- Main 2-Column Form Layout -->
      <div class="edit-layout">
        <!-- Left Column: Headline, Excerpt, Rich Text Content Editor, Ribbon Ticker -->
        <div class="main-column">
          <!-- Card 1: Article Headline & Summary -->
          <div class="form-card">
            <div class="card-head">
              <span class="material-symbols-outlined text-primary">title</span>
              <h3>Headline & Excerpt</h3>
            </div>

            <div class="form-group">
              <label>Article Title / Headline <span class="req">*</span></label>
              <input type="text" [(ngModel)]="blog.title" [disabled]="!canEdit" placeholder="e.g. Annual Community General Assembly 2026 Scheduled" class="form-input title-input" />
            </div>

            <div class="form-group">
              <label>Short Excerpt / Teaser Summary</label>
              <textarea [(ngModel)]="blog.description" [disabled]="!canEdit" rows="2" placeholder="Brief summary preview shown on cards, news listings, and SEO snippets..." class="form-input"></textarea>
            </div>
          </div>

          <!-- Card 2: WYSIWYG Rich Text Article Body Editor -->
          <div class="form-card">
            <div class="card-head-between">
              <div class="card-head-title">
                <span class="material-symbols-outlined text-purple">format_shapes</span>
                <h3>Article Body Content</h3>
              </div>
              <div class="editor-view-toggle">
                <button type="button" class="btn-toggle" [class.active]="!showHtmlSource" (click)="setEditorMode(false)">
                  <span class="material-symbols-outlined">edit_note</span> Visual Editor
                </button>
                <button type="button" class="btn-toggle" [class.active]="showHtmlSource" (click)="setEditorMode(true)">
                  <span class="material-symbols-outlined">code</span> HTML Source
                </button>
              </div>
            </div>

            <!-- Rich Text Formatting Toolbar -->
            <div class="rich-toolbar" *ngIf="!showHtmlSource">
              <div class="toolbar-group">
                <button type="button" class="tool-btn" (click)="execFormat('bold')" title="Bold (Ctrl+B)">
                  <span class="material-symbols-outlined">format_bold</span>
                </button>
                <button type="button" class="tool-btn" (click)="execFormat('italic')" title="Italic (Ctrl+I)">
                  <span class="material-symbols-outlined">format_italic</span>
                </button>
                <button type="button" class="tool-btn" (click)="execFormat('underline')" title="Underline (Ctrl+U)">
                  <span class="material-symbols-outlined">format_underlined</span>
                </button>
                <button type="button" class="tool-btn" (click)="execFormat('strikeThrough')" title="Strikethrough">
                  <span class="material-symbols-outlined">strikethrough_s</span>
                </button>
              </div>

              <div class="toolbar-sep"></div>

              <div class="toolbar-group">
                <select (change)="onHeadingChange($event)" class="tool-select" title="Headings">
                  <option value="p">Paragraph</option>
                  <option value="h1">Heading 1</option>
                  <option value="h2">Heading 2</option>
                  <option value="h3">Heading 3</option>
                  <option value="h4">Heading 4</option>
                </select>
                <select (change)="onFontSizeChange($event)" class="tool-select" title="Font Size">
                  <option value="3">Normal Size</option>
                  <option value="1">Small</option>
                  <option value="4">Medium</option>
                  <option value="5">Large</option>
                  <option value="6">Extra Large</option>
                </select>
              </div>

              <div class="toolbar-sep"></div>

              <div class="toolbar-group">
                <button type="button" class="tool-btn" (click)="execFormat('justifyLeft')" title="Align Left">
                  <span class="material-symbols-outlined">format_align_left</span>
                </button>
                <button type="button" class="tool-btn" (click)="execFormat('justifyCenter')" title="Align Center">
                  <span class="material-symbols-outlined">format_align_center</span>
                </button>
                <button type="button" class="tool-btn" (click)="execFormat('justifyRight')" title="Align Right">
                  <span class="material-symbols-outlined">format_align_right</span>
                </button>
                <button type="button" class="tool-btn" (click)="execFormat('justifyFull')" title="Justify">
                  <span class="material-symbols-outlined">format_align_justify</span>
                </button>
              </div>

              <div class="toolbar-sep"></div>

              <div class="toolbar-group">
                <button type="button" class="tool-btn" (click)="execFormat('insertUnorderedList')" title="Bulleted List">
                  <span class="material-symbols-outlined">format_list_bulleted</span>
                </button>
                <button type="button" class="tool-btn" (click)="execFormat('insertOrderedList')" title="Numbered List">
                  <span class="material-symbols-outlined">format_list_numbered</span>
                </button>
                <button type="button" class="tool-btn" (click)="insertBlockquote()" title="Quote / Callout">
                  <span class="material-symbols-outlined">format_quote</span>
                </button>
                <button type="button" class="tool-btn" (click)="execFormat('insertHorizontalRule')" title="Horizontal Divider Line">
                  <span class="material-symbols-outlined">horizontal_rule</span>
                </button>
              </div>

              <div class="toolbar-sep"></div>

              <div class="toolbar-group">
                <button type="button" class="tool-btn" (click)="insertLink()" title="Insert Link">
                  <span class="material-symbols-outlined">link</span>
                </button>
                <button type="button" class="tool-btn" (click)="bodyImageInput.click()" title="Insert Image into Body (Cloudinary)">
                  <span class="material-symbols-outlined">add_photo_alternate</span>
                </button>
                <input type="file" #bodyImageInput (change)="onBodyImageSelected($event)" accept="image/*" style="display: none;" />
                <button type="button" class="tool-btn" (click)="execFormat('removeFormat')" title="Clear Formatting">
                  <span class="material-symbols-outlined">format_clear</span>
                </button>
              </div>
            </div>

            <!-- Visual Contenteditable Canvas -->
            <div
              *ngIf="!showHtmlSource"
              #editorCanvas
              class="rich-canvas"
              [attr.contenteditable]="canEdit"
              (input)="onCanvasInput()"
              (blur)="onCanvasInput()"
              placeholder="Write the full formatted story, paragraphs, headings, quotes, and media here..."
            ></div>

            <!-- Raw HTML Source Code Editor -->
            <textarea
              *ngIf="showHtmlSource"
              [(ngModel)]="blog.fullDescription"
              rows="16"
              class="form-input html-source-textarea"
              [disabled]="!canEdit"
              placeholder="HTML markup..."
            ></textarea>
          </div>

          <!-- Card 3: Breaking News Ribbon Ticker -->
          <div class="form-card ribbon-card">
            <div class="card-head">
              <span class="material-symbols-outlined text-orange">campaign</span>
              <h3>Breaking News Ribbon Ticker</h3>
            </div>

            <div class="form-group checkbox-group">
              <label class="check-label">
                <input type="checkbox" [(ngModel)]="blog.addToRibon" name="addToRibon" [disabled]="!canEdit" />
                <span>Feature this article in the live Breaking News Ribbon on the website homepage</span>
              </label>
            </div>

            <div class="form-grid-2" *ngIf="blog.addToRibon">
              <div class="form-group">
                <label>Custom Ticker Headline (Optional)</label>
                <input type="text" [(ngModel)]="blog.ribonCustomDisplayTitle" [disabled]="!canEdit" placeholder="Override headline in marquee ribbon..." class="form-input" />
              </div>
              <div class="form-group">
                <label>Ticker Sort Order</label>
                <input type="number" [(ngModel)]="blog.ribonSortOrder" [disabled]="!canEdit" class="form-input" />
              </div>
            </div>
          </div>
        </div>

        <!-- Right Column: Publishing Controls, Category, Featured Image, Video Link -->
        <div class="side-column">
          <!-- Card 1: Publish Settings -->
          <div class="form-card">
            <div class="card-head">
              <span class="material-symbols-outlined text-green">publish</span>
              <h3>Publishing & Schedule</h3>
            </div>

            <!-- Publishing Mode Selector (Now / Schedule / Draft) -->
            <div class="publish-modes-group">
              <label class="publish-mode-card" [class.selected]="publishMode === 'now'">
                <input type="radio" [(ngModel)]="publishMode" name="publishMode" value="now" [disabled]="!canEdit" />
                <div class="mode-info">
                  <span class="material-symbols-outlined text-green">rocket_launch</span>
                  <div>
                    <strong>Publish Now</strong>
                    <p>Make visible immediately</p>
                  </div>
                </div>
              </label>

              <label class="publish-mode-card" [class.selected]="publishMode === 'schedule'">
                <input type="radio" [(ngModel)]="publishMode" name="publishMode" value="schedule" [disabled]="!canEdit" />
                <div class="mode-info">
                  <span class="material-symbols-outlined text-primary">schedule</span>
                  <div>
                    <strong>Schedule Release</strong>
                    <p>Auto-publish at specific time</p>
                  </div>
                </div>
              </label>

              <label class="publish-mode-card" [class.selected]="publishMode === 'draft'">
                <input type="radio" [(ngModel)]="publishMode" name="publishMode" value="draft" [disabled]="!canEdit" />
                <div class="mode-info">
                  <span class="material-symbols-outlined text-muted">draft</span>
                  <div>
                    <strong>Save as Draft</strong>
                    <p>Hidden from public view</p>
                  </div>
                </div>
              </label>
            </div>

            <!-- Future Scheduled Release DateTime Picker -->
            <div class="form-group schedule-box" *ngIf="publishMode === 'schedule'">
              <label>Target Release Date & Time <span class="req">*</span></label>
              <input type="datetime-local" [(ngModel)]="scheduledDateTime" [disabled]="!canEdit" class="form-input" />
              <span class="schedule-hint">Article will be enqueued for background worker release.</span>
            </div>

            <div class="form-group">
              <label>Topic / Category</label>
              <select [(ngModel)]="blog.blogCategoryId" [disabled]="!canEdit" class="form-input">
                <option [ngValue]="null">-- Select Category --</option>
                <option *ngFor="let cat of categories" [ngValue]="cat.id">{{ cat.title }}</option>
              </select>
            </div>

            <div class="form-group">
              <label>Listing Sort Order</label>
              <input type="number" [(ngModel)]="blog.sortOrder" [disabled]="!canEdit" class="form-input" />
            </div>

            <div class="side-actions">
              <button type="button" class="btn btn-primary full-width" (click)="saveBlog()" [disabled]="saving || !blog.title || (publishMode === 'schedule' && !scheduledDateTime)">
                <span class="material-symbols-outlined">{{ saving ? 'hourglass_top' : 'save' }}</span>
                <span>{{ saving ? 'Saving...' : (publishMode === 'schedule' ? 'Schedule Release' : (publishMode === 'now' ? 'Publish Article' : 'Save Draft')) }}</span>
              </button>
            </div>
          </div>

          <!-- Card 2: Featured Cover Photo (Cloudinary) -->
          <div class="form-card">
            <div class="card-head">
              <span class="material-symbols-outlined text-primary">image</span>
              <h3>Featured Cover Photo</h3>
            </div>

            <div class="cover-uploader-wrap">
              <div class="cover-preview-box" *ngIf="blog.imageUrl">
                <img [src]="blog.imageUrl" alt="Cover" class="cover-img" />
                <button type="button" class="btn-remove-cover" (click)="removeCoverImage()" *ngIf="canEdit" title="Remove Image">✕</button>
              </div>

              <div class="cover-upload-actions">
                <button type="button" class="btn btn-outline full-width" (click)="coverFileInput.click()" [disabled]="uploadingCover || !canEdit">
                  <span class="material-symbols-outlined">{{ uploadingCover ? 'hourglass_top' : 'cloud_upload' }}</span>
                  <span>{{ uploadingCover ? 'Uploading to Cloudinary...' : 'Upload Cover Photo' }}</span>
                </button>
                <input type="file" #coverFileInput (change)="onCoverFileSelected($event)" accept="image/*" style="display: none;" />
              </div>

              <div class="form-group" style="margin-top: 10px;">
                <label>Direct Image URL</label>
                <input type="text" [(ngModel)]="blog.imageUrl" [disabled]="!canEdit" placeholder="https://..." class="form-input" />
              </div>
            </div>
          </div>

          <!-- Card 3: Optional Video Link -->
          <div class="form-card">
            <div class="card-head">
              <span class="material-symbols-outlined text-red">smart_display</span>
              <h3>Featured Video Link</h3>
            </div>

            <div class="form-group">
              <label>Video URL (YouTube, Vimeo, Cloudinary)</label>
              <input type="text" [(ngModel)]="blog.videoUrl" [disabled]="!canEdit" placeholder="https://youtube.com/watch?v=..." class="form-input" />
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .cms-edit-container { display: flex; flex-direction: column; gap: 20px; }

    /* Page Header Bar */
    .page-header-bar {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      flex-wrap: wrap;
      gap: 16px;
      margin-bottom: 4px;
    }
    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12.5px;
      font-weight: 700;
      color: #64748b;
      margin-bottom: 4px;
    }
    .breadcrumb a { color: #0050e5; text-decoration: none; }
    .breadcrumb .sep { color: #cbd5e1; }
    .breadcrumb .current { color: #0f172a; }
    .page-title { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 4px; }
    .page-sub { font-size: 13px; color: #64748b; margin: 0; }

    .header-actions { display: flex; align-items: center; gap: 10px; }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
      text-decoration: none;
    }
    .btn-primary {
      background: linear-gradient(135deg, #0050e5, #1f6bff);
      color: #ffffff;
      box-shadow: 0 4px 12px rgba(0, 80, 229, 0.3);
    }
    .btn-primary:hover:not(:disabled) { transform: translateY(-1px); }
    .btn-secondary {
      background: #ffffff;
      color: #334155;
      border: 1px solid #cbd5e1;
    }
    .btn-outline {
      background: #ffffff;
      color: #0f172a;
      border: 1px solid #cbd5e1;
    }
    .btn-outline:hover { border-color: #0050e5; color: #0050e5; }
    .full-width { width: 100%; justify-content: center; }

    /* Alert Banners */
    .alert-banner {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      border-radius: 10px;
      font-size: 13.5px;
      font-weight: 700;
    }
    .alert-banner.success { background: rgba(34, 197, 94, 0.12); color: #16a34a; border: 1px solid #22c55e; }
    .alert-banner.error { background: rgba(239, 68, 68, 0.12); color: #ef4444; border: 1px solid #ef4444; }

    /* 2-Column Layout */
    .edit-layout {
      display: grid;
      grid-template-columns: 1fr 340px;
      gap: 24px;
      align-items: start;
    }
    @media (max-width: 980px) {
      .edit-layout { grid-template-columns: 1fr; }
    }

    .main-column, .side-column {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    /* Form Cards */
    .form-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 22px 26px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .card-head {
      display: flex;
      align-items: center;
      gap: 8px;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 12px;
      margin-bottom: 2px;
    }
    .card-head h3 { font-size: 15px; font-weight: 800; color: #0f172a; margin: 0; }
    .card-head span { font-size: 22px; }

    .card-head-between {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 12px;
      margin-bottom: 2px;
    }
    .card-head-title { display: flex; align-items: center; gap: 8px; }
    .card-head-title h3 { font-size: 15px; font-weight: 800; color: #0f172a; margin: 0; }

    .editor-view-toggle {
      display: flex;
      gap: 4px;
      background: #f1f5f9;
      padding: 3px;
      border-radius: 8px;
    }
    .btn-toggle {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: none;
      border: none;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      color: #64748b;
      cursor: pointer;
    }
    .btn-toggle span { font-size: 16px; }
    .btn-toggle.active { background: #ffffff; color: #0050e5; box-shadow: 0 2px 6px rgba(0,0,0,0.06); }

    /* Form Fields */
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group label {
      font-size: 12px;
      font-weight: 700;
      color: #334155;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .form-group label .req { color: #ef4444; }
    .form-input {
      padding: 10px 14px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 13.5px;
      color: #0f172a;
      outline: none;
      transition: all 0.2s;
      background: #f8fafc;
    }
    .form-input:focus {
      border-color: #0050e5;
      background: #ffffff;
      box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.12);
    }
    .title-input { font-size: 16px; font-weight: 700; }
    .form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    @media (max-width: 600px) { .form-grid-2 { grid-template-columns: 1fr; } }

    /* Rich Text Toolbar */
    .rich-toolbar {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 4px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 6px 10px;
    }
    .toolbar-group { display: flex; align-items: center; gap: 2px; }
    .toolbar-sep { width: 1px; height: 22px; background: #cbd5e1; margin: 0 4px; }
    .tool-btn {
      background: none;
      border: 1px solid transparent;
      border-radius: 6px;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: #334155;
      transition: all 0.2s;
    }
    .tool-btn:hover { background: #e2e8f0; color: #0050e5; }
    .tool-btn span { font-size: 19px; }
    .tool-select {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 4px 8px;
      font-size: 12px;
      font-weight: 700;
      color: #334155;
      outline: none;
    }

    /* Contenteditable Canvas */
    .rich-canvas {
      min-height: 380px;
      max-height: 700px;
      overflow-y: auto;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 18px 20px;
      font-size: 14.5px;
      line-height: 1.7;
      color: #0f172a;
      background: #ffffff;
      outline: none;
      box-shadow: inset 0 2px 6px rgba(0,0,0,0.02);
    }
    .rich-canvas:focus {
      border-color: #0050e5;
      box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.12);
    }
    .rich-canvas:empty:before {
      content: attr(placeholder);
      color: #94a3b8;
      font-style: italic;
    }
    .html-source-textarea {
      font-family: monospace;
      font-size: 13px;
      line-height: 1.5;
      background: #0f172a;
      color: #38bdf8;
      min-height: 380px;
    }

    /* Publish Modes Group */
    .publish-modes-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 6px;
    }
    .publish-mode-card {
      display: flex;
      align-items: center;
      padding: 10px 12px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      background: #f8fafc;
    }
    .publish-mode-card input { display: none; }
    .publish-mode-card.selected {
      border-color: #0050e5;
      background: rgba(0, 80, 229, 0.06);
    }
    .mode-info {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .mode-info strong { font-size: 13px; color: #0f172a; display: block; }
    .mode-info p { margin: 0; font-size: 11.5px; color: #64748b; }
    .schedule-box {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      padding: 12px;
      border-radius: 8px;
    }
    .schedule-hint { font-size: 11px; color: #2563eb; font-style: italic; }

    /* Ribbon & Checkbox */
    .ribbon-card { background: #fffaf0; border-color: #fed7aa; }
    .check-label { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; cursor: pointer; }

    /* Cover Photo Box */
    .cover-uploader-wrap { display: flex; flex-direction: column; gap: 10px; }
    .cover-preview-box {
      position: relative;
      width: 100%;
      height: 160px;
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid #cbd5e1;
    }
    .cover-img { width: 100%; height: 100%; object-fit: cover; }
    .btn-remove-cover {
      position: absolute;
      top: 6px;
      right: 6px;
      background: rgba(0,0,0,0.7);
      color: #ffffff;
      border: none;
      border-radius: 50%;
      width: 26px;
      height: 26px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 700;
    }

    .text-primary { color: #0050e5; }
    .text-purple { color: #9333ea; }
    .text-green { color: #16a34a; }
    .text-orange { color: #ea580c; }
    .text-red { color: #ef4444; }
    .text-muted { color: #64748b; }
  `]
})
export class BlogEditComponent implements OnInit {
  @ViewChild('editorCanvas') editorCanvasRef!: ElementRef;

  blogId: string | null = null;
  isEditing = false;
  loading = false;
  saving = false;
  uploadingCover = false;
  showHtmlSource = false;
  successMsg = '';
  errorMsg = '';

  publishMode: 'now' | 'schedule' | 'draft' = 'now';
  scheduledDateTime = '';

  categories: any[] = [];

  blog: any = {
    id: null,
    title: '',
    description: '',
    fullDescription: '',
    date: new Date().toISOString().split('T')[0],
    publish: true,
    isScheduled: false,
    scheduledPublishDate: null,
    sortOrder: 0,
    imageUrl: '',
    imageKey: '',
    videoUrl: '',
    blogCategoryId: null,
    addToRibon: false,
    ribonCustomDisplayTitle: '',
    ribonSortOrder: 0
  };

  canEdit = false;

  constructor(
    private api: ApiService,
    private route: ActivatedRoute,
    private router: Router,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.checkPermissions();
    this.loadCategories();
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id && id !== 'create') {
        this.blogId = id;
        this.isEditing = true;
        this.loadBlog(id);
      } else {
        this.isEditing = false;
        // Default scheduled date to tomorrow at 09:00 AM
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0);
        this.scheduledDateTime = tomorrow.toISOString().slice(0, 16);
      }
    });
  }

  getUserId(): string {
    const token = localStorage.getItem('access_token');
    if (!token) return '';
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        return payload.sub || payload.nameid || payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || '';
      }
    } catch {}
    return '';
  }

  checkPermissions(): void {
    const userId = this.getUserId();
    const rolesJson = localStorage.getItem('user_roles');
    let isAdminOrSuper = false;
    if (rolesJson) {
      try {
        const roles: string[] = JSON.parse(rolesJson);
        isAdminOrSuper = roles.some(r => ['superadmin', 'admin', 'systemadministrator'].includes(r.toLowerCase()));
      } catch {}
    }

    if (isAdminOrSuper) {
      this.canEdit = true;
    } else if (userId) {
      this.api.get<any>(`IdentityApi/users/${userId}/feature-roles`).subscribe({
        next: (res) => {
          if (res && res.data) {
            const roles = res.data.featureRoles || [];
            const cmsRole = roles.find((r: any) => r.featureName?.toLowerCase() === 'cms' || r.featureName?.toLowerCase() === 'blog');
            const hasGlobalEdit = roles.some((r: any) => r.scope === 'GlobalEdit');
            const hasFeatureEdit = cmsRole && cmsRole.scope === 'FeatureEdit';
            
            this.canEdit = res.data.isAdmin || hasGlobalEdit || hasFeatureEdit;
          }
        },
        error: () => {
          this.canEdit = false;
        }
      });
    }
  }

  loadCategories(): void {
    this.api.get<any>('ContentApi/blog-categories').subscribe({
      next: (res) => {
        this.categories = res?.data || [];
        if (!this.isEditing && this.categories.length > 0 && !this.blog.blogCategoryId) {
          this.blog.blogCategoryId = this.categories[0].id;
        }
      }
    });
  }

  loadBlog(id: string): void {
    this.loading = true;
    this.api.get<any>(`ContentApi/blogs/${id}`).subscribe({
      next: (res) => {
        this.loading = false;
        if (res?.data) {
          this.blog = {
            ...res.data,
            date: res.data.date ? res.data.date.split('T')[0] : new Date().toISOString().split('T')[0]
          };

          if (this.blog.isScheduled && this.blog.scheduledPublishDate) {
            this.publishMode = 'schedule';
            this.scheduledDateTime = this.blog.scheduledPublishDate.slice(0, 16);
          } else if (this.blog.publish) {
            this.publishMode = 'now';
          } else {
            this.publishMode = 'draft';
          }

          this.syncCanvasWithHtml();
        }
      },
      error: () => {
        this.loading = false;
        this.errorMsg = 'Failed to load article details.';
      }
    });
  }

  syncCanvasWithHtml(): void {
    setTimeout(() => {
      if (this.editorCanvasRef?.nativeElement) {
        this.editorCanvasRef.nativeElement.innerHTML = this.blog.fullDescription || '';
      }
    }, 100);
  }

  onCanvasInput(): void {
    if (this.editorCanvasRef?.nativeElement) {
      this.blog.fullDescription = this.editorCanvasRef.nativeElement.innerHTML;
    }
  }

  setEditorMode(isHtml: boolean): void {
    if (isHtml) {
      this.onCanvasInput();
      this.showHtmlSource = true;
    } else {
      this.showHtmlSource = false;
      this.syncCanvasWithHtml();
    }
  }

  // --- Rich Text Commands ---
  execFormat(command: string, value: string | undefined = undefined): void {
    document.execCommand(command, false, value);
    this.onCanvasInput();
  }

  onHeadingChange(event: any): void {
    const tag = event.target.value;
    if (tag === 'p') {
      this.execFormat('formatBlock', '<p>');
    } else {
      this.execFormat('formatBlock', `<${tag}>`);
    }
  }

  onFontSizeChange(event: any): void {
    const size = event.target.value;
    this.execFormat('fontSize', size);
  }

  insertBlockquote(): void {
    this.execFormat('formatBlock', '<blockquote>');
  }

  insertLink(): void {
    const url = prompt('Enter the link URL (e.g. https://example.com):');
    if (url) {
      this.execFormat('createLink', url);
    }
  }

  onBodyImageSelected(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'bcp-blogs');

    this.api.post<any>('ContentApi/upload-media', formData).subscribe({
      next: (res) => {
        if (res?.data?.url) {
          this.execFormat('insertImage', res.data.url);
        }
      },
      error: () => this.toast.error('Failed to upload image into article body.', 'Upload Error')
    });
  }

  // --- Featured Cover Image ---
  onCoverFileSelected(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;

    this.uploadingCover = true;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'bcp-blogs');

    this.api.post<any>('ContentApi/upload-media', formData).subscribe({
      next: (res) => {
        this.uploadingCover = false;
        if (res?.data?.url) {
          this.blog.imageUrl = res.data.url;
          this.blog.imageKey = res.data.key;
        }
      },
      error: () => {
        this.uploadingCover = false;
        this.toast.error('Failed to upload cover photo to Cloudinary.', 'Upload Error');
      }
    });
  }

  removeCoverImage(): void {
    this.blog.imageUrl = '';
    this.blog.imageKey = '';
  }

  // --- Save Article ---
  saveBlog(): void {
    if (!this.canEdit) return;
    if (!this.blog.title) return;
    if (!this.showHtmlSource) {
      this.onCanvasInput();
    }

    this.saving = true;
    this.successMsg = '';
    this.errorMsg = '';

    const isScheduled = this.publishMode === 'schedule' && !!this.scheduledDateTime;
    const isPublished = this.publishMode === 'now';

    const payload = {
      title: this.blog.title,
      description: this.blog.description,
      fullDescription: this.blog.fullDescription,
      date: this.blog.date ? new Date(this.blog.date) : new Date(),
      publish: isPublished,
      isScheduled: isScheduled,
      scheduledPublishDate: isScheduled ? new Date(this.scheduledDateTime) : null,
      sortOrder: this.blog.sortOrder || 0,
      imageUrl: this.blog.imageUrl,
      imageKey: this.blog.imageKey,
      videoUrl: this.blog.videoUrl,
      blogCategoryId: this.blog.blogCategoryId,
      addToRibon: this.blog.addToRibon,
      ribonCustomDisplayTitle: this.blog.ribonCustomDisplayTitle,
      ribonSortOrder: this.blog.ribonSortOrder || 0
    };

    const req$ = this.isEditing
      ? this.api.put<any>(`ContentApi/blogs/${this.blogId}`, payload)
      : this.api.post<any>('ContentApi/blogs', payload);

    req$.subscribe({
      next: (res) => {
        this.saving = false;
        this.successMsg = isScheduled
          ? 'Article scheduled successfully for background release!'
          : (this.isEditing ? 'Article updated successfully!' : 'Article created and published!');
        setTimeout(() => {
          this.router.navigate(['/content/console/blogs']);
        }, 1500);
      },
      error: (err) => {
        this.saving = false;
        this.errorMsg = err?.error?.message || 'Failed to save article.';
      }
    });
  }
}
