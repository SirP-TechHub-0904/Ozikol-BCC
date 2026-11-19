import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent, PageHeaderButton } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-file-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent],
  template: `
    <div class="cms-page-container">
      <!-- Standardized Reusable Page Header -->
      <app-page-header
        eyebrow="CMS Studio / Media & Assets"
        icon="folder_shared"
        title="Website File Manager"
        subtitle="Upload, organize, copy URLs, and manage all media files, PDFs, documents, and assets used across your website."
        [buttons]="headerButtons"
        [loading]="loading"
      ></app-page-header>

      <!-- Hidden File Input Triggered by Upload Button / Drop Zone -->
      <input
        #fileInput
        type="file"
        multiple
        [accept]="safeAcceptString"
        style="display: none"
        (change)="onFilesSelected($event)"
      />

      <!-- Storage Quota & Capacity Banner -->
      <div class="storage-quota-card">
        <div class="storage-quota-header">
          <div class="quota-title-wrap">
            <span class="material-symbols-outlined quota-icon">cloud_sync</span>
            <div>
              <strong>Workspace File Storage Quota</strong>
              <span>500 MB default per tenant (configurable in Central Master Catalog)</span>
            </div>
          </div>
          <div class="quota-stats-wrap">
            <div class="quota-numbers">
              <span class="used-text">{{ formatFileSize(totalStorageUsedBytes) }}</span>
              <span class="divider">/</span>
              <span class="max-text">{{ maxStorageQuotaMb }} MB</span>
            </div>
            <span class="quota-status-pill" [ngClass]="getStorageStatusClass()">
              {{ storageUsedPercent | number:'1.1-1' }}% Used
            </span>
          </div>
        </div>
        <div class="quota-progress-track">
          <div
            class="quota-progress-bar"
            [style.width.%]="storageUsedPercent"
            [ngClass]="getStorageStatusClass()"
          ></div>
        </div>
        <div class="quota-footer-info">
          <span>{{ formatFileSize(remainingStorageBytes) }} remaining storage</span>
          <span>{{ files.length }} total file(s) registered</span>
        </div>
      </div>

      <!-- Upload Dropzone Banner -->
      <div
        class="upload-dropzone"
        [class.dragging]="isDragging"
        [class.uploading]="uploading"
        (dragover)="onDragOver($event)"
        (dragleave)="onDragLeave($event)"
        (drop)="onDrop($event)"
        (click)="!uploading && fileInput.click()"
      >
        <div class="dropzone-content">
          <div class="dropzone-icon-wrap">
            <span class="material-symbols-outlined" *ngIf="!uploading">cloud_upload</span>
            <span class="material-symbols-outlined spin" *ngIf="uploading">progress_activity</span>
          </div>
          <div class="dropzone-text">
            <strong *ngIf="!uploading">Drop website files here or click to browse</strong>
            <strong *ngIf="uploading">Uploading {{ uploadProgressText }}...</strong>
            <span>Supports safe files: Images (PNG, JPG, WebP, SVG, GIF), PDFs, Word & Excel documents, and Zip archives.</span>
          </div>
          <button type="button" class="btn btn-primary btn-sm" *ngIf="!uploading" (click)="$event.stopPropagation(); fileInput.click()">
            <span class="material-symbols-outlined fs-6">upload_file</span>
            <span>Choose File(s)</span>
          </button>
        </div>
      </div>

      <!-- Search, Sort & Filter Bar -->
      <div class="filter-bar">
        <div class="search-box">
          <span class="material-symbols-outlined text-muted">search</span>
          <input
            type="text"
            [(ngModel)]="searchTerm"
            (ngModelChange)="applyFilters()"
            placeholder="Search by file name, URL, or type..."
          />
          <button type="button" class="btn-clear-search" *ngIf="searchTerm" (click)="searchTerm = ''; applyFilters()">
            <span class="material-symbols-outlined fs-6">close</span>
          </button>
        </div>

        <!-- Sort Order Selector -->
        <div class="sort-selector-wrap">
          <label class="sort-label">Sort:</label>
          <select [(ngModel)]="sortOrderKey" (ngModelChange)="onSortKeyChange($event)" class="select-sort">
            <option value="createdAtUtc_desc">Newest First</option>
            <option value="createdAtUtc_asc">Oldest First</option>
            <option value="fileName_asc">File Name (A - Z)</option>
            <option value="fileName_desc">File Name (Z - A)</option>
            <option value="fileSizeBytes_desc">Size (Largest First)</option>
            <option value="fileSizeBytes_asc">Size (Smallest First)</option>
            <option value="fileType_asc">Type (A - Z)</option>
          </select>
        </div>

        <!-- Category Pills -->
        <div class="filter-pills">
          <button
            type="button"
            class="filter-pill"
            [class.active]="selectedCategory === 'all'"
            (click)="setCategory('all')"
          >
            All ({{ files.length }})
          </button>
          <button
            type="button"
            class="filter-pill"
            [class.active]="selectedCategory === 'image'"
            (click)="setCategory('image')"
          >
            Images
          </button>
          <button
            type="button"
            class="filter-pill"
            [class.active]="selectedCategory === 'pdf'"
            (click)="setCategory('pdf')"
          >
            PDFs
          </button>
          <button
            type="button"
            class="filter-pill"
            [class.active]="selectedCategory === 'document'"
            (click)="setCategory('document')"
          >
            Word Docs
          </button>
          <button
            type="button"
            class="filter-pill"
            [class.active]="selectedCategory === 'excel'"
            (click)="setCategory('excel')"
          >
            Spreadsheets
          </button>
          <button
            type="button"
            class="filter-pill"
            [class.active]="selectedCategory === 'archive'"
            (click)="setCategory('archive')"
          >
            Zip Archives
          </button>
          <button
            type="button"
            class="filter-pill"
            [class.active]="selectedCategory === 'other'"
            (click)="setCategory('other')"
          >
            Other
          </button>
        </div>
      </div>

      <!-- Files Table Card -->
      <div class="cms-card">
        <div class="card-header-bar">
          <div>
            <h3>Uploaded Website Files ({{ filteredFiles.length }})</h3>
            <p class="card-sub">Hover over any image to zoom. Click row or Preview to inspect, download, or copy public URLs.</p>
          </div>
          <!-- Rows per page selector in header for convenience -->
          <div class="page-size-selector">
            <label>Show:</label>
            <select [(ngModel)]="pageSize" (ngModelChange)="onPageSizeChange()" class="select-page-size">
              <option [ngValue]="10">10 per page</option>
              <option [ngValue]="25">25 per page</option>
              <option [ngValue]="50">50 per page</option>
              <option value="all">All files</option>
            </select>
          </div>
        </div>

        <!-- Loading State -->
        <div class="loading-box" *ngIf="loading">
          <span class="material-symbols-outlined spin">progress_activity</span>
          <p>Loading uploaded files...</p>
        </div>

        <!-- Table View -->
        <div class="table-responsive" *ngIf="!loading">
          <table class="cms-table">
            <thead>
              <tr>
                <th (click)="setSort('fileName')" class="sortable-th" title="Sort by File Name">
                  <div class="th-content">
                    <span>FILE NAME</span>
                    <span class="material-symbols-outlined sort-icon">
                      {{ sortColumn === 'fileName' ? (sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more' }}
                    </span>
                  </div>
                </th>
                <th>FILE URL</th>
                <th (click)="setSort('fileSizeBytes')" class="sortable-th" title="Sort by File Size">
                  <div class="th-content">
                    <span>FILE SIZE</span>
                    <span class="material-symbols-outlined sort-icon">
                      {{ sortColumn === 'fileSizeBytes' ? (sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more' }}
                    </span>
                  </div>
                </th>
                <th (click)="setSort('createdAtUtc')" class="sortable-th" title="Sort by Date">
                  <div class="th-content">
                    <span>DATE</span>
                    <span class="material-symbols-outlined sort-icon">
                      {{ sortColumn === 'createdAtUtc' ? (sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more' }}
                    </span>
                  </div>
                </th>
                <th (click)="setSort('fileType')" class="sortable-th" title="Sort by File Type">
                  <div class="th-content">
                    <span>FILE TYPE</span>
                    <span class="material-symbols-outlined sort-icon">
                      {{ sortColumn === 'fileType' ? (sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more' }}
                    </span>
                  </div>
                </th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let f of paginatedFiles" class="file-table-row">
                <!-- File Name with Hover Zoom Preview & Click-to-Modal -->
                <td>
                  <div class="file-name-cell">
                    <!-- Image Thumbnail with Popout Hover Zoom Card -->
                    <div class="file-thumb-container" *ngIf="isImageFile(f); else iconThumb">
                      <div class="file-thumb" (click)="openPreviewModal(f)" title="Click to preview image">
                        <img [src]="f.fileUrl" [alt]="f.fileName" loading="lazy" />
                      </div>

                      <!-- Floating Hover Zoom Card (Enlarges on Hover for Easy Recognition) -->
                      <div class="thumb-hover-popover">
                        <div class="thumb-hover-img-wrap">
                          <img [src]="f.fileUrl" [alt]="f.fileName" loading="lazy" />
                        </div>
                        <div class="thumb-hover-footer">
                          <span class="thumb-hover-name">{{ f.fileName }}</span>
                          <span class="thumb-hover-size">{{ formatFileSize(f.fileSizeBytes) }}</span>
                        </div>
                      </div>
                    </div>

                    <ng-template #iconThumb>
                      <div
                        class="file-icon-box"
                        [ngClass]="getFileIconColorClass(f)"
                        (click)="openPreviewModal(f)"
                        title="Click to inspect file"
                        style="cursor: pointer;"
                      >
                        <span class="material-symbols-outlined">{{ getFileIcon(f) }}</span>
                      </div>
                    </ng-template>

                    <div class="file-name-meta">
                      <strong [title]="f.fileName" (click)="openPreviewModal(f)" class="clickable-filename">{{ f.fileName }}</strong>
                      <span class="file-ext-sub">{{ f.fileType || 'ASSET' }}</span>
                    </div>
                  </div>
                </td>

                <!-- Copyable File URL -->
                <td>
                  <div class="url-copy-cell">
                    <code class="url-pill" [title]="f.fileUrl" (click)="copyUrl(f)">{{ f.fileUrl }}</code>
                    <button
                      type="button"
                      class="btn-copy-inline"
                      [class.copied]="copiedFileId === f.id"
                      (click)="copyUrl(f)"
                      title="Copy file URL to clipboard"
                    >
                      <span class="material-symbols-outlined fs-6">
                        {{ copiedFileId === f.id ? 'check' : 'content_copy' }}
                      </span>
                      <span>{{ copiedFileId === f.id ? 'Copied' : 'Copy' }}</span>
                    </button>
                  </div>
                </td>

                <!-- Dedicated FILE SIZE Column -->
                <td>
                  <div class="size-cell">
                    <span class="file-size-badge">{{ formatFileSize(f.fileSizeBytes) }}</span>
                  </div>
                </td>

                <!-- Date -->
                <td>
                  <div class="date-cell">
                    <span>{{ f.createdAtUtc | date:'mediumDate' }}</span>
                    <small>{{ f.createdAtUtc | date:'shortTime' }}</small>
                  </div>
                </td>

                <!-- File Type -->
                <td>
                  <span class="type-badge" [ngClass]="getFileIconColorClass(f)">
                    {{ f.fileType || 'FILE' }}
                  </span>
                </td>

                <!-- Actions -->
                <td>
                  <div class="action-buttons">
                    <button
                      type="button"
                      class="btn-action btn-preview"
                      (click)="openPreviewModal(f)"
                      title="Preview file"
                    >
                      <span class="material-symbols-outlined">visibility</span>
                      <span>Preview</span>
                    </button>
                    <button
                      type="button"
                      class="btn-action btn-copy"
                      (click)="copyUrl(f)"
                      title="Copy File URL"
                    >
                      <span class="material-symbols-outlined">content_copy</span>
                      <span>{{ copiedFileId === f.id ? 'Copied!' : 'Copy URL' }}</span>
                    </button>
                    <a
                      [href]="f.fileUrl"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="btn-action btn-open"
                      title="Open file in new browser tab"
                    >
                      <span class="material-symbols-outlined">open_in_new</span>
                      <span>Open</span>
                    </a>
                    <button
                      type="button"
                      class="btn-action btn-delete"
                      (click)="deleteFile(f)"
                      title="Delete file"
                    >
                      <span class="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </td>
              </tr>

              <tr *ngIf="filteredFiles.length === 0">
                <td colspan="6" class="empty-cell">
                  <div class="empty-state">
                    <span class="material-symbols-outlined">folder_open</span>
                    <p *ngIf="files.length === 0">No files uploaded yet. Upload your first website file above.</p>
                    <p *ngIf="files.length > 0">No files match your search or category filter.</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- ========================================== -->
        <!-- PAGINATION BAR & PAGE LIST CONTROLS        -->
        <!-- ========================================== -->
        <div class="pagination-bar" *ngIf="!loading && filteredFiles.length > 0">
          <div class="pagination-info">
            <span>Showing <strong>{{ getPaginationStart() }}</strong> to <strong>{{ getPaginationEnd() }}</strong> of <strong>{{ filteredFiles.length }}</strong> files</span>
          </div>

          <div class="pagination-controls" *ngIf="pageSize !== 'all' && totalPages > 1">
            <button
              type="button"
              class="btn-page-nav"
              [disabled]="currentPage === 1"
              (click)="setPage(1)"
              title="First Page"
            >
              <span class="material-symbols-outlined">first_page</span>
            </button>
            <button
              type="button"
              class="btn-page-nav"
              [disabled]="currentPage === 1"
              (click)="setPage(currentPage - 1)"
              title="Previous Page"
            >
              <span class="material-symbols-outlined">chevron_left</span>
            </button>

            <ng-container *ngFor="let p of getVisiblePages()">
              <button
                type="button"
                class="btn-page-num"
                [class.active]="currentPage === p"
                (click)="setPage(p)"
              >
                {{ p }}
              </button>
            </ng-container>

            <button
              type="button"
              class="btn-page-nav"
              [disabled]="currentPage === totalPages"
              (click)="setPage(currentPage + 1)"
              title="Next Page"
            >
              <span class="material-symbols-outlined">chevron_right</span>
            </button>
            <button
              type="button"
              class="btn-page-nav"
              [disabled]="currentPage === totalPages"
              (click)="setPage(totalPages)"
              title="Last Page"
            >
              <span class="material-symbols-outlined">last_page</span>
            </button>
          </div>

          <div class="pagination-page-size-wrap">
            <label>Rows:</label>
            <div class="page-size-pills">
              <button
                type="button"
                class="size-pill"
                [class.active]="pageSize === 10"
                (click)="setPageSize(10)"
              >
                10
              </button>
              <button
                type="button"
                class="size-pill"
                [class.active]="pageSize === 25"
                (click)="setPageSize(25)"
              >
                25
              </button>
              <button
                type="button"
                class="size-pill"
                [class.active]="pageSize === 50"
                (click)="setPageSize(50)"
              >
                50
              </button>
              <button
                type="button"
                class="size-pill"
                [class.active]="pageSize === 'all'"
                (click)="setPageSize('all')"
              >
                All
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- FULL INTERACTIVE FILE PREVIEW MODAL        -->
      <!-- ========================================== -->
      <div class="preview-modal-backdrop" *ngIf="previewModalOpen && previewFile" (click)="closePreviewModal()">
        <div class="preview-modal-card" (click)="$event.stopPropagation()">
          <!-- Modal Header -->
          <div class="preview-modal-header">
            <div class="preview-header-left">
              <div class="preview-header-icon" [ngClass]="getFileIconColorClass(previewFile)">
                <span class="material-symbols-outlined">{{ getFileIcon(previewFile) }}</span>
              </div>
              <div class="preview-header-text">
                <h3 class="preview-modal-title" [title]="previewFile.fileName">{{ previewFile.fileName }}</h3>
                <div class="preview-meta-row">
                  <span class="type-badge" [ngClass]="getFileIconColorClass(previewFile)">{{ previewFile.fileType || 'FILE' }}</span>
                  <span class="preview-meta-dot">•</span>
                  <span class="preview-meta-size">{{ formatFileSize(previewFile.fileSizeBytes) }}</span>
                  <span class="preview-meta-dot">•</span>
                  <span class="preview-meta-date">{{ previewFile.createdAtUtc | date:'mediumDate' }}</span>
                </div>
              </div>
            </div>
            <button type="button" class="btn-close-modal" (click)="closePreviewModal()" title="Close preview (Esc)">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <!-- Modal Body Content -->
          <div class="preview-modal-body">
            <!-- 1. Full Image Preview Mode -->
            <div class="preview-image-stage" *ngIf="isImageFile(previewFile)">
              <div class="image-stage-toolbar">
                <span class="image-stage-hint">
                  <span class="material-symbols-outlined fs-6">zoom_in</span>
                  <span>Click image to toggle 100% / Fit view</span>
                </span>
                <button type="button" class="btn-toggle-fit" (click)="toggleImageFit()">
                  <span class="material-symbols-outlined">{{ imageFitMode === 'contain' ? 'aspect_ratio' : 'fit_screen' }}</span>
                  <span>{{ imageFitMode === 'contain' ? 'Original 100%' : 'Fit Screen' }}</span>
                </button>
              </div>
              <div class="image-canvas" [class.mode-original]="imageFitMode === 'original'" (click)="toggleImageFit()">
                <img [src]="previewFile.fileUrl" [alt]="previewFile.fileName" />
              </div>
            </div>

            <!-- 2. PDF Preview Mode -->
            <div class="preview-pdf-stage" *ngIf="isPdfFile(previewFile)">
              <div class="pdf-iframe-wrap" *ngIf="sanitizedPreviewUrl">
                <iframe [src]="sanitizedPreviewUrl" title="PDF Document Preview"></iframe>
              </div>
            </div>

            <!-- 3. Excel / Spreadsheet Inspection Card -->
            <div class="preview-doc-card doc-excel" *ngIf="isExcelFile(previewFile)">
              <div class="doc-card-icon excel-icon">
                <span class="material-symbols-outlined">table_chart</span>
              </div>
              <h4>Microsoft Excel / Spreadsheet Asset</h4>
              <p>This file is a structured workbook or table ready for download and use in Microsoft Excel, Google Sheets, or CSV analysis tools.</p>
              <div class="doc-card-details">
                <div class="detail-row">
                  <span class="detail-label">File Name:</span>
                  <span class="detail-val">{{ previewFile.fileName }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Format:</span>
                  <span class="detail-val">{{ previewFile.fileType }} Spreadsheet</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">File Size:</span>
                  <span class="detail-val">{{ formatFileSize(previewFile.fileSizeBytes) }}</span>
                </div>
              </div>
            </div>

            <!-- 4. Word / Rich Document Inspection Card -->
            <div class="preview-doc-card doc-word" *ngIf="isWordFile(previewFile)">
              <div class="doc-card-icon word-icon">
                <span class="material-symbols-outlined">description</span>
              </div>
              <h4>Microsoft Word / Document Asset</h4>
              <p>This file is a document ready for download and editing in Microsoft Word, Google Docs, or desktop office suites.</p>
              <div class="doc-card-details">
                <div class="detail-row">
                  <span class="detail-label">File Name:</span>
                  <span class="detail-val">{{ previewFile.fileName }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Format:</span>
                  <span class="detail-val">{{ previewFile.fileType }} Document</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">File Size:</span>
                  <span class="detail-val">{{ formatFileSize(previewFile.fileSizeBytes) }}</span>
                </div>
              </div>
            </div>

            <!-- 5. Zip / Compressed Archive Inspection Card -->
            <div class="preview-doc-card doc-zip" *ngIf="isZipFile(previewFile)">
              <div class="doc-card-icon zip-icon">
                <span class="material-symbols-outlined">folder_zip</span>
              </div>
              <h4>Compressed Archive Package</h4>
              <p>This archive contains bundled website assets or downloadable files. Download and extract on your computer using any unzip utility.</p>
              <div class="doc-card-details">
                <div class="detail-row">
                  <span class="detail-label">File Name:</span>
                  <span class="detail-val">{{ previewFile.fileName }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Format:</span>
                  <span class="detail-val">{{ previewFile.fileType }} Archive</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">File Size:</span>
                  <span class="detail-val">{{ formatFileSize(previewFile.fileSizeBytes) }}</span>
                </div>
              </div>
            </div>

            <!-- 6. Generic Safe Asset Card -->
            <div
              class="preview-doc-card doc-generic"
              *ngIf="!isImageFile(previewFile) && !isPdfFile(previewFile) && !isExcelFile(previewFile) && !isWordFile(previewFile) && !isZipFile(previewFile)"
            >
              <div class="doc-card-icon generic-icon">
                <span class="material-symbols-outlined">{{ getFileIcon(previewFile) }}</span>
              </div>
              <h4>{{ previewFile.fileName }}</h4>
              <p>This verified website asset is ready for download or linking across your website pages, sections, or articles.</p>
              <div class="doc-card-details">
                <div class="detail-row">
                  <span class="detail-label">File Name:</span>
                  <span class="detail-val">{{ previewFile.fileName }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">File Size:</span>
                  <span class="detail-val">{{ formatFileSize(previewFile.fileSizeBytes) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Modal Footer Actions -->
          <div class="preview-modal-footer">
            <div class="modal-footer-left">
              <code class="modal-url-pill" [title]="previewFile.fileUrl" (click)="copyUrl(previewFile)">{{ previewFile.fileUrl }}</code>
            </div>
            <div class="modal-footer-actions">
              <button
                type="button"
                class="btn btn-secondary btn-sm"
                [class.copied]="copiedFileId === previewFile.id"
                (click)="copyUrl(previewFile)"
              >
                <span class="material-symbols-outlined fs-6">{{ copiedFileId === previewFile.id ? 'check' : 'content_copy' }}</span>
                <span>{{ copiedFileId === previewFile.id ? 'Copied!' : 'Copy URL' }}</span>
              </button>
              <a
                [href]="previewFile.fileUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="btn btn-secondary btn-sm"
              >
                <span class="material-symbols-outlined fs-6">open_in_new</span>
                <span>Open Original</span>
              </a>
              <a
                [href]="previewFile.fileUrl"
                [download]="previewFile.fileName"
                class="btn btn-primary btn-sm"
              >
                <span class="material-symbols-outlined fs-6">download</span>
                <span>Download</span>
              </a>
              <button type="button" class="btn btn-outline btn-sm" (click)="closePreviewModal()">
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .cms-page-container { display: flex; flex-direction: column; gap: 20px; position: relative; }

    .btn {
      display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px;
      border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; text-decoration: none; border: none;
      transition: all 0.2s ease;
    }
    .btn-primary { background: #0050e5; color: #fff; }
    .btn-primary:hover:not([disabled]) { background: #003ebd; }
    .btn-secondary { background: #eff6ff; color: #0050e5; border: 1px solid #bfdbfe; }
    .btn-secondary:hover { background: #0050e5; color: #fff; border-color: #0050e5; }
    .btn-outline { background: #fff; color: #475569; border: 1px solid #cbd5e1; }
    .btn-outline:hover { background: #f8fafc; color: #0f172a; border-color: #94a3b8; }
    .btn-sm { padding: 8px 14px; font-size: 12.5px; border-radius: 8px; }

    /* ========================================== */
    /* STORAGE QUOTA BANNER                      */
    /* ========================================== */
    .storage-quota-card {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .storage-quota-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }
    .quota-title-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .quota-icon {
      font-size: 26px;
      color: #0050e5;
      background: #eff6ff;
      padding: 6px;
      border-radius: 8px;
    }
    .quota-title-wrap strong {
      display: block;
      font-size: 14px;
      color: #0f172a;
    }
    .quota-title-wrap span {
      display: block;
      font-size: 12px;
      color: #64748b;
    }
    .quota-stats-wrap {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .quota-numbers {
      font-size: 13.5px;
      font-weight: 700;
      color: #0f172a;
    }
    .quota-numbers .divider { color: #94a3b8; margin: 0 4px; }
    .quota-numbers .max-text { color: #64748b; }
    .quota-status-pill {
      font-size: 11.5px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 999px;
    }
    .status-normal { background: #eff6ff; color: #0050e5; border: 1px solid #bfdbfe; }
    .status-warning { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
    .status-danger { background: #fef2f2; color: #dc2626; border: 1px solid #fca5a5; }

    .quota-progress-track {
      height: 8px;
      background: #f1f5f9;
      border-radius: 999px;
      overflow: hidden;
    }
    .quota-progress-bar {
      height: 100%;
      border-radius: 999px;
      transition: width 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .quota-progress-bar.status-normal { background: #0050e5; }
    .quota-progress-bar.status-warning { background: #f59e0b; }
    .quota-progress-bar.status-danger { background: #ef4444; }

    .quota-footer-info {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: #64748b;
    }

    /* Upload Dropzone */
    .upload-dropzone {
      background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 14px;
      padding: 20px 24px; cursor: pointer; transition: all 0.2s ease;
    }
    .upload-dropzone:hover, .upload-dropzone.dragging {
      border-color: #0050e5; background: #eff6ff;
    }
    .upload-dropzone.uploading { cursor: wait; opacity: 0.85; }
    .dropzone-content {
      display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;
    }
    .dropzone-icon-wrap {
      width: 48px; height: 48px; border-radius: 12px; background: #eff6ff; color: #0050e5;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .dropzone-icon-wrap .material-symbols-outlined { font-size: 26px; }
    .dropzone-text { flex: 1; display: flex; flex-direction: column; gap: 3px; min-width: 220px; }
    .dropzone-text strong { font-size: 14px; color: #0f172a; }
    .dropzone-text span { font-size: 12.5px; color: #64748b; }

    /* Filter Bar */
    .filter-bar {
      display: flex; justify-content: space-between; align-items: center; gap: 14px;
      background: #fff; padding: 12px 18px; border-radius: 12px; border: 1px solid #e2e8f0;
      flex-wrap: wrap;
    }
    .search-box {
      display: flex; align-items: center; gap: 8px; background: #f8fafc;
      padding: 7px 14px; border-radius: 8px; border: 1px solid #e2e8f0; width: 280px; max-width: 100%;
    }
    .search-box input { border: none; background: transparent; font-size: 13px; outline: none; width: 100%; color: #0f172a; }
    .btn-clear-search {
      background: none; border: none; color: #64748b; cursor: pointer; display: inline-flex; padding: 2px;
    }

    .sort-selector-wrap {
      display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: #64748b;
    }
    .sort-label { font-weight: 600; }
    .select-sort {
      background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 6px 10px;
      font-size: 12.5px; color: #0f172a; outline: none; cursor: pointer;
    }

    .filter-pills { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .filter-pill {
      padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: 600;
      border: 1px solid #e2e8f0; background: #f8fafc; color: #475569; cursor: pointer; transition: all 0.15s;
    }
    .filter-pill:hover { background: #eff6ff; border-color: #bfdbfe; color: #0050e5; }
    .filter-pill.active { background: #0050e5; border-color: #0050e5; color: #fff; }

    /* Card & Table */
    .cms-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; position: relative; }
    .card-header-bar {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px solid #f1f5f9; gap: 16px; flex-wrap: wrap;
    }
    .card-header-bar h3 { font-size: 17px; font-weight: 800; color: #0f172a; margin: 0 0 2px; }
    .card-sub { font-size: 13px; color: #64748b; margin: 0; }

    .page-size-selector { display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: #64748b; }
    .select-page-size {
      background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 6px 10px;
      font-size: 12.5px; color: #0f172a; outline: none; cursor: pointer;
    }

    .table-responsive { overflow: visible; }
    .cms-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .cms-table th {
      text-align: left; padding: 12px; background: #f8fafc; color: #64748b;
      font-weight: 700; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-transform: uppercase;
      user-select: none;
    }
    .sortable-th { cursor: pointer; transition: background 0.15s, color 0.15s; }
    .sortable-th:hover { background: #f1f5f9; color: #0050e5; }
    .th-content { display: inline-flex; align-items: center; gap: 4px; }
    .sort-icon { font-size: 16px; color: #0050e5; }

    .cms-table td { padding: 14px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
    .file-table-row { position: relative; }
    .file-table-row:hover { background: #f8fafc; }
    .file-table-row:hover .file-thumb-container { z-index: 100; }

    /* File Name Cell */
    .file-name-cell { display: flex; align-items: center; gap: 12px; min-width: 200px; position: relative; }

    /* ========================================== */
    /* HOVER ZOOM CARD STYLES                    */
    /* ========================================== */
    .file-thumb-container {
      position: relative;
      display: inline-flex;
      align-items: center;
      flex-shrink: 0;
    }
    .file-thumb {
      width: 44px; height: 44px; border-radius: 10px; overflow: hidden;
      border: 1px solid #cbd5e1; background: #0f172a; flex-shrink: 0; cursor: pointer;
      transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s ease, box-shadow 0.2s ease;
      display: flex; align-items: center; justify-content: center;
    }
    .file-thumb:hover {
      transform: scale(1.12);
      border-color: #0050e5;
      box-shadow: 0 6px 16px rgba(0, 80, 229, 0.25);
    }
    .file-thumb img { width: 100%; height: 100%; object-fit: cover; }

    /* Floating Popout Hover Zoom Card */
    .thumb-hover-popover {
      position: absolute;
      left: calc(100% + 14px);
      top: 50%;
      transform: translateY(-50%) scale(0.92);
      width: 240px;
      height: 240px;
      background: #0f172a;
      border: 2px solid #0050e5;
      border-radius: 14px;
      box-shadow: 0 20px 45px -5px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.1);
      z-index: 9999;
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.2s;
    }
    .file-thumb-container:hover .thumb-hover-popover {
      opacity: 1;
      visibility: visible;
      transform: translateY(-50%) scale(1);
    }
    .thumb-hover-img-wrap {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 10px;
      background: repeating-conic-gradient(#1e293b 0% 25%, #0f172a 0% 50%) 50% / 18px 18px;
      overflow: hidden;
    }
    .thumb-hover-img-wrap img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      border-radius: 6px;
    }
    .thumb-hover-footer {
      background: rgba(15, 23, 42, 0.95);
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      padding: 8px 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }
    .thumb-hover-name {
      font-size: 11.5px;
      font-weight: 600;
      color: #f8fafc;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
    }
    .thumb-hover-size {
      font-size: 11px;
      color: #94a3b8;
      font-weight: 500;
      flex-shrink: 0;
    }

    .file-icon-box {
      width: 44px; height: 44px; border-radius: 10px; display: flex;
      align-items: center; justify-content: center; flex-shrink: 0;
      transition: transform 0.15s ease;
    }
    .file-icon-box:hover { transform: scale(1.08); }
    .file-name-meta { display: flex; flex-direction: column; min-width: 0; }
    .file-name-meta strong {
      font-size: 13.5px; color: #0f172a; white-space: nowrap;
      overflow: hidden; text-overflow: ellipsis; max-width: 240px;
    }
    .clickable-filename { cursor: pointer; transition: color 0.15s; }
    .clickable-filename:hover { color: #0050e5; text-decoration: underline; }
    .file-ext-sub { font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; }

    /* File Size Cell */
    .size-cell { white-space: nowrap; }
    .file-size-badge {
      font-size: 12.5px; font-weight: 700; color: #334155;
      background: #f1f5f9; padding: 4px 10px; border-radius: 6px; border: 1px solid #e2e8f0;
    }

    /* URL Copy Cell */
    .url-copy-cell { display: flex; align-items: center; gap: 8px; max-width: 320px; }
    .url-pill {
      display: block; flex: 1; min-width: 0; background: #f1f5f9; color: #334155;
      padding: 5px 10px; border-radius: 6px; font-size: 11.5px; border: 1px solid #e2e8f0;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer;
    }
    .url-pill:hover { border-color: #93c5fd; background: #eff6ff; color: #0050e5; }
    .btn-copy-inline {
      display: inline-flex; align-items: center; gap: 4px; padding: 5px 10px;
      border-radius: 6px; border: 1px solid #cbd5e1; background: #fff; color: #334155;
      font-size: 11.5px; font-weight: 600; cursor: pointer; flex-shrink: 0; transition: all 0.15s;
    }
    .btn-copy-inline:hover { border-color: #0050e5; color: #0050e5; background: #eff6ff; }
    .btn-copy-inline.copied { border-color: #16a34a; background: #dcfce7; color: #15803d; }

    /* Date Cell */
    .date-cell { display: flex; flex-direction: column; white-space: nowrap; }
    .date-cell span { font-weight: 600; color: #334155; font-size: 12.5px; }
    .date-cell small { font-size: 11px; color: #64748b; }

    /* Type Badges */
    .type-badge {
      display: inline-flex; align-items: center; padding: 3px 9px; border-radius: 6px;
      font-size: 11px; font-weight: 800; letter-spacing: 0.03em; text-transform: uppercase;
    }
    .type-image { background: #eff6ff; color: #0050e5; }
    .type-pdf { background: #fef2f2; color: #dc2626; }
    .type-doc { background: #eff6ff; color: #1d4ed8; }
    .type-excel { background: #ecfdf5; color: #059669; }
    .type-zip { background: #fffbeb; color: #d97706; }
    .type-media { background: #f3e8ff; color: #7c3aed; }
    .type-other { background: #f1f5f9; color: #475569; }

    /* Actions */
    .action-buttons { display: flex; gap: 6px; align-items: center; }
    .btn-action {
      display: inline-flex; align-items: center; gap: 4px; padding: 6px 10px;
      border-radius: 6px; font-size: 12px; font-weight: 600; text-decoration: none; cursor: pointer; border: none;
      transition: all 0.15s ease; white-space: nowrap;
    }
    .btn-preview { background: #eff6ff; color: #0050e5; border: 1px solid #bfdbfe; }
    .btn-preview:hover { background: #0050e5; color: #fff; border-color: #0050e5; }
    .btn-copy { background: #f1f5f9; color: #334155; }
    .btn-copy:hover { background: #e2e8f0; color: #0f172a; }
    .btn-open { background: #f8fafc; color: #475569; border: 1px solid #e2e8f0; }
    .btn-open:hover { background: #0f172a; color: #fff; border-color: #0f172a; }
    .btn-delete { background: #fee2e2; color: #dc2626; padding: 6px 8px; }
    .btn-delete:hover { background: #dc2626; color: #fff; }

    .loading-box { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 50px; color: #64748b; }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { 100% { transform: rotate(360deg); } }

    .empty-cell { text-align: center; padding: 40px !important; }
    .empty-state { display: flex; flex-direction: column; align-items: center; gap: 8px; color: #64748b; }
    .empty-state .material-symbols-outlined { font-size: 38px; color: #94a3b8; }
    .empty-state p { margin: 0; font-size: 13.5px; }

    /* ========================================== */
    /* PAGINATION BAR STYLES                     */
    /* ========================================== */
    .pagination-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid #f1f5f9;
      gap: 16px;
      flex-wrap: wrap;
    }
    .pagination-info { font-size: 12.5px; color: #64748b; }
    .pagination-controls { display: flex; align-items: center; gap: 4px; }
    .btn-page-nav {
      background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;
      width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;
      cursor: pointer; color: #475569; transition: all 0.15s;
    }
    .btn-page-nav:hover:not([disabled]) { background: #eff6ff; border-color: #bfdbfe; color: #0050e5; }
    .btn-page-nav[disabled] { opacity: 0.4; cursor: not-allowed; }
    .btn-page-num {
      min-width: 34px; height: 34px; padding: 0 8px; border-radius: 8px;
      border: 1px solid #e2e8f0; background: #f8fafc; color: #475569;
      font-size: 12.5px; font-weight: 600; cursor: pointer; transition: all 0.15s;
    }
    .btn-page-num:hover { background: #eff6ff; border-color: #bfdbfe; color: #0050e5; }
    .btn-page-num.active { background: #0050e5; border-color: #0050e5; color: #fff; }

    .pagination-page-size-wrap { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #64748b; }
    .page-size-pills { display: flex; gap: 4px; }
    .size-pill {
      padding: 4px 10px; border-radius: 6px; font-size: 11.5px; font-weight: 600;
      border: 1px solid #e2e8f0; background: #f8fafc; color: #475569; cursor: pointer; transition: all 0.15s;
    }
    .size-pill:hover { background: #eff6ff; border-color: #bfdbfe; color: #0050e5; }
    .size-pill.active { background: #0050e5; border-color: #0050e5; color: #fff; }

    /* ========================================== */
    /* INTERACTIVE PREVIEW MODAL STYLES          */
    /* ========================================== */
    .preview-modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(8px);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      animation: modalFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes modalFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .preview-modal-card {
      background: #fff;
      border-radius: 18px;
      width: 920px;
      max-width: 96vw;
      max-height: 92vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1);
      animation: modalScaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes modalScaleUp {
      from { transform: scale(0.95); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }

    .preview-modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 22px;
      border-bottom: 1px solid #e2e8f0;
      background: #f8fafc;
    }
    .preview-header-left {
      display: flex;
      align-items: center;
      gap: 14px;
      min-width: 0;
      flex: 1;
    }
    .preview-header-icon {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .preview-header-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
      flex: 1;
    }
    .preview-modal-title {
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .preview-meta-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: #64748b;
    }
    .preview-meta-dot { color: #cbd5e1; }
    .btn-close-modal {
      background: #fff;
      border: 1px solid #cbd5e1;
      width: 36px;
      height: 36px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: #64748b;
      transition: all 0.15s ease;
      flex-shrink: 0;
    }
    .btn-close-modal:hover { background: #fee2e2; border-color: #fca5a5; color: #dc2626; }

    /* Modal Body */
    .preview-modal-body {
      flex: 1;
      overflow-y: auto;
      padding: 0;
      background: #0b1120;
      display: flex;
      flex-direction: column;
      min-height: 340px;
      max-height: 64vh;
    }

    /* Image Preview Stage */
    .preview-image-stage {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 380px;
    }
    .image-stage-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 18px;
      background: rgba(15, 23, 42, 0.95);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      color: #94a3b8;
      font-size: 12px;
    }
    .image-stage-hint { display: flex; align-items: center; gap: 6px; }
    .btn-toggle-fit {
      display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px;
      border-radius: 6px; background: rgba(255, 255, 255, 0.1); color: #fff;
      border: 1px solid rgba(255, 255, 255, 0.2); font-size: 12px; font-weight: 600;
      cursor: pointer; transition: all 0.15s;
    }
    .btn-toggle-fit:hover { background: #0050e5; border-color: #0050e5; }
    .btn-toggle-fit .material-symbols-outlined { font-size: 16px; }

    .image-canvas {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background: repeating-conic-gradient(#1e293b 0% 25%, #0f172a 0% 50%) 50% / 22px 22px;
      overflow: auto;
      cursor: zoom-in;
    }
    .image-canvas img {
      max-width: 100%;
      max-height: 52vh;
      object-fit: contain;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      border-radius: 6px;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .image-canvas.mode-original {
      align-items: flex-start;
      justify-content: flex-start;
      cursor: zoom-out;
    }
    .image-canvas.mode-original img {
      max-width: none;
      max-height: none;
    }

    /* PDF Stage */
    .preview-pdf-stage { width: 100%; height: 580px; background: #fff; }
    .pdf-iframe-wrap { width: 100%; height: 100%; }
    .pdf-iframe-wrap iframe { width: 100%; height: 100%; border: none; }

    /* Document / Spreadsheet / Archive Cards */
    .preview-doc-card {
      margin: 36px auto;
      max-width: 580px;
      background: #fff;
      border-radius: 16px;
      padding: 32px 28px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25);
    }
    .doc-card-icon {
      width: 72px;
      height: 72px;
      border-radius: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;
    }
    .doc-card-icon .material-symbols-outlined { font-size: 38px; }
    .excel-icon { background: #dcfce7; color: #15803d; }
    .word-icon { background: #dbeafe; color: #1d4ed8; }
    .zip-icon { background: #fef3c7; color: #b45309; }
    .generic-icon { background: #f1f5f9; color: #475569; }

    .preview-doc-card h4 { font-size: 18px; font-weight: 800; color: #0f172a; margin: 0 0 8px; }
    .preview-doc-card p { font-size: 13.5px; color: #64748b; margin: 0 0 20px; line-height: 1.5; }

    .doc-card-details {
      width: 100%;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px 18px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
    }
    .detail-label { color: #64748b; font-weight: 500; }
    .detail-val { color: #0f172a; font-weight: 700; max-width: 340px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    /* Modal Footer */
    .preview-modal-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 22px;
      border-top: 1px solid #e2e8f0;
      background: #fff;
      gap: 14px;
      flex-wrap: wrap;
    }
    .modal-footer-left { flex: 1; min-width: 220px; }
    .modal-url-pill {
      display: block;
      background: #f1f5f9;
      color: #334155;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 12px;
      border: 1px solid #e2e8f0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      cursor: pointer;
    }
    .modal-url-pill:hover { background: #eff6ff; color: #0050e5; border-color: #93c5fd; }
    .modal-footer-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  `]
})
export class FileManagerComponent implements OnInit {
  files: any[] = [];
  filteredFiles: any[] = [];
  paginatedFiles: any[] = [];
  loading = false;
  uploading = false;
  uploadProgressText = '';
  isDragging = false;
  searchTerm = '';
  selectedCategory: 'all' | 'image' | 'pdf' | 'document' | 'excel' | 'archive' | 'other' = 'all';
  copiedFileId: string | null = null;

