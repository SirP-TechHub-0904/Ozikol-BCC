import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VisualEditorComponent } from '../../visual-editor/visual-editor.component';
import { ApiService } from '../../../../../../core/services/api.service';
import { ToastService } from '../../../../../../core/services/toast.service';

/**
 * Dedicated category studio component for creating and editing Navigation (Navbar) section templates.
 * Enforces the approved 3-zone architecture (Top utility bar, First/Middle/Last nav zones, CTA buttons, and Dynamic Login).
 */
@Component({
  selector: 'app-menu-visual',
  standalone: true,
  imports: [CommonModule, FormsModule, VisualEditorComponent],
  template: `
    <div class="category-visual-layout">
      <!-- Category Meta Card: Name, Variant Code, and Save Action -->
      <div class="category-meta-bar">
        <div class="meta-left">
          <div class="category-badge">
            <span class="material-symbols-outlined">menu</span>
            <span>Navigation Studio</span>
          </div>

          <div class="meta-input-group">
            <label class="meta-label">Template Name</label>
            <input
              type="text"
              class="meta-input"
              [(ngModel)]="templateName"
              placeholder="e.g. Classic Light Corporate Navbar"
            />
          </div>

          <div class="meta-input-group">
            <label class="meta-label">Variant Code</label>
            <input
              type="text"
              class="meta-input code-input"
              [(ngModel)]="variantCode"
              readonly
            />
          </div>
        </div>

        <div class="meta-right">
          <button
            type="button"
            class="btn-save-template"
            [disabled]="isSaving"
            (click)="saveNavigationTemplate()"
          >
            <span class="material-symbols-outlined" *ngIf="!isSaving">check_circle</span>
            <span class="material-symbols-outlined spin" *ngIf="isSaving">sync</span>
            <span>{{ isSaving ? 'Saving...' : (isEditMode ? 'Update Navigation' : 'Save Navigation') }}</span>
          </button>
        </div>
      </div>

      <!-- Core Reusable Visual Editor with Div and CSS Folding -->
      <app-visual-editor
        [category]="'menu'"
        [categoryName]="'Navigation'"
        [htmlTemplate]="htmlTemplate"
        [cssStyles]="cssStyles"
        [jsScript]="jsScript"
        [sampleContent]="sampleContent"
        [specificTokens]="navigationTokens"
        [isEditMode]="isEditMode"
        [editorTokens]="editorTokens"
        (htmlTemplateChange)="htmlTemplate = $event"
        (cssStylesChange)="cssStyles = $event"
        (jsScriptChange)="jsScript = $event"
        (sampleContentChange)="sampleContent = $event"
      ></app-visual-editor>
    </div>
  `,
  styles: [`
    .category-visual-layout {
      display: flex;
      flex-direction: column;
      gap: 16px;
      height: 100%;
    }

    .category-meta-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 20px;
      background-color: #1e293b;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 10px;
      flex-wrap: wrap;
      gap: 16px;
    }

    .meta-left {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }

    .category-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background-color: rgba(56, 189, 248, 0.12);
      border: 1px solid rgba(56, 189, 248, 0.25);
      color: #38bdf8;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;

      span.material-symbols-outlined { font-size: 16px; }
    }

    .meta-input-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .meta-label {
      font-size: 11px;
      font-weight: 600;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .meta-input {
      background-color: #0f172a;
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #ffffff;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 13px;
      min-width: 240px;
      outline: none;

      &:focus {
        border-color: #38bdf8;
        box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2);
      }
    }

    .code-input {
      min-width: 160px;
      color: #38bdf8;
      font-family: 'Fira Code', monospace;
      background-color: rgba(15, 23, 42, 0.6);
    }

    .btn-save-template {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 20px;
      background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
      color: #ffffff;
      border: none;
      border-radius: 8px;
      font-size: 13.5px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(2, 132, 199, 0.3);
      transition: all 0.15s ease;

      span.material-symbols-outlined { font-size: 18px; }

      &:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 6px 16px rgba(2, 132, 199, 0.45);
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .spin { animation: spin 1s linear infinite; }
  `]
})
export class MenuVisualComponent implements OnInit {
  @Input() isEditMode: boolean = false;
  @Input() existingTemplateId?: string;
  @Input() editorTokens: any = null;

