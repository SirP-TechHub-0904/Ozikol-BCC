import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent, PageHeaderButton } from '../../../shared/components/page-header/page-header.component';
import { FilePickerModalComponent } from '../../../shared/components/file-picker-modal/file-picker-modal.component';

@Component({
  selector: 'app-page-section-list-edit',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, PageHeaderComponent, FilePickerModalComponent],
  template: `
    <div class="cms-page-container">
      <!-- Standardized Reusable Page Header -->
      <app-page-header
        [eyebrow]="headerEyebrow"
        icon="view_list"
        [title]="headerTitle"
        subtitle="Complete configuration of repeating card fields, rich descriptions, icons, buttons, media, and ribbon settings."
        [buttons]="headerButtons"
        [loading]="saving"
      ></app-page-header>

      <!-- Loading State -->
      <div class="loading-box" *ngIf="loading">
        <span class="material-symbols-outlined spin">progress_activity</span>
        <p>Loading sub-item details...</p>
      </div>

      <!-- Main Edit Form -->
      <div class="form-layout" *ngIf="!loading && item">
        <!-- Main Column -->
        <div class="main-column">
          <!-- Card 1: Content & Copy -->
          <div class="cms-card">
            <div class="card-header-bar">
              <div>
                <h3>Item Identity & Descriptions</h3>
                <p class="card-sub">Core titles, icons, and rich narratives for this repeating card.</p>
              </div>
            </div>
            <div class="form-grid">
              <div class="form-group full-width">
                <label>ITEM TITLE</label>
                <input type="text" [(ngModel)]="item.title" class="form-control font-bold" placeholder="e.g. Health Outreach Program, Leadership Team">
              </div>

              <div class="form-group">
                <label>MINI TITLE (SUB-TAG / BADGE)</label>
                <input type="text" [(ngModel)]="item.miniTitle" class="form-control" placeholder="PILLAR 01 / FEATURE">
              </div>

              <div class="form-group">
                <div class="icon-label-row">
                  <label>ICON (FONT AWESOME, &lt;I&gt; TAG, OR IMAGE URL)</label>
                  <span *ngIf="item.iconText" class="badge-icon-type" [class.badge-image]="getIconKind(item.iconText) === 'image'">
                    {{ getIconTypeLabel(item.iconText) }}
                  </span>
                </div>
                <div class="icon-input-group">
                  <div class="icon-preview-box" [title]="'Live Icon Preview: ' + (item.iconText || 'None')">
                    <ng-container [ngSwitch]="getIconKind(item.iconText)">
                      <img *ngSwitchCase="'image'" [src]="getIconSrc(item.iconText)" alt="Preview" class="preview-img" />
                      <i *ngSwitchCase="'font'" [class]="getCleanIconClass(item.iconText)" class="preview-icon"></i>
                      <span *ngSwitchDefault class="material-symbols-outlined preview-empty">image_not_supported</span>
                    </ng-container>
                  </div>
                  <input
                    type="text"
                    [(ngModel)]="item.iconText"
                    class="form-control icon-input-field"
                    placeholder="e.g. fa-solid fa-calendar-check, <i class='fa-solid fa-calendar-check'></i>, or https://.../icon.svg">
                </div>
                <small class="help-text">Paste Font Awesome class, direct &lt;i&gt; HTML tag, or image URL. The template engine renders it natively.</small>
              </div>

              <div class="form-group full-width">
                <label>SUMMARY DESCRIPTION (BRIEF OVERVIEW)</label>
                <textarea rows="3" [(ngModel)]="item.description" class="form-control" placeholder="Card introductory text or teaser..."></textarea>
              </div>

              <!-- WYSIWYG Extended Description -->
              <div class="form-group full-width">
                <label>EXTENDED / MORE DESCRIPTION (RICH TEXT / SUMMERNOTE WYSIWYG)</label>

                <!-- Summernote Editor Container with Integrated Toolbar and Auto-Sanitizer -->
                <div class="summernote-wrapper" [class.codeview-active]="showHtmlSource">
                  <!-- Unified Toolbar: Handles all text formatting and code view toggle -->
                  <div class="rich-toolbar">
                    <div class="toolbar-group">
                      <button type="button" class="tool-btn" [disabled]="showHtmlSource" (click)="execFormat('bold')" title="Bold (Ctrl+B)">
                        <span class="material-symbols-outlined">format_bold</span>
                      </button>
                      <button type="button" class="tool-btn" [disabled]="showHtmlSource" (click)="execFormat('italic')" title="Italic (Ctrl+I)">
                        <span class="material-symbols-outlined">format_italic</span>
                      </button>
                      <button type="button" class="tool-btn" [disabled]="showHtmlSource" (click)="execFormat('underline')" title="Underline (Ctrl+U)">
                        <span class="material-symbols-outlined">format_underlined</span>
                      </button>
                      <button type="button" class="tool-btn" [disabled]="showHtmlSource" (click)="execFormat('strikeThrough')" title="Strikethrough">
                        <span class="material-symbols-outlined">strikethrough_s</span>
                      </button>
                      <button type="button" class="tool-btn text-muted" [disabled]="showHtmlSource" (click)="cleanFormatting()" title="Clear Formatting">
                        <span class="material-symbols-outlined">format_clear</span>
                      </button>
                    </div>

                    <div class="toolbar-sep"></div>

                    <div class="toolbar-group">
                      <select [disabled]="showHtmlSource" (change)="onHeadingChange($event)" class="tool-select" title="Paragraph / Headings">
                        <option value="p">Paragraph</option>
                        <option value="h1">Heading 1</option>
                        <option value="h2">Heading 2</option>
                        <option value="h3">Heading 3</option>
                        <option value="h4">Heading 4</option>
                        <option value="h5">Heading 5</option>
                        <option value="h6">Heading 6</option>
                      </select>

                      <select [disabled]="showHtmlSource" (change)="onFontSizeChange($event)" class="tool-select" title="Font Size">
                        <option value="3">Size: Normal</option>
                        <option value="1">Size: 8pt</option>
                        <option value="2">Size: 10pt</option>
                        <option value="4">Size: 14pt</option>
                        <option value="5">Size: 18pt</option>
                        <option value="6">Size: 24pt</option>
                        <option value="7">Size: 36pt</option>
                      </select>
                    </div>

                    <div class="toolbar-sep"></div>

                    <div class="toolbar-group">
                      <button type="button" class="tool-btn" [disabled]="showHtmlSource" (click)="execFormat('justifyLeft')" title="Align Left">
                        <span class="material-symbols-outlined">format_align_left</span>
                      </button>
                      <button type="button" class="tool-btn" [disabled]="showHtmlSource" (click)="execFormat('justifyCenter')" title="Align Center">
                        <span class="material-symbols-outlined">format_align_center</span>
                      </button>
                      <button type="button" class="tool-btn" [disabled]="showHtmlSource" (click)="execFormat('justifyRight')" title="Align Right">
                        <span class="material-symbols-outlined">format_align_right</span>
                      </button>
                      <button type="button" class="tool-btn" [disabled]="showHtmlSource" (click)="execFormat('justifyFull')" title="Justify">
                        <span class="material-symbols-outlined">format_align_justify</span>
                      </button>
                    </div>

                    <div class="toolbar-sep"></div>

                    <div class="toolbar-group">
                      <button type="button" class="tool-btn" [disabled]="showHtmlSource" (click)="execFormat('insertUnorderedList')" title="Bullet List">
                        <span class="material-symbols-outlined">format_list_bulleted</span>
                      </button>
                      <button type="button" class="tool-btn" [disabled]="showHtmlSource" (click)="execFormat('insertOrderedList')" title="Numbered List">
                        <span class="material-symbols-outlined">format_list_numbered</span>
                      </button>
                      <button type="button" class="tool-btn" [disabled]="showHtmlSource" (click)="execFormat('outdent')" title="Outdent">
                        <span class="material-symbols-outlined">format_indent_decrease</span>
                      </button>
                      <button type="button" class="tool-btn" [disabled]="showHtmlSource" (click)="execFormat('indent')" title="Indent">
                        <span class="material-symbols-outlined">format_indent_increase</span>
                      </button>
                      <button type="button" class="tool-btn" [disabled]="showHtmlSource" (click)="insertBlockquote()" title="Quote Block">
                        <span class="material-symbols-outlined">format_quote</span>
                      </button>
                      <button type="button" class="tool-btn" [disabled]="showHtmlSource" (click)="execFormat('insertHorizontalRule')" title="Divider Line">
                        <span class="material-symbols-outlined">horizontal_rule</span>
                      </button>
                    </div>

                    <div class="toolbar-sep"></div>

                    <div class="toolbar-group">
                      <button type="button" class="tool-btn" [disabled]="showHtmlSource" (click)="insertLink()" title="Insert Link">
                        <span class="material-symbols-outlined">link</span>
                      </button>
                      <button type="button" class="tool-btn" [disabled]="showHtmlSource" (click)="execFormat('unlink')" title="Remove Link">
                        <span class="material-symbols-outlined">link_off</span>
                      </button>
                    </div>

                    <div class="toolbar-spacer"></div>

                    <!-- Clean Styles / Normalize Button -->
                    <div class="toolbar-group">
                      <button
                        type="button"
                        class="tool-btn tool-btn-clean"
                        [disabled]="showHtmlSource"
                        (click)="cleanColorsAndFonts()"
                        title="Clean all inline colors, backgrounds, and font overrides">
                        <span class="material-symbols-outlined">cleaning_services</span>
                        <span class="btn-label-text">Clean Styles</span>
                      </button>
                    </div>

                    <div class="toolbar-sep"></div>

                    <!-- Summernote Code View (<>) Button -->
                    <div class="toolbar-group">
                      <button
                        type="button"
                        class="tool-btn tool-btn-codeview"
                        [class.active]="showHtmlSource"
                        (click)="toggleCodeView()"
                        title="Code View / HTML Source">
                        <span class="material-symbols-outlined">code</span>
                        <span class="btn-label-text">{{ showHtmlSource ? 'Visual' : 'Code' }}</span>
                      </button>
                    </div>
                  </div>

                  <!-- WYSIWYG Editable Canvas (with automatic paste cleaner) -->
                  <div
                    #moreDescCanvas
                    *ngIf="!showHtmlSource"
                    class="editor-canvas"
                    contenteditable="true"
                    (input)="onCanvasInput()"
                    (blur)="onCanvasInput()"
                    (paste)="onPaste($event)"
                    data-placeholder="Write detailed expanded description, formatted bullets, program outcomes, or full specifications...">
                  </div>

                  <!-- Raw HTML Source Code Editor -->
                  <textarea
                    *ngIf="showHtmlSource"
                    rows="10"
                    [(ngModel)]="item.moreDescription"
                    (input)="onCanvasInput()"
                    class="form-control source-textarea"
                    placeholder="<p>Write or paste custom HTML code here...</p>">
                  </textarea>
                </div>
                <small class="help-text">Summernote-compatible WYSIWYG rich text editor with auto-paste cleaner (removes inline font families, sizes, &amp; colors) and integrated Code View.</small>
              </div>
            </div>
          </div>

          <!-- Card 2: Action Buttons & Direct Links -->
          <div class="cms-card">
            <div class="card-header-bar">
              <div>
                <h3>Action Buttons & Direct Links</h3>
                <p class="card-sub">Clickable primary and optional secondary CTA triggers for this card or slide.</p>
              </div>
            </div>

            <div class="cta-sections-stack">
              <!-- Group 1: Primary Action Button -->
              <div class="cta-subcard">
                <div class="cta-subcard-header">
                  <div class="cta-badge-title">
                    <span class="cta-num-badge primary">1</span>
                    <div>
                      <strong>Primary Action Button</strong>
                      <span class="cta-sub">Main call-to-action button rendered inside this repeating card or slide.</span>
                    </div>
                  </div>
                </div>

                <div class="form-grid">
                  <div class="form-group">
                    <label>BUTTON TEXT</label>
                    <input type="text" [(ngModel)]="item.buttonText" class="form-control" placeholder="e.g. View Program, Learn More">
                  </div>

                  <div class="form-group">
                    <label>QUICK PICK PAGE</label>
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

                  <div class="form-group full-width">
                    <label>DESTINATION LINK URL</label>
                    <div class="input-with-file-btn">
                      <input
                        type="text"
                        [(ngModel)]="item.buttonLink"
                        class="form-control"
                        placeholder="Select page, choose file, or type direct URL (e.g. /, /about, https://...)">
                      <button type="button" class="btn-choose-file" (click)="openFilePicker('primary')" title="Pick an uploaded file from File Manager">
                        <span class="material-symbols-outlined fs-6">folder_open</span>
                        <span>Choose File</span>
                      </button>
                    </div>
                    <small class="help-text">Select from root (/), web pages, system pages, or choose an uploaded file, or freely type any custom direct/anchor link.</small>
                  </div>
                </div>
              </div>

              <!-- Group 2: Secondary Action Button (Dual CTA) -->
              <div class="cta-subcard">
                <div class="cta-subcard-header">
                  <div class="cta-badge-title">
                    <span class="cta-num-badge secondary">2</span>
                    <div>
                      <strong>Secondary Action Button <span class="optional-tag">Optional Dual CTA</span></strong>
                      <span class="cta-sub">Additional secondary button when the hero slide or card template supports two buttons.</span>
                    </div>
                  </div>
                </div>

                <div class="form-grid">
                  <div class="form-group">
                    <label>BUTTON TEXT</label>
                    <input type="text" [(ngModel)]="item.secondButtonText" class="form-control" placeholder="e.g. Download Brochure, Watch Demo">
                  </div>

                  <div class="form-group">
                    <label>QUICK PICK PAGE</label>
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

                  <div class="form-group full-width">
                    <label>DESTINATION LINK URL</label>
                    <div class="input-with-file-btn">
                      <input
                        type="text"
                        [(ngModel)]="item.secondButtonLink"
                        class="form-control"
                        placeholder="Select page, choose file, or type direct URL (e.g. /contact, https://...)">
                      <button type="button" class="btn-choose-file" (click)="openFilePicker('secondary')" title="Pick an uploaded file from File Manager">
                        <span class="material-symbols-outlined fs-6">folder_open</span>
                        <span>Choose File</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Card 3: Media Uploads -->
          <div class="cms-card">
            <div class="card-header-bar">
              <div>
                <h3>Media Image & Video Assets</h3>
                <p class="card-sub">Type URL or upload image and video files.</p>
              </div>
            </div>
            <div class="form-grid">
              <!-- Image Upload / URL -->
              <div class="form-group full-width">
                <label>IMAGE (TYPE URL OR UPLOAD IMAGE)</label>
                <div class="input-with-upload">
                  <input type="text" [(ngModel)]="item.imageUrl" class="form-control" placeholder="e.g. https://yourdomain.com/card-image.jpg">
                  <label class="btn-upload" [class.uploading]="uploadingImage">
                    <input type="file" (change)="uploadImage($event)" accept="image/*" style="display:none">
                    <span class="material-symbols-outlined">cloud_upload</span>
                    <span>{{ uploadingImage ? 'Uploading...' : 'Upload Image' }}</span>
                  </label>
                </div>
              </div>

              <div class="form-group full-width" *ngIf="item.imageUrl">
                <div class="image-preview-box">
                  <img [src]="item.imageUrl" alt="Sub-Item Preview">
                  <button type="button" class="btn-remove-img" (click)="item.imageUrl = ''; item.imageKey = ''" title="Remove Image">&times;</button>
                </div>
              </div>

              <!-- Video Upload / URL -->
              <div class="form-group full-width">
                <label>VIDEO (TYPE URL OR UPLOAD VIDEO)</label>
                <div class="input-with-upload">
                  <input type="text" [(ngModel)]="item.videoUrl" class="form-control" placeholder="e.g. https://yourdomain.com/clip.mp4">
                  <label class="btn-upload" [class.uploading]="uploadingVideo">
                    <input type="file" (change)="uploadVideo($event)" accept="video/*" style="display:none">
                    <span class="material-symbols-outlined">video_file</span>
                    <span>{{ uploadingVideo ? 'Uploading...' : 'Upload Video' }}</span>
                  </label>
                </div>
              </div>

              <div class="form-group full-width" *ngIf="item.videoUrl">
                <div class="video-preview-row">
                  <span class="material-symbols-outlined" style="color:#0050e5; font-size:20px;">play_circle</span>
                  <span class="video-preview-url">{{ item.videoUrl }}</span>
                  <button type="button" class="btn-remove-video" (click)="item.videoUrl = ''; item.videoKey = ''" title="Remove Video">&times;</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Side Column -->
        <div class="side-column">
          <!-- Placement & Order -->
          <div class="cms-card">
            <div class="card-header-bar">
              <div>
                <h3>Placement & Sequence</h3>
                <p class="card-sub">Layout order and status.</p>
              </div>
            </div>

            <div class="form-group">
              <div class="label-with-action">
                <label>PARENT SECTION</label>
                <a
                  *ngIf="activeTemplateRouteTarget"
                  [routerLink]="['/content/console/templates/visuals', activeTemplateRouteTarget]"
                  target="_blank"
                  class="link-edit-template"
                  title="Edit parent section template in Visual Template Studio (opens in new tab)">
                  <span class="material-symbols-outlined fs-6">edit_note</span>
                  <span>Edit Template</span>
                  <span class="material-symbols-outlined open-ext-icon">open_in_new</span>
                </a>
              </div>
              <select [(ngModel)]="item.pageSectionId" (ngModelChange)="onParentSectionChange($event)" class="form-control" [disabled]="!isEditMode && parentSection">
                <option [ngValue]="null">-- Select Layout Section --</option>
                <option *ngFor="let s of allSections" [ngValue]="s.id">{{ s.title || '(Untitled Section)' }} ({{ s.templateKey || 'Block' }})</option>
              </select>

              <!-- Active Parent Section Template Quick-Edit Card -->
              <div class="active-template-card" *ngIf="selectedParentSection?.templateKey">
                <div class="active-template-details">
                  <span class="material-symbols-outlined active-template-icon">palette</span>
                  <div class="active-template-meta">
                    <span class="template-title">{{ activeInstalledTemplate?.name || selectedParentSection?.title || 'Active Design Blueprint' }}</span>
                    <span class="template-sub">
                      <code>{{ activeInstalledTemplate?.variantCode || activeInstalledTemplate?.templateKey || selectedParentSection?.templateKey }}</code>
                      <span class="category-pill" *ngIf="activeInstalledTemplate?.categoryKey || activeInstalledTemplate?.category">
                        [{{ activeInstalledTemplate?.categoryKey || activeInstalledTemplate?.category }}]
                      </span>
                    </span>
                  </div>
                </div>
                <a
                  [routerLink]="['/content/console/templates/visuals', activeTemplateRouteTarget]"
                  target="_blank"
                  class="btn-edit-template-pill"
                  title="Open this template in Visual Template Studio (opens in new tab)">
                  <span class="material-symbols-outlined fs-6">edit</span>
                  <span>Edit Template</span>
                  <span class="material-symbols-outlined fs-6">open_in_new</span>
                </a>
              </div>
            </div>

            <div class="form-group" style="margin-top:12px;">
              <label>SORT ORDER</label>
              <input type="number" [(ngModel)]="item.sortOrder" class="form-control">
              <small class="help-text">Sub-items display in ascending sequence (1, 2, 3...).</small>
            </div>

            <div class="form-group" style="margin-top:12px;">
              <label>CUSTOM CSS CLASS</label>
              <input type="text" [(ngModel)]="item.customClass" class="form-control" placeholder="e.g. shadow-lg rounded-2xl">
            </div>

            <div class="toggles-list" style="margin-top:14px;">
              <label class="toggle-card">
                <input type="checkbox" [(ngModel)]="item.disable">
                <div class="toggle-info">
                  <strong>Disable Sub-Item</strong>
                  <p>Hides this card from the rendered layout block.</p>
                </div>
              </label>
            </div>
          </div>

          <!-- Breaking News Ribbon -->
          <div class="cms-card">
            <div class="card-header-bar">
              <div>
                <h3>Breaking News Ribbon</h3>
                <p class="card-sub">Marquee ticker integration.</p>
              </div>
            </div>
            <div class="toggles-list">
              <label class="toggle-card">
                <input type="checkbox" [(ngModel)]="item.addToRibon">
                <div class="toggle-info">
                  <strong>Add to News Ribbon</strong>
                  <p>Broadcasts headline to top ticker.</p>
                </div>
              </label>
            </div>

            <div class="form-group" style="margin-top:12px;" *ngIf="item.addToRibon">
              <label>RIBBON DISPLAY TITLE</label>
              <input type="text" [(ngModel)]="item.ribonCustomDisplayTitle" class="form-control" placeholder="Headline...">
            </div>

            <div class="form-group" style="margin-top:12px;" *ngIf="item.addToRibon">
              <label>RIBBON SORT ORDER</label>
              <input type="number" [(ngModel)]="item.ribonSortOrder" class="form-control">
            </div>
          </div>
        </div>
      </div>

      <app-file-picker-modal
        [isOpen]="filePickerOpen"
        [title]="filePickerTitle"
        (closed)="filePickerOpen = false"
        (fileSelected)="onFilePicked($event)"
      ></app-file-picker-modal>
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

    /* Live Icon Preview Field */
    .icon-label-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .badge-icon-type {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      padding: 2px 8px;
      border-radius: 999px;
      background: #eff6ff;
      color: #0050e5;
      border: 1px solid #bfdbfe;
    }
    .badge-icon-type.badge-image {
      background: #f0fdf4;
      color: #16a34a;
      border-color: #bbf7d0;
    }
    .icon-input-group {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .icon-preview-box {
      width: 42px;
      height: 42px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      color: #0050e5;
      font-size: 18px;
      overflow: hidden;
      box-shadow: inset 0 1px 2px rgba(0,0,0,0.04);
    }
    .icon-preview-box .preview-img {
      max-width: 26px;
      max-height: 26px;
      object-fit: contain;
    }
    .icon-preview-box .preview-icon {
      font-size: 18px;
      color: #0050e5;
    }
    .icon-preview-box .preview-empty {
      font-size: 18px;
      color: #94a3b8;
    }
    .icon-input-field {
      flex: 1;
    }

    /* Summernote-style WYSIWYG Editor Frame */
    .summernote-wrapper {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      overflow: hidden;
      background: #fff;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .summernote-wrapper:focus-within {
      border-color: #0050e5;
      box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.08);
    }
    .summernote-wrapper.codeview-active {
      border-color: #334155;
    }

    .rich-toolbar {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 3px;
      background: #f8fafc;
      border-bottom: 1px solid #cbd5e1;
      padding: 6px 8px;
    }
    .toolbar-group {
      display: flex;
      align-items: center;
      gap: 2px;
    }
    .toolbar-spacer {
      flex: 1;
      min-width: 8px;
    }
    .toolbar-sep {
      width: 1px;
      height: 22px;
      background: #cbd5e1;
      margin: 0 4px;
    }
    .tool-btn {
      background: none;
      border: 1px solid transparent;
      padding: 5px 7px;
      border-radius: 5px;
      cursor: pointer;
      color: #334155;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      font-size: 12px;
      font-weight: 500;
      transition: all 0.15s;
    }
    .tool-btn:hover:not([disabled]) {
      background: #e2e8f0;
      color: #0050e5;
    }
    .tool-btn[disabled] {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .tool-btn .material-symbols-outlined {
      font-size: 18px;
    }
    .tool-btn-codeview.active {
      background: #0050e5;
      color: #ffffff;
      border-color: #0050e5;
    }
    .tool-btn-codeview.active:hover {
      background: #003db3;
      color: #ffffff;
    }
    .tool-btn-clean {
      color: #0050e5;
    }
    .tool-btn-clean:hover:not([disabled]) {
      background: #eff6ff;
      border-color: #bfdbfe;
    }
    .btn-label-text {
      font-size: 11px;
      font-weight: 600;
    }
    .tool-select {
      background: #fff;
      border: 1px solid #cbd5e1;
      border-radius: 5px;
      padding: 4px 8px;
      font-size: 12px;
      color: #334155;
      font-weight: 500;
      cursor: pointer;
    }
    .tool-select:focus {
      outline: none;
      border-color: #0050e5;
    }
    .tool-select[disabled] {
      opacity: 0.5;
      cursor: not-allowed;
      background: #f1f5f9;
    }

    .editor-canvas {
      min-height: 200px;
      max-height: 480px;
      overflow-y: auto;
      padding: 16px;
      background: #fff;
      border: none;
      font-size: 14px;
      line-height: 1.7;
      color: #1e293b;
      outline: none;
    }
    .editor-canvas:empty:before {
      content: attr(data-placeholder);
      color: #94a3b8;
      pointer-events: none;
    }
    .source-textarea {
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: 12px;
      line-height: 1.6;
      background: #0f172a;
      color: #38bdf8;
      border: none;
      border-radius: 0;
      width: 100%;
      min-height: 220px;
      padding: 16px;
      outline: none;
      resize: vertical;
    }

    /* CTA Subcards & File Picker Combo */
    .cta-sections-stack { display: flex; flex-direction: column; gap: 16px; }
    .cta-subcard {
      background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px;
    }
    .cta-subcard-header {
      display: flex; justify-content: space-between; align-items: center; gap: 12px;
      margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid #e2e8f0;
    }
    .cta-badge-title { display: flex; align-items: center; gap: 10px; }
    .cta-badge-title > div { display: flex; flex-direction: column; gap: 2px; }
    .cta-badge-title strong { font-size: 13.5px; color: #0f172a; display: flex; align-items: center; gap: 8px; }
    .cta-sub { font-size: 11.5px; color: #64748b; }
    .cta-num-badge {
      width: 26px; height: 26px; border-radius: 8px; display: inline-flex;
      align-items: center; justify-content: center; font-size: 12px; font-weight: 800; flex-shrink: 0;
    }
    .cta-num-badge.primary { background: #0050e5; color: #fff; }
    .cta-num-badge.secondary { background: #e2e8f0; color: #334155; }
    .optional-tag {
      font-size: 10px; font-weight: 700; text-transform: uppercase;
      padding: 2px 7px; border-radius: 999px; background: #e2e8f0; color: #475569;
    }
    .link-select {
      background-color: #fff; border-color: #cbd5e1;
      color: #334155; font-weight: 500; cursor: pointer;
    }
    .input-with-file-btn {
      display: flex; gap: 10px; align-items: stretch;
    }
    .input-with-file-btn .form-control { flex: 1; min-width: 0; }
    .btn-choose-file {
      display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 0 14px;
      background: #eff6ff; color: #0050e5; border: 1px solid #bfdbfe; border-radius: 8px;
      font-size: 12.5px; font-weight: 700; cursor: pointer; white-space: nowrap;
      transition: all 0.15s ease; flex-shrink: 0;
    }
    .btn-choose-file:hover { background: #dbeafe; border-color: #93c5fd; }
    @media (max-width: 640px) {
      .input-with-file-btn { flex-direction: column; align-items: stretch; }
      .btn-choose-file { min-height: 38px; }
    }

    .video-preview-row {
      display: flex; align-items: center; gap: 10px; padding: 10px 14px;
      background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;
    }
    .video-preview-url {
      flex: 1; font-size: 12px; color: #0f172a; overflow: hidden;
      text-overflow: ellipsis; white-space: nowrap; font-family: monospace;
    }
    .btn-remove-video {
      background: none; border: none; font-size: 20px; color: #dc2626;
      cursor: pointer; line-height: 1; padding: 0 4px;
    }
    .btn-remove-video:hover { color: #b91c1c; }

    .input-with-upload { display: flex; gap: 10px; }
    .input-with-upload input { flex: 1; }
    .btn-upload {
      display: inline-flex; align-items: center; gap: 6px; padding: 10px 16px;
      background: #eff6ff; color: #0050e5; border-radius: 8px; font-size: 13px; font-weight: 600;
      cursor: pointer; white-space: nowrap; border: 1px solid #bfdbfe; transition: all 0.2s;
    }
    .btn-upload:hover { background: #dbeafe; }
    .btn-upload.uploading { background: #cbd5e1; cursor: wait; }

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
    .label-with-action {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }
    .label-with-action label {
      margin-bottom: 0;
    }
    .link-edit-template {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11.5px;
      font-weight: 700;
      color: #0050e5;
      text-decoration: none;
      transition: color 0.15s;
    }
    .link-edit-template:hover {
      color: #003ebd;
      text-decoration: underline;
    }
    .link-edit-template .open-ext-icon {
      font-size: 13px;
    }
    .active-template-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-top: 10px;
      padding: 10px 12px;
      background: #f0f7ff;
      border: 1px solid #bfdbfe;
      border-radius: 10px;
    }
    .active-template-details {
      display: flex;
      align-items: center;
      gap: 10px;
      flex: 1;
      min-width: 0;
    }
    .active-template-icon {
      font-size: 20px;
      color: #0050e5;
      flex-shrink: 0;
    }
    .active-template-meta {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .template-title {
      font-size: 12.5px;
      font-weight: 700;
      color: #0f172a;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .template-sub {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 2px;
      flex-wrap: wrap;
    }
    .template-sub code {
      font-size: 11px;
      color: #1e40af;
      background: #dbeafe;
      padding: 1px 5px;
      border-radius: 4px;
    }
    .category-pill {
      font-size: 10.5px;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
    }
    .btn-edit-template-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 6px 10px;
      background: #0050e5;
      color: #ffffff;
      border-radius: 8px;
      font-size: 11.5px;
      font-weight: 700;
      text-decoration: none;
      white-space: nowrap;
      flex-shrink: 0;
      transition: background 0.15s, transform 0.15s;
    }
    .btn-edit-template-pill:hover {
      background: #003ebd;
      transform: translateY(-1px);
    }
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

    .loading-box { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px; color: #64748b; }
    .spin { animation: spin 1s linear infinite; font-size: 32px; color: #0050e5; margin-bottom: 12px; }
    @keyframes spin { 100% { transform: rotate(360deg); } }
  `]
})
export class PageSectionListEditComponent implements OnInit, AfterViewInit {
  @ViewChild('moreDescCanvas') moreDescCanvasRef!: ElementRef;

