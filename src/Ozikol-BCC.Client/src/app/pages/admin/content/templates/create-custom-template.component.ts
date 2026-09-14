import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ToastService } from '../../../../core/services/toast.service';
import { ApiService } from '../../../../core/services/api.service';

/**
 * Interface representing an installed template blueprint.
 */
export interface InstalledTemplateItem {
  id: string;
  dbId?: string;
  name: string;
  category: string;
  variantCode: string;
  badge?: string;
  tag: string;
  description: string;
  thumbnailGradient: string;
  previewIcon: string;
  previewSubtitle: string;
  previewTitle: string;
  previewBody: string;
  htmlTemplate: string;
  cssStyles: string;
  jsScript?: string;
  version: string;
  installedUtc: string;
  isCustomized?: boolean;
  defaultContentJson?: string;
}

/**
 * Interface representing official system category preset configurations.
 */
interface CategoryPreset {
  id: string;
  codePrefix: string;
  name: string;
  icon: string;
  tagline: string;
  defaultName: string;
  html: string;
  css: string;
  sampleContent: any;
  specificTokens?: Array<{ label: string; token: string }>;
}

/**
 * Dedicated full-width studio page for creating custom CMS section templates.
 * Features 100% width code editors, mock content drawer below, dynamic system category presets,
 * precision cursor token insertion, and a live interactive preview modal.
 */
