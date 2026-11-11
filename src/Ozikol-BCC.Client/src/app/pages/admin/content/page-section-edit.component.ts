import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent, PageHeaderButton } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-page-section-edit',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, PageHeaderComponent],
  template: `
    <div class="cms-page-container">
      <!-- Standardized Reusable Page Header -->
      <app-page-header
        [eyebrow]="headerEyebrow"
        icon="dashboard_customize"
        [title]="headerTitle"
        subtitle="Complete configuration of template layout key, rich descriptions, media assets, dynamic forms, and ribbon settings."
        [buttons]="headerButtons"
        [loading]="saving"
      ></app-page-header>

      <!-- Loading State -->
      <div class="loading-box" *ngIf="loading">
        <span class="material-symbols-outlined spin">progress_activity</span>
        <p>Loading section details...</p>
      </div>

      <!-- Form Layout -->
      <div class="form-layout" *ngIf="!loading && section">
        <!-- Main Column: Text, Descriptions, Media Assets -->
        <div class="main-column">
          <!-- Card 1: Titles & Core Copy -->
          <div class="cms-card">
            <div class="card-header-bar">
              <div>
                <h3>Titles & Copywriting</h3>
                <p class="card-sub">Core headings, sub-tags, and rich narrative for this layout block.</p>
              </div>
            </div>
            <div class="form-grid">
              <div class="form-group full-width">
                <label>SECTION MAIN TITLE *</label>
                <input type="text" [(ngModel)]="section.title" class="form-control font-bold" placeholder="e.g. Empowering Our Community Through Action">
              </div>

              <div class="form-group">
                <label>MINI TITLE (SUB-TAG / EYEBROW)</label>
                <input type="text" [(ngModel)]="section.miniTitle" class="form-control" placeholder="OUR VISION & VALUES">
              </div>

              <div class="form-group">
                <label>QUOTE / CALLOUT PHRASE</label>
                <input type="text" [(ngModel)]="section.qoute" class="form-control" placeholder="Prominent quote or highlight banner...">
              </div>

              <div class="form-group full-width">
                <label>SHORT DESCRIPTION (INTRODUCTORY SUMMARY)</label>
                <textarea rows="3" [(ngModel)]="section.description" class="form-control" placeholder="Brief section overview or excerpt..."></textarea>
              </div>

              <!-- WYSIWYG Rich Text Extended Description -->
              <div class="form-group full-width">
                <div class="card-head-between" style="margin-bottom: 8px;">
                  <label style="margin: 0;">FULL EXTENDED DESCRIPTION (RICH TEXT / SUMMERNOTE WYSIWYG)</label>
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
                      <option value="3">Size: Normal</option>
                      <option value="2">Size: Small</option>
                      <option value="4">Size: Medium</option>
                      <option value="5">Size: Large</option>
                      <option value="6">Size: Extra Large</option>
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
                    <button type="button" class="tool-btn" (click)="execFormat('insertUnorderedList')" title="Bullet List">
                      <span class="material-symbols-outlined">format_list_bulleted</span>
                    </button>
                    <button type="button" class="tool-btn" (click)="execFormat('insertOrderedList')" title="Numbered List">
                      <span class="material-symbols-outlined">format_list_numbered</span>
                    </button>
                    <button type="button" class="tool-btn" (click)="insertBlockquote()" title="Quote Block">
                      <span class="material-symbols-outlined">format_quote</span>
                    </button>
                    <button type="button" class="tool-btn" (click)="execFormat('insertHorizontalRule')" title="Divider Line">
                      <span class="material-symbols-outlined">horizontal_rule</span>
                    </button>
                  </div>

                  <div class="toolbar-sep"></div>

                  <div class="toolbar-group">
                    <button type="button" class="tool-btn" (click)="insertLink()" title="Insert Link">
                      <span class="material-symbols-outlined">link</span>
                    </button>
                    <button type="button" class="tool-btn" (click)="execFormat('unlink')" title="Remove Link">
                      <span class="material-symbols-outlined">link_off</span>
                    </button>
                    <button type="button" class="tool-btn text-muted" (click)="execFormat('removeFormat')" title="Clear Formatting">
                      <span class="material-symbols-outlined">format_clear</span>
                    </button>
                  </div>
                </div>

                <!-- WYSIWYG Editable Canvas -->
                <div
                  #editorCanvas
                  *ngIf="!showHtmlSource"
                  class="editor-canvas"
                  contenteditable="true"
                  (input)="onCanvasInput()"
                  (blur)="onCanvasInput()"
                  data-placeholder="Write detailed section narrative, formatted paragraphs, bullet points, or embed callouts...">
                </div>

                <!-- Raw HTML Source Code Editor -->
                <textarea
                  *ngIf="showHtmlSource"
                  rows="12"
                  [(ngModel)]="section.fullDescription"
                  class="form-control source-textarea"
                  placeholder="<p>Write or paste custom HTML code here...</p>">
                </textarea>
                <small class="help-text">Summernote-compatible WYSIWYG rich text editor with full HTML markup support.</small>
              </div>
            </div>
          </div>

          <!-- Card 2: Action Buttons, Root Icon & Direct Links -->
          <div class="cms-card">
            <div class="card-header-bar">
              <div>
                <h3>Action Buttons, Root Icon & Links</h3>
                <p class="card-sub">Interactive CTA buttons, destination page links, and section iconography.</p>
              </div>
            </div>
            <div class="form-grid">
              <div class="form-group full-width">
                <label>ROOT ICON CLASS (FONT AWESOME / THEME)</label>
                <input type="text" [(ngModel)]="section.iconText" class="form-control" placeholder="e.g. fa-solid fa-rocket, tji-phone">
              </div>

              <div class="form-group">
                <label>PRIMARY BUTTON TEXT</label>
                <input type="text" [(ngModel)]="section.buttonText" class="form-control" placeholder="e.g. Discover More, Join Now">
              </div>

              <div class="form-group">
                <label>SECONDARY BUTTON TEXT (DUAL CTA)</label>
                <input type="text" [(ngModel)]="section.secondButtonText" class="form-control" placeholder="e.g. Watch Demo, Learn More">
              </div>

              <div class="form-group full-width">
                <label>PRIMARY BUTTON TARGET LINK</label>
                <div class="input-with-dropdown">
                  <input
                    type="text"
                    [(ngModel)]="section.buttonLink"
                    class="form-control link-input"
                    placeholder="Select page from dropdown or type direct URL (e.g. /, /about, https://...)">
                  <select class="form-control link-select" (change)="onButtonLinkSelect($event, 'primary')">
                    <option value="">-- Quick Pick Page --</option>
                    <option value="/">🏠 Root / Home Page (/)</option>
                    <optgroup label="Published Web Pages" *ngIf="publishedPagesList.length">
                      <option *ngFor="let p of publishedPagesList" [value]="p.url">{{ p.title }} ({{ p.url }})</option>
                    </optgroup>
                    <optgroup label="Ready-Made System Pages">
                      <option *ngFor="let sp of systemPages" [value]="sp.url">{{ sp.name }} ({{ sp.url }})</option>
                    </optgroup>
                  </select>
                </div>
                <small class="help-text">Select from root (/), web pages, or system pages, or freely type any custom direct/anchor link.</small>
              </div>

              <div class="form-group full-width">
                <label>SECONDARY BUTTON TARGET LINK (DUAL CTA)</label>
                <div class="input-with-dropdown">
                  <input
                    type="text"
                    [(ngModel)]="section.secondButtonLink"
                    class="form-control link-input"
                    placeholder="Select page from dropdown or type direct URL (e.g. /, /about, https://...)">
                  <select class="form-control link-select" (change)="onButtonLinkSelect($event, 'secondary')">
                    <option value="">-- Quick Pick Page --</option>
                    <option value="/">🏠 Root / Home Page (/)</option>
                    <optgroup label="Published Web Pages" *ngIf="publishedPagesList.length">
                      <option *ngFor="let p of publishedPagesList" [value]="p.url">{{ p.title }} ({{ p.url }})</option>
                    </optgroup>
                    <optgroup label="Ready-Made System Pages">
                      <option *ngFor="let sp of systemPages" [value]="sp.url">{{ sp.name }} ({{ sp.url }})</option>
                    </optgroup>
                  </select>
                </div>
                <small class="help-text">Select from root (/), web pages, or system pages, or freely type any custom direct/anchor link.</small>
              </div>

              <div class="form-group full-width">
                <div class="checkbox-card">
                  <input type="checkbox" [(ngModel)]="section.disableButton" id="disBtn">
                  <label for="disBtn"><strong>Disable / Hide Action Buttons</strong> — Hides CTA action triggers from the rendered template.</label>
                </div>
              </div>
            </div>
          </div>

          <!-- Card 3: Media & Video Assets -->
          <div class="cms-card">
            <div class="card-header-bar">
              <div>
                <h3>Media Assets & Video Uploads</h3>
                <p class="card-sub">Upload high-resolution images, videos, or embed streaming video links.</p>
              </div>
            </div>

            <div class="form-grid">
              <!-- Primary Image -->
              <div class="form-group full-width">
                <label>PRIMARY BACKGROUND / HERO IMAGE (TYPE URL OR UPLOAD IMAGE)</label>
                <div class="input-with-upload">
                  <input type="text" [(ngModel)]="section.imageUrl" class="form-control" placeholder="e.g. https://yourdomain.com/feature-image.jpg">
                  <label class="btn-upload" [class.uploading]="uploadingPrimary">
                    <input type="file" (change)="uploadMedia($event, 'primary')" accept="image/*" style="display:none">
                    <span class="material-symbols-outlined">cloud_upload</span>
                    <span>{{ uploadingPrimary ? 'Uploading...' : 'Upload Image' }}</span>
                  </label>
                </div>
              </div>
              <div class="form-group full-width" *ngIf="section.imageUrl">
                <div class="image-preview-box">
                  <img [src]="section.imageUrl" alt="Primary Image">
                  <button type="button" class="btn-remove-img" (click)="section.imageUrl = ''; section.imageKey = ''">&times;</button>
                </div>
              </div>

              <!-- Secondary Image -->
              <div class="form-group full-width">
                <label>SECONDARY / ACCENT IMAGE (TYPE URL OR UPLOAD IMAGE)</label>
                <div class="input-with-upload">
                  <input type="text" [(ngModel)]="section.secondImageUrl" class="form-control" placeholder="e.g. https://yourdomain.com/secondary-image.jpg">
                  <label class="btn-upload" [class.uploading]="uploadingSecondary">
                    <input type="file" (change)="uploadMedia($event, 'secondary')" accept="image/*" style="display:none">
                    <span class="material-symbols-outlined">cloud_upload</span>
                    <span>{{ uploadingSecondary ? 'Uploading...' : 'Upload Image' }}</span>
                  </label>
                </div>
              </div>
              <div class="form-group full-width" *ngIf="section.secondImageUrl">
                <div class="image-preview-box">
                  <img [src]="section.secondImageUrl" alt="Secondary Image">
                  <button type="button" class="btn-remove-img" (click)="section.secondImageUrl = ''; section.secondImageKey = ''">&times;</button>
                </div>
              </div>

              <!-- Video Upload / URL -->
              <div class="form-group full-width">
                <label>VIDEO (TYPE URL OR UPLOAD VIDEO)</label>
                <div class="input-with-upload">
                  <input type="text" [(ngModel)]="section.videoUrl" class="form-control" placeholder="Direct MP4 / WebM URL">
                  <label class="btn-upload" [class.uploading]="uploadingVideo">
                    <input type="file" (change)="uploadVideo($event)" accept="video/*" style="display:none">
                    <span class="material-symbols-outlined">video_file</span>
                    <span>{{ uploadingVideo ? 'Uploading...' : 'Upload Video' }}</span>
                  </label>
                </div>
              </div>
              <div class="form-group full-width" *ngIf="section.videoUrl">
                <div class="video-preview-row">
                  <span class="material-symbols-outlined">play_circle</span>
                  <span class="video-preview-url">{{ section.videoUrl }}</span>
                  <button type="button" class="btn-remove-video" (click)="section.videoUrl = ''; section.videoKey = ''" title="Remove Video">&times;</button>
                </div>
              </div>

              <!-- Youtube / Vimeo Embed -->
              <div class="form-group full-width">
                <label>YOUTUBE / VIMEO EMBED LINK</label>
                <input type="text" [(ngModel)]="section.youtubeUrlLink" class="form-control" placeholder="https://youtube.com/watch?v=...">
              </div>
            </div>
          </div>
        </div>

        <!-- Side Column: Template Engine, Sorting, Ribbon & Status -->
        <div class="side-column">
          <!-- Template Design Block -->
          <div class="cms-card">
            <div class="card-header-bar">
              <div>
                <h3>Theme Engine Layout</h3>
                <p class="card-sub">Select design layout template.</p>
              </div>
            </div>

            <!-- Dropdown from Real Tenant Database Templates -->
            <div class="form-group">
              <label>TEMPLATE DESIGN KEY *</label>
              <select [(ngModel)]="section.templateKey" class="form-control template-select">
                <option value="">-- Select Template Layout --</option>
                <optgroup label="Tenant Installed Templates" *ngIf="installedTemplates.length > 0">
                  <option *ngFor="let t of installedTemplates" [value]="t.templateKey || t.variantCode">
                    {{ t.name }} ({{ t.variantCode || t.templateKey }}) [{{ t.categoryKey }}]
                  </option>
                </optgroup>
              </select>
            </div>

            <div class="form-group" style="margin-top:14px;">
              <label>CUSTOM CSS CLASS INJECTION</label>
              <input type="text" [(ngModel)]="section.customClass" class="form-control" placeholder="bg-slate-50 py-12 border-b">
            </div>
          </div>

          <!-- Placement & Sorting -->
          <div class="cms-card">
            <div class="card-header-bar">
              <div>
                <h3>Hierarchy & Positioning</h3>
                <p class="card-sub">Page assignment and sequence.</p>
              </div>
            </div>
            <div class="form-group">
              <label>PARENT WEB PAGE</label>
              <select [(ngModel)]="section.webPageId" class="form-control">
                <option [ngValue]="null">Standalone (Global / Home Only)</option>
                <option *ngFor="let p of allPages" [ngValue]="p.id">{{ p.title }}</option>
              </select>
            </div>

            <div class="form-group" style="margin-top:12px;">
              <label>PAGE SORT ORDER</label>
              <input type="number" [(ngModel)]="section.pageSortOrder" class="form-control">
              <small class="help-text">Sections render from lowest to highest numerical order.</small>
            </div>

            <div class="toggles-list" style="margin-top:14px;">
              <label class="toggle-card">
                <input type="checkbox" [(ngModel)]="section.disable">
                <div class="toggle-info">
                  <strong>Disable Section</strong>
                  <p>Temporarily hides this section from rendering.</p>
                </div>
              </label>
              <label class="toggle-card">
                <input type="checkbox" [(ngModel)]="section.fixedAfterFooter">
                <div class="toggle-info">
                  <strong>Fixed After Footer</strong>
                  <p>Forces section below the footer layout.</p>
                </div>
              </label>
            </div>
          </div>

          <!-- Dynamic Page Form Attachment -->
          <div class="cms-card">
            <div class="card-header-bar">
              <div>
                <h3>Attach Dynamic Page Form</h3>
                <p class="card-sub">Connect an interactive intake or lead form.</p>
              </div>
            </div>
            <div class="form-group">
              <label>DYNAMIC FORM</label>
              <select [(ngModel)]="section.pageFormId" (ngModelChange)="onFormSelected($event)" class="form-control">
                <option [ngValue]="null">-- None (No Dynamic Form) --</option>
                <optgroup label="System Onboarding &amp; Registration">
                  <option [ngValue]="'__registration_form__'">Member Registration ("Get Started")</option>
                </optgroup>
                <optgroup label="Custom Inquiry &amp; Lead Forms" *ngIf="availableForms && availableForms.length > 0">
                  <option *ngFor="let f of availableForms" [ngValue]="f.id">
                    {{ f.title }} ({{ f.formKey }}) [{{ f.fieldCount || f.fields?.length || 0 }} fields]
                  </option>
                </optgroup>
              </select>
            </div>

            <div class="form-group" style="margin-top:12px;">
              <label>DIRECT FORM KEY</label>
              <input type="text" [(ngModel)]="section.formKey" class="form-control" placeholder="e.g. contact-us, registration">
            </div>
          </div>

          <!-- Breaking News Ribbon -->
          <div class="cms-card">
            <div class="card-header-bar">
              <div>
                <h3>Breaking News Ribbon</h3>
                <p class="card-sub">Push headline to top marquee ticker.</p>
              </div>
            </div>
            <div class="toggles-list">
              <label class="toggle-card">
                <input type="checkbox" [(ngModel)]="section.addToRibon">
                <div class="toggle-info">
                  <strong>Add to News Ribbon Ticker</strong>
                  <p>Broadcasts title in header alert ticker.</p>
                </div>
              </label>
            </div>

            <div class="form-group" style="margin-top:12px;" *ngIf="section.addToRibon">
              <label>RIBBON DISPLAY TITLE</label>
              <input type="text" [(ngModel)]="section.ribonCustomDisplayTitle" class="form-control" placeholder="Short ticker headline...">
            </div>

            <div class="form-group" style="margin-top:12px;" *ngIf="section.addToRibon">
              <label>RIBBON SORT ORDER</label>
              <input type="number" [(ngModel)]="section.ribonSortOrder" class="form-control">
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .cms-page-container { display: flex; flex-direction: column; gap: 24px; }

    .btn {
      display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px;
      border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; text-decoration: none;
      transition: all 0.2s;
    }
    .btn-primary { background: #0050e5; color: #fff; border: none; }
    .btn-primary:hover { background: #0043c2; }
    .btn-outline { background: transparent; border: 1px solid #cbd5e1; color: #334155; }
    .btn-outline:hover { background: #f8fafc; border-color: #94a3b8; }

    .form-layout { display: grid; grid-template-columns: 2fr 1fr; gap: 24px; }
    @media (max-width: 1024px) {
      .form-layout { grid-template-columns: 1fr; }
    }
    .main-column, .side-column { display: flex; flex-direction: column; gap: 24px; }

    .cms-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; }
    .card-header-bar {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 20px; padding-bottom: 14px; border-bottom: 1px solid #f1f5f9;
    }
    .card-header-bar h3 { font-size: 17px; font-weight: 800; color: #0f172a; margin: 0 0 2px; }
    .card-sub { font-size: 13px; color: #64748b; margin: 0; }
    .card-head-between { display: flex; justify-content: space-between; align-items: center; }

    .form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 18px; }
    @media (max-width: 640px) {
      .form-grid { grid-template-columns: 1fr; }
    }
    .full-width { grid-column: 1 / -1; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group label { font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; }
    .form-control {
      padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px;
      transition: border-color 0.2s, box-shadow 0.2s; background: #fff;
    }
    .form-control:focus { outline: none; border-color: #0050e5; box-shadow: 0 0 0 3px rgba(0,80,229,0.1); }
    .help-text { font-size: 11px; color: #64748b; }

    /* Template Select & Badge */
    .template-select { font-weight: 600; color: #0f172a; }
    .template-key-manual-row { display: flex; flex-direction: column; gap: 4px; }
    .template-selected-badge {
      display: inline-flex; align-items: center; gap: 6px; margin-top: 8px;
      background: #eff6ff; color: #0050e5; padding: 6px 12px; border-radius: 8px;
      font-size: 12px; border: 1px solid #bfdbfe;
    }
    .template-selected-badge .material-symbols-outlined { font-size: 16px; }

    /* Rich Text / Summernote-style WYSIWYG Editor */
    .editor-view-toggle { display: flex; gap: 4px; }
    .btn-toggle {
      display: inline-flex; align-items: center; gap: 5px; padding: 5px 12px;
      border-radius: 6px; font-size: 12px; font-weight: 600; border: 1px solid #e2e8f0;
      background: #f8fafc; color: #64748b; cursor: pointer; transition: all 0.2s;
    }
    .btn-toggle .material-symbols-outlined { font-size: 15px; }
    .btn-toggle.active { background: #0050e5; color: #fff; border-color: #0050e5; }

    .rich-toolbar {
      display: flex; align-items: center; flex-wrap: wrap; gap: 2px;
      background: #f8fafc; border: 1px solid #cbd5e1; border-bottom: none;
      border-radius: 8px 8px 0 0; padding: 6px 10px;
    }
    .toolbar-group { display: flex; align-items: center; gap: 2px; }
    .toolbar-sep { width: 1px; height: 22px; background: #cbd5e1; margin: 0 4px; }
    .tool-btn {
      background: none; border: none; padding: 5px 7px; border-radius: 5px;
      cursor: pointer; color: #334155; display: inline-flex; align-items: center;
      justify-content: center; transition: all 0.15s;
    }
    .tool-btn:hover { background: #e2e8f0; color: #0050e5; }
    .tool-btn .material-symbols-outlined { font-size: 18px; }
    .tool-select {
      background: #fff; border: 1px solid #cbd5e1; border-radius: 5px;
      padding: 4px 8px; font-size: 12px; color: #334155; font-weight: 500; cursor: pointer;
    }

    .editor-canvas {
      min-height: 220px; max-height: 480px; overflow-y: auto; padding: 16px;
      background: #fff; border: 1px solid #cbd5e1; border-radius: 0 0 8px 8px;
      font-size: 14px; line-height: 1.7; color: #1e293b; outline: none;
    }
    .editor-canvas:focus { border-color: #0050e5; box-shadow: 0 0 0 3px rgba(0,80,229,0.08); }
    .editor-canvas:empty:before { content: attr(data-placeholder); color: #94a3b8; pointer-events: none; }
    .source-textarea {
      font-family: 'Consolas', 'Monaco', monospace; font-size: 12px; line-height: 1.5;
      background: #0f172a; color: #38bdf8; border-color: #1e293b; border-radius: 8px;
    }

    /* Media Uploads */
    .input-with-upload { display: flex; gap: 10px; }
    .input-with-upload input { flex: 1; }
    .btn-upload {
      display: inline-flex; align-items: center; gap: 6px; padding: 10px 16px;
      background: #eff6ff; color: #0050e5; border-radius: 8px; font-size: 13px; font-weight: 600;
      cursor: pointer; white-space: nowrap; border: 1px solid #bfdbfe; transition: all 0.2s;
    }
    .btn-upload:hover { background: #dbeafe; }
    .btn-upload.uploading { background: #cbd5e1; cursor: wait; }

    .input-with-dropdown {
      display: flex;
      gap: 10px;
      align-items: center;
    }
    .input-with-dropdown .link-input {
      flex: 1 1 55%;
      min-width: 0;
    }
    .input-with-dropdown .link-select {
      flex: 1 1 45%;
      min-width: 0;
      background-color: #f8fafc;
      border-color: #cbd5e1;
      color: #334155;
      font-weight: 500;
      cursor: pointer;
    }
    @media (max-width: 640px) {
      .input-with-dropdown {
        flex-direction: column;
        align-items: stretch;
      }
    }
    .help-text {
      display: block;
      margin-top: 4px;
      font-size: 11px;
      color: #64748b;
    }

    .video-preview-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
    }
    .video-preview-url {
      flex: 1;
      font-size: 12px;
      color: #0f172a;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-family: monospace;
    }
    .btn-remove-video {
      background: none;
      border: none;
      font-size: 20px;
      color: #dc2626;
      cursor: pointer;
      line-height: 1;
      padding: 0 4px;
    }
    .btn-remove-video:hover {
      color: #b91c1c;
    }

    .image-preview-box {
      position: relative; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; max-height: 180px;
    }
    .image-preview-box img { width: 100%; height: 180px; object-fit: cover; }
    .btn-remove-img {
      position: absolute; top: 8px; right: 8px; background: rgba(0,0,0,0.7); color: #fff;
      border: none; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; font-size: 16px;
      display: flex; align-items: center; justify-content: center;
    }

    .label-with-badge { display: flex; justify-content: space-between; align-items: center; }
    .key-pill {
      display: inline-flex; align-items: center; gap: 4px;
      background: #f1f5f9; color: #475569; font-size: 10px; font-weight: 700;
      padding: 3px 8px; border-radius: 6px; font-family: monospace; border: 1px solid #e2e8f0;
    }
    .key-pill .icon-mini { font-size: 12px; color: #0050e5; }

    /* Toggles */
    .toggles-list { display: flex; flex-direction: column; gap: 10px; }
    .toggle-card {
      display: flex; align-items: flex-start; gap: 12px; background: #f8fafc;
      padding: 12px 14px; border-radius: 10px; border: 1px solid #e2e8f0; cursor: pointer;
    }
    .toggle-card input { margin-top: 3px; }
    .toggle-info strong { font-size: 13px; color: #0f172a; }
    .toggle-info p { font-size: 11px; color: #64748b; margin: 2px 0 0; }
    .checkbox-card { display: flex; align-items: center; gap: 8px; background: #f8fafc; padding: 10px 14px; border-radius: 8px; border: 1px solid #e2e8f0; }

    .loading-box { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px; color: #64748b; }
    .spin { animation: spin 1s linear infinite; font-size: 32px; color: #0050e5; margin-bottom: 12px; }
    @keyframes spin { 100% { transform: rotate(360deg); } }
  `]
})
export class PageSectionEditComponent implements OnInit, AfterViewInit {
  @ViewChild('editorCanvas') editorCanvasRef!: ElementRef;

