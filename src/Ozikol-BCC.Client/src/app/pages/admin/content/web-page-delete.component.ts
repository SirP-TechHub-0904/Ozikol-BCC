import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';

/**
 * Web Page Deletion Confirmation Component.
 * Supports standard deletion when no sections exist, as well as an explicit Forceful Cascade Purge mode
 * with an interactive checklist allowing administrators to select and cascade-delete all attached sections and sub-items.
 */
@Component({
  selector: 'app-web-page-delete',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="delete-page-container">
      <!-- Breadcrumb & Top Bar -->
      <div class="page-header-bar">
        <div class="header-titles">
          <div class="breadcrumb">
            <a routerLink="/content/console">CMS Studio</a>
            <span class="sep">/</span>
            <a routerLink="/content/console/pages">Web Pages</a>
            <span class="sep">/</span>
            <span class="current danger-text">Delete Web Page</span>
          </div>
          <h1 class="page-title danger-title">
            <span class="material-symbols-outlined danger-icon">warning</span>
            Confirm Web Page Deletion
          </h1>
          <p class="page-sub">Review public routing and layout consequences before permanently destroying this page.</p>
        </div>

        <div class="header-actions">
          <a routerLink="/content/console/pages" class="btn btn-secondary">
            <span class="material-symbols-outlined">arrow_back</span>
            <span>Cancel &amp; Go Back</span>
          </a>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="state-card loading">
        <span class="material-symbols-outlined spin">progress_activity</span>
        <p>Loading page record...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="errorMsg && !loading" class="alert-banner error">
        <span class="material-symbols-outlined">error</span>
        <span>{{ errorMsg }}</span>
      </div>

      <!-- Main Deletion Danger Zone -->
      <div class="delete-layout" *ngIf="!loading && page">
        <!-- Target Record Summary Card -->
        <div class="record-summary-card">
          <div class="summary-head">
            <span class="material-symbols-outlined">web</span>
            <h3>Web Page to be Deleted</h3>
          </div>

          <div class="record-body">
            <div class="page-icon-box">
              <span class="material-symbols-outlined">article</span>
            </div>

            <div class="record-details">
              <h2 class="record-title">{{ page.title }}</h2>
              <p class="record-sub">
                Route: <code>/{{ page.directUrl || page.slug || '' }}</code> &bull; {{ page.metaDescription || page.description || 'No description provided.' }}
              </p>

              <div class="meta-row">
                <span class="meta-pill" [ngClass]="page.publish ? 'published' : 'draft'">
                  {{ page.publish ? 'Published Live' : 'Draft / Offline' }}
                </span>
                <span class="meta-pill count-pill" [class.danger]="sectionsCount > 0" [class.success]="sectionsCount === 0">
                  {{ sectionsCount }} Section{{ sectionsCount === 1 ? '' : 's' }} Attached
                </span>
                <span class="meta-date" *ngIf="page.createdAtUtc || page.date">
                  Created: {{ (page.createdAtUtc || page.date) | date:'mediumDate' }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Attached Sections & Forceful Cascade Checklist Card -->
        <div class="sections-block-card" *ngIf="sectionsCount > 0">
          <div class="block-head">
            <span class="material-symbols-outlined force-icon">delete_sweep</span>
            <div class="block-head-text">
              <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
                <h3>Cascade Deletion: {{ sectionsCount }} Attached Section{{ sectionsCount === 1 ? '' : 's' }} &bull; {{ totalSubItemsCount }} Repeating Sub-Item(s)</h3>
                <span class="badge-cascade">Cascade Purge Available</span>
              </div>
              <p class="block-sub">
                This page contains attached layout sections and repeating cards. Instead of deleting them one by one in CMS Studio, you can check <strong>Select All</strong> below to permanently delete the web page and all its nested sections and cards in one action.
              </p>
            </div>
          </div>

          <!-- Select All Master Checklist Bar -->
          <div class="select-all-bar">
            <label class="custom-check-label select-all-label">
              <input
                type="checkbox"
                [checked]="isAllSelected()"
                (change)="toggleSelectAll()"
                class="custom-check"
              />
              <span class="check-title">
                <strong>Check All: Cascade Delete all {{ sectionsCount }} section(s) and {{ totalSubItemsCount }} sub-item(s) with this page</strong>
              </span>
            </label>
            <span class="selected-counter" [class.ready]="isAllSelected()">
              {{ selectedSectionIds.size }} of {{ sectionsCount }} sections selected
            </span>
          </div>

          <!-- Hierarchical Sections & Sub-Items Checklist Table -->
          <div class="sections-checklist">
            <div *ngFor="let sec of attachedSections" class="section-check-card" [class.selected]="selectedSectionIds.has(sec.id)">
              <div class="sec-card-header">
                <label class="custom-check-label sec-check-label">
                  <input
                    type="checkbox"
                    [checked]="selectedSectionIds.has(sec.id)"
                    (change)="toggleSection(sec)"
                    class="custom-check"
                  />
                  <span class="sec-meta">
                    <span class="sec-order">#{{ sec.pageSortOrder || 1 }}</span>
                    <strong class="sec-title">{{ sec.title || '(Untitled Section)' }}</strong>
                    <span class="sec-badge">{{ sec.templateKey || 'Standard Block' }}</span>
                    <span class="sec-subitems-count" *ngIf="sec.pageSectionLists?.length">
                      {{ sec.pageSectionLists.length }} Sub-Item(s)
                    </span>
                  </span>
                </label>
                <div class="sec-actions">
                  <a
                    [routerLink]="['/content/console/sections/delete', sec.id]"
                    [queryParams]="{ returnUrl: '/content/console/pages/delete/' + pageId, webPageId: pageId }"
                    class="btn-delete-sec-sm"
                    title="Delete only this section"
                  >
                    <span class="material-symbols-outlined">delete</span>
                    <span>Delete Individually</span>
                  </a>
                </div>
              </div>

              <!-- Nested Repeating Sub-Items / Cards List -->
              <div class="subitems-tree" *ngIf="sec.pageSectionLists && sec.pageSectionLists.length > 0">
                <div class="tree-label">
                  <span class="material-symbols-outlined">subdirectory_arrow_right</span>
                  <span>Attached Sub-Item Cards ({{ sec.pageSectionLists.length }}):</span>
                </div>
                <div class="subitems-chips">
                  <div *ngFor="let item of sec.pageSectionLists" class="subitem-chip">
                    <span class="material-symbols-outlined item-bullet">check</span>
                    <strong class="subitem-title">{{ item.title || '(Untitled Item)' }}</strong>
                    <span class="subitem-mini" *ngIf="item.miniTitle">({{ item.miniTitle }})</span>
                    <span class="subitem-order">#{{ item.sortOrder || 0 }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Cascade Authorization Confirmation Checkbox -->
          <div class="force-confirm-box">
            <label class="custom-check-label force-auth-label">
              <input
                type="checkbox"
                [(ngModel)]="forceDeleteConfirmed"
                class="custom-check"
              />
              <span class="auth-text">
                <strong>I authorize Cascade Deletion to permanently eradicate all {{ sectionsCount }} attached sections and {{ totalSubItemsCount }} child sub-item cards without recovery.</strong>
              </span>
            </label>
          </div>

          <div class="block-action-bar">
            <a
              routerLink="/content/console/sections"
              [queryParams]="{ webPageId: pageId }"
              class="btn btn-warning-action"
            >
              <span class="material-symbols-outlined">layers</span>
              <span>Manage Sections in Table View</span>
            </a>
          </div>
        </div>

        <!-- Consequences Warning Box -->
        <div class="consequences-card">
          <div class="consequences-head">
            <span class="material-symbols-outlined">dangerous</span>
            <h3>Consequences of Deleting this Web Page</h3>
          </div>

          <ul class="consequences-list">
            <li>
              <strong>Immediate 404 Route Failure:</strong> The public URL <code>/{{ page.directUrl || page.slug || '' }}</code> will immediately return a 404 Not Found response to all visitors and search engines.
            </li>
            <li *ngIf="sectionsCount > 0 && !isAllSelected()">
              <strong>Attached Sections Protection:</strong> This web page contains {{ sectionsCount }} layout section(s). Check "Select All" in the Cascade Deletion card above to unlock page deletion.
            </li>
            <li *ngIf="sectionsCount > 0 && isAllSelected()">
              <strong>Cascade Purge Notice:</strong> All {{ sectionsCount }} layout section(s) and {{ totalSubItemsCount }} child sub-item(s) selected above will be permanently eradicated alongside this web page.
            </li>
            <li *ngIf="sectionsCount === 0">
              <strong>Section Independence:</strong> There are no attached sections blocking this deletion.
            </li>
            <li>
              <strong>Menu Navigation Unlinking:</strong> If this page is linked in the main header navbar or footer sitemap, it will become a broken link.
            </li>
            <li>
              <strong>Permanent Record Eradication:</strong> This web page and its layout structure cannot be recovered after deletion.
            </li>
          </ul>
        </div>

        <!-- Exact Page Title Confirmation & Action -->
        <div class="confirmation-card">
          <div class="confirm-instruction">
            <p>
              To confirm that you understand these consequences and intend to permanently destroy this web page, please type the exact page title:
            </p>
            <div class="target-title-pill" (click)="copyTitle()" title="Click to copy title into input">
              <code>{{ page.title }}</code>
            </div>
          </div>

          <div class="confirm-input-group">
            <label>TYPE PAGE TITLE TO CONFIRM DELETION:</label>
            <input
              type="text"
              [(ngModel)]="confirmationInput"
              placeholder="Type the exact page title here..."
              class="confirm-input"
              [class.matched]="isTitleMatched()"
            />

            <!-- Real-time Status and Explicit Unlock Reason -->
            <div class="match-status" *ngIf="confirmationInput">
              <span *ngIf="canProceedWithDeletion()" class="status-match">
                <span class="material-symbols-outlined">check_circle</span>
                Page title matched &amp; cascade deletion authorized. Deletion unlocked!
              </span>
              <span *ngIf="isTitleMatched() && sectionsCount > 0 && (!isAllSelected() || !forceDeleteConfirmed)" class="status-warning">
                <span class="material-symbols-outlined">shield</span>
                Page title matched, but deletion is locked by {{ sectionsCount }} attached section(s). Check the Cascade Deletion box above to unlock.
              </span>
              <span *ngIf="!isTitleMatched()" class="status-mismatch">
                <span class="material-symbols-outlined">cancel</span> Page title does not match yet.
              </span>
            </div>
          </div>

          <!-- Explicit Explanation Banner when Delete Button is Disabled -->
          <div class="lock-reason-banner" *ngIf="sectionsCount > 0 && (!isAllSelected() || !forceDeleteConfirmed)">
            <div class="lock-icon">
              <span class="material-symbols-outlined">lock</span>
            </div>
            <div class="lock-text">
              <h4>Why is the Delete button disabled?</h4>
              <p>
                This web page contains <strong>{{ sectionsCount }} attached layout section(s)</strong> and <strong>{{ totalSubItemsCount }} repeating sub-item card(s)</strong>.
                To prevent accidental loss of page content, deletion is locked until you authorize <strong>Cascade Deletion</strong>.
              </p>
              <button type="button" class="btn btn-sm btn-authorize" (click)="authorizeAllCascade()">
                <span class="material-symbols-outlined fs-6">done_all</span>
                <span>Click Here to Select All Sections &amp; Unlock Deletion</span>
              </button>
            </div>
          </div>

          <div class="delete-action-row">
            <a routerLink="/content/console/pages" class="btn btn-secondary">
              <span>Cancel</span>
            </a>
            <button
              type="button"
              class="btn btn-danger"
              (click)="executeDelete()"
              [disabled]="!canProceedWithDeletion()"
              [title]="!canProceedWithDeletion() ? 'Please match the page title and authorize cascade deletion to enable this button.' : ''"
            >
              <span class="material-symbols-outlined">{{ deleting ? 'hourglass_top' : (sectionsCount > 0 ? 'delete_sweep' : 'delete_forever') }}</span>
              <span>
                {{
                  deleting
                    ? 'Purging Web Page & Sections...'
                    : sectionsCount > 0
                    ? 'Force Delete Web Page & ' + sectionsCount + ' Section(s)'
                    : 'I understand the consequences, delete this web page'
                }}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .delete-page-container {
      display: flex;
      flex-direction: column;
      gap: 24px;
      padding-bottom: 40px;
    }

    .page-header-bar {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      background: #ffffff;
      padding: 24px 28px;
      border-radius: 16px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }
    .header-titles .breadcrumb {
      font-size: 13px;
      color: #64748b;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .header-titles .breadcrumb a {
      color: #0050e5;
      text-decoration: none;
      font-weight: 600;
    }
    .danger-text { color: #dc2626 !important; font-weight: 700; }
    .page-title {
      font-size: 24px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 4px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .danger-title { color: #b91c1c; }
    .danger-icon { color: #dc2626; font-size: 28px; }
    .page-sub { color: #64748b; font-size: 13.5px; margin: 0; }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 13.5px;
      font-weight: 700;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.2s;
      border: none;
    }
    .btn-secondary {
      background: #f1f5f9;
      color: #334155;
      border: 1px solid #cbd5e1;
    }
    .btn-secondary:hover { background: #e2e8f0; color: #0f172a; }
    .btn-danger {
      background: #dc2626;
      color: #ffffff;
      box-shadow: 0 2px 6px rgba(220, 38, 38, 0.25);
    }
    .btn-danger:hover:not(:disabled) {
      background: #b91c1c;
      box-shadow: 0 4px 12px rgba(185, 28, 28, 0.35);
    }
    .btn-danger:disabled {
      background: #fca5a5;
      opacity: 0.65;
      cursor: not-allowed;
      box-shadow: none;
    }

    .btn-sm { padding: 6px 14px; font-size: 12.5px; border-radius: 6px; }
    .btn-authorize {
      background: #0050e5;
      color: #fff;
      margin-top: 10px;
    }
    .btn-authorize:hover { background: #003ebd; }

    .state-card {
      background: #ffffff;
      border-radius: 16px;
      padding: 60px 20px;
      text-align: center;
      border: 1px solid #e2e8f0;
      color: #64748b;
    }
    .spin { animation: spin 1s linear infinite; font-size: 32px; color: #0050e5; }
    @keyframes spin { 100% { transform: rotate(360deg); } }

    .alert-banner.error {
      background: #fee2e2;
      border: 1px solid #fca5a5;
      color: #991b1b;
      padding: 14px 20px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 600;
    }

    .delete-layout {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .record-summary-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 24px 28px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }
    .summary-head {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #0050e5;
      margin-bottom: 16px;
    }
    .summary-head h3 { font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; margin: 0; }
    .record-body { display: flex; align-items: flex-start; gap: 18px; }
    .page-icon-box {
      width: 52px;
      height: 52px;
      border-radius: 12px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #0050e5;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .page-icon-box span { font-size: 28px; }
    .record-title { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 6px; }
    .record-sub { font-size: 13.5px; color: #64748b; margin: 0 0 12px; }
    .meta-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .meta-pill {
      font-size: 12px;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .meta-pill.published { background: #dcfce7; color: #15803d; }
    .meta-pill.draft { background: #f1f5f9; color: #64748b; }
    .count-pill.danger { background: #fee2e2; color: #dc2626; border: 1px solid #fecaca; }
    .count-pill.success { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
    .meta-date { font-size: 12px; color: #94a3b8; }

    /* Sections & Forceful Cascade Card */
    .sections-block-card {
      background: #fffbeb;
      border: 2px solid #fde68a;
      border-radius: 16px;
      padding: 22px 26px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      box-shadow: 0 4px 14px rgba(217, 119, 6, 0.08);
    }
    .block-head {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }
    .force-icon { font-size: 28px; color: #d97706; flex-shrink: 0; margin-top: 2px; }
    .block-head-text { flex: 1; }
    .block-head-text h3 { font-size: 16px; font-weight: 800; color: #92400e; margin: 0 0 4px; }
    .badge-cascade {
      background: #f59e0b;
      color: #ffffff;
      font-size: 11px;
      font-weight: 800;
      padding: 3px 8px;
      border-radius: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .block-sub { font-size: 13px; color: #b45309; margin: 0; line-height: 1.5; }

    /* Select All Bar */
    .select-all-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #ffffff;
      border: 1.5px solid #fcd34d;
      border-radius: 10px;
      padding: 12px 16px;
    }
    .custom-check-label {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      user-select: none;
    }
    .custom-check {
      width: 18px;
      height: 18px;
      accent-color: #0050e5;
      cursor: pointer;
    }
    .check-title { font-size: 13.5px; color: #0f172a; }
    .selected-counter {
      font-size: 12px;
      font-weight: 700;
      color: #92400e;
      background: #fef3c7;
      padding: 3px 10px;
      border-radius: 6px;
    }
    .selected-counter.ready {
      background: #dcfce7;
      color: #15803d;
    }

    /* Sections Checklist */
    .sections-checklist {
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-height: 380px;
      overflow-y: auto;
      padding-right: 4px;
    }
    .section-check-card {
      background: #ffffff;
      border: 1.5px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px 16px;
      transition: all 0.15s ease;
    }
    .section-check-card.selected {
      border-color: #0050e5;
      background: #f0f7ff;
    }
    .sec-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }
    .sec-check-label { flex: 1; margin: 0; }
    .sec-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      font-size: 13px;
    }
    .sec-order {
      background: #f1f5f9;
      color: #475569;
      font-size: 11px;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .sec-title { color: #0f172a; font-size: 13.5px; }
    .sec-badge {
      background: #e0f2fe;
      color: #0284c7;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .sec-subitems-count {
      background: #eff6ff;
      color: #0050e5;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 4px;
      border: 1px solid #bfdbfe;
    }
    .btn-delete-sec-sm {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: #dc2626;
      font-size: 11.5px;
      font-weight: 700;
      text-decoration: none;
      padding: 3px 8px;
      border: 1px solid #fecaca;
      border-radius: 6px;
      background: #ffffff;
    }
    .btn-delete-sec-sm:hover { background: #fee2e2; }
    .btn-delete-sec-sm span.material-symbols-outlined { font-size: 14px; }

    /* Nested Repeating Sub-Items */
    .subitems-tree {
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px dashed #cbd5e1;
      padding-left: 28px;
    }
    .tree-label {
      font-size: 11.5px;
      font-weight: 700;
      color: #64748b;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .tree-label span { font-size: 15px; color: #94a3b8; }
    .subitems-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .subitem-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11.5px;
      color: #334155;
    }
    .item-bullet { font-size: 13px; color: #16a34a; }
    .subitem-mini { color: #64748b; font-size: 11px; }
    .subitem-order { color: #94a3b8; font-size: 10.5px; font-weight: 700; }

    /* Force Confirm Box */
    .force-confirm-box {
      background: #fef2f2;
      border: 1.5px solid #fca5a5;
      border-radius: 10px;
      padding: 12px 16px;
    }
    .force-auth-label {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      margin: 0;
    }
    .auth-text { font-size: 12.5px; color: #991b1b; }

    .block-action-bar { display: flex; justify-content: flex-end; }
    .btn-warning-action {
      background: #fef3c7;
      color: #92400e;
      border: 1px solid #fde68a;
    }
    .btn-warning-action:hover { background: #fde68a; }

    .consequences-card {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 16px;
      padding: 22px 26px;
    }
    .consequences-head {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
    }
    .consequences-head h3 { font-size: 15px; font-weight: 800; color: #991b1b; margin: 0; }
    .consequences-head span { font-size: 22px; color: #dc2626; }

    .consequences-list {
      margin: 0;
      padding-left: 20px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      font-size: 13px;
      color: #7f1d1d;
      line-height: 1.5;
    }

    .confirmation-card {
      background: #ffffff;
      border: 2px solid #ef4444;
      border-radius: 16px;
      padding: 24px 28px;
      box-shadow: 0 4px 16px rgba(239, 68, 68, 0.08);
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .confirm-instruction p {
      font-size: 13.5px;
      color: #0f172a;
      margin: 0 0 8px;
      font-weight: 600;
    }
    .target-title-pill {
      display: inline-block;
      background: #fee2e2;
      border: 1px dashed #f87171;
      padding: 6px 14px;
      border-radius: 8px;
      cursor: pointer;
    }
    .target-title-pill code { font-size: 14px; font-weight: 800; color: #991b1b; }

    .confirm-input-group { display: flex; flex-direction: column; gap: 6px; }
    .confirm-input-group label {
      font-size: 12px;
      font-weight: 800;
      color: #334155;
      letter-spacing: 0.5px;
    }
    .confirm-input {
      padding: 12px 16px;
      border: 2px solid #cbd5e1;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      outline: none;
      transition: all 0.2s;
      background: #f8fafc;
    }
    .confirm-input:focus {
      border-color: #ef4444;
      background: #ffffff;
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.12);
    }
    .confirm-input.matched {
      border-color: #22c55e;
      background: #f0fdf4;
    }

    .match-status { font-size: 12px; font-weight: 700; margin-top: 4px; }
    .status-match { color: #16a34a; display: flex; align-items: center; gap: 4px; }
    .status-warning { color: #d97706; display: flex; align-items: center; gap: 4px; }
    .status-mismatch { color: #dc2626; display: flex; align-items: center; gap: 4px; }
    .status-match span, .status-warning span, .status-mismatch span { font-size: 16px; }

    /* Lock Reason Banner */
    .lock-reason-banner {
      display: flex;
      gap: 14px;
      align-items: flex-start;
      background: #fffbeb;
      border: 1.5px solid #fde68a;
      border-radius: 12px;
      padding: 16px 18px;
      margin-top: 4px;
    }
    .lock-icon {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: #fef3c7;
      border: 1px solid #fde68a;
      color: #d97706;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .lock-text { flex: 1; }
    .lock-text h4 { margin: 0 0 4px; font-size: 14px; font-weight: 800; color: #92400e; }
    .lock-text p { margin: 0; font-size: 13px; color: #b45309; line-height: 1.5; }

    .delete-action-row {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 12px;
      border-top: 1px solid #f1f5f9;
      padding-top: 16px;
      margin-top: 4px;
    }
  `]
})
export class WebPageDeleteComponent implements OnInit {
  pageId: string | null = null;
  page: any = null;
  attachedSections: any[] = [];
  sectionsCount: number = 0;
  loading = false;
  deleting = false;
  confirmationInput = '';
  errorMsg = '';

  // Forceful Cascade Checklist State
  selectedSectionIds = new Set<string>();
  forceDeleteConfirmed = false;

  constructor(
    private api: ApiService,
    private toast: ToastService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.pageId = id;
        this.loadPage(id);
      }
    });
  }

  loadPage(id: string): void {
    this.loading = true;
    this.api.get<any>(`ContentApi/pages/${id}`).subscribe({
      next: (res) => {
        this.loading = false;
        if (res?.data) {
          this.page = res.data;

          // Populate attachedSections immediately from pageSections if present
          if (Array.isArray(this.page.pageSections) && this.page.pageSections.length > 0) {
            this.attachedSections = [...this.page.pageSections];
            this.sectionsCount = this.attachedSections.length;
          } else {
            this.sectionsCount = this.page.sectionCount ?? (this.page.pageSections?.length ?? 0);
          }

          // Fetch fresh sections list to guarantee full nested sub-items are synchronized
          this.loadAttachedSections(id);
        } else {
          this.errorMsg = 'Web page record not found.';
        }
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = err?.error?.message || 'Failed to load web page.';
      }
    });
  }

  loadAttachedSections(id: string): void {
    this.api.get<any>(`ContentApi/sections?webPageId=${id}`).subscribe({
      next: (res) => {
        if (Array.isArray(res?.data) && res.data.length > 0) {
          this.attachedSections = res.data;
          this.sectionsCount = this.attachedSections.length;
        }
      },
      error: () => {}
    });
  }

  get totalSubItemsCount(): number {
    return this.attachedSections.reduce((acc, s) => acc + (s.pageSectionLists?.length || 0), 0);
  }

  isAllSelected(): boolean {
    if (this.attachedSections.length === 0) return true;
    return this.attachedSections.every(s => this.selectedSectionIds.has(s.id));
  }

  toggleSelectAll(): void {
    if (this.isAllSelected()) {
      this.selectedSectionIds.clear();
      this.forceDeleteConfirmed = false;
    } else {
      this.attachedSections.forEach(s => this.selectedSectionIds.add(s.id));
      this.forceDeleteConfirmed = true;
    }
  }

  authorizeAllCascade(): void {
    this.attachedSections.forEach(s => this.selectedSectionIds.add(s.id));
    this.forceDeleteConfirmed = true;
    this.toast.info(`Authorized cascade purge for all ${this.sectionsCount} section(s).`);
  }

  toggleSection(sec: any): void {
    if (this.selectedSectionIds.has(sec.id)) {
      this.selectedSectionIds.delete(sec.id);
    } else {
      this.selectedSectionIds.add(sec.id);
    }
    if (!this.isAllSelected()) {
      this.forceDeleteConfirmed = false;
    }
  }

  isTitleMatched(): boolean {
    if (!this.page?.title || !this.confirmationInput) return false;
    return this.confirmationInput.trim().toLowerCase() === this.page.title.trim().toLowerCase();
  }

  canProceedWithDeletion(): boolean {
    if (!this.isTitleMatched() || this.deleting) return false;
    if (this.sectionsCount === 0) return true;
    return this.isAllSelected() && this.forceDeleteConfirmed;
  }

  copyTitle(): void {
    if (this.page?.title) {
      navigator.clipboard?.writeText(this.page.title);
      this.confirmationInput = this.page.title;
    }
  }

  executeDelete(): void {
    if (!this.canProceedWithDeletion() || !this.pageId) return;

    this.deleting = true;
    this.errorMsg = '';

    const forceCascade = this.sectionsCount > 0;
    const endpoint = forceCascade
      ? `ContentApi/pages/${this.pageId}?forceCascade=true`
      : `ContentApi/pages/${this.pageId}`;

    this.api.delete<any>(endpoint).subscribe({
      next: () => {
        this.deleting = false;
        this.toast.success(
          forceCascade
            ? `Web page '${this.page.title}' and all ${this.sectionsCount} attached sections purged successfully.`
            : `Web page '${this.page.title}' deleted successfully.`
        );
        this.router.navigate(['/content/console/pages']);
      },
      error: (err) => {
        this.deleting = false;
        this.errorMsg = err?.error?.message || 'Failed to delete web page.';
      }
    });
  }
}
