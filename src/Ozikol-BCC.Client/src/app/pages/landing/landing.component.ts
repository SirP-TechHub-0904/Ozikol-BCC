import { Component, OnInit, OnDestroy, HostListener, ElementRef, ViewEncapsulation, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml, Title, Meta } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { CartService } from '../../core/services/cart.service';
import { ToastService } from '../../core/services/toast.service';
import { CommitteesService } from '../../core/services/committees.service';
import { TemplateHydrationService } from '../admin/content/templates/services/template-hydration.service';
import { ContentHydrationService } from '../admin/content/templates/services/content-hydration.service';
import { HtmlAssemblerService, SectionTemplateUnit, CodeInjectionTag } from '../admin/content/templates/services/html-assembler.service';

/**
 * Public dynamic website orchestration component.
 * Faithfully implements the full web architecture:
 * 1. Header Tags (<head>): Active SEO meta tags, Google Fonts, OpenGraph, Twitter cards, Favicons, and Bootstrap/FA CSS.
 * 2. Body Open Tags (<body>): Injected immediately after <body> opening tag.
 * 3. Modular Sections: Navbar (menu), Hero (hero) or Breadcrumb, ordered PageSections (body), and Footer (footer).
 * 4. Footer Scripts (</body>): Injected immediately before </body> closing tag (Bootstrap JS bundle, section scripts).
 * 5. Full Document Scrolling: Native responsive browser scrolling without viewport lock.
 */
