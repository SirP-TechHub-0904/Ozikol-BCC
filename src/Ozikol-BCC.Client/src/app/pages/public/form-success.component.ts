import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Router, RouterModule } from '@angular/router';

/**
 * Dedicated public confirmation page displayed after every CMS website form submission.
 * Renders the editable title, rich-text confirmation note, the configured action route
 * (Resubmit Again or a selected System/Website page), and a Back to Home button.
 */
@Component({
  selector: 'app-form-success',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="oz-success-shell">
      <div class="oz-success-card">
        <div class="oz-success-icon">
          <span class="material-symbols-outlined">check_circle</span>
        </div>

        <h1 class="oz-success-title">{{ title }}</h1>
        <div class="oz-success-note" [innerHTML]="safeNoteHtml"></div>

        <div class="oz-success-actions">
          <button type="button" class="btn-primary-action" (click)="triggerPrimaryAction()">
            <span class="material-symbols-outlined">{{ actionUrl ? 'arrow_forward' : 'refresh' }}</span>
            <span>{{ primaryButtonLabel }}</span>
          </button>

          <a routerLink="/" class="btn-secondary-action">
            <span class="material-symbols-outlined">home</span>
            <span>Back to Home</span>
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .oz-success-shell {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background: #f8fafc;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .oz-success-card {
      width: 100%;
      max-width: 540px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 18px;
      padding: 44px 32px;
      text-align: center;
      box-shadow: 0 12px 32px rgba(15, 23, 42, 0.06);
    }

    .oz-success-icon {
      width: 68px;
      height: 68px;
      border-radius: 50%;
      background: #eff6ff;
      color: #0050e5;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
    }

    .oz-success-icon .material-symbols-outlined {
      font-size: 36px;
    }

    .oz-success-title {
      margin: 0 0 12px;
      font-size: 24px;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.3;
    }

    .oz-success-note {
      margin: 0 auto 28px;
      max-width: 440px;
      font-size: 15px;
      line-height: 1.6;
      color: #475569;
    }

    .oz-success-note p {
      margin: 0 0 8px;
    }

    .oz-success-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: 12px;
    }

    .btn-primary-action,
    .btn-secondary-action {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 11px 22px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 700;
      text-decoration: none;
      cursor: pointer;
      transition: background-color 0.15s ease, border-color 0.15s ease;
    }

    .btn-primary-action {
      background: #0050e5;
      color: #ffffff;
      border: 1px solid #0050e5;
    }

    .btn-primary-action:hover {
      background: #0041bd;
    }

    .btn-secondary-action {
      background: #ffffff;
      color: #1e293b;
      border: 1px solid #cbd5e1;
    }

    .btn-secondary-action:hover {
      background: #f1f5f9;
      border-color: #94a3b8;
    }

    .btn-primary-action .material-symbols-outlined,
    .btn-secondary-action .material-symbols-outlined {
      font-size: 18px;
    }
  `]
})
export class FormSuccessComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);

  title = 'Thank You! Submission Received';
  note = '<p>We have received your submission and will get back to you shortly.</p>';
  safeNoteHtml: SafeHtml = '';
  actionUrl = '';
  returnUrl = '/';

  get primaryButtonLabel(): string {
    return this.actionUrl ? 'Continue' : 'Submit Again';
  }

  ngOnInit(): void {
    // Prefer router navigation state; fall back to sessionStorage so browser refreshes preserve the message.
    const navState = (typeof window !== 'undefined' ? window.history.state : null) || {};
    let resolved = navState;

    if (!resolved?.title && typeof sessionStorage !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('oz_cms_form_success');
        if (cached) {
          resolved = JSON.parse(cached);
        }
      } catch {
        // Ignore malformed storage state
      }
    }

    if (resolved?.title) {
      this.title = String(resolved.title).trim() || this.title;
    }
    if (resolved?.note) {
      this.note = String(resolved.note).trim() || this.note;
    }
    if (resolved?.actionUrl) {
      this.actionUrl = String(resolved.actionUrl).trim();
    }
    if (resolved?.returnUrl && String(resolved.returnUrl).startsWith('/')) {
      this.returnUrl = String(resolved.returnUrl);
    }

    this.safeNoteHtml = this.sanitizer.bypassSecurityTrustHtml(this.note);
  }

  /**
   * Navigates to the configured post-submission route or returns to the originating form.
   */
  triggerPrimaryAction(): void {
    const target = this.actionUrl || this.returnUrl || '/';
    if (target.startsWith('http://') || target.startsWith('https://')) {
      window.location.href = target;
      return;
    }
    this.router.navigateByUrl(target.startsWith('/') ? target : `/${target}`);
  }
}
