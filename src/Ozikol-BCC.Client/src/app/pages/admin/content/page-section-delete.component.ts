import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';

/**
 * Component providing verified deletion confirmation for CMS page layout sections,
 * equipped with an interactive checklist allowing administrators to select and cascade-delete
 * all attached repeating sub-items and cards.
 */
@Component({
  selector: 'app-page-section-delete',
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
            <a (click)="cancel()" style="cursor: pointer;">Page Sections</a>
            <span class="sep">/</span>
            <span class="current danger-text">Delete Section</span>
          </div>
          <h1 class="page-title danger-title">
            <span class="material-symbols-outlined danger-icon">warning</span>
            Confirm Page Section Deletion
          </h1>
          <p class="page-sub">Review layout cascade consequences and verify identity before permanently destroying this section.</p>
        </div>

        <div class="header-actions">
          <button type="button" (click)="cancel()" class="btn btn-secondary">
            <span class="material-symbols-outlined">arrow_back</span>
            <span>Cancel & Go Back</span>
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="state-card loading">
        <span class="material-symbols-outlined spin">progress_activity</span>
        <p>Loading page section...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="errorMsg && !loading" class="alert-banner error">
        <span class="material-symbols-outlined">error</span>
        <span>{{ errorMsg }}</span>
      </div>

      <!-- Main Deletion Danger Zone -->
      <div class="delete-layout" *ngIf="!loading && section">
        <!-- Target Record Summary Card -->
        <div class="record-summary-card">
          <div class="summary-head">
            <span class="material-symbols-outlined">layers</span>
            <h3>Layout Section to be Deleted</h3>
          </div>

          <div class="record-body">
            <div class="sec-icon-box">
              <span class="material-symbols-outlined">dashboard_customize</span>
            </div>

            <div class="record-details">
              <h2 class="record-title">{{ section.title }}</h2>
              <p class="record-sub">{{ section.subTitle || 'No subheadline specified.' }} &bull; Layout Type: <strong>{{ section.layoutType || 'Standard' }}</strong></p>

              <div class="meta-row">
                <span class="meta-pill" [ngClass]="section.publish ? 'published' : 'draft'">
                  {{ section.publish ? 'Published on Page' : 'Draft / Offline' }}
                </span>
                <span class="meta-pill count-pill" *ngIf="section.webPage">
                  Attached to Page: {{ section.webPage.title }}
                </span>
                <span class="meta-pill count-pill" [class.danger]="subItemsCount > 0">
                  {{ subItemsCount }} Sub-Items / Cards Attached
                </span>
                <span class="meta-date">Sort Order: {{ section.sortOrder || 0 }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Attached Sub-Items & Forceful Cascade Checklist Card -->
        <div class="subitems-block-card" *ngIf="subItemsCount > 0">
          <div class="block-head">
            <span class="material-symbols-outlined force-icon">delete_sweep</span>
            <div class="block-head-text">
              <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
                <h3>Forceful Cascade Purge: {{ subItemsCount }} Repeating Sub-Item(s)</h3>
                <span class="badge-cascade">Cascade Purge Available</span>
              </div>
              <p class="block-sub">
                This section contains repeating sub-items (cards, pillars, or features). You can remove them one by one, or select all items below to authorize a forceful cascade purge of this section and everything inside it.
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
                <strong>Select All ({{ subItemsCount }} Sub-Items &amp; Cards) for Cascade Deletion</strong>
              </span>
            </label>
            <span class="selected-counter" [class.ready]="isAllSelected()">
              {{ selectedSubItemIds.size }} of {{ subItemsCount }} sub-items selected
            </span>
          </div>

          <!-- Sub-Items Checklist Table -->
          <div class="subitems-checklist">
            <div *ngFor="let item of attachedSubItems" class="subitem-check-card" [class.selected]="selectedSubItemIds.has(item.id)">
              <div class="item-card-header">
                <label class="custom-check-label item-check-label">
                  <input
                    type="checkbox"
                    [checked]="selectedSubItemIds.has(item.id)"
                    (change)="toggleSubItem(item)"
                    class="custom-check"
                  />
                  <span class="item-meta">
                    <span class="item-order">#{{ item.sortOrder || 0 }}</span>
                    <strong class="item-title">{{ item.title || '(Untitled Sub-Item)' }}</strong>
                    <span class="item-mini" *ngIf="item.miniTitle">[{{ item.miniTitle }}]</span>
                    <span class="item-desc" *ngIf="item.description">{{ item.description | slice:0:65 }}...</span>
                  </span>
                </label>
                <div class="item-actions">
                  <a
                    [routerLink]="['/content/console/sections/lists/delete', item.id]"
                    [queryParams]="{ returnUrl: '/content/console/sections/delete/' + sectionId, webPageId: section?.webPageId || pageIdFromQuery }"
                    class="btn-delete-item-sm"
                    title="Delete only this sub-item"
                  >
                    <span class="material-symbols-outlined">delete</span>
                    <span>Delete Individually</span>
                  </a>
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
                <strong>I understand that Force Delete will permanently destroy all {{ subItemsCount }} attached repeating sub-item cards without recovery.</strong>
              </span>
            </label>
          </div>

          <div class="block-action-bar">
            <a
              [routerLink]="['/content/console/sections/details', sectionId]"
              class="btn btn-warning-action"
            >
              <span class="material-symbols-outlined">list</span>
              <span>Manage Sub-Items in Details View</span>
            </a>
          </div>
        </div>

        <!-- Consequences Warning Box -->
        <div class="consequences-card">
          <div class="consequences-head">
            <span class="material-symbols-outlined">dangerous</span>
            <h3>Consequences of Deleting this Page Section</h3>
          </div>

          <ul class="consequences-list">
            <li>
              <strong>Page Layout Removal:</strong> This section block, media, and copy will immediately disappear from its parent web page.
            </li>
            <li *ngIf="subItemsCount > 0 && !isAllSelected()">
              <strong>Attached Sub-Items Protection:</strong> This section contains {{ subItemsCount }} repeating sub-item(s). Select all items above and authorize Force Delete to proceed with cascade destruction.
            </li>
            <li *ngIf="subItemsCount > 0 && isAllSelected()">
              <strong>Cascade Purge Notice:</strong> All {{ subItemsCount }} child sub-item card(s) selected above will be permanently eradicated alongside this layout section.
            </li>
            <li *ngIf="subItemsCount === 0">
              <strong>Sub-Item Independence:</strong> There are no repeating sub-items blocking this deletion.
            </li>
            <li>
              <strong>Permanent Record Eradication:</strong> This layout section cannot be recovered after deletion.
            </li>
          </ul>
        </div>

        <!-- Exact Title Confirmation & Action -->
        <div class="confirmation-card">
          <div class="confirm-instruction">
            <p>
              To confirm that you understand these consequences and intend to permanently destroy this page section, please type the exact section title:
            </p>
            <div class="target-title-pill" (click)="copyTitle()" title="Click to copy">
              <code>{{ section.title }}</code>
            </div>
          </div>

          <div class="confirm-input-group">
            <label>TYPE SECTION TITLE TO CONFIRM DELETION:</label>
            <input
              type="text"
              [(ngModel)]="confirmationInput"
              placeholder="Type the exact section title here..."
              class="confirm-input"
              [class.matched]="isTitleMatched()"
            />

            <div class="match-status" *ngIf="confirmationInput">
              <span *ngIf="canProceedWithDeletion()" class="status-match">
                <span class="material-symbols-outlined">check_circle</span> Section title matched &amp; deletion authorized. Ready to proceed.
              </span>
              <span *ngIf="isTitleMatched() && subItemsCount > 0 && !isAllSelected()" class="status-warning">
                <span class="material-symbols-outlined">shield</span> Section title matched, but please select all {{ subItemsCount }} sub-item(s) in the checklist above.
              </span>
              <span *ngIf="isTitleMatched() && subItemsCount > 0 && isAllSelected() && !forceDeleteConfirmed" class="status-warning">
                <span class="material-symbols-outlined">shield</span> Please check the cascade authorization box above to unlock Force Delete.
              </span>
              <span *ngIf="!isTitleMatched()" class="status-mismatch">
                <span class="material-symbols-outlined">cancel</span> Section title does not match yet.
              </span>
            </div>
          </div>

          <!-- Explicit Explanation Banner when Delete Button is Disabled -->
          <div class="lock-reason-banner" *ngIf="subItemsCount > 0 && (!isAllSelected() || !forceDeleteConfirmed)">
            <div class="lock-icon">
              <span class="material-symbols-outlined">lock</span>
            </div>
            <div class="lock-text">
              <h4>Why is the Delete button disabled?</h4>
              <p>
                This layout section contains <strong>{{ subItemsCount }} repeating sub-item card(s)</strong>.
                To delete this section and all its cards together, check the <strong>"Select All"</strong> box in the checklist above, or click below to unlock.
              </p>
              <button type="button" class="btn btn-sm btn-authorize" (click)="authorizeAllCascade()">
                <span class="material-symbols-outlined fs-6">done_all</span>
                <span>Click Here to Select All Sub-Items &amp; Unlock Deletion</span>
              </button>
            </div>
          </div>

          <div class="delete-action-row">
            <button type="button" (click)="cancel()" class="btn btn-secondary">
              <span>Cancel</span>
            </button>
            <button
              type="button"
              class="btn btn-danger"
              (click)="executeDelete()"
              [disabled]="!canProceedWithDeletion()"
              [title]="!canProceedWithDeletion() ? 'Please match section title and authorize cascade checklist.' : ''"
            >
              <span class="material-symbols-outlined">{{ deleting ? 'hourglass_top' : (subItemsCount > 0 ? 'delete_sweep' : 'delete_forever') }}</span>
              <span>
                {{
                  deleting
                    ? 'Purging Section & Sub-Items...'
                    : subItemsCount > 0
                    ? 'Force Delete Section & ' + subItemsCount + ' Sub-Item(s)'
                    : 'I understand the consequences, delete this section'
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
      gap: 20px;
      width: 100%;
      max-width: 100%;
    }

    .page-header-bar {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      flex-wrap: wrap;
      gap: 16px;
    }
    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12.5px;
      font-weight: 700;
      color: #64748b;
      margin-bottom: 4px;
    }
    .breadcrumb a { color: #0050e5; text-decoration: none; }
    .breadcrumb .sep { color: #cbd5e1; }
    .breadcrumb .danger-text { color: #dc2626; }

    .page-title {
      font-size: 22px;
      font-weight: 800;
      margin: 0 0 4px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .danger-title { color: #dc2626; }
    .danger-icon { font-size: 26px; color: #dc2626; }
    .page-sub { font-size: 13px; color: #64748b; margin: 0; }

    .header-actions { display: flex; align-items: center; gap: 10px; }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
      text-decoration: none;
    }
    .btn-secondary { background: #ffffff; color: #334155; border: 1px solid #cbd5e1; }
    .btn-secondary:hover { background: #f8fafc; }
    .btn-danger {
      background: #dc2626;
      color: #ffffff;
      box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
    }
    .btn-danger:hover:not(:disabled) { background: #b91c1c; transform: translateY(-1px); }
    .btn-danger:disabled {
      background: #fca5a5;
      cursor: not-allowed;
      box-shadow: none;
      opacity: 0.7;
    }

    .alert-banner {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 18px;
      border-radius: 10px;
      font-size: 13.5px;
      font-weight: 600;
    }
    .alert-banner.error { background: rgba(239, 68, 68, 0.12); color: #ef4444; border: 1px solid #ef4444; }

    .state-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 40px;
      text-align: center;
      color: #64748b;
    }
    .spin { animation: spin 1s linear infinite; font-size: 32px; color: #0050e5; }
    @keyframes spin { 100% { transform: rotate(360deg); } }

    .delete-layout { display: flex; flex-direction: column; gap: 20px; }

    .record-summary-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 22px 26px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
    }
    .summary-head {
      display: flex;
      align-items: center;
      gap: 8px;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .summary-head h3 { font-size: 15px; font-weight: 800; color: #0f172a; margin: 0; }
    .summary-head span { font-size: 20px; color: #0050e5; }

    .record-body { display: flex; gap: 20px; align-items: center; }
    .sec-icon-box {
      width: 64px;
      height: 64px;
      border-radius: 14px;
      background: rgba(0, 80, 229, 0.1);
      color: #0050e5;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .sec-icon-box span { font-size: 32px; }

    .record-details { display: flex; flex-direction: column; gap: 4px; flex: 1; }
    .record-title { font-size: 18px; font-weight: 800; color: #0f172a; margin: 0; }
    .record-sub { font-size: 13.5px; color: #64748b; margin: 0; }

    .meta-row { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-top: 6px; }
    .meta-pill {
      font-size: 11.5px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
    }
    .meta-pill.published { background: rgba(34, 197, 94, 0.12); color: #16a34a; }
    .meta-pill.draft { background: rgba(100, 116, 139, 0.12); color: #64748b; }
    .meta-pill.count-pill { background: #f1f5f9; color: #334155; }
    .meta-pill.count-pill.danger { background: rgba(239, 68, 68, 0.12); color: #dc2626; border: 1px solid rgba(239, 68, 68, 0.25); }
    .meta-date { font-size: 12px; color: #94a3b8; }

    /* Forceful Cascade Checklist Card */
    .subitems-block-card {
      background: #fffbeb;
      border: 1.5px solid #fde68a;
      border-radius: 16px;
      padding: 22px 26px;
      box-shadow: 0 4px 16px rgba(245, 158, 11, 0.08);
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .block-head {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      border-bottom: 1px solid #fef3c7;
      padding-bottom: 14px;
    }
    .force-icon {
      font-size: 30px;
      color: #d97706;
      background: #fef3c7;
      padding: 8px;
      border-radius: 10px;
      flex-shrink: 0;
    }
    .block-head-text { flex: 1; }
    .block-head-text h3 {
      font-size: 16px;
      font-weight: 800;
      color: #92400e;
      margin: 0;
    }
    .badge-cascade {
      background: #f59e0b;
      color: #ffffff;
      font-size: 11px;
      font-weight: 800;
      padding: 3px 10px;
      border-radius: 20px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .block-sub {
      font-size: 13px;
      color: #78350f;
      margin: 6px 0 0;
      line-height: 1.45;
    }

    /* Master Select All Bar */
    .select-all-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #fef3c7;
      border: 1px solid #fde68a;
      border-radius: 10px;
      padding: 10px 16px;
    }
    .custom-check-label {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      user-select: none;
      margin: 0;
    }
    .custom-check {
      width: 18px;
      height: 18px;
      accent-color: #d97706;
      cursor: pointer;
    }
    .check-title { font-size: 13.5px; color: #78350f; }
    .selected-counter {
      font-size: 12px;
      font-weight: 700;
      color: #b45309;
      background: #fff;
      padding: 3px 10px;
      border-radius: 6px;
      border: 1px solid #fde68a;
    }
    .selected-counter.ready {
      background: #16a34a;
      color: #ffffff;
      border-color: #16a34a;
    }

    /* Checklist Cards */
    .subitems-checklist {
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-height: 380px;
      overflow-y: auto;
      padding-right: 4px;
    }
    .subitem-check-card {
      background: #ffffff;
      border: 1px solid #fde68a;
      border-radius: 10px;
      padding: 12px 14px;
      transition: all 0.2s;
    }
    .subitem-check-card:hover { border-color: #f59e0b; box-shadow: 0 2px 8px rgba(245, 158, 11, 0.1); }
    .subitem-check-card.selected {
      border-color: #d97706;
      background: #fffbeb;
    }
    .item-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }
    .item-check-label { flex: 1; margin: 0; }
    .item-meta {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      flex-wrap: wrap;
    }
    .item-order {
      background: #f1f5f9;
      color: #334155;
      font-weight: 800;
      font-size: 11px;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .item-title { color: #0f172a; font-weight: 700; }
    .item-mini {
      color: #d97706;
      font-weight: 700;
      font-size: 11px;
      text-transform: uppercase;
    }
    .item-desc {
      color: #64748b;
      font-size: 12px;
    }
    .btn-delete-item-sm {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11.5px;
      font-weight: 700;
      background: #fee2e2;
      color: #dc2626;
      text-decoration: none;
      transition: background 0.2s;
    }
    .btn-delete-item-sm:hover { background: #fca5a5; }
    .btn-delete-item-sm span { font-size: 14px; }

    /* Authorization Confirm Box */
    .force-confirm-box {
      background: #ffffff;
      border: 1.5px dashed #f59e0b;
      border-radius: 10px;
      padding: 12px 16px;
    }
    .force-auth-label { width: 100%; margin: 0; }
    .auth-text { font-size: 13px; color: #92400e; line-height: 1.4; }

    .block-action-bar {
      display: flex;
      justify-content: flex-end;
      padding-top: 4px;
    }
    .btn-warning-action {
      background: #ffffff;
      color: #92400e;
      border: 1px solid #fde68a;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 14px;
      border-radius: 8px;
      font-size: 12.5px;
      font-weight: 700;
      text-decoration: none;
    }
    .btn-warning-action:hover { background: #fef3c7; }

    /* Consequences Warning Box */
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

    .match-status { font-size: 12px; font-weight: 700; }
    .status-match { color: #16a34a; display: flex; align-items: center; gap: 4px; }
    .status-warning { color: #d97706; display: flex; align-items: center; gap: 4px; }
    .status-mismatch { color: #dc2626; display: flex; align-items: center; gap: 4px; }
    .status-match span, .status-warning span, .status-mismatch span { font-size: 16px; }

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
    .btn-authorize {
      background: #0050e5;
      color: #fff;
      margin-top: 10px;
    }
    .btn-authorize:hover { background: #003ebd; }

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
export class PageSectionDeleteComponent implements OnInit {
  sectionId: string | null = null;
  section: any = null;
  attachedSubItems: any[] = [];
  subItemsCount: number = 0;
  loading = false;
  deleting = false;
  confirmationInput = '';
  errorMsg = '';
  returnUrl: string | null = null;
  pageIdFromQuery: string | null = null;

  // Forceful Cascade Checklist State
  selectedSubItemIds = new Set<string>();
  forceDeleteConfirmed = false;

  constructor(
    private api: ApiService,
    private toast: ToastService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(qp => {
      this.returnUrl = qp.get('returnUrl');
      this.pageIdFromQuery = qp.get('webPageId') || qp.get('pageId');
    });
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.sectionId = id;
        this.loadSection(id);
      }
    });
  }

  loadSection(id: string): void {
    this.loading = true;
    this.api.get<any>(`ContentApi/sections/${id}`).subscribe({
      next: (res) => {
        this.loading = false;
        if (res?.data) {
          this.section = res.data;
          this.attachedSubItems = this.section.pageSectionLists || [];
          this.subItemsCount = this.section.listCount ?? this.attachedSubItems.length;
          if (this.attachedSubItems.length === 0 && this.subItemsCount > 0) {
            this.loadAttachedSubItems(id);
          }
        } else {
          this.errorMsg = 'Page section record not found.';
        }
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = err?.error?.message || 'Failed to load page section.';
      }
    });
  }

  loadAttachedSubItems(id: string): void {
    this.api.get<any>('ContentApi/section-lists', { sectionId: id }).subscribe({
      next: (res) => {
        if (Array.isArray(res?.data)) {
          this.attachedSubItems = res.data;
          this.subItemsCount = this.attachedSubItems.length;
        }
      },
      error: () => {}
    });
  }

  isAllSelected(): boolean {
    if (this.attachedSubItems.length === 0) return true;
    return this.attachedSubItems.every(item => this.selectedSubItemIds.has(item.id));
  }

  authorizeAllCascade(): void {
    this.attachedSubItems.forEach(i => this.selectedSubItemIds.add(i.id));
    this.forceDeleteConfirmed = true;
    this.toast.info(`Authorized cascade purge for all ${this.subItemsCount} sub-item(s).`);
  }

  toggleSelectAll(): void {
    if (this.isAllSelected()) {
      this.selectedSubItemIds.clear();
      this.forceDeleteConfirmed = false;
    } else {
      this.attachedSubItems.forEach(item => this.selectedSubItemIds.add(item.id));
      this.forceDeleteConfirmed = true;
    }
  }

  toggleSubItem(item: any): void {
    if (this.selectedSubItemIds.has(item.id)) {
      this.selectedSubItemIds.delete(item.id);
    } else {
      this.selectedSubItemIds.add(item.id);
    }
    if (!this.isAllSelected()) {
      this.forceDeleteConfirmed = false;
    }
  }

  isTitleMatched(): boolean {
    if (!this.section?.title || !this.confirmationInput) return false;
    return this.confirmationInput.trim().toLowerCase() === this.section.title.trim().toLowerCase();
  }

  canProceedWithDeletion(): boolean {
    if (!this.isTitleMatched() || this.deleting) return false;
    if (this.subItemsCount === 0) return true;
    return this.isAllSelected() && this.forceDeleteConfirmed;
  }

  copyTitle(): void {
    if (this.section?.title) {
      navigator.clipboard?.writeText(this.section.title);
      this.confirmationInput = this.section.title;
    }
  }

  executeDelete(): void {
    if (!this.canProceedWithDeletion() || !this.sectionId) return;

    this.deleting = true;
    this.errorMsg = '';

    const endpoint = this.subItemsCount > 0
      ? `ContentApi/sections/${this.sectionId}?forceCascade=true`
      : `ContentApi/sections/${this.sectionId}`;

    this.api.delete<any>(endpoint).subscribe({
      next: () => {
        this.deleting = false;
        this.toast.success(`Page section '${this.section?.title || 'Section'}' deleted successfully.`);
        const pageId = this.section?.webPageId || this.pageIdFromQuery;
        if (this.returnUrl && this.returnUrl.includes('/pages/delete/')) {
          this.router.navigateByUrl(this.returnUrl);
        } else if (pageId) {
          this.router.navigate(['/content/console/sections'], { queryParams: { webPageId: pageId } });
        } else if (this.returnUrl) {
          this.router.navigateByUrl(this.returnUrl);
        } else {
          this.router.navigate(['/content/console/sections']);
        }
      },
      error: (err) => {
        this.deleting = false;
        this.errorMsg = err?.error?.message || 'Failed to delete page section.';
      }
    });
  }

  cancel(): void {
    const pageId = this.section?.webPageId || this.pageIdFromQuery;
    if (this.returnUrl && this.returnUrl.includes('/pages/delete/')) {
      this.router.navigateByUrl(this.returnUrl);
    } else if (pageId) {
      this.router.navigate(['/content/console/sections'], { queryParams: { webPageId: pageId } });
    } else if (this.returnUrl) {
      this.router.navigateByUrl(this.returnUrl);
    } else {
      this.router.navigate(['/content/console/sections']);
    }
  }
}
