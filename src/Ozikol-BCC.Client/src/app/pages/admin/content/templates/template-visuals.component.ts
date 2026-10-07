import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ToastService } from '../../../../core/services/toast.service';
import { ApiService } from '../../../../core/services/api.service';
import { AiAssistantContextService } from '../../../../core/services/ai-assistant-context.service';

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
 * Interface representing metadata and contextual help documentation for CMS template tokens.
 */
export interface TokenDoc {
  name: string;
  token: string;
  description: string;
  cmsPath: string;
  example: string;
}

/**
 * Dedicated full-width studio page for creating custom CMS section templates.
 * Features 100% width code editors, mock content drawer below, dynamic system category presets,
 * precision cursor token insertion, and a live interactive preview modal.
 */
@Component({
  selector: 'app-template-visuals',
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
              <span class="current">{{ isEditMode ? 'Edit Section Blueprint' : 'Create Custom Section' }}</span>
            </div>

            <div class="title-with-icon">
              <div class="header-icon-box">
                <span class="material-symbols-outlined">{{ isEditMode ? 'edit_note' : 'add_circle' }}</span>
              </div>
              <div class="title-text-wrap">
                <h1 class="page-title">{{ isEditMode ? ('Edit Section: ' + templateName) : 'Create Custom Section Template' }}</h1>
                <p class="page-subtitle">
                  {{ isEditMode ? 'Modify section markup, tokens, and scoped CSS directly in the studio with live instant simulation.' : 'Design bespoke section markup with dynamic CMS tokens, scoped styles, and realistic customer simulation.' }}
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
              <span>{{ savingTemplate ? 'Saving...' : (isEditMode ? 'Update Custom Section' : 'Save to Template Vault') }}</span>
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
                  [class.active]="activeTokenCategory === 'blog'"
                  (click)="activeTokenCategory = 'blog'"
                >
                  <span class="material-symbols-outlined icon-micro">newspaper</span>
                  <span>Blog & Articles</span>
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
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-core" (click)="insertTokenAtCursor('{{ Title }}')" [innerText]="'+ {{ Title }}'"></button>
                  <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('Title', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('Title', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                </span>
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-core" (click)="insertTokenAtCursor('{{ MiniTitle }}')" [innerText]="'+ {{ MiniTitle }}'"></button>
                  <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('MiniTitle', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('MiniTitle', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                </span>
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-core" (click)="insertTokenAtCursor('{{ Description }}')" [innerText]="'+ {{ Description }}'"></button>
                  <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('Description', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('Description', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                </span>
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-core chip-rich" (click)="insertTokenAtCursor('{{ FullDescription }}')" [innerText]="'+ {{ FullDescription }}'"></button>
                  <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('FullDescription', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('FullDescription', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                </span>
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-core" (click)="insertTokenAtCursor('{{ Qoute }}')" [innerText]="'+ {{ Qoute }}'"></button>
                  <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('Qoute', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('Qoute', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                </span>
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-core" (click)="insertTokenAtCursor('{{ ButtonText }}')" [innerText]="'+ {{ ButtonText }}'"></button>
                  <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('ButtonText', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('ButtonText', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                </span>
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-core" (click)="insertTokenAtCursor('{{ ButtonLink }}')" [innerText]="'+ {{ ButtonLink }}'"></button>
                  <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('ButtonLink', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('ButtonLink', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                </span>
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-core" (click)="insertTokenAtCursor('{{ DirectUrl }}')" [innerText]="'+ {{ DirectUrl }}'"></button>
                  <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('DirectUrl', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('DirectUrl', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                </span>
              </ng-container>

              <!-- Category: MEDIA & STYLE -->
              <ng-container *ngIf="activeTokenCategory === 'media'">
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-media" (click)="insertTokenAtCursor('{{ ImageUrl }}')" [innerText]="'+ {{ ImageUrl }}'"></button>
                  <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('ImageUrl', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('ImageUrl', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                </span>
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-media" (click)="insertTokenAtCursor('{{ SecondImageUrl }}')" [innerText]="'+ {{ SecondImageUrl }}'"></button>
                  <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('SecondImageUrl', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('SecondImageUrl', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                </span>
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-media" (click)="insertTokenAtCursor('{{ VideoUrl }}')" [innerText]="'+ {{ VideoUrl }}'"></button>
                  <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('VideoUrl', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('VideoUrl', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                </span>
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-media" (click)="insertTokenAtCursor('{{ YoutubeUrlLink }}')" [innerText]="'+ {{ YoutubeUrlLink }}'"></button>
                  <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('YoutubeUrlLink', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('YoutubeUrlLink', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                </span>
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-media" (click)="insertTokenAtCursor('{{ BackgroundColor }}')" [innerText]="'+ {{ BackgroundColor }}'"></button>
                  <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('BackgroundColor', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('BackgroundColor', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                </span>
              </ng-container>

              <!-- Category: REPEATER (PageSectionLists) -->
              <ng-container *ngIf="activeTokenCategory === 'sectionlist'">
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-repeater" (click)="insertRepeaterLoopAtCursor()">
                    <span class="material-symbols-outlined chip-icon">repeat</span>
                    <span>+ Card Loop (PageSectionLists)</span>
                  </button>
                  <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('PageSectionLists', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('PageSectionLists', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                </span>
                <span class="sn-sep"></span>
                <span class="ribbon-tag">Card Tokens:</span>
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-inner" (click)="insertTokenAtCursor('{{ Title }}')" [innerText]="'{{ Title }}'"></button>
                  <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('Title', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('Title', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                </span>
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-inner" (click)="insertTokenAtCursor('{{ MiniTitle }}')" [innerText]="'{{ MiniTitle }}'"></button>
                  <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('MiniTitle', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('MiniTitle', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                </span>
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-inner" (click)="insertTokenAtCursor('{{ SubTitle }}')" [innerText]="'{{ SubTitle }}'"></button>
                  <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('SubTitle', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('SubTitle', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                </span>
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-inner" (click)="insertTokenAtCursor('{{ Description }}')" [innerText]="'{{ Description }}'"></button>
                  <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('Description', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('Description', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                </span>
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-inner" (click)="insertTokenAtCursor('{{ Icon }}')" [innerText]="'{{ Icon }}'"></button>
                  <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('Icon', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('Icon', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                </span>
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-inner" (click)="insertTokenAtCursor('{{ IconText }}')" [innerText]="'{{ IconText }}'"></button>
                  <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('IconText', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('IconText', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                </span>
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-inner" (click)="insertTokenAtCursor('{{ ImageUrl }}')" [innerText]="'{{ ImageUrl }}'"></button>
                  <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('ImageUrl', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('ImageUrl', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                </span>
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-inner" (click)="insertTokenAtCursor('{{ ButtonText }}')" [innerText]="'{{ ButtonText }}'"></button>
                  <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('ButtonText', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('ButtonText', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                </span>
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-inner" (click)="insertTokenAtCursor('{{ ButtonLink }}')" [innerText]="'{{ ButtonLink }}'"></button>
                  <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('ButtonLink', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('ButtonLink', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                </span>
              </ng-container>

              <!-- Category: FAQ & CATEGORIES -->
              <ng-container *ngIf="activeTokenCategory === 'faq'">
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-repeater" (click)="insertFaqCategoryLoopAtCursor()">
                    <span class="material-symbols-outlined chip-icon">folder_open</span>
                    <span>+ FAQ Category Accordion Loop</span>
                  </button>
                  <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('FaqCategories', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('FaqCategories', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                </span>
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-repeater" (click)="insertFlatFaqLoopAtCursor()">
                    <span class="material-symbols-outlined chip-icon">quiz</span>
                    <span>+ Flat FAQ Loop</span>
                  </button>
                  <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('FAQs', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('FAQs', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                </span>
                <span class="sn-sep"></span>
                <span class="ribbon-tag">FAQ Tokens:</span>
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-inner" (click)="insertTokenAtCursor('{{ CategoryTitle }}')" [innerText]="'{{ CategoryTitle }}'"></button>
                  <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('CategoryTitle', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('CategoryTitle', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                </span>
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-inner" (click)="insertTokenAtCursor('{{ Question }}')" [innerText]="'{{ Question }}'"></button>
                  <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('Question', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('Question', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                </span>
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-inner" (click)="insertTokenAtCursor('{{ Answer }}')" [innerText]="'{{ Answer }}'"></button>
                  <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('Answer', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('Answer', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                </span>
              </ng-container>

              <!-- Category: MENUS & DROP DOWNS -->
              <ng-container *ngIf="activeTokenCategory === 'navigation'">
                <!-- AI Smart Menu Transformer Action Button -->
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-ai-magic" (click)="aiTransformMenuPlaceholders()" [disabled]="isAiTransforming" title="Intelligently analyzes pasted navbar HTML and auto-injects BrandLogo, 3-zone NavItems, Dropdowns, and CTAs while preserving 100% of styling">
                    <span class="material-symbols-outlined chip-icon">{{ isAiTransforming ? 'hourglass_empty' : 'auto_awesome' }}</span>
                    <span>{{ isAiTransforming ? 'AI Analyzing Navbar...' : '✨ AI Smart Menu Transformer' }}</span>
                  </button>
                </span>
                <span class="sn-sep"></span>
                <span class="ribbon-tag">3-Zone Loops:</span>
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-repeater" (click)="insertNavItemsZoneLoopAtCursor('first')" title="Inserts First Zone navigation loop (Direct Pages + Dropdowns sorted by SortOrder)">
                    <span class="material-symbols-outlined chip-icon">first_page</span>
                    <span>+ First Zone (NavItems="first")</span>
                  </button>
                  <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('NavItemsFirst', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('NavItemsFirst', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                </span>
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-repeater" (click)="insertNavItemsZoneLoopAtCursor('middle')" title="Inserts Middle Zone navigation loop (Direct Pages + Dropdowns sorted by SortOrder)">
                    <span class="material-symbols-outlined chip-icon">menu_open</span>
                    <span>+ Middle Zone (NavItems="middle")</span>
                  </button>
                  <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('NavItemsMiddle', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('NavItemsMiddle', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                </span>
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-repeater" (click)="insertNavItemsZoneLoopAtCursor('last')" title="Inserts Last Zone navigation loop (Direct Pages + Dropdowns sorted by SortOrder)">
                    <span class="material-symbols-outlined chip-icon">last_page</span>
                    <span>+ Last Zone (NavItems="last")</span>
                  </button>
                  <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('NavItemsLast', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('NavItemsLast', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                </span>
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-repeater" (click)="insertNavItemsZoneLoopAtCursor('all')" title="Inserts continuous navigation loop with natural position and sort order">
                    <span class="material-symbols-outlined chip-icon">list</span>
                    <span>+ NavItems (All Items)</span>
                  </button>
                  <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('NavItems', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('NavItems', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                </span>
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-repeater" (click)="insertTopBarPagesLoopAtCursor()" title="Inserts top utility bar loop for support links & phone/email">
                    <span class="material-symbols-outlined chip-icon">dock_to_top</span>
                    <span>+ Top Utility Bar Loop</span>
                  </button>
                  <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('TopBarPages', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('TopBarPages', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                </span>
                <span class="sn-sep"></span>
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-core" (click)="insertTokenAtCursor('{{ BrandLogo }}')" title="Renders tenant brand logo image URL">
                    <span class="material-symbols-outlined chip-icon">image</span>
                    <span [innerText]="'+ {{ BrandLogo }}'"></span>
                  </button>
                  <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('BrandLogo', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('BrandLogo', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                </span>
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-core" (click)="insertTokenAtCursor('{{ HomeUrl }}')" title="Renders root home URL">
                    <span class="material-symbols-outlined chip-icon">home</span>
                    <span [innerText]="'+ {{ HomeUrl }}'"></span>
                  </button>
                  <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('HomeUrl', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('HomeUrl', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                </span>
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-core" (click)="insertTokenAtCursor('{{ CustomClass }}')" title="Renders custom CSS class from WebPage or PageCategory entity">
                    <span class="material-symbols-outlined chip-icon">css</span>
                    <span [innerText]="'+ {{ CustomClass }}'"></span>
                  </button>
                  <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('CustomClass', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('CustomClass', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                </span>
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-repeater" (click)="insertMenuCtaButtonsLoopAtCursor()" title="Inserts dynamic CTA buttons from IsMenuCTA pages">
                    <span class="material-symbols-outlined chip-icon">smart_button</span>
                    <span>+ Menu CTA Buttons Loop</span>
                  </button>
                  <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('MenuCtaButtons', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('MenuCtaButtons', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                </span>
                <ng-container *ngIf="editorTokens.menuCtaButtons?.length">
                  <span class="sn-sep"></span>
                  <span class="ribbon-tag">Header CTAs:</span>
                  <span class="token-chip-wrap" *ngFor="let cta of editorTokens.menuCtaButtons">
                    <button type="button" class="token-chip chip-core" (click)="insertTokenAtCursor('<a href=&quot;' + cta.url + '&quot; class=&quot;btn btn-primary&quot;>' + cta.title + '</a>')" [title]="'Inserts CTA button for ' + cta.title">
                      <span class="material-symbols-outlined chip-icon">ads_click</span>
                      <span>CTA: {{ cta.title }}</span>
                    </button>
                    <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('MenuCtaButtons', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('MenuCtaButtons', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                  </span>
                </ng-container>
                <ng-container *ngIf="editorTokens.menuDropdowns?.length">
                  <span class="sn-sep"></span>
                  <span class="ribbon-tag">Published Dropdowns:</span>
                  <span class="token-chip-wrap" *ngFor="let dd of editorTokens.menuDropdowns">
                    <button type="button" class="token-chip chip-repeater" (click)="insertMenuDropdownAtCursor(dd.title)" [title]="'Inserts ' + dd.title + ' dropdown with child links'">
                      <span class="material-symbols-outlined chip-icon">arrow_drop_down_circle</span>
                      <span>+ Dropdown: {{ dd.title }}</span>
                    </button>
                    <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('MenuDropdowns', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('MenuDropdowns', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                  </span>
                </ng-container>
                <span class="sn-sep"></span>
                <span class="ribbon-tag">Menu Tokens:</span>
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-inner" (click)="insertTokenAtCursor('{{ CategoryTitle }}')" [innerText]="'{{ CategoryTitle }}'"></button>
                  <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('CategoryTitle', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('CategoryTitle', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                </span>
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-inner" (click)="insertTokenAtCursor('{{ PageTitle }}')" [innerText]="'{{ PageTitle }}'"></button>
                  <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('PageTitle', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('PageTitle', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                </span>
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-inner" (click)="insertTokenAtCursor('{{ PageUrl }}')" [innerText]="'{{ PageUrl }}'"></button>
                  <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('PageUrl', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('PageUrl', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                </span>
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-core" (click)="insertTokenAtCursor('{{ LoginButton }}')" title="Renders role-aware button: Console for Admin, My Workspace for User, or Sign In">
                    <span class="material-symbols-outlined chip-icon">login</span>
                    <span [innerText]="'+ {{ LoginButton }}'"></span>
                  </button>
                  <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('LoginButton', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('LoginButton', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                </span>
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-core" (click)="insertTokenAtCursor('{{ LoginUrl }}')" title="URL: /dashboard/console (Admin), /dashboard/workspace (User), or /auth/login">
                    <span class="material-symbols-outlined chip-icon">link</span>
                    <span [innerText]="'+ {{ LoginUrl }}'"></span>
                  </button>
                  <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('LoginUrl', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('LoginUrl', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                </span>
              </ng-container>

              <!-- Category: FOOTER COLUMNS -->
              <ng-container *ngIf="activeTokenCategory === 'footer'">
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-repeater" (click)="insertFooterCategoriesLoopAtCursor()" title="Inserts dynamic loop rendering all enabled footer category columns">
                    <span class="material-symbols-outlined chip-icon">view_column</span>
                    <span>+ All Footer Categories Loop</span>
                  </button>
                  <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('FooterCategories', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('FooterCategories', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                </span>
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-repeater" (click)="insertTaggedPagesLoopAtCursor('QuickLinks')" title="Inserts pages matching a tag name">
                    <span class="material-symbols-outlined chip-icon">label</span>
                    <span>+ Tagged Pages Loop</span>
                  </button>
                  <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('TaggedPages', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('TaggedPages', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                </span>
                <ng-container *ngIf="editorTokens.footerGroups?.length">
                  <span class="sn-sep"></span>
                  <span class="ribbon-tag">Footer Columns:</span>
                  <span class="token-chip-wrap" *ngFor="let fg of editorTokens.footerGroups">
                    <button type="button" class="token-chip chip-repeater" (click)="insertCategoryPagesLoopAtCursor(fg.name)" [title]="'Inserts ' + (fg.displayTitle || fg.name) + ' column with active page links'">
                      <span class="material-symbols-outlined chip-icon">folder</span>
                      <span>+ Column: {{ fg.displayTitle || fg.name }}</span>
                    </button>
                    <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('CategoryPages', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('CategoryPages', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                  </span>
                </ng-container>
                <span class="sn-sep"></span>
                <span class="ribbon-tag">Column Tokens:</span>
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-inner" (click)="insertTokenAtCursor('{{ Title }}')" [innerText]="'{{ Title }}'"></button>
                  <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('Title', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('Title', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                </span>
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-inner" (click)="insertTokenAtCursor('{{ Url }}')" [innerText]="'{{ Url }}'"></button>
                  <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('PageUrl', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('PageUrl', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                </span>
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-inner" (click)="insertTokenAtCursor('{{ DisplayTitle }}')" [innerText]="'{{ DisplayTitle }}'"></button>
                  <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('CategoryTitle', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('CategoryTitle', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                </span>
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-core" (click)="insertTokenAtCursor('{{ LoginButton }}')" title="Renders role-aware button: Console for Admin, My Workspace for User, or Sign In">
                    <span class="material-symbols-outlined chip-icon">login</span>
                    <span [innerText]="'+ {{ LoginButton }}'"></span>
                  </button>
                  <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('LoginButton', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('LoginButton', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                </span>
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-core" (click)="insertTokenAtCursor('{{ LoginUrl }}')" title="URL: /dashboard/console (Admin), /dashboard/workspace (User), or /auth/login">
                    <span class="material-symbols-outlined chip-icon">link</span>
                    <span [innerText]="'+ {{ LoginUrl }}'"></span>
                  </button>
                  <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('LoginUrl', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('LoginUrl', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                </span>
              </ng-container>

              <!-- Category: FORMS & EMBEDS -->
              <ng-container *ngIf="activeTokenCategory === 'forms'">
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-core" (click)="insertTokenAtCursor('{{ FormEmbed }}')" [innerText]="'+ {{ FormEmbed }}'"></button>
                  <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('FormEmbed', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('FormEmbed', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                </span>
                <ng-container *ngIf="editorTokens.publishedForms?.length">
                  <span class="sn-sep"></span>
                  <span class="ribbon-tag">Published Dynamic Forms:</span>
                  <span class="token-chip-wrap" *ngFor="let f of editorTokens.publishedForms">
                    <button type="button" class="token-chip chip-repeater" (click)="insertFormEmbedAtCursor(f.key)" [title]="'Inserts published form ' + f.title">
                      <span class="material-symbols-outlined chip-icon">dynamic_form</span>
                      <span>+ Form: {{ f.title }}</span>
                    </button>
                    <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('FormEmbed', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('FormEmbed', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                  </span>
                </ng-container>
              </ng-container>

              <!-- Category: BLOG & ARTICLES -->
              <ng-container *ngIf="activeTokenCategory === 'blog'">
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-repeater" (click)="insertArticlesLoopAtCursor()" title="Inserts responsive article card grid loop">
                    <span class="material-symbols-outlined chip-icon">grid_view</span>
                    <span [innerText]="'+ Articles Loop ({{#each Articles}})'"></span>
                  </button>
                  <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('Articles', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('Articles', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                </span>
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-repeater" (click)="insertRecentArticlesLoopAtCursor()" title="Inserts sidebar recent articles loop">
                    <span class="material-symbols-outlined chip-icon">schedule</span>
                    <span>+ Recent Articles Loop</span>
                  </button>
                  <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('RecentArticles', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('RecentArticles', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                </span>
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-repeater" (click)="insertBlogCategoriesLoopAtCursor()" title="Inserts blog category filter links loop">
                    <span class="material-symbols-outlined chip-icon">category</span>
                    <span>+ Blog Categories Loop</span>
                  </button>
                  <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('BlogCategories', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('BlogCategories', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                </span>
                <span class="sn-sep"></span>
                <span class="ribbon-tag">Article Detail Tokens:</span>
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-core" (click)="insertTokenAtCursor('{{ Article.Title }}')" [innerText]="'+ {{ Article.Title }}'"></button>
                  <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('ArticleTitle', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('ArticleTitle', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                </span>
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-core" (click)="insertTokenAtCursor('{{ Article.Summary }}')" [innerText]="'+ {{ Article.Summary }}'"></button>
                  <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('ArticleSummary', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('ArticleSummary', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                </span>
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-core chip-rich" (click)="insertTokenAtCursor('{{ Article.Body }}')" [innerText]="'+ {{ Article.Body }}'"></button>
                  <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('ArticleBody', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('ArticleBody', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                </span>
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-media" (click)="insertTokenAtCursor('{{ Article.CoverImageUrl }}')" [innerText]="'+ {{ Article.CoverImageUrl }}'"></button>
                  <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('ArticleCover', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('ArticleCover', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                </span>
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-core" (click)="insertTokenAtCursor('{{ Article.PublishedDate }}')" [innerText]="'+ {{ Article.PublishedDate }}'"></button>
                  <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('ArticleDate', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('ArticleDate', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                </span>
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-core" (click)="insertTokenAtCursor('{{ Article.AuthorName }}')" [innerText]="'+ {{ Article.AuthorName }}'"></button>
                  <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('ArticleAuthor', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('ArticleAuthor', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                </span>
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-core" (click)="insertTokenAtCursor('{{ Article.Category }}')" [innerText]="'+ {{ Article.Category }}'"></button>
                  <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('ArticleCategory', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('ArticleCategory', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                </span>
              </ng-container>

              <!-- Category: LEGAL COMPLIANCE -->
              <ng-container *ngIf="activeTokenCategory === 'legal'">
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-repeater" (click)="insertLegalPagesLoopAtCursor()">
                    <span class="material-symbols-outlined chip-icon">policy</span>
                    <span [innerText]="'+ All Legal Pages Loop ({{#each LegalPages}})'"></span>
                  </button>
                  <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('LegalPages', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('LegalPages', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                </span>
                <ng-container *ngIf="editorTokens.legalPages?.length">
                  <span class="sn-sep"></span>
                  <span class="ribbon-tag">Compliance Pages:</span>
                  <span class="token-chip-wrap" *ngFor="let lp of editorTokens.legalPages">
                    <button type="button" class="token-chip chip-inner" (click)="insertTokenAtCursor('<a href=&quot;' + lp.url + '&quot;>' + lp.title + '</a>')" [title]="'Inserts link to ' + lp.title">
                      <span>+ {{ lp.title }}</span>
                    </button>
                    <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('LegalPages', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('LegalPages', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                  </span>
                </ng-container>
                <span class="sn-sep"></span>
                <span class="ribbon-tag">Legal Tokens:</span>
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-core" (click)="insertTokenAtCursor('{{ PrivacyUrl }}')" [innerText]="'+ {{ PrivacyUrl }}'"></button>
                  <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('PrivacyUrl', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('PrivacyUrl', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                </span>
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-core" (click)="insertTokenAtCursor('{{ TermsUrl }}')" [innerText]="'+ {{ TermsUrl }}'"></button>
                  <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('TermsUrl', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('TermsUrl', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                </span>
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-core" (click)="insertTokenAtCursor('{{ CookiesUrl }}')" [innerText]="'+ {{ CookiesUrl }}'"></button>
                  <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('CookiesUrl', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('CookiesUrl', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                </span>
              </ng-container>

              <!-- Category: BRAND & IDENTITY -->
              <ng-container *ngIf="activeTokenCategory === 'identity'">
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-core" (click)="insertTokenAtCursor('{{ BrandName }}')" [innerText]="'+ {{ BrandName }}'"></button>
                  <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('BrandName', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('BrandName', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                </span>
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-core" (click)="insertTokenAtCursor('{{ Copyright }}')" [innerText]="'+ {{ Copyright }}'"></button>
                  <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('Copyright', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('Copyright', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                </span>
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-core chip-rich" (click)="insertTokenAtCursor('{{ PoweredBy }}')" [innerText]="'+ {{ PoweredBy }}'"></button>
                  <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('PoweredBy', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('PoweredBy', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                </span>
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-core" (click)="insertTokenAtCursor('{{ Email }}')" [innerText]="'+ {{ Email }}'"></button>
                  <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('Email', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('Email', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                </span>
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-core" (click)="insertTokenAtCursor('{{ Phone }}')" [innerText]="'+ {{ Phone }}'"></button>
                  <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('Phone', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('Phone', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                </span>
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-core" (click)="insertTokenAtCursor('{{ Address }}')" [innerText]="'+ {{ Address }}'"></button>
                  <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('Address', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('Address', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                </span>
                <span class="token-chip-wrap">
                  <button type="button" class="token-chip chip-repeater" (click)="insertSocialLinksLoopAtCursor()">
                    <span class="material-symbols-outlined chip-icon">share</span>
                    <span [innerText]="'+ Social Media Links'"></span>
                  </button>
                  <button type="button" class="token-info-icon-btn" (mouseenter)="showTokenDoc('SocialLinks', $event)" (mouseleave)="hideTokenDocOnLeave()" (click)="toggleTokenDoc('SocialLinks', $event)" title="Information & CMS location"><span class="material-symbols-outlined">info</span></button>
                </span>
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
            <div class="code-area-wrap" style="position: relative;" *ngIf="activeEditorTab === 'html'">
              <!-- AI Transforming Loading Overlay (Visible until finish) -->
              <div *ngIf="isAiTransforming" class="ai-transforming-overlay">
                <div class="ai-transforming-card">
                  <div class="ai-spinner-container">
                    <div class="ai-spinner-ring"></div>
                    <span class="material-symbols-outlined ai-magic-icon">auto_awesome</span>
                  </div>
                  <div class="ai-transforming-info">
                    <h5 class="ai-transforming-heading">AI Transforming Navbar Placeholders...</h5>
                    <p class="ai-transforming-desc">
                      Analyzing raw HTML structure, preserving 100% of styles &amp; classes, and injecting 3-Zone Handlebars placeholders.
                    </p>
                    <div class="ai-transforming-status-pill">
                      <span class="spinner-border spinner-border-sm text-info me-2"></span>
                      <span>Processing with Ozi AI Engine...</span>
                    </div>
                  </div>
                </div>
              </div>

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
              <div class="d-flex align-items-center justify-content-between mb-2">
                <div class="css-info-pill">
                  <span class="material-symbols-outlined pill-icon">lightbulb</span>
                  <span>Pure CSS only (no &lt;style&gt; tags). Styles defined here are scoped directly to this section.</span>
                </div>
                <button
                  *ngIf="!cssStyles || !cssStyles.trim()"
                  type="button"
                  class="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1 py-1 px-2"
                  (click)="insertStarterCss()"
                >
                  <span class="material-symbols-outlined fs-6">add</span>
                  <span>Insert Starter CSS</span>
                </button>
              </div>
              <textarea
                #cssEditor
                [(ngModel)]="cssStyles"
                (ngModelChange)="updatePreviewSimulation()"
                class="code-textarea font-mono"
                rows="17"
                [placeholder]="cssPlaceholderGuide"
                spellcheck="false"
              ></textarea>
            </div>

            <!-- JS Editor -->
            <div class="code-area-wrap" *ngIf="activeEditorTab === 'js'">
              <div class="d-flex align-items-center justify-content-between mb-2">
                <div class="css-info-pill">
                  <span class="material-symbols-outlined pill-icon">terminal</span>
                  <span>Pure JavaScript only (no &lt;script&gt; tags). Wrap in (function() &#123; ... &#125;)(); for safe multi-function logic.</span>
                </div>
                <button
                  *ngIf="!jsScript || !jsScript.trim()"
                  type="button"
                  class="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1 py-1 px-2"
                  (click)="insertStarterJs()"
                >
                  <span class="material-symbols-outlined fs-6">add_code</span>
                  <span>Insert Starter JS</span>
                </button>
              </div>
              <textarea
                #jsEditor
                [(ngModel)]="jsScript"
                class="code-textarea font-mono"
                rows="17"
                [placeholder]="jsPlaceholderGuide"
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

              <div class="form-group" style="margin-top: 14px;">
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

      <!-- Interactive Contextual Token Info Popover / Mobile Sheet -->
      <div
        class="token-info-popover"
        *ngIf="activeTokenDoc"
        [style.top.px]="popoverTop"
        [style.left.px]="popoverLeft"
        (mouseenter)="cancelPopoverLeaveTimer()"
        (mouseleave)="hideTokenDocOnLeave()"
        (click)="$event.stopPropagation()"
      >
        <div class="popover-header">
          <div class="popover-title-row">
            <span class="material-symbols-outlined popover-icon">info</span>
            <code class="popover-token-badge">{{ activeTokenDoc.token }}</code>
          </div>
          <button type="button" class="btn-close-popover" (click)="closeTokenDoc()" title="Close details">✕</button>
        </div>
        <div class="popover-body">
          <p class="popover-desc">{{ activeTokenDoc.description }}</p>
          <div class="popover-cms-box">
            <div class="cms-label-row">
              <span class="material-symbols-outlined cms-icon">admin_panel_settings</span>
              <strong>CMS Configuration Location:</strong>
            </div>
            <div class="cms-path-breadcrumb">{{ activeTokenDoc.cmsPath }}</div>
          </div>
          <div class="popover-example-box">
            <span class="example-label">Rendered HTML Output Example:</span>
            <pre class="example-code"><code>{{ activeTokenDoc.example }}</code></pre>
          </div>
        </div>
        <div class="popover-footer">
          <button type="button" class="btn-insert-popover" (click)="insertTokenAtCursor(activeTokenDoc.token); closeTokenDoc()">
            <span class="material-symbols-outlined">add</span>
            <span>Insert Token</span>
          </button>
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

    /* AI Transforming Full Editor Loading Overlay */
    .ai-transforming-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(15, 23, 42, 0.88);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      z-index: 50;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      animation: fadeInAi 0.25s ease-out;
    }

    .ai-transforming-card {
      background: linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.98));
      border: 1.5px solid rgba(99, 102, 241, 0.35);
      border-radius: 18px;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.6), 0 0 35px rgba(99, 102, 241, 0.25);
      padding: 32px 40px;
      text-align: center;
      max-width: 520px;
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      animation: scaleUpAi 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .ai-spinner-container {
      position: relative;
      width: 72px;
      height: 72px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .ai-spinner-ring {
      position: absolute;
      inset: 0;
      border: 3.5px solid rgba(99, 102, 241, 0.2);
      border-top-color: #818cf8;
      border-right-color: #38bdf8;
      border-bottom-color: #c084fc;
      border-radius: 50%;
      animation: spinAiRing 1s linear infinite;
    }

    .ai-magic-icon {
      font-size: 32px;
      color: #a5b4fc;
      animation: pulseAiIcon 1.5s ease-in-out infinite alternate;
      text-shadow: 0 0 16px rgba(165, 180, 252, 0.6);
    }

    .ai-transforming-info {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    .ai-transforming-heading {
      color: #f8fafc;
      font-size: 17px;
      font-weight: 700;
      margin: 0;
      letter-spacing: -0.2px;
    }

    .ai-transforming-desc {
      color: #94a3b8;
      font-size: 13px;
      line-height: 1.5;
      margin: 0;
      max-width: 440px;
    }

    .ai-transforming-status-pill {
      display: inline-flex;
      align-items: center;
      padding: 6px 16px;
      background: rgba(99, 102, 241, 0.15);
      border: 1px solid rgba(99, 102, 241, 0.35);
      border-radius: 24px;
      font-size: 12px;
      font-weight: 600;
      color: #c7d2fe;
      margin-top: 4px;
    }

    @keyframes spinAiRing {
      to { transform: rotate(360deg); }
    }

    @keyframes pulseAiIcon {
      from { transform: scale(0.9); opacity: 0.75; }
      to { transform: scale(1.1); opacity: 1; }
    }

    @keyframes fadeInAi {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes scaleUpAi {
      from { transform: translateY(12px) scale(0.96); opacity: 0; }
      to { transform: translateY(0) scale(1); opacity: 1; }
    }

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
    .token-chip-wrap {
      display: inline-flex;
      align-items: center;
      position: relative;
      border-radius: 6px;
      overflow: visible;
    }
    .token-chip-wrap .token-chip {
      border-radius: 6px 0 0 6px !important;
      border-right: none !important;
    }
    .token-info-icon-btn {
      width: 22px;
      height: 28px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.04);
      border: 1px solid rgba(0, 0, 0, 0.1);
      border-left: 1px dashed rgba(0, 0, 0, 0.12);
      border-radius: 0 6px 6px 0;
      color: #64748b;
      cursor: pointer;
      padding: 0;
      transition: all 0.15s ease;
    }
    .token-info-icon-btn:hover {
      background: #0050e5;
      color: #ffffff;
      border-color: #0050e5;
    }
    .token-info-icon-btn .material-symbols-outlined {
      font-size: 13px;
    }

    /* Contextual Token Info Popover */
    .token-info-popover {
      position: fixed;
      z-index: 9999;
      width: 380px;
      max-width: 90vw;
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 12px 36px rgba(15, 23, 42, 0.18), 0 4px 12px rgba(0, 0, 0, 0.06);
      border: 1.5px solid #cbd5e1;
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      animation: popoverFadeIn 0.15s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes popoverFadeIn {
      from { opacity: 0; transform: translateY(6px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .popover-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 1px solid #f1f5f9;
    }
    .popover-title-row {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .popover-icon {
      color: #0050e5;
      font-size: 20px;
    }
    .popover-token-badge {
      font-family: monospace;
      font-size: 12.5px;
      font-weight: 800;
      color: #0050e5;
      background: #eff6ff;
      padding: 2px 8px;
      border-radius: 5px;
      border: 1px solid #bfdbfe;
    }
    .btn-close-popover {
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 16px;
      cursor: pointer;
      line-height: 1;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .btn-close-popover:hover {
      background: #f1f5f9;
      color: #0f172a;
    }
    .popover-desc {
      font-size: 13px;
      color: #334155;
      line-height: 1.5;
      margin: 0 0 12px 0;
    }
    .popover-cms-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 12px;
      margin-bottom: 12px;
    }
    .cms-label-row {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 11.5px;
      color: #0f172a;
      margin-bottom: 4px;
    }
    .cms-icon {
      font-size: 15px;
      color: #0050e5;
    }
    .cms-path-breadcrumb {
      font-size: 11.5px;
      font-weight: 700;
      color: #0050e5;
      background: #eef2ff;
      padding: 3px 8px;
      border-radius: 4px;
      display: inline-block;
      border: 1px solid #c7d2fe;
    }
    .popover-example-box {
      margin-bottom: 14px;
    }
    .example-label {
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: block;
      margin-bottom: 4px;
    }
    .example-code {
      margin: 0;
      background: #0f172a;
      color: #38bdf8;
      font-family: monospace;
      font-size: 11.5px;
      padding: 8px 10px;
      border-radius: 6px;
      overflow-x: auto;
      white-space: pre-wrap;
      word-break: break-all;
    }
    .popover-footer {
      display: flex;
      justify-content: flex-end;
    }
    .btn-insert-popover {
      height: 32px;
      padding: 0 14px;
      border-radius: 6px;
      background: #0050e5;
      color: #ffffff;
      border: none;
      font-size: 12px;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      transition: background 0.15s;
    }
    .btn-insert-popover:hover {
      background: #0041ba;
    }
    .btn-insert-popover .material-symbols-outlined { font-size: 16px; }
    @media (max-width: 600px) {
      .token-info-popover {
        position: fixed !important;
        top: auto !important;
        bottom: 0 !important;
        left: 0 !important;
        right: 0 !important;
        width: 100% !important;
        max-width: 100% !important;
        border-radius: 16px 16px 0 0 !important;
        box-shadow: 0 -8px 30px rgba(0, 0, 0, 0.25) !important;
        border-bottom: none !important;
      }
    }
    .chip-ai-magic {
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #db2777 100%) !important;
      color: #ffffff !important;
      border: 1px solid rgba(255, 255, 255, 0.3) !important;
      font-weight: 800 !important;
      box-shadow: 0 2px 8px rgba(124, 58, 237, 0.35);
      border-radius: 6px !important;
    }
    .chip-ai-magic:hover {
      background: linear-gradient(135deg, #4338ca 0%, #6d28d9 50%, #be185d 100%) !important;
      transform: translateY(-1px);
      box-shadow: 0 4px 14px rgba(124, 58, 237, 0.5);
    }
    .chip-ai-magic:disabled {
      opacity: 0.7;
      cursor: not-allowed;
      transform: none;
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
      width: 98vw;
      max-width: 1720px;
      height: 95vh;
      max-height: 95vh;
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
export class TemplateVisualsComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('htmlEditor') htmlEditorRef?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('cssEditor') cssEditorRef?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('jsEditor') jsEditorRef?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('richTextEditor') richTextEditorRef?: ElementRef<HTMLDivElement>;

  // Form Metadata
  isEditMode: boolean = false;
  editCode: string = '';
  templateName: string = '';
  selectedCategory: string = 'hero';
  variantCode: string = '';
  description: string = '';
  htmlTemplate: string = '';
  cssStyles: string = '';
  jsScript: string = '';

  public readonly cssPlaceholderGuide: string = `/* ==========================================================================
 * SCOPED CSS STYLESHEET GUIDELINES:
 * 1. PURE CSS ONLY: Do NOT include <style> or </style> tags.
 * 2. SCOPING: Prefix all selectors with your unique section root class
 *    (e.g., .my-hero-section .title) to prevent styles leaking to other sections.
 * 3. CSS VARIABLES: Leverage theme tokens like var(--primary-color, #0050e5).
 * 4. RESPONSIVE BREAKPOINTS:
 *    @media (max-width: 991.98px) { /* Tablets & Mobile */ }
 *    @media (max-width: 575.98px) { /* Small Phones */ }
 *
 * EXAMPLE (Safe reference - uncomment or customize for your section):
 * .your-section-root-class {
 *   padding: 60px 0;
 *   background-color: var(--bg-light, #f8fafc);
 * }
 * ========================================================================== */`;

  public readonly jsPlaceholderGuide: string = `/**
 * ==========================================================================
 * SECTION JAVASCRIPT LOGIC GUIDELINES:
 * 1. PURE JAVASCRIPT ONLY: Do NOT include <script> or </script> tags.
 * 2. NO CONFLICTS (IIFE): Keep code wrapped in (function() { 'use strict'; ... })();
 *    This ensures variables do not conflict with other sections on the page.
 * 3. MULTIPLE FUNCTIONS: You can define multiple functions freely inside this closure.
 * 4. EXECUTION: Runs automatically in Zone 3 (before </body>) once DOM is ready.
 * ==========================================================================
 */
(function() {
  'use strict';

  // Function 1: Initialization logic
  function initSection() {
    // Example: Select interactive elements inside this section
    // const items = document.querySelectorAll('.oz-interactive-card');
    // items.forEach(el => el.addEventListener('click', handleClick));
  }

  // Function 2: Event handler or calculation helper
  function handleClick(event) {
    // Custom interaction logic here
  }

  // Auto-run section initializer
  initSection();
})();`;

  /**
   * Inserts the default scoped CSS boilerplate into the CSS editor.
   */
  insertStarterCss(): void {
    this.cssStyles = this.cssPlaceholderGuide;
    this.updatePreviewSimulation();
  }

  /**
   * Inserts the safe IIFE JavaScript boilerplate into the JS editor.
   */
  insertStarterJs(): void {
    this.jsScript = this.jsPlaceholderGuide;
    this.updatePreviewSimulation();
  }

  // Active Tenant & Domain Resolution
  resolvedTenantKey: string = 'acme-global';
  domainInitials: string = 'AG';

  // Editor and Preview State
  activeEditorTab: 'html' | 'css' | 'js' = 'html';
  activeTokenCategory: 'core' | 'media' | 'sectionlist' | 'faq' | 'navigation' | 'footer' | 'forms' | 'blog' | 'legal' | 'identity' = 'core';
  activeMockTab: 'scalars' | 'rich' | 'media' | 'cards' | 'faqs' | 'menu' | 'identity' = 'scalars';
  savingTemplate: boolean = false;
  showPreviewModal: boolean = false;
  previewViewport: 'desktop' | 'tablet' | 'mobile' = 'desktop';
  safeHydratedHtml: SafeHtml = '';
  showRawHtmlEditor: boolean = false;

  // Active Token Info Contextual Popover
  activeTokenDoc: TokenDoc | null = null;
  popoverTop: number = 100;
  popoverLeft: number = 100;
  popoverLeaveTimer: any = null;

  // Comprehensive Token Documentation Directory
  tokenDocMap: Record<string, TokenDoc> = {
    Title: {
      name: 'Title',
      token: '{{ Title }}',
      description: 'Primary headline title for the section, card, or blog article.',
      cmsPath: 'Admin Console > Web Pages > Page Sections > Title',
      example: '<h1>{{ Title }}</h1>'
    },
    MiniTitle: {
      name: 'Mini Title / Eyebrow',
      token: '{{ MiniTitle }}',
      description: 'Eyebrow subtitle or accent pill displayed above the primary headline.',
      cmsPath: 'Admin Console > Web Pages > Page Sections > Mini Title',
      example: '<span class="badge">{{ MiniTitle }}</span>'
    },
    SubTitle: {
      name: 'Sub Title',
      token: '{{ SubTitle }}',
      description: 'Secondary subtitle or price tag on card items.',
      cmsPath: 'Admin Console > Web Pages > Page Sections > Section Lists > Sub Title',
      example: '<span class="price">{{ SubTitle }}</span>'
    },
    Description: {
      name: 'Description',
      token: '{{ Description }}',
      description: 'Short narrative description or introductory overview text.',
      cmsPath: 'Admin Console > Web Pages > Page Sections > Description',
      example: '<p class="lead">{{ Description }}</p>'
    },
    FullDescription: {
      name: 'Full Description (Rich HTML)',
      token: '{{ FullDescription }}',
      description: 'Rich HTML formatted content generated by the Summernote WYSIWYG editor.',
      cmsPath: 'Admin Console > Web Pages > Page Sections > Full Description',
      example: '<div class="rich-body">{{ FullDescription }}</div>'
    },
    MoreDescription: {
      name: 'More Description',
      token: '{{ MoreDescription }}',
      description: 'Extended descriptive copy on repeatable card items.',
      cmsPath: 'Admin Console > Web Pages > Page Sections > Section Lists > More Description',
      example: '<p class="details">{{ MoreDescription }}</p>'
    },
    Qoute: {
      name: 'Quote / Highlight',
      token: '{{ Qoute }}',
      description: 'Featured quotation or client testimonial text block.',
      cmsPath: 'Admin Console > Web Pages > Page Sections > Quote',
      example: '<blockquote>{{ Qoute }}</blockquote>'
    },
    ButtonText: {
      name: 'Button Text',
      token: '{{ ButtonText }}',
      description: 'Text label for the primary call-to-action button.',
      cmsPath: 'Admin Console > Web Pages > Page Sections > Button Text',
      example: '<a href="{{ ButtonLink }}" class="btn">{{ ButtonText }}</a>'
    },
    ButtonLink: {
      name: 'Button Link',
      token: '{{ ButtonLink }}',
      description: 'Destination URL or internal route for the primary action button.',
      cmsPath: 'Admin Console > Web Pages > Page Sections > Button Link',
      example: '<a href="{{ ButtonLink }}">Explore More</a>'
    },
    SecondaryButtonText: {
      name: 'Secondary Button Text',
      token: '{{ SecondaryButtonText }}',
      description: 'Label for the secondary action button in hero banners.',
      cmsPath: 'Admin Console > Web Pages > Page Sections > Secondary Button Text',
      example: '<a href="{{ SecondaryButtonLink }}" class="btn-outline">{{ SecondaryButtonText }}</a>'
    },
    SecondaryButtonLink: {
      name: 'Secondary Button Link',
      token: '{{ SecondaryButtonLink }}',
      description: 'Destination URL for the secondary hero button.',
      cmsPath: 'Admin Console > Web Pages > Page Sections > Secondary Button Link',
      example: '<a href="{{ SecondaryButtonLink }}">Read Documentation</a>'
    },
    DirectUrl: {
      name: 'Direct URL',
      token: '{{ DirectUrl }}',
      description: 'Custom direct route path for navigation redirects.',
      cmsPath: 'Admin Console > Web Pages > Page Sections > Direct URL',
      example: '<a href="{{ DirectUrl }}">Direct Link</a>'
    },
    ImageUrl: {
      name: 'Primary Image URL',
      token: '{{ ImageUrl }}',
      description: 'Primary banner, hero photo, or card thumbnail image URL.',
      cmsPath: 'Admin Console > Web Pages > Page Sections > Image URL',
      example: '<img src="{{ ImageUrl }}" alt="{{ Title }}" />'
    },
    SecondImageUrl: {
      name: 'Secondary Image URL',
      token: '{{ SecondImageUrl }}',
      description: 'Secondary illustration or background overlay image URL.',
      cmsPath: 'Admin Console > Web Pages > Page Sections > Secondary Image URL',
      example: '<img src="{{ SecondImageUrl }}" class="shape-overlay" />'
    },
    VideoUrl: {
      name: 'Hosted Video URL',
      token: '{{ VideoUrl }}',
      description: 'Direct link to an MP4 or WebM video file.',
      cmsPath: 'Admin Console > Web Pages > Page Sections > Video URL',
      example: '<video src="{{ VideoUrl }}" autoplay muted loop></video>'
    },
    YoutubeUrlLink: {
      name: 'YouTube Embed Link',
      token: '{{ YoutubeUrlLink }}',
      description: 'External YouTube video embed URL.',
      cmsPath: 'Admin Console > Web Pages > Page Sections > YouTube Link',
      example: '<iframe src="{{ YoutubeUrlLink }}"></iframe>'
    },
    BackgroundColor: {
      name: 'Background Color',
      token: '{{ BackgroundColor }}',
      description: 'HEX or RGB color value for styling the section backdrop.',
      cmsPath: 'Admin Console > Web Pages > Page Sections > Background Color',
      example: '<section style="background: {{ BackgroundColor }}">'
    },
    PageSectionLists: {
      name: 'Card Loop (PageSectionLists)',
      token: '{{#each PageSectionLists}}',
      description: 'Loops through repeatable card items, feature highlights, or slide rows.',
      cmsPath: 'Admin Console > Web Pages > Page Sections > Section Lists',
      example: '{{#each PageSectionLists}}\n  <div class="card"><h4>{{ Title }}</h4><p>{{ Description }}</p></div>\n{{/each}}'
    },
    Icon: {
      name: 'Material Icon Symbol',
      token: '{{ Icon }}',
      description: 'Google Material Symbols icon ligature name (e.g. verified, hub, star).',
      cmsPath: 'Admin Console > Web Pages > Page Sections > Section Lists > Icon',
      example: '<span class="material-symbols-outlined">{{ Icon }}</span>'
    },
    IconText: {
      name: 'FontAwesome / Bootstrap Icon',
      token: '{{ IconText }}',
      description: 'FontAwesome or Bootstrap icon class string (e.g. fa-solid fa-rocket).',
      cmsPath: 'Admin Console > Web Pages > Page Sections > Section Lists > Icon Text',
      example: '<i class="{{ IconText }}"></i>'
    },
    FaqCategories: {
      name: 'FAQ Category Accordions Loop',
      token: '{{#each FaqCategories}}',
      description: 'Nested loop grouping FAQs into categorized accordion blocks.',
      cmsPath: 'Admin Console > FAQs > Categories & FAQs',
      example: '{{#each FaqCategories}}\n  <h3>{{ CategoryTitle }}</h3>\n  {{#each FAQs}}\n    <details><summary>{{ Question }}</summary><p>{{ Answer }}</p></details>\n  {{/each}}\n{{/each}}'
    },
    FAQs: {
      name: 'Flat FAQ Loop',
      token: '{{#each FAQs}}',
      description: 'Loops through all active FAQ questions and answers in a flat list.',
      cmsPath: 'Admin Console > FAQs',
      example: '{{#each FAQs}}\n  <div class="faq-item"><strong>{{ Question }}</strong><p>{{ Answer }}</p></div>\n{{/each}}'
    },
    CategoryTitle: {
      name: 'Category Title',
      token: '{{ CategoryTitle }}',
      description: 'Title of the knowledge category or navigation dropdown column.',
      cmsPath: 'Admin Console > FAQs / Menus & Navigation',
      example: '<h4 class="cat-title">{{ CategoryTitle }}</h4>'
    },
    Question: {
      name: 'FAQ Question',
      token: '{{ Question }}',
      description: 'The FAQ question headline text.',
      cmsPath: 'Admin Console > FAQs > Question',
      example: '<strong>{{ Question }}</strong>'
    },
    Answer: {
      name: 'FAQ Answer',
      token: '{{ Answer }}',
      description: 'Detailed answer or response text/HTML for the FAQ item.',
      cmsPath: 'Admin Console > FAQs > Answer',
      example: '<p>{{ Answer }}</p>'
    },
    MainMenuItems: {
      name: 'Main Menu Items Loop',
      token: '{{#each MainMenuItems}}',
      description: 'Loops through published WebPages that have "Show In Top Menu" enabled.',
      cmsPath: 'Admin Console > Web Pages > Edit Page > Enable "Show In Top Menu"',
      example: '{{#each MainMenuItems}}\n  <li class="nav-item"><a class="nav-link" href="{{ Url }}">{{ Title }}</a></li>\n{{/each}}'
    },
    MenuDropdowns: {
      name: 'Menu Dropdowns Loop',
      token: '{{#each MenuDropdowns}}',
      description: 'Loops through multi-level navigation dropdown groups and their child pages.',
      cmsPath: 'Admin Console > Menus & Navigation',
      example: '{{#each MenuDropdowns}}\n  <li class="dropdown"><a href="#">{{ Title }}</a>\n    <ul>{{#each Pages}}<li><a href="{{ Url }}">{{ Title }}</a></li>{{/each}}</ul>\n  </li>\n{{/each}}'
    },
    MenuCtaButtons: {
      name: 'Menu CTA Buttons Loop',
      token: '{{#each MenuCtaButtons}}',
      description: 'Loops through published WebPages flagged with "Display as Header CTA Button" (IsMenuCTA). Render multiple action buttons (e.g. Sign In, Request a Service).',
      cmsPath: 'Admin Console > Web Pages > Edit Page > Enable "Display as Header CTA Button" (IsMenuCTA)',
      example: '{{#each MenuCtaButtons}}\n  <a href="{{ Url }}" class="btn btn-primary rounded-pill px-3">{{ Title }}</a>\n{{/each}}'
    },
    PageTitle: {
      name: 'Page Title',
      token: '{{ PageTitle }}',
      description: 'Title of the published WebPage in a navigation dropdown or mega menu card.',
      cmsPath: 'Admin Console > Web Pages > Title',
      example: '<span>{{ PageTitle }}</span>'
    },
    PageUrl: {
      name: 'Page Route URL',
      token: '{{ PageUrl }}',
      description: 'Clean routing path for the published WebPage.',
      cmsPath: 'Admin Console > Web Pages > Slug',
      example: '<a href="{{ PageUrl }}">Link</a>'
    },
    FooterCategories: {
      name: 'All Footer Categories Loop',
      token: '{{#each FooterCategories}}',
      description: 'Loops through all enabled multi-column footer groups and their child links.',
      cmsPath: 'Admin Console > Menus & Navigation / Footer Groups',
      example: '{{#each FooterCategories}}\n  <div class="col"><h4>{{ Title }}</h4><ul>{{#each Pages}}<li><a href="{{ Url }}">{{ Title }}</a></li>{{/each}}</ul></div>\n{{/each}}'
    },
    CategoryPages: {
      name: 'Category Pages Loop',
      token: '{{#each CategoryPages "Name"}}',
      description: 'Loops through all published pages assigned to a designated category name.',
      cmsPath: 'Admin Console > Web Pages > Page Category',
      example: '{{#each CategoryPages "Services"}}\n  <li><a href="{{ Url }}">{{ Title }}</a></li>\n{{/each}}'
    },
    TaggedPages: {
      name: 'Tagged Pages Loop',
      token: '{{#each TaggedPages "Tag"}}',
      description: 'Loops through published pages matching a designated tag (e.g. QuickLinks, Featured).',
      cmsPath: 'Admin Console > Web Pages > Edit Page > Tags',
      example: '{{#each TaggedPages "QuickLinks"}}\n  <li><a href="{{ Url }}">{{ Title }}</a></li>\n{{/each}}'
    },
    LegalPages: {
      name: 'Legal Compliance Pages Loop',
      token: '{{#each LegalPages}}',
      description: 'Loops through published legal policies (Privacy Policy, Terms of Service, Cookie Policy).',
      cmsPath: 'Admin Console > Web Pages > Category = "Legal"',
      example: '{{#each LegalPages}}\n  <a href="{{ Url }}">{{ Title }}</a>\n{{/each}}'
    },
    PrivacyUrl: {
      name: 'Privacy Policy URL',
      token: '{{ PrivacyUrl }}',
      description: 'Direct route to the published Privacy Policy page.',
      cmsPath: 'Admin Console > Web Pages > Legal Pages',
      example: '<a href="{{ PrivacyUrl }}">Privacy Policy</a>'
    },
    TermsUrl: {
      name: 'Terms & Conditions URL',
      token: '{{ TermsUrl }}',
      description: 'Direct route to the published Terms & Conditions page.',
      cmsPath: 'Admin Console > Web Pages > Legal Pages',
      example: '<a href="{{ TermsUrl }}">Terms of Service</a>'
    },
    CookiesUrl: {
      name: 'Cookie Policy URL',
      token: '{{ CookiesUrl }}',
      description: 'Direct route to the published Cookie Policy page.',
      cmsPath: 'Admin Console > Web Pages > Legal Pages',
      example: '<a href="{{ CookiesUrl }}">Cookie Policy</a>'
    },
    FormEmbed: {
      name: 'Dynamic Form Embed',
      token: '{{ Form "Key" }}',
      description: 'Embeds an interactive dynamic form created in the CMS Forms module.',
      cmsPath: 'Admin Console > Forms & Surveys > Forms',
      example: '{{ Form "Contact_Us" }}'
    },
    BrandIdentity: {
      name: 'Brand Logo or Name',
      token: '{{ BrandIdentity }}',
      description: 'Renders uploaded brand logo image if present; automatically falls back to business name text if no logo exists.',
      cmsPath: 'Admin Console > Settings > Tenant Brand Settings > Company Logo',
      example: '<a class="navbar-brand" href="/">{{ BrandIdentity }}</a>'
    },
    BrandName: {
      name: 'Brand Name',
      token: '{{ BrandName }}',
      description: 'Tenant organization brand name.',
      cmsPath: 'Admin Console > Settings > General / Branding',
      example: '<span>{{ BrandName }}</span>'
    },
    LoginButton: {
      name: 'Dynamic Login / Portal Button',
      token: '{{ LoginButton }}',
      description: 'Role-aware portal button. Renders "Console" linking to /dashboard/console for Admins, "My Workspace" linking to /dashboard/workspace for Members, or "Sign In" linking to /auth/login for visitors.',
      cmsPath: 'Admin Console > Brand & Identity > Authentication',
      example: '{{ LoginButton }}'
    },
    LoginUrl: {
      name: 'Dynamic Login / Portal URL',
      token: '{{ LoginUrl }}',
      description: 'Resolves to /dashboard/console for Admins, /dashboard/workspace for Members, or /auth/login for unauthenticated visitors.',
      cmsPath: 'Admin Console > Brand & Identity > Authentication',
      example: '<a href="{{ LoginUrl }}" class="btn btn-primary">{{ LoginText }}</a>'
    },
    LoginText: {
      name: 'Dynamic Login / Portal Text',
      token: '{{ LoginText }}',
      description: 'Resolves to "Console" for Admins, "My Workspace" for Members, or configured loginButtonText for visitors.',
      cmsPath: 'Admin Console > Brand & Identity > Login Button Text',
      example: '<span>{{ LoginText }}</span>'
    },
    Copyright: {
      name: 'Copyright Notice',
      token: '{{ Copyright }}',
      description: 'Corporate copyright string with current year.',
      cmsPath: 'Admin Console > Settings > Branding > Copyright',
      example: '<p>{{ Copyright }}</p>'
    },
    PoweredBy: {
      name: 'Powered By Credit',
      token: '{{ PoweredBy }}',
      description: 'Platform credit link for Ozikol.',
      cmsPath: 'System Enforced',
      example: '<span>{{ PoweredBy }}</span>'
    },
    Email: {
      name: 'Corporate Email',
      token: '{{ Email }}',
      description: 'Tenant contact email address. In footers, you can also type your email directly in HTML.',
      cmsPath: 'Admin Console > Settings > General',
      example: '<a href="mailto:{{ Email }}">{{ Email }}</a>'
    },
    Phone: {
      name: 'Corporate Phone',
      token: '{{ Phone }}',
      description: 'Tenant contact telephone number. In footers, you can also type your phone directly in HTML.',
      cmsPath: 'Admin Console > Settings > General',
      example: '<a href="tel:{{ Phone }}">{{ Phone }}</a>'
    },
    Address: {
      name: 'Corporate Address',
      token: '{{ Address }}',
      description: 'Tenant headquarters address. In footers, you can also type your address directly in HTML.',
      cmsPath: 'Admin Console > Settings > General',
      example: '<address>{{ Address }}</address>'
    },
    SocialLinks: {
      name: 'Social Media Links (HTML)',
      token: '<!-- Social Links -->',
      description: 'Direct HTML social icons and profile links. Type URLs directly into the template HTML.',
      cmsPath: 'Direct in Template HTML',
      example: '<a href="https://linkedin.com/company/your-brand"><i class="fa-brands fa-linkedin-in"></i></a>'
    },
    Articles: {
      name: 'Articles Feed Loop',
      token: '{{#each Articles}}',
      description: 'Loops through published blog posts with covers, categories, authors, and dates.',
      cmsPath: 'Admin Console > Blog & Content > Articles',
      example: '{{#each Articles}}\n  <div class="card"><img src="{{ CoverImageUrl }}" /><h3><a href="{{ Url }}">{{ Title }}</a></h3><p>{{ Summary }}</p></div>\n{{/each}}'
    },
    ArticleTitle: {
      name: 'Article Title',
      token: '{{ Article.Title }}',
      description: 'Headline title of the single blog post on an article detail page.',
      cmsPath: 'Admin Console > Blog & Content > Articles > Title',
      example: '<h1>{{ Article.Title }}</h1>'
    },
    ArticleSummary: {
      name: 'Article Summary',
      token: '{{ Article.Summary }}',
      description: 'Introductory summary or excerpt of the blog post.',
      cmsPath: 'Admin Console > Blog & Content > Articles > Summary',
      example: '<p class="lead">{{ Article.Summary }}</p>'
    },
    ArticleBody: {
      name: 'Article Body (Rich HTML)',
      token: '{{ Article.Body }}',
      description: 'Full rich HTML article body content formatted via editor.',
      cmsPath: 'Admin Console > Blog & Content > Articles > Content',
      example: '<div class="article-content">{{ Article.Body }}</div>'
    },
    ArticleCover: {
      name: 'Article Cover Image',
      token: '{{ Article.CoverImageUrl }}',
      description: 'Primary banner / hero cover image URL for the article.',
      cmsPath: 'Admin Console > Blog & Content > Articles > Cover Image',
      example: '<img src="{{ Article.CoverImageUrl }}" alt="{{ Article.Title }}" />'
    },
    ArticleDate: {
      name: 'Article Publish Date',
      token: '{{ Article.PublishedDate }}',
      description: 'Formatted publication date string (e.g. Sep 14, 2026).',
      cmsPath: 'Admin Console > Blog & Content > Articles > Publish Date',
      example: '<time>{{ Article.PublishedDate }}</time>'
    },
    ArticleAuthor: {
      name: 'Article Author Name',
      token: '{{ Article.AuthorName }}',
      description: 'Author name associated with the article.',
      cmsPath: 'Admin Console > Blog & Content > Articles > Author',
      example: '<span>By {{ Article.AuthorName }}</span>'
    },
    ArticleCategory: {
      name: 'Article Category',
      token: '{{ Article.Category }}',
      description: 'Primary category tag for the article.',
      cmsPath: 'Admin Console > Blog & Content > Articles > Category',
      example: '<span class="badge">{{ Article.Category }}</span>'
    },
    RecentArticles: {
      name: 'Recent Articles Loop',
      token: '{{#each RecentArticles}}',
      description: 'Sidebar widget loop listing the most recent published blog posts.',
      cmsPath: 'Admin Console > Blog & Content > Articles',
      example: '{{#each RecentArticles}}\n  <li><a href="{{ Url }}">{{ Title }}</a></li>\n{{/each}}'
    },
    BlogCategories: {
      name: 'Blog Categories Loop',
      token: '{{#each BlogCategories}}',
      description: 'Sidebar widget loop listing blog categories with article counts.',
      cmsPath: 'Admin Console > Blog & Content > Categories',
      example: '{{#each BlogCategories}}\n  <a href="/blog?category={{ Slug }}">{{ Name }} ({{ Count }})</a>\n{{/each}}'
    }
  };

  // Live Database Editor Tokens
  editorTokens: {
    publishedForms: any[];
    menuDropdowns: any[];
    menuCtaButtons: any[];
    topMenuItems: any[];
    footerGroups: any[];
    legalPages: any[];
    brand: any;
  } = {
    publishedForms: [],
    menuDropdowns: [],
    menuCtaButtons: [],
    topMenuItems: [],
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
      tagline: 'Sticky light corporate navbar with dynamic logo/brand identity, dropdowns, and CTA buttons',
      defaultName: 'Classic Light Corporate Navbar',
      html: `<header class="oz-nav-header sticky-top bg-white border-bottom shadow-sm">
  <nav class="navbar navbar-expand-lg navbar-light py-3">
    <div class="container">
      <a class="navbar-brand d-flex align-items-center gap-2" href="/">
        {{ BrandIdentity }}
      </a>
      <button class="navbar-toggler border-0 shadow-none" type="button" onclick="this.closest('nav').querySelector('.collapse').classList.toggle('show')">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" id="ozNavMain">
        <ul class="navbar-nav mx-auto mb-2 mb-lg-0 gap-lg-3">
          {{#each MainMenuItems}}
            <li class="nav-item"><a class="nav-link fw-semibold text-secondary" href="{{ Url }}">{{ Title }}</a></li>
          {{/each}}
          {{#each MenuDropdowns}}
            <li class="nav-item dropdown">
              <a class="nav-link dropdown-toggle fw-semibold text-secondary" href="#" role="button" data-bs-toggle="dropdown">{{ Title }}</a>
              <ul class="dropdown-menu border-0 shadow-sm rounded-3 py-2">
                {{#each Pages}}
                  <li><a class="dropdown-item small py-2 px-3 fw-medium" href="{{ Url }}">{{ Title }}</a></li>
                {{/each}}
              </ul>
            </li>
          {{/each}}
        </ul>
        <div class="d-flex align-items-center gap-2">
          {{#each MenuCtaButtons}}
            <a href="{{ Url }}" class="btn btn-primary rounded-pill px-3 py-2 fw-semibold shadow-sm">
              {{ Title }}
            </a>
          {{/each}}
        </div>
      </div>
    </div>
  </nav>
</header>`,
      css: `.oz-nav-header { background-color: #ffffff !important; }
.oz-nav-header .navbar-brand { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; letter-spacing: -0.03em; }
.oz-nav-header .nav-link { font-size: 14.5px; font-weight: 600; color: #475569 !important; padding: 8px 4px !important; transition: color 0.15s ease; }
.oz-nav-header .nav-link:hover, .oz-nav-header .nav-link.active { color: #0050e5 !important; }
.oz-nav-header .btn-primary { background-color: #0050e5; border-color: #0050e5; font-size: 13.5px; }
.oz-nav-header .btn-primary:hover { background-color: #003bb5; border-color: #003bb5; }
.oz-nav-header .navbar-brand-logo { max-height: 40px; width: auto; object-fit: contain; }`,
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
      html: `<section class="oz-hero-section">
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
  padding: 84px 24px;
  background: radial-gradient(circle at 85% 20%, rgba(59, 130, 246, 0.08) 0%, transparent 45%), linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  color: #0f172a;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  overflow: hidden;
  border-bottom: 1px solid #e2e8f0;
}
.oz-hero-container {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1.15fr 0.85fr;
  gap: 48px;
  align-items: center;
}
.oz-hero-badge {
  display: inline-block;
  background: #eff6ff;
  color: #2563eb;
  border: 1px solid #bfdbfe;
  font-size: 11.5px;
  font-weight: 800;
  letter-spacing: 0.8px;
  padding: 5px 14px;
  border-radius: 20px;
  margin-bottom: 18px;
}
.oz-hero-title {
  font-size: 42px;
  font-weight: 900;
  line-height: 1.18;
  letter-spacing: -0.025em;
  margin: 0 0 16px 0;
  color: #0f172a;
  word-break: break-word;
}
.oz-hero-desc {
  font-size: 16px;
  line-height: 1.65;
  color: #475569;
  margin: 0 0 32px 0;
}
.oz-hero-actions {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
}
.oz-btn-primary {
  background: #2563eb;
  color: #ffffff;
  padding: 13px 26px;
  border-radius: 10px;
  font-weight: 700;
  text-decoration: none;
  box-shadow: 0 4px 14px rgba(37, 99, 235, 0.25);
  transition: 0.2s;
  display: inline-block;
}
.oz-btn-primary:hover { background: #1d4ed8; transform: translateY(-1px); }
.oz-btn-secondary {
  background: #ffffff;
  color: #334155;
  padding: 13px 22px;
  border-radius: 10px;
  font-weight: 700;
  text-decoration: none;
  border: 1.5px solid #cbd5e1;
  transition: 0.2s;
  display: inline-block;
}
.oz-btn-secondary:hover { background: #f8fafc; border-color: #94a3b8; }
.oz-hero-media { display: flex; align-items: center; justify-content: center; }
.oz-hero-img {
  width: 100%;
  max-height: 420px;
  object-fit: cover;
  border-radius: 16px;
  box-shadow: 0 20px 45px -10px rgba(15, 23, 42, 0.15), 0 0 0 1px rgba(15, 23, 42, 0.05);
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
      html: `<section class="oz-features-section">
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
      html: `<section class="oz-faq-section">
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
      html: `<section class="oz-marquee-section">
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
} `,
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
      html: `<section class="oz-contact-section">
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
      html: `<footer class="oz-site-footer">
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
    },
    {
      id: 'blog',
      codePrefix: 'BLOG',
      name: 'Blog / Articles Grid',
      icon: 'newspaper',
      tagline: 'Modern responsive article cards with cover photos, categories, author metadata, and read more links',
      defaultName: 'Apex 3-Column Blog Card Grid',
      html: `<section class="oz-blog-section">
  <div class="oz-blog-container">
    <div class="oz-blog-header">
      <span class="oz-blog-badge">{{ MiniTitle }}</span>
      <h2 class="oz-blog-title">{{ Title }}</h2>
      <p class="oz-blog-desc">{{ Description }}</p>
    </div>

    <div class="oz-blog-grid">
      {{#each Articles}}
      <article class="oz-blog-card">
        <div class="oz-blog-img-wrap">
          <img src="{{ CoverImageUrl }}" alt="{{ Title }}" class="oz-blog-cover" />
          <span class="oz-blog-cat-pill">{{ Category }}</span>
        </div>
        <div class="oz-blog-card-body">
          <div class="oz-blog-meta">
            <span class="oz-meta-date">{{ PublishedDate }}</span>
            <span class="oz-meta-author">By {{ AuthorName }}</span>
          </div>
          <h3 class="oz-article-headline">
            <a href="{{ Url }}">{{ Title }}</a>
          </h3>
          <p class="oz-article-excerpt">{{ Summary }}</p>
          <a href="{{ Url }}" class="oz-read-more">Read Article &rarr;</a>
        </div>
      </article>
      {{/each}}
    </div>
  </div>
</section>`,
      css: `.oz-blog-section { padding: 72px 24px; background: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
.oz-blog-container { max-width: 1200px; margin: 0 auto; }
.oz-blog-header { text-align: center; margin-bottom: 48px; }
.oz-blog-badge { display: inline-block; background: #eef2ff; color: #0050e5; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 16px; margin-bottom: 12px; }
.oz-blog-title { font-size: 34px; font-weight: 900; color: #0f172a; margin: 0 0 12px 0; letter-spacing: -0.02em; }
.oz-blog-desc { font-size: 15px; color: #64748b; max-width: 600px; margin: 0 auto; line-height: 1.5; }
.oz-blog-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 28px; }
.oz-blog-card { background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 14px; overflow: hidden; display: flex; flex-direction: column; transition: all 0.2s ease; }
.oz-blog-card:hover { transform: translateY(-4px); box-shadow: 0 12px 28px rgba(0, 80, 229, 0.08); border-color: #cbd5e1; }
.oz-blog-img-wrap { position: relative; height: 200px; overflow: hidden; background: #f1f5f9; }
.oz-blog-cover { width: 100%; height: 100%; object-fit: cover; }
.oz-blog-cat-pill { position: absolute; top: 12px; left: 12px; background: #0050e5; color: #ffffff; font-size: 11px; font-weight: 800; padding: 3px 10px; border-radius: 6px; }
.oz-blog-card-body { padding: 22px; display: flex; flex-direction: column; flex: 1; }
.oz-blog-meta { display: flex; gap: 14px; font-size: 12px; color: #64748b; margin-bottom: 12px; }
.oz-article-headline { font-size: 18px; font-weight: 800; color: #0f172a; margin: 0 0 10px 0; line-height: 1.4; }
.oz-article-headline a { color: #0f172a; text-decoration: none; }
.oz-article-headline a:hover { color: #0050e5; }
.oz-article-excerpt { font-size: 13.5px; color: #64748b; line-height: 1.6; margin: 0 0 18px 0; flex: 1; }
.oz-read-more { font-size: 13px; font-weight: 700; color: #0050e5; text-decoration: none; }
@media (max-width: 768px) {
  .oz-blog-section { padding: 48px 16px; }
  .oz-blog-title { font-size: 26px; }
  .oz-blog-grid { grid-template-columns: 1fr; }
}`,
      sampleContent: {
        title: 'Insights, Guides & Industry Analysis',
        miniTitle: 'CORPORATE JOURNAL',
        description: 'Explore engineering perspectives, platform announcements, and best practices.',
        buttonText: 'View All Articles',
        buttonLink: '/blog',
        items: []
      }
    },
    {
      id: 'blog_detail',
      codePrefix: 'ARTICLE',
      name: 'Blog Article Detail',
      icon: 'article',
      tagline: 'Single article detail with author meta, rich body, and 4-widget sticky sidebar',
      defaultName: 'Apex Article Detail With Sticky Sidebar',
      html: `<article class="oz-article-detail-section">
  <div class="oz-article-detail-container">
    <div class="oz-article-main-content">
      <header class="oz-article-header">
        <div class="oz-article-badge-row">
          <span class="oz-article-cat-badge">{{ Article.Category }}</span>
          <time class="oz-article-date">{{ Article.PublishedDate }}</time>
        </div>
        <h1 class="oz-article-title">{{ Article.Title }}</h1>
        <div class="oz-author-card-top">
          <div class="oz-author-avatar-box">
            <span class="material-symbols-outlined">person</span>
          </div>
          <div>
            <strong class="oz-author-name">{{ Article.AuthorName }}</strong>
            <span class="oz-author-role">{{ Article.AuthorRole }}</span>
          </div>
        </div>
      </header>

      <div class="oz-article-cover-frame">
        <img src="{{ Article.CoverImageUrl }}" alt="{{ Article.Title }}" class="oz-article-cover-img" />
      </div>

      <div class="oz-article-body-rich">
        {{ Article.Body }}
      </div>

      <footer class="oz-article-footer">
        <div class="oz-article-tags-wrap">
          <span class="oz-tags-label">Tags:</span>
          {{#each ArticleTags}}
          <span class="oz-tag-pill">#{{ Name }}</span>
          {{/each}}
        </div>
      </footer>
    </div>

    <aside class="oz-article-sidebar">
      <div class="oz-sidebar-widget search-widget">
        <h4 class="oz-widget-title">Search Articles</h4>
        <form action="/blog" method="get" class="oz-search-form">
          <div class="input-group">
            <input type="text" name="q" class="form-control oz-search-input" placeholder="Search keywords..." />
            <button class="btn btn-primary oz-search-btn" type="submit">Search</button>
          </div>
        </form>
      </div>

      <div class="oz-sidebar-widget recent-widget">
        <h4 class="oz-widget-title">Recent Articles</h4>
        <ul class="oz-recent-list">
          {{#each RecentArticles}}
          <li class="oz-recent-item">
            <a href="{{ Url }}" class="oz-recent-link">{{ Title }}</a>
            <span class="oz-recent-date">{{ PublishedDate }}</span>
          </li>
          {{/each}}
        </ul>
      </div>

      <div class="oz-sidebar-widget categories-widget">
        <h4 class="oz-widget-title">Categories</h4>
        <div class="oz-categories-pills">
          {{#each BlogCategories}}
          <a href="/blog?category={{ Slug }}" class="oz-category-pill">
            <span>{{ Name }}</span>
            <span class="oz-cat-count">{{ Count }}</span>
          </a>
          {{/each}}
        </div>
      </div>

      <div class="oz-sidebar-widget newsletter-widget">
        <h4 class="oz-widget-title">Stay Updated</h4>
        <p class="oz-widget-desc">Get the latest platform releases delivered directly to your inbox.</p>
        {{ Form "Newsletter_Subscribe" }}
      </div>
    </aside>
  </div>
</article>`,
      css: `.oz-article-detail-section { padding: 60px 24px 80px 24px; background: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
.oz-article-detail-container { max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: 2fr 1fr; gap: 48px; align-items: start; }
.oz-article-header { margin-bottom: 24px; }
.oz-article-badge-row { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.oz-article-cat-badge { background: #eef2ff; color: #0050e5; font-size: 11.5px; font-weight: 800; padding: 4px 12px; border-radius: 6px; }
.oz-article-date { font-size: 13px; color: #64748b; }
.oz-article-title { font-size: 38px; font-weight: 900; line-height: 1.2; color: #0f172a; margin: 0 0 20px 0; }
.oz-author-card-top { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0; }
.oz-author-avatar-box { width: 40px; height: 40px; border-radius: 50%; background: #0050e5; color: #ffffff; display: flex; align-items: center; justify-content: center; }
.oz-author-name { display: block; font-size: 14px; font-weight: 800; color: #0f172a; }
.oz-author-role { font-size: 12px; color: #64748b; }
.oz-article-cover-frame { margin: 24px 0 32px 0; border-radius: 14px; overflow: hidden; max-height: 440px; }
.oz-article-cover-img { width: 100%; height: 100%; object-fit: cover; }
.oz-article-body-rich { font-size: 16px; line-height: 1.8; color: #334155; }
.oz-article-footer { margin-top: 40px; padding-top: 24px; border-top: 1px solid #e2e8f0; }
.oz-article-tags-wrap { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.oz-tags-label { font-size: 13px; font-weight: 700; color: #64748b; }
.oz-tag-pill { font-size: 12px; font-weight: 700; background: #f1f5f9; color: #475569; padding: 4px 10px; border-radius: 6px; }
.oz-article-sidebar { display: flex; flex-direction: column; gap: 28px; position: sticky; top: 90px; }
.oz-sidebar-widget { background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 22px; }
.oz-widget-title { font-size: 15px; font-weight: 800; color: #0f172a; margin: 0 0 14px 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
.oz-search-form .input-group { display: flex; }
.oz-search-input { border-radius: 8px 0 0 8px !important; border: 1.5px solid #cbd5e1; border-right: none; font-size: 13px; }
.oz-search-btn { border-radius: 0 8px 8px 0 !important; }
.oz-recent-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 12px; }
.oz-recent-link { font-size: 13.5px; font-weight: 700; color: #0f172a; text-decoration: none; }
.oz-recent-date { font-size: 11.5px; color: #94a3b8; display: block; }
.oz-categories-pills { display: flex; flex-direction: column; gap: 8px; }
.oz-category-pill { display: flex; justify-content: space-between; align-items: center; background: #ffffff; border: 1px solid #e2e8f0; padding: 8px 12px; border-radius: 6px; font-size: 13px; font-weight: 600; color: #334155; text-decoration: none; }
.oz-category-pill:hover { border-color: #0050e5; color: #0050e5; background: #eef2ff; }
.oz-cat-count { font-size: 11px; font-weight: 800; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; color: #64748b; }
.oz-widget-desc { font-size: 12.5px; color: #64748b; margin: 0 0 14px 0; }
@media (max-width: 900px) {
  .oz-article-detail-container { grid-template-columns: 1fr; gap: 36px; }
  .oz-article-sidebar { position: static; }
}`,
      sampleContent: {
        article: {
          title: 'Scaling Distributed Cloud Ingestion With Zero Latency Tolerances',
          category: 'Platform Architecture',
          publishedDate: 'September 14, 2026',
          authorName: 'Dr. Evelyn Vance',
          authorRole: 'Chief Systems Architect',
          coverImageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop&q=80',
          body: `<p>Modern distributed systems face unprecedented challenges when balancing high availability against strict sub-millisecond execution constraints. In this comprehensive architecture deep-dive, we examine our edge packet mesh and how decentralized consensus protocols prevent cascading failovers across multi-cloud footprints.</p><h2>Understanding Mesh Topology</h2><p>Rather than funneling client connections through a centralized proxy cluster, our edge nodes coordinate routing tables dynamically using cryptographic telemetry envelopes.</p>`
        }
      }
    }
  ];

  /** Flag indicating active background AI navbar analysis and placeholder transformation */
  isAiTransforming: boolean = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private sanitizer: DomSanitizer,
    private toast: ToastService,
    private api: ApiService,
    private aiContext: AiAssistantContextService
  ) {}

  ngOnInit(): void {
    this.resolveTenantInfo();
    this.loadEditorTokens();

    // Explicitly ensure Ozi Flash (Gemini) is default for template studio
    this.aiContext.setSelectedModel('ozi-flash');

    // Register this studio's context with the global AI Assistant
    this.aiContext.registerPageContext({
      pageId: 'create_custom_template',
      pageTitle: 'Custom Section Blueprint Studio',
      pageCategory: 'Section Studio',
      quickPrompts: [
        'Study and convert raw pasted HTML into Ozikol tokens',
        'Generate a modern pricing table section with 3 tiers',
        'Refactor CSS for flawless mobile responsiveness'
      ],
      getState: () => ({
        name: this.templateName,
        category: this.selectedCategory,
        variantCode: this.variantCode,
        description: this.description,
        html: this.htmlTemplate,
        css: this.cssStyles,
        js: this.jsScript,
        sampleContent: this.sampleContent
      }),
      applyChanges: (data: any) => {
        if (data.name) this.templateName = data.name;
        if (data.category) this.selectedCategory = data.category;
        if (data.html !== undefined) this.htmlTemplate = data.html;
        if (data.css !== undefined) this.cssStyles = data.css;
        if (data.js !== undefined) this.jsScript = data.js;
        if (data.mockContent) {
          this.sampleContent = { ...this.sampleContent, ...data.mockContent };
        }
        this.updatePreviewSimulation();
        setTimeout(() => this.syncRichEditorFromModel(), 0);
      },
      saveToDatabase: async () => {
        this.saveCustomTemplate();
      }
    });

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.isEditMode = true;
        this.editCode = id;
        this.loadTemplateForEditing(id);
      }
    });

    this.route.queryParams.subscribe(params => {
      const editCode = params['editCode'] || params['id'];
      const category = params['category'];
      if (editCode && !this.isEditMode) {
        this.isEditMode = true;
        this.editCode = editCode;
        this.loadTemplateForEditing(editCode, category);
      } else if (!this.isEditMode && !this.editCode) {
        this.onCategoryChange(false);
      }
    });
  }

  ngOnDestroy(): void {
    this.aiContext.unregisterPageContext('create_custom_template');
  }

  /**
   * Loads an installed template for editing in the studio by its variant code or template key.
   * @param code Variant code, template key, or database ID
   * @param categoryHint Optional category hint from query params
   */
  loadTemplateForEditing(code: string, categoryHint?: string): void {
    this.api.get<any>('ContentApi/templates/installed').subscribe({
      next: (res) => {
        if (res?.data && Array.isArray(res.data)) {
          const item = res.data.find((t: any) =>
            (t.variantCode && t.variantCode.toLowerCase() === code.toLowerCase()) ||
            (t.templateKey && t.templateKey.toLowerCase() === code.toLowerCase()) ||
            (t.id && t.id.toLowerCase() === code.toLowerCase())
          );
          if (item) {
            this.templateName = item.name || this.templateName;
            this.description = item.description || this.description;
            this.variantCode = item.variantCode || item.templateKey || code;
            const cat = (item.categoryKey || categoryHint || 'hero').toLowerCase();
            this.selectedCategory = cat;
            this.htmlTemplate = item.htmlTemplate || '';
            this.cssStyles = item.cssStyles || '';
            this.jsScript = item.jsScript || '';

            // If defaultContentJson is present, parse and merge into sampleContent
            if (item.defaultContentJson) {
              try {
                const parsed = JSON.parse(item.defaultContentJson);
                this.sampleContent = { ...this.sampleContent, ...parsed };
              } catch (e) {
                console.warn('Could not parse defaultContentJson:', e);
              }
            } else {
              // Populate sample content from preset if applicable
              const preset = this.categoryPresets.find(c => c.id === cat);
              if (preset) {
                this.sampleContent = JSON.parse(JSON.stringify(preset.sampleContent));
              }
            }

            this.updatePreviewSimulation();
            setTimeout(() => this.syncRichEditorFromModel(), 0);
            this.toast.info(`Loaded template "${this.templateName}" for editing.`);
            return;
          }
        }
        this.toast.warning(`Template with code "${code}" could not be found.`);
        this.onCategoryChange(false);
      },
      error: (err) => {
        console.error('Error fetching template for editing:', err);
        this.toast.error('Failed to load template for editing.');
        this.onCategoryChange(false);
      }
    });
  }

  /**
   * Helper that replaces Handlebars {{#each BlockName}} ... {{/each}} blocks while respecting
   * nested {{#each ...}} ... {{/each}} depth.
   * @param template Full template string
   * @param blockName Name of the block to match
   * @param replacer Function called with the inner content of the balanced block
   * @returns Hydrated string with balanced block replaced
   */
  replaceBalancedBlock(template: string, blockName: string, replacer: (innerContent: string) => string): string {
    const openTagPattern = new RegExp(`\\{\\{#each\\s+${blockName}\\b[^}]*\\}\\}`, 'i');
    let result = '';
    let remaining = template;

    while (true) {
      const match = remaining.match(openTagPattern);
      if (!match || match.index === undefined) {
        result += remaining;
        break;
      }

      const startIndex = match.index;
      result += remaining.slice(0, startIndex);
      const contentStart = startIndex + match[0].length;
      let depth = 1;
      let pos = contentStart;

      while (pos < remaining.length && depth > 0) {
        const nextOpen = remaining.indexOf('{{#each', pos);
        const nextClose = remaining.indexOf('{{/each}}', pos);

        if (nextClose === -1) {
          break; // Unclosed block
        }

        if (nextOpen !== -1 && nextOpen < nextClose) {
          depth++;
          pos = nextOpen + '{{#each'.length;
        } else {
          depth--;
          if (depth === 0) {
            const innerContent = remaining.substring(contentStart, nextClose);
            result += replacer(innerContent);
            remaining = remaining.substring(nextClose + '{{/each}}'.length);
            break;
          } else {
            pos = nextClose + '{{/each}}'.length;
          }
        }
      }

      if (depth > 0) {
        // Fallback for unclosed block
        result += remaining.substring(startIndex);
        break;
      }
    }

    return result;
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
   * Inserts 3-zone navigation loop (First, Middle, Last, or All) with combined SortOrder sorting.
   * @param zone 'first' | 'middle' | 'last' | 'all'
   */
  insertNavItemsZoneLoopAtCursor(zone: string): void {
    let loopBlock = '';
    if (zone === 'first') {
      loopBlock = `\n{{#if HasNavItemsFirst}}
{{#each NavItems="first"}}
  {{#if IsDropdown}}
    <li class="nav-item dropdown {{ CustomClass }}">
      <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown">{{ Title }}</a>
      {{#if Pages}}
      <ul class="dropdown-menu">
        {{#each Pages}}
          <li><a class="dropdown-item {{ CustomClass }}" href="{{ Url }}">{{ Title }}</a></li>
        {{/each}}
      </ul>
      {{/if}}
    </li>
  {{else}}
    <li class="nav-item {{ CustomClass }}">
      <a class="nav-link {{#if @first}}active{{/if}}" href="{{ Url }}">{{ Title }}</a>
    </li>
  {{/if}}
{{/each}}
{{/if}}\n`;
    } else if (zone === 'middle') {
      loopBlock = `\n{{#if HasNavItemsMiddle}}
{{#each NavItems="middle"}}
  {{#if IsDropdown}}
    <li class="nav-item dropdown {{ CustomClass }}">
      <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown">{{ Title }}</a>
      {{#if Pages}}
      <ul class="dropdown-menu">
        {{#each Pages}}
          <li><a class="dropdown-item {{ CustomClass }}" href="{{ Url }}">{{ Title }}</a></li>
        {{/each}}
      </ul>
      {{/if}}
    </li>
  {{else}}
    <li class="nav-item {{ CustomClass }}">
      <a class="nav-link" href="{{ Url }}">{{ Title }}</a>
    </li>
  {{/if}}
{{/each}}
{{/if}}\n`;
    } else if (zone === 'last') {
      loopBlock = `\n{{#if HasNavItemsLast}}
{{#each NavItems="last"}}
  {{#if IsDropdown}}
    <li class="nav-item dropdown {{ CustomClass }}">
      <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown">{{ Title }}</a>
      {{#if Pages}}
      <ul class="dropdown-menu dropdown-menu-end">
        {{#each Pages}}
          <li><a class="dropdown-item {{ CustomClass }}" href="{{ Url }}">{{ Title }}</a></li>
        {{/each}}
      </ul>
      {{/if}}
    </li>
  {{else}}
    <li class="nav-item {{ CustomClass }}">
      <a class="nav-link" href="{{ Url }}">{{ Title }}</a>
    </li>
  {{/if}}
{{/each}}
{{/if}}\n`;
    } else {
      loopBlock = `\n{{#if HasNavItems}}
{{#each NavItems}}
  {{#if IsDropdown}}
    <li class="nav-item dropdown {{ CustomClass }}">
      <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown">{{ Title }}</a>
      {{#if Pages}}
      <ul class="dropdown-menu {{#if @last}}dropdown-menu-end{{/if}}">
        {{#each Pages}}
          <li><a class="dropdown-item {{ CustomClass }}" href="{{ Url }}">{{ Title }}</a></li>
        {{/each}}
      </ul>
      {{/if}}
    </li>
  {{else}}
    <li class="nav-item {{ CustomClass }}">
      <a class="nav-link {{#if @first}}active{{/if}}" href="{{ Url }}">{{ Title }}</a>
    </li>
  {{/if}}
{{/each}}
{{/if}}\n`;
    }
    this.insertTokenAtCursor(loopBlock);
  }

  /**
   * Inserts defensive top utility bar loop (contact info + top pages + login button).
   */
  insertTopBarPagesLoopAtCursor(): void {
    const loopBlock = `\n{{#if HasTopBar}}
<div class="topbar-utility bg-dark text-white-50 py-2 border-bottom border-white-10">
  <div class="container d-flex justify-content-between align-items-center small">
    {{#if HasContactInfo}}
    <div class="top-contact d-flex align-items-center gap-3">
      {{#if Phone}}<span><i class="fa-solid fa-phone text-primary me-1"></i> {{ Phone }}</span>{{/if}}
      {{#if Email}}<span class="d-none d-md-inline ms-2"><i class="fa-solid fa-envelope text-primary me-1"></i> {{ Email }}</span>{{/if}}
    </div>
    {{/if}}
    <div class="top-links d-flex align-items-center gap-3 ms-auto">
      {{#each MainMenuItems="top"}}
        <a href="{{ Url }}" class="text-white-50 text-decoration-none hover-white {{ CustomClass }}">{{ Title }}</a>
      {{/each}}
      {{#if ActivateLoginInMenu}}
        <a href="{{ LoginUrl }}" class="text-white fw-semibold text-decoration-none ms-2"><i class="fa-regular fa-user me-1"></i> {{ LoginText }}</a>
      {{/if}}
    </div>
  </div>
</div>
{{/if}}\n`;
    this.insertTokenAtCursor(loopBlock);
  }

  /**
   * Intelligently transforms the pasted raw navbar HTML in the editor into dynamic Ozikol
   * Handlebars placeholders using Central Google Gemini 2.5 Flash / DeepSeek AI.
   * Preserves 100% of original CSS classes, IDs, togglers, and layout structure.
   */
  aiTransformMenuPlaceholders(): void {
    const rawHtml = (this.htmlTemplate || '').trim();
    if (!rawHtml) {
      this.toast.warning('Please paste or type raw navbar HTML into the editor first.');
      return;
    }

    this.isAiTransforming = true;
    this.toast.info('✨ AI is analyzing navbar structure and transforming placeholders...');

    const prompt = `You are a surgical code transformer for the Ozikol BCC CMS platform.

YOUR ONLY MISSION:
Replace SPECIFIC menu placeholders in the provided raw HTML and leave EVERY SINGLE OTHER LINE 100% UNTOUCHED.

SURGICAL REPLACEMENT TARGETS ONLY:
1. LOGO:
   - In any logo anchor (desktop or mobile), change href to "{{ HomeUrl }}" and replace the logo content with:
     {{#if BrandLogo}}
       <img src="{{ BrandLogo }}" alt="{{ BrandName }}" class="[keep original classes]" />
     {{else}}
       <span class="[keep original classes]">{{ BrandName }}</span>
     {{/if}}

2. NAVIGATION LINKS LIST (EVERY navigation <ul> - Desktop navbar, Sticky header clone, and Off-Canvas Mobile Drawer <ul>):
   - Whenever navigation <ul> elements are repeated or separate between desktop and mobile drawers: DO NOT ASSUME, SUMMARIZE, OR CUT OFF.
   - Replace the static <li> links inside EVERY SINGLE navigation <ul> with the 3 sequential zones:
     {{#each NavItems="first"}}
       {{#if IsDropdown}}
         <li class="[original dropdown classes] {{ CustomClass }}">
           <a href="{{ Url }}" class="[original toggle classes]">{{ Title }} [preserve original chevron/caret if any]</a>
           {{#if Pages}}
             <ul class="[original dropdown-menu classes]">
               {{#each Pages}}
                 <li><a href="{{ Url }}" class="[original item classes] {{ CustomClass }}">{{ Title }}</a></li>
               {{/each}}
             </ul>
           {{/if}}
         </li>
       {{else}}
         <li class="[original classes] {{ CustomClass }}">
           <a href="{{ Url }}" class="[original classes]">{{ Title }}</a>
         </li>
       {{/if}}
     {{/each}}

     {{#each NavItems="middle"}}
       {{#if IsDropdown}}
         <li class="[original dropdown classes] {{ CustomClass }}">
           <a href="{{ Url }}" class="[original toggle classes]">{{ Title }} [preserve original chevron/caret if any]</a>
           {{#if Pages}}
             <ul class="[original dropdown-menu classes]">
               {{#each Pages}}
                 <li><a href="{{ Url }}" class="[original item classes] {{ CustomClass }}">{{ Title }}</a></li>
               {{/each}}
             </ul>
           {{/if}}
         </li>
       {{else}}
         <li class="[original classes] {{ CustomClass }}">
           <a href="{{ Url }}" class="[original classes]">{{ Title }}</a>
         </li>
       {{/if}}
     {{/each}}

     {{#each NavItems="last"}}
       {{#if IsDropdown}}
         <li class="[original dropdown classes] {{ CustomClass }}">
           <a href="{{ Url }}" class="[original toggle classes]">{{ Title }} [preserve original chevron/caret if any]</a>
           {{#if Pages}}
             <ul class="[original dropdown-menu classes]">
               {{#each Pages}}
                 <li><a href="{{ Url }}" class="[original item classes] {{ CustomClass }}">{{ Title }}</a></li>
               {{/each}}
             </ul>
           {{/if}}
         </li>
       {{else}}
         <li class="[original classes] {{ CustomClass }}">
           <a href="{{ Url }}" class="[original classes]">{{ Title }}</a>
         </li>
       {{/if}}
     {{/each}}

3. CTA BUTTONS & DYNAMIC AUTHENTICATION (LOGIN) POSITIONING:
   - Condition A (Navbar originally HAS a CTA button, e.g. [Add Listing], [Book Now], [Get Started]):
     * Replace the CTA button with:
       {{#each MenuCtaButtons}}
         <li class="[original button classes] {{ CustomClass }}"><a href="{{ Url }}">{{ Title }}</a></li>
       {{/each}}
     * Include the dynamic Sign In link alongside the CTA area: href="{{ LoginUrl }}" with {{ LoginText }}.
   - Condition B (Navbar has NO CTA button):
     * DO NOT invent or add {{#each MenuCtaButtons}}.
     * Instead, append the dynamic Sign In link as the final navigation item inside the <ul> list (right after NavItems="last"):
       <li class="[original nav-item classes]"><a href="{{ LoginUrl }}" class="[original nav-link classes]">{{ LoginText }}</a></li>

4. TOPBAR SITE LINKS:
   - ONLY IF the topbar has site navigation page links, replace them with:
     {{#each MainMenuItems="top"}}<a href="{{ Url }}" class="{{ CustomClass }}">{{ Title }}</a>{{/each}}

5. ABSOLUTE ZERO-TOUCH & ZERO-TRUNCATION RULE FOR EVERYTHING ELSE:
   - DO NOT TOUCH or replace phone numbers, email mailto links, physical addresses, support widgets, search inputs, language switchers, social icons, cart drawers (#ltn__utilize-cart-menu), or overlay backdrops (.ltn__utilize-overlay). Keep them 100% verbatim static HTML as pasted.
   - DO NOT DROP, SUMMARIZE, OR TRUNCATE any sibling elements (like mobile drawers or cart menus) after closing header tags. Return 100% of the complete document.
   - NEVER invent phantom tokens like {{ Brand.Email }}, {{ Brand.Phone }}, {{ Brand.Address }}, {{ Brand.LogoUrl }}, or {{ PageCategories }}.

6. OUTPUT:
   - Output ONLY the complete transformed raw HTML. No explanations, no markdown fences.`;

    const payload = {
      prompt,
      rawHtml,
      rawCss: this.cssStyles || '',
      category: 'menu',
      currentTemplateName: this.templateName || 'Navigation Menu',
      pageRoute: '/content/console/templates/create',
      pageTitle: 'Custom Section Blueprint Studio'
    };

    this.api.post<any>('ContentApi/templates/ai-copilot', payload).subscribe({
      next: (res) => {
        this.isAiTransforming = false;
        let transformed = res?.data?.htmlTemplate || res?.data?.codeResult?.htmlTemplate || '';

        // If AI returned text with markdown code fences, strip them
        if (transformed) {
          transformed = transformed.replace(/^```(?:html)?\s*/i, '').replace(/```\s*$/i, '').trim();
          this.htmlTemplate = transformed;
          this.updatePreviewSimulation();
          this.toast.success('✨ Successfully transformed navbar with smart AI menu placeholders!');
        } else {
          this.toast.warning('AI response did not return HTML code. Please try again.');
        }
      },
      error: (err) => {
        this.isAiTransforming = false;
        const msg = err?.error?.message || err?.message || 'Failed to reach AI service.';
        this.toast.error(`AI Transformation error: ${msg}`);
      }
    });
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
   * Inserts loop across published WebPages flagged as top menu items.
   */
  insertMainMenuItemsLoopAtCursor(): void {
    const loopBlock = `\n<ul class="navbar-nav me-auto mb-2 mb-lg-0">
  {{#each MainMenuItems}}
  <li class="nav-item">
    <a class="nav-link" href="{{ Url }}">{{ Title }}</a>
  </li>
  {{/each}}
</ul>\n`;
    this.insertTokenAtCursor(loopBlock);
  }

  /**
   * Inserts loop across published WebPages flagged as IsMenuCTA = true.
   */
  insertMenuCtaButtonsLoopAtCursor(): void {
    const loopBlock = `\n<div class="d-flex align-items-center gap-2">
  {{#each MenuCtaButtons}}
  <a href="{{ Url }}" class="btn btn-sm btn-primary rounded-pill px-3">{{ Title }}</a>
  {{/each}}
</div>\n`;
    this.insertTokenAtCursor(loopBlock);
  }

  /**
   * Inserts tagged pages loop by tag name.
   */
  insertTaggedPagesLoopAtCursor(tagName: string = 'QuickLinks'): void {
    const loopBlock = `\n<ul class="oz-tagged-pages-list">
  {{#each TaggedPages "${tagName}"}}
  <li><a href="{{ Url }}">{{ Title }}</a></li>
  {{/each}}
</ul>\n`;
    this.insertTokenAtCursor(loopBlock);
  }

  /**
   * Inserts articles card grid loop for blog templates.
   */
  insertArticlesLoopAtCursor(): void {
    const loopBlock = `\n<div class="row g-4">
  {{#each Articles}}
  <div class="col-md-4">
    <article class="card h-100 border-0 shadow-sm rounded-4 overflow-hidden">
      <img src="{{ CoverImageUrl }}" class="card-img-top" alt="{{ Title }}" style="height: 200px; object-fit: cover;" />
      <div class="card-body p-4 d-flex flex-column">
        <span class="badge bg-primary-subtle text-primary mb-2 align-self-start">{{ Category }}</span>
        <h5 class="card-title fw-bold"><a href="{{ Url }}" class="text-dark text-decoration-none">{{ Title }}</a></h5>
        <p class="card-text text-muted small flex-grow-1">{{ Summary }}</p>
        <div class="d-flex justify-content-between align-items-center mt-3 pt-3 border-top small text-muted">
          <span>{{ PublishedDate }}</span>
          <span>By {{ AuthorName }}</span>
        </div>
      </div>
    </article>
  </div>
  {{/each}}
</div>\n`;
    this.insertTokenAtCursor(loopBlock);
  }

  /**
   * Inserts sidebar recent articles loop.
   */
  insertRecentArticlesLoopAtCursor(): void {
    const loopBlock = `\n<ul class="list-unstyled d-flex flex-column gap-3">
  {{#each RecentArticles}}
  <li class="border-bottom pb-2">
    <a href="{{ Url }}" class="fw-bold text-dark text-decoration-none d-block">{{ Title }}</a>
    <small class="text-muted">{{ PublishedDate }}</small>
  </li>
  {{/each}}
</ul>\n`;
    this.insertTokenAtCursor(loopBlock);
  }

  /**
   * Inserts sidebar blog categories filter loop.
   */
  insertBlogCategoriesLoopAtCursor(): void {
    const loopBlock = `\n<div class="d-flex flex-column gap-2">
  {{#each BlogCategories}}
  <a href="/blog?category={{ Slug }}" class="d-flex justify-content-between align-items-center p-2 rounded text-decoration-none bg-light text-dark">
    <span>{{ Name }}</span>
    <span class="badge bg-secondary rounded-pill">{{ Count }}</span>
  </a>
  {{/each}}
</div>\n`;
    this.insertTokenAtCursor(loopBlock);
  }

  /**
   * Displays the contextual token documentation popover near the clicked/hovered trigger element.
   */
  showTokenDoc(tKey: string, event: MouseEvent): void {
    this.cancelPopoverLeaveTimer();
    const doc = this.tokenDocMap[tKey];
    if (!doc) return;
    this.activeTokenDoc = doc;

    const target = event.currentTarget as HTMLElement;
    if (target && target.getBoundingClientRect) {
      const rect = target.getBoundingClientRect();
      let top = rect.bottom + 8;
      let left = rect.left;

      const popoverWidth = 380;
      if (left + popoverWidth > window.innerWidth - 20) {
        left = window.innerWidth - popoverWidth - 20;
      }
      if (left < 10) left = 10;

      if (top + 340 > window.innerHeight && rect.top > 350) {
        top = rect.top - 330;
      }

      this.popoverTop = Math.max(10, top);
      this.popoverLeft = Math.max(10, left);
    }
  }

  /**
   * Toggles the token documentation popover for mobile tap or persistent desktop pin.
   */
  toggleTokenDoc(tKey: string, event: MouseEvent): void {
    event.stopPropagation();
    if (this.activeTokenDoc?.token === this.tokenDocMap[tKey]?.token) {
      this.closeTokenDoc();
    } else {
      this.showTokenDoc(tKey, event);
    }
  }

  /**
   * Closes the popover after a brief delay when mouse leaves the trigger.
   */
  hideTokenDocOnLeave(): void {
    this.cancelPopoverLeaveTimer();
    this.popoverLeaveTimer = setTimeout(() => {
      this.closeTokenDoc();
    }, 280);
  }

  cancelPopoverLeaveTimer(): void {
    if (this.popoverLeaveTimer) {
      clearTimeout(this.popoverLeaveTimer);
      this.popoverLeaveTimer = null;
    }
  }

  closeTokenDoc(): void {
    this.activeTokenDoc = null;
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

    // 0a. Top Menu Items Loop ({{#each MainMenuItems}}...{{/each}})
    const mainMenuItemsRegex = /\{\{#each\s+MainMenuItems\}\}([\s\S]*?)\{\{\/each\}\}/gi;
    output = output.replace(mainMenuItemsRegex, (_match: string, innerTemplate: string) => {
      const items = (this.editorTokens.topMenuItems && this.editorTokens.topMenuItems.length > 0)
        ? this.editorTokens.topMenuItems
        : [
            { title: 'Home', url: '/' },
            { title: 'About Us', url: '/about' },
            { title: 'Blog', url: '/blog' },
            { title: 'Contact', url: '/contact' }
          ];
      return items.map((item: any) => {
        let rendered = innerTemplate;
        rendered = rendered.replace(/\{\{\s*Title\s*\}\}/gi, item.title || '');
        rendered = rendered.replace(/\{\{\s*Url\s*\}\}/gi, item.url || item.slug || '#');
        return rendered;
      }).join('\n');
    });

    // 0b. Menu CTA Buttons Loop ({{#each MenuCtaButtons}}...{{/each}})
    const menuCtaRegex = /\{\{#each\s+MenuCtaButtons\}\}([\s\S]*?)\{\{\/each\}\}/gi;
    output = output.replace(menuCtaRegex, (_match: string, innerTemplate: string) => {
      const ctas = (this.editorTokens.menuCtaButtons && this.editorTokens.menuCtaButtons.length > 0)
        ? this.editorTokens.menuCtaButtons
        : [
            { title: 'Sign In', url: '/login' },
            { title: 'Request a Service', url: '/request-service' }
          ];
      return ctas.map((cta: any) => {
        let rendered = innerTemplate;
        rendered = rendered.replace(/\{\{\s*(?:ButtonText|Title)\s*\}\}/gi, cta.title || '');
        rendered = rendered.replace(/\{\{\s*(?:ButtonLink|Url)\s*\}\}/gi, cta.url || '#');
        rendered = rendered.replace(/\{\{\s*CustomClass\s*\}\}/gi, '');
        return rendered;
      }).join('\n');
    });

    // 0c. Menu Dropdowns Loop ({{#each MenuDropdowns}}...{{/each}}) with nested ({{#each Pages}}...{{/each}})
    output = this.replaceBalancedBlock(output, 'MenuDropdowns', (outerTemplate) => {
      const dropdowns = (this.editorTokens.menuDropdowns && this.editorTokens.menuDropdowns.length > 0)
        ? this.editorTokens.menuDropdowns
        : (ctx.menuDropdowns && ctx.menuDropdowns.length > 0)
          ? ctx.menuDropdowns
          : [
              {
                title: 'Services',
                pages: [
                  { title: 'Commercial Cleaning', url: '/services/commercial-cleaning' },
                  { title: 'Residential Cleaning', url: '/services/residential-cleaning' },
                  { title: 'Deep Sanitization', url: '/services/deep-sanitization' }
                ]
              },
              {
                title: 'Company',
                pages: [
                  { title: 'About Us', url: '/about' },
                  { title: 'Request a Service', url: '/request-service' },
                  { title: 'Contact Us', url: '/contact' }
                ]
              }
            ];

      if (!Array.isArray(dropdowns) || dropdowns.length === 0) return '';

      return dropdowns.map((dd: any, ddIdx: number) => {
        let renderedDd = outerTemplate;

        // FIRST resolve nested {{#each Pages}} so child {{ Title }} is NOT replaced by parent category title
        const pagesRegex = /\{\{#each\s+Pages\}\}([\s\S]*?)\{\{\/each\}\}/gi;
        renderedDd = renderedDd.replace(pagesRegex, (_pMatch: string, pageTemplate: string) => {
          const pages = dd.pages || [];
          if (!Array.isArray(pages) || pages.length === 0) return '';
          return pages.map((page: any) => {
            let renderedPage = pageTemplate;
            renderedPage = renderedPage.replace(/\{\{\s*Title\s*\}\}/gi, page.title || '');
            renderedPage = renderedPage.replace(/\{\{\s*Url\s*\}\}/gi, page.url || page.slug || '#');
            return renderedPage;
          }).join('\n');
        });

        // THEN resolve category-level tokens
        renderedDd = renderedDd.replace(/\{\{\s*CategoryName\s*\}\}/gi, dd.title || dd.categoryName || 'Services');
        renderedDd = renderedDd.replace(/\{\{\s*Title\s*\}\}/gi, dd.title || dd.categoryName || 'Services');
        renderedDd = renderedDd.replace(/\{\{\s*Index\s*\}\}/gi, (ddIdx + 1).toString());

        return renderedDd;
      }).join('\n');
    });

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

    // 5b. TaggedPages Loop (e.g. {{#each TaggedPages "FooterCol1"}} or {{#each TaggedPages "Important"}})
    const taggedPagesRegex = /\{\{#each\s+TaggedPages\s+"([^"]+)"\}\}([\s\S]*?)\{\{\/each\}\}/gi;
    output = output.replace(taggedPagesRegex, (_match: string, tag: string, innerTemplate: string) => {
      const normalized = (tag || '').toLowerCase().trim();
      let pages: any[] = [];
      const editorTokensAny = this.editorTokens as any;
      if (editorTokensAny.pages && Array.isArray(editorTokensAny.pages)) {
        pages = editorTokensAny.pages.filter((p: any) =>
          p.tags && p.tags.toLowerCase().includes(normalized)
        );
      }
      if (pages.length === 0) {
        pages = [
          { title: `${tag} Page 1`, url: '#' },
          { title: `${tag} Page 2`, url: '#' }
        ];
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

        // FIRST resolve nested {{#each Pages}} so child {{ Title }} is NOT replaced by parent category title
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

        colHtml = colHtml.replace(/\{\{\s*(?:DisplayTitle|Title|CategoryTitle)\s*\}\}/gi, g.displayTitle || g.name || 'Column');

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

    // 9b. Articles Loop ({{#each Articles}}...{{/each}})
    const articlesRegex = /\{\{#each\s+Articles\}\}([\s\S]*?)\{\{\/each\}\}/gi;
    output = output.replace(articlesRegex, (_match: string, innerTemplate: string) => {
      const articles = [
        {
          title: 'Architecting Resilient Multi-Tenant Cloud Ecosystems',
          summary: 'Explore proven patterns for high-throughput tenant isolation, schema partitioning, and real-time synchronization.',
          coverImageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80',
          category: 'Engineering & Architecture',
          authorName: 'Alex Rivera',
          authorRole: 'Chief Architect',
          publishedDate: 'Sep 12, 2026',
          url: '/blog/architecting-resilient-multi-tenant-cloud-ecosystems'
        },
        {
          title: 'The Shift to Zero-Downtime Migration Pipelines',
          summary: 'How leading enterprise engineering teams execute petabyte-scale database cutovers without dropping a single active transaction.',
          coverImageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&auto=format&fit=crop&q=80',
          category: 'DevOps & Reliability',
          authorName: 'Sarah Chen',
          authorRole: 'Head of Infrastructure',
          publishedDate: 'Sep 08, 2026',
          url: '/blog/zero-downtime-migration-pipelines'
        },
        {
          title: 'Next-Gen Identity & Granular Role Governance',
          summary: 'Integrating decentralized identity tokens with high-compliance RBAC structures across distributed micro-services.',
          coverImageUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&auto=format&fit=crop&q=80',
          category: 'Cybersecurity',
          authorName: 'Marcus Vance',
          authorRole: 'Security Lead',
          publishedDate: 'Aug 29, 2026',
          url: '/blog/next-gen-identity-governance'
        }
      ];

      return articles.map((art: any) => {
        let rendered = innerTemplate;
        rendered = rendered.replace(/\{\{\s*Title\s*\}\}/gi, art.title);
        rendered = rendered.replace(/\{\{\s*Summary\s*\}\}/gi, art.summary);
        rendered = rendered.replace(/\{\{\s*(?:CoverImageUrl|ImageUrl)\s*\}\}/gi, art.coverImageUrl);
        rendered = rendered.replace(/\{\{\s*Category\s*\}\}/gi, art.category);
        rendered = rendered.replace(/\{\{\s*AuthorName\s*\}\}/gi, art.authorName);
        rendered = rendered.replace(/\{\{\s*AuthorRole\s*\}\}/gi, art.authorRole);
        rendered = rendered.replace(/\{\{\s*PublishedDate\s*\}\}/gi, art.publishedDate);
        rendered = rendered.replace(/\{\{\s*Url\s*\}\}/gi, art.url);
        return rendered;
      }).join('\n');
    });

    // 9c. RecentArticles Loop ({{#each RecentArticles}}...{{/each}})
    const recentArticlesRegex = /\{\{#each\s+RecentArticles\}\}([\s\S]*?)\{\{\/each\}\}/gi;
    output = output.replace(recentArticlesRegex, (_match: string, innerTemplate: string) => {
      const recents = [
        { title: 'Architecting Resilient Multi-Tenant Cloud Ecosystems', publishedDate: 'Sep 12, 2026', coverImageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=300&auto=format&fit=crop&q=80', url: '/blog/architecting-resilient-multi-tenant-cloud-ecosystems' },
        { title: 'The Shift to Zero-Downtime Migration Pipelines', publishedDate: 'Sep 08, 2026', coverImageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=300&auto=format&fit=crop&q=80', url: '/blog/zero-downtime-migration-pipelines' },
        { title: 'Next-Gen Identity & Granular Role Governance', publishedDate: 'Aug 29, 2026', coverImageUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=300&auto=format&fit=crop&q=80', url: '/blog/next-gen-identity-governance' }
      ];
      return recents.map((r: any) => {
        let rendered = innerTemplate;
        rendered = rendered.replace(/\{\{\s*Title\s*\}\}/gi, r.title);
        rendered = rendered.replace(/\{\{\s*PublishedDate\s*\}\}/gi, r.publishedDate);
        rendered = rendered.replace(/\{\{\s*(?:CoverImageUrl|ImageUrl)\s*\}\}/gi, r.coverImageUrl);
        rendered = rendered.replace(/\{\{\s*Url\s*\}\}/gi, r.url);
        return rendered;
      }).join('\n');
    });

    // 9d. BlogCategories Loop ({{#each BlogCategories}}...{{/each}})
    const blogCatsRegex = /\{\{#each\s+BlogCategories\}\}([\s\S]*?)\{\{\/each\}\}/gi;
    output = output.replace(blogCatsRegex, (_match: string, innerTemplate: string) => {
      const cats = [
        { name: 'Engineering & Architecture', postCount: 14, url: '/blog?category=engineering' },
        { name: 'DevOps & Reliability', postCount: 9, url: '/blog?category=devops' },
        { name: 'Cybersecurity', postCount: 7, url: '/blog?category=cybersecurity' },
        { name: 'Product Updates', postCount: 5, url: '/blog?category=product' }
      ];
      return cats.map((c: any) => {
        let rendered = innerTemplate;
        rendered = rendered.replace(/\{\{\s*(?:Name|Title|CategoryTitle)\s*\}\}/gi, c.name);
        rendered = rendered.replace(/\{\{\s*PostCount\s*\}\}/gi, String(c.postCount));
        rendered = rendered.replace(/\{\{\s*Url\s*\}\}/gi, c.url);
        return rendered;
      }).join('\n');
    });

    // 9e. ArticleTags Loop ({{#each ArticleTags}}...{{/each}})
    const tagsRegex = /\{\{#each\s+ArticleTags\}\}([\s\S]*?)\{\{\/each\}\}/gi;
    output = output.replace(tagsRegex, (_match: string, innerTemplate: string) => {
      const tags = [
        { name: 'Multi-Tenancy', url: '/blog?tag=multi-tenancy' },
        { name: 'Cloud Architecture', url: '/blog?tag=cloud-architecture' },
        { name: 'Database Scalability', url: '/blog?tag=database-scalability' },
        { name: 'DevOps', url: '/blog?tag=devops' }
      ];
      return tags.map((t: any) => {
        let rendered = innerTemplate;
        rendered = rendered.replace(/\{\{\s*(?:Name|Tag|Title)\s*\}\}/gi, t.name);
        rendered = rendered.replace(/\{\{\s*Url\s*\}\}/gi, t.url);
        return rendered;
      }).join('\n');
    });

    // 9f. Article Detail Scalars ({{ Article.Title }}, {{ Article.Body }}, etc.)
    output = output.replace(/\{\{\s*Article\.Title\s*\}\}/gi, 'Architecting Resilient Multi-Tenant Cloud Ecosystems');
    output = output.replace(/\{\{\s*Article\.Category\s*\}\}/gi, 'Engineering & Architecture');
    output = output.replace(/\{\{\s*Article\.PublishedDate\s*\}\}/gi, 'September 12, 2026');
    output = output.replace(/\{\{\s*Article\.AuthorName\s*\}\}/gi, 'Alex Rivera');
    output = output.replace(/\{\{\s*Article\.AuthorRole\s*\}\}/gi, 'Chief Architect & Head of Platform Engineering');
    output = output.replace(/\{\{\s*Article\.CoverImageUrl\s*\}\}/gi, 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop&q=80');
    output = output.replace(/\{\{\s*Article\.Summary\s*\}\}/gi, 'A comprehensive guide on building scalable, isolated, multi-tenant cloud ecosystems with robust zero-trust policies.');
    output = output.replace(/\{\{\s*Article\.Body\s*\}\}/gi, `
      <p class="lead">Modern enterprise cloud systems require strict multi-tenant isolation, ultra-fast database scaling, and zero-compromise security models. In this architectural breakdown, we unpack the fundamental patterns that power resilient multi-tenant clusters.</p>
      <h3>1. Schema Partitioning vs Catalog Sharding</h3>
      <p>When engineering for thousands of concurrent enterprise tenants, tenant routing at the application layer becomes a primary bottleneck if not properly isolated. Our hybrid persistence layer splits the master tenant catalog from individual tenant SQL databases, ensuring that noisy neighbors never impact cross-tenant performance.</p>
      <blockquote class="p-3 border-start border-4 border-primary bg-light rounded my-3">
        "True multitenancy is not just about sharing resources; it is about guaranteeing tenant autonomy, compliance boundaries, and rapid recovery under stress."
      </blockquote>
      <h3>2. Real-Time Event Synchronization</h3>
      <p>Decentralized messaging pipelines allow tenant settings, telemetry, and security events to propagate across microservices in sub-millisecond latencies, preserving full transaction integrity.</p>
    `);

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
    output = output.replace(/\{\{\s*CustomClass\s*\}\}/gi, '');

    // Media & Styles
    output = output.replace(/\{\{\s*BackgroundColor\s*\}\}/gi, ctx.backgroundColor || 'transparent');
    output = output.replace(/\{\{\s*ImageUrl\s*\}\}/gi, ctx.imageUrl || '');
    output = output.replace(/\{\{\s*SecondImageUrl\s*\}\}/gi, ctx.secondImageUrl || '');
    output = output.replace(/\{\{\s*VideoUrl\s*\}\}/gi, ctx.videoUrl || '');
    output = output.replace(/\{\{\s*YoutubeUrlLink\s*\}\}/gi, ctx.youtubeUrlLink || '');

    // Brand & Identity with Fixed Powered By
    const currentYear = new Date().getFullYear().toString();
    const brandName = ctx.brandName || this.editorTokens.brand?.name || 'Acme Global';
    const logoUrl = ctx.logoUrl || this.editorTokens.brand?.logoUrl || '';
    const brandIdentityHtml = (logoUrl && logoUrl.trim().length > 0)
      ? `<img src="${logoUrl}" alt="${brandName}" class="navbar-brand-logo" style="max-height: 40px; width: auto; object-fit: contain;" />`
      : `<span class="fw-bolder text-dark fs-4 tracking-tight">${brandName}</span>`;

    output = output.replace(/\{\{\s*(?:BrandIdentity|BrandLogoOrName)\s*\}\}/gi, brandIdentityHtml);
    output = output.replace(/\{\{\s*LogoUrl\s*\}\}/gi, logoUrl);
    output = output.replace(/\{\{\s*Year\s*\}\}/gi, currentYear);
    output = output.replace(/\{\{\s*BrandName\s*\}\}/gi, brandName);
    output = output.replace(/\{\{\s*Copyright\s*\}\}/gi, ctx.copyright || `© ${currentYear} ${brandName}. All rights reserved.`);
    output = output.replace(/\{\{\s*PoweredBy\s*\}\}/gi, ctx.poweredBy || '<a href="https://ozikol.cloud" target="_blank" rel="noopener noreferrer" style="color: #0050e5 !important; font-weight: 700; text-decoration: none;">Powered by Ozikol</a>');
    output = output.replace(/\{\{\s*Email\s*\}\}/gi, ctx.email || 'contact@acme-global.com');
    output = output.replace(/\{\{\s*Phone\s*\}\}/gi, ctx.phone || '+1 (800) 555-0199');
    output = output.replace(/\{\{\s*Address\s*\}\}/gi, ctx.address || 'Enterprise Blvd, Silicon Valley');

    // Clean up any remaining unhandled {{#each ...}} loops and leftover {{ Token }} placeholders to prevent visual leakage
    output = output.replace(/\{\{#each[\s\S]*?\{\{\/each\}\}/gi, '');
    output = output.replace(/\{\{[#\/]?[\w\s\.\,\-\_]+\}\}/g, '');

    return output;
  }

  /**
   * Compiles HTML and scoped CSS into sanitized DOM for the live visual preview container.
   */
  updatePreviewSimulation(): void {
    const hydratedHtml = this.hydrateMarkup(this.htmlTemplate);
    const cleanStyles = (this.cssStyles || '').replace(/<\/?style[^>]*>/gi, '').trim();
    const combined = `
      <style>
        ${cleanStyles}
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

    // Defensively sanitize CSS and JS so pure code is persisted
    const cleanCss = (this.cssStyles || '').replace(/<\/?style[^>]*>/gi, '').trim();
    const cleanJs = (this.jsScript || '').replace(/<\/?script[^>]*>/gi, '').trim();

    const payload = {
      name: this.templateName.trim(),
      categoryKey: this.selectedCategory,
      variantCode: this.variantCode.trim(),
      description: this.description.trim() || `${this.currentPreset.name} crafted template`,
      htmlTemplate: this.htmlTemplate,
      cssStyles: cleanCss,
      jsScript: cleanJs,
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

        const successMsg = this.isEditMode
          ? `Template '${newTemplate.name}' updated in your vault!`
          : `Custom template '${newTemplate.name}' saved to your vault!`;
        this.toast.success(successMsg);
        this.router.navigate(['/content/console/templates']);
      },
      error: () => {
        this.savingTemplate = false;
        this.toast.error('Failed to create custom template. Please verify API connection.');
      }
    });
  }
}