  @Output() templateSaved = new EventEmitter<any>();

  templateName: string = 'Classic Light Corporate Navbar';
  variantCode: string = 'MENU_CL_9821A';
  isSaving: boolean = false;

  // The Approved 3-Zone Menu Default HTML Template
  htmlTemplate: string = `<header class="oz-nav-section {{ CustomClass }}">
  {{#if HasTopBar}}
  <!-- Top Utility Bar -->
  <div class="oz-top-bar">
    <div class="oz-nav-container oz-top-bar-inner">
      {{#if HasContactInfo}}
      <div class="oz-top-contact">
        {{#if Email}}<a href="mailto:{{ Email }}" class="oz-top-item"><span class="oz-top-icon">✉</span> {{ Email }}</a>{{/if}}
        {{#if Phone}}<a href="tel:{{ Phone }}" class="oz-top-item"><span class="oz-top-icon">✆</span> {{ Phone }}</a>{{/if}}
        {{#if Address}}<span class="oz-top-item oz-top-address"><span class="oz-top-icon">📍</span> {{ Address }}</span>{{/if}}
      </div>
      {{/if}}
      <div class="oz-top-links">
        {{#each TopBarPages}}
          <a href="{{ Url }}" class="oz-top-link {{ CustomClass }}">{{ Title }}</a>
        {{/each}}
      </div>
    </div>
  </div>
  {{/if}}

  <!-- Main Navigation Bar -->
  <nav class="oz-main-navbar">
    <div class="oz-nav-container oz-navbar-inner">
      <!-- Col 1: Brand / Logo -->
      <a class="oz-navbar-brand" href="{{ HomeUrl }}">
        {{#if BrandLogo}}
          <img src="{{ BrandLogo }}" alt="{{ BrandName }}" class="oz-brand-logo" />
        {{else}}
          <span class="oz-brand-text">{{ BrandName }}</span>
        {{/if}}
      </a>

      <!-- Mobile Hamburger Toggler -->
      <button class="oz-nav-toggler" type="button" aria-label="Toggle navigation" aria-expanded="false">
        <span class="oz-toggler-bar"></span>
        <span class="oz-toggler-bar"></span>
        <span class="oz-toggler-bar"></span>
      </button>

      <!-- Col 2: Navigation Links Drawer -->
      <div class="oz-nav-drawer" id="ozNavDrawer">
        <!-- Zone 1 & 2: Primary Navigation Links -->
        <ul class="oz-nav-menu">
          {{#each NavItems="first"}}
            {{#if IsDropdown}}
              <li class="oz-nav-item oz-dropdown {{ CustomClass }}">
                <a class="oz-nav-link oz-dropdown-toggle" href="{{ Url }}" role="button" aria-expanded="false">
                  <span>{{ Title }}</span>
                  <svg class="oz-caret" width="10" height="6" viewBox="0 0 10 6" fill="currentColor"><path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>
                </a>
                <ul class="oz-dropdown-menu">
                  {{#each Pages}}
                    <li class="oz-dropdown-item {{ CustomClass }}"><a class="oz-dropdown-link" href="{{ Url }}">{{ Title }}</a></li>
                  {{/each}}
                </ul>
              </li>
            {{else}}
              <li class="oz-nav-item {{ CustomClass }}"><a class="oz-nav-link" href="{{ Url }}">{{ Title }}</a></li>
            {{/if}}
          {{/each}}

          {{#each NavItems="middle"}}
            {{#if IsDropdown}}
              <li class="oz-nav-item oz-dropdown {{ CustomClass }}">
                <a class="oz-nav-link oz-dropdown-toggle" href="{{ Url }}" role="button" aria-expanded="false">
                  <span>{{ Title }}</span>
                  <svg class="oz-caret" width="10" height="6" viewBox="0 0 10 6" fill="currentColor"><path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>
                </a>
                <ul class="oz-dropdown-menu">
                  {{#each Pages}}
                    <li class="oz-dropdown-item {{ CustomClass }}"><a class="oz-dropdown-link" href="{{ Url }}">{{ Title }}</a></li>
                  {{/each}}
                </ul>
              </li>
            {{else}}
              <li class="oz-nav-item {{ CustomClass }}"><a class="oz-nav-link" href="{{ Url }}">{{ Title }}</a></li>
            {{/if}}
          {{/each}}

          {{#each NavItems="last"}}
            {{#if IsDropdown}}
              <li class="oz-nav-item oz-dropdown {{ CustomClass }}">
                <a class="oz-nav-link oz-dropdown-toggle" href="{{ Url }}" role="button" aria-expanded="false">
                  <span>{{ Title }}</span>
                  <svg class="oz-caret" width="10" height="6" viewBox="0 0 10 6" fill="currentColor"><path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>
                </a>
                <ul class="oz-dropdown-menu">
                  {{#each Pages}}
                    <li class="oz-dropdown-item {{ CustomClass }}"><a class="oz-dropdown-link" href="{{ Url }}">{{ Title }}</a></li>
                  {{/each}}
                </ul>
              </li>
            {{else}}
              <li class="oz-nav-item {{ CustomClass }}"><a class="oz-nav-link" href="{{ Url }}">{{ Title }}</a></li>
            {{/if}}
          {{/each}}

          <!-- Dynamic Login Trigger -->
          {{#if ActivateLoginInMenu}}
          <li class="oz-nav-item oz-nav-login-item">
            <a href="{{ LoginUrl }}" class="oz-nav-link oz-nav-login-link">{{ LoginText }}</a>
          </li>
          {{/if}}
        </ul>

        <!-- Col 3: Header Call-to-Action Buttons -->
        <div class="oz-nav-actions">
          {{#each MenuCtaButtons}}
            <a href="{{ Url }}" class="oz-nav-btn {{ ButtonClass }} {{ CustomClass }}">
              {{ Title }}
            </a>
          {{/each}}
        </div>
      </div>
    </div>
  </nav>
</header>`;

