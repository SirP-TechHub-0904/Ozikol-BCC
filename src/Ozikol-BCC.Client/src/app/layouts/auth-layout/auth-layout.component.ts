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
              <a routerLink="/" class="brand-link" title="Return to public website">
                <img 
                  *ngIf="displayLogo" 
                  [src]="displayLogo" 
                  [alt]="brandName" 
                  class="brand-logo-img" 
                />
                <div *ngIf="!displayLogo" class="brand-fallback-badge">
                  <span class="material-symbols-outlined icon-shield">shield</span>
                  <span class="fallback-name">{{ brandName }}</span>
                </div>
              </a>
              <span class="portal-badge">
                <span class="pulse-dot"></span>
                <span>Workspace Portal</span>
              </span>
            </div>

            <!-- Central Hero Narrative -->
            <div class="showcase-hero">
              <div class="hero-chip" *ngIf="loginNoteTitle">
                <span class="material-symbols-outlined icon-chip">verified_user</span>
                <span>{{ loginNoteTitle }}</span>
              </div>
              <h1 class="hero-title">{{ displayTitle }}</h1>
              <p class="hero-description">{{ displayDescription }}</p>

              <!-- Trust & Security Pillars -->
              <div class="security-pillars-grid">
                <div class="pillar-card">
                  <span class="material-symbols-outlined icon-pillar">lock</span>
                  <div>
                    <strong>Encrypted Session</strong>
                    <small>TLS 1.3 &amp; AES-256 Protocol</small>
                  </div>
                </div>
                <div class="pillar-card">
                  <span class="material-symbols-outlined icon-pillar">hub</span>
                  <div>
                    <strong>Isolated Workspace</strong>
                    <small>Dedicated Tenant Partition</small>
                  </div>
                </div>
                <div class="pillar-card">
                  <span class="material-symbols-outlined icon-pillar">fingerprint</span>
                  <div>
                    <strong>Multi-Factor Auth</strong>
                    <small>Biometric &amp; OTP Guarded</small>
                  </div>
                </div>
              </div>
            </div>

            <!-- Showcase Footer -->
            <div class="showcase-footer">
              <a routerLink="/" class="btn-back-website">
                <span class="material-symbols-outlined">arrow_back</span>
                <span>Back to Public Website</span>
              </a>
              <span class="copyright-text">&copy; {{ currentYear }} {{ brandName }}. All rights reserved.</span>
            </div>
          </div>
        </aside>

        <!-- ============================================== -->
        <!-- RIGHT PANEL: CHILD ROUTE OUTLET               -->
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

              <!-- Universal Form Footer Note -->
              <div class="auth-terms-note" *ngIf="loginNoteFooter">
                <p>{{ loginNoteFooter }}</p>
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
      min-height: 100vh;
      width: 100%;
      background: #090d16;
      color: #f8fafc;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .auth-viewport {
      position: relative;
      min-height: 100vh;
      width: 100%;
      background-image: var(--auth-bg);
      background-size: cover;
      background-position: center center;
      background-repeat: no-repeat;
      display: flex;
      overflow-x: hidden;
    }

    .auth-backdrop-overlay {
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 10% 20%, rgba(15, 23, 42, 0.82) 0%, rgba(9, 13, 22, 0.94) 100%);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      z-index: 1;
    }

    .auth-split-layout {
      position: relative;
      z-index: 2;
      width: 100%;
      min-height: 100vh;
      display: grid;
      grid-template-columns: 1.15fr 1fr;
    }

    /* ---------------------------------------------------- */
    /* LEFT PANEL: SHOWCASE                                 */
    /* ---------------------------------------------------- */
    .auth-showcase-panel {
      position: relative;
      padding: 56px 64px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      border-right: 1px solid rgba(255, 255, 255, 0.08);
      background: linear-gradient(135deg, rgba(15, 23, 42, 0.5) 0%, rgba(15, 23, 42, 0.25) 100%);
    }

    .showcase-content {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      height: 100%;
      gap: 40px;
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
      max-height: 48px;
      max-width: 220px;
      object-fit: contain;
      filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.4));
    }

    .brand-fallback-badge {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      background: rgba(255, 255, 255, 0.06);
      padding: 8px 18px;
      border-radius: 999px;
      border: 1px solid rgba(255, 255, 255, 0.12);

      .icon-shield {
        color: #38bdf8;
        font-size: 22px;
      }
      .fallback-name {
        font-weight: 700;
        font-size: 16px;
        color: #ffffff;
        letter-spacing: -0.02em;
      }
    }

    .portal-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      background: rgba(56, 189, 248, 0.1);
      border: 1px solid rgba(56, 189, 248, 0.25);
      border-radius: 999px;
      font-size: 11.5px;
      font-weight: 600;
      color: #38bdf8;
      text-transform: uppercase;
      letter-spacing: 0.05em;

      .pulse-dot {
        width: 7px;
        height: 7px;
        background: #38bdf8;
        border-radius: 50%;
        box-shadow: 0 0 8px #38bdf8;
        animation: pulseAnimation 2s infinite ease-in-out;
      }
    }

    .showcase-hero {
      max-width: 580px;

      .hero-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 12px;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        color: #cbd5e1;
        margin-bottom: 20px;

        .icon-chip {
          font-size: 16px;
          color: #10b981;
        }
      }

      .hero-title {
        font-size: 38px;
        font-weight: 800;
        line-height: 1.18;
        color: #ffffff;
        letter-spacing: -0.03em;
        margin-bottom: 16px;
        text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
      }

      .hero-description {
        font-size: 15.5px;
        line-height: 1.6;
        color: #94a3b8;
        margin-bottom: 36px;
      }
    }

    .security-pillars-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;

      .pillar-card {
        background: rgba(15, 23, 42, 0.55);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        transition: all 0.2s ease;

        &:hover {
          background: rgba(30, 41, 59, 0.7);
          border-color: rgba(56, 189, 248, 0.3);
          transform: translateY(-2px);
        }

        .icon-pillar {
          font-size: 22px;
          color: #38bdf8;
        }

        strong {
          font-size: 12.5px;
          font-weight: 700;
          color: #f1f5f9;
          display: block;
        }

        small {
          font-size: 11px;
          color: #64748b;
          display: block;
          line-height: 1.3;
        }
      }
    }

    .showcase-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding-top: 24px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);

      .btn-back-website {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        color: #94a3b8;
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

      .copyright-text {
        font-size: 12px;
        color: #64748b;
      }
    }

    /* ---------------------------------------------------- */
    /* RIGHT PANEL: FORM SHELL                              */
    /* ---------------------------------------------------- */
    .auth-form-panel {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(11, 15, 25, 0.88);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
    }

    .form-panel-scroll {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 48px 32px;
      overflow-y: auto;
    }

    .form-wrapper {
      width: 100%;
      max-width: 460px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .mobile-brand-bar {
      display: none;
      text-align: center;
      margin-bottom: 8px;

      .mobile-logo-img {
        max-height: 42px;
        max-width: 200px;
        object-fit: contain;
      }

      .mobile-brand-text {
        font-size: 22px;
        font-weight: 800;
        color: #ffffff;
      }
    }

    .auth-terms-note {
      text-align: center;
      font-size: 11.5px;
      color: #64748b;
      line-height: 1.5;
      padding: 0 12px;
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
        padding: 40px 32px;
      }
      .showcase-hero .hero-title {
        font-size: 30px;
      }
      .security-pillars-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 900px) {
      .auth-split-layout {
        grid-template-columns: 1fr;
      }
      .auth-showcase-panel {
        display: none;
      }
      .mobile-brand-bar {
        display: block;
      }
      .auth-form-panel {
        background: rgba(11, 15, 25, 0.94);
      }
    }
  `]
})
export class AuthLayoutComponent implements OnInit {
  brandName: string = 'Workspace';
  brandLogoUrl: string = '';
  brandWhiteLogoUrl: string = '';
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

  get displayLogo(): string {
    if (this.useWhiteLogo && this.brandWhiteLogoUrl) {
      return this.brandWhiteLogoUrl;
    }
    return this.brandLogoUrl || this.brandWhiteLogoUrl || '';
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