  itemId = '';
  isEditMode = false;
  item: any = null;
  parentSection: any = null;
  allSections: any[] = [];
  installedTemplates: any[] = [];

  /// <summary>
  /// Resolves the active parent PageSection either from allSections (matching item.pageSectionId) or the loaded parentSection.
  /// </summary>
  get selectedParentSection(): any {
    const targetId = this.item?.pageSectionId;
    if (targetId && Array.isArray(this.allSections) && this.allSections.length > 0) {
      const matched = this.allSections.find((s: any) => s.id === targetId);
      if (matched) return matched;
    }
    return this.parentSection;
  }

  /// <summary>
  /// Resolves the active installed template object matching the parent section's templateKey.
  /// </summary>
  get activeInstalledTemplate(): any {
    const rawKey = this.selectedParentSection?.templateKey;
    if (!rawKey) return null;
    const key = rawKey.trim().toLowerCase();
    return (this.installedTemplates || []).find((t: any) =>
      (t.templateKey && t.templateKey.trim().toLowerCase() === key) ||
      (t.variantCode && t.variantCode.trim().toLowerCase() === key) ||
      (t.id && t.id.toString().toLowerCase() === key)
    );
  }

  /// <summary>
  /// Resolves the route target parameter for opening the active template in Visual Template Studio.
  /// </summary>
  get activeTemplateRouteTarget(): string {
    if (this.activeInstalledTemplate) {
      return this.activeInstalledTemplate.id || this.activeInstalledTemplate.variantCode || this.activeInstalledTemplate.templateKey;
    }
    return this.selectedParentSection?.templateKey || '';
  }