  // The Approved 100% Framework-Independent Navigation Scoped CSS
  cssStyles: string = `/* ==========================================================================
 * PURE CUSTOM RESPONSIVE NAVIGATION SECTION
 * 100% Framework-Independent (No Bootstrap / Tailwind required)
 * ========================================================================== */

.oz-nav-section {
  --oz-primary: #0050e5;
  --oz-primary-hover: #003bb5;
  --oz-text: #1e293b;
  --oz-text-muted: #64748b;
  --oz-bg: #ffffff;
  --oz-border: #e2e8f0;
  --oz-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.06);
  
  position: sticky;
  top: 0;
  z-index: 1000;
  background-color: var(--oz-bg);
  box-shadow: var(--oz-shadow);
  border-bottom: 1px solid var(--oz-border);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  box-sizing: border-box;
}

.oz-nav-section *, .oz-nav-section *::before, .oz-nav-section *::after {
  box-sizing: border-box;
}

.oz-nav-section .oz-nav-container {
  max-width: 1240px;
  margin: 0 auto;
  padding: 0 24px;
  width: 100%;
}

/* --- Top Utility Bar --- */
.oz-nav-section .oz-top-bar {
  background-color: #f8fafc;
  border-bottom: 1px solid var(--oz-border);
  font-size: 12.5px;
  color: var(--oz-text-muted);
  padding: 6px 0;
}
.oz-nav-section .oz-top-bar-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}
.oz-nav-section .oz-top-contact,
.oz-nav-section .oz-top-links {
  display: flex;
  align-items: center;
  gap: 16px;
}
.oz-nav-section .oz-top-item,
.oz-nav-section .oz-top-link {
  color: var(--oz-text-muted);
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: color 0.15s ease;
}
.oz-nav-section .oz-top-link:hover {
  color: var(--oz-primary);
}
.oz-nav-section .oz-top-icon {
  font-size: 13px;
  opacity: 0.8;
}

/* --- Main Navigation Bar --- */
.oz-nav-section .oz-main-navbar {
  padding: 14px 0;
}
.oz-nav-section .oz-navbar-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* --- Brand / Logo --- */
.oz-nav-section .oz-navbar-brand {
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  color: var(--oz-text);
  font-weight: 700;
  font-size: 20px;
  letter-spacing: -0.02em;
}
.oz-nav-section .oz-brand-logo {
  max-height: 38px;
  width: auto;
  object-fit: contain;
}

/* --- Mobile Hamburger Toggler --- */
.oz-nav-section .oz-nav-toggler {
  display: none;
  flex-direction: column;
  justify-content: space-between;
  width: 32px;
  height: 22px;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  z-index: 1001;
}
.oz-nav-section .oz-toggler-bar {
  display: block;
  width: 100%;
  height: 2.5px;
  background-color: var(--oz-text);
  border-radius: 2px;
  transition: transform 0.25s ease, opacity 0.25s ease;
}
.oz-nav-section .oz-nav-toggler.active .oz-toggler-bar:nth-child(1) {
  transform: translateY(9.5px) rotate(45deg);
}
.oz-nav-section .oz-nav-toggler.active .oz-toggler-bar:nth-child(2) {
  opacity: 0;
}
.oz-nav-section .oz-nav-toggler.active .oz-toggler-bar:nth-child(3) {
  transform: translateY(-9.5px) rotate(-45deg);
}

/* --- Nav Menu & Links (Desktop) --- */
.oz-nav-section .oz-nav-drawer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 1;
  margin-left: 36px;
}
.oz-nav-section .oz-nav-menu {
  display: flex;
  align-items: center;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: 4px;
}
.oz-nav-section .oz-nav-item {
  position: relative;
}
.oz-nav-section .oz-nav-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-size: 14.5px;
  font-weight: 600;
  color: var(--oz-text);
  text-decoration: none;
  border-radius: 8px;
  transition: all 0.15s ease;
}
.oz-nav-section .oz-nav-link:hover,
.oz-nav-section .oz-nav-item:hover > .oz-nav-link,
.oz-nav-section .oz-dropdown.active > .oz-nav-link {
  color: var(--oz-primary);
  background-color: rgba(0, 80, 229, 0.05);
}
.oz-nav-section .oz-caret {
  transition: transform 0.2s ease;
}
.oz-nav-section .oz-dropdown:hover .oz-caret,
.oz-nav-section .oz-dropdown.active .oz-caret {
  transform: rotate(180deg);
}

/* --- Dynamic Login Link --- */
.oz-nav-section .oz-nav-login-link {
  color: var(--oz-primary);
  border: 1px solid rgba(0, 80, 229, 0.25);
  background-color: rgba(0, 80, 229, 0.04);
}
.oz-nav-section .oz-nav-login-link:hover {
  color: #ffffff;
  background-color: var(--oz-primary);
  border-color: var(--oz-primary);
}

/* --- Dropdown Menus (Desktop) --- */
.oz-nav-section .oz-dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  min-width: 200px;
  background-color: #ffffff;
  border: 1px solid var(--oz-border);
  border-radius: 12px;
  box-shadow: 0 14px 35px -4px rgba(15, 23, 42, 0.12), 0 4px 12px -2px rgba(15, 23, 42, 0.05);
  padding: 6px;
  margin: 8px 0 0 0;
  list-style: none;
  opacity: 0;
  visibility: hidden;
  transform: translateY(8px);
  transition: opacity 0.2s ease, transform 0.2s ease, visibility 0.2s;
  pointer-events: none;
  z-index: 1000;
}
.oz-nav-section .oz-dropdown:hover > .oz-dropdown-menu,
.oz-nav-section .oz-dropdown.active > .oz-dropdown-menu {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
  pointer-events: auto;
}
.oz-nav-section .oz-dropdown-item {
  list-style: none;
  margin: 0;
  padding: 0;
}
.oz-nav-section .oz-dropdown-link {
  display: block;
  padding: 8px 14px;
  font-size: 13.5px;
  font-weight: 500;
  color: var(--oz-text);
  text-decoration: none;
  border-radius: 6px;
  transition: all 0.15s ease;
}
.oz-nav-section .oz-dropdown-link:hover {
  color: var(--oz-primary);
  background-color: #f1f5f9;
  transform: translateX(3px);
}

/* --- CTA Action Buttons --- */
.oz-nav-section .oz-nav-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
}
.oz-nav-section .oz-nav-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 18px;
  font-size: 13.5px;
  font-weight: 600;
  border-radius: 9999px;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s ease;
  line-height: 1.4;
  border: 1px solid transparent;
}
.oz-nav-section .oz-btn-primary {
  background-color: var(--oz-primary);
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(0, 80, 229, 0.25);
}
.oz-nav-section .oz-btn-primary:hover {
  background-color: var(--oz-primary-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 80, 229, 0.35);
}

/* ==========================================================================
 * Responsive Mobile Breakpoints (< 992px)
 * ========================================================================== */
@media (max-width: 991.98px) {
  .oz-nav-section .oz-top-bar {
    display: none;
  }
  .oz-nav-section .oz-nav-toggler {
    display: flex;
  }
  .oz-nav-section .oz-nav-drawer {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background-color: #ffffff;
    border-bottom: 1px solid var(--oz-border);
    box-shadow: 0 16px 30px rgba(15, 23, 42, 0.1);
    flex-direction: column;
    align-items: stretch;
    padding: 16px 24px 24px;
    margin: 0;
    opacity: 0;
    visibility: hidden;
    transform: translateY(-10px);
    transition: opacity 0.25s ease, transform 0.25s ease, visibility 0.25s;
    pointer-events: none;
    max-height: calc(100vh - 70px);
    overflow-y: auto;
  }
  .oz-nav-section .oz-nav-drawer.active {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
    pointer-events: auto;
  }
  .oz-nav-section .oz-nav-menu {
    flex-direction: column;
    align-items: stretch;
    gap: 2px;
    width: 100%;
  }
  .oz-nav-section .oz-nav-link {
    justify-content: space-between;
    padding: 12px 14px;
    font-size: 15px;
    border-bottom: 1px solid #f8fafc;
  }
  .oz-nav-section .oz-nav-login-link {
    justify-content: center;
    margin-top: 8px;
    border-bottom: none;
  }
  .oz-nav-section .oz-dropdown-menu {
    position: static;
    opacity: 1;
    visibility: visible;
    transform: none;
    pointer-events: auto;
    box-shadow: none;
    border: none;
    background-color: #f8fafc;
    border-radius: 8px;
    margin: 4px 0 8px;
    padding: 6px;
    display: none;
  }
  .oz-nav-section .oz-dropdown.active .oz-dropdown-menu {
    display: block;
  }
  .oz-nav-section .oz-dropdown-link {
    padding: 10px 14px;
  }
  .oz-nav-section .oz-nav-actions {
    flex-direction: column;
    align-items: stretch;
    width: 100%;
    margin-top: 18px;
    gap: 10px;
  }
  .oz-nav-section .oz-nav-btn {
    width: 100%;
    padding: 12px 16px;
    font-size: 14.5px;
  }
}`;

