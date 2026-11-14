import { Component, OnInit, OnDestroy, Input, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { ApiService } from '../../core/services/api.service';
import { TranslationService, SupportedLanguage, LanguageOption } from '../../core/services/translation.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';

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
  imports: [CommonModule, RouterModule, TranslatePipe],
  template: `
    <div class="auth-viewport" [style.--auth-bg]="'url(' + activeBackground + ')'" [class.mode-centered]="isCentered" [class.mode-preview]="previewMode">
      <!-- Ambient Backdrop Overlay -->
      <div class="auth-backdrop-overlay"></div>

      <!-- Floating Return to Home Button in Centered Mode -->
      <a routerLink="/" class="centered-return-home" *ngIf="isCentered" [title]="'adm.return_to_home' | translate:'Return to Home'">
        <span class="material-symbols-outlined">arrow_back</span>
        <span>{{ 'adm.return_to_home' | translate:'Return to Home' }}</span>
      </a>

      <!-- Floating Auth Top Utility Bar (Language Selector) -->
      <div class="auth-top-floating-bar" (click)="$event.stopPropagation()">
        <div class="oz-lang-switcher" id="authLangSwitcher">
          <button type="button" class="oz-lang-btn" (click)="toggleLangDropdown($event)" [attr.aria-expanded]="showLangDropdown" [attr.aria-label]="'adm.select_language' | translate:'Select Language'">
            <span class="oz-lang-flag">{{ currentLangOption.shortLabel }}</span>
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M1 1L5 5L9 1"/>
            </svg>
          </button>
          <div class="oz-lang-menu" *ngIf="showLangDropdown">
            <a href="javascript:void(0)" *ngFor="let opt of supportedLanguages" (click)="selectLanguage(opt.code)" class="oz-lang-item" [class.active]="currentLang === opt.code">
              <span class="oz-flag-icon">{{ opt.flag }}</span>
              <span class="oz-lang-name">{{ opt.nativeName }}</span>
              <span class="material-symbols-outlined check-icon" *ngIf="currentLang === opt.code">check</span>
            </a>
          </div>
        </div>
      </div>

      <div class="auth-split-layout">
        <!-- ============================================== -->
        <!-- LEFT PANEL: BRAND & ENTERPRISE SHOWCASE       -->
        <!-- ============================================== -->
        <aside class="auth-showcase-panel" *ngIf="!isCentered">
          <div class="showcase-content">
            <!-- Brand Identity Header -->
            <div class="showcase-header">
              <a routerLink="/" class="brand-link" [title]="'adm.return_to_home' | translate:'Return to Home'">
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
              <a routerLink="/" class="btn-return-home" [title]="'adm.return_to_home' | translate:'Return to Home'">
                <span class="material-symbols-outlined">arrow_back</span>
                <span>{{ 'adm.return_to_home' | translate:'Return to Home' }}</span>
              </a>
              <div class="footer-meta">
                <span class="powered-by-tag">
                  {{ 'adm.powered_by' | translate:'Powered by' }} <a href="https://ozikol.cloud" target="_blank" rel="noopener noreferrer">Ozikol</a>
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
            <div class="form-wrapper" [class.wide-embedded-form]="embeddedMode">
              <!-- Injected Form Content (Registration / Workforce Onboarding) -->
              <ng-content></ng-content>

              <!-- Routed Auth View (Login, 2FA, Reset Password, Register) -->
              <router-outlet *ngIf="!embeddedMode"></router-outlet>

              <!-- Universal Form Footer Note & Powered by Ozikol -->
              <div class="form-footer-meta">
                <p class="auth-terms-note" *ngIf="displayFooterNote">{{ displayFooterNote }}</p>
                <div class="powered-by-row" [class.desktop-hidden-in-split]="!isCentered">
                  <span>&copy; {{ currentYear }} {{ brandName }}. All rights reserved.</span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      <!-- Language Change Confirmation Modal -->
      <div class="modal-backdrop oz-lang-modal-backdrop" *ngIf="showLanguageConfirmModal" (click)="cancelLanguageChange()">
        <div class="oz-lang-modal-card" (click)="$event.stopPropagation()">
          <div class="oz-lang-modal-icon-wrap">
            <span class="material-symbols-outlined">translate</span>
          </div>
          <h3 class="oz-lang-modal-title">{{ 'shell.confirm_lang_title' | translate }}</h3>
          <p class="oz-lang-modal-desc">{{ 'shell.confirm_lang_desc' | translate }}</p>

          <div class="oz-lang-modal-target-pill" *ngIf="pendingLanguage">
            <span class="oz-flag-lg">{{ pendingLanguage.flag }}</span>
            <div class="oz-lang-modal-target-names">
              <span class="oz-lang-modal-target-native">{{ pendingLanguage.nativeName }}</span>
              <span class="oz-lang-modal-target-en">({{ pendingLanguage.name }})</span>
            </div>
          </div>

          <div class="oz-lang-modal-actions">
            <button type="button" class="btn-lang-modal-cancel" (click)="cancelLanguageChange()">
              {{ 'btn.cancel' | translate }}
            </button>
            <button type="button" class="btn-lang-modal-confirm" (click)="confirmLanguageChange()">
              <span class="material-symbols-outlined">check</span>
              <span>{{ 'shell.confirm_lang_btn' | translate }}</span>
            </button>
          </div>
        </div>
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

    :host.preview-host {
      width: 100%;
      height: auto;
      min-height: 600px;
      max-height: none;
      overflow: visible;
      border-radius: 12px;
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

    .auth-viewport.mode-preview {
      width: 100%;
      height: auto;
      min-height: 600px;
      max-height: none;
      overflow: hidden;
      border-radius: 12px;
    }

    .auth-viewport.mode-preview .centered-return-home,
    .auth-viewport.mode-preview .auth-top-floating-bar {
      position: absolute;
    }

    .auth-viewport.mode-preview .auth-split-layout {
      height: auto;
      min-height: 600px;
      max-height: none;
      grid-template-columns: 0.9fr 1.1fr;
    }

    .auth-viewport.mode-preview .auth-showcase-panel {
      height: auto;
      min-height: 600px;
      max-height: none;
      padding: 28px 24px;
    }

    .auth-viewport.mode-preview .showcase-hero .hero-title {
      font-size: 24px;
    }

    .auth-viewport.mode-preview .auth-form-panel {
      height: auto;
      min-height: 600px;
      max-height: none;
    }

    .form-wrapper.wide-embedded-form {
      max-width: 720px;
    }

    .auth-viewport.mode-centered .auth-form-panel:has(.wide-embedded-form) {
      max-width: 740px;
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

    /* Floating Auth Top Utility Bar (Language Selector) */
    .auth-top-floating-bar {
      position: fixed;
      top: 24px;
      right: 24px;
      z-index: 20;
    }
    @media (max-width: 900px) {
      .auth-top-floating-bar {
        top: 14px;
        right: 14px;
      }
    }
    .oz-lang-switcher {
      position: relative;
      display: inline-flex;
      align-items: center;
    }
    .oz-lang-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 14px;
      font-size: 12.5px;
      font-weight: 600;
      letter-spacing: 0.5px;
      color: #f1f5f9;
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border: 1px solid rgba(255, 255, 255, 0.18);
      border-radius: 9999px;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      line-height: 1;
    }
    .oz-lang-btn:hover {
      background: rgba(15, 23, 42, 0.9);
      border-color: rgba(255, 255, 255, 0.3);
      color: #ffffff;
      transform: translateY(-1px);
    }
    .oz-lang-btn[aria-expanded="true"] {
      border-color: #0050e5;
      box-shadow: 0 0 0 2px rgba(0, 80, 229, 0.25);
    }
    .oz-lang-btn svg {
      transition: transform 0.2s ease;
    }
    .oz-lang-btn[aria-expanded="true"] svg {
      transform: rotate(180deg);
    }
    .oz-lang-flag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .oz-lang-menu {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      min-width: 170px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
      padding: 6px;
      z-index: 1050;
    }
    .oz-lang-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 12px;
      font-size: 13px;
      font-weight: 500;
      color: #334155;
      text-decoration: none;
      border-radius: 8px;
      transition: background 0.15s ease, color 0.15s ease;
      cursor: pointer;
    }
    .oz-lang-item:hover {
      background: #f1f5f9;
      color: #0050e5;
    }
    .oz-lang-item.active {
      color: #0050e5;
      font-weight: 700;
      background: rgba(0, 80, 229, 0.08);
    }
    .oz-flag-icon {
      font-size: 15px;
    }
    .oz-lang-name {
      flex: 1;
    }
    .check-icon {
      font-size: 16px;
      color: #0050e5;
    }

    /* Language Change Confirmation Modal */
    .oz-lang-modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      z-index: 10005;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .oz-lang-modal-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      max-width: 440px;
      width: 100%;
      padding: 28px 24px 24px;
      text-align: center;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
    }
    .oz-lang-modal-icon-wrap {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: rgba(0, 80, 229, 0.1);
      color: #0050e5;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
    }
    .oz-lang-modal-icon-wrap .material-symbols-outlined {
      font-size: 28px;
    }
    .oz-lang-modal-title {
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 8px;
    }
    .oz-lang-modal-desc {
      font-size: 13.5px;
      line-height: 1.5;
      color: #64748b;
      margin: 0 0 20px;
    }
    .oz-lang-modal-target-pill {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      padding: 10px 18px;
      background: #f8fafc;
      border: 1.5px solid #cbd5e1;
      border-radius: 12px;
      margin-bottom: 24px;
    }
    .oz-flag-lg {
      font-size: 24px;
    }
    .oz-lang-modal-target-names {
      text-align: left;
    }
    .oz-lang-modal-target-native {
      display: block;
      font-size: 14.5px;
      font-weight: 700;
      color: #0f172a;
    }
    .oz-lang-modal-target-en {
      display: block;
      font-size: 11.5px;
      color: #64748b;
    }
    .oz-lang-modal-actions {
      display: flex;
      gap: 12px;
    }
    .btn-lang-modal-cancel {
      flex: 1;
      padding: 10px 16px;
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      font-size: 13.5px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-lang-modal-cancel:hover {
      background: #e2e8f0;
      color: #1e293b;
    }
    .btn-lang-modal-confirm {
      flex: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 10px 16px;
      background: #0050e5;
      color: #ffffff;
      border: none;
      border-radius: 10px;
      font-size: 13.5px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      box-shadow: 0 2px 4px rgba(0, 80, 229, 0.25);
    }
    .btn-lang-modal-confirm:hover {
      background: #003db3;
    }
    .btn-lang-modal-confirm .material-symbols-outlined {
      font-size: 18px;
    }
  `]
})
export class AuthLayoutComponent implements OnInit, OnDestroy {
  @Input() embeddedMode: boolean = false;
  @Input() previewMode: boolean = false;

