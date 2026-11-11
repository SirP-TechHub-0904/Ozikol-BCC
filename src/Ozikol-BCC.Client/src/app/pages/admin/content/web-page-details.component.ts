import { Component, OnInit, HostListener } from '@angular/core';
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
  selector: 'app-web-page-details',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, PageHeaderComponent, CmsOrderCellComponent],
  template: `
    <div class="cms-page-container">
      <!-- Standardized Reusable Page Header -->
      <app-page-header
        eyebrow="CMS Studio / All Web Pages"
        icon="article"
        [title]="page?.title || 'Page Details'"
        [subtitle]="headerSubtitle"
        [buttons]="headerButtons"
        [loading]="loading"
      ></app-page-header>

      <!-- Loading State -->
      <div class="loading-box" *ngIf="loading">
        <span class="material-symbols-outlined spin">progress_activity</span>
        <p>Loading page details...</p>
      </div>

      <!-- Tab Switcher -->
      <div class="detail-tabs" *ngIf="!loading && page">
        <button type="button" class="tab-btn" [class.active]="activeTab === 'sections'" (click)="activeTab = 'sections'">
          <span class="material-symbols-outlined">layers</span>
          <span>Page Layout Sections ({{ page?.pageSections?.length || 0 }})</span>
        </button>
        <button type="button" class="tab-btn" [class.active]="activeTab === 'overview'" (click)="activeTab = 'overview'">
          <span class="material-symbols-outlined">info</span>
          <span>Page Overview & Metadata</span>
        </button>
      </div>

      <!-- BULK ACTION BAR (SECTIONS CHECKLIST) -->
      <div class="bulk-action-bar" *ngIf="!loading && page && activeTab === 'sections' && selectedSectionIds.size > 0">
        <div class="bulk-info">
          <span class="material-symbols-outlined text-primary">check_circle</span>
          <strong>{{ selectedSectionIds.size }} section(s) selected</strong>
        </div>
        <div class="bulk-buttons">
          <button type="button" class="btn btn-sm btn-primary" (click)="openBulkTransferModal('copy')" title="Duplicate selected sections to another page">
            <span class="material-symbols-outlined fs-6">content_copy</span>
            <span>Copy to Page...</span>
          </button>
          <button type="button" class="btn btn-sm btn-secondary" (click)="openBulkTransferModal('move')" title="Move selected sections to another page">
            <span class="material-symbols-outlined fs-6">drive_file_move</span>
            <span>Move to Page...</span>
          </button>
          <button type="button" class="btn btn-sm btn-info" (click)="openBulkTransferModal('link')" title="Share/link selected sections to another page without duplicating">
            <span class="material-symbols-outlined fs-6">link</span>
            <span>Link to Page...</span>
          </button>
          <button type="button" class="btn btn-sm btn-danger" (click)="openBulkDeleteModal()" title="Delete selected sections">
            <span class="material-symbols-outlined fs-6">delete_sweep</span>
            <span>Delete Selected ({{ selectedSectionIds.size }})</span>
          </button>
        </div>
      </div>

      <!-- TAB 1: SECTIONS MANAGER -->
      <div class="tab-content" *ngIf="!loading && page && activeTab === 'sections'">
        <div class="cms-card">
          <div class="card-header-bar">
            <div>
              <h3>Attached Layout Blocks</h3>
              <p class="card-sub">Sections render from top to bottom based on Page Sort Order.</p>
            </div>
            <div class="header-actions-group">
              <a [routerLink]="['/content/console/sections/create']" [queryParams]="{ webPageId: pageId }" class="btn btn-primary btn-sm">
                <span class="material-symbols-outlined">add_circle</span>
                <span>Add New Section</span>
              </a>
            </div>
          </div>

          <div class="table-responsive">
            <table class="cms-table">
              <thead>
                <tr>
                  <th style="width: 44px; text-align: center;">
                    <input
                      type="checkbox"
                      class="cms-checkbox"
                      [checked]="isAllSelected"
                      [indeterminate]="isIndeterminate"
                      (change)="toggleSelectAll($event)"
                      title="Select / Deselect all sections on this page"
                    >
                  </th>
                  <th>ORDER</th>
                  <th>SECTION TITLE</th>
                  <th>MINI TITLE</th>
                  <th>TEMPLATE KEY</th>
                  <th>SUB-ITEMS</th>
                  <th>PAGE VISIBILITY</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  *ngFor="let sec of page.pageSections; let i = index"
                  [class.selected-row]="isSelected(sec.id)"
                  draggable="true"
                  (dragstart)="sectionReorder.onDragStart($event, i)"
                  (dragover)="sectionReorder.onDragOver($event, i)"
                  (dragleave)="sectionReorder.onDragLeave(i)"
                  (drop)="onSectionDrop($event, i)"
                  (dragend)="sectionReorder.reset()"
                  [class.row-dragged]="sectionReorder.draggedIndex === i"
                  [class.row-drag-over]="sectionReorder.dragOverIndex === i"
                >
                  <td style="width: 44px; text-align: center;">
                    <input
                      type="checkbox"
                      class="cms-checkbox"
                      [checked]="isSelected(sec.id)"
                      (change)="toggleSelection(sec.id)"
                    >
                  </td>
                  <td>
                    <app-cms-order-cell
                      [order]="sec.pageSortOrder || 0"
                      [isFirst]="i === 0"
                      [isLast]="i === page.pageSections.length - 1"
                      [disabled]="savingOrder"
                      entityLabel="section"
                      (moveToTop)="moveSectionToTop(i)"
                      (moveUp)="moveSectionUp(i)"
                      (moveDown)="moveSectionDown(i)"
                      (orderCommit)="commitSectionOrder(sec, $event)"
                    ></app-cms-order-cell>
                  </td>
                  <td>
                    <div class="title-with-badges">
                      <strong>{{ sec.title || '(Untitled Section)' }}</strong>
                      <span class="badge-linked" *ngIf="sec.isLinkedSection" title="Shared / Linked from another primary page">
                        <span class="material-symbols-outlined fs-6">link</span>
                        Linked from: {{ sec.webPage?.title || 'Global / Other' }}
                      </span>
                      <span
                        class="badge-link-count"
                        *ngIf="!sec.isLinkedSection && sec.linkedPageCount > 0"
                        (click)="openMultiPageModal(sec)"
                        title="Placed on multiple pages. Click to inspect placements">
                        <span class="material-symbols-outlined fs-6">share_location</span>
                        Placed on {{ sec.linkedPageCount }} other page{{ sec.linkedPageCount > 1 ? 's' : '' }}
                      </span>
                    </div>
                    <div class="sub-text" *ngIf="sec.description">{{ sec.description | slice:0:50 }}...</div>
                  </td>
                  <td><span class="mini-pill">{{ sec.miniTitle || '-' }}</span></td>
                  <td><code>{{ sec.templateKey || 'default-block' }}</code></td>
                  <td>
                    <span class="subitems-badge">
                      {{ sec.pageSectionLists?.length || 0 }} Items
                    </span>
                  </td>
                  <td>
                    <span class="status-pill" [class.published]="!sec.disable" [class.draft]="sec.disable">
                      {{ !sec.disable ? 'Visible' : 'Hidden' }}
                    </span>
                  </td>
                  <td>
                    <div class="action-dropdown-wrapper">
                      <!-- Sub-Items Button -->
                      <a [routerLink]="['/content/console/sections/details', sec.id]" class="btn-action btn-details" title="Manage sub-items">
                        <span class="material-symbols-outlined">list</span>
                        <span>Items</span>
                      </a>

                      <!-- Edit Button -->
                      <a [routerLink]="['/content/console/sections/edit', sec.id]" class="btn-action btn-edit" title="Edit section">
                        <span class="material-symbols-outlined">edit</span>
                        <span>Edit</span>
                      </a>

                      <!-- Quick Link to Many Pages Button -->
                      <button
                        type="button"
                        class="btn-action btn-link-action"
                        (click)="openMultiPageModal(sec)"
                        title="Link section to multiple web pages with independent sort orders">
                        <span class="material-symbols-outlined">share_location</span>
                        <span>Link</span>
                      </button>

                      <!-- More Actions Dropdown Toggle -->
                      <div class="dropdown-container" [class.open]="openActionDropdownId === sec.id">
                        <button
                          type="button"
                          class="btn-action btn-dropdown-toggle"
                          (click)="toggleActionDropdown(sec.id, $event)"
                          title="More actions">
                          <span class="material-symbols-outlined">more_vert</span>
                        </button>

                        <div class="dropdown-menu-card" *ngIf="openActionDropdownId === sec.id" (click)="$event.stopPropagation()">
                          <!-- Multi-Page Placements -->
                          <button type="button" class="dropdown-item" (click)="openMultiPageModal(sec); closeActionDropdown()">
                            <span class="material-symbols-outlined fs-6 text-info">share_location</span>
                            <span>Link to Many Pages...</span>
                          </button>

                          <!-- Copy Section -->
                          <button type="button" class="dropdown-item" (click)="openSingleSectionTransfer(sec, 'copy')">
                            <span class="material-symbols-outlined fs-6 text-primary">content_copy</span>
                            <span>Copy to Another Page...</span>
                          </button>

                          <!-- Move Section (only if primary) -->
                          <button type="button" class="dropdown-item" *ngIf="!sec.isLinkedSection" (click)="openSingleSectionTransfer(sec, 'move')">
                            <span class="material-symbols-outlined fs-6 text-secondary">drive_file_move</span>
                            <span>Move to Another Page...</span>
                          </button>

                          <div class="dropdown-divider"></div>

                          <!-- Unlink if secondary linked section -->
                          <button
                            type="button"
                            class="dropdown-item text-danger"
                            *ngIf="sec.isLinkedSection"
                            (click)="unlinkSection(sec); closeActionDropdown()">
                            <span class="material-symbols-outlined fs-6">link_off</span>
                            <span>Unlink from this Page</span>
                          </button>

                          <!-- Delete if primary section -->
                          <button
                            type="button"
                            class="dropdown-item text-danger"
                            *ngIf="!sec.isLinkedSection"
                            (click)="deleteSection(sec); closeActionDropdown()">
                            <span class="material-symbols-outlined fs-6">delete</span>
                            <span>Delete Section</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
                <tr *ngIf="!page.pageSections || page.pageSections.length === 0">
                  <td colspan="8" class="empty-cell">
                    <div class="empty-state">
                      <span class="material-symbols-outlined">view_quilt</span>
                      <p>No layout sections added yet.</p>
                      <a [routerLink]="['/content/console/sections/create']" [queryParams]="{ webPageId: pageId }" class="btn btn-outline btn-sm" style="margin-top: 10px;">
                        <span class="material-symbols-outlined">add_circle</span>
                        <span>Add First Section</span>
                      </a>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- TAB 2: OVERVIEW & SEO -->
      <div class="tab-content" *ngIf="!loading && page && activeTab === 'overview'">
        <div class="overview-grid">
          <div class="cms-card">
            <div class="card-header-bar">
              <h3>General Configuration</h3>
            </div>
            <div class="info-list">
              <div class="info-row">
                <span>Page Title:</span>
                <strong>{{ page.title }}</strong>
              </div>
              <div class="info-row">
                <span>Direct Route:</span>
                <code>{{ displayDirectRoute }}</code>
              </div>
              <div class="info-row">
                <span>Menu Category:</span>
                <span>{{ page.pageCategory?.title || 'Standalone' }}</span>
              </div>
              <div class="info-row">
                <span>Publication Status:</span>
                <span class="status-pill" [class.published]="page.publish" [class.draft]="!page.publish">
                  {{ page.publish ? 'Published' : 'Draft' }}
                </span>
              </div>
              <div class="info-row">
                <span>Protected (Auth Required):</span>
                <span>{{ page.securityPage ? 'Yes (Requires Login)' : 'No (Public)' }}</span>
              </div>
            </div>
          </div>

          <div class="cms-card">
            <div class="card-header-bar">
              <h3>SEO & Analytics Summary</h3>
            </div>
            <div class="info-list">
              <div class="info-row">
                <span>Meta Title:</span>
                <span>{{ page.metaTitle || '(Not set)' }}</span>
              </div>
              <div class="info-row">
                <span>Meta Description:</span>
                <small>{{ page.metaDescription || '(Not set)' }}</small>
              </div>
              <div class="info-row">
                <span>Meta Keywords:</span>
                <span>{{ page.metaKeywords || '(Not set)' }}</span>
              </div>
              <div class="info-row">
                <span>Cumulative Visits:</span>
                <strong>{{ page.viewCount || 0 }} views</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- MODAL 1: BULK TRANSFER (COPY / MOVE / LINK) -->
      <div class="modal-backdrop" *ngIf="showBulkTransferModal">
        <div class="modal-card">
          <div class="modal-header">
            <div class="modal-title-group">
              <span class="material-symbols-outlined" [class.text-primary]="transferMode === 'copy'" [class.text-secondary]="transferMode === 'move'" [class.text-info]="transferMode === 'link'">
                {{ transferMode === 'copy' ? 'content_copy' : (transferMode === 'move' ? 'drive_file_move' : 'link') }}
              </span>
              <h3>
                {{ transferMode === 'copy' ? 'Copy' : (transferMode === 'move' ? 'Move' : 'Link') }}
                {{ selectedSectionIds.size }} Layout Section{{ selectedSectionIds.size > 1 ? 's' : '' }}
              </h3>
            </div>
            <button type="button" class="btn-close" (click)="closeBulkTransferModal()">&times;</button>
          </div>
          <div class="modal-body">
            <p style="margin: 0; font-size: 14px; color: #334155; line-height: 1.6;">
              Select the destination web page to {{ transferMode }} the <strong>{{ selectedSectionIds.size }}</strong> selected layout section(s):
            </p>

            <div class="form-group" style="margin-top: 10px;">
              <label style="font-weight: 700; font-size: 13px; color: #0f172a; margin-bottom: 6px; display: block;">Destination Web Page:</label>
              <select [(ngModel)]="targetTransferPageId" class="filter-select" style="width: 100%; height: 42px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 0 12px; font-size: 13.5px;">
                <option value="" disabled selected>-- Select Destination Web Page --</option>
                <option *ngFor="let p of otherPages" [value]="p.id">{{ p.title }} (/{{ p.directUrl || 'page' }})</option>
              </select>
            </div>

            <!-- Mode Notice Callout -->
            <div class="warning-callout"
              [style.background]="transferMode === 'copy' ? '#eff6ff' : (transferMode === 'move' ? '#fffbeb' : '#f0fdf4')"
              [style.border-color]="transferMode === 'copy' ? '#bfdbfe' : (transferMode === 'move' ? '#fde68a' : '#bbf7d0')">
              <span class="material-symbols-outlined"
                [style.color]="transferMode === 'copy' ? '#1d4ed8' : (transferMode === 'move' ? '#b45309' : '#15803d')"
                style="font-size: 20px;">info</span>
              <div style="font-size: 12.5px;"
                [style.color]="transferMode === 'copy' ? '#1e40af' : (transferMode === 'move' ? '#92400e' : '#166534')">
                <span *ngIf="transferMode === 'copy'">
                  <strong>Copy Notice:</strong> Duplicate copies of each selected section (and all attached child items/cards) will be created on the destination page. Original sections remain intact on this page.
                </span>
                <span *ngIf="transferMode === 'move'">
                  <strong>Move Notice:</strong> The selected section(s) will be transferred away from this page and relocated to the destination page.
                </span>
                <span *ngIf="transferMode === 'link'">
                  <strong>Link Notice:</strong> Creates shared placements on the destination page. The layout sections remain centralized here, avoiding content duplication.
                </span>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" (click)="closeBulkTransferModal()" [disabled]="transferring">
              Cancel
            </button>
            <button type="button" class="btn btn-primary" (click)="executeBulkTransfer()" [disabled]="transferring || !targetTransferPageId">
              <span class="material-symbols-outlined fs-6" *ngIf="!transferring">
                {{ transferMode === 'copy' ? 'content_copy' : (transferMode === 'move' ? 'drive_file_move' : 'link') }}
              </span>
              <span *ngIf="!transferring">Confirm {{ transferMode === 'copy' ? 'Copy' : (transferMode === 'move' ? 'Move' : 'Link') }}</span>
              <span *ngIf="transferring">Processing {{ transferMode }}...</span>
            </button>
          </div>
        </div>
      </div>

      <!-- MODAL 2: MULTI-PAGE PLACEMENT MANAGER -->
      <div class="modal-backdrop" *ngIf="showMultiPageModal">
        <div class="modal-card modal-lg">
          <div class="modal-header">
            <div class="modal-title-group">
              <span class="material-symbols-outlined text-info">share_location</span>
              <div>
                <h3 style="margin: 0; font-size: 17px;">Link Section to Many Pages</h3>
                <span style="font-size: 12px; color: #64748b;">
                  "{{ activeLinkingSection?.title || 'Section Placements' }}"
                </span>
              </div>
            </div>
            <button type="button" class="btn-close" (click)="closeMultiPageModal()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="loading-box" *ngIf="isLoadingLinks" style="padding: 30px;">
              <span class="material-symbols-outlined spin">progress_activity</span>
              <p>Loading active page placements...</p>
            </div>

            <div *ngIf="!isLoadingLinks">
              <!-- Primary Parent Home Banner -->
              <div class="primary-page-banner">
                <span class="material-symbols-outlined text-primary">home</span>
                <div class="banner-text">
                  <span class="banner-title">Primary Parent: <strong>{{ activeLinkingPrimaryPageTitle || page?.title }}</strong></span>
                  <span class="banner-sub">Position #{{ activeLinkingSection?.pageSortOrder }} &bull; Content edits made to this section synchronize across all linked pages automatically.</span>
                </div>
              </div>

              <!-- Secondary Linked Pages List -->
              <div class="section-subhead">
                <strong>Secondary Linked Pages ({{ linkingSectionLinks.length }})</strong>
                <span class="card-sub">Render this shared section on additional pages with independent sort orders.</span>
              </div>

              <div class="linked-pages-list" *ngIf="linkingSectionLinks.length > 0">
                <div class="linked-page-item" *ngFor="let link of linkingSectionLinks; let i = index">
                  <div class="link-item-header">
                    <span class="material-symbols-outlined text-info">link</span>
                    <div class="link-title-box">
                      <strong>{{ link.pageTitle }}</strong>
                      <span class="link-slug">/{{ link.directUrl || 'page' }}</span>
                    </div>
                  </div>

                  <div class="link-item-actions">
                    <div class="sort-input-group">
                      <label>Sort Order</label>
                      <input type="number" [(ngModel)]="link.pageSortOrder" (change)="markLinksDirty()" class="form-control form-control-sm link-sort-input" min="0">
                    </div>

                    <label class="link-vis-toggle" title="Toggle visibility on this page">
                      <input type="checkbox" [(ngModel)]="link.isVisible" (change)="markLinksDirty()">
                      <span>Visible</span>
                    </label>

                    <button type="button" class="btn-remove-link" (click)="removePagePlacement(i)" title="Remove placement from this page">
                      <span class="material-symbols-outlined">link_off</span>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Empty State for Placements -->
              <div class="empty-links-state" *ngIf="linkingSectionLinks.length === 0">
                <span class="material-symbols-outlined">device_hub</span>
                <p>This section is currently only displayed on its primary parent page. Add pages below to share this layout block across multiple web pages.</p>
              </div>

              <!-- Add Placement Bar -->
              <div class="add-link-section" *ngIf="linkingAvailablePages.length > 0">
                <label style="font-weight: 700; font-size: 12.5px; color: #0f172a; margin-bottom: 6px; display: block;">Add Secondary Page Placement:</label>
                <div class="add-link-row">
                  <select [(ngModel)]="selectedAddPageId" class="form-control form-control-sm">
                    <option value="">-- Choose target page to link... --</option>
                    <option *ngFor="let p of linkingAvailablePages" [value]="p.id">
                      {{ p.title }} (/{{ p.directUrl || 'page' }})
                    </option>
                  </select>
                  <button type="button" class="btn btn-sm btn-primary" (click)="addPagePlacement()" [disabled]="!selectedAddPageId">
                    <span class="material-symbols-outlined fs-6">add_link</span>
                    <span>Link Page</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" (click)="closeMultiPageModal()" [disabled]="isSavingLinks">
              Close
            </button>
            <button type="button" class="btn btn-primary" (click)="savePagePlacements()" [disabled]="isSavingLinks || !isLinksDirty">
              <span class="material-symbols-outlined fs-6" *ngIf="!isSavingLinks">save</span>
              <span *ngIf="!isSavingLinks">Save Placements</span>
              <span *ngIf="isSavingLinks">Saving...</span>
            </button>
          </div>
        </div>
      </div>

      <!-- MODAL 3: BULK DELETE CONFIRMATION -->
      <div class="modal-backdrop" *ngIf="showBulkDeleteModal">
        <div class="modal-card">
          <div class="modal-header">
            <div class="modal-title-group">
              <span class="material-symbols-outlined text-danger">delete_sweep</span>
              <h3>Delete {{ selectedSectionIds.size }} Layout Section{{ selectedSectionIds.size > 1 ? 's' : '' }}?</h3>
            </div>
            <button type="button" class="btn-close" (click)="closeBulkDeleteModal()">&times;</button>
          </div>
          <div class="modal-body">
            <p style="margin: 0; font-size: 14px; color: #334155; line-height: 1.6;">
              Are you sure you want to permanently delete the <strong>{{ selectedSectionIds.size }}</strong> selected layout section(s)?
            </p>
            <div class="warning-callout" style="background: #fef2f2; border-color: #fecaca;">
              <span class="material-symbols-outlined text-danger" style="font-size: 20px;">warning</span>
              <div style="font-size: 12.5px; color: #991b1b; line-height: 1.5;">
                <strong>Cascade Deletion Notice:</strong> All repeating sub-items, child card items, buttons, and custom layout data associated with these sections will be permanently removed.
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" (click)="closeBulkDeleteModal()" [disabled]="isDeleting">
              Cancel
            </button>
            <button type="button" class="btn btn-danger" (click)="executeBulkDelete()" [disabled]="isDeleting">
              <span class="material-symbols-outlined fs-6" *ngIf="!isDeleting">delete_forever</span>
              <span *ngIf="!isDeleting">Delete {{ selectedSectionIds.size }} Section{{ selectedSectionIds.size > 1 ? 's' : '' }}</span>
              <span *ngIf="isDeleting">Deleting Sections...</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .cms-page-container { display: flex; flex-direction: column; gap: 24px; }

    .btn {
      display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px;
      border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; text-decoration: none; border: none;
      transition: all 0.2s ease;
    }
    .btn-primary { background: #0050e5; color: #fff; }
    .btn-primary:hover:not([disabled]) { background: #003ebd; }
    .btn-secondary { background: #475569; color: #fff; }
    .btn-secondary:hover:not([disabled]) { background: #334155; }
    .btn-info { background: #0284c7; color: #fff; }
    .btn-info:hover:not([disabled]) { background: #0369a1; }
    .btn-danger { background: #dc2626; color: #fff; }
    .btn-danger:hover:not([disabled]) { background: #b91c1c; }
    .btn-outline { background: transparent; border: 1px solid #cbd5e1; color: #334155; }
    .btn-outline:hover:not([disabled]) { background: #f8fafc; border-color: #94a3b8; }
    .btn-sm { padding: 8px 14px; font-size: 12px; border-radius: 8px; }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; }

    .detail-tabs {
      display: flex; gap: 8px; background: #fff; padding: 6px;
      border-radius: 12px; border: 1px solid #e2e8f0; width: fit-content;
    }
    .tab-btn {
      display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px;
      border-radius: 8px; font-size: 13px; font-weight: 700; border: none;
      background: transparent; color: #64748b; cursor: pointer; transition: all 0.2s;
    }
    .tab-btn.active { background: #eff6ff; color: #0050e5; }

    /* Bulk Action Bar */
    .bulk-action-bar {
      display: flex; justify-content: space-between; align-items: center;
      background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px;
      padding: 12px 20px; animation: slideDown 0.2s ease; flex-wrap: wrap; gap: 12px;
    }
    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .bulk-info { display: flex; align-items: center; gap: 8px; font-size: 13.5px; color: #1e3a8a; }
    .bulk-buttons { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

    .cms-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; }
    .card-header-bar {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 20px; padding-bottom: 14px; border-bottom: 1px solid #f1f5f9;
    }
    .card-header-bar h3 { font-size: 17px; font-weight: 800; color: #0f172a; margin: 0 0 2px; }
    .card-sub { font-size: 13px; color: #64748b; margin: 0; }
    .header-actions-group { display: flex; gap: 10px; align-items: center; }

    .cms-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .cms-table th {
      text-align: left; padding: 12px; background: #f8fafc; color: #64748b;
      font-weight: 700; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-transform: uppercase;
    }
    .cms-table td { padding: 14px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
    .selected-row { background: #f0f7ff !important; }
    tr.row-dragged { opacity: 0.45; background: #f1f5f9 !important; }
    tr.row-drag-over { border-top: 2.5px solid #0050e5 !important; background: #eff6ff !important; }

    .cms-checkbox {
      width: 17px; height: 17px; accent-color: #0050e5; cursor: pointer;
      border-radius: 4px; vertical-align: middle;
    }

    .order-badge { background: #f1f5f9; padding: 4px 8px; border-radius: 6px; font-weight: 700; font-size: 12px; color: #0f172a; }
    .mini-pill { font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; }
    .subitems-badge { background: #eff6ff; color: #0050e5; padding: 4px 8px; border-radius: 6px; font-weight: 700; font-size: 11px; }
    .status-pill { padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; }
    .status-pill.published { background: #dcfce7; color: #15803d; }
    .status-pill.draft { background: #fee2e2; color: #dc2626; }

    .title-with-badges { display: flex; flex-direction: column; gap: 4px; }
    .badge-linked {
      display: inline-flex; align-items: center; gap: 4px; padding: 2px 7px;
      border-radius: 6px; font-size: 11px; font-weight: 700; width: fit-content;
      background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0;
    }
    .badge-link-count {
      display: inline-flex; align-items: center; gap: 4px; padding: 2px 7px;
      border-radius: 6px; font-size: 11px; font-weight: 700; width: fit-content;
      background: #e0f2fe; color: #0284c7; border: 1px solid #bae6fd; cursor: pointer;
    }
    .badge-link-count:hover { background: #bae6fd; }

    .action-dropdown-wrapper { display: flex; align-items: center; gap: 6px; }
    .btn-action {
      display: inline-flex; align-items: center; gap: 4px; padding: 6px 10px;
      border-radius: 6px; font-size: 12px; font-weight: 600; text-decoration: none; cursor: pointer; border: none;
      transition: all 0.15s ease;
    }
    .btn-details { background: #f1f5f9; color: #334155; }
    .btn-details:hover { background: #e2e8f0; color: #0f172a; }
    .btn-edit { background: #eff6ff; color: #0050e5; }
    .btn-edit:hover { background: #0050e5; color: #fff; }
    .btn-link-action { background: #e0f2fe; color: #0284c7; }
    .btn-link-action:hover { background: #0284c7; color: #fff; }

    .dropdown-container { position: relative; }
    .btn-dropdown-toggle {
      background: #f1f5f9; color: #475569; padding: 6px 6px; border-radius: 6px;
    }
    .btn-dropdown-toggle:hover, .dropdown-container.open .btn-dropdown-toggle {
      background: #e2e8f0; color: #0f172a;
    }
    .dropdown-menu-card {
      position: absolute; top: calc(100% + 4px); right: 0; min-width: 220px;
      background: #fff; border: 1px solid #e2e8f0; border-radius: 10px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.12), 0 4px 6px rgba(0, 0, 0, 0.04);
      padding: 6px; z-index: 1050; animation: dropdownFadeIn 0.15s ease-out;
    }
    @keyframes dropdownFadeIn {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .dropdown-item {
      display: flex; align-items: center; gap: 8px; width: 100%; padding: 7px 10px;
      font-size: 12.5px; font-weight: 500; color: #334155; text-decoration: none;
      background: none; border: none; border-radius: 6px; cursor: pointer; text-align: left;
      transition: background 0.15s, color 0.15s;
    }
    .dropdown-item:hover { background: #f8fafc; color: #0f172a; }
    .dropdown-item.text-danger { color: #dc2626; }
    .dropdown-item.text-danger:hover { background: #fee2e2; color: #b91c1c; }
    .dropdown-divider { height: 1px; background: #f1f5f9; margin: 4px 0; }

    .overview-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; }
    .info-list { display: flex; flex-direction: column; gap: 12px; font-size: 13px; }
    .info-row { display: flex; justify-content: space-between; align-items: center; padding-bottom: 8px; border-bottom: 1px solid #f1f5f9; }
    .info-row span { color: #64748b; }

    /* Modals */
    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center; z-index: 2000;
    }
    .modal-card {
      background: #fff; border-radius: 16px; width: 100%; max-width: 580px;
      box-shadow: 0 25px 60px rgba(0,0,0,0.3); overflow: hidden;
    }
    .modal-lg { max-width: 680px; }
    .modal-header {
      padding: 18px 24px; display: flex; justify-content: space-between; align-items: center;
      border-bottom: 1px solid #e2e8f0;
    }
    .modal-title-group { display: flex; align-items: center; gap: 10px; }
    .modal-title-group h3 { margin: 0; font-size: 18px; font-weight: 800; }
    .btn-close { background: none; border: none; font-size: 24px; cursor: pointer; color: #64748b; line-height: 1; }
    .modal-body { padding: 24px; display: flex; flex-direction: column; gap: 16px; max-height: 75vh; overflow-y: auto; }
    .modal-footer { padding: 16px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 10px; }

    .warning-callout {
      display: flex; gap: 12px; align-items: flex-start;
      border-radius: 10px; border: 1px solid;
      padding: 14px 16px; margin-top: 12px;
    }

    /* Multi-Page Shared Placements in Modal */
    .primary-page-banner {
      display: flex; align-items: center; gap: 10px; background: #eff6ff;
      border: 1px solid #bfdbfe; border-radius: 8px; padding: 10px 14px; margin-bottom: 14px;
    }
    .primary-page-banner .banner-text { display: flex; flex-direction: column; }
    .primary-page-banner .banner-title { font-size: 13px; color: #1e3a8a; }
    .primary-page-banner .banner-sub { font-size: 11.5px; color: #3b82f6; }

    .section-subhead { display: flex; flex-direction: column; gap: 2px; margin-bottom: 8px; }
    .section-subhead strong { font-size: 13.5px; color: #0f172a; }

    .linked-pages-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; }
    .linked-page-item {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px;
      flex-wrap: wrap;
    }
    .link-item-header { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 180px; }
    .link-title-box { display: flex; flex-direction: column; }
    .link-title-box strong { font-size: 13px; color: #0f172a; }
    .link-slug { font-size: 11px; color: #64748b; font-family: monospace; }
    .link-item-actions { display: flex; align-items: center; gap: 12px; }
    .sort-input-group { display: flex; align-items: center; gap: 6px; }
    .sort-input-group label { font-size: 11px; color: #64748b; font-weight: 600; }
    .link-sort-input { width: 64px; text-align: center; height: 32px; padding: 4px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 12.5px; }
    .link-vis-toggle { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; color: #334155; font-weight: 600; cursor: pointer; }
    .btn-remove-link {
      background: none; border: none; color: #dc2626; cursor: pointer; padding: 4px; border-radius: 6px;
      display: inline-flex; align-items: center;
    }
    .btn-remove-link:hover { background: #fee2e2; }

    .empty-links-state {
      text-align: center; padding: 24px; background: #f8fafc; border-radius: 10px; border: 1px dashed #cbd5e1;
      color: #64748b; display: flex; flex-direction: column; align-items: center; gap: 6px; margin-bottom: 14px;
    }
    .empty-links-state .material-symbols-outlined { font-size: 28px; color: #94a3b8; }
    .empty-links-state p { margin: 0; font-size: 12.5px; max-width: 440px; line-height: 1.5; }

    .add-link-section {
      background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px;
    }
    .add-link-row { display: flex; gap: 10px; }
    .add-link-row select { flex: 1; height: 38px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 0 10px; font-size: 13px; }

    .loading-box { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px; color: #64748b; }
    .spin { animation: spin 1s linear infinite; font-size: 32px; color: #0050e5; margin-bottom: 12px; }
    @keyframes spin { 100% { transform: rotate(360deg); } }

    .empty-cell { text-align: center; color: #64748b; padding: 32px !important; font-size: 13.5px; }
  `]
})
export class WebPageDetailsComponent implements OnInit {
  pageId = '';
  page: any = null;
  loading = false;
  activeTab = 'sections';

