import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { MasterHelpService } from '../../../core/services/master-help.service';
import {
  MasterPageHelpDto,
  HelpActionItemDto,
  HelpRelatedRouteDto,
  SaveMasterPageHelpRequest,
  MasterHelpTopicSearchResultDto
} from '../../../core/models/master-help.models';

/**
 * Slide-out contextual help drawer providing page-based workflow instructions,
 * button & control breakdowns, sibling suite navigation, searchable knowledge topics,
 * and dual-guarded in-place editing for localhost developers and Central Administrators.
 */
@Component({
  selector: 'app-help-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Backdrop Overlay -->
    <div
      class="help-drawer-backdrop"
      *ngIf="isOpen"
      (click)="onBackdropClick($event)"
      [class.active]="isOpen">
    </div>

    <!-- Slide-Out Drawer Panel -->
    <aside
      class="help-drawer-panel"
      [class.open]="isOpen"
      aria-label="Contextual Help and Workflow Guide"
      role="dialog"
      aria-modal="true">

      <!-- Drawer Header -->
      <div class="help-drawer-header">
        <div class="header-titles">
          <div class="suite-badge-row">
            <span class="badge-suite">{{ (currentPageHelp?.featureSuite) || 'General Guide' }}</span>
            <span class="badge-category">{{ currentPageHelp?.category || 'Console' }}</span>
          </div>
          <h2 class="drawer-page-title">{{ currentPageHelp?.pageTitle || 'Page Guide' }}</h2>
          <span class="route-slug"><code>{{ currentRoute }}</code></span>
        </div>

        <button
          type="button"
          class="btn-close-drawer"
          (click)="close()"
          aria-label="Close Help Drawer"
          title="Close Help Guide (Esc)">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <!-- Quick Search Bar -->
      <div class="help-search-box">
        <span class="material-symbols-outlined search-icon">search</span>
        <input
          type="text"
          class="search-input"
          [(ngModel)]="searchQuery"
          (ngModelChange)="onSearchChange($event)"
          placeholder="Search all guides, features & topics..."
          aria-label="Search help documentation" />
        <button
          *ngIf="searchQuery"
          type="button"
          class="btn-clear-search"
          (click)="clearSearch()"
          title="Clear search">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <!-- Loading State -->
      <div class="help-loading" *ngIf="isLoading">
        <div class="spinner"></div>
        <span>Retrieving documentation from Central...</span>
      </div>

      <!-- Drawer Scrollable Content -->
      <div class="help-drawer-body" *ngIf="!isLoading">

        <!-- SEARCH RESULTS VIEW -->
        <div class="search-results-container" *ngIf="isSearching">
          <div class="search-header-row">
            <span class="search-results-count">{{ searchResults.length }} topic(s) found</span>
            <button type="button" class="btn-back-current" (click)="clearSearch()">
              <span class="material-symbols-outlined">arrow_back</span>
              <span>Back to Current Page</span>
            </button>
          </div>

          <div class="search-results-list" *ngIf="searchResults.length > 0">
            <div
              class="search-result-card"
              *ngFor="let result of searchResults"
              (click)="navigateToResult(result)">
              <div class="result-top">
                <span class="result-suite">{{ result.featureSuite }}</span>
                <span class="result-category">{{ result.category }}</span>
              </div>
              <h4 class="result-title">{{ result.pageTitle }}</h4>
              <p class="result-summary">{{ result.shortSummary || 'No summary available.' }}</p>
              <div class="result-route-action">
                <code>{{ result.routeKey }}</code>
                <span class="open-link-cue">
                  <span>Open Page</span>
                  <span class="material-symbols-outlined">arrow_forward</span>
                </span>
              </div>
            </div>
          </div>

          <div class="search-empty" *ngIf="searchResults.length === 0">
            <span class="material-symbols-outlined empty-icon">find_in_page</span>
            <p>No matching topics found for "<strong>{{ searchQuery }}</strong>"</p>
            <button type="button" class="btn-reset-search" (click)="clearSearch()">Clear search</button>
          </div>
        </div>

        <!-- NORMAL PAGE DOCUMENTATION VIEW -->
        <ng-container *ngIf="!isSearching">

          <!-- VIEW MODE -->
          <div class="help-content-view" *ngIf="!isEditing">

            <!-- Summary Statement -->
            <div class="help-summary-callout" *ngIf="currentPageHelp?.shortSummary">
              <span class="material-symbols-outlined callout-icon">info</span>
              <p>{{ currentPageHelp?.shortSummary }}</p>
            </div>

            <!-- Page Workflow Overview -->
            <section class="help-section">
              <h3 class="section-title">
                <span class="material-symbols-outlined text-blue">menu_book</span>
                <span>Page Overview & Purpose</span>
              </h3>
              <div class="markdown-prose" [innerHTML]="renderedOverviewHtml"></div>
            </section>

            <!-- Actions & Button Guide -->
            <section class="help-section" *ngIf="actionItems.length > 0">
              <div class="section-title-with-badge">
                <h3 class="section-title">
                  <span class="material-symbols-outlined text-blue">touch_app</span>
                  <span>Page Actions & Controls</span>
                </h3>
                <span class="action-count-badge">{{ actionItems.length }} Controls</span>
              </div>

              <div class="actions-list">
                <div class="action-item-card" *ngFor="let action of actionItems">
                  <div class="action-header">
                    <span class="action-icon-pill">
                      <span class="material-symbols-outlined">{{ mapMaterialIcon(action.icon) }}</span>
                    </span>
                    <strong class="action-label">{{ action.trigger }}</strong>
                    <span class="action-route-badge" *ngIf="action.route">Direct Action</span>
                  </div>
                  <p class="action-desc">{{ action.description }}</p>
                </div>
              </div>
            </section>

            <!-- Related Sibling Routes -->
            <section class="help-section" *ngIf="relatedRoutes.length > 0">
              <h3 class="section-title">
                <span class="material-symbols-outlined text-blue">alt_route</span>
                <span>Related Suite Pages</span>
              </h3>
              <div class="related-routes-grid">
                <a
                  *ngFor="let rel of relatedRoutes"
                  href="javascript:void(0)"
                  class="related-route-card"
                  (click)="navigateTo(rel.route)">
                  <div class="related-info">
                    <span class="material-symbols-outlined rel-icon">{{ mapMaterialIcon(rel.icon) }}</span>
                    <span class="rel-title">{{ rel.title }}</span>
                  </div>
                  <span class="material-symbols-outlined arrow-cue">chevron_right</span>
                </a>
              </div>
            </section>

            <!-- Metadata & Tour Actions -->
            <div class="help-footer-meta">
              <span class="last-updated">
                Updated {{ currentPageHelp?.updatedAtUtc | date:'mediumDate' }}
                <span *ngIf="currentPageHelp?.lastUpdatedBy">· {{ currentPageHelp?.lastUpdatedBy }}</span>
              </span>
            </div>
          </div>

          <!-- EDIT MODE (DEVELOPER / CENTRAL ADMIN IN-PLACE EDITOR) -->
          <div class="help-editor-view" *ngIf="isEditing">
            <div class="editor-header-bar">
              <span class="badge-dev-mode">
                <span class="pulse-dot"></span>
                <span>In-Place Developer Authoring</span>
              </span>
              <p class="editor-notice">
                Changes saved here persist directly to Central Master Catalog Database (<code>Ozikol_MasterCatalogDb</code>)
                and serve all tenants on this route.
              </p>
            </div>

            <form (ngSubmit)="saveDocumentation()" class="editor-form">
              <div class="form-group">
                <label for="editRouteKey">Route Pattern (Key)</label>
                <input
                  id="editRouteKey"
                  type="text"
                  class="form-control"
                  [(ngModel)]="editModel.routeKey"
                  name="routeKey"
                  readonly />
              </div>

              <div class="form-row">
                <div class="form-group col">
                  <label for="editSuite">Feature Suite</label>
                  <input
                    id="editSuite"
                    type="text"
                    class="form-control"
                    [(ngModel)]="editModel.featureSuite"
                    name="featureSuite"
                    placeholder="e.g. Workforce & Shifts"
                    required />
                </div>
                <div class="form-group col">
                  <label for="editCategory">Category</label>
                  <select
                    id="editCategory"
                    class="form-control"
                    [(ngModel)]="editModel.category"
                    name="category">
                    <option value="Console">Console (Admin)</option>
                    <option value="Workspace">Workspace (Member)</option>
                    <option value="Settings">Settings</option>
                    <option value="Public">Public</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label for="editPageTitle">Page Title</label>
                <input
                  id="editPageTitle"
                  type="text"
                  class="form-control"
                  [(ngModel)]="editModel.pageTitle"
                  name="pageTitle"
                  placeholder="e.g. Shift Analytics & Intelligence"
                  required />
              </div>

              <div class="form-group">
                <label for="editSummary">Concise Summary (1-2 sentences)</label>
                <textarea
                  id="editSummary"
                  rows="2"
                  class="form-control"
                  [(ngModel)]="editModel.shortSummary"
                  name="shortSummary"
                  placeholder="High-level operational overview and duty performance statement..."></textarea>
              </div>

              <div class="form-group">
                <div class="label-with-tip">
                  <label for="editMarkdown">Overview & Instructions (Markdown Supported)</label>
                  <span class="tip-text">Supports ### Headings, **bold**, bullet points, and code blocks</span>
                </div>
                <textarea
                  id="editMarkdown"
                  rows="9"
                  class="form-control code-font"
                  [(ngModel)]="editModel.overviewMarkdown"
                  name="overviewMarkdown"
                  placeholder="### Purpose\nExplain what happens on this page...\n\n#### Key Steps\n- Step 1\n- Step 2"
                  required></textarea>
              </div>

              <div class="form-group">
                <div class="label-with-tip">
                  <label for="editActionsJson">Actions & Button Guide (JSON Format)</label>
                  <span class="tip-text">Array of &#123; trigger, icon, description, route? &#125;</span>
                </div>
                <textarea
                  id="editActionsJson"
                  rows="5"
                  class="form-control code-font"
                  [(ngModel)]="editModel.actionsJson"
                  name="actionsJson"
                  placeholder='[{"trigger":"Refresh Data","icon":"refresh","description":"Recalculates metrics"}]'></textarea>
              </div>

              <div class="form-group">
                <div class="label-with-tip">
                  <label for="editRelatedJson">Related Sibling Routes (JSON Format)</label>
                  <span class="tip-text">Array of &#123; title, route, icon &#125;</span>
                </div>
                <textarea
                  id="editRelatedJson"
                  rows="4"
                  class="form-control code-font"
                  [(ngModel)]="editModel.relatedRoutesJson"
                  name="relatedRoutesJson"
                  placeholder='[{"title":"Schedule","route":"/workforce/console/schedule","icon":"calendar"}]'></textarea>
              </div>

              <!-- Form Actions -->
              <div class="editor-actions">
                <button
                  type="button"
                  class="btn-secondary"
                  (click)="cancelEditing()">
                  Cancel
                </button>
                <button
                  type="submit"
                  class="btn-primary-save"
                  [disabled]="isSaving">
                  <span class="material-symbols-outlined" *ngIf="!isSaving">save</span>
                  <span>{{ isSaving ? 'Saving to Central...' : 'Save Page Help' }}</span>
                </button>
              </div>
            </form>
          </div>
        </ng-container>
      </div>

      <!-- Drawer Footer Action Bar -->
      <div class="help-drawer-footer" *ngIf="isDevAllowed && !isSearching && !isEditing">
        <div class="dev-banner">
          <span class="dev-indicator-dot"></span>
          <span>Developer Authoring Enabled</span>
        </div>
        <button
          type="button"
          class="btn-edit-toggle"
          (click)="startEditing()"
          title="Edit instructions and button guides for this page">
          <span class="material-symbols-outlined">edit</span>
          <span>Edit Page Help</span>
        </button>
      </div>
    </aside>
  `,
  styles: [`
    /* Backdrop */
    .help-drawer-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.45);
      backdrop-filter: blur(4px);
      z-index: 9998;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.25s ease-in-out;
    }
    .help-drawer-backdrop.active {
      opacity: 1;
      pointer-events: auto;
    }

    /* Drawer Panel */
    .help-drawer-panel {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      width: 460px;
      max-width: 100vw;
      background: #ffffff;
      box-shadow: -6px 0 24px rgba(15, 23, 42, 0.18);
      z-index: 9999;
      display: flex;
      flex-direction: column;
      transform: translateX(100%);
      transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      font-family: inherit;
    }
    .help-drawer-panel.open {
      transform: translateX(0);
    }

    /* Header */
    .help-drawer-header {
      padding: 18px 20px 14px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      background: #f8fafc;
    }
    .header-titles {
      flex: 1;
      min-width: 0;
    }
    .suite-badge-row {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 4px;
    }
    .badge-suite {
      display: inline-block;
      padding: 2px 8px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      background: #eff6ff;
      color: #0050e5;
      border: 1px solid #bfdbfe;
      border-radius: 4px;
    }
    .badge-category {
      display: inline-block;
      padding: 2px 7px;
      font-size: 10px;
      font-weight: 600;
      background: #f1f5f9;
      color: #475569;
      border-radius: 4px;
    }
    .drawer-page-title {
      margin: 0;
      font-size: 17px;
      font-weight: 700;
      color: #0f172a;
      line-height: 1.3;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .route-slug {
      display: block;
      margin-top: 3px;
      font-size: 11px;
      color: #64748b;
    }
    .route-slug code {
      background: #e2e8f0;
      padding: 1px 5px;
      border-radius: 3px;
      color: #334155;
      font-size: 10.5px;
    }
    .btn-close-drawer {
      background: transparent;
      border: none;
      color: #64748b;
      cursor: pointer;
      padding: 6px;
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s, color 0.15s;
    }
    .btn-close-drawer:hover {
      background: #e2e8f0;
      color: #0f172a;
    }

    /* Search Box */
    .help-search-box {
      padding: 10px 18px;
      border-bottom: 1px solid #f1f5f9;
      background: #ffffff;
      display: flex;
      align-items: center;
      gap: 8px;
      position: relative;
    }
    .search-icon {
      font-size: 18px;
      color: #94a3b8;
    }
    .search-input {
      flex: 1;
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      padding: 7px 12px;
      border-radius: 6px;
      font-size: 12.5px;
      outline: none;
      color: #0f172a;
      transition: border-color 0.15s, background 0.15s;
    }
    .search-input:focus {
      border-color: #0050e5;
      background: #ffffff;
      box-shadow: 0 0 0 2px rgba(0, 80, 229, 0.1);
    }
    .btn-clear-search {
      background: none;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      padding: 2px;
      display: flex;
      align-items: center;
    }
    .btn-clear-search:hover {
      color: #0f172a;
    }

    /* Loading */
    .help-loading {
      padding: 30px;
      text-align: center;
      color: #64748b;
      font-size: 13px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    .spinner {
      width: 24px;
      height: 24px;
      border: 2px solid #e2e8f0;
      border-top-color: #0050e5;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Body */
    .help-drawer-body {
      flex: 1;
      overflow-y: auto;
      padding: 16px 20px;
    }

    /* Summary Callout */
    .help-summary-callout {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px 14px;
      background: #eff6ff;
      border-left: 3px solid #0050e5;
      border-radius: 6px;
      margin-bottom: 20px;
    }
    .callout-icon {
      color: #0050e5;
      font-size: 19px;
      margin-top: 1px;
      flex-shrink: 0;
    }
    .help-summary-callout p {
      margin: 0;
      font-size: 12.5px;
      line-height: 1.45;
      color: #1e3a8a;
    }

    /* Section */
    .help-section {
      margin-bottom: 22px;
    }
    .section-title {
      font-size: 13.5px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 10px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .section-title .text-blue {
      color: #0050e5;
      font-size: 18px;
    }
    .section-title-with-badge {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
    }
    .section-title-with-badge .section-title {
      margin: 0;
    }
    .action-count-badge {
      font-size: 11px;
      font-weight: 600;
      color: #0050e5;
      background: #eff6ff;
      padding: 2px 7px;
      border-radius: 4px;
      border: 1px solid #bfdbfe;
    }

    /* Markdown Prose */
    .markdown-prose {
      font-size: 12.5px;
      line-height: 1.55;
      color: #334155;
    }
    .markdown-prose h3 {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
      margin: 12px 0 6px;
    }
    .markdown-prose h4 {
      font-size: 13px;
      font-weight: 700;
      color: #1e293b;
      margin: 10px 0 4px;
    }
    .markdown-prose p {
      margin: 0 0 8px;
    }
    .markdown-prose ul {
      margin: 0 0 10px 18px;
      padding: 0;
    }
    .markdown-prose li {
      margin-bottom: 4px;
    }
    .markdown-prose strong {
      color: #0f172a;
    }
    .markdown-prose code {
      background: #f1f5f9;
      color: #0050e5;
      padding: 1px 4px;
      border-radius: 3px;
      font-size: 11.5px;
    }

    /* Actions List */
    .actions-list {
      display: flex;
      flex-direction: column;
      gap: 9px;
    }
    .action-item-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 12px;
      transition: border-color 0.15s, background 0.15s;
    }
    .action-item-card:hover {
      border-color: #cbd5e1;
      background: #ffffff;
    }
    .action-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }
    .action-icon-pill {
      width: 26px;
      height: 26px;
      border-radius: 6px;
      background: #eff6ff;
      color: #0050e5;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .action-icon-pill .material-symbols-outlined {
      font-size: 16px;
    }
    .action-label {
      font-size: 12.5px;
      font-weight: 700;
      color: #0f172a;
      flex: 1;
    }
    .action-route-badge {
      font-size: 10px;
      padding: 1px 5px;
      background: #e2e8f0;
      color: #475569;
      border-radius: 3px;
      font-weight: 600;
    }
    .action-desc {
      margin: 0;
      font-size: 11.5px;
      color: #64748b;
      line-height: 1.45;
      padding-left: 34px;
    }

    /* Related Routes Grid */
    .related-routes-grid {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .related-route-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      text-decoration: none;
      color: #1e293b;
      transition: all 0.15s;
    }
    .related-route-card:hover {
      background: #eff6ff;
      border-color: #bfdbfe;
      color: #0050e5;
      transform: translateX(2px);
    }
    .related-info {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .rel-icon {
      font-size: 17px;
      color: #0050e5;
    }
    .rel-title {
      font-size: 12.5px;
      font-weight: 600;
    }
    .arrow-cue {
      font-size: 16px;
      color: #94a3b8;
    }

    /* Footer Metadata */
    .help-footer-meta {
      padding-top: 14px;
      margin-top: 16px;
      border-top: 1px solid #f1f5f9;
      font-size: 11px;
      color: #94a3b8;
    }

    /* Search Results */
    .search-header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }
    .search-results-count {
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
    }
    .btn-back-current {
      background: none;
      border: none;
      color: #0050e5;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .btn-back-current .material-symbols-outlined {
      font-size: 16px;
    }
    .search-results-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .search-result-card {
      padding: 12px 14px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .search-result-card:hover {
      background: #eff6ff;
      border-color: #0050e5;
      box-shadow: 0 2px 8px rgba(0, 80, 229, 0.08);
    }
    .result-top {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 4px;
    }
    .result-suite {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      color: #0050e5;
    }
    .result-category {
      font-size: 10px;
      color: #64748b;
    }
    .result-title {
      margin: 0 0 4px;
      font-size: 13.5px;
      font-weight: 700;
      color: #0f172a;
    }
    .result-summary {
      margin: 0 0 8px;
      font-size: 12px;
      color: #64748b;
      line-height: 1.4;
    }
    .result-route-action {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11px;
    }
    .result-route-action code {
      background: #e2e8f0;
      padding: 1px 4px;
      border-radius: 3px;
      color: #334155;
    }
    .open-link-cue {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      color: #0050e5;
      font-weight: 600;
    }
    .open-link-cue .material-symbols-outlined {
      font-size: 14px;
    }
    .search-empty {
      text-align: center;
      padding: 30px 20px;
      color: #64748b;
    }
    .empty-icon {
      font-size: 36px;
      color: #cbd5e1;
      margin-bottom: 8px;
    }
    .btn-reset-search {
      margin-top: 10px;
      background: #e2e8f0;
      border: none;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      cursor: pointer;
    }

    /* Editor View */
    .editor-header-bar {
      margin-bottom: 14px;
    }
    .badge-dev-mode {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 8px;
      font-size: 11px;
      font-weight: 700;
      background: #fef3c7;
      color: #92400e;
      border-radius: 4px;
      margin-bottom: 6px;
    }
    .pulse-dot {
      width: 6px;
      height: 6px;
      background: #f59e0b;
      border-radius: 50%;
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
      0% { transform: scale(0.95); opacity: 0.9; }
      50% { transform: scale(1.3); opacity: 0.4; }
      100% { transform: scale(0.95); opacity: 0.9; }
    }
    .editor-notice {
      margin: 0;
      font-size: 11px;
      color: #64748b;
      line-height: 1.4;
    }
    .editor-form {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .form-row {
      display: flex;
      gap: 10px;
    }
    .form-row .col {
      flex: 1;
    }
    .form-group label {
      font-size: 11.5px;
      font-weight: 600;
      color: #334155;
    }
    .label-with-tip {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .tip-text {
      font-size: 10px;
      color: #94a3b8;
    }
    .form-control {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 7px 10px;
      font-size: 12px;
      font-family: inherit;
      color: #0f172a;
      background: #ffffff;
      outline: none;
      transition: border-color 0.15s;
    }
    .form-control:focus {
      border-color: #0050e5;
      box-shadow: 0 0 0 2px rgba(0, 80, 229, 0.1);
    }
    .form-control.code-font {
      font-family: Consolas, 'Courier New', monospace;
      font-size: 11.5px;
      line-height: 1.4;
    }
    .editor-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      padding-top: 10px;
      border-top: 1px solid #e2e8f0;
      margin-top: 6px;
    }
    .btn-secondary {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      color: #475569;
      padding: 7px 14px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-secondary:hover {
      background: #e2e8f0;
    }
    .btn-primary-save {
      background: #0050e5;
      border: none;
      color: #ffffff;
      padding: 7px 16px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      box-shadow: 0 2px 6px rgba(0, 80, 229, 0.25);
    }
    .btn-primary-save:hover:not(:disabled) {
      background: #003ebd;
    }
    .btn-primary-save:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    /* Drawer Footer */
    .help-drawer-footer {
      padding: 12px 18px;
      border-top: 1px solid #e2e8f0;
      background: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .dev-banner {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
    }
    .dev-indicator-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #10b981;
    }
    .btn-edit-toggle {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #0050e5;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 11.5px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      transition: all 0.15s;
    }
    .btn-edit-toggle:hover {
      background: #0050e5;
      color: #ffffff;
      border-color: #0050e5;
    }
    .btn-edit-toggle .material-symbols-outlined {
      font-size: 15px;
    }

    /* Mobile Responsive */
    @media (max-width: 600px) {
      .help-drawer-panel {
        width: 100vw;
      }
    }
  `]
})
export class HelpDrawerComponent implements OnInit, OnDestroy {
  private readonly helpService = inject(MasterHelpService);
  private readonly router = inject(Router);

  public isOpen = false;
  public isLoading = false;
  public isSearching = false;
  public isEditing = false;
  public isDevAllowed = false;
  public isSaving = false;

  public currentRoute = '';
  public currentPageHelp: MasterPageHelpDto | null = null;
  public searchResults: MasterHelpTopicSearchResultDto[] = [];
  public searchQuery = '';

  public editModel: SaveMasterPageHelpRequest = {
    routeKey: '',
    featureSuite: '',
    pageTitle: '',
    shortSummary: '',
    overviewMarkdown: '',
    actionsJson: '[]',
    relatedRoutesJson: '[]',
    category: 'Console',
    isPublished: true
  };

  public actionItems: HelpActionItemDto[] = [];
  public relatedRoutes: HelpRelatedRouteDto[] = [];
  public renderedOverviewHtml = '';

  private readonly subs: Subscription[] = [];

  ngOnInit(): void {
    this.isDevAllowed = this.helpService.isDevEditAllowed();

    this.subs.push(
      this.helpService.isOpen$.subscribe(open => {
        this.isOpen = open;
        if (open) {
          this.isDevAllowed = this.helpService.isDevEditAllowed();
        }
      }),
      this.helpService.isLoading$.subscribe(loading => (this.isLoading = loading)),
      this.helpService.isSearching$.subscribe(searching => (this.isSearching = searching)),
      this.helpService.isEditing$.subscribe(editing => (this.isEditing = editing)),
      this.helpService.currentRoute$.subscribe(r => (this.currentRoute = r)),
      this.helpService.searchResults$.subscribe(results => (this.searchResults = results)),
      this.helpService.currentPageHelp$.subscribe(help => {
        this.currentPageHelp = help;
        this.processCurrentHelp(help);
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  public close(): void {
    this.helpService.close();
  }

  public onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('help-drawer-backdrop')) {
      this.close();
    }
  }

  public onSearchChange(query: string): void {
    this.helpService.search(query);
  }

  public clearSearch(): void {
    this.searchQuery = '';
    this.helpService.clearSearch();
  }

  public navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  public navigateToResult(result: MasterHelpTopicSearchResultDto): void {
    const route = result.routeKey;
    this.clearSearch();
    this.router.navigate([route]);
  }

  public startEditing(): void {
    if (!this.currentPageHelp) return;
    this.editModel = {
      routeKey: this.currentPageHelp.routeKey || this.currentRoute,
      featureSuite: this.currentPageHelp.featureSuite || 'General',
      pageTitle: this.currentPageHelp.pageTitle || 'Page Title',
      shortSummary: this.currentPageHelp.shortSummary || '',
      overviewMarkdown: this.currentPageHelp.overviewMarkdown || '',
      actionsJson: this.currentPageHelp.actionsJson || JSON.stringify(this.currentPageHelp.actions || [], null, 2),
      relatedRoutesJson: this.currentPageHelp.relatedRoutesJson || JSON.stringify(this.currentPageHelp.relatedRoutes || [], null, 2),
      category: this.currentPageHelp.category || 'Console',
      isPublished: this.currentPageHelp.isPublished ?? true
    };
    this.helpService.setEditing(true);
  }

  public cancelEditing(): void {
    this.helpService.setEditing(false);
  }

  public saveDocumentation(): void {
    if (!this.editModel.routeKey || !this.editModel.pageTitle) return;

    this.isSaving = true;
    this.helpService.savePageHelp(this.editModel).subscribe({
      next: () => {
        this.isSaving = false;
      },
      error: err => {
        this.isSaving = false;
        alert('Failed to save help documentation. Please check network and permissions.');
      }
    });
  }

  public mapMaterialIcon(icon?: string): string {
    if (!icon) return 'arrow_forward';
    const clean = icon.toLowerCase().trim();
    switch (clean) {
      case 'plus':
      case 'plus-circle': return 'add_circle';
      case 'refresh': return 'refresh';
      case 'calendar': return 'calendar_month';
      case 'calendar-plus': return 'event_available';
      case 'download': return 'download';
      case 'upload': return 'upload';
      case 'clock': return 'schedule';
      case 'building': return 'domain';
      case 'activity':
      case 'radar': return 'radar';
      case 'user-plus': return 'person_add';
      case 'users': return 'group';
      case 'settings': return 'settings';
      case 'lock': return 'lock';
      case 'edit': return 'edit';
      case 'filter': return 'filter_list';
      case 'copy': return 'content_copy';
      case 'send': return 'send';
      case 'check':
      case 'check-circle': return 'check_circle';
      case 'repeat': return 'swap_horiz';
      case 'coffee': return 'free_breakfast';
      case 'log-out': return 'logout';
      case 'shield':
      case 'shield-plus': return 'shield';
      case 'bar-chart': return 'bar_chart';
      case 'tag': return 'label';
      case 'folder': return 'folder';
      case 'file-text': return 'description';
      case 'user-check': return 'how_to_reg';
      default: return clean.replace(/-/g, '_');
    }
  }

  private processCurrentHelp(help: MasterPageHelpDto | null): void {
    if (!help) {
      this.actionItems = [];
      this.relatedRoutes = [];
      this.renderedOverviewHtml = '';
      return;
    }

    // Process actions
    if (help.actions && Array.isArray(help.actions)) {
      this.actionItems = help.actions;
    } else if (help.actionsJson) {
      try {
        this.actionItems = JSON.parse(help.actionsJson);
      } catch {
        this.actionItems = [];
      }
    } else {
      this.actionItems = [];
    }

    // Process related routes
    if (help.relatedRoutes && Array.isArray(help.relatedRoutes)) {
      this.relatedRoutes = help.relatedRoutes;
    } else if (help.relatedRoutesJson) {
      try {
        this.relatedRoutes = JSON.parse(help.relatedRoutesJson);
      } catch {
        this.relatedRoutes = [];
      }
    } else {
      this.relatedRoutes = [];
    }

    // Simple robust Markdown rendering to HTML
    this.renderedOverviewHtml = this.parseSimpleMarkdown(help.overviewMarkdown || '');
  }

  private parseSimpleMarkdown(markdown: string): string {
    if (!markdown) return '';

    let html = markdown
      // Escape HTML entities
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // Headings
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
      // Bold & Italic
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Bullet lists
      .replace(/^\s*-\s+(.*$)/gim, '<li>$1</li>');

    // Wrap adjacent <li> in <ul>
    html = html.replace(/(<li>[\s\S]*?<\/li>)/gm, '<ul>$1</ul>');
    // Remove nested duplicate <ul> tags
    html = html.replace(/<\/ul>\s*<ul>/g, '');

    // Paragraphs: split by double newlines that aren't inside tags
    const paragraphs = html.split(/\n\n+/);
    return paragraphs
      .map(p => {
        const trimmed = p.trim();
        if (!trimmed) return '';
        if (trimmed.startsWith('<h') || trimmed.startsWith('<ul') || trimmed.startsWith('<ol')) {
          return trimmed;
        }
        return `<p>${trimmed.replace(/\n/g, '<br/>')}</p>`;
      })
      .join('');
  }
}