@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <!-- Top Progress / Loader -->
    <div *ngIf="loading" class="public-site-loader">
      <div class="loader-inner">
        <div class="spinner-ring"></div>
      </div>
    </div>

    <!-- Error State -->
    <div *ngIf="error && !loading" class="public-site-error-container">
      <div class="error-card">
        <span class="material-symbols-outlined error-icon">cloud_off</span>
        <h2>Website Under Construction</h2>
        <p>{{ errorMessage || 'The website content is currently being initialized. Please check back shortly.' }}</p>
        <div class="error-actions">
          <button type="button" (click)="loadSiteData()" class="btn-retry">Retry Connection</button>
          <a routerLink="/auth/login" class="btn-login-shortcut">Portal Sign In</a>
        </div>
      </div>
    </div>

    <!-- Dynamic Live Hydrated Site -->
    <div *ngIf="!loading && !error" class="public-dynamic-site-wrapper" [class.mobile-menu-active]="mobileMenuOpen">
      <!-- Rendered HTML Blocks (Menu, Hero/Breadcrumb, Sections, Footer) -->
      <main class="dynamic-rendered-content" [innerHTML]="safeRenderedHtml"></main>

      <!-- Glassmorphic Cookie Consent Bar -->
      <aside *ngIf="showCookieConsent && cookieSettings?.enabled" class="oz-cookie-consent-bar" role="dialog" aria-live="polite" aria-label="Cookie consent banner">
        <div class="oz-cookie-content">
          <div class="oz-cookie-icon-wrap">
            <svg class="oz-cookie-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" />
              <path d="M8.5 8.5v.01" />
              <path d="M7 14v.01" />
              <path d="M11 17v.01" />
              <path d="M15 13v.01" />
            </svg>
          </div>
          <div class="oz-cookie-text">
            <h4 class="oz-cookie-title">{{ cookieSettings?.title || 'Cookie Preferences & Privacy' }}</h4>
            <p class="oz-cookie-msg">
              {{ cookieSettings?.message || 'We use cookies to optimize site performance, analyze traffic, and ensure you get the best browsing experience on our website.' }}
              <a *ngIf="cookieSettings?.policyUrl" [href]="cookieSettings?.policyUrl" target="_blank" rel="noopener noreferrer" class="oz-cookie-link">Privacy Policy</a>
            </p>
          </div>
        </div>
        <div class="oz-cookie-actions">
          <button type="button" (click)="declineCookieConsent()" class="oz-cookie-btn-decline">{{ cookieSettings?.declineText || 'Decline' }}</button>
          <button type="button" (click)="acceptCookieConsent()" class="oz-cookie-btn-accept">{{ cookieSettings?.acceptText || 'Accept All' }}</button>
        </div>
      </aside>

      <!-- WhatsApp Floating Live Chat Widget -->
      <div *ngIf="whatsAppSettings?.enabled" class="oz-whatsapp-widget" role="complementary" aria-label="WhatsApp live chat support">
        <!-- Chat Popup Card -->
        <div *ngIf="whatsAppChatOpen" class="oz-whatsapp-popup" aria-live="polite">
          <div class="oz-whatsapp-header">
            <div class="oz-whatsapp-avatar-wrap">
              <div class="oz-whatsapp-avatar">
                <svg class="oz-whatsapp-header-svg" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2z"/>
                </svg>
              </div>
              <span class="oz-whatsapp-online-dot"></span>
            </div>
            <div class="oz-whatsapp-meta">
              <h4 class="oz-whatsapp-title">{{ whatsAppSettings?.widgetTitle || 'Live WhatsApp Support' }}</h4>
              <p class="oz-whatsapp-subtitle">{{ whatsAppSettings?.widgetSubtitle || 'Typically replies within minutes' }}</p>
            </div>
            <button type="button" class="oz-whatsapp-close-btn" (click)="toggleWhatsAppChat()" aria-label="Close WhatsApp chat">×</button>
          </div>

          <div class="oz-whatsapp-body">
            <div class="oz-whatsapp-date-pill">Today</div>
            <div class="oz-whatsapp-bubble-agent" (click)="launchWhatsAppChat()" role="button" tabindex="0" title="Click to open this in WhatsApp">
              <div class="oz-whatsapp-sender">{{ brandName || 'Support Team' }}</div>
              <p class="oz-whatsapp-bubble-msg">{{ whatsAppSettings?.promptMessage || 'Hello! How can we assist you today?' }}</p>
              <div class="oz-whatsapp-bubble-footer">
                <span class="oz-whatsapp-bubble-time">{{ currentChatTime }}</span>
              </div>
            </div>
          </div>

          <form class="oz-whatsapp-footer" (ngSubmit)="launchWhatsAppChat()">
            <input
              type="text"
              name="waMessage"
              [(ngModel)]="whatsAppUserMessage"
              [placeholder]="'Type a message...'"
              class="oz-whatsapp-input"
              autocomplete="off"
            />
            <button type="submit" class="oz-whatsapp-send-btn" aria-label="Send via WhatsApp">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          </form>
        </div>

        <!-- Floating Pill / Trigger Button -->
        <button
          type="button"
          class="oz-whatsapp-trigger-pill"
          (click)="toggleWhatsAppChat()"
          [attr.aria-expanded]="whatsAppChatOpen"
          aria-label="Chat with us on WhatsApp"
        >
          <div class="oz-whatsapp-trigger-icon">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zM17.5 14.33c-.23.65-1.14 1.2-1.6 1.25-.43.05-.98.08-1.58-.12-.39-.13-.9-.29-1.55-.58-2.73-1.18-4.51-3.96-4.65-4.14-.14-.19-1.11-1.48-1.11-2.82 0-1.34.7-2 1-2.28.23-.21.5-.27.67-.27.17 0 .34 0 .49.01.16.01.37-.06.58.44.22.52.74 1.8.8 1.93.07.13.11.29.02.47-.08.18-.13.3-.26.45-.13.15-.27.33-.39.45-.13.13-.26.27-.11.53.15.26.68 1.12 1.45 1.81 1 .89 1.84 1.17 2.1 1.3.26.13.41.11.56-.06.15-.17.65-.76.82-1.02.17-.26.35-.22.58-.13.24.09 1.5.71 1.76.84.26.13.43.2.49.31.06.11.06.65-.17 1.3z"/>
            </svg>
          </div>
          <span class="oz-whatsapp-trigger-text">Chat with us</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    /* Universal Host and Reset */
    :host {
      display: block;
      width: 100%;
      min-height: 100vh;
      background-color: #ffffff;
      color: #1e293b;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }

    /* Modern Minimalist Preloader */
    .public-site-loader {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: #ffffff;
    }
    .loader-inner {
      text-align: center;
    }
    .spinner-ring {
      display: inline-block;
      width: 46px;
      height: 46px;
      border: 3.5px solid #e2e8f0;
      border-top-color: #0050e5;
      border-radius: 50%;
      animation: spin 0.85s linear infinite;
      margin: 0;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Error / Offline State */
    .public-site-error-container {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 30px 20px;
      background: #f8fafc;
    }
    .error-card {
      max-width: 480px;
      background: #ffffff;
      border-radius: 16px;
      padding: 40px 32px;
      text-align: center;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.03);
      border: 1px solid #e2e8f0;
    }
    .error-icon {
      font-size: 54px;
      color: #64748b;
      margin-bottom: 16px;
    }
    .error-card h2 {
      font-size: 22px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 10px;
    }
    .error-card p {
      color: #64748b;
      font-size: 14px;
      line-height: 1.6;
      margin: 0 0 24px;
    }
    .error-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
    }
    .btn-retry {
      background: #0050e5;
      color: #ffffff;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 13.5px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .btn-retry:hover {
      background: #003ebd;
    }
    .btn-login-shortcut {
      background: transparent;
      color: #475569;
      border: 1px solid #cbd5e1;
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 13.5px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.15s ease;
    }
    .btn-login-shortcut:hover {
      background: #f1f5f9;
      color: #0f172a;
    }

    /* Core Public Layout & Interactive Dropdown Styles */
    .public-dynamic-site-wrapper {
      position: relative;
      width: 100%;
      min-height: 100vh;
    }

    /* Anti-FOUC Smooth Site Reveal */
    .dynamic-rendered-content {
      animation: ozSiteReveal 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    @keyframes ozSiteReveal {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    /* Dynamic Form Input Focus & Styling */
    .dynamic-rendered-content form .form-control:focus,
    .dynamic-rendered-content form .form-select:focus {
      border-color: #0050e5 !important;
      box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.15) !important;
    }
    .dynamic-rendered-content form button[type="submit"]:disabled {
      opacity: 0.65;
      cursor: not-allowed;
    }
    .oz-recaptcha-wrap {
      display: flex;
      margin: 12px 0;
    }
    .oz-recaptcha-wrap .g-recaptcha {
      transform-origin: 0 0;
    }

    /* Glassmorphic Cookie Consent Banner */
    .oz-cookie-consent-bar {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      width: calc(100% - 32px);
      max-width: 860px;
      background: rgba(15, 23, 42, 0.88);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 16px;
      padding: 18px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      z-index: 99990;
      box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.45);
      animation: ozSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes ozSlideUp {
      from { transform: translate(-50%, 40px); opacity: 0; }
      to { transform: translate(-50%, 0); opacity: 1; }
    }
    .oz-cookie-content {
      display: flex;
      align-items: center;
      gap: 16px;
      flex: 1;
      min-width: 0;
    }
    .oz-cookie-icon-wrap {
      width: 42px;
      height: 42px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      color: #fbbf24;
    }
    .oz-cookie-svg {
      width: 24px;
      height: 24px;
    }
    .oz-cookie-text {
      flex: 1;
      min-width: 0;
    }
    .oz-cookie-title {
      font-size: 14.5px;
      font-weight: 700;
      color: #ffffff;
      margin: 0 0 3px;
    }
    .oz-cookie-msg {
      font-size: 13px;
      line-height: 1.45;
      color: #cbd5e1;
      margin: 0;
    }
    .oz-cookie-link {
      color: #60a5fa;
      text-decoration: underline;
      margin-left: 6px;
    }
    .oz-cookie-link:hover {
      color: #93c5fd;
    }
    .oz-cookie-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
    }
    .oz-cookie-btn-decline {
      background: rgba(255, 255, 255, 0.08);
      color: #e2e8f0;
      border: 1px solid rgba(255, 255, 255, 0.16);
      padding: 9px 18px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .oz-cookie-btn-decline:hover {
      background: rgba(255, 255, 255, 0.16);
      color: #ffffff;
    }
    .oz-cookie-btn-accept {
      background: #0050e5;
      color: #ffffff;
      border: none;
      padding: 9px 20px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 80, 229, 0.35);
      transition: all 0.15s ease;
    }
    .oz-cookie-btn-accept:hover {
      background: #003ebd;
      transform: translateY(-1px);
    }

    /* WhatsApp Floating Live Chat Widget */
    .oz-whatsapp-widget {
      position: fixed;
      bottom: 28px;
      right: 28px;
      z-index: 99995;
      font-family: inherit;
    }
    .oz-whatsapp-trigger-pill {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      background: #25D366;
      color: #ffffff;
      border: none;
      padding: 12px 20px 12px 14px;
      border-radius: 999px;
      font-size: 14.5px;
      font-weight: 700;
      letter-spacing: 0.01em;
      cursor: pointer;
      box-shadow: 0 10px 24px -4px rgba(37, 211, 102, 0.5), 0 4px 10px rgba(0, 0, 0, 0.1);
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .oz-whatsapp-trigger-pill:hover {
      background: #20ba59;
      transform: translateY(-2px) scale(1.02);
      box-shadow: 0 14px 28px -4px rgba(37, 211, 102, 0.6), 0 6px 12px rgba(0, 0, 0, 0.12);
    }
    .oz-whatsapp-trigger-icon {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .oz-whatsapp-trigger-text {
      color: #ffffff;
      white-space: nowrap;
    }

    /* WhatsApp Popup Card */
    .oz-whatsapp-popup {
      position: absolute;
      bottom: 64px;
      right: 0;
      width: 350px;
      max-width: calc(100vw - 32px);
      background: #ffffff;
      border-radius: 18px;
      overflow: hidden;
      box-shadow: 0 20px 48px -8px rgba(0, 0, 0, 0.22), 0 10px 20px -6px rgba(0, 0, 0, 0.1);
      border: 1px solid rgba(0, 0, 0, 0.08);
      display: flex;
      flex-direction: column;
      animation: ozPopupSlide 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes ozPopupSlide {
      from { transform: translateY(16px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .oz-whatsapp-header {
      background: #075E54;
      color: #ffffff;
      padding: 16px 18px;
      display: flex;
      align-items: center;
      gap: 12px;
      position: relative;
    }
    .oz-whatsapp-avatar-wrap {
      position: relative;
      width: 42px;
      height: 42px;
      flex-shrink: 0;
    }
    .oz-whatsapp-avatar {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: #25D366;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
    }
    .oz-whatsapp-header-svg {
      width: 26px;
      height: 26px;
    }
    .oz-whatsapp-online-dot {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 11px;
      height: 11px;
      background: #4ade80;
      border: 2px solid #075E54;
      border-radius: 50%;
    }
    .oz-whatsapp-meta {
      flex: 1;
      min-width: 0;
    }
    .oz-whatsapp-title {
      font-size: 14.5px;
      font-weight: 700;
      color: #ffffff;
      margin: 0 0 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .oz-whatsapp-subtitle {
      font-size: 11.5px;
      color: rgba(255, 255, 255, 0.82);
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .oz-whatsapp-close-btn {
      background: transparent;
      border: none;
      color: rgba(255, 255, 255, 0.7);
      font-size: 24px;
      line-height: 1;
      cursor: pointer;
      padding: 0;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      transition: all 0.15s ease;
    }
    .oz-whatsapp-close-btn:hover {
      color: #ffffff;
      background: rgba(255, 255, 255, 0.12);
    }
    .oz-whatsapp-body {
      background: #efeae2;
      background-image: radial-gradient(#d5cdc1 1px, transparent 1px);
      background-size: 16px 16px;
      padding: 20px 16px;
      min-height: 160px;
      max-height: 260px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .oz-whatsapp-date-pill {
      align-self: center;
      background: rgba(255, 255, 255, 0.8);
      color: #54656f;
      font-size: 11px;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 8px;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    }
    .oz-whatsapp-bubble-agent {
      align-self: flex-start;
      background: #ffffff;
      border-radius: 12px 12px 12px 2px;
      padding: 10px 14px;
      max-width: 88%;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
      cursor: pointer;
      position: relative;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }
    .oz-whatsapp-bubble-agent:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.12);
    }
    .oz-whatsapp-sender {
      font-size: 11px;
      font-weight: 700;
      color: #128C7E;
      margin-bottom: 4px;
    }
    .oz-whatsapp-bubble-msg {
      font-size: 13.5px;
      color: #111b21;
      line-height: 1.45;
      margin: 0 0 6px;
    }
    .oz-whatsapp-bubble-footer {
      display: flex;
      justify-content: flex-end;
    }
    .oz-whatsapp-bubble-time {
      font-size: 10.5px;
      color: #667781;
    }
    .oz-whatsapp-footer {
      background: #f0f2f5;
      padding: 10px 12px;
      display: flex;
      align-items: center;
      gap: 8px;
      border-top: 1px solid #e9edef;
    }
    .oz-whatsapp-input {
      flex: 1;
      background: #ffffff;
      border: 1px solid #d1d7db;
      border-radius: 20px;
      padding: 9px 16px;
      font-size: 13.5px;
      color: #111b21;
      outline: none;
      transition: border-color 0.15s ease;
    }
    .oz-whatsapp-input:focus {
      border-color: #00a884;
    }
    .oz-whatsapp-send-btn {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: #00a884;
      color: #ffffff;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      flex-shrink: 0;
      transition: background 0.15s ease, transform 0.15s ease;
    }
    .oz-whatsapp-send-btn:hover {
      background: #008f6f;
      transform: scale(1.05);
    }
    @media (max-width: 768px) {
      .oz-cookie-consent-bar {
        flex-direction: column;
        align-items: stretch;
        padding: 16px;
        bottom: 12px;
      }
      .oz-cookie-actions {
        justify-content: flex-end;
      }
    }
    @media (max-width: 480px) {
      .oz-whatsapp-widget {
        bottom: 18px;
        right: 18px;
      }
      .oz-whatsapp-popup {
        width: calc(100vw - 36px);
        bottom: 58px;
      }
    }
  `]
})
export class LandingComponent implements OnInit, OnDestroy {
  // State Flags
  loading: boolean = true;
  error: boolean = false;
  errorMessage: string = '';
  mobileMenuOpen: boolean = false;

  // Active Routing Context
  currentSlug: string = '';
  activeBlogId: string | null = null;

  // Tenant Live Content & Theme Architecture
  brandName: string = '';
  brandLogoUrl: string = '';
  brandInfo: any = {};
  recaptchaSiteKey: string = '6LdBsb8tAAAAAPuXWg5SLjjbPVZd0_-v1w4WbK6H';
  activeTemplates: any[] = [];
  categories: any[] = [];
  publishedPages: any[] = [];
  sections: any[] = [];
  blogs: any[] = [];
  codeInjections: { head: any[]; bodyOpen: any[]; footer: any[] } = { head: [], bodyOpen: [], footer: [] };

  // Breaking News Ribbon Ticker
  ribbonSettings: { enabled: boolean; title: string; position: string } | null = null;
  tickerItems: any[] = [];

  // Cookie Consent Preferences
  cookieSettings: { enabled: boolean; title: string; message: string; acceptText: string; declineText: string; policyUrl: string } | null = null;
  showCookieConsent: boolean = false;

  // WhatsApp Floating Live Chat Support
  whatsAppSettings: { enabled: boolean; number: string; promptMessage: string; widgetTitle: string; widgetSubtitle: string } | null = null;
  whatsAppChatOpen: boolean = false;
  whatsAppUserMessage: string = '';

  // Page Specific Resolution
  currentPage: any = null;
  currentArticle: any = null;

  // Render Pipeline
  renderedStyles: string = '';
  safeRenderedHtml: SafeHtml | null = null;

  // Public Committee & Sub-Group Registration State
  committeeTenantSlug: string = '';
  committeeGroupSlug: string = '';
  committeeInviteToken: string = '';
  activeCommittee: any = null;
  openCommittees: any[] = [];
  committeeAliases: any = {
    aliasSingular: 'Committee',
    aliasPlural: 'Committees',
    subGroupAliasSingular: 'Sub-Group',
    subGroupAliasPlural: 'Sub-Groups'
  };
  committeeExtraAnswers: Record<string, any> = {};
  committeeAttachmentUrls: string[] = [];
  committeeSubmitting: boolean = false;
  committeeFormError: string = '';
  committeeSubmittedSuccess: boolean = false;
  committeeSubmissionStatus: string = '';
  committeeSubmissionMessage: string = '';
  committeeSignedInMember: any = null;
  committeeDirectoryMode: boolean = false;

  private routeSub: Subscription | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService,
    private committeesService: CommitteesService,
    public cartService: CartService,
    private toastService: ToastService,
    private templateHydration: TemplateHydrationService,
    private contentHydration: ContentHydrationService,
    private htmlAssembler: HtmlAssemblerService,
    private sanitizer: DomSanitizer,
    private titleService: Title,
    private metaService: Meta,
    private elementRef: ElementRef,
    private cdr: ChangeDetectorRef
  ) {}

  /**
   * Aggregates live database code injections for HtmlAssemblerService zones.
   */
  private get allCodeInjectionsList(): CodeInjectionTag[] {
    const list: CodeInjectionTag[] = [];
    (this.codeInjections.head || []).forEach(t => list.push({ ...t, zone: 'head', isActive: t.isActive !== false }));
    (this.codeInjections.bodyOpen || []).forEach(t => list.push({ ...t, zone: 'body_open', isActive: t.isActive !== false }));
    (this.codeInjections.footer || []).forEach(t => list.push({ ...t, zone: 'footer', isActive: t.isActive !== false }));
    return list;
  }

  ngOnInit(): void {
    // Unlock native document scrolling for public website mode
    document.body.classList.add('public-website-mode');

    // Listen to route changes (slug changes) to support instant in-app navigation
    this.routeSub = this.route.paramMap.subscribe(params => {
      // 1. Check direct slug parameter
      let slugParam = (params.get('slug') || '').trim().toLowerCase();

      // 2. Fallback to route URL segments (e.g. /blog, /blog/123, /about)
      const urlSegments = this.route.snapshot.url.map(s => s.path.toLowerCase());
      if (!slugParam && urlSegments.length > 0) {
        slugParam = urlSegments[0];
      }

      this.currentSlug = slugParam;

      // Check if viewing blog by ID or slug
      const blogIdParam = params.get('id') || (urlSegments[0] === 'blog' && urlSegments[1] ? urlSegments[1] : null);
      this.activeBlogId = blogIdParam;

      // Check if viewing committees public portal (/join-committee)
      if (slugParam === 'join-committee') {
        const seg1 = urlSegments[1] || '';
        const seg2 = urlSegments[2] || '';
        this.committeeInviteToken = this.route.snapshot.queryParamMap.get('token') || '';

        const hostTenant = this.extractSubdomainTenant();
        const storedTenant = localStorage.getItem('tenant_key') || '';
        const inferredTenant = hostTenant || storedTenant;

        if (seg1 && seg2) {
          this.committeeTenantSlug = seg1;
          this.committeeGroupSlug = seg2;
        } else if (seg1 && !seg2) {
          if (inferredTenant && seg1.toLowerCase() !== inferredTenant.toLowerCase()) {
            this.committeeTenantSlug = inferredTenant;
            this.committeeGroupSlug = seg1;
          } else {
            this.committeeTenantSlug = seg1;
            this.committeeGroupSlug = '';
          }
        } else {
          this.committeeTenantSlug = inferredTenant;
          this.committeeGroupSlug = '';
        }
      }

      this.loadSiteData();
    });
  }

  /**
   * Helper extracting the tenant identifier from the browser hostname when on a subdomain (e.g. rozzy-touchxz.localhost:4200).
   */
  private extractSubdomainTenant(): string {
    if (typeof window === 'undefined') return '';
    const host = window.location.hostname.toLowerCase();
    const parts = host.split('.');
    if (parts.length > 1 && !['localhost', '127.0.0.1', 'www', 'api', 'central', 'admin'].includes(parts[0])) {
      return parts[0];
    }
    return '';
  }

  ngOnDestroy(): void {
    // Re-lock or restore default dashboard mode
    document.body.classList.remove('public-website-mode');

    // Clean up dynamic tags injected into head and body
    document.querySelectorAll('.ozikol-injected-tag').forEach(el => el.remove());
    document.getElementById('tenant-dynamic-theme-styles')?.remove();

    if (this.routeSub) {
      this.routeSub.unsubscribe();
    }
  }

  /**
   * Main data coordination pipeline:
   * 1. Fetches active templates, categories, published pages, and branding from backend APIs.
   * 2. Fetches page-specific sections or blog articles depending on activeSlug.
   * 3. Executes TemplateHydrationService to assemble and sanitize the final HTML document.
   */
  loadSiteData(): void {
    this.loading = true;
    this.error = false;

    // Concurrently fetch foundational website metadata
    Promise.all([
      this.fetchBrandSettings(),
      this.fetchActiveTemplates(),
      this.fetchNavigationCategories(),
      this.fetchPublishedPages(),
      this.fetchCodeInjections()
    ])
    .then(async () => {
      // Concurrently fetch active ticker items if breaking news ribbon is enabled
      await this.fetchTickerItems();

      // Route dispatch based on active slug
      if (!this.currentSlug || this.currentSlug === 'home') {
        // 1. Homepage Rendering
        await Promise.all([
          this.fetchHomeSections(),
          this.fetchRecentBlogs()
        ]);
        if (this.activeTemplates.length === 0 && this.sections.length === 0) {
          this.composeBlankCanvasWelcome();
        } else {
          this.composeHomepage();
        }
      } else if (this.currentSlug === 'blog') {
        // 2. Blog Archive or Single Article
        if (this.activeBlogId) {
          await this.fetchSingleBlog(this.activeBlogId);
          this.composeBlogDetail();
        } else {
          await this.fetchAllBlogs();
          this.composeBlogArchive();
        }
      } else if (this.currentSlug === 'join-committee') {
        // 3. Public Committee & Sub-Group Registration Portal (Wrapped directly in official Landing Page shell)
        await this.fetchAndComposePublicCommittee();
      } else {
        // 3. Dynamic Page by Slug (e.g., about, request-service, privacy-policy, contact-us, etc.)
        await this.fetchPageBySlug(this.currentSlug);
        this.composeContentPage();
      }

      this.loading = false;
      this.cdr.detectChanges();
      this.recordTelemetry();
    })
    .catch((err) => {
      console.error('Failed to load website runtime:', err);
      this.loading = false;
      this.error = true;
      this.errorMessage = err?.message || 'Could not connect to website delivery services.';
    });
  }

  // ========================================================
  // BACKEND API DATA RETRIEVAL
  // ========================================================

  private fetchBrandSettings(): Promise<void> {
    return new Promise((resolve) => {
      // 1. Fetch public UI settings (always accessible anonymously)
      this.apiService.get('WebsiteContentApi/ui-settings').subscribe({
        next: (uiRes: any) => {
          if (uiRes?.data) {
            const data = uiRes.data;
            const email = data.contactEmail || data.supportEmail || data.email || data.companyEmail || '';
            const phone = data.primaryPhone || data.phoneOne || data.phone || data.companyPhone || '';
            const address = data.address || data.addressOne || data.companyAddress || '';
            const workingHours = data.workingHours || '';
            this.brandInfo = {
              ...this.brandInfo,
              ...data,
              email,
              Email: email,
              phone,
              Phone: phone,
              address,
              Address: address,
              workingHours,
              WorkingHours: workingHours
            };
            this.brandName = data.brandName || data.companyName || data.siteTitle || this.brandName;
            this.brandLogoUrl = data.logoUrl || data.companyLogoUrl || data.whiteLogoUrl || this.brandLogoUrl;
            if (data.recaptchaSiteKey) {
              this.recaptchaSiteKey = data.recaptchaSiteKey;
            }
            if (data.ribbonTicker) {
              this.ribbonSettings = data.ribbonTicker;
            }
            if (data.cookieConsent) {
              this.cookieSettings = data.cookieConsent;
              this.evaluateCookieConsent();
            }
            if (data.whatsAppChat) {
              this.whatsAppSettings = data.whatsAppChat;
            }
            this.applyFavicon(data.faviconUrl || data.companyIconUrl);
          }
          // 2. Also attempt to fetch full SettingsApi/brand if available
          this.apiService.get('SettingsApi/brand').subscribe({
            next: (brandRes: any) => {
              if (brandRes?.data) {
                const bData = brandRes.data;
                this.brandInfo = { ...this.brandInfo, ...bData };
                if (bData.companyName) this.brandName = bData.companyName;
                if (bData.companyLogoUrl) this.brandLogoUrl = bData.companyLogoUrl;
                if (bData.enableBreakingNewsRibon !== undefined) {
                  this.ribbonSettings = {
                    enabled: !!bData.enableBreakingNewsRibon,
                    title: bData.breakingNewsRibonTitle || 'Breaking News',
                    position: bData.breakingNewsRibonPosition || 'Top'
                  };
                }
                if (bData.enableCookieConsent !== undefined) {
                  this.cookieSettings = {
                    enabled: !!bData.enableCookieConsent,
                    title: bData.cookieConsentTitle || 'Cookie Preferences & Privacy',
                    message: bData.cookieConsentMessage || 'We use cookies to optimize site performance, analyze traffic, and ensure you get the best browsing experience on our website.',
                    acceptText: bData.cookieConsentAcceptText || 'Accept All',
                    declineText: bData.cookieConsentDeclineText || 'Decline',
                    policyUrl: bData.cookieConsentPolicyUrl || '/privacy-policy'
                  };
                  this.evaluateCookieConsent();
                }
                if (bData.enableWhatsAppChat !== undefined) {
                  this.whatsAppSettings = {
                    enabled: !!bData.enableWhatsAppChat && !!bData.whatsAppNumber,
                    number: bData.whatsAppNumber || '',
                    promptMessage: bData.whatsAppPromptMessage || 'Hello! How can we assist you today?',
                    widgetTitle: bData.whatsAppWidgetTitle || 'Live WhatsApp Support',
                    widgetSubtitle: bData.whatsAppWidgetSubtitle || 'Typically replies within minutes'
                  };
                }
                this.applyFavicon(bData.companyIconUrl);
              }
              resolve();
            },
            error: () => resolve()
          });
        },
        error: () => {
          this.apiService.get('SettingsApi/brand').subscribe({
            next: (brandRes: any) => {
              if (brandRes?.data) {
                const bData = brandRes.data;
                this.brandInfo = { ...this.brandInfo, ...bData };
                if (bData.companyName) this.brandName = bData.companyName;
                if (bData.companyLogoUrl) this.brandLogoUrl = bData.companyLogoUrl;
                if (bData.enableBreakingNewsRibon !== undefined) {
                  this.ribbonSettings = {
                    enabled: !!bData.enableBreakingNewsRibon,
                    title: bData.breakingNewsRibonTitle || 'Breaking News',
                    position: bData.breakingNewsRibonPosition || 'Top'
                  };
                }
                if (bData.enableCookieConsent !== undefined) {
                  this.cookieSettings = {
                    enabled: !!bData.enableCookieConsent,
                    title: bData.cookieConsentTitle || 'Cookie Preferences & Privacy',
                    message: bData.cookieConsentMessage || 'We use cookies to optimize site performance, analyze traffic, and ensure you get the best browsing experience on our website.',
                    acceptText: bData.cookieConsentAcceptText || 'Accept All',
                    declineText: bData.cookieConsentDeclineText || 'Decline',
                    policyUrl: bData.cookieConsentPolicyUrl || '/privacy-policy'
                  };
                  this.evaluateCookieConsent();
                }
                if (bData.enableWhatsAppChat !== undefined) {
                  this.whatsAppSettings = {
                    enabled: !!bData.enableWhatsAppChat && !!bData.whatsAppNumber,
                    number: bData.whatsAppNumber || '',
                    promptMessage: bData.whatsAppPromptMessage || 'Hello! How can we assist you today?',
                    widgetTitle: bData.whatsAppWidgetTitle || 'Live WhatsApp Support',
                    widgetSubtitle: bData.whatsAppWidgetSubtitle || 'Typically replies within minutes'
                  };
                }
                this.applyFavicon(bData.companyIconUrl);
              }
              resolve();
            },
            error: () => resolve()
          });
        }
      });
    });
  }

  private applyFavicon(rawIcon?: string): void {
    const activeIcon = (rawIcon && rawIcon !== '/favicon.ico') ? rawIcon : '';
    const favicons = document.querySelectorAll("link[rel*='icon']");
    if (favicons.length > 0) {
      favicons.forEach(el => (el as HTMLLinkElement).href = activeIcon || 'data:,');
    } else if (activeIcon) {
      const link = document.createElement('link');
      link.rel = 'shortcut icon';
      link.type = 'image/x-icon';
      link.href = activeIcon;
      document.head.appendChild(link);
    }
  }

  // ========================================================
  // WIDGET & TICKER RUNTIME LOGIC
  // ========================================================

  /**
   * Fetches active ticker items from WebsiteContentApi/ticker.
   */
  private fetchTickerItems(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.ribbonSettings?.enabled) {
        resolve();
        return;
      }
      this.apiService.get('WebsiteContentApi/ticker').subscribe({
        next: (res: any) => {
          if (res?.success && Array.isArray(res.data)) {
            this.tickerItems = res.data;
          }
          resolve();
        },
        error: () => resolve()
      });
    });
  }

  /**
   * Synthesizes an animated horizontal ribbon marquee section with pause-on-hover.
   */
  private buildRibbonSection(): SectionTemplateUnit | undefined {
    if (!this.ribbonSettings?.enabled) {
      return undefined;
    }

    // Resolve streamable items with multi-tier fallback
    let items = (this.tickerItems && this.tickerItems.length > 0) ? [...this.tickerItems] : [];

    if (items.length === 0 && this.blogs && this.blogs.length > 0) {
      items = this.blogs.slice(0, 5).map(b => ({
        id: b.id,
        type: 'Blog',
        title: b.title || 'Latest Update',
        url: `/blog/${b.id}`
      }));
    }

    if (items.length === 0 && this.publishedPages && this.publishedPages.length > 0) {
      items = this.publishedPages.filter(p => !p.isHomePage).slice(0, 5).map(p => ({
        id: p.id,
        type: 'Page',
        title: p.title || 'Featured Page',
        url: p.directUrl ? (p.directUrl.startsWith('/') ? p.directUrl : `/${p.directUrl}`) : `/page/${p.id}`
      }));
    }

    if (items.length === 0) {
      items = [
        {
          id: 'default-welcome-item',
          type: 'Announcement',
          title: `Welcome to ${this.brandName || 'our official website'} — explore our latest services, capabilities, and updates.`,
          url: '#'
        }
      ];
    }

    // Ensure smooth continuous marquee loop by duplicating items if fewer than 3
    let streamItems = [...items];
    while (streamItems.length < 3) {
      streamItems = streamItems.concat(items);
    }

    const title = this.ribbonSettings.title || 'Breaking News';
    const itemsMarkup = streamItems.map(item => `
      <a href="${item.url || '#'}" class="oz-ticker-item">
        <span class="oz-ticker-dot">●</span>
        <span class="oz-ticker-type">${this.escapeHtml(item.type || 'Update')}</span>
        <span class="oz-ticker-text">${this.escapeHtml(item.title || '')}</span>
      </a>
    `).join('');

    const html = `
      <section class="oz-ticker-bar" aria-label="Breaking announcements and updates">
        <div class="oz-ticker-badge">
          <span class="oz-ticker-pulse"></span>
          <span class="oz-ticker-label">${this.escapeHtml(title)}</span>
        </div>
        <div class="oz-ticker-track-wrapper">
          <div class="oz-ticker-track">
            <div class="oz-ticker-group">${itemsMarkup}</div>
            <div class="oz-ticker-group" aria-hidden="true">${itemsMarkup}</div>
          </div>
        </div>
      </section>
    `;

    const css = `
      .oz-ticker-bar {
        display: flex;
        align-items: center;
        background: #0f172a;
        color: #f8fafc;
        font-size: 13px;
        height: 44px;
        overflow: hidden;
        position: relative;
        z-index: 40;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      }
      .oz-ticker-badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: #0050e5;
        color: #ffffff;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        font-size: 11.5px;
        padding: 0 16px;
        height: 100%;
        white-space: nowrap;
        position: relative;
        z-index: 2;
        box-shadow: 4px 0 12px rgba(0, 0, 0, 0.25);
      }
      .oz-ticker-pulse {
        width: 8px;
        height: 8px;
        background: #22c55e;
        border-radius: 50%;
        box-shadow: 0 0 0 rgba(34, 197, 94, 0.4);
        animation: ozTickerPulse 1.8s infinite;
      }
      @keyframes ozTickerPulse {
        0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
        70% { box-shadow: 0 0 0 7px rgba(34, 197, 94, 0); }
        100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
      }
      .oz-ticker-track-wrapper {
        flex: 1;
        overflow: hidden;
        white-space: nowrap;
        position: relative;
        height: 100%;
        display: flex;
        align-items: center;
        mask-image: linear-gradient(to right, transparent, black 24px, black calc(100% - 24px), transparent);
        -webkit-mask-image: linear-gradient(to right, transparent, black 24px, black calc(100% - 24px), transparent);
      }
      .oz-ticker-track {
        display: inline-flex;
        align-items: center;
        will-change: transform;
        animation: ozMarqueeScroll 35s linear infinite;
      }
      .oz-ticker-bar:hover .oz-ticker-track {
        animation-play-state: paused;
      }
      .oz-ticker-group {
        display: inline-flex;
        align-items: center;
        flex-shrink: 0;
      }
      .oz-ticker-item {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        color: #e2e8f0;
        text-decoration: none;
        padding: 0 20px;
        transition: color 0.15s ease;
      }
      .oz-ticker-item:hover {
        color: #60a5fa;
      }
      .oz-ticker-dot {
        color: #3b82f6;
        font-size: 8px;
      }
      .oz-ticker-type {
        background: rgba(255, 255, 255, 0.1);
        color: #94a3b8;
        font-size: 10px;
        font-weight: 600;
        padding: 2px 6px;
        border-radius: 4px;
        text-transform: uppercase;
      }
      .oz-ticker-text {
        font-weight: 500;
      }
      @keyframes ozMarqueeScroll {
        0% { transform: translateX(0); }
        100% { transform: translateX(-50%); }
      }
      @media (max-width: 640px) {
        .oz-ticker-bar { height: 38px; font-size: 12px; }
        .oz-ticker-badge { font-size: 10.5px; padding: 0 10px; }
        .oz-ticker-item { padding: 0 12px; }
      }
    `;

    return {
      id: 'ribbon-ticker-unit',
      name: 'Breaking News Ticker',
      category: 'ribbon',
      html,
      css
    };
  }

  /**
   * Safely escapes plain text strings for injection into HTML fragments.
   */
  private escapeHtml(raw: string): string {
    if (!raw) return '';
    return raw
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Checks client localStorage to decide whether the Cookie Consent banner should be presented.
   */
  private evaluateCookieConsent(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const consent = localStorage.getItem('ozikol_cookie_consent');
    this.showCookieConsent = !consent && !!this.cookieSettings?.enabled;
  }

  /**
   * Dismisses and accepts cookie storage.
   */
  acceptCookieConsent(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('ozikol_cookie_consent', 'accepted');
    }
    this.showCookieConsent = false;
  }

  /**
   * Dismisses and declines non-essential cookies.
   */
  declineCookieConsent(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('ozikol_cookie_consent', 'declined');
    }
    this.showCookieConsent = false;
  }

  /**
   * Toggles the WhatsApp live chat popup drawer.
   */
  toggleWhatsAppChat(): void {
    this.whatsAppChatOpen = !this.whatsAppChatOpen;
  }

  /**
   * Current formatted time for the chat bubble timestamp.
   */
  get currentChatTime(): string {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  /**
   * Opens official WhatsApp direct chat in a new tab with prompt text or user custom message.
   */
  launchWhatsAppChat(): void {
    if (!this.whatsAppSettings?.number) return;
    const cleanNumber = (this.whatsAppSettings.number || '').replace(/[^0-9]/g, '');
    const message = (this.whatsAppUserMessage || '').trim() || (this.whatsAppSettings.promptMessage || 'Hello! How can we assist you today?');
    const encoded = encodeURIComponent(message);
    const waUrl = `https://wa.me/${cleanNumber}?text=${encoded}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  }

  private fetchActiveTemplates(): Promise<void> {
    return new Promise((resolve) => {
      this.apiService.get('WebsiteContentApi/theme/active-templates').subscribe({
        next: (res: any) => {
          this.activeTemplates = res?.data || [];
          resolve();
        },
        error: () => {
          // Fallback to installed templates if admin endpoint exists
          this.apiService.get('ContentApi/templates/installed').subscribe({
            next: (adminRes: any) => {
              const all = adminRes?.data || [];
              this.activeTemplates = all.filter((t: any) => t.isActive);
              resolve();
            },
            error: () => resolve()
          });
        }
      });
    });
  }

  private fetchNavigationCategories(): Promise<void> {
    return new Promise((resolve) => {
      this.apiService.get('WebsiteContentApi/categories').subscribe({
        next: (res: any) => {
          this.categories = res?.data || [];
          resolve();
        },
        error: () => {
          this.apiService.get('ContentApi/categories').subscribe({
            next: (cRes: any) => {
              this.categories = cRes?.data || [];
              resolve();
            },
            error: () => resolve()
          });
        }
      });
    });
  }

  private fetchPublishedPages(): Promise<void> {
    return new Promise((resolve) => {
      this.apiService.get('WebsiteContentApi/pages').subscribe({
        next: (res: any) => {
          this.publishedPages = res?.data || [];
          resolve();
        },
        error: () => {
          this.apiService.get('ContentApi/pages').subscribe({
            next: (pRes: any) => {
              this.publishedPages = pRes?.data || [];
              resolve();
            },
            error: () => resolve()
          });
        }
      });
    });
  }

  private fetchCodeInjections(): Promise<void> {
    return new Promise((resolve) => {
      this.apiService.get('WebsiteContentApi/code-injections').subscribe({
        next: (res: any) => {
          const data = res?.data || {};
          this.codeInjections = {
            head: data.head || [],
            bodyOpen: data.bodyOpen || [],
            footer: data.footer || []
          };
          resolve();
        },
        error: () => resolve()
      });
    });
  }

  private fetchHomeSections(): Promise<void> {
    return new Promise((resolve) => {
      this.apiService.get('WebsiteContentApi/sections?pageSet=home').subscribe({
        next: (res: any) => {
          this.sections = res?.data || [];
          resolve();
        },
        error: () => resolve()
      });
    });
  }

  private fetchRecentBlogs(): Promise<void> {
    return new Promise((resolve) => {
      this.apiService.get('WebsiteContentApi/blogs?limit=3').subscribe({
        next: (res: any) => {
          this.blogs = res?.data || [];
          resolve();
        },
        error: () => resolve()
      });
    });
  }

  private fetchAllBlogs(): Promise<void> {
    return new Promise((resolve) => {
      this.apiService.get('WebsiteContentApi/blogs').subscribe({
        next: (res: any) => {
          this.blogs = res?.data || [];
          resolve();
        },
        error: () => resolve()
      });
    });
  }

  private fetchSingleBlog(id: string): Promise<void> {
    return new Promise((resolve) => {
      const cleanId = (id || '').trim();
      this.apiService.get(`WebsiteContentApi/blogs/${cleanId}`).subscribe({
        next: (res: any) => {
          this.currentArticle = res?.data || null;
          if (this.blogs.length === 0) {
            this.fetchRecentBlogs().then(() => resolve());
          } else {
            resolve();
          }
        },
        error: () => {
          // Graceful fallback: match by ID or slug within the full published blog list
          this.apiService.get('WebsiteContentApi/blogs').subscribe({
            next: (allRes: any) => {
              const allBlogs: any[] = allRes?.data || [];
              this.blogs = allBlogs;
              const found = allBlogs.find(b => 
                (b.id && b.id.toLowerCase() === cleanId.toLowerCase()) ||
                (b.title && b.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') === cleanId.toLowerCase()) ||
                (b.slug && b.slug.toLowerCase() === cleanId.toLowerCase())
              );
              this.currentArticle = found || null;
              resolve();
            },
            error: () => resolve()
          });
        }
      });
    });
  }

  private fetchPageBySlug(slug: string): Promise<void> {
    return new Promise((resolve) => {
      const clean = (slug || '').trim().toLowerCase().replace(/^\/+/, '');
      this.apiService.get(`WebsiteContentApi/pages/slug/${clean}`).subscribe({
        next: (res: any) => {
          const loadedPage = res?.data || null;
          // Strictly reject unpublished pages
          if (loadedPage && (loadedPage.publish === false || loadedPage.Publish === false)) {
            this.currentPage = null;
          } else {
            this.currentPage = loadedPage;
          }

          // In-memory fallback if not found via API, strictly enforcing publish === true
          if (!this.currentPage) {
            this.currentPage = this.publishedPages.find(p =>
              p.publish !== false && p.Publish !== false &&
              ((p.directUrl && p.directUrl.toLowerCase().replace(/^\/+/, '') === clean) ||
              (p.slug && p.slug.toLowerCase().replace(/^\/+/, '') === clean) ||
              (p.title && p.title.toLowerCase().replace(/\s+/g, '-') === clean))
            ) || null;
          }
          resolve();
        },
        error: (err) => {
          console.warn(`Could not load page with slug '${slug}':`, err);
          this.currentPage = this.publishedPages.find(p =>
            p.publish !== false && p.Publish !== false &&
            ((p.directUrl && p.directUrl.toLowerCase().replace(/^\/+/, '') === clean) ||
            (p.slug && p.slug.toLowerCase().replace(/^\/+/, '') === clean) ||
            (p.title && p.title.toLowerCase().replace(/\s+/g, '-') === clean))
          ) || null;
          resolve();
        }
      });
    });
  }

  // ========================================================
  // COMPOSITION & TEMPLATE HYDRATION PIPELINE
  // ========================================================

  /**
   * Assembles the Homepage:
   * Menu + Hero + Home Body Sections in Order (without duplicate Hero) + Footer.
   */
  private composeHomepage(): void {
    if (this.activeTemplates.length === 0 && this.sections.length === 0) {
      this.composeBlankCanvasWelcome();
      return;
    }

    this.currentPage = this.publishedPages.find(p => p.isHomePage || p.directUrl === '/' || p.directUrl === 'home' || p.directUrl === 'index') || null;
    this.titleService.setTitle(`${this.brandName} | Official Website`);

    // 1. Navigation Header Section Unit
    const menuTemplate = this.findActiveTemplate('menu');
    const headerSection: SectionTemplateUnit | undefined = menuTemplate ? {
      id: menuTemplate.id,
      name: menuTemplate.name,
      category: 'menu',
      html: this.hydrateMenu(menuTemplate.htmlTemplate, 'home'),
      css: menuTemplate.cssStyles,
      js: menuTemplate.jsScript
    } : undefined;

    // 2. Hero Section Unit
    const heroTemplate = this.findActiveTemplate('hero');
    const dbHeroSection = this.sections.find(s => 
      s.directUrl === 'home-hero' || 
      (s.templateKey || '').toUpperCase().includes('HERO') || 
      s.homePageSortOrder === 1 || 
      s.pageSortOrder === 1
    );
    const heroSection: SectionTemplateUnit | undefined = heroTemplate ? {
      id: heroTemplate.id,
      name: heroTemplate.name,
      category: 'hero',
      html: this.contentHydration.hydrate(heroTemplate.htmlTemplate, this.buildHeroContext(dbHeroSection), 'hero'),
      css: heroTemplate.cssStyles,
      js: heroTemplate.jsScript
    } : undefined;

    // 3. Modular Body Section Units from database
    const bodySectionsList: SectionTemplateUnit[] = [];
    const bodySections = this.sections.filter(s => 
      s !== dbHeroSection && 
      s.directUrl !== 'home-hero' && 
      !(s.templateKey || '').toUpperCase().includes('HERO')
    );

    for (const sec of bodySections) {
      const secTemplate = this.findTemplateForSection(sec);
      if (secTemplate) {
        const activeHtml = (sec.isCustomized && sec.htmlTemplate) ? sec.htmlTemplate : secTemplate.htmlTemplate;
        const activeCss = (sec.isCustomized && sec.cssStyles) ? sec.cssStyles : secTemplate.cssStyles;
        const activeJs = (sec.isCustomized && sec.jsScript) ? sec.jsScript : secTemplate.jsScript;
        const sectionData = this.buildSectionContext(sec);
        bodySectionsList.push({
          id: sec.id || secTemplate.id,
          name: sec.title || secTemplate.name,
          category: 'body',
          html: this.contentHydration.hydrate(activeHtml, sectionData, 'body'),
          css: activeCss,
          js: activeJs,
          sortOrder: sec.homePageSortOrder ?? sec.pageSortOrder ?? 0
        });
      }
    }

    // 4. Footer Section Unit
    const footerTemplate = this.findActiveTemplate('footer');
    const footerSection: SectionTemplateUnit | undefined = footerTemplate ? {
      id: footerTemplate.id,
      name: footerTemplate.name,
      category: 'footer',
      html: this.hydrateFooter(footerTemplate.htmlTemplate),
      css: footerTemplate.cssStyles,
      js: footerTemplate.jsScript
    } : undefined;

    // 5. Delegate full page synthesis to HtmlAssemblerService
    const pageBundle = this.htmlAssembler.assemblePageBundle({
      pageTitle: `${this.brandName} | Official Website`,
      pageSlug: 'home',
      metaDescription: this.brandInfo?.companyDescription,
      faviconUrl: this.brandInfo?.faviconUrl,
      codeInjections: this.allCodeInjectionsList,
      headerSection,
      heroSection,
      bodySections: bodySectionsList,
      footerSection,
      ribbonSection: this.buildRibbonSection(),
      ribonPosition: this.ribbonSettings?.position
    });

    this.finalizeRender(pageBundle.combinedStyles, pageBundle.visualBodyMarkup, pageBundle.combinedScripts);
  }

  /**
   * Assembles a dedicated Content Page:
   * Menu + Breadcrumb Header + Page Sections (or Body Content) + Footer.
   */
  private composeContentPage(): void {
    if (this.activeTemplates.length === 0 && this.sections.length === 0 && !this.currentPage) {
      this.composeBlankCanvasWelcome();
      return;
    }

    if (!this.currentPage || this.currentPage.publish === false || this.currentPage.Publish === false) {
      this.composeNotFoundPage();
      return;
    }

    this.titleService.setTitle(`${this.currentPage.title || 'Page'} | ${this.brandName}`);

    // 1. Navigation Header Section Unit
    const menuTemplate = this.findActiveTemplate('menu');
    const headerSection: SectionTemplateUnit | undefined = menuTemplate ? {
      id: menuTemplate.id,
      name: menuTemplate.name,
      category: 'menu',
      html: this.hydrateMenu(menuTemplate.htmlTemplate, this.currentSlug),
      css: menuTemplate.cssStyles,
      js: menuTemplate.jsScript
    } : undefined;

    // 2. Breadcrumb Header Section Unit
    const rawSections: any[] = this.currentPage.pageSections || [];
    const heroSection = rawSections.find(
      (sec: any) => (sec.templateKey || '').toLowerCase() === 'hero_corporatesplit' ||
                    (sec.templateKey || '').toLowerCase() === 'breadcrumb_banner'
    );

    // Row 5 custom background image uploaded for this page takes highest priority
    const pageCustomBg = this.currentPage.imageUrl || 
                         this.currentPage.ImageUrl || 
                         this.currentPage.headerImageUrl || 
                         this.currentPage.backgroundImageUrl;

    const effectiveBg = pageCustomBg || 
                        heroSection?.imageUrl || 
                        'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1600&q=80';

    const pageTitle = this.currentPage.title || heroSection?.title || '';
    const breadcrumbTemplate = this.findActiveTemplate('breadcrumb');
    let breadcrumbSection: SectionTemplateUnit | undefined;
    if (breadcrumbTemplate) {
      const breadcrumbData = {
        title: pageTitle,
        Title: pageTitle,
        pageTitle: pageTitle,
        miniTitle: heroSection?.miniTitle || this.currentPage.pageCategory?.categoryName || this.currentPage.pageCategory?.title || this.currentPage.miniTitle || '',
        description: this.currentPage.description || heroSection?.description || '',
        backgroundImageUrl: effectiveBg,
        imageUrl: effectiveBg,
        breadcrumbTrail: [
          { label: 'Home', url: '/', isActive: false },
          { label: pageTitle, url: '#', isActive: true }
        ],
        breadcrumbs: [
          { title: 'Home', url: '/', isActive: false },
          { title: pageTitle, url: '#', isActive: true }
        ]
      };
      breadcrumbSection = {
        id: breadcrumbTemplate.id,
        name: breadcrumbTemplate.name,
        category: 'breadcrumb',
        html: this.contentHydration.hydrate(breadcrumbTemplate.htmlTemplate, breadcrumbData, 'breadcrumb'),
        css: breadcrumbTemplate.cssStyles,
        js: breadcrumbTemplate.jsScript
      };
    }

    // 3. Page Layout Sections from database (filter out header/breadcrumb sections so they do not duplicate in body)
    const bodySectionsList: SectionTemplateUnit[] = [];
    const pageSections = rawSections.filter(
      (sec: any) => sec !== heroSection &&
                    (sec.templateKey || '').toLowerCase() !== 'hero_corporatesplit' &&
                    (sec.templateKey || '').toLowerCase() !== 'breadcrumb_banner' &&
                    !(sec.templateKey || '').toLowerCase().includes('breadcrumb')
    );

    if (pageSections.length > 0) {
      for (const sec of pageSections) {
        const secTemplate = this.findTemplateForSection(sec);
        if (secTemplate) {
          const activeHtml = (sec.isCustomized && sec.htmlTemplate) ? sec.htmlTemplate : secTemplate.htmlTemplate;
          const activeCss = (sec.isCustomized && sec.cssStyles) ? sec.cssStyles : secTemplate.cssStyles;
          const activeJs = (sec.isCustomized && sec.jsScript) ? sec.jsScript : secTemplate.jsScript;
          const sectionData = this.buildSectionContext(sec);
          bodySectionsList.push({
            id: sec.id || secTemplate.id,
            name: sec.title || secTemplate.name,
            category: 'body',
            html: this.contentHydration.hydrate(activeHtml, sectionData, 'body'),
            css: activeCss,
            js: activeJs,
            sortOrder: sec.pageSortOrder ?? 0
          });
        }
      }
    } else {
      const bodyContent = this.currentPage.fullDescription || this.currentPage.description || '';
      if (bodyContent) {
        bodySectionsList.push({
          name: 'Page Content',
          category: 'body',
          html: `
            <section class="py-5 bg-white border-bottom">
              <div class="container py-4">
                <div class="row justify-content-center">
                  <div class="col-lg-9">
                    <article class="prose-content fs-5 leading-relaxed text-secondary">
                      ${bodyContent}
                    </article>
                  </div>
                </div>
              </div>
            </section>
          `
        });
      }
    }

    // 4. Footer Section Unit
    const footerTemplate = this.findActiveTemplate('footer');
    const footerSection: SectionTemplateUnit | undefined = footerTemplate ? {
      id: footerTemplate.id,
      name: footerTemplate.name,
      category: 'footer',
      html: this.hydrateFooter(footerTemplate.htmlTemplate),
      css: footerTemplate.cssStyles,
      js: footerTemplate.jsScript
    } : undefined;

    // 5. Delegate full page synthesis to HtmlAssemblerService
    const pageBundle = this.htmlAssembler.assemblePageBundle({
      pageTitle: `${this.currentPage.title || 'Page'} | ${this.brandName}`,
      pageSlug: this.currentSlug,
      metaDescription: this.currentPage.description || this.brandInfo?.companyDescription,
      faviconUrl: this.brandInfo?.faviconUrl,
      codeInjections: this.allCodeInjectionsList,
      headerSection,
      breadcrumbSection,
      bodySections: bodySectionsList,
      footerSection,
      ribbonSection: this.buildRibbonSection(),
      ribonPosition: this.ribbonSettings?.position
    });

    this.finalizeRender(pageBundle.combinedStyles, pageBundle.visualBodyMarkup, pageBundle.combinedScripts);
  }

  /**
   * Assembles the Blog Archive Page:
   * Menu + Breadcrumb Header + Blog Grid + Footer.
   */
  private composeBlogArchive(): void {
    this.titleService.setTitle(`Blog | ${this.brandName}`);

    // 1. Navigation Header Section Unit
    const menuTemplate = this.findActiveTemplate('menu');
    const headerSection: SectionTemplateUnit | undefined = menuTemplate ? {
      id: menuTemplate.id,
      name: menuTemplate.name,
      category: 'menu',
      html: this.hydrateMenu(menuTemplate.htmlTemplate, 'blog'),
      css: menuTemplate.cssStyles,
      js: menuTemplate.jsScript
    } : undefined;

    // 2. Breadcrumb Header Section Unit
    const breadcrumbTemplate = this.findActiveTemplate('breadcrumb');
    let breadcrumbSection: SectionTemplateUnit | undefined;
    if (breadcrumbTemplate) {
      const blogPage = this.publishedPages.find(p => (p.slug || '').toLowerCase() === 'blog' || (p.directUrl || '').toLowerCase() === 'blog');
      const blogBg = blogPage?.imageUrl || blogPage?.ImageUrl || 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1600&q=80';
      const blogTitle = blogPage?.title || 'Blog';
      const breadcrumbData = {
        title: blogTitle,
        Title: blogTitle,
        pageTitle: blogTitle,
        miniTitle: 'PUBLICATIONS',
        description: blogPage?.description || '',
        backgroundImageUrl: blogBg,
        imageUrl: blogBg,
        breadcrumbTrail: [
          { label: 'Home', url: '/', isActive: false },
          { label: blogTitle, url: '#', isActive: true }
        ],
        breadcrumbs: [
          { title: 'Home', url: '/', isActive: false },
          { title: blogTitle, url: '#', isActive: true }
        ]
      };
      breadcrumbSection = {
        id: breadcrumbTemplate.id,
        name: breadcrumbTemplate.name,
        category: 'breadcrumb',
        html: this.contentHydration.hydrate(breadcrumbTemplate.htmlTemplate, breadcrumbData, 'breadcrumb'),
        css: breadcrumbTemplate.cssStyles,
        js: breadcrumbTemplate.jsScript
      };
    }

    // 3. Blog Grid Body Section Unit
    const bodySectionsList: SectionTemplateUnit[] = [];
    const blogTemplate = this.findActiveTemplate('blog') || this.findActiveTemplate('body');
    if (blogTemplate) {
      const articlesList = this.mapBlogArticles(this.blogs);

      const blogContext = {
        title: 'Blog Articles',
        Title: 'Blog Articles',
        miniTitle: '',
        MiniTitle: '',
        description: '',
        Description: '',
        articles: articlesList,
        Articles: articlesList
      };

      bodySectionsList.push({
        id: blogTemplate.id,
        name: blogTemplate.name || 'Blog Grid',
        category: 'body',
        html: this.contentHydration.hydrate(blogTemplate.htmlTemplate, blogContext, 'blog'),
        css: blogTemplate.cssStyles,
        js: blogTemplate.jsScript,
        sortOrder: 1
      });
    }

    // 4. Footer Section Unit
    const footerTemplate = this.findActiveTemplate('footer');
    const footerSection: SectionTemplateUnit | undefined = footerTemplate ? {
      id: footerTemplate.id,
      name: footerTemplate.name,
      category: 'footer',
      html: this.hydrateFooter(footerTemplate.htmlTemplate),
      css: footerTemplate.cssStyles,
      js: footerTemplate.jsScript
    } : undefined;

    // 5. Delegate full page synthesis to HtmlAssemblerService
    const pageBundle = this.htmlAssembler.assemblePageBundle({
      pageTitle: `Blog | ${this.brandName}`,
      pageSlug: 'blog',
      metaDescription: this.brandInfo?.companyDescription,
      faviconUrl: this.brandInfo?.faviconUrl,
      codeInjections: this.allCodeInjectionsList,
      headerSection,
      breadcrumbSection,
      bodySections: bodySectionsList,
      footerSection,
      ribbonSection: this.buildRibbonSection(),
      ribonPosition: this.ribbonSettings?.position
    });

    this.finalizeRender(pageBundle.combinedStyles, pageBundle.visualBodyMarkup, pageBundle.combinedScripts);
  }

  /**
   * Helper to map raw blog entities into robust Handlebars tokens, ensuring
   * every article has a valid cover image, direct URL, author, and formatted date.
   */
  private mapBlogArticles(blogs: any[]): any[] {
    return (blogs || []).map((b) => {
      const cover = b.imageUrl || b.coverImageUrl || '';
      const pubDate = b.date ? new Date(b.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
      const categoryName = b.blogCategory?.categoryName || b.blogCategory?.title || b.categoryName || '';
      const summaryText = b.description || b.summary || b.excerpt || '';
      const articleUrl = `/blog/${b.id}`;

      return {
        id: b.id,
        title: b.title || '',
        Title: b.title || '',
        excerpt: summaryText,
        Excerpt: summaryText,
        summary: summaryText,
        Summary: summaryText,
        description: summaryText,
        Description: summaryText,
        category: categoryName,
        Category: categoryName,
        date: pubDate,
        Date: pubDate,
        publishedDate: pubDate,
        PublishedDate: pubDate,
        author: b.author || b.authorName || '',
        Author: b.author || b.authorName || '',
        authorName: b.author || b.authorName || '',
        AuthorName: b.author || b.authorName || '',
        imageUrl: cover,
        ImageUrl: cover,
        coverImageUrl: cover,
        CoverImageUrl: cover,
        directUrl: articleUrl,
        DirectUrl: articleUrl,
        url: articleUrl,
        Url: articleUrl
      };
    });
  }

  /**
   * Assembles a single Blog Article Reader view:
   * Menu + Breadcrumb Header + Article Details + Newsletter + Footer.
   */
  private composeBlogDetail(): void {
    if (!this.currentArticle) {
      this.composeNotFoundPage();
      return;
    }

    this.titleService.setTitle(`${this.currentArticle.title || 'Blog'} | ${this.brandName}`);

    // 1. Navigation Header Section Unit
    const menuTemplate = this.findActiveTemplate('menu');
    const headerSection: SectionTemplateUnit | undefined = menuTemplate ? {
      id: menuTemplate.id,
      name: menuTemplate.name,
      category: 'menu',
      html: this.hydrateMenu(menuTemplate.htmlTemplate, 'blog'),
      css: menuTemplate.cssStyles,
      js: menuTemplate.jsScript
    } : undefined;

    // 2. Breadcrumb Header Section Unit
    const defaultCover = 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&auto=format&fit=crop&q=80';
    const resolvedCover = this.currentArticle.imageUrl || this.currentArticle.coverImageUrl || defaultCover;
    const categoryTitle = this.currentArticle.blogCategory?.categoryName || this.currentArticle.blogCategory?.title || this.currentArticle.categoryName || 'Platform Insights';
    const pubDate = this.currentArticle.date
      ? new Date(this.currentArticle.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : 'Recently Published';

    const breadcrumbTemplate = this.findActiveTemplate('breadcrumb');
    let breadcrumbSection: SectionTemplateUnit | undefined;
    if (breadcrumbTemplate) {
      const breadcrumbData = {
        title: this.currentArticle.title || '',
        Title: this.currentArticle.title || '',
        pageTitle: this.currentArticle.title || '',
        miniTitle: categoryTitle,
        description: this.currentArticle.date ? `Published on ${pubDate}` : '',
        backgroundImageUrl: resolvedCover,
        imageUrl: resolvedCover,
        breadcrumbTrail: [
          { label: 'Home', url: '/', isActive: false },
          { label: 'Blog', url: '/blog', isActive: false },
          { label: this.currentArticle.title || '', url: '#', isActive: true }
        ],
        breadcrumbs: [
          { title: 'Home', url: '/', isActive: false },
          { title: 'Blog', url: '/blog', isActive: false },
          { title: this.currentArticle.title || '', url: '#', isActive: true }
        ]
      };
      breadcrumbSection = {
        id: breadcrumbTemplate.id,
        name: breadcrumbTemplate.name,
        category: 'breadcrumb',
        html: this.contentHydration.hydrate(breadcrumbTemplate.htmlTemplate, breadcrumbData, 'breadcrumb'),
        css: breadcrumbTemplate.cssStyles,
        js: breadcrumbTemplate.jsScript
      };
    }

    // 3. Article Reader Body Section Units (Checking installed blog-detail blueprint)
    const bodySectionsList: SectionTemplateUnit[] = [];
    const blogDetailTemplate = this.findActiveTemplate('blog-detail') ||
                               this.findActiveTemplate('blog_detail') ||
                               this.activeTemplates.find(t => (t.templateKey || '').toLowerCase() === 'blog_detail');

    const blogDetailContext: any = {
      title: this.currentArticle.title || 'Untitled Article',
      Title: this.currentArticle.title || 'Untitled Article',
      articleHeadline: this.currentArticle.title || 'Untitled Article',
      summary: this.currentArticle.description || '',
      articleLead: this.currentArticle.description || '',
      description: this.currentArticle.description || '',
      body: this.currentArticle.fullDescription || this.currentArticle.description || '<p>Full publication content pending release.</p>',
      fullDescription: this.currentArticle.fullDescription || this.currentArticle.description || '<p>Full publication content pending release.</p>',
      content: this.currentArticle.fullDescription || this.currentArticle.description || '<p>Full publication content pending release.</p>',
      category: categoryTitle,
      publishedDate: pubDate,
      readingTime: '5 min read',
      coverImageUrl: resolvedCover,
      imageUrl: resolvedCover,
      CoverImageUrl: resolvedCover,
      ImageUrl: resolvedCover,
      authorName: this.currentArticle.author || 'Ozikol Editorial Team',
      authorRole: 'Product Architecture',
      authorAvatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
      authorBio: 'Technology writer and systems architect contributing to sovereign multi-tenant cloud infrastructure and high-performance digital workspaces.',
      tags: [
        { name: categoryTitle, url: '/blog' },
        { name: 'Update', url: '/blog' },
        { name: 'Engineering', url: '/blog' }
      ],
      recentArticles: (this.blogs || []).filter(b => b.id !== this.currentArticle.id).slice(0, 3).map((b, idx) => {
        const otherDefaults = [
          'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&auto=format&fit=crop&q=80'
        ];
        return {
          title: b.title || '',
          url: `/blog/${b.id}`,
          coverImageUrl: b.imageUrl || otherDefaults[idx % otherDefaults.length],
          imageUrl: b.imageUrl || otherDefaults[idx % otherDefaults.length],
          publishedDate: b.date ? new Date(b.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently'
        };
      }),
      blogCategories: (this.categories || []).map(c => ({
        name: c.title || c.categoryName || '',
        url: '/blog',
        count: ''
      }))
    };

    if (blogDetailTemplate) {
      bodySectionsList.push({
        id: blogDetailTemplate.id,
        name: blogDetailTemplate.name || 'Article Detail',
        category: 'blog_detail',
        html: this.contentHydration.hydrate(blogDetailTemplate.htmlTemplate, blogDetailContext, 'blog_detail'),
        css: blogDetailTemplate.cssStyles,
        js: blogDetailTemplate.jsScript,
        sortOrder: 1
      });
    } else {
      // Clean fallback reader layout if dedicated blog-detail template is uninstalled
      bodySectionsList.push({
        name: 'Article Detail',
        category: 'body',
        html: `
          <section class="py-5 bg-white">
            <div class="container py-4">
              <div class="row justify-content-center">
                <div class="col-lg-8">
                  <div class="mb-5 rounded-4 overflow-hidden shadow-sm">
                    <img src="${resolvedCover}" alt="${this.currentArticle.title}" class="w-100 object-fit-cover" style="max-height: 440px;" />
                  </div>

                  <div class="article-body fs-5 text-secondary leading-relaxed mb-5">
                    ${this.currentArticle.fullDescription || this.currentArticle.description || '<p>Full publication content pending release.</p>'}
                  </div>

                  <div class="p-4 rounded-3 bg-light border d-flex align-items-center justify-content-between">
                    <div>
                      <span class="text-muted small d-block">Published under</span>
                      <span class="badge bg-primary fs-6 mt-1">${categoryTitle}</span>
                    </div>
                    <a href="/blog" class="btn btn-outline-primary btn-sm px-3">Back to All Articles</a>
                  </div>
                </div>
              </div>
            </div>
          </section>
        `,
        sortOrder: 1
      });
    }

    // 4. Newsletter Section (matching Demo Preview sequence)
    const newsletterTemplate = this.activeTemplates.find(t => (t.templateKey || '').toLowerCase() === 'news_minimalbar') ||
                               this.activeTemplates.find(t => (t.variantCode || '').toLowerCase() === 'news_minimalbar');
    if (newsletterTemplate) {
      const newsContext = {
        title: 'Subscribe to Executive Insights',
        miniTitle: 'NEWSLETTER',
        description: 'Receive weekly briefings, technology advisories, and organization updates directly in your inbox.'
      };
      bodySectionsList.push({
        id: newsletterTemplate.id,
        name: newsletterTemplate.name || 'Newsletter',
        category: 'body',
        html: this.contentHydration.hydrate(newsletterTemplate.htmlTemplate, newsContext, 'body'),
        css: newsletterTemplate.cssStyles,
        js: newsletterTemplate.jsScript,
        sortOrder: 2
      });
    }

    // 5. Footer Section Unit
    const footerTemplate = this.findActiveTemplate('footer');
    const footerSection: SectionTemplateUnit | undefined = footerTemplate ? {
      id: footerTemplate.id,
      name: footerTemplate.name,
      category: 'footer',
      html: this.hydrateFooter(footerTemplate.htmlTemplate),
      css: footerTemplate.cssStyles,
      js: footerTemplate.jsScript
    } : undefined;

    // 6. Synthesize Unified Page Bundle via HtmlAssemblerService
    const pageBundle = this.htmlAssembler.assemblePageBundle({
      pageTitle: `${this.currentArticle.title || 'Blog'} | ${this.brandName}`,
      pageSlug: 'blog',
      metaDescription: this.currentArticle.description || this.brandInfo?.companyDescription,
      faviconUrl: this.brandInfo?.faviconUrl,
      codeInjections: this.allCodeInjectionsList,
      headerSection,
      breadcrumbSection,
      bodySections: bodySectionsList,
      footerSection,
      ribbonSection: this.buildRibbonSection(),
      ribonPosition: this.ribbonSettings?.position
    });

    this.finalizeRender(pageBundle.combinedStyles, pageBundle.visualBodyMarkup, pageBundle.combinedScripts);
  }

  // ========================================================
  // PUBLIC COMMITTEE & SUB-GROUP REGISTRATION ORCHESTRATION
  // ========================================================

  /**
   * Fetches public committee registration or directory metadata and wraps it directly inside
   * the authentic Landing Page layout (Navbar + Breadcrumb + Body + Footer) with 100% theme fidelity.
   */
  private async fetchAndComposePublicCommittee(): Promise<void> {
    try {
      if (this.committeeGroupSlug) {
        this.committeeDirectoryMode = false;
        const res: any = await this.committeesService.getPublicCommitteeBySlug(
          this.committeeGroupSlug,
          this.committeeTenantSlug || undefined,
          this.committeeInviteToken || undefined
        ).toPromise();

        if (res?.data) {
          const data = res.data;
          this.activeCommittee = data.committee || data.Committee;
          this.committeeAliases = { ...this.committeeAliases, ...(data.aliases || data.Aliases || {}) };
          this.committeeSignedInMember = data.signedInMember || data.SignedInMember;
          if (data.brand?.brandName) {
            this.brandName = data.brand.brandName;
          }
          this.composeCommitteeRegistrationView();
        } else {
          this.composeNotFoundPage();
        }
      } else {
        this.committeeDirectoryMode = true;
        const res: any = await this.committeesService.getPublicDirectory(
          this.committeeTenantSlug || undefined
        ).toPromise();

        if (res?.data) {
          const data = res.data;
          this.openCommittees = data.committees || data.Committees || [];
          this.committeeAliases = { ...this.committeeAliases, ...(data.aliases || data.Aliases || {}) };
          this.committeeSignedInMember = data.signedInMember || data.SignedInMember;
          if (data.brand?.brandName) {
            this.brandName = data.brand.brandName;
          }
          if (this.openCommittees.length > 0) {
            this.activeCommittee = this.openCommittees[0];
            this.composeCommitteeRegistrationView();
          } else {
            this.composeNotFoundPage();
          }
        } else {
          this.composeNotFoundPage();
        }
      }
    } catch {
      this.composeNotFoundPage();
    }
  }

  /**
   * Assembles the Public Committee Registration page wrapped directly in the Landing Page shell.
   */
  private composeCommitteeRegistrationView(): void {
    if (!this.activeCommittee) {
      this.composeNotFoundPage();
      return;
    }

    const c = this.activeCommittee;
    const committeeName = c.name || 'Registration';
    const parentName = c.parentCommitteeName;

    this.titleService.setTitle(`${committeeName} | ${this.brandName}`);

    // 1. Navigation Header Section Unit (Uses exact same hydrator and template)
    const menuTemplate = this.findActiveTemplate('menu');
    const headerSection: SectionTemplateUnit | undefined = menuTemplate ? {
      id: menuTemplate.id,
      name: menuTemplate.name,
      category: 'menu',
      html: this.hydrateMenu(menuTemplate.htmlTemplate, 'join-committee'),
      css: menuTemplate.cssStyles,
      js: menuTemplate.jsScript
    } : undefined;

    // 2. Breadcrumb Header Section Unit
    const breadcrumbTemplate = this.findActiveTemplate('breadcrumb');
    let breadcrumbSection: SectionTemplateUnit | undefined;
    if (breadcrumbTemplate) {
      const coverImg = c.coverBannerUrl || c.imageUrl || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1600&q=80';
      const breadcrumbData = {
        title: committeeName,
        Title: committeeName,
        pageTitle: committeeName,
        miniTitle: parentName || this.committeeAliases.aliasPlural,
        description: c.description || c.missionStatement || '',
        backgroundImageUrl: coverImg,
        imageUrl: coverImg,
        breadcrumbTrail: [
          { label: 'Home', url: '/', isActive: false },
          { label: parentName || this.committeeAliases.aliasPlural, url: parentName ? '#' : '/join-committee', isActive: false },
          { label: committeeName, url: '#', isActive: true }
        ],
        breadcrumbs: [
          { title: 'Home', url: '/', isActive: false },
          { title: parentName || this.committeeAliases.aliasPlural, url: parentName ? '#' : '/join-committee', isActive: false },
          { title: committeeName, url: '#', isActive: true }
        ]
      };
      breadcrumbSection = {
        id: breadcrumbTemplate.id,
        name: breadcrumbTemplate.name,
        category: 'breadcrumb',
        html: this.contentHydration.hydrate(breadcrumbTemplate.htmlTemplate, breadcrumbData, 'breadcrumb'),
        css: breadcrumbTemplate.cssStyles,
        js: breadcrumbTemplate.jsScript
      };
    }

    // 3. Registration Body Section Unit
    const bodySectionsList: SectionTemplateUnit[] = [{
      name: 'Committee Registration Card',
      category: 'body',
      sortOrder: 1,
      html: this.renderCommitteeRegistrationHtml(),
      css: this.getCommitteeRegistrationStyles()
    }];

    // 4. Footer Section Unit
    const footerTemplate = this.findActiveTemplate('footer');
    const footerSection: SectionTemplateUnit | undefined = footerTemplate ? {
      id: footerTemplate.id,
      name: footerTemplate.name,
      category: 'footer',
      html: this.hydrateFooter(footerTemplate.htmlTemplate),
      css: footerTemplate.cssStyles,
      js: footerTemplate.jsScript
    } : undefined;

    // 5. Synthesize Unified Page Bundle via HtmlAssemblerService
    const pageBundle = this.htmlAssembler.assemblePageBundle({
      pageTitle: `${committeeName} | ${this.brandName}`,
      pageSlug: 'join-committee',
      metaDescription: c.description || this.brandInfo?.companyDescription,
      faviconUrl: this.brandInfo?.faviconUrl,
      codeInjections: this.allCodeInjectionsList,
      headerSection,
      breadcrumbSection,
      bodySections: bodySectionsList,
      footerSection,
      ribbonSection: this.buildRibbonSection(),
      ribonPosition: this.ribbonSettings?.position
    });

    this.finalizeRender(pageBundle.combinedStyles, pageBundle.visualBodyMarkup, pageBundle.combinedScripts);
  }

  /**
   * Renders the dynamic Committee Registration HTML card.
   */
  private renderCommitteeRegistrationHtml(): string {
    if (this.committeeSubmittedSuccess) {
      return `
        <div class="pub-main-centered-wrap">
          <div class="pub-card-state success">
            <div class="pub-success-icon-wrap">
              <span class="material-symbols-outlined">verified</span>
            </div>
            <h2>${this.committeeSubmissionStatus === 'Approved' ? 'You Are Enrolled!' : 'Application Submitted'}</h2>
            <p>${this.committeeSubmissionMessage}</p>
            <div class="pub-success-actions">
              ${this.committeeSignedInMember ? `<a href="/committees/workspace/my" class="pub-btn-primary">Open My ${this.committeeAliases.aliasPlural}</a>` : ''}
              ${!this.committeeSignedInMember && this.committeeDirectoryMode ? `<button type="button" class="pub-btn-secondary pub-btn-reset-trigger">Register for Another ${this.committeeAliases.aliasSingular}</button>` : ''}
              ${!this.committeeSignedInMember && !this.committeeDirectoryMode ? `<a href="/" class="pub-btn-secondary">Return to Website</a>` : ''}
            </div>
          </div>
        </div>
      `;
    }

    if (!this.activeCommittee) {
      return '';
    }

    const c = this.activeCommittee;
    const isSubGroup = !!c.parentCommitteeId;
    const catBadge = isSubGroup ? this.committeeAliases.subGroupAliasSingular : this.committeeAliases.aliasSingular;

    // Dropdown selector if multiple committees exist in directory
    let dirSelectorHtml = '';
    if (this.committeeDirectoryMode && this.openCommittees.length > 1) {
      const optionsHtml = this.openCommittees.map(item => `
        <option value="${item.id}" ${item.id === c.id ? 'selected' : ''}>
          ${item.name} (${item.parentCommitteeName ? 'Under ' + item.parentCommitteeName : (item.categoryTag || this.committeeAliases.aliasSingular)})
        </option>
      `).join('');

      dirSelectorHtml = `
        <div class="pub-dir-select-bar">
          <label>Select ${this.committeeAliases.aliasSingular} / ${this.committeeAliases.subGroupAliasSingular} to Join:</label>
          <select class="pub-dir-dropdown">
            ${optionsHtml}
          </select>
        </div>
      `;
    }

    // Extra-Info Form Fields
    let extraFieldsHtml = '';
    const fields: any[] = c.extraInfoForm?.fields || [];
    if (fields.length > 0) {
      const fieldsMarkup = fields.map(f => {
        const reqStar = f.isRequired ? '<span class="req">*</span>' : '';
        const reqAttr = f.isRequired ? 'required' : '';
        let inputMarkup = '';

        if (f.fieldType === 'textarea') {
          inputMarkup = `<textarea name="${f.fieldName}" rows="3" placeholder="${f.placeholder || 'e.g. Provide details here'}" ${reqAttr}>${this.committeeExtraAnswers[f.fieldName] || ''}</textarea>`;
        } else if (f.fieldType === 'number') {
          inputMarkup = `<input type="number" name="${f.fieldName}" value="${this.committeeExtraAnswers[f.fieldName] || ''}" placeholder="e.g. 0" ${reqAttr} />`;
        } else if (f.fieldType === 'date') {
          inputMarkup = `<input type="date" name="${f.fieldName}" value="${this.committeeExtraAnswers[f.fieldName] || ''}" ${reqAttr} />`;
        } else if (f.fieldType === 'select') {
          const opts = (f.options || []).map((o: string) => `<option value="${o}" ${this.committeeExtraAnswers[f.fieldName] === o ? 'selected' : ''}>${o}</option>`).join('');
          inputMarkup = `
            <select name="${f.fieldName}" ${reqAttr}>
              <option value="">-- Select an option --</option>
              ${opts}
            </select>
          `;
        } else if (f.fieldType === 'file') {
          inputMarkup = `
            <div class="pub-file-wrap">
              <input type="file" id="file-${f.fieldName}" data-field-name="${f.fieldName}" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp" style="display: none;" />
              <button type="button" class="pub-btn-upload" data-target-input="file-${f.fieldName}">
                <span class="material-symbols-outlined">upload_file</span>
                <span>${this.committeeExtraAnswers[f.fieldName] ? 'Replace Attached File' : (f.placeholder || 'Upload Document (PDF, Word, Image)')}</span>
              </button>
              ${this.committeeExtraAnswers[f.fieldName] ? `<div class="pub-uploaded-preview"><span class="material-symbols-outlined">attachment</span><a href="${this.committeeExtraAnswers[f.fieldName]}" target="_blank" rel="noopener">View Uploaded Document</a></div>` : ''}
            </div>
          `;
        } else {
          inputMarkup = `<input type="text" name="${f.fieldName}" value="${this.committeeExtraAnswers[f.fieldName] || ''}" placeholder="${f.placeholder || 'e.g. Your response'}" ${reqAttr} />`;
        }

        return `
          <div class="pub-field">
            <label>${f.label} ${reqStar}</label>
            ${inputMarkup}
            ${f.helpText ? `<small class="pub-hint">${f.helpText}</small>` : ''}
          </div>
        `;
      }).join('');

      extraFieldsHtml = `
        <div class="pub-extra-form-section">
          <div class="pub-section-divider">
            <h4>${c.extraInfoForm.title || 'Supplemental Information'}</h4>
            ${c.extraInfoForm.description ? `<p>${c.extraInfoForm.description}</p>` : ''}
          </div>
          ${fieldsMarkup}
        </div>
      `;
    }

    const errorAlertHtml = this.committeeFormError ? `
      <div class="pub-alert error">
        <span class="material-symbols-outlined">error</span>
        <span>${this.committeeFormError}</span>
      </div>
    ` : '';

    const member = this.committeeSignedInMember;
    const prefilledFirstName = member?.firstName || '';
    const prefilledLastName = member?.lastName || '';
    const prefilledEmail = member?.email || '';
    const prefilledPhone = member?.phoneNumber || '';

    return `
      <div class="pub-main-centered-wrap">
        <div class="pub-card-form">
          ${dirSelectorHtml}

          <div class="pub-card-header">
            <div class="pub-badge-schedule-row">
              <span class="pub-category-badge">${catBadge}</span>
              ${c.meetingSchedule ? `<span class="pub-schedule-badge"><span class="material-symbols-outlined">event_repeat</span><span>${c.meetingSchedule}</span></span>` : ''}
            </div>
            <h1 class="pub-form-title">${c.name}</h1>
            <p class="pub-form-desc">${c.description || c.missionStatement || 'Complete the registration form below to join.'}</p>
          </div>

          ${errorAlertHtml}

          <form class="pub-form-body">
            <div class="pub-form-row two-cols">
              <div class="pub-field">
                <label>First Name <span class="req">*</span></label>
                <input type="text" name="firstName" value="${prefilledFirstName}" placeholder="e.g. First Name" required autocomplete="given-name" />
              </div>
              <div class="pub-field">
                <label>Last Name <span class="req">*</span></label>
                <input type="text" name="lastName" value="${prefilledLastName}" placeholder="e.g. Last Name" required autocomplete="family-name" />
              </div>
            </div>

            <div class="pub-form-row two-cols">
              <div class="pub-field">
                <label>Email Address <span class="req">*</span></label>
                <input type="email" name="email" value="${prefilledEmail}" placeholder="name@company.com" required autocomplete="email" />
              </div>
              <div class="pub-field">
                <label>Phone Number</label>
                <input type="tel" name="phoneNumber" value="${prefilledPhone}" placeholder="e.g. +0 (000) 000-0000" autocomplete="tel" />
              </div>
            </div>

            ${extraFieldsHtml}

            <div class="pub-form-actions">
              <button type="submit" class="pub-btn-primary pub-submit-trigger" ${this.committeeSubmitting ? 'disabled' : ''}>
                <span class="material-symbols-outlined">${this.committeeSubmitting ? 'progress_activity' : 'how_to_reg'}</span>
                <span>${this.committeeSubmitting ? 'Submitting Registration...' : ('Complete ' + this.committeeAliases.aliasSingular + ' Registration')}</span>
              </button>
            </div>

            <div class="pub-form-footer">
              <span>Already a member of this workspace?</span>
              <a href="/auth/login">Sign in to your member portal</a>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  /**
   * Scoped CSS styles for the dynamic committee registration body card.
   */
  private getCommitteeRegistrationStyles(): string {
    return `
      .pub-main-centered-wrap {
        max-width: 680px;
        width: 100%;
        margin: 40px auto 60px auto;
        padding: 0 20px;
        box-sizing: border-box;
      }
      .pub-card-form {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 16px;
        padding: 36px 32px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);
      }
      .pub-dir-select-bar {
        margin-bottom: 24px;
        padding-bottom: 20px;
        border-bottom: 1px dashed #e2e8f0;
      }
      .pub-dir-select-bar label {
        display: block;
        font-size: 13px;
        font-weight: 700;
        color: #475569;
        margin-bottom: 8px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .pub-dir-dropdown {
        width: 100%;
        padding: 10px 14px;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        font-size: 15px;
        background: #ffffff;
        color: #0f172a;
        outline: none;
      }
      .pub-card-header {
        margin-bottom: 28px;
      }
      .pub-badge-schedule-row {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 12px;
        flex-wrap: wrap;
      }
      .pub-category-badge {
        display: inline-block;
        font-size: 11px;
        font-weight: 800;
        color: #0050e5;
        background: rgba(0, 80, 229, 0.08);
        padding: 4px 10px;
        border-radius: 6px;
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }
      .pub-schedule-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        font-weight: 600;
        color: #475569;
        background: #f1f5f9;
        padding: 4px 10px;
        border-radius: 6px;
      }
      .pub-schedule-badge .material-symbols-outlined {
        font-size: 15px;
        color: #0050e5;
      }
      .pub-form-title {
        font-size: 26px;
        font-weight: 800;
        color: #0f172a;
        margin: 0 0 8px 0;
        letter-spacing: -0.02em;
      }
      .pub-form-desc {
        font-size: 14.5px;
        line-height: 1.6;
        color: #64748b;
        margin: 0;
      }
      .pub-alert {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 16px;
        border-radius: 8px;
        margin-bottom: 20px;
        font-size: 13.5px;
        font-weight: 600;
      }
      .pub-alert.error {
        background: #fef2f2;
        color: #dc2626;
        border: 1px solid #fecaca;
      }
      .pub-form-row {
        display: flex;
        gap: 16px;
        margin-bottom: 18px;
      }
      .pub-form-row.two-cols > div {
        flex: 1;
      }
      .pub-field {
        margin-bottom: 18px;
      }
      .pub-field label {
        display: block;
        font-size: 13px;
        font-weight: 700;
        color: #1e293b;
        margin-bottom: 6px;
      }
      .pub-field label .req {
        color: #dc2626;
      }
      .pub-field input[type="text"],
      .pub-field input[type="email"],
      .pub-field input[type="tel"],
      .pub-field input[type="number"],
      .pub-field input[type="date"],
      .pub-field select,
      .pub-field textarea {
        width: 100%;
        padding: 10px 14px;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        font-size: 14px;
        color: #0f172a;
        background: #ffffff;
        box-sizing: border-box;
        transition: border-color 0.2s ease;
      }
      .pub-field input:focus,
      .pub-field select:focus,
      .pub-field textarea:focus {
        border-color: #0050e5;
        outline: none;
      }
      .pub-field .pub-hint {
        display: block;
        margin-top: 4px;
        font-size: 12px;
        color: #64748b;
      }
      .pub-extra-form-section {
        margin-top: 24px;
        padding-top: 20px;
        border-top: 1px solid #e2e8f0;
      }
      .pub-section-divider {
        margin-bottom: 18px;
      }
      .pub-section-divider h4 {
        font-size: 16px;
        font-weight: 800;
        color: #0f172a;
        margin: 0 0 4px 0;
      }
      .pub-section-divider p {
        font-size: 13px;
        color: #64748b;
        margin: 0;
      }
      .pub-file-wrap {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .pub-btn-upload {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 10px 18px;
        border: 1px dashed #cbd5e1;
        border-radius: 8px;
        background: #f8fafc;
        color: #475569;
        font-size: 13.5px;
        font-weight: 600;
        cursor: pointer;
        width: 100%;
        justify-content: center;
        box-sizing: border-box;
        transition: all 0.2s ease;
      }
      .pub-btn-upload:hover {
        background: #f1f5f9;
        border-color: #0050e5;
        color: #0050e5;
      }
      .pub-uploaded-preview {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 12.5px;
        color: #10b981;
        font-weight: 600;
      }
      .pub-uploaded-preview a {
        color: #0050e5;
        text-decoration: underline;
      }
      .pub-form-actions {
        margin-top: 28px;
      }
      .pub-btn-primary {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        width: 100%;
        padding: 13px 20px;
        background: #0050e5;
        color: #ffffff !important;
        border: none;
        border-radius: 8px;
        font-size: 15px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 4px 12px rgba(0, 80, 229, 0.25);
        text-decoration: none;
        box-sizing: border-box;
      }
      .pub-btn-primary:hover:not(:disabled) {
        background: #003db3;
        transform: translateY(-1px);
        box-shadow: 0 6px 16px rgba(0, 80, 229, 0.35);
      }
      .pub-btn-primary:disabled {
        opacity: 0.65;
        cursor: not-allowed;
      }
      .pub-form-footer {
        display: flex;
        justify-content: center;
        gap: 6px;
        margin-top: 20px;
        font-size: 13.5px;
        color: #64748b;
      }
      .pub-form-footer a {
        color: #0050e5;
        font-weight: 600;
        text-decoration: none;
      }
      .pub-card-state.success {
        text-align: center;
        padding: 48px 32px;
        background: #ffffff;
        border-radius: 16px;
        border: 1px solid #e2e8f0;
      }
      .pub-success-icon-wrap {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 72px;
        height: 72px;
        background: rgba(16, 185, 129, 0.12);
        color: #10b981;
        border-radius: 50%;
        margin-bottom: 20px;
      }
      .pub-success-icon-wrap .material-symbols-outlined {
        font-size: 40px;
      }
      .pub-card-state.success h2 {
        font-size: 26px;
        font-weight: 800;
        color: #0f172a;
        margin: 0 0 10px 0;
      }
      .pub-card-state.success p {
        font-size: 15px;
        line-height: 1.6;
        color: #64748b;
        max-width: 480px;
        margin: 0 auto 28px auto;
      }
      .pub-success-actions {
        display: flex;
        gap: 12px;
        justify-content: center;
        flex-wrap: wrap;
      }
      .pub-btn-secondary {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 11px 20px;
        background: #f1f5f9;
        color: #334155 !important;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        text-decoration: none;
        transition: all 0.2s ease;
      }
      .pub-btn-secondary:hover {
        background: #e2e8f0;
        color: #0f172a !important;
      }
    `;
  }

  /**
   * Submits the dynamic public committee registration form.
   */
  private handleCommitteeFormSubmit(form: HTMLFormElement): void {
    if (this.committeeSubmitting || !this.activeCommittee) return;

    const fd = new FormData(form);
    const firstName = String(fd.get('firstName') || '').trim();
    const lastName = String(fd.get('lastName') || '').trim();
    const email = String(fd.get('email') || '').trim();
    const phoneNumber = String(fd.get('phoneNumber') || '').trim();

    if (!firstName || !lastName || !email) {
      this.committeeFormError = 'Please fill out all required personal information fields.';
      this.composeCommitteeRegistrationView();
      return;
    }

    const extraResponses: Record<string, any> = { ...this.committeeExtraAnswers };
    const fields: any[] = this.activeCommittee.extraInfoForm?.fields || [];
    for (const f of fields) {
      if (f.fieldType !== 'file') {
        const val = fd.get(f.fieldName);
        if (val !== null && val !== undefined) {
          extraResponses[f.fieldName] = String(val).trim();
        }
      }
      if (f.isRequired && (!extraResponses[f.fieldName] || String(extraResponses[f.fieldName]).trim() === '')) {
        this.committeeFormError = `Please complete the required field: ${f.label}`;
        this.composeCommitteeRegistrationView();
        return;
      }
    }

    this.committeeSubmitting = true;
    this.committeeFormError = '';
    this.composeCommitteeRegistrationView();

    const payload = {
      committeeId: this.activeCommittee.id,
      inviteToken: this.committeeInviteToken || undefined,
      firstName,
      lastName,
      email,
      phoneNumber,
      extraInfoResponses: extraResponses,
      attachmentUrls: this.committeeAttachmentUrls
    };

    this.committeesService.submitPublicRegistration(payload, this.committeeTenantSlug || undefined).subscribe({
      next: (res: any) => {
        this.committeeSubmitting = false;
        if (res?.isSuccess) {
          this.committeeSubmittedSuccess = true;
          this.committeeSubmissionStatus = res.data?.status || 'Approved';
          this.committeeSubmissionMessage = res.message || 'Your registration has been submitted successfully.';
          this.composeCommitteeRegistrationView();
        } else {
          this.committeeFormError = res?.message || 'Registration could not be completed.';
          this.composeCommitteeRegistrationView();
        }
      },
      error: (err: any) => {
        this.committeeSubmitting = false;
        this.committeeFormError = err?.error?.message || 'An error occurred during registration. Please review and try again.';
        this.composeCommitteeRegistrationView();
      }
    });
  }

  /**
   * Resets committee registration state to allow applying for another group.
   */
  private resetCommitteeRegistration(): void {
    this.committeeSubmittedSuccess = false;
    this.committeeSubmissionStatus = '';
    this.committeeSubmissionMessage = '';
    this.committeeExtraAnswers = {};
    this.committeeAttachmentUrls = [];
    this.committeeFormError = '';
    this.composeCommitteeRegistrationView();
  }

  /**
   * Uploads an intake file attachment for the public committee registration form.
   */
  private handleCommitteeFileUpload(file: File, fieldName: string): void {
    this.committeeFormError = '';
    this.committeesService.uploadPublicAttachment(file, this.committeeTenantSlug || undefined).subscribe({
      next: (res: any) => {
        if (res?.isSuccess && res.data?.fileUrl) {
          this.committeeExtraAnswers[fieldName] = res.data.fileUrl;
          if (!this.committeeAttachmentUrls.includes(res.data.fileUrl)) {
            this.committeeAttachmentUrls.push(res.data.fileUrl);
          }
          this.composeCommitteeRegistrationView();
        } else {
          this.committeeFormError = res?.message || 'Attachment upload failed.';
          this.composeCommitteeRegistrationView();
        }
      },
      error: (err: any) => {
        this.committeeFormError = err?.error?.message || 'Attachment upload failed.';
        this.composeCommitteeRegistrationView();
      }
    });
  }

  @HostListener('change', ['$event'])
  onGlobalChange(e: Event): void {
    const target = e.target as HTMLElement;
    if (!target) return;
    if (target.classList.contains('pub-dir-dropdown')) {
      const select = target as HTMLSelectElement;
      const selectedId = select.value;
      const match = this.openCommittees.find(c => c.id === selectedId);
      if (match) {
        this.activeCommittee = match;
        this.composeCommitteeRegistrationView();
      }
    }
  }



  /**
   * Fallback 404 handler for missing pages.
   */
  private composeNotFoundPage(): void {
    this.titleService.setTitle(`Page Not Found | ${this.brandName}`);
    const menuTemplate = this.findActiveTemplate('menu');
    const headerSection: SectionTemplateUnit | undefined = menuTemplate ? {
      id: menuTemplate.id,
      name: menuTemplate.name,
      category: 'menu',
      html: this.hydrateMenu(menuTemplate.htmlTemplate, ''),
      css: menuTemplate.cssStyles,
      js: menuTemplate.jsScript
    } : undefined;

    const bodySectionsList: SectionTemplateUnit[] = [{
      name: '404 Not Found',
      category: 'body',
      html: `
        <section class="oz-404-section">
          <div class="oz-404-wrapper">
            <!-- Status Badge -->
            <div class="oz-404-badge">
              <span class="oz-404-badge-dot"></span>
              <span class="oz-404-badge-text">ERROR 404 &bull; SIGNAL LOST</span>
            </div>

            <!-- Animated SVG Illustration: Floating Explorer & Planetary Beacon -->
            <div class="oz-404-graphic">
              <svg viewBox="0 0 500 340" fill="none" xmlns="http://www.w3.org/2000/svg" class="oz-404-svg" aria-label="Page Not Found Illustration">
                <defs>
                  <linearGradient id="ozGlobeGrad" x1="130" y1="100" x2="290" y2="260" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stop-color="#38bdf8"/>
                    <stop offset="50%" stop-color="#2563eb"/>
                    <stop offset="100%" stop-color="#1e40af"/>
                  </linearGradient>
                  <radialGradient id="ozGlobeHalo" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.35"/>
                    <stop offset="100%" stop-color="#38bdf8" stop-opacity="0"/>
                  </radialGradient>
                  <linearGradient id="ozVisorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#38bdf8"/>
                    <stop offset="100%" stop-color="#0284c7"/>
                  </linearGradient>
                  <linearGradient id="ozSuitGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="#ffffff"/>
                    <stop offset="100%" stop-color="#e2e8f0"/>
                  </linearGradient>
                </defs>

                <!-- Distant Twinkling Stars -->
                <g class="oz-stars-group">
                  <polygon points="70,60 72,66 78,68 72,70 70,76 68,70 62,68 68,66" fill="#38bdf8" class="oz-star oz-anim-star-1"/>
                  <polygon points="430,75 432,79 436,80 432,81 430,85 428,81 424,80 428,79" fill="#818cf8" class="oz-star oz-anim-star-2"/>
                  <polygon points="100,240 101,244 105,245 101,246 100,250 99,246 95,245 99,244" fill="#60a5fa" class="oz-star oz-anim-star-3"/>
                  <circle cx="55" cy="160" r="2.5" fill="#cbd5e1" class="oz-star oz-anim-star-2"/>
                  <circle cx="445" cy="190" r="3" fill="#38bdf8" class="oz-star oz-anim-star-1"/>
                  <circle cx="150" cy="50" r="2" fill="#94a3b8" class="oz-star oz-anim-star-3"/>
                  <circle cx="365" cy="270" r="2.5" fill="#60a5fa" class="oz-star oz-anim-star-2"/>
                  <circle cx="270" cy="45" r="2" fill="#38bdf8" class="oz-star oz-anim-star-1"/>
                </g>

                <!-- Globe Ambient Glow -->
                <circle cx="210" cy="175" r="115" fill="url(#ozGlobeHalo)" class="oz-anim-pulse"/>

                <!-- Pulsing Radar Signal Waves -->
                <circle cx="210" cy="175" r="110" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="5 7" opacity="0.4" class="oz-anim-radar-1" fill="none"/>
                <circle cx="210" cy="175" r="135" stroke="#60a5fa" stroke-width="1" stroke-dasharray="3 5" opacity="0.25" class="oz-anim-radar-2" fill="none"/>

                <!-- Central Global Sphere -->
                <circle cx="210" cy="175" r="82" fill="url(#ozGlobeGrad)"/>

                <!-- Latitude Grid Lines -->
                <ellipse cx="210" cy="175" rx="82" ry="28" stroke="#bae6fd" stroke-width="1.5" stroke-opacity="0.55" fill="none"/>
                <ellipse cx="210" cy="175" rx="82" ry="58" stroke="#bae6fd" stroke-width="1.5" stroke-opacity="0.55" fill="none"/>

                <!-- Longitude Grid Lines -->
                <ellipse cx="210" cy="175" rx="40" ry="82" stroke="#bae6fd" stroke-width="1.5" stroke-opacity="0.55" fill="none"/>
                <line x1="210" y1="93" x2="210" y2="257" stroke="#bae6fd" stroke-width="1.5" stroke-opacity="0.55"/>

                <!-- Angled Planetary Orbital Track & Satellite -->
                <g transform="rotate(-18 210 175)">
                  <ellipse cx="210" cy="175" rx="120" ry="42" stroke="#38bdf8" stroke-width="1.75" stroke-dasharray="6 6" fill="none" opacity="0.6"/>
                  <!-- Orbiting Beacon / Satellite -->
                  <g transform="translate(328, 175)">
                    <circle cx="0" cy="0" r="5" fill="#38bdf8"/>
                    <circle cx="0" cy="0" r="8" stroke="#38bdf8" stroke-width="1.5" opacity="0.5" class="oz-anim-pulse"/>
                  </g>
                </g>

                <!-- Floating Astronaut / Navigator -->
                <g class="oz-anim-man">
                  <!-- Life Support Backpack -->
                  <rect x="300" y="112" width="28" height="64" rx="8" fill="#64748b"/>
                  <rect x="302" y="118" width="10" height="18" rx="3" fill="#94a3b8"/>
                  <path d="M312 128 C298 138 298 162 312 172" stroke="#38bdf8" stroke-width="3" fill="none" stroke-linecap="round"/>

                  <!-- Suit Torso -->
                  <rect x="318" y="122" width="48" height="62" rx="16" fill="url(#ozSuitGrad)" stroke="#cbd5e1" stroke-width="2"/>
                  <!-- Mission Control Chest Badge -->
                  <rect x="330" y="136" width="24" height="18" rx="4" fill="#0f172a"/>
                  <circle cx="336" cy="145" r="2" fill="#ef4444"/>
                  <circle cx="342" cy="145" r="2" fill="#10b981"/>
                  <circle cx="348" cy="145" r="2" fill="#38bdf8"/>

                  <!-- Left Arm with Navigation Scanner -->
                  <path d="M318 135 L288 146 L274 140" stroke="#f1f5f9" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
                  <!-- Scanner Device -->
                  <rect x="260" y="130" width="16" height="22" rx="4" fill="#1e293b" transform="rotate(-12 260 130)"/>
                  <rect x="263" y="133" width="11" height="13" rx="2" fill="#38bdf8" transform="rotate(-12 260 130)"/>
                  <!-- Radar Wave emitted from scanner -->
                  <path d="M251 134 C247 137 247 143 251 146" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" fill="none" class="oz-anim-pulse"/>

                  <!-- Right Arm floating gently upward -->
                  <path d="M366 135 L390 120 L402 108" stroke="#e2e8f0" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
                  <circle cx="405" cy="106" r="6" fill="#94a3b8"/>

                  <!-- Left Leg & Boot -->
                  <path d="M328 184 L320 220 L310 226" stroke="#e2e8f0" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M305 226 L320 226" stroke="#475569" stroke-width="10" stroke-linecap="round"/>

                  <!-- Right Leg & Boot -->
                  <path d="M352 184 L360 216 L372 222" stroke="#cbd5e1" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M366 222 L382 222" stroke="#334155" stroke-width="10" stroke-linecap="round"/>

                  <!-- Astronaut Helmet -->
                  <circle cx="342" cy="100" r="26" fill="url(#ozSuitGrad)" stroke="#cbd5e1" stroke-width="2"/>
                  <!-- Visor Screen -->
                  <path d="M328 97 C328 85 356 85 356 97 C356 110 328 110 328 97 Z" fill="url(#ozVisorGrad)"/>
                  <!-- Visor Glint -->
                  <ellipse cx="336" cy="94" rx="5" ry="2.5" fill="#ffffff" opacity="0.85" transform="rotate(-20 336 94)"/>
                </g>
              </svg>
            </div>

            <!-- Content Headings -->
            <h1 class="oz-404-title">Lost in Digital Space</h1>
            <p class="oz-404-description">
              The page you are looking for does not exist, has been relocated, or has drifted out of orbit.
            </p>

            <!-- Navigation Recovery Actions -->
            <div class="oz-404-actions">
              <a href="/" class="oz-404-btn oz-404-btn-primary">
                <svg class="oz-404-btn-icon" viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
                </svg>
                <span>Return to Homepage</span>
              </a>
              <a href="javascript:history.back()" class="oz-404-btn oz-404-btn-secondary">
                <svg class="oz-404-btn-icon" viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                  <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd"/>
                </svg>
                <span>Go Back</span>
              </a>
            </div>

            <!-- Quick Help Link -->
            <div class="oz-404-footer-hint">
              <span>Need navigation assistance?</span>
              <a href="/contact" class="oz-404-link">Contact Support &rarr;</a>
            </div>
          </div>
        </section>
      `,
      css: `
        .oz-404-section {
          min-height: calc(80vh - 120px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 60px 24px;
          background: radial-gradient(circle at 50% 25%, rgba(56, 189, 248, 0.08) 0%, rgba(255, 255, 255, 0) 70%), #ffffff;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          color: #0f172a;
          box-sizing: border-box;
          width: 100%;
        }

        .oz-404-wrapper {
          max-width: 600px;
          width: 100%;
          margin: 0 auto;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .oz-404-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 16px;
          border-radius: 9999px;
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.22);
          margin-bottom: 20px;
        }

        .oz-404-badge-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: #ef4444;
          box-shadow: 0 0 8px rgba(239, 68, 68, 0.6);
          animation: ozDotPulse 1.8s infinite ease-in-out;
        }

        .oz-404-badge-text {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: #dc2626;
          text-transform: uppercase;
        }

        .oz-404-graphic {
          width: 100%;
          max-width: 440px;
          margin: 0 auto 24px auto;
          position: relative;
        }

        .oz-404-svg {
          width: 100%;
          height: auto;
          display: block;
          overflow: visible;
        }

        .oz-404-title {
          font-size: 32px;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 12px 0;
          line-height: 1.25;
          letter-spacing: -0.02em;
        }

        @media (min-width: 640px) {
          .oz-404-title {
            font-size: 40px;
          }
        }

        .oz-404-description {
          font-size: 16px;
          color: #64748b;
          margin: 0 0 32px 0;
          line-height: 1.6;
          max-width: 480px;
        }

        .oz-404-actions {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: center;
          gap: 14px;
          margin-bottom: 28px;
        }

        .oz-404-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 26px;
          font-size: 15px;
          font-weight: 600;
          border-radius: 10px;
          text-decoration: none;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          cursor: pointer;
          box-sizing: border-box;
        }

        .oz-404-btn-primary {
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          color: #ffffff !important;
          border: 1px solid transparent;
          box-shadow: 0 4px 14px rgba(37, 99, 235, 0.3);
        }

        .oz-404-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 22px rgba(37, 99, 235, 0.42);
          background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
          color: #ffffff !important;
        }

        .oz-404-btn-secondary {
          background: #ffffff;
          color: #334155 !important;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .oz-404-btn-secondary:hover {
          transform: translateY(-2px);
          background: #f8fafc;
          border-color: #cbd5e1;
          color: #0f172a !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }

        .oz-404-footer-hint {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 14px;
          color: #94a3b8;
        }

        .oz-404-link {
          color: #2563eb;
          font-weight: 600;
          text-decoration: none;
          transition: color 0.15s ease;
        }

        .oz-404-link:hover {
          color: #1d4ed8;
          text-decoration: underline;
        }

        /* Animations */
        .oz-anim-man {
          animation: ozFloat 5s ease-in-out infinite;
          transform-origin: 340px 170px;
        }

        .oz-anim-pulse {
          animation: ozPulse 3s ease-in-out infinite;
          transform-origin: 210px 175px;
        }

        .oz-anim-radar-1 {
          animation: ozRadar 3.5s ease-out infinite;
          transform-origin: 210px 175px;
        }

        .oz-anim-radar-2 {
          animation: ozRadar 3.5s ease-out infinite 1.2s;
          transform-origin: 210px 175px;
        }

        .oz-anim-star-1 {
          animation: ozTwinkle 2.5s ease-in-out infinite;
        }

        .oz-anim-star-2 {
          animation: ozTwinkle 3.2s ease-in-out infinite 0.8s;
        }

        .oz-anim-star-3 {
          animation: ozTwinkle 2.8s ease-in-out infinite 1.5s;
        }

        @keyframes ozFloat {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-12px) rotate(2deg);
          }
        }

        @keyframes ozPulse {
          0%, 100% {
            transform: scale(0.96);
            opacity: 0.25;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.55;
          }
        }

        @keyframes ozRadar {
          0% {
            transform: scale(0.85);
            opacity: 0.8;
          }
          100% {
            transform: scale(1.25);
            opacity: 0;
          }
        }

        @keyframes ozTwinkle {
          0%, 100% {
            opacity: 0.25;
            transform: scale(0.8);
          }
          50% {
            opacity: 1;
            transform: scale(1.2);
          }
        }

        @keyframes ozDotPulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.3);
            opacity: 0.6;
          }
        }
      `,
      sortOrder: 1
    }];

    const footerTemplate = this.findActiveTemplate('footer');
    const footerSection: SectionTemplateUnit | undefined = footerTemplate ? {
      id: footerTemplate.id,
      name: footerTemplate.name,
      category: 'footer',
      html: this.hydrateFooter(footerTemplate.htmlTemplate),
      css: footerTemplate.cssStyles,
      js: footerTemplate.jsScript
    } : undefined;

    const pageBundle = this.htmlAssembler.assemblePageBundle({
      pageTitle: `Page Not Found | ${this.brandName}`,
      pageSlug: '404',
      codeInjections: this.allCodeInjectionsList,
      headerSection,
      bodySections: bodySectionsList,
      footerSection,
      ribbonSection: this.buildRibbonSection(),
      ribonPosition: this.ribbonSettings?.position
    });

    this.finalizeRender(pageBundle.combinedStyles, pageBundle.visualBodyMarkup, pageBundle.combinedScripts);
  }

  /**
   * Assembles the "Start Building Now" onboarding view when the tenant workspace
   * has zero installed templates and zero published content/sections (pure blank canvas).
   * Displays clear call-to-action to sign in and begin configuring the site.
   */
  private composeBlankCanvasWelcome(): void {
    const brand = this.brandName || this.brandInfo?.brandName || 'Digital Workspace';
    const logoUrl = this.brandLogoUrl || this.brandInfo?.logoUrl || '';
    const currentYear = new Date().getFullYear().toString();
    const authed = this.isUserAuthenticated();
    const isAdmin = authed && this.isUserAdmin();
    const loginUrl = authed ? (isAdmin ? '/dashboard/console' : '/dashboard/workspace') : '/auth/login';
    const loginText = authed ? (isAdmin ? 'Go to Admin Console' : 'Go to Workspace') : 'Login to Continue';

    this.titleService.setTitle(`Start Building Now | ${brand}`);

    const welcomeHtml = `
      <div id="oz-blank-canvas-root" class="oz-blank-canvas-wrap">
        <div class="oz-blank-canvas-card">
          <div class="oz-blank-brand mb-4">
            ${logoUrl ? `<img src="${logoUrl}" alt="${brand}" class="oz-blank-logo" />` : `<div class="oz-blank-brand-badge">${brand.substring(0, 2).toUpperCase()}</div>`}
            <h2 class="oz-blank-brand-name">${brand}</h2>
          </div>

          <div class="oz-blank-status-pill">
            <span class="oz-blank-status-dot"></span>
            <span>Workspace Initialized & Ready</span>
          </div>

          <h1 class="oz-blank-title">Start Building Now</h1>
          <p class="oz-blank-subtitle">
            Your workspace is ready. Sign in to your admin console to choose a template, design custom pages, and launch your site.
          </p>

          <div class="oz-blank-actions">
            <a id="btn-blank-login-continue" href="${loginUrl}" class="oz-blank-btn-primary">
              <span>${loginText}</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </a>
          </div>

          <div class="oz-blank-footer">
            <span>© ${currentYear} ${brand}. Powered by <a href="https://ozikol.cloud" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: underline; font-weight: 600;">Ozikol</a>.</span>
          </div>
        </div>
      </div>
    `;

    const welcomeCss = `
      .oz-blank-canvas-wrap {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 40px 20px;
        background: radial-gradient(circle at 50% 20%, #f8fafc 0%, #e2e8f0 100%);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        box-sizing: border-box;
      }

      .oz-blank-canvas-card {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 20px;
        padding: 48px 40px;
        max-width: 560px;
        width: 100%;
        text-align: center;
        box-shadow: 0 20px 40px -15px rgba(15, 23, 42, 0.08), 0 0 1px 1px rgba(15, 23, 42, 0.04);
        position: relative;
        overflow: hidden;
      }

      .oz-blank-canvas-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: linear-gradient(90deg, #2563eb, #3b82f6, #60a5fa);
      }

      .oz-blank-brand {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
      }

      .oz-blank-logo {
        max-height: 48px;
        max-width: 180px;
        object-fit: contain;
      }

      .oz-blank-brand-badge {
        width: 56px;
        height: 56px;
        border-radius: 14px;
        background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
        color: #ffffff;
        font-size: 20px;
        font-weight: 800;
        display: flex;
        align-items: center;
        justify-content: center;
        letter-spacing: -0.02em;
        box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
      }

      .oz-blank-brand-name {
        font-size: 18px;
        font-weight: 700;
        color: #334155;
        margin: 0;
        letter-spacing: -0.01em;
      }

      .oz-blank-status-pill {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 6px 14px;
        background: #f0fdf4;
        border: 1px solid #bbf7d0;
        border-radius: 9999px;
        font-size: 13px;
        font-weight: 600;
        color: #166534;
        margin-bottom: 24px;
      }

      .oz-blank-status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #22c55e;
        display: inline-block;
        box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.2);
        animation: ozBlankPulse 2s infinite ease-in-out;
      }

      @keyframes ozBlankPulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.3); opacity: 0.6; }
      }

      .oz-blank-title {
        font-size: 32px;
        font-weight: 800;
        color: #0f172a;
        margin: 0 0 12px 0;
        letter-spacing: -0.03em;
        line-height: 1.2;
      }

      .oz-blank-subtitle {
        font-size: 15px;
        line-height: 1.6;
        color: #64748b;
        margin: 0 0 32px 0;
      }

      .oz-blank-actions {
        display: flex;
        justify-content: center;
        margin-bottom: 32px;
      }

      .oz-blank-btn-primary {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        padding: 14px 32px;
        font-size: 15px;
        font-weight: 600;
        border-radius: 12px;
        background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
        color: #ffffff !important;
        text-decoration: none;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        box-shadow: 0 6px 18px rgba(37, 99, 235, 0.3);
      }

      .oz-blank-btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 24px rgba(37, 99, 235, 0.4);
        background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
      }

      .oz-blank-footer {
        font-size: 12px;
        color: #94a3b8;
        border-top: 1px solid #f1f5f9;
        padding-top: 20px;
      }

      @media (max-width: 640px) {
        .oz-blank-canvas-card {
          padding: 36px 24px;
        }
        .oz-blank-title {
          font-size: 26px;
        }
      }
    `;

    this.finalizeRender(welcomeCss, welcomeHtml, '');
  }

  // ========================================================
  // HYDRATION CONTEXT HELPERS
  // ========================================================

  /**
   * Hydrates the active Navbar template with live navigation categories, child links,
   * top menu pages, CTA buttons, and active link highlights via ContentHydrationService.
   */
  private hydrateMenu(rawHtml: string, activeSlug: string): string {
    const isLoginActive = this.brandInfo?.activateLogin !== false;
    const isLoginInMenu = this.brandInfo?.activateLoginInMenu !== false;
    const authed = this.isUserAuthenticated();
    const isAdmin = authed && this.isUserAdmin();
    const isMember = authed && !isAdmin;

    const loginText = !authed 
      ? (this.brandInfo?.loginButtonText || 'Sign In') 
      : (isAdmin ? 'Console' : 'My Workspace');
    const loginUrl = !authed 
      ? '/auth/login' 
      : (isAdmin ? '/dashboard/console' : '/dashboard/workspace');

    // Helper to normalize zone ('first' | 'middle' | 'last' | 'top')
    const normalizeZone = (val: any): string => {
      if (!val) return 'first';
      const s = String(val).toLowerCase();
      if (s.includes('mid') || s === '2') return 'middle';
      if (s.includes('last') || s === '3' || s.includes('right')) return 'last';
      if (s.includes('top') || s === '4') return 'top';
      return 'first';
    };

    // 1. Build distinct dropdown categories (only those with active child pages)
    const dropdownItems: any[] = [];
    const usedUrls = new Set<string>();

    (this.categories || [])
      .filter(c => c.publish !== false && c.Publish !== false && c.showInMenu !== false && c.ShowInMenu !== false)
      .forEach(c => {
        const catTitle = c.title || c.categoryName || c.name || c.Title || c.CategoryName || 'Menu';
        const rawWebPages = c.webPages || c.WebPages || [];
        const childPages = (rawWebPages && rawWebPages.length > 0)
          ? rawWebPages.filter((p: any) => p.publish !== false && p.Publish !== false && p.showInMenuDropDown !== false && p.ShowInMenuDropDown !== false)
          : (this.publishedPages || []).filter(p => (p.publish !== false && p.Publish !== false) && 
              (p.showInMenuDropDown !== false && p.ShowInMenuDropDown !== false) && 
              (p.pageCategoryId === c.id || p.pageCategoryId === c.Id));

        if (!childPages || childPages.length === 0) return;

        const pagesList = childPages.map((p: any) => {
          const pUrl = `/${(p.directUrl || p.slug || p.DirectUrl || p.Slug || '').replace(/^\/+/, '')}`;
          usedUrls.add(pUrl.toLowerCase());
          return {
            title: p.title || p.Title || p.pageTitle || p.PageTitle || '',
            url: pUrl,
            customClass: p.customClass || p.CustomClass || '',
            sortOrder: p.dropdownSortOrder || p.DropdownSortOrder || p.sortOrder || p.SortOrder || 0
          };
        });

        dropdownItems.push({
          title: catTitle,
          url: '#',
          isDropdown: true,
          publish: true,
          showInMainMenu: true,
          pages: pagesList,
          zone: normalizeZone(c.menuPosition ?? c.MenuPosition ?? 1),
          sortOrder: c.menuSortOrder !== undefined ? c.menuSortOrder : (c.MenuSortOrder !== undefined ? c.MenuSortOrder : (c.sortOrder || 0)),
          customClass: c.customClass || c.CustomClass || ''
        });
      });

    // 2. Build standalone menu items (excluding URLs already contained in dropdowns)
    const standaloneItems: any[] = [];
    (this.publishedPages || [])
      .filter(p => (p.publish !== false && p.Publish !== false) && 
                   (p.showInMainMenu === true || p.ShowInMainMenu === true || p.showInMenu === true || p.ShowInMenu === true) && 
                   !p.isLegal && !p.pageCategoryId && !p.isMenuCTA)
      .forEach(p => {
        const rawUrl = (p.directUrl || p.slug || p.DirectUrl || p.Slug || '').replace(/^\/+/, '');
        const pUrl = (rawUrl === '' || rawUrl.toLowerCase() === 'home') ? '/' : `/${rawUrl}`;
        const pLower = pUrl.toLowerCase();

        // Avoid duplicating if URL is already in a dropdown or already added
        if (pLower !== '/' && usedUrls.has(pLower)) return;
        if (usedUrls.has(pLower)) return;
        usedUrls.add(pLower);

        const pTitle = p.title || p.Title || p.pageTitle || p.PageTitle || '';
        standaloneItems.push({
          title: pTitle,
          url: pUrl,
          isDropdown: false,
          publish: true,
          showInMainMenu: true,
          pages: [],
          zone: normalizeZone(p.menuPosition ?? p.MenuPosition ?? 1),
          sortOrder: (p.mainMenuSortOrder !== undefined && p.mainMenuSortOrder !== 0) ? p.mainMenuSortOrder : ((p.MainMenuSortOrder !== undefined && p.MainMenuSortOrder !== 0) ? p.MainMenuSortOrder : (p.sortOrder !== undefined ? p.sortOrder : (p.SortOrder !== undefined ? p.SortOrder : 0))),
          customClass: p.customClass || p.CustomClass || ''
        });
      });

    // Combine into navigationMenu list
    const navigationMenu = [...standaloneItems, ...dropdownItems].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

    // 3. TopBar Utility Pages
    const topBarPages = (this.publishedPages || [])
      .filter(p => (p.publish !== false && p.Publish !== false) && (normalizeZone(p.menuPosition) === 'top' || p.showInMenuTopBar === true || p.showInTopBar === true))
      .sort((a, b) => (a.topBarSortOrder || a.TopBarSortOrder || a.sortOrder || 0) - (b.topBarSortOrder || b.TopBarSortOrder || b.sortOrder || 0))
      .map(p => ({
        title: p.title || p.Title || '',
        url: `/${(p.directUrl || p.slug || '').replace(/^\/+/, '')}`,
        customClass: p.customClass || ''
      }));

    // 4. CTA Buttons: Driven purely from publishedPages where isMenuCTA is true
    const menuCtaButtons = (this.publishedPages || [])
      .filter(p => (p.isMenuCTA || p.IsMenuCTA) && p.publish !== false && p.Publish !== false)
      .sort((a, b) => (a.sortOrder || a.SortOrder || 0) - (b.sortOrder || b.SortOrder || 0))
      .map(p => {
        const isAuthDirect = (p.directUrl || p.slug || '').toLowerCase().includes('login') || (p.title || '').toLowerCase().includes('sign in');
        const ctaTitle = isAuthDirect && authed ? (isAdmin ? 'Admin Console' : 'Member Portal') : (p.menuCtaText || p.MenuCtaText || p.title || p.Title || '');
        const ctaUrl = isAuthDirect && authed ? (isAdmin ? '/dashboard/console' : '/dashboard/workspace') : (p.menuCtaUrl || p.MenuCtaUrl || `/${(p.directUrl || p.slug || '').replace(/^\/+/, '')}`);
        const ctaStyle = p.menuCtaStyle || p.MenuCtaStyle || p.buttonClass || (isAuthDirect ? 'oz-btn-ghost' : 'oz-btn-primary');
        return {
          title: ctaTitle,
          url: ctaUrl,
          buttonClass: ctaStyle.startsWith('oz-btn-') ? ctaStyle : `oz-btn-${ctaStyle}`,
          customClass: p.customClass || p.CustomClass || (isAuthDirect ? 'oz-login-cta' : '')
        };
      });

    const channels: any[] = this.brandInfo?.contactChannels || [];
    const defaultEmailChannel = channels.find((c: any) => c.channelType?.toLowerCase() === 'email' && c.isDefault) || channels.find((c: any) => c.channelType?.toLowerCase() === 'email');
    const defaultPhoneChannel = channels.find((c: any) => c.channelType?.toLowerCase() === 'phone' && c.isDefault) || channels.find((c: any) => c.channelType?.toLowerCase() === 'phone');
    const defaultAddressChannel = channels.find((c: any) => c.channelType?.toLowerCase() === 'address' && c.isDefault) || channels.find((c: any) => c.channelType?.toLowerCase() === 'address');
    const defaultHoursChannel = channels.find((c: any) => (c.channelType?.toLowerCase() === 'hours' || c.channelType?.toLowerCase() === 'workinghours') && c.isDefault) || channels.find((c: any) => c.channelType?.toLowerCase() === 'hours' || c.channelType?.toLowerCase() === 'workinghours');
    const socialLinks = channels.filter((c: any) => c.channelType?.toLowerCase() === 'socialmedia');

    const contactEmail = defaultEmailChannel?.value || this.brandInfo?.contactEmail || '';
    const contactPhone = defaultPhoneChannel?.value || this.brandInfo?.primaryPhone || '';
    const contactAddress = defaultAddressChannel?.value || this.brandInfo?.address || '';
    const workingHours = defaultHoursChannel?.value || this.brandInfo?.workingHours || '';
    const hasContactInfo = Boolean(contactEmail || contactPhone || contactAddress || channels.length > 0);
    const hasBrandLogo = Boolean(this.brandLogoUrl && this.brandLogoUrl.trim().length > 0);

    const menuContext: any = {
      navigationMenu,
      NavigationMenu: navigationMenu,
      PageCategories: navigationMenu,
      categories: navigationMenu,
      topBarPages,
      TopBarPages: topBarPages,
      menuCtaButtons,
      MenuCtaButtons: menuCtaButtons,
      cartCount: this.cartService.getItemCount(),
      BrandName: this.brandName,
      brandName: this.brandName,
      CompanyName: this.brandName,
      LogoUrl: this.brandLogoUrl,
      logoUrl: this.brandLogoUrl,
      BrandLogo: this.brandLogoUrl,
      brandLogo: this.brandLogoUrl,
      WhiteLogoUrl: this.brandLogoUrl,
      HasBrandLogo: hasBrandLogo,
      hasBrandLogo: hasBrandLogo,
      HomeUrl: '/',
      WebsiteUrl: '/',
      email: contactEmail,
      Email: contactEmail,
      phone: contactPhone,
      Phone: contactPhone,
      address: contactAddress,
      Address: contactAddress,
      workingHours: workingHours,
      WorkingHours: workingHours,
      hasContactInfo,
      HasContactInfo: hasContactInfo,
      hasTopBar: topBarPages.length > 0 || hasContactInfo || socialLinks.length > 0,
      HasTopBar: topBarPages.length > 0 || hasContactInfo || socialLinks.length > 0,
      socialLinks,
      SocialLinks: socialLinks,
      hasSocialLinks: socialLinks.length > 0,
      HasSocialLinks: socialLinks.length > 0,
      contactItems: channels,
      ContactItems: channels,
      contactChannels: channels,
      ContactChannels: channels,
      IsAuthenticated: authed,
      IsAdmin: isAdmin,
      IsMember: isMember,
      ActivateLoginInMenu: isLoginActive && isLoginInMenu,
      LoginText: loginText,
      LoginUrl: loginUrl
    };

    let html = this.contentHydration.hydrate(rawHtml, menuContext, 'menu');

    // Highlight active link matching activeSlug
    if (activeSlug) {
      const activeNormalized = activeSlug === 'home' ? '/' : `/${activeSlug}`;
      const regex = new RegExp(`(<a\\s+[^>]*href=["']${activeNormalized}["'][^>]*class=["'][^"']*)(["'])`, 'gi');
      html = html.replace(regex, '$1 active fw-bold$2');
    }

    return html;
  }

  /**
   * Helper to check if the current browser session has an active, unexpired JWT token.
   */
  private isUserAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    const token = localStorage.getItem('access_token');
    if (!token) return false;
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        return !!payload.exp && Date.now() < payload.exp * 1000;
      }
    } catch {}
    return false;
  }

  /**
   * Helper to check if the current user possesses administrative roles
   * (SuperAdmin, Admin, IdentityManager, CmsManager, SystemAdministrator).
   */
  private isUserAdmin(): boolean {
    if (typeof window === 'undefined') return false;
    const rolesJson = localStorage.getItem('user_roles');
    if (!rolesJson) return false;
    try {
      const roles = JSON.parse(rolesJson);
      if (Array.isArray(roles)) {
        const adminRoles = ['superadmin', 'admin', 'identitymanager', 'cmsmanager', 'systemadministrator'];
        return roles.some((r: any) => typeof r === 'string' && adminRoles.includes(r.toLowerCase()));
      }
    } catch {}
    return false;
  }

  /**
   * Hydrates the active Footer template with legal pages, categorized links, brand details,
   * and enforces the official Ozikol credit bar via ContentHydrationService.
   */
  private hydrateFooter(rawHtml: string): string {
    const isLoginActive = this.brandInfo?.activateLogin !== false;
    const isLoginInFooter = this.brandInfo?.activateLoginInFooter !== false;
    const authed = this.isUserAuthenticated();
    const isAdmin = authed && this.isUserAdmin();
    const isMember = authed && !isAdmin;

    const loginText = !authed 
      ? (this.brandInfo?.loginButtonText || 'Sign In') 
      : (isAdmin ? 'Console' : 'My Workspace');
    const loginUrl = !authed 
      ? '/auth/login' 
      : (isAdmin ? '/dashboard/console' : '/dashboard/workspace');

    // Prepare categorized links for footer columns
    const footerCategories = (this.categories || [])
      .filter(c => c.publish !== false && c.showInFooter !== false)
      .map(c => {
        const catTitle = c.title || c.categoryName || c.name || 'Category';
        const displayTitle = c.footerDisplayTitle || catTitle;
        const childPages = (c.webPages && c.webPages.length > 0)
          ? c.webPages.filter((p: any) => p.publish !== false && p.showInFooter !== false)
          : (this.publishedPages || []).filter(p => (p.publish !== false && p.showInFooter !== false) && (p.pageCategoryId === c.id || p.pageCategory?.id === c.id || p.pageCategory?.title === catTitle));

        return {
          name: catTitle,
          title: catTitle,
          displayTitle: displayTitle,
          pages: childPages.map((p: any) => ({
            title: p.title || p.Title || '',
            url: `/${(p.directUrl || p.slug || '').replace(/^\/+/, '')}`
          }))
        };
      });

    const footerBottomPages = (this.publishedPages || [])
      .filter(p => (p.showInFooterBottom || p.ShowInFooterBottom || p.isLegal || p.IsLegal) && p.publish !== false && p.Publish !== false)
      .sort((a, b) => (a.footerBottomSortOrder || a.FooterBottomSortOrder || a.sortOrder || a.SortOrder || 0) - (b.footerBottomSortOrder || b.FooterBottomSortOrder || b.sortOrder || b.SortOrder || 0))
      .map(p => {
        const isAuthDirect = (p.directUrl || p.slug || '').toLowerCase().includes('login') || (p.title || '').toLowerCase().includes('sign in');
        const itemTitle = isAuthDirect && authed ? (isAdmin ? 'Admin Console' : 'Member Portal') : (p.title || p.Title || '');
        const itemUrl = isAuthDirect && authed ? (isAdmin ? '/dashboard/console' : '/dashboard/workspace') : `/${(p.directUrl || p.slug || '').replace(/^\/+/, '')}`;
        return {
          title: itemTitle,
          url: itemUrl,
          customClass: p.customClass || p.CustomClass || ''
        };
      });

    const legalPages = footerBottomPages;

    const currentYear = new Date().getFullYear().toString();
    const footerChannels: any[] = this.brandInfo?.contactChannels || [];
    const footerEmailChannel = footerChannels.find((c: any) => c.channelType?.toLowerCase() === 'email' && c.isDefault) || footerChannels.find((c: any) => c.channelType?.toLowerCase() === 'email');
    const footerPhoneChannel = footerChannels.find((c: any) => c.channelType?.toLowerCase() === 'phone' && c.isDefault) || footerChannels.find((c: any) => c.channelType?.toLowerCase() === 'phone');
    const footerAddressChannel = footerChannels.find((c: any) => c.channelType?.toLowerCase() === 'address' && c.isDefault) || footerChannels.find((c: any) => c.channelType?.toLowerCase() === 'address');
    const footerSocialLinks = footerChannels.filter((c: any) => c.channelType?.toLowerCase() === 'socialmedia');

    const contactEmail = footerEmailChannel?.value || this.brandInfo?.contactEmail || '';
    const contactPhone = footerPhoneChannel?.value || this.brandInfo?.primaryPhone || '';
    const contactAddress = footerAddressChannel?.value || this.brandInfo?.address || '';

    // Get in Touch column strictly contains Address, Phone, Email
    const contactItems: any[] = [];
    if (contactAddress) {
      contactItems.push({
        title: 'Address',
        content: contactAddress,
        value: contactAddress,
        type: 'address',
        iconClass: 'fa-solid fa-location-dot',
        url: '#'
      });
    }
    if (contactPhone) {
      contactItems.push({
        title: 'Phone',
        content: contactPhone,
        value: contactPhone,
        type: 'phone',
        iconClass: 'fa-solid fa-phone',
        url: `tel:${contactPhone.replace(/[^0-9+]/g, '')}`
      });
    }
    if (contactEmail) {
      contactItems.push({
        title: 'Email',
        content: contactEmail,
        value: contactEmail,
        type: 'email',
        iconClass: 'fa-solid fa-envelope',
        url: `mailto:${contactEmail}`
      });
    }

    // Real published pages tagged with quicklinks for the Quick Links column
    const quickLinkPages = (this.publishedPages || [])
      .filter((p: any) => p.publish !== false && (
        (p.tags && p.tags.toLowerCase().includes('quicklink')) ||
        ['ai-agent', 'machinery', 'machineries', 'career', 'faq', 'contact', 'contact-us'].includes((p.directUrl || p.slug || '').toLowerCase().replace(/^\/+/, ''))
      ))
      .map((p: any) => ({
        title: p.title || p.Title || '',
        url: `/${(p.directUrl || p.slug || '').replace(/^\/+/, '')}`
      }));

    const footerContext: any = {
      BrandName: this.brandName,
      brandName: this.brandName,
      LogoUrl: this.brandLogoUrl,
      logoUrl: this.brandLogoUrl,
      BrandLogo: this.brandLogoUrl,
      Year: currentYear,
      year: currentYear,
      Description: this.brandInfo?.footerDescription || this.brandInfo?.companyDescription || this.brandInfo?.tagline || '',
      description: this.brandInfo?.footerDescription || this.brandInfo?.companyDescription || this.brandInfo?.tagline || '',
      FooterDescription: this.brandInfo?.footerDescription || this.brandInfo?.companyDescription || '',
      footerDescription: this.brandInfo?.footerDescription || this.brandInfo?.companyDescription || '',
      Tagline: this.brandInfo?.tagline || '',
      tagline: this.brandInfo?.tagline || '',
      Email: contactEmail,
      email: contactEmail,
      Phone: contactPhone,
      phone: contactPhone,
      Address: contactAddress,
      address: contactAddress,
      Copyright: `&copy; ${currentYear} ${this.brandName}. All rights reserved.`,
      copyright: `&copy; ${currentYear} ${this.brandName}. All rights reserved.`,
      footerCategories: footerCategories,
      categories: footerCategories,
      legalPages: legalPages,
      LegalPages: legalPages,
      footerBottomPages: footerBottomPages,
      FooterBottomPages: footerBottomPages,
      socialLinks: footerSocialLinks,
      SocialLinks: footerSocialLinks,
      hasSocialLinks: footerSocialLinks.length > 0,
      HasSocialLinks: footerSocialLinks.length > 0,
      hasContactInfo: contactItems.length > 0,
      HasContactInfo: contactItems.length > 0,
      contactItems: contactItems,
      ContactItems: contactItems,
      contactChannels: contactItems,
      ContactChannels: contactItems,
      taggedPages: {
        quicklinks: quickLinkPages
      },
      TaggedPages: {
        quicklinks: quickLinkPages
      },
      IsAuthenticated: authed,
      IsAdmin: isAdmin,
      IsMember: isMember,
      ActivateLoginInFooter: isLoginActive && isLoginInFooter,
      LoginText: loginText,
      LoginUrl: loginUrl
    };

    let html = this.contentHydration.hydrate(rawHtml, footerContext, 'footer');
    return this.templateHydration.enforceOzikolCredit(html);
  }

  /**
   * Builds Hero hydration data strictly from active database PageSection entity and its child lists.
   */
  private buildHeroContext(dbHeroSection?: any): any {
    const listItems = (dbHeroSection?.pageSectionLists || dbHeroSection?.items || []).map((item: any, idx: number) => ({
      id: item.id,
      title: item.title || '',
      Title: item.title || '',
      miniTitle: item.miniTitle || '',
      MiniTitle: item.miniTitle || '',
      description: item.description || '',
      Description: item.description || '',
      moreDescription: item.moreDescription || '',
      MoreDescription: item.moreDescription || '',
      icon: item.iconText || item.icon || '',
      imageUrl: item.imageUrl || dbHeroSection?.imageUrl || '',
      ImageUrl: item.imageUrl || dbHeroSection?.imageUrl || '',
      buttonText: item.buttonText || '',
      ButtonText: item.buttonText || '',
      buttonLink: item.buttonLink || '#',
      ButtonLink: item.buttonLink || '#',
      secondaryButtonText: item.secondaryButtonText || item.secondButtonText || '',
      SecondaryButtonText: item.secondaryButtonText || item.secondButtonText || '',
      secondaryButtonLink: item.secondaryButtonLink || item.secondButtonLink || '#',
      SecondaryButtonLink: item.secondaryButtonLink || item.secondButtonLink || '#',
      sortOrder: item.sortOrder || idx + 1
    }));

    // If section has no child list items, construct single slide from the parent section
    const childSlides = listItems.length > 0 ? listItems : (dbHeroSection ? [{
      title: dbHeroSection.title || this.brandName,
      Title: dbHeroSection.title || this.brandName,
      miniTitle: dbHeroSection.miniTitle || '',
      MiniTitle: dbHeroSection.miniTitle || '',
      description: dbHeroSection.description || '',
      Description: dbHeroSection.description || '',
      imageUrl: dbHeroSection.imageUrl || '',
      ImageUrl: dbHeroSection.imageUrl || '',
      buttonText: dbHeroSection.buttonText || '',
      ButtonText: dbHeroSection.buttonText || '',
      buttonLink: dbHeroSection.buttonLink || '#',
      ButtonLink: dbHeroSection.buttonLink || '#',
      secondaryButtonText: dbHeroSection.secondaryButtonText || dbHeroSection.secondButtonText || '',
      SecondaryButtonText: dbHeroSection.secondaryButtonText || dbHeroSection.secondButtonText || '',
      secondaryButtonLink: dbHeroSection.secondaryButtonLink || dbHeroSection.secondButtonLink || '#',
      SecondaryButtonLink: dbHeroSection.secondaryButtonLink || dbHeroSection.secondButtonLink || '#'
    }] : []);

    const firstSlide = childSlides[0] || {};
    return {
      title: dbHeroSection?.title || firstSlide.title || '',
      Title: dbHeroSection?.title || firstSlide.title || '',
      miniTitle: dbHeroSection?.miniTitle || firstSlide.miniTitle || '',
      MiniTitle: dbHeroSection?.miniTitle || firstSlide.miniTitle || '',
      description: dbHeroSection?.description || firstSlide.description || '',
      Description: dbHeroSection?.description || firstSlide.description || '',
      imageUrl: dbHeroSection?.imageUrl || firstSlide.imageUrl || '',
      ImageUrl: dbHeroSection?.imageUrl || firstSlide.imageUrl || '',
      buttonText: dbHeroSection?.buttonText || firstSlide.buttonText || '',
      ButtonText: dbHeroSection?.buttonText || firstSlide.buttonText || '',
      buttonLink: dbHeroSection?.buttonLink || firstSlide.buttonLink || '',
      ButtonLink: dbHeroSection?.buttonLink || firstSlide.buttonLink || '',
      secondaryButtonText: dbHeroSection?.secondaryButtonText || dbHeroSection?.secondButtonText || firstSlide.secondaryButtonText || '',
      SecondaryButtonText: dbHeroSection?.secondaryButtonText || dbHeroSection?.secondButtonText || firstSlide.secondaryButtonText || '',
      secondaryButtonLink: dbHeroSection?.secondaryButtonLink || dbHeroSection?.secondButtonLink || firstSlide.secondaryButtonLink || '',
      SecondaryButtonLink: dbHeroSection?.secondaryButtonLink || dbHeroSection?.secondButtonLink || firstSlide.secondaryButtonLink || '',
      items: childSlides,
      pageSectionLists: childSlides,
      slides: childSlides,
      PageSectionLists: childSlides
    };
  }

  /**
   * Formats a PageSection database entity into the token context expected by TemplateHydrationService.
   */
  private buildSectionContext(sec: any): any {
    const listItems = (sec.pageSectionLists || sec.items || []).map((item: any, idx: number) => ({
      id: item.id,
      title: item.title || '',
      Title: item.title || '',
      miniTitle: item.miniTitle || '',
      MiniTitle: item.miniTitle || '',
      description: item.description || '',
      Description: item.description || '',
      moreDescription: item.moreDescription || '',
      MoreDescription: item.moreDescription || '',
      iconText: item.iconText || item.icon || '',
      IconText: item.iconText || item.icon || '',
      icon: item.iconText || item.icon || '',
      imageUrl: item.imageUrl || '',
      ImageUrl: item.imageUrl || '',
      secondImageUrl: item.secondImageUrl || '',
      SecondImageUrl: item.secondImageUrl || '',
      buttonText: item.buttonText || '',
      ButtonText: item.buttonText || '',
      buttonLink: item.buttonLink || '',
      ButtonLink: item.buttonLink || '',
      directUrl: item.directUrl || '',
      DirectUrl: item.directUrl || '',
      sortOrder: item.sortOrder || idx + 1
    }));

    return {
      title: sec.title || '',
      Title: sec.title || '',
      miniTitle: sec.miniTitle || '',
      MiniTitle: sec.miniTitle || '',
      qoute: sec.qoute || sec.quote || '',
      Qoute: sec.qoute || sec.quote || '',
      quote: sec.quote || sec.qoute || '',
      Quote: sec.quote || sec.qoute || '',
      description: sec.description || '',
      Description: sec.description || '',
      fullDescription: sec.fullDescription || sec.description || '',
      FullDescription: sec.fullDescription || sec.description || '',
      imageUrl: sec.imageUrl || '',
      ImageUrl: sec.imageUrl || '',
      secondImageUrl: sec.secondImageUrl || '',
      SecondImageUrl: sec.secondImageUrl || '',
      videoUrl: sec.videoUrl || '',
      VideoUrl: sec.videoUrl || '',
      youtubeUrlLink: sec.youtubeUrlLink || sec.videoUrl || '',
      YoutubeUrlLink: sec.youtubeUrlLink || sec.videoUrl || '',
      iconText: sec.iconText || '',
      IconText: sec.iconText || '',
      buttonText: sec.buttonText || '',
      ButtonText: sec.buttonText || '',
      buttonLink: sec.buttonLink || '#',
      ButtonLink: sec.buttonLink || '#',
      secondButtonText: sec.secondButtonText || sec.secondaryButtonText || '',
      SecondButtonText: sec.secondButtonText || sec.secondaryButtonText || '',
      secondaryButtonText: sec.secondButtonText || sec.secondaryButtonText || '',
      SecondaryButtonText: sec.secondButtonText || sec.secondaryButtonText || '',
      secondButtonLink: sec.secondButtonLink || sec.secondaryButtonLink || '',
      SecondButtonLink: sec.secondButtonLink || sec.secondaryButtonLink || '',
      secondaryButtonLink: sec.secondButtonLink || sec.secondaryButtonLink || '',
      SecondaryButtonLink: sec.secondButtonLink || sec.secondaryButtonLink || '',
      directUrl: sec.directUrl || '',
      DirectUrl: sec.directUrl || '',
      customClass: sec.customClass || '',
      CustomClass: sec.customClass || '',
      backgroundColor: sec.backgroundColor || '',
      BackgroundColor: sec.backgroundColor || '',
      formKey: sec.formKey || (sec.pageForm ? sec.pageForm.formKey : ''),
      FormKey: sec.formKey || (sec.pageForm ? sec.pageForm.formKey : ''),
      pageSectionLists: listItems,
      PageSectionLists: listItems,
      items: listItems,
      articles: this.blogs && this.blogs.length > 0 ? this.mapBlogArticles(this.blogs) : [],
      Articles: this.blogs && this.blogs.length > 0 ? this.mapBlogArticles(this.blogs) : []
    };
  }

  private findActiveTemplate(category: string): any {
    const target = (category || '').toLowerCase().replace(/[-_]/g, '');
    return this.activeTemplates.find(t => {
      const cat = (t.categoryKey || t.category || '').toLowerCase().replace(/[-_]/g, '');
      const key = (t.templateKey || t.variantCode || '').toLowerCase().replace(/[-_]/g, '');
      return cat === target || key === target;
    });
  }

  private findTemplateForSection(sec: any): any {
    const rawKey = sec.templateKey || sec.variantCode || sec.directUrl || '';
    if (rawKey) {
      const normalizedKey = rawKey.toLowerCase();
      // 1. Exact match in activeTemplates
      const exactMatch = this.activeTemplates.find(t => 
        (t.templateKey || '').toLowerCase() === normalizedKey ||
        (t.variantCode || '').toLowerCase() === normalizedKey
      );
      if (exactMatch) return exactMatch;

      // 2. Smart alias mapping between seeded template keys and installed theme keys
      const keyAliases: { [key: string]: string[] } = {
        'body_splitshowcase': ['body_missionsplit', 'body_featuregrid3'],
        'split-media-showcase': ['body_missionsplit', 'body_featuregrid3'],
        'body_statscounters': ['body_statscounters', 'body_metricscounter', 'body_statscounter4'],
        'stats-counter': ['body_statscounters', 'body_metricscounter'],
        'body_metricscounter': ['body_statscounters', 'body_metricscounter'],
        'body_processsteps': ['body_processsteps', 'body_missionsplit', 'body_featuregrid3'],
        'process-steps': ['body_processsteps', 'body_missionsplit'],
        'body_missionsplit': ['body_missionsplit'],
        'body_ctasplit': ['body_ctasplit', 'body_ctabanner', 'body_ctabannerfull'],
        'cta-banner': ['body_ctasplit', 'body_ctabanner'],
        'body_ctabanner': ['body_ctasplit', 'body_ctabanner'],
        'news_minimalbar': ['news_minimalbar'],
        'newsletter-bar': ['news_minimalbar'],
        'contact_splitdetails': ['contact_splitdetails'],
        'contact-split': ['contact_splitdetails'],
        'body_requestservice': ['body_requestservice'],
        'request-service': ['body_requestservice'],
        'body_featuregrid3': ['body_featuregrid3'],
        'features-3col': ['body_featuregrid3'],
        'feature-cards-grid': ['body_featuregrid3'],
        'body_testimonials': ['body_testimonials'],
        'testimonials': ['body_testimonials'],
        'testimonials-grid': ['body_testimonials'],
        'body_faqaccordion': ['body_faqaccordion'],
        'faq': ['body_faqaccordion'],
        'faq-accordion': ['body_faqaccordion'],
        'team-grid': ['body_featuregrid3']
      };

      const aliases = keyAliases[normalizedKey];
      if (aliases) {
        for (const alias of aliases) {
          const aliasMatch = this.activeTemplates.find(t => 
            (t.templateKey || '').toLowerCase() === alias ||
            (t.variantCode || '').toLowerCase() === alias
          );
          if (aliasMatch) return aliasMatch;
        }
      }
    }
    // Fallback to active body template
    return this.findActiveTemplate('body');
  }

  private getHydrationOptions(): any {
    return {
      currentTenantBrandName: this.brandName,
      availablePages: this.publishedPages
    };
  }

  /**
   * Finalizes document rendering by:
   * 1. Injecting CSS styles into <head> via a dedicated style tag.
   * 2. Sanitizing HTML for Angular DOM rendering.
   * 3. Executing the complete 3-zone tag injection pipeline (head, body_open, footer) + section scripts.
   */
  /**
   * Finalizes the rendering pipeline by:
   * 1. Injecting dynamic scoped template CSS into <head>.
   * 2. Pre-injecting Zone 1 <head> stylesheet tags and waiting for them to load (eliminating FOUC).
   * 3. Sanitizing and binding dynamic HTML layout to safeRenderedHtml.
   * 4. Hiding the preloader and revealing the styled website smoothly.
   * 5. Executing Zone 2 (body_open), Zone 3 (footer), and section scripts.
   */
  private async finalizeRender(styles: string, html: string, combinedJs?: string): Promise<void> {
    // 1. Inject Scoped Template CSS into <head>
    let styleTag = document.getElementById('tenant-dynamic-theme-styles') as HTMLStyleElement;
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'tenant-dynamic-theme-styles';
      document.head.appendChild(styleTag);
    }
    // Defensively strip any accidental <style> or </style> wrappers so pure CSS is injected
    const cleanStyles = (styles || '').replace(/<\/?style[^>]*>/gi, '').trim();
    styleTag.textContent = cleanStyles;

    // 2. Clean up previously injected dynamic tags
    document.querySelectorAll('.ozikol-injected-tag').forEach(el => el.remove());

    // 3. Pre-inject Zone 1 (<head>) tags and collect stylesheet loading promises
    const stylePromises: Promise<void>[] = [];
    if (this.codeInjections.head && this.codeInjections.head.length > 0) {
      for (const tag of this.codeInjections.head) {
        if (!tag.content) continue;
        const promises = this.appendHtmlToContainer(document.head, tag.content, 'head');
        stylePromises.push(...promises);
      }
    }

    // Await external stylesheets (e.g. Bootstrap, custom.css) with a 350ms safety race
    // to guarantee the browser never paints raw unstyled HTML (prevents FOUC)
    if (stylePromises.length > 0) {
      await Promise.race([
        Promise.all(stylePromises),
        new Promise<void>(resolve => setTimeout(resolve, 350))
      ]);
    }

    // 4. Set Safe HTML for main page layout now that stylesheets are in place
    this.safeRenderedHtml = this.sanitizer.bypassSecurityTrustHtml(html);

    // 5. Complete loading and trigger Change Detection to reveal fully-styled page
    this.loading = false;
    this.cdr.detectChanges();

    // 6. Inject Zone 2 (body-open), Zone 3 (footer), and section scripts
    setTimeout(() => {
      this.injectRemainingCodeTags(combinedJs);
      this.initRecaptchas();
    }, 50);
  }

  /**
   * Injects remaining code tags (Zone 2 body open, Zone 3 footer, and section JS).
   */
  private injectRemainingCodeTags(combinedJs?: string): void {
    // 1. Inject CMS Body Open Tags (immediately after <body>) strictly from DB
    if (this.codeInjections.bodyOpen && this.codeInjections.bodyOpen.length > 0) {
      for (const tag of this.codeInjections.bodyOpen) {
        if (!tag.content) continue;
        this.prependHtmlToBody(tag.content);
      }
    }

    // 2. Inject CMS Footer Scripts (right before </body>) strictly from DB in sort order
    if (this.codeInjections.footer && this.codeInjections.footer.length > 0) {
      for (const tag of this.codeInjections.footer) {
        if (!tag.content) continue;
        this.appendHtmlToContainer(document.body, tag.content, 'footer');
      }
    }

    // 3. Section JavaScript Execution
    if (combinedJs && combinedJs.trim()) {
      const script = document.createElement('script');
      script.className = 'ozikol-injected-tag ozikol-section-scripts';
      const cleanJs = combinedJs.replace(/<\/?script[^>]*>/gi, '').trim();
      script.textContent = `\n        try {\n          ${cleanJs}\n        } catch (e) {\n          console.error('[Ozikol Theme Script Error]:', e);\n        }\n      `;
      document.body.appendChild(script);
    }
  }

  private appendHtmlToContainer(container: HTMLElement, htmlString: string, zone: string): Promise<void>[] {
    const temp = document.createElement('div');
    temp.innerHTML = htmlString.trim();
    const promises: Promise<void>[] = [];

    Array.from(temp.children).forEach(child => {
      const el = child as HTMLElement;
      el.classList.add('ozikol-injected-tag', `ozikol-zone-${zone}`);

      if (el.tagName.toLowerCase() === 'link' && el.getAttribute('rel') === 'stylesheet') {
        const link = document.createElement('link');
        link.className = el.className;
        Array.from(el.attributes).forEach(attr => link.setAttribute(attr.name, attr.value));
        const promise = new Promise<void>(resolve => {
          link.onload = () => resolve();
          link.onerror = () => resolve();
        });
        promises.push(promise);
        container.appendChild(link);
      } else if (el.tagName.toLowerCase() === 'script') {
        const script = document.createElement('script');
        script.className = el.className;
        Array.from(el.attributes).forEach(attr => script.setAttribute(attr.name, attr.value));
        script.textContent = el.textContent || '';
        container.appendChild(script);
      } else {
        container.appendChild(el);
      }
    });

    return promises;
  }

  private prependHtmlToBody(htmlString: string): void {
    const temp = document.createElement('div');
    temp.innerHTML = htmlString.trim();

    Array.from(temp.children).reverse().forEach(child => {
      const el = child as HTMLElement;
      el.classList.add('ozikol-injected-tag', 'ozikol-zone-body-open');
      if (document.body.firstChild) {
        document.body.insertBefore(el, document.body.firstChild);
      } else {
        document.body.appendChild(el);
      }
    });
  }

  private recordTelemetry(): void {
    try {
      this.apiService.post('WebsiteContentApi/track-view', {
        pageId: this.currentPage?.id || null,
        pageUrl: window.location.pathname || '/',
        pageTitle: this.titleService.getTitle() || this.brandName
      }).subscribe({
        next: () => {},
        error: () => {}
      });
    } catch {
      // Telemetry failures are non-blocking
    }
  }

  // ========================================================
  // INTERACTIVE EVENT DELEGATION (Dropdowns, Links, Forms)
  // ========================================================

  @HostListener('click', ['$event'])
  onGlobalClick(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    if (!target) return;

    // 1. Internal Navigation Link Interception (SPA client routing)
    const anchor = target.closest('a') as HTMLAnchorElement;
    if (anchor && !anchor.classList.contains('dropdown-toggle') && !anchor.classList.contains('oz-dropdown-toggle')) {
      // Check if this anchor is a toggle button or modal/drawer trigger
      const isThemeToggle = anchor.getAttribute('data-bs-toggle') !== null ||
                            anchor.getAttribute('data-toggle') !== null ||
                            anchor.hasAttribute('data-bs-target') ||
                            anchor.hasAttribute('data-target') ||
                            anchor.classList.contains('toggle-btn') ||
                            anchor.classList.contains('menu-toggle');

      const href = (anchor.getAttribute('href') || '').trim();

      if (isThemeToggle || href === '#' || href === '' || href.startsWith('javascript:')) {
        // Allow theme's JS handler to manage offcanvas / modal / drawer toggling without Angular router hijacking
        return;
      }

      if (href && !href.startsWith('http') && !href.startsWith('mailto:') && !href.startsWith('tel:') && !href.startsWith('javascript:')) {
        if (href.startsWith('#')) {
          e.preventDefault();
          const element = document.querySelector(href);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
          }
          return;
        }

        // Seamless In-App Routing via Angular Router
        e.preventDefault();
        document.querySelectorAll('.dropdown-menu.show').forEach(m => m.classList.remove('show'));
        this.router.navigateByUrl(href);
        return;
      }
    }

    // 3b. Committee Public Form Actions
    if (this.currentSlug === 'join-committee') {
      const resetBtn = target.closest('.pub-btn-reset-trigger');
      if (resetBtn) {
        e.preventDefault();
        this.resetCommitteeRegistration();
        return;
      }

      const uploadBtn = target.closest('.pub-btn-upload') as HTMLElement;
      if (uploadBtn) {
        e.preventDefault();
        const targetId = uploadBtn.getAttribute('data-target-input');
        if (targetId) {
          const fileInput = document.getElementById(targetId) as HTMLInputElement;
          if (fileInput) {
            fileInput.onchange = () => {
              if (fileInput.files && fileInput.files[0]) {
                const fieldName = fileInput.getAttribute('data-field-name') || '';
                this.handleCommitteeFileUpload(fileInput.files[0], fieldName);
              }
            };
            fileInput.click();
          }
        }
        return;
      }
    }

    // 4. Dynamic Form Submit Button Delegator
    const submitBtn = target.closest('button[type="submit"], input[type="submit"]') as HTMLElement;
    if (submitBtn) {
      const form = submitBtn.closest('form') as HTMLFormElement;
      if (form) {
        e.preventDefault();
        if (form.classList.contains('pub-form-body')) {
          this.handleCommitteeFormSubmit(form);
        } else {
          this.submitDynamicForm(form, submitBtn);
        }
      }
    }
  }

  /**
   * Dynamically loads Google reCAPTCHA script tag if not yet present in the document.
   */
  private loadRecaptchaScript(): void {
    if (document.getElementById('google-recaptcha-script')) {
      return;
    }
    const script = document.createElement('script');
    script.id = 'google-recaptcha-script';
    script.src = 'https://www.google.com/recaptcha/api.js';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }

  /**
   * Discovers all .g-recaptcha containers on the rendered page and renders or assigns the site key.
   */
  private initRecaptchas(): void {
    this.loadRecaptchaScript();

    setTimeout(() => {
      try {
        const root = this.elementRef.nativeElement;
        const recaptchaContainers = root.querySelectorAll('.g-recaptcha');
        recaptchaContainers.forEach((container: HTMLElement) => {
          if (!container.getAttribute('data-sitekey') || container.getAttribute('data-sitekey') === '') {
            container.setAttribute('data-sitekey', this.recaptchaSiteKey);
          }
          const grecaptcha = (window as any).grecaptcha;
          if (grecaptcha && typeof grecaptcha.render === 'function' && container.children.length === 0) {
            try {
              grecaptcha.render(container, {
                sitekey: this.recaptchaSiteKey
              });
            } catch (renderErr) {
              // Ignore if already initialized
            }
          }
        });
      } catch (e) {
        console.warn('reCAPTCHA init deferred:', e);
      }
    }, 300);
  }

  /**
   * Submits a public interactive form (e.g., Contact Us, Newsletter, Service Request)
   * to WebsiteContentApi/forms/{formKey}/submit.
   */
  private submitDynamicForm(form: HTMLFormElement, submitBtn: HTMLElement): void {
    const rawKey = form.getAttribute('data-form-key') || form.id || 'Contact_Us';
    const formKey = rawKey.trim();
    const formData = new FormData(form);
    const dataPayload: Record<string, any> = {};

    formData.forEach((value, key) => {
      dataPayload[key] = value;
    });

    // Also collect all named inputs directly to support dynamically hydrated forms without standard form submit
    const inputs = form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input, textarea, select');
    inputs.forEach(inp => {
      const name = inp.getAttribute('name') || inp.id;
      if (name && inp.value !== undefined && dataPayload[name] === undefined) {
        dataPayload[name] = inp.value;
      }
    });

    // Retrieve Google reCAPTCHA response token from form inputs or global grecaptcha
    let recaptchaToken = (dataPayload['g-recaptcha-response'] as string) || '';
    if (!recaptchaToken) {
      const grecaptcha = (window as any).grecaptcha;
      if (grecaptcha && typeof grecaptcha.getResponse === 'function') {
        try {
          recaptchaToken = grecaptcha.getResponse() || '';
        } catch {}
      }
    }

    const originalText = submitBtn.innerHTML;
    submitBtn.setAttribute('disabled', 'true');
    submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span> Submitting...`;

    this.apiService.post(`WebsiteContentApi/forms/${formKey}/submit`, {
      data: dataPayload,
      recaptchaToken: recaptchaToken,
      sourcePageUrl: window.location.pathname
    }).subscribe({
      next: (res: any) => {
        submitBtn.removeAttribute('disabled');
        submitBtn.innerHTML = originalText;
        const successMsg = res?.message || 'Thank you! Your submission has been received.';
        this.toastService.success(successMsg);
        form.reset();
        try {
          (window as any).grecaptcha?.reset();
        } catch {}
      },
      error: (err: any) => {
        submitBtn.removeAttribute('disabled');
        submitBtn.innerHTML = originalText;
        const errorMsg = err?.error?.message || 'Unable to submit your request. Please check all fields.';
        this.toastService.error(errorMsg);
        try {
          (window as any).grecaptcha?.reset();
        } catch {}
      }
    });
  }
}




