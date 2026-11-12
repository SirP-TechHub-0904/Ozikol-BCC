import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent, PageHeaderButton } from '../../../shared/components/page-header/page-header.component';
import {
  CmsOrderCellComponent,
  CmsDragDropReorderHelper,
  reorderListToTop,
  reorderListStep,
  reorderListByMove,
  assignStepOrders
} from './cms-order-cell.component';

@Component({
  selector: 'app-page-section-details',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, PageHeaderComponent, CmsOrderCellComponent],
  template: `
    <div class="cms-page-container">
      <!-- Standardized Reusable Page Header -->
      <app-page-header
        [eyebrow]="headerEyebrow"
        icon="view_list"
        [title]="section?.title || 'Section Details'"
        [subtitle]="headerSubtitle"
        [buttons]="headerButtons"
        [loading]="loading"
      ></app-page-header>

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
          <a [routerLink]="['/content/console/sections/lists/create']" [queryParams]="{ pageSectionId: sectionId }" class="btn btn-primary btn-sm">
            <span class="material-symbols-outlined">add_circle</span>
            <span>Add Sub-Item</span>
          </a>
        </div>

        <div class="table-responsive">
          <table class="cms-table">
            <thead>
              <tr>
                <th>ORDER</th>
                <th>ITEM TITLE</th>
                <th>MINI TITLE / ICON</th>
                <th>DESCRIPTION</th>
                <th>BUTTONS</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              <tr
                *ngFor="let item of section.pageSectionLists; let i = index"
                draggable="true"
                (dragstart)="subItemReorder.onDragStart($event, i)"
                (dragover)="subItemReorder.onDragOver($event, i)"
                (dragleave)="subItemReorder.onDragLeave(i)"
                (drop)="onSubItemDrop($event, i)"
                (dragend)="subItemReorder.reset()"
                [class.row-dragged]="subItemReorder.draggedIndex === i"
                [class.row-drag-over]="subItemReorder.dragOverIndex === i"
              >
                <td>
                  <app-cms-order-cell
                    [order]="item.sortOrder || 0"
                    [isFirst]="i === 0"
                    [isLast]="i === section.pageSectionLists.length - 1"
                    [disabled]="savingOrder"
                    entityLabel="sub-item"
                    (moveToTop)="moveSubItemToTop(i)"
                    (moveUp)="moveSubItemUp(i)"
                    (moveDown)="moveSubItemDown(i)"
                    (orderCommit)="commitSubItemOrder(item, $event)"
                  ></app-cms-order-cell>
                </td>
                <td><strong>{{ item.title || '(Untitled Sub-Item)' }}</strong></td>
                <td>
                  <span class="icon-chip" *ngIf="item.iconText"><i [class]="item.iconText"></i> {{ item.iconText }}</span>
                  <span class="mini-pill" *ngIf="item.miniTitle">{{ item.miniTitle }}</span>
                </td>
                <td><span class="desc-preview">{{ item.description | slice:0:60 }}...</span></td>
                <td>
                  <div class="btn-preview-stack" *ngIf="item.buttonText || item.secondButtonText">
                    <span class="btn-preview-tag" *ngIf="item.buttonText">{{ item.buttonText }}</span>
                    <span class="btn-preview-tag secondary" *ngIf="item.secondButtonText">{{ item.secondButtonText }}</span>
                  </div>
                  <span class="badge-none" *ngIf="!item.buttonText && !item.secondButtonText">-</span>
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
                      <span>Edit</span>
                    </a>
                    <a [routerLink]="['/content/console/sections/lists/delete', item.id]" [queryParams]="{ returnUrl: '/content/console/sections/details/' + sectionId }" class="btn-action btn-delete" title="Delete Item">
                      <span class="material-symbols-outlined">delete</span>
                    </a>
                  </div>
                </td>
              </tr>
              <tr *ngIf="!section.pageSectionLists || section.pageSectionLists.length === 0">
                <td colspan="7" class="empty-cell">
                  <div class="empty-state">
                    <span class="material-symbols-outlined">list</span>
                    <p>No repeating sub-items added yet.</p>
                    <a [routerLink]="['/content/console/sections/lists/create']" [queryParams]="{ pageSectionId: sectionId }" class="btn btn-outline btn-sm" style="margin-top: 10px;">
                      <span class="material-symbols-outlined">add_circle</span>
                      <span>Add First Sub-Item</span>
                    </a>
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
    .cms-page-container { display: flex; flex-direction: column; gap: 24px; }

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
    tr.row-dragged { opacity: 0.45; background: #f1f5f9 !important; }
    tr.row-drag-over { border-top: 2.5px solid #0050e5 !important; background: #eff6ff !important; }

    .order-badge { background: #f1f5f9; padding: 4px 8px; border-radius: 6px; font-weight: 700; font-size: 12px; color: #0f172a; }
    .mini-pill { font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; margin-left: 6px; }
    .icon-chip { font-size: 12px; background: #f1f5f9; padding: 4px 8px; border-radius: 6px; }
    .desc-preview { color: #475569; font-size: 12px; }
    .btn-preview-stack { display: flex; flex-wrap: wrap; gap: 4px; }
    .btn-preview-tag { background: #eff6ff; color: #0050e5; padding: 3px 8px; border-radius: 6px; font-weight: 600; font-size: 11px; }
    .btn-preview-tag.secondary { background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; }
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
  savingOrder = false;
  webPageIdParam: string | null = null;
  subItemReorder = new CmsDragDropReorderHelper();

  get targetWebPageId(): string | null {
    return this.section?.webPageId || this.webPageIdParam || null;
  }

  get headerEyebrow(): string {
    if (this.section?.webPage?.title) {
      return `CMS Studio / Page Sections / ${this.section.webPage.title}`;
    }
    return this.section?.webPageId
      ? 'CMS Studio / Page Sections / Web Page'
      : 'CMS Studio / Page Sections';
  }

  get headerSubtitle(): string {
    return this.section
      ? `Template: ${this.section.templateKey || 'Standard'} • ${this.section.pageSectionLists?.length || 0} Repeating Sub-Items`
      : 'Layout section details and repeating sub-items.';
  }

  get headerButtons(): PageHeaderButton[] {
    const btns: PageHeaderButton[] = [
      {
        text: 'Back to Pages',
        icon: 'auto_stories',
        routerLink: '/content/console/pages'
      },
      {
        text: this.section?.webPage?.title ? `Page: ${this.section.webPage.title}` : 'Page Sections',
        icon: 'layers',
        routerLink: this.targetWebPageId
          ? `/content/console/pages/details/${this.targetWebPageId}`
          : '/content/console/pages'
      },
      {
        text: 'All Sections',
        icon: 'view_list',
        routerLink: '/content/console/sections'
      },
      {
        text: 'Edit Section',
        icon: 'edit',
        isPrimary: true,
        routerLink: `/content/console/sections/edit/${this.sectionId}`
      }
    ];
    return btns;
  }

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      this.webPageIdParam = params.get('webPageId');
    });
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.sectionId = id;
        this.loadSection();
      }
    });
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

  async deleteSubItem(item: any): Promise<void> {
    const label = item.title || '(Untitled Sub-Item)';
    const confirmed = await this.toast.confirm('Delete Item', `Are you sure you want to delete "${label}"?`, 'Delete', 'Cancel', 'danger');
    if (!confirmed) return;

    this.api.delete<any>(`ContentApi/section-lists/${item.id}`).subscribe({
      next: () => {
        this.toast.success(`Item "${label}" deleted.`);
        this.loadSection();
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'Failed to delete sub-item.');
      }
    });
  }

  // ==========================================
  // DRAG-AND-DROP & ARROW REORDERING
  // ==========================================

  /** Moves a sub-item directly to the top of this section. */
  moveSubItemToTop(index: number): void {
    const next = reorderListToTop(this.section?.pageSectionLists || [], index);
    if (next) this.applyAndSaveSubItemReorder(next);
  }

  /** Moves a sub-item one position up within this section. */
  moveSubItemUp(index: number): void {
    const next = reorderListStep(this.section?.pageSectionLists || [], index, -1);
    if (next) this.applyAndSaveSubItemReorder(next);
  }

  /** Moves a sub-item one position down within this section. */
  moveSubItemDown(index: number): void {
    const next = reorderListStep(this.section?.pageSectionLists || [], index, 1);
    if (next) this.applyAndSaveSubItemReorder(next);
  }

  /** Drops a dragged sub-item onto the target index and persists the new sort order. */
  onSubItemDrop(event: DragEvent, targetIndex: number): void {
    const move = this.subItemReorder.consumeDrop(event, targetIndex);
    if (!move) return;
    const next = reorderListByMove(this.section?.pageSectionLists || [], move.fromIndex, move.toIndex);
    if (next) this.applyAndSaveSubItemReorder(next);
  }

  /** Updates an individual sub-item's inline SortOrder and persists immediately. */
  commitSubItemOrder(item: any, newOrder: number): void {
    item.sortOrder = newOrder;
    const items = [...(this.section?.pageSectionLists || [])].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    this.section.pageSectionLists = items;
    const payload = items.map((l: any) => ({ id: l.id, sortOrder: l.sortOrder || 0 }));
    this.persistSubItemReorder(payload, `Order for "${item.title || 'Item'}" updated to #${newOrder}.`);
  }

  private applyAndSaveSubItemReorder(orderedList: any[]): void {
    const payload = assignStepOrders(orderedList, 'sortOrder', 10);
    this.section.pageSectionLists = orderedList;
    this.persistSubItemReorder(payload);
  }

  private persistSubItemReorder(payload: Array<{ id: string; sortOrder: number }>, successMsg?: string): void {
    this.savingOrder = true;
    this.api.put<any>('ContentApi/section-lists/reorder', payload).subscribe({
      next: () => {
        this.savingOrder = false;
        if (successMsg) this.toast.success(successMsg);
      },
      error: (err) => {
        this.savingOrder = false;
        this.toast.error(err?.error?.message || 'Failed to save sub-item order.');
        this.loadSection();
      }
    });
  }
}