  showHtmlSource = false;
  loading = false;
  saving = false;
  uploadingImage = false;
  uploadingVideo = false;

  get headerEyebrow(): string {
    return this.parentSection
      ? `CMS Studio / Page Sections / ${this.parentSection.title}`
      : 'CMS Studio / Page Sections';
  }

  get headerTitle(): string {
    return this.isEditMode
      ? `Edit Sub-Item: ${this.item?.title || 'Card Item'}`
      : `Add Sub-Item to ${this.parentSection?.title || 'Section'}`;
  }

  get headerButtons(): PageHeaderButton[] {
    const btns: PageHeaderButton[] = [
      {
        text: 'Back to Pages',
        icon: 'auto_stories',
        routerLink: '/content/console/pages'
      }
    ];

    if (this.parentSection?.webPageId) {
      btns.push({
        text: 'Page Sections',
        icon: 'layers',
        routerLink: `/content/console/pages/details/${this.parentSection.webPageId}`
      });
    }

    if (this.item?.pageSectionId) {
      btns.push({
        text: 'Section Items',
        icon: 'view_list',
        routerLink: `/content/console/sections/details/${this.item.pageSectionId}`
      });
    }

    btns.push({
      text: 'All Sections',
      icon: 'dashboard',
      routerLink: '/content/console/sections'
    });

    btns.push({
      text: this.saving ? (this.isEditMode ? 'Saving...' : 'Creating...') : (this.isEditMode ? 'Save Changes' : 'Create Sub-Item'),
      icon: 'save',
      isPrimary: true,
      disabled: this.saving || this.loading,
      loading: this.saving,
      action: () => this.saveItem()
    });

    return btns;
  }