  // Sorting State
  sortColumn: 'fileName' | 'fileSizeBytes' | 'createdAtUtc' | 'fileType' = 'createdAtUtc';
  sortDirection: 'asc' | 'desc' = 'desc';
  sortOrderKey: string = 'createdAtUtc_desc';

  // Pagination State (10, 25, 50, all)
  pageSize: number | 'all' = 10;
  currentPage: number = 1;
  totalPages: number = 1;

  // Workspace Storage Quota State (500 MB Default or Custom Tenant Quota from Central)
  totalStorageUsedBytes: number = 0;
  maxStorageQuotaMb: number = 500;
  maxStorageQuotaBytes: number = 500 * 1024 * 1024;

  get storageUsedPercent(): number {
    if (!this.maxStorageQuotaBytes || this.maxStorageQuotaBytes <= 0) return 0;
    return Math.min(100, (this.totalStorageUsedBytes / this.maxStorageQuotaBytes) * 100);
  }

  get remainingStorageBytes(): number {
    return Math.max(0, this.maxStorageQuotaBytes - this.totalStorageUsedBytes);
  }

  getStorageStatusClass(): string {
    const pct = this.storageUsedPercent;
    if (pct >= 90) return 'status-danger';
    if (pct >= 75) return 'status-warning';
    return 'status-normal';
  }

