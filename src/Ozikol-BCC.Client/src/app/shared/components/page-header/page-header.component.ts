import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

export interface PageHeaderButton {
  text: string;
  icon: string;
  isPrimary?: boolean;
  disabled?: boolean;
  loading?: boolean;
  action?: () => void;
  url?: string;
  routerLink?: string;
}

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <section class="bcp-page-header" [class.is-loading]="loading">
      <div class="bcp-page-header-main">
        <div class="bcp-header-eyebrow" *ngIf="eyebrow">{{ eyebrow }}</div>
        <div class="bcp-header-title-row">
          <span class="bcp-header-icon material-symbols-outlined" *ngIf="icon">{{ icon }}</span>
          <h1 class="bcp-page-title">{{ title }}</h1>
        </div>
        <p class="bcp-page-subtitle" *ngIf="subtitle">{{ subtitle }}</p>
      </div>

      <div class="bcp-page-actions btn-group-outlined" *ngIf="buttons.length > 0 || backUrl">
        <a *ngIf="backUrl" [routerLink]="backUrl" class="btn-custom">
          <span class="material-symbols-outlined">arrow_back</span>
          <span>{{ backText || 'Back' }}</span>
        </a>
        <ng-container *ngFor="let btn of buttons">
          <button *ngIf="btn.action" type="button" class="btn-custom" [class.active]="btn.isPrimary" [disabled]="btn.disabled || btn.loading || loading" (click)="btn.action()">
            <span class="material-symbols-outlined" [class.spin-icon]="btn.loading || (loading && btn.icon === 'refresh')">{{ btn.icon }}</span>
            <span>{{ (btn.loading || (loading && btn.icon === 'refresh')) ? 'Loading...' : btn.text }}</span>
          </button>
          <a *ngIf="(btn.url || btn.routerLink) && !btn.action" [routerLink]="btn.routerLink || btn.url" class="btn-custom" [class.active]="btn.isPrimary">
            <span class="material-symbols-outlined">{{ btn.icon }}</span>
            <span>{{ btn.text }}</span>
          </a>
        </ng-container>
      </div>

      <!-- Top Indeterminate Progress Line -->
      <div class="header-loader-line" *ngIf="loading">
        <div class="loader-bar"></div>
      </div>
    </section>
  `,
  styles: [`
    .bcp-page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      margin-bottom: 20px;
      flex-wrap: wrap;
      position: relative;
    }
    .bcp-page-header-main {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .bcp-header-eyebrow {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--sidebar-active-color);
      margin-bottom: 2px;
    }
    .bcp-header-title-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .bcp-header-icon {
      font-size: 26px;
      color: var(--sidebar-active-color);
    }
    .bcp-page-title {
      margin: 0;
      font-size: 22px;
      line-height: 28px;
      font-weight: 700;
      color: var(--md-sys-color-on-surface);
    }
    .bcp-page-subtitle {
      margin: 4px 0 0;
      color: var(--sidebar-header-color);
      font-size: 13px;
    }
    .bcp-page-actions {
      display: inline-flex;
      border: 1px solid var(--md-sys-color-outline);
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      background: var(--md-sys-color-surface);
    }
    .btn-custom {
      background: transparent;
      color: var(--sidebar-color);
      border: none;
      border-right: 1px solid var(--md-sys-color-outline);
      padding: 8px 16px;
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      text-decoration: none;
      transition: all 0.15s ease;
    }
    .btn-custom:last-child {
      border-right: none;
    }
    /* Inactive button hover */
    .btn-custom:not(.active):hover:not(:disabled) {
      background-color: var(--sidebar-hover-bg) !important;
      color: var(--sidebar-active-color) !important;
    }
    /* Primary / Active button default */
    .btn-custom.active {
      background-color: #0050e5 !important;
      color: #ffffff !important;
    }
    /* Primary / Active button hover (rich darker blue with high contrast white text) */
    .btn-custom.active:hover:not(:disabled) {
      background-color: #003ebd !important;
      color: #ffffff !important;
    }
    .btn-custom:disabled {
      opacity: 0.7;
      cursor: wait;
    }
    .btn-custom .material-symbols-outlined {
      font-size: 18px;
    }
    .spin-icon {
      animation: headerSpin 0.8s linear infinite;
    }
    @keyframes headerSpin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .header-loader-line {
      position: absolute;
      bottom: -8px;
      left: 0;
      right: 0;
      height: 3px;
      background: rgba(0, 80, 229, 0.12);
      border-radius: 3px;
      overflow: hidden;
    }
    .loader-bar {
      width: 40%;
      height: 100%;
      background: #0050e5;
      border-radius: 3px;
      animation: headerIndeterminate 1.2s infinite ease-in-out;
    }
    @keyframes headerIndeterminate {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(300%); }
    }

    @media (max-width: 640px) {
      .bcp-page-header {
        flex-direction: column;
        align-items: stretch;
        gap: 12px;
        margin-bottom: 14px;
      }
      .bcp-page-title {
        font-size: 19px;
        line-height: 25px;
      }
      .bcp-header-icon {
        font-size: 22px;
      }
      .bcp-page-subtitle {
        display: none !important; /* Hide description on mobile screens for clean responsive display */
      }
      .bcp-page-actions {
        display: flex;
        width: 100%;
        flex-wrap: wrap;
      }
      .btn-custom {
        flex: 1 1 calc(50% - 1px);
        justify-content: center;
        padding: 8px 10px;
        font-size: 11.5px;
        white-space: nowrap;
      }
    }

    @media (max-width: 360px) {
      .bcp-page-title {
        font-size: 17px;
        line-height: 22px;
      }
      .btn-custom {
        font-size: 11px;
        padding: 7px 6px;
        gap: 4px;
      }
      .btn-custom .material-symbols-outlined {
        font-size: 16px;
      }
    }
  `]
})
export class PageHeaderComponent {
  @Input() title: string = '';
  @Input() subtitle?: string;
  @Input() icon?: string;
  @Input() eyebrow?: string;
  @Input() backUrl?: string;
  @Input() backText?: string;
  @Input() loading: boolean = false;
  @Input() buttons: PageHeaderButton[] = [];
}
