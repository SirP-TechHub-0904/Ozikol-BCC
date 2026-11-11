import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent, PageHeaderButton } from '../../../shared/components/page-header/page-header.component';
import { FilePickerModalComponent } from '../../../shared/components/file-picker-modal/file-picker-modal.component';

@Component({
  selector: 'app-page-section-edit',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, PageHeaderComponent, FilePickerModalComponent],
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
                <label>FULL EXTENDED DESCRIPTION (RICH TEXT / SUMMERNOTE WYSIWYG)</label>

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
                    #editorCanvas
                    *ngIf="!showHtmlSource"
                    class="editor-canvas"
                    contenteditable="true"
                    (input)="onCanvasInput()"
                    (blur)="onCanvasInput()"
                    (paste)="onPaste($event)"
                    data-placeholder="Write detailed section narrative, formatted paragraphs, bullet points, or embed callouts...">
                  </div>

                  <!-- Raw HTML Source Code Editor -->
                  <textarea
                    *ngIf="showHtmlSource"
                    rows="12"
                    [(ngModel)]="section.fullDescription"
                    (input)="onCanvasInput()"
                    class="form-control source-textarea"
                    placeholder="<p>Write or paste custom HTML code here...</p>">
                  </textarea>
                </div>
                <small class="help-text">Summernote-compatible WYSIWYG rich text editor with auto-paste cleaner (removes inline font families, sizes, &amp; colors) and integrated Code View.</small>
              </div>
            </div>
          </div>

          <!-- Card 2: Action Buttons, Links & Section Icon -->
          <div class="cms-card">
            <div class="card-header-bar">
              <div>
                <h3>Action Buttons &amp; Section Icon</h3>
                <p class="card-sub">Configure interactive CTA buttons, destination links, and optional section iconography.</p>
              </div>
              <label class="header-toggle-pill" [class.active-off]="section.disableButton" title="Toggle visibility of CTA action buttons on this section">
                <input type="checkbox" [(ngModel)]="section.disableButton">
                <span class="material-symbols-outlined fs-6">{{ section.disableButton ? 'visibility_off' : 'visibility' }}</span>
                <span>{{ section.disableButton ? 'Buttons Hidden' : 'Buttons Visible' }}</span>
              </label>
            </div>

            <div class="cta-sections-stack">
              <!-- Group 1: Primary CTA Button -->
              <div class="cta-subcard" [class.cta-dimmed]="section.disableButton">
                <div class="cta-subcard-header">
                  <div class="cta-badge-title">
                    <span class="cta-num-badge primary">1</span>
                    <div>
                      <strong>Primary Action Button</strong>
                      <span class="cta-sub">Main call-to-action trigger displayed in this layout block.</span>
                    </div>
                  </div>
                </div>

                <div class="cta-fields-grid">
                  <div class="form-group">
                    <label>BUTTON LABEL</label>
                    <input type="text" [(ngModel)]="section.buttonText" class="form-control" placeholder="e.g. Discover More, Get Started">
                  </div>

                  <div class="form-group">
                    <label>QUICK PICK PAGE</label>
                    <select class="form-control link-select" (change)="onButtonLinkSelect($event, 'primary')">
                      <option value="">-- Choose a page --</option>
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
                        [(ngModel)]="section.buttonLink"
                        class="form-control"
                        placeholder="e.g. /about-us, #contact, or https://...">
                      <button type="button" class="btn-choose-file" (click)="openFilePicker('primary')" title="Pick an uploaded file from File Manager">
                        <span class="material-symbols-outlined fs-6">folder_open</span>
                        <span>Choose File</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Group 2: Secondary CTA Button (Dual CTA) -->
              <div class="cta-subcard" [class.cta-dimmed]="section.disableButton">
                <div class="cta-subcard-header">
                  <div class="cta-badge-title">
                    <span class="cta-num-badge secondary">2</span>
                    <div>
                      <strong>Secondary Action Button <span class="optional-tag">Optional Dual CTA</span></strong>
                      <span class="cta-sub">Additional secondary button when the template supports two buttons.</span>
                    </div>
                  </div>
                </div>

                <div class="cta-fields-grid">
                  <div class="form-group">
                    <label>BUTTON LABEL</label>
                    <input type="text" [(ngModel)]="section.secondButtonText" class="form-control" placeholder="e.g. Watch Demo, Our Certificate">
                  </div>

                  <div class="form-group">
                    <label>QUICK PICK PAGE</label>
                    <select class="form-control link-select" (change)="onButtonLinkSelect($event, 'secondary')">
                      <option value="">-- Choose a page --</option>
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
                        [(ngModel)]="section.secondButtonLink"
                        class="form-control"
                        placeholder="e.g. /get-a-quote, #pricing, or https://...">
                      <button type="button" class="btn-choose-file" (click)="openFilePicker('secondary')" title="Pick an uploaded file from File Manager">
                        <span class="material-symbols-outlined fs-6">folder_open</span>
                        <span>Choose File</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Group 3: Section Root Icon -->
              <div class="cta-subcard">
                <div class="cta-subcard-header">
                  <div class="cta-badge-title">
                    <span class="material-symbols-outlined icon-header-badge">interests</span>
                    <div>
                      <strong>Section Root Icon <span class="optional-tag">Optional</span></strong>
                      <span class="cta-sub">Font Awesome class, &lt;i&gt; tag, or SVG/image icon URL rendered natively by the template.</span>
                    </div>
                  </div>
                  <span *ngIf="section.iconText" class="badge-icon-type" [class.badge-image]="getIconKind(section.iconText) === 'image'">
                    {{ getIconTypeLabel(section.iconText) }}
                  </span>
                </div>

                <div class="icon-input-group">
                  <div class="icon-preview-box" [title]="'Live Icon Preview: ' + (section.iconText || 'None')">
                    <ng-container [ngSwitch]="getIconKind(section.iconText)">
                      <img *ngSwitchCase="'image'" [src]="getIconSrc(section.iconText)" alt="Preview" class="preview-img" />
                      <i *ngSwitchCase="'font'" [class]="getCleanIconClass(section.iconText)" class="preview-icon"></i>
                      <span *ngSwitchDefault class="material-symbols-outlined preview-empty">image_not_supported</span>
                    </ng-container>
                  </div>
                  <input
                    type="text"
                    [(ngModel)]="section.iconText"
                    class="form-control icon-input-field"
                    placeholder="e.g. fa-solid fa-rocket, <i class='fa-solid fa-rocket'></i>, or https://.../icon.svg">
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
              <div class="label-with-link">
                <label>TEMPLATE DESIGN KEY *</label>
                <a
                  *ngIf="section.templateKey"
                  [routerLink]="['/content/console/templates/visuals', activeTemplateRouteTarget]"
                  target="_blank"
                  class="link-edit-template"
                  title="Edit this template layout in Visual Template Studio (opens in new tab)">
                  <span class="material-symbols-outlined fs-6">edit_note</span>
                  <span>Edit Template</span>
                  <span class="material-symbols-outlined open-ext-icon">open_in_new</span>
                </a>
              </div>
              <select [(ngModel)]="section.templateKey" class="form-control template-select">
                <option value="">-- Select Template Layout --</option>
                <optgroup label="Tenant Installed Templates" *ngIf="installedTemplates.length > 0">
                  <option *ngFor="let t of installedTemplates" [value]="t.templateKey || t.variantCode">
                    {{ t.name }} ({{ t.variantCode || t.templateKey }}) [{{ t.categoryKey }}]
                  </option>
                </optgroup>
              </select>

              <!-- Active Template Live Action Card -->
              <div class="active-template-card" *ngIf="section.templateKey">
                <div class="active-template-details">
                  <span class="material-symbols-outlined active-template-icon">palette</span>
                  <div class="active-template-meta">
                    <span class="template-title">{{ activeInstalledTemplate?.name || 'Active Design Blueprint' }}</span>
                    <span class="template-sub">
                      <code>{{ activeInstalledTemplate?.variantCode || activeInstalledTemplate?.templateKey || section.templateKey }}</code>
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
                  title="Open this template in Visual Template Studio">
                  <span class="material-symbols-outlined fs-6">edit</span>
                  <span>Edit Template</span>
                  <span class="material-symbols-outlined fs-6">open_in_new</span>
                </a>
              </div>
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

          <!-- Multi-Page Shared Placements & Linking -->
          <div class="cms-card" *ngIf="isEditMode">
            <div class="card-header-bar">
              <div>
                <h3>Multi-Page Shared Placements</h3>
                <p class="card-sub">Reuse this master section across other web pages with independent sort orders.</p>
              </div>
              <span class="badge" [class.badge-primary]="linkedPages.length > 0" [class.badge-secondary]="linkedPages.length === 0">
                {{ linkedPages.length }} Linked {{ linkedPages.length === 1 ? 'Page' : 'Pages' }}
              </span>
            </div>

            <!-- Primary Home / Parent Page Banner -->
            <div class="primary-page-banner" *ngIf="primaryPageTitle">
              <span class="material-symbols-outlined text-primary">home</span>
              <div class="banner-text">
                <span class="banner-title">Primary Parent: <strong>{{ primaryPageTitle }}</strong></span>
                <span class="banner-sub">Position #{{ section.pageSortOrder }} &bull; All sub-items &amp; cards remain in sync</span>
              </div>
            </div>

            <!-- Linked Secondary Pages List -->
            <div class="linked-pages-list" *ngIf="linkedPages && linkedPages.length > 0">
              <div class="linked-page-item" *ngFor="let link of linkedPages; let i = index">
                <div class="link-item-header">
                  <span class="material-symbols-outlined text-info">share_location</span>
                  <div class="link-title-box">
                    <strong>{{ link.pageTitle }}</strong>
                    <span class="link-slug">{{ link.directUrl || '/' }}</span>
                  </div>
                </div>

                <div class="link-item-actions">
                  <div class="sort-input-group">
                    <label>Position</label>
                    <input type="number" [(ngModel)]="link.pageSortOrder" (change)="markLinksDirty()" class="form-control form-control-sm link-sort-input" min="0">
                  </div>

                  <label class="link-vis-toggle" title="Toggle visibility on this page">
                    <input type="checkbox" [(ngModel)]="link.isVisible" (change)="markLinksDirty()">
                    <span>Visible</span>
                  </label>

                  <button type="button" class="btn-remove-link" (click)="removePageLink(i)" title="Remove placement on this page">
                    <span class="material-symbols-outlined">link_off</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Empty State -->
            <div class="empty-links-state" *ngIf="!linkedPages || linkedPages.length === 0">
              <span class="material-symbols-outlined">device_hub</span>
              <p>This section is currently only displayed on its primary parent page. Link it to show on other pages with independent sort positions.</p>
            </div>

            <!-- Add Page Placement Bar -->
            <div class="add-link-section" *ngIf="availablePages && availablePages.length > 0">
              <div class="add-link-row">
                <select [(ngModel)]="selectedAddPageId" class="form-control form-control-sm">
                  <option value="">-- Choose page to link... --</option>
                  <option *ngFor="let p of availablePages" [value]="p.id">
                    {{ p.title }} ({{ p.directUrl || '/' }})
                  </option>
                </select>
                <button type="button" class="btn btn-sm btn-outline-primary" (click)="addPageLink()" [disabled]="!selectedAddPageId">
                  <span class="material-symbols-outlined fs-6">add_link</span>
                  <span>Link Page</span>
                </button>
              </div>
            </div>

            <!-- Save Placements Action Bar -->
            <div class="links-dirty-bar" *ngIf="isLinksDirty">
              <div class="dirty-notice">
                <span class="material-symbols-outlined text-warning">warning</span>
                <span>You have unsaved page placement changes.</span>
              </div>
              <button type="button" class="btn btn-sm btn-primary" (click)="savePageLinks()" [disabled]="isSavingLinks">
                <span class="material-symbols-outlined fs-6">save</span>
                <span>{{ isSavingLinks ? 'Saving...' : 'Save Placements' }}</span>
              </button>
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

    /* Organized CTA & Iconography Subcards */
    .header-toggle-pill {
      display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px;
      border-radius: 999px; font-size: 12px; font-weight: 700; cursor: pointer;
      background: #eff6ff; color: #0050e5; border: 1px solid #bfdbfe;
      transition: all 0.15s ease; user-select: none; white-space: nowrap;
    }
    .header-toggle-pill input { display: none; }
    .header-toggle-pill.active-off {
      background: #fef2f2; color: #dc2626; border-color: #fecaca;
    }
    .cta-sections-stack {
      display: flex; flex-direction: column; gap: 16px;
    }
    .cta-subcard {
      background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;
      padding: 16px 18px; display: flex; flex-direction: column; gap: 14px;
      transition: opacity 0.2s ease;
    }
    .cta-subcard.cta-dimmed {
      opacity: 0.55;
    }
    .cta-subcard-header {
      display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;
    }
    .cta-badge-title {
      display: flex; align-items: center; gap: 10px;
    }
    .cta-badge-title > div {
      display: flex; flex-direction: column; gap: 2px;
    }
    .cta-badge-title strong {
      font-size: 13.5px; color: #0f172a; display: flex; align-items: center; gap: 8px;
    }
    .cta-sub { font-size: 11.5px; color: #64748b; }
    .cta-num-badge {
      width: 26px; height: 26px; border-radius: 8px; display: inline-flex;
      align-items: center; justify-content: center; font-size: 12px; font-weight: 800; flex-shrink: 0;
    }
    .cta-num-badge.primary { background: #0050e5; color: #fff; }
    .cta-num-badge.secondary { background: #e2e8f0; color: #334155; }
    .icon-header-badge {
      width: 26px; height: 26px; border-radius: 8px; display: inline-flex;
      align-items: center; justify-content: center; font-size: 17px; flex-shrink: 0;
      background: #eff6ff; color: #0050e5;
    }
    .optional-tag {
      font-size: 10px; font-weight: 700; text-transform: uppercase;
      padding: 2px 7px; border-radius: 999px; background: #e2e8f0; color: #475569;
    }
    .cta-fields-grid {
      display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;
    }
    .input-with-file-btn {
      display: flex; gap: 10px; align-items: stretch;
    }
    .input-with-file-btn .form-control {
      flex: 1; min-width: 0;
    }
    .btn-choose-file {
      display: inline-flex; align-items: center; gap: 6px; padding: 0 14px;
      background: #eff6ff; color: #0050e5; border: 1px solid #bfdbfe; border-radius: 8px;
      font-size: 12.5px; font-weight: 700; cursor: pointer; white-space: nowrap;
      transition: all 0.15s ease;
    }
    .btn-choose-file:hover { background: #dbeafe; border-color: #93c5fd; }
    @media (max-width: 640px) {
      .cta-fields-grid { grid-template-columns: 1fr; }
      .input-with-file-btn { flex-direction: column; }
      .btn-choose-file { justify-content: center; min-height: 38px; }
    }

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

    /* Template Select & Badge */
    .template-select { font-weight: 600; color: #0f172a; }
    .template-key-manual-row { display: flex; flex-direction: column; gap: 4px; }
    .template-selected-badge {
      display: inline-flex; align-items: center; gap: 6px; margin-top: 8px;
      background: #eff6ff; color: #0050e5; padding: 6px 12px; border-radius: 8px;
      font-size: 12px; border: 1px solid #bfdbfe;
    }
    .template-selected-badge .material-symbols-outlined { font-size: 16px; }

    /* Active Template Linked Controls */
    .label-with-link {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
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
      gap: 12px;
      margin-top: 10px;
      padding: 10px 14px;
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
      font-size: 22px;
      color: #0050e5;
      flex-shrink: 0;
    }
    .active-template-meta {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .template-title {
      font-size: 13px;
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
      gap: 5px;
      padding: 6px 12px;
      background: #0050e5;
      color: #ffffff;
      border-radius: 8px;
      font-size: 12px;
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
      min-height: 220px;
      max-height: 520px;
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
      min-height: 240px;
      padding: 16px;
      outline: none;
      resize: vertical;
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

    /* Multi-Page Shared Placements Card */
    .primary-page-banner {
      display: flex; align-items: center; gap: 10px; background: #eff6ff;
      border: 1px solid #bfdbfe; border-radius: 8px; padding: 10px 12px; margin-bottom: 12px;
    }
    .primary-page-banner .banner-text { display: flex; flex-direction: column; }
    .primary-page-banner .banner-title { font-size: 12.5px; color: #1e3a8a; }
    .primary-page-banner .banner-sub { font-size: 11px; color: #3b82f6; }

    .linked-pages-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
    .linked-page-item {
      display: flex; align-items: center; justify-content: space-between; gap: 10px;
      background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px;
      flex-wrap: wrap;
    }
    .link-item-header { display: flex; align-items: center; gap: 8px; }
    .link-title-box { display: flex; flex-direction: column; }
    .link-title-box strong { font-size: 13px; color: #0f172a; }
    .link-slug { font-size: 11px; color: #64748b; font-family: monospace; }

    .link-item-actions { display: flex; align-items: center; gap: 10px; }
    .sort-input-group { display: flex; align-items: center; gap: 4px; font-size: 11px; color: #475569; }
    .link-sort-input { width: 60px; text-align: center; font-weight: 600; padding: 4px; }
    .link-vis-toggle { display: flex; align-items: center; gap: 4px; font-size: 11.5px; font-weight: 500; color: #334155; cursor: pointer; }
    .btn-remove-link {
      background: none; border: none; color: #dc2626; cursor: pointer; padding: 2px 4px; border-radius: 4px;
      display: flex; align-items: center;
    }
    .btn-remove-link:hover { background: #fee2e2; }

    .empty-links-state {
      display: flex; flex-direction: column; align-items: center; text-align: center;
      padding: 18px 14px; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; margin-bottom: 12px;
    }
    .empty-links-state span { font-size: 28px; color: #94a3b8; margin-bottom: 4px; }
    .empty-links-state p { font-size: 11.5px; color: #64748b; margin: 0; line-height: 1.4; }

    .add-link-section { margin-top: 8px; }
    .add-link-row { display: flex; gap: 8px; align-items: center; }
    .links-dirty-bar {
      display: flex; align-items: center; justify-content: space-between; gap: 10px;
      background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 8px 12px; margin-top: 12px;
    }
    .dirty-notice { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #92400e; font-weight: 500; }
    .dirty-notice span { font-size: 16px; }

    .loading-box { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px; color: #64748b; }
    .spin { animation: spin 1s linear infinite; font-size: 32px; color: #0050e5; margin-bottom: 12px; }
    @keyframes spin { 100% { transform: rotate(360deg); } }
  `]
})
export class PageSectionEditComponent implements OnInit, AfterViewInit {
  @ViewChild('editorCanvas') editorCanvasRef!: ElementRef;

  sectionId = '';
  isEditMode = false;

  // Multi-Page Linking States
  linkedPages: any[] = [];
  availablePages: any[] = [];
  primaryPageTitle = '';
  selectedAddPageId = '';
  isLinksDirty = false;
  isSavingLinks = false;
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
  filePickerOpen = false;
  filePickerTarget: 'primary' | 'secondary' = 'primary';

  /**
   * Returns a contextual modal heading based on which CTA button slot is picking a file.
   */
  get filePickerTitle(): string {
    return this.filePickerTarget === 'secondary'
      ? 'Choose File for Secondary Action Button'
      : 'Choose File for Primary Action Button';
  }

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

  /**
   * Resolves the active installed template object matching the section's selected templateKey.
   */
  get activeInstalledTemplate(): any {
    if (!this.section?.templateKey) return null;
    const key = this.section.templateKey.trim().toLowerCase();
    return (this.installedTemplates || []).find((t: any) =>
      (t.templateKey && t.templateKey.trim().toLowerCase() === key) ||
      (t.variantCode && t.variantCode.trim().toLowerCase() === key) ||
      (t.id && t.id.toString().toLowerCase() === key)
    );
  }

  /**
   * Resolves the navigation route parameter for editing the active template in Visual Template Studio.
   */
  get activeTemplateRouteTarget(): string {
    if (this.activeInstalledTemplate) {
      return this.activeInstalledTemplate.id || this.activeInstalledTemplate.variantCode || this.activeInstalledTemplate.templateKey;
    }
    return this.section?.templateKey || '';
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
        this.updateAvailablePages();
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

  /**
   * Opens the File Manager picker modal for the chosen CTA button link field.
   * @param target Identifies whether the primary or secondary button URL should be populated.
   */
  openFilePicker(target: 'primary' | 'secondary'): void {
    this.filePickerTarget = target;
    this.filePickerOpen = true;
  }

  /**
   * Populates the active button destination URL when a file is chosen from the File Manager modal.
   * @param file Selected file record containing its hosted URL and metadata.
   */
  onFilePicked(file: any): void {
    if (!file?.fileUrl || !this.section) return;
    if (this.filePickerTarget === 'secondary') {
      this.section.secondButtonLink = file.fileUrl;
    } else {
      this.section.buttonLink = file.fileUrl;
    }
    this.toast.success(`Inserted URL for "${file.fileName}".`);
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
          this.loadPageLinks();
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

  /// <summary>
  /// Synchronizes the visual contenteditable canvas with the underlying HTML model.
  /// </summary>
  syncCanvasWithHtml(): void {
    setTimeout(() => {
      if (this.editorCanvasRef?.nativeElement && this.section) {
        this.editorCanvasRef.nativeElement.innerHTML = this.section.fullDescription || '';
      }
    }, 100);
  }

  /// <summary>
  /// Synchronizes the canvas DOM innerHTML back to the section.fullDescription model property.
  /// </summary>
  onCanvasInput(): void {
    if (this.editorCanvasRef?.nativeElement && this.section) {
      this.section.fullDescription = this.editorCanvasRef.nativeElement.innerHTML;
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
    if (this.editorCanvasRef?.nativeElement) {
      const current = this.editorCanvasRef.nativeElement.innerHTML;
      if (current) {
        this.editorCanvasRef.nativeElement.innerHTML = this.stripColorsAndFonts(current);
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
          if (this.isLinksDirty) {
            this.savePageLinks();
          }
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

  /**
   * Loads all active page placements for this section from the backend API.
   */
  loadPageLinks(): void {
    if (!this.sectionId) return;
    this.api.get<any>(`ContentApi/sections/${this.sectionId}/page-links`).subscribe({
      next: (res) => {
        if (res?.success) {
          this.linkedPages = res.data?.links || [];
          this.primaryPageTitle = res.data?.primaryPageTitle || '';
          this.updateAvailablePages();
        }
      },
      error: (err) => {
        console.error('Failed to load page links for section', err);
      }
    });
  }

  /**
   * Recalculates the list of web pages available to be linked (excluding parent page and already linked pages).
   */
  updateAvailablePages(): void {
    const linkedIds = new Set(this.linkedPages.map(l => l.webPageId));
    if (this.section?.webPageId) {
      linkedIds.add(this.section.webPageId);
    }
    this.availablePages = (this.allPages || []).filter(p => !linkedIds.has(p.id));
    this.selectedAddPageId = '';
  }

  /**
   * Adds a new page link placement to the working list.
   */
  addPageLink(): void {
    if (!this.selectedAddPageId) return;
    const page = this.allPages.find(p => p.id === this.selectedAddPageId);
    if (!page) return;

    this.linkedPages.push({
      webPageId: page.id,
      pageTitle: page.title,
      directUrl: page.directUrl,
      pageSortOrder: this.linkedPages.length + 1,
      isVisible: true
    });

    this.isLinksDirty = true;
    this.updateAvailablePages();
  }

  /**
   * Removes a page link placement at the specified index.
   */
  removePageLink(index: number): void {
    if (index >= 0 && index < this.linkedPages.length) {
      this.linkedPages.splice(index, 1);
      this.isLinksDirty = true;
      this.updateAvailablePages();
    }
  }

  /**
   * Flags that linked page configurations (sort order or visibility) have been modified.
   */
  markLinksDirty(): void {
    this.isLinksDirty = true;
  }

  /**
   * Persists multi-page placement links to the backend.
   */
  savePageLinks(): void {
    if (!this.sectionId) return;
    this.isSavingLinks = true;

    const payload = {
      links: this.linkedPages.map(l => ({
        webPageId: l.webPageId,
        pageSortOrder: Number(l.pageSortOrder) || 0,
        isVisible: l.isVisible !== false
      }))
    };

    this.api.put<any>(`ContentApi/sections/${this.sectionId}/page-links`, payload).subscribe({
      next: (res) => {
        this.isSavingLinks = false;
        this.isLinksDirty = false;
        this.toast.success(res?.message || 'Page placements updated successfully!');
        this.loadPageLinks();
      },
      error: (err) => {
        this.isSavingLinks = false;
        this.toast.error(err?.error?.message || 'Failed to save page placements.');
      }
    });
  }

  goBack(): void {
    if (this.section?.webPageId) {
      this.router.navigate(['/content/console/pages/details', this.section.webPageId]);
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
   * Extracts clean class string for preview rendering (e.g. from <i class="fa-solid fa-rocket"></i>).
   * @param val Raw icon string.
   * @returns Sanitized CSS class list.
   */
  getCleanIconClass(val?: string): string {
    const raw = (val || '').trim();
    if (!raw) return 'fa-solid fa-rocket';
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