  sectionId = '';
  isEditMode = false;
  section: any = null;
  installedTemplates: any[] = [];
  allPages: any[] = [];
  availableForms: any[] = [];

  showHtmlSource = false;
  loading = false;
  saving = false;
  uploadingPrimary = false;
  uploadingSecondary = false;
  uploadingVideo = false;

  get headerEyebrow(): string {
    return this.section?.webPageId
      ? 'CMS Studio / Page Sections / Web Page'
      : 'CMS Studio / Page Sections';
  }

  get headerTitle(): string {
    return this.isEditMode
      ? `Edit Section: ${this.section?.title || 'Layout Block'}`
      : 'Create New Section';
  }

  get headerButtons(): PageHeaderButton[] {
    const btns: PageHeaderButton[] = [];
    btns.push({
      text: 'Back to Pages',
      icon: 'auto_stories',
      routerLink: '/content/console/pages'
    });
    const pageId = this.section?.webPageId || this.route.snapshot.queryParams['webPageId'];
    if (pageId) {
      btns.push({
        text: 'Page Sections',
        icon: 'layers',
        routerLink: `/content/console/pages/details/${pageId}`
      });
    }
    btns.push({
      text: 'All Sections',
      icon: 'view_list',
      routerLink: '/content/console/sections'
    });
    if (this.isEditMode && this.sectionId) {
      btns.push({
        text: 'Manage Sub-Items',
        icon: 'list',
        routerLink: `/content/console/sections/details/${this.sectionId}`
      });
    }
    btns.push({
      text: this.saving ? (this.isEditMode ? 'Saving...' : 'Creating...') : (this.isEditMode ? 'Save Section Changes' : 'Create Section'),
      icon: 'save',
      isPrimary: true,
      disabled: this.saving || this.loading,
      loading: this.saving,
      action: () => this.saveSection()
    });
    return btns;
  }

