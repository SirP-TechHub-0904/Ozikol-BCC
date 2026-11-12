import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
        style="display: none"
        (change)="onFilesSelected($event)"
      />

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
            <span>Supports images (PNG, JPG, WebP, SVG), PDFs, Word/Excel docs, videos, audio, and downloadable assets.</span>
          </div>
          <button type="button" class="btn btn-primary btn-sm" *ngIf="!uploading" (click)="$event.stopPropagation(); fileInput.click()">
            <span class="material-symbols-outlined fs-6">upload_file</span>
            <span>Choose File(s)</span>
          </button>
        </div>
      </div>

      <!-- Search & Filter Bar -->
      <div class="filter-bar">
        <div class="search-box">
          <span class="material-symbols-outlined text-muted">search</span>
          <input
            type="text"
            [(ngModel)]="searchTerm"
            (ngModelChange)="applyFilters()"
            placeholder="Search by file name, URL, or file type..."
          />
          <button type="button" class="btn-clear-search" *ngIf="searchTerm" (click)="searchTerm = ''; applyFilters()">
            <span class="material-symbols-outlined fs-6">close</span>
          </button>
        </div>

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
            [class.active]="selectedCategory === 'document'"
            (click)="setCategory('document')"
          >
            Documents & PDFs
          </button>
          <button
            type="button"
            class="filter-pill"
            [class.active]="selectedCategory === 'media'"
            (click)="setCategory('media')"
          >
            Video & Audio
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
            <p class="card-sub">Copy any File URL directly into your web pages, sections, buttons, or blog articles.</p>
          </div>
        </div>

        <!-- Loading State -->
        <div class="loading-box" *ngIf="loading">
          <span class="material-symbols-outlined spin">progress_activity</span>
          <p>Loading uploaded files...</p>
        </div>

        <div class="table-responsive" *ngIf="!loading">
          <table class="cms-table">
            <thead>
              <tr>
                <th>FILE NAME</th>
                <th>FILE URL</th>
                <th>DATE</th>
                <th>FILE TYPE</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let f of filteredFiles">
                <!-- File Name with Icon/Preview -->
                <td>
                  <div class="file-name-cell">
                    <div class="file-thumb" *ngIf="isImageFile(f); else iconThumb">
                      <img [src]="f.fileUrl" [alt]="f.fileName" loading="lazy" />
                    </div>
                    <ng-template #iconThumb>
                      <div class="file-icon-box" [ngClass]="getFileIconColorClass(f)">
                        <span class="material-symbols-outlined">{{ getFileIcon(f) }}</span>
                      </div>
                    </ng-template>
                    <div class="file-name-meta">
                      <strong [title]="f.fileName">{{ f.fileName }}</strong>
                      <span class="file-size-label">{{ formatFileSize(f.fileSizeBytes) }}</span>
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
                <td colspan="5" class="empty-cell">
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
      </div>
    </div>
  `,
  styles: [`
    .cms-page-container { display: flex; flex-direction: column; gap: 20px; }

    .btn {
      display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px;
      border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; text-decoration: none; border: none;
      transition: all 0.2s ease;
    }
    .btn-primary { background: #0050e5; color: #fff; }
    .btn-primary:hover:not([disabled]) { background: #003ebd; }
    .btn-sm { padding: 8px 14px; font-size: 12.5px; border-radius: 8px; }

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
      padding: 7px 14px; border-radius: 8px; border: 1px solid #e2e8f0; width: 340px; max-width: 100%;
    }
    .search-box input { border: none; background: transparent; font-size: 13px; outline: none; width: 100%; color: #0f172a; }
    .btn-clear-search {
      background: none; border: none; color: #64748b; cursor: pointer; display: inline-flex; padding: 2px;
    }
    .filter-pills { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .filter-pill {
      padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: 600;
      border: 1px solid #e2e8f0; background: #f8fafc; color: #475569; cursor: pointer; transition: all 0.15s;
    }
    .filter-pill:hover { background: #eff6ff; border-color: #bfdbfe; color: #0050e5; }
    .filter-pill.active { background: #0050e5; border-color: #0050e5; color: #fff; }

    /* Card & Table */
    .cms-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; }
    .card-header-bar {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px solid #f1f5f9;
    }
    .card-header-bar h3 { font-size: 17px; font-weight: 800; color: #0f172a; margin: 0 0 2px; }
    .card-sub { font-size: 13px; color: #64748b; margin: 0; }

    .cms-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .cms-table th {
      text-align: left; padding: 12px; background: #f8fafc; color: #64748b;
      font-weight: 700; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-transform: uppercase;
    }
    .cms-table td { padding: 14px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }

    /* File Name Cell */
    .file-name-cell { display: flex; align-items: center; gap: 12px; min-width: 200px; }
    .file-thumb {
      width: 40px; height: 40px; border-radius: 8px; overflow: hidden;
      border: 1px solid #e2e8f0; background: #f8fafc; flex-shrink: 0;
    }
    .file-thumb img { width: 100%; height: 100%; object-fit: cover; }
    .file-icon-box {
      width: 40px; height: 40px; border-radius: 8px; display: flex;
      align-items: center; justify-content: center; flex-shrink: 0;
    }
    .file-name-meta { display: flex; flex-direction: column; min-width: 0; }
    .file-name-meta strong {
      font-size: 13.5px; color: #0f172a; white-space: nowrap;
      overflow: hidden; text-overflow: ellipsis; max-width: 240px;
    }
    .file-size-label { font-size: 11px; color: #64748b; font-weight: 500; }

    /* URL Copy Cell */
    .url-copy-cell { display: flex; align-items: center; gap: 8px; max-width: 340px; }
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
    .type-doc { background: #ecfdf5; color: #059669; }
    .type-media { background: #f3e8ff; color: #7c3aed; }
    .type-other { background: #f1f5f9; color: #475569; }

    /* Actions */
    .action-buttons { display: flex; gap: 6px; align-items: center; }
    .btn-action {
      display: inline-flex; align-items: center; gap: 4px; padding: 6px 10px;
      border-radius: 6px; font-size: 12px; font-weight: 600; text-decoration: none; cursor: pointer; border: none;
      transition: all 0.15s ease; white-space: nowrap;
    }
    .btn-copy { background: #f1f5f9; color: #334155; }
    .btn-copy:hover { background: #e2e8f0; color: #0f172a; }
    .btn-open { background: #eff6ff; color: #0050e5; }
    .btn-open:hover { background: #0050e5; color: #fff; }
    .btn-delete { background: #fee2e2; color: #dc2626; padding: 6px 8px; }
    .btn-delete:hover { background: #dc2626; color: #fff; }

    .loading-box { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 50px; color: #64748b; }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { 100% { transform: rotate(360deg); } }

    .empty-cell { text-align: center; padding: 40px !important; }
    .empty-state { display: flex; flex-direction: column; align-items: center; gap: 8px; color: #64748b; }
    .empty-state .material-symbols-outlined { font-size: 38px; color: #94a3b8; }
    .empty-state p { margin: 0; font-size: 13.5px; }
  `]
})
export class FileManagerComponent implements OnInit {
  files: any[] = [];
  filteredFiles: any[] = [];
  loading = false;
  uploading = false;
  uploadProgressText = '';
  isDragging = false;
  searchTerm = '';
  selectedCategory: 'all' | 'image' | 'document' | 'media' | 'other' = 'all';
  copiedFileId: string | null = null;

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
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.loadFiles();
  }

  loadFiles(): void {
    this.loading = true;
    this.api.get<any>('ContentApi/files').subscribe({
      next: (res) => {
        this.loading = false;
        this.files = res?.data || [];
        this.applyFilters();
      },
      error: (err) => {
        this.loading = false;
        this.toast.error(err?.error?.message || 'Failed to load uploaded files.');
      }
    });
  }

  setCategory(cat: 'all' | 'image' | 'document' | 'media' | 'other'): void {
    this.selectedCategory = cat;
    this.applyFilters();
  }

  applyFilters(): void {
    const term = (this.searchTerm || '').trim().toLowerCase();
    this.filteredFiles = (this.files || []).filter(f => {
      const matchesSearch = !term ||
        (f.fileName || '').toLowerCase().includes(term) ||
        (f.fileUrl || '').toLowerCase().includes(term) ||
        (f.fileType || '').toLowerCase().includes(term);

      if (!matchesSearch) return false;

      if (this.selectedCategory === 'all') return true;
      if (this.selectedCategory === 'image') return this.isImageFile(f);
      if (this.selectedCategory === 'document') return this.isDocumentFile(f);
      if (this.selectedCategory === 'media') return this.isMediaFile(f);
      return !this.isImageFile(f) && !this.isDocumentFile(f) && !this.isMediaFile(f);
    });
  }

  // ==========================================
  // UPLOAD HANDLERS (SINGLE / MULTI / DRAG-DROP)
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
    this.uploading = true;
    let successCount = 0;

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      this.uploadProgressText = `${i + 1} of ${fileList.length} (${file.name})`;

      const formData = new FormData();
      formData.append('file', file);

      try {
        const res: any = await this.api.post<any>('ContentApi/files/upload', formData).toPromise();
        if (res?.data) {
          this.files.unshift(res.data);
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
  // COPY URL & DELETE
  // ==========================================

  async copyUrl(file: any): Promise<void> {
    if (!file?.fileUrl) return;
    try {
      await navigator.clipboard.writeText(file.fileUrl);
      this.copiedFileId = file.id;
      this.toast.success(`URL copied to clipboard!`);
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
        this.files = this.files.filter(f => f.id !== file.id);
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

  isDocumentFile(file: any): boolean {
    const type = (file?.fileType || '').toUpperCase();
    return ['PDF', 'DOC', 'DOCX', 'XLS', 'XLSX', 'PPT', 'PPTX', 'TXT', 'CSV', 'RTF'].includes(type);
  }

  isMediaFile(file: any): boolean {
    const type = (file?.fileType || '').toUpperCase();
    const ct = (file?.contentType || '').toLowerCase();
    return ct.startsWith('video/') || ct.startsWith('audio/') || ['MP4', 'WEBM', 'MOV', 'AVI', 'MP3', 'WAV', 'OGG'].includes(type);
  }

  getFileIcon(file: any): string {
    const type = (file?.fileType || '').toUpperCase();
    if (type === 'PDF') return 'picture_as_pdf';
    if (this.isImageFile(file)) return 'image';
    if (this.isMediaFile(file)) return 'movie';
    if (['DOC', 'DOCX', 'TXT', 'RTF'].includes(type)) return 'description';
    if (['XLS', 'XLSX', 'CSV'].includes(type)) return 'table_chart';
    if (['ZIP', 'RAR', '7Z', 'TAR', 'GZ'].includes(type)) return 'folder_zip';
    if (['CSS', 'JS', 'JSON', 'HTML', 'XML'].includes(type)) return 'code';
    return 'insert_drive_file';
  }

  getFileIconColorClass(file: any): string {
    const type = (file?.fileType || '').toUpperCase();
    if (type === 'PDF') return 'type-pdf';
    if (this.isImageFile(file)) return 'type-image';
    if (this.isDocumentFile(file)) return 'type-doc';
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