  allPages: any[] = [];
  publishedPagesList: { title: string; url: string }[] = [];
  filePickerOpen = false;
  filePickerTarget: 'primary' | 'secondary' = 'primary';

  /**
   * Returns a contextual modal heading based on which button slot is picking a file.
   */
  get filePickerTitle(): string {
    return this.filePickerTarget === 'secondary'
      ? 'Choose File for Secondary Action Button'
      : 'Choose File for Primary Action Button';
  }

  systemPages: { name: string; url: string }[] = [
    { name: 'Member Sign In / Portal', url: '/auth/login' },
    { name: 'Member Registration', url: '/auth/register' },
    { name: 'News & Blog Articles', url: '/blog' },
    { name: 'Commerce Storefront', url: '/store' },
    { name: 'Contact Us', url: '/contact' },
    { name: 'Service & Project Request', url: '/service-request' },
    { name: 'Committees & Working Groups', url: '/join-committee' }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    const rawId = this.route.snapshot.paramMap.get('id') || '';
    const isCreatePath = this.route.snapshot.url.some(s => s.path === 'create');

    if (!isCreatePath && rawId && rawId !== 'create') {
      this.isEditMode = true;
      this.itemId = rawId;
      this.loadItem();
    } else {
      this.isEditMode = false;
      this.itemId = '';
      this.initNewItem();
    }

    this.loadAllSections();
    this.loadAllPages();
    this.loadInstalledTemplates();
  }