  // Checklist Selection
  selectedSectionIds = new Set<string>();

  // Row Action Dropdown Toggle
  openActionDropdownId: string | null = null;

  // Destination Web Pages
  allPages: any[] = [];

  // Bulk Transfer Modal State
  showBulkTransferModal = false;
  transferMode: 'copy' | 'move' | 'link' = 'copy';
  targetTransferPageId = '';
  transferring = false;

  // Multi-Page Link Placement Manager State
  showMultiPageModal = false;
  activeLinkingSection: any = null;
  activeLinkingPrimaryPageTitle = '';
  linkingSectionLinks: any[] = [];
  linkingAvailablePages: any[] = [];
  selectedAddPageId = '';
  isLoadingLinks = false;
  isSavingLinks = false;
  isLinksDirty = false;

  // Bulk Delete Modal State
  showBulkDeleteModal = false;
  isDeleting = false;

  // Section Drag-and-Drop & Reorder State
  sectionReorder = new CmsDragDropReorderHelper();
  savingOrder = false;

  get displayDirectRoute(): string {
    if (!this.page?.directUrl) return '/';
    const val = this.page.directUrl.trim();
    if (val.startsWith('http://') || val.startsWith('https://')) return val;
    return '/' + val.replace(/^\/+/, '');
  }

