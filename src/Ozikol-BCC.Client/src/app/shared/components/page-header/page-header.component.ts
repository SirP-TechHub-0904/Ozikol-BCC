import { Component, Input, ElementRef, ViewChild, AfterViewInit, OnDestroy, NgZone, ChangeDetectorRef } from '@angular/core';
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
    <section #headerSection class="bcp-page-header" [class.is-loading]="loading">
      <div class="bcp-page-header-main">
        <div class="bcp-header-eyebrow" *ngIf="eyebrow">{{ eyebrow }}</div>
        <ng-content select="[eyebrow]"></ng-content>
        <div class="bcp-header-title-row">
          <span class="bcp-header-icon material-symbols-outlined" *ngIf="icon">{{ icon }}</span>
          <h1 class="bcp-page-title">{{ title }}</h1>
        </div>
        <p class="bcp-page-subtitle" *ngIf="subtitle">{{ subtitle }}</p>
      </div>

      <div #actionsContainer class="bcp-page-actions btn-group-outlined" *ngIf="buttons.length > 0 || backUrl">
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
      <ng-content select="[actions]"></ng-content>
      <ng-content></ng-content>

      <!-- Top Indeterminate Progress Line -->
      <div class="header-loader-line" *ngIf="loading">
        <div class="loader-bar"></div>
      </div>
    </section>

    <!-- Floating Save Bar: Appears automatically whenever the user scrolls away from the top Save action -->
    <div class="bcp-floating-save-bar" *ngIf="isHeaderOutOfView && floatingSaveButtons.length > 0" role="region" aria-label="Floating Save Actions">
      <button
        *ngFor="let btn of floatingSaveButtons"
        type="button"
        class="bcp-floating-save-btn"
        [disabled]="btn.disabled || btn.loading || loading"
        (click)="triggerFloatingButton(btn)">
        <span class="material-symbols-outlined" [class.spin-icon]="btn.loading || loading">
          {{ (btn.loading || loading) ? 'progress_activity' : (btn.icon || 'save') }}
        </span>
        <span>{{ (btn.loading || loading) ? 'Saving...' : btn.text }}</span>
      </button>
      <button
        type="button"
        class="bcp-floating-top-btn"
        (click)="scrollToHeader()"
        title="Back to top">
        <span class="material-symbols-outlined">arrow_upward</span>
      </button>
    </div>
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

    .bcp-floating-save-bar {
      position: fixed;
      bottom: 22px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 980;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 7px 8px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.94);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid rgba(15, 23, 42, 0.12);
      box-shadow: 0 12px 32px rgba(15, 23, 42, 0.18), 0 2px 8px rgba(0, 80, 229, 0.12);
      animation: floatingSaveSlideUp 0.18s ease-out;
    }
    .bcp-floating-save-btn {
      background: #0050e5;
      color: #ffffff;
      border: none;
      border-radius: 999px;
      padding: 9px 18px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 7px;
      box-shadow: 0 4px 12px rgba(0, 80, 229, 0.28);
      transition: background-color 0.15s ease, transform 0.12s ease;
      white-space: nowrap;
    }
    .bcp-floating-save-btn:hover:not(:disabled) {
      background: #003ebd;
      transform: translateY(-1px);
    }
    .bcp-floating-save-btn:disabled {
      opacity: 0.72;
      cursor: wait;
    }
    .bcp-floating-save-btn .material-symbols-outlined {
      font-size: 18px;
    }
    .bcp-floating-top-btn {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: 1px solid rgba(15, 23, 42, 0.12);
      background: #f8fafc;
      color: #334155;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
      flex-shrink: 0;
    }
    .bcp-floating-top-btn:hover {
      background: #e2e8f0;
      color: #0f172a;
    }
    .bcp-floating-top-btn .material-symbols-outlined {
      font-size: 18px;
    }
    @keyframes floatingSaveSlideUp {
      from {
        opacity: 0;
        transform: translate(-50%, 14px);
      }
      to {
        opacity: 1;
        transform: translate(-50%, 0);
      }
    }
    @media (max-width: 640px) {
      .bcp-floating-save-bar {
        bottom: 16px;
        max-width: calc(100vw - 24px);
      }
      .bcp-floating-save-btn {
        padding: 8px 14px;
        font-size: 12.5px;
      }
    }
  `]
})
export class PageHeaderComponent implements AfterViewInit, OnDestroy {
  @Input() title: string = '';
  @Input() subtitle?: string;
  @Input() icon?: string;
  @Input() eyebrow?: string;
  @Input() backUrl?: string;
  @Input() backText?: string;
  @Input() loading: boolean = false;
  @Input() buttons: PageHeaderButton[] = [];

  @ViewChild('headerSection') headerSection?: ElementRef<HTMLElement>;
  @ViewChild('actionsContainer') actionsContainer?: ElementRef<HTMLElement>;

  public isHeaderOutOfView: boolean = false;

  private scrollContainer: HTMLElement | null = null;
  private intersectionObserver: IntersectionObserver | null = null;
  private scrollListenerCleanup: (() => void) | null = null;

  constructor(
    private readonly hostRef: ElementRef<HTMLElement>,
    private readonly ngZone: NgZone,
    private readonly cdr: ChangeDetectorRef
  ) {}

  /**
   * Resolves primary/save action buttons to float when the user scrolls past the header.
   * Supports both [buttons] input definitions and projected [actions] buttons.
   */
  public get floatingSaveButtons(): Array<PageHeaderButton & { _projectedEl?: HTMLButtonElement }> {
    const savePattern = /\b(save|update|create|publish|submit|apply)\b/i;
    const matchedFromInput = (this.buttons || []).filter(btn =>
      !!btn.action &&
      (btn.isPrimary ||
        ['save', 'check', 'publish', 'done', 'send'].includes((btn.icon || '').toLowerCase()) ||
        savePattern.test(btn.text || ''))
    );

    if (matchedFromInput.length > 0) {
      return matchedFromInput;
    }

    // Fallback for pages projecting custom buttons via <div actions>
    const headerEl = this.headerSection?.nativeElement;
    if (!headerEl) {
      return [];
    }

    const projectedButtons = Array.from(headerEl.querySelectorAll('button'))
      .filter(el => !el.closest('.bcp-page-actions') && !el.closest('.bcp-floating-save-bar'))
      .filter(el => {
        const text = (el.textContent || '').trim();
        return (
          savePattern.test(text) ||
          el.classList.contains('active') ||
          el.classList.contains('btn-primary')
        );
      });

    return projectedButtons.map(el => ({
      text: (el.textContent || 'Save').trim(),
      icon: 'save',
      isPrimary: true,
      disabled: el.disabled,
      _projectedEl: el
    }));
  }

  public ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() => {
      this.scrollContainer = this.findScrollParent(this.hostRef.nativeElement);
      const targetEl = this.actionsContainer?.nativeElement || this.headerSection?.nativeElement;

      if (targetEl && typeof IntersectionObserver !== 'undefined') {
        this.intersectionObserver = new IntersectionObserver(
          entries => {
            const entry = entries[0];
            if (!entry) return;
            const rootTop = entry.rootBounds ? entry.rootBounds.top : 0;
            const scrolledPast = !entry.isIntersecting && entry.boundingClientRect.bottom <= rootTop + 24;
            this.updateOutOfViewState(scrolledPast);
          },
          {
            root: this.scrollContainer,
            threshold: 0.05
          }
        );
        this.intersectionObserver.observe(targetEl);
      }

      const onScroll = () => this.evaluateHeaderVisibility();
      const scrollTarget: EventTarget = this.scrollContainer || window;
      scrollTarget.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('scroll', onScroll, { passive: true });

      this.scrollListenerCleanup = () => {
        scrollTarget.removeEventListener('scroll', onScroll);
        window.removeEventListener('scroll', onScroll);
      };
    });
  }

  public ngOnDestroy(): void {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = null;
    }
    if (this.scrollListenerCleanup) {
      this.scrollListenerCleanup();
      this.scrollListenerCleanup = null;
    }
  }

  /**
   * Executes the floating save button action or delegates click to a projected button.
   */
  public triggerFloatingButton(btn: PageHeaderButton & { _projectedEl?: HTMLButtonElement }): void {
    if (btn._projectedEl) {
      btn._projectedEl.click();
      return;
    }
    if (btn.action) {
      btn.action();
    }
  }

  /**
   * Smoothly scrolls back to the top page header.
   */
  public scrollToHeader(): void {
    if (this.scrollContainer) {
      this.scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  private evaluateHeaderVisibility(): void {
    const targetEl = this.actionsContainer?.nativeElement || this.headerSection?.nativeElement;
    if (!targetEl) return;

    const targetRect = targetEl.getBoundingClientRect();
    const containerTop = this.scrollContainer
      ? this.scrollContainer.getBoundingClientRect().top
      : 0;

    const scrolledPast = targetRect.bottom <= containerTop + 16;
    this.updateOutOfViewState(scrolledPast);
  }

  private updateOutOfViewState(nextState: boolean): void {
    if (this.isHeaderOutOfView === nextState) {
      return;
    }
    this.ngZone.run(() => {
      this.isHeaderOutOfView = nextState;
      this.cdr.markForCheck();
    });
  }

  private findScrollParent(element: HTMLElement | null): HTMLElement | null {
    let current = element?.parentElement ?? null;
    while (current) {
      const style = window.getComputedStyle(current);
      if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
        return current;
      }
      current = current.parentElement;
    }
    return null;
  }
}
