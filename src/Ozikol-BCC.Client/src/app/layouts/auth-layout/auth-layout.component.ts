import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
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
    <div class="auth-viewport" [style.--auth-bg]="'url(' + activeBackground + ')'">
      <!-- Ambient Backdrop Overlay -->
      <div class="auth-backdrop-overlay"></div>

      <div class="auth-split-layout">
        <!-- ============================================== -->
        <!-- LEFT PANEL: BRAND & ENTERPRISE SHOWCASE       -->
        <!-- ============================================== -->
        <aside class="auth-showcase-panel">
          <div class="showcase-content">
            <!-- Brand Identity Header -->
            <div class="showcase-header">
              <a routerLink="/" class="brand-link" title="Return to Home">
                <img 
                  *ngIf="displayLogo" 
                  [src]="displayLogo" 
                  [alt]="brandName" 
                  class="brand-logo-img" 
                />
                <div *ngIf="!displayLogo" class="brand-fallback-badge">
                  <img *ngIf="displayIcon" [src]="displayIcon" [alt]="brandName" class="brand-icon-img" />
                  <span class="fallback-name">{{ brandName }}</span>
                </div>
              </a>
              <span class="portal-badge">
                <span class="pulse-dot"></span>
                <span>Workspace Portal</span>
              </span>
            </div>

            <!-- Central Hero Narrative (Dynamic from DB) -->
            <div class="showcase-hero">
              <div class="hero-chip" *ngIf="loginNoteTitle">
                <span class="material-symbols-outlined icon-chip">verified_user</span>
                <span>{{ loginNoteTitle }}</span>
              </div>
              <h1 class="hero-title">{{ displayTitle }}</h1>
              <p class="hero-description">{{ displayDescription }}</p>
            </div>

            <!-- Showcase Footer -->
            <div class="showcase-footer">
              <a routerLink="/" class="btn-return-home" title="Return to Home">
                <span class="material-symbols-outlined">arrow_back</span>
                <span>Return to Home</span>
              </a>
              <div class="footer-meta">
                <span class="copyright-text">&copy; {{ currentYear }} {{ brandName }}.</span>
                <span class="powered-by-tag">
                  Powered by <a href="https://ozikol.cloud" target="_blank" rel="noopener noreferrer">Ozikol</a>
                </span>
              </div>
            </div>
          </div>
        </aside>

        <!-- ============================================== -->
        <!-- RIGHT PANEL: CHILD ROUTE OUTLET (BRIGHT CARD) -->
        <!-- ============================================== -->
        <main class="auth-form-panel">
          <div class="form-panel-scroll">
            <div class="form-wrapper">
              <!-- Mobile-Only Brand Header -->
              <div class="mobile-brand-bar">
                <a routerLink="/" class="mobile-logo-link">
                  <img *ngIf="displayLogo" [src]="displayLogo" [alt]="brandName" class="mobile-logo-img" />
                  <span *ngIf="!displayLogo" class="mobile-brand-text">{{ brandName }}</span>
                </a>
              </div>

              <!-- Routed Auth View (Login, 2FA, Reset Password, Register) -->
              <router-outlet></router-outlet>

              <!-- Universal Form Footer Note & Powered by Ozikol -->
              <div class="form-footer-meta">
                <p class="auth-terms-note" *ngIf="loginNoteFooter">{{ loginNoteFooter }}</p>
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
    }
  `]
})
export class AuthLayoutComponent implements OnInit {
  brandName: string = 'Workspace';
  brandLogoUrl: string = '';
  brandWhiteLogoUrl: string = '';
  brandIconUrl: string = '';
  useWhiteLogo: boolean = false;
  loginBgUrl: string = '';
  loginTitle: string = '';
  loginNoteTitle: string = '';
  loginNote: string = '';
  loginNoteFooter: string = '';

  // Default curated royalty-free enterprise modern glass architecture wallpaper
  readonly defaultBgUrl: string = 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1920&q=85';
  readonly currentYear: number = new Date().getFullYear();

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.get<any>('SettingsApi/brand').subscribe({
      next: (res) => {
        if (res?.data) {
          this.brandName = res.data.companyName || 'Workspace';
          this.brandLogoUrl = res.data.companyLogoUrl || '';
          this.brandWhiteLogoUrl = res.data.companyWhiteLogoUrl || '';
          const rawIcon = res.data.companyIconUrl;
          this.brandIconUrl = (rawIcon && rawIcon !== '/favicon.ico') ? rawIcon : '';
          this.useWhiteLogo = res.data.useWhiteLogoInLogin || false;
          this.loginBgUrl = res.data.loginBackgroundImageUrl || '';
          this.loginTitle = res.data.loginTitle || '';
          this.loginNoteTitle = res.data.loginNoteTitle || '';
          this.loginNote = res.data.loginNote || '';
          this.loginNoteFooter = res.data.loginNoteFooter || '';
        }
      },
      error: () => {}
    });
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

  get displayTitle(): string {
    return this.loginTitle?.trim() || `Sign In to ${this.brandName}`;
  }

  get displayDescription(): string {
    return this.loginNote?.trim() || 
      'Access your unified enterprise workspace, collaborate with your teams, and manage institutional records securely.';
  }
}