  get headerSubtitle(): string {
    return this.page
      ? `Direct Route: ${this.displayDirectRoute} • ${this.page.pageSections?.length || 0} Layout Section Blocks`
      : 'Page layout sections, metadata, and routing configuration.';
  }

  get headerButtons(): PageHeaderButton[] {
    return [
      {
        text: 'Back to Pages',
        icon: 'arrow_back',
        routerLink: '/content/console/pages'
      },
      {
        text: 'Edit Page Settings',
        icon: 'edit',
        isPrimary: true,
        routerLink: `/content/console/pages/edit/${this.pageId}`
      }
    ];
  }

  get otherPages(): any[] {
    return (this.allPages || []).filter(p => p.id !== this.pageId);
  }

  get isAllSelected(): boolean {
    const list = this.page?.pageSections || [];
    return list.length > 0 && list.every((s: any) => this.selectedSectionIds.has(s.id));
  }

  get isIndeterminate(): boolean {
    const count = this.selectedSectionIds.size;
    const total = this.page?.pageSections?.length || 0;
    return count > 0 && count < total;
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.pageId = this.route.snapshot.paramMap.get('id') || '';
    if (this.pageId) {
      this.loadPage();
      this.loadAllPages();
    }
  }

  @HostListener('document:click')
  closeActionDropdown(): void {
    this.openActionDropdownId = null;
  }