  ngAfterViewInit(): void {
    this.syncCanvasWithHtml();
  }

  private initNewItem(): void {
    const parentSectionIdQuery = this.route.snapshot.queryParams['pageSectionId'] || null;

    this.item = {
      title: '',
      miniTitle: '',
      iconText: 'fa-solid fa-star',
      description: '',
      moreDescription: '',
      buttonText: '',
      buttonLink: '',
      secondButtonText: '',
      secondButtonLink: '',
      directUrl: '',
      imageUrl: '',
      imageKey: '',
      videoUrl: '',
      videoKey: '',
      customClass: '',
      sortOrder: 1,
      disable: false,
      addToRibon: false,
      ribonCustomDisplayTitle: '',
      ribonSortOrder: 0,
      pageSectionId: parentSectionIdQuery
    };

    if (parentSectionIdQuery) {
      this.loadParentSection(parentSectionIdQuery);
    }
  }

  loadParentSection(sectionId: string): void {
    this.api.get<any>(`ContentApi/sections/${sectionId}`).subscribe({
      next: (res) => {
        this.parentSection = res?.data;
        const subItems = this.parentSection?.pageSectionLists || [];
        if (subItems.length > 0) {
          const maxSort = Math.max(...subItems.map((i: any) => i.sortOrder || 0));
          this.item.sortOrder = maxSort + 1;
        }
      },
      error: () => {}
    });
  }

