import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-page-section-details',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="cms-page-container">
      <!-- Header -->
      <div class="page-header">
        <div class="header-titles">
          <div class="breadcrumb">
            <a routerLink="/content/console">CMS Studio</a>
            <span class="sep">/</span>
            <a routerLink="/content/console/sections">Page Sections</a>
            <span class="sep">/</span>
            <span class="current">{{ section?.title || 'Section Details' }}</span>
          </div>
          <h1>{{ section?.title }}</h1>
          <p class="subtitle">Template Key: <code>{{ section?.templateKey }}</code> &bull; {{ section?.pageSectionLists?.length || 0 }} Repeating Sub-Items</p>
        </div>
        <div class="header-actions">
          <a [routerLink]="['/content/console/sections/edit', sectionId]" class="btn btn-primary">
            <span class="material-symbols-outlined">edit</span>
            <span>Edit Section Block</span>
          </a>
          <a routerLink="/content/console/sections" class="btn btn-outline">
            <span class="material-symbols-outlined">arrow_back</span>
            <span>Back to Sections</span>
          </a>
        </div>
      </div>

      <!-- Loading State -->
      <div class="loading-box" *ngIf="loading">
        <span class="material-symbols-outlined spin">progress_activity</span>
        <p>Loading section details...</p>
      </div>

      <!-- Sub-Items List Manager -->
      <div class="cms-card" *ngIf="!loading && section">
        <div class="card-header-bar">
          <div>
            <h3>Repeating Sub-Items & Feature Cards</h3>
            <p class="card-sub">Items rendered inside this layout block (e.g., service cards, core pillars, team members).</p>
          </div>
          <button type="button" class="btn btn-primary btn-sm" (click)="openAddSubItemModal()">
            <span class="material-symbols-outlined">add_circle</span>
            <span>Add Sub-Item</span>
          </button>
        </div>

        <div class="table-responsive">
          <table class="cms-table">
            <thead>
              <tr>
                <th>ORDER</th>
                <th>ITEM TITLE</th>
                <th>MINI TITLE / ICON</th>
                <th>DESCRIPTION</th>
                <th>BUTTON</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of section.pageSectionLists">
                <td><span class="order-badge">#{{ item.sortOrder }}</span></td>
                <td><strong>{{ item.title }}</strong></td>
                <td>
                  <span class="icon-chip" *ngIf="item.iconText"><i [class]="item.iconText"></i> {{ item.iconText }}</span>
                  <span class="mini-pill" *ngIf="item.miniTitle">{{ item.miniTitle }}</span>
                </td>
                <td><span class="desc-preview">{{ item.description | slice:0:60 }}...</span></td>
                <td>
                  <span class="btn-preview-tag" *ngIf="item.buttonText">{{ item.buttonText }}</span>
                  <span class="badge-none" *ngIf="!item.buttonText">-</span>
                </td>
                <td>
                  <span class="status-pill" [class.published]="!item.disable" [class.draft]="item.disable">
                    {{ !item.disable ? 'Active' : 'Disabled' }}
                  </span>
                </td>
                <td>
                  <div class="action-buttons">
                    <a [routerLink]="['/content/console/sections/lists/edit', item.id]" class="btn-action btn-edit" title="Edit sub-item">
                      <span class="material-symbols-outlined">edit</span>
                      <span>Edit Page</span>
                    </a>
                    <a [routerLink]="['/content/console/sections/lists/delete', item.id]" class="btn-action btn-delete" title="Delete Item">
                      <span class="material-symbols-outlined">delete</span>
                    </a>
                  </div>
                </td>
              </tr>
              <tr *ngIf="!section.pageSectionLists || section.pageSectionLists.length === 0">
                <td colspan="7" class="empty-cell">
                  <div class="empty-state">
                    <span class="material-symbols-outlined">list</span>
                    <p>No repeating sub-items added yet. Click "Add Sub-Item" to populate this section block!</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Add Sub-Item Modal (Protected Backdrop) -->
      <div class="modal-backdrop" *ngIf="showAddModal">
        <div class="modal-card modal-lg">
          <div class="modal-header">
            <div class="modal-title-group">
              <span class="material-symbols-outlined text-blue">add_circle</span>
              <h3>Add Sub-Item to {{ section.title }}</h3>
            </div>
            <button type="button" class="btn-close" (click)="closeAddModal()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>ITEM TITLE *</label>
              <input type="text" [(ngModel)]="newItem.title" class="form-control" placeholder="e.g. Youth Mentorship, Health Care Outreach">
            </div>

            <div class="form-row">
              <div class="form-group flex-1">
                <label>MINI TITLE (SUB-TAG)</label>
                <input type="text" [(ngModel)]="newItem.miniTitle" class="form-control" placeholder="PILLAR 01">
              </div>
              <div class="form-group flex-1">
                <label>ICON CLASS (FONTAWESOME / BOOTSTRAP)</label>
                <input type="text" [(ngModel)]="newItem.iconText" class="form-control" placeholder="fa-solid fa-heart">
              </div>
            </div>

            <div class="form-group">
              <label>DESCRIPTION</label>
              <textarea rows="3" [(ngModel)]="newItem.description" class="form-control" placeholder="Short description of this sub-item..."></textarea>
            </div>

            <div class="form-row">
              <div class="form-group flex-1">
                <label>BUTTON TEXT</label>
                <input type="text" [(ngModel)]="newItem.buttonText" class="form-control" placeholder="Learn More">
              </div>
              <div class="form-group flex-1">
                <label>BUTTON LINK</label>
                <input type="text" [(ngModel)]="newItem.buttonLink" class="form-control" placeholder="/programs/youth">
              </div>
              <div class="form-group flex-1">
                <label>SORT ORDER</label>
                <input type="number" [(ngModel)]="newItem.sortOrder" class="form-control">
              </div>
            </div>

            <div class="error-box" *ngIf="modalError">{{ modalError }}</div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" (click)="closeAddModal()">Cancel</button>
            <button type="button" class="btn btn-primary" (click)="saveNewSubItem()" [disabled]="savingItem">
              <span *ngIf="!savingItem">Save & Add Sub-Item</span>
              <span *ngIf="savingItem">Saving...</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .cms-page-container { display: flex; flex-direction: column; gap: 24px; }
    .page-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      background: #fff; padding: 24px 28px; border-radius: 16px; border: 1px solid #e2e8f0;
    }
    .breadcrumb { font-size: 13px; color: #64748b; margin-bottom: 6px; }
    .breadcrumb a { color: #0050e5; text-decoration: none; font-weight: 600; }
    .page-header h1 { font-size: 24px; font-weight: 800; color: #0f172a; margin: 0 0 4px; }
    .subtitle { color: #64748b; font-size: 14px; margin: 0; }
    .header-actions { display: flex; gap: 10px; }

    .btn {
      display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px;
      border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; text-decoration: none;
    }
    .btn-primary { background: #0050e5; color: #fff; border: none; }
    .btn-outline { background: transparent; border: 1px solid #cbd5e1; color: #334155; }
    .btn-sm { padding: 8px 14px; font-size: 12px; }

    .cms-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; }
    .card-header-bar {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 20px; padding-bottom: 14px; border-bottom: 1px solid #f1f5f9;
    }
    .card-header-bar h3 { font-size: 17px; font-weight: 800; color: #0f172a; margin: 0 0 2px; }
    .card-sub { font-size: 13px; color: #64748b; margin: 0; }

    .cms-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .cms-table th {
      text-align: left; padding: 12px; background: #f8fafc; color: #64748b;
      font-weight: 700; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-transform: uppercase;
    }
    .cms-table td { padding: 14px 12px; border-bottom: 1px solid #f1f5f9; }

    .order-badge { background: #f1f5f9; padding: 4px 8px; border-radius: 6px; font-weight: 700; font-size: 12px; color: #0f172a; }
    .mini-pill { font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; margin-left: 6px; }
    .icon-chip { font-size: 12px; background: #f1f5f9; padding: 4px 8px; border-radius: 6px; }
    .desc-preview { color: #475569; font-size: 12px; }
    .btn-preview-tag { background: #eff6ff; color: #0050e5; padding: 3px 8px; border-radius: 6px; font-weight: 600; font-size: 11px; }
    .badge-none { color: #94a3b8; font-size: 11px; }
    .status-pill { padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; }
    .status-pill.published { background: #dcfce7; color: #15803d; }
    .status-pill.draft { background: #fee2e2; color: #dc2626; }

    .action-buttons { display: flex; gap: 6px; align-items: center; }
    .btn-action {
      display: inline-flex; align-items: center; gap: 4px; padding: 6px 10px;
      border-radius: 6px; font-size: 12px; font-weight: 600; text-decoration: none; cursor: pointer; border: none;
    }
    .btn-edit { background: #eff6ff; color: #0050e5; }
    .btn-edit:hover { background: #0050e5; color: #fff; }
    .btn-delete { background: #fee2e2; color: #dc2626; }
    .btn-delete:hover { background: #dc2626; color: #fff; }

    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center; z-index: 2000;
    }
    .modal-card {
      background: #fff; border-radius: 16px; width: 100%; max-width: 580px;
      box-shadow: 0 25px 60px rgba(0,0,0,0.3); overflow: hidden;
    }
    .modal-lg { max-width: 640px; }
    .modal-header {
      padding: 18px 24px; display: flex; justify-content: space-between; align-items: center;
      border-bottom: 1px solid #e2e8f0;
    }
    .modal-title-group { display: flex; align-items: center; gap: 10px; }
    .modal-title-group h3 { margin: 0; font-size: 18px; font-weight: 800; }
    .btn-close { background: none; border: none; font-size: 20px; cursor: pointer; color: #64748b; }
    .modal-body { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
    .modal-footer { padding: 16px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 10px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group label { font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; }
    .form-control { padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; }
    .form-row { display: flex; gap: 12px; }
    .error-box { background: #fee2e2; color: #991b1b; padding: 10px; border-radius: 8px; font-size: 12px; font-weight: 600; }

    .loading-box { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px; color: #64748b; }
    .spin { animation: spin 1s linear infinite; font-size: 32px; color: #0050e5; margin-bottom: 12px; }
    @keyframes spin { 100% { transform: rotate(360deg); } }
  `]
})
export class PageSectionDetailsComponent implements OnInit {
  sectionId = '';
  section: any = null;
  loading = false;

  showAddModal = false;
  savingItem = false;
  modalError = '';
  newItem: any = {};

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.sectionId = this.route.snapshot.paramMap.get('id') || '';
    if (this.sectionId) {
      this.loadSection();
    }
  }

  loadSection(): void {
    this.loading = true;
    this.api.get<any>(`ContentApi/sections/${this.sectionId}`).subscribe({
      next: (res) => {
        this.loading = false;
        this.section = res?.data;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  openAddSubItemModal(): void {
    this.newItem = {
      title: '',
      miniTitle: '',
      iconText: 'fa-solid fa-star',
      description: '',
      buttonText: '',
      buttonLink: '',
      sortOrder: (this.section?.pageSectionLists?.length || 0) + 1,
      pageSectionId: this.sectionId
    };
    this.modalError = '';
    this.showAddModal = true;
  }

  closeAddModal(): void {
    this.showAddModal = false;
  }

  saveNewSubItem(): void {
    if (!this.newItem.title?.trim()) {
      this.modalError = 'Item Title is required.';
      return;
    }

    this.savingItem = true;
    this.modalError = '';

    this.api.post<any>('ContentApi/section-lists', this.newItem).subscribe({
      next: () => {
        this.savingItem = false;
        this.showAddModal = false;
        this.loadSection();
      },
      error: (err) => {
        this.savingItem = false;
        this.modalError = err?.error?.message || 'Failed to add sub-item.';
      }
    });
  }

  async deleteSubItem(item: any): Promise<void> {
    const confirmed = await this.toast.confirm('Delete Item', `Are you sure you want to delete "${item.title}"?`, 'Delete', 'Cancel', 'danger');
    if (!confirmed) return;

    this.api.delete<any>(`ContentApi/section-lists/${item.id}`).subscribe({
      next: () => {
        this.toast.success(`Item "${item.title}" deleted.`);
        this.loadSection();
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'Failed to delete sub-item.');
      }
    });
  }
}
