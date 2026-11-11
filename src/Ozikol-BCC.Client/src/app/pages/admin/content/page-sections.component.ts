import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent, PageHeaderButton } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-page-sections',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, PageHeaderComponent],
  template: `
    <div class="cms-page-container">
      <!-- Standardized Reusable Page Header -->
      <app-page-header
        eyebrow="CMS Studio"
        icon="view_quilt"
        title="All Page Layout Sections & Sub-Items"
        subtitle="Global overview of all layout blocks, feature grids, hero banners, and child card items across all web pages."
        [buttons]="headerButtons"
        [loading]="loading"
      ></app-page-header>

      <!-- Navigation Tabs (Sections vs All Sub-Items) -->
      <div class="cms-nav-tabs">
        <button
          type="button"
          class="nav-tab"
          [class.active]="activeTab === 'sections'"
          (click)="switchTab('sections')"
        >
          <span class="material-symbols-outlined fs-5">view_quilt</span>
          <span>All Page Sections</span>
          <span class="tab-badge">{{ sections.length }}</span>
        </button>
        <button
          type="button"
          class="nav-tab"
          [class.active]="activeTab === 'subitems'"
          (click)="switchTab('subitems')"
        >
          <span class="material-symbols-outlined fs-5">list</span>
          <span>All Repeating Sub-Items &amp; Cards</span>
          <span class="tab-badge">{{ allSubItems.length }}</span>
        </button>
      </div>

      <!-- Search & Page Filter -->
      <div class="filter-bar">
        <div class="filter-group">
          <select [(ngModel)]="filterPageId" (change)="onFilterChange()" class="filter-select">
            <option value="">All Web Pages (Global View)</option>
            <option *ngFor="let p of allPages" [value]="p.id">{{ p.title }} (/{{ p.directUrl || 'page' }})</option>
          </select>

          <div class="search-box">
            <span class="material-symbols-outlined">search</span>
            <input
              type="text"
              [(ngModel)]="searchTerm"
              (input)="onFilterChange()"
              [placeholder]="activeTab === 'sections' ? 'Search sections by title, page, template...' : 'Search sub-items, cards, buttons...'"
            >
          </div>
        </div>
      </div>

      <!-- Bulk Action Toolbar (Sections) -->
      <div class="bulk-action-bar" *ngIf="activeTab === 'sections' && selectedSectionIds.size > 0">
        <div class="bulk-info">
          <span class="material-symbols-outlined text-primary">check_circle</span>
          <span><strong>{{ selectedSectionIds.size }}</strong> layout section{{ selectedSectionIds.size > 1 ? 's' : '' }} selected</span>
        </div>
        <div class="bulk-buttons">
          <button type="button" class="btn btn-sm btn-outline" (click)="clearSelectedSections()">Deselect All</button>
          <button type="button" class="btn btn-sm btn-primary" (click)="openBulkTransferSectionsModal('copy')">
            <span class="material-symbols-outlined fs-6">content_copy</span>
            <span>Copy to Page...</span>
          </button>
          <button type="button" class="btn btn-sm btn-secondary" (click)="openBulkTransferSectionsModal('move')">
            <span class="material-symbols-outlined fs-6">drive_file_move</span>
            <span>Move to Page...</span>
          </button>
          <button type="button" class="btn btn-sm btn-danger" (click)="openBulkDeleteSectionsModal()">
            <span class="material-symbols-outlined fs-6">delete_sweep</span>
            <span>Delete Selected ({{ selectedSectionIds.size }})</span>
          </button>
        </div>
      </div>

      <!-- Bulk Action Toolbar (Sub-Items) -->
      <div class="bulk-action-bar" *ngIf="activeTab === 'subitems' && selectedSubItemIds.size > 0">
        <div class="bulk-info">
          <span class="material-symbols-outlined text-primary">check_circle</span>
          <span><strong>{{ selectedSubItemIds.size }}</strong> repeating sub-item{{ selectedSubItemIds.size > 1 ? 's' : '' }} selected</span>
        </div>
        <div class="bulk-buttons">
          <button type="button" class="btn btn-sm btn-outline" (click)="clearSelectedSubItems()">Deselect All</button>
          <button type="button" class="btn btn-sm btn-primary" (click)="openBulkTransferSubItemsModal('copy')">
            <span class="material-symbols-outlined fs-6">content_copy</span>
            <span>Copy to Section...</span>
          </button>
          <button type="button" class="btn btn-sm btn-secondary" (click)="openBulkTransferSubItemsModal('move')">
            <span class="material-symbols-outlined fs-6">drive_file_move</span>
            <span>Move to Section...</span>
          </button>
          <button type="button" class="btn btn-sm btn-danger" (click)="openBulkDeleteSubItemsModal()">
            <span class="material-symbols-outlined fs-6">delete_sweep</span>
            <span>Delete Selected ({{ selectedSubItemIds.size }})</span>
          </button>
        </div>
      </div>

      <!-- TAB 1: ALL SECTIONS TABLE -->
      <div class="cms-card" *ngIf="activeTab === 'sections'">
        <div class="table-responsive">
          <table class="cms-table">
            <thead>
              <tr>
                <th style="width: 44px; text-align: center;">
                  <input
                    type="checkbox"
                    class="cms-checkbox"
                    [checked]="isAllSectionsSelected"
                    [indeterminate]="isIndeterminateSections"
                    (change)="toggleSelectAllSections($event)"
                    title="Select / Deselect all sections on this view"
                  >
                </th>
                <th>SECTION TITLE</th>
                <th>PARENT PAGE</th>
                <th>TEMPLATE KEY</th>
                <th>SUB-ITEMS</th>
                <th>HOME VISIBLE</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let sec of filteredSections" [class.selected-row]="isSectionSelected(sec.id)">
                <td style="width: 44px; text-align: center;">
                  <input
                    type="checkbox"
                    class="cms-checkbox"
                    [checked]="isSectionSelected(sec.id)"
                    (change)="toggleSectionSelection(sec.id)"
                  >
                </td>
                <td>
                  <strong>{{ sec.title || '(Untitled Section)' }}</strong>
                  <div class="sub-text" *ngIf="sec.miniTitle">{{ sec.miniTitle }}</div>
                </td>
                <td>
                  <span class="page-pill" *ngIf="sec.webPage">
                    <span class="material-symbols-outlined fs-6">web</span>
                    {{ sec.webPage.title }}
                  </span>
                  <span class="page-pill global" *ngIf="!sec.webPage">
                    <span class="material-symbols-outlined fs-6">public</span>
                    Standalone / Global
                  </span>
                </td>
                <td><code>{{ sec.templateKey || 'default-block' }}</code></td>
                <td>
                  <span class="subitems-badge">{{ sec.pageSectionLists?.length || 0 }} Items</span>
                </td>
                <td>
                  <span class="indicator" [class.on]="sec.showInHome" [class.off]="!sec.showInHome">
                    {{ sec.showInHome ? 'Yes' : 'No' }}
                  </span>
                </td>
                <td>
                  <span class="status-pill" [class.published]="!sec.disable" [class.draft]="sec.disable">
                    {{ !sec.disable ? 'Active' : 'Disabled' }}
                  </span>
                </td>
                <td>
                  <div class="action-dropdown-wrapper">
                    <a [routerLink]="['/content/console/sections/details', sec.id]" class="btn-action btn-details" title="Manage sub-items">
                      <span class="material-symbols-outlined">list</span>
                      <span>Sub-Items</span>
                    </a>
                    <a [routerLink]="['/content/console/sections/edit', sec.id]" class="btn-action btn-edit" title="Edit section">
                      <span class="material-symbols-outlined">edit</span>
                      <span>Edit</span>
                    </a>

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
                        <button type="button" class="dropdown-item" (click)="openSingleSectionTransfer(sec, 'copy')">
                          <span class="material-symbols-outlined fs-6 text-primary">content_copy</span>
                          <span>Copy to Another Page...</span>
                        </button>
                        <button type="button" class="dropdown-item" (click)="openSingleSectionTransfer(sec, 'move')">
                          <span class="material-symbols-outlined fs-6 text-secondary">drive_file_move</span>
                          <span>Move to Another Page...</span>
                        </button>
                        <div class="dropdown-divider"></div>
                        <a [routerLink]="['/content/console/sections/delete', sec.id]" [queryParams]="{ returnUrl: getSectionDeleteReturnUrl(sec) }" class="dropdown-item text-danger" (click)="closeActionDropdown()">
                          <span class="material-symbols-outlined fs-6">delete</span>
                          <span>Delete Section</span>
                        </a>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
              <tr *ngIf="filteredSections.length === 0">
                <td colspan="8" class="empty-cell">No sections found matching your filter criteria.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- TAB 2: ALL SUB-ITEMS & CARDS TABLE -->
      <div class="cms-card" *ngIf="activeTab === 'subitems'">
        <div class="table-responsive">
          <table class="cms-table">
            <thead>
              <tr>
                <th style="width: 44px; text-align: center;">
                  <input
                    type="checkbox"
                    class="cms-checkbox"
                    [checked]="isAllSubItemsSelected"
                    [indeterminate]="isIndeterminateSubItems"
                    (change)="toggleSelectAllSubItems($event)"
                    title="Select / Deselect all sub-items on this view"
                  >
                </th>
                <th>SUB-ITEM / CARD TITLE</th>
                <th>PARENT SECTION</th>
                <th>PARENT PAGE</th>
                <th>BUTTON / DESTINATION</th>
                <th>SORT ORDER</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of filteredSubItems" [class.selected-row]="isSubItemSelected(item.id)">
                <td style="width: 44px; text-align: center;">
                  <input
                    type="checkbox"
                    class="cms-checkbox"
                    [checked]="isSubItemSelected(item.id)"
                    (change)="toggleSubItemSelection(item.id)"
                  >
                </td>
                <td>
                  <strong>{{ item.title || '(Untitled Item)' }}</strong>
                  <div class="sub-text" *ngIf="item.miniTitle">{{ item.miniTitle }}</div>
                </td>
                <td>
                  <div class="d-flex align-items-center gap-1">
                    <span class="material-symbols-outlined text-muted fs-6">layers</span>
                    <strong class="text-dark">{{ item.pageSection?.title || 'Unknown Section' }}</strong>
                  </div>
                </td>
                <td>
                  <span class="page-pill" *ngIf="item.pageSection?.webPage">
                    <span class="material-symbols-outlined fs-6">web</span>
                    {{ item.pageSection.webPage.title }}
                  </span>
                  <span class="page-pill global" *ngIf="!item.pageSection?.webPage">
                    <span class="material-symbols-outlined fs-6">public</span>
                    Standalone / Global
                  </span>
                </td>
                <td>
                  <span class="btn-preview-tag" *ngIf="item.buttonText">{{ item.buttonText }}</span>
                  <code class="small text-muted" *ngIf="item.buttonLink"> &rarr; {{ item.buttonLink }}</code>
                  <span class="badge-none" *ngIf="!item.buttonText &amp;&amp; !item.buttonLink">-</span>
                </td>
                <td><code>#{{ item.sortOrder || 0 }}</code></td>
                <td>
                  <span class="status-pill" [class.published]="!item.disable" [class.draft]="item.disable">
                    {{ !item.disable ? 'Active' : 'Disabled' }}
                  </span>
                </td>
                <td>
                  <div class="action-dropdown-wrapper">
                    <a [routerLink]="['/content/console/sections/lists/edit', item.id]" class="btn-action btn-edit" title="Edit sub-item">
                      <span class="material-symbols-outlined">edit</span>
                      <span>Edit</span>
                    </a>

                    <!-- Sub-Item Dropdown Toggle -->
                    <div class="dropdown-container" [class.open]="openSubItemDropdownId === item.id">
                      <button
                        type="button"
                        class="btn-action btn-dropdown-toggle"
                        (click)="toggleSubItemDropdown(item.id, $event)"
                        title="More actions">
                        <span class="material-symbols-outlined">more_vert</span>
                      </button>

                      <div class="dropdown-menu-card" *ngIf="openSubItemDropdownId === item.id" (click)="$event.stopPropagation()">
                        <button type="button" class="dropdown-item" (click)="openSingleSubItemTransfer(item, 'copy')">
                          <span class="material-symbols-outlined fs-6 text-primary">content_copy</span>
                          <span>Copy to Another Section...</span>
                        </button>
                        <button type="button" class="dropdown-item" (click)="openSingleSubItemTransfer(item, 'move')">
                          <span class="material-symbols-outlined fs-6 text-secondary">drive_file_move</span>
                          <span>Move to Another Section...</span>
                        </button>
                        <div class="dropdown-divider"></div>
                        <a [routerLink]="['/content/console/sections/lists/delete', item.id]" [queryParams]="{ returnUrl: getSubItemDeleteReturnUrl(item) }" class="dropdown-item text-danger" (click)="closeActionDropdown()">
                          <span class="material-symbols-outlined fs-6">delete</span>
                          <span>Delete Sub-Item</span>
                        </a>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
              <tr *ngIf="filteredSubItems.length === 0">
                <td colspan="8" class="empty-cell">No repeating sub-items found matching your filter criteria.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Bulk Delete Sections Modal -->
      <div class="modal-backdrop" *ngIf="showBulkDeleteSectionsModal">
        <div class="modal-card">
          <div class="modal-header">
            <div class="modal-title-group">
              <span class="material-symbols-outlined text-danger">delete_sweep</span>
              <h3>Delete {{ selectedSectionIds.size }} Layout Section{{ selectedSectionIds.size > 1 ? 's' : '' }}?</h3>
            </div>
            <button type="button" class="btn-close" (click)="closeBulkDeleteSectionsModal()">&times;</button>
          </div>
          <div class="modal-body">
            <p style="margin: 0; font-size: 14px; color: #334155; line-height: 1.6;">
              Are you sure you want to permanently delete the <strong>{{ selectedSectionIds.size }}</strong> selected layout section(s)?
            </p>
            <div class="warning-callout">
              <span class="material-symbols-outlined text-danger" style="font-size: 20px;">warning</span>
              <div style="font-size: 13px; color: #991b1b; line-height: 1.5;">
                <strong>Cascade Deletion Notice:</strong> All repeating sub-items, child card items, buttons, and custom layout data associated with these sections will be permanently removed.
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" (click)="closeBulkDeleteSectionsModal()" [disabled]="bulkDeleting">
              Cancel
            </button>
            <button type="button" class="btn btn-danger" (click)="executeBulkDeleteSections()" [disabled]="bulkDeleting">
              <span class="material-symbols-outlined fs-6" *ngIf="!bulkDeleting">delete_forever</span>
              <span *ngIf="!bulkDeleting">Delete {{ selectedSectionIds.size }} Section{{ selectedSectionIds.size > 1 ? 's' : '' }}</span>
              <span *ngIf="bulkDeleting">Deleting Sections...</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Bulk Delete Sub-Items Modal -->
      <div class="modal-backdrop" *ngIf="showBulkDeleteSubItemsModal">
        <div class="modal-card">
          <div class="modal-header">
            <div class="modal-title-group">
              <span class="material-symbols-outlined text-danger">delete_sweep</span>
              <h3>Delete {{ selectedSubItemIds.size }} Sub-Item{{ selectedSubItemIds.size > 1 ? 's' : '' }}?</h3>
            </div>
            <button type="button" class="btn-close" (click)="closeBulkDeleteSubItemsModal()">&times;</button>
          </div>
          <div class="modal-body">
            <p style="margin: 0; font-size: 14px; color: #334155; line-height: 1.6;">
              Are you sure you want to permanently delete the <strong>{{ selectedSubItemIds.size }}</strong> selected repeating sub-item(s) across your page sections?
            </p>
            <div class="warning-callout">
              <span class="material-symbols-outlined text-danger" style="font-size: 20px;">info</span>
              <div style="font-size: 13px; color: #991b1b; line-height: 1.5;">
                This will unbind and delete these card items from their parent sections. This action cannot be undone.
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" (click)="closeBulkDeleteSubItemsModal()" [disabled]="bulkDeleting">
              Cancel
            </button>
            <button type="button" class="btn btn-danger" (click)="executeBulkDeleteSubItems()" [disabled]="bulkDeleting">
              <span class="material-symbols-outlined fs-6" *ngIf="!bulkDeleting">delete_forever</span>
              <span *ngIf="!bulkDeleting">Delete {{ selectedSubItemIds.size }} Item{{ selectedSubItemIds.size > 1 ? 's' : '' }}</span>
              <span *ngIf="bulkDeleting">Deleting Items...</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Bulk Transfer (Move/Copy) Sections Modal -->
      <div class="modal-backdrop" *ngIf="showBulkTransferSectionsModal">
        <div class="modal-card">
          <div class="modal-header">
            <div class="modal-title-group">
              <span class="material-symbols-outlined text-primary">{{ transferSectionsMode === 'copy' ? 'content_copy' : 'drive_file_move' }}</span>
              <h3>{{ transferSectionsMode === 'copy' ? 'Copy' : 'Move' }} {{ selectedSectionIds.size }} Layout Section{{ selectedSectionIds.size > 1 ? 's' : '' }}</h3>
            </div>
            <button type="button" class="btn-close" (click)="closeBulkTransferSectionsModal()">&times;</button>
          </div>
          <div class="modal-body">
            <p style="margin: 0; font-size: 14px; color: #334155; line-height: 1.6;">
              Select the destination web page to {{ transferSectionsMode }} the <strong>{{ selectedSectionIds.size }}</strong> selected layout section(s):
            </p>

            <div class="form-group" style="margin-top: 10px;">
              <label style="font-weight: 700; font-size: 13px; color: #0f172a; margin-bottom: 6px; display: block;">Target Destination Web Page:</label>
              <select [(ngModel)]="targetTransferPageId" class="filter-select" style="width: 100%; height: 42px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 0 12px; font-size: 13.5px;">
                <option value="" disabled selected>-- Select Target Web Page --</option>
                <option *ngFor="let p of allPages" [value]="p.id">{{ p.title }} (/{{ p.directUrl || 'page' }})</option>
              </select>
            </div>

            <div class="warning-callout" [style.background]="transferSectionsMode === 'copy' ? '#eff6ff' : '#fffbeb'" [style.border-color]="transferSectionsMode === 'copy' ? '#bfdbfe' : '#fde68a'">
              <span class="material-symbols-outlined" [style.color]="transferSectionsMode === 'copy' ? '#1d4ed8' : '#b45309'" style="font-size: 20px;">info</span>
              <div style="font-size: 12.5px;" [style.color]="transferSectionsMode === 'copy' ? '#1e40af' : '#92400e'">
                <span *ngIf="transferSectionsMode === 'move'">
                  <strong>Move Notice:</strong> The selected section(s) will update their parent WebPage ID and be relocated to the destination page.
                </span>
                <span *ngIf="transferSectionsMode === 'copy'">
                  <strong>Copy Notice:</strong> Duplicate copies of each selected section and all attached repeating sub-items/cards will be created on the destination page. Original sections remain untouched.
                </span>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" (click)="closeBulkTransferSectionsModal()" [disabled]="transferringSections">
              Cancel
            </button>
            <button type="button" class="btn btn-primary" (click)="executeBulkTransferSections()" [disabled]="transferringSections || !targetTransferPageId">
              <span class="material-symbols-outlined fs-6" *ngIf="!transferringSections">{{ transferSectionsMode === 'copy' ? 'content_copy' : 'drive_file_move' }}</span>
              <span *ngIf="!transferringSections">Confirm {{ transferSectionsMode === 'copy' ? 'Copy' : 'Move' }}</span>
              <span *ngIf="transferringSections">Processing {{ transferSectionsMode }}...</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Bulk Transfer (Move/Copy) Sub-Items Modal -->
      <div class="modal-backdrop" *ngIf="showBulkTransferSubItemsModal">
        <div class="modal-card">
          <div class="modal-header">
            <div class="modal-title-group">
              <span class="material-symbols-outlined text-primary">{{ transferSubItemsMode === 'copy' ? 'content_copy' : 'drive_file_move' }}</span>
              <h3>{{ transferSubItemsMode === 'copy' ? 'Copy' : 'Move' }} {{ selectedSubItemIds.size }} Repeating Sub-Item{{ selectedSubItemIds.size > 1 ? 's' : '' }}</h3>
            </div>
            <button type="button" class="btn-close" (click)="closeBulkTransferSubItemsModal()">&times;</button>
          </div>
          <div class="modal-body">
            <p style="margin: 0; font-size: 14px; color: #334155; line-height: 1.6;">
              Select the destination layout section to {{ transferSubItemsMode }} the <strong>{{ selectedSubItemIds.size }}</strong> selected sub-item(s):
            </p>

            <div class="form-group" style="margin-top: 10px;">
              <label style="font-weight: 700; font-size: 13px; color: #0f172a; margin-bottom: 6px; display: block;">Target Destination Layout Section:</label>
              <select [(ngModel)]="targetTransferSectionId" class="filter-select" style="width: 100%; height: 42px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 0 12px; font-size: 13.5px;">
                <option value="" disabled selected>-- Select Target Section --</option>
                <option *ngFor="let s of sections" [value]="s.id">
                  {{ s.title || '(Untitled Section)' }} [Page: {{ s.webPage?.title || 'Global' }}]
                </option>
              </select>
            </div>

            <div class="warning-callout" [style.background]="transferSubItemsMode === 'copy' ? '#eff6ff' : '#fffbeb'" [style.border-color]="transferSubItemsMode === 'copy' ? '#bfdbfe' : '#fde68a'">
              <span class="material-symbols-outlined" [style.color]="transferSubItemsMode === 'copy' ? '#1d4ed8' : '#b45309'" style="font-size: 20px;">info</span>
              <div style="font-size: 12.5px;" [style.color]="transferSubItemsMode === 'copy' ? '#1e40af' : '#92400e'">
                <span *ngIf="transferSubItemsMode === 'move'">
                  <strong>Move Notice:</strong> The selected card(s) will change their parent PageSection ID and move to the target section's repeatable item list.
                </span>
                <span *ngIf="transferSubItemsMode === 'copy'">
                  <strong>Copy Notice:</strong> Duplicate copies of each card item will be generated and assigned to the destination layout section.
                </span>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" (click)="closeBulkTransferSubItemsModal()" [disabled]="transferringSubItems">
              Cancel
            </button>
            <button type="button" class="btn btn-primary" (click)="executeBulkTransferSubItems()" [disabled]="transferringSubItems || !targetTransferSectionId">
              <span class="material-symbols-outlined fs-6" *ngIf="!transferringSubItems">{{ transferSubItemsMode === 'copy' ? 'content_copy' : 'drive_file_move' }}</span>
              <span *ngIf="!transferringSubItems">Confirm {{ transferSubItemsMode === 'copy' ? 'Copy' : 'Move' }}</span>
              <span *ngIf="transferringSubItems">Processing {{ transferSubItemsMode }}...</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .cms-page-container { display: flex; flex-direction: column; gap: 20px; }

    .btn {
      display: inline-flex; align-items: center; gap: 8px; padding: 9px 16px;
      border-radius: 9px; font-size: 13px; font-weight: 600; cursor: pointer; text-decoration: none; border: none;
      transition: all 0.15s ease;
    }
    .btn-sm { padding: 6px 14px; font-size: 12.5px; border-radius: 8px; }
    .btn-primary { background: #0050e5; color: #fff; }
    .btn-primary:hover { background: #003ebd; }
    .btn-danger { background: #dc2626; color: #fff; }
    .btn-danger:hover { background: #b91c1c; }
    .btn-secondary {
      background: #475569;
      color: #ffffff;
      border: none;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn-secondary:hover {
      background: #334155;
    }
    .btn-outline { background: #fff; border: 1px solid #cbd5e1; color: #334155; }
    .btn-outline:hover { background: #f8fafc; border-color: #94a3b8; }

    .cms-nav-tabs {
      display: flex; gap: 10px; background: #fff; padding: 8px 12px;
      border-radius: 12px; border: 1px solid #e2e8f0;
    }
    .nav-tab {
      display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px;
      border-radius: 8px; font-size: 13.5px; font-weight: 700; color: #64748b;
      background: transparent; border: none; cursor: pointer; transition: all 0.2s ease;
    }
    .nav-tab.active { background: #0050e5; color: #fff; }
    .tab-badge {
      background: #f1f5f9; color: #475569; padding: 2px 8px;
      border-radius: 12px; font-size: 11px; font-weight: 800;
    }
    .nav-tab.active .tab-badge { background: rgba(255, 255, 255, 0.25); color: #fff; }

    .filter-bar {
      display: flex; justify-content: flex-end; background: #fff; padding: 12px 18px;
      border-radius: 12px; border: 1px solid #e2e8f0;
    }
    .filter-group { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .filter-select {
      padding: 8px 14px; border-radius: 8px; border: 1px solid #cbd5e1;
      font-size: 13px; background: #fff; color: #334155; outline: none; font-weight: 600;
    }
    .search-box {
      display: flex; align-items: center; gap: 8px; background: #f8fafc;
      padding: 6px 14px; border-radius: 8px; border: 1px solid #e2e8f0; width: 340px;
    }
    .search-box input { border: none; background: transparent; font-size: 13px; outline: none; width: 100%; }

    /* Bulk Action Bar */
    .bulk-action-bar {
      display: flex; justify-content: space-between; align-items: center;
      background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px;
      padding: 12px 20px; animation: slideDown 0.2s ease;
    }
    .bulk-info { display: flex; align-items: center; gap: 8px; font-size: 13.5px; color: #1e3a8a; }
    .bulk-buttons { display: flex; align-items: center; gap: 10px; }

    .cms-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; }
    .cms-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .cms-table th {
      text-align: left; padding: 12px; background: #f8fafc; color: #64748b;
      font-weight: 700; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-transform: uppercase;
    }
    .cms-table td { padding: 14px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
    .selected-row { background: #f0f7ff !important; }

    .cms-checkbox {
      width: 17px; height: 17px; accent-color: #0050e5; cursor: pointer;
      border-radius: 4px; vertical-align: middle;
    }

    .sub-text { font-size: 11px; color: #64748b; }
    .page-pill {
      display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px;
      border-radius: 6px; font-size: 12px; font-weight: 700;
      background: #eff6ff; color: #0050e5; border: 1px solid #bfdbfe;
    }
    .page-pill.global { background: #f8fafc; color: #64748b; border-color: #cbd5e1; }
    .page-pills-container { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
    .badge-linked {
      display: inline-flex; align-items: center; gap: 4px; padding: 2px 7px;
      border-radius: 6px; font-size: 11px; font-weight: 700;
      background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0;
    }
    .badge-link-count {
      display: inline-flex; align-items: center; padding: 2px 6px;
      border-radius: 6px; font-size: 11px; font-weight: 700;
      background: #e0f2fe; color: #0284c7; border: 1px solid #bae6fd;
    }
    .btn-info { background: #0284c7; color: #ffffff; border: 1px solid #0284c7; }
    .btn-info:hover { background: #0369a1; }
    .btn-preview-tag { background: #f1f5f9; color: #0f172a; padding: 2px 6px; border-radius: 4px; font-size: 11.5px; font-weight: 700; }
    .badge-none { color: #94a3b8; font-size: 12px; }

    .subitems-badge { background: #eff6ff; color: #0050e5; padding: 4px 8px; border-radius: 6px; font-weight: 700; font-size: 11px; }
    .indicator { font-size: 12px; font-weight: 700; }
    .indicator.on { color: #16a34a; }
    .indicator.off { color: #94a3b8; }
    .status-pill { padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; }
    .status-pill.published { background: #dcfce7; color: #15803d; }
    .status-pill.draft { background: #fee2e2; color: #dc2626; }

    .action-buttons { display: flex; gap: 6px; align-items: center; }
    .action-dropdown-wrapper { display: flex; align-items: center; gap: 6px; }
    .dropdown-container { position: relative; }
    .btn-dropdown-toggle {
      background: #f1f5f9; color: #475569; padding: 6px 6px; border-radius: 6px;
    }
    .btn-dropdown-toggle:hover, .dropdown-container.open .btn-dropdown-toggle {
      background: #e2e8f0; color: #0f172a;
    }
    .dropdown-menu-card {
      position: absolute; top: calc(100% + 4px); right: 0; min-width: 210px;
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
    .btn-action {
      display: inline-flex; align-items: center; gap: 4px; padding: 6px 10px;
      border-radius: 6px; font-size: 12px; font-weight: 600; text-decoration: none; cursor: pointer; border: none;
    }
    .btn-details { background: #f1f5f9; color: #334155; }
    .btn-details:hover { background: #e2e8f0; color: #0f172a; }
    .btn-edit { background: #eff6ff; color: #0050e5; }
    .btn-edit:hover { background: #0050e5; color: #fff; }
    .btn-delete { background: #fee2e2; color: #dc2626; }
    .btn-delete:hover { background: #dc2626; color: #fff; }
    .empty-cell { text-align: center; color: #64748b; padding: 32px !important; font-size: 13.5px; }

    .warning-callout {
      display: flex; gap: 12px; align-items: flex-start;
      background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px;
      padding: 14px 16px; margin-top: 12px;
    }

    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center; z-index: 2000;
    }
    .modal-card {
      background: #fff; border-radius: 16px; width: 100%; max-width: 540px;
      box-shadow: 0 25px 60px rgba(0,0,0,0.3); overflow: hidden;
    }
    .modal-card.modal-lg { max-width: 600px; }
    .modal-header {
      padding: 18px 24px; display: flex; justify-content: space-between; align-items: center;
      border-bottom: 1px solid #e2e8f0;
    }
    .modal-title-group { display: flex; align-items: center; gap: 10px; }
    .modal-title-group h3 { margin: 0; font-size: 17px; font-weight: 800; color: #0f172a; }
    .btn-close { background: none; border: none; font-size: 22px; cursor: pointer; color: #64748b; }
    .modal-body { padding: 24px; display: flex; flex-direction: column; gap: 14px; }
    .modal-footer { padding: 16px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 10px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group label { font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; }
    .form-control { padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; }
    .form-row { display: flex; gap: 12px; }
    .error-box { background: #fee2e2; color: #991b1b; padding: 10px; border-radius: 8px; font-size: 12px; font-weight: 600; }

    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class PageSectionsComponent implements OnInit {
  loading = false;
  saving = false;
  bulkDeleting = false;
  activeTab: 'sections' | 'subitems' = 'sections';
  sections: any[] = [];

  get headerButtons(): PageHeaderButton[] {
    return [
      {
        text: 'New Section',
        icon: 'add_circle',
        isPrimary: true,
        routerLink: this.filterPageId
          ? `/content/console/sections/create?webPageId=${this.filterPageId}`
          : '/content/console/sections/create'
      },
      {
        text: 'Refresh',
        icon: 'refresh',
        loading: this.loading,
        action: () => this.loadSections()
      }
    ];
  }
  allSubItems: any[] = [];
  allPages: any[] = [];
  searchTerm = '';
  filterPageId = '';

  // Bulk Selection Sets
  selectedSectionIds = new Set<string>();
  selectedSubItemIds = new Set<string>();

  // Row Action Dropdown States
  openActionDropdownId: string | null = null;
  openSubItemDropdownId: string | null = null;

  // Modals
  showBulkDeleteSectionsModal = false;
  showBulkDeleteSubItemsModal = false;

  // Bulk Transfer Properties
  showBulkTransferSectionsModal = false;
  transferSectionsMode: 'move' | 'copy' | 'link' = 'move';
  targetTransferPageId = '';
  transferringSections = false;

  showBulkTransferSubItemsModal = false;
  transferSubItemsMode: 'move' | 'copy' = 'move';
  targetTransferSectionId = '';
  transferringSubItems = false;
  errorMessage = '';
  newSection: any = {};

  constructor(
    private api: ApiService,
    private toast: ToastService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const pageId = params.get('webPageId') || params.get('pageId');
      if (pageId) {
        this.filterPageId = pageId;
      }
    });
    this.loadSections();
  }

  loadSections(): void {
    this.loading = true;
    this.api.get<any>('ContentApi/sections').subscribe({
      next: (res) => {
        this.sections = res?.data || [];
        this.loadPages();
        this.loadSubItems();
      },
      error: (err) => {
        this.loading = false;
        this.toast.error(err?.error?.message || 'Failed to load layout sections.');
      }
    });
  }

  loadPages(): void {
    this.api.get<any>('ContentApi/pages').subscribe({
      next: (res) => {
        this.loading = false;
        this.allPages = res?.data || [];
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  loadSubItems(): void {
    this.api.get<any>('ContentApi/section-lists').subscribe({
      next: (res) => {
        this.allSubItems = res?.data || [];
      },
      error: () => {}
    });
  }

  switchTab(tab: 'sections' | 'subitems'): void {
    this.activeTab = tab;
  }

  onFilterChange(): void {
    // When filter changes, clean up selection of hidden items
    // but keep current items if still in view
  }

  // ==========================================
  // SECTION SELECTION LOGIC
  // ==========================================

  get filteredSections(): any[] {
    let list = this.sections;
    if (this.filterPageId) {
      list = list.filter(s => s.webPageId === this.filterPageId);
    }
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      list = list.filter(s =>
        s.title?.toLowerCase().includes(term) ||
        s.templateKey?.toLowerCase().includes(term) ||
        s.webPage?.title?.toLowerCase().includes(term)
      );
    }
    return list;
  }

  get isAllSectionsSelected(): boolean {
    const current = this.filteredSections;
    return current.length > 0 && current.every(s => this.selectedSectionIds.has(s.id));
  }

  get isIndeterminateSections(): boolean {
    const count = this.filteredSections.filter(s => this.selectedSectionIds.has(s.id)).length;
    return count > 0 && count < this.filteredSections.length;
  }

  toggleSelectAllSections(event: any): void {
    const isChecked = event?.target?.checked;
    const current = this.filteredSections;
    if (isChecked) {
      current.forEach(s => this.selectedSectionIds.add(s.id));
    } else {
      current.forEach(s => this.selectedSectionIds.delete(s.id));
    }
  }

  toggleSectionSelection(id: string): void {
    if (this.selectedSectionIds.has(id)) {
      this.selectedSectionIds.delete(id);
    } else {
      this.selectedSectionIds.add(id);
    }
  }

  isSectionSelected(id: string): boolean {
    return this.selectedSectionIds.has(id);
  }

  clearSelectedSections(): void {
    this.selectedSectionIds.clear();
  }

  openBulkDeleteSectionsModal(): void {
    if (this.selectedSectionIds.size > 0) {
      this.showBulkDeleteSectionsModal = true;
    }
  }

  closeBulkDeleteSectionsModal(): void {
    if (this.bulkDeleting) return;
    this.showBulkDeleteSectionsModal = false;
  }

  executeBulkDeleteSections(): void {
    if (this.selectedSectionIds.size === 0) return;

    this.bulkDeleting = true;
    const ids = Array.from(this.selectedSectionIds);

    this.api.post<any>('ContentApi/sections/bulk-delete', { ids, forceCascade: true }).subscribe({
      next: (res) => {
        this.bulkDeleting = false;
        this.showBulkDeleteSectionsModal = false;
        this.selectedSectionIds.clear();
        this.toast.success(res?.message || `${ids.length} layout section(s) deleted successfully.`);
        this.loadSections();
      },
      error: (err) => {
        this.bulkDeleting = false;
        this.toast.error(err?.error?.message || 'Failed to bulk delete sections.');
      }
    });
  }

  // ==========================================
  // SUB-ITEMS SELECTION LOGIC
  // ==========================================

  get filteredSubItems(): any[] {
    let list = this.allSubItems;
    if (this.filterPageId) {
      list = list.filter(item => item.pageSection?.webPageId === this.filterPageId);
    }
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      list = list.filter(item =>
        item.title?.toLowerCase().includes(term) ||
        item.miniTitle?.toLowerCase().includes(term) ||
        item.buttonText?.toLowerCase().includes(term) ||
        item.buttonLink?.toLowerCase().includes(term) ||
        item.pageSection?.title?.toLowerCase().includes(term) ||
        item.pageSection?.webPage?.title?.toLowerCase().includes(term)
      );
    }
    return list;
  }

  get isAllSubItemsSelected(): boolean {
    const current = this.filteredSubItems;
    return current.length > 0 && current.every(i => this.selectedSubItemIds.has(i.id));
  }

  get isIndeterminateSubItems(): boolean {
    const count = this.filteredSubItems.filter(i => this.selectedSubItemIds.has(i.id)).length;
    return count > 0 && count < this.filteredSubItems.length;
  }

  toggleSelectAllSubItems(event: any): void {
    const isChecked = event?.target?.checked;
    const current = this.filteredSubItems;
    if (isChecked) {
      current.forEach(i => this.selectedSubItemIds.add(i.id));
    } else {
      current.forEach(i => this.selectedSubItemIds.delete(i.id));
    }
  }

  toggleSubItemSelection(id: string): void {
    if (this.selectedSubItemIds.has(id)) {
      this.selectedSubItemIds.delete(id);
    } else {
      this.selectedSubItemIds.add(id);
    }
  }

  isSubItemSelected(id: string): boolean {
    return this.selectedSubItemIds.has(id);
  }

  clearSelectedSubItems(): void {
    this.selectedSubItemIds.clear();
  }

  openBulkDeleteSubItemsModal(): void {
    if (this.selectedSubItemIds.size > 0) {
      this.showBulkDeleteSubItemsModal = true;
    }
  }

  closeBulkDeleteSubItemsModal(): void {
    if (this.bulkDeleting) return;
    this.showBulkDeleteSubItemsModal = false;
  }

  executeBulkDeleteSubItems(): void {
    if (this.selectedSubItemIds.size === 0) return;

    this.bulkDeleting = true;
    const ids = Array.from(this.selectedSubItemIds);

    this.api.post<any>('ContentApi/section-lists/bulk-delete', { ids }).subscribe({
      next: (res) => {
        this.bulkDeleting = false;
        this.showBulkDeleteSubItemsModal = false;
        this.selectedSubItemIds.clear();
        this.toast.success(res?.message || `${ids.length} repeating sub-item(s) deleted successfully.`);
        this.loadSections();
      },
      error: (err) => {
        this.bulkDeleting = false;
        this.toast.error(err?.error?.message || 'Failed to bulk delete sub-items.');
      }
    });
  }

  // ==========================================
  // CREATE SECTION
  // ==========================================

  // ==========================================
  // ROW ACTION DROPDOWN MENUS
  // ==========================================

  /**
   * Toggles the row action dropdown menu for a section.
   * @param secId Section GUID identifier.
   * @param event Mouse click event to stop propagation.
   */
  toggleActionDropdown(secId: string, event: MouseEvent): void {
    event.stopPropagation();
    this.openActionDropdownId = this.openActionDropdownId === secId ? null : secId;
    this.openSubItemDropdownId = null;
  }

  /**
   * Toggles the row action dropdown menu for a sub-item.
   * @param itemId Sub-item GUID identifier.
   * @param event Mouse click event to stop propagation.
   */
  toggleSubItemDropdown(itemId: string, event: MouseEvent): void {
    event.stopPropagation();
    this.openSubItemDropdownId = this.openSubItemDropdownId === itemId ? null : itemId;
    this.openActionDropdownId = null;
  }

  /**
   * Closes all open action dropdown menus.
   */
  closeActionDropdown(): void {
    this.openActionDropdownId = null;
    this.openSubItemDropdownId = null;
  }

  /**
   * Global document listener to close active dropdowns on outside click.
   */
  @HostListener('document:click')
  onDocumentClick(): void {
    this.closeActionDropdown();
  }

  /**
   * Opens the transfer modal for a single section directly from the row dropdown.
   * @param sec Target layout section entity.
   * @param mode Transfer mode: 'copy' or 'move'.
   */
  openSingleSectionTransfer(sec: any, mode: 'move' | 'copy' | 'link'): void {
    this.closeActionDropdown();
    this.selectedSectionIds.clear();
    this.selectedSectionIds.add(sec.id);
    this.transferSectionsMode = mode;
    this.targetTransferPageId = sec.webPageId || this.filterPageId || (this.allPages.length > 0 ? this.allPages[0].id : '');
    this.showBulkTransferSectionsModal = true;
  }

  /**
   * Opens the transfer modal for a single sub-item directly from the row dropdown.
   * @param item Target sub-item entity.
   * @param mode Transfer mode: 'copy' or 'move'.
   */
  openSingleSubItemTransfer(item: any, mode: 'move' | 'copy'): void {
    this.closeActionDropdown();
    this.selectedSubItemIds.clear();
    this.selectedSubItemIds.add(item.id);
    this.transferSubItemsMode = mode;
    this.targetTransferSectionId = item.pageSectionId || (this.sections.length > 0 ? this.sections[0].id : '');
    this.showBulkTransferSubItemsModal = true;
  }

  // ==========================================
  // BULK TRANSFER SECTIONS (MOVE & COPY)
  // ==========================================

  openBulkTransferSectionsModal(mode: 'move' | 'copy' | 'link'): void {
    if (this.selectedSectionIds.size === 0) return;
    this.transferSectionsMode = mode;
    this.targetTransferPageId = this.filterPageId || (this.allPages.length > 0 ? this.allPages[0].id : '');
    this.showBulkTransferSectionsModal = true;
  }

  closeBulkTransferSectionsModal(): void {
    if (this.transferringSections) return;
    this.showBulkTransferSectionsModal = false;
  }

  executeBulkTransferSections(): void {
    if (this.selectedSectionIds.size === 0 || !this.targetTransferPageId) return;

    this.transferringSections = true;
    const ids = Array.from(this.selectedSectionIds);

    this.api.post<any>('ContentApi/sections/bulk-transfer', {
      ids,
      targetPageId: this.targetTransferPageId,
      action: this.transferSectionsMode
    }).subscribe({
      next: (res) => {
        this.transferringSections = false;
        this.showBulkTransferSectionsModal = false;
        this.selectedSectionIds.clear();
        this.toast.success(res?.message || `${ids.length} section(s) transferred successfully.`);
        this.loadSections();
      },
      error: (err) => {
        this.transferringSections = false;
        this.toast.error(err?.error?.message || `Failed to ${this.transferSectionsMode} sections.`);
      }
    });
  }

  // ==========================================
  // BULK TRANSFER SUB-ITEMS (MOVE & COPY)
  // ==========================================

  openBulkTransferSubItemsModal(mode: 'move' | 'copy'): void {
    if (this.selectedSubItemIds.size === 0) return;
    this.transferSubItemsMode = mode;
    this.targetTransferSectionId = this.sections.length > 0 ? this.sections[0].id : '';
    this.showBulkTransferSubItemsModal = true;
  }

  closeBulkTransferSubItemsModal(): void {
    if (this.transferringSubItems) return;
    this.showBulkTransferSubItemsModal = false;
  }

  executeBulkTransferSubItems(): void {
    if (this.selectedSubItemIds.size === 0 || !this.targetTransferSectionId) return;

    this.transferringSubItems = true;
    const ids = Array.from(this.selectedSubItemIds);

    this.api.post<any>('ContentApi/section-lists/bulk-transfer', {
      ids,
      targetSectionId: this.targetTransferSectionId,
      action: this.transferSubItemsMode
    }).subscribe({
      next: (res) => {
        this.transferringSubItems = false;
        this.showBulkTransferSubItemsModal = false;
        this.selectedSubItemIds.clear();
        this.toast.success(res?.message || `${ids.length} sub-item(s) transferred successfully.`);
        this.loadSections();
      },
      error: (err) => {
        this.transferringSubItems = false;
        this.toast.error(err?.error?.message || `Failed to ${this.transferSubItemsMode} sub-items.`);
      }
    });
  }

  getSectionDeleteReturnUrl(sec: any): string {
    const pageId = this.filterPageId || sec.webPageId;
    return pageId ? `/content/console/sections?webPageId=${pageId}` : '/content/console/sections';
  }

  getSubItemDeleteReturnUrl(item: any): string {
    const pageId = this.filterPageId || item.pageSection?.webPageId;
    return pageId ? `/content/console/sections?webPageId=${pageId}` : '/content/console/sections';
  }
}