  // Bespoke Vanilla JS for Responsive Drawer Toggler and Mobile Dropdowns
  jsScript: string = `document.addEventListener('DOMContentLoaded', function() {
  const toggler = document.querySelector('.oz-nav-toggler');
  const drawer = document.getElementById('ozNavDrawer');
  
  if (toggler && drawer) {
    toggler.addEventListener('click', function() {
      toggler.classList.toggle('active');
      drawer.classList.toggle('active');
    });
  }

  // Mobile Dropdown Click Accordion
  const dropdownToggles = document.querySelectorAll('.oz-dropdown-toggle');
  dropdownToggles.forEach(function(toggle) {
    toggle.addEventListener('click', function(e) {
      if (window.innerWidth < 992) {
        e.preventDefault();
        const parent = toggle.closest('.oz-dropdown');
        if (parent) {
          parent.classList.toggle('active');
        }
      }
    });
  });
});`;

  // Realistic sampleContent for preview
  sampleContent: any = {
    brandName: 'Acme Global',
    email: 'contact@acme-global.com',
    phone: '+1 (800) 555-0199',
    address: '100 Silicon Way, Tech Park, Suite 400',
    buttonText: 'Get Started',
    buttonLink: '/get-started',
    topBarPages: [
      { title: 'Support Desk', url: '/support' },
      { title: 'Documentation', url: '/docs' },
      { title: 'Client Portal', url: '/portal' }
    ],
    navItemsFirst: [
      { title: 'Home', url: '/' },
      {
        title: 'About Us',
        url: '/about',
        isDropdown: true,
        pages: [
          { title: 'Leadership Team', url: '/about/team' },
          { title: 'Corporate Mission', url: '/about/mission' }
        ]
      }
    ],
    navItemsMiddle: [
      {
        title: 'Services',
        url: '/services',
        isDropdown: true,
        pages: [
          { title: 'Enterprise Advisory', url: '/services/advisory' },
          { title: 'Cloud Engineering', url: '/services/cloud' },
          { title: 'Cybersecurity', url: '/services/security' }
        ]
      },
      { title: 'Solutions', url: '/solutions' }
    ],
    navItemsLast: [
      { title: 'Career', url: '/careers' },
      { title: 'Contact Us', url: '/contact' }
    ],
    menuCtaButtons: [
      { title: 'Get Started', url: '/get-started', buttonClass: 'oz-btn-primary' }
    ]
  };