  toggleActionDropdown(secId: string, event: Event): void {
    event.stopPropagation();
    this.openActionDropdownId = this.openActionDropdownId === secId ? null : secId;
  }

  loadPage(): void {
    this.loading = true;
    this.selectedSectionIds.clear();
    this.api.get<any>(`ContentApi/pages/${this.pageId}`).subscribe({
      next: (res) => {
        this.loading = false;
        this.page = res?.data;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  loadAllPages(): void {
    this.api.get<any>('ContentApi/pages').subscribe({
      next: (res) => {
        this.allPages = res?.data || [];
      },
      error: () => {
        this.allPages = [];
      }
    });
  }

  // ==========================================
  // CHECKLIST SELECTION LOGIC
  // ==========================================

  isSelected(id: string): boolean {
    return this.selectedSectionIds.has(id);
  }

  toggleSelection(id: string): void {
    if (this.selectedSectionIds.has(id)) {
      this.selectedSectionIds.delete(id);
    } else {
      this.selectedSectionIds.add(id);
    }
  }

  toggleSelectAll(event: any): void {
    const checked = event?.target?.checked;
    this.selectedSectionIds.clear();
    if (checked && this.page?.pageSections) {
      for (const sec of this.page.pageSections) {
        this.selectedSectionIds.add(sec.id);
      }
    }
  }

  // ==========================================
  // BULK TRANSFER (COPY / MOVE / LINK)
  // ==========================================

  openBulkTransferModal(mode: 'copy' | 'move' | 'link'): void {
    if (this.selectedSectionIds.size === 0) return;
    this.transferMode = mode;
    this.targetTransferPageId = this.otherPages.length > 0 ? this.otherPages[0].id : '';
    this.showBulkTransferModal = true;
  }

  openSingleSectionTransfer(sec: any, mode: 'copy' | 'move'): void {
    this.closeActionDropdown();
    this.selectedSectionIds.clear();
    this.selectedSectionIds.add(sec.id);
    this.transferMode = mode;
    this.targetTransferPageId = this.otherPages.length > 0 ? this.otherPages[0].id : '';
    this.showBulkTransferModal = true;
  }

  closeBulkTransferModal(): void {
    if (this.transferring) return;
    this.showBulkTransferModal = false;
  }

  executeBulkTransfer(): void {
    if (this.selectedSectionIds.size === 0 || !this.targetTransferPageId) return;

    this.transferring = true;
    const ids = Array.from(this.selectedSectionIds);

    this.api.post<any>('ContentApi/sections/bulk-transfer', {
      ids,
      targetPageId: this.targetTransferPageId,
      action: this.transferMode
    }).subscribe({
      next: (res) => {
        this.transferring = false;
        this.showBulkTransferModal = false;
        this.selectedSectionIds.clear();
        this.toast.success(res?.message || `${ids.length} section(s) transferred successfully.`);
        this.loadPage();
      },
      error: (err) => {
        this.transferring = false;
        this.toast.error(err?.error?.message || `Failed to ${this.transferMode} section(s).`);
      }
    });
  }

  // ==========================================
  // MULTI-PAGE PLACEMENT LINKING MODAL
  // ==========================================

  openMultiPageModal(sec: any): void {
    this.activeLinkingSection = sec;
    this.activeLinkingPrimaryPageTitle = sec.webPage?.title || this.page?.title || '';
    this.showMultiPageModal = true;
    this.isLinksDirty = false;
    this.loadSectionLinks(sec.id);
  }

  closeMultiPageModal(): void {
    if (this.isSavingLinks) return;
    this.showMultiPageModal = false;
    this.activeLinkingSection = null;
  }

  loadSectionLinks(sectionId: string): void {
    this.isLoadingLinks = true;
    this.api.get<any>(`ContentApi/sections/${sectionId}/page-links`).subscribe({
      next: (res) => {
        this.isLoadingLinks = false;
        const data = res?.data;
        this.linkingSectionLinks = (data?.linkedPages || []).map((l: any) => ({
          webPageId: l.webPageId,
          pageTitle: l.pageTitle,
          directUrl: l.directUrl,
          pageSortOrder: l.pageSortOrder,
          isVisible: l.isVisible !== false
        }));
        this.activeLinkingPrimaryPageTitle = data?.primaryPageTitle || this.activeLinkingPrimaryPageTitle;
        this.updateAvailableLinkPages();
      },
      error: (err) => {
        this.isLoadingLinks = false;
        this.toast.error(err?.error?.message || 'Failed to load page links for section.');
      }
    });
  }

  updateAvailableLinkPages(): void {
    const linkedIds = new Set(this.linkingSectionLinks.map(l => l.webPageId));
    // Exclude primary parent page of section
    const primaryId = this.activeLinkingSection?.webPageId || this.pageId;
    linkedIds.add(primaryId);

    this.linkingAvailablePages = (this.allPages || []).filter(p => !linkedIds.has(p.id));
    this.selectedAddPageId = '';
  }

  addPagePlacement(): void {
    if (!this.selectedAddPageId) return;
    const page = this.allPages.find(p => p.id === this.selectedAddPageId);
    if (!page) return;

    this.linkingSectionLinks.push({
      webPageId: page.id,
      pageTitle: page.title,
      directUrl: page.directUrl,
      pageSortOrder: this.linkingSectionLinks.length + 1,
      isVisible: true
    });

    this.isLinksDirty = true;
    this.updateAvailableLinkPages();
  }

  removePagePlacement(index: number): void {
    if (index >= 0 && index < this.linkingSectionLinks.length) {
      this.linkingSectionLinks.splice(index, 1);
      this.isLinksDirty = true;
      this.updateAvailableLinkPages();
    }
  }

  markLinksDirty(): void {
    this.isLinksDirty = true;
  }

  savePagePlacements(): void {
    if (!this.activeLinkingSection?.id) return;
    this.isSavingLinks = true;

    const payload = {
      links: this.linkingSectionLinks.map(l => ({
        webPageId: l.webPageId,
        pageSortOrder: Number(l.pageSortOrder) || 0,
        isVisible: l.isVisible !== false
      }))
    };

    this.api.put<any>(`ContentApi/sections/${this.activeLinkingSection.id}/page-links`, payload).subscribe({
      next: (res) => {
        this.isSavingLinks = false;
        this.isLinksDirty = false;
        this.toast.success(res?.message || 'Multi-page placements saved successfully!');
        this.loadSectionLinks(this.activeLinkingSection.id);
        this.loadPage(); // Refresh counts and list on page details
      },
      error: (err) => {
        this.isSavingLinks = false;
        this.toast.error(err?.error?.message || 'Failed to save page placements.');
      }
    });
  }

  // ==========================================
  // UNLINK & DELETE
  // ==========================================

  async unlinkSection(sec: any): Promise<void> {
    const confirmed = await this.toast.confirm(
      'Unlink Shared Section',
      `Are you sure you want to remove the shared placement of "${sec.title}" from this page? The original master section on "${sec.webPage?.title || 'its parent page'}" will remain unaffected.`,
      'Unlink',
      'Cancel',
      'danger'
    );
    if (!confirmed) return;

    this.api.delete<any>(`ContentApi/sections/${sec.id}/page-links/${this.pageId}`).subscribe({
      next: () => {
        this.toast.success(`Section "${sec.title}" unlinked from this page.`);
        this.loadPage();
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'Failed to unlink section.');
      }
    });
  }

  async deleteSection(sec: any): Promise<void> {
    const confirmed = await this.toast.confirm(
      'Delete Section',
      `Are you sure you want to delete section "${sec.title}"?`,
      'Delete',
      'Cancel',
      'danger'
    );
    if (!confirmed) return;

    this.api.delete<any>(`ContentApi/sections/${sec.id}`).subscribe({
      next: () => {
        this.toast.success(`Section "${sec.title}" deleted.`);
        this.loadPage();
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'Failed to delete section.');
      }
    });
  }

  // ==========================================
  // BULK DELETE
  // ==========================================

  openBulkDeleteModal(): void {
    if (this.selectedSectionIds.size === 0) return;
    this.showBulkDeleteModal = true;
  }

  closeBulkDeleteModal(): void {
    if (this.isDeleting) return;
    this.showBulkDeleteModal = false;
  }

  async executeBulkDelete(): Promise<void> {
    if (this.selectedSectionIds.size === 0) return;
    this.isDeleting = true;

    const ids = Array.from(this.selectedSectionIds);
    let successCount = 0;
    let failCount = 0;

    for (const id of ids) {
      try {
        await this.api.delete<any>(`ContentApi/sections/${id}`).toPromise();
        successCount++;
      } catch {
        failCount++;
      }
    }

    this.isDeleting = false;
    this.showBulkDeleteModal = false;
    this.selectedSectionIds.clear();

    if (failCount === 0) {
      this.toast.success(`${successCount} section(s) deleted successfully.`);
    } else {
      this.toast.warning(`${successCount} section(s) deleted, ${failCount} failed.`);
    }

    this.loadPage();
  }

  // ==========================================
  // DRAG-AND-DROP & ARROW REORDERING
  // ==========================================

  /** Moves a section directly to the top of the page layout. */
  moveSectionToTop(index: number): void {
    const next = reorderListToTop(this.page?.pageSections || [], index);
    if (next) this.applyAndSaveSectionReorder(next);
  }

  /** Moves a section one position up within the page layout. */
  moveSectionUp(index: number): void {
    const next = reorderListStep(this.page?.pageSections || [], index, -1);
    if (next) this.applyAndSaveSectionReorder(next);
  }

  /** Moves a section one position down within the page layout. */
  moveSectionDown(index: number): void {
    const next = reorderListStep(this.page?.pageSections || [], index, 1);
    if (next) this.applyAndSaveSectionReorder(next);
  }

  /** Drops a dragged section onto the target index and persists the new layout order. */
  onSectionDrop(event: DragEvent, targetIndex: number): void {
    const move = this.sectionReorder.consumeDrop(event, targetIndex);
    if (!move) return;
    const next = reorderListByMove(this.page?.pageSections || [], move.fromIndex, move.toIndex);
    if (next) this.applyAndSaveSectionReorder(next);
  }

  /** Updates an individual section's inline PageSortOrder and persists immediately. */
  commitSectionOrder(sec: any, newOrder: number): void {
    sec.pageSortOrder = newOrder;
    const sections = [...(this.page?.pageSections || [])].sort((a, b) => (a.pageSortOrder || 0) - (b.pageSortOrder || 0));
    this.page.pageSections = sections;
    const payload = sections.map((s: any) => ({ id: s.id, sortOrder: s.pageSortOrder || 0 }));
    this.persistSectionReorder(payload, `Order for "${sec.title || 'Section'}" updated to #${newOrder}.`);
  }

  private applyAndSaveSectionReorder(orderedList: any[]): void {
    const payload = assignStepOrders(orderedList, 'pageSortOrder', 10);
    this.page.pageSections = orderedList;
    this.persistSectionReorder(payload);
  }

  private persistSectionReorder(payload: Array<{ id: string; sortOrder: number }>, successMsg?: string): void {
    this.savingOrder = true;
    const url = this.pageId ? `ContentApi/sections/reorder?webPageId=${this.pageId}` : 'ContentApi/sections/reorder';
    this.api.put<any>(url, payload).subscribe({
      next: () => {
        this.savingOrder = false;
        if (successMsg) this.toast.success(successMsg);
      },
      error: (err) => {
        this.savingOrder = false;
        this.toast.error(err?.error?.message || 'Failed to save section order.');
        this.loadPage();
      }
    });
  }
}
