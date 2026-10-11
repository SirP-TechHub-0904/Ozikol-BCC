import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { UniversalPreviewModalService, TemplatePreviewPayload } from '../services/universal-preview-modal.service';
import { ContentHydrationService } from '../services/content-hydration.service';
import { HtmlAssemblerService } from '../services/html-assembler.service';

/**
 * Universal Single-Source-of-Truth Simulated Preview Modal for Ozikol CMS Templates.
 * Serves all 8 template categories across both the My Templates catalog and individual visual category studios.
 * Guarantees 100% pixel-for-pixel visual and hydration parity everywhere.
 */
@Component({
  selector: 'app-universal-preview-modal',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div
      class="universal-preview-backdrop"
      *ngIf="isOpen && payload"
      (click)="closeModal()"
    >
      <div class="universal-preview-dialog" (click)="$event.stopPropagation()">
        
        <!-- 1. Header Bar -->
        <div class="preview-modal-header">
          <div class="header-info-wrap">
            <div class="category-icon-box">
              <span class="material-symbols-outlined">{{ getCategoryIcon(payload.category) }}</span>
            </div>
            <div class="header-titles">
              <div class="title-meta-row">
                <h3 class="template-title">{{ payload.title || 'Template Section Preview' }}</h3>
                <span class="category-badge">
                  {{ getCategoryLabel(payload.category) }}
                </span>
                <code class="variant-code-pill" *ngIf="payload.variantCode">{{ payload.variantCode }}</code>
                <span class="version-pill" *ngIf="payload.version">v{{ payload.version }}</span>
              </div>
              <span class="sub-caption">
                Simulated Sandbox &bull; Isolated CSS & Tokens &bull; Realtime Viewport Evaluation
              </span>
            </div>
          </div>

          <!-- Header Actions -->
          <div class="header-actions-wrap">
            <!-- Viewport Switcher -->
            <div class="viewport-toggle-group">
              <button
                type="button"
                class="btn-vp"
                [class.active]="viewport === 'desktop'"
                (click)="viewport = 'desktop'"
                title="Desktop View (100% Width)"
              >
                <span class="material-symbols-outlined">desktop_windows</span>
                <span>Desktop (100%)</span>
              </button>
              <button
                type="button"
                class="btn-vp"
                [class.active]="viewport === 'tablet'"
                (click)="viewport = 'tablet'"
                title="Tablet View (768px Width)"
              >
                <span class="material-symbols-outlined">tablet_mac</span>
                <span>Tablet (768px)</span>
              </button>
              <button
                type="button"
                class="btn-vp"
                [class.active]="viewport === 'mobile'"
                (click)="viewport = 'mobile'"
                title="Mobile View (375px Width)"
              >
                <span class="material-symbols-outlined">smartphone</span>
                <span>Mobile (375px)</span>
              </button>
            </div>

            <!-- Refresh Preview -->
            <button
              type="button"
              class="btn-header-action"
              (click)="rehydrateAndAssemble()"
              title="Re-render & Refresh Preview"
            >
              <span class="material-symbols-outlined">refresh</span>
            </button>

            <!-- Jump to Visual Studio (if editUrl passed from Index) -->
            <a
              *ngIf="payload.editUrl"
              [routerLink]="payload.editUrl"
              (click)="closeModal()"
              class="btn btn-edit-studio"
              title="Open and edit this component in Visual Studio"
            >
              <span class="material-symbols-outlined">edit_note</span>
              <span>Edit Component</span>
            </a>

            <!-- Close Modal -->
            <button
              type="button"
              class="btn-close-modal"
              (click)="closeModal()"
              title="Close Preview (Esc)"
            >
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        <!-- 2. Menu Page Simulation Toolbar (Only for Navigation category) -->
        <div class="page-sim-toolbar" *ngIf="payload.category === 'menu'">
          <div class="sim-label">
            <span class="material-symbols-outlined">web</span>
            <span>Simulate Page Context:</span>
          </div>
          <div class="sim-pills">
            <button
              type="button"
              class="sim-pill"
              [class.active]="menuSimPage === 'isolated'"
              (click)="setMenuSimPage('isolated')"
            >
              <span>Isolated Navbar</span>
            </button>
            <button
              type="button"
              class="sim-pill"
              [class.active]="menuSimPage === 'home'"
              (click)="setMenuSimPage('home')"
            >
              <span>Home Page</span>
            </button>
            <button
              type="button"
              class="sim-pill"
              [class.active]="menuSimPage === 'about'"
              (click)="setMenuSimPage('about')"
            >
              <span>About Us</span>
            </button>
            <button
              type="button"
              class="sim-pill"
              [class.active]="menuSimPage === 'services'"
              (click)="setMenuSimPage('services')"
            >
              <span>Services</span>
            </button>
            <button
              type="button"
              class="sim-pill"
              [class.active]="menuSimPage === 'contact'"
              (click)="setMenuSimPage('contact')"
            >
              <span>Contact Us</span>
            </button>
          </div>
        </div>

        <!-- 3. Sandboxed Iframe Canvas -->
        <div class="preview-modal-body" [ngClass]="'viewport-' + viewport">
          <div class="preview-canvas-wrapper">
            <iframe
              class="preview-iframe"
              [srcdoc]="safeSrcDoc"
              title="Universal CMS Section Preview"
              sandbox="allow-scripts allow-same-origin"
            ></iframe>
          </div>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .universal-preview-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(10, 15, 29, 0.85);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      animation: ozFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes ozFadeIn {
      from { opacity: 0; transform: scale(0.98); }
      to { opacity: 1; transform: scale(1); }
    }

    .universal-preview-dialog {
      background: #0f172a;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 16px;
      box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.05);
      width: 100%;
      max-width: 1560px;
      height: 92vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      color: #f8fafc;
    }

    /* Header Bar */
    .preview-modal-header {
      background: #1e293b;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding: 14px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-shrink: 0;
    }

    .header-info-wrap {
      display: flex;
      align-items: center;
      gap: 14px;
      min-width: 0;
    }

    .category-icon-box {
      width: 42px;
      height: 42px;
      border-radius: 10px;
      background: linear-gradient(135deg, rgba(56, 189, 248, 0.15), rgba(99, 102, 241, 0.15));
      border: 1px solid rgba(56, 189, 248, 0.3);
      color: #38bdf8;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .category-icon-box .material-symbols-outlined {
      font-size: 24px;
    }

    .header-titles {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .title-meta-row {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .template-title {
      margin: 0;
      font-size: 16.5px;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: -0.2px;
    }

    .category-badge {
      background: rgba(56, 189, 248, 0.15);
      border: 1px solid rgba(56, 189, 248, 0.3);
      color: #38bdf8;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 2px 8px;
      border-radius: 6px;
    }

    .variant-code-pill {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #94a3b8;
      font-size: 11px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      padding: 2px 7px;
      border-radius: 6px;
    }

    .version-pill {
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.25);
      color: #34d399;
      font-size: 11px;
      font-weight: 600;
      padding: 2px 7px;
      border-radius: 6px;
    }

    .sub-caption {
      font-size: 11.5px;
      color: #64748b;
    }

    /* Actions */
    .header-actions-wrap {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-shrink: 0;
    }

    .viewport-toggle-group {
      display: flex;
      background: #0f172a;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 3px;
      gap: 2px;
    }

    .btn-vp {
      background: transparent;
      border: none;
      color: #94a3b8;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-vp .material-symbols-outlined {
      font-size: 16px;
    }

    .btn-vp:hover {
      color: #f8fafc;
      background: rgba(255, 255, 255, 0.05);
    }

    .btn-vp.active {
      background: #2563eb;
      color: #ffffff;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    }

    .btn-header-action {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #94a3b8;
      width: 36px;
      height: 36px;
      border-radius: 8px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-header-action:hover {
      color: #ffffff;
      background: rgba(255, 255, 255, 0.12);
    }

    .btn-edit-studio {
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      color: #ffffff;
      border: none;
      padding: 0 16px;
      height: 36px;
      border-radius: 8px;
      font-size: 12.5px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      text-decoration: none;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(37, 99, 235, 0.35);
      transition: all 0.15s ease;
    }

    .btn-edit-studio:hover {
      background: linear-gradient(135deg, #1d4ed8, #1e40af);
      transform: translateY(-1px);
    }

    .btn-close-modal {
      background: transparent;
      border: none;
      color: #64748b;
      width: 36px;
      height: 36px;
      border-radius: 8px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-close-modal:hover {
      background: rgba(239, 68, 68, 0.15);
      color: #ef4444;
    }

    /* Menu Simulation Toolbar */
    .page-sim-toolbar {
      background: #131d33;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      padding: 8px 20px;
      display: flex;
      align-items: center;
      gap: 14px;
      flex-shrink: 0;
    }

    .sim-label {
      font-size: 12px;
      font-weight: 600;
      color: #94a3b8;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .sim-label .material-symbols-outlined {
      font-size: 16px;
      color: #38bdf8;
    }

    .sim-pills {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }

    .sim-pill {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #94a3b8;
      padding: 4px 11px;
      border-radius: 6px;
      font-size: 11.5px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .sim-pill:hover {
      color: #f8fafc;
      background: rgba(255, 255, 255, 0.1);
    }

    .sim-pill.active {
      background: rgba(56, 189, 248, 0.15);
      border-color: rgba(56, 189, 248, 0.4);
      color: #38bdf8;
      font-weight: 600;
    }

    /* Modal Canvas */
    .preview-modal-body {
      flex: 1;
      min-height: 0;
      background: #020617;
      display: flex;
      align-items: stretch;
      justify-content: center;
      padding: 16px;
      overflow: auto;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .preview-canvas-wrapper {
      width: 100%;
      height: 100%;
      display: flex;
      background: #ffffff;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .viewport-tablet .preview-canvas-wrapper {
      width: 768px;
      margin: 0 auto;
      border-left: 1px solid rgba(255, 255, 255, 0.1);
      border-right: 1px solid rgba(255, 255, 255, 0.1);
    }

    .viewport-mobile .preview-canvas-wrapper {
      width: 375px;
      margin: 0 auto;
      border-left: 1px solid rgba(255, 255, 255, 0.1);
      border-right: 1px solid rgba(255, 255, 255, 0.1);
    }

    .preview-iframe {
      width: 100%;
      height: 100%;
      border: none;
      background: #ffffff;
      display: block;
    }
  `]
})
export class UniversalPreviewModalComponent implements OnInit, OnDestroy {
  isOpen: boolean = false;
  payload: TemplatePreviewPayload | null = null;
  viewport: 'desktop' | 'tablet' | 'mobile' = 'desktop';
  menuSimPage: 'isolated' | 'home' | 'about' | 'services' | 'contact' = 'isolated';
  safeSrcDoc: SafeHtml = '';

  private sub: Subscription = new Subscription();

  constructor(
    private modalService: UniversalPreviewModalService,
    private contentHydrator: ContentHydrationService,
    private htmlAssembler: HtmlAssemblerService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.sub.add(
      this.modalService.isOpen$.subscribe(open => {
        this.isOpen = open;
        if (!open) {
          this.safeSrcDoc = '';
        }
      })
    );

    this.sub.add(
      this.modalService.payload$.subscribe(payload => {
        this.payload = payload;
        this.viewport = 'desktop';
        this.menuSimPage = 'isolated';
        if (payload) {
          this.rehydrateAndAssemble();
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  @HostListener('window:keydown.escape')
  onEscape(): void {
    if (this.isOpen) {
      this.closeModal();
    }
  }

  closeModal(): void {
    this.modalService.close();
  }

  setMenuSimPage(slug: 'isolated' | 'home' | 'about' | 'services' | 'contact'): void {
    this.menuSimPage = slug;
    this.rehydrateAndAssemble();
  }

  /**
   * Rehydrates template tokens using the dedicated category hydrator
   * and compiles the final isolated HTML5 preview document.
   */
  rehydrateAndAssemble(): void {
    if (!this.payload) return;

    const p = this.payload;
    const cat = (p.category || 'body').toLowerCase().trim();

    // 1. Resolve effective sample context
    const context = this.buildEffectiveContext(cat, p);

    // 2. Perform Category-Scoped Hydration via ContentHydrationService
    const hydratedHtml = this.contentHydrator.hydrate(
      p.htmlTemplate || '',
      context,
      cat
    );

    // 3. Compile clean HTML5 document with suite styles, font injections, and reset CSS
    const assembledDoc = this.htmlAssembler.assembleSectionPreview({
      html: hydratedHtml,
      css: p.cssStyles || '',
      js: p.jsScript || '',
      category: cat,
      pageTitle: `${p.title || 'Section'} Preview`,
      codeInjections: p.codeInjections || [],
      suiteCode: p.suiteCode || 'suite_corporate'
    });

    this.safeSrcDoc = this.sanitizer.bypassSecurityTrustHtml(assembledDoc);
  }

  /**
   * Builds an expansive, reliable sample data payload for the requested category
   * if the caller did not supply full sampleContent.
   */
  private buildEffectiveContext(cat: string, p: TemplatePreviewPayload): any {
    const custom = p.sampleContent || {};

    switch (cat) {
      case 'breadcrumb':
      case 'breadcrumbs':
        return {
          ...custom,
          title: custom.title || p.title || 'Enterprise Architecture & Cloud Solutions',
          pageTitle: custom.pageTitle || custom.title || p.title || 'Enterprise Architecture & Cloud Solutions',
          subTitle: custom.subTitle || custom.miniTitle || 'Discover our cloud migration, microservices, and enterprise consulting frameworks.',
          miniTitle: custom.miniTitle || 'CORPORATE JOURNAL & INSIGHTS',
          description: custom.description || 'Discover our cloud migration, microservices, and enterprise consulting frameworks.',
          backgroundImageUrl: custom.backgroundImageUrl || 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
          breadcrumbs: custom.breadcrumbs || custom.trailItems || [
            { title: 'Home', url: '/', isActive: false },
            { title: 'Capabilities', url: '/capabilities', isActive: false },
            { title: custom.title || p.title || 'Enterprise Solutions', url: '', isActive: true }
          ]
        };

      case 'menu':
      case 'navigation':
      case 'navbar':
        return {
          ...custom,
          brandName: custom.brandName || 'Apex Global',
          brandLogo: custom.brandLogo || custom.logoUrl || '',
          logoUrl: custom.logoUrl || custom.brandLogo || '',
          homeUrl: custom.homeUrl || '/',
          hasTopBar: custom.hasTopBar ?? true,
          hasContactInfo: custom.hasContactInfo ?? true,
          hasSocialLinks: custom.hasSocialLinks ?? true,
          email: custom.email || 'contact@example.com',
          phone: custom.phone || '+1 (555) 019-2834',
          address: custom.address || '1200 Innovation Way, Suite 400',
          workingHours: custom.workingHours || 'Mon - Fri: 8:00 AM - 6:00 PM',
          loginUrl: custom.loginUrl || '/auth/login',
          loginText: custom.loginText || 'Sign In',
          topBarPages: custom.topBarPages || [
            { title: 'Support', url: '/support' },
            { title: 'Documentation', url: '/docs' }
          ],
          navigationMenu: custom.navigationMenu || [
            {
              title: 'Solutions',
              url: '/solutions',
              zone: 'first',
              isDropdown: true,
              pages: [
                { title: 'Cloud Infrastructure', url: '/solutions/cloud' },
                { title: 'Enterprise Security', url: '/solutions/security' }
              ]
            },
            { title: 'Platform', url: '/platform', zone: 'middle', isDropdown: false },
            { title: 'Company', url: '/company', zone: 'last', isDropdown: false }
          ],
          menuCtaButtons: custom.menuCtaButtons || [
            { title: 'Get Started', url: '/get-started', buttonClass: 'oz-btn-primary' }
          ],
          socialLinks: custom.socialLinks || [
            { platform: 'Twitter / X', title: 'Twitter / X', url: 'https://twitter.com', icon: 'share', iconClass: 'fa-brands fa-x-twitter' },
            { platform: 'LinkedIn', title: 'LinkedIn', url: 'https://linkedin.com', icon: 'public', iconClass: 'fa-brands fa-linkedin-in' },
            { platform: 'Facebook', title: 'Facebook', url: 'https://facebook.com', icon: 'thumb_up', iconClass: 'fa-brands fa-facebook' },
            { platform: 'Instagram', title: 'Instagram', url: 'https://instagram.com', icon: 'photo_camera', iconClass: 'fa-brands fa-instagram' }
          ],
          contactItems: custom.contactItems || [
            { type: 'phone', channelType: 'Phone', platform: 'Support', title: 'Call Us', description: 'Mon-Fri 8am-6pm', value: '+1 (555) 019-2834', content: '+1 (555) 019-2834', url: 'tel:+15550192834', icon: 'call', iconClass: 'fa-solid fa-phone', isDefault: true },
            { type: 'email', channelType: 'Email', platform: 'General', title: 'Email Us', description: 'Online Inquiries', value: 'contact@example.com', content: 'contact@example.com', url: 'mailto:contact@example.com', icon: 'mail', iconClass: 'fa-solid fa-envelope', isDefault: true },
            { type: 'address', channelType: 'Address', platform: 'HQ', title: 'Headquarters', description: 'Corporate Office', value: '1200 Innovation Way, Suite 400', content: '1200 Innovation Way, Suite 400', url: '#', icon: 'location_on', iconClass: 'fa-solid fa-location-dot', isDefault: true }
          ]
        };

      case 'hero':
      case 'herosection':
        return {
          ...custom,
          title: custom.title || p.title || 'Empower Your Global Enterprise with Autonomous Cloud Scale',
          miniTitle: custom.miniTitle || 'ENTERPRISE INFRASTRUCTURE PLATFORM',
          description: custom.description || 'Hardened cloud orchestration, sub-millisecond data replication, and continuous compliance for mission-critical workloads.',
          buttonText: custom.buttonText || 'Start Free Trial',
          buttonLink: custom.buttonLink || '/get-started',
          secondaryButtonText: custom.secondaryButtonText || 'Architecture Review',
          secondaryButtonLink: custom.secondaryButtonLink || '/contact',
          imageUrl: custom.imageUrl || 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop&q=80',
          secondImageUrl: custom.secondImageUrl || '',
          videoUrl: custom.videoUrl || '',
          pageSectionLists: custom.pageSectionLists || custom.items || [
            { title: 'Automated Failover', description: 'Zero downtime disaster recovery with geographic routing.', imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80', buttonText: 'Learn More', buttonLink: '/features' },
            { title: 'Sovereign Compliance', description: 'End-to-end data localization across 40+ cloud regions.', imageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&auto=format&fit=crop&q=80', buttonText: 'Explore Security', buttonLink: '/security' }
          ]
        };

      case 'footer':
        return {
          ...custom,
          brandName: custom.brandName || 'Apex Global',
          brandLogo: custom.brandLogo || custom.logoUrl || '',
          logoUrl: custom.logoUrl || custom.brandLogo || '',
          homeUrl: custom.homeUrl || '/',
          description: custom.description || 'Empowering global workloads with autonomous cloud resilience, sub-millisecond execution, and sovereign tenant governance.',
          hasContactInfo: custom.hasContactInfo ?? true,
          hasSocialLinks: custom.hasSocialLinks ?? true,
          email: custom.email || 'contact@example.com',
          phone: custom.phone || '+1 (555) 019-2834',
          address: custom.address || '1200 Innovation Way, Suite 400',
          workingHours: custom.workingHours || 'Mon - Fri: 8:00 AM - 6:00 PM',
          copyright: custom.copyright || '© 2026 Apex Global. All rights reserved.',
          footerCategories: custom.footerCategories || [
            { title: 'Solutions', pages: [{ title: 'Enterprise Cloud', url: '/cloud' }, { title: 'Edge Security', url: '/security' }, { title: 'Database Mesh', url: '/db' }] },
            { title: 'Company', pages: [{ title: 'About Us', url: '/about' }, { title: 'Leadership', url: '/leadership' }, { title: 'Careers', url: '/careers' }] },
            { title: 'Resources', pages: [{ title: 'Documentation', url: '/docs' }, { title: 'API Reference', url: '/api' }, { title: 'System Status', url: '/status' }] }
          ],
          legalPages: custom.legalPages || [
            { title: 'Privacy Policy', url: '/privacy-policy' },
            { title: 'Terms of Service', url: '/terms' },
            { title: 'Security & SLA', url: '/security' }
          ],
          socialLinks: custom.socialLinks || [
            { platform: 'Twitter / X', title: 'Twitter / X', url: 'https://x.com', icon: 'share', iconClass: 'fa-brands fa-x-twitter' },
            { platform: 'LinkedIn', title: 'LinkedIn', url: 'https://linkedin.com', icon: 'public', iconClass: 'fa-brands fa-linkedin-in' },
            { platform: 'Facebook', title: 'Facebook', url: 'https://facebook.com', icon: 'thumb_up', iconClass: 'fa-brands fa-facebook' },
            { platform: 'Instagram', title: 'Instagram', url: 'https://instagram.com', icon: 'photo_camera', iconClass: 'fa-brands fa-instagram' }
          ],
          contactItems: custom.contactItems || [
            { type: 'phone', channelType: 'Phone', platform: 'Support', title: 'Call Us', description: 'Mon-Fri 8am-6pm', value: '+1 (555) 019-2834', content: '+1 (555) 019-2834', url: 'tel:+15550192834', icon: 'call', iconClass: 'fa-solid fa-phone', isDefault: true },
            { type: 'email', channelType: 'Email', platform: 'General', title: 'Email Us', description: 'Online Inquiries', value: 'contact@example.com', content: 'contact@example.com', url: 'mailto:contact@example.com', icon: 'mail', iconClass: 'fa-solid fa-envelope', isDefault: true },
            { type: 'address', channelType: 'Address', platform: 'HQ', title: 'Headquarters', description: 'Corporate Office', value: '1200 Innovation Way, Suite 400', content: '1200 Innovation Way, Suite 400', url: '#', icon: 'location_on', iconClass: 'fa-solid fa-location-dot', isDefault: true }
          ]
        };

      case 'body':
      case 'bodysections':
      case 'cards':
        return {
          ...custom,
          title: custom.title || p.title || 'Architected for High-Throughput Performance',
          miniTitle: custom.miniTitle || 'MODULAR CAPABILITIES',
          description: custom.description || 'Engineered from the ground up to support ultra-low latency transaction processing and autonomous distributed compute.',
          imageUrl: custom.imageUrl || 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&auto=format&fit=crop&q=80',
          pageSectionLists: custom.pageSectionLists || custom.items || [
            { title: 'Data Security & Encryption', description: 'AES-256 in flight and at rest with hardware key vault isolation.', iconText: 'fa-solid fa-shield-halved' },
            { title: 'Elastic Horizontal Scaling', description: 'Dynamic pod auto-balancing supporting over 100,000 transactions/sec.', iconText: 'fa-solid fa-bolt' },
            { title: 'Global Telemetry Mesh', description: 'Real-time observability and crash tracing across hybrid cloud edges.', iconText: 'fa-solid fa-chart-line' }
          ]
        };

      case 'blog':
      case 'blog_detail':
        return {
          ...custom,
          title: custom.title || p.title || 'Platform Insights & Architectural Dispatches',
          miniTitle: custom.miniTitle || 'KNOWLEDGE BASE',
          description: custom.description || 'Deep dives, benchmarks, and engineering standards curated by our infrastructure team.',
          articles: custom.articles || [
            { title: 'Architecting Resilient Multi-Tenant Cloud Ecosystems', category: 'Architecture', publishedDate: 'Sep 12, 2026', coverImageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80', summary: 'Proven patterns for high-throughput tenant isolation and state synchronization.', url: '/blog/1' },
            { title: 'The Shift to Zero-Downtime Data Migration Pipelines', category: 'DevOps', publishedDate: 'Sep 08, 2026', coverImageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&auto=format&fit=crop&q=80', summary: 'How leading teams execute petabyte-scale database cutovers without dropped packets.', url: '/blog/2' }
          ],
          article: custom.article || {
            title: custom.title || p.title || 'Accelerating Enterprise Scalability with Hybrid Cloud Architecture',
            category: 'Technology & Cloud',
            publishedDate: 'September 14, 2026',
            readTime: '5 min read',
            coverImageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop&q=80',
            body: '<p class="lead">Organizations are increasingly challenged to balance agility, resilience, and operational security.</p><p>By transitioning toward unified hybrid cloud infrastructures, forward-thinking enterprises establish a modular foundation capable of horizontal scaling.</p>',
            tags: ['Cloud Architecture', 'Security', 'Scalability'],
            authorName: 'Dr. Jennifer Miller',
            authorRole: 'Principal Cloud Strategist'
          }
        };

      default:
        return {
          ...custom,
          title: custom.title || p.title || 'Section Preview',
          miniTitle: custom.miniTitle || 'SECTION',
          description: custom.description || 'Dynamic CMS section component preview.',
          ...custom
        };
    }
  }

  getCategoryIcon(category?: string): string {
    const c = (category || '').toLowerCase();
    switch (c) {
      case 'menu': return 'menu';
      case 'hero': return 'view_carousel';
      case 'breadcrumb': return 'linear_scale';
      case 'footer': return 'call_to_action';
      case 'body': return 'view_quilt';
      case 'blog': return 'newspaper';
      case 'blog_detail': return 'article';
      default: return 'visibility';
    }
  }

  getCategoryLabel(category?: string): string {
    const c = (category || '').toLowerCase();
    switch (c) {
      case 'menu': return 'Navigation Menu';
      case 'hero': return 'Hero Banner';
      case 'breadcrumb': return 'Breadcrumb Banner';
      case 'footer': return 'Footer';
      case 'body': return 'Body Section';
      case 'blog': return 'Blog Feed';
      case 'blog_detail': return 'Blog Detail';
      default: return category ? (category.charAt(0).toUpperCase() + category.slice(1)) : 'Section';
    }
  }
}