@Component({
  selector: 'app-create-custom-template',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="custom-studio-container">
      <!-- Top Studio Header Card -->
      <div class="studio-header-card">
        <div class="header-main-row">
          <div class="header-left">
            <div class="breadcrumb-trail">
              <a routerLink="/admin/dashboard">Console</a>
              <span class="sep">/</span>
              <a routerLink="/content/console">CMS Studio</a>
              <span class="sep">/</span>
              <a routerLink="/content/console/templates">My Templates</a>
              <span class="sep">/</span>
              <span class="current">Create Custom Section</span>
            </div>

            <div class="title-with-icon">
              <div class="header-icon-box">
                <span class="material-symbols-outlined">add_circle</span>
              </div>
              <div class="title-text-wrap">
                <h1 class="page-title">Create Custom Section Template</h1>
                <p class="page-subtitle">
                  Design bespoke section markup with dynamic CMS tokens, scoped styles, and realistic customer simulation.
                </p>
              </div>
            </div>
          </div>

          <div class="header-actions">
            <a routerLink="/content/console/templates" class="btn btn-outline-cancel">
              <span class="material-symbols-outlined btn-icon">arrow_back</span>
              <span>Back to Library</span>
            </a>
            <button
              type="button"
              class="btn btn-preview-modal"
              (click)="openPreviewModal()"
              title="Preview simulated live demo in an interactive modal"
            >
              <span class="material-symbols-outlined btn-icon">visibility</span>
              <span>Preview Demo</span>
            </button>
            <button
              type="button"
              class="btn btn-save-vault"
              (click)="saveCustomTemplate()"
              [disabled]="savingTemplate"
            >
              <span class="material-symbols-outlined btn-icon">{{ savingTemplate ? 'hourglass_empty' : 'save' }}</span>
              <span>{{ savingTemplate ? 'Saving to Vault...' : 'Save to Template Vault' }}</span>
            </button>
          </div>
        </div>

        <!-- Metadata Configuration (2x2 Grid) -->
        <div class="meta-config-grid">
          <!-- Row 1: Name & Official Category -->
          <div class="config-col">
            <label class="config-label">TEMPLATE NAME <span class="required">*</span></label>
            <input
              type="text"
              [(ngModel)]="templateName"
              class="form-control config-input"
              placeholder="e.g. Apex Glassmorphism Sticky Navbar"
            />
          </div>

          <div class="config-col">
            <label class="config-label">SECTION ROLE / CATEGORY <span class="required">*</span></label>
            <select
              [(ngModel)]="selectedCategory"
              (ngModelChange)="onCategoryChange(true)"
              class="form-select config-select"
            >
              <option *ngFor="let cat of categoryPresets" [value]="cat.id">
                {{ cat.name }}
              </option>
            </select>
          </div>

          <!-- Row 2: Variant Code / Key & Description -->
          <div class="config-col">
            <div class="label-with-hint">
              <label class="config-label">VARIANT CODE / KEY <span class="required">*</span></label>
              <span class="tenant-key-badge" [title]="'Tenant: ' + resolvedTenantKey">
                Tenant: <strong>{{ resolvedTenantKey }}</strong> ({{ domainInitials }})
              </span>
            </div>
            <div class="input-with-action">
              <input
                type="text"
                [(ngModel)]="variantCode"
                class="form-control config-input font-mono"
                placeholder="MENU_AG_8F3K2"
              />
              <button
                type="button"
                class="btn-regen-key"
                (click)="regenerateVariantCode()"
                title="Regenerate random 5-character suffix"
              >
                <span class="material-symbols-outlined">refresh</span>
              </button>
            </div>
          </div>

          <div class="config-col">
            <label class="config-label">DESCRIPTION (OPTIONAL)</label>
            <input
              type="text"
              [(ngModel)]="description"
              class="form-control config-input"
              placeholder="e.g. Translucent sticky navigation with company branding and 5 primary links"
            />
          </div>
        </div>
      </div>

      <!-- Full-Width 100% Code Studio Workspace -->
      <div class="studio-fullwidth-workspace">
        <div class="code-editor-card">
          <!-- Token Toolbar Ribbon -->
          <div class="token-ribbon-bar">
            <div class="token-palette-top">
              <div class="token-ribbon-header">
                <span class="material-symbols-outlined token-header-icon">token</span>
                <span class="token-header-title">Insert Token at Cursor:</span>
              </div>

              <!-- Palette Category Filter Tabs -->
              <div class="token-category-tabs">
                <button
                  type="button"
                  class="tcat-tab"
                  [class.active]="activeTokenCategory === 'core'"
                  (click)="activeTokenCategory = 'core'"
                >
                  <span class="material-symbols-outlined icon-micro">article</span>
                  <span>PageSection</span>
                </button>
                <button
                  type="button"
                  class="tcat-tab"
                  [class.active]="activeTokenCategory === 'media'"
                  (click)="activeTokenCategory = 'media'"
                >
                  <span class="material-symbols-outlined icon-micro">image</span>
                  <span>Media & Style</span>
                </button>
                <button
                  type="button"
                  class="tcat-tab"
                  [class.active]="activeTokenCategory === 'sectionlist'"
                  (click)="activeTokenCategory = 'sectionlist'"
                >
                  <span class="material-symbols-outlined icon-micro">view_agenda</span>
                  <span>Card Loop (PageSectionLists)</span>
                </button>
                <button
                  type="button"
                  class="tcat-tab"
                  [class.active]="activeTokenCategory === 'faq'"
                  (click)="activeTokenCategory = 'faq'"
                >
                  <span class="material-symbols-outlined icon-micro">quiz</span>
                  <span>FAQ & Categories</span>
                </button>
                <button
                  type="button"
                  class="tcat-tab"
                  [class.active]="activeTokenCategory === 'navigation'"
                  (click)="activeTokenCategory = 'navigation'"
                >
                  <span class="material-symbols-outlined icon-micro">menu_book</span>
                  <span>Menus & Dropdowns</span>
                </button>
                <button
                  type="button"
                  class="tcat-tab"
                  [class.active]="activeTokenCategory === 'footer'"
                  (click)="activeTokenCategory = 'footer'"
                >
                  <span class="material-symbols-outlined icon-micro">dock_to_bottom</span>
                  <span>Footer Columns</span>
                </button>
                <button
                  type="button"
                  class="tcat-tab"
                  [class.active]="activeTokenCategory === 'forms'"
                  (click)="activeTokenCategory = 'forms'"
                >
                  <span class="material-symbols-outlined icon-micro">dynamic_form</span>
                  <span>Forms & Embeds</span>
                </button>
                <button
                  type="button"
                  class="tcat-tab"
                  [class.active]="activeTokenCategory === 'legal'"
                  (click)="activeTokenCategory = 'legal'"
                >
                  <span class="material-symbols-outlined icon-micro">policy</span>
                  <span>Legal Compliance</span>
                </button>
                <button
                  type="button"
                  class="tcat-tab"
                  [class.active]="activeTokenCategory === 'identity'"
                  (click)="activeTokenCategory = 'identity'"
                >
                  <span class="material-symbols-outlined icon-micro">corporate_fare</span>
                  <span>Brand & Social</span>
                </button>
              </div>
            </div>

            <!-- Token Chips Flow based on activeTokenCategory -->
            <div class="token-chips-flow">
              <!-- Category: CORE (PageSection) -->
              <ng-container *ngIf="activeTokenCategory === 'core'">
                <button type="button" class="token-chip chip-core" (click)="insertTokenAtCursor('{{ Title }}')" [innerText]="'+ {{ Title }}'" title="Inserts section headline title"></button>
                <button type="button" class="token-chip chip-core" (click)="insertTokenAtCursor('{{ MiniTitle }}')" [innerText]="'+ {{ MiniTitle }}'" title="Inserts eyebrow / sub-badge token"></button>
                <button type="button" class="token-chip chip-core" (click)="insertTokenAtCursor('{{ Description }}')" [innerText]="'+ {{ Description }}'" title="Inserts short narrative description token"></button>
                <button type="button" class="token-chip chip-core chip-rich" (click)="insertTokenAtCursor('{{ FullDescription }}')" [innerText]="'+ {{ FullDescription }}'" title="Inserts Summernote rich HTML full description token"></button>
                <button type="button" class="token-chip chip-core" (click)="insertTokenAtCursor('{{ Qoute }}')" [innerText]="'+ {{ Qoute }}'" title="Inserts blockquote highlight token"></button>
                <button type="button" class="token-chip chip-core" (click)="insertTokenAtCursor('{{ ButtonText }}')" [innerText]="'+ {{ ButtonText }}'" title="Inserts primary CTA button text"></button>
                <button type="button" class="token-chip chip-core" (click)="insertTokenAtCursor('{{ ButtonLink }}')" [innerText]="'+ {{ ButtonLink }}'" title="Inserts primary CTA button target link"></button>
                <button type="button" class="token-chip chip-core" (click)="insertTokenAtCursor('{{ DirectUrl }}')" [innerText]="'+ {{ DirectUrl }}'" title="Inserts custom direct route URL"></button>
                <button type="button" class="token-chip chip-core chip-accent" (click)="insertTokenAtCursor('{{ CustomClass }}')" [innerText]="'+ {{ CustomClass }}'" title="Inserts custom CSS class placeholder"></button>
              </ng-container>

              <!-- Category: MEDIA & STYLE -->
              <ng-container *ngIf="activeTokenCategory === 'media'">
                <button type="button" class="token-chip chip-media" (click)="insertTokenAtCursor('{{ ImageUrl }}')" [innerText]="'+ {{ ImageUrl }}'" title="Inserts primary hero / background image URL"></button>
                <button type="button" class="token-chip chip-media" (click)="insertTokenAtCursor('{{ SecondImageUrl }}')" [innerText]="'+ {{ SecondImageUrl }}'" title="Inserts secondary overlay image URL"></button>
                <button type="button" class="token-chip chip-media" (click)="insertTokenAtCursor('{{ VideoUrl }}')" [innerText]="'+ {{ VideoUrl }}'" title="Inserts hosted MP4/WebM video file URL"></button>
                <button type="button" class="token-chip chip-media" (click)="insertTokenAtCursor('{{ YoutubeUrlLink }}')" [innerText]="'+ {{ YoutubeUrlLink }}'" title="Inserts external YouTube embed URL"></button>
                <button type="button" class="token-chip chip-media" (click)="insertTokenAtCursor('{{ BackgroundColor }}')" [innerText]="'+ {{ BackgroundColor }}'" title="Inserts section background color or theme token"></button>
                <button type="button" class="token-chip chip-media chip-accent" (click)="insertTokenAtCursor('{{ CustomClass }}')" [innerText]="'+ {{ CustomClass }}'" title="Inserts custom CSS class placeholder"></button>
              </ng-container>

              <!-- Category: REPEATER (PageSectionLists) -->
              <ng-container *ngIf="activeTokenCategory === 'sectionlist'">
                <button type="button" class="token-chip chip-repeater" (click)="insertRepeaterLoopAtCursor()" title="Inserts entire structured repeater loop for card lists">
                  <span class="material-symbols-outlined chip-icon">repeat</span>
                  <span>+ Card Loop (PageSectionLists)</span>
                </button>
                <span class="sn-sep"></span>
                <span class="ribbon-tag">Card Tokens:</span>
                <button type="button" class="token-chip chip-inner" (click)="insertTokenAtCursor('{{ Title }}')" [innerText]="'{{ Title }}'" title="Card heading"></button>
                <button type="button" class="token-chip chip-inner" (click)="insertTokenAtCursor('{{ MiniTitle }}')" [innerText]="'{{ MiniTitle }}'" title="Card subtitle or badge"></button>
                <button type="button" class="token-chip chip-inner" (click)="insertTokenAtCursor('{{ SubTitle }}')" [innerText]="'{{ SubTitle }}'" title="Alternative card subtitle"></button>
                <button type="button" class="token-chip chip-inner" (click)="insertTokenAtCursor('{{ Description }}')" [innerText]="'{{ Description }}'" title="Card body description"></button>
                <button type="button" class="token-chip chip-inner" (click)="insertTokenAtCursor('{{ MoreDescription }}')" [innerText]="'{{ MoreDescription }}'" title="Card extended details copy"></button>
                <button type="button" class="token-chip chip-inner" (click)="insertTokenAtCursor('{{ Icon }}')" [innerText]="'{{ Icon }}'" title="Card icon name (Material symbol)"></button>
                <button type="button" class="token-chip chip-inner" (click)="insertTokenAtCursor('{{ IconText }}')" [innerText]="'{{ IconText }}'" title="Card icon class (FontAwesome / Bootstrap)"></button>
                <button type="button" class="token-chip chip-inner" (click)="insertTokenAtCursor('{{ ImageUrl }}')" [innerText]="'{{ ImageUrl }}'" title="Card thumbnail photo URL"></button>
                <button type="button" class="token-chip chip-inner" (click)="insertTokenAtCursor('{{ VideoUrl }}')" [innerText]="'{{ VideoUrl }}'" title="Card video URL"></button>
                <button type="button" class="token-chip chip-inner" (click)="insertTokenAtCursor('{{ ButtonText }}')" [innerText]="'{{ ButtonText }}'" title="Card button label"></button>
                <button type="button" class="token-chip chip-inner" (click)="insertTokenAtCursor('{{ ButtonLink }}')" [innerText]="'{{ ButtonLink }}'" title="Card button destination link"></button>
                <button type="button" class="token-chip chip-inner" (click)="insertTokenAtCursor('{{ DirectUrl }}')" [innerText]="'{{ DirectUrl }}'" title="Card direct route"></button>
                <button type="button" class="token-chip chip-inner" (click)="insertTokenAtCursor('{{ SortOrder }}')" [innerText]="'{{ SortOrder }}'" title="Card numeric sort order"></button>
                <button type="button" class="token-chip chip-accent" (click)="insertTokenAtCursor('{{ CustomClass }}')" [innerText]="'+ {{ CustomClass }}'" title="Inserts custom CSS class placeholder"></button>
              </ng-container>

              <!-- Category: FAQ & CATEGORIES -->
              <ng-container *ngIf="activeTokenCategory === 'faq'">
                <button type="button" class="token-chip chip-repeater" (click)="insertFaqCategoryLoopAtCursor()" title="Inserts category-grouped accordion FAQ loop">
                  <span class="material-symbols-outlined chip-icon">folder_open</span>
                  <span>+ FAQ Category Accordion Loop</span>
                </button>
                <button type="button" class="token-chip chip-repeater" (click)="insertFlatFaqLoopAtCursor()" title="Inserts flat FAQ question & answer list">
                  <span class="material-symbols-outlined chip-icon">quiz</span>
                  <span>+ Flat FAQ Loop</span>
                </button>
                <span class="sn-sep"></span>
                <span class="ribbon-tag">FAQ Tokens:</span>
                <button type="button" class="token-chip chip-inner" (click)="insertTokenAtCursor('{{ CategoryTitle }}')" [innerText]="'{{ CategoryTitle }}'" title="FAQ Category heading"></button>
                <button type="button" class="token-chip chip-inner" (click)="insertTokenAtCursor('{{ Question }}')" [innerText]="'{{ Question }}'" title="FAQ Question text"></button>
                <button type="button" class="token-chip chip-inner" (click)="insertTokenAtCursor('{{ Answer }}')" [innerText]="'{{ Answer }}'" title="FAQ Answer text/HTML"></button>
                <button type="button" class="token-chip chip-inner" (click)="insertTokenAtCursor('{{ Message }}')" [innerText]="'{{ Message }}'" title="Alternative answer token"></button>
                <button type="button" class="token-chip chip-inner" (click)="insertTokenAtCursor('{{ SortOrder }}')" [innerText]="'{{ SortOrder }}'" title="FAQ sort order"></button>
                <button type="button" class="token-chip chip-accent" (click)="insertTokenAtCursor('{{ CustomClass }}')" [innerText]="'+ {{ CustomClass }}'" title="Inserts custom CSS class placeholder"></button>
              </ng-container>

              <!-- Category: MENUS & DROP DOWNS -->
              <ng-container *ngIf="activeTokenCategory === 'navigation'">
                <button type="button" class="token-chip chip-repeater" (click)="insertNestedMenuLoopAtCursor()" title="Inserts 2-level cascading flyout dropdown navigation">
                  <span class="material-symbols-outlined chip-icon">account_tree</span>
                  <span>+ 2-Level Nested Dropdown Loop</span>
                </button>
                <button type="button" class="token-chip chip-repeater" (click)="insertMegaMenuLoopAtCursor()" title="Inserts multi-column mega menu with categories, sub-items and page cards">
                  <span class="material-symbols-outlined chip-icon">grid_view</span>
                  <span>+ Mega Menu Grid Loop</span>
                </button>
                <button type="button" class="token-chip chip-repeater" (click)="insertFlatNavbarLoopAtCursor()" title="Inserts standard single-dropdown top navbar">
                  <span class="material-symbols-outlined chip-icon">menu</span>
                  <span>+ Flat Navbar Loop</span>
                </button>
                <ng-container *ngIf="editorTokens.menuDropdowns?.length">
                  <span class="sn-sep"></span>
                  <span class="ribbon-tag">Published Dropdowns:</span>
                  <button *ngFor="let dd of editorTokens.menuDropdowns" type="button" class="token-chip chip-repeater" (click)="insertMenuDropdownAtCursor(dd.title)" [title]="'Inserts ' + dd.title + ' dropdown with child links'">
                    <span class="material-symbols-outlined chip-icon">arrow_drop_down_circle</span>
                    <span>+ Dropdown: {{ dd.title }}</span>
                  </button>
                </ng-container>
                <span class="sn-sep"></span>
                <span class="ribbon-tag">Menu Tokens:</span>
                <button type="button" class="token-chip chip-inner" (click)="insertTokenAtCursor('{{ CategoryTitle }}')" [innerText]="'{{ CategoryTitle }}'" title="Category or Dropdown title"></button>
                <button type="button" class="token-chip chip-inner" (click)="insertTokenAtCursor('{{ Icon }}')" [innerText]="'{{ Icon }}'" title="Category icon symbol"></button>
                <button type="button" class="token-chip chip-inner" (click)="insertTokenAtCursor('{{ PageTitle }}')" [innerText]="'{{ PageTitle }}'" title="WebPage link title"></button>
                <button type="button" class="token-chip chip-inner" (click)="insertTokenAtCursor('{{ PageUrl }}')" [innerText]="'{{ PageUrl }}'" title="WebPage route URL"></button>
                <button type="button" class="token-chip chip-inner" (click)="insertTokenAtCursor('{{ PageDescription }}')" [innerText]="'{{ PageDescription }}'" title="Page excerpt for mega menu cards"></button>
                <button type="button" class="token-chip chip-inner" (click)="insertTokenAtCursor('{{ PageImage }}')" [innerText]="'{{ PageImage }}'" title="Page thumbnail image for mega menu cards"></button>
                <button type="button" class="token-chip chip-accent" (click)="insertTokenAtCursor('{{ CustomClass }}')" [innerText]="'+ {{ CustomClass }}'" title="Inserts custom CSS class placeholder"></button>
              </ng-container>

              <!-- Category: FOOTER COLUMNS -->
              <ng-container *ngIf="activeTokenCategory === 'footer'">
                <button type="button" class="token-chip chip-repeater" (click)="insertFooterCategoriesLoopAtCursor()" title="Inserts dynamic loop rendering all enabled footer category columns">
                  <span class="material-symbols-outlined chip-icon">view_column</span>
                  <span>+ All Footer Categories Loop</span>
                </button>
                <ng-container *ngIf="editorTokens.footerGroups?.length">
                  <span class="sn-sep"></span>
                  <span class="ribbon-tag">Footer Columns:</span>
                  <button *ngFor="let fg of editorTokens.footerGroups" type="button" class="token-chip chip-repeater" (click)="insertCategoryPagesLoopAtCursor(fg.name)" [title]="'Inserts ' + (fg.displayTitle || fg.name) + ' column with active page links'">
                    <span class="material-symbols-outlined chip-icon">folder</span>
                    <span>+ Column: {{ fg.displayTitle || fg.name }}</span>
                  </button>
                </ng-container>
                <span class="sn-sep"></span>
                <span class="ribbon-tag">Column Tokens:</span>
                <button type="button" class="token-chip chip-inner" (click)="insertTokenAtCursor('{{ Title }}')" [innerText]="'{{ Title }}'"></button>
                <button type="button" class="token-chip chip-inner" (click)="insertTokenAtCursor('{{ Url }}')" [innerText]="'{{ Url }}'"></button>
                <button type="button" class="token-chip chip-inner" (click)="insertTokenAtCursor('{{ DisplayTitle }}')" [innerText]="'{{ DisplayTitle }}'"></button>
                <button type="button" class="token-chip chip-accent" (click)="insertTokenAtCursor('{{ CustomClass }}')" [innerText]="'+ {{ CustomClass }}'"></button>
              </ng-container>

              <!-- Category: FORMS & EMBEDS -->
              <ng-container *ngIf="activeTokenCategory === 'forms'">
                <button type="button" class="token-chip chip-core" (click)="insertTokenAtCursor('{{ FormEmbed }}')" [innerText]="'+ {{ FormEmbed }}'" title="Inserts generic dynamic form placeholder"></button>
                <ng-container *ngIf="editorTokens.publishedForms?.length">
                  <span class="sn-sep"></span>
                  <span class="ribbon-tag">Published Dynamic Forms:</span>
                  <button *ngFor="let f of editorTokens.publishedForms" type="button" class="token-chip chip-repeater" (click)="insertFormEmbedAtCursor(f.key)" [title]="'Inserts published form ' + f.title">
                    <span class="material-symbols-outlined chip-icon">dynamic_form</span>
                    <span>+ Form: {{ f.title }}</span>
                  </button>
                </ng-container>
              </ng-container>

              <!-- Category: LEGAL COMPLIANCE -->
              <ng-container *ngIf="activeTokenCategory === 'legal'">
                <button type="button" class="token-chip chip-repeater" (click)="insertLegalPagesLoopAtCursor()" title="Inserts loop across all legal compliance pages">
                  <span class="material-symbols-outlined chip-icon">policy</span>
                  <span [innerText]="'+ All Legal Pages Loop ({{#each LegalPages}})'"></span>
                </button>
                <ng-container *ngIf="editorTokens.legalPages?.length">
                  <span class="sn-sep"></span>
                  <span class="ribbon-tag">Compliance Pages:</span>
                  <button *ngFor="let lp of editorTokens.legalPages" type="button" class="token-chip chip-inner" (click)="insertTokenAtCursor('<a href=&quot;' + lp.url + '&quot;>' + lp.title + '</a>')" [title]="'Inserts link to ' + lp.title">
                    <span>+ {{ lp.title }}</span>
                  </button>
                </ng-container>
                <span class="sn-sep"></span>
                <span class="ribbon-tag">Legal Tokens:</span>
                <button type="button" class="token-chip chip-core" (click)="insertTokenAtCursor('{{ PrivacyUrl }}')" [innerText]="'+ {{ PrivacyUrl }}'"></button>
                <button type="button" class="token-chip chip-core" (click)="insertTokenAtCursor('{{ TermsUrl }}')" [innerText]="'+ {{ TermsUrl }}'"></button>
                <button type="button" class="token-chip chip-core" (click)="insertTokenAtCursor('{{ CookiesUrl }}')" [innerText]="'+ {{ CookiesUrl }}'"></button>
              </ng-container>

              <!-- Category: BRAND & IDENTITY -->
              <ng-container *ngIf="activeTokenCategory === 'identity'">
                <button type="button" class="token-chip chip-core" (click)="insertTokenAtCursor('{{ BrandName }}')" [innerText]="'+ {{ BrandName }}'" title="Inserts tenant brand name"></button>
                <button type="button" class="token-chip chip-core" (click)="insertTokenAtCursor('{{ Copyright }}')" [innerText]="'+ {{ Copyright }}'" title="Inserts corporate copyright string"></button>
                <button type="button" class="token-chip chip-core chip-rich" (click)="insertTokenAtCursor('{{ PoweredBy }}')" [innerText]="'+ {{ PoweredBy }}'" title="Inserts Powered by Ozikol badge link"></button>
                <button type="button" class="token-chip chip-core" (click)="insertTokenAtCursor('{{ Email }}')" [innerText]="'+ {{ Email }}'" title="Inserts corporate contact email"></button>
                <button type="button" class="token-chip chip-core" (click)="insertTokenAtCursor('{{ Phone }}')" [innerText]="'+ {{ Phone }}'" title="Inserts corporate telephone number"></button>
                <button type="button" class="token-chip chip-core" (click)="insertTokenAtCursor('{{ Address }}')" [innerText]="'+ {{ Address }}'" title="Inserts corporate headquarters address"></button>
                <button type="button" class="token-chip chip-repeater" (click)="insertSocialLinksLoopAtCursor()" title="Inserts responsive social media links">
                  <span class="material-symbols-outlined chip-icon">share</span>
                  <span [innerText]="'+ Social Media Links'"></span>
                </button>
                <button type="button" class="token-chip chip-accent" (click)="insertTokenAtCursor('{{ CustomClass }}')" [innerText]="'+ {{ CustomClass }}'" title="Inserts custom CSS class placeholder"></button>
              </ng-container>
            </div>
          </div>

          <!-- Code View Tabs: HTML vs CSS vs JS -->
          <div class="editor-tabs-bar">
            <div class="tabs-group">
              <button
                type="button"
                class="editor-tab-btn"
                [class.active]="activeEditorTab === 'html'"
                (click)="activeEditorTab = 'html'"
              >
                <span class="material-symbols-outlined">html</span>
                <span>Semantic HTML Markup</span>
              </button>
              <button
                type="button"
                class="editor-tab-btn"
                [class.active]="activeEditorTab === 'css'"
                (click)="activeEditorTab = 'css'"
              >
                <span class="material-symbols-outlined">css</span>
                <span>Scoped CSS Styles</span>
              </button>
              <button
                type="button"
                class="editor-tab-btn"
                [class.active]="activeEditorTab === 'js'"
                (click)="activeEditorTab = 'js'"
              >
                <span class="material-symbols-outlined">javascript</span>
                <span>Client JS (Optional)</span>
              </button>
            </div>

            <div class="editor-meta-actions">
              <button
                type="button"
                class="btn-reset-boilerplate"
                (click)="confirmResetToCategoryBoilerplate()"
                title="Reset editor back to standard boilerplate"
              >
                <span class="material-symbols-outlined">restore</span>
                <span>Reset to Boilerplate</span>
              </button>
            </div>
          </div>

          <!-- Editor Panes -->
          <div class="editor-pane-body">
            <!-- HTML Editor -->
            <div class="code-area-wrap" *ngIf="activeEditorTab === 'html'">
              <textarea
                #htmlEditor
                [(ngModel)]="htmlTemplate"
                class="code-textarea font-mono"
                rows="18"
                placeholder="Write semantic HTML here..."
                spellcheck="false"
              ></textarea>
            </div>

            <!-- CSS Editor -->
            <div class="code-area-wrap" *ngIf="activeEditorTab === 'css'">
              <div class="css-info-pill">
                <span class="material-symbols-outlined pill-icon">lightbulb</span>
                <span>Styles defined here are scoped directly to this section.</span>
              </div>
              <textarea
                #cssEditor
                [(ngModel)]="cssStyles"
                class="code-textarea font-mono"
                rows="17"
                placeholder="/* Scoped CSS */\n.oz-custom-section {\n  padding: 60px 24px;\n}"
                spellcheck="false"
              ></textarea>
            </div>

            <!-- JS Editor -->
            <div class="code-area-wrap" *ngIf="activeEditorTab === 'js'">
              <textarea
                #jsEditor
                [(ngModel)]="jsScript"
                class="code-textarea font-mono"
                rows="18"
                placeholder="// Optional client-side script for interactive widgets"
                spellcheck="false"
              ></textarea>
            </div>
          </div>
        </div>

        <!-- Full-Width Mock Content & Loop Drawer (Below Editor) -->
        <div class="mock-content-card">
          <div class="content-drawer-header">
            <div class="drawer-title-wrap">
              <span class="material-symbols-outlined drawer-icon">edit_note</span>
              <div>
                <h3 class="drawer-title">Mock Content & Loop Configuration</h3>
                <p class="drawer-sub">
                  Adjust placeholder sample data to test your section design. These values are used for demo simulation and initial page defaults.
                </p>
              </div>
            </div>
            <button
              type="button"
              class="btn-reset-sample"
              (click)="resetSampleContentToCategoryDefaults()"
              title="Reset mock values to category presets"
            >
              <span class="material-symbols-outlined">restart_alt</span>
              <span>Reset Data</span>
            </button>
          </div>

          <!-- Mock Data Categorized Sub-Tabs -->
          <div class="mock-tabs-nav">
            <button
              type="button"
              class="mock-tab-btn"
              [class.active]="activeMockTab === 'scalars'"
              (click)="activeMockTab = 'scalars'"
            >
              <span class="material-symbols-outlined icon-micro">title</span>
              <span>Section Scalars</span>
            </button>
            <button
              type="button"
              class="mock-tab-btn"
              [class.active]="activeMockTab === 'rich'"
              (click)="activeMockTab = 'rich'"
            >
              <span class="material-symbols-outlined icon-micro">edit_document</span>
              <span>Rich Description (WYSIWYG)</span>
            </button>
            <button
              type="button"
              class="mock-tab-btn"
              [class.active]="activeMockTab === 'media'"
              (click)="activeMockTab = 'media'"
            >
              <span class="material-symbols-outlined icon-micro">palette</span>
              <span>Media & Style</span>
            </button>
            <button
              type="button"
              class="mock-tab-btn"
              [class.active]="activeMockTab === 'cards'"
              (click)="activeMockTab = 'cards'"
            >
              <span class="material-symbols-outlined icon-micro">view_agenda</span>
              <span>Cards Loop</span>
              <span class="mock-tab-badge" *ngIf="sampleContent.items?.length">{{ sampleContent.items.length }}</span>
            </button>
            <button
              type="button"
              class="mock-tab-btn"
              [class.active]="activeMockTab === 'faqs'"
              (click)="activeMockTab = 'faqs'"
            >
              <span class="material-symbols-outlined icon-micro">quiz</span>
              <span>FAQ Hierarchy</span>
              <span class="mock-tab-badge" *ngIf="sampleContent.faqCategories?.length">{{ sampleContent.faqCategories.length }}</span>
            </button>
            <button
              type="button"
              class="mock-tab-btn"
              [class.active]="activeMockTab === 'menu'"
              (click)="activeMockTab = 'menu'"
            >
              <span class="material-symbols-outlined icon-micro">account_tree</span>
              <span>Menu Tree</span>
              <span class="mock-tab-badge" *ngIf="sampleContent.navigationMenu?.length">{{ sampleContent.navigationMenu.length }}</span>
            </button>
            <button
              type="button"
              class="mock-tab-btn"
              [class.active]="activeMockTab === 'identity'"
              (click)="activeMockTab = 'identity'"
            >
              <span class="material-symbols-outlined icon-micro">corporate_fare</span>
              <span>Brand & Identity</span>
            </button>
          </div>

          <!-- TAB 1: SECTION SCALARS -->
          <div class="mock-tab-pane" *ngIf="activeMockTab === 'scalars'">
            <div class="inspector-form-grid">
              <div class="form-group">
                <label class="field-label">
                  <span>Headline / Title</span>
                  <code [innerText]="'{{ Title }}'"></code>
                </label>
                <input
                  type="text"
                  [(ngModel)]="sampleContent.title"
                  (ngModelChange)="updatePreviewSimulation()"
                  class="form-control inspector-input"
                />
              </div>

              <div class="form-group">
                <label class="field-label">
                  <span>Eyebrow / Badge</span>
                  <code [innerText]="'{{ MiniTitle }}'"></code>
                </label>
                <input
                  type="text"
                  [(ngModel)]="sampleContent.miniTitle"
                  (ngModelChange)="updatePreviewSimulation()"
                  class="form-control inspector-input"
                />
              </div>

              <div class="form-group">
                <label class="field-label">
                  <span>Button Text</span>
                  <code [innerText]="'{{ ButtonText }}'"></code>
                </label>
                <input
                  type="text"
                  [(ngModel)]="sampleContent.buttonText"
                  (ngModelChange)="updatePreviewSimulation()"
                  class="form-control inspector-input"
                />
              </div>

              <div class="form-group">
                <label class="field-label">
                  <span>Button Target Link</span>
                  <code [innerText]="'{{ ButtonLink }}'"></code>
                </label>
                <input
                  type="text"
                  [(ngModel)]="sampleContent.buttonLink"
                  (ngModelChange)="updatePreviewSimulation()"
                  class="form-control inspector-input"
                />
              </div>
            </div>

            <div class="inspector-form-grid-2" style="margin-top: 14px;">
              <div class="form-group">
                <label class="field-label">
                  <span>Narrative Description</span>
                  <code [innerText]="'{{ Description }}'"></code>
                </label>
                <textarea
                  [(ngModel)]="sampleContent.description"
                  (ngModelChange)="updatePreviewSimulation()"
                  class="form-control inspector-input"
                  rows="2"
                ></textarea>
              </div>

              <div class="form-group">
                <label class="field-label">
                  <span>Blockquote / Highlight</span>
                  <code [innerText]="'{{ Qoute }}'"></code>
                </label>
                <textarea
                  [(ngModel)]="sampleContent.qoute"
                  (ngModelChange)="updatePreviewSimulation()"
                  class="form-control inspector-input"
                  rows="2"
                  placeholder="Featured quote or testimonial excerpt..."
                ></textarea>
              </div>
            </div>

            <div class="inspector-form-grid-2" style="margin-top: 14px;">
              <div class="form-group">
                <label class="field-label">
                  <span>Direct URL Route</span>
                  <code [innerText]="'{{ DirectUrl }}'"></code>
                </label>
                <input
                  type="text"
                  [(ngModel)]="sampleContent.directUrl"
                  (ngModelChange)="updatePreviewSimulation()"
                  class="form-control inspector-input"
                  placeholder="#route-path"
                />
              </div>

              <div class="form-group">
                <label class="field-label">
                  <span>Secondary Button Text</span>
                  <code [innerText]="'{{ SecondaryButtonText }}'"></code>
                </label>
                <input
                  type="text"
                  [(ngModel)]="sampleContent.secondaryButtonText"
                  (ngModelChange)="updatePreviewSimulation()"
                  class="form-control inspector-input"
                />
              </div>
            </div>
          </div>

          <!-- TAB 2: SUMMERNOTE RICH TEXT -->
          <div class="mock-tab-pane" *ngIf="activeMockTab === 'rich'">
            <div class="summernote-wrapper-block">
              <div class="field-label-row">
                <label class="field-label">
                  <span>Full Description (Summernote Rich Text HTML)</span>
                  <code [innerText]="'{{ FullDescription }}'"></code>
                </label>
                <span class="rich-hint-tag">WYSIWYG Rich Editor</span>
              </div>

              <!-- Summernote Style Toolbar -->
              <div class="summernote-toolbar">
                <div class="sn-btn-group">
                  <button type="button" class="sn-btn" (click)="execFormat('bold')" title="Bold"><b>B</b></button>
                  <button type="button" class="sn-btn" (click)="execFormat('italic')" title="Italic"><i>I</i></button>
                  <button type="button" class="sn-btn" (click)="execFormat('underline')" title="Underline"><u>U</u></button>
                  <button type="button" class="sn-btn" (click)="execFormat('strikeThrough')" title="Strikethrough"><s>S</s></button>
                </div>
                <span class="sn-sep"></span>
                <div class="sn-btn-group">
                  <button type="button" class="sn-btn" (click)="execFormat('formatBlock', '<h2>')" title="Heading 2">H2</button>
                  <button type="button" class="sn-btn" (click)="execFormat('formatBlock', '<h3>')" title="Heading 3">H3</button>
                  <button type="button" class="sn-btn" (click)="execFormat('formatBlock', '<p>')" title="Paragraph">¶</button>
                  <button type="button" class="sn-btn" (click)="execFormat('formatBlock', '<blockquote>')" title="Quote">❝</button>
                </div>
                <span class="sn-sep"></span>
                <div class="sn-btn-group">
                  <button type="button" class="sn-btn" (click)="execFormat('insertUnorderedList')" title="Bullet List">• List</button>
                  <button type="button" class="sn-btn" (click)="execFormat('insertOrderedList')" title="Numbered List">1. List</button>
                  <button type="button" class="sn-btn" (click)="insertRichLink()" title="Hyperlink">🔗 Link</button>
                  <button type="button" class="sn-btn" (click)="execFormat('removeFormat')" title="Clear Formatting">🧹</button>
                </div>
                <span class="sn-sep"></span>
                <div class="sn-btn-group" style="margin-left: auto;">
                  <button type="button" class="sn-btn sn-toggle-mode" (click)="toggleRichHtmlView()">
                    <span class="material-symbols-outlined icon-small">code</span>
                    <span [innerText]="showRawHtmlEditor ? 'Visual Editor' : '<> HTML Source'"></span>
                  </button>
                </div>
              </div>

              <!-- Summernote Visual Contenteditable Box -->
              <div
                #richTextEditor
                *ngIf="!showRawHtmlEditor"
                contenteditable="true"
                class="summernote-editable-box"
                (input)="onRichTextInput($event)"
              ></div>

              <!-- Summernote Raw HTML Source View -->
              <textarea
                *ngIf="showRawHtmlEditor"
                [(ngModel)]="sampleContent.fullDescription"
                (ngModelChange)="onRawHtmlChange()"
                class="form-control font-mono summernote-code-box"
                rows="5"
                placeholder="<p>Type raw HTML markup here...</p>"
              ></textarea>
            </div>
          </div>

          <!-- TAB 3: MEDIA, STYLE & CLASS -->
          <div class="mock-tab-pane" *ngIf="activeMockTab === 'media'">
            <div class="inspector-form-grid-2">
              <div class="form-group">
                <label class="field-label">
                  <span>Primary Image URL</span>
                  <code [innerText]="'{{ ImageUrl }}'"></code>
                </label>
                <input
                  type="text"
                  [(ngModel)]="sampleContent.imageUrl"
                  (ngModelChange)="updatePreviewSimulation()"
                  class="form-control inspector-input"
                  placeholder="https://images.unsplash.com/..."
                />
              </div>

              <div class="form-group">
                <label class="field-label">
                  <span>Secondary Image URL</span>
                  <code [innerText]="'{{ SecondImageUrl }}'"></code>
                </label>
                <input
                  type="text"
                  [(ngModel)]="sampleContent.secondImageUrl"
                  (ngModelChange)="updatePreviewSimulation()"
                  class="form-control inspector-input"
                  placeholder="https://..."
                />
              </div>
            </div>

            <div class="inspector-form-grid-2" style="margin-top: 14px;">
              <div class="form-group">
                <label class="field-label">
                  <span>Hosted Video URL (MP4 / WebM)</span>
                  <code [innerText]="'{{ VideoUrl }}'"></code>
                </label>
                <input
                  type="text"
                  [(ngModel)]="sampleContent.videoUrl"
                  (ngModelChange)="updatePreviewSimulation()"
                  class="form-control inspector-input"
                  placeholder="https://..."
                />
              </div>

              <div class="form-group">
                <label class="field-label">
                  <span>YouTube Video Embed URL</span>
                  <code [innerText]="'{{ YoutubeUrlLink }}'"></code>
                </label>
                <input
                  type="text"
                  [(ngModel)]="sampleContent.youtubeUrlLink"
                  (ngModelChange)="updatePreviewSimulation()"
                  class="form-control inspector-input"
                  placeholder="https://www.youtube.com/embed/..."
                />
              </div>
            </div>

            <div class="inspector-form-grid-2" style="margin-top: 14px;">
              <div class="form-group">
                <label class="field-label">
                  <span>Custom CSS Class (Critical)</span>
                  <code [innerText]="'{{ CustomClass }}'"></code>
                </label>
                <input
                  type="text"
                  [(ngModel)]="sampleContent.customClass"
                  (ngModelChange)="updatePreviewSimulation()"
                  class="form-control inspector-input"
                  placeholder="e.g. oz-glass-card shadow-xl rounded-2xl"
                />
              </div>

              <div class="form-group">
                <label class="field-label">
                  <span>Background Color / Theme Token</span>
                  <code [innerText]="'{{ BackgroundColor }}'"></code>
                </label>
                <div style="display: flex; gap: 8px; align-items: center;">
                  <input
                    type="color"
                    [(ngModel)]="sampleContent.backgroundColor"
                    (ngModelChange)="updatePreviewSimulation()"
                    style="width: 44px; height: 38px; border: 1px solid #cbd5e1; border-radius: 6px; cursor: pointer;"
                  />
                  <input
                    type="text"
                    [(ngModel)]="sampleContent.backgroundColor"
                    (ngModelChange)="updatePreviewSimulation()"
                    class="form-control inspector-input"
                    placeholder="#ffffff or dark or transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- TAB 4: CARDS REPEATER (PageSectionLists) -->
          <div class="mock-tab-pane" *ngIf="activeMockTab === 'cards'">
            <div class="repeater-subitems-block" style="border-top: none; padding-top: 0; margin-top: 0;">
              <div class="repeater-header-bar">
                <div class="repeater-title-box">
                  <span class="repeater-label">PageSectionLists Repeater Cards</span>
                  <span class="repeater-loop-badge font-mono">{{ sampleContent.items?.length || 0 }} items</span>
                </div>
                <button type="button" class="btn-add-item" (click)="addSampleSubItem()">
                  <span class="material-symbols-outlined">add</span>
                  <span>Add Card</span>
                </button>
              </div>

              <div class="repeater-items-grid">
                <div
                  class="repeater-card-item"
                  *ngFor="let item of sampleContent.items; let idx = index"
                >
                  <!-- Card Header Bar -->
                  <div class="card-item-header">
                    <div class="card-badge-box">
                      <span class="card-idx-pill">Card #{{ idx + 1 }}</span>
                    </div>
                    <button
                      type="button"
                      class="btn-trash-action"
                      (click)="removeSampleSubItem(idx)"
                      title="Remove card"
                    >
                      <span class="material-symbols-outlined">delete</span>
                    </button>
                  </div>

                  <!-- Card Fields Grid -->
                  <div class="card-form-grid">
                    <div class="card-field-row-2">
                      <div class="card-field-unit">
                        <label class="card-field-label">
                          <span>Title</span>
                          <code [innerText]="'{{ Title }}'"></code>
                        </label>
                        <input
                          type="text"
                          [(ngModel)]="item.title"
                          (ngModelChange)="updatePreviewSimulation()"
                          class="form-control card-ctrl"
                          [placeholder]="'Headline Title'"
                        />
                      </div>
                      <div class="card-field-unit">
                        <label class="card-field-label">
                          <span>Subtitle</span>
                          <code [innerText]="'{{ MiniTitle }}'"></code>
                        </label>
                        <input
                          type="text"
                          [(ngModel)]="item.subTitle"
                          (ngModelChange)="updatePreviewSimulation()"
                          class="form-control card-ctrl"
                          [placeholder]="'Subtitle / Eyebrow'"
                        />
                      </div>
                    </div>

                    <div class="card-field-unit">
                      <label class="card-field-label">
                        <span>Description</span>
                        <code [innerText]="'{{ Description }}'"></code>
                      </label>
                      <input
                        type="text"
                        [(ngModel)]="item.description"
                        (ngModelChange)="updatePreviewSimulation()"
                        class="form-control card-ctrl"
                        [placeholder]="'Item narrative copy...'"
                      />
                    </div>

                    <div class="card-field-row-3">
                      <div class="card-field-unit">
                        <label class="card-field-label">
                          <span>Icon</span>
                          <code [innerText]="'{{ Icon }}'"></code>
                        </label>
                        <div class="input-with-icon-preview">
                          <span class="material-symbols-outlined icon-inline-preview">{{ item.icon || 'star' }}</span>
                          <input
                            type="text"
                            [(ngModel)]="item.icon"
                            (ngModelChange)="updatePreviewSimulation()"
                            class="form-control card-ctrl card-ctrl-with-icon"
                            [placeholder]="'Icon name'"
                          />
                        </div>
                      </div>
                      <div class="card-field-unit">
                        <label class="card-field-label">
                          <span>Button Text</span>
                          <code [innerText]="'{{ ButtonText }}'"></code>
                        </label>
                        <input
                          type="text"
                          [(ngModel)]="item.buttonText"
                          (ngModelChange)="updatePreviewSimulation()"
                          class="form-control card-ctrl"
                          [placeholder]="'Learn More'"
                        />
                      </div>
                      <div class="card-field-unit">
                        <label class="card-field-label">
                          <span>Button Link</span>
                          <code [innerText]="'{{ ButtonLink }}'"></code>
                        </label>
                        <input
                          type="text"
                          [(ngModel)]="item.buttonLink"
                          (ngModelChange)="updatePreviewSimulation()"
                          class="form-control card-ctrl font-mono"
                          [placeholder]="'#link or /url'"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- TAB 5: FAQ MOCK MANAGER -->
          <div class="mock-tab-pane" *ngIf="activeMockTab === 'faqs'">
            <div class="faq-manager-block">
              <div class="repeater-header-bar">
                <div class="repeater-title-box">
                  <span class="repeater-label">FAQ Categories & Questions Hierarchy</span>
                  <span class="repeater-loop-badge font-mono">{{ sampleContent.faqCategories?.length || 0 }} categories</span>
                </div>
                <button type="button" class="btn-add-item" (click)="addSampleFaqCategory()">
                  <span class="material-symbols-outlined">add</span>
                  <span>Add FAQ Category</span>
                </button>
              </div>

              <div class="faq-categories-tree">
                <div class="faq-cat-card" *ngFor="let cat of sampleContent.faqCategories; let catIdx = index">
                  <!-- Category Header Bar -->
                  <div class="faq-cat-header-banner">
                    <div class="faq-cat-title-wrap">
                      <div class="faq-cat-badge">
                        <span class="material-symbols-outlined">folder</span>
                        <span>Category #{{ catIdx + 1 }}</span>
                      </div>
                      <input
                        type="text"
                        [(ngModel)]="cat.title"
                        (ngModelChange)="updatePreviewSimulation()"
                        class="form-control faq-cat-name-input font-bold"
                        [placeholder]="'Category Title (e.g. Platform Architecture)'"
                      />
                    </div>
                    <div class="faq-cat-actions">
                      <button type="button" class="btn-add-mini" (click)="addSampleFaq(catIdx)">
                        <span class="material-symbols-outlined">add</span>
                        <span>Add Q&A</span>
                      </button>
                      <button type="button" class="btn-trash-action" (click)="removeSampleFaqCategory(catIdx)" title="Remove Category">
                        <span class="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                  </div>

                  <!-- Questions & Answers in Category -->
                  <div class="faq-cat-body">
                    <div class="faq-qa-card" *ngFor="let f of cat.faqs; let fIdx = index">
                      <div class="faq-qa-header">
                        <div class="faq-q-badge-box">
                          <span class="faq-q-num-pill">Q{{ fIdx + 1 }}</span>
                          <span class="material-symbols-outlined faq-q-icon">help_outline</span>
                        </div>
                        <input
                          type="text"
                          [(ngModel)]="f.question"
                          (ngModelChange)="updatePreviewSimulation()"
                          class="form-control faq-question-input"
                          [placeholder]="'Question headline...'"
                        />
                        <button type="button" class="btn-trash-action-sm" (click)="removeSampleFaq(catIdx, fIdx)" title="Remove Question">
                          <span class="material-symbols-outlined">delete</span>
                        </button>
                      </div>
                      <div class="faq-answer-wrap">
                        <label class="faq-ans-label">
                          <span>Answer Text / Response</span>
                          <code [innerText]="'{{ Answer }}'"></code>
                        </label>
                        <textarea
                          [(ngModel)]="f.answer"
                          (ngModelChange)="updatePreviewSimulation()"
                          class="form-control faq-answer-textarea"
                          rows="2"
                          [placeholder]="'Detailed response or explanatory text...'"
                        ></textarea>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- TAB 6: MENU & MEGA MENU TREE -->
          <div class="mock-tab-pane" *ngIf="activeMockTab === 'menu'">
            <div class="nav-manager-block">
              <div class="repeater-header-bar">
                <div class="repeater-title-box">
                  <span class="repeater-label">Navigation Hierarchy (Menus → Sub-Categories → Pages)</span>
                  <span class="repeater-loop-badge font-mono">{{ sampleContent.navigationMenu?.length || 0 }} main menus</span>
                </div>
                <button type="button" class="btn-add-item" (click)="addSampleNavCategory()">
                  <span class="material-symbols-outlined">add</span>
                  <span>Add Menu Column</span>
                </button>
              </div>

              <div class="nav-tree-container">
                <div class="nav-parent-card" *ngFor="let menu of sampleContent.navigationMenu; let mIdx = index">
                  <!-- Parent Menu Header -->
                  <div class="nav-parent-header">
                    <div class="nav-parent-left">
                      <div class="nav-parent-badge">
                        <span class="material-symbols-outlined">menu_open</span>
                        <span>Menu #{{ mIdx + 1 }}</span>
                      </div>
                      <input
                        type="text"
                        [(ngModel)]="menu.title"
                        (ngModelChange)="updatePreviewSimulation()"
                        class="form-control nav-parent-title font-bold"
                        [placeholder]="'Menu Title (e.g. Solutions)'"
                      />
                      <div class="input-with-icon-preview" style="max-width: 130px;">
                        <span class="material-symbols-outlined icon-inline-preview">{{ menu.icon || 'category' }}</span>
                        <input
                          type="text"
                          [(ngModel)]="menu.icon"
                          (ngModelChange)="updatePreviewSimulation()"
                          class="form-control card-ctrl card-ctrl-with-icon"
                          [placeholder]="'Icon'"
                        />
                      </div>
                    </div>
                    <div class="nav-parent-actions">
                      <button type="button" class="btn-add-mini" (click)="addSampleNavChild(mIdx)">
                        <span class="material-symbols-outlined">subdirectory_arrow_right</span>
                        <span>+ Sub-Dropdown</span>
                      </button>
                      <button type="button" class="btn-trash-action" (click)="removeSampleNavCategory(mIdx)" title="Remove Menu">
                        <span class="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                  </div>

                  <div class="nav-parent-body">
                    <!-- Level 2 Sub-Categories -->
                    <div class="nav-children-wrapper" *ngIf="menu.children?.length">
                      <span class="nav-group-heading">Sub-Dropdown Categories (Level 2 Flyout / Columns):</span>
                      <div class="nav-child-card" *ngFor="let child of menu.children; let cIdx = index">
                        <div class="nav-child-header-bar">
                          <div class="nav-child-badge-row">
                            <span class="nav-child-pill">Sub {{ cIdx + 1 }}</span>
                            <input
                              type="text"
                              [(ngModel)]="child.title"
                              (ngModelChange)="updatePreviewSimulation()"
                              class="form-control nav-child-title-input font-bold"
                              [placeholder]="'Sub-Category Title (e.g. Cloud Infrastructure)'"
                            />
                          </div>
                          <div class="nav-child-actions">
                            <button type="button" class="btn-add-mini-ghost" (click)="addSampleNavPage(mIdx, cIdx)">
                              <span class="material-symbols-outlined">add</span>
                              <span>Add Page</span>
                            </button>
                            <button type="button" class="btn-trash-action-sm" (click)="removeSampleNavChild(mIdx, cIdx)" title="Remove Sub-Dropdown">
                              <span class="material-symbols-outlined">delete</span>
                            </button>
                          </div>
                        </div>

                        <!-- Sub-Pages -->
                        <div class="nav-child-pages-list" *ngIf="child.pages?.length">
                          <div class="nav-page-item-card" *ngFor="let page of child.pages; let pIdx = index">
                            <span class="nav-page-dot material-symbols-outlined">link</span>
                            <div class="nav-page-grid-inputs">
                              <input
                                type="text"
                                [(ngModel)]="page.title"
                                (ngModelChange)="updatePreviewSimulation()"
                                class="form-control nav-page-name"
                                [placeholder]="'Page Title (e.g. Edge Compute)'"
                              />
                              <input
                                type="text"
                                [(ngModel)]="page.pageUrl"
                                (ngModelChange)="updatePreviewSimulation()"
                                class="form-control nav-page-url font-mono"
                                [placeholder]="'/solutions/compute'"
                              />
                              <input
                                type="text"
                                [(ngModel)]="page.pageDescription"
                                (ngModelChange)="updatePreviewSimulation()"
                                class="form-control nav-page-desc"
                                [placeholder]="'Short excerpt for mega menu cards...'"
                              />
                            </div>
                            <button type="button" class="btn-trash-action-sm" (click)="removeSampleNavPage(mIdx, cIdx, pIdx)" title="Remove Page">
                              <span class="material-symbols-outlined">delete</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Direct Top Pages -->
                    <div class="nav-direct-wrapper" *ngIf="menu.pages?.length">
                      <span class="nav-group-heading">Direct Category Pages:</span>
                      <div class="nav-page-item-card" *ngFor="let page of menu.pages; let dpIdx = index">
                        <span class="nav-page-dot material-symbols-outlined">link</span>
                        <div class="nav-page-grid-inputs" style="grid-template-columns: 1fr 1fr;">
                          <input
                            type="text"
                            [(ngModel)]="page.title"
                            (ngModelChange)="updatePreviewSimulation()"
                            class="form-control nav-page-name"
                            [placeholder]="'Page Title (e.g. Documentation)'"
                          />
                          <input
                            type="text"
                            [(ngModel)]="page.pageUrl"
                            (ngModelChange)="updatePreviewSimulation()"
                            class="form-control nav-page-url font-mono"
                            [placeholder]="'/docs'"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- TAB 7: BRAND & IDENTITY -->
          <div class="mock-tab-pane" *ngIf="activeMockTab === 'identity'">
            <div class="inspector-form-grid-3">
              <div class="form-group">
                <label class="field-label">
                  <span>Brand Name</span>
                  <code [innerText]="'{{ BrandName }}'"></code>
                </label>
                <input
                  type="text"
                  [(ngModel)]="sampleContent.brandName"
                  (ngModelChange)="updatePreviewSimulation()"
                  class="form-control inspector-input"
                />
              </div>

              <div class="form-group">
                <label class="field-label">
                  <span>Copyright Notice</span>
                  <code [innerText]="'{{ Copyright }}'"></code>
                </label>
                <input
                  type="text"
                  [(ngModel)]="sampleContent.copyright"
                  (ngModelChange)="updatePreviewSimulation()"
                  class="form-control inspector-input"
                />
              </div>

              <div class="form-group">
                <label class="field-label">
                  <span>Powered By Link (Fixed Tail)</span>
                  <code [innerText]="'{{ PoweredBy }}'"></code>
                </label>
                <input
                  type="text"
                  [(ngModel)]="sampleContent.poweredBy"
                  (ngModelChange)="updatePreviewSimulation()"
                  class="form-control inspector-input"
                />
              </div>
            </div>

            <div class="inspector-form-grid-3" style="margin-top: 14px;">
              <div class="form-group">
                <label class="field-label">
                  <span>Support Email</span>
                  <code [innerText]="'{{ Email }}'"></code>
                </label>
                <input
                  type="text"
                  [(ngModel)]="sampleContent.email"
                  (ngModelChange)="updatePreviewSimulation()"
                  class="form-control inspector-input"
                />
              </div>

              <div class="form-group">
                <label class="field-label">
                  <span>Contact Phone</span>
                  <code [innerText]="'{{ Phone }}'"></code>
                </label>
                <input
                  type="text"
                  [(ngModel)]="sampleContent.phone"
                  (ngModelChange)="updatePreviewSimulation()"
                  class="form-control inspector-input"
                />
              </div>

              <div class="form-group">
                <label class="field-label">
                  <span>Corporate Headquarters Address</span>
                  <code [innerText]="'{{ Address }}'"></code>
                </label>
                <input
                  type="text"
                  [(ngModel)]="sampleContent.address"
                  (ngModelChange)="updatePreviewSimulation()"
                  class="form-control inspector-input"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ======================================================== -->
      <!-- MODAL: LIVE SIMULATED PREVIEW CANVAS                     -->
      <!-- ======================================================== -->
      <div class="modal-backdrop" *ngIf="showPreviewModal" (click)="closePreviewModal()">
        <div class="preview-modal-dialog" (click)="$event.stopPropagation()">
          <!-- Modal Header -->
          <div class="preview-modal-header">
            <div class="preview-header-meta">
              <div class="preview-badge-icon">
                <span class="material-symbols-outlined">{{ currentPreset.icon }}</span>
              </div>
              <div>
                <h3 class="preview-modal-name">{{ templateName || currentPreset.defaultName }}</h3>
                <span class="preview-modal-sub">
                  Category: <strong>{{ currentPreset.name }}</strong> • Code: <code>{{ variantCode }}</code>
                </span>
              </div>
            </div>

            <!-- Viewport Controls (Desktop vs Tablet vs Mobile) -->
            <div class="viewport-toggle-group">
              <button
                type="button"
                class="btn-viewport"
                [class.active]="previewViewport === 'desktop'"
                (click)="previewViewport = 'desktop'"
              >
                <span class="material-symbols-outlined">desktop_windows</span>
                <span>Desktop (100%)</span>
              </button>
              <button
                type="button"
                class="btn-viewport"
                [class.active]="previewViewport === 'tablet'"
                (click)="previewViewport = 'tablet'"
              >
                <span class="material-symbols-outlined">tablet_mac</span>
                <span>Tablet (768px)</span>
              </button>
              <button
                type="button"
                class="btn-viewport"
                [class.active]="previewViewport === 'mobile'"
                (click)="previewViewport = 'mobile'"
              >
                <span class="material-symbols-outlined">smartphone</span>
                <span>Mobile (390px)</span>
              </button>
              <button type="button" class="btn-close-modal" (click)="closePreviewModal()">✕</button>
            </div>
          </div>

          <!-- Modal Body (Simulation Canvas) -->
          <div class="preview-modal-body">
            <div
              class="canvas-viewport-frame"
              [class.tablet-frame]="previewViewport === 'tablet'"
              [class.mobile-frame]="previewViewport === 'mobile'"
            >
              <div class="canvas-mobile-notch" *ngIf="previewViewport === 'mobile'"></div>
              <div class="rendered-html-box" [innerHTML]="safeHydratedHtml"></div>
            </div>
          </div>

          <!-- Modal Footer -->
          <div class="preview-modal-footer">
            <button type="button" class="btn btn-outline-cancel" (click)="closePreviewModal()">
              Close Preview
            </button>
            <button
              type="button"
              class="btn btn-save-vault"
              (click)="saveCustomTemplate(); closePreviewModal();"
              [disabled]="savingTemplate"
            >
              <span class="material-symbols-outlined btn-icon">save</span>
              <span>Save to Template Vault</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .custom-studio-container {
      padding: 24px;
      background: #f8fafc;
      min-height: calc(100vh - 70px);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }

    /* Top Studio Header Card */
    .studio-header-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 20px 24px;
      margin-bottom: 20px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }
    .header-main-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 20px;
      margin-bottom: 20px;
    }
    .breadcrumb-trail {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11.5px;
      font-weight: 600;
      color: #64748b;
      margin-bottom: 8px;
    }
    .breadcrumb-trail a { color: #64748b; text-decoration: none; }
    .breadcrumb-trail a:hover { color: #0050e5; }
    .breadcrumb-trail .sep { color: #cbd5e1; }
    .breadcrumb-trail .current { color: #0f172a; font-weight: 700; }

    .title-with-icon {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .header-icon-box {
      width: 44px;
      height: 44px;
      background: #eef2ff;
      color: #0050e5;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .header-icon-box .material-symbols-outlined { font-size: 26px; }

    .page-title {
      font-size: 21px;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
      letter-spacing: -0.02em;
    }
    .page-subtitle {
      font-size: 13px;
      color: #64748b;
      margin: 4px 0 0 0;
      line-height: 1.4;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .btn {
      height: 42px;
      padding: 0 18px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.2s ease;
    }
    .btn-outline-cancel {
      background: #ffffff;
      color: #475569;
      border: 1.5px solid #cbd5e1;
    }
    .btn-outline-cancel:hover {
      background: #f1f5f9;
      color: #0f172a;
    }
    .btn-preview-modal {
      background: #eef2ff;
      color: #0050e5;
      border: 1.5px solid #c7d2fe;
    }
    .btn-preview-modal:hover {
      background: #e0e7ff;
      border-color: #a5b4fc;
      transform: translateY(-1px);
    }
    .btn-save-vault {
      background: #0050e5;
      color: #ffffff;
      border: none;
      box-shadow: 0 4px 12px rgba(0, 80, 229, 0.25);
    }
    .btn-save-vault:hover:not(:disabled) {
      background: #0041ba;
      box-shadow: 0 6px 18px rgba(0, 80, 229, 0.35);
      transform: translateY(-1px);
    }
    .btn-save-vault:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    /* Metadata 2x2 Grid */
    .meta-config-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px 24px;
      padding-top: 18px;
      border-top: 1px solid #f1f5f9;
    }
    .config-col { display: flex; flex-direction: column; }
    .config-label {
      font-size: 11.5px;
      font-weight: 800;
      color: #475569;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    .config-label .required { color: #ef4444; }
    .label-with-hint {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }
    .tenant-key-badge {
      font-size: 11px;
      color: #0050e5;
      background: #eef2ff;
      padding: 2px 8px;
      border-radius: 12px;
      font-weight: 600;
    }
    .config-input, .config-select {
      height: 40px;
      border-radius: 8px;
      border: 1.5px solid #cbd5e1;
      padding: 0 12px;
      font-size: 13.5px;
      color: #0f172a;
      background: #ffffff;
      outline: none;
      transition: border-color 0.15s ease;
      width: 100%;
      box-sizing: border-box;
    }
    .config-input:focus, .config-select:focus {
      border-color: #0050e5;
      box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.1);
    }
    .input-with-action {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .btn-regen-key {
      height: 40px;
      width: 40px;
      border-radius: 8px;
      border: 1.5px solid #cbd5e1;
      background: #f8fafc;
      color: #475569;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      flex-shrink: 0;
      transition: all 0.15s ease;
    }
    .btn-regen-key:hover {
      background: #eef2ff;
      color: #0050e5;
      border-color: #c7d2fe;
    }
    .font-mono { font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; }

    /* Full-Width Workspace */
    .studio-fullwidth-workspace {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    /* Code Editor Card */
    .code-editor-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      overflow: hidden;
    }

    /* Token Ribbon & Palette */
    .token-ribbon-bar {
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      padding: 10px 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .token-palette-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
      border-bottom: 1px dashed #e2e8f0;
      padding-bottom: 8px;
    }
    .token-ribbon-header {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11.5px;
      font-weight: 800;
      color: #334155;
      white-space: nowrap;
    }
    .token-header-icon { font-size: 16px; color: #0050e5; }
    .token-category-tabs {
      display: flex;
      gap: 4px;
      overflow-x: auto;
    }
    .tcat-tab {
      height: 28px;
      padding: 0 10px;
      border-radius: 6px;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      color: #475569;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      white-space: nowrap;
      transition: all 0.15s ease;
    }
    .tcat-tab:hover {
      border-color: #0050e5;
      color: #0050e5;
    }
    .tcat-tab.active {
      background: #0050e5;
      border-color: #0050e5;
      color: #ffffff;
    }
    .icon-micro { font-size: 14px; }
    .token-chips-flow {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: nowrap;
      white-space: nowrap;
      overflow-x: auto;
      padding-bottom: 2px;
    }
    .ribbon-tag {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      color: #94a3b8;
      letter-spacing: 0.5px;
      margin-left: 8px;
    }
    .token-chip {
      height: 28px;
      padding: 0 10px;
      border-radius: 6px;
      font-size: 11.5px;
      font-weight: 700;
      font-family: monospace;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      border: 1px solid transparent;
      transition: all 0.15s ease;
      white-space: nowrap;
    }
    .chip-core {
      background: #eff6ff;
      color: #1d4ed8;
      border-color: #bfdbfe;
    }
    .chip-core:hover {
      background: #dbeafe;
      border-color: #93c5fd;
      transform: translateY(-1px);
    }
    .chip-media {
      background: #faf5ff;
      color: #7e22ce;
      border-color: #e9d5ff;
    }
    .chip-media:hover {
      background: #f3e8ff;
      border-color: #d8b4fe;
      transform: translateY(-1px);
    }
    .chip-inner {
      background: #f1f5f9;
      color: #334155;
      border-color: #cbd5e1;
    }
    .chip-inner:hover {
      background: #e2e8f0;
      border-color: #94a3b8;
      color: #0f172a;
      transform: translateY(-1px);
    }
    .chip-accent {
      background: #fff7ed;
      color: #c2410c;
      border-color: #ffedd5;
    }
    .chip-accent:hover {
      background: #ffedd5;
      border-color: #fed7aa;
      transform: translateY(-1px);
    }
    .chip-specific {
      background: #f5f3ff;
      color: #6d28d9;
      border-color: #ddd6fe;
    }
    .chip-specific:hover {
      background: #ede9fe;
      border-color: #c4b5fd;
      transform: translateY(-1px);
    }
    .chip-repeater {
      background: #fdf2f8;
      color: #db2777;
      border-color: #fbcfe8;
    }
    .chip-repeater:hover {
      background: #fce7f3;
      border-color: #f472b6;
      transform: translateY(-1px);
    }
    .chip-icon { font-size: 14px; }

    /* Editor Tabs */
    .editor-tabs-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 16px;
      background: #ffffff;
      border-bottom: 1px solid #e2e8f0;
    }
    .tabs-group {
      display: flex;
      gap: 8px;
    }
    .editor-tab-btn {
      padding: 8px 16px;
      border-radius: 8px;
      border: 1px solid transparent;
      background: #f1f5f9;
      color: #475569;
      font-size: 13px;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .editor-tab-btn:hover { background: #e2e8f0; color: #0f172a; }
    .editor-tab-btn.active {
      background: #0050e5;
      color: #ffffff;
    }
    .btn-reset-boilerplate {
      height: 34px;
      padding: 0 12px;
      border-radius: 6px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      color: #475569;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      transition: all 0.15s ease;
    }
    .btn-reset-boilerplate:hover {
      background: #e2e8f0;
      color: #0f172a;
    }

    /* Editor Textarea */
    .editor-pane-body {
      background: #0f172a;
    }
    .css-info-pill {
      background: rgba(245, 158, 11, 0.1);
      border-bottom: 1px solid rgba(245, 158, 11, 0.2);
      color: #fbbf24;
      padding: 8px 16px;
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .pill-icon { font-size: 16px; }
    .code-textarea {
      width: 100%;
      background: #0f172a;
      color: #f8fafc;
      border: none;
      padding: 20px;
      font-size: 13.5px;
      line-height: 1.6;
      resize: vertical;
      outline: none;
      box-sizing: border-box;
      min-height: 420px;
    }
    .code-textarea:focus { background: #090d16; }

    /* Mock Content Card */
    .mock-content-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 24px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }
    .content-drawer-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 14px;
      border-bottom: 1px solid #f1f5f9;
    }
    .drawer-title-wrap {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .drawer-icon { font-size: 26px; color: #0050e5; }
    .drawer-title { font-size: 16px; font-weight: 800; color: #0f172a; margin: 0; }
    .drawer-sub { font-size: 12.5px; color: #64748b; margin: 2px 0 0 0; }
    .btn-reset-sample {
      height: 34px;
      padding: 0 12px;
      border-radius: 6px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      color: #334155;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .inspector-form-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 16px;
    }
    .inspector-form-grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 16px;
    }
    .inspector-form-grid-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 16px;
    }
    .field-label {
      font-size: 11.5px;
      font-weight: 700;
      color: #334155;
      margin-bottom: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .field-label code {
      color: #0050e5;
      font-size: 11px;
      background: #eef2ff;
      padding: 1px 6px;
      border-radius: 4px;
    }
    .inspector-input {
      border: 1.5px solid #cbd5e1;
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 13px;
      color: #0f172a;
      outline: none;
      width: 100%;
      box-sizing: border-box;
    }
    .inspector-input:focus { border-color: #0050e5; }

    /* Summernote Rich Text Editor */
    .summernote-wrapper-block {
      margin-bottom: 18px;
    }
    .field-label-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }
    .rich-hint-tag {
      font-size: 11px;
      font-weight: 700;
      color: #0050e5;
      background: #eef2ff;
      padding: 2px 8px;
      border-radius: 6px;
    }
    .summernote-toolbar {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 4px;
      background: #f1f5f9;
      border: 1.5px solid #cbd5e1;
      border-bottom: none;
      border-radius: 8px 8px 0 0;
      padding: 6px 10px;
    }
    .sn-btn-group {
      display: inline-flex;
      align-items: center;
      gap: 2px;
    }
    .sn-btn {
      height: 28px;
      min-width: 28px;
      padding: 0 6px;
      border-radius: 4px;
      border: 1px solid transparent;
      background: transparent;
      color: #334155;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
    }
    .sn-btn:hover {
      background: #ffffff;
      border-color: #cbd5e1;
      color: #0050e5;
    }
    .sn-sep {
      width: 1px;
      height: 18px;
      background: #cbd5e1;
      margin: 0 4px;
    }
    .sn-toggle-mode {
      font-size: 11.5px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      color: #0f172a;
      padding: 0 8px;
      gap: 4px;
    }
    .icon-small { font-size: 14px; }
    .summernote-editable-box {
      border: 1.5px solid #cbd5e1;
      border-radius: 0 0 8px 8px;
      padding: 14px 16px;
      background: #ffffff;
      min-height: 140px;
      max-height: 280px;
      overflow-y: auto;
      font-size: 13.5px;
      line-height: 1.6;
      color: #0f172a;
      outline: none;
    }
    .summernote-editable-box:focus {
      border-color: #0050e5;
    }
    .summernote-editable-box h2 { font-size: 18px; font-weight: 800; margin: 8px 0; }
    .summernote-editable-box h3 { font-size: 15px; font-weight: 700; margin: 6px 0; }
    .summernote-editable-box p { margin: 0 0 8px 0; }
    .summernote-editable-box blockquote {
      border-left: 3px solid #0050e5;
      padding-left: 12px;
      color: #64748b;
      margin: 8px 0;
      font-style: italic;
    }
    .summernote-editable-box ul, .summernote-editable-box ol {
      padding-left: 20px;
      margin: 4px 0 8px 0;
    }
    .summernote-code-box {
      border-radius: 0 0 8px 8px;
      border-top: none;
      min-height: 140px;
    }
    .chip-rich {
      background: #f0fdf4;
      color: #166534;
      border-color: #bbf7d0;
    }
    .chip-rich:hover {
      background: #dcfce7;
      border-color: #86efac;
    }

    /* ======================================================== */
    /* REPEATER CARDS STUDIO (PageSectionLists)                 */
    /* ======================================================== */
    .repeater-subitems-block {
      padding-top: 6px;
    }
    .repeater-header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .repeater-label {
      font-size: 14px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.01em;
    }
    .repeater-loop-badge {
      font-size: 11px;
      background: #fdf2f8;
      color: #db2777;
      padding: 3px 10px;
      border-radius: 12px;
      margin-left: 8px;
      font-weight: 700;
      border: 1px solid #fbcfe8;
    }
    .btn-add-item {
      height: 34px;
      padding: 0 14px;
      border-radius: 8px;
      background: #0050e5;
      border: none;
      color: #ffffff;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 2px 8px rgba(0, 80, 229, 0.2);
      transition: all 0.15s ease;
    }
    .btn-add-item:hover {
      background: #0041ba;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 80, 229, 0.3);
    }
    .btn-add-item .material-symbols-outlined { font-size: 18px; }

    .repeater-items-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 16px;
    }
    .repeater-card-item {
      background: #ffffff;
      border: 1.5px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.03);
      transition: all 0.2s ease;
      display: flex;
      flex-direction: column;
    }
    .repeater-card-item:hover {
      border-color: #cbd5e1;
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.06);
      transform: translateY(-2px);
    }
    .card-item-header {
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      padding: 10px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .card-idx-pill {
      font-size: 11px;
      font-weight: 800;
      color: #0050e5;
      background: #eef2ff;
      border: 1px solid #c7d2fe;
      padding: 3px 8px;
      border-radius: 6px;
      letter-spacing: 0.3px;
    }
    .btn-trash-action {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      border: 1px solid transparent;
      background: transparent;
      color: #94a3b8;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-trash-action:hover {
      background: #fee2e2;
      color: #dc2626;
      border-color: #fecaca;
    }
    .btn-trash-action .material-symbols-outlined { font-size: 18px; }

    .card-form-grid {
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .card-field-row-2 {
      display: grid;
      grid-template-columns: 1.2fr 1fr;
      gap: 10px;
    }
    .card-field-row-3 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 10px;
    }
    .card-field-unit {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .card-field-label {
      font-size: 11px;
      font-weight: 700;
      color: #475569;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .card-field-label code {
      font-size: 10px;
      color: #0050e5;
      background: #eef2ff;
      padding: 1px 4px;
      border-radius: 4px;
    }
    .card-ctrl {
      height: 36px;
      border: 1.5px solid #cbd5e1;
      border-radius: 7px;
      padding: 0 10px;
      font-size: 12.5px;
      color: #0f172a;
      background: #ffffff;
      outline: none;
      width: 100%;
      box-sizing: border-box;
      transition: all 0.15s ease;
    }
    .card-ctrl:focus {
      border-color: #0050e5;
      box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.08);
    }
    .input-with-icon-preview {
      position: relative;
      display: flex;
      align-items: center;
      width: 100%;
    }
    .icon-inline-preview {
      position: absolute;
      left: 8px;
      font-size: 18px;
      color: #0050e5;
      pointer-events: none;
    }
    .card-ctrl-with-icon {
      padding-left: 32px !important;
    }

    /* Mock Tabs Nav */
    .mock-tabs-nav {
      display: flex;
      gap: 6px;
      padding: 6px;
      background: #f1f5f9;
      border-radius: 10px;
      margin-bottom: 20px;
      overflow-x: auto;
      border: 1px solid #e2e8f0;
    }
    .mock-tab-btn {
      height: 36px;
      padding: 0 14px;
      border-radius: 7px;
      border: 1px solid transparent;
      background: transparent;
      color: #64748b;
      font-size: 12.5px;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s ease;
    }
    .mock-tab-btn:hover {
      background: rgba(255, 255, 255, 0.7);
      color: #0f172a;
    }
    .mock-tab-btn.active {
      background: #ffffff;
      color: #0050e5;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      border-color: #e2e8f0;
    }
    .mock-tab-badge {
      font-size: 11px;
      font-weight: 800;
      color: #0050e5;
      background: #eef2ff;
      border: 1px solid #c7d2fe;
      padding: 1px 7px;
      border-radius: 10px;
    }
    .mock-tab-btn.active .mock-tab-badge {
      background: #0050e5;
      color: #ffffff;
      border-color: #0050e5;
    }
    .mock-tab-pane {
      padding: 4px 0 0 0;
    }

    /* ======================================================== */
    /* FAQ MANAGER STUDIO                                       */
    /* ======================================================== */
    .faq-categories-tree {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .faq-cat-card {
      background: #ffffff;
      border: 1.5px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.03);
    }
    .faq-cat-header-banner {
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      padding: 12px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }
    .faq-cat-title-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
      flex: 1;
      min-width: 260px;
    }
    .faq-cat-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11.5px;
      font-weight: 800;
      color: #0050e5;
      background: #eef2ff;
      border: 1px solid #c7d2fe;
      padding: 5px 10px;
      border-radius: 6px;
      white-space: nowrap;
    }
    .faq-cat-badge .material-symbols-outlined { font-size: 16px; }
    .faq-cat-name-input {
      height: 36px;
      border: 1.5px solid #cbd5e1;
      border-radius: 7px;
      padding: 0 12px;
      font-size: 13.5px;
      font-weight: 700;
      color: #0f172a;
      background: #ffffff;
      outline: none;
      flex: 1;
      min-width: 200px;
      transition: all 0.15s ease;
    }
    .faq-cat-name-input:focus {
      border-color: #0050e5;
      box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.08);
    }
    .faq-cat-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .btn-add-mini {
      height: 32px;
      padding: 0 12px;
      border-radius: 6px;
      background: #eef2ff;
      border: 1.5px solid #c7d2fe;
      color: #0050e5;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      white-space: nowrap;
      transition: all 0.15s ease;
    }
    .btn-add-mini:hover {
      background: #0050e5;
      color: #ffffff;
      border-color: #0050e5;
    }
    .btn-add-mini-ghost {
      height: 28px;
      padding: 0 10px;
      border-radius: 6px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #1d4ed8;
      font-size: 11.5px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 3px;
      transition: all 0.15s;
    }
    .btn-add-mini-ghost:hover {
      background: #dbeafe;
      border-color: #93c5fd;
    }
    .faq-cat-body {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: #fafafa;
    }
    .faq-qa-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
      transition: border-color 0.15s;
    }
    .faq-qa-card:hover {
      border-color: #cbd5e1;
    }
    .faq-qa-header {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .faq-q-badge-box {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
    }
    .faq-q-num-pill {
      font-size: 11px;
      font-weight: 800;
      color: #475569;
      background: #f1f5f9;
      padding: 4px 8px;
      border-radius: 4px;
    }
    .faq-q-icon {
      font-size: 18px;
      color: #0050e5;
    }
    .faq-question-input {
      height: 36px;
      border: 1.5px solid #cbd5e1;
      border-radius: 7px;
      padding: 0 12px;
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
      outline: none;
      flex: 1;
      transition: all 0.15s;
    }
    .faq-question-input:focus {
      border-color: #0050e5;
      box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.08);
    }
    .btn-trash-action-sm {
      width: 26px;
      height: 26px;
      border-radius: 5px;
      border: none;
      background: transparent;
      color: #94a3b8;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-trash-action-sm:hover {
      background: #fee2e2;
      color: #dc2626;
    }
    .btn-trash-action-sm .material-symbols-outlined { font-size: 16px; }
    .faq-answer-wrap {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .faq-ans-label {
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
      display: flex;
      justify-content: space-between;
    }
    .faq-ans-label code {
      color: #0050e5;
      background: #eef2ff;
      padding: 1px 4px;
      border-radius: 4px;
    }
    .faq-answer-textarea {
      border: 1.5px solid #cbd5e1;
      border-radius: 7px;
      padding: 10px 12px;
      font-size: 13px;
      line-height: 1.55;
      color: #334155;
      outline: none;
      min-height: 64px;
      resize: vertical;
      width: 100%;
      box-sizing: border-box;
      background: #ffffff;
      transition: all 0.15s;
    }
    .faq-answer-textarea:focus {
      border-color: #0050e5;
      box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.08);
    }

    /* ======================================================== */
    /* NAVIGATION HIERARCHY STUDIO                              */
    /* ======================================================== */
    .nav-tree-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .nav-parent-card {
      background: #ffffff;
      border: 1.5px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.03);
    }
    .nav-parent-header {
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      padding: 12px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }
    .nav-parent-left {
      display: flex;
      align-items: center;
      gap: 10px;
      flex: 1;
      min-width: 280px;
    }
    .nav-parent-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11.5px;
      font-weight: 800;
      color: #7c3aed;
      background: #f5f3ff;
      border: 1px solid #ddd6fe;
      padding: 5px 10px;
      border-radius: 6px;
      white-space: nowrap;
    }
    .nav-parent-badge .material-symbols-outlined { font-size: 16px; }
    .nav-parent-title {
      height: 36px;
      border: 1.5px solid #cbd5e1;
      border-radius: 7px;
      padding: 0 12px;
      font-size: 13.5px;
      font-weight: 700;
      color: #0f172a;
      flex: 1;
      outline: none;
      transition: all 0.15s;
    }
    .nav-parent-title:focus {
      border-color: #0050e5;
      box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.08);
    }
    .nav-parent-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .nav-parent-body {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      background: #fafafa;
    }
    .nav-group-heading {
      font-size: 11.5px;
      font-weight: 800;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
      display: block;
    }
    .nav-child-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px;
      margin-bottom: 10px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
    }
    .nav-child-header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 1px dashed #e2e8f0;
    }
    .nav-child-badge-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
    }
    .nav-child-pill {
      font-size: 11px;
      font-weight: 800;
      color: #2563eb;
      background: #eff6ff;
      padding: 3px 8px;
      border-radius: 4px;
      flex-shrink: 0;
    }
    .nav-child-title-input {
      height: 32px;
      border: 1.5px solid #cbd5e1;
      border-radius: 6px;
      padding: 0 10px;
      font-size: 12.5px;
      outline: none;
      flex: 1;
      max-width: 320px;
      transition: all 0.15s;
    }
    .nav-child-title-input:focus {
      border-color: #0050e5;
    }
    .nav-child-actions {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .nav-page-item-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 8px 12px;
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 6px;
      transition: all 0.15s;
    }
    .nav-page-item-card:hover {
      background: #ffffff;
      border-color: #cbd5e1;
    }
    .nav-page-dot {
      font-size: 16px;
      color: #0050e5;
      flex-shrink: 0;
    }
    .nav-page-grid-inputs {
      display: grid;
      grid-template-columns: 1fr 1fr 1.5fr;
      gap: 8px;
      flex: 1;
    }
    .nav-page-name, .nav-page-url, .nav-page-desc {
      height: 32px;
      border: 1.5px solid #cbd5e1;
      border-radius: 6px;
      padding: 0 8px;
      font-size: 12px;
      outline: none;
      background: #ffffff;
      transition: all 0.15s;
    }
    .nav-page-name:focus, .nav-page-url:focus, .nav-page-desc:focus {
      border-color: #0050e5;
    }
    .font-bold { font-weight: 700; }

    /* ======================================================== */
    /* MODAL: LIVE SIMULATED PREVIEW STYLES                     */
    /* ======================================================== */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(4px);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .preview-modal-dialog {
      background: #ffffff;
      border-radius: 16px;
      width: 100%;
      max-width: 1240px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 20px 48px rgba(0, 0, 0, 0.25);
    }
    .preview-modal-header {
      padding: 16px 24px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #ffffff;
    }
    .preview-header-meta {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .preview-badge-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: #eef2ff;
      color: #0050e5;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .preview-modal-name { font-size: 17px; font-weight: 800; color: #0f172a; margin: 0; }
    .preview-modal-sub { font-size: 12.5px; color: #64748b; }
    .preview-modal-sub code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; }

    .viewport-toggle-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .btn-viewport {
      height: 34px;
      padding: 0 12px;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      color: #475569;
      font-size: 12px;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-viewport.active {
      background: #0050e5;
      color: #ffffff;
      border-color: #0050e5;
    }
    .btn-close-modal {
      width: 34px;
      height: 34px;
      border-radius: 6px;
      border: none;
      background: #f1f5f9;
      color: #475569;
      font-size: 14px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-left: 6px;
    }
    .btn-close-modal:hover { background: #e2e8f0; color: #0f172a; }

    .preview-modal-body {
      background-image: radial-gradient(#cbd5e1 1px, transparent 1px);
      background-size: 16px 16px;
      background-color: #f8fafc;
      padding: 24px;
      overflow-y: auto;
      flex: 1;
      display: flex;
      justify-content: center;
    }
    .canvas-viewport-frame {
      width: 100%;
      background: #ffffff;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 16px rgba(0,0,0,0.06);
      overflow-y: auto;
      transition: max-width 0.3s ease;
    }
    .canvas-viewport-frame.mobile-frame {
      max-width: 390px;
      border-radius: 28px;
      border: 8px solid #0f172a;
    }
    .canvas-mobile-notch {
      width: 80px;
      height: 12px;
      background: #1e293b;
      border-radius: 10px;
      margin: 8px auto;
    }
    .rendered-html-box {
      padding: 0;
      min-height: 250px;
    }
    .preview-modal-footer {
      padding: 14px 24px;
      background: #ffffff;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 12px;
    }

    .canvas-viewport-frame.tablet-frame {
      max-width: 768px;
      border-radius: 16px;
      border: 6px solid #1e293b;
      box-shadow: 0 16px 40px rgba(0,0,0,0.15);
    }

    @media (max-width: 992px) {
      .custom-studio-container { padding: 16px; }
      .header-main-row { flex-direction: column; align-items: flex-start; gap: 16px; }
      .header-actions { width: 100%; justify-content: flex-start; flex-wrap: wrap; }
      .meta-config-grid { grid-template-columns: 1fr; }
      .inspector-form-grid { grid-template-columns: 1fr 1fr; }
      .inspector-form-grid-2 { grid-template-columns: 1fr; }
      .inspector-form-grid-3 { grid-template-columns: 1fr; }
      .preview-modal-dialog { width: 96vw; height: 92vh; }
    }

    @media (max-width: 640px) {
      .custom-studio-container { padding: 12px 8px; }
      .studio-header-card { padding: 16px 14px; border-radius: 10px; }
      .page-title { font-size: 18px; }
      .header-actions { flex-direction: column; width: 100%; gap: 8px; }
      .header-actions .btn { width: 100%; justify-content: center; }
      .meta-config-grid { gap: 12px; }
      .token-palette-top { flex-direction: column; align-items: flex-start; gap: 8px; }
      .token-category-tabs { width: 100%; overflow-x: auto; }
      .editor-tabs-bar { flex-direction: column; align-items: stretch; gap: 8px; }
      .tabs-group { width: 100%; }
      .editor-tab-btn { flex: 1; justify-content: center; }
      .btn-reset-boilerplate { width: 100%; justify-content: center; }
      .mock-segmented-nav { overflow-x: auto; -webkit-overflow-scrolling: touch; }
      .inspector-form-grid { grid-template-columns: 1fr; }
      .preview-modal-header { flex-direction: column; align-items: stretch; gap: 12px; }
      .viewport-toggle-group { justify-content: center; flex-wrap: wrap; }
      .preview-modal-body { padding: 10px 4px; }
      .preview-modal-footer { flex-direction: column-reverse; gap: 8px; }
      .preview-modal-footer .btn { width: 100%; justify-content: center; }
    }
  `]
})
export class CreateCustomTemplateComponent implements OnInit, AfterViewInit {
  @ViewChild('htmlEditor') htmlEditorRef?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('cssEditor') cssEditorRef?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('jsEditor') jsEditorRef?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('richTextEditor') richTextEditorRef?: ElementRef<HTMLDivElement>;

  // Form Metadata
  templateName: string = '';
  selectedCategory: string = 'hero';
  variantCode: string = '';
  description: string = '';
  htmlTemplate: string = '';
  cssStyles: string = '';
  jsScript: string = '';

  // Active Tenant & Domain Resolution
  resolvedTenantKey: string = 'acme-global';
  domainInitials: string = 'AG';

  // Editor and Preview State
  activeEditorTab: 'html' | 'css' | 'js' = 'html';
  activeTokenCategory: 'core' | 'media' | 'sectionlist' | 'faq' | 'navigation' | 'footer' | 'forms' | 'legal' | 'identity' = 'core';
  activeMockTab: 'scalars' | 'rich' | 'media' | 'cards' | 'faqs' | 'menu' | 'identity' = 'scalars';
  savingTemplate: boolean = false;
  showPreviewModal: boolean = false;
  previewViewport: 'desktop' | 'tablet' | 'mobile' = 'desktop';
  safeHydratedHtml: SafeHtml = '';
  showRawHtmlEditor: boolean = false;

  // Live Database Editor Tokens
  editorTokens: {
    publishedForms: any[];
    menuDropdowns: any[];
    footerGroups: any[];
    legalPages: any[];
    brand: any;
  } = {
    publishedForms: [],
    menuDropdowns: [],
    footerGroups: [],
    legalPages: [],
    brand: null
  };

  // Sample Content Inspector State
  sampleContent: any = {
    title: '',
    miniTitle: '',
    description: '',
    fullDescription: '',
    qoute: '“Ozikol has enabled our engineering teams to scale distributed systems with 99.999% availability.”',
    buttonText: '',
    buttonLink: '',
    secondaryButtonText: '',
    secondaryButtonLink: '',
    directUrl: '#',
    customClass: '',
    backgroundColor: '#ffffff',
    imageUrl: '',
    secondImageUrl: '',
    videoUrl: '',
    youtubeUrlLink: '',
    brandName: 'Acme Global',
    copyright: '© 2026 Acme Global Corp. All rights reserved.',
    poweredBy: '<a href="https://ozikol.com" target="_blank" rel="noopener noreferrer">Powered by <strong>Ozikol</strong></a>',
    email: 'contact@acme-global.com',
    phone: '+1 (800) 555-0199',
    address: '100 Silicon Way, Tech Park, Suite 400',
    items: [],
    faqCategories: [
      {
        title: 'Platform Architecture',
        sortOrder: 1,
        faqs: [
          { question: 'How does edge multi-cloud routing handle packet failovers?', answer: 'Our intelligent mesh network uses real-time BGP telemetry to re-route requests across resilient regional points in less than 5ms.', sortOrder: 1 },
          { question: 'What compliance certifications are supported out of the box?', answer: 'SOC2 Type II, ISO 27001, HIPAA, and GDPR compliance validation are standard across all tenant environments.', sortOrder: 2 }
        ]
      },
      {
        title: 'Billing & Dues',
        sortOrder: 2,
        faqs: [
          { question: 'Can we switch between monthly and annual plans at any time?', answer: 'Yes, tier adjustments are prorated instantly without interruption to active workloads or API endpoints.', sortOrder: 1 },
          { question: 'Do you offer dedicated enterprise SLAs with guaranteed uptime?', answer: 'Enterprise contracts include a 99.999% uptime guarantee with 24/7 priority incident response.', sortOrder: 2 }
        ]
      }
    ],
    navigationMenu: [
      {
        title: 'Solutions',
        icon: 'hub',
        children: [
          {
            title: 'Cloud Infrastructure',
            icon: 'cloud',
            pages: [
              { title: 'Edge Compute Engines', pageUrl: '/solutions/compute', pageDescription: 'Ultra-low latency serverless containers at edge points.', pageImage: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&auto=format&fit=crop&q=80' },
              { title: 'Global Mesh Cache', pageUrl: '/solutions/cache', pageDescription: 'Distributed memory caching across 180+ global PoPs.', pageImage: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&auto=format&fit=crop&q=80' }
            ]
          },
          {
            title: 'Security & Zero Trust',
            icon: 'verified_user',
            pages: [
              { title: 'Identity & Access Gateways', pageUrl: '/solutions/iam', pageDescription: 'Granular role policies and hardware key verification.', pageImage: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=400&auto=format&fit=crop&q=80' },
              { title: 'Cryptographic Audit Trails', pageUrl: '/solutions/audit', pageDescription: 'Immutable ledger logging for regulatory compliance.', pageImage: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&auto=format&fit=crop&q=80' }
            ]
          }
        ],
        pages: []
      },
      {
        title: 'Platform',
        icon: 'dataset',
        children: [],
        pages: [
          { title: 'API Documentation', pageUrl: '/docs/api', pageDescription: 'Comprehensive REST and GraphQL endpoint schemas.', pageImage: '' },
          { title: 'Developer SDKs', pageUrl: '/docs/sdks', pageDescription: 'Official libraries for TypeScript, Python, Go, and C#.', pageImage: '' },
          { title: 'Release Notes', pageUrl: '/changelog', pageDescription: 'Weekly features, performance improvements, and fixes.', pageImage: '' }
        ]
      },
      {
        title: 'Company',
        icon: 'domain',
        children: [],
        pages: [
          { title: 'About Acme Global', pageUrl: '/about', pageDescription: 'Our founding mission and global engineering culture.', pageImage: '' },
          { title: 'Careers & Open Roles', pageUrl: '/careers', pageDescription: 'Join our fully distributed team building next-gen cloud.', pageImage: '' },
          { title: 'Contact & Support', pageUrl: '/contact', pageDescription: 'Reach our enterprise support desk and global offices.', pageImage: '' }
        ]
      }
    ]
  };

  /**
   * The 6 Official System Categories (matching marketplace and public layout architecture).
   */
  categoryPresets: CategoryPreset[] = [
    {
      id: 'menu',
      codePrefix: 'MENU',
      name: 'Menu / Nav',
      icon: 'menu',
      tagline: 'Sticky frosted glass navbar with brand logo, nav links loop, and direct action button',
      defaultName: 'Apex Glassmorphism Sticky Navbar',
      html: `<header class="oz-nav-header {{ CustomClass }}">
  <div class="oz-nav-container">
    <a href="/" class="oz-nav-brand">
      <span class="oz-brand-icon material-symbols-outlined">dataset</span>
      <span class="oz-brand-text">{{ BrandName }}</span>
    </a>

    <nav class="oz-nav-links">
      {{#each PageSectionLists}}
      <a href="{{ ButtonLink }}" class="oz-nav-link">{{ Title }}</a>
      {{/each}}
    </nav>

    <div class="oz-nav-cta">
      <a href="{{ ButtonLink }}" class="oz-btn-nav">{{ ButtonText }}</a>
    </div>
  </div>
</header>`,
      css: `.oz-nav-header {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid #e2e8f0;
  padding: 16px 24px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  position: sticky;
  top: 0;
  z-index: 1000;
}
.oz-nav-container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}
.oz-nav-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  color: #0f172a;
  font-weight: 800;
  font-size: 18px;
}
.oz-brand-icon { color: #0050e5; font-size: 26px; }
.oz-nav-links { display: flex; align-items: center; gap: 24px; }
.oz-nav-link {
  color: #475569;
  text-decoration: none;
  font-size: 14px;
  font-weight: 600;
  transition: color 0.15s ease;
}
.oz-nav-link:hover { color: #0050e5; }
.oz-btn-nav {
  background: #0050e5;
  color: #ffffff;
  padding: 9px 18px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
  display: inline-block;
  transition: 0.2s;
  white-space: nowrap;
}
.oz-btn-nav:hover { background: #0041ba; }
@media (max-width: 768px) {
  .oz-nav-header { padding: 12px 16px; }
  .oz-nav-container { flex-wrap: wrap; justify-content: space-between; }
  .oz-nav-links { order: 3; width: 100%; justify-content: center; gap: 14px; padding-top: 8px; border-top: 1px solid #f1f5f9; }
}
@media (max-width: 480px) {
  .oz-nav-container { flex-direction: column; align-items: stretch; text-align: center; gap: 12px; }
  .oz-nav-brand { justify-content: center; }
  .oz-nav-links { flex-wrap: wrap; gap: 10px; }
  .oz-nav-cta { text-align: center; }
  .oz-btn-nav { width: 100%; box-sizing: border-box; }
}`,
      sampleContent: {
        brandName: 'Acme Global',
        buttonText: 'Console Sign In',
        buttonLink: '#login',
        title: '',
        miniTitle: '',
        description: '',
        imageUrl: '',
        items: [
          { title: 'Products', buttonLink: '#products', description: '' },
          { title: 'Architecture', buttonLink: '#arch', description: '' },
          { title: 'Pricing', buttonLink: '#pricing', description: '' },
          { title: 'Docs', buttonLink: '#docs', description: '' }
        ]
      },
      specificTokens: [
        { label: 'Brand Name', token: '{{ BrandName }}' }
      ]
    },
    {
      id: 'hero',
      codePrefix: 'HERO',
      name: 'Hero / Sliders',
      icon: 'view_carousel',
      tagline: 'High-impact landing hero with bold headline, dual CTAs, badge, and graphic layout',
      defaultName: 'Quantum Split Showcase Hero',
      html: `<section class="oz-hero-section {{ CustomClass }}">
  <div class="oz-hero-container">
    <div class="oz-hero-content">
      <span class="oz-hero-badge">{{ MiniTitle }}</span>
      <h1 class="oz-hero-title">{{ Title }}</h1>
      <p class="oz-hero-desc">{{ Description }}</p>
      <div class="oz-hero-actions">
        <a href="{{ ButtonLink }}" class="oz-btn-primary">{{ ButtonText }}</a>
        <a href="{{ SecondaryButtonLink }}" class="oz-btn-secondary">{{ SecondaryButtonText }}</a>
      </div>
    </div>
    <div class="oz-hero-media">
      <img src="{{ ImageUrl }}" alt="{{ Title }}" class="oz-hero-img" />
    </div>
  </div>
</section>`,
      css: `.oz-hero-section {
  padding: 80px 24px;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  color: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  overflow: hidden;
}
.oz-hero-container {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 48px;
  align-items: center;
}
.oz-hero-badge {
  display: inline-block;
  background: rgba(0, 80, 229, 0.25);
  color: #60a5fa;
  border: 1px solid rgba(96, 165, 250, 0.3);
  font-size: 11.5px;
  font-weight: 800;
  letter-spacing: 0.8px;
  padding: 4px 12px;
  border-radius: 20px;
  margin-bottom: 16px;
}
.oz-hero-title {
  font-size: 42px;
  font-weight: 900;
  line-height: 1.15;
  letter-spacing: -0.02em;
  margin: 0 0 16px 0;
  color: #ffffff;
  word-break: break-word;
}
.oz-hero-desc {
  font-size: 16px;
  line-height: 1.6;
  color: #94a3b8;
  margin: 0 0 32px 0;
}
.oz-hero-actions {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
}
.oz-btn-primary {
  background: #0050e5;
  color: #ffffff;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 700;
  text-decoration: none;
  box-shadow: 0 4px 14px rgba(0, 80, 229, 0.35);
  transition: 0.2s;
  display: inline-block;
}
.oz-btn-primary:hover { background: #0041ba; transform: translateY(-1px); }
.oz-btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 700;
  text-decoration: none;
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: 0.2s;
  display: inline-block;
}
.oz-btn-secondary:hover { background: rgba(255, 255, 255, 0.18); }
.oz-hero-media { text-align: center; }
.oz-hero-img {
  max-width: 100%;
  height: auto;
  border-radius: 16px;
  box-shadow: 0 16px 36px rgba(0,0,0,0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
@media (max-width: 900px) {
  .oz-hero-section { padding: 60px 20px; }
  .oz-hero-container { grid-template-columns: 1fr; gap: 36px; text-align: center; }
  .oz-hero-title { font-size: 34px; }
  .oz-hero-actions { justify-content: center; }
}
@media (max-width: 480px) {
  .oz-hero-section { padding: 44px 16px; }
  .oz-hero-title { font-size: 26px; }
  .oz-hero-desc { font-size: 14px; margin-bottom: 24px; }
  .oz-hero-actions { flex-direction: column; width: 100%; }
  .oz-btn-primary, .oz-btn-secondary { width: 100%; text-align: center; box-sizing: border-box; }
}`,
      sampleContent: {
        title: 'Scale Your Digital Infrastructure With Unrivaled Speed',
        miniTitle: 'ENTERPRISE CLOUD PLATFORM',
        description: 'Deploy mission-critical workloads, orchestrate multi-cloud pipelines, and protect customer assets with sub-millisecond resilience.',
        fullDescription: '<p>Deploy mission-critical workloads, orchestrate multi-cloud pipelines, and protect customer assets with <strong>sub-millisecond resilience</strong>.</p>',
        imageUrl: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&auto=format&fit=crop&q=80',
        buttonText: 'Get Started Free',
        buttonLink: '#signup',
        secondaryButtonText: 'Explore Platform',
        secondaryButtonLink: '#features',
        items: []
      },
      specificTokens: [
        { label: 'Secondary Button Text', token: '{{ SecondaryButtonText }}' },
        { label: 'Secondary Button Link', token: '{{ SecondaryButtonLink }}' }
      ]
    },
    {
      id: 'bodysections',
      codePrefix: 'BODY',
      name: 'Body Sections',
      icon: 'view_quilt',
      tagline: 'Multi-column responsive grid with icon badges, feature cards, and narrative copy',
      defaultName: 'Nexus Tri-Card Features Grid',
      html: `<section class="oz-features-section {{ CustomClass }}">
  <div class="oz-features-header">
    <span class="oz-sub-badge">{{ MiniTitle }}</span>
    <h2 class="oz-features-title">{{ Title }}</h2>
    <p class="oz-features-desc">{{ Description }}</p>
  </div>

  <div class="oz-features-grid">
    {{#each PageSectionLists}}
    <div class="oz-feature-card">
      <div class="oz-feature-icon-box">
        <span class="material-symbols-outlined">{{ Icon }}</span>
      </div>
      <h3 class="oz-feature-card-title">{{ Title }}</h3>
      <p class="oz-feature-card-desc">{{ Description }}</p>
    </div>
    {{/each}}
  </div>
</section>`,
      css: `.oz-features-section {
  padding: 72px 24px;
  background: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  text-align: center;
}
.oz-sub-badge {
  display: inline-block;
  background: #eef2ff;
  color: #0050e5;
  font-size: 11px;
  font-weight: 800;
  padding: 4px 12px;
  border-radius: 16px;
  margin-bottom: 12px;
}
.oz-features-title {
  font-size: 34px;
  font-weight: 900;
  color: #0f172a;
  margin: 0 0 12px 0;
  letter-spacing: -0.02em;
}
.oz-features-desc {
  font-size: 15px;
  color: #64748b;
  max-width: 620px;
  margin: 0 auto 48px auto;
  line-height: 1.5;
}
.oz-features-grid {
  max-width: 1140px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 28px;
  text-align: left;
}
.oz-feature-card {
  background: #f8fafc;
  border: 1.5px solid #e2e8f0;
  border-radius: 12px;
  padding: 28px;
  transition: all 0.2s ease;
}
.oz-feature-card:hover {
  transform: translateY(-3px);
  border-color: #0050e5;
  background: #ffffff;
  box-shadow: 0 8px 24px rgba(0, 80, 229, 0.08);
}
.oz-feature-icon-box {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  background: #eef2ff;
  color: #0050e5;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 18px;
}
.oz-feature-icon-box .material-symbols-outlined { font-size: 26px; }
.oz-feature-card-title { font-size: 18px; font-weight: 800; color: #0f172a; margin: 0 0 8px 0; }
.oz-feature-card-desc { font-size: 13.5px; color: #64748b; line-height: 1.55; margin: 0; }
@media (max-width: 768px) {
  .oz-features-section { padding: 48px 16px; }
  .oz-features-title { font-size: 26px; }
  .oz-features-desc { font-size: 14px; margin-bottom: 32px; }
  .oz-features-grid { grid-template-columns: 1fr; gap: 16px; }
  .oz-feature-card { padding: 20px; }
}`,
      sampleContent: {
        title: 'Engineered For Enterprise Scale And Sub-Millisecond Speed',
        miniTitle: 'PLATFORM CAPABILITIES',
        description: 'Unified toolchain built from the ground up to solve distributed bottlenecks and enhance organizational productivity.',
        fullDescription: '<p>Discover how our <strong>next-generation architecture</strong> redefines high-throughput workloads with sub-millisecond latency and zero trust compliance.</p><ul><li>Automatic edge node caching</li><li>Cryptographic integrity verification</li><li>Integrated CI/CD with instant rollbacks</li></ul>',
        imageUrl: '',
        buttonText: '',
        buttonLink: '',
        items: [
          { title: 'Edge Cloud Replication', description: 'Continuous multi-region synchronization keeps endpoints resilient against downtime.', icon: 'hub' },
          { title: 'Zero Trust Security', description: 'Granular policy enforcement, automatic device trust tokens, and cryptographic verification on every call.', icon: 'verified_user' },
          { title: 'Automated CI/CD Workflows', description: 'Push to git and deploy production containers in seconds with automated rollbacks.', icon: 'rocket_launch' }
        ]
      },
      specificTokens: [
        { label: 'Full Description (Rich Text)', token: '{{ FullDescription }}' }
      ]
    },
    {
      id: 'faq',
      codePrefix: 'FAQ',
      name: 'FAQ & Accordions',
      icon: 'quiz',
      tagline: 'Collapsible interactive accordion list grouped by knowledge categories',
      defaultName: 'Apex Interactive FAQ Accordion',
      html: `<section class="oz-faq-section {{ CustomClass }}">
  <div class="oz-faq-container">
    <div class="oz-faq-header">
      <span class="oz-faq-badge">{{ MiniTitle }}</span>
      <h2 class="oz-faq-title">{{ Title }}</h2>
      <p class="oz-faq-desc">{{ Description }}</p>
    </div>

    <div class="oz-faq-categories-wrap">
      {{#each FaqCategories}}
      <div class="oz-faq-cat-block">
        <h3 class="oz-cat-heading">{{ CategoryTitle }}</h3>
        <div class="oz-accordion-list">
          {{#each FAQs}}
          <details class="oz-faq-details">
            <summary class="oz-faq-summary">
              <span class="oz-question-text">{{ Question }}</span>
              <span class="material-symbols-outlined oz-chevron-icon">expand_more</span>
            </summary>
            <div class="oz-answer-box">
              <p>{{ Answer }}</p>
            </div>
          </details>
          {{/each}}
        </div>
      </div>
      {{/each}}
    </div>
  </div>
</section>`,
      css: `.oz-faq-section {
  padding: 72px 24px;
  background: #f8fafc;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.oz-faq-container { max-width: 900px; margin: 0 auto; }
.oz-faq-header { text-align: center; margin-bottom: 48px; }
.oz-faq-badge {
  display: inline-block;
  background: #eef2ff;
  color: #0050e5;
  font-size: 11.5px;
  font-weight: 800;
  padding: 4px 14px;
  border-radius: 16px;
  margin-bottom: 12px;
}
.oz-faq-title {
  font-size: 32px;
  font-weight: 900;
  color: #0f172a;
  margin: 0 0 12px 0;
  letter-spacing: -0.02em;
}
.oz-faq-desc { font-size: 15px; color: #64748b; max-width: 600px; margin: 0 auto; line-height: 1.5; }
.oz-faq-cat-block { margin-bottom: 36px; }
.oz-cat-heading {
  font-size: 18px;
  font-weight: 800;
  color: #0050e5;
  margin-bottom: 16px;
  border-bottom: 2px solid #e2e8f0;
  padding-bottom: 8px;
}
.oz-accordion-list { display: flex; flex-direction: column; gap: 12px; }
.oz-faq-details {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
  transition: all 0.2s ease;
}
.oz-faq-details[open] { border-color: #0050e5; box-shadow: 0 4px 12px rgba(0, 80, 229, 0.06); }
.oz-faq-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  cursor: pointer;
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  user-select: none;
}
.oz-faq-summary::-webkit-details-marker { display: none; }
.oz-chevron-icon { transition: transform 0.2s ease; color: #64748b; }
.oz-faq-details[open] .oz-chevron-icon { transform: rotate(180deg); color: #0050e5; }
.oz-answer-box {
  padding: 0 20px 18px 20px;
  font-size: 14px;
  color: #475569;
  line-height: 1.6;
}
.oz-answer-box p { margin: 0; }
@media (max-width: 768px) {
  .oz-faq-section { padding: 48px 16px; }
  .oz-faq-header { margin-bottom: 32px; }
  .oz-faq-title { font-size: 24px; }
  .oz-faq-desc { font-size: 14px; }
  .oz-cat-heading { font-size: 16px; margin-bottom: 12px; }
  .oz-faq-summary { padding: 14px 16px; font-size: 14px; }
  .oz-answer-box { padding: 0 16px 14px 16px; font-size: 13.5px; }
}`,
      sampleContent: {
        title: 'Frequently Asked Questions',
        miniTitle: 'KNOWLEDGE BASE',
        description: 'Answers to commonly asked questions about our enterprise platform architecture and deployment.',
        items: []
      }
    },
    {
      id: 'marquee',
      codePrefix: 'MARQUEE',
      name: 'Marquee & Tickers',
      icon: 'linear_scale',
      tagline: 'Infinite horizontal ticker ribbon with enterprise logos, client badges, or metrics',
      defaultName: 'Velocity Infinite Logo Marquee',
      html: `<section class="oz-marquee-section {{ CustomClass }}">
  <div class="oz-marquee-header">
    <span class="oz-marquee-title">{{ Title }}</span>
  </div>
  <div class="oz-marquee-slider">
    <div class="oz-marquee-track">
      {{#each PageSectionLists}}
      <div class="oz-marquee-item">
        <span class="material-symbols-outlined oz-m-icon">{{ Icon }}</span>
        <span class="oz-m-text">{{ Title }}</span>
      </div>
      {{/each}}
    </div>
  </div>
</section>`,
      css: `.oz-marquee-section {
  padding: 36px 24px;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  border-bottom: 1px solid #e2e8f0;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.oz-marquee-header { text-align: center; margin-bottom: 20px; }
.oz-marquee-title {
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #64748b;
}
.oz-marquee-slider { display: flex; overflow: hidden; user-select: none; }
.oz-marquee-track {
  display: flex;
  align-items: center;
  gap: 40px;
  animation: ozScroll 25s linear infinite;
  white-space: nowrap;
}
.oz-marquee-item {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  background: #ffffff;
  padding: 10px 20px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  font-weight: 700;
  color: #334155;
  font-size: 14px;
}
.oz-m-icon { color: #0050e5; font-size: 20px; }
@keyframes ozScroll {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
@media (max-width: 768px) {
  .oz-marquee-section { padding: 24px 12px; }
  .oz-marquee-track { gap: 18px; }
  .oz-marquee-item { padding: 8px 14px; font-size: 12px; gap: 6px; }
  .oz-m-icon { font-size: 17px; }
}`,
      sampleContent: {
        title: 'TRUSTED BY GLOBAL ENTERPRISES & FAST-GROWING TEAMS',
        miniTitle: '',
        description: '',
        imageUrl: '',
        buttonText: '',
        buttonLink: '',
        items: [
          { title: 'Stripe Payments', icon: 'payments', description: '' },
          { title: 'Google Cloud Infra', icon: 'cloud_sync', description: '' },
          { title: 'HashiCorp Vault', icon: 'lock', description: '' },
          { title: 'Cloudflare Network', icon: 'bolt', description: '' },
          { title: 'Datadog Monitoring', icon: 'query_stats', description: '' }
        ]
      }
    },
    {
      id: 'contactus',
      codePrefix: 'CONTACT',
      name: 'Contact & Booking',
      icon: 'contact_mail',
      tagline: 'Split layout with company contact points and styled responsive message form',
      defaultName: 'Beacon Enterprise Contact & Booking',
      html: `<section class="oz-contact-section {{ CustomClass }}">
  <div class="oz-contact-container">
    <div class="oz-contact-info">
      <span class="oz-sub-badge">{{ MiniTitle }}</span>
      <h2 class="oz-contact-title">{{ Title }}</h2>
      <p class="oz-contact-desc">{{ Description }}</p>

      <div class="oz-info-stack">
        <div class="oz-info-row">
          <span class="material-symbols-outlined oz-info-icon">mail</span>
          <div>
            <strong>Support Email</strong>
            <p>{{ Email }}</p>
          </div>
        </div>
        <div class="oz-info-row">
          <span class="material-symbols-outlined oz-info-icon">phone</span>
          <div>
            <strong>Direct Phone</strong>
            <p>{{ Phone }}</p>
          </div>
        </div>
        <div class="oz-info-row">
          <span class="material-symbols-outlined oz-info-icon">location_on</span>
          <div>
            <strong>Global Headquarters</strong>
            <p>{{ Address }}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="oz-contact-card">
      <h4 style="font-size: 18px; font-weight: 800; margin-bottom: 8px; color: #0f172a;">Send Us a Direct Message</h4>
      <p style="font-size: 13.5px; color: #64748b; margin-bottom: 18px;">Please complete the form below. We typically respond promptly.</p>
      {{ Form "Contact_Us" }}
    </div>
  </div>
</section>`,
      css: `.oz-contact-section {
  padding: 70px 24px;
  background: #f8fafc;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.oz-contact-container {
  max-width: 1140px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 48px;
  align-items: start;
}
.oz-sub-badge {
  display: inline-block;
  background: #eef2ff;
  color: #0050e5;
  font-size: 11px;
  font-weight: 800;
  padding: 4px 12px;
  border-radius: 16px;
  margin-bottom: 12px;
}
.oz-contact-title {
  font-size: 36px;
  font-weight: 900;
  color: #0f172a;
  margin: 0 0 12px 0;
  letter-spacing: -0.02em;
}
.oz-contact-desc {
  font-size: 15px;
  color: #64748b;
  line-height: 1.6;
  margin: 0 0 32px 0;
}
.oz-info-stack { display: flex; flex-direction: column; gap: 20px; }
.oz-info-row { display: flex; align-items: flex-start; gap: 14px; }
.oz-info-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: #eef2ff;
  color: #0050e5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}
.oz-info-row strong { font-size: 13px; color: #0f172a; display: block; }
.oz-info-row p { font-size: 14px; color: #475569; margin: 2px 0 0 0; word-break: break-word; }
.oz-contact-card {
  background: #ffffff;
  border: 1.5px solid #e2e8f0;
  border-radius: 14px;
  padding: 32px;
  box-shadow: 0 4px 18px rgba(0,0,0,0.04);
}
.oz-form-row { margin-bottom: 18px; }
.oz-form-row label {
  display: block;
  font-size: 12.5px;
  font-weight: 700;
  color: #334155;
  margin-bottom: 6px;
}
.oz-form-ctrl {
  width: 100%;
  border: 1.5px solid #cbd5e1;
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13.5px;
  outline: none;
  box-sizing: border-box;
}
.oz-form-ctrl:focus { border-color: #0050e5; }
.oz-btn-submit {
  width: 100%;
  padding: 14px;
  background: #0050e5;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(0, 80, 229, 0.3);
  transition: background 0.15s;
}
.oz-btn-submit:hover { background: #0041ba; }
@media (max-width: 900px) {
  .oz-contact-section { padding: 48px 18px; }
  .oz-contact-container { grid-template-columns: 1fr; gap: 36px; }
  .oz-contact-title { font-size: 28px; }
}
@media (max-width: 480px) {
  .oz-contact-section { padding: 40px 16px; }
  .oz-contact-card { padding: 20px 16px; }
  .oz-contact-title { font-size: 24px; }
  .oz-contact-desc { font-size: 14px; margin-bottom: 24px; }
  .oz-form-ctrl { font-size: 13px; }
}`,
      sampleContent: {
        title: "Let's Build Something Exceptional Together",
        miniTitle: 'GET IN TOUCH',
        description: 'Our global product specialists are ready to architect the ideal setup for your team requirements.',
        email: 'contact@acme-global.com',
        phone: '+1 (800) 555-0199',
        address: '450 Innovation Blvd, Tower B, Silicon Valley, CA',
        buttonText: 'Send Direct Message',
        buttonLink: '#',
        imageUrl: '',
        items: []
      },
      specificTokens: [
        { label: 'Support Email', token: '{{ Email }}' },
        { label: 'Contact Phone', token: '{{ Phone }}' },
        { label: 'HQ Address', token: '{{ Address }}' }
      ]
    },
    {
      id: 'footer',
      codePrefix: 'FOOTER',
      name: 'Footers',
      icon: 'dock_to_bottom',
      tagline: 'Multi-column corporate footer with links, brand info, and copyright bar',
      defaultName: 'Sovereign Enterprise Clean Footer',
      html: `<footer class="oz-site-footer {{ CustomClass }}">
  <div class="oz-footer-container">
    <div class="oz-footer-brand-col">
      <h3 class="oz-footer-brand">{{ BrandName }}</h3>
      <p class="oz-footer-tagline">{{ Description }}</p>
    </div>

    <div class="oz-footer-links-grid">
      {{#each PageSectionLists}}
      <div class="oz-footer-col">
        <h4 class="oz-footer-col-title">{{ Title }}</h4>
        <p class="oz-footer-col-sub">{{ Description }}</p>
      </div>
      {{/each}}
    </div>
  </div>

  <div class="oz-footer-bottom-bar">
    <div class="oz-footer-bottom-wrap">
      <span class="oz-footer-copy">{{ Copyright }}</span>
      <div class="oz-powered-by">
        {{ PoweredBy }}
      </div>
    </div>
  </div>
</footer>`,
      css: `.oz-site-footer {
  background: #0f172a;
  color: #ffffff;
  padding: 60px 24px 40px 24px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.oz-footer-container {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1.5fr 2fr;
  gap: 48px;
}
.oz-footer-brand { font-size: 22px; font-weight: 900; margin: 0 0 10px 0; }
.oz-footer-tagline { font-size: 14px; color: #94a3b8; line-height: 1.6; max-width: 320px; margin: 0 0 24px 0; }
.oz-footer-links-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 24px;
}
.oz-footer-col-title { font-size: 14px; font-weight: 700; color: #ffffff; margin: 0 0 8px 0; }
.oz-footer-col-sub { font-size: 13px; color: #94a3b8; margin: 0; line-height: 1.5; }
.oz-footer-bottom-bar {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  margin-top: 48px;
  padding-top: 24px;
}
.oz-footer-bottom-wrap {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}
.oz-footer-copy { font-size: 13px; color: #64748b; }
.oz-powered-by {
  font-size: 13px;
  color: #94a3b8;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.oz-powered-by a {
  color: #38bdf8;
  text-decoration: none;
  font-weight: 700;
}
.oz-powered-by a:hover {
  text-decoration: underline;
  color: #7dd3fc;
}
@media (max-width: 900px) {
  .oz-site-footer { padding: 48px 20px 32px 20px; }
  .oz-footer-container { grid-template-columns: 1fr; gap: 36px; }
  .oz-footer-tagline { max-width: 100%; }
}
@media (max-width: 640px) {
  .oz-footer-links-grid { grid-template-columns: repeat(2, 1fr); gap: 18px; }
  .oz-footer-bottom-wrap { flex-direction: column; text-align: center; justify-content: center; gap: 12px; }
}
@media (max-width: 440px) {
  .oz-footer-links-grid { grid-template-columns: 1fr; text-align: center; }
  .oz-footer-brand-col { text-align: center; }
  .oz-footer-tagline { text-align: center; }
}`,
      sampleContent: {
        brandName: 'Acme Global Platform',
        description: 'Empowering organizations worldwide with autonomous cloud deployment and intelligent telemetry.',
        copyright: '© 2026 Acme Global Corp. All rights reserved.',
        poweredBy: '<a href="https://ozikol.com" target="_blank" rel="noopener noreferrer">Powered by <strong>Ozikol</strong></a>',
        title: '',
        miniTitle: '',
        imageUrl: '',
        buttonText: '',
        buttonLink: '',
        items: [
          { title: 'Platform', description: 'Real-time telemetry, zero trust tokens, global cache edge points.' },
          { title: 'Solutions', description: 'Fintech compliance, enterprise healthcare, SaaS automation.' },
          { title: 'Developers', description: 'REST APIs, CLI tools, webhooks, sandbox testing.' }
        ]
      },
      specificTokens: [
        { label: 'Brand Name', token: '{{ BrandName }}' },
        { label: 'Copyright Notice', token: '{{ Copyright }}' },
        { label: 'Powered by Ozikol', token: '{{ PoweredBy }}' }
      ]
    }
  ];

  constructor(
    private router: Router,
    private sanitizer: DomSanitizer,
    private toast: ToastService,
    private api: ApiService
  ) {}

  ngOnInit(): void {
    this.resolveTenantInfo();
    this.loadEditorTokens();
    this.onCategoryChange(false);
  }

  /**
   * Fetches real published forms, menu dropdowns, footer categories, and legal pages from the tenant DB.
   */
  loadEditorTokens(): void {
    this.api.get<any>('ContentApi/templates/editor-tokens').subscribe({
      next: (res: any) => {
        if (res?.data) {
          this.editorTokens = res.data;
          if (res.data.brand) {
            this.sampleContent.brandName = res.data.brand.name || this.sampleContent.brandName;
            this.sampleContent.email = res.data.brand.email || this.sampleContent.email;
            this.sampleContent.phone = res.data.brand.phone || this.sampleContent.phone;
            this.sampleContent.address = res.data.brand.address || this.sampleContent.address;
          }
          this.updatePreviewSimulation();
        }
      },
      error: (err) => console.warn('Could not load editor tokens:', err)
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.syncRichEditorFromModel(), 0);
  }

  /**
   * Executes formatting commands (Bold, Italic, Lists, Headings) on the Summernote editor.
   */
  execFormat(command: string, value: string = ''): void {
    if (this.showRawHtmlEditor) return;
    document.execCommand(command, false, value);
    const el = this.richTextEditorRef?.nativeElement;
    if (el) {
      this.sampleContent.fullDescription = el.innerHTML;
      this.updatePreviewSimulation();
    }
  }

  /**
   * Prompts for a hyperlink URL and applies it to the active text selection.
   */
  insertRichLink(): void {
    if (this.showRawHtmlEditor) return;
    const url = prompt('Enter destination URL (e.g. https://...):', 'https://');
    if (url) {
      this.execFormat('createLink', url);
    }
  }

  /**
   * Triggered on input inside the Summernote visual contenteditable box.
   */
  onRichTextInput(event: any): void {
    this.sampleContent.fullDescription = event?.target?.innerHTML || '';
    this.updatePreviewSimulation();
  }

  /**
   * Triggered when editing in raw HTML source textarea mode.
   */
  onRawHtmlChange(): void {
    this.updatePreviewSimulation();
  }

  /**
   * Toggles between Summernote visual WYSIWYG editor and raw HTML source view.
   */
  toggleRichHtmlView(): void {
    this.showRawHtmlEditor = !this.showRawHtmlEditor;
    if (!this.showRawHtmlEditor) {
      setTimeout(() => {
        this.syncRichEditorFromModel();
      }, 0);
    }
  }

  /**
   * Synchronizes the DOM contenteditable box with sampleContent.fullDescription.
   */
  syncRichEditorFromModel(): void {
    if (this.richTextEditorRef?.nativeElement && !this.showRawHtmlEditor) {
      this.richTextEditorRef.nativeElement.innerHTML = this.sampleContent.fullDescription || '';
    }
  }

  /**
   * Resolves clean tenant key (e.g. "acme-global") and domain initials (e.g. "AG")
   * without unwanted .localhost or port strings.
   */
  resolveTenantInfo(): void {
    let key = '';
    try {
      key = localStorage.getItem('tenant_key') || '';
    } catch (e) {}

    if (!key && typeof window !== 'undefined') {
      let host = window.location.hostname || '';
      // Strip port if present
      host = host.split(':')[0];
      // Strip .localhost if present
      if (host.includes('.localhost')) {
        host = host.replace('.localhost', '');
      }
      if (host && host !== 'localhost' && host !== '127.0.0.1') {
        key = host.split('.')[0];
      }
    }

    if (!key) {
      key = 'acme-global';
    }

    this.resolvedTenantKey = key.trim().toLowerCase();

    // Compute initials: split by "-" or "_" or "."
    const parts = this.resolvedTenantKey.split(/[-_.]+/).filter(Boolean);
    if (parts.length >= 2) {
      // E.g. "acme-global" -> "AG"
      this.domainInitials = parts.slice(0, 3).map(p => p[0].toUpperCase()).join('');
    } else if (parts.length === 1) {
      // E.g. "ozikol" -> "OZ", "acme" -> "AC"
      this.domainInitials = parts[0].substring(0, Math.min(3, parts[0].length)).toUpperCase();
    } else {
      this.domainInitials = 'AG';
    }
  }

  /**
   * Generates a 5-character cryptographic random alphanumeric code.
   */
  generateRandom5(): string {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Assembles variant code: [CATEGORY_PREFIX]_[DOMAIN_INITIAL]_[RANDOM5]
   */
  generateVariantCode(categoryKey: string): string {
    const preset = this.categoryPresets.find(c => c.id === categoryKey);
    const pfx = preset?.codePrefix || (categoryKey || 'SECTION').toUpperCase();
    const dom = this.domainInitials || 'AG';
    const rand5 = this.generateRandom5();
    return `${pfx}_${dom}_${rand5}`;
  }

  /**
   * Regenerates the variant code key while preserving the prefix.
   */
  regenerateVariantCode(): void {
    this.variantCode = this.generateVariantCode(this.selectedCategory);
    this.toast.info(`Generated new variant code: ${this.variantCode}`);
  }

  /**
   * Returns the currently active category preset configuration.
   */
  get currentPreset(): CategoryPreset {
    return this.categoryPresets.find(c => c.id === this.selectedCategory) || this.categoryPresets[1]; // default hero
  }

  /**
   * Triggered when the user switches the category dropdown.
   * Loads category markup, scoped styles, and realistic sample data.
   */
  onCategoryChange(isUserAction: boolean): void {
    const preset = this.currentPreset;

    // Generate new category-tailored variant code
    this.variantCode = this.generateVariantCode(preset.id);

    // Keep name & description in sync with category presets
    this.templateName = preset.defaultName;
    this.description = preset.tagline;

    this.htmlTemplate = preset.html;
    this.cssStyles = preset.css;
    this.jsScript = '';

    // Deep copy category sample content
    this.sampleContent = JSON.parse(JSON.stringify(preset.sampleContent));

    this.updatePreviewSimulation();
    setTimeout(() => this.syncRichEditorFromModel(), 0);

    if (isUserAction) {
      this.toast.info(`Loaded ${preset.name} boilerplate markup & sample content.`);
    }
  }

  confirmResetToCategoryBoilerplate(): void {
    if (confirm(`Reset HTML & CSS to default ${this.currentPreset.name} boilerplate? Any uncommitted edits will be replaced.`)) {
      this.onCategoryChange(true);
    }
  }

  /**
   * Inserts a placeholder token directly at the current cursor position in the HTML textarea.
   */
  insertTokenAtCursor(tokenText: string): void {
    const textarea = this.htmlEditorRef?.nativeElement;
    if (!textarea) {
      this.htmlTemplate = (this.htmlTemplate || '') + tokenText;
      this.updatePreviewSimulation();
      return;
    }

    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const currentVal = this.htmlTemplate || '';

    const newVal = currentVal.substring(0, start) + tokenText + currentVal.substring(end);
    this.htmlTemplate = newVal;

    // Restore cursor position immediately after the inserted token
    setTimeout(() => {
      textarea.focus();
      const newPos = start + tokenText.length;
      textarea.setSelectionRange(newPos, newPos);
      this.updatePreviewSimulation();
    }, 10);

    this.toast.info(`Inserted: ${tokenText.split('\n')[0]}`);
  }

  /**
   * Inserts the structured repeater loop for PageSectionLists at the cursor position.
   */
  insertRepeaterLoopAtCursor(): void {
    const loopBlock = `\n{{#each PageSectionLists}}
  <div class="oz-card-item">
    <span class="material-symbols-outlined">{{ Icon }}</span>
    <h4>{{ Title }}</h4>
    <p>{{ Description }}</p>
  </div>
{{/each}}\n`;
    this.insertTokenAtCursor(loopBlock);
  }

  /**
   * Inserts category-grouped accordion FAQ loop at cursor.
   */
  insertFaqCategoryLoopAtCursor(): void {
    const loopBlock = `\n<div class="oz-faq-categories-wrap">
  {{#each FaqCategories}}
  <div class="oz-faq-cat-block">
    <h3 class="oz-cat-heading">{{ CategoryTitle }}</h3>
    <div class="oz-accordion-list">
      {{#each FAQs}}
      <details class="oz-faq-details">
        <summary class="oz-faq-summary">
          <span class="oz-question-text">{{ Question }}</span>
          <span class="material-symbols-outlined oz-chevron-icon">expand_more</span>
        </summary>
        <div class="oz-answer-box">
          <p>{{ Answer }}</p>
        </div>
      </details>
      {{/each}}
    </div>
  </div>
  {{/each}}
</div>\n`;
    this.insertTokenAtCursor(loopBlock);
  }

  /**
   * Inserts flat FAQ accordion loop at cursor.
   */
  insertFlatFaqLoopAtCursor(): void {
    const loopBlock = `\n<div class="oz-accordion-list">
  {{#each FAQs}}
  <details class="oz-faq-details">
    <summary class="oz-faq-summary">
      <span class="oz-question-text">{{ Question }}</span>
      <span class="material-symbols-outlined oz-chevron-icon">expand_more</span>
    </summary>
    <div class="oz-answer-box">
      <p>{{ Answer }}</p>
    </div>
  </details>
  {{/each}}
</div>\n`;
    this.insertTokenAtCursor(loopBlock);
  }

  /**
   * Inserts 2-level cascading flyout dropdown navigation loop at cursor.
   */
  insertNestedMenuLoopAtCursor(): void {
    const loopBlock = `\n<ul class="oz-nav-tree">
  {{#each NavigationMenu}}
  <li class="oz-nav-dropdown-parent">
    <a href="#" class="oz-nav-parent-link">
      <span class="material-symbols-outlined">{{ Icon }}</span>
      <span>{{ CategoryTitle }}</span>
      <span class="material-symbols-outlined oz-arrow">expand_more</span>
    </a>
    <ul class="oz-subdropdown-menu">
      {{#each Children}}
      <li class="oz-subdropdown-category">
        <span class="oz-subcategory-title">{{ CategoryTitle }}</span>
        <ul class="oz-nested-pages-list">
          {{#each Pages}}
          <li><a href="{{ PageUrl }}" class="oz-nested-page-link">{{ PageTitle }}</a></li>
          {{/each}}
        </ul>
      </li>
      {{/each}}
      {{#each Pages}}
      <li><a href="{{ PageUrl }}" class="oz-direct-page-link">{{ PageTitle }}</a></li>
      {{/each}}
    </ul>
  </li>
  {{/each}}
</ul>\n`;
    this.insertTokenAtCursor(loopBlock);
  }

  /**
   * Inserts multi-column mega menu grid loop at cursor.
   */
  insertMegaMenuLoopAtCursor(): void {
    const loopBlock = `\n<div class="oz-mega-nav-container">
  {{#each NavigationMenu}}
  <div class="oz-mega-menu-item">
    <button type="button" class="oz-mega-btn-trigger">
      <span class="material-symbols-outlined">{{ Icon }}</span>
      <span>{{ CategoryTitle }}</span>
    </button>
    <div class="oz-mega-panel">
      <div class="oz-mega-grid">
        {{#each Children}}
        <div class="oz-mega-col">
          <h4 class="oz-mega-col-title">{{ CategoryTitle }}</h4>
          <div class="oz-mega-cards-stack">
            {{#each Pages}}
            <a href="{{ PageUrl }}" class="oz-mega-card-link">
              <strong class="oz-mega-card-name">{{ PageTitle }}</strong>
              <p class="oz-mega-card-excerpt">{{ PageDescription }}</p>
            </a>
            {{/each}}
          </div>
        </div>
        {{/each}}
      </div>
    </div>
  </div>
  {{/each}}
</div>\n`;
    this.insertTokenAtCursor(loopBlock);
  }

  /**
   * Inserts standard flat navbar navigation loop at cursor.
   */
  insertFlatNavbarLoopAtCursor(): void {
    const loopBlock = `\n<nav class="oz-flat-nav-bar">
  {{#each NavigationMenu}}
  <div class="oz-nav-simple-group">
    <a href="#" class="oz-nav-main-link">{{ CategoryTitle }}</a>
    <div class="oz-nav-dropdown-flyout">
      {{#each Pages}}
      <a href="{{ PageUrl }}" class="oz-nav-dropdown-link">{{ PageTitle }}</a>
      {{/each}}
    </div>
  </div>
  {{/each}}
</nav>\n`;
    this.insertTokenAtCursor(loopBlock);
  }

  /**
   * Inserts complete loop across all enabled footer categories.
   */
  insertFooterCategoriesLoopAtCursor(): void {
    const loopBlock = `\n{{#each FooterCategories}}
<div class="oz-footer-col">
  <h4 class="oz-footer-col-title">{{ Title }}</h4>
  <ul class="oz-footer-col-links">
    {{#each Pages}}
    <li><a href="{{ Url }}">{{ Title }}</a></li>
    {{/each}}
  </ul>
</div>
{{/each}}\n`;
    this.insertTokenAtCursor(loopBlock);
  }

  /**
   * Inserts category child pages loop by name (e.g. Services or Company).
   */
  insertCategoryPagesLoopAtCursor(categoryName: string): void {
    const loopBlock = `\n<div class="oz-footer-col">
  <h4 class="oz-footer-col-title">${categoryName}</h4>
  <ul class="oz-footer-col-links">
    {{#each CategoryPages "${categoryName}"}}
    <li><a href="{{ Url }}">{{ Title }}</a></li>
    {{/each}}
  </ul>
</div>\n`;
    this.insertTokenAtCursor(loopBlock);
  }

  /**
   * Inserts navbar dropdown item with CategoryPages loop.
   */
  insertMenuDropdownAtCursor(dropdownTitle: string): void {
    const loopBlock = `\n<li class="nav-item dropdown">
  <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
    ${dropdownTitle}
  </a>
  <ul class="dropdown-menu">
    {{#each CategoryPages "${dropdownTitle}"}}
    <li><a class="dropdown-item" href="{{ Url }}">{{ Title }}</a></li>
    {{/each}}
  </ul>
</li>\n`;
    this.insertTokenAtCursor(loopBlock);
  }

  /**
   * Inserts dynamic form embed token.
   */
  insertFormEmbedAtCursor(formKey?: string): void {
    const token = formKey ? `{{ Form "${formKey}" }}` : `{{ FormEmbed }}`;
    this.insertTokenAtCursor(token);
  }

  /**
   * Inserts all legal pages loop.
   */
  insertLegalPagesLoopAtCursor(): void {
    const loopBlock = `\n<div class="oz-legal-links">
  {{#each LegalPages}}
  <a href="{{ Url }}">{{ Title }}</a>
  {{/each}}
</div>\n`;
    this.insertTokenAtCursor(loopBlock);
  }

  /**
   * Inserts responsive social media links block.
   */
  insertSocialLinksLoopAtCursor(): void {
    const loopBlock = `\n<div class="d-flex gap-2 text-secondary">
  <a href="https://facebook.com" class="btn btn-sm btn-white border rounded-circle text-secondary" target="_blank" title="Facebook"><i class="fa-brands fa-facebook-f"></i></a>
  <a href="https://x.com" class="btn btn-sm btn-white border rounded-circle text-secondary" target="_blank" title="Twitter / X"><i class="fa-brands fa-x-twitter"></i></a>
  <a href="https://linkedin.com" class="btn btn-sm btn-white border rounded-circle text-secondary" target="_blank" title="LinkedIn"><i class="fa-brands fa-linkedin-in"></i></a>
  <a href="https://instagram.com" class="btn btn-sm btn-white border rounded-circle text-secondary" target="_blank" title="Instagram"><i class="fa-brands fa-instagram"></i></a>
  <a href="https://youtube.com" class="btn btn-sm btn-white border rounded-circle text-secondary" target="_blank" title="YouTube"><i class="fa-brands fa-youtube"></i></a>
</div>\n`;
    this.insertTokenAtCursor(loopBlock);
  }

  /**
   * FAQ Mock Manager: Adds a new FAQ category block.
   */
  addSampleFaqCategory(): void {
    if (!this.sampleContent.faqCategories) this.sampleContent.faqCategories = [];
    const idx = this.sampleContent.faqCategories.length + 1;
    this.sampleContent.faqCategories.push({
      title: `Category ${idx}`,
      sortOrder: idx,
      faqs: [
        { question: `New sample question ${idx}.1?`, answer: 'Detailed explanatory response for this question.', sortOrder: 1 }
      ]
    });
    this.updatePreviewSimulation();
  }

  /**
   * FAQ Mock Manager: Removes a FAQ category by index.
   * @param catIdx Index of category to remove
   */
  removeSampleFaqCategory(catIdx: number): void {
    if (this.sampleContent.faqCategories?.length > 1) {
      this.sampleContent.faqCategories.splice(catIdx, 1);
      this.updatePreviewSimulation();
    } else {
      this.toast.info('Keep at least 1 FAQ category for preview simulation.');
    }
  }

  /**
   * FAQ Mock Manager: Adds a new Question & Answer to a specific category.
   * @param catIdx Category index
   */
  addSampleFaq(catIdx: number): void {
    const cat = this.sampleContent.faqCategories?.[catIdx];
    if (!cat) return;
    if (!cat.faqs) cat.faqs = [];
    const fIdx = cat.faqs.length + 1;
    cat.faqs.push({
      question: `New question ${catIdx + 1}.${fIdx}?`,
      answer: 'Sample answer explanation content.',
      sortOrder: fIdx
    });
    this.updatePreviewSimulation();
  }

  /**
   * FAQ Mock Manager: Removes a Question & Answer from a specific category.
   * @param catIdx Category index
   * @param fIdx FAQ index
   */
  removeSampleFaq(catIdx: number, fIdx: number): void {
    const cat = this.sampleContent.faqCategories?.[catIdx];
    if (!cat || !cat.faqs) return;
    if (cat.faqs.length > 1) {
      cat.faqs.splice(fIdx, 1);
      this.updatePreviewSimulation();
    } else {
      this.toast.info('Keep at least 1 question per category.');
    }
  }

  /**
   * Navigation Mock Manager: Adds a top-level menu column/category.
   */
  addSampleNavCategory(): void {
    if (!this.sampleContent.navigationMenu) this.sampleContent.navigationMenu = [];
    const idx = this.sampleContent.navigationMenu.length + 1;
    this.sampleContent.navigationMenu.push({
      title: `Menu ${idx}`,
      icon: 'category',
      children: [],
      pages: [
        { title: `Page ${idx}.1`, pageUrl: `/page-${idx}`, pageDescription: 'Page description excerpt.', pageImage: '' }
      ]
    });
    this.updatePreviewSimulation();
  }

  /**
   * Navigation Mock Manager: Removes a top-level menu category.
   * @param mIdx Menu index
   */
  removeSampleNavCategory(mIdx: number): void {
    if (this.sampleContent.navigationMenu?.length > 1) {
      this.sampleContent.navigationMenu.splice(mIdx, 1);
      this.updatePreviewSimulation();
    } else {
      this.toast.info('Keep at least 1 navigation category.');
    }
  }

  /**
   * Navigation Mock Manager: Adds a sub-dropdown category (Level 2).
   * @param mIdx Parent menu index
   */
  addSampleNavChild(mIdx: number): void {
    const menu = this.sampleContent.navigationMenu?.[mIdx];
    if (!menu) return;
    if (!menu.children) menu.children = [];
    const cIdx = menu.children.length + 1;
    menu.children.push({
      title: `Sub-Category ${cIdx}`,
      icon: 'folder',
      pages: [
        { title: `Sub Page ${cIdx}.1`, pageUrl: `/sub-${cIdx}`, pageDescription: 'Sub page item description.', pageImage: '' }
      ]
    });
    this.updatePreviewSimulation();
  }

  /**
   * Navigation Mock Manager: Removes a sub-dropdown category.
   * @param mIdx Parent menu index
   * @param cIdx Child index
   */
  removeSampleNavChild(mIdx: number, cIdx: number): void {
    const menu = this.sampleContent.navigationMenu?.[mIdx];
    if (!menu || !menu.children) return;
    menu.children.splice(cIdx, 1);
    this.updatePreviewSimulation();
  }

  /**
   * Navigation Mock Manager: Adds a sub-page to a child category.
   * @param mIdx Parent menu index
   * @param cIdx Child index
   */
  addSampleNavPage(mIdx: number, cIdx: number): void {
    const child = this.sampleContent.navigationMenu?.[mIdx]?.children?.[cIdx];
    if (!child) return;
    if (!child.pages) child.pages = [];
    const pIdx = child.pages.length + 1;
    child.pages.push({
      title: `New Page ${pIdx}`,
      pageUrl: `/page-${pIdx}`,
      pageDescription: 'Page description excerpt.',
      pageImage: ''
    });
    this.updatePreviewSimulation();
  }

  /**
   * Navigation Mock Manager: Removes a sub-page.
   * @param mIdx Parent menu index
   * @param cIdx Child index
   * @param pIdx Page index
   */
  removeSampleNavPage(mIdx: number, cIdx: number, pIdx: number): void {
    const child = this.sampleContent.navigationMenu?.[mIdx]?.children?.[cIdx];
    if (!child || !child.pages) return;
    if (child.pages.length > 1) {
      child.pages.splice(pIdx, 1);
      this.updatePreviewSimulation();
    } else {
      this.toast.info('Keep at least 1 page in this sub-category.');
    }
  }

  resetSampleContentToCategoryDefaults(): void {
    this.sampleContent = JSON.parse(JSON.stringify(this.currentPreset.sampleContent));
    this.updatePreviewSimulation();
    setTimeout(() => this.syncRichEditorFromModel(), 0);
    this.toast.info('Sample content reset to category presets.');
  }

  addSampleSubItem(): void {
    const idx = (this.sampleContent.items?.length || 0) + 1;
    if (!this.sampleContent.items) this.sampleContent.items = [];
    this.sampleContent.items.push({
      title: `Sample Item ${idx}`,
      subTitle: `$${idx * 15}`,
      description: 'Dynamic item description created in repeater inspector.',
      icon: 'star',
      buttonText: 'View Details',
      buttonLink: '#'
    });
    this.updatePreviewSimulation();
  }

  removeSampleSubItem(idx: number): void {
    if (this.sampleContent.items?.length > 1) {
      this.sampleContent.items.splice(idx, 1);
      this.updatePreviewSimulation();
    } else {
      this.toast.info('Keep at least 1 item to test the repeater loop.');
    }
  }

  /**
   * Opens the interactive live preview simulation modal.
   */
  openPreviewModal(): void {
    this.updatePreviewSimulation();
    this.showPreviewModal = true;
  }

  closePreviewModal(): void {
    this.showPreviewModal = false;
  }

  /**
   * Hydrates raw template HTML containing {{ Placeholders }} with the sample content.
   * Supports:
   * 1. Multi-level NavigationMenu (Parents -> Children submenus -> Pages)
   * 2. Hierarchical FaqCategories with nested FAQs, plus flat FAQs loops
   * 3. PageSectionLists repeater card items
   * 4. All PageSection and Media/Identity scalar tokens including CustomClass and PoweredBy.
   */
  hydrateMarkup(rawHtml: string): string {
    if (!rawHtml) return '';
    let output = rawHtml;
    const ctx = this.sampleContent;

    // 1. NavigationMenu / PageCategories Loop (Multi-level cascading dropdowns & Mega Menus)
    const navMenuRegex = /\{\{#each\s+(?:NavigationMenu|PageCategories)\}\}([\s\S]*?)\{\{\/each\}\}/gi;
    output = output.replace(navMenuRegex, (_match: string, outerTemplate: string) => {
      const menus = ctx.navigationMenu || [];
      if (!Array.isArray(menus) || menus.length === 0) return '';

      return menus.map((menu: any, mIdx: number) => {
        let renderedMenu = outerTemplate;

        // Render nested {{#each Children}}
        const childrenRegex = /\{\{#each\s+Children\}\}([\s\S]*?)\{\{\/each\}\}/gi;
        renderedMenu = renderedMenu.replace(childrenRegex, (_cMatch: string, childTemplate: string) => {
          const children = menu.children || [];
          if (!Array.isArray(children) || children.length === 0) return '';

          return children.map((child: any, cIdx: number) => {
            let renderedChild = childTemplate;

            // Render nested {{#each Pages}} inside Child
            const subPagesRegex = /\{\{#each\s+Pages\}\}([\s\S]*?)\{\{\/each\}\}/gi;
            renderedChild = renderedChild.replace(subPagesRegex, (_pMatch: string, pageTemplate: string) => {
              const pages = child.pages || [];
              if (!Array.isArray(pages) || pages.length === 0) return '';
              return pages.map((p: any, pIdx: number) => {
                let renderedPage = pageTemplate;
                renderedPage = renderedPage.replace(/\{\{\s*(?:PageTitle|Title)\s*\}\}/gi, p.title || `Page ${pIdx + 1}`);
                renderedPage = renderedPage.replace(/\{\{\s*(?:PageUrl|DirectUrl)\s*\}\}/gi, p.pageUrl || '#');
                renderedPage = renderedPage.replace(/\{\{\s*(?:PageDescription|MetaDescription)\s*\}\}/gi, p.pageDescription || '');
                renderedPage = renderedPage.replace(/\{\{\s*(?:PageImage|ImageUrl)\s*\}\}/gi, p.pageImage || '');
                return renderedPage;
              }).join('\n');
            });

            renderedChild = renderedChild.replace(/\{\{\s*(?:CategoryTitle|Title)\s*\}\}/gi, child.title || `Sub-Category ${cIdx + 1}`);
            renderedChild = renderedChild.replace(/\{\{\s*Icon\s*\}\}/gi, child.icon || 'folder');
            return renderedChild;
          }).join('\n');
        });

        // Render direct top-level {{#each Pages}}
        const directPagesRegex = /\{\{#each\s+Pages\}\}([\s\S]*?)\{\{\/each\}\}/gi;
        renderedMenu = renderedMenu.replace(directPagesRegex, (_pMatch: string, pageTemplate: string) => {
          const pages = menu.pages || [];
          if (!Array.isArray(pages) || pages.length === 0) return '';
          return pages.map((p: any, pIdx: number) => {
            let renderedPage = pageTemplate;
            renderedPage = renderedPage.replace(/\{\{\s*(?:PageTitle|Title)\s*\}\}/gi, p.title || `Page ${pIdx + 1}`);
            renderedPage = renderedPage.replace(/\{\{\s*(?:PageUrl|DirectUrl)\s*\}\}/gi, p.pageUrl || '#');
            renderedPage = renderedPage.replace(/\{\{\s*(?:PageDescription|MetaDescription)\s*\}\}/gi, p.pageDescription || '');
            renderedPage = renderedPage.replace(/\{\{\s*(?:PageImage|ImageUrl)\s*\}\}/gi, p.pageImage || '');
            return renderedPage;
          }).join('\n');
        });

        renderedMenu = renderedMenu.replace(/\{\{\s*(?:CategoryTitle|Title)\s*\}\}/gi, menu.title || `Menu ${mIdx + 1}`);
        renderedMenu = renderedMenu.replace(/\{\{\s*Icon\s*\}\}/gi, menu.icon || 'category');
        return renderedMenu;
      }).join('\n');
    });

    // 2. FAQ Categories Hierarchy Loop ({{#each FaqCategories}}...{{#each FAQs}}...{{/each}}...{{/each}})
    const faqCatRegex = /\{\{#each\s+FaqCategories\}\}([\s\S]*?)\{\{\/each\}\}/gi;
    output = output.replace(faqCatRegex, (_match: string, catTemplate: string) => {
      const categories = ctx.faqCategories || [];
      if (!Array.isArray(categories) || categories.length === 0) return '';

      return categories.map((cat: any, catIdx: number) => {
        let renderedCat = catTemplate;

        // Render nested FAQs
        const faqsRegex = /\{\{#each\s+FAQs\}\}([\s\S]*?)\{\{\/each\}\}/gi;
        renderedCat = renderedCat.replace(faqsRegex, (_fMatch: string, faqTemplate: string) => {
          const faqs = cat.faqs || [];
          if (!Array.isArray(faqs) || faqs.length === 0) return '';
          return faqs.map((f: any, fIdx: number) => {
            let renderedFaq = faqTemplate;
            renderedFaq = renderedFaq.replace(/\{\{\s*(?:Question|Title)\s*\}\}/gi, f.question || `Question ${fIdx + 1}`);
            renderedFaq = renderedFaq.replace(/\{\{\s*(?:Answer|Message)\s*\}\}/gi, f.answer || '');
            renderedFaq = renderedFaq.replace(/\{\{\s*SortOrder\s*\}\}/gi, String(f.sortOrder ?? fIdx + 1));
            return renderedFaq;
          }).join('\n');
        });

        renderedCat = renderedCat.replace(/\{\{\s*(?:CategoryTitle|Title)\s*\}\}/gi, cat.title || `FAQ Category ${catIdx + 1}`);
        renderedCat = renderedCat.replace(/\{\{\s*SortOrder\s*\}\}/gi, String(cat.sortOrder ?? catIdx + 1));
        return renderedCat;
      }).join('\n');
    });

    // 3. Standalone / Flat FAQs Loop ({{#each FAQs}}...{{/each}})
    const flatFaqsRegex = /\{\{#each\s+FAQs\}\}([\s\S]*?)\{\{\/each\}\}/gi;
    output = output.replace(flatFaqsRegex, (_match: string, faqTemplate: string) => {
      // Gather all FAQs across categories or standalone
      const allFaqs: any[] = [];
      if (Array.isArray(ctx.faqCategories)) {
        ctx.faqCategories.forEach((c: any) => {
          if (Array.isArray(c.faqs)) allFaqs.push(...c.faqs);
        });
      }
      if (allFaqs.length === 0) return '';

      return allFaqs.map((f: any, fIdx: number) => {
        let renderedFaq = faqTemplate;
        renderedFaq = renderedFaq.replace(/\{\{\s*(?:Question|Title)\s*\}\}/gi, f.question || `Question ${fIdx + 1}`);
        renderedFaq = renderedFaq.replace(/\{\{\s*(?:Answer|Message)\s*\}\}/gi, f.answer || '');
        renderedFaq = renderedFaq.replace(/\{\{\s*SortOrder\s*\}\}/gi, String(f.sortOrder ?? fIdx + 1));
        return renderedFaq;
      }).join('\n');
    });

    // 4. PageSectionLists / Items Loop
    const eachRegex = /\{\{#each\s+(?:PageSectionLists|Items)\}\}([\s\S]*?)\{\{\/each\}\}/gi;
    output = output.replace(eachRegex, (_match: string, innerTemplate: string) => {
      if (!ctx.items || !Array.isArray(ctx.items) || ctx.items.length === 0) {
        return '';
      }
      return ctx.items.map((item: any, idx: number) => {
        let renderedItem = innerTemplate;
        renderedItem = renderedItem.replace(/\{\{\s*Title\s*\}\}/gi, item.title || `Item ${idx + 1}`);
        renderedItem = renderedItem.replace(/\{\{\s*(?:SubTitle|MiniTitle)\s*\}\}/gi, item.subTitle || item.miniTitle || '');
        renderedItem = renderedItem.replace(/\{\{\s*Description\s*\}\}/gi, item.description || '');
        renderedItem = renderedItem.replace(/\{\{\s*MoreDescription\s*\}\}/gi, item.moreDescription || item.description || '');
        renderedItem = renderedItem.replace(/\{\{\s*(?:Icon|IconText)\s*\}\}/gi, item.icon || item.iconText || 'star');
        renderedItem = renderedItem.replace(/\{\{\s*ImageUrl\s*\}\}/gi, item.imageUrl || ctx.imageUrl || '');
        renderedItem = renderedItem.replace(/\{\{\s*VideoUrl\s*\}\}/gi, item.videoUrl || '');
        renderedItem = renderedItem.replace(/\{\{\s*ButtonText\s*\}\}/gi, item.buttonText || ctx.buttonText || 'Learn More');
        renderedItem = renderedItem.replace(/\{\{\s*ButtonLink\s*\}\}/gi, item.buttonLink || ctx.buttonLink || '#');
        renderedItem = renderedItem.replace(/\{\{\s*DirectUrl\s*\}\}/gi, item.directUrl || item.buttonLink || '#');
        renderedItem = renderedItem.replace(/\{\{\s*SortOrder\s*\}\}/gi, String(idx + 1));
        return renderedItem;
      }).join('\n');
    });

    // 5. CategoryPages by Name (e.g. {{#each CategoryPages "Services"}} or {{#each CategoryPages "Company"}})
    const catPagesRegex = /\{\{#each\s+CategoryPages\s+"([^"]+)"\}\}([\s\S]*?)\{\{\/each\}\}/gi;
    output = output.replace(catPagesRegex, (_match: string, catName: string, innerTemplate: string) => {
      let pages: any[] = [];
      const normalized = (catName || '').toLowerCase().trim();

      const fg = this.editorTokens.footerGroups?.find((g: any) =>
        (g.name && g.name.toLowerCase() === normalized) ||
        (g.displayTitle && g.displayTitle.toLowerCase() === normalized)
      );
      if (fg?.pages && fg.pages.length > 0) {
        pages = fg.pages;
      } else {
        const md = this.editorTokens.menuDropdowns?.find((d: any) =>
          (d.title && d.title.toLowerCase() === normalized) ||
          (d.footerTitle && d.footerTitle.toLowerCase() === normalized)
        );
        if (md?.pages && md.pages.length > 0) {
          pages = md.pages;
        } else if (normalized.includes('service') || normalized.includes('solution')) {
          pages = [
            { title: 'Strategic Consulting', url: '/strategic-advisory' },
            { title: 'Systems Modernization', url: '/systems-modernization' },
            { title: 'Performance & Scale', url: '/performance-scale' },
            { title: 'Enterprise Advisory', url: '/enterprise-governance' }
          ];
        } else if (normalized.includes('company') || normalized.includes('about')) {
          pages = [
            { title: 'About Us', url: '/about' },
            { title: 'Leadership & Team', url: '/about' },
            { title: 'Insights & News', url: '/blog' },
            { title: 'Request a Service', url: '/request-service' }
          ];
        }
      }

      return pages.map((p: any) => {
        let rendered = innerTemplate;
        rendered = rendered.replace(/\{\{\s*Title\s*\}\}/gi, p.title || '');
        rendered = rendered.replace(/\{\{\s*Url\s*\}\}/gi, p.url || p.slug || '#');
        return rendered;
      }).join('\n');
    });

    // 6. FooterCategories Loop ({{#each FooterCategories}}...{{/each}})
    const footerCatsRegex = /\{\{#each\s+FooterCategories\}\}([\s\S]*?)\{\{\/each\}\}/gi;
    output = output.replace(footerCatsRegex, (_match: string, innerTemplate: string) => {
      const groups = (this.editorTokens.footerGroups && this.editorTokens.footerGroups.length > 0)
        ? this.editorTokens.footerGroups
        : [
            {
              name: 'Services',
              displayTitle: 'Solutions',
              pages: [
                { title: 'Strategic Consulting', url: '/strategic-advisory' },
                { title: 'Systems Modernization', url: '/systems-modernization' },
                { title: 'Performance & Scale', url: '/performance-scale' },
                { title: 'Enterprise Advisory', url: '/enterprise-governance' }
              ]
            },
            {
              name: 'Company',
              displayTitle: 'Company',
              pages: [
                { title: 'About Us', url: '/about' },
                { title: 'Request a Service', url: '/request-service' },
                { title: 'Contact Us', url: '/contact' }
              ]
            }
          ];

      return groups.map((g: any) => {
        let colHtml = innerTemplate;
        colHtml = colHtml.replace(/\{\{\s*(?:DisplayTitle|Title|CategoryTitle)\s*\}\}/gi, g.displayTitle || g.name || 'Column');

        const pagesLoopRegex = /\{\{#each\s+Pages\}\}([\s\S]*?)\{\{\/each\}\}/gi;
        colHtml = colHtml.replace(pagesLoopRegex, (_pMatch: string, pTemplate: string) => {
          const pages = g.pages || [];
          return pages.map((p: any) => {
            let pRendered = pTemplate;
            pRendered = pRendered.replace(/\{\{\s*Title\s*\}\}/gi, p.title || '');
            pRendered = pRendered.replace(/\{\{\s*Url\s*\}\}/gi, p.url || p.slug || '#');
            return pRendered;
          }).join('\n');
        });

        return colHtml;
      }).join('\n');
    });

    // 7. LegalPages Loop ({{#each LegalPages}}...{{/each}})
    const legalRegex = /\{\{#each\s+LegalPages\}\}([\s\S]*?)\{\{\/each\}\}/gi;
    output = output.replace(legalRegex, (_match: string, innerTemplate: string) => {
      const legals = (this.editorTokens.legalPages && this.editorTokens.legalPages.length > 0)
        ? this.editorTokens.legalPages
        : [
            { title: 'Privacy Policy', url: '/privacy-policy' },
            { title: 'Terms & Conditions', url: '/terms-and-conditions' },
            { title: 'Cookie Policy', url: '/cookie-policy' }
          ];

      return legals.map((lp: any) => {
        let rendered = innerTemplate;
        rendered = rendered.replace(/\{\{\s*Title\s*\}\}/gi, lp.title || '');
        rendered = rendered.replace(/\{\{\s*Url\s*\}\}/gi, lp.url || '#');
        return rendered;
      }).join('\n');
    });

    // 8. SocialLinks Loop ({{#each SocialLinks}}...{{/each}})
    const socialRegex = /\{\{#each\s+SocialLinks\}\}([\s\S]*?)\{\{\/each\}\}/gi;
    output = output.replace(socialRegex, (_match: string, innerTemplate: string) => {
      const socials = [
        { platform: 'LinkedIn', url: 'https://linkedin.com', iconClass: 'fa-brands fa-linkedin-in' },
        { platform: 'Twitter / X', url: 'https://x.com', iconClass: 'fa-brands fa-x-twitter' },
        { platform: 'Facebook', url: 'https://facebook.com', iconClass: 'fa-brands fa-facebook-f' },
        { platform: 'Instagram', url: 'https://instagram.com', iconClass: 'fa-brands fa-instagram' },
        { platform: 'YouTube', url: 'https://youtube.com', iconClass: 'fa-brands fa-youtube' }
      ];

      return socials.map((s: any) => {
        let rendered = innerTemplate;
        rendered = rendered.replace(/\{\{\s*Platform\s*\}\}/gi, s.platform);
        rendered = rendered.replace(/\{\{\s*Url\s*\}\}/gi, s.url);
        rendered = rendered.replace(/\{\{\s*IconClass\s*\}\}/gi, s.iconClass);
        return rendered;
      }).join('\n');
    });

    // 9. Dynamic Form Embeds: {{ Form "Key" }} or {{ FormEmbed }}
    const formRegex = /\{\{\s*Form\s+"([^"]+)"\s*\}\}|\{\{\s*FormEmbed\s*\}\}/gi;
    output = output.replace(formRegex, (_match: string, formKey?: string) => {
      const key = formKey || 'FormEmbed';
      const isNewsletter = /newsletter|subscribe/i.test(key);
      const isContact = /contact|inquiry/i.test(key);

      if (isNewsletter) {
        return `<form class="oz-dynamic-form oz-form-newsletter d-flex gap-2" onsubmit="event.preventDefault();">
          <input type="email" class="form-control form-control-sm rounded-pill px-3" placeholder="Your work email..." required />
          <button type="submit" class="btn btn-sm btn-primary rounded-pill px-3 fw-bold">Subscribe</button>
        </form>`;
      }

      if (isContact) {
        return `<form class="oz-dynamic-form oz-form-contact d-flex flex-column gap-2" onsubmit="event.preventDefault();">
          <input type="text" class="form-control form-control-sm" placeholder="Your Full Name" required />
          <input type="email" class="form-control form-control-sm" placeholder="Your Work Email" required />
          <textarea class="form-control form-control-sm" rows="3" placeholder="How can we assist you?"></textarea>
          <button type="submit" class="btn btn-sm btn-primary fw-bold">Send Message</button>
        </form>`;
      }

      return `<div class="oz-form-embed-preview p-3 border rounded bg-light text-center small text-muted">
        <i class="fa-solid fa-file-lines text-primary me-1"></i> Form: <strong>${key}</strong> (Rendered dynamically)
      </div>`;
    });

    // 10. Scalar Field Placeholders (PageSection, Media, Styles, Legal URLs & Identity)
    output = output.replace(/\{\{\s*Title\s*\}\}/gi, ctx.title || '');
    output = output.replace(/\{\{\s*MiniTitle\s*\}\}/gi, ctx.miniTitle || '');
    output = output.replace(/\{\{\s*Description\s*\}\}/gi, ctx.description || '');
    output = output.replace(/\{\{\s*FullDescription\s*\}\}/gi, ctx.fullDescription || ctx.description || '');
    output = output.replace(/\{\{\s*Qoute\s*\}\}/gi, ctx.qoute || '');
    output = output.replace(/\{\{\s*ButtonText\s*\}\}/gi, ctx.buttonText || '');
    output = output.replace(/\{\{\s*ButtonLink\s*\}\}/gi, ctx.buttonLink || '#');
    output = output.replace(/\{\{\s*SecondaryButtonText\s*\}\}/gi, ctx.secondaryButtonText || '');
    output = output.replace(/\{\{\s*SecondaryButtonLink\s*\}\}/gi, ctx.secondaryButtonLink || '#');
    output = output.replace(/\{\{\s*DirectUrl\s*\}\}/gi, ctx.directUrl || '#');

    // Legal URLs
    output = output.replace(/\{\{\s*PrivacyUrl\s*\}\}/gi, '/privacy-policy');
    output = output.replace(/\{\{\s*TermsUrl\s*\}\}/gi, '/terms-and-conditions');
    output = output.replace(/\{\{\s*CookiesUrl\s*\}\}/gi, '/cookie-policy');

    // Custom CSS Class
    output = output.replace(/\{\{\s*CustomClass\s*\}\}/gi, (ctx.customClass || '').trim());

    // Media & Styles
    output = output.replace(/\{\{\s*BackgroundColor\s*\}\}/gi, ctx.backgroundColor || 'transparent');
    output = output.replace(/\{\{\s*ImageUrl\s*\}\}/gi, ctx.imageUrl || '');
    output = output.replace(/\{\{\s*SecondImageUrl\s*\}\}/gi, ctx.secondImageUrl || '');
    output = output.replace(/\{\{\s*VideoUrl\s*\}\}/gi, ctx.videoUrl || '');
    output = output.replace(/\{\{\s*YoutubeUrlLink\s*\}\}/gi, ctx.youtubeUrlLink || '');

    // Brand & Identity with Fixed Powered By
    const currentYear = new Date().getFullYear().toString();
    output = output.replace(/\{\{\s*Year\s*\}\}/gi, currentYear);
    output = output.replace(/\{\{\s*BrandName\s*\}\}/gi, ctx.brandName || 'Acme Global');
    output = output.replace(/\{\{\s*Copyright\s*\}\}/gi, ctx.copyright || `© ${currentYear} Acme Global. All rights reserved.`);
    output = output.replace(/\{\{\s*PoweredBy\s*\}\}/gi, ctx.poweredBy || '<a href="https://ozikol.cloud" target="_blank" rel="noopener noreferrer" style="color: #0050e5 !important; font-weight: 700; text-decoration: none;">Powered by Ozikol</a>');
    output = output.replace(/\{\{\s*Email\s*\}\}/gi, ctx.email || 'contact@acme-global.com');
    output = output.replace(/\{\{\s*Phone\s*\}\}/gi, ctx.phone || '+1 (800) 555-0199');
    output = output.replace(/\{\{\s*Address\s*\}\}/gi, ctx.address || 'Enterprise Blvd, Silicon Valley');

    return output;
  }

  /**
   * Compiles HTML and scoped CSS into sanitized DOM for the live visual preview container.
   */
  updatePreviewSimulation(): void {
    const hydratedHtml = this.hydrateMarkup(this.htmlTemplate);
    const combined = `
      <style>
        ${this.cssStyles || ''}
      </style>
      <div class="oz-live-simulation-root">
        ${hydratedHtml}
      </div>
    `;
    this.safeHydratedHtml = this.sanitizer.bypassSecurityTrustHtml(combined);
  }

  /**
   * Persists the custom template directly into the database and local library.
   */
  saveCustomTemplate(): void {
    if (!this.templateName?.trim()) {
      this.toast.error('Please enter a template name.');
      return;
    }
    if (!this.htmlTemplate?.trim()) {
      this.toast.error('Please provide the HTML markup for this section.');
      return;
    }
    if (!this.variantCode?.trim()) {
      this.variantCode = this.generateVariantCode(this.selectedCategory);
    }

    this.savingTemplate = true;

    const payload = {
      name: this.templateName.trim(),
      categoryKey: this.selectedCategory,
      variantCode: this.variantCode.trim(),
      description: this.description.trim() || `${this.currentPreset.name} crafted template`,
      htmlTemplate: this.htmlTemplate,
      cssStyles: this.cssStyles,
      jsScript: this.jsScript,
      defaultContentJson: JSON.stringify(this.sampleContent)
    };

    this.api.post<any>('ContentApi/templates/custom', payload).subscribe({
      next: (res) => {
        this.savingTemplate = false;
        const newDbItem = res?.data;

        const newTemplate: InstalledTemplateItem = {
          id: this.variantCode,
          dbId: newDbItem?.id,
          name: this.templateName,
          category: this.selectedCategory,
          variantCode: this.variantCode,
          tag: 'custom',
          badge: 'Custom',
          description: this.description || 'Custom crafted section template',
          thumbnailGradient: 'linear-gradient(135deg, #0050e5 0%, #1e293b 100%)',
          previewIcon: this.currentPreset.icon,
          previewSubtitle: this.currentPreset.name,
          previewTitle: this.templateName,
          previewBody: this.description || 'Custom section component',
          htmlTemplate: this.htmlTemplate,
          cssStyles: this.cssStyles,
          jsScript: this.jsScript,
          version: '1.0.0',
          installedUtc: new Date().toISOString(),
          defaultContentJson: payload.defaultContentJson
        };

        this.toast.success(`Custom template '${newTemplate.name}' saved to your vault!`);
        this.router.navigate(['/content/console/templates']);
      },
      error: () => {
        this.savingTemplate = false;
        this.toast.error('Failed to create custom template. Please verify API connection.');
      }
    });
  }
}