  // Interactive Preview Modal State
  previewModalOpen = false;
  previewFile: any = null;
  imageFitMode: 'contain' | 'original' = 'contain';
  sanitizedPreviewUrl: SafeResourceUrl | null = null;

  /**
   * Strict whitelist of safe extensions supported by the File Manager.
   * Prohibits all executable scripts, binaries, and system code.
   */
  readonly SAFE_ALLOWED_EXTENSIONS: string[] = [
    // Images
    '.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif', '.ico', '.bmp', '.avif',
    // Documents & PDFs
    '.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt',
    // Spreadsheets
    '.xls', '.xlsx', '.csv',
    // Presentations
    '.ppt', '.pptx',
    // Compressed Archives
    '.zip', '.rar', '.7z', '.tar', '.gz'
  ];

  get safeAcceptString(): string {
    return this.SAFE_ALLOWED_EXTENSIONS.join(',');
  }

  get headerButtons(): PageHeaderButton[] {
    return [
      {
        text: 'Refresh List',
        icon: 'refresh',
        action: () => this.loadFiles()
      }
    ];
  }

  constructor(
    private api: ApiService,
    private toast: ToastService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.loadFiles();
  }

  /**
   * Closes the preview modal on Escape key press.
   */
  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.previewModalOpen) {
      this.closePreviewModal();
    }
  }

  loadFiles(): void {
    this.loading = true;
    this.api.get<any>('ContentApi/files').subscribe({
      next: (res) => {
        this.loading = false;
        if (Array.isArray(res?.data)) {
          this.files = res.data;
          this.totalStorageUsedBytes = this.files.reduce((acc, f) => acc + (f.fileSizeBytes || 0), 0);
          this.maxStorageQuotaMb = 500;
        } else if (res?.data?.files) {
          this.files = res.data.files;
          this.totalStorageUsedBytes = res.data.totalStorageUsedBytes ?? this.files.reduce((acc, f) => acc + (f.fileSizeBytes || 0), 0);
          this.maxStorageQuotaMb = res.data.maxStorageQuotaMb || 500;
        } else {
          this.files = [];
          this.totalStorageUsedBytes = 0;
          this.maxStorageQuotaMb = 500;
        }

        this.maxStorageQuotaBytes = this.maxStorageQuotaMb * 1024 * 1024;
        this.applyFilters();
      },
      error: (err) => {
        this.loading = false;
        this.toast.error(err?.error?.message || 'Failed to load uploaded files.');
      }
    });
  }

  setCategory(cat: 'all' | 'image' | 'pdf' | 'document' | 'excel' | 'archive' | 'other'): void {
    this.selectedCategory = cat;
    this.currentPage = 1;
    this.applyFilters();
  }

  // ==========================================
  // SORTING & FILTERING
  // ==========================================

  setSort(column: 'fileName' | 'fileSizeBytes' | 'createdAtUtc' | 'fileType'): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = column === 'createdAtUtc' || column === 'fileSizeBytes' ? 'desc' : 'asc';
    }
    this.sortOrderKey = `${this.sortColumn}_${this.sortDirection}`;
    this.applyFilters();
  }

  onSortKeyChange(key: string): void {
    const parts = key.split('_');
    if (parts.length === 2) {
      this.sortColumn = parts[0] as any;
      this.sortDirection = parts[1] as any;
      this.applyFilters();
    }
  }

  applyFilters(): void {
    const term = (this.searchTerm || '').trim().toLowerCase();
    let result = (this.files || []).filter(f => {
      const matchesSearch = !term ||
        (f.fileName || '').toLowerCase().includes(term) ||
        (f.fileUrl || '').toLowerCase().includes(term) ||
        (f.fileType || '').toLowerCase().includes(term);

      if (!matchesSearch) return false;

      if (this.selectedCategory === 'all') return true;
      if (this.selectedCategory === 'image') return this.isImageFile(f);
      if (this.selectedCategory === 'pdf') return this.isPdfFile(f);
      if (this.selectedCategory === 'document') return this.isWordFile(f);
      if (this.selectedCategory === 'excel') return this.isExcelFile(f);
      if (this.selectedCategory === 'archive') return this.isZipFile(f);
      return !this.isImageFile(f) && !this.isPdfFile(f) && !this.isWordFile(f) && !this.isExcelFile(f) && !this.isZipFile(f);
    });

    // Apply Sorting
    result.sort((a, b) => {
      let valA: any = a[this.sortColumn];
      let valB: any = b[this.sortColumn];

      if (this.sortColumn === 'fileName' || this.sortColumn === 'fileType') {
        valA = (valA || '').toString().toLowerCase();
        valB = (valB || '').toString().toLowerCase();
        return this.sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      } else if (this.sortColumn === 'fileSizeBytes') {
        valA = Number(valA || 0);
        valB = Number(valB || 0);
        return this.sortDirection === 'asc' ? valA - valB : valB - valA;
      } else if (this.sortColumn === 'createdAtUtc') {
        const timeA = new Date(valA || 0).getTime();
        const timeB = new Date(valB || 0).getTime();
        return this.sortDirection === 'asc' ? timeA - timeB : timeB - timeA;
      }
      return 0;
    });

    this.filteredFiles = result;
    this.updatePagination();
  }

  // ==========================================
  // PAGINATION CONTROLS
  // ==========================================

  setPageSize(size: number | 'all'): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.updatePagination();
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.updatePagination();
  }

  setPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updatePagination();
  }

  updatePagination(): void {
    if (this.pageSize === 'all') {
      this.totalPages = 1;
      this.currentPage = 1;
      this.paginatedFiles = [...this.filteredFiles];
    } else {
      const size = Number(this.pageSize);
      this.totalPages = Math.max(1, Math.ceil(this.filteredFiles.length / size));
      if (this.currentPage > this.totalPages) {
        this.currentPage = this.totalPages;
      }
      const start = (this.currentPage - 1) * size;
      this.paginatedFiles = this.filteredFiles.slice(start, start + size);
    }
  }

  getPaginationStart(): number {
    if (this.filteredFiles.length === 0) return 0;
    if (this.pageSize === 'all') return 1;
    return (this.currentPage - 1) * Number(this.pageSize) + 1;
  }

  getPaginationEnd(): number {
    if (this.filteredFiles.length === 0) return 0;
    if (this.pageSize === 'all') return this.filteredFiles.length;
    return Math.min(this.currentPage * Number(this.pageSize), this.filteredFiles.length);
  }

  getVisiblePages(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  // ==========================================
  // UPLOAD HANDLERS WITH STRICT SAFE WHITELIST & QUOTA CAP
  // ==========================================

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
    const droppedFiles = event.dataTransfer?.files;
    if (droppedFiles && droppedFiles.length > 0) {
      this.uploadFiles(Array.from(droppedFiles));
    }
  }

  onFilesSelected(event: any): void {
    const selected: FileList = event?.target?.files;
    if (selected && selected.length > 0) {
      this.uploadFiles(Array.from(selected));
      event.target.value = '';
    }
  }

  async uploadFiles(fileList: File[]): Promise<void> {
    if (fileList.length === 0) return;

    // 1. Strict client-side validation against safe whitelist
    const validFiles: File[] = [];
    for (const file of fileList) {
      const dotIndex = file.name.lastIndexOf('.');
      const ext = dotIndex !== -1 ? file.name.substring(dotIndex).toLowerCase() : '';
      if (!this.SAFE_ALLOWED_EXTENSIONS.includes(ext)) {
        this.toast.error(`File "${file.name}" was blocked. Only safe files (images, PDFs, Word/Excel documents, and Zip archives) are supported.`);
      } else {
        validFiles.push(file);
      }
    }

    if (validFiles.length === 0) return;

    // 2. Storage Quota Pre-check (500 MB default or custom tenant quota)
    let incomingBytes = 0;
    for (const f of validFiles) {
      incomingBytes += f.size;
    }

    if (this.totalStorageUsedBytes + incomingBytes > this.maxStorageQuotaBytes) {
      const usedMb = (this.totalStorageUsedBytes / (1024 * 1024)).toFixed(1);
      const incomingMb = (incomingBytes / (1024 * 1024)).toFixed(1);
      this.toast.error(
        `Storage quota exceeded. Your workspace has used ${usedMb} MB of ${this.maxStorageQuotaMb} MB. Adding ${incomingMb} MB would exceed your storage cap. Please remove unused files.`
      );
      return;
    }

    this.uploading = true;
    let successCount = 0;

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      this.uploadProgressText = `${i + 1} of ${validFiles.length} (${file.name})`;

      const formData = new FormData();
      formData.append('file', file);

      try {
        const res: any = await this.api.post<any>('ContentApi/files/upload', formData).toPromise();
        if (res?.data) {
          this.files.unshift(res.data);
          this.totalStorageUsedBytes += res.data.fileSizeBytes || file.size;
          successCount++;
        }
      } catch (err: any) {
        this.toast.error(err?.error?.message || `Failed to upload "${file.name}".`);
      }
    }

    this.uploading = false;
    this.uploadProgressText = '';
    this.applyFilters();

    if (successCount > 0) {
      this.toast.success(`${successCount} file(s) uploaded and ready for use.`);
    }
  }

  // ==========================================
  // INTERACTIVE MODAL PREVIEW HANDLERS
  // ==========================================

  openPreviewModal(file: any): void {
    if (!file) return;
    this.previewFile = file;
    this.imageFitMode = 'contain';

    if (this.isPdfFile(file) && file.fileUrl) {
      this.sanitizedPreviewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(file.fileUrl);
    } else {
      this.sanitizedPreviewUrl = null;
    }

    this.previewModalOpen = true;
  }

  closePreviewModal(): void {
    this.previewModalOpen = false;
    this.previewFile = null;
    this.sanitizedPreviewUrl = null;
  }

  toggleImageFit(): void {
    this.imageFitMode = this.imageFitMode === 'contain' ? 'original' : 'contain';
  }

  // ==========================================
  // COPY URL & DELETE
  // ==========================================

  async copyUrl(file: any): Promise<void> {
    if (!file?.fileUrl) return;
    try {
      await navigator.clipboard.writeText(file.fileUrl);
      this.copiedFileId = file.id;
      this.toast.success('URL copied to clipboard!');
      setTimeout(() => {
        if (this.copiedFileId === file.id) {
          this.copiedFileId = null;
        }
      }, 2200);
    } catch {
      this.toast.error('Unable to copy URL automatically. Please select and copy manually.');
    }
  }

  async deleteFile(file: any): Promise<void> {
    const confirmed = await this.toast.confirm(
      'Delete File',
      `Are you sure you want to remove "${file.fileName}" from the File Manager? Note: Any web pages referencing this URL directly may break if it is removed.`,
      'Delete',
      'Cancel',
      'danger'
    );
    if (!confirmed) return;

    this.api.delete<any>(`ContentApi/files/${file.id}`).subscribe({
      next: () => {
        if (this.previewFile?.id === file.id) {
          this.closePreviewModal();
        }
        this.files = this.files.filter(f => f.id !== file.id);
        this.totalStorageUsedBytes = Math.max(0, this.totalStorageUsedBytes - (file.fileSizeBytes || 0));
        this.applyFilters();
        this.toast.success(`File "${file.fileName}" deleted.`);
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'Failed to delete file.');
      }
    });
  }

  // ==========================================
  // FILE TYPE & FORMATTING HELPERS
  // ==========================================

  isImageFile(file: any): boolean {
    const type = (file?.fileType || '').toUpperCase();
    const ct = (file?.contentType || '').toLowerCase();
    return ct.startsWith('image/') || ['PNG', 'JPG', 'JPEG', 'GIF', 'WEBP', 'SVG', 'ICO', 'AVIF', 'BMP'].includes(type);
  }

  isPdfFile(file: any): boolean {
    const type = (file?.fileType || '').toUpperCase();
    const ct = (file?.contentType || '').toLowerCase();
    return type === 'PDF' || ct === 'application/pdf';
  }

  isExcelFile(file: any): boolean {
    const type = (file?.fileType || '').toUpperCase();
    return ['XLS', 'XLSX', 'CSV'].includes(type);
  }

  isWordFile(file: any): boolean {
    const type = (file?.fileType || '').toUpperCase();
    return ['DOC', 'DOCX', 'TXT', 'RTF', 'ODT'].includes(type);
  }

  isZipFile(file: any): boolean {
    const type = (file?.fileType || '').toUpperCase();
    return ['ZIP', 'RAR', '7Z', 'TAR', 'GZ'].includes(type);
  }

  isMediaFile(file: any): boolean {
    const type = (file?.fileType || '').toUpperCase();
    const ct = (file?.contentType || '').toLowerCase();
    return ct.startsWith('video/') || ct.startsWith('audio/') || ['MP4', 'WEBM', 'MOV', 'AVI', 'MP3', 'WAV', 'OGG'].includes(type);
  }

  getFileIcon(file: any): string {
    const type = (file?.fileType || '').toUpperCase();
    if (this.isPdfFile(file)) return 'picture_as_pdf';
    if (this.isImageFile(file)) return 'image';
    if (this.isExcelFile(file)) return 'table_chart';
    if (this.isWordFile(file)) return 'description';
    if (this.isZipFile(file)) return 'folder_zip';
    if (this.isMediaFile(file)) return 'movie';
    if (['PPT', 'PPTX'].includes(type)) return 'co_present';
    return 'insert_drive_file';
  }

  getFileIconColorClass(file: any): string {
    const type = (file?.fileType || '').toUpperCase();
    if (this.isPdfFile(file)) return 'type-pdf';
    if (this.isImageFile(file)) return 'type-image';
    if (this.isExcelFile(file)) return 'type-excel';
    if (this.isWordFile(file)) return 'type-doc';
    if (this.isZipFile(file)) return 'type-zip';
    if (this.isMediaFile(file)) return 'type-media';
    return 'type-other';
  }

  formatFileSize(bytes: number): string {
    if (!bytes || bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}