  publishedPagesList: { title: string; url: string }[] = [];

  systemPages: { name: string; url: string }[] = [
    { name: 'Member Sign In / Portal', url: '/auth/login' },
    { name: 'Member Registration', url: '/auth/register' },
    { name: 'News & Blog Articles', url: '/blog' },
    { name: 'Commerce Storefront', url: '/store' },
    { name: 'Contact Us', url: '/contact' },
    { name: 'Service & Project Request', url: '/service-request' },
    { name: 'Committees & Working Groups', url: '/join-committee' }
  ];

  // Standard System Section Blueprints
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private toast: ToastService
  ) { }

  ngOnInit(): void {
    const rawId = this.route.snapshot.paramMap.get('id') || '';
    const isCreatePath = this.route.snapshot.url.some(s => s.path === 'create');

    if (!isCreatePath && rawId && rawId !== 'create') {
      this.isEditMode = true;
      this.sectionId = rawId;
      this.loadSection();
    } else {
      this.isEditMode = false;
      this.sectionId = '';
      this.initNewSection();
    }

    this.loadInstalledTemplates();
    this.loadForms();
    this.loadPages();
  }

  ngAfterViewInit(): void {
    this.syncCanvasWithHtml();
  }

  private initNewSection(): void {
    const webPageIdQuery = this.route.snapshot.queryParams['webPageId'] || null;

    this.section = {
      title: '',
      miniTitle: '',
      qoute: '',
      description: '',
      fullDescription: '',
      iconText: '',
      buttonText: '',
      buttonLink: '',
      secondButtonText: '',
      secondButtonLink: '',
      disableButton: false,
      directUrl: '',
      pageSortOrder: 1,
      disable: false,
      fixedAfterFooter: false,
      templateKey: '',
      customClass: '',
      backgroundColor: '',
      addToRibon: false,
      ribonCustomDisplayTitle: '',
      ribonSortOrder: 0,
      webPageId: webPageIdQuery,
      pageFormId: null,
      formKey: '',
      imageUrl: '',
      imageKey: '',
      secondImageUrl: '',
      secondImageKey: '',
      videoUrl: '',
      videoKey: '',
      youtubeUrlLink: ''
    };

    // Auto-calculate sort order if attached to a web page
    if (webPageIdQuery) {
      this.api.get<any>(`ContentApi/pages/${webPageIdQuery}`).subscribe({
        next: (res) => {
          const sections = res?.data?.pageSections || [];
          if (sections.length > 0) {
            const maxOrder = Math.max(...sections.map((s: any) => s.pageSortOrder || 0));
            this.section.pageSortOrder = maxOrder + 1;
          }
        },
        error: () => { }
      });
    }
  }

  loadInstalledTemplates(): void {
    this.api.get<any>('ContentApi/templates/installed').subscribe({
      next: (res) => {
        if (res?.data && Array.isArray(res.data)) {
          this.installedTemplates = res.data;
        }
      },
      error: () => { }
    });
  }

  loadForms(): void {
    this.api.get<any>('PageFormsApi').subscribe({
      next: (res) => {
        if (res?.data && Array.isArray(res.data)) {
          this.availableForms = res.data;
        }
      },
      error: () => { }
    });
  }

  loadPages(): void {
    this.api.get<any>('ContentApi/pages').subscribe({
      next: (res) => {
        this.allPages = res?.data || [];
        this.publishedPagesList = this.allPages.map((p: any) => {
          let url = p.directUrl || p.slug || '';
          if (p.isHomePage || url === 'home' || url === 'index') {
            url = '/';
          } else if (!url.startsWith('/') && !url.startsWith('http')) {
            url = `/${url}`;
          }
          return {
            title: p.title || p.metaTitle || 'Page',
            url: url
          };
        });
      },
      error: () => { }
    });
  }

  onButtonLinkSelect(event: any, field: 'primary' | 'secondary'): void {
    const val = event.target?.value;
    if (val) {
      if (field === 'primary') {
        this.section.buttonLink = val;
      } else {
        this.section.secondButtonLink = val;
      }
    }
  }

  loadSection(): void {
    this.loading = true;
    this.api.get<any>(`ContentApi/sections/${this.sectionId}`).subscribe({
      next: (res) => {
        this.loading = false;
        this.section = res?.data;
        if (this.section) {
          if (!this.section.pageFormId && (this.section.formKey === 'registration' || this.section.formKey === 'register')) {
            this.section.pageFormId = '__registration_form__';
          }
          this.syncCanvasWithHtml();
        }
      },
      error: (err) => {
        this.loading = false;
        this.toast.error(err?.error?.message || 'Failed to load layout section details.');
      }
    });
  }

  onFormSelected(formId: string | null): void {
    if (!formId) {
      this.section.formKey = '';
      return;
    }
    if (formId === '__registration_form__') {
      this.section.formKey = 'registration';
      return;
    }
    const found = this.availableForms.find(f => f.id === formId);
    if (found) {
      this.section.formKey = found.formKey;
    }
  }

  // --- WYSIWYG Summernote Rich Text Editor Engine ---
  syncCanvasWithHtml(): void {
    setTimeout(() => {
      if (this.editorCanvasRef?.nativeElement && this.section) {
        this.editorCanvasRef.nativeElement.innerHTML = this.section.fullDescription || '';
      }
    }, 100);
  }

  onCanvasInput(): void {
    if (this.editorCanvasRef?.nativeElement && this.section) {
      this.section.fullDescription = this.editorCanvasRef.nativeElement.innerHTML;
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
    event.target.value = 'p';
  }

  onFontSizeChange(event: any): void {
    const size = event.target.value;
    this.execFormat('fontSize', size);
    event.target.value = '3';
  }

  insertBlockquote(): void {
    this.execFormat('formatBlock', '<blockquote>');
  }

  insertLink(): void {
    const url = prompt('Enter the destination hyperlink URL:', 'https://');
    if (url && url.trim() && url !== 'https://') {
      this.execFormat('createLink', url.trim());
    }
  }

  // --- Media Uploads ---
  uploadMedia(event: any, type: string): void {
    const file = event.target.files?.[0];
    if (!file) return;

    if (type === 'primary') this.uploadingPrimary = true;
    else this.uploadingSecondary = true;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'bcp-cms/sections');

    this.api.post<any>('ContentApi/upload-media', formData).subscribe({
      next: (res) => {
        if (type === 'primary') {
          this.uploadingPrimary = false;
          if (res?.data?.url) this.section.imageUrl = res.data.url;
          if (res?.data?.key) this.section.imageKey = res.data.key;
        } else {
          this.uploadingSecondary = false;
          if (res?.data?.url) this.section.secondImageUrl = res.data.url;
          if (res?.data?.key) this.section.secondImageKey = res.data.key;
        }
        this.toast.success('Media image uploaded successfully!');
      },
      error: (err) => {
        this.uploadingPrimary = false;
        this.uploadingSecondary = false;
        this.toast.error(err?.error?.message || 'Media upload failed.');
      }
    });
  }

  // --- Video Upload ---
  uploadVideo(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;

    this.uploadingVideo = true;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'bcp-cms/section-videos');

    this.api.post<any>('ContentApi/upload-media', formData).subscribe({
      next: (res) => {
        this.uploadingVideo = false;
        if (res?.data?.url) this.section.videoUrl = res.data.url;
        if (res?.data?.key) this.section.videoKey = res.data.key;
        this.toast.success('Video uploaded successfully!');
      },
      error: (err) => {
        this.uploadingVideo = false;
        this.toast.error(err?.error?.message || 'Video upload failed.');
      }
    });
  }

  // --- Save / Create Section ---
  saveSection(): void {
    if (!this.section?.title?.trim()) {
      this.toast.warning('Section Title is required.');
      return;
    }

    if (this.showHtmlSource) {
      // already in fullDescription
    } else {
      this.onCanvasInput();
    }

    this.saving = true;

    if (this.isEditMode) {
      this.api.put<any>(`ContentApi/sections/${this.sectionId}`, this.section).subscribe({
        next: (res) => {
          this.saving = false;
          this.toast.success(res?.message || 'Section updated successfully!');
        },
        error: (err) => {
          this.saving = false;
          this.toast.error(err?.error?.message || 'Failed to update section.');
        }
      });
    } else {
      this.api.post<any>('ContentApi/sections', this.section).subscribe({
        next: (res) => {
          this.saving = false;
          this.toast.success(res?.message || 'Layout section created successfully!');
          const createdId = res?.data?.id;
          if (this.section.webPageId) {
            this.router.navigate(['/content/console/pages/details', this.section.webPageId]);
          } else if (createdId) {
            this.router.navigate(['/content/console/sections/details', createdId]);
          } else {
            this.router.navigate(['/content/console/sections']);
          }
        },
        error: (err) => {
          this.saving = false;
          this.toast.error(err?.error?.message || 'Failed to create layout section.');
        }
      });
    }
  }

  goBack(): void {
    if (this.section?.webPageId) {
      this.router.navigate(['/content/console/pages/details', this.section.webPageId]);
    } else {
      this.router.navigate(['/content/console/sections']);
    }
  }
}