  // Specific Handlebars tokens available for insertion in the HTML editor
  navigationTokens: Array<{ label: string; token: string }> = [
    { label: 'Brand Identity', token: '{{ BrandIdentity }}' },
    { label: 'Top Bar Condition', token: '{{#if HasTopBar}}...{{/if}}' },
    { label: 'Top Bar Pages Loop', token: '{{#each TopBarPages}}<a href="{{ Url }}">{{ Title }}</a>{{/each}}' },
    { label: 'Zone 1 NavItems', token: '{{#each NavItems="first"}}{{/each}}' },
    { label: 'Zone 2 NavItems', token: '{{#each NavItems="middle"}}{{/each}}' },
    { label: 'Zone 3 NavItems', token: '{{#each NavItems="last"}}{{/each}}' },
    { label: 'Dropdown Loop', token: '{{#each MenuDropdowns}}...{{/each}}' },
    { label: 'CTA Buttons Loop', token: '{{#each MenuCtaButtons}}...{{/each}}' },
    { label: 'Login Trigger', token: '{{#if ActivateLoginInMenu}}<a href="{{ LoginUrl }}">{{ LoginText }}</a>{{/if}}' }
  ];

  constructor(
    private api: ApiService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    if (this.isEditMode && this.existingTemplateId) {
      this.loadExistingTemplate();
    }
  }

