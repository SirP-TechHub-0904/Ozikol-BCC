import { Component, EventEmitter, HostListener, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';

/**
 * Reusable modal popup allowing CMS administrators to browse, search,
 * filter, upload, and pick a file URL directly from the Website File Manager.
 */
@Component({
  selector: 'app-file-picker-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fp-backdrop" *ngIf="isOpen" (click)="close()">
      <div class="fp-modal" (click)="$event.stopPropagation()" role="dialog" aria-modal="true" [attr.aria-label]="title">
        <!-- Modal Header -->
        <div class="fp-header">
          <div class="fp-header-title">
            <span class="fp-header-icon">
              <span class="material-symbols-outlined">folder_open</span>
            </span>
            <div>
              <h3>{{ title }}</h3>
              <p>Click any file below to insert its URL into your link field.</p>
            </div>
          </div>
          <div class="fp-header-actions">
            <input
              #modalFileInput
              type="file"
              style="display: none"
              (change)="onUploadSelected($event)"
            />
            <button
              type="button"
              class="fp-btn fp-btn-outline"
              (click)="modalFileInput.click()"
              [disabled]="uploading"
              title="Upload a new file to File Manager"
            >
              <span class="material-symbols-outlined fs-6" [class.spin]="uploading">
                {{ uploading ? 'progress_activity' : 'upload_file' }}
              </span>
              <span>{{ uploading ? 'Uploading...' : 'Upload' }}</span>
            </button>
            <button
              type="button"
              class="fp-btn fp-btn-icon"
              (click)="loadFiles()"
              [disabled]="loading"
              title="Refresh file list"
            >
              <span class="material-symbols-outlined fs-6" [class.spin]="loading">refresh</span>
            </button>
            <button
              type="button"
              class="fp-btn fp-btn-icon"
              (click)="close()"
              title="Close popup"
            >
              <span class="material-symbols-outlined fs-6">close</span>
            </button>
          </div>
        </div>

        <!-- Search & Category Filter Bar -->
        <div class="fp-toolbar">
          <div class="fp-search">
            <span class="material-symbols-outlined">search</span>
            <input
              type="text"
              [(ngModel)]="searchTerm"
              (ngModelChange)="applyFilters()"
              placeholder="Search files by name or type..."
            />
            <button type="button" class="fp-clear" *ngIf="searchTerm" (click)="searchTerm = ''; applyFilters()">
              <span class="material-symbols-outlined fs-6">close</span>
            </button>
          </div>

          <div class="fp-pills">
            <button type="button" class="fp-pill" [class.active]="selectedCategory === 'all'" (click)="setCategory('all')">
              All ({{ files.length }})
            </button>
            <button type="button" class="fp-pill" [class.active]="selectedCategory === 'image'" (click)="setCategory('image')">
              Images
            </button>
            <button type="button" class="fp-pill" [class.active]="selectedCategory === 'document'" (click)="setCategory('document')">
              Documents & PDFs
            </button>
            <button type="button" class="fp-pill" [class.active]="selectedCategory === 'media'" (click)="setCategory('media')">
              Media
            </button>
          </div>
        </div>

        <!-- Scrollable File List Body -->
        <div class="fp-body">
          <div class="fp-loading" *ngIf="loading && files.length === 0">
            <span class="material-symbols-outlined spin">progress_activity</span>
            <p>Loading File Manager files...</p>
          </div>

          <div class="fp-empty" *ngIf="!loading && filteredFiles.length === 0">
            <span class="material-symbols-outlined">folder_off</span>
            <strong *ngIf="files.length === 0">No files uploaded yet</strong>
            <strong *ngIf="files.length > 0">No matching files found</strong>
            <p *ngIf="files.length === 0">Click <b>Upload</b> above to add your first PDF, image, or document.</p>
            <p *ngIf="files.length > 0">Try a different search keyword or switch category filter.</p>
          </div>

          <div class="fp-list" *ngIf="filteredFiles.length > 0">
            <div
              class="fp-row"
              *ngFor="let f of filteredFiles"
              (click)="selectFile(f)"
              title="Click to select this file"
            >
              <div class="fp-row-main">
                <img
                  *ngIf="isImageFile(f)"
                  [src]="f.fileUrl"
                  [alt]="f.fileName"
                  class="fp-thumb"
                />
                <div *ngIf="!isImageFile(f)" class="fp-file-icon" [ngClass]="getFileColorClass(f)">
                  <span class="material-symbols-outlined">{{ getFileIcon(f) }}</span>
                </div>

                <div class="fp-meta">
                  <strong class="fp-name" [title]="f.fileName">{{ f.fileName }}</strong>
                  <div class="fp-sub">
                    <span class="fp-type-badge" [ngClass]="getFileColorClass(f)">{{ f.fileType || 'FILE' }}</span>
                    <span>{{ formatFileSize(f.fileSizeBytes) }}</span>
                    <span>&bull;</span>
                    <span>{{ f.createdAtUtc | date:'mediumDate' }}</span>
                  </div>
                </div>
              </div>

              <div class="fp-row-actions">
                <a
                  [href]="f.fileUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="fp-btn fp-btn-ghost"
                  (click)="$event.stopPropagation()"
                  title="Preview file in new tab"
                >
                  <span class="material-symbols-outlined fs-6">open_in_new</span>
                </a>
                <button
                  type="button"
                  class="fp-btn fp-btn-primary"
                  (click)="$event.stopPropagation(); selectFile(f)"
                >
                  <span class="material-symbols-outlined fs-6">check</span>
                  <span>Select</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="fp-footer">
          <span class="fp-footer-note">
            Showing {{ filteredFiles.length }} of {{ files.length }} uploaded file(s)
          </span>
          <button type="button" class="fp-btn fp-btn-outline" (click)="close()">
            Cancel
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .fp-backdrop {
      position: fixed; inset: 0; z-index: 1050;
      background: rgba(15, 23, 42, 0.55); backdrop-filter: blur(2px);
      display: flex; align-items: center; justify-content: center; padding: 20px;
    }
    .fp-modal {
      width: 100%; max-width: 780px; max-height: 84vh;
      background: #fff; border-radius: 16px; border: 1px solid #e2e8f0;
      box-shadow: 0 24px 48px rgba(15, 23, 42, 0.22);
      display: flex; flex-direction: column; overflow: hidden;
    }

    .fp-header {
      display: flex; align-items: center; justify-content: space-between; gap: 14px;
      padding: 18px 22px; border-bottom: 1px solid #e2e8f0; background: #f8fafc;
    }
    .fp-header-title { display: flex; align-items: center; gap: 12px; min-width: 0; }
    .fp-header-icon {
      width: 40px; height: 40px; border-radius: 10px;
      background: #eff6ff; color: #0050e5; border: 1px solid #bfdbfe;
      display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .fp-header-title h3 { margin: 0; font-size: 16px; font-weight: 800; color: #0f172a; }
    .fp-header-title p { margin: 2px 0 0; font-size: 12.5px; color: #64748b; }
    .fp-header-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

    .fp-toolbar {
      display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;
      padding: 12px 22px; border-bottom: 1px solid #f1f5f9; background: #fff;
    }
    .fp-search {
      display: flex; align-items: center; gap: 8px; flex: 1 1 240px;
      background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 7px 12px;
      color: #64748b;
    }
    .fp-search input {
      border: none; background: transparent; outline: none; width: 100%;
      font-size: 13px; color: #0f172a;
    }
    .fp-clear {
      border: none; background: none; color: #64748b; cursor: pointer;
      display: inline-flex; padding: 2px;
    }
    .fp-pills { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .fp-pill {
      padding: 5px 11px; border-radius: 999px; font-size: 12px; font-weight: 600;
      border: 1px solid #e2e8f0; background: #f8fafc; color: #475569; cursor: pointer;
      transition: all 0.15s;
    }
    .fp-pill:hover { border-color: #bfdbfe; color: #0050e5; background: #eff6ff; }
    .fp-pill.active { background: #0050e5; border-color: #0050e5; color: #fff; }

    .fp-body {
      flex: 1; overflow-y: auto; padding: 14px 22px; min-height: 220px;
    }
    .fp-loading, .fp-empty {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      text-align: center; padding: 48px 20px; color: #64748b; gap: 6px;
    }
    .fp-loading .material-symbols-outlined, .fp-empty .material-symbols-outlined {
      font-size: 38px; color: #94a3b8;
    }
    .fp-empty strong { font-size: 14.5px; color: #0f172a; }
    .fp-empty p { margin: 0; font-size: 12.5px; }

    .fp-list { display: flex; flex-direction: column; gap: 8px; }
    .fp-row {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      padding: 10px 14px; border: 1px solid #e2e8f0; border-radius: 12px;
      cursor: pointer; transition: all 0.15s ease; background: #fff;
    }
    .fp-row:hover { border-color: #0050e5; background: #f8faff; }
    .fp-row-main { display: flex; align-items: center; gap: 12px; min-width: 0; flex: 1; }
    .fp-thumb {
      width: 42px; height: 42px; border-radius: 8px; object-fit: cover;
      border: 1px solid #e2e8f0; flex-shrink: 0;
    }
    .fp-file-icon {
      width: 42px; height: 42px; border-radius: 8px;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .fp-meta { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
    .fp-name {
      font-size: 13.5px; font-weight: 700; color: #0f172a;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .fp-sub {
      display: flex; align-items: center; gap: 7px; font-size: 11.5px; color: #64748b;
    }
    .fp-type-badge {
      padding: 1px 7px; border-radius: 6px; font-size: 10.5px; font-weight: 700; text-transform: uppercase;
    }
    .type-pdf { background: #fef2f2; color: #dc2626; }
    .type-image { background: #eff6ff; color: #0050e5; }
    .type-doc { background: #f0fdf4; color: #16a34a; }
    .type-media { background: #faf5ff; color: #7e22ce; }
    .type-other { background: #f1f5f9; color: #475569; }

    .fp-row-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }

    .fp-btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 5px;
      padding: 7px 12px; border-radius: 8px; font-size: 12.5px; font-weight: 600;
      cursor: pointer; border: 1px solid transparent; text-decoration: none;
      transition: all 0.15s ease;
    }
    .fp-btn-primary { background: #0050e5; color: #fff; }
    .fp-btn-primary:hover { background: #003ebd; }
    .fp-btn-outline { background: #fff; color: #334155; border-color: #cbd5e1; }
    .fp-btn-outline:hover:not([disabled]) { background: #f8fafc; border-color: #94a3b8; }
    .fp-btn-ghost { background: #f8fafc; color: #475569; border-color: #e2e8f0; padding: 7px 9px; }
    .fp-btn-ghost:hover { background: #eff6ff; color: #0050e5; border-color: #bfdbfe; }
    .fp-btn-icon { background: #fff; color: #475569; border-color: #e2e8f0; padding: 7px; }
    .fp-btn-icon:hover:not([disabled]) { background: #eff6ff; color: #0050e5; border-color: #bfdbfe; }

    .fp-footer {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 22px; border-top: 1px solid #e2e8f0; background: #f8fafc;
    }
    .fp-footer-note { font-size: 12px; color: #64748b; }

    .fs-6 { font-size: 16px; }
    .spin { animation: fpSpin 0.9s linear infinite; }
    @keyframes fpSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  `]
})
export class FilePickerModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() title = 'Choose File from File Manager';
  @Output() closed = new EventEmitter<void>();
  @Output() fileSelected = new EventEmitter<any>();

  files: any[] = [];
  filteredFiles: any[] = [];
  loading = false;
  uploading = false;
  searchTerm = '';
  selectedCategory: 'all' | 'image' | 'document' | 'media' = 'all';

  constructor(
    private api: ApiService,
    private toast: ToastService
  ) {}

  /**
   * Reloads the File Manager inventory whenever the modal transitions to open.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      this.searchTerm = '';
      this.selectedCategory = 'all';
      this.loadFiles();
    }
  }

  /**
   * Closes the modal when the Escape key is pressed.
   */
  @HostListener('document:keydown.escape')
  onEscapePressed(): void {
    if (this.isOpen) {
      this.close();
    }
  }

  /**
   * Fetches all uploaded files from the Website File Manager endpoint.
   */
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
        this.toast.error(err?.error?.message || 'Failed to load files from File Manager.');
      }
    });
  }

  /**
   * Uploads a file directly from the modal and auto-selects it if desired or adds it to the top.
   */
  onUploadSelected(event: any): void {
    const file: File | undefined = event?.target?.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    this.uploading = true;

    this.api.post<any>('ContentApi/files/upload', formData).subscribe({
      next: (res) => {
        this.uploading = false;
        event.target.value = '';
        if (res?.data) {
          this.files.unshift(res.data);
          this.applyFilters();
          this.toast.success(`"${res.data.fileName}" uploaded to File Manager.`);
        }
      },
      error: (err) => {
        this.uploading = false;
        event.target.value = '';
        this.toast.error(err?.error?.message || 'File upload failed.');
      }
    });
  }

  /**
   * Updates the active file type filter pill and refreshes the visible list.
   */
  setCategory(cat: 'all' | 'image' | 'document' | 'media'): void {
    this.selectedCategory = cat;
    this.applyFilters();
  }

  /**
   * Filters files by search keyword and selected category.
   */
  applyFilters(): void {
    const term = (this.searchTerm || '').trim().toLowerCase();
    this.filteredFiles = (this.files || []).filter(f => {
      const matchesSearch = !term ||
        (f.fileName || '').toLowerCase().includes(term) ||
        (f.fileType || '').toLowerCase().includes(term) ||
        (f.fileUrl || '').toLowerCase().includes(term);

      if (!matchesSearch) return false;
      if (this.selectedCategory === 'all') return true;
      if (this.selectedCategory === 'image') return this.isImageFile(f);
      if (this.selectedCategory === 'document') return this.isDocumentFile(f);
      return this.isMediaFile(f);
    });
  }

  /**
   * Emits the selected file record to the parent editor and closes the modal.
   */
  selectFile(file: any): void {
    if (!file) return;
    this.fileSelected.emit(file);
    this.close();
  }

  /**
   * Emits the close event to hide the modal.
   */
  close(): void {
    this.closed.emit();
  }

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

  getFileColorClass(file: any): string {
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