  loadAllSections(): void {
    this.api.get<any>('ContentApi/sections').subscribe({
      next: (res) => {
        this.allSections = res?.data || [];
      },
      error: () => {}
    });
  }

  /// <summary>
  /// Loads installed tenant templates so the parent section's active template can be linked for direct editing.
  /// </summary>
  loadInstalledTemplates(): void {
    this.api.get<any>('ContentApi/templates/installed').subscribe({
      next: (res) => {
        if (res?.data && Array.isArray(res.data)) {
          this.installedTemplates = res.data;
        }
      },
      error: () => {}
    });
  }

  /// <summary>
  /// Keeps parentSection synchronized when switching the parent section dropdown.
  /// </summary>
  onParentSectionChange(sectionId: string | null): void {
    if (!sectionId) {
      this.parentSection = null;
      return;
    }
    const matched = (this.allSections || []).find((s: any) => s.id === sectionId);
    if (matched) {
      this.parentSection = matched;
    } else {
      this.loadParentSection(sectionId);
    }
  }

  loadAllPages(): void {
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
      error: () => {}
    });
  }

  onButtonLinkSelect(event: any, target: 'primary' | 'secondary' = 'primary'): void {
    const val = event.target?.value;
    if (val) {
      if (target === 'secondary') {
        this.item.secondButtonLink = val;
      } else {
        this.item.buttonLink = val;
      }
    }
  }

  /**
   * Opens the File Manager picker modal for the chosen sub-item button link field.
   * @param target Identifies whether the primary or secondary button URL should be populated.
   */
  openFilePicker(target: 'primary' | 'secondary' = 'primary'): void {
    this.filePickerTarget = target;
    this.filePickerOpen = true;
  }

  /**
   * Inserts the chosen File Manager file URL into the active sub-item button link field.
   * @param file Selected file record from File Manager.
   */
  onFilePicked(file: any): void {
    if (!file?.fileUrl || !this.item) return;
    if (this.filePickerTarget === 'secondary') {
      this.item.secondButtonLink = file.fileUrl;
    } else {
      this.item.buttonLink = file.fileUrl;
    }
    this.toast.success(`Inserted URL for "${file.fileName}".`);
  }

  loadItem(): void {
    this.loading = true;
    this.api.get<any>(`ContentApi/section-lists/${this.itemId}`).subscribe({
      next: (res) => {
        this.loading = false;
        this.item = res?.data;
        if (this.item?.pageSectionId) {
          this.loadParentSection(this.item.pageSectionId);
        }
        this.syncCanvasWithHtml();
      },
      error: () => {
        this.loading = false;
        this.toast.error('Failed to load sub-item details.');
      }
    });
  }

  // --- WYSIWYG Summernote Rich Text Editor Engine ---

  /// <summary>
  /// Synchronizes the visual contenteditable canvas with the underlying HTML model.
  /// </summary>
  syncCanvasWithHtml(): void {
    setTimeout(() => {
      if (this.moreDescCanvasRef?.nativeElement && this.item) {
        this.moreDescCanvasRef.nativeElement.innerHTML = this.item.moreDescription || '';
      }
    }, 100);
  }

  /// <summary>
  /// Synchronizes the canvas DOM innerHTML back to the item.moreDescription model property.
  /// </summary>
  onCanvasInput(): void {
    if (this.moreDescCanvasRef?.nativeElement && this.item) {
      this.item.moreDescription = this.moreDescCanvasRef.nativeElement.innerHTML;
    }
  }

  /// <summary>
  /// Toggles between the visual WYSIWYG editor canvas and the raw HTML Source Code View.
  /// </summary>
  toggleCodeView(): void {
    if (!this.showHtmlSource) {
      this.onCanvasInput();
      this.showHtmlSource = true;
    } else {
      this.showHtmlSource = false;
      this.syncCanvasWithHtml();
    }
  }

  /// <summary>
  /// Sets the active editor view mode (Visual vs HTML Source).
  /// </summary>
  /// <param name="isHtml">True for HTML Source view, false for Visual Editor.</param>
  setEditorMode(isHtml: boolean): void {
    if (isHtml === this.showHtmlSource) return;
    this.toggleCodeView();
  }

  /// <summary>
  /// Intercepts clipboard paste events on the rich text canvas and strips all inline
  /// text colors, background colors, font sizes, font families, and vendor office styles.
  /// </summary>
  /// <param name="event">The clipboard paste event.</param>
  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const clipboardData = event.clipboardData;
    if (!clipboardData) return;

    const htmlData = clipboardData.getData('text/html');
    if (htmlData) {
      const sanitized = this.stripColorsAndFonts(htmlData);
      this.insertSanitizedHtml(sanitized);
    } else {
      const plainText = clipboardData.getData('text/plain') || '';
      document.execCommand('insertText', false, plainText);
    }
    this.onCanvasInput();
  }

  /// <summary>
  /// Sanitizes an HTML fragment by stripping all inline font family, font size, text color,
  /// background color, and vendor office/mso properties while retaining semantic tags.
  /// </summary>
  /// <param name="rawHtml">The raw HTML string from the clipboard or canvas.</param>
  /// <returns>A sanitized HTML string matching website theme styling.</returns>
  stripColorsAndFonts(rawHtml: string): string {
    if (!rawHtml) return '';
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(rawHtml, 'text/html');

      // 1. Remove non-content or dangerous tags
      const junkTags = ['script', 'style', 'meta', 'link', 'xml', 'o:p'];
      junkTags.forEach(tag => {
        doc.body.querySelectorAll(tag).forEach(el => el.remove());
      });

      // 2. Iterate all elements and scrub style attributes
      const allElements = doc.body.querySelectorAll('*');
      allElements.forEach((el: Element) => {
        const htmlEl = el as HTMLElement;

        // Strip legacy font tag attributes
        if (htmlEl.tagName.toLowerCase() === 'font') {
          htmlEl.removeAttribute('color');
          htmlEl.removeAttribute('face');
          htmlEl.removeAttribute('size');
        }

        // Scrub inline styles
        if (htmlEl.style) {
          htmlEl.style.removeProperty('color');
          htmlEl.style.removeProperty('background');
          htmlEl.style.removeProperty('background-color');
          htmlEl.style.removeProperty('font-family');
          htmlEl.style.removeProperty('font-size');
          htmlEl.style.removeProperty('line-height');
          htmlEl.style.removeProperty('letter-spacing');

          // Strip vendor/MSO prefixes
          const toRemove: string[] = [];
          for (let i = 0; i < htmlEl.style.length; i++) {
            const prop = htmlEl.style[i];
            if (prop.startsWith('mso-') || prop.startsWith('-webkit-text') || prop.startsWith('-webkit-font')) {
              toRemove.push(prop);
            }
          }
          toRemove.forEach(p => htmlEl.style.removeProperty(p));

          const cleanStyle = htmlEl.getAttribute('style')?.trim();
          if (!cleanStyle || cleanStyle === ';' || cleanStyle === '') {
            htmlEl.removeAttribute('style');
          }
        }

        // Strip vendor/office class names
        const cls = htmlEl.getAttribute('class');
        if (cls && (cls.includes('Mso') || cls.includes('Apple-') || cls.includes('gmail_'))) {
          htmlEl.removeAttribute('class');
        }
      });

      return doc.body.innerHTML;
    } catch {
      return rawHtml;
    }
  }

  /// <summary>
  /// Inserts sanitized HTML markup into the active selection caret range.
  /// </summary>
  /// <param name="html">The clean HTML snippet to insert.</param>
  insertSanitizedHtml(html: string): void {
    if (document.queryCommandSupported && document.queryCommandSupported('insertHTML')) {
      document.execCommand('insertHTML', false, html);
    } else {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        const el = document.createElement('div');
        el.innerHTML = html;
        const frag = document.createDocumentFragment();
        let node: Node | null;
        let lastNode: Node | null = null;
        while ((node = el.firstChild)) {
          lastNode = frag.appendChild(node);
        }
        range.insertNode(frag);
        if (lastNode) {
          range.setStartAfter(lastNode);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }
    }
  }

  /// <summary>
  /// Strips all existing color, font-family, and font-size overrides from the canvas.
  /// </summary>
  cleanColorsAndFonts(): void {
    if (this.moreDescCanvasRef?.nativeElement) {
      const current = this.moreDescCanvasRef.nativeElement.innerHTML;
      if (current) {
        this.moreDescCanvasRef.nativeElement.innerHTML = this.stripColorsAndFonts(current);
        this.onCanvasInput();
        this.toast.success('Cleaned all inline text colors, fonts, and sizes from content.');
      }
    }
  }

  /// <summary>
  /// Clears standard inline formatting using document.execCommand.
  /// </summary>
  cleanFormatting(): void {
    this.execFormat('removeFormat');
  }

  /// <summary>
  /// Executes a rich text command on the document selection.
  /// </summary>
  /// <param name="command">The DOM command identifier (e.g. 'bold', 'italic').</param>
  /// <param name="value">Optional argument value for the command.</param>
  execFormat(command: string, value: string | undefined = undefined): void {
    document.execCommand(command, false, value);
    this.onCanvasInput();
  }

  /// <summary>
  /// Updates block element heading tag (p, h1-h6).
  /// </summary>
  /// <param name="event">The change event containing the chosen HTML tag.</param>
  onHeadingChange(event: any): void {
    const tag = event.target.value;
    if (tag === 'p') {
      this.execFormat('formatBlock', '<p>');
    } else {
      this.execFormat('formatBlock', `<${tag}>`);
    }
    event.target.value = 'p';
  }

  /// <summary>
  /// Sets relative font size for the current selection.
  /// </summary>
  /// <param name="event">The change event containing the chosen size number.</param>
  onFontSizeChange(event: any): void {
    const size = event.target.value;
    this.execFormat('fontSize', size);
    event.target.value = '3';
  }

  /// <summary>
  /// Wraps current selection in a blockquote element.
  /// </summary>
  insertBlockquote(): void {
    this.execFormat('formatBlock', '<blockquote>');
  }

  /// <summary>
  /// Prompts for a hyperlink URL and creates an anchor tag around selected text.
  /// </summary>
  insertLink(): void {
    const url = prompt('Enter the destination hyperlink URL:', 'https://');
    if (url && url.trim() && url !== 'https://') {
      this.execFormat('createLink', url.trim());
    }
  }

  // --- Image Upload ---
  uploadImage(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;

    this.uploadingImage = true;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'bcp-cms/section-items');

    this.api.post<any>('ContentApi/upload-media', formData).subscribe({
      next: (res) => {
        this.uploadingImage = false;
        if (res?.data?.url) this.item.imageUrl = res.data.url;
        if (res?.data?.key) this.item.imageKey = res.data.key;
        this.toast.success('Image uploaded successfully!');
      },
      error: (err) => {
        this.uploadingImage = false;
        this.toast.error(err?.error?.message || 'Image upload failed.');
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
        if (res?.data?.url) this.item.videoUrl = res.data.url;
        if (res?.data?.key) this.item.videoKey = res.data.key;
        this.toast.success('Video uploaded successfully!');
      },
      error: (err) => {
        this.uploadingVideo = false;
        this.toast.error(err?.error?.message || 'Video upload failed.');
      }
    });
  }

  // --- Save / Create ---
  saveItem(): void {
    if (this.showHtmlSource) {
      // already in moreDescription
    } else {
      this.onCanvasInput();
    }

    this.saving = true;

    if (this.isEditMode) {
      this.api.put<any>(`ContentApi/section-lists/${this.itemId}`, this.item).subscribe({
        next: (res) => {
          this.saving = false;
          this.toast.success(res?.message || 'Sub-item updated successfully!');
          this.goBack();
        },
        error: (err) => {
          this.saving = false;
          this.toast.error(err?.error?.message || 'Failed to update sub-item.');
        }
      });
    } else {
      this.api.post<any>('ContentApi/section-lists', this.item).subscribe({
        next: (res) => {
          this.saving = false;
          this.toast.success(res?.message || 'Sub-item created successfully!');
          this.goBack();
        },
        error: (err) => {
          this.saving = false;
          this.toast.error(err?.error?.message || 'Failed to create sub-item.');
        }
      });
    }
  }

  goBack(): void {
    if (this.item?.pageSectionId) {
      this.router.navigate(['/content/console/sections/details', this.item.pageSectionId]);
    } else {
      this.router.navigate(['/content/console/sections']);
    }
  }

  /**
   * Identifies the category of the icon value (font icon, image asset, or empty).
   * @param val Raw icon string entered by the user.
   * @returns 'font' | 'image' | 'empty'
   */
  getIconKind(val?: string): 'font' | 'image' | 'empty' {
    const raw = (val || '').trim();
    if (!raw) return 'empty';
    if (raw.startsWith('<img') || /^(?:https?:\/\/|\/|\.\/)/i.test(raw) || /\.(?:svg|png|jpe?g|webp|gif|ico)(?:\?.*)?$/i.test(raw)) {
      return 'image';
    }
    return 'font';
  }

  /**
   * Returns a friendly status label for the entered icon.
   * @param val Raw icon string.
   * @returns Human-readable type string.
   */
  getIconTypeLabel(val?: string): string {
    const kind = this.getIconKind(val);
    if (kind === 'image') return 'Image Asset';
    if (kind === 'font') {
      const raw = (val || '').trim();
      if (raw.startsWith('<i')) return 'Font Awesome Tag';
      return 'Font Icon Class';
    }
    return '';
  }

  /**
   * Extracts clean class string for preview rendering (e.g. from <i class="fa-solid fa-star"></i>).
   * @param val Raw icon string.
   * @returns Sanitized CSS class list.
   */
  getCleanIconClass(val?: string): string {
    const raw = (val || '').trim();
    if (!raw) return 'fa-solid fa-star';
    const match = raw.match(/class=["']([^"']+)["']/i);
    if (match) return match[1].trim();
    return raw.replace(/[<>"']/g, '').trim();
  }

  /**
   * Extracts image source URL for preview rendering.
   * @param val Raw icon string.
   * @returns Image source URL.
   */
  getIconSrc(val?: string): string {
    const raw = (val || '').trim();
    if (!raw) return '';
    const match = raw.match(/src=["']([^"']+)["']/i);
    if (match) return match[1].trim();
    return raw;
  }
}