  @HostBinding('class.preview-host')
  get isPreviewHost(): boolean {
    return this.previewMode;
  }

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

  showLangDropdown: boolean = false;
  pendingLanguage: LanguageOption | null = null;
  showLanguageConfirmModal: boolean = false;

  get currentLang(): SupportedLanguage {
    return this.translation.currentLanguage;
  }

  get currentLangOption(): LanguageOption {
    return this.translation.currentLanguageOption;
  }

  get supportedLanguages(): LanguageOption[] {
    return this.translation.supportedLanguages;
  }

  toggleLangDropdown(event?: Event): void {
    if (event) event.stopPropagation();
    this.showLangDropdown = !this.showLangDropdown;
  }

  selectLanguage(lang: SupportedLanguage): void {
    this.showLangDropdown = false;
    if (lang === this.currentLang) return;
    const target = this.supportedLanguages.find(l => l.code === lang);
    if (!target) return;
    this.pendingLanguage = target;
    this.showLanguageConfirmModal = true;
  }

  confirmLanguageChange(): void {
    if (this.pendingLanguage) {
      this.translation.setLanguage(this.pendingLanguage.code);
    }
    this.showLanguageConfirmModal = false;
    this.pendingLanguage = null;
  }

  cancelLanguageChange(): void {
    this.showLanguageConfirmModal = false;
    this.pendingLanguage = null;
  }

  constructor(
    private api: ApiService,
    private titleService: Title,
    private metaService: Meta,
    private router: Router,
    public translation: TranslationService
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

          // Robust layout resolution: Check loginLayout first, with fallback to loginBackgroundImageKey
          const apiLayout = res.data.loginLayout?.toLowerCase();
          const bgKeyLayout = res.data.loginBackgroundImageKey?.toLowerCase();
          if (apiLayout === 'split' || apiLayout === 'centered') {
            this.loginLayout = apiLayout;
          } else if (bgKeyLayout === 'split' || bgKeyLayout === 'centered') {
            this.loginLayout = bgKeyLayout;
          } else {
            this.loginLayout = 'centered';
          }
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
