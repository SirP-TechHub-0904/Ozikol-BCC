import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { ApiService } from '../../core/services/api.service';

/**
 * Unified authentication shell housing all auth child routes (Login, 2FA, Recovery Code, Reset Password, Registration).
 * Dynamically synchronizes with Admin Console Brand settings:
 * - Login Background Wallpaper (with curated high-res license-free fallback)
 * - Brand Logo (White or Standard)
 * - Headline, Subtitle, and Institutional Support Notes
 * - Official 'Powered by Ozikol' platform attribution
 */
@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="auth-viewport" [style.--auth-bg]="'url(' + activeBackground + ')'" [class.mode-centered]="isCentered">
      <!-- Ambient Backdrop Overlay -->
      <div class="auth-backdrop-overlay"></div>

      <!-- Floating Return to Home Button in Centered Mode -->
      <a routerLink="/" class="centered-return-home" *ngIf="isCentered" title="Return to Home">
        <span class="material-symbols-outlined">arrow_back</span>
        <span>Return to Home</span>
      </a>

      <div class="auth-split-layout">
        <!-- ============================================== -->
        <!-- LEFT PANEL: BRAND & ENTERPRISE SHOWCASE       -->
        <!-- ============================================== -->
        <aside class="auth-showcase-panel" *ngIf="!isCentered">
          <div class="showcase-content">
            <!-- Brand Identity Header -->
            <div class="showcase-header">
              <a routerLink="/" class="brand-link" title="Return to Home">
                <img 
                  *ngIf="displayLogo && !logoLoadFailed" 
                  [src]="displayLogo" 
                  [alt]="brandName || 'Workspace'" 
                  class="brand-logo-img" 
                  (error)="logoLoadFailed = true"
                />
                <span *ngIf="!displayLogo || logoLoadFailed" class="showcase-brand-name">
                  {{ brandName || 'Workspace' }}
                </span>
              </a>
            </div>

            <!-- Central Hero Narrative (Dynamic from Auth Settings) -->
            <div class="showcase-hero" *ngIf="displayChip || displayTitle || displayDescription">
              <div class="hero-chip" *ngIf="displayChip">
                <span class="material-symbols-outlined icon-chip">verified_user</span>
                <span>{{ displayChip }}</span>
              </div>
              <h1 class="hero-title" *ngIf="displayTitle">{{ displayTitle }}</h1>
              <p class="hero-description" *ngIf="displayDescription">{{ displayDescription }}</p>
            </div>

            <!-- Showcase Footer -->
            <div class="showcase-footer">
              <a routerLink="/" class="btn-return-home" title="Return to Home">
                <span class="material-symbols-outlined">arrow_back</span>
                <span>Return to Home</span>
              </a>
              <div class="footer-meta">
                <span class="powered-by-tag">
                  Powered by <a href="https://ozikol.cloud" target="_blank" rel="noopener noreferrer">Ozikol</a>
                </span>
              </div>
            </div>
          </div>
        </aside>

        <!-- ============================================== -->
        <!-- RIGHT / CENTERED PANEL: CHILD ROUTE OUTLET     -->
        <!-- ============================================== -->
        <main class="auth-form-panel">
          <div class="form-panel-scroll">
            <div class="form-wrapper">
              <!-- Routed Auth View (Login, 2FA, Reset Password, Register) -->
              <router-outlet></router-outlet>

              <!-- Universal Form Footer Note & Powered by Ozikol -->
              <div class="form-footer-meta">
                <p class="auth-terms-note" *ngIf="displayFooterNote">{{ displayFooterNote }}</p>
                <div class="powered-by-row">
                  <span>Powered by <a href="https://ozikol.cloud" target="_blank" rel="noopener noreferrer">Ozikol</a></span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100vw;
      height: 100vh;
      max-height: 100vh;
      overflow: hidden;
      background: #090d16;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .auth-viewport {
      position: relative;
      width: 100vw;
      height: 100vh;
      max-height: 100vh;
      overflow: hidden;
      background-image: var(--auth-bg);
      background-size: cover;
      background-position: center center;
      background-repeat: no-repeat;
      display: flex;
    }

    .auth-backdrop-overlay {
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 15% 25%, rgba(15, 23, 42, 0.7) 0%, rgba(15, 23, 42, 0.88) 100%);
      backdrop-filter: blur(5px);
      -webkit-backdrop-filter: blur(5px);
      z-index: 1;
    }

    .auth-split-layout {
      position: relative;
      z-index: 2;
      width: 100%;
      height: 100vh;
      max-height: 100vh;
      overflow: hidden;
      display: grid;
      grid-template-columns: 1.1fr 0.9fr;
    }

    /* ---------------------------------------------------- */
    /* LEFT PANEL: SHOWCASE                                 */
    /* ---------------------------------------------------- */
    .auth-showcase-panel {
      position: relative;
      height: 100vh;
      max-height: 100vh;
      padding: 48px 56px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      border-right: 1px solid rgba(255, 255, 255, 0.1);
      box-sizing: border-box;
      overflow: hidden;
    }

    .showcase-content {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      height: 100%;
      gap: 32px;
    }

    .showcase-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }

    .brand-link {
      display: inline-flex;
      align-items: center;
      text-decoration: none;
    }

    .brand-logo-img {
      max-height: 46px;
      max-width: 220px;
      object-fit: contain;
      filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.4));
    }

    .showcase-brand-name {
      font-size: 24px;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: -0.025em;
      text-shadow: 0 2px 10px rgba(0, 0, 0, 0.4);
    }

    .brand-fallback-badge {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 8px 16px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.16);
      color: #ffffff;

      .brand-icon-img {
        width: 22px;
        height: 22px;
        object-fit: contain;
        border-radius: 4px;
      }

      .fallback-name {
        font-size: 16px;
        font-weight: 700;
        letter-spacing: -0.01em;
      }
    }

    .portal-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      border-radius: 999px;
      background: rgba(56, 189, 248, 0.12);
      border: 1px solid rgba(56, 189, 248, 0.25);
      color: #7dd3fc;
      font-size: 11.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;

      .pulse-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #38bdf8;
        box-shadow: 0 0 10px #38bdf8;
        animation: pulseAnimation 2s infinite ease-in-out;
      }
    }

    .showcase-hero {
      max-width: 580px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin: auto 0;

      .hero-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        align-self: flex-start;
        padding: 5px 12px;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.18);
        color: #f1f5f9;
        font-size: 12px;
        font-weight: 600;

        .icon-chip {
          font-size: 16px;
          color: #38bdf8;
        }
      }

      .hero-title {
        font-size: 38px;
        font-weight: 800;
        line-height: 1.2;
        color: #ffffff;
        letter-spacing: -0.025em;
        margin: 0;
        text-shadow: 0 4px 18px rgba(0, 0, 0, 0.35);
      }

      .hero-description {
        font-size: 15px;
        line-height: 1.65;
        color: #cbd5e1;
        margin: 0;
        max-width: 520px;
      }
    }

    .showcase-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding-top: 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);

      .btn-return-home {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        color: #cbd5e1;
        font-size: 13px;
        font-weight: 600;
        text-decoration: none;
        transition: color 0.15s ease;

        &:hover {
          color: #38bdf8;
        }

        .material-symbols-outlined {
          font-size: 18px;
        }
      }

      .footer-meta {
        display: flex;
        align-items: center;
        gap: 14px;
        font-size: 12px;
        color: #94a3b8;

        .powered-by-tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: #94a3b8;

          a {
            color: #38bdf8;
            font-weight: 700;
            text-decoration: none;
            &:hover { text-decoration: underline; }
          }
        }
      }
    }

    /* ---------------------------------------------------- */
    /* RIGHT PANEL: BRIGHT FORM SHELL                       */
    /* ---------------------------------------------------- */
    .auth-form-panel {
      position: relative;
      height: 100vh;
      max-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f8fafc;
      overflow-y: auto;
      box-sizing: border-box;
    }

    .form-panel-scroll {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px 32px;
      box-sizing: border-box;
    }

    .form-wrapper {
      width: 100%;
      max-width: 440px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin: auto 0;
    }

    .mobile-brand-bar {
      display: none;
      text-align: center;
      margin-bottom: 6px;

      .mobile-logo-img {
        max-height: 40px;
        max-width: 190px;
        object-fit: contain;
      }

      .mobile-brand-text {
        font-size: 20px;
        font-weight: 800;
        color: #0f172a;
      }
    }

    .form-footer-meta {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      margin-top: 4px;

      .auth-terms-note {
        text-align: center;
        font-size: 11px;
        color: #64748b;
        line-height: 1.45;
        margin: 0;
        padding: 0 8px;
      }

      .powered-by-row {
        font-size: 11.5px;
        color: #64748b;

        &.desktop-hidden-in-split {
          display: none;
        }

        a {
          color: #0050e5;
          font-weight: 700;
          text-decoration: none;
          &:hover { text-decoration: underline; }
        }
      }
    }

    @keyframes pulseAnimation {
      0% { opacity: 0.4; transform: scale(0.95); }
      50% { opacity: 1; transform: scale(1.1); }
      100% { opacity: 0.4; transform: scale(0.95); }
    }

    /* ---------------------------------------------------- */
    /* CENTERED (DON'T SPLIT) MODE STYLING                  */
    /* ---------------------------------------------------- */
    .centered-return-home {
      position: fixed;
      top: 24px;
      left: 24px;
      z-index: 10;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 18px;
      border-radius: 9999px;
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border: 1px solid rgba(255, 255, 255, 0.18);
      color: #f1f5f9;
      font-size: 13px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);

      &:hover {
        background: #0050e5;
        border-color: rgba(255, 255, 255, 0.35);
        transform: translateX(-3px);
        color: #ffffff;
        box-shadow: 0 6px 24px rgba(0, 80, 229, 0.45);
      }

      .material-symbols-outlined {
        font-size: 18px;
      }
    }

    .auth-viewport.mode-centered {
      overflow-y: auto;
      align-items: center;
      justify-content: center;

      .auth-split-layout {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        min-height: 100vh;
        grid-template-columns: 1fr;
        padding: 40px 20px;
        box-sizing: border-box;
      }

      .auth-form-panel {
        background: transparent;
        width: 100%;
        max-width: 460px;
        height: auto;
        min-height: auto;
        overflow: visible;
        padding: 0;
      }

      .form-panel-scroll {
        padding: 0;
        height: auto;
      }

      .form-wrapper {
        max-width: 100%;
        margin: 0;
      }

      .mobile-brand-bar.always-visible {
        display: block;
        margin-bottom: 14px;
        text-align: center;

        .mobile-logo-img {
          max-height: 48px;
          filter: drop-shadow(0 4px 14px rgba(0, 0, 0, 0.45));
        }

        .mobile-brand-text {
          color: #ffffff;
          font-size: 24px;
          font-weight: 800;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
        }
      }

      .form-footer-meta {
        .auth-terms-note {
          color: #cbd5e1;
          text-shadow: 0 1px 4px rgba(0, 0, 0, 0.7);
        }
        .powered-by-row {
          color: #94a3b8;
          text-shadow: 0 1px 4px rgba(0, 0, 0, 0.7);
          a {
            color: #38bdf8;
          }
        }
      }
    }

    /* ---------------------------------------------------- */
    /* RESPONSIVE BREAKPOINTS                               */
    /* ---------------------------------------------------- */
    @media (max-width: 1080px) {
      .auth-showcase-panel {
        padding: 36px 32px;
      }
      .showcase-hero .hero-title {
        font-size: 32px;
      }
    }

    @media (max-width: 900px) {
      :host {
        height: auto;
        min-height: 100vh;
        overflow-y: auto;
      }
      .auth-viewport {
        height: auto;
        min-height: 100vh;
        overflow-y: auto;
      }
      .auth-split-layout {
        height: auto;
        min-height: 100vh;
        grid-template-columns: 1fr;
        overflow-y: auto;
      }
      .auth-showcase-panel {
        display: none;
      }
      .mobile-brand-bar {
        display: block;
      }
      .auth-form-panel {
        height: auto;
        min-height: 100vh;
        background: #f8fafc;
        padding: 36px 20px;
      }
      .form-panel-scroll {
        height: auto;
        padding: 0;
      }
      .form-footer-meta .powered-by-row.desktop-hidden-in-split {
        display: block;
      }
    }
  `]
})
export class AuthLayoutComponent implements OnInit, OnDestroy {
  brandName: string = 'Workspace';
  websiteTitle: string = '';
  brandLogoUrl: string = '';
  brandWhiteLogoUrl: string = '';
  brandIconUrl: string = '';
  useWhiteLogo: boolean = false;
  loginBgUrl: string = '';
  loginLayout: string = 'centered';
  loginTitle: string = '';
  loginNoteTitle: string = '';
  loginNote: string = '';
  loginNoteFooter: string = '';
  logoLoadFailed: boolean = false;
  private routerSub?: Subscription;

  // Default curated royalty-free enterprise modern glass architecture wallpaper
  readonly defaultBgUrl: string = 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1920&q=85';
  readonly currentYear: number = new Date().getFullYear();

  constructor(
    private api: ApiService,
    private titleService: Title,
    private metaService: Meta,
    private router: Router
  ) {}

  ngOnInit(): void {
    // 1. Initial page title calculation
    this.updateDocumentTitle();

    // 2. Fetch tenant brand settings and customize head title + favicon
    this.api.get<any>('SettingsApi/brand').subscribe({
      next: (res) => {
        if (res?.data) {
          this.brandName = res.data.companyName || 'Workspace';
          this.websiteTitle = res.data.websiteTitle || '';
          this.brandLogoUrl = res.data.companyLogoUrl || '';
          this.brandWhiteLogoUrl = res.data.companyWhiteLogoUrl || '';
          const rawIcon = res.data.companyIconUrl;
          this.brandIconUrl = (rawIcon && rawIcon !== '/favicon.ico') ? rawIcon : '';
          this.useWhiteLogo = res.data.useWhiteLogoInLogin || false;
          this.loginBgUrl = res.data.loginBackgroundImageUrl || '';
          this.loginLayout = res.data.loginLayout || 'centered';
          this.loginTitle = res.data.loginTitle || '';
          this.loginNoteTitle = res.data.loginNoteTitle || '';
          this.loginNote = res.data.loginNote || '';
          this.loginNoteFooter = res.data.loginNoteFooter || '';

          // Apply head document title, SEO metadata, and dynamic favicon
          this.applyHeadMetaAndFavicon();
        }
      },
      error: () => {
        this.updateDocumentTitle();
      }
    });

    // 3. Listen to child route transitions to keep the head <title> updated
    this.routerSub = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.updateDocumentTitle();
    });
  }

  ngOnDestroy(): void {
    if (this.routerSub) {
      this.routerSub.unsubscribe();
    }
  }

  /**
   * Evaluates the active route and updates the browser document title (<title>) accordingly.
   */
  private updateDocumentTitle(): void {
    const url = this.router.url.toLowerCase();
    let actionTitle = 'Sign In';

    if (url.includes('reset-password')) {
      actionTitle = 'Reset Password';
    } else if (url.includes('forgot-password')) {
      actionTitle = 'Forgot Password';
    } else if (url.includes('access-denied')) {
      actionTitle = 'Access Denied';
    } else if (url.includes('register')) {
      actionTitle = 'Member Registration';
    } else {
      actionTitle = this.loginTitle?.trim() || 'Sign In';
    }

    const brand = this.websiteTitle || this.brandName || 'Workspace';
    const pageTitle = `${actionTitle} | ${brand}`;
    this.titleService.setTitle(pageTitle);

    try {
      this.metaService.updateTag({ property: 'og:title', content: pageTitle });
    } catch {
      // Non-blocking in headless contexts
    }
  }

  /**
   * Synchronizes browser head meta tags and dynamic page icon (favicon).
   */
  private applyHeadMetaAndFavicon(): void {
    this.updateDocumentTitle();

    const brand = this.brandName || 'Workspace';
    const metaDesc = this.loginNote?.trim() || `Sign In to ${brand} unified enterprise workspace.`;
    try {
      this.metaService.updateTag({ name: 'description', content: metaDesc });
      this.metaService.updateTag({ property: 'og:description', content: metaDesc });
      this.metaService.updateTag({ property: 'og:type', content: 'website' });
    } catch {
      // Non-blocking in headless contexts
    }

    // High-resolution SVG fallback icon so the browser tab is never iconless
    const defaultIconSvg = `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 rx=%2222%22 fill=%22%230050e5%22/><path d=%22M50 24a14 14 0 1 0 0 28 14 14 0 0 0 0-28zm0 35c-15.5 0-30 8-30 20v3h60v-3c0-12-14.5-20-30-20z%22 fill=%22%23ffffff%22/></svg>`;
    const iconUrl = this.brandIconUrl || this.brandLogoUrl || defaultIconSvg;
    this.updateFavicon(iconUrl);
  }

  /**
   * Sets or updates the browser tab favicon (<link rel="icon"> and <link rel="shortcut icon">).
   * @param iconUrl Image URL or SVG data URI for the tab icon.
   */
  private updateFavicon(iconUrl: string): void {
    if (typeof document === 'undefined' || !iconUrl) return;

    try {
      // 1. Remove all pre-existing icon elements to force the browser to invalidate cached blank icons
      const existingIcons = document.querySelectorAll("link[rel*='icon']");
      existingIcons.forEach(el => el.parentNode?.removeChild(el));

      // 2. Create fresh primary icon link
      const iconLink = document.createElement('link');
      iconLink.rel = 'icon';
      iconLink.href = iconUrl;
      if (iconUrl.startsWith('data:image/svg+xml') || iconUrl.endsWith('.svg')) {
        iconLink.type = 'image/svg+xml';
      } else if (iconUrl.endsWith('.png')) {
        iconLink.type = 'image/png';
      } else {
        iconLink.type = 'image/x-icon';
      }
      document.head.appendChild(iconLink);

      // 3. Create fresh shortcut icon link for legacy engines
      const shortcutLink = document.createElement('link');
      shortcutLink.rel = 'shortcut icon';
      shortcutLink.type = iconLink.type;
      shortcutLink.href = iconUrl;
      document.head.appendChild(shortcutLink);
    } catch {
      // Non-blocking in restricted browser security contexts
    }
  }

  get isCentered(): boolean {
    return this.loginLayout?.toLowerCase() === 'centered';
  }

  get isResetPasswordRoute(): boolean {
    const url = this.router.url.toLowerCase();
    return url.includes('reset-password') || url.includes('forgot-password');
  }

  get displayIcon(): string {
    return this.brandIconUrl || '';
  }

  get displayLogo(): string {
    if (this.useWhiteLogo && this.brandWhiteLogoUrl) {
      return this.brandWhiteLogoUrl;
    }
    return this.brandWhiteLogoUrl || this.brandLogoUrl || '';
  }

  get activeBackground(): string {
    return this.loginBgUrl?.trim() ? this.loginBgUrl.trim() : this.defaultBgUrl;
  }

  get displayChip(): string {
    return this.loginNoteTitle?.trim() || '';
  }

  get displayTitle(): string {
    if (this.isResetPasswordRoute) {
      return 'Account Recovery & Verification';
    }
    return this.loginTitle?.trim() || '';
  }

  get displayDescription(): string {
    if (this.isResetPasswordRoute) {
      return 'Enter your registered account email to receive a secure single-use recovery code and set your new permanent password.';
    }
    return this.loginNote?.trim() || '';
  }

  get displayFooterNote(): string {
    return this.loginNoteFooter?.trim() || '';
  }
}