  /**
   * Loads existing template data from the API when in edit mode.
   */
  private loadExistingTemplate(): void {
    if (!this.existingTemplateId) return;
    this.api.get<any>(`ContentApi/templates/${this.existingTemplateId}`).subscribe({
      next: (res: any) => {
        const item = res?.data || res;
        if (item) {
          this.templateName = item.name || this.templateName;
          this.variantCode = item.variantCode || this.variantCode;
          this.htmlTemplate = item.htmlTemplate || this.htmlTemplate;
          this.cssStyles = item.cssStyles || this.cssStyles;
          this.jsScript = item.jsScript || this.jsScript;
          if (item.defaultContentJson) {
            try {
              this.sampleContent = JSON.parse(item.defaultContentJson);
            } catch {
              // Ignore invalid JSON
            }
          }
        }
      },
      error: (err: any) => {
        console.warn('Could not load existing template:', err);
      }
    });
  }

  /**
   * Saves or updates the navigation template via API.
   */
  saveNavigationTemplate(): void {
    const name = (this.templateName || '').trim();
    if (!name) {
      this.toast.warning('Please enter a template name.');
      return;
    }

    this.isSaving = true;
    const payload = {
      name,
      category: 'menu',
      variantCode: this.variantCode,
      htmlTemplate: this.htmlTemplate,
      cssStyles: this.cssStyles,
      jsScript: this.jsScript,
      defaultContentJson: JSON.stringify(this.sampleContent),
      version: '1.0.0'
    };

    const endpoint = this.isEditMode && this.existingTemplateId
      ? this.api.put<any>(`ContentApi/templates/${this.existingTemplateId}`, payload)
      : this.api.post<any>('ContentApi/templates', payload);

    endpoint.subscribe({
      next: (res: any) => {
        this.isSaving = false;
        this.toast.success(
          this.isEditMode
            ? `Successfully updated Navigation template "${name}".`
            : `Successfully created Navigation template "${name}".`
        );
        this.templateSaved.emit(res?.data || res);
      },
      error: (err: any) => {
        this.isSaving = false;
        const msg = err?.error?.message || err?.message || 'Failed to save navigation template.';
        this.toast.error(`Save error: ${msg}`);
      }
    });
  }
}
